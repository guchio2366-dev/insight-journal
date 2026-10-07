"""Reproducible display summaries of the existing, pinned Africa model grids.

No network, interpolation, missing-value filling or modification of source assets.
Run: python3 scripts/prepare-africa-agriculture-overview.py
"""
from pathlib import Path
import gzip
import hashlib
import json
import math
import platform

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas'
OUT = ASSETS / 'africa-agriculture-overview-v1'
BOUNDS = [-27, -36, 64, 39]
WIDTH, HEIGHT, SCALE = 1092, 900, 12
COLS, ROWS = WIDTH // SCALE, HEIGHT // SCALE
RADIUS_KM = 6371.0088
MIN_COVERAGE, QUANTILE = 0.5, 0.75
KEYS = [('crops', name + '-harvested') for name in ['maize', 'rice', 'wheat', 'cassava']] + [('livestock', name) for name in ['cattle', 'goats', 'sheep']]
LABELS = {'maize': 'トウモロコシ', 'rice': '米', 'wheat': '小麦', 'cassava': 'キャッサバ', 'cattle': '牛', 'goats': '山羊', 'sheep': '羊'}
COLORS = {'maize': '#c59320', 'rice': '#287daa', 'wheat': '#8b64aa', 'cassava': '#268365', 'cattle': '#98513e', 'goats': '#aa6b28', 'sheep': '#50698c'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def aggregate(values):
    return values.reshape(ROWS, SCALE, COLS, SCALE).sum(axis=(1, 3))


def land_mask(geography):
    """Same country-polygon centre inclusion used in the source packaging."""
    land = np.zeros((HEIGHT, WIDTH), dtype=bool)
    for feature in geography['features']:
        geometry = feature['geometry']
        polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
        for polygon in polygons:
            part = np.zeros_like(land)
            for ring in polygon:
                first = max(0, math.floor((39 - max(p[1] for p in ring)) * SCALE))
                last = min(HEIGHT - 1, math.ceil((39 - min(p[1] for p in ring)) * SCALE))
                for row in range(first, last + 1):
                    latitude = 39 - (row + 0.5) / SCALE
                    crosses = []
                    for a, b in zip(ring, ring[1:] + ring[:1]):
                        if (a[1] <= latitude < b[1]) or (b[1] <= latitude < a[1]):
                            crosses.append(a[0] + (latitude - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
                    crosses.sort()
                    if len(crosses) % 2:
                        raise ValueError('Unpaired country polygon intersection')
                    for left, right in zip(crosses[::2], crosses[1::2]):
                        lo = max(0, math.ceil((left + 27) * SCALE - 0.5))
                        hi = min(WIDTH, math.ceil((right + 27) * SCALE - 0.5))
                        part[row, lo:hi] ^= True
            land |= part
    return land


def anchors(values, selected, maximum):
    """Representative labels, never additional distribution observations.

    Rank each selected cell by the sum of the *same commodity's* selected
    intensities within four degrees. Greedily keep locations >= 22 degrees
    apart for crop labels and 14 degrees for livestock symbols.
    apart. Every anchor remains at an actual selected summary-cell centre.
    """
    candidates = []
    for row, col in np.argwhere(selected):
        r0, r1, c0, c1 = max(0, row - 4), min(ROWS, row + 5), max(0, col - 4), min(COLS, col + 5)
        score = float(np.where(selected[r0:r1, c0:c1], values[r0:r1, c0:c1], 0).sum())
        candidates.append((score, int(row), int(col)))
    chosen = []
    for score, row, col in sorted(candidates, key=lambda x: (-x[0], x[1], x[2])):
        if all(math.hypot(row - other['row'], col - other['col']) >= (22 if maximum == 2 else 14) for other in chosen):
            chosen.append({'row': row, 'col': col, 'lon': -27 + col + 0.5, 'lat': 39 - row - 0.5})
        if len(chosen) == maximum:
            break
    return chosen


def main():
    boundary = ROOT / 'src/data/atlas/africa-geography.json'
    land = land_mask(json.loads(boundary.read_text()))
    latitude_edges = np.deg2rad(39 - np.arange(HEIGHT + 1) / SCALE)
    row_area = RADIUS_KM ** 2 * math.pi / (180 * SCALE) * (np.sin(latitude_edges[:-1]) - np.sin(latitude_edges[1:]))
    area = np.broadcast_to(row_area[:, None], (HEIGHT, WIDTH))
    land_area = aggregate(area * land)
    layers = {}
    for family, name in KEYS:
        base = ASSETS / ('africa-' + family + '-v1')
        original = json.loads((base / 'manifest.json').read_text())['layers'][name]
        grid_path = base / original['grid']
        values = np.frombuffer(gzip.decompress(grid_path.read_bytes()), dtype='<f4').reshape(HEIGHT, WIDTH)
        valid = land & np.isfinite(values) & (values >= 0) & (values != original['noData'])
        valid_area = aggregate(area * valid)
        numerator = aggregate(np.where(valid, values * area if family == 'livestock' else values, 0))
        intensity = np.divide(numerator, valid_area, out=np.zeros_like(valid_area), where=valid_area > 0)
        coverage = np.divide(valid_area, land_area, out=np.zeros_like(valid_area), where=land_area > 0)
        eligible = (coverage >= MIN_COVERAGE) & (intensity > 0)
        threshold = float(np.quantile(intensity[eligible], QUANTILE, method='linear'))
        selected = eligible & (intensity >= threshold)
        key = ('crop-' if family == 'crops' else 'livestock-') + name
        commodity = name.removesuffix('-harvested')
        layers[key] = {
            'label': LABELS[commodity], 'color': COLORS[commodity], 'kind': 'crop' if family == 'crops' else 'livestock',
            'sourceManifest': f'../africa-{family}-v1/manifest.json', 'sourceLayer': name,
            'sourceGrid': f'../africa-{family}-v1/{original["grid"]}', 'sourceGridSha256': sha(grid_path),
            'sourceUrl': original['sourceUrl'], 'sourceLabel': original['sourceLabel'], 'period': original['period'],
            'unit': 'ha/km²（収穫面積／有効セル面積）' if family == 'crops' else '頭/km²（有効面積加重平均）',
            'threshold': threshold, 'thresholdQuantile': QUANTILE,
            'positiveEligibleCells': int(eligible.sum()), 'selectedCells': int(selected.sum()),
            'cells': [[int(row), int(col), round(float(intensity[row, col]), 6), round(float(coverage[row, col]), 6)] for row, col in np.argwhere(selected)],
            'anchors': anchors(intensity, selected, 2 if family == 'crops' else 3),
            'nativeValidCells': int(valid.sum()), 'nativeZeroCells': int((valid & (values == 0)).sum()),
            'nativeMissingLandCells': int((land & ~valid).sum()),
        }
        print(json.dumps({key: {k: layers[key][k] for k in ['threshold', 'unit', 'selectedCells', 'anchors']}}, ensure_ascii=False))
    manifest = {
        'schemaVersion': 1, 'bounds': BOUNDS, 'width': COLS, 'height': ROWS, 'resolutionDegrees': 1,
        'layers': layers, 'sourceBoundary': 'src/data/atlas/africa-geography.json', 'sourceBoundarySha256': sha(boundary),
        'method': '元の5分角セルを緯度・経度1°の表示セルに集約。作物は収穫面積haの合計を有効セルの球面面積km²の合計で割り、家畜は頭/km²を有効セル面積で加重平均する。品目ごとに、陸地面積の50%以上に有効値がある正値の集約セルを対象とし、75%分位以上を抽出する。分位は対象の集約セル数に基づく（面積加重の分位ではない）。0は有効値、欠測は分子・分母から除く。色は品目を表し、色の濃さや面積は生産量の順位を表さない。',
        'display': '作物の重なる集約セルは、同じ幅の別々の色帯で示す。帯の位置・幅は植え付け位置や面積比を表さない。国境で表示をクリップする。家畜記号は同一種の抽出域を要約する位置で、牧場の所在地や頭数を表さない。品目ラベル・記号のアンカーは抽出セル中心だけから選ぶ。選択輪郭はこの抽出形に一致する。',
        'limitations': ['1°は一覧のための集約単位で、農地や牧場の境界ではない。集約セル内には元格子の0や欠測を含む場合がある。地点照会では元格子の値・0・欠測を保持する。', '収穫面積には同じ土地での複数回の収穫を含む。ha/km²は作物被覆率ではない。', '品目別の相対的な集中を示す閾値で、他品目との優劣、国別順位、全生産量・公式統計・所得・栄養価・地表の被覆率を表さない。', '抽出されない場所を生産なしとは扱わない。原データの国境セルはセル全体の元値を保持しており、国別合計には使わない。'],
        'processing': {'generator': 'scripts/prepare-africa-agriculture-overview.py', 'generatorSha256': sha(Path(__file__)), 'python': platform.python_version(), 'numpy': np.__version__, 'earthRadiusKm': RADIUS_KM, 'minimumValidLandAreaFraction': MIN_COVERAGE, 'quantileMethod': 'numpy linear; unweighted eligible positive summary cells', 'inputResampling': 'none', 'sourceAssetsModified': False, 'labelPlacement': 'selected-cell local-intensity score within ±4 degrees; greedy minimum 22-degree crop / 14-degree livestock spacing; anchors are selected summary-cell centres'},
    }
    OUT.mkdir(exist_ok=True)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main()
