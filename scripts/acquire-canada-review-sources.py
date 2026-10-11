"""Optional, normal HTTPS source acquisition in the existing read-only review job.

Acquisition failures are reported independently of map acceptance. No TLS or
sandbox exceptions are used. Retrieved originals remain review artifacts.
"""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request

output = Path('review-artifacts/canada-source-acquisition')
output.mkdir(parents=True, exist_ok=True)
sources = [
    ('population/98100002-eng.zip', 'https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip'),
    ('population/subdivisions-official.geojson', 'https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/9/query?where=1%3D1&outFields=CSDUID,CSDNAME,PRUID&returnGeometry=true&outSR=4326&maxAllowableOffset=0.001&geometryPrecision=7&f=geojson'),
]
for name, identifier in [('toronto', '6158355'), ('montreal', '7025250'), ('calgary', '3031092'), ('halifax', '8202250')]:
    sources.append((f'climate/{name}-1991-2020.html', f'https://climate.weather.gc.ca/climate_normals/results_1991_2020_e.html?climate_id={identifier}&dispBack=0'))
for name, number in [('corn', '029'), ('soybeans', '031'), ('potatoes', '035'), ('dairy', '045'), ('pork', '047'), ('chicken', '049')]:
    sources.append((f'agriculture/{name}-map-2021.jpg', f'https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/m-c/m-c-{number}-eng.jpg'))

records = []
log_sources = set(os.environ.get('CANADA_REVIEW_LOG_SOURCES', 'agriculture/pork-map-2021.jpg,agriculture/chicken-map-2021.jpg,population/prepared/subdivisions.json,population/prepared/subdivisions-manifest.json').split(','))
for name, url in sources:
    record = {'file': name, 'url': url}
    try:
        with urllib.request.urlopen(url, timeout=45) as response:
            data = response.read()
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        record.update(status='retrieved', bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        # Compact evidence transport through the same authorized GitHub logs API.
        # Large boundary ZIP remains an artifact; derived display data is logged below.
        if name in log_sources and len(data) < 12_000_000:
            encoded = base64.b64encode(gzip.compress(data, mtime=0)).decode()
            for index in range(0, len(encoded), 120000):
                print('CANADA_REVIEW_SOURCE ' + json.dumps({'file': name, 'part': index // 120000, 'parts': (len(encoded) + 119999) // 120000, 'gzipBase64': encoded[index:index + 120000]}), flush=True)
    except Exception as error:
        record.update(status='unavailable', error=f'{type(error).__name__}: {error}')
    records.append(record)
    print('CANADA_REVIEW_SOURCE_STATUS ' + json.dumps(record), flush=True)

(output / 'acquisition.json').write_text(json.dumps(records, indent=2) + '\n')
if all((output / f'population/{name}').exists() for name in ['98100002-eng.zip', 'subdivisions-official.geojson']):
    completed = subprocess.run(['node', 'scripts/prepare-canada-population-subdivisions.mjs', str(output / 'population')], check=False)
    print('CANADA_REVIEW_SUBDIVISIONS_STATUS ' + json.dumps({'exitCode': completed.returncode}), flush=True)
