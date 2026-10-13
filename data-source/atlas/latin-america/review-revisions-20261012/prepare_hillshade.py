"""Offline NOAA ETOPO 2022 hillshade. Source is retained native Float32 data.

This script neither acquires data nor derives any hydrological flow direction.
Output is a Web Mercator grayscale terrain context, not an aerial photograph.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def mercator(latitude):
    return np.log(np.tan(np.pi / 4 + np.asarray(latitude) * np.pi / 360)) * 180 / np.pi


def prepare(cache, output):
    meta_path = cache / 'etopo-extraction.json'
    meta = json.loads(meta_path.read_text())
    raw = cache / 'etopo-native.f32'
    assert sha(raw) == meta['gridSha256']
    grid = np.memmap(raw, dtype='<f4', mode='r', shape=(meta['height'], meta['width']))
    z = np.asarray(grid, dtype=np.float32)
    assert np.isfinite(z).all() and not np.any(z == meta['nodata'])
    # Physical slopes: longitude metres depend on latitude; source rows run north to south.
    lat = meta['firstCenter'][1] + np.arange(meta['height']) * meta['step'][1]
    dy, dx = np.gradient(z)
    dx /= (111_195.08 * abs(meta['step'][0]) * np.cos(np.deg2rad(lat)))[:, None]
    dy /= 111_195.08 * abs(meta['step'][1])
    # Light points toward northwest (negative x/negative y) and 45 degrees above horizon.
    # Modest 1.5x vertical exaggeration exposes relief while rivers remain the main marks.
    exaggeration = 1.5
    nx, ny, nz = -dx * exaggeration, -dy * exaggeration, np.ones_like(dx)
    normal = np.sqrt(nx * nx + ny * ny + nz * nz)
    light = np.array([-0.5, -0.5, math.sqrt(0.5)])
    illumination = np.clip((nx * light[0] + ny * light[1] + nz * light[2]) / normal, 0, 1)
    # Soft grayscale: no altitude classes or forest meaning. Values range 190..249.
    luminance = (190 + 59 * illumination).astype(np.float32)
    width, height = 1800, 1160
    # Match existing uniform projectLatin coordinates within a 900 x 580 frame.
    bounds = [-93, -56, -33, 28]
    m_north, m_south = float(mercator(bounds[3])), float(mercator(bounds[1]))
    scale = 580 / (m_north - m_south)
    px = (np.arange(width) + 0.5) / 2
    py = (np.arange(height) + 0.5) / 2
    lon = bounds[0] + px / scale
    mlat = m_north - py / scale
    latitude = (2 * np.arctan(np.exp(mlat * np.pi / 180)) - np.pi / 2) * 180 / np.pi
    cols = (lon - meta['firstCenter'][0]) / meta['step'][0]
    rows = (latitude - meta['firstCenter'][1]) / meta['step'][1]
    rr, cc = np.meshgrid(rows, cols, indexing='ij')
    values = map_coordinates(luminance, [rr, cc], order=1, mode='nearest')
    surface = map_coordinates(z, [rr, cc], order=1, mode='nearest')
    in_source = (cc >= 0) & (cc < meta['width']) & (rr >= 0) & (rr < meta['height'])
    # Bathymetry is excluded; downstream uses its own target-country polygon clip.
    alpha = np.where(in_source & (surface >= 0), 255, 0).astype(np.uint8)
    rgb = np.clip(np.rint(values), 0, 255).astype(np.uint8)
    # Neutral hidden RGB also keeps inspection software that flattens alpha from
    # revealing extrapolated edge columns outside the acquired source window.
    rgb[alpha == 0] = 255
    rgba = np.stack([rgb, rgb, rgb, alpha], axis=-1)
    output.mkdir(parents=True, exist_ok=True)
    path = output / 'hillshade.png'
    Image.fromarray(rgba).save(path)
    ledger = json.loads((cache / 'etopo-range-acquisition.json').read_text())
    source = {
        'schemaVersion': 1,
        'publisher': 'NOAA NCEI',
        'dataset': 'ETOPO 2022 v1 60 arc-second surface',
        'sourceUrl': ledger['sourceUrl'],
        'documentation': 'https://www.ncei.noaa.gov/products/etopo-global-relief-model',
        'license': 'U.S. government public-domain data; cite NOAA NCEI / ETOPO 2022',
        'sourceEdition': 2022,
        'sourceUnits': 'EGM2008 height metres',
        'sourceCRS': 'EPSG:4326; vertical EPSG:3855',
        'sourceResolutionDegrees': 1 / 60,
        'sourceGridSha256': meta['gridSha256'],
        'sourceWindow': meta['window'],
        'sourceBounds': bounds,
        'sourceAcquisition': 'Previously acquired normal HTTPS byte ranges; unchanged raw grid; no new download',
        'wholeGlobalFileRetrieved': False,
        'globalFileHashLocallyVerified': False,
        'missingSourceCells': 0,
        'displayCRS': 'EPSG:3857',
        'displayFrame': [0, 0, 900, 580],
        'uniformScale': scale,
        'sourceRasterFrame': [0, 0, (bounds[2] - bounds[0]) * scale, 580],
        'method': 'Native physical-metre gradients, northwest 45-degree light, vertical exaggeration 1.5, luminance 190+59*illumination, bilinear Web Mercator display sampling; nonnegative source relief only; target-country polygon clip must be applied by renderer',
        'meaning': 'DEM-derived schematic illumination revealing land relief. This is not satellite/aerial imagery, land cover, current sunlight, a flow-direction model or a measured basin boundary.',
        'use': 'Quiet terrain context underneath river lines. Do not present gray values as a measured thematic quantity.',
        'file': {'name': path.name, 'width': width, 'height': height, 'bytes': path.stat().st_size, 'sha256': sha(path)},
        'preparationScriptSha256': sha(__file__),
        'validation': {'sourceGridHashMatches': True, 'finitePixels': bool(np.isfinite(values).all()), 'grayRange': [int(rgb[alpha > 0].min()), int(rgb[alpha > 0].max())], 'knownPeaks': {}}
    }
    for name, (longitude, latitude) in {'Aconcagua': (-70.011, -32.653), 'Amazon lowland near Manaus': (-60.02, -3.11), 'Guatemala highlands': (-90.5, 14.6)}.items():
        col = round((longitude - meta['firstCenter'][0]) / meta['step'][0])
        row = round((latitude - meta['firstCenter'][1]) / meta['step'][1])
        source['validation']['knownPeaks'][name] = {'coordinate': [longitude, latitude], 'nativeCellHeightMetres': float(z[row, col])}
    (output / 'hillshade.source.json').write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'file': source['file'], 'validation': source['validation'], 'uniformScale': scale}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.cache, args.output)
