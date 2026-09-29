import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

// Only the WebGL boundary is replaced. The built page, controller, URL codec,
// real data loaders, source panels and history events execute together.
const stub=`export function setWorkerUrl(){}; export class Map {
 constructor(options){if(window.__failMap)throw Error('WebGL unavailable');window.__map=this;this.options=options;this.events={};this.layers={};this.sources={};this.center={lng:-62,lat:-15};this.zoom=2;queueMicrotask(()=>this.events.load?.forEach(f=>f()));}
 on(name,fn){(this.events[name]??=[]).push(fn)} getCenter(){return this.center}getZoom(){return this.zoom}
 fitBounds(b){this.lastFitBounds=b;this.center={lng:(b[0][0]+b[1][0])/2,lat:(b[0][1]+b[1][1])/2};this.zoom=4}jumpTo(o){this.center={lng:o.center[0],lat:o.center[1]};this.zoom=o.zoom}zoomTo(z){this.zoom=z;this.events.moveend?.forEach(f=>f())}
 setPaintProperty(){}addSource(id,s){this.sources[id]=s}removeSource(id){delete this.sources[id]}getSource(id){return this.sources[id]}addLayer(l){this.layers[l.id]=l}removeLayer(id){delete this.layers[id]}getLayer(id){return this.layers[id]}remove(){}
}
export class Marker{constructor(o){this.element=o.element}setLngLat(p){this.location=p;return this}addTo(map){return this}remove(){}}`;
const modules={controller:await readFile(new URL('../../src/scripts/atlas-latin-america.ts',import.meta.url),'utf8'),state:await readFile(new URL('../../src/lib/atlas-latin-america-state.ts',import.meta.url),'utf8'),map:stub,worker:'export default "mock-map-worker.js"'};
// Virtual inputs also avoid esbuild walking outside the checkout on Windows.
const bundle=await build({entryPoints:['latin-controller'],tsconfigRaw:{},bundle:true,write:false,format:'iife',plugins:[{name:'latin-map-boundary',setup(b){
 b.onResolve({filter:/.*/},({path})=>({path:path==='latin-controller'?'controller':path==='maplibre-gl'?'map':path.includes('?worker&url')?'worker':path.includes('atlas-latin-america-state')?'state':path,namespace:'latin-test'}));
 b.onLoad({filter:/.*/,namespace:'latin-test'},({path})=>{if(!(path in modules))throw Error('Unexpected controller dependency: '+path);return {contents:modules[path],loader:'ts'};});
}}]});
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
const atlasPath='/insight-journal/atlas/latin-america/';
const fieldOrder=['agriculture','nature','industry','population'];
const fieldTab=(q,field)=>q(`.atlas-tabs [data-field="${field}"]`);
const routeField=q=>q('[data-latin-explorer]').dataset.field==='regional-overview'?'overview':q('[data-latin-explorer]').dataset.field;
async function waitFor(check,label){const deadline=Date.now()+15000;while(Date.now()<deadline){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out: '+label);}
async function settleData(window){
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  await waitFor(()=>window.__fetchPending===0,'pending fetch and JSON reads');
  const version=window.__dataVersion;await nextTurn();
  if(window.__fetchPending===0&&window.__dataVersion===version)return;
 }
 throw Error('Timed out: data loader did not settle');
}
async function readyRaster(window,q,suffix){
 await waitFor(()=>q('[data-fallback-raster]').getAttribute('href')?.endsWith('/'+suffix)&&window.__map?.getSource('thematic-image')?.url.endsWith('/'+suffix),'selected raster: '+suffix);
 await settleData(window);
 assert.ok(q('[data-fallback-raster]').getAttribute('href')?.endsWith('/'+suffix),'selected raster remained active after pending loads');
}
async function setup(query='',options={}){
 const route=options.route?options.route+'/':'';
 const window=new Window({url:'https://example.org'+atlasPath+route+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const html=await readFile('dist/atlas/latin-america/'+route+'index.html','utf8');
 window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
 const q=s=>window.document.querySelector(s),svg=q('[data-map-fallback]');
 window.Option=function(text,value){const option=window.document.createElement('option');option.textContent=text;option.value=value;return option;};
 // Happy DOM has no SVG layout; these are browser geometry APIs, not app logic.
 Object.defineProperty(svg,'viewBox',{get(){const [x,y,width,height]=this.getAttribute('viewBox').split(/\s+/).map(Number);return {baseVal:{x,y,width,height}};}});
 Object.defineProperty(svg,'clientWidth',{value:800});Object.defineProperty(svg,'clientHeight',{value:600});
 svg.getScreenCTM=()=>({inverse:()=>({})});
 window.__failMap=options.failMap??false;
 const requests=[];
 window.__fetchPending=0;window.__dataVersion=0;
 const trackedResponse=response=>{
  const parse=response.json.bind(response);
  response.json=async()=>{window.__fetchPending++;window.__dataVersion++;try{return await parse();}finally{window.__fetchPending--;window.__dataVersion++;}};
  return response;
 };
 window.fetch=async url=>{
  window.__fetchPending++;window.__dataVersion++;try{
  const path=String(url).replace(/^.*?\/insight-journal\//,'');requests.push(path);
  if(options.failRaster&&/climate-v1|agriculture-v1|population-v1/.test(path))return trackedResponse(new Response('Unavailable',{status:503}));
  if(options.cropGrid&&path.endsWith('soyb-grid.json'))return trackedResponse(Response.json(options.cropGrid));
  if(options.livestockGrid&&/livestock-v1\/.*-grid.json$/.test(path))return trackedResponse(Response.json(options.livestockGrid));
  if(options.climateGrid&&path.includes('climate-v1/')&&path.endsWith('.grid.json'))return trackedResponse(Response.json(options.climateGrid));
  const content=await readFile('public/'+path,'utf8');
  if(options.zeroStatistics&&path.endsWith('/statistics.json')){const d=JSON.parse(content);d.indicators[0].values.BRA=0;d.indicators[0].values.VEN=null;return trackedResponse(Response.json(d));}
  return trackedResponse(new Response(content));
  }finally{window.__fetchPending--;window.__dataVersion++;}
 };
 window.eval(bundle.outputFiles[0].text);
 await waitFor(()=>q('[data-statistics-table] table'),'country statistics');
 await waitFor(()=>q('[data-latin-atlas]').dataset.renderer===(options.failMap?'svg':'maplibre'),'map load completion');
 await settleData(window);
 return {window,q,requests,root:q('[data-latin-atlas]'),config:JSON.parse(q('[data-latin-config]').textContent)};
}
async function close(window){await settleData(window);await window.happyDOM.close();}
const change=(window,element,value)=>{element.value=value;element.dispatchEvent(new window.Event('change'));};
const visiblePanels=q=>[...q('[data-latin-atlas]').querySelectorAll('[data-topic-panel],[data-city-panel]')].filter(e=>!e.hidden);

test('overview and every field route render the shared North America frame, news rail and real tab links before JavaScript',async()=>{
 for(const field of ['overview',...fieldOrder]){
  const route=field==='overview'?'':field+'/';
  const window=new Window({url:'https://example.org'+atlasPath+route,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
  try{
   const html=await readFile('dist/atlas/latin-america/'+route+'index.html','utf8');
   window.document.body.innerHTML=html.replace(/<script[\s\S]*?<\/script>/g,'');
   const q=s=>window.document.querySelector(s),shell=q('.atlas-desktop-shell[data-atlas-shell]');
   assert.ok(shell,field);assert.equal(window.document.querySelectorAll('[data-news-rail]').length,1);
   assert.ok(shell.querySelector(':scope > .atlas-news[data-news-rail]'),field+' news is a sibling of the explorer');
   assert.match(q('[data-news-rail] h2').textContent,/中南米のニュース/);
   assert.ok(q('[data-news-list][tabindex="0"]'));
   assert.ok(shell.querySelector(':scope > .atlas-explorer > .atlas-workspace > .atlas-primary-grid > .atlas-map-column > .atlas-map-frame'),field+' uses the common map frame');
   assert.ok(q('.atlas-primary-grid > [data-field-national] .atlas-national'),field+' reading sits beside the map');
   assert.ok(shell.querySelector(':scope > .atlas-reading.latin-statistics-area'),field+' statistics and sources span below news, map and reading');
   assert.equal(routeField(q),field==='nature'?'natural':field);
   if(field==='overview')assert.equal(q('[data-latin-explorer]').dataset.field,'regional-overview','regional landing must not activate the legacy land-overview layout');
   const tabs=[...q('.atlas-tabs').querySelectorAll('a[data-field]')];
   assert.deepEqual(tabs.map(a=>a.dataset.field),fieldOrder);
   for(const tab of tabs){
    assert.equal(new URL(tab.href).pathname,atlasPath+tab.dataset.field+'/');
    assert.equal(tab.getAttribute('aria-current'),tab.dataset.field===field?'page':null);
   }
   assert.equal(q('[data-overview-fields]').hidden,field!=='overview');
  }finally{await window.happyDOM.close();}
 }
});

test('field links change paths and active tabs, and history restores both the overview and field',async()=>{
 const {window,q}=await setup();
 try{
  assert.equal(routeField(q),'overview');assert.equal(q('.atlas-tabs [aria-current]'),null);
  q('[data-open-field="agriculture"]').click();
  assert.equal(window.location.pathname,atlasPath+'agriculture/');
  assert.equal(fieldTab(q,'agriculture').getAttribute('aria-current'),'page');
  for(const field of fieldOrder.slice(1)){
   fieldTab(q,field).click();
   assert.equal(window.location.pathname,atlasPath+field+'/');
   assert.equal(routeField(q),field==='nature'?'natural':field);
   assert.deepEqual([...q('.atlas-tabs').querySelectorAll('[aria-current="page"]')].map(a=>a.dataset.field),[field]);
  }
  window.history.back();await waitFor(()=>window.location.pathname===atlasPath+'industry/'&&routeField(q)==='industry','back restores industry route and panel');
  assert.equal(fieldTab(q,'industry').getAttribute('aria-current'),'page');
  window.history.go(-3);await waitFor(()=>window.location.pathname===atlasPath&&routeField(q)==='overview','back restores geographic overview');
  assert.equal(q('.atlas-tabs [aria-current]'),null);assert.equal(q('[data-overview-fields]').hidden,false);
  window.history.forward();await waitFor(()=>window.location.pathname===atlasPath+'agriculture/'&&routeField(q)==='agriculture','forward restores agriculture');
  assert.equal(fieldTab(q,'agriculture').getAttribute('aria-current'),'page');
 }finally{await close(window);}
});

test('normal product selection keeps the overview layers, reading, statistics and camera aligned',async()=>{
 const {window,q}=await setup('?place=BRA&map=-55,-14,5',{route:'agriculture'});
 try{
  assert.ok(window.__map.getSource('latin-crops'));assert.ok(window.__map.getSource('latin-livestock'));
  q('[data-crop-option="maiz"]').click();await settleData(window);
  assert.equal(q('[data-product-panel]').hidden,false);assert.equal(q('[data-selection-title]').textContent,'とうもろこし');
  assert.match(q('[data-product-stat-title]').textContent,/とうもろこし/);assert.ok(window.__map.getSource('latin-crops'));assert.ok(window.__map.getSource('latin-livestock'));
  assert.match(window.__map.getSource('latin-selection').url,/maiz-outline/);
  const u=new URL(window.location.href);assert.equal(u.searchParams.get('place'),'BRA');assert.deepEqual(u.searchParams.get('map').split(',').map(Number),[-55,-14,5]);
  q('[data-reading-overview]').click();await settleData(window);
  assert.equal(q('[data-overview]').hidden,false);assert.equal(q('[data-selected-statistics]').hidden,true);assert.equal(window.__map.getSource('latin-selection'),undefined);
  window.history.back();await waitFor(()=>q('[data-selection-title]').textContent==='とうもろこし','history restores product');
 }finally{await close(window);}
});

test('built Latin America page has full prose, usable citations, fallback geography and in-scope selectors',async()=>{
 const {window,q,config}=await setup();
 try{
  const codes=[...q('[data-place]').options].map(o=>o.value);
  for(const code of ['BRA','GTM','CUB','ARG'])assert.ok(codes.includes(code));
  for(const code of ['MEX','USA','CAN'])assert.equal(codes.includes(code),false);
  assert.ok(q('[data-map-fallback] [data-map-country="BRA"]'));
  assert.match(q('#latin-sources').textContent,/メキシコ.*除く/);
  assert.match(q('noscript').textContent,/セラードの大豆農業/);
  for(const topic of config.topics){
   const panel=q(`[data-topic-panel="${topic.id}"]`);
   for(const section of topic.sections)assert.ok(panel.textContent.includes(section.body),topic.id);
   for(const id of topic.relatedIds)assert.ok(panel.querySelector(`[data-compare-topic="${id}"]`),`${topic.id} → ${id}`);
   for(const source of topic.sources)assert.ok([...panel.querySelectorAll('a')].some(a=>a.href===source.url),topic.id);
  }
 }finally{await close(window);}
});

test('all fifteen products preserve country and keep their own definitions and lower statistics',async()=>{
 const {window,q,config}=await setup('?place=BRA&map=-55,-14,5',{route:'agriculture'});
 try{
  for(const product of config.products){
   q(`[data-crop-option="${product.id}"]`).click();await settleData(window);
   assert.equal(q('[data-selection-title]').textContent,product.name);assert.equal(q('[data-product-panel]').hidden,false);
   assert.match(q('[data-product-stat-title]').textContent,new RegExp(product.name.replace(/[()]/g,'\\$&')));
   assert.equal(q('[data-place]').value,'BRA');assert.equal(q('[data-product-stat-table]').querySelectorAll('tbody tr').length,34);
   assert.match(window.__map.getSource('latin-selection').url,new RegExp(product.id+'-outline'));
   assert.equal(q('[data-product-statistics]').closest('.latin-reading'),null);
   assert.equal(q('[data-product-statistics]').closest('.atlas-explorer'),null,'statistics span below the three columns');
  }
 }finally{await close(window);}
});

test('coffee varieties keep their own statistics and regional stories are explicit additional selections',async()=>{
 const {window,q}=await setup('?place=BRA',{route:'agriculture'});
 try{
  q('[data-crop-option="rcof"]').click();await settleData(window);
  assert.equal(q('[data-topic-panel="brazil-coffee"]').hidden,true);assert.match(q('[data-product-stat-title]').textContent,/ロブスタ/);
  assert.equal(q('[data-topic-stat="brazil-coffee"]').hidden,true,'Arabica figures must not appear under Robusta');
  change(window,q('[data-place]'),'COL');q('[data-crop-option="coff"]').click();await settleData(window);
  assert.ok(q('[data-product-topics] [data-select-topic="colombia-coffee"]'));
  assert.equal(q('[data-product-topics] [data-select-topic="brazil-coffee"]'),null);
  q('[data-product-topics] [data-select-topic="colombia-coffee"]').click();
  assert.equal(q('[data-topic-panel="colombia-coffee"]').hidden,false);
 }finally{await close(window);}
});

test('whole-map control fits the regional extent without losing the selected city or reading in either renderer',async()=>{
 for(const failMap of [false,true])for(const selection of [{field:'nature',key:'city',id:'manaus'},{field:'agriculture',key:'topic',id:'cerrado-soy'}]){
  const {window,q,config}=await setup(`?${selection.key}=${selection.id}&place=BRA&map=-55,-14,6`,{route:selection.field,failMap});
  try{
   q('[data-fit]').click();
   const url=new URL(window.location.href),camera=url.searchParams.get('map').split(',').map(Number);
   assert.equal(url.pathname,atlasPath+selection.field+'/');assert.equal(url.searchParams.get(selection.key),selection.id);
   assert.equal(url.searchParams.get('place'),'BRA');assert.equal(q(`[data-${selection.key}-panel="${selection.id}"]`).hidden,false);
   assert.notDeepEqual(camera,[-55,-14,6],'whole-map view replaces the old shared camera');
   const [west,south,east,north]=config.bounds;
   if(!failMap){
    assert.deepEqual(Array.from(window.__map.lastFitBounds,pair=>Array.from(pair)),[[west,south],[east,north]]);
    assert.deepEqual(camera,[window.__map.getCenter().lng,window.__map.getCenter().lat,window.__map.getZoom()]);
   }else{
    const [x,y,width,height]=q('[data-map-fallback]').getAttribute('viewBox').split(' ').map(Number);
    const latitude=mercatorY=>Math.atan(Math.sinh(mercatorY*Math.PI/180))*180/Math.PI;
    assert.ok(x<=west&&x+width>=east&&latitude(-y)>=north&&latitude(-y-height)<=south,'the full region fits inside the simplified viewport');
    assert.ok(Math.abs(camera[0]-(x+width/2))<.001);assert.ok(Math.abs(camera[1]-latitude(-y-height/2))<.001);
   }
   window.dispatchEvent(new window.PopStateEvent('popstate'));
   assert.equal(q(`[data-${selection.key}-panel="${selection.id}"]`).hidden,false,'restoring the shared camera preserves the selection');
   assert.equal(new URL(window.location.href).searchParams.get('map'),url.searchParams.get('map'));
  }finally{await close(window);}
 }
});

test('climate starts with an actual capital selection and reports missing capitals honestly',async()=>{
 const {window,q,config}=await setup('',{route:'nature'});
 try{
  assert.equal(q('[data-city-panel="brasilia"]').hidden,false);assert.equal(q('[data-city]').value,'brasilia');
  assert.equal(new URL(window.location.href).searchParams.get('city'),'brasilia');assert.match(q('[data-current-place]').textContent,/ブラジル/);
  assert.equal(q('[data-city-stat="brasilia"]').hidden,false);assert.equal(q('[data-city-stat="brasilia"] .latin-months').closest('.latin-reading'),null);
  const [west,south,east,north]=config.bounds;
  assert.deepEqual(Array.from(window.__map.lastFitBounds,p=>Array.from(p)),[[west,south],[east,north]]);
  change(window,q('[data-place]'),'CHL');assert.equal(q('[data-city]').value,'santiago');
  for(const place of ['BLZ','BOL']){change(window,q('[data-place]'),place);assert.equal(q('[data-city]').value,'');assert.equal(q('[data-capital-missing]').hidden,false);assert.equal(q('[data-selected-statistics]').hidden,true);}
  change(window,q('[data-city]'),'manaus');q('[data-view-option="rivers"]').click();assert.equal(q('[data-city-panel="manaus"]').hidden,true);
  q('[data-view-option="climate"]').click();assert.equal(q('[data-city-panel="manaus"]').hidden,false);
 }finally{await close(window);}
});

test('default climate chart compares the displayed city surroundings and returns to the original wide view',async()=>{
 for(const failMap of [false,true]){
  const {window,q,config}=await setup('',{route:'nature',failMap});
  try{
   const city=config.cities.find(c=>c.id==='brasilia');
   const before=failMap?q('[data-map-fallback]').getAttribute('viewBox').split(' ').map(Number):[window.__map.getCenter().lng,window.__map.getCenter().lat,window.__map.getZoom()];
   assert.equal(q('[data-city-panel="brasilia"]').hidden,false);assert.equal(new URL(window.location.href).searchParams.get('city'),'brasilia');
   q('[data-city-panel="brasilia"] [data-compare-field="agriculture"]').click();
   const compared=new URL(window.location.href),camera=compared.searchParams.get('map').split(',').map(Number);
   assert.equal(compared.pathname,atlasPath+'agriculture/');assert.equal(routeField(q),'agriculture');
   assert.deepEqual(camera,[Number(city.longitude.toFixed(3)),Number(city.latitude.toFixed(3)),5]);
   assert.equal(q('[data-comparison-return]').hidden,false);
   if(!failMap)assert.deepEqual([window.__map.getCenter().lng,window.__map.getCenter().lat,window.__map.getZoom()],[city.longitude,city.latitude,5]);
   q('[data-return]').click();
   assert.equal(window.location.pathname,atlasPath+'nature/');assert.equal(q('[data-city-panel="brasilia"]').hidden,false);
   assert.equal(new URL(window.location.href).searchParams.get('city'),'brasilia','return restores the capital selection');
   assert.equal(q('[data-comparison-return]').hidden,true);
   const after=failMap?q('[data-map-fallback]').getAttribute('viewBox').split(' ').map(Number):[window.__map.getCenter().lng,window.__map.getCenter().lat,window.__map.getZoom()];
   after.forEach((value,i)=>assert.ok(Math.abs(value-before[i])<.02,'return restores the original regional viewport'));
  }finally{await close(window);}
 }
});

test('related readings and comparison return synchronize the country filter with its statistics highlight',async()=>{
 const {window,q}=await setup('?place=BRA&topic=cerrado-soy',{route:'agriculture'});
 try{
  assert.match(q('[data-statistics-table] .is-selected').textContent,/ブラジル/);
  q('[data-topic-panel="cerrado-soy"] [data-compare-topic="pampas-farming"]').click();
  assert.equal(q('[data-topic-panel="pampas-farming"]').hidden,false);assert.equal(q('[data-place]').value,'');
  assert.equal(q('[data-statistics-table] .is-selected'),null,'the old country highlight must clear with the filter');
  q('[data-return]').click();
  assert.equal(q('[data-place]').value,'BRA');assert.equal(q('[data-topic-panel="cerrado-soy"]').hidden,false);
  assert.match(q('[data-statistics-table] .is-selected').textContent,/ブラジル/);
 }finally{await close(window);}
});

test('country filtering retains agriculture and industry topics, and reset clears table selection',async()=>{
 const {window,q}=await setup('?field=agriculture');
 try{
  change(window,q('[data-place]'),'BRA');
  assert.ok([...q('[data-topic]').options].some(o=>o.value==='cerrado-soy'));
  assert.equal(q('[data-select-topic="cerrado-soy"]').hidden,false);
  assert.equal(q('[data-select-topic="pampas-farming"]').hidden,true);
  fieldTab(q,'industry').click();
  assert.ok([...q('[data-topic]').options].some(o=>o.value==='brazil-manufacturing'));
  assert.match(q('[data-statistics-table] .is-selected').textContent,/ブラジル/);
  q('[data-reset]').click();
  assert.equal(q('[data-place]').value,'');assert.equal(q('[data-statistics-table] .is-selected'),null);
 }finally{await close(window);}
});

test('deep links, related-reading return and browser history restore the selected reading',async()=>{
 const {window,q}=await setup('?field=agriculture&topic=cerrado-soy&place=BRA&crop=soyb&map=-55,-14,5');
 try{
  assert.equal(q('[data-topic-panel="cerrado-soy"]').hidden,false);assert.equal(visiblePanels(q).length,1);
  const before=new URL(window.location.href);
  q('[data-topic-panel="cerrado-soy"] [data-compare-topic="cerrado"]').click();
  assert.equal(q('[data-topic-panel="cerrado"]').hidden,false);assert.equal(q('[data-comparison-return]').hidden,false);
  q('[data-return]').click();
  assert.equal(q('[data-topic-panel="cerrado-soy"]').hidden,false);
  for(const key of ['topic','place','crop'])assert.equal(new URL(window.location.href).searchParams.get(key),before.searchParams.get(key));
  assert.deepEqual(new URL(window.location.href).searchParams.get('map').split(',').map(Number),before.searchParams.get('map').split(',').map(Number));
  fieldTab(q,'industry').click();
  window.history.back();await waitFor(()=>!q('[data-topic-panel="cerrado-soy"]').hidden,'history restores topic');
  assert.equal(fieldTab(q,'agriculture').getAttribute('aria-current'),'page');
  window.history.pushState({},'',atlasPath+'?field=invalid&topic=missing&place=MEX&city=missing&map=-60,,3');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(routeField(q),'overview');assert.equal(q('.atlas-tabs [aria-current]'),null);assert.equal(q('[data-place]').value,'');assert.equal(visiblePanels(q).length,0);assert.equal(q('[data-overview]').hidden,false);
 }finally{await close(window);}
});

test('simplified map comparison preserves manual zoom and URL reproduction',async()=>{
 const {window,q}=await setup('?field=agriculture&topic=cerrado-soy',{failMap:true});
 try{
  q('[data-zoom="1"]').click();const before=q('[data-map-fallback]').getAttribute('viewBox');
  assert.ok(new URL(window.location.href).searchParams.get('map'),'simplified-map zoom must be shareable');
  q('[data-topic-panel="cerrado-soy"] [data-compare-field="nature"]').click();
  assert.equal(q('[data-map-fallback]').getAttribute('viewBox'),before);
  q('[data-return]').click();
  const after=q('[data-map-fallback]').getAttribute('viewBox').split(' ').map(Number),expected=before.split(' ').map(Number);
  after.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<.02,`comparison lost fallback viewport component ${i}`));
 }finally{await close(window);}
});

test('raster failure keeps geographic context and cited selected prose usable',async()=>{
 const {window,q}=await setup('?field=agriculture&topic=cerrado-soy&crop=soyb&mode=single',{failMap:true,failRaster:true});
 try{
  await waitFor(()=>q('[data-legend]').textContent.includes('未表示'),'explicit unavailable layer');
  assert.equal(q('[data-topic-panel="cerrado-soy"]').hidden,false);
  assert.match(q('[data-topic-panel="cerrado-soy"]').textContent,/土壌改良/);
  assert.ok(q('[data-topic-panel="cerrado-soy"] a[href^="https:"]'));
  assert.ok(q('[data-map-fallback] [data-map-country="BRA"]'));
  fieldTab(q,'population').click();
  await waitFor(()=>q('[data-legend]').textContent.includes('国の人口'),'population fallback description');
  assert.equal(q('[data-select-topic="brazil-southeast"]').hidden,false);
 }finally{await close(window);}
});

test('map sampling and comparison table distinguish real zero from absent data',async()=>{
 const grid={bounds:[-64,-4,-60,0],width:4,height:4,cellSize:1,validRuns:[[0,2]],positiveCells:[[0,12.5]]};
 const {window,q}=await setup('?field=agriculture&crop=soyb&mode=single',{cropGrid:grid,zeroStatistics:true});
 try{
  await readyRaster(window,q,'soyb.png');
  assert.match(q('[data-legend]').textContent,/ha/);
  const click=(lon,lat)=>window.__map.events.click.forEach(f=>f({lngLat:{lng:lon,lat}}));
  click(-63.5,-.5);assert.match(q('[data-grid-reading]').textContent,/12.5 ha/);
  click(-62.5,-.5);assert.match(q('[data-grid-reading]').textContent,/：0 ha/);
  click(-61.5,-.5);assert.match(q('[data-grid-reading]').textContent,/データなし/);
  const row=name=>[...q('[data-statistics-table]').querySelectorAll('tbody tr')].find(r=>r.querySelector('th').textContent===name);
  assert.equal(row('ブラジル').querySelector('td').textContent,'0');assert.equal(row('ベネズエラ').querySelector('td').textContent,'データなし');
 }finally{await close(window);}
});

test('livestock selection reports density in animal units and narrative-only forestry removes the raster',async()=>{
 const grid={bounds:[-64,-4,-60,0],width:4,height:4,cellSize:1,validRuns:[[0,2]],positiveCells:[[0,12.5]]};
 const {window,q}=await setup('?field=agriculture&crop=cattle&mode=single',{livestockGrid:grid});
 try{
  await readyRaster(window,q,'cattle.png');
  assert.match(q('[data-legend]').textContent,/頭\/km²/);
  assert.match(q('[data-map-kicker]').textContent,/density|密度/i);
  window.__map.events.click.forEach(f=>f({lngLat:{lng:-63.5,lat:-.5}}));
  assert.match(q('[data-grid-reading]').textContent,/12.5 頭\/km²/);assert.doesNotMatch(q('[data-grid-reading]').textContent,/ha/);
  q('[data-crop-option="chicken"]').click();
  await readyRaster(window,q,'chicken.png');
  assert.match(q('[data-legend]').textContent,/羽\/km²/);
  window.__map.events.click.forEach(f=>f({lngLat:{lng:-63.5,lat:-.5}}));
  assert.match(q('[data-grid-reading]').textContent,/12.5 羽\/km²/);
  q('[data-crop-option="none"]').click();
  assert.equal(q('[data-fallback-raster]').getAttribute('href'),null);
  assert.equal(window.__map.getSource('thematic-image'),undefined);
  assert.match(q('[data-legend]').textContent,/分布.*(?:表示|重ね)|代表|林/);
 }finally{await close(window);}
});

test('clicking beyond a climate raster clears the previous location value',async()=>{
 const grid={bounds4326:[-64,-4,-60,0],width:4,height:4,noData:0,values:[1,...Array(15).fill(0)]};
 const {window,q}=await setup('?field=nature',{climateGrid:grid});
 try{
  await readyRaster(window,q,'latin-america-climate-v1/latin-america.png');
  const click=(lon,lat)=>window.__map.events.click.forEach(f=>f({lngLat:{lng:lon,lat}}));
  click(-63.5,-.5);assert.match(q('[data-grid-reading]').textContent,/Af/);
  click(-65,-.5);assert.match(q('[data-grid-reading]').textContent,/データなし|範囲外/);
 }finally{await close(window);}
});

test('conflicting deep links and city selection keep the reading, country and marker consistent',async()=>{
 const {window,q}=await setup('?field=nature&topic=andes&city=manaus&place=CHL',{failMap:true});
 try{
  assert.equal(visiblePanels(q).length,1);assert.equal(q('[data-city-panel="manaus"]').hidden,false);
  assert.equal(q('[data-place]').value,'');assert.equal(q('[data-topic]').value,'');
  change(window,q('[data-place]'),'BRA');
  change(window,q('[data-city]'),'manaus');
  assert.equal(q('[data-place]').value,'BRA');
  change(window,q('[data-city]'),'lima');
  assert.equal(q('[data-place]').value,'');assert.equal(q('[data-city-panel="lima"]').hidden,false);
  assert.equal(visiblePanels(q).length,1);assert.equal(q('[data-statistics-table] .is-selected'),null);
  assert.ok(q('[data-fallback-markers] [aria-label^="雨温図：リマ"]'));
  assert.equal(new URL(window.location.href).searchParams.get('city'),'lima');
  assert.equal(new URL(window.location.href).searchParams.has('place'),false);
 }finally{await close(window);}
});

test('agricultural readings choose their associated crop instead of leaving an unrelated distribution',async()=>{
 const {window,q}=await setup('?field=agriculture&crop=soyb');
 try{
  for(const [topic,crop] of [['brazil-sugar','sugc'],['tropical-bananas','bana'],['andean-farming','pota'],['chile-fruit','temf'],['planted-forests','none']]){
   change(window,q('[data-topic]'),topic);
   assert.equal(q('[data-topic-panel="'+topic+'"]').hidden,false);
   assert.equal(q('[data-crop]').value,crop,topic);
   assert.equal(q('[data-crop-option="'+crop+'"]').getAttribute('aria-pressed'),'true',topic);
   assert.equal(new URL(window.location.href).searchParams.get('crop'),crop,topic);
  }
  assert.equal(q('[data-fallback-raster]').getAttribute('href'),null);
 }finally{await close(window);}
});

test('OFF selections, explicit single-item mode, return and history preserve independent display settings',async()=>{
 for(const failMap of [false,true]){
  const {window,q}=await setup('',{route:'agriculture',failMap});
  try{
   q('[data-toggle-crops]').click();q('[data-crop-option="soyb"]').click();await settleData(window);
   assert.equal(q('[data-toggle-crops]').getAttribute('aria-pressed'),'false');assert.equal(q('[data-show-selected]').hidden,false);
   assert.equal(q('[data-fallback-extra] [data-extra-raster="crops"]'),null);assert.ok(q('[data-fallback-extra] [data-extra-raster="livestock"]'));
   q('[data-only-selected]').click();await settleData(window);
   assert.match(q('[data-fallback-raster]').getAttribute('href'),/soyb.png$/);assert.equal(q('[data-fallback-extra]').childElementCount,0);
   q('[data-crop-option="whea"]').click();await settleData(window);assert.match(q('[data-fallback-raster]').getAttribute('href'),/whea.png$/);
   q('[data-all-products]').click();await settleData(window);
   assert.equal(q('[data-selection-title]').textContent,'大豆');assert.equal(q('[data-toggle-crops]').getAttribute('aria-pressed'),'false');assert.equal(q('[data-toggle-livestock]').getAttribute('aria-pressed'),'true');
   q('[data-only-selected]').click();await settleData(window);q('[data-toggle-crops]').click();await settleData(window);
   assert.equal(q('[data-toggle-crops]').getAttribute('aria-pressed'),'false','ON toggle in single mode must turn the visible crop OFF');
   assert.equal(q('[data-fallback-extra]').childElementCount,0);assert.match(q('[data-layer-notice]').textContent,/非表示/);
   window.history.back();await waitFor(()=>new URL(window.location.href).searchParams.get('mode')==='single','back restores single display');await settleData(window);
   assert.match(q('[data-fallback-raster]').getAttribute('href'),/soyb.png$/);
  }finally{await close(window);}
 }
});

test('rapid single-product changes never show a stale product grid or stale statistics',async()=>{
 const {window,q}=await setup('?crop=soyb&mode=single',{route:'agriculture'});
 try{
  for(const id of ['coff','rice','rcof','pig','maiz'])q(`[data-crop-option="${id}"]`).click();
  await readyRaster(window,q,'maiz.png');assert.equal(q('[data-selection-title]').textContent,'とうもろこし');assert.match(q('[data-product-stat-title]').textContent,/とうもろこし/);
  assert.equal(q('[data-product-stat-table]').querySelectorAll('tbody tr').length,34);
 }finally{await close(window);}
});

test('contradictory product links and comparison locations cannot borrow unrelated readings',async()=>{
 const {window,q}=await setup('?crop=maiz&topic=cerrado-soy&mode=single',{route:'agriculture'});
 try{
  await readyRaster(window,q,'maiz.png');assert.equal(q('[data-topic-panel="cerrado-soy"]').hidden,true);assert.equal(q('[data-topic-stat="cerrado-soy"]').hidden,true);
  q('[data-select-topic="chile-fruit"]').click();q('[data-selection-actions] [data-compare-field="nature"]').click();await settleData(window);
  assert.equal(q('[data-city-panel="brasilia"]').hidden,true,'a local comparison cannot show a distant capital');
  assert.equal(q('[data-city-stat="brasilia"]').hidden,true);assert.equal(q('[data-overview]').hidden,false);
  change(window,q('[data-place]'),'BRA');q('[data-reading-overview]').click();
  assert.equal(q('[data-capital-missing]').hidden,true,'clearing a selection does not mean the capital data are missing');
 }finally{await close(window);}
});
