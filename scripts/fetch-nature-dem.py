"""Cache USGS 3DEP elevations on a common 500 m EPSG:5070 grid.

Preparation only, never a prerequisite of the static-site build.
"""
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
from urllib.parse import urlencode
from urllib.request import urlopen

CACHE = Path(os.environ.get('ATLAS_NATURE_TMP','/tmp/atlas-nature-v1'))/'3dep-500m'
CACHE.mkdir(parents=True, exist_ok=True)
SERVICE = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'

def download(tile):
    column, row = tile
    # One-cell halo: contours are cropped back to the shared tile boundary.
    west, south = -2500000 + column * 1250000, 200000 + row * 800000
    bounds = [west - 500, south - 500, west + 1250500, south + 800500]
    query = dict(bbox=','.join(map(str, bounds)), bboxSR=5070, imageSR=5070,
                 size='2502,1602', format='tiff', pixelType='F32',
                 interpolation='RSP_BilinearInterpolation', adjustAspectRatio='false',
                 renderingRule=json.dumps({'rasterFunction':'None'}), f='image')
    url = SERVICE + '/exportImage?' + urlencode(query)
    path = CACHE / f'{column}-{row}.tif'
    if not path.exists():
        with urlopen(url, timeout=180) as response:
            path.write_bytes(response.read())
    record = dict(url=url, bounds5070=bounds, coreBounds5070=[west,south,west+1250000,south+800000],
                  sha256=hashlib.sha256(path.read_bytes()).hexdigest(), bytes=path.stat().st_size)
    (CACHE / f'{column}-{row}.json').write_text(json.dumps(record))
    print(path.name, record['bytes'], flush=True)

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(download, [(x,y) for x in range(4) for y in range(4)]))
