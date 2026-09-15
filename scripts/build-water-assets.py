#!/usr/bin/env python3
"""Build reproducible small water maps from PRISM M4 and USGS WBD HUC8.
Usage: python scripts/build-water-assets.py /path/to/water-source
Input files: prism.zip (annual 1991-2020 4km), wbd.geojson, wbd-query-url.txt.
"""
import sys,json,hashlib,gzip,math,zipfile,io
import cairosvg
from PIL import Image
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import shapes
from shapely.geometry import shape,mapping,box,Polygon,MultiPolygon
from shapely.ops import unary_union
from shapely import make_valid,coverage_simplify
ROOT=Path(__file__).resolve().parents[1]; SRC=Path(sys.argv[1]); OUT=ROOT/'public/assets/atlas/water-v1'; OUT.mkdir(parents=True,exist_ok=True)
ids=['lt250','250-500','500-750','750-1000','1000-1500','1500-2000','gte2000']
colors=['#f2dfb3','#e0e4be','#b9d8b8','#8bc8bf','#60afb8','#378eaa','#216782']
thresholds=[250,500,750,1000,1500,2000]
def dump(name,obj):
 s=json.dumps(obj,ensure_ascii=False,separators=(',',':'));(OUT/name).write_text(s);return len(s.encode())
def feat(g,p):return {'type':'Feature','properties':p,'geometry':json.loads(json.dumps(mapping(g)),parse_float=lambda x:round(float(x),4))}
def coll(fs):return {'type':'FeatureCollection','features':fs}
def polygonal(g):
 if g.geom_type in ['Polygon','MultiPolygon']:return g
 return unary_union([polygonal(x) for x in g.geoms if x.geom_type in ['Polygon','MultiPolygon','GeometryCollection']])
def clean(g):
 g=polygonal(make_valid(g))
 parts=list(g.geoms) if g.geom_type=='MultiPolygon' else [g]
 return unary_union([Polygon(p.exterior,[r for r in p.interiors if Polygon(r).area>=.002]) for p in parts if p.area>=.002]).simplify(.014,preserve_topology=True)
base=json.loads((ROOT/'public/assets/atlas/v3/base.geojson').read_text())
lands=[shape(f['geometry']) for f in base['features'] if f['properties']['kind']=='land' and f['properties'].get('country')=='USA']; land=unary_union(lands).intersection(box(-128,22,-64,50))
z=zipfile.ZipFile(SRC/'prism.zip');z.extractall(SRC/'prism');tif=next((SRC/'prism').glob('*.tif'))
with rasterio.open(tif) as src:
 a=src.read(1);valid=a!=src.nodata;classes=np.digitize(a,thresholds).astype('uint8');transform=src.transform
 geoms=[[] for _ in ids]
 for geom,value in shapes(classes,mask=valid,transform=transform):geoms[int(value)].append(shape(geom))
 bands=[polygonal(g.intersection(land)) for g in coverage_simplify([unary_union(gs) for gs in geoms],.014)]
 fs=[feat(g,{'id':id,'color':colors[i],'kind':'band'}) for i,(id,g) in enumerate(zip(ids,bands))]
 # Shared simplified display geometry is also the hit-test geometry.
 support=unary_union(bands)
 for i,value in enumerate(thresholds):
  above=unary_union(bands[i+1:]);below=unary_union(bands[:i+1]);line=above.boundary.intersection(below.buffer(.0001)).simplify(.008)
  fs.append(feat(line,{'id':ids[i+1],'value':value,'kind':'isohyet','major':value in [1000,1500]}))
 dump('precipitation.geojson',coll(fs))
 # Source-cell probes for regression, with exact source coordinates and classified interval.
 probes=[]
 for name,x,y in [('Seattle',-122.33,47.6),('Denver',-104.99,39.74),('Las Vegas',-115.14,36.17),('New Orleans',-90.07,29.95),('Miami airport',-80.29,25.79)]:
  row,col=rasterio.transform.rowcol(transform,x,y);v=float(a[row,col]);probes.append({'name':name,'coordinate':[x,y],'annualMm':round(v,2),'band':ids[int(classes[row,col])]})
# HUC8 aggregation. Explicit exclusions prevent assigning major endorheic basins/coastal drainages to rivers.
wbd=json.loads((SRC/'wbd.geojson').read_text());assert 'features' in wbd and len(wbd['features'])>500
exclude={'14040200','15050201','15040003','18020001','10060007','17040214','17040215','17040216','17040217','17040218'}
def member(id,h):
 if h in exclude:return False
 if id=='missouri':return h.startswith('10')
 if id=='ohio':return h.startswith(('05','06'))
 if id=='mississippi':return h.startswith(('05','06','07','10','0801','0802','0803','0806')) or '1101'<=h[:4]<='1111' or h in ['08070100','08090100']
 if id=='colorado':return h.startswith('14') or ('1501'<=h[:4]<='1507')
 if id=='columbia':return '1701'<=h[:4]<='1709'
 if id=='sacramento':return h.startswith('1802')
 return h.startswith('1804')
names=['mississippi','missouri','ohio','colorado','columbia','sacramento','san-joaquin'];cols=['#c5d6bf','#b8cbe3','#dcc7db','#efc89e','#b5d9cb','#e3ce93','#c4b9d8'];bs={};units={}
for id in names:
 selected=[f for f in wbd['features'] if member(id,f['properties']['huc8'])];units[id]=[f['properties'] for f in selected]
 bs[id]=polygonal(clean(unary_union([make_valid(shape(f['geometry'])) for f in selected])).intersection(land))
assert bs['missouri'].difference(bs['mississippi'].buffer(.03)).area<.01
assert bs['ohio'].difference(bs['mississippi'].buffer(.03)).area<.01
# Use children clipped to parent to remove independent simplification slivers.
for id in ['missouri','ohio']:bs[id]=polygonal(bs[id].intersection(bs['mississippi']))
fs=[]
for i,id in enumerate(names):
 display=polygonal(bs[id].difference(unary_union([bs['missouri'],bs['ohio']]))) if id=='mississippi' else bs[id]
 fs.append(feat(display,{'id':id,'color':cols[i],'kind':'basin'}))
 fs.append(feat(bs[id].boundary,{'id':id,'kind':'outline'}))
dump('basins.geojson',coll(fs))
# SVG fallback: same features and Mercator bounds as map; accessible names supplied by HTML controls.
def proj(p):
 x,y=p;return ((x+128)/64*1800,(math.asinh(math.tan(math.radians(52)))-math.asinh(math.tan(math.radians(y))))/(math.asinh(math.tan(math.radians(52)))-math.asinh(math.tan(math.radians(22))))*1091)
def path(g):
 t=g['type'];c=g.get('coordinates',[])
 if t in ['Polygon','MultiLineString']:return ''.join('M'+'L'.join(f'{proj(p)[0]:.1f},{proj(p)[1]:.1f}' for p in ring)+('Z' if t=='Polygon' else '') for ring in c)
 if t=='MultiPolygon':return ''.join(path({'type':'Polygon','coordinates':p}) for p in c)
 if t=='LineString':return 'M'+'L'.join(f'{proj(p)[0]:.1f},{proj(p)[1]:.1f}' for p in c) if c else ''
 if t=='GeometryCollection':return ''.join(path(p) for p in g['geometries'])
 return ''
for mode in ['precipitation','basins']:
 features=json.loads((OUT/f'{mode}.geojson').read_text())['features'];parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1091"><rect width="1800" height="1091" fill="#e4eff0"/>']
 for f in base['features']:
  if f['properties']['kind']=='land':parts.append(f'<path d="{path(f["geometry"])}" fill="#f0efea" stroke="#879695"/>')
 for f in features:
  p=f['properties'];fill=p.get('color','none');stroke='#688585' if p['kind']=='isohyet' else '#64736d' if p['kind']=='outline' else 'none';width=3 if p.get('major') else 1.4
  parts.append(f'<path d="{path(f["geometry"])}" fill="{fill}" fill-rule="evenodd" stroke="{stroke}" stroke-width="{width}"/>')
 for f in base['features']:
  k=f['properties']['kind']
  if k in ['river','state']:parts.append(f'<path d="{path(f["geometry"])}" fill="none" stroke="{"#4585ae" if k=="river" else "#777"}" stroke-width="1" opacity=".6"/>')
 if mode=='precipitation':
  occupied=[]
  # Permanent isohyet numerals; choose long paths, not arbitrary map positions.
  for f in features:
   if f['properties']['kind']!='isohyet':continue
   g=shape(f['geometry']);lines=list(g.geoms) if hasattr(g,'geoms') else [g]
   for line in sorted(lines,key=lambda x:x.length,reverse=True)[:2]:
    if line.length<1:continue
    p=line.interpolate(.5,normalized=True);x,y=proj((p.x,p.y))
    if any(abs(x-ox)<100 and abs(y-oy)<35 for ox,oy in occupied):continue
    occupied.append((x,y));parts.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="23" text-anchor="middle" fill="#234957" stroke="#fff" stroke-width="2" paint-order="stroke">{f["properties"]["value"]:,}</text>')
 parts.append('</svg>')
 png=cairosvg.svg2png(bytestring=''.join(parts).encode(),output_width=1800,output_height=1091)
 Image.open(io.BytesIO(png)).convert('RGB').save(OUT/f'{mode}-fallback.webp',quality=90,method=6)
for p in OUT.glob('*-fallback.svg'):p.unlink()
for p in OUT.glob('*.geojson'):
 (OUT/(p.name+'.gz')).write_bytes(gzip.compress(p.read_bytes(),mtime=0))
 p.unlink()
manifest={'version':1,'accessed':'2026-09-15','precipitation':{'publisher':'PRISM Group, Oregon State University','url':'https://prism.oregonstate.edu','download':'https://data.prism.oregonstate.edu/normals/us/4km/ppt/monthly/prism_ppt_us_25m_2020_avg_30y.zip','period':'1991–2020','version':'M4; created 2022-11-29','resolution':'2.5 arc-minute (~4 km)','unit':'mm/year','thresholds':thresholds,'nodata':-9999,'probes':probes,'sourceSha256':hashlib.sha256((SRC/'prism.zip').read_bytes()).hexdigest()},'basins':{'publisher':'USGS Watershed Boundary Dataset','query':(SRC/'wbd-query-url.txt').read_text(),'sourceSha256':hashlib.sha256((SRC/'wbd.geojson').read_bytes()).hexdigest(),'units':units,'excludedHuc8':sorted(exclude),'scope':'Selected surface-drainage HUC8 unions clipped to US land; coastal/Red-Atchafalaya units excluded from Mississippi; named major closed basins excluded. Generalized national comparison, not parcel delineation.'},'processing':{'queryToleranceDegrees':.01,'simplifyDegrees':.014,'coordinatesDigits':4,'removeSimplificationSliversBelowSquareDegrees':.002,'fallbackBounds':[-128,22,-64,52]},'files':{}}
for p in OUT.iterdir():
 if p.name=='manifest.json':continue
 b=p.read_bytes();manifest['files'][p.name]={'bytes':len(b),'gzipBytes':len(gzip.compress(b)),'sha256':hashlib.sha256(b).hexdigest()}
dump('manifest.json',manifest)
print(json.dumps({'files':manifest['files'],'probes':probes},indent=2))
