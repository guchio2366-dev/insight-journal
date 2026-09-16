import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

// Mock only WebGL's rendering boundary. The actual page, state codec, selectors,
// card logic and data loaders execute unchanged; browser layout is tested separately.
const stub=`export function setWorkerCount(){};export class Map {
 constructor(options){if(window.__failMap)throw Error('Test: WebGL unavailable');window.__map=this;this.options=options;this.events={};this.center={lng:-96,lat:38};this.zoom=3;this.sources=Object.fromEntries(Object.entries(options.style.sources).map(([id,s])=>[id,{data:s.data,setDataCalls:0,setData(d){this.data=d;this.setDataCalls++}}]));this.touchZoomRotate={disableRotation(){}};this.scrollZoom={disable(){}};this.cameraChanges=0;}
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
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/industry/'+query,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 const html=await readFile('dist/atlas/north-america/industry/index.html','utf8');
 window.document.body.innerHTML=html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>/g,'');
 window.ResizeObserver=class {observe(){}disconnect(){}};
 window.createImageBitmap=async()=>({width:1,height:1,close(){}});
 window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData:()=>({width:1,height:1,data:new Uint8ClampedArray([9,0,0,255])})});
 window.__failMap=fail;
 Object.defineProperty(window.HTMLElement.prototype,'clientWidth',{get(){return this.hasAttribute('data-map-frame')?800:0;}});
 Object.defineProperty(window.HTMLElement.prototype,'clientHeight',{get(){return this.hasAttribute('data-map-frame')?500:0;}});
 const requests=[];
 window.fetch=async (url)=>{requests.push(String(url));return new Response(await readFile('public/'+String(url).replace(/^.*?\/insight-journal\//,'')));};
 window.Response=Response;window.DecompressionStream=DecompressionStream;
 const entry=window.eval(bundle.outputFiles[0].text+"; NatureTest;");await entry.startAtlas();await delay();
 return {window,requests,root:window.document.querySelector('[data-atlas-explorer]'),q:s=>window.document.querySelector(s)};
}

test('金融→情報通信で右欄の解説を切り替え、構成比の数値とカメラを保つ',async()=>{
 const {window,root,q}=await setup('?sector=services&subsector=finance&lng=-90&lat=35&z=4');
 try{
  assert.equal(root.dataset.field,'industry');const map=window.__map,moves=map.cameraChanges;
  const before=q('[data-industry-national-summary]').innerHTML;
  assert.equal(q('[data-industry-detail="services:finance"]').hidden,false);
  assert.equal(q('[data-industry-description-panel="services:finance"]').hidden,false);assert.equal(q('[data-industry-national-summary]').hidden,false);
  q('[data-industry-subsector="information"]').click();
  assert.equal(q('[data-industry-national-summary]').innerHTML,before);
  assert.equal(q('[data-industry-detail="services:information"]').hidden,false);
  assert.equal(q('[data-industry-description-panel="services:finance"]').hidden,true);assert.equal(q('[data-industry-description-panel="services:information"]').hidden,false);
  q('[data-industry-sector="manufacturing"]').click();
  assert.equal(root.dataset.industrySubsector,'all');assert.equal(q('[data-industry-national-panel="manufacturing"]').hidden,false);assert.equal(q('[data-industry-national-summary]').hidden,false);assert.equal(q('[data-industry-description]').hidden,false);assert.equal(q('[data-industry-description-panel="manufacturing:all"]').hidden,false);
  assert.equal(q('[data-industry-national-panel="services"]').hidden,true);assert.equal(map.cameraChanges,moves);assert.equal(window.__map,map);
 }finally{await window.happyDOM.close();}
});

test('地域選択と食品加工→農業→自然環境→産業の往復、履歴復元が一致する',async()=>{
 const {window,root,q}=await setup('?sector=services&subsector=finance&industryRegion=newyork-finance&crop=rice&city=miami');
 try{
  assert.equal(q('[data-selection-title]').textContent,'ニューヨーク');const map=window.__map,moves=map.cameraChanges;
  const financeURL=window.location.href;
  q('[data-industry-sector="manufacturing"]').click();q('[data-industry-subsector="food"]').click();q('[data-industry-agriculture]').click();
  assert.equal(root.dataset.field,'agriculture');assert.equal(q('[data-industry-return]').hidden,false);
  q('[data-field="natural"]').click();q('[data-field="industry"]').click();
  assert.equal(root.dataset.industrySubsector,'food');assert.equal(map.cameraChanges,moves);
  window.history.replaceState({},'',financeURL);window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(root.dataset.industrySector,'services');assert.equal(root.dataset.industrySubsector,'finance');assert.equal(q('[data-selection-title]').textContent,'ニューヨーク');
  assert.equal(new URL(window.location.href).searchParams.get('crop'),'rice');assert.equal(window.__map,map);
 }finally{await window.happyDOM.close();}
});

test('重なる地域候補は全件選べ、WebGL失敗でも産業記号と地域一覧が動く',async()=>{
 const {window,root,q}=await setup('?sector=services',true);
 try{
  assert.equal(root.dataset.renderState,'fallback');assert.equal(q('[data-fallback]').hidden,false);
  assert.ok(q('[data-industry-markers]').children.length>0);
  const cluster=[...q('[data-industry-markers]').children].find(b=>Number(b.querySelector('.industry-marker-count')?.textContent)>1);assert.ok(cluster);cluster.click();
  assert.ok(q('[data-selection-candidates]').querySelectorAll('button').length>1);
  q('[data-selection-candidates] button').click();assert.equal(q('[data-selection]').hidden,false);assert.ok(q('[data-selection]').classList.contains('atlas-selection--below'));
  q('[data-industry-sector="services"]').click();q('[data-industry-subsector="finance"]').click();q('[data-industry-region-option="newyork-finance"]').click();
  assert.equal(q('[data-selection-title]').textContent,'ニューヨーク');assert.equal(q('[data-industry-national-panel="services"]').hidden,false);
  q('[data-close-selection]').click();assert.equal(new URL(window.location.href).searchParams.get('industryRegion'),null);
 }finally{await window.happyDOM.close();}
});

test('第二段のキーボード選択とインサイト比較が右欄・カメラの責務を保つ',async()=>{
 const {window,root,q}=await setup('?sector=services');
 try{
  const map=window.__map,moves=map.cameraChanges,before=q('[data-industry-national-summary]').innerHTML;
  q('[data-owner-sector="services"][data-industry-subsector="all"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(root.dataset.industrySubsector,'information');assert.equal(q('[data-industry-national-summary]').innerHTML,before);
  q('[data-industry-insight="energy-chemistry"]').click();assert.equal(new URL(window.location.href).searchParams.get('industryInsight'),'energy-chemistry');assert.equal(map.cameraChanges,moves);
 }finally{await window.happyDOM.close();}
});

test('全産業を12行の対比図にまとめ、付加価値・雇用と全区分を残す',async()=>{
 const {window,q}=await setup();
 try{
  const panel=q('[data-industry-national-panel="all"]');
  const before=panel.innerHTML;assert.equal(panel.querySelectorAll('figure').length,1);
  for(const figure of panel.querySelectorAll('figure')){
   assert.equal(figure.querySelectorAll('li[data-industry-stat-row]').length,12);
   assert.equal(figure.querySelectorAll('[data-industry-metric="gdp"]').length,12);assert.equal(figure.querySelectorAll('[data-industry-metric="employment"]').length,12);
   assert.equal(figure.querySelectorAll('.industry-service-detail').length,7);
   assert.equal(figure.querySelectorAll('.industry-service-heading').length,1);
   assert.equal(figure.querySelectorAll('tbody tr').length,13);
   assert.equal(figure.querySelector('[data-industry-stat-row="services"]'),null);
  }
  q('[data-industry-sector="services"]').click();
  assert.equal(q('[data-industry-national-panel="services"] .industry-bars').children.length,7);
  q('[data-industry-subsector="finance"]').click();
  q('[data-industry-sector="all"]').click();
  assert.equal(panel.hidden,false);assert.equal(panel.innerHTML,before);
 }finally{await window.happyDOM.close();}
});

test('金融の経済規模・欠測・凡例と全産業の固定記号を切り替える',async()=>{
 const {window,q}=await setup('?sector=services&subsector=finance');
 try{
  const dots=[...q('[data-industry-markers]').querySelectorAll('.is-economic')];assert.equal(dots.length,2);
  assert.equal(q('[data-industry-economic-legend]').hidden,false);assert.ok(dots.every(b=>b.querySelector('i').textContent==='金'));
  const large=dots.find(b=>b.dataset.economicRank==='1'),small=dots.find(b=>b.dataset.economicRank==='2');
  const ratio=parseFloat(small.querySelector('em').style.width)**2/parseFloat(large.querySelector('em').style.width)**2;
  // CSSOM serialization rounds subpixel dimensions; the pure function is tested without rounding.
  assert.ok(Math.abs(ratio-Number(small.dataset.economicValue)/Number(large.dataset.economicValue))<1e-6,`area ratio ${ratio}`);
  large.click();assert.match(q('.industry-economic-value').textContent,/2都市圏中1位/);
  q('[data-industry-region-option="newyork-finance"]').click();assert.match(q('.industry-economic-value').textContent,/比較から除いて/);
  q('[data-industry-sector="all"]').click();assert.equal(q('[data-industry-economic-legend]').hidden,true);assert.equal(q('[data-industry-markers] .is-economic'),null);
  assert.ok([...q('[data-industry-markers]').querySelectorAll('i')].every(i=>i.textContent!=='サ'));
 }finally{await window.happyDOM.close();}
});
test('航空宇宙・造船・鉄道のグラフと輸出先を独立表示し、表は閉じておく',async()=>{
 const {window,q}=await setup('?sector=manufacturing&subsector=aerospace');
 try{
  for(const [field,code] of [['aerospace','3364'],['shipbuilding','3366'],['railway','3365']]){
   q(`[data-industry-subsector="${field}"]`).click();const detail=q(`[data-industry-detail="manufacturing:${field}"]`);
   assert.equal(detail.hidden,false);assert.match(detail.querySelector('.industry-series-scope').textContent,new RegExp(code));
   assert.equal(detail.querySelectorAll('.industry-series>svg').length,2);assert.equal(detail.querySelectorAll('.industry-distribution').length,1);
   assert.ok([...detail.querySelectorAll('.industry-stat-values')].every(d=>!d.open));
  }
 }finally{await window.happyDOM.close();}
});


test('解説と統計を一度だけ出力し、自動車の3図ずつを同じ段に置く',async()=>{
 const {window,root,q}=await setup('?sector=manufacturing&subsector=auto');
 try{
  const copy=q('[data-industry-description-panel="manufacturing:auto"]'),detail=q('[data-industry-detail="manufacturing:auto"]');
  assert.equal(copy.hidden,false);assert.match(copy.querySelector('.industry-key-sentence').textContent,/部品供給/);assert.equal(copy.querySelector('.industry-reading-definitions').open,false);
  assert.equal(detail.querySelector('.industry-copy-grid'),null);
  assert.equal(detail.querySelector('.industry-trend-grid').children.length,3);assert.equal(detail.querySelector('.industry-comparison-grid').children.length,3);
  assert.equal(detail.querySelector('.industry-distribution .industry-series'),null);
  const table=detail.querySelector('.industry-stat-values');table.open=true;
  q('[data-industry-subsector="aerospace"]').click();q('[data-industry-subsector="auto"]').click();assert.equal(table.open,true);
  copy.querySelector('[data-industry-overview]').click();assert.equal(root.dataset.industrySubsector,'all');assert.equal(q('[data-industry-national-summary]').hidden,false);
  window.history.replaceState({},'', '?sector=services&subsector=finance');window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(q('[data-industry-description-panel="services:finance"]').hidden,false);
 }finally{await window.happyDOM.close();}
});


test('業態総論と構成比を右欄にまとめ、地図直下のインサイトから同じ地図で比較する',async()=>{
 const {window,root,q}=await setup();
 try{
  const reading=q('[data-field-national="industry"]'),insights=q('[data-industry-insights]');
  assert.equal(reading.firstElementChild,q('[data-industry-description]'));
  assert.equal(q('[data-industry-description]').nextElementSibling,q('[data-industry-national-summary]'));
  assert.equal(insights.closest('.atlas-map-column'),q('.atlas-map-column'));
  assert.equal(window.document.querySelectorAll('#industry-insights').length,1);
  assert.equal(insights.querySelectorAll('[data-industry-insight-card]').length,6);
  assert.ok([...insights.querySelectorAll('details')].every(d=>!d.open));
  for(const sector of ['all','manufacturing','resources','services','construction-real-estate']){
   q(`[data-industry-sector="${sector}"]`).click();
   assert.equal(q(`[data-industry-description-panel="${sector}:all"]`).hidden,false);
   assert.equal(q(`[data-industry-national-panel="${sector}"]`).hidden,false);
   assert.equal(q('[data-industry-description]').hidden,false);
   assert.equal(q('[data-industry-national-summary]').hidden,false);
   assert.equal(q(`[data-industry-detail="${sector}:all"] .industry-copy-grid`),null);
   assert.equal(q('#industry-detail').contains(insights),false);
  }
  const item=q('[data-industry-insight-card="supply-chain"]');item.querySelector('summary').click();assert.equal(item.open,true);
  const moves=window.__map.cameraChanges;
  item.querySelector('[data-industry-jump-subsector="auto"]').click();
  assert.equal(root.dataset.industrySubsector,'auto');assert.equal(window.__map.cameraChanges,moves);assert.equal(item.open,true);
  assert.equal(q('[data-industry-description-panel="manufacturing:auto"]').hidden,false);
  assert.equal(q('[data-industry-national-panel="manufacturing"]').hidden,false);
  q('[data-field="natural"]').click();assert.equal(insights.hidden,true);
  q('[data-field="industry"]').click();assert.equal(insights.hidden,false);assert.equal(item.open,true);
 }finally{await window.happyDOM.close();}
});

test('州の出荷額・秘匿値・選択URLを描画し、都市圏と全分野へ戻れる',async()=>{
 const {window,q}=await setup('?sector=manufacturing&subsector=auto&industryState=26');
 try{
  assert.ok(q('[data-industry-state-layer]'));
  assert.equal(window.document.querySelectorAll('[data-industry-state-option]').length,51);
  assert.match(q('[data-selection-title]').textContent,/ミシガン/);
  assert.match(q('[data-industry-economic-legend]').textContent,/9\/51/);
  q('[data-industry-state-option="06"]').click();
  assert.equal(new URL(window.location.href).searchParams.get('industryState'),'06');
  assert.match(q('[data-selection-title]').textContent,/カリフォルニア/);
  q('[data-industry-subsector="aerospace"]').click();
  assert.equal(new URL(window.location.href).searchParams.has('industryState'),false);
  assert.match(q('[data-industry-economic-legend]').textContent,/34\/51/);
  q('[data-industry-sector="services"]').click();q('[data-industry-subsector="information"]').click();
  assert.match(q('[data-industry-economic-legend]').textContent,/51\/51/);
  q('[data-industry-subsector="finance"]').click();
  assert.equal(q('[data-industry-state-layer]'),null);assert.match(q('[data-industry-economic-legend]').textContent,/都市圏/);
  q('[data-industry-sector="all"]').click();assert.equal(q('[data-industry-economic-legend]').hidden,true);
 }finally{await window.happyDOM.close();}
});

test('本文の地名から拠点を選べ、分野変更で選択を解除する',async()=>{
 const {window,root,q}=await setup('?sector=manufacturing&subsector=auto');
 try{
  for(const panel of root.querySelectorAll('[data-industry-description-panel]')){
   assert.ok(panel.querySelector('.industry-key-sentence strong').textContent.length>15);
   assert.ok(panel.querySelector('section h3').textContent.length>5);
   assert.equal(panel.querySelector('.industry-reading-definitions').open,false);
  }
  const copy=q('[data-industry-description-panel="manufacturing:auto"]');
  const place=copy.querySelector('[data-industry-reading-place]');assert.equal(place.hidden,false);place.click();
  assert.equal(new URL(window.location.href).searchParams.get('industryRegion'),'michigan-auto');
  assert.match(q('[data-atlas-live]').textContent,/ミシガン州/);
  q('[data-industry-subsector="aerospace"]').click();
  assert.equal(new URL(window.location.href).searchParams.has('industryRegion'),false);
  const air=q('[data-industry-description-panel="manufacturing:aerospace"]');
  air.querySelector('[data-industry-region-option="moseslake-aerospace"]').click();
  assert.equal(new URL(window.location.href).searchParams.get('industryRegion'),'moseslake-aerospace');
  air.querySelector('[data-industry-overview]').click();assert.equal(root.dataset.industrySubsector,'all');
  assert.equal(new URL(window.location.href).searchParams.has('industryRegion'),false);
 }finally{await window.happyDOM.close();}
});
