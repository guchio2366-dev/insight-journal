"""Recolor existing classified pixels to the US key; split 1500+ using the archived grid table.
No spatial interpolation of rain values. Original alpha/land coverage is retained.
"""
from pathlib import Path
import csv,gzip,json,re,hashlib
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
root=Path(__file__).resolve().parents[1];a=root/'public/assets/atlas/canada-water-v1';cfg=root/'src/data/atlas/canada/water-resources.json'
s=(root/'src/data/atlas/water-resources.ts').read_text().split('export const riverBasins')[0]
colors=re.findall(r"color:'(#[0-9a-f]+)'",s);assert len(colors)==7
names=re.findall(r"title:'([^']+)'",s);assert len(names)==7
old=json.loads((a/'precipitation-render-summary.json').read_text())['classColors']
im=np.array(Image.open(a/'annual-precipitation-1991-2020-locator.png').convert('RGBA'));idx=np.full(im.shape[:2],-1,dtype=np.int8)
rgb=lambda c:tuple(bytes.fromhex(c[1:]))
for i,c in enumerate(old):idx[np.all(im[:,:,:3]==rgb(c),axis=2)&(im[:,:,3]>0)]=i
with gzip.open(a/'annual-valid-grid-points.csv.gz','rt')as f:rows=list(csv.DictReader(f))
coords=np.array([[float(r['longitude']),float(r['latitude'])] for r in rows]);vals=np.array([float(r['annual_precipitation_mm'])for r in rows])
# Nearest source cell only decides the new high-rainfall split. Existing classes and mask are exact.
y,x=np.nonzero(idx==5);targets=np.column_stack([-145+(x+.5)/im.shape[1]*95,85-(y+.5)/im.shape[0]*45]);dist,near=cKDTree(coords*np.array([.65,1])).query(targets*np.array([.65,1]));idx[y[vals[near]>=2000],x[vals[near]>=2000]]=6
outputs=[]
for i in [None,*range(7)]:
 arr=np.zeros_like(im);mask=idx>=0 if i is None else idx==i
 for c in range(7):arr[idx==c]=[*rgb(colors[c]),255]
 arr[~mask]=0
 name=f'annual-precipitation-us-{i if i is not None else "all"}.png';Image.fromarray(arr).save(a/name,optimize=True);outputs.append({'file':name,'sha256':hashlib.sha256((a/name).read_bytes()).hexdigest()})
d=json.loads(cfg.read_text());p=d['datasets']['precipitation'];p['groups']=[{'id':f'p{i}','name':names[i],'color':colors[i],'sourceName':names[i],'sourceCellCount':int(((vals>=[0,250,500,750,1000,1500,2000][i])&(vals<([250,500,750,1000,1500,2000,float('inf')][i]))).sum()),'description':'1991–2020年の年降水量。雨・雪の水当量。年合計だけで栽培可能性は決まりません。'} for i in range(7)];p['imageUrl']='/assets/atlas/canada-water-v1/annual-precipitation-us-all.png';p['images']=[{'id':f'p{i}','url':f'/assets/atlas/canada-water-v1/annual-precipitation-us-{i}.png'}for i in range(7)];p['method']=p['method'].split('米国と同じ')[0]+'米国と同じ7階級・配色。既存の5階級と陸域マスクは保持し、1500mm以上の領域だけを、保管済み格子値（0.1mm丸め）の最近傍セルで2000mm未満／以上に分けています。';p['sources']=[s for s in p['sources'] if s['url'].startswith('https://')];p['processingManifestUrl']='/insight-journal/assets/atlas/canada-water-v1/shared-palette-manifest.json';cfg.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(a/'shared-palette-manifest.json').write_text(json.dumps({'sourcePixelSha256':hashlib.sha256((a/'annual-precipitation-1991-2020-locator.png').read_bytes()).hexdigest(),'sourcePointSha256':hashlib.sha256((a/'annual-valid-grid-points.csv.gz').read_bytes()).hexdigest(),'paletteReference':'src/data/atlas/water-resources.ts','method':p['method'],'originalAlphaPreserved':bool(np.array_equal(im[:,:,3],np.where(idx>=0,255,0))),'highRainNearestCellMaximumDistanceDegrees':float(dist.max()),'outputs':outputs},ensure_ascii=False,indent=2)+'\n');print('palette',colors,'high rain pixels',len(x),'2000+ pixels',int((idx==6).sum()))
