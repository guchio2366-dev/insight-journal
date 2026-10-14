"""Extract actual retained WASDE-675 2024/25 national rows, entirely offline.

All production/World/uses fields come from one table and revision. Do not use
PSD country sums, 2025 calendar-year partners or inferred national observations.
"""
from pathlib import Path
from decimal import Decimal
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'scripts/data/wasde0926.txt'
SHA256 = 'de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285'
OUTPUT = ROOT / 'src/data/atlas/agro-marketing-year-flow.json'
COUNTRIES = {
    'United States': ('USA', '米国'), 'Canada': ('CAN', 'カナダ'),
    'Mexico': ('MEX', 'メキシコ'), 'Brazil': ('BRA', 'ブラジル'),
    'Argentina': ('ARG', 'アルゼンチン'), 'Paraguay': ('PRY', 'パラグアイ'),
    'Australia': ('AUS', 'オーストラリア'), 'China': ('CHN', '中国'),
    'India': ('IND', 'インド'), 'Kazakhstan': ('KAZ', 'カザフスタン'),
    'New Zealand': ('NZL', 'ニュージーランド'), 'Indonesia': ('IDN', 'インドネシア'),
}
TABLES = [
    (18, 'World Wheat Supply and Use', 'wheat-production', '小麦', '飼料（原表Feed）'),
    (22, 'World Corn Supply and Use', 'maize-production', 'とうもろこし（子実）', '飼料（原表Feed）'),
    (24, 'World Rice Supply and Use', 'rice-milled-production', '米（精米換算）', None),
    (28, 'World Soybean Supply and Use', 'soybean-production', '大豆（丸大豆）', '搾油投入（原表Crush）'),
]
COLS = ['beginningStocks', 'production', 'imports', 'domesticSubset', 'domesticUse', 'exports', 'endingStocks']


def parse(source_bytes):
    actual_sha = hashlib.sha256(source_bytes).hexdigest()
    if actual_sha != SHA256:
        raise ValueError('Retained WASDE revision/hash disagreement')
    text = source_bytes.decode('utf-8')
    result = []
    for page, title, series_id, label, subset_label in TABLES:
        columns = COLS if subset_label else [key for key in COLS if key != 'domesticSubset']
        header = re.search(r'WASDE - 675 - ' + str(page) + r'\s+September 2026', text)
        if not header:
            raise ValueError('Missing publisher page: ' + str(page))
        next_page = re.search(r'WASDE - 675 - \d+\s+September 2026', text[header.end():])
        body = text[header.end():header.end() + next_page.start()] if next_page else text[header.end():]
        if title not in body or '(Million Metric Tons)' not in body:
            raise ValueError('Wrong commodity or unit: ' + str(page))
        # Retain only the unlabelled historical 2024/25 block; never use Est./Proj.
        block = re.split(r'\b2024/25\b', body, maxsplit=1)
        if len(block) != 2:
            raise ValueError('Missing historical year block')
        historical = re.split(r'\b2025/26\b', block[1], maxsplit=1)[0]
        rows = {}
        for raw in historical.splitlines():
            line = re.match(r'^\s*([A-Za-z].*?)\s{2,}(-?\d+\.\d+(?:\s+.*)?)\s*$', raw)
            if not line:
                continue
            name = re.sub(r'\s+\d+/\s*$', '', line[1]).strip()
            if name != 'World' and name not in COUNTRIES:
                continue
            # Only the already-selected US rice page changes to this explicitly
            # labelled milled basis; do not broaden other country rice topics.
            if series_id == 'rice-milled-production' and name not in ('World', 'United States'):
                continue
            cells = line[2].split()
            if len(cells) != len(columns) or any(not re.fullmatch(r'-?\d+\.\d+', cell) for cell in cells):
                raise ValueError('Unexpected quantity columns: ' + raw)
            if name in rows:
                raise ValueError('Duplicate national/World row: ' + name)
            values = dict(zip(columns, map(Decimal, cells)))
            if any(value < 0 for value in values.values()):
                raise ValueError('Negative primary quantity: ' + name)
            if subset_label and values['domesticSubset'] > values['domesticUse']:
                raise ValueError('Domestic subset exceeds parent: ' + name)
            rows[name] = {'values': values, 'rawLine': raw, 'rawValues': dict(zip(columns, cells))}
        if 'World' not in rows or rows['World']['values']['production'] <= 0:
            raise ValueError('Missing same-table publisher World production')
        world = rows['World']
        for name, record in rows.items():
            if name == 'World':
                continue
            country_code, country_name = COUNTRIES[name]
            values = record['values']
            # Positive domestic use/exports/ending stocks are independent of
            # current production, because imports and opening stocks exist.
            supply = values['beginningStocks'] + values['production'] + values['imports']
            uses = values['domesticUse'] + values['exports'] + values['endingStocks']
            gap = supply - uses
            # Six independently rounded columns to 0.01 Mt give <=0.03 Mt error.
            if abs(gap) > Decimal('0.03'):
                raise ValueError('Unexplained balance difference: ' + name + ' ' + str(gap))
            notes = [
                'WASDE-675、2026-09-11公表版、2024/25年の国別行と同表World行。2025/26推計・2026/27予測は採用しない。',
                '2024/25は提供元の販売年度。国ごとの開始・終了日は異なり得る。保存TXTに注記全文・日付定義がないため共通暦年と呼ばない。',
                '国内利用は食用・飼料・種子・加工等を含む原表Totalで、実際の人の食用量ではない。用途の内数を親合計へ二重加算しない。',
                '国内利用と輸出は当年国内生産の直接の分割ではない。輸入と期首在庫を含む供給から生じ、期末在庫を別に表示する。',
                '輸出は国産原料だけの追跡量ではない。再輸出・輸入原料の仕向けをこの表で分離できない。',
                '同じ販売年度・数量定義の全相手国輸出原表は未収録。2025暦年GATSや別版をこの輸出量の構成比へ接合しない。',
                '供給−国内利用−輸出−期末在庫の公表丸め差 ' + str(gap) + ' 百万t。差を用途へ押し込まない。',
            ]
            if series_id == 'wheat-production':
                notes.append('小麦粒の生産と原表小麦基準の用途・貿易。小麦粉・製品を含む換算範囲は国別原注記との確認が必要。未製粉小麦のみのHS1001相手表とは自動一致しない。')
            if series_id == 'soybean-production':
                notes.append('丸大豆の搾油投入は国内利用の内数。加工後の大豆油・大豆粕は別製品で、丸大豆と合算しない。')
            if series_id == 'rice-milled-production':
                notes.append('全数量は同じWASDE公表表の精米換算（Milled Basis）。このモジュールで籾やブッシェルから換算した量ではない。地図の稲作・籾米生産、国内米需給表のrough basis、2025暦年GATS MTMEQは独立資料として扱い、この同年度量へ接合しない。')
            result.append({
                'countryCode':country_code, 'countryName':country_name,
                'seriesId':series_id, 'label':label, 'year':'2024/25',
                'unit':'百万t', 'periodType':'publisher-marketing-year',
                'periodStart':None, 'periodEnd':None,
                **{key:float(values[key]) for key in columns if key != 'domesticSubset'},
                'domesticSubset':{'label':subset_label, 'value':float(values['domesticSubset']),
                                  'isWithinDomesticUse':True} if subset_label else None,
                'worldProduction':float(world['values']['production']),
                'worldProductionRawValue':world['rawValues']['production'],
                'worldRawLine':world['rawLine'], 'rawLine':record['rawLine'],
                'rawValues':record['rawValues'], 'roundingGap':float(gap),
                'roundingTolerance':0.03, 'status':'published-historical',
                'exportDestinations':None, 'partnersStatus':'unretained-same-period-and-definition',
                'source':{'publisher':'USDA', 'report':'WASDE-675', 'releaseDate':'2026-09-11',
                          'url':'https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf',
                          'page':page, 'sha256':actual_sha, 'path':SOURCE},
                'notes':notes,
            })
    # US cotton's country table gives a rounded numeric Imports cell, while the
    # world table prints the footnote symbol 3/. Preserve both; do not turn the
    # world-table symbol into an invented quantity.
    def page_body(page):
        match = re.search(r'WASDE - 675 - ' + str(page) + r'\s+September 2026', text)
        if not match:
            raise ValueError('Missing cotton publisher page')
        after = text[match.end():]
        boundary = re.search(r'WASDE - 675 - \d+\s+September 2026', after)
        return after[:boundary.start()] if boundary else after
    country_page, world_page = page_body(17), page_body(26)
    if 'U.S. Cotton Supply and Use' not in country_page or 'Million 480 Pound Bales' not in country_page:
        raise ValueError('Cotton country definition/unit changed')
    if 'World Cotton Supply and Use' not in world_page or '(Million 480-Pound Bales)' not in world_page:
        raise ValueError('Cotton World definition/unit changed')
    vertical = {'Beginning Stocks':'beginningStocks', 'Production':'production', 'Imports':'imports',
                'Domestic Use':'domesticUse', 'Exports, Total':'exports', 'Ending Stocks':'endingStocks',
                'Unaccounted 2/':'lossAdjustment'}
    cotton_values, cotton_raw, cotton_lines = {}, {}, []
    for line in country_page.splitlines():
        for label, key in vertical.items():
            matched = re.fullmatch(r'\s*' + re.escape(label) + r'\s+(-?\d+\.\d+)\s+.*', line)
            if matched:
                if key in cotton_values:
                    raise ValueError('Duplicate cotton country field')
                cotton_values[key] = Decimal(matched[1]); cotton_raw[key] = matched[1]; cotton_lines.append(line)
    if set(cotton_values) != set(vertical.values()):
        raise ValueError('Missing cotton country quantity')
    world_historical = world_page.split('2024/25', 1)[1].split('2025/26', 1)[0]
    world_line = next(line for line in world_historical.splitlines() if re.match(r'^World\s+\d', line))
    country_world_line = next(line for line in world_historical.splitlines() if re.match(r'^United States\s+\d', line))
    world_cells = world_line.split()[1:]; country_cells = country_world_line.split()[2:]
    if len(world_cells) != 7 or len(country_cells) != 7 or country_cells[2] != '3/':
        raise ValueError('Cotton World table shape/footnote changed')
    for index, key in [(0,'beginningStocks'),(1,'production'),(3,'domesticUse'),(4,'exports'),(5,'lossAdjustment'),(6,'endingStocks')]:
        if Decimal(country_cells[index]) != cotton_values[key]:
            raise ValueError('Same-revision cotton country/World-table disagreement: ' + key)
    gap = cotton_values['beginningStocks'] + cotton_values['production'] + cotton_values['imports'] - cotton_values['domesticUse'] - cotton_values['exports'] - cotton_values['endingStocks']
    if abs(gap - cotton_values['lossAdjustment']) > Decimal('0.03'):
        raise ValueError('Cotton balance differs from signed published Unaccounted')
    result.append({
        'countryCode':'USA', 'countryName':'米国', 'seriesId':'cotton-lint-production',
        'label':'綿花（綿繊維）', 'year':'2024/25', 'unit':'百万480ポンド俵',
        'periodType':'publisher-marketing-year', 'periodStart':None, 'periodEnd':None,
        **{key:float(value) for key,value in cotton_values.items()},
        'domesticSubset':None, 'worldProduction':float(Decimal(world_cells[1])),
        'worldProductionRawValue':world_cells[1], 'worldRawLine':world_line,
        'rawLine':'\n'.join(cotton_lines), 'rawLines':cotton_lines, 'rawValues':cotton_raw,
        'countryWorldRawLine':country_world_line, 'worldTableImportsRawValue':'3/',
        'importsQuality':'publisher-rounded-0.00-not-strict-zero',
        'roundingGap':float(gap), 'roundingTolerance':0.03,
        'status':'published-historical', 'exportDestinations':None,
        'partnersStatus':'unretained-same-period-and-definition',
        'source':{'publisher':'USDA', 'report':'WASDE-675', 'releaseDate':'2026-09-11',
                  'url':'https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf',
                  'page':17, 'worldPage':26, 'sha256':actual_sha, 'path':SOURCE},
        'notes':[
            '全数量はWASDE675、2026-09-11公表版の2024/25。国内需給はp17、World生産はp26。両表の米国P14.41・国内利用・輸出・期首/期末在庫・未勘定を一致確認。',
            '綿繊維（lint）の百万480ポンド俵。種子付き綿（未繰綿）、綿実、糸・衣料の数量と合算しない。',
            '輸入はp17の公表0.00をその精度で保持。厳密な実量0と判定しない。p26の米国輸入セル3/は原記号として保持し、脚注全文未収録のため0に読み替えない。',
            '未勘定Unaccounted −0.04は原表の符号付き調整。正の用途帯へ入れず独立表示し、国内利用・輸出へ押し込まない。',
            '2024/25は提供元の販売年度。共通暦年と呼ばない。国内利用と輸出は期首在庫・輸入を含む供給の行先で、当年国内生産を直接追跡した分割ではない。',
            '輸出は国産原料だけの追跡量ではなく、この表で再輸出を分離できない。国内利用は原表Domestic Use合計。',
            '同年度・同綿繊維基準の全相手数量は未収録。2025暦年GATSの綿花輸出先をこの年度輸出の内訳にしない。',
        ],
    })
    return {'schemaVersion':1, 'records':sorted(result, key=lambda row:(row['countryCode'],row['seriesId'])),
            'method':'保存済みWASDE675の同頁2024/25国別行とWorld公表行を厳密解析。数量・原line・原桁を保持。別年・国合計World・後年予測・全相手未収録の補完はしない。'}


def main():
    result = parse((ROOT / SOURCE).read_bytes())
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
    print(json.dumps({'records':len(result['records']), 'countries':sorted({r['countryCode'] for r in result['records']}),
                      'seriesIds':sorted({r['seriesId'] for r in result['records']})}))


if __name__ == '__main__':
    main()
