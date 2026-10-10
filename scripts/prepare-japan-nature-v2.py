"""Offline Japan surfaces from immutable NOAA/GPCC originals and NE10m coastline.
PYTHONPATH=/tmp/japan-python python scripts/prepare-japan-nature-v2.py --source-dir /tmp/japan-nature-source
No source gap filling, coastal dilation, smoothing or new observations.
"""
from pathlib import Path
import argparse,gzip,hashlib,json,math
import numpy as np, rasterio,contourpy
from rasterio.windows import from_bounds as window_from_bounds
from rasterio.features import geometry_mask
from rasterio.transform import from_bounds
from shapely.geometry import shape,mapping,Polygon,LineString
from shapely.ops import unary_union
from scipy.io import netcdf_file
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/japan-nature-v2'
BOUNDS=[122,24,147,46]
NO_DATA=-99999
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,value):p.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
def geometry_collection(items):return {'type':'FeatureCollection','features':items}
def feature(g,p):return {'type':'Feature','properties':p,'geometry':mapping(g)}
def polygon_parts(g):
 if g.geom_type=='Polygon':return [g]
 return [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
def line_parts(g):
 if g.geom_type=='LineString':return [g]
 return [p for p in getattr(g,'geoms',[]) if p.geom_type=='LineString']
def palette(value,kind):
 anchors=([(0,'eff7ed'),(500,'d5dfb0'),(1500,'dac59b'),(2500,'b09578'),(4000,'f1e9df')] if kind=='elevation' else [(0,'f2f6fb'),(750,'d8eaf4'),(1500,'99c9e2'),(2500,'468fb6'),(4000,'154a79'),(5000,'12344f')])
 return '#'+bytes(round(float(np.interp(value,[v for v,c in anchors],[bytes.fromhex(c)[i] for v,c in anchors]))) for i in range(3)).hex()
def contours(values,x,y,land,interval,kind):
 z=np.ma.masked_where(~np.isfinite(values)|(values==NO_DATA),values)
 gen=contourpy.contour_generator(x=x,y=y,z=z,corner_mask=False,line_type='Separate',fill_type='OuterOffset')
 lo=max(0,math.floor(float(z.min())/interval)*interval);hi=(math.floor(float(z.max())/interval)+1)*interval
 bands=[];lines=[];levels=list(range(lo,hi+1,interval))
 for lower,upper in zip(levels,levels[1:]):
  pts,offsets=gen.filled(np.nextafter(float(lower),-np.inf),np.nextafter(float(upper),-np.inf))
  parts=[]
  for points,offset in zip(pts,offsets):
   rings=[points[offset[i]:offset[i+1]] for i in range(len(offset)-1)]
   if len(rings[0])<4:continue
   p=Polygon(rings[0],rings[1:])
   if not p.is_valid:p=p.buffer(0)
   parts.extend(polygon_parts(p.intersection(land)))
  if parts:bands.append(feature(unary_union(parts),{'id':f'{kind}-{lower}','lower':lower,'upper':upper,'color':palette((lower+upper)/2,kind),'label':f'{lower:,}–{upper:,} '+('m' if kind=='elevation' else 'mm/年')}))
 for level in levels[1:-1]:
  parts=[]
  for coordinates in gen.lines(level):
   if len(coordinates)>1:parts.extend(line_parts(LineString(coordinates).intersection(land)))
  if parts:lines.append(feature(unary_union(parts),{'id':f'{kind}-line-{level}','value':level,'label':f'{level:,} '+('m' if kind=='elevation' else 'mm/年')}))
 return geometry_collection(bands),geometry_collection(lines),levels

def display(native,x,y,land,kind,interval):
 west,south,east,north=BOUNDS;r=6378137;proj=lambda lat:r*math.log(math.tan(math.pi/4+lat*math.pi/360))
 xmin,xmax=r*math.radians(west),r*math.radians(east);ymin,ymax=proj(south),proj(north)
 w=math.ceil((xmax-xmin)/2000);h=math.ceil((ymax-ymin)/2000)
 lons=np.degrees((xmin+(np.arange(w)+.5)*(xmax-xmin)/w)/r)
 lats=np.degrees(2*np.arctan(np.exp((ymax-(np.arange(h)+.5)*(ymax-ymin)/h)/r))-math.pi/2)
 # Nearest original source centre. Display resolution is not observation resolution.
 cols=np.clip(np.floor((lons-x[0])/(x[1]-x[0])+.5).astype(int),0,len(x)-1)
 rows=np.clip(np.floor((lats-y[0])/(y[1]-y[0])+.5).astype(int),0,len(y)-1)
 values=native[np.ix_(rows,cols)].astype('<f4')
  # geometry uses lon/lat coordinates while y is Mercator; project geometry explicitly.
 from shapely.ops import transform
 projected=transform(lambda lon,lat,z=None:(r*np.asarray(lon)*math.pi/180,r*np.log(np.tan(math.pi/4+np.asarray(lat)*math.pi/360))),land)
 mask=geometry_mask([mapping(projected)],out_shape=(h,w),transform=from_bounds(xmin,ymin,xmax,ymax,w,h),invert=True)
 valid=mask&np.isfinite(values)&(values!=NO_DATA)
 values=np.where(valid,values,NO_DATA).astype('<f4')
 image=np.zeros((h,w,4),dtype=np.uint8)
 # Negative coastal ETOPO heights are retained in values and shown as the lowest class;
 # contours begin at zero. No invented elevation correction.
 for level in np.unique(np.floor(np.maximum(values[valid],0)/interval).astype(int)):
  color=palette((int(level)+.5)*interval,kind);at=valid&(np.floor(np.maximum(values,0)/interval)==level);image[at]=list(bytes.fromhex(color[1:]))+[255]
 Image.fromarray(image).save(OUT/(kind+'.png'),optimize=True)
 (OUT/(kind+'.float32.gz')).write_bytes(gzip.compress(values.tobytes(),mtime=0))
 samples=[]
 for name,lon,lat in [('札幌',141.32,43.05),('東京',139.75,35.69),('那覇',127.69,26.21),('富士山付近',138.73,35.36),('琵琶湖付近',136.05,35.2)]:
  c=int(np.argmin(abs(x-lon)));row=int(np.argmin(abs(y-lat)));samples.append({'name':name,'locator':[lon,lat],'sourceCenter':[float(x[c]),float(y[row])],'sourceValue':float(native[row,c]) if native[row,c]!=NO_DATA else None})
 return {'width':w,'height':h,'bounds4326':BOUNDS,'bounds3857':[xmin,ymin,xmax,ymax],'imageCoordinates':[[west,north],[east,north],[east,south],[west,south]],'image':kind+'.png','grid':kind+'.float32.gz','gridEncoding':'float32-le-gzip','noData':NO_DATA,'validLandPixels':int(valid.sum()),'missingLandPixels':int((mask&~valid).sum()),'coastalNegativePixels':int((valid&(values<0)).sum()),'sourceSamples':samples,'bands':kind+'-bands.geojson','contours':kind+'-contours.geojson','interval':interval}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);args=parser.parse_args();cache=args.source_dir;OUT.mkdir(parents=True,exist_ok=True)
 assert sha(cache/'etopo.tif')=='9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e'
 assert sha(cache/'gpcc.nc.gz')=='3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5'
 coast=ROOT/'public/assets/atlas/japan-v1/geography.json';land=shape(json.loads(coast.read_text())['features'][0]['geometry'])
 climate_source=ROOT/'data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif'
 assert sha(climate_source)=='7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361'
 with rasterio.open(climate_source) as src:
  window=window_from_bounds(*BOUNDS,transform=src.transform).round_offsets().round_lengths();classes=src.read(1,window=window);t=src.window_transform(window)
  x=t.c+(np.arange(classes.shape[1])+.5)*t.a;y=t.f+(np.arange(classes.shape[0])+.5)*t.e
  # Reuse only the display geometry; categorical colors use exact class IDs below.
  climate=display(classes,x,y,land,'climate',1)
  # Source class0 is missing, never a climate class. Keep the original no-data gaps.
  a=np.frombuffer(gzip.decompress((OUT/'climate.float32.gz').read_bytes()),dtype='<f4').reshape(climate['height'],climate['width']);valid=(a!=NO_DATA)&(a>0);ids=np.where(valid,a,0).astype('uint8')
  legend=json.loads((ROOT/'public/assets/atlas/asia-climate-v2/legend.json').read_text());palette_array=np.zeros((31,4),dtype='uint8')
  for c in legend:palette_array[c['id']]=list(bytes.fromhex(c['color'][1:]))+[255]
  Image.fromarray(palette_array[ids]).save(OUT/'climate.png',optimize=True);(OUT/'climate.uint8.gz').write_bytes(gzip.compress(ids.tobytes(),mtime=0));(OUT/'climate.float32.gz').unlink()
  climate.update(grid='climate.uint8.gz',gridEncoding='uint8-gzip',noData=0,validLandPixels=int(valid.sum()),missingLandPixels=climate['validLandPixels']-int(valid.sum()),unit='Köppen–Geiger区分',period='1991–2020',sourceResolutionDegrees=.1,source='Beck et al. (2023) 0.1° source member',sourceUrl='https://doi.org/10.1038/s41597-023-02549-6',license='CC BY 4.0',sourceSha256=sha(climate_source),classes=[c for c in legend if c['id'] in np.unique(ids)])
  for k in ['bands','contours','interval','coastalNegativePixels']:climate.pop(k,None)
 print('climate ready',flush=True)
 with rasterio.open(cache/'etopo.tif') as src:
  assert src.crs.to_epsg() in [4326,9518] and src.nodata==NO_DATA and abs(src.res[0]-1/60)<1e-9
  window=window_from_bounds(*BOUNDS,transform=src.transform).round_offsets().round_lengths();elev=src.read(1,window=window);t=src.window_transform(window)
  x=t.c+(np.arange(elev.shape[1])+.5)*t.a;y=t.f+(np.arange(elev.shape[0])+.5)*t.e
  bands,lines,levels=contours(elev,x,y,land,500,'elevation');write(OUT/'elevation-bands.geojson',bands);write(OUT/'elevation-contours.geojson',lines)
  elevation=display(elev,x,y,land,'elevation',500);elevation.update(unit='m・EGM2008基準',sourceResolutionDegrees=1/60,edition=2022,levels=levels,source='NOAA ETOPO 2022 60 arc-second surface',sourceUrl='https://www.ncei.noaa.gov/products/etopo-global-relief-model',downloadUrl='https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif',license='CC0-1.0',sourceSha256=sha(cache/'etopo.tif'))
 print('elevation ready',flush=True)
 netcdf=cache/'gpcc.nc'
 if not netcdf.exists():netcdf.write_bytes(gzip.decompress((cache/'gpcc.nc.gz').read_bytes()))
 with netcdf_file(netcdf,'r',mmap=False) as src:
  assert src.title.decode().endswith('0.25 degree') and src.time_coverage_start.decode()=='1991-01-01'
  # Crop with a one-source-cell margin to produce contours at the edge of the display bounds.
  lons=src.variables['lon'][:].copy();lats=src.variables['lat'][:].copy();cs=np.flatnonzero((lons>=121.5)&(lons<=147.5));rs=np.flatnonzero((lats>=23.5)&(lats<=46.5))
  monthly=src.variables['gpcc_precip'][:,rs[0]:rs[-1]+1,cs[0]:cs[-1]+1].copy();rain=monthly.astype('float64').sum(axis=0);rain[np.any((monthly<0)|~np.isfinite(monthly),axis=0)]=NO_DATA;x=lons[cs];y=lats[rs]
  bands,lines,levels=contours(rain,x,y,land,250,'precipitation');write(OUT/'precipitation-bands.geojson',bands);write(OUT/'precipitation-contours.geojson',lines)
  precipitation=display(rain,x,y,land,'precipitation',250);precipitation.update(unit='mm/年',sourceResolutionDegrees=.25,period='1991–2020',edition=2025,levels=levels,source='GPCC Precipitation Analysis Climatology v2025',sourceUrl='https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025',license='CC BY 4.0',sourceSha256=sha(cache/'gpcc.nc.gz'))
 print('precipitation ready',flush=True)
 water={}
 for kind in ['basins','groundwater']:
  old=ROOT/f'public/assets/atlas/asia-water-v1/east-asia.{kind}.json.gz';data=json.loads(gzip.decompress(old.read_bytes()));records=[r for r in data['records'] if 'JPN' in r['countries']];ids={r['id'] for r in records};fs=[]
  for f in data['geometry']['features']:
   if f['properties']['id'] not in ids:continue
   g=shape(f['geometry']).intersection(land)
   if not g.is_empty:fs.append(feature(g,f['properties']))
  write(OUT/(kind+'.geojson'),geometry_collection(fs));write(OUT/(kind+'-records.json'),records);water[kind]={'geometry':kind+'.geojson','records':kind+'-records.json','features':len(fs),'inputSha256':sha(old),'sourceManifest':'/assets/atlas/asia-water-v1/manifest.json'}
 rivers=[];names={'Ishikari':'石狩川','Tone':'利根川','Mogami':'最上川'}
 for f in json.loads((cache/'rivers-ne10m.json').read_text())['features']:
  g=shape(f['geometry'])
  if not g.intersects(land):continue
  name=f['properties']['name_en'];g=g.intersection(land)
  p={'id':'river-'+name.lower(),'name':names.get(name,name),'sourceName':name,'source':'Natural Earth v5.1.2 1:10m','sourceUrl':'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/'}
  point=g.interpolate(.5,normalized=True) if g.geom_type=='LineString' else g.representative_point();p['point']=[point.x,point.y];rivers.append(feature(g,p))
 write(OUT/'rivers.geojson',geometry_collection(rivers));write(ROOT/'src/data/atlas/japan-nature-v2-records.json',{'basins':json.loads((OUT/'basins-records.json').read_text()),'groundwater':json.loads((OUT/'groundwater-records.json').read_text()),'rivers':[f['properties'] for f in rivers]});water['rivers']={'geometry':'rivers.geojson','features':len(rivers),'sourceSha256':sha(cache/'rivers-ne10m.json'),'license':'Public domain'}
 manifest={'schemaVersion':2,'retrievedAt':'2026-10-10','boundary':{'file':'/assets/atlas/japan-v1/geography.json','sha256':sha(coast),'source':'Natural Earth 1:10m, same detailed Japan coast as dedicated base map'},'climate':climate,'elevation':elevation,'precipitation':precipitation,'water':water,'processing':{'script':'scripts/prepare-japan-nature-v2.py','scriptSha256':sha(Path(__file__)),'contours':'Native source-centre contours, exact detailed-coast intersection. No smoothing. Step bands and lines derive from identical original values. Precipitation is the sum of twelve complete monthly normals; any missing month remains missing.','display':'Nearest native cell sample to ~2km Mercator display; detailed-coast pixel-centre mask. No source gap filling or enlargement claim.','boundaryCoverage':'All existing Japan base-map geometry lies inside raster bounds. This Natural Earth base omits Minamitorishima and Okinotorishima; this product does not claim all national territory.','sourceResolutionMeaning':'Display pixels are not measurement resolution. GPCC 0.25° is roughly 20–28km in Japan; ETOPO 60 seconds is roughly 1–2km.','negativeElevation':'Original coastal negative elevations preserved in numeric lookup. Lowest land color contains negative values; no local ground-survey claim.'},'limitations':['GPCC is a coarse interpolated station climatology, not measured annual rainfall at each point. 250mm contour spacing does not imply 250mm accuracy or fine terrain detail.','Native missing precipitation remains missing; small islands or coastal slivers can lack a source cell and show base-map land. No ocean cell or neighbouring island is substituted.','BasinATLAS/WHYMAP inherited simplified geometry is not repaired by clipping to a finer coast; original gaps remain. BasinATLAS coastal aggregates are not individual named river basins.','Natural Earth only supplies three Japan named river examples; this is not a complete domestic river network.','WHYMAP 2008 scale1:25m is regional hydrogeologic classification/recharge class, not safe yield, storage, contamination or current depletion.','Beck 0.1 degree original source is about 8–11km in Japan; the 2km display adds no classification detail. Source class0 remains missing, particularly small islands/coasts. Japanese geographic climate-region explanations are not Beck category geometry.','Beck 1km original archive, MLIT domestic river archive and extra JMA station tables blocked by HTTP403 in this environment. No bypass or invented values.'],'files':{}}
 for p in sorted(OUT.iterdir()):
  if p.name!='manifest.json':manifest['files'][p.name]={'bytes':p.stat().st_size,'sha256':sha(p)}
 write(OUT/'manifest.json',manifest)
 print('done',json.dumps({'elevation':elevation['validLandPixels'],'precipitation':precipitation['validLandPixels'],'rainMissing':precipitation['missingLandPixels'],'rivers':len(rivers)}),flush=True)
if __name__=='__main__':main()
