#!/usr/bin/env python3
"""Contour the held continuous CanGridP annual cell table, never its old classes.

The audited export retains native x-major indices, geographic cell centres and
0.1 mm annual values. This script does not fetch or reinterpret the monthly file.
The unavailable full-precision NPZ and current NetCDF recheck are disclosed.
"""
import csv,gzip,hashlib,json,math
from pathlib import Path
import numpy as np
import contourpy

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/assets/atlas/canada-water-v1/annual-valid-grid-points.csv.gz'
OUT=ROOT/'public/assets/atlas/canada-precipitation-contours-v1'
OUT.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(SOURCE)=='05230c91440028ce9c3491c9b97aea3f3e369269c8107e3c9bb57d266c69b5b0'
shape=(621,470)
annual=np.full(shape,np.nan);longitude=np.full(shape,np.nan);latitude=np.full(shape,np.nan)
indices=[]
with gzip.open(SOURCE,'rt')as f:
 for r in csv.DictReader(f):
  index=int(r['grid_index_xmajor']);i,j=divmod(index,shape[1]);assert 0<=i<shape[0]and 0<=j<shape[1]and not np.isfinite(annual[i,j])
  annual[i,j]=float(r['annual_precipitation_mm']);longitude[i,j]=float(r['longitude']);latitude[i,j]=float(r['latitude']);indices.append(index)
valid=np.isfinite(annual)
assert len(indices)==len(set(indices))==int(valid.sum())==100945
assert np.all(annual[valid]>=0)and np.isclose(annual[valid].min(),136.9)and np.isclose(annual[valid].max(),3986.4)
masked=np.ma.masked_invalid(annual)
generator=contourpy.contour_generator(z=masked,corner_mask=False,line_type='Separate',fill_type='OuterOffset')

def geographic(points):
 result=[]
 for y,x in points:
  i,j=math.floor(x),math.floor(y);dx,dy=x-i,y-j
  weighted=[(i,j,(1-dx)*(1-dy)),(i+1,j,dx*(1-dy)),(i,j+1,(1-dx)*dy),(i+1,j+1,dx*dy)]
  lon=lat=0
  for a,b,w in weighted:
   if w<1e-10:continue
   assert 0<=a<shape[0]and 0<=b<shape[1]and valid[a,b],('Interpolation crossed missing or nonland',a,b,w)
   lon+=longitude[a,b]*w;lat+=latitude[a,b]*w
  assert -180<=lon<=180 and -90<=lat<=90
  result.append([round(lon,5),round(lat,5)])
 return result

breaks=list(range(0,4250,250))
stops=['#eff7fb','#d7eaf5','#b9d9ed','#98c7e1','#77b4d7','#559ecb','#3888bd','#2173ac','#126197','#0b5082','#08406e','#07365e','#062d50','#052545','#041e3b','#031930']
groups=[];bands=[];lines=[];labels=[]
for k,(lower,upper)in enumerate(zip(breaks,breaks[1:])):
 gid='p'+str(k);name=f'{lower:,}–{upper:,} mm/年'
 groups.append({'id':gid,'name':name,'color':stops[k],'lowerBoundMm':lower,'upperBoundExclusiveMm':upper,'sourceName':f'{lower}–<{upper} mm/year','sourceCellCount':int(((annual>=lower)&(annual<upper)&valid).sum()),'description':'1991–2020年の平均年降水量。250 mm間隔。雨・雪の水当量。'})
 points,offsets=generator.filled(lower,upper)
 polygons=[]
 for part,offset in zip(points,offsets):
  rings=[geographic(part[a:b])for a,b in zip(offset,offset[1:])]
  assert all(len(r)>=4 and r[0]==r[-1]for r in rings)
  polygons.append(rings)
 if polygons:bands.append({'type':'Feature','properties':{'id':gid,'group':gid,'lowerMm':lower,'upperMm':upper},'geometry':{'type':'MultiPolygon','coordinates':polygons}})
 if lower:
  for n,part in enumerate(generator.lines(lower)):
   coords=geographic(part)
   if len(coords)<2:continue
   lines.append({'type':'Feature','properties':{'mm':lower,'id':f'{lower}-{n}'},'geometry':{'type':'LineString','coordinates':coords}})
   # A label must be an existing contour vertex. Global screen collision checks
   # reduce these candidates at render time; no point is inferred from a city.
   if len(coords)>=20:
    for index in [len(coords)//4,len(coords)//2,3*len(coords)//4]:labels.append({'mm':lower,'coordinates':coords[index]})

for name,data in [('bands.geojson',{'type':'FeatureCollection','features':bands}),('isohyets.geojson',{'type':'FeatureCollection','features':lines}),('labels.json',labels)]:
 (OUT/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
with gzip.GzipFile(filename='',fileobj=(OUT/'native-annual.float32.gz').open('wb'),mode='wb',mtime=0)as f:f.write(annual.astype('<f4').tobytes())
files={p.name:{'bytes':p.stat().st_size,'sha256':sha(p)}for p in OUT.iterdir()if p.is_file()and p.name!='manifest.json'}
manifest={'source':'ECCC CanGridP mlyV2, held 1991–2020 derived annual cell table','sourceUrl':'https://crd-data-donnees-rdc.ec.gc.ca/CDAS/products/CanGridP_V2/CanGridP_mlyV2_1948-2023.nc','sourceExportSha256':sha(SOURCE),'nativeShapeXMajor':list(shape),'validCells':int(valid.sum()),'maskedCells':int((~valid).sum()),'reportedOriginalMissingLandCells':0,'reportedOriginalLandCells':100945,'sourcePrecision':{'annualMm':.1,'longitudeLatitudeDegrees':.0001},'stepMm':250,'cornerMask':False,'method':'Marching squares in native x-major grid topology. Interpolate only between valid held cell centres. Geographic registration uses the supplied lon/lat values; x/y indices are not geographic degrees. Entire cells touching a nonland/missing vertex are excluded. Bands and isohyets share one generator; boundaries are not polygon smoothing of prior classes. Canada UI clips to the held national outline. No extrapolation or fabricated values.','limitations':['The full-precision annual NPZ is not held in this checkout; annual CSV rounds to 0.1 mm and geolocation to 0.0001 degrees.','Normal HTTPS range retrieval of the current original NetCDF header was blocked by proxy Tunnel connection failed: 403 Forbidden. No permission/security change or alternate route was used. Raw current land/monthly arrays were not independently rechecked.','Native valid-index mask, retained SHA, 100945 cells, reported source counts, valid extrema and no interpolation across missing/nonland are checked. Values and labels remain derived climate normals, not station measurements.'],'bands':groups,'contours':len(lines),'labelCandidates':len(labels),'files':files,'license':'Open Government Licence – Canada','licenseUrl':'https://open.canada.ca/en/open-government-licence-canada','attribution':'Source: Environment and Climate Change Canada, CanGridP mlyV2; annual normals and contours adapted by Insight Journal.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
config=ROOT/'src/data/atlas/canada/water-resources.json';d=json.loads(config.read_text());p=d['datasets']['precipitation'];p['groups']=groups;p['geometryUrl']='/insight-journal/assets/atlas/canada-precipitation-contours-v1/bands.geojson';p['contoursUrl']='/insight-journal/assets/atlas/canada-precipitation-contours-v1/isohyets.geojson';p['contourLabels']=labels;p['images']=[];p.pop('imageUrl',None);p.pop('classImages',None);p['processingManifestUrl']='/insight-journal/assets/atlas/canada-precipitation-contours-v1/manifest.json';p['method']=manifest['method'];p['note']='保管済みの連続年平均格子（0.1 mm丸め）から250 mm等雨量線を作図。線間の青は年降水量の段階。原格子約10 kmを超える精度や各地点の実測値を表しません。';p['scope']='1991–2020年平均・雨と雪の水当量。保管した100,945有効陸域セルを使用。原NetCDFの今回の再取得・再照合はできていません。';config.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'bands':len(bands),'contours':len(lines),'labels':len(labels),'valid':int(valid.sum()),'bytes':sum(x['bytes']for x in files.values())}))
