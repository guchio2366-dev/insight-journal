import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { Window } from 'happy-dom';

const root = new URL('../../', import.meta.url);
const asset = 'public/assets/atlas/europe/farming-statistics-v1/';
const compressed = readFileSync(new URL(asset + 'statistics.json.gz', root));
const inflated = gunzipSync(compressed);
const statistics = JSON.parse(inflated);
const countries = JSON.parse(readFileSync(new URL('src/data/atlas/europe/countries.json', root), 'utf8'));
const entry = fileURLToPath(new URL('src/scripts/atlas-europe-farming-statistics.ts', root));
// Execute the production controller. Explicit file reads avoid esbuild's package
// directory walk in the Windows sandbox; the data module is bundled unchanged.
const bundle = await build({ tsconfigRaw: {}, entryPoints: ['controller-under-test'], bundle: true, write: false, format: 'iife', globalName: 'FarmingStatistics', plugins: [{
  name: 'explicit-local-imports', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => {
      if (args.kind === 'entry-point') return { path: entry, namespace: 'local-code' };
      if (args.namespace === 'local-code' && args.path.startsWith('.')) {
        const candidate = resolve(dirname(args.importer), args.path);
        return { path: existsSync(candidate) ? candidate : candidate + '.ts', namespace: 'local-code' };
      }
    });
    builder.onLoad({ filter: /.*/, namespace: 'local-code' }, args => ({ contents: readFileSync(args.path, 'utf8'), loader: extname(args.path) === '.json' ? 'json' : 'ts' }));
  },
}] });

function fixture() {
  const options = '<option value=""></option>' + countries.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
  return `<main data-test-root>
    <p data-eu-farm-quick-summary hidden></p>
    <section data-eu-farm-numbers data-statistics-url="/insight-journal/assets/atlas/europe/farming-statistics-v1/statistics.json.gz">
      <p data-eu-farm-statistics-message role="status"></p><button data-eu-farm-statistics-retry hidden></button>
      <div data-eu-farm-stat-controls hidden><select data-eu-farm-country>${options}</select><select data-eu-farm-measure></select>
        <select data-eu-farm-year>${Array.from({ length: 10 }, (_, i) => `<option value="${2024-i}">${2024-i}</option>`).join('')}</select>
        <select data-eu-farm-compare="0">${options}</select><select data-eu-farm-compare="1">${options}</select>
      </div>
      <h4 data-eu-farm-share-title></h4><p data-eu-farm-share-status></p><div data-eu-farm-share-chart></div>
      <p data-eu-farm-measure-definition hidden></p><div data-eu-farm-stat-summary hidden></div>
      <details data-eu-farm-country-table hidden><div data-eu-farm-country-rows></div></details>
      <details data-eu-farm-series hidden><div data-eu-farm-series-rows></div></details>
      <details data-eu-farm-stat-source hidden><div data-eu-farm-stat-source-content></div></details>
    </section>
  </main>`;
}
const state = overrides => ({ region: 'all', place: 'RUS', city: '', compare: [], render: 'static', layer: 'wheat', returnLayer: 'wheat', ...overrides });
function setup({ fetch: fetchOverride, data = compressed } = {}) {
  const w = new Window({ url: 'https://example.com/insight-journal/atlas/europe/agriculture/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  w.document.body.innerHTML = fixture();
  w.Response = Response; w.Blob = Blob; w.DecompressionStream = DecompressionStream; w.TextDecoder = TextDecoder;
  const fetched = [], changes = [], selected = [];
  w.fetch = async url => { fetched.push(String(url)); return fetchOverride ? fetchOverride(url, fetched.length) : new Response(data); };
  w.eval(bundle.outputFiles[0].text);
  const q = selector => w.document.querySelector(selector);
  const controller = w.FarmingStatistics.createEuropeFarmingStatistics(q('[data-test-root]'), { countries, onChange: choice => changes.push(JSON.parse(JSON.stringify(choice))), onCountry: code => selected.push(code) });
  const select = (selector, value) => { q(selector).value = value; q(selector).dispatchEvent(new w.Event('change')); };
  const row = code => q(`[data-eu-farm-country="${code}"]`);
  return { w, q, controller, fetched, changes, selected, select, row, close: () => w.happyDOM.close() };
}
async function until(check) {
  for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  throw new Error('Farming statistics controller did not settle');
}
const cells = row => [...row.querySelectorAll('td')].map(cell => cell.textContent);

for (const [delivery, bytes] of [['gzip', compressed], ['HTTP-inflated JSON', inflated]]) {
  test(`the controller reads ${delivery}, renders the published national rows and requests the asset once`, async () => {
    const ui = setup({ data: bytes });
    try {
      await ui.controller.update(state());
      assert.equal(ui.fetched.length, 1);
      assert.match(ui.fetched[0], /farming-statistics-v1\/statistics\.json\.gz$/);
      assert.equal(ui.q('[data-eu-farm-country-table]').hidden, false);
      assert.equal(ui.q('[data-eu-farm-country-rows] tbody').children.length, 45);
      assert.deepEqual(cells(ui.row('RUS')).slice(0, 2), ['82,588,000', '10.34%']);
      assert.match(cells(ui.row('RUS'))[2], /^X：Figure from external organization/);
      assert.match(cells(ui.row('RUS'))[2], /Unofficial figure/);
      assert.match(ui.q('[data-eu-farm-quick-summary]').textContent, /2024年 小麦生産量：82,588,000 t/);
      assert.match(ui.q('[data-eu-farm-measure-definition]').textContent, /ロシアの数値は欧州.*以外も含む全土/);
      await ui.controller.update(state({ place: 'DEU' }));
      assert.equal(ui.fetched.length, 1);
      assert.equal(ui.q('[data-eu-farm-statistics-retry]').hidden, true);
    } finally { await ui.close(); }
  });
}

test('crop overview and unsupported aggregates explain missing statistics without fetching or retaining old tables', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state({ layer: 'crops' }));
    assert.equal(ui.fetched.length, 0);
    assert.match(ui.q('[data-eu-farm-statistics-message]').textContent, /品目を選ぶと/);
    assert.equal(ui.q('[data-eu-farm-stat-controls]').hidden, true);
    await ui.controller.update(state());
    for (const layer of ['vegetables', 'temperatefruit', 'citrus']) {
      await ui.controller.update(state({ layer }));
      assert.match(ui.q('[data-eu-farm-statistics-message]').textContent, /未収録.*個別作物の統計で代用していません/);
      for (const key of ['stat-summary', 'country-table', 'series', 'stat-source', 'measure-definition', 'quick-summary']) assert.equal(ui.q(`[data-eu-farm-${key}]`).hidden, true, key);
    }
    assert.equal(ui.fetched.length, 1);
  } finally { await ui.close(); }
});

test('published zero remains zero and forest measures retain separate labels, values and units', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state({ layer: 'rice', place: 'DEU' }));
    assert.deepEqual(cells(ui.row('DEU')).slice(0, 2), ['0', '0%']);
    assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, /米生産量：0 t.*世界生産量比：0%/);
    for (const [metric, expected, unit] of [['roundwood-production', '0', 'm³'], ['sawnwood-production', '0', 'm³'], ['forest-area', '18.21', '千ha']]) {
      await ui.controller.update(state({ layer: 'forest', place: 'AND', farmMeasure: metric }));
      assert.equal(ui.q('[data-eu-farm-measure]').value, metric);
      assert.equal(cells(ui.row('AND'))[0], expected);
      assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, new RegExp(`：${expected.replace('.', '\\.')} ${unit}`));
      assert.match(ui.q('[data-eu-farm-country-rows] thead').textContent, new RegExp(unit));
    }
    assert.deepEqual([...ui.q('[data-eu-farm-measure]').options].map(o => o.value), ['roundwood-production', 'sawnwood-production', 'forest-area']);
    assert.equal(cells(ui.row('AND'))[1], '0.01%未満（0超）', 'A tiny positive source share must not round down to zero');
    assert.match(ui.q('[data-eu-farm-measure-definition]').textContent, /土地利用面積.*産物の生産量とは別/);
  } finally { await ui.close(); }
});

test('Germany chicken stocks and France egg tonnage stay missing while meat, milk and stock measures remain distinct', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state({ layer: 'chicken', place: 'DEU' }));
    assert.deepEqual(cells(ui.row('DEU')).slice(0, 2), ['未収録', '未収録']);
    assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, /鶏飼養数：未収録/);
    assert.match(ui.q('[data-eu-farm-country-rows] thead').textContent, /鶏飼養数（千羽）.*世界飼養数比/);
    assert.deepEqual([...ui.q('[data-eu-farm-measure]').options].map(o => o.value), ['chicken-stocks', 'chicken-meat', 'chicken-eggs']);
    await ui.controller.update(state({ layer: 'chicken', place: 'FRA', farmMeasure: 'chicken-eggs' }));
    assert.deepEqual(cells(ui.row('FRA')).slice(0, 2), ['未収録', '未収録']);
    assert.match(ui.q('[data-eu-farm-country-rows] thead').textContent, /鶏卵生産量（t）/);
    await ui.controller.update(state({ layer: 'chicken', place: 'DEU', farmMeasure: 'chicken-meat' }));
    assert.notEqual(cells(ui.row('DEU'))[0], '未収録');
    assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, /鶏肉生産量/);
    for (const metric of ['cattle-stocks', 'cattle-meat', 'cattle-milk']) {
      await ui.controller.update(state({ layer: 'cattle', place: 'FRA', farmMeasure: metric }));
      assert.equal(ui.q('[data-eu-farm-measure]').value, metric);
      assert.notEqual(cells(ui.row('FRA'))[0], '未収録');
    }
    assert.equal(cells(ui.row('FRA'))[0], '24,204,280');
    assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, /牛の生乳生産量：24,204,280 t/);
  } finally { await ui.close(); }
});

test('dairy exposes only raw cow milk and keeps national production distinct from cattle density', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state({ layer: 'dairy', place: 'AUT', farmMeasure: 'cattle-stocks' }));
    assert.deepEqual([...ui.q('[data-eu-farm-measure]').options].map(option => option.value), ['cattle-milk']);
    assert.equal(ui.q('[data-eu-farm-measure]').value, 'cattle-milk');
    assert.equal(cells(ui.row('AUT'))[0], '4,020,700');
    assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, /牛の生乳生産量：4,020,700 t/);
    assert.match(ui.q('[data-eu-farm-measure-definition]').textContent, /肉用・乳用.*生乳の細地域分布ではありません/);
    assert.match(cells(ui.row('AUT'))[2], /^A：/);
  } finally { await ui.close(); }
});

test('forest and tree-cover definitions retain their own map years and source instead of the farming model year', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state({ layer: 'forest', farmMeasure: 'forest-area', farmYear: 2018 }));
    const forest = ui.q('[data-eu-farm-measure-definition]').textContent;
    assert.match(forest, /2023/);
    assert.match(forest, /国全体|国別/);
    assert.match(forest, /森林面積比率/);
    assert.match(forest, /2018年.*国全体の公表統計/);
    assert.doesNotMatch(forest, /2020年頃のモデル|2020.*モデル分布/);
    await ui.controller.update(state({ layer: 'treecover', farmMeasure: 'forest-area', farmYear: 2018 }));
    const treecover = ui.q('[data-eu-farm-measure-definition]').textContent;
    assert.match(treecover, /ESA\s*WorldCover/);
    assert.match(treecover, /2021/);
    assert.match(treecover, /樹木被覆/);
    assert.match(treecover, /2018年.*国全体の公表統計/);
    assert.doesNotMatch(treecover, /2020年頃のモデル|2020.*モデル分布/);
    await ui.controller.update(state({ farmYear: 2018 }));
    assert.match(ui.q('[data-eu-farm-measure-definition]').textContent, /2020年頃のモデル分布/);
  } finally { await ui.close(); }
});

test('an omitted 2015 national row stays missing in the chosen year and ten-year series without borrowing 2016 or 2024', async () => {
  const data = structuredClone(statistics);
  data.countries.RUS.observations = data.countries.RUS.observations.filter(r => !(r[0] === 'wheat-production' && r[1] === 2015));
  const ui = setup({ data: JSON.stringify(data) });
  try {
    await ui.controller.update(state({ farmYear: 2015 }));
    assert.equal(ui.q('[data-eu-farm-year]').value, '2015');
    assert.deepEqual(cells(ui.row('RUS')).slice(0, 2), ['未収録', '未収録']);
    assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, /2015年.*未収録/);
    const seriesRows = [...ui.q('[data-eu-farm-series-rows] tbody').children];
    assert.deepEqual(seriesRows.map(r => r.querySelector('th').textContent), Array.from({ length: 10 }, (_, i) => String(2015+i)));
    assert.match(seriesRows[0].querySelector('td').textContent, /^未収録/);
    assert.doesNotMatch(seriesRows[1].querySelector('td').textContent, /未収録/);
    assert.match(seriesRows[9].querySelector('td').textContent, /^82,588,000X：Figure from external organization.*Unofficial figure/);
  } finally { await ui.close(); }
});

test('two native comparison selectors exclude the main country, expose source flags and send country selection callbacks', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state({ farmCompare: ['DEU', 'FRA'] }));
    assert.equal(ui.w.document.querySelectorAll('[data-eu-farm-compare]').length, 2);
    assert.equal(ui.q('[data-eu-farm-compare="0"]').value, 'DEU');
    assert.equal(ui.q('[data-eu-farm-compare="1"]').value, 'FRA');
    for (const select of ui.w.document.querySelectorAll('[data-eu-farm-compare]')) assert.equal([...select.options].find(o => o.value === 'RUS').disabled, true);
    assert.equal([...ui.q('[data-eu-farm-compare="1"]').options].find(o => o.value === 'DEU').disabled, true);
    assert.equal(ui.q('[data-eu-farm-stat-summary]').children.length, 3);
    assert.equal(ui.q('[data-eu-farm-series-rows] thead tr').children.length, 4);
    assert.deepEqual([...ui.w.document.querySelectorAll('[data-eu-farm-country].is-selected')].map(r => r.dataset.euFarmCountry).sort(), ['DEU', 'FRA', 'RUS']);
    ui.q('[data-eu-farm-country-select="ITA"]').click();
    assert.deepEqual(ui.selected, ['ITA']);
  } finally { await ui.close(); }
});

test('year, measure and compare changes emit numeric year and a complete current farming choice', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state({ layer: 'cattle', farmYear: 2021, farmMeasure: 'cattle-stocks', farmCompare: ['DEU'] }));
    ui.select('[data-eu-farm-year]', '2018');
    assert.deepEqual(ui.changes.at(-1), { farmYear: 2018, farmMeasure: 'cattle-stocks', farmCompare: ['DEU'] });
    assert.equal(typeof ui.changes.at(-1).farmYear, 'number');
    await ui.controller.update(state({ layer: 'cattle', farmYear: 2018, farmMeasure: 'cattle-stocks', farmCompare: ['DEU'] }));
    ui.select('[data-eu-farm-measure]', 'cattle-milk');
    assert.deepEqual(ui.changes.at(-1), { farmYear: 2018, farmMeasure: 'cattle-milk', farmCompare: ['DEU'] });
    await ui.controller.update(state({ layer: 'cattle', farmYear: 2018, farmMeasure: 'cattle-milk', farmCompare: ['DEU'] }));
    ui.select('[data-eu-farm-compare="1"]', 'FRA');
    assert.deepEqual(ui.changes.at(-1), { farmYear: 2018, farmMeasure: 'cattle-milk', farmCompare: ['DEU', 'FRA'] });
    ui.select('[data-eu-farm-compare="0"]', '');
    assert.deepEqual(ui.changes.at(-1).farmCompare, ['FRA']);
  } finally { await ui.close(); }
});

test('a late request cannot restore an old unsupported layer or overwrite the newer supported metric and year', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const ui = setup({ fetch: () => pending });
  try {
    const old = ui.controller.update(state());
    await until(() => ui.fetched.length === 1);
    await ui.controller.update(state({ layer: 'vegetables' }));
    const missingMessage = ui.q('[data-eu-farm-statistics-message]').textContent;
    release(new Response(compressed));
    await old;
    assert.equal(ui.q('[data-eu-farm-statistics-message]').textContent, missingMessage);
    assert.equal(ui.q('[data-eu-farm-country-table]').hidden, true);
    assert.equal(ui.q('[data-eu-farm-quick-summary]').hidden, true);
  } finally { release(new Response(compressed)); await ui.close(); }

  let complete;
  const response = new Promise(resolve => { complete = resolve; });
  const newer = setup({ fetch: () => response });
  try {
    const first = newer.controller.update(state());
    const last = newer.controller.update(state({ layer: 'cattle', place: 'FRA', farmMeasure: 'cattle-milk', farmYear: 2020 }));
    complete(new Response(compressed));
    await Promise.all([first, last]);
    assert.equal(newer.fetched.length, 1);
    assert.match(newer.q('[data-eu-farm-stat-summary]').textContent, /2020年.*牛の生乳生産量/);
    assert.doesNotMatch(newer.q('[data-eu-farm-stat-summary]').textContent, /小麦生産量/);
    assert.equal(newer.q('[data-eu-farm-measure]').value, 'cattle-milk');
    assert.equal(newer.q('[data-eu-farm-year]').value, '2020');
  } finally { complete(new Response(compressed)); await newer.close(); }
});

test('HTTP failure exposes retry and the retry renders the current country, metric and year', async () => {
  const ui = setup({ fetch: (_url, count) => count === 1 ? new Response('unavailable', { status: 503 }) : new Response(compressed) });
  try {
    await ui.controller.update(state({ layer: 'cattle', place: 'FRA', farmYear: 2020, farmMeasure: 'cattle-milk' }));
    assert.equal(ui.q('[data-eu-farm-statistics-retry]').hidden, false);
    assert.match(ui.q('[data-eu-farm-statistics-message]').textContent, /取得できませんでした.*再試行/);
    assert.equal(ui.q('[data-eu-farm-country-table]').hidden, true);
    ui.q('[data-eu-farm-statistics-retry]').click();
    await until(() => !ui.q('[data-eu-farm-country-table]').hidden);
    assert.equal(ui.fetched.length, 2);
    assert.equal(ui.q('[data-eu-farm-statistics-retry]').hidden, true);
    assert.match(ui.q('[data-eu-farm-stat-summary]').textContent, /フランス.*2020年.*牛の生乳生産量/);
    assert.equal(ui.q('[data-eu-farm-year]').value, '2020');
  } finally { await ui.close(); }
});

test('world shares use the publisher World row and show the denominator, year and original units', async () => {
  const ui = setup();
  try {
    await ui.controller.update(state());
    assert.equal(cells(ui.row('RUS'))[1], '10.34%');
    assert.match(ui.q('[data-eu-farm-stat-source-content]').textContent, /FAOSTAT.*公表するWorld行.*2024年の分母：798,481,711\.07 t.*欧州の国.*合計/);
    const links = [...ui.q('[data-eu-farm-stat-source-content]').querySelectorAll('a')].map(a => a.href);
    assert.ok(links.includes('https://www.fao.org/faostat/en/#data/QCL'));
    assert.ok(links.some(url => url.endsWith('/farming-statistics-v1/statistics.json')));
    assert.ok(links.some(url => url.endsWith('/farming-statistics-v1/manifest.json')));
    assert.match(ui.q('[data-eu-farm-stat-source-content]').textContent, /FAO, FAOSTAT.*CC BY 4\.0/);
  } finally { await ui.close(); }
  for (const invalid of ['unit', 'missing', 'zero']) {
    const data = structuredClone(statistics);
    const i = data.world.observations.findIndex(r => r[0] === 'wheat-production' && r[1] === 2024);
    if (invalid === 'unit') data.world.observations[i][3] = '1000 t';
    if (invalid === 'missing') data.world.observations.splice(i, 1);
    if (invalid === 'zero') data.world.observations[i][2] = '0.000000';
    const mismatch = setup({ data: JSON.stringify(data) });
    try {
      await mismatch.controller.update(state());
      assert.equal(cells(mismatch.row('RUS'))[0], '82,588,000', invalid);
      assert.equal(cells(mismatch.row('RUS'))[1], '未収録', invalid);
      assert.match(mismatch.q('[data-eu-farm-stat-summary]').textContent, /世界生産量比：分母または同年の値が未収録/);
    } finally { await mismatch.close(); }
  }
});


test('world-share chart keeps primary/comparison countries, exact current share and gaps in the published time series',async()=>{
  const data=structuredClone(statistics);
  data.countries.DEU.observations=data.countries.DEU.observations.filter(row=>!(row[0]==='wheat-production'&&row[1]===2019));
  const ui=setup({data:JSON.stringify(data)});
  try{
    await ui.controller.update(state({place:'DEU',farmCompare:['FRA']}));
    assert.equal(ui.q('[data-eu-farm-country]').value,'DEU');
    assert.equal(ui.q('[data-eu-farm-share-chart]').querySelectorAll('svg').length,1);
    assert.equal(ui.q('[data-eu-farm-share-chart]').querySelectorAll('path[data-share-country="DEU"]').length,2);
    assert.equal(ui.q('[data-eu-farm-share-chart]').querySelectorAll('path[data-share-country="FRA"]').length,1);
    const german=ui.q('[data-eu-farm-share-chart]').querySelectorAll('path[data-share-country="DEU"]');
    assert.ok([...german].every(path=>!path.getAttribute('d').includes('NaN')));
    assert.equal(ui.q('[data-eu-farm-share-chart]').querySelectorAll('[data-share-year="2019"]').length,1,'Only the observed French point remains for the missing German year');
    assert.match(ui.q('[data-eu-farm-share-chart] svg').getAttribute('aria-label'),/同年|欠測/);
    ui.select('[data-eu-farm-country]','ITA');assert.deepEqual(ui.selected,['ITA']);
    await ui.controller.update(state({place:'',farmCompare:[]}));
    assert.equal(ui.q('[data-eu-farm-share-chart]').children.length,0);
    assert.match(ui.q('[data-eu-farm-share-status]').textContent,/統計対象国を選ぶ/);
    await ui.controller.update(state({layer:'vegetables'}));
    assert.equal(ui.q('[data-eu-farm-share-chart]').children.length,0,'No individual crop substitutes for an unsupported collection');
  }finally{await ui.close();}
});
