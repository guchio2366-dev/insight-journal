import test from 'node:test';
import assert from 'node:assert/strict';
import {eastAsiaReligionCountries,eastAsiaReligionSources,mongoliaReligionCensusBasis} from '../../src/data/atlas/east-asia-religion.ts';

test('Mongolia religion shares use all residents aged 15+ as their denominator',()=>{
 const country=eastAsiaReligionCountries.find(item=>item.code==='MNG');
 assert.equal(country.sourceKey,'mongoliaCensus');
 assert.match(eastAsiaReligionSources.mongoliaCensus,/nso\.mn/);
 const values=Object.fromEntries(country.shares.map(([id,,value])=>[id,value]));
 assert.equal(values.none,mongoliaReligionCensusBasis.noReligionAmongAge15Plus);
 for(const [id,withinReligious] of Object.entries(mongoliaReligionCensusBasis.amongReligious)){
  const expected=Number((mongoliaReligionCensusBasis.religiousAmongAge15Plus*withinReligious/100).toFixed(1));
  assert.equal(values[id],expected,`${id} is converted from the published share among religious adults`);
 }
});
