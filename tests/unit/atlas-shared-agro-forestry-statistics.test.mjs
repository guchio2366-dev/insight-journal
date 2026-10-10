import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
const json=path=>JSON.parse(readFileSync(path));
async function bundled(path){const result=await build({entryPoints:[fileURLToPath(new URL('../../'+path,import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const api=await bundled('src/lib/atlas-shared-world-statistics.ts');
const panel=await bundled('src/scripts/atlas-asia-farming-panel.ts');
const asia=json('public/assets/atlas/asia-farming-v1/statistics.json');
const europe=json('public/assets/atlas/europe/farming-statistics-v1/statistics.json');
const shared=json('src/data/atlas/shared-world-statistics.json');
after(()=>stop());

test('every Russia forestry value and denominator matches the retained publisher row',()=>{
 const data=json('src/data/atlas/russia-forestry-statistics.json');
 assert.equal(data.m49,643);assert.equal(data.observations.length,30);
 for(const row of data.observations){
  const own=europe.countries.RUS.observations.find(r=>r[0]===row.measureId&&r[1]===row.year);
  const total=europe.world.observations.find(r=>r[0]===row.measureId&&r[1]===row.year);
  assert.equal(row.rawValue,own[2]);assert.equal(row.flag,own[4]);assert.equal(row.unit,own[3]);
  assert.equal(row.worldRawValue,total[2]);assert.equal(row.worldFlag,total[4]);
  const expected=Number(own[2])/Number(total[2])*100;
  assert.ok(Math.abs(row.worldShare-expected)<=Math.abs(expected)*Number.EPSILON*4);
 }
 assert.equal(data.observations.find(r=>r.measureId==='roundwood-production'&&r.year===2024).rawValue,'205498000.000000');
});

test('shared joins refuse different releases, units, missing flags and nonfinite values; published zero remains zero',()=>{
 const row=asia.countries.JPN.observations.find(r=>r.domain==='Production_Crops_Livestock'&&r.item==='15'&&r.elementCode==='5510'&&r.year===2024);
 const result=api.farmWorldComparison(asia,row);assert.ok(result);assert.equal(result.share,row.value/result.value*100);
 for(const flag of ['M','L'])assert.equal(api.farmWorldComparison(asia,{...row,flag}),null);
 for(const value of [null,NaN,Infinity,-1])assert.equal(api.farmWorldComparison(asia,{...row,value}),null);
 assert.equal(api.farmWorldComparison(asia,{...row,unit:'1000 t'}),null);
 assert.equal(api.farmWorldComparison({...asia,inputs:asia.inputs.map(s=>({...s,sha256:'different'}))},row),null);
 assert.equal(api.farmWorldComparison(asia,{...row,value:0}).share,0);
 assert.equal(api.farmWorldComparison(asia,{...row,flag:'E'}).share,result.share);
 assert.ok(!Object.keys(shared.world).some(key=>key.includes(':5616:')||key.includes(':5916:')),'a production denominator is not reused for imports/exports');
});

test('Oceania beef and raw cow milk match the retained 2024 source and separate World denominators',()=>{
 const data=json('src/data/atlas/oceania-livestock-production.json');
 const rows=json('data-source/atlas/livestock/faostat-qcl-2024-extract.json');
 assert.equal(data.series.length,2);
 for(const series of data.series){
  assert.equal(series.year,2024);assert.equal(series.unit,'t');assert.equal(series.elementCode,'5510');
  const total=rows.find(r=>r['Area Code']==='5000'&&r['Item Code']===series.itemCode&&r.Year==='2024');
  assert.equal(series.worldRawValue,total.Value);assert.equal(series.worldFlag,total.Flag);
  for(const country of series.countries){
   const original=rows.find(r=>Number(r['Area Code (M49)'].replace("'",''))===country.m49&&r['Item Code']===series.itemCode&&r.Year==='2024');
   assert.equal(country.rawValue,original.Value);assert.equal(country.flag,original.Flag);
   const expected=Number(original.Value)/Number(total.Value)*100;
   assert.ok(Math.abs(country.worldShare-expected)<=expected*Number.EPSILON*4);
  }
 }
 assert.equal(data.series.find(s=>s.itemCode==='882').countries.find(c=>c.code==='NZL').rawValue,'21531000.000000');
 assert.match(data.limits[0],/no 2015/);
});

test('Asia forestry and livestock outputs keep product/element definitions separate',()=>{
 const forest=panel.farmSeries('forest',undefined,asia.countries.JPN.observations);
 assert.equal(forest.length,7);
 for(const series of forest){assert.ok(new Set(series.rows.map(r=>r.item)).size<=1);assert.ok(new Set(series.rows.map(r=>r.elementCode)).size<=1);}
 assert.ok(forest.some(s=>s.title==='製材の輸入量'&&s.rows.some(r=>r.year===2024)));
 const cattle=panel.farmSeries('cattle',{kind:'livestock',faoItem:866},asia.countries.JPN.observations);
 assert.deepEqual(cattle.map(s=>s.rows[0].item),['866','867','882']);
 assert.equal(cattle[0].rows[0].unit,'An');assert.equal(cattle[1].rows[0].unit,'t');
});

test('existing country panel displays world denominators without treating absent years as zero',()=>{
 const window=new Window();globalThis.document=window.document;
 window.document.body.innerHTML='<div data-farming-extra></div><div data-farming-map-method></div><h3 data-farming-statistics-title></h3><p data-farming-statistics-definition></p><div data-farming-statistics-tables></div><p data-farming-statistics-status></p><h2 data-farming-title></h2><p data-farming-takeaway></p><p data-farming-definition></p><p data-farming-coverage></p><p data-farming-method></p><p data-farming-map-source></p><div data-farming-reference></div>';
 panel.renderAsiaFarmingPanel(window.document.body,'south-central-asia','forest',undefined,{code:'IND',name:'インド'},asia);
 const history=window.document.querySelector('.asia-stat-history');assert.equal(history.open,false);
 const tables=[...history.querySelectorAll('table')];assert.equal(tables.length,7);
 assert.equal(window.document.querySelector('.asia-stat-current tbody').querySelectorAll('tr').length,7);
 assert.equal(window.document.querySelectorAll('.asia-stat-chart').length,1);
 const production=tables.find(t=>t.querySelector('caption').textContent.startsWith('製材の生産量'));
 assert.match(production.textContent,/世界値・区分/);assert.match(production.textContent,/世界生産比/);
 const imports=tables.find(t=>t.querySelector('caption').textContent.startsWith('製材の輸入量'));
 assert.equal(imports.querySelectorAll('thead th').length,2,'imports have no production-share column');
 assert.match(window.document.body.textContent,/別製品/);assert.match(window.document.body.textContent,/自給率ではありません/);
 const missing={...asia,countries:{IND:{...asia.countries.IND,observations:asia.countries.IND.observations.filter(r=>r.year!==2024)}}};
 panel.renderAsiaFarmingPanel(window.document.body,'south-central-asia','forest',undefined,{code:'IND',name:'インド'},missing);
 const last=window.document.querySelector('.asia-stat-history table tbody tr:last-child');assert.match(last.textContent,/未掲載/);assert.match(last.textContent,/未収録/);
 window.happyDOM.abort();delete globalThis.document;
});


test('compact cattle summary keeps all available years, preserves missing source notes and switches dimensions',()=>{
 const window=new Window();globalThis.document=window.document;
 window.document.body.innerHTML='<div data-farming-extra></div><div data-farming-map-method></div><h3 data-farming-statistics-title></h3><p data-farming-statistics-definition></p><div data-farming-statistics-tables></div><p data-farming-statistics-status></p><h2 data-farming-title></h2><p data-farming-takeaway></p><p data-farming-definition></p><p data-farming-coverage></p><p data-farming-method></p><p data-farming-map-source></p><div data-farming-reference></div>';
 const original=asia.countries.IND.observations;
 const data={...asia,countries:{IND:{...asia.countries.IND,observations:original.map(row=>row.item==='867'&&row.year===2018?{...row,note:'source-specific missing note'}:row)}}};
 panel.renderAsiaFarmingPanel(window.document.body,'south-central-asia','cattle',{kind:'livestock',faoItem:866},{code:'IND',name:'インド'},data);
 const current=window.document.querySelector('.asia-stat-current');
 assert.equal(current.querySelectorAll('tbody tr').length,2);assert.match(current.textContent,/194,753,479 頭/);assert.match(current.textContent,/135,000,000 t/);
 assert.equal(window.document.querySelectorAll('.asia-stat-chart').length,1);
 const missing=window.document.querySelector('.asia-stat-unavailable');assert.match(missing.textContent,/牛肉/);assert.match(missing.textContent,/2015–2024年は未収録/);assert.match(missing.textContent,/資料上の欠測（M）/);assert.match(missing.textContent,/0を意味しません/);
 const history=window.document.querySelector('.asia-stat-history');assert.equal(history.open,false);assert.equal(history.querySelectorAll('tbody tr').length,20);
 assert.ok(![...history.querySelectorAll('caption')].some(c=>c.textContent.includes('牛肉')),'all-missing series has no ten-row empty table');
 assert.match(history.textContent,/2018年.*source-specific missing note/);assert.match(history.textContent,/2015・2016・2017・2019/);
 const select=window.document.querySelector('.asia-stat-trend-picker select');assert.equal(select.options.length,2);
 assert.match(window.document.querySelector('.asia-stat-chart').getAttribute('aria-label'),/飼養頭数/);
 select.value='1';select.dispatchEvent(new window.Event('change'));
 const chart=window.document.querySelector('.asia-stat-chart');assert.match(chart.getAttribute('aria-label'),/牛の生乳/);assert.match(chart.lastElementChild.title,/2024: 135,000,000 t/);
 assert.equal(chart.children.length,10);assert.equal(current.querySelectorAll('tbody tr').length,2);
 window.happyDOM.abort();delete globalThis.document;
});

test('compact summary never replaces missing 2024 with an older value and published zero stays in the source table',()=>{
 const window=new Window();globalThis.document=window.document;
 window.document.body.innerHTML='<div data-farming-extra></div><div data-farming-map-method></div><h3 data-farming-statistics-title></h3><p data-farming-statistics-definition></p><div data-farming-statistics-tables></div><p data-farming-statistics-status></p><h2 data-farming-title></h2><p data-farming-takeaway></p><p data-farming-definition></p><p data-farming-coverage></p><p data-farming-method></p><p data-farming-map-source></p><div data-farming-reference></div>';
 const rows=asia.countries.IND.observations.filter(row=>row.item==='1872'&&row.elementCode==='5616').map(row=>row.year===2024?{...row,value:null,flag:'M'}:row.year===2023?{...row,value:0,flag:'A'}:row);
 panel.renderAsiaFarmingPanel(window.document.body,'south-central-asia','forest',undefined,{code:'IND',name:'インド'},{...asia,countries:{IND:{...asia.countries.IND,observations:rows}}});
 const current=window.document.querySelector('.asia-stat-current');assert.equal(current.querySelectorAll('tbody tr').length,1);assert.match(current.textContent,/未掲載/);assert.doesNotMatch(current.textContent,/0 m³/);assert.match(current.textContent,/生産比の対象外/);
 const history=window.document.querySelector('.asia-stat-history table');assert.equal(history.querySelectorAll('tbody tr').length,10);assert.equal(history.querySelectorAll('tbody tr')[8].querySelector('td').firstChild.textContent,'0');assert.match(history.lastElementChild.lastElementChild.textContent,/未掲載/);
 const chart=window.document.querySelector('.asia-stat-chart');assert.match(chart.children[8].title,/2023: 0 m³/);assert.match(chart.children[9].title,/2024: 未掲載/);assert.equal(chart.children[9].style.background,'transparent');
 window.happyDOM.abort();delete globalThis.document;
});
