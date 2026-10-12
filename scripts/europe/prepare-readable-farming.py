"""Conservative overview: omit small display fragments, retain the full source areas.

No buffers, bridges, or fabricated production-area expansion are applied.
Labels use source grid centres inside the retained polygons.
"""
import gzip,hashlib,json,math
from pathlib import Path
import numpy as np
from shapely.geometry import shape,mapping,MultiPolygon
from shapely import contains_xy,union_all
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'src/data/atlas/europe';ASSET=ROOT/'public/assets/atlas/europe'
lon=-25+(np.arange(1080)+.5)/12;lat=73-(np.arange(492)+.5)/12
xx,yy=np.meshgrid(lon,lat)
windows={'wheat':(23,44,39,51),'maize':(19,43,29,48),'potato':(14,49,25,55),'sugarbeet':(0,46,10,52)}
countryBytes=(ROOT/'src/data/atlas/europe-countries.json').read_bytes()
land=union_all([shape(f['geometry']) for f in json.loads(countryBytes)['features'] if f['properties']['kind']=='europe'])
def parts(g):
 if g.geom_type=='Polygon':return [g]
 return [p for c in getattr(g,'geoms',[]) for p in parts(c)]
records=[]
full=json.loads((DATA/'farming-areas.json').read_text())
for f in full['features']:f['geometry']=mapping(MultiPolygon(parts(shape(f['geometry']).intersection(land))))
(DATA/'farming-full-display.json').write_text(json.dumps(full,ensure_ascii=False,separators=(',',':'))+'\n')
for stem in ('dominant','secondary'):
 original=json.loads((DATA/f'farming-{stem}-areas.json').read_text());out=[]
 for feature in original['features']:
  g=shape(feature['geometry']);originalParts=parts(g);displayParts=parts(g.intersection(land))
  # Approximate screen-scale area test, not a production-area statistic.
  area=lambda p:p.area*111.195**2*math.cos(math.radians(p.centroid.y))
  kept=[p for p in displayParts if area(p)>=4000]
  if not kept:kept=[max(displayParts,key=area)]
  geometry=MultiPolygon(kept)
  props=dict(feature['properties']);identifier=props['id']
  gridpath=ASSET/('wheat-v1/values.bin.gz' if identifier=='wheat' else f'farming-v1/{identifier}.bin.gz')
  raw=gridpath.read_bytes();grid=np.frombuffer(gzip.decompress(raw),dtype='<f4').reshape(492,1080)
  valid=(grid>0)&contains_xy(geometry,xx,yy)
  # For the requested eastern cereal anchors, choose a genuinely supported
  # concentration within that region. This is not a rank of all Europe.
  region=windows.get(identifier)
  mask=valid.copy()
  if region:
   west,south,east,north=region;regional=valid&(xx>=west)&(xx<=east)&(yy>=south)&(yy<=north)
   if regional.any():mask=regional
  assert mask.any(),identifier
  # A 7x7 local sum favours a sustained concentration over one isolated peak.
  score=np.zeros(grid.shape)
  supported=np.where(valid,grid,0)
  for dr in range(-3,4):
   for dc in range(-3,4):
    r0=max(0,dr);r1=min(492,492+dr);c0=max(0,dc);c1=min(1080,1080+dc)
    score[r0:r1,c0:c1]+=supported[r0-dr:r1-dr,c0-dc:c1-dc]
  index=np.argmax(np.where(mask,score,-1));row,col=np.unravel_index(index,grid.shape)
  props['labelCoordinate']=[round(float(lon[col]),6),round(float(lat[row]),6)]
  out.append({'type':'Feature','properties':props,'geometry':mapping(geometry)})
  records.append({'kind':stem,'id':identifier,'inputComponents':len(originalParts),'overviewComponents':len(kept),'sourceGridSha256':hashlib.sha256(raw).hexdigest(),'sourceAnchor':props['labelCoordinate'],'anchorCellValue':float(grid[row,col]),'regionalAnchorWindow':region,'anchorRule':'maximum 7x7 sum of positive source values in retained display polygons; regional window only where specified; not a Europe-wide product ranking','retainedGridCells':int(valid.sum())})
 (DATA/f'farming-{stem}-overview.json').write_text(json.dumps({'type':'FeatureCollection','features':out},ensure_ascii=False,separators=(',',':'))+'\n')
manifest={'detailedCoastSha256':hashlib.sha256(countryBytes).hexdigest(),'method':'Select existing source-backed display components at least approximately 4000 km² (retain largest if none pass). Clip original geometry to the detailed 1:10m European land mask; no smoothing, enlargement or bridging. This is an overview omission rule, not production extent. All original 16 products, numeric grids, full overlapping concentration polygons and selected outlines remain.','records':records}
folder=ASSET/'farming-overview-v3';folder.mkdir(exist_ok=True)
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print([(x['id'],x['inputComponents'],x['overviewComponents'],x['sourceAnchor']) for x in records if x['kind']=='dominant'])
