import test from 'node:test';
import assert from 'node:assert/strict';
import countries from '../../src/data/atlas/europe/countries.json' with { type: 'json' };
import cities from '../../src/data/atlas/europe/climate-cities.json' with { type: 'json' };
import censusCases from '../../public/assets/atlas/europe/population-cases-v1/cases.json' with { type: 'json' };
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
import { drainageLayer, drainageReading } from '../../src/data/atlas/europe/drainage-reading.ts';
import { europeDrainageBasins, europeDrainageIndexForBasin } from '../../src/lib/atlas-europe-drainage.ts';
import { readEuropeState, writeEuropeState } from '../../src/lib/atlas-europe-view.ts';
import {
  encodeEuropeReturn, readEuropeReturn, europeComparisonLinks,
  europeComparisonUrl, europeNamedReturnUrl, europeComparisonSourceLabel,
} from '../../src/lib/atlas-europe-comparison.ts';
import { europeReaderCopy, europeReaderSources } from '../../src/lib/atlas-europe-reader.ts';

const cityIds = cities.map(city => city.id);
const state = query => readEuropeState(query, countries, cityIds);
const selected = '2040048790';
const selectedIndex = europeDrainageIndexForBasin(selected);
const base = new URL('https://example.test/insight-journal/atlas/europe/nature/');

test('all source HYBAS identifiers survive URL writes across fields and overlay', () => {
  for (const basin of europeDrainageBasins) for (const layer of ['drainage', 'wheat', 'hubs', 'density', 'ethnicity', 'overlay']) {
    const original = state(`?layer=${layer}&returnLayer=drainage&basin=${basin.HYBAS_ID}`);
    assert.equal(original.basin, String(basin.HYBAS_ID));
    const url = writeEuropeState(base, original);
    assert.equal(url.searchParams.get('basin'), String(basin.HYBAS_ID));
    assert.equal(state(url.search).basin, original.basin);
    assert.equal(url.searchParams.has('index'), false);
    if (layer === 'overlay') assert.equal(state(url.search).returnLayer, 'drainage');
  }
});

test('invalid basin choices are omitted and cannot retain a stale selection', () => {
  for (const basin of ['', '0', String(selectedIndex), '-1', '9999999999', ` ${selected}`, `${selected} `, `0${selected}`, '2.04004879e9', `${selected}.0`]) {
    const query = new URLSearchParams({ layer: 'density', basin });
    assert.equal(state(query.toString()).basin, undefined, basin);
    const url = writeEuropeState(new URL(`${base}?basin=${selected}`), { ...state('?layer=density'), basin });
    assert.equal(url.searchParams.has('basin'), false, basin);
  }
  for (const basin of [Number(selected), selectedIndex, null, undefined]) {
    const url = writeEuropeState(new URL(`${base}?basin=${selected}`), { ...state('?layer=density'), basin });
    assert.equal(url.searchParams.has('basin'), false);
  }
});

test('culture selections and basin state remain independent through field changes', () => {
  const censusCase = censusCases.cases[0];
  const topic = censusCase.topics.find(topic => topic.kind === 'ethnicity');
  const original = state(new URLSearchParams({
    layer: 'ethnicity', basin: selected, cultureCase: censusCase.id,
    cultureCategory: topic.categories[0].id, cultureArea: topic.areas[0].code,
  }).toString());
  for (const layer of ['drainage', 'hubs', 'ethnicity']) {
    const restored = state(writeEuropeState(base, { ...original, layer }).search);
    assert.equal(restored.basin, selected);
    for (const key of ['cultureCase', 'cultureCategory', 'cultureArea']) assert.equal(restored[key], original[key]);
  }
});

test('drainage comparison and named return restore the source selection exactly', () => {
  const original = state(`?layer=drainage&basin=${selected}&place=GBR&city=london&compare=paris,berlin&render=static&feature=rhine&crops=off&livestock=off&returnLayer=terrain`);
  assert.equal(original.layer, 'drainage');
  const before = structuredClone(original);
  const links = europeComparisonLinks(original);
  assert.deepEqual(links.map(link => link.targetLayer), ['crops', 'hubs', 'density']);
  for (const comparison of links) {
    const target = europeComparisonUrl(base, original, comparison);
    assert.equal(target.searchParams.get('basin'), selected);
    assert.notEqual(europeLayers.find(layer => layer.id === comparison.targetLayer).field, 'nature');
    const saved = readEuropeReturn(target.searchParams.get('europeReturn'), countries, cityIds);
    assert.deepEqual(saved, original);
    const returned = europeNamedReturnUrl(target, saved);
    assert.equal(returned.pathname, '/insight-journal/atlas/europe/nature/');
    assert.equal(returned.searchParams.has('europeReturn'), false);
    assert.deepEqual(state(returned.search), original);
  }
  assert.deepEqual(original, before);
});

test('return envelopes accept canonical basin IDs, normalize invalid IDs and reject duplicates', () => {
  const original = state(`?layer=drainage&basin=${selected}&returnLayer=drainage`);
  assert.deepEqual(readEuropeReturn(encodeEuropeReturn(original), countries, cityIds), original);
  for (const basin of ['0', String(selectedIndex), '9999999999']) {
    const normalized = readEuropeReturn(`layer=drainage&basin=${basin}`, countries, cityIds);
    assert.ok(normalized);
    assert.equal(normalized.basin, undefined);
  }
  assert.equal(readEuropeReturn(`layer=drainage&basin=${selected}&basin=${selected}`, countries, cityIds), null);
  assert.equal(readEuropeReturn(`layer=drainage&basin=${selected}&displayIndex=${selectedIndex}`, countries, cityIds), null);
});

test('a drainage return label names the selected source identifier, never a whole named river', () => {
  const original = state(`?layer=drainage&basin=${selected}&feature=rhine&place=GBR`);
  assert.equal(europeComparisonSourceLabel(original), `流域の区画・HYBAS_ID ${selected}`);
  assert.doesNotMatch(europeComparisonSourceLabel(original), /ライン川|全流域|英国/);
  assert.equal(europeComparisonSourceLabel({ ...original, basin: undefined }), '流域の区画');
  assert.equal(europeComparisonSourceLabel({ ...original, basin: String(selectedIndex) }), '流域の区画');
  assert.equal(europeComparisonSourceLabel({ ...original, layer: 'overlay', returnLayer: 'drainage' }), `流域の区画・HYBAS_ID ${selected}`);
});

test('Russia frame units from source region 3 support strict URL and full named-return restoration', () => {
  for (const basin of ['3040481930', '3040203170']) {
    assert.ok(europeDrainageIndexForBasin(basin), `The in-frame source HYBAS_ID ${basin} is available`);
    const original = state(`?layer=drainage&basin=${basin}&place=RUS&city=moscow&compare=helsinki,london&render=static&returnLayer=terrain`);
    assert.equal(original.basin, basin);
    const written = writeEuropeState(base, original);
    assert.equal(state(written.search).basin, basin);
    const encoded = encodeEuropeReturn(original);
    assert.deepEqual(readEuropeReturn(encoded, countries, cityIds), original);
    for (const comparison of europeComparisonLinks(original)) {
      const target = europeComparisonUrl(base, original, comparison);
      assert.equal(target.searchParams.get('basin'), basin);
      const saved = readEuropeReturn(target.searchParams.get('europeReturn'), countries, cityIds);
      assert.deepEqual(saved, original);
      assert.equal(europeComparisonSourceLabel(saved), `流域の区画・HYBAS_ID ${basin}`);
      const returned = europeNamedReturnUrl(target, saved);
      assert.equal(returned.pathname, '/insight-journal/atlas/europe/nature/');
      assert.deepEqual(state(returned.search), original);
    }
  }
});

test('the drainage reader preserves the supplied source definition and all five citations', () => {
  assert.deepEqual(europeReaderCopy(drainageLayer), {
    title: drainageReading.title, takeaway: drainageReading.takeaway,
    body: drainageReading.body, note: drainageReading.note,
  });
  assert.deepEqual(europeReaderSources(drainageLayer), drainageReading.sources);
  assert.equal(europeReaderSources(drainageLayer).length, 5);
  assert.match(europeReaderCopy(drainageLayer).note, /色に量の順序はありません/);
  assert.match(europeReaderCopy(drainageLayer).body, /その河川の流域全体を示すとは限りません/);
});
