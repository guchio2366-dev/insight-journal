#!/usr/bin/env python3
"""Build the Latin America crop atlas from a pinned CGIAR MapSPAM 2020 v2r2 shard.

Requirements: numpy, Pillow, numcodecs==0.16.5, shapely==2.1.2.
Only the rice/all/harvested_area shard is read; no account or paid API is used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
from urllib.request import urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cache', type=Path)
parser.add_argument('--dependencies', type=Path, help='Optional directory containing Python dependencies')
args = parser.parse_args()
if args.dependencies:
    sys.path.insert(0, str(args.dependencies))

import numpy as np
from PIL import Image
from numcodecs import Blosc, VLenUTF8, Zstd
from shapely import contains_xy
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
CACHE = args.cache or ROOT.parent / 'latin-agriculture-cache'
OUT = ROOT / 'public/assets/atlas/latin-america-agriculture-v1'
BASE = 'https://digital-atlas.s3.amazonaws.com/cdh/data/mapspam2020-v2r2/spam2020-v2r2.zarr/'
CATALOGUE = 'https://cgiar-climate-data-hub.github.io/catalog/spam2020/'
FILES = {
    'metadata': ('zarr.json', 'c8f35d14217f959131010c3b93677e69'),
    'rice-all-harvested': ('harvested_area/c/0/1/0/0', '8864fb38a3e1155f613ef8239a4570e1'),
}
REGIONS = {
    'east-asia': {'bounds': [73, 18, 146, 54], 'subregions': ['Eastern Asia']},
    'southeast-asia': {'bounds': [92, -12, 142, 29], 'subregions': ['South-Eastern Asia']},
    'south-central-asia': {'bounds': [46, -1, 98, 56], 'subregions': ['Southern Asia', 'Central Asia']},
}
BREAKS = [1, 10, 100, 1000, 5000]
COLORS = ['#d9f0a3', '#addd8e', '#78c679', '#31a354', '#006837']
STEP = 1 / 12


def dump(path, content):
    path.write_text(json.dumps(content, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')


def get(name, key, expected_md5=None):
    target = CACHE / name
    url = BASE + key
    if not target.exists():
        with urlopen(url, timeout=60) as response:
            target.write_bytes(response.read())
    value = target.read_bytes()
    if expected_md5:
        assert hashlib.md5(value).hexdigest() == expected_md5, f'Source changed: {name}'
    return value, {'url': url, 'sha256': hashlib.sha256(value).hexdigest(), 'bytes': len(value)}


def crc32c(data):
    crc = 0xffffffff
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0x82f63b78 if crc & 1 else 0)
    return crc ^ 0xffffffff


def decode_shard(raw, metadata):
    """Decode the documented v3 sharding layout, validating its CRC32C index."""
    assert metadata['shape'] == [3, 46, 2160, 4320]
    assert metadata['dimension_names'] == ['technology', 'crop', 'y', 'x']
    config = metadata['codecs'][0]['configuration']
    assert metadata['codecs'][0]['name'] == 'sharding_indexed'
    assert config['chunk_shape'] == [1, 1, 90, 90]
    assert config['index_location'] == 'end'
    assert config['codecs'][1]['name'] == 'blosc'
    count = 24 * 48
    index_bytes = raw[-(count * 16 + 4):-4]
    assert crc32c(index_bytes) == int.from_bytes(raw[-4:], 'little'), 'Corrupt shard index'
    index = np.frombuffer(index_bytes, dtype='<u8').reshape(24, 48, 2)
    result = np.full((2160, 4320), np.nan, dtype=np.float32)
    decoder = Blosc()
    for row in range(24):
        for col in range(48):
            start, size = (int(x) for x in index[row, col])
            if start == (2**64 - 1):
                continue
            assert 0 <= start < start + size <= len(raw) - len(index_bytes) - 4
            cell = np.frombuffer(decoder.decode(raw[start:start + size]), dtype='<f4').reshape(90, 90)
            result[row*90:(row+1)*90, col*90:(col+1)*90] = cell
    result[result == -9999] = np.nan
    assert np.all(result[np.isfinite(result)] >= 0), 'Unexpected negative harvested area'
    return result


def runs(mask):
    padded = np.r_[False, mask.ravel(), False].astype(np.int8)
    starts = np.flatnonzero(np.diff(padded) == 1)
    ends = np.flatnonzero(np.diff(padded) == -1)
    return [[int(start), int(end-start)] for start, end in zip(starts, ends)]


def mercator(lat):
    return math.log(math.tan(math.pi/4 + math.radians(lat)/2))


def make_image(grid, bounds, path):
    west, south, east, north = bounds
    h, w = grid.shape
    pixels = np.zeros((h, w, 4), dtype=np.uint8)
    for lower, color in zip(BREAKS, COLORS):
        rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
        pixels[np.isfinite(grid) & (grid >= lower)] = (*rgb, 235)
    # MapLibre image sources interpolate in Web Mercator, not latitude.
    # Nearest-cell resampling preserves the source grid without inventing values.
    width = 1200
    m_north, m_south = mercator(north), mercator(south)
    height = round(width * (m_north - m_south) / math.radians(east - west))
    m_y = m_north - (np.arange(height) + .5) / height * (m_north - m_south)
    latitudes = np.degrees(2*np.arctan(np.exp(m_y)) - np.pi/2)
    rows = np.clip(np.floor((north-latitudes)/STEP).astype(int), 0, h-1)
    cols = np.clip(np.floor((np.arange(width)+.5)/width*w).astype(int), 0, w-1)
    Image.fromarray(pixels[rows[:, None], cols[None, :]], 'RGBA').save(path, optimize=True)
    return [width, height]


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    sources={}
    raw,sources['metadata']=get('zarr-metadata.json',*FILES['metadata'])
    meta=json.loads(raw)['consolidated_metadata']['metadata']
    raw,sources['crop']=get('crop.bin','crop/c/0')
    crops=list(VLenUTF8().decode(Zstd().decode(raw)))
    labels={'whea':'小麦','rice':'米','maiz':'とうもろこし','soyb':'大豆','sugc':'さとうきび','coff':'コーヒー（アラビカ）','rcof':'コーヒー（ロブスタ）','bana':'バナナ','coco':'カカオ','cott':'綿花','pota':'じゃがいも','temf':'温帯果樹'}
    bounds=[-93,-56,-33,28]
    west,south,east,north=bounds
    x0,x1=round((west+180)/STEP),round((east+180)/STEP)
    y0,y1=round((90-north)/STEP),round((90-south)/STEP)
    h,w=y1-y0,x1-x0
    xs,ys=np.meshgrid(west+(np.arange(w)+.5)*STEP,north-(np.arange(h)+.5)*STEP)
    features=json.loads((ROOT/'src/data/atlas/regional-countries.json').read_text())['features']
    masks={}
    mask=np.zeros((h,w),dtype=bool)
    for f in features:
        p=f['properties']
        if p['code']=='MEX' or not(p['region']=='South America' or p['subregion'] in ['Central America','Caribbean']): continue
        cm=contains_xy(shape(f['geometry']),xs,ys)
        masks[p['code']]=cm
        mask|=cm
    layers=[]
    for code,label in labels.items():
        ci=crops.index(code)
        raw,sources[code]=get(code+'-harvested.bin',f'harvested_area/c/0/{ci}/0/0')
        grid=decode_shard(raw,meta['harvested_area'])[y0:y1,x0:x1].copy()
        grid[~mask]=np.nan
        finite=np.isfinite(grid)
        indices=np.flatnonzero(finite.ravel() & (grid.ravel()>0))
        cells=[[int(i),round(float(grid.ravel()[i]),2)] for i in indices]
        query={'width':w,'height':h,'bounds':bounds,'cellSize':STEP,'units':'ha','year':2020,'positiveCells':cells,'validRuns':runs(finite)}
        dump(OUT/(code+'-grid.json'),query)
        size=make_image(grid,bounds,OUT/(code+'.png'))
        totals=[{'code':cc,'value':round(float(np.nansum(grid[cm],dtype=np.float64)),2) if (cm&finite).any() else None,'validCells':int((cm&finite).sum())} for cc,cm in masks.items()]
        layer={'id':code,'label':label,'year':2020,'bounds':bounds,'coordinates':[[west,north],[east,north],[east,south],[west,south]],'image':code+'.png','query':code+'-grid.json','size':size,'breaks':BREAKS,'colors':COLORS,'countries':totals}
        layer['assets']={n:{'sha256':hashlib.sha256((OUT/n).read_bytes()).hexdigest(),'bytes':(OUT/n).stat().st_size} for n in [code+'.png',code+'-grid.json']}
        layers.append(layer)
        print(code, len(cells),'positive cells',flush=True)
    dump(OUT/'manifest.json',{'schemaVersion':1,'layers':layers,'source':{'title':'IFPRI MapSPAM 2020 v2r2','url':CATALOGUE,'doi':'https://doi.org/10.7910/DVN/SWPENT','license':'CC-BY-SA-4.0'},'method':'2020年基準、5分格子の年間収穫面積。灌漑と天水の合計。統計などを基に空間配分した推計。1ha以上を表示。国集計は表示範囲内の格子中心で集計した概算で公式国別値とは異なる。海岸・小島の格子は省略がある。'})
    dump(OUT/'provenance.json',{'retrieved':'2026-09-25','sources':sources,'maskSha256':hashlib.sha256((ROOT/'src/data/atlas/regional-countries.json').read_bytes()).hexdigest(),'license':'CC-BY-SA-4.0','attribution':'International Food Policy Research Institute (IFPRI), MapSPAM 2020 v2r2 via CGIAR Climate Action Data Hub. Regional clipping and visualization by Insight Journal.'})

if __name__=='__main__': main()
