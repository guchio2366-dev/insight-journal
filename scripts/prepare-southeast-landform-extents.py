#!/usr/bin/env python3
"""Extract named Natural Earth landforms; never infer names from DEM thresholds."""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

ROOT=Path(__file__).resolve().parents[1]
URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson'
SHA256='b7b26e50ea917d3696aec87f932def2bf5f890f5770e441d59c162c6f4c92a77'
NAMES={
 'mekong-delta':'Mekong Delta',
 'irrawaddy-delta':'Irrawaddy Delta',
 'khorat-plateau':'Khorat Plat.',
 'sumatra-mountains':'Barisan Mountains',
 'java-island':'JAVA',
 'borneo-interior':'BORNEO',
 'luzon-island':'LUZON',
}
source=urlopen(URL,timeout=30).read()
assert hashlib.sha256(source).hexdigest()==SHA256,'Unexpected Natural Earth release'
features=json.loads(source)['features']
output=[]
for ident,name in NAMES.items():
 matches=[f for f in features if f['properties']['NAME']==name]
 assert len(matches)==1,(ident,len(matches))
 geometry=matches[0]['geometry']
 polygons=[geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
 lines=[]
 for polygon in polygons:
  for ring in polygon:
   lines.append([[round(lon,4),round(lat,4)] for lon,lat in ring])
 output.append({'id':ident,'sourceName':name,'lines':lines})
result={'source':'Natural Earth v5.1.2, 1:10m geography_regions_polys','url':URL,'sha256':SHA256,'method':'Exact named polygons from Natural Earth. Names, islands and regional boundaries are generalized cartographic features, not survey or administrative limits. Borneo outline is the whole island; the inland point is a reading anchor, not its own polygon.','features':output}
path=ROOT/'src/data/atlas/asia/southeast-landform-extents.json'
path.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print(path,len(path.read_bytes()),[(f['id'],len(f['lines'])) for f in output])
