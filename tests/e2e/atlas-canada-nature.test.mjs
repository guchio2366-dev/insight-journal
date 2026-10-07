import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const code=(await build({stdin:{contents:"import {initCanadaNature} from './src/scripts/atlas-canada-nature';initCanadaNature(document.querySelector('[data-canada-nature]'));",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife'})).outputFiles[0].text;
async function page(search='',interactive=false){const w=new Window({url:`https://example.com/insight-journal/atlas/north-america/canada/nature/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.write((await readFile('dist/atlas/north-america/canada/nature/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));if(interactive)w.eval(code);return w;}
test('Canadian nature entry and dedicated route retain North America navigation, capital, numeric tables and complete sources',async()=>{
 await access('dist/atlas/north-america/canada/index.html');
 const w=await page();try{const d=w.document;assert.equal(d.querySelector('[data-canada-city]').value,'ottawa');assert.equal(d.querySelectorAll('[data-canada-climate-card]').length,5);assert.equal(d.querySelectorAll('[data-canada-climate-card] tbody tr').length,60);assert.equal(d.querySelectorAll('[data-canada-climate-card]:not([hidden])').length,1);assert.equal(d.querySelectorAll('[data-canada-water-shape]').length,233);assert.ok(d.querySelector('#canada-nature-sources'));assert.match(d.querySelector('#canada-nature-sources').textContent,/1991–2020.*2009.*1967/s);assert.match(d.querySelector('[data-canada-physical] figcaption').textContent,/投影が異なり/);assert.equal(d.querySelectorAll('[data-news-rail]').length,1);assert.deepEqual([...d.querySelectorAll('.regional-countries a')].map(a=>a.textContent),['カナダ','米国','メキシコ']);for(const a of d.querySelectorAll('.canada-fields a')){const p=new URL(a.href).pathname.replace('/insight-journal/','');await access(`dist/${p}index.html`);}assert.ok((await readFile('dist/sitemap.xml','utf8')).includes('/atlas/north-america/canada/nature/'));}finally{await w.happyDOM.close();}
});
test('Canadian climate comparison, keyboard city selection and history preserve map view and display requested data',async()=>{
 const w=await page('?city=regina&compare=ottawa&frame=200,200,400,250',true);try{const d=w.document,q=s=>d.querySelector(s),cards=()=>[...d.querySelectorAll('[data-canada-climate-card]:not([hidden])')].map(c=>c.dataset.canadaClimateCard);assert.deepEqual(cards().sort(),['ottawa','regina']);const view=q('[data-canada-map]').getAttribute('viewBox');q('[data-canada-city-button=vancouver]').click();assert.equal(q('[data-canada-map]').getAttribute('viewBox'),view);assert.equal(new URL(w.location).searchParams.get('city'),'vancouver');assert.deepEqual(cards().sort(),['ottawa','vancouver']);q('[data-canada-map-city=iqaluit]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-canada-city]').value,'iqaluit');w.history.replaceState(null,'','?city=regina&compare=ottawa&view=landform');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-canada-city]').value,'regina');assert.equal(q('[data-canada-physical]').hidden,false);assert.equal(q('[data-canada-locator]').hidden,true);q('[data-canada-view=climate]').click();assert.deepEqual(cards().sort(),['ottawa','regina']);assert.equal(q('[data-canada-physical]').hidden,true);}finally{await w.happyDOM.close();}
});
test('Canadian only-selected water actually removes every other distribution and return/history restore all',async()=>{
 const w=await page('',true);try{const d=w.document,q=s=>d.querySelector(s);q('[data-canada-view=water]').click();assert.equal(q('[data-canada-water-layers]').getAttribute('display'),'');const picker=q('[data-canada-water]');picker.value='Mackenzie';picker.dispatchEvent(new w.Event('change'));const only=q('[data-canada-only]');only.checked=true;only.dispatchEvent(new w.Event('change'));const shapes=[...d.querySelectorAll('[data-canada-water-shape]')];assert.ok(shapes.filter(s=>s.style.display!=='none').every(s=>s.dataset.canadaWaterShape==='Mackenzie'));assert.ok(shapes.some(s=>s.style.display==='none'));const saved=new URL(w.location).search;q('[data-canada-all-water]').click();assert.ok(shapes.every(s=>s.style.display!== 'none'));assert.equal(only.checked,false);w.history.replaceState(null,'',saved);w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(only.checked,true);assert.ok(shapes.filter(s=>s.style.display!=='none').every(s=>s.dataset.canadaWaterShape==='Mackenzie'));q('[data-canada-reset]').click();assert.equal(q('[data-canada-map]').getAttribute('viewBox'),'0 0 900 580');}finally{await w.happyDOM.close();}
});
test('Official landform polygons, complete Japanese legend and selection text stay synchronized through isolate, history and mode changes',async()=>{
 const w=await page('?view=landform&cropReturn=product%3Dwheat',true);try{
  const d=w.document,q=s=>d.querySelector(s),host=q('[data-canada-landform]');
  assert.equal(host.hidden,false);assert.equal(host.querySelectorAll('[data-canada-landform-shape]').length,7);assert.equal(host.querySelectorAll('[data-canada-landform-legend]').length,7);
  assert.equal(host.querySelector('img'),null);assert.equal(q('.canada-landform-original').open,false);
  for(const button of host.querySelectorAll('[data-canada-landform-legend]')){
   button.click();const id=button.dataset.canadaLandformLegend;
   assert.equal(new URL(w.location).searchParams.get('landform'),id);assert.equal(button.getAttribute('aria-pressed'),'true');assert.match(q('[data-canada-landform-reading-title]').textContent,new RegExp(button.textContent.trim().replace(/[()]/g,'\\$&')));
   const only=q('[data-canada-landform-only]');only.checked=true;only.dispatchEvent(new w.Event('change'));
   assert.deepEqual([...host.querySelectorAll('[data-canada-landform-shape]:not([hidden])')].map(s=>s.dataset.canadaLandformShape),[id]);
  }
  const saved=new URL(w.location).search;q('[data-canada-view=water]').click();assert.equal(host.hidden,true);q('[data-canada-view=landform]').click();assert.equal(q('[data-canada-landform-only]').checked,true);
  q('[data-canada-landform-reset]').click();assert.equal(q('[data-canada-landform-only]').checked,false);assert.equal(host.querySelectorAll('[data-canada-landform-shape]:not([hidden])').length,7);
  w.history.replaceState(null,'',saved);w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-canada-landform-only]').checked,true);assert.equal(new URL(w.location).searchParams.get('cropReturn'),'product=wheat');assert.equal(host.querySelectorAll('[data-canada-landform-shape]:not([hidden])').length,1);
 }finally{await w.happyDOM.close();}
});
test('Every named water selection carries a matching explanation, isolated-view scope and history return',async()=>{
 const w=await page('?view=water',true);try{
  const d=w.document,q=s=>d.querySelector(s),picker=q('[data-canada-water]');
  assert.equal(q('[data-canada-reading="water"] [data-canada-general-reading]').open,false);
  for(const option of [...picker.options].filter(option=>option.value)){
   picker.value=option.value;picker.dispatchEvent(new w.Event('change'));
   assert.equal(q('[data-canada-water-reading-title]').textContent,option.textContent);
   assert.ok(q('[data-canada-water-reading-text]').textContent.length>20);
   assert.ok([...d.querySelectorAll('[data-canada-water-shape].is-selected')].every(shape=>shape.dataset.canadaWaterShape===option.value));
  }
  picker.value='Great Bear Lake';picker.dispatchEvent(new w.Event('change'));
  const only=q('[data-canada-only]');only.checked=true;only.dispatchEvent(new w.Event('change'));
  assert.match(q('[data-canada-water-reading-scope]').textContent,/選択水域だけ.*他の湖・川.*「すべての水系へ戻す」/);
  const saved=new URL(w.location).search;
  q('[data-canada-all-water]').click();
  assert.match(q('[data-canada-water-reading-title]').textContent,/湖と川/);
  assert.match(q('[data-canada-water-reading-scope]').textContent,/流域境界/);
  w.history.replaceState(null,'',saved);w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(q('[data-canada-water-reading-title]').textContent,'グレートベア湖');
  assert.equal(only.checked,true);
  assert.match(q('[data-canada-water-reading-text]').textContent,/グレートスレーブ湖.*区別/);
 }finally{await w.happyDOM.close();}
});
test('Initial HTML exposes the classified climate SVG and all its legends beside the capital chart without controller execution',async()=>{
 const w=await page();try{
  const d=w.document,host=d.querySelector('[data-canada-natural-layer="climate"]');
  assert.equal(host.hidden,false);
  assert.equal(d.querySelector('[data-canada-locator]').hidden,true);
  assert.equal(host.querySelectorAll('[data-canada-natural-shape]').length,14);
  assert.equal(host.querySelectorAll('.canada-natural-key [data-canada-natural-legend]').length,14);
  assert.equal(d.querySelector('[data-canada-natural-layer="elevation"]').hidden,true);
  assert.deepEqual([...d.querySelectorAll('[data-canada-climate-card]:not([hidden])')].map(card=>card.dataset.canadaClimateCard),['ottawa']);
  assert.equal(d.querySelector('[data-canada-climate-card="ottawa"]').querySelectorAll('tbody tr').length,12);
 }finally{await w.happyDOM.close();}
});
test('Agriculture comparison URLs keep the climate map and city chart primary through view changes and history while preserving the source GIS',async()=>{
 const saved='/insight-journal/atlas/north-america/canada/agriculture/?year=2021&province=Saskatchewan&metric=seeded';
 const search='?city=ottawa&view=climate&crop=canola&cropReturn='+encodeURIComponent(saved);
 const w=await page(search,true);try{
  const d=w.document,q=s=>d.querySelector(s),main=q('[data-canada-original-map-column]'),reading=q('[data-canada-original-reading]');
  const context=q('[data-canada-climate-context]'),source=q('[data-canada-crop-source]'),gis=q('[data-canada-crop-gis]');
  const assertClimate=()=>{
   assert.equal(q('[data-canada-natural-layer="climate"]').hidden,false);
   assert.equal(q('[data-canada-locator]').hidden,true);
   assert.equal(q('[data-canada-zone-reading]').hidden,false);
   assert.equal(main.contains(source),false);assert.equal(context.contains(source),true);
   assert.equal(reading.querySelector('[data-canada-crop-context]'),null);
   assert.equal(context.hidden,false);assert.equal(context.open,false);
   assert.equal(q('[data-canada-climate-card="ottawa"]').hidden,false);
   assert.equal(q('[data-canada-census-region]').options.length,1758);
   assert.equal(new URL(w.location).searchParams.get('cropReturn'),saved);
  };
  assertClimate();
  const config=q('[data-canada-census-config]').textContent;
  for(const view of ['water','landform','elevation']){
   q(`[data-canada-view=${view}]`).click();assert.equal(context.hidden,true);
   q('[data-canada-view=climate]').click();assertClimate();
   assert.equal(q('[data-canada-crop-gis]'),gis);assert.equal(q('[data-canada-census-config]').textContent,config);
  }
  w.history.replaceState(null,'',search.replace('view=climate','view=water'));w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(context.hidden,true);
  w.history.replaceState(null,'',search);w.dispatchEvent(new w.PopStateEvent('popstate'));assertClimate();
 }finally{await w.happyDOM.close();}
});
