"""Pinned climate cutout; original categorical values, Pacific date-line seam.

Requires numpy and Pillow. Pass --source to an existing authorized source cache.
This first broad view uses the publisher's 0.1 degree product. It does not invent
climate values for small islands. Regional detail should use the 1 km product.
"""
import argparse
import gzip
import hashlib
import io
import json
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from atlas_asia_climate_palette import display_classes

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/atlas/oceania-climate-v1'
ZIP_SHA = 'd37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d'
MEMBER = '1991_2020/koppen_geiger_0p1.tif'
MEMBER_SHA = '7db968672815435562b8428f0752c2e67af7e6bb235e2969eb2db28bce428361'
digest = lambda raw: hashlib.sha256(raw).hexdigest()
text_digest = lambda raw: digest(raw.replace(b'\r\n', b'\n').replace(b'\r', b'\n'))

def palette_record():
    reference = ROOT/'scripts/refine-atlas-nature.py'
    legend = ROOT/'public/assets/atlas/nature-v1/climate-legend.json'
    return {'reference':reference.relative_to(ROOT).as_posix(),
            'referenceSha256':text_digest(reference.read_bytes()),
            'legend':legend.relative_to(ROOT).as_posix(),
            'legendSha256':text_digest(legend.read_bytes()),
            'digestMethod':'SHA-256 of canonical LF UTF-8 text; binary source/output hashes are exact bytes',
            'method':'Reuse the existing North America 30-code palette through display_classes(); retain original climate class IDs.'}

def write(name, value):
    (OUT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf8', newline='\n')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    assert digest(args.source.read_bytes()) == ZIP_SHA, 'Pinned archive hash mismatch'
    with zipfile.ZipFile(args.source) as archive:
        raw = archive.read(MEMBER)
    assert digest(raw) == MEMBER_SHA, 'Pinned member hash mismatch'
    image = Image.open(io.BytesIO(raw))
    assert image.size == (3600, 1800), image.size
    assert tuple(image.tag_v2[33550])[:2] == (0.1, 0.1)
    assert tuple(image.tag_v2[33922])[:6] == (0,0,0,-180,90,0)
    values = np.asarray(image, dtype=np.uint8)
    assert values.shape == (1800, 3600) and values.max() <= 30
    # Exact source cells: west Pacific 110..180 + east Pacific -180..-110.
    grid = np.concatenate((values[650:1480,2900:3600], values[650:1480,0:700]), axis=1)
    assert grid.shape == (830,1400)
    assert np.array_equal(grid[:,:700], values[650:1480,2900:3600])
    assert np.array_equal(grid[:,700:], values[650:1480,0:700])
    classes = display_classes()
    colors = np.zeros((31,4), dtype=np.uint8)
    for item in classes:
        colors[item['id']] = [*bytes.fromhex(item['color'][1:]),255]
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(colors[grid]).save(OUT/'climate.png', optimize=True)
    (OUT/'climate-grid.bin.gz').write_bytes(gzip.compress(grid.tobytes(),mtime=0))
    assert np.array_equal(np.asarray(Image.open(OUT/'climate.png')),colors[grid])
    assert gzip.decompress((OUT/'climate-grid.bin.gz').read_bytes()) == grid.tobytes()
    # Known source-centre checks, retain classes rather than reducing to a broad group.
    anchors=[]
    for name,lon,lat in [('Alice Springs',133.88,-23.70),('Perth',115.86,-31.95),('Sydney',151.21,-33.87),('Auckland',174.76,-36.85),('Port Moresby',147.18,-9.44),('Suva',178.45,-18.14),('Apia',-171.77,-13.83)]:
        x=int(((lon+360 if lon<0 else lon)-110)/0.1); y=int((25-lat)/0.1)
        source_x=int((lon+180)/0.1); source_y=int((90-lat)/0.1)
        assert int(grid[y,x]) == int(values[source_y,source_x]), (name,x,y)
        identifier=int(grid[y,x]);anchors.append({'name':name,'longitude':lon,'latitude':lat,'classId':identifier,'code':classes[identifier-1]['code'] if identifier else None})
    write('legend.json',classes)
    files={name:{'bytes':(OUT/name).stat().st_size,'sha256':digest((OUT/name).read_bytes())} for name in ['climate.png','climate-grid.bin.gz','legend.json']}
    write('manifest.json',{
        'schemaVersion':1,'version':'1.0.0-preparation','period':'1991-2020','unit':'Koppen-Geiger class ID; categorical climatology',
        'source':{'url':'https://ndownloader.figshare.com/files/45057352','metadataUrl':'https://api.figshare.com/v2/articles/21789074/versions/1','citation':'https://doi.org/10.1038/s41597-023-02549-6','license':'CC BY 4.0','licenseUrl':'https://www.gloh2o.org/koppen/','archiveSha256':ZIP_SHA,'member':MEMBER,'memberSha256':MEMBER_SHA},
        'grid':{'width':1400,'height':830,'crs':'EPSG:4326','boundsUnwrapped':[110,-58,250,25],'resolutionDegrees':0.1,'sample':'original cell values, pixel centres','noData':0,'dateLineColumn':700,'image':'climate.png','data':'climate-grid.bin.gz'},
        'display':{'projection':'Existing Pacific-centred equirectangular; standard latitude -20 degrees; not equal-area','mapSize':[1200,757],'clip':'UI must clip quantitative image to Oceania country geometry; surrounding countries remain neutral','palette':palette_record()},
        'coverage':{'smallIslands':'0.1 degree broad-view raster can omit small land polygons; missing class 0 is not a climate category. A regional/detail view needs the 1 km source and explicit country coverage check.','scope':'Raster viewport includes context land. It is a source cutout, not a country total or land-area estimate.'},
        'verification':{'allImagePixelsMatchGrid':True,'bothDateLineHalvesMatchSource':True,'knownPlaceSamples':anchors},
        'processing':{'script':'scripts/prepare-oceania-climate.py','scriptSha256':text_digest(Path(__file__).read_bytes()),'scriptDigestMethod':'SHA-256 of canonical LF UTF-8 text','method':'Exact array slices; no interpolation, averaging, class merging or resampling'},'files':files})
    print(json.dumps({'shape':grid.shape,'anchors':anchors,'files':files}))

if __name__ == '__main__':
    main()
