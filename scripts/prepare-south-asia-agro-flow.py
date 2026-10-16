"""Extract only South Asia's existing selected products, offline, from WASDE-675.

Never alias paddy to milled rice, seed cotton to lint, or country exports to
South Asia's extra-regional exports. Unknown dates/partners remain unknown.
"""
from decimal import Decimal
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'scripts/data/wasde0926.txt'
SHA256 = 'de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285'
COUNTRIES = {'India': ('IND', 'インド'), 'Pakistan': ('PAK', 'パキスタン'),
             'Bangladesh': ('BGD', 'バングラデシュ')}
BASE = ['beginningStocks', 'production', 'imports', 'domesticUse', 'exports', 'endingStocks']
TABLES = [
    (18, 'World Wheat Supply and Use', 'wheat-production', 'wheat-production', '小麦',
     '百万t', BASE[:3] + ['domesticFeed'] + BASE[3:], ['India', 'Bangladesh']),
    (24, 'World Rice Supply and Use  (Milled Basis)', 'rice-production', 'rice-milled-production',
     '米（精米換算）', '百万t', BASE, ['India', 'Pakistan']),
    (26, 'World Cotton Supply and Use', 'qcl-328-production', 'cotton-lint-production',
     '綿花（綿繊維）', '百万480ポンド俵', BASE[:-1] + ['lossAdjustment', 'endingStocks'],
     ['India', 'Pakistan', 'Bangladesh']),
]


def parse(source_bytes):
    if hashlib.sha256(source_bytes).hexdigest() != SHA256:
        raise ValueError('WASDE retained revision/hash changed')
    text = source_bytes.decode('utf-8')
    records = []
    for page, title, selection_id, series_id, label, unit, columns, names in TABLES:
        marker = re.search(r'WASDE - 675 - ' + str(page) + r'\s+September 2026', text)
        if not marker:
            raise ValueError('Missing publisher page')
        after = text[marker.end():]
        boundary = re.search(r'WASDE - 675 - \d+\s+September 2026', after)
        body = after[:boundary.start()] if boundary else after
        expected_unit = '(Million 480-Pound Bales)' if page == 26 else '(Million Metric Tons)'
        if title not in body or expected_unit not in body:
            raise ValueError('Product/unit mismatch')
        historical = body.split('2024/25', 1)[1].split('2025/26', 1)[0]

        def row(name):
            matches = [line for line in historical.splitlines()
                       if re.match(r'^\s*' + re.escape(name) + r'(?:\s+\d+/)?\s{2,}', line)]
            if len(matches) != 1:
                raise ValueError('Missing/duplicate country or World: ' + name)
            raw_line = matches[0]
            cells = re.sub(r'^\s*' + re.escape(name) + r'(?:\s+\d+/)?\s{2,}', '', raw_line).split()
            if len(cells) != len(columns) or any(not re.fullmatch(r'-?\d+\.\d+', c) for c in cells):
                raise ValueError('Missing/non-numeric quantity; do not infer footnote values')
            return raw_line, dict(zip(columns, cells))

        world_line, world = row('World')
        for name in names:
            raw_line, raw = row(name)
            values = {key: Decimal(value) for key, value in raw.items()}
            if any(value < 0 for key, value in values.items() if key != 'lossAdjustment'):
                raise ValueError('Negative primary quantity')
            gap = sum(values[key] for key in BASE[:3]) - sum(values[key] for key in BASE[3:])
            residual = gap - values.get('lossAdjustment', Decimal(0))
            if abs(residual) > Decimal('0.035'):
                raise ValueError('Unexplained balance difference')
            code, country_name = COUNTRIES[name]
            notes = [
                'WASDE-675、2026-09-11公表版の2024/25行。最新改訂値を意味せず、同じ原表版の国別行とWorld行を比較します。',
                '提供元の販売年度。Worldは各国の販売年度の集計で、共通暦年ではありません。開始・終了日未照合のまま他資料の年度輸出と接合しません。',
                '国内利用は原表の独立公表値です。生産−輸出から推定していません。輸入・期首在庫を含み、国産分の仕向けを追跡した割合ではありません。',
                '全国の全外国向け輸出です。南アジア内の相手を含み得るため、南アジアの域外輸出として集計しません。輸入原料・再輸出の由来は分離できません。',
                '0.00は原表の丸め値です。厳密なゼロや貿易の不存在を保証しません。',
                '同じ販売年度・製品換算による全相手数量は未収録です。相手構成や最終消費地を推定しません。',
            ]
            if page == 24:
                notes += ['全数量が精米換算（Milled Basis）。FAOSTATの籾米生産や2023–24会計年度のバスマティ米・その他米輸出と差し引きしません。',
                          '原表注2：Total domesticは国内利用と未報告消失（unreported disappearance）を含みます。食用・飼料・加工・損耗を分解できません。']
            elif page == 26:
                notes += ['綿繊維の百万480ポンド俵。種付き綿花のt、綿糸・織物のHS52金額とは別製品・工程で、換算・合算しません。',
                          '国内利用は紡績投入（mill use）。人の食用消費ではありません。Lossは原表の未勘定で、用途に加算しません。']
            else:
                notes += ['Feedは国内利用Totalの内数で、別途加算しません。小麦粉・製品の原穀換算範囲を未照合のHS1001相手表へ接合しません。']
            records.append({
                'countryCode': code, 'countryName': country_name, 'selectionSeriesId': selection_id,
                'seriesId': series_id, 'label': label, 'year': '2024/25', 'unit': unit,
                'periodType': 'publisher-marketing-year', 'periodStart': None, 'periodEnd': None,
                'scope': 'national-all-foreign-partners',
                **{key: float(value) for key, value in values.items()},
                'worldProduction': float(world['production']), 'worldProductionRawValue': world['production'],
                'worldRawLine': world_line, 'rawLine': raw_line, 'rawValues': raw,
                'roundingGap': float(gap), 'balanceResidual': float(residual), 'roundingTolerance': 0.035,
                'exportDestinations': None, 'notes': notes,
                'source': {'url': 'https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf',
                           'page': page, 'releaseDate': '2026-09-11', 'path': SOURCE, 'sha256': SHA256},
            })
    return {'schemaVersion': 1, 'records': records}


if __name__ == '__main__':
    data = parse((ROOT / SOURCE).read_bytes())
    output = ROOT / 'src/data/atlas/south-asia-agro-flow.json'
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(data["records"])} South Asia records → {output.relative_to(ROOT)}')
