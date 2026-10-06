#!/usr/bin/env python3
"""Optionally re-acquire the 28.98 MB MapSPAM source and reproduce Mexico cells.

Uses four HEAD requests concurrently before ANY uncached download, verifies
per-file/total sizes and pinned SHA-256, and stops if upstream content changes.
The default cache is outside the repository. Requires numpy,numcodecs,shapely.
"""
from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor,as_completed
import argparse,json,hashlib,math
import numpy as np
from numcodecs import Blosc,VLenUTF8,Zstd
from shapely import contains_xy,union_all
from shapely.geometry import shape
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'data-source/atlas/mexico/agriculture-v2'
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--cache',type=Path,default=ROOT.parent/'mexico-mapspam-source-cache');args=parser.parse_args();args.cache.mkdir(parents=True,exist_ok=True)
entries=json.loads((SOURCE/'spam-acquisition.json').read_text());pending=[]
for key,entry in entries.items():
 path=args.cache/key.replace('/','__')
 if not path.exists():pending.append((key,entry))
 else:assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'],f'Cache hash mismatch: {key}'
if pending:
 def check(item):
  key,entry=item
  with urlopen(Request(entry['url'],method='HEAD'),timeout=45) as response:size=int(response.headers['Content-Length'])
  assert size==entry['bytes'] and size<2_000_000, f'Source size changed: {key}'
  return size
 with ThreadPoolExecutor(max_workers=4) as pool:sizes=list(pool.map(check,pending))
 assert sum(sizes)<=28_983_306,'Source aggregate exceeds pinned bounded size'
 for key,entry in pending:
  with urlopen(entry['url'],timeout=90) as response:raw=response.read(entry['bytes']+1)
  assert len(raw)==entry['bytes'] and hashlib.sha256(raw).hexdigest()==entry['sha256'],f'Source content changed: {key}'
  (args.cache/key.replace('/','__')).write_bytes(raw)
def read(key):return (args.cache/key.replace('/','__')).read_bytes()
def crc32c(data):
 crc=0xffffffff
 for byte in data:
  crc^=byte
  for _ in range(8):crc=(crc>>1)^(0x82f63b78 if crc&1 else 0)
 return crc^0xffffffff
bounds=[-119,14,-86,33];west,south,east,north=bounds;step=1/12
x0,x1=round((west+180)/step),round((east+180)/step);y0,y1=round((90-north)/step),round((90-south)/step);h,w=y1-y0,x1-x0
xs,ys=np.meshgrid(west+(np.arange(w)+.5)*step,north-(np.arange(h)+.5)*step)
country=union_all([shape(f['geometry']) for f in json.loads((ROOT/'src/data/atlas/mexico/geometry.json').read_text())['features']]);mask=contains_xy(country,xs,ys)
crops=list(VLenUTF8().decode(Zstd().decode(read('crop/c/0'))));names=list(VLenUTF8().decode(Zstd().decode(read('crop_name/c/0'))));decoder=Blosc();grids=[]
for ci,crop in enumerate(crops):
 raw=read(f'physical_area/c/0/{ci}/0/0');index_bytes=raw[-(24*48*16+4):-4];assert crc32c(index_bytes)==int.from_bytes(raw[-4:],'little');index=np.frombuffer(index_bytes,dtype='<u8').reshape(24,48,2);grid=np.full((h,w),np.nan,dtype=np.float32)
 for row in range(y0//90,(y1-1)//90+1):
  for col in range(x0//90,(x1-1)//90+1):
   start,size=(int(z) for z in index[row,col])
   if start==2**64-1:continue
   assert start+size<=len(raw)-len(index_bytes)-4
   cell=np.frombuffer(decoder.decode(raw[start:start+size]),dtype='<f4').reshape(90,90);gy0,gy1=max(y0,row*90),min(y1,(row+1)*90);gx0,gx1=max(x0,col*90),min(x1,(col+1)*90)
   grid[gy0-y0:gy1-y0,gx0-x0:gx1-x0]=cell[gy0-row*90:gy1-row*90,gx0-col*90:gx1-col*90]
 grid[(grid==-9999)|~mask]=np.nan;assert np.all(grid[np.isfinite(grid)]>=0);grids.append(grid)
output=args.cache/'mapspam-mexico-physical-area.npz';np.savez_compressed(output,grids=np.stack(grids),crops=np.array(crops),names=np.array(names),bounds=np.array(bounds))
expected=hashlib.sha256((SOURCE/output.name).read_bytes()).hexdigest();actual=hashlib.sha256(output.read_bytes()).hexdigest();assert actual==expected,f'Clipping snapshot changed: {actual} versus {expected}'
print(f'Reproduced {output} with SHA-256 {actual}; source repository unchanged.')
