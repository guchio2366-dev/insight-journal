import test from 'node:test';
import assert from 'node:assert/strict';
import {industryStatRows,industryYears,sourceValue,statValue,sectorTotal,chartRows,industryGdpSource,industryEmploymentSource} from '../../src/data/atlas/industry-statistics.ts';
import {industryRegions} from '../../src/data/atlas/industry-regions.ts';
import {readIndustryState,writeIndustryState} from '../../src/lib/atlas-industry-state.ts';

test('BEA国内雇用とGDPの共通年を使い、全区分の親子合計が原表丸め内で一致する',()=>{
 assert.deepEqual(industryGdpSource.years,industryEmploymentSource.years);
 assert.equal(sectorTotal('all','gdp'),29298);
 assert.equal(sectorTotal('all','employment'),163223);
 assert.notEqual(sectorTotal('all','employment'),sourceValue('employment',1));
 for(const year of industryYears)for(const metric of ['gdp','employment'])for(const [sector,rows] of Object.entries(industryStatRows)){
  const lines=rows.flatMap(r=>r[metric==='gdp'?'gdpLines':'employmentLines']);
  assert.equal(lines.length,new Set(lines).size,`${sector}: no repeated source rows`);
  const precision=metric==='gdp'?.1:1;
  const tolerance=(lines.length+1)*precision/2+1e-6;
  const sum=rows.reduce((s,r)=>s+statValue(r,metric,year),0);
  assert.ok(Math.abs(sum-sectorTotal(sector,metric,year))<=tolerance,`${sector} ${metric} ${year}: ${sum} versus ${sectorTotal(sector,metric,year)}`);
 }
});
test('割合は原値から計算し、２指標の表示区分・順序と分母を揃える',()=>{
 for(const sector of Object.keys(industryStatRows)){
  assert.deepEqual(chartRows(sector,'gdp').map(r=>r.id),chartRows(sector,'employment').map(r=>r.id));
  for(const metric of ['gdp','employment'])for(const r of chartRows(sector,metric))assert.equal(r.share,100*r.value/sectorTotal(sector,metric));
 }
 assert.throws(()=>sourceValue('gdp',999),/Missing BEA/);
});
test('産業URLを正規化し、農業・自然環境・カメラのパラメーターを保持する',()=>{
 const url=new URL('https://example.com/industry/?sector=services&subsector=finance&industryRegion=newyork-finance&crop=rice&city=miami&lng=-90&lat=35&z=4');
 const state=readIndustryState(url,industryRegions);assert.equal(state.industryRegion,'newyork-finance');
 const next=writeIndustryState(url,state);for(const key of ['crop','city','lng','lat','z'])assert.equal(next.searchParams.get(key),url.searchParams.get(key));
 url.searchParams.set('subsector','auto');const invalid=readIndustryState(url,industryRegions);assert.equal(invalid.subsector,'all');
 url.searchParams.set('sector','manufacturing');assert.equal(readIndustryState(url,industryRegions).industryRegion,null);
 url.searchParams.set('sector','garbage');url.searchParams.set('subsector','<script>');assert.equal(readIndustryState(url,industryRegions).sector,'all');
});
test('地域例は出典と対象範囲を持ち、未取得の地域雇用・特化度をゼロに変換しない',()=>{
 assert.equal(new Set(industryRegions.map(r=>r.id)).size,industryRegions.length);
 for(const r of industryRegions){assert.ok(r.source&&r.scope&&r.year&&r.selectionReason);assert.equal(r.employment,null);assert.equal(r.lq,null);assert.ok(r.coordinates[0]>-128&&r.coordinates[0]<-64&&r.coordinates[1]>22&&r.coordinates[1]<52);}
});

test('東端で左へ返すラベルも衝突をまとめ、代表座標と全候補を保つ',async()=>{
 const {groupIndustryMarkers}=await import('../../src/lib/atlas-industry-markers.ts');
 const groups=groupIndustryMarkers([{x:545,y:120,regions:['midwest']},{x:675,y:130,regions:['newyork']},{x:150,y:300,regions:['california']}],720);
 assert.equal(groups.length,2);assert.deepEqual(groups[0].regions,['midwest','newyork']);assert.equal(groups[0].x,545);assert.equal(groups[0].y,120);
 assert.deepEqual(groups.flatMap(g=>g.regions).sort(),['california','midwest','newyork']);
});

test('全産業はサービス親行を重ねず12区分を全米分母で示し、サービス内訳は親分母を保つ',()=>{
 const ids=['agriculture','manufacturing','resources','information','finance','professional','trade-logistics','tourism','health-education','other-services','construction-real-estate','government'];
 for(const metric of ['gdp','employment']){
  const national=chartRows('all',metric),services=chartRows('services',metric);
  assert.deepEqual(national.map(r=>r.id),ids);
  assert.equal(services.length,7);
  for(const service of services){
   const expanded=national.find(r=>r.id===service.id);
   assert.equal(expanded.value,service.value);
   assert.equal(expanded.share,100*service.value/sectorTotal('all',metric));
   assert.equal(service.share,100*service.value/sectorTotal('services',metric));
   assert.ok(service.share>expanded.share);
  }
 }
});
