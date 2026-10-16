import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

const packet=JSON.parse(readFileSync('src/data/atlas/south-asia-agro-flow.json'));
const raw=readFileSync('scripts/data/wasde0926.txt');
const data=JSON.parse(readFileSync('public/assets/atlas/regional-production-statistics-v1/statistics.json'));
const bundle=await build({entryPoints:['src/lib/atlas-south-asia-agro-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {renderSouthAsiaAgroColumns,southAsiaRegionalProduction}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flowBundle=await build({entryPoints:['src/data/atlas/south-asia-agro-flow.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {southAsiaAgroFlow,southAsiaAgroCountries}=await import('data:text/javascript;base64,'+Buffer.from(flowBundle.outputFiles[0].text).toString('base64'));
after(()=>stop());
const parse=html=>{const window=new Window(),root=window.document.createElement('main');root.innerHTML=html;return{window,root};};

test('South Asia rows match the retained country and World cells, including zero, stock and loss fields',()=>{
 assert.equal(packet.records.length,7);
 const sha=createHash('sha256').update(raw).digest('hex'),text=raw.toString();
 for(const row of packet.records){
  assert.ok(southAsiaAgroCountries.includes(row.countryCode));
  assert.equal(row.source.sha256,sha);
  const start=text.indexOf(`WASDE - 675 - ${row.source.page} `),end=text.indexOf('WASDE - 675 - ',start+20);
  const page=text.slice(start,end).split('2024/25')[1].split('2025/26')[0];
  assert.ok(page.includes(row.rawLine));assert.ok(page.includes(row.worldRawLine));
  assert.deepEqual(row.rawLine.match(/-?\d+\.\d+/g),Object.values(row.rawValues));
  for(const [key,value] of Object.entries(row.rawValues))assert.equal(row[key],Number(value));
  assert.equal(row.worldProduction,Number(row.worldRawLine.match(/-?\d+\.\d+/g)[1]));
  const gap=row.production+row.imports+row.beginningStocks-row.domesticUse-row.exports-row.endingStocks;
  assert.ok(Math.abs(gap-row.roundingGap)<1e-9);
  assert.ok(Math.abs(row.balanceResidual)<=row.roundingTolerance);
  assert.equal(row.exportDestinations,null);assert.equal(row.periodStart,null);assert.equal(row.periodEnd,null);
  assert.notEqual(row.domesticUse,row.production-row.exports,'domestic use must be independently published');
 }
 const expected=[['IND','rice-production',150.18,121.36,22.83,542.30],['PAK','rice-production',9.72,4.2,5.13,542.30],['IND','qcl-328-production',24,25.5,1.33,119.53],['PAK','qcl-328-production',5,10.6,.05,119.53],['BGD','qcl-328-production',.15,8.2,0,119.53],['BGD','wheat-production',1.1,7.4,0,799.1]];
 for(const [country,id,...quantities] of expected){const row=southAsiaAgroFlow(country,id);assert.deepEqual([row.production,row.domesticUse,row.exports,row.worldProduction],quantities);}
 const existing=JSON.parse(readFileSync('src/data/atlas/agro-marketing-year-flow.json')).records.find(r=>r.countryCode==='IND');
 const india=southAsiaAgroFlow('IND','wheat-production');
 for(const key of ['production','imports','exports','domesticUse','beginningStocks','endingStocks','worldProduction','rawLine'])assert.equal(india[key],existing[key]);
});

test('offline regeneration is deterministic and altered source bytes stop extraction',()=>{
 const output=execFileSync('python',['-c',`import importlib.util,json
s=importlib.util.spec_from_file_location('south','scripts/prepare-south-asia-agro-flow.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
b=(m.ROOT/m.SOURCE).read_bytes();print(json.dumps(m.parse(b),ensure_ascii=False))
try: m.parse(b+b'changed')
except ValueError: pass
else: raise AssertionError('altered revision accepted')`],{encoding:'utf8'});
 assert.deepEqual(JSON.parse(output),packet);
});

test('selection keys never relabel paddy or seed cotton statistics and cannot mutate canonical packets',()=>{
 assert.equal(southAsiaAgroFlow('IND','rice-production').seriesId,'rice-milled-production');
 assert.equal(southAsiaAgroFlow('IND','qcl-328-production').seriesId,'cotton-lint-production');
 assert.equal(southAsiaAgroFlow('IND','qcl-328-production').unit,'百万480ポンド俵');
 const row=southAsiaAgroFlow('IND','rice-production');row.production=0;row.notes.length=0;
 assert.equal(southAsiaAgroFlow('IND','rice-production').production,150.18);
 assert.ok(southAsiaAgroFlow('IND','rice-production').notes.length>0);
 for(const [country,id] of [['KAZ','wheat-production'],['USA','rice-production'],['IND','overview'],['','rice-production'],['IND','soybean-production']])assert.equal(southAsiaAgroFlow(country,id),undefined);
});

test('new rice flows keep the reading order, independent domestic use and unavailable partner denominator',async()=>{
 for(const [country,share] of [['IND','27.69%'],['PAK','1.79%']]){
  const {window,root}=parse(renderSouthAsiaAgroColumns(data,country,'rice-production'));
  try{
   assert.deepEqual([...root.querySelectorAll('.agro-columns>section')].map(n=>n.dataset.agroStage),['production','use','destinations']);
   assert.equal(root.querySelector('[data-agro-series]').dataset.agroSeries,'rice-production');
   assert.equal(root.querySelector('[data-south-asia-product-basis]').dataset.southAsiaProductBasis,'rice-milled-production');
   assert.match(root.querySelector('[data-agro-stage="production"]').textContent,new RegExp(share.replace('.','\\.')));
   const use=root.querySelector('[data-agro-stage="use"]'),partners=root.querySelector('[data-agro-stage="destinations"]');
   assert.match(use.textContent,/期末在庫/);assert.match(use.textContent,/未報告消失/);
   assert.match(root.textContent,/地域全体の域外輸出量ではありません/);
   assert.match(partners.textContent,/同じ販売年度・製品換算.*未収録/s);
   assert.equal(partners.querySelector('.agro-partner-pie'),null);
   assert.match(root.textContent,/原表0\.00は丸め値/);
  }finally{await window.happyDOM.close();}
 }
});

test('cotton separates lint, mill use, imported supply and non-food use',async()=>{
 const {window,root}=parse(renderSouthAsiaAgroColumns(data,'BGD','qcl-328-production'));
 try{
  assert.match(root.querySelector('[data-agro-stage="production"]').textContent,/国内生産：0\.15 百万480ポンド俵/);
  const use=root.querySelector('[data-agro-stage="use"]');
  assert.match(use.textContent,/国内利用 8\.2/);assert.match(use.textContent,/輸入 8\.05/);
  assert.match(use.textContent,/紡績投入/);assert.match(use.textContent,/種付き綿花/);
  assert.equal(root.querySelector('.agro-columns').dataset.southAsiaProductBasis,'cotton-lint-production');
  assert.doesNotMatch(root.textContent,/国内消費 0\.15/);
 }finally{await window.happyDOM.close();}
});

test('all eight South Asia forests retain m³, apparent-use limits, and separate unretained pulp t',async()=>{
 for(const country of southAsiaAgroCountries)for(const id of ['roundwood-production','sawnwood-production']){
  const {window,root}=parse(renderSouthAsiaAgroColumns(data,country,id));
  try{
   assert.match(root.querySelector('[data-agro-stage="production"]').textContent,/m³/);
   assert.match(root.textContent,/木材パルプは重量tの別製品/);
   assert.match(root.textContent,/南アジア内の相手を除いた地域域外輸出ではありません/);
   assert.match(root.querySelector('[data-agro-stage="use"]').textContent,/在庫未調整/);
   assert.equal(root.querySelector('[data-agro-stage="destinations"] .agro-partner-pie'),null);
   assert.doesNotMatch(root.textContent,/NaN|Infinity/);
  }finally{await window.happyDOM.close();}
 }
 const {window,root}=parse(renderSouthAsiaAgroColumns(data,'MDV','sawnwood-production'));
 try{assert.match(root.querySelector('[data-agro-stage="use"]').textContent,/76,587 m³/);assert.doesNotMatch(root.querySelector('[data-agro-stage="use"]').textContent,/生産量との比/);}finally{await window.happyDOM.close();}
});

test('the regional renderer falls back without creating new products, countries, years or overview statistics',()=>{
 for(const [country,id,year] of [['','overview',2024],['','invented-product',2024],['IND','overview',2024],['JPN','rice-production',2024],['KAZ','wheat-production',2024],['IND','qcl-191-production',2024],['IND','rice-production',2023]])assert.equal(renderSouthAsiaAgroColumns(data,country,id,year),undefined);
});

test('regional selected production uses the eight-country scope and explicit incomplete coverage, never an India proxy',async()=>{
 const rice=southAsiaRegionalProduction(data,'rice-production');
 assert.equal(rice.count,7);assert.equal(rice.total,304373038);assert.equal(rice.world,820223277.89);
 assert.equal(rice.rows.find(r=>r.code==='MDV').value,null);
 const {window,root}=parse(renderSouthAsiaAgroColumns(data,'','rice-production'));
 try{
  assert.match(root.textContent,/報告7\/8か国の合計（地域完全値ではありません）/);
  assert.match(root.textContent,/304,373,038 t/);assert.match(root.textContent,/37\.11%/);
  assert.equal(root.querySelectorAll('tbody tr').length,8);
  assert.deepEqual([...root.querySelectorAll('.agro-columns>section')].map(n=>n.dataset.agroStage),['production','use','destinations']);
  assert.equal(root.querySelectorAll('.agro-band,.agro-partner-pie').length,0);
  assert.match(root.querySelector('[data-agro-stage="use"]').textContent,/国別の全外国向け輸出.*足し上げません/);
  assert.match(root.querySelector('[data-agro-stage="destinations"]').textContent,/域内8か国を相手から除いた/);
 }finally{await window.happyDOM.close();}
 const sawn=southAsiaRegionalProduction(data,'sawnwood-production');
 assert.equal(sawn.count,8);assert.equal(sawn.total,26806827);assert.equal(sawn.rows.find(r=>r.code==='MDV').value,0);
 const cotton=southAsiaRegionalProduction(data,'qcl-328-production');
 assert.equal(cotton.count,5);assert.equal(cotton.world,null);assert.equal(cotton.share,null);
 const changed=structuredClone(data);changed.countries.IND.series.find(s=>s.id==='rice-production').rows.find(r=>r.year===2024).worldValue++;
 assert.equal(southAsiaRegionalProduction(changed,'rice-production').share,null,'inconsistent World cannot yield a regional ratio');
 changed.countries.IND.series.find(s=>s.id==='rice-production').unit='different-unit';
 assert.equal(southAsiaRegionalProduction(changed,'rice-production').count,6,'a different unit is excluded rather than summed');
});
