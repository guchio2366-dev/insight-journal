"""Offline Latin-only extraction of retained official public tables.

The .web.txt files are reader transcriptions, not original HTML/CSV bytes.
Keep missing totals and partner cells null; never reconstruct a World total.
"""
import csv
import hashlib
import json
import re
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source/atlas/latin-america/agro-20261016'
OUTPUT = ROOT / 'public/assets/atlas/latin-agro-quantity-v1/data.json'
COUNTRIES = {'ARG': 'Argentina', 'BOL': 'Bolivia', 'BRA': 'Brazil',
             'PRY': 'Paraguay', 'URY': 'Uruguay'}
INTERNAL = {'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Costa Rica',
            'Guatemala', 'Guyana', 'Paraguay', 'Peru', 'Uruguay', 'Venezuela',
            'Panama', 'Antigua and Barbuda',
            'Bahamas, The'}
UNRESOLVED = {'Free Zones'}


def number(raw):
    return Decimal(raw.replace(',', '')) if raw.strip() else None


def plain(raw):
    return re.sub(r'cite[^†]*†([^]*)', r'\1', raw).strip()


def tables():
    found = {}
    for path in sorted(SOURCE.glob('*.web.txt')):
        text = path.read_text()
        for section in text.split('--------------------------------------------------------------------------------'):
            match = re.search(r'https://wits.worldbank.org/trade/comtrade/en/country/(\w+)/year/(\d+)/tradeflow/(Exports|Imports)/partner/ALL/product/(\d+)', section)
            if not match:
                continue
            code, year, flow, product = match.groups()
            if code not in COUNTRIES:
                continue
            rows = []
            for line in section.splitlines():
                body = re.sub(r'^L\d+:\s*', '', line)
                cells = [plain(cell) for cell in body.split('|')]
                if len(cells) != 9 or cells[0] != COUNTRIES[code]:
                    continue
                assert cells[1] == flow[:-1] and cells[2:5] == ['120100', 'Soya beans', '2024'], cells
                raw = cells[7]
                assert not raw or cells[8] == 'Kg', cells
                rows.append({'name': cells[5], 'rawKg': raw.replace(',', '') or None,
                             'tonnes': float(number(raw) / 1000) if raw else None})
            if not rows:
                continue
            assert year == '2024' and product == '120100'
            assert 'HS 1988/92 (H0)' in section and 'gross exports' in section, path
            assert len({r['name'] for r in rows}) == len(rows), path
            key = (code, flow)
            candidate = {'url': match.group(), 'rows': rows, 'transcription': str(path.relative_to(ROOT))}
            if key not in found or len(rows) > len(found[key]['rows']):
                found[key] = candidate
            elif len(rows) == len(found[key]['rows']):
                assert rows == found[key]['rows'], key
    return found


def build():
    source_csv = ROOT / 'data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv'
    metadata = json.loads((source_csv.parent / 'qcl-source.json').read_text())
    assert hashlib.sha256(source_csv.read_bytes()).hexdigest() == metadata['selectedSha256']
    qcl = list(csv.DictReader(source_csv.open()))
    country_index = json.loads((ROOT / 'src/data/atlas/latin-america/country-index.json').read_text())
    # Explicit names identify the same original FAO area; never join by row order.
    def production(name):
        rows = [r for r in qcl if r['Area'] == name and r['Item Code'] == '236'
                and r['Element Code'] == '5510' and r['Year'] == '2024' and r['Unit'] == 't']
        assert len(rows) == 1 and rows[0]['Item'] == 'Soya beans'
        r = rows[0]
        assert r['Value'] and r['Flag'] not in ('M', 'L')
        return {'rawValue': r['Value'], 'value': float(Decimal(r['Value'])), 'flag': r['Flag'], 'note': r['Note'],
                'areaCode': r['Area Code'], 'itemCode': '236', 'unit': 't', 'year': 2024}

    world = production('World')
    trade = tables()
    records = []
    for code, name in COUNTRIES.items():
        exports, imports = trade[(code, 'Exports')], trade[(code, 'Imports')]
        def world_row(table):
            rows = [r for r in table['rows'] if r['name'] == 'World']
            assert len(rows) == 1
            return rows[0]['tonnes']
        partners = [{**row, 'region': 'unresolved' if row['name'] in UNRESOLVED else
                     'internal' if row['name'] in INTERNAL else 'external'}
                    for row in exports['rows'] if row['name'] != 'World']
        total = world_row(exports)
        known = sum((Decimal(r['rawKg']) / 1000 for r in partners if r['rawKg'] is not None), Decimal(0))
        gap = float(known - Decimal(str(total))) if total is not None else None
        records.append({'countryCode': code, 'countryName': next(r['name'] for r in country_index if r['code'] == code),
                        'year': 2024, 'seriesId': 'soybean-production', 'label': '大豆（丸大豆）', 'unit': 't',
                        'production': production('Bolivia (Plurinational State of)' if code == 'BOL' else name), 'world': world,
                        'imports': world_row(imports), 'exports': total, 'partners': partners,
                        'partnerRoundingGap': gap, 'importRows': imports['rows'],
                        'balanceComparable': code != 'URY',
                        'productionUrl': 'https://www.fao.org/faostat/en/#data/QCL',
                        'exportSource': {k: v for k, v in exports.items() if k != 'rows'},
                        'importSource': {k: v for k, v in imports.items() if k != 'rows'}})

    paths = sorted(SOURCE.glob('*.web.txt')) + [source_csv, source_csv.parent / 'qcl-source.json']
    # Chile's original rows use Spanish decimal commas and explicit thousands.
    # Extract whole rows, retaining dashes as missing, not numerical zero.
    def infor_row(filename, prefix):
        rows = [re.sub(r'^L\d+:\s*', '', line).strip() for line in (SOURCE / filename).read_text().splitlines()]
        hits = [line for line in rows if line.startswith(prefix + '  |')]
        assert len(hits) == 1, (filename, prefix)
        return hits[0]
    def spanish(raw):
        return None if raw.strip() == '-' else float(Decimal(raw.strip().replace('.', '').replace(',', '.')) * 1000)
    input_row = infor_row('latin-infor-input.web.txt', '2024')
    input_cells = [c.strip() for c in input_row.split('|')[1:]]
    labels = ['機械パルプへの丸太投入', '化学パルプへの丸太投入', '製材への丸太投入', '合板・ボード等への丸太投入',
              '製材・単板用丸太の直接輸出', 'パルプ用丸太の直接輸出', 'チップへの丸太投入', '柱・杭への丸太投入', 'その他の丸太投入']
    pulp_row = infor_row('latin-infor-final.web.txt', '2024')
    sawn_row = infor_row('latin-infor-tables.web.txt', '2024')
    export_row = infor_row('latin-extra-tables.web.txt', 'MADERA ASERRADA (1)')
    forest = {'countryCode': 'CHL', 'countryName': 'チリ', 'year': 2024,
              'roundwood': {'unit': 'm³ ssc（樹皮なし実材積）', 'total': spanish(input_cells[0]), 'rawLine': input_row,
                            'parts': [{'label': label, 'value': spanish(value), 'rawValue': value}
                                      for label, value in zip(labels, input_cells[1:], strict=True)],
                            'url': 'https://wef.infor.cl/index.php/sector-forestal/industria-forestal/consumo/consumo-de-trozas-por-industria?view=comercio_ind_con_total'},
              'sawnwood': {'unit': 'm³', 'production': spanish(sawn_row.split('|')[1]),
                          'exports': spanish(export_row.split('|')[7]), 'rawLine': sawn_row, 'exportRawLine': export_row,
                          'url': 'https://wef.infor.cl/index.php/sector-forestal/industria-forestal/produccion/madera-aserrada-por-especie?view=comercio_ind_pro_aserradaespecie'},
              'pulp': {'unit': 't', 'production': spanish(pulp_row.split('|')[1]), 'rawLine': pulp_row,
                       'url': 'https://wef.infor.cl/index.php/sector-forestal/industria-forestal/produccion/produccion-de-celulosa?view=comercio_ind_pro_celulosa'},
              'tradeUrl': 'https://wef.infor.cl/index.php/sector-forestal/exportaciones/cantidad-total-por-producto?view=comercio_exp_volumensegunproducto'}
    assert forest['sawnwood']['exports'] == 2010000 and forest['sawnwood']['production'] == 7036700
    assert forest['pulp']['production'] == 5938000 and forest['roundwood']['total'] == 42254600
    output = {'schemaVersion': 1, 'retrieved': '2026-10-16', 'records': records, 'forest': forest,
              'sources': [{'path': str(p.relative_to(ROOT)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],
              'method': 'FAO QCL236とWITS H0 120100のSoya beans。同じ2024暦年の原料重量比較。油・油かすは含めない。WITSは総輸出入。kg÷1000=t。在庫未調整見掛量は実消費・国産原料の仕向けではない。国別の全相手を保持し、中南米34対象内への取引と域外への取引を区別する。地域集計は作らない。Free Zonesの地理区分は推定しない。'}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    return output


if __name__ == '__main__':
    data = build()
    for r in data['records']:
        print(r['countryCode'], r['production']['value'], r['imports'], r['exports'], len(r['partners']), r['partnerRoundingGap'])
