import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cityClimateGeography, climateGeographyScope } from '../../src/data/atlas/europe/climate-geography.ts';

const cities = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/climate-cities.json', import.meta.url)));
const cityClasses = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/map-labels.json', import.meta.url))).cityClasses;

test('観測都市全24地点に地理的要因と確認した原典を対応させ、定義だけを理由にしない', () => {
  assert.deepEqual(Object.keys(cityClimateGeography).sort(), cities.map(city => city.id).sort());
  assert.equal(new Set(Object.values(cityClimateGeography).map(entry => entry.body)).size, cities.length);
  for (const city of cities) {
    const entry = cityClimateGeography[city.id];
    assert.match(entry.body, /大西洋|海|内陸|平原|台地|高緯度|山地|日射/);
    assert.match(entry.body, /運び|作用|和らげ|弱|冷|抑え|強ま|強め|持ち上げ/);
    assert.ok(entry.sources.length > 0);
    for (const source of entry.sources) {
      assert.ok(source.label);
      assert.equal(new URL(source.url).protocol, 'https:');
    }
  }
  assert.match(cityClimateGeography.london.body, /大西洋.*偏西風.*湿った空気/);
  assert.match(cityClimateGeography.bergen.body, /山地.*持ち上げ.*雨/);
  assert.match(cityClimateGeography.moscow.body, /日射.*内陸/);
  assert.match(cityClimateGeography.lisbon.body, /高気圧.*下降.*雲/);
});

test('地理的な説明は未収録の気候区分を補造せず、都市位置からの解釈を明示する', () => {
  assert.equal(cityClasses.athens, undefined);
  assert.equal(cityClasses.reykjavik, undefined);
  for (const id of ['athens', 'reykjavik']) {
    assert.ok(cityClimateGeography[id].body);
    assert.equal(Object.hasOwn(cityClimateGeography[id], 'code'), false);
  }
  assert.match(climateGeographyScope, /都市の位置.*読み方/);
  assert.match(climateGeographyScope, /因果分析.*再判定ではありません/);
});
