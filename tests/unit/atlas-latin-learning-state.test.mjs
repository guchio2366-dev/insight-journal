import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLatinCommonModule} from './atlas-latin-common-helpers.mjs';
const lib=await loadLatinCommonModule('state');
const read=(query,field='industry')=>lib.readLatinLearningState(query,field,field==='nature'?['climate']:field==='agriculture'?['bana','coff','soyb','cattle']:['ores','manufactures'],field==='nature'?'climate':field==='agriculture'?'bana':'ores');

test('invalid country, scope, layer and comparison inputs cannot invent a selection',()=>{
 const state=read('?layer=fake&place=XXX&scope=country&only=1&fallback=0&from=unknown&sourceLayer=density');
 assert.deepEqual(state,{field:'industry',layer:'ores',place:'all',scope:'all',only:false,fallback:false});
 assert.equal(read('?from=population&sourceLayer=fake').source,undefined);
});
test('a source selection survives target changes, refresh and a named return URL',()=>{
 const original={field:'nature',layer:'climate',place:'CRI',scope:'central',only:true,fallback:true,case:'coffee'};
 const comparison=lib.latinComparisonState(original,'industry','manufactures');
 comparison.place='DOM';comparison.scope='country';comparison.fallback=false;
 const restored=read(lib.writeLatinLearningState(comparison));
 assert.deepEqual(restored.source,original);
 const returned=new URL(lib.latinSourceReturnUrl('/insight-journal/atlas/latin-america/',restored),'https://example.test');
 assert.equal(returned.pathname,'/insight-journal/atlas/latin-america/nature/');
 assert.deepEqual(read(returned.search,'nature'),original);
 assert.equal(returned.searchParams.has('from'),false);
});
test('quantity and density remain different source layers through all region scopes',()=>{
 for(const layer of ['spatial','density','population'])for(const scope of ['all','central','south','country'])for(const only of [false,true]){
  const comparison=lib.latinComparisonState({field:'population',layer,place:'JAM',scope,only,fallback:false},'industry','ores');
  const roundTrip=read(lib.writeLatinLearningState(comparison));
  assert.equal(roundTrip.source.layer,layer);assert.equal(roundTrip.source.scope,scope);assert.equal(roundTrip.source.only,only);
 }
});
test('a standalone fallback is retained and an absent source cannot create a return detour',()=>{
 const state=read('?layer=ores&place=PER&scope=south&renderer=svg');
 assert.equal(state.fallback,true);
 const returned=new URL(lib.latinSourceReturnUrl('/insight-journal/atlas/latin-america/',state),'https://example.test');
 assert.equal(returned.pathname,'/insight-journal/atlas/latin-america/industry/');
 assert.equal(returned.searchParams.get('fallback'),'1');assert.equal(returned.searchParams.has('from'),false);
});

test('agriculture aliases resolve to the rendered layer and canonical return URL',()=>{
 for(const [alias,canonical] of [['banana','bana'],['coffee','coff'],['soy','soyb']]){
  assert.equal(read(`?layer=${alias}`,'agriculture').layer,canonical);
  const comparison=read(`?from=agriculture&sourceLayer=${alias}&sourcePlace=BRA&sourceScope=country&sourceOnly=1`);
  assert.equal(comparison.source.layer,canonical);
  const returned=new URL(lib.latinSourceReturnUrl('/insight-journal/atlas/latin-america/',comparison),'https://example.test');
  assert.equal(returned.searchParams.get('layer'),canonical);
  assert.equal(read(returned.search,'agriculture').layer,canonical);
  assert.equal(new URLSearchParams(lib.writeLatinLearningState({...comparison,source:{...comparison.source,layer:alias}})).get('sourceLayer'),canonical);
 }
});

test('unsupported nature source layers cannot create a misleading comparison',()=>{
 for(const layer of ['climate-detail','rivers']){
  assert.equal(read(`?from=nature&sourceLayer=${layer}&sourcePlace=PAN`).source,undefined);
  assert.equal(read(`?layer=${layer}`,'nature').layer,'climate');
 }
 assert.equal(read('?from=nature&sourceLayer=climate&sourcePlace=PAN').source.layer,'climate');
});

test('combined agriculture overview remains a named comparison source and returns to the overview',()=>{
 const original={field:'agriculture',layer:'all',place:'all',scope:'all',only:false,fallback:false};
 const compared=lib.latinComparisonState(original,'nature','climate');
 const restored=read(lib.writeLatinLearningState(compared),'nature');
 assert.deepEqual(restored.source,original);
 assert.equal(new URL(lib.latinSourceReturnUrl('/atlas/latin-america/',restored),'https://example.test').searchParams.get('layer'),'all');
});
