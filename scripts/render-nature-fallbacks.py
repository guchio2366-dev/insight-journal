"""Render the four fallback maps from the same data/projection as MapLibre."""
import json
import argparse
import hashlib
import os
import gzip
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/atlas/nature-v1'
BASE=json.loads((ROOT/'public/assets/atlas/v3/base.geojson').read_text())
WIDTH,HEIGHT=1800,1091
BOUNDS=(-128,22,-64,52)
FONT_PATH=os.environ.get('ATLAS_NATURE_FONT',str(Path(os.environ.get('ATLAS_NATURE_TMP','/tmp/atlas-nature-v1'))/'NotoSansCJKjp-Regular.otf'))

def project(p):
    x,y=p
    merc=lambda lat:math.log(math.tan(math.pi/4+math.radians(lat)/2))
    return ((x+128)/64*WIDTH,(merc(52)-merc(y))/(merc(52)-merc(22))*HEIGHT)

def geometry(draw,g,fill=None,line=None,width=1):
    kind=g['type'];c=g['coordinates']
    if kind=='Polygon':
        # The fallback base is redrawn in geographic layer order.
        draw.polygon([project(p) for p in c[0]],fill=fill,outline=line,width=width)
    elif kind=='MultiPolygon':
        for part in c:geometry(draw,dict(type='Polygon',coordinates=part),fill,line,width)
    elif kind=='LineString':
        if len(c)>1:draw.line([project(p) for p in c],fill=line,width=width)
    elif kind=='MultiLineString':
        for part in c:geometry(draw,dict(type='LineString',coordinates=part),fill,line,width)

def label(draw,text,coordinate,color='#3a5054',size=26):
    x,y=project(coordinate);font=ImageFont.truetype(FONT_PATH,size)
    draw.text((x,y),text,font=font,fill=color,anchor='mm',stroke_width=3,stroke_fill='#fcfaf2')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--interactive-landform-only',action='store_true',help='Render only the existing landform data without burned-in names for DOM labels')
    parser.add_argument('--interactive-water-only',action='store_true',help='Render water without burned-in names for accessible DOM labels')
    args=parser.parse_args()
    interactive=args.interactive_landform_only or args.interactive_water_only
    overlays=json.loads((OUT/'overlays.geojson').read_text())['features']
    contour=[] if interactive else json.loads(gzip.decompress((OUT/'contours.geojson.gz').read_bytes()))['features']
    for mode in (['landform'] if args.interactive_landform_only else ['water'] if args.interactive_water_only else ['climate','water','landform','contour']):
        im=Image.new('RGBA',(WIDTH,HEIGHT),'#e4eff0');draw=ImageDraw.Draw(im)
        for f in BASE['features']:
            if f['properties']['kind']=='land':geometry(draw,f['geometry'],'#faf9f3','#809297',2)
        if mode in ['water','landform']:
            relief=Image.open(ROOT/'public/assets/atlas/v3/relief.webp').convert('RGBA').resize(im.size)
            im=Image.blend(im,relief,.15 if mode=='water' else .65)
        if mode=='climate':
            climate=Image.open(OUT/'koppen-1991-2020.png').convert('RGBA').resize(im.size,Image.Resampling.NEAREST)
            im.alpha_composite(climate)
        if mode=='water':
            layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer)
            for f in json.loads((OUT/'aquifers.geojson').read_text())['features']:geometry(d,f['geometry'],'#c9c0d87f','#807291',3)
            mask=layer.getchannel('A');stripes=Image.new('RGBA',im.size);sd=ImageDraw.Draw(stripes)
            for x in range(-HEIGHT,WIDTH,16):sd.line([(x,HEIGHT),(x+HEIGHT,0)],fill='#857596',width=2)
            stripes.putalpha(Image.fromarray(np.minimum(np.asarray(stripes.getchannel('A')),np.asarray(mask))))
            im.alpha_composite(layer);im.alpha_composite(stripes)
        draw=ImageDraw.Draw(im)
        for f in BASE['features']:
            kind=f['properties']['kind']
            if kind=='state':geometry(draw,f['geometry'],None,'#b7c1bd',1)
            elif kind=='land':geometry(draw,f['geometry'],None,'#748b90',2)
            elif kind=='river' and mode in ['water','landform']:geometry(draw,f['geometry'],None,'#598eaa',2)
            elif kind=='lake':geometry(draw,f['geometry'],'#c0dce7','#82afc0',1)
        if mode=='contour':
            occupied=[]
            for f in sorted(contour,key=lambda f:not f['properties']['index']):
                level=f['properties']['elevationM'];geometry(draw,f['geometry'],None,'#b6a18a' if level%1000==0 else '#d0c5b6',1)
            for f in sorted(contour,key=lambda f:len(f['geometry']['coordinates']),reverse=True):
                level=f['properties']['elevationM'];points=f['geometry']['coordinates'];p=points[len(points)//2];x,y=project(p)
                if level>0 and len(points)>20 and 45<x<WIDTH-45 and 35<y<HEIGHT-35 and all(math.hypot(x-a,y-b)>155 for a,b in occupied):
                    label(draw,f'{level:,} m',p,'#805638',23);occupied.append((x,y))
        for f in overlays:
            p=f['properties'];g=f['geometry']
            if p['kind'] in ['current','upwelling']:
                color='#247d9d' if p.get('temperature')!='warm' else '#b8523e';geometry(draw,g,None,color,4)
                if p['kind']=='current' and not p.get('arrowhead'):
                    a,b=map(project,g['coordinates'][-2:]);angle=math.atan2(b[1]-a[1],b[0]-a[0]);size=18
                    draw.polygon([b,(b[0]-size*math.cos(angle-.5),b[1]-size*math.sin(angle-.5)),(b[0]-size*math.cos(angle+.5),b[1]-size*math.sin(angle+.5))],fill=color)
            elif p['kind']=='reservoir' and mode=='water':
                x,y=project(g['coordinates']);draw.ellipse((x-7,y-7,x+7,y+7),fill='#fff',outline='#286e91',width=3)
        # Offset to an ocean label-safe area; no quantitative meaning in arrows.
        label(draw,'カリフォルニア海流',[-119.0,27.0],'#186c8c',28)
        label(draw,'〈寒流〉 ↓',[-119.0,25.5],'#186c8c',26)
        label(draw,'メキシコ湾流〈暖流〉 ↗',[-76,27],'#ac4434',28)
        label(draw,'沿岸湧昇',[-124.2,39.7],'#247d9d',23)
        if mode in ['landform','contour'] and not args.interactive_landform_only:
            for text,p in [('ロッキー山脈',[-110,44]),('アパラチア山脈',[-81,37]),('グレートプレーンズ',[-101,40])]:label(draw,text,p,size=30)
        if mode=='landform' and not args.interactive_landform_only:
            for text,p in [('シエラネバダ山脈',[-118.5,37]),('カスケード山脈',[-120.5,46]),('中央平原',[-91,42]),('コロラド高原',[-110.5,36]),('グレートベースン',[-116.5,41]),('海岸平野',[-84,32])]:label(draw,text,p,size=23)
        if mode=='contour':
            label(draw,'最高峰エルバート 約4,400 m',[-110,42.4],size=24)
            label(draw,'最高峰ミッチェル 約2,037 m',[-81,35.3],size=24)
        if mode=='water' and not args.interactive_water_only:
            for text,p in [('ハイプレーンズ帯水層',[-101,40]),('セントラルバレー帯水層系',[-116,35]),('ミシシッピ川',[-89,33]),('五大湖',[-83,46])]:label(draw,text,p,size=27)
        if mode=='climate':
            for city in json.loads((OUT/'climate-cities.json').read_text()):
                x,y=project([city['longitude'],city['latitude']]);draw.ellipse((x-6,y-6,x+6,y+6),fill='#fff',outline='#263f4c',width=3)
        name=f'{mode}-interactive.webp' if interactive else f'{mode}-fallback.webp'
        im.convert('RGB').save(OUT/name,quality=90,method=6)
        if interactive:
            manifest=json.loads((OUT/'manifest.json').read_text())
            data=(OUT/name).read_bytes()
            manifest['files'][name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
            manifest['fallbacks']['interactiveLandform' if mode=='landform' else 'interactiveWater']=f'{name}: same published geometry and projection; names are accessible DOM labels; original labelled image retained for no-JavaScript and full-size viewing'
            (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
        print(name,flush=True)

if __name__=='__main__':main()
