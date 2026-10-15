// Four review images from the production build of the unchanged Europe source tree.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim();
const productHead = process.env.EUROPE_PRODUCT_HEAD;
const reviewHead = process.env.EUROPE_REVIEW_EXPECTED_HEAD;
const base = new URL(process.env.EUROPE_REVIEW_BASE_URL);
const output = resolve(process.env.EUROPE_REVIEW_OUTPUT);
assert.equal(base.origin, 'http://127.0.0.1:4173');
assert.equal(git('rev-parse', 'HEAD'), reviewHead);
assert.equal(git('rev-parse', 'HEAD^'), productHead);
assert.equal(git('rev-parse', 'HEAD:src'), git('rev-parse', 'HEAD^:src'));
assert.equal(git('status', '--porcelain'), '');
await mkdir(output, {recursive: true});
assert.deepEqual(await readdir(output), []);

const manifest = {
  status: 'running', productHead, reviewHead, sourceTree: git('rev-parse', 'HEAD:src'),
  sourceURL: base.href, viewport: {width: 1536, height: 1000}, images: [],
  browser: null, fonts: process.env.EUROPE_REVIEW_JAPANESE_FONT_MATCH,
  pageErrors: [], blockedRequests: [],
};
const save = () => writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
let browser;
try {
  const release = await fetch(new URL('_release.json', base), {redirect: 'manual'});
  assert.equal(release.status, 200);
  const releaseData = await release.json();
  assert.equal(releaseData.commitSha, reviewHead);
  browser = await chromium.launch({headless: true, chromiumSandbox: true,
    executablePath: process.env.EUROPE_REVIEW_CHROMIUM_PATH,
    args: ['--enable-unsafe-swiftshader', '--disable-background-networking', '--disable-component-update']});
  manifest.browser = await browser.version();
  const context = await browser.newContext({viewport: manifest.viewport, reducedMotion: 'reduce', serviceWorkers: 'block'});
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin) {
      manifest.blockedRequests.push(url.href);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => manifest.pageErrors.push(error.message));
  const open = async path => {
    await page.goto(new URL(path, base).href, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.querySelector('[data-europe-detail]')?.dataset.initialized === 'true');
    await page.locator('[data-eu-live].is-ready').waitFor();
    await page.evaluate(async () => { await document.fonts.ready; scrollTo(0, 0); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    assert.equal(await page.locator('[data-eu-static]').evaluate(node => getComputedStyle(node).visibility), 'hidden');
    const canvas = page.locator('[data-eu-live] canvas').first();
    assert.ok(await canvas.evaluate(node => node.width > 0 && node.height > 0));
  };
  const capture = async (name, selection) => {
    assert.deepEqual(manifest.pageErrors, []);
    assert.deepEqual(manifest.blockedRequests, []);
    const geometry = await page.evaluate(() => {
      const rect = selector => { const box = document.querySelector(selector)?.getBoundingClientRect(); return box && {x: box.x, y: box.y, width: box.width, height: box.height}; };
      return {map: rect('.eu-map-stage'), reader: rect('.eu-read-panel'),
        belowMap: rect('[data-eu-farming-statistics], .eu-topic-below, [data-eu-topic-below]'),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth};
    });
    assert.equal(geometry.horizontalOverflow, false);
    assert.ok(geometry.map?.width > 400 && geometry.reader?.x >= geometry.map.x + geometry.map.width);
    const file = `${name}.png`;
    const image = await page.screenshot({path: resolve(output, file), fullPage: true, animations: 'disabled'});
    manifest.images.push({file, url: page.url(), selection, geometry,
      dimensions: {width: image.readUInt32BE(16), height: image.readUInt32BE(20)},
      bytes: image.length, sha256: createHash('sha256').update(image).digest('hex')});
    await save();
  };

  await open('atlas/europe/agriculture/');
  assert.equal(await page.locator('[data-eu-farm-area]').evaluateAll(nodes => nodes.filter(node => node.style.display !== 'none').length), 16);
  await capture('europe-agriculture-initial', 'all 16 crop and livestock distribution areas');
  await page.locator('[data-eu-layer="wheat"]').click();
  await page.waitForFunction(() => document.querySelector('[data-eu-map-place="wheat"]')?.getAttribute('aria-pressed') === 'true');
  assert.equal(await page.locator('[data-eu-farm-area]').evaluateAll(nodes => nodes.filter(node => node.style.display !== 'none').length), 16);
  await capture('europe-agriculture-wheat-selected', 'wheat outline; all distribution areas retained');

  await open('atlas/europe/nature/?layer=climate');
  await page.locator('[data-eu-city-choice]').selectOption('london');
  await page.locator('[data-city-reading="london"]:visible').waitFor();
  assert.equal(await page.locator('#eu-city-heading').textContent(), 'ロンドンの雨温図');
  await capture('europe-climate-london-selected', 'London monthly rain and temperature; classification, reason, crops');

  await open('atlas/europe/nature/?layer=water');
  assert.equal(await page.locator('[data-eu-map-title]').textContent(), '河川・湖');
  await capture('europe-water-rivers-groundwater-initial', 'rivers and lakes; groundwater status in reader');
  assert.equal(manifest.images.length, 4);
  assert.ok(manifest.images.reduce((sum, image) => sum + image.bytes, 0) <= 10 * 1024 * 1024, 'Four PNGs must fit under 10 MiB');
  manifest.status = 'passed';
  await save();
  await context.close();
} catch (error) {
  manifest.status = 'failed'; manifest.error = String(error);
  await save();
  throw error;
} finally {
  await browser?.close();
}
