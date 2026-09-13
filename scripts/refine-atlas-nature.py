"""Publish categorical climate cells and multi-scale USGS contour vectors.

Run fetch-nature-dem.py first. Requires rasterio, shapely, pyproj, contourpy,
numpy and Pillow (preparation only). All published coordinates are EPSG:4326.
"""
import hashlib
import json
import math
from pathlib import Path
import os
import contourpy
import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling
from shapely.geometry import shape, mapping, box, LineString
from shapely.ops import unary_union, transform
from pyproj import Transformer
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/nature-v1'
CACHE=Path(os.environ.get('ATLAS_NATURE_TMP','/tmp/atlas-nature-v1'))
BASE=json.loads((ROOT/'public/assets/atlas/v3/base.geojson').read_text())
US=unary_union([shape(f['geometry']) for f in BASE['features'] if f['properties'].get('country')=='USA'])
LAKES=unary_union([shape(f['geometry']) for f in BASE['features'] if f['properties']['kind']=='lake'])
LAND=US.difference(LAKES)
MERC=Transformer.from_crs(4326,3857,always_xy=True)
WGS=Transformer.from_crs(5070,4326,always_xy=True)
TO_ALBERS=Transformer.from_crs(4326,5070,always_xy=True)
BOUNDS=(-128,22,-64,52)
MB=(*MERC.transform(-128,22),*MERC.transform(-64,52))
SIZE=(3200,1940)
GRID=from_bounds(*MB,*SIZE)

def write(name,data):
    path=OUT/name
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))

def fc(features): return dict(type='FeatureCollection',features=features)
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def climate():
    codes='Af Am Aw BWh BWk BSh BSk Csa Csb Csc Cwa Cwb Cwc Cfa Cfb Cfc Dsa Dsb Dsc Dsd Dwa Dwb Dwc Dwd Dfa Dfb Dfc Dfd ET EF'.split()
    original='0000FF 0078FF 46AAFA FF0000 FF9696 F5A500 FFDC64 FFFF00 C8C800 969600 96FF96 64C864 329632 C8FF50 64FF50 32C800 FF00FF C800C8 963296 966496 AAAFFF 5A78DC 4B50B4 320087 00FFFF 37C8FF 007D7D 00465F B2B2B2 666666'.split()
    palette='529ca5 78b6ba a1cdd0 e6ad7b d4bc92 ebc38e e5d3ad d9ce8d bbc898 a4b98b c5d49b a7c59f 8eae90 98bba0 7caaa1 689b95 c4abc8 b49aba a387ac 957493 bcb5d1 a6afc9 8998b7 6e809e b7c2d8 9fb3cc 819db8 67869e c4c9cc a8aeb3'.split()
    names=['熱帯雨林','熱帯モンスーン','サバナ','高温の砂漠','低温の砂漠','高温のステップ','低温のステップ','地中海性・暑夏','地中海性・温暖な夏','地中海性・冷夏','温帯冬季少雨・暑夏','温帯冬季少雨・温暖な夏','温帯冬季少雨・冷夏','温暖湿潤','西岸海洋性','西岸海洋性・冷夏','冷帯夏季少雨・暑夏','冷帯夏季少雨・温暖な夏','冷帯夏季少雨・冷夏','冷帯夏季少雨・厳冬','冷帯冬季少雨・暑夏','冷帯冬季少雨・温暖な夏','冷帯冬季少雨・冷夏','冷帯冬季少雨・厳冬','冷帯湿潤・暑夏','冷帯湿潤・温暖な夏','冷帯湿潤・冷夏','冷帯湿潤・厳冬','ツンドラ','氷雪']
    raw_path=CACHE/'koppen-source-001deg.png'
    rgba=np.asarray(Image.open(raw_path).convert('RGBA'))
    values=np.zeros(rgba.shape[:2],dtype='uint8')
    matched=np.zeros(values.shape,dtype=bool)
    for i,color in enumerate(original,1):
        rgb=tuple(bytes.fromhex(color))
        mask=(rgba[:,:,:3]==rgb).all(axis=2)&(rgba[:,:,3]>0)
        values[mask]=i; matched|=mask
    assert not ((rgba[:,:,3]>0)&~matched).any(), 'Unknown source class color: do not interpolate categories'
    result=np.zeros((SIZE[1],SIZE[0]),dtype='uint8')
    reproject(values,result,src_transform=from_bounds(*BOUNDS,rgba.shape[1],rgba.shape[0]),src_crs=4326,
              dst_transform=GRID,dst_crs=3857,resampling=Resampling.nearest)
    mask=rasterize([(mapping(transform(MERC.transform,LAND)),1)],out_shape=result.shape,transform=GRID,dtype='uint8')
    result[mask==0]=0
    colors=np.zeros((31,4),dtype='uint8')
    for i,color in enumerate(palette,1): colors[i]=[*bytes.fromhex(color),255]
    Image.fromarray(colors[result]).save(OUT/'koppen-1991-2020.png',optimize=True)
    # Red channel is the class ID. Transparent pixels are outside coverage.
    encoded=np.zeros((*result.shape,4),dtype='uint8');encoded[:,:,0]=result;encoded[:,:,3]=(result>0)*255
    Image.fromarray(encoded).save(OUT/'climate-classes.png',optimize=True)
    present=set(map(int,np.unique(result)))-{0}
    legend=[dict(id=i,code=codes[i-1],nameJa=names[i-1],color='#'+palette[i-1]) for i in sorted(present)]
    write('climate-legend.json',legend)
    cities=json.loads((OUT/'climate-cities.json').read_text())
    for city in cities:
        px,py=~GRID*MERC.transform(city['longitude'],city['latitude'])
        value=int(result[int(py),int(px)])
        city['koppenCode']=codes[value-1] if value else None
        city['koppenGridId']=value or None
    write('climate-cities.json',cities)
    return dict(period='1991–2020',classification='Beck et al. (2023), koppen.earth snapshot',
                sourceUrl='https://koppen.earth/',sourceExpression='CMIP6Koppen.reanalysis@(year=2020)',
                inputSha256=digest(raw_path),license='CC BY 4.0 — Beck et al. (2023)',
                sourceResolution='provider 1 km; exported at 0.01 degree',displayResolution='3200×1940 Web Mercator cells (about 2.23 km projected)',
                processing='Exact RGBA class decoding; nearest-neighbour reprojection; US land mask; same grid for display/picking/city classification. No interpolation of class IDs.',
                gridBounds3857=MB,gridSize=SIZE,cityCount=12,versionNote='Provider cites the 2023 dataset; does not identify V3. This snapshot is not labelled V3.')

def lines(geometry):
    if geometry.geom_type=='LineString': yield geometry
    elif hasattr(geometry,'geoms'):
        for part in geometry.geoms: yield from lines(part)

def contours():
    us5070=transform(TO_ALBERS.transform,LAND)
    national=[];detailed=[];records=[]
    levels=sorted(set(range(-100,4600,100))|set(range(0,4600,250))|{-50})
    for path in sorted((CACHE/'3dep-500m').glob('*.tif')):
        record=json.loads(path.with_suffix('.json').read_text());records.append(record)
        with rasterio.open(path) as source:
            a=source.read(1,masked=True);a=np.ma.masked_where((a < -500)|(a > 6000),a)
            assert abs(source.transform.a-500)<.01 and abs(source.transform.e+500)<.01
            x=source.transform.c+(np.arange(source.width)+.5)*500
            y=source.transform.f-(np.arange(source.height)+.5)*500
            inside=rasterize([(mapping(us5070),1)],out_shape=a.shape,transform=source.transform,dtype='uint8')
            a=np.ma.masked_where(inside==0,a)
            generator=contourpy.contour_generator(x=x,y=y[::-1],z=a[::-1],line_type='Separate')
            core=box(*record['coreBounds5070'])
            for level in levels:
                for raw in generator.lines(float(level)):
                    g=LineString(raw).intersection(core)
                    for part in lines(g):
                        if part.length < 1000: continue
                        # 150 m simplification is below the 500 m sampled grid.
                        simplified=part.simplify(150,preserve_topology=True)
                        geographic=transform(WGS.transform,simplified)
                        coords=[[round(x,5),round(y,5)] for x,y in geographic.coords]
                        feature=dict(type='Feature',properties=dict(elevationM=level,index=level%1000==0),geometry=dict(type='LineString',coordinates=coords))
                        detailed.append(feature)
                        if level%500==0:
                            national.append(feature)
            print('Contours',path.name,len(detailed),flush=True)
    assert len(records)==16
    write('contours.geojson',fc(national))
    # Eight-degree tiles; keep the same vertices and clip at exact shared edges.
    tiles=[]
    for west in range(-128,-64,8):
        for south in range(22,52,6):
            tile=box(west,south,west+8,south+6); subsets={250:[],100:[]}
            for feature in detailed:
                g=shape(feature['geometry'])
                if not g.intersects(tile):continue
                for part in lines(g.intersection(tile)):
                    for interval in subsets:
                        if feature['properties']['elevationM']%interval==0 or feature['properties']['elevationM']<0:
                            subsets[interval].append(dict(type='Feature',properties=feature['properties'],geometry=mapping(part)))
            for interval,features in subsets.items():
                if not features:continue
                name=f'contours/{interval}/{west}_{south}.geojson';write(name,fc(features))
                tiles.append(dict(file=name,intervalM=interval,bounds=[west,south,west+8,south+6]))
    write('contour-tiles.json',tiles)
    return dict(source='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer',
                publisher='USGS 3DEP / The National Map',license='US government public domain',
                sourcePublishedThrough='2026-08-24',horizontalCrs='EPSG:5070',verticalDatum='NAVD88 (CONUS USGS 3DEP)',units='m',
                sampleResolutionM=500,contourIntervalsM=[500,250,100],simplificationM=150,
                warning='500 m sampled DEM, generalized national/regional comparison. Small summits and narrow valleys are omitted. Not a surveying/hiking map; contour interval is not vertical accuracy.',
                inputFiles=records,featureCount=len(detailed))

if __name__=='__main__':
    manifest=json.loads((OUT/'manifest.json').read_text())
    manifest['climate']=climate()
    if len(list((CACHE/'3dep-500m').glob('*.tif')))==16:manifest['elevation']=contours()
    write('manifest.json',manifest)
