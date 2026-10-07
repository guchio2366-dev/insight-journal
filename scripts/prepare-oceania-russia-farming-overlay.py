#!/usr/bin/env python3
"""Derive display-only farming textures from saved native grids; no downloads.

The original Float32 grids, quantities, zero and missing cells remain untouched.
A four-pixel texture cell keeps positive, zero and missing patterns distinct.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LIVESTOCK_COLORS = ['a7cbd9', '78adc4', '548ca9', '376d91', '225375', '143d5c']
CELL = 4


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(region: str) -> None:
    out = ROOT / f'public/assets/atlas/{region}-farming-overlay-v1'
    out.mkdir(parents=True, exist_ok=True)
    records = []
    inputs = {}
    for kind in ['crops', 'livestock']:
        directory = ROOT / f'public/assets/atlas/{region}-{kind}-v1'
        manifest_path = directory / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        inputs[str(manifest_path.relative_to(ROOT))] = digest(manifest_path)
        assert manifest['year'] == 2020
        assert manifest['source']['license'] == 'CC BY 4.0'
        assert manifest['lookup']['noData'] == -1 and manifest['lookup']['validZero'] == 0
        for layer in manifest['layers']:
            path = directory / layer['grid']
            inputs[str(path.relative_to(ROOT))] = digest(path)
            width, height = layer['width'], layer['height']
            values = np.frombuffer(gzip.decompress(path.read_bytes()), dtype='<f4').reshape(height, width)
            assert np.isfinite(values).all() and ((values >= 0) | (values == -1)).all()
            positive, zero, missing = values > 0, values == 0, values == -1
            classes = np.searchsorted(layer['breaks'], values, side='right')
            rgba = np.zeros((height * CELL, width * CELL, 4), dtype=np.uint8)
            if kind == 'livestock':
                palette = np.array([list(bytes.fromhex(c)) + [255] for c in LIVESTOCK_COLORS], dtype=np.uint8)
                for offset in range(CELL):
                    tile = rgba[offset::CELL, offset::CELL]
                    tile[positive] = palette[classes[positive]]
                    opposite = rgba[(CELL - 1 - offset)::CELL, offset::CELL]
                    opposite[missing] = [121, 126, 139, 150]
                rgba[2::CELL, 2::CELL][zero] = [89, 114, 132, 170]
                name = layer['id'] + '-texture.png'
                counts = {'positive': int(positive.sum()), 'zero': int(zero.sum()), 'missing': int(missing.sum())}
                # Every source cell has the documented, independent status pattern.
                assert np.array_equal((rgba[0::CELL, 0::CELL, 3] == 255), positive)
                assert np.array_equal((rgba[0::CELL, 3::CELL, 3] == 150), missing)
                assert np.array_equal((rgba[2::CELL, 2::CELL, 3] == 170), zero)
            else:
                # Draw only positive-cell outer edges; do not interpolate across gaps.
                color = list(bytes.fromhex(layer['colors'][-1])) + [255]
                for axis, side in [(0, -1), (0, 1), (1, -1), (1, 1)]:
                    adjacent = np.roll(positive, side, axis=axis)
                    if axis == 0:
                        adjacent[0 if side == 1 else -1, :] = False
                    else:
                        adjacent[:, 0 if side == 1 else -1] = False
                    edge = positive & ~adjacent
                    for offset in range(CELL):
                        if axis == 0:
                            rgba[(0 if side == 1 else CELL - 1)::CELL, offset::CELL][edge] = color
                        else:
                            rgba[offset::CELL, (0 if side == 1 else CELL - 1)::CELL][edge] = color
                name = layer['id'] + '-outline.png'
                assert not rgba[0::CELL, 0::CELL, 3][~positive].any()
                counts = {'positive': int(positive.sum()), 'zero': int(zero.sum()), 'missing': int(missing.sum())}
            Image.fromarray(rgba).save(out / name, optimize=True)
            records.append({'id': layer['id'], 'kind': 'livestock' if kind == 'livestock' else 'crop',
                            'image': name, 'width': width, 'height': height, 'displayCellPixels': CELL,
                            'boundsUnwrapped': layer.get('boundsUnwrapped', layer.get('bounds4326Unwrapped')),
                            'unit': layer['unit'], 'year': 2020, 'license': 'CC BY 4.0',
                            'breaks': layer['breaks'], 'colors': LIVESTOCK_COLORS if kind == 'livestock' else layer['colors'],
                            'sourceGrid': str(path.relative_to(ROOT)), 'sourceCounts': counts})
    record = {'schemaVersion': 1, 'region': region, 'year': 2020, 'generator': Path(__file__).name,
              'inputs': inputs, 'layers': records,
              'method': 'Display textures only. Native values and geographic cell bounds are unchanged. Positive livestock cells have forward diagonals colored by the original density breaks; valid zero has a dot; missing has an opposite diagonal. Crop outlines follow only the outer edges of positive native cells. No aggregation, interpolation, national totals or cross-unit addition.',
              'limitations': ['Texture strokes and outlines indicate model-cell distributions, not actual farm boundaries or individual animals.', 'At overview scale, source cells are smaller than screen pixels; selecting a product restores its source quantity colors while the other distribution stays visible.', 'Available products are not a validated national top-ten ranking.'],
              'files': {p.name: {'bytes': p.stat().st_size, 'sha256': digest(p)} for p in sorted(out.glob('*.png'))}}
    (out / 'manifest.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'region': region, 'layers': [l['id'] for l in records], 'files': record['files']}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--region', choices=['oceania', 'russia'], required=True)
    prepare(parser.parse_args().region)
