"""Reproducible Europe climate snapshots. Only public JMA/koppen.earth inputs.

Python dependencies: numpy, Pillow. Cache outside the checkout; no runtime API.
Run --discover before pinning station IDs. Run --map and --cities to regenerate.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from datetime import date
from concurrent.futures import ThreadPoolExecutor
import argparse, hashlib, html, io, json, math, re
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT.parent/'europe-source-cache'/'climate'
OUT=ROOT/'public/assets/atlas/europe/climate-v1'
DATA=ROOT/'src/data/atlas/europe'
BASE='https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/'
BOUNDS=[-25,32,65,73]
WIDTH=1800
MERC=lambda lat: math.log(math.tan(math.pi/4+math.radians(lat)/2))
HEIGHT=round(WIDTH*(MERC(73)-MERC(32))/math.radians(90))
CODES='Af Am Aw BWh BWk BSh BSk Csa Csb Csc Cwa Cwb Cwc Cfa Cfb Cfc Dsa Dsb Dsc Dsd Dwa Dwb Dwc Dwd Dfa Dfb Dfc Dfd ET EF'.split()
ORIGINAL='0000FF 0078FF 46AAFA FF0000 FF9696 F5A500 FFDC64 FFFF00 C8C800 969600 96FF96 64C864 329632 C8FF50 64FF50 32C800 FF00FF C800C8 963296 966496 AAAFFF 5A78DC 4B50B4 320087 00FFFF 37C8FF 007D7D 00465F B2B2B2 666666'.split()
PALETTE='529ca5 78b6ba a1cdd0 e6ad7b d4bc92 ebc38e e5d3ad d9ce8d bbc898 a4b98b c5d49b a7c59f 8eae90 98bba0 7caaa1 689b95 c4abc8 b49aba a387ac 957493 bcb5d1 a6afc9 8998b7 6e809e b7c2d8 9fb3cc 819db8 67869e c4c9cc a8aeb3'.split()
NAMES=['熱帯雨林','熱帯モンスーン','サバナ','高温の砂漠','低温の砂漠','高温のステップ','低温のステップ','地中海性・暑夏','地中海性・温暖な夏','地中海性・冷夏','温帯冬季少雨・暑夏','温帯冬季少雨・温暖な夏','温帯冬季少雨・冷夏','温暖湿潤','西岸海洋性','西岸海洋性・冷夏','冷帯夏季少雨・暑夏','冷帯夏季少雨・温暖な夏','冷帯夏季少雨・冷夏','冷帯夏季少雨・厳冬','冷帯冬季少雨・暑夏','冷帯冬季少雨・温暖な夏','冷帯冬季少雨・冷夏','冷帯冬季少雨・厳冬','冷帯湿潤・暑夏','冷帯湿潤・温暖な夏','冷帯湿潤・冷夏','冷帯湿潤・厳冬','ツンドラ','氷雪']

def sha(raw): return hashlib.sha256(raw).hexdigest()
def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf8')
def get(url,name):
    CACHE.mkdir(parents=True,exist_ok=True)
    p=CACHE/name
    if not p.exists():
        with urlopen(Request(url,headers={'User-Agent':'InsightJournal Europe climate preparation'}),timeout=90) as r:
            p.write_bytes(r.read())
    raw=p.read_bytes()
    return raw,dict(url=url,sha256=sha(raw),bytes=len(raw))
def clean(text):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',text))).strip()
def directory():
    url=BASE+'list.php?'+urlencode(dict(r=2,e=6,y=2025,m=1,s=1,k=0))
    raw,record=get(url,'directory-europe.html')
    rows=[]
    for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',raw.decode('utf8'),re.S|re.I):
        m=re.search(r'graph_mkhtml\.php\?n=(\d+)[^"\s]*">(.*?)</a>',row,re.S)
        if m:
            cells=[clean(c) for c in re.findall(r'<td\b[^>]*>(.*?)</td>',row,re.S|re.I)]
            rows.append(dict(stationId=m[1],stationName=clean(m[2]),country=cells[1] if len(cells)>1 else '',directory=url))
    assert len(rows)>100, 'Directory not recognized'
    write(CACHE/'stations.json',rows)
    return rows
STATIONS=[
 ('london','ロンドン','GBR','3772','HEATHROW'),
 ('paris','パリ','FRA','7149','ORLY'),
 ('berlin','ベルリン','DEU','10381','BERLIN-DAHLEM'),
 ('warsaw','ワルシャワ','POL','12375','WARSZAWA-OKECIE'),
 ('kyiv','キーウ','UKR','33345','KYIV'),
 ('minsk','ミンスク','BLR','26850','MINSK'),
 ('chisinau','キシナウ','MDA','33815','CHISINAU'),
 ('moscow','モスクワ','RUS','27612','MOSKVA VDNH'),
 ('belgrade','ベオグラード','SRB','13274','BEOGRAD'),
 ('bucharest','ブカレスト','ROU','15420','BUCURESTI BANEASA'),
 ('sofia','ソフィア','BGR','15614','SOFIA'),
 ('budapest','ブダペスト','HUN','12843','BUDAPEST'),
 ('vienna','ウィーン','AUT','11035','WIEN'),
 ('zurich','チューリヒ','CHE','6660','ZUERICH'),
 ('madrid','マドリード','ESP','8222','MADRID'),
 ('lisbon','リスボン','PRT','8535','LISBOA'),
 ('rome','ローマ','ITA','16239','ROMA'),
 ('athens','アテネ','GRC','16716','ATHINAI'),
 ('reykjavik','レイキャビク','ISL','4030','REYKJAVIK'),
 ('bergen','ベルゲン','NOR','1317','BERGEN'),
 ('oslo','オスロ','NOR','1492','OSLO-BLINDERN'),
 ('visby','ヴィスビュー','SWE','2590','VISBY'),
 ('helsinki','ヘルシンキ','FIN','2978','HELSINKI'),
 ('tallinn','タリン','EST','26038','TALLINN'),
]

def cities():
    def station(spec):
        slug,name,country,station_id,expected=spec
        url=BASE+f'graph_mkhtml_nrm.php?n={station_id}&m=1'
        raw,record=get(url,f'normals-{station_id}.html')
        source=raw.decode('utf8')
        info=clean(re.search(r'<div id="info"[^>]*>(.*?)</div>',source,re.S).group(1))
        assert expected in info, (slug,info)
        coords=re.search(r'Lat\.:\s*([\d.]+)\s*°([NS])\s*/\s*Lon\.:\s*([\d.]+)\s*°([EW])',info)
        assert coords, info
        lat,ns,lon,ew=coords.groups()
        lat=float(lat)*(-1 if ns=='S' else 1)
        lon=float(lon)*(-1 if ew=='W' else 1)
        assert -25<=lon<=65 and 32<=lat<=73
        rows=[]
        for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',source,re.S|re.I):
            cells=[clean(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',row,re.S|re.I)]
            if len(cells)==3 and re.fullmatch(r'0[1-9]|1[012]',cells[0]):
                def numeric(s): return float(s) if re.fullmatch(r'-?\d+(\.\d+)?',s) else None
                rows.append(dict(month=int(cells[0]),temperature=numeric(cells[1]),precipitation=numeric(cells[2])))
        assert [r['month'] for r in rows]==list(range(1,13)), (slug,rows)
        for r in rows:
            assert r['temperature'] is None or -60<r['temperature']<50
            assert r['precipitation'] is None or 0<=r['precipitation']<2000
        return dict(id=slug,name=name,country=country,stationId=station_id,stationName=info.split('Lat.:')[0].strip(),coordinates=[lon,lat],elevationM=float(re.search(r'Height:\s*([\d.-]+)',info).group(1)),period='1991–2020',months=rows,sourceUrl=url,input=record)
    result=list(ThreadPoolExecutor(max_workers=4).map(station,STATIONS))
    write(DATA/'climate-cities.json',result)
    write(OUT/'cities-manifest.json',dict(schemaVersion=1,period='1991–2020',publisher='気象庁 ClimatView',sourceUrl=BASE+'outline.html',normalMethodUrl='https://ds.data.jma.go.jp/tcc/tcc/products/climate/explanation/normal.html',termsUrl='https://www.jma.go.jp/jma/kishou/info/coment.html',retrievedAt=str(date.today()),processing='Monthly table parsed without inferring missing values; JMA station coordinates retained. Data edited by Insight Journal.',note='Period refers to normal reference period; available observation years may differ by station. JMA uses CLIMAT and GHCN data.',inputs=[r['input'] for r in result]))
    print(json.dumps(dict(cities=len(result),missing=sum(m[k] is None for c in result for m in c['months'] for k in ['temperature','precipitation']))))

def climate_map():
    def tile(c):
        west=-25+c*30
        q=dict(service='WMS',request='GetMap',version='1.1.1',layers='koppen',styles='',format='image/png',transparent='true',srs='EPSG:4326',bbox=f'{west},32,{west+30},73',width=600,height=820,expression='CMIP6Koppen.reanalysis@(year=2020)',cmap='koppen',vmin=1,vmax=30)
        raw,record=get('https://koppen.earth/tiles/wms?'+urlencode(q),f'koppen-{c}.png')
        im=Image.open(io.BytesIO(raw)).convert('RGBA')
        assert im.size==(600,820)
        return np.asarray(im),record
    tiles=list(ThreadPoolExecutor(max_workers=3).map(tile,range(3)))
    rgba=np.concatenate([t[0] for t in tiles],axis=1)
    classes=np.zeros(rgba.shape[:2],dtype=np.uint8)
    for i,color in enumerate(ORIGINAL,1):classes[(rgba[:,:,:3]==list(bytes.fromhex(color))).all(axis=2)&(rgba[:,:,3]>0)]=i
    assert not ((rgba[:,:,3]>0)&(classes==0)).any(), 'Unrecognized source color'
    # Exact nearest-cell mapping between regular latitude and Mercator rows.
    ys=MERC(73)-(np.arange(HEIGHT)+.5)/HEIGHT*(MERC(73)-MERC(32))
    lat=np.degrees(2*np.arctan(np.exp(ys))-np.pi/2)
    source_y=np.clip(np.floor((73-lat)/41*820).astype(int),0,819)
    target=classes[source_y,:]
    colors=np.zeros((31,4),dtype=np.uint8)
    for i,color in enumerate(PALETTE,1):colors[i]=[*bytes.fromhex(color),255]
    OUT.mkdir(parents=True,exist_ok=True)
    Image.fromarray(colors[target]).save(OUT/'climate.png',optimize=True)
    # Same source classes for lookup; one unsigned byte per Mercator cell.
    import gzip
    (OUT/'classes.bin.gz').write_bytes(gzip.compress(target.tobytes(),mtime=0))
    legend=[dict(id=i,code=CODES[i-1],name=NAMES[i-1],color='#'+PALETTE[i-1]) for i in range(1,31) if (target==i).any()]
    write(DATA/'climate-legend.json',legend)
    write(OUT/'manifest.json',dict(schemaVersion=1,bounds=BOUNDS,width=WIDTH,height=HEIGHT,projection='EPSG:3857',period='1991–2020',publisher='Beck et al. (2023), koppen.earth snapshot',sourceUrl='https://www.gloh2o.org/koppen/',doi='https://doi.org/10.1038/s41597-023-02549-6',license='CC BY 4.0',retrievedAt=str(date.today()),inputs=[t[1] for t in tiles],processing='0.05 degree WMS sampling; exact palette decoding; nearest-neighbour reprojection to Web Mercator. No interpolation of classification IDs.',sourceResolution='Provider nominal 1 km; exported source 0.05 degree. Detailed farm or street boundaries are not represented.',files={name:dict(sha256=sha((OUT/name).read_bytes()),bytes=(OUT/name).stat().st_size) for name in ['climate.png','classes.bin.gz']}))
    print(json.dumps(dict(mapSize=[WIDTH,HEIGHT],classes=[x['code'] for x in legend])))

if __name__=='__main__':
    args=argparse.ArgumentParser()
    args.add_argument('--discover',action='store_true')
    args.add_argument('--map',action='store_true')
    args.add_argument('--cities',action='store_true')
    parsed=args.parse_args()
    if parsed.discover:print(json.dumps(directory(),ensure_ascii=False))
    if parsed.map:climate_map()
    if parsed.cities:cities()
