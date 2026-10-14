import test from 'node:test';
import assert from 'node:assert/strict';
import {setupWestIndustry} from '../fixtures/west-asia-industry.mjs';
import {westIndustryCatalog as catalog} from '../../src/data/atlas/west-asia-industry-catalog.mjs';

test('all 21 research series can be selected, explained and read with primary sources and definitions',async()=>{
 const app=await setupWestIndustry();const {w,q,all}=app;
 try{
  assert.equal(q('[data-wi-title]').textContent,'資源・エネルギー');assert(q('[data-wi-stat-overview]'));assert.equal(q('[data-wi-country]').options.length,21);
  const frame=q('[data-wi-map]').getAttribute('viewBox');
  for(const i of catalog){q(`[data-wi-sector="${i.sectors[0]}"]`).click();q(`[data-wi-picker="${i.sectors[0]}"] [data-wi-industry="${i.id}"]`).click();
   assert.equal(q('[data-wi-title]').textContent,i.label);assert.equal(q('[data-wi-summary]').textContent,i.summary);assert.equal(q(`[data-wi-stat-panel="${i.id}"]`).hidden,false);
   assert.equal(q('[data-wi-map]').getAttribute('viewBox'),frame);assert(q(`[data-wi-stat-panel="${i.id}"] a`).href.startsWith('https://'));
   assert.match(q(`[data-wi-missing="${i.id}"]`).textContent,/未取得.*0/s);
   q(`[data-wi-point="${i.id}"]`).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-wi-place-reading]').hidden,false);assert.match(q('[data-wi-place-reading]').textContent,new RegExp(i.locations[0].stage));
  }
  assert.equal(all('[data-wi-stat-panel]').length,21);
 }finally{await w.happyDOM.close();}
});
test('countries preserve distribution and missingness; ports and airports never shade a country with a facility total',async()=>{
 const {w,q,selectCountry}=await setupWestIndustry('?industry=lng');
 try{
  const frame=q('[data-wi-map]').getAttribute('viewBox');
  assert.notEqual(q('[data-wi-country-shape=QAT]').getAttribute('fill'),'#f0efe3');
  assert.equal(q('[data-wi-country-shape=IRN]').getAttribute('fill'),'#f0efe3');
  selectCountry('IRN');assert.match(q('[data-wi-ranking=lng]').textContent,/未取得.*0/s);assert.equal(q('[data-wi-map]').getAttribute('viewBox'),frame);assert.equal(q('[data-wi-country-shape=IRN]').getAttribute('fill'),'#f0efe3');
  q('[data-wi-sector=services]').click();q('[data-wi-picker=services] [data-wi-industry=ports]').click();assert.equal(q('[data-wi-country-shape=ARE]').getAttribute('fill'),'#f0efe3');assert.match(q('[data-wi-map-key]').textContent,/規模は地図下/);
  q('[data-wi-picker=services] [data-wi-industry=aviation]').click();assert.equal(q('[data-wi-country-shape=ARE]').getAttribute('fill'),'#f0efe3');
 }finally{await w.happyDOM.close();}
});
test('industry and place selection, filtering and history keep camera and peer labels stable',async()=>{
 const {w,q,all,restore}=await setupWestIndustry('?sector=manufacturing');
 try{
  const frame=q('[data-wi-map]').getAttribute('viewBox'),positions=()=>Object.fromEntries(all('[data-wi-label]').map(n=>[n.dataset.wiLabel,{left:n.style.left,top:n.style.top,width:n.style.width,height:n.style.height}])),before=positions();
  q('[data-wi-label=polymers]').click();assert.deepEqual(positions(),before);
  q('[data-wi-point=polymers]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.deepEqual(positions(),before);assert.equal(q('[data-wi-map]').getAttribute('viewBox'),frame);
  const selected=w.location.search;const box=q('[data-wi-only]');box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(q('[data-wi-label=refining]').hidden,true);assert.deepEqual(positions(),before);
  q('[data-wi-point=polymers]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-wi-only]').checked,true);assert.equal(q('[data-wi-label=refining]').hidden,true);
  q('[data-wi-clear]').click();assert.equal(q('[data-wi-label=refining]').hidden,false);assert.deepEqual(positions(),before);
  restore(selected);assert.equal(q('[data-wi-title]').textContent,'基礎石化・PE／PP');assert.equal(q('[data-wi-place-reading]').hidden,false);assert.deepEqual(positions(),before);
  q('[data-wi-sector=manufacturing]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(q('[data-west-industry]').dataset.sector,'services');assert.equal(q('[data-wi-map]').getAttribute('viewBox'),frame);
 }finally{await w.happyDOM.close();}
});
