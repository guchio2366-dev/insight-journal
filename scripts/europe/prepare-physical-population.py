"""Prepare measured terrain/hydrography and modelled population density.

Dependencies: rasterio, pyproj, contourpy, numpy, Pillow in ../europe-python.
Raw GHSL/ETOPO downloads stay in ../europe-source-cache. No network during build.
"""
from pathlib import Path
import sys,json,hashlib,zipfile,gzip,math
ROOT=Path(__file__).resolve().parents[2];CACHE=ROOT.parent/'europe-source-cache'
sys.path.insert(0,str(ROOT.parent/'europe-python'))
import numpy as np
import rasterio
from rasterio.warp import reproject,Resampling,transform_bounds,transform_geom
from rasterio.transform import from_bounds
from rasterio.windows import Window
from rasterio.features import geometry_mask
from PIL import Image,ImageDraw
import contourpy
W=1800;H=1502;BOUNDS=(-25,32,65,73)
merc=lambda lat:math.log(math.tan(math.pi/4+math.radians(lat)/2))
BM=transform_bounds('EPSG:4326','EPSG:3857',*BOUNDS)
TRANSFORM=from_bounds(*BM,W,H)
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8',newline='\n')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while raw:=f.read(1048576):h.update(raw)
 return h.hexdigest()
def record(out,meta):
 meta.update(bounds=list(BOUNDS),width=W,height=H,projection='EPSG:3857',retrievedAt='2026-09-25')
 meta['files']={p.name:dict(sha256=sha(p),bytes=p.stat().st_size) for p in out.iterdir() if p.name!='manifest.json'}
 write(out/'manifest.json',meta)
def palette(values,thresholds,colors,valid):
 indices=np.searchsorted(thresholds,values,side='right')
 rgb=np.array([list(bytes.fromhex(c))+[255] for c in colors],dtype=np.uint8)[indices]
 rgb[~valid]=0
 return rgb
def population():
 out=ROOT/'public/assets/atlas/europe/population-v1';out.mkdir(parents=True,exist_ok=True)
 archive=CACHE/'ghsl2020-1km.zip'
 with zipfile.ZipFile(archive) as z:
  member=next(n for n in z.namelist() if n.endswith('.tif'))
  path=CACHE/member
  if not path.exists():z.extract(member,CACHE)
 with rasterio.open(path) as src:
  assert src.crs.to_string()=='ESRI:54009' and src.res==(1000.,1000.) and src.nodata==-200
  bounds=transform_bounds('EPSG:4326',src.crs,*BOUNDS,densify_pts=41)
  win=src.window(*bounds);x=math.floor(win.col_off/5)*5;y=math.floor(win.row_off/5)*5
  width=math.ceil((win.col_off+win.width-x)/5)*5;height=math.ceil((win.row_off+win.height-y)/5)*5
  window=Window(x,y,width,height);a=src.read(1,window=window);valid=(a>=0)&np.isfinite(a)
  sums=np.where(valid,a,0).astype('float64').reshape(height//5,5,width//5,5).sum(axis=(1,3))
  area=valid.reshape(height//5,5,width//5,5).sum(axis=(1,3))
  density=np.divide(sums,area,out=np.full(sums.shape,-1.),where=area>0).astype('float32')
  assert np.isclose(sums.sum(),a[valid].sum(dtype='float64'))
  t=src.window_transform(window)*rasterio.Affine.scale(5,5)
  dst=np.full((H,W),-1.,dtype='float32')
  reproject(density,dst,src_transform=t,src_crs=src.crs,src_nodata=-1,dst_transform=TRANSFORM,dst_crs='EPSG:3857',dst_nodata=-1,resampling=Resampling.nearest)
 # The image and lookup use the same sampled aggregate, preventing pixel/pick mismatch.
 colors=['f4f7fa','dce9f1','b8d3e4','85b2cc','518dad','286183','123f62']
 Image.fromarray(palette(dst,[1,10,50,100,500,1000],colors,dst>=0)).save(out/'density.png',optimize=True)
 (out/'density.bin.gz').write_bytes(gzip.compress(dst.astype('<f4').tobytes(),mtime=0))
 record(out,dict(sourceUrl='https://ghsl.jrc.ec.europa.eu/ghs_pop2023.php',downloadUrl='https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_54009_1000/V1-0/'+archive.name.replace('ghsl2020-1km.zip','GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0.zip'),inputSha256=sha(archive),period=2020,unit='people/km²',license='European Commission reuse notice; attribution required',method='GHSL R2023A 1 km Mollweide equal-area source. Aggregate aligned 5×5 cells: sum population / count of valid 1 km² cells. Nearest-neighbour display in Web Mercator. Coastal aggregates use valid area only. No national or city total inferred. Lookup and image use identical 1800×1502 samples.',sourceNoData=-200,lookupNoData=-1,lookup='little-endian float32 row-major gzip',breaks=[1,10,50,100,500,1000],colors=colors))
 print('population complete',flush=True)
def physical():
 out=ROOT/'public/assets/atlas/europe/physical-v1';out.mkdir(parents=True,exist_ok=True)
 path=CACHE/'etopo2022-60s.tif'
 with rasterio.open(path) as src:
  assert src.crs.to_epsg() in [4326,9518] and np.isclose(src.res[0],1/60)
  elev=np.zeros((H,W),dtype='float32')
  # EPSG:9518 = WGS84 horizontal + EGM2008 height. Reproject horizontal only.
  reproject(rasterio.band(src,1),elev,src_transform=src.transform,src_crs='EPSG:4326',dst_transform=TRANSFORM,dst_crs='EPSG:3857',resampling=Resampling.average)
 geo=json.loads((ROOT/'src/data/atlas/europe-countries.json').read_text(encoding='utf8'))
 geoms=[transform_geom('EPSG:4326','EPSG:3857',f['geometry']) for f in geo['features']]
 land=geometry_mask(geoms,out_shape=(H,W),transform=TRANSFORM,invert=True)
 rgb=palette(elev,[0,200,500,1000,2000,3000],['c6d9b4','dce5bd','dfdaa9','cfbe91','b69c81','967e71','e8e3dd'],land)
 dy,dx=np.gradient(elev);shade=np.round(np.clip(.92+(dy-dx)/1300,.7,1.1)*10)/10
 rgb[:,:,:3]=np.clip(rgb[:,:,:3]*shade[:,:,None],0,255).astype('uint8')
 Image.fromarray(rgb).save(out/'terrain.png',optimize=True)
 # Rasterized contours preserve the map's common frame without shipping many MB of vectors.
 contours=Image.new('RGBA',(W,H),(0,0,0,0));draw=ImageDraw.Draw(contours)
 z=np.ma.array(elev,mask=~land)
 cg=contourpy.contour_generator(x=np.arange(W)+.5,y=np.arange(H)+.5,z=z)
 counts={}
 for level in range(500,5501,500):
  lines=cg.lines(level);counts[level]=len(lines)
  for line in lines:
   if len(line)>2:draw.line([tuple(p) for p in line],fill='#866747' if level%1000==0 else '#b8a182',width=1)
 contours.save(out/'contours.png',optimize=True)
 hydro=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(hydro)
 def xy(p):return ((p[0]+25)/90*W,(merc(73)-merc(p[1]))/(merc(73)-merc(32))*H)
 for kind in ['lakes','rivers']:
  collection=json.loads((ROOT/f'public/assets/atlas/europe/context-v1/{kind}.json').read_text(encoding='utf8'))
  for f in collection['features']:
   g=f['geometry'];coord=g['coordinates']
   if kind=='rivers':
    for line in [coord] if g['type']=='LineString' else coord:
     d.line([xy(p) for p in line],fill='#307d9d',width=2)
   else:
    for polygon in [coord] if g['type']=='Polygon' else coord:
     d.polygon([xy(p) for p in polygon[0]],fill='#91bdd0')
     for hole in polygon[1:]:d.polygon([xy(p) for p in hole],fill=(0,0,0,0))
 hydro.save(out/'water.png',optimize=True)
 # Terrain lookup has a distinct sentinel so below-sea-level land is not missing.
 elev=np.rint(elev).astype('<i2');elev[~land]=-32768
 (out/'elevation.bin.gz').write_bytes(gzip.compress(elev.tobytes(),mtime=0))
 record(out,dict(sourceUrl='https://doi.org/10.25921/fd45-gt74',downloadUrl='https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif',inputSha256=sha(path),license='NOAA ETOPO: freely available for private, academic and commercial purposes. Natural Earth: public domain.',unit='m relative to EGM2008 geoid',sourceResolution='60 arc-seconds',method='Average reprojection to 1800×1502 Web Mercator pixels; generalized land mask from existing Natural Earth country outlines. Terrain class colours plus conventional shaded relief in five intensity levels. 500 m contours computed from this display grid, not from full-resolution DEM. Lookup rounded to whole metres (not metre accuracy). Rivers/lakes are Natural Earth 1:50m v5.1.2; line thickness is not discharge.',lookupNoData=-32768,lookup='little-endian int16 row-major gzip',contourInterval=500,contourCounts=counts))
 print('physical complete',flush=True)
if __name__=='__main__':
 {'population':population,'physical':physical}[sys.argv[1]]()
