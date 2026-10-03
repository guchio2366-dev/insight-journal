import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';

test('agriculture controls preserve independent products and restore the original map after comparison and reload',async()=>{
 const window=new Window({url:'https://example.com/insight-journal/atlas/africa/?field=agriculture&topic=farming&crop=rice&cropMeasure=production&livestock=goats&place=KEN&compare=ETH&year=2023&zoom=all'});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 const wait=async condition=>{const deadline=Date.now()+5000;while(!condition()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(condition(),'expected UI ready');};
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async url=>new Response(readFileSync(new URL('../../public'+new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,''),import.meta.url)),{status:200});
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),map=root.querySelector('.africa-map');map.getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();await wait(()=>root.querySelector('[data-africa-raster="crop-rice-production"]')&&root.querySelector('[data-africa-layer-category]').options.length>2);
  assert.equal(root.querySelectorAll('[data-africa-commodity]').length,4);assert.equal(root.querySelectorAll('[data-africa-crop-measure]').length,2);assert.equal(root.querySelector('[data-africa-commodity="rice"]').getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('[data-africa-crop-measure="production"]').getAttribute('aria-pressed'),'true');
  const legend=[...root.querySelectorAll('[data-africa-layer-class]')].map(button=>button.getAttribute('aria-label')),distributionTakeaway=root.querySelector('[data-theme-takeaway]').textContent;
  const period=root.querySelector('[data-period]').textContent;assert.match(period,/2020/);assert.match(root.querySelector('[data-unit]').textContent,/t/);assert.match(root.querySelector('[data-africa-layer-legend]').textContent,/0とは断定しません/);
  root.querySelector('[data-theme-comparison]').click();assert.equal(new URL(window.location.href).searchParams.get('context'),'AG.LND.ARBL.ZS');assert.ok(root.querySelector('[data-africa-raster="crop-rice-production"]'));assert.deepEqual([...root.querySelectorAll('[data-africa-layer-class]')].map(button=>button.getAttribute('aria-label')),legend);assert.equal(root.querySelector('[data-africa-statistics-key]').hidden,false);assert.notEqual(root.querySelector('[data-theme-takeaway]').textContent,distributionTakeaway);assert.match(root.querySelector('[data-theme-takeaway]').textContent,/耕地割合は別の量/);assert.match(root.querySelector('[data-theme-takeaway-detail]').textContent,/耕地割合は選んだ作物の/);assert.match(root.querySelector('[data-theme-return]').textContent,/ケニア/);
  const overview=new URL(root.querySelector('[data-africa-overview-link]').href);assert.equal(overview.searchParams.get('crop'),'rice');assert.equal(overview.searchParams.get('cropMeasure'),'production');assert.equal(overview.searchParams.get('livestock'),'goats');assert.ok(overview.searchParams.get('sourceState'));
  window.dispatchEvent(new window.PopStateEvent('popstate'));const place=root.querySelector('[data-place]');place.value='TZA';place.dispatchEvent(new window.Event('change'));assert.match(root.querySelector('[data-theme-return]').textContent,/ケニア/);root.querySelector('[data-theme-return]').click();assert.equal(new URL(window.location.href).searchParams.has('context'),false);assert.equal(new URL(window.location.href).searchParams.get('place'),'KEN');assert.equal(new URL(window.location.href).searchParams.get('cropMeasure'),'production');assert.ok(root.querySelector('[data-africa-raster="crop-rice-production"]'));
  const year=root.querySelector('[data-year]');year.value='2024';year.dispatchEvent(new window.Event('change'));assert.equal(root.querySelector('[data-period]').textContent,period);assert.match(root.querySelector('[data-year-note]').textContent,/2020年固定/);
  root.querySelector('[data-africa-topic="livestock"]').click();await wait(()=>root.querySelector('[data-africa-raster="livestock-goats"]'));assert.equal(root.querySelectorAll('[data-africa-commodity]').length,3);assert.equal(root.querySelectorAll('[data-africa-crop-measure]').length,0);assert.match(root.querySelector('[data-unit]').textContent,/頭\/km²/);
  root.querySelector('[data-theme-comparison]').click();assert.equal(new URL(window.location.href).searchParams.get('context'),'NV.AGR.TOTL.ZS');assert.ok(root.querySelector('[data-africa-raster="livestock-goats"]'));assert.match(root.querySelector('[data-theme-takeaway]').textContent,/家畜の密度と農林水産業のGDP割合は別の量/);assert.match(root.querySelector('[data-theme-takeaway-detail]').textContent,/畜産だけの価値や家畜の頭数ではありません/);
  root.querySelector('[data-theme-return]').click();root.querySelector('[data-africa-topic="farming"]').click();await wait(()=>root.querySelector('[data-africa-raster="crop-rice-production"]'));assert.equal(root.querySelector('[data-africa-commodity="rice"]').getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('[data-africa-crop-measure="production"]').getAttribute('aria-pressed'),'true');
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
});

test('one agriculture field click starts its raster after the previous climate layer is fully settled',async()=>{
 const window=new Window({url:'https://example.com/insight-journal/atlas/africa/?field=nature&topic=climate&place=KEN&region=all&zoom=all&layerPoint=5.05,24.95'});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 const physical=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-physical-v1/manifest.json',import.meta.url),'utf8'));
 const crop=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-crops-v1/manifest.json',import.meta.url),'utf8'));
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
  releaseCrop();await wait(()=>root.querySelector('[data-africa-raster="crop-maize-harvested"]')&&root.querySelectorAll('[data-africa-layer-class]').length===crop.layers['maize-harvested'].legend.length&&pendingFetches===0&&pendingReads===0,'the first field click must finish the real crop raster');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(clicks,1);assert.equal(window.document.querySelector('[data-africa-atlas]'),root);assert.equal(root.querySelector('[data-africa-raster="climate"]'),null);assert.equal(root.dataset.actualLayer,'true');assert.match(root.querySelector('[data-period]').textContent,/2020/);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(pendingFetches,0);assert.equal(pendingReads,0);assert.equal(populationManifestRequests,0);
  const populationField=root.querySelector('[data-field="population"]');let populationClicks=0;populationField.addEventListener('click',()=>{populationClicks++;});populationField.click();
  assert.equal(populationManifestRequests,1,'a fully settled crop layer must switch to population on the first click');assert.equal(root.querySelector('[data-africa-topic="distribution"]').getAttribute('aria-pressed'),'true');assert.equal(new URL(window.location.href).searchParams.get('topic'),'distribution');
  releasePopulation();await wait(()=>root.querySelector('[data-africa-raster="distribution"]')&&root.querySelectorAll('[data-africa-layer-class]').length===population.layers.population.legend.length&&pendingFetches===0&&pendingReads===0,'the first population field click must finish its real raster');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(populationClicks,1);assert.equal(root.querySelector('[data-africa-raster="crop-maize-harvested"]'),null);assert.equal(root.dataset.field,'population');assert.equal(root.dataset.actualLayer,'true');
 }finally{releaseCrop();releasePopulation();for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
});
