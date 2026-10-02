"""Create Mexico vector contours from a pinned NOAA ETOPO 2022 original.

Offline only. Needs numpy, shapely and contourpy. The exact native
float32 DEM window is decoded by GeoTIFF.js, avoiding a GDAL runtime dependency.
The retained national INEGI boundary is already in geographic coordinates.
No raster image is exported; selection values are the actual contour levels.
"""
from pathlib import Path
import argparse, hashlib, json, math
import numpy as np
from shapely.geometry import shape, mapping, LineString
from shapely.ops import unary_union
from shapely import make_valid, contains_xy
import contourpy

EXPECTED='9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e'

def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as stream:
        while chunk:=stream.read(1024*1024):h.update(chunk)
    return h.hexdigest()

def lines(g):
    if g.geom_type=='LineString':yield g
    elif g.geom_type in ('MultiLineString','GeometryCollection'):
        for part in g.geoms:yield from lines(part)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--provenance',type=Path,required=True)
    parser.add_argument('--grid',type=Path,required=True)
    parser.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[1])
    args=parser.parse_args();repo=args.repo.resolve()
    if digest(args.source)!=EXPECTED:raise RuntimeError('Full NOAA original hash mismatch')
    provenance=json.loads(args.provenance.read_text(encoding='utf8'))
    boundary=repo/'src/data/atlas/mexico/geometry.json'
    original=json.loads(boundary.read_text(encoding='utf8'))
    land=unary_union([make_valid(shape(f['geometry'])) for f in original['features']])
    if not(-120<land.bounds[0]<-110 and -95<land.bounds[2]<-85 and 10<land.bounds[1]<20 and 30<land.bounds[3]<35):raise RuntimeError('Retained Mexico boundary is not geographic coordinates')
    grid=json.loads(args.grid.read_text(encoding='utf8'));grid_file=args.grid.parent/grid['file']
    if digest(grid_file)!=grid['sha256'] or grid['sourceSha256']!=EXPECTED:raise RuntimeError('Decoded grid provenance mismatch')
    if grid['geoKeys']['GeographicTypeGeoKey']!=4326 or abs(grid['resolution'][0]-1/60)>1e-10:raise RuntimeError('Unexpected grid CRS/resolution')
    dem=np.fromfile(grid_file,dtype='<f4').reshape((grid['height'],grid['width']))
    c0,r0,c1,r1=grid['window'];nodata=grid['noData']
    x_origin,y_origin=grid['origin'];x_step,y_step=grid['resolution']
    transform_grid=[x_step,0,x_origin,0,y_step,y_origin]
    # Never cast NoData to int16. Preserve valid negative elevations separately.
    invalid=~np.isfinite(dem)|(dem==-99999)
    z=np.ma.array(dem.astype(np.float64),mask=invalid)
    xs=x_origin+(np.arange(z.shape[1])+.5)*x_step
    ys=y_origin+(np.arange(z.shape[0])+.5)*y_step
    country=contains_xy(land,xs[None,:],ys[:,None])
    sampled=z.data[country&~invalid]
    if not len(sampled):raise RuntimeError('No valid Mexico DEM cells')
    levels=list(range(0,int(math.floor(float(sampled.max())/500))*500+1,500))
    generator=contourpy.contour_generator(x=xs,y=ys,z=z,line_type='Separate',corner_mask=True)
    features=[];counts={};tol=.002
    for level in levels:
        index=0
        for raw in generator.lines(level):
            if len(raw)<2:continue
            clipped=LineString(raw).intersection(land)
            for segment in lines(clipped):
                simplified=segment.simplify(tol,preserve_topology=True)
                coordinates=[[round(x,6),round(y,6)] for x,y in simplified.coords]
                if len(coordinates)<2 or len({tuple(p) for p in coordinates})<2:continue
                index+=1;identifier=f'contours-{level}-{index}'
                features.append({'type':'Feature','id':identifier,'properties':{'id':identifier,'name':f'標高{level:,}mの等高線（区間{index}）','elevationM':level,'unit':'m','verticalDatum':'EGM2008','edition':2022,'source':'NOAA ETOPO 2022 v1, 60 arc-second','bounds':[round(v,6) for v in simplified.bounds]},'geometry':{'type':'LineString','coordinates':coordinates}})
        if index:counts[str(level)]=index
        print(json.dumps({'levelM':level,'segments':index}),flush=True)
    if not features:raise RuntimeError('No actual Mexico contours generated')
    output=repo/'public/assets/atlas/mexico-water-v1';output.mkdir(parents=True,exist_ok=True)
    asset=output/'contours.geojson'
    asset.write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8',newline='\n')
    metadata={**provenance,'file':asset.name,'geometry':'LineString','featureCount':len(features),'levelCounts':counts,'levelsM':[int(n) for n in counts],'contourIntervalM':500,'assetBytes':asset.stat().st_size,'assetSha256':digest(asset),'boundarySha256':digest(boundary),'boundarySource':'INEGI retained Mexico state geometry, 32 states','bbox':[round(v,6) for v in land.bounds],'grid':{'width':z.shape[1],'height':z.shape[0],'window':[c0,r0,c1-c0,r1-r0],'transform':list(transform_grid)[:6],'noData':nodata,'noDataCells':int(invalid.sum()),'validMexicoCells':int(len(sampled)),'sampledMinM':round(float(sampled.min()),3),'sampledMaxM':round(float(sampled.max()),3),'validBelowZeroCells':int((sampled<0).sum())},'method':'Native 60 arc-second ETOPO2022 cell-centre float DEM, no resampling. ContourPy 500m contours clipped to retained INEGI national land union. Display lines simplified by 0.002 degrees and rounded to 6 decimal places. The retained INEGI boundary is already geographic and is used directly; the existing Mexico renderer applies its map projection after GeoJSON loading.','limitations':['2022 is the model edition, not a uniform observation year.','60 arc-second grid and 500m contour interval are for national comparison; they do not give survey-grade site elevations or exact summit heights.','Negative valid land elevations are retained; NoData is masked before any numeric transformation.','Selecting a line reports its contour level, not a state mean, river gradient, or measured elevation at arbitrary locations.','Sea-floor contours are excluded by the national land clip.']}
    metadata['decodedGridSha256']=grid['sha256'];metadata['decoderMethod']=grid['method']
    metadata['limitations'].append('Grid min/max are values of native cells selected by a generalized land boundary, not national land extrema; coastal cells may contain mixed marine and terrestrial elevations.')
    (output/'contours.source.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf8',newline='\n')
    print(json.dumps({'output':str(asset),'features':len(features),'bytes':asset.stat().st_size,'sha256':metadata['assetSha256']}),flush=True)

if __name__=='__main__':main()
