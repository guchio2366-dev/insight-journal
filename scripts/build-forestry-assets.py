"""NLCD 2021 official WMS, categorical pixel extraction; no invented geometry.
Run from repository root. Requires Pillow, numpy and pyproj. Optional cached PNG
and legend in /tmp allow reproducing a timed download without requesting again.
"""
import hashlib,json,urllib.request,urllib.parse
from pathlib import Path
import numpy as np
from PIL import Image,ImageColor
from pyproj import Transformer
OUT=Path('public/assets/atlas/forestry/v1');OUT.mkdir(parents=True,exist_ok=True)
t=Transformer.from_crs(4326,3857,always_xy=True);w,s=t.transform(-128,22);e,n=t.transform(-64,52)
p=dict(service='WMS',version='1.1.1',request='GetMap',layers='NLCD_2021_Land_Cover_L48',srs='EPSG:3857',bbox=','.join(map(str,[w,s,e,n])),width=1800,height=1084,format='image/png',styles='',transparent='true',format_options='antialias:none')
url='https://www.mrlc.gov/geoserver/mrlc_display/wms?'+urllib.parse.urlencode(p)
legend_url='https://www.mrlc.gov/geoserver/mrlc_display/wms?service=WMS&version=1.1.1&request=GetLegendGraphic&format=application/json&layer=NLCD_2021_Land_Cover_L48'
def cached(path,url):
 p=Path(path)
 if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=60).read())
 return p
source=cached('/tmp/forest-nlcd.png',url);legend=cached('/tmp/forest-legend.json',legend_url)
entries=json.loads(legend.read_text())['Legend'][0]['rules'][0]['symbolizers'][0]['Raster']['colormap']['entries']
a=np.array(Image.open(source).convert('RGBA'));selected=np.zeros(a.shape[:2],dtype=bool);known=np.zeros_like(selected)
for item in entries:
 color=ImageColor.getrgb(item['color']);match=np.all(a[:,:,:3]==color,axis=2);known|=match
 if item['quantity'] in ['41','42','43']:selected|=match
unknown=int(((~known)&(a[:,:,3]>0)).sum());assert unknown==0, f'Noncategorical WMS pixels: {unknown}'
assert selected.sum()>100000,'Unexpected empty forest coverage'
out=np.zeros_like(a);out[selected]=[50,111,72,135];mask=Image.fromarray(out);mask.save(OUT/'forest-cover.png',optimize=True)
base=Image.open('public/assets/atlas/v3/land-fallback.webp').convert('RGBA');assert base.size==mask.size
Image.alpha_composite(base,mask).convert('RGB').save(OUT/'forestry-fallback.webp',quality=85)
features=json.loads(Path('public/assets/atlas/v3/base.geojson').read_text())['features']
regions={'south':['NC'],'northwest':['WA','OR'],'northeast':['ME','NH','VT']}
states=[f for f in features if f['properties']['kind']=='state' and f['properties']['code'] in sum(regions.values(),[])]
assert len(states)==6
(OUT/'regions.geojson').write_text(json.dumps({'type':'FeatureCollection','features':states},ensure_ascii=False,separators=(',',':')))
(OUT/'manifest.json').write_text(json.dumps({'version':'1.0','source':'USGS/MRLC NLCD 2021','sourceUrl':'https://www.mrlc.gov/','request':url,'legendRequest':legend_url,'license':'US government public-domain data; WMS AccessConstraints NONE','year':2021,'coverage':'Conterminous United States (48 states)','bounds':[-128,22,-64,52],'coordinates':[[-128,52],[-64,52],[-64,22],[-128,22]],'crs':'EPSG:3857','size':[1800,1084],'classes':[41,42,43],'method':'Exact official categorical WMS palette extraction, no smoothing or invented boundaries. Downsampled display only, not area statistics. Woody wetlands (90) omitted.','inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'forestDisplayPixels':int(selected.sum()),'unknownColors':unknown,'regionGeometry':'Existing Natural Earth US state boundaries; educational examples, not harvest/forest boundaries.','regionCodes':regions,'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in OUT.iterdir() if p.name!='manifest.json'}},ensure_ascii=False,indent=2)+'\n')
print('Forest pixels',selected.sum(), 'assets', [(p.name,p.stat().st_size) for p in OUT.iterdir()])
