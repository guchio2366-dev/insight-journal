import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {africaForestryReading} from '../../src/data/atlas/africa-forestry-reading.ts';

const manifest=JSON.parse(readFileSync(new URL('../../data-source/atlas/africa/manifest.json',import.meta.url)));
const statistics=JSON.parse(readFileSync(new URL('../../src/data/atlas/africa-statistics.json',import.meta.url)));

test('林業の比較は保存済みの国別森林割合を使い、森林分布や固定年を作らない',()=>{
  const forestSource=manifest.sources.find(source=>source.metadata.name==='Forest area (% of land area)');
  assert.equal(africaForestryReading.compareMetric,forestSource.id);
  assert.match(forestSource.metadata.sourceNote,/excludes tree stands in agricultural production systems/);
  assert.match(africaForestryReading.definition,/天然林と人工林/);
  assert.match(africaForestryReading.definition,/果樹園や農業生産の樹木は含みません/);
  assert.deepEqual(africaForestryReading.marks,[]);
  for(const key of ['year','place','compare','zoom'])assert.ok(!Object.hasOwn(africaForestryReading,key));
  assert.equal(statistics.series[africaForestryReading.compareMetric].COD['2021'],55.1615535607949);
  assert.equal(statistics.series[africaForestryReading.compareMetric].GAB['2021'],91.2745760080723);
});

test('森林利用の背景説明はFAO2001に帰属し、選択年の生産量や管理の良否に置き換えない',()=>{
  assert.equal(africaForestryReading.source,'https://www.fao.org/4/y1860e/y1860e04.htm');
  assert.match(africaForestryReading.sourceLabel,/2001/);
  assert.match(africaForestryReading.reading,/2001年.*コンゴ盆地/);
  assert.match(africaForestryReading.reading,/道路・市場/);
  assert.match(africaForestryReading.reading,/土壌・野生生物の生息地/);
  assert.match(africaForestryReading.compareText,/選択した年と国・比較国を保ち/);
  assert.match(africaForestryReading.compareText,/生産量・収益.*管理の良否は判断できません/);
});
