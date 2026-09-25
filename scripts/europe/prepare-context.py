"""Prepare clipped hydrography, city locators and comparable national WDI tables."""
from pathlib import Path
import sys,json,hashlib
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'europe-python'))
from shapely.geometry import shape,box,mapping
ROOT=Path(__file__).resolve().parents[2]; CACHE=ROOT.parent/'europe-source-cache'
OUT=ROOT/'public/assets/atlas/europe/context-v1';OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'src/data/atlas/europe'
read=lambda p:json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8',newline='\n')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
countries=read(DATA/'countries.json');codes={c['code'] for c in countries}
bounds=box(-25,32,65,73)
names={'Danube':'ドナウ川','Rhine':'ライン川','Volga':'ヴォルガ川','Dnieper':'ドニプロ川','Dniester':'ドニエストル川','Don':'ドン川','Elbe':'エルベ川','Oder':'オーデル川','Vistula':'ヴィスワ川','Seine':'セーヌ川','Loire':'ロワール川','Rhône':'ローヌ川','Rhone':'ローヌ川','Po':'ポー川','Ebro':'エブロ川','Tagus':'テージョ川','Douro':'ドウロ川','Thames':'テムズ川','Ural':'ウラル川','Kama':'カマ川','Sava':'サヴァ川','Tisza':'ティサ川','Pechora':'ペチョラ川'}
for name in ['rivers','lakes']:
 features=[]
 for f in read(CACHE/(name+'.json'))['features']:
  g=shape(f['geometry']).intersection(bounds)
  if g.is_empty:continue
  p=f['properties'];label=p.get('name') or ''
  features.append(dict(type='Feature',properties={'name':names.get(label,label),'sourceName':label},geometry=mapping(g.simplify(.008,preserve_topology=True))))
 write(OUT/(name+'.json'),dict(type='FeatureCollection',features=features))
 print(name,len(features))
cities=[]
for f in read(CACHE/'places.json')['features']:
 p=f['properties'];code=p['ADM0_A3'];lon,lat=f['geometry']['coordinates']
 if code not in codes or not(-25<=lon<=65 and 32<=lat<=73):continue
 if p['SCALERANK']>5 and not p['ADM0CAP']:continue
 cities.append(dict(id='city-'+str(p['NE_ID']),name='キーウ' if p['NAME'] in ['Kyiv','Kiev'] else p['NAME_JA'] or p['NAME'],country=code,coordinates=[round(lon,4),round(lat,4)],capital=bool(p['ADM0CAP']),rank=p['SCALERANK']))
write(DATA/'population-cities.json',sorted(cities,key=lambda c:(not c['capital'],c['rank'],c['id'])))
defs=[('SP.POP.TOTL','人口','人','population'),('SP.URB.TOTL.IN.ZS','都市人口比率','%','urban'),('SP.POP.65UP.TO.ZS','65歳以上の人口比率','%','age'),('SP.POP.GROW','人口増加率','% / 年','growth'),('NV.IND.MANF.ZS','製造業の付加価値','GDP比 %','manufacturing'),('NV.IND.TOTL.ZS','鉱工業・建設業の付加価値','GDP比 %','industry'),('NV.SRV.TOTL.ZS','サービス業の付加価値','GDP比 %','services'),('NV.AGR.TOTL.ZS','農林水産業の付加価値','GDP比 %','agrishare'),('AG.LND.FRST.ZS','森林面積比率','陸地面積比 %','forest'),('NY.GDP.PCAP.CD','1人当たりGDP','米ドル（当年価格）','gdp')]
indicators=[]
for code,label,unit,id in defs:
 raw=read(CACHE/(code+'.json'));assert raw[0]['pages']==1
 rows=raw[1]; by={(r['countryiso3code'],r['date']):r['value'] for r in rows}
 values={c:{str(y):by.get(('XKX' if c=='KOS' else c,str(y))) for y in range(2020,2025)} for c in codes}
 indicators.append(dict(id=id,code=code,label=label,unit=unit,year=2023,values=values,sourceUrl='https://data.worldbank.org/indicator/'+code))
write(DATA/'country-statistics.json',dict(year=2023,indicators=indicators,scope='国全体。ロシアはアジア部分を含む全土。フランス等の海外領土の算入は各原統計の範囲に従う。都市の定義は各国で異なる。2023年を共通年とし、欠測を他年で補完しない。'))
sources=read(CACHE/'context-sources.json')
write(OUT/'manifest.json',dict(retrievedAt='2026-09-25',bounds=[-25,32,65,73],sources=[dict(url=u,sha256=sha(CACHE/n)) for n,u in sources.items()],licenses={'naturalEarth':'Public domain, version 5.1.2','worldBank':'CC BY 4.0; WDI indicator source metadata applies'},method='Hydrography clipped at map bounds, simplified 0.008 degrees. City points: Natural Earth scalerank <= 5 or national capital; locations only, no population encoding. WDI: common year 2023, with 2020–24 values retained; no imputation.',cityCount=len(cities),files={n:{'sha256':sha(OUT/n)} for n in ['rivers.json','lakes.json']}))
print('cities',len(cities),'indicators',len(indicators))
