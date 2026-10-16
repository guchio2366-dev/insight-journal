import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Window} from 'happy-dom';
import {stop} from 'esbuild';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const model=JSON.parse(readFileSync('src/data/atlas/canada/agro-statistics-20261016.json'));
const data=JSON.parse(readFileSync('public/assets/atlas/regional-production-statistics-v1/statistics.json'));
const lib=await import('data:text/javascript;base64,'+Buffer.from(await bundleCanadaSource('src/lib/atlas-canada-agro-statistics.ts',{format:'esm',platform:'node'})).toString('base64'));
const controller=await bundleCanadaSource('src/scripts/atlas-canada-agro-statistics.ts',{globalName:'CanadaStats'});
const forestry=await import('data:text/javascript;base64,'+Buffer.from(await bundleCanadaSource('src/lib/atlas-canada-forestry.ts',{format:'esm',platform:'node'})).toString('base64'));
after(()=>stop());

test('only the three valid forest products survive a local nature comparison return',()=>{
 for(const product of ['roundwood','sawnwood','paper-pulp','unknown','https://example.net']){
  const source=new URL('https://example.test/forestry/?forestProduct='+encodeURIComponent(product)),state=forestry.readCanadaForestryState(source,[2024],[]);
  const target=forestry.canadaForestryComparisonUrl(source,new URL('https://example.test/nature/'),state);
  assert.equal(new URLSearchParams(target.searchParams.get('forestryReturn')).get('forestProduct'),forestry.isCanadaForestryProduct(product)?product:null);
 }
});

test('Canada original official table extracts are hashed and deterministically reproduce adopted observations',()=>{
 for(const source of model.sources){assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),source.sha256);assert.equal(source.kind,'official-web-text-extract-not-original-file');}
 const before=readFileSync('src/data/atlas/canada/agro-statistics-20261016.json');
 execFileSync('python3',['scripts/prepare-canada-agro-statistics.py']);
 assert.deepEqual(readFileSync('src/data/atlas/canada/agro-statistics-20261016.json'),before);
 for(const corruption of ['unit','missing-partner'])assert.throws(()=>execFileSync('python3',['-c',`
from pathlib import Path
from unittest.mock import patch
import runpy
original=Path.read_text
def altered(path,*args,**kwargs):
 text=original(path,*args,**kwargs)
 if path.name=='wits-soybean-exports-2024.txt':
  if '${corruption}'=='unit':return text.replace('| Kg','| m³')
  return '\\n'.join(line for line in text.splitlines() if '| China |' not in line)
 return text
with patch.object(Path,'read_text',altered):runpy.run_path('scripts/prepare-canada-agro-statistics.py')
`],{stdio:'pipe'}),/unit mismatch|Incomplete partner extraction/);
 assert.deepEqual(readFileSync('src/data/atlas/canada/agro-statistics-20261016.json'),before,'invalid raw quantities never overwrite the adopted dataset');
 assert.deepEqual(Object.keys(model.aafc),['wheat','corn','canola','soybeans','lentils']);
 for(const flow of Object.values(model.aafc)){
  assert.match(flow.rawLine,/^2024-2025 /);assert.doesNotMatch(flow.rawLine,/2025-2026|2026-2027/);
  assert.equal(flow.unit,'千t');assert.equal(flow.reexports,null);assert.equal(flow.domesticOriginUse,null);
  assert.equal(flow.actualDomesticFoodConsumption,null);assert.equal(flow.exportDestinations,null);
  assert.equal(flow.totalSupply-flow.production-flow.imports,flow.beginningStocksDerived);
  assert.equal(flow.totalSupply-flow.domesticUse-flow.exports-flow.endingStocks,flow.reportedBalanceGap);
 }
 assert.equal(model.aafc.canola.production,19239);assert.equal(model.aafc.canola.domesticUse,11619);
 assert.equal(model.aafc.canola.exports,9379);assert.equal(model.aafc.canola.reportedBalanceGap,0);
 assert.equal(model.aafc.soybeans.reportedBalanceGap,98);assert.equal(model.aafc.corn.reportedBalanceGap,-1);
 assert.equal(model.aafc.corn.periodStart,'2024-09-01');assert.equal(model.aafc.lentils.periodStart,'2024-08-01');
});

test('complete public WITS partner quantities preserve World, gross trade, original units, zero and discrepancies',()=>{
 for(const [id,count,world,gap] of [['soybean',59,5133240000,4484],['rapeseed',26,8730940000,-3303],['coniferous-sawnwood',82,31451200,15]]){
  const trade=model.calendarTrade[id];assert.equal(trade.partners.length,count);assert.equal(trade.worldQuantity,world);
  assert.equal(trade.partnerRoundingGap,gap);assert.equal(trade.gross,true);assert.equal(trade.classification,'HS 1988/92 (H0)');
  assert.equal(trade.partners.reduce((sum,p)=>sum+p.quantity,0)-world,gap);
  assert.equal(new Set(trade.partners.map(p=>p.name)).size,count);
  assert.ok(trade.partners.some(p=>p.name==='United States'));assert.ok(trade.partners.every(p=>p.name!=='Canada'&&p.name!=='World'));
  const parts=lib.canadaTradeParts(trade);assert.equal(parts.length,6);
  assert.equal(parts.reduce((sum,p)=>sum+p.quantity,0),world+gap,'other is real remaining rows, never World minus top five');
 }
 const soy=lib.canadaTradeParts(model.calendarTrade.soybean);
 assert.deepEqual(soy.slice(0,5).map(p=>p.name),['China','Iran, Islamic Rep.','Algeria','Japan','United States'],'quantity sorting differs from money sorting');
 assert.equal(model.calendarTrade['coniferous-sawnwood'].unit,'m³');
 assert.equal(model.calendarTrade['coniferous-sawnwood'].partners.filter(p=>p.quantity===0).length,2);
 assert.equal(model.soybeanImports.worldQuantityKg,300486000);assert.equal(model.soybeanImports.includesReturningCanadaOriginKg,1152);
});

test('same-calendar soybean flow uses FAO production/World and kg→t gross trade without inventing actual use',()=>{
 const w=new Window();try{
  w.document.body.innerHTML=lib.renderCanadaAgro(data,'soybeans');const d=w.document;
  assert.equal(d.querySelectorAll('.agro-columns>section').length,3);
  const main=d.querySelector('.agro-columns'),left=main.querySelector('[data-agro-stage="production"]'),use=main.querySelector('[data-agro-stage="use"]');
  assert.match(left.textContent,/7,568,013/);assert.match(left.textContent,/397,671,688.56/);assert.match(left.textContent,/1.9%/);
  assert.match(use.textContent,/2,735,259/);assert.match(use.textContent,/5,133,240/);assert.match(use.textContent,/300,486/);
  assert.match(use.textContent,/実際の国内消費.*ではありません/);assert.match(use.textContent,/輸入品・再輸出・在庫/);
  const reference=use.querySelector('.agro-other-reference');assert.ok(reference);assert.equal(reference.open,false);
  assert.match(reference.textContent,/98 千t/);assert.equal(reference.querySelector('.agro-band'),null,'98 kt discrepancy cannot become a balanced allocation');
  assert.match(d.body.textContent,/Canada.*1.152 t/);assert.match(d.body.textContent,/全59相手/);assert.match(d.body.textContent,/4.484 t/);
 }finally{w.happyDOM.close();}
});

test('crop-year uses and forest processing stages remain separate, with unavailable values explicit',()=>{
 const w=new Window();try{
  w.document.body.innerHTML=lib.renderCanadaAgro(data,'lentils');assert.match(w.document.body.textContent,/2024\/25/);assert.match(w.document.body.textContent,/世界分母は未収録/);assert.equal(w.document.querySelector('[data-agro-stage="production"] .agro-world-pie'),null);
  w.document.body.innerHTML=lib.renderCanadaAgro(data,'canola');const ref=w.document.querySelector('[data-agro-stage="destinations"] details');assert.equal(ref.open,false);assert.match(ref.textContent,/期間・範囲が異なります/);
  for(const [id,share,unit] of [['roundwood',null,'m³'],['sawnwood',8,'m³'],['paper-pulp',7,'t']]){
   w.document.body.innerHTML=lib.renderCanadaAgro(data,id);assert.match(w.document.body.textContent,new RegExp(`生産量：未収録（${unit}）`));
   if(share!==null)assert.match(w.document.body.textContent,new RegExp(`約${share}%`));
   assert.equal(w.document.querySelector('[data-agro-stage="use"] .agro-band'),null);
  }
  w.document.body.innerHTML=lib.renderCanadaAgro(data,'sawnwood');const forestRef=w.document.querySelector('[data-agro-stage="destinations"] details');assert.equal(forestRef.open,false);assert.match(forestRef.textContent,/針葉樹部分集合/);assert.match(forestRef.textContent,/31,451,200 m³/);assert.match(forestRef.textContent,/89.21%/);
  assert.equal(lib.renderCanadaAgro(data,'invented'), '');
 }finally{w.happyDOM.close();}
});

test('Canada rapeseed is supplemented with same-edition USDA seed columns and distinct missing beginning stocks',()=>{
 const flow=model.usdaRapeseed;
 assert.equal(flow.production,19239);assert.equal(flow.worldProduction,86275);assert.equal(flow.imports,131);
 assert.equal(flow.domesticUse,11552);assert.equal(flow.exports,9387);assert.equal(flow.endingStocks,1597);
 assert.equal(flow.beginningStocks,null);assert.equal(flow.stockVariation,null);assert.equal(flow.exportDestinations,null);
 const raw=readFileSync('data-source/atlas/canada/agro-statistics-20261016/usda-oilseeds-202610-web-extract.txt','utf8');
 for(const [key,line] of Object.entries(flow.rawLines)){
  assert.ok(raw.includes(line));const values=line.replace(/^(?:Canada \(Aug-Jul\)|World Total)\s+/,'').split(/\s+/).map(n=>Number(n.replaceAll(',','')));
  assert.equal(values.length,9);assert.equal(flow[key],values[6],'Oilseed/Rapeseed 2024/25 column, never Meal or Oil');
 }
 const w=new Window();try{
  w.document.body.innerHTML=lib.renderCanadaAgro(data,'canola');const production=w.document.querySelector('[data-agro-stage="production"]'),use=w.document.querySelector('[data-agro-stage="use"]');
  assert.match(production.textContent,/86,275/);assert.match(production.textContent,/22.3%/);
  const top=use.cloneNode(true);top.querySelectorAll('details').forEach(d=>d.remove());assert.match(top.textContent,/11,552.*9,387/s);assert.match(top.textContent,/期首在庫.*逆算しません/);
  assert.doesNotMatch(top.textContent,/11,619|9,379/);assert.match(use.querySelector('.agro-other-reference').textContent,/11,619.*9,379/s);
  assert.match(w.document.querySelector('[data-agro-stage="destinations"]').textContent,/同じ2024\/25年度.*未収録/);
 }finally{w.happyDOM.close();}
});

test('Canada selection, return, invalid routes, forestry choices and chicken products preserve the unselected baseline',()=>{
 const make=(forest=false)=>{
  const w=new Window({url:'https://example.com/canada/agriculture/',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  w.document.body.innerHTML=`<article ${forest?'data-canada-forestry':'data-canada-agriculture'} data-canola-reading-mode="overview"><section data-agro-statistics>baseline</section><div data-canada-selected-agro data-forest="${forest}" data-default-product="">${forest?'<select data-canada-forest-product><option value="">select</option><option value="sawnwood">sawnwood</option></select>':''}<section data-canada-selected-statistics hidden><h2 data-canada-agro-heading></h2><label data-canada-chicken-product hidden><select><option value="chicken">chicken</option><option value="eggs">eggs</option></select></label><div data-canada-agro-content></div></section>${['canola','soybeans','corn','chicken','eggs','sawnwood'].map(id=>`<template data-canada-agro-template="${id}" data-label="${id}"><p>${id}</p></template>`).join('')}</div></article>`;
  w.eval(controller+';CanadaStats.initCanadaSelectedAgroStatistics(document.querySelector("[data-canada-selected-agro]"));');return w;
 };
 const w=make();try{
  const root=w.document.querySelector('article'),base=root.querySelector('[data-agro-statistics]'),selected=root.querySelector('[data-canada-selected-statistics]');
  assert.equal(base.hidden,false);assert.equal(selected.hidden,true);assert.equal(base.textContent,'baseline');
  const event=product=>root.dispatchEvent(new w.CustomEvent('canada-agro-selection',{detail:{product}}));
  event('soybeans');assert.equal(base.hidden,true);assert.equal(selected.hidden,false);assert.match(selected.textContent,/soybeans/);
  event('corn');assert.match(selected.textContent,/corn/);assert.doesNotMatch(selected.textContent,/soybeans/);
  event('chicken');const select=selected.querySelector('select');select.value='eggs';select.dispatchEvent(new w.Event('change'));assert.match(selected.textContent,/eggs/);
  event(null);assert.equal(base.hidden,false);assert.equal(selected.hidden,true);assert.equal(base.textContent,'baseline');
  root.dataset.canolaReadingMode='selected';root.dispatchEvent(new w.Event('canada-agro-reading-mode'));assert.match(selected.textContent,/canola/);
  root.dataset.canolaReadingMode='overview';event('invalid');assert.equal(selected.hidden,true);
  w.history.replaceState(null,'','?agriFocus=soybeans');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.match(selected.textContent,/soybeans/);
 }finally{w.happyDOM.close();}
 const forest=make(true);try{const select=forest.document.querySelector('[data-canada-forest-product]');select.value='sawnwood';select.dispatchEvent(new forest.Event('change'));assert.equal(new URL(forest.location.href).searchParams.get('forestProduct'),'sawnwood');assert.equal(forest.document.querySelector('[data-canada-selected-statistics]').hidden,false);select.value='';select.dispatchEvent(new forest.Event('change'));assert.equal(forest.document.querySelector('[data-agro-statistics]').hidden,false);}finally{forest.happyDOM.close();}
});
