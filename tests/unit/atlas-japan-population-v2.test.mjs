import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { japanPopulationPlaces, getJapanPopulationReading, japanPopulationSources } from '../../src/data/atlas/japan-population-v2.ts';
import { decodeAsiaNumericGrid, readAsiaNumericCell } from '../../src/lib/atlas-asia-numeric-grid.ts';
const assets = new URL('../../public/assets/atlas/', import.meta.url);
const read = path => readFileSync(new URL(path, assets));
const json = path => JSON.parse(read(path));
const manifest = json('japan-population-v2/manifest.json');
const census = json('japan-population-v2/prefectures-2020.json');
const original = JSON.parse(gunzipSync(read('asia-social-v1/east-asia.json.gz')));
const population = json('asia-population-v1/manifest.json');

test('47県の国内2020人口・年齢3区分・不詳は原表抽出値を保ち全国合計に一致する', () => {
 assert.equal(census.referenceDate, '2020-10-01');
 assert.equal(census.unit, '人');
 assert.equal(census.prefectures.length, 47);
 assert.equal(new Set(census.prefectures.map(r => r.id)).size, 47);
 assert.equal(census.national.population, 126146099);
 assert.notEqual(census.national.population, original.national.JPN.total['2020'], 'WDI2020年央値へ置換しない');
 let populationSum = 0;
 const ageSum = {under15: 0, from15to64: 0, from65: 0, unknown: 0};
 for (const row of census.prefectures) {
  const source = original.records.find(r => r.id === 's-' + row.id);
  assert.equal(row.population, source.total['2020']);
  const expectedAge = {under15: source.counts['jp-age-young'], from15to64: source.counts['jp-age-working'], from65: source.counts['jp-age-old'], unknown: source.counts.ageUnknown};
  assert.deepEqual(row.age, expectedAge);
  assert.equal(Object.values(row.age).reduce((a, b) => a + b, 0), row.population, row.id);
  for (const [key, value] of Object.entries(row.age)) {assert.ok(Number.isInteger(value) && value >= 0); ageSum[key] += value;}
  populationSum += row.population;
  assert.equal(row.nationalities, undefined);
 }
 assert.equal(populationSum, census.national.population);
 assert.deepEqual(ageSum, census.national.age);
 assert.equal(census.national.age.unknown, 2931838);
 const known = census.national.population - census.national.age.unknown;
 assert.equal((census.national.age.from65 / known * 100).toFixed(1), '28.7');
});

test('出典hash・年・国内表の原本を固定し現実の解像度と未取得を保つ', () => {
 assert.equal(manifest.populationYear, 2020);
 assert.equal(manifest.urbanBoundaryYear, 2025);
 assert.equal(manifest.nationalNative1kmAvailable, false);
 assert.equal(manifest.nationalDensitySourceCellKm, 5);
 assert.equal(census.source.originalWorkbookSha256, 'd148f2c3c26985fffecd44110e5792295c4e02514e49f1b2eb4764345e9f355a');
 assert.equal(census.source.url, japanPopulationSources.census.url);
 assert.ok(census.source.licenseUrl.endsWith('/terms-of-use'));
 for (const input of manifest.inputs) assert.equal(createHash('sha256').update(read(input.path.replace('public/assets/atlas/', ''))).digest('hex'), input.sha256, input.path);
 for (const [name, file] of Object.entries(manifest.files)) {
  const data = read('japan-population-v2/' + name);
  assert.equal(data.length, file.bytes);
  assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256);
 }
});

test('東京の元1km窓は元資産を無改変保存し全国1kmへ読み替えない', async () => {
 const detail = json('japan-population-v2/tokyo-detail.json');
 const source = population.regions['east-asia'].cities.find(c => c.id === 'uc-5929').detail;
 assert.equal(detail.sourceCellKm, 1);
 assert.equal(detail.noData, -1);
 assert.deepEqual(detail.bounds3857, source.bounds3857);
 for (const name of [detail.image, detail.grid]) assert.deepEqual(read('japan-population-v2/' + name), read('asia-population-v1/' + name));
 const png = read('japan-population-v2/' + detail.image);
 assert.equal(png.readUInt32BE(16), detail.width);
 assert.equal(png.readUInt32BE(20), detail.height);
 const grid = await decodeAsiaNumericGrid(read('japan-population-v2/' + detail.grid), detail, 'float32', -1);
 const tokyo = population.regions['east-asia'].cities.find(c => c.id === 'uc-5929');
 assert.equal(readAsiaNumericCell(grid, ...tokyo.coordinates), Math.fround(tokyo.centroidCellDensity));
 assert.equal(readAsiaNumericCell(grid, 141.32, 43.05), null);
 assert.match(detail.limitations.join(' '), /not national 1 km/);
});

test('3都市域の2025輪郭は元形状と同一で県境・市域へ変換しない', () => {
 const urban = json('japan-population-v2/urban.geojson');
 const originalUrban = json('asia-population-v1/east-asia.urban.json');
 assert.equal(urban.features.length, 3);
 assert.deepEqual(urban.features.map(f => f.id).sort(), ['uc-4399', 'uc-5213', 'uc-5929']);
 for (const f of urban.features) {
  assert.deepEqual(f, originalUrban.features.find(s => s.id === f.id));
  assert.ok(population.regions['east-asia'].cities.find(c => c.id === f.id));
 }
});

test('8都市の参照点に人口量を作らず3つの都市域だけ元位置を保つ', async () => {
 assert.equal(japanPopulationPlaces.length, 8);
 assert.equal(new Set(japanPopulationPlaces.map(p => p.id)).size, 8);
 const nationalRecord = json('japan-v1/population.json');
 const grid = await decodeAsiaNumericGrid(read('japan-v1/population.density.gz'), nationalRecord, 'float32', -200);
 for (const place of japanPopulationPlaces) {
  assert.ok(place.plain && place.overview && place.reason && place.coordinateMethod);
  assert.ok(place.sourceUrl.startsWith('https://'));
  assert.equal(place.population, undefined);
  assert.ok(readAsiaNumericCell(grid, ...place.coordinates) > 0, place.name + 'は既存全国図の正の陸域人口格子に位置');
  if (place.kind === 'urban-centre') assert.deepEqual(place.coordinates, population.regions['east-asia'].cities.find(c => c.id === place.id).coordinates);
 }
 assert.equal(japanPopulationPlaces.filter(p => p.kind === 'urban-centre').length, 3);
 const tokyo = getJapanPopulationReading('density', 'uc-5929');
 assert.match(tokyo.title, /東京.*関東平野/);
 assert.match(tokyo.gap, /全国図.*5km/);
 assert.match(tokyo.gap, /既存資産/);
 assert.deepEqual(getJapanPopulationReading('density', 'not-a-city'), getJapanPopulationReading('density'));
});
