import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

const route = 'dist/atlas/north-america/mexico/nature/index.html';
const normals = JSON.parse(await readFile('src/data/atlas/mexico/climate-normals.json', 'utf8'));
const workspace = await readFile('src/components/atlas/MexicoWorkspace.astro', 'utf8');
const adapter = workspace.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const initialIntent = workspace.match(/<script is:inline>\s*([\s\S]*?)<\/script>/)[1]
  .replace('document.currentScript?.parentElement', "document.querySelector('[data-mexico-workspace]')");
const modules = { name: 'mexico-nature-climate-local-modules', setup(builder) {
  builder.onResolve({ filter: /^\./ }, args => {
    const resolved = path.resolve(args.resolveDir, args.path);
    return { path: path.extname(resolved) ? resolved : ['.ts', '.mjs', '.json', '.js'].map(ext => resolved + ext).find(existsSync) };
  });
  builder.onLoad({ filter: /\.(ts|mjs|json)$/ }, async args => ({
    contents: await readFile(args.path, 'utf8'), loader: args.path.endsWith('.json') ? 'json' : args.path.endsWith('.ts') ? 'ts' : 'js', resolveDir: path.dirname(args.path),
  }));
} };
const imports = `import {initMexicoNature} from './src/scripts/atlas-mexico-nature.ts';
import {initMexicoClimate} from './src/scripts/atlas-mexico-climate.ts';
const initializeNative=()=>{const root=document.querySelector('[data-mexico-workspace]');initMexicoNature(root);initMexicoClimate(root);};`;
const codes = {};
for (const nativeFirst of [false, true]) {
  const result = await build({ stdin: {
    contents: `${imports}\n${initialIntent}\n${nativeFirst ? 'initializeNative();' : ''}\n${adapter}\n${nativeFirst ? '' : 'initializeNative();'}`,
    resolveDir: process.cwd(), sourcefile: 'mexico-nature-climate-entry.ts', loader: 'ts',
  }, absWorkingDir: process.cwd(), tsconfigRaw: {}, plugins: [modules], bundle: true, format: 'iife', platform: 'browser', write: false });
  codes[String(nativeFirst)] = result.outputFiles[0].text;
}

async function page(search = '', nativeFirst = false, initialize = true) {
  const window = new Window({ url: `https://example.com/insight-journal/atlas/north-america/mexico/nature/${search}`, settings: {
    disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true,
  } });
  window.document.write((await readFile(route, 'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g, ''));
  if (initialize) {
    window.eval(codes[String(nativeFirst)]);
    await window.happyDOM.waitUntilComplete();
  }
  return window;
}
const root = window => window.document.querySelector('[data-mexico-workspace]');
const query = window => new URL(window.location.href).searchParams;
const visiblePlots = window => [...root(window).querySelectorAll('[data-mexico-climate-plot]')].filter(plot => !plot.hidden).map(plot => plot.dataset.mexicoClimatePlot);
const selectedCity = window => [...root(window).querySelectorAll('[data-mexico-climate-city][aria-pressed="true"]')].map(point => point.dataset.mexicoClimateCity);
const pressedCity = (window, id) => {
  assert.deepEqual(visiblePlots(window), [id]);
  assert.deepEqual(selectedCity(window), [id, id], 'The map point and station picker share selection');
  assert.equal(root(window).querySelector('[data-mexico-climate-notice]').hidden, true);
};
function readingMode(window, selected) {
  assert.equal(root(window).dataset.mexicoReadingSelected, String(selected));
  assert.equal(query(window).get('reading'), selected ? 'item' : 'overview');
  assert.equal(root(window).querySelector('[data-mexico-country-overview]').hidden, selected);
  assert.equal(root(window).querySelector('[data-mexico-overview-button]').hidden, !selected);
}
const contextKeys = ['view', 'state', 'compare', 'from', 'sourceState', 'sourceMetric', 'sourceOnly', 'sourceFallback', 'sourceCrops', 'sourceLivestock', 'sourceOnlyItem', 'only', 'fallback', 'frame'];
const context = window => Object.fromEntries(contextKeys.map(key => [key, query(window).get(key)]));
const comparisonSearch = '?view=climate&state=25&compare=irrigation&from=agriculture&sourceState=25&sourceMetric=maize&sourceOnly=1&sourceFallback=1&sourceCrops=0&sourceLivestock=1&sourceOnlyItem=1&only=1&fallback=1&frame=120,40,600,400&reading=overview&city=mexico-city-tacubaya';
const sourceReturn = window => root(window).querySelector('[data-mexico-nature-source-return]').href;
const camera = window => root(window).querySelector('[data-mexico-nature-main-map]').getAttribute('viewBox');
const activate = async (window, element, key = null) => {
  assert.ok(element, 'The real delivered control exists');
  if (key === null) element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 }));
  else element.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
  await window.happyDOM.waitUntilComplete();
};

test('Built SSR includes both SMN plots, twelve source values each, and the default capital graph', async () => {
  const window = await page('', false, false);
  try {
    const plots = [...root(window).querySelectorAll('[data-mexico-climate-plot]')];
    assert.deepEqual(plots.map(plot => plot.dataset.mexicoClimatePlot), normals.stations.map(station => station.id));
    pressedCity(window, 'mexico-city-tacubaya');
    for (let parent = plots.find(plot => plot.dataset.mexicoClimatePlot === 'mexico-city-tacubaya'); parent !== root(window); parent = parent.parentElement) {
      assert.ok(parent && !parent.hidden, 'The default capital graph has no hidden ancestor in the reading panel');
    }
    for (const station of normals.stations) {
      const plot = plots.find(plot => plot.dataset.mexicoClimatePlot === station.id);
      const svg = plot.querySelector('svg[role="img"]');
      assert.ok(svg);
      assert.ok(svg.getAttribute('aria-label').includes(station.name));
      assert.match(svg.getAttribute('aria-label'), /1991[–-]2020/);
      assert.deepEqual([...svg.querySelectorAll('.atlas-climate-month')].map(label => Number(label.textContent)), normals.months);
      const rows = [...plot.querySelectorAll('tbody tr')];
      assert.equal(rows.length, 12);
      rows.forEach((row, index) => {
        const values = [...row.children].map(cell => cell.textContent.trim());
        assert.deepEqual(values, [String(index + 1), String(station.temperatureC[index]), String(station.precipitationMm[index]), `${station.temperatureYears[index]} / ${station.precipitationYears[index]}`]);
      });
      assert.ok(plot.textContent.includes(station.stationId));
      assert.ok(plot.textContent.includes(station.stationName));
      assert.ok(plot.textContent.includes(station.scopeNoteJa));
      assert.equal(plot.querySelector('a[href*="nor9120_"]').href, station.sourceUrl);

      // Recover values from the displayed axes, rather than duplicating chart
      // layout constants or its scale functions.
      const grid = [...svg.querySelectorAll('.atlas-climate-grid text')];
      const gridY = value => Number(grid.find(label => Number(label.textContent) === value).previousElementSibling.getAttribute('y1'));
      const bars = [...svg.querySelectorAll('.atlas-climate-bar')];
      const dots = [...svg.querySelectorAll('.atlas-climate-dot')];
      assert.equal(bars.length, 12); assert.equal(dots.length, 12);
      const temperatureLabels = [...svg.querySelectorAll('.atlas-climate-temp-label')];
      const labelY = value => Number(temperatureLabels.find(label => Number(label.textContent) === value).getAttribute('y'));
      bars.forEach((bar, index) => {
        const height = Number(bar.getAttribute('height')), y = Number(bar.getAttribute('y'));
        assert.ok(Number.isFinite(height) && height >= 0 && Number.isFinite(y));
        assert.ok(Math.abs(height + y - gridY(0)) < 0.001, 'Rain bars start at the displayed zero baseline');
        assert.ok(Math.abs(height * 100 / (gridY(0) - gridY(100)) - station.precipitationMm[index]) < 0.01);
      });
      dots.forEach((dot, index) => {
        // The lowest temperature tick aligns with the rainfall zero baseline.
        // Differences between tick positions remove their text-baseline offset.
        const minimumTick = Math.min(...temperatureLabels.map(label => Number(label.textContent)));
        const y0 = gridY(0) - (labelY(minimumTick) - labelY(0)), span = labelY(0) - labelY(20);
        const recovered = (y0 - Number(dot.getAttribute('cy'))) * 20 / span;
        assert.ok(Math.abs(recovered - station.temperatureC[index]) < 0.01);
        assert.ok(Math.abs(Number(dot.getAttribute('cx')) - Number(bars[index].getAttribute('x')) - Number(bars[index].getAttribute('width')) / 2) < 0.001);
      });
      assert.equal(svg.querySelectorAll('.atlas-climate-line').length, 1);
    }
  } finally { await window.happyDOM.close(); }
});

test('Built nature page loads CSS rules for rainfall bars, temperature lines and station points', async () => {
  const window = await page('', false, false);
  try {
    const css = (await Promise.all([...window.document.querySelectorAll('link[rel="stylesheet"]')].map(async link => {
      const asset = new URL(link.href).pathname.replace(/^\/insight-journal\//, '/').replace(/^\//, '');
      return readFile(path.join('dist', asset), 'utf8');
    }))).join('\n');
    for (const selector of ['atlas-climate-bar', 'atlas-climate-line', 'atlas-climate-dot']) assert.ok(css.includes(`.${selector}`), `Delivered styles include ${selector}`);
    assert.match(css, /\.atlas-climate-bar[^{}]*\{[^}]*fill:/);
    assert.match(css, /\.atlas-climate-line[^{}]*\{[^}]*stroke:/);
    assert.ok(css.includes('.mexico-climate-stations'));
  } finally { await window.happyDOM.close(); }
});

for (const nativeFirst of [false, true]) {
  test(`City map click and keyboard picker keep comparison/return/camera and need one Back (${nativeFirst ? 'native' : 'adapter'} first)`, async () => {
    const window = await page(comparisonSearch, nativeFirst);
    try {
      readingMode(window, false); pressedCity(window, 'mexico-city-tacubaya');
      const originalContext = context(window), originalReturn = sourceReturn(window), originalCamera = camera(window), initialLength = window.history.length;
      const point = root(window).querySelector('svg [data-mexico-climate-city="culiacan-dge"]');
      await activate(window, point);
      pressedCity(window, 'culiacan-dge'); readingMode(window, true);
      assert.deepEqual(context(window), originalContext);
      assert.equal(sourceReturn(window), originalReturn);
      assert.equal(camera(window), originalCamera);
      assert.equal(window.history.length, initialLength + 1);
      window.history.back(); await window.happyDOM.waitUntilComplete();
      pressedCity(window, 'mexico-city-tacubaya'); readingMode(window, false);
      assert.deepEqual(context(window), originalContext); assert.equal(camera(window), originalCamera);
      window.history.forward(); await window.happyDOM.waitUntilComplete();
      pressedCity(window, 'culiacan-dge'); readingMode(window, true);
      await activate(window, root(window).querySelector('svg [data-mexico-climate-city="mexico-city-tacubaya"]'), 'Enter');
      pressedCity(window, 'mexico-city-tacubaya'); readingMode(window, true);
      await activate(window, root(window).querySelector('svg [data-mexico-climate-city="culiacan-dge"]'), ' ');
      pressedCity(window, 'culiacan-dge'); assert.deepEqual(context(window), originalContext);
      await activate(window, root(window).querySelector('button[data-mexico-climate-city="mexico-city-tacubaya"]'));
      pressedCity(window, 'mexico-city-tacubaya'); assert.equal(sourceReturn(window), originalReturn);
      await activate(window, root(window).querySelector('[data-mexico-overview-button]'));
      readingMode(window, false); pressedCity(window, 'mexico-city-tacubaya');
      assert.deepEqual(context(window), originalContext);
      window.history.back(); await window.happyDOM.waitUntilComplete();
      readingMode(window, true); pressedCity(window, 'mexico-city-tacubaya');
    } finally { await window.happyDOM.close(); }
  });
}

test('Unknown city remains explicit and empty through native selections, then Back restores its notice', async () => {
  const window = await page(comparisonSearch.replace('city=mexico-city-tacubaya', 'city=not-a-record'), true);
  try {
    assert.equal(query(window).get('city'), 'not-a-record');
    assert.deepEqual(visiblePlots(window), []); assert.deepEqual(selectedCity(window), []);
    const notice = root(window).querySelector('[data-mexico-climate-notice]');
    assert.equal(notice.hidden, false); assert.ok(notice.textContent.trim().length > 15);
    const initialContext = context(window), originalReturn = sourceReturn(window);
    const select = root(window).querySelector('[data-mexico-nature-item-select]');
    select.value = '31'; select.dispatchEvent(new window.Event('change', { bubbles: true }));
    await window.happyDOM.waitUntilComplete();
    assert.equal(query(window).get('item'), '31'); assert.equal(query(window).get('city'), 'not-a-record');
    assert.deepEqual(visiblePlots(window), []); assert.equal(notice.hidden, false);
    await activate(window, root(window).querySelector('button[data-mexico-climate-city="culiacan-dge"]'));
    pressedCity(window, 'culiacan-dge');
    assert.equal(query(window).get('item'), '31'); assert.deepEqual(context(window), initialContext);
    assert.equal(sourceReturn(window), originalReturn);
    window.history.back(); await window.happyDOM.waitUntilComplete();
    assert.equal(query(window).get('city'), 'not-a-record'); assert.deepEqual(visiblePlots(window), []);
    assert.deepEqual(selectedCity(window), []); assert.equal(notice.hidden, false);
    assert.equal(query(window).get('item'), '31');
  } finally { await window.happyDOM.close(); }
});

test('Native map code, dropdown and terrain label selections retain their own namespace and selected city', async () => {
  const window = await page(comparisonSearch, false);
  try {
    const main = root(window).querySelector('[data-mexico-nature-main-map]');
    const climateLabels = [...main.querySelectorAll('[data-mexico-nature-layer="climate"] [data-mexico-nature-class-label]')];
    const reliefLabels = [...main.querySelectorAll('[data-mexico-nature-layer="relief"] [data-mexico-nature-class-label]')];
    assert.equal(climateLabels.length, 21); assert.equal(reliefLabels.length, 15);
    const select = root(window).querySelector('[data-mexico-nature-item-select]');
    assert.equal(select.options.length, 22);
    const label = climateLabels.find(label => label.dataset.mexicoNatureClassLabel === '31');
    assert.ok(label.dataset.mexicoNatureLabelFeature);
    assert.ok(label.dataset.mexicoNatureLabelCode);
    const feature = main.querySelector(`[data-mexico-nature-feature="${label.dataset.mexicoNatureLabelFeature}"]`);
    assert.equal(feature.dataset.natureSourceCode, label.dataset.mexicoNatureLabelCode);
    const originalContext = context(window), originalReturn = sourceReturn(window), initialLength = window.history.length;
    await activate(window, label, 'Enter');
    readingMode(window, true); pressedCity(window, 'mexico-city-tacubaya');
    assert.equal(query(window).get('item'), '31');
    assert.equal(query(window).get('feature'), label.dataset.mexicoNatureLabelFeature);
    assert.equal(select.value, '31'); assert.equal(label.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(context(window), originalContext); assert.equal(sourceReturn(window), originalReturn);
    assert.equal(window.history.length, initialLength + 1);
    window.history.back(); await window.happyDOM.waitUntilComplete();
    readingMode(window, false); assert.equal(select.value, ''); pressedCity(window, 'mexico-city-tacubaya');
    select.value = '70'; select.dispatchEvent(new window.Event('change', { bubbles: true }));
    await window.happyDOM.waitUntilComplete();
    readingMode(window, true); assert.equal(query(window).get('item'), '70'); assert.equal(query(window).get('feature'), null);
    await activate(window, root(window).querySelector('[data-mexico-nature-view="relief"]'));
    assert.equal(select.options.length, 17, 'Fifteen valid terrain regions and explicit missingness remain selectable');
    await activate(window, reliefLabels.find(label => label.dataset.mexicoNatureClassLabel === 'III'), ' ');
    assert.equal(query(window).get('item'), 'III'); assert.equal(select.value, 'III');
    assert.equal(query(window).get('city'), 'mexico-city-tacubaya'); pressedCity(window, 'mexico-city-tacubaya');
    assert.equal(query(window).get('compare'), 'irrigation'); assert.equal(sourceReturn(window), originalReturn);
  } finally { await window.happyDOM.close(); }
});
