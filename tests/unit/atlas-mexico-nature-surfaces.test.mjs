import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const quantitative = JSON.parse(fs.readFileSync('public/assets/atlas/mexico-quantitative-v1/manifest.json', 'utf8'));
const basins = JSON.parse(fs.readFileSync('public/assets/atlas/mexico-basin-review-v1/catalog.json', 'utf8'));
const originalWater = JSON.parse(fs.readFileSync('public/assets/atlas/mexico-water-v1/manifest.json', 'utf8'));
const bundle = await build({stdin: {contents: "import {initMexicoHydrology} from './src/scripts/atlas-mexico-hydrology.ts';window.initSurfaceWater=initMexicoHydrology;", resolveDir: process.cwd(), loader: 'ts'}, bundle: true, platform: 'browser', format: 'iife', write: false});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(predicate, message = 'prepared surface controller settled') {
  for (let i = 0; i < 150; i++) {if (predicate()) return; await pause(5);}
  assert.ok(predicate(), message);
}
const response = data => ({ok: true, json: async () => structuredClone(data)});
const deferred = () => {let resolve; const promise = new Promise(done => {resolve = done;}); return {promise, resolve};};

function setup(search = '?category=precipitation&view=relief&waterBase=relief') {
  const window = new Window({url: `https://example.test/nature/${search}`, settings: {enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true}});
  window.document.write(`<article data-mexico-workspace>
    <svg data-mexico-nature-main-map viewBox="0 0 900 580"><title id="mexico-nature-map-title"></title><desc id="mexico-nature-map-desc"></desc>
      <g data-mexico-nature-neutral></g><g data-mexico-nature-relief-background></g>
      <g data-mexico-nature-vector><g data-mexico-nature-layer="climate"></g><g data-mexico-nature-layer="relief"></g></g>
      <g data-mexico-nature-static></g><g data-mexico-hydrology-overlay></g>
    </svg>
    <label><select data-mexico-nature-item-select><option>既存の地域選択</option></select></label>
    <div data-mexico-hydrology-controls><select data-mexico-hydrology-item></select><select data-mexico-hydrology-base><option>plain</option><option>climate</option><option>relief</option></select></div>
    <ul data-mexico-nature-legend="climate"><li>気候原分類</li></ul><ul data-mexico-nature-legend="relief"><li>自然地理地域</li></ul>
    <aside class="mexico-reading"><ul data-mexico-hydrology-legend></ul>
      <div data-mexico-hydrology-base-key><div data-mexico-hydrology-base-key-host></div></div>
      <div data-mexico-water-background-key><div data-mexico-water-background-key-host></div></div>
      <p data-mexico-nature-map-title></p><p data-mexico-nature-map-edition></p><p data-mexico-nature-period></p>
      <section data-mexico-hydrology-reading><h2 data-mexico-hydrology-title></h2><p data-mexico-hydrology-lead></p><p data-mexico-hydrology-status></p><button data-mexico-hydrology-retry hidden>再読み込み</button>
        <div data-mexico-hydrology-body><p data-mexico-hydrology-value></p><p data-mexico-hydrology-definition></p><p data-mexico-hydrology-limitations></p><div data-mexico-hydrology-source></div></div>
      </section>
      <section data-mexico-nature-comparison><p data-mexico-nature-comparison-lead>比較元の説明</p><p data-mexico-nature-comparison-value>比較元の値</p><div class="mexico-nature-reading-body"></div></section>
    </aside><p data-mexico-hydrology-picker-note></p>
  </article>`);
  window.ResizeObserver = undefined;
  window.eval(bundle.outputFiles[0].text);
  const root = window.document.querySelector('article'), requests = [];
  const query = new URL(window.location.href).searchParams;
  let state = {category: query.get('category') ?? '', view: query.get('view') ?? 'climate', fallback: false, state: query.get('state') ?? '25', compare: query.get('compare'), sourceState: query.get('sourceState')};
  let responder = null, commits = 0;
  const riverFixture = {type: 'FeatureCollection', features: [{type: 'Feature', properties: {id: 'river-test-7', classId: 'rivers-order-7', name: '小流域内次数7'}, geometry: {type: 'LineString', coordinates: [[-103, 23], [-102, 24]]}}]};
  window.fetch = async input => {
    const path = String(input); requests.push(path);
    if (responder) {const result = await responder(path); if (result !== undefined) return result;}
    if (path === '/quant/manifest.json') return response(quantitative);
    if (path === '/basins/catalog.json') return response(basins);
    if (path === '/water/manifest.json') return response({layers: {rivers: {...originalWater.layers.rivers, file: 'rivers.json'}}});
    if (path === '/water/rivers.json') return response(riverFixture);
    throw new Error(`Unexpected request: ${path}`);
  };
  let controller;
  const commit = () => {commits++; window.history.pushState(null, '', controller.url(new URL(window.location.href))); controller.render();};
  controller = window.initSurfaceWater(root, '/water/', () => state, commit, undefined, {surfaceAssetBase: '/quant/', basinAssetBase: '/basins/'});
  const q = selector => root.querySelector(selector);
  const group = () => q('[data-mexico-prepared-surface]');
  const image = () => group()?.querySelector('image');
  const transition = category => {
    state = {...state, category};
    const url = new URL(window.location.href); if (category) url.searchParams.set('category', category); else url.searchParams.delete('category');
    window.history.replaceState(null, '', url); controller.render();
  };
  const waitImage = async file => {await waitFor(() => group().style.display !== 'none' && image()?.getAttribute('href') === file, `image ${file}`); return image();};
  const loadImage = async file => {const node = await waitImage(file); node.dispatchEvent(new window.Event('load')); await waitFor(() => root.dataset.mexicoHydrologyReady === 'true'); return node;};
  const restore = url => {window.history.replaceState(null, '', url); state = {...state, category: new URL(window.location.href).searchParams.get('category') ?? ''}; controller.read(); controller.render();};
  return {window, root, requests, controller, q, group, image, transition, waitImage, loadImage, restore, setResponder: value => {responder = value;}, get commits() {return commits;}};
}
const precipitationImage = '/quant/' + quantitative.layers.precipitation.image.file;
const elevationImage = '/quant/' + quantitative.layers.elevation.image.file;

test('prepared precipitation waits for its exact PNG and shows annual mm, baseline, numeric ticks and provenance', async () => {
  const f = setup();
  try {
    f.controller.render(); const image = await f.waitImage(precipitationImage);
    assert.equal(f.root.dataset.mexicoHydrologyReady, 'loading');
    assert.deepEqual(['x', 'y', 'width', 'height', 'preserveAspectRatio'].map(key => image.getAttribute(key)), ['0', '0', '900', '580', 'none']);
    await f.loadImage(precipitationImage);
    assert.equal(f.q('[data-mexico-nature-map-title]').textContent, '年降水量');
    assert.equal(f.q('[data-mexico-nature-period]').textContent, '1991–2020年平年値');
    assert.match(f.q('[data-mexico-quantitative-legend]').textContent, /mm\/年.*多いほど濃い青/);
    const ticks = [...f.root.querySelectorAll('.mexico-quantitative-ticks span')];
    assert.deepEqual(ticks.map(node => node.textContent), ['0', '500', '1,000', '2,000', '3,000', '4,000']);
    assert.deepEqual(ticks.map(node => node.style.left), ['0%', '12.5%', '25%', '50%', '75%', '100%']);
    assert.match(f.q('.mexico-quantitative-ramp').style.background, /linear-gradient.*#f7fbff.*#08306b/);
    assert.match(f.q('[data-mexico-hydrology-limitations]').textContent, /欠損は0 mmではありません/);
    assert.match(f.q('[data-mexico-hydrology-source]').textContent, /格子の解析値.*個別観測所.*一致しません/);
    assert.equal(f.q('[data-mexico-hydrology-source] a:last-child').getAttribute('href'), '/quant/' + quantitative.layers.precipitation.provenanceFile);
    assert.equal(f.q('[data-mexico-hydrology-controls]').hidden, true);
    assert.equal(f.q('[data-mexico-nature-layer="relief"]').style.display, 'none');
    assert.equal(f.q('[data-mexico-nature-relief-background]').style.display, 'none');
    assert.equal(f.q('[data-mexico-nature-neutral]').style.display, '');
    assert.deepEqual(f.requests, ['/quant/manifest.json']);
    assert.equal(f.root.querySelectorAll('[data-mexico-water-feature]').length, 0);
  } finally {await f.window.happyDOM.close();}
});

test('prepared elevation reuses the validated manifest, shows m and the EGM2008 edition, and never fetches old contours or isohyets', async () => {
  const f = setup();
  try {
    f.controller.render(); await f.loadImage(precipitationImage);
    f.transition('elevation'); await f.loadImage(elevationImage);
    assert.equal(f.root.dataset.mexicoPreparedCategory, 'elevation');
    assert.match(f.q('[data-mexico-quantitative-legend]').textContent, /標高（m）.*高いほど濃い色/);
    assert.match(f.q('[data-mexico-nature-period]').textContent, /ETOPO 2022（版年）.*60秒.*EGM2008/);
    assert.deepEqual([...f.root.querySelectorAll('.mexico-quantitative-ticks span')].map(node => node.textContent), ['-600', '0', '1,000', '2,000', '3,000', '4,000', '5,500']);
    assert.match(f.q('[data-mexico-hydrology-limitations]').textContent, /有効な負標高/);
    assert.match(f.q('[data-mexico-hydrology-source]').textContent, /全国共通の観測年ではありません/);
    assert.equal(f.q('[data-mexico-hydrology-controls]').hidden, true);
    assert.equal(f.root.querySelectorAll('[data-mexico-water-feature],[data-mexico-water-labels]').length, 0);
    assert.equal(f.root.querySelectorAll('[data-mexico-numeric-image]').length, 1);
    assert.deepEqual(f.requests, ['/quant/manifest.json']);
    f.transition('');
    assert.equal(f.group().style.display, 'none');
    assert.equal(f.q('[data-mexico-hydrology-overlay]').style.display, 'none');
    assert.equal(f.q('[data-mexico-nature-item-select]').closest('label').hidden, false, 'other-tab item selection remains available');
  } finally {await f.window.happyDOM.close();}
});

test('the basin entry has exactly three domestic systems, preserves scope, and renders no unverified mainstem, arrow or mouth', async () => {
  const f = setup('?category=basins&view=climate');
  try {
    f.controller.render(); await f.loadImage('/basins/' + basins.systems[0].domesticFill.file);
    const picker = f.q('[data-mexico-basin-systems]');
    assert.equal(picker.hidden, false); assert.equal(picker.getAttribute('role'), 'group');
    assert.deepEqual([...picker.querySelectorAll('button')].map(node => node.dataset.mexicoBasinSystem), basins.systems.map(system => system.id));
    assert.match(f.q('[data-mexico-nature-period]').textContent, /全国158.*全てを表すものではありません/);
    for (const system of basins.systems) {
      f.q(`button[data-mexico-basin-system="${system.id}"]`).click();
      await f.loadImage('/basins/' + system.domesticFill.file);
      assert.equal(f.q('[data-mexico-hydrology-title]').textContent, system.nameJa);
      assert.equal(f.q('[data-mexico-hydrology-definition]').textContent, system.foreignScopeJa);
      assert.equal(f.q(`button[data-mexico-basin-system="${system.id}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(f.root.querySelectorAll('[data-mexico-basin-systems] [aria-pressed="true"]').length, 1);
      assert.match(f.q('[data-mexico-hydrology-status]').textContent, /本流・流向・河口は原典確認待ち/);
      assert.match(f.q('[data-mexico-hydrology-source]').textContent, /国外の上流域は追加せず.*国土境界内/);
      assert.equal(f.group().children.length, 1); assert.equal(f.group().firstElementChild.localName, 'image');
      assert.equal(f.group().querySelectorAll('path,line,polyline,marker,circle').length, 0);
    }
    assert.deepEqual(f.requests, ['/basins/catalog.json']);
  } finally {await f.window.happyDOM.close();}
});

test('late surface/catalog responses and late image events cannot replace a newly selected category', async () => {
  const f = setup(), delayedSurface = deferred(), delayedBasin = deferred();
  f.setResponder(path => path === '/quant/manifest.json' ? {ok: true, json: () => delayedSurface.promise} : path === '/basins/catalog.json' ? {ok: true, json: () => delayedBasin.promise} : undefined);
  try {
    f.controller.render(); await waitFor(() => f.requests.includes('/quant/manifest.json'));
    f.transition('basins'); await waitFor(() => f.requests.includes('/basins/catalog.json'));
    delayedBasin.resolve(structuredClone(basins)); const basinImage = await f.loadImage('/basins/' + basins.systems[0].domesticFill.file);
    delayedSurface.resolve(structuredClone(quantitative)); await pause(20);
    assert.equal(f.root.dataset.mexicoPreparedCategory, 'basins');
    assert.equal(f.image(), basinImage); assert.equal(f.q('[data-mexico-nature-map-title]').textContent, '3代表水系の国内流域');
    f.transition('elevation'); const height = await f.waitImage(elevationImage);
    basinImage.dispatchEvent(new f.window.Event('error')); basinImage.dispatchEvent(new f.window.Event('load'));
    assert.equal(f.image(), height); assert.equal(f.root.dataset.mexicoHydrologyReady, 'loading');
    assert.equal(f.q('[data-mexico-hydrology-retry]').hidden, true);
    await f.loadImage(elevationImage);
    assert.equal(f.q('[data-mexico-nature-map-title]').textContent, '標高');
  } finally {delayedSurface.resolve(quantitative); delayedBasin.resolve(basins); await f.window.happyDOM.close();}
});

test('switching back and resizing cannot redraw hidden legacy layers over the numeric surface', async () => {
  const f = setup('?category=rivers-groundwater&view=relief&waterFeature=rivers:river-test-7');
  try {
    f.controller.render(); await waitFor(() => f.root.dataset.mexicoHydrologyReady === 'true');
    const legacy = f.q('[data-mexico-hydrology-layer="rivers"]'); assert.ok(legacy?.querySelector('path'));
    f.transition('precipitation'); const rain = await f.loadImage(precipitationImage);
    f.transition('elevation'); const height = await f.loadImage(elevationImage);
    Object.defineProperty(f.q('svg'), 'clientWidth', {value: 320, configurable: true});
    f.window.dispatchEvent(new f.window.Event('resize')); await pause(40);
    assert.equal(f.image(), height); assert.equal(legacy.style.display, 'none');
    assert.equal(f.q('[data-mexico-hydrology-legend]').hidden, true);
    assert.equal(f.q('[data-mexico-quantitative-legend]').hidden, false);
    assert.equal(f.q('[data-mexico-hydrology-legend]').children.length, 0);
    f.transition('precipitation'); await waitFor(() => f.root.dataset.mexicoPreparedCategory === 'precipitation' && f.root.dataset.mexicoHydrologyReady === 'true');
    assert.equal(f.image(), rain, 'loaded image cache is safely reused');
    assert.equal(f.q('[data-mexico-nature-period]').textContent, '1991–2020年平年値');
    assert.equal(f.root.querySelectorAll('[data-mexico-prepared-surface]').length, 1);
    assert.equal(f.requests.filter(path => path === '/quant/manifest.json').length, 1);
    assert.equal(f.requests.some(path => /contours|precipitation\.geojson|basins\.geojson/.test(path)), false);
  } finally {await f.window.happyDOM.close();}
});

test('image failure reports not-ready and Retry obtains a fresh image without losing the selected context', async () => {
  const f = setup('?category=precipitation&compare=irrigation&sourceState=25&waterFeature=basins:bravo');
  try {
    f.controller.render(); const failed = await f.waitImage(precipitationImage);
    failed.dispatchEvent(new f.window.Event('error'));
    assert.equal(f.root.dataset.mexicoHydrologyReady, 'false'); assert.equal(f.image(), null);
    assert.match(f.q('[data-mexico-hydrology-status]').textContent, /画像を取得できません/);
    assert.equal(f.q('[data-mexico-hydrology-retry]').hidden, false);
    f.q('[data-mexico-hydrology-retry]').click(); const retried = await f.waitImage(precipitationImage);
    assert.notEqual(retried, failed); assert.equal(f.root.dataset.mexicoHydrologyReady, 'loading');
    failed.dispatchEvent(new f.window.Event('load')); assert.equal(f.root.dataset.mexicoHydrologyReady, 'loading');
    await f.loadImage(precipitationImage);
    assert.equal(f.q('[data-mexico-hydrology-retry]').hidden, true);
    assert.equal(new URL(f.window.location.href).searchParams.get('compare'), 'irrigation');
    assert.equal(f.controller.url(new URL(f.window.location.href)).searchParams.get('waterFeature'), 'basins:bravo');
  } finally {await f.window.happyDOM.close();}
});

test('a transient manifest HTTP error retries the prepared source and keeps the image unready until load', async () => {
  const f = setup(); let requests = 0;
  f.setResponder(path => path === '/quant/manifest.json' && ++requests === 1 ? {ok: false, status: 503} : undefined);
  try {
    f.controller.render(); await waitFor(() => f.root.dataset.mexicoHydrologyReady === 'false');
    assert.equal(f.image(), null); assert.equal(f.q('[data-mexico-hydrology-retry]').hidden, false);
    f.q('[data-mexico-hydrology-retry]').click(); await f.waitImage(precipitationImage);
    assert.equal(f.root.dataset.mexicoHydrologyReady, 'loading'); await f.loadImage(precipitationImage);
    assert.equal(f.requests.filter(path => path === '/quant/manifest.json').length, 2);
  } finally {await f.window.happyDOM.close();}
});

test('a malformed HTTP-200 quantitative manifest is not cached across Retry', async () => {
  const f = setup(); let requests = 0;
  f.setResponder(path => path === '/quant/manifest.json' && ++requests === 1 ? response({...structuredClone(quantitative), layers: {}}) : undefined);
  try {
    f.controller.render(); await waitFor(() => f.root.dataset.mexicoHydrologyReady === 'false');
    f.q('[data-mexico-hydrology-retry]').click(); await f.loadImage(precipitationImage);
    assert.equal(f.requests.filter(path => path === '/quant/manifest.json').length, 2);
  } finally {await f.window.happyDOM.close();}
});

test('unverified basin flow geometry is rejected and a corrected catalog can be fetched on Retry', async () => {
  const f = setup('?category=basins'); let requests = 0;
  const invalid = structuredClone(basins); invalid.systems[0].verifiedFlowArrows.features.push({type: 'Feature', geometry: {type: 'Point', coordinates: [-100, 25]}, properties: {}});
  f.setResponder(path => path === '/basins/catalog.json' && ++requests === 1 ? response(invalid) : undefined);
  try {
    f.controller.render(); await waitFor(() => f.root.dataset.mexicoHydrologyReady === 'false');
    assert.equal(f.group().querySelectorAll('path,line,marker,image').length, 0);
    f.q('[data-mexico-hydrology-retry]').click(); await f.loadImage('/basins/' + basins.systems[0].domesticFill.file);
    assert.equal(f.requests.filter(path => path === '/basins/catalog.json').length, 2);
  } finally {await f.window.happyDOM.close();}
});

test('basin choice and history restoration retain waterFeature, native camera and the exact source comparison', async () => {
  const initial = '?category=basins&view=relief&state=10&feature=relief-17&item=III&frame=210,100,350,220&compare=irrigation&from=agriculture&sourceState=25&sourceMetric=cattle&sourceCrops=0&sourceLivestock=1&sourceOnlyItem=1&waterBase=relief';
  const f = setup(initial); let restored;
  try {
    f.controller.render(); await f.loadImage('/basins/' + basins.systems[0].domesticFill.file);
    const target = basins.systems[1]; f.q(`button[data-mexico-basin-system="${target.id}"]`).click();
    await f.loadImage('/basins/' + target.domesticFill.file);
    restored = f.window.location.href;
    const selected = new URL(restored), before = new URL('https://example.test/nature/' + initial);
    for (const [key, value] of before.searchParams) assert.equal(selected.searchParams.get(key), value, `${key} preserved`);
    assert.equal(selected.searchParams.get('waterFeature'), `basins:${target.id}`); assert.equal(f.commits, 1);
    f.transition('elevation'); await f.loadImage(elevationImage);
    assert.equal(f.controller.url(new URL(f.window.location.href)).searchParams.get('waterFeature'), `basins:${target.id}`);
    f.restore(restored); await waitFor(() => f.root.dataset.mexicoPreparedCategory === 'basins' && f.root.dataset.mexicoHydrologyReady === 'true');
    assert.equal(f.q(`button[data-mexico-basin-system="${target.id}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(f.root.dataset.mexicoWaterFeature, `basins:${target.id}`);
    assert.equal(f.q('[data-mexico-water-comparison-selection]').textContent, `自然図：${target.nameJa}`);
  } finally {await f.window.happyDOM.close();}
  const reload = setup(new URL(restored).search);
  try {
    reload.controller.render(); await reload.loadImage('/basins/' + basins.systems[1].domesticFill.file);
    assert.equal(reload.root.dataset.mexicoWaterFeature, `basins:${basins.systems[1].id}`);
    assert.equal(reload.controller.url(new URL(reload.window.location.href)).searchParams.get('frame'), '210,100,350,220');
  } finally {await reload.window.happyDOM.close();}
});
