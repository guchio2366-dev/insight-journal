"""Offline extraction for Southeast Asia only. No inferred uses or missing zeros."""
from pathlib import Path
from decimal import Decimal
import csv
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/atlas/asia/southeast-agro-statistics.json'
CODES = ['BRN','IDN','KHM','LAO','MMR','MYS','PHL','SGP','THA','TLS','VNM']
TOPICS = {
    'rice':['rice-production'], 'maize':['maize-production'],
    'cassava':['cassava-production'], 'oilpalm':['qcl-254-production'],
    'rubber':['qcl-836-production'], 'arabica':['coffee-production'],
    'robusta':['coffee-production'], 'sugarcane':['qcl-156-production'],
    'cattle':['cattle-meat','cattle-milk'], 'buffalo':['buffalo-milk'],
    'pig':['pig-meat'], 'chicken':['chicken-meat','chicken-eggs'],
    'forest':['roundwood-production','sawnwood-production','wood-pulp-production'],
}

def build():
    sources = []
    def read(path):
        raw = (ROOT / path).read_bytes()
        sources.append({'path':path,'sha256':hashlib.sha256(raw).hexdigest()})
        return raw.decode('utf8')
    shared = json.loads(read('public/assets/atlas/regional-production-statistics-v1/statistics.json'))
    wanted = {s for ids in TOPICS.values() for s in ids}
    countries = {}
    for code in CODES:
        country = shared['countries'][code]
        series = []
        for s in country['series']:
            if s['id'] in wanted or s['domain']=='FO' and s['item'] in ['1861','1872']:
                rows = [r for r in s['rows'] if r['year']==2024]
                if rows:
                    series.append({**s,'rows':rows})
        countries[code] = {'name':country['name'],'series':series}
    regional = {}
    # Prefer a published geographical regional row where retained; never add
    # these rows to the country collection or calculate World from country sums.
    qcl = json.loads(read('data-source/atlas/livestock/faostat-qcl-2024-extract.json'))
    qcl += list(csv.DictReader(read('data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv').splitlines()))
    for sid in sorted(wanted):
        proto = next((s for c in countries.values() for s in c['series'] if s['id']==sid and s['element'] in ['5510','5516']),None)
        if not proto or proto['domain']!='QCL':
            continue
        selected = [r for r in qcl if r['Area Code'] in ['5304','5000'] and r['Item Code']==proto['item'] and r['Element Code']==proto['element'] and r['Year']=='2024' and r['Unit']==proto['unit']]
        by_area = {}
        for r in selected:
            old = by_area.get(r['Area Code'])
            if old and (old['Value'],old['Flag'])!=(r['Value'],r['Flag']):
                raise ValueError('Conflicting published regional rows')
            by_area[r['Area Code']] = r
        if set(by_area)=={'5304','5000'}:
            a,w = by_area['5304'],by_area['5000']
            expected = proto['rows'][0]['worldRawValue']
            if Decimal(w['Value'])!=Decimal(expected):
                raise ValueError('World release disagreement')
            regional[sid] = {**proto,'rows':[{'year':2024,'value':float(a['Value']),'rawValue':a['Value'],'flag':a['Flag'],'worldValue':float(w['Value']),'worldRawValue':w['Value'],'worldFlag':w['Flag'],'share':float(Decimal(a['Value'])/Decimal(w['Value'])*100)}],'areaCode':'5304','m49':'035','basis':'publisher-region'}
    # National historical rice balances, same table/revision and milled basis.
    txt = read('scripts/data/wasde0926.txt')
    if sources[-1]['sha256']!='de4baa0dc24769b2d8cc153bac488049d905b5c8aa1fec9696e2d4e13036e285':
        raise ValueError('WASDE revision changed')
    page = txt.split('WASDE - 675 - 24')[1].split('WASDE - 675 - 25')[0]
    block = page.split('2024/25')[1].split('2025/26')[0]
    names = {'Burma':'MMR','Thailand':'THA','Vietnam':'VNM','Indonesia':'IDN','Philippines':'PHL','World':'World'}
    balances = {}
    for line in block.splitlines():
        match = re.match(r'^\s*([A-Za-z].*?)\s{2,}(-?\d+\.\d+(?:\s+.*)?)\s*$',line)
        if not match:
            continue
        name = re.sub(r'\s+\d+/\s*$','',match[1]).strip()
        if name not in names:
            continue
        vals = match[2].split()
        if len(vals)!=6:
            raise ValueError('Unexpected rice columns')
        dec = list(map(Decimal,vals))
        if any(v<0 for v in dec):
            raise ValueError('Negative rice quantity')
        balances[names[name]] = {'rawLine':line,'rawValues':vals,**dict(zip(['beginningStocks','production','imports','domesticUse','exports','endingStocks'],map(float,dec)))}
    world = balances.pop('World')
    for code,row in balances.items():
        v = list(map(Decimal,row['rawValues']))
        gap = v[0]+v[1]+v[2]-v[3]-v[4]-v[5]
        if abs(gap)>Decimal('.03'):
            raise ValueError('Rice balance does not close')
        row.update(countryCode=code,countryName=countries[code]['name'],seriesId='rice-milled-production',label='米（精米換算）',year='2024/25',unit='百万t',worldProduction=world['production'],worldRawLine=world['rawLine'],roundingGap=float(gap),exportDestinations=None,
            source={'path':'scripts/data/wasde0926.txt','sha256':sources[-1]['sha256'],'url':'https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf','page':24},
            notes=['WASDE-675（2026-09-11版）p.24、2024/25販売年度。2025/26推計・2026/27予測は使いません。','国ごとに販売年度の期首が異なり、共通暦年・地域需給へ合算しません。','国内利用は原表Total Domestic。食用・飼料・加工等の内訳は未収録です。輸入と期首在庫を含み、国産生産物だけの配分ではありません。','輸出は全外国向けで域内貿易・再輸出を含み得ます。東南アジア域外輸出量ではありません。','籾米のFAOSTAT生産と差し引かず、2023暦年HS1006相手数量は別の参考です。'])
    # WITS public web extracts were readable; these are parser text snapshots,
    # not original CSV/HTML downloads. Keep every returned partner and unit.
    raw_pages = []
    for p in sorted((ROOT/'data-source/atlas/southeast-agro-20261016').glob('wits-web-*.txt')):
        raw_pages.append(read(str(p.relative_to(ROOT))))
    trade = []
    internal_names = {'Brunei','Indonesia','Cambodia','Lao PDR','Myanmar','Malaysia','Philippines','Singapore','Thailand','East Timor','Vietnam'}
    for reporter,code,hs,label in [('Vietnam','VNM','1006','米（HS1006・籾／玄米／精米／砕米を含む）'),('Indonesia','IDN','1511','パーム油・分別物（HS1511）')]:
        rows = {}
        for text in raw_pages:
            for line in text.splitlines():
                if not re.search(rf'{reporter}\s+\| Export\s+\| {hs}\s+\|',line):
                    continue
                cells = [c.strip() for c in line.split('|')]
                if len(cells)!=9 or cells[4]!='2023' or cells[8]!='Kg':
                    raise ValueError('Unexpected trade year/unit/columns')
                partner = re.sub(r'cite[^†]+†(.*?)',r'\1',cells[5])
                quantity = float(Decimal(cells[7].replace(',',''))/1000)
                row = {'name':partner,'value':quantity,'rawKg':cells[7],'region':'world' if partner=='World' else 'internal' if partner in internal_names else 'unallocated' if partner in ['Other Asia, nes','Areas, nes','Unspecified'] else 'external','rawLine':line}
                if partner in rows and rows[partner]!=row:
                    raise ValueError('Conflicting trade partner')
                rows[partner] = row
        expected = 86 if code=='VNM' else 143
        if len(rows)!=expected:
            raise ValueError(f'Incomplete public partner table: {code} {len(rows)} expected {expected}')
        world_row = rows.pop('World')
        total = sum(Decimal(str(r['value'])) for r in rows.values())
        trade.append({'countryCode':code,'year':2023,'classification':'HS 1988/92 (H0)','hs':hs,'label':label,'unit':'t','worldExports':world_row['value'],'worldRawLine':world_row['rawLine'],'partners':list(rows.values()),'partnerRoundingGap':float(total-Decimal(str(world_row['value']))),'sourceUrl':f'https://wits.worldbank.org/trade/comtrade/en/country/{code}/year/2023/tradeflow/Exports/partner/ALL/product/{hs}','definition':'Gross exports。再輸出を含み得る通関上の仕向けで、国産由来・最終消費地を追跡しない。未掲載取引を0と仮定しない。'})
    # Independent AFSIS publication, not the unavailable ACO34. Keep the
    # historical ASEAN10 crop-year outlook as a separate reference table.
    aco=read('data-source/atlas/southeast-agro-20261016/aco33-tables-web.txt')
    read('data-source/atlas/southeast-agro-20261016/aco33-publication-web.txt')
    supply_references=[]
    for table,page,printed,sid,label,title in [(8,19,7,'rice-production','米（精米）','Rice'),(23,37,25,'maize-production','トウモロコシ','Maize'),(68,87,75,'cassava-production','キャッサバ（生鮮根）','Cassava')]:
        match=re.search(rf'Table {table} {title} balance sheet of ASEAN countries, 2024.*?\n(L\d+@P{page}: ASEAN ([\d, ]+))\n',aco,re.S)
        if not match:
            raise ValueError(f'Missing AFSIS table {table}')
        cells=match[2].split()
        if len(cells)!=8:
            raise ValueError('Unexpected AFSIS quantity columns')
        values=list(map(lambda x:int(x.replace(',','')),cells))
        beginning,production,imports,supply,domestic,exports,ending,demand=values
        if beginning+production+imports!=supply or domestic+exports+ending!=demand or supply!=demand:
            raise ValueError('AFSIS published aggregate does not close')
        supply_references.append({'seriesId':sid,'label':label,'year':2024,'period':'提供元の2024作物年度・見通し','scope':'刊行当時のASEAN10か国（東ティモールを含まない）','countryCount':10,'unit':'t','beginningStocks':beginning,'production':production,'imports':imports,'totalSupply':supply,'domesticUse':domestic,'exports':exports,'endingStocks':ending,'totalDemand':demand,'externalExports':None,'worldProduction':None,'rawLine':match[1],'sourceUrl':'https://www.aptfsis.org/wp-content/uploads/aco-pdfs/ACO%20No.33.pdf','table':table,'pdfPage':page+1,'printedPage':printed,'quality':'2024年12月刊行の見通し。国内利用等にAFSIS Secretariat推計を含む。確報ではない。','notes':['域内移動を含む国別輸出入の公表合計。域外貿易へ変換しない。','国内利用は公表Total Domestic Utilization。食用・飼料・加工等の内訳は未収録で、国産由来だけの量でもない。','生産年の期間は国の作期により異なる。FAO2024暦年の地理11か国生産やWASDE2024/25国別需給とは接続しない。']})
    return {'schemaVersion':1,'year':2024,'countryCodes':CODES,'topics':TOPICS,'countries':countries,'regional':regional,'riceBalances':balances,'tradeReferences':trade,'supplyReferences':supply_references,'sources':sources,'method':'同版FAOSTAT保存値。地理的東南アジア11か国。公表地域行と保存国合計を区別し、欠測を0にしない。'}

if __name__=='__main__':
    OUT.write_text(json.dumps(build(),ensure_ascii=False,indent=2)+'\n')
