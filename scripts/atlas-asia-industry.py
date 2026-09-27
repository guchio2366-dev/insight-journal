"""Build Asia industry assets from fixed public originals; never fetch at build time.

Usage: python scripts/atlas-asia-industry.py --cache ../asia-industry-source-cache
       --wdi <previously verified asia-industry-statistics.json>
Requires shapely and openpyxl. Statistical values retain source unit/missingness.
"""
from pathlib import Path
import argparse, csv, gzip, hashlib, io, json, zipfile
import openpyxl
from html.parser import HTMLParser
from shapely.geometry import shape, mapping

p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);p.add_argument('--wdi',type=Path,required=True);a=p.parse_args()
out=Path(__file__).resolve().parents[1]/'public/assets/atlas/asia-industry-v1';out.mkdir(parents=True,exist_ok=True)
regions={'east-asia':'CHN JPN KOR MNG PRK TWN'.split(),'southeast-asia':'BRN IDN KHM LAO MMR MYS PHL SGP THA TLS VNM'.split(),'south-central-asia':'AFG BGD BTN IND KAZ KGZ LKA MDV NPL PAK TJK TKM UZB'.split()}
def read(name):return json.loads((a.cache/name).read_text(encoding='utf-8-sig'))
def number(x):
 if isinstance(x,(int,float)):return x
 try:return float(str(x).replace(',',''))
 except ValueError:return None
def write(name,data):
 raw=(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode();(out/name).write_bytes(raw)
 (out/(name+'.gz')).write_bytes(gzip.compress(raw,mtime=0));return name+'.gz'
def rows(name,stop):
 result=[]
 for r in list(csv.reader((a.cache/name).open(encoding='utf-8-sig',newline='')))[6:]:
  if not r or r[0]==stop:break
  if r[0]:result.append(r)
 return result

class SourceTable(HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.row=[];self.cell=None
 def handle_starttag(self,t,a):
  if t=='tr':self.row=[]
  if t in ('td','th'):self.cell=''
 def handle_data(self,s):
  if self.cell is not None:self.cell+=s
 def handle_endtag(self,t):
  if t in ('td','th') and self.cell is not None:self.row.append(' '.join(self.cell.split()));self.cell=None
  if t=='tr' and self.row:self.rows.append(self.row)

downloads=read('downloads.json')
for source in downloads:
 f=a.cache/source['name']
 if f.exists() and hashlib.sha256(f.read_bytes()).hexdigest()!=source['sha256']:raise ValueError('Changed original: '+str(f))
wdi=json.loads(a.wdi.read_text(encoding='utf-8-sig'));write('national.json',wdi)
admin=[];features=[]
for f in read('ne-admin1-v512.geojson')['features']:
 pr=f['properties'];country=pr['adm0_a3'];code=pr['iso_3166_2']
 if country not in ['CHN','JPN','MYS','IND'] or code=='CN-X01~':continue
 geom=shape(f['geometry']);point=geom.representative_point()
 record={'id':code,'country':country,'name':pr['name_ja'] or pr['name'],'sourceName':pr['name'],'point':[round(point.x,5),round(point.y,5)],'bounds':[round(x,5) for x in geom.bounds],'series':{}}
 admin.append(record);features.append({'type':'Feature','properties':{'id':code,'country':country,'name':record['name']},'geometry':mapping(geom.simplify(.012,preserve_topology=True))})
byid={x['id']:x for x in admin}
topics=[]
def topic(id,title,parent,kind,unit,year,source,note,country=None):
 t=dict(id=id,title=title,parent=parent,kind=kind,unit=unit,year=year,source=source,note=note)
 if country:t['country']=country
 topics.append(t);return t
for x in wdi['indicators']:
 parent='製造業' if x['id'] in ['manufacturing','manufactured-exports','hightech-exports'] else 'サービス業' if x['id'] in ['services','service-employment'] else '資源・エネルギー' if x['id']=='resource-rents' else '工業・建設と経済全体'
 year=2021 if x['id']=='resource-rents' else 2023 if 'exports' in x['id'] else 2024
 topic(x['id'],x['label']+'（国別）',parent,'national',x['unit'],str(year),x['metadataUrl'],x['note'])

workbook=openpyxl.load_workbook(a.cache/'meti-2025-regional.xlsx',read_only=True,data_only=True)
meti=[list(r) for r in workbook['第１表'].iter_rows(min_row=10,values_only=True) if len(r)>5 and r[2]=='2024' and r[5] and len(r[5])==2];workbook.close();classes={r[3]:r[4] for r in meti}
for code,name in sorted(classes.items()):
 id='jp-'+code
 topic(id,'日本：'+name,'製造業','admin','百万円','2024','https://www.meti.go.jp/statistics/tyo/kkj/seizo_result.html','製造品出荷額等です。付加価値とは異なり、原材料や中間製品の価値も含みます。個人経営の事業所は対象外です。','JPN')
 for r in meti:
  if r[3]==code and r[5].isdigit() and 1<=int(r[5])<=47:
   assert 'JP-'+r[5] in byid
   byid['JP-'+r[5]]['series'][id]=[{'year':'2024','value':number(r[11]),'status':'秘匿' if r[11]=='X' else '該当なし' if r[11]=='***' else '公表値（0は丸め単位未満を含む）'}]
   if code=='00':byid['JP-'+r[5]]['employment2025']=number(r[8])
assert sum(x['series']['jp-00'][0]['value'] for x in admin if x['country']=='JPN')==381654010

china={r[0]:r for r in rows('gem-china-steel.csv','Total')}
topic('cn-steel','中国：省別の粗鋼生産能力','製造業','admin','千t/年','2026年6月版','https://globalenergymonitor.org/projects/global-iron-steel-tracker/','稼働区分の設備能力です。実際の生産量ではありません。原則50万t/年以上の鉄鋼拠点が対象で、小規模・圧延のみの施設を含みません。','CHN')
for x in admin:
 if x['country']=='CHN':
  r=china.get('Inner Mongolia' if x['sourceName']=='Inner Mongol' else x['sourceName'])
  x['series']['cn-steel']=[{'year':'2026年6月版','value':number(r[1]) if r else None}]
  if r:x['steelMethods']={k:number(v) for k,v in zip(['転炉（BOF）','電気炉（EAF）','誘導炉（IF）','その他'],r[2:6])}
assert sum(x['series']['cn-steel'][0]['value'] or 0 for x in admin if x['country']=='CHN')==1087894
steel={}
countryNames={'Singapore':'SGP','China':'CHN','Japan':'JPN','South Korea':'KOR','Taiwan':'TWN','India':'IND','Indonesia':'IDN','Malaysia':'MYS','Vietnam':'VNM','Thailand':'THA','Pakistan':'PAK','Bangladesh':'BGD','Kazakhstan':'KAZ','Uzbekistan':'UZB','Philippines':'PHL','Mongolia':'MNG','Myanmar':'MMR','Sri Lanka':'LKA','North Korea':'PRK','Kyrgyzstan':'KGZ'}
for r in rows('gem-countries-steel.csv','World'):
 if r[0] in countryNames:steel[countryNames[r[0]]]={k:number(v) for k,v in zip(['total','BOF','EAF','IF','other'],r[1:6])}
topic('steel-capacity','粗鋼生産能力（国別）','製造業','steel','千t/年','2026年6月版','https://globalenergymonitor.org/projects/global-iron-steel-tracker/','GEMの対象施設の稼働区分の能力です。未掲載国を0とはしません。実際の生産量・輸出量とは別の指標です。')

dosm=list(csv.DictReader((a.cache/'dosm-gdp.csv').open(encoding='utf-8-sig')))
for sector,title,parent in [('p3','製造業','製造業'),('p2','鉱業','資源・エネルギー'),('p5','サービス業','サービス業'),('p4','建設業','工業・建設と経済全体')]:
 id='my-'+sector
 topic(id,'マレーシア：州別の'+title,parent,'admin','百万リンギット（2015年価格）','2025','https://open.dosm.gov.my/data-catalogue/gdp_state_real_supply','物価変動を除いた州内の付加価値です。16州・連邦直轄領を別々に表示します。地域に配分されないSupraは地図に着色しません。','MYS')
 for x in [v for v in admin if v['country']=='MYS']+[{'id':'MY-supra','country':'MYS','name':'地域に配分されない分（Supra）','sourceName':'Supra','series':{}}]:
  x['series'][id]=[{'year':r['date'][:4],'value':number(r['value'])} for r in dosm if r['series']=='abs' and r['sector']==sector and r['state'].removeprefix('W.P. ')==x['sourceName']]
  if x['id']=='MY-supra':
   if x['id'] in byid:byid[x['id']]['series'][id]=x['series'][id]
   else:admin.append(x);byid[x['id']]=x
  assert x['series'][id] and x['series'][id][-1]['year']=='2025',(id,x['sourceName'])
for field,title,parent in [('manufacturing','製造業','製造業'),('services','サービス業','サービス業')]:
 id='in-'+field;parsed={}
 parser=SourceTable();parser.feed((a.cache/('rbi-'+field+'.html')).read_text(encoding='utf-8-sig'))
 for r in parser.rows:
  if r[0] in ['State/Union Territory','State/ Union Territory'] or not r[0] or r[0].startswith('State'):continue
  if len(r) not in (7,9):continue
  start=2011 if len(r)==7 else 2017
  parsed.setdefault(r[0],[]).extend({'year':str(start+i)+'–'+str(start+i+1)[2:],'value':number(v)} for i,v in enumerate(r[1:]))
 topic(id,'インド：州別の'+title,parent,'admin','10万ルピー（2011–12年価格）','2022–23','https://www.rbi.org.in/scripts/PublicationsView.aspx?id='+('23483' if field=='manufacturing' else '23499'),'物価変動を除いた州内の付加価値です。年度は4月から翌年3月。比較できる地域が多い2022–23年度を地図に採用しています。','IND')
 for x in admin:
  if x['country']!='IND':continue
  name={'Andaman and Nicobar':'Andaman & Nicobar Islands','Jammu and Kashmir':'Jammu & Kashmir*'}.get(x['sourceName'],x['sourceName'])
  x['series'][id]=parsed.get(name,[])
  if x['id'] not in ['IN-LA','IN-LD','IN-DH']:assert len(x['series'][id])==14,(name,list(parsed))

fuels={'Coal':'石炭','Gas':'天然ガス','Oil':'石油','Hydro':'水力','Nuclear':'原子力','Solar':'太陽光','Wind':'風力','Biomass':'バイオマス','Waste':'廃棄物','Geothermal':'地熱','Wave and Tidal':'波力・潮汐'}
for fuel,label in [('all','すべての電源'),*fuels.items()]:
 t=topic('power-'+fuel.lower().replace(' ','-'),'発電施設：'+label,'資源・エネルギー','power','MW（設備容量）','2021年公開版','https://datasets.wri.org/datasets/global-power-plant-database','WRI v1.3.0（2021-06-02公開）の収録施設です。約1MW以上の系統接続施設が中心で、網羅的ではありません。設備容量は発電した電力量ではなく、2026年の稼働状況も示しません。');t['fuel']=fuel
power=[]
with zipfile.ZipFile(a.cache/'wri-power-v130.zip') as z:
 for r in csv.DictReader(io.StringIO(z.read('global_power_plant_database.csv').decode('utf-8'))):
  if r['country'] not in sum(regions.values(),[]):continue
  power.append({'id':r['gppd_idnr'],'country':r['country'],'name':r['name'],'point':[float(r['longitude']),float(r['latitude'])],'fuel':r['primary_fuel'],'capacity':number(r['capacity_mw']),'capacityYear':r['year_of_capacity_data'] or None,'source':r['source'],'url':r['url'],'locationSource':r['geolocation_source'],'generation':[{'year':str(y),'value':number(r['generation_gwh_'+str(y)])} for y in range(2013,2020)],'generationSource':r['generation_data_source']})
assert len(power)==7702 and len({x['id'] for x in power})==7702
manifest={'version':1,'retrievedAt':'2026-09-26','sources':downloads,'national':'national.json.gz','nationalSha256':hashlib.sha256(a.wdi.read_bytes()).hexdigest(),'regions':{}}
for region,codes in regions.items():
 localadmin=[x for x in admin if x['country'] in codes];localpower=[x for x in power if x['country'] in codes]
 localtopics=[x for x in topics if not x.get('country') or x['country'] in codes]
 file=write(region+'.json',{'admin':localadmin,'power':localpower,'steel':{c:v for c,v in steel.items() if c in codes},'geometry':{'type':'FeatureCollection','features':[f for f in features if f['properties']['country'] in codes]}})
 manifest['regions'][region]={'data':file,'topics':localtopics,'powerCount':len(localpower),'adminCount':len(localadmin),'countries':codes}
 print(region,len(localadmin),len(localpower),(out/file).stat().st_size)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
