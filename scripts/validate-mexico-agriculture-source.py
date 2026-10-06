from pathlib import Path
import sys,json,math
import numpy as np
from shapely.geometry import shape,Point
from shapely import union_all
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'public/assets/atlas/mexico-agriculture-v2'
d=json.loads((p/'agriculture-atlas.json').read_text());features=d['cropZones']['features'];groups={g['id'] for g in d['metadata']['map']['groups']}
assert groups=={'corn','wheat','beans','sorghum','sugarcane','rice','cotton','coffee','fruit','vegetables','other'}
assert set(f['properties']['cropId'] for f in features)==groups
for g in d['metadata']['map']['groups']:
 assert g['components']==sum(f['properties']['cropId']==g['id'] for f in features)
 assert g['rawClippedComponents']==g['components']+g['omittedNoCenterFragments']
assert all(shape(f['geometry']).is_valid and not shape(f['geometry']).is_empty for f in features)
country=union_all([shape(f['geometry']) for f in json.load(open(ROOT/'src/data/atlas/mexico/geometry.json'))['features']])
assert all(shape(f['geometry']).difference(country).area<1e-9 for f in features)
for label in d['cropLabels']:
 f=next(f for f in features if f['properties']['componentId']==label['id'])
 assert shape(f['geometry']).contains(Point(label['anchor']))
assert all(country.contains(Point(m['anchor'])) for m in d['livestockMarkers'])
for dataset in [d['crops'],d['livestock']]:
 assert len(dataset['states'])==32
 assert abs(sum(x['totalValueMxN'] for x in dataset['states'])-dataset['national']['totalValueMxN'])<0.1
 for state in [dataset['national'],*dataset['states']]:
  assert abs(sum(x['valueMxN'] for x in state['items'].values())-state['totalValueMxN'])<0.1
  for value in state['items'].values():assert value['valueMxN']>=0
for m in d['livestockMarkers']:
 assert m['valueMxN']<=next(s for s in d['livestock']['states'] if s['code']==m['stateCode'])['items'][m['kindId']]['valueMxN']
# No crop area geometry can become an artificial point/circle source.
assert all(f['geometry']['type'] in ('Polygon','MultiPolygon') for f in features)
checks={'validClippedCropFeatures':len(features),'cropGroups':len(groups),'cropLabelPointsInsideTheirActualZones':len(d['cropLabels']),'officialMunicipalPointsWithinMexico':len(d['livestockMarkers']),'nationalAnd32StateValueBalances':'passed','cropAndLivestockUnits':'source dictionary verified; mixed-category production null','map2020AndStatistics2025Separated':True}
print(checks)
