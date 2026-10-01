import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';

const base='https://example.com/insight-journal/atlas/north-america/canada';
const code=await bundleCanadaSource('src/scripts/atlas-canada-nature.ts',{globalName:'CanadaIndustryWaterTest'})+"\nCanadaIndustryWaterTest.initCanadaNature(document.querySelector('[data-canada-nature]'));";
const saved={year:'2024',province:'Ontario',compare:'Quebec',metric:'manufacturing',only:'1',zoom:'1'};
const groupNames=['St. Lawrence','Lake Superior','Lake Huron','Lake Michigan','Lake Erie','Lake Ontario'];
let fullGeometry;

function query(extra={},source=saved){return `?${new URLSearchParams({city:'ottawa',view:'water',water:'St. Lawrence',only:'1',...(source?{industryReturn:new URLSearchParams(source).toString()}:{}),...extra})}`;}
async function page(search){
 const w=new Window({url:`${base}/nature/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 try{
  w.document.write((await readFile('dist/atlas/north-america/canada/nature/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
  assert.ok(w.document.querySelector('[data-canada-only-label]'),'Built Nature HTML predates the contextual water checkbox label; a fresh build is required');
  if(new URL(w.location.href).searchParams.has('populationReturn')){
   fullGeometry??=JSON.parse(await readFile('src/data/atlas/canada/population-geometry.json','utf8')).features;
   const element=w.document.querySelector('[data-canada-config]'),config=JSON.parse(element.textContent);config.population.geometry=fullGeometry;element.textContent=JSON.stringify(config);
  }
  w.eval(code);await Promise.resolve();return w;
 }catch(error){await w.happyDOM.close();throw error;}
}
const q=(w,selector)=>w.document.querySelector(selector);
const root=w=>q(w,'[data-canada-nature]');
const waterShapes=w=>[...w.document.querySelectorAll('[data-canada-water-shape]')];
function visibleWater(w){return q(w,'[data-canada-water-layers]').getAttribute('display')==='none'?[]:waterShapes(w).filter(shape=>shape.style.display!=='none');}
function assertWaterSet(w,names){
 const visible=visibleWater(w);assert.ok(visible.length);assert.deepEqual(new Set(visible.map(shape=>shape.dataset.canadaWaterShape)),new Set(names));
 for(const name of names)assert.ok(visible.some(shape=>shape.dataset.canadaWaterShape===name&&shape.getAttribute('d')));
 for(const shape of waterShapes(w))if(!names.includes(shape.dataset.canadaWaterShape))assert.equal(shape.style.display,'none');
}
function changeWater(w,name){const select=q(w,'[data-canada-water]');select.value=name;select.dispatchEvent(new w.Event('change'));}
function only(w,checked){const checkbox=q(w,'[data-canada-only]');checkbox.checked=checked;checkbox.dispatchEvent(new w.Event('change'));}
function assertReturn(w){
 const url=new URL(q(w,'[data-canada-industry-return]').href);assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,'/insight-journal/atlas/north-america/canada/industry/');
 assert.deepEqual(Object.fromEntries(url.searchParams),saved);
}
function assertGeneralReading(w,open){const details=[...w.document.querySelectorAll('[data-canada-general-reading]')];assert.ok(details.length);assert.ok(details.every(detail=>detail.open===open));}

test('Manufacturing comparison shows all five Great Lakes plus St. Lawrence and names the actual comparison group',async()=>{
 const w=await page(query({}, {...saved,next:'https://evil.example/',href:'/outside/'}));
 try{
  assert.equal(root(w).dataset.canadaIndustryWaterGroup,'great-lakes');assert.equal(q(w,'[data-canada-only]').checked,true);
  assertWaterSet(w,groupNames);assert.ok(waterShapes(w).some(shape=>shape.dataset.canadaWaterShape===''));
  assert.match(q(w,'[data-canada-only-label]').textContent,/五大湖/);assert.match(q(w,'[data-canada-only-label]').textContent,/St\. Lawrence/);assert.match(q(w,'[data-canada-only-label]').textContent,/比較|グループ/);
  const text=q(w,'[data-canada-industry-context-text]').textContent;
  assert.match(text,/現在は[^。]*(五大湖[^。]*St\. Lawrence|St\. Lawrence[^。]*五大湖)/);assert.doesNotMatch(text,/現在はSt\. Lawrenceだけ/);assert.match(text,/ON・QC.*中央輸送回廊/s);
  const provinces=[...q(w,'[data-canada-industry-context-map]').querySelectorAll('[data-canada-industry-context-province]')];assert.deepEqual(new Set(provinces.map(p=>p.dataset.canadaIndustryContextProvince)),new Set(['Ontario','Quebec']));
  assertReturn(w);assertGeneralReading(w,false);
 }finally{await w.happyDOM.close();}
});

test('Mackenzie selection restores normal single-water isolation and popstate restores the original Great Lakes question',async()=>{
 const initial=query(),w=await page(initial);
 try{
  changeWater(w,'Mackenzie');assert.notEqual(root(w).dataset.canadaIndustryWaterGroup,'great-lakes');
  assert.equal(q(w,'[data-canada-only]').checked,false);assert.match(q(w,'[data-canada-only-label]').textContent,/選んだ川・湖だけ/);
  assert.equal(visibleWater(w).length,waterShapes(w).length);
  only(w,true);assertWaterSet(w,['Mackenzie']);
  const text=q(w,'[data-canada-industry-context-text]').textContent;assert.match(text,/現在はMackenzieだけ/);assert.match(text,/比較入口のSt\. Lawrence.*別の水系/s);assert.doesNotMatch(text,/現在は[^。]*五大湖/);
  assertReturn(w);only(w,false);assert.equal(visibleWater(w).length,waterShapes(w).length);
  w.history.replaceState(null,'',initial);w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(root(w).dataset.canadaIndustryWaterGroup,'great-lakes');assertWaterSet(w,groupNames);assertReturn(w);assertGeneralReading(w,false);
 }finally{await w.happyDOM.close();}
});

test('Only-checkbox and view changes control actual water visibility without changing the saved industry year, provinces or zoom',async()=>{
 const w=await page(query());
 try{
  only(w,false);assert.equal(visibleWater(w).length,waterShapes(w).length);assert.match(q(w,'[data-canada-industry-context-text]').textContent,/現在は[^。]*全水系/);
  only(w,true);assertWaterSet(w,groupNames);assertReturn(w);
  q(w,'[data-canada-view=climate]').click();assert.notEqual(root(w).dataset.canadaIndustryWaterGroup,'great-lakes');assert.equal(visibleWater(w).length,0);assertReturn(w);
  q(w,'[data-canada-view=water]').click();assert.equal(root(w).dataset.canadaIndustryWaterGroup,'great-lakes');assertWaterSet(w,groupNames);
  q(w,'[data-canada-all-water]').click();assert.equal(q(w,'[data-canada-water]').value,'');assert.equal(q(w,'[data-canada-only]').disabled,true);assert.notEqual(root(w).dataset.canadaIndustryWaterGroup,'great-lakes');assert.equal(visibleWater(w).length,waterShapes(w).length);assertReturn(w);
 }finally{await w.happyDOM.close();}
});

test('Plain Nature, forestry, population and other industry metrics keep their actual single-water filter',async()=>{
 const forestry=new URLSearchParams({year:'2024',province:'British Columbia',compare:'Quebec',metric:'wood',cover:'taiga',zoom:'1'}).toString();
 const population=new URLSearchParams({year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected'}).toString();
 const cases=[{name:'plain',search:query({},null),plain:true},{name:'forestry',search:query({forestryReturn:forestry},null)},{name:'population',search:query({populationReturn:population},null)},{name:'services',search:query({}, {...saved,metric:'services'})},{name:'mining',search:query({}, {...saved,metric:'mining'})}];
 for(const example of cases){const w=await page(example.search);try{
  assert.notEqual(root(w).dataset.canadaIndustryWaterGroup,'great-lakes',example.name);assertWaterSet(w,['St. Lawrence']);assert.equal(q(w,'[data-canada-only]').checked,true);assert.match(q(w,'[data-canada-only-label]').textContent,/選んだ川・湖だけ/);
  assertGeneralReading(w,!!example.plain);
 }finally{await w.happyDOM.close();}}
});
