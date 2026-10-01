#!/usr/bin/env python3
"""Prepare native MapSPAM 2020 wheat cells for a date-line-safe Russia window.

Only NumPy and Pillow are required. Source values are never clipped by country
geometry or interpolated. A geographic display window is not a national total.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/russia-crops-v1'
EVIDENCE = ROOT / 'data-source/atlas/russia/agriculture'
BOUNDS = [18, 40, 191, 83]
STEP = 1 / 12
ROW_START, ROW_STOP = 84, 600
COLUMN_START, COLUMN_STOP_UNWRAPPED = 2376, 4452
WIDTH, HEIGHT = 2076, 516
SOURCE_SHA256 = '34895a332ba7ff9d9732a81fe9da7063458d197f3c72ce3a405329c41f94ade2'
MEMBER = 'spam2020V2r2_global_harvested_area/spam2020_V2r2_global_H_WHEA_A.tif'
MEMBER_SHA256 = '288f583e50e8237b0eaad880e5ef188383c97701c5015744cf6a62f2bf7dba9e'
BREAKS = [1, 10, 100, 1000, 5000]
COLORS = ['edf1e3', 'd7e7b4', 'afd08b', '7fa95c', '4f7e3d', '23582d']
POINTS = [('Rostov region', 41, 47), ('Central black-earth belt', 40, 51),
          ('Middle Volga', 50, 53), ('Omsk region', 73, 55),
          ('Altai farmland', 83, 52), ('Amur region', 128, 50),
          ('Yakutsk vicinity', 129.7, 62), ('Chukotka east of date line', 185, 66),
          ('Crimea scope diagnostic only', 34, 45), ('Kaliningrad', 21, 54.7)]


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def sha_canonical_lf(path: Path) -> str:
    raw = path.read_bytes()
    raw.decode('utf-8')
    return sha_bytes(raw.replace(b'\r\n', b'\n'))


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n',
                    encoding='utf-8', newline='\n')


def normalized(values: np.ndarray) -> np.ndarray:
    result = values.astype('<f4', copy=True)
    result[~np.isfinite(result) | (result < 0)] = -1
    return result


def source_columns() -> np.ndarray:
    return np.arange(COLUMN_START, COLUMN_STOP_UNWRAPPED) % 4320


def spot_checks(values: np.ndarray, source: np.ndarray, unit: str) -> list:
    spots = []
    for name, lon, lat in POINTS:
        row, col = int((83 - lat) * 12), int((lon - 18) * 12)
        source_row = row + ROW_START
        source_col = (col + COLUMN_START) % 4320
        raw = float(source[source_row, source_col])
        expected = raw if np.isfinite(raw) and raw >= 0 else -1.0
        actual = float(values[row, col])
        if actual != expected:
            raise ValueError(f'Native cell/date-line index mismatch: {name}')
        spots.append({'name': name, 'longitudeUnwrapped': lon, 'latitude': lat,
                      'outputRow': row, 'outputColumn': col,
                      'sourceRow': source_row, 'sourceColumn': source_col,
                      'value': actual, 'unit': unit, 'missing': actual < 0})
    return spots


def emit_layer(out: Path, layer_id: str, original: np.ndarray, breaks: list,
               colors: list) -> tuple[np.ndarray, dict]:
    values = normalized(original)
    if values.shape != (HEIGHT, WIDTH):
        raise ValueError('Unexpected output dimensions')
    valid = np.isfinite(original) & (original >= 0)
    if not np.array_equal(values[valid], original[valid]):
        raise ValueError('A valid original source value changed')
    if not np.array_equal(values < 0, ~valid):
        raise ValueError('Original missing-cell identity changed')
    palette = np.asarray([list(bytes.fromhex(c)) + [255] for c in colors], dtype=np.uint8)
    rgba = palette[np.searchsorted(breaks, values, side='right')]
    rgba[values < 0] = 0
    rgba[values == 0] = [246, 245, 235, 255]
    out.mkdir(parents=True, exist_ok=True)
    image_path, grid_path = out / f'{layer_id}.png', out / f'{layer_id}.values.gz'
    Image.fromarray(rgba).save(image_path, optimize=True)
    grid_path.write_bytes(gzip.compress(values.tobytes(), mtime=0))
    decoded = np.frombuffer(gzip.decompress(grid_path.read_bytes()), dtype='<f4').reshape(HEIGHT, WIDTH)
    if not np.array_equal(decoded, values):
        raise ValueError('PNG lookup grid round-trip mismatch')
    with Image.open(image_path) as image:
        if not np.array_equal(np.asarray(image), rgba):
            raise ValueError('PNG classifications differ from numerical grid')
    counts = {'total': int(values.size), 'valid': int((values >= 0).sum()),
              'zero': int((values == 0).sum()), 'positive': int((values > 0).sum()),
              'missing': int((values < 0).sum())}
    if counts['zero'] + counts['positive'] != counts['valid'] or counts['valid'] + counts['missing'] != counts['total']:
        raise ValueError('Coverage arithmetic mismatch')
    if int((rgba[:, :, 3] > 0).sum()) != counts['valid']:
        raise ValueError('PNG alpha differs from valid source cells')
    return values, counts


def asset_receipts(out: Path) -> dict:
    return {p.name: {'bytes': p.stat().st_size, 'sha256': sha_file(p)}
            for p in sorted(out.iterdir()) if p.is_file() and p.name != 'manifest.json'}


def display_record() -> dict:
    return {'crs': 'EPSG:4326 with unwrapped east longitudes 18 to 191',
            'projection': 'Equirectangular display rectangle, not equal-area',
            'boundsUnwrapped': BOUNDS, 'bounds4326Unwrapped': BOUNDS,
            'width': WIDTH, 'height': HEIGHT,
            'nominalTransform': [18, STEP, 0, 83, 0, -STEP],
            'sourceRowRange': [ROW_START, ROW_STOP],
            'sourceColumnSpans': [[COLUMN_START, 4320], [0, 132]],
            'indexConvention': 'Half-open source ranges; source columns wrap modulo 4320 at 180E; row 0 north',
            'resampling': 'None. Native 5-arcminute source cells retained.',
            'countryMask': 'None in emitted data. Display clipping, if any, is a separate geometry convention; no national totals computed.'}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Existing pinned harvested-area ZIP')
    args = parser.parse_args()
    if sha_file(args.source) != SOURCE_SHA256:
        raise ValueError('MapSPAM source archive differs from the pinned input')
    attribution_path = OUT / 'attribution.json'
    attribution = json.loads(attribution_path.read_text(encoding='utf-8'))
    if attribution['versionNumber'] != 6 or attribution['versionMinorNumber'] != 0 or attribution['license'] != 'CC BY 4.0':
        raise ValueError('Unexpected fixed V6.0 source attribution')
    # Keep the copied licence record and its asset digest portable across OSes.
    write_json(attribution_path, attribution)
    with zipfile.ZipFile(args.source) as archive:
        blob = archive.read(MEMBER)
        if sha_bytes(blob) != MEMBER_SHA256:
            raise ValueError('MapSPAM wheat source-member hash mismatch')
        with Image.open(io.BytesIO(blob)) as image:
            if image.size != (4320, 2160) or image.mode != 'F':
                raise ValueError('Unexpected raster shape or sample format')
            scale, tie, keys = list(image.tag_v2[33550]), list(image.tag_v2[33922]), list(image.tag_v2[34735])
            geo_keys = {keys[i]: keys[i + 3] for i in range(4, len(keys), 4)}
            if geo_keys.get(2048) != 4326 or geo_keys.get(1025) != 1:
                raise ValueError('Expected EPSG:4326 pixel-is-area source')
            if abs(scale[0] - STEP) > 1e-9 or abs(tie[3] + 180) > 1e-9 or abs(tie[4] - 90) > 1e-9:
                raise ValueError('Unexpected source transform')
            source = np.asarray(image, dtype=np.float32)
            original = source[ROW_START:ROW_STOP, source_columns()]
            tags = {'pixelScale': scale, 'modelTiepoint': tie, 'geoKeyDirectory': keys,
                    'noData': float(image.tag_v2[42113])}
    values, counts = emit_layer(OUT, 'wheat', original, BREAKS, COLORS)
    spots = spot_checks(values, source, 'harvested ha per native source cell')
    layer = {'id': 'wheat', 'sourceCode': 'WHEA', 'title': '小麦', 'kind': 'crop', 'year': 2020,
             'unit': 'ha/5分格子', 'unitEnglish': 'harvested hectares per native 5-arcminute source cell',
             'image': 'wheat.png', 'grid': 'wheat.values.gz', 'width': WIDTH, 'height': HEIGHT,
             'boundsUnwrapped': BOUNDS, 'bounds4326Unwrapped': BOUNDS, 'breaks': BREAKS, 'colors': COLORS,
             'sourceURL': 'https://dataverse.harvard.edu/api/access/datafile/13827040',
             'sourceHash': MEMBER_SHA256, 'license': 'CC BY 4.0', 'sourceMember': MEMBER,
             'sourceMemberSha256': MEMBER_SHA256, 'nativeGeoTiffTags': tags,
             'missing': -1, 'validZero': 0, 'sourceCellCounts': counts, 'spotChecks': spots}
    manifest = {'schemaVersion': 1, 'region': 'russia', 'year': 2020,
                'generator': {'file': 'scripts/prepare-russia-crops.py', 'sha256': sha_canonical_lf(Path(__file__)),
                              'digestMethod': 'SHA256 of UTF-8 source with CRLF converted to LF'},
                'source': {'name': 'IFPRI MapSPAM 2020 v2r2 harvested area',
                           'edition': 'Harvard Dataverse V6.0, released 2026-05-05; fixed data file 13827040',
                           'url': layer['sourceURL'], 'catalogUrl': 'https://doi.org/10.7910/DVN/SWPENT',
                           'sha256': SOURCE_SHA256, 'license': 'CC BY 4.0',
                           'citation': attribution['citation'], 'termsUrl': attribution['termsUrl'],
                           'adaptationAttribution': {'requiredText': attribution['requiredAdaptationText'],
                                                    'placement': 'After complete source citation', 'record': 'attribution.json'},
                           'crs': 'EPSG:4326', 'referenceYear': 2020, 'nominalResolutionDegrees': STEP,
                           'width': 4320, 'height': 2160, 'measurementType': 'modelled harvested area',
                           'nativeGeoTiffTags': tags},
                'display': display_record(), 'lookup': {'encoding': 'float32-le-gzip', 'noData': -1, 'validZero': 0},
                'legend': {'breaks': BREAKS, 'colors': COLORS, 'zeroColor': 'f6f5eb', 'missingAlpha': 0,
                           'positiveClassesHaPerCell': ['0 < value < 1', '1 <= value < 10', '10 <= value < 100',
                                                        '100 <= value < 1000', '1000 <= value < 5000', 'value >= 5000']},
                'layers': [layer], 'files': asset_receipts(OUT),
                'limitations': ['2020年基準の収穫面積推計で、現在の作付や生産量を示さない。',
                                '収穫面積は複数作を含み、物理的な農地面積とは異なる。',
                                '欠測を作付ゼロと解釈しない。国境で元格子値を変更せず、国別合計を算出しない。',
                                '統計・国境それぞれの収録範囲は独立しており、係争地の所属や現国境を推定する資料として用いない。',
                                '表示は等面積図法ではなく、高緯度の見た目の面積で収穫面積を比較しない。'],
                'verification': {'sourceArchiveHash': 'passed', 'sourceMemberHash': 'passed',
                                 'sourceTransformCrsAndSampleFormat': 'passed', 'allPixelValidSourceCellIdentity': 'passed',
                                 'allPixelMissingSourceCellIdentity': 'passed', 'allPixelNumericalGridIdentity': 'passed',
                                 'allPixelPngClassificationIdentity': 'passed', 'zeroAndMissingSeparated': 'passed',
                                 'coverageArithmetic': 'passed', 'dateLineNativeIndexSpotChecks': 'passed'}}
    write_json(OUT / 'manifest.json', manifest)
    write_json(EVIDENCE / 'wheat-source.json', {'retrievedSource': 'Existing open source snapshot reused 2026-10-01',
               'sourceUrl': manifest['source']['url'], 'sourceArchiveSha256': SOURCE_SHA256,
               'sourceMember': MEMBER, 'sourceMemberSha256': MEMBER_SHA256, 'sourceYear': 2020,
               'license': 'CC BY 4.0', 'fixedVersion': '6.0', 'termsUrl': attribution['termsUrl'],
               'scope': manifest['display']['countryMask'], 'sourceCellCounts': counts,
               'spotChecks': spots, 'verification': manifest['verification']})
    print(json.dumps({'layer': 'wheat', 'shape': [HEIGHT, WIDTH], 'counts': counts,
                      'assets': manifest['files'], 'knownCellChecks': len(spots)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
