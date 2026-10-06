"""Reproject existing classified rasters with nearest-neighbour sampling; no new data."""
from pathlib import Path
import json, math, hashlib
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
r=math.pi/180
my=lambda lat: math.log(math.tan(math.pi/4+lat*r/2))
scale=min(900/(89*r),580/(my(70)-my(41)))
ox=(900-89*r*scale)/2; oy=(580-(my(70)-my(41))*scale)/2
w,h=1800,1160
xx,yy=np.meshgrid((np.arange(w)+.5)*900/w,(np.arange(h)+.5)*580/h)
lon=-141+(xx-ox)/scale/r
lat=(2*np.arctan(np.exp(my(70)-(yy-oy)/scale))-math.pi/2)/r
items=[]
paths=list((root/'public/assets/atlas/canada-water-v1').glob('annual-precipitation-us-*.png'))+[root/'public/assets/atlas/canada-forestry-v1/forest-needleleaf-2020.png']
for p in paths:
 if '-mercator' in p.stem:continue
 im=np.array(Image.open(p).convert('RGBA')); ih,iw=im.shape[:2]
 sx=np.floor((lon+145)/95*iw).astype(int); sy=np.floor((85-lat)/45*ih).astype(int)
 valid=(sx>=0)&(sx<iw)&(sy>=0)&(sy<ih)
 out=np.zeros((h,w,4),dtype=np.uint8);out[valid]=im[sy[valid],sx[valid]]
 dst=p.with_stem(p.stem+'-mercator');Image.fromarray(out).save(dst,optimize=True)
 items.append({'source':str(p.relative_to(root)),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'output':str(dst.relative_to(root)),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest()})
(root/'public/assets/atlas/canada-water-v1/mercator-manifest.json').write_text(json.dumps({'method':'Inverse Web Mercator to existing affine [-145,40,-50,85] rasters; nearest neighbour preserves categorical colors; pixel centers; transparent outside input. Existing source attribution applies.','display':[900,580],'geographicBounds':[-141,41,-52,70],'files':items},indent=2)+'\n')
