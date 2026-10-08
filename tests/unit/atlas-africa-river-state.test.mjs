import test from 'node:test';
import assert from 'node:assert/strict';
import {readState,writeState,canonicalRiver} from '../../src/data/atlas/africa-atlas.ts';

const url=()=>new URL('https://example.com/atlas/africa/');
const rivers=['nile','congo','niger','zambezi','orange','limpopo','senegal','volta','okavango'];
const riverState=river=>readState('?'+new URLSearchParams({field:'nature',topic:'water',water:'river',river,place:'EGY',compare:'COD',year:'2022',region:'north',zoom:'country',view:'statistics'}));

test('all nine named river selections survive canonical reload without country comparison state',()=>{
 for(const river of rivers){
  const state=riverState(river),written=writeState({...state},url()),loaded=readState(written.search);
  assert.equal(state.river,river);assert.equal(loaded.river,river);assert.equal(written.searchParams.get('river'),river);assert.equal(loaded.water,'river');assert.equal(loaded.topic,'water');
  assert.equal(state.place,'');assert.equal(state.compare,'');assert.equal(state.zoom,'all');assert.equal(state.region,'all');assert.equal(state.view,'distribution');
  for(const key of ['place','compare','year','metric','view','context','sourceState'])assert.equal(written.searchParams.has(key),false,key);
 }
 assert.equal(readState('?field=nature&topic=water&metric=ER.H2O.INTR.PC&river=congo').river,'congo');
});

test('river names are allowlisted and known legacy Nile links retain their original reading',()=>{
 const legacy=readState('?field=nature&theme=nile-water');assert.equal(legacy.river,'nile');assert.equal(legacy.water,'river');assert.equal(legacy.view,'distribution');
 const active={field:'nature',topic:'water',water:'river'};
 for(const invalid of [null,undefined,false,{},[],'','Nile','nile,congo',' nile ','constructor','__proto__','ne50-river-0047'])assert.equal(canonicalRiver(active,invalid),'');
 for(const query of ['', '?field=nature&topic=water&metric=ER.H2O.INTR.PC', '?field=agriculture', '?field=industry', '?field=population']){
  const state=readState(query),written=writeState({...state},url());assert.equal(state.river,'');assert.equal(written.searchParams.has('river'),false);assert.equal(state.view,'distribution');
 }
});

test('river, real basin and climate city selections are scoped to their own layer on read and write',()=>{
 const cases=[
  ['?field=nature&topic=water&water=river&river=niger&basin=b-1060034260&city=helwan','niger','',''],
  ['?field=nature&topic=water&water=basin&river=nile&basin=b-1060034260&city=helwan','','b-1060034260',''],
  ['?field=nature&topic=climate&river=nile&basin=b-1060034260&city=helwan','','','helwan'],
  ['?field=nature&topic=water&water=rain&river=nile&basin=b-1060034260&city=helwan','','',''],
  ['?field=agriculture&river=nile&basin=b-1060034260&city=helwan','','','']
 ];
 for(const [query,river,basin,city] of cases){
  const state=readState(query),loaded=readState(writeState({...state},url()).search);
  for(const actual of [state,loaded])assert.deepEqual([actual.river,actual.basin,actual.city],[river,basin,city]);
 }
 for(const basin of ['Nile','b-123','constructor','b-1060034260,other'])assert.equal(readState('?field=nature&topic=water&water=basin&basin='+basin).basin,'');
 for(const city of ['cairo','Helwan','constructor'])assert.equal(readState('?field=nature&topic=climate&city='+city).city,'');
 for(const changes of [{field:'agriculture'},{field:'industry'},{field:'population'},{topic:'climate'},{topic:'terrain'},{topic:'elevation'},{water:'basin'},{water:'rain'}]){
  const state={...riverState('nile'),...changes};const written=writeState(state,new URL('https://example.com/atlas/africa/?river=congo&utm=test'));assert.equal(state.river,'');assert.equal(written.searchParams.has('river'),false);assert.equal(written.searchParams.get('utm'),'test');
 }
});

test('history entries independently restore river, basin, city and reset selections',()=>{
 const states=[riverState('nile'),riverState('okavango'),readState('?field=nature&topic=water&water=basin&basin=b-1060034260'),readState('?field=nature&topic=climate&city=helwan'),readState('')];
 const history=states.map(state=>writeState({...state},url()).search);
 for(const index of [4,3,2,1,0,1,2,3,4]){
  const loaded=readState(history[index]),source=states[index];for(const key of ['field','topic','water','river','basin','city','zoom','overview'])assert.equal(loaded[key],source[key],key);
 }
});
