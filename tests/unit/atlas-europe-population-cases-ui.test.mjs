import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { transform } from '@astrojs/compiler-rs';
import { experimental_AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { project, viewPath } from '../../src/lib/atlas-europe-view.ts';
import { europeCultureData, normaliseCultureState, readCultureSearch, writeCultureState, cultureSelection, cultureColor, cultureLegend, formatCultureShare, cultureGeometryPath, cultureBounds, cultureMapData, caseMapData, fetchCaseGeometry, createEuropePopulationCases } from '../../src/lib/atlas-europe-population-cases.ts';

const componentURL = new URL('../../src/components/atlas/EuropePopulationCases.astro', import.meta.url);
const compiled = transform(await fs.readFile(componentURL, 'utf8'), { filename: componentURL.href, internalURL: import.meta.resolve('astro/compiler-runtime'), resolvePath: specifier => specifier });
assert.deepEqual(compiled.diagnostics, []);
const moduleCode = compiled.code
  .replaceAll('"astro/runtime/server/index.js"', JSON.stringify(import.meta.resolve('astro/runtime/server/index.js')))
  .replaceAll('"../../lib/atlas-europe-population-cases"', JSON.stringify(new URL('../../src/lib/atlas-europe-population-cases.ts', import.meta.url).href))
  .replace(/^import "\.\.\/\.\.\/styles\/atlas-europe-population-cases\.css";\s*$/m, '');
const component = (await import(`data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`)).default;
const container = await experimental_AstroContainer.create();
const geometries = {
  ew: JSON.parse(await fs.readFile(new URL('../../public/assets/atlas/europe/population-cases-v1/england-wales-lad2021.geojson', import.meta.url), 'utf8')),
  hr: JSON.parse(await fs.readFile(new URL('../../public/assets/atlas/europe/population-cases-v1/croatia-national-outline.geojson', import.meta.url), 'utf8')),
};
const responseFor = url => ({ ok: true, json: async () => url.endsWith('croatia-national-outline.geojson') ? geometries.hr : geometries.ew });
async function setup(props = {}) {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `<svg><g data-test-map></g></svg>${await container.renderToString(component, { props })}`;
  const root = document.querySelector('[data-eu-culture-reader]');
  const mapLayer = document.querySelector('[data-test-map]');
  // The parent atlas is the only history owner.
  window.history.pushState = () => { throw new Error('Culture component must not own history'); };
  window.history.replaceState = () => { throw new Error('Culture component must not own history'); };
  return { window, document, root, mapLayer, close: () => window.happyDOM.abort() };
}
function change(window, select, value) { select.value = value; select.dispatchEvent(new window.Event('change', { bubbles: true })); }

test('actual Astro SSR contains an honest selected case, denominator, source and accessible controls', async () => {
  const setupData = await setup();
  try {
    const { root } = setupData;
    assert.match(root.querySelector('[data-culture-note]').textContent, /自己申告.*英国全土や欧州全域/);
    assert.equal(root.querySelector('[data-culture-case]').options.length, 2);
    assert.equal(root.querySelector('[data-culture-category]').options.length, 24);
    assert.equal(root.querySelector('[data-culture-area]').options.length, 331);
    assert.equal(root.querySelectorAll('label[for]').length, 3);
    assert.equal(root.querySelectorAll('select[disabled]').length, 3);
    assert.equal(root.querySelector('[data-culture-denominator]').textContent, '分母：この表の総人口 92,338人');
    assert.match(root.querySelector('[data-culture-attribution]').textContent, /Office for National Statistics/);
    assert.match(root.querySelector('[data-culture-map-status]').textContent, /数値なし.*0%/);
    assert.equal(root.querySelectorAll('svg').length, 0, 'The reader must use the parent central map');
    assert.equal(root.querySelector('[role="status"]').getAttribute('aria-live'), 'polite');
  } finally { setupData.close(); }
});

test('canonical culture URL values are validated within their own case/topic and preserve atlas parameters', () => {
  const invalid = readCultureSearch('?cultureCase=unknown&cultureCategory=hr-religion-H&cultureArea=HRV', 'ethnicity');
  assert.deepEqual(invalid, normaliseCultureState({}, 'ethnicity'));
  const croatia = readCultureSearch('?cultureCase=croatia-national-2021&cultureCategory=ts021-17&cultureArea=E06000001', 'religion');
  assert.deepEqual(croatia, { cultureCase: 'croatia-national-2021', cultureCategory: 'hr-religion-H', cultureArea: 'HRV' });
  const url = new URL('https://example.test/atlas/europe/population/?layer=religion&place=HRV&render=static&single=1#map');
  const next = writeCultureState(url, croatia);
  assert.equal(next.searchParams.get('layer'), 'religion');
  assert.equal(next.searchParams.get('place'), 'HRV');
  assert.equal(next.searchParams.get('render'), 'static');
  assert.equal(next.searchParams.get('single'), '1');
  assert.equal(next.hash, '#map');
  assert.equal(url.searchParams.has('cultureCase'), false);
  assert.deepEqual(readCultureSearch(next.search, 'religion'), croatia);
});

test('map values/colors use exact topic denominators, and absent coverage is not zero', () => {
  const state = normaliseCultureState({ cultureArea: 'E06000002' }, 'religion');
  const selection = cultureSelection(state, 'religion');
  const data = caseMapData(europeCultureData, geometries.ew, 'religion', state);
  const area = data.features.find(feature => feature.properties.code === 'E06000002');
  assert.equal(area.properties.value, selection.count / 143924 * 100);
  assert.equal(area.properties.count, selection.count);
  assert.equal(area.properties.denominator, 143924);
  assert.equal(area.properties.fill, cultureColor(area.properties.value));
  assert.equal(area.properties.grain, 'LAD');
  assert.equal(area.properties.year, 2021);
  assert.deepEqual(data, cultureMapData(geometries.ew, state, 'religion'));
  const unknown = cultureMapData(geometries.hr, state, 'religion').features[0].properties;
  assert.equal(unknown.value, null);
  assert.equal(unknown.count, null);
  assert.equal(unknown.fill, cultureLegend.at(-1).color);
  assert.notEqual(cultureColor(0), cultureColor(null));
  assert.equal(formatCultureShare(.001), '0.01%未満');
  assert.equal(formatCultureShare(0), '0%');
  assert.equal(cultureGeometryPath(geometries.ew.features[0].geometry), viewPath(geometries.ew.features[0].geometry));
  const bounds = cultureBounds(geometries.ew);
  assert.ok(bounds[0][0] > -7 && bounds[1][0] < 3);
  assert.ok(bounds[0][1] > 49 && bounds[1][1] < 56);
  assert.deepEqual(cultureGeometryPath(geometries.hr.features[0].geometry, point => [point[0], point[1]]).slice(0,1), 'M');
  assert.ok(project(bounds[0])[0] < project(bounds[1])[0]);
});

test('geometry lazy requests share a promise and reject a mismatched geographic code set', async () => {
  let calls = 0;
  const options = { base: '/unit-culture-cache/', fetch: async url => { calls++; return responseFor(url); } };
  const first = fetchCaseGeometry('england-wales-2021', options);
  const second = fetchCaseGeometry('england-wales-2021', options);
  assert.equal(first, second);
  assert.equal((await first).features.length, 331);
  assert.equal(calls, 1);
  await assert.rejects(fetchCaseGeometry('unknown-case', options), /Unknown census case/);
  await assert.rejects(fetchCaseGeometry('croatia-national-2021', { base: '/unit-culture-wrong-code/', fetch: async () => ({ ok: true, json: async () => geometries.ew }) }), /code contract/);
});

test('controller synchronises SVG, MapLibre payload, topic, selects, percentage/count and canonical callback', async () => {
  const setupData = await setup();
  try {
    const { root, mapLayer, window } = setupData;
    const requests = [], changes = [], maps = [], fits = [];
    const controller = createEuropePopulationCases(root, { base: '/unit-culture-controller/', mapLayer, onChange: state => changes.push(state), onMapData: data => maps.push(data), onFitBounds: bounds => fits.push(bounds), fetch: async url => { requests.push(url); return responseFor(url); } });
    await controller.ready();
    assert.equal(requests.length, 1);
    assert.equal(root.querySelectorAll('select[disabled]').length, 0);
    assert.equal(mapLayer.querySelectorAll('path').length, 331);
    assert.equal(mapLayer.querySelectorAll('[tabindex="0"]').length, 1);
    assert.equal(fits.length, 1);
    for (const feature of maps.at(-1).features) {
      assert.equal(mapLayer.querySelector(`[data-culture-code="${feature.properties.code}"]`).getAttribute('fill'), feature.properties.fill);
    }
    controller.setTopic('religion');
    await controller.ready();
    assert.equal(root.querySelector('[data-culture-category]').options.length, 9);
    assert.equal(requests.length, 1, 'Changing category/topic must reuse the same official boundary');
    assert.equal(changes.length, 0, 'Parent-driven topic changes must not perform a second URL update');
    assert.equal(controller.selectArea('E06000002'), true);
    assert.equal(root.querySelector('[data-culture-area]').value, 'E06000002');
    assert.equal(root.querySelector('[data-culture-denominator]').textContent, '分母：この表の総人口 143,924人');
    assert.deepEqual(Object.keys(changes.at(-1)).sort(), ['cultureArea', 'cultureCase', 'cultureCategory']);
    assert.equal(controller.selectArea('HRV'), false);
    const noReligion = cultureSelection(controller.readState(), 'religion').topic.categories.find(category => category.responseKind === 'no-religion');
    change(window, root.querySelector('[data-culture-category]'), noReligion.id);
    const selected = cultureSelection(controller.readState(), 'religion');
    assert.equal(root.querySelector('[data-culture-share]').textContent, formatCultureShare(selected.share));
    assert.equal(root.querySelector('[data-culture-count]').textContent, '52,415人');
    change(window, root.querySelector('[data-culture-case]'), 'croatia-national-2021');
    await controller.ready();
    assert.equal(requests.length, 2);
    assert.equal(mapLayer.querySelectorAll('path').length, 1);
    assert.equal(root.querySelector('[data-culture-area]').options.length, 1);
    assert.equal(root.querySelector('[data-culture-category]').options.length, 12);
    assert.match(root.querySelector('[data-culture-note]').textContent, /全国値.*行政区と同じ単位で比較しません/);
    assert.match(root.querySelector('[data-culture-note]').textContent, /欧州全域の分布ではありません/);
    assert.equal(root.querySelector('[data-culture-count]').textContent, '3,057,735人');
    assert.equal(root.querySelector('[data-culture-denominator]').textContent, '分母：この表の総人口 3,871,833人');
    assert.match(root.querySelector('[data-culture-attribution]').textContent, /Contains public sector information licensed under the Open Data Licence.*Adapted:/s);
    assert.equal(maps.at(-1).features[0].properties.grain, 'national');
    controller.destroy();
    assert.equal(mapLayer.children.length, 0);
    const saved = controller.readState();
    change(window, root.querySelector('[data-culture-case]'), 'england-wales-2021');
    assert.deepEqual(controller.readState(), saved);
  } finally { setupData.close(); }
});

test('root-controlled activation defers fetch; URL restoration and keyboard map selection share state', async () => {
  const setupData = await setup();
  try {
    const { root, mapLayer, window } = setupData;
    let requests = 0, updates = 0;
    const controller = createEuropePopulationCases(root, { active: false, base: '/unit-culture-activation/', mapLayer, onChange: () => updates++, fetch: async url => { requests++; return responseFor(url); } });
    controller.setTopic('religion');
    controller.applyState('?cultureCase=england-wales-2021&cultureArea=E06000002&cultureCategory=ts030-01');
    assert.equal(requests, 0);
    assert.equal(updates, 0);
    controller.setActive(true);
    await controller.ready();
    assert.equal(requests, 1);
    const activePath = mapLayer.querySelector('[tabindex="0"]');
    activePath.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(controller.readState().cultureArea, 'E06000003');
    assert.equal(root.querySelector('[data-culture-area]').value, 'E06000003');
    assert.equal(updates, 1);
    controller.setActive(false);
    assert.equal(mapLayer.children.length, 0);
    controller.destroy();
  } finally { setupData.close(); }
});

test('late geometry from a previous case cannot overwrite a newly selected national case', async () => {
  const setupData = await setup();
  try {
    const { root, mapLayer, window } = setupData;
    let finishEW;
    const deferred = new Promise(resolve => { finishEW = resolve; });
    const published = [];
    const controller = createEuropePopulationCases(root, { base: '/unit-culture-race/', mapLayer, onMapData: data => published.push(data), fetch: async url => url.endsWith('croatia-national-outline.geojson') ? responseFor(url) : deferred });
    const earlierReady = controller.ready();
    change(window, root.querySelector('[data-culture-case]'), 'croatia-national-2021');
    await controller.ready();
    finishEW(responseFor('england-wales-lad2021.geojson'));
    await earlierReady;
    assert.equal(controller.readState().cultureCase, 'croatia-national-2021');
    assert.equal(mapLayer.querySelectorAll('path').length, 1);
    assert.equal(published.at(-1).features[0].properties.code, 'HRV');
    assert.equal(root.querySelector('[data-culture-count]').textContent, '3,547,614人');
    controller.destroy();
  } finally { setupData.close(); }
});

test('geometry failure keeps source values usable and supports an explicit bounded retry', async () => {
  const setupData = await setup();
  try {
    const { root, mapLayer, window } = setupData;
    let calls = 0;
    const controller = createEuropePopulationCases(root, { base: '/unit-culture-retry/', mapLayer, fetch: async url => ++calls === 1 ? { ok: false, json: async () => ({}) } : responseFor(url) });
    await controller.ready();
    assert.match(root.querySelector('[data-culture-map-status]').textContent, /地図を表示できません.*数値は利用できます/);
    assert.equal(mapLayer.children.length, 0);
    assert.match(root.querySelector('[data-culture-denominator]').textContent, /92,338人/);
    assert.equal(root.querySelector('[data-culture-area]').disabled, false);
    root.querySelector('[data-culture-fit]').dispatchEvent(new window.Event('click', { bubbles: true }));
    await controller.ready();
    assert.equal(calls, 2);
    assert.equal(mapLayer.querySelectorAll('path').length, 331);
    assert.match(root.querySelector('[data-culture-map-status]').textContent, /未掲載地域は0%ではありません/);
    controller.destroy();
  } finally { setupData.close(); }
});
