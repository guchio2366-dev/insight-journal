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

test('入口の6つの選択肢が中間ページを挟まず、存在する地図へ直接つながる', async () => {
  const doc = await page('atlas');
  const links = [...doc.querySelectorAll('.atlas-region-link')];
  assert.equal(links.length, 6);
  assert.deepEqual([...doc.querySelectorAll('.atlas-group-heading h2')].map(el => el.textContent), ['南北アメリカ', '欧州', 'アジア']);
  for (const link of links) {
    const route = link.getAttribute('href').replace('/insight-journal/', '');
    assert.notEqual(route, 'atlas/asia/');
    await access(path.join(dist, route, 'index.html'));
  }
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
