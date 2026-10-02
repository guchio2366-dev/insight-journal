import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {readMexicoWaterSelection,writeMexicoWaterSelection,validateMexicoWaterCollection,mexicoWaterFeatureFill,mexicoWaterLayersForCategory,mexicoContourGroups,closestMexicoContour} from '../../src/lib/atlas-mexico-hydrology.ts';
import {readMexicoNatureState,writeMexicoNatureState,mexicoNatureReturnUrl} from '../../src/lib/atlas-mexico-nature.ts';

const line = (id, value = 1000) => ({type:'Feature', properties:{id,name:`${value} mm/年`,value,unit:'mm/年'},geometry:{type:'LineString',coordinates:[[-105,25],[-102,24],[-100,22]]}});
const collection = features => ({type:'FeatureCollection',features});
test('Water selection has its own stable ID and preserves original comparison, native feature and camera on reload', () => {
  const initial = new URL('https://example.test/nature/?view=relief&feature=relief-17&item=III&category=precipitation&state=10&frame=210,100,350,220&compare=irrigation&from=agriculture&sourceState=25&sourceMetric=cattle&sourceCrops=0&sourceOnlyItem=1');
  const withWater = writeMexicoWaterSelection(initial,{base:'relief',feature:'precipitation:INEGI-1000-7'});
  const native = readMexicoNatureState(withWater,['10','25']);
  const restored = writeMexicoWaterSelection(writeMexicoNatureState(withWater,native),readMexicoWaterSelection(withWater));
  assert.equal(restored.searchParams.get('waterFeature'),'precipitation:INEGI-1000-7'); assert.equal(restored.searchParams.get('feature'),'relief-17');
  assert.deepEqual(native.frame,[210,100,350,220]); assert.equal(native.sourceState,'25'); assert.equal(native.sourceMetric,'cattle');
  assert.deepEqual(readMexicoWaterSelection(restored),{base:'relief',feature:'precipitation:INEGI-1000-7'});
  assert.match(mexicoNatureReturnUrl('/agriculture/',native),/state=25.*metric=cattle.*crops=0.*onlyItem=1/);
  assert.equal(readMexicoWaterSelection(new URL('https://example.test/?waterFeature=untrusted:1&waterBase=road')).feature,'');
});
test('Annual-rainfall lines remain actual lines, and invalid/native coordinates and duplicate IDs fail instead of inventing a distribution', () => {
  const actual = validateMexicoWaterCollection(collection([line('a'),line('b',2500)]),'precipitation');
  assert.equal(mexicoWaterFeatureFill(actual.features[0],'precipitation',{file:'rain.json'}),'none');
  assert.equal(actual.features[0].geometry.type,'LineString');
  assert.throws(()=>validateMexicoWaterCollection(collection([line('a'),line('a')]),'precipitation'),/重複/);
  assert.throws(()=>validateMexicoWaterCollection(collection([{...line('native'),geometry:{type:'LineString',coordinates:[[2300000,1700000],[2400000,1800000]]}}]),'precipitation'),/経緯度/);
  assert.throws(()=>validateMexicoWaterCollection(collection([line('unknown')]),'contours'),/標高/);
  assert.deepEqual(mexicoWaterLayersForCategory('rivers-groundwater'),['groundwater','rivers']);
});
test('The delivered Mexican rainfall lines retain all original annual values, counts, units and the recorded output hash', () => {
  const base='public/assets/atlas/mexico-water-v1/',metadata=JSON.parse(fs.readFileSync(base+'precipitation.source.json','utf8'));
  const bytes=fs.readFileSync(base+'precipitation.geojson'),data=validateMexicoWaterCollection(JSON.parse(bytes),'precipitation');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),metadata.asset.sha256);
  assert.equal(data.features.length,492);assert.equal(data.features.length,metadata.featureCount);
  assert.deepEqual([...new Set(data.features.map(f=>f.properties.value))].sort((a,b)=>a-b),metadata.levels);
  assert.equal(metadata.edition,2006);assert.equal(metadata.observedPeriod,null);assert.equal(metadata.transform.ballparkAllowed,false);
  assert.ok(data.features.every(f=>f.geometry.type==='LineString'||f.geometry.type==='MultiLineString'));
  assert.ok(data.features.every(f=>f.properties.unit==='mm/year'&&f.properties.observedPeriod===null));
});
test('Contour level grouping preserves separate original segments and returns the actual closest original ID', () => {
  const contour=(id,level,points)=>({...line(id),properties:{id,elevationM:level,name:`${level} m`},geometry:{type:'LineString',coordinates:points}});
  const features=[contour('500-a',500,[[0,0],[10,0]]),contour('500-b',500,[[0,10],[10,10]]),contour('1000-a',1000,[[20,20],[30,20]])];
  const groups=mexicoContourGroups(features);assert.equal(groups.size,2);assert.deepEqual(groups.get(500),features.slice(0,2));
  assert.equal(closestMexicoContour(groups.get(500),[5,9],p=>p).properties.id,'500-b');
  assert.equal(closestMexicoContour(groups.get(500),[5,1],p=>p).properties.id,'500-a');
  assert.deepEqual(features[0].geometry.coordinates,[[0,0],[10,0]],'Grouping does not add a connector between separate contours');
});

const bundle = await build({stdin:{contents:"import {initMexicoHydrology} from './src/scripts/atlas-mexico-hydrology.ts';window.initTestWater=initMexicoHydrology;",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'browser',format:'iife',write:false});
const waitFor = async fn => {for(let attempt=0;attempt<100;attempt++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.ok(fn(),'Water controller settled');};
function setup() {
  const window = new Window({url:'https://example.test/nature/?category=precipitation&view=relief&waterBase=relief',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  window.document.write(`<article data-mexico-workspace><svg><g data-mexico-nature-neutral></g><g data-mexico-nature-vector><g data-mexico-nature-layer="climate"></g><g data-mexico-nature-layer="relief"></g></g><g data-mexico-nature-static></g><g data-mexico-hydrology-overlay></g></svg><label><select data-mexico-nature-item-select></select></label><div data-mexico-hydrology-controls><select data-mexico-hydrology-item></select><select data-mexico-hydrology-base><option>plain</option><option>climate</option><option>relief</option></select></div><ul data-mexico-hydrology-legend></ul><div data-mexico-hydrology-reading><h2 data-mexico-hydrology-title></h2><p data-mexico-hydrology-lead></p><p data-mexico-hydrology-status></p><button data-mexico-hydrology-retry></button><p data-mexico-hydrology-value></p><p data-mexico-hydrology-definition></p><p data-mexico-hydrology-limitations></p><div data-mexico-hydrology-source></div></div><p data-mexico-nature-map-title></p><p data-mexico-nature-map-edition></p><p data-mexico-nature-period></p></article>`);
  const nativeKey=window.document.createElement('div');nativeKey.setAttribute('data-native-key-test','');nativeKey.innerHTML='<ul data-mexico-nature-legend="climate"><li>6気候群</li></ul><ul data-mexico-nature-legend="relief"><li>15地形地域＋欠測</li></ul>';window.document.querySelector('article').append(nativeKey);
  const backgroundKey=window.document.createElement('div');backgroundKey.setAttribute('data-mexico-hydrology-base-key-host','');window.document.querySelector('[data-mexico-hydrology-reading]').append(backgroundKey);
  window.eval(bundle.outputFiles[0].text);
  return window;
}
test('Real overlay click, Enter, background selection and popstate restore do not clear comparison; failed fetch retries', async () => {
  const window=setup(),root=window.document.querySelector('article'); let fail=true,requests=0;
  const manifest={layers:{precipitation:{file:'rain.json',publisher:'INEGI',edition:2006,unit:'mm/年',legend:[{label:'等雨量線（mm/年）',color:'#397f9a'}]},contours:{file:'contours.json',publisher:'NOAA',edition:2022,displayIntervalM:500,unit:'m'}}};
  window.fetch=async url=>{requests++;if(String(url).endsWith('manifest.json'))return {ok:true,json:async()=>manifest};if(fail)throw new Error('fixture outage');return {ok:true,json:async()=>String(url).endsWith('rain.json')?collection([line('rain-1000'),line('rain-2500',2500)]):collection([{...line('contours-500-1'),properties:{id:'contours-500-1',name:'500 m',elevationM:500,unit:'m'}}])};};
  let state={category:'precipitation',view:'relief',fallback:true,compare:'irrigation',sourceState:'25',state:'10'};
  let controller,commits=0;const commit=()=>{commits++;window.history.pushState(null,'',controller.url(new URL(window.location.href)));controller.render();};
  controller=window.initTestWater(root,'/data/',()=>state,commit);controller.render();
  try{
    await waitFor(()=>!root.querySelector('[data-mexico-hydrology-retry]').hidden);
    assert.equal(root.querySelector('[data-mexico-hydrology-overlay]').querySelectorAll('path').length,0);
    fail=false;root.querySelector('[data-mexico-hydrology-retry]').click();
    await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');
    assert.equal(root.querySelector('[data-mexico-hydrology-base-key-host] [data-mexico-nature-legend="relief"]').hidden,false);
    const feature=root.querySelector('[data-mexico-water-feature="precipitation:rain-1000"]');feature.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
    await waitFor(()=>root.querySelector('[data-mexico-hydrology-title]').textContent==='1000 mm/年');
    assert.equal(feature.getAttribute('fill'),'none');assert.match(window.location.search,/waterFeature=precipitation%3Arain-1000/);
    assert.equal(state.compare,'irrigation');assert.equal(state.sourceState,'25');assert.equal(state.state,'10');
    assert.equal(root.querySelector('[data-mexico-nature-static]').style.display,'none','Water overlay is not replaced by a raster fallback');
    feature.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.ok(commits>=2);
    const base=root.querySelector('[data-mexico-hydrology-base]');base.value='plain';base.dispatchEvent(new window.Event('change'));assert.equal(root.dataset.mexicoWaterBase,'plain');
    state={...state,category:'elevation'};controller.render();await waitFor(()=>!!root.querySelector('[data-mexico-water-feature="contours:contours-500-1"]'));
    window.history.replaceState(null,'','?category=precipitation&waterFeature=precipitation:rain-2500&waterBase=climate');state={...state,category:'precipitation'};controller.read();controller.render();
    await waitFor(()=>root.querySelector('[data-mexico-hydrology-title]').textContent==='2500 mm/年');assert.equal(root.dataset.mexicoWaterBase,'climate');
    assert.equal(root.querySelectorAll('[data-mexico-water-feature="precipitation:rain-2500"]').length,1);assert.ok(requests>=4);
    state={...state,category:'',view:'relief',fallback:false};controller.render();
    assert.equal(root.querySelectorAll('[data-mexico-nature-legend="relief"]').length,1);assert.equal(root.querySelector('[data-native-key-test] [data-mexico-nature-legend="relief"]').hidden,false);
    assert.equal(root.querySelector('[data-mexico-hydrology-overlay]').style.display,'none');
  }finally{await window.happyDOM.close();}
});
test('A late rainfall response cannot replace a newly selected contour layer or its period and legend', async () => {
  const window=setup(),root=window.document.querySelector('article');let release;
  const pending=new Promise(resolve=>{release=resolve});
  window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{precipitation:{file:'rain.json',publisher:'INEGI',edition:2006},contours:{file:'contours.json',publisher:'NOAA',edition:2022,displayIntervalM:500}}}:String(url).endsWith('rain.json')?pending:collection([{...line('contours-1000-1'),properties:{id:'contours-1000-1',name:'1000 m',elevationM:1000}}])});
  let state={category:'precipitation',view:'climate',fallback:false};const controller=window.initTestWater(root,'/data/',()=>state,()=>{});
  try{
    controller.render();await new Promise(resolve=>setTimeout(resolve,10));state={...state,category:'elevation'};controller.render();
    await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');release(collection([line('rain-old')]));await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(root.querySelector('[data-mexico-nature-map-title]').textContent,'標高・等高線の分布');assert.match(root.querySelector('[data-mexico-nature-period]').textContent,/NOAA.*2022/);
    assert.equal(root.querySelector('[data-mexico-hydrology-overlay]').querySelectorAll('[data-mexico-hydrology-layer="precipitation"] path').length,0);
  }finally{await window.happyDOM.close();}
});
test('HTTP 200 malformed geometry is discarded so Retry obtains the corrected original layer', async () => {
  const window=setup(),root=window.document.querySelector('article');let reads=0;
  window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{precipitation:{file:'rain.json',publisher:'INEGI',edition:2006}}}:++reads===1?collection([line('duplicated'),line('duplicated')]):collection([line('corrected')])});
  const state={category:'precipitation',view:'climate',fallback:false},controller=window.initTestWater(root,'/data/',()=>state,()=>{});
  try{
    controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='false');
    root.querySelector('[data-mexico-hydrology-retry]').click();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');
    assert.equal(reads,2);assert.equal(root.querySelectorAll('[data-mexico-water-feature="precipitation:corrected"]').length,1);
  }finally{await window.happyDOM.close();}
});
