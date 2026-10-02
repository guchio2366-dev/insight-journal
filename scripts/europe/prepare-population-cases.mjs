/** Official census cases; no network requests, inferred polygons or harmonised ethnicity.
 * First preparation: node scripts/europe/prepare-population-cases.mjs --cache <private-source-cache>
 * Rebuild from the retained selected extracts: node scripts/europe/prepare-population-cases.mjs
 * Isolated rebuild: append --output-dir <directory> to write all assets and manifest there.
 * Isolated rebuilds read retained inputs only and cannot be combined with --cache.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const canonical = path.join(root, 'data-source/atlas/europe/population-cases');
const outputIndex = process.argv.indexOf('--output-dir');
const outputArgument = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
if (outputIndex >= 0 && (!outputArgument || outputArgument.startsWith('--'))) throw new Error('--output-dir requires a directory');
const output = outputArgument ? path.resolve(outputArgument) : path.join(root, 'public/assets/atlas/europe/population-cases-v1');
const cacheIndex = process.argv.indexOf('--cache');
if (outputArgument && cacheIndex >= 0) throw new Error('--output-dir is a read-only rebuild of retained inputs; do not combine it with --cache');
const cache = cacheIndex >= 0 ? path.resolve(process.argv[cacheIndex + 1]) : null;
const manifestOutput = path.join(outputArgument ? output : canonical, 'manifest.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const boundaryURL = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2021_UK_BUC_2022/FeatureServer/0/query?where=LAD21CD%20LIKE%20%27E%25%27%20OR%20LAD21CD%20LIKE%20%27W%25%27&outFields=LAD21CD,LAD21NM,LAD21NMW&outSR=4326&returnGeometry=true&f=geojson';
const sourceLedger = {
  ts021: { file: 'census2021-ts021.zip', bytes: 5891579, sha256: 'ca2301d72a2de7e91c495695b6dceddb4dd318b580ae530b61582f851144fc78', retrievedAt: '2026-10-02T16:33:08.587Z' },
  ts030: { file: 'census2021-ts030.zip', bytes: 3560319, sha256: '7b587bd7069030d96c1e7ce943cb5924c197e9e0420338967f6dda8cc29bb41a', retrievedAt: '2026-10-02T16:33:01.392Z' },
  boundary: { file: 'ons-lad-december-2021-ew-buc.geojson', bytes: 684711, sha256: '192749be043f56da246c5266f40e9c284c4070d18dd3161cc41ea5c20eb3d92c', retrievedAt: '2026-10-02T16:34:43.487Z' },
  croatia: { file: 'croatia-2021-municipalities.xlsx', bytes: 18279747, sha256: 'c2b1cff240a19b5bfbf6dcb5e919a264284dfa444a326adae5517bf39b6d7d42', retrievedAt: '2026-10-02T16:33:55.597Z', lastModifiedAt: '2025-06-13T09:04:57Z' },
};

/** Read a named classic ZIP entry; reject encryption, ZIP64 and unsupported compression. */
function zipEntry(bytes, wanted) {
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.length - 65557)) throw new Error('ZIP end record unavailable');
  const entries = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  for (let index = 0; index < entries; index++) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP directory');
    const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10);
    const size = bytes.readUInt32LE(offset + 20), uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameSize = bytes.readUInt16LE(offset + 28), extraSize = bytes.readUInt16LE(offset + 30), commentSize = bytes.readUInt16LE(offset + 32);
    const name = bytes.subarray(offset + 46, offset + 46 + nameSize).toString('utf8');
    if (name === wanted) {
      if (flags & 1 || size === 0xffffffff || uncompressedSize === 0xffffffff) throw new Error('Unsupported encrypted/ZIP64 source');
      const local = bytes.readUInt32LE(offset + 42);
      if (bytes.readUInt32LE(local) !== 0x04034b50) throw new Error('Invalid ZIP local entry');
      const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
      const compressed = bytes.subarray(start, start + size);
      const result = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
      if (!result || result.length !== uncompressedSize) throw new Error('Unsupported/corrupt ZIP entry');
      return result;
    }
    offset += 46 + nameSize + extraSize + commentSize;
  }
  throw new Error(`ZIP entry unavailable: ${wanted}`);
}

const decodeXml = text => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
  if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
  if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity] ?? whole;
});
const xmlAttribute = (attributes, name) => decodeXml(new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1] ?? '');
function nationalCroatiaExtract(bytes) {
  const xml = name => zipEntry(bytes, name).toString('utf8');
  const strings = [...xml('xl/sharedStrings.xml').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)]
    .map(item => [...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(text => decodeXml(text[1])).join(''));
  const workbook = xml('xl/workbook.xml'), relationships = xml('xl/_rels/workbook.xml.rels');
  const readRow = (sheetXml, number) => {
    const row = new RegExp(`<row\\b[^>]*\\br="${number}"[^>]*>([\\s\\S]*?)<\\/row>`).exec(sheetXml)?.[1];
    if (!row) throw new Error(`Croatia original row ${number} unavailable`);
    return Object.fromEntries([...row.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map(cell => {
      const reference = xmlAttribute(cell[1], 'r');
      const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cell[2] ?? '')?.[1] ?? '';
      return [reference.replace(/\d+$/, ''), xmlAttribute(cell[1], 't') === 's' ? strings[Number(value)] : decodeXml(value)];
    }));
  };
  const sheets = ['1.', '2.'].map(name => {
    const sheet = [...workbook.matchAll(/<sheet\b([^>]*)\/?\s*>/g)].find(item => xmlAttribute(item[1], 'name') === name);
    if (!sheet) throw new Error('Croatia culture sheet unavailable');
    const relationId = xmlAttribute(sheet[1], 'r:id');
    const relation = [...relationships.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].find(item => xmlAttribute(item[1], 'Id') === relationId);
    const sourceEntry = `xl/${xmlAttribute(relation?.[1] ?? '', 'Target')}`;
    const sheetXml = xml(sourceEntry);
    const header = readRow(sheetXml, 8), national = readRow(sheetXml, 9);
    if (national.A !== 'Republika Hrvatska' || national.C !== 'Republic of Croatia' || national.F !== '3871833' || national.E) throw new Error('Croatia row is not the explicitly published national total');
    return { name, sourceEntry, title: readRow(sheetXml, 3).A, headerRow: 8, nationalRow: 9, header, national };
  });
  return {
    sourceURL: 'https://podaci.dzs.hr/media/td3jvrbu/popis_2021-stanovnistvo_po_gradovima_opcinama.xlsx',
    censusDate: '2021-08-31', lastModifiedAt: sourceLedger.croatia.lastModifiedAt,
    sheets, notes: strings.filter(text => /^(The 2021 Census data on ethnicity|The 2021 Census data on religion|The religion for which the person declared)/.test(text) || /^1\)/.test(text) && /96[.,]47/.test(text)),
  };
}

/** RFC4180 quoting, including escaped quotes and quoted line breaks. */
export function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(value); value = '';
      if (char !== ',') {
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
        if (char === '\r' && text[index + 1] === '\n') index++;
      }
    } else value += char;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (value || row.length) { row.push(value); rows.push(row); }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
}

if (!outputArgument) await fs.mkdir(canonical, { recursive: true });
await fs.mkdir(output, { recursive: true });
if (cache) {
  for (const topicId of ['ts021', 'ts030']) {
    const ledger = sourceLedger[topicId];
    const bytes = await fs.readFile(path.join(cache, ledger.file));
    if (sha(bytes) !== ledger.sha256 || bytes.length !== ledger.bytes) throw new Error(`Unexpected original source: ${ledger.file}`);
    for (const geography of ['ltla', 'ctry']) {
      const file = `census2021-${topicId}-${geography}.csv`;
      await fs.writeFile(path.join(canonical, file), zipEntry(bytes, file));
    }
    await fs.writeFile(path.join(canonical, `${topicId}-source-metadata.txt`), zipEntry(bytes, `metadata/${topicId}-2021-1.txt`));
  }
  const boundary = await fs.readFile(path.join(cache, sourceLedger.boundary.file));
  if (sha(boundary) !== sourceLedger.boundary.sha256) throw new Error('Unexpected official boundary source');
  await fs.writeFile(path.join(canonical, 'england-wales-lad2021-source.geojson'), boundary);
  const croatia = await fs.readFile(path.join(cache, sourceLedger.croatia.file));
  if (sha(croatia) !== sourceLedger.croatia.sha256 || croatia.length !== sourceLedger.croatia.bytes) throw new Error('Unexpected original Croatian census source');
  await fs.writeFile(path.join(canonical, 'croatia-national-2021-source.json'), `${JSON.stringify(nationalCroatiaExtract(croatia), null, 2)}\n`);
}

const sourceBoundary = JSON.parse(await fs.readFile(path.join(canonical, 'england-wales-lad2021-source.geojson'), 'utf8'));
if (sourceBoundary.type !== 'FeatureCollection' || sourceBoundary.features.length !== 331) throw new Error('Expected 331 official England/Wales LAD2021 polygons');
const boundaryCodes = sourceBoundary.features.map(feature => feature.properties.LAD21CD).sort();
if (new Set(boundaryCodes).size !== 331 || !boundaryCodes.every(code => /^(E|W)\d{8}$/.test(code))) throw new Error('Invalid/duplicate official boundary code');
const geometry = {
  type: 'FeatureCollection',
  features: sourceBoundary.features.map(feature => ({
    type: 'Feature', id: feature.properties.LAD21CD,
    properties: { code: feature.properties.LAD21CD, name: feature.properties.LAD21NM, nameWelsh: feature.properties.LAD21NMW || null, caseId: 'england-wales-2021' },
    geometry: feature.geometry,
  })).sort((left, right) => left.id.localeCompare(right.id)),
};

async function buildTopic(id, title, titleJa) {
  const csv = parseCsv(await fs.readFile(path.join(canonical, `census2021-${id}-ltla.csv`), 'utf8'));
  const countryCsv = parseCsv(await fs.readFile(path.join(canonical, `census2021-${id}-ctry.csv`), 'utf8'));
  const header = csv.shift(), countryHeader = countryCsv.shift();
  if (JSON.stringify(header) !== JSON.stringify(countryHeader)) throw new Error(`${id}: national and local schemas differ`);
  if (header.slice(0, 3).join('|') !== 'date|geography|geography code' || !header[3].endsWith('Total: All usual residents')) throw new Error(`${id}: unexpected CSV schema`);
  const categories = header.slice(4).map((column, index) => {
    const label = column.replace(`${title}: `, '');
    const parts = label.split(': ');
    const aggregate = id === 'ts021' && parts.length === 1;
    return { id: `${id}-${String(index + 1).padStart(2, '0')}`, sourceColumn: column, label, level: aggregate ? 'aggregate' : 'detail', parentId: null,
      responseKind: label === 'No religion' ? 'no-religion' : label === 'Not answered' ? 'not-answered' : 'declared' };
  });
  if (id === 'ts021') {
    for (const category of categories.filter(category => category.level === 'detail')) {
      const parentLabel = category.label.split(': ')[0];
      category.parentId = categories.find(parent => parent.level === 'aggregate' && parent.label === parentLabel)?.id ?? null;
      if (!category.parentId) throw new Error('Unmatched original ethnic hierarchy');
    }
  }
  const detailIndices = categories.flatMap((category, index) => category.level === 'detail' ? [index] : []);
  const readRow = row => {
    if (row.length !== header.length || row[0] !== '2021') throw new Error(`${id}: unexpected CSV row/year`);
    const values = row.slice(3).map(value => {
      if (!/^\d+$/.test(value)) throw new Error(`${id}: missing/non-integer count`);
      return Number(value);
    });
    const [denominator, ...counts] = values;
    if (denominator <= 0) throw new Error(`${id}: empty population denominator`);
    return { code: row[2], name: row[1], denominator, counts, detailSumDifference: detailIndices.reduce((sum, index) => sum + counts[index], 0) - denominator };
  };
  const areas = csv.map(readRow).sort((left, right) => left.code.localeCompare(right.code));
  if (JSON.stringify(areas.map(area => area.code)) !== JSON.stringify(boundaryCodes)) throw new Error(`${id}: census/boundary code join is not exact`);
  const countries = countryCsv.map(readRow).filter(area => area.code === 'E92000001' || area.code === 'W92000004');
  if (countries.length !== 2) throw new Error(`${id}: England/Wales country totals unavailable`);
  return {
    id, kind: id === 'ts021' ? 'ethnicity' : 'religion', title, titleJa, censusDate: '2021-03-21', year: 2021, unit: 'person', sourceVersion: 'Nomis bulk metadata version 1', issuedAt: '2022-11-29',
    sourceURL: `https://www.nomisweb.co.uk/output/census/2021/census2021-${id}.zip`,
    documentationURL: `https://www.ons.gov.uk/datasets/${id.toUpperCase()}/editions/2021/versions/1`,
    denominatorColumn: header[3], denominatorDefinition: 'All usual residents, using the total published separately in this topic table.',
    categories, partitionCategoryIds: detailIndices.map(index => categories[index].id), areas, countries,
    definition: id === 'ts021'
      ? 'Self-identified ethnic group; 19 response categories. Five published aggregates overlap their detailed categories and must not be added to them.'
      : 'Religious affiliation, whether or not practised or believed. The question was voluntary. No religion and Not answered are separate responses.',
    disclosureControl: 'Targeted record swapping and cell key perturbation. Totals can differ between topics or from category sums; published counts are preserved without adjustment.',
  };
}

const topics = await Promise.all([buildTopic('ts021', 'Ethnic group', '民族的帰属（自己申告）'), buildTopic('ts030', 'Religion', '宗教的帰属（自己申告）')]);
const censusCase = {
  id: 'england-wales-2021', title: 'England and Wales, Census 2021', titleJa: 'イングランド・ウェールズの国勢調査事例',
  coverage: 'England and Wales only; 309 English and 22 Welsh lower-tier local authorities. Scotland and Northern Ireland are excluded.',
  coverageJa: '対象はイングランドとウェールズの331地域です。ヨーロッパ全域や英国全土の分布を表すものではありません。',
  countryCodes: ['E92000001', 'W92000004'], grain: 'LAD', geography: 'Lower-tier local authorities (LAD2021)', geographyCount: 331,
  boundaryEdition: 'December 2021', boundaryGeneralisation: 'ONS BUC: ultra generalised at 500 m, clipped to Mean High Water coastline.',
  sourceCRS: 'EPSG:27700', assetCRS: 'EPSG:4326', boundaryURL,
  geometryURL: '/assets/atlas/europe/population-cases-v1/england-wales-lad2021.geojson',
  licence: { name: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', boundaryPolicyURL: 'https://www.ons.gov.uk/methodology/geography/licences' },
  attribution: ['Source: Office for National Statistics licensed under the Open Government Licence v.3.0', 'Contains OS data © Crown copyright and database right 2026'],
  adaptations: 'Selected the original Nomis lower-tier/country CSV tables; retained all count categories and their original labels. Joined official ONS LAD21CD codes exactly. Official service projected boundaries to WGS84; output feature properties renamed. No geometry inference, category harmonisation, count correction or percentage rounding.',
  topics,
};
const croatiaExtract = JSON.parse(await fs.readFile(path.join(canonical, 'croatia-national-2021-source.json'), 'utf8'));
const columnNumber = column => [...column].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0);
const croatiaTopics = croatiaExtract.sheets.map((sheet, index) => {
  const id = index === 0 ? 'hr-ethnicity' : 'hr-religion';
  const countColumns = Object.keys(sheet.header).filter(column => columnNumber(column) >= 8 && columnNumber(column) % 2 === 0);
  const categories = countColumns.map(column => {
    const sourceLabel = sheet.header[column];
    const label = sourceLabel.split('\n').at(-1).trim();
    return { id: `${id}-${column}`, sourceColumn: `${sheet.name}!${column}8`, sourceLabel, label, level: 'detail', parentId: null,
      responseKind: label === 'Not religious and atheists' ? 'no-religion' : label === 'Not declared' ? 'not-declared' : label === 'Unknown' ? 'unknown' : 'declared' };
  });
  const counts = countColumns.map(column => {
    const value = sheet.national[column];
    if (!/^\d+$/.test(value)) throw new Error(`Croatia missing/non-integer national count: ${column}`);
    return Number(value);
  });
  const denominator = Number(sheet.national.F);
  const area = { code: 'HRV', name: sheet.national.C, denominator, counts, detailSumDifference: counts.reduce((sum, count) => sum + count, 0) - denominator };
  return {
    id, kind: index === 0 ? 'ethnicity' : 'religion', title: sheet.title, titleJa: index === 0 ? '民族的帰属（自己申告）' : '宗教的帰属（自己申告）',
    censusDate: '2021-08-31', year: 2021, unit: 'person', sourceVersion: '2021 census workbook; official HTTP Last-Modified 2025-06-13', lastModifiedAt: croatiaExtract.lastModifiedAt,
    sourceURL: croatiaExtract.sourceURL, documentationURL: 'https://podaci.dzs.hr/en/statistics/population/census/',
    denominatorColumn: `${sheet.name}!F9 (Ukupno / Total)`, denominatorDefinition: 'Explicitly published Republic of Croatia national row, all usual residents; not reconstructed from county counts.',
    categories, partitionCategoryIds: categories.map(category => category.id), areas: [area], countries: [area], sourceSheet: sheet.name, sourceRow: 9,
    definition: index === 0 ? 'Self-declared ethnicity; original Croatian categories, including regional/religious affiliation, unclassified, not declared and unknown responses. Not harmonised with England/Wales categories.' : 'Self-declared religion; Catholics, Orthodox, Protestants and Other Christians remain the original separate categories. Agnostics/sceptics, not religious/atheists, not declared and unknown remain separate.',
    disclosureControl: 'Published national counts are preserved without adjustment. No county totals or regional distribution are inferred.',
    notes: croatiaExtract.notes,
  };
});
const europeCountriesPath = path.join(root, 'src/data/atlas/europe-countries.json');
const europeCountriesBytes = await fs.readFile(europeCountriesPath);
const croatiaOutline = JSON.parse(europeCountriesBytes).features.filter(feature => feature.properties.code === 'HRV');
if (croatiaOutline.length !== 1) throw new Error('Existing Natural Earth HRV national outline unavailable');
const croatiaGeometryText = `${JSON.stringify({ type: 'FeatureCollection', features: croatiaOutline.map(feature => ({ type: 'Feature', id: 'HRV', properties: { code: 'HRV', name: 'Croatia', caseId: 'croatia-national-2021', grain: 'national', displayOnly: true }, geometry: feature.geometry })) })}\n`;
const croatiaCase = {
  id: 'croatia-national-2021', title: 'Republic of Croatia, Census 2021 (national totals)', titleJa: 'クロアチアの国勢調査事例（全国値）',
  coverage: 'Republic of Croatia national counts only. No county distribution; not comparable as geographic units with England/Wales LAD areas.',
  coverageJa: 'クロアチアは全国値の1地域です。県別分布は示しません。イングランド・ウェールズの行政区と同じ地域単位として比較しません。',
  countryCodes: ['HRV'], grain: 'national', geography: 'Republic of Croatia: explicitly published national total row', geographyCount: 1,
  boundaryEdition: 'Existing Natural Earth national outline: display only, not a Census 2021 administrative boundary',
  boundaryGeneralisation: 'Unchanged HRV geometry from the existing Europe Natural Earth basemap; does not delineate census counties.',
  sourceCRS: 'EPSG:4326', assetCRS: 'EPSG:4326', boundaryURL: 'https://www.naturalearthdata.com/',
  geometryURL: '/assets/atlas/europe/population-cases-v1/croatia-national-outline.geojson',
  licence: { name: 'Croatian Open Licence (census); Natural Earth public domain (display outline)', url: 'https://dzs.gov.hr/UserDocsImages/dokumenti/Dokumenti/Open%20Licence.pdf?vel=244016', boundaryPolicyURL: 'https://www.naturalearthdata.com/about/terms-of-use/' },
  attribution: ['Source: Croatian Bureau of Statistics, Census 2021; source file last updated 13 June 2025. Contains public sector information licensed under the Open Data Licence. Adapted: explicit national rows and original count columns selected; Japanese explanatory headings added; existing Natural Earth country outline selected for display only, with coordinates unchanged.', 'National outline: Natural Earth, public domain; selected from the existing Europe basemap.'],
  adaptations: 'Selected the explicit national row9 from ethnicity sheet1 and religion sheet2; preserved original bilingual response labels and counts. No county summation or cross-country category harmonisation. National outline is display-only and its coordinates are unchanged.',
  topics: croatiaTopics,
};
const packageData = { schemaVersion: 1, scope: 'Selected official census cases, not Europe-wide cultural coverage; LAD and national grains differ', cases: [censusCase, croatiaCase] };
const dataText = `${JSON.stringify(packageData)}\n`;
const geometryText = `${JSON.stringify(geometry)}\n`;
await fs.writeFile(path.join(output, 'cases.json'), dataText);
await fs.writeFile(path.join(output, 'england-wales-lad2021.geojson'), geometryText);
await fs.writeFile(path.join(output, 'croatia-national-outline.geojson'), croatiaGeometryText);
const selectedFiles = ['census2021-ts021-ltla.csv', 'census2021-ts021-ctry.csv', 'census2021-ts030-ltla.csv', 'census2021-ts030-ctry.csv', 'ts021-source-metadata.txt', 'ts030-source-metadata.txt', 'england-wales-lad2021-source.geojson', 'croatia-national-2021-source.json'];
const extracts = [];
for (const file of selectedFiles) {
  const bytes = await fs.readFile(path.join(canonical, file));
  extracts.push({ file, bytes: bytes.length, sha256: sha(bytes) });
}
const manifest = {
  schemaVersion: 1, preparedAt: '2026-10-02', scope: packageData.scope, caseIds: packageData.cases.map(item => item.id),
  sources: { ...Object.fromEntries(Object.entries(sourceLedger).map(([id, value]) => [id, { ...value, url: id === 'boundary' ? boundaryURL : id === 'croatia' ? croatiaExtract.sourceURL : `https://www.nomisweb.co.uk/output/census/2021/${value.file}` }])), croatiaOutline: { file: 'src/data/atlas/europe-countries.json', bytes: europeCountriesBytes.length, sha256: sha(europeCountriesBytes), publisher: 'Natural Earth', licence: 'Public domain', method: 'Existing HRV national outline, unchanged coordinates; display only' } },
  selectedExtracts: extracts,
  assets: [
    { file: 'cases.json', bytes: Buffer.byteLength(dataText), sha256: sha(dataText) },
    { file: 'england-wales-lad2021.geojson', bytes: Buffer.byteLength(geometryText), sha256: sha(geometryText) },
    { file: 'croatia-national-outline.geojson', bytes: Buffer.byteLength(croatiaGeometryText), sha256: sha(croatiaGeometryText) },
  ],
  checks: { exactCensusBoundaryJoin: true, areaCount: 331, englandAreas: 309, walesAreas: 22, ethnicDetailCategories: topics[0].partitionCategoryIds.length, religiousCategories: topics[1].partitionCategoryIds.length, preservesTopicSpecificDenominators: true, croatiaNationalRowsOnly: true, croatiaDenominator: 3871833, croatiaEthnicityCategories: croatiaTopics[0].categories.length, croatiaReligionCategories: croatiaTopics[1].categories.length, mixedGrainsNeverHarmonised: true },
};
await fs.writeFile(manifestOutput, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ cases: manifest.caseIds, checks: manifest.checks, assets: manifest.assets }, null, 2));
