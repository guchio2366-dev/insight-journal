#!/usr/bin/env python3
"""Reclassify the pinned CanGridP annual grid with the US water-map bands.

Run: python scripts/prepare-canada-precipitation-parity.py --research-root ../canada-water-research
Optional private QA export: --preview-output /path/outside/public/precipitation-parity-preview.png
Dependencies: numpy, Pillow. No source downloads or precipitation gap filling.
The original locator cell-footprint geometry and bounds are retained. Isohyets
use only complete, valid source-grid quads; linear edge crossings are joined
with marching squares, with a bilinear asymptotic decider for saddle quads.
"""

import argparse
import ast
import gzip
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
THRESHOLDS = [250, 500, 750, 1000, 1500, 2000]
IDS = ['lt250', '250-500', '500-750', '750-1000', '1000-1500', '1500-2000', 'gte2000']
COLORS = ['#f2dfb3', '#e0e4be', '#b9d8b8', '#8bc8bf', '#60afb8', '#378eaa', '#216782']
GRID_HASH = '414b2978bbeafea9aba6066c866f75a245a801b870243b1b6428c0edc08994d3'
POINT_HASH = 'c1614bb3f25de52dae59daa05939cd5233edf10299accb65e884862e3fea1afd'
BOUNDS = [-145, 40, -50, 85]
WIDTH, HEIGHT = 1900, 900


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value, compact=False):
    path.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False,
                              separators=(',', ':') if compact else None,
                              indent=None if compact else 2) + '\n', encoding='utf-8')


def corners(a):
    """Same source-coordinate corner estimates as the adopted v1 renderer."""
    padded = np.pad(a, 1, mode='edge')
    padded[0, 1:-1] = 2 * a[0] - a[1]
    padded[-1, 1:-1] = 2 * a[-1] - a[-2]
    padded[1:-1, 0] = 2 * a[:, 0] - a[:, 1]
    padded[1:-1, -1] = 2 * a[:, -1] - a[:, -2]
    padded[0, 0] = padded[0, 1] + padded[1, 0] - padded[1, 1]
    padded[0, -1] = padded[0, -2] + padded[1, -1] - padded[1, -2]
    padded[-1, 0] = padded[-2, 0] + padded[-1, 1] - padded[-2, 1]
    padded[-1, -1] = padded[-2, -1] + padded[-1, -2] - padded[-2, -2]
    return (padded[:-1, :-1] + padded[1:, :-1] + padded[:-1, 1:] + padded[1:, 1:]) / 4


def project(p, size=(900, 580)):
    return np.array([(p[0] + 145) / 95 * size[0], (85 - p[1]) / 45 * size[1]])


def source_crossings(annual, valid, lon, lat, level):
    """Return connected lines and evidence for every source edge and quad."""
    complete = valid[:-1, :-1] & valid[1:, :-1] & valid[1:, 1:] & valid[:-1, 1:]
    values = [annual[:-1, :-1], annual[1:, :-1], annual[1:, 1:], annual[:-1, 1:]]
    above = [v >= level for v in values]
    changing = complete & (np.logical_or.reduce(above)) & ~np.logical_and.reduce(above)
    points, edges, neighbors = {}, [], defaultdict(list)
    residuals, source_probes, saddles = [], [], 0

    def crossing(key):
        if key in points:
            return key
        axis, i, j = key
        p0 = (i, j)
        p1 = (i + 1, j) if axis == 'x' else (i, j + 1)
        assert valid[p0] and valid[p1]
        v0, v1 = float(annual[p0]), float(annual[p1])
        assert (v0 >= level) != (v1 >= level)
        t = (level - v0) / (v1 - v0)
        assert 0 <= t <= 1
        coordinate = [float(lon[p0] + t * (lon[p1] - lon[p0])),
                      float(lat[p0] + t * (lat[p1] - lat[p0]))]
        points[key] = coordinate
        residuals.append(abs(v0 + t * (v1 - v0) - level))
        if len(source_probes) < 3:
            source_probes.append({'edge': [axis, i, j], 'sourceCells': [list(p0), list(p1)],
                                  'sourceAnnualMm': [v0, v1], 'fraction': t,
                                  'coordinates': coordinate})
        return key

    for i0, j0 in zip(*np.where(changing)):
        i, j = int(i0), int(j0)
        v = [float(a[i, j]) for a in values]
        high = [x >= level for x in v]
        keys = [('x', i, j), ('y', i + 1, j), ('x', i, j + 1), ('y', i, j)]
        active = [k for k in range(4) if high[k] != high[(k + 1) % 4]]
        if len(active) == 2:
            pairs = [active]
        else:
            assert len(active) == 4
            saddles += 1
            a, b, c, d = [x - level for x in v]
            determinant = a * c - b * d
            pairs = [[0, 1], [2, 3]] if determinant >= 0 else [[0, 3], [1, 2]]
        for u, w in pairs:
            ukey, wkey = crossing(keys[u]), crossing(keys[w])
            index = len(edges)
            edges.append((ukey, wkey))
            neighbors[ukey].append(index)
            neighbors[wkey].append(index)

    assert all(1 <= len(x) <= 2 for x in neighbors.values())
    visited, paths = set(), []

    def trace(start, edge_index):
        line, current = [points[start]], start
        while edge_index not in visited:
            visited.add(edge_index)
            a, b = edges[edge_index]
            current = b if current == a else a
            line.append(points[current])
            choices = [x for x in neighbors[current] if x not in visited]
            if not choices:
                break
            edge_index = choices[0]
        return line

    for key, indices in neighbors.items():
        if len(indices) == 1 and indices[0] not in visited:
            paths.append(trace(key, indices[0]))
    for edge_index, (a, _) in enumerate(edges):
        if edge_index not in visited:
            paths.append(trace(a, edge_index))
    assert len(visited) == len(edges)
    # No line simplification: each emitted vertex remains a source edge crossing.
    lines = [[[round(x, 6), round(y, 6)] for x, y in path] for path in paths]
    evidence = {'precipitationMm': level, 'completeValidQuads': int(complete.sum()),
                'crossingQuads': int(changing.sum()), 'segments': len(edges),
                'uniqueSourceEdgeCrossings': len(points), 'lineCount': len(lines),
                'closedLineCount': sum(line[0] == line[-1] for line in lines),
                'vertices': sum(len(line) for line in lines), 'saddleQuads': saddles,
                'maximumEdgeThresholdResidualMm': max(residuals, default=0),
                'invalidSourceCellSegments': 0, 'allSegmentsTracedOnce': True,
                'sourceEdgeProbes': source_probes}
    return lines, evidence


def contour_labels(features):
    """Label existing vertices on long contours; favor Canada's southern view."""
    labels, occupied = [], []
    for feature in features:
        candidates = []
        for index, line in enumerate(feature['geometry']['coordinates']):
            xy = np.array([project(p) for p in line])
            distances = np.concatenate(([0.0], np.cumsum(np.linalg.norm(np.diff(xy, axis=0), axis=1))))
            length = float(distances[-1])
            if length < 30:
                continue
            interior = np.where((distances >= length * .3) & (distances <= length * .7))[0]
            # A label's coordinate is literally a geometry vertex, never moved off its line.
            for k in sorted(interior, key=lambda k: (line[k][1] > 65, abs(distances[k] - length * .5))):
                candidates.append((line[k][1] > 65, -length, abs(distances[k] - length * .5), index, int(k), xy[k]))
                break
        used_lines, count = set(), 0
        for _, _, _, line_index, vertex_index, xy in sorted(candidates, key=lambda c: c[:5]):
            if line_index in used_lines or any(abs(xy[0] - p[0]) < 72 and abs(xy[1] - p[1]) < 25 for p in occupied):
                continue
            p = feature['properties']
            coordinate = feature['geometry']['coordinates'][line_index][vertex_index]
            labels.append({'id': p['id'], 'precipitation_mm': p['precipitation_mm'],
                           'coordinates': coordinate, 'major': p['major'],
                           'lineIndex': line_index, 'vertexIndex': vertex_index})
            occupied.append(xy)
            used_lines.add(line_index)
            count += 1
            if count == 2:
                break
    return labels


def verify_emitted_assets(output, annual, valid, lon, lat):
    """Read saved files and independently recover support for every segment."""
    composite = np.array(Image.open(output / 'annual-precipitation-1991-2020-locator.png'))
    masks = [np.array(Image.open(output / f'annual-precipitation-1991-2020-class-{i}.png'))
             for i in range(7)]
    assert all(np.array_equal(layer[layer[:, :, 3] > 0], composite[layer[:, :, 3] > 0]) for layer in masks)
    coverage_count = sum((layer[:, :, 3] > 0).astype('u1') for layer in masks)
    assert np.array_equal(coverage_count, (composite[:, :, 3] > 0).astype('u1'))
    complete = valid[:-1, :-1] & valid[1:, :-1] & valid[1:, 1:] & valid[:-1, 1:]
    collection = json.loads((output / 'precipitation-isohyets.geojson').read_text(encoding='utf-8'))
    per_level = []
    for feature in collection['features']:
        level, support = feature['properties']['precipitation_mm'], defaultdict(set)
        # Recompute admissible edge coordinates directly from the saved source.
        for axis in [0, 1]:
            lo = (slice(None, -1), slice(None)) if axis == 0 else (slice(None), slice(None, -1))
            hi = (slice(1, None), slice(None)) if axis == 0 else (slice(None), slice(1, None))
            v0, v1 = annual[lo].astype('f8'), annual[hi].astype('f8')
            crossing = valid[lo] & valid[hi] & ((v0 >= level) != (v1 >= level))
            for i, j in zip(*np.where(crossing)):
                neighbors = [(i, j - 1), (i, j)] if axis == 0 else [(i - 1, j), (i, j)]
                admissible = [(int(x), int(y)) for x, y in neighbors
                              if 0 <= x < complete.shape[0] and 0 <= y < complete.shape[1] and complete[x, y]]
                if not admissible:
                    continue
                t = (level - v0[i, j]) / (v1[i, j] - v0[i, j])
                x = lon[lo][i, j] * (1 - t) + lon[hi][i, j] * t
                y = lat[lo][i, j] * (1 - t) + lat[hi][i, j] * t
                support[(round(float(x), 6), round(float(y), 6))].update(admissible)
        vertex_count, segment_count = 0, 0
        for line in feature['geometry']['coordinates']:
            assert len(line) >= 2
            for point in line:
                assert tuple(point) in support, 'Contour vertex lacks a valid source edge'
                vertex_count += 1
            for a, b in zip(line[:-1], line[1:]):
                assert support[tuple(a)] & support[tuple(b)], 'Contour segment lacks a complete valid source quad'
                segment_count += 1
        per_level.append({'precipitationMm': level, 'verifiedVertices': vertex_count,
                          'verifiedSegments': segment_count, 'unsupportedVertices': 0,
                          'segmentsCrossingInvalidQuads': 0})
    labels = json.loads((output / 'precipitation-isohyet-labels.json').read_text(encoding='utf-8'))
    for label in labels:
        feature = next(f for f in collection['features'] if f['properties']['id'] == label['id'])
        assert label['coordinates'] in feature['geometry']['coordinates'][label['lineIndex']]
    result = {'passed': True, 'method': 'Read emitted PNG/GeoJSON/label files, reconstruct class-layer union, independently recompute source-edge coordinates, and require every emitted segment to share a complete valid source quad.',
              'compositeAndClassPixelsAgree': True, 'classMasksAreDisjoint': True,
              'classMaskUnionEqualsComposite': True, 'contours': per_level,
              'allLabelCoordinatesExistOnTheirContours': True}
    write_json(output / 'precipitation-independent-verification.json', result)


def preview(output, features, labels, destination):
    """Static QA artifact: map registration, source contours, and US palette."""
    canvas = Image.new('RGB', (900, 688), '#f7f8f3')
    raster = Image.open(output / 'annual-precipitation-1991-2020-locator.png').resize((900, 580), Image.Resampling.NEAREST)
    canvas.paste('#e4eff0', (0, 40, 900, 620))
    canvas.paste(raster, (0, 40), raster)
    draw = ImageDraw.Draw(canvas)
    font_path = Path('C:/Windows/Fonts/arial.ttf')
    font = ImageFont.truetype(str(font_path), 12) if font_path.exists() else ImageFont.load_default()
    title = ImageFont.truetype(str(font_path), 17) if font_path.exists() else font
    draw.text((14, 10), 'Canada annual total precipitation | 1991-2020 | source-derived isohyets', font=title, fill='#234957')
    for feature in features:
        width = 2 if feature['properties']['major'] else 1
        for line in feature['geometry']['coordinates']:
            draw.line([(float(project(p)[0]), float(project(p)[1]) + 40) for p in line], fill='#527985', width=width)
    for label in labels:
        xy = project(label['coordinates'])
        draw.text((float(xy[0]), float(xy[1]) + 40), f"{label['precipitation_mm']} mm", font=font,
                  fill='#234957', stroke_width=2, stroke_fill='#ffffff', anchor='mm')
    titles = ['<250', '250-500', '500-750', '750-1000', '1000-1500', '1500-2000', '>=2000']
    for i, (color, text) in enumerate(zip(COLORS, titles)):
        x = 14 + i * 125
        draw.rectangle((x, 632, x + 24, 647), fill=color)
        draw.text((x + 29, 633), text, font=font, fill='#234957')
    draw.text((14, 662), 'mm/year; rain + snow water equivalent; approximately 10 km. QA locator; national-outline clipping is applied by the app.', font=font, fill='#45616a')
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, optimize=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--research-root', type=Path, default=ROOT.parent / 'canada-water-research')
    parser.add_argument('--output', type=Path, default=ROOT / 'public/assets/atlas/canada-water-v2')
    parser.add_argument('--preview-output', type=Path, help='Optional private QA PNG destination; no preview is emitted by default')
    args = parser.parse_args()
    source, output = args.research_root.resolve() / 'precipitation', args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    us_ts = ROOT / 'src/data/atlas/water-resources.ts'
    us_builder = ROOT / 'scripts/build-water-assets.py'
    ts_bands = us_ts.read_text(encoding='utf-8').split('export const precipitationBands=')[1].split('] as const;')[0]
    assert re.findall(r"id:'([^']+)'", ts_bands) == IDS
    assert re.findall(r"color:'([^']+)'", ts_bands) == COLORS
    assignments = {node.targets[0].id: ast.literal_eval(node.value)
                   for node in ast.parse(us_builder.read_text(encoding='utf-8')).body
                   if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
                   and node.targets[0].id in ['thresholds', 'colors', 'ids']}
    assert assignments == {'ids': IDS, 'colors': COLORS, 'thresholds': THRESHOLDS}
    grid_path = source / 'annual-precipitation-1991-2020-grid.npz'
    points_path = source / 'annual-valid-grid-points.npy'
    assert sha(grid_path) == GRID_HASH, 'Changed pinned annual grid'
    assert sha(points_path) == POINT_HASH, 'Changed pinned source points'
    z, points = np.load(grid_path), np.load(points_path)
    annual, valid = z['annual_mm'], z['valid']
    lat, lon = z['lat'].astype('f8'), z['lon'].astype('f8')
    lon = -110 + ((lon + 110 + 180) % 360 - 180)
    assert annual.shape == valid.shape == lat.shape == lon.shape == (621, 470)
    assert np.array_equal(valid, z['land_mask']) and int(valid.sum()) == 100945
    assert np.all(np.isfinite(annual[valid])) and np.all(annual[valid] >= 0)
    assert np.all(z['valid_year_counts'][:, valid] == 30)
    flat_ids = points[:, 0].astype('i8')
    assert np.array_equal(np.flatnonzero(valid), flat_ids)
    classes = np.digitize(annual, THRESHOLDS).astype('u1')
    point_classes = np.digitize(points[:, 3], THRESHOLDS)
    assert np.array_equal(classes[valid], point_classes), 'Float32 rounding changed a source band'
    counts = [int((valid & (classes == i)).sum()) for i in range(7)]
    assert counts[:5] == [6841, 34612, 27489, 13132, 16269]
    assert counts[5] + counts[6] == 2602 and counts[6] > 0

    clon, clat = corners(lon), corners(lat)
    px, py = (clon + 145) / 95 * WIDTH, (85 - clat) / 45 * HEIGHT
    owner_image = Image.new('L', (WIDTH, HEIGHT), 0)
    painter = ImageDraw.Draw(owner_image)
    # One categorical ownership raster produces mutually exclusive class images.
    # Last-painted boundary pixel precedence is the adopted v1 renderer's order.
    for i, j in zip(*np.where(valid)):
        poly = [(float(px[i, j]), float(py[i, j])), (float(px[i + 1, j]), float(py[i + 1, j])),
                (float(px[i + 1, j + 1]), float(py[i + 1, j + 1])), (float(px[i, j + 1]), float(py[i, j + 1]))]
        painter.polygon(poly, fill=int(classes[i, j]) + 1)
    owner = np.array(owner_image)
    palette = np.array([[0, 0, 0]] + [list(bytes.fromhex(c[1:])) for c in COLORS], dtype='u1')
    rgba = np.zeros((HEIGHT, WIDTH, 4), dtype='u1')
    rgba[:, :, :3], rgba[:, :, 3] = palette[owner], np.where(owner, 255, 0)
    Image.fromarray(rgba).save(output / 'annual-precipitation-1991-2020-locator.png', optimize=True)
    for i in range(7):
        layer = rgba.copy()
        layer[owner != i + 1] = 0
        Image.fromarray(layer).save(output / f'annual-precipitation-1991-2020-class-{i}.png', optimize=True)

    features, contour_evidence = [], []
    for level in THRESHOLDS:
        lines, evidence = source_crossings(annual, valid, lon, lat, level)
        assert lines and evidence['maximumEdgeThresholdResidualMm'] < 1e-9
        features.append({'type': 'Feature', 'properties': {'id': str(level), 'precipitation_mm': level,
                         'major': level in [1000, 1500], 'kind': 'isohyet', 'unit': 'mm/year'},
                         'geometry': {'type': 'MultiLineString', 'coordinates': lines}})
        contour_evidence.append(evidence)
    collection = {'type': 'FeatureCollection', 'features': features}
    geojson_path = output / 'precipitation-isohyets.geojson'
    write_json(geojson_path, collection, compact=True)
    (output / (geojson_path.name + '.gz')).write_bytes(gzip.compress(geojson_path.read_bytes(), compresslevel=9, mtime=0))
    labels = contour_labels(features)
    write_json(output / 'precipitation-isohyet-labels.json', labels)
    for label in labels:
        feature = next(f for f in features if f['properties']['id'] == label['id'])
        assert label['coordinates'] == feature['geometry']['coordinates'][label['lineIndex']][label['vertexIndex']]

    xp = np.floor((lon[valid] + 145) / 95 * WIDTH).astype('i4')
    yp = np.floor((85 - lat[valid]) / 45 * HEIGHT).astype('i4')
    pixel_classes = owner[yp, xp].astype('i2') - 1
    center_match = pixel_classes == classes[valid]
    assert np.all(owner[yp, xp] > 0)
    old_alpha = np.array(Image.open(source / 'annual-precipitation-1991-2020-locator.png'))[:, :, 3]
    assert np.array_equal(rgba[:, :, 3], old_alpha), 'Changed adopted locator coverage'
    pixel_counts = [int((owner == i + 1).sum()) for i in range(7)]
    probes = []
    # Closest representable original point on each side of every threshold.
    for level in THRESHOLDS:
        for side, eligible in [('below', points[:, 3] < level), ('at-or-above', points[:, 3] >= level)]:
            k = int(np.argmin(np.where(eligible, abs(points[:, 3] - level), np.inf)))
            i, j = np.unravel_index(flat_ids[k], annual.shape)
            expected = int(classes[i, j])
            observed = int(pixel_classes[k])
            probes.append({'thresholdMm': level, 'side': side, 'flatSourceCellId': int(flat_ids[k]),
                           'sourceIndex': [int(i), int(j)], 'coordinates': [float(lon[i, j]), float(lat[i, j])],
                           'sourceAnnualMmFloat64': float(points[k, 3]), 'gridAnnualMmFloat32': float(annual[i, j]),
                           'band': IDS[expected], 'color': COLORS[expected], 'pixel': [int(xp[k]), int(yp[k])],
                           'pixelBand': IDS[observed], 'pixelColor': COLORS[observed],
                           'pixelMatch': expected == observed})
    assert all(p['pixelMatch'] for p in probes), 'Threshold probe pixel mismatch'
    boundary_values = [v for threshold in THRESHOLDS for v in [np.nextafter(float(threshold), -np.inf), float(threshold), np.nextafter(float(threshold), np.inf)]]
    expected_boundary = [v for i in range(6) for v in [i, i + 1, i + 1]]
    assert np.digitize(boundary_values, THRESHOLDS).tolist() == expected_boundary
    # Analytical contour fixture: one linear crossing; a missing corner removes its entire quad.
    fixture = np.array([[0., 0.], [2., 2.]])
    gx, gy = np.meshgrid(np.arange(2), np.arange(2), indexing='ij')
    synthetic_lines, _ = source_crossings(fixture, np.ones((2, 2), dtype=bool), gx, gy, 1)
    assert len(synthetic_lines) == 1 and all(p[0] == .5 for p in synthetic_lines[0])
    fixture_valid = np.ones((2, 2), dtype=bool)
    fixture_valid[0, 0] = False
    assert source_crossings(fixture, fixture_valid, gx, gy, 1)[0] == []
    # Two saddle signs must preserve the complete quad and yield two separate segments.
    fixtures = [(np.array([[2., -1.], [-1., 2.]]), [((.666667, 0.), (1., .333333)), ((.333333, 1.), (0., .666667))]),
                (np.array([[1., -2.], [-2., 1.]]), [((.333333, 0.), (0., .333333)), ((1., .666667), (.666667, 1.))])]
    for fixture, expected_pairs in fixtures:
        saddle_lines, saddle_stats = source_crossings(fixture, np.ones((2, 2), dtype=bool), gx, gy, 0)
        assert len(saddle_lines) == 2 and saddle_stats['saddleQuads'] == 1
        assert {frozenset(tuple(p) for p in line) for line in saddle_lines} == {frozenset(pair) for pair in expected_pairs}

    verification = {'passed': True, 'sourceGridSha256': GRID_HASH, 'sourcePointSha256': POINT_HASH,
                    'sourceCellCount': int(valid.sum()), 'classSourceCellCounts': counts,
                    'allSourcePointsAgreeWithFloat32GridBands': True, 'allNonlandCellsExcluded': True,
                    'sourceMissingLandCells': int((z['land_mask'] & ~valid).sum()),
                    'allOriginalSourceCellsHave30ValuesPerCalendarMonth': True,
                    'paletteAndThresholdsMatchUsSourceFiles': True, 'thresholdBoundaryConvention': 'lower inclusive; upper exclusive',
                    'exactThresholdAndAdjacentFloatAssertions': 18,
                    'rasterOpaquePixels': int((owner > 0).sum()), 'classOpaquePixelCounts': pixel_counts,
                    'classLayersMutuallyExclusive': True, 'classLayerUnionEqualsCompositeAlpha': True,
                    'rasterAlphaExactlyMatchesAdoptedV1': True, 'rasterSourceCenterCount': len(center_match),
                    'rasterSourceCenterMatches': int(center_match.sum()),
                    'rasterSourceCenterMatchPercent': float(center_match.mean() * 100),
                    'rasterBoundaryRoundingNote': 'Finite-resolution Pillow source-footprint painting can assign an adjacent class to a center pixel near a shared cell edge; all original cell values and classes remain unchanged.',
                    'thresholdSourceAndPixelProbes': probes, 'contours': contour_evidence,
                    'contourSyntheticFixturesPassed': ['linear edge threshold', 'missing corner excludes quad', 'both bilinear saddle determinant signs'],
                    'labels': len(labels), 'allLabelsAreExactEmittedContourVertices': True}
    write_json(output / 'precipitation-parity-verification.json', verification)
    render = {'width': WIDTH, 'height': HEIGHT, 'boundsLonLat': BOUNDS,
              'targetCRS': 'EPSG:4326 equirectangular affine locator, y decreasing with latitude',
              'targetParentSize': [900, 580], 'parentTransform': 'x=(longitude+145)/95*900; y=(85-latitude)/45*580',
              'imageFit': 'Draw full image at x=0,y=0,width=900,height=580, preserveAspectRatio=none.',
              'nativeResolution': 'Approximately 10 km; raster size does not increase scientific resolution.',
              'resampling': 'Categorical source-cell footprint painting using the adopted source-coordinate corner estimates. No interpolated or fabricated raster precipitation values. Alpha=0 beyond painted valid source cells.',
              'clipRequirement': 'Apply the existing trustworthy Canada outline to raster and contour layers.',
              'classThresholdsMm': THRESHOLDS, 'classIds': IDS, 'classColors': COLORS,
              'classSourceCellCounts': counts, 'classOpaquePixelCounts': pixel_counts,
              'classRasterPolicy': 'All class layers are derived from the same final categorical ownership raster, so boundary pixels belong to one class only.',
              'contourMethod': 'Marching squares on source-center quads with all four annual values valid. Threshold crossings interpolate only along valid source edges; saddle connectivity uses the bilinear asymptotic decider. No smoothing, simplification, gap filling, or extrapolation.',
              'contourCoordinateDigits': 6, 'contourThresholdsMm': THRESHOLDS, 'majorContoursMm': [1000, 1500],
              'labelMethod': 'Permanent label anchors are existing vertices on long source-derived contour lines.'}
    write_json(output / 'precipitation-render-summary.json', render)
    verify_emitted_assets(output, annual, valid, lon, lat)
    if args.preview_output is not None:
        preview(output, features, labels, args.preview_output.resolve())
    snapshots = {'source-provenance.json': 'precipitation-source-provenance.json',
                 'annual-precipitation-summary.json': 'precipitation-summary.json',
                 'range-manifest.json': 'precipitation-range-manifest.json'}
    for name, destination in snapshots.items():
        (output / destination).write_bytes((source / name).read_bytes())
    source_records = [{'file': f'precipitation/{name}', 'bytes': (source / name).stat().st_size, 'sha256': sha(source / name)}
                      for name in [grid_path.name, points_path.name, 'render_annual_grid.py', *snapshots,
                                   'open-government-licence.html', 'eccc-v2-index.html']]
    source_provenance = json.loads((source / 'source-provenance.json').read_text(encoding='utf-8'))
    official_verification = output / 'precipitation-official-url-verification.json'
    if official_verification.exists():
        official_records = json.loads(official_verification.read_text(encoding='utf-8-sig'))
        assert all(r.get('status') == 200 for r in official_records)
        for record in official_records:
            if record.get('method') == 'HEAD':
                assert record['contentLength'] == source_provenance['sourceBytes']
                assert record['etag'] == source_provenance['sourceETag']
                assert record['lastModified'] == source_provenance['sourceLastModifiedHttp']
            if record.get('snapshotFile'):
                assert record['sha256'] == sha(args.research_root.resolve() / record['snapshotFile'])
    emitted_files = [f'annual-precipitation-1991-2020-class-{i}.png' for i in range(7)] + [
        'annual-precipitation-1991-2020-locator.png', 'precipitation-isohyets.geojson',
        'precipitation-isohyets.geojson.gz', 'precipitation-isohyet-labels.json',
        'precipitation-parity-verification.json', 'precipitation-independent-verification.json',
        'precipitation-render-summary.json', *snapshots.values()]
    if official_verification.exists():
        emitted_files.append(official_verification.name)
    manifest = {'id': 'canada-water-v2', 'scope': 'Precipitation parity assets only', 'prepared': '2026-10-05',
                'accessed': '2026-10-02', 'projection': {'type': 'affine-epsg4326', 'bounds': BOUNDS,
                'width': 900, 'height': 580, 'transform': render['parentTransform']},
                'precipitation': {'source': source_provenance,
                'period': [1991, 2020], 'unit': 'mm/year', 'sourceCellCount': int(valid.sum()),
                'missingLandCellCount': 0, 'bands': [{'id': id, 'color': COLORS[i],
                'lowerBoundMm': 0 if i == 0 else THRESHOLDS[i - 1],
                'upperBoundExclusiveMm': THRESHOLDS[i] if i < 6 else None,
                'sourceCellCount': counts[i], 'opaquePixelCount': pixel_counts[i]} for i, id in enumerate(IDS)],
                'rendering': render, 'contourUrl': '/assets/atlas/canada-water-v2/precipitation-isohyets.geojson',
                'labelUrl': '/assets/atlas/canada-water-v2/precipitation-isohyet-labels.json'},
                'preparation': {'script': 'scripts/prepare-canada-precipitation-parity.py', 'scriptSha256': sha(Path(__file__)),
                'numpyVersion': np.__version__, 'pillowVersion': Image.__version__,
                'command': 'python scripts/prepare-canada-precipitation-parity.py --research-root ../canada-water-research'},
                'sourceIntermediates': source_records,
                'usParityReferences': [{'file': str(path.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(path)} for path in [us_ts, us_builder]],
                'assets': [{'file': name, 'bytes': (output / name).stat().st_size, 'sha256': sha(output / name)}
                           for name in sorted(emitted_files)]}
    write_json(output / 'manifest.json', manifest)
    print(json.dumps({'output': str(output), 'classSourceCellCounts': counts, 'rasterSourceCenterMatchPercent': verification['rasterSourceCenterMatchPercent'],
                      'contours': [{k: e[k] for k in ['precipitationMm', 'lineCount', 'segments', 'invalidSourceCellSegments']} for e in contour_evidence],
                      'labels': len(labels), 'assets': len(manifest['assets']), 'verificationPassed': True}, indent=2))


if __name__ == '__main__':
    main()
