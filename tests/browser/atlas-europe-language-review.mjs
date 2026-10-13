import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.EUROPE_REVIEW_BASE_URL ?? 'http://127.0.0.1:4173/insight-journal/';
const output = process.env.EUROPE_LANGUAGE_OUTPUT ?? 'docs/review/europe-2026-10-13/images';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.EUROPE_REVIEW_CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const records = [];
try {
  for (const renderer of ['auto', 'static']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const release = await (await page.request.get(new URL('_release.json', base).href)).json();
    if (process.env.EUROPE_REVIEW_EXPECTED_HEAD) assert.equal(release.commitSha, process.env.EUROPE_REVIEW_EXPECTED_HEAD);
    const url = new URL(`atlas/europe/population/?layer=language${renderer === 'static' ? '&render=static' : ''}`, base);
    await page.goto(url.href, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-europe-detail]')?.dataset.initialized === 'true');
    if (renderer === 'auto') await page.locator('.eu-live-map.is-ready').waitFor();
    await page.waitForFunction(() => document.querySelectorAll('[data-eu-language-layer] path').length === 331);
    assert.equal(await page.locator('[data-eu-topic="language"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('[data-eu-focus]').innerText(), /イングランド・ウェールズ/);
    assert.equal(await page.locator('[data-eu-language-area] option').count(), 332);
    assert.equal(await page.locator('[data-eu-language-category] option').count(), 10);
    assert.match(await page.locator('[data-eu-language-reader]').innerText(), /欧州全域の実使用分布は未収録/);
    assert.match(await page.locator('[data-eu-language-reader]').innerText(), /ウェールズ語のみの人数・割合はこの表では分離できません/);
    assert.equal(await page.locator('[data-eu-language-regional] tbody tr').count(), 8);
    assert.equal(await page.locator('[data-eu-language-daily] tbody tr').count(), 10);
    const defaultFills = await page.locator('[data-eu-language-layer] path').evaluateAll(nodes => new Set(nodes.map(node => node.style.fill)).size);
    assert(defaultFills >= 4, 'Default LAD map needs readable regional variation');
    await page.locator('[data-eu-language-area]').selectOption('E09000025');
    assert.match(await page.locator('[data-eu-language-reading]').innerText(), /Newham：.*34\./);
    assert.equal(new URL(page.url()).searchParams.get('languageArea'), 'E09000025');
    const extent = await page.locator('[data-eu-static]').getAttribute('viewBox');
    await page.locator('[data-eu-language-category]').selectOption('polish');
    assert.match(await page.locator('[data-eu-language-reading]').innerText(), /ポーランド語/);
    assert.equal(new URL(page.url()).searchParams.get('languageCategory'), 'polish');
    assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'), extent, 'Changing a category must not move the map');
    const selected = page.locator('[data-eu-language-layer] [data-eu-language-shape="E09000025"]');
    assert.equal(await selected.evaluate(node => node.style.stroke), 'rgb(132, 30, 55)');
    if (renderer === 'static') {
      await page.locator('[data-eu-language-area]').selectOption('');
      await selected.focus(); await selected.press('Enter');
      assert.equal(new URL(page.url()).searchParams.get('languageArea'), 'E09000025');
    }
    await page.screenshot({ path: path.join(output, `language-${renderer}-1920.png`), animations: 'disabled' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('[data-eu-language-layer] path').length === 331);
    assert.equal(await page.locator('[data-eu-language-category]').inputValue(), 'polish');
    assert.equal(await page.locator('[data-eu-language-area]').inputValue(), 'E09000025');
    assert.deepEqual(errors, []);
    records.push({ renderer, releaseCommit: release.commitSha, width: 1920, height: 1080, deviceScaleFactor: 1, areas: 331, categories: 10, defaultFillCount: defaultFills, selected: 'Newham', category: 'polish', reload: true, errors });
    await page.close();
  }
  await writeFile(path.join(output, 'language-checks.json'), JSON.stringify(records, null, 2) + '\n');
  console.log(JSON.stringify(records));
} finally { await browser.close(); }
