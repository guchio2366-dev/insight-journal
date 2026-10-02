import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {
  europeDrainageBasins, readEuropeDrainageBasins, normaliseEuropeDrainageBasin,
  europeDrainageBasinByIndex, europeDrainageIndexForBasin, readEuropeDrainageValues,
  europeDrainageCell, europeDrainageOutline, europeDrainagePositionLabel,
} from '../../src/lib/atlas-europe-drainage.ts';

const bytes = zlib.gunzipSync(fs.readFileSync(new URL('../../public/assets/atlas/europe/drainage-v1/values.bin.gz', import.meta.url)));
const values = readEuropeDrainageValues(bytes);
const indexes = europeDrainageBasins.map(basin => basin.index);
const unlistedIndex = Math.max(...indexes) + 1;
const selectedIndex = europeDrainageIndexForBasin('2040048790');

test('canonical HYBAS_ID state round-trips every listed index and rejects zero/unlisted input', () => {
  assert.ok(europeDrainageBasins.length > 0);
  assert.equal(new Set(indexes).size, europeDrainageBasins.length);
  for (const basin of europeDrainageBasins) {
    const id = String(basin.HYBAS_ID);
    assert.equal(normaliseEuropeDrainageBasin(id), id);
    assert.equal(europeDrainageIndexForBasin(id), basin.index);
    assert.equal(europeDrainageBasinByIndex(basin.index), basin);
    assert.equal(new URLSearchParams({ basin: id }).get('basin'), id);
  }
  for (const invalid of [undefined, null, 0, 2040048790, '', '0', '2040048790 ', ' 2040048790', '02040048790', '2.040048790e9', '2040048790.0', '9999999999']) {
    assert.equal(normaliseEuropeDrainageBasin(invalid), undefined);
    assert.equal(europeDrainageIndexForBasin(invalid), undefined);
  }
  for (const index of [-1, 0, unlistedIndex, NaN, Infinity, 1.5, '1']) assert.equal(europeDrainageBasinByIndex(index), undefined);
  assert.ok(europeDrainageBasins.some(basin => basin.NEXT_DOWN === 0), 'sink metadata zero remains legitimate');
});

test('identifier reader rejects ambiguous mappings and the mask reader rejects zero/foreign codes', () => {
  const first = europeDrainageBasins[0], second = europeDrainageBasins[1];
  assert.throws(() => readEuropeDrainageBasins([first, { ...second, index: first.index }]));
  assert.throws(() => readEuropeDrainageBasins([first, { ...second, HYBAS_ID: first.HYBAS_ID }]));
  assert.throws(() => readEuropeDrainageBasins([{ ...first, index: 0 }]));
  assert.throws(() => readEuropeDrainageBasins([{ ...first, NEXT_DOWN: -1 }]));
  for (const invalid of [0, unlistedIndex, NaN, Infinity, 1.25]) {
    const buffer = new ArrayBuffer(4); new DataView(buffer).setFloat32(0, invalid, true);
    assert.throws(() => readEuropeDrainageValues(buffer, { width: 1, height: 1 }));
  }
  const missing = new ArrayBuffer(4); new DataView(missing).setFloat32(0, -1, true);
  assert.deepEqual([...readEuropeDrainageValues(missing, { width: 1, height: 1 })], [-1]);
});

test('real display pixel-centre lookups match source known locations and expose only listed metadata', () => {
  for (const [point, id] of [
    [[-.12, 51.5], 2040048790],
    [[2.35, 48.86], 2040022150],
    [[37.62, 55.75], 2040315940],
    [[24.94, 60.17], 2040028670],
    [[-21.94, 64.15], 2040057170],
    [[60, 60], 3040481930],
    [[64, 55], 3040481930],
    [[61, 65], 3040203170],
  ]) {
    const index = europeDrainageIndexForBasin(String(id));
    assert.ok(index, `Source identifier ${id} is present regardless of source-region digit`);
    const selected = europeDrainageCell(values, point);
    assert.ok(selected);
    assert.equal(selected.index, index);
    assert.equal(selected.basin.HYBAS_ID, id);
    assert.equal(europeDrainageCell(values, selected.center).index, index);
  }
  for (const point of [[65, 40], [-26, 40], [0, 32], [0, 74], [NaN, 50], [-20, 40]]) assert.equal(europeDrainageCell(values, point), undefined);
  for (const point of [[19.04, 47.50], [7.59, 50.36]]) {
    const selected = europeDrainageCell(values, point);
    assert.ok(selected);
    assert.match(europeDrainagePositionLabel(selected.basin), /その表示位置を含む区画/);
    assert.doesNotMatch(europeDrainagePositionLabel(selected.basin), /ドナウ|ライン|全流域/);
  }
});

test('outline follows selected-side four-neighbour edges, including holes, and leaves other units transparent', () => {
  const spec = { width: 5, height: 5 };
  const firstIndex = indexes[0], secondIndex = indexes[1];
  const solid = new Float32Array(25).fill(firstIndex);
  const outline = europeDrainageOutline(solid, firstIndex, spec);
  assert.equal(outline.transparent, false);
  assert.equal(outline.boundaryPixels, 16);
  assert.equal(outline.rgba[(2 * 5 + 2) * 4 + 3], 0, 'interior remains transparent');
  const hole = solid.slice(); hole[12] = -1;
  const withHole = europeDrainageOutline(hole, firstIndex, spec);
  assert.equal(withHole.boundaryPixels, 20);
  assert.equal(withHole.rgba[12 * 4 + 3], 0, 'missing hole itself is not painted');
  assert.equal(withHole.rgba[6 * 4 + 3], 0, 'diagonal neighbour is not a four-neighbour edge');
  const mixed = Float32Array.from([firstIndex, firstIndex, secondIndex, firstIndex, firstIndex, secondIndex, -1, -1, secondIndex]);
  const chosen = europeDrainageOutline(mixed, firstIndex, { width: 3, height: 3 });
  assert.equal(chosen.boundaryPixels, 4);
  for (let i = 0; i < mixed.length; i++) assert.equal(chosen.rgba[i * 4 + 3] > 0, mixed[i] === firstIndex);
  assert.equal(europeDrainageOutline(solid, secondIndex, spec).transparent, true, 'a valid unit absent from this mask stays transparent');
  for (const invalid of [0, -1, unlistedIndex, undefined, '2040048790']) {
    const empty = europeDrainageOutline(mixed, invalid, { width: 3, height: 3 });
    assert.equal(empty.transparent, true);
    assert.equal(empty.boundaryPixels, 0);
    assert.ok(empty.rgba.every(value => value === 0));
  }
});

test('real selected boundary never paints another source index and every compact unit has display pixels', () => {
  assert.ok(selectedIndex);
  const selected = europeDrainageOutline(values, selectedIndex);
  assert.equal(selected.transparent, false);
  assert.ok(selected.boundaryPixels > 0);
  let counted = 0;
  for (let i = 0; i < values.length; i++) if (selected.rgba[i * 4 + 3]) { assert.equal(values[i], selectedIndex); counted++; }
  assert.equal(counted, selected.boundaryPixels);
  const visible = new Set(values); visible.delete(-1);
  assert.equal(visible.size, europeDrainageBasins.length, 'metadata retains the actual display-contributing units');
  for (const basin of europeDrainageBasins) assert.ok(visible.has(basin.index), `HYBAS_ID ${basin.HYBAS_ID} has a displayed pixel`);
});
