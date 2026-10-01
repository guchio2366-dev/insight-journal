import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve } from 'node:path';
import { build, transform } from 'esbuild';
import { Window } from 'happy-dom';

const entry = fileURLToPath(new URL('../../src/data/atlas/country-overview.ts', import.meta.url));
// Explicit local resolution also works in Windows sandboxes where esbuild
// cannot inspect package files outside the workspace.
const dataBundle = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', tsconfigRaw: {}, plugins: [{
  name: 'local-overview-data', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => {
      if (args.kind === 'entry-point') return { path: entry, namespace: 'overview-data' };
      if (args.namespace === 'overview-data' && args.path.startsWith('.')) {
        const candidate = resolve(dirname(args.importer), args.path);
        return { path: existsSync(candidate) ? candidate : candidate + '.ts', namespace: 'overview-data' };
      }
    });
    builder.onLoad({ filter: /.*/, namespace: 'overview-data' }, args => ({ contents: readFileSync(args.path, 'utf8'), loader: extname(args.path) === '.json' ? 'json' : 'ts' }));
  },
}] });
const { getOverviewRegion, overviewRegions, overviewTopics } = await import(`data:text/javascript;base64,${Buffer.from(dataBundle.outputFiles[0].text).toString('base64')}`);
const mapController = await readFile(new URL('../../src/scripts/atlas-overview-map.ts', import.meta.url), 'utf8');
const pageController = (await readFile(new URL('../../src/scripts/atlas-country-overview.ts', import.meta.url), 'utf8'))
  .replace(/^import .* from ['"]\.\/atlas-overview-map['"];?\r?\n/m, '');
const controller = (await transform(`${mapController}\n${pageController}\ninitCountryOverview(document.querySelector('[data-country-overview]'));`, { loader: 'ts', format: 'iife' })).code;
const fieldIds = ['agriculture', 'nature', 'industry', 'population'];
const countryPath = { USA: '', CAN: 'canada/', MEX: 'mexico/' };

function setup({ regionId = 'north-america', search = '', base = '/insight-journal' } = {}) {
  const region = getOverviewRegion(regionId);
  const config = {
    countries: region.countries.map(country => ({ ...country, bounds: [10, 10, 100, 100] })),
    topics: overviewTopics.map(({ id, label }) => ({ id, label })),
    fields: region.fields.filter(field => field.href).map(field => ({
      id: field.id, href: base + field.href,
      ...(field.countryHrefs ? { countryHrefs: Object.fromEntries(Object.entries(field.countryHrefs).map(([code, href]) => [code, base + href])) } : {}),
    })),
    cities: regionId === 'north-america' ? [{ id: 'toronto', name: 'Toronto', country: 'CAN', point: [30, 30], rank: 1, capital: false }] : [],
    width: 1000, height: 680, regionLabel: region.label,
  };
  const w = new Window({ url: `https://example.test${base}${region.path}${search}`, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  w.document.body.innerHTML = `<article data-country-overview>
    <select data-overview-country><option value="">Region</option>${config.countries.map(country => `<option value="${country.code}">${country.name}</option>`).join('')}</select>
    <nav><a data-overview-current-link href="${base}${region.path}">Overview</a>${config.fields.map(field => `<a data-overview-field="${field.id}" href="${field.href}">${field.id}</a>`).join('')}</nav>
    <div data-overview-map-stage><svg data-overview-map>${config.countries.map(country => `<path data-overview-map-country="${country.code}"/>`).join('')}</svg></div>
    ${config.countries.map(country => `<button data-overview-label-country="${country.code}">${country.name}</button>`).join('')}
    <button data-overview-reset>Reset</button><p data-overview-announcement></p>
    <strong data-overview-place-title></strong><p data-overview-place-description></p>
    <a data-overview-detail-link href="#overview-country-detail">Details</a><section data-overview-country-detail><span data-overview-country-name></span></section>
    ${config.topics.map(topic => `<button data-overview-topic="${topic.id}">${topic.label}</button><section id="overview-panel-${topic.id}" role="tabpanel"></section>`).join('')}
    <script type="application/json" data-overview-config>${JSON.stringify(config)}</script>
  </article>`;
  w.eval(controller);
  return { w, config, picker: w.document.querySelector('[data-overview-country]') };
}
function assertCountryFields(w, country, base = '/insight-journal') {
  for (const field of fieldIds) {
    const link = w.document.querySelector(`[data-overview-field="${field}"]`);
    assert.equal(new URL(link.href).pathname, `${base}/atlas/north-america/${countryPath[country] ?? ''}${field}/`);
    assert.equal(new URL(link.href).search, '', 'overview topic and city do not leak into field URLs');
  }
}

test('North America country field destinations are limited to existing published routes', async () => {
  const region = getOverviewRegion('north-america');
  assert.deepEqual(region.fields.map(field => field.id), fieldIds);
  for (const field of region.fields) {
    assert.deepEqual(Object.keys(field.countryHrefs).sort(), ['CAN', 'MEX', 'USA']);
    for (const [country, href] of Object.entries(field.countryHrefs)) {
      assert.equal(href, `/atlas/north-america/${countryPath[country]}${field.id}/`);
      await access(new URL(`../../src/pages${href}index.astro`, import.meta.url));
    }
  }
  assert.ok(overviewRegions.filter(region => region.id !== 'north-america').every(region => region.fields.every(field => !field.countryHrefs)));
});

test('Deep country URLs select all four correct field routes under each deployment base', async () => {
  for (const base of ['', '/insight-journal', '/custom/nested']) {
    for (const country of ['CAN', 'MEX', 'USA']) {
      const { w, picker } = setup({ search: `?country=${country}&topic=industry&city=unknown`, base });
      try {
        assert.equal(picker.value, country);
        assertCountryFields(w, country, base);
        assert.equal(new URL(w.document.querySelector('[data-overview-current-link]').href).searchParams.get('country'), country);
      } finally { await w.happyDOM.close(); }
    }
  }
});

test('Country picker, map selection, popstate and reset keep destinations synchronized', async () => {
  const { w, picker } = setup({ search: '?country=CAN&topic=population' });
  try {
    assertCountryFields(w, 'CAN');
    picker.value = 'MEX'; picker.dispatchEvent(new w.Event('change'));
    assertCountryFields(w, 'MEX');
    assert.equal(new URL(w.location.href).searchParams.get('country'), 'MEX');
    w.document.querySelector('[data-overview-label-country="USA"]').click();
    assertCountryFields(w, 'USA');
    w.history.replaceState({}, '', '?country=CAN&topic=nature'); w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(picker.value, 'CAN'); assertCountryFields(w, 'CAN');
    w.history.replaceState({}, '', '?country=MEX'); w.dispatchEvent(new w.PopStateEvent('popstate'));
    assertCountryFields(w, 'MEX');
    w.document.querySelector('[data-overview-reset]').click();
    assert.equal(picker.value, ''); assertCountryFields(w, '');
    assert.equal(new URL(w.location.href).searchParams.has('country'), false);
  } finally { await w.happyDOM.close(); }
});

test('No country and invalid country values retain regionwide field destinations', async () => {
  for (const search of ['', '?country=XXX', '?country=can', '?country=FRA', '?country=../../mexico']) {
    const { w, picker } = setup({ search });
    try {
      assert.equal(picker.value, ''); assertCountryFields(w, '');
      assert.equal(new URL(w.location.href).searchParams.has('country'), false);
      w.history.replaceState({}, '', '?country=CAN'); w.dispatchEvent(new w.PopStateEvent('popstate'));
      assertCountryFields(w, 'CAN');
      w.history.replaceState({}, '', search || '?country=XXX'); w.dispatchEvent(new w.PopStateEvent('popstate'));
      assert.equal(picker.value, ''); assertCountryFields(w, '');
    } finally { await w.happyDOM.close(); }
  }
  const { w, picker } = setup({ search: '?city=toronto&topic=nature' });
  try { assert.equal(picker.value, 'CAN'); assertCountryFields(w, 'CAN'); }
  finally { await w.happyDOM.close(); }
});

test('Browser back and forward restore the selected country and all field destinations', async () => {
  const { w, picker } = setup({ search: '?country=CAN' });
  try {
    for (const country of ['MEX', 'USA']) {
      picker.value = country; picker.dispatchEvent(new w.Event('change'));
    }
    assertCountryFields(w, 'USA');
    w.history.back(); await w.happyDOM.waitUntilComplete();
    assert.equal(picker.value, 'MEX'); assertCountryFields(w, 'MEX');
    w.history.back(); await w.happyDOM.waitUntilComplete();
    assert.equal(picker.value, 'CAN'); assertCountryFields(w, 'CAN');
    w.history.forward(); await w.happyDOM.waitUntilComplete();
    assert.equal(picker.value, 'MEX'); assertCountryFields(w, 'MEX');
  } finally { await w.happyDOM.close(); }
});

test('Selecting a country in other regions preserves their existing field links', async () => {
  for (const region of overviewRegions.filter(region => !['north-america', 'oceania'].includes(region.id))) {
    const { w, picker, config } = setup({ regionId: region.id, search: `?country=${region.defaultCountry}` });
    try {
      assert.equal(picker.value, region.defaultCountry);
      for (const field of config.fields) assert.equal(w.document.querySelector(`[data-overview-field="${field.id}"]`).href, new URL(field.href, w.location.href).href);
    } finally { await w.happyDOM.close(); }
  }
});
