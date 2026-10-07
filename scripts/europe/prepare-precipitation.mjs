/** GPCC v2025 1991–2020 normals. Offline, pinned-source conversion.
 * node scripts/europe/prepare-precipitation.mjs --source <private .nc.gz path>
 * Raw GPCC input is deliberately kept outside this checkout. No network calls.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const bounds = [-25, 32, 65, 73];
export const width = 1800, height = 1502, lookupNoData = -1;
export const breaks = Array.from({length:12},(_,i)=>(i+1)*250);
export const colors = ['#eef7fb','#dceef7','#c7e3f2','#add5eb','#8fc4df','#6fb1d3','#529ac5','#3d82b4','#2f6da4','#245b94','#1c4b82','#153b6d','#0c2d57'];
const sourceHash = '3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5';
const sourceMd5 = 'd701c717e08ce6ad457c9f4004984d65';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const mercator = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const top = mercator(73), bottom = mercator(32);
const project = ([lon, lat]) => [(lon + 25) / 90 * width, (top - mercator(lat)) / (top - bottom) * height];
export function displayCoordinate(column, row) {
  return [-25 + (column + .5) / width * 90, (2 * Math.atan(Math.exp(top - (row + .5) / height * (top - bottom))) - Math.PI / 2) * 180 / Math.PI];
}

/** No partial-year extrapolation. A real zero remains a valid annual normal. */
export function sumCompleteMonthlyNormals(months, missing = -99999.9921875) {
  if (months.length !== 12 || months.some(value => !Number.isFinite(value) || value === missing || value < 0)) return null;
  return months.reduce((sum, value) => sum + value, 0);
}
export function sourceCellIndex(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon >= 180 || lat < -90 || lat > 90) return null;
  const column = Math.max(0, Math.min(1439, Math.floor((lon + 180) * 4)));
  const row = Math.max(0, Math.min(719, Math.floor((90 - lat) * 4)));
  return { row, column, index: row * 1440 + column, center: [-179.875 + column / 4, 89.875 - row / 4] };
}
export function precipitationColor(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  return colors[breaks.filter(threshold => value >= threshold).length];
}

/** Read the classic 64-bit-offset NetCDF format of the pinned GPCC archive. */
export function readNetcdfHeader(bytes) {
  if (bytes.subarray(0, 4).toString('hex') !== '43444602') throw new Error('Expected pinned GPCC CDF2 NetCDF');
  let cursor = 4;
  const number = () => { const value = bytes.readUInt32BE(cursor); cursor += 4; return value; };
  const string = () => { const count = number(), value = bytes.subarray(cursor, cursor + count).toString('utf8'); cursor += Math.ceil(count / 4) * 4; return value; };
  const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 4, 6: 8 };
  function values(type, count) {
    if (!sizes[type]) throw new Error('Unsupported NetCDF type');
    if (type === 2) { const value = bytes.subarray(cursor, cursor + count).toString('utf8'); cursor += Math.ceil(count / 4) * 4; return value; }
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(type === 1 ? bytes.readInt8(cursor) : type === 3 ? bytes.readInt16BE(cursor) : type === 4 ? bytes.readInt32BE(cursor) : type === 5 ? bytes.readFloatBE(cursor) : bytes.readDoubleBE(cursor));
      cursor += sizes[type];
    }
    cursor += (4 - count * sizes[type] % 4) % 4;
    return count === 1 ? result[0] : result;
  }
  function attributes() {
    const tag = number(), count = number(), result = {};
    if (tag !== 0 && tag !== 12) throw new Error('Invalid NetCDF attributes');
    for (let i = 0; i < count; i++) { const name = string(), type = number(), length = number(); result[name] = values(type, length); }
    return result;
  }
  const records = number(), dimensionTag = number(), count = number(), dimensions = [];
  if (dimensionTag !== 10) throw new Error('Invalid NetCDF dimensions');
  for (let i = 0; i < count; i++) dimensions.push({ name: string(), size: number() });
  const globals = attributes(), variableTag = number(), variableCount = number(), variables = [];
  if (variableTag !== 11) throw new Error('Invalid NetCDF variables');
  for (let i = 0; i < variableCount; i++) {
    const name = string(), dimensionCount = number(), dims = [];
    for (let j = 0; j < dimensionCount; j++) dims.push(dimensions[number()]);
    const attrs = attributes(), type = number(), recordBytes = number(), offset = Number(bytes.readBigUInt64BE(cursor)); cursor += 8;
    variables.push({ name, dimensions: dims, attributes: attrs, type, recordBytes, offset });
  }
  return { records, dimensions, globals, variables };
}

/** Pixel-centre land display mask; polygon holes are preserved. */
function paintCountry(mask, geometry, id) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    const rings = polygon.map(ring => ring.map(project));
    const ys = rings.flatMap(ring => ring.map(point => point[1]));
    for (let row = Math.max(0, Math.ceil(Math.min(...ys) - .5)); row <= Math.min(height - 1, Math.floor(Math.max(...ys) - .5)); row++) {
      const crossings = [], y = row + .5;
      for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[j], b = ring[i];
        if ((a[1] > y) !== (b[1] > y)) crossings.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) for (let column = Math.max(0, Math.ceil(crossings[i] - .5)); column <= Math.min(width - 1, Math.floor(crossings[i + 1] - .5)); column++) mask[row * width + column] = id;
    }
  }
}
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let value = i; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1; return value >>> 0; });
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ value >>> 8; return (value ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) { const name = Buffer.from(type), buffer = Buffer.alloc(data.length + 12); buffer.writeUInt32BE(data.length, 0); name.copy(buffer, 4); data.copy(buffer, 8); buffer.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8); return buffer; }
export function encodePng(rgba) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(rows, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

export async function preparePrecipitation(sourcePath) {
  const registrationPath = 'data-source/atlas/europe/precipitation/datacite-registration.json';
  const registrationBytes = await fs.readFile(path.join(root, registrationPath));
  const registration = JSON.parse(registrationBytes);
  if (registration.doi !== '10.5676/dwd_gpcc/climat_v2025_025' || registration.publicationYear !== 2025 || !registration.publisher.includes('Deutscher Wetterdienst') || registration.url !== 'https://opendata.dwd.de/climate_environment/GPCC/html/gpcc_precipitation_analysis_climatology_v2025_doi_download.html' || !Array.isArray(registration.rightsList)) throw new Error('Publisher DOI registration snapshot mismatch');
  const archive = await fs.readFile(sourcePath);
  if (sha(archive) !== sourceHash || crypto.createHash('md5').update(archive).digest('hex') !== sourceMd5) throw new Error('Pinned GPCC source checksum mismatch');
  const bytes = zlib.gunzipSync(archive), header = readNetcdfHeader(bytes);
  const variable = header.variables.find(item => item.name === 'gpcc_precip');
  const lon = header.variables.find(item => item.name === 'lon'), lat = header.variables.find(item => item.name === 'lat');
  const longitudeCenters = Array.from({ length: 1440 }, (_, i) => bytes.readDoubleBE(lon.offset + i * 8));
  const latitudeCenters = Array.from({ length: 720 }, (_, i) => bytes.readDoubleBE(lat.offset + i * 8));
  if (header.records !== 12 || header.globals.time_coverage_start !== '1991-01-01' || header.globals.time_coverage_end !== '2020-12-31' || !header.globals.title.includes('1991-2020') || variable?.attributes.units !== 'mm/month' || variable.type !== 5 || variable.recordBytes !== 1440 * 720 * 4) throw new Error('GPCC baseline/variable/dimensions mismatch');
  if (!longitudeCenters.every((value, i) => value === -179.875 + i * .25) || !latitudeCenters.every((value, i) => value === 89.875 - i * .25)) throw new Error('Unexpected source coordinates; review orientation before conversion');
  const recordBytes = header.variables.filter(item => item.dimensions[0]?.name === 'time').reduce((sum, item) => sum + item.recordBytes, 0);
  const missing = variable.attributes._FillValue, sourceAnnual = new Float64Array(1440 * 720);
  sourceAnnual.fill(lookupNoData);
  let completeSourceCells = 0;
  for (let index = 0; index < sourceAnnual.length; index++) {
    const months = Array.from({ length: 12 }, (_, month) => bytes.readFloatBE(variable.offset + month * recordBytes + index * 4));
    const annual = sumCompleteMonthlyNormals(months, missing);
    if (annual !== null) { sourceAnnual[index] = annual; completeSourceCells++; }
  }
  const validationSites = [ ['London', -.1, 51.5], ['Paris', 2.35, 48.85], ['Helsinki', 24.94, 60.17], ['Moscow', 37.62, 55.75], ['Reykjavik', -21.94, 64.15] ];
  const orientationSamples = validationSites.map(([name, longitude, latitude]) => {
    const cell = sourceCellIndex(longitude, latitude);
    return { name, sampleCoordinate: [longitude, latitude], sourceCellCenter: cell.center, monthlyNormals: Array.from({ length: 12 }, (_, month) => bytes.readFloatBE(variable.offset + month * recordBytes + cell.index * 4)), annualNormal: sourceAnnual[cell.index], flippedLatitudeAnnual: sourceAnnual[(719 - cell.row) * 1440 + cell.column] };
  });
  if (orientationSamples.some(sample => sample.annualNormal < 0 || sample.flippedLatitudeAnnual !== lookupNoData)) throw new Error('Known-place orientation/source-mask validation failed');
  const geographyPath = 'src/data/atlas/europe-countries.json', geographyBytes = await fs.readFile(path.join(root, geographyPath));
  const countries = JSON.parse(geographyBytes).features.filter(feature => feature.properties.kind === 'europe');
  if (countries.length !== 45) throw new Error('Expected existing 45 target-country display mask');
  const mask = new Uint8Array(width * height);
  countries.forEach((country, i) => paintCountry(mask, country.geometry, i + 1));
  const coverage = countries.map(country => ({ code: country.properties.code, displayPixelCenters: 0, validDisplayPixelCenters: 0, missingDisplayPixelCenters: 0 }));
  const grid = Buffer.alloc(width * height * 4), rgba = Buffer.alloc(width * height * 4), palette = colors.map(color => Buffer.from(color.slice(1), 'hex'));
  let validPixels = 0, minimum = Infinity, maximum = -Infinity;
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const index = row * width + column, countryId = mask[index];
    let value = lookupNoData;
    if (countryId) {
      // Classify the exact float32 value that picking will read, including thresholds.
      value = Math.fround(sourceAnnual[sourceCellIndex(...displayCoordinate(column, row)).index]);
      const entry = coverage[countryId - 1]; entry.displayPixelCenters++;
      if (value < 0) entry.missingDisplayPixelCenters++;
      else {
        entry.validDisplayPixelCenters++; validPixels++; minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
        const color = palette[breaks.filter(threshold => value >= threshold).length]; color.copy(rgba, index * 4); rgba[index * 4 + 3] = 255;
      }
    }
    grid.writeFloatLE(value, index * 4);
  }
  const source = {
    dataset: 'GPCC Precipitation Analysis Climatology Version 2025 at 0.25°, reference period 1991–2020', publisher: 'Global Precipitation Climatology Centre (GPCC) at Deutscher Wetterdienst (DWD)',
    sourceUrl: 'https://opendata.dwd.de/climate_environment/GPCC/html/gpcc_precipitation_analysis_climatology_v2025_doi_download.html',
    downloadUrl: 'https://opendata.dwd.de/climate_environment/GPCC/GPCC_Precipitation_Analysis_Climatology/Version_2025/gpcc_precipitation_analysis_climatology_1991_2020_v2025_025.nc.gz',
    checksumUrl: 'https://opendata.dwd.de/climate_environment/GPCC/GPCC_Precipitation_Analysis_Climatology/Version_2025/readme_md5_gpcc_precipitation_analysis_climatology_1991_2020_v2025.txt',
    doi: 'https://doi.org/10.5676/DWD_GPCC/CLIMAT_V2025_025', period: '1991-01-01/2020-12-31', edition: '2025', inputBytes: archive.length, inputSha256: sourceHash, inputMd5: sourceMd5,
    originalResolution: '0.25° regular latitude/longitude grid', sourceCRS: 'geographic latitude/longitude', sourceVariable: variable.name, sourceUnit: variable.attributes.units, sourceNoData: missing,
    sourceMethod: 'Rain-gauge-based interpolated monthly climatology. The fixed reference-period product uses stations with at least 20 complete years, according to the publisher.',
    license: 'CC BY 4.0', licenseUrl: 'https://www.dwd.de/EN/service/legal_notice/legal_notice.html',
    licenseEvidence: { publisherProductLinksToLegalNotice: true, officialIndexedLegalNoticeStatesCcBy40: true, officialIndexedQuote: 'Re-use is permitted solely under the terms of the Creative Commons license BY 4.0 (CC BY 4.0) providing the source is duly acknowledged.', checkedAt: '2026-10-02', directLegalNoticeStatus: 403, dataCiteDoi: registration.doi, dataCiteRightsList: registration.rightsList, note: 'DataCite confirms the exact publisher and product URL but supplies no registered rights. The license evidence is the official DWD indexed legal-notice text linked by the product page, not a DataCite rights claim. No access bypass used.' },
    attribution: 'Rustemeier, Elke; Finger, Peter; Schirmeister, Zora; Ziese, Markus (2025): GPCC Precipitation Analysis Climatology Version 2025 at 0.25°. DOI: 10.5676/DWD_GPCC/CLIMAT_V2025_025. GPCC/DWD, CC BY 4.0. Modified: 12-month annual sum, target-country display masking, nearest-neighbour Web Mercator display and colour classes.',
  };
  const validation = { sourceTitle: header.globals.title, sourceStart: header.globals.time_coverage_start, sourceEnd: header.globals.time_coverage_end, sourceRecords: header.records, sourceDimensions: [1440, 720], completeSourceCells, sourceCoordinates: { firstLongitude: longitudeCenters[0], lastLongitude: longitudeCenters.at(-1), firstLatitude: latitudeCenters[0], lastLatitude: latitudeCenters.at(-1), declaredLatitudeUnit: lat.attributes.units, usedConvention: 'Actual north-positive coordinate array; the inconsistent degrees_south attribute is retained here, not used to flip data.' }, orientationSamples };
  const sourceBytes = Buffer.from(JSON.stringify(source, null, 2) + '\n'), validationBytes = Buffer.from(JSON.stringify(validation, null, 2) + '\n');
  const image = encodePng(rgba), lookup = zlib.gzipSync(grid, { level: 9 });
  const output = path.join(root, 'public/assets/atlas/europe/precipitation-v1'), provenance = path.join(root, 'data-source/atlas/europe/precipitation');
  await fs.mkdir(output, { recursive: true }); await fs.mkdir(provenance, { recursive: true });
  await fs.writeFile(path.join(output, 'precipitation.png'), image); await fs.writeFile(path.join(output, 'values.bin.gz'), lookup);
  await fs.writeFile(path.join(provenance, 'source.json'), sourceBytes); await fs.writeFile(path.join(provenance, 'validation.json'), validationBytes);
  const manifest = {
    schemaVersion: 1, retrievedAt: '2026-10-02', styleUpdatedAt: '2026-10-07', ...source, bounds, width, height, projection: 'EPSG:3857', frame: { width: 1200, height: 1001, west: -25, south: 32, east: 65, north: 73 }, unit: 'mm/year', breaks, colors,
    lookup: { width, height, encoding: 'little-endian float32 row-major gzip', nodata: lookupNoData, gridType: 'display', valueMeaning: 'Annual precipitation normal of the nearest original 0.25° source cell. Zero is valid; -1 is missing or outside target-country land.' },
    processing: { annualSum: 'Sum all 12 monthly normals only where every source month is finite, nonnegative and not nodata. Any missing month makes the annual normal missing.', reprojection: 'Nearest original source-cell sampling at EPSG:3857 display pixel centres; no additional spatial interpolation.', displayMask: 'Existing 45 target-country outlines, with holes preserved; source ocean/missing cells stay missing. Source mask is not expanded into coastal gaps or microstates.', displayGridIsOriginalResolution: false, latitudeOrientation: validation.sourceCoordinates, rawSourceIncludedInRepository: false, sourceMutation: false, numericStorage: 'Monthly source float32 values summed in float64, then rounded once with Math.fround; PNG colour classification and the float32 display lookup use that same rounded value.', colorClassificationBasis: 'Stored float32 display lookup value', palette: '250 mm/year blue classes from the retained float32 display grid; edges follow sampled source-cell values and are not surveyed isohyets.', reclassificationInputSha256: sha(lookup) },
    limitations: ['A 0.25° source grid cannot resolve local rainfall within small countries or individual mountain valleys; the 1800×1502 rendering does not increase source resolution.', 'Annual precipitation is not river discharge, groundwater recharge, available water supply or freshwater availability.', 'Different source cells have different station support. Rain-gauge interpolation and the source baseline are retained; no uncertainty interval is invented.', 'Ocean cells, source missing values, incomplete 12-month cells and land outside the 45-country display mask are transparent/missing; zero precipitation is distinct.', 'Country display geometry only clips the map. No national average, area-weighted statistic, water volume or country-specific quantity is calculated.', 'The longitude 65° east display limit clips the Russian Federation; this map does not represent all of Russia.'],
    validation: { sourceRecords: header.records, completeSourceCells, validDisplayPixels: validPixels, displayRangeMmPerYear: [minimum, maximum], unresolvedDisplayCountries: coverage.filter(country => !country.displayPixelCenters).map(country => country.code), allMissingDisplayCountries: coverage.filter(country => country.displayPixelCenters && !country.validDisplayPixelCenters).map(country => country.code) }, countryCoverage: coverage,
    inputs: [{ path: geographyPath, sha256: sha(geographyBytes), role: 'Existing 45 target-country display mask' }, { path: registrationPath, sha256: sha(registrationBytes), role: 'Actual exact-DOI DataCite registration excerpt; empty registered rights retained' }, { path: 'data-source/atlas/europe/precipitation/source.json', sha256: sha(sourceBytes), role: 'Pinned source identity, baseline, license evidence and raw input hash' }, { path: 'data-source/atlas/europe/precipitation/validation.json', sha256: sha(validationBytes), role: 'Actual NetCDF source metadata, coordinates and monthly orientation samples' }],
    files: { 'precipitation.png': { sha256: sha(image), bytes: image.length }, 'values.bin.gz': { sha256: sha(lookup), bytes: lookup.length } },
  };
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ imageBytes: image.length, lookupBytes: lookup.length, validPixels, unresolvedCountries: manifest.validation.unresolvedDisplayCountries, allMissingCountries: manifest.validation.allMissingDisplayCountries }));
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argumentsList = process.argv.slice(2), at = argumentsList.indexOf('--source');
  const sourcePath = path.resolve(at >= 0 ? argumentsList[at + 1] : path.join(root, '../europe-water-research/gpcc-1991-2020-v2025-025.nc.gz'));
  await preparePrecipitation(sourcePath);
}
