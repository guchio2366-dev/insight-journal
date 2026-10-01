import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lambertForward,lambertInverse,mexicoProjection} from '../../src/lib/atlas-mexico-projection.mjs';
test('Mexico Lambert follows the INEGI .prj false origin and known-place coordinate order',()=>{
 assert.deepEqual(lambertForward([-102,12]),[2500000,0]);
 for(const point of [[-99.19611111,19.40361111],[-107.407188,24.806146],[-117.03,32.5],[-86.75,21.16]]){
  const native=lambertForward(point),back=lambertInverse(native);
  assert.ok(Math.max(...point.map((value,i)=>Math.abs(value-back[i])))<1e-9);
  assert.ok(native[0]>800000&&native[0]<4200000&&native[1]>250000&&native[1]<2500000);
 }
 assert.equal(mexicoProjection.standardParallel1,17.5);assert.equal(mexicoProjection.standardParallel2,29.5);
 assert.throws(()=>lambertForward([NaN,20]),RangeError);
});
test('Mexico locator preserves 32 codes, all polygon rings and source-year provenance',async()=>{
 const data=JSON.parse(await readFile('src/data/atlas/mexico/geometry.json','utf8'));
 assert.equal(data.features.length,32);assert.deepEqual(data.features.map(f=>f.properties.code),Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0')));
 assert.match(data.metadata.sourceMetadata.Fuente_informacion_vectorial,/2025/);
 assert.match(data.metadata.sourceMetadata.Fuente_informacion_estadistica,/2020/);
 assert.equal(data.metadata.sourceSha256,'170c3ea5ff472f08ece97970dc90ad4ba8c6f503e33859655f315091c105cc91');
 for(const feature of data.features){
  assert.equal(feature.properties.cve_ent,feature.properties.code);
  assert.ok(feature.properties.nameJa.length>0);
  const rings=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates.flat():feature.geometry.coordinates;
  for(const ring of rings){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));assert.ok(ring.every(point=>point.every(Number.isFinite)));}
 }
});
