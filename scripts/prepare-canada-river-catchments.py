"""Prepare named natural river catchments from actual BasinATLAS archive members.

Requires Shapely 2.1+. Example:
  python scripts/prepare-canada-river-catchments.py --cache ../canada-river-catchment-research --level 06
Only dedicated river-catchments assets are written; the statistical drainage layer
and its configuration remain separate. Source members stay in the private cache.
"""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import struct
import sys
import zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/canada-water-v1'
FIELDS = ('HYBAS_ID', 'NEXT_DOWN', 'NEXT_SINK', 'MAIN_BAS', 'ENDO', 'COAST', 'SUB_AREA', 'UP_AREA')
NAMED = (
    ('fraser', 'Fraser', 'フレーザー川', '7040016260', '#91bfc8'),
    ('nelson', 'Nelson', 'ネルソン川', '7040022240', '#e4bd7d'),
    ('st-lawrence', 'St. Lawrence', 'セントローレンス川', '7040034520', '#82accc'),
    ('mackenzie', 'Mackenzie', 'マッケンジー川', '8040009560', '#cba19b'),
)
PINNED_L6 = {
    'shp': 'dc61ea0eca354d6d7fa981ce738a1f9558f0c9dbee48d7a360de69c339c9d229',
    'dbf': '4f2bb9a9c81e454382d5075701ce8010fd1b2dd93c6e1f84d80e8f52dd92c99c',
    'shx': 'b30843b3ad36272f7fa1ce2a1554db81a0d550ff16561482b8dba469ce7d176a',
    'prj': 'a02a27b1d1982c8516d83398e85a3c8b1aef1713c13ef4d84d7bde17430c07c4',
}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def read_dbf(raw):
    count, header, stride = struct.unpack_from('<IHH', raw, 4)
    if len(raw) != header + count * stride + 1:
        raise ValueError('Unexpected DBF length')
    schema = {}
    position = 1
    for offset in range(32, header - 1, 32):
        if raw[offset] == 13:
            break
        name = raw[offset:offset + 11].split(b'\0')[0].decode('ascii')
        length, decimals = raw[offset + 16], raw[offset + 17]
        if name in FIELDS:
            if chr(raw[offset + 11]) != 'N':
                raise ValueError('Unexpected numeric field type')
            schema[name] = (position, length, decimals)
        position += length
    if set(schema) != set(FIELDS):
        raise ValueError('Missing required source fields')
    records = []
    for index in range(count):
        base = header + index * stride
        if raw[base] != 32:
            raise ValueError('Deleted DBF record')
        record = {'row': index}
        for name, (offset, length, decimals) in schema.items():
            value = raw[base + offset:base + offset + length].strip()
            if not value:
                raise ValueError('Missing source value')
            record[name] = float(value) if decimals else int(value)
        records.append(record)
    return records


def read_geometry(shp, shx, row, diagnostics=None):
    """Reconstruct source even/odd ring fill; node existing segments without displacement."""
    from shapely import build_area
    from shapely.geometry import MultiLineString, Polygon
    from shapely.ops import unary_union
    start, length = struct.unpack_from('>II', shx, 100 + row * 8)
    start, length = start * 2, length * 2
    if struct.unpack_from('>I', shp, start + 4)[0] * 2 != length:
        raise ValueError('SHP/SHX length mismatch')
    base = start + 8
    if struct.unpack_from('<i', shp, base)[0] != 5:
        raise ValueError('Expected source polygon')
    parts, points = struct.unpack_from('<II', shp, base + 36)
    if length != 44 + parts * 4 + points * 16:
        raise ValueError('Unexpected source polygon layout')
    starts = list(struct.unpack_from('<' + 'I' * parts, shp, base + 44)) + [points]
    coordinates = base + 44 + parts * 4
    rings = []
    for first, last in zip(starts, starts[1:]):
        ring = [struct.unpack_from('<dd', shp, coordinates + i * 16) for i in range(first, last)]
        if len(ring) < 4 or ring[0] != ring[-1]:
            raise ValueError('Unclosed source ring')
        rings.append(ring)
    invalid_rings = [index for index, ring in enumerate(rings) if not Polygon(ring).is_valid]
    # Some publisher rings touch themselves at repeated vertices. Noding the
    # original linework represents those rings as valid polygon components,
    # preserving their segments and their even/odd land mask. No buffer,
    # coordinate rounding, displacement, or estimated boundary is introduced.
    geom = build_area(unary_union(MultiLineString(rings)))
    if invalid_rings and diagnostics is not None:
        diagnostics.append({'sourceRow': row, 'invalidRingIndexes': invalid_rings, 'method': 'Node original boundary linework at its existing intersections; reconstruct source even/odd polygon fill, without vertex displacement.'})
    if geom.is_empty or geom.geom_type not in ('Polygon', 'MultiPolygon') or not geom.is_valid:
        raise ValueError(f'Unrepresentable source polygon row {row}, type {geom.geom_type}, area {geom.area}, valid {geom.is_valid}')
    return geom


def verify_source(cache, level):
    metadata_path = cache / 'basinatlas-figshare.json'
    metadata = json.loads(metadata_path.read_text(encoding='utf8'))
    archive = next(item for item in metadata['files'] if item['id'] == 20087237)
    if metadata['id'] != 9890531 or metadata['license']['name'] != 'CC BY 4.0' or archive['size'] != 4276492333:
        raise ValueError('Source identity or licence differs')
    index_path = cache / 'basinatlas-archive-index.json'
    index = json.loads(index_path.read_text(encoding='utf8'))
    acquired = json.loads((cache / f'level-{level}-acquisition.json').read_text(encoding='utf8')) if level != '06' else None
    buffers, inputs = {}, []
    for extension in ('dbf', 'shp', 'shx', 'prj'):
        name = f'BasinATLAS_v10_lev{level}.{extension}'
        member = next(item for item in index if item['name'].endswith('/' + name))
        raw = (cache / name).read_bytes()
        checksum = digest(raw)
        if len(raw) != member['bytes'] or zlib.crc32(raw) != member['crc']:
            raise ValueError('Actual archive member CRC/length differs: ' + name)
        expected = PINNED_L6[extension] if level == '06' else next(item['sha256'] for item in acquired['files'] if item['name'] == name)
        if checksum != expected:
            raise ValueError('Pinned source hash differs: ' + name)
        buffers[extension] = raw
        inputs.append({'file': name, 'archiveMember': member['name'], 'bytes': len(raw), 'sha256': checksum, 'crc32': f"{member['crc']:08x}", 'crc32Verified': True})
    if b'GCS_WGS_1984' not in buffers['prj']:
        raise ValueError('Unexpected source projection')
    return buffers, inputs, metadata, {'metadataSha256': digest(metadata_path.read_bytes()), 'archiveIndexSha256': digest(index_path.read_bytes()), 'acquisition': acquired}


def connected_rows(records, sink):
    by_id = {record['HYBAS_ID']: record for record in records}
    outlet = by_id[sink]
    if outlet['NEXT_DOWN'] != 0 or outlet['NEXT_SINK'] != sink or outlet['ENDO'] or outlet['COAST']:
        raise ValueError('Named outlet must be noncoastal, exorheic, and terminal')
    selected = [record for record in records if record['NEXT_SINK'] == sink and record['ENDO'] == 0 and record['COAST'] == 0]
    selected_ids = {record['HYBAS_ID'] for record in selected}
    for record in selected:
        seen = set()
        cursor = record
        while cursor['HYBAS_ID'] != sink:
            if cursor['HYBAS_ID'] in seen or cursor['NEXT_DOWN'] not in selected_ids:
                raise ValueError('Connection does not reach the selected natural outlet')
            seen.add(cursor['HYBAS_ID'])
            cursor = by_id[cursor['NEXT_DOWN']]
    excluded = [record for record in records if record['MAIN_BAS'] == sink and record['HYBAS_ID'] not in selected_ids]
    return outlet, selected, excluded


def geometry_counts(geometry):
    parts = list(geometry.geoms) if geometry.geom_type == 'MultiPolygon' else [geometry]
    return {'components': len(parts), 'holes': sum(len(part.interiors) for part in parts), 'coordinates': sum(len(part.exterior.coords) + sum(len(ring.coords) for ring in part.interiors) for part in parts)}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cache', type=Path, required=True)
    ap.add_argument('--level', default='06', choices=[f'{i:02}' for i in range(6, 13)])
    ap.add_argument('--dependency-path', type=Path, action='append', default=[])
    ap.add_argument('--simplify', type=float, default=.006)
    ap.add_argument('--validate-only', action='store_true')
    args = ap.parse_args()
    if not 0 <= args.simplify <= .01:
        raise ValueError('Display simplification must be between zero and .01 degrees')
    sys.path[:0] = [str(path.resolve()) for path in args.dependency_path]
    import shapely
    from shapely.geometry import Point, mapping
    from shapely.ops import unary_union
    buffers, inputs, metadata, acquisition = verify_source(args.cache, args.level)
    records = read_dbf(buffers['dbf'])
    if len(buffers['shx']) != 100 + len(records) * 8:
        raise ValueError('Source record counts differ')
    rivers_path = ROOT / 'src/data/atlas/canada/rivers.json'
    rivers_raw = rivers_path.read_bytes()
    rivers = json.loads(rivers_raw)['features']
    basins, full_geometries, source_ring_diagnostics = [], [], []
    for key, name, label, old_id, color in NAMED:
        sink = int(old_id[0] + args.level + old_id[3:])
        outlet, selected, excluded = connected_rows(records, sink)
        diagnostics = []
        full = unary_union([read_geometry(buffers['shp'], buffers['shx'], record['row'], diagnostics) for record in selected])
        source_ring_diagnostics.extend({'basin': key, **item} for item in diagnostics)
        if full.is_empty or not full.is_valid:
            raise ValueError('Invalid connected union')
        vertices = [point for feature in rivers if feature['properties'].get('name') == name for line in feature['geometry']['coordinates'] for point in line]
        matched = sum(full.covers(Point(point)) for point in vertices)
        if not vertices or matched / len(vertices) < .85:
            raise ValueError('Named river geometry does not confirm the basin identity: ' + name)
        area_sum = round(sum(record['SUB_AREA'] for record in selected), 1)
        difference = round(area_sum - outlet['UP_AREA'], 1)
        evidence = {'riverSource': 'Natural Earth v5.1.2 1:50m rivers', 'riverName': name, 'riverVertexCount': len(vertices), 'matchingRiverVertices': matched, 'unmatchedRiverVertices': len(vertices) - matched, 'interpretation': 'Independent cartographic name/position check; coastal and delta branches can have distinct catchments. Never union all polygons touched by a river name.'}
        basin = {'id': key, 'name': label + 'の集水域', 'sourceRiverName': name, 'color': color, 'sourceOutletId': sink, 'sourceLevel': int(args.level), 'sourceSubBasinIds': [record['HYBAS_ID'] for record in selected], 'sourceSubBasinCount': len(selected), 'excludedSourceIds': [record['HYBAS_ID'] for record in excluded], 'excludedEndorheicCount': sum(record['ENDO'] != 0 for record in excluded), 'sourceSelfTouchingRingRecordCount': len(diagnostics), 'sourceAreaSumKm2': area_sum, 'sourceOutletUpstreamAreaKm2': outlet['UP_AREA'], 'areaDiagnosticDifferenceKm2': difference, 'areaDiagnosticRelativeDifference': round(difference / outlet['UP_AREA'], 7), 'fullBounds': list(full.bounds), 'nameVerification': evidence, 'scope': '原資料で定義された水系の出口につながる支流の集水域を、地形と水系モデルでまとめています。国境を越える範囲を含みます。', 'note': '支流の水を集める範囲を示すモデル地図です。原資料の細かさより小さい閉鎖域が内部に残ることがあり、塗った場所すべての現在の流出を意味しません。農地への実際の取水・灌漑経路や現在の水量は示しません。デルタの別の出口や沿岸の小流域は別の区域です。'}
        basins.append(basin)
        full_geometries.append(full)
        print(json.dumps({'basin': key, 'level': args.level, 'parts': len(selected), 'excludedEndorheic': basin['excludedEndorheicCount'], 'connectedAreaRelativeDifference': basin['areaDiagnosticRelativeDifference'], 'riverVertices': [matched, len(vertices)]}), flush=True)
    overlap_area = sum(full_geometries[i].intersection(full_geometries[j]).area for i in range(len(basins)) for j in range(i))
    if overlap_area > 1e-9:
        raise ValueError('Named independent catchments overlap')
    coverage_valid = bool(shapely.coverage_is_valid(full_geometries))
    display = list(shapely.coverage_simplify(full_geometries, args.simplify)) if args.simplify and coverage_valid else full_geometries
    source_counts = [geometry_counts(geometry) for geometry in full_geometries]
    display_counts = [geometry_counts(geometry) for geometry in display]
    components_and_holes_preserved = all((original['components'], original['holes']) == (prepared['components'], prepared['holes']) for original, prepared in zip(source_counts, display_counts))
    if not components_and_holes_preserved:
        # Display detail may be reduced only while retaining every source land
        # component and hole. Keep original unions if this tolerance removes one.
        display = full_geometries
        display_counts = source_counts
    for basin, original, prepared in zip(basins, source_counts, display_counts):
        basin['originalUnionGeometryCounts'] = original
        basin['displayGeometryCounts'] = prepared
    if any(not geom.is_valid or geom.is_empty for geom in display):
        raise ValueError('Invalid display catchment')
    features = [{'type': 'Feature', 'id': basin['id'], 'properties': {'id': basin['id'], 'group': basin['id'], 'name': basin['name'], 'sourceRiverName': basin['sourceRiverName'], 'sourceOutletId': basin['sourceOutletId'], 'color': basin['color']}, 'geometry': mapping(geom)} for basin, geom in zip(basins, display)]
    raw = (json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode('utf8')
    compressed = gzip.compress(raw, mtime=0)
    attribution = 'BasinATLAS v1.0 / HydroATLAS, Bernhard Lehner; Simon Linke; Michele Thieme (2019), CC BY 4.0. Scientific reference: Linke et al. (2019), doi:10.1038/s41597-019-0300-6. Underlying terrain hydrography: HydroSHEDS/WWF, Lehner et al. (2008), Lehner and Grill (2013). Modified: named noncoastal terminal outlet selection, direct NEXT_SINK connectivity, exclusion of identified endorheic/virtual connections, polygon union and display simplification. River naming check: Natural Earth v5.1.2, public domain.'
    manifest = {'id': 'canada-natural-river-catchments-v1', 'source': {'product': 'Actual BasinATLAS v1.0', 'level': int(args.level), 'publicationYear': 2019, 'observationYear': None, 'sourceGridResolutionArcSeconds': 15, 'northernUnderlyingTerrainMetres': 1000, 'productUrl': 'https://www.hydrosheds.org/hydroatlas', 'doi': 'https://doi.org/10.6084/m9.figshare.9890531.v1', 'downloadUrl': 'https://ndownloader.figshare.com/files/20087237', 'archiveFilename': 'BasinATLAS_Data_v10_shp.zip', 'archiveBytes': 4276492333, 'wholeArchiveRetrieved': False, 'wholeArchiveMd5Verified': False, 'licence': metadata['license'], 'technicalDocumentationUrl': 'https://data.hydrosheds.org/file/technical-documentation/HydroATLAS_TechDoc_v10_1.pdf', 'attribution': attribution, 'inputs': inputs, 'cachedAcquisitionEvidence': acquisition}, 'namingSource': {'file': 'src/data/atlas/canada/rivers.json', 'sha256': digest(rivers_raw), 'url': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson', 'licence': 'Public domain'}, 'scope': 'The four existing named Canada river selections: Fraser, Nelson, St. Lawrence and Mackenzie, with complete selected transboundary source geometry. This is not an exhaustive partition of Canadian land.', 'basins': basins, 'processing': {'crs': 'EPSG:4326', 'topologySelection': 'NEXT_SINK == named terminal outlet, ENDO == 0, COAST == 0; verify every NEXT_DOWN chain reaches that outlet. MAIN_BAS is used only to report excluded source members.', 'ringPolicy': 'Preserve original boundary segments and source even/odd fill. Node original self-touching ring linework at its existing intersections without coordinate displacement, rounding, buffering or guessed boundaries. Dissolve connected sub-basins. Empty/uncovered land stays empty.', 'sourceSelfTouchingRingDiagnostics': source_ring_diagnostics, 'simplification': {'method': 'Shared-edge Visvalingam-Whyatt coverage simplification, only if original unions form valid coverage', 'toleranceDegrees': args.simplify if coverage_valid and components_and_holes_preserved else 0, 'allSourceComponentsAndHolesRetained': True, 'maximumPositionErrorClaimed': False, 'coverageValidBeforeSimplification': coverage_valid}, 'sourceQuantityFields': 'SUB_AREA and UP_AREA retained only for source consistency diagnostics, not computed from display pixels or polygon sizes.', 'noAdministrativeAggregation': True, 'noStatCanGeometry': True, 'noBoundaryGuessing': True, 'noDischargeOrWaterSupplyEstimate': True, 'shapelyVersion': shapely.__version__}, 'validation': {'sourceRecordCount': len(records), 'namedCatchmentCount': len(basins), 'allReconstructedSourceAndOutputPolygonsValid': True, 'sourceSelfTouchingRingRecordCount': len(source_ring_diagnostics), 'allNextDownChainsReachNamedOutlet': True, 'allSelectedEndoAndCoastZero': True, 'independentCatchmentsOverlapDegreesSquared': overlap_area, 'fullGeometryRetainedAcrossNationalBorders': True}, 'limitations': ['This is terrain-model catchment geography, not a current flow or irrigation map.', 'HydroSHEDS source quality is lower north of 60 degrees latitude because coarser HYDRO1k terrain replaces SRTM.', 'Finite source sub-basin subdivisions may include smaller internally noncontributing areas. Nelson has a 3.15% area-sum discrepancy at level 6 even after excluding its eight explicitly endorheic members. This terrain catchment map must not assert that every filled pixel currently drains to the river. Source area-sum versus connected upstream-area diagnostics are reported for every catchment.', 'Names are independently checked against Natural Earth river positions; names are not original BasinATLAS attributes.', 'Delta branches, lower-estuary shore drainage and smaller coastal catchments have separate source outlets. Each displayed catchment belongs to the named representative model outlet, not every shore or branch of the same river. The St. Lawrence model outlet is at the upper estuary; downstream Gulf shore catchments are not added.'], 'files': {'river-catchments.geojson': {'bytes': len(raw), 'sha256': digest(raw)}, 'river-catchments.geojson.gz': {'bytes': len(compressed), 'sha256': digest(compressed)}}}
    if not args.validate_only:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / 'river-catchments.geojson').write_bytes(raw)
        (OUT / 'river-catchments.geojson.gz').write_bytes(compressed)
        (OUT / 'river-catchments-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf8')
    print(json.dumps({'outputBytes': len(raw), 'gzipBytes': len(compressed), 'sourceLevel': args.level, 'sourceCoverageValid': coverage_valid, 'written': not args.validate_only}), flush=True)


if __name__ == '__main__':
    main()
