"""Build a small, self-hosted atlas from georeferenced public data.

Build-time only: pip install rasterio shapely pyproj scipy numpy pillow
The website never calls these upstream services. See docs/atlas-data.md.
"""
from __future__ import annotations
import argparse
import hashlib
import gzip
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request
import urllib.parse
import zipfile

import numpy as np
import rasterio
from rasterio.features import shapes, rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling, transform_bounds
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union, transform
from pyproj import Transformer
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/atlas/v3'
VENDOR = ROOT / 'map/atlas/vendor'
NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/'
CDL = 'https://pdi.scinet.usda.gov/image/rest/services/CDL_WM/ImageServer'
BBOX = [-128, 22, -64, 52]
REGION = box(*BBOX)
MERCATOR = Transformer.from_crs(4326, 3857, always_xy=True)
WGS84 = Transformer.from_crs(5070, 4326, always_xy=True)
CROPS = [
    ('corn', 'とうもろこし', [1, 12, 13, 225, 226, 228, 237, 241], '#ecc759', 0.13),
    ('soybean', '大豆', [5, 26, 239, 240, 241, 254], '#a5bb74', 0.12),
    ('wheat', '小麦', [22, 23, 24, 26, 225, 230, 234, 236, 238], '#d5a56c', 0.10),
    ('cotton', '綿花', [2, 232, 238, 239], '#b886b2', 0.07),
    ('rice', '稲作', [3], '#54acd0', 0.06),
    ('specialty', '果樹・野菜', [43, 46, 47, 48, 49, 50, 53, 54, 55, 57, 66, 67, 68, 69, 72, 74, 75, 76, 77, 204, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 227, 229, 230, 231, 232, 233, 242, 243, 244, 245, 246, 247, 248, 249, 250], '#e89c6c', 0.07),
]

def download(url, dest):
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    print('Download', dest.name, flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'InsightJournalAtlas/3.0 (public-data-build)'})
    with urllib.request.urlopen(req, timeout=90) as response:
        data = response.read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return dest

def json_get(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return json.load(r)

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf8')

def rounded_geometry(geom):
    # Five decimals is finer than the source scale; simplification happens first.
    return json.loads(json.dumps(mapping(geom)), parse_float=lambda n: round(float(n), 5))

def feature(geom, **properties):
    return {'type': 'Feature', 'properties': properties, 'geometry': rounded_geometry(geom)}

def fc(features):
    return {'type': 'FeatureCollection', 'features': features}

def load_ne(cache, name):
    file = download(NE + name + '.geojson', cache / (name + '.geojson'))
    return json.loads(file.read_text())['features']

def parts(geom):
    if geom.geom_type == 'Polygon':
        return [geom]
    return [g for g in getattr(geom, 'geoms', []) if g.geom_type == 'Polygon']

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--relief-zip', type=Path)
    args = parser.parse_args()
    cache = args.cache
    cache.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    names = ['ne_50m_admin_0_countries', 'ne_50m_lakes', 'ne_50m_rivers_lake_centerlines', 'ne_50m_geography_regions_polys']
    with ThreadPoolExecutor(max_workers=4) as pool:
        data = dict(zip(names, pool.map(lambda name: load_ne(cache, name), names)))
    base = []
    usa = []
    for f in data[names[0]]:
        g = shape(f['geometry']).intersection(REGION)
        if g.is_empty:
            continue
        p = f['properties']
        country = p.get('ADM0_A3')
        base.append(feature(g, kind='land', name=p.get('NAME_JA') or p.get('NAME'), country=country))
        if country == 'USA':
            usa.append(g)
    usa = unary_union(usa)
    # Reuse the already checked, committed Natural Earth state input, not old SVG paths.
    state_input = VENDOR / 'ne_110m_admin_1_states_provinces.geojson'
    states = json.loads(state_input.read_text())['features']
    labels = []
    for f in states:
        g = shape(f['geometry']).intersection(REGION)
        if g.is_empty:
            continue
        p = f['properties']
        name = p.get('name_ja') or p.get('name')
        base.append(feature(g, kind='state', name=name, code=p.get('postal', '')))
        pt = g.representative_point()
        labels.append({'id': 'state-' + str(p.get('postal', name)), 'name': name, 'lng': round(pt.x, 4), 'lat': round(pt.y, 4), 'kind': 'state', 'priority': 5})
    lakes = []
    for f in data[names[1]]:
        g = shape(f['geometry']).intersection(REGION)
        if not g.is_empty:
            lakes.append(g)
            base.append(feature(g, kind='lake', name=f['properties'].get('name', '')))
    lake_union = unary_union(lakes)
    for f in data[names[2]]:
        g = shape(f['geometry']).intersection(REGION)
        if not g.is_empty:
            base.append(feature(g.simplify(0.012), kind='river', name=f['properties'].get('name', '')))
    land_regions = []
    for f in data[names[3]]:
        g = shape(f['geometry']).intersection(usa)
        p = f['properties']
        if not g.is_empty and g.area > 0.2 and p.get('FEATURECLA') not in ['Continent', 'Island', 'Peninsula']:
            land_regions.append(feature(g, kind='physical-region', name=p.get('NAME_JA') or p.get('NAME_EN') or p.get('NAME'), source='Natural Earth 5.1.2', classification=p.get('FEATURECLA', ''), area=round(g.area, 4)))
    write_json(OUT / 'base.geojson', fc(base))
    write_json(OUT / 'land.geojson', fc(land_regions))
    write_json(OUT / 'labels.json', labels)

    cdl_file = VENDOR / 'cdl-2023-sampled-2km.tif'
    compressed = VENDOR / 'cdl-2023-sampled-2km.tif.gz'
    if not cdl_file.exists() and compressed.exists():
        cdl_file.write_bytes(gzip.decompress(compressed.read_bytes()))
    params = {
        'f': 'json', 'bbox': '-2600000,100000,2600000,3400000', 'bboxSR': '5070', 'imageSR': '5070',
        'size': '2600,1650', 'format': 'tiff', 'pixelType': 'U8', 'interpolation': 'RSP_NearestNeighbor',
        'noData': '0', 'adjustAspectRatio': 'false',
        'mosaicRule': json.dumps({'mosaicMethod': 'esriMosaicLockRaster', 'lockRasterIds': [38]}),
        'renderingRule': json.dumps({'rasterFunction': 'None'}),
    }
    export_url = CDL + '/exportImage?' + urllib.parse.urlencode(params)
    if not cdl_file.exists():
        selection = json_get(CDL + '/query?where=Year%3D2023&outFields=OBJECTID,Name,Year&returnGeometry=false&f=json')
        assert selection['features'][0]['attributes'] == {'OBJECTID': 38, 'Name': '2023_30m_cdls', 'Year': 2023}
        response = json_get(export_url)
        assert 'href' in response, response
        write_json(cache / 'cdl-export-response.json', response)
        download(response['href'], cdl_file)
    if not compressed.exists():
        compressed.write_bytes(gzip.compress(cdl_file.read_bytes(), compresslevel=9, mtime=0))
    with rasterio.open(cdl_file) as src:
        assert src.count == 1 and src.crs.to_epsg() == 5070, src.profile
        assert src.width == 2600 and src.height == 1650, src.profile
        array, affine = src.read(1), src.transform
        print('CDL classes', np.unique(array).tolist(), flush=True)
    crops = []
    crop_shapes = {}
    for cid, name, codes, color, threshold in CROPS:
        density = gaussian_filter(np.isin(array, codes).astype('float32'), sigma=6, truncate=3)
        mask = density >= threshold
        polygons = []
        for geo, value in shapes(mask.astype('uint8'), mask=mask, transform=affine):
            g = shape(geo)
            if value and g.area >= 150_000_000:
                # Smooth the contour only after measurement-derived thresholding.
                g = g.buffer(4000).buffer(-4000).simplify(1500, preserve_topology=True)
                g = transform(WGS84.transform, g).intersection(usa).difference(lake_union)
                polygons.extend(parts(g))
        result = unary_union(polygons)
        assert not result.is_empty, cid
        crop_shapes[cid] = result
        crops.append(feature(result, id=cid, name=name, color=color, source='USDA NASS CDL 2023', method='sampled-and-generalized', year=2023, threshold=threshold))
        print(cid, 'parts', len(parts(result)), 'area-degrees', round(result.area, 2), flush=True)
    overlap = crop_shapes['corn'].intersection(crop_shapes['soybean'])
    if not overlap.is_empty:
        crops.append(feature(overlap, id='corn-soybean', name='とうもろこし・大豆', color='#c7ba62', source='USDA NASS CDL 2023', method='overlap-of-generalized-regions', year=2023))
    write_json(OUT / 'agriculture.geojson', fc(crops))
    crop_labels=[]
    for f in crops:
        p=f['properties']
        ordered=sorted(parts(shape(f['geometry'])),key=lambda g:g.area,reverse=True)
        for i,g in enumerate(ordered[:3]):
            if i>0 and g.area<0.6: continue
            pt=g.representative_point()
            crop_labels.append({'id':p['id']+'-'+str(i),'name':p['name'],'cropId':p['id'],'color':p['color'],'lng':round(pt.x,5),'lat':round(pt.y,5),'kind':'crop','priority':0 if p['id']=='corn-soybean' else 1})
    write_json(OUT / 'crop-labels.json',crop_labels)

    relief_zip = args.relief_zip or download('https://naturalearth.s3.amazonaws.com/50m_raster/NE1_50M_SR.zip', cache / 'NE1_50M_SR.zip')
    with zipfile.ZipFile(relief_zip) as z:
        tif_name = next(n for n in z.namelist() if n.lower().endswith('.tif'))
        terrain_file = cache / 'NE1_50M_SR.tif'
        if not terrain_file.exists():
            terrain_file.write_bytes(z.read(tif_name))
    bounds = transform_bounds(4326, 3857, *BBOX)
    width = 1800
    height = round(width * (bounds[3] - bounds[1]) / (bounds[2] - bounds[0]))
    target = from_bounds(*bounds, width, height)
    rgb = np.zeros((3, height, width), dtype='uint8')
    with rasterio.open(terrain_file) as src:
        for band in range(3):
            reproject(rasterio.band(src, band + 1), rgb[band], src_transform=src.transform, src_crs=src.crs, dst_transform=target, dst_crs=3857, resampling=Resampling.bilinear)
    # Neutral, evidence-bearing relief: preserve luminance variation, mute land-cover hue.
    rgb = np.moveaxis(rgb, 0, 2).astype('float32')
    gray = rgb.mean(axis=2)
    paper = np.array([245, 241, 220], dtype='float32')
    relief = np.clip(paper - (255-gray[..., None]) * 0.62, 0, 255).astype('uint8')
    land_mask = rasterize([(mapping(transform(MERCATOR.transform, shape(f['geometry']))), 1) for f in base if f['properties']['kind']=='land'], out_shape=(height,width), transform=target, dtype='uint8')
    relief[land_mask == 0] = [193, 225, 237]
    Image.fromarray(relief).save(OUT / 'relief.webp', quality=88)

    def xy(coords):
        return [((MERCATOR.transform(lng,lat)[0]-bounds[0])/(bounds[2]-bounds[0])*width, (bounds[3]-MERCATOR.transform(lng,lat)[1])/(bounds[3]-bounds[1])*height) for lng,lat,*_ in coords]
    def draw_geometries(draw, geom, fill=None, line=None, stroke=1):
        typ=geom['type']; coords=geom['coordinates']
        if typ=='Polygon':
            if fill: draw.polygon(xy(coords[0]), fill=fill)
            if line: draw.line(xy(coords[0]), fill=line, width=stroke)
        elif typ=='MultiPolygon':
            for c in coords: draw_geometries(draw, {'type':'Polygon','coordinates':c},fill,line,stroke)
        elif typ=='LineString': draw.line(xy(coords), fill=line, width=stroke)
        elif typ=='MultiLineString':
            for c in coords: draw.line(xy(c), fill=line, width=stroke)
    for field in ['agriculture', 'land']:
        im = Image.fromarray(relief).convert('RGBA')
        layer = Image.new('RGBA',im.size)
        draw = ImageDraw.Draw(layer)
        if field=='agriculture':
            for f in crops:
                if f['properties']['id']=='corn-soybean': continue
                color=f['properties']['color']; rgba=tuple(bytes.fromhex(color[1:]))
                # Rasterize polygons including their holes (no painted lakes or excluded areas).
                mask=rasterize([(mapping(transform(MERCATOR.transform,shape(f['geometry']))),1)],out_shape=(height,width),transform=target,dtype='uint8')
                fillim=Image.new('RGBA',im.size,rgba+(145,))
                layer.alpha_composite(Image.composite(fillim,Image.new('RGBA',im.size),Image.fromarray(mask*255)))
            mask=rasterize([(mapping(transform(MERCATOR.transform,overlap)),1)],out_shape=(height,width),transform=target,dtype='uint8')
            yy,xx=np.indices((height,width))
            stripe=((xx+yy)%14<3)&(mask==1)
            stripe_rgba=np.zeros((height,width,4),dtype='uint8')
            stripe_rgba[stripe]=[165,139,40,130]
            layer.alpha_composite(Image.fromarray(stripe_rgba))
        im=Image.alpha_composite(im,layer)
        draw=ImageDraw.Draw(im)
        for f in base:
            k=f['properties']['kind']
            if k=='state': draw_geometries(draw,f['geometry'],line=(142,155,149,255))
            if k=='river': draw_geometries(draw,f['geometry'],line=(78,145,174,220),stroke=2)
            if k=='lake': draw_geometries(draw,f['geometry'],fill=(165,210,230,255),line=(78,145,174,230))
        font_path=cache/'NotoSansCJKjp-Regular.otf'
        if not font_path.exists():
            download('https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf',font_path)
        physical=[{'name':'ロッキー山脈','lng':-111,'lat':43.2,'kind':'physical'}, {'name':'グレートプレーンズ','lng':-102.4,'lat':39.8,'kind':'physical'}, {'name':'アパラチア山脈','lng':-80.8,'lat':37.4,'kind':'physical'}, {'name':'五大湖','lng':-83.8,'lat':45.1,'kind':'water'}, {'name':'ミシシッピ川','lng':-90.7,'lat':33.1,'kind':'water'}]
        occupied=[]
        for item in (crop_labels if field=='agriculture' else [])+physical+labels:
            font=ImageFont.truetype(str(font_path),24 if item['kind']=='crop' else 21 if item['kind']!='state' else 16)
            x,y=xy([(item['lng'],item['lat'])])[0]
            bb=draw.textbbox((x,y),item['name'],font=font,anchor='mm')
            if any(bb[0]<b[2]+6 and bb[2]>b[0]-6 and bb[1]<b[3]+5 and bb[3]>b[1]-5 for b in occupied):continue
            color=(35,92,119,255) if item['kind']=='water' else (79,64,40,255) if item['kind']=='crop' else (61,80,77,255)
            draw.text((x,y),item['name'],font=font,anchor='mm',fill=color,stroke_width=2,stroke_fill=(249,247,228,220))
            occupied.append(bb)
        im.convert('RGB').save(OUT / (field+'-fallback.webp'),quality=88)
    manifest={
        'schemaVersion':1, 'version':'3.0.0', 'coverage':'米国本土（アラスカ・ハワイを除く）', 'contextCoverage':'周辺のカナダ・メキシコ等は地形・水系のみ',
        'bounds':BBOX, 'fitBounds':[[-125.6,24],[-66,49.7]], 'crs':'EPSG:4326 (GeoJSON); EPSG:3857 (display/relief)',
        'reliefCoordinates':[[BBOX[0],BBOX[3]],[BBOX[2],BBOX[3]],[BBOX[2],BBOX[1]],[BBOX[0],BBOX[1]]],
        'agriculture': {'source':CDL,'year':2023,'selection':{'OBJECTID':38,'Name':'2023_30m_cdls','Year':2023},'inputSha256':hashlib.sha256(cdl_file.read_bytes()).hexdigest(),'exportUrl':export_url,'sampling':'2,000m regular grid, nearest neighbour sample from the service. Not a complete area aggregate.','generalization':'Gaussian sigma 12km, truncation 36km; crop-specific sample-density contours; remove components under 150km²; 4km morphological smoothing; 1.5km simplification; clip to US land and exclude lakes.','crops':[{'id':c[0],'codes':c[2],'threshold':c[4]} for c in CROPS],'warning':'栽培がまとまる場所の学習用概略。実際の農地境界・生産量・面積シェアではない。閾値未満の小さな産地は省略。2km間引きのため誤差があり、精密な集計には使えない。'},
        'sources':[
            {'id':'natural-earth','title':'Natural Earth vector 5.1.2','url':'https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2','license':'Public domain','scale':'1:50m physical and countries; existing 1:110m US states','method':'Region clip; river simplification 0.012 degrees; five-decimal coordinates. Land regions are cartographic landforms, not soil data.'},
            {'id':'relief','title':'Natural Earth I shaded relief 3.2.0','url':'https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-1/','download':'https://naturalearth.s3.amazonaws.com/50m_raster/NE1_50M_SR.zip','license':'Public domain','method':'Reproject raster to Web Mercator; clip bounds; 1800-pixel width; mute color while retaining source relief. No synthetic terrain.'},
            {'id':'cdl','title':'USDA NASS Cropland Data Layer 2023','url':'https://www.nass.usda.gov/Research_and_Science/Cropland/sarsfaqs2.php','license':'Public domain US government data','distribution':CDL,'method':'See agriculture processing record. Remote-sensing classification, not reported crop production.'}
        ],
        'files':{}
    }
    for f in sorted(OUT.iterdir()):
        if f.name!='manifest.json': manifest['files'][f.name]={'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
    for name in names: manifest['sources'][0].setdefault('inputHashes',{})[name]=hashlib.sha256((cache/(name+'.geojson')).read_bytes()).hexdigest()
    manifest['sources'][1]['inputSha256']=hashlib.sha256(relief_zip.read_bytes()).hexdigest()
    write_json(OUT/'manifest.json',manifest)
    print('Output',json.dumps(manifest['files'],indent=2),flush=True)

if __name__=='__main__': main()
