import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {industryBundle,industryLibrary} from '../unit/atlas-latin-industry-helpers.mjs';
const folder='atlas/latin-america/industry';
const data=JSON.parse(await readFile('src/data/atlas/latin-america/industry.json','utf8'));
const lib=await industryLibrary();
const code=await industryBundle("import {initLatinIndustry} from './src/scripts/atlas-latin-industry.ts';initLatinIndustry(document.querySelector('[data-latin-industry]'));",'iife','browser',true);
async function page(search='',interactive=true){
 const w=new Window({url:`https://example.com/insight-journal/${folder}/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write((await readFile(`dist/${folder}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 assert.ok(w.document.querySelector('[data-latin-industry]'),'The integrated build must contain the new industry component');
 if(interactive)w.eval(code);return w;
}
const change=(w,selector,value)=>{const input=w.document.querySelector(selector);input.value=value;input.dispatchEvent(new w.Event('change'));};
const q=(w,selector)=>w.document.querySelector(selector);

test('Industry SSR exposes 34 country values, a meaningful map and full common legend without expanding source details',async()=>{
 const w=await page('',false);try{
  assert.equal(w.document.querySelectorAll('[data-industry-primary-map] [data-industry-country]').length,34);
  assert.equal(w.document.querySelectorAll('[data-industry-context] path').length,34);
  assert.equal(q(w,'[data-industry-primary-legend]').querySelectorAll('span').length,8);
  assert.equal(w.document.querySelectorAll('tbody tr').length,34);
  assert.equal(w.document.querySelectorAll('details[open]').length,0);
  assert.match(q(w,'[data-industry-title]').textContent,/鉱石・金属/);assert.match(q(w,'[data-industry-period]').textContent,/2024.*%/);
  for(const file of ['industry-selected-2024.csv','manifest.json'])await access(`dist/assets/atlas/latin-industry-v1/${file}`);
 }finally{await w.happyDOM.close();}
});

test('Every country and both themes keep their original source value/status/color and canonical URL',async()=>{
 const w=await page();try{
  for(const layer of ['ores','manufactures']){change(w,'[data-industry-layer]',layer);for(const row of data.rows){
   change(w,'[data-industry-place]',row.country);const value=row.values[layer],shape=q(w,`[data-industry-primary-map] [data-industry-country=${row.country}]`);
   assert.equal(shape.dataset.status,value.status);assert.equal(shape.getAttribute('fill'),lib.latinIndustryColor(value.value,value.status));assert.equal(shape.getAttribute('aria-pressed'),'true');
   assert.ok(q(w,'[data-industry-selected]').textContent.includes(lib.formatLatinIndustryValue(value.value,value.status)));
   assert.equal(new URL(w.location).searchParams.get('place'),row.country);assert.equal(new URL(w.location).searchParams.get('layer'),layer);
  }}
  assert.equal(q(w,'[data-latin-industry]').dataset.latinReady,'true');assert.equal(q(w,'[data-latin-industry]').dataset.renderer,'svg');
 }finally{await w.happyDOM.close();}
});

test('Export comparison retains the original distribution, both legends, complete context and named return through refresh/history',async()=>{
 const query='?layer=manufactures&place=CHL&scope=south&only=1&from=industry&sourceLayer=ores&sourcePlace=CHL&sourceScope=south&sourceOnly=1';
 const w=await page(query);let reload;try{
  assert.equal(q(w,'[data-industry-normal]').hidden,true);assert.equal(q(w,'[data-industry-comparison]').hidden,false);assert.equal(q(w,'[data-latin-workspace]').classList.contains('is-comparison'),true);
  assert.equal(q(w,'[data-industry-source-legend]').textContent,q(w,'[data-industry-target-legend]').textContent);
  for(const side of ['source','target']){assert.equal(q(w,`[data-industry-${side}-map]`).querySelectorAll('[data-industry-context] path').length,34);assert.equal(q(w,`[data-industry-${side}-map]`).querySelectorAll('[data-industry-country]').length,1);}
  assert.match(q(w,'[data-industry-comparison-explanation]').textContent,/同じ凡例|同じ分母|分母とする/);
  change(w,'[data-industry-place]','PER');assert.match(q(w,'[data-industry-return]').textContent,/ペルー.*鉱石/);
  const back=new URL(q(w,'[data-industry-return]').href);assert.equal(back.searchParams.get('layer'),'ores');assert.equal(back.searchParams.get('place'),'PER');assert.equal(back.searchParams.get('only'),'1');
  reload=await page(w.location.search);assert.equal(q(reload,'[data-industry-place]').value,'PER');assert.equal(q(reload,'[data-industry-source-map] [data-industry-country]').dataset.industryCountry,'PER');
  w.history.replaceState(null,'',query);w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q(w,'[data-industry-place]').value,'CHL');assert.equal(q(w,'[data-industry-source-map] [data-industry-country]').dataset.industryCountry,'CHL');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('Industry opens the population route while preserving its current export theme and targeted return',async()=>{
 for(const layer of ['ores','manufactures']){
  const w=await page(`?layer=${layer}&place=DOM&scope=central&only=1&fallback=1`);try{
   await w.happyDOM.whenAsyncComplete();
   const destination=new URL(q(w,'[data-industry-compare-population]').href);
   assert.equal(destination.pathname,'/insight-journal/atlas/latin-america/population/');
   const params=destination.searchParams;
   assert.equal(params.get('layer'),'density');assert.equal(params.get('place'),'DOM');assert.equal(params.get('scope'),'central');
   assert.equal(params.get('only'),'1');assert.equal(params.get('fallback'),'1');assert.equal(params.get('from'),'industry');
   assert.equal(params.get('sourceLayer'),layer);assert.equal(params.get('sourcePlace'),'DOM');assert.equal(params.get('sourceScope'),'central');
   assert.equal(params.get('sourceOnly'),'1');assert.equal(params.get('sourceFallback'),'1');
   const restored=lib.readLatinLearningState(destination.search,'population',['density','population','scale'],'density');
   const back=new URL(lib.latinSourceReturnUrl('/insight-journal/atlas/latin-america/',restored),'https://example.com');
   assert.equal(back.pathname,'/insight-journal/atlas/latin-america/industry/');assert.equal(back.searchParams.get('layer'),layer);
   assert.equal(back.searchParams.get('place'),'DOM');assert.equal(back.searchParams.get('scope'),'central');assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');
   assert.equal(back.searchParams.has('from'),false);
  }finally{await w.happyDOM.close();}
 }
});

test('Population density and quantity source maps use the original renderer and legends with separate years/units',async()=>{
 for(const layer of ['density','population']){const w=await page(`?layer=manufactures&place=CRI&scope=central&only=1&from=population&sourceLayer=${layer}&sourcePlace=CRI&sourceScope=central&sourceOnly=1`);try{
  const source=q(w,'[data-industry-source-map]');assert.equal(source.querySelector('[data-lp-map]').dataset.lpLayer,layer);assert.equal(source.querySelector('svg').getAttribute('viewBox'),'0 0 900 580');assert.equal(source.querySelectorAll('.lp-context').length,34);
  assert.match(q(w,'[data-industry-source-period]').textContent,/2023/);assert.match(q(w,'[data-industry-target-period]').textContent,/2024.*%/);assert.match(q(w,'[data-industry-comparison-explanation]').textContent,/分母が異なり/);
  if(layer==='population'){const legend=source.querySelector('[data-lp-map-size-key]');assert.ok(legend);assert.equal(legend.closest('svg'),source.querySelector('svg'));assert.equal(source.querySelectorAll('[data-lp-symbol]:not([style])').length,1);}else assert.equal(source.querySelectorAll('[data-lp-country]:not([style])').length,1);
  const back=new URL(q(w,'[data-industry-return]').href);assert.equal(back.pathname,'/insight-journal/atlas/latin-america/population/');assert.equal(back.searchParams.get('layer'),layer);assert.equal(back.searchParams.get('place'),'CRI');assert.equal(back.searchParams.get('only'),'1');assert.match(q(w,'[data-industry-return]').textContent,/コスタリカ/);
 }finally{await w.happyDOM.close();}}
});

test('Panama comparison preserves the climate key and attribution, fiscal dates, transit unit and named source return',async()=>{
 const w=await page('?layer=canal&place=PAN&scope=central&only=1&from=nature&sourceLayer=climate&sourcePlace=PAN&sourceScope=central&sourceOnly=1');try{
  assert.match(q(w,'[data-industry-source-period]').textContent,/1991–2020.*0\.1.*5/);
  assert.equal(q(w,'[data-industry-source-legend]').querySelectorAll('.latin-nature-legend>span').length,7);
  assert.equal(q(w,'[data-industry-source-legend]').querySelector('.latin-nature-period'),null);
  assert.equal(q(w,'[data-industry-source-attribution]').hidden,false);assert.match(q(w,'[data-industry-source-attribution]').textContent,/Beck.*CC BY 4\.0/);
  assert.match(q(w,'[data-industry-target-period]').textContent,/2024会計年度.*大型外航船.*回/);
  assert.match(q(w,'[data-industry-target-map]').textContent,/9,944回/);assert.match(q(w,'[data-industry-target-map]').textContent,/2023年10月–2024年9月/);
  assert.match(q(w,'[data-industry-target-legend]').textContent,/矢印.*淡水.*物流.*比例図/);
  const back=new URL(q(w,'[data-industry-return]').href);assert.equal(back.pathname,'/insight-journal/atlas/latin-america/nature/');assert.equal(back.searchParams.get('layer'),'climate');assert.equal(back.searchParams.get('place'),'PAN');assert.equal(back.searchParams.get('only'),'1');
  assert.match(q(w,'[data-industry-return]').textContent,/パナマ.*気候/);
 }finally{await w.happyDOM.close();}
});

test('Explicit image fallback is made from the current selected distributions and remains usable by controls',async()=>{
 const w=await page('?layer=manufactures&place=DOM&scope=central&only=1&from=industry&sourceLayer=ores&sourcePlace=DOM&sourceScope=central&sourceOnly=1&fallback=1');try{
  await w.happyDOM.whenAsyncComplete();assert.equal(q(w,'[data-latin-industry]').dataset.renderer,'image');assert.equal(q(w,'[data-latin-industry]').dataset.latinReady,'true');
  for(const side of ['source','target']){const img=q(w,`[data-industry-${side}-map] img`);assert.ok(img);const svg=decodeURIComponent(img.src.split(',')[1]);assert.match(svg,/data-industry-country="DOM"/);assert.equal((svg.match(/data-industry-country=/g)??[]).length,1);assert.match(svg,/data-industry-context/);}
  change(w,'[data-industry-place]','CRI');await w.happyDOM.whenAsyncComplete();assert.match(q(w,'[data-industry-return]').textContent,/コスタリカ/);assert.equal(new URL(q(w,'[data-industry-return]').href).searchParams.get('fallback'),'1');
 }finally{await w.happyDOM.close();}
});
