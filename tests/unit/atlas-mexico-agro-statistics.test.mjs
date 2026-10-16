import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const data=JSON.parse(readFileSync('src/data/atlas/mexico/agro-statistics-20261016.json'));
const bundled=await build({entryPoints:['src/lib/atlas-mexico-agro-statistics.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const dom=(html,run)=>{const w=new Window();try{w.document.body.innerHTML=html;run(w.document.body);}finally{w.close();}};

test('Mexico balances and references reproduce from their exact retained sources without downloads',()=>{
 for(const source of data.sources)assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),source.sha256,source.path);
 const regenerated=execFileSync('python',['-c',"import importlib.util,json; s=importlib.util.spec_from_file_location('mexico','scripts/prepare-mexico-agro-statistics.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps(m.build(),ensure_ascii=False))"],{encoding:'utf8'});
 assert.deepEqual(JSON.parse(regenerated),data);
 const fault=execFileSync('python',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('mexico','scripts/prepare-mexico-agro-statistics.py')
m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
original=m.retained
def corrupted(path):
    text=original(path)
    return text.replace('"48135100"','"48135101"') if path.endswith('wits-090111.csv') else text
m.retained=corrupted
try:
    m.build()
except ValueError as e:
    assert 'transcription disagrees' in str(e)
    print('transcription fault rejected')
else:
    raise AssertionError('a changed CSV must disagree with the observed official table')
`],{encoding:'utf8'});
 assert.match(fault,/transcription fault rejected/);
 assert.deepEqual(data.balances.map(r=>r.productId).sort(),['cotton','rice','sorghum','wheat']);
 assert.deepEqual(data.tradeReferences.map(r=>r.productId).sort(),['coffee','corn','cotton','pine']);
 assert.equal(api.mexicoAgroBalance('beans'),undefined);
 assert.equal(api.mexicoTradeReference('fruit'),undefined,'a banana reference must not stand in for all fruit');
});

test('WASDE Mexico cotton and rice retain the historical same-page country and World rows and processing stages',()=>{
 const raw=readFileSync('scripts/data/wasde0926.txt','utf8');
 for(const [id,production,domestic,exports,world,page] of [['cotton',1,1.35,0.18,119.53,26],['rice',0.17,1,0.03,542.3,24]]){
  const r=api.mexicoAgroBalance(id);
  assert.deepEqual([r.production,r.domesticUse,r.exports,r.worldProduction,r.source.page],[production,domestic,exports,world,page]);
  assert.equal(r.year,'2024/25');assert.equal(r.exportDestinations,null);
  const body=raw.split(`WASDE - 675 - ${page}`)[1].split(`WASDE - 675 - ${page+1}`)[0];
  const historical=body.split('2024/25')[1].split('2025/26')[0];
  assert.ok(historical.includes(r.rawLine));assert.ok(historical.includes(r.worldRawLine));
  assert.equal(r.worldProduction,Number(r.worldProductionRawValue));
  assert.ok(Math.abs(r.beginningStocks+r.production+r.imports-r.domesticUse-r.exports-r.endingStocks-r.lossAdjustment)<=r.roundingTolerance);
 }
 const cotton=api.mexicoAgroBalance('cotton'),rice=api.mexicoAgroBalance('rice');
 assert.match(cotton.unit,/480.*俵/);assert.match(cotton.label,/繰綿/);
 assert.match(cotton.notes.join(' '),/種付き綿.*合算せず.*tへ換算しません/);
 assert.match(rice.label,/精米換算/);assert.match(rice.notes.join(' '),/籾米.*差し引かず/);
});

test('GAIN takes only 2024/25 USDA Official, retains feed/residual and FSI as subsets and keeps World unavailable',()=>{
 for(const [id,expected,start,end] of [
  ['wheat',[775,2648,5607,8100,135,795],'2024-07-01','2025-06-30'],
  ['sorghum',[269,4200,562,4800,1,230],'2024-10-01','2025-09-30'],
 ]){
  const r=api.mexicoAgroBalance(id);
  assert.deepEqual(['beginningStocks','production','imports','domesticUse','exports','endingStocks'].map(k=>r[k]),expected);
  assert.equal(r.worldProduction,null);assert.equal(r.worldRawLine,null);
  assert.equal(r.unit,'千t');assert.equal(r.periodStart,start);assert.equal(r.periodEnd,end);
  assert.equal(r.domesticParts.reduce((sum,p)=>sum+p.value,0),r.domesticUse);
  assert.match(r.domesticParts[0].label,/飼料・残差/);assert.match(r.domesticParts[1].label,/食用・種子・工業用/);
  assert.notEqual(r.production-r.exports,r.domesticUse);
  assert.equal(r.beginningStocks+r.production+r.imports,r.domesticUse+r.exports+r.endingStocks);
  dom(api.renderMexicoAgroProduction(r)+api.renderMexicoAgroUse(r),root=>{
   assert.equal(root.querySelector('.agro-world-pie'),null);
   assert.match(root.textContent,/世界生産分母は未収録/);
   assert.equal(root.querySelectorAll('.agro-band').length,2);
   assert.match(root.querySelector('[data-mexico-domestic-subsets]').textContent,/内数.*重ねて加算しません/);
  });
 }
 // The adjacent New Post column differs materially; neither value may leak.
 assert.equal(api.mexicoAgroBalance('wheat').domesticUse,8100);
 assert.equal(api.mexicoAgroBalance('sorghum').production,4200);
});

test('public-table references keep quantities, World rounding differences, Mexico borders and distinct periods explicit',()=>{
 for(const r of data.tradeReferences){
  assert.equal(r.balanceCompatible,false);assert.equal(r.reporter,'MEX');assert.equal(r.periodType,'calendar-year');assert.equal(r.year,2024);assert.equal(r.classification,'H0');
  assert.equal(r.tradeFlow,'gross-exports');assert.equal(r.scope,'national-cross-border');
  assert.equal(new Set(r.partners.map(p=>p.originalName)).size,r.partners.length);
  assert.ok(r.partners.every(p=>p.originalName!=='Mexico'&&p.originalName!=='World'));
  assert.ok(Math.abs(r.partners.reduce((s,p)=>s+p.value,0)-r.partnerTotal)<1e-6);
  assert.ok(Math.abs(r.partnerTotal-r.worldExports-r.partnerRoundingGap)<1e-6);
  assert.equal(r.worldExports,Number(r.worldExportsRawValue)/r.conversionDivisor);
  for(const p of r.partners)assert.equal(p.value,Number(p.rawValue)/r.conversionDivisor);
  dom(api.renderMexicoTradeReference(r),root=>{
   const ref=root.querySelector('[data-mexico-trade-reference]');assert.equal(ref.open,false);
   assert.equal(ref.querySelectorAll('tbody tr').length,r.partners.length);
   assert.match(ref.textContent,/掲載された全.*相手.*数量合計/);
   assert.match(ref.textContent,/北米全体の域外貿易ではありません/);
   assert.match(ref.textContent,/再輸出を分離できず/);
   assert.ok(ref.querySelector('.agro-partner-pie').getAttribute('aria-label').includes(r.unit));
  });
 }
 assert.equal(api.mexicoTradeReference('corn').partnerRoundingGap,0.043);
 assert.equal(api.mexicoTradeReference('cotton').partnerRoundingGap,0.002);
 assert.equal(api.mexicoTradeReference('coffee').partnerRoundingGap,-0.03);
 const pine=api.mexicoTradeReference('pine');assert.equal(pine.unit,'m³');assert.equal(pine.worldExports,57368);
 assert.match(pine.explanation,/全針葉樹.*松だけ.*年・製品が異なり/);
});

test('coffee concentration and other-partner slice use the full returned partner denominator, with no invented residual country',()=>{
 const r=api.mexicoTradeReference('coffee'),all=r.partners.reduce((s,p)=>s+p.value,0);
 dom(api.renderMexicoTradeReference(r),root=>{
  assert.equal(root.querySelectorAll('.agro-key>li').length,6);
  const us=root.querySelector('.agro-key>li');assert.match(us.textContent,/米国.*48,135\.1 t.*64\.16%/);
  const other=root.querySelector('.agro-key>li:last-child');
  const expected=r.partners.slice(5).reduce((s,p)=>s+p.value,0);
  assert.match(other.textContent,new RegExp(expected.toLocaleString('ja-JP',{maximumFractionDigits:3}).replaceAll('.','\\.')));
  assert.equal((r.partners[0].value/all*100).toFixed(2),'64.16');
 });
 dom(api.renderMexicoTradeReference(api.mexicoTradeReference('pine')),root=>{
  assert.equal(root.querySelectorAll('.agro-key>li').length,1);assert.match(root.textContent,/米国.*57,368 m³.*100\.00%/);
  assert.doesNotMatch(root.textContent,/その他の掲載相手/);
 });
});

test('renderer rejects compatible-balance claims, duplicate partners, missing quantities and incorrect denominators',()=>{
 const reference=api.mexicoTradeReference('coffee');
 for(const mutate of [r=>r.balanceCompatible=true,r=>r.partnerTotal++,r=>r.partners.push({...r.partners[0]}),r=>r.partners[0].value=null,r=>r.partners[0].originalName='Mexico',r=>r.worldExports+=100,r=>r.worldExports=NaN,r=>r.partnerTotal=NaN,r=>r.partnerRoundingGap=NaN,r=>r.partnerRoundingGap++,r=>r.roundingTolerance=NaN]){
  const copy=structuredClone(reference);mutate(copy);assert.throws(()=>api.renderMexicoTradeReference(copy),/invalid scope, quantity or denominator/);
 }
});
