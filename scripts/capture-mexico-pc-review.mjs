/** PC comparison evidence. The caller owns the CI-only, sandboxed browser. */
import assert from 'node:assert/strict';
import {mkdir, readdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {inspectMexicoInitialPresentation, mexicoPCOperationCases} from './capture-mexico-pc-operations.mjs';

const profile = {viewport: {width: 1280, height: 665}, deviceScaleFactor: 1, isMobile: false, hasTouch: false};
const layoutTolerance = 0.25;
const fields = ['agriculture', 'nature', 'industry', 'population'];
const mexicoMaps = {agriculture: '[data-agriculture-map]', nature: '[data-mexico-nature-main-map]', industry: '[data-mi-map="primary"]', population: '[data-population-map]'};
const mexicoReady = {agriculture: ['agricultureReady', 'true'], nature: ['mexicoNatureReady', 'true'], industry: ['miReady', 'true'], population: ['populationReady', '1']};

function selectors(country, field) {
  return country === 'us'
    ? {root: '[data-atlas-explorer]', map: '[data-map-surface]', reading: `[data-field-national="${field === 'nature' ? 'natural' : field}"]`, ready: ['renderState', 'ready']}
    : {root: field === 'agriculture' ? '[data-mexico-agriculture-atlas]' : `[data-mexico-workspace][data-mexico-field="${field}"]`, map: mexicoMaps[field], reading: field === 'agriculture' ? '[data-field-national="agriculture"]' : '.mexico-reading', ready: mexicoReady[field]};
}

async function stableLayout(page, selected) {
  await page.evaluate(({selected, tolerance}) => new Promise((resolve, reject) => {
    const root = document.querySelector(selected.root);
    const targets = [selected.map, selected.reading, '.atlas-primary-grid', '.atlas-region-controls', '.atlas-tabs'];
    let frame, anchor, latest, stableFrames = 0;
    const timeout = setTimeout(() => {
      cancelAnimationFrame(frame);
      reject(new Error(`Capture layout did not stabilize within 2000 ms: ${JSON.stringify(latest)}`));
    }, 2000);
    const sample = () => {
      try {
        latest = [scrollX, scrollY, ...targets.flatMap(selector => {
          const node = root?.querySelector(selector);
          if (!node) throw new Error(`Missing capture layout target: ${selector}`);
          const box = node.getBoundingClientRect();
          return [box.x, box.y, box.width, box.height];
        })];
        if (anchor && latest.every((value, index) => Math.abs(value - anchor[index]) <= tolerance)) stableFrames++;
        else {anchor = latest; stableFrames = 1;}
        // ResizeObserver callbacks can update the next frame after this sample.
        if (stableFrames >= 3) {clearTimeout(timeout); resolve();}
        else frame = requestAnimationFrame(sample);
      } catch (error) {clearTimeout(timeout); reject(error);}
    };
    frame = requestAnimationFrame(sample);
  }), {selected, tolerance: layoutTolerance});
}

async function settle(page, selected) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    await Promise.all([...document.images].filter(image => {
      const box = image.getBoundingClientRect();
      return !image.closest('[hidden]') && box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight;
    }).map(image => image.decode()));
  });
  await stableLayout(page, selected);
}

async function measure(page, selected) {
  return page.evaluate(async selected => {
    const root = document.querySelector(selected.root);
    const visible = node => node && !node.closest('[hidden]') && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden' && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const bounds = node => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height, visible: Boolean(visible(node)), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, overflowX: getComputedStyle(node).overflowX, overflowY: getComputedStyle(node).overflowY};
    };
    const map = root.querySelector(selected.map), grid = root.querySelector('.atlas-primary-grid');
    if (!map) throw new Error(`Missing map: ${selected.map}`);
    const svgImages = await Promise.all([...map.querySelectorAll('image')].filter(visible).map(async node => {
      const url = new URL(node.getAttribute('href') ?? node.getAttribute('xlink:href'), location.href).href;
      const image = new Image(); image.src = url; await image.decode();
      return {url, width: image.naturalWidth, height: image.naturalHeight};
    }));
    // Read all bounds after image decoding, without an asynchronous gap between them.
    const layout = {article: bounds(root), workspace: bounds(root.querySelector('.atlas-workspace')), grid: bounds(grid), map: bounds(map), mapFrame: bounds(map.closest('.atlas-map-frame')), reading: bounds(root.querySelector(selected.reading)), news: bounds(root.closest('[data-atlas-shell]')?.querySelector('[data-news-rail]'))};
    const elements = ['.atlas-region-controls', '.atlas-tabs', '.atlas-primary-grid'].map(selector => ({selector, ...bounds(root.querySelector(selector))}));
    if (elements.some(element => !element.visible)) throw new Error('Missing visible workspace region');
    const x = Math.floor(Math.min(...elements.map(box => box.x))), y = Math.floor(Math.min(...elements.map(box => box.y)));
    const clip = {x, y, width: Math.ceil(Math.max(...elements.map(box => box.x + box.width))) - x, height: Math.ceil(Math.max(...elements.map(box => box.y + box.height))) - y};
    const canvas = map.querySelector('canvas'), gl = canvas?.getContext('webgl2');
    const svgUses = [...map.querySelectorAll('use')].filter(visible).map(node => {
      const href = node.getAttribute('href') ?? node.getAttribute('xlink:href');
      const target = href?.startsWith('#') ? document.getElementById(href.slice(1)) : null;
      return {href, targetHasGeometry: target?.tagName.toLowerCase() === 'path' && Boolean(target.getAttribute('d')), bounds: bounds(node)};
    });
    const visibleGeometryCount = [...map.querySelectorAll('path,use')].filter(node => !node.closest('defs') && visible(node)).length;
    return {layout, workspace: {clip, elements, method: 'browser-clip-of-element-union'}, rootDataset: {...root.dataset}, viewport: {width: innerWidth, height: innerHeight, devicePixelRatio, documentWidth: document.documentElement.scrollWidth}, rendering: {mode: map.tagName.toLowerCase() === 'svg' || map.querySelector('svg') ? 'svg' : gl ? 'webgl2' : 'unavailable', pathCount: map.querySelectorAll('path').length, visibleGeometryCount, svgUses, svgImages, webgl: gl ? {contextLost: gl.isContextLost(), drawingBufferWidth: gl.drawingBufferWidth, drawingBufferHeight: gl.drawingBufferHeight} : null}, headings: [...root.querySelectorAll('h1,h2,h3')].filter(visible).map(node => node.textContent.trim()), scrollablePanels: [...root.querySelectorAll('*')].filter(node => visible(node) && /auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1).map(node => ({tag: node.tagName, className: node.getAttribute('class'), ...bounds(node)}))};
  }, selected);
}

async function capture(browser, origin, basePath, output, scene) {
  const {country, field, id = 'initial'} = scene;
  const selected = selectors(country, field), name = `${country}-pc-${field}-${id}`;
  const context = await browser.newContext({...profile, locale: 'ja-JP', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce'});
  const page = await context.newPage(); page.setDefaultTimeout(20_000);
  const errors = [], consoleMessages = [], failedRequests = [], assets = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (['error', 'warning'].includes(message.type())) consoleMessages.push({type: message.type(), text: message.text()});});
  page.on('response', response => {if (response.status() >= 400) failedRequests.push({url: response.url(), status: response.status()}); else if (['image', 'stylesheet', 'script', 'fetch', 'xhr', 'font'].includes(response.request().resourceType())) assets.add(response.url());});
  page.on('requestfailed', request => {if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push({url: request.url(), error: request.failure()?.errorText});});
  const route = `/atlas/north-america/${country === 'mexico' ? 'mexico/' : ''}${field}/`;
  const record = {name, country, field, scene: id, commit: process.env.GITHUB_SHA, status: 'failed', profile, requestedUrl: `${origin}${basePath}${route}`, errors, consoleMessages, failedRequests};
  try {
    const response = await page.goto(record.requestedUrl, {waitUntil: 'domcontentloaded'});
    assert.equal(response?.status(), 200, 'Page did not load successfully');
    await page.waitForFunction(({root, ready}) => {const node = document.querySelector(root); return node && (node.dataset[ready[0]] === ready[1] || node.dataset.renderState === 'fallback');}, selected, {timeout: 45_000});
    await settle(page, selected);
    // Additional Mexico cases may operate the existing page before measurement.
    if (scene.run) {
      record.operation = {steps: []};
      const captureStepImage = async id => {
        assert(/^[a-z0-9-]+$/.test(id));
        const filename = `${name}-${id}.png`;
        // Element screenshots scroll automatically and can change a viewport-fitted
        // reader after its clip was measured. Use the existing stable page clip.
        await settle(page, selected);
        const {layout: {grid}} = await measure(page, selected);
        const clip = {x: Math.floor(grid.x), y: Math.floor(grid.y), width: Math.ceil(grid.x + grid.width) - Math.floor(grid.x), height: Math.ceil(grid.y + grid.height) - Math.floor(grid.y)};
        await page.screenshot({path: path.join(output, filename), fullPage: true, clip, animations: 'disabled'});
        (record.operation.screenshots ??= []).push(filename);
        return filename;
      };
      await scene.run({page, context, selected, evidence: record.operation, captureStepImage});
      Object.assign(selected, scene.captureSelectors);
      await settle(page, selected);
    }
    if (country === 'mexico' && id === 'initial') record.presentation = await inspectMexicoInitialPresentation(page, field);
    Object.assign(record, await measure(page, selected));
    assert.equal(record.rootDataset[selected.ready[0]], selected.ready[1], 'Controller is not ready; fallback is not live-map evidence');
    assert.equal(record.viewport.width, profile.viewport.width);
    assert.equal(record.viewport.height, profile.viewport.height);
    assert(record.layout.map?.visible && record.layout.map.width >= 250 && record.layout.map.height >= 160, 'Map has no usable rendered area');
    assert(record.layout.reading?.visible, 'Reading panel is hidden');
    if (country === 'mexico' && field === 'population') {
      const available = Math.max(200, record.viewport.height - Math.max(0, record.layout.reading.y) - 12);
      assert(record.layout.reading.height <= available + 2, 'Population reader retained a height from an earlier scroll position');
    }
    assert(record.rendering.mode === (country === 'us' ? 'webgl2' : 'svg'), 'Expected live map rendering');
    if (country === 'us') assert.equal(record.rendering.webgl.contextLost, false);
    else {
      assert(record.rendering.visibleGeometryCount > 0, 'Visible SVG map geometry is missing');
      for (const use of record.rendering.svgUses) assert(use.targetHasGeometry, `SVG use has no local source geometry: ${use.href}`);
    }
    for (const image of record.rendering.svgImages) assert(image.width > 0 && image.height > 0, 'SVG image did not decode');
    record.screenshot = `${name}.png`;
    await page.screenshot({path: path.join(output, record.screenshot), fullPage: false, animations: 'disabled'});
    if (id === 'initial' || scene.captureWorkspace) {
      record.workspaceScreenshot = `${name}-workspace.png`;
      await stableLayout(page, selected);
      const current = await measure(page, selected);
      for (const key of ['workspace', 'grid', 'map', 'reading']) {
        for (const axis of ['x', 'y', 'width', 'height']) {
          assert(Math.abs(current.layout[key][axis] - record.layout[key][axis]) <= layoutTolerance, `Capture layout changed between viewport and workspace: ${key}.${axis} (${record.layout[key][axis]} -> ${current.layout[key][axis]})`);
        }
      }
      for (const [index, element] of current.workspace.elements.entries()) {
        for (const axis of ['x', 'y', 'width', 'height']) assert(Math.abs(element[axis] - record.workspace.elements[index][axis]) <= layoutTolerance, `Workspace clip target changed between screenshots: ${element.selector}.${axis}`);
      }
      Object.assign(record, current);
      await page.screenshot({path: path.join(output, record.workspaceScreenshot), fullPage: true, clip: record.workspace.clip, animations: 'disabled'});
    }
    record.horizontalOverflow = Math.max(0, record.viewport.documentWidth - record.viewport.width);
    assert(record.horizontalOverflow <= 1, 'Page overflows horizontally');
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    assert.deepEqual(consoleMessages.filter(message => message.type === 'error'), [], 'Browser console errors');
    assert.deepEqual(failedRequests, [], 'Failed page or data requests');
    record.status = 'passed';
  } catch (error) {
    record.failure = error.stack ?? String(error);
    record.failureScreenshot = `${name}-failure.png`;
    await page.screenshot({path: path.join(output, record.failureScreenshot), fullPage: false, animations: 'disabled'}).catch(() => {record.failureScreenshot = null;});
  } finally {
    record.url = page.url(); record.loadedAssets = [...assets].sort(); record.capturedAt = new Date().toISOString();
    await context.close();
    await writeFile(path.join(output, `${name}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}

/** Reuse the caller's browser and server; never launch or alter browser security here. */
export async function captureMexicoPCReview({browser, origin, basePath = '', output, additionalCases = mexicoPCOperationCases}) {
  assert(browser && output, 'An existing browser and output directory are required');
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'PC capture runs only inside the existing GitHub Actions browser job');
  assert(process.env.GITHUB_SHA, 'The reviewed commit must be recorded');
  for (const scene of additionalCases) {
    assert.equal(scene.country, 'mexico', 'Additional operation cases are Mexico-only');
    assert(fields.includes(scene.field) && /^[a-z0-9-]+$/.test(scene.id) && scene.id !== 'initial', 'Invalid additional case');
  }
  await mkdir(output, {recursive: true});
  const scenes = [...fields.flatMap(field => ['us', 'mexico'].map(country => ({country, field, id: 'initial'}))), ...additionalCases];
  const metadata = {status: 'running', commit: process.env.GITHUB_SHA, browserVersion: browser.version(), profile, startedAt: new Date().toISOString(), captures: [], comparisons: []};
  for (const scene of scenes) {
    const record = await capture(browser, origin, basePath, output, scene);
    metadata.captures.push(record);
    await writeFile(path.join(output, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    console.log(`${record.status.toUpperCase()}: ${record.name}${record.failure ? `: ${record.failure.split('\n')[0]}` : ''}`);
  }
  metadata.comparisons = fields.map(field => {
    const us = metadata.captures.find(item => item.field === field && item.country === 'us' && item.scene === 'initial');
    const mexico = metadata.captures.find(item => item.field === field && item.country === 'mexico' && item.scene === 'initial');
    const delta = key => us.layout?.[key] && mexico.layout?.[key] ? Object.fromEntries(['x', 'y', 'width', 'height'].map(axis => [axis, mexico.layout[key][axis] - us.layout[key][axis]])) : null;
    return {field, us: us.name, mexico: mexico.name, differenceMexicoMinusUS: {workspace: delta('workspace'), map: delta('map'), reading: delta('reading')}, note: 'Measured layout differences, not a claim of visual equivalence. Inspect both PNGs.'};
  });
  metadata.status = metadata.captures.every(item => item.status === 'passed') ? 'passed' : 'failed';
  metadata.completedAt = new Date().toISOString();
  metadata.files = await Promise.all((await readdir(output)).filter(name => name !== 'metadata.json').sort().map(async name => ({name, bytes: (await stat(path.join(output, name))).size})));
  metadata.artifactBytesExcludingSummary = metadata.files.reduce((sum, file) => sum + file.bytes, 0);
  metadata.sizeTarget = {bytes: 8 * 1024 * 1024, withinTarget: metadata.artifactBytesExcludingSummary <= 8 * 1024 * 1024, scope: 'Additional PC review only; existing mandatory agriculture captures are unchanged'};
  await writeFile(path.join(output, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  return metadata;
}
