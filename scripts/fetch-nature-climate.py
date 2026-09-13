"""Cache the public climate WMS at 0.01 degrees in bounded-size requests."""
import io
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
from urllib.parse import urlencode
from urllib.request import urlopen
from PIL import Image

CACHE=Path(os.environ.get('ATLAS_NATURE_TMP','/tmp/atlas-nature-v1'))
CACHE.mkdir(parents=True,exist_ok=True)

def fetch_tile(tile):
    col,row=tile
    west,south=-128+col*16,22+row*7.5
    query=dict(service='WMS',request='GetMap',version='1.1.1',layers='koppen',styles='',
               format='image/png',transparent='true',srs='EPSG:4326',bbox=f'{west},{south},{west+16},{south+7.5}',
               width=1600,height=750,expression='CMIP6Koppen.reanalysis@(year=2020)',cmap='koppen',vmin=1,vmax=30)
    url='https://koppen.earth/tiles/wms?'+urlencode(query)
    path=CACHE/f'koppen-{col}-{row}.png'
    if not path.exists():
        with urlopen(url,timeout=90) as response:path.write_bytes(response.read())
    print(path.name,flush=True)
    return col,row,Image.open(path).convert('RGBA')

if __name__=='__main__':
    image=Image.new('RGBA',(6400,3000))
    with ThreadPoolExecutor(max_workers=4) as pool:
        for col,row,tile in pool.map(fetch_tile,[(c,r) for c in range(4) for r in range(4)]):
            image.paste(tile,(col*1600,(3-row)*750))
    image.save(CACHE/'koppen-source-001deg.png')
