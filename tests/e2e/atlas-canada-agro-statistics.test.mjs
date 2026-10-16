import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const controller=await bundleCanadaSource('src/scripts/atlas-canada-agro-statistics.ts',{globalName:'CanadaStats'});
const overview=await bundleCanadaSource('src/scripts/atlas-canada-agriculture-overview.ts',{globalName:'CanadaOverview'});
const forestController=await bundleCanadaSource('src/scripts/atlas-canada-forestry.ts',{globalName:'CanadaForest'});
async function page(path='',query=''){
 const w=new Window({url:`https://example.test/insight-journal/atlas/north-america/canada/agriculture/${path}${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const html=await readFile(`dist/atlas/north-america/canada/agriculture/${path}index.html`,'utf8');
 w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 w.eval(controller+';CanadaStats.initCanadaSelectedAgroStatistics(document.querySelector("[data-canada-selected-agro]"));');return w;
}
test('built Canada overview keeps original unselected content and switches actual map product templates in all existing major products',async()=>{
 const w=await page();try{
  const root=w.document.querySelector('[data-canada-agriculture]'),original=root.querySelector('[data-agro-statistics]'),content=root.querySelector('[data-canada-agro-content]');
  const before=original.innerHTML;assert.equal(original.hidden,false);assert.equal(root.querySelector('[data-canada-selected-statistics]').hidden,true);
  for(const product of ['canola','wheat','beef','dairy','pork','chicken','soybeans','corn','lentils','potatoes']){
   root.dispatchEvent(new w.CustomEvent('canada-agro-selection',{detail:{product}}));
   assert.equal(original.hidden,true);assert.equal(content.querySelectorAll('.agro-columns>section').length,3,product);
   assert.equal(content.querySelector('[data-agro-country]').dataset.agroCountry,'CAN');
   if(product==='canola'){
    assert.match(content.querySelector('[data-agro-stage="production"]').textContent,/86,275.*千t/s);
    const use=content.querySelector('[data-agro-stage="use"]').cloneNode(true);use.querySelectorAll('details').forEach(d=>d.remove());assert.match(use.textContent,/11,552.*9,387/s);
   }
  }
  root.dispatchEvent(new w.CustomEvent('canada-agro-selection',{detail:{product:null}}));assert.equal(original.hidden,false);assert.equal(original.innerHTML,before);
  w.eval(overview+';CanadaOverview.initCanadaAgricultureOverview(document.querySelector("[data-canada-agriculture]"));');
  root.querySelector('[data-canola-select-item]').click();assert.equal(root.dataset.canolaReadingMode,'selected');assert.equal(content.querySelector('[data-canada-agro-product]').dataset.canadaAgroProduct,'canola');
  root.querySelector('[data-canola-overview-return]').click();assert.equal(original.hidden,false);
 }finally{await w.happyDOM.close();}
});
test('built wheat and beef keep shared source definitions and quantities in their selected three columns',async()=>{
 for(const [path,series] of [['wheat/','wheat-production'],['beef/','cattle-meat']]){
  const w=await page(path);try{const content=w.document.querySelector('[data-canada-agro-content]');assert.equal(content.querySelectorAll('.agro-columns>section').length,3);assert.equal(content.querySelector('[data-agro-series]').dataset.agroSeries,series);if(path==='wheat/')assert.match(content.textContent,/35.94.*799.1.*8.26.*29.35/s);else assert.match(content.textContent,/1,291,344/);}finally{await w.happyDOM.close();}
 }
});
test('built forest routes retain unselected baseline and distinguish roundwood, sawnwood and paper pulp',async()=>{
 const baseline=await page('forestry/');try{
  assert.equal(baseline.document.querySelector('[data-agro-statistics]').hidden,false);assert.equal(baseline.document.querySelector('[data-canada-forest-product]').value,'');
  baseline.eval(forestController+';CanadaForest.initCanadaForestry(document.querySelector("[data-canada-forestry]"));');
  const select=baseline.document.querySelector('[data-canada-forest-product]');select.value='sawnwood';select.dispatchEvent(new baseline.Event('change'));
  const link=new URL(baseline.document.querySelector('[data-forestry-nature-link]').href);assert.equal(new URLSearchParams(link.searchParams.get('forestryReturn')).get('forestProduct'),'sawnwood','a new product immediately updates the actual nature comparison link');
 }finally{await baseline.happyDOM.close();}
 for(const product of ['roundwood','sawnwood','paper-pulp']){
  const w=await page('forestry/',`?forestProduct=${product}`);try{const content=w.document.querySelector('[data-canada-agro-content]');assert.equal(content.querySelectorAll('.agro-columns>section').length,3);assert.equal(content.querySelector('[data-canada-agro-product]').dataset.canadaAgroProduct,product);assert.equal(w.document.querySelector('[data-agro-statistics]').hidden,true);}finally{await w.happyDOM.close();}
 }
});
