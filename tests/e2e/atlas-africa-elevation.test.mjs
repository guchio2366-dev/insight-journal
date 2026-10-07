import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
const base='https://example.com/insight-journal/atlas/africa/';
const wait=async fn=>{const end=Date.now()+10000;while(!fn()&&Date.now()<end)await new Promise(resolve=>setImmediate(resolve));assert(fn());};
async function page(search,run,{delay=false}={}){
 const window=new Window({url:base+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),previous=Object.fromEntries(['window','document','location','history','fetch'].map(k=>[k,globalThis[k]]));
 let release;const gate=delay?new Promise(resolve=>release=resolve):Promise.resolve();
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async input=>{const url=new URL(input,base);if(url.pathname.includes('africa-elevation-500m-v1/elevation.geojson'))await gate;return new Response(readFileSync(new URL('../../public'+url.pathname.replace(/^\/insight-journal/,''),import.meta.url)));};
  document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=document.querySelector('[data-africa-atlas]'),q=s=>root.querySelector(s);
  for(const p of root.querySelectorAll('[data-country-path]'))p.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();
  await run({window,root,q,release,ready:()=>wait(()=>!!q('[data-africa-elevation-contour="4000"]'))});
 }finally{release?.();await window.happyDOM.abort();for(const [k,v]of Object.entries(previous))globalThis[k]=v;}
}
test('elevation clears obsolete country context, keeps all bands and lines on selection, restores history and reload, and resets',async()=>{
 let saved;
 await page('?field=nature&topic=elevation&place=EGY&compare=COD&region=north&zoom=country&view=statistics&year=2023',async({window,root,q,ready})=>{
  await ready();const params=()=>new URL(window.location.href).searchParams;
  for(const key of ['place','compare','region','year','context'])assert.equal(params().has(key),false);
  assert.equal(params().get('zoom'),'all');assert.equal(q('[data-africa-elevation-note]').hidden,false);assert.equal(q('[data-theme-comparison]').hidden,true);
  const paths=()=>[...root.querySelectorAll('[data-africa-layer-feature]')].map(p=>p.getAttribute('d'));
  const original=paths();assert.equal(original.length,19);assert.equal(root.querySelectorAll('[data-africa-elevation-band]').length,10);assert.equal(root.querySelectorAll('[data-africa-elevation-contour]').length,9);
  q('[data-africa-layer-class="band-3"]').click();assert.deepEqual(paths(),original);assert.ok(q('[data-africa-class-outline="band-3"]'));assert.match(q('[data-africa-point-reading]').textContent,/1,000–1,500 m/);
  assert.equal(q('[data-africa-class-outline] rect'),null);assert.equal(q('[data-theme-source]').href,'https://www.ncei.noaa.gov/products/etopo-global-relief-model');
  assert.ok([...q('[data-theme-details]').querySelectorAll('a')].some(a=>a.href===base.replace('/atlas/africa/','/assets/atlas/africa-elevation-500m-v1/manifest.json')));
  q('[data-africa-layer-class="band-5"]').click();saved=window.location.search;
  window.history.back();assert.equal(params().get('layerClass'),'band-3');assert.ok(q('[data-africa-class-outline="band-3"]'));
  window.history.forward();assert.equal(params().get('layerClass'),'band-5');assert.ok(q('[data-africa-class-outline="band-5"]'));
  q('[data-africa-layer-class="band-5"]').click();assert.equal(q('[data-africa-class-outline]'),null);assert.deepEqual(paths(),original);
  q('[data-reset]').click();await wait(()=>root.dataset.topic==='climate'&&!!q('[data-africa-raster="climate"]'));assert.equal(q('[data-africa-elevation-contour]'),null);
 });
 await page(saved,async({q,ready})=>{await ready();assert.ok(q('[data-africa-class-outline="band-5"]'));assert.match(q('[data-africa-point-reading]').textContent,/2,000–2,500 m/);});
});
test('a late elevation geometry response cannot overwrite a new selection or the climate tab',async()=>{
 for(const leave of [false,true])await page('?field=nature&topic=elevation&layerClass=band-1',async({root,q,release,ready})=>{
  await wait(()=>!!q('[data-africa-layer-class="band-5"]'));
  if(leave)q('[data-africa-topic="climate"]').click();else q('[data-africa-layer-class="band-5"]').click();
  release();
  if(leave){await wait(()=>root.dataset.topic==='climate'&&!!q('[data-africa-raster="climate"]'));await new Promise(resolve=>setTimeout(resolve,100));assert.equal(q('[data-africa-elevation-contour]'),null);}
  else{await ready();assert.ok(q('[data-africa-class-outline="band-5"]'));assert.equal(q('[data-africa-class-outline="band-1"]'),null);}
 },{delay:true});
});
