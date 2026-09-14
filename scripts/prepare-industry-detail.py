"""Prepare public official statistics. Run with Python + openpyxl and --cache DIR.

The cache contains the original public downloads; originals are never silently revised.
Only selected fields are shipped, with source URLs and SHA256 hashes for reproduction.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--cache', type=Path, required=True)
args = parser.parse_args()
cache = args.cache
sources = {}

def source(name, url):
    sources[name] = {'url': url, 'sha256': hashlib.sha256((cache/name).read_bytes()).hexdigest()}

def dat(name, member):
    with zipfile.ZipFile(cache/name) as z:
        return list(csv.DictReader(io.StringIO(z.read(member).decode('utf-8-sig')), delimiter='|'))

source('AM2231GS1.zip', 'https://www2.census.gov/programs-surveys/asm/data/2022/AM2231GS1.zip')
source('AIES31BASIC01.zip', 'https://www2.census.gov/programs-surveys/aies/data/2023/AIES31BASIC01.zip')
asm = dat('AM2231GS1.zip', 'AM2231GS1.dat')
aies = dat('AIES31BASIC01.zip', 'AIES31BASIC01.dat')
codes = {
    'auto': ['3361'], 'aerospace': ['3364'], 'shipbuilding': ['3366'], 'railway': ['3365'],
    'electronics': ['334', '335'], 'machinery': ['333'], 'metals': ['331', '332'],
    'chemicals': ['325'], 'food': ['311', '312'],
    'other-manufacturing': ['313', '314', '315', '316', '321', '322', '323', '324', '326', '327', '337', '339', '3369'],
}

def number(raw, flag=''):
    if flag or not re.fullmatch(r'-?\d+(\.\d+)?', str(raw or '')):
        return None
    return float(raw)

manufacturing = {}
for field, industry_codes in codes.items():
    points = []
    for year in [2018, 2019, 2020, 2021, 2022, 2023]:
        records = [r for r in (aies if year == 2023 else asm)
                   if r['#GEO_ID'] == '0100000US' and int(r['YEAR']) == year and r['NAICS2017'] in industry_codes]
        assert len({r['NAICS2017'] for r in records}) == len(records), (field, year)
        vals = {}
        for metric, col in [('shipments', 'RCPT_TOT_VAL' if year == 2023 else 'RCPTOT'),
                            ('employment', 'EMP_MAR12_NUM' if year == 2023 else 'EMP')]:
            parsed = [number(r[col], r[col+'_F']) for r in records]
            vals[metric] = sum(parsed) if len(records) == len(industry_codes) and all(v is not None for v in parsed) else None
        points.append({'year': year, **vals})
    manufacturing[field] = {'codes': industry_codes, 'points': points}

partners = {int(r['id']): r for r in json.loads((cache/'partners.json').read_text())['results']}
source('partners.json', 'https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json')
trade_codes = {'auto':['8703'], 'aerospace':['88'], 'shipbuilding':['89'], 'railway':['86'],
               'electronics':['85'], 'machinery':['84'], 'metals':['72','73'], 'chemicals':['30'],
               'food':['19'], 'other-manufacturing':['94'], 'oil-gas':['2709'], 'mining':['26'], 'utilities':['2716']}
trade = {}
for field, hs in trade_codes.items():
    all_rows = []
    for code in hs:
        name = f'comtrade-{code}.json'
        source(name, f'https://comtradeapi.un.org/public/v1/preview/C/A/HS?period=2024&reporterCode=842&cmdCode={code}&flowCode=X&partner2Code=0&customsCode=C00&motCode=0&maxRecords=500')
        payload = json.loads((cache/name).read_text())
        assert payload['count'] == len(payload['data']) < 500, 'truncated preview'
        rows = payload['data']
        assert len({r['partnerCode'] for r in rows}) == len(rows), 'duplicate trading partner'
        assert all(r['refYear'] == 2024 and r['reporterCode'] == 842 and r['flowCode'] == 'X' and r['cmdCode'] == code and r['partner2Code'] == 0 and r['motCode'] == 0 and r['customsCode'] == 'C00' for r in rows)
        total = next(r['primaryValue'] for r in rows if r['partnerCode'] == 0)
        leaves = [r for r in rows if r['partnerCode'] != 0 and not partners[r['partnerCode']]['isGroup']]
        assert abs(sum(r['primaryValue'] for r in leaves) - total) < 1, (code, 'partner total mismatch')
        all_rows.extend(rows)
    grouped = {}
    for r in all_rows:
        code = r['partnerCode']
        if code and partners[code]['isGroup']:
            continue
        grouped[code] = grouped.get(code, 0) + r['primaryValue']
    total = grouped.pop(0)
    rows = [{'id':str(k), 'name':partners[k]['text'], 'iso':partners[k].get('PartnerCodeIsoAlpha2'), 'value':v}
            for k,v in sorted(grouped.items(), key=lambda item: -item[1])]
    trade[field] = {'year':2024, 'codes':hs, 'total':total, 'rows':rows}

# Official BTS publication. Preserve the named original provider (Wards Intelligence).
source('bts-world-auto.xlsx', 'https://www.bts.gov/sites/bts.dot.gov/files/2022-09/table_01_23_092922.xlsx')
sheet = openpyxl.load_workbook(cache/'bts-world-auto.xlsx', data_only=True, read_only=True)['1-23']
rows = list(sheet.values)
years = {int(re.sub(r'\D', '', str(v))): i for i,v in enumerate(rows[1]) if v and re.search(r'\d{4}', str(v))}
quantity = [{'year':year, 'value':rows[104][years[year]]} for year in range(2012,2022)]
assert all(isinstance(p['value'], (float,int)) for p in quantity)
# 2021 world total repeats 2020 in the source. Do not present that unchecked denominator.
world_year = 2020
col = years[world_year]
world_rows = [{'id':r[0], 'name':r[0], 'value':r[col]} for r in rows[75:107]
              if isinstance(r[col], (int,float))]
world_total = rows[73][col]
assert sum(r['value'] for r in world_rows) <= world_total
world = {'year':world_year, 'total':world_total, 'rows':world_rows,
         'trend':[{'year':year, 'value':100*rows[104][years[year]]/rows[73][years[year]]} for year in range(2011,2021)]}

source('CAGDP2.zip', 'https://apps.bea.gov/regional/zip/CAGDP2.zip')
source('list1_2023.xlsx', 'https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx')
geo_sheet = openpyxl.load_workbook(cache/'list1_2023.xlsx', data_only=True, read_only=True).active
metros = {'12420':('austin','オースティン都市圏'), '19100':('dallas','ダラス・フォートワース都市圏'),
          '26420':('houston','ヒューストン都市圏'), '41700':('sanantonio','サンアントニオ都市圏'),
          '35620':('newyork','ニューヨーク都市圏'), '39900':('reno','リノ都市圏'), '29820':('lasvegas','ラスベガス都市圏')}
geo = {}
for r in geo_sheet.iter_rows(min_row=4, values_only=True):
    if r[0] not in metros: continue
    assert r[4] == 'Metropolitan Statistical Area'
    g = geo.setdefault(r[0], {'id':r[0], 'placeId':metros[r[0]][0], 'name':metros[r[0]][1], 'officialName':r[3], 'counties':[]})
    g['counties'].append(str(r[9])+str(r[10]))
with zipfile.ZipFile(cache/'CAGDP2.zip') as z:
    member = next(n for n in z.namelist() if 'ALL_AREAS' in n and n.endswith('.csv'))
    county_rows = {(r['GeoFIPS'].strip(' "'), r['LineCode']):r for r in csv.DictReader(io.StringIO(z.read(member).decode('cp1252'))) if r.get('LineCode')}
lines = {'information':['45'], 'finance':['51'], 'professional':['59'], 'trade-logistics':['34','35','36'],
         'tourism':['75'], 'health-education':['68'], 'other-services':['82'], 'construction':['11'], 'real-estate':['56'], 'utilities':['10']}
regional = []
for g in geo.values():
    assert len(g['counties']) == len(set(g['counties']))
    vals = {}
    for field, ls in lines.items():
        cells = [county_rows.get((county,line),{}).get('2024') for county in g['counties'] for line in ls]
        parsed = [number(cell) for cell in cells]
        vals[field] = sum(parsed) if all(v is not None and v >= 0 for v in parsed) else None
    regional.append({**g, 'values':vals})

out = ROOT/'public/assets/atlas/industry-v1'
(out/'detail-statistics.json').write_text(json.dumps({'retrieved':'2026-09-14','manufacturing':manufacturing,'trade':trade,'autoQuantity':quantity,'autoWorld':world,'sources':sources},ensure_ascii=False,separators=(',',':'))+'\n')
(out/'regional-economy.json').write_text(json.dumps({'year':2024,'boundary':'OMB July 2023','unit':'Thousands of dollars','source':sources['CAGDP2.zip'],'geographySource':sources['list1_2023.xlsx'],'lines':lines,'metros':regional},ensure_ascii=False,separators=(',',':'))+'\n')
print('manufacturing:',len(manufacturing),'trade:',len(trade),'regional:',len(regional))
for g in regional: print(g['name'],{k:v for k,v in g['values'].items() if v is not None})
