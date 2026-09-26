"""Build Asia terrain and hydrography from pinned local source files.

No network access. Requires numpy, rasterio, shapely, contourpy and Pillow.
Example: python scripts/atlas-asia-physical.py --cache /path/to/europe-source-cache
"""
from pathlib import Path
import argparse, gzip, hashlib, json
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling, transform_geom
from rasterio.features import geometry_mask
from rasterio.transform import from_bounds
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
from PIL import Image, ImageDraw
import contourpy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/asia-physical-v1'
BREAKS = [0, 200, 500, 1000, 2000, 3000, 4500]
COLORS = ['b4cfbf', 'd8e2b5', 'e0d5a0', 'cdbc88', 'b09a78', '987d6b', 'b9aaa0', 'eee9e1']
NODATA = -32768
RIVER_NAMES = {'Chang Jiang': '長江', 'Yangtze': '長江', 'Huang He': '黄河', 'Yellow': '黄河', 'Mekong': 'メコン川', 'Ganges': 'ガンジス川', 'Brahmaputra': 'ブラマプトラ川', 'Indus': 'インダス川', 'Irrawaddy': 'エーヤワディー川', 'Salween': 'サルウィン川', 'Amu Darya': 'アムダリヤ川', 'Syr Darya': 'シルダリヤ川', 'Amur': 'アムール川', 'Hong': '紅河', 'Chao Phraya': 'チャオプラヤー川', 'Tarim': 'タリム川'}
RIVER_NAMES.update({'Ayeyarwady':'エーヤワディー川','Irrawaddy Delta':'エーヤワディー川デルタの水路'})

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf8', newline='\n')

def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        while chunk := f.read(1048576): h.update(chunk)
    return h.hexdigest()

def hydrography(cache, region, record, countries):
    # Keep complete within-frame river segments: a river crossing a border is
    # continuous. Context-country water remains context, never a selectable country.
    extent = box(*record['bounds4326'])
    features = []
    for kind in ['rivers', 'lakes']:
        collection = json.loads((cache / (kind + '.json')).read_text(encoding='utf8'))
        for index, feature in enumerate(collection['features']):
            original = shape(feature['geometry'])
            if not original.intersects(extent): continue
            clipped = original.intersection(extent)
            if clipped.is_empty: continue
            expected = ['LineString', 'MultiLineString'] if kind == 'rivers' else ['Polygon', 'MultiPolygon']
            if clipped.geom_type not in expected: continue
            p = feature['properties']
            name = p.get('name_ja') or RIVER_NAMES.get(p.get('name_en')) or RIVER_NAMES.get(p.get('name')) or p.get('name_en') or p.get('name') or '名称未収録'
            codes = [code for code, land in countries.items() if original.intersects(land)]
            # Do not expose unrelated nearby waterways as Asia observations.
            if not codes: continue
            simplified = clipped.simplify(.003, preserve_topology=True)
            features.append({'type': 'Feature', 'id': f'{kind}-{index}', 'properties': {
                'id': f'{kind}-{index}', 'kind': kind, 'name': name,
                'sourceName': p.get('name'), 'sourceEnglishName': p.get('name_en'), 'countries': codes, 'sourceIds': [index],
                'bounds': list(clipped.bounds), 'minZoom': p.get('min_zoom') or 2,
            }, 'geometry': mapping(simplified)})
    # Named main-stem sections (including lake centre lines) share their source
    # English name. Merge only the explicit translated allowlist; never infer a
    # connection from distance, draw a straight connector or merge unnamed water.
    groups = {}
    for f in features:
        p = f['properties']
        key = p['name'] if p['kind'] == 'rivers' and p['sourceEnglishName'] in RIVER_NAMES else f['id']
        groups.setdefault(key, []).append(f)
    features = []
    for sections in groups.values():
        f = sections[0]
        if len(sections) > 1:
            merged = unary_union([shape(s['geometry']) for s in sections])
            f['geometry'] = mapping(merged)
            f['properties'].update(bounds=list(merged.bounds), countries=sorted(set(c for s in sections for c in s['properties']['countries'])), sourceIds=[i for s in sections for i in s['properties']['sourceIds']], sourceName=' / '.join(dict.fromkeys(s['properties']['sourceName'] or '' for s in sections)))
        features.append(f)
    for f in features:
        p = f['properties']
        same_name = [other for other in features if other['properties']['name'] == p['name']]
        if p['name'] == '名称未収録':
            center = shape(f['geometry']).representative_point()
            kind_label = '河川' if p['kind'] == 'rivers' else '湖'
            p['label'] = f'名称未収録の{kind_label}（{center.y:.1f}°, {center.x:.1f}°）'
        elif len(same_name) > 1: p['label'] = f"{p['name']}（資料区間 {same_name.index(f) + 1}）"
        else: p['label'] = p['name']
    write(OUT / (region + '.water.json'), {'type': 'FeatureCollection', 'features': features})
    return [{'id': f['id'], **f['properties']} for f in features]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    cache = args.cache
    source = cache / 'etopo2022-60s.tif'
    climate = json.loads((ROOT / 'public/assets/atlas/asia-climate-v2/manifest.json').read_text(encoding='utf8'))
    boundary = ROOT / 'src/data/atlas/regional-countries.json'
    geography = {f['properties']['code']: f['geometry'] for f in json.loads(boundary.read_text(encoding='utf8'))['features']}
    OUT.mkdir(parents=True, exist_ok=True)
    regions = {}
    with rasterio.open(source) as src:
        assert src.crs.to_epsg() in [4326, 9518] and np.isclose(src.res[0], 1 / 60)
        for region, previous in climate['regions'].items():
            w, h = previous['width'], previous['height']
            transform = from_bounds(*previous['bounds3857'], w, h)
            elevation = np.full((h, w), NODATA, dtype='float32')
            reproject(rasterio.band(src, 1), elevation, src_transform=src.transform,
                src_crs='EPSG:4326', src_nodata=src.nodata,
                dst_transform=transform, dst_crs='EPSG:3857', dst_nodata=NODATA,
                resampling=Resampling.average)
            mask = np.zeros((h, w), dtype=bool)
            coverage = {}
            countries = {}
            for code in previous['countryCoverage']:
                geom = geography[code]
                countries[code] = shape(geom)
                country = geometry_mask([transform_geom('EPSG:4326', 'EPSG:3857', geom)], out_shape=(h, w), transform=transform, invert=True)
                valid = country & np.isfinite(elevation) & (elevation != NODATA)
                values = elevation[valid]
                coverage[code] = {'maskPixels': int(country.sum()), 'validPixels': int(valid.sum()),
                    'displayMinM': int(np.rint(values.min())) if values.size else None,
                    'displayMaxM': int(np.rint(values.max())) if values.size else None}
                mask |= country
            valid = mask & np.isfinite(elevation) & (elevation != NODATA)
            lookup = np.rint(elevation).astype('<i2')
            lookup[~valid] = NODATA
            indices = np.searchsorted(BREAKS, lookup, side='right')
            palette = np.array([list(bytes.fromhex(c)) + [255] for c in COLORS], dtype='uint8')
            rgba = palette[indices]
            rgba[~valid] = 0
            Image.fromarray(rgba).save(OUT / (region + '.terrain.png'), optimize=True)
            # Exact colour/query agreement is validated before compression.
            assert np.array_equal(np.asarray(Image.open(OUT / (region + '.terrain.png'))), rgba)
            (OUT / (region + '.elevation.gz')).write_bytes(gzip.compress(lookup.tobytes(), mtime=0))
            assert np.array_equal(np.frombuffer(gzip.decompress((OUT / (region + '.elevation.gz')).read_bytes()), dtype='<i2').reshape(h, w), lookup)
            contours = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(contours)
            cg = contourpy.contour_generator(x=np.arange(w) + .5, y=np.arange(h) + .5, z=np.ma.array(elevation, mask=~valid))
            counts = {}
            for level in range(500, 8501, 500):
                lines = cg.lines(level)
                counts[str(level)] = len(lines)
                for line in lines:
                    if len(line) > 2: draw.line([tuple(p) for p in line], fill='#806850' if level % 1000 == 0 else '#b4a187', width=1)
            contours.save(OUT / (region + '.contours.png'), optimize=True)
            water = hydrography(cache, region, previous, countries)
            regions[region] = {k: previous[k] for k in ['bounds4326', 'bounds3857', 'width', 'height', 'imageCoordinates', 'pixelSizeMetres3857']}
            regions[region].update(image=region + '.terrain.png', grid=region + '.elevation.gz', contours=region + '.contours.png', water=region + '.water.json',
                countryCoverage=coverage, validPixels=int(valid.sum()), countryMaskOverlapCount=sum(c['validPixels'] for c in coverage.values()) - int(valid.sum()), waterFeatures=water, contourCounts=counts)
            print(region, 'terrain pixels', int(valid.sum()), 'water features', len(water), flush=True)
    write(OUT / 'manifest.json', {
        'schemaVersion': 1, 'version': '1.0.0', 'sourceEdition': 'ETOPO 2022',
        'sourceUrl': 'https://doi.org/10.25921/fd45-gt74',
        'downloadUrl': 'https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif',
        'sourceResolutionDegrees': 1 / 60, 'unit': 'm relative to EGM2008 geoid',
        'sourceSha256': sha(source), 'boundarySha256': sha(boundary),
        'license': 'NOAA ETOPO freely available for private, academic and commercial purposes; Natural Earth public domain',
        'waterSourceUrl': 'https://www.naturalearthdata.com/downloads/50m-physical-vectors/',
        'waterEdition': 'Natural Earth v5.1.2; 1:50m',
        'waterInputs': {kind: {'url': f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_{suffix}.geojson', 'sha256': sha(cache / (kind + '.json'))} for kind, suffix in [('rivers', 'rivers_lake_centerlines'), ('lakes', 'lakes')]},
        'lookup': {'encoding': 'int16-le-gzip', 'noData': NODATA, 'order': 'row-major north-to-south, west-to-east'},
        'breaks': BREAKS, 'colors': COLORS, 'contourIntervalM': 500,
        'method': '60 arc-second ETOPO surface grid, horizontal reprojection by average to the climate-v2 Web Mercator grid. Rounded whole-metre lookup and class image from identical masked values. Generalized country polygons sampled at pixel centres. Contours calculated from the display DEM, not the source-resolution DEM. Water geometry clipped to region bounds and simplified by 0.003 degree with topology preserved. Explicitly allowlisted river sections with a shared source English main-stem name are unioned without adding connectors; source section IDs remain recorded. countryMaskOverlapCount records overlapping generalized boundaries, not a geographic area.',
        'limitations': ['Rounded metres are display precision, not measurement accuracy. Display-cell minima/maxima are not national extrema.', 'Country outlines and coarse coastal source pixels can omit small islands or include bathymetry at coastal land pixels. Negative land heights are retained; do not interpret a single coastal cell as ground-survey elevation.', 'Rivers and lakes are generalized historical source geometry, not present-day extent, discharge, drinking-water supply or water quality. Width is a screen symbol, not river width.', 'Web Mercator pixel counts are not land area.'],
        'regions': regions, 'files': {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(OUT.iterdir()) if p.name != 'manifest.json'},
    })

if __name__ == '__main__': main()
