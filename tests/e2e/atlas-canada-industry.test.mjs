import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const html=await readFile('dist/atlas/north-america/canada/industry/index.html','utf8'),code=await bundleCanadaSource('src/scripts/atlas-canada-industry.ts',{globalName:'IndustryPilot'});
const pilot=JSON.parse(await readFile('src/data/atlas/canada/industry-pilot.json','utf8'));
async function open(search=''){const w=new Window({url:'https://example.com/insight-journal/atlas/north-america/canada/industry/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));w.eval(code+"\nIndustryPilot.initCanadaIndustry(document.querySelector('[data-canada-industry]'))");return w;}
function pick(w,sector,id){const control=w.document.querySelector(`[data-ca-industry-picker=${sector}]`);control.value=id;control.dispatchEvent(new w.Event('change'));}
test('Rendered layers contain only the active sector; picking an industry preserves the map and annotation positions',async()=>{
 const w=new Window({url:'https://example.com/industry/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 try{
  w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
  const q=s=>w.document.querySelector(s),stage=q('[data-ca-map-frame]'),svg=q('[data-ca-map]');
  // Fixed layout doubles verify layer membership and state, not browser typography.
  Object.defineProperty(stage,'clientWidth',{get:()=>1100});Object.defineProperty(stage,'clientHeight',{get:()=>595});stage.getBoundingClientRect=()=>({x:0,y:0,width:1100,height:595});
  svg.getScreenCTM=()=>{const [x,y,width,height]=svg.getAttribute('viewBox').split(' ').map(Number);return {a:1100/width,d:595/height,b:0,c:0,e:-x*1100/width,f:-y*595/height};};
  Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{configurable:true,get(){return this.classList.contains('ca-pilot-map-label')?this.textContent.length*12+16:0;}});Object.defineProperty(w.HTMLElement.prototype,'offsetHeight',{configurable:true,get(){return this.classList.contains('ca-pilot-map-label')?20:0;}});
  w.eval(code+"\nIndustryPilot.initCanadaIndustry(document.querySelector('[data-canada-industry]'))");
  const ids=()=>[...w.document.querySelectorAll('[data-ca-cluster]')].map(n=>n.dataset.caCluster).sort(),labels=()=>[...w.document.querySelectorAll('.ca-pilot-map-label')].map(n=>[n.dataset.caLabelSites,n.style.left,n.style.top]);
  for(const sector of ['resources','manufacturing','services']){
   q(`[data-ca-sector=${sector}]`).click();const expected=pilot.clusters.filter(c=>c.sectors.includes(sector));assert.deepEqual(ids(),expected.map(c=>c.id).sort());
   assert.equal(w.document.querySelectorAll('[data-ca-flow]').length,sector==='resources'?1:0);assert.equal(w.document.querySelectorAll('[data-ca-correspondence]').length,0);
   const frame=svg.getAttribute('viewBox'),fixed=labels(),industry=pilot.industries.find(i=>i.sectors.includes(sector));pick(w,sector,industry.id);
   assert.deepEqual(ids(),expected.map(c=>c.id).sort());assert.deepEqual(labels(),fixed);assert.equal(svg.getAttribute('viewBox'),frame);
   for(const n of w.document.querySelectorAll('[data-ca-cluster]'))assert.equal(n.dataset.coordinate,pilot.clusters.find(c=>c.id===n.dataset.caCluster).coordinates.join(','));
  }
 }finally{await w.happyDOM.close();}
});
test('Canada keeps the major-industry tab and exposes exactly the three learning categories plus three statistics columns',async()=>{const w=await open();try{const d=w.document;assert.deepEqual([...d.querySelectorAll('[data-ca-sector]')].map(b=>b.dataset.caSector),['resources','manufacturing','services']);assert.equal(d.querySelectorAll('[data-ca-province-shape]').length,13);assert.equal(d.querySelectorAll('.ca-pilot-stat-card').length,3);assert.equal(d.querySelectorAll('[data-ca-bars] li').length,12);assert.equal(d.querySelectorAll('[data-industry-year],[data-industry-compare],[data-industry-save]').length,0);assert.match(d.querySelector('[data-ca-reading]').textContent,/石油.*銅.*金.*鉄鉱石/);assert.match(d.querySelector('[data-ca-why]').textContent,/地質.*精鉱/s);}finally{await w.happyDOM.close();}});
test('New candidates render product-specific evidence, dated plans and interruptions without reusing broad GDP as product output',async()=>{
 const w=await open();try{const q=s=>w.document.querySelector(s);
  pick(w,'resources','copper');assert.match(q('[data-ca-evidence-scale]').textContent,/444,587 t Cu/);assert.match(q('[data-ca-evidence-comparison]').textContent,/67.5 %/);assert.match(q('[data-ca-stat-note]').textContent,/鉱業全体/);
  w.history.replaceState(null,'','?sector=resources&subsector=graphite&site=ldi-graphite');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.match(q('[data-ca-site-copy]').textContent,/2026-09-01.*再開延期/);assert.match(q('[data-ca-evidence-comparison]').textContent,/休止・再開延期/);
  w.history.replaceState(null,'','?sector=manufacturing&subsector=battery&site=st-thomas-battery');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.match(q('[data-ca-site-copy]').textContent,/2023-03-13.*計画/);assert.match(q('[data-ca-evidence-scale]').textContent,/累計/);assert.match(q('[data-ca-evidence-comparison]').textContent,/未確認/);
  q('[data-ca-sector=services]').click();pick(w,'services','tourism');assert.match(q('[data-ca-evidence-scale]').textContent,/50.8 十億CAD/);assert.match(q('[data-ca-evidence-confidence]').textContent,/確信度/);
 }finally{await w.happyDOM.close();}
});
test('Selection, explicit-only, clear and category switching separate map state from unmodified statistical classes',async()=>{const w=await open();try{const q=s=>w.document.querySelector(s);pick(w,'resources','refining');assert.equal(q('[data-ca-title]').textContent,'石油精製');assert.equal(q('[data-ca-only]').checked,false);assert.equal(q('[data-ca-stat-gdp]').textContent,'13,256.5');assert.equal(q('[data-ca-stat-employment]').textContent,'未取得');q('[data-ca-only]').checked=true;q('[data-ca-only]').dispatchEvent(new w.Event('change'));assert.equal(new URL(w.location.href).searchParams.get('only'),'1');q('[data-ca-clear]').click();assert.equal(q('[data-ca-title]').textContent,'資源・エネルギー');assert.equal(q('[data-ca-industry-picker=resources]').value,'');assert.equal(new URL(w.location.href).searchParams.has('only'),false);q('[data-ca-sector=manufacturing]').click();assert.equal(q('[data-ca-title]').textContent,'製造業');assert.equal(q('[data-ca-map]').dataset.caMapSector,'manufacturing');assert.equal(q('[data-ca-international]').hidden,true);q('[data-ca-sector=services]').click();assert.equal(q('[data-ca-port-statistics]').hidden,false);}finally{await w.happyDOM.close();}});
test('Each sector has one external picker and an external color key; the map contains no product button bank',async()=>{
 const w=await open();try{const q=s=>w.document.querySelector(s),map=q('[data-ca-map-frame]');
  assert.equal(map.querySelectorAll('button,select,nav,.ca-pilot-map-key').length,0);
  assert.equal(q('.ca-pilot-map-key').closest('[data-ca-map-frame]'),null);
  for(const [sector,count]of [['resources',13],['manufacturing',14],['services',4]]){
   q(`[data-ca-sector=${sector}]`).click();assert.equal(q('[data-ca-map]').dataset.caMapSector,sector);
   assert.equal([...w.document.querySelectorAll('[data-ca-subtabs]')].filter(n=>!n.hidden).length,1);
   assert.equal([...w.document.querySelectorAll('[data-ca-color-key]')].filter(n=>!n.hidden).length,1);
   assert.equal(q(`[data-ca-industry-picker=${sector}]`).options.length,count+1);
  }
 }finally{await w.happyDOM.close();}
});
test('Overlap uses the same documented processor in both categories and preserves the camera',async()=>{const w=await open('?sector=resources&subsector=nickel&site=sudbury&industryFrame=50,220,940,510');try{const q=s=>w.document.querySelector(s),frame=q('[data-ca-map]').getAttribute('viewBox');assert.equal(q('[data-ca-overlap]').hidden,false);q('[data-ca-overlap]').click();assert.equal(q('[data-ca-title]').textContent,'ニッケル精錬');assert.equal(new URL(w.location.href).searchParams.get('site'),'sudbury');assert.equal(q('[data-ca-map]').getAttribute('viewBox'),frame);assert.match(q('[data-ca-stat-note]').textContent,/ニッケル・アルミだけの値ではありません/);w.history.replaceState(null,'','?sector=services&subsector=digital');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.match(q('[data-ca-stat-scope]').textContent,/一致統計は未収録/);}finally{await w.happyDOM.close();}});
test('The CER crude case keeps its verified 2024 quantities and export denominator, and the focus remains in this page',async()=>{const w=await open();try{const q=s=>w.document.querySelector(s);assert.equal(q('[data-ca-international]').hidden,false);for(const [id,value]of [['exports','420'],['us-share','93'],['alberta-share','91']])assert(q(`[data-ca-international-indicator=${id}]`).textContent.includes(value));assert.match(q('[data-ca-international]').textContent,/2024年.*分母：カナダの原油輸出量/s);q('[data-ca-international-place]').click();assert.equal(new URL(w.location.href).searchParams.get('site'),'athabasca');assert.equal(q('[data-ca-title]').textContent,'石油・天然ガス');assert.equal(q('[data-ca-international]').hidden,false);}finally{await w.happyDOM.close();}});
test('Legacy year/province handoffs remain statistical context with no invented location or 2025 value',async()=>{const w=await open('?metric=mining&year=2025&province=Alberta');try{const q=s=>w.document.querySelector(s);assert.equal(q('[data-ca-title]').textContent,'資源・エネルギー');assert.match(q('[data-ca-value]').textContent,/アルバータ.*2021年/);assert.equal(q('[data-ca-site-reading]').hidden,true);}finally{await w.happyDOM.close();}});
