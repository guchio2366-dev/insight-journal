"""Generate state comparisons from cached official releases (no API key required).
Usage: python scripts/prepare-industry-state.py --cache DIR
Downloads: EC2231BASIC.zip (Census), SAGDP.zip (BEA, when available).
Preserve source hashes and raw cells. No suppression inference or zero filling.
"""
import argparse,csv,gzip,hashlib,io,json,re,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);a=p.parse_args()

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
geo_path=ROOT/'public/assets/atlas/population/v1/states.geo.json.gz'
geo=json.loads(gzip.open(geo_path).read())
names='01:アラバマ 02:アラスカ 04:アリゾナ 05:アーカンソー 06:カリフォルニア 08:コロラド 09:コネティカット 10:デラウェア 11:ワシントンDC 12:フロリダ 13:ジョージア 15:ハワイ 16:アイダホ 17:イリノイ 18:インディアナ 19:アイオワ 20:カンザス 21:ケンタッキー 22:ルイジアナ 23:メイン 24:メリーランド 25:マサチューセッツ 26:ミシガン 27:ミネソタ 28:ミシシッピ 29:ミズーリ 30:モンタナ 31:ネブラスカ 32:ネバダ 33:ニューハンプシャー 34:ニュージャージー 35:ニューメキシコ 36:ニューヨーク 37:ノースカロライナ 38:ノースダコタ 39:オハイオ 40:オクラホマ 41:オレゴン 42:ペンシルベニア 44:ロードアイランド 45:サウスカロライナ 46:サウスダコタ 47:テネシー 48:テキサス 49:ユタ 50:バーモント 51:バージニア 53:ワシントン 54:ウェストバージニア 55:ウィスコンシン 56:ワイオミング'
names=dict(s.split(':') for s in names.split())
# Interior anchor: horizontal midline through the largest polygon; not a city.
def area(r):return abs(sum(x1*y2-x2*y1 for (x1,y1),(x2,y2) in zip(r,r[1:])))/2

def anchor(g):
 polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 ring=max(polys,key=lambda p:area(p[0]))[0]; y=(min(p[1] for p in ring)+max(p[1] for p in ring))/2
 xs=sorted(x1+(y-y1)*(x2-x1)/(y2-y1) for (x1,y1),(x2,y2) in zip(ring,ring[1:]) if (y1>y)!=(y2>y))
 lo,hi=max(zip(xs[::2],xs[1::2]),key=lambda p:p[1]-p[0]);return [round((lo+hi)/2,4),round(y,4)]
states=[]
for f in geo['features']:
 id=f['properties']['id'].split(':')[1]
 states.append({'id':id,'name':names[id]+('' if id=='11' else '州'),'officialName':f['properties']['name'],'coordinates':anchor(f['geometry'])})
states.sort(key=lambda s:s['id']);assert len(states)==51
codes={'auto':['3361'],'aerospace':['3364'],'shipbuilding':['3366'],'railway':['3365'],'electronics':['334','335'],'machinery':['333'],'metals':['331','332'],'chemicals':['325'],'food':['311','312'],'other-manufacturing':['313','314','315','316','321','322','323','324','326','327','337','339','3369']}
labels={'auto':'完成車製造','aerospace':'航空宇宙製品・部品','shipbuilding':'船舶・ボート製造','railway':'鉄道車両製造','electronics':'電子・電気機器','machinery':'機械','metals':'金属・金属製品','chemicals':'化学製品','food':'食品・飲料・たばこ','other-manufacturing':'その他の製造業'}
cp=a.cache/'EC2231BASIC.zip'
with zipfile.ZipFile(cp) as z:
 rows=list(csv.DictReader(io.StringIO(z.read('EC2231BASIC.dat').decode('utf-8-sig')),delimiter='|'))
rows=[r for r in rows if re.fullmatch(r'0400000US\d{2}',r['GEO_ID']) and r['YEAR']=='2022']
lookup={(r['ST'],r['NAICS2022']):r for r in rows};assert len(lookup)==len(rows)

def cell(raw,flag=''):
 if flag:return {'raw':raw,'flag':flag,'value':None,'status':'suppressed' if flag=='D' else 'unavailable'}
 if raw is None:return {'raw':None,'flag':'','value':None,'status':'missing'}
 if not re.fullmatch(r'\d+(?:\.\d+)?',raw.strip()):return {'raw':raw,'flag':'','value':None,'status':'suppressed' if raw.strip()=='(D)' else 'unavailable'}
 v=float(raw);return {'raw':raw,'flag':'','value':v,'status':'zero' if v==0 else 'published'}

def aggregate(cells):
 vals=[c['value'] for c in cells]
 if all(v is not None for v in vals):v=sum(vals);return {'value':v,'status':'published' if v>0 else 'zero','cells':cells}
 return {'value':None,'status':'suppressed' if any(c['status']=='suppressed' for c in cells) else 'missing','cells':cells}
fields={}
for id,cs in codes.items():
 vals=[]
 for s in states:
  cells=[]
  for c in cs:
   r=lookup.get((s['id'],c),{});cells.append({'code':c,**cell(r.get('RCPTOT'),r.get('RCPTOT_F',''))})
  vals.append({'id':s['id'],**aggregate(cells)})
 fields[id]={'sector':'manufacturing','label':labels[id],'metric':'出荷額','year':2022,'codes':cs,'unit':'thousand USD','divisor':1e6,'displayUnit':'十億米ドル','source':'census','rows':vals}
# BEA inputs, when available: explicit description-checked lines are recorded below.
bp=a.cache/'SAGDP.zip'
assert bp.exists() and zipfile.is_zipfile(bp), 'Required official SAGDP.zip cache is missing or invalid'
if bp.exists() and zipfile.is_zipfile(bp):
 with zipfile.ZipFile(bp) as z:
  n=next(n for n in z.namelist() if n.startswith('SAGDP2__ALL_AREAS') and n.endswith('.csv'))
  bea=list(csv.DictReader(io.StringIO(z.read(n).decode('cp1252'))))
 bea=[r for r in bea if r.get('LineCode') and r.get('GeoFIPS','').strip(' "') in {s['id']+'000' for s in states}]
 blookup={(r['GeoFIPS'].strip(' "')[:2],r['LineCode']):r for r in bea};assert len(blookup)==len(bea)
 # SAGDP2 ALL_AREAS: description and unit verification prevents silent line changes.
 expected={'7':'Oil and gas extraction','8':'Mining (except oil and gas)','45':'Information','59':'Professional and business services','34':'Wholesale trade','35':'Retail trade','36':'Transportation and warehousing','82':'Other services (except government and government enterprises)','11':'Construction','56':'Real estate and rental and leasing'}
 for line,description in expected.items():
  assert blookup[('01',line)]['Description'].strip()==description
 assert all(r['Unit']=='Millions of current dollars' for r in bea)
 mapping={'oil-gas':('resources','石油・天然ガス採掘',['7']), 'mining':('resources','石油・ガス以外の鉱業',['8']), 'information':('services','情報通信',['45']), 'professional':('services','専門・業務支援',['59']), 'trade-logistics':('services','商業・物流',['34','35','36']), 'other-services':('services','その他のサービス',['82']), 'construction':('construction-real-estate','建設',['11']), 'real-estate':('construction-real-estate','不動産・賃貸',['56'])}
 for id,(sector,label,ls) in mapping.items():
  vals=[]
  for s in states:
   cells=[{'code':line,**cell(blookup.get((s['id'],line),{}).get('2024'))} for line in ls]
   vals.append({'id':s['id'],**aggregate(cells)})
  descriptions=[blookup[('01',line)]['Description'].strip() for line in ls]
  fields[id]={'sector':sector,'label':label,'metric':'付加価値','year':2024,'codes':ls,'descriptions':descriptions,'unit':'million USD','divisor':1000,'displayUnit':'十億米ドル','source':'bea','rows':vals}
sources={'census':{'url':'https://www2.census.gov/programs-surveys/economic-census/data/2022/sector31/EC2231BASIC.zip','title':'Census 2022 Economic Census / EC2231BASIC','sha256':sha(cp)}}
if bp.exists() and zipfile.is_zipfile(bp):sources['bea']={'url':'https://apps.bea.gov/regional/zip/SAGDP.zip','title':'BEA SAGDP2 / 名目GDP','sha256':sha(bp)}
out={'retrieved':'2026-09-16','coordinateSource':{'path':str(geo_path.relative_to(ROOT)),'sha256':sha(geo_path),'method':'Largest polygon midline interior anchor; not an industrial facility'},'states':states,'sources':sources,'fields':fields}
(ROOT/'public/assets/atlas/industry-v1/state-economy.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
for id,f in fields.items():print(id,sum(r['status']=='published' for r in f['rows']),f.get('descriptions',''))
