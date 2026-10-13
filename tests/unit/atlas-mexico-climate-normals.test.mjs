import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const json = path => JSON.parse(read(path).toString('utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const data = json('src/data/atlas/mexico/climate-normals.json');
const evidenceRoot = 'data-source/atlas/mexico/climate-normals/';
const provenance = json(`${evidenceRoot}provenance.json`);
const reuse = json(`${evidenceRoot}reuse-evidence.json`);
const station = id => data.stations.find(item => item.stationId === id);
const ascii = text => text.normalize('NFD').replace(/\p{M}/gu, '');

// Read delivered source columns independently of the preparation script.
function sourceSeries(text, heading) {
  const start = ascii(text).indexOf(`${heading}\n`);
  assert.notEqual(start, -1, heading);
  const rows = text.slice(start).split('\n').slice(0, 4);
  assert.deepEqual(rows[1].trim().split(/\s+/).slice(1), ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', 'ANUAL']);
  const normals = rows[2].trim().split(/\s+/);
  assert.equal(normals.shift(), 'NORMAL');
  assert.equal(normals.length, 13);
  const years = ascii(rows[3]).trim().split(/\s+/);
  assert.deepEqual(years.splice(0, 3), ['ANOS', 'CON', 'DATOS']);
  assert.equal(years.length, 12);
  return { monthly: normals.slice(0, 12).map(Number), annual: Number(normals[12]), years: years.map(Number) };
}

test('Mexico uses four named 1991–2020 station records and twelve monthly observations', () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.period, '1991–2020');
  assert.deepEqual(data.months, Array.from({ length: 12 }, (_, i) => i + 1));
  assert.deepEqual(data.units, { temperatureC: '°C', precipitationMm: 'mm' });
  assert.deepEqual(data.stations.map(item => item.stationId), ['09048', '25015', '08040', '27054']);
  assert.equal(new Set(data.stations.map(item => item.id)).size, 4);
  for (const item of data.stations) {
    assert.equal(item.period, data.period);
    assert.equal(item.emittedAt, item.stationId === '08040' ? '2026-10-09' : '2026-10-02');
    assert.equal(item.retrievedAt, item.selectedSourceFile ? '2026-10-05' : null);
    assert.match(item.sourceUrl, /^https:\/\/smn\.conagua\.gob\.mx\/tools\/RESOURCES\/Normales_Climatologicas\/Normales9120\/(df|sin|chih|tab)\/nor9120_\d{5}\.txt$/);
    for (const key of ['temperatureC', 'precipitationMm', 'temperatureYears', 'precipitationYears']) {
      assert.equal(item[key].length, 12, `${item.stationId} ${key}`);
      assert.ok(item[key].every(Number.isFinite));
    }
    assert.ok(item.precipitationMm.every(value => value >= 0));
    assert.ok(item.temperatureYears.every(value => Number.isInteger(value) && value > 0 && value <= 30));
    assert.ok(item.precipitationYears.every(value => Number.isInteger(value) && value > 0 && value <= 30));
  }
});

test('Every delivered climate value and year count equals the retained official source column', () => {
  for (const item of data.stations.filter(item => item.selectedSourceFile)) {
    const sourceText = read(item.selectedSourceFile).toString('utf8');
    const temperature = sourceSeries(sourceText, 'TEMPERATURA MEDIA');
    const precipitation = sourceSeries(sourceText, 'PRECIPITACION');
    assert.deepEqual(item.temperatureC, temperature.monthly);
    assert.deepEqual(item.precipitationMm, precipitation.monthly);
    assert.deepEqual(item.temperatureYears, temperature.years);
    assert.deepEqual(item.precipitationYears, precipitation.years);
    assert.equal(item.annualTemperatureC, temperature.annual);
    assert.equal(item.annualPrecipitationMm, precipitation.annual);
    assert.match(sourceText, new RegExp(`ESTACI[OÓ]N\\s*:\\s*${Number(item.stationId)}\\s`));
    assert.ok(sourceText.includes(item.stationName));
    assert.ok(sourceText.includes(String(item.latitude)));
    assert.ok(sourceText.includes(String(item.longitude)));
    assert.ok(sourceText.includes(`${item.altitudeM} msnm`));
  }
});

test('Capital station is Tacubaya Central OBS, and agriculture comparison is Culiacán DGE', () => {
  const capital = station('09048'), agriculture = station('25015');
  assert.equal(capital.id, 'mexico-city-tacubaya');
  assert.equal(capital.stationName, 'TACUBAYA CENTRAL (OBS)');
  assert.equal(capital.wmoId, '76680');
  assert.equal(capital.latitude, 19.40361111);
  assert.equal(capital.longitude, -99.19611111);
  assert.equal(capital.altitudeM, 2308.6);
  assert.equal(agriculture.id, 'culiacan-dge');
  assert.equal(agriculture.stationName, 'CULIACAN (DGE)');
  assert.equal(agriculture.wmoId, null, 'The DGE record supplies no WMO identifier');
  assert.equal(agriculture.latitude, 24.806146);
  assert.equal(agriculture.longitude, -107.407188);
  assert.equal(agriculture.altitudeM, 60);
  for (const item of data.stations) {
    assert.deepEqual(item.coordinates, [item.longitude, item.latitude]);
    assert.equal(item.elevationM, item.altitudeM);
    assert.match(item.scopeNoteJa, /平均ではありません/);
  }
  assert.deepEqual(capital.temperatureC, [15.3, 16.9, 18.7, 20.3, 20.5, 19.8, 18.8, 18.9, 18.4, 17.6, 16.4, 15.4]);
  assert.deepEqual(capital.precipitationMm, [11.9, 5.7, 11.8, 24.2, 59.4, 132.5, 174, 175.6, 158.1, 71.3, 17.4, 5]);
  assert.deepEqual(agriculture.temperatureC, [20.4, 21, 22.6, 24.9, 27.9, 30.9, 30.8, 30.2, 29.8, 28.9, 24.8, 20.8]);
  assert.deepEqual(agriculture.precipitationMm, [13.8, 14.4, 2.7, 1.3, 1.1, 18, 151.3, 216.1, 187.5, 42.8, 22.3, 15.9]);
});

test('Culiacán October available-year counts remain distinct from a complete 30-year series', () => {
  const thirtyYears = Array(12).fill(30);
  const culiacanYears = [...thirtyYears];
  culiacanYears[9] = 29;
  assert.deepEqual(station('09048').temperatureYears, thirtyYears);
  assert.deepEqual(station('09048').precipitationYears, thirtyYears);
  assert.deepEqual(station('25015').temperatureYears, culiacanYears);
  assert.deepEqual(station('25015').precipitationYears, culiacanYears);
  assert.match(station('25015').scopeNoteJa, /10月は29年分/);
  assert.equal(station('09048').annualTemperatureC, 18.1);
  assert.equal(station('09048').annualPrecipitationMm, 846.9);
  assert.equal(station('25015').annualTemperatureC, 26.1);
  assert.equal(station('25015').annualPrecipitationMm, 687.2);
  assert.equal(provenance.processing.calculatedAnnualValues, false);
  assert.equal(provenance.processing.spatialInterpolation, false);
});

test('Parent-reviewed northern and southeastern SMN normals retain every reported value and do not claim raw-file hashes', () => {
  const evidence = json(`${evidenceRoot}parent-reviewed-additions.json`);
  assert.equal(evidence.stations.length, 2);
  const chihuahua = station('08040'), villahermosa = station('27054');
  assert.deepEqual(chihuahua.temperatureC, [10.6,13.4,16.7,20.4,24.3,27.3,26.6,25.2,23.2,19.9,14.6,11.2]);
  assert.deepEqual(chihuahua.precipitationMm, [7.8,5.1,6.3,8.5,15.6,37.6,109,94.3,77.9,24.5,12.8,14]);
  assert.deepEqual(chihuahua.temperatureYears, Array(12).fill(30));
  assert.deepEqual(chihuahua.precipitationYears, Array(12).fill(30));
  assert.equal(chihuahua.annualTemperatureC, 19.4);
  assert.equal(chihuahua.annualPrecipitationMm, 413.4);
  assert.deepEqual(villahermosa.temperatureC, [23.9,25,27,29,30.1,29.5,29.3,29.3,28.8,27.5,25.7,24.4]);
  assert.deepEqual(villahermosa.precipitationMm, [159.7,72.1,43.3,42,99.2,182.9,158.3,217.9,305.9,313.3,226.5,132.6]);
  assert.deepEqual(villahermosa.temperatureYears, [29,29,29,29,29,29,29,29,28,28,26,27]);
  assert.deepEqual(villahermosa.precipitationYears, [29,29,29,29,29,27,29,29,27,28,26,26]);
  assert.equal(villahermosa.annualTemperatureC, 27.5);
  assert.equal(villahermosa.annualPrecipitationMm, 1953.7);
  for (const item of [chihuahua,villahermosa]) {
    assert.equal(item.retrievedAt, null);
    assert.equal(item.sourceSha256, null);
    assert.equal(item.selectedSourceFile, null);
    assert.equal(item.selectedSourceSha256, null);
    assert.deepEqual(evidence.stations.find(row => row.stationId === item.stationId), item);
  }
});

test('Selected official evidence and extraction script match their audit hashes', () => {
  const downloads = {
    '09048': { bytes: 2644, sha256: '9da95af1ec7d024c7671ed262efe05df074a83023b9dc5bd83b25bd537ffabd9' },
    '25015': { bytes: 2847, sha256: '2f2a1f1b7c58e6c04917664540bf824e32e83b2796a60c199119cbd22664efeb' },
  };
  assert.deepEqual(provenance.source, data.source);
  assert.equal(hash(read(provenance.processing.script)), provenance.processing.scriptSha256);
  for (const evidence of provenance.sourceFiles) {
    const item = station(evidence.stationId);
    const raw = read(`${evidenceRoot}${evidence.selectedFile}`);
    assert.equal(raw.length, evidence.selectedBytes);
    assert.equal(hash(raw), evidence.selectedSha256);
    assert.equal(hash(raw), item.selectedSourceSha256);
    assert.equal(evidence.fullDownload.bytes, downloads[item.stationId].bytes);
    assert.equal(evidence.fullDownload.sha256, downloads[item.stationId].sha256);
    assert.equal(item.sourceSha256, evidence.fullDownload.sha256);
    assert.equal(evidence.fullDownload.retainedInRepository, false);
    assert.equal(evidence.url, item.sourceUrl);
    assert.equal(evidence.encoding, 'UTF-8');
    assert.deepEqual(evidence.selectedRows.map(row => row.series), ['TEMPERATURA MEDIA', 'PRECIPITACION']);
    for (const row of evidence.selectedRows) {
      assert.ok(row.headingLine < row.monthsLine && row.monthsLine < row.normalLine && row.normalLine < row.yearsLine);
    }
    const text = ascii(raw.toString('utf8'));
    assert.ok(!text.includes('MAXIMA MENSUAL'));
    assert.ok(!text.includes('EVAPORACION'));
  }
});

test('Factual-use evidence preserves attribution and does not assert an unverified open licence', () => {
  assert.match(data.source.publisher, /CONAGUA.*Servicio Meteorológico Nacional/);
  assert.match(data.source.attribution, /CONAGUA.*SMN.*1991–2020/);
  assert.equal(data.source.reuse.explicitDatasetLicense, null);
  assert.equal(data.source.reuse.fullDatabaseRedistribution, false);
  assert.equal(reuse.explicitDatasetLicense, null);
  assert.equal(reuse.primaryStatutorySource.url, 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFDA.pdf');
  assert.equal(reuse.primaryStatutorySource.currentReformDate, '2026-05-14');
  assert.deepEqual(reuse.primaryStatutorySource.verifiedSections.map(item => item.article), ['14 X', '107', '108 and 110']);
  assert.equal(reuse.implementationDecision.fullStationTxtCommitted, false);
  assert.equal(reuse.implementationDecision.fullDatabaseRedistributed, false);
  assert.equal(reuse.implementationDecision.attributionRequiredByProject, true);
});
