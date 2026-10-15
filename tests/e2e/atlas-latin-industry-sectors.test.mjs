import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {industryBundle} from '../unit/atlas-latin-industry-helpers.mjs';
const data=JSON.parse(await readFile('src/data/atlas/latin-america/industry-sectors.json','utf8'));
const layers=await import('data:text/javascript;base64,'+Buffer.from(await industryBundle("export * from './src/lib/atlas-latin-industry-layers.ts';",'esm','node')).toString('base64'));
const code=await industryBundle("import {initLatinIndustry} from './src/scripts/atlas-latin-industry.ts';import {initLatinWorkspaceLayout} from './src/scripts/atlas-latin-workspace-layout.ts';initLatinWorkspaceLayout();initLatinIndustry(document.querySelector('[data-latin-industry]'));",'iife','browser',true);
async function page(search=''){const w=new Window({url:'https://example.test/insight-journal/atlas/latin-america/industry/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.write((await readFile('dist/atlas/latin-america/industry/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));w.eval(code);await new Promise(r=>setTimeout(r,25));return w;}
const snapshot=w=>({viewBox:w.document.querySelector('[data-lis-svg]').getAttribute('viewBox'),frame:w.document.querySelector('[data-lis-svg]>g').getAttribute('transform'),clusters:[...w.document.querySelectorAll('[data-lis-map] [data-lis-cluster]')].map(n=>[n.dataset.lisCluster,n.dataset.screenPoint,n.dataset.lisMembers]).sort((a,b)=>a[0].localeCompare(b[0]))});
const choose=(w,id)=>{w.document.querySelector('.latin-sector-industry-picker').open=true;w.document.querySelector(`[data-lis-legend] [data-lis-industry=${id}]`).click();};
test('Country context and shared field flags survive three separate map switches without choosing a city',async()=>{
 const w=await page('?place=BRA&scope=country&only=1&fallback=1');try{
  for(const sector of data.sectors){w.document.querySelector(`[data-latin-industry-sector=${sector.id}]`).click();assert.equal(w.document.querySelector('[data-lis-svg]').dataset.lisMapSector,sector.id);assert.equal(w.document.querySelector('[data-latin-industry-sectors]').dataset.industry,'all');}
  await new Promise(r=>setTimeout(r,30));const link=new URL(w.document.querySelector('.latin-fields a[href*=nature]').href);for(const [key,value]of [['place','BRA'],['scope','country'],['only','1'],['fallback','1']])assert.equal(link.searchParams.get(key),value);
  assert.equal(w.document.querySelector('[data-industry-legacy]').hidden,true);assert.equal(w.document.querySelector('[data-lis-scope]').value,'all');
 }finally{await w.happyDOM.close();}
});
test('The map has no product menu or clickable caption; source-specific choices stay in the reader',async()=>{
 const w=await page();try{for(const sector of data.sectors){
  w.document.querySelector(`[data-latin-industry-sector=${sector.id}]`).click();const map=w.document.querySelector('[data-lis-map]'),legend=w.document.querySelector('[data-lis-legend]');
  assert.ok(legend.closest('[data-lis-reader]'));assert.equal(map.querySelector('[data-lis-legend],button'),null);assert.ok(map.querySelectorAll('[data-lis-label]').length<=8);assert.equal(map.querySelectorAll('[data-lis-label][role=button],[data-lis-label][tabindex]').length,0);
  const ids=new Set(layers.industrySiteViews(sector.id).map(s=>s.id)),rendered=[...map.querySelectorAll('[data-lis-cluster]')].flatMap(el=>el.dataset.lisMembers.split(' '));assert.deepEqual(rendered.sort(),[...ids].sort());
  assert.deepEqual([...legend.querySelectorAll('button')].map(b=>b.dataset.lisIndustry),data.industries.filter(i=>layers.industryIdsInSector(sector.id).has(i.id)).map(i=>i.id));
  if(sector.id==='services')assert.doesNotMatch(w.document.querySelector('[data-lis-map-key]').textContent,/採掘|加工/);
 }}finally{await w.happyDOM.close();}
});
test('Every product and source site remains readable while selection keeps clusters, camera and source coordinates fixed',async()=>{
 const w=await page();try{for(const sector of data.sectors){
  w.document.querySelector(`[data-latin-industry-sector=${sector.id}]`).click();const before=snapshot(w),root=w.document.querySelector('[data-latin-industry-sectors]'),baselineLabels=[...w.document.querySelectorAll('[data-lis-label]')].map(el=>el.outerHTML);
  for(const id of layers.industryIdsInSector(sector.id)){
   choose(w,id);assert.equal(root.dataset.industry,id);assert.deepEqual(snapshot(w),before);assert.deepEqual([...w.document.querySelectorAll('[data-lis-label]')].map(el=>el.outerHTML),baselineLabels);
   const labels=[...w.document.querySelectorAll('[data-lis-label]')].map(el=>el.outerHTML);w.document.querySelector('[data-lis-single]').click();const single=snapshot(w);assert.equal(single.frame,before.frame);assert.equal(single.viewBox,before.viewBox);assert.ok(single.clusters.every(c=>c[2].split(' ').every(site=>data.sites.find(s=>s.id===site).industry===id)));assert.ok([...w.document.querySelectorAll('[data-lis-label]')].every(el=>labels.includes(el.outerHTML)),'Solo captions keep their reserved sector slots');w.document.querySelector('[data-lis-single]').click();assert.deepEqual(snapshot(w),before);
   for(const s of layers.industrySiteViews(sector.id).filter(s=>s.industry===id)){
    w.document.querySelector(`[data-lis-sites] [data-lis-site=${s.id}]`).click();assert.equal(root.dataset.site,s.id);assert.deepEqual(snapshot(w),before);assert.equal(w.document.querySelector('[data-lis-site-note]').textContent,s.note);assert.equal(w.document.querySelector('[data-lis-coordinate-note]').textContent,s.coordinateMeaning);
    for(const ref of s.sources)assert.ok([...w.document.querySelectorAll('[data-lis-sources] a')].some(a=>a.href===data.sources.find(x=>x.id===ref).url));
   }
  }
  w.document.querySelector('[data-lis-clear]').click();assert.deepEqual(snapshot(w),before);assert.ok([...w.document.querySelectorAll('[data-lis-label]')].every(el=>el.dataset.lisLabelKind==='overview'));
 }}finally{await w.happyDOM.close();}
});
test('Dual-process entries, legacy refining URLs, reload, history, reference-only aquaculture and keyboard clusters retain meaning',async()=>{
 const w=await page('?sector=resources&site=araxa-niobium&single=1');let reload,legacy;try{
  w.document.querySelector('[data-lis-overlap]').click();assert.equal(new URL(w.location.href).searchParams.get('sector'),'manufacturing');assert.match(w.document.querySelector('[data-lis-site-title]').textContent,/フェロニオブ/);
  reload=await page(new URL(w.location.href).search);assert.equal(reload.document.querySelector('[data-latin-industry-sectors]').dataset.site,'araxa-niobium');
  legacy=await page('?sector=resources&site=reduc&single=1');assert.equal(legacy.document.querySelector('[data-latin-industry-sectors]').dataset.sector,'resources');assert.equal(legacy.document.querySelector('[data-lis-overlap]').hidden,false);
  w.history.replaceState(null,'','?sector=manufacturing&site=guayas-shrimp');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(w.document.querySelector('[data-latin-industry-sectors]').dataset.site,'guayas-shrimp');assert.match(w.document.querySelector('[data-lis-range-note]').textContent,/養殖原料の参考/);assert.ok(!snapshot(w).clusters.some(c=>c[2].includes('guayas-shrimp')));
  w.document.querySelector('[data-lis-clear]').click();const cluster=w.document.querySelector('[data-lis-cluster][data-source-count="3"]')??w.document.querySelector('[data-lis-cluster]');const id=cluster.dataset.lisCluster;cluster.focus();cluster.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(w.document.activeElement.dataset.lisCluster,id);assert.ok(w.document.querySelector('[data-latin-industry-sectors]').dataset.industry!=='all');
 }finally{if(reload)await reload.happyDOM.close();if(legacy)await legacy.happyDOM.close();await w.happyDOM.close();}
});
test('All 22 adopted groups retain their scoped below-map evidence in at least one displayed process map',async()=>{
 const w=await page();try{const stats=w.document.querySelector('[data-lis-statistics]');assert.ok(stats.closest('[data-latin-below-workspace]'));assert.equal(w.document.querySelector('[data-lis-reader] [data-lis-metric]'),null);
  for(const r of data.requirements)for(const id of r.industryIds){const sector=data.sectors.find(s=>layers.industryIdsInSector(s.id).has(id)).id;w.document.querySelector(`[data-latin-industry-sector=${sector}]`).click();const before=snapshot(w);choose(w,id);assert.equal(stats.dataset.industry,id);assert.equal(stats.dataset.sector,sector);assert.deepEqual(snapshot(w),before);const metrics=[...stats.querySelectorAll('[data-lis-metric]')];assert.ok(metrics.length,id);for(const el of metrics){const m=data.statistics.find(m=>m.id===el.dataset.lisMetric);assert.equal(m.industry,id);assert.equal(el.dataset.geography,m.geography);assert.ok(el.textContent.includes(m.period));for(const ref of m.sources)assert.ok([...el.querySelectorAll('a')].some(a=>a.href===data.sources.find(s=>s.id===ref).url));}}
  w.document.querySelector('[data-latin-industry-sector=manufacturing]').click();choose(w,'aviation');assert.match(stats.querySelector('[data-lis-metric=air-niche]').textContent,/未取得/);assert.match(stats.querySelector('[data-lis-metric=air-global-sales]').textContent,/世界事業/);
 }finally{await w.happyDOM.close();}
});
