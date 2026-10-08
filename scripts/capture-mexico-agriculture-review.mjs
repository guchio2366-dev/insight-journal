#!/usr/bin/env node
/**
 * Capture the same built US/Mexico agriculture UI in a real browser on Actions.
 * This intentionally uses the runner's Chrome, never downloads a browser, and
 * refuses to launch on a local workstation. Run after `npm run build` in CI.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {access, mkdir, readFile, realpath, stat, writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'node:zlib';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
import {captureMexicoPCReview} from './capture-mexico-pc-review.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(repo, 'dist');
const output = path.join(repo, 'review-artifacts', 'mexico-agriculture');
const basePath = `/${String(astroConfig.base ?? '').replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
const profiles = [
  {name: 'desktop', viewport: {width: 1280, height: 665}, deviceScaleFactor: 1.5, isMobile: false, hasTouch: false},
  {name: 'small-desktop', viewport: {width: 1024, height: 665}, deviceScaleFactor: 1.5, isMobile: false, hasTouch: false},
  {name: 'mobile', viewport: {width: 390, height: 844}, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true},
];
const countries = [
  {
    id: 'us', route: '/atlas/north-america/agriculture/', root: '[data-atlas-explorer]',
    map: '[data-map-surface]', ready: {renderState: 'ready', agriReadingReady: 'true'},
    overview: '#national-agriculture-title', heading: '#agri-reading-heading',
    stateLabels: '[data-map-labels] .atlas-geolabel', config: '[data-explorer-config]',
    cases: [
      {id: 'overview', label: '米国の農林業', reading: 'overview'},
      {id: 'crop', label: 'とうもろこし', reading: 'product', select: '[data-crop-select="corn"]'},
      {id: 'livestock', label: '肉牛', reading: 'product', select: '[data-livestock-select="beef"]'},
      {id: 'forestry', label: '森林資源と木材生産', reading: 'forestry', select: '[data-forestry-select]'},
    ],
  },
  {
    id: 'mexico', route: '/atlas/north-america/mexico/agriculture/', root: '[data-mexico-agriculture-atlas]',
    map: '[data-agriculture-map]', ready: {agricultureReady: 'true'},
    overview: '#national-agriculture-title', heading: '#agri-reading-heading',
    stateLabels: '.mexico-agriculture-geography text', config: '[data-mexico-agriculture-config]',
    cases: [
      {id: 'overview', label: 'メキシコの農林業', reading: 'overview'},
      {id: 'crop', label: 'とうもろこし', reading: 'product', select: '[data-crop-select="corn"]'},
      {id: 'livestock', label: '肉牛', reading: 'product', select: '[data-livestock-select="beef"]'},
      {id: 'dairy', label: '牛乳', reading: 'product', select: '[data-livestock-select="dairy"]'},
      {id: 'forestry', label: '森林資源と木材生産', reading: 'forestry', select: '[data-forestry-select]'},
    ],
  },
];
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.gz': 'application/gzip'};

// Serve only regular files under this build. No SPA fallback can disguise a 404.
async function serveBuild() {
  const root = await realpath(dist);
  for (const country of countries) await access(path.join(root, country.route, 'index.html'));
  const server = createServer(async (req, res) => {
    try {
      assert(req.method === 'GET' || req.method === 'HEAD');
      let pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      if (basePath) {
        assert(pathname === basePath || pathname.startsWith(`${basePath}/`));
        pathname = pathname.slice(basePath.length);
      }
      let target = path.resolve(root, `.${pathname || '/'}`);
      assert(target === root || target.startsWith(`${root}${path.sep}`));
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      target = await realpath(target);
      assert(target.startsWith(`${root}${path.sep}`));
      assert((await stat(target)).isFile());
      const body = await readFile(target);
      res.writeHead(200, {'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  return {server, origin: `http://127.0.0.1:${server.address().port}`};
}

// Decode browser-generated 8-bit RGB/RGBA PNGs so blank-map checks inspect the
// actual captured pixels, not merely the presence of a canvas or an SVG node.
function pixelEvidence(png, includePixels = false) {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let width, height, channels;
  const chunks = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), kind = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      assert.equal(data[8], 8, 'Expected 8-bit screenshot');
      assert([2, 6].includes(data[9]), 'Expected RGB/RGBA screenshot');
      assert.equal(data[12], 0, 'Expected non-interlaced screenshot');
      channels = data[9] === 6 ? 4 : 3;
    }
    if (kind === 'IDAT') chunks.push(data);
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  assert.equal(raw.length, (stride + 1) * height);
  const pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert(filter >= 0 && filter <= 4);
    for (let x = 0; x < stride; x++) {
      const offset = y * stride + x, left = x >= channels ? pixels[offset - channels] : 0;
      const up = y ? pixels[offset - stride] : 0, upperLeft = y && x >= channels ? pixels[offset - stride - channels] : 0;
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upperLeft)][filter];
      pixels[offset] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  const colors = new Map();
  let samples = 0;
  for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) {
    const i = (y * width + x) * channels;
    if (channels === 4 && pixels[i + 3] < 128) continue;
    const key = `${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`;
    colors.set(key, (colors.get(key) ?? 0) + 1); samples++;
  }
  const dominantColorRatio = samples ? Math.max(...colors.values()) / samples : 1;
  assert(samples > 1000, 'Screenshot has too few opaque pixels');
  assert(colors.size >= 16 && dominantColorRatio < 0.98, 'Screenshot is blank or nearly uniform');
  return {width, height, sampledOpaquePixels: samples, colorBuckets: colors.size, dominantColorRatio, ...(includePixels ? {pixels, channels} : {})};
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => {
      const rect = image.getBoundingClientRect();
      return rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight;
    }).map(image => image.decode()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function assertReadingState(page, country, scene) {
  const controllerReady = Object.fromEntries(Object.entries(country.ready).filter(([key]) => key !== 'renderState'));
  await page.waitForFunction(({rootSelector, expected}) => {
    const root = document.querySelector(rootSelector);
    return root && Object.entries(expected).every(([key, value]) => root.dataset[key] === value);
  }, {rootSelector: country.root, expected: controllerReady}, {timeout: 45_000});
  const root = page.locator(country.root);
  assert.equal(await root.getAttribute('data-agri-reading'), scene.reading, 'Reading state mismatch');
  const heading = root.locator(scene.id === 'overview' ? country.overview : country.heading);
  assert(await heading.isVisible(), 'Expected state heading is hidden');
  assert((await heading.innerText()).includes(scene.label), `Missing state label: ${scene.label}`);
  return {heading: await heading.innerText(), rootDataset: await root.evaluate(node => ({...node.dataset}))};
}

async function assertReady(page, country, scene) {
  await page.waitForFunction(({rootSelector, expected}) => {
    const root = document.querySelector(rootSelector);
    return root && (root.dataset.renderState === 'fallback' || Object.entries(expected).every(([key, value]) => root.dataset[key] === value));
  }, {rootSelector: country.root, expected: country.ready}, {timeout: 45_000});
  const uiState = await assertReadingState(page, country, scene);
  for (const [key, value] of Object.entries(country.ready)) assert.equal(uiState.rootDataset[key], value, `Ready check failed: ${key}; fallback is not live-map parity`);
  const root = page.locator(country.root);
  let svgImages = [];
  let forestTreeCover;
  const payload = await root.locator(country.config).textContent();
  const data = JSON.parse(payload);
  if (country.id === 'us') {
    assert(data.crops.length >= 5 && data.livestockKinds.length >= 5, 'US agriculture datasets missing');
    assert(await root.locator('.atlas-geolabel--state').count() >= 40, 'US state-label dataset missing');
    assert(await root.locator('[data-fallback]').isHidden(), 'US is showing its fallback, not the live map');
    const canvas = root.locator(`${country.map} canvas`);
    assert.equal(await canvas.count(), 1, 'US live-map canvas missing');
    assert(await canvas.isVisible(), 'US map canvas hidden');
    const rendering = await renderingEvidence(page, country);
    assert.equal(rendering.mode, 'webgl2', 'US map is not using a real WebGL2 context');
    assert.equal(rendering.webgl.contextLost, false, 'US WebGL2 context was lost');
    if (scene.id === 'forestry') {
      assert(await root.locator('.forest-overlay').isVisible(), 'Forest data overlay has not rendered');
      assert(await root.locator('.forest-overlay image').getAttribute('href'), 'Forest data image missing');
    }
  } else {
    svgImages = await root.locator(`${country.map} image`).evaluateAll(async nodes => Promise.all(nodes.map(async node => {
      const href = new URL(node.getAttribute('href') ?? node.getAttribute('xlink:href'), location.href).href;
      const image = new Image(); image.src = href; await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error(`SVG image is empty: ${href}`);
      return {url: href, width: image.naturalWidth, height: image.naturalHeight, decoded: true};
    })));
    assert(svgImages.some(image => image.url.endsWith('/mexico-nature-parity-v1/relief.webp')), 'Mexico relief image missing');
    assert(svgImages.some(image => image.url.endsWith('/mexico-agriculture-v2/rivers.png')), 'Mexico river image missing');
    assert.equal(data.states.length, 32, 'Mexico dataset must contain all 32 states');
    assert(data.crops.length >= 5 && data.livestockKinds.length === 5 && data.markers.length >= 5, 'Mexico crop/livestock datasets missing');
    assert.equal(await root.locator(`${country.map} path[data-agriculture-state-code]`).count(), 32, 'Mexico state geometry missing');
    const stateNames = await root.locator('path[data-agriculture-state-code] title').allTextContents();
    assert.equal(new Set(stateNames.filter(Boolean)).size, 32, 'Mexico state geometries must have distinct names');
    if (scene.id === 'forestry') {
      const treeCover = root.locator('[data-mexico-tree-cover]');
      assert.equal(await treeCover.count(), 1, 'Mexico tree-cover image missing');
      assert(await treeCover.isVisible(), 'Mexico tree-cover image is hidden in forestry');
      const sourceUrl = new URL(await treeCover.getAttribute('href'), page.url()).href;
      assert(sourceUrl.endsWith('/mexico-agriculture-v2/tree-cover-2021.png'), 'Unexpected Mexico tree-cover image source');
      const decoded = svgImages.find(image => image.url === sourceUrl);
      assert(decoded?.decoded && decoded.width > 0 && decoded.height > 0, 'Mexico tree-cover image did not decode');
      forestTreeCover = {...decoded, sourceUrl, visible: true, scope: 'Coarse 2021 WorldCover categorical tree-cover overview; not a 10 m display, legal-forest boundary, or pine-species map'};
      assert.equal(await root.locator('[data-mexico-forest-states]').count(), 0, 'Forestry must not highlight state outlines');
      assert((await root.locator('[data-agriculture-reading="pine"] .mexico-agriculture-forest-note').textContent()).includes('ドゥランゴ・チワワ'), 'Forestry must retain the top-state statistics explanation');
    } else {
      assert(await root.locator('path[data-crop-zone="corn"]').isVisible(), 'Mexico crop distribution missing');
      assert(await root.locator('[data-livestock-markers] button').count() > 0, 'Mexico livestock markers missing');
    }
  }
  const mapBox = await root.locator(country.map).boundingBox();
  assert(mapBox && mapBox.width >= 250 && mapBox.height >= 160, 'Map has no usable rendered area');
  const labels = await root.locator(country.stateLabels).evaluateAll(nodes => nodes.filter(node => {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    return !node.closest('[hidden]') && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).map(node => node.textContent.trim()).filter(Boolean));
  assert(labels.length > 0, 'No rendered map labels');
  for (const selector of ['[data-agri-layer][value="crops"]', '[data-agri-layer][value="livestock"]', '[data-map-action="fit"]', '[data-crop-select]', '[data-livestock-select]', '[data-forestry-select]']) {
    const control = root.locator(selector).first();
    if(scene.id==='forestry'&&selector.startsWith('[data-agri-layer]')){assert(await control.isHidden(),'Crop/livestock controls must yield to forestry');continue;}
    assert(await control.isVisible() && await control.isEnabled(), `Control unavailable: ${selector}`);
  }
  const busy = root.locator('[aria-busy="true"]');
  for (const node of await busy.all()) assert(await node.isHidden(), 'A visible panel is still busy');
  const visibleText = await root.innerText();
  assert(!/読み込み中|読み込めませんでした|読み込みに失敗|Loading\.\.\./i.test(visibleText), 'Loading or error copy is visible');
  return {...uiState, mapBox, visibleMapLabels: labels, svgImages, forestTreeCover, controlsReady: true, datasetsReady: true};
}

async function renderingEvidence(page, country) {
  return page.evaluate(({rootSelector, countryId}) => {
    const root = document.querySelector(rootSelector), canvas = root?.querySelector('[data-map-surface] canvas');
    const gl = canvas?.getContext('webgl2');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      mode: countryId === 'mexico' ? 'svg-with-relief-image' : root?.dataset.renderState === 'fallback' ? 'built-in-image-fallback' : gl ? 'webgl2' : 'not-ready',
      rootDataset: root ? {...root.dataset} : null,
      fallbackVisible: Boolean(root?.querySelector('[data-fallback]') && !root.querySelector('[data-fallback]').hidden),
      webgl: gl ? {version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null, contextLost: gl.isContextLost(), drawingBufferWidth: gl.drawingBufferWidth, drawingBufferHeight: gl.drawingBufferHeight} : null,
    };
  }, {rootSelector: country.root, countryId: country.id});
}

async function captureWorkspace(page, country, name, record) {
  record.workspaceCaptureAttempted = true;
  await page.evaluate(() => window.scrollTo({top: 0, left: 0, behavior: 'instant'}));
  const workspace = await page.evaluate(rootSelector => {
    const root = document.querySelector(rootSelector);
    const bounds = node => {
      if (!node) return null;
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      return {x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height, visible: box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'};
    };
    const shell = root?.closest('[data-atlas-shell]');
    const layout = {shell: bounds(shell), article: bounds(root), news: bounds(shell?.querySelector('[data-news-rail]')), map: bounds(root?.querySelector('[data-map-frame]')), grid: bounds(root?.querySelector('.atlas-primary-grid')), reading: bounds(root?.querySelector('[data-field-national="agriculture"]'))};
    const {news, article} = layout;
    const horizontalSeparation = news && article && (news.x + news.width <= article.x + 1 || article.x + article.width <= news.x + 1);
    const verticalOverlap = news && article && Math.min(news.y + news.height, article.y + article.height) > Math.max(news.y, article.y);
    layout.newsArrangement = !news?.visible ? 'not-visible' : horizontalSeparation && verticalOverlap ? 'side-by-side' : !verticalOverlap ? 'stacked' : 'overlapping';
    const selectors = ['.atlas-region-controls', '.atlas-tabs', '.atlas-primary-grid'];
    const elements = selectors.map(selector => {
      const node = root?.querySelector(selector);
      if (!node) throw new Error(`Missing workspace element: ${selector}`);
      const box = node.getBoundingClientRect();
      return {selector, x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height};
    });
    const left = Math.floor(Math.min(...elements.map(box => box.x)));
    const top = Math.floor(Math.min(...elements.map(box => box.y)));
    const right = Math.ceil(Math.max(...elements.map(box => box.x + box.width)));
    const bottom = Math.ceil(Math.max(...elements.map(box => box.y + box.height)));
    return {elements, layout, clip: {x: left, y: top, width: right - left, height: bottom - top}, layoutViewport: {width: innerWidth, height: innerHeight, devicePixelRatio}};
  }, country.root);
  record.layout = workspace.layout;
  record.workspace = {...workspace, method: 'browser-clip-of-element-union'};
  assert(workspace.clip.width > 250 && workspace.clip.height > 200, 'Workspace has no usable bounds');
  // No wrapper covers this exact region in both pages. Browser-crop the union
  // of real element bounds; never change CSS, resize the viewport, or stretch.
  const png = await page.screenshot({fullPage: true, clip: workspace.clip, animations: 'disabled'});
  const after = await page.evaluate(() => ({width: innerWidth, height: innerHeight, devicePixelRatio}));
  assert.deepEqual(after, workspace.layoutViewport, 'Workspace capture changed the layout viewport');
  record.workspace.pixels = pixelEvidence(png);
  record.workspaceScreenshot = `${name}-workspace.png`;
  await writeFile(path.join(output, record.workspaceScreenshot), png);
}

async function checkMexicoTouchCamera(page, context, country, name, record) {
  const root = page.locator(country.root), map = root.locator(country.map);
  const camera = async () => (await map.getAttribute('viewBox')).trim().split(/\s+/).map(Number);
  const sameCamera = (actual, expected, message) => {
    assert.equal(actual.length, 4);
    assert(actual.every((value, index) => Math.abs(value - expected[index]) <= 0.02), message);
  };
  const evidence = record.touchCamera = {status: 'failed', method: 'Chromium touch-input emulation via Playwright CDPSession', syntheticDomEvents: false};
  let session;
  try {
    await root.locator('[data-map-action="fit"]').click();
    evidence.fittedCamera = await camera();
    await root.locator('[data-map-action="in"]').click();
    await map.scrollIntoViewIfNeeded();
    await settle(page);
    evidence.beforePan = await camera();
    const gesture = await map.evaluate(svg => {
      const box = svg.getBoundingClientRect();
      const candidates = [[0.65, 0.55], [0.45, 0.55], [0.65, 0.72], [0.4, 0.72]];
      const point = candidates.map(([x, y]) => ({x: box.x + box.width * x, y: box.y + box.height * y})).find(p => document.elementFromPoint(p.x, p.y)?.closest('[data-agriculture-map]') === svg);
      if (!point) throw new Error('No unoccluded SVG point available for touch gesture');
      const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
      const events = [];
      const listener = event => events.push({type: event.type, pointerType: event.pointerType, isTrusted: event.isTrusted, x: event.clientX, y: event.clientY});
      for (const type of types) svg.addEventListener(type, listener);
      window.__agricultureReviewTouch = {events, cleanup: () => types.forEach(type => svg.removeEventListener(type, listener))};
      return {point, dx: -Math.min(45, box.width * 0.13), dy: -Math.min(30, box.height * 0.1), touchActionBeforePointerDown: getComputedStyle(svg).touchAction, scrollY};
    });
    evidence.gesture = gesture;
    assert.equal(gesture.touchActionBeforePointerDown, 'none', 'Zoomed map must disable page touch-scrolling before the gesture starts');
    // Input is delivered only to this test-created CI page. No external browser
    // connection or DOM-dispatched PointerEvent is used to claim touch support.
    session = await context.newCDPSession(page);
    const touchPoint = (x, y) => ({x, y, id: 1, radiusX: 1, radiusY: 1, force: 1});
    await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [touchPoint(gesture.point.x, gesture.point.y)]});
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [touchPoint(gesture.point.x + gesture.dx * step / 6, gesture.point.y + gesture.dy * step / 6)]});
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await settle(page);
    evidence.events = await page.evaluate(() => window.__agricultureReviewTouch.events);
    assert(evidence.events.some(event => event.type === 'pointerdown' && event.pointerType === 'touch' && event.isTrusted), 'No browser-generated touch pointerdown received');
    assert(evidence.events.some(event => event.type === 'pointerup' && event.pointerType === 'touch' && event.isTrusted), 'Touch gesture did not finish');
    assert(!evidence.events.some(event => event.type === 'pointercancel'), 'Browser canceled the touch gesture');
    evidence.afterPan = await camera();
    assert(evidence.afterPan.some((value, index) => index < 2 && Math.abs(value - evidence.beforePan[index]) > 1), 'Touch pan did not move the map camera');
    evidence.scrollYAfterPan = await page.evaluate(() => scrollY);
    assert(Math.abs(evidence.scrollYAfterPan - gesture.scrollY) <= 1, 'Touch pan scrolled the page instead of the map');
    evidence.panScreenshot = `${name}-touch-pan.png`;
    await map.screenshot({path: path.join(output, evidence.panScreenshot), animations: 'disabled'});
    await root.locator('[data-map-action="out"]').click();
    sameCamera(await camera(), evidence.fittedCamera, 'Zooming out to 1 retained a latent camera center');
    for (const key of ['az', 'ax', 'ay']) assert(!new URL(page.url()).searchParams.has(key), `Fitted camera retained URL key ${key}`);
    await root.locator('[data-map-action="in"]').click();
    evidence.zoomInWithoutReload = await camera();
    await root.locator('[data-map-action="out"]').click();
    await page.reload({waitUntil: 'domcontentloaded'});
    await settle(page);
    await assertReadingState(page, country, country.cases.find(scene => scene.id === 'crop'));
    sameCamera(await camera(), evidence.fittedCamera, 'Reload changed the fitted camera');
    await root.locator('[data-map-action="in"]').click();
    evidence.zoomInAfterReload = await camera();
    sameCamera(evidence.zoomInAfterReload, evidence.zoomInWithoutReload, 'Zoom-in camera differs after a fitted reload');
    evidence.status = 'passed';
  } finally {
    if (session) {
      await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}).catch(() => {});
      await session.detach();
    }
    await page.evaluate(() => {window.__agricultureReviewTouch?.cleanup(); delete window.__agricultureReviewTouch;}).catch(() => {});
    await root.locator('[data-map-action="fit"]').click();
    await settle(page);
    evidence.captureCamera = await camera();
    sameCamera(evidence.captureCamera, [0, 0, 900, 580], 'Review screenshots must use the fitted camera');
  }
}

async function assertCropPaint(page,country,name,record){
  const map=page.locator(`${country.root} ${country.map}`),toggle=page.locator(`${country.root} [data-agri-layer][value="crops"]`);
  const masks=await page.evaluate(rootSelector=>{const root=document.querySelector(rootSelector),map=root.querySelector('[data-agriculture-map]').getBoundingClientRect();return [...root.querySelectorAll('svg text,[data-livestock-markers] button,[data-agri-layers],[data-map-action],[data-layer-caption]')].map(node=>{const r=node.getBoundingClientRect();return {x:r.left-map.left-3,y:r.top-map.top-3,w:r.width+6,h:r.height+6};});},country.root);
  const box=await map.boundingBox();await toggle.check();await settle(page);const on=await map.screenshot({animations:'disabled'});
  await toggle.uncheck();await settle(page);const off=await map.screenshot({animations:'disabled'});await toggle.check();await settle(page);
  const a=pixelEvidence(on,true),b=pixelEvidence(off,true);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
  const scale=a.width/box.width;let changed=0,eligible=0;
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
    if(masks.some(mask=>x>=mask.x*scale&&x<=(mask.x+mask.w)*scale&&y>=mask.y*scale&&y<=(mask.y+mask.h)*scale))continue;
    eligible++;const ai=(y*a.width+x)*a.channels,bi=(y*b.width+x)*b.channels;
    if(Math.abs(a.pixels[ai]-b.pixels[bi])+Math.abs(a.pixels[ai+1]-b.pixels[bi+1])+Math.abs(a.pixels[ai+2]-b.pixels[bi+2])>30)changed++;
  }
  assert(changed>eligible*.006,`Crop fills are absent or imperceptible: ${changed}/${eligible} changed pixels after masking labels and controls`);
  record.cropPaint={changedPixels:changed,eligiblePixels:eligible,fraction:changed/eligible,method:'Real checkbox toggle pixel difference, excluding text/badge/control boxes'};
  await writeFile(path.join(output,`${name}-crops-visible-proof.png`),on);await writeFile(path.join(output,`${name}-crops-hidden-proof.png`),off);
}

async function capture(browser, origin, profile, country, scene) {
  const name = `${country.id}-${profile.name}-${scene.id}`;
  const {name: profileName, ...contextOptions} = profile;
  const context = await browser.newContext({...contextOptions, locale: 'ja-JP', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce'});
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [], consoleMessages = [], failedRequests = [], assets = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) consoleMessages.push({type: message.type(), text: message.text(), location: message.location()});
  });
  page.on('response', response => {
    if (response.status() >= 400) failedRequests.push({url: response.url(), status: response.status()});
    else if (/\.(json|geojson|png|webp|svg)(?:\?|$)/.test(response.url())) assets.add(response.url());
  });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push({url: request.url(), error: request.failure()?.errorText});
  });
  const requestedUrl = `${origin}${basePath}${country.route}`;
  const record = {name, commit: process.env.GITHUB_SHA, country: country.id, scene: scene.id, profile, requestedUrl, status: 'failed', errors, consoleMessages, failedRequests};
  try {
    const response = await page.goto(requestedUrl, {waitUntil: 'domcontentloaded'});
    assert.equal(response.status(), 200, 'Page did not load successfully');
    await settle(page);
    await assertReadingState(page, country, country.cases[0]);
    if (scene.select) {
      await page.locator(`${country.root} ${scene.select}`).click();
      await settle(page);
    }
    if (scene.id === 'crop' && profile.name === 'desktop') {
      // Repeated selection must remain usable, and Back/Forward must restore it.
      await page.locator(`${country.root} ${scene.select}`).click();
      await settle(page);
      await assertReadingState(page, country, scene);
      await page.goBack();
      await settle(page);
      await assertReadingState(page, country, country.cases[0]);
      await page.goForward();
      await settle(page);
      record.historyAndRepeatedSelection = 'passed';
    }
    if (scene.id === 'overview') {
      const toggle = page.locator(`${country.root} [data-agri-layer][value="livestock"]`);
      await toggle.uncheck(); assert.equal(await toggle.isChecked(), false);
      await toggle.check(); assert.equal(await toggle.isChecked(), true);
      await settle(page);
      record.layerToggle = 'passed';
    }
    if (country.id === 'mexico' && profile.name === 'mobile' && scene.id === 'crop') await checkMexicoTouchCamera(page, context, country, name, record);
    if(country.id==='mexico'&&scene.id==='overview')await assertCropPaint(page,country,name,record);
    record.uiState = await assertReadingState(page, country, scene);
    Object.assign(record, await assertReady(page, country, scene));
    const mapPng = await page.locator(`${country.root} ${country.map}`).screenshot({animations: 'disabled'});
    record.mapPixels = pixelEvidence(mapPng);
    record.mapScreenshot = `${name}-map.png`;
    await writeFile(path.join(output, record.mapScreenshot), mapPng);
    await page.evaluate(() => window.scrollTo({top: 0, left: 0, behavior: 'instant'}));
    if (profile.name === 'mobile' && scene.id !== 'overview') await page.locator(`${country.root} ${country.heading}`).scrollIntoViewIfNeeded();
    await settle(page);
    record.browserViewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight, devicePixelRatio, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth}));
    assert.equal(record.browserViewport.width, profile.viewport.width);
    assert.equal(record.browserViewport.height, profile.viewport.height);
    assert.equal(record.browserViewport.devicePixelRatio, profile.deviceScaleFactor);
    assert(record.browserViewport.documentWidth <= profile.viewport.width + 1, 'Page overflows horizontally');
    const png = await page.screenshot({animations: 'disabled', fullPage: false});
    record.pixels = pixelEvidence(png);
    assert.equal(record.pixels.width, Math.round(profile.viewport.width * profile.deviceScaleFactor));
    // Fractional device pixels may be rounded up or down by the Chrome build.
    assert(Math.abs(record.pixels.height - profile.viewport.height * profile.deviceScaleFactor) <= 0.5);
    record.screenshot = `${name}.png`;
    await writeFile(path.join(output, record.screenshot), png);
    await captureWorkspace(page, country, name, record);
    if (country.id === 'mexico' && profile.name === 'desktop' && scene.id === 'forestry') {
      const flow = page.locator('[data-mexico-stat-panel="pine"] .mexico-pine-flow');
      assert(await flow.isVisible(), 'Pine flow chart is hidden');
      assert((await flow.innerText()).includes('7,135,745'), 'Pine sales figure is missing');
      record.statisticsScreenshot = `${name}-pine-flow.png`;
      await flow.screenshot({path: path.join(output, record.statisticsScreenshot), animations: 'disabled'});
    }
    if (country.id === 'mexico' && profile.name === 'desktop' && scene.id === 'dairy') {
      const detail = page.locator('[data-mexico-milk-world-comparison]');
      await detail.locator('summary').click();
      assert(await detail.locator('[data-world-production="mexico-milk-2024"]').isVisible(), 'Mexico milk world chart is hidden');
      record.statisticsScreenshot = `${name}-milk-world.png`;
      await detail.screenshot({path: path.join(output, record.statisticsScreenshot), animations: 'disabled'});
    }
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    assert.deepEqual(consoleMessages.filter(message => message.type === 'error'), [], 'Browser console errors');
    assert.deepEqual(failedRequests, [], 'Failed page or data requests');
    record.status = 'passed';
  } catch (error) {
    record.failure = error.stack ?? String(error);
    await page.evaluate(() => window.scrollTo({top: 0, left: 0, behavior: 'instant'})).catch(() => {});
    if (profile.name === 'mobile' && scene.id !== 'overview') await page.locator(`${country.root} ${country.heading}`).scrollIntoViewIfNeeded().catch(() => {});
    record.screenshot = `${name}-failure.png`;
    await page.screenshot({path: path.join(output, record.screenshot), fullPage: false}).catch(() => {record.screenshot = null;});
    if (!record.workspaceCaptureAttempted) await captureWorkspace(page, country, name, record).catch(error => {record.workspaceCaptureError = String(error);});
    if (!record.mapScreenshot) {
      const rendering = await renderingEvidence(page, country).catch(() => null);
      const fallback = rendering?.mode === 'built-in-image-fallback';
      const selector = fallback ? '[data-fallback] .atlas-fallback-map' : country.map;
      record.mapScreenshot = `${name}-map${fallback ? '-fallback' : '-failure'}.png`;
      record.mapScreenshotRendering = rendering?.mode;
      await page.locator(`${country.root} ${selector}`).screenshot({path: path.join(output, record.mapScreenshot), animations: 'disabled'}).catch(error => {record.mapScreenshot = null; record.mapCaptureError = String(error);});
    }
  } finally {
    record.rendering = await renderingEvidence(page, country).catch(error => ({mode: 'unavailable', error: String(error)}));
    record.url = page.url();
    record.loadedDataAndImages = [...assets].sort();
    record.capturedAt = new Date().toISOString();
    await context.close();
    await writeFile(path.join(output, `${name}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Real-browser capture is restricted to GitHub Actions; use node --check locally.');
  assert.equal(process.env.RUNNER_OS, 'Linux', 'This capture job expects the Linux GitHub runner.');
  assert(process.env.GITHUB_SHA, 'The reviewed commit must be recorded.');
  assert(process.env.REVIEW_JAPANESE_FONTS?.trim(), 'A verified Japanese-capable runner font is required.');
  assert(process.env.REVIEW_JAPANESE_FONT_MATCH?.trim(), 'Japanese generic font resolution must be recorded.');
  const executablePath = process.env.REVIEW_CHROME_PATH;
  assert(executablePath, 'Set REVIEW_CHROME_PATH to the runner-installed Google Chrome.');
  await access(executablePath, constants.X_OK);
  await mkdir(output, {recursive: true});
  const metadata = {status: 'running', commit: process.env.GITHUB_SHA, repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, basePath, startedAt: new Date().toISOString(), profiles, fonts: {setup: process.env.REVIEW_JAPANESE_FONT_SETUP, japaneseCapableFamilies: process.env.REVIEW_JAPANESE_FONTS.split('\n'), genericJapaneseMatches: process.env.REVIEW_JAPANESE_FONT_MATCH.split('\n')}, captures: []};
  await writeFile(path.join(output, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  let server, browser;
  try {
    const hosted = await serveBuild(); server = hosted.server;
    browser = await chromium.launch({executablePath, headless: true, chromiumSandbox: true});
    metadata.browserVersion = browser.version();
    metadata.browserExecutable = executablePath;
    metadata.browserLaunch = {headless: true, chromiumSandbox: true, additionalFlags: []};
    for (const profile of profiles) for (const country of countries) for (const scene of country.cases) {
      if (profile.name === 'mobile' && !['overview', 'crop'].includes(scene.id)) continue;
      if (profile.name === 'small-desktop' && scene.id !== 'overview') continue;
      const result = await capture(browser, hosted.origin, profile, country, scene);
      metadata.captures.push(result);
      await writeFile(path.join(output, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
      console.log(`${result.status.toUpperCase()}: ${result.name}${result.failure ? `: ${result.failure.split('\n')[0]}` : ''}`);
    }
    metadata.pcReview = await captureMexicoPCReview({browser, origin: hosted.origin, basePath, output: path.join(output, 'pc-review')});
    assert.equal(metadata.pcReview.status, 'passed', 'PC comparison capture failed. Inspect mexico-agriculture/pc-review metadata and PNGs.');
    const failures = metadata.captures.filter(item => item.status !== 'passed');
    assert.equal(failures.length, 0, `${failures.length} browser capture(s) failed. Inspect review-artifacts/mexico-agriculture metadata and failure PNGs.`);
    metadata.status = 'passed';
  } catch (error) {
    metadata.status = 'failed'; metadata.failure = error.stack ?? String(error);
    throw error;
  } finally {
    metadata.completedAt = new Date().toISOString();
    await browser?.close();
    if (server) await new Promise(resolve => server.close(resolve));
    await writeFile(path.join(output, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  }
}

main().catch(error => {console.error(error); process.exitCode = 1;});
