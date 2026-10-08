import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

const entry = path.resolve('src/lib/atlas-europe-explorer.ts');
const bundle = await build({
  stdin: { contents: "import { initEuropeAtlas } from './atlas-europe-explorer.ts'; initEuropeAtlas();", resolveDir: path.dirname(entry), sourcefile: path.join(path.dirname(entry), 'farming-water-test-entry.ts'), loader: 'ts' },
  tsconfigRaw: { compilerOptions: {} }, bundle: true, write: false, format: 'iife', platform: 'browser',
  plugins: [{ name: 'explicit-europe-imports', setup(builder) {
    builder.onResolve({ filter: /.*/ }, async args => {
      if (args.path.includes('maplibre-gl-worker.mjs?worker&url')) return { path: 'unused-worker', namespace: 'test-worker' };
      if (args.path.startsWith('maplibre-gl')) return { path: args.path, external: true };
      if (!args.path.startsWith('.')) throw Error('Expected a local Europe import: ' + args.path);
      const absolute = path.resolve(args.resolveDir, args.path);
      for (const candidate of [absolute, absolute + '.ts', absolute + '.json', absolute + '.mjs', absolute + '.js']) {
        try { await access(candidate); return { path: candidate, namespace: 'test-source' }; } catch {}
      }
      throw Error('Missing local Europe import: ' + args.path);
    });
    builder.onLoad({ filter: /.*/, namespace: 'test-source' }, async args => ({ contents: await readFile(args.path, 'utf8'), loader: args.path.endsWith('.json') ? 'json' : 'ts', resolveDir: path.dirname(args.path) }));
    builder.onLoad({ filter: /.*/, namespace: 'test-worker' }, () => ({ contents: 'export default "/test-unused-worker.js";', loader: 'js' }));
  } }],
});
const html = new Map(await Promise.all(['agriculture', 'nature', 'population', 'industry'].map(async field => [field, (await readFile(`dist/atlas/europe/${field}/index.html`, 'utf8')).replace(/<script(?![^>]*type=["']application\/json["'])[^>]*>[\s\S]*?<\/script>/g, '')])));
async function until(check, message = 'Europe farming/water controller did not settle') {
  for (let i = 0; i < 300; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  throw Error(message);
}
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function setup(url = 'https://example.com/insight-journal/atlas/europe/agriculture/?layer=crops&render=static', fixture = {}) {
  const address = new URL(url), field = address.pathname.split('/').filter(Boolean).at(-1);
  const w = new Window({ url: address.href, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  w.happyDOM.setWindowSize({ width: 1366, height: 900 });
  w.document.write(html.get(field));
  const q = selector => w.document.querySelector(selector), root = q('[data-europe-detail]');
  const config = JSON.parse(q('[data-eu-config]').textContent);
  assert.ok(q('[data-eu-farm-numbers]'), 'The built HTML must include the current statistics component');
  assert.ok(q('[data-eu-farming-comparison-focus]'), 'The built HTML must include the comparison focus');
  const stage = q('.eu-map-stage'), svg = q('[data-eu-static]');
  for (const node of [stage, svg]) {
    Object.defineProperty(node, 'clientWidth', { value: 1200 }); Object.defineProperty(node, 'clientHeight', { value: 1001 });
    node.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 1001, width: 1200, height: 1001 });
  }
  const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } };
  svg.getScreenCTM = () => identity;
  w.DOMPoint = class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } matrixTransform(m) { return new this.constructor(m.a*this.x+m.c*this.y+m.e, m.b*this.x+m.d*this.y+m.f); } };
  w.ResizeObserver = class { observe() {} disconnect() {} };
  w.ImageData = class { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; } };
  w.Response = Response; w.Blob = Blob; w.DecompressionStream = DecompressionStream; w.TextDecoder = TextDecoder;
  const requests = [], draws = [], warnings = [];
  w.console.warn = (...args) => warnings.push(args.map(String).join(' '));
  w.HTMLCanvasElement.prototype.getContext = function() { return { putImageData: image => draws.push(image) }; };
  w.HTMLCanvasElement.prototype.toDataURL = function() { return 'data:image/png;base64,' + Buffer.from('outline-'+draws.length).toString('base64'); };
  w.fetch = async input => {
    const asset = new URL(String(input), w.location.href).pathname.replace(/^\/insight-journal\//, '/'); requests.push(asset);
    const injected = fixture.fetch?.(asset, requests.filter(item => item === asset).length);
    return injected === undefined ? new Response(await readFile('public' + asset)) : injected;
  };
  const select = (selector, value) => { q(selector).value = value; q(selector).dispatchEvent(new w.Event('change', { bubbles: true })); };
  const restore = value => { w.history.replaceState({}, '', value); w.dispatchEvent(new w.PopStateEvent('popstate')); };
  w.eval(bundle.outputFiles[0].text);
  await until(() => root.dataset.initialized === 'true'); await tick();
  return { w, q, root, config, requests, draws, warnings, select, restore, close: () => w.happyDOM.close() };
}
const route = (field, query) => `https://example.com/insight-journal/atlas/europe/${field}/?${query}`;
const statisticsReady = app => until(() => !app.q('[data-eu-farm-country-table]').hidden);
const current = app => new URL(app.w.location.href).searchParams;

test('built field pages expose the statistics/focus contract with unique IDs and clean canonical/OG head URLs', async () => {
  for (const [field, source] of html) {
    const w = new Window({ settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
    try {
      w.document.write(source);
      const q = selector => w.document.querySelector(selector);
      const canonical = q('link[rel="canonical"]').href;
      assert.equal(new URL(canonical).pathname, `/insight-journal/atlas/europe/${field}/`);
      assert.equal(new URL(canonical).search, '');
      assert.equal(q('meta[property="og:url"]').content, canonical);
      assert.equal(q('meta[property="og:title"]').content, w.document.title);
      assert.equal(q('meta[name="robots"]'), null);
      assert.equal(q('[data-eu-farming-statistics]').hidden, field !== 'agriculture');
      assert.equal(q('[data-eu-farm-numbers]').dataset.statisticsUrl, '/insight-journal/assets/atlas/europe/farming-statistics-v1/statistics.json.gz');
      assert.equal(w.document.querySelectorAll('[data-eu-farm-compare]').length, 2);
      assert.equal(q('[data-eu-farm-year]').options.length, 10);
      assert.equal(q('[data-eu-farm-year]').value, '2024');
      const ids = [...w.document.querySelectorAll('[id]')].map(node => node.id);
      assert.equal(ids.length, new Set(ids).size);
      assert.equal(q('[data-eu-farm-quick-summary]').hidden, true);
      assert.equal(q('[data-eu-farming-comparison-focus]').hidden, true);
      assert.equal(q('[data-eu-farming-focus-marker]').hidden, true);
    } finally { await w.happyDOM.close(); }
  }
});

test('selected commodity statistics keep one subject and one country through URL and reload', async () => {
  const app = await setup();
  try {
    assert.equal(app.requests.some(url => url.includes('farming-statistics-v1')), false, 'The overview must not eagerly fetch national statistics');
    assert.equal(app.q('[data-eu-verified-overview]').hidden,false);
    app.q('[data-eu-layer="wheat"]').click(); await statisticsReady(app);
    assert.equal(current(app).get('layer'), 'wheat');
    assert.equal(app.q('[data-eu-verified-overview]').hidden,true);
    const wheat=app.q('[data-eu-verified-topic="wheat"]');
    assert.equal(wheat.hidden,false);
    assert.match(wheat.textContent,/33\.7%.*小麦・メスリンの域外輸出先/s);
    assert.doesNotMatch(wheat.textContent,/大豆の域外輸入相手|食品群の供給熱量構成/);
    assert.equal(app.q('[data-eu-topic-country-control]').hidden,false);
    app.select('[data-eu-topic-country]','RUS'); await statisticsReady(app);
    assert.equal(current(app).get('place'), 'RUS');
    assert.equal(app.q('[data-eu-shape="RUS"]').classList.contains('is-selected'), true);
    assert.equal(app.q('[data-eu-farm-numbers]').hidden,false);
    assert.equal(app.q('[data-eu-farm-stat-summary]').children.length,1);
    assert.equal(app.q('[data-eu-farm-share-chart]').querySelectorAll('svg').length,1);
    assert.match(app.q('[data-eu-farm-share-status]').textContent,/ロシア.*2024年.*%/);
    const reload = await setup(app.w.location.href);
    try {
      await statisticsReady(reload);
      assert.equal(reload.q('[data-eu-verified-topic="wheat"]').hidden,false);
      assert.equal(reload.q('[data-eu-topic-country]').value,'RUS');
      assert.equal(reload.q('[data-eu-farm-stat-summary]').children.length,1);
    } finally { await reload.close(); }
    app.restore(route('agriculture','layer=wheat&render=static&place=DEU&farmYear=2021&farmCompare=RUS,FRA'));
    await statisticsReady(app);
    assert.equal(app.q('[data-eu-farm-stat-summary]').children.length,1,'Legacy comparison URL cannot add another visible country');
    assert.match(app.q('[data-eu-farm-share-status]').textContent,/ドイツ.*2024年/,'Legacy year URL cannot change the fixed display year');
    app.q('[data-eu-layer="chicken"]').click(); await statisticsReady(app);
    const chicken=app.q('[data-eu-verified-topic="chicken"]');
    assert.equal(chicken.hidden,false);
    assert.doesNotMatch(chicken.textContent,/小麦・メスリン|大豆の域外輸入|33\.7%/);
    assert.equal(app.q('[data-eu-farm-measure]').value,'chicken-stocks');
    app.q('[data-eu-topic="crops"]').click(); await tick();
    assert.equal(app.q('[data-eu-verified-overview]').hidden,false);
    assert.equal(app.q('[data-eu-farm-numbers]').hidden,true);
    assert.equal(app.requests.filter(url => url.endsWith('/farming-statistics-v1/statistics.json.gz')).length, 1);
  } finally { await app.close(); }
});

test('all 16 farming selections and dairy reveal only figures matching the selected commodity',async()=>{
  const app=await setup();
  try{
    const matches={wheat:[1,1],potato:[1,0],maize:[1,0],soybean:[0,1]};
    const ids=app.config.farmingAreas.features.map(feature=>feature.properties.id).concat('dairy');
    for(const id of ids){
      app.q(`[data-eu-layer="${id}"]`).click();await tick();
      const visible=[...app.w.document.querySelectorAll('[data-eu-verified-topic]:not([hidden])')];
      assert.deepEqual(visible.map(panel=>panel.dataset.euVerifiedTopic),[id]);
      assert.equal(app.q('[data-eu-verified-overview]').hidden,true);
      assert.equal(visible[0].querySelectorAll('.eu-verified-share-row').length,matches[id]?.[0]??0,id);
      assert.equal(visible[0].querySelectorAll('.eu-verified-donut').length,matches[id]?.[1]??0,id);
      assert.equal(visible[0].querySelectorAll('.eu-verified-food-band').length,0,id);
      if(!matches[id])assert.match(visible[0].textContent,/別の品目の数値で代用しません/,id);
    }
    app.q('[data-eu-topic="crops"]').click();await tick();
    assert.equal(app.q('[data-eu-verified-overview]').hidden,false);
    assert.equal(app.w.document.querySelectorAll('[data-eu-verified-topic]:not([hidden])').length,0);
  }finally{await app.close();}
});

test('rice in Italy opens the actual Po rainfall, drainage and terrain cases and returns the complete original farming selection', async () => {
  const source = await setup(route('agriculture', 'layer=rice&render=static&place=ITA&region=south&city=rome&returnLayer=wheat&farmYear=2021&farmMeasure=rice-production&farmCompare=FRA,DEU&livestock=off'));
  try {
    await statisticsReady(source);
    const links = [...source.q('[data-eu-comparison-links]').querySelectorAll('a')];
    assert.deepEqual(links.map(a => a.dataset.euComparisonLink), ['rice-po-precipitation', 'rice-po-drainage', 'rice-po-terrain']);
    for (const link of links) {
      const target = await setup(link.href);
      try {
        assert.equal(target.q('[data-eu-comparison-context]').hidden, false);
        assert.equal(target.q('[data-eu-farming-comparison-focus]').hidden, false);
        assert.equal(target.root.classList.contains('has-eu-farming-focus'), true);
        assert.match(target.q('[data-eu-comparison-heading]').textContent, /米.*ポー平原/);
        assert.match(target.q('[data-eu-farming-focus-scope]').textContent, /米の分布/);
        assert.equal(target.q('[data-eu-farming-focus-marker]').hidden, false);
        assert.match(target.q('[data-eu-farming-focus-point-label]').textContent, /ポー平原.*比較参照点/);
        assert.ok(Number(target.q('[data-eu-static]').getAttribute('viewBox').split(' ')[2]) < 1200, 'The target fits the registered regional case');
        assert.ok(target.q('[data-eu-farming-focus-sources]').querySelector('a[href^="https:"]'));
        assert.ok(target.q('[data-eu-origin-legend]').textContent.includes('米'));
        assert.equal(target.q('[data-eu-comparison-overlay]').querySelectorAll('path').length, 1, 'The target carries the selected rice outline from the visible source');
        const back = new URL(target.q('[data-eu-comparison-return]').href);
        assert.equal(back.pathname, '/insight-journal/atlas/europe/agriculture/');
        for (const [key, value] of [['layer', 'rice'], ['render', 'static'], ['place', 'ITA'], ['region', 'south'], ['city', 'rome'], ['returnLayer', 'wheat'], ['farmYear', '2021'], ['farmMeasure', 'rice-production'], ['farmCompare', 'FRA,DEU'], ['livestock', 'off']]) assert.equal(back.searchParams.get(key), value, key);
        assert.equal(back.searchParams.has('crops'), false);
        assert.equal(back.searchParams.has('europeReturn'), false);
        assert.equal(back.searchParams.has('europeFocus'), false);
        if (link.dataset.euComparisonLink.endsWith('drainage')) {
          await until(() => target.draws.length > 0);
          assert.equal(current(target).get('basin'), '2040012730');
          assert.equal(target.q('[data-eu-drainage-choice]').value, '2040012730');
          assert.match(target.q('[data-eu-farming-focus-description]').textContent, /2040012730.*全流域や灌漑供給範囲ではなく.*水量を示しません/);
          assert.equal(target.q('[data-eu-farming-focus-value]').hidden, true);
          assert.equal(target.q('[data-eu-drainage-selection]').style.display, '');
        } else {
          await until(() => target.q('[data-eu-farming-focus-value]').textContent.includes('比較地点：'));
          assert.equal(target.q('[data-eu-farming-focus-value]').hidden, false);
          assert.match(target.q('[data-eu-farming-focus-value]').textContent, /格子中心/);
          if (link.dataset.euComparisonLink.endsWith('precipitation')) {
            assert.match(target.q('[data-eu-farming-focus-description]').textContent, /必要な時期に田へ届く水.*灌漑・取水条件/);
            assert.match(target.q('[data-eu-farming-focus-value]').textContent, /mm\/年.*1991–2020/);
          } else {
            assert.equal(current(target).get('feature'), 'alps');
            assert.match(target.q('[data-eu-farming-focus-description]').textContent, /アルプス南側のポー平原.*農地の傾斜/);
          }
        }
        assert.equal(target.requests.some(url => url.includes('farming-statistics-v1')), false, 'Nature comparisons do not request farming quantity data');
        const reloaded = await setup(target.w.location.href);
        try { assert.equal(reloaded.q('[data-eu-farming-comparison-focus]').hidden, false); assert.equal(reloaded.q('[data-eu-comparison-return]').href, back.href); } finally { await reloaded.close(); }
      } finally { await target.close(); }
    }
  } finally { await source.close(); }
});

test('Portugal rice uses its retained water section and livestock choices connect separate seasonal and population evidence', async () => {
  for (const [layer, place, expected] of [['rice', 'PRT', 'rice-portugal-drainage'], ['cattle', 'GBR', 'cattle-britain-climate'], ['pig', 'DEU', 'pig-german-density']]) {
    const source = await setup(route('agriculture', `layer=${layer}&place=${place}&render=static`));
    let target;
    try {
      await statisticsReady(source);
      const link = source.q(`[data-eu-comparison-link="${expected}"]`); assert.ok(link, expected);
      target = await setup(link.href);
      assert.equal(target.q('[data-eu-farming-comparison-focus]').hidden, false);
      assert.equal(current(target).get('europeFocus'), expected);
      if (layer === 'rice') {
        await until(() => target.draws.length > 0);
        assert.equal(current(target).get('basin'), '2040018470');
        assert.match(target.q('[data-eu-farming-focus-description]').textContent, /テージョ川.*全流域や灌漑供給範囲ではなく/);
      } else if (layer === 'cattle') {
        assert.equal(current(target).get('city'), 'london');
        assert.equal(target.q('[data-city-reading="london"]').hidden, false);
        assert.equal(target.q('[data-city-card="london"]').hidden, false);
        assert.match(target.q('[data-eu-farming-focus-description]').textContent, /ロンドン.*1観測所.*飼料の調達先/);
        assert.equal(target.q('[data-eu-farming-focus-value]').hidden, true);
      } else {
        await until(() => target.q('[data-eu-farming-focus-value]').textContent.includes('比較地点：'));
        assert.equal(target.w.location.pathname, '/insight-journal/atlas/europe/population/');
        assert.match(target.q('[data-eu-farming-focus-description]').textContent, /人口密度は需要量.*家畜密度は肉・卵の生産量/);
        assert.match(target.q('[data-eu-legend-title]').textContent, /2020/);
      }
    } finally { await source.close(); if (target) await target.close(); }
  }
});

test('disabled crop and livestock displays remain disabled in the comparison source and saved return choice', async () => {
  const source = await setup(route('agriculture', 'layer=rice&place=ITA&render=static&crops=off&livestock=off&farmYear=2018'));
  let target;
  try {
    await statisticsReady(source);
    target = await setup(source.q('[data-eu-comparison-link="rice-po-precipitation"]').href);
    await until(() => target.q('[data-eu-farming-focus-value]').textContent.includes('比較地点：'));
    assert.match(target.q('[data-eu-origin-legend]').textContent, /元の選択では対象の分布は非表示/);
    assert.equal(target.q('[data-eu-comparison-overlay]').querySelectorAll('path').length, 0);
    const back = new URL(target.q('[data-eu-comparison-return]').href);
    assert.equal(back.searchParams.get('crops'), 'off');
    assert.equal(back.searchParams.get('livestock'), 'off');
    assert.equal(back.searchParams.get('farmYear'), '2018');
    source.restore(back.href); await statisticsReady(source);
    for (const kind of ['crop', 'livestock']) assert.equal(source.q(`[data-eu-toggle="${kind}"]`).getAttribute('aria-pressed'), 'false');
    assert.equal(source.q('[data-eu-farm-year]').value, '2024','The visible country detail uses its fixed year even for a legacy return URL');
    assert.equal(source.q('[data-eu-farm-numbers]').hidden,false);
    assert.match(source.q('[data-eu-farm-stat-summary]').textContent,/2024年/);
  } finally { await source.close(); if (target) await target.close(); }
});

test('a late rainfall lookup cannot restore a dismissed regional focus after a native layer change', async () => {
  const source = await setup(route('agriculture', 'layer=rice&place=ITA&render=static'));
  const gate = defer(); let target;
  try {
    const url = source.q('[data-eu-comparison-link="rice-po-precipitation"]').href;
    target = await setup(url, { fetch: asset => asset.includes('precipitation') && asset.endsWith('.gz') ? gate.promise : undefined });
    const requested = target.requests.find(asset => asset.includes('precipitation') && asset.endsWith('.gz'));
    assert.ok(requested);
    assert.match(target.q('[data-eu-farming-focus-value]').textContent, /確認しています/);
    target.q('[data-eu-topic="terrain"]').click(); await tick();
    assert.equal(current(target).has('europeFocus'), false);
    assert.equal(target.q('[data-eu-farming-comparison-focus]').hidden, true);
    assert.equal(target.q('[data-eu-farming-focus-marker]').hidden, true);
    gate.resolve(new Response(await readFile('public' + requested))); await tick(); await tick();
    assert.equal(current(target).get('layer'), 'terrain');
    assert.equal(target.q('[data-eu-farming-comparison-focus]').hidden, true);
    assert.equal(target.q('[data-eu-farming-focus-marker]').hidden, true);
    assert.doesNotMatch(target.q('[data-eu-farming-focus-value]').textContent, /比較地点：/);
  } finally { gate.resolve(new Response('', { status: 503 })); await source.close(); if (target) await target.close(); }
});


test('the explicit farming statistics country preserves all distributions and camera, and the share chart clears on overview',async()=>{
  const app=await setup(route('agriculture','layer=wheat&render=static'));
  try{
    await statisticsReady(app);const full=app.q('[data-eu-static]').getAttribute('viewBox');
    app.select('select[data-eu-farm-country]','DEU');await statisticsReady(app);
    assert.equal(app.q('[data-eu-static]').getAttribute('viewBox'),full);
    assert.equal(app.q('[data-eu-shape="DEU"]').classList.contains('is-selected'),true);
    assert.equal(app.q('[data-eu-farm-share-chart]').querySelectorAll('svg').length,1);
    assert.match(app.q('[data-eu-farm-share-status]').textContent,/ドイツ.*2024年.*%/);
    const reload=await setup(app.w.location.href);
    try{await statisticsReady(reload);assert.equal(reload.q('[data-eu-static]').getAttribute('viewBox'),full);}finally{await reload.close();}
    app.select('select[data-eu-farm-country]','');await statisticsReady(app);
    assert.equal(current(app).has('place'),false);assert.equal(current(app).has('region'),false);
    assert.equal(app.q('[data-eu-farm-share-chart]').children.length,0);
    app.q('[data-eu-topic="crops"]').click();await tick();
    assert.equal(app.q('[data-eu-farm-share-chart]').children.length,0);
  }finally{await app.close();}
});
