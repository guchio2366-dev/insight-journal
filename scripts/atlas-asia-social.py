"""Prepare census and demographic maps from fixed downloaded official tables.
No network or interpolation. Requires openpyxl, xlrd and shapely.
"""
from pathlib import Path
import argparse,csv,gzip,hashlib,json
import openpyxl,xlrd
from shapely.geometry import shape,mapping
from shapely.ops import unary_union

p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);p.add_argument('--admin',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'public/assets/atlas/asia-social-v1';out.mkdir(parents=True,exist_ok=True)
regions={'east-asia':'CHN JPN KOR MNG PRK TWN'.split(),'southeast-asia':'BRN IDN KHM LAO MMR MYS PHL SGP THA TLS VNM'.split(),'south-central-asia':'AFG BGD BTN IND KAZ KGZ LKA MDV NPL PAK TJK TKM UZB'.split()}
expected={'japan-age-2020.xlsx':'d148f2c3c26985fffecd44110e5792295c4e02514e49f1b2eb4764345e9f355a','japan-nationality-2020.xlsx':'3e7a9fe9de9c913fb78a2a43d03dd54bdb5f5737f7a99a0440b8bff3f99086bb','malaysia-population-state.csv':'a3ac1a8831a4e66dbc0bc0d018b699b3810eaead3775fbee4c95e9eb2cc44945','india-religion-2011.xls':'c3fee2bb235f4ef511d9aaeceaf5f8026b48908f813c6d1cc06413a6c8a0d9cd','india-language-2011.xlsx':'b800cd544d7196c9bbc3c88ec1814138b8b7c8d4ccb7a5a2263a84e4bbf28f83','SP.POP.0014.TO.ZS.json':'c0f91d2ba24c8a0dddeb20947e1b1abb69f16fe663e51726178af0ee113bc8ed','SP.POP.1564.TO.ZS.json':'23e6e5b440117b62245305f4815a90d0a681726897c46bf1daa1e1c842039fc3','SP.POP.65UP.TO.ZS.json':'8689d1a81685f320da0b154f36a16311e0a8b403c11a1364136d7d88b7368e25','SP.POP.GROW.json':'f74412093e86dcc2ffddff8aacdfd0ecd4346157acb9fe6e55ba3dd6c7862925'}
# Keep all original checksums explicit; do not silently substitute revised data.
expected['SP.POP.TOTL.json']='8b6fc7538d34095feff0ad394f5d6b3dd7a0e5fee58729936cae3931f64d83e2'
for name,h in expected.items():assert hashlib.sha256((a.cache/name).read_bytes()).hexdigest()==h,name
def read(name):return json.loads((a.cache/name).read_text(encoding='utf-8-sig'))
def write(name,data):
 raw=(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode()
 if name=='manifest.json':(out/name).write_bytes(raw)
 else:(out/(name+'.gz')).write_bytes(gzip.compress(raw,mtime=0))
def rows(name):
 w=openpyxl.load_workbook(a.cache/name,read_only=True,data_only=True);r=list(w.active.values);w.close();return r
def num(x):return 0 if x=='-' else x if isinstance(x,(int,float)) else None
def ratio(n,d):return n/d*100 if n is not None and d else None

groups=[];topics=[];records=[];features=[];national={c:{'series':{},'total':{}} for codes in regions.values() for c in codes}
def group(id,label,kind,year,source,note,country=None):
 g=dict(id=id,label=label,kind=kind,year=year,source=source,note=note)
 if country:g['country']=country
 groups.append(g)
def metric(group,key,label,breaks=None):
 t=dict(id=group+'-'+key,group=group,key=key,title=label,breaks=breaks or [10,25,50,75]);topics.append(t);return t['id']
age=[('young','15歳未満',[10,15,20,30]),('working','15–64歳',[50,60,65,70]),('old','65歳以上',[10,20,30,40])]
wb='https://databank.worldbank.org/metadataglossary/world-development-indicators/series/'
group('national-age','国別：年齢構成','national','2025',wb+'SP.POP.65UP.TO.ZS','年央の全居住人口に占める各年齢層の割合です。世界銀行WDIを通じた国連人口推計で、市民権だけを基準にした人口ではありません。')
group('national-growth','国別：人口増減','national','2025',wb+'SP.POP.GROW','前年から当年の年央人口の増減を、ln(当年人口/前年人口)×100で表す指数増加率（年率%）です。単純な前年比とは計算法が異なります。')
for k,l,b in age:metric('national-age',k,l,b)
metric('national-growth','rate','人口増加率（年率%）',[-1,0,1,2])
for key,code in [('young','SP.POP.0014.TO.ZS'),('working','SP.POP.1564.TO.ZS'),('old','SP.POP.65UP.TO.ZS'),('growth','SP.POP.GROW'),('total','SP.POP.TOTL')]:
 d=read(code+'.json');assert d[0]['pages']==1 and len(d[1])==d[0]['total']==464
 for r in d[1]:
  c=national[r['countryiso3code']];target=c['total'] if key=='total' else c['series'].setdefault('national-growth-rate' if key=='growth' else 'national-age-'+key,{})
  target[r['date']]=r['value']

assert hashlib.sha256(a.admin.read_bytes()).hexdigest()=='22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5'
admin=json.loads(a.admin.read_text(encoding='utf-8-sig'))['features'];ne={f['properties']['iso_3166_2']:f for f in admin}
def record(id,country,name,geom,sourceName=None):
 geom=geom.simplify(.012,preserve_topology=True);point=geom.representative_point()
 r=dict(id=id,country=country,name=name,sourceName=sourceName or name,point=[round(point.x,5),round(point.y,5)],bounds=list(geom.bounds),series={},counts={},total={},notes=[])
 records.append(r);features.append(dict(type='Feature',properties=dict(id=id,country=country),geometry=mapping(geom)));return r
byid={}
for f in admin:
 pr=f['properties'];code=pr['iso_3166_2']
 if pr['adm0_a3'] in ['JPN','MYS']:byid[code]=record('s-'+code,pr['adm0_a3'],pr['name_ja'] or pr['name'],shape(f['geometry']),pr['name'])

jpurl='https://www.e-stat.go.jp/stat-search/files?cycle=0&tclass=000001125102'
group('jp-age','日本：都道府県の年齢構成','admin','2020',jpurl,'国勢調査の年齢が分かる人口を分母にします。年齢不詳を除く割合であり、全人口を分母にした割合とは異なります。2020年10月の調査で、推計による不詳補完表ではありません。','JPN')
group('jp-nationality','日本：都道府県の国籍','admin','2020',jpurl,'国籍は民族・祖先・母語とは異なります。日本人・外国人の別が分かる人口を分母にします。日本と外国の複数国籍を持つ人は日本人に含まれます。','JPN')
for k,l,b in age:metric('jp-age',k,l,{'young':[10,12,14,16],'working':[50,55,60,65],'old':[25,28,31,34]}[k])
metric('jp-nationality','foreign','外国人の割合',[1,2,3,5])
jpRows=rows('japan-age-2020.xlsx')
for r in jpRows:
 if r[0]!='0_国籍総数' or r[1]!='0_総数' or r[2]!='a':continue
 code=str(r[3])[:2];obj=national['JPN'] if code=='00' else byid['JP-'+code]
 total,unknown=r[4],r[28];obj['total']['2020-census' if code=='00' else '2020']=total;obj.setdefault('counts',{})['ageUnknown']=unknown
 for (k,_,_),n,pct in zip(age,r[29:32],r[36:39]):
  assert abs(ratio(n,total-unknown)-pct)<.00001
  obj['series']['jp-age-'+k]={'2020':ratio(n,total-unknown)};obj['counts']['jp-age-'+k]=n
jpnat=rows('japan-nationality-2020.xlsx');headers=jpnat[7];levels=jpnat[6]
for r in jpnat:
 if r[1]!='0_総数' or r[2]!='00_総数':continue
 code=str(r[0])[:2];obj=national['JPN'] if code=='00' else byid['JP-'+code];total,foreign,japanese,unknown=r[3],r[4],r[45],r[46]
 assert total==foreign+japanese+unknown
 obj['series']['jp-nationality-foreign']={'2020':ratio(foreign,total-unknown)};obj['counts'].update({'nationalityUnknown':unknown,'jp-nationality-foreign':foreign,'japanese':japanese})
 cats=[{'label':str(headers[i]).split('_',1)[1],'value':num(r[i])} for i in range(5,45) if levels[i]==3 or i in [39,44]]
 assert sum(x['value'] for x in cats)==foreign
 obj['nationalities']=cats

myurl='https://open.dosm.gov.my/data-catalogue/population_state'
group('my-age','マレーシア：州等の年齢構成','admin','2026',myurl,'DOSMの年央人口推計に占める年齢層の割合です。元表は千人単位・小数1桁で、内訳の合計と総数には丸め差があります。','MYS')
group('my-ethnicity','マレーシア：市民の民族構成','admin','2026',myurl,'マレーシア市民の民族別人数の合計を分母にします。非市民は別の市民権区分なので、民族として並べたり、この割合の分母へ入れたりしません。','MYS')
group('my-citizenship','マレーシア：市民権の構成','admin','2026',myurl,'市民・非市民を合わせた年央の推計人口を分母に、非市民の割合を示します。民族の構成比とは分母も分類も異なります。','MYS')
group('my-growth','マレーシア：州等の人口増減','admin','2020–2026',myurl,'2020年の調整済み人口を基準にした2026年までの累計増減率です。年率ではありません。2020年は国勢調査から過少調査・基準日・年齢等を調整した人口、2026年は推計です。','MYS')
for k,l,b in age:metric('my-age',k,l,{'young':[15,20,25,30],'working':[60,65,68,71],'old':[5,7,9,11]}[k])
ethnic=[('bumi_malay','マレー人'),('bumi_other','その他のブミプトラ'),('chinese','中国系'),('indian','インド系'),('other_citizen','その他の市民')]
for k,l in ethnic:metric('my-ethnicity',k,l)
metric('my-citizenship','noncitizen','非市民の割合',[1,5,10,20]);metric('my-growth','change','2020年からの累計増減率（%）',[-5,0,10,20])
mymap={'Johor':'01','Kedah':'02','Kelantan':'03','Melaka':'04','Negeri Sembilan':'05','Pahang':'06','Perak':'08','Perlis':'09','Pulau Pinang':'07','Sabah':'12','Sarawak':'13','Selangor':'10','Terengganu':'11','W.P. Kuala Lumpur':'14','W.P. Labuan':'15','W.P. Putrajaya':'16'}
my={}
for r in csv.DictReader((a.cache/'malaysia-population-state.csv').open(encoding='utf-8-sig')):
 if r['sex']=='both' and r['date']>='2010-01-01':my[(r['state'],r['date'][:4],r['age'],r['ethnicity'])]=float(r['population'])
for name,code in mymap.items():
 obj=byid['MY-'+code]
 for y in map(str,range(2010,2027)):
  total=my[name,y,'overall','overall'];obj['total'][y]=round(total*1000)
  for k,l,b in age:
   vals=[v for (s,yr,ag,e),v in my.items() if s==name and yr==y and e=='overall' and ag!='overall' and (int(ag.split('-')[0].rstrip('+'))<15 if k=='young' else 15<=int(ag.split('-')[0].rstrip('+'))<65 if k=='working' else int(ag.split('-')[0].rstrip('+'))>=65)]
   n=round(sum(vals),1);obj['series'].setdefault('my-age-'+k,{})[y]=ratio(n,total)
   if y=='2026':obj['counts']['my-age-'+k]=round(n*1000)
  citizen=sum(my[name,y,'overall',k] for k,l in ethnic)
  for k,l in ethnic:
   n=my[name,y,'overall',k];obj['series'].setdefault('my-ethnicity-'+k,{})[y]=ratio(n,citizen)
   if y=='2026':obj['counts']['my-ethnicity-'+k]=round(n*1000)
  nc=my[name,y,'overall','other_noncitizen'];obj['series'].setdefault('my-citizenship-noncitizen',{})[y]=ratio(nc,total)
  if y=='2026':obj['counts'].update({'citizen':round(citizen*1000),'my-citizenship-noncitizen':round(nc*1000)})
 obj['series']['my-growth-change']={'2020–2026':(obj['total']['2026']/obj['total']['2020']-1)*100}

# Reconstruct comparable statistical units instead of copying old counts to new states.
states=['JK','HP','PB','CH','UT','HR','DL','RJ','UP','BR','SK','AR','NL','MN','MZ','TR','ML','AS','WB','JH','OR','CT','MP','GJ','DH','DH','MH','AP','KA','GA','LD','KL','TN','PY','AN']
inby={}
for i,code in enumerate(states,1):
 if code=='DH' and i==26:inby[str(i).zfill(2)]=inby['25'];continue
 ids=['IN-'+code]+(['IN-LA'] if code=='JK' else ['IN-TG'] if code=='AP' else [])
 name=ne[ids[0]]['properties']['name_ja'] or ne[ids[0]]['properties']['name']
 if code in ['JK','AP']:name+='（2011年の旧州範囲）'
 if code=='DH':name='ダードラー・ナガル・ハヴェーリー及びダマン・ディーウ（旧2地域合計）'
 obj=record('s-IN-'+str(i).zfill(2),'IND',name,unary_union([shape(ne[k]['geometry']) for k in ids]));obj['sourceStateCodes']=[str(i).zfill(2)]+(['26'] if code=='DH' else [])
 obj['notes']=['2011年の州等の人数を、再編前の区域に合わせて表示します。地図形状はNatural Earthの概略境界を結合しており、国勢調査の公式境界図ではありません。'];inby[str(i).zfill(2)]=obj
group('in-religion','インド：宗教の構成','admin','2011','https://censusindia.gov.in/nada/index.php/catalog/11361','2011年国勢調査の宗教別人数を、回答不明も含む総人口で割ります。現在の宗教構成や個人の信仰を推定する資料ではありません。','IND')
group('in-language','インド：母語の言語群','admin','2011','https://censusindia.gov.in/nada/index.php/catalog/10191','幼少期に母親などが話した言葉として申告された母語を、国勢調査が言語群に整理した区分です。現在使える全言語・公用語・民族を示す分類ではありません。','IND')
religions=[('hindu','ヒンドゥー教'),('muslim','イスラム教'),('christian','キリスト教'),('sikh','シク教'),('buddhist','仏教'),('jain','ジャイナ教'),('other','その他の宗教・信仰'),('unstated','宗教の回答不明')]
religionBreaks={'hindu':[25,50,75,90],'muslim':[1,5,15,30],'christian':[1,3,10,50],'sikh':[.1,1,5,25],'buddhist':[.1,1,5,25],'jain':[.01,.1,.5,1],'other':[.1,1,5,10],'unstated':[.1,.2,.5,1]}
for k,l in religions:metric('in-religion',k,l,religionBreaks[k])
s=xlrd.open_workbook(a.cache/'india-religion-2011.xls').sheet_by_index(0)
for i in range(7,s.nrows):
 r=s.row_values(i)
 if r[6]!='Total':continue
 obj=national['IND'] if r[1]=='00' else inby[r[1]];obj.setdefault('counts',{});yearKey='2011-census' if r[1]=='00' else '2011';obj['total'][yearKey]=obj['total'].get(yearKey,0)+int(r[7])
 for (k,l),j in zip(religions,range(10,34,3)):obj['counts']['in-religion-'+k]=obj['counts'].get('in-religion-'+k,0)+int(r[j])
languages={};languageRows=rows('india-language-2011.xlsx')
for r in languageRows:
 if not r[0]=='C0116' or not str(r[5]).endswith('000'):continue
 obj=national['IND'] if r[1]=='00' else inby[r[1]];key=str(r[5]);label=str(r[6]).strip().split(' ',1)[1];languages[key]=label
 obj['counts']['in-language-'+key]=obj['counts'].get('in-language-'+key,0)+int(r[7])
ja={'001000':'アッサム語','002000':'ベンガル語','003000':'ボド語','004000':'ドーグリー語','005000':'グジャラート語','006000':'ヒンディー語','007000':'カンナダ語','008000':'カシミール語','009000':'コンカニ語','010000':'マイティリー語','011000':'マラヤーラム語','012000':'マニプリ語','013000':'マラーティー語','014000':'ネパール語','015000':'オディア語','016000':'パンジャーブ語','017000':'サンスクリット語','018000':'サンタル語','019000':'シンド語','020000':'タミル語','021000':'テルグ語','022000':'ウルドゥー語','124000':'その他の母語'}
for key,label in sorted(languages.items()):metric('in-language',key,ja.get(key,label.title()))
for obj in [national['IND']]+[r for r in records if r['country']=='IND']:
 total=obj['total']['2011' if obj.get('id') else '2011-census'];assert sum(v for k,v in obj['counts'].items() if k.startswith('in-religion-'))==total
 assert sum(v for k,v in obj['counts'].items() if k.startswith('in-language-'))==total
 for t in [t for t in topics if t['group'].startswith('in-')]:
  obj['counts'].setdefault(t['id'],0);obj['series'][t['id']]={'2011':ratio(obj['counts'][t['id']],total)}

inputs=[{'file':n,'sha256':h} for n,h in expected.items()]+[{'file':a.admin.name,'sha256':hashlib.sha256(a.admin.read_bytes()).hexdigest()}]
manifest={'schemaVersion':1,'retrieved':'2026-09-27','inputs':inputs,'regions':{},'sources':[
 {'id':'wdi','url':'https://data.worldbank.org/','license':'CC BY 4.0','licenseUrl':'https://datacatalog.worldbank.org/public-licenses#cc-by','note':'WDI source 2; 2010–2025; updated 2026-07-13. SP.POP.TOTL, SP.POP.0014.TO.ZS, SP.POP.1564.TO.ZS, SP.POP.65UP.TO.ZS, SP.POP.GROW.'},
 {'id':'japan','url':jpurl,'license':'e-Stat terms; numeric data; derived ratios','licenseUrl':'https://www.e-stat.go.jp/terms-of-use','downloads':['https://www.e-stat.go.jp/stat-search/file-download?fileKind=0&statInfId=000032142406','https://www.e-stat.go.jp/stat-search/file-download?fileKind=0&statInfId=000032142723']},
 {'id':'malaysia','url':myurl,'license':'CC BY 4.0','download':'https://storage.dosm.gov.my/population/population_state.csv','method':'https://storage.dosm.gov.my/technotes/population_state.pdf'},
 {'id':'india','url':'https://censusindia.gov.in/census.website/data/census-tables','license':'GODL-India for corresponding OGD datasets','catalogs':['https://www.data.gov.in/catalog/population-religious-community-india-and-states','https://www.data.gov.in/catalog/population-mother-tongue-census-2011-india-and-states'],'note':'Numeric counts extracted from Census C-01 and C-16 originals; derived ratios. OGD identifies the same Census publisher/table datasets; its downloadable mirror was unavailable during retrieval and byte equivalence was not checked. Original workbooks are not redistributed. See docs/atlas-asia-social-detail.md.'},
 {'id':'boundaries','url':'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/','license':'Public domain','version':'5.1.2','note':'Simplified 0.012 degrees with topology preserved; 2011 India statistical units reconstructed by unions.'}
]}
for rid,codes in regions.items():
 rg=[g for g in groups if not g.get('country') or g['country'] in codes];rt=[t for t in topics if t['group'] in [g['id'] for g in rg]];rr=[r for r in records if r['country'] in codes]
 write(rid+'.json',{'records':rr,'national':{k:v for k,v in national.items() if k in codes},'geometry':{'type':'FeatureCollection','features':[f for f in features if f['properties']['country'] in codes]}})
 manifest['regions'][rid]={'data':rid+'.json.gz','groups':rg,'topics':rt,'countries':codes,'adminCount':len(rr),'coverage':{c:{'national':c!='TWN','admin':sum(r['country']==c for r in rr)} for c in codes}}
 print(rid,len(rr),'areas',len(rt),'metrics')
manifest['files']={f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in out.glob('*.gz')}
write('manifest.json',manifest)
