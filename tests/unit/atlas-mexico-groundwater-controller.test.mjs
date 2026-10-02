import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {mexicoGroundwaterClassIds,readMexicoWaterSelection,writeMexicoWaterSelection,mexicoGroundwaterDefinition} from '../../src/lib/atlas-mexico-hydrology.ts';
import {readMexicoNatureState,writeMexicoNatureState} from '../../src/lib/atlas-mexico-nature.ts';

const published=JSON.parse(fs.readFileSync('public/assets/atlas/mexico-groundwater-v1/manifest.json','utf8')).layers.groundwater;
const groundwater={...published,classFiles:Object.fromEntries(mexicoGroundwaterClassIds.map(id=>[id,{...published.classFiles[id],file:`${id}.json`}]))};
const feature=id=>({type:'Feature',id,properties:{id,classId:id,name:published.classFiles[id].fullLabel,material:published.classFiles[id].material,measure:published.classFiles[id].measure},geometry:{type:'MultiPolygon',coordinates:[[[[-103,23],[-102,23],[-102,24],[-103,24],[-103,23]]]]}});
const collection=features=>({type:'FeatureCollection',features});
const riverKeys=[7,8,9].map((order,index)=>({id:`rivers-order-${order}`,label:`次数${order}`,color:['#0284c7','#0369a1','#075985'][index]}));
const river=collection(riverKeys.map(key=>({type:'Feature',properties:{id:key.id,classId:key.id,name:`小流域内${key.label}`},geometry:{type:'LineString',coordinates:[[-103,23],[-102,24]]}})));
const bundle=await build({stdin:{contents:"import {initMexicoHydrology} from './src/scripts/atlas-mexico-hydrology.ts';window.initWater=initMexicoHydrology;",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'iife',platform:'browser',write:false});
const waitFor=async fn=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.ok(fn(),'groundwater settled');};
function setup(query=''){
 const window=new Window({url:`https://example.test/nature/?category=rivers-groundwater&state=25${query}`,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.write(`<article><svg data-mexico-nature-main-map viewBox="0 0 900 580"><title id="mexico-nature-map-title"></title><desc id="mexico-nature-map-desc"></desc><g data-mexico-nature-neutral></g><g data-mexico-nature-vector><g data-mexico-nature-layer="climate"></g><g data-mexico-nature-layer="relief"></g></g><g data-mexico-nature-static></g><g data-mexico-hydrology-overlay></g></svg><label><select data-mexico-nature-item-select></select></label><div data-mexico-hydrology-controls><select data-mexico-hydrology-item></select><select data-mexico-hydrology-base><option>plain</option><option>climate</option><option>relief</option></select></div><div data-mexico-groundwater-controls><select data-mexico-groundwater-class><option value="all">全国</option></select></div><aside class="mexico-reading"><ul data-mexico-hydrology-legend></ul><p data-mexico-nature-period></p><p data-mexico-nature-map-title></p><p data-mexico-nature-map-edition></p><span data-mexico-nature-selected-name>シナロア</span><section data-mexico-hydrology-reading><h2 data-mexico-hydrology-title></h2><p data-mexico-hydrology-lead></p><p data-mexico-hydrology-status></p><button data-mexico-hydrology-retry></button><div data-mexico-hydrology-body><p data-mexico-hydrology-value></p><p data-mexico-hydrology-definition></p><p data-mexico-hydrology-limitations></p><div data-mexico-hydrology-source></div></div></section></aside><p data-mexico-hydrology-picker-note></p></article>`);
 window.ResizeObserver=undefined;window.eval(bundle.outputFiles[0].text);
 const root=window.document.querySelector('article'),requests=[];
 let state={category:'rivers-groundwater',view:'climate',fallback:false,state:'25',compare:null};
 let classResponse=async id=>collection([feature(id)]);
 window.fetch=async url=>{const path=String(url);requests.push(path);return {ok:true,json:async()=>path==='/groundwater/manifest.json'?{layers:{groundwater}}:path==='/water/manifest.json'?{layers:{rivers:{file:'rivers.json',legend:riverKeys}}}:path==='/water/rivers.json'?river:classResponse(path.split('/').at(-1).replace('.json',''))};};
 let controller;controller=window.initWater(root,'/water/',()=>state,()=>{window.history.pushState(null,'',controller.url(new URL(window.location.href)));controller.render();},'/groundwater/');
 const renderOverview=async()=>{controller.render();await waitFor(()=>root.querySelector('[data-mexico-groundwater-overview]'));root.querySelector('[data-mexico-groundwater-overview]').dispatchEvent(new window.Event('load'));await waitFor(()=>root.dataset.mexicoHydrologyReady==='true');};
 const chooseClass=id=>{const select=root.querySelector('[data-mexico-groundwater-class]');select.value=id;select.dispatchEvent(new window.Event('change'));};
 return {window,root,requests,controller,renderOverview,chooseClass,setResponse:fn=>{classResponse=fn;},setState:next=>{state={...state,...next};}};
}

test('Groundwater class, native camera and original crop comparison remain separate; explicit all cannot revive a stale selected feature',()=>{
 const source=new URL('https://example.test/nature/?category=rivers-groundwater&state=10&frame=1,2,450,290&compare=irrigation&from=agriculture&sourceState=25&sourceMetric=cattle&sourceCrops=0&sourceLivestock=1&sourceOnlyItem=1&waterBase=relief&waterClass=groundwater-5PB&waterFeature=rivers:rivers-order-7');
 const native=readMexicoNatureState(source,['10','25']),state=readMexicoWaterSelection(source),restored=writeMexicoWaterSelection(writeMexicoNatureState(source,native),state);
 assert.equal(state.groundwaterClass,'groundwater-5PB');assert.equal(state.feature,'rivers:rivers-order-7');for(const [key,value] of source.searchParams)assert.equal(restored.searchParams.get(key),value,`${key} preserved`);
 const all=readMexicoWaterSelection(new URL('https://example.test/?waterClass=all&waterFeature=groundwater:groundwater-5PB'));
 assert.equal(all.feature,'');assert.equal(readMexicoWaterSelection(writeMexicoWaterSelection(new URL('https://example.test/'),all)).groundwaterClass??'all','all');
 const mismatch=readMexicoWaterSelection(new URL('https://example.test/?waterClass=groundwater-1A&waterFeature=groundwater:groundwater-5PB'));
 assert.equal(mismatch.groundwaterClass,'groundwater-1A');assert.equal(mismatch.feature,'');
 assert.match(mexicoGroundwaterDefinition(published.classFiles['groundwater-1A']),/井戸産出量.*L\/s.*実測値.*現在/);
 assert.match(mexicoGroundwaterDefinition(published.classFiles['groundwater-5PB']),/定性的.*ゼロ.*法定帯水層/);
 assert.doesNotMatch(mexicoGroundwaterDefinition(published.classFiles['groundwater-5PB']),/L\/s/);
});

test('National overview waits for its original image, downloads no class payload, and resize preserves all ten actual keys',async()=>{
 const f=setup();try{f.controller.render();await waitFor(()=>f.root.querySelector('[data-mexico-groundwater-overview]'));assert.equal(f.root.dataset.mexicoHydrologyReady,'loading');f.root.querySelector('[data-mexico-groundwater-overview]').dispatchEvent(new f.window.Event('load'));await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');
 assert.equal(f.requests.filter(path=>/groundwater-.*\.json$/.test(path)).length,0);assert.equal(f.root.querySelector('[data-mexico-groundwater-class]').options.length,11);
 assert.equal(f.root.querySelectorAll('[data-mexico-hydrology-legend] li').length,14);
 Object.defineProperty(f.root.querySelector('svg'),'clientWidth',{value:645,configurable:true});f.window.dispatchEvent(new f.window.Event('resize'));await new Promise(resolve=>setTimeout(resolve,40));
 assert.equal(f.root.querySelectorAll('[data-mexico-hydrology-legend] li').length,14);assert.match(f.root.querySelector('#mexico-nature-map-desc').textContent,/井戸産出量.*賦存可能性.*法定帯水層/);
 const metadata=f.root.querySelector('[data-mexico-hydrology-source] p a:last-child');assert.equal(metadata.getAttribute('href'),'/groundwater/manifest.json');assert.match(f.root.querySelector('[data-mexico-groundwater-notice]').textContent,/全10.*現在.*水がない/);
 }finally{await f.window.happyDOM.close();}
});

test('Choosing one class fetches only that payload; a feature-free class still describes its own national distribution and river choice preserves it',async()=>{
 const f=setup();try{await f.renderOverview();f.chooseClass('groundwater-5PB');await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');
 assert.deepEqual(f.requests.filter(path=>/groundwater-.*\.json$/.test(path)),['/groundwater/groundwater-5PB.json']);assert.equal(f.root.querySelectorAll('[data-mexico-hydrology-layer="groundwater"] path').length,1);assert.equal(f.root.querySelector('[data-mexico-water-feature="groundwater:groundwater-5PB"]').getAttribute('fill'),published.classFiles['groundwater-5PB'].color);
 const picker=f.root.querySelector('[data-mexico-hydrology-item]');picker.value='';picker.dispatchEvent(new f.window.Event('change'));await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');assert.match(f.root.querySelector('[data-mexico-hydrology-value]').textContent,/選択した分類の全国分布/);assert.doesNotMatch(f.root.querySelector('[data-mexico-hydrology-value]').textContent,/全10/);
 f.root.querySelector('[data-mexico-water-feature="rivers:rivers-order-7"]').dispatchEvent(new f.window.MouseEvent('click'));await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');assert.equal(new URL(f.window.location.href).searchParams.get('waterClass'),'groundwater-5PB');assert.match(f.root.querySelector('[data-mexico-hydrology-definition]').textContent,/Strahler/);
 f.window.history.pushState(null,'','?category=rivers-groundwater&state=25&waterClass=groundwater-5PB');f.controller.read();f.controller.render();await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');assert.match(f.root.querySelector('[data-mexico-hydrology-definition]').textContent,/定性的/);assert.doesNotMatch(f.root.querySelector('[data-mexico-hydrology-definition]').textContent,/Strahler/);
 }finally{await f.window.happyDOM.close();}
});

test('A late class cannot replace a newer class, and malformed HTTP-200 geometry is re-fetched on Retry',async()=>{
 const f=setup();try{await f.renderOverview();let release;f.setResponse(async id=>id==='groundwater-1A'?new Promise(resolve=>{release=resolve;}):collection([feature(id)]));f.chooseClass('groundwater-1A');await waitFor(()=>!!release);f.chooseClass('groundwater-6a');await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');release(collection([feature('groundwater-1A')]));await new Promise(resolve=>setTimeout(resolve,20));assert.equal(f.root.dataset.mexicoGroundwaterClass,'groundwater-6a');assert.equal(f.root.querySelector('[data-mexico-hydrology-layer="groundwater"]').dataset.groundwaterView,'groundwater-6a');assert.equal(f.root.querySelector('[data-mexico-water-feature="groundwater:groundwater-1A"]'),null);
 let attempts=0;f.setResponse(async id=>++attempts===1?collection([feature('groundwater-1A')]):collection([feature(id)]));f.chooseClass('groundwater-2M');await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='false');f.root.querySelector('[data-mexico-hydrology-retry]').click();await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');assert.equal(attempts,2);assert.ok(f.root.querySelector('[data-mexico-water-feature="groundwater:groundwater-2M"]'));
 }finally{await f.window.happyDOM.close();}
});
