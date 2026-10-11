"""Extract pinned Natural Earth geometry; never draw guessed geographic extents.
Usage: python3 scripts/east-asia/prepare-nature-foundations.py RIVERS.json LANDFORMS.json
Inputs: official v5.1.2 geojson/ne_50m_rivers_lake_centerlines.geojson and
geojson/ne_10m_geography_regions_polys.geojson in nvkelso/natural-earth-vector.
"""
import hashlib,json,sys
from pathlib import Path
river_path,landform_path=map(Path,sys.argv[1:])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(river_path)=='f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51'
raw=json.loads(river_path.read_text())
sections=[(i,f) for i,f in enumerate(raw['features']) if f['properties']['name']=='Huang']
assert [i for i,f in sections]==[28,212,213]
lines=[line for i,f in sections for line in (f['geometry']['coordinates'] if f['geometry']['type']=='MultiLineString' else [f['geometry']['coordinates']])]
points=[p for line in lines for p in line]
bounds=[min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)]
water_path=Path('public/assets/atlas/asia-physical-v1/east-asia.water.json')
water=json.loads(water_path.read_text())
river=next(f for f in water['features'] if f['properties']['id']=='rivers-213')
river['geometry']={'type':'MultiLineString','coordinates':lines}
river['properties'].update(sourceIds=[i for i,f in sections],bounds=bounds,sourceEnglishName='Yellow / Huang',sourceName='Huang',name='黄河',label='黄河')
water['features']=[f for f in water['features'] if f['properties']['id'] not in ['rivers-28','rivers-212']]
water_path.write_text(json.dumps(water,ensure_ascii=False,separators=(',',':'))+'\n')
manifest_path=Path('public/assets/atlas/asia-physical-v1/manifest.json')
manifest=json.loads(manifest_path.read_text())
record=next(r for r in manifest['regions']['east-asia']['waterFeatures'] if r['id']=='rivers-213');record.update(river['properties'])
manifest['regions']['east-asia']['waterFeatures']=[r for r in manifest['regions']['east-asia']['waterFeatures'] if r['id'] not in ['rivers-28','rivers-212']]
manifest['files']['east-asia.water.json']={'bytes':len(water_path.read_bytes()),'sha256':sha(water_path)}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
presentation_path=Path('public/assets/atlas/asia-presentation-v1/manifest.json')
presentation=json.loads(presentation_path.read_text())
input_key=str(manifest_path)
previous=presentation['inputs'][input_key]
presentation['inputs'][input_key]=sha(manifest_path)
presentation.setdefault('inputRevisions',{})[input_key]={'previousSha256':'d80bd2e370cb9271a968d49113ebe46d66fbd91f34d04758d578d2b7a8f94fa0','currentSha256':sha(manifest_path),'reason':'Supplemented East Asia Yellow River with original Natural Earth sections 28,212,213. Existing elevation, crop, rainfall and climate source arrays unchanged. River labels use the current river geometry dynamically.'}
presentation_path.write_text(json.dumps(presentation,ensure_ascii=False,separators=(',',':'))+'\n')
selected={'PLATEAU OF TIBET':'tibetan-plateau','SICHUAN BASIN':'sichuan-basin','NORTH CHINA PLAIN':'north-china-plain','TARIM BASIN':'tarim-basin','MONGOLIAN PLATEAU':'mongolian-plateau','MANCHURIAN PLAIN':'manchurian-plain','TIAN SHAN':'east-tian-shan','KUNLUN MOUNTAINS':'east-kunlun','GOBI DESERT':'east-gobi'}
features=[]
for f in json.loads(landform_path.read_text())['features']:
 p=f['properties']
 if p['NAME'] in selected:features.append({'type':'Feature','properties':{'id':selected[p['NAME']],'name':p['NAME_JA'],'sourceId':p['NE_ID'],'sourceName':p['NAME'],'kind':p['FEATURECLA']},'geometry':f['geometry']})
assert len(features)==len(selected)
output={'type':'FeatureCollection','features':features,'source':{'url':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson','sha256':sha(landform_path),'edition':'Natural Earth v5.1.2, 1:10 million','license':'Public domain','method':'Original named geographical regions, unmodified geometry; approximate geographic extents, not drainage basins or administrative boundaries. No national statistic is allocated to these polygons.'}}
Path('public/assets/atlas/east-asia-v1/landforms.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
print('Yellow River: 3 original named sections; landforms:',len(features))
