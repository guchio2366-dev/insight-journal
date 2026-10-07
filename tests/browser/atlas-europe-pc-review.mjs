// Use an existing production preview; this script neither builds nor downloads a browser.
// EUROPE_REVIEW_BASE_URL, EUROPE_REVIEW_OUTPUT, EUROPE_REVIEW_CHROMIUM_PATH,
// and EUROPE_REVIEW_EXPECTED_HEAD may be supplied by the Europe-only CI job.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const base = new URL(process.env.EUROPE_REVIEW_BASE_URL ?? 'http://127.0.0.1:4173/insight-journal/');
assert.equal(base.protocol, 'http:', 'Only a local HTTP production preview is accepted');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
assert.equal(base.username + base.password + base.search + base.hash, '');
assert.ok(base.pathname.endsWith('/'));
const repository = fileURLToPath(new URL('../../', import.meta.url));
const git = (...args) => execFileSync('git', args, {cwd: repository, encoding: 'utf8'}).trim();
const output = resolve(process.env.EUROPE_REVIEW_OUTPUT ?? '/tmp/europe-pc-review');
await mkdir(output, {recursive: true});
assert.deepEqual(await readdir(output), [], 'Use a new empty output directory; earlier evidence must not be mixed or overwritten');
const manifest = {
  status: 'running', startedAt: new Date().toISOString(), sourceURL: base.href,
  gitHead: git('rev-parse', 'HEAD'), gitSrcTree: git('rev-parse', 'HEAD:src'),
  gitStatus: git('status', '--porcelain'), expectedHead: process.env.EUROPE_REVIEW_EXPECTED_HEAD ?? null,
  scriptSha256: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
  ci: Object.fromEntries(['GITHUB_REPOSITORY', 'GITHUB_WORKFLOW', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA', 'GITHUB_HEAD_REF', 'GITHUB_BASE_REF'].map(key => [key, process.env[key] ?? null])),
  fonts: {available: process.env.EUROPE_REVIEW_JAPANESE_FONTS ?? null, match: process.env.EUROPE_REVIEW_JAPANESE_FONT_MATCH ?? null, setup: process.env.EUROPE_REVIEW_JAPANESE_FONT_SETUP ?? null},
  records: [], images: [], comparisons: [],
  limits: ['US visual comparison covers climate only; US contour/water/population data and parity are not asserted.', 'Explicit static coverage is limited to 1024×800 and is not counted as a normal-render comparison.', 'SVG extent checks do not establish that the live MapLibre camera is unchanged.'],
  network: {policy: 'Exact local preview origin only; redirects checked before following; service workers blocked.', requests: [], rejected: [], failures: []},
  pageErrors: [], consoleErrors: [], checks: [],
};
const save = () => writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
const sameOrigin = value => { try { const url = new URL(value); return url.protocol === 'http:' && url.origin === base.origin; } catch { return false; } };
const localDocument = value => value === 'about:blank' || value.startsWith('data:') || value.startsWith(`blob:${base.origin}/`) || sameOrigin(value);
const resultSelector = '[data-eu-subject-result]';
const pointSelector = '[data-eu-selected-point]';
const profiles = [{name: 'desktop', viewport: {width: 1440, height: 1000}}, {name: 'compact-pc', viewport: {width: 1024, height: 800}}];
let browser, activeRecord;

function reject(url, kind, profile) {
  manifest.network.rejected.push({url, kind, profile});
}

async function guardedContext(profile) {
  const context = await browser.newContext({viewport: profile.viewport, reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: false});
  context.setDefaultTimeout(25_000);
  context.setDefaultNavigationTimeout(35_000);
  // Fetch with redirects disabled, then fulfill the original response. This also
  // guards redirect targets that Playwright's initial-request route alone misses.
  await context.route('**/*', async route => {
    const request = route.request(), url = request.url();
    if (!sameOrigin(url)) { reject(url, 'request', profile.name); await route.abort('blockedbyclient'); return; }
    let response;
    try {
      response = await route.fetch({maxRedirects: 0, timeout: 30_000});
      const status = response.status(), location = response.headers().location;
      manifest.network.requests.push({url, status, type: request.resourceType(), profile: profile.name});
      if (status >= 300 && status < 400 && location) {
        const target = new URL(location, url).href;
        if (!sameOrigin(target)) { reject(target, 'redirect', profile.name); await route.abort('blockedbyclient'); return; }
      }
      if (status >= 400) manifest.network.failures.push({url, status, profile: profile.name});
      await route.fulfill({response});
    } catch (error) {
      if (context.pages().every(page => page.isClosed())) return;
      manifest.network.failures.push({url, error: String(error), profile: profile.name});
      await route.abort().catch(() => {});
    } finally { if (response) await response.dispose(); }
  });
  await context.routeWebSocket('**/*', socket => {
    // A production preview does not require WebSockets. Never connect an
    // unexpected socket, including one created by a popup or a nested frame.
    reject(socket.url(), 'websocket', profile.name);
    socket.close({code: 1008, reason: 'WebSockets are not used by this production review'});
  });
  context.on('page', page => {
    page.on('pageerror', error => manifest.pageErrors.push({profile: profile.name, url: page.url(), message: error.message}));
    page.on('console', message => { if (message.type() === 'error') manifest.consoleErrors.push({profile: profile.name, url: page.url(), message: message.text()}); });
    page.on('framenavigated', frame => { if (!localDocument(frame.url())) reject(frame.url(), 'frame-navigation', profile.name); });
    page.on('download', download => { reject(download.url(), 'unexpected-download', profile.name); void download.cancel(); });
  });
  context.on('request', request => { if (!localDocument(request.url())) reject(request.url(), 'request-observed', profile.name); });
  context.on('requestfailed', request => {
    const error = request.failure()?.errorText ?? 'unknown';
    // Navigation can cancel an obsolete local image. Keep that observation, but
    // failures other than that explicit cancellation fail the run.
    manifest.network.requests.push({url: request.url(), failed: error, profile: profile.name});
    if (error !== 'net::ERR_ABORTED') manifest.network.failures.push({url: request.url(), error, profile: profile.name});
  });
  return context;
}

function networkClean() {
  assert.deepEqual(manifest.network.rejected, [], 'Unexpected network destination; see manifest.network.rejected');
  assert.deepEqual(manifest.network.failures, [], 'Local asset/transport failure; see manifest.network.failures');
  assert.deepEqual(manifest.pageErrors, [], 'Browser exception; see manifest.pageErrors');
  assert.deepEqual(manifest.consoleErrors, [], 'Browser console error; see manifest.consoleErrors');
}

async function ready(page, region = 'europe', render = 'normal') {
  if (region === 'us') {
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-atlas-explorer]');
      return root?.dataset.renderState === 'fallback' || root?.dataset.renderState === 'ready' && root?.dataset.natureLoad === 'ready';
    });
  } else {
    await page.waitForFunction(() => document.querySelector('[data-europe-detail]')?.dataset.initialized === 'true');
    if (render === 'normal') await page.locator('[data-eu-live].is-ready').waitFor();
    else await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-eu-static]')).visibility === 'visible');
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const state = await page.evaluate(({region}) => {
    if (region === 'us') {
      const root = document.querySelector('[data-atlas-explorer]'), canvas = root.querySelector('[data-map-surface] canvas');
      return {renderState: root.dataset.renderState, natureLoad: root.dataset.natureLoad, natureMode: root.dataset.natureMode, fallbackHidden: root.querySelector('[data-fallback]').hidden, canvasWidth: canvas?.width ?? 0, canvasHeight: canvas?.height ?? 0};
    }
    const live = document.querySelector('[data-eu-live]'), canvas = live.querySelector('canvas');
    return {ready: live.classList.contains('is-ready'), staticVisibility: getComputedStyle(document.querySelector('[data-eu-static]')).visibility, canvasWidth: canvas?.width ?? 0, canvasHeight: canvas?.height ?? 0};
  }, {region});
  if (region === 'us') {
    if (state.renderState !== 'ready' || !state.fallbackHidden) manifest.limits.push({sourceURL: page.url(), reason: 'US climate did not render normally; no successful US comparison', state, unavailable: manifest.network.failures.filter(item => item.url.includes('/assets/atlas/'))});
    assert.equal(state.renderState, 'ready'); assert.equal(state.natureLoad, 'ready'); assert.equal(state.natureMode, 'climate'); assert.equal(state.fallbackHidden, true);
  } else if (render === 'normal') { assert.equal(state.ready, true); assert.equal(state.staticVisibility, 'hidden'); }
  else { assert.equal(new URL(page.url()).searchParams.get('render'), 'static'); assert.equal(state.ready, false); assert.equal(state.staticVisibility, 'visible'); }
  if (render === 'normal') { assert.ok(state.canvasWidth > 0); assert.ok(state.canvasHeight > 0); }
  networkClean();
  return {kind: render, ...state};
}

async function openEurope(page, path, render) {
  const url = new URL(path, base); if (render === 'explicit-static') url.searchParams.set('render', 'static');
  await page.goto(url.href, {waitUntil: 'networkidle'});
  return ready(page, 'europe', render);
}

async function settled(page, pattern = '（ETOPO 2022）') {
  await page.waitForFunction(pattern => {
    const node = document.querySelector('[data-eu-subject-result]');
    return node && !node.hasAttribute('aria-busy') && new RegExp(pattern).test(node.textContent);
  }, pattern);
  return page.locator(resultSelector).textContent();
}

async function measurements(page, region) {
  return page.evaluate(region => {
    const rectangle = node => { if (!node) return null; const r = node.getBoundingClientRect(); return {x: r.x, y: r.y + scrollY, width: r.width, height: r.height}; };
    return {map: rectangle(document.querySelector(region === 'us' ? '[data-map-frame]' : '.eu-map-stage')),
      legend: rectangle(region === 'us' ? document.querySelector('[data-nature-key]') : document.querySelector('[data-eu-farming-legend]:not([hidden])') ?? document.querySelector('[data-eu-map-legend]')),
      reader: rectangle(document.querySelector(region === 'us' ? '[data-field-national="natural"]' : '.eu-read-panel')),
      controls: [...document.querySelectorAll(region === 'us' ? '[data-map-action]' : '[data-eu-reset],[data-eu-zoom]')].map(node => ({
        ...rectangle(node), action: region === 'us' ? node.dataset.mapAction : node.hasAttribute('data-eu-reset') ? 'fit' : node.dataset.euZoom,
        fontSize: parseFloat(getComputedStyle(node).fontSize),
      })),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      viewport: {width: innerWidth, height: innerHeight}, documentHeight: document.documentElement.scrollHeight};
  }, region);
}

async function snapshot(page, profile, topic, region = 'europe') {
  const render = await ready(page, region);
  await page.evaluate(() => scrollTo(0, 0));
  const measured = await measurements(page, region); assert.equal(measured.horizontalOverflow, false);
  assert.ok(measured.legend?.height > 0 && measured.legend.y >= measured.map.y + measured.map.height - 1, 'Visible legend belongs below the map');
  assert.ok(measured.reader?.width >= 280 && measured.reader.x >= measured.map.x + measured.map.width, 'Reader belongs to the right of the map on PC');
  assert.deepEqual(measured.controls.map(item => item.action), ['fit', 'in', 'out']);
  for (const [index, control] of measured.controls.entries()) {
    // The unchanged US fit button uses 11px text in a 44px control. Keep the
    // Europe minimum at 12px while measuring that existing US reference as-is.
    const minimumFont = region === 'us' && control.action === 'fit' ? 11 : 12;
    assert.ok(control.width >= 32 && control.height >= 32 && control.fontSize >= minimumFont, `Map control size: ${JSON.stringify(control)}`);
    assert.ok(control.x >= measured.map.x && control.x + control.width <= measured.map.x + measured.map.width + 1);
    assert.ok(control.y >= measured.map.y && control.y + control.height <= measured.map.y + measured.map.height + 1);
    if (index) assert.ok(control.y >= measured.controls[index - 1].y + measured.controls[index - 1].height, 'Map controls retain fit / zoom in / zoom out order');
  }
  const filename = `${profile.name}-${region}-${topic}.png`;
  const png = await page.screenshot({path: resolve(output, filename), fullPage: true, animations: 'disabled'});
  manifest.images.push({file: filename, sourceURL: page.url(), profile: profile.name, viewport: profile.viewport, render,
    dimensions: {width: png.readUInt32BE(16), height: png.readUInt32BE(20)}, measurements: measured,
    sha256: createHash('sha256').update(png).digest('hex')});
  await save();
  return measured;
}

async function uniqueElevation(page) {
  assert.equal(await page.locator(resultSelector).count(), 1); assert.equal(await page.locator(`${pointSelector}:visible`).count(), 1);
  assert.equal(await page.locator(resultSelector).isVisible(), true);
  assert.equal(await page.locator('[data-eu-subject-grid]').isVisible(), true);
  assert.equal(await page.locator('.eu-read-panel [data-eu-subject-grid]').count(), 1);
  assert.equal(await page.locator('[data-eu-map-legend] [data-eu-subject-legend]').count(), 1);
  const fontSize = await page.locator(resultSelector).evaluate(node => parseFloat(getComputedStyle(node).fontSize)); assert.ok(fontSize >= 14);
  return fontSize;
}

async function completeAlpsCopy(page) {
  const copy = await page.evaluate(() => {
    const reading = JSON.parse(document.querySelector('[data-eu-config]').textContent).readings.find(item => item.id === 'alps');
    const card = document.querySelector('[data-eu-feature-card]');
    return {body: reading.body, text: card.textContent, source: reading.source, links: [...card.querySelectorAll('a')].map(link => link.href)};
  });
  assert.ok(copy.text.includes(copy.body), 'Keep the complete registered Alps explanation');
  assert.ok(copy.links.includes(copy.source), 'Keep its registered source link');
}

async function drainageState(page) {
  return page.evaluate(() => {
    const params = new URL(location.href).searchParams;
    return {point: params.get('point'), basin: params.get('basin'), choice: document.querySelector('[data-eu-drainage-choice]').value,
      outline: document.querySelector('[data-eu-drainage-selection]').style.display !== 'none',
      summary: document.querySelector('[data-eu-basin-summary]').textContent, result: document.querySelector('[data-eu-subject-result]').textContent,
      comparison: document.querySelector('[data-eu-comparison-link="drainage-density"]').href};
  });
}

async function feedbackPlacement(page) {
  assert.equal(await page.locator(resultSelector).count(), 1); assert.equal(await page.locator(resultSelector).isVisible(), true);
  const measured = await page.evaluate(() => {
    const group = document.querySelector('[data-eu-drainage-controls]'), summary = group.querySelector('[data-eu-basin-summary]');
    const grid = document.querySelector('[data-eu-subject-grid]'), result = document.querySelector('[data-eu-subject-result]');
    return {insideControls: grid.parentElement === group, afterSummary: summary.nextElementSibling === grid,
      gridGap: grid.getBoundingClientRect().top - summary.getBoundingClientRect().bottom,
      rightReader: group.closest('.eu-read-panel') !== null,
      externalChoicesHidden: group.querySelector('label').hidden && group.querySelector('button').hidden,
      fontSize: parseFloat(getComputedStyle(result).fontSize), live: result.getAttribute('aria-live'),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth || group.scrollWidth > group.clientWidth + 1};
  });
  assert.equal(measured.insideControls, true); assert.equal(measured.afterSummary, true);
  assert.equal(measured.rightReader, true); assert.equal(measured.externalChoicesHidden, true);
  assert.ok(measured.gridGap >= 0 && measured.gridGap <= 24, JSON.stringify(measured));
  assert.ok(measured.fontSize >= 14); assert.equal(measured.live, 'polite'); assert.equal(measured.horizontalOverflow, false);
  return measured;
}

async function europeOperations(page, profile, render) {
  const record = {profile: profile.name, viewport: profile.viewport, render, status: 'running', checks: []};
  manifest.records.push(record); activeRecord = record;
  const normal = render === 'normal';
  await openEurope(page, 'atlas/europe/nature/?layer=terrain', render);
  const history = await page.evaluate(() => history.length), svgExtent = await page.locator('[data-eu-static]').getAttribute('viewBox');
  await page.locator('[data-eu-feature-select="alps"]').click();
  const elevation = await settled(page), selectedPoint = new URL(page.url()).searchParams.get('point');
  assert.equal(selectedPoint, '9.5,46.6'); assert.match(elevation, /：2,283 m（ETOPO 2022）$/);
  assert.equal(await page.evaluate(() => history.length), history + 1);
  assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'), svgExtent);
  record.elevation = {value: elevation, point: selectedPoint, fontSize: await uniqueElevation(page)};
  await completeAlpsCopy(page);
  await page.locator('[data-eu-topic="contours"]').click(); await ready(page, 'europe', render);
  assert.equal(await settled(page), elevation); assert.equal(new URL(page.url()).searchParams.get('point'), selectedPoint);
  assert.match(await page.locator('[data-eu-legend-title]').textContent(), /500m間隔/);
  assert.doesNotMatch(await page.locator(resultSelector).textContent(), /間隔|標高 m/);
  assert.deepEqual(await page.locator('[data-eu-legend-items] .eu-swatch').evaluateAll(nodes => nodes.slice(0, 2).map(node => getComputedStyle(node).backgroundColor)), ['rgb(184, 161, 130)', 'rgb(134, 103, 71)']);
  await uniqueElevation(page);
  const readerCopy = await page.locator('[data-eu-subject-reader]').textContent();
  if (normal) await snapshot(page, profile, 'contours');
  await page.goBack(); await ready(page, 'europe', render); assert.equal(await settled(page), elevation);
  assert.equal(new URL(page.url()).searchParams.get('layer'), 'terrain');
  await page.goBack(); await ready(page, 'europe', render);
  assert.equal(new URL(page.url()).searchParams.has('point'), false); assert.equal(await page.locator(`${pointSelector}:visible`).count(), 0);
  assert.match(await page.locator(resultSelector).textContent(), /^地図を押すと/);
  assert.equal(await page.locator(resultSelector).getAttribute('aria-busy'), null);
  await page.goForward(); await ready(page, 'europe', render); assert.equal(await settled(page), elevation);
  await page.goForward(); await ready(page, 'europe', render); assert.equal(await settled(page), elevation);
  await page.reload({waitUntil: 'networkidle'}); await ready(page, 'europe', render); assert.equal(await settled(page), elevation);
  assert.equal(await page.locator('[data-eu-subject-reader]').textContent(), readerCopy);
  await page.locator('[data-eu-comparison-link="nature-density"]').click(); await page.waitForURL('**/population/**'); await ready(page, 'europe', render);
  assert.equal(new URL(page.url()).searchParams.get('point'), selectedPoint);
  await page.locator('[data-eu-comparison-return]').click(); await page.waitForURL('**/nature/**'); await ready(page, 'europe', render);
  assert.equal(await settled(page), elevation); assert.equal(new URL(page.url()).searchParams.get('point'), selectedPoint);
  assert.equal(new URL(page.url()).searchParams.has('europeReturn'), false);
  await page.locator('.eu-map-stage').scrollIntoViewIfNeeded();
  const bounds = await page.locator('.eu-map-stage').boundingBox(); assert.ok(bounds);
  const beforeClick = await page.evaluate(() => history.length);
  await page.mouse.click(bounds.x + bounds.width * .43, bounds.y + bounds.height * .48);
  const clicked = await settled(page), clickedPoint = new URL(page.url()).searchParams.get('point');
  assert.ok(clickedPoint); assert.notEqual(clickedPoint, selectedPoint); assert.equal(await page.evaluate(() => history.length), beforeClick + 1);
  await page.goBack(); assert.equal(await settled(page), elevation);
  await page.goForward(); assert.equal(await settled(page), clicked);
  await page.reload({waitUntil: 'networkidle'}); await ready(page, 'europe', render); assert.equal(await settled(page), clicked);
  if (!normal) {
    await page.locator('[data-eu-render]').click(); await ready(page); assert.equal(await settled(page), clicked);
    await page.locator('[data-eu-render]').click(); await ready(page, 'europe', render); assert.equal(await settled(page), clicked);
  }
  record.elevation.clicked = {point: clickedPoint, value: clicked};
  record.checks.push('metres separate from contour interval', 'same point and elevation across terrain/contours', 'single marker/result/legend', 'one history entry per selection', 'SVG extent retained', 'unselected back/forward', 'reload retains reader text', 'named comparison return', 'real map click and history');

  await openEurope(page, 'atlas/europe/nature/?layer=drainage', render);
  await page.locator('[data-eu-feature-select="rhine"]').click(); await settled(page, '表示格子中心.*BasinATLAS');
  await page.waitForFunction(() => document.querySelector('[data-eu-drainage-selection]').style.display !== 'none');
  const selected = await drainageState(page); assert.ok(selected.point); assert.ok(selected.basin); assert.doesNotMatch(selected.result, /データなし/);
  const selectedFeedback = await feedbackPlacement(page);
  await page.locator('.eu-map-stage').scrollIntoViewIfNeeded();
  const drainageBounds = await page.locator('.eu-map-stage').boundingBox(); assert.ok(drainageBounds);
  await page.mouse.click(drainageBounds.x + 8, drainageBounds.y + drainageBounds.height * .2);
  await settled(page, '表示範囲外');
  const outside = await drainageState(page), outsideFeedback = await feedbackPlacement(page);
  assert.equal(outside.point, null); assert.equal(outside.basin, null); assert.equal(outside.choice, ''); assert.equal(outside.outline, false);
  assert.match(outside.summary, /色は区画を見分けるための識別色/);
  const comparison = new URL(outside.comparison), origin = new URLSearchParams(comparison.searchParams.get('europeReturn') ?? '');
  assert.equal(comparison.searchParams.has('basin'), false); assert.equal(origin.has('basin'), false); assert.equal(origin.has('point'), false);
  if (normal) await snapshot(page, profile, 'drainage-outside');
  await page.goBack(); await ready(page, 'europe', render); await settled(page, '表示格子中心.*BasinATLAS');
  await page.waitForFunction(() => document.querySelector('[data-eu-drainage-selection]').style.display !== 'none');
  assert.equal((await drainageState(page)).basin, selected.basin);
  await page.goForward(); await ready(page, 'europe', render); assert.equal((await drainageState(page)).basin, null);
  await page.reload({waitUntil: 'networkidle'}); await ready(page, 'europe', render);
  const reloaded = await drainageState(page); assert.equal(reloaded.basin, null); assert.equal(reloaded.point, null); assert.equal(reloaded.choice, ''); assert.equal(reloaded.outline, false); await feedbackPlacement(page);
  record.drainage = {selected, selectedFeedback, outside, outsideFeedback};
  record.checks.push('real valid basin then outside click clears point/basin/outline/comparison', 'single live drainage result below summary at >=14px', 'drainage back/forward/reload');

  await openEurope(page, 'atlas/europe/population/?layer=density', render);
  await page.locator('.eu-map-stage').scrollIntoViewIfNeeded();
  const londonPixel = await page.evaluate(() => {
    const overlay = document.querySelector('[data-eu-annotations]'), buttons = [...overlay.querySelectorAll('button[data-eu-map-place]')];
    const index = buttons.findIndex(node => node.textContent === 'ロンドン' && node.dataset.euMapKind === 'feature');
    if (index < 0) throw new Error('London annotation missing');
    const dot = overlay.querySelectorAll('.eu-label-dot')[index].getBoundingClientRect(); return {x: dot.x + dot.width / 2, y: dot.y + dot.height / 2};
  });
  await page.mouse.click(londonPixel.x, londonPixel.y);
  const density = await settled(page, '（2020）'), sourcePoint = new URL(page.url()).searchParams.get('point'); assert.ok(sourcePoint);
  const [longitude, latitude] = sourcePoint.split(',').map(Number);
  // At the compact frame, one screen pixel spans about 0.2° near London.
  assert.ok(Math.hypot(longitude + .1187, latitude - 51.5019) < .5, sourcePoint);
  await page.locator('[data-eu-comparison-link="population-terrain"]').click(); await page.waitForURL('**/nature/**'); await ready(page, 'europe', render);
  const targetValue = await settled(page), targetURL = new URL(page.url());
  assert.equal(targetURL.searchParams.get('feature'), 'alps'); assert.equal(targetURL.searchParams.get('point'), '9.5,46.6'); assert.equal(targetValue, elevation);
  assert.match(await page.locator('[data-eu-feature-card]').textContent(), /アルプス/); await uniqueElevation(page);
  await completeAlpsCopy(page);
  await page.reload({waitUntil: 'networkidle'}); await ready(page, 'europe', render); assert.equal(await settled(page), targetValue);
  if (normal) await snapshot(page, profile, 'population-to-alps');
  await page.locator('[data-eu-comparison-return]').click(); await page.waitForURL('**/population/**'); await ready(page, 'europe', render);
  assert.equal(await settled(page, '（2020）'), density); assert.equal(new URL(page.url()).searchParams.get('point'), sourcePoint);
  await page.goBack(); await ready(page, 'europe', render); assert.equal(await settled(page), targetValue);
  await page.goForward(); await ready(page, 'europe', render); assert.equal(await settled(page, '（2020）'), density);
  record.comparison = {sourcePoint, density, targetURL: targetURL.href, targetValue};
  record.checks.push('London density to named Alps point/heading/value', 'comparison reload and exact source restoration', 'comparison history');
  if (!normal) record.checks.push('explicit static to normal and back preserves clicked point/value');
  assert.equal((await measurements(page, 'europe')).horizontalOverflow, false); networkClean();
  record.status = 'passed'; await save();
}

async function stageOneOperations(page, profile) {
  await openEurope(page, 'atlas/europe/nature/?layer=climate', 'normal');
  assert.equal(await page.locator('[data-eu-city-choice]').inputValue(), '');
  assert.equal(await page.locator('[data-eu-climate-overview]').isVisible(), true);
  assert.equal(await page.locator('[data-city-reading]:visible').count(), 0);
  await page.locator('[data-eu-city-choice]').selectOption('london');
  const climate = page.locator('[data-city-reading]:visible');
  assert.equal(await page.locator('.eu-read-panel').evaluate(node => node.scrollHeight <= node.clientHeight + 1), true, 'Climate text stays inside the reader panel');
  for (const selector of ['.eu-city-climate-description', '.eu-climate-farming']) {
    assert.equal(await climate.locator(selector).isVisible(), true);
    assert.equal(await climate.locator(selector).evaluate(node => node.closest('details') === null), true);
    assert.ok(await climate.locator(selector).evaluate(node => parseFloat(getComputedStyle(node.querySelector('p')).fontSize) >= 14));
  }
  await page.locator('[data-eu-city-choice]').selectOption('');
  assert.equal(await page.locator('[data-eu-climate-overview]').isVisible(), true);
  assert.equal(await page.locator('[data-city-reading]:visible').count(), 0);
  assert.equal(await page.locator('[data-eu-climate-statistics]').isVisible(), false);
  await openEurope(page, 'atlas/europe/nature/?layer=precipitation', 'normal');
  assert.equal(await page.locator('[data-eu-legend-items] > div').count(), 14);
  assert.match(await page.locator('[data-eu-legend-items]').textContent(), /250未満.*3,000以上/s);
  await snapshot(page, profile, 'precipitation-250mm');
  await openEurope(page, 'atlas/europe/nature/?layer=drainage', 'normal');
  await page.locator('[data-eu-map-place="rhine"][data-eu-map-kind="feature"]').click();
  await page.waitForFunction(() => document.querySelector('[data-eu-basin-summary]').textContent.includes('ライン川'));
  assert.match(await page.locator('[data-eu-basin-summary]').textContent(), /同じMAIN_BAS.*モデル区画/);
  await snapshot(page, profile, 'drainage-river-reading');
  await openEurope(page, 'atlas/europe/industry/?layer=hubs', 'normal');
  assert.equal(new URL(page.url()).searchParams.has('feature'), false);
  await snapshot(page, profile, 'industry-overview');
  const industryExtent = await page.locator('[data-eu-static]').getAttribute('viewBox');
  const industryPoints = await page.locator('[data-eu-feature-options] option').count();
  await page.locator('[data-eu-industry-group="機械・輸送"]').click();
  assert.equal(new URL(page.url()).searchParams.has('place'), false);
  assert.equal(new URL(page.url()).searchParams.has('feature'), false);
  assert.equal(await page.locator('[data-eu-feature-options] option').count(), industryPoints);
  assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'), industryExtent);
  await page.locator('[data-eu-industry-scope]').selectOption('country:DEU');
  assert.equal(await page.locator('[data-eu-country-reader]').isVisible(), true);
  assert.match(await page.locator('[data-eu-national-values]').textContent(), /18.94.*26.8.*63.62/s);
  assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'), industryExtent);
  await snapshot(page, profile, 'industry-country-group');
  await page.locator('[data-eu-topic-field="industry"] [data-eu-topic="hubs"]:not([data-eu-industry-group])').click();
  assert.equal(await page.locator('[data-eu-industry-scope]').inputValue(), 'region:all');
  assert.equal(new URL(page.url()).searchParams.has('place'), false);
  assert.equal(new URL(page.url()).searchParams.has('industryGroup'), false);
  assert.equal(await page.locator('[data-eu-country-reader]').isVisible(), false);

  await openEurope(page, 'atlas/europe/population/?layer=density', 'normal');
  assert.equal(new URL(page.url()).searchParams.has('place'), false);
  await snapshot(page, profile, 'population-overview');
  const populationExtent = await page.locator('[data-eu-static]').getAttribute('viewBox');
  const [parisId] = await page.locator('[data-eu-feature-choice]').selectOption({label:'パリ'});
  await settled(page, '（2020）');
  assert.equal(await page.locator('[data-eu-subject-grid]').evaluate(node => !!node.closest('.eu-read-panel')), true);
  assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'), populationExtent);
  assert.equal(new URL(page.url()).searchParams.get('feature'), parisId);
  await snapshot(page, profile, 'population-city-density');
  await openEurope(page, 'atlas/europe/population/?layer=ethnicity', 'normal');
  const extent = () => page.locator('[data-eu-static]').getAttribute('viewBox');
  const fullExtent = await extent();
  for (const name of ['case', 'category', 'area']) assert.equal(await page.locator(`[data-culture-${name}]`).inputValue(), '');
  assert.equal(await page.locator('[data-culture-value]').isVisible(), false);
  const compositionCheck=async()=>{
    const buttons=page.locator('[data-eu-composition]:visible');assert.equal(await buttons.count(),3);
    const boxes=await buttons.evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:box.width,height:box.height,font:parseFloat(getComputedStyle(node).fontSize),svg:node.querySelector('svg').getAttribute('viewBox')};}));
    for(const box of boxes){assert.ok(box.font>=14);assert.equal(box.svg,'0 0 56 56');assert.equal(box.width,boxes[0].width);}
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'Composition labels do not overlap');}
    assert.equal(await page.locator('[data-eu-culture-composition-key]').isVisible(),true);
    assert.equal(await page.locator('[data-eu-composition-table]').count(),3);
  };
  await compositionCheck();
  await snapshot(page, profile, 'culture-overview');
  await page.locator('[data-eu-composition="ethnicity-E92000001"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-culture-code]').length === 331);
  assert.equal(await page.locator('[data-eu-composition]:visible').count(),0);
  for (const name of ['category', 'area']) assert.equal(await page.locator(`[data-culture-${name}]`).inputValue(), '');
  assert.equal(await extent(), fullExtent);
  await page.locator('[data-culture-category]').selectOption('ts021-17');
  assert.equal(await page.locator('[data-culture-area]').inputValue(), '');
  assert.equal(await extent(), fullExtent);
  await page.locator('[data-culture-area]').selectOption('E06000002');
  const selectedURL = page.url(), selectedValue = await page.locator('[data-culture-value]').textContent();
  assert.equal(await extent(), fullExtent);
  assert.equal(await page.locator('[data-culture-code]').count(), 331);
  assert.match(selectedValue, /Middlesbrough/);
  assert.equal(await page.locator('.eu-read-panel').evaluate(node => node.scrollHeight <= node.clientHeight + 1), true, 'Culture values and disclosure stay inside the reader panel');
  await snapshot(page, profile, 'culture-selected');
  await page.goBack(); await ready(page);
  assert.equal(await page.locator('[data-culture-area]').inputValue(), '');
  assert.equal(await page.locator('[data-culture-value]').isVisible(), false);
  await page.goForward(); await ready(page);
  assert.equal(await page.locator('[data-culture-value]').textContent(), selectedValue);
  await page.reload({waitUntil: 'networkidle'}); await ready(page);
  assert.equal(page.url(), selectedURL);
  assert.equal(await page.locator('[data-culture-value]').textContent(), selectedValue);
  assert.equal(await extent(), fullExtent);
  await page.locator('[data-eu-comparison-link="culture-hubs"]').click(); await page.waitForURL('**/industry/**'); await ready(page);
  assert.match(await page.locator('[data-eu-origin-caption]').textContent(), /Middlesbrough/);
  await page.locator('[data-eu-comparison-return]').click(); await page.waitForURL('**/population/**'); await ready(page);
  assert.equal(await page.locator('[data-culture-value]').textContent(), selectedValue);
  assert.equal(await extent(), fullExtent);
  await page.locator('[data-culture-case]').selectOption(''); await ready(page);
  for (const name of ['case', 'category', 'area']) assert.equal(new URL(page.url()).searchParams.has(`culture${name[0].toUpperCase()}${name.slice(1)}`), false);
  assert.equal(await page.locator('[data-culture-value]').isVisible(), false);
  await page.locator('[data-eu-comparison-link="culture-hubs"]').click(); await page.waitForURL('**/industry/**'); await ready(page);
  assert.match(await page.locator('[data-eu-origin-caption]').textContent(), /未選択/);
  await page.locator('[data-eu-comparison-return]').click(); await page.waitForURL('**/population/**'); await ready(page);
  assert.equal(await page.locator('[data-culture-case]').inputValue(), '');
  await compositionCheck();
  await openEurope(page, 'atlas/europe/population/?layer=religion', 'normal');
  for (const name of ['case', 'category', 'area']) assert.equal(await page.locator(`[data-culture-${name}]`).inputValue(), '');
  await compositionCheck();await snapshot(page,profile,'religion-overview');
  await openEurope(page, 'atlas/europe/agriculture/?layer=wheat', 'normal');
  const table = page.locator('[data-eu-farm-country-table]');
  await table.waitFor({state: 'visible'});
  assert.equal(await table.evaluate(node => node.open), false);
  const values = await table.locator('[data-eu-farm-country-rows]').textContent();
  assert.ok(values.length > 100);
  assert.match(await page.locator('[data-eu-farming-statistics]').textContent(), /未収録.*ゼロという意味ではありません/s);
  await snapshot(page, profile, 'farming-closed-table');
  await table.locator('summary').click();
  assert.equal(await table.evaluate(node => node.open), true);
  assert.equal(await table.locator('[data-eu-farm-country-rows]').textContent(), values);
  await table.locator('summary').click();
  const farmingExtent = await page.locator('[data-eu-static]').getAttribute('viewBox');
  await page.locator('select[data-eu-farm-country]').selectOption('DEU');
  await page.waitForFunction(() => document.querySelectorAll('[data-eu-farm-share-chart] svg').length === 1);
  assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'), farmingExtent);
  assert.match(await page.locator('[data-eu-farm-share-status]').textContent(), /ドイツ.*2024年.*%/);
  assert.equal(await page.locator('[data-eu-farm-three-columns] > section').count(), 3);
  const columns = await page.locator('[data-eu-farm-three-columns] > section').evaluateAll(nodes => nodes.map(node => {const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};}));
  assert.ok(columns.every(column => Math.abs(column.y-columns[0].y) <= 1));
  assert.ok(columns[1].x>columns[0].x && columns[2].x>columns[1].x);
  const shareFont = await page.locator('[data-eu-farm-share-chart] svg text').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  assert.ok(shareFont >= 14);
  await snapshot(page, profile, 'farming-world-share');
  await page.locator('select[data-eu-farm-country]').selectOption('');
  assert.equal(await page.locator('[data-eu-farm-share-chart] svg').count(), 0);
  manifest.checks.push(`${profile.name}: visible full climate reasons/crops; no automatic census choice/fit; distribution/history/reload/comparison restoration; closed farming table retains values and honest missingness`);
  networkClean();
}

try {
  if (manifest.expectedHead) assert.equal(manifest.gitHead, manifest.expectedHead);
  if (process.env.CI) assert.equal(manifest.gitStatus, '', 'CI evidence requires a clean checkout');
  // No redirects are followed by this preflight request either.
  const releaseURL = new URL('_release.json', base), response = await fetch(releaseURL, {redirect: 'manual'});
  assert.equal(response.status, 200, 'Release metadata must be served by the local production preview');
  manifest.release = {sourceURL: releaseURL.href, ...await response.json()};
  assert.equal(manifest.release.commitSha, manifest.gitHead, 'Served production build must match the checkout');
  manifest.checks.push('served release commit matches git HEAD and expected CI head');
  browser = await chromium.launch({headless: true, chromiumSandbox: true, ...(process.env.EUROPE_REVIEW_CHROMIUM_PATH ? {executablePath: process.env.EUROPE_REVIEW_CHROMIUM_PATH} : {}), args: ['--enable-unsafe-swiftshader', '--disable-background-networking', '--disable-component-update']});
  manifest.browser = {version: await browser.version(), executable: process.env.EUROPE_REVIEW_CHROMIUM_PATH ?? 'Playwright default'};
  for (const profile of profiles) {
    const context = await guardedContext(profile), page = await context.newPage();
    try {
      await openEurope(page, 'atlas/europe/nature/?layer=climate', 'normal');
      const europe = await snapshot(page, profile, 'climate');
      await page.goto(new URL('atlas/north-america/nature/', base).href, {waitUntil: 'networkidle'});
      let us;
      try { us = await snapshot(page, profile, 'climate', 'us'); }
      catch (error) {
        manifest.limits.push({sourceURL: page.url(), reason: 'US climate comparison unavailable; fallback is not success', error: String(error), unavailable: manifest.network.failures.filter(item => item.url.includes('/assets/atlas/'))});
        throw error;
      }
      const delta = {width: europe.map.width - us.map.width, height: europe.map.height - us.map.height, top: europe.map.y - us.map.y};
      manifest.comparisons.push({profile: profile.name, topic: 'climate', render: 'normal', europe, us, mapSizeDelta: delta});
      if (profile.viewport.width === 1440) assert.ok(Math.abs(delta.width) <= 2 && Math.abs(delta.height) <= 2 && Math.abs(delta.top) <= 2, `Desktop climate map geometry differs: ${JSON.stringify(delta)}`);
      else {
        assert.ok(Math.abs(delta.width) <= 2 && Math.abs(delta.height) <= 2 && Math.abs(delta.top) <= 2, `Compact PC climate map geometry differs: ${JSON.stringify({delta, europe: europe.map, us: us.map})}`);
      }
      await europeOperations(page, profile, 'normal');
      await stageOneOperations(page, profile);
      if (profile.viewport.width === 1024) await europeOperations(page, profile, 'explicit-static');
    } finally { await context.close(); }
  }
  networkClean(); assert.equal(manifest.images.length, 32); assert.equal(manifest.records.length, 3);
  assert.ok(manifest.records.every(record => record.status === 'passed'));
  assert.equal(git('rev-parse', 'HEAD'), manifest.gitHead, 'Checkout changed during capture');
  assert.equal(git('rev-parse', 'HEAD:src'), manifest.gitSrcTree);
  manifest.status = 'passed'; manifest.checks.push('32 normal-render screenshots', '2 normal PC operation profiles plus explicit static 1024', 'loopback-only requests', 'no browser exceptions');
  console.log(JSON.stringify({status: manifest.status, output, images: manifest.images.length, head: manifest.gitHead}));
} catch (error) {
  manifest.status = 'failed'; manifest.failure = {message: String(error), stack: error.stack};
  if (activeRecord?.status === 'running') activeRecord.status = 'failed';
  console.error(String(error)); process.exitCode = 1;
  if (process.env.GITHUB_ACTIONS) console.error(`::error title=Europe PC review::${String(error).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')}`);
} finally {
  if (browser) await browser.close();
  manifest.completedAt = new Date().toISOString(); await save();
}
