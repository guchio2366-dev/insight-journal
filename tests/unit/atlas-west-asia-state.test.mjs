import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readWestState,westSearch} from '../../src/lib/atlas-west-asia-state.mjs';

const data=JSON.parse(await readFile(new URL('../../public/assets/atlas/west-asia-v1/data.json',import.meta.url),'utf8'));
const selection='country=SAU&city=riyadh&year=2021&map=10,20,400,300&at=46.7,24.9&basin=nile';
const basis=state=>{const {category,...rest}=state;return rest;};

test('unrecorded categories round-trip with their original reference topic and selected geography',()=>{
  for(const [field,topic,categories] of [['natural','groundwater',['precipitation']],['population','cities',['ethnicity','religion']]]){
    const urban=data.urban.cities.find(city=>city.countryCode==='SAU');
    assert.ok(urban,'the shipped Saudi urban selection is available');
    const original=readWestState(`?topic=${topic}&${selection}&urban=${urban.id}`,field,data);
    for(const category of categories){
      const state=readWestState(`?topic=${topic}&${selection}&urban=${urban.id}&category=${category}`,field,data);
      assert.equal(state.category,category);
      assert.deepEqual(basis(state),basis(original),'choosing an unrecorded subject does not change the reference map or selections');
      assert.deepEqual(readWestState(westSearch(state),field,data),state);
      assert.equal(new URLSearchParams(westSearch(state)).get('category'),category);
    }
  }
});

test('category URLs reject invalid or other-field subjects and retain the available forest topic',()=>{
  for(const field of ['natural','population','agriculture','industry'])for(const category of ['unknown','constructor','__proto__','<script>',' precipitation','forest','ethnicity','religion','precipitation']){
    const topic=field==='agriculture'?'forest':field==='industry'?'ports':field==='population'?'age-older':'rivers';
    const state=readWestState(`?topic=${topic}&${selection}&category=${encodeURIComponent(category)}`,field,data);
    const allowed=field==='natural'&&category==='precipitation'||field==='population'&&['ethnicity','religion'].includes(category);
    assert.equal(state.category,allowed?category:'',`${field}: ${category}`);
    assert.equal(state.topic,topic,'category validation leaves the actual reference topic intact');
    assert.equal(state.country,'SAU');assert.equal(state.year,2021);assert.deepEqual(state.view,[10,20,400,300]);
  }
  const fallback=readWestState(`?topic=ports&${selection}&category=religion`,'unknown',data);
  assert.equal(fallback.field,'natural');assert.equal(fallback.topic,'climate');assert.equal(fallback.category,'');
});

test('writing categories validates the current field and removes them from other field destinations',()=>{
  for(const [field,category] of [['natural','precipitation'],['population','ethnicity'],['population','religion']]){
    const state=readWestState(`?${selection}&category=${category}`,field,data);
    for(const target of ['natural','population','agriculture','industry']){
      const restored=readWestState(westSearch(state,target),target,data);
      assert.equal(restored.category,target===field?category:'');
      for(const key of ['country','city','urban','year','view','basin','point'])assert.deepEqual(restored[key],state[key],`${target}: ${key}`);
    }
    assert.deepEqual(readWestState(westSearch(state,'unknown'),field,data),state,'an invalid destination safely keeps the current valid field');
    for(const category of ['unknown','constructor','__proto__'])assert.equal(new URLSearchParams(westSearch({...state,category})).has('category'),false);
  }
  const wrongField={...readWestState(`?${selection}`,'natural',data),category:'ethnicity'};
  assert.equal(new URLSearchParams(westSearch(wrongField,'population')).has('category'),false,'a malformed source cannot inject a category through a field change');
});

test('reading saved history URLs restores each unavailable subject and clears it for ordinary maps',()=>{
  const initial=readWestState(`?topic=age-older&${selection}`,'population',data);
  const states=[{...initial,category:'ethnicity'},{...initial,category:'religion'},initial];
  const urls=states.map(state=>westSearch(state));
  for(const index of [0,1,2,1,0,1,2])assert.deepEqual(readWestState(urls[index],'population',data),states[index]);
});
