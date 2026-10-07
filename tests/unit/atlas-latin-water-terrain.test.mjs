import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';
import {sumCompleteMonthlyNormals} from '../../scripts/europe/prepare-precipitation.mjs';
registerHooks({
 resolve(s,c,next){if(s.startsWith('.')&&c.parentURL&&!/\.[a-z]+$/i.test(s)){const u=new URL(s+'.ts',c.parentURL);if(existsSync(fileURLToPath(u)))return {url:u.href,shortCircuit:true};}return next(s,c);},
 load(u,c,next){if(u.startsWith('file:')&&u.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(fileURLToPath(u),'utf8'),shortCircuit:true};if(u.startsWith('file:')&&u.endsWith('.ts'))return {format:'module',source:stripTypeScriptTypes(readFileSync(fileURLToPath(u),'utf8')),shortCircuit:true};return next(u,c);},
});
const lib=await import('../../src/lib/atlas-latin-water-terrain.ts');
const geometry=await import('../../src/lib/atlas-latin-america-geometry.ts');
const folder='public/assets/atlas/latin-water-terrain-v1/';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const manifest=json(folder+'manifest.json'),source=json(folder+'sources/manifest.json'),validation=json(folder+'validation.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
test('Actual display assets, original inputs, preparation and public provenance have pinned hashes',()=>{
 for(const [name,record] of Object.entries(manifest.files)){const b=readFileSync(folder+name);assert.equal(b.length,record.bytes);assert.equal(sha(b),record.sha256);}
 for(const [p,h] of Object.entries(manifest.preparationScripts))assert.equal(sha(readFileSync(p)),h);
 for(const p of ['source.json','validation.json','blockers.json'])assert.deepEqual(json(folder+(p==='source.json'?'sources/manifest.json':p)),json('data-source/atlas/latin-america/water-terrain/'+p));
 assert.equal(source.gpcc.inputSha256,'3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5');
 assert.equal(source.rivers.inputSha256,'f286e0ce978fde999ca2d7a78c764be08542e19b63cded52b05c12d5173ccc51');
 assert.equal(manifest.boundary.targetCountries,34);assert.equal(manifest.boundary.MexicoIncluded,false);assert.equal(sha(readFileSync(manifest.boundary.path)),manifest.boundary.sha256);
});
test('Annual normals retain all twelve months, fixed 1991–2020 baseline, valid zero and missingness',()=>{
 assert.equal(source.gpcc.period,'1991-01-01/2020-12-31');assert.equal(source.gpcc.license,'CC BY 4.0');
 assert.deepEqual(validation.rainfall.nativeGrid.sourcePeriod,['1991-01-01','2020-12-31']);assert.equal(validation.rainfall.nativeGrid.sourceCoordinates.firstLatitude,89.875);
 for(const sample of validation.rainfall.nativeGrid.samples){assert.equal(sample.months.length,12);assert.equal(Math.fround(sample.months.reduce((a,b)=>a+b,0)),sample.annual);}
 assert.equal(sumCompleteMonthlyNormals(Array(12).fill(0)),0);assert.equal(sumCompleteMonthlyNormals([...Array(11).fill(1),-99999.9921875]),null);assert.equal(sumCompleteMonthlyNormals(Array(11).fill(1)),null);
 assert.equal(validation.rainfall.nativeGrid.nodata,-1);assert.equal(validation.rainfall.validTargetLandCenters+validation.rainfall.missingTargetLandCenters,validation.rainfall.targetLandSourceCenters);
});
test('True interpolated contours and interval fills are rendered at every 250mm / 500m step',()=>{
 const rendering=json(folder+'rasterization.json');
 for(const [name,interval] of [['rainfall',250],['elevation',500]]){
  const png=readFileSync(folder+name+'.png'),levels=rendering[name].actualContourLevels;
  assert.ok(levels.length>10);assert.equal(validation[name].interval,interval);assert.ok(levels.includes(interval));
  for(const value of levels)assert.equal(value%interval,0);
  const expected=manifest[name].levels.slice(1,-1);assert.deepEqual(levels,expected);
  assert.deepEqual(rendering[name].actualFilledColors,manifest[name].colors);
  assert.equal(validation[name].cornerMask,false);assert.equal(rendering[name].inputSvgSha256,manifest.vectorIntermediates.files[name+'.svg'].sha256);assert.equal(rendering[name].outputPngSha256,sha(png));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(png.readUInt32BE(16),1800);assert.equal(png.readUInt32BE(20),1160);assert.deepEqual(rendering[name].inputViewBox,[0,0,900,580]);assert.deepEqual(rendering[name].nativeDecodedImageSize,[1800,1160]);
 }
});
test('ETOPO native window and continental processing retain datum and truthful partial acquisition',()=>{
 assert.equal(source.etopo.license,'CC0-1.0');assert.equal(source.etopo.verticalDatum,'EGM2008 geoid');assert.equal(source.etopo.editionNotObservationYear,true);
 assert.equal(validation.elevation.nativeGrid.geokeys.GeographicTypeGeoKey,4326);assert.equal(validation.elevation.nativeGrid.geokeys.VerticalCSTypeGeoKey,3855);
 assert.deepEqual(validation.elevation.nativeGrid.window,[5220,3720,8820,8760]);assert.equal(validation.elevation.stride,3);assert.deepEqual(validation.elevation.contourGridShape,[1680,1200]);
 const a=source.etopo.rangeAcquisition;assert.equal(a.fullGlobalSourceDownloaded,false);assert.equal(a.fullGlobalSha256LocallyVerified,false);assert.equal(a.sourceGlobalBytes,465969062);assert.equal(a.ranges.length,21);
 for(const r of a.ranges){assert.equal(r.status,206);assert.equal(r.bytes,r.end-r.start+1);assert.match(r.sha256,/^[0-9a-f]{64}$/);}
 assert.ok(a.downloadedBytes<48*1024*1024);assert.match(manifest.processing.numericExtrema,/not exact summits/);
});
test('River clipping uses direct SVG paths, all actual source lines stay present and names do not duplicate',async()=>{
 const river=lib.latinFoundationRivers.find(r=>r.name==='Amazonas');assert.equal(lib.latinFoundationRivers.length,44);
 const w=new Window();try{
  w.document.body.innerHTML=lib.renderLatinFoundationMap('rivers','all','all',river.id);
  const clip=w.document.querySelector('clipPath');assert.equal(clip.children.length,34);assert.ok([...clip.children].every(n=>n.localName==='path'));
  assert.equal(w.document.querySelectorAll('[data-foundation-river]').length,44);assert.equal(w.document.querySelectorAll('[data-river-line]').length,44);
  assert.equal(w.document.querySelectorAll('[data-foundation-river][aria-pressed=true]').length,1);
  const names=[...w.document.querySelectorAll('.latin-foundation-river-label')].map(n=>n.textContent);assert.equal(names.filter(n=>n==='アマゾン川').length,1);
  assert.equal(w.document.querySelectorAll('title').length,1);assert.equal(w.document.querySelectorAll('[data-nature-country]').length,0);
 }finally{await w.happyDOM.close();}
 for(const section of ['rainfall','terrain','elevation']){const html=lib.renderLatinFoundationMap(section,'country','CRI');assert.ok(html.includes(`transform="${geometry.latinMapLayout('country','CRI').transform}"`));assert.equal(/role="button"|tabindex=/.test(html),false);assert.match(html,/viewBox="0 0 900 580"/);}
});
test('Unavailable basins and groundwater never become invented quantities or river-derived basin polygons',()=>{
 const blocker=json(folder+'blockers.json');assert.equal(blocker.length,1);assert.match(blocker[0].reason,/Tunnel connection failed: 403 Forbidden/);assert.equal(blocker[0].retried,false);assert.equal(blocker[0].bypassAttempted,false);
 assert.equal(manifest.rivers.MexicoIncluded,false);assert.match(lib.renderLatinFoundationReading('rivers'),/地下水の得やすさ、年に利用できる量、残量/);
 assert.match(lib.renderLatinFoundationReading('rivers'),/流域の面データ.*未整備/);assert.match(lib.renderLatinFoundationReading('rainfall'),/欠測/);assert.match(lib.renderLatinFoundationReading('elevation'),/陸域の最低標高とは扱いません/);
});
