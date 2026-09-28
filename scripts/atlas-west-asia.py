"""Build the West Asia atlas from publisher snapshots; caches stay outside Git.

Requires rasterio, shapely, numpy, Pillow, pyproj, contourpy, pyshp, numcodecs.
Run with --help for the independent, restartable stages. No source credentials.
"""
from pathlib import Path
import argparse, csv, gzip, hashlib, importlib.util, io, json, math, re, sqlite3, zipfile
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.features import geometry_mask
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union, transform as shape_transform
from pyproj import Transformer
from PIL import Image
from atlas_asia_climate_palette import display_classes, palette_record

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/west-asia-v1'
DATA=ROOT/'src/data/atlas/west-asia.json'
COUNTRIES=[('ARM','アルメニア',51),('AZE','アゼルバイジャン',31),('BHR','バーレーン',48),('CYP','キプロス',196),('GEO','ジョージア',268),('IRQ','イラク',368),('ISR','イスラエル',376),('JOR','ヨルダン',400),('KWT','クウェート',414),('LBN','レバノン',422),('OMN','オマーン',512),('QAT','カタール',634),('SAU','サウジアラビア',682),('PSE','パレスチナ',275),('SYR','シリア',760),('TUR','トルコ',792),('ARE','アラブ首長国連邦',784),('YEM','イエメン',887),('IRN','イラン',364),('EGY','エジプト',818)]
CODES={x[0] for x in COUNTRIES}
BOUNDS=[23,10,64,45]
BM=transform_bounds('EPSG:4326','EPSG:3857',*BOUNDS)
W=1000; H=math.ceil(W*(BM[3]-BM[1])/(BM[2]-BM[0]))
TR=from_bounds(*BM,W,H)
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8',newline='\n')
def read(p):return json.loads(p.read_text(encoding='utf8'))
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while c:=f.read(1024*1024):h.update(c)
 return h.hexdigest()
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def fetch(url,name):
 p=args.cache/name
 if not p.exists():
  print('Fetching',name,flush=True)
  with urlopen(Request(url,headers={'User-Agent':'InsightJournalAtlas/1.0 (public geographic data)'}),timeout=120) as f:p.write_bytes(f.read())
 return p
def feature(g,properties):return dict(type='Feature',geometry=mapping(g),properties=properties)
def collection(fs):return dict(type='FeatureCollection',features=fs)
def input_record(p,url,**extra):return dict(file=p.name,sha256=sha(p),url=url,**extra)
def geography():
 source=read(args.geography);geoms={};features=[]
 for f in source['features']:
  code=f['properties']['ADM0_A3'];code={'PSX':'PSE','CYN':'CYP'}.get(code,code)
  g=shape(f['geometry'])
  if code in CODES:geoms.setdefault(code,[]).append(g)
  if g.intersects(box(-15,-8,85,60)):features.append(feature(g.simplify(.018,preserve_topology=True),dict(code=code,target=code in CODES,name=f['properties']['NAME'])))
 assert set(geoms)==CODES, set(geoms)^CODES
 merged={k:unary_union(v) for k,v in geoms.items()}
 write(OUT/'geography.json',collection(features))
 countries=[dict(code=c,name=n,m49=m,bounds=list(merged[c].bounds),center=list(merged[c].representative_point().coords[0])) for c,n,m in COUNTRIES]
 write(OUT/'countries.json',countries)
 return merged
def mask_for(geoms):
 project=Transformer.from_crs(4326,3857,always_xy=True).transform
 return geometry_mask([mapping(shape_transform(project,g)) for g in geoms.values()],out_shape=(H,W),transform=TR,invert=True)
def output_layer(name,dest,breaks,colors,mask,meta,zero_transparent=False):
 valid=np.isfinite(dest)&(dest!=-9999)
 palette=np.array([list(bytes.fromhex(c.lstrip('#')))+[255] for c in colors],dtype='uint8')
 rgba=palette[np.searchsorted(breaks,dest,side='right')]
 rgba[~valid|~mask]=0
 if zero_transparent:rgba[dest==0]=0
 Image.fromarray(rgba).save(OUT/(name+'.png'),optimize=True)
 values=np.where(valid&mask,dest,-9999).astype('<f4')
 (OUT/(name+'.values.gz')).write_bytes(gzip.compress(values.tobytes(),mtime=0))
 assert np.array_equal(np.frombuffer(gzip.decompress((OUT/(name+'.values.gz')).read_bytes()),dtype='<f4').reshape(H,W),values)
 assert np.array_equal(np.asarray(Image.open(OUT/(name+'.png'))),rgba)
 return dict(id=name,image=name+'.png',grid=name+'.values.gz',width=W,height=H,bounds=BOUNDS,bounds3857=BM,breaks=breaks,colors=['#'+c.lstrip('#') for c in colors],noData=-9999,**meta)
def warp(src,resampling=Resampling.nearest):
 dest=np.full((H,W),-9999,dtype='float32')
 reproject(rasterio.band(src,1),dest,src_transform=src.transform,src_crs=src.crs,src_nodata=src.nodata,dst_transform=TR,dst_crs='EPSG:3857',dst_nodata=-9999,resampling=resampling)
 return dest
def rasters():
 geoms=geography();mask=mask_for(geoms);layers=[];inputs=[]
 archive=args.climate/'koppen_geiger_tif-figshare-v1.zip'
 assert sha(archive)=='d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d'
 with zipfile.ZipFile(archive) as z:
  member='1991_2020/koppen_geiger_0p1.tif'
  with rasterio.MemoryFile(z.read(member)) as mem:
   with mem.open() as src:dest=warp(src)
 classes=display_classes();write(OUT/'climate-legend.json',classes)
 dest[(dest<1)|(dest>30)]=-9999
 layers.append(output_layer('climate',dest,list(range(2,31)),[c['color'] for c in classes],mask,dict(year='1991–2020',unit='気候区分',source='Beckほか（2023）',sourceUrl='https://www.nature.com/articles/s41597-023-02549-6',method='原資料の0.1度格子を最近隣法で表示します。海岸や小島で原資料に値がなければ未収録とします。画像と地点の分類には同じ格子を使います。',license='CC BY 4.0')))
 inputs.append(input_record(archive,'https://ndownloader.figshare.com/files/45057352',member=member))
 path=args.global_cache/'etopo2022-60s.tif'
 with rasterio.open(path) as src:elevation=warp(src,Resampling.bilinear)
 layers.append(output_layer('elevation',elevation,[0,200,500,1000,2000,3000,4000],['c6d8cb','e5e8c8','d5dab1','c5c998','b6ae86','a18e75','8a776e','eee9e4'],mask,dict(year='ETOPO 2022',unit='m',source='NOAA ETOPO 2022',sourceUrl='https://www.ncei.noaa.gov/products/etopo-global-relief-model',method='原資料は緯度経度1分格子です。標高は海面を基準にした高さで、二次元図の色による陰影は地質を示しません。表示格子への変換は双一次補間です。',license='NOAA public domain')))
 import contourpy
 cg=contourpy.contour_generator(x=np.linspace(BOUNDS[0],BOUNDS[2],W),y=np.degrees(2*np.arctan(np.exp(np.linspace(BM[3],BM[1],H)/6378137))-np.pi/2),z=np.where(mask,elevation,np.nan))
 lines=[]
 for level in range(500,5500,500):
  for coords in cg.lines(level):
   if len(coords)>6:lines.append(dict(type='Feature',properties=dict(elevation=level),geometry=dict(type='LineString',coordinates=np.round(coords[::2],4).tolist())))
 write(OUT/'contours.json',collection(lines));inputs.append(input_record(path,'https://www.ncei.noaa.gov/products/etopo-global-relief-model'))
 archive=args.global_cache/'spam2020V2r2_global_harvested_area.geotiff.zip'
 assert hashlib.md5(archive.read_bytes()).hexdigest()=='dd9ac5def086fcae26d28423b2b31f8b'
 with zipfile.ZipFile(archive) as z:
  for topic,crop in [('wheat','WHEA'),('barley','BARL')]:
   for system in ['A','I','R']:
    member=f'spam2020V2r2_global_harvested_area/spam2020_V2r2_global_H_{crop}_{system}.tif'
    with rasterio.MemoryFile(z.read(member)) as mem:
     with mem.open() as src:dest=warp(src)
    dest[dest<0]=-9999;name=topic+({'A':'','I':'-irrigated','R':'-rainfed'}[system])
    layers.append(output_layer(name,dest,[1,10,100,1000,5000],['edf1e3','d7e7b4','afd08b','7fa95c','4f7e3d','23582d'],mask,dict(year='2020',unit='ha／原資料の格子',source='IFPRI MapSPAM 2020 v2r2',sourceUrl='https://doi.org/10.7910/DVN/SWPENT',method='5分格子ごとの収穫面積を配分した推計です。作付面積や生産量ではなく、二期作等では土地面積を超え得ます。拡大しても農地の輪郭は分かりません。'+{'A':'灌漑と天水を合わせます。','I':'灌漑で水を供給する栽培を表示します。','R':'降水に依存する天水栽培を表示します。'}[system],license='CC BY 4.0')))
 inputs.append(input_record(archive,'https://dataverse.harvard.edu/api/access/datafile/13827040'))
 from numcodecs import Blosc
 for species in ['sheep','goat','cattle']:
  path=args.farming/f'glw-{species}_c_0_2';chunk=np.frombuffer(Blosc().decode(path.read_bytes()),dtype='<f4').reshape(1080,1080).copy();chunk[~np.isfinite(chunk)|(chunk<0)]=-9999
  dest=np.full((H,W),-9999,dtype='float32')
  reproject(chunk,dest,src_transform=from_bounds(0,0,90,90,1080,1080),src_crs='EPSG:4326',src_nodata=-9999,dst_transform=TR,dst_crs='EPSG:3857',dst_nodata=-9999,resampling=Resampling.nearest)
  layers.append(output_layer(species,dest,[1,10,50,200,1000],['fff6e4','fee5be','f9c889','ee9960','cb653f','873c31'],mask,dict(year='2020',unit='頭／km²',source='FAO GLW4',sourceUrl='https://www.fao.org/livestock-systems/global-distributions/en/',method='5分格子に家畜の頭数を配分したモデルの密度です。現地で数えた地点値ではなく、放牧地の境界も表しません。',license='CC BY 4.0')))
  inputs.append(input_record(path,'https://data.apps.fao.org/catalog/dataset/glw'))
 pop=module('west_pop','atlas-asia-population.py');pop.OUT=OUT
 path=args.global_cache/'GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0.tif'
 with rasterio.open(path) as src:record=pop.raster_assets(src,BOUNDS,'population',5)
 layers.append(dict(id='population',**record,bounds=BOUNDS,breaks=pop.BREAKS,colors=['#'+c for c in pop.COLORS],noData=-1,unit='人／km²',year='2020',source='JRC GHSL R2023A',sourceUrl='https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php',method='国勢調査等の人口を建物などの情報で配分した推計です。等面積の1km格子を5×5で平均し、広域の密度を表示します。都市・国の人口を画素の合計から算出しません。',license='European Commission reuse policy / CC BY 4.0'))
 inputs.append(input_record(path,'https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php'))
 write(OUT/'raster-manifest.json',dict(layers=layers,inputs=inputs,palette=palette_record()))
 print('Rasters ready',len(layers),flush=True)

def stats():
 farming=module('west_farming','atlas-asia-farming.py');farming.OUT=OUT;farming.M49={c:m for c,n,m in COUNTRIES};farming.CROPS={'wheat':('WHEA','小麦',15),'barley':('BARL','大麦',44),'dates':('DATE','ナツメヤシ',577),'olives':('OLIV','オリーブ',260)};farming.SPECIES={k:farming.SPECIES[k] for k in ['sheep','goat','cattle']}
 farming.statistics(args.fao)
 indicators=['SP.POP.TOTL','SP.URB.TOTL.IN.ZS','SP.POP.65UP.TO.ZS','SP.POP.GROW','NV.IND.MANF.ZS','NV.IND.TOTL.ZS','NV.SRV.TOTL.ZS','NV.AGR.TOTL.ZS','AG.LND.FRST.ZS','NY.GDP.PETR.RT.ZS','NY.GDP.NGAS.RT.ZS','IS.SHP.GOOD.TU','SM.POP.NETM','SP.POP.0014.TO.ZS','SP.POP.1564.TO.ZS']
 wb={};inputs=[]
 for indicator in indicators:
  name='wdi-'+indicator+'.json';path=args.global_cache/name
  url='https://api.worldbank.org/v2/country/all/indicator/'+indicator+'?date=2020:2024&format=json&per_page=20000'
  if not path.exists():path=fetch(url,name)
  source=read(path);assert source[0]['pages']==1 and len(source)>1,indicator
  wb[indicator]=[dict(code=r['countryiso3code'],year=int(r['date']),value=r['value'],sourceName=r['country']['value'],unit=r.get('unit')) for r in source[1] if r['countryiso3code'] in CODES]
  inputs.append(input_record(path,url,updated=source[0].get('lastupdated')))
 write(OUT/'world-bank.json',dict(indicators=wb,inputs=inputs,license='CC BY 4.0',method='Publisher observations, country ISO3, 2020–2024. Null remains null; charts compare a single selected year.'))
 print('Statistics ready',flush=True)

def cities():
 jma=module('west_jma','atlas-asia-climate-cities.py');stations={}
 for region in [1,2,3]:
  url=jma.BASE+f'list.php?r={region}&e=6&y=2025&m=1&s=1&k=0';page=fetch(url,f'jma-list-{region}.html').read_text(encoding='utf8')
  for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',page,re.S|re.I):
   match=re.search(r'graph_mkhtml.php\?n=(\d+)[^>]*>(.*?)</a>',row,re.S)
   if match:
    cells=[jma.clean(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',row,re.S|re.I)]
    stations[match[1]]=dict(name=jma.clean(match[2]),region=region,country=cells[1] if len(cells)>1 else '')
 write(args.cache/'jma-stations.json',stations)
 if args.discover:
  print(json.dumps({k:v for k,v in stations.items() if any(s in v['country'].lower() for s in ['tur','armenia','azer','georgia','syria','leban','israel','jordan','qatar','oman','yemen','cyprus','iraq','egypt','iran','saudi','kuwait','bahrain','emirate'])},ensure_ascii=False,indent=2));return
 choices=read(ROOT/'src/data/atlas/west-asia-stations.json');result=[]
 for choice in choices:
  ident=choice['stationId'];s=stations[ident];url=jma.BASE+f'graph_mkhtml.php?n={ident}&y=2025&m=12&e=6&r={s["region"]}&s=1&k=0';p=fetch(url,f'jma-{ident}.html')
  values=jma.parse_climatview(p.read_text(encoding='utf8'))
  city=dict(**choice,**values,stationName=s['name'],normalPeriod='1991–2020',sourceUrl=url,sourceName='気象庁 ClimatView',sourceRetrievedAt=datetime.fromtimestamp(p.stat().st_mtime,timezone.utc).date().isoformat(),sourceTermsUrl=jma.TERMS,sourceSha256=[sha(p)],notes=['格子の気候分類とは別の、観測所の月別平年値です。'],missingMonths=dict(temperature=[i+1 for i,v in enumerate(values['temperatureC']) if v is None],precipitation=[i+1 for i,v in enumerate(values['precipitationMm']) if v is None]))
  city['summary'],city['reading']=jma.describe(city);result.append(city)
 write(OUT/'climate-cities.json',result);print('Climate cities',len(result),flush=True)

def urban():
 pop=module('west_pop','atlas-asia-population.py');histories={}
 path=args.urban/'GHS_UCDB_THEME_GHSL_GLOBE_R2024A_V1_2.zip'
 with zipfile.ZipFile(path) as z:
  member=next(n for n in z.namelist() if n.endswith('.csv'))
  for r in csv.DictReader(io.TextIOWrapper(z.open(member),encoding='latin-1')):
   histories[int(r['ID_UC_G0'])]={str(y):float(r['GH_POP_TOT_'+str(y)]) if r['GH_POP_TOT_'+str(y)] not in ['','NA','-9999'] else None for y in [2000,2010,2020]}
 db=sqlite3.connect(args.gpkg);db.row_factory=sqlite3.Row
 rows=db.execute('select g.*,c.GC_UCC_LON_2025 as lng,c.GC_UCC_LAT_2025 as lat from GHSL_UCDB_THEME_GENERAL_CHARACTERISTICS_GLOBE_R2024A g join UC_centroids c on g.ID_UC_G0=c.ID_UC_G0').fetchall();db.close()
 project=Transformer.from_crs('ESRI:54009','EPSG:4326',always_xy=True).transform;geoms=geography();candidates=[]
 from shapely.geometry import Point
 for r in rows:
  coord=project(r['lng'],r['lat'])
  if not box(*BOUNDS).contains(Point(coord)):continue
  matches=[code for code,g in geoms.items() if g.covers(Point(coord))]
  if len(matches)!=1 or histories[r['ID_UC_G0']]['2020'] is None:continue
  candidates.append((r,matches[0],coord))
 chosen={}
 for code in CODES:
  group=sorted([r for r in candidates if r[1]==code],key=lambda r:histories[r[0]['ID_UC_G0']]['2020'],reverse=True)
  for r in group[:2]:chosen[r[0]['ID_UC_G0']]=r
 fs=[];items=[]
 for ident,(r,code,coord) in chosen.items():
  g=shape_transform(project,pop.gpkg_shape(r['geom']));name=r['GC_UCN_MAI_2025'];uid='uc-'+str(ident)
  items.append(dict(id=uid,name=name,countryCode=code,coordinates=list(coord),bounds=list(g.bounds),history=histories[ident],areaKm2=float(r['GC_UCA_KM2_2025'])))
  fs.append(feature(g.simplify(.002,preserve_topology=True),dict(id=uid,name=name,code=code)))
 write(OUT/'urban.json',dict(cities=items,features=collection(fs),sourceUrl='https://human-settlement.emergency.copernicus.eu/ucdb2024.php',method='2025年の都市中心部の範囲に対する2000・2010・2020年の推計人口です。行政市の人口ではありません。国の表示区分は地図上の中心点で選び、境界の政治的帰属を判定するものではありません。',input=input_record(path,'https://human-settlement.emergency.copernicus.eu/ucdb2024.php')))
 print('Urban centres',len(items),flush=True)

def water():
 geoms=geography();target=unary_union(list(geoms.values()));fs=[]
 for name in ['rivers','lakes']:
  source=read(args.global_cache/(name+'.json'));parts=[]
  for f in source['features']:
   g=shape(f['geometry'])
   if g.intersects(box(20,-5,68,47)):
    p=f['properties'];parts.append(feature(g.simplify(.005,preserve_topology=True),dict(name=p.get('name') or p.get('name_en') or '名称未収録')))
  write(OUT/(name+'.json'),collection(parts))
 import shapefile
 path=args.water/'BasinATLAS_v10_lev06.shp';reader=shapefile.Reader(str(path));groups={};selected=set();flow={}
 for sr in reader.iterShapeRecords():
  r=sr.record.as_dict();sink=int(r['NEXT_SINK']);bounds=sr.shape.bbox
  if not box(*bounds).intersects(box(15,-8,70,50)):continue
  g=shape(sr.shape.__geo_interface__);groups.setdefault(sink,[]).append(g)
  if g.intersects(target):selected.add(sink)
  if int(r['HYBAS_ID'])==sink:flow[sink]=r.get('dis_m3_pyr')
 # Read all connected members, including upstream areas beyond the initial view.
 groups={k:[] for k in selected}
 for sr in reader.iterShapeRecords():
  sink=int(sr.record['NEXT_SINK'])
  if sink in selected:groups[sink].append(shape(sr.shape.__geo_interface__))
 for sink,parts in groups.items():
  g=unary_union(parts)
  if g.area<.04:continue
  fs.append(feature(g.simplify(.015,preserve_topology=True),dict(id=str(sink),bounds=list(g.bounds),name='流域 '+str(sink),dischargeM3s=flow.get(sink))))
 write(OUT/'basins.json',collection(fs))
 url='https://services.bgr.de/arcgis/rest/services/grundwasser/whymap_gwr/MapServer/11/query?'+urlencode(dict(where='1=1',geometry='23,10,64,45',geometryType='esriGeometryEnvelope',inSR=4326,spatialRel='esriSpatialRelIntersects',outFields='OBJECTID,HYGEO2,aquif_type,recharge',returnGeometry='true',outSR=4326,f='geojson'))
 p=fetch(url,'whymap-west-asia.geojson');ground=read(p);assert ground.get('type')=='FeatureCollection' and not ground.get('exceededTransferLimit') and not ground.get('properties',{}).get('exceededTransferLimit')
 features=[]
 for f in ground['features']:
  g=shape(f['geometry']).intersection(box(*BOUNDS))
  if not g.is_empty:features.append(feature(g.simplify(.008,preserve_topology=True),f['properties']))
 write(OUT/'groundwater.json',collection(features));write(OUT/'water-provenance.json',dict(basins=input_record(path,'https://www.hydrosheds.org/hydroatlas',edition='HydroATLAS v1.0, level 6',license='CC BY 4.0',method='Union all level-6 polygons sharing NEXT_SINK; select groups intersecting target land. Upstream members retained even outside the map. No inferred current water availability.'),groundwater=input_record(p,url,license='BGR / UNESCO WHYMAP attribution; generalised 1:25,000,000 map',method='Publisher aquifer type and recharge classes. Not groundwater reserves, withdrawal or current drought.')))
 print('Water',len(fs),'catchments;',len(features),'aquifer polygons',flush=True)

def finish():
 ras=read(OUT/'raster-manifest.json');wb=read(OUT/'world-bank.json');fao=read(OUT/'statistics.json');countries=read(OUT/'countries.json')
 data=dict(countries=countries,layers=ras['layers'],classes=read(OUT/'climate-legend.json'),cities=read(OUT/'climate-cities.json'),urban=read(OUT/'urban.json'),worldBank=wb,agriculture=fao,bounds=BOUNDS,bounds3857=BM,width=W,height=H)
 write(DATA,data)
 write(OUT/'data.json',data)
 coverage=[]
 for country in countries:
  c=country['code'];coverage.append(dict(code=c,name=country['name'],nature=dict(climate=True,stations=sum(x['countryCode']==c for x in data['cities']),water=True),agriculture=dict(rows=len(fao['countries'][c]['observations']),years=sorted(set(x['year'] for x in fao['countries'][c]['observations']))),industry={key:sum(r['code']==c and r['value'] is not None for r in wb['indicators'][key]) for key in ['NY.GDP.PETR.RT.ZS','NV.IND.MANF.ZS','IS.SHP.GOOD.TU','NV.SRV.TOTL.ZS']},population=dict(national=sum(r['code']==c and r['value'] is not None for r in wb['indicators']['SP.POP.TOTL']),urban=sum(x['countryCode']==c for x in data['urban']['cities']))))
 write(OUT/'coverage.json',coverage)
 manifest=dict(version='1.0.0',retrievedDate=datetime.now(timezone.utc).date().isoformat(),countries=sorted(CODES),scope='UN M49 Western Asia 18 plus Iran and Egypt, editorial grouping',generator=dict(file='scripts/atlas-west-asia.py',sha256=sha(Path(__file__)),stationSelectionSha256=sha(ROOT/'src/data/atlas/west-asia-stations.json')),geography=input_record(args.geography,'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',license='Public domain',method='Natural Earth v5.1.2; PSX→PSE and CYP/CYN grouped only for page selection. The two Cyprus boundary polygons remain separate. Not a claim about sovereignty or current control.'),raster=ras,water=read(OUT/'water-provenance.json'),files={p.name:dict(bytes=p.stat().st_size,sha256=sha(p)) for p in OUT.iterdir() if p.is_file() and p.name!='manifest.json'})
 write(OUT/'manifest.json',manifest);print('Manifest and 80 country/field coverage cells ready',flush=True)

def extras():
 # Extend land-use rows without changing other regions' FAOSTAT builder.
 p=args.fao/'Inputs_LandUse_E_All_Data_(Normalized).zip';fao=read(OUT/'statistics.json');reverse={m:c for c,n,m in COUNTRIES}
 for c in fao['countries'].values():c['observations']=[r for r in c['observations'] if not (r['domain']=='Inputs_LandUse' and r['item']=='6655')]
 with zipfile.ZipFile(p) as z:
  for r in csv.DictReader(io.TextIOWrapper(z.open('Inputs_LandUse_E_All_Data_(Normalized).csv'),encoding='utf-8-sig')):
   if r['Item Code']!='6655' or r['Element Code']!='5110' or not 2015<=int(r['Year'])<=2024:continue
   code=reverse.get(int(r['Area Code (M49)'].lstrip("'")))
   if code:fao['countries'][code]['observations'].append(dict(domain='Inputs_LandUse',item='6655',element=r['Element'],elementCode=r['Element Code'],year=int(r['Year']),unit=r['Unit'],value=float(r['Value']) if r['Value'].strip() and r['Flag']!='M' else None,flag=r['Flag'],note=r.get('Note') or None))
 fao['items']['Inputs_LandUse:6655']='Permanent meadows and pastures';fao['method']='Publisher rows filtered by explicit UN M49 country, item, element and year. Original units, flags and missing values retained. MapSPAM and GLW models are independent from these national observations. Values are not computed from map pixels.';write(OUT/'statistics.json',fao);(OUT/'statistics.json.gz').write_bytes(gzip.compress((OUT/'statistics.json').read_bytes(),mtime=0))
 # Publisher-rendered forest reference, not a numerical classification grid.
 url='https://ies-ows.jrc.ec.europa.eu/iforce/gfc2020/wms.py?'+urlencode(dict(service='WMS',version='1.3.0',request='GetMap',layers='gfc2020_v3',styles='',crs='EPSG:3857',bbox=','.join(map(str,BM)),width=W,height=H,format='image/png',transparent='true'))
 p=fetch(url,'forest.png');im=Image.open(p);assert im.size==(W,H) and im.format=='PNG';(OUT/'forest.png').write_bytes(p.read_bytes())
 manifest=read(OUT/'raster-manifest.json');manifest['layers']=[x for x in manifest['layers'] if x['id']!='forest']
 manifest['layers'].append(dict(id='forest',image='forest.png',grid=None,width=W,height=H,bounds=BOUNDS,bounds3857=BM,breaks=[],colors=['#008000'],unit='森林の参考分布',year='2020',source='JRC Global Forest Cover 2020 v3',sourceUrl='https://forobs.jrc.ec.europa.eu/GFC/v3',method='提供元が描画したWMS画像を重ねています。森林の位置を確認する参考図で、地点の分類や森林面積の計算には使いません。国別の森林面積率はWorld Bank WDIの別の統計です。',license='Copernicus/JRC reuse with acknowledgement'))
 manifest['inputs']=[x for x in manifest['inputs'] if x['file']!='forest.png']+[input_record(p,url)]
 downloads=read(args.farming/'downloads.json');metadata=read(args.farming/'glw-zarr.json')['consolidated_metadata']['metadata']
 for species in ['sheep','goat','cattle']:
  m=metadata[species];assert m['shape']==[2160,4320] and m['attributes']['units']=='head/km2';assert np.allclose(m['attributes']['spatial:transform'],[1/12,0,-180,0,-1/12,90])
  name=f'glw-{species}_c_0_2';record=next(r for r in downloads if r['file']==name);assert sha(args.farming/name)==record['sha256']
  next(r for r in manifest['inputs'] if r['file']==name)['url']=record['url']
 # Apply the same national mask to the population PNG and query array.
 l=next(l for l in manifest['layers'] if l['id']=='population');lands=geography();to_m=Transformer.from_crs(4326,3857,always_xy=True).transform
 pm=geometry_mask([mapping(shape_transform(to_m,g)) for g in lands.values()],out_shape=(l['height'],l['width']),transform=from_bounds(*l['bounds3857'],l['width'],l['height']),invert=True)
 vals=np.frombuffer(gzip.decompress((OUT/l['grid']).read_bytes()),dtype='<f4').reshape(l['height'],l['width']).copy();vals[~pm]=-1;(OUT/l['grid']).write_bytes(gzip.compress(vals.tobytes(),mtime=0))
 rgba=np.asarray(Image.open(OUT/l['image'])).copy();rgba[~pm]=0;Image.fromarray(rgba).save(OUT/l['image'],optimize=True)
 l['positivePixels']=int((vals>0).sum());l['zeroPixels']=int((vals==0).sum());l['missingPixels']=int((vals<0).sum())
 l['method']='国勢調査等の人口を建物などの情報で配分した推計です。等面積の1km格子を5×5で平均し、広域の密度を表示します。表示と地点の数値に同じ国境マスクを使います。都市・国の人口を画素の合計から算出しません。'
 write(OUT/'raster-manifest.json',manifest)
 provenance=read(OUT/'water-provenance.json');provenance['basinAttributes']=input_record(args.water/'BasinATLAS_v10_lev06.dbf','https://www.hydrosheds.org/hydroatlas');write(OUT/'water-provenance.json',provenance)
 # Give connected catchments labels based on river geometries, never invented connections.
 rivers=read(OUT/'rivers.json')['features'];basins=read(OUT/'basins.json');lands=geography()
 names={'Nile':'ナイル川','Euphrates':'ユーフラテス川','Tigris':'ティグリス川','Jordan':'ヨルダン川','Kura':'クラ川','Aras':'アラス川','Arax':'アラス川','Kizilirmak':'クズルウルマク川','Karun':'カールーン川'}
 for f in basins['features']:
  g=shape(f['geometry']);p=f['properties'];p['countries']=[c for c,land in lands.items() if g.intersection(land).area>.001];p['areaDegrees']=g.area
  matches=[]
  for r in rivers:
   n=r['properties']['name'];line=shape(r['geometry'])
   if n in names and g.intersects(line) and g.intersection(line).length>line.length*.45:matches.append(names[n])
  p['name']=('・'.join(dict.fromkeys(matches))+'を含む流域' if matches else '流域')+'（'+p['id']+'）'
 basins['features'].sort(key=lambda f:f['properties']['areaDegrees'],reverse=True);write(OUT/'basins.json',basins)
 print('Forest, pasture and connected catchment labels ready',flush=True)

if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__)
 for key in ['cache','global-cache','climate','geography','farming','fao','urban','gpkg','water']:ap.add_argument('--'+key,type=Path,required=True)
 ap.add_argument('stage',choices=['rasters','stats','cities','urban','water','extras','finish']);ap.add_argument('--discover',action='store_true');args=ap.parse_args();args.cache.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
 globals()[args.stage]()
