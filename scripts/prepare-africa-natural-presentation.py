"""Offline Africa rain/relief/watershed display from pinned reusable sources.

python3 scripts/prepare-africa-natural-presentation.py --gpcc <private.nc.gz>
  --rivers10 <private Natural Earth v5.1.2 GeoJSON>
All changes are display derivatives; retained physical/query sources stay intact.
"""
import argparse,gzip,hashlib,io,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
import contourpy
import numpy as np
from scipy.io import netcdf_file
from scipy.ndimage import gaussian_filter,map_coordinates
from PIL import Image,ImageDraw
from importlib.util import spec_from_file_location,module_from_spec

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/africa-natural-presentation-v2'
BOUNDS=[-27,-36,64,39]; WIDTH=910; HEIGHT=750
RAIN_COLORS=['#eef7fb','#dceef7','#c7e3f2','#add5eb','#8fc4df','#6fb1d3','#529ac5','#3d82b4','#2f6da4','#245b94','#1c4b82','#153b6d','#0c2d57','#092747','#07223c','#051d32','#041829','#031420','#020f19','#010b13','#01070d']
ELEV_COLORS=['#d1ddd0','#dfe1bd','#e1d5ad','#d5c39a','#c4ad88','#b1977d','#9e8575','#b4a194','#d2c4b8','#eee8e1']
GPCC_SHA='3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5'
RIVERS_SHA='bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a'

def sha(data):return hashlib.sha256(data).hexdigest()
def write(name,value):
 raw=(json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
 (OUT/name).write_bytes(gzip.compress(raw,mtime=0) if name.endswith('.gz') else raw)
def coords(points):return [[round(float(x),7),round(float(y),7)] for x,y in points]
def fc(features):return {'type':'FeatureCollection','bbox':BOUNDS,'features':features}
def contour_assets(values,valid,x,y,levels,colors,prefix,land):
 generator=contourpy.contour_generator(x=x,y=y,z=np.ma.array(values,mask=~valid),name='serial',corner_mask=False,line_type='Separate',fill_type='OuterOffset',z_interp='Linear')
 image=Image.new('RGBA',(WIDTH*2,HEIGHT*2));draw=ImageDraw.Draw(image)
 project=lambda ring:[((float(a)+27)*20,(39-float(b))*20) for a,b in ring]
 lower=min(float(values[valid].min())-1,0);limits=[lower,*levels,float(values[valid].max())+1]
 band_features=[];lines=[];labels=[]
 for i,(lo,hi) in enumerate(zip(limits[:-1],limits[1:])):
  if lo>=hi:continue
  points,offsets=generator.filled(lo,hi)
  for polygon,offset in zip(points,offsets):
   rings=[polygon[int(a):int(b)] for a,b in zip(offset[:-1],offset[1:])]
   # Separate temporary mask preserves holes without erasing another polygon.
   mask=Image.new('1',image.size);pen=ImageDraw.Draw(mask)
   for j,ring in enumerate(rings):pen.polygon(project(ring),fill=1 if j==0 else 0)
   image.paste(colors[i],mask=mask)
  band_features.append({'lower':None if i==0 and lo<0 else lo,'upper':None if i==len(levels) else hi,'color':colors[i]})
 for level in levels:
  parts=generator.lines(level)
  if not parts:continue
  features=[coords(part) for part in parts]
  lines.append({'type':'Feature','id':f'{prefix}-{level}','properties':{'id':f'{prefix}-{level}','value':level,'precipitationMm':level if prefix=='rain' else None,'elevationM':level if prefix=='elevation' else None},'geometry':{'type':'MultiLineString','coordinates':features}})
  chosen=[]
  for part in sorted(parts,key=lambda p:np.linalg.norm(np.diff(p,axis=0),axis=1).sum(),reverse=True):
   if np.linalg.norm(np.diff(part,axis=0),axis=1).sum()<1.5:continue
   for ratio in [.5,.35,.65,.2,.8]:
    point=part[int((len(part)-1)*ratio)];c=int((point[0]+27)*10);r=int((39-point[1])*10)
    if not (0<=r<HEIGHT and 0<=c<WIDTH and land[r,c]):continue
    if any(np.linalg.norm(point-np.array(item['coordinates']))<3 for item in labels):continue
    chosen.append(point);labels.append({'value':level,'label':str(level),'coordinates':coords([point])[0]});break
   if len(chosen)>=2:break
 image=image.resize((WIDTH,HEIGHT),Image.Resampling.NEAREST)
 rgba=np.asarray(image).copy();rgba[~land]=0;Image.fromarray(rgba).save(OUT/f'{prefix}.png',optimize=True)
 write(f'{prefix}-lines.geojson.gz',fc(lines));write(f'{prefix}-labels.json',labels)
 return band_features,{'features':len(lines),'labels':len(labels),'maximum':float(values[valid].max()),'validNodes':int(valid.sum())}

def inside(point,geometry):
 def ring_contains(ring):
  x,y=point;hit=False
  for a,b in zip(ring,ring[1:]):
   if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
  return hit
 polys=[geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
 return any(ring_contains(poly[0]) and not any(ring_contains(r) for r in poly[1:]) for poly in polys)

def basins(rivers_path):
 source=json.loads(gzip.decompress((ROOT/'public/assets/atlas/africa-water-v1/basins.geojson.gz').read_bytes()))
 original={f['properties']['sourceId']:f for f in source['features']}
 # Source geometry, source NEXT_SINK network, named river co-location. No MAIN_BAS virtual linking.
 selection=[('congo','コンゴ川',1060020040,['Congo'],[22,-2],'大西洋'),('nile','ナイル川',1060034260,['Nile','White Nile','Blue Nile','Mountain Nile','Albert Nile','Victoria Nile','Rosetta Branch','Damietta Branch'],[31,18],'地中海'),('niger','ニジェール川',1060022420,['Niger'],[1,13],'ギニア湾'),('zambezi','ザンベジ川',1060011660,['Zambezi'],[28,-14],'インド洋'),('orange','オレンジ川',1060015850,['Orange'],[22,-29],'大西洋'),('limpopo','リンポポ川',1060012590,['Limpopo'],[29,-24],'インド洋'),('senegal','セネガル川',1060027410,['Sénégal'],[-12,14],'大西洋'),('volta','ボルタ川',1060023300,['Volta'],[-2,10],'ギニア湾'),('ogooue','オゴウェ川',1060020570,['Ogooué'],[12,-1],'大西洋'),('okavango','オカバンゴ川・マクガディクガディ内流域',1060040200,['Okavango'],[21,-17],'内陸湿地・塩湖'),('chad','チャド湖内流域',1060040190,['Chari'],[17,12],'チャド湖')]
 colors=['#bed4e5','#d3dce8','#d0dbc0','#b9d7cf','#e1d0be','#ddc5d5','#c5d7e4','#d9dbb6','#c6dad5','#dfd5bd','#c8d0df']
 river_source=json.loads(rivers_path.read_bytes());flows=[];areas=[];checks=[]
 for index,(identifier,name,sink,names,label,outlet) in enumerate(selection):
  f=original[sink];p=f['properties'];members=p['sourceMemberAttributes'];ids={m['HYBAS_ID'] for m in members}
  assert all(m['NEXT_SINK']==sink for m in members)
  assert all(m['NEXT_DOWN']==0 or m['NEXT_DOWN'] in ids for m in members)
  assert sum(m['NEXT_DOWN']==0 for m in members)==1
  links={m['HYBAS_ID']:m['NEXT_DOWN'] for m in members}
  for origin in ids:
   current=origin;trail=set()
   while current:
    assert current not in trail,('network cycle',sink,origin)
    trail.add(current);current=links[current]
   assert sink in trail,('disconnected terminal',sink,origin)
  assert abs(sum(m['SUB_AREA'] for m in members)-p['sourceAreaKm2'])<.1
  matches=[];sample_count=inside_count=0
  for source_index,river in enumerate(river_source['features']):
   n=river['properties'].get('name_en') or river['properties'].get('name')
   if n not in names:continue
   g=river['geometry'];parts=[g['coordinates']] if g['type']=='LineString' else g['coordinates']
   points=[point for part in parts for point in part[::max(1,len(part)//30)]]
   inside_n=sum(inside(point,f['geometry']) for point in points)
   delta_exception=identifier=='nile' and n=='Damietta Branch'
   if delta_exception:
    # HydroBASINS puts the eastern delta in a COAST aggregate rather than the
    # Nile NEXT_SINK. Keep the original named distributary, never union that
    # aggregate into a claimed single-river catchment.
    assert inside(parts[0][0],f['geometry'])
    assert inside(parts[0][-1],original[1060034270]['geometry'])
    assert original[1060034270]['properties']['coastal']
   else:assert inside_n/len(points)>.7,(identifier,n,inside_n,len(points))
   sample_count+=len(points);inside_count+=inside_n
   flow_id=f'ne10-river-{source_index:04d}';matches.append(flow_id)
   flows.append({'type':'Feature','id':flow_id,'properties':{'id':flow_id,'name':name,'sourceName':n,'basinId':identifier,'riverId':identifier,'color':'#397ca0','sourceIndex':source_index,'deltaCoastalAggregateException':delta_exception,'spatialCheck':{'inside':inside_n,'samples':len(points)}},'geometry':g})
  assert matches
  areas.append({'type':'Feature','id':identifier,'properties':{'id':identifier,'name':name+'の集水域' if not p['endorheic'] else name,'riverId':identifier,'riverFeatureIds':matches,'sourceId':sink,'NEXT_SINK':sink,'sourceAreaKm2':p['sourceAreaKm2'],'endorheic':p['endorheic'],'coastal':p['coastal'],'subBasins':p['subBasins'],'labelCoordinates':label,'outletName':outlet,'color':colors[index],'sourceMemberIds':sorted(ids),'outletAttributes':p['sourceOutletAttributes'],'fullBounds':p['fullBounds']},'geometry':f['geometry']})
  checks.append({'id':identifier,'sink':sink,'networkConnected':True,'allMembersReachTerminal':True,'members':len(ids),'sourceAreaKm2':p['sourceAreaKm2'],'riverSamples':sample_count,'riverSamplesInside':inside_count})
 write('major-basins.geojson.gz',fc(areas));write('major-rivers.geojson.gz',fc(flows));write('basin-network-validation.json',checks)
 return checks

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--gpcc',type=Path,required=True);ap.add_argument('--rivers10',type=Path,required=True);args=ap.parse_args()
 assert sha(args.gpcc.read_bytes())==GPCC_SHA;assert sha(args.rivers10.read_bytes())==RIVERS_SHA
 OUT.mkdir(parents=True,exist_ok=True)
 spec=spec_from_file_location('africa_physical',ROOT/'scripts/prepare-africa-physical.py');physical=module_from_spec(spec);spec.loader.exec_module(physical)
 countries=json.loads((ROOT/'src/data/atlas/africa-geography.json').read_text());land,_=physical.land_masks(countries)
 physical_manifest=json.loads((ROOT/'public/assets/atlas/africa-physical-v1/manifest.json').read_bytes())
 elev=np.frombuffer(gzip.decompress((ROOT/'public/assets/atlas/africa-physical-v1/elevation.values.gz').read_bytes()),dtype='<i2').reshape(HEIGHT,WIDTH);ev=elev!=-32768
 x=-27+(np.arange(WIDTH)+.5)*.1;y=39-(np.arange(HEIGHT)+.5)*.1
 elevation_bands,elevation_checks=contour_assets(elev,ev,x,y,list(range(0,4501,500)),['#c5d6cf',*ELEV_COLORS],'elevation',land)
 # Display-only normalized convolution keeps original numeric lookup unchanged.
 weights=gaussian_filter(ev.astype(float),sigma=2);smooth=gaussian_filter(np.where(ev,elev,0).astype(float),sigma=2)/np.maximum(weights,1e-12)
 normalized=np.clip(smooth/3000,0,1);low=np.array([225,231,211]);high=np.array([184,163,138]);rgb=low[None,None,:]*(1-normalized[:,:,None])+high[None,None,:]*normalized[:,:,None]
 gy,gx=np.gradient(smooth);shade=np.clip((gx-gy)/180,-.10,.10);rgb*=1+shade[:,:,None]
 relief=np.zeros((HEIGHT,WIDTH,4),dtype='uint8');relief[:,:,:3]=np.clip(rgb,0,255);relief[:,:,3]=np.where(ev,255,0);Image.fromarray(relief).save(OUT/'terrain.png',optimize=True)
 with netcdf_file(io.BytesIO(gzip.decompress(args.gpcc.read_bytes())),mmap=False) as nc:
  v=nc.variables['gpcc_precip'];assert v.data.shape==(12,720,1440) and v.units==b'mm/month';assert nc.time_coverage_start==b'1991-01-01' and nc.time_coverage_end==b'2020-12-31'
  lons=nc.variables['lon'].data.copy();lats=nc.variables['lat'].data.copy();assert np.all(lons==-179.875+np.arange(1440)*.25) and np.all(lats==89.875-np.arange(720)*.25)
  col=np.where((lons>=-27.25)&(lons<=64.25))[0];row=np.where((lats>=-36.25)&(lats<=39.25))[0]
  monthly=v.data[:,row[0]:row[-1]+1,col[0]:col[-1]+1].astype('<f4');valid=np.all(np.isfinite(monthly)&(monthly>=0)&(monthly!=v._FillValue),axis=0)
  annual=np.full(valid.shape,-1,dtype='<f4');annual[valid]=monthly.astype('float64').sum(axis=0)[valid].astype('float32');rx=lons[col];ry=lats[row]
  archive=gzip.compress(monthly.tobytes(),mtime=0);(OUT/'rain-monthly-native.bin.gz').write_bytes(archive)
  write('rain-native-window.json',{'rows':len(row),'columns':len(col),'longitude':rx.tolist(),'latitude':ry.tolist(),'encoding':'float32-le-gzip','months':12,'sourceNoData':float(v._FillValue),'originalArchiveSha256':GPCC_SHA,'monthlySha256':sha(archive)})
  levels=list(range(250,int(np.ceil(annual[valid].max()/250))*250,250));assert len(levels)<len(RAIN_COLORS)
  rain_bands,rain_checks=contour_assets(annual,valid,rx,ry,levels,RAIN_COLORS,'rain',land)
  source_rows=np.floor((90-y)/.25).astype(int)-row[0];source_cols=np.floor((x+180)/.25).astype(int)-col[0]
  lookup=annual[source_rows[:,None],source_cols[None,:]].copy();lookup[~land]=-1;(OUT/'rain.values.gz').write_bytes(gzip.compress(lookup.astype('<f4').tobytes(),mtime=0))
  rain_checks['lookupPreservesNativeAnnual']=True;rain_checks['oceanAndOutsideTransparent']=True
 basin_checks=basins(args.rivers10)
 rain_source=json.loads((ROOT/'data-source/atlas/europe/precipitation/source.json').read_bytes())
 common={'bounds':BOUNDS,'width':WIDTH,'height':HEIGHT,'resolutionDegrees':.1,'crs':'EPSG:4326','gridOrder':'row-major north-to-south, west-to-east'}
 elevation_source={k:v for k,v in physical_manifest['layers']['elevation'].items() if k not in ['image','grid','breaks','colors']}
 hydro_source=json.loads((ROOT/'public/assets/atlas/africa-water-v1/manifest.json').read_bytes())['layers']['basins']
 rain={**common,**rain_source,'title':'年間降水量','image':'rain.png','file':'rain-lines.geojson.gz','labels':'rain-labels.json','grid':'rain.values.gz','encoding':'float32-le-gzip','noData':-1,'unit':'mm/年','period':'1991–2020年平年値','breaks':levels,'colors':RAIN_COLORS[:len(levels)+1],'bands':rain_bands,'method':'GPCC原0.25°格子の12か月完全値を合計。元格子中心間の線形補間で250mm等雨量線と同じ境界の青色帯を作成。国平均は使わず、欠測を補完しない。表示0.1°は数値の原解像度を高めない。','limitations':'雨量計から補間した平年分布。欠測に接する四角形は描画しない。細い谷や観測地点そのものの雨量ではない。数値照会は最近傍の元格子年合計で、線形補間の表示色と異なる場合がある。','sourceName':rain_source['dataset'],'attribution':rain_source['attribution'].replace('target-country display masking, nearest-neighbour Web Mercator display and colour classes.','Africa mask; 250 mm linear contours and matched blue bands; unchanged nearest native annual lookup.')}
 elevation={**common,**elevation_source,'title':'標高','image':'elevation.png','grid':'../africa-physical-v1/elevation.values.gz','file':'elevation-lines.geojson.gz','labels':'elevation-labels.json','breaks':list(range(0,4501,500)),'colors':['#c5d6cf',*ELEV_COLORS],'bands':elevation_bands,'method':elevation_source['method']+' 500m間隔の線と、その同一境界で塗り分けた標高帯。0m未満の陸地も保持。'}
 terrain={**common,**elevation_source,'title':'地形の起伏','image':'terrain.png','grid':'../africa-physical-v1/elevation.values.gz','method':elevation_source['method']+' 表示のみ0.1°格子でsigma2セルの正規化Gaussianと弱い斜光表現。等高線・数値段階色は重ねず、元の照会値は変更しない。','unit':'起伏の概観','colors':[],'limitations':'地形形状を読む柔らかな起伏背景。地質・地形分類や実測陰影ではない。海岸や欠測域への描画は行わない。'}
 area_features=json.loads(gzip.decompress((OUT/'major-basins.geojson.gz').read_bytes()))['features']
 major={**hydro_source,'file':'major-basins.geojson.gz','title':'主要水系の集水域','unit':'集水面 / 出典面積km²','derivedFeatureCount':len(area_features),'derivedVertexCount':sum(len(ring) for f in area_features for poly in (f['geometry']['coordinates'] if f['geometry']['type']=='MultiPolygon' else [f['geometry']['coordinates']]) for ring in poly),'legend':[{'id':f['properties']['id'],'label':f['properties']['name'],'color':f['properties']['color']} for f in area_features],'method':hydro_source['method']+' 主要11水系を原NEXT_SINKで識別。全sourceMemberのNEXT_DOWN接続、末端一意性、面積総和、名付き河道との空間照合を確認。','scope':'主要外流9水系とチャド湖・オカバンゴ/マクガディクガディ内流域。海岸集約区画は単独河川の流域として表示しない。','limitations':'BasinATLASの末端集水面。内流域の湖・湿地間で実際に常時水が流れるとは限らない。表示境界は0.008°一般化。ナイル東部デルタのDamietta分流は海岸集約区画へ流れる原本河道を保持するが、その集約面をナイルの単独集水面に統合しない。'}
 rivers={'file':'major-rivers.geojson.gz','sourceName':'Natural Earth 1:10 million rivers/lake centre lines v5.1.2','sourceUrl':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_rivers_lake_centerlines.geojson','sourceSHA256':RIVERS_SHA,'license':'Public domain','licenseUrl':'https://www.naturalearthdata.com/about/terms-of-use/','period':'Natural Earth v5.1.2','unit':'河川・湖の中心線','method':'選択11水系の原本名付き本流・ナイル支流/デルタ分流を保持。線を人工接続せず、原本の湖・河道の分離も保持。BasinATLAS末端集水面との空間照合。','limitations':'一般化河道。原本の下流端が実際の河口まで達しない川がある。河口まで架空の線を継ぎ足さない。'}
 manifest={'schemaVersion':2,'version':'2.0.0',**common,'layers':{'rain':rain,'elevation':elevation,'terrain':terrain,'basins':major,'rivers':rivers},'checks':{'rain':rain_checks,'elevation':elevation_checks,'basins':basin_checks},'processing':{'script':'scripts/prepare-africa-natural-presentation.py','scriptSHA256':sha(Path(__file__).read_bytes()),'contourpy':contourpy.__version__,'nativeRainResolutionDegrees':.25,'rainSmoothing':False,'sourceMutation':False},'files':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(OUT.iterdir()) if p.name!='manifest.json'}}
 write('manifest.json',manifest);print(json.dumps({'rain':rain_checks,'elevation':elevation_checks,'basins':len(basin_checks),'bytes':sum(f['bytes'] for f in manifest['files'].values())}))
if __name__=='__main__':main()
