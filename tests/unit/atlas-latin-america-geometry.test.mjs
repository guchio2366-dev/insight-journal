import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLatinCommonModule} from './atlas-latin-common-helpers.mjs';
const lib=await loadLatinCommonModule('geometry');
const sourceBytes=await readFile('src/data/atlas/regional-countries.json');
const source=JSON.parse(sourceBytes);
const selectedBytes=await readFile('src/data/atlas/latin-america/countries.json');
const selected=JSON.parse(selectedBytes);
const provenance=JSON.parse(await readFile('public/assets/atlas/latin-common-v1/geometry-provenance.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('the 34 regional geometries preserve every source coordinate, polygon and hole',()=>{
 assert.equal(selected.features.length,34);assert.equal(new Set(lib.latinCountryCodes).size,34);
 assert.equal(lib.latinCountryCodes.includes('MEX'),false);
 for(const feature of selected.features)assert.deepEqual(feature.geometry,source.features.find(row=>row.properties.code===feature.properties.code).geometry);
 assert.equal(provenance.sourceSha256,hash(sourceBytes));assert.equal(provenance.selectedSourceSha256,hash(selectedBytes));
 assert.equal(provenance.license,'Natural Earth public domain');
 assert.equal(selected.features.filter(f=>f.properties.subregion==='Central America').length,7);
 assert.equal(selected.features.filter(f=>f.properties.subregion==='Caribbean').length,14);
});
test('raster corners and representative locations use the same uniform Mercator frame',()=>{
 const frame=lib.latinRasterFrame();const northWest=lib.projectLatin([-93,28]),southEast=lib.projectLatin([-33,-56]);
 assert.deepEqual([frame.x,frame.y],northWest);assert.ok(Math.abs(frame.height-580)<1e-8);
 assert.ok(Math.abs(frame.x+frame.width-southEast[0])<1e-8);assert.ok(Math.abs(frame.y+frame.height-southEast[1])<1e-8);
 for(const country of lib.latinCountries){assert.deepEqual(country.label,lib.projectLatin(country.labelLongitudeLatitude));assert.ok(country.path.length>0);assert.ok(country.bounds.every(Number.isFinite));}
});
test('central, southern and explicit-country views preserve a valid frame and national context',()=>{
 for(const scope of ['all','central','south','country']){
  const frame=lib.latinViewBox(scope,'CRI');assert.equal(frame.length,4);assert.ok(frame.every(Number.isFinite));assert.ok(frame[2]>0&&frame[3]>0);
 }
 assert.ok(lib.latinViewBox('central','CRI')[3]<lib.latinViewBox('all','CRI')[3]);
 assert.equal((lib.latinContextPaths('source').match(/data-context-country=/g)||[]).length,34);
});

test('shared canvas fitting preserves uniform geography and keeps each frame inside both comparison canvases',()=>{
 for(const scope of ['all','central','south','country']){
  const layout=lib.latinMapLayout(scope,'CRI'),[x,y,width,height]=layout.frame;
  const left=x*layout.k+layout.tx,top=y*layout.k+layout.ty;
  const right=(x+width)*layout.k+layout.tx,bottom=(y+height)*layout.k+layout.ty;
  assert.ok(left>=-1e-8&&top>=-1e-8&&right<=900+1e-8&&bottom<=580+1e-8);
  assert.ok(Math.abs((right-left)/width-(bottom-top)/height)<1e-8);
  assert.deepEqual(lib.latinMapLayout(scope,'CRI'),layout);
  assert.match(layout.transform,/^matrix\(/);
 }
});
