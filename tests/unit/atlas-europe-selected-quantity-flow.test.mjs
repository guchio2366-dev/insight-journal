import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const json=path=>JSON.parse(readFileSync(path,'utf8'));
const packet=json('src/data/atlas/europe/selected-quantity-flow.json');
const fao=json('public/assets/atlas/europe/farming-statistics-v1/statistics.json');
const sourceRoot='data-source/atlas/europe/quantity-flow-20261016/wits/';
const bundle=await build({entryPoints:['src/scripts/atlas-europe-selected-quantity-flow.ts'],bundle:true,write:false,format:'iife',globalName:'EuropeQuantity'});
const renderer=await build({entryPoints:['src/lib/atlas-europe-selected-quantity-flow.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const dataBundle=await build({entryPoints:['src/data/atlas/europe/selected-quantity-flow.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(dataBundle.outputFiles[0].text).toString('base64'));
const {renderEuropeSelectedQuantityFlow}=await import('data:text/javascript;base64,'+Buffer.from(renderer.outputFiles[0].text).toString('base64'));

test('Europe quantity packet regenerates offline and pins every retained input revision',()=>{
  const before=readFileSync('src/data/atlas/europe/selected-quantity-flow.json','utf8');
  execFileSync('python',['scripts/europe/prepare-selected-quantity-flow.py']);
  assert.equal(readFileSync('src/data/atlas/europe/selected-quantity-flow.json','utf8'),before);
  assert.equal(readFileSync('public/assets/atlas/europe/selected-quantity-flow-v1/statistics.json','utf8'),before);
  for(const source of packet.sources)assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),source.sha256,source.path);
  assert.equal(packet.records.length,7);
  assert.deepEqual(packet.records.filter(r=>r.kind==='calendar-quantity-comparison').map(r=>r.countryCode),['UKR','FRA','ITA','DEU']);
});

test('the published unselected European overview remains byte-identical to main',()=>{
  const component=readFileSync('src/components/atlas/EuropeVerifiedStatistics.astro','utf8');
  const overview=component.slice(component.indexOf('  <div data-eu-verified-overview>'),component.indexOf('  {topics.map'));
  assert.equal(createHash('sha256').update(overview).digest('hex'),'fd7323ed6e91e8c8c287ed2566e51f0e9f713591a7d37acf45b475bf75c087b7');
  const forestry=component.slice(component.indexOf('<section class="eu-verified-wood"'));
  assert.equal(createHash('sha256').update(forestry).digest('hex'),'c8667ed1be68515db33d9f7e3ad9b7c480c9b7eb788e71cceab182f21d630ad3');
});

test('four soybean comparisons retain same-year FAO World, both gross trade totals, all partners and null actual uses',()=>{
  const expected={UKR:[49,1.473],FRA:[52,-.029],ITA:[34,-.033],DEU:[46,.016]};
  for(const [code,[count,gap]] of Object.entries(expected)){
    const row=api.europeSelectedQuantityFlow(code,'soybean');
    const production=fao.countries[code].observations.find(row=>row[0]==='soybean-production'&&row[1]===2023);
    const world=fao.world.observations.find(row=>row[0]==='soybean-production'&&row[1]===2023);
    assert.equal(row.year,2023);assert.equal(row.unit,'t');assert.equal(row.productionRaw,production[2]);assert.equal(row.production,+production[2]);
    assert.equal(row.worldProductionRaw,world[2]);assert.equal(row.worldProduction,+world[2]);
    assert.equal(row.productionFlag,'A');assert.equal(row.worldFlag,'A');
    for(const [direction,key] of [['Import','imports'],['Export','exports']]){
      const table=json(sourceRoot+`${code}-${direction}-120100.json`);
      assert.equal(table.year,2023);assert.equal(table.classification,'HS1988/92 (H0)');assert.equal(table.productDescription,'Soya beans');
      assert.ok(table.rows.every(r=>r.unit==='Kg'));
      assert.equal(row[key],+table.rows.find(r=>r.partner==='World').quantityRaw/1000);
      if(direction==='Export')assert.deepEqual(row.partners,table.rows.filter(r=>r.partner!=='World').map(r=>({name:r.partner,value:+r.quantityRaw/1000})));
    }
    assert.equal(row.partners.length,count);assert.equal(row.partnerRoundingGap,gap);
    assert.ok(Math.abs(row.partners.reduce((sum,r)=>sum+r.value,0)-row.exports-gap)<1e-8);
    for(const key of ['actualDomesticUse','stockVariation','feedUse','crushUse','domesticOriginExports'])assert.equal(row[key],null,key);
    assert.ok(row.production+row.imports-row.exports>0);
  }
  const german=api.europeSelectedQuantityFlow('DEU','soybean');
  assert.ok(german.partners.some(p=>p.name==='Poland'),'same-region partners belong in national gross exports');
  assert.ok(german.partners.some(p=>p.name==='Bunkers'),'an original statistical category cannot become a guessed country');
});

test('WITS transcription preserves every displayed table row rather than just the top five',()=>{
  let text=['initial-discovery.txt','tables-1.txt','tables-2.txt','tables-3.txt'].map(file=>readFileSync(sourceRoot+file,'utf8')).join('\n');
  text=text.replace(/cite[^†]*†(.*?)/g,'$1').replace(/L\d+: ?/g,'').replaceAll('|',' ');
  for(const [code,name] of [['UKR','Ukraine'],['FRA','France'],['ITA','Italy'],['DEU','Germany']])for(const flow of ['Export','Import']){
    const pattern=new RegExp(`^\\s*${name}\\s+${flow}\\s+120100\\s+Soya beans\\s+2023\\s*(.+?)\\s+([\\d,]+\\.\\d+)\\s+([\\d,.]+)\\s+Kg\\s*$`);
    const rows=text.split('\n').map(line=>line.match(pattern)).filter(Boolean).map(m=>({partner:m[1],quantityRaw:m[3].replaceAll(',',''),unit:'Kg',value1000UsdRaw:m[2].replaceAll(',','')}));
    const allDisplayedRows=text.split('\n').filter(line=>new RegExp(`^\\s*${name}\\s+${flow}\\s+120100\\s+Soya beans\\s+2023`).test(line));
    assert.equal(rows.length,allDisplayedRows.length,'no displayed partner row with missing quantity is silently dropped');
    assert.deepEqual(json(sourceRoot+`${code}-${flow}-120100.json`).rows,rows,code+'/'+flow);
  }
});

test('national grain balances preserve independent uses, feed subsets, stocks and same-table World',()=>{
  const original=readFileSync('scripts/data/wasde0926.txt','utf8');
  for(const flow of packet.records.filter(r=>r.kind==='marketing-year-balance')){
    assert.ok(original.includes(flow.rawLine));assert.ok(original.includes(flow.worldRawLine));
    assert.equal(flow.year,'2024/25');assert.equal(flow.unit,'百万t');assert.equal(flow.partners,null);
    const columns=flow.rawLine.match(/\d+\.\d+/g).map(Number);
    assert.deepEqual(columns,[flow.beginningStocks,flow.production,flow.imports,flow.domesticSubset,flow.domesticUse,flow.exports,flow.endingStocks]);
    assert.equal(flow.worldProduction,flow.topic==='wheat'?799.10:1235.03);
    assert.ok(flow.domesticSubset<=flow.domesticUse);
    assert.ok(Math.abs(flow.production+flow.imports+flow.beginningStocks-flow.domesticUse-flow.exports-flow.endingStocks-flow.roundingGap)<1e-8);
    assert.notEqual(flow.domesticUse,flow.production-flow.exports);
  }
  assert.equal(api.europeSelectedQuantityFlow('UKR','wheat').domesticUse,8.5);
  assert.equal(api.europeSelectedQuantityFlow('GBR','wheat').imports,3.81);
  assert.equal(api.europeSelectedQuantityFlow('UKR','maize').exports,20.02);
});

test('quantity renderer orders production, domestic use and destinations and sorts the pie by quantity',()=>{
  const w=new Window();
  try{
    for(const flow of packet.records){
      w.document.body.innerHTML=renderEuropeSelectedQuantityFlow(flow);
      const columns=[...w.document.querySelectorAll('.agro-columns>section')];
      assert.deepEqual(columns.map(el=>el.dataset.agroStage),['production','use','destinations']);
      assert.match(w.document.body.textContent,new RegExp(flow.countryName));
      if(flow.kind==='calendar-quantity-comparison'){
        assert.match(columns[1].textContent,/生産＋輸入−輸出/);assert.match(columns[1].textContent,/在庫増減は未収録/);
        assert.match(columns[2].textContent,/欧州内・EU内の相手も含む/);
        assert.equal(columns[2].querySelectorAll('tbody tr').length,flow.partners.length);
        assert.match(columns[2].textContent,/丸め差/);
      }else{
        assert.match(columns[1].textContent,/期末在庫/);assert.match(columns[2].textContent,/未収録/);
        assert.equal(columns[2].querySelectorAll('.agro-partner-pie').length,0);
      }
    }
    w.document.body.innerHTML=renderEuropeSelectedQuantityFlow(api.europeSelectedQuantityFlow('UKR','soybean'));
    assert.match(w.document.querySelector('[data-agro-stage="destinations"] .agro-key li').textContent,/トルコ.*969,951/);
  }finally{w.happyDOM.abort();}
});

function setup({fetch:fetchOverride}={}){
  const w=new Window({url:'https://example.test/atlas/europe/agriculture/',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  w.structuredClone=structuredClone;
  w.document.body.innerHTML='<main><section data-eu-selected-quantity data-statistics-url="/europe-statistics.json" hidden><p data-eu-quantity-status></p><button data-eu-quantity-retry hidden></button><div data-eu-quantity-content></div></section></main>';
  const requests=[];
  w.fetch=async url=>{requests.push(String(url));return fetchOverride?fetchOverride(url,requests.length):new Response(JSON.stringify(packet));};
  const api=w.eval(bundle.outputFiles[0].text+'\nEuropeQuantity;');
  return {w,requests,controller:api.createEuropeSelectedQuantityStatistics(w.document.querySelector('main')),host:w.document.querySelector('[data-eu-selected-quantity]'),supports:api.supportsEuropeSelectedQuantityFlow,references:api.createEuropeQuantityReferences};
}

test('selection support excludes region overviews, Japan, unsupported products and explicitly different years',async()=>{
  const ui=setup(),selection={active:true,country:'FRA',topic:'soybean'};
  try{
    assert.equal(ui.supports(selection),true);assert.equal(ui.supports({...selection,year:2023}),true);
    for(const overrides of [{country:''},{country:'JPN'},{country:'ROU'},{topic:'wheat'},{topic:'crops'},{topic:'forest'},{year:2024},{active:false}])assert.equal(ui.supports({...selection,...overrides}),false,JSON.stringify(overrides));
    await ui.controller.update(selection);assert.equal(ui.host.dataset.ready,'true');assert.match(ui.host.textContent,/2023暦年/);
    for(const overrides of [{topic:'crops'},{country:'JPN'},{active:false},{year:2024}]){
      await ui.controller.update({...selection,...overrides});assert.equal(ui.host.hidden,true);assert.equal(ui.host.querySelector('[data-eu-quantity-content]').children.length,0);
      await ui.controller.update(selection);
    }
  }finally{await ui.w.happyDOM.abort();}
});

test('late quantity fetches cannot restore an old country or a deselected view',async()=>{
  const ui=setup();
  try{
    const first=ui.controller.update({active:true,country:'UKR',topic:'soybean'});
    const second=ui.controller.update({active:true,country:'FRA',topic:'soybean'});
    await Promise.all([first,second]);
    assert.equal(ui.host.querySelector('[data-eu-quantity-country]').dataset.euQuantityCountry,'FRA');
    const stale=ui.controller.update({active:true,country:'ITA',topic:'soybean'});
    await ui.controller.update({active:true,country:'',topic:'crops'});await stale;
    assert.equal(ui.host.hidden,true);assert.equal(ui.host.querySelector('[data-eu-quantity-content]').children.length,0);
  }finally{await ui.w.happyDOM.abort();}
});

test('national quantity loading is deferred, cached, and retryable after a real HTTP failure',async()=>{
  const ui=setup({fetch:async(_url,count)=>count===1?new Response('',{status:503}):new Response(JSON.stringify(packet))});
  try{
    await ui.controller.update({active:true,country:'',topic:'crops'});assert.equal(ui.requests.length,0);
    const selection={active:true,country:'FRA',topic:'soybean'};
    await ui.controller.update(selection);assert.equal(ui.host.querySelector('[data-eu-quantity-retry]').hidden,false);
    ui.host.querySelector('[data-eu-quantity-retry]').click();
    for(let index=0;index<100&&ui.host.dataset.ready!=='true';index++)await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(ui.host.dataset.ready,'true');assert.equal(ui.requests.length,2);
    await ui.controller.update({...selection,country:'ITA'});assert.equal(ui.requests.length,2);
    assert.equal(ui.host.querySelector('[data-eu-quantity-country]').dataset.euQuantityCountry,'ITA');
  }finally{await ui.w.happyDOM.abort();}
});

test('packet lookup returns fresh observations and does not invent regional or missing-product flows',()=>{
  const first=api.europeSelectedQuantityFlow('FRA','soybean');first.partners[0].value=-1;
  assert.ok(api.europeSelectedQuantityFlow('FRA','soybean').partners[0].value>0);
  for(const code of ['', 'EU27','Europe','JPN','RUS','ROU'])assert.equal(api.europeSelectedQuantityFlow(code,'soybean'),undefined);
  for(const topic of ['forest','pulp','barley','rice','overview'])assert.equal(api.europeSelectedQuantityFlow('UKR',topic),undefined);
});

test('previous quantities retain node identity and listeners and return to their exact original placement',async()=>{
  const ui=setup();
  try{
    const root=ui.w.document.createElement('main');
    root.innerHTML='<p>before</p><p data-eu-farm-quick-summary>Old 2024 quick summary</p><section data-eu-farm-numbers>National FAO series</section><p>between</p><section data-agro-statistics><button>Existing series</button></section><p>after</p><details data-eu-previous-quantity hidden><summary>Other period</summary><div data-eu-previous-quantity-content></div></details>';
    const original=root.innerHTML,node=root.querySelector('[data-agro-statistics]'),button=node.querySelector('button');let clicks=0;
    button.addEventListener('click',()=>clicks++);
    const preserve=ui.references(root);
    preserve(true);preserve(true);
    assert.equal(root.querySelectorAll('[data-agro-statistics]').length,1);
    assert.equal(node.closest('details').hidden,false);assert.equal(node.closest('details').open,false);
    button.click();assert.equal(clicks,1);
    preserve(false);assert.equal(root.innerHTML,original);assert.equal(root.querySelector('[data-agro-statistics]'),node);
    button.click();assert.equal(clicks,2);
  }finally{await ui.w.happyDOM.abort();}
});
