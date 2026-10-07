"""Clip retained representative-system click areas to the retained national boundary, offline."""
import argparse, hashlib, json
from pathlib import Path
from shapely import make_valid
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[1])
    repo=parser.parse_args().repo.resolve()
    boundary=repo/'src/data/atlas/mexico/geometry.json'
    land=unary_union([make_valid(shape(f['geometry'])) for f in json.loads(boundary.read_text())['features']])
    root=repo/'public/assets/atlas/mexico-basin-review-v1';catalog_file=root/'catalog.json'
    catalog=json.loads(catalog_file.read_text());features=[];inputs=[]
    for system in catalog['systems']:
        name=system['basinGeojson']
        if Path(name).name!=name:raise ValueError('Expected a local basin asset basename')
        source=root/name;raw=json.loads(source.read_text())
        region=unary_union([make_valid(shape(f['geometry'])) for f in raw['features']])
        clipped=region.intersection(land)
        if clipped.is_empty or clipped.geom_type not in ('Polygon','MultiPolygon'):raise ValueError('Empty domestic system control')
        features.append({'type':'Feature','properties':{'id':system['id'],'name':system['nameJa']},'geometry':mapping(clipped)})
        inputs.append({'file':name,'sha256':sha(source)})
    output=root/'domestic-controls.geojson'
    output.write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
    catalog['controlGeometry']={'file':output.name,'bytes':output.stat().st_size,'sha256':sha(output),'boundarySha256':sha(boundary),'inputs':inputs,'featureCount':3,'crs':'EPSG:4326','method':'Union each retained representative-system basin group and intersect it with the retained INEGI national land union. No new source data or independent simplification. These polygons are click areas, not a verified river network.','generator':'scripts/prepare-mexico-basin-controls.py'}
    catalog_file.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(catalog['controlGeometry']))

if __name__=='__main__':main()
