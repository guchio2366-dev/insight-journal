"""Build Asia precipitation, connected catchments and groundwater from pinned originals.
Offline inputs: CHELSA BIO12 COG (2025 distribution), BasinATLAS v1 level06,
WHYMAP layer11 query snapshot, Natural Earth v5.1.2 rivers. See manifest provenance.
"""
from pathlib import Path
import argparse,json,gzip,hashlib,math
from collections import defaultdict
import numpy as np
import rasterio,shapefile
from rasterio.warp import reproject,Resampling,transform_geom
from rasterio.transform import from_bounds
from rasterio.features import geometry_mask
from shapely import make_valid
from shapely.geometry import shape,mapping,box,Point
from shapely.ops import unary_union
from shapely.strtree import STRtree
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/asia-water-v1'
NODATA=-32768
BREAKS=[100,250,500,750,1000,1500,2000,3000]
COLORS=['eee4ce','e4e5c4','cfdfbd','a7d7bd','79c9c5','4dafc2','278eaf','146890','123e65']
RIVER_NAMES={'Chang Jiang':'長江','Yangtze':'長江','Huang He':'黄河','Yellow':'黄河','Mekong':'メコン川','Ganges':'ガンジス川','Brahmaputra':'ブラマプトラ川','Indus':'インダス川','Irrawaddy':'エーヤワディー川','Ayeyarwady':'エーヤワディー川','Salween':'サルウィン川','Amu Darya':'アムダリヤ川','Syr Darya':'シルダリヤ川','Amur':'アムール川','Hong':'紅河','Chao Phraya':'チャオプラヤー川','Tarim':'タリム川','Yenisei':'エニセイ川','Ob':'オビ川','Irtysh':'イルティシ川','Pearl':'珠江','Xi Jiang':'西江'}

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(name,data):
 raw=(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode()
 if name=='manifest.json':(OUT/name).write_bytes(raw)
 else:(OUT/(name+'.gz')).write_bytes(gzip.compress(raw,mtime=0))
 return name+'.gz'
def polygon(g):
 g=make_valid(g)
 if g.geom_type in ('Polygon','MultiPolygon'):return g
 return unary_union([part for part in getattr(g,'geoms',[]) if part.geom_type in ('Polygon','MultiPolygon')])
def feature(id,g,**properties):return {'type':'Feature','id':id,'properties':{'id':id,**properties},'geometry':mapping(g)}
def fc(features):return {'type':'FeatureCollection','features':features}
def point(g):p=g.representative_point();return [round(p.x,5),round(p.y,5)]

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--cache',type=Path,required=True);ap.add_argument('--rivers',type=Path,required=True);a=ap.parse_args();OUT.mkdir(parents=True,exist_ok=True)
 inputs={
 'CHELSA_bio12_1981-2010_V.2.1.tif':'918441cac0b633227d2a6dcc0ddcfb5efd40e015a426951a01cfbf9ba2f7a22c',
 'BasinATLAS_v10_lev06.shp':'dc61ea0eca354d6d7fa981ce738a1f9558f0c9dbee48d7a360de69c339c9d229',
 'BasinATLAS_v10_lev06.dbf':'4f2bb9a9c81e454382d5075701ce8010fd1b2dd93c6e1f84d80e8f52dd92c99c',
 'BasinATLAS_v10_lev06.shx':'b30843b3ad36272f7fa1ce2a1554db81a0d550ff16561482b8dba469ce7d176a',
 'whymap-asia-original.geojson':'31b94a175c0e360cc6e04fd596908abc0c29ec24d1f03696313f917b735122fe'}
 for name,sha in inputs.items():assert digest(a.cache/name)==sha,name
 ground=json.loads((a.cache/'whymap-asia-original.geojson').read_text(encoding='utf-8-sig'));assert len(ground['features'])==878
 inputs['whymap-asia-original.geojson']=digest(a.cache/'whymap-asia-original.geojson')
 population=json.loads((ROOT/'public/assets/atlas/asia-population-v1/manifest.json').read_text(encoding='utf8'))
 regions={};all_countries={}
 for rid,record in population['regions'].items():
  geo=json.loads((ROOT/'public/assets/atlas/asia-population-v1'/record['geography']).read_text(encoding='utf8'))
  countries={f['properties']['code']:polygon(shape(f['geometry'])) for f in geo['features'] if f['properties']['target']}
  all_countries.update(countries)
  regions[rid]={'record':record,'countries':countries,'land':unary_union(list(countries.values())),'frame':box(*record['bounds4326'])}
 land=unary_union(list(all_countries.values()));bounds=box(*land.bounds)
 reader=shapefile.Reader(str(a.cache/'BasinATLAS_v10_lev06.shp'))
 fields=['HYBAS_ID','NEXT_DOWN','NEXT_SINK','MAIN_BAS','SUB_AREA','UP_AREA','ENDO','COAST','dis_m3_pyr','dis_m3_pmn','dis_m3_pmx']
 records=[r.as_dict() for r in reader.iterRecords(fields=fields)]
 groups=defaultdict(list)
 for i,r in enumerate(records):groups[r['NEXT_SINK']].append(i)
 selected=set()
 for i,r in enumerate(records):
  s=reader.shape(i)
  if not box(*s.bbox).intersects(bounds):continue
  g=shape(s.__geo_interface__)
  if g.intersects(land):selected.add(r['NEXT_SINK'])
 print('Selected connected catchment groups',len(selected),flush=True)
 rivers=json.loads(a.rivers.read_text(encoding='utf8'))['features'];river_geom=[shape(f['geometry']) for f in rivers];river_tree=STRtree(river_geom)
 basins=[]
 by_id={r['HYBAS_ID']:r for r in records}
 for sink in sorted(selected):
  parts=[polygon(shape(reader.shape(i).__geo_interface__)) for i in groups[sink]]
  full=polygon(unary_union(parts));original=by_id[sink];coastal=bool(original['COAST'])
  codes=[code for code,g in all_countries.items() if full.intersection(g).area>1e-7]
  if not codes:continue
  names=defaultdict(float)
  for index in river_tree.query(full):
   p=rivers[int(index)]['properties'];name=p.get('name_en') or p.get('name')
   if not name:continue
   segment=full.intersection(river_geom[int(index)])
   if segment.length>0.05:names[RIVER_NAMES.get(name,p.get('name_ja') or name)]+=segment.length
  names=sorted(names,key=lambda n:-names[n])
  name=('沿岸の小流域群' if coastal else (names[0]+'を含む集水域') if names else ('内陸の集水域' if original['ENDO'] else '集水域'))
  basin={'id':'b-'+str(sink),'sourceId':sink,'name':name,'rivers':names[:4],'areaKm2':round(sum(records[i]['SUB_AREA'] for i in groups[sink]),1),'outletUpAreaKm2':original['UP_AREA'],'subBasins':len(parts),'endorheic':bool(original['ENDO']),'coastal':coastal,'countries':codes,'fullBounds':list(full.bounds),'flow':None if coastal else {'mean':original['dis_m3_pyr'],'lowestMonth':original['dis_m3_pmn'],'highestMonth':original['dis_m3_pmx']}}
  # Simplification affects display geometry only. Areas and flows use source fields.
  basins.append((basin,full.simplify(.008,preserve_topology=True)))
 print('Connected basin geometry complete',len(basins),flush=True)
 groundwater=[(f['properties'],polygon(shape(f['geometry']))) for f in ground['features']]
 with rasterio.open(a.cache/'CHELSA_bio12_1981-2010_V.2.1.tif') as src:
  assert src.scales==(1.0,) and src.offsets==(0.0,) and src.nodata==65535 and src.tags()['datetime']=='1981-2010'
  for rid,item in regions.items():
   previous=item['record'];west,south,east,north=previous['bounds3857'];w=math.ceil((east-west)/4000);h=math.ceil((north-south)/4000);transform=from_bounds(west,south,east,north,w,h)
   arr=np.full((h,w),NODATA,dtype='float32')
   reproject(rasterio.band(src,1),arr,src_transform=src.transform,src_crs=src.crs,src_nodata=src.nodata,dst_transform=transform,dst_crs='EPSG:3857',dst_nodata=NODATA,resampling=Resampling.average)
   mask=np.zeros((h,w),dtype=bool);coverage={}
   for code,g in item['countries'].items():
    cm=geometry_mask([transform_geom('EPSG:4326','EPSG:3857',mapping(g))],out_shape=(h,w),transform=transform,invert=True)
    valid=cm&(arr!=NODATA)&np.isfinite(arr);mask|=cm;coverage[code]={'displayCells':int(valid.sum()),'maskCells':int(cm.sum())}
   valid=mask&(arr!=NODATA)&np.isfinite(arr);assert np.all(arr[valid]>=0) and np.all(arr[valid]<32767)
   lookup=np.rint(arr).astype('<i2');lookup[~valid]=NODATA
   palette=np.array([list(bytes.fromhex(c))+[255] for c in COLORS],dtype='uint8');rgba=palette[np.searchsorted(BREAKS,lookup,side='right')];rgba[~valid]=0
   image=rid+'.precipitation.png';grid=rid+'.precipitation.gz';Image.fromarray(rgba).save(OUT/image,optimize=True);(OUT/grid).write_bytes(gzip.compress(lookup.tobytes(),mtime=0))
   assert np.array_equal(np.frombuffer(gzip.decompress((OUT/grid).read_bytes()),dtype='<i2').reshape(h,w),lookup)
   basin_records=[];basin_fill=[];basin_outlines=[]
   for record,full in basins:
    codes=[code for code in record['countries'] if code in item['countries']]
    if not codes:continue
    clipped=polygon(full.intersection(item['land']));outline=polygon(full.intersection(item['frame']))
    if clipped.is_empty:continue
    rec={**record,'countries':codes,'countryPoints':{c:point(polygon(full.intersection(item['countries'][c]))) for c in codes},'otherTargetCountries':[c for c in record['countries'] if c not in codes],'point':point(clipped),'bounds':list(outline.bounds),'outsideFrame':not item['frame'].covers(full)}
    if not record['rivers']:rec['name']+=f"（{rec['point'][1]:.1f}°, {rec['point'][0]:.1f}°）"
    basin_records.append(rec);basin_fill.append(feature(rec['id'],clipped));basin_outlines.append(feature(rec['id'],outline))
   ground_records=[];ground_geometry=[]
   for props,full in groundwater:
    if not full.intersects(item['land']):continue
    clipped=polygon(full.intersection(item['land']))
    if clipped.is_empty or clipped.area<1e-9:continue
    clipped=clipped.simplify(.006,preserve_topology=True);id='g-'+str(props['OBJECTID']);codes=[c for c,g in item['countries'].items() if full.intersection(g).area>1e-7]
    ground_records.append({'id':id,'sourceId':props['OBJECTID'],'class':props['HYGEO2'],'aquifer':props['aquif_type'],'recharge':props['recharge'],'countries':codes,'countryPoints':{c:point(polygon(full.intersection(item['countries'][c]))) for c in codes},'point':point(clipped),'bounds':list(clipped.bounds)})
    ground_geometry.append(feature(id,clipped,category=props['HYGEO2']))
   basin_file=write(rid+'.basins.json',{'records':basin_records,'geometry':fc(basin_fill),'outlines':fc(basin_outlines)})
   groundwater_file=write(rid+'.groundwater.json',{'records':ground_records,'geometry':fc(ground_geometry)})
   for old in [OUT/(rid+'.json'),OUT/(rid+'.json.gz')]:
    if old.exists():old.unlink()
   for code in coverage:coverage[code].update(basins=sum(code in b['countries'] for b in basin_records),groundwater=sum(code in g['countries'] for g in ground_records))
   regions[rid]={'basins':basin_file,'groundwater':groundwater_file,'precipitation':{'image':image,'grid':grid,'width':w,'height':h,'bounds3857':previous['bounds3857'],'bounds4326':previous['bounds4326'],'imageCoordinates':previous['imageCoordinates'],'nominalPixelMetres3857':4000},'coverage':coverage,'basinCount':len(basin_records),'groundwaterCount':len(ground_records)}
   print(rid,w,h,len(basin_records),len(ground_records),flush=True)
 write('manifest.json',{'version':1,'retrievedAt':'2026-09-27','regions':regions,'precipitation':{'source':'CHELSA BIO12 v2.1','period':'1981–2010','unit':'mm/year water equivalent','sourceResolutionDegrees':1/120,'sourceScale':1,'license':'CC0 1.0','url':'https://www.chelsa-climate.org/datasets/chelsa_bioclim','download':'https://os.unil.cloud.switch.ch/chelsa02/chelsa/global/bioclim/bio12/1981-2010/CHELSA_bio12_1981-2010_V.2.1.tif','breaks':BREAKS,'colors':COLORS,'noData':NODATA,'encoding':'int16-le-gzip','method':'Average reprojection to approximately 4km Web Mercator spacing; source scale1; round to whole mm; Natural Earth10m country mask at display cell centres. Image and query use identical rounded values; pixel spacing is not ground distance or source precision.'},'basins':{'source':'BasinATLAS v1.0 level06','url':'https://www.hydrosheds.org/hydroatlas','doi':'https://doi.org/10.6084/m9.figshare.9890531','license':'CC BY 4.0','method':'Union all global level06 members sharing NEXT_SINK, not MAIN_BAS, so virtual endorheic connections are not traversed. Sum source SUB_AREA for group area; keep outlet UP_AREA for comparison. COAST groups remain marked, discharge withheld for coastal aggregates. Named river intersections come from Natural Earth, not the BasinATLAS source. Fill clips to region target countries, outlines clip to display bounds; numeric area and outlet flow retain complete connected catchment. Display simplification0.008degree.'},'groundwater':{'source':'WHYMAP Groundwater Resources of the World','edition':'2008 map product; service snapshot2026-09-27, not present-day observations','url':'https://services.bgr.de/arcgis/rest/services/grundwasser/whymap_gwr/MapServer/11','license':'Reuse with attribution to BGR & UNESCO','attribution':'Datenquelle: WHYMAP, (C) BGR Hannover & UNESCO Paris','scale':'1:25,000,000','method':'Query878 original polygons intersecting45,-13,156,58; clip to regional country masks; simplify0.006degree. Preserve original aquifer type and recharge range; do not infer water storage, safe yield, quality or present depletion.'},'inputs':inputs,'rivers':{'sha256':digest(a.rivers),'source':'Natural Earth1:50million v5.1.2','license':'Public domain'},'files':{p.name:{'bytes':p.stat().st_size,'sha256':digest(p)} for p in sorted(OUT.iterdir()) if p.name!='manifest.json'}})

if __name__=='__main__':main()
