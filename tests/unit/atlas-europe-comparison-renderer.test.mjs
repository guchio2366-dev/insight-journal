import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { renderEuropeOrigin } from '../../src/lib/atlas-europe-comparison-renderer.ts';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
import { europeReadings } from '../../src/data/atlas/europe/readings.ts';
import { viewPath } from '../../src/lib/atlas-europe-view.ts';
const json=name=>JSON.parse(readFileSync(new URL('../../src/data/atlas/'+name,import.meta.url),'utf8'));
const config={layers:europeLayers,farmingAreas:json('europe/farming-areas.json'),geography:json('europe-countries.json'),readings:europeReadings,statistics:json('europe/country-statistics.json'),countries:json('europe/countries.json'),climateWater:json('europe/climate-water.json'),cities:json('europe/climate-cities.json'),populationCities:json('europe/population-cities.json')};
const state=layer=>({region:'all',place:'',city:'london',compare:[],render:'static',layer,returnLayer:layer});
function setup() {
  const window=new Window();globalThis.document=window.document;
  const root=document.createElement('div');root.innerHTML='<svg data-eu-static><g data-eu-comparison-overlay></g></svg><section data-eu-origin-key><div data-eu-origin-caption></div><div data-eu-origin-legend></div><svg data-eu-origin-map></svg></section>';
  document.body.append(root);return {window,root};
}

test('crop climate comparison carries the published crop geometry, not a quantity or farm boundary',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('wheat'),single:true},europeLayers.find(l=>l.id==='climate'),config);
    const path=root.querySelector('[data-eu-comparison-overlay] path');
    assert.equal(path.getAttribute('d'),viewPath(config.farmingAreas.features.find(f=>f.properties.id==='wheat').geometry));
    assert.equal(path.getAttribute('fill'),'none');
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/小麦.*主な集中域/);
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/2020年頃/);
    assert.equal(root.querySelector('[data-eu-origin-map]').hidden,true);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('hidden original crop stays hidden; single selection overrides a saved crop toggle',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('wheat'),showCrops:false},europeLayers.find(l=>l.id==='climate'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] path').length,0);
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/元の選択.*非表示/);
    renderEuropeOrigin(root,{...state('wheat'),showCrops:false,single:true},europeLayers.find(l=>l.id==='climate'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] path').length,1);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('population comparison keeps every density interval, missing-data key and the registered source image',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,state('density'),europeLayers.find(l=>l.id==='hubs'),config);
    const rows=[...root.querySelectorAll('[data-eu-origin-legend]>div')];
    assert.deepEqual(rows.map(r=>r.textContent),[...europeLayers.find(l=>l.id==='density').labels,'データなし']);
    const image=root.querySelector('[data-eu-origin-map] image');
    assert.equal(image.getAttribute('href'),'/assets/atlas/europe/population-v1/density.png');
    assert.equal(image.getAttribute('width'),'1200');assert.equal(image.getAttribute('height'),'1001');
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/2020.*人\/km²/);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('industrial source mark is the sourced Rotterdam position; invalid context clears source marks and legend',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('hubs'),feature:'rotterdam'},europeLayers.find(l=>l.id==='water'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] circle').length,1);
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/ロッテルダム.*代表位置.*数量ではない/);
    renderEuropeOrigin(root,null,europeLayers.find(l=>l.id==='water'),config);
    assert.equal(root.querySelector('[data-eu-origin-key]').hidden,true);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] circle').length,0);
    assert.equal(root.querySelector('[data-eu-origin-legend]').textContent,'');
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('national source comparison retains all numeric colour classes and its missing-data key',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,state('forest'),europeLayers.find(l=>l.id==='hubs'),config);
    assert.deepEqual([...root.querySelectorAll('[data-eu-origin-legend]>div')].map(r=>r.textContent),['10未満','10〜20未満','20〜40未満','40〜60未満','60〜80未満','80以上','データなし']);
    assert.equal(root.querySelector('[data-eu-origin-map]').hidden,false);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('source hub positions follow the original country mask and never turn a river into an industrial site',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('hubs'),place:'FRA',feature:'rhine'},europeLayers.find(l=>l.id==='water'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] circle').length,1);
    assert.equal(root.querySelector('[data-eu-comparison-overlay] text'),null);
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/1産業拠点/);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('legacy overlay returnLayer climate keeps wheat data and its complete numeric legend',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('overlay'),returnLayer:'climate'},europeLayers.find(l=>l.id==='density'),config);
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/小麦.*収穫面積 ha/);
    assert.equal(root.querySelectorAll('[data-eu-origin-legend]>div').length,7);
    assert.match(root.querySelector('[data-eu-origin-map] image').getAttribute('href'),/wheat-v1\/wheat.png/);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('climate source mini retains all 17 classes and the official water mask above the classified image',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,state('climate'),europeLayers.find(l=>l.id==='crops'),config);
    const image=root.querySelector('[data-eu-origin-map] image');
    assert.equal(root.querySelectorAll('[data-eu-origin-legend]>div').length,18);
    const mask=[...root.querySelectorAll('[data-eu-origin-map] path')].find(p=>p.getAttribute('fill')==='#e7eff1');
    assert.ok(mask);assert.ok(image.compareDocumentPosition(mask)&4);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('source mini preserves the selected observation, population-city and country marks',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('climate'),city:'paris'},europeLayers.find(l=>l.id==='crops'),config);
    assert.equal(root.querySelector('[data-eu-origin-point]').getAttribute('data-eu-origin-point'),'paris');
    const city=config.populationCities.find(c=>c.name==='パリ');assert.ok(city);
    renderEuropeOrigin(root,{...state('density'),feature:city.id},europeLayers.find(l=>l.id==='hubs'),config);
    assert.equal(root.querySelector('[data-eu-origin-point]').getAttribute('data-eu-origin-point'),city.id);
    renderEuropeOrigin(root,{...state('forest'),place:'FIN'},europeLayers.find(l=>l.id==='hubs'),config);
    assert.ok(root.querySelector('[data-eu-origin-place="FIN"]'));
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
