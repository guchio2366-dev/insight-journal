import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const folder='atlas/north-america/canada',config=JSON.parse(await readFile('src/data/atlas/canada/industry.json','utf8'));
const sectors=['all','manufacturing','resources','services'];
const regions=[['alberta-energy','resources','Alberta','mining'],['ontario-manufacturing','manufacturing','Ontario','manufacturing'],['quebec-manufacturing','manufacturing','Quebec','manufacturing'],['bc-transport-services','services','British Columbia','services']];
const stripScripts=html=>html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
async function compile(name,call){const init=name==='industry'?'initCanadaIndustry':'initCanadaNature';const result=await build({stdin:{contents:`import {${init}} from './src/scripts/atlas-canada-${name}.ts';\n${call}`,resolveDir:process.cwd(),sourcefile:`industry-${name}-test-entry.ts`,loader:'ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},bundle:true,format:'iife',platform:'browser',write:false});return result.outputFiles[0].text;}
const code=await compile('industry',"initCanadaIndustry(document.querySelector('[data-canada-industry]'));");
async function page(search='',interactive=false,patch,stored){const w=new Window({url:`https://example.com/insight-journal/${folder}/industry/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.write(stripScripts(await readFile(`dist/${folder}/industry/index.html`,'utf8')));if(patch){const el=w.document.querySelector('[data-industry-config]'),cfg=JSON.parse(el.textContent);patch(cfg);el.textContent=JSON.stringify(cfg);}if(stored)w.localStorage.setItem('insight-journal:canada-industry:v1',stored);if(interactive)w.eval(code);return w;}
const change=(w,s,value)=>{const el=w.document.querySelector(s);el.value=String(value);el.dispatchEvent(new w.Event('change'));};
const selectedTab=d=>d.querySelector('[data-industry-sector][role="tab"][aria-selected="true"]');
const markers=d=>[...d.querySelectorAll('[data-industry-region-markers] [data-industry-region]')].filter(el=>el.style.display!=='none');
const frame=d=>d.querySelector('[data-industry-map]').getAttribute('viewBox');

test('Industry SSR uses the US sector hierarchy, neutral geographic context and folded original 156 GDP cells',async()=>{
 const w=await page();try{
  const d=w.document,q=s=>d.querySelector(s),statistics=q('#canada-industry-statistics');
  assert.equal(d.querySelectorAll('[data-industry-province-shape]').length,13);assert.equal(d.querySelectorAll('[data-industry-province-label]').length,13);
  assert.equal(d.querySelectorAll('[data-industry-row]').length,39);assert.equal(d.querySelectorAll('[data-industry-cell]').length,156);assert.equal(d.querySelectorAll('[data-industry-row]:not([hidden])').length,13);
  // Assert the SSR selected attribute: HappyDOM selects the preceding parsed option.
  assert.equal(q('[data-industry-year] option[selected]').value,'2025');assert.equal(d.querySelectorAll('[data-industry-year] option[selected]').length,1);
  assert.equal(q('[data-industry-metric]').value,'mining');assert.equal(q('[data-industry-metric] option[value=all]'),null);assert.equal(frame(d),'0 0 900 580');assert.match(q('[data-industry-comparison]').textContent,/2025.*24\.08%/);
  const tabs=[...d.querySelectorAll('[data-industry-sector][role="tab"]')];
  assert.deepEqual(tabs.map(b=>b.dataset.industrySector),sectors);assert.deepEqual(tabs.map(b=>b.textContent.trim()),['全産業','製造業','資源・エネルギー','サービス業']);
  assert.equal(selectedTab(d).dataset.industrySector,'all');assert.equal(tabs.filter(b=>b.getAttribute('aria-selected')==='true').length,1);
  for(const tab of tabs){assert.equal(tab.getAttribute('aria-controls'),'canada-industry-map-panel');assert.equal(tab.tabIndex,tab.dataset.industrySector==='all'?0:-1);}
  assert.equal(q('#canada-industry-map-panel').getAttribute('role'),'tabpanel');assert.equal(q('#canada-industry-map-panel').getAttribute('aria-labelledby'),selectedTab(d).id);
  assert.equal(statistics.open,false);for(const key of ['year','province','compare','metric'])assert.equal(q(`[data-industry-${key}]`).closest('#canada-industry-statistics'),statistics);
  assert.equal(q('[data-industry-metric]').closest('label').hidden,false);
  for(const selector of ['[data-canada-industry-metric]','[data-industry-example]','[data-industry-only]','[data-industry-focus]','[data-industry-reset]'])assert.ok(!q(selector),selector);
  for(const row of config.data){const tr=q(`[data-industry-row="${row.id}"][data-year="${row.year}"]`);assert.equal(tr.querySelector('[data-industry-bar]').style.width,`${row.values.mining.value}%`);for(const metric of config.metrics){const v=row.values[metric.id],cell=tr.querySelector(`[data-industry-cell="${metric.id}"]`);assert.equal(cell.dataset.status,v.status);assert.equal(cell.dataset.symbol,v.symbol);assert.equal(cell.dataset.vector,v.vector);assert.equal(Number(cell.dataset.value),v.value);assert.ok(cell.textContent.includes(v.value.toLocaleString('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2})));}}
  assert.equal(q('[data-industry-row="Nunavut"][data-year="2025"] [data-industry-bar]').style.width,'46.9%');assert.equal(q('[data-industry-row="Ontario"][data-year="2025"] [data-industry-bar]').style.width,'1.31%');
  for(const shape of d.querySelectorAll('[data-industry-province-shape]')){assert.equal(shape.getAttribute('role'),'button');assert.equal(shape.getAttribute('tabindex'),'0');assert.match(shape.querySelector('title').textContent,/位置案内/);assert.equal(shape.getAttribute('fill-rule'),'evenodd');assert.equal(shape.getAttribute('fill'),'#edf1df');}
  assert.match(q('.canada-map-column .canada-caption').textContent,/2021年.*位置案内/);
  assert.deepEqual([...d.querySelectorAll('[data-industry-region-markers] [data-industry-region]')].map(el=>el.dataset.industryRegion),regions.map(r=>r[0]));
  assert.equal(q('[data-industry-sector-reading]:not([hidden])').dataset.industrySectorReading,'all');assert.equal(d.querySelectorAll('[data-industry-region-reading]:not([hidden])').length,0);
  assert.equal(q('.industry-region-list').parentElement.tagName,'DETAILS');assert.equal(q('.industry-table-details').open,false);assert.equal(q('.industry-source-footer details').open,false);assert.ok(q('[data-news-rail]'));
  assert.deepEqual([...q('.industry-sector-legend').querySelectorAll('span')].map(el=>el.textContent.trim()),['製造業','資源・エネルギー','サービス業']);assert.match(q('[data-industry-map-status]').textContent,/同じ大きさ.*数量.*施設/s);
  const source=q('#canada-industry-sources').textContent;assert.match(source,/Adapted from Statistics Canada.*36-10-0400-01.*reference years 2023, 2024 and 2025.*This does not constitute an endorsement/s);assert.match(source,/2026年5月1日.*2021.*EPSG:4326.*OGL–Canada/s);
  assert.match(q('.industry-definitions').textContent,/石油・ガス採取.*鉱業・採石.*天然資源.*農林漁業.*円グラフ/s);assert.match(q('noscript').textContent,/2025年.*全156値/s);
  for(const file of ['industry-selected.csv','manifest.json']){assert.ok(q(`a[href$="${file}"]`));await access(`dist/assets/atlas/canada-industry-v1/${file}`);}
 }finally{await w.happyDOM.close();}
});

test('All 3 GDP years, 3 industries and 13 provinces retain official percentage widths independently of the main map',async()=>{
 const w=await page('',true);try{
  const d=w.document,q=s=>d.querySelector(s);assert.equal(selectedTab(d).dataset.industrySector,'all');assert.equal(q('[data-industry-province]').value,'Ontario');
  for(const year of config.years)for(const metric of config.metrics.filter(m=>m.id!=='all')){
   change(w,'[data-industry-year]',year);change(w,'[data-industry-metric]',metric.id);
   assert.equal(d.querySelectorAll('[data-industry-row]:not([hidden])').length,13);assert.equal(selectedTab(d).dataset.industrySector,'all');
   assert.equal(q('[data-industry-sector-reading]:not([hidden])').dataset.industrySectorReading,'all');
   for(const p of config.provinces){change(w,'[data-industry-province]',p.id);const row=config.data.find(r=>r.year===year&&r.id===p.id),value=row.values[metric.id].value;
    assert.ok(q('[data-industry-comparison]').textContent.includes(p.name));assert.ok(q('[data-industry-comparison]').textContent.includes(value.toLocaleString('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'));
    assert.equal(q(`[data-industry-row="${p.id}"][data-year="${year}"] [data-industry-bar]`).style.width,`${value}%`);assert.equal(q('[data-industry-card-bar]').style.width,`${value}%`);
    assert.equal(q(`[data-industry-province-shape="${p.id}"]`).getAttribute('fill'),'#edf1df');assert.equal(q(`[data-industry-province-shape="${p.id}"]`).getAttribute('aria-pressed'),'false');
   }
   assert.equal(d.querySelectorAll(`[data-industry-cell="${metric.id}"].is-current-metric`).length,39);assert.equal(markers(d).length,4);
  }
  change(w,'[data-industry-province]','Ontario');change(w,'[data-industry-compare]','Quebec');assert.equal(d.querySelectorAll('[data-industry-card]:not([hidden])').length,2);assert.match(q('[data-industry-comparison]').textContent,/オンタリオ.*ケベック/s);
  change(w,'[data-industry-province]','Quebec');assert.equal(q('[data-industry-compare]').value,'');assert.equal(d.querySelectorAll('[data-industry-card]:not([hidden])').length,1);
 }finally{await w.happyDOM.close();}
});

test('Legacy comparison URLs, province keyboard selection, history and saved choices retain statistics without filtering or moving the primary map',async()=>{
 const w=await page('?year=2023&province=Ontario&compare=Quebec&metric=manufacturing&only=1&zoom=1&keep=yes',true);let reload,stored;
 try{
  const d=w.document,q=s=>d.querySelector(s),map=q('[data-industry-map]');assert.equal(selectedTab(d).dataset.industrySector,'manufacturing');assert.equal(markers(d).length,2);assert.equal(frame(d),'0 0 900 580');
  assert.equal([...d.querySelectorAll('[data-industry-province-shape]')].filter(s=>s.style.display!=='none').length,13);
  map.setAttribute('viewBox','80 120 630 420');
  q('[data-industry-province-shape="Alberta"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-industry-province]').value,'Alberta');assert.equal(new URL(w.location).searchParams.get('keep'),'yes');
  q('[data-industry-province-shape="British Columbia"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(q('[data-industry-province]').value,'British Columbia');assert.equal(frame(d),'80 120 630 420');
  w.history.replaceState(null,'','?year=2024&province=Alberta&compare=Ontario&metric=mining&only=1&zoom=1');w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(selectedTab(d).dataset.industrySector,'resources');assert.equal(q('[data-industry-year]').value,'2024');assert.equal(q('[data-industry-metric]').value,'mining');assert.equal(frame(d),'80 120 630 420');assert.equal(markers(d).length,1);
  reload=await page(w.location.search,true);assert.equal(reload.document.querySelector('[data-industry-province]').value,'Alberta');assert.equal(selectedTab(reload.document).dataset.industrySector,'resources');
  q('[data-industry-save]').click();const saved=w.localStorage.getItem('insight-journal:canada-industry:v1');assert.ok(saved.includes('year=2024'));assert.match(q('[data-industry-saved-status]').textContent,/保存/);
  change(w,'[data-industry-metric]','services');q('[data-industry-restore]').click();assert.equal(q('[data-industry-metric]').value,'mining');assert.equal(frame(d),'80 120 630 420');assert.match(q('[data-industry-saved-status]').textContent,/復元/);
  stored=await page('',true,null,saved);assert.equal(stored.document.querySelector('[data-industry-year]').value,'2025');stored.document.querySelector('[data-industry-restore]').click();assert.equal(stored.document.querySelector('[data-industry-year]').value,'2024');assert.equal(stored.document.querySelector('[data-industry-compare]').value,'Ontario');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();if(stored)await stored.happyDOM.close();}
});

test('US sector navigation opens regional readings, returns by overview or Escape, and keeps the map frame through saved history',async()=>{
 const w=await page('?year=2024&province=Ontario&compare=Quebec&sector=all&keep=yes',true);let reload;
 try{
  const d=w.document,q=s=>d.querySelector(s),tab=id=>q(`[data-industry-sector="${id}"][role="tab"]`),mark=id=>q(`[data-industry-region-markers] [data-industry-region="${id}"]`);
  const selected=id=>{assert.equal(d.querySelectorAll('[data-industry-sector][role="tab"][aria-selected="true"]').length,1);assert.equal(selectedTab(d).dataset.industrySector,id);assert.equal(tab(id).tabIndex,0);assert.equal(q('#canada-industry-map-panel').getAttribute('aria-labelledby'),tab(id).id);};
  q('[data-industry-map]').setAttribute('viewBox','80 120 630 420');
  for(const [id,count] of [['all',4],['manufacturing',2],['resources',1],['services',1]]){tab(id).click();selected(id);assert.equal(markers(d).length,count);assert.equal(q('[data-industry-sector-reading]:not([hidden])').dataset.industrySectorReading,id);assert.equal(frame(d),'80 120 630 420');}
  for(const [id,sector,province,metric] of regions){
   tab(sector).click();mark(id).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));selected(sector);
   assert.equal(q('[data-industry-general-reading]').hidden,true);assert.equal(q('[data-industry-region-reading]:not([hidden])').dataset.industryRegionReading,id);assert.equal(d.querySelectorAll('[data-industry-sector-reading]:not([hidden])').length,0);
   assert.equal(mark(id).getAttribute('aria-pressed'),'true');assert.equal(q(`[data-industry-province-shape="${province}"]`).getAttribute('aria-pressed'),'true');
   assert.equal(q('[data-industry-province]').value,province);assert.equal(q('[data-industry-metric]').value,metric);assert.equal(frame(d),'80 120 630 420');
   const url=new URL(w.location.href);for(const [key,value] of Object.entries({region:id,sector,province,metric,year:'2024',keep:'yes'}))assert.equal(url.searchParams.get(key),value);
   const back=new URLSearchParams(new URL(q('[data-industry-nature-link]').href).searchParams.get('industryReturn'));assert.equal(back.get('region'),id);assert.equal(back.get('sector'),sector);assert.equal(back.has('keep'),false);
   q(`[data-industry-region-reading="${id}"] [data-industry-overview]`).click();selected(sector);assert.equal(q('[data-industry-general-reading]').hidden,false);assert.equal(d.activeElement,tab(sector));assert.equal(new URL(w.location).searchParams.has('region'),false);assert.equal(frame(d),'80 120 630 420');
  }
  tab('manufacturing').click();mark('ontario-manufacturing').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));q('[data-industry-save]').click();const saved=w.localStorage.getItem('insight-journal:canada-industry:v1');assert.match(saved,/region=ontario-manufacturing/);
  q('[data-industry-controls]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(q('[data-industry-region-reading]:not([hidden])'),null);selected('manufacturing');assert.equal(d.activeElement,tab('manufacturing'));
  tab('services').click();q('[data-industry-restore]').click();selected('manufacturing');assert.equal(q('[data-industry-region-reading]:not([hidden])').dataset.industryRegionReading,'ontario-manufacturing');assert.equal(frame(d),'80 120 630 420');
  reload=await page(w.location.search,true);assert.equal(reload.document.querySelector('[data-industry-region-reading]:not([hidden])').dataset.industryRegionReading,'ontario-manufacturing');assert.equal(reload.document.querySelector('[data-industry-year]').value,'2024');
  // Changing the related statistic cannot survive in the URL as a contradictory region/metric pair.
  change(w,'[data-industry-metric]','services');assert.equal(q('[data-industry-region-reading]:not([hidden])'),null);assert.equal(new URL(w.location).searchParams.has('region'),false);
  q('[data-industry-save]').click();change(w,'[data-industry-metric]','mining');q('[data-industry-restore]').click();assert.equal(q('[data-industry-metric]').value,'services');assert.equal(frame(d),'80 120 630 420');
  const statistics=q('#canada-industry-statistics');assert.equal(statistics.open,false);q('a[href="#canada-industry-statistics"]').click();assert.equal(statistics.open,true);
  const press=key=>{const active=selectedTab(d);active.focus();active.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));assert.equal(d.activeElement,selectedTab(d));assert.equal(frame(d),'80 120 630 420');};
  press('ArrowRight');selected('resources');press('ArrowLeft');selected('manufacturing');press('Home');selected('all');press('End');selected('services');
  w.history.replaceState(null,'','?year=2023&province=Alberta&compare=Ontario&metric=mining&sector=resources&region=alberta-energy');w.dispatchEvent(new w.PopStateEvent('popstate'));
  selected('resources');assert.equal(q('[data-industry-region-reading]:not([hidden])').dataset.industryRegionReading,'alberta-energy');assert.equal(q('[data-industry-year]').value,'2023');assert.equal(frame(d),'80 120 630 420');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('Synthetic published zero, missing F and revision flags remain distinct in statistics without recolouring geography',async()=>{
 const w=await page('?province=Alberta&compare=Ontario&metric=mining',true,cfg=>{cfg.data.find(r=>r.year===2025&&r.id==='Alberta').values.mining={value:0,status:'A',symbol:'r'};cfg.data.find(r=>r.year===2025&&r.id==='Ontario').values.mining={value:null,status:'F',symbol:''};});
 try{const d=w.document,zero=d.querySelector('[data-industry-row="Alberta"][data-year="2025"] [data-industry-bar]'),missing=d.querySelector('[data-industry-row="Ontario"][data-year="2025"] [data-industry-bar]');
  assert.equal(zero.style.width,'0%');assert.equal(missing.style.width,'0%');assert.equal(zero.parentElement.classList.contains('is-missing'),false);assert.equal(missing.parentElement.classList.contains('is-missing'),true);
  for(const id of ['Alberta','Ontario'])assert.equal(d.querySelector(`[data-industry-province-shape="${id}"]`).getAttribute('fill'),'#edf1df');
  assert.match(d.querySelector('[data-industry-comparison]').textContent,/0\.00%.*A r.*欠損.*F/s);assert.equal([...d.querySelectorAll('[data-industry-card-bar]')][1].parentElement.classList.contains('is-missing'),true);
 }finally{await w.happyDOM.close();}
});

test('Industry nature links retain validated sector/context keys and explicit local water/landform questions',async()=>{
 const w=await page('?year=2023&province=Ontario&compare=Quebec&metric=manufacturing&only=1&zoom=1&keep=yes&next=https://evil.example/',true);
 try{const d=w.document;for(const a of d.querySelectorAll('[data-industry-nature-link]')){const target=new URL(a.href),back=new URLSearchParams(target.searchParams.get('industryReturn'));assert.equal(target.origin,'https://example.com');assert.equal(target.pathname,`/insight-journal/${folder}/nature/`);assert.deepEqual(new Set(back.keys()),new Set(['year','province','metric','compare','only','zoom','sector']));
  for(const [key,value] of Object.entries({year:'2023',province:'Ontario',compare:'Quebec',metric:'manufacturing',sector:'manufacturing'}))assert.equal(back.get(key),value);
  for(const key of ['keep','next','city'])assert.equal(back.has(key),false);assert.match(a.textContent,target.searchParams.get('view')==='landform'?/山地|内陸|地形/:/川|湖|沿岸|市場/);
 }
 const central=new URL(d.querySelector('[data-industry-nature-link*="St."]').href),coast=new URL(d.querySelector('[data-industry-nature-link*="Fraser"]').href);assert.equal(central.searchParams.get('city'),'ottawa');assert.equal(central.searchParams.get('water'),'St. Lawrence');assert.equal(central.searchParams.get('only'),'1');assert.equal(coast.searchParams.get('city'),'vancouver');assert.equal(coast.searchParams.get('water'),'Fraser');assert.equal(coast.searchParams.get('only'),'1');
 }finally{await w.happyDOM.close();}
});

test('Modern nature comparison retains regional geography, all sector legends and a named return with saved statistics',async()=>{
 const source=await page('?year=2024&province=Ontario&compare=Quebec&metric=manufacturing&sector=manufacturing&region=ontario-manufacturing&only=1&zoom=1',true);let nature,returned;
 try{
  const target=new URL(source.document.querySelector('[data-industry-nature-link*="St."]').href);
  nature=new Window({url:target.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  nature.document.write(stripScripts(await readFile(`dist/${folder}/nature/index.html`,'utf8')));nature.eval(await compile('nature',"initCanadaNature(document.querySelector('[data-canada-nature]'));"));
  const d=nature.document,q=s=>d.querySelector(s),overlay=q('[data-canada-industry-context-map]'),back=q('[data-canada-industry-return]'),legend=q('[data-canada-industry-context-legend]');
  assert.equal(back.hidden,false);assert.match(back.textContent,/オンタリオ.*Toronto.*産業地図へ戻る/s);
  assert.equal(q('[data-canada-industry-context]').hidden,false);assert.equal(overlay.querySelectorAll('path').length,13);
  const original=JSON.parse(q('[data-canada-config]').textContent).industry;
  for(const shape of overlay.querySelectorAll('path')){assert.equal(shape.getAttribute('fill'),'#edf1df');assert.equal(shape.getAttribute('fill-rule'),'evenodd');assert.equal(shape.getAttribute('d'),original.geometry.find(g=>g.id===shape.dataset.canadaIndustryContextProvince).path);}
  assert.deepEqual(new Set([...overlay.querySelectorAll('[data-canada-industry-context-region]')].map(el=>el.dataset.canadaIndustryContextRegion)),new Set(['ontario-manufacturing','quebec-manufacturing']));
  for(const circle of overlay.querySelectorAll('[data-canada-industry-context-region] circle'))assert.equal(circle.getAttribute('r'),'6');
  assert.deepEqual([...legend.querySelector('[data-canada-industry-context-reading-scale]').children].map(el=>el.textContent.trim()),['製造業','資源・エネルギー','サービス業']);
  assert.match(legend.textContent,/案内位置.*2021年/s);assert.match(q('[data-canada-industry-context-text]').textContent,/加工.*輸送.*市場.*生産量.*施設.*GDP統計.*保持/s);
  const saved=new URL(back.href);for(const [key,value] of Object.entries({sector:'manufacturing',region:'ontario-manufacturing',province:'Ontario',compare:'Quebec',metric:'manufacturing',year:'2024',only:'1',zoom:'1'}))assert.equal(saved.searchParams.get(key),value);
  q('[data-canada-view=landform]').click();assert.equal(overlay.style.display,'none');
  const mini=q('[data-canada-industry-context-mini-map]'),miniLegend=q('[data-canada-industry-context-mini-legend]');assert.notEqual(mini.style.display,'none');assert.equal(mini.querySelectorAll('path').length,13);assert.equal(mini.querySelectorAll('[data-canada-industry-context-region]').length,2);assert.equal(miniLegend.hidden,false);assert.equal(miniLegend.querySelector('[data-canada-industry-context-reading-scale]').children.length,3);assert.match(miniLegend.textContent,/別の地図.*左右/s);
  q('[data-canada-view=water]').click();assert.notEqual(overlay.style.display,'none');assert.equal(mini.style.display,'none');assert.equal(legend.hidden,false);
  returned=await page(saved.search,true);assert.equal(returned.document.querySelector('[data-industry-region-reading]:not([hidden])').dataset.industryRegionReading,'ontario-manufacturing');assert.equal(returned.document.querySelector('[data-industry-year]').value,'2024');assert.equal(returned.document.querySelector('[data-industry-compare]').value,'Quebec');
 }finally{await source.happyDOM.close();if(nature)await nature.happyDOM.close();if(returned)await returned.happyDOM.close();}
});

test('Legacy nature links retain official GDP distribution, separate landform maps and validated industry state',async()=>{
 const source=await page('?year=2023&province=Ontario&compare=Quebec&metric=manufacturing&only=1&zoom=1',true);
 let nature;
 try{
  const target=new URL(source.document.querySelector('[data-industry-nature-link*="St."]').href);
  // URLs saved before the US sector/region model keep their original quantitative comparison.
  const legacy=new URLSearchParams(target.searchParams.get('industryReturn'));legacy.delete('sector');legacy.delete('region');target.searchParams.set('industryReturn',legacy.toString());
  target.searchParams.set('industryReturn',target.searchParams.get('industryReturn')+'&next=https%3A%2F%2Fevil.example%2F&city=vancouver&href=%2Foutside%2F');
  nature=new Window({url:target.href,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  nature.document.write(stripScripts(await readFile(`dist/${folder}/nature/index.html`,'utf8')));
  nature.eval(await compile('nature',"initCanadaNature(document.querySelector('[data-canada-nature]'));"));
  const d=nature.document,q=s=>d.querySelector(s),back=q('[data-canada-industry-return]');
  assert.ok(back,'nature requires a dedicated industry return link');assert.equal(back.hidden,false);
  const returned=new URL(back.href);
  assert.equal(returned.origin,'https://example.com');assert.equal(returned.pathname,`/insight-journal/${folder}/industry/`);
  assert.deepEqual(new Set(returned.searchParams.keys()),new Set(['year','province','compare','metric','only','zoom']));
  for(const [key,value] of Object.entries({year:'2023',province:'Ontario',compare:'Quebec',metric:'manufacturing',only:'1',zoom:'1'}))assert.equal(returned.searchParams.get(key),value);
  assert.equal(q('[data-canada-city]').value,'ottawa');assert.equal(q('[data-canada-water]').value,'St. Lawrence');
  assert.equal(q('[data-canada-industry-context]').hidden,false);assert.equal(q('[data-canada-industry-context-legend] [data-canada-industry-context-scale]').children.length,6);
  const original=JSON.parse(q('[data-canada-config]').textContent).industry;
  const overlay=q('[data-canada-industry-context-map]');
  assert.deepEqual(new Set([...overlay.querySelectorAll('path')].map(p=>p.dataset.canadaIndustryContextProvince)),new Set(['Ontario','Quebec']));
  for(const shape of overlay.querySelectorAll('path')){
   const id=shape.dataset.canadaIndustryContextProvince,value=config.data.find(r=>r.id===id&&r.year===2023).values.manufacturing.value;
   assert.equal(shape.getAttribute('d'),original.geometry.find(g=>g.id===id).path);
   assert.equal(shape.getAttribute('fill-rule'),'evenodd');
   assert.ok(shape.querySelector('title').textContent.includes(`${value.toFixed(2)}%`));
   assert.match(shape.querySelector('title').textContent,/2023年.*2021年/s);
  }
  assert.match(q('[data-canada-industry-context-legend]').textContent,/2023年.*州内GDP割合.*境界2021年.*1991–2020年/s);
  change(nature,'[data-canada-water]','Fraser');
  assert.match(q('[data-canada-industry-context-text]').textContent,/現在はFraser.*比較入口のSt\. Lawrenceとは別の水系/s);
  q('[data-canada-view=landform]').click();
  assert.equal(overlay.style.display,'none');
  assert.notEqual(q('[data-canada-industry-context-mini-map]').style.display,'none');
  assert.equal(q('[data-canada-industry-context-mini-map]').querySelectorAll('path').length,2);
  assert.equal(q('[data-canada-industry-context-mini-legend]').hidden,false);
  assert.match(q('[data-canada-industry-context-mini-legend]').textContent,/2023年.*別投影.*左右/s);
  q('[data-canada-view=climate]').click();
  assert.notEqual(overlay.style.display,'none');assert.equal(q('[data-canada-industry-context-mini-map]').style.display,'none');
  assert.match(q('[data-canada-industry-context-text]').textContent,/1観測地点.*州全体.*対象が異なります/s);
  assert.equal(new URL(back.href).searchParams.get('metric'),'manufacturing');
  const invalid=new URL(nature.location.href);
  invalid.searchParams.set('industryReturn','year=1900&province=Canada&compare=Ontario&metric=all&only=1&zoom=0&href=https://evil.example/');
  nature.history.replaceState(null,'',invalid.href);nature.dispatchEvent(new nature.PopStateEvent('popstate'));
  const sanitized=new URL(back.href);
  assert.equal(sanitized.searchParams.get('year'),'2025');assert.equal(sanitized.searchParams.get('province'),'Alberta');assert.equal(sanitized.searchParams.get('metric'),'mining');assert.equal(sanitized.searchParams.has('href'),false);assert.equal(sanitized.searchParams.has('zoom'),false);
  invalid.searchParams.delete('industryReturn');nature.history.replaceState(null,'',invalid.href);nature.dispatchEvent(new nature.PopStateEvent('popstate'));
  assert.equal(back.hidden,true);assert.equal(q('[data-canada-industry-context]').hidden,true);assert.equal(q('[data-canada-industry-context-legend]').hidden,true);assert.equal(overlay.style.display,'none');assert.equal(q('[data-canada-industry-context-mini-map]').style.display,'none');
 }finally{await source.happyDOM.close();if(nature)await nature.happyDOM.close();}
});
