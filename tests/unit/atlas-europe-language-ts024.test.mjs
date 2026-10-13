import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { europeMainLanguage, europeLanguageReading, europeLanguageMapData, normaliseEuropeLanguageChoice, europeLanguageColor } from '../../src/lib/atlas-europe-language.ts';
import { readEuropeState, writeEuropeState } from '../../src/lib/atlas-europe-view.ts';

const boundary = JSON.parse(await fs.readFile(new URL('../../public/assets/atlas/europe/population-cases-v1/england-wales-lad2021.geojson', import.meta.url)));
const data = europeMainLanguage;

test('TS024 preserves one real 2021 LAD row per existing official boundary', () => {
  assert.equal(data.areas.length, 331);
  assert.deepEqual(data.areas.map(item => item.code).sort(), boundary.features.map(item => item.properties.code).sort());
  assert.equal(data.denominator, 'Main language (detailed): Total: All usual residents aged 3 years and over');
  assert.equal(data.categories.find(item => item.id === 'other').sourceColumn, 'Derived: column 4 minus column 5');
  assert.equal(data.categories.find(item => item.id === 'polish').sourceColumn, 'Main language (detailed): Other European language (EU): Polish');
  for (const area of data.areas) {
    assert.equal(area.counts.length, data.categories.length);
    assert(area.denominator > 0 && area.counts.every(value => Number.isSafeInteger(value) && value >= 0 && value <= area.denominator));
    assert(area.counts[data.categories.findIndex(item => item.id === 'urdu')] <= area.counts[data.categories.findIndex(item => item.id === 'south-asian')]);
  }
});

test('retained Library text extract matches the declared extract hash, without claiming original-byte identity', async () => {
  const bytes = await fs.readFile(new URL('../../data-source/atlas/europe/population-cases/census2021-ts024-ltla-library-extract.csv', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), data.provenance.retainedTextExtractSha256);
  assert.match(data.provenance.note, /not the original CSV bytes/);
});

test('selected source counts yield map percentages and exactly one selected LAD', () => {
  const choice = { languageCategory: 'other', languageArea: 'E09000025' }; // Newham
  const reading = europeLanguageReading(choice);
  assert.equal(reading.area.name, 'Newham');
  assert(reading.share > 34 && reading.share < 35);
  const map = europeLanguageMapData(boundary, choice);
  assert.equal(map.features.length, 331);
  assert.equal(map.features.filter(feature => feature.properties.selected).length, 1);
  const feature = map.features.find(feature => feature.properties.code === choice.languageArea);
  assert.equal(feature.properties.count, reading.count);
  assert.equal(feature.properties.denominator, reading.area.denominator);
  assert.equal(feature.properties.fill, europeLanguageColor(reading.share, 'other'));
  assert.notEqual(feature.properties.fill, '#b8bec7');
  assert.notEqual(europeLanguageMapData(boundary, { languageCategory: 'polish' }).features.find(item => item.properties.code === choice.languageArea).properties.count, reading.count);
});

test('language category and area URLs reject unknown codes and survive return navigation', () => {
  assert.deepEqual(normaliseEuropeLanguageChoice(new URLSearchParams('languageCategory=bad&languageArea=BAD')), { languageCategory: 'other' });
  const countries = [{ code: 'GBR', region: 'west' }];
  const state = readEuropeState('?layer=language&place=GBR&feature=london&languageCategory=polish&languageArea=E09000025', countries, [], 'density');
  assert.equal(state.languageCategory, 'polish');
  assert.equal(state.languageArea, 'E09000025');
  assert.equal(state.place, '');
  assert.equal(state.feature, undefined);
  const url = writeEuropeState(new URL('https://example.org/atlas/europe/population/'), state);
  assert.equal(url.searchParams.get('languageCategory'), 'polish');
  assert.equal(url.searchParams.get('languageArea'), 'E09000025');
  const otherLayer = writeEuropeState(url, { ...state, layer: 'density' });
  assert.equal(otherLayer.searchParams.has('languageCategory'), false);
  assert.equal(otherLayer.searchParams.has('languageArea'), false);
});
