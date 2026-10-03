import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync, inflateSync } from 'node:zlib';
import { polygonCellMask, maskNativeValues, categoryForValue } from '../../scripts/prepare-africa-livestock.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const assets = path.join(root, 'public/assets/atlas/africa-livestock-v1');
const read = name => fs.readFileSync(path.join(assets, name));
const manifest = JSON.parse(read('manifest.json'));
const ledger = JSON.parse(read(manifest.sourceLedger));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function decodePng(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8, width, height;
  const chunks = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); assert.equal(body[8], 8); assert.equal(body[9], 6); }
    if (type === 'IDAT') chunks.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  assert.equal(raw.length, height * (width * 4 + 1));
  const pixels = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++) {
    assert.equal(raw[row * (width * 4 + 1)], 0, 'retained PNG uses lossless no-filter scanlines');
    raw.copy(pixels, row * width * 4, row * (width * 4 + 1) + 1, (row + 1) * (width * 4 + 1));
  }
  return { width, height, pixels };
}

test('GLW4 assets retain the licensed2020 density product and exact native dimensions', () => {
  assert.deepEqual(Object.keys(manifest.layers), ['cattle', 'goats', 'sheep']);
  assert.deepEqual(manifest.bounds, [-27, -36, 64, 39]);
  assert.equal(manifest.width, 1092); assert.equal(manifest.height, 900);
  assert.equal(manifest.resolutionDegrees, 1 / 12);
  assert.deepEqual(manifest.processing.sourceWindow, [1836, 612, 2928, 1512]);
  assert.equal(ledger.license, 'CC-BY-4.0');
  assert.equal(ledger.referenceYear, 2020); assert.equal(ledger.publishedAt, '2024-07-15');
  assert.equal(ledger.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.match(ledger.licenseQuote, /All datasets are licensed/);
  assert.equal(ledger.sources.length, 3);
  assert.ok(ledger.sources.every(source => source.url.startsWith('https://storage.googleapis.com/fao-gismgr-glw4-2020-data/') && source.actualDecodedType === 'Float32Array'));
  const geography = fs.readFileSync(path.join(root, manifest.boundary.file));
  assert.equal(sha(geography), manifest.boundary.sha256);
  assert.equal(manifest.boundary.features, 55);
  for (const [name, proof] of Object.entries(manifest.processing.files)) {
    const bytes = read(name);
    assert.equal(bytes.length, proof.bytes, name); assert.equal(sha(bytes), proof.sha256, name);
    if (proof.decodedSha256) {
      const decoded = gunzipSync(bytes);
      assert.equal(decoded.length, proof.decodedBytes); assert.equal(sha(decoded), proof.decodedSha256);
    }
  }
});

test('native mask retains polygon holes and multiple islands without coastline filling', () => {
  const square = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
  const hole = [[1, 1], [1, 3], [3, 3], [3, 1], [1, 1]];
  const island = [[5, 1], [6, 1], [6, 2], [5, 2], [5, 1]];
  const geography = { features: [{ geometry: { type: 'MultiPolygon', coordinates: [[square, hole], [island]] } }] };
  const mask = polygonCellMask(geography, [0, 0, 6, 4], 6, 4);
  assert.deepEqual([...mask], [
    1, 1, 1, 1, 0, 0,
    1, 0, 0, 1, 0, 0,
    1, 0, 0, 1, 0, 1,
    1, 1, 1, 1, 0, 0,
  ]);
  const values = new Float32Array([0, 2.75, -9999, 4.5]);
  assert.deepEqual([...maskNativeValues(values, new Uint8Array([1, 1, 1, 0]), -9999)], [0, 2.75, -1, -1]);
  assert.throws(() => maskNativeValues(new Float32Array([-3]), new Uint8Array([1]), -9999), /Negative source density/);
  assert.equal(categoryForValue(-1), null);
  assert.equal(categoryForValue(0).id, 'density-zero');
  assert.equal(categoryForValue(.5).id, 'density-0');
  assert.equal(categoryForValue(1).id, 'density-1');
  assert.equal(categoryForValue(10).id, 'density-2');
  assert.equal(categoryForValue(50).id, 'density-3');
  assert.equal(categoryForValue(100).id, 'density-4');
  assert.equal(categoryForValue(250).id, 'density-5');
});

test('all2,948,400 PNG pixels agree with retained density query values including zero and missing', () => {
  for (const [species, layer] of Object.entries(manifest.layers)) {
    const decoded = gunzipSync(read(layer.grid)), view = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength);
    const png = decodePng(read(layer.image));
    assert.equal(png.width, layer.width); assert.equal(png.height, layer.height);
    assert.equal(decoded.length, layer.width * layer.height * 4);
    assert.deepEqual(layer.breaks, [1, 10, 50, 100, 250]);
    assert.equal(layer.legend.length, 7); assert.equal(layer.positiveLegend.length, 6);
    let valid = 0, zeros = 0;
    const classes = Object.fromEntries(layer.legend.map(row => [row.id, 0]));
    for (let i = 0; i < layer.width * layer.height; i++) {
      const value = view.getFloat32(i * 4, true), pixel = i * 4;
      if (value === -1) { assert.equal(png.pixels[pixel + 3], 0, `${species}:${i} missing transparency`); continue; }
      assert.ok(Number.isFinite(value) && value >= 0);
      valid++; if (value === 0) zeros++;
      // Independent fixed-class thresholds, not the generator's category function.
      const classIndex = value === 0 ? 0 : value < 1 ? 1 : value < 10 ? 2 : value < 50 ? 3 : value < 100 ? 4 : value < 250 ? 5 : 6;
      const legend = layer.legend[classIndex], color = Number.parseInt(legend.color.slice(1), 16);
      assert.equal(png.pixels[pixel], (color >> 16) & 255);
      assert.equal(png.pixels[pixel + 1], (color >> 8) & 255);
      assert.equal(png.pixels[pixel + 2], color & 255);
      assert.equal(png.pixels[pixel + 3], 255);
      classes[legend.id]++;
    }
    assert.equal(valid, layer.validPixels); assert.equal(zeros, layer.zeroPixels);
    assert.deepEqual(classes, layer.categoryCounts);
    assert.ok(zeros > 80000, 'valid modelledzero remains available instead of missing');
  }
});

test('original-file spot values and country input years survive publication without inferred substitutes', () => {
  const expected = {
    cattle: [60.164363861083984, 135.56336975097656, 34.467472076416016],
    goats: [110.67816925048828, 19.329038619995117, 50.671390533447266],
    sheep: [58.79475784301758, 60.47866439819336, 76.70087432861328],
  };
  for (const [species, layer] of Object.entries(manifest.layers)) {
    const bytes = gunzipSync(read(layer.grid));
    for (let i = 0; i < 3; i++) {
      const sample = manifest.representativeSpots[species][i];
      assert.equal(sample.value, expected[species][i]);
      assert.equal(sample.displayValue, expected[species][i]);
      assert.equal(bytes.readFloatLE((sample.displayRow * layer.width + sample.displayColumn) * 4), expected[species][i]);
    }
    const ocean = manifest.representativeSpots[species].find(p => p.name === 'Atlantic-ocean');
    assert.equal(ocean.value, null); assert.equal(ocean.displayValue, null);
    assert.equal(layer.countryInputs.ETH.censusYear, 2002);
    assert.equal(layer.countryInputs.NER.censusYear, 2017);
    assert.equal(layer.countryInputs.KEN.censusYear, 2019);
    assert.match(layer.scope, /異なる年/);
    assert.match(layer.description, /独立に検証できない/);
    assert.equal(layer.unit, '頭/km²'); assert.equal(layer.sourceActualType, 'Float32');
  }
  assert.equal(manifest.layers.sheep.countryInputs.SDN.censusYear, null);
  assert.equal(manifest.layers.sheep.countryInputs.SYC.censusYear, null);
  assert.equal(manifest.layers.sheep.countryInputs.SDN.status, 'country-not-listed-in-source-metadata');
  assert.equal(manifest.layers.cattle.countryInputs.SSD.censusYear, null);
});
