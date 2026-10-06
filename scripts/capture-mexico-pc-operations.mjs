/** User-operated PC regression cases for the existing sandboxed CI browser. */
import assert from 'node:assert/strict';

const map = {agriculture: '[data-agriculture-map]', nature: '[data-mexico-nature-main-map]', industry: '[data-mi-map="primary"]', population: '[data-population-map]'};

async function settled(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-mexico-workspace]');
    if (!node) return false;
    const key = {agriculture: 'agricultureReady', nature: 'mexicoNatureReady', industry: 'miReady', population: 'populationReady'}[node.dataset.mexicoField];
    return ['1', 'true'].includes(node.dataset[key]);
  });
  await page.evaluate(async () => {await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});
}

async function reveal(locator) {
  // Open real disclosure controls; do not change DOM visibility to make tests pass.
  const outermostClosed = locator.locator('xpath=ancestor::details[not(@open)][last()]');
  while (await outermostClosed.count()) await outermostClosed.locator(':scope > summary').click();
}
async function click(page, selector) {const locator = page.locator(selector).first(); await reveal(locator); await locator.click(); await settled(page);}
async function select(page, selector, value) {const locator = page.locator(selector).first(); await reveal(locator); await locator.selectOption(value); await settled(page);}
async function check(page, selector, value) {const locator = page.locator(selector).first(); await reveal(locator); await locator.setChecked(value); await settled(page);}
async function text(page, selector) {return (await page.locator(selector).first().textContent())?.trim() ?? '';}
async function frame(page, field) {return page.locator(map[field]).getAttribute('viewBox');}
function query(page, key) {return new URL(page.url()).searchParams.get(key);}

async function snapshot(page) {
  return page.evaluate(() => {
    const node = document.querySelector('[data-mexico-workspace]'), url = new URL(location.href); url.searchParams.sort();
    const controls = [...node.querySelectorAll('select,input[type="checkbox"]')].map(element => ({selector: [...element.attributes].filter(attr => attr.name.startsWith('data-')).map(attr => `[${attr.name}${attr.value ? `="${attr.value}"` : ''}]`).join(''), value: element.value, ...(element.type === 'checkbox' ? {checked: element.checked} : {})}));
    const frames = [...node.querySelectorAll('[data-agriculture-map],[data-mexico-nature-main-map],[data-mi-map],[data-population-map]')].map(element => ({id: element.getAttribute('data-mi-map') ?? element.tagName, viewBox: element.getAttribute('viewBox')}));
    return {url: url.href, field: node.dataset.mexicoField, controls, frames};
  });
}
async function restored(page, expected, label) {await settled(page); assert.deepEqual(await snapshot(page), expected, label);}
async function reload(page) {const before = await snapshot(page); await page.reload({waitUntil: 'domcontentloaded'}); await restored(page, before, 'Reload must preserve URL, controls and camera');}
async function history(page, action) {
  const before = await snapshot(page); await action(); const after = await snapshot(page);
  assert.notEqual(after.url, before.url, 'Operation must create a distinct navigable state');
  await page.goBack(); await restored(page, before, 'Back must restore the previous state');
  await page.goForward(); await restored(page, after, 'Forward must restore the selected state');
}
function steps(page, evidence) {
  return async (name, action) => {
    const record = {name, status: 'running', beforeUrl: page.url()}; evidence.steps.push(record);
    try {record.details = await action(); record.state = await snapshot(page); record.status = 'passed';}
    catch (error) {record.status = 'failed'; record.failure = String(error); throw error;}
  };
}
async function zoom(page, field, inSelector, outSelector, resetSelector) {
  const initial = await frame(page, field);
  await click(page, inSelector); const enlarged = await frame(page, field); assert.notEqual(enlarged, initial, 'Zoom must change the map viewBox');
  await reload(page); await click(page, outSelector); await click(page, resetSelector);
  assert.equal(await frame(page, field), initial, 'Reset must restore the national viewBox');
  return {initial, enlarged, reset: await frame(page, field)};
}

async function agriculture({page, evidence}) {
  const step = steps(page, evidence);
  await step('All crop and livestock distributions remain after crop selection', async () => {
    await click(page, '[data-crop-select="corn"]');
    assert.match(await text(page, '#agri-reading-heading'), /とうもろこし/);
    const distribution = await page.evaluate(() => {
      const node = document.querySelector('[data-mexico-agriculture-atlas]');
      const paths = [...node.querySelectorAll('[data-mexico-crop-zones] path')].map(path => ({id: path.getAttribute('data-crop-zone'), hidden: !!path.closest('[hidden]'), opacity: getComputedStyle(path).fillOpacity, stroke: getComputedStyle(path).stroke, strokeWidth: getComputedStyle(path).strokeWidth}));
      const labels = [...node.querySelectorAll('[data-crop-label]')].filter(label => !label.closest('[hidden]')).map(label => ({id: label.getAttribute('data-crop-label'), fill: getComputedStyle(label).fill, sourceFill: getComputedStyle(node.querySelector(`[data-mexico-crop-zones] [data-crop-zone="${label.getAttribute('data-crop-label')}"]`)).fill}));
      return {paths, labels, livestock: node.querySelectorAll('[data-livestock-markers] button').length};
    });
    assert(distribution.paths.length >= 10 && distribution.paths.every(path => !path.hidden && Number(path.opacity) > 0));
    assert(distribution.livestock > 0);
    const corn = distribution.paths.find(path => path.id === 'corn'); assert(corn && corn.stroke !== 'none' && parseFloat(corn.strokeWidth) > 0);
    assert(distribution.labels.length > 0 && distribution.labels.every(label => label.fill === label.sourceFill), 'Labels must match their crop colors');
    return distribution;
  });
  await step('Every crop keeps a visible selected map label after collision layout', async () => {
    const ids = await page.locator('[data-crop-select]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('data-crop-select')))]);
    assert.equal(ids.length, 11);
    for (const id of ids) {
      await click(page, `[data-crop-select="${id}"]`);
      assert(await page.locator(`[data-crop-label="${id}"]:visible`).count() > 0, `${id}: selected crop label must remain visible`);
    }
    await click(page, '[data-crop-select="corn"]');
    return {verifiedCropIds: ids};
  });
  await step('PC camera zoom, pan, reload and reset', async () => {
    await zoom(page, 'agriculture', '[data-map-action="in"]', '[data-map-action="out"]', '[data-map-action="fit"]');
    await click(page, '[data-map-action="in"]'); const before = await frame(page, 'agriculture');
    const box = await page.locator(map.agriculture).boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down();
    await page.mouse.move(box.x + box.width * .5 + 35, box.y + box.height * .5 + 12, {steps: 6}); await page.mouse.up(); await settled(page);
    assert.notEqual(await frame(page, 'agriculture'), before, 'PC drag must pan the zoomed map');
    await reload(page);
  });
  await step('Livestock, layer toggles and browser history', async () => {
    await history(page, () => click(page, '[data-livestock-select="beef"]'));
    assert.match(await text(page, '#agri-reading-heading'), /肉牛/);
    await check(page, '[data-agri-layer][value="crops"]', false); assert.equal(query(page, 'crops'), '0');
    await check(page, '[data-agri-layer][value="crops"]', true);
    await click(page, '[data-crop-select="corn"]');
  });
  await step('Agriculture → nature comparison → exact source selection and camera', async () => {
    const before = await snapshot(page);
    await click(page, '[data-agriculture-nature-comparison="corn"]');
    assert.equal(query(page, 'from'), 'agriculture'); assert.equal(query(page, 'sourceAgriItem'), 'corn');
    assert(await page.locator('[data-mexico-nature-comparison]').isVisible());
    await click(page, '[data-mexico-nature-source-return]');
    await restored(page, before, 'Comparison return must preserve agriculture item/layers/state/camera');
    await reload(page);
  });
}

async function climate({page, evidence}) {
  const step = steps(page, evidence);
  await step('Climate map labels select the full source code and Japanese explanation', async () => {
    const label = page.locator('[data-mexico-nature-label-code^="BS"]').first();
    const code = await label.getAttribute('data-mexico-nature-label-code'); await label.click(); await settled(page);
    assert((await text(page, '[data-mexico-nature-feature-title]')).includes(code));
    assert((await text(page, '[data-mexico-nature-feature-body]')).length > 20);
    return {sourceCode: code, title: await text(page, '[data-mexico-nature-feature-title]')};
  });
  await step('Both city plots and Japanese reading follow selection, reload and history', async () => {
    const ids = await page.locator('svg [data-mexico-climate-city]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-mexico-climate-city')));
    assert.equal(ids.length, 2);
    for (const id of ids) {
      await click(page, `svg [data-mexico-climate-city="${id}"]`);
      assert(await page.locator(`[data-mexico-climate-plot="${id}"]`).isVisible());
      assert((await text(page, `[data-mexico-climate-city-reading="${id}"]`)).length > 30);
      assert.match(await text(page, `[data-mexico-climate-plot="${id}"]`), /1991[–—-]2020/);
    }
    await reload(page);
    await history(page, () => click(page, `svg [data-mexico-climate-city="${ids[0]}"]`));
  });
  await step('Relief and climate switching retain a usable map and camera controls', async () => {
    await click(page, 'button[data-mexico-nature-view="relief"]');
    assert(await page.locator('[data-mexico-nature-relief-background] image').isVisible());
    await zoom(page, 'nature', '[data-mexico-nature-zoom="in"]', '[data-mexico-nature-zoom="out"]', '[data-mexico-nature-reset]');
    await history(page, () => click(page, 'button[data-mexico-nature-view="climate"]'));
  });
}

async function hydrologyReady(page, category) {
  await page.waitForFunction(category => {
    const node = document.querySelector('[data-mexico-field="nature"]');
    return node?.dataset.mexicoHydrologyReady === 'true' && (!category || node.dataset.mexicoPreparedCategory === category);
  }, category, {timeout: 45_000});
}
async function water({page, evidence}) {
  const step = steps(page, evidence);
  await step('Water peer tabs preserve the ten original groundwater classes and meaning', async () => {
    await click(page, 'button[data-mexico-nature-category="rivers-groundwater"]'); await hydrologyReady(page);
    assert.equal(await page.locator('[data-mexico-nature-water-tabs] button').count(), 3);
    const options = await page.locator('select[data-mexico-groundwater-class] option').allTextContents(); assert.equal(options.length, 11);
    assert.equal(await page.locator('select[data-mexico-groundwater-class]').inputValue(), 'all');
    assert.match(await text(page, '[data-mexico-nature-period]'), /1996.*2008/);
    assert.match(await text(page, '[data-mexico-hydrology-body]'), /固結|非固結/);
    return {options, period: await text(page, '[data-mexico-nature-period]')};
  });
  await step('Annual precipitation surface, units, period and image load', async () => {
    await click(page, 'button[data-mexico-nature-category="precipitation"]'); await hydrologyReady(page, 'precipitation');
    assert.match(await text(page, '[data-mexico-quantitative-legend]'), /mm\/年/);
    assert.match(await text(page, '[data-mexico-nature-period]'), /1991[–—-]2020/);
    assert.match(await page.locator('image[data-mexico-numeric-image]').getAttribute('href'), /gpcc.*annual\.png/);
    return {legend: await text(page, '[data-mexico-quantitative-legend]')};
  });
  await step('Three representative domestic basin systems expose their evidence limit', async () => {
    await click(page, 'button[data-mexico-nature-category="basins"]'); await hydrologyReady(page, 'basins');
    assert.equal(await page.locator('button[data-mexico-basin-system]').count(), 3);
    for (const id of ['bravo', 'lerma-chapala-santiago', 'grijalva-usumacinta']) {
      await click(page, `button[data-mexico-basin-system="${id}"]`); await hydrologyReady(page, 'basins');
      assert.equal(await page.locator(`button[data-mexico-basin-system="${id}"]`).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('g[data-mexico-prepared-surface]').getAttribute('data-mexico-basin-system'), id);
    }
    assert.match(await text(page, '#mexico-nature-map-desc'), /未確認/);
    assert.match(await text(page, '[data-mexico-hydrology-body]'), /国外|国内|国境/);
    await history(page, async () => {await click(page, 'button[data-mexico-nature-category="precipitation"]'); await hydrologyReady(page, 'precipitation');});
    await hydrologyReady(page, 'precipitation'); await reload(page); await hydrologyReady(page, 'precipitation');
  });
}

async function elevation({page, evidence}) {
  const step = steps(page, evidence);
  await step('Elevation surface and metre legend load without state selection', async () => {
    await click(page, 'button[data-mexico-nature-category="elevation"]'); await hydrologyReady(page, 'elevation');
    assert.match(await text(page, '[data-mexico-quantitative-legend]'), /標高.*m/);
    assert.match(await page.locator('image[data-mexico-numeric-image]').getAttribute('href'), /elevation-surface\.webp/);
    assert(await page.locator('[data-mexico-nature-state-select]').isDisabled());
    const paths = await page.locator('path[data-mexico-nature-state]').evaluateAll(nodes => nodes.map(node => ({disabled: node.getAttribute('aria-disabled'), tabIndex: node.getAttribute('tabindex'), pointerEvents: getComputedStyle(node).pointerEvents})));
    assert.equal(paths.length, 32); assert(paths.every(node => node.disabled === 'true' && node.tabIndex === '-1' && node.pointerEvents === 'none'));
    return {legend: await text(page, '[data-mexico-quantitative-legend]'), statePaths: paths.length};
  });
  await step('Elevation zoom and reload, with state selection retained in other tabs', async () => {
    await zoom(page, 'nature', '[data-mexico-nature-zoom="in"]', '[data-mexico-nature-zoom="out"]', '[data-mexico-nature-reset]'); await hydrologyReady(page, 'elevation');
    const state = query(page, 'state');
    await click(page, 'button[data-mexico-nature-view="climate"]'); assert(await page.locator('[data-mexico-nature-state-select]').isEnabled()); assert.equal(query(page, 'state'), state);
    await history(page, async () => {await click(page, 'button[data-mexico-nature-category="elevation"]'); await hydrologyReady(page, 'elevation');});
    await hydrologyReady(page, 'elevation');
  });
}

async function industry({page, evidence}) {
  const step = steps(page, evidence);
  await step('Industry labels remain separate and connected to their source state', async () => {
    const labels = await page.locator('[data-mi-reading-markers] [data-mi-region-label]').evaluateAll(nodes => nodes.filter(node => !node.closest('[hidden]') && node.getBoundingClientRect().width > 0).map(node => {
      const box = node.getBoundingClientRect(), matrix = node.getScreenCTM();
      return {name: node.textContent, x: box.x, y: box.y, width: box.width, height: box.height, screenFontSize: parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.a, matrix.b), leader: node.parentElement.querySelector('[data-mi-region-leader]')?.getAttribute('d')};
    }));
    assert(labels.length >= 8, 'All-sector overview is missing state labels');
    for (const [index, a] of labels.entries()) {
      assert.match(a.leader, /^M0,0L/); assert(Math.abs(a.screenFontSize - 14) < .5);
      for (const b of labels.slice(index + 1)) assert(!(Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > .5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > .5), `Industry labels overlap: ${a.name} / ${b.name}`);
    }
    await zoom(page, 'industry', '[data-mi-map-action="in"]', '[data-mi-map-action="out"]', '[data-mi-map-action="fit"]');
    return labels;
  });
  await step('Sector, industry and state selection', async () => {
    await click(page, 'button[data-industry-sector="manufacturing"]');
    await click(page, 'button[data-industry-subsector="transport"][data-owner-sector="manufacturing"]');
    await select(page, '[data-mi-state-select]', '05');
    assert.equal(query(page, 'metric'), 'transport'); assert.equal(query(page, 'state'), '05');
    assert(await page.locator('[data-mi-industry-panel="manufacturing:transport"]').isVisible());
  });
  await step('Selected-state camera, only-state display and reset', async () => {
    const before = await frame(page, 'industry'); await click(page, '[data-mi-zoom]'); assert.notEqual(await frame(page, 'industry'), before);
    await check(page, '[data-mi-only]', true); await reload(page); await check(page, '[data-mi-only]', false);
    await click(page, '[data-mi-all]'); assert.equal(await frame(page, 'industry'), before);
  });
  await step('Two industry metrics compare and return, including browser history', async () => {
    const before = await snapshot(page);
    await history(page, () => click(page, '[data-mi-electronics-link]'));
    assert(await page.locator('[data-mi-figure="secondary"]').isVisible()); assert.equal(query(page, 'compare'), 'electronics');
    await click(page, '[data-mi-return]'); await restored(page, before, 'Industry comparison return must preserve the original selection');
  });
  await step('Industry population comparison retains period and source direction', async () => {
    await click(page, '[data-mi-population-link]'); assert.equal(query(page, 'compare'), 'population'); assert.equal(query(page, 'from'), 'industry');
    assert.match(await text(page, '[data-mi-period-note]'), /2020.*2025|2025.*2020/); await reload(page);
  });
}

async function population({page, evidence}) {
  const step = steps(page, evidence);
  await step('Nationwide initial population, state selection, scale comparison and return', async () => {
    assert.equal(await page.locator('[data-population-state]').inputValue(), ''); assert.equal(query(page, 'state'), null);
    assert.match(await text(page, '[data-population-selected-name]'), /全国/);
    await select(page, '[data-population-state]', '09');
    await history(page, () => select(page, '[data-population-view]', 'population'));
    const before = await snapshot(page); await click(page, '[data-population-scale-link]'); assert.equal(query(page, 'compare'), 'scale');
    await click(page, '[data-population-return]'); await restored(page, before, 'Scale comparison return must preserve population mode and state');
  });
  await step('Population camera survives reload and resets', () => zoom(page, 'population', '[data-population-map-action="in"]', '[data-population-map-action="out"]', '[data-population-map-action="fit"]'));
  await step('Population → nature and industry → source return', async () => {
    const before = await snapshot(page);
    await click(page, '[data-population-nature-link]'); assert.equal(query(page, 'from'), 'population'); assert.equal(query(page, 'sourceView'), 'population');
    await click(page, '[data-mexico-nature-source-return]'); await restored(page, before, 'Nature return must preserve the population source');
    await click(page, '[data-population-industry-link]'); assert.equal(query(page, 'from'), 'population'); assert.equal(query(page, 'sourceView'), 'population');
    await click(page, '[data-mi-return]'); await restored(page, before, 'Industry return must preserve the population source');
  });
  await step('Clear state returns to nationwide statistics and survives reload/history', async () => {
    await history(page, () => click(page, '[data-population-reset]'));
    assert.equal(query(page, 'state'), null); assert.equal(await page.locator('[data-population-state]').inputValue(), '');
    assert.match(await text(page, '[data-population-selected-name]'), /全国/); await reload(page);
  });
  await step('Nationwide population comparison returns without inventing a selected state', async () => {
    const before = await snapshot(page);
    await click(page, '[data-population-industry-link]'); assert.equal(query(page, 'sourceState'), '');
    await click(page, '[data-mi-return]'); await restored(page, before, 'Nationwide comparison return must keep state empty');
  });
}

const commonReligionBins = [
  {min: 0, max: 1, color: '#edf3df'}, {min: 1, max: 5, color: '#d1e6c6'}, {min: 5, max: 10, color: '#a1ceb1'},
  {min: 10, max: 25, color: '#70b3a5'}, {min: 25, max: 50, color: '#41958e'}, {min: 50, max: 75, color: '#24756f'}, {min: 75, max: null, color: '#154d49'},
];
async function composition({page, evidence}) {
  const step = steps(page, evidence);
  const config = JSON.parse(await text(page, '[data-population-composition-config]'));
  await step('Ethnicity nationwide entrance, detail and count/share comparison return', async () => {
    await click(page, 'button[data-population-category="ethnicity"]'); assert(await page.locator('[data-population-overview-category="ethnicity"]').isVisible());
    await click(page, '[data-population-overview-category="ethnicity"] [data-population-overview-metric]');
    assert.equal(query(page, 'state'), null); assert.match(await text(page, '[data-population-composition-selected-name]'), /全国/);
    await select(page, '[data-population-state]', '20'); await select(page, '[data-population-view]', 'count');
    const before = await snapshot(page); await click(page, '[data-population-composition-compare]'); assert.equal(query(page, 'compositionCompare'), 'scale');
    await click(page, '[data-population-composition-return]'); await restored(page, before, 'Composition return must preserve source metric, state and measure');
  });
  await step('Three nationwide religion maps use identical absolute-share bands', async () => {
    await click(page, 'button[data-population-category="religion"]');
    const cards = page.locator('[data-population-overview-category="religion"] [data-population-overview-metric]'); assert.equal(await cards.count(), 3);
    const colors = await cards.evaluateAll(nodes => nodes.map(node => ({id: node.getAttribute('data-population-overview-metric'), states: [...node.querySelectorAll('[data-overview-state]')].map(path => ({state: path.getAttribute('data-overview-state'), fill: path.getAttribute('fill')}))})));
    for (const card of colors) {
      assert.equal(card.states.length, 32); const metric = config.metrics.find(item => item.id === card.id);
      for (const area of card.states) {const row = metric.states[area.state], share = row.count / row.denominator * 100; const bin = commonReligionBins.find(bin => share >= bin.min && (bin.max === null || share < bin.max)); assert.equal(area.fill, bin.color, `${card.id}/${area.state}: nationwide color must encode the common absolute-share band`);}
    }
    return {metricIds: colors.map(card => card.id), statesPerMap: 32, commonBins: commonReligionBins};
  });
  await step('All eight religion details retain their own bands, actual shares and denominators', async () => {
    const metrics = config.metrics.filter(metric => metric.category === 'religion'); assert.equal(metrics.length, 8);
    await click(page, '[data-population-overview-category="religion"] [data-population-overview-metric="catholic"]');
    const verified = [];
    for (const metric of metrics) {
      await select(page, '[data-population-composition-metric]', metric.id);
      assert.equal(query(page, 'state'), null); assert.equal(query(page, 'compositionMetric'), metric.id);
      const precision = metric.sharePrecision ?? 1, percent = metric.nationalCount / metric.nationalDenominator * 100;
      const expected = percent === 0 ? '0%' : percent < 10 ** -precision ? `<${(10 ** -precision).toLocaleString('ja-JP', {maximumFractionDigits: precision})}%` : `${percent.toLocaleString('ja-JP', {minimumFractionDigits: precision, maximumFractionDigits: precision})}%`;
      assert.equal(await text(page, '[data-population-composition-share]'), expected);
      assert.equal(await text(page, '[data-population-composition-denominator]'), metric.nationalDenominator.toLocaleString('ja-JP'));
      const labels = await page.locator('[data-population-composition-color-key] li').allTextContents();
      if (metric.shareBins) assert.deepEqual(labels.map(label => label.trim()), [...metric.shareBins.map(bin => bin.label), '欠測・秘匿・未取得']);
      verified.push({metric: metric.id, nationalShare: expected, denominator: metric.nationalDenominator, labels});
    }
    await reload(page); return verified;
  });
  await step('Return to the nationwide religion entrance through browser history and reload', async () => {
    await history(page, () => click(page, '[data-population-national]')); await reload(page);
    assert(await page.locator('[data-population-overview-category="religion"]').isVisible());
  });
}

export const mexicoPCOperationCases = [
  {country: 'mexico', field: 'agriculture', id: 'selection-roundtrip', run: agriculture},
  {country: 'mexico', field: 'nature', id: 'climate-and-relief', run: climate},
  {country: 'mexico', field: 'nature', id: 'water-and-precipitation', run: water},
  {country: 'mexico', field: 'nature', id: 'elevation', run: elevation},
  {country: 'mexico', field: 'industry', id: 'comparison-roundtrip', run: industry},
  {country: 'mexico', field: 'population', id: 'distribution-roundtrip', run: population},
  {country: 'mexico', field: 'population', id: 'composition-roundtrip', run: composition, captureSelectors: {map: '[data-population-overview-maps]'}},
];
