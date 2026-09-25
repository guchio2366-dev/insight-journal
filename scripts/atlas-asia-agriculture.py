#!/usr/bin/env python3
"""Build the Asia rice example from a pinned CGIAR MapSPAM 2020 v2r2 shard.

Requirements: numpy, Pillow, numcodecs==0.16.5, shapely==2.1.2.
Only the rice/all/harvested_area shard is read; no account or paid API is used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
from urllib.request import urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cache', type=Path)
parser.add_argument('--dependencies', type=Path, help='Optional directory containing Python dependencies')
args = parser.parse_args()
if args.dependencies:
    sys.path.insert(0, str(args.dependencies))

import numpy as np
from PIL import Image
from numcodecs import Blosc, VLenUTF8, Zstd
from shapely import contains_xy
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
CACHE = args.cache or ROOT.parent / 'asia-agriculture-cache'
OUT = ROOT / 'public/assets/atlas/asia-agriculture-v1'
BASE = 'https://digital-atlas.s3.amazonaws.com/cdh/data/mapspam2020-v2r2/spam2020-v2r2.zarr/'
CATALOGUE = 'https://cgiar-climate-data-hub.github.io/catalog/spam2020/'
FILES = {
    'metadata': ('zarr.json', 'c8f35d14217f959131010c3b93677e69'),
    'rice-all-harvested': ('harvested_area/c/0/1/0/0', '8864fb38a3e1155f613ef8239a4570e1'),
}
REGIONS = {
    'east-asia': {'bounds': [73, 18, 146, 54], 'subregions': ['Eastern Asia']},
    'southeast-asia': {'bounds': [92, -12, 142, 29], 'subregions': ['South-Eastern Asia']},
    'south-central-asia': {'bounds': [46, -1, 98, 56], 'subregions': ['Southern Asia', 'Central Asia']},
}
BREAKS = [1, 10, 100, 1000, 5000]
COLORS = ['#d9f0a3', '#addd8e', '#78c679', '#31a354', '#006837']
STEP = 1 / 12


def dump(path, content):
    path.write_text(json.dumps(content, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')


def get(name, key, expected_md5=None):
    target = CACHE / name
    url = BASE + key
    if not target.exists():
        with urlopen(url, timeout=60) as response:
            target.write_bytes(response.read())
    value = target.read_bytes()
    if expected_md5:
        assert hashlib.md5(value).hexdigest() == expected_md5, f'Source changed: {name}'
    return value, {'url': url, 'sha256': hashlib.sha256(value).hexdigest(), 'bytes': len(value)}


def crc32c(data):
    crc = 0xffffffff
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0x82f63b78 if crc & 1 else 0)
    return crc ^ 0xffffffff


def decode_shard(raw, metadata):
    """Decode the documented v3 sharding layout, validating its CRC32C index."""
    assert metadata['shape'] == [3, 46, 2160, 4320]
    assert metadata['dimension_names'] == ['technology', 'crop', 'y', 'x']
    config = metadata['codecs'][0]['configuration']
    assert metadata['codecs'][0]['name'] == 'sharding_indexed'
    assert config['chunk_shape'] == [1, 1, 90, 90]
    assert config['index_location'] == 'end'
    assert config['codecs'][1]['name'] == 'blosc'
    count = 24 * 48
    index_bytes = raw[-(count * 16 + 4):-4]
    assert crc32c(index_bytes) == int.from_bytes(raw[-4:], 'little'), 'Corrupt shard index'
    index = np.frombuffer(index_bytes, dtype='<u8').reshape(24, 48, 2)
    result = np.full((2160, 4320), np.nan, dtype=np.float32)
    decoder = Blosc()
    for row in range(24):
        for col in range(48):
            start, size = (int(x) for x in index[row, col])
            if start == (2**64 - 1):
                continue
            assert 0 <= start < start + size <= len(raw) - len(index_bytes) - 4
            cell = np.frombuffer(decoder.decode(raw[start:start + size]), dtype='<f4').reshape(90, 90)
            result[row*90:(row+1)*90, col*90:(col+1)*90] = cell
    result[result == -9999] = np.nan
    assert np.all(result[np.isfinite(result)] >= 0), 'Unexpected negative harvested area'
    return result


def runs(mask):
    padded = np.r_[False, mask.ravel(), False].astype(np.int8)
    starts = np.flatnonzero(np.diff(padded) == 1)
    ends = np.flatnonzero(np.diff(padded) == -1)
    return [[int(start), int(end-start)] for start, end in zip(starts, ends)]


def mercator(lat):
    return math.log(math.tan(math.pi/4 + math.radians(lat)/2))


def make_image(grid, bounds, path):
    west, south, east, north = bounds
    h, w = grid.shape
    pixels = np.zeros((h, w, 4), dtype=np.uint8)
    for lower, color in zip(BREAKS, COLORS):
        rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
        pixels[np.isfinite(grid) & (grid >= lower)] = (*rgb, 235)
    # MapLibre image sources interpolate in Web Mercator, not latitude.
    # Nearest-cell resampling preserves the source grid without inventing values.
    width = 1200
    m_north, m_south = mercator(north), mercator(south)
    height = round(width * (m_north - m_south) / math.radians(east - west))
    m_y = m_north - (np.arange(height) + .5) / height * (m_north - m_south)
    latitudes = np.degrees(2*np.arctan(np.exp(m_y)) - np.pi/2)
    rows = np.clip(np.floor((north-latitudes)/STEP).astype(int), 0, h-1)
    cols = np.clip(np.floor((np.arange(width)+.5)/width*w).astype(int), 0, w-1)
    Image.fromarray(pixels[rows[:, None], cols[None, :]], 'RGBA').save(path, optimize=True)
    return [width, height]


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    source_files = {}
    metadata_bytes, source_files['metadata'] = get('zarr-metadata.json', *FILES['metadata'])
    metadata = json.loads(metadata_bytes)['consolidated_metadata']['metadata']
    for name, expected in [('crop', 'rice'), ('technology', 'all')]:
        raw, source_files[name] = get(name + '.bin', name + '/c/0')
        values = VLenUTF8().decode(Zstd().decode(raw))
        assert values[1 if name == 'crop' else 0] == expected
    raw, source_files['rice-all-harvested'] = get('rice-all-harvested.bin', *FILES['rice-all-harvested'])
    world = decode_shard(raw, metadata['harvested_area'])
    assert metadata['harvested_area']['attributes']['units'] == 'ha'
    geometry_path = ROOT / 'src/data/atlas/regional-countries.json'
    features = json.loads(geometry_path.read_text(encoding='utf-8'))['features']
    all_regions = []
    quality = {'worldHarvestedHa': round(float(np.nansum(world, dtype=np.float64)), 2), 'regions': {}}
    for region_id, region in REGIONS.items():
        bounds = region['bounds']
        west, south, east, north = bounds
        x0, x1 = round((west+180)/STEP), round((east+180)/STEP)
        y0, y1 = round((90-north)/STEP), round((90-south)/STEP)
        grid = world[y0:y1, x0:x1].copy()
        height, width = grid.shape
        xs, ys = np.meshgrid(west + (np.arange(width)+.5)*STEP, north-(np.arange(height)+.5)*STEP)
        region_mask = np.zeros(grid.shape, dtype=bool)
        countries = []
        for feature in features:
            p = feature['properties']
            if p['subregion'] not in region['subregions'] or p['code'] == 'IRN':
                continue
            mask = contains_xy(shape(feature['geometry']), xs, ys)
            region_mask |= mask
            finite = mask & np.isfinite(grid)
            positive = finite & (grid >= 1)
            countries.append({'code': p['code'], 'name': p['name'], 'maskCells': int(mask.sum()),
                              'validCells': int(finite.sum()), 'displayCells': int(positive.sum())})
        grid[~region_mask] = np.nan
        finite = np.isfinite(grid)
        rounded = np.round(grid, 2)
        indices = np.flatnonzero(finite.ravel() & (rounded.ravel() > 0))
        cells = [[int(i), round(float(rounded.ravel()[i]), 2)] for i in indices]
        data = {'schemaVersion': 1, 'regionId': region_id, 'bounds': bounds, 'width': width, 'height': height,
                'cellSize': STEP, 'units': 'ha', 'year': 2020, 'order': 'row-major-north-to-south',
                'positiveCells': cells, 'validRuns': runs(finite)}
        query_name = f'{region_id}-rice-grid.json'
        image_name = f'{region_id}-rice.png'
        dump(OUT / query_name, data)
        image_size = make_image(grid, bounds, OUT / image_name)
        root_url = '/assets/atlas/asia-agriculture-v1/'
        output = {'regionId': region_id, 'bounds': bounds, 'format': 'image', 'imageUrl': root_url + image_name,
                  'queryUrl': root_url + query_name, 'imageSize': image_size,
                  'coordinates': [[west,north],[east,north],[east,south],[west,south]],
                  'units': 'ha/5分格子', 'year': 2020, 'crop': 'rice', 'variable': 'harvested_area', 'technology': 'all',
                  'breaks': BREAKS, 'colors': COLORS,
                  'source': {'title': 'IFPRI MapSPAM 2020 v2r2 · CGIAR Climate Action Data Hub',
                             'url': CATALOGUE, 'doi': 'https://doi.org/10.7910/DVN/SWPENT',
                             'license': 'CC-BY-SA-4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/'},
                  'method': '2020年を基準とする米の収穫面積の空間配分モデル。灌漑・天水の合計。5分格子を地域で抽出し、1ha以上を色分け。衛星で直接観測した水田境界ではない。',
                  'countries': countries}
        dump(OUT / f'{region_id}.json', output)
        all_regions.append(output)
        quality['regions'][region_id] = {'gridSize': [width,height], 'validCells': int(finite.sum()),
            'positiveCells': len(cells), 'displayCells': int((finite & (grid >= 1)).sum()),
            'maxHa': round(float(np.nanmax(grid)),2), 'countries': countries,
            'imageBytes': (OUT/image_name).stat().st_size, 'queryBytes': (OUT/query_name).stat().st_size}
        # Numeric decoding and representation checks; zero and missing remain distinct.
        test_values = {int(i): value for i, value in cells}
        for i in np.flatnonzero(finite.ravel())[::97]:
            assert abs(test_values.get(int(i), 0) - float(grid.ravel()[i])) <= .011
        assert sum(count for _,count in data['validRuns']) == int(finite.sum())
        for name in [query_name, image_name]:
            payload = (OUT/name).read_bytes()
            output.setdefault('assets', {})[name] = {'sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload)}
    dump(OUT / 'manifest.json', {'schemaVersion':1, 'regions':all_regions})
    dump(OUT / 'provenance.json', {'generatedOn':'2026-09-25', 'sourceFiles':source_files,
        'maskSha256':hashlib.sha256(geometry_path.read_bytes()).hexdigest(),
        'catalogueUrl':CATALOGUE, 'quality':quality})
    print(json.dumps(quality, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
