import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const asset = path.join(root, 'public/assets/atlas/europe/tree-cover-v1');
const source = path.join(root, 'data-source/atlas/europe/tree-cover');
const manifest = JSON.parse(fs.readFileSync(path.join(asset, 'manifest.json'), 'utf8'));
const proof = JSON.parse(fs.readFileSync(path.join(source, 'retained-extraction.json'), 'utf8'));
const grid = zlib.gunzipSync(fs.readFileSync(path.join(asset, 'mask.bin.gz')));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const mercator = latitude => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
const [west, south, east, north] = manifest.bounds;
function displayPixel(longitude, latitude) {
  const x = Math.floor((longitude - west) / (east - west) * manifest.width);
  const y = Math.floor((mercator(north) - mercator(latitude)) / (mercator(north) - mercator(south)) * manifest.height);
  const pixelLongitude = west + (x + .5) / manifest.width * (east - west);
  const pixelLatitude = (2 * Math.atan(Math.exp(mercator(north) - (y + .5) / manifest.height * (mercator(north) - mercator(south)))) - Math.PI / 2) * 180 / Math.PI;
  return { x, y, longitude: pixelLongitude, latitude: pixelLatitude, value: grid.readFloatLE((y * manifest.width + x) * 4) };
}

test('tree-cover outputs and exact ranged-input record match retained hashes', () => {
  for (const [filename, record] of Object.entries(manifest.files)) {
    const bytes = fs.readFileSync(path.join(asset, filename));
    assert.equal(hash(bytes), record.sha256);
    assert.equal(bytes.length, record.bytes);
  }
  for (const input of manifest.inputs) assert.equal(hash(fs.readFileSync(path.join(root, input.path))), input.sha256);
  const ranged = JSON.parse(fs.readFileSync(path.join(source, 'range-inputs.json'), 'utf8'));
  assert.equal(ranged.tiles.length, manifest.extraction.tileCount);
  assert.ok(ranged.tiles.some(tile => tile.tile === 'N60E027'));
  assert.ok(ranged.tiles.some(tile => tile.tile === 'N54E036'));
  for (const tile of ranged.tiles) {
    assert.ok(tile.observedCodes.every(code => proof.allowedCodes.includes(code)), tile.tile);
    assert.equal(tile.prefix.bytes, 65536);
    assert.ok(tile.overview.bytes <= 1200000);
  }
});

test('mask has the existing Europe extent and separates tree, other valid cover and missing', () => {
  const viewSource = fs.readFileSync(path.join(root, 'src/lib/atlas-europe-view.ts'), 'utf8');
  const declaration = /export const frame = \{([^}]+)\}/.exec(viewSource)[1];
  const frame = Object.fromEntries(declaration.split(',').map(property => { const [key, value] = property.split(':'); return [key.trim(), Number(value.trim())]; }));
  assert.deepEqual(manifest.frame, frame);
  assert.deepEqual(manifest.bounds, [-25, 32, 65, 73]);
  assert.equal(manifest.projection, 'EPSG:3857');
  assert.equal(grid.length, manifest.width * manifest.height * 4);
  const states = new Set();
  for (let at = 0; at < grid.length; at += 4) states.add(grid.readFloatLE(at));
  assert.deepEqual([...states].sort((a, b) => a - b), [-1, 0, 1]);
  assert.equal(displayPixel(-20, 40).value, -1, 'Atlantic water outside target land');
  assert.equal(displayPixel(2.3522, 48.8566).value, 0, 'Paris other valid land cover remains zero');
  assert.equal(manifest.countryCoverage.length, 45);
  assert.equal(new Set(manifest.countryCoverage.map(country => country.code)).size, 45);
  assert.ok(manifest.countryCoverage.every(country => country.missingDisplayPixelCentres === 0));
  assert.deepEqual(manifest.countryCoverage.filter(country => !country.displayPixelCentres).map(country => country.code).sort(), ['MCO', 'VAT']);
});

test('Finland and western Russia display pixels match retained official categorical blocks', () => {
  const points = {
    N60E027: [[28.24, 61.07], [28.5, 62], [27.6, 61.6], [29.6, 62.6]],
    N54E036: [[37.6173, 55.7558], [37.1, 55.1], [36.5, 56.4], [38.5, 54.5]],
  };
  const seen = new Set();
  for (const sample of proof.samples) {
    const compressed = fs.readFileSync(path.join(source, sample.file));
    assert.equal(hash(compressed), sample.sha256);
    const categorical = zlib.inflateSync(compressed);
    assert.equal(categorical.length, sample.storedRowStride * sample.storedHeight);
    for (const point of points[sample.tile]) {
      const pixel = displayPixel(...point);
      const column = Math.floor((pixel.longitude - sample.bounds[0]) / 3 * sample.width);
      const row = Math.floor((sample.bounds[3] - pixel.latitude) / 3 * sample.height);
      const code = categorical[row * sample.storedRowStride + column];
      assert.ok(proof.allowedCodes.includes(code));
      const expected = code === sample.sourceNoData ? -1 : code === proof.treeClass ? 1 : 0;
      assert.equal(pixel.value, expected, `${sample.tile} at ${point}`);
      seen.add(expected);
    }
  }
  assert.ok(seen.has(0) && seen.has(1), 'Ground truth includes tree and non-tree examples');
});

test('PNG colours and transparent missing pixels agree with every query-mask pixel', () => {
  const png = fs.readFileSync(path.join(asset, 'tree-cover.png'));
  assert.equal(png.readUInt32BE(16), manifest.width);
  assert.equal(png.readUInt32BE(20), manifest.height);
  const compressed = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.subarray(offset + 4, offset + 8).toString();
    if (type === 'IDAT') compressed.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const rows = zlib.inflateSync(Buffer.concat(compressed));
  for (let y = 0; y < manifest.height; y++) {
    assert.equal(rows[y * (manifest.width * 4 + 1)], 0);
    for (let x = 0; x < manifest.width; x++) {
      const value = grid.readFloatLE((y * manifest.width + x) * 4);
      const at = y * (manifest.width * 4 + 1) + 1 + x * 4;
      const expected = value === -1 ? [0, 0, 0, 0] : value === 1 ? [45, 108, 62, 255] : [237, 236, 229, 255];
      for (let channel = 0; channel < 4; channel++) if (rows[at + channel] !== expected[channel]) assert.fail(`PNG/mask mismatch at ${x},${y}`);
    }
  }
});
