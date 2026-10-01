import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzip, parseDbf, parseShp} from '../../scripts/prepare-mexico-nature.mjs';
import {geometryTopologyIssues} from '../../scripts/lib/mexico-geometry-topology.mjs';
import {lambertInverse} from '../../src/lib/atlas-mexico-projection.mjs';
const read = path => readFile(path);
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const data = await json('src/data/atlas/mexico/nature-v1.json');
const sourceDir = 'data-source/atlas/mexico/nature/';
const fileWith = (files, extension) => [...files].find(([name]) => name.toLowerCase().endsWith(extension))[1];
const climateBytes = await read(`${sourceDir}climate-2008.zip`), reliefBytes = await read(`${sourceDir}relief-2001.zip`);
const climateZip = unzip(climateBytes), reliefOuter = unzip(reliefBytes), reliefZip = unzip(fileWith(reliefOuter, '.zip'));
const climateRows = parseDbf(fileWith(climateZip, '.dbf')), reliefRows = parseDbf(fileWith(reliefZip, '.dbf'));
test('Official archives remain fixed and the 2021 climate correction is included', () => {
  assert.equal(sha(climateBytes), '9678ed5307ec9ba9adeb958926a78226165017363f23761135ade400d53b896f');
  assert.equal(sha(reliefBytes), '23f106a3001a4bca916e0aab7f6ffb99810599895b0d00ae8b2dcc90272efb2a');
  assert.equal(climateRows.length, 1695); assert.equal(reliefRows.length, 733);
  const corrected = climateRows.find(row => row.OBJECTID === 551);
  assert.equal(corrected.CLAVE, 'BS0hw'); assert.equal(corrected.FC, 22114); assert.equal(corrected.TIPO_C, 'Seco semicálido');
  assert.equal(data.climate.features.find(feature => feature.id === 'climate-551').sourceCode, 'BS0hw');
  assert.equal(data.climate.source.correction.date, '2021-05-21');
});
test('Editions and an unspecified observation period stay separate from 1991–2020 normals', () => {
  assert.equal(data.climate.source.edition, 2008); assert.equal(data.climate.source.observedPeriod, null);
  assert.equal(data.relief.source.edition, 2001); assert.equal(data.relief.source.observedPeriod, null);
  assert.match(data.climate.source.periodNote, /統一された観測対象期間/);
  const originalMetadata = new TextDecoder('windows-1252').decode(fileWith(reliefOuter, 'fisiografia.html'));
  assert.match(originalMetadata, /Use_Constraints:[\s\S]{0,120}None/);
  assert.ok([...reliefOuter].some(([name, bytes]) => name.includes('metadatos_cdv') && bytes.includes(Buffer.from('license:'))));
  assert.equal(data.relief.source.individualUseConstraints, 'None');
});
test('Foreign/water polygons are excluded; original thematic missingness survives as five separate polygons', () => {
  assert.equal(data.climate.features.length, 1692); assert.equal(data.relief.features.length, 442);
  assert.equal(data.climate.source.excludedRecords, 3); assert.equal(data.relief.source.excludedRecords, 291);
  assert.equal(data.climate.classes.length, 21); assert.equal(data.climate.groups.length, 6);
  assert.equal(data.relief.classes.filter(category => category.status === 'valid').length, 15);
  assert.equal(data.relief.features.filter(feature => feature.status === 'missing').length, 5);
  assert.equal(data.relief.classes.find(category => category.status === 'missing').id, 'S/It');
  for (const layer of [data.climate, data.relief]) {
    const classes = new Set(layer.classes.map(category => category.id));
    for (const feature of layer.features) {assert.ok(classes.has(feature.classId)); assert.notEqual(feature.sourceCode, 'P/E'); assert.notEqual(feature.sourceCode, 'H2O');}
  }
});
test('Display preparation preserves every source polygon part and the original feature identity', () => {
  for (const [layer, rows, files, prefix] of [[data.climate, climateRows, climateZip, 'climate'], [data.relief, reliefRows, reliefZip, 'relief']]) {
    const geometries = parseShp(fileWith(files, '.shp'));
    const originals = new Map(rows.map((row, index) => [`${prefix}-${row.OBJECTID}`, {row, rings: geometries[index]}]));
    for (const feature of layer.features) {
      const original = originals.get(feature.id); assert.ok(original);
      assert.equal(feature.sourceCode, original.row.CLAVE);
      assert.equal(feature.geometry.coordinates.length, original.rings.length);
      for (let index = 0; index < feature.geometry.coordinates.length; index++) {
        const ring = feature.geometry.coordinates[index]; assert.ok(ring.length >= 4); assert.deepEqual(ring[0], ring.at(-1));
        assert.deepEqual(ring[0], original.rings[index][0]);
        assert.ok(ring.every(point => point.length === 2 && point.every(Number.isFinite)));
      }
    }
  }
});
test('Display simplification creates no new crossings, containment or orientation defects against original SHP chains', () => {
  const geographic = coordinates => ({type: 'Polygon', coordinates: coordinates.map(ring => ring.map(lambertInverse))});
  for (const [layer, rows, files, prefix] of [[data.climate, climateRows, climateZip, 'climate'], [data.relief, reliefRows, reliefZip, 'relief']]) {
    const geometry = parseShp(fileWith(files, '.shp'));
    const original = new Map(rows.map((row, index) => [`${prefix}-${row.OBJECTID}`, geometry[index]]));
    const source = layer.features.map(feature => ({properties: {code: feature.id}, geometry: geographic(original.get(feature.id))}));
    const rendered = layer.features.map(feature => ({properties: {code: feature.id}, geometry: geographic(feature.geometry.coordinates)}));
    assert.deepEqual(geometryTopologyIssues(source, rendered), []);
    assert.equal(data.processing.topology[prefix].newProperIntersections, 0);
  }
});
test('Natural source projection and both comparison indicators align with the shared national map contract', async () => {
  const geography = await json('src/data/atlas/mexico/geometry.json'), agriculture = await json('src/data/atlas/mexico/agriculture.json'), population = await json('src/data/atlas/mexico/population.json');
  assert.equal(data.projection.datum, 'ITRF92'); assert.equal(data.projection.centralMeridian, -102);
  assert.equal(data.projection.standardParallel1, 17.5); assert.equal(data.projection.standardParallel2, 29.5);
  for (let index = 0; index < 4; index++) assert.ok(Math.abs(data.bounds[index] - geography.metadata.boundsNative[index]) < 250);
  const codes = geography.features.map(feature => feature.properties.code).sort();
  assert.deepEqual(agriculture.states.map(state => state.code).sort(), codes);
  assert.deepEqual(population.states.map(state => state.stateCode).sort(), codes);
  for (const state of agriculture.states) {assert.equal(state.status, 'valid'); assert.ok(state.irrigationSharePct >= 0 && state.irrigationSharePct <= 100);}
  assert.equal(population.states.find(state => state.stateCode === '09').density, 6163.3);
  assert.ok(Math.abs(agriculture.states.find(state => state.code === '25').irrigationSharePct - 68.9) < .05);
});
test('Public JSON and static fallback images have independently verifiable hashes and the same framing', async () => {
  const manifest = await json('public/assets/atlas/mexico-nature-v1/manifest.json');
  const publicData = await read('public/assets/atlas/mexico-nature-v1/nature-v1.json');
  assert.equal(sha(publicData), manifest.geometrySha256); assert.deepEqual(publicData, await read('src/data/atlas/mexico/nature-v1.json'));
  for (const asset of manifest.assets) {
    const bytes = await read(`public/assets/atlas/mexico-nature-v1/${asset.file}`); assert.equal(sha(bytes), asset.sha256);
    assert.equal(asset.viewBox, '0 0 900 580'); assert.match(bytes.toString('utf8'), /Fuente: INEGI/);
  }
  assert.equal(manifest.counts.reliefMissing, 5);
});
