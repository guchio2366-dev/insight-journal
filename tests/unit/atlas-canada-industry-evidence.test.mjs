import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {parseCsv} from '../../scripts/prepare-mexico-industry.mjs';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const evidence=JSON.parse(await readFile('src/data/atlas/canada/industry-evidence.json','utf8'));
const pilot=JSON.parse(await readFile('src/data/atlas/canada/industry-pilot.json','utf8'));
const compiled=await bundleCanadaSource('src/lib/atlas-canada-industry-evidence.ts',{platform:'node',format:'esm'});
const lib=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('All main and additional candidates have scoped evidence, a reason and a confidence assessment',()=>{
 const expected=['oil-gas','refining','hydro','aluminum','potash','uranium','nickel','gold','copper','iron-ore','steel-coal','auto','aerospace','food','wood','paper','finance','digital','logistics','tourism','battery','lithium','graphite','shipbuilding','railway','canola-crush','flour','seafood'];
 assert.deepEqual(Object.keys(evidence.items).sort(),expected.sort());
 assert.deepEqual(pilot.industries.map(i=>i.id).sort(),expected);
 for(const item of Object.values(evidence.items)){
  assert(item.confidence);assert(item.adoptionReason);
  for(const column of ['scale','comparison','strategy']){
   assert(item[column].length);
   for(const fact of item[column]){
    for(const field of ['label','year','geography','denominator','definition'])assert(fact[field],field+' is present');
    assert(fact.sources.length);for(const id of fact.sources)assert(pilot.sources[id],id);
    assert(fact.value===null||typeof fact.value==='string'||Number.isFinite(fact.value));
    if(fact.numerator!==undefined){assert(fact.denominatorValue>0);assert.equal(fact.value,Math.round(fact.numerator/fact.denominatorValue*1000)/10);assert.equal(fact.unit,'%');}
   }
  }
 }
});
test('Missing figures stay missing; graphite interruption and battery plan are dated distinctly from operating output',()=>{
 const missing=Object.values(evidence.items).flatMap(e=>['scale','comparison','strategy'].flatMap(c=>e[c])).filter(f=>f.value===null);
 assert(missing.length>0);for(const f of missing)assert.equal(lib.formatCanadaIndustryFact(f),'未確認');
 for(const [id,status,date]of [['ldi-graphite','paused','2026-09-01'],['matawinie-graphite','construction','2026-08-13'],['st-thomas-battery','planned','2023-03-13'],['windsor-battery','operating','2026-02-12']]){const c=pilot.clusters.find(c=>c.id===id);assert.equal(c.status,status);assert.equal(c.asOf,date);}
 assert.match(evidence.items.battery.scale[0].definition,/累計|年間/);
 assert.equal(evidence.items.lithium.scale[0].unit,'t');assert.match(evidence.items.lithium.scale[0].definition,/金属Li含有量/);
 assert.equal(evidence.items.uranium.scale[0].unit,'t U');
 assert.equal(evidence.items.food.scale[1].year,'2024/25');
 assert.equal(evidence.items.seafood.scale[0].year,'2023');
});
test('Separated wood and paper GDP, finance and railway figures reproduce the retained primary rows',async()=>{
 const rows=parseCsv(gunzipSync(await readFile('public/assets/atlas/canada-industry-parity-v1/gdp-2021.csv.gz')).toString());
 for(const [id,code]of [['wood','321'],['paper','322'],['finance','52'],['railway','3365']]){
  const r=rows.filter(r=>r.REF_DATE==='2021'&&r.Prices==='Current dollars'&&r['North American Industry Classification System (NAICS)'].endsWith('['+code+']'));
  assert.equal(r.length,13);for(const row of r){assert.equal(row.STATUS,'');assert.equal(row.SYMBOL,'');assert.equal(row.SCALAR_FACTOR,'millions');}
  const fact=evidence.items[id].scale.find(f=>f.year==='2021');assert.equal(fact.value,Math.round(r.reduce((s,r)=>s+Number(r.VALUE),0)*10)/10000);assert.equal(fact.unit,'十億CAD');
 }
});
