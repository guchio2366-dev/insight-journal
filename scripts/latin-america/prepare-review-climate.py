"""Recolor existing class cells; retain their IDs, mask and positions."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/atlas/latin-review-v3'
OUT.mkdir(parents=True, exist_ok=True)
native = ROOT / 'public/assets/atlas/latin-america-climate-v1'
data = json.loads((ROOT / 'src/data/atlas/latin-america/nature.json').read_text())
us = json.loads((ROOT / 'public/assets/atlas/nature-v1/climate-legend.json').read_text())
other = json.loads((ROOT / 'public/assets/atlas/asia-climate-v2/legend.json').read_text())
colors = {c['code']: c['color'] for c in other}
colors.update({c['code']: c['color'] for c in us})
grid = json.loads((native / 'latin-america.grid.json').read_text())
ids = np.asarray(grid['values']).reshape(grid['height'], grid['width'])
original = np.asarray(Image.open(native / 'latin-america.png').convert('RGBA'))
recolored = original.copy()
assert original.shape[:2] == ids.shape
classes, annotations = [], []
west, south, east, north = grid['bounds3857']
for c in data['originalClasses']:
    rgb = tuple(bytes.fromhex(c['color'].removeprefix('#')))
    mask = (ids == c['id']) & (original[:, :, 3] > 0)
    assert np.all(original[mask, :3] == rgb), c['code']
    recolored[mask, :3] = tuple(bytes.fromhex(colors[c['code']].removeprefix('#')))
    classes.append({**c, 'sourceColor': c['color'], 'color': colors[c['code']]})
    components, count = label(mask)
    sizes = np.bincount(components.ravel()); sizes[0] = 0
    for component in np.argsort(sizes)[::-1][:12]:
        if sizes[component] < 12:
            continue
        interior = distance_transform_edt(components == component)
        row, col = np.unravel_index(interior.argmax(), interior.shape)
        x = west + (col + .5) * (east-west) / grid['width']
        y = north - (row + .5) * (north-south) / grid['height']
        lon = x / 6378137 * 180 / np.pi
        lat = (2*np.arctan(np.exp(y/6378137)) - np.pi/2) * 180 / np.pi
        annotations.append({'code': c['code'], 'id': c['id'], 'coordinate': [lon, lat],
                            'sourceCell': [int(col), int(row)], 'componentCells': int(sizes[component])})
assert np.array_equal(original[:, :, 3], recolored[:, :, 3])
assert np.array_equal(ids, np.asarray(grid['values']).reshape(ids.shape))
Image.fromarray(recolored).save(OUT / 'climate-display.png', optimize=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
result = {'classes': classes, 'annotations': annotations,
          'image': '/assets/atlas/latin-review-v3/climate-display.png',
          'source': {'gridSHA256': sha(native/'latin-america.grid.json'),
                     'originalImageSHA256': sha(native/'latin-america.png'),
                     'usPaletteSHA256': sha(ROOT/'public/assets/atlas/nature-v1/climate-legend.json'),
                     'additionalPaletteSHA256': sha(ROOT/'public/assets/atlas/asia-climate-v2/legend.json'),
                     'displayImageSHA256': sha(OUT/'climate-display.png'),
                     'method': 'Same classified source IDs and alpha mask; US palette for shared codes. Cwa/Cwb/Cwc absent in US use the matching Asia/West Asia palette. Label anchors are existing cells inside connected class components; no reclassification.',
                     'period': '1991–2020', 'resolution': 'source 0.1 degree', 'license': 'CC BY 4.0'}}
(OUT/'climate-display.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'classes': len(classes), 'annotationCandidates': len(annotations),
                  'maskUnchanged': True, 'displayImageSHA256': result['source']['displayImageSHA256']}))
