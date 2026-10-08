"""Place a few map labels directly on the checked-in GPCC 250 mm isolines."""
from pathlib import Path
import json
import math
import re

ROOT = Path(__file__).resolve().parents[2]
svg = (ROOT / 'public/assets/atlas/europe/precipitation-contours-v1/precipitation.svg').read_text()
paths = {int(level): path for level, path in re.findall(r'data-isohyet-mm="(\d+)" d="([^"]*)"', svg)}
targets = [(500, -3.6, 40.7), (750, 2.6, 49.9), (1000, 11.6, 47.0), (1500, 7.1, 59.4)]
merc_north = math.log(math.tan(math.pi / 4 + math.radians(73) / 2))
merc_south = math.log(math.tan(math.pi / 4 + math.radians(32) / 2))
labels = []
for level, target_lon, target_lat in targets:
    points = []
    for x, y in re.findall(r'[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)', paths[level]):
        longitude = float(x) / 1800 * 90 - 25
        mercator = merc_north - float(y) / 1502 * (merc_north - merc_south)
        latitude = math.degrees(2 * math.atan(math.exp(mercator)) - math.pi / 2)
        points.append((longitude, latitude))
    longitude, latitude = min(points, key=lambda point: (point[0] - target_lon) ** 2 + (point[1] - target_lat) ** 2)
    assert abs(longitude - target_lon) < .2 and abs(latitude - target_lat) < .2
    labels.append(dict(mm=level, coordinates=[round(longitude, 6), round(latitude, 6)]))

output = ROOT / 'src/data/atlas/europe/precipitation-line-labels.json'
output.write_text(json.dumps(labels, ensure_ascii=False, indent=2) + '\n')
