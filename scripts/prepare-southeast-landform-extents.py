#!/usr/bin/env python3
"""Derive illustrative terrain footprints from the site's masked NOAA ETOPO grid.

These are elevation-condition study areas, not authoritative landform borders.
The windows are labelled and documented so no enclosing rectangle is passed off
as a physical boundary. Run after atlas-asia-physical.py has made the DEM.
"""
import gzip
import json
from pathlib import Path
import numpy as np
from scipy.ndimage import binary_opening, binary_closing, label
from contourpy import contour_generator

root=Path(__file__).resolve().parents[1]
base=root/'public/assets/atlas/asia-physical-v1'
manifest=json.loads((base/'manifest.json').read_text())['regions']['southeast-asia']
w,h=manifest['width'],manifest['height']
grid=np.frombuffer(gzip.decompress((base/'southeast-asia.elevation.gz').read_bytes()),dtype='<i2').reshape(h,w)
west,south,east,north=manifest['bounds4326']
# DEM pixels are evenly spaced in Web Mercator, not in latitude.
def merc(lat):
 r=np.deg2rad(np.clip(lat,-85,85));return np.log(np.tan(np.pi/4+r/2))
def lat_from_merc(y):return np.rad2deg(2*np.arctan(np.exp(y))-np.pi/2)
ymax,ymin=merc(north),merc(south)
lons=west+(np.arange(w)+.5)*(east-west)/w
lats=lat_from_merc(ymax-(np.arange(h)+.5)*(ymax-ymin)/h)
# Windows constrain each named lesson; elevations define the visible shapes.
# 'island' keeps the major connected land mass around the named island.
windows=[
 ('mekong-delta',[104.3,8.1,106.9,11.5],'low',50),
 ('irrawaddy-delta',[93.6,15.1,97.1,18.2],'low',50),
 ('khorat-plateau',[101,14.1,105.2,18.5],'high',200),
 ('sumatra-mountains',[95,-6.6,106.2,5.8],'high',500),
 ('java-island',[105,-9,115,-5.3],'island',0),
 ('borneo-interior',[109,0,119,7.5],'high',500),
 ('luzon-island',[119,12.1,124.6,19.6],'island',0),
]
features=[]
for ident,(x0,y0,x1,y1),kind,limit in windows:
 ix=np.flatnonzero((lons>=x0)&(lons<=x1));iy=np.flatnonzero((lats>=y0)&(lats<=y1))
 xstart,xstop=ix[0],ix[-1]+1;ystart,ystop=iy[0],iy[-1]+1
 z=grid[ystart:ystop:3,xstart:xstop:3]
 valid=z!=-32768
 mask=valid&((z<=limit)&(z>=0) if kind=='low' else z>=limit if kind=='high' else z>=0)
 mask=binary_closing(mask,iterations=2);mask=binary_opening(mask,iterations=2)
 components,n=label(mask)
 if kind=='island':
  # The named island is the largest contiguous candidate in its study window.
  sizes=np.bincount(components.ravel());sizes[0]=0;mask=components==sizes.argmax()
 else:
  sizes=np.bincount(components.ravel());sizes[0]=0;mask&=sizes[components]>=max(15,int(sizes.max()*.015))
 yy=np.arange(ystart,ystop,3);xx=np.arange(xstart,xstop,3)
 gen=contour_generator(x=lons[xx],y=lats[yy],z=mask.astype('f4'),name='serial')
 lines=[]
 for points in gen.lines(.5):
  if len(points)<12:continue
  coords=np.round(points[::max(1,len(points)//200)],3).tolist()
  if len(coords)>=2:lines.append(coords)
 features.append({'id':ident,'window':[x0,y0,x1,y1],'condition':('0–50 m' if kind=='low' else f'{limit} m以上' if kind=='high' else '陸域（0 m以上）'),'lines':lines})
output={'source':'NOAA ETOPO 2022 60 arc-second surface DEM, masked and averaged in existing atlas-asia-physical dataset','method':'Named study windows; masked display-grid threshold, morphology removes isolated 3-pixel artifacts; boundary is the 0.5 contour on every third display pixel. Islands retain the largest contiguous land mass. These outlines are not authoritative named-landform boundaries.','features':features}
path=root/'src/data/atlas/asia/southeast-landform-extents.json';path.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
print(path,len(path.read_bytes()),[(f['id'],len(f['lines'])) for f in features])
