"""Oceania climate detail from pinned 1 km tiles, without a global array.

Requires NumPy, Pillow and Shapely for independent country-centre diagnostics.
The TIFF's LZW bytes are decoded by Pillow as one small 256x256 TIFF strip.
--geometry-dependencies may point to an existing compatible local package path.
Normal site builds use the checked-in outputs and do not run this script.
"""
import argparse
from collections import OrderedDict
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import struct
import sys
import zipfile

import numpy as np
from PIL import Image
from atlas_asia_climate_palette import display_classes, palette_record

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/oceania-climate-v2'
ARCHIVE_SHA256 = 'd37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d'
MEMBER = '1991_2020/koppen_geiger_0p00833333.tif'
MEMBER_SHA256 = 'c4ce842d5c0270f74604c1727b127064f5acb21edb650d8542b4ef2ac9681b14'
WIDTH, HEIGHT, STEP, TILE = 43200, 21600, 1/120, 256
COUNTRIES = ['AUS', 'NZL', 'PNG', 'FJI', 'WSM', 'TON', 'KIR', 'PYF']
KNOWN_PLACES = [
    ('Alice Springs', 'AUS', 133.88, -23.70), ('Perth', 'AUS', 115.86, -31.95),
    ('Sydney', 'AUS', 151.21, -33.87), ('Auckland', 'NZL', 174.76, -36.85),
    ('Port Moresby', 'PNG', 147.18, -9.44), ('Goroka', 'PNG', 145.39, -6.08),
    ('Suva', 'FJI', 178.45, -18.14), ('Apia', 'WSM', -171.77, -13.83),
    ("Nuku'alofa", 'TON', -175.20, -21.14), ('Tarawa', 'KIR', 173.02, 1.45),
    ('Papeete', 'PYF', -149.57, -17.54)
]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def write_json(name, value):
    (OUT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')


def unwrap_ring(ring):
    result = []
    for lon, lat, *unused in ring:
        if result:
            while lon-result[-1][0] > 180:
                lon -= 360
            while lon-result[-1][0] < -180:
                lon += 360
        result.append([lon, lat])
    shift = math.floor((180-sum(p[0] for p in result)/len(result))/360+0.5)*360
    return [[lon+shift, lat] for lon, lat in result]


def unwrap_geometry(geometry):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    result = [[unwrap_ring(ring) for ring in polygon] for polygon in polygons]
    return {'type': geometry['type'], 'coordinates': result[0] if geometry['type'] == 'Polygon' else result}


class BoundedTiledClimate:
    def __init__(self, raw):
        self.raw = raw
        Image.MAX_IMAGE_PIXELS = None
        with Image.open(io.BytesIO(raw)) as image:
            tags = image.tag_v2
            assert image.size == (WIDTH, HEIGHT) and image.mode == 'L'
            assert tuple(tags[33550])[:2] == (STEP, STEP)
            assert tuple(tags[33922])[:6] == (0, 0, 0, -180, 90, 0)
            assert tags[259] == 5 and tags.get(317, 1) == 1
            assert tags[322] == TILE and tags[323] == TILE
            assert tuple(tags[258]) == (8,) and tags.get(277, 1) == 1
            self.offsets = tuple(tags[324])
            self.counts = tuple(tags[325])
        self.tiles_across = math.ceil(WIDTH/TILE)
        assert len(self.offsets) == math.ceil(WIDTH/TILE)*math.ceil(HEIGHT/TILE)
        self.cache = OrderedDict()
        self.decoded = set()
        self.max_cached = 0

    def tile(self, identifier):
        if identifier in self.cache:
            self.cache.move_to_end(identifier)
            return self.cache[identifier]
        offset, count = self.offsets[identifier], self.counts[identifier]
        assert 0 <= offset < offset+count <= len(self.raw)
        compressed = self.raw[offset:offset+count]
        entries = [(256,4,1,TILE), (257,4,1,TILE), (258,3,1,8), (259,3,1,5),
                   (262,3,1,1), (273,4,1,134), (277,3,1,1), (278,4,1,TILE),
                   (279,4,1,len(compressed)), (317,3,1,1)]
        header = b'II'+struct.pack('<HI',42,8)+struct.pack('<H',len(entries))
        header += b''.join(struct.pack('<HHII', *entry) for entry in entries)+struct.pack('<I',0)
        assert len(header) == 134
        with Image.open(io.BytesIO(header+compressed)) as image:
            data = np.asarray(image, dtype=np.uint8).copy()
        assert data.shape == (TILE,TILE) and int(data.max()) <= 30
        self.cache[identifier] = data
        self.decoded.add(identifier)
        while len(self.cache) > 128:
            self.cache.popitem(last=False)
        self.max_cached = max(self.max_cached, len(self.cache))
        return data

    def sample(self, columns, rows):
        assert np.all((columns >= 0) & (columns < WIDTH))
        assert np.all((rows >= 0) & (rows < HEIGHT))
        result = np.empty((len(rows),len(columns)), dtype=np.uint8)
        for tile_row in np.unique(rows//TILE):
            output_rows = np.flatnonzero(rows//TILE == tile_row)
            for tile_col in np.unique(columns//TILE):
                output_cols = np.flatnonzero(columns//TILE == tile_col)
                data = self.tile(int(tile_row)*self.tiles_across+int(tile_col))
                result[np.ix_(output_rows,output_cols)] = data[np.ix_(rows[output_rows]%TILE,columns[output_cols]%TILE)]
        return result

    def point(self, lon, lat):
        column = int(math.floor(((lon+180)%360)/STEP))
        row = int(math.floor((90-lat)/STEP))
        return int(self.sample(np.array([column]),np.array([row]))[0,0]), column, row


def frame_grid(source, bounds, max_edge):
    west, south, east, north = bounds
    span_x, span_y = east-west, north-south
    scale = max(1, max(span_x/STEP,span_y/STEP)/max_edge)
    width = max(1, min(max_edge, math.ceil(span_x/STEP/scale)))
    height = max(1, min(max_edge, math.ceil(span_y/STEP/scale)))
    lons = west+(np.arange(width)+0.5)/width*span_x
    lats = north-(np.arange(height)+0.5)/height*span_y
    columns = np.floor(((lons+180)%360)/STEP).astype(np.int64)
    rows = np.floor((90-lats)/STEP).astype(np.int64)
    return source.sample(columns,rows), lons, lats, columns, rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--geometry-dependencies', type=Path)
    parser.add_argument('--max-edge', type=int, default=800)
    args = parser.parse_args()
    assert 64 <= args.max_edge <= 800
    if args.geometry_dependencies:
        sys.path.insert(0, str(args.geometry_dependencies))
    import shapely
    from shapely import contains_xy
    from shapely.geometry import shape
    assert digest(args.source.read_bytes()) == ARCHIVE_SHA256
    with zipfile.ZipFile(args.source) as archive:
        raw = archive.read(MEMBER)
    assert digest(raw) == MEMBER_SHA256
    source = BoundedTiledClimate(raw)
    geography_path = ROOT/'src/data/atlas/oceania-countries.json'
    geography = json.loads(geography_path.read_text(encoding='utf-8'))
    features = {f['properties']['code']: f for f in geography['features'] if f['properties']['kind'] == 'oceania'}
    geometries = {code: shape(unwrap_geometry(features[code]['geometry'])) for code in COUNTRIES}
    assert all(g.is_valid for g in geometries.values())
    frames = []
    for code in COUNTRIES:
        west, south, east, north = geometries[code].bounds
        padding = max(0.025, min(0.3,max(east-west,north-south)*0.03))
        bounds = [math.floor((west-padding)*1000)/1000, math.floor((south-padding)*1000)/1000,
                  math.ceil((east+padding)*1000)/1000, math.ceil((north+padding)*1000)/1000]
        frames.append({'id':code.lower(), 'country':code, 'bounds':bounds, 'label':features[code]['properties'].get('name',code)})
    # Selected island windows prevent long island chains from disappearing at
    # national-frame scale. These are reading frames, never area boundaries.
    frames.extend([
        {'id':'kir-tarawa','country':'KIR','bounds':[172.75,1.15,173.25,1.85],'label':'タラワ周辺'},
        {'id':'pyf-tahiti','country':'PYF','bounds':[210.10,-18.05,211.05,-17.30],'label':'タヒチ周辺'}
    ])
    classes = display_classes()
    by_id = {record['id']:record for record in classes}
    palette = np.zeros((31,4), dtype=np.uint8)
    for record in classes:
        palette[record['id']] = [*bytes.fromhex(record['color'][1:]),255]
    OUT.mkdir(parents=True,exist_ok=True)
    files, records = {}, {}
    for frame in frames:
        values,lons,lats,columns,rows = frame_grid(source,frame['bounds'],args.max_edge)
        identifier = frame['id']
        image_name,grid_name = identifier+'.png',identifier+'.grid.bin.gz'
        Image.fromarray(palette[values]).save(OUT/image_name,optimize=True)
        (OUT/grid_name).write_bytes(gzip.compress(values.tobytes(),mtime=0))
        reread = np.frombuffer(gzip.decompress((OUT/grid_name).read_bytes()),dtype=np.uint8).reshape(values.shape)
        assert np.array_equal(values,reread)
        assert np.array_equal(np.asarray(Image.open(OUT/image_name)),palette[reread])
        xx,yy = np.meshgrid(lons,lats)
        mask = contains_xy(geometries[frame['country']],xx,yy)
        country_values = values[mask]
        ids,counts = np.unique(country_values,return_counts=True)
        class_counts = [{'id':int(v),'code':by_id[int(v)]['code'],'cells':int(n)} for v,n in zip(ids,counts) if v != 0]
        no_data = int(np.count_nonzero(country_values == 0))
        assert sum(item['cells'] for item in class_counts)+no_data == int(mask.sum())
        height,width = values.shape
        west,south,east,north = frame['bounds']
        records[identifier] = {'id':identifier,'country':frame['country'],'label':frame['label'],
            'boundsUnwrapped':frame['bounds'],'bounds':frame['bounds'],'width':width,'height':height,
            'sourceResolutionDegrees':STEP,'displayResolutionDegrees':[(east-west)/width,(north-south)/height],
            'period':'1991-2020','unit':'Koppen-Geiger categorical class ID','noData':0,
            'image':image_name,'data':grid_name,'actualClassIds':sorted(int(v) for v in np.unique(values) if v),
            'countryCentreCoverage':{'maskCells':int(mask.sum()),'classifiedCells':int(mask.sum())-no_data,'noDataCells':no_data,'classes':class_counts},
            'sourceSampling':{'columnRange':[int(columns.min()),int(columns.max())],'rowRange':[int(rows.min()),int(rows.max())],'dateLineCrossing':bool(np.any(np.diff(columns)<0))}}
        for name in [image_name,grid_name]:
            files[name] = {'bytes':(OUT/name).stat().st_size,'sha256':digest((OUT/name).read_bytes())}
        print(json.dumps({'frame':identifier,'size':[width,height],'coverage':records[identifier]['countryCentreCoverage']},ensure_ascii=False),flush=True)
    anchors = []
    for name,country,lon,lat in KNOWN_PLACES:
        value,col,row = source.point(lon,lat)
        anchors.append({'name':name,'country':country,'longitude':lon,'latitude':lat,'sourceColumn':col,'sourceRow':row,'classId':value,'code':by_id[value]['code'] if value else None})
    write_json('legend.json',classes)
    files['legend.json'] = {'bytes':(OUT/'legend.json').stat().st_size,'sha256':digest((OUT/'legend.json').read_bytes())}
    write_json('manifest.json',{
        'schemaVersion':1,'version':'2.0.0','period':'1991-2020','unit':'Koppen-Geiger categorical class ID',
        'source':{'archiveUrl':'https://ndownloader.figshare.com/files/45057352','archiveSha256':ARCHIVE_SHA256,'member':MEMBER,'memberSha256':MEMBER_SHA256,'crs':'EPSG:4326','resolutionDegrees':STEP,'sourceWidth':WIDTH,'sourceHeight':HEIGHT,'sourceNoData':0,'citation':'https://doi.org/10.1038/s41597-023-02549-6','license':'CC BY 4.0','licenseUrl':'https://www.gloh2o.org/koppen/'},
        'broadView':'../oceania-climate-v1/manifest.json','display':{'projection':'Pacific-centred equirectangular; standard latitude -20; not equal-area','palette':palette_record(),'countryClip':'Use source country geometry for display; diagnostic centre mask does not alter original grid values'},
        'frames':records,'legend':'legend.json','verification':{'knownSourceSamples':anchors,'allPngPixelsMatchGrid':True,'classIdsUnchanged':True,'decodedUniqueSourceTiles':len(source.decoded),'maxCachedSourceTiles':source.max_cached,'tileShape':[TILE,TILE],'maxCachedTileBytes':source.max_cached*TILE*TILE,'globalSourceArrayCreated':False},
        'processing':{'script':'scripts/prepare-oceania-climate-detail.py','scriptSha256':digest(Path(__file__).read_bytes()),'method':'Read source LZW tiles only; nearest source cell at each display pixel centre. No interpolation, class merging, coastal fill, synthetic island values or whole-globe array. PNG and lookup from the same uint8 grid. Country-centre coverage is a display-grid diagnostic, not land area.','geometrySha256':digest(geography_path.read_bytes()),'pythonVersion':sys.version.split()[0],'shapelyVersion':shapely.__version__},
        'limitations':['The 1 km source is sampled to at most 800 pixels per edge; national-frame display resolution can be coarser than the source. Selected local island frames retain source spacing.','Country-centre counts use generalized Natural Earth 1:50m outlines. A narrow island may have no display pixel centre inside its outline.','Class 0 is missing, not a climate zone. Detail views can still contain missing coastal cells.','Climate classes do not measure current weather, elevation, rainfall totals, groundwater quantity or farm production.','Unmasked source windows can contain context countries; preserve their neutral country outline treatment in the UI.'],'files':files})
    print(json.dumps({'frames':len(records),'output':str(OUT),'sourceTileCacheBytesMax':source.max_cached*TILE*TILE,'knownSamples':anchors},ensure_ascii=False),flush=True)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
