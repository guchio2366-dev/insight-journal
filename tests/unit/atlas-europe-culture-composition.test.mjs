import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = new URL('../../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('public/assets/atlas/europe/population-cases-v1/cases.json', root), 'utf8'));
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('src/lib/atlas-europe-culture-composition.ts', root))],
  bundle: true, write: false, format: 'esm', platform: 'node', tsconfigRaw: {},
});
const { europeCultureCompositions, europeCultureCompositionColors } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const source = (composition, kind, packageData = data) => {
  const topic = packageData.cases.find(item => item.id === composition.caseId).topics.find(item => item.kind === kind);
  return { topic, country: topic.countries.find(item => item.code === composition.code) };
};

test('six compositions use the separately published country totals and exact census metadata', () => {
  for (const kind of ['ethnicity', 'religion']) {
    const compositions = europeCultureCompositions(kind);
    assert.deepEqual(compositions.map(item => [item.code, item.name, item.coordinates, item.denominator, item.referenceDate]), [
      ['E92000001', 'イングランド', [-1.5, 52.5], 56490048, '2021-03-21'],
      ['W92000004', 'ウェールズ', [-3.8, 52.2], 3107494, '2021-03-21'],
      ['HRV', 'クロアチア', [16, 45.3], 3871833, '2021-08-31'],
    ]);
    for (const composition of compositions) {
      const { topic, country } = source(composition, kind);
      assert.equal(composition.year, 2021);
      assert.equal(composition.sourceURL, topic.sourceURL);
      assert.equal(composition.segments.reduce((sum, segment) => sum + segment.count, 0), country.denominator);
      for (const segment of composition.segments) {
        const categories = segment.sourceCategoryIds.map(id => topic.categories.find(category => category.id === id));
        assert.equal(segment.count, categories.reduce((sum, category) => sum + country.counts[topic.categories.indexOf(category)], 0));
        assert.equal(segment.share, segment.count / country.denominator * 100);
        assert.deepEqual(segment.sourceLabels, categories.map(category => category.sourceLabel ?? category.label));
      }
    }
  }
});

test('England and Wales use five published ethnic aggregates without also adding their 19 children', () => {
  for (const composition of europeCultureCompositions('ethnicity').slice(0, 2)) {
    const { topic, country } = source(composition, 'ethnicity');
    assert.deepEqual(composition.segments.map(segment => segment.sourceCategoryIds), [
      ['ts021-01'], ['ts021-07'], ['ts021-11'], ['ts021-16'], ['ts021-22'],
    ]);
    assert.equal(composition.segments.reduce((sum, segment) => sum + segment.count, 0), country.denominator);
    assert.equal(country.counts.reduce((sum, count) => sum + count, 0), country.denominator * 2, 'Adding all original aggregate and detailed columns would double-count');
    const leaves = composition.segments.flatMap(segment => topic.categories.filter(category => category.parentId === segment.id).map(category => category.id));
    assert.deepEqual(leaves.slice().sort(), topic.partitionCategoryIds.slice().sort());
    assert.equal(new Set(leaves).size, 19);
  }
});

test('Croatian eight display groups cover all 29 original ethnic responses once and retain special responses', () => {
  const composition = europeCultureCompositions('ethnicity')[2];
  const { topic } = source(composition, 'ethnicity');
  assert.equal(composition.segments.length, 8);
  const ids = composition.segments.flatMap(segment => segment.sourceCategoryIds);
  assert.equal(new Set(ids).size, 29);
  assert.deepEqual(ids.slice().sort(), topic.partitionCategoryIds.slice().sort());
  const combined = composition.segments.find(segment => segment.id === 'hr-ethnicity-other-responses');
  assert.equal(combined.sourceCategoryIds.length, 22);
  assert.equal(combined.count, 129383);
  assert.equal(combined.share, 129383 / 3871833 * 100);
  assert.ok(combined.sourceCategoryIds.includes('hr-ethnicity-BB'), 'The publisher Other row remains inside the explicitly labelled display sum');
  assert.deepEqual(composition.segments.slice(3).map(segment => segment.sourceCategoryIds), [
    ['hr-ethnicity-BD'], ['hr-ethnicity-BF'], ['hr-ethnicity-BH'], ['hr-ethnicity-BJ'], ['hr-ethnicity-BL'],
  ]);
});

test('religious responses remain nine or twelve source categories without harmonisation', () => {
  const compositions = europeCultureCompositions('religion');
  assert.deepEqual(compositions.map(item => item.segments.length), [9, 9, 12]);
  for (const composition of compositions) {
    const { topic } = source(composition, 'religion');
    assert.deepEqual(composition.segments.map(segment => segment.sourceCategoryIds), topic.partitionCategoryIds.map(id => [id]));
  }
  const england = compositions[0].segments;
  assert.equal(england.find(segment => segment.id === 'ts030-01').count, 20715664);
  assert.equal(england.find(segment => segment.id === 'ts030-09').count, 3400548);
  const croatia = compositions[2].segments;
  assert.deepEqual(croatia.slice(0, 4).map(segment => segment.count), [3057735, 128395, 9956, 186960]);
  assert.deepEqual(croatia.slice(8).map(segment => segment.count), [64961, 182188, 66581, 83045]);
});

test('local rows never replace country totals and source differences are not rescaled away', () => {
  const packageData = structuredClone(data), before = JSON.stringify(packageData);
  for (const censusCase of packageData.cases) for (const topic of censusCase.topics) topic.areas = [];
  for (const kind of ['ethnicity', 'religion']) assert.deepEqual(europeCultureCompositions(kind, packageData), europeCultureCompositions(kind));
  const england = packageData.cases[0].topics.find(topic => topic.kind === 'religion').countries[0];
  england.denominator += 10;
  const composition = europeCultureCompositions('religion', packageData)[0];
  assert.equal(composition.denominator, 56490058);
  assert.equal(composition.segments[0].share, 20715664 / 56490058 * 100);
  assert.notEqual(composition.segments.reduce((sum, segment) => sum + segment.share, 0), 100);
  assert.equal(JSON.stringify(data), before, 'The retained source package must not be mutated');
});

test('missing totals, invalid denominators and missing counts omit a composition instead of inventing zero', () => {
  for (const denominator of [0, -1, NaN, Infinity, null, undefined]) {
    const packageData = structuredClone(data);
    packageData.cases[0].topics.find(topic => topic.kind === 'religion').countries[0].denominator = denominator;
    assert.deepEqual(europeCultureCompositions('religion', packageData).map(item => item.code), ['W92000004', 'HRV']);
  }
  for (const count of [-1, NaN, Infinity, null, undefined]) {
    const packageData = structuredClone(data);
    packageData.cases[0].topics.find(topic => topic.kind === 'religion').countries[0].counts[0] = count;
    assert.deepEqual(europeCultureCompositions('religion', packageData).map(item => item.code), ['W92000004', 'HRV']);
  }
  const packageData = structuredClone(data);
  packageData.cases[0].topics.find(topic => topic.kind === 'religion').countries.shift();
  assert.deepEqual(europeCultureCompositions('religion', packageData).map(item => item.code), ['W92000004', 'HRV']);
});

test('qualitative colours are fixed by category, with no quantity-derived radius or area in the model', () => {
  assert.equal(europeCultureCompositionColors.length, 12);
  assert.equal(new Set(europeCultureCompositionColors).size, 12);
  assert.ok(europeCultureCompositionColors.every(color => /^#[a-f0-9]{6}$/i.test(color)));
  const packageData = structuredClone(data);
  packageData.cases[0].topics.find(topic => topic.kind === 'religion').countries[0].counts[0] = 0;
  const changed = europeCultureCompositions('religion', packageData)[0];
  assert.equal(changed.segments[0].count, 0);
  assert.equal(changed.segments[0].share, 0);
  assert.deepEqual(changed.segments.map(segment => segment.color), europeCultureCompositions('religion')[0].segments.map(segment => segment.color));
  assert.deepEqual(Object.keys(changed).sort(), ['id', 'caseId', 'code', 'name', 'coordinates', 'year', 'referenceDate', 'denominator', 'sourceURL', 'segments'].sort());
  const first = europeCultureCompositions('religion');
  first[0].coordinates[0] = 99;
  first[0].segments[0].sourceCategoryIds.push('invented');
  assert.deepEqual(europeCultureCompositions('religion')[0].coordinates, [-1.5, 52.5]);
  assert.deepEqual(europeCultureCompositions('religion')[0].segments[0].sourceCategoryIds, ['ts030-01']);
});
