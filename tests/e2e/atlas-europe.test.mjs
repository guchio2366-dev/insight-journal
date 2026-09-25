import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

test('欧州ページを一覧とサイトマップから発見でき、東欧を選択できる', () => {
  const window = new Window();
  const doc = window.document;
  doc.write(readFileSync(new URL('../../dist/atlas/europe/index.html', import.meta.url), 'utf8'));
  assert.equal(doc.querySelector('meta[name="robots"]'), null);
  assert.equal(doc.querySelectorAll('[data-country-button]').length, 45);
  assert.equal(doc.querySelector('[data-country-button="UKR"]').dataset.countryRegion, 'east');
  assert.equal(doc.querySelector('[data-country-button="RUS"]').dataset.countryRegion, 'east');
  assert.ok(doc.querySelector('[data-country-button="VAT"]'));
  assert.equal(doc.querySelector('svg').dataset.defaultFrame, '0 0 1200 908');
  assert.ok(readFileSync(new URL('../../dist/atlas/index.html', import.meta.url), 'utf8').includes('/insight-journal/atlas/europe/'));
  assert.ok(readFileSync(new URL('../../dist/sitemap.xml', import.meta.url), 'utf8').includes('/insight-journal/atlas/europe/'));
  window.happyDOM.abort();
});
