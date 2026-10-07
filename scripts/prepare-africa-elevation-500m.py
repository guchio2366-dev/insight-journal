"""Offline 500 m isobands/contours from the already-published Africa display DEM.

No download, resampling or source-resolution reconstruction. ContourPy is used
only during preparation; the browser receives retained GeoJSON and provenance.
"""
from pathlib import Path
import gzip, hashlib, json
import contourpy
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/atlas/africa-physical-v1'
OUT = ROOT / 'public/assets/atlas/africa-elevation-500m-v1'
EXPECTED = 'ee962a3c56eaa69530c41c0d9bd7ba691cbf8cfa025a8ee6d673af6f2ad59aa6'
COLORS = ['#a8cabc', '#c5d8b0', '#dee0aa', '#e2d29a', '#d5be8c', '#c2a57f', '#aa8c72', '#957762', '#b4a091', '#ddd2c5']

def sha(data): return hashlib.sha256(data).hexdigest()
def encoded(value): return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n').encode()
def points(value): return np.round(value, 6).tolist()

def main():
    grid_bytes = (SOURCE / 'elevation.values.gz').read_bytes()
    assert sha(grid_bytes) == EXPECTED, 'Existing display DEM changed; review before rebuilding'
    original = json.loads((SOURCE / 'manifest.json').read_text())['layers']['elevation']
    values = np.frombuffer(gzip.decompress(grid_bytes), dtype='<i2').reshape(original['height'], original['width'])
    west, south, east, north = original['bounds']
    x = west + (np.arange(original['width'])+.5)*original['resolutionDegrees']
    y = north - (np.arange(original['height'])+.5)*original['resolutionDegrees']
    dem = np.ma.masked_equal(values, original['noData'])
    generator = contourpy.contour_generator(x=x, y=y, z=dem, name='serial', corner_mask=False, line_type='Separate', fill_type='OuterOffset', quad_as_tri=False, z_interp='Linear')
    edges = list(range(-500, 4501, 500))
    features, legend = [], []
    for index, (low, high) in enumerate(zip(edges, edges[1:])):
        coords, offsets = generator.filled(low, high)
        polygons = [[points(p[start:end]) for start, end in zip(o, o[1:])] for p, o in zip(coords, offsets)]
        label = '0 m未満' if index == 0 else f'{low:,}–{high:,} m'
        id = f'band-{index}'
        legend.append({'id':id, 'label':label, 'color':COLORS[index], 'description':'既存0.1度格子の平均標高から描いた標高帯。色面の境界は等高線と一致します。'})
        features.append({'type':'Feature','properties':{'id':id,'classId':id,'kind':'band','lowerM':low,'upperM':high,'color':COLORS[index],'name':label},'geometry':{'type':'MultiPolygon','coordinates':polygons}})
    for level in range(0, 4500, 500):
        lines = [points(line) for line in generator.lines(level)]
        assert lines
        features.append({'type':'Feature','properties':{'id':f'contour-{level}','kind':'contour','elevationM':level,'major':level%1000==0,'name':f'{level:,} m等高線'},'geometry':{'type':'MultiLineString','coordinates':lines}})
    OUT.mkdir(exist_ok=True)
    geometry = gzip.compress(encoded({'type':'FeatureCollection','features':features}), mtime=0)
    (OUT/'elevation.geojson.gz').write_bytes(geometry)
    method = '既存の0.1度格子（元の60秒格子の陸域6×6セル平均）を使用。格子中心間で線形補間し、500m刻みの等高線と同じ境界の色面を生成。欠測に接する四角形は除外し、海岸や島を補完しません。線の頂点は小数6桁に丸めています。'
    layer = {**{key:original[key] for key in ['bounds','crs','width','height','resolutionDegrees','gridOrder','encoding','noData','period','sourceName','publisher','sourceUrl','license','licenseUrl','verticalDatum','sourceSha256','displayMinM','displayMaxM']}, 'title':'標高・500m間隔の等高線','sourceLabel':'NOAA ETOPO 2022 · CC0','unit':'m（EGM2008）','grid':'../africa-physical-v1/elevation.values.gz','file':'elevation.geojson.gz','vectorBands':True,'contourIntervalM':500,'majorIntervalM':1000,'breaks':list(range(0,4001,500)),'colors':COLORS,'legend':legend,'method':method,'scope':'色面と細線は500m刻み、太線は1,000m刻み。0.1度格子の平均標高に基づく概観で、山頂の高さや測量精度を示しません。海岸・小島・欠測の隙間は補いません。','takeaway':'高地と低地の位置を標高で比べます。国平均には表れない起伏と、農地・交通・水の利用条件を考える入口です。','description':'等高線は同じ標高を結ぶ線です。線が込み合う場所ほど、この格子で捉えた傾斜が急になります。色面は500mごとの標高帯で、0m未満の陸地も残しています。'}
    manifest = {'schemaVersion':1,'version':'1.0.0','layers':{'elevation':layer},'input':{'file':'public/assets/atlas/africa-physical-v1/elevation.values.gz','sha256':EXPECTED,'manifest':'public/assets/atlas/africa-physical-v1/manifest.json','manifestSha256':sha((SOURCE/'manifest.json').read_bytes())},'processing':{'script':Path(__file__).relative_to(ROOT).as_posix(),'scriptSha256':sha(Path(__file__).read_bytes()),'contourpy':contourpy.__version__,'numpy':np.__version__,'algorithm':'serial; corner_mask=false; quad_as_tri=false; linear; OuterOffset / Separate','reproduce':'python scripts/prepare-africa-elevation-500m.py'},'files':{'elevation.geojson.gz':{'bytes':len(geometry),'sha256':sha(geometry)}},'checks':{'unchangedGrid':True,'validGridCells':int(dem.count()),'bandCount':10,'contourLevelsM':list(range(0,4500,500))},'limitations':['0.1度の平均格子の最大値は4,497m。4,500m以上の山頂の不存在を意味しません。','色面と線は同じ補間境界。地点の数値は補間値でなく保存した格子平均値です。','格子値がない海岸や小島は空白。より細かな原標高の復元は行いません。']}
    (OUT/'manifest.json').write_bytes(encoded(manifest))
    print(json.dumps({'output':str(OUT),'bytes':len(geometry),'features':len(features)}))

if __name__ == '__main__': main()
