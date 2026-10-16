import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import trade from '../../src/data/atlas/west-asia-sau-dates-trade-2023.json' with {type:'json'};
import gain from '../../src/data/atlas/west-asia-turkiye-gain-2023-24.json' with {type:'json'};
const data=JSON.parse(readFileSync('public/assets/atlas/west-asia-v1/data.json','utf8'));
const compile=async path=>{const result=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));};
const api=await compile('src/lib/atlas-west-asia-agro-statistics.ts');
const {agroTopicSeries}=await compile('src/lib/atlas-agro-statistics.ts');
const dom=fn=>async()=>{const w=new Window();try{await fn(w.document);}finally{await w.happyDOM.close();}};

test('the five regional animal-product IDs resolve to the retained mass series, not livestock counts',()=>{
 const mappings={'cattle-milk':['cattle-milk','882'],'buffalo-milk':['buffalo-milk','951'],'hen-eggs':['chicken-eggs','1062'],'chicken-meat':['chicken-meat','1058'],'cattle-meat':['cattle-meat','867']};
 for(const [topic,[id,item]] of Object.entries(mappings)){
  assert.deepEqual(agroTopicSeries(api.westAgroTopic(topic)),[id]);
  const slice=JSON.parse(gunzipSync(readFileSync(`public/assets/atlas/regional-production-statistics-v1/by-series/${id}.json.gz`)));
  const record=Object.entries(slice.countries).find(([code,c])=>data.countries.some(row=>row.code===code)&&c.series.some(s=>s.id===id));assert.ok(record,topic);
  const series=record[1].series.find(s=>s.id===id);assert.equal(series.domain,'QCL');assert.equal(series.item,item);assert.equal(series.unit,'t');assert.equal(series.element,'5510');
 }
 assert.equal(api.westAgroTopic('wheat-rainfed'),'wheat');
 assert.equal(api.westAgroTopic('farming-overview'),'farming-overview');
 assert.equal(api.westAgroTopic('forest'),'forest');
});

test('all 20 date/olive selections show the exact retained production with missing World and no fabricated flow',dom(document=>{
 for(const topic of ['dates','olives'])for(const country of data.countries){
  const crop=api.westCropData(data,topic),series=crop.countries[country.code].series[0],row=series.rows.find(r=>r.year===2024);
  const original=data.agriculture.countries[country.code]?.observations.find(r=>r.domain==='Production_Crops_Livestock'&&r.item===series.item&&r.elementCode==='5510'&&r.year===2024&&r.unit==='t');
  assert.equal(row.value,original?.value??null);assert.equal(row.flag,original?.flag??'');assert.equal(row.worldValue,null);
  const root=document.createElement('section');root.innerHTML=api.renderWestSelectedCrop(data,topic,country.code);
  assert.deepEqual([...root.querySelectorAll('.agro-columns>section')].map(s=>s.dataset.agroStage),['production','use','destinations']);
  const left=root.querySelector('[data-agro-stage=production]');assert.ok(left.textContent.includes(row.value===null?'未収録':row.value.toLocaleString('ja-JP',{maximumFractionDigits:2})));
  assert.equal(root.querySelector('.agro-world-pie'),null);assert.equal(root.querySelector('.agro-track'),null);assert.equal(root.querySelector('.agro-trend'),null);
  assert.equal(root.querySelector('.agro-other-reference'),null,'empty shared reference slots are omitted in the regional renderer');
  assert.equal(root.querySelectorAll('[data-west-dates-trade]').length,topic==='dates'&&country.code==='SAU'?1:0);
  assert.doesNotMatch(root.innerHTML,/NaN|Infinity|undefined/);
 }
 const copied=structuredClone(data),row=copied.agriculture.countries.SAU.observations.find(r=>r.item==='577'&&r.elementCode==='5510'&&r.year===2024);row.value=0;
 assert.equal(api.westCropData(copied,'dates').countries.SAU.series[0].rows.at(-1).value,0);
 row.value=null;assert.equal(api.westCropData(copied,'dates').countries.SAU.series[0].rows.at(-1).value,null);
 assert.equal(api.renderWestSelectedCrop(data,'dates',''),'', 'no replacement for the unselected overview');
}));

test('the selected regional production subtotal reports its actual coverage and does not reconstruct World',()=>{
 for(const topic of ['dates','olives']){
  const total=api.westCropProduction(data,topic,2024),expected=data.countries.flatMap(c=>data.agriculture.countries[c.code].observations.filter(r=>r.domain==='Production_Crops_Livestock'&&r.item===total.item&&r.elementCode==='5510'&&r.year===2024&&r.unit==='t'&&Number.isFinite(r.value)&&r.value>=0));
  assert.equal(total.sum,expected.reduce((s,r)=>s+r.value,0));assert.equal(total.reported,expected.length);assert.equal(total.total,20);assert.equal(total.missing.length,20-expected.length);assert.equal(total.world,undefined);
 }
 assert.equal(api.westCropProduction(data,'dates',1900).reported,0);
 assert.equal(api.westCropProduction(data,'dates',1900).missing.length,20);
});

test('WITS transcription preserves all partners, gross World, units and signed discrepancies',dom(document=>{
 assert.equal(trade.exports.partners.length,118);assert.equal(trade.imports.partners.length,16);
 assert.equal(trade.exports.worldQuantityKg,101911000);assert.equal(trade.imports.worldQuantityKg,222033);
 assert.equal(trade.exports.partners.reduce((s,r)=>s+r.quantityKg,0)-trade.exports.worldQuantityKg,-64);
 assert.equal(trade.imports.partners.reduce((s,r)=>s+r.quantityKg,0)-trade.imports.worldQuantityKg,2);
 assert.equal(trade.exports.partners[0].partner,'United Arab Emirates');assert.equal(trade.exports.partners[0].quantityKg,30523200);
 assert.equal(trade.exports.partners.find(r=>r.partner==='India').quantityKg,3407180);
 assert.equal(trade.classification,'HS 1988/92 (H0)');assert.equal(trade.unit,'Kg');
 const summary=api.westDatesTradeSummary();
 assert.ok(Math.abs(summary.internal+summary.external+summary.unallocated-summary.returned)<1e-9);
 assert.equal(summary.unallocated,.664);assert.equal(summary.gap,-.064);assert.ok(summary.internal>summary.external);
 assert.deepEqual(new Set(Object.values(api.westWitsInternalM49)),new Set(data.countries.map(c=>String(data.agriculture.countries[c.code].m49).padStart(3,'0'))));
 const root=document.createElement('section');root.innerHTML=api.renderWestDatesTrade();
 assert.equal(root.firstElementChild.open,false);assert.equal(root.querySelectorAll('tbody tr').length,118);
 assert.match(root.textContent,/全国対World総輸出.*近隣国も含み/s);assert.match(root.textContent,/地域全体の域外輸出ではありません/);assert.match(root.textContent,/相手行合計−World：-0.064 t/);
 assert.match(root.textContent,/国内消費・輸出／生産比を算出しません/);
 assert.equal(root.querySelectorAll('tbody tr').item(0).lastElementChild.textContent,'域内（M49 784）');
}));

test('country FBS references retain signed stocks and residuals, missing tourism, raw-file limits and rounding',dom(document=>{
 for(const [code,stock,gap,residual] of [['ARM',68,0,-91],['OMN',-73,0,-5],['TUR',4188,-1,-10]]){
  const root=document.createElement('section');root.innerHTML=api.renderWestWheatExample(data,code);
  assert.equal(root.firstElementChild.open,false);assert.equal(root.firstElementChild.dataset.westNationalFbs,code);
  assert.ok(root.textContent.includes(`在庫変動の原符号 ${stock.toLocaleString('ja-JP')} 千t`));
  assert.ok(root.textContent.includes(`公表国内供給：${gap} 千t`));
  assert.ok(root.textContent.includes(`符号付き残差${residual}`));
  assert.match(root.textContent,/観光客消費未返却（0ではない）/);assert.match(root.textContent,/原CSV未保持/);assert.match(root.textContent,/域外輸出だけではありません/);
  assert.equal(root.querySelectorAll('tbody tr').length,8);
 }
 assert.equal(api.renderWestWheatExample(data,'PSE'),'');assert.equal(api.renderWestWheatExample(data,'SAU'),'');
}));

test('independent USDA references keep one official MY column, reported uses, carryover and product basis',dom(document=>{
 assert.equal(gain.selectedColumn,'USDA Official');assert.equal(gain.year,'2023/24');assert.equal(gain.worldProduction,null);
 assert.deepEqual(gain.excludedColumns,['New Post','2024/25','2025/26']);
 const expected={wheat:{p:21000,c:19500,x:9950,total:36853},barley:{p:8000,c:7300,x:77,total:9064},rice:{p:545,c:815,x:295,total:1312}};
 for(const row of gain.records){
  const check=expected[row.topic];assert.equal(row.production,check.p);assert.equal(row.domesticUse,check.c);assert.equal(row.exportsMY,check.x);
  assert.equal(row.beginningStocks+row.production+row.importsMY,check.total);assert.equal(row.domesticUse+row.exportsMY+row.endingStocks,check.total);
  assert.equal(row.totalSupply,check.total);assert.equal(row.totalDistribution,check.total);
  if(row.feedAndResidual!==null)assert.equal(row.feedAndResidual+row.foodSeedIndustrial,row.domesticUse);
  const root=document.createElement('section');root.innerHTML=api.renderWestGainReference(row.topic,'TUR');
  assert.equal(root.firstElementChild.open,false);assert.equal(root.querySelectorAll('.agro-band').length,2);
  assert.match(root.textContent,/国内側は原表の公表量を使用し、生産−輸出から求めません/);
  assert.match(root.textContent,/国産分の輸出割合ではありません/);assert.match(root.textContent,/TY.*期間が異なり/s);
  assert.equal(root.querySelector('.agro-world-pie'),null);assert.match(root.textContent,/同版の世界分母.*未収録/s);
  assert.doesNotMatch(root.innerHTML,/NaN|Infinity|undefined/);
 }
 assert.equal(gain.records.find(row=>row.topic==='rice').roughProductionReference,813);
 assert.equal(gain.records.find(row=>row.topic==='rice').feedAndResidual,null);
 assert.equal(gain.records.find(row=>row.topic==='rice').foodSeedIndustrial,null);
 assert.equal(api.renderWestGainReference('wheat','ARM'),'');assert.equal(api.renderWestGainReference('dates','TUR'),'');assert.equal(api.renderWestGainReference('wheat',''),'');
}));

test('published flour destinations keep product tonnes and national denominator separate from PSD wheat',dom(document=>{
 const flour=gain.flourExports;assert.equal(flour.total,4007584);assert.equal(flour.partners.length,9);
 assert.equal(flour.partners.reduce((sum,row)=>sum+row.quantity,0),flour.total);assert.equal(flour.partners[0].quantity,1230075);
 assert.equal(flour.partners.find(row=>row.name==='Other').quantity,1692089);assert.equal(flour.notJoinedToPsdExports,true);
 const root=document.createElement('section');root.innerHTML=api.renderWestGainReference('wheat','TUR');const table=root.querySelector('[data-west-gain-flour]');
 assert.equal(table.open,false);assert.equal(table.querySelectorAll('tbody tr').length,9);
 assert.match(table.textContent,/原穀換算ではない|小麦粉の製品重量/);assert.match(table.textContent,/Otherの域内外配分は未収録/);assert.match(table.textContent,/9,950 千tへ換算・合算しません/);
 assert.equal(table.querySelector('tbody tr:first-child td:last-child').textContent,'30.69%');
 assert.match(table.textContent,/地域の域外輸出ではありません/);
}));
