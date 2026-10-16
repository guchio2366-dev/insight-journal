"""Extract four additional East Asia WASDE rows without changing shared data.

Published marketing-year quantities remain separate from QCL paddy/seed cotton
and 2023 H0 trade. A printed 0.00 is a rounded observation, not exact zero.
"""
from pathlib import Path
from decimal import Decimal
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = 'scripts/data/wasde0926.txt'
SHA = 'de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285'
TABLES = [
    (22, 'World Corn Supply and Use', '(Million Metric Tons)', 'maize', 'maize-production', 'とうもろこし（子実）', '百万t', ['South Korea']),
    (24, 'World Rice Supply and Use  (Milled Basis)', '(Million Metric Tons)', 'rice', 'rice-milled-production', '米（精米換算）', '百万t', ['China', 'South Korea']),
    (26, 'World Cotton Supply and Use', '(Million 480-Pound Bales)', 'cotton', 'cotton-lint-production', '綿花（綿繊維）', '百万480lb俵', ['China']),
]
NAMES = {'China': ('CHN', '中国'), 'South Korea': ('KOR', '韓国')}

def parse(source_bytes):
    if hashlib.sha256(source_bytes).hexdigest() != SHA:
        raise ValueError('Retained WASDE source revision/hash changed')
    text = source_bytes.decode()
    result = []
    for page, title, unit_header, topic, series_id, label, unit, names in TABLES:
        page_match = re.search(r'WASDE - 675 - ' + str(page) + r'\s+September 2026', text)
        if not page_match:
            raise ValueError('Publisher page missing')
        body = text[page_match.end():]
        body = re.split(r'WASDE - 675 - \d+\s+September 2026', body, maxsplit=1)[0]
        if title not in body or unit_header not in body:
            raise ValueError('Wrong product, processing stage or unit')
        body = body.split('2024/25', 1)[1].split('2025/26', 1)[0]
        columns = ['beginningStocks', 'production', 'imports']
        if topic == 'maize':
            columns += ['feed']
        columns += ['domesticUse', 'exports']
        if topic == 'cotton':
            columns += ['lossAdjustment']
        columns += ['endingStocks']
        selected = {}
        for name in ['World', *names]:
            pattern = r'^' + (r'World(?:\s+\d+/)?' if name == 'World' else r'\s*' + re.escape(name)) + r'\s{2,}(.+?)\s*$'
            matches = [r for r in body.splitlines() if re.match(pattern, r)]
            if len(matches) != 1:
                raise ValueError('Missing or duplicate national/World row: ' + name)
            cells = re.match(pattern, matches[0])[1].split()
            if len(cells) != len(columns) or any(not re.fullmatch(r'-?\d+\.\d{2}', c) for c in cells):
                raise ValueError('Non-numeric cell/footnote must not become zero')
            raw = dict(zip(columns, cells));values = {k: Decimal(v) for k, v in raw.items()}
            if any(v < 0 for k, v in values.items() if k != 'lossAdjustment'):
                raise ValueError('Negative primary amount')
            selected[name] = (raw, values, matches[0])
        world_raw, world, world_line = selected['World']
        if world['production'] <= 0:
            raise ValueError('World production denominator must be positive')
        for name in names:
            raw, values, raw_line = selected[name]
            if 'feed' in values and values['feed'] > values['domesticUse']:
                raise ValueError('Feed is a subset of Domestic Total')
            gap = values['beginningStocks'] + values['production'] + values['imports'] - values['domesticUse'] - values['exports'] - values['endingStocks'] - values.get('lossAdjustment', 0)
            if abs(gap) > Decimal('.035'):
                raise ValueError('Unexplained accounting difference')
            code, country = NAMES[name]
            result.append(dict(countryCode=code, countryName=country, topic=topic, seriesId=series_id, label=label,
                               year='2024/25', periodType='publisher-marketing-year', periodStart=None, periodEnd=None, unit=unit,
                               **{k: float(v) for k, v in values.items()}, rawValues=raw,
                               worldProduction=float(world['production']), worldProductionRawValue=world_raw['production'],
                               rawLine=raw_line, worldRawLine=world_line, roundingGap=float(gap),
                               exportsRoundedZero=raw['exports']=='0.00', exportDestinations=None,
                               source=dict(report='WASDE-675', releaseDate='2026-09-11', page=page, path=SOURCE, sha256=SHA,
                                           url='https://www.usda.gov/oce/commodity/wasde/wasde0926.txt'),
                               notes=[
                                   '2024/25販売年度・同版・同表の国と公表World。国ごとの年度期首は異なり得るため2024暦年とは呼ばない。2025/26推計・2026/27予測で補完しない。',
                                   ('輸入と期首在庫を含む綿繊維の供給全体の利用。食料供給や食用量ではなく、国産原料の国内・輸出の二分でもない。再輸出・輸入原料由来は追跡できない。' if topic == 'cotton' else '輸入と期首在庫を含む供給全体の利用。国内利用は人の食用だけではなく、国産原料を国内・輸出へ二分した量でもない。再輸出・輸入原料由来は追跡できない。'),
                                   ('工程別の国内用途・損耗等の詳細は未収録。食料需給の表ではない。' if topic == 'cotton' else '食用・加工・種子・損耗等の詳細は未収録。飼料が示される場合もDomestic Totalの内数で、二重加算しない。'),
                                   '同じ販売年度・同製品の全相手数量は未収録。2023暦年H0相手表をこの輸出量の内訳へ接合しない。',
                                   '原表の小数2桁と収支差を保持し、差を架空の用途へ配分しない。0.00は公表丸め値で、厳密な0や取引不存在とは限らない。',
                                   '精米換算は籾米生産やHS1006各加工段階の合算重量とは別。綿繊維は種を含む綿花・綿実とは別で、tへの独自換算をしない。',
                               ]))
    return dict(schemaVersion=1, method='National selected-product references only; no QCL alias or regional aggregation', records=result)

if __name__ == '__main__':
    data = parse((ROOT / SOURCE).read_bytes())
    (ROOT / 'src/data/atlas/east-asia-supply-use-references.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    print('Extracted ' + str(len(data['records'])) + ' East Asia same-table supply/use references')
