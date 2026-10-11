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
import urllib.parse

output = Path('review-artifacts/canada-source-acquisition')
output.mkdir(parents=True, exist_ok=True)
sources = [
    ('population/98100002-eng.zip', 'https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip'),
    ('nature/st-lawrence-feature.json', 'https://geogratis.gc.ca/services/geoname/en/features/4d00fe4cba2011d892e2080020a0f4c9.json'),
    ('nature/st-lawrence-expanded.geojson', 'https://geogratis.gc.ca/services/geoname/en/geonames/EFGFK.geojson?expand=feature'),
]
for name, identifier in [('toronto', '6158355'), ('montreal', '7025250'), ('calgary', '3031092'), ('halifax', '8202250')]:
    sources.append((f'climate/{name}-1991-2020.html', f'https://climate.weather.gc.ca/climate_normals/results_1991_2020_e.html?climate_id={identifier}&dispBack=0'))
for name, number in [('corn', '029'), ('soybeans', '031'), ('potatoes', '035'), ('dairy', '045'), ('pork', '047'), ('chicken', '049')]:
    sources.append((f'agriculture/{name}-map-2021.jpg', f'https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/m-c/m-c-{number}-eng.jpg'))

records = []
log_sources = set(os.environ.get('CANADA_REVIEW_LOG_SOURCES', 'nature/st-lawrence-feature.json,nature/st-lawrence-expanded.geojson,population/subdivisions-official.json,population/prepared/subdivisions.json,population/prepared/subdivisions-manifest.json').split(','))
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
# Paginated requests avoid the single all-Canada query's HTTP 500 response.
# Service-side 100 m boundary generalization; original CSD table values are joined.
service = 'https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/9/query'
pages = []
for offset in range(0, 5161, 250):
    parameters = {'where':'1=1','outFields':'CSDUID,CSDNAME,PRUID','returnGeometry':'true','outSR':'3347','maxAllowableOffset':'100','geometryPrecision':'3','f':'json','orderByFields':'OBJECTID','resultOffset':str(offset),'resultRecordCount':'250'}
    url = service + '?' + urllib.parse.urlencode(parameters)
    try:
        with urllib.request.urlopen(url, timeout=45) as response: data=response.read()
        parsed=json.loads(data)
        if parsed.get('error') or not parsed.get('features'): raise ValueError(str(parsed.get('error','Empty source page')))
        target=output / f'population/csd-page-{offset:04}.json';target.write_bytes(data)
        record={'file':str(target.relative_to(output)),'url':url,'status':'retrieved','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'features':len(parsed['features'])}
        pages.append(parsed)
    except Exception as error:
        record={'url':url,'status':'unavailable','error':f'{type(error).__name__}: {error}'}
    records.append(record);print('CANADA_REVIEW_SOURCE_STATUS '+json.dumps(record),flush=True)
    if record['status']!='retrieved': break
(output / 'acquisition.json').write_text(json.dumps(records, indent=2) + '\n')
if sum(len(p['features']) for p in pages)==5161:
    target=output / 'population/subdivisions-official.json'
    target.write_text(json.dumps({'spatialReference':{'wkid':3347},'features':[f for p in pages for f in p['features']]},separators=(',',':'))+'\n')
    data=target.read_bytes();encoded=base64.b64encode(gzip.compress(data,mtime=0)).decode()
    print('CANADA_REVIEW_SOURCE_STATUS '+json.dumps({'file':'population/subdivisions-official.json','status':'retrieved','bytes':len(data),'gzipBase64Bytes':len(encoded),'sha256':hashlib.sha256(data).hexdigest()}),flush=True)
    for index in range(0,len(encoded),120000):
        print('CANADA_REVIEW_SOURCE '+json.dumps({'file':'population/subdivisions-official.json','part':index//120000,'parts':(len(encoded)+119999)//120000,'gzipBase64':encoded[index:index+120000]}),flush=True)
    completed=subprocess.run(['node','scripts/prepare-canada-population-subdivisions.mjs',str(output / 'population')],check=False)
    print('CANADA_REVIEW_SUBDIVISIONS_STATUS '+json.dumps({'exitCode':completed.returncode}),flush=True)
