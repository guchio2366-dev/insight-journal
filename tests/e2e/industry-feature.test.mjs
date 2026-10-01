import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { sectors } from '../../src/data/atlas/industry-feature.ts';

const localModules = {
  name: 'industry-feature-local-modules',
  setup(builder) {
    builder.onResolve({ filter: /^\./ }, args => {
      const resolved = path.resolve(args.resolveDir, args.path);
      return { path: resolved + (path.extname(resolved) ? '' : '.ts') };
    });
    builder.onLoad({ filter: /\.ts$/ }, async args => ({
      contents: await readFile(args.path, 'utf8'), loader: 'ts', resolveDir: path.dirname(args.path),
    }));
  },
};
const compiled = await build({
  stdin: {
    contents: "import './src/scripts/industry-feature.ts';",
    resolveDir: process.cwd(), sourcefile: 'industry-feature-e2e-entry.ts', loader: 'ts',
  },
  absWorkingDir: process.cwd(), tsconfigRaw: {}, plugins: [localModules],
  bundle: true, format: 'iife', platform: 'browser', write: false,
});
const controller = compiled.outputFiles[0].text;
const html = (await readFile('dist/atlas/industry/index.html', 'utf8'))
  .replace(/<script(?![^>]*type=["']application\/json["'])[^>]*>[\s\S]*?<\/script>/g, '');

function page(search = '', interactive = true) {
  const window = new Window({
    url: `https://example.com/insight-journal/atlas/industry/${search}`,
    settings: {
      disableCSSFileLoading: true, disableJavaScriptFileLoading: true,
      enableJavaScriptEvaluation: interactive, suppressInsecureJavaScriptEnvironmentWarning: true,
    },
  });
  const errors = [];
  window.addEventListener('error', event => errors.push(event.message));
  window.document.write(html);
  if (interactive) window.eval(controller);
  return { window, document: window.document, errors };
}
const query = (document, selector) => {
  const element = document.querySelector(selector);
  assert.ok(element, `Missing UI element: ${selector}`);
  return element;
};
const click = (document, selector) => query(document, selector).click();
const text = (document, selector) => query(document, selector).textContent.trim();
const activeMap = document => query(document, '[data-feature-map]:not([hidden])');
const visibleMarkers = document => [...activeMap(document).querySelectorAll('[data-feature-marker]')]
  .filter(marker => marker.getAttribute('aria-hidden') === 'false');

test('SSR supplies a usable initial map, separate classification axes and folded detailed sources', async () => {
  const { window, document } = page('', false);
  try {
    assert.equal(query(document, '[data-if-sector=automotive]').getAttribute('aria-pressed'), 'true');
    assert.equal(query(document, '[data-if-region=north-america]').getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelectorAll('[data-feature-map]:not([hidden])').length, 1);
    assert.equal(document.querySelectorAll('[data-if-powertrain]').length, 6);
    assert.equal(document.querySelectorAll('[data-if-body]').length, 5);
    assert.equal(query(document, '#if-sources').open, false);
    assert.equal(query(document, '[data-if-deep-dive]').open, false);
    assert.equal(query(document, '[data-if-comparison]').hidden, true);
    assert.match(text(document, '[data-if-value]'), /10%未満/);
    assert.match(text(document, '[data-if-scope]'), /2025|Cars|新車/);
    assert.match(text(document, '#if-sources'), /未収録.*0|欠測.*0/s);
    for (const [id, value] of [['USA', '10%未満'], ['CAN', '約11%'], ['MEX', '7%超']]) {
      const marker = activeMap(document).querySelector(`[data-feature-marker=${id}]`);
      assert.equal(marker.hasAttribute('hidden'), false);
      assert.equal(marker.getAttribute('aria-hidden'), 'false');
      assert.equal(marker.querySelector('[data-feature-country-value]').textContent, value);
    }
    for (const id of ['TWN', 'NLD']) {
      const marker = query(document, `[data-feature-marker=${id}]`);
      assert.equal(marker.hasAttribute('hidden'), true);
      assert.equal(marker.getAttribute('aria-hidden'), 'true');
      assert.equal(marker.getAttribute('tabindex'), '-1');
    }
  } finally { await window.happyDOM.close(); }
});

test('four sectors and three regions keep country buttons, map labels and selected cards synchronized', async () => {
  const { window, document, errors } = page();
  try {
    for (const sector of sectors) {
      click(document, `[data-if-sector=${sector.id}]`);
      assert.equal(text(document, '[data-if-question]'), sector.question);
      assert.equal(query(document, '[data-if-sector][aria-pressed=true]').dataset.ifSector, sector.id);
      for (const region of sector.regions) {
        click(document, `[data-if-region=${region.id}]`);
        assert.equal(activeMap(document).dataset.featureMap, region.id);
        assert.equal(document.querySelectorAll('[data-feature-map]:not([hidden])').length, 1);
        assert.deepEqual(visibleMarkers(document).map(marker => marker.dataset.featureMarker).sort(), region.countries.map(country => country.id).sort());
        assert.deepEqual([...document.querySelectorAll('[data-if-country]')].map(button => button.dataset.ifCountry), region.countries.map(country => country.id));
        for (const view of ['market', 'manufacturing']) {
          click(document, `[data-if-view=${view}]`);
          if (sector.id === 'semiconductor' && view === 'market') {
            assert.match(text(document, '[data-if-map-title]'), /設計|装置|工程|役割/);
            assert.doesNotMatch(text(document, '[data-if-map-title]'), /87%|稼働中.*能力/);
          }
          for (const country of region.countries) {
            const button = query(document, `[data-if-country=${country.id}]`);
            if (button.getAttribute('aria-pressed') !== 'true') button.click();
            const marker = activeMap(document).querySelector(`[data-feature-marker=${country.id}]`);
            const fullLabel = view === 'market' ? country.marketLabel : country.manufacturingLabel;
            const shortLabel = view === 'market' ? country.mapMarketLabel ?? fullLabel : country.mapManufacturingLabel ?? fullLabel;
            assert.equal(text(document, '[data-if-country-name]'), country.name);
            assert.equal(text(document, '[data-if-value]'), shortLabel);
            assert.equal(query(document, `[data-if-country=${country.id}] span`).textContent, shortLabel);
            if (sector.id !== 'automotive' || view !== 'market') assert.ok(text(document, '[data-if-country-note]').includes(fullLabel));
            assert.equal(query(document, `[data-if-country=${country.id}]`).getAttribute('aria-pressed'), 'true');
            assert.equal(marker.getAttribute('aria-pressed'), 'true');
            assert.equal(marker.hasAttribute('hidden'), false);
            assert.equal(marker.classList.contains('is-selected'), true);
            assert.equal(marker.querySelector('[data-feature-country-value]').textContent, shortLabel);
            assert.ok(marker.getAttribute('aria-label').includes(fullLabel));
            assert.equal(activeMap(document).querySelectorAll('[data-feature-marker][aria-pressed=true]').length, 1);
            assert.equal(new URL(window.location.href).searchParams.get('country'), country.id);
          }
        }
      }
    }
    assert.deepEqual(errors, []);
  } finally { await window.happyDOM.close(); }
});

test('battery Europe preserves EU aggregation and excludes Norway from its selected geography', async () => {
  const { window, document } = page('?sector=battery&region=europe&country=EU&view=manufacturing');
  try {
    assert.equal(new URL(window.location.href).searchParams.get('country'), 'EU');
    assert.equal(text(document, '[data-if-country-name]'), 'EU（27加盟国）');
    assert.equal(text(document, '[data-if-value]'), '能力6〜7%');
    assert.match(text(document, '[data-if-country-note]'), /6〜7%.*EU集計/);
    const map = activeMap(document);
    assert.equal(query(document, '[data-if-country=EU]').getAttribute('aria-pressed'), 'true');
    assert.equal(map.querySelector('[data-feature-marker=EU]').getAttribute('aria-pressed'), 'true');
    assert.equal(map.querySelectorAll('[data-feature-shape][data-feature-group=EU].is-selected').length, 27);
    assert.equal(map.querySelector('[data-feature-shape=NOR]').classList.contains('is-selected'), false);
    click(document, '[data-if-country=DEU]');
    assert.match(text(document, '[data-if-value]'), /国別値未収録/);
    assert.match(text(document, '[data-if-country-note]'), /国別値は未収録/);
    assert.doesNotMatch(text(document, '[data-if-value]'), /6〜7%|6\.5%|^0/);
    assert.equal(map.querySelectorAll('[data-feature-shape][data-feature-group=EU].is-selected').length, 1);
  } finally { await window.happyDOM.close(); }
});

test('powertrain and body stay independent and unavailable cross-statistics are never rendered as zero', async () => {
  const { window, document } = page('?region=asia&country=JPN');
  try {
    query(document, '[data-if-classification]').open = true;
    click(document, '[data-if-powertrain=phev]');
    click(document, '[data-if-body=suv]');
    assert.equal(query(document, '[data-if-powertrain=phev]').getAttribute('aria-pressed'), 'true');
    assert.equal(query(document, '[data-if-body=suv]').getAttribute('aria-pressed'), 'true');
    assert.equal(text(document, '[data-if-value]'), '該当データ未収録');
    assert.equal(query(document, '[data-if-missing]').hidden, false);
    assert.match(text(document, '[data-if-country-note]'), /3%未満/);
    for (const marker of visibleMarkers(document)) {
      assert.equal(marker.querySelector('[data-feature-country-value]').textContent, '未収録');
      assert.match(marker.getAttribute('aria-label'), /未収録/);
    }
    click(document, '[data-if-compare]');
    assert.match(text(document, '[data-if-compare-title]'), /未収録/);
    assert.doesNotMatch(text(document, '[data-if-compare-title]'), /10%|30%|55%/);
    const automotive = sectors.find(sector => sector.id === 'automotive');
    const comparisonCards = [...document.querySelectorAll('[data-if-comparison-cards] section')];
    for (const [index, region] of automotive.regions.entries()) {
      const lines = [...comparisonCards[index].querySelectorAll('p')];
      for (const [countryIndex, country] of region.countries.entries()) {
        assert.equal(lines[countryIndex].textContent, `${country.name}：組合せは未収録（全体：${country.marketLabel}）`);
      }
    }
    click(document, '[data-if-body=pickup]');
    const selected = new URL(window.location.href).searchParams;
    assert.equal(selected.get('powertrain'), 'phev');
    assert.equal(selected.get('body'), 'pickup');
    click(document, '[data-if-powertrain=all]');
    assert.equal(query(document, '[data-if-body=pickup]').getAttribute('aria-pressed'), 'true');
    assert.equal(text(document, '[data-if-value]'), '該当データ未収録');
    click(document, '[data-if-body=all]');
    assert.equal(text(document, '[data-if-value]'), '3%未満');
    assert.equal(query(document, '[data-if-missing]').hidden, true);
  } finally { await window.happyDOM.close(); }
});

test('regional policy citations remain available when another representative country is selected', async () => {
  const cases = [
    { region: 'north-america', country: 'CAN', source: 'irs-credit' },
    { region: 'europe', country: 'NOR', source: 'eu-bev-trade' },
    { region: 'asia', country: 'JPN', source: 'china-nev-tax' },
  ];
  for (const selected of cases) {
    const { window, document } = page(`?sector=automotive&region=${selected.region}`);
    try {
      click(document, `[data-if-country=${selected.country}]`);
      click(document, '[data-if-source-open]');
      const source = query(document, `[data-if-source=${selected.source}]`);
      assert.equal(source.hidden, false);
      assert.ok(source.querySelector('a').href.startsWith('https://'));
      const region = sectors.find(sector => sector.id === 'automotive').regions.find(region => region.id === selected.region);
      assert.equal(text(document, '[data-if-policy]'), region.policy);
      assert.equal(query(document, '#if-sources').open, true);
      if (selected.region === 'north-america') {
        click(document, '[data-if-compare]');
        for (const sourceId of ['vw-zwickau', 'byd-thailand']) {
          assert.equal(query(document, `[data-if-source=${sourceId}]`).hidden, false);
        }
      }
    } finally { await window.happyDOM.close(); }
  }
});

test('battery comparison headings and country lines switch together between deployment and capacity', async () => {
  const { window, document } = page('?sector=battery&region=asia&country=CHN&view=market&compare=1');
  try {
    const marketTitle = text(document, '[data-if-compare-title]');
    assert.match(marketTitle, /EV電池導入.*60%.*15%弱.*10%/);
    assert.doesNotMatch(marketTitle, /能力|80%/);
    const battery = sectors.find(sector => sector.id === 'battery');
    const assertCountryLines = view => {
      const cards = [...document.querySelectorAll('[data-if-comparison-cards] section')];
      for (const [index, region] of battery.regions.entries()) {
        const lines = [...cards[index].querySelectorAll('p')];
        for (const [countryIndex, country] of region.countries.entries()) {
          assert.equal(lines[countryIndex].textContent, `${country.name}：${view === 'market' ? country.marketLabel : country.manufacturingLabel}`);
        }
      }
    };
    assertCountryLines('market');
    click(document, '[data-if-view=manufacturing]');
    assert.match(text(document, '[data-if-compare-title]'), /能力.*80%超.*6〜7%.*6〜7%/);
    assertCountryLines('manufacturing');
  } finally { await window.happyDOM.close(); }
});

test('history restores both classification axes and comparison, while reset returns to the initial screen', async () => {
  const { window, document } = page('?sector=automotive&region=asia&country=THA&view=market&powertrain=bev&body=suv&compare=1&utm_source=atlas#reading');
  try {
    assert.equal(query(document, '[data-if-comparison]').hidden, false);
    click(document, '[data-if-sector=semiconductor]');
    click(document, '[data-if-region=europe]');
    window.history.replaceState(null, '', '?sector=automotive&region=europe&country=NOR&view=market&powertrain=hev&body=minivan&compare=0&utm_source=atlas#reading');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(text(document, '[data-if-country-name]'), 'ノルウェー');
    assert.equal(query(document, '[data-if-powertrain=hev]').getAttribute('aria-pressed'), 'true');
    assert.equal(query(document, '[data-if-body=minivan]').getAttribute('aria-pressed'), 'true');
    assert.equal(query(document, '[data-if-comparison]').hidden, true);
    window.history.replaceState(null, '', '?sector=automotive&region=asia&country=THA&view=market&powertrain=bev&body=suv&compare=1&utm_source=atlas#reading');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(query(document, '[data-if-powertrain=bev]').getAttribute('aria-pressed'), 'true');
    assert.equal(query(document, '[data-if-body=suv]').getAttribute('aria-pressed'), 'true');
    assert.equal(query(document, '[data-if-comparison]').hidden, false);
    assert.equal(query(document, '[data-if-compare]').getAttribute('aria-expanded'), 'true');
    click(document, '[data-if-reset]');
    const restored = new URL(window.location.href);
    assert.deepEqual(Object.fromEntries(['sector', 'region', 'country', 'view', 'powertrain', 'body', 'compare'].map(key => [key, restored.searchParams.get(key)])), {
      sector: 'automotive', region: 'north-america', country: 'USA', view: 'market', powertrain: 'all', body: 'all', compare: '0',
    });
    assert.equal(text(document, '[data-if-value]'), '10%未満');
    assert.equal(query(document, '[data-if-comparison]').hidden, true);
    assert.equal(restored.searchParams.get('utm_source'), 'atlas');
    assert.equal(restored.hash, '#reading');
  } finally { await window.happyDOM.close(); }
});

test('sources and mechanism details open on request without requiring hover or an external fetch', async () => {
  const { window, document } = page('?sector=battery&region=asia&country=CHN&view=manufacturing');
  try {
    assert.equal(query(document, '#if-sources').open, false);
    click(document, '[data-if-source-open]');
    assert.equal(query(document, '#if-sources').open, true);
    assert.ok([...document.querySelectorAll('[data-if-source]:not([hidden]) a')].length > 0);
    click(document, '[data-if-view=mechanism]');
    assert.equal(query(document, '[data-if-deep-dive]').open, true);
    assert.match(text(document, '[data-if-deep-dive]'), /模式|納入|輸送/);
    click(document, '[data-if-compare]');
    assert.equal(document.querySelectorAll('[data-if-comparison-cards] section').length, 3);
    assert.match(text(document, '[data-if-compare-note]'), /2025/);
    click(document, '[data-if-compare]');
    assert.equal(query(document, '[data-if-comparison]').hidden, true);
  } finally { await window.happyDOM.close(); }
});

test('short map labels retain limits and status without turning missing observations into proportional symbols', async () => {
  const { window, document } = page();
  try {
    const symbols = [...document.querySelectorAll('.industry-feature-anchor')].map(symbol => symbol.getAttribute('r'));
    for (const sector of sectors) {
      click(document, `[data-if-sector=${sector.id}]`);
      for (const region of sector.regions) {
        click(document, `[data-if-region=${region.id}]`);
        for (const view of ['market', 'manufacturing']) {
          click(document, `[data-if-view=${view}]`);
          for (const country of region.countries) {
            const marker = activeMap(document).querySelector(`[data-feature-marker=${country.id}]`);
            const label = marker.querySelector('[data-feature-country-value]').textContent;
            assert.ok(label.length <= 18, `${sector.id}/${region.id}/${country.id}: map label is too long`);
            assert.doesNotMatch(label, /NaN|Infinity|^0(?:%|GW|GWh)?$/);
            const fullLabel = view === 'market' ? country.marketLabel : country.manufacturingLabel;
            if (/未収録/.test(fullLabel)) assert.match(label, /未収録|入口|比較|条件|差/);
          }
        }
      }
    }
    assert.deepEqual([...document.querySelectorAll('.industry-feature-anchor')].map(symbol => symbol.getAttribute('r')), symbols);
    assert.ok(symbols.every(radius => radius === '6'));
  } finally { await window.happyDOM.close(); }
});
