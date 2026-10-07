"""Display projection of held class masks across their entire source extent.

No measurement, class, or source pixel is changed. Nearest-neighbour lookup
retains categorical values. The full north remains available when zoomed out.
"""
from pathlib import Path
import hashlib, json, math
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]
assets=root/'public/assets/atlas/canada-water-v1'
source_manifest=json.loads((assets/'shared-palette-manifest.json').read_text())
expected={item['file']:item['sha256'] for item in source_manifest['outputs']}
r=math.pi/180
mercator=lambda lat:math.log(math.tan(math.pi/4+lat*r/2))
width,height=1800,2600
longitude=-145+(np.arange(width)+.5)/width*95
latitude=(2*np.arctan(np.exp(mercator(85)-(np.arange(height)+.5)/height*(mercator(85)-mercator(40))))-math.pi/2)/r
items=[]
for index in range(7):
    source=assets/f'annual-precipitation-us-{index}.png'
    sha=hashlib.sha256(source.read_bytes()).hexdigest()
    assert sha==expected[source.name],source
    original=np.array(Image.open(source).convert('RGBA'))
    h,w=original.shape[:2]
    x=np.floor((longitude+145)/95*w).astype(int)
    y=np.floor((85-latitude)/45*h).astype(int)
    assert x.min()>=0 and x.max()<w and y.min()>=0 and y.max()<h
    output=original[y[:,None],x[None,:]]
    target=assets/f'annual-precipitation-us-{index}-full-mercator.png'
    Image.fromarray(output).save(target,optimize=True)
    items.append({'source':source.name,'sourceSha256':sha,'output':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSize':[w,h],'northernVisiblePixels':int((output[:int(height*(mercator(85)-mercator(70))/(mercator(85)-mercator(40))),:,3]>0).sum())})
manifest={'method':'Inverse Web Mercator with nearest original source pixel, full held affine source extent; class masks and source color values retained. Display palette is applied separately in SVG. Source scientific resolution remains approximately 10 km.','geographicBounds':[-145,40,-50,85],'imageSize':[width,height],'sourceClassesModified':False,'files':items}
(assets/'full-mercator-display-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'outputs':len(items),'northernVisiblePixels':sum(i['northernVisiblePixels'] for i in items)}))
