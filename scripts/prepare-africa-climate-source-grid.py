"""Retain the exact Beck source window, independently of display land masks."""
from pathlib import Path
import json,gzip,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif'
manifest=json.loads((ROOT/'public/assets/atlas/africa-physical-v1/manifest.json').read_text())['layers']['climate']
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(source.read_bytes())==manifest['sourceSha256']
# Publisher global origin -180,90 and exact 0.1-degree cells. No interpolation.
values=np.asarray(Image.open(source))[510:1260,1530:2440].astype('uint8')
assert values.shape==(750,910)
out=ROOT/'data-source/atlas/africa/climate-normals/original-classification.values.gz';out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(gzip.compress(values.tobytes(),mtime=0))
record={'source':str(source.relative_to(ROOT)),'sourceSha256':sha(source.read_bytes()),'grid':str(out.relative_to(ROOT)),'gridSha256':sha(out.read_bytes()),'width':910,'height':750,'bounds':[-27,-36,64,39],'resolutionDegrees':.1,'sourceWindow':[1530,510,2440,1260],'method':'Exact source-category window without Africa land mask. Zero remains publisher ocean/noData. Used only to sample original categories at coastal station coordinates; displayed map and existing classifications are unchanged.'}
(out.parent/'original-classification.json').write_text(json.dumps(record,indent=2)+'\n')
p=ROOT/'src/data/atlas/africa-climate-cities.ts';s=p.read_text().replace('"grid": "data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif"',f'"grid": "{record["grid"]}"').replace(f'"gridSha256": "{manifest["sourceSha256"]}"',f'"gridSha256": "{record["gridSha256"]}"')
for row,col in [(1081,2294),(1056,2263)]:s=s.replace(f'"row": {row},',f'"row": {row-510},').replace(f'"column": {col},',f'"column": {col-1530},')
s=s.replace('"gridWidth": 3600','"gridWidth": 910');p.write_text(s)
# Reconcile retained source record with the adopted category-window metadata.
p=out.parent/'additional-stations.json';d=json.loads(p.read_text())
for city in d['stations']:
 if city['classification']['maskedMapMissing']:
  c=city['classification']
  if c.get('gridWidth') == 3600:
   c.update(row=c['row']-510,column=c['column']-1530)
  c.update(grid=record['grid'],gridSha256=record['gridSha256'],gridWidth=910)
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(record['gridSha256'])
