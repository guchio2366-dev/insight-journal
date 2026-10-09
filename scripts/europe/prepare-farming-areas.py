"""Derive overlapping farming concentration areas from the checked-in source grids.

Requires numpy and shapely. No downloads are performed and source grids are not
rewritten. Each product is processed independently, so genuine overlaps remain.
"""
from pathlib import Path
import gzip
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[2]
# Reuse the project's optional build-time geospatial environment when available.
if (ROOT.parent / 'geo-deps').is_dir():
    sys.path.insert(0, str(ROOT.parent / 'geo-deps'))
import numpy as np
from shapely import contains_xy, make_valid, union_all
from shapely.geometry import Polygon, MultiPolygon, box, mapping, shape
from shapely.ops import transform

ASSETS = ROOT / 'public/assets/atlas/europe'
OUT = ASSETS / 'farming-overview-v2'
OUTPUT = ROOT / 'src/data/atlas/europe/farming-areas.json'
DOMINANT_OUTPUT = ROOT / 'src/data/atlas/europe/farming-dominant-areas.json'
SECONDARY_OUTPUT = ROOT / 'src/data/atlas/europe/farming-secondary-areas.json'
BOUNDS = [-25, 32, 65, 73]
ROWS, COLS = 492, 1080
STEP = 1 / 12
QUANTILE = .80
SMOOTH_RADIUS = 3
SMOOTH_RADIUS_BY_PRODUCT = {'maize': 2}
MIN_NEIGHBOR_FRACTION = .55
MIN_AREA_KM2 = 750
# Irrigated rice and citrus occupy smaller, discontinuous concentrations.
# Preserve those source-supported regions without widening their value cutoff.
PRODUCT_RULES = {'rice': (0.45, 500), 'citrus': (0.45, 500)}
# The overview is read at roughly 600–900 CSS pixels across Europe. Retain
# source-supported components while dropping sub-pixel stair steps at that scale.
SIMPLIFY_DEGREES = .16
# The overview is a belt map, not a parcel map. Close narrow gaps between
# adjacent source-supported cells before simplifying, while retaining every
# disconnected concentration that passes the source threshold and area rule.
BELT_CLOSE_DEGREES = .24
RADIUS_KM = 6371.0088
OVERVIEW_CROPS = ('wheat', 'barley', 'maize', 'potato', 'sugarbeet', 'rapeseed')
inputs = []


def read(path, **metadata):
    raw = path.read_bytes()
    inputs.append(dict(path=path.relative_to(ROOT).as_posix(),
                       sha256=hashlib.sha256(raw).hexdigest(), **metadata))
    return raw


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(data, ensure_ascii=False, separators=(',', ':'),
                      allow_nan=False) + '\n').encode('utf-8')
    path.write_bytes(raw)
    return dict(path=path.relative_to(ROOT).as_posix(),
                sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))


def box_mean(values, radius):
    """Separable square moving mean; out-of-frame cells carry no support."""
    result = values.astype('float64')
    for axis in (0, 1):
        padding = [(0, 0), (0, 0)]
        padding[axis] = (radius, radius)
        cumulative = np.cumsum(np.pad(result, padding), axis=axis)
        padding[axis] = (1, 0)
        cumulative = np.pad(cumulative, padding)
        high, low = [slice(None), slice(None)], [slice(None), slice(None)]
        high[axis], low[axis] = slice(2 * radius + 1, None), slice(None, -2 * radius - 1)
        result = (cumulative[tuple(high)] - cumulative[tuple(low)]) / (2 * radius + 1)
    return result


def polygons(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == 'Polygon':
        return [geometry]
    if hasattr(geometry, 'geoms'):
        return [part for child in geometry.geoms for part in polygons(child)]
    # Topology repair may also return collapsed boundary lines. They are not
    # cultivation or grazing areas and must never be drawn as polygons.
    return []


def area_km2(geometry):
    # The spherical cylindrical equal-area transform gives an area in km².
    # It is used only for the small-component filter, never for farm statistics.
    def project(lon, lat, z=None):
        return (RADIUS_KM * np.radians(lon),
                RADIUS_KM * np.sin(np.radians(lat)))
    return transform(project, geometry).area


def grid_geometry(mask):
    """Union exact horizontal runs of source cells; no point buffers or circles."""
    runs = []
    for row in range(ROWS):
        padded = np.pad(mask[row].astype('int8'), (1, 1))
        edges = np.diff(padded)
        for left, right in zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)):
            runs.append(box(BOUNDS[0] + left * STEP, BOUNDS[3] - (row + 1) * STEP,
                            BOUNDS[0] + right * STEP, BOUNDS[3] - row * STEP))
    return union_all(runs)


def rounded_coordinates(value):
    if isinstance(value, (tuple, list)):
        return [rounded_coordinates(item) for item in value]
    return round(float(value), 6)


def main():
    countries_path = ROOT / 'src/data/atlas/europe-countries.json'
    countries = json.loads(read(countries_path, role='target-country land boundary'))
    targets = [feature for feature in countries['features']
               if feature['properties']['kind'] == 'europe']
    land = make_valid(union_all([shape(feature['geometry']) for feature in targets]))
    land = land.intersection(box(*BOUNDS))
    longitudes = BOUNDS[0] + (np.arange(COLS) + .5) * STEP
    latitudes = BOUNDS[3] - (np.arange(ROWS) + .5) * STEP
    longitude_grid, latitude_grid = np.meshgrid(longitudes, latitudes)
    on_land = contains_xy(land, longitude_grid, latitude_grid)
    config = json.loads(read(ROOT / 'src/data/atlas/europe/crop-overview.json', role='crop colors and names'))
    products = [dict(crop, kind='crop', unit='収穫面積 ha / 格子', period='SPAM 2020 v2r2')
                for crop in config['crops']]
    products += [dict(id=id, name=name, color=color, kind='livestock',
                      unit='羽/km²' if id == 'chicken' else '頭/km²', period='FAO GLW4 2020')
                 for id, name, color in [('cattle', '牛', '#593633'), ('pig', '豚', '#694e94'),
                                        ('chicken', '鶏', '#3d7171'), ('sheep', '羊', '#70733a')]]
    features, records = [], []
    overview_grids, overview_masks = {}, {}
    for product in products:
        id = product['id']
        neighbor_fraction, minimum_area = PRODUCT_RULES.get(id, (MIN_NEIGHBOR_FRACTION, MIN_AREA_KM2))
        path = ASSETS / ('wheat-v1/values.bin.gz' if id == 'wheat' else f'farming-v1/{id}.bin.gz')
        raw = read(path, id=id, role='original 5-arc-minute quantity grid')
        grid = np.frombuffer(gzip.decompress(raw), dtype='<f4').reshape(ROWS, COLS)
        positive = on_land & np.isfinite(grid) & (grid > 0)
        assert np.any(positive), id
        threshold = float(np.quantile(grid[positive], QUANTILE))
        high = positive & (grid >= threshold)
        # Require local concentration and direct positive evidence in each cell.
        # Missing and zero source cells do not acquire evidence from neighbours.
        smoothing_radius = SMOOTH_RADIUS_BY_PRODUCT.get(id, SMOOTH_RADIUS)
        neighborhood = box_mean(high, smoothing_radius)
        candidate = high & (neighborhood >= neighbor_fraction)
        if id in OVERVIEW_CROPS:
            overview_grids[id] = grid.copy()
            overview_masks[id] = candidate.copy()
        exact = grid_geometry(candidate).intersection(land)
        source_parts = polygons(exact)
        kept = [part for part in source_parts if area_km2(part) >= minimum_area]
        assert kept, f'No supported area remains for {id}'
        # Simplification only generalizes the edges. Clip once more so it cannot
        # bleed into the sea or any context country surrounding Europe.
        joined = union_all(kept)
        belt = make_valid(joined.buffer(BELT_CLOSE_DEGREES, quad_segs=3).buffer(-BELT_CLOSE_DEGREES, quad_segs=3))
        simplified = make_valid(belt.simplify(SIMPLIFY_DEGREES, preserve_topology=True))
        clipped = simplified.intersection(land)
        kept = [part for part in polygons(clipped) if area_km2(part) >= minimum_area]
        kept.sort(key=lambda part: (-area_km2(part), part.bounds))
        geometry = MultiPolygon(kept)
        geometry_json = mapping(geometry)
        geometry_json['coordinates'] = rounded_coordinates(geometry_json['coordinates'])
        # Coordinate rounding can create touching edges. Repair that topology
        # without bridging separate concentration areas or adding buffers.
        geometry = make_valid(union_all(polygons(make_valid(shape(geometry_json)))))
        # Remove tiny repair fragments and pieces whose simplified outline has
        # lost every high-value source centre. Missing evidence stays absent.
        supported_parts = []
        for part in polygons(geometry):
            if area_km2(part) < minimum_area:
                continue
            west, south, east, north = part.bounds
            left, right = max(0, math.floor((west + 25) * 12)), min(COLS, math.ceil((east + 25) * 12))
            top, bottom = max(0, math.floor((73 - north) * 12)), min(ROWS, math.ceil((73 - south) * 12))
            mask = contains_xy(part, longitude_grid[top:bottom, left:right], latitude_grid[top:bottom, left:right])
            if np.any(mask & high[top:bottom, left:right]):
                supported_parts.append(part)
        kept = supported_parts
        geometry = make_valid(union_all(kept))
        geometry_json = mapping(geometry)
        assert geometry.is_valid and not geometry.is_empty, id
        assert geometry.difference(land.buffer(.000002)).is_empty, id
        # Label the region with the greatest represented source quantity. This
        # keeps a broad region of tiny values from displacing an actual main
        # concentration. These sums are only for label placement, never totals
        # reported to readers or substituted for official country statistics.
        cell_areas = RADIUS_KM ** 2 * math.radians(STEP) * (
            np.sin(np.radians(latitudes + STEP / 2)) - np.sin(np.radians(latitudes - STEP / 2)))
        weights = np.where(positive, grid, 0) * (cell_areas[:, None] if product['kind'] == 'livestock' else 1)
        label_regions = []
        for part in polygons(geometry):
            west, south, east, north = part.bounds
            left, right = max(0, math.floor((west + 25) * 12)), min(COLS, math.ceil((east + 25) * 12))
            top, bottom = max(0, math.floor((73 - north) * 12)), min(ROWS, math.ceil((73 - south) * 12))
            mask = contains_xy(part, longitude_grid[top:bottom, left:right], latitude_grid[top:bottom, left:right])
            score = float(np.sum(weights[top:bottom, left:right][mask]))
            label_regions.append((score, part))
        label_regions.sort(key=lambda item: (-item[0], item[1].bounds))
        supported_components = len(label_regions)
        # Keep every source-supported concentration. A fixed top-five cutoff
        # hid French and German wheat regions before the reader selected wheat.
        # Generalize outlines and control visual weight at rendering time.
        kept = [part for _, part in label_regions]
        geometry = make_valid(union_all(kept))
        geometry_json = mapping(geometry)
        label_region = label_regions[0][1]
        in_region = contains_xy(label_region, longitude_grid, latitude_grid)
        local_threshold = max(threshold, float(np.quantile(grid[positive & in_region], .90)))
        rows, cols = np.where(high & in_region & (grid >= local_threshold))
        assert len(rows), f'No source-supported label position for {id}'
        center = label_region.representative_point()
        distance = ((longitudes[cols] - center.x) * math.cos(math.radians(center.y))) ** 2 + (latitudes[rows] - center.y) ** 2
        chosen = int(np.argmin(distance))
        row, col = int(rows[chosen]), int(cols[chosen])
        label = [round(float(longitudes[col]), 6), round(float(latitudes[row]), 6)]
        properties = dict(product, threshold=threshold, labelCoordinate=label)
        features.append(dict(type='Feature', properties=properties, geometry=geometry_json))
        record = dict(id=id, threshold=threshold, smoothingRadiusCells=smoothing_radius, minimumNeighborFraction=neighbor_fraction,
                      minimumComponentAreaKm2=minimum_area, positiveCells=int(np.sum(positive)),
                      aboveThresholdCells=int(np.sum(high)), candidateCells=int(np.sum(candidate)),
                      originalComponents=len(source_parts), retainedComponents=len(kept),
                      supportedComponentsBeforeSelection=supported_components,
                      approximateDisplayAreaKm2=round(area_km2(geometry), 2),
                      labelSource=dict(row=row, column=col, value=float(grid[row, col])),
                      countryCodes=[feature['properties']['code'] for feature in targets
                                    if geometry.intersection(shape(feature['geometry'])).area > 1e-7])
        records.append(record)
        print(id, 'threshold', round(threshold, 3), 'components', len(kept),
              'display km2', record['approximateDisplayAreaKm2'], flush=True)
    output = write(OUTPUT, dict(type='FeatureCollection', features=features))
    # Six SPAM crop values all use harvested hectares per source cell. At the
    # overview scale, assign each supported cell to the largest locally
    # smoothed harvested area. This is a categorical display of the six
    # included products, not total harvest or an assertion that only one crop
    # grows there. Full overlapping concentration outlines remain above.
    scores = np.stack([box_mean(np.where(overview_masks[id], overview_grids[id], 0), 3)
                       for id in OVERVIEW_CROPS])
    for index, id in enumerate(OVERVIEW_CROPS):
        scores[index, ~overview_masks[id]] = -1
    winner = np.argmax(scores, axis=0)
    has_winner = np.max(scores, axis=0) >= 0
    dominant_features, dominant_records = [], []
    for index, id in enumerate(OVERVIEW_CROPS):
        mask = has_winner & (winner == index)
        exact = grid_geometry(mask).intersection(land)
        supported = [part for part in polygons(exact) if area_km2(part) >= MIN_AREA_KM2]
        assert supported, f'No dominant display area for {id}'
        geometry = make_valid(union_all(supported).simplify(.08, preserve_topology=True)).intersection(land)
        geometry_json = mapping(geometry)
        geometry_json['coordinates'] = rounded_coordinates(geometry_json['coordinates'])
        retained_cells = mask & contains_xy(geometry, longitude_grid, latitude_grid)
        assert retained_cells.any(), f'No label cell remains in dominant area for {id}'
        rows, cols = np.where(retained_cells)
        best = int(np.argmax(overview_grids[id][retained_cells]))
        properties = dict(next(feature['properties'] for feature in features if feature['properties']['id'] == id))
        properties['labelCoordinate'] = [round(float(longitudes[cols[best]]), 6), round(float(latitudes[rows[best]]), 6)]
        dominant_features.append(dict(type='Feature', properties=properties, geometry=geometry_json))
        dominant_records.append(dict(id=id, retainedComponents=len(supported), candidateCells=int(mask.sum()),
                                     approximateDisplayAreaKm2=round(area_km2(geometry), 2)))
        print(id, 'dominant cells', int(mask.sum()), 'components', len(supported), flush=True)
    dominant_features.extend(feature for feature in features
                             if feature['properties']['kind'] == 'crop' and feature['properties']['id'] not in OVERVIEW_CROPS)
    dominant_output = write(DOMINANT_OUTPUT, dict(type='FeatureCollection', features=dominant_features))
    # A one-color ground keeps the map legible, while each product's dashed
    # secondary contour restores every sizeable concentration that would be
    # hidden by that ground color. The full, independently generated source
    # geometry is still used for selection and point hit testing.
    secondary_features, secondary_records = [], []
    for id in OVERVIEW_CROPS:
        full = shape(next(feature['geometry'] for feature in features if feature['properties']['id'] == id))
        ground = shape(next(feature['geometry'] for feature in dominant_features if feature['properties']['id'] == id))
        secondary = make_valid(full.difference(ground.buffer(.015))).intersection(land)
        parts = [part for part in polygons(secondary) if area_km2(part) >= 350]
        if not parts:
            continue
        geometry = make_valid(union_all(parts).simplify(.08, preserve_topology=True)).intersection(land)
        geometry_json = mapping(geometry)
        geometry_json['coordinates'] = rounded_coordinates(geometry_json['coordinates'])
        properties = dict(next(feature['properties'] for feature in features if feature['properties']['id'] == id))
        secondary_features.append(dict(type='Feature', properties=properties, geometry=geometry_json))
        secondary_records.append(dict(id=id, retainedComponents=len(parts),
                                      approximateDisplayAreaKm2=round(area_km2(geometry), 2)))
    secondary_output = write(SECONDARY_OUTPUT, dict(type='FeatureCollection', features=secondary_features))
    write(OUT / 'manifest.json', dict(
        version=2, coordinateReferenceSystem='EPSG:4326', bounds=BOUNDS,
        sourceGrid=dict(width=COLS, height=ROWS, resolutionDegrees=STEP,
                        encoding='gzip little-endian float32', nodata=-1),
        threshold=dict(quantile=QUANTILE, population='各品目の欧州対象国の陸域内にある正値の元格子',
                       meaning='品目ごとの収穫面積または飼養密度の第80百分位'),
        processing=dict(smoothing='閾値以上の格子の割合を原則7×7格子（トウモロコシは5×5）で平均し、原則55%以上の場所を選ぶ。米と柑橘類は45%以上。中心格子も第80百分位以上の値が必要。',
                        dominantOverview='穀物・畑作の色面だけ、収録済み6作物の候補元格子を同じha/格子の7×7近傍平均で比べ、最大の作物に一色を割り当てる。色面に隠れる別品目の集中域はその品目色の点線輪郭で同時表示する。原則750km²未満の孤立面を省き、輪郭を0.08度で簡略化する。全品目の重複した集中域と選択時輪郭は元図に保持する。',
                        secondaryContours='品目ごとの元集中域から同じ品目の色面を除いた残りのうち、350km²以上の面を点線輪郭にする。色面に隠れた別品目や周辺の集中域を見せる補助表示であり、栽培境界ではない。',
                        smoothingRadiusCells=SMOOTH_RADIUS, minimumNeighborFraction=MIN_NEIGHBOR_FRACTION,
                        smoothingRadiusByProduct=SMOOTH_RADIUS_BY_PRODUCT,
                        smoothingRadiusReason='トウモロコシはポー平原の高値格子（8.708333°E, 45.291667°N）が7×7近傍では53.1%で切れるため、元の5×5近傍（64%）を保ち、同地点を根拠のある面として残す。',
                        minimumComponentAreaKm2=MIN_AREA_KM2,
                        productRules={id: dict(minimumNeighborFraction=rule[0], minimumComponentAreaKm2=rule[1]) for id, rule in PRODUCT_RULES.items()},
                        productRuleReason='米と柑橘類は小さく分かれた産地を残すため、近隣比率と最小面積のみ緩和する。元格子の第80百分位は全品目で維持する。',
                        concentrationSelection='各品目について元格子の閾値・近傍比率・最小面積と最終証拠条件を満たす集中域をすべて保持する。品目内の上位件数では切り詰めない。品目間の生産額順位や国別統計ではない。',
                        minimumAreaMethod='半径6371.0088kmの球面円筒等積投影による概算面積',
                        simplifyToleranceDegrees=SIMPLIFY_DEGREES, beltClosingRadiusDegrees=BELT_CLOSE_DEGREES,
                        beltClosingMeaning='概略図の表示縮尺で隣接する元格子由来の面の細い隙間を閉じ、主要な帯を読みやすくする。離れた高値集中域を件数で選別しない。面積や輪郭は農地境界・収穫面積の集計値ではない。',
                        coordinatePrecisionDecimalPlaces=6,
                        precisionTopology='隣接する元面の狭い隙間を描画尺度で閉じ、6桁への丸め後にmake_validとunion_allで接触辺を修復。離れた集中域を任意の線で結ばない。',
                        finalEvidence='修復後の原則750km²未満（米・柑橘類は500km²未満）の面と、第80百分位以上の元格子中心を一つも含まない面は表示しない。',
                        clipping='europe-countries.jsonでkind=europeの国を結合し、表示範囲と陸域で切り抜く。周辺国は含めない。',
                        overlaps='16品目をそれぞれ独立に処理し、分布が重なる部分も残す。最大品目だけに割り当てない。',
                        labelPlacement='分布面内の元格子の数量が最大の面を選び、その面の正値の第90百分位以上かつ全体閾値以上の元セル中心を使う。面の比較は作物で収穫面積、家畜で密度×球面格子面積を使う。数量集計は名称配置だけに用い、統計値として提示しない。',
                        sourceMutation=False),
        sources=dict(crops='https://doi.org/10.7910/DVN/SWPENT',
                     livestock='https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/',
                     boundaries='https://www.naturalearthdata.com/'),
        licenses=dict(crops='IFPRI Dataverse CC BY 4.0', livestock='FAO GLW4 CC BY 4.0',
                      boundaries='Natural Earth public domain'),
        limitations=[
            '主要な集中帯を読むための概略図。条件を満たす集中域を件数で切り詰めない。耕地・牧場の実際の境界や全分布を示さない。',
            '帯の細い隙間の補間と輪郭の簡略化により元格子との境界にずれが生じる。格子の数量・0・欠測は変更せず、品目別の詳細図で確認する。',
            '色の面積や輪郭の大小から、品目間の生産量・収穫面積・飼養頭羽数を比較できない。',
            '原則750km²未満（米・柑橘類は500km²未満）の孤立域は省略するが、離れた主産地は一つに結ばず別々の面として残す。',
            'SPAMの収穫面積は複数作期を含む場合があり、耕地面積と一致しない。',
            '収録済みの12作物と牛・豚・鶏・羊のみ。ブドウ・オリーブ単独の格子は未収録。',
            'ロシアは表示枠内の対象国データを含む。統計・地理区分の境界や領有権を判断する図ではない。',
        ], inputs=inputs, products=records, output=output, dominantOverview=dict(output=dominant_output,products=dominant_records,cropIds=OVERVIEW_CROPS),secondaryContours=dict(output=secondary_output,products=secondary_records)))
    print('output', output['bytes'], 'bytes', flush=True)


if __name__ == '__main__':
    main()
