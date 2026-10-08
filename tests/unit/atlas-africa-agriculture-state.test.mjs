import test from 'node:test';
import assert from 'node:assert/strict';
import {readState,writeState,agriLayerKeys,canonicalAgriLayers,africaAgriFocusedLayer,africaAgriVisibleLayers} from '../../src/data/atlas/africa-atlas.ts';

const url=()=>new URL('https://example.com/atlas/africa/');
const products=['crop-maize-harvested','crop-rice-harvested','crop-wheat-harvested','crop-cassava-harvested','livestock-cattle','livestock-goats','livestock-sheep'];
const roundTrip=state=>readState(writeState({...state},url()).search);

test('all seven source products are visible by default; legacy production never changes crop area units',()=>{
 for(const [query,focused,overview] of [
  ['?field=agriculture','crop-maize-harvested',true],
  ['?field=agriculture&crop=rice&cropMeasure=production','crop-rice-harvested',false],
  ['?field=agriculture&topic=livestock&livestock=sheep&crop=cassava&cropMeasure=production','livestock-sheep',false]
 ]){
  const state=readState(query);assert.equal(state.agriLayers,null);assert.equal(state.overview,overview);assert.equal(state.agriOutline,!overview);
  assert.equal(africaAgriFocusedLayer(state),focused);assert.deepEqual(africaAgriVisibleLayers(state),products);assert.equal(state.cropMeasure,'harvested');
  const loaded=roundTrip(state);assert.equal(africaAgriFocusedLayer(loaded),focused);assert.deepEqual(africaAgriVisibleLayers(loaded),products);assert.equal(loaded.overview,overview);
 }
});

test('retired empty, mixed and unrelated layer lists normalize to the same complete distribution',()=>{
 for(const layers of ['',products.join(','),'crop-maize-production,crop-rice-harvested,livestock-goats','livestock-sheep']){
  const state=readState('?'+new URLSearchParams({field:'agriculture',crop:'rice',agriLayers:layers,agriOutline:'1'}));
  assert.equal(state.agriLayers,null);assert.deepEqual(africaAgriVisibleLayers(state),products);assert.equal(africaAgriFocusedLayer(state),'crop-rice-harvested');
  const written=writeState({...state},url());assert.equal(written.searchParams.has('agriLayers'),false);assert.deepEqual(africaAgriVisibleLayers(readState(written.search)),products);
 }
});

test('source key parser retains all eleven real datasets without exposing obsolete multi-select UI',()=>{
 assert.equal(agriLayerKeys.length,11);assert.equal(new Set(agriLayerKeys).size,11);
 assert.equal(canonicalAgriLayers('livestock-goats, crop-rice-production,constructor,crop-maize-harvested,livestock-goats,crop-maize-yield'),'crop-maize-harvested,crop-rice-production,livestock-goats');
 for(const invalid of [null,undefined,false,{},'constructor,__proto__,toString','crop-maize-yield,livestock-horses',',,','x'.repeat(2049)])assert.equal(canonicalAgriLayers(invalid),null);
 assert.equal(canonicalAgriLayers('  '),'');assert.equal(canonicalAgriLayers([...agriLayerKeys].reverse().concat(agriLayerKeys).join(',')),agriLayerKeys.join(','));
});

test('only the selected product can request single distribution; overview always restores all seven',()=>{
 for(const [query,key] of [['crop=rice&agriLayers=crop-rice-production','crop-rice-harvested'],['topic=livestock&livestock=goats&agriLayers=livestock-goats','livestock-goats']]){
  const state=readState('?field=agriculture&overview=0&'+query);
  assert.equal(state.agriLayers,key);assert.deepEqual(africaAgriVisibleLayers(state),[key]);assert.equal(roundTrip(state).agriLayers,key);
  const overview=readState('?field=agriculture&overview=1&'+query);assert.equal(overview.agriLayers,null);assert.equal(overview.agriOutline,false);assert.deepEqual(africaAgriVisibleLayers(overview),products);
 }
});

test('region and independent crop/species choices survive reload without country, year or comparison routes',()=>{
 for(const region of ['all','north','south','west','east','central']){
  const state=readState('?'+new URLSearchParams({field:'agriculture',topic:'livestock',crop:'cassava',cropMeasure:'production',livestock:'sheep',place:'KEN',compare:'ETH',year:'2023',region,zoom:'country',view:'statistics',context:'NV.AGR.TOTL.ZS',layerPoint:'38,1'}));
  const written=writeState({...state},url()),loaded=readState(written.search);
  assert.equal(loaded.crop,'cassava');assert.equal(loaded.livestock,'sheep');assert.equal(loaded.cropMeasure,'harvested');assert.equal(loaded.region,region);assert.equal(loaded.zoom,region==='all'?'all':'region');assert.equal(loaded.layerPoint,'38,1');
  for(const key of ['place','compare','year','metric','view','context','sourceState'])assert.equal(written.searchParams.has(key),false,key);
 }
});

test('outline follows reading selection and reset removes stale single-layer parameters',()=>{
 for(const raw of ['0','','true','1','yes']){
  assert.equal(readState('?field=agriculture&overview=1&agriOutline='+raw).agriOutline,false);
  assert.equal(readState('?field=agriculture&crop=rice&overview=0&agriOutline='+raw).agriOutline,true);
 }
 const written=writeState(readState('?field=agriculture'),new URL('https://example.com/atlas/africa/?agriLayers=livestock-goats&agriOutline=1&utm=test'));
 assert.equal(written.searchParams.has('agriLayers'),false);assert.equal(written.searchParams.has('agriOutline'),false);assert.equal(written.searchParams.get('utm'),'test');
});
