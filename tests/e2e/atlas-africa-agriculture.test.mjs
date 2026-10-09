import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';

// The redesign intentionally replaces H/P switches, checkboxes and country/year
// comparison controls with a fixed harvested-area map and explicit single-item mode.
test('legacy agriculture URLs use fixed crop area, latest indicator values and source-backed reading',async()=>{
 const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:'https://example.com/insight-journal/atlas/africa/?field=agriculture&topic=farming&crop=rice&cropMeasure=production&livestock=goats&place=KEN&compare=ETH&year=2023&zoom=all'});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 const wait=async condition=>{const deadline=Date.now()+10000;while(!condition()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(condition(),'expected all seven source grids and overview geometry ready');};
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async url=>new Response(readFileSync(new URL('../../public'+new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,''),import.meta.url)),{status:200});
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),q=selector=>root.querySelector(selector),map=q('.africa-map');map.getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();await wait(()=>root.dataset.actualLayer==='true'&&root.querySelectorAll('[data-africa-commodity-layer]').length===7);
  const url=new URL(window.location.href);assert.equal(url.searchParams.get('cropMeasure'),'harvested');assert.equal(url.searchParams.has('year'),false);assert.equal(url.searchParams.has('compare'),false);assert.equal(url.searchParams.get('place'),'KEN');
  assert.equal(root.querySelectorAll('[data-africa-commodity],[data-africa-crop-measure],[data-africa-agri-layer]').length,0);
  assert.equal(q('[data-africa-layer-legend] [data-africa-agri-pick="crop-rice-harvested"]').getAttribute('aria-pressed'),'true');
  assert.match(q('[data-period]').textContent,/2020/);assert.match(q('[data-unit]').textContent,/収穫面積.*密度/);assert.match(q('[data-metric-year]').textContent,/最新収録年/);
  assert.match(q('[data-africa-agri-context]').textContent,/マダガスカル/);assert.match(q('[data-africa-regional-statistics]').textContent,/未取得/);
  const supplement=q('[data-theme-details]');assert.match(supplement.textContent,/75%|25%/);assert.match(supplement.textContent,/2001/);assert.match(supplement.textContent,/耕地割合/);assert.ok([...supplement.querySelectorAll('a')].some(a=>a.href.includes('10.7910/DVN/SWPENT')));
  assert.equal(q('[data-theme-comparison]').hidden,true);assert.equal(q('[data-africa-statistics-key]').hidden,true);
  q('[data-africa-layer-legend] [data-africa-agri-pick="livestock-goats"]').click();
  assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');assert.equal(q('[data-africa-topic="livestock"]'),null);assert.match(q('[data-theme-title]').textContent,/ヤギ/);
  assert.ok(q('[data-africa-agri-footprint="livestock-goats"]'));assert.equal(root.querySelectorAll('[data-africa-commodity-layer]').length,7);
  assert.match(q('[data-theme-details]').textContent,/畜産だけの価値や家畜の頭数ではありません/);
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
});

test('one agriculture field click starts all seven distributions after the previous climate layer is fully settled',async()=>{
 const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:'https://example.com/insight-journal/atlas/africa/?field=nature&topic=climate&place=KEN&region=all&zoom=all&layerPoint=5.05,24.95'});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 const physical=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-physical-v1/manifest.json',import.meta.url),'utf8'));
  const population=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-population-v1/manifest.json',import.meta.url),'utf8'));
 const requests=[];let pendingFetches=0,pendingReads=0,cropManifestRequests=0,populationManifestRequests=0,releaseCrop,releasePopulation;
 const cropGate=new Promise(resolve=>{releaseCrop=resolve;});
 const populationGate=new Promise(resolve=>{releasePopulation=resolve;});
 const wait=async(condition,message)=>{const deadline=Date.now()+10000;while(!condition()&&Date.now()<deadline)await new Promise(resolve=>setImmediate(resolve));assert.ok(condition(),message);};
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async url=>{
   const path=new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,'');requests.push(path);pendingFetches++;
   try{
    // Block the real crop manifest so the click must start its own request; a
    // late callback from the previous layer cannot make this assertion pass.
    if(path==='/assets/atlas/africa-crops-v1/manifest.json'){cropManifestRequests++;await cropGate;}
    if(path==='/assets/atlas/africa-population-v1/manifest.json'){populationManifestRequests++;await populationGate;}
    let bytes=readFileSync(new URL('../../public'+path,import.meta.url));
    // Decode actual gzip fixtures synchronously, avoiding leftover stream work.
    if(bytes[0]===31&&bytes[1]===139)bytes=gunzipSync(bytes);
    const response=new Response(bytes,{status:200}),read=response.arrayBuffer.bind(response);
    response.arrayBuffer=async()=>{pendingReads++;try{return await read();}finally{pendingReads--;}};
    return response;
   }finally{pendingFetches--;}
  };
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),map=root.querySelector('.africa-map');map.getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();
  await wait(()=>root.querySelector('[data-africa-raster="climate"]')&&root.querySelectorAll('[data-africa-layer-class]').length===physical.layers.climate.classes.length&&/砂漠/.test(root.querySelector('[data-africa-point-reading]').textContent)&&pendingFetches===0&&pendingReads===0,'climate manifest, full legend, grid and point reading must finish first');
  const settledRequests=[...requests];await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(requests,settledRequests);assert.equal(pendingFetches,0);assert.equal(pendingReads,0);assert.equal(cropManifestRequests,0);
  assert.deepEqual(new Set(requests),new Set(['/assets/atlas/africa-physical-v1/manifest.json','/assets/atlas/africa-physical-v1/'+physical.layers.climate.grid]));
  const field=root.querySelector('[data-field="agriculture"]');let clicks=0;field.addEventListener('click',()=>{clicks++;});field.click();
  assert.equal(cropManifestRequests,1,'the first field click must request the crop manifest without help from an earlier layer callback');
  assert.equal(root.dataset.field,'agriculture');assert.equal(root.querySelector('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');
  const url=new URL(window.location.href);assert.equal(url.searchParams.get('field'),'agriculture');assert.equal(url.searchParams.get('topic'),'farming');
  releaseCrop();await wait(()=>root.querySelectorAll('[data-africa-agri-distribution]').length===7&&root.querySelectorAll('[data-africa-commodity-layer]').length===7&&pendingFetches===0&&pendingReads===0,'the first field click must finish the summary geometry and all seven original query grids');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(clicks,1);assert.equal(window.document.querySelector('[data-africa-atlas]'),root);assert.equal(root.querySelector('[data-africa-raster="climate"]'),null);assert.equal(root.dataset.actualLayer,'true');assert.match(root.querySelector('[data-period]').textContent,/2020/);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(pendingFetches,0);assert.equal(pendingReads,0);assert.equal(populationManifestRequests,0);
  const populationField=root.querySelector('[data-field="population"]');let populationClicks=0;populationField.addEventListener('click',()=>{populationClicks++;});populationField.click();
  assert.equal(populationManifestRequests,1,'a fully settled crop layer must switch to population on the first click');assert.equal(root.querySelector('[data-africa-topic="distribution"]').getAttribute('aria-pressed'),'true');assert.equal(new URL(window.location.href).searchParams.get('topic'),'distribution');
  releasePopulation();await wait(()=>root.querySelector('[data-africa-raster="distribution"]')&&root.querySelectorAll('[data-africa-layer-class]').length===population.layers.population.legend.length&&pendingFetches===0&&pendingReads===0,'the first population field click must finish its real raster');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(populationClicks,1);assert.equal(root.querySelector('[data-africa-commodity-layer]'),null);assert.equal(root.dataset.field,'population');assert.equal(root.dataset.actualLayer,'true');
 }finally{releaseCrop();releasePopulation();for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
});
