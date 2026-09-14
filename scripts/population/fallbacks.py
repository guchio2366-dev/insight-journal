"""Exact thematic fallback maps in Web Mercator; colors and thresholds match browser implementation."""
import json,math,pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import PathPatch
from matplotlib.path import Path
from PIL import Image
from build import OUT
D=['#f5f3e9','#edf3dd','#d1e4c0','#a4ccb3','#68aa9f','#357d88','#174e6a'];S=['#f5f3e9','#edf3dd','#d6e7c5','#b4d8bb','#87bcb0','#599d9f','#337986','#164d65'];V=['#275d9f','#8ab6d5','#ebe7dd','#dfa197','#a6373e'];M='#c8ccd0'
def load(n):return json.loads((OUT/(n+'.json')).read_text())
def color(v,kind):
 if v is None:return M
 if kind=='vote':return V[0 if v<=-15 else 1 if v<=-5 else 2 if v<5 else 3 if v<15 else 4]
 if kind=='density':return D[0 if v==0 else 1 if v<=1 else 2 if v<10 else 3 if v<100 else 4 if v<1000 else 5 if v<10000 else 6]
 return S[0 if v==0 else 1 if v<1 else 2 if v<5 else 3 if v<10 else 4 if v<25 else 5 if v<50 else 6 if v<75 else 7]
def xy(p):return p[0],math.degrees(math.log(math.tan(math.pi/4+math.radians(p[1])/2)))
def polygons(g):
 if g['type']=='Polygon':return [g['coordinates']]
 if g['type']=='MultiPolygon':return g['coordinates']
 if g['type']=='GeometryCollection':return [p for x in g['geometries'] for p in polygons(x)]
 return []
def draw(name,geo,values,kind,bounds=None,outlines=None):
 fig,ax=plt.subplots(figsize=(12,7.2),dpi=100);fig.patch.set_facecolor('#edf1ef');ax.set_facecolor('#edf1ef')
 for f in geo['features']:
  for poly in polygons(f['geometry']):
   points=[];codes=[]
   for ring in poly:
    points.extend(xy(p) for p in ring);codes.extend([Path.MOVETO]+[Path.LINETO]*(len(ring)-2)+[Path.CLOSEPOLY])
   ax.add_patch(PathPatch(Path(points,codes),facecolor=color(values.get(f['properties']['id']),kind),edgecolor='#637c7c',linewidth=.13))
 if outlines:
  for f in outlines['features']:
   for poly in polygons(f['geometry']):
    for ring in poly:
     x,y=zip(*(xy(p) for p in ring));ax.plot(x,y,color='#7d3f70' if f['properties']['kind']=='city' else '#344955',linewidth=.7 if f['properties']['kind']=='city' else .4,linestyle='-' if f['properties']['kind']=='city' else '--')
 bounds=bounds or [[-125,24],[-66,50]];a=xy(bounds[0]);b=xy(bounds[1]);ax.set_xlim(a[0]-.1,b[0]+.1);ax.set_ylim(a[1]-.1,b[1]+.1);ax.set_aspect('equal');ax.axis('off');fig.subplots_adjust(0,0,1,1)
 import io
 buf=io.BytesIO();fig.savefig(buf,format='png',dpi=100);plt.close(fig);buf.seek(0);Image.open(buf).convert('RGB').save(OUT/(name+'.webp'),quality=85,method=6);print(name,(OUT/(name+'.webp')).stat().st_size,flush=True)
rows={r['id']:r for r in load('counties')['rows']};geo=load('counties.geo')
draw('density',geo,{k:r['population'][0]/r['area'] if r['area'] else None for k,r in rows.items()},'density')
for i,name in enumerate(['white','black','hispanic','asian','aian','nhpi','multiple','other']):draw('ethnicity-'+name,geo,{r['id']:r['counts'][i][0]/rows[r['id']]['population'][0]*100 if rows[r['id']]['population'][0] else None for r in load('ethnicity')['rows']},'share')
draw('vote',geo,{r['id']:(r['r']-r['d'])/r['total']*100 if r['total'] else None for r in load('votes')['rows']},'vote')
draw('religion',{'type':'FeatureCollection','features':[f for f in load('states.geo')['features'] if f['properties']['id'] not in ['state:02','state:15']]},{},'share')
for code in ['35620','31080','19100']:
 data=load('metro-'+code);draw('metro-'+code,load('metro-'+code+'.geo'),{r['id']:r['population'][0]/r['area'] if r['population'][0] is not None and r['area']>0 else None for r in data['rows']},'density',data['bounds'],load('metro-'+code+'.outlines.geo'))
