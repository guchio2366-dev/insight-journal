"""Simplify 3DEP lines, publishing only national contours and preserving details.

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
DETAIL = ROOT / 'data/derived/nature-v1/contours-detail'
CACHE = Path(os.environ.get('ATLAS_NATURE_TMP','/tmp/atlas-nature-v1'))/'unpackaged-contours'
CACHE.mkdir(parents=True, exist_ok=True)
forward = Transformer.from_crs(4326, 5070, always_xy=True).transform
inverse = Transformer.from_crs(5070, 4326, always_xy=True).transform

def rounded(value):
    if isinstance(value, (list, tuple)): return [rounded(x) for x in value]
    return round(value, 4)

def package(relative, tolerance, target_root, cache_group):
    source = CACHE / cache_group / relative
    if (target_root / relative).exists():
        source.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(target_root / relative, source)
    data = json.loads(source.read_text())
    for feature in data['features']:
        geometry = transform(inverse, transform(forward, shape(feature['geometry'])).simplify(tolerance))
        feature['geometry'] = dict(type=geometry.geom_type, coordinates=rounded(mapping(geometry)['coordinates']))
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    target = target_root / (relative + '.gz')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    if (target_root / relative).exists(): (target_root / relative).unlink()
    return len(raw), target.stat().st_size

index = json.loads((DETAIL / 'contour-tiles.json').read_text())
print('National', package('contours.geojson', 1200, OUT, 'public'), flush=True)
for tile in index:
    relative = tile['file'].removesuffix('.gz')
    _, tile['bytes'] = package(relative, 500 if tile['intervalM'] == 250 else 200, DETAIL, 'detail')
    tile['file'] = relative + '.gz'
(DETAIL / 'contour-tiles.json').write_text(json.dumps(index, separators=(',', ':')))
manifest = json.loads((OUT / 'manifest.json').read_text())
manifest['elevation']['displaySimplificationM'] = {'500': 1200}
manifest['elevation']['compression'] = 'One national gzip file decoded with DecompressionStream; no Range requests'
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
print('Public contour MB', sum(f.stat().st_size for f in OUT.rglob('*.gz')) / 1e6)
print('Preserved detail MB', sum(f.stat().st_size for f in DETAIL.rglob('*.gz')) / 1e6)
