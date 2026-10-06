import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
import { readEuropeState } from '../../src/lib/atlas-europe-view.ts';
import { readEuropeFarmingFocus } from '../../src/data/atlas/europe/farming-water-comparisons.ts';
import {
  europeComparisonLinks, encodeEuropeReturn, readEuropeReturn,
  europeComparisonUrl, europeNamedReturnUrl, europeComparisonQuestion,
} from '../../src/lib/atlas-europe-comparison.ts';

const countries = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/countries.json', import.meta.url)));
const cities = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/climate-cities.json', import.meta.url))).map(city => city.id);
const state = query => readEuropeState(query, countries, cities);

test('comparison return preserves country, city, feature, point, rendering and independent farming choices', () => {
  for (const query of [
    '?layer=wheat&region=east&place=UKR&city=kyiv&compare=london,paris&feature=rotterdam&render=static&crops=off&livestock=off&single=1&returnLayer=crops',
    '?layer=cattle&region=west&city=london&livestock=off&single=1',
    '?layer=overlay&returnLayer=hubs&place=SWE&city=helsinki&feature=kiruna&crops=off',
    '?layer=climate&place=CHE&city=invalid&returnLayer=terrain',
    '?layer=density&region=north&feature=kaukas&render=static',
    '?layer=terrain&point=10.123456789,46.7654321&render=static',
    '?layer=contours&feature=alps&point=10.5,46.5&city=london',
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
    'layer=terrain&point=10,50&point=20,55',
  ]) assert.equal(readEuropeReturn(raw, countries, cities), null, raw);
});

test('a selected terrain or contour point survives ordinary comparison and named return', () => {
  for(const layer of ['terrain','contours']) {
    const original=state(`?layer=${layer}&point=10.123456789,46.7654321&render=static`);
    assert.deepEqual(original.point,[10.123456789,46.7654321]);
    const snapshot=structuredClone(original);
    for(const entry of europeComparisonLinks(original)) {
      const target=europeComparisonUrl(new URL('https://example.test/insight-journal/atlas/europe/nature/'),original,entry);
      assert.deepEqual(state(target.search).point,original.point,'A different topic keeps the independent saved point');
      const saved=readEuropeReturn(target.searchParams.get('europeReturn'),countries,cities);
      assert.deepEqual(saved,original);
      const returned=europeNamedReturnUrl(target,saved);
      assert.equal(returned.pathname,'/insight-journal/atlas/europe/nature/');
      assert.equal(returned.searchParams.has('europeReturn'),false);
      assert.deepEqual(state(returned.search),original);
    }
    assert.deepEqual(original,snapshot);
  }
  for(const point of ['65,50','10,32','NaN,50',',50']) {
    const normalized=readEuropeReturn(`layer=contours&point=${point}`,countries,cities);
    assert.ok(normalized,'An invalid point does not discard the otherwise valid source layer');
    assert.equal(Object.hasOwn(normalized,'point'),false);
  }
});

test('named feature comparisons select the destination elevation point while the return keeps the source click', () => {
  const original=state('?layer=density&point=-0.1278,51.5074&render=static');
  const snapshot=structuredClone(original);
  const base=new URL('https://example.test/insight-journal/atlas/europe/population/');
  const entries=europeComparisonLinks(original);
  const terrain=entries.find(entry=>entry.id==='population-terrain');
  const target=europeComparisonUrl(base,original,terrain);
  assert.equal(target.searchParams.get('feature'),'alps');
  assert.deepEqual(state(target.search).point,[9.5,46.6],'The Alps heading and elevation query refer to the Alps, not the London source click');
  const saved=readEuropeReturn(target.searchParams.get('europeReturn'),countries,cities);
  assert.deepEqual(saved,original);
  assert.deepEqual(state(europeNamedReturnUrl(target,saved).search),original);
  assert.deepEqual(original,snapshot,'Creating the destination does not mutate the saved source');

  const hubs=europeComparisonUrl(base,original,entries.find(entry=>entry.id==='population-hubs'));
  assert.equal(hubs.searchParams.get('feature'),'kiruna');
  assert.equal(hubs.searchParams.has('point'),false,'A named non-grid destination clears an unrelated numeric selection');
  assert.deepEqual(readEuropeReturn(hubs.searchParams.get('europeReturn'),countries,cities),original);
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
  assert.equal(wheat.find(item => item.targetLayer === 'climate').city, 'warsaw');
  assert.ok(wheat.some(item => item.targetLayer === 'precipitation'));
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
  assert.doesNotMatch(changedClimate, /ワルシャワの月別/);
  const changedRiver = europeComparisonQuestion(state('?layer=hubs&feature=rotterdam'), 'water', 'london', 'danube');
  assert.match(changedRiver, /現在の選択は別の地点/);
  assert.doesNotMatch(changedRiver, /ライン川の水地図/);
});

test('a focused crop entrance restores the source selection and rejects stale comparison text', () => {
  const original = state('?layer=rice&place=ITA&render=static&crops=off&livestock=off&single=1&city=rome&basin=2040048790&point=10.123456789,46.7654321');
  assert.deepEqual(original.point,[10.123456789,46.7654321]);
  for (const entry of europeComparisonLinks(original)) {
    const target = europeComparisonUrl(new URL('https://example.test/atlas/europe/agriculture/?europeFocus=pig-german-density'), original, entry);
    assert.equal(target.searchParams.get('europeFocus'), entry.id);
    assert.equal(readEuropeFarmingFocus(target.search, entry.targetLayer)?.id, entry.id);
    assert.equal(target.searchParams.get('basin'), entry.basin ?? null, 'old source basin cannot select a different target unit');
    assert.equal(target.searchParams.get('feature'), entry.feature ?? null, 'old source feature cannot select a different target point');
    assert.equal(target.searchParams.has('point'),false,'The registered farming focus owns its target point while the source snapshot keeps the old selection');
    const saved = readEuropeReturn(target.searchParams.get('europeReturn'), countries, cities);
    assert.deepEqual(saved, original);
    assert.deepEqual(state(europeNamedReturnUrl(target, saved).search), original);
    assert.equal(europeComparisonQuestion(saved, entry.targetLayer, entry.city, entry.feature, entry.id, entry.basin), entry.question);
    for (const stale of ['unknown-focus', 'rice-portugal-drainage', 'pig-german-density']) {
      if (stale === entry.id) continue;
      assert.equal(europeComparisonQuestion(saved, entry.targetLayer, entry.city, entry.feature, stale, entry.basin), '元の分布と現在の地図を読み比べ、位置、単位、対象年をそれぞれの資料で確かめます。');
    }
    if (entry.basin) assert.doesNotMatch(europeComparisonQuestion(saved, entry.targetLayer, entry.city, entry.feature, entry.id, '2040048790'), /ポー|2040012730/);
    if (entry.feature) assert.doesNotMatch(europeComparisonQuestion(saved, entry.targetLayer, entry.city, 'danube', entry.id), /ポー|アルプス/);
    const second = europeComparisonLinks(state(target.search))[0];
    const secondUrl = europeComparisonUrl(target, state(target.search), second);
    assert.equal(secondUrl.searchParams.has('europeFocus'), false, 'an ordinary second entrance cannot retain the old farming focus');
  }
});

test('farming statistical choices survive the comparison and named return', () => {
  const original = state('?layer=cattle&place=FIN&farmYear=2020&farmMeasure=cattle-milk&farmCompare=DEU,FRA&crops=off&livestock=off&single=1');
  assert.equal(original.farmYear, 2020);
  assert.equal(original.farmMeasure, 'cattle-milk');
  assert.deepEqual(original.farmCompare, ['DEU', 'FRA']);
  // These keys are normalized by the Europe state codec, and the comparison
  // snapshot must accept the same keys without accepting arbitrary URL state.
  for (const entry of europeComparisonLinks(original)) {
    const target = europeComparisonUrl(new URL('https://example.test/atlas/europe/agriculture/'), original, entry);
    const saved = readEuropeReturn(target.searchParams.get('europeReturn'), countries, cities);
    assert.deepEqual(saved, original);
    assert.deepEqual(state(europeNamedReturnUrl(target, saved).search), original);
  }
  assert.equal(readEuropeReturn('layer=cattle&farmYear=2020&farmMeasure=cattle-milk&farmCompare=DEU,FRA&unknown=1', countries, cities), null);
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
