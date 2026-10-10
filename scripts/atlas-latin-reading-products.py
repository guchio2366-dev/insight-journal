"""Reading overview: derive visible category colors and click indices from retained grids.

Source values are unchanged. One dominant display category per cell, no fine stripes.
Scores only decide which category to paint, and are never quantities or area shares.
"""
from pathlib import Path
import json, hashlib, math
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/assets/atlas'
DEST=BASE/'latin-reading-products-v1'
DEST.mkdir(exist_ok=True)
IDS=['soyb','maiz','sugc','whea','rice','coff','cott','bana','temf','pota','cattle']
products=json.loads((ROOT/'src/data/atlas/latin-america-products.json').read_text())
old=json.loads((BASE/'latin-america-overview-v1/manifest.json').read_text())
W,H=1200,1942
merc=lambda l:math.log(math.tan(math.pi/4+math.radians(l)/2))
lat=np.degrees(2*np.arctan(np.exp(merc(28)-(np.arange(H)+.5)/H*(merc(28)-merc(-56))))-math.pi/2)
rr=np.clip(np.floor((28-lat)*12).astype(int),0,1007)
cc=np.clip(np.floor((np.arange(W)+.5)/W*720).astype(int),0,719)
scores=[]; inputs=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for pid in IDS:
 p=next(p for p in products if p['id']==pid)
 directory='latin-america-agriculture-v1' if p['kind']=='crop' else 'latin-america-livestock-v1'
 manifest=json.loads((BASE/directory/'manifest.json').read_text())
 layer=next(l for l in manifest['layers'] if l['id']==pid)
 path=BASE/directory/layer['query']; grid=json.loads(path.read_text())
 assert grid['width']==720 and grid['height']==1008 and grid['bounds']==[-93,-56,-33,28]
 a=np.zeros(720*1008,dtype='float32'); cells=np.array(grid['positiveCells'])
 a[cells[:,0].astype(int)]=cells[:,1]; a=a.reshape(1008,720)
 visible=a>=1; p90=float(np.quantile(a[visible],.90))
 scores.append(np.where(visible,a/math.sqrt(p90),0))
 inputs.append({'id':pid,'path':str(path.relative_to(ROOT)),'sha256':sha(path),'units':grid['units'],'threshold':1,'p90':p90,'shownCells':int(visible.sum())})
stack=np.stack(scores); best=stack.argmax(axis=0)+1; best[stack.max(axis=0)==0]=0
index=best[np.ix_(rr,cc)].astype('uint8')
palette=np.array([[0,0,0,0]]+[list(bytes.fromhex(next(p for p in products if p['id']==pid)['color'][1:]))+[205] for pid in IDS],dtype='uint8')
Image.fromarray(palette[index]).save(DEST/'distribution.png',optimize=True)
# Lossless category index; read it in a local same-origin canvas for pointer hit testing.
Image.fromarray(index).save(DEST/'hit-index.png',optimize=True)
result={'ids':IDS,'bounds':old['bounds'],'size':[W,H],'year':2020,'inputs':inputs,'labels':[p for p in old['labels'] if p['id'] in IDS],
 'method':'保存済み2020年格子の1ha/格子・1頭/km²以上を対象に、値÷各品目正値第90百分位の平方根の最大品目を各セルに単色表示。縞・色混合・値の補間なし。スコアは表示の採否だけで、数量や面積比率ではない。選択時は既存の全有効分布輪郭を重ね、他品目の単色分布も残す。無着色は0・下限未満・欠測・対象外を含む。',
 'selection':{'basis':'既存12候補の2020年収穫面積順位。全農産物順位ではない。','regionalException':'11位ジャガイモをアンデス高地の食料農業として採用。8位カカオは熱帯作物の重複を減らすため初期図から外し、元格子・基礎資料は保持。','omitted':['coco','rcof','pigs','chickens'],'livestock':'牛だけを草地・食肉・乳の地域例として採用。作物面積とは単位が違うため順位に混ぜない。'},
 'licenses':old['licenses'], 'outputs':[{'file':f,'sha256':sha(DEST/f)} for f in ['distribution.png','hit-index.png']]}
(DEST/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print('Generated reading map:',IDS)
