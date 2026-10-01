import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {populationBundle,populationLibrary} from '../unit/atlas-latin-population-helpers.mjs';
const data=JSON.parse(await readFile('src/data/atlas/latin-america/population.json','utf8'));
const lib=await populationLibrary();
const code=await populationBundle("import {initLatinPopulation} from './src/scripts/atlas-latin-america-population.ts';initLatinPopulation(document.querySelector('[data-latin-field=population]'));",'iife','browser',true);
const folder='atlas/latin-america/population';
const q=(w,s)=>w.document.querySelector(s);
async function page(search='',interactive=true){
 const w=new Window({url:`https://example.com/insight-journal/${folder}/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const html=await readFile(`dist/${folder}/index.html`,'utf8');
 // HappyDOM loses SVG children after an embedded style. Production styles
 // remain intact in the independent Chrome screenshot and pixel validation.
 w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style>[\s\S]*?<\/style>/g,''));
 assert.ok(q(w,'[data-lp-config]'),'The integrated build must use LatinAmericaPopulationPage');if(interactive)w.eval(code);return w;
}
function change(w,selector,value){const element=q(w,selector);element.value=value;element.dispatchEvent(new w.Event('change'));}
function click(w,selector){q(w,selector).dispatchEvent(new w.MouseEvent('click',{bubbles:true,button:0,cancelable:true}));}

test('No-JS SSR exposes main distribution, 34 values, comparison entries and separate 2020 settlement evidence',async()=>{
 const w=await page('',false);try{
  assert.equal(q(w,'[data-lp-target-map]').querySelectorAll('[data-lp-country]').length,34);assert.equal(q(w,'[data-lp-country-table]').querySelectorAll('tbody tr').length,34);
  assert.equal(q(w,'[data-lp-country-table]').open,true);assert.equal(q(w,'[data-lp-layer-select]').disabled,true);assert.equal(q(w,'[data-lp-source-figure]').hidden,true);
  assert.match(q(w,'[data-lp-target-legend]').textContent,/2023.*人口密度/);assert.equal(q(w,'[data-lp-target-legend]').querySelectorAll('li').length,6);
  assert.ok(q(w,'[data-lp-nature-link]').href.includes('from=population'));assert.ok(q(w,'[data-lp-industry-link]').href.includes('sourceLayer=density'));
  assert.match(q(w,'.lp-spatial-detail').textContent,/2020.*2023|2023.*2020/);assert.ok(q(w,'.lp-spatial-detail img').src.includes('population-v1'));
  for(const file of ['countries-2023.json','countries-2023.csv','manifest.json'])await access(`dist/assets/atlas/latin-america-population-v2/${file}`);
 }finally{await w.happyDOM.close();}
});

test('All 34 country cards and both layers keep original source values, statuses and colors',async()=>{
 const w=await page();try{
  assert.equal(q(w,'[data-latin-field=population]').dataset.latinPopulationReady,'1');assert.equal(q(w,'[data-lp-country-table]').open,false);
  for(const layer of ['density','population']){change(w,'[data-lp-layer-select]',layer);for(const c of data.countries){
   change(w,'[data-lp-place-select]',c.countryCode);assert.equal(new URL(w.location).searchParams.get('place'),c.countryCode);assert.equal(q(w,'[data-lp-value-population]').textContent,lib.latinPopulationValue(c.population,c.populationStatus));
   assert.equal(q(w,'[data-lp-value-density]').textContent,lib.latinPopulationValue(c.density,c.densityStatus,1));assert.equal(q(w,'[data-lp-value-urban]').textContent,lib.latinPopulationValue(c.urbanShare,c.urbanShareStatus,1));
   const shape=q(w,`[data-lp-target-map] [data-lp-country=${c.countryCode}]`);assert.equal(shape.getAttribute('aria-pressed'),'true');assert.equal(shape.dataset.lpStatus,layer==='density'?c.densityStatus:c.populationStatus);
   if(layer==='density')assert.equal(shape.getAttribute('fill'),lib.latinPopulationDensityColor(c.density,c.densityStatus,'lp-primary'));
  }}
 }finally{await w.happyDOM.close();}
});

test('Same-year scale comparison retains original layer, both legends, only, refresh/history and selected return',async()=>{
 const w=await page('?layer=population&place=JAM&scope=central&only=1');let refreshed;try{
  click(w,'[data-lp-scale-link]');assert.equal(new URL(w.location).searchParams.get('sourceLayer'),'population');assert.equal(q(w,'[data-lp-comparison-reading]').hidden,false);
  const map=q(w,'[data-lp-target-map]');assert.equal(map.querySelectorAll('.lp-context').length,34);assert.equal(map.querySelectorAll('[data-lp-country]:not([style])').length,1);assert.equal(map.querySelectorAll('[data-lp-symbol]:not([style])').length,1);
  assert.equal(q(w,'[data-lp-target-legend]').querySelectorAll('li').length,6);assert.ok(map.querySelector('[data-lp-map-size-key]'));assert.match(q(w,'[data-lp-target-legend]').textContent,/1,000万.*2億人/);
  change(w,'[data-lp-place-select]','GTM');const back=new URL(q(w,'[data-lp-return]').href);assert.equal(back.searchParams.get('layer'),'population');assert.equal(back.searchParams.get('place'),'GTM');assert.equal(back.searchParams.get('only'),'1');assert.match(q(w,'[data-lp-return]').textContent,/グアテマラ/);
  refreshed=await page(w.location.search);assert.equal(q(refreshed,'[data-lp-layer-select]').value,'scale');assert.equal(q(refreshed,'[data-lp-place-select]').value,'GTM');
  w.history.replaceState(null,'','?layer=population&place=JAM&scope=central&only=1');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q(w,'[data-lp-place-select]').value,'JAM');assert.equal(q(w,'[data-lp-layer-select]').value,'population');
  click(w,'[data-lp-scale-link]');click(w,'[data-lp-return]');assert.equal(q(w,'[data-lp-layer-select]').value,'population');assert.equal(new URL(w.location).searchParams.has('from'),false);
 }finally{await w.happyDOM.close();if(refreshed)await refreshed.happyDOM.close();}
});

test('Outbound comparisons retain original quantity/density, selected country, scope, only and fallback',async()=>{
 for(const layer of ['density','population']){const w=await page(`?layer=${layer}&place=CRI&scope=central&only=1&fallback=1`);try{
  for(const [selector,field,target]of [['[data-lp-nature-link]','nature','climate'],['[data-lp-industry-link]','industry','manufactures']]){
   const href=new URL(q(w,selector).href);assert.equal(href.pathname,`/insight-journal/atlas/latin-america/${field}/`);assert.equal(href.searchParams.get('layer'),target);assert.equal(href.searchParams.get('sourceLayer'),layer);
   for(const key of ['place','sourcePlace'])assert.equal(href.searchParams.get(key),'CRI');for(const key of ['scope','sourceScope'])assert.equal(href.searchParams.get(key),'central');for(const key of ['only','sourceOnly','fallback','sourceFallback'])assert.equal(href.searchParams.get(key),'1');
  }
 }finally{await w.happyDOM.close();}}
});

test('Incoming nature/industry preserve source maps, both legends, distinct periods and target-specific return',async()=>{
 for(const [field,layer,year] of [['nature','climate','1991'],['industry','manufactures','2024']]){
  const w=await page(`?layer=density&place=CRI&scope=central&only=1&from=${field}&sourceLayer=${layer}&sourcePlace=CRI&sourceScope=central&sourceOnly=1&sourceFallback=1&sourceCase=coffee`);try{
   assert.equal(q(w,'[data-lp-source-figure]').hidden,false);assert.ok(q(w,'[data-lp-source-map] svg'));assert.ok(q(w,'[data-lp-target-map] svg'));assert.match(q(w,'[data-lp-source-caption]').textContent,new RegExp(year));assert.match(q(w,'[data-lp-target-caption]').textContent,/2023/);
   assert.ok(q(w,'[data-lp-source-legend]').textContent.trim());assert.equal(q(w,'[data-lp-target-legend]').querySelectorAll('li').length,6);assert.match(q(w,'[data-lp-return]').textContent,/コスタリカ/);
   change(w,'[data-lp-place-select]','JAM');const href=new URL(q(w,'[data-lp-return]').href);assert.equal(href.pathname,`/insight-journal/atlas/latin-america/${field}/`);assert.equal(href.searchParams.get('place'),'JAM');assert.equal(href.searchParams.get('only'),'1');assert.equal(href.searchParams.get('fallback'),'1');if(field==='nature')assert.equal(href.searchParams.get('case'),'coffee');
   change(w,'[data-lp-layer-select]','scale');assert.match(q(w,'[data-lp-comparison-text]').textContent,new RegExp(year));
  }finally{await w.happyDOM.close();}
 }
});

test('Fallback is a separate static image with selected distribution; invalid URL cannot invent data',async()=>{
 const w=await page('?layer=population&place=JAM&scope=central&only=1&fallback=1');const invalid=await page('?layer=fake&place=XXX&scope=country&only=1&from=fake&sourceLayer=fake');try{
  const img=q(w,'[data-lp-fallback-image]');assert.ok(img);assert.equal(q(w,'[data-lp-target-map] svg'),null);assert.equal(q(w,'[data-latin-field=population]').dataset.lpRenderer,'static-image');
  const svg=decodeURIComponent(img.src.split(',')[1]);assert.match(svg,/data-lp-symbol="JAM"/);assert.match(svg,/data-lp-map-size-key/);assert.equal((svg.match(/class="lp-context"/g)??[]).length,34);
  change(w,'[data-lp-place-select]','GTM');assert.match(decodeURIComponent(q(w,'[data-lp-fallback-image]').src.split(',')[1]),/aria-pressed="true" aria-label="グアテマラ/);
  assert.equal(q(invalid,'[data-lp-layer-select]').value,'density');assert.equal(q(invalid,'[data-lp-place-select]').value,'all');assert.equal(q(invalid,'input[data-lp-only]').checked,false);assert.equal(new URL(invalid.location).searchParams.has('from'),false);
 }finally{await w.happyDOM.close();await invalid.happyDOM.close();}
});
