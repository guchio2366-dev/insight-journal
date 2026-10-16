"""Normalize retained official WITS public tables; never infer absent quantities.

The .txt inputs are Web connector text captures, not original HTML downloads.
This offline generator does not retry any failed acquisition.
"""
import hashlib
import json
import re
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source/atlas/oceania/agro-20261016'
PRODUCTS = {
    'AUS-wheat-2024': ('wheat-production', '小麦・メスリン', '同年全小麦のWorld輸出数量とフランス向け数量は公開表で欠測。2024/25販売年度のWASDE輸出とは接合しない。'),
    'AUS-nondurum-wheat-2023': ('wheat-production', '普通小麦・スペルト小麦・メスリン', 'デュラム小麦を含まないHS100190。2023暦年であり、2024/25販売年度の輸出先内訳ではない。'),
    'AUS-beef-2024': ('cattle-meat', '冷凍骨なし牛肉', '骨付き生鮮・冷蔵のFAOSTAT牛肉生産とは製品範囲・重量基準が異なる。生産量から差し引かず、輸出／生産比を算出しない。'),
    'AUS-sheep-2024': ('sheep-meat', '冷凍骨なし羊肉', '羊肉の一部分。生体頭数、羊毛、羊肉全体の生産・輸出やABARESの3年平均輸出率とは別の数量。'),
    'NZL-milk-powder-2024': ('cattle-milk', '脂肪分1.5%超・無加糖の粉乳・固形クリーム', '加工製品の重量。生乳・乳固形分への換算はしない。生乳生産から差し引かず、乳製品全体の輸出と呼ばない。'),
    'PNG-cocoa-2023': ('cacao-production', 'カカオ豆（全粒・砕粒、生・焙煎）', '2023暦年。焙煎を含み、2020年の地図の収穫面積や未収録の2024生産量とは接合しない。WorldとNZ向けの数量は公開表で欠測。相手数量の桁・単位を独立照合できず主表示を保留。'),
    'NZL-logs-2024': ('roundwood-production', '未処理の針葉樹丸太', 'HS440320の針葉樹に限定。燃料材・広葉樹を含むFAO丸太全体とは異なる。m³を製材やパルプの量へ換算しない。'),
    'NZL-sawn-2024': ('sawnwood-production', '針葉樹製材', 'HS440710の針葉樹製材。広葉樹を含むFAO製材全体とは異なり、丸太投入量・歩留まりは逆算しない。'),
    'NZL-pulp-2024': ('wood-pulp-production', '針葉樹の半漂白・漂白化学木材パルプ', 'HS470321の化学木材パルプに限定。パルプ全体・紙・古紙とは別。原表kgをtへ換算し、乾燥重量基準や丸太体積への換算は推定しない。'),
}


def normalize(source: Path, series: str, label: str, limitation: str):
    raw = source.read_text()
    url = re.search(r'https://wits\.worldbank\.org/trade/comtrade/en/country/(\w+)/year/(\d+)/tradeflow/Exports/partner/ALL/product/(\d+)', raw)
    assert url and 'HS Nomenclature used HS 1988/92 (H0)' in raw and 'Exports is gross exports' in raw, source
    country, year, product = url.groups()
    rows = []
    for line in raw.splitlines():
        if not re.match(r'L\d+:.*\|', line) or '| Export ' not in line:
            continue
        cells = [cell.strip() for cell in line.split('|')]
        assert len(cells) == 9 and cells[2] == product and cells[4] == year, line
        partner = re.search(r'†([^†]+)', cells[5])
        assert partner, line
        quantity = cells[7].replace(',', '') or None
        unit = cells[8] or None
        assert (quantity is None and unit is None) or unit in ('Kg', 'm³'), line
        value = None if quantity is None else Decimal(quantity) / (1000 if unit == 'Kg' else 1)
        assert value is None or value >= 0
        rows.append({'partner': partner[1], 'rawQuantity': quantity, 'rawUnit': unit, 'value': None if value is None else float(value)})
    assert rows and rows[0]['partner'] == 'World' and len({r['partner'] for r in rows}) == len(rows), source
    units = {r['rawUnit'] for r in rows if r['rawUnit']}
    assert len(units) == 1, source
    # A returned public table must reach the classification/footer, not just top 5.
    assert int(re.search(r'HS Nomenclature', raw).start()) > raw.rfind('| Export ')
    return {'id': source.stem, 'country': country, 'series': series, 'label': label, 'limitation': limitation,
            'year': int(year), 'classification': 'HS 1988/92 (H0)', 'product': product,
            'unit': 't' if 'Kg' in units else 'm³', 'worldQuantity': rows[0]['value'], 'worldRawQuantity': rows[0]['rawQuantity'],
            'partners': rows[1:], 'qualityStatus': 'withheld' if country == 'PNG' else 'public-table',
            'sourceUrl': url[0], 'sourcePath': str(source.relative_to(ROOT)),
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()}


def main():
    tables = [normalize(SOURCE / (key + '.txt'), *args) for key, args in PRODUCTS.items()]
    data = {'schemaVersion': 1, 'retrievedOn': '2026-10-16', 'publisher': 'World Bank WITS / UN Comtrade',
            'captureMethod': 'Official public table text from the Web connector; trailing line whitespace trimmed. Original HTML bytes are not available. SHA-256 identifies the retained text capture.',
            'method': 'Gross exports, calendar year, H0 product and original quantity unit retained. kg/1000=t only. Missing quantity is null, never zero. World is the reporter’s export total, not world production. Re-exports, stocks, feed, processing and final consumption cannot be separated from these tables.',
            'tables': tables}
    output = ROOT / 'src/data/atlas/oceania-agro-trade.json'
    output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{len(tables)} tables / {sum(len(t["partners"]) for t in tables)} partner rows / {output.stat().st_size} bytes')


if __name__ == '__main__':
    main()
