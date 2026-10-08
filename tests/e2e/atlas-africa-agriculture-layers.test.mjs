import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';

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
  assert.match(q('[data-theme-title]').textContent,/稲/);assert.match(q('[data-africa-agri-context]').textContent,/マダガスカル/);
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
  assert.equal(parameters(window).get('cropMeasure'),'harvested');assert.equal(parameters(window).has('view'),false);assert.equal(parameters(window).has('compare'),false);assert.equal(parameters(window).has('year'),false);
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
   assert.match(q('[data-theme-title]').textContent,row.overview?/アフリカの農畜産業/:/稲/);
  });
 });
});

test('a late original crop grid cannot overwrite a newer map selection or its explicit only mode',async()=>{
 const crops=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-crops-v1/manifest.json',import.meta.url),'utf8'));
 const delayed='/africa-crops-v1/'+crops.layers['rice-harvested'].grid;let release;const gate=new Promise(resolve=>{release=resolve;});let requested=false;
 try{
  await withController('?field=agriculture&crop=rice&zoom=all',async({window,root,q})=>{
   await wait(()=>requested&&q('[data-africa-agri-label="crop-cassava-harvested"]'),'native contours must be usable before an old original grid finishes');
   q('[data-africa-agri-label="crop-cassava-harvested"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));q('[data-africa-agri-only]').click();
   assert.equal(parameters(window).get('crop'),'cassava');assert.deepEqual(visibleKeys(root),['crop-cassava-harvested']);release();
   await wait(()=>root.dataset.actualLayer==='true','the released grid should settle');await new Promise(resolve=>setImmediate(resolve));
   assert.equal(parameters(window).get('crop'),'cassava');assert.deepEqual(visibleKeys(root),['crop-cassava-harvested']);assert.ok(q('[data-africa-agri-footprint="crop-cassava-harvested"]'));assert.match(q('[data-theme-title]').textContent,/キャッサバ/);
  },{settled:false,fetcher:async url=>{if(url.endsWith(delayed)){requested=true;await gate;}return sourceResponse(url);}});
 }finally{release();}
});

test('selected quantity classes use the original legend and actual geometry, with zero distinct from missing',async()=>{
 const manifest=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-agriculture-distribution-v1/manifest.json',import.meta.url)));
 await withController('?field=agriculture&crop=rice',async({window,root,q})=>{
  const layer=manifest.layers['crop-rice-harvested'],legend=q('[data-africa-agri-value-legend]');assert.equal(legend.hidden,false);assert.match(legend.textContent,/ha/);
  assert.deepEqual([...legend.querySelectorAll('[data-africa-layer-class]')].map(node=>node.dataset.africaLayerClass),layer.legend.map(row=>String(row.id)));
  assert.ok(q('[data-africa-agri-band-kind="zero"]'));assert.ok(q('#africa-agri-unavailable'));
  const original=q('[data-africa-agri-bands]').innerHTML,category=layer.legend.find(row=>row.id!=='zero').id;
  q(`[data-africa-agri-value-legend] [data-africa-layer-class="${category}"]`).click();
  assert.equal(q('[data-africa-agri-bands]').innerHTML,original);assert.ok(q(`[data-africa-class-outline="${category}"] path`));assert.equal(q('[data-africa-class-outline] rect'),null);assert.deepEqual(visibleKeys(root),[...keys].sort());
  window.history.back();assert.equal(q('[data-africa-class-outline]'),null);assert.equal(q('[data-africa-agri-bands]').innerHTML,original);
  q('[data-africa-agri-overview]').click();assert.equal(q('[data-africa-agri-bands]'),null);assert.equal(legend.hidden,true);
  for(const group of root.querySelectorAll('[data-africa-commodity-layer]'))assert.equal(Number(group.dataset.africaContourThreshold),manifest.layers[group.dataset.africaCommodityLayer].sourceThresholds[2]);
 });
});

test('agriculture region, legend focus and reset preserve source choice through browser history and reload',async()=>{
 let saved;
 await withController('?field=agriculture&crop=rice',async({window,root,q})=>{
  const map=q('.africa-map'),initial=map.getAttribute('viewBox'),region=q('[data-africa-agri-region]');
  for(const value of ['north','south','west','east','central','all']){region.value=value;region.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(parameters(window).get('region'),value==='all'?null:value);assert.equal(parameters(window).get('crop'),'rice');assert.equal(region.value,value);assert.deepEqual(visibleKeys(root),[...keys].sort());if(value==='all')assert.equal(map.getAttribute('viewBox'),initial);else assert.notEqual(map.getAttribute('viewBox'),initial);}
  const selector='[data-africa-layer-legend] [data-africa-agri-pick="crop-wheat-harvested"]';q(selector).focus();q(selector).click();
  assert.equal(window.document.activeElement?.localName,'button','native legend button focus must not jump to an SVG contour for the same product');assert.equal(window.document.activeElement?.getAttribute('data-africa-agri-pick'),'crop-wheat-harvested');
  region.value='north';region.dispatchEvent(new window.Event('change',{bubbles:true}));saved=window.location.search;
  q('[data-reset]').click();await wait(()=>q('[data-africa-raster="climate"]'),'reset restores default climate');assert.equal(q('[data-africa-commodity-layer]'),null);assert.equal(parameters(window).has('region'),false);
  window.history.back();await wait(()=>root.dataset.actualLayer==='true'&&q('[data-africa-commodity-layer]'),'history restores agriculture');assert.equal(window.location.search,saved);assert.equal(region.value,'north');
 });
 await withController(saved,({q,window})=>{assert.equal(q('[data-africa-agri-region]').value,'north');assert.equal(parameters(window).get('crop'),'wheat');assert.ok(q('[data-africa-agri-footprint="crop-wheat-harvested"]'));});
});
