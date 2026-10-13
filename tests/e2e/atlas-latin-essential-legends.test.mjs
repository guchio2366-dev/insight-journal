import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {industryBundle} from '../unit/atlas-latin-industry-helpers.mjs';
import {populationBundle} from '../unit/atlas-latin-population-helpers.mjs';

const layout="import {initLatinWorkspaceLayout} from './src/scripts/atlas-latin-workspace-layout.ts';initLatinWorkspaceLayout();";
const industry=await industryBundle("import {initLatinIndustry} from './src/scripts/atlas-latin-industry.ts';initLatinIndustry(document.querySelector('[data-latin-industry]'));"+layout,'iife','browser',true);
const population=await populationBundle("import {initLatinPopulation} from './src/scripts/atlas-latin-america-population.ts';initLatinPopulation(document.querySelector('[data-latin-field=population]'));"+layout,'iife','browser',true);
async function page(field,search,code){
 const w=new Window({url:`https://example.com/insight-journal/atlas/latin-america/${field}/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.matchMedia=()=>({matches:true});
 const html=await readFile(`dist/atlas/latin-america/${field}/index.html`,'utf8');
 w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style>[\s\S]*?<\/style>/g,''));
 const legend=w.document.querySelector(field==='industry'?'[data-industry-primary-legend]':'[data-lp-target-legend]');
 w.eval(code);await w.happyDOM.whenAsyncComplete();return{w,legend};
}
async function change(w,selector,value){const element=w.document.querySelector(selector);element.value=value;element.dispatchEvent(new w.Event('change',{bubbles:true}));await w.happyDOM.whenAsyncComplete();}
const note=w=>w.document.querySelector('.latin-essential-legend-note').textContent;
const state=w=>new URL(w.location).searchParams;

test('Actual industry layer changes keep the real legend and replace export notes with the non-proportional canal explanation',async()=>{
 const{w,legend}=await page('industry','?layer=ores&place=PAN&scope=country&only=1',industry);
 try{
  assert.equal(legend.parentElement.className,'latin-essential-legend');assert.match(note(w),/商品輸出.*%.*2024/);
  await change(w,'[data-industry-layer]','canal');
  assert.equal(w.document.querySelector('[data-industry-primary-legend]'),legend);assert.match(note(w),/2024会計年度.*矢印.*比例図ではありません/);assert.doesNotMatch(note(w),/商品輸出|国境|%/);
  assert.match(legend.textContent,/矢印.*比例図ではありません/);assert.match(w.document.querySelector('[data-industry-primary-map]').textContent,/9,944回/);
  await change(w,'[data-industry-layer]','manufactures');
  assert.match(note(w),/商品輸出.*%.*2024/);assert.doesNotMatch(note(w),/矢印/);assert.equal(legend.querySelectorAll('span').length,8);assert.match(legend.textContent,/欠測.*対象統計なし/);
  assert.equal(state(w).get('place'),'PAN');assert.equal(state(w).get('scope'),'country');assert.equal(state(w).get('only'),'1');
 }finally{await w.happyDOM.close();}
});

test('Population decoding remains with the new reading map and no comparison controls are injected',async()=>{
 const code=await populationBundle("import {initLatinReadingPopulation} from './src/scripts/atlas-latin-reading-population.ts';initLatinReadingPopulation(document.querySelector('[data-latin-field=population]'));"+layout,'iife','browser',true);
 const {w,legend}=await page('population','',code);try{assert.equal(w.document.querySelector('.latin-comparison-link'),null);assert.equal(w.document.querySelector('.latin-essential-legend'),null);assert.match(legend.textContent,/推計密度.*2020|2020.*推計密度/);await change(w,'[data-lp-layer-select]','spatial');assert.equal(legend.querySelectorAll('li').length,5);assert.match(legend.textContent,/人\/km²/);}finally{await w.happyDOM.close();}
});
