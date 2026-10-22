import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { asiaClimateCities } from '../../src/data/atlas/asia-climate-cities.ts';

test('Phnom Penh preserves the verified same-station 1991–2020 monthly normals', () => {
  const city = asiaClimateCities.find(city => city.id === 'phnom-penh');
  assert.ok(city);
  assert.equal(city.countryCode, 'KHM');
  assert.equal(city.regionId, 'southeast-asia');
  assert.equal(city.stationId, '48991');
  assert.equal(city.stationName, 'PHNOM-PENH (KHMOUGH)');
  assert.deepEqual(city.coordinates, [104.87, 11.6]);
  assert.equal(city.elevationM, 10);
  assert.equal(city.normalPeriod, '1991–2020');
  assert.equal(new URL(city.sourceUrl).searchParams.get('n'), '48991');
  assert.deepEqual(city.temperatureC, [27, 28, 29.7, 30.3, 30.5, 29.6, 29, 29, 28.4, 28.3, 28.1, 26.9]);
  assert.deepEqual(city.precipitationMm, [15, 4.6, 31.8, 92.8, 128.4, 166.3, 171.3, 181.4, 266.2, 260.2, 103.5, 33.5]);
  assert.deepEqual(city.missingMonths, { temperature: [], precipitation: [] });
  assert.equal(city.precipitationMm.reduce((sum, value) => sum + value, 0), 1455);
});

test('Phnom Penh table hash describes reproducible transcribed evidence, not unacquired HTML', () => {
  const city = asiaClimateCities.find(city => city.id === 'phnom-penh');
  const ledger = readFileSync(new URL('../../docs/atlas-southeast-climate-sources-20261021.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const table = ledger.match(/```tsv\n([\s\S]*?)```/)[1];
  assert.equal(city.sourceHashKind, 'verified-table-tsv');
  assert.deepEqual(city.sourceSha256, [createHash('sha256').update(table, 'utf8').digest('hex')]);
  const rows = table.trimEnd().split('\n').slice(1).map(row => row.split('\t').map(Number));
  assert.deepEqual(rows.map(row => row[0]), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.deepEqual(rows.map(row => row[1]), city.temperatureC);
  assert.deepEqual(rows.map(row => row[2]), city.precipitationMm);
});

