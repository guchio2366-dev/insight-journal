import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

// Mock only WebGL's rendering boundary. The actual page, state codec, selectors,
// card logic and data loaders execute unchanged; browser layout is tested separately.
const stub=`export function setWorkerCount(){};export class Map {
 constructor(options){window.__map=this;this.options=options;this.events={};this.center={lng:-96,lat:38};this.zoom=3;this.sources=Object.fromEntries(Object.entries(options.style.sources).map(([id,s])=>[id,{data:s.data,setDataCalls:0,setData(d){this.data=d;this.setDataCalls++}}]));this.touchZoomRotate={disableRotation(){}};this.scrollZoom={disable(){}};this.cameraChanges=0;}
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
async function setup(query=''){
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/nature/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 const html=await readFile('dist/atlas/north-america/nature/index.html','utf8');
 window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
 window.ResizeObserver=class {observe(){}disconnect(){}};
 window.createImageBitmap=async()=>({width:1,height:1,close(){}});
 window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData:()=>({width:1,height:1,data:new Uint8ClampedArray([9,0,0,255])})});
 const requests=[];
 window.fetch=async (url)=>{requests.push(String(url));return new Response(await readFile('public/'+String(url).replace(/^.*?\/insight-journal\//,'')));};
 window.Response=Response;window.DecompressionStream=DecompressionStream;
 const entry=window.eval(bundle.outputFiles[0].text+"; NatureTest;");await entry.startAtlas();await delay();
 return {window,requests,root:window.document.querySelector('[data-atlas-explorer]'),q:s=>window.document.querySelector(s)};
}

test('都市→水資源→農業→気候で選択とカメラを保持し、全12都市の図を選べる',async()=>{
 const {window,root,q}=await setup('?city=miami&crop=rice&region=sacramento-rice&lng=-120&lat=38&z=5');
 try{
  assert.equal(root.dataset.renderState,'ready');const moves=window.__map.cameraChanges;
  for(const option of [...q('[data-city-select]').options].slice(1)){
   q('[data-city-select]').value=option.value;q('[data-city-select]').dispatchEvent(new window.Event('change'));assert.equal(q('[data-city-panel="'+option.value+'"]').hidden,false);
  }
  const selected=q('[data-city-select]').value;
  q('[data-nature-mode="water"]').click();await delay();assert.equal(q('[data-climate-chart]').hidden,true);assert.equal(q('[data-city-picker]').hidden,true);
  q('[data-field="agriculture"]').click();assert.equal(root.dataset.field,'agriculture');
  q('[data-field="natural"]').click();q('[data-nature-mode="climate"]').click();await delay();assert.equal(q('[data-city-select]').value,selected);assert.equal(q('[data-climate-chart]').hidden,false);assert.equal(window.__map.cameraChanges,moves);
  q('[data-close-selection]').click();assert.equal(q('[data-selection]').hidden,true);assert.equal(new URL(window.location.href).searchParams.get('city'),null);
 }finally{await window.happyDOM.close();}
});

test('遅れた水資源リクエストは新しい地形表示を上書きしない',async()=>{
 const {window,root,q}=await setup();
 try{
  const original=window.fetch;let release;
  // Loader captures fetch at startup; delay its Response.json at the boundary.
  const oldJson=Response.prototype.json;let blocked=true;
  Response.prototype.json=async function(){const data=await oldJson.call(this);if(blocked&&data.features?.[0]?.properties?.AQ_NAME){blocked=false;await new Promise(resolve=>release=resolve);}return data;};
  try{
   q('[data-nature-mode="water"]').click();for(let i=0;i<20&&!release;i++)await delay();assert.ok(release);
   q('[data-nature-mode="landform"]').click();await delay();release();await delay();assert.equal(root.dataset.natureMode,'landform');assert.equal(root.dataset.natureLoad,'ready');assert.equal(q('[data-nature-summary-panel="landform"]').hidden,false);
  }finally{Response.prototype.json=oldJson;release?.();}
 }finally{await window.happyDOM.close();}
});

test('全国等高線は初回だけ取得・設定し、パン・ズーム・表示往復で再処理しない',async()=>{
 const {window,requests,root,q}=await setup();
 try{
  const contourRequests=()=>requests.filter(url=>url.endsWith('/contours.geojson.gz'));
  assert.equal(contourRequests().length,0);
  q('[data-nature-mode="contour"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','contour ready');
  assert.equal(contourRequests().length,1);assert.equal(window.__map.sources.contours.setDataCalls,1);
  for(const zoom of [3,5,7]){window.__map.zoom=zoom;for(const handler of window.__map.events.moveend)handler();await delay();}
  q('[data-nature-mode="water"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','water ready');
  q('[data-nature-mode="landform"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','landform ready');
  q('[data-nature-mode="contour"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','contour restored');
  q('[data-field="agriculture"]').click();q('[data-field="natural"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','contour after field round trip');
  assert.equal(contourRequests().length,1);assert.equal(window.__map.sources.contours.setDataCalls,1);
  assert.ok(requests.every(url=>!url.includes('contour-tiles.json')&&!url.includes('/contours/')));
 }finally{await window.happyDOM.close();}
});
