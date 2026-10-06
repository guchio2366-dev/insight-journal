#!/usr/bin/env python3
"""Build Mexico cartographic crop zones and comparable 2025 production statistics.
Raw datasets remain outside the site repository. Dependencies: numpy, pandas,
numcodecs 0.16.5, shapely 2.1.2. Every derived number retains source scope.
"""
from pathlib import Path
import sys,json,hashlib,math,csv,gzip
import numpy as np
import pandas as pd
from numcodecs import Blosc,VLenUTF8,Zstd
from shapely import contains_xy, union_all
from shapely.geometry import shape,box,mapping,Point
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'data-source/atlas/mexico/agriculture-v2'
OUT=ROOT/'public/assets/atlas/mexico-agriculture-v2'
OUT.mkdir(parents=True,exist_ok=True)
BOUNDS=[-119,14,-86,33];STEP=1/12
GROUPS={
 'corn':{'label':'とうもろこし','codes':['maiz'],'siap':['Maíz grano']},
 'wheat':{'label':'小麦','codes':['whea'],'siap':['Trigo grano']},
 'beans':{'label':'インゲン豆','codes':['bean'],'siap':['Frijol']},
 'sorghum':{'label':'ソルガム','codes':['sorg'],'siap':['Sorgo grano']},
 'sugarcane':{'label':'さとうきび','codes':['sugc'],'siap':['Caña de azúcar','Caña de azúcar fruta','Caña de azúcar piloncillo']},
 'rice':{'label':'米','codes':['rice'],'siap':['Arroz palay']},
 'cotton':{'label':'綿花','codes':['cott'],'siap':['Algodón hueso']},
 'coffee':{'label':'コーヒー','codes':['coff','rcof'],'siap':['Café cereza']},
 'fruit':{'label':'果樹・果物','codes':['bana','plnt','citr','trof','temf'],'siap':['Aguacate','Algarrobo','Arrayán','Arándano','Caimito','Capulín','Carambolo','Cereza','Chabacano','Chirimoya','Ciruela','Cítricos','Durazno','Dátil','Frambuesa','Fresa','Frutales varios','Granada','Guamúchil','Guanábana','Guayaba','Higo','Jaca (jackfruit)','Lima','Limón','Limón real','Litchi','Mamey','Mandarina','Mango','Mangostán','Manzana','Maracuyá','Membrillo','Nanche','Naranja','Noni','Níspero','Papaya','Pera','Persimonio','Perón','Pitahaya','Pitaya','Piña','Plátano','Rambután','Saramuyo','Tamarindo','Tangelo','Tangerina','Tejocote','Toronja (pomelo)','Tuna','Uva','Zapote','Zarzamora']},
 'vegetables':{'label':'野菜','codes':['toma','onio','vege'],'siap':['Acelga','Ajo','Alcachofa','Apio','Baby back choi','Bangaña','Berenjena','Betabel','Boi choi','Brócoli','Calabacita','Calabaza','Cebolla','Chayote','Chilacayote','Chile seco','Chile verde','Chives','Chícharo','Col (repollo)','Col de bruselas','Coliflor','Ejote','Elote','Espinaca','Espárrago','Gai lan (kay laan)','Haba verde','Hongos, setas y champiñones','Hortalizas','Huauzontle','Jícama','Kale','Kohlrabi','Lechuga','Melón','Melón amargo','Nabo','Napa','Nopalitos','Okra (angú o gombo)','Pepino','Poro (leek)','Quelite','Romerito','Rábano','Sandía','Shangai-bock-choy','Shop suey','Tomate rojo (jitomate)','Tomate verde','Verdolaga','Yu-choy','Zanahoria']},
 'other':{'label':'その他の作物','codes':[],'siap':[]},
}
LIVESTOCK={'beef':('牛肉','Bovino','Carne'),'dairy':('牛乳','Bovino','Leche'),'pork':('豚肉','Porcino','Carne'),'broiler':('鶏肉','Ave','Carne'),'eggs':('鶏卵','Ave','Huevo plato')}
def dump(path,d):path.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
def sha(path):
 raw=path.read_bytes() if path.exists() else gzip.decompress(Path(str(path)+'.gz').read_bytes())
 return hashlib.sha256(raw).hexdigest()
def crc32c(data):
 crc=0xffffffff
 for byte in data:
  crc^=byte
  for _ in range(8):crc=(crc>>1)^(0x82f63b78 if crc&1 else 0)
 return crc^0xffffffff

def crop_data():
 metadata=json.loads((P/'spam-zarr.json').read_text())['consolidated_metadata']['metadata']
 assert metadata['physical_area']['shape']==[3,46,2160,4320]
 assert metadata['physical_area']['attributes']['units']=='ha'
 assert metadata['physical_area']['codecs'][0]['configuration']['chunk_shape']==[1,1,90,90]
 crop=list(VLenUTF8().decode(Zstd().decode((P/'spam-raw/crop__c__0').read_bytes())))
 names=list(VLenUTF8().decode(Zstd().decode((P/'spam-raw/crop_name__c__0').read_bytes())))
 assert list(VLenUTF8().decode(Zstd().decode((P/'spam-raw/technology__c__0').read_bytes())))[0]=='all'
 used={c for g in GROUPS.values() for c in g['codes']};GROUPS['other']['codes']=[c for c in crop if c not in used]
 west,south,east,north=BOUNDS;x0,x1=round((west+180)/STEP),round((east+180)/STEP);y0,y1=round((90-north)/STEP),round((90-south)/STEP)
 h,w=y1-y0,x1-x0;xs,ys=np.meshgrid(west+(np.arange(w)+.5)*STEP,north-(np.arange(h)+.5)*STEP)
 geo=json.loads((ROOT/'src/data/atlas/mexico/geometry.json').read_text());country=union_all([shape(f['geometry']) for f in geo['features']]);mask=contains_xy(country,xs,ys)
 group_grids={k:np.zeros((h,w),dtype=float) for k in GROUPS};all_valid=np.zeros((h,w),dtype=bool);bycrop=[];decoder=Blosc()
 acquisition=json.loads((P/'spam-acquisition.json').read_text())
 packed=[]
 snapshot=np.load(P/'mapspam-mexico-physical-area.npz')
 assert list(snapshot['crops'])==crop and list(snapshot['bounds'])==BOUNDS
 assert snapshot['grids'].shape==(46,h,w)
 for ci,c in enumerate(crop):
  grid=snapshot['grids'][ci].copy()
  grid[(grid==-9999)|~mask]=np.nan;assert np.all(grid[np.isfinite(grid)]>=0)
  packed.append(grid.copy())
  all_valid|=np.isfinite(grid);group=next(k for k,g in GROUPS.items() if c in g['codes']);group_grids[group]+=np.nan_to_num(grid,nan=0)
  bycrop.append({'code':c,'name':names[ci],'groupId':group,'modelledPhysicalAreaHa':round(float(np.nansum(grid,dtype=np.float64)),2)})
 # The retained snapshot contains exact source float32 cells; never infer values from polygons.
 grids=np.stack(list(group_grids.values()));total=grids.sum(axis=0);dominant=np.argmax(grids,axis=0)
 rowarea=6371.0088**2*math.radians(STEP)*(np.sin(np.radians(ys[:,0]+STEP/2))-np.sin(np.radians(ys[:,0]-STEP/2)))*100
 coverage=total/rowarea[:,None];display=mask&all_valid&(coverage>=.1)
 features=[];labels=[];group_summary=[]
 states=[]
 for f in geo['features']:
  sm=contains_xy(shape(f['geometry']),xs,ys)
  states.append({'code':f['properties']['code'],'label':f['properties']['nameJa'],'items':{k:round(float(g[sm].sum()),2) for k,g in group_grids.items()}})
 for gi,(gid,g) in enumerate(GROUPS.items()):
  yy,xx=np.where(display&(dominant==gi));cells=[box(west+x*STEP,north-(y+1)*STEP,west+(x+1)*STEP,north-y*STEP) for y,x in zip(yy,xx)]
  merged=union_all(cells).intersection(country) if cells else None
  components=sorted(([merged] if merged.geom_type=='Polygon' else [z for z in merged.geoms if z.geom_type=='Polygon']) if merged and not merged.is_empty else [],key=lambda p:p.area,reverse=True)
  for idx,poly in enumerate(components):
   # Keep exact grid geometry and country clipping; no invented or smoothed shapes.
   included=contains_xy(poly,xs[yy,xx],ys[yy,xx]);n=int(included.sum())
   if not n:continue
   cid=f'{gid}-{idx+1:04d}';features.append({'type':'Feature','properties':{'cropId':gid,'componentId':cid,'sourceCellCount':n,'year':2020},'geometry':mapping(poly)})
   if idx<2:
    px,py=poly.centroid.x,poly.centroid.y;iy,ix=yy[included],xx[included];j=np.argmin((xs[iy,ix]-px)**2*np.cos(math.radians(py))**2+(ys[iy,ix]-py)**2)
    labels.append({'id':cid,'cropId':gid,'label':g['label'],'anchor':[round(float(xs[iy[j],ix[j]]),6),round(float(ys[iy[j],ix[j]]),6)],'sourceCellCount':n})
  topstates=sorted(states,key=lambda s:s['items'][gid],reverse=True)[:5]
  group_summary.append({'id':gid,'label':g['label'],'sourceCropCodes':g['codes'],'modelledPhysicalAreaHa':round(float(group_grids[gid][mask].sum()),2),'displayCells':len(cells),'components':sum(f['properties']['cropId']==gid for f in features),'rawClippedComponents':len(components),'omittedNoCenterFragments':len(components)-sum(f['properties']['cropId']==gid for f in features),'topModelledAreaStates':[{'code':s['code'],'label':s['label'],'valueHa':s['items'][gid]} for s in topstates]})
  print('CROP',gid,len(cells),'cells',len(components),'zones',flush=True)
 # Sparse per-cell source values preserve traceability without interpreting polygon footprint as cultivated area.
 query={'bounds':BOUNDS,'width':w,'height':h,'cellSize':STEP,'year':2020,'unit':'ha','groupIds':list(GROUPS),'cells':[[int(i),*[round(float(grids[j].ravel()[i]),2) for j in range(len(GROUPS))]] for i in np.flatnonzero((mask&all_valid&(total>0)).ravel())]}
 dump(OUT/'crop-grid-query.json',query)
 return {'type':'FeatureCollection','features':features},labels,{'groups':group_summary,'crops':bycrop,'extent':BOUNDS,'sourceCellsWithinMexico':int(mask.sum()),'sourceValidCells':int((mask&all_valid).sum()),'displayCells':int(display.sum()),'coverageThreshold':.1,'sourceCellResolutionDegrees':STEP,'queryFile':'crop-grid-query.json','maskSha256':sha(ROOT/'src/data/atlas/mexico/geometry.json')}

def statistics():
 a=pd.read_csv(P/'siap-agricola-2025.csv.gz',encoding='latin1');b=pd.read_csv(P/'siap-pecuario-2025.csv.gz',encoding='latin1')
 assert set(a.Anio)=={2025} and set(b.Anio)=={2025}
 assert set(a.Idestado)==set(range(1,33)) and set(b.Cveestado)==set(range(1,33))
 assert a.Valorproduccion.notna().all() and b.Valor.notna().all()
 assigned={n:k for k,g in GROUPS.items() for n in g['siap']};a['kindId']=a.Nomcultivo.map(assigned).fillna('other')
 b=b[b.Nomproducto!='Ganado en Pie'].copy();b['kindId']='other'
 for k,(_,sp,prod) in LIVESTOCK.items():b.loc[(b.Nomespecie==sp)&(b.Nomproducto==prod),'kindId']=k
 b['valueMxN']=b.Valor*1000
 def crop_items(d):
  result={}
  for k,g in GROUPS.items():
   t=d[d.kindId==k];units=list(t.Nomunidad.unique());valid=len(units)==1 and units[0]=='Tonelada'
   result[k]={'id':k,'label':g['label'],'production':round(float(t.Volumenproduccion.sum()),3) if valid else None,'unit':'t' if valid else None,'valueMxN':round(float(t.Valorproduccion.sum()),2),'harvestedAreaHa':round(float(t.Cosechada.sum()),2),'reportedRows':len(t),'sourceCropNames':sorted(t.Nomcultivo.unique())}
  return result
 def animal_items(d):
  result={}
  for k in [*LIVESTOCK,'other']:
   t=d[d.kindId==k];valid=k!='other'
   result[k]={'id':k,'label':LIVESTOCK[k][0] if valid else 'その他の畜産品','production':round(float(t.Volumen.sum()),3) if valid else None,'unit':('千L' if k=='dairy' else 't') if valid else None,'valueMxN':round(float(t.valueMxN.sum()),2),'reportedRows':len(t),'sourceSpeciesProducts':sorted(set(t.Nomespecie+' / '+t.Nomproducto))}
  return result
 def group(d,statekey,valuekey,func):
  r={'year':2025,'national':{'items':func(d),'totalValueMxN':round(float(d[valuekey].sum()),2)},'states':[]}
  for state,t in d.groupby(statekey):r['states'].append({'code':str(int(state)).zfill(2),'items':func(t),'totalValueMxN':round(float(t[valuekey].sum()),2)})
  assert abs(sum(s['totalValueMxN'] for s in r['states'])-r['national']['totalValueMxN'])<.1
  assert abs(sum(s['valueMxN'] for s in r['national']['items'].values())-r['national']['totalValueMxN'])<.1
  return r
 crops=group(a,'Idestado','Valorproduccion',crop_items);livestock=group(b,'Cveestado','valueMxN',animal_items)
 composition=[]
 for id,label,data in [('crops','耕種作物',crops),('livestock','畜産物',livestock)]:
  composition.append({'id':id,'label':label,'totalValueMxN':data['national']['totalValueMxN'],'items':[{'id':x['id'],'label':x['label'],'valueMxN':x['valueMxN']} for x in data['national']['items'].values()]})
 return crops,livestock,composition

def distance(a,b):
 lon1,lat1,lon2,lat2=map(math.radians,[*a,*b]);return 6371.0088*2*math.asin(min(1,math.sqrt(math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2)))

def markers():
 seats=json.loads((P/'municipal-seats.json').read_text());candidates=json.loads((P/'livestock-candidates.json').read_text());out=[]
 for kind in LIVESTOCK:
  selected=[]
  for c in [x for x in candidates if x['id']==kind]:
   s=seats[c['geoCode']];l=s['locality'];anchor=[float(l['longitud']),float(l['latitud'])]
   if any(distance(anchor,x['anchor'])<150 for x in selected):continue
   r={'id':kind+'-'+c['geoCode'],'kindId':kind,'label':c['municipality'],'state':c['state'],'stateCode':c['stateCode'],'municipalityCode':c['municipalityCode'],'anchor':anchor,'seatLabel':s['seat'],'production':c['production'],'unit':'千L' if kind=='dairy' else 't','valueMxN':c['valueMxN'],'year':2025,'sourceUrl':'https://nube.agricultura.gob.mx/datosAbiertos/Pecuario.php','coordinateSourceUrl':s['sources'][1]['url'],'stateNationalRank':c['stateNationalRank'],'municipalityRankWithinState':1,'sourceSpecies':c['species'],'sourceProduct':c['product']}
   selected.append(r)
   if len(selected)==3:break
  out.extend(selected)
 assert len(out)==15
 return out

def main():
 snapshot_manifest=json.loads((P/'source-snapshot.json').read_text())
 for filename,expected in snapshot_manifest['inputs'].items():
  assert sha(P/filename)==expected['sha256'],f'Source snapshot changed: {filename}'
 assert sha(ROOT/snapshot_manifest['nationalGeometry']['path'])==snapshot_manifest['nationalGeometry']['sha256'],'Mexico clipping geometry changed'
 zones,labels,mapmeta=crop_data();crops,livestock,composition=statistics();marker=markers()
 sources=[{'id':'crop-map','title':'IFPRI MapSPAM 2020 v2r2 via CGIAR Climate Action Data Hub','year':2020,'url':'https://cgiar-climate-data-hub.github.io/catalog/spam2020/','doi':'https://doi.org/10.7910/DVN/SWPENT','license':'CC-BY-SA-4.0'}, {'id':'crops-statistics','title':'DGSIAP Cierre de la Producción Agrícola 2025','year':2025,'url':'https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php','downloadUrl':'https://nube.agricultura.gob.mx/index.php?ANIO=2025&view=10AE434F-A2158368-A120BC5A-EDF4AFAA','sha256':sha(P/'siap-agricola-2025.csv'),'license':'DGSIAP Datos abiertos general reuse statement; no separate 2025-specific license asserted','licenseUrl':'https://nube.agricultura.gob.mx/datosAbiertos/'}, {'id':'livestock-statistics','title':'DGSIAP Cierre de la Producción Pecuaria 2025','year':2025,'url':'https://nube.agricultura.gob.mx/datosAbiertos/Pecuario.php','downloadUrl':'https://nube.agricultura.gob.mx/index.php?ANIO=2025&view=E370DEBE-390827E8-72838350-94616860','sha256':sha(P/'siap-pecuario-2025.csv'),'license':'DGSIAP Datos abiertos general reuse statement; no separate 2025-specific license asserted','licenseUrl':'https://nube.agricultura.gob.mx/datosAbiertos/'}, {'id':'municipality-locations','title':'INEGI Catálogo Único de Claves Geoestadísticas, municipal seats','retrieved':'2026-10-06','url':'https://www.inegi.org.mx/servicios/catalogounico.html','license':'INEGI Términos de Libre Uso','licenseUrl':'https://www.inegi.org.mx/inegi/terminos.html'}]
 methods={'cropMap':'2020年の5分格子（約8～9km）の栽培面積推計。46作物を11区分にまとめ、各格子で面積が最大の区分を着色。作物面積合計が格子面積の10%以上の格子を表示。格子中心がメキシコ内の格子を採用し、同区分の隣接格子を結合して国境で切り抜き。格子中心を含まない極小の切抜き断片は省略。区画境界や耕地被覆の実測ではなく、格子全体が耕地という意味でもない。','cropLabels':'面積が大きい連続表示域から、重心に最も近い実際の格子中心を選んだ位置。農場・施設の位置ではない。','livestockMarkers':'2025年の品目別生産額上位5州を順に見て、各州で生産額最大の自治体を候補とし、同品目150km以上の間隔で3地点選択。自治体庁所在地の公的座標に記号を配置。自治体の年間生産を示す代表位置で、農場・施設・家畜の正確な位置ではない。','valueComposition':'2025年の名目生産額。農業CSVのValorproduccionはペソ、畜産CSVのValorは千ペソなので1000倍。畜産は食肉・乳・卵・蜂蜜・蜜ろう・羊毛を含み、生体家畜（Ganado en Pie）は食肉との二重計上を避け除外。林業・漁業は含めない。GDP・所得・輸出額ではない。','periods':'地図はMapSPAM2020、数量・生産額・畜産代表自治体はDGSIAP2025。時点と指標が異なるため、地図の色から2025年の収量や順位は読めない。','units':'穀物・果物・野菜・食肉・卵はt。牛乳は千L。コーヒーの数量は生豆ではなくCafé cereza（収穫した果実）。その他の作物・畜産品は単位が混在するため数量を合計せず、生産額のみ合計。','missing':'SIAPに行がない州・品目の値は記録された生産額の合計0であり、未報告や非掲載を含む可能性がある。数量単位を一意に確認できない区分はnull。','groups':'MapSPAMとSIAPは品目分類が異なる。地図はMapSPAMの作物コード、2025年統計は明示したSIAP品目名で独立に分類。分類の完全一致や年次比較を意味しない。'}
 derived_license={'originalTitle':'Global Spatially-Disaggregated Crop Production Statistics Data for 2020 Version 2.0 Release 2','creator':'International Food Policy Research Institute (IFPRI)','derivedOn':'2026-10-06','license':'CC-BY-SA-4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','scope':['agriculture-atlas.json#cropZones','agriculture-atlas.json#cropLabels','agriculture-atlas.json#metadata/map','crop-grid-query.json','mapspam-mexico-physical-area.npz'],'attribution':'International Food Policy Research Institute (IFPRI), MapSPAM 2020 v2r2, via CGIAR Climate Action Data Hub. Derived Mexico data by Insight Journal.','sourceUrl':'https://cgiar-climate-data-hub.github.io/catalog/spam2020/','doi':'https://doi.org/10.7910/DVN/SWPENT','changes':'Clipped source grid to Mexico using INEGI geometry, grouped 46 crops into 11 categories, selected cells with at least 10% modelled crop coverage, selected dominant crop groups, merged adjacent cells, omitted center-free clipping fragments, derived label anchors and display query values. No endorsement implied.','exclusions':'This ShareAlike notice applies to MapSPAM-derived data, not application code, DGSIAP statistical records or INEGI source geometry.'}
 data={'schemaVersion':1,'years':{'map':2020,'statistics':2025},'cropZones':zones,'cropLabels':labels,'livestockMarkers':marker,'crops':crops,'livestock':livestock,'composition':composition,'metadata':{'retrieved':'2026-10-06','derivedDataLicense':derived_license,'sources':sources,'methods':methods,'map':mapmeta,'cropStatisticsGroupMapping':{k:g['siap'] for k,g in GROUPS.items()},'checks':{'cropZoneFeatures':len(zones['features']),'cropLabels':len(labels),'livestockMarkers':len(marker),'cropStates':32,'livestockStates':32,'valueUnitConversion':1000,'doubleCountedLiveAnimalRowsExcluded':True,'nationalGroupAndStateValueBalancesPassed':True}}}
 dump(OUT/'agriculture-atlas.json',data)
 dump(P/'provenance.json',{'sources':sources,'spamRaw':json.loads((P/'spam-acquisition.json').read_text()),'municipalCoordinates':json.loads((P/'municipal-seats.json').read_text()),'dictionaries':[{'path':'siap-agricola-dictionary.xlsx','sha256':sha(P/'siap-agricola-dictionary.xlsx'),'url':'https://nube.agricultura.gob.mx/index.php?view=5D24F995-E734D711-1EA6F8D2-9D1387D7'},{'path':'siap-pecuario-dictionary.xlsx','sha256':sha(P/'siap-pecuario-dictionary.xlsx'),'url':'https://nube.agricultura.gob.mx/index.php?view=97745C73-E8752154-CEC8E8CA-E1794BAA'}]})
 manifest={'schemaVersion':1,'derivedDataLicense':derived_license,'dataset':'agriculture-atlas.json','datasetSha256':sha(OUT/'agriculture-atlas.json'),'bytes':(OUT/'agriculture-atlas.json').stat().st_size,'years':data['years'],'retrieved':'2026-10-06','sources':sources,'methods':methods,'checks':data['metadata']['checks'],'sourceSnapshotSha256':sha(P/'mapspam-mexico-physical-area.npz'),'query':{'path':'crop-grid-query.json','sha256':sha(OUT/'crop-grid-query.json')},'reproduce':'python scripts/prepare-mexico-agriculture-parity.py','license':'Crop-zone and crop-grid derivatives: CC-BY-SA-4.0. DGSIAP and INEGI source terms apply to other data.'}
 dump(OUT/'manifest.json',manifest)
 print('DELIVERABLE', (OUT/'agriculture-atlas.json').stat().st_size,flush=True)
 print('COMPOSITION',json.dumps(composition,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
