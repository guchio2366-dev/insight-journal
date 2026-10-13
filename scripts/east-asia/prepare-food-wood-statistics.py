"""Reuse pinned country rows and complete WITS numerical tables, offline.

Never substitute merchandise trade, GDP, missing reporters or a different year.
WITS values are published in 1,000 USD to two decimals: conversion preserves
that precision (10 USD), rather than inventing cent precision.
"""
from pathlib import Path
from decimal import Decimal
import argparse, gzip, hashlib, json

ROOT = Path(__file__).resolve().parents[2]
YEAR = 2023
COUNTRIES = ['CHN', 'JPN', 'KOR', 'PRK', 'MNG', 'TWN']
REPORTERS = ['CHN', 'JPN', 'KOR', 'PRK', 'MNG', 'OAS']
INSIDE = {'China', 'Japan', 'Korea, Rep.', 'Korea, Dem. Rep.', 'Mongolia', 'Other Asia, nes', 'Hong Kong, China', 'Macao'}
PRODUCTS = {'rice': ('1006', '米', '籾・玄米・精米・砕米'),
            'wheat': ('1001', '小麦', '小麦・メスリン。小麦粉は含まない'),
            'maize': ('1005', 'トウモロコシ', 'トウモロコシ'),
            'soybean': ('120100', '大豆', 'HS 1988/92の大豆'),
            'sawnwood': ('4407', '製材', '厚さ6mmを超える製材。HS44全体ではない'),
            'coniferous-roundwood': ('440320', '針葉樹原木（未処理）', '未処理の針葉樹類の原木。丸太HS4403全体ではない')}
INPUT = ROOT / 'data-source/atlas/east-asia/statistics-2023/wits'
OUT = ROOT / 'public/assets/atlas/east-asia-v2/food-wood-statistics-2023.json'
parser = argparse.ArgumentParser()
parser.add_argument('--food-models', type=Path, help='Publisher-derived, source-pinned food model packet; never synthetic site values')
args = parser.parse_args()

def load(path):
    return json.loads(path.read_bytes())

def hashed(path):
    return {'path': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

sources = []
tables = {}
for path in sorted(INPUT.glob('*.json')):
    packet = load(path)
    assert packet['year'] == YEAR and packet['classification'] == 'HS 1988/92 (H0)', path
    assert packet['reporter'] in REPORTERS and packet['flow'] in ['Import', 'Export'], path
    assert packet['product'] in [row[0] for row in PRODUCTS.values()], path
    rows = packet['rows']
    assert len({r['partner'] for r in rows}) == len(rows), path
    world = [r for r in rows if r['partner'] == 'World']
    assert len(world) == 1, path
    amount = lambda r: Decimal(r['value1000Usd']) * 1000
    assert all(amount(r).is_finite() and amount(r) >= 0 for r in rows), path
    # One rounded value per row. Do not turn the difference into an outside partner.
    difference = amount(world[0]) - sum(amount(r) for r in rows if r['partner'] != 'World')
    assert abs(difference) <= Decimal(5) * len(rows), (path, difference)
    assert not any(r['partner'] == 'European Union' for r in rows), 'Reject overlapping partner groups'
    sid = len(sources)
    sources.append({**hashed(path), 'url': packet['source'], 'reporter': packet['reporter'],
                    'flow': packet['flow'], 'product': packet['product'], 'rows': len(rows),
                    'worldUsd': float(amount(world[0])), 'roundingDifferenceUsd': float(difference)})
    key = (packet['reporter'], packet['flow'], packet['product'])
    assert key not in tables, key
    tables[key] = (rows, sid)

def trade_model(reporters, flow, product):
    covered, missing, ids, partners = [], [], [], {}
    world = inside = unknown = rounding = Decimal(0)
    for reporter in reporters:
        table = tables.get((reporter, flow, product))
        if table is None:
            missing.append(reporter)
            continue
        rows, sid = table
        covered.append(reporter)
        ids.append(sid)
        world += Decimal(str(sources[sid]['worldUsd']))
        rounding += Decimal(str(sources[sid]['roundingDifferenceUsd']))
        for row in rows:
            name = row['partner']
            if name == 'World':
                continue
            value = Decimal(row['value1000Usd']) * 1000
            if name in INSIDE:
                inside += value
            elif name == 'Unspecified':
                unknown += value
            else:
                partners[name] = partners.get(name, Decimal(0)) + value
    ordered = sorted(partners.items(), key=lambda row: (-row[1], row[0]))
    total = sum(partners.values(), Decimal(0))
    bins = [{'partner': name, 'usd': float(value)} for name, value in ordered[:5]]
    rest = sum((value for _, value in ordered[5:]), Decimal(0))
    if rest > 0:
        bins.append({'partner': 'Other external partners', 'usd': float(rest)})
    return {'coveredReporters': covered, 'missingReporters': missing, 'sourceIds': ids,
            'status': 'unavailable' if not covered else 'complete' if not missing else 'partial',
            'worldUsd': float(world) if covered else None, 'internalUsd': float(inside) if covered else None,
            'unknownPartnerUsd': float(unknown) if covered else None,
            'externalUsd': float(total) if covered else None, 'roundingDifferenceUsd': float(rounding) if covered else None,
            'partnerCount': len(ordered), 'bins': bins}

trade = {}
for topic, (product, label, definition) in PRODUCTS.items():
    trade[topic] = {'product': product, 'label': label, 'definition': definition,
                    'region': {flow: trade_model(REPORTERS, flow, product) for flow in ['Import', 'Export']},
                    'countries': {code: {flow: trade_model([reporter], flow, product) for flow in ['Import', 'Export']}
                                  for code, reporter in zip(COUNTRIES, REPORTERS)}}

country_path = ROOT / 'public/assets/atlas/asia-farming-v1/statistics.json'
country = load(country_path)
forest = {}
production = {}
for code in COUNTRIES:
    records = country['countries'][code]['observations']
    forest[code] = {}
    for kind, item in [('roundwood', '1861'), ('sawnwood', '1872')]:
        forest[code][kind] = {}
        for flow, element in [('production', '5516'), ('imports', '5616'), ('exports', '5916')]:
            rows = [r for r in records if r['domain'] == 'Forestry' and r['item'] == item
                    and r['elementCode'] == element and r['year'] == YEAR and r['unit'] == 'm3']
            assert len(rows) <= 1, (code, kind, flow)
            forest[code][kind][flow] = None if not rows or rows[0]['value'] is None else {
                'value': rows[0]['value'], 'flag': rows[0]['flag']}
    production[code] = {}
    for topic, item in [('rice', '27'), ('wheat', '15'), ('maize', '56'), ('soybean', '236')]:
        rows = [r for r in records if r['domain'] == 'Production_Crops_Livestock' and r['item'] == item
                and r['elementCode'] == '5510' and r['year'] == YEAR and r['unit'] == 't']
        assert len(rows) <= 1, (code, topic)
        production[code][topic] = None if not rows or rows[0]['value'] is None else {
            'value': rows[0]['value'], 'flag': rows[0]['flag']}

wdi_path = ROOT / 'public/assets/atlas/asia-industry-v1/national.json.gz'
wdi = json.loads(gzip.decompress(wdi_path.read_bytes()))
food_models = load(args.food_models) if args.food_models else None
if food_models is not None:
    assert set(food_models) == {'region', 'countries'}
    for scope in [food_models['region'], *food_models['countries'].values()]:
        for model in [*scope['supply'], *([scope['calories']] if scope['calories'] else [])]:
            assert model['year'] == YEAR and set(model['countryCodes']) <= set(COUNTRIES)
            assert model['source']['urls'] and all(u.startswith('https://') for u in model['source']['urls'])
            assert model['source']['inputSha256'] and all(len(h) == 64 for h in model['source']['inputSha256'])
    assert args.food_models.is_file()
payload = {'schemaVersion': 1, 'year': YEAR, 'countries': COUNTRIES, 'reporters': REPORTERS,
           'boundary': {'insidePartnerNames': sorted(INSIDE),
                        'note': 'Existing six reporter targets, with mainland China and published OAS reporting scope. Hong Kong and Macao are inside the geographic regional partner boundary and excluded from external partners. Their own reporter data are not added to the six-target observational sum; no claim of complete East Asia totals.'},
           'tradeUnit': 'current USD', 'classification': 'HS 1988/92 (H0)',
           'trade': trade, 'sources': sources, 'forestFlows': forest, 'referenceProduction': production,
           'foodModels': food_models,
           'retainedInputs': [hashed(country_path), hashed(wdi_path)],
           'inputAudit': {'available': ['2023 country crop production, tonnes', '2023 country forest production/import/export, cubic metres', 'complete numerical WITS partner tables for observed reporters'],
                          'absent': ['same-scope FBS/SUA production, imports, exports, stock convention, food/feed/processing/seed/losses/other uses/residuals', '2023 food calories and matching population by food group', 'domestic-origin edible calories, with imported feed and processing treated consistently'],
                          'wdiIndicators': [r['id'] for r in wdi['indicators']],
                          'notSubstituted': ['WDI GDP/employment is not food supply or calories', 'QCL production is not FBS primary-equivalent supply', 'HS trade money is not food mass or caloric self-sufficiency']},
           'method': 'Keep import/export denominators separate. Remove all regional partner reporting areas, including Hong Kong and Macao, before grouping. Unknown partners and missing reporters do not enter an external pie. Validate each complete table against its own World row within published rounding. Aggregate only the explicitly covered six-target reporters; never call that sum a complete geographic regional total. No mirror trade, quantity inference or residual allocation.'}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'{OUT.relative_to(ROOT)}: {len(sources)} complete tables, {sum(s["rows"] for s in sources)} numerical rows, {OUT.stat().st_size} bytes')
