import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const folder='atlas/north-america/canada',config=JSON.parse(await readFile('src/data/atlas/canada/industry.json','utf8'));
const stripScripts=html=>html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
async function compile(name,call){const init=name==='industry'?'initCanadaIndustry':'initCanadaNature';const result=await build({stdin:{contents:`import {${init}} from './src/scripts/atlas-canada-${name}.ts';\n${call}`,resolveDir:process.cwd(),sourcefile:`industry-${name}-test-entry.ts`,loader:'ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},bundle:true,format:'iife',platform:'browser',write:false});return result.outputFiles[0].text;}
const code=await compile('industry',"initCanadaIndustry(document.querySelector('[data-canada-industry]'));");
async function page(search='',interactive=false,patch,stored){const w=new Window({url:`https://example.com/insight-journal/${folder}/industry/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.write(stripScripts(await readFile(`dist/${folder}/industry/index.html`,'utf8')));if(patch){const el=w.document.querySelector('[data-industry-config]'),cfg=JSON.parse(el.textContent);patch(cfg);el.textContent=JSON.stringify(cfg);}if(stored)w.localStorage.setItem('insight-journal:canada-industry:v1',stored);if(interactive)w.eval(code);return w;}
const change=(w,s,value)=>{const el=w.document.querySelector(s);el.value=String(value);el.dispatchEvent(new w.Event('change'));};

test('Industry SSR shows 2025 official shares, 13 accessible province shapes, 156 original cells and folded source/table detail',async()=>{
 // Assert the server-rendered selected attribute: HappyDOM currently selects the preceding parsed option.
 const w=await page();try{const d=w.document;assert.equal(d.querySelectorAll('[data-industry-province-shape]').length,13);assert.equal(d.querySelectorAll('[data-industry-province-label]').length,13);assert.equal(d.querySelectorAll('[data-industry-row]').length,39);assert.equal(d.querySelectorAll('[data-industry-cell]').length,156);assert.equal(d.querySelectorAll('[data-industry-row]:not([hidden])').length,13);assert.equal(d.querySelectorAll('[data-industry-year] option[selected]').length,1);assert.equal(d.querySelector('[data-industry-year] option[selected]').value,'2025');assert.equal(d.querySelector('[data-industry-metric]').value,'mining');assert.equal(d.querySelector('[data-industry-metric] option[value=all]'),null);assert.equal(d.querySelector('[data-industry-map]').getAttribute('viewBox'),'0 0 900 580');assert.match(d.querySelector('[data-industry-comparison]').textContent,/2025.*24\.08%/);
 for(const row of config.data){const tr=d.querySelector(`[data-industry-row="${row.id}"][data-year="${row.year}"]`),bar=tr.querySelector('[data-industry-bar]');assert.equal(bar.style.width,`${row.values.mining.value}%`);for(const metric of config.metrics){const v=row.values[metric.id],cell=tr.querySelector(`[data-industry-cell="${metric.id}"]`);assert.equal(cell.dataset.status,v.status);assert.equal(cell.dataset.symbol,v.symbol);assert.equal(cell.dataset.vector,v.vector);assert.equal(Number(cell.dataset.value),v.value);assert.ok(cell.textContent.includes(v.value.toLocaleString('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2})));}}
 assert.equal(d.querySelector('[data-industry-row="Nunavut"][data-year="2025"] [data-industry-bar]').style.width,'46.9%');assert.equal(d.querySelector('[data-industry-row="Ontario"][data-year="2025"] [data-industry-bar]').style.width,'1.31%');
 for(const shape of d.querySelectorAll('[data-industry-province-shape]')){assert.equal(shape.getAttribute('role'),'button');assert.equal(shape.getAttribute('tabindex'),'0');assert.ok(shape.querySelector('title').textContent.includes('2025'));assert.equal(shape.getAttribute('fill-rule'),'evenodd');}
 assert.equal(d.querySelectorAll('[data-industry-example]').length,3);assert.equal(d.querySelectorAll('[data-industry-reading]:not([hidden])').length,1);assert.equal(d.querySelector('[data-industry-reading]:not([hidden])').dataset.industryReading,'mining');assert.equal(d.querySelector('.industry-table-details').open,false);assert.equal(d.querySelector('.industry-source-footer details').open,false);assert.ok(d.querySelector('[data-news-rail]'));
 const source=d.querySelector('#canada-industry-sources').textContent;assert.match(source,/Adapted from Statistics Canada.*36-10-0400-01.*reference years 2023, 2024 and 2025.*This does not constitute an endorsement/s);assert.match(source,/2026年5月1日.*2021.*EPSG:4326.*OGL–Canada/s);assert.match(d.querySelector('.industry-definitions').textContent,/石油・ガス採取.*鉱業・採石.*天然資源.*農林漁業.*円グラフ/s);assert.match(d.querySelector('noscript').textContent,/2025年.*全156値/s);
 for(const file of ['industry-selected.csv','manifest.json']){assert.ok(d.querySelector(`a[href$="${file}"]`));await access(`dist/assets/atlas/canada-industry-v1/${file}`);}
 }finally{await w.happyDOM.close();}
});

test('All 3 years, 3 mapped industries and 13 provinces retain correct official shares without maximum-value normalization',async()=>{
 const w=await page('',true);try{const d=w.document,q=s=>d.querySelector(s);for(const year of config.years)for(const metric of config.metrics.filter(m=>m.id!=='all')){change(w,'[data-industry-year]',year);change(w,'[data-industry-metric]',metric.id);assert.equal(q('#canada-industry-title').textContent,`${year}年、${metric.name}の州内GDP割合`);assert.equal(d.querySelectorAll('[data-industry-row]:not([hidden])').length,13);assert.equal(d.querySelectorAll('[data-industry-reading]:not([hidden])').length,1);assert.equal(q('[data-industry-reading]:not([hidden])').dataset.industryReading,metric.id);for(const p of config.provinces){change(w,'[data-industry-province]',p.id);const row=config.data.find(r=>r.year===year&&r.id===p.id),value=row.values[metric.id].value;assert.ok(q('[data-industry-comparison]').textContent.includes(p.name));assert.ok(q('[data-industry-comparison]').textContent.includes(value.toLocaleString('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'));assert.equal(q(`[data-industry-row="${p.id}"][data-year="${year}"] [data-industry-bar]`).style.width,`${value}%`);assert.equal(q('[data-industry-card-bar]').style.width,`${value}%`);assert.equal(q(`[data-industry-province-shape="${p.id}"]`).getAttribute('aria-pressed'),'true');assert.equal(q(`[data-industry-province-shape="${p.id}"] title`).textContent,q(`[data-industry-province-shape="${p.id}"]`).getAttribute('aria-label'));}assert.equal(d.querySelectorAll(`[data-industry-cell="${metric.id}"].is-current-metric`).length,39);}
 change(w,'[data-industry-province]','Ontario');change(w,'[data-industry-compare]','Quebec');assert.equal(d.querySelectorAll('[data-industry-card]:not([hidden])').length,2);assert.match(q('[data-industry-comparison]').textContent,/オンタリオ.*ケベック/s);change(w,'[data-industry-province]','Quebec');assert.equal(q('[data-industry-compare]').value,'');assert.equal(d.querySelectorAll('[data-industry-card]:not([hidden])').length,1);
 for(const [metric,province,compare] of [['mining','Alberta','Ontario'],['manufacturing','Ontario','Quebec'],['services','Ontario','British Columbia']]){q(`[data-industry-example="${metric}"]`).click();assert.equal(q('[data-industry-metric]').value,metric);assert.equal(q('[data-industry-province]').value,province);assert.equal(q('[data-industry-compare]').value,compare);}
 }finally{await w.happyDOM.close();}
});

test('Industry isolation, keyboard selection, zoom, history, reload and explicit save/restore preserve independent comparison choices',async()=>{
 const search='?year=2023&province=Ontario&compare=Quebec&metric=manufacturing&only=1&zoom=1&keep=yes',w=await page(search,true);let reload,stored;try{const d=w.document,q=s=>d.querySelector(s),visible=()=>[...d.querySelectorAll('[data-industry-province-shape]')].filter(s=>s.style.display!=='none');assert.equal(visible().length,2);assert.deepEqual(new Set(visible().map(s=>s.dataset.industryProvinceShape)),new Set(['Ontario','Quebec']));assert.equal([...d.querySelectorAll('[data-industry-province-label]')].filter(s=>s.style.display!=='none').length,2);assert.notEqual(q('[data-industry-map]').getAttribute('viewBox'),'0 0 900 580');assert.equal(q('[data-industry-focus]').getAttribute('aria-pressed'),'true');
 q('[data-industry-only]').checked=false;q('[data-industry-only]').dispatchEvent(new w.Event('change'));assert.equal(visible().length,13);q('[data-industry-province-shape="Alberta"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-industry-province]').value,'Alberta');assert.equal(new URL(w.location).searchParams.get('keep'),'yes');q('[data-industry-province-shape="British Columbia"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(q('[data-industry-province]').value,'British Columbia');q('[data-industry-reset]').click();assert.equal(q('[data-industry-map]').getAttribute('viewBox'),'0 0 900 580');assert.equal(visible().length,13);assert.equal(q('[data-industry-year]').value,'2023');assert.equal(q('[data-industry-metric]').value,'manufacturing');assert.equal(q('[data-industry-compare]').value,'Quebec');
 w.history.replaceState(null,'','?year=2024&province=Alberta&compare=Ontario&metric=mining&only=1&zoom=1');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-industry-year]').value,'2024');assert.equal(q('[data-industry-metric]').value,'mining');assert.equal(visible().length,2);reload=await page(w.location.search,true);assert.equal(reload.document.querySelector('[data-industry-province]').value,'Alberta');assert.equal(reload.document.querySelector('[data-industry-only]').checked,true);
 q('[data-industry-save]').click();const saved=w.localStorage.getItem('insight-journal:canada-industry:v1');assert.ok(saved.includes('year=2024'));assert.match(q('[data-industry-saved-status]').textContent,/保存/);change(w,'[data-industry-metric]','services');q('[data-industry-restore]').click();assert.equal(q('[data-industry-metric]').value,'mining');assert.match(q('[data-industry-saved-status]').textContent,/復元/);stored=await page('',true,null,saved);assert.equal(stored.document.querySelector('[data-industry-year]').value,'2025');stored.document.querySelector('[data-industry-restore]').click();assert.equal(stored.document.querySelector('[data-industry-year]').value,'2024');assert.equal(stored.document.querySelector('[data-industry-compare]').value,'Ontario');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();if(stored)await stored.happyDOM.close();}
});

test('Synthetic published zero, missing F and revision flags remain distinct in map colour, percent bars and comparisons',async()=>{
 const w=await page('?province=Alberta&compare=Ontario',true,cfg=>{cfg.data.find(r=>r.year===2025&&r.id==='Alberta').values.mining={value:0,status:'A',symbol:'r'};cfg.data.find(r=>r.year===2025&&r.id==='Ontario').values.mining={value:null,status:'F',symbol:''};});try{const d=w.document,zero=d.querySelector('[data-industry-row="Alberta"][data-year="2025"] [data-industry-bar]'),missing=d.querySelector('[data-industry-row="Ontario"][data-year="2025"] [data-industry-bar]');assert.equal(zero.style.width,'0%');assert.equal(missing.style.width,'0%');assert.equal(zero.parentElement.classList.contains('is-missing'),false);assert.equal(missing.parentElement.classList.contains('is-missing'),true);assert.notEqual(d.querySelector('[data-industry-province-shape="Alberta"]').getAttribute('fill'),d.querySelector('[data-industry-province-shape="Ontario"]').getAttribute('fill'));assert.equal(d.querySelector('[data-industry-province-shape="Ontario"]').getAttribute('fill'),'url(#industry-missing)');assert.match(d.querySelector('[data-industry-comparison]').textContent,/0\.00%.*A r.*欠損.*F/s);assert.equal([...d.querySelectorAll('[data-industry-card-bar]')][1].parentElement.classList.contains('is-missing'),true);
 }finally{await w.happyDOM.close();}
});

test('Industry nature links retain only validated comparison keys and have explicit local water/landform questions',async()=>{
 const w=await page('?year=2023&province=Ontario&compare=Quebec&metric=manufacturing&only=1&zoom=1&keep=yes&next=https://evil.example/',true);try{const d=w.document;for(const a of d.querySelectorAll('[data-industry-nature-link]')){const target=new URL(a.href),back=new URLSearchParams(target.searchParams.get('industryReturn'));assert.equal(target.origin,'https://example.com');assert.equal(target.pathname,`/insight-journal/${folder}/nature/`);assert.deepEqual(new Set(back.keys()),new Set(['year','province','metric','compare','only','zoom']));assert.equal(back.get('year'),'2023');assert.equal(back.get('province'),'Ontario');assert.equal(back.get('compare'),'Quebec');assert.equal(back.get('metric'),'manufacturing');assert.equal(back.has('keep'),false);assert.equal(back.has('next'),false);assert.equal(back.has('city'),false);assert.match(a.textContent,target.searchParams.get('view')==='landform'?/山地|内陸|地形/:/川|湖|沿岸|市場/);}
 const central=new URL(d.querySelector('[data-industry-nature-link*="St."]').href),coast=new URL(d.querySelector('[data-industry-nature-link*="Fraser"]').href);assert.equal(central.searchParams.get('city'),'ottawa');assert.equal(central.searchParams.get('water'),'St. Lawrence');assert.equal(central.searchParams.get('only'),'1');assert.equal(coast.searchParams.get('city'),'vancouver');assert.equal(coast.searchParams.get('water'),'Fraser');assert.equal(coast.searchParams.get('only'),'1');
 }finally{await w.happyDOM.close();}
});

test('Nature retains the selected official distribution, uses a separate map for landform and returns only validated industry state',async()=>{
 const source=await page('?year=2023&province=Ontario&compare=Quebec&metric=manufacturing&only=1&zoom=1',true);
 let nature;
 try{
  const target=new URL(source.document.querySelector('[data-industry-nature-link*="St."]').href);
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
