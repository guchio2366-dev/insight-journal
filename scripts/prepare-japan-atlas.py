"""Extract the Japan preview from checked-in assets; no downloads.

Requires shapely, numpy and Pillow. Prefecture geometry is clipped to the detailed national coast.
No statistical values, dates or suppression statuses are changed.
"""
from pathlib import Path
import gzip, hashlib, json, math
import numpy as np
from PIL import Image
from shapely import contains_xy
from shapely.geometry import shape, mapping

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas'
OUT = ASSETS / 'japan-v1'
OUT.mkdir(exist_ok=True)
inputs = ['asia-population-v1/east-asia.geography.json',
          'asia-industry-v1/east-asia.json', 'asia-industry-v1/manifest.json']
read = lambda name: json.loads((ASSETS / name).read_text())
geography = read(inputs[0])
japan = next(f for f in geography['features'] if f['properties']['code'] == 'JPN')
land = shape(japan['geometry'])
industry = read(inputs[1])
admin = sorted([a for a in industry['admin'] if a['country'] == 'JPN'], key=lambda a: a['id'])
assert len(admin) == 47 and sum(a['series']['jp-00'][0]['value'] for a in admin) == 381654010
features = []
for f in industry['geometry']['features']:
    if f['properties']['country'] != 'JPN': continue
    clipped = shape(f['geometry']).intersection(land)
    if clipped.geom_type == 'GeometryCollection':
        from shapely.ops import unary_union
        clipped = unary_union([p for p in clipped.geoms if p.geom_type in ['Polygon', 'MultiPolygon']])
    assert not clipped.is_empty and clipped.difference(land).area < 1e-9
    features.append({**f, 'geometry': mapping(clipped)})
topics = [t for t in read(inputs[2])['regions']['east-asia']['topics'] if t.get('country') == 'JPN']
def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
write('geography.json', {'type':'FeatureCollection','features':[japan]})
write('industry.json', {'admin': admin, 'geometry': {'type': 'FeatureCollection', 'features': features}, 'topics': topics})
# GHSL's existing 5 km aggregate is unmasked. Crop on the existing pixel edges,
# then apply the same detailed national coast, without resampling or filling.
population = read('asia-population-v1/manifest.json')
record = population['regions']['east-asia']
inputs += ['asia-population-v1/manifest.json', 'asia-population-v1/east-asia.density.gz']
values = np.frombuffer(gzip.decompress((ASSETS/inputs[-1]).read_bytes()), dtype='<f4').reshape(record['height'], record['width'])
west, south, east, north = record['bounds3857']
dx, dy = (east-west)/record['width'], (north-south)/record['height']
mercator = lambda lon, lat: (6378137*math.radians(lon), 6378137*math.log(math.tan(math.pi/4+math.radians(lat)/2)))
x0, y0 = mercator(122.5,23.8); x1, y1 = mercator(146.3,46)
c0,c1 = math.floor((x0-west)/dx), math.ceil((x1-west)/dx)
r0,r1 = math.floor((north-y1)/dy), math.ceil((north-y0)/dy)
cropped = values[r0:r1,c0:c1].copy()
xs = west+(np.arange(c0,c1)+.5)*dx; ys = north-(np.arange(r0,r1)+.5)*dy
lon = np.degrees(xs/6378137); lat = np.degrees(2*np.arctan(np.exp(ys/6378137))-math.pi/2)
mask = contains_xy(land, lon[None,:], lat[:,None])
cropped[~mask] = -200
colors = np.array([list(bytes.fromhex(c))+[255] for c in population['colors']],dtype=np.uint8)
rgba = colors[np.searchsorted(population['breaks'],cropped,side='right')]
rgba[cropped<=0] = 0
Image.fromarray(rgba).save(OUT/'population.png',optimize=True)
(OUT/'population.density.gz').write_bytes(gzip.compress(cropped.astype('<f4').tobytes(),mtime=0))
assert np.array_equal(cropped[mask],values[r0:r1,c0:c1][mask])
inverse = lambda x,y: [math.degrees(x/6378137),math.degrees(2*math.atan(math.exp(y/6378137))-math.pi/2)]
nw = inverse(west+c0*dx,north-r0*dy); se = inverse(west+c1*dx,north-r1*dy)
write('population.json', {
    'width': c1-c0, 'height': r1-r0, 'bounds3857': [west+c0*dx,north-r1*dy,west+c1*dx,north-r0*dy],
    'imageCoordinates': [nw,[se[0],nw[1]],se,[nw[0],se[1]]],
    'image': 'population.png', 'grid': 'population.density.gz', 'sourceCellKm': 5,
    'year': 2020, 'breaks': population['breaks'], 'colors': population['colors'],
    'cities': [c for c in record['cities'] if c['country']=='JPN'],
    'method': 'Existing GHSL 2020 5 km source aggregation. Cropped at original Web Mercator pixel edges, no resampling. Detailed Japan coast mask at pixel centres. Inland values are unchanged, offshore cells -200.',
    'validation': {'inlandValuesUnchanged': True, 'landPixels': int(mask.sum()), 'missingLandPixels': int((mask & (cropped<0)).sum()), 'positiveLandPixels':int((mask & (cropped>0)).sum())},
})
write('manifest.json', {
    'schemaVersion': 1, 'scope': 'Japan preview', 'bounds': [122.5, 23.8, 146.3, 46],
    'inputs': [{'path': 'public/assets/atlas/' + p, 'sha256': hashlib.sha256((ASSETS/p).read_bytes()).hexdigest()} for p in inputs],
    'geography': 'Natural Earth 1:10m v5.1.2, previously simplified by 0.002 degrees. Public domain. Not a legal boundary statement.',
    'prefectures': 'Existing Natural Earth prefecture polygons (0.012 degree simplification), intersected with the national geometry. Unassigned coast slivers remain neutral; no values are assigned to fill gaps.',
    'statistics': 'METI 2025 survey: annual shipments 2024, million JPY; employment 2025-06-01. Source observations and statuses unchanged.',
    'files': {n: {'sha256': hashlib.sha256((OUT/n).read_bytes()).hexdigest(), 'bytes': (OUT/n).stat().st_size} for n in ['geography.json', 'industry.json', 'population.json', 'population.png', 'population.density.gz']},
    'limitations': ['Natural Earth omits some very small islands; the map is not a complete inventory of Japanese territory.', 'Climate, elevation, rivers/lakes and prefectural agriculture originals are not present in this checkout. Existing coarse masked rasters are not relabelled as detailed Japan rasters.', 'Population is reused at 5 km source aggregation; city data use GHSL urban centres, not municipal boundaries.'],
})
print('Japan: 47 prefectures, 381654010 million JPY, clipped national coast')
