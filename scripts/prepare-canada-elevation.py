"""Build Canada vector contours from a pinned, native NOAA ETOPO2022 window.

Preparation only. Dependencies: numpy, shapely 2.1.2, contourpy 1.4.0.
First run decode-canada-etopo.mjs; the original global GeoTIFF remains outside
the repository. --land-mask may use the shared Beck/Canada land-mask.geojson.gz.
No source or display raster is exported by this script.
"""
from pathlib import Path
import argparse, gzip, hashlib, json, math
import numpy as np
import contourpy
from shapely.geometry import shape, mapping, LineString, Point
from shapely.ops import unary_union
from shapely import make_valid, contains_xy, prepare, points, STRtree

EXPECTED='9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e'
LEVELS=[500,1000,2000,3000,4000,5000]
COLORS=['#6a8d53','#9a914e','#ba7950','#a45b43','#854f4a','#644755']

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while chunk:=f.read(1048576):h.update(chunk)
    return h.hexdigest()

def read_geo(path):
    raw=gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()

def pieces(g):
    if g.geom_type=='LineString':yield g
    elif g.geom_type in ('MultiLineString','GeometryCollection'):
        for part in g.geoms:yield from pieces(part)

def write(path,obj,compact=False):
    path.write_text(json.dumps(obj,ensure_ascii=False,allow_nan=False,**({'separators':(',',':')} if compact else {'indent':2}))+'\n',encoding='utf8',newline='\n')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,required=True)
    p.add_argument('--grid',type=Path,required=True)
    p.add_argument('--land-mask',type=Path)
    p.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[1])
    a=p.parse_args();root=a.repo.resolve()
    if sha(a.source)!=EXPECTED:raise RuntimeError('Pinned full NOAA source SHA256 mismatch')
    gm=json.loads(a.grid.read_text(encoding='utf8'));gridfile=a.grid.parent/gm['file']
    if sha(gridfile)!=gm['sha256'] or gm['sourceSha256']!=EXPECTED:raise RuntimeError('Native decoded grid hash mismatch')
    if gm['geoKeys']['GeographicTypeGeoKey']!=4326 or gm['geoKeys']['VerticalCSTypeGeoKey']!=3855 or abs(gm['resolution'][0]-1/60)>1e-12:raise RuntimeError('Unexpected horizontal/vertical datum or resolution')
    boundary=root/'data-source/atlas/canada/industry/province-boundaries-2021.geojson.gz'
    data,boundary_raw_sha=read_geo(boundary)
    if len(data['features'])!=13:raise RuntimeError('Expected all 13 official province/territory features')
    source_invalid=sum(not shape(f['geometry']).is_valid for f in data['features'])
    if a.land_mask:
        a.land_mask=a.land_mask.resolve()
        mask_data,mask_raw_sha=read_geo(a.land_mask)
        if mask_data['type']=='FeatureCollection':land=unary_union([shape(f['geometry']) for f in mask_data['features']])
        elif mask_data['type']=='Feature':land=shape(mask_data['geometry'])
        else:land=shape(mask_data)
        mask_source={'file':a.land_mask.relative_to(root).as_posix(),'sha256':sha(a.land_mask),'uncompressedSha256':mask_raw_sha}
    else:
        land=unary_union([make_valid(shape(f['geometry']),method='structure',keep_collapsed=False) for f in data['features']])
        mask_source=None
    if not land.is_valid:raise RuntimeError('Invalid national land mask')
    prepare(land)
    print(json.dumps({'phase':'land-mask-ready','sourceInvalidProvinceGeometries':source_invalid,'bounds':land.bounds}),flush=True)
    dem=np.fromfile(gridfile,dtype='<f4').reshape((gm['height'],gm['width']))
    xs=gm['origin'][0]+(np.arange(gm['width'])+.5)*gm['resolution'][0]
    ys=gm['origin'][1]+(np.arange(gm['height'])+.5)*gm['resolution'][1]
    invalid=~np.isfinite(dem)|(dem==gm['noData'])
    country=contains_xy(land,xs[None,:],ys[:,None])
    sampled=dem[country&~invalid]
    if not len(sampled):raise RuntimeError('No valid Canada native cells')
    # A cell-centre national mask reduces irrelevant contours. The final vector
    # intersection with the original mask provides exact retained-boundary clip.
    z=np.ma.array(dem,mask=invalid|~country)
    cg=contourpy.contour_generator(x=xs,y=ys,z=z,line_type='Separate',corner_mask=False)
    features=[];counts={};vertices=0;self_crossing=0;dropped=0;tol=.003
    for level in LEVELS:
        count=0
        for raw in cg.lines(level):
            if len(raw)<2:continue
            simplified=LineString(raw).simplify(tol,preserve_topology=True)
            # Reclip after simplification so a chord cannot cross a coast/lake.
            clipped=simplified if land.covers(simplified) else simplified.intersection(land)
            for line in pieces(clipped):
                coords=[[round(x,6),round(y,6)] for x,y in line.coords]
                if len(coords)<2 or len(set(map(tuple,coords)))<2:dropped+=1;continue
                geom=LineString(coords)
                if not geom.is_simple:
                    self_crossing+=1
                    raise RuntimeError('Generated contour has a self crossing')
                count+=1;vertices+=len(coords)
                features.append({'type':'Feature','id':f'elevation-{level}-{count}','properties':{'id':str(level),'elevation_m':level,'name':f'{level:,} m','unit':'m','verticalDatum':'EGM2008','edition':2022},'geometry':{'type':'LineString','coordinates':coords}})
        counts[str(level)]=count
        print(json.dumps({'levelM':level,'segments':count}),flush=True)
    if not features:raise RuntimeError('No actual ETOPO contours')
    out=root/'public/assets/atlas/canada-climate-elevation-v1';out.mkdir(parents=True,exist_ok=True)
    sources=root/'data-source/atlas/canada-climate-elevation-v1/etopo';sources.mkdir(parents=True,exist_ok=True)
    grouped=[]
    for level in LEVELS:
        selected=[f for f in features if f['properties']['elevation_m']==level]
        if selected:
            grouped.append({'type':'Feature','id':f'elevation-{level}','properties':selected[0]['properties'],'geometry':{'type':'MultiLineString','coordinates':[f['geometry']['coordinates'] for f in selected]}})
    asset=out/'elevation-contours.geojson';write(asset,{'type':'FeatureCollection','features':grouped},True)
    level_meta=[{'id':str(n),'name':f'{n:,} m','color':c,'description':f'EGM2008基準の標高{n:,} mを結ぶETOPO 2022の等高線。地域平均や山頂標高ではありません。'} for n,c in zip(LEVELS,COLORS) if counts[str(n)]]
    metadata={'title':'Canada elevation contours — NOAA ETOPO 2022','publisher':'NOAA National Centers for Environmental Information','sourceUrl':'https://www.ncei.noaa.gov/products/etopo-global-relief-model','downloadUrl':'https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif','metadataUrl':'https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ngdc.mgg.dem%3Aetopo_2022/html','userGuideUrl':'https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/docs/1.2%20ETOPO%202022%20User%20Guide.pdf','sourceEdition':'ETOPO 2022 v1 60 arc-second surface','edition':2022,'editionNotObservationYear':True,'citation':'NOAA National Centers for Environmental Information. 2022: ETOPO 2022 15 Arc-Second Global Relief Model. DOI:10.25921/fd45-gt74. Accessed 2026-10-02.','license':'CC0-1.0','licenseUrl':'https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ngdc.mgg.dem%3Aetopo_2022/html','sourceRetrievedAt':'2026-09-25','verifiedAt':'2026-10-02','sourceSha256':EXPECTED,'sourceBytes':a.source.stat().st_size,'originalSourceReused':True,'decodedGridSha256':gm['sha256'],'decodedGridBytes':gm['bytes'],'decoderMethod':gm['method'],'horizontalCrs':'EPSG:4326','verticalDatum':'EGM2008 geoid','verticalCrs':'EPSG:3855','unit':'m','sourceResolution':'60 arc-seconds (1/60 degree)','sourceNoData':gm['noData'],'file':asset.name,'assetSha256':sha(asset),'assetBytes':asset.stat().st_size,'featureCount':len(features),'vertexCount':vertices,'levelCounts':counts,'levelsM':[int(n['id']) for n in level_meta],'levels':level_meta,'bbox':[round(v,6) for v in land.bounds],'geometry':'LineString','boundary':{'file':boundary.relative_to(root).as_posix(),'compressedSha256':sha(boundary),'uncompressedSha256':boundary_raw_sha,'source':'Statistics Canada 2021 Census Cartographic Boundary Files, 13 provinces/territories','sourceUrl':'https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/0','queryMetadata':'data-source/atlas/canada/industry/boundary-request.json','license':'Open Government Licence — Canada','licenseUrl':'https://open.canada.ca/en/open-government-licence-canada','sourceInvalidGeometriesRepaired':source_invalid,'repairMethod':'Shapely make_valid(method=structure, keep_collapsed=False) before union','sharedLandMask':mask_source},'grid':{'bounds':gm['bounds'],'width':gm['width'],'height':gm['height'],'window':gm['window'],'origin':gm['origin'],'resolution':gm['resolution'],'cellRegistration':'cell centre','dtype':gm['dtype'],'noDataCells':int(invalid.sum()),'validCanadaLandCells':int(len(sampled)),'sampledMinM':round(float(sampled.min()),3),'sampledMaxM':round(float(sampled.max()),3),'validBelowZeroCells':int((sampled<0).sum())},'method':'Exact native 60 arc-second surface float32 window, no resampling. ContourPy cell-centre linear interpolation at listed levels, cell-centre national land mask with corner_mask=False. Simplify lines by 0.003 degrees with topology preservation, then intersect with original shared land union. Round coordinates to six decimals. No negative/bathymetric contour levels are exported.','limitations':['2022 is the model edition; source observations span different years.','60 arc-second cells and simplified contours support a national overview. They do not provide exact summit or local survey elevations.','The elevation grid contains land and bathymetry. The national land clip excludes the sea; inland waters are removed when the shared lake mask is used.','The separate ETOPO geoid-height layer is not an elevation layer and is not used here. Elevations remain relative to EGM2008, approximately mean sea level.','Selected line values are contour heights, not provincial averages or arbitrary point measurements.','Native grid min/max are sampled values, not national extrema. Coastal cells can mix land and marine elevations.','Contours near coastlines stop at the cell-centre mask or retained cartographic boundary. Very small islands and features narrower than a source cell may be absent.'],'processingVersions':{'numpy':np.__version__,'contourpy':contourpy.__version__,'shapely':'2.1.2','geotiffjs':'3.0.5'}}
    metadata.update({
        'featureCount':len(grouped),'contourSegmentCount':len(features),'geometry':'MultiLineString',
        'sourceFile':'ETOPO_2022_v1_60s_N90W180_surface.tif',
        'source':{'publisher':'NOAA National Centers for Environmental Information','title':'ETOPO 2022 — 標高等高線','brief':'原格子60秒。EGM2008基準の高さを結ぶ線で、カナダの陸域に限定しています。','catalogueUrl':metadata['sourceUrl'],'descriptionUrl':metadata['userGuideUrl'],'licenceUrl':metadata['licenseUrl'],'licence':'CC0-1.0','attribution':'NOAA NCEI ETOPO 2022 (DOI:10.25921/fd45-gt74). Boundary: Statistics Canada, Open Government Licence — Canada. Lakes: Natural Earth v5.1.2, public domain.'},
        'reproduction':{'decoderScript':'scripts/decode-canada-etopo.mjs','contourScript':'scripts/prepare-canada-elevation.py','decoderCommand':'node scripts/decode-canada-etopo.mjs --source <downloaded-original.tif> --out <private-cache> --geotiff-package <geotiff-package>','contourCommand':'python scripts/prepare-canada-elevation.py --source <downloaded-original.tif> --grid <private-cache>/canada-etopo-window.json --land-mask data-source/atlas/canada-climate-elevation-v1/beck/land-mask.geojson.gz','dependencies':'GeoTIFF.js 3.0.5; Python numpy 2.5.3, shapely 2.1.2, contourpy 1.4.0','cachePolicy':'Original global source and native float32 window stay in a private preparation cache; the normal site build uses checked-in GeoJSON only.'}
    })
    metadata['limitations'].append('The shared land boundary retains the official query generalization (maxAllowableOffset=0.02 degrees, geometryPrecision=5); Natural Earth 1:50m lakes do not resolve every small water body.')
    if a.land_mask:
        mask_provenance=a.land_mask.parent/'land-mask-provenance.json'
        if mask_provenance.exists():metadata['boundary']['sharedLandMask']['provenanceFile']=mask_provenance.relative_to(root).as_posix()
    spots=[]
    for name,lon,lat in [('Vancouver',-123.1207,49.2827),('Winnipeg',-97.1384,49.8951),('Toronto',-79.3832,43.6532),('Mount Logan vicinity',-140.4058,60.5672),('Banff',-115.5708,51.1784)]:
        col=int((lon-gm['origin'][0])/gm['resolution'][0]);row=int((lat-gm['origin'][1])/gm['resolution'][1])
        spots.append({'name':name,'requestedLonLat':[lon,lat],'nativeCellCentreLonLat':[round(float(xs[col]),8),round(float(ys[row]),8)],'gridColumn':col,'gridRow':row,'elevationM':round(float(dem[row,col]),3),'insideLandMask':bool(land.covers(Point(float(xs[col]),float(ys[row]))))})
    # Vector checks use the same unrounded mask, with only coordinate-rounding tolerance.
    outside=0;nonfinite=0;invalid_lines=0;all_coords=[]
    for f in features:
        coords=f['geometry']['coordinates'];line=LineString(coords)
        invalid_lines+=not line.is_valid
        all_coords.extend(coords)
    coordinate_array=np.asarray(all_coords)
    nonfinite=int((~np.isfinite(coordinate_array)).sum())
    within=contains_xy(land,coordinate_array[:,0],coordinate_array[:,1])
    near_boundary=coordinate_array[~within]
    # Avoid buffering the enormous Canadian coastline. Index small boundary
    # line sections and check only points on/outside the exact mask after rounding.
    if len(near_boundary):
        boundary_sections=[]
        for ring in pieces(land.boundary):
            coords=list(ring.coords)
            for start in range(0,len(coords)-1,128):
                boundary_sections.append(LineString(coords[start:start+129]))
        tree=STRtree(boundary_sections)
        matches=tree.query(points(near_boundary),predicate='dwithin',distance=.000002)
        outside=len(near_boundary)-len(set(matches[0].tolist()))
    checks={'allCoordinatesFinite':nonfinite==0,'allLineGeometriesValid':invalid_lines==0,'allContoursSimple':self_crossing==0,'allVerticesWithinLandAtRoundingTolerance':outside==0,'uniqueFeatureIds':len({f['id'] for f in features})==len(features),'levelPropertiesMatch':all(int(f['properties']['id'])==f['properties']['elevation_m'] and f['properties']['elevation_m'] in LEVELS for f in features),'nationalClipBoundsWithinWindow':land.bounds[0]>=gm['bounds'][0] and land.bounds[1]>=gm['bounds'][1] and land.bounds[2]<=gm['bounds'][2] and land.bounds[3]<=gm['bounds'][3]}
    checks['groupedPartsPreserveAllSegments']=sum(len(f['geometry']['coordinates']) for f in grouped)==len(features)
    checks['uniqueGroupedFeatureIds']=len({f['id'] for f in grouped})==len(grouped)
    verification={'checks':checks,'allChecksPass':all(checks.values()),'outsideVertices':outside,'nonfiniteVertices':nonfinite,'invalidLineGeometries':int(invalid_lines),'selfCrossingLines':self_crossing,'droppedDegenerateSegments':dropped,'featureCount':len(grouped),'contourSegmentCount':len(features),'vertexCount':vertices,'levelCounts':counts,'spots':spots,'spotInterpretation':'Nearest native cell centres; these are coarse DEM spot checks, not exact city or summit heights.'}
    write(out/'elevation-manifest.json',metadata)
    write(sources/'source-ledger.json',metadata)
    write(sources/'native-window.json',gm)
    write(sources/'verification.json',verification)
    if not verification['allChecksPass']:raise RuntimeError('Generated vector checks failed')
    print(json.dumps({'output':str(asset),'features':len(grouped),'segments':len(features),'bytes':asset.stat().st_size,'sha256':sha(asset),'checks':checks,'spots':spots}),flush=True)

if __name__=='__main__':main()
