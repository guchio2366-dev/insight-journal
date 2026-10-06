import test from 'node:test';
import assert from 'node:assert/strict';

test('A national population source remains national after nature selection, URL round-trip and return', () => {
  const initial = new URL('https://example.test/nature/?compare=population&from=population&sourceState=&sourceView=population&state=25');
  const state = readMexicoNatureState(initial, ['09','25','10']);
  assert.equal(state.sourceState, '');
  const changed = {...state, state:'10', category:'elevation'};
  const roundTrip = readMexicoNatureState(writeMexicoNatureState(initial, changed), ['09','25','10']);
  assert.equal(roundTrip.sourceState, '');
  const back = new URL(mexicoNatureReturnUrl('/population/', roundTrip), initial.origin);
  assert.equal(back.searchParams.get('state'), '');
  assert.equal(back.searchParams.get('view'), 'population');
});

test('The exact population query, including camera and unknown source flags, returns only to the fixed population route', () => {
  const source = '?category=distribution&view=population&state=&only=0&frame=210,100,350,220&reading=item&retainedSource=original';
  const initial = new URL('https://example.test/nature/?from=population&compare=population&sourceState=&state=25');
  initial.searchParams.set('sourcePopulationQuery', source);
  const state = readMexicoNatureState(initial, ['09','25','10']);
  const restored = readMexicoNatureState(writeMexicoNatureState(initial, {...state,state:'10',category:'precipitation'}), ['09','25','10']);
  assert.equal(restored.sourcePopulationQuery, source);
  assert.equal(mexicoNatureReturnUrl('/atlas/mexico/population/', restored), '/atlas/mexico/population/' + source);
  for (const invalid of ['https://example.invalid/', '//example.invalid/', '?state=99', '?view=other', '?only=yes', '?view=density#fragment', '?state=25\n', '?'+'x'.repeat(2048)]) {
    const url = new URL(initial); url.searchParams.set('sourcePopulationQuery', invalid);
    const rejected = readMexicoNatureState(url, ['09','25','10']);
    assert.equal(rejected.sourcePopulationQuery, undefined);
    assert.ok(mexicoNatureReturnUrl('/population/', rejected).startsWith('/population/?'));
  }
});
import {readMexicoNatureState, writeMexicoNatureState, mexicoNatureReturnUrl, mexicoNatureIndicator, mexicoNatureNormalView, mexicoNatureSelectView, natureClassIds, indicatorColor, irrigationBins, densityBins, natureComparisonReading} from '../../src/lib/atlas-mexico-nature.ts';
import {irrigationBins as agricultureBins, irrigationColor} from '../../src/lib/atlas-mexico-agriculture.ts';
import {mexicoDensityBins, mexicoDensityColor} from '../../src/lib/atlas-mexico-population.ts';
const codes = Array.from({length: 32}, (_, index) => String(index + 1).padStart(2, '0'));
test('City and camera survive fresh comparison and plain-return URLs for both natural views', () => {
  for (const [view, compare] of [['climate', 'irrigation'], ['relief', 'population']]) {
    const original = readMexicoNatureState(new URL(`https://example.test/nature/?view=${view}&city=culiacan-dge&frame=210,100,350,220`), codes);
    const comparisonURL = writeMexicoNatureState(new URL('https://example.test/nature/'), {...original, compare, only: false});
    assert.equal(comparisonURL.searchParams.get('city'), 'culiacan-dge');
    assert.equal(comparisonURL.searchParams.get('frame'), '210,100,350,220');
    const compared = readMexicoNatureState(comparisonURL, codes);
    const plainURL = writeMexicoNatureState(new URL('https://example.test/nature/'), {...compared, compare: null, only: false});
    assert.equal(plainURL.searchParams.get('city'), 'culiacan-dge');
    assert.deepEqual(readMexicoNatureState(plainURL, codes).frame, original.frame);
    assert.equal(plainURL.searchParams.has('compare'), false);
  }
});
test('Unknown and empty station requests are preserved rather than silently replaced by the capital', () => {
  for (const requested of ['unavailable', '']) {
    const state = readMexicoNatureState(new URL(`https://example.test/?city=${requested}`), codes);
    assert.equal(state.city, requested);
    assert.equal(writeMexicoNatureState(new URL('https://example.test/'), state).searchParams.get('city'), requested);
  }
  const implicit = readMexicoNatureState(new URL('https://example.test/'), codes);
  assert.equal(implicit.city, null);
  assert.equal(writeMexicoNatureState(new URL('https://example.test/'), implicit).searchParams.has('city'), false);
});
test('Agriculture comparison preserves the original metric, state, only and fallback after changing the natural target', () => {
  const url = new URL('https://example.test/base/atlas/north-america/mexico/nature/?news=retained&compare=irrigation&state=25&from=agriculture&sourceMetric=maize&sourceState=25&sourceOnly=1&sourceFallback=1');
  const initial = readMexicoNatureState(url, codes);
  assert.equal(initial.view, 'climate'); assert.equal(initial.sourceState, '25'); assert.equal(initial.fallback, false);
  const updated = {...initial, state: '26', only: true, frame: [210, 100, 350, 220]};
  const saved = writeMexicoNatureState(url, updated);
  assert.equal(saved.searchParams.get('news'), 'retained'); assert.deepEqual(readMexicoNatureState(saved, codes), updated);
  const returnUrl = new URL(mexicoNatureReturnUrl('/base/atlas/north-america/mexico/agriculture/', updated), url);
  assert.equal(returnUrl.searchParams.get('metric'), 'maize'); assert.equal(returnUrl.searchParams.get('state'), '25');
  assert.equal(returnUrl.searchParams.get('only'), '1'); assert.equal(returnUrl.searchParams.get('fallback'), '1');
});
test('Population comparison restores density or scale independently from the current comparison target', () => {
  const initial = readMexicoNatureState(new URL('https://example.test/?compare=population&view=climate&state=09&from=population&sourceView=population&sourceState=09&sourceOnly=1'), codes);
  assert.equal(initial.view, 'climate', 'An explicit natural target survives reload while the original population indicator is retained');
  const updated = {...initial, state: '15'};
  const saved = writeMexicoNatureState(new URL('https://example.test/'), updated);
  assert.deepEqual(readMexicoNatureState(saved, codes), updated);
  const returnUrl = new URL(mexicoNatureReturnUrl('/population/', updated), 'https://example.test');
  assert.equal(returnUrl.searchParams.get('view'), 'population'); assert.equal(returnUrl.searchParams.get('state'), '09'); assert.equal(returnUrl.searchParams.get('only'), '1');
});
test('Invalid state, view, comparison and camera values cannot produce a broken map state', () => {
  const state = readMexicoNatureState(new URL('https://example.test/?state=99&view=height&compare=anything&frame=NaN,1,-3,4&from=external&sourceState=invalid'), codes);
  assert.equal(state.state, ''); assert.equal(state.view, 'climate'); assert.equal(state.compare, null); assert.equal(state.frame, null); assert.equal(state.from, null);
  assert.equal(readMexicoNatureState(new URL('https://example.test/?compare=population'), codes).state, '09');
});
test('Quantity-source comparisons retain the source metric and natural region appropriate to the quantity', () => {
  const maize = readMexicoNatureState(new URL('https://example.test/?compare=irrigation&from=agriculture&sourceMetric=maize&state=25&sourceOnly=1'), codes);
  assert.equal(mexicoNatureIndicator(maize), 'maize'); assert.equal(maize.view, 'climate'); assert.equal(maize.only, true);
  const pine = readMexicoNatureState(new URL('https://example.test/?compare=irrigation&from=agriculture&sourceMetric=pine&state=10'), codes);
  assert.equal(mexicoNatureIndicator(pine), 'pine'); assert.equal(pine.view, 'relief');
  const population = readMexicoNatureState(new URL('https://example.test/?compare=population&from=population&sourceView=population&state=09'), codes);
  assert.equal(mexicoNatureIndicator(population), 'population'); assert.equal(population.view, 'relief');
  const allStates = {...maize, only: false};
  assert.deepEqual(readMexicoNatureState(writeMexicoNatureState(new URL('https://example.test/'), allStates), codes), allStates);
});
test('Explicit natural-view selection clears source quantity provenance before following the irrigation comparison entry', () => {
  const pine = readMexicoNatureState(new URL('https://example.test/?compare=irrigation&from=agriculture&sourceMetric=pine&state=10&sourceOnly=1'), codes);
  const climate = mexicoNatureNormalView(pine, 'climate');
  const saved = writeMexicoNatureState(new URL('https://example.test/'), climate);
  assert.equal(saved.searchParams.has('from'), false); assert.equal(saved.searchParams.has('sourceMetric'), false);
  assert.deepEqual(readMexicoNatureState(saved, codes), climate);
  const next = readMexicoNatureState(writeMexicoNatureState(saved, {...climate, compare: 'irrigation'}), codes);
  assert.equal(next.view, 'climate'); assert.equal(mexicoNatureIndicator(next), 'irrigation');
});
test('A public zero is a valid rate; an unknown value is distinct and density/rate bin boundaries are exact', () => {
  assert.equal(indicatorColor(0, irrigationBins), irrigationBins[0].color);
  assert.equal(indicatorColor(null, irrigationBins), '#c6c9cb'); assert.equal(indicatorColor(NaN, irrigationBins), '#c6c9cb');
  for (const [value, index] of [[24.99, 0], [25, 1], [50, 2], [75, 3], [100, 3]]) assert.equal(indicatorColor(value, irrigationBins), irrigationBins[index].color);
  assert.equal(indicatorColor(500, densityBins), densityBins[4].color); assert.equal(indicatorColor(6163.3, densityBins), densityBins[5].color);
  assert.equal(indicatorColor(-1, densityBins), '#c6c9cb');
});
test('Comparison bins and colors equal the published source maps at every class boundary', () => {
  assert.deepEqual(irrigationBins.map(({minimum, ...bin}) => bin), agricultureBins);
  assert.deepEqual(densityBins.map(({minimum, ...bin}) => bin), [...mexicoDensityBins]);
  for (const value of [0, 24.99, 25, 49.99, 50, 74.99, 75, 99.99, 100]) assert.equal(indicatorColor(value, irrigationBins), irrigationColor(value));
  for (const value of [0, 24.99, 25, 49.99, 50, 99.99, 100, 249.99, 250, 999.99, 1000, 6163.3]) assert.equal(indicatorColor(value, densityBins), mexicoDensityColor(value));
});
test('Dedicated comparisons provide different causal readings and a consequence for the selected region', () => {
  assert.match(natureComparisonReading('irrigation', '25').body, /川や貯水池/);
  assert.match(natureComparisonReading('population', '09').body, /都市・交通・市場/);
  assert.match(natureComparisonReading('population', '09').consequence, /水供給・交通・住宅/);
});
test('Feature, pending category and target-layer choices retain comparison provenance and camera across URL restoration', () => {
  const url = new URL('https://example.test/?compare=irrigation&from=agriculture&sourceMetric=pine&sourceState=10&state=26&sourceOnly=1&sourceFallback=1&fallback=1&only=0&frame=210,100,350,220&side=source');
  const original = readMexicoNatureState(url, codes);
  const selected = {...original, item: 'III', feature: 'relief-5', category: 'precipitation'};
  assert.deepEqual(readMexicoNatureState(writeMexicoNatureState(url, selected), codes), selected);
  assert.equal(writeMexicoNatureState(url, selected).searchParams.get('side'), 'source');
  const switched = mexicoNatureSelectView(selected, 'climate');
  assert.equal(switched.compare, 'irrigation'); assert.equal(switched.from, 'agriculture'); assert.equal(switched.sourceMetric, 'pine');
  assert.equal(switched.item, 'III'); assert.equal(switched.feature, 'relief-5'); assert.equal(switched.category, '');
  assert.deepEqual(switched.frame, original.frame); assert.deepEqual(readMexicoNatureState(writeMexicoNatureState(url, switched), codes), switched);
  assert.match(mexicoNatureReturnUrl('/agriculture/', switched), /metric=pine/);
  const invalid = readMexicoNatureState(new URL('https://example.test/?view=climate&item=unknown&feature=unknown&category=unknown'), codes);
  assert.equal(invalid.item, ''); assert.equal(invalid.feature, ''); assert.equal(invalid.category, '');
});
test('Selectable item identifiers exactly match the original INEGI classes including missing classification', async () => {
  const {readFile} = await import('node:fs/promises');
  const nature = JSON.parse(await readFile('src/data/atlas/mexico/nature-v1.json', 'utf8'));
  for (const view of ['climate', 'relief']) assert.deepEqual([...natureClassIds[view]].sort(), nature[view].classes.map(item => item.id).sort());
});
