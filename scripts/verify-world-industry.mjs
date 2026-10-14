import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { sectors } from '../src/data/atlas/world-industry/index.ts';

const dist = await realpath('dist');
const output = path.resolve(process.env.WORLD_INDUSTRY_REVIEW_OUTPUT ?? 'review-artifacts/world-industry');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    assert.ok(pathname.startsWith('/insight-journal/'));
    let file = path.resolve(dist, `.${pathname.slice('/insight-journal'.length)}`);
    assert.ok(file.startsWith(`${dist}/`));
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    file = await realpath(file); assert.ok(file.startsWith(`${dist}/`));
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.REVIEW_CHROME_PATH ?? '/usr/bin/chromium', headless: true, chromiumSandbox: true });
} catch (error) {
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: false, blocked: 'sandboxed-browser-launch', error: error.message, screenshotCaptured: false }, null, 2) + '\n');
  await new Promise(resolve => server.close(resolve));
  throw error;
}
const base = `http://127.0.0.1:${server.address().port}/insight-journal/atlas/industry/world/`;
const report = { browser: browser.version(), sandbox: true, cases: [] };
const labelPositions = panel => panel.locator('[data-wi-label]').evaluateAll(nodes => nodes.map(n => ({ id: n.dataset.wiLabel, transform: n.getAttribute('transform') })));
try {
  for (const [width, height] of [[1440, 900], [1280, 800], [390, 844], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.goto(base); await page.waitForSelector('[data-world-industry][data-ready=true]');
    if (width === 1440) await page.screenshot({ path: path.join(output, '1440-initial.jpg'), type: 'jpeg', quality: 84, animations: 'disabled' });
    const cases = [];
    for (const sector of sectors) {
      report.phase = `${width}/${sector.id}/sector`;
      await page.locator(`[data-wi-sector="${sector.id}"]`).click();
      const panel = page.locator(`[data-wi-panel="${sector.id}"]`);
      assert.equal(await page.locator('[data-wi-panel]:not([hidden])').count(), 1);
      assert.equal(await panel.locator('[data-wi-site]').count(), sector.sites.length);
      const overflowingLabels = await panel.locator('[data-wi-label]').evaluateAll(nodes => nodes.filter(node => node.querySelector('.wi-map-name').getBBox().width > Number(node.querySelector('rect').getAttribute('width')) - 34).map(node => node.textContent));
      assert.deepEqual(overflowingLabels, [], 'map names fit their fixed label boxes');
      const positions = await labelPositions(panel);
      const frame = await panel.locator('svg.wi-map').getAttribute('viewBox');
      if (width >= 1280) {
        const flow = await panel.locator('.wi-flow').boundingBox(), map = await panel.locator('.wi-map-scroll').boundingBox();
        assert.ok(flow.x + flow.width <= map.x, 'value flow sits next to the map');
        assert.ok(flow.y + flow.height < height && map.y + map.height < height, 'complete flow and map are visible together on PC');
      }
      for (const stage of sector.stages) {
        report.phase = `${width}/${sector.id}/stage/${stage.id}`;
        await panel.locator(`[data-wi-stage="${stage.id}"]`).click();
        assert.equal(await panel.locator('[data-wi-place]:not([hidden])').count(), sector.sites.filter(s => s.stage === stage.id).length);
        assert.equal(await panel.locator('[data-wi-line]:not([hidden])').count(), 0);
        assert.deepEqual(await labelPositions(panel), positions, 'stage selection leaves labels fixed');
      }
      await panel.locator('[data-wi-stage=all]').click();
      for (const site of sector.sites) {
        report.phase = `${width}/${sector.id}/site/${site.id}`;
        await panel.locator(`[data-wi-place="${site.id}"]`).click();
        assert.equal(await panel.locator(`[data-wi-card="${site.id}"]`).isVisible(), true);
        assert.equal(await panel.locator(`[data-wi-site="${site.id}"]`).getAttribute('aria-pressed'), 'true');
        assert.equal(new URL(page.url()).searchParams.get('site'), site.id);
      }
      const first = panel.locator('[data-wi-site]').first();
      report.phase = `${width}/${sector.id}/keyboard`;
      await first.focus(); await page.keyboard.press('Enter');
      assert.equal(await first.getAttribute('aria-pressed'), 'true');
      for (const link of sector.links) {
        report.phase = `${width}/${sector.id}/link/${link.id}`;
        await panel.locator(`[data-wi-link="${link.id}"]`).click();
        assert.equal(await panel.locator('[data-wi-line]:not([hidden])').count(), 1);
        assert.equal(await panel.locator(`[data-wi-evidence="${link.id}"]`).isVisible(), true);
      }
      assert.deepEqual(await labelPositions(panel), positions, 'site and supply selection leave labels fixed');
      assert.equal(await panel.locator('svg.wi-map').getAttribute('viewBox'), frame);
      await page.reload(); await page.waitForSelector('[data-ready=true]');
      assert.equal(await panel.isVisible(), true, 'URL reload restores sector');
      if (sector.links.length) assert.equal(await panel.locator('[data-wi-line]:not([hidden])').count(), 1, 'URL reload restores single connection');
      await page.evaluate(() => scrollTo(0, 0));
      if ((width === 1440 && ['semiconductor', 'gas', 'copper'].includes(sector.id)) || (width === 390 && sector.id === 'semiconductor')) {
        if (sector.id === 'gas') await panel.locator('[data-wi-link=gas-ichthys-naoetsu]').click();
        else {
          const quantified = sector.sites.find(site => ['設備能力', '生産実績'].includes(site.scale.basis));
          if (quantified) await panel.locator(`[data-wi-place="${quantified.id}"]`).click();
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `${width}-${sector.id}.jpg`), type: 'jpeg', quality: 84, animations: 'disabled' });
      }
      cases.push({ sector: sector.id, stages: sector.stages.length, sites: sector.sites.length, connections: sector.links.length, labelsStable: true });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'only the map may scroll horizontally');
    assert.deepEqual(errors, []);
    report.cases.push({ width, height, sectors: cases, errors }); await page.close();
  }
  const nojs = await browser.newPage({ javaScriptEnabled: false });
  await nojs.goto(base); assert.equal(await nojs.locator('[data-wi-panel=semiconductor]').isVisible(), true);
  assert.equal(await nojs.locator('[data-wi-card]:visible').count(), 1); await nojs.close();
  const invalid = await browser.newPage(); await invalid.goto(`${base}?sector=unknown&stage=bad&site=bad&link=bad`);
  await invalid.waitForSelector('[data-ready=true]'); assert.equal(await invalid.locator('[data-wi-panel=semiconductor]').isVisible(), true); await invalid.close();
  report.passed = true;
  delete report.phase;
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} catch (error) {
  report.passed = false; report.error = error.message;
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.error(`::error title=World industry browser review::${report.phase ?? 'initialization'}: ${error.message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
