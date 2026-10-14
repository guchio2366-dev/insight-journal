#!/usr/bin/env python3
"""Build the seven approved Mexico resource/material industries from saved source rows.

Only this module's data and resources-* provenance assets are written. This script
does not fetch revised source data silently: source snapshots have their own years.
"""
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas/mexico-industry-adopted'
OUTPUT = ROOT / 'src/data/atlas/mexico/industry-adopted-resources.json'
STATES = [f'{i:02d}' for i in range(1, 33)]
STATE_NAMES = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Coahuila', 'Colima', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas']
STATE_CODES = dict(zip(STATE_NAMES, STATES))


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def read_sources():
    facts = json.loads((ASSETS / 'resources-statistics-original-rows.json').read_text())
    raw = (ASSETS / 'resources-sgm-2024-original-extract.txt').read_text()
    lines = {}
    for line in raw.splitlines():
        match = re.match(r'L(\d+)@P[^:]+: (.*)', line)
        if match:
            lines[int(match[1])] = match[2]
    ce = json.loads((ASSETS / 'resources-ce-steel-response.json').read_text())
    etef = json.loads((ASSETS / 'resources-etef-industry-catalog-2025.snapshot.json').read_text())
    return facts, lines, ce, etef


def oil_export_map(etef, source):
    """Reuse legacy ETEF211 amounts; missing/threshold cells never become zero."""
    metric = next(item for item in etef['metrics'] if item['id'] == 'oil-gas')
    if etef['year'] != 2025 or metric['sourceCodes'] != ['211'] or etef['conversionDivisor'] != 1000000:
        raise ValueError('Unexpected ETEF source year/classification/units')
    if [row['id'] for row in etef['rows']] != STATES:
        raise ValueError('ETEF snapshot must retain all 32 state rows')
    values, originals = [], []
    for row in etef['rows']:
        original = row['values']['oil-gas']
        originals.append({'state': row['id'], **original})
        status = original['status']
        if status in ('available', 'zero'):
            value = original['value']
            if value is None or original['sourceStatus'] != 'Disponible':
                raise ValueError('ETEF public value/source status mismatch')
            if abs(value - original['sourceValue'] / etef['conversionDivisor']) > 1e-12:
                raise ValueError('ETEF source/display conversion differs')
            if (status == 'zero') != (value == 0):
                raise ValueError('ETEF zero must be an original public numeric zero')
        else:
            value = None
            status = 'confidential' if status == 'confidential' else 'unknown'
        values.append({'state': row['id'], 'value': value, 'status': status,
                       'note': '原状態: ' + original['status'] + ' / ' + original['sourceStatus'] + '。' + original['publicationStatus']})
    return {'kind': 'quantity', 'year': 2025, 'unit': '10億USD（FOB輸出価額）',
            'definition': 'ETEF2025年暫定、SCIAN211の採掘財FOB輸出価額をRENEMに結合した事業所情報から生産地の州へ配分。生産量・業種総生産額・GDP・国内精製量ではありません。RENEMに結合できない通関取引と商業・サービスは対象外。原典の千USDを1000000で割って10億USDへ変換。欠測・閾値未満を0に置換せず、公開州の合計を全国分母・全国比に使いません。',
            'sourceIds': [source], 'values': values, 'regions': []}, originals


def sgm_map(lines, start, end, source, unit):
    """Keep literal '-' and unlisted states as unknown; never fill a residual."""
    values = {state: {'state': state, 'value': None, 'status': 'unknown'} for state in STATES}
    national = None
    rows = []
    for index in range(start, end + 1):
        line = lines[index]
        match = re.match(r'(.+?)\s+(?=[\d.-])(.+)$', line)
        if not match:
            raise ValueError(f'Cannot decode source row {index}: {line}')
        name, rest = match.groups()
        cells = re.findall(r'(?:\d+(?: \d{3})*)?\.\d+|-', rest)
        if len(cells) != 5:
            raise ValueError(f'Expected five annual cells in row {index}: {cells}')
        last = cells[-1]
        value = None if last == '-' else float(last.replace(' ', ''))
        rows.append({'sourceLine': index, 'name': name, '2024Raw': last, 'value': value})
        if name == 'Total:':
            national = value
        else:
            state = STATE_CODES[name]
            values[state] = {'state': state, 'value': value, 'status': 'unknown' if value is None else 'zero' if value == 0 else 'available'}
    if national is None:
        raise ValueError('National production row absent')
    disclosed = sum(v['value'] for v in values.values() if v['value'] is not None)
    if abs(disclosed - national) > 0.05:
        raise ValueError(f'SGM published sum differs: {disclosed} / {national}')
    return {'kind': 'quantity', 'year': 2024, 'unit': unit, 'nationalTotal': national,
            'definition': 'SGM・DGMの2024年暫定採掘系列の金属含有量。鉱石の総重量・埋蔵量・精製量ではありません。全国分母も同じ表の2024年採掘系列。未掲載州と原表の「-」は不明として残し、0に置換しません。',
            'sourceIds': [source], 'values': list(values.values()), 'regions': []}, rows


def ce_number(cell):
    text = cell.split('|', 1)[0].strip()
    if text == '-':
        return None, 'confidential'
    if text in ('SD', '', 'ND'):
        return None, 'unknown'
    number = float(text.replace(',', ''))
    return number, 'zero' if number == 0 else 'available'


def steel_map(ce):
    expected = ['31-33 Industrias manufactureras', '3311 Industria básica del hierro y del acero', '3312 Fabricación de productos de hierro y acero']
    if ce['stub'][1]['label'] != expected or ce['rowCount'] != 99 or ce['colCount'] != 2:
        raise ValueError('Unexpected CE response dimensions/classifications')
    values, rows = [], []
    for i, label in enumerate(ce['stub'][0]['label']):
        state = label[:2]
        components = [ce_number(ce['data'][i * 6 + offset]) for offset in (2, 4)]
        if any(status == 'confidential' for _, status in components):
            value, status = None, 'confidential'
        elif any(value is None for value, _ in components):
            value, status = None, 'unknown'
        else:
            value = sum(number for number, _ in components)
            status = 'zero' if value == 0 else 'available'
        rows.append({'state': state, 'name': label, '3311EmploymentRaw': ce['data'][i * 6 + 2], '3312EmploymentRaw': ce['data'][i * 6 + 4], 'value': value, 'status': status})
        if state == '00':
            national = value
            gva = sum(ce_number(ce['data'][i * 6 + offset])[0] for offset in (3, 5))
            manufacture_gva = ce_number(ce['data'][1])[0]
        else:
            values.append({'state': state, 'value': value, 'status': status})
    if national != 81281 or abs(gva - 158734.708) > 0.001 or len(values) != 32:
        raise ValueError('Verified national steel figures changed')
    return {'kind': 'employment', 'year': 2023, 'unit': '人', 'nationalTotal': national,
            'definition': 'CE2024で調べた2023年の鉄鋼基本3311＋鉄鋼製品3312の総従事者数。両業種が公開数値の州だけ合計し、原表「-」は秘匿、SDは不明として保持します。公開州だけの合計を全国分母にしません。粗鋼トン数の地図ではありません。',
            'sourceIds': ['mx-resource-ce-steel'], 'values': values, 'regions': []}, rows, gva, manufacture_gva


def build():
    f, lines, ce, etef = read_sources()
    sources = {}

    def source(id, title, url, year, scope):
        sources[id] = {'title': title, 'url': url, 'year': year, 'scope': scope}
        return id

    sgm_url = f['sgm']['url']
    sgm_value = source('mx-resource-sgm-value', 'SGM 鉱業・冶金生産の数量・評価額（表1.2、p46）', sgm_url + '#page=46', 2024, '精製金属＋輸出向け初回製錬金属・精鉱・沈殿物の含有金属。国際相場で評価した総生産価額。GDP・付加価値ではない。2024年暫定値。原表の編纂時点注記は「septiembre 2024」。')
    source('mx-resource-sgm-definition', 'SGM 鉱業・冶金系列の定義（用語集p517）', sgm_url + '#page=517', 2024, '採掘全量と処理後の鉱業・冶金生産は加工段階・集計範囲が異なる。')
    sgm_gdp = source('mx-resource-sgm-gdp', 'SGM 国内GDPと石油・ガス採掘GDP（表2.1、p14）', sgm_url + '#page=14', 2024, '2018年価格の実質GDP。SCIAN211は石油・ガス採掘のみで製油所を含まない。')
    sgm_trade = source('mx-resource-sgm-trade', 'SGM 品目分類別輸出額（p233）', sgm_url + '#page=233', 2024, 'SGMが選択した関税品目群、米ドル現在価格。採掘・精鉱・地金・加工品・スクラップ等を含む範囲が品目により異なる。国全体の同一段階金属輸出量とはみなさない。')
    maps, original_rows = {}, {}
    for id, label, start, end, page, unit in [('copper', '銅', 3155, 3174, 100, 't（銅含有量）'), ('gold', '金', 3325, 3344, 106, 'kg（金含有量）'), ('silver', '銀', 3388, 3408, 108, 'kg（銀含有量）'), ('zinc', '亜鉛', 3568, 3584, 114, 't（亜鉛含有量）')]:
        sid = source('mx-resource-sgm-' + id + '-mine', 'SGM ' + label + 'の州別採掘量（p' + str(page) + '）', sgm_url + '#page=' + str(page), 2024, 'DGM等の2024年暫定採掘金属含有量。掲載州の同年数量と全国Totalを抽出。USGS/Metals Focusとは同じ年でも情報源・集計範囲が異なるため接合しない。')
        maps[id], original_rows[id] = sgm_map(lines, start, end, sid, unit)
    pemex = source('mx-resource-pemex-2025', 'PEMEX 2025年20-F、採掘・ガス処理・石油精製', f['pemex']['url'], 2025, 'PEMEX単社の工程別実績。製油所データはメキシコ国内National Refining System、米国Deer Parkを除外。処理量は実際の原油投入量で能力ではない。個別製油所処理量は丸め値。上流ガスと乾性ガスは別工程。原表本文は検索抽出で確認。直接HTML表示は取得制限あり。')
    sener = source('mx-resource-sener-gas', 'SENER エネルギー部門計画2025–2030、2024年ガス需給', f['sener']['url'], 2024, '全国ガス消費と輸入の年平均MMpcd。輸入÷消費は輸入依存の目安で、国内生産品の国内仕向け割合ではない。')
    gas_now = source('mx-resource-gas-concentration', 'エネルギー省説明、2026年4月8日記者会見', f['presidencia']['url'], '2026-04-08', '当時の状況を説明した概数。2025年通年統計ではない。米国由来ガスの消費比75%、輸入のTexas比80%、5入口への集中はほぼ70%。')
    eia = source('mx-resource-eia-gas', 'EIA 米国の国別天然ガス輸出・年間表', f['eia']['url'], 2025, '米国からメキシコへのパイプラインガス輸出。百万立方フィート/年。LNGを含むメキシコ全輸入量とは別。')
    opec_mx = source('mx-resource-opec-mexico-crude', 'OPEC ASB2026 メキシコ原油産出', f['opec']['MexicoUrl'], 2025, '原油のみの百万b/d。コンデンセート・NGLを含まない。公表値は小数2桁への丸め。')
    opec_world = source('mx-resource-opec-world-crude', 'OPEC ASB2026 世界原油産出', f['opec']['worldUrl'], 2025, '世界原油のみの百万b/d。メキシコと同じ原油系列。')
    banxico = source('mx-resource-banxico-ca176', 'Banxico CA176 財貿易（最新修正表）', f['banxico']['url'], 2025, '2026年10月14日取得の2025年通年値、百万米ドル。石油貿易分類は原油とその他石油を含み、燃料のみの分類ではない。初報の全国総輸出664,837百万から改定済み。')
    gold_trade = source('mx-resource-banxico-gold', 'Banxico 2026年第2四半期BOP、表A1（p7）', f['goldTrade']['url'] + '#page=7', 2025, '2025年通年の非貨幣金輸出入価額。採掘金量・国内冶金評価額・SGMの狭い金関税群とは異なる分類。')
    usgs = {}
    for id, label in [('gold', '金'), ('copper', '銅'), ('zinc', '亜鉛')]:
        usgs[id] = source('mx-resource-usgs-' + id, 'USGS MCS2026 ' + label + '・世界生産表', 'https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-' + id + '.pdf', 2025, '2025eの鉱山産出推計、金属含有量。銅は鉱山と精製を別列として保持。世界分母は同表の丸め値。原PDFの表見出しと行を検索抽出で確認したが直接表示はHTTP403、画像照合・全PDF保存は未完了。')
    si = source('mx-resource-silver-survey', 'Silver Institute World Silver Survey2026 Appendix12b', f['silverSurvey']['url'], 2025, 'Metals Focusの2025年鉱山産出量。USGSの年初推計6300tとは出典・公表時点が異なる。原表を検索抽出で確認、直接PDFはHTTP403で画像照合できていない。')
    si_demand = source('mx-resource-silver-demand', 'Silver Institute 2026年4月15日、2025年需給発表', f['silverDemand']['url'], 2025, '世界の工業銀需要。太陽電池の省銀化・代替を含むため太陽光設備拡大と銀需要増を同一視しない。')
    iea = source('mx-resource-iea-copper', 'IEA Global Critical Minerals Outlook2026', f['iea']['url'], 2026, '発表済み案件と報告書の需要シナリオに基づく将来の銅一次供給不足推計。現時点の実績不足率ではない。')
    steel_source = source('mx-resource-worldsteel', 'worldsteel World Steel in Figures2026', f['worldsteel']['url'], 2025, '粗鋼、生産方式、完成鋼の見かけ消費、鋼材貿易は別の表・工程。世界粗鋼1848.9Mtを分母に使用。鋼材貿易から粗鋼の国内仕向けを計算しない。')
    ce_source = source('mx-resource-ce-steel', 'INEGI CE2024 確報、鉄鋼基本3311＋鉄鋼製品3312', 'https://www.inegi.org.mx/app/tabulados/interactivos/?bd=CE2024&px=CE_GENNCE_1', 2023, '2023年の総従事者数と名目の付加価値VACB、全国＋32州、3311・3312・製造業全体をPOST原票から取得。国全体GDPとは異なるセンサス対象範囲。秘匿「-」とSDを保持。')
    etef_source = source('mx-resource-etef-oil-gas', 'INEGI ETEF2025、SCIAN211・州別採掘財FOB輸出価額', etef['source']['url'], 2025, '既存industry-catalog.jsonの2025年暫定値をそのまま保存して再使用。RENEMに結合した事業所から財輸出を生産地配分。RENEMに結合できない通関取引・商業・サービスを除外。原典単位は千USD、表示は10億USD。公開値・秘匿・不明を維持し、500USD未満等の特殊状態は欠測扱いで原状態を保存。全国分母なし。')
    etef_snapshot = ASSETS / 'resources-etef-industry-catalog-2025.snapshot.json'
    sources[etef_source].update({'snapshotFile': str(etef_snapshot.relative_to(ROOT)), 'sha256': sha256(etef_snapshot.read_bytes()).hexdigest(), 'metadataUrl': etef['source']['metadataUrl'], 'downloadUrl': etef['source']['downloadUrl']})

    def indicator(label, value, unit, year, definition, ids, status='observed', denominator=None, note=None):
        item = {'label': label, 'value': value, 'unit': unit, 'year': year, 'definition': definition, 'sourceIds': ids if isinstance(ids, list) else [ids], 'status': status}
        if denominator is not None:
            item['denominator'] = denominator
        if note is not None:
            item['note'] = note
        return item

    def unconfirmed(label, unit, year, definition, ids):
        return indicator(label, None, unit, year, definition, ids, 'unconfirmed', note='未確認。0や生産量−輸出量で補完しません。')

    def region(state, stage, note, ids):
        return {'state': state, 'stage': stage, 'note': note, 'sourceIds': ids if isinstance(ids, list) else [ids]}

    def guide(year, definition, ids, regions):
        return {'kind': 'guide', 'year': year, 'unit': '地域案内', 'definition': definition, 'sourceIds': ids, 'values': [], 'regions': regions}

    industries = []
    def industry(id, label, family, sectors, overview, why, process, boundary, map_, domestic, world, trade):
        industries.append({'id': id, 'label': label, 'family': family, 'sectors': sectors, 'overview': overview, 'why': why, 'process': process, 'boundary': boundary, 'map': map_, 'statistics': {'domestic': domestic, 'world': world, 'trade': trade}})

    oil = f['opec']; gas = f['sener']; bx = f['banxico']; gdp = f['sgm']['GDP']; press = f['presidencia']
    industry('oil-gas', '石油・天然ガス', 'energy', ['resources'],
             '南東部・メキシコ湾の石油・ガスを、精製・発電・産業への供給につなげて読みます。北部の米国ガス受入れも扱います。',
             '採掘GDPは全国の約2.30%（2024年実質系列）。一方、ガス輸入量は消費の約72.6%に相当し、原油生産国でも燃料・ガスを輸入する構造を説明できます。',
             '原油・ガスの採掘 → 分離・脱水・ガス処理 → 製油所・ガス導管 → 発電・熱・石油化学。原油と利用可能なガスの工程を分けます。',
             '原油のみ、コンデンセート込み液体、未処理ガス、乾性ガスは別系列。州案内は産業地域例で、海上採掘量を隣接州へ配分した地図ではありません。国内生産品の国内仕向け量は未確認。',
             guide('2024/2026-04-08', '生産・処理・輸入の地域例。州別の同工程生産量は未取得のため、点の大きさを量に対応させません。', [sener, gas_now], [region('04', '採掘', 'カンペチェ周辺と湾岸の油田を読む案内。海上油田の州別量は割り当てません。', sener), region('27', '採掘・処理', 'タバスコの南東部陸上生産と処理を読む案内。', sener), region('30', 'ガス・石油化学', 'ベラクルスのガス供給と下流加工をつなぎます。', sener), region('28', 'ガス輸入', 'Camargo・Matamorosの入口。米国からの受入れ工程を読む案内。', gas_now), region('08', 'ガス輸入', 'Ojinaga・San Isidroの入口。採掘量の表示ではありません。', gas_now), region('02', 'ガス輸入', 'Los Algodonesの入口を読む案内。', gas_now)]),
             [indicator('石油・ガス採掘GDP', gdp['oilGas'], '百万MXN（2018年価格）', 2024, 'SCIAN211の実質GDP。製油・発電を除く。', sgm_gdp, denominator={'label': '全国実質GDP', 'value': gdp['national'], 'unit': '百万MXN（2018年価格）'}), indicator('全国GDPに占める採掘比', gdp['oilGas'] / gdp['national'] * 100, '%', 2024, '583823÷25437866×100。同年・同価格のGDPを比較。', sgm_gdp), indicator('全国の天然ガス消費', gas['gasConsumption'], '百万立方フィート/日', 2024, 'SENERの2024年全国消費。', sener), unconfirmed('国内生産ガスの国内仕向け', '百万立方フィート/日', 2024, '国内生産由来のガスが国内需要へ向かう量。見かけ消費と区別。', sener)],
             [indicator('原油生産量', oil['MexicoCrude'], '百万b/d', 2025, '原油のみ、コンデンセート・NGLを除く。世界比は約1.96%。丸め値の比率。', [opec_mx, opec_world], denominator={'label': '世界原油生産量', 'value': oil['worldCrude'], 'unit': '百万b/d'}), indicator('世界原油生産シェア', oil['MexicoCrude'] / oil['worldCrude'] * 100, '%', 2025, '1.47÷74.85×100。原油のみの同工程比較。', [opec_mx, opec_world])],
             [indicator('全国原油輸出額', bx['crudeExports'], '百万USD', 2025, 'CA176原油貿易価額。量・PEMEX単社売上とは別。', banxico, denominator={'label': '全国財輸出額', 'value': bx['allGoodsExports'], 'unit': '百万USD'}), indicator('全国財輸出に占める原油', bx['crudeExports'] / bx['allGoodsExports'] * 100, '%', 2025, '14818÷664267×100、最新改定分母。', banxico), indicator('天然ガス輸入量', gas['gasImports'], '百万立方フィート/日', 2024, '全国のガス輸入。2024年消費8845を分母にすると約72.6%。', sener, denominator={'label': '全国ガス消費', 'value': gas['gasConsumption'], 'unit': '百万立方フィート/日'}), indicator('ガス輸入量/消費量', gas['gasImports'] / gas['gasConsumption'] * 100, '%', 2024, '6424÷8845×100。国内生産品の輸出・国内仕向け比ではない。', sener), indicator('米国からの導管ガス', f['eia']['USPipelineExportsToMexico'] / 365, '百万立方フィート/日', 2025, '年間2422839百万立方フィート÷365日。米国輸出側の導管ガスのみ。', eia), indicator('ガス消費の米国由来比', press['USGasConsumptionSharePct'], '%', press['year'], '当日の政府説明による概数。通年値ではない。', gas_now, 'estimate'), indicator('輸入ガスのTexas集中', press['TexasImportSharePct'], '%', press['year'], '政府説明。分母は輸入ガス。残る約20%はCalifornia。', gas_now, 'estimate'), indicator('ガスの5入口への集中', press['top5EntriesSharePct'], '%', press['year'], '22入口のうち5入口でほぼ70%。ほぼという概数を保持。', gas_now, 'estimate')])

    pem = f['pemex']
    oil_industry = next(item for item in industries if item['id'] == 'oil-gas')
    old_gas_regions = oil_industry['map']['regions']
    oil_map, oil_export_rows = oil_export_map(etef, etef_source)
    oil_map['regions'] = [region(state, '採掘財輸出', note, etef_source) for state, note in [('04', 'カンペチェ。生産地に配分された採掘財のFOB輸出価額を読む地域例。海上採掘量の州別割当てではありません。'), ('27', 'タバスコ。採掘財の輸出価額を比べます。国内精製量ではありません。'), ('30', 'ベラクルス。採掘財の輸出価額を読む地域例。'), ('07', 'チアパス。公開された採掘財の輸出価額を読む地域例。')]]
    oil_map['regions'].extend({**item, 'note': item['note'] + 'この輸入地域案内は、地図のSCIAN211輸出価額とは別の工程です。'} for item in old_gas_regions if item['stage'] == 'ガス輸入')
    oil_industry['map'] = oil_map
    oil_industry['boundary'] = '地図は2025年暫定の採掘財FOB輸出価額で、生産量・GDP・国内精製量ではありません。RENEM対象範囲内の生産地配分で、全国分母を持たず公開州合計から全国比を作りません。原油のみ、コンデンセート込み液体、未処理ガス、乾性ガスは別系列。ガス輸入の地域案内は別工程。国内生産品の国内仕向け量は未確認。'
    oil_industry['statistics']['domestic'][2:2] = [
        indicator('PEMEX原油・コンデンセート産出', pem['crudeAndCondensatesProduction'], '千b/d', 2025, 'PEMEX単社の液体炭化水素。全国原油のみのOPEC値とは対象と工程範囲が異なる。', pemex),
        indicator('PEMEX採掘ガス産出', pem['rawGasProductionMMcfPerDay'], '百万立方フィート/日', 2025, 'Exploration and Extractionの天然ガス産出。乾性ガス生産量・全国の利用可能ガス量ではない。', pemex),
        indicator('PEMEX処理後の乾性ガス', pem['dryGasProductionMMcfPerDay'], '百万立方フィート/日', 2025, 'Energy Transformationのメタン含有率90%超の乾性ガス。再注入エタンを含む。上流全ガスと集計工程が異なり、両値の比を回収率としない。', pemex),
    ]
    ref_states = {'13', '20', '19', '27', '11', '28', '30'}
    runs = {row['state']: row['value'] for row in pem['highestRuns']}
    ref_values = [{'state': state, 'value': runs.get(state), 'status': 'available' if state in runs else 'unretrieved' if state in ref_states else 'unknown'} for state in STATES]
    refinery_map = {'kind': 'quantity', 'year': 2025, 'unit': '千b/d（原油処理）', 'nationalTotal': pem['crudeRuns'], 'definition': 'PEMEX国内７製油所のある州のみを対象とする実際の年平均原油処理量。本文掲載の５製油所は丸め値、MaderoとMinatitlánの個別量は未取得。他25州はこの製油所網の処理量を収録せず、不明として保持します。施設の非所在を数値0に置換せず、メキシコ全産業の無生産を示しません。設備能力・全国の全企業生産とは別。', 'sourceIds': [pemex], 'values': ref_values, 'regions': [region('13', '精製', 'Tula。原油処理量212千b/d（丸め値）。', pemex), region('20', '精製', 'Salina Cruz。201千b/d（丸め値）。', pemex), region('19', '精製', 'Cadereyta。146千b/d（丸め値）。', pemex), region('27', '精製', 'Olmeca（Dos Bocas）。134千b/d（丸め値）。', pemex), region('11', '精製', 'Salamanca。117千b/d（丸め値）。', pemex), region('28', '精製', 'Madero。個別処理量は未取得。', pemex), region('30', '精製', 'Minatitlán。個別処理量は未取得。', pemex)]}
    industry('refining', '石油精製', 'energy', ['resources', 'manufacturing'],
             '原油をガソリン・軽油などの燃料へ変える工程と、国内製油所・燃料輸入を比較します。',
             '原油を産出しても製品の供給は精製と輸入に左右されます。国内処理量1013.8千b/dと石油貿易赤字を並べ、採掘と使える燃料の違いを示します。',
             '原油受入れ → 蒸留 → 脱硫・分解・改質 → ガソリン・軽油・ジェット燃料 → 配送・需要地。石油化学の原料にもつながります。',
             '地図の処理量はPEMEX国内７製油所のある州が対象。他州のネットワーク非所在をメキシコ全産業の無生産とみなさず、数値0にも置換しません。生産能力、採掘量、米国Deer Parkの生産とは別。燃料の全国輸入依存率や国内産燃料の国内仕向け量は未確認。', refinery_map,
             [indicator('国内製油所の原油処理', pem['crudeRuns'], '千b/d', 2025, 'PEMEX National Refining Systemの実際の原油処理。設備能力ではない。', pemex), indicator('国内ガソリン生産', pem['gasoline'], '千b/d', 2025, 'PEMEX国内網のTotal Gasoline。Deer Parkを除く。', pemex), indicator('国内軽油生産', pem['diesel'], '千b/d', 2025, 'PEMEX国内網のTotal Diesel。Deer Parkを除く。', pemex), unconfirmed('国内産燃料の国内仕向け', '千b/d', 2025, '国内生産由来燃料の国内販売・使用量。輸入混合販売や在庫を除く必要がある。', pemex)],
             [unconfirmed('同工程の世界生産シェア', '%', 2025, '国内原油処理量と同じ工程・対象の世界分母を未確認。', pemex)],
             [indicator('全国石油分類の輸出額', bx['oilExports'], '百万USD', 2025, '原油とその他石油を含むCA176分類。精製燃料だけの輸出ではない。', banxico), indicator('全国石油分類の輸入額', bx['oilImports'], '百万USD', 2025, 'CA176石油分類。燃料だけの輸入価額とは異なる。', banxico), indicator('全国石油貿易収支', bx['oilBalance'], '百万USD', 2025, '原表の公表収支。各系列の丸めのため21245−46797と1百万USDずれる。', banxico), unconfirmed('燃料輸入の全国依存率', '%', 2025, '製品別の全国需給・在庫・輸出をそろえた比率を未確認。', banxico)])

    metallurgical_note = 'SGM表1.2の鉱業・冶金系列。精製金属と輸出向け初回製錬・精鉱等の含有金属を国際相場で評価。GDP/GVAや採掘総量ではない。'
    mineral_defs = {
        'silver': ('銀', '銀鉱山と多金属鉱山の共産を、精製・電子部品・太陽電池・貴金属需要へつなぎます。', '世界鉱山産出の約20.42%を供給する最大生産国。国内の鉱業・冶金評価額でも約21.84%を占め、世界供給と地域経済の両面を読めます。', '採掘 → 選鉱・精鉱 → 製錬・精製銀 → 電気接点・電子部品・太陽電池・宝飾。金・鉛・亜鉛・銅の鉱山からの共産もあります。'),
        'copper': ('銅', 'ソノラを中心とする銅採掘から、精鉱・精製銅・電線・送電機器へつなぎます。', '世界鉱山産出の約3%、国内鉱業・冶金評価額の約26.45%。採掘と精製の世界比が異なり、電動化・送電網を支える工程の分担を説明できます。', '採掘 → 選鉱・精鉱 → 製錬・電解精製、または浸出・電解採取 → 銅線・電線・送電機器。地図は採掘工程を表示します。'),
        'gold': ('金', 'ソノラ・サカテカスなどの金採掘を、地金・宝飾・投資・電子材料へつなぎます。', '世界鉱山産出の約4.24%、国内鉱業・冶金評価額では最大の約30.74%。国内生産の評価と非貨幣金の外貨獲得を別の統計で読めます。', '採掘 → 選鉱・浸出 → ドーレ（金銀合金） → 精製金 → 宝飾・地金・電子部品。採掘金とリサイクル金・中央銀行保有金を区別します。'),
        'zinc': ('亜鉛', 'サカテカスなどの鉛・亜鉛・銀を含む鉱山から、鋼材の防食へつなぎます。', '世界鉱山産出の約6%を担い、国内鉱業・冶金評価額は約6.84%。自動車・建設向けの亜鉛めっき鋼材を介して鉄鋼と重複して扱えます。', '採掘 → 選鉱・亜鉛精鉱 → 製錬・精製亜鉛 → 鋼材の亜鉛めっき・合金。多金属鉱山の銀・金と鉱床・工程を共有します。')
    }
    examples = {'silver': [('32', '銀と多金属採掘', 'サカテカス、Fresnillo・Mazapilなどを読む案内。'), ('08', '銀採掘', 'チワワの銀と多金属採掘。')], 'copper': [('26', '銅採掘', 'ソノラ、Cananea・Nacozari周辺を読む案内。'), ('32', '多金属採掘', 'サカテカスの銅を含む採掘。')], 'gold': [('26', '金採掘', 'ソノラの金採掘。'), ('32', '金・銀採掘', 'サカテカスの金・銀・多金属採掘。'), ('12', '金採掘', 'ゲレロの金採掘。')], 'zinc': [('32', '鉛・亜鉛・銀採掘', 'サカテカスの多金属採掘。'), ('08', '鉛・亜鉛採掘', 'チワワの多金属採掘。')]}
    for id, (label, overview, why, process) in mineral_defs.items():
        mine_sid = 'mx-resource-sgm-' + id + '-mine'
        map_ = maps[id]
        map_['regions'] = [region(state, stage, note, mine_sid) for state, stage, note in examples[id]]
        valuation = f['sgm']['mineroMetallurgical'][id]
        total_valuation = f['sgm']['mineroMetallurgical']['total']
        domestic = [indicator('全国採掘量（地図と同じ系列）', map_['nationalTotal'], map_['unit'], 2024, 'SGM・DGMの同年採掘含有金属量。地図の全国分母。', mine_sid), indicator('鉱業・冶金生産の評価額', valuation, '百万MXN（現在価格）', 2024, metallurgical_note, [sgm_value, 'mx-resource-sgm-definition'], denominator={'label': '同系列の全品目評価額', 'value': total_valuation, 'unit': '百万MXN（現在価格）'}), indicator('同系列評価額に占める比率', valuation / total_valuation * 100, '%', 2024, '品目の鉱業・冶金評価額÷同系列全品目312461.2395百万MXN。GDP構成比ではない。', sgm_value), unconfirmed(label + '単独の国内付加価値', '百万MXN', 2024, '品目単独の付加価値は未確認。広い鉱業GDPや総生産価額を代用しない。', sgm_value), unconfirmed('国内生産品の国内仕向け', map_['unit'], 2024, '同じ金属含有量・工程で国内生産由来の国内使用を追う量。在庫、輸入由来の再輸出を区別。', [mine_sid, sgm_trade])]
        international = f['silverSurvey'] if id == 'silver' else f['usgs'][id]
        sid = si if id == 'silver' else usgs[id]
        unit = 't（' + label + '含有量）' if id in ('gold', 'silver') else '千t（' + label + '含有量）'
        status = 'observed' if id == 'silver' else 'estimate'
        world = [indicator('鉱山産出量・世界比較', international['Mexico'], unit, 2025, '同じ出典・工程の世界分母で比較。SGM州別採掘系列・冶金系列とは接合しない。', sid, status, denominator={'label': '同表の世界鉱山産出量', 'value': international['world'], 'unit': unit}), indicator('世界鉱山産出シェア', international['Mexico'] / international['world'] * 100, '%', 2025, 'メキシコ鉱山産出量÷同出典世界量×100。', sid, status), indicator('世界鉱山産出順位', international['rank'], '位', 2025, '同じ世界表の国別産出量順位。', sid, status)]
        if id == 'copper':
            cu = f['usgs']['copper']
            world.extend([indicator('精製銅の生産量', cu['refinedMexico'], '千t（銅含有量）', 2025, 'USGSのRefinery production列。地図の採掘量と別工程。', sid, 'estimate', denominator={'label': '世界精製銅生産量', 'value': cu['refinedWorld'], 'unit': '千t（銅含有量）'}), indicator('精製銅の世界シェア', cu['refinedMexico'] / cu['refinedWorld'] * 100, '%', 2025, '480÷29000×100。採掘シェアとは別。', sid, 'estimate'), indicator('将来の世界一次銅供給不足', f['iea']['copperProjectedGapPct'], '%', 2035, '発表済み案件と需要シナリオに基づく2035年推計。2025年の不足実績ではない。', iea, 'estimate')])
        if id == 'silver':
            world.extend([indicator('世界の工業銀需要', f['silverDemand']['industrialMoz'], '百万トロイオンス', 2025, '世界工業用途の銀需要。鉱山供給とは別指標。', si_demand), indicator('工業銀需要の前年比', f['silverDemand']['industrialChangePct'], '%', 2025, '太陽電池の省銀化・代替などで工業需要は3%減。', si_demand)])
        if id == 'gold':
            trade = [indicator('全国の非貨幣金輸出額', f['goldTrade']['exports'], '百万USD', 2025, 'Banxico BOP表A1、非貨幣金の全国輸出。採掘金量やSGM金分類とは別。', gold_trade, denominator={'label': '全国財輸出額', 'value': bx['allGoodsExports'], 'unit': '百万USD'}), indicator('全国の非貨幣金輸入額', f['goldTrade']['imports'], '百万USD', 2025, 'BOPの非貨幣金輸入。原料金量や国内需要量と同一ではない。', gold_trade)]
        else:
            trade = [indicator('SGM品目群の輸出額', f['sgm']['trade'][id] / 1000000, '百万USD', 2024, 'SGMが選択した' + label + '関税品目群の価額。工程の異なる品目を含み、全国同段階の金属輸出量ではない。', sgm_trade)]
        trade.extend([unconfirmed('同工程の金属輸出量', unit, 2025, '精鉱・地金・加工品を同じ含有金属量と工程へそろえた輸出量は未確認。', [sid, sgm_trade]), unconfirmed('輸出先の国別構成', '%', 2025, '国別輸出の関税品目と製品段階の統一が未完了。米国の輸入相手比をメキシコ輸出先比として使わない。', sgm_trade)])
        boundary = '地図は2024年SGM採掘系列、評価額は同年の鉱業・冶金系列、世界比は2025年の別出典系列です。加工段階・集計範囲・年を区別します。鉱石重量や埋蔵量を金属産出量として使いません。原PDF直接表示が403の世界表は検索抽出確認で、画像照合は未完了です。'
        industry(id, label, 'minerals', ['resources', 'manufacturing'] if id == 'copper' else ['resources'], overview, why, process, boundary, map_, domestic, world, trade)

    st_map, steel_rows, steel_gva, manufacturing_gva = steel_map(ce)
    st_map['regions'] = [region('19', '鉄鋼基本・鋼材加工', 'ヌエボレオン。両対象業種の雇用公開値を合計できます。', ce_source), region('16', '鉄鋼基本・鋼材加工', 'ミチョアカン。粗鋼工程から鋼材加工へつなぐ地域例。', ce_source), region('05', '鋼材加工', 'コアウイラ。3312雇用は公開、合計は3311がSDのため不明として保持。', ce_source)]
    st = f['worldsteel']
    industry('steel', '鉄鋼・鋼材', 'materials', ['manufacturing'],
             '鉄鉱石・還元鉄・スクラップを粗鋼・鋼材へ変え、自動車・建設の素材供給へつなぎます。',
             '世界粗鋼の約0.73%でも、完成鋼の見かけ消費25.0Mtと鋼材純輸入11.8Mtを持つ供給網の結節です。電炉比95.9%から電力・ガス・還元鉄・スクラップの調達を考えます。',
             '鉄鉱石 → 還元鉄、またはスクラップ → 電炉等で粗鋼 → 圧延・鋼管・鋼材 → 自動車・機械・建設。亜鉛めっきで亜鉛産業とも接続します。',
             '地図は2023年の3311＋3312従事者数。2025年の粗鋼量、完成鋼見かけ消費、鋼材貿易は工程・範囲が異なります。粗鋼13.5＋純輸入11.8を同じ物量として加算しません。', st_map,
             [indicator('鉄鋼基本・鋼材製造の従事者', st_map['nationalTotal'], '人', 2023, 'CE2024確報の総従事者。3311の16312＋3312の64969。', ce_source), indicator('鉄鋼基本・鋼材の付加価値', steel_gva, '百万MXN（現在価格）', 2023, 'CEのVACB。3311の64703.574＋3312の94031.134。国民経済計算GDPではない。', ce_source, denominator={'label': 'CE製造業全体のVACB', 'value': manufacturing_gva, 'unit': '百万MXN（現在価格）'}), indicator('CE製造業付加価値に占める比', steel_gva / manufacturing_gva * 100, '%', 2023, '158734.708÷5390947.292×100。同じCE対象範囲で比較。', ce_source), indicator('完成鋼の見かけ消費', st['apparentUseFinished'], '百万t（完成鋼）', 2025, 'worldsteelのApparent steel use。国内生産由来の国内仕向けではない。', steel_source), unconfirmed('国内産鋼材の国内仕向け', '百万t', 2025, '同じ製品段階で国内生産由来の国内使用を追う統計は未確認。', steel_source)],
             [indicator('粗鋼生産量', st['MexicoCrude'], '百万t（粗鋼）', 2025, '能力ではなく粗鋼生産。世界比約0.73%。', steel_source, denominator={'label': '世界粗鋼生産量', 'value': st['worldCrude'], 'unit': '百万t（粗鋼）'}), indicator('世界粗鋼生産シェア', st['MexicoCrude'] / st['worldCrude'] * 100, '%', 2025, '13.5÷1848.9×100。', steel_source), indicator('世界粗鋼生産順位', st['rank'], '位', 2025, 'worldsteel国別粗鋼表。', steel_source), indicator('粗鋼の電炉比', st['electricPct'], '%', 2025, 'Crude steel production by process、Electric列。電力が低炭素である割合とは別。', steel_source)],
             [indicator('鋼材輸入量', st['steelImports'], '百万t（鋼材）', 2025, 'worldsteel主要鋼材輸入国表。完成鋼見かけ消費と境界を統一した依存率は算出しない。', steel_source), indicator('鋼材純輸入量', st['steelNetImports'], '百万t（鋼材）', 2025, '輸入−輸出、原表の純輸入。粗鋼量との直接加算をしない。', steel_source), unconfirmed('鋼材の輸出先構成', '%', 2025, '製品分類と国別内訳を統一した構成は未確認。', steel_source)])

    data = {'sources': sources, 'industries': industries}
    validate(data)
    write_json(OUTPUT, data)
    write_json(ASSETS / 'resources-map-source-rows.json', {'sgmYear': 2024, 'sgmMineRows': original_rows, 'steelYear': 2023, 'steelRows': steel_rows, 'refiningYear': 2025, 'refiningRows': ref_values, 'refiningPublishedRuns': pem['highestRuns'], 'oilGasExportYear': 2025, 'oilGasExportRows': oil_export_rows, 'notes': ['SGMの原文数値列の2024値を抽出。列非掲載と「-」を不明として保持。', 'CE合計は全構成業種が公開数値のときのみ計算。「-」は秘匿、SDは不明。', '精製量は国内PEMEX７製油所のある州が対象。非所在25州はnull/unknown、個別処理量未取得の２州はnull/unretrieved。施設一覧から数値0を生成しない。', '石油・ガス地図は保存した既存ETEF211のFOB輸出価額。原状態と原典千USD値を保持。全国分母を生成せず、国内精製量に流用しない。']})
    inputs = ['resources-sgm-2024-original-extract.txt', 'resources-statistics-original-rows.json', 'resources-ce-steel-request.json', 'resources-ce-steel-response.json', 'resources-etef-industry-catalog-2025.snapshot.json']
    counts = {item['id']: dict(Counter(row['status'] for row in item['map']['values'])) for item in industries}
    write_json(ASSETS / 'resources-manifest.json', {'schemaVersion': 1, 'retrieved': f['retrieved'], 'inputFiles': [{'file': name, 'bytes': (ASSETS / name).stat().st_size, 'sha256': sha256((ASSETS / name).read_bytes()).hexdigest()} for name in inputs], 'output': {'file': str(OUTPUT.relative_to(ROOT)), 'sha256': sha256(OUTPUT.read_bytes()).hexdigest()}, 'industries': [item['id'] for item in industries], 'mapStatusCounts': counts, 'availability': {'sgm': 'Browser PDF text extraction succeeded. Command download returned HTTP403; saved selected original table/definition text.', 'usgsAndSilverSurvey': 'Original primary-PDF headers and numeric rows obtained via search. Direct PDF open HTTP403; no image verification.', 'pemex': 'Original 20-F table and NRS refinery paragraphs extracted via primary-site search; direct large HTML retrieval restricted.', 'ceSteel': 'Official POST response and exact request saved with all 33 national/state rows.'}, 'boundaries': ['Map nationalTotal is from the same source, year and process as its state values.', 'Domestic gross valuation, census value added and national-account GDP are separately labelled.', 'Global production, capacity, reserves and gross ore weights are not interchanged.', 'Apparent consumption is not domestic-produced goods directed to domestic users.', 'Selected tariff export groups are not treated as national same-stage metal quantities.']})
    print(json.dumps({'industries': len(industries), 'sources': len(sources), 'mapStatusCounts': counts}, ensure_ascii=False))


def validate(data):
    ids = {item['id'] for item in data['industries']}
    if ids != {'oil-gas', 'refining', 'silver', 'copper', 'gold', 'zinc', 'steel'}:
        raise ValueError('Approved industry set differs')
    for sid, s in data['sources'].items():
        if not sid.startswith('mx-resource-') or not all(key in s for key in ('title', 'url', 'year', 'scope')):
            raise ValueError('Invalid source ' + sid)
    def refs(items):
        if not items or any(sid not in data['sources'] for sid in items):
            raise ValueError('Unknown/absent source reference ' + str(items))
    for item in data['industries']:
        for field in ('overview', 'why', 'process', 'boundary'):
            if not isinstance(item[field], str) or not item[field]:
                raise ValueError('Prose is not a non-empty string')
        m = item['map']
        refs(m['sourceIds'])
        if not m['regions'] or m['kind'] not in ('quantity', 'employment', 'guide'):
            raise ValueError('Map guide/quantity contract differs')
        if m['kind'] == 'guide' and m['values']:
            raise ValueError('Guide must not imply quantitative state coverage')
        if m['kind'] != 'guide' and [row['state'] for row in m['values']] != STATES:
            raise ValueError('Quantitative map must retain all 32 state statuses')
        for row in m['values']:
            if row['status'] not in ('available', 'zero', 'confidential', 'unknown', 'unretrieved'):
                raise ValueError('Invalid map status')
            if row['status'] == 'zero' and row['value'] != 0:
                raise ValueError('Zero must be explicit numeric zero')
            if row['status'] in ('confidential', 'unknown', 'unretrieved') and row['value'] is not None:
                raise ValueError('Missing map value must be null')
            if row['status'] == 'available' and (row['value'] is None or row['value'] < 0):
                raise ValueError('Available quantity must be nonnegative')
        for r in m['regions']:
            refs(r['sourceIds'])
            if r['state'] not in STATES:
                raise ValueError('Invalid region')
        for group in ('domestic', 'world', 'trade'):
            if not item['statistics'][group]:
                raise ValueError('Missing statistic group')
            for i in item['statistics'][group]:
                refs(i['sourceIds'])
                if i['status'] not in ('observed', 'estimate', 'unconfirmed'):
                    raise ValueError('Invalid indicator status')
                if (i['value'] is None) != (i['status'] == 'unconfirmed'):
                    raise ValueError('Only unconfirmed indicators may have null values')
                if 'denominator' in i and i['denominator']['value'] <= 0:
                    raise ValueError('Invalid comparison denominator')


if __name__ == '__main__':
    build()
