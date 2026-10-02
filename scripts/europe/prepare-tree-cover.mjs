/** ESA WorldCover 2021 v200: bounded COG-overview extraction, no full-tile download.
 * Run: node scripts/europe/prepare-tree-cover.mjs --fetch --cache <private-directory>
 * Rebuild without network: omit --fetch, keeping the prefix/block cache.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const fetchAllowed = args.includes('--fetch');
const cacheArgument = args.indexOf('--cache');
const cache = path.resolve(cacheArgument >= 0 ? args[cacheArgument + 1] : path.join(root, '../europe-forest-research'));
const output = path.join(root, 'public/assets/atlas/europe/tree-cover-v1');
const provenance = path.join(root, 'data-source/atlas/europe/tree-cover');
const frameSource = await fs.readFile(path.join(root, 'src/lib/atlas-europe-view.ts'), 'utf8');
const frameDeclaration = /export const frame = \{([^}]+)\}/.exec(frameSource)?.[1];
if (!frameDeclaration) throw new Error('Existing Europe frame declaration unavailable');
const frame = Object.fromEntries(frameDeclaration.split(',').map(property => { const [key, value] = property.split(':'); return [key.trim(), Number(value.trim())]; }));
if (!['width', 'height', 'west', 'east', 'south', 'north'].every(key => Number.isFinite(frame[key]))) throw new Error('Invalid existing Europe frame');
const bounds = [frame.west, frame.south, frame.east, frame.north];
const width = 1800, height = Math.round(width * frame.height / frame.width);
const sourcePrefix = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/';
const sourceCodes = new Set([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const mercator = latitude => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
const north = mercator(bounds[3]), south = mercator(bounds[1]);
const project = ([longitude, latitude]) => [(longitude - bounds[0]) / (bounds[2] - bounds[0]) * width, (north - mercator(latitude)) / (north - south) * height];
const longitudes = Float64Array.from({ length: width }, (_, x) => bounds[0] + (x + .5) / width * (bounds[2] - bounds[0]));
const latitudes = Float64Array.from({ length: height }, (_, y) => (2 * Math.atan(Math.exp(north - (y + .5) / height * (north - south))) - Math.PI / 2) * 180 / Math.PI);

function tileName(longitude, latitude) {
  const west = Math.floor(longitude / 3) * 3, lower = Math.floor(latitude / 3) * 3;
  return `${lower < 0 ? 'S' : 'N'}${String(Math.abs(lower)).padStart(2, '0')}${west < 0 ? 'W' : 'E'}${String(Math.abs(west)).padStart(3, '0')}`;
}
function tileBounds(tile) {
  const match = /^([NS])(\d{2})([EW])(\d{3})$/.exec(tile);
  if (!match) throw new Error('Invalid WorldCover tile');
  const lower = Number(match[2]) * (match[1] === 'S' ? -1 : 1), west = Number(match[4]) * (match[3] === 'W' ? -1 : 1);
  return [west, lower, west + 3, lower + 3];
}

/** Classic, little-endian TIFF metadata; reject formats outside this product. */
function parseTiff(prefix) {
  if (prefix.readUInt16LE(0) !== 0x4949 || prefix.readUInt16LE(2) !== 42) throw new Error('Unsupported TIFF header');
  let offset = prefix.readUInt32LE(4);
  const ifds = [];
  while (offset) {
    if (ifds.length >= 12 || offset + 2 > prefix.length) throw new Error('Invalid TIFF IFD');
    const count = prefix.readUInt16LE(offset), tags = {};
    for (let i = 0; i < count; i++) {
      const at = offset + 2 + i * 12;
      if (at + 12 > prefix.length) throw new Error('TIFF metadata exceeds prefix');
      const tag = prefix.readUInt16LE(at), type = prefix.readUInt16LE(at + 2), n = prefix.readUInt32LE(at + 4), raw = prefix.readUInt32LE(at + 8);
      if (n === 1 && [1, 3, 4].includes(type)) tags[tag] = type === 1 ? raw & 255 : type === 3 ? raw & 65535 : raw;
      if ([42112, 42113].includes(tag) && type === 2) {
        const start = n <= 4 ? at + 8 : raw;
        if (start + n > prefix.length) throw new Error('TIFF metadata string exceeds prefix');
        tags[tag] = prefix.subarray(start, start + n).toString('utf8').replaceAll('\0', '');
      }
    }
    ifds.push(tags);
    offset = prefix.readUInt32LE(offset + 2 + count * 12);
  }
  const original = ifds[0], overview = ifds.at(-1);
  if (original[256] !== 36000 || original[257] !== 36000 || original[258] !== 8 || original[277] !== 1) throw new Error('Unexpected WorldCover source dimensions');
  if (overview[256] !== 562 || overview[257] !== 562 || overview[259] !== 8 || overview[317] !== 1 || overview[322] !== 1024 || overview[323] !== 1024 || overview[42113] !== '0') throw new Error('Unexpected WorldCover categorical overview');
  if (!original[42112]?.includes('2021-12-31') || !original[42112]?.includes('CC-BY 4.0')) throw new Error('WorldCover year/license metadata mismatch');
  if (!Number.isInteger(overview[324]) || overview[325] < 1 || overview[325] > 1_200_000) throw new Error('Unexpected overview block range');
  return { original, overview, ifdCount: ifds.length };
}

async function readRange(tile, suffix, start, end) {
  const filename = path.join(cache, `${tile}.${suffix}.bin`), metaPath = path.join(cache, `${tile}.${suffix}.json`);
  const url = `${sourcePrefix}ESA_WorldCover_10m_2021_v200_${tile}_Map.tif`;
  let bytes, metadata;
  try {
    bytes = await fs.readFile(filename);
    try { metadata = JSON.parse(await fs.readFile(metaPath, 'utf8')); } catch { metadata = {}; }
  } catch {
    if (!fetchAllowed) throw new Error(`Missing cached ${tile}/${suffix}; use --fetch to acquire bounded ranges`);
    let failure;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(30000) });
        if (response.status !== 206 || !response.headers.get('content-range')?.startsWith(`bytes ${start}-${end}/`)) throw new Error(`Expected HTTP 206 range for ${tile}: ${response.status}`);
        const length = Number(response.headers.get('content-length'));
        if (length !== end - start + 1) throw new Error(`Unexpected range length for ${tile}`);
        bytes = Buffer.from(await response.arrayBuffer());
        metadata = { etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified'), contentRange: response.headers.get('content-range') };
        break;
      } catch (error) { failure = error; }
    }
    if (!bytes) throw failure;
    await fs.writeFile(filename, bytes);
  }
  if (bytes.length !== end - start + 1) throw new Error(`Invalid cached range length for ${tile}/${suffix}`);
  if (metadata.sha256 && metadata.sha256 !== sha(bytes)) throw new Error(`Cached range hash mismatch for ${tile}/${suffix}`);
  const record = { ...metadata, tile, url, range: `bytes=${start}-${end}`, bytes: bytes.length, sha256: sha(bytes), retrievedAt: metadata.retrievedAt ?? new Date().toISOString() };
  await fs.writeFile(metaPath, JSON.stringify(record));
  return { bytes, record };
}

/** Fill polygon interiors at display-pixel centres, including interior rings. */
function paintCountry(mask, geometry, id) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    const rings = polygon.map(ring => ring.map(project));
    const allY = rings.flatMap(ring => ring.map(point => point[1]));
    const start = Math.max(0, Math.ceil(Math.min(...allY) - .5)), end = Math.min(height - 1, Math.floor(Math.max(...allY) - .5));
    for (let y = start; y <= end; y++) {
      const intersections = [], centre = y + .5;
      for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[j], b = ring[i];
        if ((a[1] > centre) !== (b[1] > centre)) intersections.push(a[0] + (centre - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        const left = Math.max(0, Math.ceil(intersections[i] - .5)), right = Math.min(width - 1, Math.floor(intersections[i + 1] - .5));
        for (let x = left; x <= right; x++) mask[y * width + x] = id;
      }
    }
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let value = i; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; return value >>> 0; });
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) { const name = Buffer.from(type), buffer = Buffer.alloc(data.length + 12); buffer.writeUInt32BE(data.length, 0); name.copy(buffer, 4); data.copy(buffer, 8); buffer.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8); return buffer; }
function encodePng(rgba) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

await fs.mkdir(cache, { recursive: true });
await fs.mkdir(output, { recursive: true });
await fs.mkdir(provenance, { recursive: true });
const geographyPath = path.join(root, 'src/data/atlas/europe-countries.json');
const geographyBytes = await fs.readFile(geographyPath);
const countries = JSON.parse(geographyBytes).features.filter(feature => feature.properties.kind === 'europe');
if (countries.length !== 45) throw new Error('Expected existing 45-country Europe coverage');
const land = new Uint8Array(width * height);
countries.forEach((country, i) => paintCountry(land, country.geometry, i + 1));
const needed = new Set();
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (land[y * width + x]) needed.add(tileName(longitudes[x], latitudes[y]));
const tiles = [...needed].sort(), decoded = new Map(), inputs = [];
let cursor = 0, completed = 0;
console.log(`Extracting ${tiles.length} bounded WorldCover overview tiles`);
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < tiles.length) {
    const tile = tiles[cursor++], prefix = await readRange(tile, 'prefix', 0, 65535), metadata = parseTiff(prefix.bytes), overview = metadata.overview;
    const first = overview[324], last = first + overview[325] - 1;
    let block, blockRecord;
    if (last < prefix.bytes.length) { block = prefix.bytes.subarray(first, last + 1); blockRecord = { tile, range: `bytes=${first}-${last}`, bytes: block.length, sha256: sha(block), containedInPrefix: true }; }
    else { const ranged = await readRange(tile, 'overview', first, last); block = ranged.bytes; blockRecord = ranged.record; }
    const raster = zlib.inflateSync(block);
    if (raster.length !== 1024 * 1024) throw new Error(`Unexpected decoded tile size: ${tile}`);
    const codes = new Set();
    for (let y = 0; y < overview[257]; y++) for (let x = 0; x < overview[256]; x++) codes.add(raster[y * 1024 + x]);
    if ([...codes].some(code => !sourceCodes.has(code))) throw new Error(`Non-categorical values found in ${tile}`);
    decoded.set(tile, raster);
    inputs.push({ tile, bounds: tileBounds(tile), overviewWidth: overview[256], overviewHeight: overview[257], observedCodes: [...codes].sort((a, b) => a - b), prefix: prefix.record, overview: blockRecord });
    completed++;
    if (completed % 20 === 0 || completed === tiles.length) console.log(`Decoded ${completed}/${tiles.length}`);
  }
}));

const grid = Buffer.alloc(width * height * 4), rgba = Buffer.alloc(width * height * 4);
const countryCoverage = countries.map(country => ({ code: country.properties.code, sourceGeographicCoverage: 'Within WorldCover 2021 global land extent and Europe display frame', displayPixelCentres: 0, validDisplayPixelCentres: 0, missingDisplayPixelCentres: 0 }));
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const at = y * width + x, countryId = land[at];
  let value = -1;
  if (countryId) {
    const tile = tileName(longitudes[x], latitudes[y]), box = tileBounds(tile), raster = decoded.get(tile);
    const column = Math.min(561, Math.floor((longitudes[x] - box[0]) / 3 * 562)), row = Math.min(561, Math.floor((box[3] - latitudes[y]) / 3 * 562));
    const code = raster[row * 1024 + column];
    value = code === 0 ? -1 : code === 10 ? 1 : 0;
    const coverage = countryCoverage[countryId - 1]; coverage.displayPixelCentres++;
    if (value === -1) coverage.missingDisplayPixelCentres++; else coverage.validDisplayPixelCentres++;
    if (value !== -1) { rgba[at * 4] = value ? 45 : 237; rgba[at * 4 + 1] = value ? 108 : 236; rgba[at * 4 + 2] = value ? 62 : 229; rgba[at * 4 + 3] = 255; }
  }
  grid.writeFloatLE(value, at * 4);
}
inputs.sort((a, b) => a.tile.localeCompare(b.tile));
const image = encodePng(rgba), lookup = zlib.gzipSync(grid, { level: 9 });
await fs.writeFile(path.join(output, 'tree-cover.png'), image);
await fs.writeFile(path.join(output, 'mask.bin.gz'), lookup);
const source = {
  dataset: 'ESA WorldCover 10 m 2021 v200', doi: 'https://doi.org/10.5281/zenodo.7254221', publisher: 'ESA WorldCover consortium', sourceUrl: 'https://esa-worldcover.org/en/data-access', manualUrl: 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/docs/WorldCover_PUM_V2.0.pdf', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', period: '2021-01-01/2021-12-31', originalResolution: '1/12000 degree (approximately 10 m at equator)', sourceCRS: 'EPSG:4326', sourceTreeClass: 10, sourceNoData: 0,
  treeDefinition: 'Tree cover class includes areas dominated by trees with cover of 10% or more, including planted trees, plantations and olive trees. It is not a FAO forest, forestry production, timber availability or tree-volume classification.',
  sourceCoverage: 'Sentinel-2-observed land except Antarctica; northern limit 82.75°N. Current Europe frame is 32–73°N and includes western Russia.',
  attribution: '© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium',
};
const inputManifest = { source, method: 'Read 64 KiB TIFF prefixes and only the lowest internal categorical overview DEFLATE block. No complete 10 m tile downloaded. Range hashes identify the actual source bytes used, not the SHA256 of full original tiles.', tiles: inputs };
const inputBytes = Buffer.from(JSON.stringify(inputManifest, null, 2) + '\n');
await fs.writeFile(path.join(provenance, 'range-inputs.json'), inputBytes);
await fs.writeFile(path.join(provenance, 'source.json'), JSON.stringify(source, null, 2) + '\n');
// Retain two small raw compressed extraction blocks so source/display alignment
// can be checked offline without retaining any complete original 10 m tile.
const retainedSamples = [];
for (const tile of ['N60E027', 'N54E036']) {
  const input = inputs.find(item => item.tile === tile);
  if (!input) throw new Error(`Expected Finland/Russia proof tile ${tile}`);
  const prefix = await fs.readFile(path.join(cache, `${tile}.prefix.bin`));
  const overview = parseTiff(prefix).overview, start = overview[324], end = start + overview[325];
  const compressed = end <= prefix.length ? prefix.subarray(start, end) : await fs.readFile(path.join(cache, `${tile}.overview.bin`));
  const filename = `${tile}-overview.deflate`;
  await fs.writeFile(path.join(provenance, filename), compressed);
  retainedSamples.push({ tile, url: input.prefix.url, bounds: tileBounds(tile), width: 562, height: 562, storedRowStride: 1024, storedHeight: 1024, sourceNoData: 0, file: filename, sha256: sha(compressed), bytes: compressed.length, sourceRange: `bytes=${start}-${end - 1}` });
}
await fs.writeFile(path.join(provenance, 'retained-extraction.json'), JSON.stringify({ sourceCRS: 'EPSG:4326', encoding: 'TIFF DEFLATE uint8 categorical overview block, predictor 1', treeClass: 10, allowedCodes: [...sourceCodes], samples: retainedSamples }, null, 2) + '\n');
const manifest = {
  schemaVersion: 1, retrievedAt: new Date().toISOString(), ...source, bounds, width, height, projection: 'EPSG:3857', frame,
  lookup: { width, height, encoding: 'little-endian float32 row-major gzip', nodata: -1, values: { '1': 'Tree cover (source class 10)', '0': 'Other valid land-cover class', '-1': 'Source missing or outside selected Europe target-country land' } },
  extraction: { tileCount: inputs.length, overviewWidth: 562, overviewHeight: 562, originalWidth: 36000, originalHeight: 36000, supplierOverviewLevels: [2, 4, 8, 16, 32, 64], supplierOverviewResampling: 'Not specified in the source product metadata or user manual; no quantitative aggregation claim is made.', reprojection: 'Nearest-neighbour categorical sampling at Web Mercator display pixel centres; no interpolation between class codes.', clipping: 'Existing 45 target-country Natural Earth outlines, with polygon holes preserved; countries remain selectable separately. Small countries can be unresolved by display pixel centres.', originalResolutionIsDisplayPrecision: false },
  limitations: ['This is a generalized tree-cover distribution map, not an exact forest or stand boundary.', 'Tree cover includes plantations and olive trees; it does not identify wood supply, commercial forestry, forest type, biomass, tree volume or national forest area.', 'Provider overviews and display sampling omit small patches; no tree-cover percentage or area statistic is computed.', 'Other valid cover is different from missing data. Source code 0 and land outside the 45-country target mask remain missing/transparent.', 'The 2021 tree-cover map and the WDI 2023 national forest-area share use different definitions, dates and geographic units and are shown separately.'],
  countryCoverage,
  inputs: [{ path: 'src/data/atlas/europe-countries.json', sha256: sha(geographyBytes), role: '45 target-country land mask' }, { path: 'data-source/atlas/europe/tree-cover/range-inputs.json', sha256: sha(inputBytes), role: 'Exact bounded COG input range hashes and categorical validation' }],
  files: { 'tree-cover.png': { sha256: sha(image), bytes: image.length }, 'mask.bin.gz': { sha256: sha(lookup), bytes: lookup.length } },
};
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ tileCount: inputs.length, imageBytes: image.length, maskBytes: lookup.length, unresolvedCountries: countryCoverage.filter(country => !country.displayPixelCentres).map(country => country.code), sourceMissingCountries: countryCoverage.filter(country => country.missingDisplayPixelCentres).map(country => country.code) }));
