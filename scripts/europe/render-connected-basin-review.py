"""Render a review figure, not a product claim of a complete Danube river basin."""
import gzip
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
basins = json.loads((ROOT / 'public/assets/atlas/europe/drainage-v1/basins.json').read_text())
review = json.loads((ROOT / 'data-source/atlas/europe/drainage/connected-basin-review.json').read_text())
target = review['reviews'][0]
assert target['name'] == 'Danube' and target['unitCount'] == 9 and target['sourceNetworkClosed']
river = next(f for f in json.loads((ROOT / 'public/assets/atlas/europe/context-v1/rivers.json').read_text())['features'] if f['properties']['sourceName'] == 'Danube')
assert river['geometry']['type'] == 'LineString' and len(river['geometry']['coordinates']) == 131

WIDTH, HEIGHT = 1800, 1502
values = np.frombuffer(gzip.decompress((ROOT / 'public/assets/atlas/europe/drainage-v1/values.bin.gz').read_bytes()), dtype='<f4').reshape(HEIGHT, WIDTH)
indices = [b['index'] for b in basins if b['MAIN_BAS'] == target['mainBasin']]
highlight = np.isin(values, indices)
base = Image.open(ROOT / 'public/assets/atlas/europe/drainage-v1/drainage.png').convert('RGBA')
wash = Image.new('RGBA', base.size, (255, 255, 255, 135))
base = Image.alpha_composite(base, wash)
paint = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
paint[highlight] = (226, 149, 77, 220)
base = Image.alpha_composite(base, Image.fromarray(paint, 'RGBA'))

def mercator(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

top, bottom = mercator(73), mercator(32)
def pixel(coord):
    lon, lat = coord
    return ((lon + 25) / 90 * WIDTH, (top - mercator(lat)) / (top - bottom) * HEIGHT)

draw = ImageDraw.Draw(base)
line = [pixel(c) for c in river['geometry']['coordinates']]
draw.line(line, fill=(24, 64, 92, 255), width=6, joint='curve')
for point, color in [(line[0], (46, 70, 125, 255)), (line[-1], (23, 79, 96, 255))]:
    x, y = point
    draw.ellipse((x-10, y-10, x+10, y+10), fill=color, outline='white', width=3)

x0, y0 = pixel((7, 52))
x1, y1 = pixel((31, 41))
crop = base.crop((int(x0), int(y0), int(x1), int(y1))).resize((1120, 650), Image.Resampling.LANCZOS)
figure = Image.new('RGB', (1160, 810), '#f8f7f1')
figure.paste(crop.convert('RGB'), (20, 100))
d = ImageDraw.Draw(figure)
font_path = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
title = ImageFont.truetype(font_path, 24)
body = ImageFont.truetype(font_path, 16)
d.text((25, 18), 'ドナウ川：BasinATLASレベル4の接続区画9件（検証図）', font=title, fill='#203d47')
d.text((25, 57), '橙＝MAIN_BASとNEXT_DOWNで同じ出口へつながる表示区画　青＝Natural Earth 50mの既存河道', font=body, fill='#314e5a')
d.text((25, 767), '青線はブラチスラバ付近から河口までの一部。源流からの本流・無欠落の全流域とは呼ばない。', font=body, fill='#6e3d30')
out = ROOT / 'docs/review/europe-2026-10-08/danube-connected-review.png'
figure.save(out, optimize=True)
print(out)
