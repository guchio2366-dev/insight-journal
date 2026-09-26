"""Prepare Asia crop/livestock maps and national FAOSTAT series offline.

The rice map remains the existing separately licensed asset. National statistics
are read from publisher rows, never calculated by summing map pixels.
"""
from pathlib import Path
import argparse,csv,io,json,zipfile,gzip,hashlib,math,shutil
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject,Resampling,transform_geom
from rasterio.features import geometry_mask
from numcodecs import Blosc
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/asia-farming-v1'
CROPS={'wheat':('WHEA','小麦',15),'maize':('MAIZ','トウモロコシ',56),'soybean':('SOYB','大豆',236),'cotton':('COTT','綿花',328),'tea':('TEAS','茶',667),'cassava':('CASS','キャッサバ',125),'oilpalm':('OILP','油ヤシ',254),'rubber':('RUBB','天然ゴム',836),'arabica':('COFF','コーヒー（アラビカ）',656),'robusta':('RCOF','コーヒー（ロブスタ）',656),'chickpea':('CHIC','ひよこ豆',191),'lentil':('LENT','レンズ豆',201),'pearlmillet':('PMIL','トウジンビエ',79),'sugarcane':('SUGC','サトウキビ',156)}
SPECIES={'cattle':('牛',866),'buffalo':('水牛',946),'sheep':('羊',976),'goat':('山羊',1016),'pig':('豚',1034),'chicken':('鶏',1057)}
REGION_TOPICS={
 'east-asia':['wheat','maize','soybean','cotton','tea','cattle','sheep','goat','pig','chicken','forest'],
 'southeast-asia':['maize','cassava','oilpalm','rubber','arabica','robusta','sugarcane','cattle','buffalo','pig','chicken','forest'],
 'south-central-asia':['wheat','maize','cotton','chickpea','lentil','pearlmillet','tea','sugarcane','cattle','buffalo','sheep','goat','chicken','forest'],
}
M49={'AFG':4,'BGD':50,'BTN':64,'BRN':96,'KHM':116,'CHN':156,'IND':356,'IDN':360,'JPN':392,'KAZ':398,'PRK':408,'KOR':410,'KGZ':417,'LAO':418,'MYS':458,'MDV':462,'MNG':496,'MMR':104,'NPL':524,'PAK':586,'PHL':608,'SGP':702,'LKA':144,'TWN':158,'TJK':762,'THA':764,'TLS':626,'TKM':795,'UZB':860,'VNM':704}

def write(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8',newline='\n')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def csv_rows(z,name):return csv.DictReader(io.TextIOWrapper(z.open(name),encoding='utf-8-sig'))

def statistics(cache):
 selected={27,*[v[2] for v in CROPS.values()],*[v[1] for v in SPECIES.values()],882,951,1058,867,1035,1062}
 sources=[('Production_Crops_Livestock',selected,{'5312','5510','5111','5112'}),('Forestry',{1861,1864,1865,1872},{'5510','5516','5910','5916','5610','5616'}),('Inputs_LandUse',{6646,6717,6716,6714},{'5110'})]
 countries={k:dict(m49=v,sourceNames={},observations=[]) for k,v in M49.items()};reverse={v:k for k,v in M49.items()};inputs=[];catalog={};flags={}
 for domain,items,elements in sources:
  path=cache/(domain+'_E_All_Data_(Normalized).zip');inputs.append(dict(file=path.name,sha256=sha(path),url='https://bulks-faostat.fao.org/production/'+path.name))
  with zipfile.ZipFile(path) as z:
   for r in csv_rows(z,domain+'_E_ItemCodes.csv'):
    if r['Item Code'].isdigit() and int(r['Item Code']) in items:catalog[domain+':'+r['Item Code']]=r['Item']
   for r in csv_rows(z,domain+'_E_Flags.csv'):flags[r['Flag']]=next(v for k,v in r.items() if k.strip()=='Description')
   for r in csv_rows(z,domain+'_E_All_Data_(Normalized).csv'):
    year=int(r['Year'])
    if year<2015 or year>2024 or not r['Item Code'].isdigit() or int(r['Item Code']) not in items or r['Element Code'] not in elements:continue
    m49=int(r['Area Code (M49)'].lstrip("'"));code=reverse.get(m49)
    if not code:continue
    countries[code]['sourceNames'][domain]=dict(name=r['Area'],areaCode=r['Area Code'])
    value=float(r['Value']) if r['Value'].strip() else None
    if r['Flag']=='M':value=None
    countries[code]['observations'].append(dict(domain=domain,item=r['Item Code'],element=r['Element'],elementCode=r['Element Code'],year=year,unit=r['Unit'],value=value,flag=r['Flag'],note=r.get('Note') or None))
  print(domain,'statistics read',flush=True)
 for c in countries.values():c['observations'].sort(key=lambda r:(r['domain'],r['item'],r['elementCode'],r['year']))
 write(OUT/'statistics.json',dict(schemaVersion=1,years=list(range(2015,2025)),countries=countries,items=catalog,flags=flags,inputs=inputs,license='FAOSTAT statistical databases, CC BY 4.0 unless an identified third-party exception applies',licenseUrl='https://www.fao.org/contact-us/terms/db-terms-of-use/',method='Filter publisher rows by explicit M49 code, item and element codes. CHN is mainland (M49 156), not China aggregate (159); TWN is source M49 158. Missing observations are not filled. Values and flags remain as published; unit conversion is not performed. MapSPAM and GLW spatial models are separate from these statistical rows.'))
 (OUT/'statistics.json.gz').write_bytes(gzip.compress((OUT/'statistics.json').read_bytes(),mtime=0))
 return inputs

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--crop-cache',type=Path,required=True);ap.add_argument('--fao-cache',type=Path,required=True);ap.add_argument('--extra-cache',type=Path,required=True);args=ap.parse_args();OUT.mkdir(parents=True,exist_ok=True)
 pop=json.loads((ROOT/'public/assets/atlas/asia-population-v1/manifest.json').read_text(encoding='utf8'))
 archive=args.crop_cache/'spam2020V2r2_global_harvested_area.geotiff.zip'
 assert hashlib.md5(archive.read_bytes()).hexdigest()=='dd9ac5def086fcae26d28423b2b31f8b'
 metadata=json.loads((args.extra_cache/'glw-zarr.json').read_text(encoding='utf8'))['consolidated_metadata']['metadata']
 glw_inputs=json.loads((args.extra_cache/'downloads.json').read_text(encoding='utf8'));forest_inputs=json.loads((args.extra_cache/'forest-downloads.json').read_text(encoding='utf8'))
 inputs=[dict(file=archive.name,sha256=sha(archive),url='https://dataverse.harvard.edu/api/access/datafile/13827040')]+glw_inputs+forest_inputs
 crop_arrays={};species_arrays={};regions={}
 with zipfile.ZipFile(archive) as z:
  for topic,(crop,label,item) in CROPS.items():
   member=f'spam2020V2r2_global_harvested_area/spam2020_V2r2_global_H_{crop}_A.tif';raw=z.read(member)
   with rasterio.MemoryFile(raw) as mem:
    with mem.open() as src:
     assert (src.width,src.height)==(4320,2160) and src.crs.to_epsg()==4326 and np.isclose(src.res[0],1/12)
     a=src.read(1);a[~np.isfinite(a)|(a<0)]=-1;crop_arrays[topic]=a
   inputs.append(dict(member=member,sha256=hashlib.sha256(raw).hexdigest()))
 for topic in SPECIES:
  m=metadata[topic];assert m['shape']==[2160,4320] and m['attributes']['units']=='head/km2' and m['chunk_grid']['configuration']['chunk_shape']==[1080,1080]
  assert np.allclose(m['attributes']['spatial:transform'],[1/12,0,-180,0,-1/12,90])
  # Asia occupies the two eastern global chunk columns; no other chunks needed.
  a=np.full((2160,4320),-1,dtype='float32')
  for row in [0,1]:
   for col in [2,3]:
    raw=(args.extra_cache/f'glw-{topic}_c_{row}_{col}').read_bytes();chunk=np.frombuffer(Blosc().decode(raw),dtype='<f4').reshape(1080,1080)
    a[row*1080:(row+1)*1080,col*1080:(col+1)*1080]=chunk
  a[~np.isfinite(a)|(a<0)]=-1;species_arrays[topic]=a
 for region,topics in REGION_TOPICS.items():
  rec=pop['regions'][region];b=rec['bounds4326'];bm=rec['bounds3857'];width=1500;height=math.ceil(width*(bm[3]-bm[1])/(bm[2]-bm[0]));tr=from_bounds(*bm,width,height)
  geography=json.loads((ROOT/'public/assets/atlas/asia-population-v1'/rec['geography']).read_text(encoding='utf8'))
  masks={f['properties']['code']:geometry_mask([transform_geom('EPSG:4326','EPSG:3857',f['geometry'])],out_shape=(height,width),transform=tr,invert=True) for f in geography['features'] if f['properties']['target']}
  layers=[]
  for topic in topics:
   if topic=='forest':
    source=next(f for f in forest_inputs if f['region']==region);name=region+'.forest.png';shutil.copyfile(args.extra_cache/source['file'],OUT/name)
    layers.append(dict(id=topic,title='森林の分布と木材',kind='forest',image=name,bounds3857=bm,width=source['width'],height=source['height'],imageCoordinates=rec['imageCoordinates'],sourceUrl='https://forobs.jrc.ec.europa.eu/GFC/v3',sourceEdition='JRC GFC2020 version 3',year=2020,query=None,method='Unmodified publisher-rendered WMS reference image. Not used for point classification, area estimates or numeric analysis. National forest/wood statistics come from separate FAOSTAT rows.'));continue
   crop=topic in CROPS;source=crop_arrays[topic] if crop else species_arrays[topic];dest=np.full((height,width),-1,dtype='<f4')
   reproject(source,dest,src_transform=from_bounds(-180,-90,180,90,4320,2160),src_crs='EPSG:4326',src_nodata=-1,dst_transform=tr,dst_crs='EPSG:3857',dst_nodata=-1,resampling=Resampling.nearest)
   breaks=[1,10,100,1000,5000] if crop else [1,10,50,200,1000]
   colors=['edf1e3','d7e7b4','afd08b','7fa95c','4f7e3d','23582d'] if crop else ['fff6e4','fee5be','f9c889','ee9960','cb653f','873c31']
   rgba=np.array([list(bytes.fromhex(c))+[255] for c in colors],dtype='uint8')[np.searchsorted(breaks,dest,side='right')];rgba[dest<=0]=0
   name=region+'.'+topic;Image.fromarray(rgba).save(OUT/(name+'.png'),optimize=True);(OUT/(name+'.values.gz')).write_bytes(gzip.compress(dest.tobytes(),mtime=0))
   assert np.array_equal(np.frombuffer(gzip.decompress((OUT/(name+'.values.gz')).read_bytes()),dtype='<f4').reshape(height,width),dest)
   coverage={}
   for code,mask in masks.items():
    valid=mask&(dest>=0);positive=mask&(dest>0)
    coverage[code]=dict(maskPixels=int(mask.sum()),validPixels=int(valid.sum()),positivePixels=int(positive.sum()))
   layers.append(dict(id=topic,title=CROPS[topic][1] if crop else SPECIES[topic][0],kind='crop' if crop else 'livestock',sourceCode=CROPS[topic][0] if crop else topic,faoItem=CROPS[topic][2] if crop else SPECIES[topic][1],unit='ha/格子' if crop else '羽/km²' if topic=='chicken' else '頭/km²',year=2020,image=name+'.png',grid=name+'.values.gz',width=width,height=height,bounds3857=bm,imageCoordinates=rec['imageCoordinates'],sourceResolutionDegrees=1/12,breaks=breaks,colors=colors,countryCoverage=coverage))
  regions[region]=dict(layers=layers,bounds4326=b,bounds3857=bm)
  print(region,len(layers),'layers',flush=True)
 inputs+=statistics(args.fao_cache)
 write(OUT/'manifest.json',dict(schemaVersion=1,year=2020,inputs=inputs,lookup=dict(encoding='float32-le-gzip',noData=-1),sources=dict(crops='IFPRI MapSPAM 2020 v2r2, Harvard Dataverse version 6.0, file 13827040',livestock='FAO GLW4 2020; CGIAR Climate Data Hub cloud conversion 2026-06-23',forest='JRC GFC2020 v3 WMS; rendered reference images only'),licenses=dict(crops='IFPRI Dataverse CC BY 4.0, Terms of Use section 4. Original archive MD5 matched fixed file 13827040. Existing rice assets retain their separate CC BY-SA 4.0 attribution.',livestock='CC BY 4.0',forest='Copernicus/JRC free reuse with acknowledgement'),method='Nearest-neighbour reprojection of source 5 arc-minute values to Web Mercator. Identical array generates colour and numeric lookup. True zero and missing remain distinct; zero is transparent. No country mask is applied to values. The per-country coverage diagnostics use Natural Earth 1:10m pixel-centre masks only and are not official national totals. Grid area is not equal-area in geographic or Mercator coordinates. Never sum livestock densities as head counts or harvested hectares as physical cropland area.',regions=regions,files={p.name:dict(bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(OUT.iterdir()) if p.name!='manifest.json'}))

if __name__=='__main__':main()
