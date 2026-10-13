import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['src/lib/atlas-regional-forestry.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const library=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const availability=JSON.parse(fs.readFileSync('public/assets/atlas/regional-forestry-v1/availability.json'));
const source=JSON.parse(fs.readFileSync('public/assets/atlas/europe/tree-cover-v1/manifest.json'));
const grid=zlib.gunzipSync(fs.readFileSync('public/assets/atlas/europe/tree-cover-v1/mask.bin.gz'));
const merc=latitude=>Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));
test('region coverage is existing geography; blocked datasets have no substitute forest raster',()=>{
 assert.deepEqual(library.forestryRegions,['africa','latin-america','oceania','russia']);
 for(const region of library.forestryRegions){
  assert.equal(library.forestryGeography(region).length,availability.regions[region].countryCount);
  const reading=library.forestryReading(region);
  assert.ok(region==='latin-america'?reading.examples.length===7:reading.examples.length>=2&&reading.examples.length<=4);
  const ids=new Set();
  for(const example of reading.examples){assert.ok(!ids.has(example.id));ids.add(example.id);assert.equal(example.point.length,2);assert.ok(example.sources.every(source=>source.url.startsWith('https://')&&source.period));const [x,y]=library.projectForestry(region,example.point),frame=library.forestryFrame(region);assert.ok(x>=0&&x<=frame.width&&y>=0&&y<=frame.height);}
  if(region!=='russia'){assert.equal(library.forestryRaster(region),null);assert.equal(availability.regions[region].coverage,['africa','oceania'].includes(region)?'partial-JRC-2020-reference-only':'not-acquired');assert.equal(availability.regions[region].treeClass,null);assert.equal(availability.regions[region].year,null);}
 }
 assert.match(availability.accessFailure,/CONNECT proxy returned 403/);
});
test('Latin processing descriptions use exact source city guides and keep unverified factory coordinates separate',()=>{
 const examples=library.forestryReading('latin-america').examples.filter(example=>example.kind==='processing-locality');
 const source=JSON.parse(fs.readFileSync('data-source/atlas/latin-america/forestry-processing-20261013/natural-earth-locality-source.geojson'));
 const ledger=JSON.parse(fs.readFileSync('data-source/atlas/latin-america/forestry-processing-20261013/evidence.json'));
 assert.deepEqual(examples.map(example=>example.id),['suzano-tres-lagoas','upm-paso-de-los-toros','upm-fray-bentos']);
 for(const example of examples){const record=source.features.find(feature=>feature.properties.NE_ID===example.coordinateSource.neId);assert.ok(record);assert.deepEqual(example.point,record.geometry.coordinates);assert.equal(example.coordinateSource.type,'locality-guide');assert.equal(example.facilityCoordinates,null);assert.match(example.coordinateMeaning,/市の案内位置/);assert.match(example.coordinateMeaning,/未確認/);assert.ok(example.sources.some(source=>source.url.endsWith('.pdf')));}
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data-source/atlas/latin-america/forestry-processing-20261013/'+ledger.localityCoordinates.subsetFile)).digest('hex'),ledger.localityCoordinates.subsetSHA256);
 assert.equal(ledger.newLandingByteAcquisitions.length,2);assert.ok(ledger.newLandingByteAcquisitions.every(request=>request.attempts===1&&/403/.test(request.error)));
 const original=JSON.parse(fs.readFileSync('src/data/atlas/regional-forestry.json'));for(const region of ['africa','oceania','russia'])assert.deepEqual(library.forestryReading(region),original[region]);
});
test('reused source bytes and source nodata stay intact; no national total is inferred',()=>{
 for(const input of availability.reusedInputs){const bytes=fs.readFileSync(input.path);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),input.sha256);assert.equal(bytes.length,input.bytes);}
 assert.equal(source.sourceTreeClass,10);assert.equal(source.sourceNoData,0);assert.equal(source.license,'CC BY 4.0');
 const states=new Set();for(let at=0;at<grid.length;at+=4)states.add(grid.readFloatLE(at));assert.deepEqual([...states].sort((a,b)=>a-b),[-1,0,1]);
});
test('western Russia image placement preserves the actual source pixel coordinates',()=>{
 const raster=library.forestryRaster('russia');assert.deepEqual(raster.bounds,[-25,32,65,73]);assert.ok(raster.x<0);
 const states=new Set();
 for(const [lon,lat] of [[37.6173,55.7558],[37.1,55.1],[36.5,56.4],[38.5,54.5]]){
  const x=(lon-source.bounds[0])/(source.bounds[2]-source.bounds[0])*source.width;
  const y=(merc(source.bounds[3])-merc(lat))/(merc(source.bounds[3])-merc(source.bounds[1]))*source.height;
  const projected=library.projectForestry('russia',[lon,lat]);
  assert.ok(Math.abs(projected[0]-(raster.x+x/source.width*raster.width))<1e-9);
  assert.ok(Math.abs(projected[1]-(raster.y+y/source.height*raster.height))<1e-9);
  states.add(grid.readFloatLE((Math.floor(y)*source.width+Math.floor(x))*4));
 }
 assert.ok(states.has(0)&&states.has(1),'real Moscow-region cells include tree and other valid cover');
});
test('date-line normalization is consistent for Russia and Oceania',()=>{
 assert.deepEqual(library.projectForestry('russia',[-179,65]),library.projectForestry('russia',[181,65]));
 assert.deepEqual(library.projectForestry('oceania',[-175,-20]),library.projectForestry('oceania',[185,-20]));
 assert.ok(library.forestryDisputes().length>0);
});

test('saved JRC WMS references retain their source coordinates and do not fill unclassified pixels',async()=>{
 const manifest=JSON.parse(fs.readFileSync('public/assets/atlas/asia-farming-v1/manifest.json'));
 assert.equal(library.forestryReferences('africa').length,2);assert.equal(library.forestryReferences('latin-america').length,0);
 for(const region of ['africa','oceania','russia'])for(const reference of library.forestryReferences(region)){
  const western=reference.id==='west-asia',source=western?JSON.parse(fs.readFileSync('public/assets/atlas/west-asia-v1/raster-manifest.json')).layers.find(layer=>layer.id==='forest'):manifest.regions[reference.id].layers.find(layer=>layer.id==='forest');
  assert.equal(Number(source.year),2020);assert.equal(western?source.grid:source.query,null);assert.match(source.method,western?/提供元が描画したWMS画像/:/Unmodified publisher-rendered/);
  if(western){const [west,south,east,north]=source.bounds;source.imageCoordinates=[[west,north],[east,north],[east,south],[west,south]];assert.deepEqual(reference.bounds,source.bounds);assert.equal(reference.href,'/assets/atlas/west-asia-v1/'+source.image);}
  const [left,top]=library.projectForestry(region,source.imageCoordinates[0]),[right,bottom]=library.projectForestry(region,source.imageCoordinates[2]);
  assert.deepEqual([reference.x,reference.y,reference.width,reference.height],[left,top,right-left,bottom-top]);
  const {default:sharp}=await import('sharp'),{data}=await sharp('public'+reference.href).ensureAlpha().raw().toBuffer({resolveWithObject:true});let painted=0,transparent=0;
  for(let index=0;index<data.length;index+=4){if(!data[index+3])transparent++;else{assert.deepEqual([...data.subarray(index,index+4)],[77,146,33,255]);painted++;}}
  assert.ok(painted>0&&transparent>0);
 }
 assert.match(availability.referenceSource.noData,/do not distinguish non-forest and nodata/);
});
