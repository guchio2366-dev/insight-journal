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
BOUNDS = [-25, 32, 65, 73]
ROWS, COLS = 492, 1080
STEP = 1 / 12
QUANTILE = .80
SMOOTH_RADIUS = 2
MIN_NEIGHBOR_FRACTION = .50
MIN_AREA_KM2 = 500
SIMPLIFY_DEGREES = .07
RADIUS_KM = 6371.0088
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
    return [part for child in geometry.geoms for part in polygons(child)]


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
    for product in products:
        id = product['id']
        path = ASSETS / ('wheat-v1/values.bin.gz' if id == 'wheat' else f'farming-v1/{id}.bin.gz')
        raw = read(path, id=id, role='original 5-arc-minute quantity grid')
        grid = np.frombuffer(gzip.decompress(raw), dtype='<f4').reshape(ROWS, COLS)
        positive = on_land & np.isfinite(grid) & (grid > 0)
        assert np.any(positive), id
        threshold = float(np.quantile(grid[positive], QUANTILE))
        high = positive & (grid >= threshold)
        # Require local concentration and direct positive evidence in each cell.
        # Missing and zero source cells do not acquire evidence from neighbours.
        neighborhood = box_mean(high, SMOOTH_RADIUS)
        candidate = positive & (neighborhood >= MIN_NEIGHBOR_FRACTION)
        exact = grid_geometry(candidate).intersection(land)
        source_parts = polygons(exact)
        kept = [part for part in source_parts if area_km2(part) >= MIN_AREA_KM2]
        assert kept, f'No supported area remains for {id}'
        # Simplification only generalizes the edges. Clip once more so it cannot
        # bleed into the sea or any context country surrounding Europe.
        simplified = make_valid(union_all(kept).simplify(SIMPLIFY_DEGREES, preserve_topology=True))
        clipped = simplified.intersection(land)
        kept = [part for part in polygons(clipped) if area_km2(part) >= MIN_AREA_KM2]
        kept.sort(key=lambda part: (-area_km2(part), part.bounds))
        geometry = MultiPolygon(kept)
        geometry_json = mapping(geometry)
        geometry_json['coordinates'] = rounded_coordinates(geometry_json['coordinates'])
        geometry = shape(geometry_json)
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
        label_region = max(label_regions, key=lambda item: item[0])[1]
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
        record = dict(id=id, threshold=threshold, positiveCells=int(np.sum(positive)),
                      aboveThresholdCells=int(np.sum(high)), candidateCells=int(np.sum(candidate)),
                      originalComponents=len(source_parts), retainedComponents=len(kept),
                      approximateDisplayAreaKm2=round(area_km2(geometry), 2),
                      labelSource=dict(row=row, column=col, value=float(grid[row, col])),
                      countryCodes=[feature['properties']['code'] for feature in targets
                                    if geometry.intersection(shape(feature['geometry'])).area > 1e-7])
        records.append(record)
        print(id, 'threshold', round(threshold, 3), 'components', len(kept),
              'display km2', record['approximateDisplayAreaKm2'], flush=True)
    output = write(OUTPUT, dict(type='FeatureCollection', features=features))
    write(OUT / 'manifest.json', dict(
        version=2, coordinateReferenceSystem='EPSG:4326', bounds=BOUNDS,
        sourceGrid=dict(width=COLS, height=ROWS, resolutionDegrees=STEP,
                        encoding='gzip little-endian float32', nodata=-1),
        threshold=dict(quantile=QUANTILE, population='各品目の欧州対象国の陸域内にある正値の元格子',
                       meaning='品目ごとの収穫面積または飼養密度の第80百分位'),
        processing=dict(smoothing='閾値以上の格子の割合を5×5格子で平均し、50%以上の場所を選ぶ。選ばれる中心格子にも正値が必要。',
                        smoothingRadiusCells=SMOOTH_RADIUS, minimumNeighborFraction=MIN_NEIGHBOR_FRACTION,
                        minimumComponentAreaKm2=MIN_AREA_KM2,
                        minimumAreaMethod='半径6371.0088kmの球面円筒等積投影による概算面積',
                        simplifyToleranceDegrees=SIMPLIFY_DEGREES, coordinatePrecisionDecimalPlaces=6,
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
            '主要な集中帯を読むための概略図であり、耕地・牧場の実際の境界や全分布を示さない。',
            '輪郭の簡略化により元格子との境界にずれが生じる。格子の数量・0・欠測は変更せず、品目別の詳細図で確認する。',
            '色の面積や輪郭の大小から、品目間の生産量・収穫面積・飼養頭羽数を比較できない。',
            '500km²未満の孤立域は省略するが、離れた主産地は一つに結ばず別々の面として残す。',
            'SPAMの収穫面積は複数作期を含む場合があり、耕地面積と一致しない。',
            '収録済みの12作物と牛・豚・鶏・羊のみ。ブドウ・オリーブ単独の格子は未収録。',
            'ロシアは表示枠内の対象国データを含む。統計・地理区分の境界や領有権を判断する図ではない。',
        ], inputs=inputs, products=records, output=output))
    print('output', output['bytes'], 'bytes', flush=True)


if __name__ == '__main__':
    main()
