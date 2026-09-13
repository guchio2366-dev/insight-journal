import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasStatistics, statisticCropIds, statisticsSources } from '../../src/data/atlas/statistics.ts';

const close=(actual,expected,tolerance=0.11)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} ≠ ${expected}`);

test('全米販売高の内訳とその他が総額に一致する',()=>{
 const receipts=atlasStatistics.national.cashReceipts;
 close(receipts.groups.reduce((sum,group)=>sum+group.totalThousandUsd,0),receipts.totalThousandUsd,0.001);
 for(const group of receipts.groups){
  close(group.items.reduce((sum,entry)=>sum+entry.valueThousandUsd,0)+group.reconciliationThousandUsd,group.totalThousandUsd,0.001);
  close(group.items.reduce((sum,entry)=>sum+entry.valueThousandUsd/group.totalThousandUsd*100,0),100,0.11);
 }
 assert.deepEqual(receipts.groups.map(group=>group.id),['crops','livestock']);
 assert.equal(receipts.groups[0].items.length,11);assert.equal(receipts.groups[1].items.length,5);
 assert.equal(receipts.status,'estimate');assert.equal(receipts.year,2025);
});

test('各作物の輸出先内訳が同じ基準の総輸出量に一致する',()=>{
 for(const id of statisticCropIds){
  const data=atlasStatistics.exports[id];
  close(data.destinations.reduce((sum,entry)=>sum+entry.value,0),data.total,0.11);
  assert.equal(data.destinations.length,6,id);assert.equal(data.year,2025,id);
 }
 assert.match(atlasStatistics.exports.rice.unit,/milled-equivalent/);
 assert.match(atlasStatistics.exports.cotton.basis,/excluding linters/);
});

test('世界生産と米国シェアは同じ年・単位の10年系列で整合する',()=>{
 for(const id of statisticCropIds){
  const data=atlasStatistics.production[id];const latest=data.trend.at(-1);
  assert.equal(data.trend.length,10,id);assert.equal(latest.year,data.marketYear,id);
  close(latest.share,latest.us/latest.world*100,0.001);
  close(latest.world,data.worldTotal,0.001);
  assert.ok(data.countries.some(entry=>entry.code==='US'),id);
 }
 assert.equal(atlasStatistics.production.rice.basis,'Rice, Milled');
 assert.equal(atlasStatistics.production.cotton.unit,'1000 480 lb. Bales');
});

test('統計系列ごとに公式出典、対象日、取得日、定義注記がある',()=>{
 assert.ok(statisticsSources.length>=5);
 for(const source of statisticsSources){assert.match(source.url,/^https:\/\//);assert.ok(source.releaseDate);assert.ok(source.retrievedAt);assert.ok(source.note.length>20);}
});
