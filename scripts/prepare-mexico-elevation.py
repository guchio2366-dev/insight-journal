"""Create Mexico vector contours from a pinned NOAA ETOPO 2022 original.

Offline only. Needs numpy, shapely and contourpy. The exact native
float32 DEM window is decoded by GeoTIFF.js, avoiding a GDAL runtime dependency.
The retained national INEGI boundary is already in geographic coordinates.
No raster image is exported; selection values are the actual contour levels.
"""
from pathlib import Path
import argparse, hashlib, json, math, gzip
import numpy as np
from shapely.geometry import shape, mapping, LineString, Polygon
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

def polygons(g):
    if g.geom_type=='Polygon':yield g
    elif g.geom_type in ('MultiPolygon','GeometryCollection'):
        for part in g.geoms:yield from polygons(part)

def rounded(value):
    if isinstance(value,(tuple,list)):return [rounded(v) for v in value]
    return round(float(value),6)

def bands(repo,grid,z,xs,ys,land,levels,boundary):
    """Native isobands and their identical contour edges; no independent simplification."""
    generator=contourpy.contour_generator(x=xs,y=ys,z=z,line_type='Separate',fill_type='OuterOffset',corner_mask=True)
    colors=['#f6f4ed','#f0e5c9','#e4d3aa','#d6bc8c','#c5a471','#b58c58','#a37545','#8e6038','#784c2e','#623c28','#4d2e23','#382019']
    intervals=[(float(z.min())-1,0)]+[(n,n+500) for n in range(0,5000,500)]+[(5000,float(z.max())+1)]
    features=[];legend=[];area=0
    for index,(lower,upper) in enumerate(intervals):
        points,offsets=generator.filled(lower,upper);coordinates=[]
        for rings,starts in zip(points,offsets):
            parts=[rings[starts[i]:starts[i+1]] for i in range(len(starts)-1)]
            poly=Polygon(parts[0],parts[1:])
            for clipped in polygons(make_valid(poly).intersection(land)):
                if clipped.area<=1e-14:continue
                coordinates.append(rounded(mapping(clipped)['coordinates']));area+=clipped.area
        label='0 m未満' if index==0 else '5,000 m以上' if index==11 else f'{int(lower):,}–{int(upper):,} m'
        properties={'id':f'elevation-band-{index}','lowerM':None if index==0 else int(lower),'upperM':None if index==11 else int(upper),'label':label,'color':colors[index],'unit':'m'}
        features.append({'type':'Feature','properties':properties,'geometry':{'type':'MultiPolygon','coordinates':coordinates}})
        legend.append({k:properties[k] for k in ['id','label','color','lowerM','upperM']})
        print(json.dumps({'band':label,'polygons':len(coordinates)}),flush=True)
    contour_features=[]
    for level in levels:
        coordinates=[]
        for raw in generator.lines(level):
            for segment in lines(LineString(raw).intersection(land)):
                if segment.length>1e-10:coordinates.append(rounded(list(segment.coords)))
        contour_features.append({'type':'Feature','properties':{'elevationM':level,'unit':'m'},'geometry':{'type':'MultiLineString','coordinates':coordinates}})
    output=repo/'public/assets/atlas/mexico-water-v1';asset=output/'elevation-bands.geojson.gz'
    payload={'type':'FeatureCollection','features':features,'contours':contour_features,'decodedGridSha256':grid['sha256'],'intervalM':500}
    encoded=(json.dumps(payload,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode('utf8')
    asset.write_bytes(gzip.compress(encoded,compresslevel=9,mtime=0))
    # Check the union independently of the serialized class count, before publishing any metadata.
    geometries=[shape(f['geometry']) for f in features]
    union=unary_union(geometries)
    if land.symmetric_difference(union).area/land.area>1e-5:raise RuntimeError('Bands do not cover the retained national land boundary')
    if abs(sum(g.area for g in geometries)-union.area)/land.area>1e-5:raise RuntimeError('Bands overlap')
    source=json.loads((output/'contours.source.json').read_text())
    record={'file':asset.name,'bytes':asset.stat().st_size,'sha256':digest(asset),'provenanceFile':'elevation-bands.source.json','legend':legend,'intervalM':500,'decodedGridSha256':grid['sha256']}
    metadata={**record,'decodedBytes':len(encoded),'sourceUrl':source['sourceUrl'],'downloadUrl':source['downloadUrl'],'sourceEdition':source['sourceEdition'],'sourceSha256':grid['sourceSha256'],'sourceSha256Status':grid['sourceSha256Status'],'fullSourceHashRecomputed':False,'license':source['license'],'licenseUrl':source['licenseUrl'],'horizontalCrs':'EPSG:4326','verticalDatum':'EGM2008','unit':'m','editionNotObservationYear':True,'grid':grid,'boundarySha256':digest(boundary),'method':'ContourPy native cell-centre isobands and matching contours from the same float32 DEM. No resampling or independent simplification. Both are clipped to the retained INEGI national land union, rounded to six decimal degrees and projected by the existing renderer. Boundaries are shared contour levels; class interiors lie between them.','limitations':['2022 is a model edition, not a uniform observation year.','Native 60 arc-second resolution; 500 m bands do not give survey-grade elevations or exact summit heights.','Valid below-zero cells remain a separate class; coastal cells may mix marine and terrestrial elevations. Grid extrema are not national land extrema.','NoData is masked, never converted to zero. Sea and foreign territory are clipped away.'],'verification':{'nationalCoverageDifferenceRatio':land.symmetric_difference(union).area/land.area,'overlapAreaRatio':max(0,(sum(g.area for g in geometries)-union.area)/land.area),'classCount':len(features),'contourLevelsM':levels}}
    (output/record['provenanceFile']).write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    manifest_file=output/'manifest.json';manifest=json.loads(manifest_file.read_text());manifest['layers']['contours']['bands']=record
    manifest_file.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'output':str(asset),'bytes':record['bytes'],'sha256':record['sha256'],'coverageDifferenceRatio':metadata['verification']['nationalCoverageDifferenceRatio']}),flush=True)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path)
    parser.add_argument('--provenance',type=Path)
    parser.add_argument('--bands-only',action='store_true',help='Use the retained verified native window; preserve the original contour files')
    parser.add_argument('--grid',type=Path,required=True)
    parser.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[1])
    args=parser.parse_args();repo=args.repo.resolve()
    if args.source and digest(args.source)!=EXPECTED:raise RuntimeError('Full NOAA original hash mismatch')
    if not args.bands_only and (not args.source or not args.provenance):raise RuntimeError('Original contour regeneration requires source and provenance')
    provenance=json.loads(args.provenance.read_text(encoding='utf8')) if args.provenance else None
    boundary=repo/'src/data/atlas/mexico/geometry.json'
    original=json.loads(boundary.read_text(encoding='utf8'))
    land=unary_union([make_valid(shape(f['geometry'])) for f in original['features']])
    if not(-120<land.bounds[0]<-110 and -95<land.bounds[2]<-85 and 10<land.bounds[1]<20 and 30<land.bounds[3]<35):raise RuntimeError('Retained Mexico boundary is not geographic coordinates')
    grid=json.loads(args.grid.read_text(encoding='utf8'));grid_file=args.grid.parent/grid['file']
    if digest(grid_file)!=grid['sha256'] or grid['sourceSha256']!=EXPECTED:raise RuntimeError('Decoded grid provenance mismatch')
    if grid['geoKeys']['GeographicTypeGeoKey']!=4326 or abs(grid['resolution'][0]-1/60)>1e-10:raise RuntimeError('Unexpected grid CRS/resolution')
    if grid.get('dtype')!='float32-little-endian' or grid.get('unit')!='m' or grid.get('verticalDatum')!='EGM2008' or grid_file.stat().st_size!=grid['width']*grid['height']*4:raise RuntimeError('Unexpected native grid format, size or elevation unit')
    dem=np.fromfile(grid_file,dtype='<f4').reshape((grid['height'],grid['width']))
    c0,r0,c1,r1=grid['window'];nodata=grid['noData']
    x_origin,y_origin=grid['origin'];x_step,y_step=grid['resolution']
    transform_grid=[x_step,0,x_origin,0,y_step,y_origin]
    # Never cast NoData to int16. Preserve valid negative elevations separately.
    invalid=~np.isfinite(dem)|(dem==nodata)
    z=np.ma.array(dem.astype(np.float64),mask=invalid)
    xs=x_origin+(np.arange(z.shape[1])+.5)*x_step
    ys=y_origin+(np.arange(z.shape[0])+.5)*y_step
    country=contains_xy(land,xs[None,:],ys[:,None])
    sampled=z.data[country&~invalid]
    if not len(sampled):raise RuntimeError('No valid Mexico DEM cells')
    levels=list(range(0,int(math.floor(float(sampled.max())/500))*500+1,500))
    if args.bands_only:
        bands(repo,grid,z,xs,ys,land,levels,boundary);return
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
