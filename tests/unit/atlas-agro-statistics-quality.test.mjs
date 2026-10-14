import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build, stop} from 'esbuild';
import {Window} from 'happy-dom';

const compiled = await build({entryPoints:['src/lib/atlas-agro-statistics.ts'], bundle:true,
  platform:'node', format:'esm', write:false, logLevel:'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const data = JSON.parse(readFileSync('public/assets/atlas/regional-production-statistics-v1/statistics.json'));
const eu = JSON.parse(readFileSync('public/assets/atlas/europe/farming-statistics-v1/statistics.json'));
const rus = data.countries.RUS;
const wheat = rus.series.find(s => s.id === 'wheat-production');
const dom = new Window();
const parse = html => {const node = dom.document.createElement('main'); node.innerHTML = html; return node;};
const chartYears = root => [...root.querySelectorAll('.agro-trend circle title')]
  .map(node => Number(node.textContent.match(/^\d{4}/)?.[0]));
after(async () => {stop(); await dom.happyDOM.close();});

test('Russia nonofficial QCL values remain in raw evidence but never enter the main charts or ranking', () => {
  assert.equal(wheat.rows.find(r => r.year === 2024).rawValue, '82588000.000000');
  assert.equal(wheat.rows.find(r => r.year === 2023).rawValue, '92770000.000000');
  for (const product of rus.series.filter(s => s.domain === 'QCL')) {
    const rejected = product.rows.filter(r => r.flag !== 'A' || r.worldFlag !== 'A');
    for (const row of rejected) {
      const root = parse(api.renderAgroColumns(data, 'RUS', product.id, row.year));
      const main = root.querySelector('.agro-columns');
      assert.ok(main, `${product.id}/${row.year} has a national presentation`);
      assert.match(main.textContent, /公式値限定|公式値.*限定|国・WorldともA/, 'quality exclusion is explained');
      assert.ok(!main.querySelector('.agro-columns>section')?.textContent?.includes(api.agroNumber(row.value)),
        `${product.id}/${row.year} non-A value in the supply column`);
      assert.equal(main.querySelector('.agro-world-pie'), null, `${product.id}/${row.year} non-A pie`);
      assert.ok(!chartYears(main).includes(row.year), `${product.id}/${row.year} non-A trend point`);
      assert.ok(!api.agroRanking(data, product, row.year).some(r => r.code === 'RUS'),
        `${product.id}/${row.year} Russia non-A in the ranking`);
      const raw = root.querySelector('.agro-definitions');
      assert.ok(raw, 'raw evidence remains available');
      const ownRow = [...raw.querySelectorAll('tbody tr')].find(tr =>
        tr.querySelector('th').textContent === String(row.year));
      assert.ok(ownRow.textContent.includes(row.rawValue), 'rejected source value is retained verbatim');
      assert.ok(ownRow.textContent.includes(row.flag), 'rejected source flag is retained');
      if (row.flag === 'X') assert.match(ownRow.textContent, /Unofficial figure/);
    }
  }
});

test('the selected other country cannot reintroduce Russian non-A QCL values through ranking', () => {
  for (const product of rus.series.filter(s => s.domain === 'QCL')) {
    for (const row of product.rows.filter(r => r.flag !== 'A' || r.worldFlag !== 'A')) {
      const other = Object.entries(data.countries).find(([code, country]) => code !== 'RUS'
        && country.series.some(s => s.id === product.id && s.rows.some(r => r.year === row.year && r.value !== null)));
      assert.ok(other);
      const otherSeries = other[1].series.find(s => s.id === product.id);
      assert.ok(!api.agroRanking(data, otherSeries, row.year).some(r => r.code === 'RUS'));
      const root = parse(api.renderAgroWorld(data, other[0], otherSeries, row.year));
      assert.doesNotMatch(root.querySelector('.agro-ranking')?.textContent ?? '', /ロシア/);
    }
  }
});

test('Russia requires an official World denominator and keeps the existing 2020–2022 wheat pairs', () => {
  const known = wheat.rows.filter(r => r.year >= 2020 && r.year <= 2022);
  for (const row of known) {
    const own = eu.countries.RUS.observations.find(r => r[0] === wheat.id && r[1] === row.year);
    const total = eu.world.observations.find(r => r[0] === wheat.id && r[1] === row.year);
    assert.equal(row.flag, 'A'); assert.equal(row.worldFlag, 'A');
    assert.equal(row.rawValue, own[2]); assert.equal(row.worldRawValue, total[2]);
    const root = parse(api.renderAgroWorld(data, 'RUS', wheat, row.year));
    assert.ok(root.querySelector('.agro-world-pie'), `${row.year} official pair still has a share`);
    assert.ok(chartYears(root).includes(row.year));
  }
  for (const worldFlag of ['E', 'I', 'X', 'F']) {
    const rows = [{...known[2], worldFlag}];
    const altered = {...wheat, rows};
    const fixture = {...data, countries:{...data.countries, RUS:{...rus, series:[altered]}}};
    assert.equal(parse(api.renderAgroWorld(fixture, 'RUS', altered, 2022)).querySelector('.agro-world-pie'), null);
    assert.ok(!api.agroRanking(fixture, altered, 2022).some(r => r.code === 'RUS'));
  }
});

test('FO and RL external-organization X flags are distinct from Russia QCL official-only presentation', () => {
  for (const product of rus.series.filter(s => s.domain === 'FO' || s.domain === 'RL')) {
    for (const row of product.rows.filter(r => r.flag === 'X')) {
      const root = parse(api.renderAgroWorld(data, 'RUS', product, row.year));
      assert.ok(root.querySelector('.agro-world-pie'), `${product.domain}/${product.id}/${row.year} external X is retained`);
      assert.ok(chartYears(root).includes(row.year), 'existing forest external values remain in the trend');
      assert.ok(api.agroRanking(data, product, row.year).some(r => r.code === 'RUS'));
    }
  }
});
