import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run with two freshly retrieved official SMN TXT paths. Full station records
// remain outside the repository; only the selected factual rows are retained.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const sourceDir = dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const plain = text => text.normalize('NFD').replace(/\p{M}/gu, '');
const definitions = [
  {
    id: 'mexico-city-tacubaya', name: 'メキシコシティ（タクバヤ）', stationId: '09048',
    sourceUrl: 'https://smn.conagua.gob.mx/tools/RESOURCES/Normales_Climatologicas/Normales9120/df/nor9120_09048.txt',
    catalogueUrl: 'https://smn.conagua.gob.mx/tools/RESOURCES/Normales_Climatologicas/catalogo/cat_df.html',
    scopeNoteJa: 'メキシコシティのタクバヤ中央観測所（09048）の平年値。空港や市域全体の平均ではありません。気温・降水量とも全月30年分のデータがあります。',
  },
  {
    id: 'culiacan-dge', name: 'クリアカン（DGE）', stationId: '25015',
    sourceUrl: 'https://smn.conagua.gob.mx/tools/RESOURCES/Normales_Climatologicas/Normales9120/sin/nor9120_25015.txt',
    catalogueUrl: 'https://smn.conagua.gob.mx/tools/RESOURCES/Normales_Climatologicas/catalogo/cat_sin.html',
    scopeNoteJa: 'シナロア州クリアカンのDGE観測所（25015）の平年値。OBS観測所（25014）や州全体の平均ではありません。気温・降水量とも10月は29年分、ほかの月は30年分のデータがあります。',
  },
];

const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error('Usage: node prepare.mjs <official 09048 TXT> <official 25015 TXT>');
const stations = [], sourceFiles = [];
for (let index = 0; index < definitions.length; index++) {
  const definition = definitions[index];
  const bytes = await readFile(paths[index]);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const lines = text.split(/\r?\n/);
  const field = name => {
    const line = lines.find(line => plain(line).trimStart().startsWith(`${name} `));
    if (!line) throw new Error(`Missing station field ${name}`);
    return line.slice(line.indexOf(':') + 1).trim();
  };
  const number = name => Number.parseFloat(field(name));
  if (String(number('ESTACION')).padStart(5, '0') !== definition.stationId) throw new Error('Station identity differs from requested record');
  if (!text.includes('1991-2020')) throw new Error('Unexpected normal period');
  const selections = [];
  const series = name => {
    const start = lines.findIndex(line => plain(line).trim() === name);
    if (start < 0) throw new Error(`Missing series ${name}`);
    let end = start + 1;
    while (end < lines.length && lines[end].trim()) end++;
    const block = lines.slice(start, end);
    const normal = block.findIndex(line => line.startsWith('NORMAL\t'));
    const years = block.findIndex(line => plain(line).startsWith('ANOS CON DATOS\t'));
    if (normal < 0 || years < 0) throw new Error(`Incomplete series ${name}`);
    const values = block[normal].trim().split(/\t+/).slice(1).map(Number);
    const counts = block[years].trim().split(/\t+/).slice(1).map(Number);
    if (values.length !== 13 || counts.length !== 12 || [...values, ...counts].some(value => !Number.isFinite(value))) throw new Error(`Invalid monthly series ${name}`);
    selections.push({ series: name, headingLine: start + 1, monthsLine: start + 2, normalLine: start + normal + 1, yearsLine: start + years + 1 });
    return { monthly: values.slice(0, 12), annual: values[12], years: counts, selectedLines: [block[0], block[1], block[normal], block[years]] };
  };
  const temperature = series('TEMPERATURA MEDIA');
  const precipitation = series('PRECIPITACION');
  const altitudeLine = lines.findIndex(line => plain(line).trimStart().startsWith('ALTITUD '));
  const selected = `${lines.slice(0, altitudeLine + 1).join('\n')}\n\n${temperature.selectedLines.join('\n')}\n\n${precipitation.selectedLines.join('\n')}\n`;
  const selectedBytes = Buffer.from(selected, 'utf8');
  const selectedFile = `nor9120_${definition.stationId}-selected.txt`;
  await mkdir(sourceDir, { recursive: true });
  await writeFile(resolve(sourceDir, selectedFile), selectedBytes);
  const emission = field('EMISION').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!emission) throw new Error('Unexpected source emission date');
  stations.push({
    ...definition,
    stationName: field('NOMBRE'), state: field('ESTADO'), municipality: field('MUNICIPIO'),
    operatingStatus: field('SITUACION'), administrativeUnit: field('U. ADMNVA.'),
    wmoId: field('CVE-OMM') || null,
    latitude: number('LATITUD'), longitude: number('LONGITUD'), altitudeM: number('ALTITUD'),
    coordinates: [number('LONGITUD'), number('LATITUD')], elevationM: number('ALTITUD'),
    period: '1991–2020', emittedAt: `${emission[3]}-${emission[2]}-${emission[1]}`, retrievedAt: '2026-10-05',
    sourceSha256: hash(bytes), selectedSourceFile: `data-source/atlas/mexico/climate-normals/${selectedFile}`,
    selectedSourceSha256: hash(selectedBytes),
    temperatureC: temperature.monthly, precipitationMm: precipitation.monthly,
    temperatureYears: temperature.years, precipitationYears: precipitation.years,
    annualTemperatureC: temperature.annual, annualPrecipitationMm: precipitation.annual,
  });
  sourceFiles.push({
    stationId: definition.stationId, url: definition.sourceUrl, retrievedAt: '2026-10-05', encoding: 'UTF-8',
    fullDownload: { bytes: bytes.length, sha256: hash(bytes), retainedInRepository: false },
    selectedFile, selectedBytes: selectedBytes.length, selectedSha256: hash(selectedBytes),
    originalMetadataLines: [1, altitudeLine + 1], selectedRows: selections,
  });
}

const source = {
  publisher: 'CONAGUA / Servicio Meteorológico Nacional (SMN)',
  product: 'Normales climatológicas 1991–2020',
  url: 'https://smn.conagua.gob.mx/es/climatologia/informacion-climatologica/normales-climatologicas-por-estado',
  retrievedAt: '2026-10-05',
  attribution: '出典：CONAGUA / Servicio Meteorológico Nacional（SMN）、1991–2020年の観測所別平年値。月平均気温・月降水量を抽出。',
  reuse: {
    explicitDatasetLicense: null,
    basis: 'Attributed extraction of selected factual statistics; no open license for the full SMN database asserted.',
    evidenceFile: 'data-source/atlas/mexico/climate-normals/reuse-evidence.json',
    fullDatabaseRedistribution: false,
  },
};
await writeFile(resolve(root, 'src/data/atlas/mexico/climate-normals.json'), JSON.stringify({ schemaVersion: 1, period: '1991–2020', months: Array.from({ length: 12 }, (_, i) => i + 1), units: { temperatureC: '°C', precipitationMm: 'mm' }, source, stations }, null, 2) + '\n');
await writeFile(resolve(sourceDir, 'provenance.json'), JSON.stringify({ schemaVersion: 1, source, sourceFiles, processing: { script: 'data-source/atlas/mexico/climate-normals/prepare.mjs', scriptSha256: hash(await readFile(fileURLToPath(import.meta.url))), selection: 'Station metadata, TEMPERATURA MEDIA NORMAL, PRECIPITACION NORMAL, and their AÑOS CON DATOS; monthly columns January to December unchanged, official annual fields unchanged.', transformations: ['Parsed numeric text to JSON numbers.', 'Padded SMN station 9048 to the five-digit key 09048.', 'Changed the period separator to an en dash for display.', 'Added Japanese station labels and scope notes.'], calculatedAnnualValues: false, spatialInterpolation: false } }, null, 2) + '\n');
console.log(`Verified and extracted ${stations.length} SMN station records.`);
