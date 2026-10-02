import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync, inflateSync } from 'node:zlib';
import { sumCompleteMonthlyNormals, sourceCellIndex, precipitationColor } from '../../scripts/europe/prepare-precipitation.mjs';
import { displayCell, frame } from '../../src/lib/atlas-europe-view.ts';
import { europePrecipitationLayer, europePrecipitationReading } from '../../src/data/atlas/europe/water-reading.ts';

const root = new URL('../../', import.meta.url);
const bytes = filename => readFileSync(new URL(filename, root));
const json = filename => JSON.parse(bytes(filename).toString('utf8'));
const base = 'public/assets/atlas/europe/precipitation-v1/';
const manifest = json(base + 'manifest.json');
const validation = json('data-source/atlas/europe/precipitation/validation.json');
const raw = gunzipSync(bytes(base + 'values.bin.gz'));
const grid = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const sha = value => createHash('sha256').update(value).digest('hex');

test('annual normals require all twelve valid months and preserve zero', () => {
  assert.equal(sumCompleteMonthlyNormals(Array(12).fill(0)), 0);
  assert.equal(sumCompleteMonthlyNormals(Array(12).fill(100)), 1200);
  assert.equal(sumCompleteMonthlyNormals([0, ...Array(11).fill(100)]), 1100);
  assert.equal(sumCompleteMonthlyNormals(Array(11).fill(100)), null);
  for (const missing of [-99999.9921875, -1, NaN, Infinity]) assert.equal(sumCompleteMonthlyNormals([missing, ...Array(11).fill(100)]), null);
  assert.notEqual(precipitationColor(0), precipitationColor(-1));
  assert.equal(precipitationColor(-1), null);
  assert.notEqual(precipitationColor(249.999), precipitationColor(250));
});

test('pinned source baseline, provenance hashes and display frame are consistent', () => {
  assert.equal(manifest.period, '1991-01-01/2020-12-31');
  assert.equal(manifest.originalResolution, '0.25° regular latitude/longitude grid');
  assert.equal(manifest.inputMd5, 'd701c717e08ce6ad457c9f4004984d65');
  assert.equal(manifest.sourceVariable, 'gpcc_precip');
  assert.equal(manifest.unit, 'mm/year');
  assert.equal(manifest.projection, 'EPSG:3857');
  assert.deepEqual(manifest.bounds, [-25, 32, 65, 73]);
  assert.deepEqual(manifest.frame, frame);
  assert.equal(raw.length, 1800 * 1502 * 4);
  assert.equal(manifest.lookup.gridType, 'display');
  assert.equal(manifest.processing.displayGridIsOriginalResolution, false);
  assert.equal(manifest.processing.colorClassificationBasis, 'Stored float32 display lookup value');
  assert.equal(manifest.processing.rawSourceIncludedInRepository, false);
  for (const [name, record] of Object.entries(manifest.files)) assert.equal(sha(bytes(base + name)), record.sha256, name);
  for (const input of manifest.inputs) assert.equal(sha(bytes(input.path)), input.sha256, input.path);
  assert.deepEqual(manifest.licenseEvidence.dataCiteRightsList, []);
});

test('actual source monthly examples survive annual sum, latitude audit and shared map picking', () => {
  assert.equal(validation.sourceRecords, 12);
  assert.deepEqual(validation.sourceDimensions, [1440, 720]);
  assert.equal(validation.sourceCoordinates.firstLatitude, 89.875);
  assert.equal(validation.sourceCoordinates.lastLatitude, -89.875);
  assert.equal(validation.sourceCoordinates.declaredLatitudeUnit, 'degrees_south');
  for (const sample of validation.orientationSamples) {
    const annual = sample.monthlyNormals.reduce((sum, value) => sum + value, 0);
    assert.equal(sample.annualNormal, annual, sample.name);
    assert.equal(sample.flippedLatitudeAnnual, -1, sample.name);
    assert.deepEqual(sourceCellIndex(...sample.sourceCellCenter).center, sample.sourceCellCenter);
    const picked = displayCell(grid, sample.name === 'Helsinki' ? sample.sampleCoordinate : sample.sourceCellCenter, -1);
    assert.ok(picked && picked.value !== null, sample.name);
    assert.ok(Math.abs(picked.value - annual) < .001, `${sample.name}: annual source normal survives float32 display storage`);
  }
  assert.equal(sourceCellIndex(180, 0), null);
  assert.equal(sourceCellIndex(0, 91), null);
  assert.equal(displayCell(grid, validation.orientationSamples.find(sample => sample.name === 'Helsinki').sourceCellCenter, -1).value, null, 'a valid coastal source cell is still clipped where its centre is offshore');
  assert.equal(displayCell(grid, [-15, 50], -1).value, null, 'Atlantic ocean remains missing');
  assert.equal(displayCell(grid, [65, 55], -1), null, 'east display cutoff excludes the rest of Russia');
});

test('every map pixel agrees with the float32 lookup colour bin and missing mask', () => {
  const png = bytes(base + 'precipitation.png');
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const imageData = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { assert.equal(data.readUInt32BE(0), 1800); assert.equal(data.readUInt32BE(4), 1502); assert.equal(data[9], 6); }
    if (type === 'IDAT') imageData.push(data);
    offset += length + 12;
  }
  const scanlines = inflateSync(Buffer.concat(imageData));
  assert.equal(scanlines.length, 1502 * (1800 * 4 + 1));
  const palette = europePrecipitationLayer.colors.map(color => Buffer.from(color.slice(1), 'hex'));
  let colorMismatchPixels = 0, alphaMismatchPixels = 0, firstMismatch;
  for (let row = 0; row < 1502; row++) assert.equal(scanlines[row * (1800 * 4 + 1)], 0);
  for (let i = 0; i < grid.length; i++) {
    const row = Math.floor(i / 1800), column = i % 1800, offset = row * (1800 * 4 + 1) + 1 + column * 4;
    const value = grid[i], alpha = scanlines[offset + 3];
    if (value === -1) { if (alpha !== 0) alphaMismatchPixels++; }
    else {
      assert.ok(Number.isFinite(value) && value >= 0);
      if (alpha !== 255) alphaMismatchPixels++;
      let bin = 0;
      while (bin < europePrecipitationLayer.breaks.length && value >= europePrecipitationLayer.breaks[bin]) bin++;
      const expected = palette[bin];
      if (scanlines[offset] !== expected[0] || scanlines[offset + 1] !== expected[1] || scanlines[offset + 2] !== expected[2]) {
        colorMismatchPixels++;
        firstMismatch ??= { row, column, value, expectedColor: europePrecipitationLayer.colors[bin], actualRgb: [...scanlines.subarray(offset, offset + 3)] };
      }
    }
  }
  assert.equal(alphaMismatchPixels, 0, 'all 2,703,600 pixels preserve valid/missing alpha');
  assert.equal(colorMismatchPixels, 0, `all valid pixel colours must classify the stored float32 value; first mismatch: ${JSON.stringify(firstMismatch)}`);
});

test('45 targets retain honest microstate coverage and bounded precipitation claims', () => {
  assert.equal(manifest.countryCoverage.length, 45);
  assert.equal(new Set(manifest.countryCoverage.map(item => item.code)).size, 45);
  assert.deepEqual(manifest.validation.unresolvedDisplayCountries, ['VAT', 'MCO']);
  assert.deepEqual(manifest.validation.allMissingDisplayCountries, []);
  for (const country of manifest.countryCoverage) assert.equal(country.displayPixelCenters, country.validDisplayPixelCenters + country.missingDisplayPixelCenters);
  assert.equal(manifest.countryCoverage.reduce((sum, item) => sum + item.validDisplayPixelCenters, 0), manifest.validation.validDisplayPixels);
  assert.equal(europePrecipitationLayer.gridType, 'display');
  assert.equal(europePrecipitationLayer.nodata, -1);
  assert.deepEqual(europePrecipitationLayer.colors, manifest.colors);
  assert.deepEqual(europePrecipitationLayer.breaks, manifest.breaks);
  assert.equal(europePrecipitationLayer.labels.length, manifest.colors.length);
  assert.match(europePrecipitationReading.note, /0.25度/);
  assert.match(europePrecipitationReading.note, /12か月/);
  assert.match(europePrecipitationReading.note, /流量/);
});
