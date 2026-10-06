"""Render a pinned ETOPO2022 relief background in the existing Mexico SVG frame.

Offline only. Requires numpy, shapely and Pillow. The original GeoTIFF and its
exact native float32 Mexico window must match the existing contours provenance.
This renderer exports a visual hillshade, never an elevation/area statistic.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math

import numpy as np
from PIL import Image
from shapely import contains_xy, make_valid
from shapely.geometry import shape
from shapely.ops import transform, unary_union


SOURCE_SHA = '9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e'
GRID_SHA = '47e9c1792e653c05e94058b2b7311a18a7db38c094d47fb0f8a5acfef45c9743'
WIDTH, HEIGHT = 900, 580
PAPER = [245, 241, 220]
AZIMUTH, ALTITUDE, EXAGGERATION = 315, 45, 5
AMBIENT, CONTRAST = 0.65, 0.62


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            value.update(chunk)
    return value.hexdigest()


def load(path):
    return json.loads(path.read_text(encoding='utf8'))


def lambert_functions(p):
    """The GRS80 formulas used by atlas-mexico-projection.mjs, vectorized."""
    rad = math.pi / 180
    flattening = 1 / p['inverseFlattening']
    eccentricity = math.sqrt(2 * flattening - flattening * flattening)
    a = p['semiMajorM']

    def t(phi):
        s = eccentricity * np.sin(phi)
        return np.tan(math.pi / 4 - phi / 2) / ((1 - s) / (1 + s)) ** (eccentricity / 2)

    def m(phi):
        return np.cos(phi) / np.sqrt(1 - eccentricity ** 2 * np.sin(phi) ** 2)

    phi1, phi2 = p['standardParallel1'] * rad, p['standardParallel2'] * rad
    n = (math.log(m(phi1)) - math.log(m(phi2))) / (math.log(t(phi1)) - math.log(t(phi2)))
    f = m(phi1) / (n * t(phi1) ** n)
    rho0 = a * f * t(p['latitudeOrigin'] * rad) ** n

    def forward(lon, lat, z=None):
        lon, lat = np.asarray(lon), np.asarray(lat)
        rho = a * f * t(lat * rad) ** n
        theta = n * (lon - p['centralMeridian']) * rad
        x = p['falseEastingM'] + rho * np.sin(theta)
        y = p['falseNorthingM'] + rho0 - rho * np.cos(theta)
        return (x, y) if z is None else (x, y, z)

    def inverse(x, y):
        dx = np.asarray(x) - p['falseEastingM']
        dy = rho0 - (np.asarray(y) - p['falseNorthingM'])
        rho = np.hypot(dx, dy)
        theta = np.arctan2(dx, dy)
        tt = (rho / (a * f)) ** (1 / n)
        phi = math.pi / 2 - 2 * np.arctan(tt)
        for _ in range(15):
            s = eccentricity * np.sin(phi)
            next_phi = math.pi / 2 - 2 * np.arctan(tt * ((1 - s) / (1 + s)) ** (eccentricity / 2))
            if np.max(np.abs(next_phi - phi)) < 1e-13:
                phi = next_phi
                break
            phi = next_phi
        return p['centralMeridian'] + theta / n / rad, phi / rad

    return forward, inverse


def bilinear(dem, grid, longitude, latitude):
    # Origin denotes upper-left cell edge; data values are at cell centres.
    sx, sy = grid['resolution']
    ox, oy = grid['origin']
    columns = (longitude - ox) / sx - 0.5
    rows = (latitude - oy) / sy - 0.5
    c0, r0 = np.floor(columns).astype(np.int64), np.floor(rows).astype(np.int64)
    inside = (c0 >= 0) & (r0 >= 0) & (c0 + 1 < dem.shape[1]) & (r0 + 1 < dem.shape[0])
    # Clipping only makes array indexing safe. Outside samples stay invalid.
    c = np.clip(c0, 0, dem.shape[1] - 2)
    r = np.clip(r0, 0, dem.shape[0] - 2)
    donors = np.stack([dem[r, c], dem[r, c + 1], dem[r + 1, c], dem[r + 1, c + 1]])
    valid = inside & np.all(np.isfinite(donors) & (donors != grid['noData']), axis=0)
    dx, dy = columns - c0, rows - r0
    result = (donors[0] * (1 - dx) * (1 - dy) + donors[1] * dx * (1 - dy)
              + donors[2] * (1 - dx) * dy + donors[3] * dx * dy)
    result[~valid] = np.nan
    return result, valid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--grid', type=Path, required=True, help='Pinned decoded window JSON')
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    repo = args.repo.resolve()
    contours_path = repo / 'public/assets/atlas/mexico-water-v1/contours.source.json'
    contours = load(contours_path)
    if args.source.stat().st_size != contours['sourceBytes'] or digest(args.source) != SOURCE_SHA:
        raise RuntimeError('Full original NOAA ETOPO2022 hash/size mismatch')
    if contours['sourceSha256'] != SOURCE_SHA or contours['decodedGridSha256'] != GRID_SHA:
        raise RuntimeError('Existing contours do not refer to the pinned original/grid')
    grid = load(args.grid)
    grid_file = args.grid.parent / grid['file']
    if (grid['sourceSha256'] != SOURCE_SHA or grid['sha256'] != GRID_SHA
            or digest(grid_file) != GRID_SHA or grid_file.stat().st_size != 9504000):
        raise RuntimeError('Decoded grid bytes/provenance mismatch')
    if (grid['width'], grid['height'], grid['dtype'], grid['noData']) != (1980, 1200, 'float32-little-endian', -99999):
        raise RuntimeError('Unexpected native grid shape/type/NoData')
    if (grid['geoKeys']['GeographicTypeGeoKey'] != 4326
            or grid['geoKeys']['VerticalCSTypeGeoKey'] != 3855
            or grid['origin'] != [-119, 34]
            or not np.allclose(grid['resolution'], [1 / 60, -1 / 60], rtol=0, atol=1e-14)):
        raise RuntimeError('Unexpected native CRS, cell registration or resolution')
    dem = np.fromfile(grid_file, dtype='<f4').reshape((grid['height'], grid['width'])).astype(np.float64)

    boundary_path = repo / 'src/data/atlas/mexico/geometry.json'
    index_path = repo / 'src/data/atlas/mexico/geometry-index.json'
    boundary, index = load(boundary_path), load(index_path)
    if len(boundary['features']) != 32 or digest(boundary_path) != contours['boundarySha256']:
        raise RuntimeError('Retained INEGI state boundary differs from contours land clip')
    if boundary['metadata'] != index['metadata']:
        raise RuntimeError('State geometry and map frame metadata differ')
    projection = index['metadata']['projection']
    forward, inverse = lambert_functions(projection)
    xmin, ymin, xmax, ymax = index['metadata']['boundsNative']
    # Exactly atlas-mexico-geometry.ts projectNative(), including its 28px margins.
    scale = min((WIDTH - 56) / (xmax - xmin), (HEIGHT - 56) / (ymax - ymin))
    left = (WIDTH - (xmax - xmin) * scale) / 2
    top = (HEIGHT - (ymax - ymin) * scale) / 2
    metres_per_pixel = 1 / scale
    land = unary_union([make_valid(transform(forward, shape(f['geometry']))) for f in boundary['features']])

    # A one-pixel halo provides symmetric derivatives at every output cell.
    columns, rows = np.meshgrid(np.arange(-1, WIDTH + 1) + 0.5, np.arange(-1, HEIGHT + 1) + 0.5)
    native_x = xmin + (columns - left) / scale
    native_y = ymax - (rows - top) / scale
    longitude, latitude = inverse(native_x, native_y)
    heights, sample_valid = bilinear(dem, grid, longitude, latitude)
    center = heights[1:-1, 1:-1]
    support = (sample_valid[1:-1, 1:-1] & sample_valid[1:-1, :-2] & sample_valid[1:-1, 2:]
               & sample_valid[:-2, 1:-1] & sample_valid[2:, 1:-1])
    land_mask = contains_xy(land, native_x[1:-1, 1:-1], native_y[1:-1, 1:-1])
    visible = land_mask & support
    if not visible.any() or (land_mask & ~support).any():
        raise RuntimeError('Land pixels lack valid source/derivative support; no gap filling is allowed')
    dz_east = EXAGGERATION * (heights[1:-1, 2:] - heights[1:-1, :-2]) / (2 * metres_per_pixel)
    dz_north = EXAGGERATION * (heights[:-2, 1:-1] - heights[2:, 1:-1]) / (2 * metres_per_pixel)
    azimuth, altitude = math.radians(AZIMUTH), math.radians(ALTITUDE)
    light_east = math.sin(azimuth) * math.cos(altitude)
    light_north = math.cos(azimuth) * math.cos(altitude)
    light_up = math.sin(altitude)
    shade = np.clip((-dz_east * light_east - dz_north * light_north + light_up)
                    / np.sqrt(1 + dz_east ** 2 + dz_north ** 2), 0, 1)
    gray = 255 * (AMBIENT + (1 - AMBIENT) * shade)
    rgba = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    rgb = np.clip(np.asarray(PAPER) - (255 - gray[visible, None]) * CONTRAST, 0, 255).astype(np.uint8)
    rgba[visible, :3] = rgb
    rgba[visible, 3] = 255

    output = repo / 'public/assets/atlas/mexico-nature-parity-v1'
    output.mkdir(parents=True, exist_ok=True)
    image_path = output / 'relief.webp'
    Image.fromarray(rgba).save(image_path, lossless=True, method=6, exact=True)
    # Decode the exported bytes, checking transparency and dimensions themselves.
    decoded = np.asarray(Image.open(image_path).convert('RGBA'))
    if decoded.shape != (HEIGHT, WIDTH, 4) or not np.array_equal(decoded, rgba):
        raise RuntimeError('Lossless WebP round-trip differs from the generated raster')
    if np.any(decoded[~land_mask, 3]) or np.any(decoded[visible, 3] != 255):
        raise RuntimeError('Exported alpha does not preserve the exact land mask')

    frame_native = [[xmin - left / scale, ymax + top / scale],
                    [xmin + (WIDTH - left) / scale, ymax + top / scale],
                    [xmin + (WIDTH - left) / scale, ymax - (HEIGHT - top) / scale],
                    [xmin - left / scale, ymax - (HEIGHT - top) / scale]]
    corners = [list(map(float, inverse(x, y))) for x, y in frame_native]
    fx, fy = forward(longitude[visible.shape[0] // 2, :], latitude[visible.shape[0] // 2, :])
    roundtrip = float(max(np.max(np.abs(fx - native_x[visible.shape[0] // 2, :])),
                          np.max(np.abs(fy - native_y[visible.shape[0] // 2, :]))))
    if roundtrip > 0.0001:
        raise RuntimeError('Lambert inverse/forward round trip exceeds 0.1mm')
    manifest = {
        'schemaVersion': 1,
        'id': 'mexico-nature-parity-relief-v1',
        'purpose': 'Neutral shaded elevation context behind the INEGI landform classification outlines.',
        'derivedBy': 'Insight Journal offline processing; this hillshade is not an official INEGI classification.',
        'file': image_path.name,
        'bytes': image_path.stat().st_size,
        'sha256': digest(image_path),
        'source': {key: contours[key] for key in ['sourceUrl', 'downloadUrl', 'sourceEdition', 'sourceFile',
                   'sourceSha256', 'sourceBytes', 'retrievedAt', 'license', 'licenseUrl', 'userGuideUrl',
                   'citation', 'horizontalCrs', 'verticalDatum', 'unit', 'editionNotObservationYear']},
        'decodedGrid': {**grid, 'verifiedAgainst': 'mexico-water-v1/contours.source.json'},
        'landClip': {
            'source': 'Fuente: INEGI, Marco Geoestadistico, diciembre de 2025; 32 retained state geometries.',
            'sourceUrl': index['metadata']['sourceUrl'],
            'documentation': index['metadata']['documentation'],
            'license': 'INEGI Terminos de Libre Uso de la Informacion; attribution and transformation disclosure required.',
            'licenseUrl': index['metadata']['license'],
            'originalSourceSha256': index['metadata']['sourceSha256'],
            'retainedGeometryFile': 'src/data/atlas/mexico/geometry.json',
            'retainedGeometrySha256': digest(boundary_path),
            'geometryIndexFile': 'src/data/atlas/mexico/geometry-index.json',
            'geometryIndexSha256': digest(index_path),
            'method': 'Project retained INEGI geographic state polygon vertices with the same GRS80 Lambert forward formula; union polygons; retain output pixel centres contained by that union. Alpha zero elsewhere.',
        },
        'displayFrame': {
            'width': WIDTH, 'height': HEIGHT, 'viewBox': '0 0 900 580',
            'imagePlacement': {'x': 0, 'y': 0, 'width': WIDTH, 'height': HEIGHT, 'preserveAspectRatio': 'none'},
            'projection': projection, 'boundsNative': index['metadata']['boundsNative'],
            'scalePixelsPerNativeMetre': scale, 'leftPixels': left, 'topPixels': top,
            'metresPerPixelInLambertPlane': metres_per_pixel,
            'cornersOrder': ['top-left', 'top-right', 'bottom-right', 'bottom-left'],
            'frameCornersNative': frame_native, 'frameCornersLonLat': corners,
            'pixelRegistration': 'Cell centres at x+0.5,y+0.5 within the full SVG display frame.',
            'mapping': 'x=left+(nativeX-minX)*scale; y=top+(maxY-nativeY)*scale; scale=min(844/(maxX-minX),524/(maxY-minY)).',
            'geographicNote': 'Matches atlas-mexico-projection.mjs and its existing geographic rendering. No epoch-dependent ITRF92/WGS84 transformation or cadastral precision is asserted.',
        },
        'method': {
            'resampling': 'Inverse exact display-frame Lambert mapping; bilinear interpolation of four valid native cell-centre float32 heights. No resampling of the cached native grid itself.',
            'noData': grid['noData'],
            'missingData': 'Nonfinite/NoData/out-of-window donors invalidate the sample. All five samples needed by the central derivative must be valid. No fill, extrapolation, synthetic terrain or contour-to-surface reconstruction.',
            'hillshade': 'Lambert-plane east/north central finite differences of sampled EGM2008 metre heights, with a one-pixel source-sampled halo; dot product of normalized surface normal and directional light, clipped to [0,1].',
            'lightAzimuthDegreesClockwiseFromNorth': AZIMUTH,
            'lightAltitudeDegrees': ALTITUDE, 'verticalExaggerationForDisplay': EXAGGERATION,
            'paperRgb': PAPER, 'ambientFraction': AMBIENT, 'darkeningFactor': CONTRAST,
            'tone': 'gray=255*(0.65+0.35*hillshade); rgb=clip([245,241,220]-(255-gray)*0.62,0,255). Uses the US paper tone and neutral darkening factor from map/atlas/prepare_maplibre.py.',
            'encoding': 'Lossless RGBA WebP; exact transparent RGB; transparent outside retained INEGI land.',
        },
        'checks': {
            'originalSourceHashMatches': True, 'nativeGridHashMatches': True,
            'retainedBoundaryMatchesExistingContours': True,
            'outputPixelCount': WIDTH * HEIGHT,
            'validLandPixelCount': int(visible.sum()),
            'landPixelsWithoutSourceSupport': int((land_mask & ~support).sum()),
            'nonzeroAlphaOutsideLand': int(np.count_nonzero(decoded[~land_mask, 3])),
            'webpLosslessRoundTripExact': True,
            'lambertRoundTripMaxNativeMetres': roundtrip,
            'sampledLandHeightMinM': float(center[visible].min()),
            'sampledLandHeightMaxM': float(center[visible].max()),
            'validNegativeLandHeightPixelCount': int((center[visible] < 0).sum()),
            'hillshadeRange': [float(shade[visible].min()), float(shade[visible].max())],
            'landRgbMin': rgb.min(axis=0).tolist(), 'landRgbMax': rgb.max(axis=0).tolist(),
        },
        'reproduction': {
            'script': 'scripts/prepare-mexico-relief-background.py',
            'scriptSha256': digest(Path(__file__)),
            'command': 'python scripts/prepare-mexico-relief-background.py --source <pinned-original.tif> --grid <mexico-etopo-window.json>',
            'dependencies': {'numpy': np.__version__, 'Pillow': Image.__version__, 'shapely': __import__('shapely').__version__},
        },
        'limitations': [
            '2022 denotes the model edition, not a uniform observation year.',
            '60 arc-second source data and the 900x580 display raster give national visual context, not survey-grade or site-level elevations.',
            'Hillshade brightness depends on the disclosed illumination, display exaggeration and tone. It is not an elevation scale or a landform classification.',
            'The INEGI landform outlines retain their own source classification; this background does not replace or derive those categories.',
            'Valid negative elevations are retained. Mixed marine/terrestrial coastal source cells may influence coastal shading.',
            'Source/grid/image pixel counts and sampled height extrema are verification details, not national land area, state summaries or exact national extrema.',
            'The native-cell interpolation and finite differences use genuine source samples. No source gap is filled.',
        ],
    }
    manifest_path = output / 'relief-manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf8', newline='\n')
    print(json.dumps({'file': str(image_path), 'bytes': manifest['bytes'], 'sha256': manifest['sha256'],
                      'frame': manifest['displayFrame'], 'checks': manifest['checks']}, allow_nan=False))


if __name__ == '__main__':
    main()
