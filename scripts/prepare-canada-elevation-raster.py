"""Prepare native-grid 500 m discrete elevation imagery and exact display-pixel outlines.
Dependencies: numpy, rasterio, Pillow. No network access. Input SHA is pinned.
"""
import sys,json,gzip,math,time,hashlib,argparse
from pathlib import Path
import numpy as np
from PIL import Image
from rasterio.transform import from_bounds
from rasterio.warp import reproject,Resampling,transform_geom
from rasterio.features import rasterize
parser=argparse.ArgumentParser();parser.add_argument('--grid',required=True,type=Path);args=parser.parse_args();root=Path(__file__).resolve().parents[1];out=root/'public/assets/atlas/canada-climate-elevation-v1';start=time.time()
if hashlib.sha256(args.grid.read_bytes()).hexdigest()!='779fbc97ee041d58ee09c87b6d5bbe07bd79d240cd01fc2328f22c562206526d':raise ValueError('Native DEM checksum mismatch')
z=np.fromfile(args.grid,dtype='<f4').reshape(2640,5460)
ids=np.where(z<0,1,np.clip(np.floor(z/500)+2,2,13)).astype('uint8');ids[(z==-99999)|~np.isfinite(z)]=0
radius=6378137.;mx=lambda x:radius*math.radians(x);my=lambda y:radius*math.log(math.tan(math.pi/4+math.radians(y)/2))
bounds=(mx(-142),my(40),mx(-51),my(84));width=5460;height=math.ceil((bounds[3]-bounds[1])/(bounds[2]-bounds[0])*width);target=from_bounds(*bounds,width,height)
dest=np.zeros((height,width),dtype='uint8');reproject(source=ids,destination=dest,src_transform=from_bounds(-142,40,-51,84,5460,2640),src_crs='EPSG:4326',dst_transform=target,dst_crs='EPSG:3857',resampling=Resampling.nearest,src_nodata=0,dst_nodata=0)
mask=json.loads(gzip.decompress((root/'data-source/atlas/canada-climate-elevation-v1/beck/land-mask.geojson.gz').read_bytes()))
land=rasterize([(transform_geom('EPSG:4326','EPSG:3857',f['geometry']),1) for f in mask['features']],out_shape=dest.shape,transform=target,fill=0,dtype='uint8')
dest[land==0]=0
# Independently map every display pixel centre to its original grid row/column.
# X alignment is exact: both grids have 5460 columns spanning the same longitudes.
centre_y=target.f+(np.arange(height)+.5)*target.e
centre_lat=np.degrees(2*np.arctan(np.exp(centre_y/radius))-math.pi/2)
source_rows=np.floor((84-centre_lat)*60).astype(int)
expected=ids[source_rows,:]
if np.any(dest[land!=0]!=expected[land!=0]):raise ValueError('Nearest registration changed a class')
del expected
colors=['#000000','#e6e5e1','#edf4de','#dbe8c4','#c7d6a7','#b3c18d','#9cab74','#87955f','#73814d','#606d3d','#4e5b30','#3e4a25','#303c1b','#243010']
palette=[n for c in colors for n in bytes.fromhex(c[1:])]+[0]*(768-len(colors)*3)
im=Image.fromarray(dest,mode='P');im.putpalette(palette);im.save(out/'elevation-classes.png',transparency=0,optimize=True)
meta={'width':width,'height':height,'coordinates':[[-142,84],[-51,84],[-51,40],[-142,40]],'crs':'EPSG:3857','resampling':'nearest','bytes':(out/'elevation-classes.png').stat().st_size,'seconds':time.time()-start,'spots':[]}
manifest=json.loads((root/'data-source/atlas/canada-climate-elevation-v1/etopo/elevation-raster-definitions.json').read_text())
for s in manifest['verification']['spots']:
 x,y=s['nativeCentre'];col,row=(~target)*(mx(x),my(y));v=int(dest[int(row),int(col)]);expected=1 if s['expectedBand']=='below-sea' else int(s['expectedBand'])//500+2
 meta['spots'].append({**s,'expectedPaletteIndex':expected,'renderedPaletteIndex':v});assert v==expected

# Native classified cell audit and raster display share the original float32 values.
native_land=rasterize([(f['geometry'],1) for f in mask['features']],out_shape=z.shape,transform=from_bounds(-142,40,-51,84,5460,2640),fill=0,dtype='uint8')
native_ids=ids.copy();native_ids[native_land==0]=0
native=Image.fromarray(native_ids,mode='P');native.putpalette(palette);native.save(out/'elevation-native-classes.png',transparency=0,optimize=True)
assert int(np.count_nonzero(native_ids))==5935998
assert int(np.count_nonzero(native_ids==1))==9368
from rasterio.features import shapes
groups={i:[] for i in range(1,14)}
for g,v in shapes(dest,mask=dest!=0,connectivity=4,transform=target):
    groups[int(v)].extend(g['coordinates'])
def lonlat(p):return [round(math.degrees(p[0]/radius),6),round(math.degrees(2*math.atan(math.exp(p[1]/radius))-math.pi/2),6)]
def fileinfo(p):return {'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
for i,level in enumerate(manifest['levels'],1):
    # Boundary of the exact displayed nearest-neighbour class pixels, without
    # smoothing or geometric simplification. Split long lines for GPU buffers.
    rings=groups[i];features=[];coords=[]
    for ring in rings:
        points=[lonlat(p) for p in ring];coords.extend(points)
        for n in range(0,len(points)-1,8000):features.append({'type':'Feature','properties':{'id':level['id']},'geometry':{'type':'LineString','coordinates':points[n:n+8001]}})
    linefile=out/f"elevation-outline-{level['id']}.geojson";linefile.write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'))+'\n')
    isolated=Image.fromarray(np.where(dest==i,dest,0).astype('uint8'),mode='P');isolated.putpalette(palette);imagefile=out/f"elevation-only-{level['id']}.png";isolated.save(imagefile,transparency=0,optimize=True)
    xs=[p[0] for p in coords];ys=[p[1] for p in coords]
    native_edges=np.radians(84-np.arange(2641)/60);display_edges=2*np.arctan(np.exp((target.f+np.arange(height+1)*target.e)/radius))-math.pi/2
    native_weights=radius**2*math.radians(1/60)*(np.sin(native_edges[:-1])-np.sin(native_edges[1:]));display_weights=radius**2*(target.a/radius)*(np.sin(display_edges[:-1])-np.sin(display_edges[1:]))
    source_area=float(np.sum(np.count_nonzero(native_ids==i,axis=1)*native_weights)/1e6);display_area=float(np.sum(np.count_nonzero(dest==i,axis=1)*display_weights)/1e6)
    level.update({'sourceCellCount':int(np.count_nonzero(native_ids==i)),'displayPixelCount':int(np.count_nonzero(dest==i)),'outline':fileinfo(linefile),'isolated':fileinfo(imagefile),'bounds':[[min(xs),min(ys)],[max(xs),max(ys)]],'displayRings':len(rings),'outlineVertices':len(coords),'nativeCellCentreMaskAreaKm2':source_area,'displayMaskAreaKm2':display_area,'areaDifferencePercent':100*(display_area-source_area)/source_area})
manifest['method']={'classification':'Original native float32: negative separate; then lower-inclusive/upper-exclusive 500 m bands. No-data remains transparent.','geometry':'EPSG:3857 palette raster registered to [-142,40,-51,84]; nearest-neighbour resampling only. The original country/lake mask is rasterized at display pixel centres. No interpolated elevations or blended classes.','selectionOutline':'Exact edge of displayed class pixels, converted from EPSG:3857 to WGS84; no simplification; coordinate rounding 6 decimals (<0.08 m). Long polylines split at retained vertices for GPU buffers.','scientificResolution':'Original grid 5460 by 2640, 60 arc-seconds; display reprojection does not add observations. Small islands below a display pixel may not be visible.','publicationYear':'2022 model edition, not all observation years','negativeValues':'Below-sea source values are separate; coastal grid/cartographic-mask resolution mismatch is not asserted to be a terrestrial depression.','rejectedVector':'The 37,824,318-byte interpolated-band prototype with coverage_simplify(.003) was rejected: 24.7 s initial paint and measured boundary displacement upper bound 0.04737 degrees. It is not used in the display.'}
manifest['raster']={**meta,'image':fileinfo(out/'elevation-classes.png'),'nativeClasses':fileinfo(out/'elevation-native-classes.png'),'pixelSizeMercatorMetres':[target.a,-target.e],'sourceAngularResolutionDegrees':[1/60,1/60],'registration':'Pixel edges span exactly the stated bounds; source and destination both use cell centres. Nearest in both reprojection and MapLibre display.','palette':colors,'sourceMaskGeometryRetained':True,'maskRasterization':'All original land and lake polygons are input; centre-based pixels can omit subpixel islands, not a claim that those islands do not exist.','missingDisplayLandPixels':int(np.count_nonzero((land==1)&(dest==0)))}
manifest['verification']={k:v for k,v in manifest['verification'].items() if k not in ['allBandsValid','sharedEdgesValid','nonoverlapping','landCoverageSymmetricDifferenceDegreesSquared','spots']}
manifest['verification'].update({'spots':meta['spots'],'allDisplayedPixelsHaveOneClass':True,'allDisplayLandPixelsIndependentlyMatchedOriginalNearestCell':True,'outlineMatchesDisplayedPixelEdges':True,'areaAudit':'Spherical row-cell areas; native-centre land mask versus finer projected-centre land mask. Differences include coastline/lake rasterization, particularly the separate negative coastal class.','northernmostDisplayLatitude':max(level['bounds'][1][1] for level in manifest['levels']),'southernmostDisplayLatitude':min(level['bounds'][0][1] for level in manifest['levels'])})
manifest['output']=fileinfo(out/'elevation-classes.png')
(out/'elevation-bands-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'image':manifest['output'],'outlineBytes':sum(g['outline']['bytes'] for g in manifest['levels']),'seconds':time.time()-start}),flush=True)
