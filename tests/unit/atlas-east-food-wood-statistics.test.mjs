import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const d=JSON.parse(readFileSync('public/assets/atlas/east-asia-v2/food-wood-statistics-2023.json'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
test('each monetary observation keeps its publisher table and rounding; regional inside flows are excluded before grouping',()=>{
 for(const s of d.sources){assert.equal(hash(s.path),s.sha256);const p=JSON.parse(readFileSync(s.path));assert.equal(p.year,2023);assert.equal(p.classification,'HS 1988/92 (H0)');const world=p.rows.find(r=>r.partner==='World');const sum=p.rows.filter(r=>r.partner!=='World').reduce((n,r)=>n+Number(r.value1000Usd)*1000,0);assert(Math.abs(Number(world.value1000Usd)*1000-sum)<=5*p.rows.length+.001);}
 for(const product of Object.values(d.trade))for(const [flow,m] of Object.entries(product.region)){
  const rows=m.sourceIds.flatMap(id=>JSON.parse(readFileSync(d.sources[id].path)).rows);
  const external=rows.filter(r=>r.partner!=='World'&&!d.boundary.insidePartnerNames.includes(r.partner)&&r.partner!=='Unspecified').reduce((sum,r)=>sum+Number(r.value1000Usd)*1000,0);
  assert(Math.abs(m.externalUsd-external)<.01);assert(Math.abs(m.bins.reduce((sum,r)=>sum+r.usd,0)-external)<.01);assert(m.bins.every(r=>!d.boundary.insidePartnerNames.includes(r.partner)));assert(m.missingReporters.includes('PRK'));assert.equal(m.status,'partial');
 }
 assert.equal(d.trade.rice.countries.KOR.Import.internalUsd>0,true,'actual China-to-Korea rice imports must be removed');
 assert(d.boundary.insidePartnerNames.includes('Hong Kong, China'));assert(d.boundary.insidePartnerNames.includes('Macao'));
 assert.equal(d.trade.wheat.countries.PRK.Import.externalUsd,null);assert.equal(d.trade.wheat.countries.PRK.Import.worldUsd,null);assert.equal(d.trade.wheat.countries.PRK.Import.status,'unavailable');
});
test('2023 forest quantities and crop reference values reuse matching original rows, not trade currency or WDI',()=>{
 const source=JSON.parse(readFileSync(d.retainedInputs[0].path));assert.equal(hash(d.retainedInputs[0].path),d.retainedInputs[0].sha256);assert.equal(hash(d.retainedInputs[1].path),d.retainedInputs[1].sha256);
 for(const code of d.countries){for(const [kind,item] of [['roundwood','1861'],['sawnwood','1872']])for(const [field,element] of [['production','5516'],['imports','5616'],['exports','5916']]){
  const raw=source.countries[code].observations.find(r=>r.domain==='Forestry'&&r.item===item&&r.elementCode===element&&r.year===2023&&r.unit==='m3');assert.deepEqual(d.forestFlows[code][kind][field],raw?.value==null?null:{value:raw.value,flag:raw.flag});
 }}
 assert.equal(d.foodModels,null,'no synthetic or surrogate food balance/calorie input can ship');
 assert(d.inputAudit.absent.some(s=>s.includes('domestic-origin edible calories')));assert(!d.inputAudit.wdiIndicators.some(s=>s.includes('food')));
});
