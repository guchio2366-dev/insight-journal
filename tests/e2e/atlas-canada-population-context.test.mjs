import {canadaLegacyPoint} from '../../src/lib/atlas-canada-map-presentation.ts';
import {projectCanadaLandform} from '../../src/lib/atlas-canada-landform-map.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
import {Window} from 'happy-dom';

const population=JSON.parse(await readFile('src/data/atlas/canada/population.json','utf8'));
const geometry=JSON.parse(await readFile('src/data/atlas/canada/population-geometry.json','utf8'));
const code=await bundleCanadaSource('src/scripts/atlas-canada-nature.ts',{globalName:'CanadaNatureController'})+"\nCanadaNatureController.initCanadaNature(document.querySelector('[data-canada-nature]'));";
const sourceState={year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected'};

function query(patch={},nature={city:'ottawa',view:'water',water:'Lake Ontario',only:'1'}){
 const saved=new URLSearchParams({...sourceState,...patch});
 const params=new URLSearchParams({...nature,populationReturn:saved.toString()});
 return `?${params}`;
}
async function page(search=''){
 const w=new Window({url:`https://example.com/insight-journal/atlas/north-america/canada/nature/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write((await readFile('dist/atlas/north-america/canada/nature/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 if(new URL(w.location.href).searchParams.get('populationReturn')){
  const element=w.document.querySelector('[data-canada-config]');assert.ok(element,'Built nature HTML retains its configuration');
  const config=JSON.parse(element.textContent);assert.ok(config.population,'Built nature HTML retains population comparison metadata');
  // Model a completed static-asset hydration here; the loader suite independently
  // verifies asynchronous loading, ordinary-page no-fetch and explicit failure.
  config.population.geometry=geometry.features;element.textContent=JSON.stringify(config);
 }
 w.eval(code);
 return w;
}
function change(w,selector,value){const el=w.document.querySelector(selector);assert.ok(el,selector);el.value=value;el.dispatchEvent(new w.Event('change'));}
function markerText(marker){return `${marker.getAttribute('aria-label')??''} ${marker.textContent}`;}
function assertSourceDistribution(layer,year=2016){
 const markers=[...layer.querySelectorAll('[data-canada-population-context-cma]')].filter(g=>g.style.display!=='none'&&g.getAttribute('display')!=='none'&&!g.hasAttribute('hidden'));
 assert.equal(markers.length,2);
 assert.deepEqual(new Set(markers.map(g=>g.dataset.canadaPopulationContextCma)),new Set(['535','462']));
 for(const id of ['535','462']){
  const marker=layer.querySelector(`[data-canada-population-context-cma="${id}"]`),record=population.cmas.find(r=>r.id===id),shape=geometry.features.find(g=>g.id===id);
  const boundary=marker.querySelector('[data-canada-population-context-boundary]'),circle=marker.querySelector('[data-canada-population-context-symbol]');
  assert.ok(boundary,'Original CMA boundary is retained');assert.ok(marker.querySelector('[data-canada-population-context-label]').textContent.includes(record.name.split('（')[0]));
  assert.ok(circle,'Original population symbol is retained');
  assert.equal(boundary.getAttribute('fill-rule'),'evenodd');
  const first=boundary.getAttribute('d').match(/^M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  assert.ok(first,'CMA boundary has projected coordinates');
  const [lon,lat]=shape.rings[0][0];
  assert.ok(Math.abs(Number(first[1])-((layer.hasAttribute('data-canada-population-context-map')||layer.hasAttribute('data-canada-population-context-mini-map'))?projectCanadaLandform([lon,lat])[0]:(lon+145)/95*900))<0.01);
  assert.ok(Math.abs(Number(first[2])-((layer.hasAttribute('data-canada-population-context-map')||layer.hasAttribute('data-canada-population-context-mini-map'))?projectCanadaLandform([lon,lat])[1]:(85-lat)/45*580))<0.01);
  assert.ok(Math.abs(Number(circle.getAttribute('cx'))-((layer.hasAttribute('data-canada-population-context-map')||layer.hasAttribute('data-canada-population-context-mini-map'))?canadaLegacyPoint(shape.point)[0]:shape.point[0]))<0.01);
  assert.ok(Math.abs(Number(circle.getAttribute('cy'))-((layer.hasAttribute('data-canada-population-context-map')||layer.hasAttribute('data-canada-population-context-mini-map'))?canadaLegacyPoint(shape.point)[1]:shape.point[1]))<0.01);
  assert.notEqual(circle.style.display,'none');
  assert.ok(Number(circle.getAttribute('r'))>0);
  assert.ok(markerText(marker).includes(String(year)));
  assert.ok(markerText(marker).includes(record.population[year].value.toLocaleString('ja-JP')));
  if(record.population[year].symbol)assert.ok(markerText(marker).includes(record.population[year].symbol));
 }
 const radius=id=>Number(layer.querySelector(`[data-canada-population-context-cma="${id}"] [data-canada-population-context-symbol]`).getAttribute('r'));
 const count=id=>population.cmas.find(r=>r.id===id).population[year].value;
 assert.ok(Math.abs((radius('535')/radius('462'))**2-count('535')/count('462'))<0.0001,'Circle areas preserve the original population ratio');
}

test('Population water context retains the original 2016 CMA distribution, periods, dedicated explanation and a local whitelisted return',async()=>{
 const w=await page(query({unrelated:'drop',returnTo:'https://outside.example/'}));
 try{
  const q=s=>w.document.querySelector(s),context=q('[data-canada-population-context]'),layer=q('[data-canada-population-context-map]');
  assert.ok(context);assert.equal(context.hidden,false);assert.equal(layer.style.display,'');
  assert.equal(q('[data-canada-map]').getAttribute('viewBox'),'0 0 900 580');
  assertSourceDistribution(layer);
  const text=q('[data-canada-population-context-text]').textContent;
  assert.match(text,/Toronto|トロント/);assert.match(text,/Montréal|モントリオール/);assert.match(text,/Ontario|オンタリオ/);
  assert.doesNotMatch(text,/Fraser|針葉樹林|木材輸送/);
  const legend=q('[data-canada-population-context-legend]');
  assert.equal(legend.hidden,false);assert.equal(layer.querySelectorAll('[data-canada-population-legend-count]').length,2);assert.match(q('[data-canada-position-caption]').textContent,/人口円の中心.*都市圏.*観測|小さい点は気候観測地点.*人口円の中心/s);
  assert.match(legend.textContent,/2021.*境界|境界.*2021/s);
  assert.match(legend.textContent,/2016.*人口|人口.*2016/s);
  assert.match(legend.textContent,/Natural Earth/);assert.match(legend.textContent,/ECCC/);assert.match(legend.textContent,/1991[–−-]2020/);
  const link=q('[data-canada-population-return]'),back=new URL(link.href);
  assert.equal(link.hidden,false);assert.equal(back.origin,'https://example.com');
  assert.equal(back.pathname,'/insight-journal/atlas/north-america/canada/population/');
  assert.deepEqual(Object.fromEntries(back.searchParams),sourceState);
  assert.equal(q('[data-canada-water-shape="Lake Ontario"]').style.display,'');
 }finally{await w.happyDOM.close();}
});

test('Population comparison follows the visible water selection while retaining its original Ontario question and CMA state',async()=>{
 const w=await page(query());
 try{
  const q=s=>w.document.querySelector(s);
  change(w,'[data-canada-water]','Mackenzie');
  q('[data-canada-only]').checked=true;q('[data-canada-only]').dispatchEvent(new w.Event('change'));
  assert.equal(q('[data-canada-water-shape="Lake Ontario"]').style.display,'none');
  assert.equal(q('[data-canada-water-shape="Mackenzie"]').style.display,'');
  const text=q('[data-canada-population-context-text]').textContent;
  assert.match(text,/Mackenzie.*だけ/s);assert.match(text,/Ontario|オンタリオ/);assert.match(text,/元の|比較入口|元に|元へ/);
  assert.doesNotMatch(text,/Ontario湖の位置を重ね|Fraser|針葉樹林/);
  assertSourceDistribution(q('[data-canada-population-context-map]'));
  assert.deepEqual(Object.fromEntries(new URL(q('[data-canada-population-return]').href).searchParams),sourceState);
 }finally{await w.happyDOM.close();}
});

test('Population climate comparison names the actual Ottawa or Vancouver observation and distinguishes one point from a CMA average',async()=>{
 const w=await page(query());
 try{
  const q=s=>w.document.querySelector(s);
  q('[data-canada-view="climate"]').click();
  for(const [city,name] of [['ottawa',/Ottawa|オタワ/],['vancouver',/Vancouver|バンクーバー/]]){
   change(w,'[data-canada-city]',city);
   const text=q('[data-canada-population-context-text]').textContent;
   assert.match(text,name);assert.match(text,/1地点|1観測点/);assert.match(text,/都市圏.*平均|CMA.*平均/s);
   assert.doesNotMatch(text,/針葉樹林|木材輸送/);
   assertSourceDistribution(q('[data-canada-population-context-map]'));
  }
 }finally{await w.happyDOM.close();}
});

test('Population landform comparison preserves a visible original-distribution mini map and hides the incompatible main overlay',async()=>{
 const w=await page(query());
 try{
  const q=s=>w.document.querySelector(s);
  q('[data-canada-view="landform"]').click();
  assert.equal(q('[data-canada-population-context]').hidden,false);
  assert.equal(q('[data-canada-population-context-map]').style.display,'none');
  assert.equal(q('[data-canada-population-context-legend]').hidden,true);
  const mini=q('[data-canada-population-context-mini-map]');
  assert.ok(mini);assert.equal(mini.hasAttribute('hidden'),false);assert.notEqual(mini.style.display,'none');assert.notEqual(mini.getAttribute('display'),'none');
  assertSourceDistribution(mini);assert.ok(mini.querySelector('.canada-land'));assert.notEqual(mini.getAttribute('viewBox'),'0 0 900 580');
  assert.match(q('[data-canada-population-context-text]').textContent,/地形/);
  assert.match(q('[data-canada-population-context-text]').textContent,/投影|重ね/);
 }finally{await w.happyDOM.close();}
});

test('Population density context uses 2021 original density and default nature keeps Ottawa without any population context',async()=>{
 const density=await page(query({metric:'density'}));
 try{
  const q=s=>density.document.querySelector(s),layer=q('[data-canada-population-context-map]');
  assert.equal(layer.style.display,'');assert.equal(layer.querySelectorAll('[data-canada-population-density-swatch]').length,5);
  for(const id of ['535','462']){
   const marker=layer.querySelector(`[data-canada-population-context-cma="${id}"]`),record=population.cmas.find(r=>r.id===id);
   assert.equal(marker.querySelector('[data-canada-population-context-symbol]').style.display,'none');
   assert.ok(markerText(marker).includes('2021'));
   assert.ok(markerText(marker).includes(record.density2021.value.toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1})));
  }
  assert.match(q('[data-canada-population-context-legend]').textContent,/2021.*密度|密度.*2021/s);
  assert.equal(new URL(q('[data-canada-population-return]').href).searchParams.get('year'),'2021');
 }finally{await density.happyDOM.close();}
 const plain=await page();
 try{
  const q=s=>plain.document.querySelector(s);
  assert.equal(q('[data-canada-city]').value,'ottawa');
  assert.equal(q('[data-canada-population-context]').hidden,true);
  assert.equal(q('[data-canada-population-context-map]').style.display,'none');
  assert.equal(q('[data-canada-population-context-legend]').hidden,true);
  assert.equal(q('[data-canada-population-return]').hidden,true);
 }finally{await plain.happyDOM.close();}
});

test('Comparison keeps its specific question first while preserving general geography in an optional disclosure',async()=>{
 const compared=await page(query());
 try{
  const d=compared.document,details=[...d.querySelectorAll('[data-canada-general-reading]')];assert.equal(details.length,2);
  assert.ok(details.every(detail=>!detail.open));
  assert.match(details[1].textContent,/Mackenzie/);assert.ok(d.querySelector('[data-canada-population-context-text]').textContent.includes('Ontario'));
  details[1].open=true;d.querySelector('[data-canada-view="landform"]').click();assert.equal(details[1].open,true);
  d.defaultView.history.replaceState(null,'','?view=water');d.defaultView.dispatchEvent(new d.defaultView.PopStateEvent('popstate'));
  assert.equal(details[0].open,false,'landform background stays optional beside its new region-specific reading');assert.equal(details[1].open,false,'standalone water puts the selected-feature question before general background');assert.match(d.querySelector('[data-canada-water-reading-text]').textContent,/地図の川名から選ぶ/);details[1].open=true;assert.match(details[1].textContent,/Mackenzie/);assert.ok(details[1].querySelector('a[href="https://www.naturalearthdata.com/downloads/50m-physical-vectors/"]'));assert.equal(d.querySelector('[data-canada-population-context]').hidden,true);
 }finally{await compared.happyDOM.close();}
});
