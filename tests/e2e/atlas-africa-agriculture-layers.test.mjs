import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {createAfricaLayerRenderer} from '../../src/scripts/atlas-africa-layers.ts';
import {readState} from '../../src/data/atlas/africa-atlas.ts';

const wait=async(condition,message)=>{const end=Date.now()+10000;while(!condition()&&Date.now()<end)await new Promise(resolve=>setImmediate(resolve));assert.ok(condition(),message);};
const base='https://example.com/insight-journal/atlas/africa/';
const keys=['crop-maize-harvested','crop-rice-harvested','crop-wheat-harvested','crop-cassava-harvested','livestock-cattle','livestock-goats','livestock-sheep'];
const visibleKeys=root=>[...root.querySelectorAll('[data-africa-commodity-layer]')].filter(node=>node.style.display!=='none').map(node=>node.dataset.africaCommodityLayer).sort();
const parameters=window=>new URL(window.location.href).searchParams;
const sourceResponse=url=>new Response(readFileSync(new URL('../../public'+new URL(url,base).pathname.replace(/^\/insight-journal/,''),import.meta.url)),{status:200});

async function withController(search,run,{fetcher=sourceResponse,settled=true}={}){
 const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:base+search});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=fetcher;
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),q=selector=>root.querySelector(selector);
  q('.africa-map').getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();if(settled)await wait(()=>root.dataset.actualLayer==='true'&&root.querySelectorAll('[data-africa-commodity-layer]').length===7,'all seven distributions and source grids must finish');
  const navigate=search=>{window.history.replaceState(null,'',search);window.dispatchEvent(new window.PopStateEvent('popstate'));};
  await run({window,root,q,navigate});
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
}

// Checkbox combinations and H/P display switches were deliberately removed.
// Ordinary selection retains all seven distributions; only the explicit reading
// action changes visibility. Source production quantities remain data contracts.
test('map labels select and outline a product while other distributions remain, with explicit only/all and history reload',async()=>{
 let reload;
 await withController('?field=agriculture&zoom=all',async({window,root,q})=>{
  assert.deepEqual(visibleKeys(root),[...keys].sort());assert.equal(q('[data-africa-agri-footprint]'),null);
  assert.equal(root.querySelectorAll('[data-africa-agri-distribution]').length,7);
  assert.deepEqual(new Set([...root.querySelectorAll('[data-africa-agri-glyph]')].map(node=>node.dataset.africaAgriGlyph)),new Set(['cattle','goats','sheep']));
  const rice=q('[data-africa-agri-label="crop-rice-harvested"]');assert.ok(rice);rice.focus();rice.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(parameters(window).get('crop'),'rice');assert.equal(parameters(window).get('overview'),'0');
  assert.ok(q('[data-africa-agri-footprint="crop-rice-harvested"]'));assert.deepEqual(visibleKeys(root),[...keys].sort());
  assert.match(q('[data-theme-title]').textContent,/米|稲/);assert.match(q('[data-africa-agri-context]').textContent,/マダガスカル/);
  assert.equal(window.document.activeElement?.dataset.africaAgriPick,'crop-rice-harvested');
  for(const key of ['livestock-cattle','livestock-goats','livestock-sheep'])assert.ok(Number(q(`[data-africa-commodity-layer="${key}"]`).style.opacity)<1,'livestock is subdued after crop selection');
  assert.equal(q('[data-africa-agri-only]').hidden,false);assert.ok(q('[data-africa-agri-only]').closest('.africa-detail'));
  q('[data-africa-agri-only]').click();assert.deepEqual(visibleKeys(root),['crop-rice-harvested']);assert.equal(parameters(window).get('agriLayers'),'crop-rice-harvested');assert.equal(q('[data-africa-agri-all]').hidden,false);reload=window.location.search;
  window.history.back();assert.deepEqual(visibleKeys(root),[...keys].sort());assert.equal(parameters(window).get('crop'),'rice');
  window.history.forward();assert.deepEqual(visibleKeys(root),['crop-rice-harvested']);
  q('[data-africa-agri-all]').click();assert.deepEqual(visibleKeys(root),[...keys].sort());assert.ok(q('[data-africa-agri-footprint="crop-rice-harvested"]'));
  q('[data-africa-agri-overview]').click();assert.equal(q('[data-africa-agri-footprint]'),null);assert.deepEqual(visibleKeys(root),[...keys].sort());assert.equal(parameters(window).get('overview'),'1');
 });
 await withController(reload,({root,q})=>{assert.deepEqual(visibleKeys(root),['crop-rice-harvested']);assert.ok(q('[data-africa-agri-footprint="crop-rice-harvested"]'));assert.equal(q('[data-africa-agri-all]').hidden,false);q('[data-africa-agri-all]').click();assert.deepEqual(visibleKeys(root),[...keys].sort());});
});

test('forestry has its own tab and history restores a selected animal with all distributions',async()=>{
 await withController('?field=agriculture&topic=livestock&livestock=goats&place=KEN&zoom=all',async({window,root,q})=>{
  assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');assert.equal(q('[data-africa-topic="livestock"]'),null);
  assert.ok(q('[data-africa-agri-footprint="livestock-goats"]'));const selected=window.location.search;
  q('[data-africa-topic="forestry"]').click();assert.equal(parameters(window).get('topic'),'forestry');assert.match(q('[data-theme-title]').textContent,/森林/);assert.equal(q('[data-africa-commodity-layer]'),null);
  window.history.back();assert.equal(window.location.search,selected);assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');assert.ok(q('[data-africa-agri-footprint="livestock-goats"]'));assert.deepEqual(visibleKeys(root),[...keys].sort());
  window.history.forward();assert.equal(q('[data-africa-topic="forestry"]').getAttribute('aria-pressed'),'true');
  q('[data-africa-topic="farming"]').click();assert.equal(parameters(window).get('overview'),'1');assert.equal(q('[data-africa-agri-footprint]'),null);assert.deepEqual(visibleKeys(root),[...keys].sort());
 });
});

test('legacy multiple-layer and production URLs normalize to the fixed seven-item view without reviving removed controls',async()=>{
 for(const suffix of ['&agriLayers=','&agriLayers=crop-maize-production,crop-rice-harvested,livestock-cattle'])await withController('?field=agriculture&crop=maize&cropMeasure=production&place=KEN&compare=ETH&year=2023&view=statistics&zoom=all'+suffix,({window,root,q})=>{
  assert.equal(parameters(window).get('cropMeasure'),'harvested');assert.equal(parameters(window).get('view'),'distribution');assert.equal(parameters(window).has('compare'),false);assert.equal(parameters(window).has('year'),false);
  assert.deepEqual(visibleKeys(root),[...keys].sort());assert.equal(root.querySelectorAll('[data-africa-agri-layer],[data-africa-crop-measure],[data-africa-commodity]').length,0);
  q('[data-africa-layer-legend] [data-africa-agri-pick="livestock-cattle"]').click();assert.deepEqual(visibleKeys(root),[...keys].sort());assert.equal(q('[data-africa-agri-footprint]').dataset.africaAgriFootprint,'livestock-cattle');
 });
});

test('legacy single-item URLs keep only a matching selection and always restore all distributions for overview',async t=>{
 const cases=[
  {name:'mismatched animal or crop restores all',requested:['livestock-cattle','crop-maize-harvested'],overview:false,only:false},
  {name:'matching production crop migrates to harvested area only',requested:['crop-rice-production'],overview:false,only:true},
  {name:'overview discards even a matching single-item request',requested:['crop-rice-production'],overview:true,only:false},
 ];
 for(const row of cases)await t.test(row.name,async()=>{
  for(const requested of row.requested)await withController(`?field=agriculture&topic=farming&crop=rice&cropMeasure=production&zoom=all&overview=${row.overview?'1':'0'}&agriLayers=${requested}`,({window,root,q})=>{
   const focused='crop-rice-harvested',params=parameters(window);
   assert.equal(params.get('crop'),'rice');assert.equal(params.get('cropMeasure'),'harvested');
   assert.equal(params.get('agriLayers'),row.only?focused:null);
   assert.deepEqual(visibleKeys(root),row.only?[focused]:[...keys].sort());
   assert.equal(q('[data-africa-layer-legend] [data-africa-agri-pick="crop-rice-harvested"]').getAttribute('aria-pressed'),String(!row.overview));
   assert.equal(q('[data-africa-agri-footprint]')?.dataset.africaAgriFootprint,row.overview?undefined:focused);
   assert.equal(q('[data-africa-agri-only]').hidden,row.overview||row.only);
   assert.equal(q('[data-africa-agri-all]').hidden,!row.only);
   assert.match(q('[data-theme-title]').textContent,row.overview?/アフリカの農畜産業/:/米|稲/);
  });
 });
});

test('a late original crop grid cannot overwrite a newer map selection or its explicit only mode',async()=>{
 const crops=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-crops-v1/manifest.json',import.meta.url),'utf8'));
 const delayed='/africa-crops-v1/'+crops.layers['rice-harvested'].grid;let release;const gate=new Promise(resolve=>{release=resolve;});let requested=false;
 try{
  await withController('?field=agriculture&crop=rice&zoom=all',async({window,root,q})=>{
   await wait(()=>requested&&q('[data-africa-agri-label="crop-cassava-harvested"]'),'summary geometry must be usable before an old original grid finishes');
   q('[data-africa-agri-label="crop-cassava-harvested"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));q('[data-africa-agri-only]').click();
   assert.equal(parameters(window).get('crop'),'cassava');assert.deepEqual(visibleKeys(root),['crop-cassava-harvested']);release();
   await wait(()=>root.dataset.actualLayer==='true','the released grid should settle');await new Promise(resolve=>setImmediate(resolve));
   assert.equal(parameters(window).get('crop'),'cassava');assert.deepEqual(visibleKeys(root),['crop-cassava-harvested']);assert.ok(q('[data-africa-agri-footprint="crop-cassava-harvested"]'));assert.match(q('[data-theme-title]').textContent,/キャッサバ/);
  },{settled:false,fetcher:async url=>{if(url.endsWith(delayed)){requested=true;await gate;}return sourceResponse(url);}});
 }finally{release();}
});

async function withSummaryFixture(run){
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 const labels=['トウモロコシ','米','小麦','キャッサバ','牛','山羊','羊'],bounds=[-27,37,-24,39];
 const values=Object.fromEntries(keys.map(key=>[key,[0,.0000001,-1,8,NaN,0]]));
 const summary={bounds,width:3,height:2,method:'1°集約・品目内上位25%',layers:{}};
 const manifests={crops:{layers:{}},livestock:{layers:{}}};
 for(const [index,key] of keys.entries()){
  const crop=key.startsWith('crop-'),id=crop?key.slice(5):key.slice(10),unit=crop?'ha':'頭/km²';
  manifests[crop?'crops':'livestock'].layers[id]={title:labels[index],period:'2020年モデル',unit,width:3,height:2,bounds,encoding:'float32-le',noData:-1,grid:key+'.bin',sourceUrl:'https://example.com/primary/'+key,sourceLabel:'原典'};
  summary.layers[key]={displayImage:key+'.png',label:labels[index],threshold:4,unit,color:'#112233',cells:index<2?[[0,1],[1,0]]:[],anchors:[{lon:-25.5,lat:38.5}]};
 }
 try{
  window.document.body.innerHTML='<div><svg viewBox="0 0 1100 907"><path data-country-path="KEN" d="M1 1L2 1L2 2Z"></path><g data-africa-actual-layer></g></svg></div>';
  const root=window.document.body.firstElementChild;let state=readState('?field=agriculture&crop=maize&zoom=all&agriOutline=1'),view;
  const requests=[];const fetcher=async url=>{requests.push(url);if(url.includes('africa-agriculture-overview-v1'))return new Response(JSON.stringify(summary));if(url.endsWith('manifest.json'))return new Response(JSON.stringify(manifests[url.includes('crops')?'crops':'livestock']));const key=url.split('/').at(-1).replace('.bin','');assert.ok(values[key]);return new Response(new Float32Array(values[key]));};
  const renderer=createAfricaLayerRenderer(root,()=>{view=renderer.render(state);},fetcher);view=renderer.render(state);
  await wait(()=>view?.ready&&!view.loading,'summary and seven original grids must settle');
  await run({root,renderer,view,requests,setState(patch){state={...state,...patch};view=renderer.render(state);return view;}});
 }finally{globalThis.document=previous;await window.happyDOM.abort();}
}

test('soft sourced belts replace striped cell outlines, while queries retain original zero, tiny positive and no-data values',async()=>{
 await withSummaryFixture(({root,renderer,view,setState})=>{
  assert.equal(view.visibleLayers.length,9);assert.equal(view.legend.length,9);assert.equal(new Set(view.legend.map(row=>row.color)).size,9);
  assert.equal(root.querySelectorAll('[data-africa-agri-distribution]').length,7);
  for(const key of keys){const image=root.querySelector(`[data-africa-agri-distribution="${key}"]`);assert.equal(image.tagName,'image');assert.ok(image.getAttribute('href').endsWith(key+'.png'));assert.equal(image.getAttribute('pointer-events'),'none');assert.equal(image.getAttribute('clip-path'),'url(#africa-agri-land-clip)');}
  assert.equal(root.querySelector('[data-africa-agri-distribution="crop-coffee-harvested"]'),null);
  assert.equal(root.querySelector('[data-africa-agri-distribution="crop-tea-harvested"]'),null);
  const outline=root.querySelector('[data-africa-agri-footprint="crop-maize-harvested"] path').getAttribute('d');assert.ok(outline);
  const zero=renderer.inspect(-26.5,38.5),tiny=renderer.inspect(-25.5,38.5),missing=renderer.inspect(-24.5,38.5);
  assert.match(zero,/トウモロコシ：0 ha/);assert.match(zero,/牛：0 頭\/km²/);assert.match(tiny,/トウモロコシ：0\.0000001 ha/);assert.match(missing,/トウモロコシ：値なし/);assert.doesNotMatch(missing,/トウモロコシ：0 ha/);
  assert.match(view.method,/上位25%/);assert.match(view.scope,/表示外も生産なしとは限りません/);assert.equal(view.sourceUrl,'https://example.com/primary/crop-maize-harvested');
  setState({agriLayers:'crop-maize-harvested'});assert.deepEqual(visibleKeys(root),['crop-maize-harvested']);assert.equal(root.querySelector('[data-africa-agri-footprint] path').getAttribute('d'),outline,'explicit visibility does not alter the selected concentration boundary');
  assert.match(renderer.inspect(-26.5,38.5),/：0 ha/);assert.match(renderer.inspect(-24.5,38.5),/未収録/);
 });
});


test('unavailable coffee and tea never replace retained production distributions with an empty only view',async()=>{
 for(const crop of ['coffee','tea'])await withController(`?field=agriculture&crop=${crop}&agriLayers=crop-${crop}-harvested&zoom=all`,({window,root,q})=>{
  assert.deepEqual(visibleKeys(root),[...keys].sort());assert.equal(parameters(window).get('agriLayers'),null);assert.equal(q('[data-africa-agri-only]').hidden,true);assert.match(q('[data-africa-agri-context]').textContent,/未取得/);assert.equal(q(`[data-africa-agri-distribution="crop-${crop}-harvested"]`),null);
 });
});
