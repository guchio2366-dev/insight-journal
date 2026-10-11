"""Offline labels anchored to checked-in source pixels and contour vertices."""
import json,gzip,math,hashlib
from pathlib import Path
import numpy as np
from scipy.ndimage import label,center_of_mass
A=Path(__file__).resolve().parents[1]/'public/assets/atlas/japan-nature-v2';m=json.loads((A/'manifest.json').read_text());out={'climate':[],'precipitation':[],'elevation':[]}
s=m['climate'];grid=np.frombuffer(gzip.decompress((A/s['grid']).read_bytes()),dtype='uint8').reshape(s['height'],s['width']);west,south,east,north=s['bounds3857'];dx=(east-west)/s['width'];dy=(north-south)/s['height']
for c in s['classes']:
 components,n=label(grid==c['id']);counts=np.bincount(components.ravel());counts[0]=0;k=counts.argmax();rr,cc=np.where(components==k);i=np.argmin((rr-rr.mean())**2+(cc-cc.mean())**2);r,col=int(rr[i]),int(cc[i]);x=west+(col+.5)*dx;y=north-(r+.5)*dy;point=[math.degrees(x/6378137),math.degrees(2*math.atan(math.exp(y/6378137))-math.pi/2)]
 out['climate'].append({'id':'code-'+c['code'],'title':c['code'],'point':point,'color':'#385a54','sourceValue':c['id'],'sourcePixel':[col,r],'sourceGridSha256':hashlib.sha256((A/s['grid']).read_bytes()).hexdigest()})
for theme,targets in [('precipitation',[(1000,[142,44]),(1500,[139,36]),(2000,[136,37]),(2500,[132,33])]),('elevation',[(500,[141,40]),(1000,[138,37]),(2000,[137.7,36.3]),(3000,[138,35.7])])]:
 data=json.loads((A/m[theme]['contours']).read_text())
 for value,target in targets:
  f=next(x for x in data['features'] if x['properties']['value']==value);coords=f['geometry']['coordinates'];lines=[coords] if f['geometry']['type']=='LineString' else coords;points=[p for line in lines for p in line]
  if not points:continue
  p=min(points,key=lambda p:(p[0]-target[0])**2+(p[1]-target[1])**2)
  out[theme].append({'id':theme+'-label-'+str(value),'title':str(value)+(' mm/年' if theme=='precipitation' else ' m'),'point':p,'color':'#365b79' if theme=='precipitation' else '#6b4e32','sourceFeature':f['properties']['id'],'sourceContourSha256':hashlib.sha256((A/m[theme]['contours']).read_bytes()).hexdigest()})
out['method']='Codes anchor to an actual pixel of the largest connected displayed class. Numeric labels anchor to existing contour vertices. Positions may be displaced by at most 64 screen pixels with leader lines, not relocated geographic values.'
(A/'annotations.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n');print({k:len(v) for k,v in out.items() if isinstance(v,list)})
