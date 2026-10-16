"""Reproduce East Asia selected-product additions from retained publisher rows.

No network calls, missing-to-zero conversion, regional production estimates or
FAO/HS crosswalk beyond the independently verified Korean whole-soybean record.
The existing Chinese record is preserved verbatim as a JSON object.
"""
from copy import deepcopy
from decimal import Decimal
from hashlib import sha256
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'data-source/atlas/east-asia/statistics-2023/wits'
FLOW = ROOT / 'src/data/atlas/agro-east-quantity-flow.json'
TRADE = ROOT / 'src/data/atlas/east-asia-export-quantities.json'
INSIDE = {'China', 'Japan', 'Korea, Rep.', 'Korea, Dem. Rep.', 'Mongolia',
          'Other Asia, nes', 'Hong Kong, China', 'Macao'}
PRODUCTS = {
    '1001': ('wheat', '小麦・メスリン', 'Kg', 't', 1000),
    '1005': ('maize', 'トウモロコシ（種子を含む）', 'Kg', 't', 1000),
    '1006': ('rice', '米（籾・玄米・精米・砕米）', 'Kg', 't', 1000),
    '120100': ('soybean', '丸大豆', 'Kg', 't', 1000),
    '4407': ('sawnwood', '製材（厚さ6mm超）', 'm³', 'm³', 1),
    '440320': ('coniferous-roundwood', '針葉樹原木（未処理）', 'm³', 'm³', 1),
}

def read(path):
    return json.loads(path.read_bytes())

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def quantity(row, unit, divisor):
    if row['quantity'] is None:
        return None
    assert row['quantityUnit'] == unit, row
    value = Decimal(row['quantity']) / divisor
    assert value.is_finite() and value >= 0, row
    return value

def generate():
    # Keep the established China comparison; only Korea is an additional matched
    # national FAO/HS record. OAS remains a trade reporting label, not a crosswalk.
    flow = read(FLOW)
    korea = deepcopy(next(r for r in flow['records'] if r['countryCode'] == 'CHN'))
    country_path = ROOT / korea['provenance']['productionPath']
    country = read(country_path)
    production = next(r for r in country['countries']['KOR']['observations']
                      if r['domain'] == 'Production_Crops_Livestock' and r['item'] == '236'
                      and r['elementCode'] == '5510' and r['year'] == 2023 and r['unit'] == 't')
    world = read(ROOT / korea['provenance']['worldProductionPath'])['world'][korea['provenance']['worldKey']]
    assert world['archiveSha256'] == next(r['sha256'] for r in country['inputs'] if r['file'].startswith('Production_Crops'))
    assert production['flag'] == 'A' and world['flag'] == 'A'
    export_path, import_path = RAW / 'KOR-Export-120100.json', RAW / 'KOR-Import-120100.json'
    exports, imports = read(export_path), read(import_path)
    for packet, direction in [(exports, 'Export'), (imports, 'Import')]:
        assert (packet['reporter'], packet['flow'], packet['product'], packet['year'], packet['classification']) == ('KOR', direction, '120100', 2023, 'HS 1988/92 (H0)')
    ew = next(r for r in exports['rows'] if r['partner'] == 'World')
    iw = next(r for r in imports['rows'] if r['partner'] == 'World')
    partners = [r for r in exports['rows'] if r['partner'] != 'World']
    assert len({r['partner'] for r in exports['rows']}) == len(exports['rows'])
    partner_sum = sum((quantity(r, 'Kg', 1) for r in partners), Decimal(0))
    korea.update(countryCode='KOR', countryName='韓国', production=production['value'],
                 worldProduction=float(Decimal(world['rawValue'])), productionFlag=production['flag'], worldProductionFlag=world['flag'],
                 actualDomesticUse=None, stockVariation=None,
                 imports=float(quantity(iw, 'Kg', 1000)), exports=float(quantity(ew, 'Kg', 1000)),
                 partners=[dict(code=r['partner'], name=r['partner'], value=float(quantity(r, 'Kg', 1000))) for r in partners],
                 partnerRoundingGap=float((partner_sum - Decimal(ew['quantity'])) / 1000))
    korea['source'].update(importUrl=imports['source'], exportUrl=exports['source'])
    provenance = korea['provenance']
    provenance.update(productionRawValue=str(production['value']), worldProductionRawValue=world['rawValue'], importPath=str(import_path.relative_to(ROOT)),
                      exportPath=str(export_path.relative_to(ROOT)), importSha256=digest(import_path), exportSha256=digest(export_path),
                      importWorldQuantityKg=iw['quantity'], exportWorldQuantityKg=ew['quantity'], exportPartnerQuantityKgSum=str(partner_sum),
                      sourceCountryNames={'production': 'Republic of Korea', 'tradeReporter': 'KOR', 'tradePageCountry': 'Korea, Rep.'})
    for key, packet, row in [('productDescriptionVerification', exports, ew), ('importProductDescriptionVerification', imports, iw)]:
        provenance[key] = dict(publisher='World Bank WITS / UN Comtrade', url=packet['source'], verifiedOn='2026-10-16',
                               verifiedBy='Official public WITS table read in this task',
                               evidence=f"H0 120100: Soya beans; World {row['quantity']} Kg; gross {packet['flow'].lower()}s.")
    korea['notes'] = [
        '2023暦年・韓国全国の丸大豆。FAO QCL236のSoya beans生産と、公式WITSでSoya beansと確認したH0 120100の総輸入・総輸出を比較します。油・油かすを加えません。',
        'FAO国生産とWorld生産は同じ取得版・同年・同品目・t単位。WITSのKgを1,000で割ってtへ換算します。',
        '生産＋輸入−輸出は在庫未調整の見かけ量。在庫変動・損耗・食用・飼料・搾油・種子等は未収録で、実消費や国産大豆の仕向け割合ではありません。',
        '生産と貿易は提供元・改訂版が異なる数量比較。輸入・期首在庫由来や再輸出を追跡できず、輸出÷生産は国産分の輸出割合ではありません。',
        '全13外国相手を保持し、中国など東アジア内の相手も含みます。韓国全国の対世界輸出であり、東アジア域外輸出の地域集計ではありません。',
        '分母は同じWITS World輸出49.252t。相手合計49.251tとの差−0.001t（−1kg）を別掲し、架空のその他で補いません。',
        '生産区分Republic of Koreaと貿易報告区分KOR（Korea, Rep.）を対応させます。Other Asia, nes等の相手ラベルを推定国名へ変更しません。',
    ]
    flow['records'] = [r for r in flow['records'] if r['countryCode'] != 'KOR'] + [korea]
    write(FLOW, flow)

    records = []
    for path in sorted(RAW.glob('*-Export-*.json')):
        packet = read(path)
        if packet['reporter'] == 'JPN':
            continue
        assert packet['year'] == 2023 and packet['classification'] == 'HS 1988/92 (H0)'
        topic, label, raw_unit, unit, divisor = PRODUCTS[packet['product']]
        assert packet['flow'] == 'Export' and packet['reporter'] in ['CHN', 'KOR', 'MNG', 'OAS']
        assert len({r['partner'] for r in packet['rows']}) == len(packet['rows'])
        world_row = next(r for r in packet['rows'] if r['partner'] == 'World')
        world_value = quantity(world_row, raw_unit, divisor)
        rows = [dict(name=r['partner'], value=None if quantity(r, raw_unit, divisor) is None else float(quantity(r, raw_unit, divisor)),
                     boundary='inside' if r['partner'] in INSIDE else 'unknown' if r['partner'] == 'Unspecified' else 'outside')
                for r in packet['rows'] if r['partner'] != 'World']
        complete = world_value is not None and all(r['value'] is not None for r in rows)
        gap = sum((quantity(r, raw_unit, divisor) for r in packet['rows'] if r['partner'] != 'World'), Decimal(0)) - world_value if complete else None
        # WITS displayed quantities have varying precision (large World values
        # are not single-kg precision). Preserve the actual difference without
        # assuming a rounding interval or allocating it to a fictional partner.
        records.append(dict(reporter=packet['reporter'], topic=topic, label=label, product=packet['product'], year=2023, unit=unit,
                            world=None if world_value is None else float(world_value), partners=rows,
                            status='complete' if complete else 'incomplete', partnerRoundingGap=None if gap is None else float(gap),
                            source={'path': str(path.relative_to(ROOT)), 'sha256': digest(path), 'url': packet['source'], 'retrievedOn': packet['retrievedOn']}))
    write(TRADE, dict(schemaVersion=1, classification='HS 1988/92 (H0)', insidePartnerNames=sorted(INSIDE), records=records))
    print(f"Korean whole-soybean comparison; {len(records)} national export tables, {sum(r['status']=='complete' for r in records)} with complete quantities")

if __name__ == '__main__':
    generate()
