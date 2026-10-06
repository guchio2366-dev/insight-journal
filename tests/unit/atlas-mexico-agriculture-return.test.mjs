import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './src/lib/atlas-mexico-nature.ts';export * from './src/lib/atlas-mexico-agriculture-atlas-state.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',write:false});
const lib=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const codes=Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0'));
test('Named nature return restores exact agriculture item, optional state, camera and layers for all four existing comparisons',()=>{
 for(const [item,metric,comparisonState]of [['corn','maize','25'],['irrigation','irrigation','25'],['pine','pine','10'],['cattle','cattle','30']])for(const selectedState of [null,'08']){
  const query=new URLSearchParams({compare:'irrigation',from:'agriculture',state:comparisonState,sourceState:comparisonState,sourceMetric:metric,sourceCrops:'0',sourceLivestock:'1',sourceOnlyItem:'1',sourceAgriItem:item,sourceAgriState:selectedState??'none',sourceAgriCamera:'520,320,2.25'});
  const nature=lib.readMexicoNatureState(new URL('https://example.test/nature/?'+query),codes);
  assert.equal(nature.sourceAgricultureAtlas.state,selectedState);
  const changed=lib.mexicoNatureSelectView({...nature,state:'30',frame:[50,60,400,250]},'relief');
  const reloaded=lib.readMexicoNatureState(lib.writeMexicoNatureState(new URL('https://example.test/nature/'),changed),codes);
  const returned=new URL(lib.mexicoNatureReturnUrl('/agriculture/',reloaded),'https://example.test');
  assert.equal(returned.pathname,'/agriculture/');assert.equal(returned.searchParams.get('state'),selectedState);
  const state=lib.readMexicoAgricultureAtlasState(returned);
  assert.deepEqual(state,{item,state:selectedState,region:null,crops:false,livestock:true,onlyItem:true,zoom:2.25,x:520,y:320});
 }
});
test('Malformed or unrelated source context cannot alter the bounded named destination',()=>{
 for(const camera of ['Infinity,290,2','0,0,2','450,290,8','450,290','450,290,0']){
  const nature=lib.readMexicoNatureState(new URL('https://example.test/?from=agriculture&sourceMetric=maize&sourceAgriItem=corn&sourceAgriState=none&sourceAgriCamera='+camera),codes);
  assert.equal(nature.sourceAgricultureAtlas,undefined);
 }
 for(const suffix of ['from=population&sourceMetric=maize&sourceAgriItem=corn','from=agriculture&sourceMetric=pine&sourceAgriItem=corn','from=agriculture&sourceMetric=maize&sourceAgriItem=https://evil.test']){
  const nature=lib.readMexicoNatureState(new URL('https://example.test/?'+suffix+'&sourceAgriState=none&sourceAgriCamera=450,290,1'),codes);
  assert.equal(nature.sourceAgricultureAtlas,undefined);
 }
});
