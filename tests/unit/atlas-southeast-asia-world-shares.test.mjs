import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {southeastCropPriority,southeastCropCountries} from '../../src/data/atlas/asia/southeast-asia-crop-priority.mjs';

const data=JSON.parse(readFileSync('public/assets/atlas/southeast-asia-v1/world-shares.json'));
const country=JSON.parse(readFileSync(data.sources.country.path));
const world=JSON.parse(readFileSync(data.sources.world.path));
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('Southeast crop world shares use the matching FAOSTAT release, item, element, year and unit',()=>{
 assert.equal(data.region,'southeast-asia');
 assert.equal(sha256(data.sources.country.path),data.sources.country.sha256);
 assert.equal(sha256(data.sources.world.path),data.sources.world.sha256);
 assert.equal(country.inputs.find(row=>row.file===data.sources.archive.file).sha256,data.sources.archive.sha256);
 assert.equal(world.sources.find(row=>row.id==='QCL').archive.sha256,data.sources.archive.sha256);
 assert.deepEqual(data.countries,southeastCropCountries);
 assert.deepEqual(data.series.map(row=>row.itemCode),['27','56','236']);
 assert.deepEqual([...data.series.map(row=>row.itemCode),...data.unavailable.map(row=>row.itemCode)].sort(),southeastCropPriority(country).selected.map(row=>row.code).sort());
 for(const series of data.series){
  assert.equal(series.years.length,10);
  for(const year of series.years){
   const denominator=world.world.observations.filter(row=>row[0]===series.id&&row[1]===year.year);
   assert.equal(denominator.length,1);
   assert.equal(series.unit,denominator[0][3]);
   assert.equal(year.world,Number(denominator[0][2]));
   let sum=0;
   for(const [code,result] of Object.entries(year.countries)){
    assert.ok(data.countries.includes(code));
    const numerator=country.countries[code].observations.filter(row=>row.domain==='Production_Crops_Livestock'&&row.item===series.itemCode&&row.elementCode===series.elementCode&&row.year===year.year&&row.unit===series.unit);
    assert.equal(numerator.length,1);
    assert.equal(result.value,numerator[0].value);
    assert.equal(result.flag,numerator[0].flag);
    assert.ok(Math.abs(result.share-result.value/year.world*100)<1e-9);
    sum+=result.value;
   }
   assert.ok(Math.abs(year.reportedRegion.value-sum)<1e-6);
   assert.equal(year.reportedRegion.countryCount,Object.keys(year.countries).length);
   assert.equal(year.reportedRegion.complete,Object.keys(year.countries).length===data.countries.length);
  }
 }
 const rice2020=data.series.find(row=>row.itemCode==='27').years.find(row=>row.year===2020);
 assert.ok(rice2020.countries.IDN.share>7&&rice2020.countries.IDN.share<7.1);
 assert.equal(rice2020.countries.SGP,undefined,'missing country rows must remain absent');
 assert.equal(rice2020.reportedRegion.complete,false,'a partial country sum must not be labelled the complete region');
});
