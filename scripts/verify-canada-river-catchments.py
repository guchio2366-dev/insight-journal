"""Check exported catchments against independent source ring containment probes."""
from pathlib import Path
import argparse
import importlib.util
import json
import struct
import sys


def ring_contains(point, rings):
    x, y = point
    inside = False
    for ring in rings:
        for i, a in enumerate(ring):
            b = ring[i - 1]
            if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
                inside = not inside
    return inside


def raw_rings(shp, shx, row):
    base = struct.unpack_from('>I', shx, 100 + row * 8)[0] * 2 + 8
    parts, points = struct.unpack_from('<II', shp, base + 36)
    offsets = list(struct.unpack_from('<' + 'I' * parts, shp, base + 44)) + [points]
    start = base + 44 + parts * 4
    return [[struct.unpack_from('<dd', shp, start + index * 16) for index in range(first, last)] for first, last in zip(offsets, offsets[1:])]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--dependency-path', type=Path, action='append', default=[])
    args = parser.parse_args()
    sys.path[:0] = [str(path.resolve()) for path in args.dependency_path]
    from shapely.geometry import Point, shape
    root = Path(__file__).resolve().parents[1]
    assets = root / 'public/assets/atlas/canada-water-v1'
    manifest = json.loads((assets / 'river-catchments-manifest.json').read_text(encoding='utf8'))
    geojson = json.loads((assets / 'river-catchments.geojson').read_text(encoding='utf8'))
    spec = importlib.util.spec_from_file_location('prepare_catchments', root / 'scripts/prepare-canada-river-catchments.py')
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    assert [item['id'] for item in manifest['basins']] == ['fraser', 'nelson', 'st-lawrence', 'mackenzie']
    assert len(geojson['features']) == 4
    assert all(shape(item['geometry']).is_valid for item in geojson['features'])
    buffers, _, _, _ = generator.verify_source(args.cache, f"{manifest['source']['level']:02}")
    records = generator.read_dbf(buffers['dbf'])
    selected_ids = {value for basin in manifest['basins'] for value in basin['sourceSubBasinIds']}
    assert all(record['ENDO'] == 0 and record['COAST'] == 0 for record in records if record['HYBAS_ID'] in selected_ids)
    nelson = next(item for item in manifest['basins'] if item['id'] == 'nelson')
    assert nelson['sourceSubBasinCount'] == 105 and nelson['excludedEndorheicCount'] == 8
    assert not (set(nelson['sourceSubBasinIds']) & set(nelson['excludedSourceIds']))
    probes = 0
    diagnostic_rows = [item['sourceRow'] for item in manifest['processing']['sourceSelfTouchingRingDiagnostics']]
    # Independent even/odd ray crossing checks the untouched source coordinates,
    # including publisher rings with repeated self-touch points. It does not use
    # Shapely's linework noding algorithm to decide the expected result.
    for row in diagnostic_rows:
        rings = raw_rings(buffers['shp'], buffers['shx'], row)
        geometry = generator.read_geometry(buffers['shp'], buffers['shx'], row)
        west, south, east, north = geometry.bounds
        for column in range(11):
            for line in range(11):
                point = (west + (column + .371) / 11 * (east - west), south + (line + .613) / 11 * (north - south))
                expected = ring_contains(point, rings)
                assert geometry.contains(Point(point)) == expected, (row, point)
                probes += 1
    import gzip
    raw = (assets / 'river-catchments.geojson').read_bytes()
    compressed = (assets / 'river-catchments.geojson.gz').read_bytes()
    assert gzip.decompress(compressed) == raw
    assert generator.digest(raw) == manifest['files']['river-catchments.geojson']['sha256']
    assert generator.digest(compressed) == manifest['files']['river-catchments.geojson.gz']['sha256']
    result = {'namedCatchments': 4, 'selectedSourceSubBasins': len(selected_ids), 'excludedNelsonClosedSubBasins': 8, 'independentOriginalRingContainmentProbes': probes, 'selfTouchingSourceRecords': len(diagnostic_rows), 'allSourceMaskProbesMatched': True, 'allOutputGeometriesValid': True, 'gzipMatchesGeojson': True, 'outputManifestHashesMatch': True}
    (args.cache / 'artifact-verification.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8')
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
