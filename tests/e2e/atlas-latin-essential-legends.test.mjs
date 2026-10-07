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

test('Actual population layer changes distinguish circle counts, density colors and the combined comparison without losing selection or legends',async()=>{
 const{w,legend}=await page('population','?layer=population&place=CRI&scope=country&only=1',population);
 try{
  assert.equal(legend.parentElement.className,'latin-essential-legend');assert.match(note(w),/円面積.*2023.*人.*地色は固定/);assert.doesNotMatch(note(w),/平均密度/);assert.match(legend.textContent,/円の面積.*2023/);
  await change(w,'[data-lp-layer-select]','density');
  assert.match(note(w),/2023.*平均密度.*人\/陸地km²/);assert.doesNotMatch(note(w),/地色は固定/);assert.equal(legend.querySelectorAll('li').length,6);assert.match(legend.textContent,/対象統計なし.*0人とは区別/);
  await change(w,'[data-lp-layer-select]','scale');
  assert.match(note(w),/平均密度.*円面積.*国人口/);assert.equal(legend.querySelectorAll('li').length,6);assert.match(legend.textContent,/円の面積/);assert.equal(legend.closest('figure').className,'lp-target-figure');
  await change(w,'[data-lp-layer-select]','population');
  assert.equal(w.document.querySelector('[data-lp-target-legend]'),legend);assert.equal(legend.parentElement.className,'latin-essential-legend');assert.match(note(w),/円面積.*地色は固定/);assert.doesNotMatch(note(w),/平均密度/);
  assert.equal(state(w).get('place'),'CRI');assert.equal(state(w).get('scope'),'country');assert.equal(state(w).get('only'),'1');
 }finally{await w.happyDOM.close();}
});

test('The default GHSL overview precedes comparison actions and keeps its eight-class key under the map',async()=>{
 const {w,legend}=await page('population','',population);try{
  const overview=w.document.querySelector('[data-lp-spatial-summary]');
  const fixed=w.document.querySelector('.latin-reading-fixed');
  assert.equal(overview.parentElement,fixed);
  const children=[...fixed.children];
  assert.ok(children.indexOf(overview)<children.indexOf(fixed.querySelector('.latin-comparison-link')));
  assert.equal(legend.closest('figure').className,'lp-target-figure');
  assert.equal(legend.querySelectorAll('li').length,8);
  assert.equal(w.document.querySelector('.lp-example-options').open,false);
 }finally{await w.happyDOM.close();}
});
