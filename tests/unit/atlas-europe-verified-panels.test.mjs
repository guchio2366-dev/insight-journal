import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {europeVerifiedTopicMatches} from '../../src/data/atlas/europe/verified-topic-statistics.ts';

const root=new URL('../../src/data/atlas/europe/',import.meta.url);
const data=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
const production=data('europe_production_shares_2023.json');
const food=data('europe_food_composition_2023.json');
const trade=data('trade_europe_2021_value_donuts.json');
const wood=data('europe_wood_key_comparisons_2024.json');
const areas=data('farming-areas.json');

test('selected farming subjects show only verified figures for the same commodity',()=>{
  const topics=new Set(areas.features.map(feature=>feature.properties.id));
  assert.deepEqual(Object.keys(europeVerifiedTopicMatches).sort(),['maize','potato','soybean','wheat']);
  for(const [topic,match] of Object.entries(europeVerifiedTopicMatches)){
    assert.ok(topics.has(topic));
    if(match.productionId)assert.ok(production.items.some(item=>item.id===match.productionId),topic);
    if(match.tradeId)assert.ok(trade.charts.some(chart=>chart.id===match.tradeId),topic);
  }
  assert.equal(europeVerifiedTopicMatches.wheat.productionId,'wheat');
  assert.equal(europeVerifiedTopicMatches.wheat.tradeId,'wheat_export');
  assert.equal(europeVerifiedTopicMatches.soybean.tradeId,'soy_import');
  assert.ok(!europeVerifiedTopicMatches.wheat.tradeId.includes('soy'));
});

test('2023 Europe shares use the published same-item World denominator',()=>{
  assert.equal(production.year,2023);
  assert.match(production.source.geography,/Russian Federation is its whole national/);
  for(const item of production.items){
    assert.ok(Math.abs(item.europe/item.world*100-item.world_share_percent)<.05,item.id);
    assert.ok(item.source_table>0);
  }
});

test('2023 food widths follow nine published kcal groups and no self-sufficiency value is inferred',()=>{
  assert.equal(food.groups.length,9);
  assert.equal(food.groups.reduce((sum,item)=>sum+item.food_kcal_per_capita_per_day,0),food.total_kcal_per_capita_per_day);
  for(const item of food.groups){
    assert.ok(Math.abs(item.food_kcal_per_capita_per_day/food.group_sum_kcal*100-item.width_share_percent)<.06,item.id);
    assert.equal(item.self_sufficiency_percent,null);
  }
});

test('2021 trade donuts close against only identified external partner values',()=>{
  for(const chart of trade.charts){
    assert.equal(chart.year,2021);
    assert.equal(chart.unit,'current USD');
    assert.equal(chart.reporters_queried,40);
    assert.ok(Math.abs(chart.segments.reduce((sum,item)=>sum+item.value_usd,0)-chart.denominator_usd)<.01,chart.id);
    assert.ok(Math.abs(chart.segments.reduce((sum,item)=>sum+item.share_pct,0)-100)<1e-8,chart.id);
    assert.match(chart.scope_note_ja,/同一ではない/);
  }
});

test('2024 wood balances keep stages and countries separate and do not turn stock-free residual into actual use',()=>{
  assert.deepEqual(new Set(wood.balances.map(row=>row.product_code)),new Set(['RW_IN','SN']));
  assert.deepEqual(new Set(wood.balances.map(row=>row.country_code)),new Set(['DE','AT','FI','SE']));
  assert.equal(wood.balances.length,8);
  assert.match(wood.formulas.stocks,/not stock-adjusted/);
  for(const row of wood.balances){
    assert.equal(row.year,2024);
    assert.equal(row.unit,'THS_M3');
    assert.equal(row.stocks,null);
    assert.ok(Math.abs(row.production+row.imports-row.supply)<.02);
    assert.ok(Math.abs(row.supply-row.exports-row.apparent_consumption)<.02);
  }
});
