import test from 'node:test';
import assert from 'node:assert/strict';
import {readMexicoNatureState, writeMexicoNatureState, mexicoNatureReturnUrl, mexicoNatureIndicator, indicatorColor, irrigationBins, densityBins, natureComparisonReading} from '../../src/lib/atlas-mexico-nature.ts';
import {irrigationBins as agricultureBins, irrigationColor} from '../../src/lib/atlas-mexico-agriculture.ts';
import {mexicoDensityBins, mexicoDensityColor} from '../../src/lib/atlas-mexico-population.ts';
const codes = Array.from({length: 32}, (_, index) => String(index + 1).padStart(2, '0'));
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
  assert.equal(initial.view, 'relief');
  const updated = {...initial, state: '15'};
  const saved = writeMexicoNatureState(new URL('https://example.test/'), updated);
  assert.deepEqual(readMexicoNatureState(saved, codes), updated);
  const returnUrl = new URL(mexicoNatureReturnUrl('/population/', updated), 'https://example.test');
  assert.equal(returnUrl.searchParams.get('view'), 'population'); assert.equal(returnUrl.searchParams.get('state'), '09'); assert.equal(returnUrl.searchParams.get('only'), '1');
});
test('Invalid state, view, comparison and camera values cannot produce a broken map state', () => {
  const state = readMexicoNatureState(new URL('https://example.test/?state=99&view=height&compare=anything&frame=NaN,1,-3,4&from=external&sourceState=invalid'), codes);
  assert.equal(state.state, '25'); assert.equal(state.view, 'climate'); assert.equal(state.compare, null); assert.equal(state.frame, null); assert.equal(state.from, null);
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
