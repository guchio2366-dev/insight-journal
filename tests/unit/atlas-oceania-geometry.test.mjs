import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unwrapPacificRing, clipOceaniaRing, oceaniaRings, oceaniaPath, oceaniaExtent, projectOceania, oceaniaWidth, oceaniaHeight } from '../../src/lib/atlas-oceania-geometry.ts';
import { oceaniaNames, oceaniaSourceRegions } from '../../src/data/atlas/oceania.ts';
const data = JSON.parse(readFileSync(new URL('../../src/data/atlas/oceania-countries.json', import.meta.url)));
const feature = code => data.features.find(f => f.properties.code === code);

test('180度を横切る輪郭は短い辺でつながり、経度の同値表現も同じ位置になる', () => {
  assert.deepEqual(unwrapPacificRing([[179,0],[-179,0],[-179,2],[179,2],[179,0]]), [[179,0],[181,0],[181,2],[179,2],[179,0]]);
  assert.deepEqual(projectOceania([-179,0]), projectOceania([181,0]));
  assert.equal(projectOceania([180,0])[0], oceaniaWidth/2);
  assert.deepEqual(clipOceaniaRing([[90,-60],[120,-60],[120,-50],[90,-50],[90,-60]]), [[110,-58],[120,-58],[120,-50],[110,-50],[110,-58]]);
});

test('25の国・地域が一意で、小島を含む全対象に有効な描画範囲がある', () => {
  const targets = data.features.filter(f => f.properties.kind === 'oceania');
  assert.equal(targets.length,25);
  assert.equal(new Set(targets.map(f => f.properties.code)).size,25);
  for (const f of targets) {
    assert.ok(oceaniaNames[f.properties.code]);
    assert.ok(oceaniaSourceRegions[f.properties.subregion]);
    const path = oceaniaPath(f.geometry);
    assert.ok(path.startsWith('M') && path.endsWith('Z'));
    assert.ok(!/NaN|Infinity/.test(path));
    const [left,top,right,bottom] = oceaniaExtent(f.geometry);
    assert.ok(left >= 0 && top >= 0 && right <= oceaniaWidth && bottom <= oceaniaHeight);
    assert.ok(right > left && bottom > top, f.properties.code);
  }
  for (const code of ['TUV','NRU','MHL','FSM','PLW','KIR','WSM','TON']) assert.ok(feature(code));
});

test('フィジー・NZ・キリバスの島々を同じ太平洋側に保つ', () => {
  for (const [code,min,max,maxSpan] of [['FJI',174,183,9],['NZL',165,190,25],['KIR',169,212,43]]) {
    const rings = oceaniaRings(feature(code).geometry);
    const longitudes = rings.flat().map(p => p[0]);
    assert.ok(Math.min(...longitudes) >= min,code);
    assert.ok(Math.max(...longitudes) <= max,code);
    assert.ok(Math.max(...longitudes)-Math.min(...longitudes) < maxSpan,code);
    for (const ring of rings) for (let i=1;i<ring.length;i++) assert.ok(Math.abs(ring[i][0]-ring[i-1][0]) < 20,code);
  }
});
