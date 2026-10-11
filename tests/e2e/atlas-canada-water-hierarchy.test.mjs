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

test('Source page renders the complete official St. Lawrence outline in river and drainage contexts',async()=>{
 const p=await page('surface',{water:'St. Lawrence',only:'0'});
 try{
  const river=p.q('[data-canada-water-shape="St. Lawrence"]');assert.equal(river.dataset.canadaWaterSource,'nrcan-cgndb-st-lawrence');
  const path=river.getAttribute('d');assert.equal((path.match(/[ML]/g)??[]).length,3135);assert.equal((path.match(/Z/g)??[]).length,1);assert.doesNotMatch(path,/NaN|Infinity/);
  const drainage=[...p.root.querySelectorAll('.canada-basin-river')].find(node=>node.textContent==='セントローレンス川').getAttribute('d');
  const coordinates=path.match(/-?\d+(?:\.\d+)?/g).map(Number),contextCoordinates=drainage.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.equal(contextCoordinates.length,coordinates.length);assert.ok(contextCoordinates.every((value,i)=>Math.abs(value-coordinates[i])<.006),'River and drainage coordinates align within SVG rounding');
  assert.match(p.q('[data-canada-water-reading-text]').textContent,/上流から河口域/);
  assert.ok(p.q('a[href$="st-lawrence-manifest.json"]'),'Source acquisition record linked');
 }finally{await p.close();}
});

async function page(topic = 'surface', extra = {}) {
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
  assert.equal(subtopics,null,'Groundwater scope controls are removed');
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

test('Canada has river/lake, precipitation and drainage families; groundwater archive does not become a page layer', async () => {
  for (const topic of ['surface', 'precipitation', 'drainage']) {
    const p = await page(topic);
    try {
      const families=[...p.root.querySelectorAll('.country-water-topics > button')];
      assert.deepEqual(families.map(button=>button.dataset.canadaWaterFamily),['surface','precipitation','drainage']);
      assert.deepEqual(families.map(button=>button.textContent.trim()),['河川・湖','降水量','河川の流域']);
      assert.equal(p.root.querySelectorAll('[data-canada-water-topic="groundwater"],[data-canada-water-topic="aquifers"]').length,0);
      const published=JSON.parse(p.q('[data-canada-water-resource-config]').textContent);
      assert.deepEqual(Object.keys(published.datasets),['precipitation','drainage']);
      assert.equal(p.root.querySelectorAll('[data-canada-zoom],[data-canada-whole],[data-canada-reset],[data-canada-natural-zoom],[data-canada-natural-whole],[data-canada-water-full],[data-canada-water-whole],[data-canada-water-zoom],[data-canada-landform-whole],[data-canada-landform-zoom]').length,0);
      assertHierarchy(p,topic);assertSourceReturn(p);assert.equal(p.pushes.length,0);
    } finally { await p.close(); }
  }
});

test('Family selection, isolation, Back and reload preserve context and the saved drainage camera', async () => {
  const p=await page('drainage',{waterArea:'nelson',waterOnly:'1',waterFrame:savedFrame});
  try {
    assertHierarchy(p,'drainage');assert.equal(p.q('[data-canada-water-area]').value,'nelson');
    assert.equal(p.q('[data-canada-water-resource-only]').checked,true);
    const original=p.w.location.href;
    p.q('[data-canada-water-family="drainage"]').click();assert.equal(p.pushes.length,0);
    p.q('[data-canada-water-family="precipitation"]').click();assert.equal(p.pushes.length,1);assertHierarchy(p,'precipitation');assertSourceReturn(p);
    p.q('[data-canada-water-family="surface"]').click();assert.equal(p.pushes.length,2);assertHierarchy(p,'surface');
    p.w.history.back();await tick();assertHierarchy(p,'precipitation');
    p.w.history.back();await tick();assert.equal(p.w.location.href,original);assertHierarchy(p,'drainage');
    assert.equal(p.q('[data-canada-water-area]').value,'nelson');assert.equal(p.q('[data-canada-water-resource-only]').checked,true);
    assert.equal(p.q('[data-canada-water-resource-map]').getAttribute('viewBox'),canadaLegacyFrame(savedFrame.split(',').map(Number)).join(' '));
    assert.equal(p.pushes.length,2);assertSourceReturn(p);
    const reload=await page('drainage',{waterArea:'nelson',waterOnly:'1',waterFrame:savedFrame});
    try {assertHierarchy(reload,'drainage');assert.equal(reload.q('[data-canada-water-area]').value,'nelson');assert.equal(reload.q('[data-canada-water-resource-only]').checked,true);}finally{await reload.close();}
  }finally{await p.close();}
});

test('Legacy groundwater URLs fall back to surface without loading groundwater or aquifer assets',async()=>{
 for(const topic of ['groundwater','aquifers']){
  const p=await page(topic,{waterArea:aquifer,waterOnly:'1',waterFrame:savedFrame});
  try{assertHierarchy(p,'surface');assert.equal(p.requests.some(url=>/groundwater|aquifer/.test(url)),false);assert.equal(p.pushes.length,0);assertSourceReturn(p);}finally{await p.close();}
 }
});

test('Precipitation has no map dots and Saskatchewan is a subordinate unfilled boundary within Nelson',async()=>{
 const rain=await page('precipitation');
 try{assert.equal(rain.q('[data-canada-rain-map-labels]').querySelectorAll('circle').length,0);assert.equal(rain.q('.canada-water-references'),null);}finally{await rain.close();}
 const drainage=await page('drainage');
 try{
  for(let attempt=0;attempt<60&&!drainage.q('[data-canada-water-resource-shape="saskatchewan"]');attempt++)await new Promise(resolve=>setTimeout(resolve,10));
  const child=drainage.q('[data-canada-water-resource-shape="saskatchewan"]');
  assert.equal(child.dataset.canadaWaterParent,'nelson');assert.ok([...child.querySelectorAll('path')].every(path=>path.getAttribute('fill')==='none'));
  assert.equal(drainage.q('[data-canada-water-area] optgroup').label,'ネルソン川水系の支流域');
  const camera=drainage.q('[data-canada-water-resource-map]').getAttribute('viewBox');
  drainage.q('[data-canada-water-group="saskatchewan"]').click();
  assert.equal(child.classList.contains('is-selected'),true);assert.equal(drainage.q('[data-canada-water-resource-map]').getAttribute('viewBox'),camera);
  assert.equal(drainage.q('[data-canada-water-resource-shape="nelson"]').style.display,'');
 }finally{await drainage.close();}
});
