"""Finalize source metadata and public file hashes after geometry and fallbacks."""
from pathlib import Path
import hashlib
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/nature-v1'
manifest=json.loads((OUT/'manifest.json').read_text())
cities=json.loads((OUT/'climate-cities.json').read_text())
for city in cities:
    if city.get('koppenCode') is None:
        city['koppenNote']='観測所が位置する沿岸の格子は採用気候図で未収録。近隣格子による補完はしていない。NOAA雨温図は12か月収録。'
(OUT/'climate-cities.json').write_text(json.dumps(cities,ensure_ascii=False,separators=(',',':')))
manifest['files']={str(path.relative_to(OUT)):{'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for path in sorted(OUT.rglob('*')) if path.is_file() and path.name!='manifest.json'}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
print(f"{len(manifest['files'])} assets; {sum(item['bytes'] for item in manifest['files'].values())/1e6:.2f} MB")
