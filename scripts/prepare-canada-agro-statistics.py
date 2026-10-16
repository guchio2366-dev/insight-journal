from pathlib import Path
import re,json,hashlib
base=Path('data-source/atlas/canada/agro-statistics-20261016')
exports={}
for code,label in [('120100','soybean'),('120500','rapeseed'),('440710','coniferous-sawnwood')]:
 text=(base/f'wits-{label}-exports-2024.txt').read_text()
 expected_unit='Kg' if code!='440710' else 'm³'
 if 'HS Nomenclature used HS 1988/92 (H0)' not in text:raise ValueError('Missing H0 classification')
 rows=[]
 for l in text.splitlines():
  if '| Export |' not in l and '| Export  |' not in l: continue
  cols=[re.sub(r'cite.*?†(.*?)',r'\1',v).strip() for v in l.split('|')]
  if len(cols)!=9:raise ValueError(l)
  if not (cols[0].endswith('Canada') and cols[1]=='Export' and cols[2]==code and cols[4]=='2024' and cols[8]==expected_unit):raise ValueError('Reporter, period, product or unit mismatch: '+l)
  name=cols[5]
  rows.append({'name':name,'quantity':int(cols[7].replace(',',''))})
 assert rows[0]['name']=='World' and all(r['name'] not in ['Canada','World'] and r['quantity']>=0 for r in rows[1:])
 assert len(rows)-1=={'120100':59,'120500':26,'440710':82}[code], 'Incomplete partner extraction'
 assert len(set(r['name'] for r in rows))==len(rows), 'Duplicate partner'
 exports[label]={'year':2024,'classification':'HS 1988/92 (H0)','code':code,'description':'Soya beans' if label=='soybean' else ('Rape or colza seeds' if label=='rapeseed' else 'Coniferous wood sawn or chipped lengthwise, sli'),'unit':'kg' if code!='440710' else 'm³','worldQuantity':rows[0]['quantity'],'partners':rows[1:],'partnerRoundingGap':sum(r['quantity'] for r in rows[1:])-rows[0]['quantity'],'sourceUrl':f'https://wits.worldbank.org/trade/comtrade/en/country/CAN/year/2024/tradeflow/Exports/partner/ALL/product/{code}','gross':True}
print([(k,len(v['partners']),v['partnerRoundingGap'])for k,v in exports.items()])
source='https://agriculture.canada.ca/sites/default/files/documents/2026-09/Canada%20Outlook%20for%20Principal%20Field%20Crops_202609.pdf'
raw=(base/'aafc-20260925-web-extract.txt').read_text()
entries=[('wheat','All Wheat',13,True),('corn','Corn',13,True),('canola','Canola',13,True),('soybeans','Soybeans',13,True),('lentils','Lentils',14,False)]
flows={}
for key,label,page,grains in entries:
 m=re.search(rf'L\d+@P{page}: {label}\nL\d+@P{page}: (2024-2025 .*)',raw)
 assert m,(key,label)
 v=m[1].split()
 fields=['production','imports','totalSupply','exports','foodIndustrial','feedWasteDockage','domesticUse','endingStocks'] if grains else ['production','imports','totalSupply','exports','domesticUse','endingStocks']
 row={k:int(s.replace(',',''))for k,s in zip(fields,v[4:])}
 # Only carry-in is derived as a supply identity; it is never represented as a directly reported observation.
 row.update({'label':label,'year':'2024/25','periodStart':'2024-09-01' if key in ['corn','soybeans'] else '2024-08-01','periodEnd':'2025-08-31' if key in ['corn','soybeans'] else '2025-07-31','unit':'千t','sourceUrl':source,'page':page+1,'rawLine':m[1],'beginningStocksDerived':row['totalSupply']-row['production']-row['imports'],'reportedBalanceGap':row['totalSupply']-row['domesticUse']-row['exports']-row['endingStocks'],'exportProducts':'grain products included; oilseed products excluded' if grains else 'products excluded','actualDomesticFoodConsumption':None,'domesticOriginUse':None,'reexports':None,'exportDestinations':None})
 flows[key]=row
imports=(base/'wits-soybean-imports-2024.txt').read_text()
def import_quantity(name):
 line=next(l for l in imports.splitlines() if '| Import  | 120100' in l and l.split('|')[5].strip()==name)
 cols=[v.strip() for v in line.split('|')]
 if cols[8]!='Kg' or cols[4]!='2024':raise ValueError('Import period/unit mismatch')
 return int(cols[7].replace(',',''))
forest_text=(base/'fao-forest-facts-2024.txt').read_text()
def forest_share(product):
 line=next(l for l in forest_text.splitlines() if product+':' in l)
 return int(re.search(r'Canada \((\d+)%\)',line)[1])
p={'schemaVersion':1,'preparedAt':'2026-10-16','country':'CAN','aafc':flows,'calendarTrade':exports,'soybeanImports':{'year':2024,'code':'120100','unit':'kg','gross':True,'worldQuantityKg':import_quantity('World'),'sourceUrl':'https://wits.worldbank.org/trade/comtrade/en/country/CAN/year/2024/tradeflow/Imports/partner/ALL/product/120100','includesReturningCanadaOriginKg':import_quantity('Canada')},'forest':{'roundwood':{'label':'丸太（燃料材を含む）','unit':'m³','production':None,'worldProduction':None,'publishedSharePercent':None},'sawnwood':{'label':'製材','unit':'m³','production':None,'worldProduction':None,'publishedSharePercent':forest_share('Sawnwood')},'paper-pulp':{'label':'製紙用パルプ（Pulp for paper）','unit':'t','production':None,'worldProduction':None,'publishedSharePercent':forest_share('Pulp for paper')}},'forestSourceUrl':'https://www.fao.org/forestry/statistics/data/en/','sources':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'kind':'official-web-text-extract-not-original-file'} for f in sorted(base.glob('*.txt'))]}
Path('src/data/atlas/canada/agro-statistics-20261016.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
