import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';

const output = 'public/assets/atlas/regional-production-statistics-v1/statistics.json';
const data = JSON.parse(readFileSync(output));
const series = (country, id) => data.countries[country].series.find(s => s.id === id);

test('manifest gzip slices retain the exact selected series and matching forestry trade within the fetch budget', () => {
  const root = 'public/assets/atlas/regional-production-statistics-v1/';
  const manifest = JSON.parse(readFileSync(root + 'manifest.json'));
  const selected = new Map(Object.values(data.countries).flatMap(c => c.series)
    .filter(s => ['5510', '5516', '5110'].includes(s.element)).map(s => [s.id, s]));
  assert.deepEqual(manifest.seriesIds, [...selected.keys()].sort());
  assert.deepEqual(readdirSync(root + 'by-series').sort(), manifest.seriesIds.map(id => id + '.json.gz').sort());
  for (const id of manifest.seriesIds) {
    const file = manifest.files[id];
    const compressed = readFileSync(root + file.file);
    assert.equal(compressed.length, file.gzipBytes);
    assert.equal(compressed.readUInt32LE(4), 0, 'gzip mtime is deterministic');
    assert.ok(compressed.length <= 100_000, `${id} exceeds the 100 KB additional fetch budget`);
    const sliced = JSON.parse(gunzipSync(compressed));
    const measure = selected.get(id);
    const expectedCountries = Object.fromEntries(Object.entries(data.countries).flatMap(([code, country]) => {
      const eligible = country.series.filter(s => s.id === id || (measure.domain === 'FO' && s.domain === 'FO'
        && s.item === measure.item && s.unit === measure.unit && ['5616', '5916'].includes(s.element)));
      return eligible.length ? [[code, {...country, series: eligible}]] : [];
    }));
    assert.deepEqual(sliced, {...data, countries: expectedCountries});
    assert.equal(Object.keys(sliced.countries).length, file.countryCount);
  }
  assert.ok(manifest.files['cattle-meat'].gzipBytes + manifest.files['cattle-milk'].gzipBytes <= 100_000);
});

test('national normalization preserves exact definitions, missingness, source joins and incomplete ranking scope', () => {
  assert.deepEqual(gunzipSync(readFileSync(output + '.gz')), readFileSync(output));
  assert.ok(data.countries.JPN, 'Japan remains in comparison data without a new page');
  assert.ok(data.countries.USA, 'US remains in comparison data without replacing its page');
  assert.equal(data.countries.World, undefined);
  assert.equal(data.unmatchedPublisherAreas.length, 0);
  assert.match(data.method, /収録国・地域中の順位/);
  for (const source of data.sources) {
    assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'), source.sha256);
  }
  for (const [code, country] of Object.entries(data.countries)) {
    assert.match(code, /^[A-Z]{3}$/);
    assert.notEqual(country.name, 'China', 'FAO China aggregate is excluded; mainland and Taiwan remain distinct');
    assert.equal(new Set(country.series.map(s => s.id)).size, country.series.length);
    for (const s of country.series) {
      assert.ok(['QCL', 'FO', 'RL'].includes(s.domain));
      assert.ok(s.definition && s.archiveSha256 && s.sourceUrl);
      assert.equal(new Set(s.rows.map(r => r.year)).size, s.rows.length);
      for (const row of s.rows) {
        if (row.flag === 'M' || row.flag === 'L' || row.rawValue === null || row.rawValue === '') {
          assert.equal(row.value, null);
          assert.equal(row.share, null);
        } else {
          assert.equal(row.value, Number(row.rawValue));
        }
        if (s.element === '5616' || s.element === '5916') {
          assert.equal(row.worldValue, null, 'production World rows are not trade denominators');
          assert.equal(row.share, null);
        }
        if (row.share !== null) {
          assert.ok(Number.isFinite(row.share));
          assert.ok(row.worldValue > 0 && row.value >= 0);
          const expected = row.value / row.worldValue * 100;
          assert.ok(Math.abs(row.share - expected) <= Math.max(1, expected) * Number.EPSILON * 4);
        }
      }
    }
  }
  const beef = series('CAN', 'cattle-meat').rows.find(r => r.year === 2024);
  assert.equal(beef.rawValue, '1291344.000000');
  assert.equal(beef.worldRawValue, '69749016.370000');
  assert.match(series('CAN', 'cattle-milk').definition, /未加工/);
  const mexicanCoffee = series('MEX', 'coffee-production').rows.find(r => r.year === 2024);
  assert.equal(mexicanCoffee.rawValue, '194470.000000');
  assert.equal(mexicanCoffee.flag, 'E');
  assert.equal(series('NZL', 'cattle-milk').rows.length, 1, 'a single year never becomes an inferred trend');
  assert.ok(series('IND', 'roundwood-imports').rows.some(r => r.year === 2024));
  assert.ok(series('IND', 'sawnwood-exports').rows.some(r => r.year === 2024));
  assert.match(series('IND', 'rice-production').definition, /籾米/);
  assert.ok(series('RUS', 'wheat-production').rows.some(r => r.year === 2024 && r.flag === 'X'));
  assert.ok(Object.values(data.countries).some(c => c.series.some(s => s.rows.some(r => r.value === 0 && r.share === 0))));
});

test('offline generation is deterministic and refuses conflicting duplicate values, units and archive versions', () => {
  const python = `
import json,runpy
from pathlib import Path
from unittest.mock import patch
module=runpy.run_path('scripts/prepare-regional-production-statistics.py')
prepare=module['prepare']
expected=json.loads(Path('${output}').read_text())
assert prepare()==expected
original=Path.read_bytes
for failure in ['value','unit','archive']:
 def altered(path):
  raw=original(path)
  if str(path).endswith('public/assets/atlas/asia-farming-v1/statistics.json'):
   payload=json.loads(raw)
   if failure=='archive':
    payload['inputs'][0]['sha256']='different-release'
   else:
    row=next(r for r in payload['countries']['CHN']['observations'] if r['item']=='656' and r['elementCode']=='5510' and r['year']==2024)
    if failure=='value':row['value']+=1
    else:row['unit']='1000 t'
   return json.dumps(payload).encode()
  return raw
 with patch.object(Path,'read_bytes',altered):
  try:prepare()
  except ValueError:pass
  else:raise AssertionError('Mismatch not rejected: '+failure)
`;
  execFileSync('python3', ['-c', python], {stdio: 'pipe'});
});
