import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {preparedMexicoBasinPlan} from '../../src/lib/atlas-mexico-basin-evidence.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const base=path.join(root,'public/assets/atlas/mexico-basin-review-v1');
const catalog=JSON.parse(fs.readFileSync(path.join(base,'catalog.json')));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Three representative entries preserve domestic scope rather than claiming three national basins',()=>{
  assert.deepEqual(catalog.systems.map(s=>s.id),['bravo','lerma-chapala-santiago','grijalva-usumacinta']);
  assert.equal(catalog.totalDomesticSourceBasins,158);
  assert.equal(catalog.isCompleteNationalBasinInventory,false);
  for(const system of catalog.systems){
    const plan=preparedMexicoBasinPlan(catalog,system.id);
    assert.match(plan.nationalScopeNote,/代表水系/);
    assert.match(plan.scopeNote,/国内|メキシコ/);
    assert.equal(plan.frame.viewBox,'0 0 900 580');
  }
});
test('Grouped polygons retain exact source IDs/names and do not mix the RH12 closed basin into the exorheic candidate',()=>{
  const allIds=new Set();
  for(const system of catalog.systems){
    const bytes=fs.readFileSync(path.join(base,system.basinGeojson));
    assert.equal(sha(bytes),system.basinGeojsonSha256);
    const features=JSON.parse(bytes).features;
    assert.equal(features.length,system.basinCount);
    assert.deepEqual(features.map(f=>f.properties.sourceId),system.basinSourceIds);
    assert.deepEqual(features.map(f=>f.properties.sourceName),system.basinSourceNames);
    for(const f of features){assert.equal(f.properties.basinType,'EXORREICA');assert.equal(allIds.has(f.properties.sourceId),false);allIds.add(f.properties.sourceId);}
    assert.equal(sha(fs.readFileSync(path.join(base,system.domesticFill.file))),system.domesticFill.sha256);
    assert.equal(system.domesticFill.opaqueOutsideCountry,0);
  }
  const lerma=catalog.systems.find(s=>s.id==='lerma-chapala-santiago');
  assert.equal(lerma.basinSourceIds.includes('RH12G'),false);
  assert.deepEqual(lerma.excludedBasinIds,['RH12G']);
});
test('Saved line endpoints and vertex order cannot accidentally become confirmed mouths or flow arrows',()=>{
  for(const system of catalog.systems){
    const plan=preparedMexicoBasinPlan(catalog,system.id);
    assert.deepEqual(plan.preparedMainstem,[]);assert.deepEqual(plan.preparedFlowArrows,[]);assert.deepEqual(plan.preparedMouths,[]);
    for(const field of ['verifiedMainstem','verifiedFlowArrows','verifiedMouths']){
      const invalid=structuredClone(catalog);
      invalid.systems.find(s=>s.id===system.id)[field].features.push({type:'Feature',geometry:{type:'Point',coordinates:[-92.645208,18.396602]},properties:{meaning:'retained endpoint only'}});
      assert.throws(()=>preparedMexicoBasinPlan(invalid,system.id),/Unverified endpoints/);
    }
  }
});
test('The additive evidence reader does not mutate restored state or reference collections',()=>{
  const before=JSON.stringify(catalog);
  const plan=preparedMexicoBasinPlan(catalog,'bravo');
  plan.basinSourceIds.push('foreign-catchment');plan.domesticFill.file='changed';plan.frame.placement.x=123;
  assert.equal(JSON.stringify(catalog),before);
  assert.throws(()=>preparedMexicoBasinPlan(catalog,'all-mexico'),/Unknown/);
});

test('Three domestic control polygons preserve the national mask and source hashes',()=>{
 const record=catalog.controlGeometry,bytes=fs.readFileSync(path.join(base,record.file));
 assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);assert.equal(record.crs,'EPSG:4326');
 assert.equal(sha(fs.readFileSync(path.join(root,'src/data/atlas/mexico/geometry.json'))),record.boundarySha256);
 const controls=JSON.parse(bytes);assert.deepEqual(controls.features.map(f=>f.properties.id),catalog.systems.map(s=>s.id));
 assert(controls.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)));
 for(const input of record.inputs)assert.equal(sha(fs.readFileSync(path.join(base,input.file))),input.sha256);
});
