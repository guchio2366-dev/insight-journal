"""Reuse immutable publisher rows; never infer statistical totals from map cells."""
from pathlib import Path
import json,csv,hashlib
ROOT=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
crop=ROOT/'data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv'
livestock=ROOT/'data-source/atlas/livestock/faostat-qcl-2024-extract.json'
crop_source=json.loads((crop.parent/'qcl-source.json').read_text());livestock_source=json.loads((livestock.parent/'faostat-source.json').read_text())
assert sha(crop)==crop_source['selectedSha256'];assert sha(livestock)==livestock_source['extractSha256']
assert crop_source['zipSha256']==livestock_source['sha256']
rows=list(csv.DictReader(crop.open()))+json.loads(livestock.read_text())
region_codes={'all':'5100','north':'5103','west':'5104','east':'5101','central':'5102','south':'5105'}
items=[('maize','とうもろこし','56'),('rice','米（籾）','27'),('wheat','小麦','15'),('cassava','キャッサバ','125'),('coffee','コーヒー（生豆）','656'),('tea','茶','667'),('cattle-meat','牛肉（骨付き）','867'),('cattle-milk','牛の生乳','882'),('goats-meat','ヤギ肉','1017'),('sheep-meat','羊肉','977')]
def observation(area,item):
 found=[x for x in rows if x['Area Code']==area and x['Item Code']==item and x['Element Code']=='5510' and x['Year']=='2024']
 if not found:return None
 first=found[0]
 assert all(x['Value']==first['Value'] and x['Unit']==first['Unit'] and x['Flag']==first['Flag'] for x in found)
 if not first['Value'] or first['Flag'] in ('M','L'):return None
 assert first['Unit']=='t' and float(first['Value'])>=0
 return {'areaCode':area,'area':first['Area'],'year':2024,'itemCode':item,'elementCode':'5510','unit':'t','rawValue':first['Value'],'flag':first['Flag'],'note':first.get('Note','')}
regions={}
for region,code in region_codes.items():
 series=[]
 for id,label,item in items:
  regional,world=observation(code,item),observation('5000',item)
  available=regional is not None and world is not None and float(world['rawValue'])>0
  share=float(regional['rawValue'])/float(world['rawValue'])*100 if available else None
  if available:assert 0<=share<=100
  series.append({'id':id,'label':label,'regional':regional,'world':world,'share':share,'status':'available' if available else '未取得：保持原表に同年・同定義の地域と世界の行がない'})
 regions[region]=series
payload={'schemaVersion':1,'year':2024,'domain':'QCL','elementCode':'5510','unit':'t','regionCodes':region_codes,'regions':regions,'method':'FAOSTATの公表済み地域行を同一品目・要素5510・2024年・tのWorld（5000）行で割る。地域集計と国別値を重ねて合算しない。空欄・欠測を0にしない。米は籾、コーヒーは生豆、牛肉は骨付き、生乳は未加工乳。地図のSPAM/GLW 2020年格子から数量を作らない。','source':{'publisher':'FAO','url':'https://www.fao.org/faostat/en/#data/QCL','releaseDate':'2025-12-31','archiveSha256':crop_source['zipSha256'],'license':'CC BY 4.0','licenseUrl':'https://www.fao.org/contact-us/terms/db-terms-of-use/','retainedFiles':[{'path':str(p.relative_to(ROOT)),'sha256':sha(p)} for p in (crop,livestock)]},'unavailable':[{'id':'trade','label':'域外の輸出・輸入相手','reason':'詳細貿易マトリクス原表未取得。域内相手を除外する同年・同品目・数量の比較は未実施。'},{'id':'calories','label':'カロリー構成と自給率','reason':'食料需給表原表未取得。食用供給のkcal/人/日構成と、生産／国内供給量の自給率は算出していない。'}],'retrievalBlocker':{'date':'2026-10-09','reason':'SPAM distribution and FAOSTAT QCL/FBS/detailed-trade ZIP requests from execution environment returned Tunnel connection failed: 403 Forbidden. No alternate download host or proxy was used.'}}
p=ROOT/'src/data/atlas/africa-regional-statistics.json';p.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
print({key:sum(x['share'] is not None for x in series) for key,series in regions.items()})
