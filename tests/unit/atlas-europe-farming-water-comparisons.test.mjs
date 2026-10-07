import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import {
  europeFarmingComparisonLinks, europeFarmingComparisonFocus,
  readEuropeFarmingFocus, writeEuropeFarmingFocus,
} from '../../src/data/atlas/europe/farming-water-comparisons.ts';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
import { europeDrainageCell, readEuropeDrainageValues } from '../../src/lib/atlas-europe-drainage.ts';
import { wheatCell, displayCell } from '../../src/lib/atlas-europe-view.ts';
import { farmingAtPoint } from '../../src/lib/atlas-europe-farming.ts';
import { readBasicIdentifiers, readPolygon, containsPoint } from '../../scripts/europe/prepare-drainage.mjs';

const root = new URL('../../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const cropAreas = json('src/data/atlas/europe/farming-areas.json');
const cities = json('src/data/atlas/europe/climate-cities.json');
const decode = path => {
  const bytes = gunzipSync(readFileSync(new URL(path, root)));
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
};
const rainfall = decode('public/assets/atlas/europe/precipitation-v1/values.bin.gz');
const basins = readEuropeDrainageValues(gunzipSync(readFileSync(new URL('public/assets/atlas/europe/drainage-v1/values.bin.gz', root))));

test('crop cases choose regional observations and give Po rice three suitable maps without inventing a Po climate station', () => {
  const rice = europeFarmingComparisonLinks({ layer: 'rice', place: 'ITA' });
  assert.deepEqual(rice.map(item => item.targetLayer), ['precipitation', 'drainage', 'terrain']);
  assert.ok(rice.every(item => item.id.startsWith('rice-po-')));
  assert.equal(rice.find(item => item.targetLayer === 'drainage').basin, '2040012730');
  assert.equal(rice.find(item => item.targetLayer === 'terrain').feature, 'alps');
  assert.equal(europeFarmingComparisonLinks({ layer: 'maize' })[0].city, 'budapest');
  assert.equal(europeFarmingComparisonLinks({ layer: 'sunflower' })[0].city, 'kyiv');
  assert.equal(europeFarmingComparisonLinks({ layer: 'wheat', place: 'UKR' })[0].city, 'kyiv');
  assert.equal(europeFarmingComparisonLinks({ layer: 'wheat', place: 'DEU' })[0].city, 'berlin');
  assert.equal(europeFarmingComparisonLinks({ layer: 'barley', region: 'north' })[0].city, 'helsinki');
  assert.equal(europeFarmingComparisonLinks({ layer: 'cattle', place: 'FIN' })[0].city, 'helsinki');
  for (const layer of ['pig', 'chicken']) {
    const choices = europeFarmingComparisonLinks({ layer });
    assert.equal(choices[0].city, 'berlin');
    assert.ok(choices.some(item => item.targetLayer === 'density'));
    assert.match(choices.find(item => item.targetLayer === 'density').description, /人口密度は需要量.*示さず/);
  }
  assert.deepEqual(europeFarmingComparisonLinks({ layer: 'not-a-product' }), []);
});

test('every exposed focus has a readable concise question, a real observation and bounds containing its reference position', () => {
  for (const product of europeLayers.filter(layer => layer.field === 'agriculture' && !['treecover', 'forest', 'dairy'].includes(layer.id))) {
    for (const place of ['', 'GBR', 'FIN', 'UKR', 'ITA', 'PRT']) {
      const choices = europeFarmingComparisonLinks({ layer: product.id, place });
      assert.equal(choices.length, 3);
      assert.equal(new Set(choices.map(item => item.id)).size, 3);
      for (const item of choices) {
        assert.deepEqual(europeFarmingComparisonFocus(item.id), item);
        const [west, south, east, north] = item.focusBounds, [longitude, latitude] = item.point;
        assert.ok(item.focusBounds.every(Number.isFinite));
        assert.ok(west >= -25 && east <= 65 && south >= 32 && north <= 73);
        assert.ok(west < east && south < north && longitude >= west && longitude <= east && latitude >= south && latitude <= north, item.id);
        assert.ok(item.description.length <= 100, item.id);
        assert.equal(item.description.split('。').filter(Boolean).length, 2, item.id);
        assert.ok(item.question.includes(product.title === '作物・畜産の主な分布' ? '作物・家畜' : product.title));
        assert.ok(item.sources.length && item.sources.every(source => /^https:\/\//.test(source.url)));
        if (item.city) assert.deepEqual(item.point, cities.find(city => city.id === item.city).coordinates);
        if (item.targetLayer === 'precipitation') assert.ok(displayCell(rainfall, [...item.point])?.value >= 0, item.id);
      }
    }
  }
});

test('monthly climate questions use the actual station completeness and do not ask about Helsinki missing rain', () => {
  for (const product of europeLayers.filter(layer => layer.field === 'agriculture' && !['treecover', 'forest'].includes(layer.id))) {
    for (const place of ['', 'FIN', 'GBR', 'DEU', 'FRA', 'UKR', 'PRT']) {
      for (const focus of europeFarmingComparisonLinks({ layer: product.id, place }).filter(item => item.targetLayer === 'climate')) {
        const city = cities.find(item => item.id === focus.city);
        const rainfallMissing = city.months.filter(month => month.precipitation === null).length;
        const temperatureMissing = city.months.filter(month => month.temperature === null).length;
        assert.equal(focus.period, city.period);
        if (rainfallMissing) {
          assert.doesNotMatch(focus.question, /雨の多い月|雨の少ない月|月別気温・降水量/);
          assert.match(focus.description, new RegExp(`降水${rainfallMissing}か月は未収録`));
        }
        if (temperatureMissing) assert.doesNotMatch(focus.question, /暖かい月と寒い月/);
      }
    }
  }
  const helsinki = europeFarmingComparisonLinks({ layer: 'barley', place: 'FIN' }).find(item => item.targetLayer === 'climate');
  assert.equal(helsinki.city, 'helsinki', 'the missing observation is not silently replaced by another city');
  assert.match(helsinki.question, /月別気温.*暖かい月と寒い月/);
  assert.match(helsinki.description, /降水12か月は未収録/);
  assert.ok(cities.find(city => city.id === 'helsinki').months.every(month => month.precipitation === null));
});

test('Po and Portuguese rice anchors belong to the real crop concentration and the published BasinATLAS unit', () => {
  const riceValues = decode('public/assets/atlas/europe/farming-v1/rice.bin.gz');
  const maizeValues = decode('public/assets/atlas/europe/farming-v1/maize.bin.gz');
  for (const [id, identifier, minimum] of [['rice-po-drainage', 2040012730, 100], ['rice-portugal-drainage', 2040018470, 150]]) {
    const focus = europeFarmingComparisonFocus(id);
    assert.equal(europeDrainageCell(basins, focus.point).basin.HYBAS_ID, identifier);
    assert.ok(wheatCell(riceValues, [...focus.point]).value >= minimum);
    assert.equal(farmingAtPoint(cropAreas, [...focus.point], ['rice'])[0]?.id, 'rice');
    assert.match(focus.description, /全流域.*灌漑供給範囲.*水量/);
  }
  const po = europeFarmingComparisonFocus('maize-po-terrain');
  assert.ok(wheatCell(maizeValues, [...po.point]).value > 130);
  assert.equal(farmingAtPoint(cropAreas, [...po.point], ['maize'])[0]?.id, 'maize');
});

// Private acquisition files are intentionally absent from distributed checkouts.
// When available locally, verify exact source containment as well as display picking.
const sourceRoot = new URL('../europe-water-research/', root);
test('verified private original GIS contains the two published rice reference points', { skip: !existsSync(new URL('BasinATLAS_v10_lev04.shp', sourceRoot)) }, () => {
  const identifiers = readBasicIdentifiers(readFileSync(new URL('BasinATLAS_v10_lev04.dbf', sourceRoot)));
  const shp = readFileSync(new URL('BasinATLAS_v10_lev04.shp', sourceRoot));
  const shx = readFileSync(new URL('BasinATLAS_v10_lev04.shx', sourceRoot));
  for (const id of ['rice-po-drainage', 'rice-portugal-drainage']) {
    const focus = europeFarmingComparisonFocus(id), source = identifiers.find(item => String(item.HYBAS_ID) === focus.basin);
    assert.ok(source);
    assert.ok(containsPoint(readPolygon(shp, shx, source.sourceRow), focus.point), id);
  }
});

test('focus URL codec accepts only registered matching choices and clears old focus before writing', () => {
  for (const source of [{ layer: 'rice' }, { layer: 'pig' }, { layer: 'wheat', place: 'UKR' }]) {
    for (const focus of europeFarmingComparisonLinks(source)) {
      const query = new URLSearchParams({ layer: focus.targetLayer, europeFocus: focus.id });
      for (const field of ['city', 'feature', 'basin']) if (focus[field]) query.set(field, focus[field]);
      assert.equal(readEuropeFarmingFocus(query)?.id, focus.id);
      const duplicate = new URLSearchParams(query); duplicate.append('europeFocus', focus.id);
      assert.equal(readEuropeFarmingFocus(duplicate), undefined);
      assert.equal(readEuropeFarmingFocus(query, 'unregistered-layer'), undefined);
      for (const field of ['city', 'feature', 'basin']) if (focus[field]) {
        const stale = new URLSearchParams(query); stale.set(field, 'changed-selection');
        assert.equal(readEuropeFarmingFocus(stale), undefined, field);
      }
    }
  }
  for (const id of ['https://evil.test/', '__proto__', 'constructor', 'rice-po-drainage#x', 'rice-po-drainage&basin=9999999999']) assert.equal(europeFarmingComparisonFocus(id), undefined);
  const original = new URL('https://example.test/atlas/europe/nature/?layer=precipitation&europeFocus=rice-po-drainage&keep=1');
  assert.equal(writeEuropeFarmingFocus(original, 'unknown').searchParams.has('europeFocus'), false);
  assert.equal(writeEuropeFarmingFocus(original, 'rice-po-precipitation').searchParams.get('europeFocus'), 'rice-po-precipitation');
  assert.equal(original.searchParams.get('europeFocus'), 'rice-po-drainage');
});
