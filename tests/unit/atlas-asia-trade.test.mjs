import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {normalizeTradeState,tradeChapter,tradeValue,tradeShare,tradeScale,formatTradeMoney,partnerName,farmTrade} from '../../src/data/atlas/asia-trade.ts';
const root=new URL('../../public/assets/atlas/asia-trade-v1/',import.meta.url);
const read=file=>JSON.parse(file.endsWith('.gz')?gunzipSync(readFileSync(new URL(file,root))):readFileSync(new URL(file,root),'utf8'));
const manifest=read('manifest.json'),provenance=read('provenance.json');
const countries=Object.assign({},...Object.values(manifest.regions).map(r=>read(r.file).countries));

test('貿易は30対象を同年で扱い、インドの現行区分・台湾等の別区分・5対象の欠測を保持する',()=>{
 assert.equal(Object.keys(countries).length,30);assert.equal(countries.IND.reporterCode,699);assert.equal(countries.TWN.reporterCode,490);assert.equal(countries.CHN.reporterCode,156);
 assert.deepEqual(Object.keys(countries).filter(c=>!Object.keys(countries[c].products).length).sort(),['AFG','BGD','NPL','PRK','TKM']);
 assert.equal(Math.round(countries.JPN.products.TOTAL.X/1e9*100)/100,717.22);assert.equal(Math.round(countries.IND.products.TOTAL.X/1e9*100)/100,431.41);
 assert.equal(provenance.queries.length,135);assert.equal(provenance.records,17236);
 assert.ok(provenance.queries.every(q=>q.count<500&&q.sha256.length===64&&q.url.includes('period=2023')));
 assert.equal(provenance.queries.reduce((n,q)=>n+q.count,0),provenance.records);
});
test('2桁の商品章と相手先は世界総額に一致し、4桁品目や世界・グループを二重計上しない',()=>{
 for(const c of Object.values(countries)){
  if(!c.products.TOTAL)continue;
  for(const flow of ['X','M']){const total=c.products.TOTAL[flow],sum=Object.entries(c.products).filter(([code])=>code.length===2).reduce((s,[,v])=>s+(v[flow]??0),0);assert.ok(Math.abs(sum-total)<=Math.max(1,total*1e-6));}
  assert.equal(c.topChapters.length,3);assert.ok(c.topChapters.every(c=>c.length===2&&c!=='99'));
  assert.deepEqual(Object.keys(c.partners).sort(),['TOTAL',...c.topChapters].sort());
  for(const [chapter,p] of Object.entries(c.partners)){
   assert.equal(new Set(p.values.map(v=>v[0])).size,p.values.length);assert.ok(p.values.every(v=>v[0]!==0&&v[1]>=0));
   assert.ok(Math.abs(p.world-c.products[chapter].X)<=Math.max(1,p.world*1e-6));assert.ok(Math.abs(p.values.reduce((n,v)=>n+v[1],0)-p.world)<=Math.max(1,p.world*1e-6));
  }
 }
});
test('未掲載・0・小額を区別し、全商品の分母とHSのURLを検証する',()=>{
 assert.equal(tradeValue(undefined,'TOTAL','X'),null);assert.equal(tradeValue({products:{'01':{X:0}}},'01','X'),0);
 assert.equal(formatTradeMoney(null),'未掲載');assert.equal(formatTradeMoney(0),'0');assert.equal(formatTradeMoney(500),'0.01未満');assert.equal(tradeShare(null,2),null);assert.equal(tradeShare(1,0),null);
 assert.notEqual(tradeScale([100,0,null]).color(0),tradeScale([100,0,null]).color(null));
 for(const detail of ['JP-23','t-<script>','t-77','t-98','t-TOTAL'])assert.equal(normalizeTradeState({field:'industry',topic:'trade-exports',detail},manifest.chapters).detail,null);
 const valid=normalizeTradeState({field:'industry',topic:'trade-imports',detail:'t-85',point:[120,30]},manifest.chapters);assert.equal(tradeChapter(valid),'85');assert.deepEqual(valid.point,[120,30]);
 assert.match(partnerName(490),/台湾/);assert.match(partnerName(842),/領域/);assert.equal(partnerName(276,{iso2:'DE',name:'Germany'}),'ドイツ');
 for(const [topic,mapping] of Object.entries(farmTrade)){assert.ok(mapping.note.length>20,topic);assert.ok(mapping.codes.every(c=>c.length===4));for(const c of mapping.codes)assert.ok(Object.values(countries).some(r=>Object.hasOwn(r.products,c)),c);}
});
