"""Crop a public SPAM 2020 v2r2 GeoTIFF to Europe, retaining zero and nodata.

Input archive: published MAPSPAM link, identical MD5 to Harvard Dataverse 13827040.
Uses numpy and Pillow. Run after prepare-climate.py to share the map projection.
"""
from pathlib import Path
from datetime import date
import hashlib, json, math, zipfile, gzip
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT.parent/'europe-source-cache'
OUT=ROOT/'public/assets/atlas/europe/wheat-v1'
DATA=ROOT/'src/data/atlas/europe'
ARCHIVE=CACHE/'spam2020V2r2_global_harvested_area.geotiff.zip'
DOWNLOAD='https://www.dropbox.com/scl/fi/sw2z9pimrkqqv71pqf5z8/spam2020V2r2_global_harvested_area.geotiff.zip?dl=1&rlkey=e11l395kofek5233pj4e1t9wf&st=o0otxlpz'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def write(p,value): p.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf8')
raw=ARCHIVE.read_bytes()
assert hashlib.md5(raw).hexdigest()=='dd9ac5def086fcae26d28423b2b31f8b'
with zipfile.ZipFile(ARCHIVE) as archive:
    name='spam2020V2r2_global_harvested_area/spam2020_V2r2_global_H_WHEA_A.tif'
    input_bytes=archive.read(name)
    import io
    im=Image.open(io.BytesIO(input_bytes))
    assert im.size==(4320,2160) and im.mode=='F'
    assert abs(im.tag_v2[33550][0]-1/12)<1e-8
    assert im.tag_v2[33922][3]==-180 and abs(im.tag_v2[33922][4]-90)<1e-8
    values=np.asarray(im)
    nodata=float(im.tag_v2[42113])
    assert nodata < -1e30
merc=lambda lat:math.log(math.tan(math.pi/4+math.radians(lat)/2))
width=1800
height=round(width*(merc(73)-merc(32))/math.radians(90))
ys=merc(73)-(np.arange(height)+.5)/height*(merc(73)-merc(32))
lat=np.degrees(2*np.arctan(np.exp(ys))-np.pi/2)
lon=-25+(np.arange(width)+.5)/width*90
rows=np.floor((90-lat)*12).astype(int)
cols=np.floor((lon+180)*12).astype(int)
sample=values[np.ix_(rows,cols)]
assert (sample[sample>=0] <= 15000).all()
colors=['00000000','e3e4dfFF','ede2bbFF','dac58aFF','bc9b58FF','93743dFF','654d29FF']
bins=np.zeros(sample.shape,dtype=np.uint8)
bins[sample==0]=1
for i,(low,high) in enumerate([(0,50),(50,250),(250,1000),(1000,3000),(3000,float('inf'))],2):
    bins[(sample>low if low==0 else sample>=low)&(sample<high)]=i
palette=np.array([list(bytes.fromhex(c)) for c in colors],dtype=np.uint8)
OUT.mkdir(parents=True,exist_ok=True)
Image.fromarray(palette[bins]).save(OUT/'wheat.png',optimize=True)
# Keep the unresampled source subset for coordinate lookup. Sentinel -1 is nodata.
subset=values[204:696,1860:2940].copy().astype('<f4')
subset[subset<0]=-1
(OUT/'values.bin.gz').write_bytes(gzip.compress(subset.tobytes(),mtime=0))
legend=[dict(id=i,color='#'+colors[i][:6],label=label) for i,label in enumerate(['データなし','0 ha','0超〜50 ha未満','50〜250 ha未満','250〜1,000 ha未満','1,000〜3,000 ha未満','3,000 ha以上']) if i]
write(DATA/'wheat-legend.json',legend)
write(OUT/'manifest.json',dict(schemaVersion=1,bounds=[-25,32,65,73],width=width,height=height,projection='EPSG:3857',period='2020年頃',unit='ha per 5 arc-minute source cell',variable='Harvested area, wheat, all production systems',resolutionDegrees=1/12,lookup=dict(width=1080,height=492,west=-25,north=73,nodata=-1,encoding='little-endian float32, row-major, gzip'),publisher='International Food Policy Research Institute (IFPRI)',dataset='SPAM 2020 v2r2, Harvard Dataverse version 6.0',doi='https://doi.org/10.7910/DVN/SWPENT',metadataUrl='https://dataverse.harvard.edu/api/datasets/:persistentId/versions/6.0?persistentId=doi:10.7910/DVN/SWPENT',downloadUrl=DOWNLOAD,license='CC BY 4.0 under IFPRI Dataverse Terms of Use section 4',licenseNote='MAPSPAM website generic terms mention an older NC license. This exact archive is also catalogued by IFPRI Dataverse under its CC BY 4.0 default; MD5 matched the published Dataverse file 13827040. No alternate license is specified in its Readme.',retrievedAt=str(date.today()),inputs=[dict(file=ARCHIVE.name,sha256=sha(raw)),dict(file=name,sha256=sha(input_bytes)),dict(file='mapspam-metadata.json',sha256=sha((CACHE/'mapspam-metadata.json').read_bytes()))],processing='Nearest-neighbour reprojection of 5 arc-minute wheat harvested area to Web Mercator. No inferred values. Nodata transparent; zero grey. Lookup retains the original source cells. No country totals or current production inferred.',files={n:dict(sha256=sha((OUT/n).read_bytes()),bytes=(OUT/n).stat().st_size) for n in ['wheat.png','values.bin.gz']}))
print(json.dumps(dict(size=[width,height],validCells=int((subset>=0).sum()),positiveCells=int((subset>0).sum()))))
