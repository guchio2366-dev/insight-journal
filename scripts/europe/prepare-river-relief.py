"""Render continuous hillshade from the retained ETOPO numeric display grid.

This does not introduce a finer DEM or reconstruct coastal missing values.
"""
from pathlib import Path
import gzip,hashlib,json,math
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
folder=ROOT/'public/assets/atlas/europe/physical-v1'
raw=(folder/'elevation.bin.gz').read_bytes()
m=json.loads((folder/'manifest.json').read_text())
w,h=m['width'],m['height'];z=np.frombuffer(gzip.decompress(raw),dtype='<i2').reshape(h,w).astype(float)
valid=z!=-32768
# A missing neighbour contributes no gradient; never turn a coastline into a cliff.
west=np.roll(z,1,axis=1);east=np.roll(z,-1,axis=1);north=np.roll(z,1,axis=0);south=np.roll(z,-1,axis=0)
dx=np.where(valid&np.roll(valid,1,1)&np.roll(valid,-1,1),(east-west)/2,0)
dy=np.where(valid&np.roll(valid,1,0)&np.roll(valid,-1,0),(north-south)/2,0)
dx[:,[0,-1]]=0;dy[[0,-1],:]=0
merc=lambda a:math.log(math.tan(math.pi/4+math.radians(a)/2))
lat=2*np.arctan(np.exp(merc(73)-(np.arange(h)+.5)/h*(merc(73)-merc(32))))-math.pi/2
meters=6378137*math.radians(90)/w*np.cos(lat)[:,None]
gx=dx/meters*3;gy=dy/meters*3
normal=np.sqrt(1+gx*gx+gy*gy)
# Northwest illumination, altitude 45 degrees, with ambient light.
shade=np.clip((-gx*.5+gy*.5+math.sqrt(.5))/normal,.15,1)
light=.66+.34*shade
base=np.empty((h,w,3));base[:]=[225,231,213]
high=np.clip(np.maximum(z,0)/3000,0,1)[...,None]
base=base*(1-high)+np.array([192,177,153])*high
rgba=np.zeros((h,w,4),dtype='uint8');rgba[:,:,:3]=np.clip(base*light[...,None],0,255);rgba[:,:,3]=np.where(valid,255,0)
output=folder/'river-relief.png';Image.fromarray(rgba).save(output,optimize=True)
manifest={'source':m['sourceUrl'],'sourceDownload':m['downloadUrl'],'rawDemSha256':m['inputSha256'],'retainedGridSha256':hashlib.sha256(raw).hexdigest(),'width':w,'height':h,'bounds':m['bounds'],'projection':m['projection'],'verticalExaggeration':3,'azimuth':315,'sunAltitude':45,'method':'Continuous hillshade from retained ETOPO display elevation using metric cell spacing. Missing-neighbour slopes are zero. No aerial imagery, interpolation or invented higher-resolution elevations. Existing country mask remains, so newly detailed coastal land may lack DEM coverage.','imageSha256':hashlib.sha256(output.read_bytes()).hexdigest()}
(folder/'river-relief-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(output.stat().st_size)
