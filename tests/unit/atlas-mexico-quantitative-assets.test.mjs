import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';

const root = new URL('../../', import.meta.url);
const assetRoot = new URL('public/assets/atlas/mexico-quantitative-v1/', root);
const bytes = name => readFile(new URL(name, assetRoot));
const json = async name => JSON.parse(await bytes(name));
const sha = data => createHash('sha256').update(data).digest('hex');
const [manifest, gpcc, etopo, rainSource, grid, rawGrid, landMask, rainBytes, missingBytes, heightBytes] = await Promise.all([
  json('manifest.json'), json('gpcc/manifest.json'), json('etopo/elevation-surface.manifest.json'),
  json('gpcc/precipitation-source.json'), json('gpcc/mexico-gpcc-1991-2020-annual.json'),
  bytes('gpcc/mexico-gpcc-1991-2020-annual.f32'), bytes('gpcc/mexico-gpcc-1991-2020-land-intersection.u8'),
  bytes('gpcc/mexico-gpcc-1991-2020-annual.png'), bytes('gpcc/mexico-gpcc-1991-2020-missing-land.png'),
  bytes('etopo/elevation-surface.webp'),
]);

const crcTable = Uint32Array.from({length: 256}, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function decodeRgbaPng(data) {
  assert.deepEqual(data.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  let width, height, ended = false;
  const compressed = [];
  for (let offset = 8; offset < data.length;) {
    const length = data.readUInt32BE(offset), type = data.toString('ascii', offset + 4, offset + 8);
    assert.ok(offset + 12 + length <= data.length, 'PNG chunk bounds');
    assert.equal(crc32(data.subarray(offset + 4, offset + 8 + length)), data.readUInt32BE(offset + 8 + length), `${type} CRC`);
    const payload = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = payload.readUInt32BE(0); height = payload.readUInt32BE(4);
      assert.deepEqual([...payload.subarray(8)], [8, 6, 0, 0, 0], '8-bit RGBA, no interlace');
    }
    if (type === 'IDAT') compressed.push(payload);
    offset += length + 12;
    if (type === 'IEND') { assert.equal(offset, data.length); ended = true; break; }
  }
  assert.ok(ended && width && height && compressed.length);
  const stride = width * 4, raw = inflateSync(Buffer.concat(compressed)), rgba = Buffer.alloc(width * height * 4);
  assert.equal(raw.length, (stride + 1) * height);
  for (let row = 0; row < height; row++) {
    const filter = raw[row * (stride + 1)];
    assert.ok(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const pos = row * stride + x;
      const left = x >= 4 ? rgba[pos - 4] : 0, above = row ? rgba[pos - stride] : 0;
      const upperLeft = row && x >= 4 ? rgba[pos - stride - 4] : 0;
      let prediction = 0;
      if (filter === 1) prediction = left;
      if (filter === 2) prediction = above;
      if (filter === 3) prediction = Math.floor((left + above) / 2);
      if (filter === 4) {
        const p = left + above - upperLeft, a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
        prediction = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      }
      rgba[pos] = (raw[row * (stride + 1) + 1 + x] + prediction) & 255;
    }
  }
  return {width, height, rgba};
}
const rain = decodeRgbaPng(rainBytes), missing = decodeRgbaPng(missingBytes);

test('the public GPCC manifest retains the official MD5 in the existing checksum schema and records unmodified input hashes', async () => {
  assert.equal(gpcc.publisherMd5, 'd701c717e08ce6ad457c9f4004984d65');
  assert.equal(rainSource.officialMd5Matches, true);
  assert.equal(rainSource.archiveMd5, undefined);
  assert.equal(gpcc.publicPackaging.originalSource.sha256, '3362ec17a923abbfae8dd36ff5c227d0c122ee0f40e4bbac4cc07d9ea26d6d46');
  assert.equal(gpcc.publicPackaging.originalManifestSha256, '69a66ce4fb7a8cd84453b8309b51f4dc3cdc84cbf03d28900fc30fecd2f078dd');
  const sourceBytes = await bytes('gpcc/' + gpcc.source.file);
  assert.equal(sourceBytes.length, gpcc.source.bytes);
  assert.equal(sha(sourceBytes), gpcc.source.sha256);
});

function colorAt(value, legend) {
  assert.ok(value >= legend.domain[0] && value <= legend.domain[1], 'Values must not silently saturate');
  const stops = legend.colorStops;
  let next = stops.findIndex(stop => stop.value >= value);
  if (next === 0) next = 1;
  const a = stops[next - 1], b = stops[next], fraction = (value - a.value) / (b.value - a.value);
  return [1, 3, 5].map(offset => {
    const av = parseInt(a.color.slice(offset, offset + 2), 16), bv = parseInt(b.color.slice(offset, offset + 2), 16);
    return Math.round(av + fraction * (bv - av));
  });
}
function luminance(rgb) {
  return rgb.map(value => value / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
}
function inverseLambert(p) {
  const rad = Math.PI / 180, flattening = 1 / p.inverseFlattening, e = Math.sqrt(2 * flattening - flattening ** 2);
  const t = phi => Math.tan(Math.PI / 4 - phi / 2) / ((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi))) ** (e / 2);
  const m = phi => Math.cos(phi) / Math.sqrt(1 - e ** 2 * Math.sin(phi) ** 2);
  const p1 = p.standardParallel1 * rad, p2 = p.standardParallel2 * rad;
  const n = Math.log(m(p1) / m(p2)) / Math.log(t(p1) / t(p2)), f = m(p1) / (n * t(p1) ** n);
  const rho0 = p.semiMajorM * f * t(p.latitudeOrigin * rad) ** n;
  return (x, y) => {
    const dx = x - p.falseEastingM, dy = rho0 - y + p.falseNorthingM;
    const tt = (Math.hypot(dx, dy) / (p.semiMajorM * f)) ** (1 / n);
    let phi = Math.PI / 2 - 2 * Math.atan(tt);
    for (let i = 0; i < 15; i++) phi = Math.PI / 2 - 2 * Math.atan(tt * ((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi))) ** (e / 2));
    return [p.centralMeridian + Math.atan2(dx, dy) / n / rad, phi / rad];
  };
}

test('the public bundle preserves every pinned prepared file and excludes large original inputs', async () => {
  const listed = new Set(['manifest.json']);
  let total = (await bytes('manifest.json')).length;
  for (const file of manifest.assets) {
    assert.match(file.file, /^(gpcc|etopo)\/[a-zA-Z0-9_./-]+$/);
    assert.equal(file.file.includes('..'), false);
    assert.equal(listed.has(file.file), false);
    const data = await bytes(file.file);
    assert.equal(data.length, file.bytes, file.file); assert.equal(sha(data), file.sha256, file.file);
    total += data.length; listed.add(file.file);
  }
  async function walk(dir = '') {
    const result = [];
    for (const entry of await readdir(new URL(dir, assetRoot), {withFileTypes: true})) {
      assert.equal(entry.isSymbolicLink(), false);
      const name = dir + entry.name;
      result.push(...(entry.isDirectory() ? await walk(name + '/') : [name]));
    }
    return result;
  }
  assert.deepEqual((await walk()).sort(), [...listed].sort());
  assert.ok(total < 500000, 'Compact distribution assets plus the derived vector contours are shipped');
  assert.equal([...listed].some(name => /\.(nc|gz|tif|npz|bin)$/.test(name)), false);
  assert.equal(listed.has('etopo/mexico-etopo-window.f32'), false);
  assert.equal(sha(rainBytes), '07a6f56eeb0e5cdea5197140d89f5fe64d934847e43ff0cfcce383737ef10117');
  assert.equal(sha(heightBytes), '80f27a16c48d057f93ebd235a43797645b3fb9576f064e666bd0facea465ebef');
  assert.equal(sha(rawGrid), 'fd90fa28043ff894f4141bfeb0cb26f52b6575ebb07c397a363f2b76e0e692de');
});

test('both rasters occupy the exact existing Lambert frame, with unchanged boundary and projection inputs', async () => {
  assert.deepEqual(manifest.displayFrame, gpcc.displayFrame);
  assert.deepEqual(manifest.displayFrame, etopo.displayFrame);
  assert.equal(manifest.displayFrame.viewBox, '0 0 900 580');
  assert.deepEqual(manifest.displayFrame.imagePlacement, {x: 0, y: 0, width: 900, height: 580, preserveAspectRatio: 'none'});
  const indexBytes = await readFile(new URL('src/data/atlas/mexico/geometry-index.json', root));
  const index = JSON.parse(indexBytes);
  assert.equal(sha(indexBytes), etopo.landClip.geometryIndexSha256);
  assert.deepEqual(manifest.displayFrame.boundsNative, index.metadata.boundsNative);
  assert.deepEqual(manifest.displayFrame.projection, index.metadata.projection);
  assert.equal(sha(await readFile(new URL(etopo.landClip.retainedGeometryFile, root))), etopo.landClip.retainedGeometrySha256);
  assert.equal(sha(await readFile(new URL(etopo.reproduction.referencedProjectionScript, root))), etopo.reproduction.referencedProjectionSha256);
  assert.equal(rain.width, 900); assert.equal(rain.height, 580);
  assert.equal(heightBytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(heightBytes.readUInt32LE(4) + 8, heightBytes.length);
  assert.equal(heightBytes.toString('ascii', 8, 16), 'WEBPVP8L');
  assert.equal(heightBytes[20], 0x2f);
  const flags = heightBytes.readUInt32LE(21);
  assert.equal((flags & 0x3fff) + 1, 900); assert.equal(((flags >>> 14) & 0x3fff) + 1, 580);
  assert.equal((flags >>> 28) & 1, 1, 'lossless WebP includes transparency');
  assert.equal(flags >>> 29, 0, 'VP8L version');
});

test('GPCC alpha preserves all 18 missing land pixels and never converts them to zero rainfall', () => {
  assert.equal(missing.width, rain.width); assert.equal(missing.height, rain.height);
  let valid = 0, absent = 0;
  for (let pixel = 0; pixel < 900 * 580; pixel++) {
    const alpha = rain.rgba[pixel * 4 + 3], missingAlpha = missing.rgba[pixel * 4 + 3];
    assert.ok(alpha === 0 || alpha === 255);
    if (alpha) valid++;
    if (missingAlpha) { absent++; assert.equal(alpha, 0, 'Missing land must stay transparent'); }
  }
  assert.equal(valid, 130061); assert.equal(absent, 18);
  assert.equal(valid + absent, gpcc.checks.originalLandPixels);
  assert.equal(gpcc.checks.opaquePixelsOutsideOriginalLand, 0);
  assert.equal(etopo.checks.display['1x'].opaquePixelsOutsideLand, 0);
  assert.equal(etopo.checks.display['1x'].losslessRoundTrip, true);
  assert.equal(etopo.checks.nativeNegativeValidMexicoCells, 4091, 'Negative elevations were not used as an ocean mask');
});

test('the native annual grid keeps northern row order, exact missing sentinel, and independent land validity', async () => {
  assert.deepEqual([grid.width, grid.height], [132, 80]);
  assert.deepEqual(grid.origin, [-119, 34]); assert.deepEqual(grid.resolution, [.25, -.25]);
  assert.equal(grid.dtype, 'float32-little-endian'); assert.equal(rawGrid.length, 132 * 80 * 4);
  assert.equal(landMask.length, 132 * 80); assert.equal(grid.noData, -99999.9921875);
  let valid = 0, landMissing = 0, allMissing = 0, min = Infinity, max = -Infinity;
  for (let cell = 0; cell < landMask.length; cell++) {
    const value = rawGrid.readFloatLE(cell * 4);
    assert.ok(landMask[cell] === 0 || landMask[cell] === 1);
    if (value === grid.noData) { allMissing++; if (landMask[cell]) landMissing++; }
    else { assert.ok(Number.isFinite(value) && value >= 0); assert.equal(landMask[cell], 1); valid++; min = Math.min(min, value); max = Math.max(max, value); }
  }
  assert.equal(valid, 3153); assert.equal(landMissing, 9); assert.equal(allMissing, 7407);
  assert.deepEqual([min, max], gpcc.checks.mexicanNativeAnnualRangeMm);
  for (const control of gpcc.checks.latitudeOrientationSamples) {
    const [lon, lat] = control.cellCenter;
    const col = Math.floor((lon - grid.origin[0]) / .25), row = Math.floor((grid.origin[1] - lat) / .25);
    assert.equal(rawGrid.readFloatLE((row * grid.width + col) * 4), Math.fround(control.monthlyMm.reduce((sum, value) => sum + value, 0)), control.name);
  }
  const independent = await json('gpcc/independent-grid-verification.json');
  assert.equal(independent.passed, true); assert.equal(independent.exactFloat32Matches, 10560);
  assert.equal(independent.annualGridSha256, sha(rawGrid));
});

test('every painted precipitation pixel agrees with the actual native value and the quantitative blue legend', () => {
  const frame = manifest.displayFrame, inverse = inverseLambert(frame.projection), legend = manifest.layers.precipitation.legend;
  let checked = 0;
  for (let row = 0; row < rain.height; row++) for (let col = 0; col < rain.width; col++) {
    const pos = (row * rain.width + col) * 4;
    if (!rain.rgba[pos + 3]) continue;
    const nativeX = frame.boundsNative[0] + (col + .5 - frame.leftPixels) / frame.scalePixelsPerNativeMetre;
    const nativeY = frame.boundsNative[3] - (row + .5 - frame.topPixels) / frame.scalePixelsPerNativeMetre;
    const [lon, lat] = inverse(nativeX, nativeY);
    const gc = Math.floor((lon - grid.origin[0]) / .25), gr = Math.floor((grid.origin[1] - lat) / .25);
    assert.ok(gc >= 0 && gc < grid.width && gr >= 0 && gr < grid.height);
    const value = rawGrid.readFloatLE((gr * grid.width + gc) * 4);
    assert.notEqual(value, grid.noData);
    const expected = colorAt(value, legend);
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(rain.rgba[pos + channel] - expected[channel]) <= 1, `colour at ${col},${row}`);
    checked++;
  }
  assert.equal(checked, 130061);
});

test('the displayed vector has 250mm isohyets and contiguous darker blue bands from the same unchanged GPCC period', async () => {
  const layer = manifest.layers.precipitation;
  const svg = (await bytes(layer.image.file)).toString();
  const ledger = await json(layer.provenanceFile);
  assert.match(layer.image.file, /isohyets-250mm\.svg$/);
  assert.equal(ledger.period, grid.period); assert.equal(ledger.nativeResolutionDegrees, .25);
  assert.equal(ledger.annualGrid.sha256, sha(rawGrid));
  assert.equal(ledger.checks.missingLandNativeCells, 9);
  assert.equal(ledger.intervalMmPerYear, 250);
  assert.deepEqual(ledger.boundariesMmPerYear, Array.from({length: 17}, (_, i) => i * 250));
  assert.deepEqual(layer.legend.bands, ledger.bands);
  assert.equal(layer.legend.interval, 250);
  let previous = Infinity;
  for (const band of ledger.bands) {
    assert.equal(band.max - band.min, 250);
    const rgb = [1, 3, 5].map(i => parseInt(band.color.slice(i, i + 2), 16));
    assert.deepEqual(rgb, colorAt((band.min + band.max) / 2, layer.legend));
    assert.ok(luminance(rgb) < previous); previous = luminance(rgb);
  }
  const levels = [...svg.matchAll(/data-isohyet-mm="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(levels, ledger.lines.filter(line => line.parts > 0).map(line => line.valueMmPerYear));
  assert.deepEqual(ledger.lines.map(line => line.valueMmPerYear), Array.from({length: 15}, (_, i) => (i + 1) * 250));
  assert.match(ledger.derivation, /corner|linear|Linear/);
  assert.match(ledger.missingData, /four complete.*corner_mask=False/);
  assert.match(svg, /mask="url\(#land-and-native-validity\)"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|href="https?:|<rect/);
});

test('actual SVG isohyet coordinates independently recover their stated rainfall from native donor values', async () => {
  const svg = (await bytes(manifest.layers.precipitation.image.file)).toString();
  const frame = manifest.displayFrame, inverse = inverseLambert(frame.projection);
  let checked = 0, greatestError = 0;
  for (const line of svg.matchAll(/<path data-isohyet-mm="(\d+)" d="([^"]+)"/g)) {
    const level = Number(line[1]);
    for (const point of line[2].matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
      const nativeX = frame.boundsNative[0] + (Number(point[1]) - frame.leftPixels) / frame.scalePixelsPerNativeMetre;
      const nativeY = frame.boundsNative[3] - (Number(point[2]) - frame.topPixels) / frame.scalePixelsPerNativeMetre;
      const [lon, lat] = inverse(nativeX, nativeY);
      const col = (lon - grid.origin[0]) / .25 - .5, row = (grid.origin[1] - lat) / .25 - .5;
      let a, b, fraction;
      if (Math.abs(row - Math.round(row)) < Math.abs(col - Math.round(col))) {
        const r = Math.round(row), c = Math.max(0, Math.min(Math.floor(col), grid.width - 2));
        if (r < 0 || r >= grid.height) continue;
        a = r * grid.width + c; b = a + 1; fraction = col - c;
      } else {
        const c = Math.round(col), r = Math.max(0, Math.min(Math.floor(row), grid.height - 2));
        if (c < 0 || c >= grid.width) continue;
        a = r * grid.width + c; b = a + grid.width; fraction = row - r;
      }
      const first = rawGrid.readFloatLE(a * 4), second = rawGrid.readFloatLE(b * 4);
      if (first === grid.noData || second === grid.noData) continue;
      assert.ok(fraction >= -.001 && fraction <= 1.001);
      const error = Math.abs(first + fraction * (second - first) - level);
      assert.ok(error < 1, `SVG ${level}mm line differs from retained grid by ${error}mm`);
      greatestError = Math.max(greatestError, error); checked++;
    }
  }
  assert.ok(checked > 700, `Checked ${checked} interior native-donor vertices`);
  assert.ok(greatestError < 1);
});

test('the contour SVG preserves every original coast and missing-pixel mask without inventing zeros', async () => {
  const svg = (await bytes(manifest.layers.precipitation.image.file)).toString();
  const embedded = svg.match(/href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(embedded, 'Self-contained original validity mask');
  const mask = decodeRgbaPng(Buffer.from(embedded[1], 'base64'));
  assert.equal(mask.width, rain.width); assert.equal(mask.height, rain.height);
  for (let pixel = 0; pixel < rain.width * rain.height; pixel++) {
    assert.equal(mask.rgba[pixel * 4 + 3], rain.rgba[pixel * 4 + 3]);
  }
});

test('both numeric legends use the exact source stops and never become lighter at a higher value', async () => {
  const originals = [await json('gpcc/precipitation-legend.json'), await json('etopo/elevation-legend.json')];
  for (const [index, layer] of [manifest.layers.precipitation, manifest.layers.elevation].entries()) {
    const original = originals[index], stops = original.stops ?? original.colorStops, legend = layer.legend;
    assert.deepEqual(legend.domain, original.domain); assert.deepEqual(legend.ticks, original.ticks);
    assert.deepEqual(legend.colorStops, stops.map(({value, color}) => ({value, color})));
    let previous = Infinity;
    for (let value = legend.domain[0]; value <= legend.domain[1]; value++) {
      const light = luminance(colorAt(value, legend));
      assert.ok(light <= previous + 1e-12, `${layer.titleJa}: ${value}`); previous = light;
    }
    assert.throws(() => colorAt(legend.domain[0] - 1, legend));
    assert.throws(() => colorAt(legend.domain[1] + 1, legend));
  }
  assert.deepEqual(manifest.layers.precipitation.legend.ticks, [0, 500, 1000, 2000, 3000, 4000]);
  assert.deepEqual(manifest.layers.elevation.legend.domain, [-600, 5500]);
});

test('display text keeps source periods, units, measurement supports, and licence evidence distinct', async () => {
  const climographs = JSON.parse(await readFile(new URL('src/data/atlas/mexico/climate-normals.json', root)));
  const rainLayer = manifest.layers.precipitation, heightLayer = manifest.layers.elevation;
  assert.deepEqual(rainSource.period, ['1991-01-01', '2020-12-31']);
  assert.equal(climographs.period, '1991–2020');
  assert.ok(climographs.stations.every(station => station.period === climographs.period));
  assert.equal(rainLayer.periodLabelJa, '1991–2020年平年値');
  assert.equal(rainSource.sourceUnit, 'mm/month'); assert.equal(rainSource.outputUnit, grid.unit); assert.equal(grid.unit, 'mm/year');
  assert.equal(rainLayer.legend.unit, 'mm/年'); assert.equal(heightLayer.legend.unit, 'm');
  assert.equal(etopo.source.unit, 'm'); assert.equal(etopo.grid.verticalDatum, 'EGM2008');
  assert.equal(etopo.source.editionNotObservationYear, true);
  assert.match(heightLayer.periodLabelJa, /2022（版年）.*60秒.*EGM2008/);
  assert.ok(rainLayer.limitationsJa.some(text => text.includes('格子の補間値と観測所の値は異なります')));
  assert.match(rainLayer.missingLabelJa, /0 mmではありません/); assert.match(heightLayer.missingLabelJa, /0 mではありません/);
  assert.equal(rainSource.license, 'CC BY 4.0'); assert.equal(etopo.source.license, 'CC0-1.0');
  assert.equal(rainSource.licenseEvidence.priorEvidence.directLegalNoticeStatus, 403);
  assert.match(rainSource.licenseEvidence.currentVerification, /complete legal notice was not re-fetched/);
  assert.equal(etopo.source.licenseVerification.priorMetadataNotFetchedThisRun, true);
  for (const layer of Object.values(manifest.layers)) {
    assert.equal(new URL(layer.sourceUrl).protocol, 'https:');
    assert.ok(Array.isArray(layer.limitationsJa) && layer.limitationsJa.length > 0);
    await bytes(layer.provenanceFile);
    assert.equal(sha(await bytes(layer.image.file)), layer.image.sha256);
  }
});

test('ETOPO retains exact range-download evidence without claiming a newly checked whole-file hash', async () => {
  const ranges = await json('etopo/range-acquisition.json'), window = await json('etopo/mexico-etopo-window.json');
  assert.deepEqual(ranges.decoding, window); assert.deepEqual(etopo.grid, window);
  assert.equal(window.sha256, '47e9c1792e653c05e94058b2b7311a18a7db38c094d47fb0f8a5acfef45c9743');
  assert.equal(window.verification.fullSourceHashRecomputed, false);
  assert.equal(window.verification.matchesRetainedWindowFromPreviouslyVerifiedFullSource, true);
  assert.equal(window.verification.downloadedRangeBytes, 7540857);
  assert.equal(window.verification.sourceTotalBytes, 465969062);
  let received = 0;
  for (const receipt of ranges.ranges) {
    assert.equal(receipt.status, 206); assert.equal(receipt.url, etopo.source.downloadUrl);
    assert.equal(receipt.bytes, receipt.range[1] - receipt.range[0] + 1);
    assert.equal(receipt.headers['content-range'], `bytes ${receipt.range[0]}-${receipt.range[1]}/465969062`);
    received += receipt.bytes;
  }
  assert.equal(received, window.verification.downloadedRangeBytes); assert.equal(ranges.tiles.length, 45);
});
