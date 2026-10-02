import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

const config = JSON.parse(await readFile('src/data/atlas/canada/physiography.json', 'utf8'));
const raw = await readFile('public/assets/atlas/canada-physiography-v1/regions.geojson');
const original = JSON.parse(raw);
const helperBuild = await build({ entryPoints: ['src/lib/atlas-canada-landform-map.ts'], bundle: true, format: 'esm', platform: 'node', write: false });
const helper = await import(`data:text/javascript;base64,${Buffer.from(helperBuild.outputFiles[0].text).toString('base64')}`);
const nativeBuild = await build({ stdin: { contents: "import {initCanadaLandform} from './src/scripts/atlas-canada-landform.ts';globalThis.landformController=initCanadaLandform(document.querySelector('[data-canada-landform]'));", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'iife', platform: 'browser', write: false });
const native = nativeBuild.outputFiles[0].text;

test('Canada landform geometry retains all seven official regions, original vertices and checked label anchors', () => {
  assert.equal(createHash('sha256').update(raw).digest('hex'), config.source.geometrySha256);
  assert.equal(original.features.length, 7);
  const prepared = helper.prepareCanadaLandforms(original, config.regions);
  assert.deepEqual(new Set(prepared.features.map(feature => feature.id)), new Set(config.regions.map(region => region.id)));
  const insideRing = (point, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x, y] = ring[i], [previousX, previousY] = ring[j];
      if ((y > point[1]) !== (previousY > point[1]) && point[0] < (previousX - x) * (point[1] - y) / (previousY - y) + x) inside = !inside;
    }
    return inside;
  };
  let vertices = 0;
  for (const [index, feature] of prepared.features.entries()) {
    assert.deepEqual(feature.geometry, original.features[index].geometry);
    assert.equal(feature.properties.RegionEn, original.features[index].properties.RegionEn);
    const region = config.regions.find(item => item.id === feature.id);
    assert.equal(feature.properties.nameJapanese, region.name);
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    assert.ok(polygons.some(polygon => insideRing(region.labelAnchor, polygon[0]) && polygon.slice(1).every(hole => !insideRing(region.labelAnchor, hole))), `${region.id} label must lie inside its official region`);
    const rings = helper.canadaLandformRings(feature.geometry), count = rings.reduce((sum, ring) => sum + ring.length, 0), path = helper.canadaLandformPath(feature.geometry);
    vertices += count;
    assert.equal((path.match(/[ML]/g) ?? []).length, count);
    assert.equal((path.match(/Z/g) ?? []).length, rings.length);
    assert.doesNotMatch(path, /NaN|Infinity/);
  }
  assert.ok(vertices > 30000, 'the official source geometry must not be replaced with schematic shapes');
  assert.throws(() => helper.prepareCanadaLandforms({ ...original, features: original.features.slice(1) }, config.regions));
  const [west, north] = helper.projectCanadaLandform([-126, 58]), [east, south] = helper.projectCanadaLandform([-110, 43]);
  assert.ok(east > west && south > north, 'the Mercator fallback is east-right and north-up');
  for (const coordinate of [[-126, 58], [-80.4, 43.4], [-110, 75]]) {
    const restored = helper.unprojectCanadaLandform(helper.projectCanadaLandform(coordinate));
    assert.ok(restored.every((value, index) => Math.abs(value - coordinate[index]) < 1e-8), 'geographic camera bounds must round-trip through the fallback projection');
  }
});

test('Canada landform SSR and SVG controls support host-owned selection, isolation, zoom and reset without WebGL', async () => {
  const w = new Window({ url: 'https://example.com/insight-journal/atlas/north-america/canada/nature/?view=landform', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  try {
    const html = await readFile('dist/atlas/north-america/canada/nature/index.html', 'utf8');
    w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g, ''));
    const root = w.document.querySelector('[data-canada-landform]'), q = selector => root.querySelector(selector);
    assert.ok(root);
    assert.equal(root.querySelectorAll('[data-canada-landform-shape]').length, 7);
    assert.equal(root.querySelectorAll('[data-canada-landform-legend]').length, 7);
    assert.equal(root.querySelectorAll('[data-canada-landform-label]').length, 7);
    assert.equal(root.querySelectorAll('[data-canada-landform-fallback-labels] text').length, 7);
    assert.match(root.textContent, /EPSG:4326/);
    root.hidden = false;
    const events = [];
    for (const name of ['canada-landform-select', 'canada-landform-only', 'canada-landform-reset', 'canada-landform-camera']) root.addEventListener(name, event => events.push({ name, detail: event.detail }));
    w.eval(native);
    const controller = w.landformController;
    const selected = 'canadian-shield';
    q(`[data-canada-landform-legend="${selected}"]`).click();
    assert.deepEqual(JSON.parse(JSON.stringify(events.at(-1))), { name: 'canada-landform-select', detail: { id: selected } });
    controller.render({ selected, only: true });
    assert.equal(q(`[data-canada-landform-shape="${selected}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(root.querySelectorAll('[data-canada-landform-shape]:not([hidden])').length, 1);
    assert.equal(q('[data-canada-landform-only]').checked, true);
    assert.equal(q('[data-canada-landform-focus]').disabled, false);
    q(`[data-canada-landform-shape="${selected}"]`).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(events.at(-1).detail.id, selected);
    q('[data-canada-landform-only]').checked = false;
    q('[data-canada-landform-only]').dispatchEvent(new w.Event('change'));
    assert.equal(events.at(-1).name, 'canada-landform-only');
    assert.equal(events.at(-1).detail.only, false);
    const full = q('[data-canada-landform-fallback]').getAttribute('viewBox');
    q('[data-canada-landform-zoom="in"]').click();
    assert.notEqual(q('[data-canada-landform-fallback]').getAttribute('viewBox'), full);
    const zoomed = q('[data-canada-landform-fallback]').getAttribute('viewBox'), savedBounds = [...events.at(-1).detail.bounds];
    assert.equal(events.at(-1).name, 'canada-landform-camera');
    assert.equal(savedBounds.length, 4); assert.ok(savedBounds.every(Number.isFinite));
    assert.ok(savedBounds[0] < savedBounds[2] && savedBounds[1] < savedBounds[3]);
    q('[data-canada-landform-reset]').click();
    assert.equal(q('[data-canada-landform-fallback]').getAttribute('viewBox'), full);
    assert.equal(events.at(-1).name, 'canada-landform-reset');
    const eventCount = events.length;
    controller.render({ selected, only: false, bounds: savedBounds });
    assert.equal(q('[data-canada-landform-fallback]').getAttribute('viewBox'), zoomed);
    assert.equal(events.length, eventCount, 'camera restoration must not emit a user camera event');
    controller.render({ selected, only: false, bounds: null });
    assert.equal(q('[data-canada-landform-fallback]').getAttribute('viewBox'), full);
    assert.equal(events.length, eventCount);
    controller.render({ selected: null, only: true });
    assert.equal(root.querySelectorAll('[data-canada-landform-shape]:not([hidden])').length, 7);
    assert.equal(q('[data-canada-landform-only]').checked, false);
    assert.equal(q('[data-canada-landform-only]').disabled, true);
    controller.destroy();
    const count = events.length; q('[data-canada-landform-legend]').click(); assert.equal(events.length, count);
  } finally { await w.happyDOM.close(); }
});
