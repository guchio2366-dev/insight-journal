import test from 'node:test';
import assert from 'node:assert/strict';
import {eastAdoptedIndustryIds,eastIndustryEvidence,formatEastIndustryMetric} from '../../src/data/atlas/east-asia-industry-evidence.ts';
import {eastSectorIndustries,eastSectorSites,eastSectorTopics} from '../../src/data/atlas/east-asia-industry-sectors.ts';

test('all 17 main and four additional products have selectable topics, locations and scoped evidence',()=>{
 const required=['coal','gas','rareearths','copper','foundry','memory','equipment','materials','packaging','batteries','photovoltaic','steel','auto','soybean','ships','logistics','finance','design','refining','digital','minorMetals'];
 assert.deepEqual([...eastAdoptedIndustryIds].sort(),[...required].sort());
 for(const id of required){
  assert(eastSectorIndustries.some(i=>i.id===id));assert(eastSectorTopics.some(t=>t.id==='east-'+id));
  assert(eastSectorSites.some(s=>s.industries.includes(id)),id+' has a source-backed location example');
  const evidence=eastIndustryEvidence[id];assert(evidence.meaning&&evidence.boundary);
  for(const kind of ['economic','world']){assert(evidence[kind].length);for(const m of evidence[kind]){
   assert(m.value===null||Number.isFinite(m.value));assert(m.year&&m.unit&&m.scope&&m.publisher);assert(new URL(m.source).protocol==='https:');
   if(m.unit.startsWith('％'))assert(m.denominator,'every share identifies its denominator');
  }}
 }
 assert(eastSectorSites.some(s=>s.country==='JPN'&&s.industries.includes('foundry')),'Japan remains in the regional analysis');
});
test('stage, year and company boundaries prevent spurious geographic shares and zero-filling',()=>{
 assert.match(eastIndustryEvidence.foundry.world[0].denominator,/上位10社計ではない/);
 assert.match(eastIndustryEvidence.packaging.economic[0].scope,/本社.*世界/);
 assert.match(eastIndustryEvidence.equipment.world[0].scope,/装置全種類ではない/);
 assert.match(eastIndustryEvidence.photovoltaic.economic[0].scope,/導入量ではない/);
 assert.match(eastIndustryEvidence.soybean.boundary,/暦年.*別の期間/);
 assert.match(eastIndustryEvidence.finance.world[0].denominator,/オフショア/);
 assert.equal(eastIndustryEvidence.minorMetals.economic[0].value,null);
 assert.equal(formatEastIndustryMetric(eastIndustryEvidence.minorMetals.economic[0]),'未取得');
 for(const id of ['zhangjiagang-soybean','dongguan-soybean']){const s=eastSectorSites.find(s=>s.id===id);assert.equal(s.status,'現在の操業未確認');assert.match(s.observedYear,/2024/);}
 assert.match(eastSectorSites.find(s=>s.id==='baotou-magnets').stage,/第3期は建設中/);
});
