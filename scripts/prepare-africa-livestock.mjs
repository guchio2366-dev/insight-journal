/**
 * Offline preparation of FAO GLW4-2020 density rasters for Africa.
 * Original 5-arcminute cells are retained without resampling or gap filling.
 * Site builds consume retained PNG/grid assets and do not run this script.
 * Usage: node scripts/prepare-africa-livestock.mjs --source-dir <immutable-cache>
 *        --geotiff-package <GeoTIFF.js-package-directory> [--out <asset-directory>]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync, deflateSync } from 'node:zlib';

export const bounds = [-27, -36, 64, 39];
export const width = 1092, height = 900, resolutionDegrees = 1 / 12;
export const noData = -1;
export const breaks = [1, 10, 50, 100, 250];
export const positiveColors = ['#e4ebd2', '#c3d7ac', '#96bc86', '#639d72', '#347d65', '#15594f'];
export const zeroColor = '#f4f1e9';
export const zeroId = 'density-zero';
const names = { cattle: '牛', goats: '山羊', sheep: '羊' };
const codes = { cattle: 'CTL', goats: 'GTS', sheep: 'SHP' };
const sourceHashes = {
  cattle: '2bcbf3b57dec7d6f45f2dcfb9cf61d04f22fae1d636934fb8c41a6a7742be3b5',
  goats: 'f5c0372e0bf9631c284615e256e6dc81b7c2b8ebee6808cf1427c7edc8a9b169',
  sheep: '42a6e641b7cc6f1beabd535f4afce1aca896f4e6a398d688072ccfe36174a47f',
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceUrl = 'https://data.apps.fao.org/catalog/iso/9d1e149b-d63f-4213-978b-317a8eb42d02';
const licenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const opt = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;

/** Category boundaries are inclusive at the lower end; zero is separate. */
export function categoryForValue(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  if (value === 0) return { id: zeroId, color: zeroColor, index: 0 };
  const bucket = breaks.findIndex(edge => value < edge);
  const positiveIndex = bucket < 0 ? positiveColors.length - 1 : bucket;
  return { id: `density-${positiveIndex}`, color: positiveColors[positiveIndex], index: positiveIndex + 1 };
}

/** Exact even-odd scanlines at native cell centres; holes are retained. */
export function polygonCellMask(collection, frame = bounds, w = width, h = height) {
  const stepX = (frame[2] - frame[0]) / w;
  const stepY = (frame[3] - frame[1]) / h;
  const mask = new Uint8Array(w * h);
  for (const feature of collection.features) {
    const geometry = feature.geometry;
    if (!['Polygon', 'MultiPolygon'].includes(geometry.type)) throw Error('Expected polygon country geometry');
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const rings of polygons) {
      let minLat = Infinity, maxLat = -Infinity;
      const edges = [];
      for (const ring of rings) {
        if (ring.length < 4) throw Error('Invalid closed polygon ring');
        for (let i = 0; i < ring.length - 1; i++) {
          const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
          minLat = Math.min(minLat, y0, y1); maxLat = Math.max(maxLat, y0, y1);
          if (y0 !== y1) edges.push([x0, y0, x1, y1]);
        }
        if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) throw Error('Country ring is not closed');
      }
      const firstRow = Math.max(0, Math.floor((frame[3] - maxLat) / stepY));
      const lastRow = Math.min(h, Math.ceil((frame[3] - minLat) / stepY));
      for (let row = firstRow; row < lastRow; row++) {
        const lat = frame[3] - (row + .5) * stepY;
        const crossings = [];
        for (const [x0, y0, x1, y1] of edges) {
          if ((y0 <= lat && lat < y1) || (y1 <= lat && lat < y0)) crossings.push(x0 + (lat - y0) * (x1 - x0) / (y1 - y0));
        }
        crossings.sort((a, b) => a - b);
        if (crossings.length % 2) throw Error('Odd polygon scanline intersection count');
        for (let i = 0; i < crossings.length; i += 2) {
          const firstColumn = Math.max(0, Math.ceil((crossings[i] - frame[0]) / stepX - .5));
          const lastColumn = Math.min(w, Math.ceil((crossings[i + 1] - frame[0]) / stepX - .5));
          for (let column = firstColumn; column < lastColumn; column++) mask[row * w + column] = 1;
        }
      }
    }
  }
  return mask;
}

export function maskNativeValues(nativeValues, land, sourceNoData) {
  if (nativeValues.length !== land.length) throw Error('Native window and mask have different shapes');
  const output = new Float32Array(nativeValues.length);
  for (let i = 0; i < output.length; i++) {
    const value = nativeValues[i];
    if (Number.isFinite(value) && value < 0 && value !== sourceNoData) throw Error('Negative source density other than declared noData');
    output[i] = land[i] && Number.isFinite(value) && value !== sourceNoData ? value : noData;
  }
  return output;
}

export function float32LittleEndian(values) {
  const bytes = Buffer.alloc(values.length * 4);
  for (let i = 0; i < values.length; i++) bytes.writeFloatLE(values[i], i * 4);
  return bytes;
}

export function rgbaForValues(values) {
  const rgba = Buffer.alloc(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    const category = categoryForValue(values[i]);
    if (!category) continue;
    const color = Number.parseInt(category.color.slice(1), 16);
    rgba.set([(color >> 16) & 255, (color >> 8) & 255, color & 255, 255], i * 4);
  }
  return rgba;
}

// Minimal deterministic RGBA PNG writer. No browser or image-processing service.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function pngChunk(type, data) {
  const tag = Buffer.from(type), contents = Buffer.concat([tag, data]);
  let crc = 0xffffffff;
  for (const b of contents) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  const header = Buffer.alloc(4), tail = Buffer.alloc(4);
  header.writeUInt32BE(data.length); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, contents, tail]);
}
export function encodeRgbaPng(rgba, w, h) {
  if (rgba.length !== w * h * 4) throw Error('RGBA PNG dimensions do not match pixels');
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const scanlines = Buffer.alloc(h * (w * 4 + 1));
  for (let row = 0; row < h; row++) rgba.copy(scanlines, row * (w * 4 + 1) + 1, row * w * 4, (row + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(scanlines, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

function positiveLegend() {
  return positiveColors.map((color, index) => ({ id: `density-${index}`, color,
    label: index === 0 ? '0超–1未満 頭/km²' : index === positiveColors.length - 1 ? '250以上 頭/km²' : `${breaks[index - 1]}–${breaks[index]}未満 頭/km²`,
  }));
}
function countryInputs(receipt, species, countryCodes) {
  const rows = receipt.censusInputs[species];
  return Object.fromEntries(countryCodes.map(code => [code, rows[code] ? {
    sourceCountryCode: code, sourceCountryName: rows[code].countryName,
    censusYear: rows[code].censusYear,
    averageSpatialResolutionKm: rows[code].averageSpatialResolutionKm,
    inputSource: rows[code].inputSource,
    status: rows[code].censusYear === null ? 'input-year-unlisted' : 'listed',
  } : { sourceCountryCode: code, censusYear: null, averageSpatialResolutionKm: null, inputSource: null, status: 'country-not-listed-in-source-metadata' }]));
}

export async function prepareLivestock({ sourceDirectory, geotiffPackage, outDirectory }) {
  const receipt = JSON.parse(await readFile(path.join(sourceDirectory, 'source-receipt.json'), 'utf8'));
  if (receipt.license !== 'CC-BY-4.0' || receipt.referenceYear !== 2020 || receipt.unit !== 'head/km²') throw Error('Expected retained FAO2020 density provenance');
  const geographyPath = path.join(root, 'src/data/atlas/africa-geography.json');
  const geographyBytes = await readFile(geographyPath);
  const geography = JSON.parse(geographyBytes);
  const countryCodes = [...new Set(geography.features.map(f => f.properties.code))].sort();
  if (countryCodes.length !== 55) throw Error('Expected unchanged 55 Africa target boundaries');
  const land = polygonCellMask(geography);
  const { fromFile } = await import(pathToFileURL(path.join(geotiffPackage, 'dist-module/geotiff.js')).href);
  const layers = {}, files = {}, samples = {};
  await mkdir(outDirectory, { recursive: true });
  for (const species of Object.keys(codes)) {
    const filename = `GLW4-2020.D-DA.${codes[species]}.tif`;
    const sourcePath = path.join(sourceDirectory, filename);
    const sourceBytes = await readFile(sourcePath);
    const sourceSha256 = sha(sourceBytes);
    if (sourceSha256 !== sourceHashes[species]) throw Error(`Immutable ${species} original differs`);
    const original = receipt.sources.find(r => r.filename === filename);
    if (original?.sha256 !== sourceSha256 || original?.bytes !== sourceBytes.length) throw Error('Acquisition record does not match original');
    const tiff = await fromFile(sourcePath);
    const image = await tiff.getImage(), origin = image.getOrigin(), resolution = image.getResolution(), keys = image.getGeoKeys();
    const sourceNoData = image.getGDALNoData();
    if (image.getWidth() !== 4320 || image.getHeight() !== 2160 || keys.GeographicTypeGeoKey !== 4326 ||
      Math.abs(origin[0] + 180) > 1e-10 || Math.abs(origin[1] - 90) > 1e-10 ||
      Math.abs(resolution[0] - resolutionDegrees) > 1e-12 || Math.abs(resolution[1] + resolutionDegrees) > 1e-12 ||
      sourceNoData !== -3.4028234663852886e38) throw Error('Source geometry or noData differs from retained GLW4-2020');
    const sourceWindow = [1836, 612, 2928, 1512];
    const nativeValues = await image.readRasters({ window: sourceWindow, samples: [0], interleave: true });
    if (!(nativeValues instanceof Float32Array) || nativeValues.length !== width * height) throw Error('Expected actual source Float32 native window');
    const values = maskNativeValues(nativeValues, land, sourceNoData);
    const gridBytes = float32LittleEndian(values), rgba = rgbaForValues(values);
    const png = encodeRgbaPng(rgba, width, height), gzip = gzipSync(gridBytes, { level: 9, mtime: 0 });
    const imageFile = `${species}.png`, gridFile = `${species}.values.gz`;
    await writeFile(path.join(outDirectory, imageFile), png);
    await writeFile(path.join(outDirectory, gridFile), gzip);
    files[imageFile] = { bytes: png.length, sha256: sha(png) };
    files[gridFile] = { bytes: gzip.length, sha256: sha(gzip), decodedBytes: gridBytes.length, decodedSha256: sha(gridBytes) };
    let validPixels = 0, zeroPixels = 0, missingLandPixels = 0, min = Infinity, max = -Infinity;
    const categoryCounts = Object.fromEntries([zeroId, ...positiveLegend().map(r => r.id)].map(id => [id, 0]));
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value === noData) { if (land[i]) missingLandPixels++; continue; }
      validPixels++; if (value === 0) zeroPixels++;
      min = Math.min(min, value); max = Math.max(max, value);
      categoryCounts[categoryForValue(value).id]++;
      if (value !== nativeValues[i]) throw Error('A valid source density changed during packaging');
    }
    samples[species] = original.samples.map(sample => {
      const col = sample.sourceColumn - sourceWindow[0], row = sample.sourceRow - sourceWindow[1], index = row * width + col;
      return { ...sample, displayColumn: col, displayRow: row, landAtCellCentre: !!land[index],
        displayValue: values[index] === noData ? null : values[index],
        classId: categoryForValue(values[index])?.id ?? null,
        retainedExactly: values[index] === noData || values[index] === sample.value };
    });
    const commonScope = '2020年の国別統計に整合させた推定密度。元の地域別統計は異なる年の資料を含む。農場の位置・生産量・放牧地そのものの分布ではない。';
    const description = '地域別の家畜統計を、植生・地形・人口などの情報で格子へ配分した推定。自然条件との重なりだけでは、その効果を独立に検証できない。';
    layers[species] = {
      title: `${names[species]}の推定飼養密度`, image: imageFile, grid: gridFile,
      encoding: 'float32-le-gzip', noData, bounds, width, height, resolutionDegrees,
      crs: 'EPSG:4326', gridOrder: 'row-major north-to-south, west-to-east',
      unit: '頭/km²', sourceUnit: 'head/km²', period: '2020年に整合した推定分布', referenceYear: 2020,
      sourceName: 'FAO Gridded Livestock of the World version 4, 2020 density', sourceLabel: 'FAO GLW4：原典・推定方法',
      sourceUrl, downloadUrl: original.url, publisher: 'Food and Agriculture Organization of the United Nations (FAO)',
      license: 'CC BY 4.0', licenseUrl, citation: 'FAO (2024). Gridded livestock density (Global – 2020 – 10 km) – GLW4. Published 2024-07-15. CC BY 4.0.',
      publishedAt: '2024-07-15', sourceRetrievedAt: receipt.capturedAt,
      sourceSha256, sourceBytes: sourceBytes.length, sourceFile: filename,
      sourceResolutionDegrees: resolutionDegrees, sourceWidth: 4320, sourceHeight: 2160,
      sourceNoData, sourceActualType: 'Float32', catalogueReportedType: 'Float64', sourceWindow,
      breaks, colors: positiveColors, zeroValue: 0, zeroId, zeroColor,
      positiveLegend: positiveLegend(), legend: [{ id: zeroId, label: '0 頭/km²（推定値）', color: zeroColor }, ...positiveLegend()],
      missing: { value: noData, color: 'transparent', label: '未収録・表示対象外（0頭とは別）' },
      validPixels, positivePixels: validPixels - zeroPixels, zeroPixels,
      missingPixels: values.length - validPixels, missingLandPixels, min, max, categoryCounts,
      scope: commonScope, description,
      takeaway: species === 'cattle' ? '牛の分布は草地と水だけで決まらず、飼料・農耕との組合せ・市場への接続にも左右される。' :
        species === 'goats' ? '山羊は多様な植生を利用する。密度の差は乾燥への適応に加え、飼養方法・水・市場と合わせて読む。' :
          '羊は乾燥地域から高地まで飼われる。同じ密度でも、草地・飼料・移動・市場の条件は異なる。',
      method: '元の5分角密度セルをそのまま切出し、現行アフリカ境界のセル中心判定で表示範囲を絞った。補間・平滑化・欠測補完・年の置換はしない。0は有効な推定値、元noDataと境界外は-1としてPNG透明。PNGと値照会は同一Float32配列を使用。',
      queryMethod: 'floor((lon-west)/(east-west)*width), floor((north-lat)/(north-south)*height); bounds: west≤lon<east, south<lat≤north; noData -1 returns unavailable',
      countryInputs: countryInputs(receipt, species, countryCodes),
      countryInputMetadataUrl: receipt.ancillary.find(r => r.filename === `${species}_metadata.html`) ?
        JSON.parse(await readFile(path.join(sourceDirectory, 'fao-glw4-catalog.json'), 'utf8')).result.resources.find(r => r.name === `${species === 'cattle' ? 'Cattle' : species === 'goats' ? 'Goats' : 'Sheep'}: metadata`).url : sourceUrl,
      countryInputMetadataNote: '公式種別メタデータの国コードを同じISO3だけで照合。未掲載・年未記載はnull。元表の値を掲載年と区別して保持し、他国の値で補わない。',
    };
    await tiff.close();
    console.log(JSON.stringify({ species, validPixels, zeroPixels, missingLandPixels, imageBytes: png.length, gridBytes: gzip.length }));
  }
  const scriptBytes = await readFile(fileURLToPath(import.meta.url));
  const ledger = {
    schemaVersion: 1, sourceUrl, sourceApi: receipt.sourceApi, license: receipt.license, licenseUrl,
    licenseQuote: receipt.licenseQuote, referenceYear: 2020, publishedAt: '2024-07-15',
    grantEvidence: { datasetLicence: 'The FAO catalogue explicitly applies CC BY 4.0 to all datasets.',
      legalCode: 'https://creativecommons.org/licenses/by/4.0/legalcode.en', scope: 'Section 2(a)(1) permits reproduction/sharing and production/reproduction/sharing of adapted material; CC BY 4.0 has no noncommercial restriction. Retain attribution, source/licence links and modification notice.' },
    modifications: 'Africa native 5 arcminute window and country cell-centre display mask; Float32 LE query grid and class PNG. No values inferred, spatially interpolated, or year-filled.',
    sources: receipt.sources.map(({ code, filename, bytes, sha256, url, actualDecodedType, noData }) => ({ code, filename, bytes, sha256, url, actualDecodedType, noData })),
    ancillary: receipt.ancillary,
    limitations: [
      '2020 is the aligned reference year, not a simultaneous 2020 census of every cell or country. Source census years vary; national reporting also has gaps.',
      'GLW4 dasymetric distribution is a model-informed estimate, not independent observed farm coordinates, grazing areas, livestock output or present-day conditions.',
      'Vegetation, topography and human population are allocation predictors. Overlay agreement is not independent proof of their causal effect on livestock.',
      '5 arcminute geographic cells are approximately 10 km at the equator; their areas differ by latitude. Values are head/km², not head/cell. Do not sum density pixels to infer totals.',
      'The site retains its Plate Carree location map, which is not equal-area. FAO recommends equal-area display for density interpretation. The coloured surface area is not total livestock abundance; higher-latitude cells appear larger relative to their true surface area.',
      'Native zero is retained as a modelled zero, not proof that no animal exists. Missing and country-mask excluded cells remain unavailable, without nearest-land filling.',
      'Generalized country outlines and cell-centre clipping can omit small islands or coastlines. Metadata not listing a country does not by itself mean the raster has no values there.',
      'The 2024 FAO catalogue calls these D-DA download files density in head/km². Its linked species reports describe earlier per-cell-count products. This release uses the explicitly identified density files and units.',
      'The catalogue generic datatype says Float64; actual retained TIFF decodes Float32. The output retains the exact native Float32 values.',
    ],
  };
  const ledgerBytes = Buffer.from(JSON.stringify(ledger, null, 2) + '\n');
  await writeFile(path.join(outDirectory, 'source-ledger.json'), ledgerBytes);
  files['source-ledger.json'] = { bytes: ledgerBytes.length, sha256: sha(ledgerBytes) };
  const manifest = {
    schemaVersion: 1, version: '1.0.0', bounds, crs: 'EPSG:4326', width, height, resolutionDegrees,
    gridOrder: 'row-major north-to-south, west-to-east', referenceYear: 2020,
    scope: 'FAO GLW4-2020 modelled livestock density; Africa country-boundary native cell mask',
    layers, sourceLedger: 'source-ledger.json',
    boundary: { file: 'src/data/atlas/africa-geography.json', sha256: sha(geographyBytes), features: geography.features.length,
      license: 'Natural Earth public domain', method: 'Even-odd native cell-centre scanlines; supplied country/disputed-area geometry retained unchanged' },
    processing: { script: 'scripts/prepare-africa-livestock.mjs', scriptSha256: sha(scriptBytes), node: process.version,
      zlib: process.versions.zlib, sourceWindow: [1836, 612, 2928, 1512], interpolation: 'none', gapFill: 'none',
      nativeValuesRetained: true, files,
      reproduction: 'node scripts/prepare-africa-livestock.mjs --source-dir <immutable-FAO2020-cache-with-source-receipt.json> --geotiff-package <GeoTIFF.js-3.0.5-package-directory>',
    },
    representativeSpots: samples, limitations: ledger.limitations,
  };
  await writeFile(path.join(outDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const sourceDirectory = opt('--source-dir'), geotiffPackage = opt('--geotiff-package');
  if (!sourceDirectory || !geotiffPackage) throw Error('--source-dir and --geotiff-package are required');
  const outDirectory = opt('--out') ?? path.join(root, 'public/assets/atlas/africa-livestock-v1');
  await prepareLivestock({ sourceDirectory, geotiffPackage, outDirectory });
}
