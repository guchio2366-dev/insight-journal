"""Reuse retained FAOSTAT rows offline; fail on differing releases or decimals.

No network, spatial input, country sums or substitute years are used.
"""
from pathlib import Path
from decimal import Decimal
import csv, hashlib, json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/atlas'
LEDGER = ROOT / 'data-source/atlas/shared-statistics'
QCL = 'c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853'
FO = 'c2f7fc99651f620b6c0a16ff07f6c1d80c153fa01d5a3422413d9c89e0d61444'
inputs = []
world = {}

def load(path, expected=None):
    p = ROOT / path
    digest = hashlib.sha256(p.read_bytes()).hexdigest()
    if expected and digest != expected:
        raise ValueError('Retained input changed: ' + path)
    inputs.append({'path': path, 'sha256': digest})
    return json.loads(p.read_text()) if p.suffix == '.json' else list(csv.DictReader(p.open()))

def add(domain, item, element, year, raw, unit, flag, note, path, archive):
    if not 2015 <= int(year) <= 2024:
        return
    key = f'{domain}:{item}:{element}:{year}:{unit}'
    observation = {'rawValue': raw, 'unit': unit, 'flag': flag, 'note': note or None,
                   'archiveSha256': archive, 'retainedSources': [path]}
    if raw.strip():
        if not Decimal(raw).is_finite() or Decimal(raw) < 0:
            raise ValueError('Invalid unsigned observation ' + key)
    if key in world:
        previous = world[key]
        if ((Decimal(previous['rawValue']) if previous['rawValue'].strip() else None) != (Decimal(raw) if raw.strip() else None) or previous['flag'] != flag
                or previous['archiveSha256'] != archive or previous['note'] != observation['note']):
            raise ValueError('Conflicting source observation ' + key)
        previous['retainedSources'].append(path)
    else:
        world[key] = observation

path = 'public/assets/atlas/europe/farming-statistics-v1/statistics.json'
eu_source = load('data-source/atlas/europe/farming-statistics/provenance.json')
eu = load(path, eu_source['files']['statistics.json']['sha256'])
metrics = {m['id']: m for m in eu['measures']}
sources = {s['id']: s for s in eu['sources']}
assert sources['QCL']['archive']['sha256'] == QCL
assert sources['FO']['archive']['sha256'] == FO
for metric, year, raw, unit, flag, *note in eu['world']['observations']:
    m = metrics[metric]
    assert unit == m['unit']
    add(m['domain'], m['itemCode'], m['elementCode'], year, raw, unit, flag,
        note[0] if note else None, path, sources[m['domain']]['archive']['sha256'])

path = 'data-source/atlas/livestock/faostat-qcl-2024-extract.json'
source = load('data-source/atlas/livestock/faostat-source.json')
assert source['sha256'] == QCL
livestock_rows = load(path, source['extractSha256'])
for r in livestock_rows:
    if r['Area Code'] == '5000':
        assert r['Area'] == 'World'
        add('QCL', r['Item Code'], r['Element Code'], r['Year'], r['Value'], r['Unit'],
            r['Flag'], r.get('Note'), path, QCL)
path = 'data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv'
source = load('data-source/atlas/latin-agriculture/provenance.json')['originalSources']['qcl']
assert source['zipSha256'] == QCL
for r in load(path, source['selectedSha256']):
    if r['Area Code'] == '5000':
        assert r['Area'] == 'World'
        add('QCL', r['Item Code'], r['Element Code'], r['Year'], r['Value'], r['Unit'],
            r['Flag'], r.get('Note'), path, QCL)

# A small independent slice for the Russia UI and the forestry map owner.
russia = []
for metric in ['forest-area', 'roundwood-production', 'sawnwood-production']:
    m = metrics[metric]
    for year in range(2015, 2025):
        rows = [r for r in eu['countries']['RUS']['observations'] if r[:2] == [metric, year]]
        if len(rows) > 1:
            raise ValueError('Duplicate Russia row')
        row = rows[0] if rows else None
        if row and row[3] != m['unit']:
            raise ValueError('Russia source unit changed')
        key = f"{m['domain']}:{m['itemCode']}:{m['elementCode']}:{year}:{m['unit']}"
        denominator = world.get(key)
        value = Decimal(row[2]) if row and row[2].strip() and row[4] not in ['M', 'L'] else None
        if value is not None and (not value.is_finite() or value < 0):
            raise ValueError('Invalid Russia observation')
        total = Decimal(denominator['rawValue']) if denominator and denominator['rawValue'].strip() and denominator['flag'] not in ['M', 'L'] else None
        russia.append({'measureId': metric, 'year': year, 'rawValue': row[2] if row else None,
                       'unit': m['unit'], 'flag': row[4] if row else None,
                       'note': row[5] if row and len(row)>5 else None,
                       'worldRawValue': str(total) if total is not None else None,
                       'worldFlag': denominator['flag'] if denominator else None,
                       'worldShare': float(value / total * 100) if value is not None and total is not None and total > 0 else None})

# Prove that browser-side country/world joins use the same publisher snapshot.
coverage = {}
for path in ['public/assets/atlas/asia-farming-v1/statistics.json', 'public/assets/atlas/west-asia-v1/statistics.json']:
    data = load(path)
    archives = {s['file'].split('_E_')[0]: s['sha256'] for s in data['inputs']}
    assert archives['Production_Crops_Livestock'] == QCL and archives['Forestry'] == FO
    domains = {'Production_Crops_Livestock': 'QCL', 'Forestry': 'FO', 'Inputs_LandUse': 'RL'}
    counts = {}
    for code, country in data['countries'].items():
        matches = 0
        for r in country['observations']:
            domain = domains[r['domain']]
            key = f"{domain}:{r['item']}:{r['elementCode']}:{r['year']}:{r['unit']}"
            w = world.get(key)
            if w:
                assert w['archiveSha256'] == archives[r['domain']]
                matches += r['value'] is not None and r['flag'] not in ['M', 'L']
        counts[code] = matches
    coverage[path] = counts

method = 'Retained publisher World (5000) rows; same archive SHA-256, domain, item, element, year and unit. No national sum, fallback year, spatial total or missing-as-zero. Ratios are production/stock/area shares, never self-sufficiency or trade shares.'
OUT.mkdir(exist_ok=True); LEDGER.mkdir(parents=True, exist_ok=True)
def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
summary = load('data-source/atlas/shared-statistics/fao-forestry-summary-2024.json')
assert summary['dataYear'] == 2024
assert [(r['id'], r['unit']) for r in summary['rows']] == [('roundwood', 'million m3'), ('sawnwood', 'million m3'), ('wood-pulp', 'million tonnes')]
assert all(isinstance(r[k], int) and r[k] > 0 for r in summary['rows'] for k in ['production', 'exports'])
write(OUT / 'shared-forestry-summary.json', summary)
oceania = []
for item, label, definition in [('867', '牛肉', '骨付き、生鮮・冷蔵の牛肉。飼養頭数や水牛肉とは別の品目。'), ('882', '牛の生乳', '牛から搾った未加工の乳。乳製品や他の動物種の乳とは別の品目。')]:
    total = world[f'QCL:{item}:5510:2024:t']
    country_rows = []
    for code, m49, name in [('AUS', 36, 'オーストラリア'), ('NZL', 554, 'ニュージーランド')]:
        matches = [r for r in livestock_rows if int(r['Area Code (M49)'].lstrip("'")) == m49 and r['Item Code'] == item and r['Year'] == '2024' and r['Element Code'] == '5510']
        if len(matches) != 1 or matches[0]['Unit'] != 't':
            raise ValueError('Missing/duplicate/wrong-unit Oceania observation')
        row = matches[0]
        value = Decimal(row['Value']) if row['Value'].strip() and row['Flag'] not in ['M', 'L'] else None
        denominator = Decimal(total['rawValue']) if total['rawValue'].strip() and total['flag'] not in ['M', 'L'] else None
        if value is not None and (not value.is_finite() or value < 0):
            raise ValueError('Invalid Oceania observation')
        country_rows.append({'code': code, 'm49': m49, 'name': name, 'publisherName': row['Area'], 'areaCode': row['Area Code'], 'rawValue': row['Value'], 'flag': row['Flag'], 'note': row.get('Note') or None, 'worldShare': float(value / denominator * 100) if value is not None and denominator is not None and denominator > 0 else None})
    oceania.append({'itemCode': item, 'elementCode': '5510', 'label': label, 'definition': definition, 'unit': 't', 'year': 2024, 'worldRawValue': total['rawValue'], 'worldFlag': total['flag'], 'countries': country_rows})
write(OUT / 'oceania-livestock-production.json', {'schemaVersion': 1, 'series': oceania, 'source': sources['QCL'], 'retainedSource': 'data-source/atlas/livestock/faostat-qcl-2024-extract.json', 'method': method, 'limits': ['Only 2024 national rows for these two countries are retained; no 2015–2023 trend is inferred.', 'Two-country comparison, not a complete Oceania regional total.', 'No domestic uses, export destinations or self-sufficiency are calculated.']})
write(OUT / 'shared-world-statistics.json', {'schemaVersion': 1, 'years': list(range(2015,2025)), 'world': dict(sorted(world.items())), 'sources': list(sources.values()), 'method': method})
write(OUT / 'russia-forestry-statistics.json', {'schemaVersion': 1, 'country': 'RUS', 'm49': 643, 'scope': 'Entire Russian Federation as reported by FAOSTAT; not learning regions or map extent.', 'measures': [metrics[k] for k in ['forest-area','roundwood-production','sawnwood-production']], 'observations': russia, 'sources': [sources['FO'], sources['RL']], 'flags': {'FO': eu['flags']['FO'], 'RL': eu['flags']['RL']}, 'method': method})
write(LEDGER / 'provenance.json', {'schemaVersion': 1, 'base': 'ab2bf515', 'preparedOn': '2026-10-10', 'preparationScript': 'scripts/prepare-shared-agro-forestry-statistics.py', 'inputs': inputs, 'worldRows': len(world), 'countryWorldJoinCoverage': coverage, 'method': method, 'limits': ['Only retained source coverage is available. No FBS or detailed trade matrix was acquired.', 'Pulp is not in retained FO extracts; no pulp series is manufactured.', 'No domestic consumption or balance is calculated from different forest products.']})
print('World rows:', len(world), 'Russia forestry rows:', len(russia))
