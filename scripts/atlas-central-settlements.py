"""Clip existing GeoEPR/EPR-ED presentation features to the five Central countries."""
from pathlib import Path
import gzip
import json
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas'
CODES = {'KAZ', 'KGZ', 'TJK', 'TKM', 'UZB'}
GEOGRAPHY = json.loads((ASSETS / 'asia-population-v1/south-central-asia.geography.json').read_text())
FOCUS = unary_union([shape(f['geometry']) for f in GEOGRAPHY['features'] if f['properties'].get('target') and f['properties'].get('code') in CODES])

for topic in ('ethnicity', 'religion'):
    path = ASSETS / f'asia-settlements-v1/south-central-asia.{topic}.json.gz'
    data = json.loads(gzip.decompress(path.read_bytes()))
    features = []
    for feature in data['features']:
        geometry = shape(feature['geometry']).intersection(FOCUS)
        if not geometry.is_empty:
            features.append({**feature, 'geometry': mapping(geometry)})
    output = ASSETS / f'asia-settlements-v1/central-asia.{topic}.json.gz'
    output.write_bytes(gzip.compress((json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':')) + '\n').encode(), mtime=0))
    print(output.relative_to(ROOT), len(features), output.stat().st_size)
