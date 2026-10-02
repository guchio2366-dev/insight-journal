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
    const restored = q('[data-canada-landform-fallback]').getAttribute('viewBox').split(' ').map(Number), previous = zoomed.split(' ').map(Number);
    assert.ok(restored.every((value, index) => Math.abs(value - previous[index]) < .001), 'restoration differs only by geographic URL rounding, not boundary clipping');
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

async function fallbackCameraPage() {
  const w = new Window({ url: 'https://example.com/insight-journal/atlas/north-america/canada/nature/?view=landform&render=static', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  const html = await readFile('dist/atlas/north-america/canada/nature/index.html', 'utf8');
  w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g, ''));
  const root = w.document.querySelector('[data-canada-landform]'), stage = root.querySelector('[data-canada-landform-stage]');root.hidden = false;
  Object.defineProperty(stage, 'clientWidth', { value: 900 });Object.defineProperty(stage, 'clientHeight', { value: 580 });
  const events = [];root.addEventListener('canada-landform-camera', event => events.push([...event.detail.bounds]));
  w.eval(native);
  return { w, root, controller: w.landformController, svg: root.querySelector('[data-canada-landform-fallback]'), events };
}
const readFrame = svg => svg.getAttribute('viewBox').split(/\s+/).map(Number);
const worldNW = helper.projectCanadaLandform([-180, 85.051]), worldSE = helper.projectCanadaLandform([180, -85.051]);
function assertWorldFrame(frame) {
  assert.equal(frame.length, 4);assert.ok(frame.every(Number.isFinite));assert.ok(frame[2] > 0 && frame[3] > 0);
  assert.ok(frame[0] >= worldNW[0] - 1e-8 && frame[1] >= worldNW[1] - 1e-8);
  assert.ok(frame[0] + frame[2] <= worldSE[0] + 1e-8 && frame[1] + frame[3] <= worldSE[1] + 1e-8);
}
function assertGeographicCamera(bounds) {
  assert.ok(bounds.every(Number.isFinite));assert.ok(bounds[0] >= -180 && bounds[2] <= 180 && bounds[1] >= -85.051 && bounds[3] <= 85.051);
  assert.ok(bounds[0] < bounds[2] && bounds[1] < bounds[3], 'serialized geographic bounds remain ordered');
}
function dragCamera(page, x, y, id) {
  const pointer = (name, clientX, clientY) => page.svg.dispatchEvent(new page.w.PointerEvent(name, { pointerId: id, pointerType: 'mouse', button: 0, clientX, clientY, bubbles: true }));
  pointer('pointerdown', 200, 200);pointer('pointermove', 200 + x, 200 + y);
  assertWorldFrame(readFrame(page.svg));pointer('pointerup', 200 + x, 200 + y);
}

test('Captured SVG drags clamp the whole viewport at all world edges without shrinking or inverting it', async () => {
  const page = await fallbackCameraPage();
  try {
    page.controller.zoom('in');page.controller.zoom('in');const initial = readFrame(page.svg), captures = [];
    page.svg.setPointerCapture = id => captures.push(id);
    for (let i = 0; i < 24; i++) {
      const [x, y] = [[1000000, 0], [-1000000, 0], [0, 1000000], [0, -1000000], [1000000, -1000000], [-1000000, 1000000]][i % 6];
      dragCamera(page, x, y, i + 1);const frame = readFrame(page.svg);assertWorldFrame(frame);
      assert.equal(frame[2], initial[2]);assert.equal(frame[3], initial[3]);assert.equal(frame[2] / frame[3], initial[2] / initial[3]);
      assertGeographicCamera(page.events.at(-1));
      page.controller.render({ selected: null, only: false, bounds: page.events.at(-1) });
      assert.deepEqual(readFrame(page.svg), frame, 'the host camera event rerender must not repeatedly quantize or resize the viewport');
    }
    assert.equal(captures.length, 24);assert.deepEqual(captures, Array.from({ length: 24 }, (_, i) => i + 1));
    assert.equal(page.root.dataset.canadaLandformRender, 'svg');
  } finally { page.controller.destroy();await page.w.happyDOM.close(); }
});

test('World-size zoom-out uses a uniform fit and boundary camera URLs restore a positive ordered viewport', async () => {
  const page = await fallbackCameraPage();
  try {
    const full = readFrame(page.svg), aspect = full[2] / full[3];
    for (let i = 0; i < 30; i++) {
      page.controller.zoom('out');const frame = readFrame(page.svg);assertWorldFrame(frame);assertGeographicCamera(page.events.at(-1));
      assert.ok(Math.abs(frame[2] / frame[3] - aspect) < 1e-12, 'world fit scales both dimensions equally');
    }
    const fitted = readFrame(page.svg);assert.ok(Math.abs(fitted[2] - (worldSE[0] - worldNW[0])) < 1e-8 || Math.abs(fitted[3] - (worldSE[1] - worldNW[1])) < 1e-8);
    page.controller.reset();assert.deepEqual(readFrame(page.svg), full);page.controller.zoom('in');dragCamera(page, -1000000, -1000000, 99);
    const saved = [...page.events.at(-1)], url = new URL(page.w.location.href);url.searchParams.set('landformBounds', saved.join(','));page.w.history.replaceState(null, '', url.href);
    page.controller.reset();const count = page.events.length;
    page.controller.render({ selected: 'cordillera', only: true, bounds: new URL(page.w.location.href).searchParams.get('landformBounds').split(',').map(Number) });
    const restored = readFrame(page.svg);assertWorldFrame(restored);assert.equal(page.events.length, count, 'URL restoration is not a user camera event');
    const [west, north] = helper.unprojectCanadaLandform(restored.slice(0, 2)), [east, south] = helper.unprojectCanadaLandform([restored[0] + restored[2], restored[1] + restored[3]]);
    for (const [index, value] of [west, south, east, north].entries()) assert.ok(Math.abs(value - saved[index]) < 1e-8);
    assert.equal(page.root.querySelectorAll('[data-canada-landform-shape]:not([hidden])').length, 1);
  } finally { page.controller.destroy();await page.w.happyDOM.close(); }
});

test('Invalid fallback cameras recover to the full view and an oversized camera retains its projected aspect', async () => {
  const page = await fallbackCameraPage();
  try {
    const full = readFrame(page.svg);
    for (const bounds of [[170, 40, -170, 80], [-100, 80, -90, 40], [-100, 40, -100, 80], [NaN, 40, -90, 80], [-100, 40, Infinity, 80]]) {
      page.controller.zoom('in');page.controller.render({ selected: null, only: false, bounds });assert.deepEqual(readFrame(page.svg), full);
    }
    const oversized = [-500, -80, 500, 80], left = helper.projectCanadaLandform([oversized[0], oversized[1]]), right = helper.projectCanadaLandform([oversized[2], oversized[3]]);
    page.controller.render({ selected: null, only: false, bounds: oversized });const frame = readFrame(page.svg);assertWorldFrame(frame);
    assert.ok(Math.abs(frame[2] / frame[3] - (right[0] - left[0]) / (left[1] - right[1])) < 1e-12);
    page.svg.dispatchEvent(new page.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));assertGeographicCamera(page.events.at(-1));assertWorldFrame(readFrame(page.svg));
  } finally { page.controller.destroy();await page.w.happyDOM.close(); }
});
