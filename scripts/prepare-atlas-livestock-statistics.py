"""Rebuild v7 livestock statistics from reviewed local official extracts (no network).

The JSON extracts preserve original FAOSTAT columns / GATS report cell strings.
See docs/atlas-livestock-statistics-data.md for queries, coverage and audit rules.
"""
from pathlib import Path
from collections import defaultdict
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data-source/atlas/livestock'
ITEMS = {'beef': '867', 'dairy': '882', 'hogs': '1035', 'broilers': '1058', 'layers': '1062'}


def read(name):
    return json.loads((RAW / name).read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def supply():
    text = (ROOT / 'scripts/data/wasde0926.txt').read_text()
    assert 'WASDE - 675 - 32' in text
    result = {}
    keys = ['beginningStocks', 'production', 'imports', 'totalSupply', 'exports', 'endingStocks', 'domestic']
    meat = text.split('U.S. Meats Supply and Use')[1].split('WASDE - 675 - 33')[0]
    for ident, label in [('beef', 'Beef'), ('hogs', 'Pork'), ('broilers', 'Broiler')]:
        match = re.search(r'^' + label + r'\s*\n\s+2025\s+([^\n]+)', meat, re.M)
        assert match, label
        nums = [float(x) for x in match[1].split()]
        assert len(nums) == 8
        result[ident] = {**dict(zip(keys, nums[:7])), 'decimals': 0, 'page': 32, 'unit': '百万lb', 'basis': '可調理重量' if ident == 'broilers' else '枝肉重量'}

    def column(block, label):
        matches = re.findall(r'^\s*' + re.escape(label) + r'\s+([\d][^\n]+)', block, re.M)
        assert len(matches) == 1, (label, len(matches))
        values = matches[0].split()
        assert len(values) == 6
        return float(values[1])  # 2024, then 2025, then forecast columns

    egg = text.split('U.S. Egg Supply and Use')[1].split('U.S. Milk Supply and Use')[0]
    result['layers'] = {key: column(egg, label) for key, label in zip(keys, ['BeginningStocks', 'Production', 'Imports', 'Total Supply', 'Exports', 'Ending Stocks', 'Total'])}
    result['layers'].update(hatching=column(egg, 'Hatching Use'), decimals=1, page=33, unit='百万ダース', basis='卵換算・ふ化用を含む')
    milk = text.split('U.S. Milk Supply and Use')[1].split('WASDE - 675 - 34')[0]
    production = column(milk.split('FatBasisSupply')[0], 'Production')
    farm_use = column(milk.split('FatBasisSupply')[0], 'Farm Use')
    for ident, block in [('fat', milk.split('FatBasisSupply')[1].split('Skim-solidBasisSupply')[0]), ('skim', milk.split('Skim-solidBasisSupply')[1])]:
        record = {key: column(block, label) for key, label in zip(keys, ['BeginningStocks', 'Marketings', 'Imports', 'Total Supply', 'Exports', 'Ending Stocks', 'Domestic Use'])}
        assert abs(production - farm_use - record['production']) < .001
        result['dairy-' + ident] = {**record, 'rawMilkProduction': production, 'farmUse': farm_use, 'decimals': 1, 'page': 33, 'unit': '十億lb', 'basis': '乳脂肪換算' if ident == 'fat' else '無脂乳固形分換算'}
    for record in result.values():
        supply_values = [record[k] for k in ['production', 'imports', 'beginningStocks']]
        use_values = [record[k] for k in ['domestic', 'exports', 'endingStocks']]
        if 'hatching' in record:
            use_values.append(record['hatching'])
        for group, values in [('supply', supply_values), ('use', use_values)]:
            error = round(sum(values) - record['totalSupply'], 8)
            tolerance = (len(values) + 1) * .5 * 10 ** -record['decimals']
            assert abs(error) <= tolerance, (group, record)
            assert all(v >= 0 for v in values)
            record[group + 'Difference'] = error
            record[group + 'Tolerance'] = tolerance
        record.update(year=2025, periodType='calendar', status='published')
    return result


def production():
    rows = read('faostat-qcl-2024-extract.json')
    result = {}
    for ident, item in ITEMS.items():
        selected = [r for r in rows if r['Item Code'] == item and r['Element Code'] == '5510']
        def one(area, year):
            found = [r for r in selected if r['Area Code'] == area and int(r['Year']) == year]
            assert len(found) == 1 and found[0]['Value'] != '', (ident, area, year)
            assert found[0]['Unit'] == 't'
            return found[0]
        trend = []
        for year in range(2015, 2025):
            w, u = one('5000', year), one('231', year)
            world, us = float(w['Value']), float(u['Value'])
            assert 0 <= us <= world and world > 0
            trend.append({'year': year, 'us': us, 'world': world, 'share': us / world * 100, 'worldFlag': w['Flag'], 'usFlag': u['Flag']})
        current = [r for r in selected if r['Year'] == '2024' and int(r['Area Code']) < 5000 and r['Area Code'] != '41']
        valid = [r for r in current if r['Value'] != '']
        assert len({r['Area Code'] for r in valid}) == len(valid)
        top = sorted(valid, key=lambda r: float(r['Value']), reverse=True)[:5]
        if not any(r['Area Code'] == '231' for r in top):
            top.append(one('231', 2024))
        countries = [{'code': 'US' if r['Area Code'] == '231' else 'FAO-' + r['Area Code'], 'country': r['Area'], 'value': float(r['Value']), 'flag': r['Flag']} for r in top]
        world = trend[-1]['world']
        assert sum(r['value'] for r in countries) <= world
        result[ident] = {'year': 2024, 'periodType': 'FAOSTAT annual', 'periodNote': 'Country reporting-year exceptions follow the FAOSTAT QCL methodology.', 'unit': 't', 'itemCode': item, 'itemName': one('231', 2024)['Item'], 'worldTotal': world, 'countries': countries, 'trend': trend,
                         'sourceCountrySum': sum(float(r['Value']) for r in valid), 'countrySumDifference': round(sum(float(r['Value']) for r in valid) - world, 6),
                         'missingAreas': [r['Area Code'] for r in current if r['Value'] == ''], 'worldAreaCode': '5000', 'usAreaCode': '231', 'elementCode': '5510'}
    return result


def exports():
    partner_rows = read('gats-bico-partners-2025.json')['rows']
    product_rows = read('gats-hs-products-2025.json')['rows']
    species_rows = read('gats-hs-partners-2025.json')['rows']
    amount = lambda row: int(row[7].replace(',', ''))
    names = {'beef': ('0145AT', 'Beef & Beef Products'), 'hogs': ('0150AT', 'Pork & Pork Products'), 'dairy': ('0170AT', 'Dairy Products'), 'broilers': ('0155AT', 'Poultry Meat & Prods. (excl. eggs)'), 'layers': ('0165AT', 'Eggs & Products')}
    products = defaultdict(list)
    current = None
    for row in product_rows:
        if row[3] in [v[1] for v in names.values()]:
            current = row[3]
        elif re.match(r'^\d{10} - ', row[3]):
            products[current].append({'code': row[3][:10], 'name': row[3][13:], 'valueUsd': amount(row)})
    result = {}
    codebook = {}
    for ident, (bico, name) in names.items():
        all_products = products[name]
        chosen = all_products
        if ident == 'broilers':
            chosen = [r for r in chosen if r['code'].startswith(('020711', '020712', '020713', '020714', '160232')) or r['code'] == '1601000010']
        if ident == 'layers':
            chosen = [r for r in chosen if r['code'] in ['0407210000','0407900000','0408110000','0408190000','0408910000','0408990000','3502110000','3502190000']]
        codes = [r['code'] for r in chosen]
        assert len(codes) == len(set(codes)) and codes
        if ident in ['broilers', 'layers']:
            total = sum(r['valueUsd'] for r in chosen)
            partners = defaultdict(int)
            observed = set()
            for row in species_rows:
                code = row[6][:10]
                if code in codes:
                    key = (row[3], code)
                    assert key not in observed, key
                    observed.add(key)
                    partners[row[3]] += amount(row)
        else:
            matching = [r for r in partner_rows if r[3] == name]
            totals = [r for r in matching if r[6] == 'World Total']
            assert len(totals) == 1
            total = amount(totals[0])
            values = [r for r in matching if r[4].startswith('1.')]
            assert len({r[6] for r in values}) == len(values)
            partners = {r[6]: amount(r) for r in values}
            assert sum(r['valueUsd'] for r in chosen) == total
        assert sum(partners.values()) == total, ident
        ranked = sorted(partners.items(), key=lambda v: -v[1])[:5]
        destinations = [{'country': k, 'value': v} for k, v in ranked]
        destinations.append({'country': 'Other', 'value': total - sum(v for k, v in ranked)})
        record = {'year': 2025, 'periodType': 'calendar', 'unit': 'USD', 'tradeType': 'total exports including re-exports', 'bicoParent': bico, 'sourceProductName': name, 'codes': codes, 'totalUsd': total, 'destinations': destinations}
        if ident == 'dairy':
            composition = defaultdict(lambda: {'valueUsd': 0, 'codes': []})
            for r in chosen:
                c = r['code']
                label = 'チーズ' if c.startswith('0406') else '粉乳' if c.startswith(('040210','040221','040229')) else 'ホエー・乳アルブミン' if c.startswith('040410') or c == '3502200000' else 'バター・乳脂肪' if c.startswith('0405') else 'その他の乳製品・派生品'
                composition[label]['valueUsd'] += r['valueUsd']
                composition[label]['codes'].append(c)
            record['products'] = [{'label': label, **v} for label, v in sorted(composition.items(), key=lambda kv: -kv[1]['valueUsd'])]
            assert sum(r['valueUsd'] for r in record['products']) == total
        result[ident] = record
        codebook[ident] = {'bicoParent': bico, 'name': name, 'included': chosen, 'excluded': [r for r in all_products if r['code'] not in codes]}
    (RAW / 'product-codebook.json').write_text(json.dumps(codebook, ensure_ascii=False, indent=2) + '\n')
    return result


def main():
    fao_source, trade_source = read('faostat-source.json'), read('gats-source.json')
    wasde_source = read('wasde-source.json')
    assert digest(ROOT / wasde_source['localRawPath']) == wasde_source['sha256']
    assert digest(ROOT / wasde_source['pdfTextPath']) == wasde_source['pdfTextSha256']
    assert digest(RAW / 'faostat-qcl-2024-extract.json') == fao_source['extractSha256']
    for query in trade_source['queries']:
        assert digest(ROOT / query['localRawPath']) == query['extractSha256']
    data = {'generatedAt': '2026-09-14', 'supply': supply(), 'production': production(), 'exports': exports()}
    data['sources'] = {'wasde': {k: wasde_source[k] for k in ['publisher','report','releaseDate','retrievedAt','localRawPath','sha256','url']}, 'faostat': {k: fao_source[k] for k in ['publisher','dataset','landingUrl','releaseDate','retrievedAt','sha256','methodologyUrl']}, 'gats': {k: trade_source[k] for k in ['publisher','landingUrl','retrievedAt','releaseDate','valuationUrl']}}
    out = ROOT / 'src/data/atlas/livestock-statistics-generated.ts'
    out.write_text('// Generated by scripts/prepare-atlas-livestock-statistics.py; do not edit values.\nexport const livestockStatistics = ' + json.dumps(data, ensure_ascii=False, indent=2) + ' as const;\n')
    print('Verified 6 balances, 5 world-production series and 5 reconciled product-export groups.')


if __name__ == '__main__':
    main()
