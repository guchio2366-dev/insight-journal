#!/usr/bin/env python3
"""Prepare original CGIAR GLW4 2020 Float32 cattle cells for Russia.

Only NumPy, Pillow and numcodecs are required. Existing pinned source chunks
are read directly. No download, country-value clipping or interpolation.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/russia-livestock-v1'
SOURCE_URL = 'https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/glw4-2020.zarr/'
METADATA_SHA256 = '60849b62074ea823af210c0fe6beafa36e14de2b5c61b880557d468f023dc5e3'
CHUNK_SHA256 = {
    'cattle/c/0/0': '33583a1b7edd2a1d688b2d37a14fa8d1ccd5f6e7a35dfac74040870d28c2b40e',
    'cattle/c/0/2': '49707b2d1b7393f6158ceadeac520d6ed709e23f2116906f8278b1cd57a0ba7c',
    'cattle/c/0/3': '3b66ebfae7879afb3311137200709390a57a54d45dc5a5446aece39db12e5918',
}
BREAKS = [1, 10, 50, 200, 1000]
COLORS = ['fff6e4', 'fee5be', 'f9c889', 'ee9960', 'cb653f', '873c31']


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True, help='Existing pinned metadata and chunk columns 2/3')
    parser.add_argument('--date-line-cache', type=Path, required=True, help='Existing pinned chunk column 0')
    parser.add_argument('--numcodecs-path', type=Path, help='Existing importable numcodecs runtime directory')
    args = parser.parse_args()
    if args.numcodecs_path:
        sys.path.insert(0, str(args.numcodecs_path))
    from numcodecs import Blosc
    path = ROOT / 'scripts/prepare-russia-crops.py'
    spec = importlib.util.spec_from_file_location('russia_crop_helpers', path)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    metadata_path = args.cache / 'glw-zarr.json'
    if helper.sha_file(metadata_path) != METADATA_SHA256:
        raise ValueError('Pinned GLW metadata hash mismatch')
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    array = metadata['consolidated_metadata']['metadata']['cattle']
    attrs = array['attributes']
    if array['shape'] != [2160, 4320] or array['data_type'] != 'float32' or array['fill_value'] != 'NaN':
        raise ValueError('Unexpected GLW source shape, dtype or no-data marker')
    if array['chunk_grid']['configuration']['chunk_shape'] != [1080, 1080]:
        raise ValueError('Unexpected GLW source chunk shape')
    if attrs['units'] != 'head/km2' or attrs['proj:code'] != 'EPSG:4326':
        raise ValueError('Unexpected GLW units or CRS')
    if not np.allclose(attrs['spatial:transform'], [1 / 12, 0, -180, 0, -1 / 12, 90], rtol=0, atol=1e-12):
        raise ValueError('Unexpected GLW source transform')
    codecs = [{'name': 'bytes', 'configuration': {'endian': 'little'}},
              {'name': 'blosc', 'configuration': {'typesize': 4, 'cname': 'zstd', 'clevel': 9,
                                                 'shuffle': 'noshuffle', 'blocksize': 0}}]
    if array['codecs'] != codecs:
        raise ValueError('Unexpected source endian or compression codec')
    north = np.full((1080, 4320), np.nan, dtype='<f4')
    inputs = []
    for col in [2, 3, 0]:
        key = f'cattle/c/0/{col}'
        source_path = (args.date_line_cache if col == 0 else args.cache) / f'glw-cattle_c_0_{col}'
        raw = source_path.read_bytes()
        digest = helper.sha_bytes(raw)
        if digest != CHUNK_SHA256[key]:
            raise ValueError(f'Pinned GLW source-chunk hash mismatch: {key}')
        decoded = np.frombuffer(Blosc().decode(raw), dtype='<f4')
        if decoded.size != 1080 * 1080:
            raise ValueError(f'Unexpected source chunk length: {key}')
        north[:, col * 1080:(col + 1) * 1080] = decoded.reshape(1080, 1080)
        inputs.append({'key': key, 'url': SOURCE_URL + key, 'sha256': digest, 'bytes': len(raw),
                       'decodedShape': [1080, 1080]})
    original = north[helper.ROW_START:helper.ROW_STOP, helper.source_columns()]
    values, counts = helper.emit_layer(OUT, 'cattle', original, BREAKS, COLORS)
    spots = helper.spot_checks(values, north, 'head/km2, modelled livestock density')
    layer = {'id': 'cattle', 'sourceCode': 'cattle', 'title': '牛', 'kind': 'livestock', 'year': 2020,
             'unit': '頭/km²', 'unitEnglish': 'head/km2, modelled livestock density',
             'image': 'cattle.png', 'grid': 'cattle.values.gz', 'width': helper.WIDTH, 'height': helper.HEIGHT,
             'boundsUnwrapped': helper.BOUNDS, 'bounds4326Unwrapped': helper.BOUNDS,
             'breaks': BREAKS, 'colors': COLORS, 'sourceURL': SOURCE_URL, 'sourceHash': METADATA_SHA256,
             'license': 'CC BY 4.0', 'sourceChunks': inputs, 'sourceArrayMetadata': array,
             'missing': -1, 'validZero': 0, 'sourceCellCounts': counts, 'spotChecks': spots}
    manifest = {'schemaVersion': 1, 'region': 'russia', 'year': 2020,
                'generator': {'file': 'scripts/prepare-russia-livestock.py', 'sha256': helper.sha_canonical_lf(Path(__file__)),
                              'helper': {'file': 'scripts/prepare-russia-crops.py', 'sha256': helper.sha_canonical_lf(path)},
                              'digestMethod': 'SHA256 of UTF-8 source with CRLF converted to LF'},
                'source': {'name': 'FAO Gridded Livestock of the World v4 (GLW4), 2020',
                           'edition': 'CGIAR Climate Data Hub Float32 Zarr conversion, updated 2026-06-23',
                           'url': SOURCE_URL, 'catalogUrl': 'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/',
                           'originalCatalogUrl': 'https://data.fao.org/catalog/dataset/9d1e149b-d63f-4213-978b-317a8eb42d02',
                           'citation': 'FAO. 2024. Gridded Livestock of the World v4, reference year 2020. Accessed through the CGIAR Climate Data Hub on 2026-10-01. Licence: CC BY 4.0.',
                           'license': 'CC BY 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/',
                           'termsUrl': 'https://www.fao.org/contact-us/terms/db-terms-of-use/en',
                           'metadataUrl': SOURCE_URL + 'zarr.json', 'metadataSha256': METADATA_SHA256,
                           'referenceYear': 2020, 'crs': 'EPSG:4326', 'resolutionDegrees': 1 / 12,
                           'width': 4320, 'height': 2160, 'chunkShape': [1080, 1080],
                           'nativeNoData': 'NaN', 'unit': 'head/km2', 'measurementType': 'modelled livestock density, dasymetric',
                           'chunks': inputs},
                'display': helper.display_record(), 'lookup': {'encoding': 'float32-le-gzip', 'noData': -1, 'validZero': 0},
                'legend': {'breaks': BREAKS, 'colors': COLORS, 'zeroColor': 'f6f5eb', 'missingAlpha': 0,
                           'positiveClassesHeadPerKm2': ['0 < value < 1', '1 <= value < 10', '10 <= value < 50',
                                                        '50 <= value < 200', '200 <= value < 1000', 'value >= 1000']},
                'layers': [layer], 'files': helper.asset_receipts(OUT),
                'limitations': ['2020年基準の牛の推定密度で、現年の正確な頭数や牧場位置を示さない。',
                                '乳牛・肉牛の区分はなく、飼育形態や飼料供給を単独で特定できない。',
                                'CGIARのFloat32変換を利用し、FAO原配布Float64とビット単位で同じ資料とは表記しない。',
                                '欠測をゼロと解釈しない。国境で元格子値を変更せず、国別合計を算出しない。',
                                '等緯度経度の格子は高緯度で実面積が小さい。見た目の面積や密度値の単純和を頭数と解釈しない。',
                                '統計・国境それぞれの収録範囲は独立しており、係争地の所属や現国境を推定する資料として用いない。'],
                'verification': {'sourceMetadataHash': 'passed', 'sourceChunkHashes': 'passed',
                                 'sourceTransformCrsUnitsAndCodecs': 'passed', 'allPixelValidSourceCellIdentity': 'passed',
                                 'allPixelMissingSourceCellIdentity': 'passed', 'allPixelNumericalGridIdentity': 'passed',
                                 'allPixelPngClassificationIdentity': 'passed', 'zeroAndMissingSeparated': 'passed',
                                 'coverageArithmetic': 'passed', 'dateLineNativeIndexSpotChecks': 'passed'}}
    helper.write_json(OUT / 'manifest.json', manifest)
    helper.write_json(helper.EVIDENCE / 'cattle-source.json', {'retrievedSource': 'Existing open source snapshot reused 2026-10-01',
                       'sourceUrl': SOURCE_URL, 'metadataSha256': METADATA_SHA256, 'chunks': inputs,
                       'sourceYear': 2020, 'license': 'CC BY 4.0', 'edition': manifest['source']['edition'],
                       'termsUrl': manifest['source']['termsUrl'], 'scope': manifest['display']['countryMask'],
                       'sourceCellCounts': counts, 'spotChecks': spots, 'verification': manifest['verification']})
    print(json.dumps({'layer': 'cattle', 'shape': [helper.HEIGHT, helper.WIDTH], 'counts': counts,
                      'assets': manifest['files'], 'knownCellChecks': len(spots)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
