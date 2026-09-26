"""Build Asia population maps from pinned GHSL local inputs. No network access.

Usage: --raster-cache <europe-source-cache> --urban-cache <asia-population-source-cache>
Requires numpy, rasterio, pyproj, shapely and Pillow. Raw sources stay unchanged.
"""
from pathlib import Path
import argparse, csv, gzip, hashlib, io, json, math, sqlite3, tempfile, zipfile
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds, transform
from rasterio.windows import Window
from rasterio.transform import from_bounds
from shapely import from_wkb
from shapely.geometry import mapping, shape, box
from shapely.ops import transform as shape_transform
from pyproj import Transformer
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/asia-population-v1'
COUNTRIES = {
 'east-asia': dict(CHN='China', JPN='Japan', KOR='South Korea', MNG='Mongolia', PRK='North Korea', TWN='Taiwan'),
 'southeast-asia': dict(BRN='Brunei', IDN='Indonesia', KHM='Cambodia', LAO='Laos', MMR='Myanmar', MYS='Malaysia', PHL='Philippines', SGP='Singapore', THA='Thailand', TLS='Timor-Leste', VNM='Vietnam'),
 'south-central-asia': dict(AFG='Afghanistan', BGD='Bangladesh', BTN='Bhutan', IND='India', KAZ='Kazakhstan', KGZ='Kyrgyzstan', LKA='Sri Lanka', MDV='Maldives', NPL='Nepal', PAK='Pakistan', TJK='Tajikistan', TKM='Turkmenistan', UZB='Uzbekistan'),
}
FOCUS = {'Japan':['Tokyo'], 'China':['Shanghai'], 'South Korea':['Seoul'], 'Indonesia':['Jakarta'], 'Philippines':['Manila'], 'Thailand':['Bangkok'], 'India':['New Delhi'], 'Bangladesh':['Dhaka'], 'Uzbekistan':['Tashkent'], 'Singapore':['Singapore'], 'Maldives':['Malé']}
NAMES = {'Tokyo':'東京','Shanghai':'上海','Seoul':'ソウル','Jakarta':'ジャカルタ','Manila':'マニラ','Bangkok':'バンコク','New Delhi':'ニューデリー','Dhaka':'ダッカ','Tashkent':'タシケント','Singapore':'シンガポール','Malé':'マレ','Beijing':'北京','Osaka':'大阪','Guangzhou':'広州','Shenzhen':'深圳','Chongqing':'重慶','Chengdu':'成都','Tianjin':'天津','Wuhan':'武漢','Taipei':'台北','Ulaanbaatar':'ウランバートル','Pyongyang':'平壌','Ho Chi Minh City':'ホーチミン','Hanoi':'ハノイ','Kuala Lumpur':'クアラルンプール','Yangon':'ヤンゴン','Phnom Penh':'プノンペン','Vientiane':'ビエンチャン','Dili':'ディリ','Bandar Seri Begawan':'バンダルスリブガワン','Mumbai':'ムンバイ','Kolkata':'コルカタ','Karachi':'カラチ','Lahore':'ラホール','Bangalore':'ベンガルール','Chennai':'チェンナイ','Hyderabad':'ハイデラバード','Kabul':'カブール','Kathmandu':'カトマンズ','Colombo':'コロンボ','Almaty':'アルマトイ','Bishkek':'ビシュケク','Dushanbe':'ドゥシャンベ','Ashgabat':'アシガバート','Phuntsholing':'プンツォリン'}
BREAKS = [1, 10, 100, 500, 2000, 10000]
COLORS = ['f0f1e8','dce8df','b0d2cc','7ab5bb','438b9f','28627f','173b60']
PALETTE = np.array([list(bytes.fromhex(c))+[255] for c in COLORS], dtype='uint8')

def write(path, obj):
 path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n', encoding='utf8', newline='\n')

def sha(path):
 h = hashlib.sha256()
 with path.open('rb') as f:
  while chunk := f.read(1048576): h.update(chunk)
 return h.hexdigest()

def gpkg_shape(raw):
 envelope = (raw[3] >> 1) & 7
 return from_wkb(raw[8 + {0:0, 1:32, 2:48, 3:48, 4:64}[envelope]:])

def raster_assets(src, bounds, name, aggregate):
 bm = transform_bounds('EPSG:4326', 'EPSG:3857', *bounds)
 # Regions are overview maps. City frames retain 1 km source cells; projected
 # output spacing does not increase the source's resolution.
 spacing = 5500 if aggregate == 5 else 700
 w = math.ceil((bm[2]-bm[0])/spacing); h = math.ceil((bm[3]-bm[1])/spacing)
 assert 0 < w <= 4096 and 0 < h <= 4096
 window = src.window(*transform_bounds('EPSG:4326', src.crs, *bounds, densify_pts=61))
 x = math.floor(window.col_off/aggregate)*aggregate; y = math.floor(window.row_off/aggregate)*aggregate
 width = math.ceil((window.col_off+window.width-x)/aggregate)*aggregate
 height = math.ceil((window.row_off+window.height-y)/aggregate)*aggregate
 window = Window(x,y,width,height)
 data = src.read(1, window=window, boundless=True, fill_value=-200)
 valid = np.isfinite(data) & (data >= 0)
 if aggregate > 1:
  sums = np.where(valid,data,0).reshape(height//aggregate,aggregate,width//aggregate,aggregate).sum(axis=(1,3),dtype='float64')
  counts = valid.reshape(height//aggregate,aggregate,width//aggregate,aggregate).sum(axis=(1,3))
  density = np.divide(sums,counts,out=np.full(sums.shape,-1.),where=counts>0).astype('float32')
  assert np.isclose(sums.sum(),data[valid].sum(dtype='float64'))
 else: density = np.where(valid,data,-1).astype('float32')
 dst = np.full((h,w),-1,dtype='<f4')
 reproject(density,dst,src_transform=src.window_transform(window)*rasterio.Affine.scale(aggregate,aggregate),src_crs=src.crs,src_nodata=-1,dst_transform=from_bounds(*bm,w,h),dst_crs='EPSG:3857',dst_nodata=-1,resampling=Resampling.nearest)
 rgba = PALETTE[np.searchsorted(BREAKS,dst,side='right')]
 # Source zeros include ocean. Keep these visually transparent and report zero
 # explicitly on selection, without calling an ocean cell uninhabited land.
 rgba[dst <= 0] = 0
 Image.fromarray(rgba).save(OUT/(name+'.png'),optimize=True)
 (OUT/(name+'.density.gz')).write_bytes(gzip.compress(dst.tobytes(),mtime=0))
 assert np.array_equal(np.frombuffer(gzip.decompress((OUT/(name+'.density.gz')).read_bytes()),dtype='<f4').reshape(h,w),dst)
 assert np.array_equal(np.asarray(Image.open(OUT/(name+'.png'))),rgba)
 return dict(bounds4326=list(bounds),bounds3857=list(bm),width=w,height=h,image=name+'.png',grid=name+'.density.gz',imageCoordinates=[[bounds[0],bounds[3]],[bounds[2],bounds[3]],[bounds[2],bounds[1]],[bounds[0],bounds[1]]],sourceCellKm=aggregate,displaySpacingMetres3857=[(bm[2]-bm[0])/w,(bm[3]-bm[1])/h],positivePixels=int((dst>0).sum()),zeroPixels=int((dst==0).sum()),missingPixels=int((dst<0).sum()))

def main():
 ap = argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--raster-cache',type=Path,required=True);ap.add_argument('--urban-cache',type=Path,required=True)
 ap.add_argument('--geography',type=Path,required=True,help='Natural Earth v5.1.2 ne_10m_admin_0_countries.geojson')
 args = ap.parse_args(); OUT.mkdir(parents=True,exist_ok=True)
 general = args.urban_cache/'GHS_UCDB_THEME_GENERAL_CHARACTERISTICS_GLOBE_R2024A_V1_2.zip'
 thematic = args.urban_cache/'GHS_UCDB_THEME_GHSL_GLOBE_R2024A_V1_2.zip'
 raster = args.raster_cache/'GHS_POP_E2020_GLOBE_R2023A_54009_1000_V1_0.tif'
 climate = json.loads((ROOT/'public/assets/atlas/asia-climate-v2/manifest.json').read_text(encoding='utf8'))
 geography=json.loads(args.geography.read_text(encoding='utf8'))
 populations = {}
 with zipfile.ZipFile(thematic) as z:
  member = next(n for n in z.namelist() if n.endswith('.csv'))
  with z.open(member) as f:
   for r in csv.DictReader(io.TextIOWrapper(f,encoding='latin-1')):
    populations[int(r['ID_UC_G0'])] = {str(y):float(r['GH_POP_TOT_'+str(y)]) if r['GH_POP_TOT_'+str(y)] not in ['', 'NA', '-9999'] else None for y in [2000,2010,2020]}
 with tempfile.TemporaryDirectory() as td:
  with zipfile.ZipFile(general) as z:
   member = next(n for n in z.namelist() if n.endswith('.gpkg'))
   gpkg = Path(td)/'urban.gpkg';gpkg.write_bytes(z.read(member))
  db=sqlite3.connect(gpkg);db.row_factory=sqlite3.Row
  rows=db.execute('select g.*, c.GC_UCC_LON_2025 as lng, c.GC_UCC_LAT_2025 as lat from GHSL_UCDB_THEME_GENERAL_CHARACTERISTICS_GLOBE_R2024A g join UC_centroids c on g.ID_UC_G0=c.ID_UC_G0').fetchall()
  db.close()
  to_geo = Transformer.from_crs('ESRI:54009','EPSG:4326',always_xy=True).transform
  regions={};all_cities=[]
  with rasterio.open(raster) as src:
   assert src.crs.to_string()=='ESRI:54009' and src.res==(1000.,1000.) and src.nodata==-200
   for region,countries in COUNTRIES.items():
    extent=box(*climate['regions'][region]['bounds4326']).buffer(5)
    lands=[]
    for f in geography['features']:
     g=shape(f['geometry'])
     if not g.intersects(extent):continue
     clipped=g.intersection(extent).simplify(.002,preserve_topology=True)
     if clipped.is_empty:continue
     code=f['properties']['ADM0_A3']
     lands.append(dict(type='Feature',properties=dict(code=code,target=code in countries),geometry=mapping(clipped)))
    assert all(any(f['properties']['code']==code for f in lands) for code in countries)
    write(OUT/(region+'.geography.json'),dict(type='FeatureCollection',features=lands))
    candidates=[r for r in rows if r['GC_CNT_GAD_2025'] in countries.values() and populations[r['ID_UC_G0']]['2020'] is not None]
    candidates.sort(key=lambda r:populations[r['ID_UC_G0']]['2020'],reverse=True)
    chosen={r['ID_UC_G0']:r for r in candidates[:12]}
    for country in countries.values():
     matches=[r for r in candidates if r['GC_CNT_GAD_2025']==country]
     assert matches,country
     chosen[matches[0]['ID_UC_G0']]=matches[0]
     for r in matches:
      if r['GC_UCN_MAI_2025'] in FOCUS.get(country,[]):chosen[r['ID_UC_G0']]=r
    cities=[];features=[]
    for r in sorted(chosen.values(),key=lambda r:populations[r['ID_UC_G0']]['2020'],reverse=True):
     urban_id=r['ID_UC_G0'];uid='uc-'+str(urban_id);country=next(k for k,v in countries.items() if v==r['GC_CNT_GAD_2025'])
     geom=gpkg_shape(r['geom']);geo=shape_transform(to_geo,geom)
     history=populations[urban_id];area=float(r['GC_UCA_KM2_2025'])
     # Despite LON/LAT column names, the GeoPackage's centroid attributes are
     # Mollweide metres. Transform them using the declared layer CRS.
     coordinates=list(to_geo(r['lng'],r['lat']))
     assert -180<=coordinates[0]<=180 and -90<=coordinates[1]<=90
     city=dict(id=uid,sourceId=urban_id,name=NAMES.get(r['GC_UCN_MAI_2025'],r['GC_UCN_MAI_2025']),sourceName=r['GC_UCN_MAI_2025'],country=country,region=region,coordinates=coordinates,bounds=list(geo.bounds),areaKm2=area,population=history['2020'],history=history,density=history['2020']/area if area else None)
     features.append(dict(type='Feature',id=uid,properties=dict(id=uid,name=city['name'],country=country),geometry=mapping(geo.simplify(.001,preserve_topology=True))))
     if r['GC_UCN_MAI_2025'] in FOCUS.get(r['GC_CNT_GAD_2025'],[]):
      b=geom.bounds;view=transform_bounds(src.crs,'EPSG:4326',b[0]-15000,b[1]-15000,b[2]+15000,b[3]+15000,densify_pts=41)
      city['detail']=raster_assets(src,view,uid,1)
      # Source-cell evidence for comparing concentration, never a city total.
      row,col=src.index(r['lng'],r['lat'])
      cell=float(src.read(1,window=Window(col,row,1,1))[0,0]);city['centroidCellDensity']=cell if cell>=0 else None
     cities.append(city)
    write(OUT/(region+'.urban.json'),dict(type='FeatureCollection',features=features))
    rec=raster_assets(src,climate['regions'][region]['bounds4326'],region,5)
    rec.update(urban=region+'.urban.json',geography=region+'.geography.json',cities=cities,countryCoverage={code:dict(sourceUrbanCentres=sum(r['GC_CNT_GAD_2025']==name for r in candidates),listedUrbanCentres=sum(c['country']==code for c in cities)) for code,name in countries.items()})
    regions[region]=rec;all_cities.extend(cities)
    print(region,len(cities),'urban centres',sum('detail' in c for c in cities),'detailed maps',flush=True)
 assert len({c['country'] for c in all_cities})==30
 base='https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/'
 inputs=[dict(file=raster.name,sha256=sha(raster),url=base+'GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_54009_1000/V1-0/'+raster.name.replace('.tif','.zip'))]
 inputs.append(dict(file=args.geography.name,sha256=sha(args.geography),url='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',license='Natural Earth public domain',method='Clip to regional extent plus 5 degrees; simplify 0.002 degrees preserving topology. Display and country selection only; never used to mask population.'))
 for path,theme in [(general,'GENERAL_CHARACTERISTICS'),(thematic,'GHSL')]:
  inputs.append(dict(file=path.name,sha256=sha(path),url=base+'GHS_UCDB_GLOBE_R2024A/GHS_UCDB_THEME_GLOBE_R2024A/GHS_UCDB_THEME_'+theme+'_GLOBE_R2024A/V1-2/'+path.name))
 write(OUT/'manifest.json',dict(schemaVersion=1,populationYear=2020,urbanBoundaryYear=2025,sourceEdition='GHS-POP R2023A; GHS-UCDB R2024A V1.2',license='CC BY 4.0',licenseUrl='https://human-settlement.emergency.copernicus.eu/GHSLhowToCite.php',populationCitation='Schiavina, M., Freire, S., Carioli, A., MacManus, K. (2023). GHS-POP R2023A.',populationDoi='https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE',urbanSource='https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php',methodCitation='Pesaresi et al. (2024). Advances on the Global Human Settlement Layer by joint assessment of Earth Observation and population survey data. International Journal of Digital Earth 17(1).',inputs=inputs,lookup=dict(encoding='float32-le-gzip',noData=-1),breaks=BREAKS,colors=COLORS,method='Native 1 km equal-area GHS-POP people/cell. Regional aligned 5x5 blocks: sum people divided by count of valid 1 km² source cells. Zero-valued source cells, including sea, are included. City maps retain native 1 km cells. Both use nearest-neighbour reprojection to Web Mercator; lookup and colours from identical arrays. No generalized country polygon masks and no nearest-land imputation. Context country outlines only cover the display. UCDB population is the publisher GH_POP_TOT_2020 attribute joined by ID_UC_G0, within fixed 2025 urban-centre boundaries; never inferred from display raster.',selection='12 most populous source urban centres per region in 2020, plus the most populous centre in each country and named detailed-map centres. This is a selected list, not all cities or all capitals.',limitations=['Urban centres are source-defined contiguous population concentrations, not municipal or commuting-area boundaries. Cross-border centres are source country splits.','Population years 2000,2010,2020 use a fixed 2025 footprint; changes are not changes in urban extent.','Grid density is per source cell area, including water in coastal cells, not per square kilometre of land. Zero includes ocean; missing is -1.','Unmasked regional source grids may contain surrounding-country values. These countries are covered in grey and are not selectable countries. No country totals are computed from them.','1 km source cells cannot identify individual buildings, households, roads or neighbourhood administrative boundaries.'],regions=regions,files={p.name:dict(bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(OUT.iterdir()) if p.name!='manifest.json'}))

if __name__=='__main__':main()
