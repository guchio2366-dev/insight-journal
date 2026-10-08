import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const base = new URL('../../public/assets/atlas/africa-agriculture-distribution-v1/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = ['crop-maize-harvested', 'crop-rice-harvested', 'crop-wheat-harvested', 'crop-cassava-harvested', 'livestock-cattle', 'livestock-goats', 'livestock-sheep'];
const asset = name => {
  const parts = manifest.parts[name];
  assert.ok(parts?.length, `missing parts for ${name}`);
  const chunks = parts.map(part => {
    const bytes = readFileSync(new URL(part.file, base));
    assert.equal(bytes.length, part.bytes);
    assert.equal(sha(bytes), part.sha256);
    assert.ok(bytes.length <= 256 * 1024);
    return bytes;
  });
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.length, manifest.files[name].bytes);
  assert.equal(sha(bytes), manifest.files[name].sha256);
  return bytes;
};
const collection = layer => JSON.parse(gunzipSync(asset(layer.file)));
const grid = layer => {
  const bytes = gunzipSync(readFileSync(new URL(layer.grid, base)));
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
};

test('agriculture distribution uses every retained 5-minute grid and its existing absolute legend breaks', () => {
  assert.deepEqual(Object.keys(manifest.layers), expected);
  assert.deepEqual(manifest.bounds, [-27, -36, 64, 39]);
  assert.equal(manifest.width, 1092);
  assert.equal(manifest.height, 900);
  assert.equal(manifest.resolutionDegrees, 1 / 12);
  assert.equal(manifest.processing.generatorSha256, sha(readFileSync(new URL('../../scripts/prepare-africa-agriculture-distribution.py', import.meta.url))));
  assert.equal(manifest.processing.sourceAssetsModified, false);
  assert.equal(manifest.processing.aggregation, 'none');
  assert.equal(manifest.processing.quantileSelection, 'none');
  assert.equal(manifest.processing.inputResampling, 'none');
  assert.match(manifest.processing.algorithm, /corner_mask=false/);
  for (const [key, layer] of Object.entries(manifest.layers)) {
    const originalBytes = readFileSync(new URL(layer.sourceManifest, base));
    const original = JSON.parse(originalBytes).layers[layer.sourceLayer];
    assert.equal(layer.sourceManifestSha256, sha(originalBytes));
    assert.equal(layer.sourceGridSha256, sha(readFileSync(new URL(layer.grid, base))));
    for (const property of ['breaks', 'legend', 'positiveLegend', 'colors', 'zeroColor', 'zeroId', 'unit', 'sourceUrl', 'period', 'license', 'queryMethod']) {
      assert.deepEqual(layer[property], original[property], `${key}: unchanged ${property}`);
    }
    assert.deepEqual(layer.sourceThresholds, original.breaks);
    assert.equal(layer.referenceYear, 2020);
    assert.match(layer.scope, /5分角/);
    assert.match(layer.scope, /実境界ではありません/);
    assert.match(layer.scope, key.startsWith('crop-') ? /被覆率ではありません/ : /頭\/km²/);
    assert.match(layer.queryDisplayDifference, /一致しない/);
    assert.deepEqual(layer.renderOrder, ['band', 'contour', 'zero']);
    const bytes = asset(layer.file);
    assert.equal(manifest.files[layer.file].sha256, sha(bytes));
    assert.equal(manifest.files[layer.file].bytes, bytes.length);
  }
});

test('every source threshold has matching isobands and isolines, with no percentile or coarser summary selection', () => {
  for (const layer of Object.values(manifest.layers)) {
    const {features} = collection(layer);
    const bands = features.filter(feature => feature.properties.kind === 'band');
    const contours = features.filter(feature => feature.properties.kind === 'contour');
    assert.equal(bands.length, layer.positiveLegend.length);
    assert.deepEqual(contours.map(feature => feature.properties.value), layer.breaks);
    assert.equal(features.filter(feature => feature.properties.kind === 'zero').length, 1);
    const linesBytes = asset(layer.contoursFile);
    assert.equal(manifest.files[layer.contoursFile].sha256, sha(linesBytes));
    assert.equal(manifest.files[layer.contoursFile].bytes, linesBytes.length);
    assert.deepEqual(JSON.parse(gunzipSync(linesBytes)).features, contours, 'lightweight context outlines must equal the selected quantity contours');
    for (const [index, band] of bands.entries()) {
      assert.equal(band.geometry.type, 'MultiPolygon');
      assert.equal(band.properties.classId, layer.positiveLegend[index].id);
      assert.equal(band.properties.color, layer.positiveLegend[index].color);
      assert.equal(band.properties.lower, index ? layer.breaks[index - 1] : 0);
      assert.equal(band.properties.upper, layer.breaks[index] ?? null);
      assert.ok(band.geometry.coordinates.length > 0);
      for (const polygon of band.geometry.coordinates) for (const ring of polygon) {
        assert.ok(ring.length >= 4);
        assert.deepEqual(ring[0], ring.at(-1), 'all outer rings and holes stay closed');
        for (const [lon, lat] of ring) {
          assert.ok(Number.isFinite(lon) && lon >= -27 && lon <= 64);
          assert.ok(Number.isFinite(lat) && lat >= -36 && lat <= 39);
        }
      }
    }
  }
});

test('zero geometry exactly covers supplied zero cells and covers no positive or missing cell', () => {
  for (const layer of Object.values(manifest.layers)) {
    const values = grid(layer), covered = new Uint8Array(values.length);
    const zero = collection(layer).features.find(feature => feature.properties.kind === 'zero');
    assert.equal(zero.properties.classId, layer.zeroId);
    assert.equal(zero.properties.nativeCells, layer.counts.nativeZeroCells);
    assert.equal(zero.geometry.coordinates.length, layer.counts.zeroRectangles);
    for (const polygon of zero.geometry.coordinates) {
      assert.equal(polygon.length, 1);
      const ring = polygon[0];
      assert.equal(ring.length, 5);
      const c0 = Math.round((ring[0][0] + 27) * 12), c1 = Math.round((ring[2][0] + 27) * 12);
      const r0 = Math.round((39 - ring[0][1]) * 12), r1 = Math.round((39 - ring[2][1]) * 12);
      assert.ok(c0 >= 0 && c1 <= layer.width && c1 > c0 && r0 >= 0 && r1 <= layer.height && r1 > r0);
      for (let row = r0; row < r1; row++) for (let col = c0; col < c1; col++) {
        const index = row * layer.width + col;
        assert.equal(values[index], 0, 'zero display must never include missing or positive source cells');
        assert.equal(covered[index], 0, 'zero runs must not overlap');
        covered[index] = 1;
      }
    }
    let count = 0;
    for (let index = 0; index < values.length; index++) {
      assert.equal(covered[index], values[index] === 0 ? 1 : 0);
      count += covered[index];
    }
    assert.equal(count, layer.counts.nativeZeroCells);
  }
});

test('native missingness and isolated positive cells are retained independently of drawable interpolation support', () => {
  for (const layer of Object.values(manifest.layers)) {
    const values = grid(layer), supported = new Uint8Array(values.length);
    let valid = 0, zero = 0, positive = 0, missing = 0, quads = 0;
    for (const value of values) {
      if (value === -1) missing++;
      else { assert.ok(Number.isFinite(value) && value >= 0); valid++; if (value === 0) zero++; else positive++; }
    }
    for (let row = 0; row < layer.height - 1; row++) for (let col = 0; col < layer.width - 1; col++) {
      const i = row * layer.width + col, ids = [i, i + 1, i + layer.width, i + layer.width + 1];
      if (ids.every(index => values[index] >= 0)) { quads++; for (const index of ids) supported[index] = 1; }
    }
    let isolated = 0;
    for (let index = 0; index < values.length; index++) if (values[index] > 0 && !supported[index]) isolated++;
    assert.equal(valid, layer.counts.nativeValidCells);
    assert.equal(zero, layer.counts.nativeZeroCells);
    assert.equal(positive, layer.counts.nativePositiveCells);
    assert.equal(missing, layer.counts.nativeMissingOrOutsideCells);
    assert.equal(quads, layer.counts.fullyValidQuads);
    assert.equal(isolated, layer.counts.positiveCellsWithoutValidQuad);
    assert.ok(missing > 0);
  }
});

test('sampled contour vertices reproduce linear crossings on retained native edges beside fully valid quads', () => {
  for (const layer of Object.values(manifest.layers)) {
    const values = grid(layer), width = layer.width, height = layer.height;
    const value = (row, col) => row >= 0 && col >= 0 && row < height && col < width ? values[row * width + col] : -1;
    const validQuad = (row, col) => [value(row, col), value(row, col + 1), value(row + 1, col), value(row + 1, col + 1)].every(v => v >= 0);
    for (const contour of collection(layer).features.filter(feature => feature.properties.kind === 'contour')) {
      const level = contour.properties.value;
      // Each disconnected line contributes its endpoints plus a middle vertex.
      for (const line of contour.geometry.coordinates) for (const point of [line[0], line[Math.floor(line.length / 2)], line.at(-1)]) {
        const [lon, lat] = point, row = (39 - lat) * 12 - .5, col = (lon + 27) * 12 - .5;
        const ri = Math.round(row), ci = Math.round(col), candidates = [];
        if (Math.abs(row - ri) < 1e-6) {
          const lefts = Math.abs(col - ci) < 1e-6 ? [ci - 1, ci] : [Math.floor(col)];
          for (const left of lefts) {
            const a = value(ri, left), b = value(ri, left + 1);
            if (a >= 0 && b >= 0 && (validQuad(ri - 1, left) || validQuad(ri, left))) candidates.push({a, b, fraction: col - left});
          }
        }
        if (Math.abs(col - ci) < 1e-6) {
          const tops = Math.abs(row - ri) < 1e-6 ? [ri - 1, ri] : [Math.floor(row)];
          for (const top of tops) {
            const a = value(top, ci), b = value(top + 1, ci);
            if (a >= 0 && b >= 0 && (validQuad(top, ci - 1) || validQuad(top, ci))) candidates.push({a, b, fraction: row - top});
          }
        }
        assert.ok(candidates.some(({a, b, fraction}) => Math.abs(a + (b - a) * fraction - level) <= Math.max(1e-5, Math.abs(b - a) * 1.3e-7)),
          `${layer.sourceLayer} ${level}: ${lon},${lat} must use a retained edge without crossing missing data`);
      }
    }
  }
});
