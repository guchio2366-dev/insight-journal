import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
import { readEuropeState } from '../../src/lib/atlas-europe-view.ts';
import {
  europeComparisonLinks, encodeEuropeReturn, readEuropeReturn,
  europeComparisonUrl, europeNamedReturnUrl, europeComparisonQuestion,
} from '../../src/lib/atlas-europe-comparison.ts';

const countries = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/countries.json', import.meta.url)));
const cities = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/climate-cities.json', import.meta.url))).map(city => city.id);
const state = query => readEuropeState(query, countries, cities);

test('comparison return preserves country, city, feature, rendering and independent farming choices', () => {
  for (const query of [
    '?layer=wheat&region=east&place=UKR&city=kyiv&compare=london,paris&feature=rotterdam&render=static&crops=off&livestock=off&single=1&returnLayer=crops',
    '?layer=cattle&region=west&city=london&livestock=off&single=1',
    '?layer=overlay&returnLayer=hubs&place=SWE&city=helsinki&feature=kiruna&crops=off',
    '?layer=climate&place=CHE&city=invalid&returnLayer=terrain',
    '?layer=density&region=north&feature=kaukas&render=static',
  ]) {
    const original = state(query), encoded = encodeEuropeReturn(original);
    assert.deepEqual(readEuropeReturn(encoded, countries, cities), original);
    assert.equal(encoded.includes('europeReturn'), false);
    assert.equal(encoded.includes('/atlas/'), false);
  }
});

test('return query rejects malformed or unbounded envelopes, duplicate keys and unknown layers', () => {
  for (const raw of [
    '', 'x'.repeat(2049), '?layer=wheat', 'https://evil.test/?layer=wheat', '//evil.test/?layer=wheat',
    'layer=wheat#fragment', 'layer=wheat\\evil', 'layer=wheat&city=%', 'layer=wheat&city=%GG',
    'layer=wheat&city=%FF', 'layer=wheat&city=%00', 'layer=wheat\n', 'layer=wheat&layer=cattle',
    'layer=wheat&render', 'layer=wheat&&city=paris', '&layer=wheat', 'layer=wheat&',
    'layer=wheat&city=paris&city=london', 'layer=wheat&returnLayer=hubs&returnLayer=climate',
    'layer=unknown', 'layer=wheat&returnLayer=unknown', 'city=london',
    'layer=wheat&europeReturn=layer%3Dcattle', 'layer=wheat&url=https%3A%2F%2Fevil.test',
    'layer=wheat&__proto__=x', 'layer=wheat&constructor=x',
  ]) assert.equal(readEuropeReturn(raw, countries, cities), null, raw);
});

test('safe return values use the shared country, city and farming normalization', () => {
  const normalized = readEuropeReturn('layer=density&returnLayer=climate&place=UKR&region=west&city=invalid&compare=london,london,invalid,paris,berlin&render=bad&single=1&crops=off&livestock=false&feature=not_valid', countries, cities);
  assert.deepEqual(normalized, state('?layer=density&returnLayer=climate&place=UKR&region=west&city=invalid&compare=london,london,invalid,paris,berlin&render=bad&single=1&crops=off&livestock=false&feature=not_valid'));
  assert.equal(normalized.region, 'east');
  assert.equal(normalized.city, 'kyiv');
  assert.deepEqual(normalized.compare, ['london', 'paris']);
  assert.equal(normalized.single, undefined);
});

test('comparison links route to the selected field while source state returns exactly', () => {
  const base = new URL('https://example.test/unrelated/?europeReturn=evil&redirect=https://evil.test&unrelated=kept#old');
  const original = state('?layer=wheat&place=UKR&city=kyiv&compare=london,paris&render=static&crops=off&livestock=off&single=1&feature=alps&returnLayer=crops');
  const before = structuredClone(original);
  for (const comparison of europeComparisonLinks(original)) {
    const target = europeComparisonUrl(base, original, comparison);
    const field = europeLayers.find(layer => layer.id === comparison.targetLayer).field;
    assert.equal(target.origin, base.origin);
    assert.equal(target.pathname, `/atlas/europe/${field}/`);
    assert.equal(target.hash, '');
    assert.equal(target.searchParams.has('unrelated'), false);
    assert.equal(target.searchParams.has('redirect'), false);
    assert.equal(target.searchParams.get('layer'), comparison.targetLayer);
    assert.equal(target.searchParams.has('region'), false);
    assert.equal(target.searchParams.has('place'), false);
    assert.equal(target.searchParams.has('compare'), false);
    const saved = readEuropeReturn(target.searchParams.get('europeReturn'), countries, cities);
    assert.deepEqual(saved, original);
    const returned = europeNamedReturnUrl(target, saved);
    assert.equal(returned.pathname, '/atlas/europe/agriculture/');
    assert.equal(returned.searchParams.has('europeReturn'), false);
    assert.deepEqual(state(returned.search), original);
    assert.ok(europeComparisonQuestion(saved, comparison.targetLayer, comparison.city, comparison.feature));
  }
  assert.deepEqual(original, before);
  assert.equal(base.pathname, '/unrelated/');
  assert.equal(base.hash, '#old');
  const publicBase = new URL('https://example.test/insight-journal/atlas/europe/agriculture/?unrelated=kept');
  const comparison = europeComparisonLinks(original)[0];
  const publicTarget = europeComparisonUrl(publicBase, original, comparison);
  assert.equal(publicTarget.pathname, '/insight-journal/atlas/europe/nature/');
  const restored = readEuropeReturn(publicTarget.searchParams.get('europeReturn'), countries, cities);
  assert.equal(europeNamedReturnUrl(publicTarget, restored).pathname, '/insight-journal/atlas/europe/agriculture/');
  assert.deepEqual(restored, original);
});

test('all field selections expose two or three distinct registered cross-field links', () => {
  for (const layer of europeLayers) {
    const original = state(`?layer=${layer.id}`), links = europeComparisonLinks(original);
    assert.ok(links.length >= 2 && links.length <= 3, layer.id);
    assert.equal(new Set(links.map(item => item.id)).size, links.length);
    for (const comparison of links) {
      const target = europeLayers.find(item => item.id === comparison.targetLayer);
      assert.ok(target, comparison.targetLayer);
      assert.notEqual(target.field, layer.field);
      assert.ok(comparison.question.length > 20);
    }
  }
});

test('specific sourced readings select useful river, population, forestry and climate comparisons', () => {
  const wheat = europeComparisonLinks(state('?layer=wheat'));
  assert.equal(wheat.find(item => item.targetLayer === 'climate').city, 'paris');
  const cattle = europeComparisonLinks(state('?layer=cattle'));
  assert.equal(cattle.find(item => item.targetLayer === 'climate').city, 'london');
  const rotterdam = europeComparisonLinks(state('?layer=hubs&feature=rotterdam'));
  assert.equal(rotterdam.find(item => item.targetLayer === 'water').feature, 'rhine');
  assert.ok(rotterdam.some(item => item.targetLayer === 'density'));
  const kiruna = europeComparisonLinks(state('?layer=hubs&feature=kiruna'));
  assert.ok(kiruna.some(item => item.targetLayer === 'density'));
  assert.ok(kiruna.some(item => item.targetLayer === 'climate'));
  assert.ok(europeComparisonLinks(state('?layer=hubs&feature=kaukas')).some(item => item.targetLayer === 'forest'));
  const changedClimate = europeComparisonQuestion(state('?layer=wheat'), 'climate', 'london');
  assert.match(changedClimate, /現在の選択は別の地点/);
  assert.doesNotMatch(changedClimate, /パリの月別/);
  const changedRiver = europeComparisonQuestion(state('?layer=hubs&feature=rotterdam'), 'water', 'london', 'danube');
  assert.match(changedRiver, /現在の選択は別の地点/);
  assert.doesNotMatch(changedRiver, /ライン川の水地図/);
});

test('national population and GDP indicators keep their own meaning in every comparison entrance',()=>{
  for(const id of ['urban','age','growth','manufacturing','industry','services']) {
    const layer=europeLayers.find(l=>l.id===id);
    for(const entry of europeComparisonLinks(state(`?layer=${id}&feature=kiruna`))) {
      assert.ok(entry.label.includes(layer.title));assert.ok(entry.question.includes(layer.title));
      assert.match(entry.question,/2023年.*国全体/);
      assert.doesNotMatch(entry.question,/人口密度と産業拠点の位置|ロッテルダム、ルートヴィヒスハーフェンの拠点/);
    }
  }
});

test('fixed route helpers discard credentials and refuse invalid target layers and non-web origins', () => {
  const original = state('?layer=overlay&returnLayer=hubs&feature=rotterdam&crops=off');
  const base = new URL('https://user:password@example.test/evil/?return=https://evil.test');
  const returned = europeNamedReturnUrl(base, original);
  assert.equal(returned.pathname, '/atlas/europe/industry/');
  assert.equal(returned.username, '');
  assert.equal(returned.password, '');
  assert.equal(returned.searchParams.has('return'), false);
  assert.deepEqual(state(returned.search), original);
  assert.throws(() => europeComparisonUrl(base, original, { targetLayer: '//evil.test/' }), TypeError);
  assert.throws(() => europeNamedReturnUrl(new URL('file:///tmp/index.html'), original), TypeError);
  assert.throws(() => encodeEuropeReturn({ ...original, layer: 'invalid' }), TypeError);
  assert.throws(() => europeNamedReturnUrl(base, { ...original, returnLayer: 'invalid' }), TypeError);
  const doubleSlash = europeNamedReturnUrl(new URL('https://example.test//evil.test/atlas/europe/nature/'), original);
  assert.equal(doubleSlash.origin, 'https://example.test');
  assert.equal(doubleSlash.pathname, '//evil.test/atlas/europe/industry/');
});
