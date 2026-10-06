"""Place climate codes strictly inside source polygons in the default south-focused extent."""
from pathlib import Path
import json
from shapely.geometry import shape,box,Point
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'public/assets/atlas/canada-climate-elevation-v1/koppen.geojson').read_text());labels=[]
for f in d['features']:
 g=shape(f['geometry']).intersection(box(-139,42,-53,69));parts=list(g.geoms) if hasattr(g,'geoms') else [g]
 for p in sorted(parts,key=lambda p:p.area,reverse=True)[:3]:
  if p.area<.25:continue
  pt=p.representative_point()
  if any(Point(l['coordinates']).distance(pt)<3.2 for l in labels):continue
  labels.append({'id':f['properties']['id'],'coordinates':[round(pt.x,5),round(pt.y,5)]})
(root/'src/data/atlas/canada/climate-labels.json').write_text(json.dumps(labels,indent=2)+'\n')
