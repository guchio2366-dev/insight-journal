"""Offline GPCC annual / ETOPO relief contours and Natural Earth river preparation.
python scripts/latin-america/prepare-water-terrain.py --cache <private-source-cache>
Native arrays and original sources stay outside the repository; no network calls.
"""
import argparse, hashlib, json, math, pathlib
import numpy as np
import contourpy
from matplotlib.path import Path

ROOT = pathlib.Path(__file__).resolve().parents[2]
BOUNDS = [-93, -56, -33, 28]
def sha(data): return hashlib.sha256(data).hexdigest()
def read_json(path): return json.loads(path.read_text())
def write_json(path, data): path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
def mercator(lat): return math.log(math.tan(math.pi/4+lat*math.pi/360))*180/math.pi
SCALE = 580/(mercator(28)-mercator(-56))
def project(points):
    p = np.asarray(points, dtype=float)
    return np.column_stack(((p[:,0]+93)*SCALE, (mercator(28)-np.log(np.tan(np.pi/4+p[:,1]*np.pi/360))*180/np.pi)*SCALE))
def path_string(points, closed=False):
    p = project(points)
    return 'M'+'L'.join(f'{x:.3f},{y:.3f}' for x,y in p)+('Z' if closed else '')
def polygons(geometry): return [geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
def land_mask(x, y, countries):
    xx, yy = np.meshgrid(x,y); points = np.column_stack((xx.ravel(),yy.ravel())); mask=np.zeros(len(points),dtype=bool)
    for country in countries:
        for polygon in polygons(country['geometry']):
            ring = np.asarray(polygon[0]); lo=ring.min(axis=0);hi=ring.max(axis=0)
            at=np.flatnonzero((points[:,0]>=lo[0])&(points[:,0]<=hi[0])&(points[:,1]>=lo[1])&(points[:,1]<=hi[1]))
            if not len(at): continue
            inside=Path(ring).contains_points(points[at])
            for hole in polygon[1:]: inside &= ~Path(np.asarray(hole)).contains_points(points[at])
            mask[at[inside]]=True
    return mask.reshape(len(y),len(x))
def ramp(anchors, count):
    a=np.asarray([[int(c[i:i+2],16) for i in (1,3,5)] for c in anchors])
    return ['#'+''.join(f'{int(round(v)):02x}' for v in a[min(int(t),len(a)-2)]*(1-(t%1))+a[min(int(t),len(a)-2)+1]*(t%1)) if t<len(a)-1 else anchors[-1] for t in np.linspace(0,len(a)-1,count)]
def geometry_svg(generator, levels, palette):
    fills=[]; lines=[]; total_vertices=0
    for i,(low,high) in enumerate(zip(levels[:-1],levels[1:])):
        points, offsets=generator.filled(float(low),float(high))
        d=[]
        for pts, rings in zip(points,offsets):
            for start,end in zip(rings[:-1],rings[1:]):
                ring=pts[start:end]; total_vertices+=len(ring);d.append(path_string(ring,True))
        if d:fills.append(f'<path fill="{palette[i]}" fill-rule="evenodd" d="{"".join(d)}"/>')
    for level in levels[1:-1]:
        parts=generator.lines(float(level))
        d=''.join(path_string(line) for line in parts if len(line)>1)
        if d: lines.append(f'<path data-contour="{level:g}" d="{d}"/>')
    return fills,lines,total_vertices
def clipped_segment(a,b):
    west,south,east,north=BOUNDS;dx=b[0]-a[0];dy=b[1]-a[1];low=0;high=1
    for p,q in [(-dx,a[0]-west),(dx,east-a[0]),(-dy,a[1]-south),(dy,north-a[1])]:
        if p==0:
            if q<0:return None
        else:
            t=q/p
            if p<0:low=max(low,t)
            else:high=min(high,t)
            if low>high:return None
    return [[a[0]+low*dx,a[1]+low*dy],[a[0]+high*dx,a[1]+high*dy]]
def clip_line(line):
    parts=[];part=[]
    for a,b in zip(line[:-1],line[1:]):
        segment=clipped_segment(a,b)
        if segment is None:
            if len(part)>1:parts.append(part)
            part=[];continue
        if part and np.allclose(part[-1],segment[0],rtol=0,atol=1e-8):part.append(segment[1])
        else:
            if len(part)>1:parts.append(part)
            part=segment
    if len(part)>1:parts.append(part)
    return parts
def prepare(cache):
    output=ROOT/'public/assets/atlas/latin-water-terrain-v1';ledger=ROOT/'data-source/atlas/latin-america/water-terrain'
    output.mkdir(parents=True,exist_ok=True);ledger.mkdir(parents=True,exist_ok=True)
    geography_path=ROOT/'src/data/atlas/latin-america/countries.json';geography=read_json(geography_path)['features']
    assert len(geography)==34 and all(f['properties']['code']!='MEX' for f in geography)
    outline=''.join(path_string(ring,True) for f in geography for polygon in polygons(f['geometry']) for ring in polygon)
    prefix='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 580"><defs><clipPath id="land"><path fill-rule="evenodd" clip-rule="evenodd" d="'+outline+'"/></clipPath></defs><g clip-path="url(#land)">'
    files={};validation={}
    for kind in ['rainfall','elevation']:
        meta=read_json(cache/('gpcc-extraction.json' if kind=='rainfall' else 'etopo-extraction.json'))
        raw=cache/('gpcc-annual.f32' if kind=='rainfall' else 'etopo-native.f32');assert sha(raw.read_bytes())==meta['gridSha256']
        full=np.memmap(raw,dtype='<f4',mode='r',shape=(meta['height'],meta['width']))
        stride=1 if kind=='rainfall' else 3
        z=np.asarray(full[::stride,::stride],dtype=float)
        x=meta['firstCenter'][0]+np.arange(z.shape[1])*meta['step'][0]*stride
        y=meta['firstCenter'][1]+np.arange(z.shape[0])*meta['step'][1]*stride
        land=land_mask(x,y,geography);valid=np.isfinite(z)&(z!=meta['nodata'])&land
        if kind=='rainfall':valid &= z>=0
        field=np.ma.array(z,mask=~valid)
        generator=contourpy.contour_generator(x=x,y=y,z=field,name='serial',corner_mask=False,line_type='Separate',fill_type='OuterOffset')
        interval=250 if kind=='rainfall' else 500
        last=math.ceil(float(z[valid].max())/interval)*interval
        levels=list(range(0,last+interval,interval));below=False
        if kind=='elevation' and np.any(z[valid]<0):levels=[-10000]+levels;below=True
        palette=ramp(['#f2f9fd','#9ccbe3','#367db4','#062b59'],len(levels)-1) if kind=='rainfall' else ramp(['#e4efd8','#b4c77b','#c8ab72','#a77253','#f6f1ea'],len(levels)-1-(1 if below else 0))
        if below:palette=['#ecf3e5']+palette
        fills,lines,vertices=geometry_svg(generator,levels,palette)
        stroke='#275c85' if kind=='rainfall' else '#685642'
        image=(prefix+''.join(fills)+f'<g fill="none" stroke="{stroke}" stroke-width="0.22" opacity="0.55">'+''.join(lines)+'</g></g></svg>\n').encode()
        name=kind+'.svg';(cache/name).write_bytes(image);files[name]={'sha256':sha(image),'bytes':len(image)}
        terrain_colors=None
        if kind=='elevation':
            gray=ramp(['#ecece5','#b2b8ad','#4f625b'],len(levels)-1)
            terrain_colors=gray
            grayfills=[]
            for fill,color in zip(fills,[palette[i] for i in range(len(palette)) if any(f'fill="{palette[i]}"' in p for p in fills)]):
                grayfills.append(fill.replace(color,gray[palette.index(color)]))
            relief=(prefix+''.join(grayfills)+'<g fill="none" stroke="#45564e" stroke-width="0.22" opacity="0.4">'+''.join(lines)+'</g></g></svg>\n').encode()
            (cache/'terrain.svg').write_bytes(relief);files['terrain.svg']={'sha256':sha(relief),'bytes':len(relief)}
        validation[kind]={'nativeGrid':meta,'contourGridShape':list(z.shape),'stride':stride,'sourceStepDegrees':meta['step'],'contourStepDegrees':[s*stride for s in meta['step']],'cornerMask':False,'targetLandSourceCenters':int(land.sum()),'validTargetLandCenters':int(valid.sum()),'missingTargetLandCenters':int((land&~valid).sum()),'sampledRange':list(map(float,[z[valid].min(),z[valid].max()])),'rangeMeaning':'Source centres inside the generalized display outline; coastal negative ETOPO cells may include bathymetry, not land minima.','interval':interval,'levels':levels,'colors':palette,'terrainColors':terrain_colors,'vertices':vertices,'lineCount':len(lines),'contourpyVersion':contourpy.__version__}
        print(kind,validation[kind]['sampledRange'],len(image),flush=True)
    rivers_source=(cache/'ne50-rivers.geojson').read_bytes();assert sha(rivers_source)=='f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51'
    merged={}
    for f in json.loads(rivers_source)['features']:
        g=f['geometry'];lines=[g['coordinates']] if g['type']=='LineString' else g['coordinates'] if g['type']=='MultiLineString' else []
        parts=[part for line in lines for part in clip_line(line)]
        if not parts:continue
        points=np.asarray([point for part in parts for point in part]);xs=points[:,0];ys=points[:,1]
        # Retain only features actually touching a target-country polygon; Mexico excluded.
        touches=False
        for c in geography:
            for polygon in polygons(c['geometry']):
                inside=Path(np.asarray(polygon[0])).contains_points(points)
                for hole in polygon[1:]:inside &= ~Path(np.asarray(hole)).contains_points(points)
                if inside.any():touches=True;break
            if touches:break
        if not touches:continue
        name=f['properties'].get('name')
        if not name:continue
        item=merged.setdefault(name,{'name':name,'sourceClasses':[],'paths':[],'coordinates':[]})
        item['sourceClasses'].append(f['properties'].get('featurecla'));item['coordinates'].extend(parts);item['paths'].extend(path_string(part) for part in parts)
    rivers=[]
    for i,(name,r) in enumerate(merged.items()):
        points=np.asarray([point for part in r['coordinates'] for point in part]);inside=np.zeros(len(points),dtype=bool)
        for country in geography:
            for polygon in polygons(country['geometry']):
                hits=Path(np.asarray(polygon[0])).contains_points(points)
                for hole in polygon[1:]:hits &= ~Path(np.asarray(hole)).contains_points(points)
                inside |= hits
        anchors=points[inside];assert len(anchors)
        r['labelCoordinate']=anchors[len(anchors)//2].tolist()
        r['id']='river-'+str(i);r['path']=''.join(r.pop('paths'));r['sourceClasses']=sorted(set(r['sourceClasses']));rivers.append(r)
    river_bytes=(json.dumps({'source':'Natural Earth v5.1.2 ne_50m_rivers_lake_centerlines','rivers':rivers},ensure_ascii=False,separators=(',',':'))+'\n').encode()
    (output/'rivers.json').write_bytes(river_bytes);files['rivers.json']={'sha256':sha(river_bytes),'bytes':len(river_bytes)}
    validation['rivers']={'features':len(rivers),'names':[r['name'] for r in rivers],'MexicoIncluded':False,'coordinateBounds':BOUNDS}
    gpcc=read_json(ROOT/'data-source/atlas/europe/precipitation/source.json');etopo=read_json(ROOT/'data-source/atlas/canada-climate-elevation-v1/etopo/source-ledger.json')
    source={'gpcc':{**gpcc,'attribution':gpcc['attribution'].split('Modified:')[0]+'Modified: complete 12-month annual sum; target-country source-centre mask; linearly interpolated 250 mm contours and interval fills.'},'etopo':{key:etopo[key] for key in ['publisher','sourceUrl','downloadUrl','metadataUrl','userGuideUrl','sourceEdition','edition','editionNotObservationYear','citation','license','licenseUrl','horizontalCrs','verticalDatum','verticalCrs','unit','sourceResolution','sourceNoData']},'rivers':{'publisher':'Natural Earth','version':'v5.1.2','scale':'1:50,000,000','sourceUrl':'https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-rivers-lake-centerlines/','downloadUrl':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson','license':'public domain','licenseUrl':'https://www.naturalearthdata.com/about/terms-of-use/','inputSha256':sha(rivers_source)}}
    source['etopo']['rangeAcquisition']=read_json(cache/'etopo-range-acquisition.json');source['etopo']['headerSha256']=sha((cache/'etopo-header.bin').read_bytes());source['etopo']['globalHashFromExistingLedgerNotLocallyVerified']=etopo['sourceSha256'];source['etopo']['fullGlobalSourceDownloaded']=False
    source['gpcc']['acquisition']=read_json(cache/'gpcc-acquisition.json');source['rivers']['acquisition']=read_json(cache/'river-acquisition.json')
    write_json(ledger/'source.json',source);write_json(ledger/'validation.json',validation);write_json(ledger/'blockers.json',read_json(cache/'blockers.json'))
    manifest={'schemaVersion':1,'bounds':BOUNDS,'projection':'EPSG:3857','frame':[900,580],'boundary':{'path':'src/data/atlas/latin-america/countries.json','sha256':sha(geography_path.read_bytes()),'targetCountries':34,'MexicoIncluded':False},'rainfall':{'period':'1991–2020','edition':2025,'unit':'mm/year','sourceResolution':'0.25°','interval':250,'levels':validation['rainfall']['levels'],'colors':validation['rainfall']['colors'],'sampledRange':validation['rainfall']['sampledRange']},'elevation':{'edition':2022,'editionNotObservationYear':True,'unit':'m','verticalDatum':'EGM2008','sourceResolution':'60 arc-seconds','processingResolution':'0.05° (every third native source centre; no averaging)','interval':500,'levels':validation['elevation']['levels'],'colors':validation['elevation']['colors'],'sampledRange':validation['elevation']['sampledRange']},'rivers':validation['rivers'],'processing':{'annualSum':'12 source float32 months summed in float64, then float32 once; any missing month remains missing; real zero valid.','contours':'ContourPy cell-centre linear interpolation with corner_mask=False; filled intervals and contours from exactly the same masked field. Coordinates rounded in projected space to 0.001 display units; this does not increase source resolution.','landMask':'34 existing target-country outlines. Cell centres outside target land masked before contours; original country paths additionally clip displayed geometries, preserving holes. Source coastal/missing cells are not extended.','elevationSampling':'Exact native Float32 GeoTIFF window, then stride 3 centre sampling for continental overview; no integer rounding, hillshade, terrain classification or local survey claim.','riverGeometry':'All named 1:50m source river/ lake-centreline features touching target land; clipped at bounds, then country display clip. No basin polygons, topology, flow direction, mainstem or mouth inferred.','numericExtrema':'Sampled source-grid extrema, not exact summits or national/area-weighted statistics.','rawSourceIncludedInRepository':False},'limitations':['Annual precipitation is not runoff, river discharge, recharge, available water or groundwater stock.','2022 is the relief model edition; source observations span different dates. Elevation is relative to EGM2008.','Source-centre masking leaves coastal or small-island gaps. Gray means missing or unresolved, not zero.','Web Mercator does not preserve area; no area share or water-volume estimate.','Rivers are cartographic lines; BasinATLAS basin polygons remain unavailable after a 403 refusal. Groundwater availability, annual usable yield and stock are not supplied.'],'sourceLedger':'data-source/atlas/latin-america/water-terrain/source.json','validationLedger':'data-source/atlas/latin-america/water-terrain/validation.json','files':files}
    write_json(output/'manifest.json',manifest)
    manifest['elevation']['terrainColors']=validation['elevation']['terrainColors']
    manifest['reproduction']={'extractScript':'scripts/latin-america/extract-water-terrain.mjs','contourScript':'scripts/latin-america/prepare-water-terrain.py','dependencies':'GeoTIFF.js 3.0.5; Python numpy / contourpy / matplotlib.path. Preparation only; no new site dependency.','cachePolicy':'Original GPCC and acquired ETOPO tiles/native arrays remain in private preparation cache. All scripts are offline. Normal site builds use checked-in display assets only.'}
    for filename in ['source.json','validation.json','blockers.json']:
        name='sources/manifest.json' if filename=='source.json' else filename
        destination=output/name;destination.parent.mkdir(parents=True,exist_ok=True)
        b=(ledger/filename).read_bytes();destination.write_bytes(b);manifest['files'][name]={'sha256':sha(b),'bytes':len(b)}
    manifest['publicSourceLedger']='sources/manifest.json'
    old_source=output/'source.json'
    if old_source.exists():old_source.unlink()
    manifest['preparationScripts']={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in [pathlib.Path(__file__).resolve(),ROOT/'scripts/latin-america/extract-water-terrain.mjs']}
    for kind in ['rainfall','elevation','terrain']:
        stale=output/(kind+'.svg')
        if stale.exists():stale.unlink()
    write_json(cache/'contour-manifest.json',manifest)
    write_json(output/'manifest.json',manifest)
    print('rivers',len(rivers),validation['rivers']['names'],flush=True)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True);args=parser.parse_args();prepare(pathlib.Path(args.cache))
