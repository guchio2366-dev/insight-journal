"""Reclassify retained display densities only; never derive person counts from them."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
base=Path(__file__).resolve().parents[1]/'public/assets/atlas'
source=base/'latin-america-population-v1/latin-america.grid.json';g=json.loads(source.read_text())
a=np.array(g['values']).reshape(g['height'],g['width'])
breaks=[0,1,10,100,1000]; colors=['#fff7ec','#fee8c8','#fdbb84','#e34a33','#990000']
rgba=np.zeros((*a.shape,4),dtype='uint8')
for lo,hi,color in zip(breaks,breaks[1:]+[float('inf')],colors): rgba[(a>=lo)&(a<hi)]=list(bytes.fromhex(color[1:]))+[255]
dest=base/'latin-reading-density-v1';dest.mkdir(exist_ok=True)
Image.fromarray(rgba).save(dest/'density.png',optimize=True)
(dest/'manifest.json').write_text(json.dumps({'source':'../latin-america-population-v1/latin-america.grid.json','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'year':2020,'unit':'人/km²','size':[g['width'],g['height']],'breaks':breaks,'colors':colors,'method':'保存済み表示格子値を5段階へ再分類。値の変更、人数への変換、格子の集計、補間は行わない。0は有効な0、元noDataは透明。'},ensure_ascii=False)+'\n')
print('Reclassified retained density values; no counts derived')
