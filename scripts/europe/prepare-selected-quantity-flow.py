"""Build Europe-only selected product packets from retained official tables.

Offline: never re-fetch a denied source, infer a missing quantity, or aggregate
national gross exports as European external exports.
"""
from pathlib import Path
from decimal import Decimal
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / 'data-source/atlas/europe/quantity-flow-20261016'
OUTPUT = ROOT / 'src/data/atlas/europe/selected-quantity-flow.json'
FAO = ROOT / 'public/assets/atlas/europe/farming-statistics-v1/statistics.json'
WASDE = ROOT / 'scripts/data/wasde0926.txt'
WASDE_SHA = 'de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285'
COUNTRIES = {'UKR': 'ウクライナ', 'FRA': 'フランス', 'ITA': 'イタリア', 'DEU': 'ドイツ', 'GBR': 'イギリス'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    fao = json.loads(FAO.read_text())
    original = json.loads((ROOT / 'data-source/atlas/europe/farming-statistics/provenance.json').read_text())
    qcl = next(s for s in original['sources'] if s['id'] == 'QCL')
    if qcl['archive']['sha256'] != 'c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853':
        raise ValueError('FAOSTAT revision changed: independently review World and country rows')
    if next(s for s in fao['sources'] if s['id'] == 'QCL')['archive']['sha256'] != qcl['archive']['sha256']:
        raise ValueError('National packet and retained FAO source manifest use different releases')
    if fao['sourceItems']['QCL']['236'] != 'Soya beans':
        raise ValueError('FAOSTAT soybean product definition changed')

    source_manifest = ROOT / 'data-source/atlas/europe/farming-statistics/provenance.json'
    sources = [{'path': str(path.relative_to(ROOT)), 'sha256': sha(path)} for path in [FAO, source_manifest]]
    records = []
    for country in ['UKR', 'FRA', 'ITA', 'DEU']:
        tables = {}
        for direction in ['Import', 'Export']:
            path = LEDGER / f'wits/{country}-{direction}-120100.json'
            table = json.loads(path.read_text())
            if (table['reporter'], table['flow'], table['year'], table['classification'], table['productCode'], table['productDescription']) != (country, direction, 2023, 'HS1988/92 (H0)', '120100', 'Soya beans'):
                raise ValueError('Trade country/year/product disagreement')
            rows = table['rows']
            if any(row['unit'] != 'Kg' or not row['quantityRaw'] or Decimal(row['quantityRaw']) < 0 for row in rows):
                raise ValueError('Missing, negative or non-Kg trade quantity')
            if len({row['partner'] for row in rows}) != len(rows) or sum(row['partner'] == 'World' for row in rows) != 1:
                raise ValueError('Duplicate partner or missing World denominator')
            tables[direction] = table
            sources.append({'path': str(path.relative_to(ROOT)), 'sha256': sha(path)})
        observation = next(row for row in fao['countries'][country]['observations'] if row[:2] == ['soybean-production', 2023])
        world = next(row for row in fao['world']['observations'] if row[:2] == ['soybean-production', 2023])
        if observation[3:5] != ['t', 'A'] or world[3:5] != ['t', 'A']:
            raise ValueError('Unreviewed production unit or flag')
        total = lambda direction: Decimal(next(row['quantityRaw'] for row in tables[direction]['rows'] if row['partner'] == 'World')) / 1000
        partners = [{'name': row['partner'], 'value': float(Decimal(row['quantityRaw']) / 1000)} for row in tables['Export']['rows'] if row['partner'] != 'World']
        export_gap = sum(Decimal(row['quantityRaw']) for row in tables['Export']['rows'] if row['partner'] != 'World') / 1000 - total('Export')
        # A discrepancy remains a discrepancy, never a made-up destination.
        if abs(export_gap) > total('Export') * Decimal('.00001'):
            raise ValueError('Partner discrepancy exceeds the reviewed display-rounding tolerance')
        record = {
            'kind': 'calendar-quantity-comparison', 'countryCode': country, 'countryName': COUNTRIES[country],
            'topic': 'soybean', 'seriesId': 'soybean-production', 'label': '丸大豆（油・粕を除く）',
            'year': 2023, 'unit': 't', 'production': float(observation[2]), 'productionRaw': observation[2],
            'worldProduction': float(world[2]), 'worldProductionRaw': world[2], 'productionFlag': observation[4], 'worldFlag': world[4],
            'imports': float(total('Import')), 'exports': float(total('Export')), 'partners': partners,
            'partnerRoundingGap': float(export_gap), 'actualDomesticUse': None, 'stockVariation': None,
            'feedUse': None, 'crushUse': None, 'domesticOriginExports': None,
            'source': {'productionUrl': qcl['landingUrl'], 'productionArchiveSha256': qcl['archive']['sha256'],
                       'importUrl': tables['Import']['sourceUrl'], 'exportUrl': tables['Export']['sourceUrl']},
        }
        if Decimal(record['productionRaw']) + total('Import') - total('Export') < 0:
            raise ValueError('Negative apparent availability; cannot draw a disposition band')
        records.append(record)

    if sha(WASDE) != WASDE_SHA:
        raise ValueError('WASDE revision changed')
    text = WASDE.read_text()
    for page, topic, countries in [(18, 'wheat', [('UKR', 'Ukraine'), ('GBR', 'United Kingdom')]), (22, 'maize', [('UKR', 'Ukraine')])]:
        after = re.split(r'WASDE - 675 - ' + str(page) + r'\s+September 2026', text, maxsplit=1)[1]
        body = re.split(r'WASDE - 675 - \d+\s+September 2026', after, maxsplit=1)[0]
        if '(Million Metric Tons)' not in body:
            raise ValueError('Wrong WASDE unit')
        historical = body.split('2024/25', 1)[1].split('2025/26', 1)[0]
        def values(name):
            line = next(line for line in historical.splitlines() if re.match(r'^\s*' + re.escape(name) + r'(?:\s+\d+/)?\s{2,}\d', line))
            numbers = re.findall(r'(?<!\S)\d+\.\d+(?!\S)', line)
            if len(numbers) != 7:
                raise ValueError('Wrong WASDE columns')
            return line, dict(zip(['beginningStocks', 'production', 'imports', 'domesticSubset', 'domesticUse', 'exports', 'endingStocks'], map(Decimal, numbers)))
        world_line, world_values = values('World')
        for code, name in countries:
            line, amounts = values(name)
            gap = amounts['beginningStocks'] + amounts['production'] + amounts['imports'] - amounts['domesticUse'] - amounts['exports'] - amounts['endingStocks']
            if abs(gap) > Decimal('.03') or amounts['domesticSubset'] > amounts['domesticUse']:
                raise ValueError('Unexplained WASDE balance or duplicate domestic subset')
            records.append({'kind': 'marketing-year-balance', 'countryCode': code, 'countryName': COUNTRIES[code], 'topic': topic,
                            'seriesId': topic + '-production', 'label': '小麦（原表の小麦換算基準）' if topic == 'wheat' else 'とうもろこし（子実）',
                            'year': '2024/25', 'unit': '百万t', **{key: float(value) for key, value in amounts.items()},
                            'domesticSubsetLabel': '飼料（国内利用の内数）', 'worldProduction': float(world_values['production']),
                            'roundingGap': float(gap), 'partners': None, 'rawLine': line, 'worldRawLine': world_line,
                            'notes': ['WASDE-675の同じ表・2024/25販売年度の国行とWorld行。各国販売年度の集計で共通暦年ではない。',
                                      '国内利用は食用・飼料・加工・種子等と未報告消失を含み得る。輸入・期首在庫を含むため当年国産分の配分ではない。'],
                            'source': {'url': 'https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf', 'page': page, 'sha256': WASDE_SHA, 'path': str(WASDE.relative_to(ROOT))}})
    sources.append({'path': str(WASDE.relative_to(ROOT)), 'sha256': WASDE_SHA})
    result = {'schemaVersion': 1, 'sources': sources, 'records': records,
              'method': 'National references only; no European external-trade aggregation. Calendar soybean quantities use retained FAOSTAT QCL production and official WITS H0 120100 gross trade. P+I-X is stock-unadjusted apparent availability, never actual consumption or allocation of the national harvest. WASDE uses a separate publisher marketing year with independently published domestic use and stocks.'}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    public = ROOT / 'public/assets/atlas/europe/selected-quantity-flow-v1/statistics.json'
    public.parent.mkdir(parents=True, exist_ok=True)
    public.write_bytes(OUTPUT.read_bytes())
    print(f'{len(records)} Europe-only references written to {OUTPUT.relative_to(ROOT)}')


if __name__ == '__main__':
    build()
