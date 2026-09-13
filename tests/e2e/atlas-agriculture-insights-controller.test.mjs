import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

// Mock only WebGL's rendering boundary. The actual page, state codec, selectors,
// card logic and data loaders execute unchanged; browser layout is tested separately.
const stub=`export function setWorkerCount(){};export class Map {
 constructor(options){if(window.__forceNoWebGL)throw new Error('No WebGL');window.__map=this;window.__mapCount=(window.__mapCount??0)+1;this.filters={};this.options=options;this.events={};this.center={lng:-96,lat:38};this.zoom=3;this.sources=Object.fromEntries(Object.entries(options.style.sources).map(([id,s])=>[id,{data:s.data,setDataCalls:0,setData(d){this.data=d;this.setDataCalls++}}]));this.touchZoomRotate={disableRotation(){}};this.scrollZoom={disable(){}};this.cameraChanges=0;}
 getSource(id){return this.sources[id]} getCenter(){return this.center} getZoom(){return this.zoom}
 getBounds(){return {getWest:()=>-128,getSouth:()=>22,getEast:()=>-64,getNorth:()=>52,contains:()=>true}}
 project(p){return {x:(p[0]+128)*10,y:(52-p[1])*10}} unproject(p){return {lng:p[0]/10-128,lat:52-p[1]/10}}
 setLayoutProperty(){}setPaintProperty(){}setFilter(id,value){this.filters[id]=value}addImage(){}resize(){}remove(){}queryRenderedFeatures(){return []}
 on(name,fn){(this.events[name]??=[]).push(fn)}once(name,fn){this.on(name,fn);if(name==='load')queueMicrotask(()=>fn())}
 jumpTo(o){this.cameraChanges++;this.center={lng:o.center[0],lat:o.center[1]};this.zoom=o.zoom??this.zoom}fitBounds(){this.cameraChanges++}
 zoomIn(){this.zoom++}zoomOut(){this.zoom--}getCanvas(){return {getContext:()=>null}}
}`;
const bundle=await build({entryPoints:['src/scripts/atlas-explorer.ts'],bundle:true,write:false,format:'iife',globalName:'NatureTest',plugins:[{name:'map-boundary',setup(b){b.onResolve({filter:/^maplibre-gl$/},()=>({path:'maplibre',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:stub,loader:'js'}));}}]});
const delay=()=>new Promise(resolve=>setTimeout(resolve,25));
async function waitFor(check,label){for(let attempt=0;attempt<120;attempt++){if(check())return;await delay();}throw new Error('Timed out: '+label);}
async function setup(query='',noWebGL=false){
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/agriculture/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 const html=await readFile('dist/atlas/north-america/agriculture/index.html','utf8');
 window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
 const frame=window.document.querySelector('[data-map-frame]');Object.defineProperty(frame,'clientWidth',{value:800});Object.defineProperty(frame,'clientHeight',{value:480});
 window.ResizeObserver=class {observe(){}disconnect(){}};
 window.createImageBitmap=async()=>({width:1,height:1,close(){}});
 window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData:()=>({width:1,height:1,data:new Uint8ClampedArray([9,0,0,255])})});
 const requests=[];
 window.fetch=async (url)=>{requests.push(String(url));return new Response(await readFile('public/'+String(url).replace(/^.*?\/insight-journal\//,'')));};
 window.Response=Response;window.DecompressionStream=DecompressionStream;
 window.__forceNoWebGL=noWebGL;
 const entry=window.eval(bundle.outputFiles[0].text+"; NatureTest;");await entry.startAtlas();await delay();
 return {window,requests,root:window.document.querySelector('[data-atlas-explorer]'),q:s=>window.document.querySelector(s)};
}


test('20回の関係比較でカメラ・全国値・下部作物・取得回数を変えず、直接選択で解除',async()=>{
 const {window,root,q,requests}=await setup('?stats=rice&lng=-101&lat=39&z=4');
 try{
  const national=q('[data-field-national="agriculture"]').innerHTML,moves=window.__map.cameraChanges,count=requests.length;
  const ids=['corn-soy-hogs','plains-wheat-cattle','california-rice-water'];
  for(let i=0;i<20;i++)q('[data-relation-select="'+ids[i%3]+'"]').click();
  assert.equal(window.__mapCount,1);assert.equal(window.__map.cameraChanges,moves);assert.equal(requests.length,count);
  assert.equal(q('[data-field-national="agriculture"]').innerHTML,national);assert.equal(q('[data-stat-panel="rice"]').hidden,false);
  q('[data-relation-select="corn-soy-hogs"]').click();
  assert.ok(q('.atlas-livestock-marker.is-related'));assert.equal(JSON.stringify(window.__map.filters['crop-relation-highlight'][2][1]),JSON.stringify(['corn','soybean','corn-soybean']));
  q('[data-agri-layer][value="livestock"]').click();assert.equal(q('[data-agri-layer][value="livestock"]').checked,false);
  q('[data-relation-select="plains-wheat-cattle"]').click();assert.equal(q('[data-agri-layer][value="livestock"]').checked,false);assert.equal(q('[data-relation-warning]').hidden,false);
  q('[data-enable-relation-layers]').click();assert.equal(q('[data-agri-layer][value="livestock"]').checked,true);
  q('[data-field="natural"]').click();q('[data-field="agriculture"]').click();
  assert.equal(q('[data-relation-select="plains-wheat-cattle"]').getAttribute('aria-pressed'),'true');
  q('[data-close-selection]').click();assert.equal(window.document.activeElement.dataset.relationSelect,'plains-wheat-cattle');
  q('[data-relation-select="corn-soy-hogs"]').click();q('[data-crop-select="rice"]').click();assert.equal(new URL(window.location.href).searchParams.has('relation'),false);
 }finally{await window.happyDOM.close();}
});

test('関係の直開き・履歴・詳細リンクと、WebGL失敗後の正確な代替線を復元する',async()=>{
 const {window,q,root}=await setup('?relation=california-rice-water&stats=soybean&agriLayers=none',true);
 try{
  assert.equal(root.dataset.renderState,'fallback');assert.equal(q('[data-selection]').hidden,false);
  assert.equal(q('[data-fallback-relation="california-rice-water"]').hasAttribute('hidden'),false);
  assert.equal(q('[data-fallback-relation="california-rice-water"] [data-relation-crops]').hasAttribute('hidden'),true);
  q('[data-enable-relation-layers]').click();assert.equal(q('[data-fallback-relation="california-rice-water"] [data-relation-crops]').hasAttribute('hidden'),false);
  assert.equal(q('[data-agri-layer][value="livestock"]').checked,false);
  q('[data-relation-item="california-rice-water"] [data-relation-detail-link]').click();assert.equal(q('[data-stat-panel="rice"]').hidden,false);
  window.history.pushState({},'', '?relation=plains-wheat-cattle&agriLayers=crops,livestock&stats=wheat');window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(q('[data-selection-title]').textContent,'大平原の小麦と牛');assert.equal(q('[data-stat-panel="wheat"]').hidden,false);
  q('[data-close-selection]').click();assert.equal(q('[data-selection]').hidden,true);assert.equal(q('[data-fallback-relation="plains-wheat-cattle"]').hasAttribute('hidden'),true);
 }finally{await window.happyDOM.close();}
});

test('静的HTMLで3関係・5収支・18強調語句・全用途のラベルと元値を読める',async()=>{
 const html=await readFile('dist/atlas/north-america/agriculture/index.html','utf8');
 const window=new Window();window.document.body.innerHTML=html;
 try{
  const d=window.document;assert.equal(d.querySelectorAll('[data-relation-item]').length,3);assert.equal(d.querySelectorAll('[data-supply-use]').length,5);assert.equal(d.querySelectorAll('[data-pair-id]').length,18);
  assert.equal(d.querySelectorAll('[data-stat-panel][hidden]').length,0);
  for(const panel of d.querySelectorAll('[data-supply-use]')){assert.equal(panel.querySelectorAll('.supply-bar').length,2);assert.ok(panel.querySelectorAll('tbody tr').length>=8);assert.ok(panel.querySelector('.supply-imports').textContent.length>35);}
  assert.match(html,/参考：2025暦年/);assert.match(html,/−|未勘定/);
 }finally{await window.happyDOM.close();}
});
