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
 const entry=window.eval(bundle.outputFiles[0].text+"; NatureTest;");await entry.startAtlas();await waitFor(()=>/3,144|3,108/.test(window.document.querySelector('[data-pop-status]').textContent),'population ready').catch(error=>{console.log(window.document.querySelector('[data-pop-status]').textContent,requests,window.happyDOM.virtualConsolePrinter.readAsString());throw error;});await delay();
 return {window,requests,root:window.document.querySelector('[data-atlas-explorer]'),q:s=>window.document.querySelector(s)};
}


const pick=(window,id)=>{window.__map.queryRenderedFeatures=()=>[{properties:{id}}];window.__map.events.click[0]({point:{x:1,y:1}});};
const change=(window,element,value)=>{element.value=value;element.dispatchEvent(new window.Event('change'));};

test('concentration colors reveal white-plurality counties, multiple city groups and county composition',async()=>{
 const {window,q,requests}=await setup('?popView=ethnicity');
 try{
  const map=window.__map;await waitFor(()=>map.getLayer('population-fill'),'concentration map');
  const source=map.getSource('population'),moves=map.cameraChanges,count=requests.length;
  assert.equal(source.data.features.find(f=>f.properties.id==='county:53033').properties.color,'#8870b5');
  const bay=q('.population-city-markers [data-pop-city="san-francisco"]');
  assert.ok(bay.querySelectorAll('.population-ethnicity-dots i').length>=2);
  assert.match(bay.getAttribute('aria-label'),/ヒスパニック.*アジア系/);
  bay.click();assert.equal(q('[data-pop-reading-body] tbody').children.length,8);
  assert.match(q('[data-pop-reading-body]').textContent,/9郡を人口で合算/);
  assert.match(q('[data-pop-reading-body]').textContent,/Santa Clara County/);
  pick(window,'county:06037');assert.equal(q('[data-pop-selected]').hidden,false);
  assert.match(q('[data-pop-selected-title]').textContent,/Los Angeles County/);
  assert.match(q('[data-pop-selected-value]').textContent,/ヒスパニック.*アジア系/);
  assert.equal(q('[data-pop-selected-composition] tbody').children.length,8);
  assert.equal(new URL(window.location.href).searchParams.get('popGeo'),'county:06037');
  assert.equal(map.getSource('population'),source);assert.equal(map.cameraChanges,moves);assert.equal(requests.length,count);
  q('[data-pop-view="distribution"]').click();await waitFor(()=>q('[data-layer-caption]').textContent.includes('人口密度'),'density');
  assert.equal(q('.population-ethnicity-dots'),null);assert.equal(q('[data-pop-ethnicity-method]').hidden,true);assert.equal(q('[data-pop-selected]').hidden,true);
 }finally{await window.happyDOM.close();}
});

test('legend changes only the reading, preserving all map colors, camera and requests',async()=>{
 const {window,q,requests}=await setup('?popView=ethnicity');
 try{
  const map=window.__map;await waitFor(()=>map.getLayer('population-fill'),'ethnicity map');
  const source=map.getSource('population'),before=JSON.stringify(source.data),moves=map.cameraChanges,count=requests.length;
  assert.equal(q('[data-pop-ethnicity]'),null);assert.equal(q('[data-pop-metro]'),null);
  assert.match(q('[data-pop-overview]').textContent,/サラダボウル/);
  q('[data-pop-group="hispanic"]').click();
  assert.match(q('[data-pop-overview-title]').textContent,/ヒスパニック/);
  assert.match(q('[data-pop-reading-body]').textContent,/1848/);
  assert.equal(q('[data-pop-group="hispanic"]').getAttribute('aria-pressed'),'true');
  assert.equal(map.getSource('population'),source);assert.equal(JSON.stringify(source.data),before);
  assert.equal(map.cameraChanges,moves);assert.equal(requests.length,count);
  assert.equal(new URL(window.location.href).searchParams.get('popEthnicity'),'hispanic');
  q('[data-pop-group="asian"]').click();assert.match(q('[data-pop-overview-title]').textContent,/アジア/);
  assert.doesNotMatch(q('[data-pop-reading-body]').textContent,/1848/);
  q('[data-pop-reading-reset]').click();assert.match(q('[data-pop-overview]').textContent,/サラダボウル/);
  assert.equal(map.getSource('population'),source);
 }finally{await window.happyDOM.close();}
});
test('city replaces nationwide reading and national reset clears it without moving density map',async()=>{
 const {window,q,requests}=await setup('?lng=-96&lat=38&z=5');
 try{
  const map=window.__map,moves=map.cameraChanges;await waitFor(()=>map.getLayer('population-fill'),'density map');
  q('.population-city-list [data-pop-city="los-angeles"]').click();
  assert.equal(q('[data-pop-overview-title]').textContent,'ロサンゼルス');
  assert.match(q('[data-pop-reading-body]').textContent,/2.9%/);
  assert.doesNotMatch(q('[data-pop-reading]').textContent,/東西の沿岸や五大湖周辺に人口が集まり/);
  assert.equal(q('[data-pop-chart]'),null);assert.equal(map.cameraChanges,moves);
  assert.ok(!requests.some(x=>x.includes('metro-')||x.includes('ethnicity.json')));
  q('[data-pop-reading-reset]').click();assert.equal(new URL(window.location.href).searchParams.has('popCity'),false);
  assert.match(q('[data-pop-overview-title]').textContent,/人は都市に/);
  q('a[data-field="industry"]').click();assert.equal(map.getSource('population'),undefined);
  q('a[data-field="population"]').click();await waitFor(()=>map.getLayer('population-fill'),'population returns');assert.equal(window.__map,map);
 }finally{await window.happyDOM.close();}
});
test('religion map, legend, city and region share one selector without repainting the map',async()=>{
 const {window,q,requests}=await setup('?popView=religion');
 try{
  const map=window.__map;await waitFor(()=>map.getLayer('population-fill'),'religion map');const source=map.getSource('population'),before=JSON.stringify(source.data),moves=map.cameraChanges,count=requests.length;
  q('[data-pop-religion-group="latter_day_saints"]').click();assert.match(q('[data-pop-overview-title]').textContent,/末日聖徒/);assert.match(q('[data-pop-reading-body]').textContent,/灌漑/);assert.equal(map.getSource('population'),source);assert.equal(JSON.stringify(source.data),before);assert.equal(map.cameraChanges,moves);assert.equal(requests.length,count);
  const region=q('.population-city-list [data-pop-place-story="utah-lds"]');assert.equal(region.hidden,false);
  region.click();assert.match(q('[data-pop-overview-title]').textContent,/末日聖徒/);
  assert.equal(new URL(window.location.href).searchParams.get('popReligionStory'),'utah-lds');
  q('.population-city-list [data-pop-city="chicago"]').click();
  assert.equal(q('[data-pop-overview-title]').textContent,'シカゴ');assert.match(q('[data-pop-reading-body]').textContent,/大移動/);
  assert.equal(new URL(window.location.href).searchParams.has('popReligionStory'),false);
  assert.equal(region.getAttribute('aria-pressed'),'false');
  region.click();assert.equal(new URL(window.location.href).searchParams.has('popCity'),false);
  assert.match(q('[data-pop-status]').textContent,/3,108 郡/);assert.equal(q('[data-pop-chart]'),null);
  assert.equal(window.__map.getSource('population'),source);
 }finally{await window.happyDOM.close();}
});
test('history restores ethnicity reading on unchanged categorical geography',async()=>{
 const {window,q}=await setup('?popView=ethnicity');
 try{
  await waitFor(()=>window.__map.getLayer('population-fill'),'first map');
  const before=JSON.stringify(window.__map.getSource('population').data);
  const url=new URL(window.location.href);url.searchParams.set('popEthnicity','black');url.searchParams.set('popGeo','county:36061');
  window.history.replaceState({},'',url);window.dispatchEvent(new window.PopStateEvent('popstate'));
  await waitFor(()=>q('[data-pop-overview-title]').textContent.includes('黒人')&&window.__map.getLayer('population-fill'),'restored group');
  assert.equal(JSON.stringify(window.__map.getSource('population').data),before);
  assert.equal(q('[data-pop-selected]').hidden,false);
  assert.match(q('[data-pop-selected-title]').textContent,/New York County/);
  assert.equal(q('[data-pop-selected-composition] tbody').children.length,8);
 }finally{await window.happyDOM.close();}
});
test('vote focus zooms the shared map and has a truthful Alaska limitation',async()=>{
 const {window,q}=await setup('?popView=vote');
 try{
  await waitFor(()=>window.__map.getLayer('population-fill'),'votes');
  const map=window.__map,moves=map.cameraChanges,source=map.getSource('population');
  change(window,q('[data-pop-vote-state]'),'48');
  assert.equal(q('[data-pop-overview-title]').textContent,'テキサスの投票分布');assert.ok(map.cameraChanges>moves);assert.equal(map.getSource('population'),source);
  assert.match(q('[data-pop-reading-body]').textContent,/Harris/);
  pick(window,'county:48201');assert.equal(q('[data-pop-selected]').hidden,false);
  change(window,q('[data-pop-vote-state]'),'33');assert.match(q('[data-pop-overview-title]').textContent,/ニューハンプシャー/);
  change(window,q('[data-pop-vote-state]'),'02');assert.match(q('[data-pop-reading-body]').textContent,/収録していません/);
  q('[data-pop-reading-reset]').click();assert.equal(q('[data-pop-vote-state]').value,'');assert.equal(q('[data-pop-selected]').hidden,true);
 }finally{await window.happyDOM.close();}
});
test('no-WebGL fallbacks use the categorical map and focused vote extent',async()=>{
 const {window,q,requests}=await setup('',true);
 try{
  q('[data-pop-view="ethnicity"]').click();await waitFor(()=>q('[data-fallback-image]').src.includes('ethnicity-concentration.webp'),'categorical fallback');
  const src=q('[data-fallback-image]').src;q('[data-pop-group="white"]').click();assert.equal(q('[data-fallback-image]').src,src);
  q('[data-pop-view="vote"]').click();await waitFor(()=>q('[data-fallback-image]').src.endsWith('vote.webp'),'vote fallback');
  change(window,q('[data-pop-vote-state]'),'33');assert.match(q('[data-fallback-image]').src,/vote-state-33.webp/);
  q('[data-pop-reading-reset]').click();assert.match(q('[data-fallback-image]').src,/\/vote.webp$/);
  q('[data-pop-view="religion"]').click();await waitFor(()=>q('[data-pop-status]').textContent.includes('3,108 郡'),'religion');
  assert.match(q('[data-fallback-image]').src,/religion-dominant.webp/);assert.ok(!requests.some(x=>x.includes('metro-')));
 }finally{await window.happyDOM.close();}
});
test('late ethnicity data cannot repaint a newer religion selection',async()=>{
 const {window,q}=await setup();let release;
 try{
  const fetch=window.fetch;window.fetch=async url=>{if(String(url).endsWith('ethnicity.json.gz'))await new Promise(resolve=>release=resolve);return fetch(url);};
  q('[data-pop-view="ethnicity"]').click();await waitFor(()=>release,'held ethnicity');
  q('[data-pop-view="religion"]').click();await waitFor(()=>q('[data-pop-status]').textContent.includes('3,108 郡'),'religion ready');
  q('[data-pop-place-story="utah-lds"]').click();release();await delay();
  assert.match(q('[data-pop-overview-title]').textContent,/末日聖徒/);assert.ok(window.__map.getSource('population'));
 }finally{release?.();await window.happyDOM.close();}
});

test('inline readings preserve the map and return to the original takeaway',async()=>{
 const {window,q,requests}=await setup('?popView=ethnicity');
 try{
  await waitFor(()=>window.__map.getLayer('population-fill'),'map');
  const source=window.__map.getSource('population'),moves=window.__map.cameraChanges,count=requests.length;
  q('[data-pop-group="black"]').click();const key=q('[data-pop-key]').textContent;
  const press=label=>Array.from(window.document.querySelectorAll('.population-reading-action')).find(b=>b.textContent===label).click();
  press('五大湖のデトロイトで仕事と移住を読む');
  assert.equal(q('[data-pop-overview-title]').textContent,'デトロイト');
  assert.match(q('[data-pop-key]').textContent,/住宅差別/);
  assert.doesNotMatch(q('[data-pop-reading-body]').textContent,/周りの密度/);
  press('← 前の解説へ戻る');assert.equal(q('[data-pop-key]').textContent,key);
  assert.equal(new URL(window.location.href).searchParams.get('popEthnicity'),'black');
  assert.equal(window.__map.getSource('population'),source);assert.equal(window.__map.cameraChanges,moves);assert.equal(requests.length,count);
  q('[data-pop-reading-reset]').click();assert.equal(q('[data-pop-overview]').hidden,true);
  q('[data-pop-view="religion"]').click();await waitFor(()=>/3,108/.test(q('[data-pop-status]').textContent),'religion');
  press('② ユタへの移住と共同体を読む');assert.match(q('[data-pop-key]').textContent,/西方移住/);
  press('← 前の解説へ戻る');assert.match(q('[data-pop-key]').textContent,/バプテスト/);
 }finally{await window.happyDOM.close();}
});
