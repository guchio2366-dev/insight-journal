"""Three OMB July 2023 metros; no inferred suburban population. Census 2024 tracts/places, 2020 Urban Areas."""
import pandas as pd,shapely,numpy as np
from shapely.geometry import shape,mapping
from shapely.ops import transform,unary_union
from pyproj import Transformer
from build import RAW,OUT,shapes,save,table,observation
forward=Transformer.from_crs(4326,3857,always_xy=True).transform;back=Transformer.from_crs(3857,4326,always_xy=True).transform
population=table('b01003.dat')
countylist=pd.read_excel(RAW/'list1.xlsx',header=2,dtype=str).fillna('');citylist=pd.read_excel(RAW/'list2.xlsx',header=2,dtype=str).fillna('')
suppressed=set('36103122406 36103122501 36103145601 36103145602 36103145603 36103145604 36103145605 36103145702 36103146001 36103146105 36103146106 36103146201 36103146204 36103201200'.split())
def valid(g):return g if g.is_valid else shapely.make_valid(g)
def rounded(g):
 def coords(v):return [round(x,6) for x in v] if isinstance(v[0],(int,float)) else [coords(x) for x in v]
 d=mapping(g);d['coordinates']=coords(d['coordinates']);return d if shape(d).is_valid else mapping(g)
def feature(g,properties):return {'type':'Feature','properties':properties,'geometry':rounded(g)}
urban=[(r.record['NAME20'],shape(r.shape.__geo_interface__)) for r in shapes(RAW/'urban.zip').iterShapeRecords()]
for metro in ['35620','31080','19100']:
 counties=countylist[countylist['CBSA Code']==metro];codes=set(counties['FIPS State Code']+counties['FIPS County Code']);states=sorted({c[:2] for c in codes});rows=[];geoms=[];properties=[]
 for state in states:
  for s in shapes(RAW/f'{state}_tract.zip').iterShapeRecords():
   r=s.record.as_dict();fid=r['GEOID']
   if fid[:5] not in codes:continue
   obs=observation(population.get('1400000US'+fid,{}),'B01003',1)
   if obs[0] is None:assert fid in suppressed,fid
   rows.append({'id':'tract:'+fid,'name':r['NAMELSAD']+' · '+fid,'state':state,'population':obs,'area':round(int(r['ALAND'])/1e6,6)})
   geoms.append(transform(forward,valid(shape(s.shape.__geo_interface__))));properties.append({'id':'tract:'+fid})
 # Coverage simplification preserves shared edges. Never simplify polygons independently.
 a=np.array(geoms,dtype=object);simple=shapely.coverage_simplify(a,90) if shapely.coverage_is_valid(a) else a
 geographic=[transform(back,g) for g in simple];boundary=unary_union(geographic);west,south,east,north=boundary.bounds
 features=[feature(g,p) for g,p in zip(geographic,properties)]
 cities=citylist[citylist['CBSA Code']==metro];citycodes=set(cities['FIPS State Code']+cities['FIPS Place Code']);outlines=[]
 for state in states:
  for s in shapes(RAW/f'{state}_place.zip').iterShapeRecords():
   if s.record['GEOID'] in citycodes:outlines.append(feature(transform(back,transform(forward,valid(shape(s.shape.__geo_interface__))).simplify(100,preserve_topology=True)),{'kind':'city','name':s.record['NAME']}))
 assert len(outlines)==len(citycodes),(metro,len(outlines),len(citycodes))
 for name,g in urban:
  if not (g.bounds[2]<west or g.bounds[0]>east or g.bounds[3]<south or g.bounds[1]>north) and g.intersects(boundary):
   clipped=valid(g).intersection(boundary)
   if not clipped.is_empty:outlines.append(feature(transform(back,transform(forward,clipped).simplify(100,preserve_topology=True)),{'kind':'urban','name':name}))
 save('metro-'+metro,{'version':1,'rows':rows,'bounds':[[west,south],[east,north]],'counties':sorted(codes),'principalCities':sorted(citycodes),'suppressed':[r['id'] for r in rows if r['population'][0] is None]})
 save('metro-'+metro+'.geo',{'type':'FeatureCollection','features':features});save('metro-'+metro+'.outlines.geo',{'type':'FeatureCollection','features':outlines})
 print('metro',metro,'tracts',len(rows),'suppressed',sum(r['population'][0] is None for r in rows),flush=True)
