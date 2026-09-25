import test from 'node:test';
import assert from 'node:assert/strict';
import { asiaClimateCities } from '../../src/data/atlas/asia-climate-cities.ts';

const regions = {
  'east-asia': new Set('CHN JPN KOR MNG PRK TWN'.split(' ')),
  'southeast-asia': new Set('BRN IDN KHM LAO MMR MYS PHL SGP THA TLS VNM'.split(' ')),
  'south-central-asia': new Set('AFG BGD BTN IND KAZ KGZ LKA MDV NPL PAK TJK TKM UZB'.split(' ')),
};
const byId = new Map(asiaClimateCities.map(city => [city.id, city]));

test('都市の選択IDは重複せず、対象地域・国と観測所の出典を保持する', () => {
  assert.equal(byId.size, asiaClimateCities.length);
  for (const [region, countries] of Object.entries(regions)) {
    const cities = asiaClimateCities.filter(city => city.regionId === region);
    assert.ok(cities.length >= 12, `${region}: minimum published coverage regressed`);
    for (const city of cities) assert.ok(countries.has(city.countryCode), `${city.id}: wrong region/country`);
  }
  assert.deepEqual(
    [...new Set(asiaClimateCities.filter(city => city.regionId === 'east-asia').map(city => city.countryCode))].sort(),
    [...regions['east-asia']].sort(),
    'all six East Asian countries/territories must remain represented',
  );
  for (const city of asiaClimateCities) {
    assert.ok(regions[city.regionId], city.id);
    assert.match(city.id, /^[a-z][a-z0-9-]+$/, city.id);
    assert.ok(city.name && city.stationId && city.stationName, city.id);
    assert.equal(city.normalPeriod, '1991–2020', city.id);
    for (const url of [city.sourceUrl, city.sourceTermsUrl, ...(city.additionalSourceUrls ?? [])]) {
      assert.equal(new URL(url).protocol, 'https:', `${city.id}: source URL`);
    }
    assert.match(city.sourceRetrievedAt, /^\d{4}-\d{2}-\d{2}$/, city.id);
    assert.ok(city.sourceSha256.length > 0, city.id);
    for (const hash of city.sourceSha256) assert.match(hash, /^[a-f0-9]{64}$/, city.id);
  }
});

test('1〜12月の平年値を有限値またはnullで保持し、欠測一覧と描画範囲に一致する', () => {
  for (const city of asiaClimateCities) {
    assert.equal(city.temperatureC.length, 12, `${city.id}: temperature months`);
    assert.equal(city.precipitationMm.length, 12, `${city.id}: precipitation months`);
    assert.ok(city.temperatureC.some(value => value !== null) || city.precipitationMm.some(value => value !== null), city.id);
    for (const value of city.temperatureC) {
      // The published charts share a -30..45°C axis. A future out-of-domain
      // station must trigger a deliberate axis change, not a clipped curve.
      assert.ok(value === null || (Number.isFinite(value) && value >= -30 && value <= 45), `${city.id}: temperature outside chart axis`);
    }
    for (const value of city.precipitationMm) {
      assert.ok(value === null || (Number.isFinite(value) && value >= 0 && value <= 4000), `${city.id}: invalid monthly precipitation`);
    }
    assert.deepEqual(city.missingMonths.temperature, city.temperatureC.flatMap((value, month) => value === null ? [month + 1] : []), city.id);
    assert.deepEqual(city.missingMonths.precipitation, city.precipitationMm.flatMap((value, month) => value === null ? [month + 1] : []), city.id);
  }
});

test('一次資料で照合した平年値が月ずれ・実測列混入・単位変更を検出する', () => {
  // Independently read from the source tables on 2026-09-25. These anchors
  // intentionally pin the accepted 1991–2020 snapshot, not generator output.
  const anchors = {
    tokyo: {
      temperatureC: [5.4, 6.1, 9.4, 14.3, 18.8, 21.9, 25.7, 26.9, 23.3, 18, 12.5, 7.7],
      precipitationMm: [59.7, 56.5, 116, 133.7, 139.7, 167.8, 156.2, 154.7, 224.9, 234.8, 96.3, 57.9],
    },
    beijing: {
      temperatureC: [-2.8, 0.6, 7.5, 15.1, 21.3, 25.3, 27.2, 26, 21.2, 13.8, 5.2, -1],
      precipitationMm: [2.1, 5.6, 8.5, 21.9, 36.5, 72.7, 170.6, 114.1, 53.3, 29.3, 13.7, 2.5],
    },
    taipei: {
      temperatureC: [16.4, 16.9, 18.8, 22.3, 25.6, 28.2, 29.9, 29.5, 27.7, 24.6, 21.9, 18.2],
      precipitationMm: [90.5, 143.2, 157.2, 152.5, 239.9, 345, 226.1, 337.8, 315.2, 150.2, 83.2, 88.7],
    },
  };
  for (const [id, expected] of Object.entries(anchors)) {
    const city = byId.get(id);
    assert.ok(city, id);
    assert.deepEqual(city.temperatureC, expected.temperatureC, `${id}: mean temperature normals`);
    assert.deepEqual(city.precipitationMm, expected.precipitationMm, `${id}: precipitation means, not medians`);
  }
  assert.match(byId.get('tokyo').sourceUrl, /nml_sfc_ym\.php/);
  assert.equal(byId.get('taipei').stationId, '466920');
  assert.ok(byId.get('taipei').additionalSourceUrls.some(url => url.endsWith('Taiwan_precp.html')));
});

test('ホジェンドの未収録降水量を0や隣接観測所の値で補わない', () => {
  const city = byId.get('khujand');
  assert.ok(city);
  assert.equal(city.countryCode, 'TJK');
  assert.equal(city.stationId, '38599');
  assert.ok(city.temperatureC.every(Number.isFinite));
  assert.deepEqual(city.precipitationMm, Array(12).fill(null));
  assert.deepEqual(city.missingMonths.precipitation, Array.from({ length: 12 }, (_, i) => i + 1));
});

test('観測地点の経度緯度順と南半球の符号を保持する', () => {
  for (const city of asiaClimateCities) {
    assert.equal(city.coordinates.length, 2, city.id);
    const [lng, lat] = city.coordinates;
    assert.ok(Number.isFinite(lng) && lng >= 45 && lng <= 155, `${city.id}: longitude`);
    assert.ok(Number.isFinite(lat) && lat >= -15 && lat <= 56, `${city.id}: latitude`);
    assert.ok(city.elevationM === undefined || Number.isFinite(city.elevationM), `${city.id}: station elevation`);
  }
  assert.deepEqual(byId.get('tokyo').coordinates, [139.75, 35.69]);
  assert.deepEqual(byId.get('taipei').coordinates, [121.514853, 25.037658]);
  assert.ok(byId.get('jakarta').coordinates[1] < 0);
  assert.ok(byId.get('makassar').coordinates[1] < 0);
  assert.equal(byId.get('jakarta').stationId, '96749', 'keep airport temperature and precipitation at the same station');
});
