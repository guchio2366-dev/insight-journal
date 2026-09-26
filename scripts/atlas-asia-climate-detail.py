"""Prepare Asia climate v2 from the pinned 1 km source, without network access.

Requires numpy, rasterio and Pillow. Pass the existing immutable Figshare zip.
Source classification is sampled at pixel centres; integer class IDs are never
averaged. The display interval matches North America's 0.02-degree-equivalent
Web Mercator grid (about 2.23 km in projected coordinates).
"""
from pathlib import Path
import argparse, gzip, hashlib, json, math, platform, zipfile
import numpy as np
import rasterio
from rasterio.io import MemoryFile
from rasterio.features import geometry_mask
from rasterio.transform import from_bounds
from rasterio.warp import transform_geom
from rasterio.windows import Window
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/assets/atlas/asia-climate-v1'
OUT=ROOT/'public/assets/atlas/asia-climate-v2'
MEMBER='1991_2020/koppen_geiger_0p00833333.tif'
SOURCE_SHA='d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d'
PIXEL_METRES=6378137*math.pi/180*.02
digest=lambda raw:hashlib.sha256(raw).hexdigest()
def write(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8',newline='\n')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path,required=True)
    args=parser.parse_args()
    raw=args.archive.read_bytes()
    if digest(raw)!=SOURCE_SHA: raise ValueError('Pinned source checksum mismatch')
    baseline=json.loads((BASE/'manifest.json').read_text(encoding='utf8'))
    with zipfile.ZipFile(args.archive) as archive:
        tif=archive.read(MEMBER)
        legend=archive.read('legend.txt')
    assert digest(legend)==baseline['source']['legendSha256']
    geography=ROOT/baseline['processing']['boundaryFile']
    assert digest(geography.read_bytes())==baseline['processing']['boundarySha256']
    features={f['properties']['code']:f for f in json.loads(geography.read_text(encoding='utf8'))['features']}
    classes=json.loads((BASE/'legend.json').read_text(encoding='utf8'))
    palette=np.zeros((31,4),dtype=np.uint8)
    for c in classes: palette[c['id']]=list(bytes.fromhex(c['color'][1:]))+[255]
    OUT.mkdir(parents=True,exist_ok=True)
    records={}
    with MemoryFile(tif) as memory, memory.open() as src:
        assert src.shape==(21600,43200) and src.crs.to_epsg()==4326
        assert np.isclose(src.res[0],1/120) and src.nodata==0
        assert np.allclose((src.bounds.left,src.bounds.top),(-180,90))
        for region,previous in baseline['regions'].items():
            west,south,east,north=previous['bounds4326']
            xmin,ymin,xmax,ymax=previous['bounds3857']
            w=math.ceil((xmax-xmin)/PIXEL_METRES); h=math.ceil((ymax-ymin)/PIXEL_METRES)
            assert max(w,h)<=4096
            xs=xmin+(np.arange(w)+.5)*(xmax-xmin)/w
            ys=ymax-(np.arange(h)+.5)*(ymax-ymin)/h
            lons=np.degrees(xs/6378137)
            lats=np.degrees(2*np.arctan(np.exp(ys/6378137))-math.pi/2)
            cols=np.floor((lons-src.transform.c)/src.transform.a).astype(int)
            rows=np.floor((lats-src.transform.f)/src.transform.e).astype(int)
            c0,c1=int(cols.min()),int(cols.max())+1
            r0,r1=int(rows.min()),int(rows.max())+1
            source=src.read(1,window=Window(c0,r0,c1-c0,r1-r0))
            values=source[np.ix_(rows-r0,cols-c0)]
            assert values.min()>=0 and values.max()<=30
            transform=from_bounds(xmin,ymin,xmax,ymax,w,h)
            mask=np.zeros((h,w),dtype=bool); coverage={}
            for code in previous['countryCoverage']:
                geometry=transform_geom('EPSG:4326','EPSG:3857',features[code]['geometry'])
                country=geometry_mask([geometry],out_shape=(h,w),transform=transform,invert=True)
                cells=values[country]; mask|=country
                coverage[code]={'maskPixels':int(cells.size),'classifiedPixels':int(np.count_nonzero(cells)),
                    'sourceNoDataPixels':int(np.count_nonzero(cells==0)),
                    'classIds':[int(v) for v in np.unique(cells) if v]}
            values=np.where(mask,values,0).astype('uint8')
            image=region+'.png'; grid=region+'.uint8.gz'
            Image.fromarray(palette[values]).save(OUT/image,optimize=True)
            packed=gzip.compress(values.tobytes(),compresslevel=9,mtime=0)
            (OUT/grid).write_bytes(packed)
            assert gzip.decompress(packed)==values.tobytes()
            assert np.array_equal(np.asarray(Image.open(OUT/image)),palette[values])
            counts=np.bincount(values.ravel(),minlength=31)
            records[region]={**previous,'width':w,'height':h,'image':image,'grid':grid,'gridEncoding':'uint8-gzip',
                'pixelSizeMetres3857':[(xmax-xmin)/w,(ymax-ymin)/h],
                'classIds':[i for i in range(1,31) if counts[i]],
                'classPixelCounts':{str(i):int(counts[i]) for i in range(1,31) if counts[i]},
                'classifiedPixels':int(counts[1:].sum()),'countryCoverage':coverage,
                'countriesWithoutClassifiedPixels':[c for c,v in coverage.items() if not v['classifiedPixels']]}
            print(region,w,h,'image bytes',(OUT/image).stat().st_size,'lookup bytes',len(packed),flush=True)
    write(OUT/'legend.json',classes)
    manifest={**baseline,'schemaVersion':2,'version':'2.0.0',
        'source':{**baseline['source'],'member':MEMBER,'memberSha256':digest(tif),'memberBytes':len(tif),
            'sourceResolutionDegrees':1/120,'sourceResolutionNote':'Publisher 30 arc-second (approximately 1 km at the equator) source. Sampled at the centres of the display grid; not enlarged from the 0.1-degree version.'},
        'processing':{**baseline['processing'],'script':'scripts/atlas-asia-climate-detail.py',
            'scriptSha256':digest(Path(__file__).read_bytes()),
            'baselineManifestSha256':digest((BASE/'manifest.json').read_bytes()),
            'runtime':{'python':platform.python_version(),'numpy':np.__version__,'rasterio':rasterio.__version__},
            'targetPixelSizeMetres3857':PIXEL_METRES,
            'resampling':'Nearest 30 arc-second source cell at each destination pixel centre. No interpolation or averaging of class IDs.',
            'displayAndQuery':'RGBA PNG and gzip-compressed row-major UInt8 values from the identical masked array. Exact decoded equality checked during generation. Grid metadata is in this manifest.',
            'mask':'Existing Natural Earth country polygons rasterized at destination pixel centres (all_touched=false). Small islands are not enlarged or assigned nearby classes.'},
        'limitations':['Source cells are about 1 km at the equator; display/lookup spacing is about 2.23 km in Web Mercator, with smaller ground distances at higher latitudes. This is not a native 1 km display.',
            'Generalized country outlines still omit some coasts and small islands.']+baseline['limitations'][1:],
        'regions':records}
    names=['legend.json']+[r+s for r in records for s in ['.png','.uint8.gz']]
    manifest['files']={n:{'bytes':(OUT/n).stat().st_size,'sha256':digest((OUT/n).read_bytes())} for n in names}
    write(OUT/'manifest.json',manifest)

if __name__=='__main__': main()
