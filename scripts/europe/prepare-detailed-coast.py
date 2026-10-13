"""Clip the official Natural Earth 1:10m geometry; no smoothing or fabricated vertices.

Usage: PYTHONPATH=<shapely directory> python scripts/europe/prepare-detailed-coast.py <official GeoJSON>
"""
import gzip,hashlib,json,sys
from pathlib import Path
from shapely.geometry import shape,mapping,box
ROOT=Path(__file__).resolve().parents[2]
source=Path(sys.argv[1]);raw=source.read_bytes();world=json.loads(raw)
target=ROOT/'src/data/atlas/europe-countries.json'
old=json.loads((ROOT/'data-source/atlas/europe/legacy-country-mask-110m-v1.json').read_text())
lookup={f['properties']['ADM0_A3']:f for f in world['features']}
clip=box(-25,32,65,73)
def count(value):
    if isinstance(value,(list,tuple)) and value and isinstance(value[0],(int,float)):return 1
    return sum(count(v) for v in value) if isinstance(value,(list,tuple)) else 0
old_vertices=sum(count(f['geometry']['coordinates']) for f in old['features'])
features=[]
for previous in old['features']:
    code=previous['properties']['code'];original=lookup[code]
    geometry=shape(original['geometry']).intersection(clip)
    if geometry.is_empty:continue
    assert geometry.geom_type in ('Polygon','MultiPolygon'),(code,geometry.geom_type)
    features.append({'type':'Feature','properties':previous['properties'],'geometry':mapping(geometry)})
result={'type':'FeatureCollection','features':features}
target.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
manifest={'source':'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/','download':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_10m_admin_0_countries.geojson','licence':'public domain','terms':'https://www.naturalearthdata.com/about/terms-of-use/','officialRepositoryCommit':'9380cca83db5f9aef52d5e762765100745f84b27','sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceBytes':len(raw),'bounds':[-25,32,65,73],'processing':'Intersect original 1:10m polygons with display window; retain existing country identifiers and names. No smoothing, densification or invented coast detail. Natural Earth de facto boundaries are generalized cartography, not surveyed boundaries.','oldVertices':old_vertices,'vertices':sum(count(f['geometry']['coordinates']) for f in features),'features':len(features),'missingOriginalCountries':[f['properties']['code'] for f in old['features'] if f['properties']['code'] not in [g['properties']['code'] for g in features]]}
(ROOT/'data-source/atlas/europe/detailed-coast-2026-10-12.json').write_text(json.dumps(manifest,indent=2)+'\n')
asset=ROOT/'public/assets/atlas/europe/geography-v2';asset.mkdir(exist_ok=True)
geometry_bytes=target.read_bytes();packed=gzip.compress(geometry_bytes,mtime=0)
(asset/'countries-10m.geojson.gz').write_bytes(packed)
(asset/'manifest.json').write_text(json.dumps(dict(manifest,geometrySha256=hashlib.sha256(geometry_bytes).hexdigest(),gzipSha256=hashlib.sha256(packed).hexdigest(),gzipBytes=len(packed)),indent=2)+'\n')
print(json.dumps(manifest))
