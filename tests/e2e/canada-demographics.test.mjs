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

test('Demographic source actions are enabled while no-JS retains the original41CMA population map and complete source links',async()=>{
 const w=await page('',{interactive:false});
 try{
  assert.equal(w.document.querySelectorAll('[data-population-map-cma]').length,41);
  for(const name of ['distribution','ethnicity','religion'])assert.equal(q(w,`[data-population-topic="${name}"]`).disabled,false);
  assert.equal(q(w,'[data-population-topic="distribution"]').getAttribute('aria-pressed'),'true');
  assert.match(q(w,'[data-population-comparison]').textContent,/6,202,225/);
  for(const hook of ['data-demographic-group','data-demographic-measure','data-demographic-reading','data-demographic-comparison','data-demographic-national','data-demographic-share-legend','data-demographic-count-legend','data-demographic-table'])assert.ok(q(w,`[${hook}]`));
  for(const name of ['ethnicity','religion']){
   const tableLink=[...w.document.querySelectorAll('a')].find(a=>a.href===data[name].source.url);assert.ok(tableLink,`${name}: official table is linked`);
   for(const suffix of [`${name}-manifest.json`,`${name}-selected.csv`]){assert.ok(w.document.querySelector(`a[href$="${suffix}"]`),`${name}: ${suffix} link`);await access(`dist/assets/atlas/canada-demographics-v1/${suffix}`);}
  }
 }finally{await w.happyDOM.close();}
});

test('An explicit demographic topic overrides stored choices and invalid categories normalize to its real source default',async()=>{
 const stored='year=2016&cma=462&compare=933&metric=population&zoom=country&only=1&topic=religion&group=19&measure=count';
 const w=await page('?topic=ethnicity',{stored});let invalid,restored;
 try{
  assert.equal(q(w,'[data-population-topic="ethnicity"]').getAttribute('aria-pressed'),'true');
  assert.equal(q(w,'[data-demographic-group]').value,data.ethnicity.defaultGroup);
  assert.equal(q(w,'[data-demographic-measure]').value,'share');
  assert.equal(q(w,'[data-population-cma]').value,'535');
  invalid=await page('?topic=religion&group=not-a-published-category&measure=unknown');
  assert.equal(q(invalid,'[data-demographic-group]').value,data.religion.defaultGroup);
  assert.equal(q(invalid,'[data-demographic-measure]').value,'share');
  topic(w,'religion');change(w,'[data-demographic-group]','21');change(w,'[data-demographic-measure]','count');
  const saved=w.localStorage.getItem(storageKey);assert.ok(saved);
  restored=await page('',{stored:saved});
  assert.equal(q(restored,'[data-population-topic="religion"]').getAttribute('aria-pressed'),'true');
  assert.equal(q(restored,'[data-demographic-group]').value,'21');assert.equal(q(restored,'[data-demographic-measure]').value,'count');
 }finally{await w.happyDOM.close();if(invalid)await invalid.happyDOM.close();if(restored)await restored.happyDOM.close();}
});

test('Both demographic topics join all41originalCMA and show shares with their own private-household source denominator',async()=>{
 for(const name of ['ethnicity','religion']){
  const group=data[name].defaultGroup,w=await page(`?topic=${name}&group=${group}&measure=share`);
  try{
   assert.equal(q(w,'[data-demographic-share-legend]').hidden,false);
   assert.equal(q(w,'[data-demographic-count-legend]').hidden,true);
   assert.equal(q(w,'[data-population-population-legend]').hidden,true);
   assert.equal(q(w,'[data-population-density-legend]').hidden,true);
   assert.equal(q(w,'[data-demographic-table] tbody').querySelectorAll('tr').length,42);
   for(const source of data[name].cmas){change(w,'[data-population-cma]',source.id);assertOriginalDemographicReading(w,name,group,source.id);assert.equal(mapGroup(w,source.id).querySelector('[data-population-symbol]').style.display,'none');}
   const national=q(w,'[data-demographic-national]').textContent;
   assert.ok(national.includes(format(data[name].national.values[group].value)));
   assert.ok(national.includes(format(data[name].national.denominator.value)));
   const wholePopulation=population.cmas.find(r=>r.id==='535').population[2021].value,toronto=record(name,'535');
   assert.notEqual(toronto.denominator.value,wholePopulation,'Demographic universe must not reuse population-and-dwelling-counts total');
   change(w,'[data-population-cma]','535');
   assert.notEqual(percent(toronto.values[group].value,toronto.denominator.value),percent(toronto.values[group].value,wholePopulation));
   assert.ok(q(w,'[data-demographic-comparison]').textContent.includes(percent(toronto.values[group].value,toronto.denominator.value)));
   assert.match(q(w,'[data-demographic-share-legend]').textContent,/%/);
  }finally{await w.happyDOM.close();}
 }
});

test('Every published category changes real counts, marker titles and quantitative legends without changing originalCMA boundaries',async()=>{
 for(const name of ['ethnicity','religion']){
  const w=await page(`?topic=${name}&measure=count&cma=535`);
  try{
   const boundary=mapGroup(w,'535').querySelector('[data-population-boundary]').getAttribute('d');
   assert.deepEqual([...q(w,'[data-demographic-group]').options].map(o=>o.value),data[name].groups.map(g=>g.id));
   for(const group of data[name].groups){
    change(w,'[data-demographic-group]',group.id);
    assertOriginalDemographicReading(w,name,group.id,'535');
    assert.equal(q(w,'[data-demographic-count-legend]').hidden,false);assert.equal(q(w,'[data-demographic-share-legend]').hidden,true);
    const count=record(name,'535').values[group.id].value;
    const frameWidth=Number(q(w,'[data-population-map]').getAttribute('viewBox').split(/[ ,]+/)[2]);
    const circle=mapGroup(w,'535').querySelector('[data-population-symbol]');
    assert.notEqual(circle.style.display,'none');
    assert.ok(Math.abs(Number(circle.getAttribute('r'))-22*Math.sqrt(count/demographicMax)*frameWidth/760)<1e-9,`${name}/${group.id}: circle area represents count on the shared scale`);
    assert.ok(q(w,'[data-demographic-count-legend]').querySelectorAll('circle').length>=2,'Count legend provides quantitative circle examples');
    assert.equal(mapGroup(w,'535').querySelector('[data-population-boundary]').getAttribute('d'),boundary,'Changing category retains exact source boundary path');
    assert.ok(!q(w,'[data-population-map]').innerHTML.includes('NaN'));
   }
  }finally{await w.happyDOM.close();}
 }
});

test('Demographic compare, actual SVG marker keyboard selection, isolation and reset preserve category and measure',async()=>{
 const w=await page('?year=2016&topic=ethnicity&group=4&measure=count&cma=535&compare=462&only=1&zoom=selected&keep=yes');
 try{
  assert.deepEqual(new Set(displayedIds(w)),new Set(['535','462']));
  const text=q(w,'[data-demographic-comparison]').textContent;
  for(const id of ['535','462'])assert.ok(text.includes(format(record('ethnicity',id).values['4'].value)));
  assert.notEqual(q(w,'[data-population-map]').getAttribute('viewBox'),'140 340 760 240');
  mapGroup(w,'933').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(q(w,'[data-population-cma]').value,'933');assert.equal(mapGroup(w,'933').getAttribute('aria-pressed'),'true');
  assert.deepEqual(new Set(displayedIds(w)),new Set(['933','462']));
  change(w,'[data-population-cma]','462');assert.equal(q(w,'[data-population-compare]').value,'');assert.deepEqual(displayedIds(w),['462']);
  q(w,'[data-population-reset]').click();assert.equal(displayedIds(w).length,41);assert.equal(q(w,'[data-population-map]').getAttribute('viewBox'),'140 340 760 240');
  const params=new URL(w.location.href).searchParams;assert.equal(params.get('topic'),'ethnicity');assert.equal(params.get('group'),'4');assert.equal(params.get('measure'),'count');assert.equal(params.get('year'),'2016');assert.equal(params.get('keep'),'yes');
 }finally{await w.happyDOM.close();}
});

test('Demographics are fixed2021 while switching back to distribution restores the requested2016 population',async()=>{
 const w=await page('?year=2016&cma=535&metric=population&topic=ethnicity&group=4&measure=share');
 try{
  assert.equal(new URL(w.location.href).searchParams.get('year'),'2016');assert.match(mapGroup(w,'535').querySelector('title').textContent,/2021/);
  topic(w,'religion');assert.equal(new URL(w.location.href).searchParams.get('year'),'2016');assert.match(mapGroup(w,'535').querySelector('title').textContent,/2021/);
  topic(w,'distribution');assert.equal(q(w,'[data-population-year]').value,'2016');assert.equal(q(w,'[data-population-year]').disabled,false);
  assert.ok(q(w,'[data-population-comparison]').textContent.includes(format(population.cmas.find(r=>r.id==='535').population[2016].value)));
  assert.equal(q(w,'[data-demographic-reading]').hidden,true);assert.equal(q(w,'[data-population-population-legend]').hidden,false);
  for(const key of ['topic','group','measure'])assert.equal(new URL(w.location.href).searchParams.has(key),false);
 }finally{await w.happyDOM.close();}
});

test('Clicking the already-active topic retains the selected category, measure and history entry',async()=>{
 for(const [name,group]of [['ethnicity','13'],['religion','21']]){
  const w=await page(`?year=2016&cma=535&compare=462&metric=population&zoom=selected&only=1&topic=${name}&group=${group}&measure=count`);
  try{
   const before={search:w.location.search,history:w.history.length,reading:q(w,'[data-demographic-comparison]').textContent,storage:w.localStorage.getItem(storageKey)};
   topic(w,name);
   assert.equal(w.location.search,before.search);assert.equal(w.history.length,before.history,'A no-op must not add a duplicate navigation');assert.equal(w.localStorage.getItem(storageKey),before.storage);
   assert.equal(q(w,'[data-demographic-group]').value,group);assert.equal(q(w,'[data-demographic-measure]').value,'count');assert.equal(q(w,'[data-demographic-comparison]').textContent,before.reading);
   assert.equal(q(w,'[data-demographic-count-legend]').hidden,false);assert.deepEqual(new Set(displayedIds(w)),new Set(['535','462']));
  }finally{await w.happyDOM.close();}
 }
});

test('History popstate and a recreated page restore all demographic plus original population state without stale legends',async()=>{
 const w=await page('?year=2016&cma=535&compare=462&metric=population&zoom=selected&only=1&topic=ethnicity&group=13&measure=count&keep=yes');let reloaded;
 try{
  const original=w.location.search;topic(w,'religion');change(w,'[data-demographic-group]','21');change(w,'[data-demographic-measure]','share');change(w,'[data-population-cma]','933');
  assert.equal(new URL(w.location.href).searchParams.get('keep'),'yes');
  w.history.replaceState(null,'',original);w.dispatchEvent(new w.PopStateEvent('popstate'));
  for(const [selector,value]of [['[data-demographic-group]','13'],['[data-demographic-measure]','count'],['[data-population-cma]','535'],['[data-population-compare]','462'],['[data-population-zoom]','selected']])assert.equal(q(w,selector).value,value);
  assert.equal(q(w,'[data-population-topic="ethnicity"]').getAttribute('aria-pressed'),'true');assert.deepEqual(new Set(displayedIds(w)),new Set(['535','462']));
  assert.equal(q(w,'[data-demographic-count-legend]').hidden,false);assert.equal(q(w,'[data-demographic-share-legend]').hidden,true);
  reloaded=await page(w.location.search);
  assert.equal(q(reloaded,'[data-demographic-group]').value,'13');assert.equal(q(reloaded,'[data-demographic-measure]').value,'count');assert.deepEqual(new Set(displayedIds(reloaded)),new Set(['535','462']));
  assertOriginalDemographicReading(reloaded,'ethnicity','13','535');
 }finally{await w.happyDOM.close();if(reloaded)await reloaded.happyDOM.close();}
});

test('The actual population-scale link and named return retain exactly the nine-key demographic question',async()=>{
 const saved={year:'2016',cma:'462',compare:'535',metric:'population',only:'1',zoom:'selected',topic:'religion',group:'21',measure:'count'};
 const query=new URLSearchParams({...saved,keep:'drop',returnTo:'https://outside.example/',next:'unrelated'});
 const w=await page('?'+query);let reloaded;
 try{
  const link=q(w,'[data-demographic-population-link]'),target=new URL(link.href);
  assert.equal(target.origin,w.location.origin);assert.equal(target.pathname,w.location.pathname);
  const returnQuery=target.searchParams.get('demographicsReturn');assert.ok(returnQuery);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(returnQuery)),saved,'Saved question contains only canonical original and demographic state');
  assert.deepEqual(Object.fromEntries([...target.searchParams].filter(([key])=>key!=='demographicsReturn')),{year:'2021',cma:'462',compare:'535',metric:'population',only:'1',zoom:'selected'});
  link.click();
  assert.equal(q(w,'[data-population-topic="distribution"]').getAttribute('aria-pressed'),'true');
  assert.equal(q(w,'[data-population-year]').value,'2021');assert.equal(q(w,'[data-demographic-return-container]').hidden,false);
  assert.ok(q(w,'[data-population-comparison]').textContent.includes(format(population.cmas.find(r=>r.id==='462').population[2021].value)));
  const back=q(w,'[data-demographic-return]');
  assert.ok(back.textContent.includes(record('religion','462').name));assert.ok(back.textContent.includes(data.religion.groups.find(g=>g.id==='21').name));assert.match(back.textContent,/戻る/);
  assert.deepEqual(Object.fromEntries(new URL(back.href).searchParams),saved);
  reloaded=await page(w.location.search);
  assert.equal(q(reloaded,'[data-demographic-return-container]').hidden,false);assert.deepEqual(Object.fromEntries(new URL(q(reloaded,'[data-demographic-return]').href).searchParams),saved);
  back.click();
  assert.deepEqual(Object.fromEntries(new URL(w.location.href).searchParams),saved);
  assert.equal(q(w,'[data-demographic-group]').value,'21');assert.equal(q(w,'[data-demographic-measure]').value,'count');assert.deepEqual(new Set(displayedIds(w)),new Set(['462','535']));
  assertOriginalDemographicReading(w,'religion','21','462');
 }finally{await w.happyDOM.close();if(reloaded)await reloaded.happyDOM.close();}
});

test('Population-scale comparison retains the original group share map and both legends even when the source requested counts',async()=>{
 for(const [name,group]of [['ethnicity','13'],['religion','21']]){
  const saved={year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected',topic:name,group,measure:'count'};
  const sharePage=await page('?'+new URLSearchParams({...saved,measure:'share'}));let w;
  try{
   const originalColors=Object.fromEntries(population.cmas.map(r=>[r.id,mapGroup(sharePage,r.id).querySelector('[data-population-boundary]').style.fill]));
   const originalClasses=[...q(sharePage,'[data-demographic-share-classes]').children].map(li=>li.textContent);
   w=await page('?'+new URLSearchParams(saved));q(w,'[data-demographic-population-link]').click();
   assert.equal(q(w,'[data-population-topic="distribution"]').getAttribute('aria-pressed'),'true');
   assert.equal(q(w,'[data-population-population-legend]').hidden,false);assert.equal(q(w,'[data-demographic-share-legend]').hidden,false);assert.equal(q(w,'[data-demographic-count-legend]').hidden,true);
   const legend=q(w,'[data-demographic-origin-legend]').textContent;assert.ok(legend.includes(data[name].groups.find(g=>g.id===group).name));assert.match(legend,/割合/);assert.match(q(w,'[data-demographic-share-legend]').textContent,/%/);assert.match(legend,/人数/);assert.match(legend,/照合|比較/);
   assert.deepEqual([...q(w,'[data-demographic-share-classes]').children].map(li=>li.textContent),originalClasses,'Bridge colors retain the original group thresholds');assert.equal(originalClasses.length,6);
   assert.equal(q(w,'[data-population-year]').disabled,true);assert.equal(q(w,'[data-population-metric]').disabled,true);
   for(const r of population.cmas){
    const marker=mapGroup(w,r.id);assert.equal(marker.querySelector('[data-population-boundary]').style.fill,originalColors[r.id],`${name}/${r.id}: original group share color is retained`);
    assert.notEqual(marker.querySelector('[data-population-symbol]').style.display,'none');assert.ok(marker.querySelector('title').textContent.includes(format(r.population[2021].value)),`${r.id}: circles and accessible titles describe full2021 population`);
   }
   const radius=id=>Number(mapGroup(w,id).querySelector('[data-population-symbol]').getAttribute('r')),fullCount=id=>population.cmas.find(r=>r.id===id).population[2021].value;
   assert.ok(Math.abs((radius('535')/radius('462'))**2-fullCount('535')/fullCount('462'))<1e-9,'The circle area ratio follows whole-population counts');
   const assertOrigin=id=>{const r=record(name,id),text=q(w,'[data-demographic-origin-comparison]').textContent;assert.ok(text.includes(r.name));assert.ok(text.includes(format(r.values[group].value)));assert.ok(text.includes(percent(r.values[group].value,r.denominator.value)));};
   assertOrigin('535');assertOrigin('462');change(w,'[data-population-cma]','933');assertOrigin('933');assertOrigin('462');
   assert.equal(mapGroup(w,'933').querySelector('[data-population-boundary]').style.fill,originalColors['933']);
   assert.deepEqual(Object.fromEntries(new URL(q(w,'[data-demographic-return]').href).searchParams),saved,'Changing the comparison geography does not replace the saved original question');
   q(w,'[data-demographic-return]').click();assert.deepEqual(Object.fromEntries(new URL(w.location.href).searchParams),saved);assert.equal(q(w,'[data-demographic-measure]').value,'count');assertOriginalDemographicReading(w,name,group,'535');
  }finally{await sharePage.happyDOM.close();if(w)await w.happyDOM.close();}
 }
});

test('A valid demographic source normalizes a reloaded population comparison to2021 and can be cleared back to ordinary density',async()=>{
 const saved={year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected',topic:'ethnicity',group:'13',measure:'count'};
 const query=new URLSearchParams({year:'2016',cma:'535',compare:'462',metric:'density',only:'1',zoom:'selected',keep:'yes',demographicsReturn:new URLSearchParams(saved).toString()});
 const w=await page('?'+query);let ordinary,reloaded;
 try{
  assert.equal(q(w,'[data-population-year]').value,'2021');assert.equal(q(w,'[data-population-metric]').value,'population');assert.equal(q(w,'[data-population-year]').disabled,true);assert.equal(q(w,'[data-population-metric]').disabled,true);
  const normalized=new URL(w.location.href).searchParams;assert.equal(normalized.get('year'),'2021');assert.equal(normalized.get('metric'),'population');assert.equal(normalized.get('keep'),'yes');assert.equal(normalized.get('demographicsReturn'),new URLSearchParams(saved).toString());
  reloaded=await page(w.location.search);assert.equal(q(reloaded,'[data-population-year]').value,'2021');assert.equal(q(reloaded,'[data-population-metric]').value,'population');assert.equal(q(reloaded,'[data-demographic-share-legend]').hidden,false);
  assert.deepEqual(Object.fromEntries(new URL(q(reloaded,'[data-demographic-return]').href).searchParams),saved);
  topic(reloaded,'religion');assert.equal(new URL(reloaded.location.href).searchParams.has('demographicsReturn'),false,'A different question drops the stale source context');
  topic(reloaded,'distribution');assert.equal(new URL(reloaded.location.href).searchParams.has('demographicsReturn'),false);assert.equal(q(reloaded,'[data-demographic-return-container]').hidden,true);assert.equal(q(reloaded,'[data-demographic-origin-legend]').hidden,true);
  assert.equal(q(reloaded,'[data-population-year]').disabled,false);assert.equal(q(reloaded,'[data-population-metric]').disabled,false);assert.equal(q(reloaded,'[data-demographic-share-legend]').hidden,true);assert.equal(q(reloaded,'[data-population-population-legend]').hidden,false);
  q(w,'[data-demographic-context-clear]').click();
  const cleared=new URL(w.location.href).searchParams;assert.equal(cleared.has('demographicsReturn'),false);assert.deepEqual(Object.fromEntries(cleared),Object.fromEntries([...normalized].filter(([key])=>key!=='demographicsReturn')),'Closing only removes the saved comparison context');
  assert.equal(q(w,'[data-demographic-return-container]').hidden,true);assert.equal(q(w,'[data-demographic-share-legend]').hidden,true);assert.equal(q(w,'[data-population-year]').disabled,false);assert.equal(q(w,'[data-population-metric]').disabled,false);
  change(w,'[data-population-metric]','density');ordinary=await page(w.location.search);
  assert.equal(q(w,'[data-population-density-legend]').hidden,false);assert.equal(q(w,'[data-population-population-legend]').hidden,true);assert.equal(q(w,'[data-demographic-share-legend]').hidden,true);
  for(const r of population.cmas){assert.equal(mapGroup(w,r.id).querySelector('[data-population-boundary]').style.fill,mapGroup(ordinary,r.id).querySelector('[data-population-boundary]').style.fill,'Cleared density uses the ordinary population density classes');assert.equal(mapGroup(w,r.id).querySelector('[data-population-symbol]').style.display,'none');}
 }finally{await w.happyDOM.close();if(ordinary)await ordinary.happyDOM.close();if(reloaded)await reloaded.happyDOM.close();}
});

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

test('Real published rounded zero remains0 while an explicitly synthetic missing fixture stays distinct in share and count',async()=>{
 assert.equal(record('ethnicity','447').values['13'].value,0,'Official recovered Drummondville Japanese zero is the real source cell');
 assert.ok(data.ethnicity.source.zeroCellRecovery?.sourceUrl,'The real zero has an official publication recovery record');
 const w=await page('?topic=ethnicity&group=13&measure=share&cma=447&compare=462',{patch:config=>{
  // These41selected source records have no natural nulls. Only this test window
  // gets a synthetic x value to exercise the missing-value rendering path.
  const missing=config.demographics.ethnicity.cmas.find(r=>r.id==='462');missing.values['13']={...missing.values['13'],value:null,symbol:'x',status:'x'};
 }});
 try{
  const comparison=q(w,'[data-demographic-comparison]').textContent;assert.match(comparison,/0\s*人/);assert.match(comparison,/秘匿（x）/);
  assert.match(mapGroup(w,'447').querySelector('title').textContent,/0\s*人/);assert.match(mapGroup(w,'462').querySelector('title').textContent,/秘匿（x）/);
  assert.notEqual(mapGroup(w,'447').querySelector('[data-population-boundary]').style.fill,mapGroup(w,'462').querySelector('[data-population-boundary]').style.fill,'Published0share has a quantitative class; missing has a separate class');
  assert.match(row(w,'447').textContent,/0/);assert.match(row(w,'462').textContent,/秘匿（x）/);
  change(w,'[data-demographic-measure]','count');
  assert.equal(Number(mapGroup(w,'447').querySelector('[data-population-symbol]').getAttribute('r')),0);assert.notEqual(mapGroup(w,'447').querySelector('[data-population-symbol]').style.display,'none');
  assert.equal(mapGroup(w,'462').querySelector('[data-population-symbol]').style.display,'none');
  assert.match(q(w,'[data-demographic-comparison]').textContent,/0\s*人/);assert.match(q(w,'[data-demographic-comparison]').textContent,/秘匿（x）/);
  assert.equal(record('ethnicity','447').values['13'].value,0,'Published source JSON was never altered by the fixture');
 }finally{await w.happyDOM.close();}
});
