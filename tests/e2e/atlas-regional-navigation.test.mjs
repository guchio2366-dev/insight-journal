import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { Window } from 'happy-dom';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
async function page(route) {
  const window = new Window();
  window.document.write(await readFile(path.join(dist, route, 'index.html'), 'utf8'));
  return window.document;
}
const selections = doc => [...doc.querySelectorAll('[data-country-button]')].map(button => button.dataset.countryButton).sort();

test('世界地図と地域名から、公開されている各地域の地図へ直接つながる', async () => {
  const doc = await page('atlas');
  const svg = doc.querySelector('svg[data-atlas-world-map]');
  assert.ok(svg, 'a static world map is available without JavaScript');
  const labelledBy = (svg.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  const labels = labelledBy.map(id => doc.getElementById(id));
  assert.ok(labels.some(el => el?.localName === 'title' && el.textContent.trim()), 'the map has a referenced title');
  assert.ok(labels.some(el => el?.localName === 'desc' && el.textContent.trim()), 'the map has a referenced description');
  assert.ok(labels.every(el => el && svg.contains(el)), 'all map label references resolve inside the SVG');

  const routes = new Map([
    ['north-america', 'atlas/north-america/'],
    ['latin-america', 'atlas/latin-america/'],
    ['europe', 'atlas/europe/'],
    ['east-asia', 'atlas/asia/east-asia/'],
    ['southeast-asia', 'atlas/asia/southeast-asia/'],
    ['south-central-asia', 'atlas/asia/south-central-asia/']
  ]);
  for (const id of ['africa', 'oceania']) {
    let published = false;
    try {
      await access(fileURLToPath(new URL(`../../src/pages/atlas/${id}/index.astro`, import.meta.url)));
      published = true;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const region = svg.querySelector(`[data-world-region="${id}"]`);
    assert.ok(region, `${id} is represented on the world map`);
    if (published) routes.set(id, `atlas/${id}/`);
    else assert.equal(region.getAttribute('href'), null, `${id} does not link to an unpublished page`);
  }

  const expectedHrefs = [...routes.values()].map(route => `/insight-journal/${route}`).sort();
  const listLinks = [...doc.querySelectorAll('a.atlas-region-link[href]')];
  assert.deepEqual(listLinks.map(link => link.getAttribute('href')).sort(), expectedHrefs, 'the text links expose exactly the published regions');
  const mapLinks = [...svg.querySelectorAll('a[data-world-region][href]')];
  assert.deepEqual(mapLinks.map(link => link.getAttribute('href')).sort(), expectedHrefs, 'map and text navigation have the same direct destinations');
  for (const [id, route] of routes) {
    const region = svg.querySelector(`a[data-world-region="${id}"]`);
    assert.ok(region, `${id} is keyboard reachable as a native link`);
    assert.equal(region.getAttribute('href'), `/insight-journal/${route}`);
    assert.ok(region.querySelector('path[data-world-country]'), `${id} has country shapes`);
    await access(path.join(dist, route, 'index.html'));
  }

  const regionFor = code => svg.querySelector(`a[href] [data-world-country="${code}"]`)?.closest('[data-world-region]')?.getAttribute('data-world-region');
  assert.equal(regionFor('MEX'), 'north-america', 'Mexico belongs to the published North America map');
  assert.equal(regionFor('IRN'), undefined, 'Iran is outside the published Asia regions');
  assert.equal(regionFor('GRL'), undefined, 'Greenland is not one of the three published North America countries');
  assert.equal(regionFor('RUS'), 'europe', 'the published western Russia shape opens Europe');
  assert.equal(svg.querySelector('[data-world-country="ATA"]'), null, 'Antarctica is omitted from this navigation map');
});

test('アジアの3ページは選択対象を分離し、中東・ロシアを選択肢に含めない', async () => {
  const expected = {
    'east-asia': ['CHN','JPN','KOR','MNG','PRK','TWN'],
    'southeast-asia': ['BRN','IDN','KHM','LAO','MMR','MYS','PHL','SGP','THA','TLS','VNM'],
    'south-central-asia': ['AFG','BGD','BTN','IND','KAZ','KGZ','LKA','MDV','NPL','PAK','TJK','TKM','UZB']
  };
  for (const [region, codes] of Object.entries(expected)) {
    const doc = await page(`atlas/asia/${region}`);
    assert.deepEqual(selections(doc), codes.sort());
    assert.equal(doc.querySelectorAll('.regional-tabs a').length, 3);
    assert.equal(doc.querySelectorAll('.regional-tabs [aria-current="page"]').length, 1);
    assert.ok(doc.querySelector('svg[data-default-frame] path[data-map-country]'));
    assert.equal(doc.querySelector('meta[name="robots"]'), null);
  }
});

test('北米の国を切り替えられ、中南米とメキシコの選択対象が重ならない', async () => {
  const usa = await page('atlas/north-america');
  assert.ok(usa.querySelector('[data-atlas-explorer]'));
  assert.deepEqual([...usa.querySelectorAll('.regional-countries a')].map(a => a.textContent), ['カナダ','米国','メキシコ']);
  assert.deepEqual(selections(await page('atlas/north-america/canada')), ['CAN']);
  assert.deepEqual(selections(await page('atlas/north-america/mexico')), ['MEX']);
  const latin = selections(await page('atlas/latin-america'));
  assert.ok(latin.includes('BRA') && latin.includes('GTM') && latin.includes('CUB'));
  assert.ok(!latin.includes('MEX') && !latin.includes('USA') && !latin.includes('CAN'));
});

test('旧アジアURLから地域・国を復元でき、新しい地域ページがサイトマップにある', async () => {
  const doc = await page('atlas/asia');
  const legacy = doc.querySelector('[data-asia-legacy]');
  const countries = JSON.parse(legacy.dataset.countryRoutes);
  assert.equal(countries.JPN, 'east-asia');
  assert.equal(countries.SGP, 'southeast-asia');
  assert.equal(countries.KAZ, 'south-central-asia');
  assert.equal(countries.IRN, undefined);
  assert.equal(countries.RUS, undefined);
  const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
  for (const route of ['asia/east-asia','asia/southeast-asia','asia/south-central-asia','latin-america','north-america/canada','north-america/mexico']) assert.ok(sitemap.includes(`/atlas/${route}/`));
});
