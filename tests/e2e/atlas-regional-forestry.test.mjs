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
 for(const region of ['africa','latin-america','oceania','russia']){const window=await page(region,'',false);try{const document=window.document;assert.match(document.querySelector('.forest-reading').textContent,/概説.*解説/s);assert.equal(document.querySelectorAll('[data-forest-raster]').length,region==='russia'?1:0);assert.ok(document.querySelector('.forest-legend').textContent.includes('欠測'));assert.ok(document.querySelector('.forest-source-ledger').textContent.includes('403'));assert.equal(document.querySelectorAll('select').length,0);assert.match(document.querySelector('.forest-map-heading').textContent,region==='russia'?/2021年・西部のみ/:/全域の森林被覆面：未取得/);}finally{await window.happyDOM.close();}}
});
test('selection retains raster and every locator; clear, zoom and history restore independently',async()=>{
 for(const region of ['africa','latin-america','oceania','russia']){const window=await page(region);try{const document=window.document,q=selector=>document.querySelector(selector),config=JSON.parse(q('[data-forest-config]').textContent),map=q('[data-forest-map]'),original=map.getAttribute('viewBox'),image=q('[data-forest-raster]'),first=config.reading.examples[0].id,last=config.reading.examples.at(-1).id,count=document.querySelectorAll('svg [data-forest-example]').length;
  q(`button[data-forest-example="${first}"]`).click();assert.equal(q('[data-forest-reading-title]').textContent,config.reading.examples[0].title);assert.equal(map.getAttribute('viewBox'),original);assert.equal(document.querySelectorAll('svg [data-forest-example]').length,count);assert.equal(q('[data-forest-raster]'),image);
  q('[data-forest-zoom="in"]').click();assert.notEqual(map.getAttribute('viewBox'),original);const camera=map.getAttribute('viewBox');q(`button[data-forest-example="${last}"]`).click();assert.equal(map.getAttribute('viewBox'),camera);assert.equal(new URL(window.location.href).searchParams.get('example'),last);
  q('[data-forest-clear]').click();assert.equal(map.getAttribute('viewBox'),camera);assert.equal(new URL(window.location.href).searchParams.has('example'),false);
  window.history.replaceState(null,'',`?example=${first}&camera=${camera.replaceAll(' ',',')}`);window.dispatchEvent(new window.PopStateEvent('popstate'));assert.equal(map.getAttribute('viewBox'),camera);assert.equal(q('[data-forest-reading-title]').textContent,config.reading.examples[0].title);
  q('[data-forest-reset]').click();assert.equal(map.getAttribute('viewBox'),original);assert.equal(new URL(window.location.href).searchParams.has('camera'),false);
 }finally{await window.happyDOM.close();}}
});
test('failed western Russia image is missing and remains honest after another selection',async()=>{
 const window=await page('russia');try{const document=window.document;document.querySelector('[data-forest-raster]').dispatchEvent(new window.Event('error'));assert.equal(document.querySelector('[data-regional-forestry]').dataset.forestRasterStatus,'failed');assert.equal(document.querySelector('[data-forest-raster]'),null);document.querySelector('button[data-forest-example="northwest"]').click();assert.match(document.querySelector('[data-forest-fact]').textContent,/表示できない/);}finally{await window.happyDOM.close();}
});
