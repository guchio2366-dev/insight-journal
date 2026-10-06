import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {readMexicoWaterSelection,writeMexicoWaterSelection,validateMexicoWaterCollection,mexicoWaterFeatureFill,mexicoWaterFeatureStroke,mexicoWaterUnit,mexicoWaterSourceText,mexicoWaterLineLabels,mexicoWaterLayersForCategory,mexicoContourGroups,closestMexicoContour,mexicoPrecipitationKeys,mexicoPrecipitationKey,mexicoBasinKeys,mexicoBasinContains,mexicoBasinLabelPoint,mexicoBasinLabels} from '../../src/lib/atlas-mexico-hydrology.ts';
import {precipitationBands} from '../../src/data/atlas/water-resources.ts';
import {readMexicoNatureState,writeMexicoNatureState,mexicoNatureReturnUrl} from '../../src/lib/atlas-mexico-nature.ts';

const line = (id, value = 1000) => ({type:'Feature', properties:{id,name:`${value} mm/年`,value,unit:'mm/年'},geometry:{type:'LineString',coordinates:[[-105,25],[-102,24],[-100,22]]}});
const collection = features => ({type:'FeatureCollection',features});
const bundle = await build({stdin:{contents:"import {initMexicoHydrology} from './src/scripts/atlas-mexico-hydrology.ts';import {projectLonLat} from './src/lib/atlas-mexico-geometry.ts';window.initTestWater=initMexicoHydrology;window.testMexicoProject=projectLonLat;",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'browser',format:'iife',write:false});
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
  assert.throws(()=>validateMexicoWaterCollection(collection([{...line('fake-rain-zone'),geometry:{type:'Polygon',coordinates:[[[-105,25],[-102,25],[-102,22],[-105,25]]]}}]),'precipitation'),/等雨量線/);
  assert.deepEqual(mexicoWaterLayersForCategory('rivers-groundwater'),['groundwater','rivers']);
});
test('Mexican real isohyet strokes share all seven US thresholds and colors, without generating areas or losing the 19 original values',()=>{
  assert.deepEqual(mexicoPrecipitationKeys.map(({id,label,color})=>({id,title:label,color})),precipitationBands.map(({id,title,color})=>({id,title,color})));
  const edges=[0,249,250,499,500,749,750,999,1000,1499,1500,1999,2000,4500];
  assert.deepEqual(edges.map(value=>mexicoPrecipitationKey(value)?.id),['lt250','lt250','250-500','250-500','500-750','500-750','750-1000','750-1000','1000-1500','1000-1500','1500-2000','1500-2000','gte2000','gte2000']);
  assert.equal(mexicoPrecipitationKey(NaN),undefined);assert.equal(mexicoPrecipitationKey(-1),undefined);
  const source=JSON.parse(fs.readFileSync('public/assets/atlas/mexico-water-v1/precipitation.source.json','utf8'));
  assert.deepEqual(source.legend,mexicoPrecipitationKeys);assert.deepEqual(source.displayEncoding.majorSourceValuesMm,[1000,1500]);
  assert.deepEqual(source.displayEncoding.thresholdsMm,[250,500,750,1000,1500,2000]);
  const features=JSON.parse(fs.readFileSync('public/assets/atlas/mexico-water-v1/precipitation.geojson','utf8')).features;
  for(const feature of features){assert.equal(mexicoWaterFeatureFill(feature,'precipitation',source),'none');assert.equal(mexicoWaterFeatureStroke(feature,'precipitation',source),mexicoPrecipitationKey(feature.properties.value).color);}
  assert.equal(features.length,492);assert.equal(new Set(features.map(feature=>feature.properties.value)).size,19);
});
test('Basin label anchors stay inside their original source polygon, avoid holes and expose source names with the selected basin first',async()=>{
  const window=setup(),projectLonLat=window.testMexicoProject;
  try {
  const feature={type:'Feature',properties:{id:'hole-test',sourceName:'SOURCE BASIN',basinType:'ENDORREICA'},geometry:{type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[7,3],[7,7],[3,7],[3,3]]]}};
  const point=mexicoBasinLabelPoint(feature);assert.ok(point);assert.equal(mexicoBasinContains(feature,point),true);assert.equal(mexicoBasinContains(feature,[5,5]),false);
  assert.equal(mexicoWaterFeatureFill(feature,'basins',{}),mexicoBasinKeys.find(key=>key.id==='ENDORREICA').color);
  const features=JSON.parse(fs.readFileSync('public/assets/atlas/mexico-water-v1/basins.geojson','utf8')).features,anchors=new Map();
  const labels=mexicoBasinLabels(features,anchors,projectLonLat,[0,0,900,580],13,'basin-RH10G',[[0,0,100,60]]);
  assert.ok(labels.length>2);assert.equal(labels[0].id,'basin-RH10G');assert.equal(labels[0].text,'R. FUERTE');
  for(const label of labels){const original=features.find(feature=>feature.properties.id===label.id);assert.equal(mexicoBasinContains(original,label.point),true);assert.equal(label.text,original.properties.sourceName);}
  for(const feature of features){const point=mexicoBasinLabelPoint(feature);if(point)assert.equal(mexicoBasinContains(feature,point),true,feature.properties.id);}
  for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++){const x=labels[a].box,y=labels[b].box;assert.ok(!(x[0]<y[0]+y[2]&&x[0]+x[2]>y[0]&&x[1]<y[1]+y[3]&&x[1]+x[3]>y[1]));}
  assert.deepEqual(mexicoBasinLabels(features,anchors,projectLonLat,[1000,1000,40,40],13),[]);
  } finally {await window.happyDOM.close();}
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
test('Actual class strokes match river keys, basin boundary keys use line color, and source units are localized without inventing dates',()=>{
  const metadata={file:'rivers.json',unit:'subbasin Strahler order',legend:[{id:'rivers-order-7',label:'小流域内次数7',color:'#0284c7'},{id:'rivers-order-8',label:'小流域内次数8',color:'#0369a1'}]};
  assert.equal(mexicoWaterFeatureStroke({...line('order-8'),properties:{id:'order-8',classId:'rivers-order-8'}},'rivers',metadata),'#0369a1');
  assert.equal(mexicoWaterFeatureStroke(line('basin'),'basins',{file:'basins.json',legend:[{label:'国内流域界',color:'#0e7490'}]}),'#0e7490');
  assert.equal(mexicoWaterUnit(metadata),'小流域内Strahler次数');assert.equal(mexicoWaterUnit({file:'contours.json',unit:'m',verticalDatum:'EGM2008 geoid'}),'m（EGM2008）');
  assert.match(mexicoWaterSourceText({id:'precipitation',file:'rain.json',publisher:'INEGI',unit:'mm/year',edition:2006,observedPeriod:null}),/2006刊行版.*観測期間との対応未確認.*mm\/年/);
});
test('Number labels retain real source vertices and values and omit anchors that collide with labels, controls or the camera edge',()=>{
  const features=[{...line('rain-100',100),geometry:{type:'LineString',coordinates:[[50,50],[100,100],[150,150]]}},{...line('rain-500',500),geometry:{type:'LineString',coordinates:[[60,50],[100,100],[180,160]]}},{...line('rain-1000',1000),geometry:{type:'LineString',coordinates:[[250,200],[300,250],[350,300]]}}];
  const labels=mexicoWaterLineLabels(features,[100,500,1000],p=>p,[0,0,400,350],13,'mm',[[80,80,50,50]]);
  assert.ok(labels.length>=1);for(const label of labels){const feature=features.find(feature=>feature.properties.id===label.id);assert.equal(label.value,feature.properties.value);assert.ok(feature.geometry.coordinates.some(point=>point[0]===label.point[0]&&point[1]===label.point[1]));assert.ok(label.box[0]>=3&&label.box[1]>=3&&label.box[0]+label.box[2]<=397&&label.box[1]+label.box[3]<=347);assert.ok(!(label.box[0]<130&&label.box[0]+label.box[2]>80&&label.box[1]<130&&label.box[1]+label.box[3]>80));}
  for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++){const x=labels[a].box,y=labels[b].box;assert.ok(!(x[0]<y[0]+y[2]&&x[0]+x[2]>y[0]&&x[1]<y[1]+y[3]&&x[1]+x[3]>y[1]));}
});

const waitFor = async fn => {for(let attempt=0;attempt<100;attempt++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.ok(fn(),'Water controller settled');};
function setup() {
  const window = new Window({url:'https://example.test/nature/?category=precipitation&view=relief&waterBase=relief',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  window.document.write(`<article data-mexico-workspace><svg><g data-mexico-nature-neutral></g><g data-mexico-nature-vector><g data-mexico-nature-layer="climate"></g><g data-mexico-nature-layer="relief"></g></g><g data-mexico-nature-static></g><g data-mexico-hydrology-overlay></g></svg><label><select data-mexico-nature-item-select></select></label><div data-mexico-hydrology-controls><select data-mexico-hydrology-item></select><select data-mexico-hydrology-base><option>plain</option><option>climate</option><option>relief</option></select></div><ul data-mexico-hydrology-legend></ul><div data-mexico-hydrology-reading><h2 data-mexico-hydrology-title></h2><p data-mexico-hydrology-lead></p><p data-mexico-hydrology-status></p><button data-mexico-hydrology-retry></button><p data-mexico-hydrology-value></p><p data-mexico-hydrology-definition></p><p data-mexico-hydrology-limitations></p><div data-mexico-hydrology-source></div></div><p data-mexico-nature-map-title></p><p data-mexico-nature-map-edition></p><p data-mexico-nature-period></p></article>`);
  const nativeKey=window.document.createElement('div');nativeKey.setAttribute('data-native-key-test','');nativeKey.innerHTML='<ul data-mexico-nature-legend="climate"><li>6気候群</li></ul><ul data-mexico-nature-legend="relief"><li>15地形地域＋欠測</li></ul>';window.document.querySelector('article').append(nativeKey);
  const backgroundKey=window.document.createElement('div');backgroundKey.setAttribute('data-mexico-hydrology-base-key-host','');window.document.querySelector('[data-mexico-hydrology-reading]').append(backgroundKey);
  const reliefBackground=window.document.createElementNS('http://www.w3.org/2000/svg','g');reliefBackground.setAttribute('data-mexico-nature-relief-background','');window.document.querySelector('[data-mexico-nature-neutral]').after(reliefBackground);
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
test('Changing to an unavailable subject clears the previous values, limitations, source links and picker',async()=>{
  const window=setup(),root=window.document.querySelector('article');let state={category:'precipitation',view:'climate',fallback:false};
  window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{precipitation:{id:'precipitation',file:'rain.json',publisher:'INEGI',edition:2006,unit:'mm/year'}}}:collection([line('rain-current')])});
  const controller=window.initTestWater(root,'/data/',()=>state,()=>{});try{controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');assert.match(root.querySelector('[data-mexico-hydrology-limitations]').textContent,/関連2005.*1921〜1975.*対応は未確認/);assert.ok(root.querySelector('[data-mexico-hydrology-source]').textContent);state={...state,category:'rivers-groundwater'};controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='false');for(const selector of ['[data-mexico-hydrology-value]','[data-mexico-hydrology-definition]','[data-mexico-hydrology-limitations]','[data-mexico-hydrology-source]'])assert.equal(root.querySelector(selector).textContent,'');assert.equal(root.querySelector('[data-mexico-hydrology-item]').options.length,0);assert.equal(root.querySelector('[data-mexico-hydrology-retry]').hidden,false);}finally{await window.happyDOM.close();}
});
test('Selecting a river in the basin overlay describes the river class and generated class ID instead of a catchment',async()=>{
  const window=setup(),root=window.document.querySelector('article'),state={category:'basins',view:'climate',fallback:false};
  const basin={type:'Feature',properties:{id:'RH01A',name:'原国内流域'},geometry:{type:'Polygon',coordinates:[[[-105,25],[-102,25],[-102,22],[-105,25]]]}};
  const river={...line('rivers-order-7'),properties:{id:'rivers-order-7',classId:'rivers-order-7',name:'小流域内Strahler次数7',sourceIds:['original-segment-1']}};
  window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{basins:{file:'basins.json',publisher:'INEGI'},rivers:{file:'rivers.json',publisher:'INEGI',unit:'subbasin Strahler order',legend:[{id:'rivers-order-7',label:'小流域内Strahler次数7',color:'#0284c7'}]}}}:collection([String(url).endsWith('basins.json')?basin:river])});
  let controller;controller=window.initTestWater(root,'/data/',()=>state,()=>controller.render());try{state.category='rivers-groundwater';controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');state.category='basins';controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');assert.deepEqual([...root.querySelector('[data-mexico-hydrology-overlay]').children].map(group=>group.dataset.mexicoHydrologyLayer),['basins','rivers'],'River strokes stay above basin fills after a same-page category switch');root.querySelector('[data-mexico-water-feature="rivers:rivers-order-7"]').dispatchEvent(new window.MouseEvent('click'));await waitFor(()=>root.querySelector('[data-mexico-hydrology-value]').textContent.includes('配信分類ID'));assert.match(root.querySelector('[data-mexico-hydrology-definition]').textContent,/間欠・仮想流.*Strahler次数/);assert.doesNotMatch(root.querySelector('[data-mexico-hydrology-definition]').textContent,/集水域の区分/);assert.match(root.querySelector('[data-mexico-hydrology-limitations]').textContent,/次数7以上/);assert.doesNotMatch(root.querySelector('[data-mexico-hydrology-value]').textContent,/原ID：rivers-order/);assert.match(root.querySelector('[data-mexico-nature-period]').textContent,/国内158流域.*国外上流域は未収録.*小流域内：同じ次数の合流で\+1/);assert.match(root.querySelector('[data-mexico-nature-map-edition]').textContent,/版\/期未確認/);assert.equal(root.querySelectorAll('[data-mexico-water-feature="rivers:rivers-order-7"]').length,1);}finally{await window.happyDOM.close();}
});
test('Map resize recalculates physical label size without fetching again or duplicating original line paths',async()=>{
  const window=setup(),root=window.document.querySelector('article'),svg=root.querySelector('svg');svg.setAttribute('data-mexico-nature-main-map','');svg.setAttribute('viewBox','0 0 900 580');let width=645,callback,fetches=0;
  Object.defineProperty(svg,'clientWidth',{get:()=>width});window.ResizeObserver=class{constructor(fn){callback=fn}observe(){}};
  window.fetch=async url=>{fetches++;return{ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{precipitation:{file:'rain.json',publisher:'INEGI',unit:'mm/year'}}}:collection([line('real-1000')])}};
  const state={category:'precipitation',view:'climate',fallback:false},controller=window.initTestWater(root,'/data/',()=>state,()=>{});try{controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');const label=root.querySelector('[data-source-value="1000"]');assert.ok(label);const count=fetches;assert.ok(Math.abs(Number(label.getAttribute('font-size'))*width/900-13)<.001);width=322.5;callback();await waitFor(()=>Number(root.querySelector('[data-source-value="1000"]').getAttribute('font-size'))>30);assert.ok(Math.abs(Number(root.querySelector('[data-source-value="1000"]').getAttribute('font-size'))*width/900-13)<.001);assert.equal(fetches,count);assert.equal(root.querySelectorAll('[data-mexico-water-feature="precipitation:real-1000"]').length,1);}finally{await window.happyDOM.close();}
});

test('Native and hydrology relief share the neutral land and terrain backdrop, while legacy fallback URLs keep live SVG and exact source-return flags',async()=>{
  const window=setup(),root=window.document.querySelector('article'),svg=root.querySelector('svg');svg.setAttribute('data-mexico-nature-main-map','');
  window.history.replaceState(null,'','?category=precipitation&view=climate&waterBase=relief&fallback=1&compare=irrigation&from=agriculture&sourceMetric=maize&sourceFallback=1&sourceOnlyItem=1');
  const state={category:'precipitation',view:'climate',fallback:true,compare:'irrigation'},layer=view=>root.querySelector(`[data-mexico-nature-layer="${view}"]`);
  window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{precipitation:{file:'rain.json',publisher:'INEGI'}}}:collection([line('rain-1000')])});
  let controller;controller=window.initTestWater(root,'/data/',()=>state,()=>{window.history.pushState(null,'',controller.url(new URL(window.location.href)));controller.render();});
  try{controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');
    assert.equal(root.querySelector('[data-mexico-nature-neutral]').style.display,'');assert.equal(root.querySelector('[data-mexico-nature-relief-background]').style.display,'');assert.equal(layer('relief').style.display,'');assert.equal(layer('climate').style.display,'none');
    assert.equal(root.querySelector('[data-mexico-nature-vector]').style.display,'');assert.equal(root.querySelector('[data-mexico-nature-static]').style.display,'none');
    const select=root.querySelector('[data-mexico-hydrology-base]');select.value='climate';select.dispatchEvent(new window.Event('change'));await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');
    assert.equal(root.querySelector('[data-mexico-nature-neutral]').style.display,'none');assert.equal(root.querySelector('[data-mexico-nature-relief-background]').style.display,'none');assert.equal(layer('climate').style.display,'');
    for(const [key,value] of [['fallback','1'],['sourceFallback','1'],['sourceMetric','maize'],['sourceOnlyItem','1']])assert.equal(new URL(window.location.href).searchParams.get(key),value);
    state.category='';state.view='relief';controller.render();assert.equal(root.querySelector('[data-mexico-nature-neutral]').style.display,'');assert.equal(root.querySelector('[data-mexico-nature-relief-background]').style.display,'');assert.equal(layer('relief').style.display,'');assert.equal(svg.dataset.mexicoNatureMapMode,'interactive');
    state.view='climate';controller.render();assert.equal(root.querySelector('[data-mexico-nature-relief-background]').style.display,'none');assert.equal(layer('climate').style.display,'');assert.equal(root.querySelector('[data-mexico-nature-static]').style.display,'none');
    state.category='precipitation';select.value='plain';select.dispatchEvent(new window.Event('change'));await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');assert.equal(root.querySelector('[data-mexico-nature-neutral]').style.display,'');assert.equal(root.querySelector('[data-mexico-nature-relief-background]').style.display,'none');assert.equal(layer('climate').style.display,'none');assert.equal(layer('relief').style.display,'none');
  }finally{await window.happyDOM.close();}
});

test('The seven-color isohyet legend and 1000/1500 major source lines match on the live SVG and do not add missing US boundary lines',async()=>{
  const window=setup(),root=window.document.querySelector('article');
  const features=[100,300,500,800,1000,1500,2000,4500].map(value=>line(`rain-${value}`,value));
  window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{precipitation:{id:'precipitation',file:'rain.json',publisher:'INEGI',edition:2006,unit:'mm/year'}}}:collection(features)});
  const controller=window.initTestWater(root,'/data/',()=>({category:'precipitation',view:'climate',fallback:false}),()=>{});
  try{controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');
    const keys=[...root.querySelectorAll('[data-mexico-hydrology-legend] li')];
    assert.deepEqual(keys.slice(0,7).map(key=>key.textContent),mexicoPrecipitationKeys.map(key=>key.label));
    assert.ok(keys.slice(0,7).every(key=>key.querySelector('i').classList.contains('is-line')));
    for(const feature of features){const path=root.querySelector(`[data-mexico-water-feature="precipitation:${feature.properties.id}"]`);assert.equal(path.style.getPropertyValue('--mexico-water-stroke'),mexicoPrecipitationKey(feature.properties.value).color);assert.equal(path.classList.contains('is-major-line'),[1000,1500].includes(feature.properties.value));}
    assert.equal(root.querySelectorAll('[data-mexico-water-feature]').length,features.length);
    assert.match(root.querySelector('[data-mexico-nature-period]').textContent,/2006刊行版.*観測期間との対応未確認.*実線/);
    assert.match(root.querySelector('[data-mexico-hydrology-limitations]').textContent,/取水源・灌漑量・用水路の接続は特定できません/);
  }finally{await window.happyDOM.close();}
});

test('A source basin name is selectable by click and keyboard while its original ID, drainage type, crop comparison and exact source URL state are preserved',async()=>{
  const window=setup(),root=window.document.querySelector('article');
  const originalUrl=new URL('https://example.test/nature/?view=relief&category=basins&state=10&feature=relief-17&item=III&frame=210,100,350,220&compare=irrigation&from=agriculture&sourceState=25&sourceMetric=maize&sourceCrops=1&sourceLivestock=0&sourceOnlyItem=1&waterBase=relief');
  window.history.replaceState(null,'',originalUrl);
  const basin=JSON.parse(fs.readFileSync('public/assets/atlas/mexico-water-v1/basins.geojson','utf8')).features.find(feature=>feature.properties.id==='basin-RH10G');
  const state=readMexicoNatureState(originalUrl,['10','25']);state.frame=null;
  window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{basins:{file:'basins.json',publisher:'INEGI'}}}:collection([basin])});
  let controller;controller=window.initTestWater(root,'/data/',()=>state,()=>{window.history.pushState(null,'',controller.url(new URL(window.location.href)));controller.render();});
  try{controller.render();await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');
    const label=root.querySelector('[data-mexico-basin-label="basin-RH10G"]');assert.ok(label);assert.equal(label.textContent,'R. FUERTE');assert.equal(mexicoBasinContains(basin,JSON.parse(label.dataset.sourceLonlat)),true);
    label.dispatchEvent(new window.MouseEvent('click'));await waitFor(()=>root.querySelector('[data-mexico-hydrology-value]').textContent.includes('原ID：RH10G'));
    assert.match(root.querySelector('[data-mexico-hydrology-definition]').textContent,/外流域.*EXORREICA/);
    let selectedUrl=new URL(window.location.href);assert.equal(selectedUrl.searchParams.get('waterFeature'),'basins:basin-RH10G');
    for(const [key,value] of originalUrl.searchParams)assert.equal(selectedUrl.searchParams.get(key),value,`${key} preserved`);
    const keyboardLabel=root.querySelector('[data-mexico-basin-label="basin-RH10G"]'),focusCalls=[];
    // Happy DOM does not track SVG text focus; supply that browser boundary and inspect the replacement node.
    Object.defineProperty(window.document,'activeElement',{configurable:true,get:()=>keyboardLabel});
    window.SVGElement.prototype.focus=function(options){focusCalls.push({node:this,options});};
    keyboardLabel.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');
    assert.equal(focusCalls.at(-1)?.node,root.querySelector('[data-mexico-basin-label="basin-RH10G"]'));assert.equal(focusCalls.at(-1)?.options.preventScroll,true);
    assert.equal(new URL(window.location.href).searchParams.get('waterFeature'),'basins:basin-RH10G');
    assert.match(root.querySelector('[data-mexico-hydrology-limitations]').textContent,/国外の上流域.*全流域ではありません.*取水源/);
  }finally{await window.happyDOM.close();}
});
