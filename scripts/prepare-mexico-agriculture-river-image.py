"""Raster cache for the existing projected river SVG, preserving its coordinates."""
from pathlib import Path
import re,hashlib,json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
folder=root/'public/assets/atlas/mexico-agriculture-v2'
source=(folder/'rivers.svg').read_bytes()
image=Image.new('RGBA',(3600,2320));draw=ImageDraw.Draw(image)
for path,width in re.findall(r'<path d="([^"]+)" stroke-width="([^"]+)"',source.decode()):
 for segment in path.split('M')[1:]:
  points=[tuple(float(value)*4 for value in pair.split(',')) for pair in segment.split('L')]
  draw.line(points,fill=(77,148,175,158),width=max(1,round(float(width)*4)))
image=image.resize((1800,1160),Image.Resampling.LANCZOS)
image.save(folder/'rivers.png',optimize=True)
(folder/'rivers-image-manifest.json').write_text(json.dumps({'source':'rivers.svg','sourceSha256':hashlib.sha256(source).hexdigest(),'file':'rivers.png','sha256':hashlib.sha256((folder/'rivers.png').read_bytes()).hexdigest(),'width':1800,'height':1160,'mapViewBox':'0 0 900 580','method':'Raster cache of unchanged projected river coordinates; 4x antialiasing, then 2x display pixels. No geographic resampling or invented watercourses.'},indent=2)+'\n')
print((folder/'rivers.png').stat().st_size)
