import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const read=path=>JSON.parse(readFileSync(path));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const compile=async path=>{const built=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));};
const {agroEastQuantityFlow}=await compile('src/data/atlas/agro-east-quantity-flow.ts');
const {renderAgroColumns}=await compile('src/lib/atlas-agro-statistics.ts');
const {eastExportQuantities,renderEastExportQuantityReference}=await compile('src/scripts/atlas-east-export-quantities.ts');
const {renderEastTrade}=await compile('src/scripts/atlas-east-agri-statistics.ts');
const {renderEastAsiaFarmFoundations}=await compile('src/scripts/atlas-east-asia-farm-foundations.ts');
const retained=read('src/data/atlas/east-asia-export-quantities.json');
const qcl=read('public/assets/atlas/asia-farming-v1/statistics.json');
const data=JSON.parse(gunzipSync(readFileSync('public/assets/atlas/regional-production-statistics-v1/by-series/soybean-production.json.gz')));

async function dom(run){const window=new Window(),previous=globalThis.document;globalThis.document=window.document;try{return await run(window.document);}finally{globalThis.document=previous;await window.happyDOM.close();}}

test('Korean soybean comparison pins the same FAO archive, year, unit, production and World',()=>{
 const flow=agroEastQuantityFlow('KOR','soybean-production');
 const original=qcl.countries.KOR.observations.find(r=>r.item==='236'&&r.elementCode==='5510'&&r.year===2023);
 assert.equal(flow.production,original.value);assert.equal(flow.production,141477);assert.equal(flow.worldProduction,370876094.01);
 assert.equal(flow.provenance.productionArchiveSha256,qcl.inputs.find(s=>s.file.startsWith('Production_Crops')).sha256);
 assert.equal(flow.provenance.sourceCountryNames.production,'Republic of Korea');
 assert.equal(flow.year,2023);assert.equal(flow.unit,'t');assert.equal(flow.actualDomesticUse,null);assert.equal(flow.stockVariation,null);
 for(const direction of ['import','export']){
  const path=flow.provenance[direction+'Path'],raw=read(path),world=raw.rows.find(r=>r.partner==='World');
  assert.equal(hash(path),flow.provenance[direction+'Sha256']);assert.equal(raw.year,2023);assert.equal(raw.product,'120100');
  assert.equal(raw.classification,'HS 1988/92 (H0)');assert.equal(world.quantityUnit,'Kg');
  assert.equal(flow[direction+'s'],Number(world.quantity)/1000);assert.equal(flow.provenance[direction==='export'?'productDescriptionVerification':'importProductDescriptionVerification'].url,raw.source);
 }
 assert.equal(flow.production+flow.imports-flow.exports,1439287.748);
 assert.equal(flow.partners.length,13);assert.equal(flow.partnerRoundingGap,-.001);
 assert.equal(flow.partners.find(r=>r.name==='China').value,40);
 assert.equal(flow.partners.find(r=>r.name==='United States').value,5.867);
 assert.ok(Math.abs(flow.partners.reduce((sum,r)=>sum+r.value,0)-flow.exports+.001)<1e-10);
 assert.match(flow.notes.join(' '),/国産大豆の仕向け割合ではありません/);
});

test('existing shared columns consume Korean data without a common renderer change',async()=>dom(document=>{
 const host=document.createElement('main');host.innerHTML=renderAgroColumns(data,'KOR','soybean-production');
 assert.deepEqual([...host.querySelectorAll('[data-agro-stage]')].map(r=>r.dataset.agroStage),['production','use','destinations']);
 assert.equal(host.querySelector('[data-agro-quantity-flow]').dataset.agroQuantityFlow,'2023');
 assert.match(host.querySelector('[data-agro-stage="production"]').textContent,/141,477.*370,876,094/s);
 assert.match(host.querySelector('[data-agro-stage="use"]').textContent,/49\.252.*0\.03%.*1,439,287\.75/s);
 assert.match(host.querySelector('[data-agro-stage="destinations"]').textContent,/China.*40 t.*81\.21%.*United States.*5\.867/s);
 assert.equal(host.querySelectorAll('[data-agro-stage="destinations"] tbody tr').length,13);
 assert.match(host.textContent,/実消費・国産分の国内仕向けではありません/);
 assert.equal(agroEastQuantityFlow('TWN','soybean-production'),undefined);
}));

test('every quantity is derived from the retained publisher row, preserving missing values and actual World gaps',()=>{
 assert.equal(retained.records.length,18);assert.equal(retained.records.filter(r=>r.status==='complete').length,16);
 for(const model of retained.records){
  const raw=read(model.source.path),world=raw.rows.find(r=>r.partner==='World'),divisor=world.quantityUnit==='Kg'||['1001','1005','1006','120100'].includes(raw.product)?1000:1;
  assert.equal(hash(model.source.path),model.source.sha256);assert.equal(raw.year,model.year);assert.equal(raw.product,model.product);
  assert.equal(model.world,world.quantity===null?null:Number(world.quantity)/divisor);
  assert.deepEqual(model.partners.map(r=>[r.name,r.value]),raw.rows.filter(r=>r.partner!=='World').map(r=>[r.partner,r.quantity===null?null:Number(r.quantity)/divisor]));
  assert.ok(!['JPN'].includes(model.reporter));
  for(const row of model.partners)assert.equal(row.boundary,retained.insidePartnerNames.includes(row.name)?'inside':row.name==='Unspecified'?'unknown':'outside');
  if(model.status==='complete')assert.ok(Math.abs(model.partners.reduce((sum,r)=>sum+r.value,0)-model.world-model.partnerRoundingGap)<1e-8);
  else assert.equal(model.partnerRoundingGap,null);
 }
 assert.equal(eastExportQuantities('CHN','rice').partnerRoundingGap,.416);
 assert.equal(eastExportQuantities('KOR','maize').world,null);
 assert.equal(eastExportQuantities('KOR','coniferous-roundwood').world,null);
 assert.equal(eastExportQuantities('MNG','wheat'),undefined);
});

test('quantity rankings and geographic subtotals use quantities; internal trade never becomes external',async()=>dom(document=>{
 const host=document.createElement('div');renderEastExportQuantityReference(host,'maize','CHN');
 const list=host.querySelector('.agro-key');
 assert.match(list.firstElementChild.textContent,/北朝鮮.*6,750\.02.*78\.05%/);
 assert.ok(list.textContent.indexOf('ベトナム')>list.textContent.indexOf('北朝鮮'),'value-ranked Vietnam must not lead the quantity chart');
 const model=eastExportQuantities('CHN','maize'),outside=model.partners.filter(r=>r.boundary==='outside').reduce((s,r)=>s+r.value,0);
 assert.ok(outside<model.world-6750);assert.match(host.textContent,/国の外国向け輸出には東アジア内.*地域全体の域外輸出とは別/s);
 assert.equal(host.querySelectorAll('tbody tr').length,18);assert.match(host.textContent,/域外小計に域内取引を算入しません/);
}));

test('incomplete, missing and OAS trade never create a pie, a false zero or a FAO-country crosswalk',async()=>dom(document=>{
 for(const [country,topic] of [['KOR','maize'],['KOR','coniferous-roundwood'],['PRK','rice'],['MNG','soybean']]){
  const host=document.createElement('div');renderEastExportQuantityReference(host,topic,country);assert.equal(host.querySelector('.agro-partner-pie'),null);assert.match(host.textContent,/未収録|欠測/);
 }
 const host=document.createElement('div');renderEastExportQuantityReference(host,'soybean','TWN');assert.match(host.textContent,/Other Asia, nes（原表の報告区分）/);assert.match(host.textContent,/FAO台湾生産と接合しません/);
 for(const code of ['JPN','','east-asia'])assert.equal(eastExportQuantities(code,'rice'),undefined);
 const first=eastExportQuantities('CHN','rice');first.partners[0].value=0;assert.notEqual(eastExportQuantities('CHN','rice').partners[0].value,0);
}));

test('forest reference keeps m³, narrower raw-log scope and missing pulp t separate',async()=>dom(document=>{
 const host=document.createElement('div');renderEastExportQuantityReference(host,'sawnwood','CHN');
 assert.match(host.textContent,/165,441 m³/);assert.match(host.textContent,/FAO製材の同年輸出と値・分類が異なり/);
 assert.match(host.textContent,/パルプの重量tと丸太・製材の体積m³を合算せず/);assert.match(host.textContent,/生産能力も実生産量へ置き換えません/);
 const log=document.createElement('div');renderEastExportQuantityReference(log,'coniferous-roundwood','TWN');assert.match(log.textContent,/HS440320.*丸太全体.*異なります/s);
}));

test('overview and Japan retain the established trade output; selected quantities require explicit opt-in',async()=>dom(document=>{
 const plain=document.createElement('div'),explicit=document.createElement('div'),selected=document.createElement('div');
 renderEastTrade(plain,'rice','CHN');renderEastTrade(explicit,'rice','CHN',false);renderEastTrade(selected,'rice','CHN',true);
 assert.equal(plain.innerHTML,explicit.innerHTML);assert.equal(plain.querySelector('[data-east-export-quantities]'),null);
 assert.equal(selected.querySelectorAll('[data-east-export-quantities]').length,1);
 assert.equal(selected.querySelector('.east-trade-card').outerHTML,plain.querySelector('.east-trade-card').outerHTML);
 const japan=document.createElement('div');renderEastTrade(japan,'rice','JPN',true);assert.equal(japan.querySelector('[data-east-export-quantities]'),null);
 const region=document.createElement('div');renderEastTrade(region,'rice',undefined,true);assert.equal(region.querySelector('[data-east-export-quantities]'),null);
}));

test('regional controller opts in only for selected non-Japan commodities and clears references on overview return',async()=>dom(document=>{
 const root=document.createElement('main');root.innerHTML='<section data-east-farm-foundations><div class="priority"></div><h2 data-east-foundations-title></h2><p data-east-foundations-lead></p><h3 data-east-supply-title></h3><h3 data-east-partner-title></h3><h3 data-east-share-title></h3><div data-east-forest-flows></div><div data-east-export-partners></div><div data-east-world-share></div><div data-east-wheat-sources></div><details data-east-other-sources></details></section>';
 renderEastAsiaFarmFoundations(root,'east-asia',true,'rice',{code:'CHN',name:'中国本土'});
 assert.equal(root.querySelectorAll('[data-east-export-quantities]').length,1);
 assert.match(root.querySelector('[data-east-partner-title]').textContent,/輸出先数量.*域外輸出入相手.*金額/);
 assert.match(root.querySelector('[data-east-export-partners]').textContent,/国別対世界の輸出数量参考と.*別の分母/s);
 renderEastAsiaFarmFoundations(root,'east-asia',true,'overview',{code:'CHN',name:'中国本土'});
 assert.equal(root.querySelectorAll('[data-east-export-quantities]').length,0);
 assert.equal(root.querySelector('[data-east-partner-title]').textContent,'主要品目の域外輸出入相手');
 renderEastAsiaFarmFoundations(root,'east-asia',true,'forest',{code:'KOR',name:'韓国'});
 assert.equal(root.querySelectorAll('[data-east-export-quantities]').length,2);
 renderEastAsiaFarmFoundations(root,'east-asia',true,'rice',{code:'JPN',name:'日本'});
 assert.equal(root.querySelectorAll('[data-east-export-quantities]').length,0);
}));
