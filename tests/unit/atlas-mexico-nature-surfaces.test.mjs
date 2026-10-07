import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const quantitative = JSON.parse(fs.readFileSync('public/assets/atlas/mexico-quantitative-v1/manifest.json', 'utf8'));
const basins = JSON.parse(fs.readFileSync('public/assets/atlas/mexico-basin-review-v1/catalog.json', 'utf8'));
const contours=JSON.parse(fs.readFileSync('public/assets/atlas/mexico-water-v1/contours.geojson','utf8'));
const basinGeometries=new Map(basins.systems.map(system=>['/basins/'+system.basinGeojson,JSON.parse(fs.readFileSync('public/assets/atlas/mexico-basin-review-v1/'+system.basinGeojson,'utf8'))]));
const originalWater = JSON.parse(fs.readFileSync('public/assets/atlas/mexico-water-v1/manifest.json', 'utf8'));
const elevationPacked=fs.readFileSync('public/assets/atlas/mexico-water-v1/'+originalWater.layers.contours.bands.file);
const packedResponse=()=>({ok:true,body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array(elevationPacked));controller.close();}})});
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
        <div data-mexico-hydrology-body><p data-mexico-hydrology-value></p><p data-mexico-hydrology-definition></p><p data-mexico-hydrology-limitations></p><div data-mexico-hydrology-source></div><a data-mexico-hydrology-ledger href="/water/manifest.json">既存の河川・水資源資料の台帳</a></div>
      </section>
      <section data-mexico-nature-comparison><p data-mexico-nature-comparison-lead>比較元の説明</p><p data-mexico-nature-comparison-value>比較元の値</p><div class="mexico-nature-reading-body"></div></section>
    </aside><p data-mexico-hydrology-picker-note></p>
  </article>`);
  window.ResizeObserver = undefined;window.Response=Response;window.DecompressionStream=DecompressionStream;
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
    if(basinGeometries.has(path))return response(basinGeometries.get(path));
    if(path==='/water/'+originalWater.layers.contours.bands.file)return packedResponse();
    if(path==='/water/contours.geojson')return response(contours);
    if (path === '/water/manifest.json') return response({layers: {rivers: {...originalWater.layers.rivers, file: 'rivers.json'},contours:originalWater.layers.contours}});
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
  const waitImage = async file => {await waitFor(() => group().style.display !== 'none' && [...group().querySelectorAll('image')].some(node=>node.getAttribute('href')===file), `image ${file}`); return [...group().querySelectorAll('image')].find(node=>node.getAttribute('href')===file);};
  const loadImage = async file => {const node = await waitImage(file); node.dispatchEvent(new window.Event('load'));for(const other of group().querySelectorAll('image'))if(other!==node)other.dispatchEvent(new window.Event('load')); await waitFor(() => root.dataset.mexicoHydrologyReady === 'true'); return node;};
  const restore = url => {window.history.replaceState(null, '', url); state = {...state, category: new URL(window.location.href).searchParams.get('category') ?? ''}; controller.read(); controller.render();};
  const waitContours=async()=>{await waitFor(()=>root.dataset.mexicoPreparedCategory==='elevation'&&root.dataset.mexicoHydrologyReady==='true');return q('[data-mexico-hydrology-layer=contours]');};
  return {waitContours,window, root, requests, controller, q, group, image, transition, waitImage, loadImage, restore, setResponder: value => {responder = value;}, get commits() {return commits;}};
}
const precipitationImage = '/quant/' + quantitative.layers.precipitation.image.file;
const elevationImage = '/quant/' + quantitative.layers.elevation.image.file;

test('the source ledger follows numeric and basin categories immediately, including errors and switching back', async () => {
  const f = setup();
  const ledger = () => f.q('[data-mexico-hydrology-ledger]');
  try {
    f.setResponder(path => path === '/quant/manifest.json' ? {ok: false, status: 503} : undefined);
    f.controller.render();
    assert.equal(ledger().getAttribute('href'), '/quant/manifest.json');
    assert.match(ledger().textContent, /数値格子/);
    await waitFor(() => f.root.dataset.mexicoHydrologyReady === 'false');
    assert.equal(ledger().getAttribute('href'), '/quant/manifest.json');
    f.setResponder(null);
    f.transition('elevation');
    assert.equal(ledger().getAttribute('href'), '/water/elevation-bands.source.json');
    await f.waitContours();
    f.transition('basins');
    assert.equal(ledger().getAttribute('href'), '/basins/catalog.json');
    assert.match(ledger().textContent, /3代表水系/);
    await f.loadImage('/basins/' + basins.systems[0].domesticFill.file);
    f.transition('rivers-groundwater');
    assert.equal(ledger().getAttribute('href'), '/water/manifest.json');
    assert.match(ledger().textContent, /既存の河川・水資源/);
    await waitFor(() => f.root.dataset.mexicoHydrologyReady === 'true');
  } finally {await f.window.happyDOM.close();}
});

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
    assert.equal(f.q('[data-mexico-quantitative-legend]').parentElement, f.q('[data-mexico-water-reading-summary]'), 'The numerical scale precedes the detailed reading rather than falling below the map');
    const ticks = [...f.root.querySelectorAll('.mexico-quantitative-ticks span')];
    assert.deepEqual(ticks.map(node => node.textContent), ['0', '500', '1,000', '2,000', '3,000', '4,000']);
    assert.deepEqual(ticks.map(node => node.style.left), ['0%', '12.5%', '25%', '50%', '75%', '100%']);
    assert.deepEqual(ticks.map(node => node.dataset.row), ['upper', 'upper', 'upper', 'upper', 'upper', 'upper']);
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

test('elevation uses every retained 500m contour level with metre legend and no selectable state or line',async()=>{
 const f=setup();
 try{
  f.controller.render();await f.loadImage(precipitationImage);f.transition('elevation');
  const group=await f.waitContours();
  const paths=[...group.querySelectorAll('[data-elevation-m]')];
  assert.deepEqual(paths.map(node=>Number(node.dataset.elevationM)).sort((a,b)=>a-b),Array.from({length:11},(_,i)=>i*500));
  assert.equal(paths.reduce((sum,node)=>sum+Number(node.dataset.sourceMemberCount),0),contours.features.length);
  assert(paths.every(node=>node.getAttribute('role')==='img'&&node.getAttribute('tabindex')==='-1'));
  assert.match(f.q('[data-mexico-hydrology-legend]').textContent,/500m間隔.*1,000m間隔/);
  assert.match(f.q('[data-mexico-nature-period]').textContent,/ETOPO 2022.*60秒角.*EGM2008.*版年/);
  assert.equal(f.q('[data-mexico-hydrology-controls]').hidden,true);
  assert.equal(f.group().style.display,'none');
  assert.equal(f.q('[data-mexico-elevation-bands]').querySelectorAll('path').length,12);
  assert.match(f.q('[data-mexico-hydrology-legend]').textContent,/0 m未満.*0–500 m.*5,000 m以上/);
  assert.equal(f.q('[data-mexico-elevation-bands]').getAttribute('pointer-events'),'none');
  assert.equal(f.requests.includes('/water/contours.geojson'),true);
  assert.equal(f.requests.includes(elevationImage),false);
  const before=f.window.location.href;paths[0].dispatchEvent(new f.window.MouseEvent('click',{bubbles:true}));assert.equal(f.window.location.href,before);
  f.transition('');assert.equal(f.q('[data-mexico-hydrology-overlay]').style.display,'none');
 }finally{await f.window.happyDOM.close();}
});

test('the basin entry has exactly three domestic systems, preserves scope, and renders no unverified mainstem, arrow or mouth', async () => {
  const f = setup('?category=basins&view=climate');
  try {
    f.controller.render();const first=await f.waitImage('/basins/'+basins.systems[0].domesticFill.file);first.dispatchEvent(new f.window.Event('load'));assert.equal(f.root.dataset.mexicoHydrologyReady,'loading');
    const others=[...f.group().querySelectorAll('image')].filter(node=>node!==first);others[0].dispatchEvent(new f.window.Event('load'));assert.equal(f.root.dataset.mexicoHydrologyReady,'loading');others[1].dispatchEvent(new f.window.Event('load'));await waitFor(()=>f.root.dataset.mexicoHydrologyReady==='true');
    assert.equal(f.group().querySelectorAll('image.is-muted').length,0);
    assert.equal(f.q('[data-mexico-basin-systems]'),null);
    assert.equal(f.q('[data-mexico-basin-overview-reading]').querySelectorAll('section').length,3);
    assert.deepEqual([...f.root.querySelectorAll('path[data-mexico-basin-system]')].map(node=>node.dataset.mexicoBasinSystem),basins.systems.map(system=>system.id));
    assert.equal(f.q('[data-mexico-basin-foreground]').parentElement,f.q('[data-mexico-nature-main-map]'));
    assert.equal(f.q('[data-mexico-nature-main-map]').lastElementChild,f.q('[data-mexico-basin-foreground]'));
    assert.match(f.q('[data-mexico-nature-period]').textContent, /全国158.*全てを表すものではありません/);
    for (const system of basins.systems) {
      f.q(`path[data-mexico-basin-system="${system.id}"]`).dispatchEvent(new f.window.MouseEvent('click',{bubbles:true}));
      await f.loadImage('/basins/' + system.domesticFill.file);
      assert.equal(f.q('[data-mexico-hydrology-title]').textContent, system.nameJa);
      assert.equal(f.q('[data-mexico-hydrology-definition]').textContent, system.foreignScopeJa);
      assert.equal(f.q(`path[data-mexico-basin-system="${system.id}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(f.root.querySelectorAll('path[data-mexico-basin-system][aria-pressed="true"]').length, 1);
      assert.match(f.q('[data-mexico-hydrology-status]').textContent, /本流・流向・河口は原典確認待ち/);
      assert.match(f.q('[data-mexico-hydrology-source]').textContent, /国外の上流域は追加せず.*国土境界内/);
      assert.equal(f.group().querySelectorAll('image').length,3);assert.equal(f.root.querySelectorAll('[data-mexico-basin-label]').length,3);assert.equal(f.group().querySelectorAll('image.is-muted').length,2);
      assert.equal(f.group().querySelectorAll('path,line,polyline,marker,circle').length, 0);
    }
    const reset=f.q('[data-mexico-basin-overview]');reset.click();await waitFor(()=>!f.q('[data-mexico-basin-overview-reading]').hidden);
    const label=f.q('text[data-mexico-basin-system=bravo]');label.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await waitFor(()=>f.root.dataset.mexicoWaterFeature==='basins:bravo');
    assert.deepEqual(f.requests, ['/basins/catalog.json',...basins.systems.map(system=>'/basins/'+system.basinGeojson)]);
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
    f.transition('elevation'); const height = await f.waitContours();
    basinImage.dispatchEvent(new f.window.Event('error')); basinImage.dispatchEvent(new f.window.Event('load'));
    assert.equal(height.style.display,'');assert.equal(f.group().style.display,'none');assert.equal(f.root.dataset.mexicoHydrologyReady,'true');
    assert.equal(f.q('[data-mexico-hydrology-retry]').hidden, true);
    await f.waitContours();
    assert.match(f.q('[data-mexico-nature-map-title]').textContent,/標高/);
  } finally {delayedSurface.resolve(quantitative); delayedBasin.resolve(basins); await f.window.happyDOM.close();}
});

test('switching back and resizing cannot redraw hidden legacy layers over the numeric surface', async () => {
  const f = setup('?category=rivers-groundwater&view=relief&waterFeature=rivers:river-test-7');
  try {
    f.controller.render(); await waitFor(() => f.root.dataset.mexicoHydrologyReady === 'true');
    const legacy = f.q('[data-mexico-hydrology-layer="rivers"]'); assert.ok(legacy?.querySelector('path'));
    f.transition('precipitation'); const rain = await f.loadImage(precipitationImage);
    f.transition('elevation'); const height = await f.waitContours();
    Object.defineProperty(f.q('svg'), 'clientWidth', {value: 320, configurable: true});
    f.window.dispatchEvent(new f.window.Event('resize')); await pause(40);
    assert.equal(height.style.display,'');assert.equal(f.group().style.display,'none');assert.equal(legacy.style.display,'none');
    assert.equal(f.q('[data-mexico-hydrology-legend]').hidden,false);assert.equal(f.q('[data-mexico-quantitative-legend]').hidden,true);
    f.transition('precipitation'); await waitFor(() => f.root.dataset.mexicoPreparedCategory === 'precipitation' && f.root.dataset.mexicoHydrologyReady === 'true');
    assert.equal(f.image(), rain, 'loaded image cache is safely reused');
    assert.equal(f.q('[data-mexico-nature-period]').textContent, '1991–2020年平年値');
    assert.equal(f.root.querySelectorAll('[data-mexico-prepared-surface]').length, 1);
    assert.equal(f.requests.filter(path => path === '/quant/manifest.json').length, 1);
    assert.equal(f.requests.includes('/water/contours.geojson'),true);assert.equal(f.requests.some(path=>/precipitation\.geojson/.test(path)),false);
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
    const target = basins.systems[1]; f.q(`path[data-mexico-basin-system="${target.id}"]`).dispatchEvent(new f.window.MouseEvent('click',{bubbles:true}));
    await f.loadImage('/basins/' + target.domesticFill.file);
    restored = f.window.location.href;
    const selected = new URL(restored), before = new URL('https://example.test/nature/' + initial);
    for (const [key, value] of before.searchParams) assert.equal(selected.searchParams.get(key), value, `${key} preserved`);
    assert.equal(selected.searchParams.get('waterFeature'), `basins:${target.id}`); assert.equal(f.commits, 1);
    f.transition('elevation'); await f.waitContours();
    assert.equal(f.controller.url(new URL(f.window.location.href)).searchParams.get('waterFeature'), `basins:${target.id}`);
    f.restore(restored); await waitFor(() => f.root.dataset.mexicoPreparedCategory === 'basins' && f.root.dataset.mexicoHydrologyReady === 'true');
    assert.equal(f.q(`path[data-mexico-basin-system="${target.id}"]`).getAttribute('aria-pressed'), 'true');
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
