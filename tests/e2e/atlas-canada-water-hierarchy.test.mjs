import {canadaLegacyFrame} from '../../src/lib/atlas-canada-map-presentation.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { transform } from '@astrojs/compiler-rs';
import { experimental_AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { bundleCanadaSource } from '../fixtures/bundle-canada-source.mjs';

const base = 'https://example.com/insight-journal/atlas/north-america/canada/nature/';
const sourceReturn = new URLSearchParams({ year: '2024', province: 'British Columbia', compare: 'Quebec', metric: 'wood', cover: 'taiga', zoom: '1' }).toString();
const waterConfig = JSON.parse(await readFile('src/data/atlas/canada/water-resources.json', 'utf8'));
const datasets = waterConfig.datasets ?? waterConfig.layers;
const aquifer = datasets.aquifers.areas[0].id;
const savedFrame = '180,380,100,64';
const native = await bundleCanadaSource('src/scripts/atlas-canada-nature.ts', { globalName: 'WaterHierarchy' });

// Render the current page and its real map components, rather than requiring a
// fresh dist during source checks. Only the unrelated content service, CSS and
// Vite worker/URL asset imports need standalone-server adapters.
async function renderSourcePage() {
  const entry = path.resolve('src/components/atlas/CanadaNaturePage.astro');
  const bundle = await build({
    stdin: { contents: "export {default} from './CanadaNaturePage.astro';", resolveDir: path.dirname(entry), sourcefile: entry + '.entry.ts', loader: 'ts' },
    tsconfigRaw: { compilerOptions: {} }, bundle: true, write: false, platform: 'node', format: 'esm',
    define: { 'import.meta.env': JSON.stringify({ BASE_URL: '/insight-journal/' }) },
    plugins: [{ name: 'standalone-canada-page', setup(builder) {
      builder.onResolve({ filter: /.*/ }, async args => {
        if (args.path === 'astro/runtime/server/index.js') return { path: import.meta.resolve(args.path), external: true };
        if (args.path === 'astro:content') return { path: 'content', namespace: 'water-content-stub' };
        if (args.path.endsWith('?worker&url')) return { path: 'worker', namespace: 'water-asset-stub' };
        if (args.path.endsWith('.css')) return { path: 'css', namespace: 'water-asset-stub' };
        assert.ok(args.path.startsWith('.'), `Unexpected source dependency: ${args.path}`);
        const [relative, query] = args.path.split('?'), absolute = path.resolve(args.resolveDir, relative);
        for (const candidate of [absolute, absolute + '.ts', absolute + '.json']) {
          try { await access(candidate); return { path: candidate, namespace: query === 'raw' ? 'water-raw' : query === 'url' ? 'water-url' : 'water-source' }; } catch {}
        }
        throw new Error(`Missing page dependency: ${args.path}`);
      });
      builder.onLoad({ filter: /.*/, namespace: 'water-content-stub' }, () => ({ contents: 'export async function getCollection(){return [];} export async function render(){return {};}', loader: 'js' }));
      builder.onLoad({ filter: /.*/, namespace: 'water-asset-stub' }, args => ({ contents: args.path === 'worker' ? 'export default "/worker.js";' : '', loader: 'js' }));
      builder.onLoad({ filter: /.*/, namespace: 'water-raw' }, async args => ({ contents: `export default ${JSON.stringify(await readFile(args.path, 'utf8'))};`, loader: 'js' }));
      builder.onLoad({ filter: /.*/, namespace: 'water-url' }, args => ({ contents: `export default ${JSON.stringify('/insight-journal/assets/fixture/' + path.basename(args.path))};`, loader: 'js' }));
      builder.onLoad({ filter: /.*/, namespace: 'water-source' }, async args => {
        const source = await readFile(args.path, 'utf8');
        if (args.path.endsWith('.astro')) {
          const compiled = transform(source, { filename: args.path });
          assert.ok(!compiled.diagnostics.some(item => item.severity === 'error'), args.path);
          const code = compiled.code.replace(', createMetadata as $$createMetadata', '');
          return { contents: 'const $$createMetadata = () => ({});\n' + code, loader: 'js', resolveDir: path.dirname(args.path) };
        }
        return { contents: source, loader: args.path.endsWith('.json') ? 'json' : 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  const component = (await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)).default;
  const container = await experimental_AstroContainer.create();
  return container.renderToString(component, { request: new Request(base) });
}
const html = await renderSourcePage();
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

async function page(topic = 'aquifers', extra = {}) {
  const initial = new URL(base);
  initial.search = new URLSearchParams({ city: 'vancouver', view: 'water', water: 'Fraser', only: '1', forestryReturn: sourceReturn, render: 'static', waterTopic: topic, ...extra });
  initial.hash = 'canada-nature-sources';
  const w = new Window({ url: initial.href, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  try {
    w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g, ''));
    const requests = [], pushes = [], events = [];
    w.fetch = async input => {
      const url = new URL(String(input), w.location.href);
      assert.equal(url.origin, 'https://example.com');
      assert.ok(url.pathname.startsWith('/insight-journal/assets/'), url.href);
      requests.push(url.pathname);
      const data = await readFile('public/' + url.pathname.replace('/insight-journal/', ''), 'utf8');
      return { ok: true, json: async () => JSON.parse(data) };
    };
    const pushState = w.history.pushState.bind(w.history);
    w.history.pushState = (...args) => { pushes.push(new URL(String(args[2]), w.location.href).href); return pushState(...args); };
    const root = w.document.querySelector('[data-canada-nature]');
    root.addEventListener('canada-water-update', event => events.push(JSON.parse(JSON.stringify(event.detail))));
    w.eval(native);
    w.WaterHierarchy.initCanadaNature(root);
    await tick();
    return { w, root, initial, requests, pushes, events, q: selector => root.querySelector(selector), async close() { await w.happyDOM.close(); } };
  } catch (error) { await w.happyDOM.close(); throw error; }
}

function assertHierarchy(p, topic) {
  const family = ['precipitation', 'drainage'].includes(topic) ? topic : 'surface';
  assert.deepEqual([...p.root.querySelectorAll('[data-canada-water-family][aria-pressed="true"]')].map(button => button.dataset.canadaWaterFamily), [family]);
  const subtopics = p.q('[data-canada-water-subtopics]');
  assert.equal(subtopics.hidden, family !== 'surface');
  assert.deepEqual([...subtopics.querySelectorAll('[aria-pressed="true"]')].map(button => button.dataset.canadaWaterTopic), family === 'surface' ? [topic] : []);
  assert.equal(p.q('[data-canada-water-resources]').hidden, topic === 'surface');
  assert.equal(p.q('[data-canada-original-map-column]').hidden, topic !== 'surface');
  assert.equal(p.q('[data-canada-original-reading]').hidden, topic !== 'surface');
  if (topic !== 'surface') assert.deepEqual([...p.root.querySelectorAll('[data-canada-water-resource-reading]:not([hidden])')].map(panel => panel.dataset.canadaWaterResourceReading), [topic]);
}

function assertSourceReturn(p) {
  const current = new URL(p.w.location.href);
  for (const key of ['city', 'water', 'only', 'forestryReturn', 'render']) assert.equal(current.searchParams.get(key), p.initial.searchParams.get(key), key);
  assert.equal(current.hash, p.initial.hash);
  const back = p.q('[data-canada-forestry-return]');
  assert.equal(back.hidden, false);
  assert.equal(new URL(back.href).pathname, '/insight-journal/atlas/north-america/canada/agriculture/forestry/');
  assert.deepEqual(Object.fromEntries(new URL(back.href).searchParams), Object.fromEntries(new URLSearchParams(sourceReturn)));
}

test('Canada page has three water families and keeps national groundwater and BC aquifers inside the river/groundwater family', async () => {
  for (const topic of ['surface', 'groundwater', 'aquifers']) {
    const p = await page(topic);
    try {
      const families = [...p.root.querySelectorAll('.country-water-topics > button')];
      assert.deepEqual(families.map(button => button.dataset.canadaWaterFamily), ['surface', 'precipitation', 'drainage']);
      assert.deepEqual(families.map(button => button.textContent.trim()), ['河川・地下水', '降水量', '河川の流域']);
      assert.equal(families.some(button => button.hasAttribute('data-canada-water-topic')), false);
      assert.deepEqual([...p.q('[data-canada-water-subtopics]').querySelectorAll('button')].map(button => button.dataset.canadaWaterTopic), ['surface', 'groundwater', 'aquifers']);
      assertHierarchy(p, topic);
      assertSourceReturn(p);
      assert.equal(p.pushes.length, 0, 'restoring a URL never adds a history entry');
    } finally { await p.close(); }
  }
});

test('Family changes add one history entry, preserve the source return, and Back restores a selected isolated BC aquifer', async () => {
  const p = await page('aquifers', { waterArea: aquifer, waterOnly: '1', waterFrame: savedFrame });
  try {
    assertHierarchy(p, 'aquifers');
    assert.equal(p.q('[data-canada-water-area]').value, aquifer);
    assert.equal(p.q('[data-canada-water-resource-only]').checked, true);
    const original = p.w.location.href;
    p.q('[data-canada-water-family="surface"]').click();
    p.q('[data-canada-water-subtopics] [data-canada-water-topic="aquifers"]').click();
    assert.equal(p.w.location.href, original, 'the active family and subtopic retain the aquifer and camera');
    assert.equal(p.pushes.length, 0);

    for (const topic of ['precipitation', 'drainage']) {
      const count = p.pushes.length;
      p.q(`[data-canada-water-family="${topic}"]`).click();
      assert.equal(p.pushes.length, count + 1, 'one family click produces one history entry');
      assertHierarchy(p, topic);
      assertSourceReturn(p);
      const params = new URL(p.w.location.href).searchParams;
      assert.equal(params.get('waterTopic'), topic);
      for (const key of ['waterArea', 'waterOnly', 'waterFrame']) assert.equal(params.has(key), false, key + ' is reset when changing family');
    }
    const count = p.pushes.length;
    p.w.history.back(); await tick();
    assertHierarchy(p, 'precipitation');
    p.w.history.back(); await tick();
    assert.equal(p.w.location.href, original);
    assertHierarchy(p, 'aquifers');
    assert.equal(p.q('[data-canada-water-area]').value, aquifer);
    assert.equal(p.q('[data-canada-water-resource-only]').checked, true);
    assert.equal(p.q('[data-canada-water-resource-map]').getAttribute('viewBox'), canadaLegacyFrame(savedFrame.split(',').map(Number)).join(' '));
    assertSourceReturn(p);
    assert.equal(p.pushes.length, count, 'Back restoration does not write another history entry');
    assert.equal(p.events.length, 0, 'family navigation does not duplicate resource update events');
  } finally { await p.close(); }
});

test('Groundwater has one scope switch beside the map and no duplicate upper buttons', async () => {
 const p=await page('groundwater');try{
  assert.equal(p.q('[data-canada-water-groundwater-modes]'),null);
  const scope=p.q('[data-canada-water-subtopics] [data-canada-water-topic="aquifers"]');scope.click();
  assert.equal(p.events.length,0);assert.equal(p.pushes.length,1);assertHierarchy(p,'aquifers');
  assert.equal(scope.getAttribute('aria-pressed'),'true');
  p.q('[data-canada-water-subtopics] [data-canada-water-topic="groundwater"]').click();assertHierarchy(p,'groundwater');assert.equal(p.pushes.length,2);
  p.q('[data-canada-water-family="precipitation"]').click();assertHierarchy(p,'precipitation');assertSourceReturn(p);
 }finally{await p.close();}
});
