import test from 'node:test';
import assert from 'node:assert/strict';
import {readState,writeState,canonicalRiver,africaComparisonSnapshot} from '../../src/data/atlas/africa-atlas.ts';

const url=()=>new URL('https://example.com/atlas/africa/');
const riverState=(river)=>readState('?'+new URLSearchParams({field:'nature',topic:'water',water:'river',metric:'ER.H2O.INTR.PC',river,view:'distribution',place:'EGY',compare:'COD',year:'2022',region:'all',zoom:'all'}));

test('named river URLs round trip with their existing country, year and viewport selections',()=>{
 for(const river of ['nile','congo']){
  const state=riverState(river),written=writeState({...state},url());
  assert.equal(state.river,river);assert.equal(written.searchParams.get('river'),river);
  assert.equal(state.place,'EGY');assert.equal(state.compare,'COD');assert.equal(state.year,2022);assert.equal(state.zoom,'all');
  assert.deepEqual(readState(written.search),state);
 }
 // The established freshwater metric is enough to resolve the river layer.
 assert.equal(readState('?field=nature&topic=water&metric=ER.H2O.INTR.PC&river=congo').river,'congo');
});

test('only the two named river choices are accepted, without making a selection for legacy URLs',()=>{
 const active={field:'nature',topic:'water',water:'river'};
 for(const invalid of [null,undefined,false,{},[],'','Nile','nile,congo',' nile ','niger','constructor','__proto__','ne50-river-0047']){
  assert.equal(canonicalRiver(active,invalid),'');
  if(typeof invalid==='string')assert.equal(riverState(invalid).river,'');
 }
 for(const query of ['', '?field=nature&theme=nile-water', '?field=nature&topic=water&metric=ER.H2O.INTR.PC', '?field=agriculture', '?field=industry', '?field=population']){
  const state=readState(query),written=writeState({...state},url());
  assert.equal(state.river,'');assert.equal(written.searchParams.has('river'),false);
  assert.deepEqual(readState(written.search),state);
 }
 const legacy=readState('?field=nature&theme=nile-water');
 assert.equal(legacy.view,'statistics');assert.equal(legacy.water,'rain');assert.equal(legacy.theme,'nile-water');
});

test('unrelated fields, topics and water subtypes clear stale selections on both read and write',()=>{
 for(const changes of [
  {field:'agriculture'}, {field:'industry'}, {field:'population'},
  {topic:'climate'}, {topic:'terrain'}, {topic:'elevation'},
  {water:'basin'}, {water:'rain',metric:'AG.LND.PRCP.MM'}
 ]){
  const stale={...riverState('nile'),...changes};
  const raw='?'+new URLSearchParams(Object.entries(stale).filter(([,value])=>typeof value==='string'||typeof value==='number'));
  assert.equal(readState(raw).river,'');
  const written=writeState(stale,new URL('https://example.com/atlas/africa/?river=congo&utm=test'));
  assert.equal(stale.river,'');assert.equal(written.searchParams.has('river'),false);assert.equal(written.searchParams.get('utm'),'test');
 }
 assert.equal(readState('?river=nile').river,'');
 const reset=writeState(readState(''),new URL('https://example.com/atlas/africa/?river=congo'));
 assert.equal(reset.searchParams.has('river'),false);assert.equal(readState(reset.search).topic,'climate');
});

test('freshwater comparison reload and return restore each complete river source snapshot',()=>{
 for(const river of ['nile','congo']){
  const source={...riverState(river),layerPoint:river==='nile'?'31,25':'20,-2'},snapshot=africaComparisonSnapshot(source);
  assert.equal(new URLSearchParams(snapshot).get('river'),river);assert.ok(snapshot.length<=1800);
  const comparison={...source,context:'ER.H2O.INTR.PC',sourceState:snapshot,view:'statistics',place:'KEN',compare:'ETH',zoom:'country',year:2023};
  const loaded=readState(writeState({...comparison},url()).search);
  assert.equal(loaded.context,'ER.H2O.INTR.PC');assert.equal(loaded.river,river);assert.equal(loaded.view,'statistics');
  const restored=readState('?'+loaded.sourceState);
  assert.deepEqual(restored,source);assert.deepEqual(readState(writeState({...restored},url()).search),source);
  assert.equal(new URLSearchParams(snapshot).has('sourceState'),false);assert.equal(new URLSearchParams(snapshot).has('context'),false);
 }
});

test('separate URL history entries keep selection, comparison return and reset independent',()=>{
 const nile=riverState('nile'),congo={...riverState('congo'),place:'COD',compare:'EGY'},comparison={...congo,context:'ER.H2O.INTR.PC',sourceState:africaComparisonSnapshot(congo),view:'statistics'};
 const states=[nile,congo,comparison,readState('')],history=states.map(state=>writeState({...state},url()).search);
 // Visit entries out of order as popstate does; no read depends on the previous selection.
 for(const index of [3,2,1,0,1,2,3])assert.deepEqual(readState(history[index]),states[index]);
 assert.deepEqual(readState('?'+readState(history[2]).sourceState),congo);
});
