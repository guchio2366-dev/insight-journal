import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readWestState,westSearch} from '../../src/lib/atlas-west-asia-state.mjs';
const data=JSON.parse(await readFile(new URL('../../public/assets/atlas/west-asia-v1/data.json',import.meta.url),'utf8'));
const selection='country=SAU&city=riyadh&year=2021&map=10,20,400,300&at=46.7,24.9&basin=nile&group=epr-123';
test('former category URLs migrate to real topics while preserving geography and period',()=>{
 for(const [field,topic,category] of [['natural','groundwater','precipitation'],['population','cities','ethnicity'],['population','density','religion']]){
  const base=readWestState(`?topic=${topic}&${selection}`,field,data),state=readWestState(`?topic=${topic}&${selection}&category=${category}`,field,data);
  assert.equal(state.topic,category);assert.equal(state.category,'');
  for(const key of ['country','city','urban','year','view','basin','point','group'])assert.deepEqual(state[key],base[key],key);
  assert.deepEqual(readWestState(westSearch(state),field,data),state);assert.equal(new URLSearchParams(westSearch(state)).has('category'),false);
 }
});
test('invalid categories and groups cannot inject subjects or markup',()=>{
 for(const field of ['natural','population','agriculture','industry'])for(const category of ['unknown','constructor','__proto__','forest',' precipitation']){
  const state=readWestState(`?${selection}&category=${encodeURIComponent(category)}`,field,data);
  assert.equal(state.category,'');assert.equal(state.topic,field==='natural'?'climate':field==='population'?'density':field==='agriculture'?'farming-overview':'manufacturing');
 }
 assert.equal(readWestState('?topic=ethnicity&group=%3Cscript%3E','population',data).group,'');
 assert.equal(readWestState('?topic=religion&group=epr-123','natural',data).topic,'climate');
});
test('field links and history retain selected place, period, camera and group',()=>{
 const initial=readWestState(`?topic=ethnicity&${selection}`,'population',data);
 for(const target of ['natural','population','agriculture','industry']){
  const state=readWestState(westSearch(initial,target),target,data);
  for(const key of ['country','city','urban','year','view','basin','point','group'])assert.deepEqual(state[key],initial[key],key);
 }
 const states=[initial,{...initial,topic:'religion'},{...initial,topic:'density'}],urls=states.map(s=>westSearch(s));
 for(const i of [0,1,2,1,0])assert.deepEqual(readWestState(urls[i],'population',data),states[i]);
});
