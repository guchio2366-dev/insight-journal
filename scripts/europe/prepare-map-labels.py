"""Place climate codes only on pixels of that class in the published raster.

The targets spread labels geographically; they are not observations or class
assignments. Every actual anchor (including alternatives) is snapped to an
exact legend color. Run with Python, numpy and Pillow; no network required.
"""
from pathlib import Path
import hashlib, json, math
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'src/data/atlas/europe'
IMAGE = ROOT / 'public/assets/atlas/europe/climate-v1/climate.png'
pixels = np.asarray(Image.open(IMAGE).convert('RGBA'))
height, width = pixels.shape[:2]
legend = json.loads((DATA / 'climate-legend.json').read_text(encoding='utf8'))
merc = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
def project(lon, lat):
    return (lon + 25) / 90 * width, (merc(73) - merc(lat)) / (merc(73) - merc(32)) * height
def coordinate(x, y):
    lat = math.degrees(2 * math.atan(math.exp(merc(73) - (y + .5) / height * (merc(73) - merc(32)))) - math.pi / 2)
    return [round((x + .5) / width * 90 - 25, 6), round(lat, 6)]
rgb = {l['code']: tuple(bytes.fromhex(l['color'][1:])) for l in legend}
targets = [
    ('Cfb', -1, 46, 0), ('Cfb', 7, 54, 0), ('Dfb', 24, 55, 0),
    ('Dfb', 41, 54, 0), ('Dfc', 23, 67, 0), ('Dfc', 45, 65, 0),
    ('Csa', -2, 38, 0), ('Csa', 15, 39, 0), ('Csa', 26, 39, 0),
    ('Csb', -8, 42, 0), ('Cfa', 10, 45, 0), ('Cfa', 23, 45, 0),
    ('BSk', -1, 41, 0), ('BSk', 47, 48, 0), ('Dfa', 35, 48, 0),
    ('ET', 9, 62, 0), ('ET', -18, 65, 0), ('Cfc', -20, 64, 0),
    ('BWh', 10, 33, 0), ('BWk', 56, 44, 0), ('BSh', 7, 35, 0),
    ('Dsa', 39, 39, 0), ('Dsb', 35, 39, 1), ('Dsc', 42, 41, 1),
    ('EF', -17, 64.5, 1),
]
labels = []
for i, (code, lon, lat, detail) in enumerate(targets):
    mask = np.all(pixels[:, :, :3] == rgb[code], axis=2) & (pixels[:, :, 3] > 0)
    ys, xs = np.where(mask)
    tx, ty = project(lon, lat)
    distance = (xs - tx) ** 2 + (ys - ty) ** 2
    order = np.argsort(distance, kind='stable')
    anchors = []
    for index in order:
        x, y = int(xs[index]), int(ys[index])
        if distance[index] > 120 ** 2:
            break
        if any((x-ax)**2 + (y-ay)**2 < 20**2 for ax, ay in anchors):
            continue
        anchors.append((x, y))
        if len(anchors) == 5:
            break
    if not anchors:
        raise ValueError(f'No verified {code} anchor near {lon}, {lat}')
    labels.append(dict(id=f'{code.lower()}-{i}', code=code,
                       coordinate=coordinate(*anchors[0]),
                       alternatives=[coordinate(*a) for a in anchors[1:]], detail=bool(detail)))
city_classes = {}
for city in json.loads((DATA / 'climate-cities.json').read_text(encoding='utf8')):
    x, y = project(*city['coordinates'])
    pixel = pixels[int(y), int(x)]
    code = next((code for code, color in rgb.items() if tuple(pixel[:3]) == color and pixel[3] > 0), None)
    if code:
        city_classes[city['id']] = code
result = dict(source='/assets/atlas/europe/climate-v1/climate.png',
              sha256=hashlib.sha256(IMAGE.read_bytes()).hexdigest(),
              method='Exact raster-color anchors; station classes are raster samples, not classifications calculated from JMA normals.',
              labels=labels, cityClasses=city_classes)
(DATA / 'map-labels.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'{len(labels)} labels, {len(city_classes)} station raster samples')
