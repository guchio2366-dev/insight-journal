import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const data=JSON.parse(readFileSync('public/assets/atlas/south-central-asia-v1/world-shares.json','utf8'));
const asia=JSON.parse(readFileSync(data.sources.country.path,'utf8'));
const world=JSON.parse(readFileSync(data.sources.world.path,'utf8'));
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const domains={QCL:'Production_Crops_Livestock',FO:'Forestry',RL:'Inputs_LandUse'};

test('South/Central country shares use the same published FAO item, element, year and unit as the world total',()=>{
 assert.equal(data.region,'south-central-asia');
 assert.equal(sha256(data.sources.country.path),data.sources.country.sha256);
 assert.equal(sha256(data.sources.world.path),data.sources.world.sha256);
 for(const measure of data.series)for(const year of measure.years){
  const denominator=world.world.observations.find(r=>r[0]===measure.id&&r[1]===year.year);
  assert.equal(year.world,Number(denominator[2]));assert.equal(measure.unit,denominator[3]);
  for(const [code,result] of Object.entries(year.countries)){
   assert.ok(data.countries.includes(code));
   const numerator=asia.countries[code].observations.find(r=>r.domain===domains[measure.domain]&&r.item===measure.itemCode&&r.elementCode===measure.elementCode&&r.year===year.year&&r.unit===measure.unit);
   assert.equal(result.value,numerator.value);
   assert.ok(Math.abs(result.share-result.value/year.world*100)<1e-9);
  }
 }
 const indiaRice=data.series.find(s=>s.id==='rice-production').years.find(y=>y.year===2024).countries.IND;
 assert.ok(indiaRice.share>26&&indiaRice.share<27);
 assert.equal(data.series.find(s=>s.id==='rice-production').years.find(y=>y.year===2024).countries.MDV,undefined,'unreported rows remain missing');
});

test('the named Uzbekistan cotton-chapter export partners follow the retained 2023 trade rows',()=>{
 const trade=JSON.parse(gunzipSync(readFileSync('public/assets/atlas/asia-trade-v1/south-central-asia.json.gz')));
 const partners=trade.countries.UZB.partners['52'].values.slice(0,3).map(([code])=>trade.partners[String(code)].name);
 assert.deepEqual(partners,['Russian Federation','China','Türkiye']);
 assert.equal(trade.countries.UZB.partners['52'].world,trade.countries.UZB.products['52'].X);
});
