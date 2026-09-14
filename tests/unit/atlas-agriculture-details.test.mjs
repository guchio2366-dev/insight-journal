import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasStatistics} from '../../src/data/atlas/statistics.ts';
import {productionShares,validateProductionTrend} from '../../src/lib/atlas-production-share.ts';
import {readAgricultureDetailState,writeAgricultureDetailState} from '../../src/lib/atlas-agriculture-detail-state.ts';
import {readAtlasState,writeAtlasState} from '../../src/lib/atlas-state.ts';

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
