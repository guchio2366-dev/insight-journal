"""Offline isobands from the retained SPAM 2020 / GLW4 native 5-minute grids.

Run: python3 scripts/prepare-africa-agriculture-distribution.py
No downloads, aggregation, resampling, gap filling, percentile selection or
geometry simplification. Source grids, images and manifests remain unchanged.
"""
from pathlib import Path
import gzip
import hashlib
import json

import contourpy
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets/atlas'
OUT = ASSETS / 'africa-agriculture-distribution-v1'
PART_BYTES = 256 * 1024
LAYERS = [
    ('crops', 'maize-harvested', 'とうもろこし', '#c59320', 'a2aa58a7765fb605ee164132823556bacfc9bedb744fbdbbcc3af991e4123734'),
    ('crops', 'rice-harvested', '稲', '#287daa', 'a31ef621e4fc8877a261ac03ebc36763eccc051025b436fb9ff9db4b2e944d8b'),
    ('crops', 'wheat-harvested', '小麦', '#8b64aa', '921fbca8e30085a1005ca9151285ffbbcb008206f697adee05cd2396d1d212a1'),
    ('crops', 'cassava-harvested', 'キャッサバ', '#268365', '34cb3cd0081c556f4be8c09daa43c3fa061dcdee965c6e8d128d5b4aa01446a6'),
    ('livestock', 'cattle', '牛', '#98513e', '1feea653a905ac08ee3a48613f577a342686e2dbc4fbef3c08fdafe75d0aebba'),
    ('livestock', 'goats', 'ヤギ', '#aa6b28', '0c844be6a8b43b43aee1e8e3cc523640d2fd100836e744394c460262eb932624'),
    ('livestock', 'sheep', '羊', '#50698c', '4224a8aa8e2ef956d9d807864163a9d3a9a879eaadeb876fe0eab47822e3a7f7'),
]


def sha(value):
    return hashlib.sha256(value).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode()


def write_parts(name, data, parts, files):
    """Keep the exact gzip stream while making each deployed object independently uploadable."""
    files[name] = {'bytes': len(data), 'sha256': sha(data)}
    parts[name] = []
    for offset in range(0, len(data), PART_BYTES):
        chunk = data[offset:offset + PART_BYTES]
        part_name = f'{name}.part{len(parts[name]) + 1:03d}'
        (OUT / part_name).write_bytes(chunk)
        parts[name].append({'file': part_name, 'bytes': len(chunk), 'sha256': sha(chunk)})
    (OUT / name).unlink(missing_ok=True)


def points(value):
    # Coordinate rounding only; no change to vertices or their topology.
    return np.round(value, 8).tolist()


def rectangles(mask):
    """Lossless union of equal adjacent row runs; never bridge a false cell."""
    active, result = {}, []
    for row in range(mask.shape[0] + 1):
        spans = []
        if row < mask.shape[0]:
            changes = np.flatnonzero(np.diff(np.r_[False, mask[row], False]))
            spans = [(int(a), int(b)) for a, b in zip(changes[::2], changes[1::2])]
        present = set(spans)
        for span in list(active):
            if span not in present:
                result.append((active.pop(span), row, *span))
        for span in spans:
            active.setdefault(span, row)
    return result


def zero_polygons(mask, west, north, step):
    result = []
    for r0, r1, c0, c1 in rectangles(mask):
        left, right = west + c0 * step, west + c1 * step
        top, bottom = north - r0 * step, north - r1 * step
        result.append([points(np.array([[left, top], [left, bottom], [right, bottom], [right, top], [left, top]]))])
    return result


def main():
    OUT.mkdir(exist_ok=True)
    layers, files, parts = {}, {}, {}
    for family, name, label, category_color, expected in LAYERS:
        source = ASSETS / f'africa-{family}-v1'
        source_manifest_bytes = (source / 'manifest.json').read_bytes()
        manifest = json.loads(source_manifest_bytes)
        original = manifest['layers'][name]
        grid_bytes = (source / original['grid']).read_bytes()
        assert sha(grid_bytes) == expected, 'Source grid changed: ' + name
        assert (original['width'], original['height']) == (1092, 900)
        assert original['bounds'] == [-27, -36, 64, 39]
        assert original['resolutionDegrees'] == 1 / 12
        assert original['noData'] == -1
        values = np.frombuffer(gzip.decompress(grid_bytes), dtype='<f4').reshape(original['height'], original['width'])
        assert np.isfinite(values).all() and ((values >= 0) | (values == -1)).all()
        valid, zero = values >= 0, values == 0
        quad = valid[:-1, :-1] & valid[:-1, 1:] & valid[1:, :-1] & valid[1:, 1:]
        supported = np.zeros_like(valid)
        supported[:-1, :-1] |= quad
        supported[:-1, 1:] |= quad
        supported[1:, :-1] |= quad
        supported[1:, 1:] |= quad
        west, south, east, north = original['bounds']
        step = original['resolutionDegrees']
        generator = contourpy.contour_generator(
            x=west + (np.arange(original['width']) + .5) * step,
            y=north - (np.arange(original['height']) + .5) * step,
            z=np.ma.masked_where(~valid, values), name='serial', corner_mask=False,
            line_type='Separate', fill_type='OuterOffset', quad_as_tri=False, z_interp='Linear',
        )
        features = []
        source_breaks = original['breaks']
        assert source_breaks == ([1, 10, 100, 1000] if family == 'crops' else [1, 10, 50, 100, 250])
        maximum = float(values.max())
        edges = [0, *source_breaks, float(np.nextafter(maximum, np.inf))]
        positive_legend = original.get('positiveLegend') or [row for row in original['legend'] if row['id'] != original['zeroId']]
        assert len(positive_legend) == len(edges) - 1
        for index, (low, high) in enumerate(zip(edges, edges[1:])):
            coords, offsets = generator.filled(low, high)
            polygons = [[points(p[start:end]) for start, end in zip(o, o[1:])] for p, o in zip(coords, offsets)]
            legend = positive_legend[index]
            features.append({
                'type': 'Feature',
                'properties': {'id': f'band-{index}', 'classId': legend['id'], 'kind': 'band', 'lower': low,
                               'upper': high if index < len(edges) - 2 else None, 'color': legend['color'], 'name': legend['label']},
                'geometry': {'type': 'MultiPolygon', 'coordinates': polygons},
            })
        for index, level in enumerate(source_breaks):
            features.append({
                'type': 'Feature',
                'properties': {'id': f'contour-{level}', 'kind': 'contour', 'value': level,
                               'upperClassId': positive_legend[index + 1]['id'], 'name': f'{level:,} {original["unit"]}の等値線'},
                'geometry': {'type': 'MultiLineString', 'coordinates': [points(line) for line in generator.lines(level)]},
            })
        zero_feature = {
            'type': 'Feature',
            'properties': {'id': 'source-zero', 'kind': 'zero', 'classId': original['zeroId'], 'value': 0,
                           'color': original['zeroColor'], 'name': '元格子の有効な0', 'nativeCells': int(zero.sum())},
            'geometry': {'type': 'MultiPolygon', 'coordinates': zero_polygons(zero, west, north, step)},
        }
        features.append(zero_feature)
        file_name = name + '.geojson.gz'
        geometry = gzip.compress(encoded({'type': 'FeatureCollection', 'features': features}), mtime=0)
        write_parts(file_name, geometry, parts, files)
        contours_name = name + '.contours.geojson.gz'
        contours = gzip.compress(encoded({'type': 'FeatureCollection', 'features': [feature for feature in features if feature['properties']['kind'] == 'contour']}), mtime=0)
        write_parts(contours_name, contours, parts, files)
        key = ('crop-' if family == 'crops' else 'livestock-') + name
        quantity = ('収穫面積は元の5分角セル当たりのhaで、セル平均のha/km²や農地被覆率ではありません。複数回の収穫を含みます。'
                    if family == 'crops' else '密度は元の5分角セルの頭/km²です。全頭の実測位置・牧場境界・放牧だけの分布ではありません。')
        scope = f'2020年基準の5分角モデル（南北約9km）を使った分布の概観です。{quantity}滑らかな面や線は格子中心間の線形補間で、農地や牧場の実境界ではありません。欠測や小島の隙間を埋めず、新しい細密観測を加えていません。'
        method = '保存済み5分角格子をそのまま使用。元凡例の全閾値で等値面・等値線を生成し、新しい分位・抽出閾値は置きません。四隅が有効な格子中心間の四角形だけで線形補間します（corner_mask=false）。0超の面と、元セルの厳密な0の領域を別に保存。0領域は隣接する同じ行区間を連結した元セル範囲で、欠測は含みません。元値の再標本化・集約・平滑化・穴埋め・形状の単純化は行いません。'
        keep = ['bounds', 'crs', 'width', 'height', 'resolutionDegrees', 'gridOrder', 'encoding', 'noData', 'unit', 'period',
                'sourceName', 'sourceLabel', 'sourceUrl', 'publisher', 'referenceYear', 'license', 'licenseUrl',
                'sourceSha256', 'sourceFile', 'sourceNotice', 'citation', 'breaks', 'colors', 'zeroId', 'zeroColor', 'legend', 'takeaway', 'description']
        layers[key] = {**{k: original[k] for k in keep if k in original},
            'label': label, 'title': f'{label}｜' + ('収穫面積の分布' if family == 'crops' else '飼養密度の分布'),
            'categoryColor': category_color, 'file': file_name, 'contoursFile': contours_name, 'vectorBands': True,
            'sourceManifest': f'../africa-{family}-v1/manifest.json', 'sourceManifestSha256': sha(source_manifest_bytes),
            'sourceLayer': name, 'grid': f'../africa-{family}-v1/{original["grid"]}', 'sourceGridSha256': sha(grid_bytes),
            **({'sourceNotice': f'../africa-{family}-v1/{original["sourceNotice"]}'} if original.get('sourceNotice') else {}),
            'sourceThresholds': source_breaks, 'positiveLegend': positive_legend, 'scope': scope, 'method': method,
            'queryMethod': original['queryMethod'],
            'renderOrder': ['band', 'contour', 'zero'],
            'zeroDisplay': 'zero featureは元セルの厳密な0です。欠測と区別して表示する場合は最上部に淡色で描きます。格子中心間の補間面とは描画の定義が異なり、境界は元の5分角セルの範囲です。',
            'queryDisplayDifference': '地点照会は保存した元セル値。色面は格子中心間の補間値なので、同じセル内でも色帯と照会値が一致しない場所があります。補間面が描けない孤立した有効セルも地点照会では保持します。',
            'counts': {'nativeValidCells': int(valid.sum()), 'nativeZeroCells': int(zero.sum()),
                       'nativePositiveCells': int((values > 0).sum()), 'nativeMissingOrOutsideCells': int((~valid).sum()),
                       'fullyValidQuads': int(quad.sum()), 'positiveCellsWithoutValidQuad': int(((values > 0) & ~supported).sum()),
                       'bandFeatures': len(positive_legend), 'contourFeatures': len(source_breaks),
                       'zeroRectangles': len(zero_feature['geometry']['coordinates'])},
        }
        print(json.dumps({'layer': key, 'bytes': len(geometry), 'counts': layers[key]['counts']}, ensure_ascii=False))
    result = {
        'schemaVersion': 1, 'version': '1.0.0', 'bounds': [-27, -36, 64, 39], 'crs': 'EPSG:4326',
        'width': 1092, 'height': 900, 'resolutionDegrees': 1 / 12, 'layers': layers, 'files': files, 'parts': parts,
        'processing': {'generator': Path(__file__).relative_to(ROOT).as_posix(), 'generatorSha256': sha(Path(__file__).read_bytes()),
                       'reproduce': 'python3 scripts/prepare-africa-agriculture-distribution.py', 'contourpy': contourpy.__version__, 'numpy': np.__version__,
                       'algorithm': 'serial; corner_mask=false; quad_as_tri=false; z_interp=Linear; OuterOffset / Separate',
                       'coordinateDecimalPlaces': 8, 'inputResampling': 'none', 'sourceAssetsModified': False,
                       'aggregation': 'none', 'quantileSelection': 'none', 'thresholds': 'all existing source-manifest legend breaks',
                       'missingPolicy': 'Exclude every quad touching a missing corner; do not fill gaps or reconstruct islands.',
                       'zeroPolicy': 'Preserve supplied source zero separately as exact unions of native cell footprints.'},
        'limitations': ['これは2020年基準の統計モデルで、2026年の現況や個々の農地・家畜の実測位置ではありません。',
                        '品目によって元資料の欠測範囲が異なります。線や色がない場所を、生産や飼養がない場所と断定できません。',
                        '元資料の国境セルはセル全体の値を保っています。描画面の積分・セルの単純合計は公式の国別統計にはなりません。',
                        '補間線は位置を連続に描くための表現です。元5分角より高い測定解像度や実際の農地境界を示しません。',
                        '全品目の色面を重ねた混色は数量や構成比の凡例になりません。選択品目の面と他品目の線を分けて使う必要があります。'],
    }
    (OUT / 'manifest.json').write_bytes(encoded(result))


if __name__ == '__main__':
    main()
