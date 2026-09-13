"""Simplify already generated 3DEP lines for each scale, then gzip static assets.

Run after refine-atlas-nature.py; source GeoJSON remains in the preparation
cache, outside the published site. Shared tile endpoints remain fixed.
"""
import gzip
import json
import shutil
from pathlib import Path
import os
from shapely.geometry import shape, mapping
from shapely.ops import transform
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/nature-v1'
CACHE = Path(os.environ.get('ATLAS_NATURE_TMP','/tmp/atlas-nature-v1'))/'unpackaged-contours'
CACHE.mkdir(parents=True, exist_ok=True)
forward = Transformer.from_crs(4326, 5070, always_xy=True).transform
inverse = Transformer.from_crs(5070, 4326, always_xy=True).transform

def rounded(value):
    if isinstance(value, (list, tuple)): return [rounded(x) for x in value]
    return round(value, 4)

def package(relative, tolerance):
    source = CACHE / relative
    if (OUT / relative).exists():
        source.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(OUT / relative, source)
    data = json.loads(source.read_text())
    for feature in data['features']:
        geometry = transform(inverse, transform(forward, shape(feature['geometry'])).simplify(tolerance))
        feature['geometry'] = dict(type=geometry.geom_type, coordinates=rounded(mapping(geometry)['coordinates']))
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    target = OUT / (relative + '.gz')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    if (OUT / relative).exists(): (OUT / relative).unlink()
    return len(raw), target.stat().st_size

index = json.loads((OUT / 'contour-tiles.json').read_text())
print('National', package('contours.geojson', 1200), flush=True)
for tile in index:
    relative = tile['file'].removesuffix('.gz')
    _, tile['bytes'] = package(relative, 500 if tile['intervalM'] == 250 else 200)
    tile['file'] = relative + '.gz'
(OUT / 'contour-tiles.json').write_text(json.dumps(index, separators=(',', ':')))
manifest = json.loads((OUT / 'manifest.json').read_text())
manifest['elevation']['displaySimplificationM'] = {'500': 1200, '250': 500, '100': 200}
manifest['elevation']['compression'] = 'gzip static files decoded with DecompressionStream; no Range requests'
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
print('Contour assets MB', sum(f.stat().st_size for f in OUT.rglob('*.gz')) / 1e6)
