"""Derive Central Asia livestock context from the checked-in GLW grids.

Each animal is ranked against its own nonzero Central Asian land cells. The
nonexclusive polygons represent broad/core relative density, not head counts.
"""
from pathlib import Path
import gzip
import json
import math
import numpy as np
from rasterio.features import geometry_mask, shapes
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject, transform_geom
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas'
OUT = ASSETS / 'asia-presentation-v1/central-asia.livestock-areas.json.gz'
CODES = {'KAZ', 'KGZ', 'TJK', 'TKM', 'UZB'}
COLORS = {'cattle': '#8b4943', 'sheep': '#996394', 'goat': '#8c7838'}


def box_mean(array, radius=2):
    result = array.astype('float64')
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (radius, radius)
        summed = np.cumsum(np.pad(result, pad), axis=axis)
        pad[axis] = (1, 0)
        summed = np.pad(summed, pad)
        end, start = [slice(None), slice(None)], [slice(None), slice(None)]
        end[axis], start[axis] = slice(2 * radius + 1, None), slice(None, -(2 * radius + 1))
        result = (summed[tuple(end)] - summed[tuple(start)]) / (2 * radius + 1)
    return result


def main():
    manifest = json.loads((ASSETS / 'asia-farming-v1/manifest.json').read_text())
    layers = [layer for layer in manifest['regions']['south-central-asia']['layers'] if layer['id'] in COLORS]
    geography = json.loads((ASSETS / 'asia-population-v1/south-central-asia.geography.json').read_text())
    countries = [f['geometry'] for f in geography['features'] if f['properties'].get('target') and f['properties'].get('code') in CODES]
    land_shape = unary_union([shape(g) for g in countries])
    bounds = layers[0]['bounds3857']
    width = math.ceil((bounds[2] - bounds[0]) / 12000)
    height = math.ceil((bounds[3] - bounds[1]) / 12000)
    transform = from_bounds(*bounds, width, height)
    land = geometry_mask([transform_geom('EPSG:4326', 'EPSG:3857', g) for g in countries], out_shape=(height, width), transform=transform, invert=True)
    weight = box_mean(land)
    features = []
    for layer in layers:
        original = np.frombuffer(gzip.decompress((ASSETS / 'asia-farming-v1' / layer['grid']).read_bytes()), dtype='<f4').reshape(layer['height'], layer['width'])
        target = np.zeros((height, width), dtype='float32')
        reproject(np.where(np.isfinite(original) & (original > 0), original, 0).astype('float32'), target,
                  src_transform=from_bounds(*layer['bounds3857'], layer['width'], layer['height']), src_crs='EPSG:3857',
                  dst_transform=transform, dst_crs='EPSG:3857', resampling=Resampling.average)
        smoothed = np.divide(box_mean(np.where(land, target, 0)), weight, out=np.zeros_like(weight), where=weight > 0)
        values = np.sort(smoothed[land & (smoothed > 0)])
        score = np.searchsorted(values, smoothed, side='right') / max(1, len(values))
        score[~land | (target < 1) | (smoothed <= 0) | (score < .45)] = 0
        for level, eligible in [('spread', (score > 0) & (score < .85)), ('core', score >= .85)]:
            mask = eligible.astype('uint8')
            polygons = [shape(g) for g, value in shapes(mask, mask=mask == 1, transform=transform) if value == 1]
            if not polygons:
                continue
            geometry = shape(transform_geom('EPSG:3857', 'EPSG:4326', mapping(unary_union(polygons)), precision=5)).buffer(0).intersection(land_shape)
            if geometry.is_empty:
                continue
            features.append({'type': 'Feature', 'geometry': mapping(geometry), 'properties': {'id': layer['id'], 'name': layer['title'], 'kind': 'livestock', 'color': COLORS[layer['id']], 'distribution': level}})
        print(layer['id'], int(np.sum(score > 0)), int(np.sum(score >= .85)))
    output = {'type': 'FeatureCollection', 'features': features}
    OUT.write_bytes(gzip.compress((json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n').encode(), mtime=0))
    print(OUT.relative_to(ROOT), len(features), OUT.stat().st_size)


if __name__ == '__main__':
    main()
