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
 on(name,fn){(this.events[name]??=[]).push(fn)}once(name,fn){this.on(name,fn);if(name==='load'&&!window.__deferMapLoad)queueMicrotask(()=>fn())}
 jumpTo(o){this.cameraChanges++;this.center={lng:o.center[0],lat:o.center[1]};this.zoom=o.zoom??this.zoom}fitBounds(){this.cameraChanges++}
 zoomIn(){this.zoom++}zoomOut(){this.zoom--}getCanvas(){return {getContext:()=>null}}
}`;
const bundle=await build({entryPoints:['src/scripts/atlas-explorer.ts'],bundle:true,write:false,format:'iife',globalName:'NatureTest',plugins:[{name:'map-boundary',setup(b){b.onResolve({filter:/^maplibre-gl$/},()=>({path:'maplibre',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:stub,loader:'js'}));}}]});
const delay=()=>new Promise(resolve=>setTimeout(resolve,25));
async function waitFor(check,label){for(let attempt=0;attempt<120;attempt++){if(check())return;await delay();}throw new Error('Timed out: '+label);}
async function setup(query='',options={}){
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/'+(options.fieldPath??'nature')+'/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 const html=await readFile('dist/atlas/north-america/nature/index.html','utf8');
 window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
 window.__forceMapFail=options.fallback;
 const frame=window.document.querySelector('[data-map-frame]'),image=window.document.querySelector('[data-fallback-image]');
 Object.defineProperties(frame,{clientWidth:{value:788},clientHeight:{value:500}});
 frame.getBoundingClientRect=()=>({left:0,top:0,right:788,bottom:500,width:788,height:500});
 image.getBoundingClientRect=()=>({left:0,top:0,right:788,bottom:460,width:788,height:460});
 if(options.relativeImageGeometry){Object.defineProperties(image,{clientWidth:{value:788},clientHeight:{value:460},offsetLeft:{value:0},offsetTop:{value:0},offsetParent:{value:frame}});image.getBoundingClientRect=()=>({left:-350,top:0,right:438,bottom:460,width:788,height:460});}
 window.ResizeObserver=class {observe(){}disconnect(){}};
 window.createImageBitmap=async()=>({width:1,height:1,close(){}});
 window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData:()=>({width:1,height:1,data:new Uint8ClampedArray([window.__climateId??9,0,0,255])})});
 const requests=[];
 window.fetch=async (url)=>{requests.push(String(url));return new Response(await readFile('public/'+String(url).replace(/^.*?\/insight-journal\//,'')));};
 options.beforeStart?.(window);
 window.Response=Response;window.DecompressionStream=DecompressionStream;
 const entry=window.eval(bundle.outputFiles[0].text+"; NatureTest;");await entry.startAtlas();await waitFor(()=>options.pending||options.fallback||window.document.querySelector('[data-atlas-explorer]').dataset.natureLoad==='ready','initial data ready');await delay();
 return {window,requests,root:window.document.querySelector('[data-atlas-explorer]'),q:s=>window.document.querySelector(s)};
}

test('12都市は地図から切り替え、モード・分野を往復しても都市とカメラを保つ',async()=>{
 const {window,root,q}=await setup('?city=miami&crop=rice&region=sacramento-rice&lng=-120&lat=38&z=5');
 try{
  assert.equal(root.dataset.selectedCity,'miami');const moves=window.__map.cameraChanges;
  const config=JSON.parse(q('[data-explorer-config]').textContent);
  for(const city of config.climateCities){
   q('[data-nature-label="city:'+city.id+'"]').click();
   const panel=q('[data-city-panel="'+city.id+'"]');assert.equal(panel.hidden,false);
   assert.equal(panel.dataset.cityCode,city.koppenCode??'');
   assert.equal(panel.querySelectorAll('.atlas-climate-bar').length,12);
   assert.match(panel.querySelector('svg').textContent,new RegExp(city.nameJa));
  }
  const selected=root.dataset.selectedCity;
  q('[data-nature-mode="water"]').click();await delay();assert.equal(q('[data-climate-chart]').hidden,true);
  q('[data-field="agriculture"]').click();q('[data-field="natural"]').click();q('[data-nature-mode="climate"]').click();await delay();
  assert.equal(root.dataset.selectedCity,selected);assert.equal(q('[data-climate-chart]').hidden,false);assert.equal(window.__map.cameraChanges,moves);
  for(const selector of ['[data-city-select]','[data-clear-city]','[data-focus-city]','[data-city-empty]','[data-climate-code]','.atlas-city-note'])assert.equal(q(selector),null);
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


test('都市名・点・キーボードは同じ図を選び、再選択やEscapeは解除せずドラッグは無視する',async()=>{
 const {window,root,q}=await setup();
 try{
  const nodes=[...root.querySelectorAll('[data-label-mode="climate"]')];assert.equal(nodes.length,12);
  const moves=window.__map.cameraChanges;
  for(const button of nodes){
   assert.equal(button.hidden,false);button.focus();button.click();button.click();
   const id=button.dataset.natureLabel.slice(5);
   button.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   assert.equal(root.dataset.selectedCity,id);assert.equal(button.getAttribute('aria-pressed'),'true');
   assert.equal(window.document.activeElement,button);assert.equal(new URL(window.location.href).searchParams.get('city'),id);
  }
  const config=JSON.parse(q('[data-explorer-config]').textContent);
  for(const city of config.climateCities){
   for(const fn of window.__map.events.click)fn({point:window.__map.project([city.longitude,city.latitude]),lngLat:{lng:city.longitude,lat:city.latitude}});
   assert.equal(root.dataset.selectedCity,city.id);
  }
  const button=q('[data-nature-label="city:chicago"]'),previous=root.dataset.selectedCity;
  button.dispatchEvent(new window.PointerEvent('pointerdown',{clientX:100,clientY:100,bubbles:true}));
  button.dispatchEvent(new window.PointerEvent('pointermove',{clientX:125,clientY:100,bubbles:true}));
  button.dispatchEvent(new window.MouseEvent('click',{detail:1,bubbles:true}));assert.equal(root.dataset.selectedCity,previous);
  for(let i=0;i<3;i++){q('[data-nature-mode="landform"]').click();await delay();q('[data-nature-mode="climate"]').click();await delay();}
  assert.equal(root.querySelectorAll('[data-nature-label]').length,40);nodes.forEach(button=>assert.ok(button.isConnected));
  assert.equal(window.__map.cameraChanges,moves);
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

test('通常図・WebGL停止・初期代替図でコードは常時表示し、色のタップは都市を変えない',async()=>{
 for(const fallback of [false,true]){
  const {window,root,q,requests}=await setup('',{fallback});
  try{
   assert.equal(root.dataset.selectedCity,'los-angeles');
   const codeNodes=[...root.querySelectorAll('[data-climate-map-code]')];assert.ok(codeNodes.length>20&&codeNodes.length<=120);
   for(const code of ['Csa','Csb','BWh','BWk','BSk','Cfa','Dfa','Dfb','Am'])assert.ok(codeNodes.some(n=>!n.hidden&&n.textContent===code),'principal code visible: '+code);
   assert.ok(codeNodes.every(n=>n.tagName==='SPAN'&&n.getAttribute('aria-hidden')==='true'));
   const box=containedMapBox({left:0,top:0,right:788,bottom:460}),p=projectNatureFallback([-105,30],box);
   if(fallback)q('.atlas-fallback-map').dispatchEvent(new window.MouseEvent('click',{clientX:p.x,clientY:p.y,bubbles:true}));
   else for(const fn of window.__map.events.click)fn({point:{x:230,y:220},lngLat:{lng:-105,lat:30}});
   assert.equal(root.dataset.selectedCity,'los-angeles');assert.equal(q('[data-nature-detail]').hidden,true);
   if(!fallback){q('[data-map-surface]').dispatchEvent(new window.Event('webglcontextlost'));await delay();assert.equal(root.dataset.renderState,'fallback');}
   const city=JSON.parse(q('[data-explorer-config]').textContent).climateCities.find(c=>c.id==='chicago'),point=projectNatureFallback([city.longitude,city.latitude],box);
   q('.atlas-fallback-map').dispatchEvent(new window.MouseEvent('click',{clientX:point.x,clientY:point.y,bubbles:true}));
   assert.equal(root.dataset.selectedCity,'chicago');assert.match(q('[data-city-panel="chicago"] h4').textContent,/Dfa/);
   assert.equal(requests.filter(url=>url.endsWith('climate-classes.png')).length,0);
   assert.equal(root.querySelectorAll('[data-climate-map-code]').length,codeNodes.length);
  }finally{await window.happyDOM.close();}
 }
});


test('不正な都市はLA、DCの欠測は未分類のままとし、旧ハッシュは都市に復元する',async()=>{
 for(const [query,expected] of [['?city=unknown','los-angeles'],['?city=washington-dc','washington-dc'],['#climate-table-miami','miami']]){
  const {window,root,q}=await setup(query,{fallback:true});
  try{
   assert.equal(root.dataset.selectedCity,expected);assert.equal(new URL(window.location.href).searchParams.get('city'),expected);
   if(expected==='washington-dc'){const panel=q('[data-city-panel="washington-dc"]');assert.match(panel.querySelector('h4').textContent,/データなし/);assert.match(panel.querySelector('[data-city-cause] h5').textContent,/季節変化/);assert.equal(panel.querySelector('.atlas-city-code-meaning'),null);assert.equal(panel.querySelectorAll('.atlas-climate-bar').length,12);}
  }finally{await window.happyDOM.close();}
 }
});


test('各気候区分の概説は初期に閉じ、都市・モード・履歴の変更で開閉状態を保つ',async()=>{
 const {window,root,q}=await setup('?city=seattle&natureFeature=climate:Csb&crop=rice');
 try{
  const overview=q('[data-climate-overview]'),figure=q('[data-city-panel="seattle"]');
  assert.equal(overview.tagName,'DETAILS');assert.equal(overview.open,false);assert.equal(overview.querySelector('summary').textContent,'各気候区分の概説');
  assert.equal(overview.querySelectorAll('.atlas-overview-row').length,8);assert.equal(q('[data-nature-detail]').hidden,true);
  assert.equal(new URL(window.location.href).searchParams.get('natureFeature'),null);
  const saved=window.location.href,text=overview.textContent;overview.open=true;figure.querySelector('[data-city-numbers]').open=true;
  q('[data-nature-label="city:los-angeles"]').click();q('[data-nature-mode="water"]').click();await delay();assert.equal(overview.hidden,true);
  q('[data-nature-mode="climate"]').click();assert.equal(overview.open,true);assert.equal(overview.textContent,text);
  window.history.replaceState({},'',saved);window.dispatchEvent(new window.PopStateEvent('popstate'));await delay();
  assert.equal(root.dataset.selectedCity,'seattle');assert.equal(overview.open,true);assert.equal(figure.querySelector('[data-city-numbers]').open,true);
  assert.equal(root.querySelectorAll('[data-city-panel]:not([hidden])').length,1);assert.equal(root.querySelectorAll('[data-city-panel]').length,12);
  assert.equal(new URL(window.location.href).searchParams.get('crop'),'rice');
 }finally{await window.happyDOM.close();}
});


test('都市が画面外に出ても雨温図を保ち、自動移動やWebGL停止で選択を変えない',async()=>{
 const {window,root,q}=await setup();
 try{
  const map=window.__map,button=q('[data-nature-label="city:miami"]');button.click();const moves=map.cameraChanges;
  map.getBounds=()=>({contains:()=>false});map.project=()=>({x:-100,y:-100});
  for(const fn of map.events.moveend)fn();await waitFor(()=>button.hidden,'offscreen label hidden');
  assert.equal(q('[data-climate-chart]').hidden,false);assert.equal(map.cameraChanges,moves);assert.equal(root.dataset.selectedCity,'miami');
  q('[data-map-surface]').dispatchEvent(new window.Event('webglcontextlost'));assert.equal(q('[data-climate-chart]').hidden,false);assert.equal(root.dataset.selectedCity,'miami');
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
   q('[data-nature-label="city:seattle"]').click();assert.equal(q('[data-nature-detail]').hidden,true);assert.equal(q('[data-selection]').hidden,true);
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
   assert.equal(root.dataset.selectedCity,'seattle');assert.equal(q('[data-climate-chart]').hidden,false);await waitFor(()=>fallback||root.dataset.natureLoad==='ready','climate restored');
  }finally{await window.happyDOM.close();}
 }
});


test('代替画像のレイアウト座標を使い、画面の位置が変わっても西部の水資源名を失わない',async()=>{
 const {window,root}=await setup('?env=water',{fallback:true,relativeImageGeometry:true});
 try{assert.equal(root.querySelectorAll('[data-label-mode="water"]:not([hidden])').length,19);}finally{await window.happyDOM.close();}
});

test('都市の理由と近郊の品目リンクは分類に依存せず、遷移先で該当本文・統計を開く',async()=>{
 const {window,root,q}=await setup('?city=denver&crop=rice&region=sacramento-rice&lng=-104.8&lat=39.7&z=5&sector=services',{fallback:true});
 const targets=[];
 try{
  for(const panel of root.querySelectorAll('[data-city-panel]')){
   assert.ok(panel.querySelector('[data-city-cause] p').textContent.length>30);
   assert.match(panel.querySelector('[data-city-crop] summary').textContent,/周辺の農業・畜産/);
   assert.ok(panel.querySelector('.atlas-city-region').textContent.includes('郡'));
   for(const link of panel.querySelectorAll('[data-city-agriculture-link]')){
    const url=new URL(link.href);assert.equal(url.searchParams.get('city'),panel.dataset.cityPanel);
    assert.equal(url.searchParams.get('agriProduct'),link.dataset.cityAgricultureLink);
    assert.equal(url.searchParams.get('region'),null);assert.equal(url.searchParams.get('lng'),'-104.80000');
   }
  }
  for(const [city,product] of [['denver','wheat'],['washington-dc','dairy'],['los-angeles','specialty']]){
   q(`[data-nature-label="city:${city}"]`).click();
   targets.push({city,product,url:new URL(q(`[data-city-panel="${city}"] [data-city-agriculture-link="${product}"]`).href)});
  }
 }finally{await window.happyDOM.close();}
 for(const {city,product,url} of targets){
  const next=await setup(url.search+url.hash,{fieldPath:'agriculture',fallback:true});
  try{
   assert.equal(next.root.dataset.field,'agriculture');assert.equal(next.root.dataset.agriReading,'product');
   assert.equal(new URL(next.window.location.href).searchParams.get('agriProduct'),product);
   assert.equal(next.q('#'+(product==='dairy'?'livestock-':'crop-')+product).hidden,false);
   assert.equal(next.q('[data-agri-statistics]').hidden,product==='specialty');
   next.q('[data-field="natural"]').click();
   assert.equal(next.root.dataset.selectedCity,city);assert.equal(next.q(`[data-city-panel="${city}"]`).hidden,false);
  }finally{await next.window.happyDOM.close();}
 }
});

test('農畜産物は収まらなくても開閉でき、手動の選択を都市切替やリサイズで失わない',async()=>{
 let bottom=1000;
 const {window,q}=await setup('',{fallback:true,beforeStart:window=>{
  for(const reading of window.document.querySelectorAll('[data-city-reading]'))reading.getBoundingClientRect=()=>({bottom});
 }});
 try{
  const crop=q('[data-city-panel="los-angeles"] [data-city-crop]');
  assert.equal(crop.hidden,false);assert.equal(crop.open,false);
  crop.querySelector('summary').click();assert.equal(crop.open,true);
  q('[data-nature-label="city:denver"]').click();q('[data-nature-label="city:los-angeles"]').click();await delay();
  window.dispatchEvent(new window.Event('resize'));assert.equal(crop.open,true);
  crop.querySelector('summary').click();bottom=200;window.dispatchEvent(new window.Event('resize'));assert.equal(crop.open,false);
 }finally{await window.happyDOM.close();}
});

test('水資源の新3タブは選択・URL・親流域・従来表示を保つ',async()=>{
 const {window,root,q,requests}=await setup('?env=water&waterView=precipitation&precipBand=1000-1500&city=denver');
 try{
  await waitFor(()=>q('[data-water-title]').textContent==='1,000〜1,500mm未満','precipitation selected');
  assert.equal(q('[data-water-reading]').hidden,false);assert.equal(q('[data-nature-detail]').hidden,true);
  await waitFor(()=>!q('[data-water-labels]').hidden&&!q('[data-water-label="1000-1500"]').hidden,'water labels visible');
  const moves=window.__map.cameraChanges;
  q('[data-water-view="basins"]').click();await waitFor(()=>root.dataset.natureLoad==='ready','basin loaded');
  q('[data-water-label="missouri"]').click();assert.match(q('[data-water-body]').textContent,/ミシシッピ川水系の一部/);
  assert.equal(new URL(window.location.href).searchParams.get('basin'),'missouri');
  q('[data-water-parent]').click();assert.equal(q('[data-water-title]').textContent,'ミシシッピ川');
  q('[data-water-view="rivers"]').click();await delay();q('[data-nature-label="water:Colorado"]').click();assert.equal(q('[data-nature-detail]').hidden,false);assert.equal(q('[data-water-reading]').hidden,true);
  q('[data-water-view="precipitation"]').click();await delay();assert.equal(q('[data-water-title]').textContent,'1,000〜1,500mm未満');assert.equal(window.__map.cameraChanges,moves);
  assert.equal(requests.filter(x=>x.endsWith('precipitation.geojson.gz')).length,1);assert.equal(requests.filter(x=>x.endsWith('basins.geojson.gz')).length,1);
  assert.equal(new URL(window.location.href).searchParams.get('city'),'denver');
  q('[data-field="agriculture"]').click();assert.equal(q('[data-water-reading]').hidden,true);assert.equal(q('[data-water-tabs]').hidden,true);
 }finally{await window.happyDOM.close();}
});

test('水資源は代替地図でも流域名から解説と農業リンクへ進める',async()=>{
 const {window,q}=await setup('?env=water&waterView=basins&basin=sacramento',{fallback:true});
 try{
  await waitFor(()=>q('[data-water-title]').textContent==='サクラメント川','fallback basin');
  assert.match(q('[data-fallback-image]').src,/basins-fallback.webp$/);
  await waitFor(()=>!q('[data-water-labels]').hidden&&!q('[data-water-label="sacramento"]').hidden,'fallback labels visible');
  assert.equal(q('[data-water-reading]').hidden,false);
  assert.equal(new URL(q('[data-water-product]').href).searchParams.get('agriReading'),'product:rice');
  q('[data-water-label="ohio"]').click();assert.match(q('[data-water-body]').textContent,/テネシー川/);
  q('[data-nature-mode="climate"]').click();assert.equal(q('[data-water-tabs]').hidden,true);assert.equal(q('[data-water-reading]').hidden,true);
 }finally{await window.happyDOM.close();}
});

for(const fallback of [false,true])test(`農業インサイトの往復は地図と産地データを再作成しない（代替図=${fallback}）`,async()=>{
 const {window,requests,root,q}=await setup('?env=landform&view=custom&lng=-100&lat=38&z=4',{fallback});
 try{
  q('[data-field="agriculture"]').click();
  q('[data-crop-key] a[href="#crop-rice"]').click();
  const original=window.location.href,map=window.__map;
  await waitFor(()=>q('.agri-product-line').getAttribute('d')?.length>0,'rice outline');
  const cropRequests=()=>requests.filter(url=>url.endsWith('/agriculture.geojson')).length;
  assert.equal(cropRequests(),1);
  q('[data-agri-insight-link="rice-alluvial"]').click();
  assert.equal(root.dataset.field,'natural');
  assert.equal(root.dataset.selectedProduct,'rice');
  await waitFor(()=>q('.agri-product-line').getAttribute('d')?.length>0&&q('.agri-target-line').getAttribute('d')?.length>0,'comparison outlines');
  assert.equal(q('.agri-insight-back').textContent,'稲作の解説に戻る');
  const destination=window.location.href;
  q('.agri-insight-back').click();
  assert.equal(root.dataset.field,'agriculture');
  assert.equal(root.dataset.agriReading,'product');
  assert.equal(root.dataset.selectedProduct,'rice');
  assert.equal(q('[data-agri-reading-panel]').hidden,false);
  assert.equal(window.__map,map);
  assert.equal(cropRequests(),1);
  for(const key of ['stats','livestockStats','milkBasis','agriProduct','view','lng','lat','z','agriLayers'])assert.equal(new URL(window.location.href).searchParams.get(key),new URL(original).searchParams.get(key),key);
  window.history.replaceState({},'',destination);window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(root.dataset.field,'natural');assert.equal(root.dataset.selectedProduct,'rice');
  const click=new window.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});
  q('.agri-insight-back').dispatchEvent(click);
  assert.equal(click.defaultPrevented,false);assert.equal(root.dataset.field,'natural');
 }finally{await window.happyDOM.close();}
});
test('産地の輪郭は操作地図の準備を待たずに代替図へ表示する',async()=>{
 const {window,root,q,requests}=await setup('?agriProduct=rice&agriReading=product:rice&crop=rice',{
  fieldPath:'agriculture',pending:true,beforeStart:w=>{w.__deferMapLoad=true;}
 });
 try{
  assert.equal(root.dataset.renderState,'loading');
  await waitFor(()=>q('.agri-product-line').getAttribute('d')?.length>0,'early rice outline');
  assert.equal(root.dataset.renderState,'loading');
  assert.equal(requests.filter(url=>url.endsWith('/agriculture.geojson')).length,1);
 }finally{await window.happyDOM.close();}
});
