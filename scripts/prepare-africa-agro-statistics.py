"""Offline Africa-only extraction from the retained, verified WASDE-675 revision."""
from pathlib import Path
from decimal import Decimal
import csv, hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'scripts/data/wasde0926.txt'
SHA256 = 'de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285'
TABLES = [(18, 'World Wheat Supply and Use', 'wheat-production', '小麦', {'Nigeria': ('NGA', 'ナイジェリア')}),
          (22, 'World Corn Supply and Use', 'maize-production', 'とうもろこし（子実）', {'South Africa': ('ZAF', '南アフリカ'), 'Egypt': ('EGY', 'エジプト')})]
COLUMNS = ['beginningStocks', 'production', 'imports', 'domesticFeed', 'domesticUse', 'exports', 'endingStocks']

def extract(source_bytes):
    if hashlib.sha256(source_bytes).hexdigest() != SHA256:
        raise ValueError('WASDE source revision/hash mismatch')
    source = source_bytes.decode('utf-8')
    records = []
    for page, title, series, label, targets in TABLES:
        match = re.search(r'WASDE - 675 - ' + str(page) + r'\s+September 2026', source)
        if not match:
            raise ValueError('Missing publisher page')
        body = re.split(r'WASDE - 675 - \d+\s+September 2026', source[match.end():], maxsplit=1)[0]
        if title not in body or '(Million Metric Tons)' not in body:
            raise ValueError('Wrong commodity/unit')
        historical = re.split(r'\b2024/25\b', body, maxsplit=1)[1].split('2025/26')[0]
        rows = {}
        for line in historical.splitlines():
            row = re.match(r'^\s*([A-Za-z].*?)\s{2,}(-?\d+\.\d+(?:\s+.*)?)\s*$', line)
            if not row:
                continue
            name = re.sub(r'\s+\d+/\s*$', '', row[1]).strip()
            if name not in {'World', *targets}:
                continue
            cells = row[2].split()
            if name in rows or len(cells) != len(COLUMNS) or any(not re.fullmatch(r'\d+\.\d+', cell) for cell in cells):
                raise ValueError('Duplicate row or invalid quantities')
            rows[name] = (dict(zip(COLUMNS, map(Decimal, cells))), dict(zip(COLUMNS, cells)), line)
        if set(rows) != {'World', *targets} or rows['World'][0]['production'] <= 0:
            raise ValueError('Missing national/World row')
        for name, (code, country_name) in targets.items():
            values, raw_values, raw_line = rows[name]
            supply = values['production'] + values['imports'] + values['beginningStocks']
            uses = values['domesticUse'] + values['exports'] + values['endingStocks']
            gap = supply - uses
            if abs(gap) > Decimal('.03') or values['domesticFeed'] > values['domesticUse']:
                raise ValueError('Invalid balance or nested domestic feed')
            records.append(dict(countryCode=code, countryName=country_name, seriesId=series, label=label,
                year='2024/25', unit='百万t', periodType='publisher-marketing-year', periodStart=None, periodEnd=None,
                **{key:float(value) for key,value in values.items()}, rawValues=raw_values,
                worldProduction=float(rows['World'][0]['production']), worldProductionRawValue=rows['World'][1]['production'],
                rawLine=raw_line, worldRawLine=rows['World'][2], roundingGap=float(gap), roundingTolerance=.03,
                status='published-historical', exportDestinations=None,
                source=dict(publisher='USDA', report='WASDE-675', releaseDate='2026-09-11', page=page,
                    url='https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf', path=SOURCE, sha256=SHA256),
                notes=[
                    '2024/25販売年度の公表実績列。同じWASDE-675・同表・同版の国別量とWorld生産量を採用。2025/26推計・2026/27予測と混ぜない。',
                    'Worldは各国の販売年度の集計。国により期首が異なる。保存TXTでは国別開始・終了日を確定できず、共通暦年と呼ばない。',
                    '国内利用は原表Domestic Totalで、食用・飼料・種子・加工等を含む。Feedはその内数であり、合計へ二重加算しない。',
                    '国内利用は生産−輸出ではない。輸入と期首在庫を含む全国収支であり、国産収穫物の実消費・仕向けを追跡した量ではない。',
                    '輸出は全国の総輸出。アフリカ域内向けを含み得るため、アフリカの域外輸出と呼ばない。再輸出と国産由来を分離できない。',
                    '同じ販売年度・商品範囲の全相手数量は未収録。暦年HS数量へ接合しない。',
                    '小麦の輸出・用途は原表の換算範囲に従う。HS1001の未製粉小麦へ自動一致させない。' if series=='wheat-production' else '原表の子実とうもろこし。飼料原料・加工後の製品を別の生産として足さない。',
                    '公表丸め差（供給−国内利用−輸出−期末在庫） '+str(gap)+' 百万t。用途へ押し込まない。']))
    return dict(schemaVersion=1, records=sorted(records,key=lambda row:(row['countryCode'],row['seriesId'])),
                method='Africa-only retained national observations. No regional sums, calendar-year aliases, or inferred consumption.')

def trade_reference():
    directory=ROOT/'data-source/atlas/africa/agro-statistics-20261016'
    meta=json.loads((directory/'wits-source.json').read_text())
    path=ROOT/meta['file']
    if hashlib.sha256(path.read_bytes()).hexdigest()!=meta['sha256']:
        raise ValueError('WITS retained numeric table/hash mismatch')
    rows=list(csv.DictReader(path.open()))
    if len(rows)!=84 or len({row['partner'] for row in rows})!=84:
        raise ValueError('WITS partner coverage/duplicates changed')
    for row in rows:
        if (row['reporter'],row['flow'],row['product'],row['year'])!=('ZAF','Export','100590','2024'):
            raise ValueError('WITS reporter/flow/product/year mismatch')
        if row['quantity'] and (row['unit']!='Kg' or Decimal(row['quantity'])<0):
            raise ValueError('WITS quantity unit/value mismatch')
    world=next(row for row in rows if row['partner']=='World')
    if world['quantity'] or meta['worldQuantity'] is not None:
        raise ValueError('Do not manufacture a whole-export denominator')
    quantities=sorted((row for row in rows if row['partner']!='World' and row['quantity']),key=lambda row:-Decimal(row['quantity']))
    return dict(**meta,topQuantityRows=[{key:row[key] for key in ['partner','quantity','unit']} for row in quantities[:5]])

if __name__ == '__main__':
    output=ROOT/'src/data/atlas/africa-agro-marketing-year.json'
    output.write_text(json.dumps(extract((ROOT/SOURCE).read_bytes()),ensure_ascii=False,indent=2)+'\n')
    print(output.relative_to(ROOT))
    output=ROOT/'src/data/atlas/africa-maize-trade-reference.json'
    output.write_text(json.dumps(trade_reference(),ensure_ascii=False,indent=2)+'\n')
    print(output.relative_to(ROOT))
