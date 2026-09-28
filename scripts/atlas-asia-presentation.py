"""Derive presentation geometry from the checked-in Asia grids, without downloads.

Crop/livestock areas allocate each eligible common cell to the highest within-product
spatial percentile. They are illustrative concentrations, not cultivation limits.
Rainfall lines interpolate the existing CHELSA grid, masking missing cells.
Every climate label anchor is checked against the original classification grid.
"""
from pathlib import Path
import gzip, hashlib, json, math
import numpy as np
import contourpy
from rasterio.features import shapes, geometry_mask
from rasterio.transform import from_bounds
from rasterio.warp import transform_geom, reproject, Resampling
from shapely.geometry import shape, mapping, LineString
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas'
OUT = ASSETS / 'asia-presentation-v1'
COLORS = dict(rice='#408475', wheat='#bc8a2b', maize='#dcac35', soybean='#819747',
 cotton='#a36d9c', tea='#33864c', cassava='#aa7950', oilpalm='#368984', rubber='#a372a8',
 arabica='#b75246', robusta='#805744', sugarcane='#839d27', chickpea='#b68b54',
 lentil='#be6d3b', pearlmillet='#808940', cattle='#8b4943', buffalo='#5b658e',
 sheep='#996394', goat='#8c7838', pig='#c26768', chicken='#a0602f')
inputs = {}

def read(path):
    b = path.read_bytes()
    inputs[str(path.relative_to(ROOT)).replace('\\', '/')] = hashlib.sha256(b).hexdigest()
    return b

def js(path): return json.loads(read(path))
def write(name, data):
    b = (json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n').encode()
    (OUT/name).write_bytes(gzip.compress(b, mtime=0) if name.endswith('.gz') else b)
def lonlat(x,y): return [round(x/6378137*180/math.pi,5), round((2*math.atan(math.exp(y/6378137))-math.pi/2)*180/math.pi,5)]
def fc(features): return dict(type='FeatureCollection', features=features)
def feature(g, p): return dict(type='Feature', geometry=g, properties=p)

def box_mean(a, radius):
    """Separable moving mean; build-time only, with no new dependency."""
    out=a.astype('float64')
    for axis in [0,1]:
        pads=[(0,0),(0,0)];pads[axis]=(radius,radius)
        padded=np.pad(out,pads,mode='constant')
        summed=np.cumsum(padded,axis=axis)
        pad=[(0,0),(0,0)];pad[axis]=(1,0);summed=np.pad(summed,pad)
        hi=[slice(None),slice(None)];lo=hi.copy();hi[axis]=slice(2*radius+1,None);lo[axis]=slice(None,-(2*radius+1))
        out=(summed[tuple(hi)]-summed[tuple(lo)])/(2*radius+1)
    return out

def farming(region, layers, rice):
    # Compare within-product spatial ranks, never heads against harvested hectares.
    geography=js(ASSETS/'asia-population-v1'/(region+'.geography.json'))
    targets=[f['geometry'] for f in geography['features'] if f['properties'].get('target')]
    land_geo=unary_union([shape(g) for g in targets])
    bounds=next(l['bounds3857'] for l in layers if l.get('grid'))
    width=math.ceil((bounds[2]-bounds[0])/12000);height=math.ceil((bounds[3]-bounds[1])/12000)
    grid_transform=from_bounds(*bounds,width,height)
    land=geometry_mask([transform_geom('EPSG:4326','EPSG:3857',g) for g in targets],out_shape=(height,width),transform=grid_transform,invert=True)
    r=js(ASSETS/'asia-agriculture-v1'/Path(rice['queryUrl']).name)
    a=np.zeros((r['height'],r['width']),dtype='float32');cells=np.asarray(r['positiveCells']);a.ravel()[cells[:,0].astype(int)]=cells[:,1]
    all_layers=[(dict(id='rice',title='米',kind='crop',unit='ha/格子'),a,r['bounds'],'EPSG:4326')]
    for layer in layers:
        if layer.get('grid'):
            a=np.frombuffer(gzip.decompress(read(ASSETS/'asia-farming-v1'/layer['grid'])),dtype='<f4').reshape(layer['height'],layer['width'])
            all_layers.append((layer,a,layer['bounds3857'],'EPSG:3857'))
    scores=[];meta=[]
    for layer,a,b,crs in all_layers:
        target=np.zeros((height,width),dtype='float32')
        reproject(np.where(np.isfinite(a)&(a>0),a,0).astype('float32'),target,src_transform=from_bounds(*b,a.shape[1],a.shape[0]),src_crs=crs,dst_transform=grid_transform,dst_crs='EPSG:3857',resampling=Resampling.average)
        weights=box_mean(land,2);smoothed=np.divide(box_mean(np.where(land,target,0),2),weights,out=np.zeros_like(weights),where=weights>0)
        values=np.sort(smoothed[land&(smoothed>0)])
        score=np.searchsorted(values,smoothed,side='right')/max(1,len(values));score[~land|(smoothed<=0)|(score<.85)]=0
        scores.append(score);meta.append(dict(id=layer['id'],title=layer['title'],kind=layer['kind'],color=COLORS[layer['id']],threshold=.85,unit=layer['unit']))
    ranked=np.stack(scores);winner=np.argmax(ranked,axis=0)+1;winner[np.max(ranked,axis=0)==0]=0
    # Suppress isolated specks without extending a product outside its candidate area.
    counts=[]
    for i in range(len(meta)):
        count=box_mean(winner==i+1,1)*9;count[ranked[i]==0]=0;counts.append(count)
    local=np.stack(counts);mode=np.argmax(local,axis=0)+1;winner=np.where(np.max(local,axis=0)>=5,mode,winner).astype('uint8')
    features=[];labels=[];coverage={}
    for index,m in enumerate(meta):
        areas=sorted([shape(g) for g,value in shapes(winner,mask=winner==index+1,transform=grid_transform) if value==index+1],key=lambda g:-g.area)
        kept=[]
        for rank,poly in enumerate(areas):
            if rank>=6 or poly.area<6*12000**2:continue
            g=shape(transform_geom('EPSG:3857','EPSG:4326',mapping(poly),precision=5)).buffer(0).intersection(land_geo)
            if g.is_empty:continue
            features.append(feature(mapping(g),dict(id=m['id'],name=m['title'],kind=m['kind'],color=m['color'])))
            kept.append(g)
        coverage[m['id']]=len(kept)
        for rank,g in enumerate(kept):
            point=g.representative_point();labels.append(dict(id=m['id']+'-'+str(rank),product=m['id'],text=m['title'].replace('コーヒー（','').replace('）',''),kind=m['kind'],color=m['color'],coordinate=[round(point.x,5),round(point.y,5)]))
    name=region+'.farming-areas.json.gz';write(name,fc(features))
    return dict(file=name,products=meta,labels=labels,coverage=coverage,method='Exclusive highest within-product spatial percentile; >=85th percentile; average reprojection to approximately 12 projected km; land-weighted 5x5-cell smoothing; conditional 3x3-cell majority; six largest components per product with minimum six cells; no polygon simplification; clipped to land. Relative concentration, not quantity or exclusive land use.')

def isolines(region, record, kind):
    directory='asia-water-v1' if kind=='rainfall' else 'asia-physical-v1'
    a=np.frombuffer(gzip.decompress(read(ASSETS/directory/record['grid'])),dtype='<i2').reshape(record['height'],record['width'])
    west,south,east,north=record['bounds3857']; h,w=a.shape
    dx=(east-west)/w;dy=(north-south)/h
    valid=a!=-32768;radius=max(1,round((12000 if kind=='rainfall' else 6000)/min(dx,dy)))
    weight=box_mean(valid,radius);smooth=np.divide(box_mean(np.where(valid,a,0),radius),weight,out=np.zeros_like(weight),where=weight>0)
    gen=contourpy.contour_generator(x=west+(np.arange(w)+.5)*dx,y=north-(np.arange(h)+.5)*dy,z=np.ma.masked_where(~valid,smooth),corner_mask=False)
    features=[]; labels=[]
    interval=250 if kind=='rainfall' else 500
    levels=list(range(interval,int(np.max(smooth[valid]))+1,interval))
    for value in levels:
        lines=[]
        for line in gen.lines(value):
            g=LineString(line)
            if g.length < 80000: continue
            points=[lonlat(x,y) for x,y in g.simplify(6000 if kind=='rainfall' else 3000).coords]
            features.append(feature(dict(type='LineString',coordinates=points),dict(value=value)))
            lines.append((g.length,g.interpolate(.5,normalized=True)))
        for i,(_,point) in enumerate(sorted(lines,key=lambda x:-x[0])[:1]):
            labels.append(dict(id=f'{kind}-{value}-{i}',text=f'{value:,}',value=value,coordinate=lonlat(point.x,point.y)))
    name=region+'.'+kind+'.json.gz';write(name,fc(features))
    return dict(file=name,levels=levels,interval=interval,labels=labels)

def climate_labels(record, classes):
    a=np.frombuffer(gzip.decompress(read(ASSETS/'asia-climate-v2'/record['grid'])),dtype='uint8').reshape(record['height'],record['width'])
    w,s,e,n=record['bounds3857'];height,width=a.shape; labels=[]
    # Rank 32 x 32-cell blocks by class membership, then keep spaced candidates.
    for cls in classes:
        ys,xs=np.where(a==cls['id'])
        if not len(xs):continue
        blocks=(ys//32)*math.ceil(width/32)+xs//32
        ids,counts=np.unique(blocks,return_counts=True);anchors=[]
        for block in ids[np.argsort(-counts)]:
            by,bx=divmod(int(block),math.ceil(width/32)); iy,ix=np.where(a[by*32:(by+1)*32,bx*32:(bx+1)*32]==cls['id'])
            i=int(np.argmin((ix-16)**2+(iy-16)**2));x=int(ix[i])+bx*32;y=int(iy[i])+by*32
            if any((x-px)**2+(y-py)**2<250**2 for px,py in anchors):continue
            assert a[y,x]==cls['id'];anchors.append((x,y))
            if len(anchors)==6:break
        coords=[lonlat(w+(x+.5)*(e-w)/width,n-(y+.5)*(n-s)/height) for x,y in anchors]
        labels.append(dict(id=cls['id'],code=cls['code'],name=cls['name'],anchors=coords,minZoom=1 if len(xs)>10000 else 3.5))
    return labels

def main():
    OUT.mkdir(exist_ok=True)
    import sys
    if '--farming-only' in sys.argv:
        manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf8'));manifest['inputs'].pop('public/assets/atlas/asia-presentation-v1/manifest.json',None);farms=js(ASSETS/'asia-farming-v1/manifest.json');rice=js(ASSETS/'asia-agriculture-v1/manifest.json')
        for region in manifest['regions']:
            manifest['regions'][region]['farming']=farming(region,farms['regions'][region]['layers'],next(r for r in rice['regions'] if r['regionId']==region))
            print(region,manifest['regions'][region]['farming']['coverage'],flush=True)
        manifest['version']=3;manifest['method']['farming']=next(iter(manifest['regions'].values()))['farming']['method'];manifest['inputs'].update(inputs);write('manifest.json',manifest);return
    farms=js(ASSETS/'asia-farming-v1/manifest.json');rice=js(ASSETS/'asia-agriculture-v1/manifest.json');water=js(ASSETS/'asia-water-v1/manifest.json');climate=js(ASSETS/'asia-climate-v2/manifest.json');physical=js(ASSETS/'asia-physical-v1/manifest.json')
    definitions=(ROOT/'src/data/atlas/asia-climate-definitions.ts').read_text(encoding='utf8');classes=json.loads(definitions[definitions.index('= [')+2:].strip().rstrip(';'))
    regions={}
    for region,record in climate['regions'].items():
        regions[region]=dict(farming=farming(region,farms['regions'][region]['layers'],next(r for r in rice['regions'] if r['regionId']==region)),rainfall=isolines(region,water['regions'][region]['precipitation'],'rainfall'),terrain=isolines(region,physical['regions'][region],'terrain'),climate=climate_labels(record,classes))
        print(region,'complete',flush=True)
    write('manifest.json',dict(version=3,licenses=dict(rice='CC BY-SA 4.0',otherCrops='CC BY 4.0',livestock='CC BY 4.0',rainfall='CC0 1.0',terrain='Public domain (NOAA)',climate='CC BY 4.0'),method=dict(farming=next(iter(regions.values()))['farming']['method'],rainfall='CHELSA 1981–2010 display grid, valid-land moving mean radius 12 projected km; 250 mm interval; masked cells remain masked; lines under 80 projected km omitted; simplify 6 projected km. Point queries retain unsmoothed values.',terrain='ETOPO 2022 display grid, valid-land moving mean radius 6 projected km; 500 m interval; lines under 80 projected km omitted; simplify 3 projected km. Point queries retain unsmoothed values.',climate='All anchors verified against the classification grid; alternatives permit collision avoidance.'),inputs=inputs,regions=regions))

if __name__=='__main__':main()
