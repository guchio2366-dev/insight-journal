import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasStatistics} from '../../src/data/atlas/statistics.ts';
import {productionShares,validateProductionTrend} from '../../src/lib/atlas-production-share.ts';
import {readAgricultureDetailState,writeAgricultureDetailState} from '../../src/lib/atlas-agriculture-detail-state.ts';
import {readAtlasState,writeAtlasState} from '../../src/lib/atlas-state.ts';
import {livestockStatistics,supplySegments} from '../../src/data/atlas/livestock-statistics.ts';
import {readFileSync} from 'node:fs';

test('世界総量を分割し、上位外の米国と実数どおりの小さい米シェアを保持',()=>{
  const expected={corn:317257,soybean:51925,wheat:289202,cotton:26524,rice:142236};
  for(const [id,data] of Object.entries(atlasStatistics.production)){
    const rows=productionShares(data.worldTotal,data.countries);
    assert.equal(rows.at(-1).value,expected[id]);
    assert.equal(rows.reduce((s,r)=>s+r.value,0),data.worldTotal);
    const us=rows.find(r=>r.code==='US');assert.ok(us);
    validateProductionTrend(data.trend,data.worldTotal,us.value);
    assert.ok(Math.abs(rows.reduce((s,r)=>s+r.share,0)-100)<1e-10);
  }
  const rice=productionShares(atlasStatistics.production.rice.worldTotal,atlasStatistics.production.rice.countries);
  assert.equal(rice.length,7);assert.ok(rice.find(r=>r.code==='US').share<1.4);
});

test('重複集計・負のその他・欠年・欠測値は図を作る前に失敗',()=>{
  const us={code:'US',country:'United States',value:1};
  for(const [total,rows] of [[0,[us]],[10,[us,us]],[.5,[us]],[10,[{...us,value:NaN}]],[10,[us,{code:'E4',country:'EU',value:2},{code:'FR',country:'France',value:1}]]])assert.throws(()=>productionShares(total,rows));
  assert.throws(()=>validateProductionTrend([{year:2022,us:1,world:10,share:10},{year:2024,us:1,world:10,share:10}],10,1));
});

test('詳説query・hashの優先順位、旧hash更新、分野往復と乳換算を保持',()=>{
  const url=new URL('https://example.com/atlas/agriculture/?stats=rice&livestockStats=hogs&milkBasis=skim#livestock-dairy');
  assert.deepEqual(readAgricultureDetailState(url),{stats:'rice',livestockStats:'dairy',milkBasis:'skim'});
  const next=writeAgricultureDetailState(url,{stats:'rice',livestockStats:'layers',milkBasis:'skim'});
  assert.equal(next.hash,'#livestock-layers');
  const nature=writeAtlasState(next,'/atlas/','natural',undefined,null,null,'rice','fit');
  assert.equal(readAtlasState(nature).livestockStats,'layers');assert.equal(readAtlasState(nature).milkBasis,'skim');
  assert.deepEqual(readAgricultureDetailState(new URL('https://example.com/?stats=x&livestockStats=x&milkBasis=x#livestock-x')),{stats:'corn',livestockStats:'beef',milkBasis:'fat'});
});

test('畜産6収支は公表精度・丸め差・卵のふ化用・市場出荷を保持',()=>{
  for(const [id,d] of Object.entries(livestockStatistics.supply)){
    const {supply,uses}=supplySegments(id);
    const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7);
    close(supply.reduce((s,r)=>s+r.value,0)-d.totalSupply,d.supplyDifference);
    close(uses.reduce((s,r)=>s+r.value,0)-d.totalSupply,d.useDifference);
    assert.ok(Math.abs(d.supplyDifference)<=d.supplyTolerance);assert.ok(Math.abs(d.useDifference)<=d.useTolerance);
    if(id.startsWith('dairy'))close(d.rawMilkProduction-d.farmUse,d.production);
  }
  assert.equal(livestockStatistics.supply.layers.hatching,1163.8);
  assert.equal(livestockStatistics.supply.hogs.useDifference,1);
  assert.equal(livestockStatistics.supply.layers.useDifference,.1);
  assert.equal(livestockStatistics.supply['dairy-fat'].totalSupply,251.1);
  assert.equal(livestockStatistics.supply['dairy-skim'].totalSupply,246.6);
});

test('畜産世界系列は原表の世界・米国を分母分子にし、5分類とも共通の10年を持つ',()=>{
  const raw=JSON.parse(readFileSync('data-source/atlas/livestock/faostat-qcl-2024-extract.json','utf8'));
  for(const d of Object.values(livestockStatistics.production)){
    const rows=productionShares(d.worldTotal,d.countries);validateProductionTrend(d.trend,d.worldTotal,rows.find(r=>r.code==='US').value);
    assert.deepEqual(d.trend.map(r=>r.year),Array.from({length:10},(_,i)=>2015+i));
    for(const r of d.trend)for(const [area,key] of [['231','us'],['5000','world']]){
      const source=raw.filter(x=>x['Item Code']===d.itemCode&&x['Year']===String(r.year)&&x['Area Code']===area);
      assert.equal(source.length,1);assert.equal(r[key],Number(source[0].Value));
    }
    assert.equal(rows.at(-1).value,d.worldTotal-d.countries.reduce((s,r)=>s+r.value,0));
  }
});

test('輸出製品コードが重複せず、相手先と乳製品内訳が同じ総額に一致',()=>{
  const codebook=JSON.parse(readFileSync('data-source/atlas/livestock/product-codebook.json','utf8'));
  for(const [id,d] of Object.entries(livestockStatistics.exports)){
    assert.equal(d.destinations.reduce((s,r)=>s+r.value,0),d.totalUsd);
    assert.equal(codebook[id].included.reduce((s,r)=>s+r.valueUsd,0),d.totalUsd);
    assert.equal(new Set(d.codes).size,d.codes.length);assert.equal(d.year,2025);
    assert.ok(codebook[id].excluded.every(r=>!d.codes.includes(r.code)));
  }
  const d=livestockStatistics.exports.dairy;
  assert.equal(d.products.reduce((s,r)=>s+r.valueUsd,0),d.totalUsd);
  assert.deepEqual(d.products.flatMap(r=>r.codes).sort(),[...d.codes].sort());
  assert.ok(livestockStatistics.exports.broilers.codes.every(c=>c.startsWith('02071')||c.startsWith('160232')||c==='1601000010'));
  assert.ok(!livestockStatistics.exports.layers.codes.some(c=>c.startsWith('04071')||c==='0407290000'||c==='3502900000'));
  assert.equal(livestockStatistics.exports.broilers.totalUsd,4756946998);
  assert.equal(livestockStatistics.exports.layers.totalUsd,360105802);
});
