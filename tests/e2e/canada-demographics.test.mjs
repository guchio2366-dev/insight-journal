import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';

const route='atlas/north-america/canada/population';
const population=JSON.parse(await readFile('src/data/atlas/canada/population.json','utf8'));
const data=Object.fromEntries(await Promise.all(['ethnicity','religion'].map(async topic=>[
 topic,JSON.parse(await readFile(`src/data/atlas/canada/demographics-${topic}.json`,'utf8')),
])));
const controller=await bundleCanadaSource('src/scripts/atlas-canada-population.ts',{globalName:'DemographicPopulation'});
const code=controller+"\nDemographicPopulation.initCanadaPopulation(document.querySelector('[data-canada-population]'));";
const storageKey='insight-journal:canada-population:v1';
const format=value=>value.toLocaleString('ja-JP');
const percent=(count,denominator)=>count===0?'0.00%':count/denominator*100<0.01?'0.01%未満':(count/denominator*100).toFixed(2)+'%';
// Counts share a single scale across both topics and every published category.
// The national reference is outside the41CMA map and must not set its scale.
const demographicMax=Math.max(1,...Object.values(data).flatMap(d=>d.cmas.flatMap(r=>Object.values(r.values).map(v=>v.value??0))));
const q=(w,selector)=>{const node=w.document.querySelector(selector);assert.ok(node,selector);return node;};
const change=(w,selector,value)=>{const input=q(w,selector);input.value=String(value);input.dispatchEvent(new w.Event('change'));};
const topic=(w,name)=>q(w,`[data-population-topic="${name}"]`).click();
const mapGroup=(w,id)=>q(w,`[data-population-map-cma="${id}"]`);
// SVG checkVisibility() can report true even when a g has display:none in Chrome.
const displayedIds=w=>[...w.document.querySelectorAll('[data-population-map-cma]')].filter(g=>g.style.display!=='none'&&!g.hidden).map(g=>g.dataset.populationMapCma);
const record=(name,id)=>data[name].cmas.find(r=>r.id===id);
const row=(w,id)=>{
 const name=population.cmas.find(r=>r.id===id).name;
 const result=[...q(w,'[data-demographic-table] tbody').querySelectorAll('tr')].find(r=>r.textContent.includes(name));
 assert.ok(result,`Demographic source table retains ${id} ${name}`);return result;
};
async function page(search='',{interactive=true,stored,patch}={}){
 const w=new Window({url:`https://example.com/insight-journal/${route}/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
 try{
  w.document.write((await readFile(`dist/${route}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
  if(stored)w.localStorage.setItem(storageKey,stored);
  if(patch){const node=q(w,'[data-population-config]'),config=JSON.parse(node.textContent);patch(config);node.textContent=JSON.stringify(config);}
  if(interactive)w.eval(code);
  return w;
 }catch(error){await w.happyDOM.close();throw error;}
}
function assertOriginalDemographicReading(w,name,groupId,cma){
 const source=record(name,cma),group=data[name].groups.find(g=>g.id===groupId),count=source.values[groupId].value;
 const comparison=q(w,'[data-demographic-comparison]').textContent;
 assert.ok(comparison.includes(source.name),`${cma}: selected source geography is named`);
 assert.ok(comparison.includes(format(count)),`${cma}/${groupId}: original ${count} count appears`);
 assert.ok(comparison.includes(percent(count,source.denominator.value)),`${cma}/${groupId}: share uses this table's ${source.denominator.value} denominator`);
 const title=mapGroup(w,cma).querySelector('title').textContent;
 assert.ok(title.includes('2021')&&title.includes(group.name),`${cma}: accessible marker title identifies reference year and category`);
 assert.ok(title.includes(format(count)),`${cma}: accessible title retains source count`);
 const table=row(w,cma).textContent;
 assert.ok(table.includes(format(source.denominator.value)),`${cma}: source table names its own denominator`);
 assert.ok(table.includes(format(count)),`${cma}: source table retains count`);
}

test('Ethnicity and religion provide categorical overview, all composition values and explicit missing coverage',async()=>{for(const name of ['ethnicity','religion']){const w=await page('?topic='+name);try{assert.equal(w.document.querySelector('.population-controls'),null);assert.equal(q(w,'[data-population-map]').getAttribute('viewBox'),'0 0 900 580');assert.equal(q(w,'[data-population-composition-rows]').children.length,data[name].groups.length);assert.equal(w.document.querySelectorAll('[data-population-map-cma]').length,41);assert.equal(w.document.querySelectorAll('[data-population-category]').length,data[name].groups.length);assert.match(q(w,'[data-population-coverage-brief]').textContent,/未収録/);if(name==='religion')assert.match(q(w,'[data-population-coverage]').textContent,/教派別.*未収録/);for(const g of data[name].groups){q(w,`[data-population-category="${g.id}"]`).click();assert.equal(new URL(w.location.href).searchParams.get('group'),g.id);assert.match(q(w,'[data-demographic-comparison]').textContent,/割合が高い地域/);assert.ok(q(w,'[data-demographic-heading]').textContent.includes(g.name));}}finally{await w.happyDOM.close();}}});
test('Keyboard city selection changes the full source composition and preserves category source definitions',async()=>{for(const name of ['ethnicity','religion']){const w=await page('?topic='+name);try{for(const r of data[name].cmas){const marker=mapGroup(w,r.id);marker.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const rows=[...q(w,'[data-population-composition-rows]').children];for(const [i,g] of data[name].groups.entries()){const value=r.values[g.id].value;assert.ok(rows[i].textContent.includes(value===null?'未公表':format(value)+'人'));}assert.equal(marker.getAttribute('aria-pressed'),'true');}}finally{await w.happyDOM.close();}}});
test('Missing or suppressed input never becomes a categorical winner or an observed zero',async()=>{const w=await page('?topic=ethnicity',{patch:cfg=>{cfg.demographics.ethnicity.cmas.find(r=>r.id==='535').values['4']={value:null,symbol:'x'};}});try{assert.match(q(w,'[data-demographic-comparison]').textContent,/未公表/);assert.match(q(w,'[data-population-composition-rows]').textContent,/未公表/);}finally{await w.happyDOM.close();}});
test('Category and city survive reload, active-topic clicks and explicit browser history',async()=>{const w=await page('?topic=religion&cma=933&group=21');try{const before=w.history.length;topic(w,'religion');assert.equal(w.history.length,before);const restored=await page(new URL(w.location.href).search);try{assert.equal(mapGroup(restored,'933').getAttribute('aria-pressed'),'true');assert.equal(q(restored,'[data-population-category="21"]').getAttribute('aria-pressed'),'true');}finally{await restored.happyDOM.close();}w.history.replaceState(null,'','?topic=ethnicity&cma=535');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q(w,'[data-population-topic="ethnicity"]').getAttribute('aria-pressed'),'true');assert.equal(mapGroup(w,'535').getAttribute('aria-pressed'),'true');}finally{await w.happyDOM.close();}});
test('Saved demographic topics cannot render the legacy whole-population Nature or Industry comparison',async()=>{
 const nature=await bundleCanadaSource('src/scripts/atlas-canada-population-comparison.ts',{globalName:'DemographicNatureGuard'});
 const industry=await bundleCanadaSource('src/scripts/atlas-canada-population-industry-comparison.ts',{globalName:'DemographicIndustryGuard'});
 for(const name of ['ethnicity','religion'])for(const kind of ['nature','industry']){
  const source=new URLSearchParams({year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected',topic:name,group:data[name].defaultGroup,measure:'share'});
  const params=new URLSearchParams({populationReturn:source.toString()}),w=new Window({url:`https://example.com/insight-journal/atlas/north-america/canada/${kind}/?${params}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  try{
   w.document.write((await readFile(`dist/atlas/north-america/canada/${kind}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
   // Invoke the real comparison renderer against the built DOM. Empty data
   // proves the demographic guard exits before accessing or drawing totals.
   if(kind==='nature'){
    w.eval(nature+"\nwindow.demographicGuardResult=DemographicNatureGuard.renderPopulationNatureComparison(document.querySelector('[data-canada-nature]'),{},{view:'climate'});");
    assert.equal(q(w,'[data-canada-population-context]').hidden,true);assert.equal(q(w,'[data-canada-population-return]').hidden,true);
    assert.equal(q(w,'[data-canada-population-context-map]').style.display,'none');assert.equal(q(w,'[data-canada-population-context-mini-map]').style.display,'none');assert.equal(q(w,'[data-canada-population-context-legend]').hidden,true);
   }else{
    w.eval(industry+"\nwindow.demographicGuardResult=DemographicIndustryGuard.renderPopulationIndustryComparison(document.querySelector('[data-canada-industry]'),{},{});");
    assert.equal(w.document.querySelector('[data-canada-population-industry-context]'),null,'The removed legacy comparison cannot display population totals');assert.equal(q(w,'[data-ca-population-return-wrap]').hidden,true);
   }
   assert.equal(w.demographicGuardResult,false,`${kind} must not substitute whole-population values for ${name}`);
  }finally{await w.happyDOM.close();}
 }
});

test('A demographic Industry to Nature to Industry hop cannot resurrect a whole-population source context',async()=>{
 const libCode=await bundleCanadaSource('src/lib/atlas-canada-industry.ts',{platform:'node',format:'esm'}),lib=await import('data:text/javascript;base64,'+Buffer.from(libCode).toString('base64'));
 const natureRenderer=await bundleCanadaSource('src/scripts/atlas-canada-industry-comparison.ts',{globalName:'DemographicIndustryNature'});
 const oldPopulationRenderer=await bundleCanadaSource('src/scripts/atlas-canada-population-industry-comparison.ts',{globalName:'DemographicOldPopulation'});
 const ids=population.cmas.map(r=>r.id),state={year:2025,province:'Ontario',compare:'Quebec',metric:'services',only:true,zoom:true};
 const industryState={year:'2025',province:'Ontario',metric:'services',compare:'Quebec',only:'1',zoom:'1'};
 const distribution={year:'2016',cma:'535',metric:'population',zoom:'selected',compare:'462',only:'1'};
 for(const name of ['ethnicity','religion']){
  const saved=new URLSearchParams({...distribution,topic:name,group:data[name].defaultGroup,measure:'count'}),source=new URL('https://example.com/insight-journal/atlas/north-america/canada/industry/?keep=drop');source.searchParams.set('populationReturn',saved.toString());
  const target=lib.canadaIndustryComparisonUrl(source,new URL('https://example.com/insight-journal/atlas/north-america/canada/nature/?city=vancouver&view=water&water=Fraser&only=1'),state,ids);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(target.searchParams.get('industryReturn'))),industryState,'Known demographic source is dropped before the first hop can erase its topic');
  const w=new Window({url:target.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});let returned;
  try{
   w.document.write((await readFile('dist/atlas/north-america/canada/nature/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
   w.eval(natureRenderer+"\nwindow.demographicHopResult=DemographicIndustryNature.renderIndustryNatureComparison(document.querySelector('[data-canada-nature]'),JSON.parse(document.querySelector('[data-canada-config]').textContent),{city:'vancouver',view:'water',water:'Fraser',only:true});");
   assert.equal(w.demographicHopResult,true,'The legitimate provincial GDP question still renders');assert.equal(q(w,'[data-canada-industry-context]').hidden,false);
   const back=new URL(q(w,'[data-canada-industry-return]').href);assert.equal(back.pathname,'/insight-journal/atlas/north-america/canada/industry/');assert.deepEqual(Object.fromEntries(back.searchParams),industryState);
   returned=new Window({url:back.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
   returned.document.write((await readFile('dist/atlas/north-america/canada/industry/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
   returned.eval(oldPopulationRenderer+"\nwindow.demographicHopResult=DemographicOldPopulation.renderPopulationIndustryComparison(document.querySelector('[data-canada-industry]'),{},{});");
   assert.equal(returned.demographicHopResult,false);assert.equal(returned.document.querySelector('[data-canada-population-industry-context]'),null);assert.equal(q(returned,'[data-ca-population-return-wrap]').hidden,true);
  }finally{await w.happyDOM.close();if(returned)await returned.happyDOM.close();}
 }
 const legitimate=new URL('https://example.com/insight-journal/atlas/north-america/canada/industry/');legitimate.searchParams.set('populationReturn',new URLSearchParams(distribution).toString());
 const target=lib.canadaIndustryComparisonUrl(legitimate,new URL('https://example.com/insight-journal/atlas/north-america/canada/nature/?view=water'),state,ids),nested=new URLSearchParams(target.searchParams.get('industryReturn'));
 assert.deepEqual(Object.fromEntries(new URLSearchParams(nested.get('populationReturn'))),distribution,'The original2016 distribution source remains available on legitimate three-hop comparisons');
 assert.deepEqual(Object.fromEntries([...nested].filter(([key])=>key!=='populationReturn')),industryState);
});
