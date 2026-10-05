import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const json = path => JSON.parse(read(path));
const sha = raw => createHash('sha256').update(raw).digest('hex');
const textSha = raw => sha(raw.toString('utf8').replace(/\r\n?/g, '\n'));
const manifest = json('public/assets/atlas/canada-climate-elevation-v1/koppen-manifest.json');
const geometryPath = 'public/assets/atlas/canada-climate-elevation-v1/koppen.geojson';
const geometry = json(geometryPath);
const source = json('public/assets/atlas/asia-climate-v1/legend.json');
const reference = read('scripts/refine-atlas-nature.py').toString('utf8');
const codes = reference.match(/codes='([^']+)'\.split\(\)/)[1].split(' ');
const colors = reference.match(/palette='([^']+)'\.split\(\)/)[1].split(' ');
const expectedPalette = Object.fromEntries(codes.map((code, index) => [code, '#' + colors[index]]));

test('Canada uses the complete existing US palette while retaining publisher definitions and source RGB', () => {
  assert.equal(codes.length, 30);
  assert.deepEqual(manifest.processing.displayPalette.colors, expectedPalette);
  assert.equal(manifest.processing.displayPalette.classCount, 30);
  assert.deepEqual(Object.keys(expectedPalette), source.map(item => item.code));
  for (const item of json('public/assets/atlas/nature-v1/climate-legend.json')) {
    assert.equal(expectedPalette[item.code], item.color, item.code);
  }
  assert.equal(manifest.classes.length, 14, 'the palette does not add climate classes absent from Canada');
  assert.deepEqual(manifest.classes.map(item => item.id), geometry.features.map(feature => feature.properties.id));
  for (const item of manifest.classes) {
    const original = source.find(definition => definition.code === item.id);
    assert.equal(item.code, original.id, item.id);
    assert.equal(item.color, expectedPalette[item.id], item.id);
    assert.equal(item.sourceColor, original.color, item.id);
    for (const key of ['name', 'description', 'sourceLabel']) assert.equal(item[key], original[key], `${item.id} ${key}`);
    assert.equal(geometry.features.find(feature => feature.properties.id === item.id).properties.color, item.sourceColor);
  }
});

test('palette provenance matches its references and the delivered source-colored GeoJSON remains byte-for-byte unchanged', () => {
  const record = manifest.processing.displayPalette;
  assert.equal(textSha(read(record.reference)), record.referenceSha256);
  for (const key of ['legend', 'sourceLegend']) assert.equal(sha(read(record[key])), record[key + 'Sha256']);
  assert.equal(textSha(read(manifest.processing.script)), manifest.processing.scriptSha256);
  assert.equal(manifest.processing.geometryScriptSha256, '09a53f92fc5849140d2130c617e1572524b5d50b39081348d89f73a292674aba');
  assert.equal(sha(read(geometryPath)), '4466a38767a3710c4571db0718a2a04f77922b6a889dff0e0dda51bc785cb8ad');
  assert.equal(sha(read(geometryPath)), manifest.files['koppen.geojson'].sha256);
  assert.equal(read(geometryPath).length, manifest.files['koppen.geojson'].bytes);
  assert.equal(record.sourceColorField, 'classes[].sourceColor');
  assert.match(record.method, /station samples, masks and the source-colored GeoJSON remain unchanged/);
});

test('the existing render adapter applies display colors without changing source features or geometry', async () => {
  const {bundleCanadaSource} = await import('../fixtures/bundle-canada-source.mjs');
  const code = await bundleCanadaSource(fileURLToPath(new URL('src/lib/atlas-canada-natural-layer.ts', root)), {format: 'esm'});
  const {prepareCanadaNaturalLayer} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const original = JSON.stringify(geometry);
  const rendered = prepareCanadaNaturalLayer(geometry, manifest.classes);
  assert.equal(JSON.stringify(geometry), original, 'the source collection is not mutated');
  for (const [index, feature] of rendered.features.entries()) {
    const previous = geometry.features[index];
    assert.equal(feature.geometry, previous.geometry, 'all source coordinate arrays are reused unchanged');
    assert.equal(feature.id, previous.id);
    assert.equal(feature.properties.id, previous.properties.id);
    assert.equal(feature.properties.code, previous.properties.code);
    assert.equal(feature.properties.color, expectedPalette[feature.properties.id]);
    assert.equal(previous.properties.color, manifest.classes.find(item => item.id === feature.properties.id).sourceColor);
  }
});
