import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const code=(await build({stdin:{contents:"import {initRegionalForestry} from './src/scripts/atlas-regional-forestry';initRegionalForestry();",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife'})).outputFiles[0].text;
async function page(region,query='',interactive=true){
 const window=new Window({url:`https://example.com/insight-journal/atlas/${region}/agriculture/forestry/${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableComputedStyleRendering:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.write((await readFile(`dist/atlas/${region}/agriculture/forestry/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 if(interactive)window.eval(code);return window;
}
test('all four built pages expose honest coverage and an overview before selection',async()=>{
 for(const region of ['africa','latin-america','oceania','russia']){const window=await page(region,'',false);try{const document=window.document;assert.match(document.querySelector('.forest-reading').textContent,/概説.*解説/s);assert.equal(document.querySelectorAll('[data-forest-raster]').length,region==='russia'?1:0);assert.ok(document.querySelector('.forest-legend').textContent.includes(['africa','latin-america'].includes(region)?'全域の被覆未取得':'欠測'));assert.ok(document.querySelector('.forest-source-ledger').textContent.includes('403'));assert.equal(document.querySelectorAll('select').length,0);assert.match(document.querySelector('.forest-map-heading').textContent,region==='russia'?/2021年：西部.*2020年参考図/:region==='oceania'?/2020年参考図：PNG西部/:/全域の森林被覆面：未取得/);}finally{await window.happyDOM.close();}}
});
test('Russia forestry map includes national statistics without presenting them as map coverage',async()=>{
 const window=await page('russia','',false);try{
  const section=window.document.querySelector('[data-russia-forestry-statistics]');
  assert.ok(section);
  assert.match(section.textContent,/2015–2024年全国統計/);
  assert.match(section.textContent,/地図や学習地域の範囲ではなく/);
  assert.match(section.textContent,/森林面積/);
  assert.match(section.textContent,/丸太生産量/);
  assert.match(section.textContent,/製材生産量/);
 }finally{await window.happyDOM.close();}
 for(const region of ['africa','latin-america','oceania']){const window=await page(region,'',false);try{assert.equal(window.document.querySelector('[data-russia-forestry-statistics]'),null);}finally{await window.happyDOM.close();}}
});
test('selection retains raster and every locator; clear, zoom and history restore independently',async()=>{
 for(const region of ['africa','latin-america','oceania','russia']){const window=await page(region);try{const document=window.document,q=selector=>document.querySelector(selector),config=JSON.parse(q('[data-forest-config]').textContent),map=q('[data-forest-map]'),original=map.getAttribute('viewBox'),image=q('[data-forest-raster]'),references=[...document.querySelectorAll('[data-forest-reference]')],first=config.reading.examples[0].id,last=config.reading.examples.at(-1).id,count=document.querySelectorAll('svg [data-forest-example]').length;
  q(`button[data-forest-example="${first}"]`).click();assert.equal(q('[data-forest-reading-title]').textContent,config.reading.examples[0].title);assert.equal(map.getAttribute('viewBox'),original);assert.equal(document.querySelectorAll('svg [data-forest-example]').length,count);assert.equal(q('[data-forest-raster]'),image);assert.deepEqual([...document.querySelectorAll('[data-forest-reference]')],references);
  q('[data-forest-zoom="in"]').click();assert.notEqual(map.getAttribute('viewBox'),original);const camera=map.getAttribute('viewBox');q(`button[data-forest-example="${last}"]`).click();assert.equal(map.getAttribute('viewBox'),camera);assert.equal(new URL(window.location.href).searchParams.get('example'),last);
  q('[data-forest-clear]').click();assert.equal(map.getAttribute('viewBox'),camera);assert.equal(new URL(window.location.href).searchParams.has('example'),false);
  window.history.replaceState(null,'',`?example=${first}&camera=${camera.replaceAll(' ',',')}`);window.dispatchEvent(new window.PopStateEvent('popstate'));assert.equal(map.getAttribute('viewBox'),camera);assert.equal(q('[data-forest-reading-title]').textContent,config.reading.examples[0].title);
  q('[data-forest-reset]').click();assert.equal(map.getAttribute('viewBox'),original);assert.equal(new URL(window.location.href).searchParams.has('camera'),false);
 }finally{await window.happyDOM.close();}}
});
test('failed western Russia image is missing and remains honest after another selection',async()=>{
 const window=await page('russia');try{const document=window.document;document.querySelector('[data-forest-raster]').dispatchEvent(new window.Event('error'));assert.equal(document.querySelector('[data-regional-forestry]').dataset.forestRasterStatus,'failed');assert.equal(document.querySelector('[data-forest-raster]'),null);document.querySelector('button[data-forest-example="northwest"]').click();assert.match(document.querySelector('[data-forest-fact]').textContent,/樹木被覆画像を表示できません/);}finally{await window.happyDOM.close();}
});

test('failed reference images stay unclassified and do not claim visible forest',async()=>{
 const window=await page('oceania');try{const document=window.document;document.querySelector('[data-forest-reference]').dispatchEvent(new window.Event('error'));assert.equal(document.querySelector('[data-regional-forestry]').dataset.forestReferenceStatus,'failed');assert.equal(document.querySelector('[data-forest-reference]'),null);document.querySelector('button[data-forest-example="png"]').click();assert.match(document.querySelector('[data-forest-fact]').textContent,/参考画像を表示できません/);}finally{await window.happyDOM.close();}
});

test('wholly unacquired Africa and Latin maps use a neutral base; partial coverage keeps its missing hatch',async()=>{
 for(const region of ['africa','latin-america','oceania','russia']){const window=await page(region,'',false);try{const document=window.document,land=document.querySelector('[data-forest-land]'),wholeMissing=['africa','latin-america'].includes(region),fills=[...land.querySelectorAll('path')].map(path=>path.getAttribute('fill'));
  assert.ok(fills.length>0);assert.ok(fills.every(fill=>wholeMissing?fill==='#f1eee5':fill===`url(#forest-missing-${region})`));
  assert.equal(!!document.querySelector(`#forest-missing-${region}`),!wholeMissing);
  if(wholeMissing){assert.match(document.querySelector('.forest-map-heading').textContent,/全域の森林被覆面：未取得/);assert.match(document.querySelector('[data-forest-map-note]').textContent,/中立色は森林の有無を示しません/);assert.doesNotMatch(document.querySelector('[data-forest-fact]').textContent,/斜線/);assert.doesNotMatch(document.querySelector('[data-forest-map]').getAttribute('aria-label'),/斜線/);}
 }finally{await window.happyDOM.close();}}
});
