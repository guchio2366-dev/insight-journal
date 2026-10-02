import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = new URL('../../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const countries = json('src/data/atlas/europe/countries.json');
const packages = ['environment', 'society', 'politics-eu', 'politics-other']
  .map(name => json(`src/data/atlas/europe/country-overview-${name}.json`));
const entry = fileURLToPath(new URL('src/lib/atlas-europe-country-overview-navigation.ts', root));
// Match the existing local esbuild resolution pattern for Windows sandboxes.
const bundle = await build({
  entryPoints: [entry], bundle: true, write: false, format: 'esm', tsconfigRaw: {},
  plugins: [{
    name: 'local-europe-overview-navigation', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point') return { path: entry, namespace: 'europe-overview-navigation' };
        if (args.namespace === 'europe-overview-navigation' && args.path.startsWith('.')) {
          const candidate = resolve(dirname(args.importer), args.path);
          return { path: existsSync(candidate) ? candidate : candidate + '.ts', namespace: 'europe-overview-navigation' };
        }
      });
      builder.onLoad({ filter: /.*/, namespace: 'europe-overview-navigation' }, args => ({
        contents: readFileSync(args.path, 'utf8'), loader: extname(args.path) === '.json' ? 'json' : 'ts',
      }));
    },
  }],
});
const { readEuropeOverviewReturn, europeOverviewFieldHref } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const fields = ['nature', 'agriculture', 'industry', 'population'];
const origin = 'https://example.test';
const overviewPath = prefix => `${prefix}/atlas/europe/overview/`;
const fieldPath = (prefix, field) => `${prefix}/atlas/europe/${field}/`;

test('all 180 country × field fresh entrances select the country and restore its overview topic', () => {
  assert.equal(countries.length, 45);
  for (const prefix of ['', '/insight-journal']) {
    const base = origin + overviewPath(prefix);
    let entrances = 0;
    for (const country of countries) for (const field of fields) {
      const href = fieldPath(prefix, field), selection = { country: country.code, topic: field };
      const before = structuredClone(selection);
      const url = new URL(europeOverviewFieldHref(href, selection, base));
      assert.equal(url.origin, origin);
      assert.equal(url.pathname, href);
      assert.equal(url.searchParams.get('place'), country.code);
      assert.equal(url.searchParams.has('layer'), false, 'fresh links use the field initial layer');
      assert.equal(url.searchParams.has('feature'), false, 'fresh links carry no stale selected feature');
      assert.deepEqual([...url.searchParams.keys()].sort(), ['overviewReturn', 'place']);
      const returned = readEuropeOverviewReturn(url.searchParams.get('overviewReturn'), base);
      assert.ok(returned, country.code + ':' + field);
      assert.equal(returned.pathname, overviewPath(prefix));
      assert.equal(returned.searchParams.get('country'), country.code);
      assert.equal(returned.searchParams.get('topic'), field);
      assert.deepEqual([...returned.searchParams.keys()].sort(), ['country', 'topic']);
      assert.deepEqual(selection, before, 'selection is not mutated');
      entrances++;
    }
    assert.equal(entrances, 180);
  }
});

test('explicit field layers, features, and rendering choices survive replacement of country and return', () => {
  const choices = [
    ['nature', 'layer=water&feature=rhine&render=static'],
    ['agriculture', 'layer=cattle&feature=alps&single=1&crops=off&livestock=off'],
    ['industry', 'layer=hubs&feature=rotterdam&render=webgl'],
    ['population', 'layer=density&feature=city-1159151529'],
  ];
  for (const prefix of ['', '/insight-journal']) for (const [field, query] of choices) {
    const base = origin + overviewPath(prefix) + '?country=DEU&topic=politics';
    const href = fieldPath(prefix, field) + '?' + query + '&place=FRA&overviewReturn=old#map';
    const before = new URL(href, base);
    const url = new URL(europeOverviewFieldHref(href, { country: 'DEU', topic: 'politics', city: 'berlin' }, base));
    assert.equal(url.pathname, before.pathname);
    assert.equal(url.hash, '#map');
    for (const key of before.searchParams.keys()) {
      if (key !== 'place' && key !== 'overviewReturn') assert.deepEqual(url.searchParams.getAll(key), before.searchParams.getAll(key), key);
    }
    assert.deepEqual(url.searchParams.getAll('place'), ['DEU']);
    const returned = readEuropeOverviewReturn(url.searchParams.get('overviewReturn'), base);
    assert.ok(returned);
    assert.equal(returned.searchParams.get('country'), 'DEU');
    assert.equal(returned.searchParams.get('topic'), 'politics');
    assert.equal(returned.searchParams.get('city'), 'berlin');
    assert.equal(returned.hash, '');
    assert.equal(returned.searchParams.has('layer'), false);
    assert.equal(returned.searchParams.has('feature'), false);
  }
});

test('a field observation city and the overview return city retain their separate contexts', () => {
  const base = origin + '/insight-journal/atlas/europe/overview/?country=DEU&topic=nature&city=berlin';
  const url = new URL(europeOverviewFieldHref('/insight-journal/atlas/europe/nature/?layer=climate&city=paris', { country: 'DEU', topic: 'nature', city: 'berlin' }, base));
  assert.equal(url.searchParams.get('city'), 'paris');
  assert.equal(url.searchParams.get('layer'), 'climate');
  const returned = readEuropeOverviewReturn(url.searchParams.get('overviewReturn'), base);
  assert.equal(returned.searchParams.get('city'), 'berlin');
  assert.equal(returned.searchParams.get('country'), 'DEU');
});

test('every authored field link retains its explicit query choices and gets the selected overview topic', () => {
  const base = origin + '/atlas/europe/overview/';
  let internal = 0, external = 0;
  for (const item of packages) for (const [code, topics] of Object.entries(item.countries)) {
    for (const [topic, copy] of Object.entries(topics)) for (const link of copy.links) {
      const before = new URL(link.href, base);
      const actual = europeOverviewFieldHref(link.href, { country: code, topic }, base);
      if (before.origin !== origin) {
        assert.equal(actual, link.href, code + ':' + topic);
        external++;
        continue;
      }
      const url = new URL(actual);
      assert.equal(url.pathname, before.pathname);
      assert.equal(url.searchParams.get('place'), code);
      for (const key of before.searchParams.keys()) {
        if (key !== 'place' && key !== 'overviewReturn') assert.deepEqual(url.searchParams.getAll(key), before.searchParams.getAll(key), link.href);
      }
      const returned = readEuropeOverviewReturn(url.searchParams.get('overviewReturn'), base);
      assert.ok(returned, link.href);
      assert.equal(returned.searchParams.get('country'), code);
      assert.equal(returned.searchParams.get('topic'), topic);
      internal++;
    }
  }
  assert.ok(internal >= 180, 'the four fields have authored reading links');
  assert.ok(external >= 45, 'political sources remain public external links');
});

test('external URLs and routes outside the four Europe fields remain byte-for-byte unchanged', () => {
  const base = origin + '/insight-journal/atlas/europe/overview/';
  const selection = { country: 'DEU', topic: 'politics' };
  for (const href of [
    'https://source.test/atlas/europe/nature/?a=1%202#section',
    '//source.test/atlas/europe/agriculture/?layer=wheat',
    'https://european-union.europa.eu/principles-countries-history/eu-countries/germany_en',
    'http://example.test/atlas/europe/nature/',
    'mailto:public@example.test',
    '/atlas/europe/overview/?country=DEU&topic=nature',
    '/atlas/north-america/nature/',
    '/atlas/europe/nature/not-a-field/',
    '/unrelated/',
  ]) assert.equal(europeOverviewFieldHref(href, selection, base), href, href);
});

test('valid overview returns round-trip all five topics under both published deployment bases', () => {
  for (const prefix of ['', '/insight-journal']) for (const topic of ['agriculture', 'nature', 'industry', 'population', 'politics']) {
    const base = origin + fieldPath(prefix, 'nature');
    const relative = overviewPath(prefix) + '?country=DEU&topic=' + topic + '&city=berlin';
    for (const value of [relative, origin + relative]) {
      const returned = readEuropeOverviewReturn(value, base);
      assert.ok(returned, value);
      assert.equal(returned.origin, origin);
      assert.equal(returned.pathname, overviewPath(prefix));
      assert.deepEqual([...returned.searchParams.entries()], [['country', 'DEU'], ['topic', topic], ['city', 'berlin']]);
    }
  }
});

test('overview returns reject external origins, credentials, fragments, extra or duplicate keys, and invalid selections', () => {
  const base = origin + '/insight-journal/atlas/europe/nature/';
  const valid = '/insight-journal/atlas/europe/overview/?country=DEU&topic=politics';
  const rejected = [
    null, '', 'x'.repeat(1501), 'http://[',
    'https://evil.test' + valid, '//evil.test' + valid,
    'http://example.test' + valid, 'https://example.test.evil.test' + valid,
    'https://example.test@evil.test' + valid,
    'https://user:password@example.test' + valid,
    'https://evil.test@example.test' + valid,
    'javascript:alert(1)', 'data:text/html,overview',
    valid + '#details', valid + '#https://evil.test',
    valid + '&redirect=https://evil.test', valid + '&unknown=1', valid + '&__proto__=x',
    valid + '&country=FRA', valid + '&topic=nature',
    valid + '&city=berlin&city=paris', valid + '&%63ountry=FRA',
    '/atlas/europe/nature/?country=DEU&topic=politics',
    '/atlas/europe/overview?country=DEU&topic=politics',
    '/atlas/europe//overview/?country=DEU&topic=politics',
    '/atlas/europe/%2Foverview/?country=DEU&topic=politics',
    '/atlas/north-america/overview/?country=DEU&topic=politics',
    '/atlas/europe/overview/?topic=politics',
    '/atlas/europe/overview/?country=DEU',
    '/atlas/europe/overview/?country=&topic=politics',
    '/atlas/europe/overview/?country=deu&topic=politics',
    '/atlas/europe/overview/?country=USA&topic=politics',
    '/atlas/europe/overview/?country=XXX&topic=politics',
    '/atlas/europe/overview/?country=DEU&topic=',
    '/atlas/europe/overview/?country=DEU&topic=Political',
    '/atlas/europe/overview/?country=DEU&topic=unknown',
    valid + '&city=', valid + '&city=Berlin', valid + '&city=../paris',
    valid + '&city=https%3A%2F%2Fevil.test', valid + '&city=berlin%23section',
    valid + '&city=' + 'a'.repeat(81),
  ];
  for (const value of rejected) assert.equal(readEuropeOverviewReturn(value, base), undefined, String(value));
});

test('the link writer excludes invalid return cities and normalizes an invalid overview topic', () => {
  const base = origin + '/atlas/europe/overview/';
  for (const city of ['', 'Berlin', '../paris', 'x'.repeat(81), 'https://evil.test']) {
    const url = new URL(europeOverviewFieldHref('/atlas/europe/population/?layer=density', { country: 'DEU', topic: 'unknown', city }, base));
    const returned = readEuropeOverviewReturn(url.searchParams.get('overviewReturn'), base);
    assert.ok(returned);
    assert.equal(returned.searchParams.get('topic'), 'agriculture');
    assert.equal(returned.searchParams.has('city'), false);
  }
  for (const code of ['XXX', 'deu', 'USA', '']) {
    const url = new URL(europeOverviewFieldHref('/atlas/europe/nature/?layer=terrain&feature=alps', { country: code, topic: 'nature' }, base));
    assert.equal(url.searchParams.get('layer'), 'terrain');
    assert.equal(url.searchParams.get('feature'), 'alps');
    assert.equal(url.searchParams.has('place'), false);
    assert.equal(url.searchParams.has('overviewReturn'), false);
  }
});

