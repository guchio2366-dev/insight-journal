import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

// Mock only WebGL's rendering boundary. The actual page, state codec, selectors,
// card logic and data loaders execute unchanged; browser layout is tested separately.
const stub=`export function setWorkerCount(){};export class Map {
 constructor(options){if(window.__failMap)throw Error('Test: WebGL unavailable');window.__map=this;this.options=options;this.layers={};this.events={};this.center={lng:-96,lat:38};this.zoom=3;this.sources=Object.fromEntries(Object.entries(options.style.sources).map(([id,s])=>[id,{data:s.data,setDataCalls:0,setData(d){this.data=d;this.setDataCalls++}}]));this.touchZoomRotate={disableRotation(){}};this.scrollZoom={disable(){}};this.cameraChanges=0;}
 addSource(id,s){this.sources[id]={data:s.data,setData(d){this.data=d}}}removeSource(id){delete this.sources[id]}addLayer(l){this.layers[l.id]=l}getLayer(id){return this.layers[id]}removeLayer(id){delete this.layers[id]}
 getSource(id){return this.sources[id]} getCenter(){return this.center} getZoom(){return this.zoom}
 getBounds(){return {getWest:()=>-128,getSouth:()=>22,getEast:()=>-64,getNorth:()=>52,contains:()=>true}}
 project(p){return {x:(p[0]+128)*10,y:(52-p[1])*10}} unproject(p){return {lng:p[0]/10-128,lat:52-p[1]/10}}
 setLayoutProperty(){}setPaintProperty(){}setFilter(){}addImage(){}resize(){}remove(){}queryRenderedFeatures(){return []}
 on(name,fn){(this.events[name]??=[]).push(fn)}once(name,fn){this.on(name,fn);if(name==='load')queueMicrotask(()=>fn())}
 jumpTo(o){this.cameraChanges++;this.center={lng:o.center[0],lat:o.center[1]};this.zoom=o.zoom??this.zoom}fitBounds(){this.cameraChanges++}
 zoomIn(){this.zoom++}zoomOut(){this.zoom--}getCanvas(){return {getContext:()=>null}}
}`;
const bundle=await build({entryPoints:['src/scripts/atlas-explorer.ts'],bundle:true,write:false,format:'iife',globalName:'NatureTest',plugins:[{name:'map-boundary',setup(b){b.onResolve({filter:/^maplibre-gl$/},()=>({path:'maplibre',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:stub,loader:'js'}));}}]});
const delay=()=>new Promise(resolve=>setTimeout(resolve,25));
async function waitFor(check,label){for(let attempt=0;attempt<120;attempt++){if(check())return;await delay();}throw new Error('Timed out: '+label);}
async function setup(query='',fail=false){
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/population/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 const html=await readFile('dist/atlas/north-america/population/index.html','utf8');
 window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
 window.ResizeObserver=class {observe(){}disconnect(){}};
 window.createImageBitmap=async()=>({width:1,height:1,close(){}});
 window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData:()=>({width:1,height:1,data:new Uint8ClampedArray([9,0,0,255])})});
 window.__failMap=fail;
 Object.defineProperty(window.HTMLElement.prototype,'clientWidth',{get(){return this.hasAttribute('data-map-frame')?800:0;}});
 Object.defineProperty(window.HTMLElement.prototype,'clientHeight',{get(){return this.hasAttribute('data-map-frame')?500:0;}});
 const requests=[];
 window.fetch=async (url)=>{requests.push(String(url));return new Response(await readFile('public/'+String(url).replace(/^.*?\/insight-journal\//,'')));};
 window.Blob=Blob;window.Response=Response;window.DecompressionStream=DecompressionStream;
 const entry=window.eval(bundle.outputFiles[0].text+"; NatureTest;");await entry.startAtlas();await waitFor(()=>window.document.querySelector('[data-pop-status]').textContent.includes('3,144'),'population ready').catch(error=>{console.log(window.document.querySelector('[data-pop-status]').textContent,requests,window.happyDOM.virtualConsolePrinter.readAsString());throw error;});await delay();
 return {window,requests,root:window.document.querySelector('[data-atlas-explorer]'),q:s=>window.document.querySelector(s)};
}


const change=(window,element,value)=>{element.value=value;element.dispatchEvent(new window.Event('change'));};
test('population selection keeps national statistics and shared camera; view changes are lazy',async()=>{
 const {window,q,requests}=await setup('?lng=-96&lat=38&z=5');
 try{const map=window.__map;await waitFor(()=>map.getLayer('population-fill'),'density map');const moves=map.cameraChanges,before=q('[data-pop-bars]').textContent;assert.ok(!requests.some(x=>x.includes('ethnicity.json')));change(window,q('[data-pop-state]'),'06');change(window,q('[data-pop-geo]'),'county:06037');assert.match(q('[data-pop-selected-title]').textContent,/Los Angeles/);assert.equal(q('[data-pop-bars]').textContent,before);q('[data-pop-view="ethnicity"]').click();await waitFor(()=>q('[data-pop-national-title]').textContent==='全国の人種・民族','ethnicity');change(window,q('[data-pop-ethnicity]'),'hispanic');await waitFor(()=>map.getLayer('population-fill'),'ethnicity map');assert.equal(window.__map,map);assert.equal(map.cameraChanges,moves);assert.equal(new URL(window.location.href).searchParams.get('popEthnicity'),'hispanic');q('a[data-field="industry"]').click();assert.equal(map.getLayer('population-fill'),undefined);q('a[data-field="population"]').click();await waitFor(()=>map.getLayer('population-fill'),'return population');assert.equal(window.__map,map);
 }finally{await window.happyDOM.close();}
});
test('three metros load on explicit selection, preserve suppressed values, and release sources',async()=>{
 const {window,q}=await setup();
 try{for(const code of ['35620','31080','19100']){change(window,q('[data-pop-metro]'),code);await waitFor(()=>window.__map.getLayer('population-city-outlines'),'metro outlines '+code);assert.ok(window.__map.getSource('population').data.features.length>1000);assert.ok(Object.keys(window.__map.sources).filter(x=>x.startsWith('population')).length<=2);if(code==='35620'){change(window,q('[data-pop-state]'),'36');change(window,q('[data-pop-geo]'),'tract:36103122406');assert.match(q('[data-pop-selected-note]').textContent,/errata 148/);}}q('a[data-field="agriculture"]').click();assert.equal(window.__map.getSource('population'),undefined);assert.equal(window.__map.getSource('population-outlines'),undefined);
 }finally{await window.happyDOM.close();}
});
test('without WebGL the thematic fallback, native selector, voting and honest religion state work',async()=>{
 const {window,q}=await setup('',true);
 try{assert.match(q('[data-fallback-image]').src,/density.webp/);change(window,q('[data-pop-state]'),'06');change(window,q('[data-pop-geo]'),'county:06037');assert.match(q('[data-pop-selected-value]').textContent,/人口/);q('[data-pop-view="vote"]').click();await waitFor(()=>q('[data-pop-national-title]').textContent==='全国の得票構成','vote');assert.match(q('[data-fallback-image]').src,/vote.webp/);q('[data-pop-view="religion"]').click();await waitFor(()=>q('[data-pop-national-title]').textContent==='全国の宗教構成','religion');assert.match(q('[data-pop-status]').textContent,/未取得/);assert.match(q('[data-fallback-image]').src,/religion.webp/);change(window,q('[data-pop-geo]'),'state:06');assert.match(q('[data-pop-selected-value]').textContent,/州別データ未取得/);
 }finally{await window.happyDOM.close();}
});

test('history restore synchronizes a selected county with its state picker',async()=>{
 const {window,q}=await setup();try{change(window,q('[data-pop-state]'),'06');change(window,q('[data-pop-geo]'),'county:06037');const url=new URL(window.location.href);url.searchParams.set('popGeo','county:36061');window.history.replaceState({},'',url);window.dispatchEvent(new window.PopStateEvent('popstate'));await waitFor(()=>q('[data-pop-selected-title]').textContent.includes('New York'),'restored county');assert.equal(q('[data-pop-state]').value,'36');assert.equal(q('[data-pop-geo]').value,'county:36061');}finally{await window.happyDOM.close();}
});
test('a late metro response cannot move the camera after a newer selection',async()=>{
 const {window,q}=await setup();let release;try{const fetch=window.fetch;window.fetch=async url=>{if(String(url).endsWith('metro-35620.json.gz'))await new Promise(resolve=>release=resolve);return fetch(url);};change(window,q('[data-pop-metro]'),'35620');await waitFor(()=>release,'NY request held');assert.equal(q('[data-pop-geo]').disabled,true);change(window,q('[data-pop-metro]'),'31080');await waitFor(()=>window.__map.getLayer('population-city-outlines'),'LA ready');const moves=window.__map.cameraChanges;release();await delay();assert.equal(window.__map.cameraChanges,moves);assert.equal(q('[data-pop-metro]').value,'31080');assert.equal(new URL(window.location.href).searchParams.get('popMetro'),'31080');}finally{release?.();await window.happyDOM.close();}
});
test('reviewed religion rows color the actual state layer and retain bounded labels',async()=>{
 const {window,q}=await setup();try{const original=window.fetch;const fixture=JSON.parse(await readFile('data/atlas/population-religion-reviewed.json','utf8'));fixture.rows=[{id:'state:06',shares:structuredClone(fixture.national)}];fixture.rows[0].shares.muslim={status:'bounded',lower:0,upper:1,upperExclusive:true};window.fetch=async url=>String(url).endsWith('/religion.json.gz')?new Response(JSON.stringify(fixture)):original(url);q('[data-pop-view="religion"]').click();await waitFor(()=>window.__map.getSource('population')?.data.features.some(f=>f.properties.id==='state:06'),'religion geometry');let feature=window.__map.getSource('population').data.features.find(f=>f.properties.id==='state:06');assert.notEqual(feature.properties.color,'#c8ccd0');
 change(window,q('[data-pop-religion]'),'muslim');await waitFor(()=>window.__map.getLayer('population-fill'),'bounded religion layer');change(window,q('[data-pop-state]'),'06');change(window,q('[data-pop-geo]'),'state:06');assert.match(q('[data-pop-selected-value]').textContent,/1%未満/);feature=window.__map.getSource('population').data.features.find(f=>f.properties.id==='state:06');assert.equal(feature.properties.color,'#c8ccd0');}finally{await window.happyDOM.close();}
});
