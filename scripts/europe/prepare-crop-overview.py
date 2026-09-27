"""Make a source-grounded overview from the twelve existing SPAM crop grids."""
from pathlib import Path
import gzip
import hashlib
import json
import math

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/assets/atlas/europe'
DEST = SOURCE / 'crop-overview-v1'
CONFIG = json.loads((ROOT / 'src/data/atlas/europe/crop-overview.json').read_text(encoding='utf-8'))
W, H = 1800, 1502
COLS, ROWS = 1080, 492

sha256 = lambda data: hashlib.sha256(data).hexdigest()
inputs = []
scores = []
strong_masks = []
for crop in CONFIG['crops']:
    file = SOURCE / ('wheat-v1/values.bin.gz' if crop['id'] == 'wheat' else f"farming-v1/{crop['id']}.bin.gz")
    raw = file.read_bytes()
    grid = np.frombuffer(gzip.decompress(raw), dtype='<f4').reshape(ROWS, COLS)
    assert grid.shape == (ROWS, COLS)
    positive = grid[grid > 0]
    assert positive.size > 0, crop['id']
    threshold = float(np.quantile(positive, .75))
    scale = float(np.quantile(positive, .90))
    # Moderately normalize for each crop so small-area specialties remain visible.
    # The ranking is for the visual overview, never a cross-crop area comparison.
    score = np.where(grid > 0, grid / math.sqrt(scale), 0).astype('float32')
    scores.append(score)
    strong_masks.append(grid >= threshold)
    inputs.append({'id': crop['id'], 'path': str(file.relative_to(ROOT)).replace('\\', '/'),
                   'sha256': sha256(raw), 'positiveCells': int(positive.size),
                   'positiveCellP75Ha': round(threshold, 3), 'positiveCellP90Ha': round(scale, 3)})

stack = np.stack(scores)
best = np.argmax(stack, axis=0)
best_score = np.max(stack, axis=0)
stack[best, np.arange(ROWS)[:, None], np.arange(COLS)[None, :]] = 0
second = np.argmax(stack, axis=0)
second_score = np.max(stack, axis=0)
show_second = (second_score >= .65 * best_score) & (second_score > 0)

merc = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
latitudes = np.degrees(2 * np.arctan(np.exp(merc(73) - (np.arange(H) + .5) / H * (merc(73) - merc(32)))) - np.pi / 2)
rows = np.clip(np.floor((73 - latitudes) * 12).astype(int), 0, ROWS - 1)
cols = np.clip(np.floor((np.arange(W) + .5) / W * COLS).astype(int), 0, COLS - 1)
primary = best[np.ix_(rows, cols)]
secondary = second[np.ix_(rows, cols)]
is_secondary = show_second[np.ix_(rows, cols)] & (((np.arange(H)[:, None] + np.arange(W)[None, :]) % 8) < 3)
index = np.where(is_secondary, secondary, primary)
palette = np.array([list(bytes.fromhex(crop['color'][1:])) + [226] for crop in CONFIG['crops']], dtype='uint8')
rgba = palette[index]
strong = np.stack(strong_masks)[best, np.arange(ROWS)[:, None], np.arange(COLS)[None, :]]
rgba[..., 3] = np.where(strong[np.ix_(rows, cols)], 226, 85)
rgba[best_score[np.ix_(rows, cols)] == 0] = [0, 0, 0, 0]
DEST.mkdir(parents=True, exist_ok=True)
image_path = DEST / 'crops.png'
Image.fromarray(rgba, 'RGBA').save(image_path, optimize=True)
manifest = {
    'bounds': [-25, 32, 65, 73], 'width': W, 'height': H,
    'period': 'SPAM 2020 v2r2', 'unit': '収穫面積 ha / 5分角の元格子',
    'method': '12作物の正値格子を表示。各作物の収穫面積をその作物の第90百分位の平方根で割った表示用スコアの上位2品目を選び、第2品目が第1品目の65%以上なら斜線状に併記。選ばれた第1品目がその作物の正値格子の第75百分位未満なら薄色。色や透明度は品目間の面積差を表さない。元格子を最近傍でWeb Mercatorへ投影。データなしと0はこの概況図では無着色で、品目別図で区別する。',
    'inputs': inputs, 'image': {'path': str(image_path.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha256(image_path.read_bytes())},
    'source': 'https://doi.org/10.7910/DVN/SWPENT', 'license': 'IFPRI Dataverse CC BY 4.0',
    'scope': '収録済みの12作物区分のみ。ブドウ・オリーブ単独の格子はこの入力にない。'
}
(DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
regions = [
    ('wheat', 23, 44, 39, 51, False),
    ('barley', -8, 38, 0, 44, False),
    ('maize', 19, 43, 29, 48, False),
    ('rapeseed', 5, 49, 16, 55, False),
    ('sunflower', 25, 43, 35, 50, False),
    ('rice', 6, 42, 14, 47, False),
    ('vegetables', -6, 36, 3, 42, False),
    ('temperatefruit', 0, 43, 13, 49, False),
    ('sugarbeet', 0, 46, 10, 52, True),
    ('potato', 14, 49, 25, 55, True),
    ('soybean', 16, 42, 28, 48, True),
    ('citrus', -7, 35, 4, 40, True),
]
crop_indices = {crop['id']: i for i, crop in enumerate(CONFIG['crops'])}
labels = []
for crop_id, west, south, east, north, detail in regions:
    i = crop_indices[crop_id]
    left, right = max(0, math.floor((west + 25) * 12)), min(COLS, math.ceil((east + 25) * 12))
    top, bottom = max(0, math.floor((73 - north) * 12)), min(ROWS, math.ceil((73 - south) * 12))
    candidates = np.argwhere((best[top:bottom, left:right] == i) & strong_masks[i][top:bottom, left:right])
    assert candidates.size, f'No verified label area for {crop_id}'
    center_row, center_col = (73 - (south + north) / 2) * 12, ((west + east) / 2 + 25) * 12
    absolute_rows, absolute_cols = candidates[:, 0] + top, candidates[:, 1] + left
    distance = ((absolute_rows - center_row) / 12)**2 + ((absolute_cols - center_col) / 12)**2
    j = np.argmin(distance)
    row, col = int(absolute_rows[j]), int(absolute_cols[j])
    crop = CONFIG['crops'][i]
    labels.append({'id': crop_id, 'name': crop['name'], 'coordinate': [round(-25 + (col + .5) / 12, 4), round(73 - (row + .5) / 12, 4)], 'detail': detail})
(ROOT / 'src/data/atlas/europe/crop-overview-labels.json').write_text(json.dumps(labels, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print('crop overview', image_path.stat().st_size, 'bytes', 'source cells', int(np.sum(best_score > 0)))
