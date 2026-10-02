import test from 'node:test';
import assert from 'node:assert/strict';
import {
 canadaDemographicsStateKeys,
 isCanadaDemographicTopic,
 readCanadaDemographicsState,
 writeCanadaDemographicsState,
 canadaDemographicShare,
 canadaDemographicValueForMeasure,
 canadaDemographicShareBreaks,
 canadaDemographicShareColors,
 canadaDemographicMissingColor,
 canadaDemographicShareScale,
 canadaDemographicShareColor,
} from '../../src/lib/atlas-canada-demographics.ts';
import {readCanadaPopulationState} from '../../src/lib/atlas-canada-population.ts';

// Deliberately synthetic catalogs: helpers do not impose another country's categories.
const catalog = {
 ethnicity: {ids: ['origin-a', 'origin-b'], defaultId: 'origin-b'},
 religion: {ids: ['affiliation-a', 'affiliation-b'], defaultId: 'affiliation-a'},
};
const base = 'https://example.com/insight-journal/atlas/north-america/canada/population/';

test('Missing or unknown topic retains the legacy distribution state regardless of demographic parameters', () => {
 for (const query of ['', '?group=origin-a&measure=count', '?topic=distribution&group=origin-a', '?topic=unknown&measure=count']) {
  const url = new URL(query, base), original = url.href;
  assert.deepEqual(readCanadaDemographicsState(url, catalog), {topic: 'distribution', group: null, measure: 'share'});
  assert.equal(url.href, original);
 }
 assert.equal(isCanadaDemographicTopic('ethnicity'), true);
 assert.equal(isCanadaDemographicTopic('religion'), true);
 for (const value of ['distribution', 'vote', '', null, undefined]) assert.equal(isCanadaDemographicTopic(value), false);
});

test('Groups validate against their own topic and only an explicit count changes the default percentage measure', () => {
 assert.deepEqual(readCanadaDemographicsState(new URL('?topic=ethnicity&group=origin-a&measure=count', base), catalog), {
  topic: 'ethnicity', group: 'origin-a', measure: 'count',
 });
 for (const [topic, defaultGroup] of [['ethnicity', 'origin-b'], ['religion', 'affiliation-a']]) {
  for (const group of ['', 'unknown', topic === 'ethnicity' ? 'affiliation-a' : 'origin-a']) {
   for (const measure of ['', 'population', 'density', 'COUNT', 'share']) {
    const url = new URL(base);url.search = new URLSearchParams({topic, group, measure}).toString();
    assert.deepEqual(readCanadaDemographicsState(url, catalog), {topic, group: defaultGroup, measure: 'share'});
   }
  }
 }
});

test('Demographic writes preserve the existing 2016 population selection, camera, return state and unrelated queries without mutating input', () => {
 const url = new URL('?year=2016&cma=505&compare=535&metric=population&only=1&zoom=selected&keep=first&keep=second&populationReturn=retained&topic=religion&group=affiliation-b&measure=count#map', base);
 const original = url.href, ids = ['505', '535', '462'];
 const population = readCanadaPopulationState(url, ids);
 const states = [
  {topic: 'ethnicity', group: 'origin-a', measure: 'share'},
  {topic: 'religion', group: 'affiliation-b', measure: 'count'},
 ];
 for (const state of states) {
  const saved = writeCanadaDemographicsState(url, state);
  assert.notEqual(saved, url);
  assert.equal(url.href, original);
  assert.deepEqual(readCanadaDemographicsState(saved, catalog), state);
  assert.deepEqual(readCanadaPopulationState(saved, ids), population);
  assert.deepEqual([...saved.searchParams].filter(([key]) => !canadaDemographicsStateKeys.includes(key)),
   [...url.searchParams].filter(([key]) => !canadaDemographicsStateKeys.includes(key)));
  assert.equal(saved.origin, url.origin);
  assert.equal(saved.pathname, url.pathname);
  assert.equal(saved.hash, '#map');
 }
 const distribution = writeCanadaDemographicsState(url, {topic: 'distribution', group: 'origin-a', measure: 'count'});
 for (const key of canadaDemographicsStateKeys) assert.equal(distribution.searchParams.has(key), false);
 assert.deepEqual(readCanadaPopulationState(distribution, ids), population);
 assert.equal(url.href, original);
});

test('Serialized topic changes can be restored as history entries while an omitted group uses its topic default', () => {
 const source = new URL('?year=2016&cma=505&compare=535&zoom=selected', base), entries = [source];
 entries.push(writeCanadaDemographicsState(entries.at(-1), {topic: 'ethnicity', group: 'origin-a', measure: 'share'}));
 entries.push(writeCanadaDemographicsState(entries.at(-1), {topic: 'religion', group: 'affiliation-b', measure: 'count'}));
 entries.push(writeCanadaDemographicsState(entries.at(-1), {topic: 'distribution', group: null, measure: 'share'}));
 assert.deepEqual(entries.map(url => readCanadaDemographicsState(new URL(url.href), catalog)), [
  {topic: 'distribution', group: null, measure: 'share'},
  {topic: 'ethnicity', group: 'origin-a', measure: 'share'},
  {topic: 'religion', group: 'affiliation-b', measure: 'count'},
  {topic: 'distribution', group: null, measure: 'share'},
 ]);
 assert.ok(entries.every(url => url.searchParams.get('year') === '2016' && url.searchParams.get('cma') === '505'));
 const omitted = writeCanadaDemographicsState(source, {topic: 'religion', group: null, measure: 'share'});
 assert.equal(omitted.searchParams.has('group'), false);
 assert.equal(readCanadaDemographicsState(omitted, catalog).group, 'affiliation-a');
});

test('Percentage uses the table denominator, preserves a published zero and rejects missing, invalid and excessive ratios', () => {
 assert.equal(canadaDemographicShare(250, 1000), 25);
 assert.equal(canadaDemographicShare(250, 1250), 20);
 assert.equal(canadaDemographicShare(0, 1000), 0);
 assert.equal(canadaDemographicShare(1000, 1000), 100);
 assert.equal(canadaDemographicShare(Number.MAX_VALUE, Number.MAX_VALUE), 100);
 for (const [count, denominator] of [
  [null, 1000], [0, null], [0, 0], [10, 0], [10, -1], [-1, 1000], [1001, 1000],
  [NaN, 1000], [Infinity, 1000], [10, NaN], [10, Infinity],
 ]) assert.equal(canadaDemographicShare(count, denominator), null);
});

test('Count measure retains an original valid count without substituting the total population or requiring a share denominator', () => {
 assert.equal(canadaDemographicValueForMeasure(250, 1000, 'share'), 25);
 assert.equal(canadaDemographicValueForMeasure(250, 1000, 'count'), 250);
 assert.equal(canadaDemographicValueForMeasure(250, null, 'count'), 250);
 assert.equal(canadaDemographicValueForMeasure(0, null, 'count'), 0);
 assert.equal(canadaDemographicValueForMeasure(1001, 1000, 'count'), 1001);
 assert.equal(canadaDemographicValueForMeasure(1001, 1000, 'share'), null);
 for (const count of [null, -1, NaN, Infinity]) assert.equal(canadaDemographicValueForMeasure(count, 1000, 'count'), null);
});

test('Absolute percentage classes change at 1, 5, 10, 25 and 50 percent and missing remains distinct from zero', () => {
 assert.deepEqual(canadaDemographicShareBreaks, [1, 5, 10, 25, 50]);
 assert.equal(canadaDemographicShareColors.length, 6);
 assert.equal(new Set(canadaDemographicShareColors).size, 6);
 assert.equal(canadaDemographicShareColor(0), canadaDemographicShareColors[0]);
 for (const [index, boundary] of canadaDemographicShareBreaks.entries()) {
  assert.equal(canadaDemographicShareColor(boundary - 0.0001), canadaDemographicShareColors[index]);
  assert.equal(canadaDemographicShareColor(boundary), canadaDemographicShareColors[index + 1]);
 }
 assert.equal(canadaDemographicShareColor(100), canadaDemographicShareColors[5]);
 for (const share of [null, -1, 101, NaN, Infinity]) assert.equal(canadaDemographicShareColor(share), canadaDemographicMissingColor);
 assert.notEqual(canadaDemographicShareColor(null), canadaDemographicShareColor(0));
});

test('Adaptive percentage thresholds retain 0.01 percentage-point differences for small groups', () => {
 const shares = [0, 0.01, 0.02, 0.03, 0.04, 0.049], original = [...shares];
 const scale = canadaDemographicShareScale(shares);
 assert.deepEqual(scale, {breaks: [0.01, 0.02, 0.03, 0.04, 0.05], upper: 0.06, decimals: 2});
 assert.deepEqual(shares, original);
 assert.notEqual(canadaDemographicShareColor(0.01, scale.breaks), canadaDemographicShareColor(0.02, scale.breaks));
 assert.equal(new Set(shares.map(value => canadaDemographicShareColor(value, scale.breaks))).size, 5);
 assert.deepEqual(scale.breaks.map(value => value.toFixed(scale.decimals)), ['0.01', '0.02', '0.03', '0.04', '0.05']);
 assert.equal(canadaDemographicValueForMeasure(49, 100000, 'share'), 0.049);
});

test('Adaptive scales use deterministic nice steps, cover the actual maximum and stay within 100 percent', () => {
 for (const [maximum, step, upper, decimals] of [
  [0.012, 0.002, 0.012, 3], [0.6, 0.1, 0.6, 1], [1, 0.2, 1.2, 1],
  [12, 2, 12, 0], [30, 5, 30, 0], [60, 10, 60, 0],
 ]) {
  const input = [maximum / 2, 0, maximum], scale = canadaDemographicShareScale(input);
  assert.deepEqual(scale.breaks, [1, 2, 3, 4, 5].map(factor => Number((step * factor).toPrecision(12))));
  assert.equal(scale.upper, upper);
  assert.equal(scale.decimals, decimals);
  assert.deepEqual(canadaDemographicShareScale([...input].reverse()), scale);
  assert.ok(scale.upper >= maximum && scale.upper <= 100);
 }
 for (const maximum of [60.0001, 75, 99.9, 100]) {
  assert.deepEqual(canadaDemographicShareScale([maximum]), {breaks: [10, 20, 40, 60, 80], upper: 100, decimals: 0});
 }
 for (const maximum of [Number.MIN_VALUE, 1e-200, 1e-8, 0.006000000000000001, 0.06000000000000001, 0.7, 2.3, 6.7, 13, 31, 59.9]) {
  const scale = canadaDemographicShareScale([maximum]);
  assert.equal(scale.breaks.length, 5);
  assert.ok(scale.breaks.every((value, index) => Number.isFinite(value) && value > 0 && value < scale.upper
   && (index === 0 || value > scale.breaks[index - 1])));
  assert.ok(Number.isFinite(scale.upper) && scale.upper >= maximum && scale.upper <= 100);
  assert.ok(Number.isInteger(scale.decimals) && scale.decimals >= 0);
 }
});

test('Empty, missing and all-zero groups keep a stable valid scale and invalid percentages are excluded rather than capped', () => {
 const fallback = {breaks: [0.1, 0.2, 0.4, 0.6, 0.8], upper: 1, decimals: 1};
 for (const values of [[], [0, 0], [NaN, Infinity, -1, 101]]) assert.deepEqual(canadaDemographicShareScale(values), fallback);
 assert.deepEqual(canadaDemographicShareScale([0.049, NaN, Infinity, -5, 150]), canadaDemographicShareScale([0.049]));
 const small = canadaDemographicShareScale([0.049]);
 for (const value of [-1, 101, NaN, Infinity, null]) assert.equal(canadaDemographicShareColor(value, small.breaks), canadaDemographicMissingColor);
 assert.notEqual(canadaDemographicShareColor(0, fallback.breaks), canadaDemographicShareColor(null, fallback.breaks));
 // A valid percentage beyond this group's current range stays valid and uses the open top class.
 assert.equal(canadaDemographicShareColor(0.5, small.breaks), canadaDemographicShareColors[5]);
 assert.equal(canadaDemographicValueForMeasure(1, 2, 'share'), 50);
});

test('Optional percentage thresholds are inclusive at boundaries and reject malformed scales while the old default stays compatible', () => {
 const {breaks} = canadaDemographicShareScale([0.049]);
 for (const [index, boundary] of breaks.entries()) {
  assert.equal(canadaDemographicShareColor(boundary - 0.000001, breaks), canadaDemographicShareColors[index]);
  assert.equal(canadaDemographicShareColor(boundary, breaks), canadaDemographicShareColors[index + 1]);
 }
 for (const malformed of [[], [1, 2, 3, 4], [1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4], [1, 1, 2, 3, 4], [2, 1, 3, 4, 5], [1, 2, 3, 4, 101], [1, 2, 3, 4, NaN]]) {
  assert.throws(() => canadaDemographicShareColor(1, malformed), RangeError);
 }
 assert.equal(canadaDemographicShareColor(0.049), canadaDemographicShareColors[0]);
 assert.equal(canadaDemographicShareColor(50), canadaDemographicShareColors[5]);
 assert.deepEqual(canadaDemographicShareBreaks, [1, 5, 10, 25, 50]);
});
