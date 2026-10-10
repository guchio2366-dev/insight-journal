import test from 'node:test';
import assert from 'node:assert/strict';
import {europeReligionNationalProfiles} from '../../src/data/atlas/europe/religion-national-overview.ts';

test('five national reporting units retain every published response and its own denominator',()=>{
  assert.deepEqual(europeReligionNationalProfiles.map(item=>item.country),['GBR','CZE','HRV','SRB','EST']);
  for(const profile of europeReligionNationalProfiles){
    assert.ok(profile.source.startsWith('https://'));
    assert.ok(profile.licenseUrl.startsWith('https://'));
    assert.ok(profile.universe&&profile.question&&profile.precision);
    assert.ok(Math.abs(profile.segments.reduce((sum,item)=>sum+item.share,0)-100)<.1,profile.id);
    if(profile.denominator)assert.ok(Math.abs(profile.segments.reduce((sum,item)=>sum+(item.count??0),0)-profile.denominator)<15,profile.id);
  }
  const czech=europeReligionNationalProfiles.find(item=>item.country==='CZE');
  assert.equal(czech.segments.find(item=>item.id==='no-belief').count,5027141);
  assert.equal(czech.segments.find(item=>item.id==='not-stated').count,3162540);
  const serbia=europeReligionNationalProfiles.find(item=>item.country==='SRB');
  assert.equal(serbia.segments.find(item=>item.id==='orthodox').count,5387426);
  assert.equal(serbia.segments.find(item=>item.id==='unknown').count,355484);
  const estonia=europeReligionNationalProfiles.find(item=>item.country==='EST');
  assert.equal(estonia.denominator,undefined);
  assert.equal(estonia.segments.find(item=>item.id==='no-affiliation').share,58);
  assert.equal(estonia.segments.find(item=>item.id==='unanswered').share,13);
});
