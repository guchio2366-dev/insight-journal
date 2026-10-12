"""Prepare the East Asia display coast and named core farm-label anchors.

Uses pinned Natural Earth originals and the existing reviewed crop polygons.
No crop value, settlement boundary or national statistic is changed.
Requires shapely. Raw inputs are supplied explicitly, never downloaded here.
"""
from pathlib import Path
import argparse, gzip, hashlib, json, math
from shapely.geometry import shape, mapping, box
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/atlas/east-asia-v2'
AUDIT = ROOT / 'data-source/atlas/east-asia/second-feedback'
TARGETS = {'CHN', 'JPN', 'KOR', 'PRK', 'MNG', 'TWN'}
R = 6378137

def forward(x, y, z=None):
    return R * math.radians(x), R * math.log(math.tan(math.pi / 4 + math.radians(y) / 2))

def backward(x, y, z=None):
    return math.degrees(x / R), math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2)

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def round_coordinates(value):
    if isinstance(value, (float, int)):
        return round(value, 5)
    return [round_coordinates(v) for v in value]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--countries', type=Path, required=True)
    parser.add_argument('--marine', type=Path, required=True)
    args = parser.parse_args()
    country_source = json.loads(args.countries.read_bytes())
    extent = box(67, 12, 152, 60)
    tolerance = 1500  # projected metres; display detail, not surveying accuracy
    coast, checks = [], []
    original_targets = {}
    for feature in country_source['features']:
        original = shape(feature['geometry'])
        if not original.intersects(extent):
            continue
        original = original.intersection(extent)
        if not original.area:
            continue
        code = feature['properties']['ADM0_A3']
        projected = transform(forward, original)
        simplified = projected.simplify(tolerance, preserve_topology=True)
        assert simplified.is_valid and not simplified.is_empty
        geometry = mapping(transform(backward, simplified))
        geometry['coordinates'] = round_coordinates(geometry['coordinates'])
        display = shape(geometry)
        assert display.is_valid and not display.is_empty
        coast.append(dict(type='Feature', properties=dict(code=code, target=code in TARGETS), geometry=geometry))
        components = lambda g: len(getattr(g, 'geoms', [g]))
        checks.append(dict(code=code, originalProjectedArea=projected.area, displayProjectedArea=simplified.area,
                           sourceComponents=components(original), displayComponents=components(display),
                           boundaryHausdorffMetres=projected.boundary.hausdorff_distance(transform(forward, display).boundary)))
        if code in TARGETS:
            original_targets[code] = original
    assert TARGETS <= set(original_targets)
    write(OUT / 'coast.json', dict(type='FeatureCollection', features=coast))
    old_detailed = ROOT / 'public/assets/atlas/asia-population-v1/east-asia.geography.json'
    coast_file = OUT / 'coast.json'
    write(AUDIT / 'coast-provenance.json', dict(
        sourceUrl='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',
        sourceSha256=sha(args.countries), edition='Natural Earth v5.1.2, 1:10 million', license='Public domain',
        sourceCrs='EPSG:4326', simplifyCrs='EPSG:3857', simplifyToleranceMetres=tolerance, clipBounds=[67,12,152,60],
        method='Clip original country geometry to the existing region plus context. Simplify in Mercator with topology preservation; retain small source island polygons and holes. Round WGS84 display coordinates to five decimals. No thematic values or selection camera are inferred from this file.',
        output=dict(file='coast.json', sha256=sha(coast_file), bytes=coast_file.stat().st_size, gzipBytes=len(gzip.compress(coast_file.read_bytes(), mtime=0))),
        previousDetailed=dict(bytes=old_detailed.stat().st_size, gzipBytes=len(gzip.compress(old_detailed.read_bytes(), mtime=0))), countryAreas=checks))

    marine_names = {'Yellow Sea':'黄海', 'East China Sea':'東シナ海', 'Sea of Japan':'日本海', 'Japan Sea':'日本海', 'North Pacific Ocean':'太平洋'}
    seas = []
    for feature in json.loads(args.marine.read_bytes())['features']:
        name = feature['properties'].get('name')
        if name not in marine_names:
            continue
        visible = shape(feature['geometry']).intersection(box(115,18,151,52))
        if visible.is_empty:
            continue
        point = visible.representative_point()
        seas.append(dict(id='sea-' + str(feature['properties']['ne_id']), name=marine_names[name], point=[round(point.x,5),round(point.y,5)], sourceName=name, sourceId=feature['properties']['ne_id']))
    write(OUT / 'seas.json', dict(names=seas, source=dict(url='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_marine_polys.geojson', sha256=sha(args.marine), license='Public domain', method='Label anchors inside the original named marine polygons within the East Asia display. No current or wind extent is inferred from these polygons.')))

    farm_path = ROOT / 'public/assets/atlas/asia-presentation-v1/east-asia.farming-areas.json.gz'
    farms = json.loads(gzip.decompress(farm_path.read_bytes()))
    manifest = json.loads((ROOT / 'public/assets/atlas/asia-presentation-v1/manifest.json').read_bytes())
    product_metadata = manifest['regions']['east-asia']['farming']['products']
    core_labels = []
    for feature in farms['features']:
        properties = feature['properties']
        if properties['distribution'] != 'core':
            continue
        product = next(p for p in product_metadata if p['id'] == properties['id'])
        geometry = shape(feature['geometry'])
        parts = sorted(getattr(geometry, 'geoms', [geometry]), key=lambda g: transform(forward, g).area, reverse=True)
        # Multiple named major patches, not one displaced country-centre label.
        selected = [(part, None) for part in parts[:2]]
        for code in ['JPN', 'KOR']:
            domestic = [part for part in parts if part.intersects(original_targets[code])]
            if domestic and product['id'] == 'rice':
                selected.append((domestic[0], code))
        for index, (part, anchor_country) in enumerate(selected):
            location = part.intersection(original_targets[anchor_country]) if anchor_country else part
            point = location.representative_point()
            core_labels.append(dict(id=f"core-{product['id']}-{index}", product=product['id'], text=product['title'], kind='crop', color=product['color'], coordinate=[point.x,point.y], sourceDistribution='core', sourceComponentArea3857=transform(forward, part).area, anchorCountry=anchor_country))
    write(OUT / 'farm-labels.json', dict(labels=core_labels, sourceFile='asia-presentation-v1/east-asia.farming-areas.json.gz', sourceSha256=sha(farm_path), method='Two largest connected concentration-core components by projected area per crop, plus the largest rice core intersecting Japan and South Korea. Label anchors are source-core interior points. Components and original production distributions are unchanged; area only prioritizes labels and never represents production volume. Existing livestock concentration anchors remain source locations.'))
    print(json.dumps(dict(coastBytes=coast_file.stat().st_size, coastGzipBytes=len(gzip.compress(coast_file.read_bytes(),mtime=0)), farmLabels=len(core_labels), seas=seas), ensure_ascii=False))

if __name__ == '__main__':
    main()
