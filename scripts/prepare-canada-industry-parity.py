"""Normalize official Canadian 2021 GDP and employment without inventing missing data.
Input: StatCan 36100402-eng.zip and 14100023-eng.zip as gdp.zip / employment.zip.
"""
from pathlib import Path
import csv,io,zipfile,json,sys,re,hashlib,gzip
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);year='2021';key='North American Industry Classification System (NAICS)'
def read(name,member):
 with zipfile.ZipFile(source/f'{name}.zip') as z:return list(csv.DictReader(io.TextIOWrapper(z.open(member+'.csv'),encoding='utf-8-sig')))
gdp=[r for r in read('gdp','36100402') if r['REF_DATE']==year and r['Prices']=='Current dollars']
emp=[r for r in read('employment','14100023') if r['REF_DATE']==year and r['GEO']=='Canada' and r['Labour force characteristics']=='Employment' and r['Gender']=='Total - Gender' and r['Age group']=='15 years and over']
provinces=json.loads((root/'src/data/atlas/canada/industry.json').read_text())['provinces']
def code(r):return re.search(r'\[([^\]]+)\]$',r[key]).group(1) if '[' in r[key] else r[key]
g={(r['GEO'],code(r)):r for r in gdp};e={code(r):r for r in emp}
def value(row):return float(row['VALUE']) if row and row['VALUE'] and row['STATUS'] not in ['x','F'] else None
def total(rows):
 vals=[value(r) for r in rows];return round(sum(vals),3) if vals and all(v is not None for v in vals) else None
def econ(codes,geo=None):return total([g.get((p,c)) for p in ([geo] if geo else [p['id'] for p in provinces]) for c in codes])
def employment(codes):return total([e.get(c) for c in codes]) if codes else None
# (id, label, sector, GDP NAICS, employment NAICS). Missing detail remains null.
defs=[('all','全産業','all',['T001'],['Total, all industries']),('manufacturing','製造業','manufacturing',['31-33'],['31-33']),('resources','資源・エネルギー','resources',['21','22'],['21, 2100','22']),('services','サービス業','services',['T003'],['Services-producing sector']),('construction-real-estate','建設・不動産','construction-real-estate',['23','53'],['23','53']),
('auto','自動車','manufacturing',['336Y'],[]),('aerospace','航空宇宙','manufacturing',['3364'],[]),('shipbuilding','造船','manufacturing',['3366'],[]),('railway','鉄道車両','manufacturing',['3365'],[]),('electronics','半導体・電子機器','manufacturing',['334'],[]),('machinery','機械','manufacturing',['333'],[]),('metals','金属','manufacturing',['331','332'],[]),('chemicals','化学','manufacturing',['325'],[]),('food','食品加工','manufacturing',['311','312'],[]),('wood-paper','木材・紙','manufacturing',['321','322'],[]),('oil-gas','石油・天然ガス','resources',['211'],[]),('mining','鉱業','resources',['212'],[]),('utilities','電力・ガス・水道','resources',['22'],['22']),('information','情報通信','services',['51'],[]),('finance','金融・保険','services',['52'],['52']),('professional','専門サービス','services',['54'],['54']),('trade-logistics','商業・物流','services',['41','44-45','48-49'],['41','44-45','48-49']),('tourism','娯楽・宿泊・飲食','services',['71','72'],[]),('health-education','医療・教育','services',['61','62'],['61','62']),('other-services','その他のサービス','services',['55','56','81','91'],['55, 56','81','91']),('construction','建設','construction-real-estate',['23'],['23']),('real-estate','不動産・賃貸','construction-real-estate',['53'],['53'])]
metrics=[]
for id,label,sector,codes,ecodes in defs:
 rows=[{'id':p['id'],'name':p['name'],'short':p['short'],'gdp':econ(codes,p['id'])} for p in provinces]
 metrics.append({'id':id,'label':label,'sector':sector,'gdpCodes':codes,'employmentCodes':ecodes,'gdp':econ(codes),'employment':employment(ecodes),'provinces':rows})
# Use a complete, mutually exclusive national chart. T003 includes real estate;
# subtract it in sector totals so top-level sector groupings do not overlap.
for m in metrics:
 if m['id']=='services':
  m['gdp']=round(m['gdp']-econ(['53']),3);m['employment']=round(m['employment']-employment(['53']),3)
  m['gdpCodes']=['T003 minus 53'];m['employmentCodes']=['Services-producing sector minus 53']
  for p in m['provinces']:p['gdp']=round(p['gdp']-econ(['53'],p['id']),3)
chartDefs=[('agriculture','農林水産','all',['11'],['111-112, 1100, 1151-1152','113, 1153','114']),('manufacturing','製造業','manufacturing',['31-33'],['31-33']),('resources','資源・エネルギー','resources',['21','22'],['21, 2100','22']),('construction','建設','construction-real-estate',['23'],['23']),('real-estate','不動産・賃貸','construction-real-estate',['53'],['53']),('trade-logistics','商業・物流','services',['41','44-45','48-49'],['41','44-45','48-49']),('information-recreation','情報・文化・娯楽','services',['51','71'],['51, 71']),('finance','金融・保険','services',['52'],['52']),('professional-support','専門・業務支援','services',['54','55','56'],['54','55, 56']),('health-education','医療・教育','services',['61','62'],['61','62']),('hospitality','宿泊・飲食','services',['72'],['72']),('other-public','その他・公的部門','services',['81','91'],['81','91'])]
chart=[{'id':id,'label':label,'sector':sector,'gdp':econ(codes),'employment':employment(ecodes)} for id,label,sector,codes,ecodes in chartDefs]
assert all(r['gdp'] is not None and r['employment'] is not None for r in chart),chart
assert abs(sum(r['gdp'] for r in chart)-metrics[0]['gdp'])<20
assert abs(sum(r['employment'] for r in chart)-metrics[0]['employment'])<2
result={'year':2021,'gdpUnit':'百万カナダドル・当年価格・基本価格','employmentUnit':'千人・年平均・15歳以上','gdpScope':'13州・準州合計','employmentScope':'LFSのカナダ全国値（準州を除く）','metrics':metrics,'nationalChart':chart,'provinces':provinces,'sources':[{'name':'Statistics Canada 36-10-0402-01','url':'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610040201','definition':'州・準州の産業別GDP。2021年・当年価格・基本価格。全国値は13州・準州の合計。'},{'name':'Statistics Canada 14-10-0023-01','url':'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410002301','definition':'労働力調査の産業別就業者数。2021年・男女計・15歳以上・年平均。自営業を含み、全国値は準州を除く。米国BEAの雇用数とは定義が異なる。'}]}
(root/'src/data/atlas/canada/industry-parity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
out=root/'data-source/atlas/canada/industry/parity';out.mkdir(exist_ok=True)
for name,rows in [('gdp',gdp),('employment',emp)]:
 buf=io.StringIO();w=csv.DictWriter(buf,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 with gzip.open(out/f'{name}-2021.csv.gz','wt',encoding='utf-8')as f:f.write(buf.getvalue())
(out/'provenance.json').write_text(json.dumps({'accessed':'2026-10-05','sources':result['sources'],'archiveHashes':{n:hashlib.sha256((source/f'{n}.zip').read_bytes()).hexdigest() for n in ['gdp','employment']},'check':{'gdpChartSum':sum(r['gdp'] for r in chart),'gdpTotal':metrics[0]['gdp'],'employmentChartSum':sum(r['employment'] for r in chart),'employmentTotal':metrics[0]['employment']},'rounding':'Source one-decimal values can leave small summation differences; no invented residual.'},ensure_ascii=False,indent=2)+'\n')
print('metrics',len(metrics),'chart',len(chart),'GDP',metrics[0]['gdp'],'employment',metrics[0]['employment']);print('missing detail GDP',[(m['id'],len([r for r in m['provinces'] if r['gdp'] is None])) for m in metrics if m['gdp'] is None])
