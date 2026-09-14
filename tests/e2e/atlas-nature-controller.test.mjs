import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {projectNatureFallback,containedMapBox} from '../../src/lib/atlas-nature-labels.ts';

// Mock only WebGL's rendering boundary. The actual page, state codec, selectors,
// card logic and data loaders execute unchanged; browser layout is tested separately.
const stub=`export function setWorkerCount(){};export class Map {
 constructor(options){if(window.__forceMapFail)throw Error('WebGL unavailable');window.__map=this;this.options=options;this.events={};this.center={lng:-96,lat:38};this.zoom=3;this.sources=Object.fromEntries(Object.entries(options.style.sources).map(([id,s])=>[id,{data:s.data,setDataCalls:0,setData(d){this.data=d;this.setDataCalls++}}]));this.touchZoomRotate={disableRotation(){}};this.scrollZoom={disable(){}};this.cameraChanges=0;}
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
async function setup(query='',options={}){
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/nature/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 const html=await readFile('dist/atlas/north-america/nature/index.html','utf8');
 window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
 window.__forceMapFail=options.fallback;
 const frame=window.document.querySelector('[data-map-frame]'),image=window.document.querySelector('[data-fallback-image]');
 Object.defineProperties(frame,{clientWidth:{value:788},clientHeight:{value:500}});
 frame.getBoundingClientRect=()=>({left:0,top:0,right:788,bottom:500,width:788,height:500});
 image.getBoundingClientRect=()=>({left:0,top:0,right:788,bottom:460,width:788,height:460});
 window.ResizeObserver=class {observe(){}disconnect(){}};
 window.createImageBitmap=async()=>({width:1,height:1,close(){}});
 window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData:()=>({width:1,height:1,data:new Uint8ClampedArray([window.__climateId??9,0,0,255])})});
 const requests=[];
 window.fetch=async (url)=>{requests.push(String(url));return new Response(await readFile('public/'+String(url).replace(/^.*?\/insight-journal\//,'')));};
 options.beforeStart?.(window);
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
  q('[data-nature-mode="water"]').click();await delay();assert.equal(q('[data-climate-chart]').hidden,true);assert.equal(q('[data-city-picker]').hidden,true);assert.match(q('[data-fallback-image]').alt,/水資源/);
  q('[data-field="agriculture"]').click();assert.equal(root.dataset.field,'agriculture');
  q('[data-field="natural"]').click();q('[data-nature-mode="climate"]').click();await delay();assert.equal(q('[data-city-select]').value,selected);assert.equal(q('[data-climate-chart]').hidden,false);assert.equal(window.__map.cameraChanges,moves);
  q('[data-clear-city]').click();assert.equal(q('[data-nature-detail]').hidden,true);assert.equal(new URL(window.location.href).searchParams.get('city'),null);
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


test('12都市名と点は同じ図を選択し、閉じる・Escapeで元のボタンへ戻る',async()=>{
 const {window,root,q}=await setup();
 try{
  const nodes=[...root.querySelectorAll('[data-label-mode="climate"]')];assert.equal(nodes.length,12);
  const moves=window.__map.cameraChanges;
  for(const button of nodes){
   assert.equal(button.hidden,false);button.focus();button.click();
   const id=button.dataset.natureLabel.slice(5);
   assert.equal(q('[data-city-panel="'+id+'"]').hidden,false);assert.equal(button.getAttribute('aria-pressed'),'true');
   assert.equal(new URL(window.location.href).searchParams.get('city'),id);
   q('[data-clear-city]').focus();q('[data-clear-city]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert.equal(q('[data-nature-detail]').hidden,true);assert.equal(window.document.activeElement,button);assert.equal(button.getAttribute('aria-pressed'),'false');
  }
  const config=JSON.parse(q('[data-explorer-config]').textContent);
  for(const city of config.climateCities){
   const point=window.__map.project([city.longitude,city.latitude]);
   for(const fn of window.__map.events.click)fn({point,lngLat:{lng:city.longitude,lat:city.latitude}});
   assert.equal(q('[data-city-select]').value,city.id);
   assert.equal(q('[data-nature-label="city:'+city.id+'"]').getAttribute('aria-pressed'),'true');
  }
  assert.equal(window.__map.cameraChanges,moves);
  q('[data-nature-label="city:chicago"]').dispatchEvent(new window.PointerEvent('pointerdown',{clientX:100,clientY:100,bubbles:true}));
  q('[data-nature-label="city:chicago"]').dispatchEvent(new window.PointerEvent('pointermove',{clientX:125,clientY:100,bubbles:true}));
  const previous=q('[data-city-select]').value;
  q('[data-nature-label="city:chicago"]').dispatchEvent(new window.MouseEvent('click',{detail:1,bubbles:true}));assert.equal(q('[data-city-select]').value,previous);
  for(let i=0;i<3;i++){q('[data-nature-mode="landform"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','landform ready');q('[data-nature-mode="climate"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','climate ready');}
  assert.equal(root.querySelectorAll('[data-nature-label]').length,40);nodes.forEach(button=>assert.equal(button.isConnected,true));
 }finally{await window.happyDOM.close();}
});

test('9地形名は固有説明を開き、大西洋岸平野の既存URL識別子を維持する',async()=>{
 const {window,root,q}=await setup('?env=landform');
 try{
  const nodes=[...root.querySelectorAll('[data-label-mode="landform"]')];assert.equal(nodes.length,9);
  const config=JSON.parse(q('[data-explorer-config]').textContent),moves=window.__map.cameraChanges;
  for(const button of nodes){
   assert.equal(button.hidden,false);button.click();const key=button.dataset.natureLabel;
   assert.equal(q('[data-nature-detail-text]').textContent,config.natureFeatureCopy[key].full);
   assert.equal(q('[data-nature-detail-title]').textContent,config.natureFeatureCopy[key].title);
   assert.equal(new URL(window.location.href).searchParams.get('natureFeature'),key);
   q('[data-close-nature-detail]').click();assert.equal(window.document.activeElement,button);
  }
  const coastal=q('[data-nature-label="landform:大西洋海岸平野"]');assert.equal(coastal.textContent,'大西洋岸平野');coastal.click();
  assert.equal(window.__map.cameraChanges,moves);const saved=window.location.href;q('[data-nature-mode="climate"]').click();
  window.history.replaceState({},'',saved);window.dispatchEvent(new window.PopStateEvent('popstate'));await delay();
  assert.equal(root.dataset.natureMode,'landform');assert.equal(coastal.getAttribute('aria-pressed'),'true');
  assert.equal(window.__map.center.lng,-96);assert.equal(window.__map.center.lat,38);
 }finally{await window.happyDOM.close();}
});

test('通常図・WebGL停止・初期代替図で同じ分類IDと大区分見出しを使う',async()=>{
 for(const fallback of [false,true]){
  const {window,root,q,requests}=await setup('',{fallback});
  try{
   assert.equal(root.dataset.renderState,fallback?'fallback':'ready');
   const box=containedMapBox({left:0,top:0,right:788,bottom:460});
   const climatePoint=projectNatureFallback([-105,30],box);
   const clickFallback=()=>q('.atlas-fallback-map').dispatchEvent(new window.MouseEvent('click',{clientX:climatePoint.x,clientY:climatePoint.y,bubbles:true}));
   if(fallback)clickFallback();else for(const fn of window.__map.events.click)fn({point:{x:230,y:220},lngLat:{lng:-105,lat:30}});
   await waitFor(()=>q('[data-nature-detail-title]').textContent.includes('Csb'),'climate selected');
   assert.equal(q('[data-nature-detail-title]').textContent,'温帯｜地中海性・温暖な夏（Csb）');
   assert.match(q('[data-nature-detail-text]').textContent,/1991–2020/);assert.equal(q('[data-nature-detail-link]').hash,'#source-koppen');
   if(!fallback){q('[data-map-surface]').dispatchEvent(new window.Event('webglcontextlost'));assert.equal(root.dataset.renderState,'fallback');clickFallback();await delay();assert.match(q('[data-nature-detail-title]').textContent,/温帯/);}
   const config=JSON.parse(q('[data-explorer-config]').textContent),city=config.climateCities.find(c=>c.id==='chicago');
   const point=projectNatureFallback([city.longitude,city.latitude],box);
   q('.atlas-fallback-map').dispatchEvent(new window.MouseEvent('click',{clientX:point.x,clientY:point.y,bubbles:true}));assert.equal(q('[data-city-select]').value,'chicago');
   q('[data-nature-mode="landform"]').click();await delay();q('[data-nature-label="landform:ロッキー山脈"]').click();assert.equal(q('[data-nature-detail-title]').textContent,'ロッキー山脈');
   assert.match(q('[data-fallback-image]').src,/landform-interactive.webp$/);assert.match(q('[data-fallback-full]').href,/landform-fallback.webp$/);
   assert.equal(requests.filter(url=>url.endsWith('climate-classes.png')).length,1);
  }finally{await window.happyDOM.close();}
 }
});

test('未収録セルとドラッグに気候区分を割り当てず、遅い分類応答が都市選択を上書きしない',async()=>{
 const absent=await setup('',{fallback:true,beforeStart(window){window.__climateId=0;}});
 try{
  const {window,root,q}=absent,box=containedMapBox({left:0,top:0,right:788,bottom:460}),p=projectNatureFallback([-105,30],box);
  q('.atlas-fallback-map').dispatchEvent(new window.MouseEvent('click',{clientX:p.x,clientY:p.y,bubbles:true}));await delay();
  assert.equal(q('[data-nature-detail]').hidden,true);assert.match(q('[data-atlas-live]').textContent,/収録されていません/);
  q('[data-nature-label="city:miami"]').click();
  q('.atlas-fallback-map').dispatchEvent(new window.PointerEvent('pointerdown',{clientX:p.x,clientY:p.y,bubbles:true}));
  q('.atlas-fallback-map').dispatchEvent(new window.PointerEvent('pointermove',{clientX:p.x+20,clientY:p.y,bubbles:true}));
  q('.atlas-fallback-map').dispatchEvent(new window.PointerEvent('pointerup',{bubbles:true}));
  q('.atlas-fallback-map').dispatchEvent(new window.MouseEvent('click',{clientX:p.x+20,clientY:p.y,detail:1,bubbles:true}));await delay();
  assert.equal(q('[data-city-select]').value,'miami');assert.equal(q('[data-climate-chart]').hidden,false);
 }finally{await absent.window.happyDOM.close();}
 let release;
 const delayed=await setup('',{fallback:true,beforeStart(window){window.createImageBitmap=async()=>{await new Promise(resolve=>release=resolve);return {width:1,height:1,close(){}};};}});
 try{
  const {window,q}=delayed,box=containedMapBox({left:0,top:0,right:788,bottom:460}),p=projectNatureFallback([-105,30],box);
  q('.atlas-fallback-map').dispatchEvent(new window.MouseEvent('click',{clientX:p.x,clientY:p.y,bubbles:true}));await waitFor(()=>release,'image waiting');
  q('[data-nature-label="city:seattle"]').click();release();await delay();
  assert.equal(q('[data-city-select]').value,'seattle');assert.equal(q('[data-climate-chart]').hidden,false);
 }finally{release?.();await delayed.window.happyDOM.close();}
});

test('概要欄の図と気候区分は共存し、閉じる・解除・履歴でそれぞれの状態を保つ',async()=>{
 const {window,root,q,requests}=await setup('?city=seattle&natureFeature=climate:Csb&crop=rice');
 try{
  const chart=q('[data-climate-chart]'),figure=q('[data-city-panel="seattle"]'),picker=q('[data-city-select]');
  assert.equal(root.querySelectorAll('[data-city-select]').length,1);
  assert.ok(chart.closest('[data-nature-summary-panel="climate"]'));assert.equal(q('[data-nature-detail]').contains(chart),false);
  assert.equal(chart.hidden,false);assert.equal(q('[data-nature-detail]').hidden,false);
  assert.equal(q('[data-nature-label="city:seattle"]').getAttribute('aria-pressed'),'true');
  const both=window.location.href,moves=window.__map.cameraChanges;
  q('[data-close-nature-detail]').click();assert.equal(chart.hidden,false);assert.equal(new URL(window.location.href).searchParams.get('city'),'seattle');
  q('[data-nature-label="city:seattle"]').click();q('[data-nature-label="city:seattle"]').click();assert.equal(chart.hidden,false);
  for(const fn of window.__map.events.click)fn({point:{x:230,y:220},lngLat:{lng:-105,lat:30}});
  await waitFor(()=>!q('[data-nature-detail]').hidden,'area popup');
  assert.equal(chart.hidden,false);assert.equal(q('[data-nature-label="city:seattle"]').getAttribute('aria-pressed'),'true');
  q('[data-clear-city]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(q('[data-nature-detail]').hidden,true);assert.equal(chart.hidden,false);
  assert.equal(window.__map.cameraChanges,moves);
  window.history.replaceState({},'',both);window.dispatchEvent(new window.PopStateEvent('popstate'));await delay();
  assert.equal(chart.hidden,false);assert.equal(q('[data-nature-detail]').hidden,false);
  picker.value='';picker.dispatchEvent(new window.Event('change'));
  assert.equal(chart.hidden,true);assert.equal(q('[data-city-empty]').hidden,false);assert.equal(q('[data-nature-detail]').hidden,false);
  assert.equal(new URL(window.location.href).searchParams.get('city'),null);assert.equal(new URL(window.location.href).searchParams.get('natureFeature'),'climate:Csb');assert.equal(new URL(window.location.href).searchParams.get('crop'),'rice');
  q('[data-nature-label="city:seattle"]').click();const details=figure.querySelector('details');details.open=true;
  q('[data-field="agriculture"]').click();q('[data-map-surface]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(new URL(window.location.href).searchParams.get('city'),'seattle');
  q('[data-field="natural"]').click();assert.equal(chart.hidden,false);assert.equal(figure.querySelector('details'),details);assert.equal(details.open,true);
  assert.equal(root.querySelectorAll('[data-city-panel]:not([hidden])').length,1);assert.equal(root.querySelectorAll('[data-city-panel]').length,12);
  assert.equal(window.__map.cameraChanges,moves+1);assert.equal(requests.filter(url=>url.endsWith('climate-classes.png')).length,1);
 }finally{await window.happyDOM.close();}
});

test('画面外でも雨温図を保ち、明示した時だけ都市へ戻り、解除時は見える操作へフォーカスする',async()=>{
 const {window,q}=await setup();
 try{
  const map=window.__map,button=q('[data-nature-label="city:miami"]');button.click();
  const oldBounds=map.getBounds.bind(map),oldProject=map.project.bind(map),moves=map.cameraChanges;
  map.getBounds=()=>({...oldBounds(),contains:()=>false});map.project=()=>({x:-100,y:-100});
  for(const fn of map.events.moveend)fn();await waitFor(()=>button.hidden,'offscreen label hidden');
  assert.equal(button.hidden,true);assert.equal(q('[data-climate-chart]').hidden,false);assert.equal(q('[data-focus-city]').hidden,false);assert.equal(map.cameraChanges,moves);
  q('[data-clear-city]').click();assert.equal(window.document.activeElement,q('[data-city-select]'));
  q('[data-city-select]').value='miami';q('[data-city-select]').dispatchEvent(new window.Event('change'));
  const city=JSON.parse(q('[data-explorer-config]').textContent).climateCities.find(c=>c.id==='miami');
  q('[data-focus-city]').click();assert.equal(map.cameraChanges,moves+1);assert.equal(map.center.lng,city.longitude);assert.equal(map.center.lat,city.latitude);
  map.getBounds=oldBounds;map.project=oldProject;for(const fn of map.events.moveend)fn();await delay();assert.equal(q('[data-focus-city]').hidden,true);
  q('[data-map-surface]').dispatchEvent(new window.Event('webglcontextlost'));assert.equal(q('[data-focus-city]').hidden,true);assert.equal(q('[data-climate-chart]').hidden,false);
 }finally{await window.happyDOM.close();}
});


test('19水資源は名前から右欄へ開き、概説は選択に左右されず不要UIは存在しない',async()=>{
 for(const fallback of [false,true]){
  const {window,root,q}=await setup('?city=seattle',{fallback});
  try{
   await waitFor(()=>fallback||root.dataset.natureLoad==='ready','initial climate ready');
   const overview=q('[data-climate-overview]'),text=overview.textContent;
   assert.equal(overview.hidden,false);assert.equal(overview.querySelectorAll('.atlas-overview-row').length,8);
   assert.equal(q('[data-feature-picker]'),null);assert.equal(q('[data-climate-month]'),null);assert.equal(q('.atlas-station-tables'),null);
   q('[data-climate-code="Csa"]').click();assert.equal(q('[data-nature-detail]').hidden,false);assert.equal(q('[data-selection]').hidden,true);
   assert.equal(q('[data-climate-chart]').hidden,false);assert.equal(overview.textContent,text);
   q('[data-nature-mode="water"]').click();await waitFor(()=>fallback||root.dataset.natureLoad==='ready','water names ready');await delay();assert.equal(overview.hidden,true);
   const names=[...root.querySelectorAll('[data-label-mode="water"]')];assert.equal(names.length,19);
   for(const name of names){
    assert.equal(name.hidden,false);name.focus();name.click();
    assert.equal(q('[data-selection]').hidden,true);assert.equal(q('[data-nature-detail]').hidden,false);
    assert.ok(q('[data-natural-summary]').contains(q('[data-nature-detail]')));
    assert.equal(q('[data-nature-detail-title]').textContent,name.textContent);
    assert.equal(new URL(window.location.href).searchParams.get('natureFeature'),name.dataset.natureLabel);
    q('[data-close-nature-detail]').click();assert.equal(window.document.activeElement,name);
   }
   assert.match(q('[data-fallback-image]').src,/water-interactive.webp$/);
   assert.match(q('[data-fallback-full]').href,/water-fallback.webp$/);
   q('[data-nature-mode="climate"]').click();assert.equal(overview.hidden,false);assert.equal(overview.textContent,text);
   assert.equal(q('[data-city-select]').value,'seattle');assert.equal(q('[data-climate-chart]').hidden,false);await waitFor(()=>fallback||root.dataset.natureLoad==='ready','climate restored');
  }finally{await window.happyDOM.close();}
 }
});
