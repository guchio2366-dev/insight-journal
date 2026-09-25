import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { asiaClimateClasses } from '../../src/data/atlas/asia-climate-definitions.ts';
import { gridCellAt, mercatorPoint } from '../../src/lib/atlas-asia-state.ts';

const base = new URL('../../public/assets/atlas/asia-climate-v1/', import.meta.url);
const buffers = new Map();
const read = name => {
  if (!buffers.has(name)) buffers.set(name, readFileSync(new URL(name, base)));
  return buffers.get(name);
};
const json = name => JSON.parse(read(name));
const manifest = json('manifest.json');
const regions = Object.fromEntries(Object.entries(manifest.regions).map(([id, record]) => [id, { record, grid: json(record.grid) }]));

// Decode the three small non-interlaced RGBA PNGs once. This checks delivered
// image pixels independently of the Python generator and browser renderer.
function pngPixels(raw) {
  assert.deepEqual(raw.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = raw.readUInt32BE(16), height = raw.readUInt32BE(20);
  assert.equal(raw[24], 8); assert.equal(raw[25], 6); assert.equal(raw[28], 0);
  const chunks = [];
  for (let offset = 8; offset < raw.length;) {
    const length = raw.readUInt32BE(offset), kind = raw.toString('ascii', offset + 4, offset + 8);
    if (kind === 'IDAT') chunks.push(raw.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const filtered = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  assert.equal(filtered.length, height * (stride + 1));
  const rgba = Buffer.alloc(height * stride);
  for (let row = 0; row < height; row++) {
    const filter = filtered[row * (stride + 1)];
    assert.ok(filter <= 4);
    for (let col = 0; col < stride; col++) {
      const at = row * stride + col;
      const left = col >= 4 ? rgba[at - 4] : 0, up = row ? rgba[at - stride] : 0;
      const upperLeft = row && col >= 4 ? rgba[at - stride - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - upperLeft, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - upperLeft);
        predictor = a <= b && a <= c ? left : b <= c ? up : upperLeft;
      }
      rgba[at] = (filtered[row * (stride + 1) + col + 1] + predictor) & 255;
    }
  }
  return { width, height, rgba };
}

test('気候原本・基準期間・ライセンスを固定し、全公開ファイルのハッシュを照合する', () => {
  assert.equal(manifest.period, '1991–2020');
  assert.equal(manifest.source.archiveUrl, 'https://ndownloader.figshare.com/files/45057352');
  assert.equal(manifest.source.archiveSha256, 'd37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d');
  assert.equal(manifest.source.member, '1991_2020/koppen_geiger_0p1.tif');
  assert.equal(manifest.source.license, 'CC BY 4.0');
  assert.equal(manifest.source.sourceResolutionDegrees, 0.1);
  assert.match(manifest.attribution, /Beck.*2023.*CC BY 4\.0/);
  const boundary = readFileSync(new URL('../../' + manifest.processing.boundaryFile, import.meta.url));
  const generator = readFileSync(new URL('../../' + manifest.processing.script, import.meta.url));
  assert.equal(createHash('sha256').update(boundary).digest('hex'), manifest.processing.boundarySha256);
  assert.equal(createHash('sha256').update(generator).digest('hex'), manifest.processing.scriptSha256);
  for (const [name, record] of Object.entries(manifest.files)) {
    const raw = read(name);
    assert.equal(raw.byteLength, record.bytes, name);
    assert.equal(createHash('sha256').update(raw).digest('hex'), record.sha256, name);
  }
  assert.ok(!Object.keys(manifest.files).some(name => /\.(zip|tif)$/.test(name)), 'large source archive must not be a served asset');
});

test('3地域の格子・凡例・分類画素数が一致し、欠測を含む範囲を公開する', () => {
  assert.deepEqual(Object.keys(regions).sort(), ['east-asia', 'south-central-asia', 'southeast-asia']);
  assert.deepEqual(asiaClimateClasses, json('legend.json'));
  assert.deepEqual(asiaClimateClasses.map(c => c.id), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal(new Set(asiaClimateClasses.map(c => c.code)).size, 30);
  for (const [id, { record, grid }] of Object.entries(regions)) {
    assert.equal(grid.values.length, grid.width * grid.height, id);
    assert.equal(grid.crs, 'EPSG:3857'); assert.equal(grid.noData, 0);
    assert.deepEqual(grid.bounds3857, record.bounds3857);
    const counts = new Map();
    for (const value of grid.values) {
      assert.ok(Number.isInteger(value) && value >= 0 && value <= 30, id);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    assert.deepEqual([...counts.keys()].sort((a, b) => a - b), record.classIds, id);
    assert.deepEqual(Object.fromEntries(counts), record.classPixelCounts, id);
    assert.equal([...counts.values()].reduce((sum, value) => sum + value, 0), record.classifiedPixels, id);
    const [west, south, east, north] = record.bounds4326;
    assert.deepEqual(record.imageCoordinates, [[west, north], [east, north], [east, south], [west, south]]);
  }
});

test('対象30か国・地域を維持し、モルディブの不足を架空の分類で埋めない', () => {
  const expected = {
    'east-asia': 'CHN JPN KOR MNG PRK TWN',
    'southeast-asia': 'BRN IDN KHM LAO MMR MYS PHL SGP THA TLS VNM',
    'south-central-asia': 'AFG BGD BTN IND KAZ KGZ LKA MDV NPL PAK TJK TKM UZB',
  };
  for (const [id, { record }] of Object.entries(regions)) {
    assert.deepEqual(Object.keys(record.countryCoverage).sort(), expected[id].split(' ').sort());
    for (const [code, coverage] of Object.entries(record.countryCoverage)) {
      assert.ok(!['RUS', 'IRN', 'USA'].includes(code));
      assert.equal(coverage.classifiedPixels + coverage.sourceNoDataPixels, coverage.maskPixels, code);
      assert.ok(code === 'MDV' ? coverage.classifiedPixels === 0 : coverage.classifiedPixels > 0, code);
    }
  }
  assert.deepEqual(regions['south-central-asia'].record.countriesWithoutClassifiedPixels, ['MDV']);
  assert.equal(gridCellAt(regions['south-central-asia'].grid, 73.51, 4.18), null);
});

test('既知地点の照会と配信PNGの色が合い、東西反転・上下反転を検出する', () => {
  const probes = {
    'east-asia': [[139.76, 35.68, 'Cfa'], [126.98, 37.57, 'Dwa'], [106.92, 47.92, 'BSk'], [140, 20, null]],
    'southeast-asia': [[103.82, 1.35, 'Af'], [100.50, 13.75, 'Aw'], [106.83, -6.18, 'Af'], [92, -10, null]],
    'south-central-asia': [[77.21, 28.61, 'BSh'], [76.95, 43.24, 'Dfa'], [73.51, 4.18, null], [46, 0, null]],
  };
  for (const [id, list] of Object.entries(probes)) {
    const { record, grid } = regions[id], png = pngPixels(read(record.image));
    assert.equal(png.width, grid.width); assert.equal(png.height, grid.height);
    for (const [lng, lat, code] of list) {
      const climate = asiaClimateClasses.find(c => c.code === code);
      assert.equal(gridCellAt(grid, lng, lat), climate?.id ?? null, `${id}: ${lng},${lat}`);
      const [x, y] = mercatorPoint(lng, lat), [west, south, east, north] = record.bounds3857;
      const column = Math.floor((x - west) / (east - west) * png.width);
      const row = Math.floor((north - y) / (north - south) * png.height);
      const offset = (row * png.width + column) * 4;
      const actual = [...png.rgba.subarray(offset, offset + 4)];
      const expected = climate ? [...Buffer.from(climate.color.slice(1), 'hex'), 255] : [0, 0, 0, 0];
      assert.deepEqual(actual, expected, `${id}: pixel at ${lng},${lat}`);
    }
  }
});
