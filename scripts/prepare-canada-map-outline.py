"""Shared cartographic outline from the climate polygons (same source mask).
Topology-preserving simplification of 0.01 degree for the 900px national view.
Original geometry and attribution remain in koppen.geojson/koppen-manifest.json.
"""
from pathlib import Path
import json
from shapely.geometry import shape,mapping,Polygon,MultiPolygon
from shapely.ops import unary_union
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'public/assets/atlas/canada-climate-elevation-v1/koppen.geojson').read_text())
g=unary_union([shape(f['geometry']) for f in d['features']])
g=MultiPolygon([Polygon(p.exterior,[r for r in p.interiors if Polygon(r).area>=.003]) for p in getattr(g,'geoms',[g]) if p.area>=.003]).simplify(.01,preserve_topology=True)
(root/'src/data/atlas/canada/map-outline.json').write_text(json.dumps({'type':'Feature','properties':{'source':'Dissolved climate geometry; original sources/licence: koppen-manifest.json','simplificationDegrees':.01,'minimumPolygonAreaDegree2':.003},'geometry':mapping(g)},separators=(',',':'))+'\n')
