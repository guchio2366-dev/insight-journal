import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const path='src/data/atlas/oceania-agro-trade.json',data=JSON.parse(readFileSync(path));
const compile=async file=>{const result=await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));};
const api=await compile('src/lib/atlas-oceania-agro-trade.ts');
const client=await compile('src/scripts/atlas-oceania-agro-trade.ts');
const common=await compile('src/lib/atlas-agro-statistics.ts');
const get=id=>data.tables.find(table=>table.id===id);
const parse=(window,html)=>{const root=window.document.createElement('div');root.innerHTML=html;return root;};
async function withDom(run){
 const w=new Window();const old={document:globalThis.document,MutationObserver:globalThis.MutationObserver};
 globalThis.document=w.document;globalThis.MutationObserver=w.MutationObserver;
 try{return await run(w);}finally{Object.assign(globalThis,old);await w.happyDOM.close();}
}

test('all 420 partner quantities and nulls match retained official table text and hashes',()=>{
 assert.equal(data.tables.length,9);assert.equal(data.tables.reduce((sum,t)=>sum+t.partners.length,0),420);
 for(const t of data.tables){
  const bytes=readFileSync(t.sourcePath),text=bytes.toString();
  assert.equal(createHash('sha256').update(bytes).digest('hex'),t.sourceSha256);
  assert.ok(text.includes(t.sourceUrl));assert.match(text,/HS Nomenclature used HS 1988\/92 \(H0\)/);
  const lines=text.split('\n').filter(line=>line.includes('| Export  |'));
  assert.equal(lines.length,t.partners.length+1);
  for(const [i,row] of [{partner:'World',value:t.worldQuantity,rawQuantity:t.worldRawQuantity},...t.partners].entries()){
   const cells=lines[i].split('|').map(x=>x.trim());
   assert.equal(cells[2],t.product);assert.equal(Number(cells[4]),t.year);
   assert.ok(cells[5].includes('†'+row.partner+''));
   assert.equal(cells[7].replaceAll(',','')||null,row.rawQuantity);
   assert.equal(row.value,cells[7]?Number(cells[7].replaceAll(',',''))/(cells[8]==='Kg'?1000:1):null);
  }
 }
});

test('offline regeneration is deterministic and retains the source-quality hold',()=>{
 const before=readFileSync(path);execFileSync('python',['scripts/prepare-oceania-agro-trade.py']);assert.deepEqual(readFileSync(path),before);
 assert.equal(get('PNG-cocoa-2023').qualityStatus,'withheld');
});

test('NZ logs partition geographic Oceania separately from the reporter’s foreign exports',()=>{
 const t=get('NZL-logs-2024'),s=api.oceaniaTradeSummary(t);
 assert.equal(s.intra,2936);assert.equal(s.extra,20236944);assert.equal(s.unallocated,0);
 assert.equal(s.total,20239880);assert.equal(s.gap,-20);assert.equal(s.denominator,20239900);
 assert.equal(s.top[0].partner,'China');assert.equal(s.top[0].value,18099400);
 for(const name of ['Australia','Tonga','French Polynesia','New Caledonia','Tokelau','Wallis and Futura Isl.','Micronesia, Fed. Sts.','Naoero'])assert.equal(api.oceaniaPartnerScope(name),'intra',name);
 assert.equal(api.oceaniaPartnerScope('Other Asia, nes'),'extra');
 assert.equal(api.oceaniaPartnerScope('Unspecified'),'unallocated');
});

test('destination order follows quantity rather than value; rounding residuals stay signed',()=>{
 assert.equal(api.oceaniaTradeSummary(get('NZL-sawn-2024')).top[0].partner,'China');
 assert.equal(api.oceaniaTradeSummary(get('NZL-sawn-2024')).gap,0);
 assert.ok(Math.abs(api.oceaniaTradeSummary(get('AUS-beef-2024')).gap-(-.15))<1e-8);
 assert.ok(Math.abs(api.oceaniaTradeSummary(get('AUS-sheep-2024')).gap-.096)<1e-8);
 assert.match(api.renderOceaniaTradeReference(get('AUS-sheep-2024')),/\+0\.096 t/);
 assert.match(api.renderOceaniaTradeReference(get('AUS-beef-2024')),/-0\.15 t/);
 assert.match(api.renderOceaniaTradeReference(get('AUS-beef-2024')),/0\.01%未満/);
});

test('missing World and one partner never become a total ratio or full ranking claim',()=>withDom(w=>{
 const t=get('AUS-wheat-2024'),s=api.oceaniaTradeSummary(t),root=parse(w,api.renderOceaniaTradeReference(t));
 assert.equal(s.denominator,null);assert.equal(s.gap,null);assert.equal(s.missing,1);
 assert.equal(t.partners.find(p=>p.partner==='France').value,null);
 assert.match(root.textContent,/World総輸出数量が未収録/);assert.match(root.textContent,/数量判明相手の最多/);
 assert.match(root.textContent,/数量欠測 1相手/);assert.match(root.textContent,/2024\/25販売年度.*接合しない/);
 assert.doesNotMatch(root.textContent,/%|NaN|Infinity/);
 const zero={...t,worldQuantity:0};assert.equal(api.oceaniaTradeSummary(zero).denominator,null);
 const zeroHtml=api.renderOceaniaTradeReference(zero);assert.match(zeroHtml,/公表World総輸出数量は0/);assert.doesNotMatch(zeroHtml,/World総輸出数量が未収録/);
}));

test('units, processing stages, raw milk and held cocoa cannot masquerade as matched supply flows',()=>withDom(w=>{
 assert.equal(get('NZL-logs-2024').unit,'m³');assert.equal(get('NZL-sawn-2024').unit,'m³');assert.equal(get('NZL-pulp-2024').unit,'t');
 assert.equal(get('NZL-pulp-2024').worldQuantity,167289);
 const milk=parse(w,api.renderOceaniaTradeReference(get('NZL-milk-powder-2024')));
 assert.match(milk.textContent,/加工製品の重量/);assert.match(milk.textContent,/生乳生産から差し引かず/);
 assert.match(milk.textContent,/再輸出.*最終消費地・用途ではありません/s);
 const cocoa=parse(w,api.renderOceaniaTradeReference(get('PNG-cocoa-2023')));
 assert.match(cocoa.textContent,/数量は保留/);assert.equal(cocoa.querySelectorAll('table,.agro-key').length,0);
 assert.doesNotMatch(cocoa.textContent,/3,306,860|5,428,816|数量最多/);
 for(const [country,series] of [['AUS','cattle-milk'],['NZL','cattle-meat'],['FJI','cattle-meat'],['PNG','coconut-production']])assert.deepEqual(api.oceaniaTradeReferences(country,series),[]);
}));

test('regional attachment preserves shared production/use nodes, disclosures, and the unselected overview',()=>withDom(w=>{
 const root=parse(w,'<select data-layer><option value="wheat">小麦</option><option value="farming-all">全分布</option></select><section data-agro-statistics><div data-agro-content></div></section>');
 const content=root.querySelector('[data-agro-content]');
 content.innerHTML=common.renderAgroColumns({countries:{},sources:[],method:''},'AUS','wheat-production');
 const production=content.querySelector('[data-agro-stage="production"]'),use=content.querySelector('[data-agro-stage="use"]');
 const originalProduction=production.innerHTML,originalUse=use.innerHTML;
 client.syncOceaniaAgroTrade(root);client.syncOceaniaAgroTrade(root);
 assert.equal(content.querySelectorAll('[data-oceania-trade-id]').length,2);
 assert.equal(content.querySelector('[data-agro-stage="production"]'),production);assert.equal(production.innerHTML,originalProduction);
 assert.equal(content.querySelector('[data-agro-stage="use"]'),use);assert.equal(use.innerHTML,originalUse);
 const details=content.querySelector('.oceania-trade-reference details');details.open=true;client.syncOceaniaAgroTrade(root);assert.equal(details.open,true);
 root.querySelector('[data-layer]').value='farming-all';content.innerHTML='<p data-original-overview>original</p>';client.syncOceaniaAgroTrade(root);
 assert.equal(content.innerHTML,'<p data-original-overview="">original</p>');
}));

test('async rendering/retry and beef-to-milk switches never keep old regional trade',()=>withDom(async w=>{
 const root=parse(w,'<main data-field="agriculture"><select data-layer><option value="cattle">牛</option></select><section data-agro-statistics><div data-agro-content></div></section></main>').firstElementChild;
 w.document.body.append(root);client.initOceaniaAgroTrade(root);
 const content=root.querySelector('[data-agro-content]');
 const show=async(country,series)=>{content.innerHTML=common.renderAgroColumns({countries:{},sources:[],method:''},country,series);await w.happyDOM.waitUntilComplete();};
 await show('AUS','cattle-meat');assert.ok(content.querySelector('[data-oceania-trade-id="AUS-beef-2024"]'));
 await show('NZL','cattle-milk');assert.ok(content.querySelector('[data-oceania-trade-id="NZL-milk-powder-2024"]'));assert.equal(content.querySelector('[data-oceania-trade-id="AUS-beef-2024"]'),null);
 await show('FJI','cattle-meat');assert.equal(content.querySelectorAll('[data-oceania-trade-id]').length,0);
}));

test('forestry composes existing examples and restores the exact original overview nodes',()=>withDom(async w=>{
 const root=parse(w,'<main data-regional-forestry data-region="oceania"><svg data-forest-map viewBox="0 0 1200 600"><path d="M1 1L2 2"/></svg><div class="forest-example-choices"><button data-forest-example="new-zealand" aria-pressed="false">NZ</button><button data-forest-example="australia" aria-pressed="false">AU</button></div><section data-agro-statistics><h2 data-agro-heading>Original</h2><p data-agro-status>Overview</p><div class="agro-stat-controls"><label data-agro-series-control><select data-agro-series-select></select></label></div><div data-agro-content><p data-original-node>Original overview</p></div></section></main>').firstElementChild;
 w.document.body.append(root);const original=root.querySelector('[data-original-node]'),map=root.querySelector('svg'),mapHtml=map.outerHTML;
 client.initOceaniaForestryTrade(root);client.initOceaniaForestryTrade(root);
 assert.equal(root.querySelectorAll('[data-oceania-forest-product]').length,1);assert.equal(root.querySelector('[data-oceania-forest-product]').hidden,true);assert.equal(root.querySelector('[data-original-node]'),original);
 const button=root.querySelector('[data-forest-example="new-zealand"]');button.setAttribute('aria-pressed','true');await w.happyDOM.waitUntilComplete();
 assert.equal(root.querySelector('[data-agro-country]').dataset.agroCountry,'NZL');assert.ok(root.querySelector('[data-oceania-trade-id="NZL-logs-2024"]'));
 const select=root.querySelector('[data-oceania-forest-product] select');select.value='sawnwood-production';select.dispatchEvent(new w.Event('change'));
 assert.ok(root.querySelector('[data-oceania-trade-id="NZL-sawn-2024"]'));assert.equal(root.querySelector('[data-oceania-trade-id="NZL-logs-2024"]'),null);
 select.value='wood-pulp-production';select.dispatchEvent(new w.Event('change'));assert.ok(root.querySelector('[data-oceania-trade-id="NZL-pulp-2024"]'));
 assert.match(root.querySelector('[data-agro-stage="use"]').textContent,/未収録/);assert.equal(map.outerHTML,mapHtml);
 button.setAttribute('aria-pressed','false');await w.happyDOM.waitUntilComplete();
 assert.equal(root.querySelector('[data-original-node]'),original);assert.equal(root.querySelector('[data-agro-heading]').textContent,'Original');assert.equal(root.querySelector('[data-agro-status]').textContent,'Overview');assert.equal(root.querySelector('[data-agro-series-control]').hidden,false);
}));
