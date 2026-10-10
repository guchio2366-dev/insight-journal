"""Extract Japan census and Tokyo native-resolution assets from checked-in pinned inputs.

No downloads. No estimates are distributed across prefectures or meshes. Source
counts and the age-unknown category remain unchanged. Run from any directory.
"""
from pathlib import Path
import gzip, hashlib, json, shutil

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas'
OUT = ASSETS / 'japan-population-v2'
OUT.mkdir(parents=True, exist_ok=True)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')

social = json.loads(gzip.decompress((ASSETS / 'asia-social-v1/east-asia.json.gz').read_bytes()))
social_manifest = json.loads((ASSETS / 'asia-social-v1/manifest.json').read_text())
rows = sorted([r for r in social['records'] if r['country'] == 'JPN'], key=lambda r: r['id'])
def census_row(row, national=False):
    counts = row['counts']
    return {'id': 'JPN' if national else row['id'].removeprefix('s-'),
            'name': '全国' if national else row['name'],
            'population': row['total']['2020-census' if national else '2020'],
            'age': {'under15': counts['jp-age-young'], 'from15to64': counts['jp-age-working'],
                    'from65': counts['jp-age-old'], 'unknown': counts['ageUnknown']}}
records = [census_row(r) for r in rows]
national = census_row(social['national']['JPN'], True)
assert len(records) == 47
assert sum(r['population'] for r in records) == national['population'] == 126146099
for r in [national, *records]:
    assert sum(r['age'].values()) == r['population']
for key in national['age']:
    assert sum(r['age'][key] for r in records) == national['age'][key]
source = next(s for s in social_manifest['sources'] if s['id'] == 'japan')
write('prefectures-2020.json', {
    'schemaVersion': 1, 'year': 2020, 'referenceDate': '2020-10-01', 'unit': '人',
    'national': national, 'prefectures': records,
    'source': {'title': '令和2年国勢調査 人口等基本集計 表2-3（年齢不詳補完前）',
               'url': source['downloads'][0], 'licenseUrl': source['licenseUrl'],
               'retrievedAt': social_manifest['retrieved'],
               'originalWorkbookSha256': next(i['sha256'] for i in social_manifest['inputs'] if i['file'] == 'japan-age-2020.xlsx')},
    'method': 'Extracted only Japan population and age counts from the pinned checked-in Asia social dataset; no WDI total or nationality counts included. Source counts and age-unknown values are unchanged. Percentages, when shown, exclude age-unknown people and state the denominator.',
    'limitations': ['Prefecture totals do not locate residents inside a prefecture.', 'Age counts are 2020 census unadjusted observations, not present-day population or forecasts.', 'No prefecture population density is calculated from the display geometry.'],
})
population_manifest = json.loads((ASSETS / 'asia-population-v1/manifest.json').read_text())
tokyo = next(c for c in population_manifest['regions']['east-asia']['cities'] if c['id'] == 'uc-5929')
urban = json.loads((ASSETS / 'asia-population-v1/east-asia.urban.json').read_text())
japan_urban = [f for f in urban['features'] if f['properties']['country'] == 'JPN']
assert {f['id'] for f in japan_urban} == {'uc-5929', 'uc-4399', 'uc-5213'}
# Preserve source-defined 2025 footprints exactly; do not replace them with prefectures or simplified coast.
write('urban.geojson', {'type': 'FeatureCollection', 'features': japan_urban})
for name in [tokyo['detail']['image'], tokyo['detail']['grid']]:
    shutil.copyfile(ASSETS / 'asia-population-v1' / name, OUT / name)
write('tokyo-detail.json', {**tokyo['detail'], 'year': 2020, 'unit': '人/km²', 'noData': -1,
    'breaks': population_manifest['breaks'], 'colors': population_manifest['colors'],
    'method': 'Retains native 1 km equal-area GHS-POP source cells, nearest-neighbour reprojected to Web Mercator. Display spacing is not a new observation resolution. Unmodified checked-in Tokyo detail; includes zero-valued coastal/ocean source cells and source missing data.',
    'limitations': ['This is the Tokyo-area raster window, not national 1 km coverage.', 'Density includes water area in the original 1 km² cells.', 'Not a municipal census, building population or daytime population.']})
inputs = ['asia-social-v1/east-asia.json.gz', 'asia-social-v1/manifest.json', 'asia-population-v1/manifest.json', 'asia-population-v1/east-asia.urban.json', 'asia-population-v1/' + tokyo['detail']['image'], 'asia-population-v1/' + tokyo['detail']['grid']]
write('manifest.json', {
    'schemaVersion': 2, 'scope': 'Japan population supporting census tables and existing Tokyo 1 km source window',
    'nationalNative1kmAvailable': False, 'nationalDensitySourceCellKm': 5,
    'populationYear': 2020, 'urbanBoundaryYear': 2025,
    'inputs': [{'path': 'public/assets/atlas/' + name, 'sha256': sha(ASSETS / name)} for name in inputs],
    'sources': [source, {key: population_manifest[key] for key in ['populationCitation', 'populationDoi', 'methodCitation', 'license', 'licenseUrl']}],
    'census': 'prefectures-2020.json', 'tokyoDetail': 'tokyo-detail.json', 'urban': 'urban.geojson',
    'urbanMethod': 'Three existing GHSL R2024A V1.2 Japanese urban-centre footprints, fixed 2025 boundary year; geometry and IDs unmodified. Never administrative municipality or commuting-area boundaries.',
    'files': {name: {'bytes': (OUT / name).stat().st_size, 'sha256': sha(OUT / name)} for name in ['prefectures-2020.json', 'tokyo-detail.json', 'urban.geojson', tokyo['detail']['image'], tokyo['detail']['grid']]},
    'limitations': ['National native 1 km source is not available in this checkout; the existing national 5 km aggregation is not relabelled.', 'No ethnicity, religion, population change or forecast layer is included.'],
})
print('Japan census: 47 prefectures; 126146099 people; exact age-category totals; Tokyo-only 1 km source retained')
