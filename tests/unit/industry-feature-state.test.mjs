import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultIndustryFeatureState,
  normalizeIndustryFeatureState,
  readIndustryFeatureState,
  writeIndustryFeatureState,
} from '../../src/lib/industry-feature-state.ts';

const sectorCountries = (sector, region) => {
  const catalog = {
    automotive: { 'north-america': ['USA', 'CAN', 'MEX'], europe: ['DEU', 'FRA', 'NOR'], asia: ['CHN', 'JPN', 'THA'] },
    solar: { 'north-america': ['USA'], europe: ['DEU'], asia: ['CHN', 'JPN'] },
    battery: { 'north-america': ['USA'], europe: ['DEU'], asia: ['CHN'] },
    semiconductor: { 'north-america': ['USA'], europe: ['NLD', 'DEU'], asia: ['TWN', 'KOR', 'JPN', 'CHN'] },
  };
  return catalog[sector][region];
};

test('initial state selects the first representative country for each viewing region', () => {
  assert.deepEqual(readIndustryFeatureState(''), defaultIndustryFeatureState);
  assert.equal(readIndustryFeatureState('?region=europe').country, 'DEU');
  assert.equal(readIndustryFeatureState('?region=asia').country, 'CHN');
  const changed = readIndustryFeatureState('');
  changed.country = 'MEX';
  assert.equal(readIndustryFeatureState('').country, 'USA');
});

test('URL restores independent powertrain and body selections plus the comparison view', () => {
  const state = readIndustryFeatureState('?sector=automotive&region=asia&country=JPN&view=manufacturing&powertrain=phev&body=suv&compare=1');
  assert.deepEqual(state, {
    sector: 'automotive', region: 'asia', country: 'JPN', view: 'manufacturing',
    powertrain: 'phev', body: 'suv', compare: true,
  });
});

test('changing region or sector corrects an incompatible selection using its own catalog', () => {
  const original = readIndustryFeatureState('?region=asia&country=JPN');
  assert.equal(normalizeIndustryFeatureState({ ...original, region: 'europe' }, sectorCountries).country, 'DEU');
  assert.equal(normalizeIndustryFeatureState({ ...original, sector: 'battery' }, sectorCountries).country, 'CHN');
  assert.equal(readIndustryFeatureState('?sector=semiconductor&region=europe&country=NLD', sectorCountries).country, 'NLD');
  assert.equal(readIndustryFeatureState('?sector=semiconductor&region=asia&country=TWN', sectorCountries).country, 'TWN');
});

test('an explicitly cleared selection survives serialization and a browser history restore', () => {
  const original = readIndustryFeatureState('?region=europe&country=&compare=true');
  assert.equal(original.country, '');
  const saved = writeIndustryFeatureState(new URL('https://example.com/features/industry/'), original);
  assert.ok(saved.searchParams.has('country'));
  assert.equal(saved.searchParams.get('country'), '');
  assert.deepEqual(readIndustryFeatureState(saved.search), original);
});

test('unavailable regions remain unselected instead of borrowing a country from another region', () => {
  const context = { asia: ['CHN'] };
  assert.equal(readIndustryFeatureState('?region=europe&country=DEU', context).country, '');
  assert.equal(readIndustryFeatureState('?region=asia&country=JPN', context).country, 'CHN');
  assert.equal(readIndustryFeatureState('?region=asia', () => []).country, '');
});

test('invalid enums, country codes and prototype names fall back safely', () => {
  for (const invalid of ['unknown', '__proto__', 'constructor', 'toString']) {
    assert.deepEqual(readIndustryFeatureState(`?sector=${invalid}&region=${invalid}&country=${invalid}&view=${invalid}&powertrain=${invalid}&body=${invalid}&compare=${invalid}`), defaultIndustryFeatureState);
  }
  assert.equal(readIndustryFeatureState('?region=asia&country=USA').country, 'CHN');
  assert.equal(readIndustryFeatureState('?country=usa').country, 'USA');
  const polluted = Object.create({ europe: ['NLD'] });
  assert.equal(readIndustryFeatureState('?region=europe&country=NLD', polluted).country, '');
  assert.equal(readIndustryFeatureState('?region=asia', { asia: ['US', 'tokyo', 'JPN'] }).country, 'JPN');
});

test('EU remains a source aggregate for solar and battery instead of becoming a representative country', () => {
  const scopedCountries = (sector, region) =>
    region === 'europe' && ['solar', 'battery'].includes(sector) ? ['EU'] : sectorCountries(sector, region);
  for (const sector of ['solar', 'battery']) {
    const selected = readIndustryFeatureState(`?sector=${sector}&region=europe&country=EU&view=manufacturing`, scopedCountries);
    assert.equal(selected.country, 'EU');
    const saved = writeIndustryFeatureState(new URL('https://example.com/features/industry/'), selected);
    assert.equal(saved.searchParams.get('country'), 'EU');
    assert.deepEqual(readIndustryFeatureState(saved.search, scopedCountries), selected);
    const switched = normalizeIndustryFeatureState({ ...defaultIndustryFeatureState, sector, region: 'europe', country: 'DEU' }, scopedCountries);
    assert.equal(switched.country, 'EU');
  }
  assert.equal(readIndustryFeatureState('?sector=automotive&region=europe&country=EU', scopedCountries).country, 'DEU');
  for (const invalid of ['US', 'NA', 'APAC', 'EUROPE']) {
    assert.equal(readIndustryFeatureState(`?sector=battery&region=europe&country=${invalid}`, scopedCountries).country, 'EU');
    assert.equal(readIndustryFeatureState('?region=europe', { europe: [invalid] }).country, '');
  }
});

test('comparison recognizes affirmative values without treating arbitrary nonempty strings as true', () => {
  for (const value of ['1', 'true']) assert.equal(readIndustryFeatureState(`?compare=${value}`).compare, true);
  for (const value of ['0', 'false', '', 'yes', '2']) assert.equal(readIndustryFeatureState(`?compare=${value}`).compare, false);
});

test('writer replaces only owned parameters and leaves the input URL untouched', () => {
  const input = new URL('https://example.com/features/industry/?utm_source=journal&tag=a&tag=b&sector=solar&country=CHN&country=JPN#sources');
  const before = input.href;
  const written = writeIndustryFeatureState(input, { ...defaultIndustryFeatureState, country: 'MEX', powertrain: 'ice', body: 'pickup' });
  assert.equal(input.href, before);
  assert.notEqual(written, input);
  assert.equal(written.pathname, input.pathname);
  assert.equal(written.hash, '#sources');
  assert.equal(written.searchParams.get('utm_source'), 'journal');
  assert.deepEqual(written.searchParams.getAll('tag'), ['a', 'b']);
  assert.deepEqual(written.searchParams.getAll('country'), ['MEX']);
  assert.equal(written.searchParams.get('compare'), '0');
});

test('all sectors round-trip their country, focus and automotive handoff filters', () => {
  const selections = [
    { sector: 'automotive', region: 'north-america', country: 'CAN', view: 'market', powertrain: 'bev', body: 'sedan', compare: false },
    { sector: 'solar', region: 'asia', country: 'JPN', view: 'manufacturing', powertrain: 'all', body: 'all', compare: true },
    { sector: 'battery', region: 'europe', country: 'DEU', view: 'mechanism', powertrain: 'phev', body: 'suv', compare: true },
    { sector: 'semiconductor', region: 'europe', country: 'NLD', view: 'manufacturing', powertrain: 'fcev', body: 'minivan', compare: false },
  ];
  for (const selection of selections) {
    const saved = writeIndustryFeatureState(new URL('https://example.com/features/industry/?from=atlas#details'), selection);
    assert.deepEqual(readIndustryFeatureState(saved.search, sectorCountries), selection);
  }
});

test('restoring older history produces that URL state without retaining later selections', () => {
  const first = new URL('https://example.com/features/industry/?sector=automotive&region=asia&country=THA&powertrain=hev&body=suv');
  const later = writeIndustryFeatureState(first, readIndustryFeatureState('?sector=semiconductor&region=europe&country=NLD&view=mechanism&compare=1', sectorCountries));
  assert.equal(readIndustryFeatureState(later.search, sectorCountries).country, 'NLD');
  const restored = readIndustryFeatureState(first.search, sectorCountries);
  assert.equal(restored.country, 'THA');
  assert.equal(restored.sector, 'automotive');
  assert.equal(restored.powertrain, 'hev');
  assert.equal(restored.body, 'suv');
  assert.equal(restored.compare, false);
});
