#!/usr/bin/env python3
"""Package already verified Mexico rasters. Standard library only; never downloads.

Original prepared metadata is copied byte-for-byte under gpcc/ and etopo/.
Large original archives and the 9.5 MB ETOPO window remain offline inputs.
"""
import sys
sys.dont_write_bytecode = True

import argparse
import hashlib
import json
import math
import struct
from pathlib import Path


# Source-relative path, public-relative path, exact bytes, verified SHA-256.
FILES = [
    ('gpcc/output/manifest.json', 'gpcc/manifest.json', 8863, '69a66ce4fb7a8cd84453b8309b51f4dc3cdc84cbf03d28900fc30fecd2f078dd'),
    ('gpcc/output/precipitation-legend.json', 'gpcc/precipitation-legend.json', 1379, 'ede79e74a94995ac25fae811a9ad05bcccb51f1c90d3da59a90eb029374a7fa9'),
    ('gpcc/output/precipitation-source.json', 'gpcc/precipitation-source.json', 5117, '3362ec17a923abbfae8dd36ff5c227d0c122ee0f40e4bbac4cc07d9ea26d6d46'),
    ('gpcc/output/mexico-gpcc-1991-2020-annual.png', 'gpcc/mexico-gpcc-1991-2020-annual.png', 25166, '07a6f56eeb0e5cdea5197140d89f5fe64d934847e43ff0cfcce383737ef10117'),
    ('gpcc/output/mexico-gpcc-1991-2020-annual.json', 'gpcc/mexico-gpcc-1991-2020-annual.json', 1629, 'f0506319f9f5f89a9bc8407be92d20d1280214c4ccf68e7b7592d2383551ab85'),
    ('gpcc/output/mexico-gpcc-1991-2020-annual.f32', 'gpcc/mexico-gpcc-1991-2020-annual.f32', 42240, 'fd90fa28043ff894f4141bfeb0cb26f52b6575ebb07c397a363f2b76e0e692de'),
    ('gpcc/output/mexico-gpcc-1991-2020-land-intersection.u8', 'gpcc/mexico-gpcc-1991-2020-land-intersection.u8', 10560, '965f512275ff6b875f5c7af8eed75fe39ff2d53b8d2e25ddfa018e8dd5f43feb'),
    ('gpcc/output/mexico-gpcc-1991-2020-missing-land.png', 'gpcc/mexico-gpcc-1991-2020-missing-land.png', 2161, 'ff041ddf89353315ab8fa49a95d474094326d78fe359aea7e9b7afc2678674f7'),
    ('gpcc/output/independent-grid-verification.json', 'gpcc/independent-grid-verification.json', 484, '0483610258abd4fca6fac6eed380f0d88bdfbc52bcc75575f3e3c26ecd8d49ce'),
    ('gpcc/source/inherited-exact-product-rights.json', 'gpcc/source/inherited-exact-product-rights.json', 2547, 'eef8711e54ef8a3c28c40dbcf3bd79b89b69a2f348a3385ea6cecec12cafdc78'),
    ('etopo/elevation-surface.manifest.json', 'etopo/elevation-surface.manifest.json', 11176, '56c83774ea227ffe1779e4f636731cb7a97595fd22933046c302dec4c3b45325'),
    ('etopo/elevation-surface.webp', 'etopo/elevation-surface.webp', 126908, '80f27a16c48d057f93ebd235a43797645b3fb9576f064e666bd0facea465ebef'),
    ('etopo/elevation-legend.json', 'etopo/elevation-legend.json', 1239, '68eaf5eed789bcf63b3ab992fb69d28ee2552b9a56e9079423cb365eab834a14'),
    ('etopo/mexico-etopo-window.json', 'etopo/mexico-etopo-window.json', 1421, '6c5fcb9939251b4ac0b1db79c5efb1e32487f6fed9aab312a2875aeb16ca4c26'),
    ('etopo/range-acquisition.json', 'etopo/range-acquisition.json', 16280, 'afc4f7b233f39d3c2c25a4dfa25777f4af459435c46c9b8199d2742f1dade63d'),
    ('etopo/generation-validation.json', 'etopo/generation-validation.json', 1115, '029efd8a6a6ef1b1be1012cace22b71f22417fe8a69d02412eaf08f3d9f69a28'),
    ('etopo/etopo-user-guide.source.json', 'etopo/etopo-user-guide.source.json', 809, 'fa1ca35ce9761194fc50163f7c59c4eb1019d000caa4877fe0855c2222d486ba'),
]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def image_size(data, extension):
    if extension == '.png':
        require(data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', 'Invalid PNG')
        require(data[24:29] == bytes([8, 6, 0, 0, 0]), 'Expected 8-bit RGBA noninterlaced PNG')
        return struct.unpack('>II', data[16:24])
    require(data[:4] == b'RIFF' and data[8:16] == b'WEBPVP8L', 'Expected lossless WebP')
    require(struct.unpack('<I', data[4:8])[0] + 8 == len(data), 'WebP length mismatch')
    require(data[20] == 0x2f, 'Invalid VP8L signature')
    bits = struct.unpack('<I', data[21:25])[0]
    return ((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)


def verify_legend(legend, key):
    stops = legend[key]
    require(stops[0]['value'] == legend['domain'][0] and stops[-1]['value'] == legend['domain'][1], 'Legend domain mismatch')
    previous_value = -math.inf
    previous_luminance = math.inf
    for stop in stops:
        channels = [int(stop['color'][i:i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in channels]
        luminance = sum(c * w for c, w in zip(linear, (.2126, .7152, .0722)))
        require(stop['value'] > previous_value and luminance < previous_luminance, 'Legend must get darker as values increase')
        previous_value, previous_luminance = stop['value'], luminance


def prepare(prepared_root, repo_root, check=False):
    prepared_root, repo_root = prepared_root.resolve(), repo_root.resolve()
    out = repo_root / 'public/assets/atlas/mexico-quantitative-v1'
    require(out.resolve().is_relative_to(repo_root), 'Output escapes repository')
    payloads = {}
    for source, destination, size, digest in FILES:
        path = (prepared_root / source).resolve()
        require(path.is_relative_to(prepared_root), 'Input escapes prepared root')
        data = path.read_bytes()
        require(len(data) == size and sha256(data) == digest, f'Prepared bytes/hash mismatch: {source}')
        payloads[destination] = data

    read = lambda name: json.loads(payloads[name])
    gpcc = read('gpcc/manifest.json')
    etopo = read('etopo/elevation-surface.manifest.json')
    rain_legend = read('gpcc/precipitation-legend.json')
    height_legend = read('etopo/elevation-legend.json')
    source = read('gpcc/precipitation-source.json')
    grid = read('gpcc/mexico-gpcc-1991-2020-annual.json')
    require(gpcc['displayFrame'] == etopo['displayFrame'], 'Raster display frames differ')
    require(gpcc['displayFrame']['viewBox'] == '0 0 900 580', 'Unexpected display frame')
    for name in ['gpcc/mexico-gpcc-1991-2020-annual.png', 'etopo/elevation-surface.webp']:
        require(image_size(payloads[name], Path(name).suffix) == (900, 580), 'Unexpected raster dimensions')
    require(source['period'] == ['1991-01-01', '2020-12-31'], 'GPCC baseline mismatch')
    require(source['sourceUnit'] == 'mm/month' and source['outputUnit'] == grid['unit'] == 'mm/year', 'Precipitation unit mismatch')
    require(etopo['source']['unit'] == height_legend['unit'] == 'm', 'Elevation unit mismatch')
    require(etopo['source']['editionNotObservationYear'] is True, 'Edition must not be an observation period')
    require(gpcc['checks']['missingDisplayLandPixels'] == 18 and gpcc['checks']['transparentMissingPixelsVerified'], 'GPCC missing-data evidence mismatch')
    require(etopo['checks']['display']['1x']['opaquePixelsOutsideLand'] == 0, 'ETOPO masking evidence mismatch')
    verify_legend(rain_legend, 'stops')
    verify_legend(height_legend, 'colorStops')
    # Pin the existing frame inputs; a changed frame requires raster regeneration.
    for path, expected in [
        ('src/data/atlas/mexico/geometry.json', etopo['landClip']['retainedGeometrySha256']),
        ('src/data/atlas/mexico/geometry-index.json', etopo['landClip']['geometryIndexSha256']),
        ('scripts/prepare-mexico-relief-background.py', etopo['reproduction']['referencedProjectionSha256']),
    ]:
        require(sha256((repo_root / path).read_bytes()) == expected, f'Existing projection/boundary changed: {path}')
    stations = json.loads((repo_root / 'src/data/atlas/mexico/climate-normals.json').read_text())
    require(stations['period'] == '1991–2020' and all(s['period'] == '1991–2020' for s in stations['stations']), 'Climograph baseline differs')

    def image_entry(namespace, original):
        name = namespace + '/' + original['file']
        return {'file': name, 'width': 900, 'height': 580, 'bytes': len(payloads[name]), 'sha256': sha256(payloads[name])}

    def legend_entry(original, key, unit):
        return {'domain': original['domain'], 'ticks': original['ticks'], 'colorStops': [{k: s[k] for k in ('value', 'color')} for s in original[key]], 'unit': unit}

    manifest = {
        'schemaVersion': 1,
        'id': 'mexico-quantitative-v1',
        'displayFrame': gpcc['displayFrame'],
        'layers': {
            'precipitation': {
                'image': image_entry('gpcc', gpcc['image']),
                'legend': legend_entry(rain_legend, 'stops', 'mm/年'),
                'titleJa': '年降水量',
                'periodLabelJa': '1991–2020年平年値',
                'sourceLabelJa': 'GPCC / DWD・2025版・0.25°格子',
                'descriptionJa': '月降水量の平年値12か月分を合計し、年降水量が多いほど濃い青で示します。',
                'limitationsJa': ['海域・国外・原データの欠損は透明です。欠損は0 mmではありません。', '雨温図と基準期間は共通ですが、格子の補間値と観測所の値は異なります。', '現在の雨、水不足、河川流量や利用可能な水量を表す図ではありません。'],
                'sourceUrl': source['sourceUrl'],
                'provenanceFile': 'gpcc/manifest.json',
                'sourceFile': 'gpcc/precipitation-source.json',
                'gridFile': 'gpcc/mexico-gpcc-1991-2020-annual.json',
                'missingLabelJa': 'データなし（0 mmではありません）',
            },
            'elevation': {
                'image': image_entry('etopo', etopo['assets'][0]),
                'legend': legend_entry(height_legend, 'colorStops', 'm'),
                'titleJa': '標高',
                'periodLabelJa': height_legend['editionLabelJa'],
                'sourceLabelJa': 'NOAA NCEI・ETOPO 2022',
                'descriptionJa': 'ETOPO原格子の標高をm単位で示し、標高が高いほど濃い色にしています。',
                'limitationsJa': ['2022は版の年で、全地点に共通する観測年ではありません。', '有効な負標高も保持しています。沿岸の混合セルを含むため、個別地点や全国の最低・最高標高には使えません。', '海域・国外は元の国土境界で除外しています。すべての内陸湖沼を除外するマスクではありません。'],
                'sourceUrl': etopo['source']['sourceUrl'],
                'provenanceFile': 'etopo/elevation-surface.manifest.json',
                'missingLabelJa': 'データなし（0 mではありません）',
            },
        },
        'assets': [{'file': dest, 'bytes': size, 'sha256': digest} for _, dest, size, digest in FILES],
        'provenanceNoteJa': '名前空間内の元メタデータは無変更です。記載された全球原本・ETOPO数値窓・取得範囲バイナリはオフラインの生成入力で、公開ファイルへのリンクではありません。',
    }
    payloads['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    # Validate all destinations before writing; never follow an output symlink.
    for name, data in payloads.items():
        path = out / name
        require(path.resolve().is_relative_to(out.resolve()), f'Output escapes asset folder: {name}')
        require(not path.is_symlink(), f'Refuse output symlink: {name}')
        if check:
            require(path.is_file() and path.read_bytes() == data, f'Output absent or differs: {name}')
    if not check:
        for name, data in payloads.items():
            path = out / name
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists() or path.read_bytes() != data:
                path.write_bytes(data)
    return {'mode': 'check' if check else 'copy', 'files': len(payloads), 'bytes': sum(map(len, payloads.values())), 'output': str(out)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared-root', type=Path, required=True)
    parser.add_argument('--repo-root', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--check', action='store_true', help='Verify byte-identical output without writes')
    arguments = parser.parse_args()
    print(json.dumps(prepare(arguments.prepared_root, arguments.repo_root, arguments.check), ensure_ascii=False))
