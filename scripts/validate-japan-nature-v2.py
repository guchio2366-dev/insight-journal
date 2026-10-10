"""Independent all-pixel source/mask and vector-coast validation. Offline originals required."""
from pathlib import Path
import argparse,json,gzip,hashlib,math
import numpy as np,rasterio
from scipy.io import netcdf_file
from shapely.geometry import shape,Point
from shapely.ops import unary_union
from rasterio.features import geometry_mask
from rasterio.transform import from_bounds
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/atlas/japan-nature-v2'
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);args=parser.parse_args();cache=args.source_dir
m=json.loads((OUT/'manifest.json').read_text());coast=shape(json.loads((ROOT/'public/assets/atlas/japan-v1/geography.json').read_text())['features'][0]['geometry'])
report={'sourceAndMask':{},'geometry':{},'method':'Independent nearest native source indexing at every delivered Mercator pixel; original monthly annual sums recomputed, no published-output-value reuse.'}
for kind in ['climate','elevation','precipitation']:
 d=m[kind];west,south,east,north=d['bounds4326'];w,h=d['width'],d['height'];r=6378137;x0,y0,x1,y1=d['bounds3857'];lons=np.degrees((x0+(np.arange(w)+.5)*(x1-x0)/w)/r);lats=np.degrees(2*np.arctan(np.exp((y1-(np.arange(h)+.5)*(y1-y0)/h)/r))-math.pi/2)
 # Rasterize the actual projected coast using GDAL rather than generation's Shapely projector.
 from rasterio.warp import transform_geom
 polygon=transform_geom('EPSG:4326','EPSG:3857',json.loads((ROOT/'public/assets/atlas/japan-v1/geography.json').read_text())['features'][0]['geometry'])
 land=geometry_mask([polygon],out_shape=(h,w),transform=from_bounds(x0,y0,x1,y1,w,h),invert=True)
 if kind in ['climate','elevation']:
  path=ROOT/'data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif' if kind=='climate' else cache/'etopo.tif'
  with rasterio.open(path) as src:
   columns=np.floor((lons-src.transform.c)/src.transform.a).astype(int);rows=np.floor((lats-src.transform.f)/src.transform.e).astype(int);c0,c1=int(columns.min()),int(columns.max()+1);r0,r1=int(rows.min()),int(rows.max()+1)
   from rasterio.windows import Window
   native=src.read(1,window=Window(c0,r0,c1-c0,r1-r0));expected=native[np.ix_(rows-r0,columns-c0)]
  expected=np.where(land,expected,d['noData']);dtype='uint8' if kind=='climate' else '<f4'
 else:
  with netcdf_file(cache/'gpcc.nc','r',mmap=False) as src:
   columns=np.floor((lons+180)*4).astype(int);rows=np.floor((90-lats)*4).astype(int);monthly=src.variables['gpcc_precip'][:,rows.min():rows.max()+1,columns.min():columns.max()+1].copy().astype('float64');valid=np.all(np.isfinite(monthly)&(monthly>=0),axis=0);native=np.where(valid,monthly.sum(axis=0),d['noData']);expected=native[np.ix_(rows-rows.min(),columns-columns.min())];expected=np.where(land,expected,d['noData']).astype('<f4');dtype='<f4'
 actual=np.frombuffer(gzip.decompress((OUT/d['grid']).read_bytes()),dtype=dtype).reshape(h,w);assert np.array_equal(actual,expected),kind+' original source mismatch'
 valid=actual!=d['noData'];png=np.asarray(Image.open(OUT/d['image']));assert np.array_equal(png[:,:,3]>0,valid),kind+' PNG alpha differs from data';assert not np.any(valid&~land),kind+' painted outside base coast';assert int(valid.sum())==d['validLandPixels'];assert int((land&~valid).sum())==d['missingLandPixels']
 if kind=='climate':
  palette={c['id']:bytes.fromhex(c['color'][1:]) for c in d['classes']}
  for classid,color in palette.items():assert np.all(png[:,:,:3][actual==classid]==list(color))
 report['sourceAndMask'][kind]={'allPixelsCompared':w*h,'landPixels':int(land.sum()),'valid':int(valid.sum()),'missing':int((land&~valid).sum()),'matchesOriginal':True,'noPaintOutsideDetailedCoast':True}
for kind in ['elevation','precipitation']:
 for layer in ['bands','contours']:
  data=json.loads((OUT/m[kind][layer]).read_text());outside=0;vertices=0
  for f in data['features']:
   g=shape(f['geometry']);extra=g.difference(coast);outside+=extra.area if layer=='bands' else extra.length
   prop=f['properties'];assert (prop['lower'] if layer=='bands' else prop['value'])%m[kind]['interval']==0
  assert outside<1e-7,(kind,layer,outside)
  report['geometry'][kind+'-'+layer]={'features':len(data['features']),'outsideCoastDegrees':outside,'interval':m[kind]['interval']}
for kind in ['basins','groundwater','rivers']:
 features=json.loads((OUT/m['water'][kind]['geometry']).read_text())['features'];assert len(features)==m['water'][kind]['features'];assert all(shape(f['geometry']).difference(coast).area<1e-9 for f in features)
report['boundaryBounds']=coast.bounds;assert west<=coast.bounds[0] and south<=coast.bounds[1] and east>=coast.bounds[2] and north>=coast.bounds[3]
report['files']=len(m['files'])
for file,v in m['files'].items():p=OUT/file;assert p.stat().st_size==v['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256']
(ROOT/'docs/data/japan-nature-v2/validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
