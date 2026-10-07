import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';

const raw = JSON.parse(await readFile('src/data/atlas/canada/industry-international.json', 'utf8'));
const module = await bundleCanadaSource('src/data/atlas/canada/industry-international.ts', {platform: 'node', format: 'esm'});
const lib = await import(`data:text/javascript;base64,${Buffer.from(module).toString('base64')}`);

test('CER snapshot preserves export quantities, the two Canadian-export denominators and its publication edition', () => {
  const data = lib.canadaIndustryInternational;
  assert.equal(data.source.referenceYear, 2024);
  assert.equal(data.source.publishedAt, '2025-06-11');
  assert.equal(data.source.accessedAt, '2026-10-07');
  assert.equal(new URL(data.source.url).hostname, 'www.cer-rec.gc.ca');
  assert.match(data.source.url, /market-snapshot-annual-trade-summary-crude-oil\.html$/);
  assert.match(data.source.method, /原CSV・XLSXは取得していない.*最新の改訂系列とは区別/);
  assert.deepEqual(data.indicators.map(m => [m.id, m.value, m.unit, m.sourceDisplay]), [
    ['exports', 4.20, 'million-barrels-per-day', '4.20'],
    ['us-share', 93, 'percent', '93%'],
    ['alberta-share', 91, 'percent', '91%'],
  ]);
  assert.equal(data.indicators[0].denominator, null);
  for (const metric of data.indicators.slice(1)) assert.match(metric.denominator, /^2024年のカナダの原油輸出量/);
  assert.deepEqual(lib.formatCanadaIndustryInternationalIndicator(data.indicators[0]), {value: '420', unit: '万バレル／日'});
  assert.deepEqual(lib.formatCanadaIndustryInternationalIndicator(data.indicators[1]), {value: '93', unit: '%'});
  assert.match(data.roundingNote, /93%.*公表値.*3\.93÷4\.20.*再計算していない/);
  assert.equal(JSON.stringify(data).includes('38.7'), false, 'Blocked potash candidate is not adopted');
});

test('The source boundary rejects percentage/quantity confusion, missing denominators and unrelated geographic focus', () => {
  for (const change of [
    d => {d.indicators[0].unit = 'percent';},
    d => {d.indicators[1].denominator = null;},
    d => {d.indicators[2].value = 101;},
    d => {d.source.referenceYear = 2021;},
    d => {d.source.publishedAt = '';},
    d => {d.source.url = 'https://example.com/';},
    d => {d.focus.subsector = 'auto';},
  ]) {
    const changed = structuredClone(raw); change(changed);
    assert.throws(() => lib.parseCanadaIndustryInternationalEvidence(changed));
  }
});

test('The oil case remains scoped to the overview or oil-related reading, never manufacturing, mining or another province', () => {
  for (const state of [['all', 'all', null], ['resources', 'all', null], ['resources', 'oil-gas', null], ['resources', 'oil-gas', 'Alberta']]) {
    assert.equal(lib.showCanadaIndustryInternational(...state), true);
  }
  for (const state of [['manufacturing', 'all', null], ['manufacturing', 'auto', 'Ontario'], ['resources', 'mining', null], ['resources', 'utilities', null], ['services', 'all', null], ['resources', 'oil-gas', 'Saskatchewan'], ['all', 'all', 'Ontario']]) {
    assert.equal(lib.showCanadaIndustryInternational(...state), false);
  }
});
