import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = new URL('../../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const countries = json('src/data/atlas/europe/countries.json');
const statistics = json('src/data/atlas/europe/country-statistics.json');
const cities = json('src/data/atlas/europe/climate-cities.json');
const entry = fileURLToPath(new URL('src/data/atlas/europe/country-overviews.ts', root));
const layerEntry = fileURLToPath(new URL('src/data/atlas/europe/layers.ts', root));
// Resolve only local files, including JSON, without inspecting packages outside
// the worktree in the Windows sandbox.
const bundle = await build({
  entryPoints: [entry, layerEntry], outdir: 'overview-test-bundle', bundle: true, write: false, format: 'esm', tsconfigRaw: {},
  plugins: [{
    name: 'local-europe-overview-data', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point') return { path: args.path, namespace: 'europe-overview-data' };
        if (args.namespace === 'europe-overview-data' && args.path.startsWith('.')) {
          const candidate = resolve(dirname(args.importer), args.path);
          return { path: existsSync(candidate) ? candidate : candidate + '.ts', namespace: 'europe-overview-data' };
        }
      });
      builder.onLoad({ filter: /.*/, namespace: 'europe-overview-data' }, args => ({
        contents: readFileSync(args.path, 'utf8'), loader: extname(args.path) === '.json' ? 'json' : 'ts',
      }));
    },
  }],
});
const {
  europeCountryOverviews, europeCountryOverviewSources, europeOverviewTopics,
  countryOverview, countryOverviewSource, formatOverviewFact,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles.find(file => file.path.endsWith('country-overviews.js')).text).toString('base64')}`);
const { europeLayers } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles.find(file => file.path.endsWith('layers.js')).text).toString('base64')}`);
const topics = ['agriculture', 'nature', 'industry', 'population', 'politics'];
const euCodes = 'AUT BEL BGR HRV CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE'.split(' ').sort();
const sources = new Map(europeCountryOverviewSources.map(source => [source.id, source]));
const copies = () => europeCountryOverviews.flatMap(country => Object.entries(country.topics).map(([topic, copy]) => ({ country, topic, copy })));
const triples = overview => overview.slice().sort((a, b) => a.code.localeCompare(b.code)).flatMap(country =>
  country.facts.slice().sort((a, b) => a.id.localeCompare(b.id)).map(fact => [country.code, fact.id, fact.value]));

test('45 existing countries retain exactly five complete, cited overview topics', () => {
  assert.equal(countries.length, 45);
  assert.deepEqual(europeOverviewTopics.map(topic => topic.id), topics);
  assert.deepEqual(europeCountryOverviews.map(country => [country.code, country.name]), countries.map(country => [country.code, country.name]));
  const missing = europeCountryOverviews.flatMap(country => topics.filter(topic => !country.topics[topic]).map(topic => `${country.code}:${topic}`));
  assert.deepEqual(missing, [], 'incomplete editorial topics');
  assert.equal(copies().length, 225);
  for (const country of europeCountryOverviews) {
    assert.deepEqual(Object.keys(country.topics).sort(), topics.slice().sort(), country.code);
    assert.equal(countryOverview(country.code), country);
  }
  for (const { country, topic, copy } of copies()) {
    const context = `${country.code}:${topic}`;
    assert.equal(typeof copy.takeaway, 'string', context);
    assert.equal(typeof copy.body, 'string', context);
    assert.ok(copy.takeaway.trim(), context + ' takeaway');
    assert.ok(copy.body.trim(), context + ' body');
    assert.doesNotMatch(copy.takeaway + copy.body, /(?:TODO|TBD|準備中|本文未掲載|あとで記述)/i, context);
    assert.ok(Array.isArray(copy.sourceIds) && copy.sourceIds.length > 0, context + ' citations');
    assert.equal(new Set(copy.sourceIds).size, copy.sourceIds.length, context + ' duplicate citations');
    assert.ok(Array.isArray(copy.links) && copy.links.length > 0, context + ' reading links');
  }
  assert.equal(countryOverview('XXX'), undefined);
  assert.equal(countryOverview('deu'), undefined);
});

test('every editorial citation resolves to a unique public source with period and check date', () => {
  assert.equal(sources.size, europeCountryOverviewSources.length, 'duplicate source IDs');
  for (const source of europeCountryOverviewSources) {
    assert.ok(source.id && source.label.trim() && source.period.trim(), source.id);
    assert.equal(source.checkedAt, '2026-10-02', source.id);
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:', source.id);
    assert.equal(url.username + url.password, '', source.id);
    assert.doesNotMatch(url.hostname, /(?:notion|chatgpt)\./i, source.id);
    assert.equal(countryOverviewSource(source.id), source);
  }
  for (const { country, topic, copy } of copies()) {
    for (const id of copy.sourceIds) assert.ok(sources.has(id), `${country.code}:${topic} missing source ${id}`);
    for (const link of copy.links) {
      assert.ok(link.label.trim(), `${country.code}:${topic} link label`);
      const url = new URL(link.href, 'https://example.test');
      if (url.origin !== 'https://example.test') {
        assert.equal(url.protocol, 'https:', link.href);
        assert.ok(copy.sourceIds.some(id => sources.get(id)?.url === link.href), `${country.code}:${topic} external link needs its own citation`);
      } else {
        assert.match(url.pathname, /^\/atlas\/europe\/(?:nature|agriculture|industry|population)\/$/, link.href);
        assert.equal(url.searchParams.get('place'), country.code, link.href);
      }
    }
  }
  assert.equal(countryOverviewSource('unknown-source'), undefined);
});

test('all 450 national facts preserve the retained 2023 WDI values and indicator metadata', () => {
  assert.equal(statistics.year, 2023);
  assert.equal(statistics.indicators.length, 10);
  for (const country of europeCountryOverviews) {
    assert.deepEqual(country.facts, statistics.indicators.map(indicator => {
      assert.ok(Object.hasOwn(indicator.values[country.code], '2023'), country.code + ':' + indicator.id);
      return {
        id: indicator.id, label: indicator.label, value: indicator.values[country.code]['2023'],
        unit: indicator.unit, year: 2023, sourceUrl: indicator.sourceUrl,
      };
    }), country.code);
  }
  const values = triples(europeCountryOverviews);
  assert.equal(values.length, 450);
  // SHA-256 of sorted [country, indicator, value] triples from the published
  // country-statistics.json at base 83b2fd2; no rounding or missing-value repair.
  assert.equal(createHash('sha256').update(JSON.stringify(values)).digest('hex'),
    '29fe7fd4c3abbcecdf0c0b795b6302dcadc5f76ef2320f5fa0a4499be7b537f6');
});

test('the 14 missing facts, Monaco forest zero, and 16 negative growth values remain distinct', () => {
  const values = triples(europeCountryOverviews);
  assert.deepEqual(values.filter(([, , value]) => value === null).map(([code, id]) => [code, id]), [
    ['BGR', 'manufacturing'], ['KOS', 'forest'], ['MCO', 'agrishare'], ['MCO', 'manufacturing'],
    ['VAT', 'age'], ['VAT', 'agrishare'], ['VAT', 'forest'], ['VAT', 'gdp'], ['VAT', 'growth'],
    ['VAT', 'industry'], ['VAT', 'manufacturing'], ['VAT', 'population'], ['VAT', 'services'], ['VAT', 'urban'],
  ]);
  const monacoForest = countryOverview('MCO').facts.find(fact => fact.id === 'forest');
  assert.equal(monacoForest.value, 0);
  assert.equal(formatOverviewFact(monacoForest), '0 陸地面積比 %');
  assert.equal(formatOverviewFact(countryOverview('VAT').facts.find(fact => fact.id === 'population')), '未掲載');
  const decreasing = values.filter(([, id, value]) => id === 'growth' && value !== null && value < 0);
  assert.deepEqual(decreasing.map(([code]) => code), ['ALB', 'BGR', 'BIH', 'BLR', 'GRC', 'HUN', 'ITA', 'KOS', 'MDA', 'MKD', 'MNE', 'POL', 'RUS', 'SRB', 'SVK', 'UKR']);
  for (const [code] of decreasing) {
    const fact = countryOverview(code).facts.find(fact => fact.id === 'growth');
    assert.match(formatOverviewFact(fact), /^-/, code);
    assert.doesNotMatch(formatOverviewFact(fact), /未掲載/, code);
  }
});

test('monthly observation links cite JMA stations separately from Beck climate classification', () => {
  const classification = countryOverviewSource('climate'), observations = countryOverviewSource('observations');
  assert.match(classification.label, /Beck/);
  assert.equal(classification.url, 'https://www.gloh2o.org/koppen/');
  assert.equal(classification.period, '1991–2020');
  assert.equal(observations.url, 'https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/');
  assert.match(observations.period, /1991–2020.*地点別/);
  assert.notEqual(observations.url, classification.url);
  assert.equal(cities.length, 24);
  assert.equal(new Set(cities.map(city => city.country)).size, 23);
  const uncited = [], unknown = [];
  let stationLinks = 0, classificationLinks = 0;
  for (const { country, topic, copy } of copies()) for (const link of copy.links) {
    const url = new URL(link.href, 'https://example.test');
    if (url.origin !== 'https://example.test' || url.searchParams.get('layer') !== 'climate') continue;
    const city = url.searchParams.get('city');
    if (city) {
      stationLinks++;
      if (!cities.some(station => station.id === city)) unknown.push(`${country.code}:${topic}:${city}`);
      if (!copy.sourceIds.includes('observations')) uncited.push(`${country.code}:${topic}:${city}`);
    } else {
      classificationLinks++;
      assert.ok(copy.sourceIds.includes('climate'), `${country.code}:${topic} classification source`);
    }
  }
  assert.ok(stationLinks > 0 && classificationLinks > 0, 'both readings are represented');
  assert.deepEqual(unknown, [], 'unrecorded observation station');
  assert.deepEqual(uncited, [], 'station reading incorrectly cites only classification');
});

test('all four GLW4 animal layers connect overview readings to livestock, not SPAM crop evidence', () => {
  const livestock = countryOverviewSource('livestock'), farming = countryOverviewSource('farming');
  assert.equal(livestock.url, 'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/');
  assert.match(livestock.label, /GLW4/);
  assert.match(livestock.period, /2020/);
  assert.notEqual(livestock.url, farming.url);
  const animals = new Set(['cattle', 'pig', 'chicken', 'sheep']), represented = new Set(), uncited = [];
  for (const id of animals) {
    const layer = europeLayers.find(layer => layer.id === id);
    assert.ok(layer, id);
    assert.equal(layer.source, livestock.url, id);
    assert.equal(layer.period, '2020', id);
    assert.equal(layer.unit, id === 'chicken' ? '羽/km²' : '頭/km²', id);
    assert.match(layer.note, /GLW4.*モデル推計/, id);
  }
  for (const { country, topic, copy } of copies()) for (const link of copy.links) {
    const url = new URL(link.href, 'https://example.test'), layer = url.searchParams.get('layer');
    if (url.origin !== 'https://example.test' || !animals.has(layer)) continue;
    represented.add(layer);
    if (!copy.sourceIds.includes('livestock')) uncited.push(`${country.code}:${topic}:${layer}`);
  }
  assert.deepEqual(uncited, [], 'GLW4 animal reading without GLW4 citation');
  assert.ok(represented.size > 0, 'overview animal links are exercised');
});

test('tree cover evidence keeps its 2021 classification separate from 2023 national forest ratio', () => {
  const treecover = countryOverviewSource('treecover');
  assert.match(treecover.label, /WorldCover/);
  assert.equal(treecover.period, '2021');
  assert.ok(!treecover.url.includes('worldbank.org'));
  const forest = countryOverview('MCO').facts.find(fact => fact.id === 'forest');
  assert.equal(forest.year, 2023);
  assert.equal(forest.unit, '陸地面積比 %');
  assert.equal(forest.sourceUrl, 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS');
  assert.notEqual(treecover.url, forest.sourceUrl);
});

test('EU and other-country political sources cover disjoint countries with explicit evidence versions', () => {
  const eu = json('src/data/atlas/europe/country-overview-politics-eu.json');
  const other = json('src/data/atlas/europe/country-overview-politics-other.json');
  assert.deepEqual(Object.keys(eu.countries).sort(), euCodes);
  assert.deepEqual(Object.keys(other.countries).sort(), countries.map(country => country.code).filter(code => !euCodes.includes(code)).sort());
  for (const country of europeCountryOverviews) {
    const politics = country.topics.politics;
    if (!politics) continue; // Completeness has a separate, actionable assertion.
    for (const id of politics.sourceIds) {
      const source = countryOverviewSource(id);
      assert.ok(source, country.code + ':' + id);
      assert.equal(source.checkedAt, '2026-10-02', id);
      assert.ok(source.period.trim(), id + ' edition or observation period');
      assert.doesNotMatch(source.period, /^(?:最新|現行|不明)$/, id);
      assert.doesNotMatch(source.url, /(?:worldbank\.org|gloh2o\.org|mapspam\.info)/, id);
    }
    for (const link of politics.links) {
      assert.ok(politics.sourceIds.some(id => countryOverviewSource(id)?.url === link.href), country.code + ' primary institutional link');
    }
  }
  assert.match(countryOverviewSource('dnk-constitutional-act').period, /1953年憲法.*2013年英訳/);
  assert.match(countryOverviewSource('politics-other-rus-constitution').period, /2021.*2020年改正/);
  assert.match(countryOverviewSource('politics-other-mda-constitution').period, /2022年版/);
  assert.match(countryOverviewSource('politics-other-vat-basiclaw').period, /2026-07-31/);
});
