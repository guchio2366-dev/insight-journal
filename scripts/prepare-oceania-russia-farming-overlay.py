#!/usr/bin/env python3
"""Derive display-only farming textures from saved native grids; no downloads.

The original Float32 grids, quantities, zero and missing cells remain untouched.
Positive density uses quiet classed dots; zero is transparent. Missing has its
own exact mask and is styled separately at the browser's display scale.
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
LIVESTOCK_ALPHAS = [16, 44, 88, 140, 190, 240]
CELL = 4
OCEANIA_COLORS = {
    'wheat': ['edf1e3', 'd7e7b4', 'afd08b', '7fa95c', '4f7e3d', '23582d'],
    'coconut': ['f4edf7', 'dfc8e8', 'c09acd', 'a274b1', '80528e', '623570'],
    'cacao': ['f8ede7', 'eac8b7', 'd4a082', 'b87954', '93542f', '6e391e'],
    'sheep': ['fff3d8', 'f4d7a0', 'deb779', 'c18e4e', 'a3702e', '795119'],
    'cattle': LIVESTOCK_COLORS,
}


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
            colors = OCEANIA_COLORS[layer['id']] if region == 'oceania' else (LIVESTOCK_COLORS if kind == 'livestock' else layer['colors'])
            quantity_name = None
            if region == 'oceania':
                # Exact native classes, separately recolored for product identity.
                # Zero stays white; missing stays transparent over the browser hatch.
                quantity = np.zeros((height, width, 4), dtype=np.uint8)
                quantity[zero] = [246, 245, 235, 255]
                quantity[positive] = np.array([list(bytes.fromhex(c)) + [255] for c in colors], dtype=np.uint8)[classes[positive]]
                quantity_name = layer['id'] + '-quantity.png'
                Image.fromarray(quantity).save(out / quantity_name, optimize=True)
            rgba = np.zeros((height * CELL, width * CELL, 4), dtype=np.uint8)
            mask_name = None
            if kind == 'livestock':
                palette = np.array([list(bytes.fromhex(c)) + [alpha] for c, alpha in zip(colors, LIVESTOCK_ALPHAS)], dtype=np.uint8)
                dot_pixels = [(1, 1), (1, 2), (2, 1), (2, 2)] if region == 'russia' else ([(0, 0), (0, 1), (1, 0), (1, 1)] if layer['id'] == 'sheep' else [(2, 2), (2, 3), (3, 2), (3, 3)])
                for dy, dx in dot_pixels:
                    rgba[dy::CELL, dx::CELL][positive] = palette[classes[positive]]
                mask = np.zeros((height, width, 4), dtype=np.uint8)
                mask[missing] = [255, 255, 255, 255]
                mask_name = layer['id'] + '-missing.png'
                Image.fromarray(mask).save(out / mask_name, optimize=True)
                name = layer['id'] + '-texture.png'
                counts = {'positive': int(positive.sum()), 'zero': int(zero.sum()), 'missing': int(missing.sum())}
                assert np.array_equal(rgba[dot_pixels[0][0]::CELL, dot_pixels[0][1]::CELL, 3] > 0, positive)
                assert not rgba[dot_pixels[0][0]::CELL, dot_pixels[0][1]::CELL, 3][zero | missing].any()
                assert np.array_equal(mask[:, :, 3] > 0, missing)
            else:
                # Draw only positive-cell outer edges; do not interpolate across gaps.
                color = list(bytes.fromhex(colors[-1])) + [255]
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
                            'breaks': layer['breaks'], 'colors': colors,
                            **({'quantityImage': quantity_name} if quantity_name else {}),
                            **({'alphas': LIVESTOCK_ALPHAS, 'missingImage': mask_name, 'dotPixels': dot_pixels} if kind == 'livestock' else {}),
                            'sourceGrid': str(path.relative_to(ROOT)), 'sourceCounts': counts})
    record = {'schemaVersion': 1, 'region': region, 'year': 2020, 'generator': Path(__file__).name,
              'inputs': inputs, 'layers': records,
              'method': 'Display assets only. Native values and geographic cell bounds are unchanged. Positive livestock cells have classed product-colored dots with fixed size and increasing class opacity using the original density breaks. Valid zero is transparent. Missing has a separate exact native-cell mask, drawn as a faint neutral hatch in the browser. Crop outlines follow only the outer edges of positive native cells. No aggregation, interpolation, national totals or cross-unit addition.' + (' Oceania quantity images recolor the original native classes per product. White is valid zero and transparency is missing. Sheep and cattle dots occupy separate subcell positions, without changing their source density classes.' if region == 'oceania' else ''),
              'limitations': ['Texture strokes and outlines indicate model-cell distributions, not actual farm boundaries or individual animals.', 'At overview scale, source cells are smaller than screen pixels; selecting a product restores its source quantity colors while the other distribution stays visible.', 'Available products are not a validated national top-ten ranking.'],
              'files': {p.name: {'bytes': p.stat().st_size, 'sha256': digest(p)} for p in sorted(out.glob('*.png'))}}
    (out / 'manifest.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'region': region, 'layers': [l['id'] for l in records], 'files': record['files']}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--region', choices=['oceania', 'russia'], required=True)
    prepare(parser.parse_args().region)
