import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

test('気候・小麦ページを直接開け、出典・静的地図・欠測付き数値表を読める',()=>{
  for (const field of ['nature','agriculture']) {
    const window=new Window();const doc=window.document;
    doc.write(readFileSync(new URL(`../../dist/atlas/europe/${field}/index.html`,import.meta.url),'utf8'));
    assert.ok(doc.querySelector('[data-eu-static]'));
    assert.equal(doc.querySelectorAll('[data-eu-country] option').length,46);
    assert.equal(doc.querySelectorAll('[data-city-card]').length,24);
    assert.equal(doc.querySelectorAll('[data-city-card="kyiv"] tbody tr').length,12);
    assert.ok(doc.querySelector('[data-city-card="rome"]').textContent.includes('欠測'));
    const active=field==='nature'?'climate':'wheat';
    assert.ok(doc.querySelector(`[data-eu-${active}-image]`).getAttribute('href'));
    assert.ok(doc.querySelector('a[href="https://doi.org/10.7910/DVN/SWPENT"]'));
    assert.ok(doc.querySelector('[data-eu-field="wheat"]'));
    assert.equal(doc.querySelector('meta[name="robots"]'),null);
    window.happyDOM.abort();
  }
  const sitemap=readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8');
  assert.ok(sitemap.includes('/atlas/europe/nature/'));
  assert.ok(sitemap.includes('/atlas/europe/agriculture/'));
});
