import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clipEuropeRing, europeRings, europePath } from '../../src/lib/atlas-europe-geometry.ts';
const data = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe-countries.json', import.meta.url)));
const feature = code => data.features.find(f => f.properties.code === code);

test('欧州枠を横切る輪郭を交点で閉じ、範囲外の島を取り除く', () => {
  const clipped = clipEuropeRing([[-30,30],[70,30],[70,75],[-30,75],[-30,30]]);
  assert.deepEqual(new Set(clipped.map(p => p.join(','))), new Set(['-25,32','65,32','65,73','-25,73']));
  assert.deepEqual(clipEuropeRing([[-55,3],[-50,3],[-50,7],[-55,3]]), []);
});

test('フランス海外領土とロシア極東が拡大範囲へ混入しない', () => {
  const france = europeRings(feature('FRA').geometry).flat();
  assert.ok(Math.min(...france.map(p => p[0])) > -6);
  assert.ok(Math.min(...france.map(p => p[1])) > 40);
  const russia = europeRings(feature('RUS').geometry).flat();
  assert.ok(russia.length > 10);
  assert.ok(russia.every(([lon,lat]) => lon >= -25 && lon <= 65 && lat >= 32 && lat <= 73));
});

test('45の選択対象が一意で、東欧と補完した小国に描画可能な輪郭がある', () => {
  const targets = data.features.filter(f => f.properties.kind === 'europe');
  assert.equal(targets.length, 45);
  assert.equal(new Set(targets.map(f => f.properties.code)).size, 45);
  for (const code of ['UKR','BLR','MDA','POL','ROU','RUS','MLT','AND','LIE','MCO','SMR','VAT']) {
    assert.equal(feature(code).properties.kind, 'europe');
    const path = europePath(feature(code).geometry);
    assert.ok(path.startsWith('M') && path.endsWith('Z'), code);
    assert.ok(!/NaN|Infinity/.test(path), code);
  }
});
