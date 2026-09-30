"""Derive the overview and complete selection outlines from published source grids.

No source download, interpolation or invented production regions. Python + numpy/Pillow.
"""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/assets/atlas'
DEST = BASE / 'latin-america-overview-v1'
PRODUCTS = json.loads((ROOT / 'src/data/atlas/latin-america-products.json').read_text(encoding='utf-8'))
DEST.mkdir(parents=True, exist_ok=True)
W, H = 1200, 1942
merc = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
lat = np.degrees(2 * np.arctan(np.exp(merc(28) - (np.arange(H) + .5) / H * (merc(28) - merc(-56)))) - np.pi / 2)
rr = np.clip(np.floor((28 - lat) * 12).astype(int), 0, 1007)
cc = np.clip(np.floor((np.arange(W) + .5) / W * 720).astype(int), 0, 719)
inputs, labels, groups = [], [], {}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for kind, directory in [('crop', 'latin-america-agriculture-v1'), ('livestock', 'latin-america-livestock-v1')]:
    manifest = json.loads((BASE / directory / 'manifest.json').read_text(encoding='utf-8'))
    products = [p for p in PRODUCTS if p['kind'] == kind]
    scores, masks, strong = [], [], []
    for product in products:
        layer = next(l for l in manifest['layers'] if l['id'] == product['id'])
        path = BASE / directory / layer['query']
        g = json.loads(path.read_text(encoding='utf-8'))
        assert g['width'] == 720 and g['height'] == 1008 and g['bounds'] == [-93, -56, -33, 28]
        a = np.zeros(720 * 1008, dtype='float32')
        cells = np.array(g['positiveCells'])
        a[cells[:, 0].astype(int)] = cells[:, 1]
        a = a.reshape(1008, 720)
        shown = a >= 1
        p75, p90 = np.quantile(a[shown], [.75, .90])
        scores.append(np.where(shown, a / math.sqrt(p90), 0))
        masks.append(shown)
        strong.append(a >= p75)
        projected = shown[np.ix_(rr, cc)]
        mask = Image.fromarray((projected * 255).astype('uint8'))
        outer = np.asarray(mask.filter(ImageFilter.MaxFilter(3))) > 0
        inner = np.asarray(mask.filter(ImageFilter.MinFilter(3))) > 0
        rgba = np.zeros((H, W, 4), dtype='uint8')
        rgba[outer & ~projected] = [255, 255, 255, 245]
        rgba[projected & ~inner] = [28, 40, 43, 245]
        outline = DEST / (product['id'] + '-outline.png')
        Image.fromarray(rgba).save(outline, optimize=True)
        inputs.append({'id': product['id'], 'path': str(path.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(path), 'threshold': 1, 'units': g['units'], 'shownCells': int(shown.sum()), 'p75': float(p75), 'p90': float(p90), 'outline': outline.name, 'outlineSha256': sha(outline)})
    stack = np.stack(scores)
    best = stack.argmax(axis=0)
    best_score = stack.max(axis=0)
    stack[best, np.arange(1008)[:, None], np.arange(720)[None, :]] = 0
    second = stack.argmax(axis=0)
    secondary = (stack.max(axis=0) >= .65 * best_score) & (stack.max(axis=0) > 0)
    stripe = ((np.arange(H)[:, None] + np.arange(W)[None, :]) % 8) < 3
    index = np.where(secondary[np.ix_(rr, cc)] & stripe, second[np.ix_(rr, cc)], best[np.ix_(rr, cc)])
    palette = np.array([list(bytes.fromhex(p['color'][1:])) + [220] for p in products], dtype='uint8')
    rgba = palette[index]
    core = np.stack(strong)[best, np.arange(1008)[:, None], np.arange(720)[None, :]]
    rgba[..., 3] = np.where(core[np.ix_(rr, cc)], 225, 95)
    rgba[best_score[np.ix_(rr, cc)] == 0] = [0, 0, 0, 0]
    if kind == 'livestock':
        # Sparse dots reveal the underlying crop colors without additive mixing.
        dots = ((np.arange(H)[:, None] % 7) < 3) & ((np.arange(W)[None, :] % 7) < 3)
        rgba[~dots] = [0, 0, 0, 0]
    image = DEST / (kind + '.png')
    Image.fromarray(rgba).save(image, optimize=True)
    groups[kind] = {'image': image.name, 'sha256': sha(image)}
    for i, product in enumerate(products):
        candidates = np.argwhere((best == i) & strong[i])
        if not len(candidates):
            candidates = np.argwhere(masks[i])
        # One annotation at a real source cell, near the median of its distribution.
        center = np.median(candidates, axis=0)
        r, c = candidates[np.argmin(np.sum((candidates - center) ** 2, axis=1))]
        labels.append({'id': product['id'], 'name': product['name'], 'kind': kind, 'coordinate': [round(-93 + (int(c) + .5) / 12, 5), round(28 - (int(r) + .5) / 12, 5)]})
result = {'bounds': [-93, -56, -33, 28], 'coordinates': [[-93, 28], [-33, 28], [-33, -56], [-93, -56]], 'size': [W, H], 'year': 2020, 'groups': groups, 'inputs': inputs, 'labels': labels,
 'method': '12作物と3家畜を種類別に合成。1ha/格子、1頭羽/km²以上を対象とし、各品目の値を正値の第90百分位の平方根で割った表示用スコア上位2品目を選ぶ。第2品目が第1の65%以上なら縞で併記。第1品目の第75百分位未満は薄色。畜産は点模様。色は数量や面積の比率ではない。選択輪郭は上位2品目への採否にかかわらず、選択品目の表示下限以上の全格子を含む。最近傍投影で平滑化・小領域除外をしない。ゼロ・下限未満・欠測・対象外は概況では無着色で、単品図の地点照会で区別する。',
 'licenses': [{'source': 'MapSPAM 2020 v2r2', 'url': 'https://cgiar-climate-data-hub.github.io/catalog/spam2020/', 'license': 'CC BY-SA 4.0'}, {'source': 'GLW4 2020', 'url': 'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/', 'license': 'CC BY 4.0'}]}
(DEST / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
print('Generated overview, 15 complete outlines, source hashes and labels:', sum(p.stat().st_size for p in DEST.iterdir()), 'bytes')
