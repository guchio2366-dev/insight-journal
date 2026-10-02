/** Offline BasinATLAS v1.0 level-04 cartography. Raw inputs stay in the private cache.
 * node scripts/europe/prepare-drainage.mjs --source-dir <verified private cache>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const bounds = [-25, 32, 65, 73];
export const width = 1800, height = 1502, lookupNoData = -1;
export const palette = ['#86b6cf', '#e2bb80', '#a6c69c', '#c4a9cb', '#d69e95', '#aab8b9', '#ced19e', '#96c9c2'];
const sourceFilename = 'BasinATLAS_v10_lev04';
const pinnedHashes = {
  shp: '8eaf6b93575654dfedcae985a0c592c534e5cb2239fe5ad9daeba3355f6057ad',
  dbf: 'bbfe321f47bea310fac2331091e145f4c96dccdab9013025db66e6c72973d48a',
  prj: 'a02a27b1d1982c8516d83398e85a3c8b1aef1713c13ef4d84d7bde17430c07c4',
  shx: '44614539176b73e4cfbff12cc035375eb62c63fe2c9233ac1036a1a91cd2bd97',
};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const mercator = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const top = mercator(73), bottom = mercator(32);
export const project = ([lon, lat]) => [(lon + 25) / 90 * width, (top - mercator(lat)) / (top - bottom) * height];
export const displayCoordinate = (column, row) => [-25 + (column + .5) / width * 90, (2 * Math.atan(Math.exp(top - (row + .5) / height * (top - bottom))) - Math.PI / 2) * 180 / Math.PI];

/** Keep only actual identifiers, never environmental attributes or invented names. */
export function readBasicIdentifiers(bytes) {
  const records = bytes.readUInt32LE(4), headerBytes = bytes.readUInt16LE(8), recordBytes = bytes.readUInt16LE(10);
  if (bytes.length !== headerBytes + records * recordBytes + 1) throw new Error('Unexpected DBF length');
  const fields = {}; let fieldOffset = 1;
  for (let offset = 32; bytes[offset] !== 13; offset += 32) {
    const name = bytes.subarray(offset, offset + 11).toString('ascii').replace(/\0.*$/, '');
    fields[name] = { offset: fieldOffset, length: bytes[offset + 16], type: String.fromCharCode(bytes[offset + 11]), decimals: bytes[offset + 17] };
    fieldOffset += bytes[offset + 16];
  }
  const names = ['HYBAS_ID', 'PFAF_ID', 'NEXT_DOWN', 'MAIN_BAS'];
  if (names.some(name => fields[name]?.type !== 'N' || fields[name].decimals !== 0)) throw new Error('Identifier fields differ from pinned BasinATLAS schema');
  const result = [];
  for (let row = 0; row < records; row++) {
    if (bytes[headerBytes + row * recordBytes] !== 32) throw new Error('Deleted DBF row requires review');
    const item = {};
    for (const name of names) {
      const field = fields[name], start = headerBytes + row * recordBytes + field.offset;
      const value = Number(bytes.subarray(start, start + field.length).toString('ascii').trim());
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid identifier');
      item[name] = value;
    }
    if (String(item.HYBAS_ID).slice(1, 3) !== '04') throw new Error('Source row is not a level-04 sub-basin');
    result.push({ sourceRow: row, ...item });
  }
  if (records !== 1342 || result.length !== 1342) throw new Error('Pinned level-04 global feature count differs');
  return result.sort((a, b) => a.HYBAS_ID - b.HYBAS_ID).map((item, i) => ({ index: i + 1, ...item }));
}
export function readPolygon(shp, shx, row) {
  const start = shx.readUInt32BE(100 + row * 8) * 2;
  const contentLength = shx.readUInt32BE(104 + row * 8) * 2, p = start + 8;
  if (shp.readUInt32BE(start + 4) * 2 !== contentLength || shp.readInt32LE(p) !== 5) throw new Error('Expected exact Polygon source record');
  const count = shp.readUInt32LE(p + 36), pointCount = shp.readUInt32LE(p + 40), coordinates = p + 44 + count * 4;
  if (contentLength !== 44 + count * 4 + pointCount * 16) throw new Error('Unexpected polygon record layout');
  const rings = [];
  for (let part = 0; part < count; part++) {
    const first = shp.readUInt32LE(p + 44 + part * 4), last = part + 1 < count ? shp.readUInt32LE(p + 48 + part * 4) : pointCount;
    const ring = [];
    for (let i = first; i < last; i++) ring.push([shp.readDoubleLE(coordinates + i * 16), shp.readDoubleLE(coordinates + i * 16 + 8)]);
    rings.push(ring);
  }
  return rings;
}

/** Original ring vertices and pixel-centre even/odd filling preserve polygon holes. */
export function rasterizeRings(mask, rings, id, overwrite = true) {
  const rows = Array.from({ length: height }, () => []);
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = project(ring[j]), b = project(ring[i]);
    if (a[1] === b[1]) continue;
    const first = Math.max(0, Math.ceil(Math.min(a[1], b[1]) - .5));
    const last = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1]) - .5) - 1);
    for (let row = first; row <= last; row++) rows[row].push(a[0] + (row + .5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
  }
  let overlapPixels = 0;
  for (let row = 0; row < height; row++) {
    const crossings = rows[row].sort((a, b) => a - b);
    if (crossings.length % 2) throw new Error('Odd polygon scanline intersection count');
    for (let pair = 0; pair < crossings.length; pair += 2) {
      const first = Math.max(0, Math.ceil(crossings[pair] - .5)), last = Math.min(width - 1, Math.ceil(crossings[pair + 1] - .5) - 1);
      for (let col = first; col <= last; col++) {
        const pixel = row * width + col;
        if (mask[pixel] && mask[pixel] !== id) overlapPixels++;
        if (overwrite || !mask[pixel]) mask[pixel] = id;
      }
    }
  }
  return overlapPixels;
}
export function containsPoint(rings, [x, y]) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    if ((a[1] > y) !== (b[1] > y) && x < a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])) inside = !inside;
  }
  return inside;
}

/** Deterministic categorical coloring of the displayed four-neighbor adjacency graph. */
function colorAdjacency(mask, count) {
  const neighbors = Array.from({ length: count }, () => new Set());
  function connect(a, b) { if (a && b && a !== b) { neighbors[a - 1].add(b - 1); neighbors[b - 1].add(a - 1); } }
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const p = row * width + col;
    if (col + 1 < width) connect(mask[p], mask[p + 1]);
    if (row + 1 < height) connect(mask[p], mask[p + width]);
  }
  const colors = Array(count).fill(-1);
  for (let step = 0; step < count; step++) {
    let best = -1, bestSaturation = -1, bestDegree = -1;
    for (let i = 0; i < count; i++) if (colors[i] < 0) {
      const saturation = new Set([...neighbors[i]].map(n => colors[n]).filter(c => c >= 0)).size;
      if (saturation > bestSaturation || saturation === bestSaturation && neighbors[i].size > bestDegree) { best = i; bestSaturation = saturation; bestDegree = neighbors[i].size; }
    }
    const used = new Set([...neighbors[best]].map(n => colors[n]));
    const color = palette.findIndex((_, i) => !used.has(i));
    if (color < 0) throw new Error('Categorical palette cannot distinguish adjacent display units');
    colors[best] = color;
  }
  return { colors, adjacencyEdges: neighbors.reduce((sum, set) => sum + set.size, 0) / 2 };
}
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let value = i; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1; return value >>> 0; });
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ value >>> 8; return (value ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) { const name = Buffer.from(type), bytes = Buffer.alloc(data.length + 12); bytes.writeUInt32BE(data.length); name.copy(bytes, 4); data.copy(bytes, 8); bytes.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8); return bytes; }
function encodePng(rgba) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(rows, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

export async function prepareDrainage(sourceDir) {
  const files = {};
  for (const ext of ['dbf', 'shp', 'shx', 'prj']) {
    files[ext] = await fs.readFile(path.join(sourceDir, `${sourceFilename}.${ext}`));
    if (sha(files[ext]) !== pinnedHashes[ext]) throw new Error(`BasinATLAS pinned ${ext} hash mismatch`);
  }
  const acquisition = JSON.parse(await fs.readFile(path.join(sourceDir, 'basinatlas-selected-source.json')));
  const registrationBytes = await fs.readFile(path.join(sourceDir, 'hydroatlas-figshare-9890531.json'));
  const registration = JSON.parse(registrationBytes);
  if (registration.id !== 9890531 || registration.license?.name !== 'CC BY 4.0' || registration.license.url !== 'https://creativecommons.org/licenses/by/4.0/' || acquisition.wholeArchiveRetrieved !== false || acquisition.wholeArchiveMd5Verified !== false) throw new Error('Actual BasinATLAS acquisition/license metadata differs');
  const archiveRegistration = registration.files.find(file => file.id === 20087237);
  if (archiveRegistration?.name !== 'BasinATLAS_Data_v10_shp.zip' || archiveRegistration.size !== 4276492333) throw new Error('Official archive identity differs');
  if (!files.prj.toString().includes('GCS_WGS_1984') || files.shp.readUInt32BE(0) !== 9994 || files.shp.readUInt32BE(24) * 2 !== files.shp.length || files.shp.readUInt32LE(28) !== 1000 || files.shp.readUInt32LE(32) !== 5 || (files.shx.length - 100) / 8 !== 1342) throw new Error('Pinned source shape/CRS/header differs');
  const identifiers = readBasicIdentifiers(files.dbf);
  const polygons = identifiers.map(basin => ({ ...basin, rings: readPolygon(files.shp, files.shx, basin.sourceRow) }));
  const mask = new Uint16Array(width * height);
  let overlapPixels = 0;
  for (const basin of polygons) overlapPixels += rasterizeRings(mask, basin.rings, basin.index, false);
  const geographyPath = 'src/data/atlas/europe-countries.json', geographyBytes = await fs.readFile(path.join(root, geographyPath));
  const countries = JSON.parse(geographyBytes).features.filter(feature => feature.properties.kind === 'europe');
  if (countries.length !== 45) throw new Error('Expected existing 45-country display mask');
  const countryMask = new Uint8Array(width * height);
  countries.forEach((country, i) => {
    const parts = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;
    for (const rings of parts) rasterizeRings(countryMask, rings, i + 1);
  });
  const countryCoverage = countries.map(country => ({ code: country.properties.code, displayPixelCenters: 0, validDisplayPixelCenters: 0, missingDisplayPixelCenters: 0 }));
  const globalBasinCoverage = Array(identifiers.length).fill(0);
  for (let p = 0; p < mask.length; p++) {
    const country = countryMask[p];
    if (!country) { mask[p] = 0; continue; }
    const coverage = countryCoverage[country - 1]; coverage.displayPixelCenters++;
    if (mask[p]) { coverage.validDisplayPixelCenters++; globalBasinCoverage[mask[p] - 1]++; }
    else coverage.missingDisplayPixelCenters++;
  }
  // BasinATLAS's continental region digit is not a display boundary. Select from
  // all actual global polygons after country/frame clipping, including Siberia
  // source-region polygons that occur in the displayed western Russian area.
  const contributing = identifiers.filter(basin => globalBasinCoverage[basin.index - 1] > 0);
  const compactIndex = new Uint16Array(identifiers.length + 1);
  const basic = contributing.map(({ sourceRow, index, ...basin }, i) => { compactIndex[index] = i + 1; return { index: i + 1, ...basin }; });
  const basinCoverage = contributing.map(basin => globalBasinCoverage[basin.index - 1]);
  for (let p = 0; p < mask.length; p++) if (mask[p]) mask[p] = compactIndex[mask[p]];
  const coloring = colorAdjacency(mask, basic.length);
  const rgba = Buffer.alloc(mask.length * 4), grid = Buffer.alloc(mask.length * 4);
  const colorBytes = palette.map(color => Buffer.from(color.slice(1), 'hex'));
  let validPixels = 0;
  for (let p = 0; p < mask.length; p++) {
    const value = mask[p] || lookupNoData;
    grid.writeFloatLE(value, p * 4);
    if (value !== lookupNoData) { colorBytes[coloring.colors[value - 1]].copy(rgba, p * 4); rgba[p * 4 + 3] = 255; validPixels++; }
  }
  const names = [ ['London', -.1, 51.5], ['Paris', 2.35, 48.85], ['Berlin', 13.405, 52.52], ['Warsaw', 21.01, 52.23], ['Moscow', 37.62, 55.75], ['Helsinki', 24.94, 60.17], ['Reykjavik', -21.94, 64.15], ['Oslo', 10.75, 59.91], ['Rome', 12.5, 41.9], ['Madrid', -3.7, 40.42], ['Russia 60E/60N',60,60], ['Russia 64E/55N',64,55], ['Russia 61E/65N',61,65] ];
  const geometrySamples = names.map(([name, lon, lat]) => {
    const point = [lon, lat], [x, y] = project(point), column = Math.floor(x), row = Math.floor(y), center = displayCoordinate(column, row);
    const sourceAtPoint = polygons.find(basin => containsPoint(basin.rings, point));
    const sourceAtDisplayCenter = polygons.find(basin => containsPoint(basin.rings, center));
    const value = mask[row * width + column] || lookupNoData;
    if (value > 0 && compactIndex[sourceAtDisplayCenter?.index] !== value) throw new Error(`Independent source point containment disagrees at ${name}`);
    return { name, point, displayCenter: center, column, row, sourcePointHYBAS_ID: sourceAtPoint?.HYBAS_ID ?? null, sourceDisplayCenterHYBAS_ID: sourceAtDisplayCenter?.HYBAS_ID ?? null, lookupIndex: value, displayedHYBAS_ID: value > 0 ? basic[value - 1].HYBAS_ID : null };
  });
  const source = {
    dataset: 'BasinATLAS version 1.0, level 04, global source sub-basins contributing to the 45-country display frame', publisher: 'HydroATLAS / Linke et al.', creators: registration.authors.map(author => author.full_name), edition: '1.0', publicationYear: 2019,
    sourceUrl: 'https://www.hydrosheds.org/hydroatlas', doi: 'https://doi.org/10.6084/m9.figshare.9890531.v1', scientificReference: 'Linke et al. (2019), Global hydro-environmental sub-basin and river reach characteristics at high spatial resolution, Scientific Data 6:283, https://doi.org/10.1038/s41597-019-0300-6',
    downloadUrl: 'https://ndownloader.figshare.com/files/20087237', archiveFilename: 'BasinATLAS_Data_v10_shp.zip', archiveBytes: 4276492333, wholeArchiveRetrieved: false, wholeArchiveMd5Verified: false,
    sourceCRS: 'Geographic WGS84 (GCS_WGS_1984)', originalDerivationResolution: '15 arc-seconds, approximately 500 m at the equator; not the rendered pixel resolution',
    sourceMethod: 'Level-04 Pfafstetter sub-basin delineation derived from the HydroSHEDS terrain and drainage model. Publication year 2019 identifies the product release, not a 2019 observation of river boundaries or water quantities.',
    sourceRegion: 'Global: no HydroSHEDS continental-region digit is excluded', sourceRegionFeatures: basic.length, sourceGlobalFeatures: 1342,
    sourceSelection: 'All 1342 global level-04 source polygons are rasterized; only units with at least one original-polygon pixel centre inside the existing 45-country/frame display mask are published in the identifier package.',
    license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', technicalDocumentUrl: 'https://data.hydrosheds.org/file/technical-documentation/HydroATLAS_TechDoc_v10_1.pdf',
    attribution: 'BasinATLAS v1.0 / HydroATLAS, Bernhard Lehner; Simon Linke; Michele Thieme. Scientific reference: Linke et al. (2019). CC BY 4.0. Sub-basin delineation derives from HydroSHEDS/WWF (Lehner et al. 2008; Lehner and Grill 2013). Modified: Global level-04 polygons selected by target-country/frame pixel-centre coverage, Web Mercator cartographic rasterization and categorical colors.',
    disclaimer: 'HydroATLAS data are provided as is, without warranty; the authors disclaim suitability, accuracy, uninterrupted use and liability as described in technical documentation sections 4.2-4.3 and CC BY 4.0 section 5.',
    attributeScope: 'Only HYBAS_ID, PFAF_ID, NEXT_DOWN and MAIN_BAS identifiers are published. The 281 hydro-environmental attributes are excluded. The collective database is CC BY 4.0; individual environmental columns can be CC BY 4.0 or ODbL and must be checked before any future use. Original-format underpinning source licenses are not changed.',
  };
  const selectedInputs = {
    schemaVersion: 1, product: source.dataset, officialProductUrl: source.sourceUrl, doi: source.doi, officialApiUrl: 'https://api.figshare.com/v2/articles/9890531', metadataSha256: sha(registrationBytes),
    officialArchive: { id: archiveRegistration.id, name: archiveRegistration.name, bytes: archiveRegistration.size, publisherMd5: archiveRegistration.computed_md5, wholeArchiveRetrieved: false, wholeArchiveMd5Verified: false },
    acquisition: acquisition.acquisition, centralDirectory: acquisition.centralDirectory,
    files: acquisition.files.filter(file => file.sourceFilename.startsWith(sourceFilename + '.')).map(file => ({ name: file.name, sourceFilename: file.sourceFilename, bytes: file.bytes, compressedBytes: file.compressedBytes, localHeaderOffset: file.localHeaderOffset, fetchedRanges: file.fetchedRanges, crc32: file.crc32, crc32Verified: file.crc32Verified, sha256: file.sha256, compressedSha256: file.compressedSha256 })),
    noSourceSubstitution: 'Actual BasinATLAS archive entries were acquired and independently checked; no earlier HydroBASINS bytes were renamed or re-licensed.',
    licenseEvidence: { officialProductStatesCcBy40: true, figshareArticle: { id: registration.id, title: registration.title, doi: registration.doi, authors: registration.authors.map(author => author.full_name), license: registration.license, publishedDate: registration.published_date }, documentSection: 'HydroATLAS Technical Documentation v1.0.1, section 4.1', checkedAt: '2026-10-02' },
  };
  if (selectedInputs.files.length !== 4 || selectedInputs.files.some(file => !file.crc32Verified || file.sha256 !== pinnedHashes[path.extname(file.sourceFilename).slice(1)])) throw new Error('Selected entry acquisition proof does not match inputs');
  const selectedSourceRegions = Object.fromEntries([...new Set(basic.map(basin => String(basin.HYBAS_ID)[0]))].sort().map(region => [region, basic.filter(basin => String(basin.HYBAS_ID)[0] === region).length]));
  const validation = { sourceShapeType: 5, originalVerticesRetained: true, globalFeatures: 1342, selectedFeatures: basic.length, selectedSourceRegions, sourceGlobalBounds: [0,1,2,3].map(i => files.shp.readDoubleLE(36 + i * 8)), sourcePolygonPointCount: polygons.reduce((sum, basin) => sum + basin.rings.reduce((s, ring) => s + ring.length, 0), 0), sourcePolygonRingCount: polygons.reduce((sum, basin) => sum + basin.rings.length, 0), overlapPixelsBeforeCountryClipping: overlapPixels, overlapRule: 'Lowest HYBAS_ID takes precedence at an overlapping pixel centre; no gap filling or boundary dilation.', geometrySamples };
  const output = path.join(root, 'public/assets/atlas/europe/drainage-v1'), provenance = path.join(root, 'data-source/atlas/europe/drainage');
  await fs.mkdir(output, { recursive: true }); await fs.mkdir(provenance, { recursive: true });
  const smallJson = { 'source.json': source, 'selected-inputs.json': selectedInputs, 'validation.json': validation };
  const inputs = [{ path: geographyPath, sha256: sha(geographyBytes), role: 'Existing 45-country display mask' }];
  for (const [name, item] of Object.entries(smallJson)) {
    const bytes = Buffer.from(JSON.stringify(item, null, 2) + '\n');
    await fs.writeFile(path.join(provenance, name), bytes);
    inputs.push({ path: 'data-source/atlas/europe/drainage/' + name, sha256: sha(bytes), role: name === 'selected-inputs.json' ? 'Verified actual BasinATLAS selected-file provenance and license evidence' : 'Source metadata or independent geometry samples' });
  }
  const image = encodePng(rgba), lookup = zlib.gzipSync(grid, { level: 9 }), basins = Buffer.from(JSON.stringify(basic) + '\n');
  await fs.writeFile(path.join(output, 'drainage.png'), image); await fs.writeFile(path.join(output, 'values.bin.gz'), lookup); await fs.writeFile(path.join(output, 'basins.json'), basins);
  const manifest = {
    schemaVersion: 1, retrievedAt: '2026-10-02', ...source, bounds, width, height, projection: 'EPSG:3857', frame: { width: 1200, height: 1001, west: -25, south: 32, east: 65, north: 73 },
    lookup: { width, height, encoding: 'little-endian float32 row-major gzip', nodata: lookupNoData, gridType: 'display', valueMeaning: `Exact integer 1..${basic.length} indexes basins.json; -1 is missing/outside the 45-country display mask. HYBAS_ID is never encoded as a float32 value.` },
    colors: palette, colorAssignments: basic.map(basin => ({ index: basin.index, color: palette[coloring.colors[basin.index - 1]], displayPixelCenters: basinCoverage[basin.index - 1] })),
    processing: { displayMask: 'Original BasinATLAS polygon pixel-centre containment, intersected with the existing 45 target-country outlines; all polygon holes preserved.', imageAndPickingUseSameMask: true, originalGeometrySimplified: false, boundaryDilation: false, gapFilling: false, quantityDerived: false, rawSourceIncludedInRepository: false, sourceMutation: false, displayResolutionIsSourceResolution: false, colors: 'Categorical adjacency colors; nearby four-neighbor display units have different colors. Color has no quantitative order and can repeat in separated units.', adjacencyEdges: coloring.adjacencyEdges },
    limitations: ['Level-04 sub-basin units are not the complete catchments of every named river; some coastal units combine several small catchments.', 'Publication year 2019 is a product release date, not a common observation year; boundaries derive from a terrain/drainage model.', 'HydroSHEDS delineation quality is lower north of 60 degrees latitude because a coarser HYDRO1k elevation source replaces SRTM there.', 'The map does not display river discharge, groundwater quantity, precipitation, available water supply or any area-derived water quantity.', 'Small countries or narrow/coastal areas may have no display pixel centres or source coverage. Gaps stay missing; no polygon is invented.', 'The map clips original sub-basin units to the 45-country display extent, and longitude 65 degrees east clips Russia.'],
    validation: { validDisplayPixels: validPixels, visibleBasinUnits: basinCoverage.filter(count => count > 0).length, unresolvedDisplayCountries: countryCoverage.filter(c => !c.displayPixelCenters).map(c => c.code), allMissingDisplayCountries: countryCoverage.filter(c => c.displayPixelCenters && !c.validDisplayPixelCenters).map(c => c.code) }, countryCoverage,
    inputs, files: { 'drainage.png': { sha256: sha(image), bytes: image.length }, 'values.bin.gz': { sha256: sha(lookup), bytes: lookup.length }, 'basins.json': { sha256: sha(basins), bytes: basins.length } },
  };
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ imageBytes: image.length, lookupBytes: lookup.length, identifiersBytes: basins.length, validPixels, visibleBasinUnits: manifest.validation.visibleBasinUnits, adjacencyEdges: coloring.adjacencyEdges, overlapPixels, unresolvedCountries: manifest.validation.unresolvedDisplayCountries, allMissingCountries: manifest.validation.allMissingDisplayCountries }));
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), at = args.indexOf('--source-dir');
  await prepareDrainage(path.resolve(at >= 0 ? args[at + 1] : path.join(root, '../europe-water-research')));
}
