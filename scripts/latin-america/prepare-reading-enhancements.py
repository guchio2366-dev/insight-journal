"""Offline source geometry and readable GPCC intervals. No network calls.
python scripts/latin-america/prepare-reading-enhancements.py --cache <private-cache>
The cache contains the already adopted GPCC file/grid and Natural Earth originals.
"""
import argparse, hashlib, importlib.util, json, math, pathlib
import numpy as np
import contourpy

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('foundation', ROOT/'scripts/latin-america/prepare-water-terrain.py')
foundation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(foundation)
sha = foundation.sha
write_json = foundation.write_json

def interpolate(anchors, value):
    for (low, a), (high, b) in zip(anchors[:-1], anchors[1:]):
        if value <= high:
            t = (value-low)/(high-low)
            rgb = [round(int(a[i:i+2],16)*(1-t)+int(b[i:i+2],16)*t) for i in (1,3,5)]
            return '#'+''.join(f'{v:02x}' for v in rgb)
    return anchors[-1][1]

def coordinates(value):
    if not value: return
    if isinstance(value[0], (int,float)): yield value
    else:
        for child in value: yield from coordinates(child)

def prepare(cache):
    output = ROOT/'public/assets/atlas/latin-nature-reading-v2'
    output.mkdir(parents=True, exist_ok=True)
    countries = json.loads((ROOT/'src/data/atlas/latin-america/countries.json').read_text())['features']
    regions_raw = cache/'nature-regions.json'
    region_names = {
        'ANDES': ('andes','アンデス山脈','#d1a184',[-71,-25]),
        'AMAZON BASIN': ('amazon','アマゾン盆地','#bed5b4',[-63,-6]),
        'BRAZILIAN HIGHLANDS': ('brazil-highlands','ブラジル高原','#e3cb93',[-46,-15]),
        'GRAN CHACO': ('chaco','グランチャコ','#c5dce1',[-60,-22]),
        'PAMPAS': ('pampas','パンパ','#afd0d8',[-63,-35]),
        'LLANOS': ('llanos','リャノス平原','#d4e2c2',[-67,7]),
        'ALTIPLANO': ('altiplano','アルティプラノ','#c9a7a8',[-68,-19]),
        'PATAGONIA': ('patagonia','パタゴニア','#d6d8cf',[-66,-45]),
    }
    regions=[]
    for f in json.loads(regions_raw.read_text())['features']:
        name=f['properties']['NAME']
        if name not in region_names: continue
        id,label,color,anchor=region_names[name]
        paths=''.join(foundation.path_string(ring,True) for polygon in foundation.polygons(f['geometry']) for ring in polygon)
        regions.append({'id':id,'name':label,'sourceName':name,'sourceFeatureClass':f['properties']['FEATURECLA'],'sourceId':f['properties']['NE_ID'],'path':paths,'color':color,'labelCoordinate':anchor})
    assert len(regions)==8
    old_rivers=json.loads((ROOT/'public/assets/atlas/latin-water-terrain-v1/rivers.json').read_text())['rivers']
    old_ids={r['name']:r['id'] for r in old_rivers}
    grouped={}
    river_raw=cache/'rivers-10m.json'
    for f in json.loads(river_raw.read_text())['features']:
        name=f['properties'].get('name')
        if not name: continue
        lines=f['geometry']['coordinates'] if f['geometry']['type']=='MultiLineString' else [f['geometry']['coordinates']]
        clipped=[part for line in lines for part in foundation.clip_line(line)]
        if not clipped: continue
        record=grouped.setdefault(name, {'name':name,'sourceClasses':set(),'coordinates':[],'sourceRanks':set()})
        record['coordinates']+=clipped
        record['sourceClasses'].add(f['properties']['featurecla'])
        record['sourceRanks'].add(f['properties']['scalerank'])
    rivers=[]
    for name, r in grouped.items():
        longest=max(r['coordinates'],key=lambda line:np.linalg.norm(np.diff(foundation.project(line),axis=0),axis=1).sum())
        r.update(id=old_ids.get(name,'river10m-'+hashlib.sha256(name.encode()).hexdigest()[:10]),path=''.join(foundation.path_string(line) for line in r['coordinates']),labelCoordinate=longest[len(longest)//2])
        r['sourceClasses']=sorted(r['sourceClasses']);r['sourceRanks']=sorted(r['sourceRanks'])
        rivers.append(r)
    # Retain existing public deep-link IDs for any source name absent at 1:10m.
    for r in old_rivers:
        if r['name'] not in grouped: rivers.append({**r,'sourceRanks':[],'retained50m':True})
    for r in rivers: r.pop('coordinates',None)
    geography={'schemaVersion':1,'regions':regions,'rivers':rivers,'regionMeaning':'Natural Earth physical label areas. Approximate geographic name extents, not measured geomorphological boundaries or hydrological drainage basins. Label positions are editorial, source polygons are unchanged.'}
    (output/'geography.json').write_text(json.dumps(geography,ensure_ascii=False,separators=(',',':'))+'\n')

    meta=json.loads((cache/'gpcc-extraction.json').read_text())
    raw=cache/'gpcc-annual.f32'; assert sha(raw.read_bytes())==meta['gridSha256']
    original=json.loads((ROOT/'public/assets/atlas/latin-water-terrain-v1/validation.json').read_text())['rainfall']
    assert meta['gridSha256']==original['nativeGrid']['gridSha256']
    z=np.fromfile(raw,dtype='<f4').reshape(meta['height'],meta['width']).astype(float)
    x=meta['firstCenter'][0]+np.arange(z.shape[1])*meta['step'][0]
    y=meta['firstCenter'][1]+np.arange(z.shape[0])*meta['step'][1]
    land=foundation.land_mask(x,y,countries);valid=np.isfinite(z)&(z>=0)&land
    generator=contourpy.contour_generator(x=x,y=y,z=np.ma.array(z,mask=~valid),name='serial',corner_mask=False,line_type='Separate',fill_type='OuterOffset')
    levels=original['levels'];assert levels==list(range(0,10501,250))
    anchors=[(0,'#f1f9fc'),(1000,'#b9dfed'),(2000,'#67b7d7'),(3000,'#327ea7'),(4000,'#194965'),(10500,'#332343')]
    palette=[interpolate(anchors,value) for value in levels[:-1]]
    fills,lines,vertices=foundation.geometry_svg(generator,levels,palette)
    outlines=''.join(foundation.path_string(ring,True) for f in countries for polygon in foundation.polygons(f['geometry']) for ring in polygon)
    svg='<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1160" viewBox="0 0 900 580"><defs><clipPath id="land"><path fill-rule="evenodd" clip-rule="evenodd" d="'+outlines+'"/></clipPath></defs><g clip-path="url(#land)">'+''.join(fills)+'<g fill="none" stroke="#124e7b" stroke-width="0.28" opacity="0.65">'+''.join(lines)+'</g></g></svg>\n'
    (output/'rainfall.svg').write_text(svg)
    labels=[]
    for level in [250,1000,2000,3000,4000,6000,8000,10000]:
        parts=sorted(generator.lines(level), key=lambda p:np.linalg.norm(np.diff(foundation.project(p),axis=0),axis=1).sum(),reverse=True)
        for line in parts[:12]:
            if len(line)<4:continue
            labels.append({'value':level,'coordinate':line[len(line)//2].tolist(),'meaning':'An actual vertex of the source-derived interpolated isohyet, mm/year.'})
    rainfall={'levels':levels,'colors':palette,'emphasizedRange':[0,4000],'extremeRange':[4000,10500],'sourceGridSha256':meta['gridSha256'],'contourInterval':250,'cornerMask':False,'contourLabels':labels,'samples':meta['samples'],'png':'/assets/atlas/latin-nature-reading-v2/rainfall.png','svgSha256':sha(svg.encode()),'sourcePeriod':meta['sourcePeriod'],'sourceResolutionDegrees':.25,'method':'Same pinned twelve-month GPCC normal, target-country mask and interpolated 250mm intervals. Recoloured by explicit piecewise RGB ramp; no data clipping or geographic resampling.'}
    source={'schemaVersion':1,'checkedAt':'2026-10-11','scope':'Latin America existing 34 countries; excludes Mexico','crs':'EPSG:3857 display / EPSG:4326 original geometries','regionPolygons':{'publisher':'Natural Earth','url':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_polys.geojson','documentation':'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/','license':'public domain','sha256':sha(regions_raw.read_bytes()),'originalFeatures':1047,'adoptedFeatures':8,'meaning':geography['regionMeaning']},'riverLines':{'publisher':'Natural Earth','url':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson','license':'public domain','sha256':sha(river_raw.read_bytes()),'originalFeatures':1455,'scale':'1:10,000,000','names':len(rivers),'geometry':'Original paths clipped to display bounds; country outline masks Mexico. No inferred connectors, flow direction, discharge or hydrological basin. Existing 50m IDs retained by exact source name.'},'rainfall':rainfall,'preparation':{'script':'scripts/latin-america/prepare-reading-enhancements.py','sha256':sha(pathlib.Path(__file__).read_bytes()),'extractScript':'scripts/latin-america/extract-reading-rainfall.mjs'},'files':{'geography.json':{'sha256':sha((output/'geography.json').read_bytes()),'bytes':(output/'geography.json').stat().st_size}}}
    elevation_meta=json.loads((cache/'etopo-extraction.json').read_text())
    elevation_original=json.loads((ROOT/'public/assets/atlas/latin-water-terrain-v1/validation.json').read_text())['elevation']
    assert elevation_meta['gridSha256']==elevation_original['nativeGrid']['gridSha256']
    elevation_raw=cache/'etopo-native.f32';assert sha(elevation_raw.read_bytes())==elevation_meta['gridSha256']
    full=np.memmap(elevation_raw,dtype='<f4',mode='r',shape=(elevation_meta['height'],elevation_meta['width']))
    z=np.asarray(full[::3,::3],dtype=float)
    x=elevation_meta['firstCenter'][0]+np.arange(z.shape[1])*elevation_meta['step'][0]*3
    y=elevation_meta['firstCenter'][1]+np.arange(z.shape[0])*elevation_meta['step'][1]*3
    valid=np.isfinite(z)&(z!=elevation_meta['nodata'])&foundation.land_mask(x,y,countries)
    generator=contourpy.contour_generator(x=x,y=y,z=np.ma.array(z,mask=~valid),name='serial',corner_mask=False,line_type='Separate',fill_type='OuterOffset')
    elevation_manifest=json.loads((ROOT/'public/assets/atlas/latin-water-terrain-v1/manifest.json').read_text())['elevation']
    levels=elevation_manifest['levels'];palette=elevation_manifest['colors']
    fills,lines,_=foundation.geometry_svg(generator,levels,palette)
    svg='<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1160" viewBox="0 0 900 580"><defs><clipPath id="land"><path fill-rule="evenodd" clip-rule="evenodd" d="'+outlines+'"/></clipPath></defs><g clip-path="url(#land)">'+''.join(fills)+'<g fill="none" stroke="#685642" stroke-width="0.36" opacity="0.7">'+''.join(lines)+'</g></g></svg>\n'
    (cache/'elevation-reading.svg').write_text(svg)
    labels=[]
    for level in range(500,6500,500):
        parts=sorted(generator.lines(level),key=lambda p:np.linalg.norm(np.diff(foundation.project(p),axis=0),axis=1).sum(),reverse=True)
        for line in parts[:16]:
            if len(line)>4:labels.append({'value':level,'coordinate':line[len(line)//2].tolist(),'meaning':'Actual source-derived interpolated 500m contour vertex; EGM2008 metres, not a summit.'})
    source['elevation']={'sourceGridSha256':elevation_meta['gridSha256'],'sourceEdition':'ETOPO 2022 v1 surface','sourceResolutionDegrees':1/60,'displaySamplingDegrees':.05,'contourInterval':500,'levels':levels,'colors':palette,'cornerMask':False,'datum':'EGM2008','contourLabels':labels,'png':'/assets/atlas/latin-nature-reading-v2/elevation.png','svgSha256':sha(svg.encode()),'method':'Same acquired native window and 3-cell source stride as the adopted model. Same contour levels, colours, mask and interpolation; stronger line stroke and actual contour labels. No global-file SHA claim.'}
    write_json(output/'manifest.json',source)
    ledger=ROOT/'data-source/atlas/latin-america/nature-reading';ledger.mkdir(parents=True,exist_ok=True);write_json(ledger/'source.json',source)
    print('prepared',len(regions),'geographic regions',len(rivers),'river names',len(labels),'rainfall label candidates',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--cache',type=pathlib.Path,required=True)
    prepare(parser.parse_args().cache)
