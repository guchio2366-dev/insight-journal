#!/usr/bin/env python3
"""Offline 250 mm GPCC isohyets in the existing Mexico map frame.

Requires the retained, pinned monthly source window, numpy, contourpy and Pillow.
No download, installation, source-grid edit, or INEGI precipitation input.
"""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
import contourpy
import numpy as np
from PIL import Image

WINDOW_SHA = 'cd2d0cfbac5955a235cc8768901a16c580133dd85930f04bdb516a0244f784a2'
GRID_SHA = 'fd90fa28043ff894f4141bfeb0cb26f52b6575ebb07c397a363f2b76e0e692de'
RASTER_SHA = '07a6f56eeb0e5cdea5197140d89f5fe64d934847e43ff0cfcce383737ef10117'
PREFIX = 'mexico-gpcc-1991-2020-isohyets-250mm'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode()


def record(name, data):
    return {'file': name, 'bytes': len(data), 'sha256': digest(data)}


def generate(repo, window):
    root = repo / 'public/assets/atlas/mexico-quantitative-v1'
    manifest = json.loads((root / 'manifest.json').read_bytes())
    frame = manifest['displayFrame']
    source = json.loads((root / 'gpcc/precipitation-source.json').read_bytes())
    grid = json.loads((root / 'gpcc/mexico-gpcc-1991-2020-annual.json').read_bytes())
    raw = (root / 'gpcc' / grid['file']).read_bytes()
    raster = (root / 'gpcc/mexico-gpcc-1991-2020-annual.png').read_bytes()
    original_legend = json.loads((root / 'gpcc/precipitation-legend.json').read_bytes())
    assert digest(window.read_bytes()) == WINDOW_SHA
    assert digest(raw) == GRID_SHA and digest(raster) == RASTER_SHA
    assert source['period'] == ['1991-01-01', '2020-12-31']
    assert source['archive']['sha256'] == '3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5'
    assert grid['unit'] == 'mm/year' and grid['resolution'] == [0.25, -0.25]
    with np.load(window) as data:
        monthly = data['gpcc_precip'].copy()
        lon, lat = data['longitude'].copy(), data['latitude'].copy()
    assert monthly.shape == (12, 80, 132)
    assert np.array_equal(lon, -118.875 + np.arange(132) * .25)
    assert np.array_equal(lat, 33.875 - np.arange(80) * .25)
    valid = np.all(np.isfinite(monthly) & (monthly != grid['noData']) & (monthly >= 0), axis=0)
    # Match the retained annual f32 exactly, including its one storage cast.
    annual = monthly.astype('float64').sum(axis=0).astype('float32')
    native = np.frombuffer(raw, dtype='<f4').reshape(80, 132)
    land = np.frombuffer((root / 'gpcc/mexico-gpcc-1991-2020-land-intersection.u8').read_bytes(), dtype='uint8').reshape(80, 132).astype(bool)
    assert np.array_equal(native[land & valid], annual[land & valid])
    assert np.all(native[land & ~valid] == grid['noData'])
    assert int((land & ~valid).sum()) == 9
    contour = contourpy.contour_generator(x=lon, y=lat, z=np.ma.array(annual, mask=~valid),
        name='serial', corner_mask=False, line_type='Separate', fill_type='OuterOffset',
        z_interp='Linear', quad_as_tri=False)
    projection = repo / 'scripts/prepare-mexico-relief-background.py'
    spec = importlib.util.spec_from_file_location('mexico_existing_projection', projection)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    forward, inverse = module.lambert_functions(frame['projection'])
    scale, left, top = frame['scalePixelsPerNativeMetre'], frame['leftPixels'], frame['topPixels']
    xmin, _, _, ymax = frame['boundsNative']

    def display(points):
        x, y = forward(points[:, 0], points[:, 1])
        return np.column_stack((left + (x - xmin) * scale, top + (ymax - y) * scale))

    def path(points, closed=False):
        xy = display(points)
        return 'M' + 'L'.join(f'{x:.3f},{y:.3f}' for x, y in xy) + ('Z' if closed else '')

    # Exact same original coast, supplied polygon holes and missing-cell footprints
    # as the accepted numerical raster, independently of valid contour quads.
    old_rgba = np.array(Image.open(io.BytesIO(raster)).convert('RGBA'))
    assert old_rgba.shape == (580, 900, 4)
    mask_rgba = np.full_like(old_rgba, 255)
    mask_rgba[:, :, 3] = old_rgba[:, :, 3]
    mask_bytes = io.BytesIO()
    Image.fromarray(mask_rgba).save(mask_bytes, format='PNG', optimize=True)
    mask_url = 'data:image/png;base64,' + base64.b64encode(mask_bytes.getvalue()).decode()
    stops = original_legend['stops']
    colors = np.array([[int(s['color'][i:i + 2], 16) for i in (1, 3, 5)] for s in stops])

    def color(value):
        rgb = [int(np.floor(np.interp(value, [s['value'] for s in stops], colors[:, i]) + .5)) for i in range(3)]
        return '#' + ''.join(f'{v:02x}' for v in rgb)

    boundaries = list(range(0, 4001, 250))
    bands, band_paths, line_paths, line_records, candidates = [], [], [], [], []
    verified_vertices = 0
    max_error = 0.
    for lower, upper in zip(boundaries[:-1], boundaries[1:]):
        fill = color((lower + upper) / 2)
        points, offsets = contour.filled(lower, upper)
        d = ''.join(path(p[int(a):int(b)], True) for p, rings in zip(points, offsets) for a, b in zip(rings[:-1], rings[1:]))
        bands.append({'min': lower, 'max': upper, 'color': fill})
        if d:
            band_paths.append(f'<path data-band-min="{lower}" data-band-max="{upper}" fill="{fill}" fill-rule="evenodd" d="{d}"/>')
    for level in boundaries[1:-1]:
        lines = contour.lines(level)
        d = ''.join(path(points) for points in lines)
        if d:
            line_paths.append(f'<path data-isohyet-mm="{level}" d="{d}"/>')
        line_records.append({'valueMmPerYear': level, 'parts': len(lines), 'vertices': sum(len(p) for p in lines)})
        for points in lines:
            # Every original contour vertex must lie on a valid native grid edge
            # and its independently interpolated donor values must equal the level.
            for x, y in points:
                c, r = (x - lon[0]) / .25, (lat[0] - y) / .25
                if abs(r - round(r)) < 1e-7:
                    rr, cc = int(round(r)), min(int(np.floor(c)), 130)
                    assert valid[rr, cc] and valid[rr, cc + 1]
                    expected = float(annual[rr, cc]) + (c - cc) * (float(annual[rr, cc + 1]) - float(annual[rr, cc]))
                else:
                    assert abs(c - round(c)) < 1e-7
                    cc, rr = int(round(c)), min(int(np.floor(r)), 78)
                    assert valid[rr, cc] and valid[rr + 1, cc]
                    expected = float(annual[rr, cc]) + (r - rr) * (float(annual[rr + 1, cc]) - float(annual[rr, cc]))
                error = abs(expected - level)
                assert error < .00001
                max_error = max(max_error, error)
                verified_vertices += 1
            xy = display(points)
            lengths = np.linalg.norm(np.diff(xy, axis=0), axis=1)
            distance = np.concatenate(([0.], np.cumsum(lengths)))
            if distance[-1] < 45:
                continue
            for fraction in [.5, .35, .65, .2, .8]:
                i = min(int(np.searchsorted(distance, distance[-1] * fraction)), len(points) - 1)
                px, py = xy[i]
                if 12 < px < 888 and 12 < py < 568 and old_rgba[int(py), int(px), 3]:
                    candidates.append((level, distance[-1], float(px), float(py)))
    labels = []
    for level in boundaries[1:-1]:
        for value, length, x, y in sorted((c for c in candidates if c[0] == level), key=lambda c: -c[1]):
            if all(abs(x - label['x']) > 48 or abs(y - label['y']) > 26 for label in labels):
                labels.append({'valueMmPerYear': value, 'x': round(x, 3), 'y': round(y, 3)})
                break
    label_svg = ''.join(f'<text x="{p["x"]}" y="{p["y"]}" data-isohyet-label-mm="{p["valueMmPerYear"]}">{p["valueMmPerYear"]:,}</text>' for p in labels)
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="580" viewBox="0 0 900 580">'
        '<title>メキシコの年降水量：250mm間隔の等雨量線と段階帯</title>'
        '<desc>GPCC v2025、1991–2020年平年値。0.25度格子から線形補間で導出。原欠測と補間できない区画は透明。INEGI2006年の原等雨量線は使用しない。</desc>'
        f'<defs><mask id="land-and-native-validity" maskUnits="userSpaceOnUse" x="0" y="0" width="900" height="580" style="mask-type:alpha"><image width="900" height="580" href="{mask_url}"/></mask></defs>'
        '<g mask="url(#land-and-native-validity)">' + ''.join(band_paths) +
        '<g fill="none" stroke="#245f87" stroke-width="1.05" stroke-linejoin="round" stroke-linecap="round">' + ''.join(line_paths) + '</g></g>' +
        '<g font-family="sans-serif" font-size="17" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#173d5e" stroke="#fff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke fill">' + label_svg + '</g></svg>\n').encode()
    name = 'gpcc/' + PREFIX + '.svg'
    provenance_name = 'gpcc/' + PREFIX + '.json'
    provenance = {
        'schemaVersion': 1, 'id': PREFIX, 'source': source,
        'annualGrid': record(grid['file'], raw),
        'retainedMonthlyWindow': {'file': window.name, 'sha256': WINDOW_SHA, 'bytes': window.stat().st_size, 'offlineInputNotPublicAsset': True},
        'period': '1991-01-01/2020-12-31', 'unit': 'mm/year', 'nativeResolutionDegrees': .25,
        'derivation': 'Sum all 12 complete monthly normals in float64, cast once to float32 matching the retained annual grid. Marching squares at every 250 mm, linear interpolation on native cell-centre edges; straight contour segments within each quad. No smoothing, resampling to a finer grid, nearest-valid search, extrapolation or INEGI isohyet input.',
        'missingData': 'Only quads with four complete original annual donors are contoured (corner_mask=False). Retain the accepted original-boundary/native-missing alpha mask. No filling of nine missing land-intersecting native cells; additional coastal/adjacent incomplete-quad gaps are transparent, not zero.',
        'displayClip': {'maskSource': record('mexico-gpcc-1991-2020-annual.png', raster), 'maskMeaning': 'Original INEGI coast and supplied polygon holes, plus original annual validity; 900x580 pixel-centre clipping. Not an exhaustive inland-lake mask.', 'svgCoordinatesDecimalPlaces': 3},
        'displayFrame': frame, 'intervalMmPerYear': 250, 'boundariesMmPerYear': boundaries, 'bands': bands,
        'lines': line_records, 'labels': labels,
        'labelPolicy': 'Every 250 mm line is retained; one well-spaced representative label per available level at national scale, anchored on a line inside the original valid land mask. Text halos can extend outside the coastline to avoid clipping digits. Label omission never removes a contour.',
        'image': record(PREFIX + '.svg', svg),
        'checks': {'unchangedNativeGridSha256': GRID_SHA, 'exactOriginalAnnualDonors': int((land & valid).sum()), 'missingLandNativeCells': 9, 'completeQuadCount': int((valid[:-1, :-1] & valid[1:, :-1] & valid[:-1, 1:] & valid[1:, 1:]).sum()), 'independentlyVerifiedContourVertices': verified_vertices, 'maximumEdgeInterpolationErrorMm': max_error, 'oldMissingPixelsRemainTransparentByMask': True, 'lineAndBandBoundariesUseSameGenerator': True},
        'reproduction': {'script': 'scripts/prepare-mexico-gpcc-isohyets.py', 'scriptSha256': digest(Path(__file__).read_bytes()), 'numpy': np.__version__, 'contourpy': contourpy.__version__, 'projectionScriptSha256': digest(projection.read_bytes())},
        'limitationsJa': ['等雨量線はGPCC格子の補間値から導出したもので、観測された線やINEGI2006年の原線ではありません。', '0.25°の解析格子を使い、250mm間隔は雨量の区分幅です。より細かい地点観測の精度を意味しません。', '海域・国外・原欠測と補間できない沿岸などの区画は透明です。欠損は0 mmではありません。'],
    }
    layer = manifest['layers']['precipitation']
    layer['image'] = {**record(name, svg), 'width': 900, 'height': 580}
    layer['legend']['bands'] = bands
    layer['legend']['interval'] = 250
    layer['descriptionJa'] = 'GPCCの1991–2020年平年値12か月分を年合計し、0.25°格子から250mm間隔の等雨量線と線間の段階帯を導出。雨の多い帯ほど濃い青です。'
    layer['limitationsJa'] = provenance['limitationsJa'] + ['雨温図と基準期間は共通ですが、格子の補間値と観測所の値は異なります。', '現在の雨、水不足、河川流量や利用可能な水量を表す図ではありません。']
    layer['provenanceFile'] = provenance_name
    layer['rendering'] = 'derived-250mm-isohyets-and-bands'
    payloads = {name: svg, provenance_name: encoded(provenance)}
    manifest['assets'] = [a for a in manifest['assets'] if a['file'] not in payloads] + [record(n, data) for n, data in payloads.items()]
    manifest['provenanceNoteJa'] = '元の数値格子・メタデータ・PNG/WebPを保持。降水量の表示だけを同じGPCC1991–2020年の格子から導出した250mm等雨量線と段階帯へ変更。生成・補間・欠測処理は専用台帳に記録。'
    payloads['manifest.json'] = encoded(manifest)
    return root, payloads, provenance['checks']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-window', type=Path, required=True)
    parser.add_argument('--repo-root', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    root, payloads, checks = generate(args.repo_root.resolve(), args.source_window.resolve())
    for name, data in payloads.items():
        destination = root / name
        assert destination.resolve().is_relative_to(root.resolve()) and not destination.is_symlink()
        if args.check:
            assert destination.read_bytes() == data, f'Regenerated output differs: {name}'
        else:
            destination.write_bytes(data)
    print(json.dumps({'mode': 'check' if args.check else 'generate', 'files': [record(n, data) for n, data in payloads.items()], 'checks': checks}, ensure_ascii=False))
