import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

const packet=JSON.parse(readFileSync('src/data/atlas/asia/southeast-agro-statistics.json'));
const compile=async path=>{const output=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));};
const api=await compile('src/lib/atlas-southeast-agro-statistics.ts');
const controller=await compile('src/scripts/atlas-southeast-agro-statistics.ts');
after(()=>stop());
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
async function withDom(run){
 const window=new Window(),saved={document:globalThis.document,MutationObserver:globalThis.MutationObserver};
 globalThis.document=window.document;globalThis.MutationObserver=window.MutationObserver;
 try{await run(window);}finally{Object.assign(globalThis,saved);await window.happyDOM.close();}
}
const parse=(w,html)=>{const el=w.document.createElement('div');el.innerHTML=html;return el;};
async function settle(w,predicate){for(let i=0;i<150;i++){await w.happyDOM.whenAsyncComplete();if(predicate())return;await new Promise(r=>setImmediate(r));}assert.fail('selection did not settle');}

test('Southeast extraction is reproducible and pins the exact retained sources',()=>{
 for(const s of packet.sources)assert.equal(hash(s.path),s.sha256,s.path);
 execFileSync('python3',['-c',`import json,runpy
from pathlib import Path
m=runpy.run_path('scripts/prepare-southeast-agro-statistics.py')
assert m['build']()==json.loads(Path('src/data/atlas/asia/southeast-agro-statistics.json').read_text())
`]);
 assert.deepEqual(packet.countryCodes,['BRN','IDN','KHM','LAO','MMR','MYS','PHL','SGP','THA','TLS','VNM']);
 assert.deepEqual(Object.keys(packet.topics),['rice','maize','cassava','oilpalm','rubber','arabica','robusta','sugarcane','cattle','buffalo','pig','chicken','forest']);
});

test('published geography and partial country sums keep distinct coverage and matching World',()=>{
 const qcl=JSON.parse(readFileSync('data-source/atlas/livestock/faostat-qcl-2024-extract.json'));
 for(const sid of ['cattle-meat','cattle-milk','pig-meat','chicken-meat','chicken-eggs']){
  const result=api.southeastAgroRegionalProduction(sid);
  assert.equal(result.basis,'publisher-region');
  const s=result.series,r=qcl.find(r=>r['Area Code']==='5304'&&r['Item Code']===s.item&&r['Element Code']===s.element&&r.Year==='2024');
  const w=qcl.find(r=>r['Area Code']==='5000'&&r['Item Code']===s.item&&r['Element Code']===s.element&&r.Year==='2024');
  assert.equal(result.row.value,Number(r.Value));assert.equal(result.row.flag,r.Flag);assert.equal(result.row.worldValue,Number(w.Value));assert.equal(result.row.worldFlag,w.Flag);
 }
 assert.equal(api.southeastAgroRegionalProduction('cattle-milk').row.value,5360689.74,'do not replace publisher regional milk with nine retained countries');
 assert.equal(api.southeastAgroRegionalProduction('coffee-production').row.value,3100040.63);
 const rice=api.southeastAgroRegionalProduction('rice-production');assert.equal(rice.basis,'retained-country-sum');assert.equal(rice.countryCount,10);assert.equal(rice.row.value,197000960.13);
 const wood=api.southeastAgroRegionalProduction('roundwood-production');assert.equal(wood.countryCount,11);assert.equal(wood.row.value,310839370);
 assert.equal(api.southeastAgroRegionalProduction('wood-pulp-production'),null);
 const s=api.southeastAgroData.countries.IDN.series.find(s=>s.id==='rice-production'),old=s.rows[0].worldValue;
 try{s.rows[0].worldValue=old+1;assert.throws(()=>api.southeastAgroRegionalProduction('rice-production'),/集計定義/);}finally{s.rows[0].worldValue=old;}
});

test('five national rice balances use the historical milled table, not paddy minus exports',()=>{
 const raw=readFileSync('scripts/data/wasde0926.txt','utf8'),block=raw.split('WASDE - 675 - 24')[1].split('2025/26')[0];
 assert.deepEqual(Object.keys(packet.riceBalances),['MMR','THA','VNM','IDN','PHL']);
 for(const flow of Object.values(packet.riceBalances)){
  assert.ok(block.includes(flow.rawLine));assert.ok(block.includes(flow.worldRawLine));assert.equal(flow.worldProduction,542.30);
  const values=flow.rawLine.match(/\d+\.\d+/g).map(Number);
  assert.deepEqual(values,[flow.beginningStocks,flow.production,flow.imports,flow.domesticUse,flow.exports,flow.endingStocks]);
  assert.ok(Math.abs(flow.beginningStocks+flow.production+flow.imports-flow.domesticUse-flow.exports-flow.endingStocks-flow.roundingGap)<1e-9);
  assert.ok(Math.abs(flow.roundingGap)<=.03);assert.equal(flow.exportDestinations,null);
 }
 assert.equal(packet.riceBalances.IDN.exports,0,'reported rounded zero remains zero');assert.equal(packet.riceBalances.IDN.domesticUse,35.5);
 assert.notEqual(packet.riceBalances.VNM.production-packet.riceBalances.VNM.exports,packet.riceBalances.VNM.domesticUse);
});

test('independent AFSIS outlook totals remain ASEAN10 references with gross trade and no World ratio',async()=>withDom(w=>{
 const raw=readFileSync('data-source/atlas/southeast-agro-20261016/aco33-tables-web.txt','utf8');
 assert.equal(packet.supplyReferences.length,3);
 for(const ref of packet.supplyReferences){
  assert.ok(raw.includes(ref.rawLine));assert.equal(ref.countryCount,10);assert.equal(ref.year,2024);assert.equal(ref.unit,'t');
  const values=ref.rawLine.split(': ASEAN ')[1].split(/\s+/).map(s=>Number(s.replaceAll(',','')));
  assert.deepEqual(values,[ref.beginningStocks,ref.production,ref.imports,ref.totalSupply,ref.domesticUse,ref.exports,ref.endingStocks,ref.totalDemand]);
  assert.equal(ref.beginningStocks+ref.production+ref.imports,ref.totalSupply);assert.equal(ref.domesticUse+ref.exports+ref.endingStocks,ref.totalDemand);
  assert.equal(ref.externalExports,null);assert.equal(ref.worldProduction,null);assert.notEqual(ref.production-ref.exports,ref.domesticUse);
  const root=parse(w,api.renderSoutheastAfsisSupplyReference(ref.seriesId));
  assert.match(root.textContent,/ASEAN10.*見通し.*東ティモールを含まない/s);assert.match(root.textContent,/推計.*確報ではない/s);
  assert.match(root.textContent,/域内移動を含む.*域外貿易へ変換しない/s);assert.equal(root.querySelectorAll('.agro-band,.agro-partner-pie,.agro-world-pie').length,0);
  assert.equal(root.querySelectorAll('tbody tr').length,8);assert.match(root.querySelector('a').href,new RegExp('#page='+ref.pdfPage+'$'));
 }
 assert.equal(packet.supplyReferences.find(r=>r.seriesId==='rice-production').domesticUse,109836889);
 assert.equal(packet.supplyReferences.find(r=>r.seriesId==='maize-production').domesticUse,54738479);
 assert.equal(packet.supplyReferences.find(r=>r.seriesId==='cassava-production').domesticUse,48395985);
 assert.equal(api.renderSoutheastAfsisSupplyReference('qcl-254-production'),'');
}));

test('all returned WITS quantities exclude eleven-country internal partners and unallocated areas',()=>{
 for(const trade of packet.tradeReferences){
  assert.equal(trade.classification,'HS 1988/92 (H0)');assert.equal(trade.year,2023);assert.equal(trade.unit,'t');
  assert.equal(trade.partners.length,trade.countryCode==='VNM'?85:142);
  assert.equal(new Set(trade.partners.map(p=>p.name)).size,trade.partners.length);
  for(const p of trade.partners)assert.equal(p.value,Number(p.rawKg.replaceAll(',',''))/1000);
  const summary=api.southeastAgroTradeSummary(trade);
  assert.ok(Math.abs(summary.internal+summary.external+summary.unallocated-trade.worldExports-summary.gap)<1e-7);
  assert.ok(summary.external<trade.worldExports);assert.ok(summary.unallocated>0);
  assert.equal(trade.partners.find(p=>p.name==='Other Asia, nes').region,'unallocated');
 }
 const palm=packet.tradeReferences.find(t=>t.hs==='1511');assert.equal(palm.partners.find(p=>p.name==='East Timor').region,'internal');
 const rice=packet.tradeReferences.find(t=>t.hs==='1006');assert.equal(rice.partners.find(p=>p.name==='Philippines').region,'internal');
 assert.equal(rice.partnerRoundingGap,-4.517);assert.equal(palm.partnerRoundingGap,11.116);
});

test('selected views preserve production/use/partners and label incompatible references',async()=>withDom(w=>{
 for(const ids of Object.values(packet.topics))for(const id of ids){
  const root=parse(w,api.renderSoutheastAgroColumns(id));
  assert.deepEqual([...root.querySelectorAll('.agro-columns>section')].map(s=>s.dataset.agroStage),['production','use','destinations']);
  assert.doesNotMatch(root.textContent,/NaN|Infinity/);
  assert.equal(root.querySelectorAll('.agro-band').length,0,'no fabricated regional use band');
 }
 const rice=parse(w,api.renderSoutheastAgroColumns('rice-production'));assert.match(rice.textContent,/報告10\/11.*地域完全値ではありません/s);
 const country=parse(w,api.renderSoutheastAgroColumns('rice-production','VNM'));
 assert.match(country.querySelector('[data-agro-stage="production"]').textContent,/2024\/25.*26\.85/s);
 assert.match(country.querySelector('[data-agro-stage="use"]').textContent,/22\.3.*輸出 8\.06.*期末在庫 3\.35/s);
 assert.equal(country.querySelectorAll('[data-agro-stage="destinations"]>.agro-partner-pie').length,0);
 assert.match(country.querySelector('[data-southeast-trade-reference]').textContent,/2023暦年.*HS1006.*域内相手/s);
 const coffee=parse(w,api.renderSoutheastAgroColumns('coffee-production'));assert.match(coffee.textContent,/生豆/);assert.doesNotMatch(coffee.textContent,/ロブスタ生産量|アラビカ生産量/);
 const pulp=parse(w,api.renderSoutheastAgroColumns('wood-pulp-production'));assert.equal(pulp.querySelectorAll('.agro-world-pie,.agro-band').length,0);assert.match(pulp.textContent,/木材パルプはt/);
}));

test('region adapter leaves overview intact and switches country/product without changing map state',async()=>withDom(async w=>{
 const root=w.document.createElement('main');root.dataset.region='southeast-asia';root.dataset.southeastFarmTopic='overview';
 root.innerHTML='<select data-country-select><option value="">全域</option><option value="VNM">ベトナム</option></select><div class="asia-layout"><section data-south-central-farm-connections><h2>既存合意</h2></section><section data-agro-statistics></section></div>';
 w.document.body.append(root);const original=root.querySelector('[data-south-central-farm-connections]').outerHTML;
 controller.initSoutheastAgroStatistics(root);const host=root.querySelector('[data-southeast-agro-statistics]');
 assert.equal(host.hidden,true);assert.equal(root.hasAttribute('data-southeast-selected-statistics'),false);
 root.dataset.southeastFarmTopic='rice';await settle(w,()=>host.dataset.ready==='true');
 assert.equal(host.hidden,false);assert.equal(root.hasAttribute('data-southeast-selected-statistics'),true);assert.match(host.textContent,/報告10\/11/);
 const select=host.querySelector('[data-southeast-agro-country]');select.focus();select.value='VNM';select.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(w,()=>host.textContent.includes('26.85'));
 assert.equal(w.document.activeElement,host.querySelector('[data-southeast-agro-country]'),'keyboard focus survives a statistics selection');
 const reference=host.querySelector('.southeast-agro-reference');reference.open=true;root.dataset.southeastFarmTopic='rice';await w.happyDOM.whenAsyncComplete();assert.equal(reference.isConnected,true);assert.equal(reference.open,true,'a repeated settled map update retains open references');
 assert.equal(root.querySelector('[data-country-select]').value,'','statistics selection does not alter map selection');
 root.dataset.southeastFarmTopic='forest';await settle(w,()=>Boolean(host.querySelector('[data-southeast-agro-series]')));
 const forest=host.querySelector('[data-southeast-agro-series]');forest.value='sawnwood-production';forest.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(w,()=>host.textContent.includes('製材生産量'));
 root.dataset.southeastFarmTopic='overview';await settle(w,()=>host.hidden);assert.equal(root.hasAttribute('data-southeast-selected-statistics'),false);
 assert.equal(root.querySelector('[data-south-central-farm-connections]').outerHTML,original);
 root.dataset.southeastFarmTopic='rice';root.dataset.southeastFarmTopic='';await settle(w,()=>host.hidden);assert.equal(root.hasAttribute('data-southeast-selected-statistics'),false);
}));
