import test from 'node:test';
import assert from 'node:assert/strict';
import {readState,writeState,africaComparisonSnapshot,agriLayerKeys,canonicalAgriLayers,africaAgriFocusedLayer,africaAgriVisibleLayers} from '../../src/data/atlas/africa-atlas.ts';

const url=()=>new URL('https://example.com/atlas/africa/');

test('absent layer lists show all nine product choices while keeping the reading focus independent',()=>{
 for(const [query,focused] of [
  ['?field=agriculture','crop-maize-harvested'],
  ['?field=agriculture&crop=rice&cropMeasure=production','crop-rice-production'],
  ['?field=agriculture&topic=livestock&livestock=sheep&crop=cassava&cropMeasure=production','livestock-sheep']
 ]){
  const state=readState(query);assert.equal(state.agriLayers,null);assert.equal(state.agriOutline,false);
  assert.equal(africaAgriFocusedLayer(state),focused);assert.equal(africaAgriVisibleLayers(state).length,9);assert.ok(africaAgriVisibleLayers(state).includes(focused));
  const written=writeState({...state},url());assert.equal(written.searchParams.has('agriLayers'),false);assert.equal(written.searchParams.has('agriOutline'),false);
  assert.deepEqual(readState(written.search),state);
 }
});

test('explicit all-off keeps the empty URL parameter through reload and differs from absent defaults',()=>{
 const state=readState('?field=agriculture&crop=rice&agriLayers=&agriOutline=1');
 assert.equal(state.agriLayers,'');assert.deepEqual(africaAgriVisibleLayers(state),[]);assert.equal(africaAgriFocusedLayer(state),'crop-rice-harvested');
 const written=writeState({...state},url());assert.equal(written.searchParams.has('agriLayers'),true);assert.equal(written.searchParams.get('agriLayers'),'');
 assert.equal(written.searchParams.get('agriOutline'),'1');assert.deepEqual(readState(written.search),state);
 const defaults=readState('?field=agriculture&crop=rice');assert.equal(africaAgriVisibleLayers(defaults).length,9);
});

test('the fifteen canonical layer keys are deduplicated and canonically ordered, with invalid keys excluded',()=>{
 assert.equal(agriLayerKeys.length,15);assert.equal(new Set(agriLayerKeys).size,15);
 const raw='livestock-goats, crop-rice-production,constructor,crop-maize-harvested,livestock-goats,crop-maize-yield,livestock-horses';
 const canonical='crop-maize-harvested,crop-rice-production,livestock-goats';
 assert.equal(canonicalAgriLayers(raw),canonical);assert.equal(readState('?agriLayers='+encodeURIComponent(raw)).agriLayers,canonical);
 for(const invalid of [null,undefined,false,{},'constructor,__proto__,toString','crop-maize-yield,livestock-horses',',,','x'.repeat(2049)])assert.equal(canonicalAgriLayers(invalid),null);
 assert.equal(canonicalAgriLayers('  '),'');
 const all=canonicalAgriLayers([...agriLayerKeys].reverse().concat(agriLayerKeys).join(','));assert.equal(all,agriLayerKeys.join(','));
 const state=readState('?field=agriculture&agriLayers='+encodeURIComponent(all));assert.deepEqual(africaAgriVisibleLayers(state),agriLayerKeys);
 assert.deepEqual(readState(writeState({...state},url()).search),state);
});

test('mixed layers and outline preserve the independent focus, selected countries, point, year and viewport',()=>{
 const query=new URLSearchParams({field:'agriculture',topic:'livestock',crop:'cassava',cropMeasure:'production',livestock:'sheep',agriLayers:'livestock-cattle,crop-rice-harvested,crop-maize-production',agriOutline:'1',place:'KEN',compare:'ETH',year:'2023',region:'east',zoom:'country',layerPoint:'38,1',layerClass:'positive'});
 const state=readState('?'+query);assert.equal(africaAgriFocusedLayer(state),'livestock-sheep');
 assert.deepEqual(africaAgriVisibleLayers(state),['crop-maize-production','crop-rice-harvested','livestock-cattle']);
 assert.equal(state.crop,'cassava');assert.equal(state.cropMeasure,'production');assert.equal(state.livestock,'sheep');
 const written=writeState({...state},url());assert.deepEqual(readState(written.search),state);
 assert.equal(written.searchParams.get('agriOutline'),'1');assert.equal(written.searchParams.get('place'),'KEN');assert.equal(written.searchParams.get('compare'),'ETH');
});

test('agriculture choices remain stored outside agriculture, including neutral cultural guidance and explicit all-off',()=>{
 for(const field of ['nature','industry','population'])for(const layers of ['', 'crop-wheat-harvested,livestock-sheep']){
  const p=new URLSearchParams({field,agriLayers:layers,agriOutline:'1',crop:'wheat',cropMeasure:'production',livestock:'goats',place:'EGY',compare:'NGA',year:'2021'});
  if(field==='population')p.set('topic','ethnicity');
  const state=readState('?'+p);assert.equal(state.agriLayers,layers);assert.equal(state.agriOutline,true);
  const written=writeState({...state},url());assert.deepEqual(readState(written.search),state);assert.equal(written.searchParams.has('agriLayers'),true);
 }
});

test('comparisons restore all eleven selections or all-off with the outline and complete source state after reload',()=>{
 for(const selection of ['',agriLayerKeys.join(',')]){
  const p=new URLSearchParams({field:'agriculture',topic:'farming',metric:'AG.LND.ARBL.ZS',crop:'rice',cropMeasure:'production',livestock:'goats',agriLayers:selection,agriOutline:'1',place:'KEN',compare:'ETH',year:'2023',region:'east',zoom:'country',layerClass:'p-2',layerPoint:'38,1'});
  const source=readState('?'+p),snapshot=africaComparisonSnapshot(source);assert.ok(snapshot.length<=1800);
  const comparison={...source,field:'nature',metric:'AG.LND.PRCP.MM',topic:'climate',context:'AG.LND.PRCP.MM',sourceState:snapshot};
  const loaded=readState(writeState(comparison,url()).search);assert.equal(loaded.agriLayers,selection);assert.equal(loaded.agriOutline,true);
  assert.deepEqual(readState('?'+loaded.sourceState),source);
  const restored=readState('?'+loaded.sourceState);assert.deepEqual(readState(writeState({...restored},url()).search),source);
 }
});

test('only exact outline=1 is true and writing defaults clears stale query parameters',()=>{
 for(const raw of ['0','','true','false','yes','2','01','constructor'])assert.equal(readState('?agriOutline='+raw).agriOutline,false);
 assert.equal(readState('?agriOutline=1').agriOutline,true);
 const state=readState('?field=agriculture');const written=writeState({...state},new URL('https://example.com/atlas/africa/?agriLayers=livestock-goats&agriOutline=1&utm=test'));
 assert.equal(written.searchParams.has('agriLayers'),false);assert.equal(written.searchParams.has('agriOutline'),false);assert.equal(written.searchParams.get('utm'),'test');
});
