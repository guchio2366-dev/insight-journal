import test from 'node:test';
import assert from 'node:assert/strict';
import {dominantCategory} from '../../src/lib/atlas-population-dominant.ts';
import {readPopulationState,writePopulationState} from '../../src/lib/atlas-population-state.ts';
const counts=ns=>ns.map(n=>[n,null]);
test('a unique plurality wins without requiring more than half of residents',()=>{
 assert.equal(dominantCategory(counts([30,20,25,15,5,2,2,1])),0);
 assert.equal(dominantCategory(counts([0,1,2,90,3,2,1,1])),3);
});
test('missing, tied, malformed and zero-population rows cannot acquire a winner',()=>{
 for(const row of [null,[],counts([30,30,20,5,5,5,3,2]),counts([0,0,0,0,0,0,0,0]),counts([100,null,1,1,1,1,1,1]),counts([100,-1,1,1,1,1,1,1]),counts([100,NaN,1,1,1,1,1,1])])assert.equal(dominantCategory(row),null);
});
test('old metro links restore a national map and vote focus is allowlisted',()=>{
 assert.equal(readPopulationState(new URL('https://example.org/?popMetro=35620')).metro,'national');
 for(const id of ['48','39','23','33','26','02']){
  const state=readPopulationState(new URL('https://example.org/?popView=vote&popVoteState='+id));
  assert.equal(state.voteState,id);assert.deepEqual(readPopulationState(writePopulationState(new URL('https://example.org/'),state)),state);
 }
 assert.equal(readPopulationState(new URL('https://example.org/?popVoteState=50')).voteState,'');
});
