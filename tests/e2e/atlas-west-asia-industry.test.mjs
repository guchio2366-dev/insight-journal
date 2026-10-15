import test from 'node:test';
import assert from 'node:assert/strict';
import {setupWestIndustry} from '../fixtures/west-asia-industry.mjs';
import {westIndustryCatalog as catalog} from '../../src/data/atlas/west-asia-industry-catalog.mjs';
import {westIndustryMapLabel} from '../../src/data/atlas/west-asia-industry-map.mjs';
import {westIndustryMapLocations} from '../../src/lib/atlas-west-asia-industry.mjs';

test('all 21 research series can be selected, explained and read with primary sources and definitions',async()=>{
 const app=await setupWestIndustry();const {w,q,all}=app;
 try{
  assert.equal(q('[data-wi-title]').textContent,'資源・エネルギー');assert(q('[data-wi-stat-overview]'));assert.equal(q('[data-wi-country]').options.length,21);
  const frame=q('[data-wi-map]').getAttribute('viewBox');
  for(const i of catalog){q(`[data-wi-sector="${i.sectors[0]}"]`).click();q(`[data-wi-picker="${i.sectors[0]}"] [data-wi-industry="${i.id}"]`).click();
   assert.equal(q('[data-wi-title]').textContent,westIndustryMapLabel(i,i.sectors[0]));assert(q('[data-wi-summary]').textContent.length>20);assert.equal(q(`[data-wi-stat-panel="${i.id}"]`).hidden,false);
   assert.equal(q('[data-wi-map]').getAttribute('viewBox'),frame);assert(q(`[data-wi-stat-panel="${i.id}"] a`).href.startsWith('https://'));
   assert.match(q(`[data-wi-missing="${i.id}"]`).textContent,/未取得.*0/s);
   const location=westIndustryMapLocations(i,i.sectors[0])[0];q(`[data-wi-place-button="${i.id}"][data-wi-place="${location.index}"]`).click();assert.equal(q('[data-wi-place-reading]').hidden,false);assert.match(q('[data-wi-place-reading]').textContent,new RegExp(location.stage));
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
  const frame=q('[data-wi-map]').getAttribute('viewBox'),positions=()=>({annotations:Object.fromEntries(all('[data-wi-annotation]').map(n=>[n.dataset.wiAnnotation,{left:n.style.left,top:n.style.top,width:n.style.width,height:n.style.height}])),points:all('[data-wi-point]').map(n=>[n.dataset.wiCluster,n.getAttribute('transform'),n.dataset.wiMembers]),guides:all('[data-wi-point-guide] line').map(n=>['x1','y1','x2','y2'].map(a=>n.getAttribute(a)))}),before=positions();
  q('[data-wi-picker=manufacturing] [data-wi-industry=polymers]').click();assert.deepEqual(positions(),before);
  q('[data-wi-point=polymers]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.deepEqual(positions(),before);assert.equal(q('[data-wi-map]').getAttribute('viewBox'),frame);
  const selected=w.location.search;const box=q('[data-wi-only]');box.checked=true;box.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(q('[data-wi-point=refining]').style.display==='none',true);assert.deepEqual(positions(),before);
  q('[data-wi-point=polymers]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-wi-only]').checked,true);assert.equal(q('[data-wi-point=refining]').style.display==='none',true);
  q('[data-wi-clear]').click();assert.equal(q('[data-wi-point=refining]').style.display,'');assert.deepEqual(positions(),before);
  restore(selected);assert.equal(q('[data-wi-title]').textContent,'基礎石化・PE／PP');assert.equal(q('[data-wi-place-reading]').hidden,false);assert.deepEqual(positions(),before);
  q('[data-wi-sector=manufacturing]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(q('[data-west-industry]').dataset.sector,'services');assert.equal(q('[data-wi-map]').getAttribute('viewBox'),frame);
 }finally{await w.happyDOM.close();}
});

test('each map contains only its sector stages, compact annotations and no industry controls',async()=>{
 const {w,q,all}=await setupWestIndustry();
 try{
  for(const sector of ['resources','manufacturing','services']){
   q(`[data-wi-sector="${sector}"]`).click();
   assert.equal(q('[data-wi-map]').dataset.mapSector,sector);
   assert.equal(all('.wi-map-frame [data-wi-industry],.wi-map-frame [data-wi-label],.wi-map-frame .wi-map-label').length,0);
   assert(all('[data-wi-annotation]').length<=4);assert.equal(all('[data-wi-connector]').length,0);
   for(const marker of all('[data-wi-point]')){
    const i=catalog.find(i=>i.id===marker.dataset.wiPoint),valid=westIndustryMapLocations(i,sector).map(l=>l.index);
    assert(i.sectors.includes(sector));assert(marker.dataset.wiMembers.split(',').map(Number).every(n=>valid.includes(n)));
   }
   if(sector==='services')assert.doesNotMatch(q('[data-wi-map-key]').textContent,/加工・製造|企業本社/);
  }
  q('[data-wi-sector=resources]').click();q('[data-wi-picker=resources] [data-wi-industry=aluminium]').click();
  assert.equal(q('[data-wi-country-shape=ARE]').getAttribute('fill'),'#f0efe3');assert.match(q('[data-wi-limit]').textContent,/別工程/);assert.match(q('[data-wi-ranking=aluminium]').textContent,/別工程/);assert.doesNotMatch(q('[data-wi-ranking=aluminium]').textContent,/未取得/);
 }finally{await w.happyDOM.close();}
});

test('manufacturing phosphate and direct-reduction maps use matching country quantities',async()=>{
 const {w,q}=await setupWestIndustry('?sector=manufacturing&industry=phosphate');
 try{
  assert.equal(q('[data-wi-title]').textContent,'リン酸肥料');assert.match(q('[data-wi-map-key]').textContent,/DAP生産/);assert.match(q('[data-wi-ranking=phosphate]').textContent,/6.233/);
  q('[data-wi-picker=manufacturing] [data-wi-industry=steel]').click();assert.match(q('[data-wi-map-key]').textContent,/DRI生産/);assert.match(q('[data-wi-ranking=steel]').textContent,/37.2/);
 }finally{await w.happyDOM.close();}
});
