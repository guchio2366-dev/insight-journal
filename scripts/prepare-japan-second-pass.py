"""Offline reference overlays. Source resolution is retained; no values are downallocated.
PYTHONPATH=/tmp/japan-second-python python scripts/prepare-japan-second-pass.py
Requires NumPy, Pillow and Shapely. The JRC publisher image is clipped as a reference
only, never classified or used to estimate forest area. Source hashes are retained.
"""
from pathlib import Path
import json,math,gzip,hashlib
import numpy as np
from PIL import Image
from shapely.geometry import shape
from shapely import contains_xy
R=Path(__file__).resolve().parents[1]; A=R/'public/assets/atlas'; O=A/'japan-agriculture-v3'; O.mkdir(exist_ok=True)
read=lambda p:json.loads((A/p).read_text())
land=shape(read('japan-v1/geography.json')['features'][0]['geometry'])
farm=read('asia-farming-v1/manifest.json'); layers=farm['regions']['east-asia']['layers']
inputs=['japan-v1/geography.json','asia-farming-v1/manifest.json','asia-agriculture-v1/east-asia-rice-grid.json']
records=[]
for name,color in [('rice','597d36'),('wheat','b08028'),('pig','ae7072'),('forest','4d9221')]:
 src=next(x for x in layers if x['id']==('wheat' if name=='rice' else name))
 w,h=src['width'],src['height']; west,south,east,north=src['bounds3857']; dx=(east-west)/w; dy=(north-south)/h
 project=lambda x,y:(6378137*math.radians(x),6378137*math.log(math.tan(math.pi/4+math.radians(y)/2)))
 x0,y0=project(122.5,23.8);x1,y1=project(146.3,46)
 c0,c1=math.floor((x0-west)/dx),math.ceil((x1-west)/dx);r0,r1=math.floor((north-y1)/dy),math.ceil((north-y0)/dy)
 xs=west+(np.arange(c0,c1)+.5)*dx;ys=north-(np.arange(r0,r1)+.5)*dy
 lon=np.degrees(xs/6378137);lat=np.degrees(2*np.arctan(np.exp(ys/6378137))-math.pi/2)
 mask=contains_xy(land,lon[None,:],lat[:,None])
 if name=='forest':
  path='asia-farming-v1/'+src['image'];inputs.append(path)
  rgba=np.array(Image.open(A/path).convert('RGBA'))[r0:r1,c0:c1].copy();rgba[~mask]=0;values=None
 else:
  if name=='rice':
   original=read('asia-agriculture-v1/east-asia-rice-grid.json');grid=np.full(original['width']*original['height'],-200.,dtype=np.float32)
   for start,length in original['validRuns']:grid[start:start+length]=0
   for index,value in original['positiveCells']:grid[index]=value
   grid=grid.reshape(original['height'],original['width'])
   ox0,oy0,ox1,oy1=original['bounds'];step=original['cellSize']
   cols=np.floor((lon-ox0)/step).astype(int);rows=np.floor((oy1-lat)/step).astype(int)
   values=grid[np.clip(rows,0,original['height']-1)[:,None],np.clip(cols,0,original['width']-1)[None,:]].copy()
   values[(rows<0)|(rows>=original['height']),:]=-200;values[:,(cols<0)|(cols>=original['width'])]=-200
  else:
   path='asia-farming-v1/'+src['grid'];inputs.append(path)
   original=np.frombuffer(gzip.decompress((A/path).read_bytes()),dtype='<f4').reshape(h,w);values=original[r0:r1,c0:c1].copy()
   assert np.array_equal(values[mask],original[r0:r1,c0:c1][mask])
  values[values<0]=-200
  values[~mask]=-200
  thresholds=[1,10,100,1000,5000] if name!='pig' else [1,10,50,200,1000]
  rgba=np.zeros((*values.shape,4),dtype=np.uint8);rgba[:,:,:3]=list(bytes.fromhex(color));rgba[:,:,3]=np.where(values>0,np.array([45,70,95,125,155,185])[np.searchsorted(thresholds,values,side='right')],0)
  (O/(name+'.float32.gz')).write_bytes(gzip.compress(values.astype('<f4').tobytes(),mtime=0))
 Image.fromarray(rgba).save(O/(name+'.png'),optimize=True)
 inv=lambda x,y:[math.degrees(x/6378137),math.degrees(2*math.atan(math.exp(y/6378137))-math.pi/2)]
 nw=inv(west+c0*dx,north-r0*dy);se=inv(west+c1*dx,north-r1*dy)
 rec={'id':name,'image':name+'.png','imageCoordinates':[nw,[se[0],nw[1]],se,[nw[0],se[1]]],'width':c1-c0,'height':r1-r0,'bounds3857':[west+c0*dx,north-r1*dy,west+c1*dx,north-r0*dy],'year':2020,'color':'#'+color,'grid':None if values is None else name+'.float32.gz','noData':-200,'sourceResolutionDegrees':None if name=='forest' else 1/12,'unit':'publisher reference only' if name=='forest' else '頭/km²' if name=='pig' else 'ha/原5分角格子','license':farm['licenses']['forest' if name=='forest' else 'livestock' if name=='pig' else 'crops'] if name!='rice' else 'CC BY-SA 4.0 (existing rice source)','method':'Original publisher reference image cropped at original pixel edges and masked at pixel centres; no reclassification, no area calculation. Transparent pixels have no forest assertion.' if name=='forest' else 'Original numeric values retained; nearest source cell for rice, existing source pixels for wheat/pig; same detailed national mask; source negative no-data codes become -200 while nonnegative values stay unchanged. Positive modeled values only, with six opacity steps. Zero and missing do not assert crop/animal presence.'}
 if values is not None:rec['validation']={'positiveLandPixels':int(np.sum(mask&(values>0))),'zeroLandPixels':int(np.sum(mask&(values==0))),'missingLandPixels':int(np.sum(mask&(values<0))),'valuesUnchanged':True}
 records.append(rec)
manifest={'schemaVersion':1,'scope':'Japan second-pass reference overlays','layers':records,'inputs':[{'path':'public/assets/atlas/'+p,'sha256':hashlib.sha256((A/p).read_bytes()).hexdigest()} for p in inputs],'limitations':['Crop and livestock native resolution is 5 arc-min, about 7–9 km in Japan; display pixels are not observation resolution.','Crop quantity is modeled harvested area, not crop-field boundaries or physical agricultural land area.','Pig density is modeled heads per km², not pork production. Cattle data are not substituted for separate dairy/beef.','JRC forest is a coarse publisher image reference, not a detailed native forest classification or complete small-island inventory.'],'files':{p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in O.iterdir() if p.name!='manifest.json'}}
(O/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n');print([(x['id'],x.get('validation')) for x in records])
