"""Offline Africa physical assets from immutable global originals.

Preparation only. The site build uses the retained PNG/gzip/GeoJSON assets.
Requires NumPy and Pillow; native ETOPO window is decoded by GeoTIFF.js.
"""
from pathlib import Path
import argparse, gzip, hashlib, json, math, platform
import numpy as np
from PIL import Image, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
BOUNDS = [-27, -36, 64, 39]
WIDTH, HEIGHT, STEP = 910, 750, .1
CLIMATE_SHA = '7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361'
ETOPO_SHA = '9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e'
NODATA = -32768
BREAKS = [0, 200, 500, 1000, 2000, 3000, 4000]
COLORS = ['#b4cfbf', '#d8e2b5', '#e0d5a0', '#cdbc88', '#b09a78', '#987d6b', '#b9aaa0', '#eee9e1']

def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        while b := f.read(1048576): h.update(b)
    return h.hexdigest()

def write(p, value):
    p.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf8', newline='\n')

def ring_mask(ring, width=WIDTH, height=HEIGHT, step=STEP):
    """Even/odd scanlines at actual destination cell centres."""
    xy = np.asarray(ring, dtype=np.float64)
    if not np.array_equal(xy[0], xy[-1]): xy = np.vstack((xy, xy[0]))
    x0, y0, x1, y1 = xy[:-1, 0], xy[:-1, 1], xy[1:, 0], xy[1:, 1]
    result = np.zeros((height, width), dtype=bool)
    for row in range(max(0, int(math.floor((BOUNDS[3]-max(y0.max(), y1.max()))/step))), min(height, int(math.ceil((BOUNDS[3]-min(y0.min(), y1.min()))/step))+1)):
        y = BOUNDS[3] - (row+.5)*step
        cross = ((y0 <= y) & (y < y1)) | ((y1 <= y) & (y < y0))
        xs = np.sort(x0[cross] + (y-y0[cross])*(x1[cross]-x0[cross])/(y1[cross]-y0[cross]))
        if len(xs)%2: raise ValueError('Odd polygon scanline intersection count')
        for left, right in zip(xs[::2], xs[1::2]):
            start = max(0, int(math.ceil((left-BOUNDS[0])/step-.5)))
            stop = min(width, int(math.ceil((right-BOUNDS[0])/step-.5)))
            if stop > start: result[row, start:stop] = True
    return result

def land_masks(collection, width=WIDTH, height=HEIGHT, step=STEP, keep_countries=True):
    land = np.zeros((height, width), dtype=bool)
    countries = {}
    for f in collection['features']:
        g = f['geometry']; country = np.zeros_like(land)
        polys = [g['coordinates']] if g['type']=='Polygon' else g['coordinates']
        if g['type'] not in ('Polygon', 'MultiPolygon'): raise ValueError('Expected country polygons')
        for rings in polys:
            part = np.zeros_like(land)
            for ring in rings: part ^= ring_mask(ring, width, height, step)
            country |= part
        if keep_countries: countries[f['properties']['code']] = country
        land |= country
    return land, countries

def contours(values, valid):
    """Marching squares on display cell centres; no paths across missing cells."""
    features = []
    for level in [200, 500, 1000, 2000, 3000, 4000, 5000]:
        # TL, TR, BR, BL, coordinates in fractional display-cell-centre indices.
        a, b, c, d = values[:-1,:-1], values[:-1,1:], values[1:,1:], values[1:,:-1]
        ok = valid[:-1,:-1] & valid[:-1,1:] & valid[1:,1:] & valid[1:,:-1]
        lo = np.minimum(np.minimum(a,b),np.minimum(c,d))
        hi = np.maximum(np.maximum(a,b),np.maximum(c,d))
        rows, cols = np.nonzero(ok & (lo < level) & (hi >= level))
        segments = []
        for row, col in zip(rows.tolist(), cols.tolist()):
            v = [float(a[row,col]),float(b[row,col]),float(c[row,col]),float(d[row,col])]
            corners = [(col+.5,row+.5),(col+1.5,row+.5),(col+1.5,row+1.5),(col+.5,row+1.5)]
            hits = []
            for edge in range(4):
                end = (edge+1)%4
                if (v[edge] >= level) == (v[end] >= level): continue
                t = (level-v[edge])/(v[end]-v[edge])
                hits.append((edge,(corners[edge][0]+t*(corners[end][0]-corners[edge][0]),corners[edge][1]+t*(corners[end][1]-corners[edge][1]))))
            if len(hits)==2: pairs=[(hits[0][1],hits[1][1])]
            elif len(hits)==4:
                # Consistent saddle decision using bilinear centre value.
                if (sum(v)/4 >= level) == (v[0]>=level): pairs=[(hits[0][1],hits[1][1]),(hits[2][1],hits[3][1])]
                else: pairs=[(hits[0][1],hits[3][1]),(hits[1][1],hits[2][1])]
            else: raise ValueError('Unexpected contour edge count')
            segments.extend(pairs)
        adjacency = {}
        for i, (start,end) in enumerate(segments):
            for point in (start,end): adjacency.setdefault(tuple(round(n,8) for n in point),[]).append(i)
        used=set(); lines=[]
        def trace(index, first):
            line=[first];current=first
            while index not in used:
                used.add(index);s,t=segments[index]
                nextpoint=t if tuple(round(n,8) for n in s)==tuple(round(n,8) for n in current) else s
                line.append(nextpoint);current=nextpoint
                remaining=[n for n in adjacency[tuple(round(v,8) for v in current)] if n not in used]
                if not remaining:break
                index=remaining[0]
            return line
        for key, indices in adjacency.items():
            if len(indices)==1 and indices[0] not in used: lines.append(trace(indices[0],key))
        for index,(start,_) in enumerate(segments):
            if index not in used:lines.append(trace(index,start))
        coordinates=[]
        for line in lines:
            if len(line)<3:continue
            coordinates.append([[round(BOUNDS[0]+x*STEP,6),round(BOUNDS[3]-y*STEP,6)] for x,y in line])
        if coordinates: features.append({'type':'Feature','id':f'contour-{level}','properties':{'id':f'contour-{level}','elevationM':level,'source':'ETOPO 2022 derived display DEM'},'geometry':{'type':'MultiLineString','coordinates':coordinates}})
        print(json.dumps({'contourM':level,'lines':len(coordinates),'vertices':sum(map(len,coordinates))}),flush=True)
    return {'type':'FeatureCollection','bbox':BOUNDS,'features':features}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--climate',type=Path,required=True)
    ap.add_argument('--etopo-window',type=Path,required=True)
    ap.add_argument('--output',type=Path,default=ROOT/'public/assets/atlas/africa-physical-v1')
    args=ap.parse_args();out=args.output;out.mkdir(parents=True,exist_ok=True)
    if sha(args.climate)!=CLIMATE_SHA:raise ValueError('Pinned climate original SHA mismatch')
    with Image.open(args.climate) as image:
        if image.size!=(3600,1800) or image.mode!='L':raise ValueError('Climate source geometry mismatch')
        if list(image.tag_v2[33550])!=[.1,.1,0.] or list(image.tag_v2[33922])!=[0.,0.,0.,-180.,90.,0.]:raise ValueError('Climate transform mismatch')
        raw=np.asarray(image,dtype=np.uint8).copy()
    climate=raw[510:1260,1530:2440].copy()
    if climate.shape!=(HEIGHT,WIDTH) or climate.max()>30:raise ValueError('Climate class window mismatch')
    boundary=ROOT/'src/data/atlas/africa-geography.json'
    geography=json.loads(boundary.read_text(encoding='utf8'))
    land,countries=land_masks(geography)
    climate[~land]=0
    meta=json.loads(args.etopo_window.read_text(encoding='utf8'))
    gridfile=args.etopo_window.parent/meta['file']
    if meta['sourceSha256']!=ETOPO_SHA or meta['bounds']!=BOUNDS or meta['width']!=5460 or meta['height']!=4500 or sha(gridfile)!=meta['sha256']:raise ValueError('Native DEM window provenance mismatch')
    native=np.fromfile(gridfile,dtype='<f4').reshape((4500,5460))
    native_land,_=land_masks(geography,5460,4500,1/60,False)
    native_valid=np.isfinite(native)&(native!=meta['noData'])&native_land
    blocks=native.reshape(HEIGHT,6,WIDTH,6)
    good=native_valid.reshape(HEIGHT,6,WIDTH,6)
    count=good.sum(axis=(1,3))
    sums=np.where(good,blocks,0.).sum(axis=(1,3),dtype=np.float64)
    averaged=np.divide(sums,count,out=np.zeros((HEIGHT,WIDTH),dtype=np.float64),where=count>0)
    valid=land&(count>0)
    rounded=np.rint(averaged)
    if rounded[valid].min()<=NODATA or rounded[valid].max()>32767:raise ValueError('Elevation does not fit retained int16')
    elevation=rounded.astype('<i2');elevation[~valid]=NODATA
    legendfile=ROOT/'public/assets/atlas/asia-climate-v2/legend.json'
    legend=json.loads(legendfile.read_text(encoding='utf8'))
    present=set(int(n) for n in np.unique(climate) if n)
    classes=[{**item,'name':item.get('name') or item.get('label') or item['code']} for item in legend if item['id'] in present]
    palette=np.zeros((31,4),dtype=np.uint8)
    for item in legend:palette[item['id']]=[*bytes.fromhex(item['color'][1:]),255]
    rgba=palette[climate]
    Image.fromarray(rgba).save(out/'climate.png',optimize=True)
    (out/'climate.values.gz').write_bytes(gzip.compress(climate.tobytes(),mtime=0))
    elevpalette=np.array([[*bytes.fromhex(color[1:]),255] for color in COLORS],dtype=np.uint8)
    elevrgba=elevpalette[np.searchsorted(BREAKS,elevation,side='right')];elevrgba[~valid]=0
    Image.fromarray(elevrgba).save(out/'elevation.png',optimize=True)
    (out/'elevation.values.gz').write_bytes(gzip.compress(elevation.tobytes(),mtime=0))
    contour_data=contours(elevation,valid);write(out/'contours.geojson',contour_data)
    checks={'climateImageEqualsQuery':np.array_equal(np.asarray(Image.open(out/'climate.png')),palette[np.frombuffer(gzip.decompress((out/'climate.values.gz').read_bytes()),dtype=np.uint8).reshape(HEIGHT,WIDTH)]),'elevationGridExactRoundTrip':np.array_equal(np.frombuffer(gzip.decompress((out/'elevation.values.gz').read_bytes()),dtype='<i2').reshape(HEIGHT,WIDTH),elevation),'elevationImageEqualsQuery':np.array_equal(np.asarray(Image.open(out/'elevation.png')),elevrgba),'maskedOceanTransparent':bool((rgba[~land,3]==0).all() and (elevrgba[~land,3]==0).all()),'climateOriginalCellsUnchanged':np.array_equal(climate[land],raw[510:1260,1530:2440][land]),'contoursPresent':bool(contour_data['features'])}
    if not all(checks.values()):raise ValueError('Generated asset consistency checks failed')
    shared={'bounds':BOUNDS,'crs':'EPSG:4326','width':WIDTH,'height':HEIGHT,'resolutionDegrees':STEP,'gridOrder':'row-major north-to-south, west-to-east','boundary':{'file':boundary.relative_to(ROOT).as_posix(),'sha256':sha(boundary),'features':len(countries),'license':'Natural Earth public domain','method':'Even-odd polygon scanlines at destination cell centres; retain supplied country/disputed-area geometry unchanged'},'queryMethod':'floor((lon-west)/0.1), floor((north-lat)/0.1); outside bounds or noData is unavailable'}
    layers={'climate':{**shared,'image':'climate.png','grid':'climate.values.gz','encoding':'uint8-gzip','noData':0,'unit':'Köppen-Geiger climate class','period':'1991–2020','sourceName':'Beck et al. (2023) Köppen-Geiger 0.1-degree classification','publisher':'Beck et al. / GloH2O / Figshare','sourceUrl':'https://doi.org/10.1038/s41597-023-02549-6','downloadUrl':'https://ndownloader.figshare.com/files/45057352','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','sourceFile':str(args.climate),'sourceSha256':CLIMATE_SHA,'sourceBytes':args.climate.stat().st_size,'sourceResolutionDegrees':.1,'classes':classes,'validPixels':int((climate!=0).sum()),'method':'Exact publisher 0.1-degree categorical cells, no interpolation or new class inference. Africa country polygon cell-centre mask; source ocean/noData class0 stays unavailable. Publisher coarse classification is majority-resampled from its finer product.'},'elevation':{**shared,'image':'elevation.png','grid':'elevation.values.gz','encoding':'int16-le-gzip','noData':NODATA,'unit':'m','period':'ETOPO 2022 model edition; source observations span multiple years','sourceName':'NOAA ETOPO 2022 v1 60 arc-second surface','publisher':'NOAA National Centers for Environmental Information','sourceUrl':'https://www.ncei.noaa.gov/products/etopo-global-relief-model','downloadUrl':'https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif','license':'CC0-1.0','licenseUrl':'https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ngdc.mgg.dem%3Aetopo_2022/html','sourceSha256':ETOPO_SHA,'sourceBytes':meta['sourceBytes'],'sourceResolutionDegrees':1/60,'sourceNoData':meta['noData'],'verticalDatum':'EGM2008 geoid (EPSG:3855)','breaks':BREAKS,'colors':COLORS,'validPixels':int(valid.sum()),'displayMinM':int(elevation[valid].min()),'displayMaxM':int(elevation[valid].max()),'method':'Arithmetic mean of each aligned 6×6 block of valid original 60 arc-second float32 cells whose native-cell centres fall inside the supplied Africa land polygons; no spatial interpolation. Round the land-only mean to whole metres and apply the same Africa destination-cell-centre land mask to query and class PNG. Actual negative land elevations are retained.'}}
    layers['terrain']={**layers['elevation'],'contours':'contours.geojson','unit':'elevation classes and contours in m','method':layers['elevation']['method']+' Contours use marching squares and linear level-crossing interpolation between valid display-cell centres; saddle choice follows the cell-centre bilinear mean. No contours cross a missing cell. This shows hypsometric relief, not inferred geology or geomorphological landform classes.'}
    manifest={'schemaVersion':1,'version':'1.0.0',**shared,'layers':layers,'limitations':['0.1-degree display cells and generalized country masks omit small islands/coastal detail; no nearest-land filling.','2022 is a model edition, not a uniform observation year. Rounded metres are display precision, not survey accuracy.','ETOPO includes bathymetry; native and display country masks remove offshore cell centres, but source cells and generalized coastlines still mix coastal detail. Display min/max are sampled land-cell block means, not summit elevations or national extrema.','Terrain colors are elevation intervals. Contours are calculated from the derived display DEM; they are not source-resolution survey contours or geological/landform classification.','Pixel counts in longitude/latitude are not area totals.'], 'processing':{'script':'scripts/prepare-africa-physical.py','scriptSha256':sha(Path(__file__)),'python':platform.python_version(),'numpy':np.__version__,'pillow':pillow_version,'paletteReference':legendfile.relative_to(ROOT).as_posix(),'paletteSha256':sha(legendfile),'nativeWindowSha256':meta['sha256']},'countryCoverage':{code:{'maskPixels':int(mask.sum()),'climatePixels':int((mask&(climate!=0)).sum()),'elevationPixels':int((mask&valid).sum())} for code,mask in countries.items()},'checks':checks,'files':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(out.iterdir()) if p.is_file() and p.name!='manifest.json'}}
    manifest['processing']['decoderScript']='scripts/decode-africa-etopo.mjs'
    manifest['processing']['decoderSha256']=sha(ROOT/'scripts/decode-africa-etopo.mjs')
    manifest['processing']['reproduction']={'decoder':'node scripts/decode-africa-etopo.mjs --source <immutable-global-ETOPO.tif> --out <private-cache> --geotiff-package <GeoTIFF.js-package>','packager':'python scripts/prepare-africa-physical.py --climate data-source/atlas/russia/nature/koppen_geiger_0p1_1991_2020.tif --etopo-window <private-cache>/africa-etopo-native.json','cachePolicy':'Original global TIFF and exact native float32 window remain private; only final PNG/grid/GeoJSON and provenance are shipped.'}
    write(out/'manifest.json',manifest)
    print(json.dumps({'output':str(out),'checks':checks,'climateClasses':len(classes),'climatePixels':int((climate!=0).sum()),'elevationPixels':int(valid.sum()),'files':manifest['files']},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
