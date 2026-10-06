import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {mexicoNatureZoomFrame, readMexicoNatureState, writeMexicoNatureState} from '../../src/lib/atlas-mexico-nature.ts';

const result = await build({stdin: {contents: "import {initMexicoNature} from './src/scripts/atlas-mexico-nature.ts'; initMexicoNature(document.querySelector('[data-mexico-workspace]'));", resolveDir: process.cwd(), loader: 'ts'}, bundle: true, platform: 'browser', format: 'iife', write: false});
const script = result.outputFiles[0].text;
const national = [0, 0, 900, 580];
const codes = ['25', '10'];
const originalClimate = JSON.parse(await readFile('src/data/atlas/mexico/nature-v1.json', 'utf8')).climate;
const sourceAnomaly = originalClimate.features.find(feature => feature.id === 'climate-551');
const sourceAnomalyClass = originalClimate.classes.find(item => item.id === sourceAnomaly.classId);
const source = 'compare=irrigation&from=agriculture&sourceMetric=pine&sourceState=10&sourceOnly=1&sourceFallback=1&sourceCrops=0&sourceLivestock=1&sourceOnlyItem=1&state=25&only=0&frame=210,100,350,220&side=source';

function fixture(search = '?view=relief', water = false) {
  const window = new Window({url: `https://example.test/nature/${search}`, settings: {enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true}});
  const item = id => ({id, labelJa: id, title: `Official ${id}`, lead: `Reading ${id}`, body: `Source ${id}`});
  const config = {routes: {nature: '/nature/', agriculture: '/agriculture/', population: '/population/'}, defaultViewBox: national.join(' '), states: codes.map(code => ({code, name: code, point: [100, 100], irrigationSharePct: 45, pineObtainedM3: 1000000, maizeWhiteProductionT: 100000, cattleHeads: 100000, density: 50, population: 10000})), sinaloaWinter: {productionT: 1, irrigatedProductionSharePct: 99}, staticMaps: {climate: '/climate.svg', relief: '/relief.svg'}, items: {climate: [item('59'), item('11')], relief: [item('III'), item('IV'), item('S/It')]}};
  config.items.climate.push({...item(sourceAnomalyClass.id), labelJa: sourceAnomalyClass.labelJa, title: sourceAnomalyClass.labelJa});
  if (water) config.waterAssetBase = '/water/';
  window.document.write(`<main data-mexico-workspace>
    <button data-mexico-nature-view="climate"></button><button data-mexico-nature-view="relief"></button>
    <button data-mexico-nature-category="elevation"></button><button data-mexico-nature-focus></button>
    <button data-mexico-nature-reset></button><button data-mexico-nature-reset></button>
    <button data-mexico-nature-zoom="in"></button><button data-mexico-nature-zoom="out"></button>
    <label><select data-mexico-nature-item-select></select></label>
    <svg data-mexico-nature-main-map>
      <g data-mexico-nature-neutral style="display:none"></g>
      <g data-mexico-nature-vector>
      <g data-mexico-nature-relief-background style="display:none"><image href="/relief-current.webp"></image></g>
      <g data-mexico-nature-layer="climate">
        <path fill="#22cc22" data-mexico-nature-feature="climate-3" data-nature-class="59" data-nature-source-code="C(w0)(w)"></path>
        <path fill="#cc9900" data-mexico-nature-feature="climate-4" data-nature-class="11" data-nature-source-code="Aw0(w)"></path>
        <path fill="#22cc22" data-mexico-nature-feature="climate-5" data-nature-class="59" data-nature-source-code="C(w1)(w)"></path>
        <path data-mexico-nature-feature="${sourceAnomaly.id}" data-nature-class="${sourceAnomaly.classId}" data-nature-source-code="${sourceAnomaly.sourceCode}"></path>
        <g role="button" data-mexico-nature-class-label="59" data-mexico-nature-label-feature="climate-3" data-mexico-nature-label-code="C(w0)(w)"><text>C(w0)(w)</text></g>
        <g role="button" data-mexico-nature-class-label="11" data-mexico-nature-label-feature="climate-4" data-mexico-nature-label-code="Aw0(w)"><text>Aw0(w)</text></g>
        <g role="button" data-mexico-nature-class-label="${sourceAnomaly.classId}" data-mexico-nature-label-feature="${sourceAnomaly.id}" data-mexico-nature-label-code="${sourceAnomaly.sourceCode}"><text>${sourceAnomaly.sourceCode}</text></g>
      </g>
      <g data-mexico-nature-layer="relief">
        <path fill="#eff0e8" data-mexico-nature-feature="relief-5" data-nature-class="III"></path>
        <path fill="#eff0e8" data-mexico-nature-feature="relief-7" data-nature-class="III"></path>
        <path fill="#eff0e8" data-mexico-nature-feature="relief-8" data-nature-class="IV"></path>
        <g role="button" data-mexico-nature-class-label="III"><text>III</text></g>
        <g role="button" data-mexico-nature-class-label="IV"><text>IV</text></g>
      </g>
      </g>
      <g data-mexico-nature-static hidden><image data-mexico-nature-static-image href="/climate-old.svg"></image></g>
      <g data-mexico-hydrology-overlay></g>
      <path data-mexico-nature-state="25"></path><path data-mexico-nature-state="10"></path>
      <g data-mexico-nature-target></g>
    </svg>
    <svg data-mexico-nature-comparison-map></svg>
    <section data-mexico-nature-feature-reading><h2 data-mexico-nature-feature-title></h2><p data-mexico-nature-feature-lead></p><p data-mexico-nature-feature-body></p></section>
    <section data-mexico-nature-overview></section><a data-mexico-nature-source-return></a>
    <a data-mexico-nature-plain-return></a><button data-mexico-nature-clear-item></button>
    <p data-mexico-nature-static-note hidden>Legacy static artwork</p>
    <script type="application/json" data-mexico-nature-config>${JSON.stringify(config)}</script>
  </main>`);
  if (water) {
    const root = window.document.querySelector('[data-mexico-workspace]');
    root.insertAdjacentHTML('beforeend', '<div data-mexico-hydrology-controls><select data-mexico-hydrology-base><option value="plain">plain</option><option value="climate">climate</option><option value="relief">relief</option></select><select data-mexico-hydrology-item></select></div><ul data-mexico-hydrology-legend></ul><section data-mexico-hydrology-reading><h2 data-mexico-hydrology-title></h2><p data-mexico-hydrology-lead></p><p data-mexico-hydrology-status></p><button data-mexico-hydrology-retry></button><div data-mexico-hydrology-body><p data-mexico-hydrology-value></p><p data-mexico-hydrology-definition></p><p data-mexico-hydrology-limitations></p><div data-mexico-hydrology-source></div></div></section>');
    window.fetch = async url => ({ok: true, json: async () => String(url).endsWith('manifest.json') ? {layers: {contours: {file: 'contours.json', publisher: 'NOAA NCEI', edition: 2022, displayIntervalM: 500}}} : {type: 'FeatureCollection', features: [{type: 'Feature', properties: {id: 'contours-1000-1', name: '1000 m', elevationM: 1000}, geometry: {type: 'LineString', coordinates: [[-104, 24], [-102, 25]]}}]}});
  }
  window.eval(script);
  return window;
}

const chosen = document => [...document.querySelectorAll('.is-selected-feature')].map(path => path.dataset.mexicoNatureFeature).sort();

test('Zoom keeps a shared bounded camera and round-trips at its smallest and national extents', () => {
  assert.deepEqual(mexicoNatureZoomFrame(null, national, 'in'), [112.5, 72.5, 675, 435]);
  assert.deepEqual(mexicoNatureZoomFrame([870, 560, 35, 25], national, 'out'), [853.3333333333334, 546.6666666666666, 46.666666666666664, 33.33333333333333]);
  let frame = null;
  for (let index = 0; index < 50; index++) frame = mexicoNatureZoomFrame(frame, national, 'in');
  assert.equal(frame[2], 35); assert.equal(frame[3], 25);
  const state = {...readMexicoNatureState(new URL('https://example.test/?state=25'), codes), frame};
  assert.deepEqual(readMexicoNatureState(writeMexicoNatureState(new URL('https://example.test/'), state), codes).frame, frame);
  for (let index = 0; index < 50; index++) frame = mexicoNatureZoomFrame(frame, national, 'out');
  assert.equal(frame, null);
});

test('Named landform labels select only their official class and preserve the comparison and source return', async () => {
  const window = fixture(`?view=relief&feature=relief-5&item=III&${source}`);
  let restored;
  try {
    const document = window.document;
    assert.deepEqual(chosen(document), ['relief-5', 'relief-7']);
    assert.equal(document.querySelector('path[data-mexico-nature-state="25"]').style.display, 'none');
    assert.equal(document.querySelector('[data-mexico-nature-target]').style.display, 'none');
    assert.equal(document.querySelector('[data-mexico-nature-focus]').hidden, true);
    document.querySelector('[data-mexico-nature-class-label="IV"]').dispatchEvent(new window.KeyboardEvent('keydown', {key: ' ', bubbles: true}));
    assert.deepEqual(chosen(document), ['relief-8']);
    const url = new URL(window.location.href);
    assert.equal(url.searchParams.get('item'), 'IV'); assert.equal(url.searchParams.has('feature'), false);
    for (const [key, expected] of new URLSearchParams(source)) assert.equal(url.searchParams.get(key), expected, key);
    assert.equal(document.querySelector('[data-mexico-nature-feature-title]').textContent, 'Official IV');
    assert.equal(document.querySelector('[data-mexico-nature-class-label="IV"]').getAttribute('aria-pressed'), 'true');
    assert.ok([...document.querySelectorAll('[data-mexico-nature-layer="relief"] path')].every(path => path.getAttribute('fill') === '#eff0e8'));
    const returnURL = new URL(document.querySelector('[data-mexico-nature-source-return]').href);
    for (const [key, expected] of Object.entries({state: '10', metric: 'pine', only: '1', fallback: '1', crops: '0', onlyItem: '1'})) assert.equal(returnURL.searchParams.get(key), expected);
    const naturalURL = new URL(document.querySelector('[data-mexico-nature-plain-return]').href);
    assert.equal(naturalURL.searchParams.get('item'), 'IV'); assert.equal(naturalURL.searchParams.has('compare'), false);
    assert.equal(naturalURL.searchParams.get('sourceState'), '10'); assert.equal(naturalURL.searchParams.get('frame'), '210,100,350,220');
    restored = fixture(window.location.search); assert.deepEqual(chosen(restored.document), ['relief-8']);
    window.history.replaceState(null, '', `/nature/?view=relief&feature=relief-5&item=III&${source}`);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.deepEqual(chosen(document), ['relief-5', 'relief-7']);
  } finally {await window.happyDOM.close(); await restored?.happyDOM.close();}
});

test('Climate labels retain the exact source explanation while climate areas and states remain passive', async () => {
  const window = fixture(`?view=relief&item=III&feature=relief-5&${source}`);
  try {
    const document = window.document;
    document.querySelector('[data-mexico-nature-view="climate"]').click();
    assert.deepEqual(chosen(document), []);
    assert.equal(document.querySelector('[data-mexico-nature-class-label="III"]').getAttribute('aria-disabled'), 'true');
    assert.equal(document.querySelector('[data-mexico-nature-class-label="59"]').getAttribute('tabindex'), '0');
    document.querySelector('[data-mexico-nature-class-label="59"]').dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
    assert.deepEqual(chosen(document), []);
    assert.equal(new URL(window.location.href).searchParams.get('item'), '59');
    assert.equal(new URL(window.location.href).searchParams.get('feature'), 'climate-3');
    assert.match(document.querySelector('[data-mexico-nature-feature-title]').textContent, /C\(w0\)\(w\)/);
    const labelURL = window.location.href;
    const area = document.querySelector('[data-mexico-nature-feature="climate-5"]');
    area.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
    area.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    document.querySelector('path[data-mexico-nature-state="10"]').dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
    assert.equal(window.location.href, labelURL, 'Passive climate areas and state borders cannot change the selected explanation');
    assert.deepEqual(chosen(document), []);
    assert.equal(area.getAttribute('role'), 'img'); assert.equal(area.getAttribute('tabindex'), '-1');
    assert.match(document.querySelector('[data-mexico-nature-feature-title]').textContent, /C\(w0\)\(w\)/);
    assert.equal(document.querySelector('[data-mexico-nature-class-label="59"]').getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelector('path[data-mexico-nature-state="25"]').style.display, '');
    document.querySelector('[data-mexico-nature-category="elevation"]').click();
    assert.deepEqual(chosen(document), []);
    const before = window.location.href;
    document.querySelector('[data-mexico-nature-class-label="11"]').dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
    assert.equal(window.location.href, before, 'Underlying climate labels cannot change a hydrology target');
  } finally {await window.happyDOM.close();}
});

test('Every reset button and +/- keep both maps synchronized while preserving named selection and history', async () => {
  const window = fixture(`?view=relief&item=III&${source}`);
  try {
    const document = window.document;
    const maps = [...document.querySelectorAll('[data-mexico-nature-main-map],[data-mexico-nature-comparison-map]')];
    document.querySelector('[data-mexico-nature-zoom="in"]').click();
    assert.equal(new URL(window.location.href).searchParams.get('frame'), '253.75,127.5,262.5,165');
    assert.equal(maps[0].getAttribute('viewBox'), maps[1].getAttribute('viewBox'));
    assert.equal(new URL(window.location.href).searchParams.get('item'), 'III');
    document.querySelector('[data-mexico-nature-zoom="out"]').click();
    assert.equal(new URL(window.location.href).searchParams.get('frame'), '210,100,350,220');
    for (const reset of document.querySelectorAll('[data-mexico-nature-reset]')) {
      document.querySelector('[data-mexico-nature-zoom="in"]').click(); reset.click();
      assert.equal(new URL(window.location.href).searchParams.has('frame'), false);
      assert.ok(maps.every(map => map.getAttribute('viewBox') === '0 0 900 580'));
      assert.equal(new URL(window.location.href).searchParams.get('sourceState'), '10');
      assert.deepEqual(chosen(document), ['relief-5', 'relief-7']);
    }
    window.history.replaceState(null, '', `/nature/?view=relief&item=III&${source}`);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.ok(maps.every(map => map.getAttribute('viewBox') === '210 100 350 220'));
  } finally {await window.happyDOM.close();}
});

test('Legacy fallback URLs keep current native climate and relief artwork interactive without old static images', async () => {
  for (const view of ['climate', 'relief']) {
    const window = fixture(`?view=${view}&fallback=1&item=III&${source}`);
    try {
      const document = window.document;
      assert.equal(document.querySelector('[data-mexico-nature-vector]').style.display, '');
      assert.equal(document.querySelector('[data-mexico-nature-static]').style.display, 'none');
      assert.equal(document.querySelector('[data-mexico-nature-static-image]').getAttribute('href'), null);
      assert.equal(document.querySelector('[data-mexico-nature-static-note]').hidden, true);
      assert.equal(document.querySelector('[data-mexico-nature-main-map]').dataset.mexicoNatureMapMode, 'interactive');
      assert.equal(document.querySelector(`[data-mexico-nature-layer="${view}"]`).style.display, '');
      const display = view === 'relief' ? '' : 'none';
      for (const selector of ['[data-mexico-nature-neutral]', '[data-mexico-nature-relief-background]']) assert.equal(document.querySelector(selector).style.display, display);
      document.querySelector(`[data-mexico-nature-class-label="${view === 'climate' ? '59' : 'IV'}"]`).dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
      assert.deepEqual(chosen(document), view === 'climate' ? [] : ['relief-8']);
      if (view === 'climate') assert.match(document.querySelector('[data-mexico-nature-feature-title]').textContent, /C\(w0\)\(w\)/);
      const url = new URL(window.location.href);
      assert.equal(url.searchParams.get('fallback'), '1');
      for (const [key, expected] of new URLSearchParams(source)) assert.equal(url.searchParams.get(key), expected, key);
      assert.equal(new URL(document.querySelector('[data-mexico-nature-source-return]').href).searchParams.get('fallback'), '1');
    } finally {await window.happyDOM.close();}
  }
});

test('Relief backdrop follows hydrology base changes and history while preserving source flags and the natural return', async () => {
  const window = fixture(`?view=climate&category=elevation&waterBase=relief&waterFeature=contours:contours-1000-1&fallback=1&${source}`, true);
  const settled = async () => {
    for (let index = 0; index < 120 && window.document.querySelector('[data-mexico-workspace]').dataset.mexicoHydrologyReady !== 'true'; index++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(window.document.querySelector('[data-mexico-workspace]').dataset.mexicoHydrologyReady, 'true');
  };
  try {
    await settled();
    const document = window.document, base = document.querySelector('[data-mexico-hydrology-base]');
    const neutral = document.querySelector('[data-mexico-nature-neutral]'), backdrop = document.querySelector('[data-mexico-nature-relief-background]');
    assert.equal(neutral.style.display, ''); assert.equal(backdrop.style.display, '');
    assert.equal(document.querySelector('[data-mexico-nature-layer="climate"]').style.display, 'none');
    for (const [value, neutralDisplay, backdropDisplay] of [['plain', '', 'none'], ['climate', 'none', 'none'], ['relief', '', '']]) {
      base.value = value; base.dispatchEvent(new window.Event('change', {bubbles: true})); await settled();
      assert.equal(neutral.style.display, neutralDisplay, value); assert.equal(backdrop.style.display, backdropDisplay, value);
      const url = new URL(window.location.href);
      assert.equal(url.searchParams.get('waterBase') ?? 'plain', value); assert.equal(url.searchParams.get('fallback'), '1');
      for (const [key, expected] of new URLSearchParams(source)) assert.equal(url.searchParams.get(key), expected, key);
    }
    const natural = new URL(document.querySelector('[data-mexico-nature-plain-return]').href);
    assert.equal(natural.searchParams.get('waterBase'), 'relief'); assert.equal(natural.searchParams.get('waterFeature'), 'contours:contours-1000-1');
    assert.equal(natural.searchParams.get('fallback'), '1'); assert.equal(natural.searchParams.has('compare'), false);
    for (const view of ['climate', 'relief']) {
      window.history.replaceState(null, '', `/nature/?view=${view}&fallback=1&item=III&${source}`);
      window.dispatchEvent(new window.PopStateEvent('popstate'));
      const display = view === 'relief' ? '' : 'none';
      assert.equal(neutral.style.display, display); assert.equal(backdrop.style.display, display);
      assert.equal(document.querySelector(`[data-mexico-nature-layer="${view}"]`).style.display, '');
      assert.equal(document.querySelector('[data-mexico-nature-vector]').style.display, '');
      assert.equal(document.querySelector('[data-mexico-nature-static]').style.display, 'none');
    }
  } finally {await window.happyDOM.close();}
});

test('The original climate-551 code/class conflict remains explicit only for that source polygon', async () => {
  assert.equal(sourceAnomaly.sourceCode, 'BS0hw'); assert.equal(sourceAnomaly.classId, '32');
  const window = fixture(`?view=climate&${source}`);
  let restored;
  try {
    const document = window.document;
    document.querySelector('[data-mexico-nature-class-label="32"]').dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
    const url = new URL(window.location.href);
    assert.equal(url.searchParams.get('feature'), sourceAnomaly.id); assert.equal(url.searchParams.get('item'), sourceAnomaly.classId);
    assert.equal(document.querySelector('path[data-mexico-nature-feature="climate-551"]').dataset.natureSourceCode, sourceAnomaly.sourceCode);
    assert.match(document.querySelector('[data-mexico-nature-feature-title]').textContent, /BS0hw/);
    const body = document.querySelector('[data-mexico-nature-feature-body]');
    assert.ok(body.textContent.includes(sourceAnomaly.sourceLabel)); assert.ok(body.textContent.includes(sourceAnomalyClass.labelSource));
    assert.match(body.textContent, /分類32.*不整合.*両属性を保持.*付け替えはしていません/);
    assert.equal(url.searchParams.get('sourceState'), '10'); assert.equal(url.searchParams.get('sourceMetric'), 'pine');
    restored = fixture(window.location.search);
    assert.match(restored.document.querySelector('[data-mexico-nature-feature-body]').textContent, /不整合/);
    const picker = document.querySelector('[data-mexico-nature-item-select]');
    picker.value = '32'; picker.dispatchEvent(new window.Event('change', {bubbles: true}));
    assert.equal(new URL(window.location.href).searchParams.has('feature'), false);
    assert.doesNotMatch(body.textContent, /不整合/);
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.match(body.textContent, /不整合/); assert.equal((body.textContent.match(/不整合/g) ?? []).length, 1);
  } finally {await window.happyDOM.close(); await restored?.happyDOM.close();}
});

test('Keyboard labels activate the reading after their native URL push and permit a same-entry workspace update', async () => {
  for (const [view, item, key] of [['climate', '59', 'Enter'], ['relief', 'III', ' ']]) {
    const window = fixture(`?view=${view}&reading=overview&${source}`);
    try {
      const root = window.document.querySelector('[data-mexico-workspace]'), initialLength = window.history.length;
      root.dataset.mexicoReadingSelected = 'false';
      let events = 0;
      root.addEventListener('mexico-reading-mode', event => {
        events++;
        assert.equal(event.detail.selected, true); assert.equal(event.bubbles, true);
        assert.equal(new URL(window.location.href).searchParams.get('item'), item, 'Native item selection is saved before the reading event');
        assert.equal(window.history.length, initialLength + 1, 'The event follows exactly one native history push');
        root.dataset.mexicoReadingSelected = String(event.detail.selected);
        const next = new URL(window.location.href); next.searchParams.set('reading', 'item');
        window.history.replaceState(window.history.state, '', next);
      });
      root.querySelector(`[data-mexico-nature-class-label="${item}"]`).dispatchEvent(new window.KeyboardEvent('keydown', {key, bubbles: true}));
      assert.equal(events, 1); assert.equal(root.dataset.mexicoReadingSelected, 'true');
      assert.equal(new URL(window.location.href).searchParams.get('reading'), 'item');
      assert.equal(window.history.length, initialLength + 1, 'Reading activation replaces the current entry');
    } finally {await window.happyDOM.close();}
  }
});
