import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const code=await bundleCanadaSource('src/lib/atlas-canada-agriculture-overview.ts',{format:'esm',platform:'node'});
const {buildCanadaAgricultureOverviewModel}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const data=JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/census-agriculture.json'));
const geometry=JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/ccs.geojson'));
const context={type:'FeatureCollection',features:[]};
test('Canada overview uses the independent official province and national values and preserves all source regions',()=>{
 const before=JSON.stringify(data),model=buildCanadaAgricultureOverviewModel(data,geometry,context);
 assert.equal(JSON.stringify(data),before,'No source values or qualities change');
 assert.equal(Object.keys(model.anchors).length,1757);assert.equal(model.evidence.retainedIndicatorCells,8785);
 assert.deepEqual(model.counts.canola,{published:1604,'quality-f':143,'not-covered':10});
 assert.deepEqual(model.counts.pasture,{published:791,'quality-f':956,'not-covered':10});
 const share=(group,product)=>model.summaries.find(s=>s.id===group).values[product].nationalShare.toFixed(1);
 assert.equal(share('prairie','canola'),'99.2');assert.equal(share('prairie','wheat'),'93.1');assert.equal(share('west','beef'),'73.4');assert.equal(share('west','pasture'),'80.0');assert.equal(share('east','hay'),'25.8');
 const prairie=model.summaries.find(s=>s.id==='prairie');
 assert.equal(prairie.values.canola.value,data.provinces.filter(p=>['46','47','48'].includes(p.code)).reduce((n,p)=>n+p.cells.canola.value,0));
 const bad=structuredClone(data);bad.provinces.find(p=>p.code==='47').cells.canola={value:null,status:'quality-f',quality:'F',components:[]};
 assert.throws(()=>buildCanadaAgricultureOverviewModel(bad,geometry,context),/requires published province values/);
});
test('Canada overview refuses an incomplete or duplicate CCS join instead of silently dropping a region',()=>{
 assert.throws(()=>buildCanadaAgricultureOverviewModel(data,{...geometry,features:geometry.features.slice(1)},context),/1,757 CCS/);
 assert.throws(()=>buildCanadaAgricultureOverviewModel(data,{...geometry,features:[...geometry.features,geometry.features[0]]},context),/duplicate source join/);
});
