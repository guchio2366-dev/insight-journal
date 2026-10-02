"""Prepare Africa water vectors from pinned, reusable original geometries.

Natural Earth river lines are clipped to the map frame with segment intersection.
BasinATLAS connected catchments preserve all source members and full geometry.
Only standard-library Python is required; basin unions use the existing Node
polygon-clipping dependency. Acquisition is kept separate in the private cache.
"""
from pathlib import Path
import argparse
import datetime
import gzip
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CACHE = ROOT.parent / 'runtime/data/africa-hydro-working'
OUT = ROOT / 'public/assets/atlas/africa-water-v1'
BBOX = [-27, -36, 64, 39]
NE_FILE = 'ne_50m_rivers_lake_centerlines-v5.1.2.geojson'
NE_SHA = 'f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51'
NE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def write_json(path, value, compressed=False):
    raw = (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8')
    path.write_bytes(gzip.compress(raw, mtime=0) if compressed else raw)


def clipped_segment(a, b):
    """Liang-Barsky clipping; preserves source endpoints inside the frame."""
    x0, y0 = a[:2]
    x1, y1 = b[:2]
    dx, dy = x1 - x0, y1 - y0
    lo, hi = 0.0, 1.0
    for p, q in ((-dx, x0 - BBOX[0]), (dx, BBOX[2] - x0),
                 (-dy, y0 - BBOX[1]), (dy, BBOX[3] - y0)):
        if p == 0:
            if q < 0:
                return None
        else:
            t = q / p
            if p < 0:
                lo = max(lo, t)
            else:
                hi = min(hi, t)
            if lo > hi:
                return None
    if lo == hi:
        return None
    return ([x0, y0] if lo == 0 else [x0 + lo * dx, y0 + lo * dy],
            [x1, y1] if hi == 1 else [x0 + hi * dx, y0 + hi * dy])


def clipped_line(line):
    result, current = [], []
    for a, b in zip(line, line[1:]):
        segment = clipped_segment(a, b)
        if segment is None:
            if len(current) >= 2:
                result.append(current)
            current = []
            continue
        start, end = segment
        if start == end:
            continue
        if current and current[-1] == start:
            if current[-1] != end:
                current.append(end)
        else:
            if len(current) >= 2:
                result.append(current)
            current = [start, end]
    if len(current) >= 2:
        result.append(current)
    return result


def river_data(cache):
    path = cache / NE_FILE
    assert digest(path) == NE_SHA, 'Natural Earth original SHA mismatch'
    source = json.loads(path.read_text(encoding='utf-8'))
    assert source['type'] == 'FeatureCollection'
    features = []
    for index, original in enumerate(source['features']):
        geometry = original['geometry']
        if geometry['type'] == 'LineString':
            lines = [geometry['coordinates']]
        elif geometry['type'] == 'MultiLineString':
            lines = geometry['coordinates']
        else:
            raise ValueError('Unexpected Natural Earth river geometry')
        parts = [part for line in lines for part in clipped_line(line)]
        if not parts:
            continue
        for part in parts:
            assert len(part) >= 2
            for x, y in part:
                assert math.isfinite(x) and math.isfinite(y)
                assert BBOX[0] - 1e-10 <= x <= BBOX[2] + 1e-10
                assert BBOX[1] - 1e-10 <= y <= BBOX[3] + 1e-10
        identifier = f'ne50-river-{index:04d}'
        properties = dict(original.get('properties') or {})
        properties.update(id=identifier, sourceIndex=index, category='river',
                          sourceName=properties.get('name_en') or properties.get('name'),
                          name=properties.get('name_en') or properties.get('name') or '名称未収録の中心線')
        features.append({'type': 'Feature', 'id': identifier, 'properties': properties,
                         'geometry': {'type': 'LineString', 'coordinates': parts[0]} if len(parts) == 1
                         else {'type': 'MultiLineString', 'coordinates': parts}})
    assert features, 'No clipped river geometry'
    return {'type': 'FeatureCollection', 'features': features}, {
        'sourceName': 'Natural Earth 1:50 million rivers and lake centerlines v5.1.2',
        'publisher': 'Natural Earth', 'sourceUrl': NE_URL,
        'period': 'v5.1.2（データ版。地物の観測年ではない）',
        'unit': '河川・湖の中心線', 'license': 'Public domain',
        'licenseUrl': 'https://www.naturalearthdata.com/about/terms-of-use/',
        'sourceSHA256': NE_SHA, 'sourceBytes': path.stat().st_size,
        'sourceFeatureCount': len(source['features']), 'derivedFeatureCount': len(features),
        'sourceCrs': 'EPSG:4326', 'derivedCrs': 'EPSG:4326', 'derivedBounds4326': BBOX,
        'method': '原本の線分を表示範囲 [-27,-36,64,39] で交差計算し、範囲外部分を除去。原本内の分離した線を接続せず、簡略化・平滑化なし。範囲境界の交点のみ補間。',
        'scope': 'アフリカを含む表示枠内の原本中心線。枠内の隣接陸域も含む。',
        'limitations': '1:50,000,000 の一般化された中心線。支流を網羅せず、流量・季節流況・取水可能量・管理境界を表さない。',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=DEFAULT_CACHE)
    parser.add_argument('--basins', type=Path, help='Validated BasinATLAS full connected-catchment FeatureCollection')
    parser.add_argument('--basin-provenance', type=Path)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    rivers, river_source = river_data(args.cache)
    write_json(OUT / 'rivers.geojson', rivers)
    layers = {'rivers': {**river_source, 'file': 'rivers.geojson',
                         'legend': [{'id': 'river', 'label': '河川・湖の中心線', 'color': '#4786a5'}]}}
    sources = {'rivers': river_source}
    if args.basins:
        assert args.basin_provenance, 'Basin provenance is required'
        basins = json.loads(args.basins.read_text(encoding='utf-8'))
        assert basins['type'] == 'FeatureCollection' and basins['features']
        basin_source = json.loads(args.basin_provenance.read_text(encoding='utf-8'))
        write_json(OUT / 'basins.geojson.gz', basins, compressed=True)
        layers['basins'] = {**basin_source, 'file': 'basins.geojson.gz',
                            'legend': [{'id': 'basin', 'label': '接続する集水区の境界', 'color': '#837aa7'}]}
        sources['basins'] = basin_source
    retrieved = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    write_json(OUT / 'hydro-provenance.json', {'retrievedAt': retrieved, 'bounds4326': BBOX, 'sources': sources})
    names = ['rivers.geojson', 'hydro-provenance.json'] + (['basins.geojson.gz'] if args.basins else [])
    files = {name: {'bytes': (OUT / name).stat().st_size, 'sha256': digest(OUT / name)} for name in names}
    manifest = {'version': 1, 'region': 'africa', 'bounds4326': BBOX, 'crs': 'EPSG:4326',
                'retrievedAt': retrieved, 'layers': layers, 'files': files}
    write_json(OUT / 'manifest.json', manifest)
    print(json.dumps({'layers': list(layers), 'riverFeatures': len(rivers['features']),
                      'basinFeatures': len(basins['features']) if args.basins else None,
                      'files': files}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
