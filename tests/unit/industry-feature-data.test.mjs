import test from 'node:test';
import assert from 'node:assert/strict';
import {
  automotiveObservations,
  coordinateNote,
  sectors,
  sources,
} from '../../src/data/atlas/industry-feature.ts';

const sector = id => sectors.find(item => item.id === id);
const source = id => sources.find(item => item.id === id);
const countries = item => item.regions.flatMap(region => region.countries);
const allText = item => JSON.stringify(item);

test('自動車は2025年のCars新車販売に揃え、動力と車型を同じ集計にしない', () => {
  assert.equal(automotiveObservations.length, 9);
  assert.equal(new Set(automotiveObservations.map(item => item.country)).size, 9);
  for (const item of automotiveObservations) {
    assert.equal(item.period, '2025');
    assert.equal(item.metric, 'new-car-plugin-sales-share');
    assert.equal(item.application, 'Cars');
    assert.equal(item.technology, 'BEV+PHEV');
    assert.equal(item.unit, '%');
    assert.match(item.scope, /新車販売/);
    assert.match(item.scope, /地域平均.*保有台数.*生産比率.*ではない/);
    assert.deepEqual(item.sourceIds, ['ev-sales']);
  }
  assert.match(sector('automotive').scope, /トラック・バス/);
  assert.match(sector('automotive').caution, /動力別×車型別.*未収録/);
  assert.match(allText(sector('automotive').steps), /SUV.*車型/);
});

test('上下限や概数を確定値へ変えず、百分率の0にも置き換えない', () => {
  const expectedBounds = new Map([
    ['USA', ['upper', 10]], ['MEX', ['lower', 7]], ['JPN', ['upper', 3]],
  ]);
  for (const item of automotiveObservations) {
    assert.equal(item.value, null, `${item.country}: 概数・上下限は確定値ではない`);
    const expected = expectedBounds.get(item.country);
    if (expected) {
      assert.deepEqual(item.bound, { kind: expected[0], value: expected[1], inclusive: false });
      assert.equal(item.approximateValue, null);
      assert.equal(item.qualifier, expected[0] === 'upper' ? 'less_than' : 'greater_than');
      assert.match(item.displayValue, /未満|超/);
    } else {
      assert.equal(item.qualifier, 'approx');
      assert.equal(item.bound, null);
      assert.ok(Number.isFinite(item.approximateValue) && item.approximateValue > 0);
      assert.match(item.displayValue, /^約/);
    }
  }
  assert.match(sector('automotive').comparisonNote, /確定値.*変換しません/);
});

test('EUの能力と導入は独立した27加盟国集計で、個別国へ複写しない', () => {
  const europe = sector('battery').regions.find(item => item.id === 'europe');
  const eu = europe.countries.find(item => item.id === 'EU');
  assert.ok(eu, 'EU集計への独立した入口が必要');
  assert.match(eu.name, /27加盟国/);
  assert.match(eu.countryNote, /EU27加盟国の集計/);
  assert.match(eu.countryNote, /欧州全体.*国別値ではありません/);
  assert.match(eu.marketLabel, /EV電池導入.*15%弱.*2025年.*EU集計/);
  assert.match(eu.manufacturingLabel, /セル銘板能力.*6〜7%.*2025年末.*EU集計/);
  assert.deepEqual(eu.sourceIds, ['battery']);
  for (const id of ['DEU', 'FRA', 'NOR']) {
    const country = europe.countries.find(item => item.id === id);
    assert.ok(country);
    assert.match(country.marketLabel, /未収録/);
    assert.match(country.manufacturingLabel, /未収録/);
    assert.doesNotMatch(country.marketLabel + country.manufacturingLabel, /15%|6[〜–-]7%/);
  }
  assert.match(europe.countries.find(item => item.id === 'NOR').countryNote, /EU.*含めません/);
  assert.match(sector('battery').scope, /能力はEV・定置.*導入はEV電池容量/);
  assert.match(sector('battery').comparisonNote, /4TWh超.*1\.2TWh/);
});

test('太陽光の工程・能力年を保持し、未確認PVOUTを定量データとして出さない', () => {
  const solar = sector('solar');
  assert.match(solar.comparisonTitle, /ウエハー.*約95%.*2024年/);
  assert.match(solar.comparisonNote, /2025年末.*27GW.*1\.5GW.*10GW.*33GW/);
  assert.match(solar.comparisonNote, /世界比とGWは別指標/);
  assert.match(solar.caution, /PVOUT.*未確認.*数値.*未収録|PVOUT.*未確認.*精密.*未収録/);
  assert.match(source('solar-potential').licenseStatus, /未確認.*使用しない/);
  assert.match(source('solar-europe').notes, /図転載条件は未確認/);
  const us = solar.regions.find(item => item.id === 'north-america').example;
  assert.match(us.description, /40ポイント増加/);
  assert.match(us.description, /40%という意味ではありません/);
  assert.match(us.status, /推定/);
});

test('半導体87%は上位5経済の合計であり、国別値や建設中の実績ではない', () => {
  const chip = sector('semiconductor');
  assert.match(chip.primaryMetric, /上位5経済.*合計87%/);
  assert.match(chip.caution, /2025年9月.*合計.*87%.*国別へ配分しません/);
  assert.match(chip.comparisonNote, /Chinese Taipei/);
  for (const country of countries(chip)) {
    assert.doesNotMatch(country.marketLabel + country.manufacturingLabel, /\d+(?:\.\d+)?%/,
      `${country.id}: 合計能力比を国別比率に配分しない`);
  }
  const arizona = chip.regions.find(item => item.id === 'north-america').example;
  assert.match(arizona.status, /量産.*初期工事/);
  assert.match(arizona.period, /2024年第4四半期.*2026年初/);
  const dresden = chip.regions.find(item => item.id === 'europe').example;
  assert.match(dresden.status, /建設中/);
  assert.match(dresden.scope, /将来能力.*稼働実績.*合算しません/);
});

test('日本の蓄電池150GWh/年は2030年代半ばの将来目標で、旧2030年目標と混ぜない', () => {
  const asia = sector('battery').regions.find(item => item.id === 'asia');
  const japan = asia.countries.find(item => item.id === 'JPN');
  assert.match(japan.manufacturingLabel, /150GWh\/年.*2030年代半ば.*目標/);
  assert.match(asia.japan, /将来目標/);
  assert.match(source('japan-battery').notes, /目標時期は2030年代半ば/);
  assert.equal(source('japan-battery').publishedAt, '2026-06-02');
  assert.doesNotMatch(japan.manufacturingLabel, /2030年まで/);
});

test('出典は重複・参照切れなく、一次機関のHTTPS URLと確認日・利用条件を持つ', () => {
  const officialHosts = new Set([
    'www.iea.org', 'global.toyota', 'pressroom.toyota.com', 'www.irs.gov',
    'www.volkswagen-newsroom.com', 'policy.trade.ec.europa.eu', 'www.byd.com',
    'www.chinatax.gov.cn', 'afdc.energy.gov', 'globalsolaratlas.info',
    'www.enecho.meti.go.jp', 'www.meti.go.jp', 'www.oecd.org', 'www.tsmc.com',
    'investor.tsmc.com', 'www.nist.gov',
  ]);
  const ids = new Set(sources.map(item => item.id));
  assert.equal(ids.size, sources.length);
  for (const item of sources) {
    const url = new URL(item.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(officialHosts.has(url.hostname), `${item.id}: ${url.hostname}`);
    assert.match(item.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    if (item.publishedAt !== null) assert.match(item.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.title && item.publisher && item.licenseStatus && item.notes);
  }
  const checkRefs = (refs, location) => {
    assert.ok(refs.length, `${location}: 出典が必要`);
    assert.equal(new Set(refs).size, refs.length, `${location}: 出典参照を重複しない`);
    for (const id of refs) assert.ok(ids.has(id), `${location}: 未解決の出典 ${id}`);
  };
  for (const item of automotiveObservations) checkRefs(item.sourceIds, item.id);
  assert.equal(new Set(sectors.map(item => item.id)).size, sectors.length);
  for (const item of sectors) {
    assert.ok(item.period && item.scope && item.primaryMetric && item.caution);
    checkRefs(item.sourceIds, item.id);
    assert.equal(new Set(item.regions.map(region => region.id)).size, item.regions.length);
    for (const region of item.regions) {
      assert.equal(new Set(region.countries.map(country => country.id)).size, region.countries.length);
      assert.ok(region.example.period && region.example.status && region.example.scope);
      checkRefs(region.example.sourceIds, `${item.id}/${region.id}/example`);
      for (const country of region.countries) checkRefs(country.sourceIds, `${item.id}/${country.id}`);
    }
  }
  assert.match(source('chip-capacity').licenseStatus, /第三者.*別条件/);
  assert.match(source('tsmc-arizona').licenseStatus, /転載しない/);
});

test('地図ラベルは短く、国代表点を施設座標や実輸送線と誤認させない', () => {
  assert.match(coordinateNote, /概略位置/);
  assert.match(coordinateNote, /工場の所在地.*輸送経路.*示しません/);
  for (const item of sectors) for (const country of countries(item)) {
    assert.ok(country.mapMarketLabel && country.mapMarketLabel.length <= 8);
    assert.ok(country.mapManufacturingLabel && country.mapManufacturingLabel.length <= 8);
    assert.ok(country.coordinates[0] >= -180 && country.coordinates[0] <= 180);
    assert.ok(country.coordinates[1] >= -90 && country.coordinates[1] <= 90);
  }
});
