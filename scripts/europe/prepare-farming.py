"""SPAM crop area and FAO GLW4 livestock density, independently lazy loaded."""
from pathlib import Path
import sys,json,hashlib,zipfile,gzip,io,math
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[2];CACHE=ROOT.parent/'europe-source-cache'
sys.path.insert(0,str(ROOT.parent/'europe-python'))
import numpy as np
from PIL import Image
from numcodecs import Blosc
OUT=ROOT/'public/assets/atlas/europe/farming-v1';OUT.mkdir(parents=True,exist_ok=True)
W,H=1800,1502
merc=lambda lat:math.log(math.tan(math.pi/4+math.radians(lat)/2))
lat=np.degrees(2*np.arctan(np.exp(merc(73)-(np.arange(H)+.5)/H*(merc(73)-merc(32))))-np.pi/2)
rows=np.floor((73-lat)*12).astype(int);cols=np.floor((np.arange(W)+.5)/W*1080).astype(int)
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def output(id,grid,breaks,colors):
 grid=grid.astype('<f4');grid[~np.isfinite(grid)|(grid<0)]=-1
 sample=grid[np.ix_(rows,cols)];idx=np.searchsorted(breaks,sample,side='right')
 idx[sample==0]=0
 pal=np.array([list(bytes.fromhex(c))+[255] for c in colors],dtype='uint8');rgba=pal[idx];rgba[sample<0]=0
 Image.fromarray(rgba).save(OUT/(id+'.png'),optimize=True)
 (OUT/(id+'.bin.gz')).write_bytes(gzip.compress(grid.tobytes(),mtime=0))
 return {n:dict(sha256=sha((OUT/n).read_bytes()),bytes=(OUT/n).stat().st_size) for n in [id+'.png',id+'.bin.gz']}
layers=[];inputs=[]
crops=[('barley','BARL','大麦'),('maize','MAIZ','トウモロコシ'),('rapeseed','RAPE','菜種'),('sunflower','SUNF','ヒマワリ'),('sugarbeet','SUGB','テンサイ'),('potato','POTA','ジャガイモ'),('rice','RICE','米'),('soybean','SOYB','大豆'),('vegetables','VEGE','その他の野菜'),('temperatefruit','TEMF','温帯果樹'),('citrus','CITR','柑橘類')]
archive=CACHE/'spam2020V2r2_global_harvested_area.geotiff.zip'
assert hashlib.md5(archive.read_bytes()).hexdigest()=='dd9ac5def086fcae26d28423b2b31f8b'
with zipfile.ZipFile(archive) as z:
 for id,code,label in crops:
  name=f'spam2020V2r2_global_harvested_area/spam2020_V2r2_global_H_{code}_A.tif';raw=z.read(name)
  im=Image.open(io.BytesIO(raw));assert im.size==(4320,2160)
  grid=np.asarray(im)[204:696,1860:2940].copy()
  files=output(id,grid,[0,50,250,1000,3000],['e3e4df','ede2bb','dac58a','bc9b58','93743d','654d29'])
  layers.append(dict(id=id,title=label,sourceCode=code,unit='ha / 格子',files=files))
  inputs.append(dict(member=name,sha256=sha(raw)))
base='https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/glw4-2020.zarr/'
def get(key):
 p=CACHE/('glw-'+key.replace('/','_'))
 if not p.exists():
  with urlopen(base+key,timeout=90) as r:p.write_bytes(r.read())
 raw=p.read_bytes();inputs.append(dict(url=base+key,sha256=sha(raw)));return raw
meta=json.loads(get('zarr.json'))['consolidated_metadata']['metadata']
for id,label in [('cattle','牛'),('pig','豚'),('chicken','鶏'),('sheep','羊')]:
 a=meta[id];assert a['shape']==[2160,4320] and a['attributes']['units']=='head/km2' and a['chunk_grid']['configuration']['chunk_shape']==[1080,1080]
 grid=np.full((492,1080),np.nan,dtype='float32')
 for cx in [1,2]:
  raw=get(f'{id}/c/0/{cx}');chunk=np.frombuffer(Blosc().decode(raw),dtype='<f4').reshape(1080,1080)
  left=max(1860,cx*1080);right=min(2940,(cx+1)*1080)
  grid[:,left-1860:right-1860]=chunk[204:696,left-cx*1080:right-cx*1080]
 files=output(id,grid,[0,1,10,50,200,1000],['e3e4df','fff4dd','fee8c8','fdbb84','fc8d59','d95034','9f2024'])
 layers.append(dict(id=id,title=label,unit='羽/km²' if id=='chicken' else '頭/km²',files=files))
write(OUT/'manifest.json',dict(retrievedAt='2026-09-25',bounds=[-25,32,65,73],width=W,height=H,lookup={'width':1080,'height':492,'resolutionDegrees':1/12,'nodata':-1,'encoding':'little-endian float32 gzip'},sources={'crops':'https://doi.org/10.7910/DVN/SWPENT','livestock':'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/'},licenses={'crops':'IFPRI Dataverse CC BY 4.0','livestock':'FAO GLW4 CC BY 4.0'},inputs=inputs,archiveSha256=sha(archive.read_bytes()),layers=layers,method='SPAM2020 v2r2 harvested area, all production systems; FAO GLW4 2020 density. Clip source 5-arc-minute cells to Europe frame. Nearest-cell Web Mercator display; original source cell lookup. Zero grey, missing transparent. Model estimates, not current field/farm observations. No official country totals inferred.'))
print('farming layers',len(layers),flush=True)
