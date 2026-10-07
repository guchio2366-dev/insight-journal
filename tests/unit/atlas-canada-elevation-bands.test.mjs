import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='public/assets/atlas/canada-climate-elevation-v1/';
const manifest=JSON.parse(await readFile(root+'elevation-bands-manifest.json'));
const native=JSON.parse(await readFile('data-source/atlas/canada-climate-elevation-v1/etopo/native-window.json'));
async function checked(info){const bytes=await readFile(root+info.file);assert.equal(bytes.length,info.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),info.sha256);return bytes;}
test('Discrete Canada elevation classes retain native grid, negative values, no-data and exact 500 m thresholds',async()=>{
 assert.equal(manifest.sourceWindow.sha256,native.sha256);assert.equal(native.sha256,'779fbc97ee041d58ee09c87b6d5bbe07bd79d240cd01fc2328f22c562206526d');
 assert.deepEqual([native.width,native.height],[5460,2640]);assert.equal(native.geoKeys.VerticalCSTypeGeoKey,3855);
 assert.equal(manifest.verification.validLandCells,5935998);assert.equal(manifest.verification.missingLandCells,0);assert.equal(manifest.verification.negativeLandCells,9368);
 assert.equal(manifest.levels.reduce((n,g)=>n+g.sourceCellCount,0),5935998);assert.equal(manifest.levels[0].sourceCellCount,9368);
 assert.deepEqual(manifest.levels.slice(1).map(g=>g.lowerBoundM),Array.from({length:12},(_,i)=>i*500));
 manifest.levels.slice(1).forEach(g=>{assert.equal(g.upperBoundExclusiveM-g.lowerBoundM,500);assert.ok(g.sourceCellCount>0);});
 const image=await checked(manifest.raster.image),audit=await checked(manifest.raster.nativeClasses);
 assert.deepEqual([image.readUInt32BE(16),image.readUInt32BE(20)],[5460,7515]);assert.deepEqual([audit.readUInt32BE(16),audit.readUInt32BE(20)],[5460,2640]);
 assert.equal(image[25],3,'Indexed PNG keeps discrete class colours');assert.equal(manifest.raster.resampling,'nearest');assert.equal(manifest.raster.missingDisplayLandPixels,0);
 assert.deepEqual(manifest.raster.sourceAngularResolutionDegrees,[1/60,1/60]);assert.equal(manifest.raster.spots.length,7);manifest.raster.spots.forEach(p=>assert.equal(p.expectedPaletteIndex,p.renderedPaletteIndex));
 assert.match(manifest.method.rejectedVector,/rejected/);assert.ok(manifest.verification.northernmostDisplayLatitude>83);assert.ok(manifest.verification.southernmostDisplayLatitude<42);
});
test('Every selectable outline is registered to the same Mercator class pixels without simplification',async()=>{
 const r=6378137,mx=x=>r*x*Math.PI/180,my=y=>r*Math.log(Math.tan(Math.PI/4+y*Math.PI/360));
 const left=mx(-142),top=my(84),[dx,dy]=manifest.raster.pixelSizeMercatorMetres;
 for(const group of manifest.levels){
  const collection=JSON.parse(await checked(group.outline));assert.ok(collection.features.length>0);let vertices=0;
  for(const f of collection.features){assert.equal(f.properties.id,group.id);assert.equal(f.geometry.type,'LineString');assert.ok(f.geometry.coordinates.length>=2&&f.geometry.coordinates.length<=8001);
   for(const [x,y]of f.geometry.coordinates){assert.ok(Number.isFinite(x)&&Number.isFinite(y));const px=(mx(x)-left)/dx,py=(top-my(y))/dy;assert.ok(Math.abs(px-Math.round(px))<.001);assert.ok(Math.abs(py-Math.round(py))<.001);vertices++;}
  }
  assert.ok(vertices>=group.outlineVertices);await checked(group.isolated);
 }
});
