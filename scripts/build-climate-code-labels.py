"""Derive label anchors from the published class grid (no network requests).

Preparation only: Python, numpy, scipy, Pillow. Each anchor/alternative is the
centre of a pixel in the named class and the same connected region. No category
interpolation or hand-entered coordinates. Run --check to validate committed data.
"""
import gzip
import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas/nature-v1'
OUTPUT = ROOT / 'src/data/atlas/climate-code-labels.json'
grid = np.asarray(Image.open(ASSETS / 'climate-classes.png'))[:, :, 0]
height, width = grid.shape
manifest = json.loads((ASSETS / 'manifest.json').read_text())
west, south, east, north = manifest['climate']['gridBounds3857']
legend = json.loads((ASSETS / 'climate-legend.json').read_text())


def coordinate(row, col):
    x = west + (col + .5) / width * (east - west)
    y = north - (row + .5) / height * (north - south)
    return [round(x / 6378137 * 180 / math.pi, 6),
            round((2 * math.atan(math.exp(y / 6378137)) - math.pi / 2) * 180 / math.pi, 6)]


def pixel(point):
    lng, lat = point
    x = lng * math.pi / 180 * 6378137
    y = math.log(math.tan(math.pi / 4 + lat * math.pi / 360)) * 6378137
    return int((north - y) / (north - south) * height), int((x - west) / (east - west) * width)


def build():
    entries = []
    for item in legend:
        regions, count = ndimage.label(grid == item['id'])
        areas = np.bincount(regions.ravel()); areas[0] = 0
        slices = ndimage.find_objects(regions)
        for rank, region in enumerate(np.argsort(-areas)[:6]):
            area = int(areas[region])
            if not area or (rank and area < 600):
                continue
            ys, xs = slices[region - 1]
            mask = regions[ys, xs] == region
            depth = ndimage.distance_transform_edt(np.pad(mask, 1))[1:-1, 1:-1]
            available = depth.copy()
            yy, xx = np.indices(mask.shape)
            # Repeat broad regions, while keeping candidate and DOM counts fixed.
            for repeat in range(min(4, max(1, area // 100000))):
                row, col = np.unravel_index(available.argmax(), available.shape)
                if available[row, col] <= 0:
                    break
                candidates = [(int(row), int(col))]
                alt = np.where((yy-row)**2+(xx-col)**2 <= 180**2, depth, 0)
                for _ in range(7):
                    r, c = candidates[-1]
                    alt[(yy-r)**2+(xx-c)**2 < 35**2] = 0
                    r, c = np.unravel_index(alt.argmax(), alt.shape)
                    if alt[r, c] < max(1, depth[row, col] * .3):
                        break
                    candidates.append((int(r), int(c)))
                absolute = [(r+ys.start, c+xs.start) for r, c in candidates]
                # Tiny mountain/coastal regions are exposed as the map is enlarged.
                zoom = 0 if area >= 6000 or (item['code'] in ['Am', 'Aw'] and rank == 0) else 4 if area >= 600 else 5.5 if area >= 30 else 8
                entries.append(dict(id=f"{item['code']}-{region}-{repeat}", code=item['code'],
                    gridId=item['id'], gridPixel=list(absolute[0]), area=area,
                    minZoom=zoom, priority=rank*10+repeat,
                    coordinate=coordinate(*absolute[0]),
                    alternatives=[coordinate(*p) for p in absolute[1:]]))
                available[(yy-row)**2+(xx-col)**2 < 400**2] = 0
    return sorted(entries, key=lambda e: (e['minZoom'], e['priority'], -e['area'], e['id']))


def validate(entries):
    assert len(entries) <= 120
    assert {e['code'] for e in entries} == {e['code'] for e in legend}
    for item in legend:
        regions, _ = ndimage.label(grid == item['id'])
        for entry in (e for e in entries if e['code'] == item['code']):
            row, col = pixel(entry['coordinate'])
            assert [row, col] == entry['gridPixel']
            region = regions[row, col]
            assert region and grid[row, col] == entry['gridId'] == item['id']
            for point in entry['alternatives']:
                assert regions[pixel(point)] == region, entry['id']
    assert len(gzip.compress(json.dumps(entries).encode())) < 30000


if '--check' in sys.argv:
    entries = json.loads(OUTPUT.read_text())
else:
    entries = build()
    OUTPUT.write_text(json.dumps(entries, ensure_ascii=False, separators=(',', ':'))+'\n')
validate(entries)
print(f"Validated {len(entries)} fixed code labels, {len(gzip.compress(OUTPUT.read_bytes()))} gzip bytes; grid sha256 {hashlib.sha256((ASSETS / 'climate-classes.png').read_bytes()).hexdigest()}")
