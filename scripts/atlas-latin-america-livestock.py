#!/usr/bin/env python3
"""Render GLW4 2020 modelled cattle, pig and chicken density for Latin America.

Requirements: numpy, Pillow, numcodecs==0.16.5, shapely==2.1.2.
No credentials or paid services. Assets retain head/km2, not animals per cell.
"""
from __future__ import annotations

import argparse
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import sys
from urllib.request import urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cache', type=Path)
parser.add_argument('--dependencies', type=Path)
args = parser.parse_args()
if args.dependencies:
    sys.path.insert(0, str(args.dependencies))

import numpy as np
from PIL import Image
from numcodecs import Blosc
from shapely import contains_xy
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
CACHE = args.cache or ROOT.parent / 'latin-livestock-cache'
OUT = ROOT / 'public/assets/atlas/latin-america-livestock-v1'
BASE = 'https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/glw4-2020.zarr/'
CATALOGUE = 'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/'
FAO = 'https://data.fao.org/catalog/dataset/9d1e149b-d63f-4213-978b-317a8eb42d02'
STEP = 1 / 12
BOUNDS = [-93, -56, -33, 28]
BREAKS = [1, 10, 50, 200, 1000]
COLORS = ['#fee8c8', '#fdbb84', '#fc8d59', '#e34a33', '#b30000']
SPECIES = {'cattle': '牛', 'pig': '豚', 'chicken': '鶏'}
# Validated CGIAR object snapshot, retrieved 2026-09-25. Fail closed on changes.
PINNED_SHA256 = {
    'zarr.json': '60849b62074ea823af210c0fe6beafa36e14de2b5c61b880557d468f023dc5e3',
    'cattle/c/0/0': '33583a1b7edd2a1d688b2d37a14fa8d1ccd5f6e7a35dfac74040870d28c2b40e',
    'cattle/c/0/1': 'ca35610c8ab047976bf6bbfda0792b87a2228e3f685fb82309cea912bf0c44ed',
    'cattle/c/1/0': '41d2352de6a352392b8424c69d90698ac6e2f25d0dd59936227d75bb5343e37e',
    'cattle/c/1/1': 'd2d2afeacc61aeda1ecdc47d5418958822c5fc22fe490a89999f7f3b9b89201d',
    'pig/c/0/0': 'b2579ca35c43dd0a7ed26a933f0efac6a3f8ee439ce45c789e3a4b0e8922c751',
    'pig/c/0/1': 'fa748d03e0eab99250e1a936f7a2b4f40a56137e8f1998661a7b2da48d0eaaa5',
    'pig/c/1/0': '79358587e02af71a72d576751bd9ac04b480ab020abb7aa74380a2d967f2ebcf',
    'pig/c/1/1': 'dc401bbf7ef04fd57393ca32c6e1b8b5614971376820f29619df9875f47e2e3b',
    'chicken/c/0/0': 'bd1d26813d81a3868d0066973700e88559ee08592552bfa748bebafcc68e1da3',
    'chicken/c/0/1': 'f15a87cd85bfb0d2e9ad94a307d157f285bec510ad69893d601a25e3aea86f90',
    'chicken/c/1/0': 'f475d5204bc11ae1ba84b5b01b3a5a61376b70eda7355ba0d0a765bbea6e4003',
    'chicken/c/1/1': 'ac6bb2e7de106ce14663203db0f70fe8ae22df9e5c5bd92591fe3d73c99ed2a3',
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def dump(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')


def get(key):
    target = CACHE / key.replace('/', '__')
    if not target.exists():
        with urlopen(BASE + key, timeout=45) as response:
            target.write_bytes(response.read())
    raw = target.read_bytes()
    sha = digest(raw)
    expected = PINNED_SHA256.get(key)
    if expected:
        assert sha == expected, f'Upstream content changed: {key}'
    return raw, {'url': BASE + key, 'sha256': sha, 'bytes': len(raw)}


def valid_runs(mask):
    padded = np.r_[False, mask.ravel(), False].astype(np.int8)
    starts = np.flatnonzero(np.diff(padded) == 1)
    ends = np.flatnonzero(np.diff(padded) == -1)
    return [[int(start), int(end - start)] for start, end in zip(starts, ends)]


def mercator(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def render(grid, path):
    west, south, east, north = BOUNDS
    height, width = grid.shape
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for lower, color in zip(BREAKS, COLORS):
        rgb = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))
        rgba[np.isfinite(grid) & (grid >= lower)] = (*rgb, 230)
    output_width = 1200
    top, bottom = mercator(north), mercator(south)
    output_height = round(output_width * (top - bottom) / math.radians(east - west))
    m = top - (np.arange(output_height) + .5) / output_height * (top - bottom)
    lat = np.degrees(2 * np.arctan(np.exp(m)) - np.pi / 2)
    rows = np.clip(np.floor((north - lat) / STEP).astype(int), 0, height - 1)
    cols = np.clip(np.floor((np.arange(output_width) + .5) / output_width * width).astype(int), 0, width - 1)
    rendered = rgba[rows[:, None], cols[None, :]]
    Image.fromarray(rendered).save(path, optimize=True)
    # Preserve pointwise density; no bilinear interpolation or pixel-area sum.
    assert np.all(np.isin(rendered[:, :, 3], [0, 230]))
    return [output_width, output_height]


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    sources = {}
    raw, sources['zarr.json'] = get('zarr.json')
    meta = json.loads(raw)
    assert meta['attributes']['title'] == 'GLW4 2020 livestock density'
    arrays = meta['consolidated_metadata']['metadata']
    west, south, east, north = BOUNDS
    x0, x1 = round((west + 180) / STEP), round((east + 180) / STEP)
    y0, y1 = round((90 - north) / STEP), round((90 - south) / STEP)
    height, width = y1 - y0, x1 - x0
    longitudes = west + (np.arange(width) + .5) * STEP
    latitudes = north - (np.arange(height) + .5) * STEP
    xs, ys = np.meshgrid(longitudes, latitudes)
    mask_path = ROOT / 'src/data/atlas/regional-countries.json'
    features = json.loads(mask_path.read_text(encoding='utf-8'))['features']
    masks, mask = {}, np.zeros((height, width), dtype=bool)
    for feature in features:
        p = feature['properties']
        if p['code'] == 'MEX' or not (p['region'] == 'South America' or p['subregion'] in ['Central America', 'Caribbean']):
            continue
        cm = contains_xy(shape(feature['geometry']), xs, ys)
        masks[p['code']] = cm
        mask |= cm
    # Spherical area per 5-minute cell, radius IUGG mean Earth 6371.0088 km.
    top = np.radians(latitudes + STEP / 2)
    bottom = np.radians(latitudes - STEP / 2)
    row_areas = 6371.0088 ** 2 * math.radians(STEP) * (np.sin(top) - np.sin(bottom))
    areas = np.broadcast_to(row_areas[:, None], (height, width))
    layers, checks = [], []
    for species, label in SPECIES.items():
        a = arrays[species]
        assert a['shape'] == [2160, 4320] and a['dimension_names'] == ['y', 'x']
        assert a['data_type'] == 'float32' and a['fill_value'] == 'NaN'
        assert a['attributes']['units'] == 'head/km2'
        assert a['attributes']['proj:code'] == 'EPSG:4326'
        assert a['chunk_grid']['configuration']['chunk_shape'] == [1080, 1080]
        assert [codec['name'] for codec in a['codecs']] == ['bytes', 'blosc']
        assert a['codecs'][0]['configuration']['endian'] == 'little'
        assert np.allclose(a['attributes']['spatial:transform'], [STEP, 0, -180, 0, -STEP, 90])
        grid = np.full((height, width), np.nan, dtype=np.float32)
        for cy in range(y0 // 1080, (y1 - 1) // 1080 + 1):
            for cx in range(x0 // 1080, (x1 - 1) // 1080 + 1):
                key = f'{species}/c/{cy}/{cx}'
                raw, sources[key] = get(key)
                decoded = Blosc().decode(raw)
                assert len(decoded) == 1080 * 1080 * 4
                chunk = np.frombuffer(decoded, dtype='<f4').reshape(1080, 1080)
                gx0, gx1 = max(x0, cx * 1080), min(x1, (cx + 1) * 1080)
                gy0, gy1 = max(y0, cy * 1080), min(y1, (cy + 1) * 1080)
                grid[gy0-y0:gy1-y0, gx0-x0:gx1-x0] = chunk[gy0-cy*1080:gy1-cy*1080, gx0-cx*1080:gx1-cx*1080]
        assert np.all(grid[np.isfinite(grid)] >= 0), 'Negative density is not valid'
        grid[~mask] = np.nan
        valid = np.isfinite(grid)
        indices = np.flatnonzero(valid.ravel() & (grid.ravel() > 0))
        cells = [[int(i), round(float(grid.ravel()[i]), 4)] for i in indices]
        query = {'width': width, 'height': height, 'bounds': BOUNDS, 'cellSize': STEP, 'units': 'head/km2', 'year': 2020, 'positiveCells': cells, 'validRuns': valid_runs(valid)}
        dump(OUT / f'{species}-grid.json', query)
        # Classify the exact rounded values used by point queries, including
        # values that round onto a legend boundary (for example 0.99999 -> 1).
        display_grid = np.full(grid.shape, np.nan, dtype=np.float64)
        display_grid[valid] = 0
        display_grid.ravel()[indices] = [value for _, value in cells]
        size = render(display_grid, OUT / f'{species}.png')
        countries = []
        for code, cm in masks.items():
            selected = cm & valid
            area = float(areas[selected].sum())
            estimated_heads = float((grid[selected].astype(np.float64) * areas[selected]).sum())
            countries.append({'code': code, 'value': round(estimated_heads, 2) if area else None, 'validCells': int(selected.sum()), 'validAreaKm2': round(area, 2), 'meanDensity': round(estimated_heads / area, 4) if area else None})
        sample_places = [('Buenos Aires', -58.38, -34.60), ('Brasilia', -47.88, -15.79), ('Santa Catarina', -50.33, -27.81), ('Guatemala', -90.51, 14.63), ('Havana', -82.37, 23.11)]
        samples = []
        for name, lon, lat in sample_places:
            row, col = int(math.floor((north-lat)/STEP)), int(math.floor((lon-west)/STEP))
            value = float(grid[row, col])
            samples.append({'place': name, 'longitude': lon, 'latitude': lat, 'gridIndex': row * width + col, 'densityHeadPerKm2': round(value, 4) if math.isfinite(value) else None})
        layer = {'id': species, 'label': label, 'year': 2020, 'units': 'head/km2', 'bounds': BOUNDS, 'coordinates': [[west, north], [east, north], [east, south], [west, south]], 'image': f'{species}.png', 'query': f'{species}-grid.json', 'size': size, 'breaks': BREAKS, 'colors': COLORS, 'countries': countries, 'sourceUrl': a['attributes']['source_url'], 'countryValueUnits': 'estimated head, density multiplied by spherical cell area', 'sampleLocations': samples}
        layer['assets'] = {name: {'sha256': digest((OUT / name).read_bytes()), 'bytes': (OUT / name).stat().st_size} for name in [f'{species}.png', f'{species}-grid.json']}
        layers.append(layer)
        checks.append({'species': species, 'validCells': int(valid.sum()), 'positiveCells': len(cells), 'minimumDensity': round(float(grid[valid].min()), 6), 'maximumDensity': round(float(grid[valid].max()), 6), 'samples': samples})
        print(f'{species}: {len(cells)} positive cells, {int(valid.sum())} valid cells', flush=True)
    method = 'FAO GLW4、2020年基準の家畜密度。5分格子、頭数/km²（鶏は羽/km²）。統計を空間配分したモデル推計で、農場の実測位置ではない。密度1以上を表示。数値は元格子の密度で、面積を掛けた国別集計は球面セル面積と格子中心による概算。小島・海岸の省略があり、公式飼養頭数と異なる。'
    dump(OUT / 'manifest.json', {'schemaVersion': 1, 'layers': layers, 'source': {'title': 'FAO GLW4 2020 livestock density via CGIAR Climate Action Data Hub', 'url': CATALOGUE, 'originalCatalog': FAO, 'license': 'CC-BY-4.0'}, 'method': method})
    dump(OUT / 'provenance.json', {'retrieved': date.today().isoformat(), 'referenceYear': 2020, 'catalogue': CATALOGUE, 'originalCatalog': FAO, 'sources': sources, 'maskSha256': digest(mask_path.read_bytes()), 'license': 'CC-BY-4.0', 'attribution': 'Food and Agriculture Organization of the United Nations (2024), GLW 4: Gridded Livestock Density (Global - 2020 - 10 km). Accessed through CGIAR Climate Action Data Hub. Clipping, Web Mercator nearest-cell visualization and density queries by Insight Journal.', 'queryGrid': {'crs': 'EPSG:4326', 'registration': 'pixel center', 'stepDegrees': STEP, 'roundingDecimals': 4}, 'displayGrid': {'crs': 'EPSG:3857', 'method': 'nearest source cell, density preserved'}, 'countryAggregation': {'earthRadiusKm': 6371.0088, 'method': 'sum density * spherical cell area for grid centers inside Natural Earth country polygons; not official counts'}, 'validation': checks})


if __name__ == '__main__':
    main()
