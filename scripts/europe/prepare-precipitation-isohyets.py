"""250 mm GPCC isohyets and exactly adjoining blue bands; offline pinned input."""
import argparse,base64,gzip,hashlib,io,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
import contourpy
import numpy as np
from PIL import Image

def digest(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return (json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
def generate(repo):
    folder=repo/'public/assets/atlas/europe/precipitation-contours-v1'
    original=repo/'public/assets/atlas/europe/precipitation-v1'
    old=json.loads((original/'manifest.json').read_bytes());window=json.loads((folder/'native-window.json').read_bytes())
    monthly_archive=(repo/window['monthlyWindow']['path']).read_bytes()
    assert digest(monthly_archive)==window['monthlyWindow']['sha256']
    rows,columns=window['rows'],window['columns']
    monthly=np.frombuffer(gzip.decompress(monthly_archive),dtype='<f4').reshape(12,rows,columns)
    valid=np.all(np.isfinite(monthly)&(monthly>=0)&(monthly!=window['sourceNoData']),axis=0)
    annual=np.full((rows,columns),-1.,dtype='<f4');annual[valid]=monthly.astype('float64').sum(axis=0)[valid].astype('float32')
    annual_archive=gzip.compress(annual.tobytes(),compresslevel=9,mtime=0)
    (folder/'native-annual.bin.gz').write_bytes(annual_archive)
    longitude=np.array(window['longitude']);latitude=np.array(window['latitude'])
    contour=contourpy.contour_generator(x=longitude,y=latitude,z=np.ma.array(annual,mask=~valid),name='serial',
        corner_mask=False,line_type='Separate',fill_type='OuterOffset',z_interp='Linear',quad_as_tri=False)
    width,height=1800,1502
    mercator=lambda lat:np.log(np.tan(np.pi/4+np.radians(lat)/2))
    top,bottom=mercator(73),mercator(32)
    def projected(points):return np.column_stack(((points[:,0]+25)/90*width,(top-mercator(points[:,1]))/(top-bottom)*height))
    def path(points,closed=False):return 'M'+'L'.join(f'{x:.3f},{y:.3f}' for x,y in projected(points))+('Z' if closed else '')
    def vertices(points):return [[round(float(x),9),round(float(y),9)] for x,y in points]
    def key(a,b):return tuple(sorted((tuple(np.round(a,9)),tuple(np.round(b,9)))))
    thresholds=old['breaks'];limits=[0,*thresholds,float(annual[valid].max())+1]
    assert old['validation']['displayRangeMmPerYear'][1]<3250
    bands,band_paths,band_edges=[],[],[]
    for index,(lower,upper) in enumerate(zip(limits[:-1],limits[1:])):
        points,offsets=contour.filled(lower,upper);polygons=[];edges=set();ds=[]
        for polygon,offset in zip(points,offsets):
            rings=[]
            for a,b in zip(offset[:-1],offset[1:]):
                ring=polygon[int(a):int(b)];rings.append(vertices(ring));ds.append(path(ring,True))
                edges.update(key(p,q) for p,q in zip(ring[:-1],ring[1:]) if not np.array_equal(p,q))
            polygons.append(rings)
        bands.append({'lower':lower,'upper':None if index==len(thresholds) else upper,'color':old['colors'][index],'polygons':polygons})
        band_edges.append(edges)
        if ds:band_paths.append(f'<path data-band-min="{lower}" fill="{old["colors"][index]}" fill-rule="evenodd" d="{"".join(ds)}"/>')
    lines,line_paths=[],[];verified_vertices=0;verified_edges=0;max_error=0.
    for index,level in enumerate(thresholds):
        parts=contour.lines(level)
        for points in parts:
            for x,y in points:
                c,r=(x-longitude[0])/.25,(latitude[0]-y)/.25
                if abs(r-round(r))<1e-7:
                    rr,cc=int(round(r)),min(int(np.floor(c)),columns-2)
                    assert valid[rr,cc] and valid[rr,cc+1]
                    expected=float(annual[rr,cc])+(c-cc)*(float(annual[rr,cc+1])-float(annual[rr,cc]))
                else:
                    assert abs(c-round(c))<1e-7
                    cc,rr=int(round(c)),min(int(np.floor(r)),rows-2)
                    assert valid[rr,cc] and valid[rr+1,cc]
                    expected=float(annual[rr,cc])+(r-rr)*(float(annual[rr+1,cc])-float(annual[rr,cc]))
                error=abs(expected-level);assert error<1e-5
                verified_vertices+=1;max_error=max(max_error,error)
            for p,q in zip(points[:-1],points[1:]):
                if np.array_equal(p,q):continue
                edge=key(p,q);assert edge in band_edges[index] and edge in band_edges[index+1]
                verified_edges+=1
        lines.append({'level':level,'parts':[vertices(points) for points in parts]})
        d=''.join(path(points) for points in parts)
        if d:line_paths.append(f'<path data-isohyet-mm="{level}" d="{d}"/>')
    old_image=(original/'precipitation.png').read_bytes()
    assert digest(old_image)==old['files']['precipitation.png']['sha256']
    rgba=np.array(Image.open(io.BytesIO(old_image)).convert('RGBA'));mask=np.full_like(rgba,255);mask[:,:,3]=rgba[:,:,3]
    mask_io=io.BytesIO();Image.fromarray(mask).save(mask_io,format='PNG',optimize=True)
    mask_bytes=mask_io.getvalue();(folder/'source-mask.png').write_bytes(mask_bytes)
    mask_url='data:image/png;base64,'+base64.b64encode(mask_bytes).decode()
    svg=('<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1502" viewBox="0 0 1800 1502">'
        '<title>欧州の年降水量：250mm等雨量線と同境界の段階青色</title>'
        '<desc>GPCC v2025、1991–2020年平年値。12か月の完全な原格子を合計。原格子中心間の線形補間で、欠測を越えて補間しません。</desc>'
        f'<defs><mask id="source-mask" mask-type="alpha"><image width="1800" height="1502" href="{mask_url}"/></mask></defs>'
        '<g mask="url(#source-mask)"><g data-isobands="250mm">'+''.join(band_paths)+'</g>'
        '<g data-isohyets="250mm" fill="none" stroke="#285d80" stroke-width="3" stroke-opacity="0.68" stroke-linejoin="round">'
        +''.join(line_paths)+'</g></g></svg>')
    (folder/'precipitation.svg').write_text(svg,encoding='utf-8')
    geometry=gzip.compress(encoded({'bands':bands,'lines':lines}),compresslevel=9,mtime=0)
    (folder/'geometry.json.gz').write_bytes(geometry)
    files={name:{'sha256':digest((folder/name).read_bytes()),'bytes':(folder/name).stat().st_size}
        for name in ['native-window.json','native-annual.bin.gz','source-mask.png','precipitation.svg','geometry.json.gz']}
    manifest={'schemaVersion':1,'dataset':old['dataset'],'publisher':old['publisher'],'sourceUrl':old['sourceUrl'],'downloadUrl':old['downloadUrl'],
        'doi':old['doi'],'period':old['period'],'originalResolution':old['originalResolution'],'inputSha256':old['inputSha256'],'inputMd5':old['inputMd5'],
        'license':old['license'],'licenseUrl':old['licenseUrl'],'licenseEvidence':old['licenseEvidence'],'attribution':old['attribution'],
        'bounds':old['bounds'],'width':width,'height':height,'projection':old['projection'],'unit':'mm/year','breaks':thresholds,'colors':old['colors'],
        'numericLookup':{'path':'../precipitation-v1/values.bin.gz','sha256':old['files']['values.bin.gz']['sha256'],'method':'Unchanged nearest native annual source-cell lookup; it is distinct from interpolated contour display.'},
        'monthlyWindow':window['monthlyWindow'],'files':files,
        'processing':{'algorithm':'ContourPy serial, Linear, corner_mask=False, quad_as_tri=False','version':contourpy.__version__,
            'reference':'https://contourpy.readthedocs.io/en/stable/user_guide/calculate/z_interp.html',
            'annualSum':'12 finite nonnegative native monthly normals required; float64 sum and a single float32 storage cast.',
            'contours':'250 mm intervals between fully valid source centres, with exactly the same geometry boundaries for adjacent blue bands.',
            'missing':'No source value changed or filled. Quads touching missing annual nodes remain unpainted; original country/source-missing mask also clips lines and bands.',
            'smoothing':'No spline smoothing, resampling to invent observations, national averages, or extrapolation.',
            'sourceMutation':False,'displayDoesNotIncreaseSourceResolution':True},
        'validation':{'validNativeNodes':int(valid.sum()),'verifiedLineVertices':verified_vertices,'verifiedSharedBandEdges':verified_edges,'maximumVertexRainfallErrorMm':max_error},
        'limitations':['Contour display interpolates between 0.25 degree grid centres; it does not show measured station isohyets or fine valley rainfall.',
            'The numeric point lookup retains the nearest original annual grid value and may differ from the interpolated colour at that point.',
            'Where four valid annual corners are not available, the contour display is unpainted even when the nearest original grid value is available.',
            *old['limitations']]}
    (folder/'manifest.json').write_bytes(encoded(manifest))
    print(json.dumps({'verifiedLineVertices':verified_vertices,'verifiedSharedBandEdges':verified_edges,'maximumVertexRainfallErrorMm':max_error}))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--repo',type=Path,required=True);generate(parser.parse_args().repo)
