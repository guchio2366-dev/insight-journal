import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const readJson = async file => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
const population = await readJson('src/data/atlas/canada/population.json');
const assets = 'public/assets/atlas/canada-demographics-v1/';
const originals = 'data-source/atlas/canada-demographics-v1/';
const selectedIds = {
 ethnicity: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '87'],
 religion: ['2', '3', '19', '20', '21', '22', '23', '24', '25'],
};

// These preserved exports quote every field. Require complete consumption of each
// physical line so embedded commas/escaped quotes cannot silently shift a column.
function parseExport(text) {
 const lines = text.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/);
 const fields = line => {
  const matches = [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)];
  assert.equal(matches.map(match => match[0]).join(''), line, 'Unparsed CSV content');
  return matches.map(match => match[1].replaceAll('""', '"'));
 };
 const headers = fields(lines.shift());
 return {headers, rows: lines.map(line => {
  const values = fields(line);assert.equal(values.length, headers.length);
  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
 })};
}

const datasets = await Promise.all(['ethnicity', 'religion'].map(async topic => {
 const folder = originals + topic + '/', isEthnicity = topic === 'ethnicity';
 const [data, manifest, metadataResponse, rawText, canonicalText, html] = await Promise.all([
  readJson(`src/data/atlas/canada/demographics-${topic}.json`),
  readJson(assets + topic + '-manifest.json'),
  readJson(folder + (isEthnicity ? 'cube-metadata-original.json' : 'wds-metadata-98100353.json')),
  readFile(folder + (isEthnicity ? 'selected-original.csv' : 'selected-counts-9810035302.csv'), 'utf8'),
  readFile(assets + topic + '-selected.csv', 'utf8'),
  readFile(folder + (isEthnicity ? 'drummondville-display-original.html' : 'table-9810035302.html'), 'utf8'),
 ]);
 const tableMatch = html.match(/prepareTable\((.*)\);/);
 assert.ok(tableMatch, 'Preserved official table response exists');
 const metadata = metadataResponse[0].object;
 return {topic, folder, data, manifest, metadata, metadataResponse, raw: parseExport(rawText),
  canonical: parseExport(canonicalText), table: JSON.parse(tableMatch[1]),
  records: [data.national, ...data.cmas],
  attributes: new Map(metadata.geoAttribute.map(attribute => [`${attribute.memberId}:${attribute.title}`, attribute.valueEn])),
 };
}));

const members = (snapshot, dimension) => snapshot.metadata.dimension.find(item => item.dimensionPositionId === dimension).member;
const byCoordinate = rows => new Map(rows.map(row => [row.COORDINATE, row]));
const valueOf = row => row.VALUE === '' ? null : Number(row.VALUE);
const recoveryCoordinates = snapshot => snapshot.topic === 'ethnicity'
 ? [snapshot.manifest.zeroCellRecovery.coordinate]
 : snapshot.manifest.explicitZeroEvidence.map(item => item.coordinate);

test('The two snapshots retain their own official 2021 long-form tables and denominators', () => {
 for (const snapshot of datasets) {
  const {topic, data, manifest, metadata, metadataResponse} = snapshot;
  assert.equal(metadataResponse[0].status, 'SUCCESS');
  assert.equal(data.topic, topic);assert.equal(data.year, 2021);
  assert.deepEqual(data.source, manifest.source);
  assert.equal(manifest.version, 'canada-demographics-v1');
  assert.equal(metadata.productId, topic === 'ethnicity' ? '98100324' : '98100353');
  assert.equal(data.source.tableId, topic === 'ethnicity' ? '98-10-0324-01' : '98-10-0353-02');
  assert.equal(new URL(data.source.url).searchParams.get('pid'), topic === 'ethnicity' ? '9810032401' : '9810035302');
  assert.equal(data.source.releaseDate, metadata.issueDate);
  assert.match(data.source.universe, /Persons in private households in occupied private dwellings/);
  assert.match(data.source.sample, /25%/);
  assert.match(data.source.attribution, /This does not constitute an endorsement by Statistics Canada/);
 }
 const [ethnicity, religion] = datasets.map(snapshot => snapshot.data);
 assert.equal(ethnicity.national.denominator.value, 36328475);
 assert.equal(religion.national.denominator.value, 36328480);
 assert.equal(ethnicity.cmas.find(row => row.id === '505').denominator.value, 1464495);
 assert.equal(religion.cmas.find(row => row.id === '505').denominator.value, 1464500);
 const wholePopulation = population.national.find(row => row.id === 'Canada').population[2021].value;
 assert.notEqual(ethnicity.national.denominator.value, religion.national.denominator.value);
 for (const data of [ethnicity, religion]) assert.notEqual(data.national.denominator.value, wholePopulation);
});

test('Canada and exactly the existing 41 whole CMAs join by official DGUID, including one complete Ottawa–Gatineau', () => {
 const expected = new Map(population.cmas.map(row => [row.id, row.dguid]));
 for (const snapshot of datasets) {
  const {data, records, attributes, canonical} = snapshot, geographies = members(snapshot, 1);
  assert.equal(data.cmas.length, 41);assert.equal(records.length, 42);
  assert.equal(new Set(records.map(row => row.id)).size, 42);
  assert.equal(new Set(records.map(row => row.dguid)).size, 42);
  assert.deepEqual(new Map(data.cmas.map(row => [row.id, row.dguid])), expected);
  assert.equal(data.national.id, 'Canada');assert.equal(data.national.dguid, '2021A000011124');
  for (const row of records) {
   const matches = geographies.filter(member => attributes.get(`${member.memberId}:DGUID`) === row.dguid);
   assert.equal(matches.length, 1, `${snapshot.topic}/${row.id}: exact DGUID match`);
   const geography = matches[0];
   assert.equal(String(geography.memberId), row.denominator.coordinate.split('.')[0]);
   if (row.id !== 'Canada') {
    assert.equal(geography.geoLevel, 503);assert.equal(geography.classificationCode, row.id);
    assert.equal(row.name, population.cmas.find(cma => cma.id === row.id).name);
   }
  }
  assert.equal(data.cmas.filter(row => row.id === '505').length, 1);
  assert.ok(data.cmas.find(row => row.id === '505').denominator.coordinate.startsWith('85.'));
  assert.ok(canonical.rows.every(row => !['86', '87'].includes(row.COORDINATE.split('.')[0])));
  assert.equal(new Set(canonical.rows.map(row => row.DGUID)).size, 42);
 }
});

test('Canonical CSVs preserve every original field and add only the exact manifest-backed coordinates', () => {
 for (const snapshot of datasets) {
  const {topic, raw, canonical} = snapshot, source = byCoordinate(raw.rows), adopted = byCoordinate(canonical.rows);
  const expectedCount = topic === 'ethnicity' ? 630 : 1050, categories = topic === 'ethnicity' ? ['1', ...selectedIds.ethnicity] : Array.from({length: 25}, (_, index) => String(index + 1));
  assert.equal(raw.rows.length, topic === 'ethnicity' ? 629 : 1033);
  assert.equal(source.size, raw.rows.length);assert.equal(adopted.size, expectedCount);
  assert.equal(canonical.rows.length, expectedCount);
  assert.deepEqual(canonical.rows.filter(row => !source.has(row.COORDINATE)).map(row => row.COORDINATE).sort(), recoveryCoordinates(snapshot).sort());
  for (const row of raw.rows) {
   const adoptedRow = adopted.get(row.COORDINATE);assert.ok(adoptedRow);
   for (const header of raw.headers) assert.equal(adoptedRow[header], row[header], `${topic}/${row.COORDINATE}/${header}`);
   if (topic === 'religion') assert.equal(adoptedRow.SOURCE_DATA_ORIGIN, 'selected-statcan-csv');
  }
  for (const record of snapshot.records) {
   const rows = canonical.rows.filter(row => row.DGUID === record.dguid);
   assert.equal(rows.length, categories.length);
   assert.deepEqual(rows.map(row => row.COORDINATE.split('.')[4]).sort(), [...categories].sort());
  }
  for (const row of canonical.rows) {
   assert.equal(row.REF_DATE, '2021');assert.equal(row['Age (15C)'], 'Total - Age');
   assert.equal(row.SCALAR_FACTOR, 'units');assert.equal(row.SCALAR_ID, '0');assert.equal(row.UOM_ID, '0');
   const coordinates = row.COORDINATE.split('.');
   assert.deepEqual(coordinates.slice(1, 4), ['1', '1', '1']);
   if (topic === 'ethnicity') {
    assert.equal(row['Generation status (4)'], 'Total - Generation status');assert.equal(row['Statistics (3)'], 'Count');
    assert.equal(row['Visible minority (15)'], 'Total - Visible minority');assert.equal(coordinates.length, 6);assert.equal(coordinates[5], '1');
   } else {
    assert.equal(row['Gender (3)'], 'Total - Gender');assert.equal(row['Statistics (2)'], '2021 Counts');assert.equal(coordinates.length, 5);
   }
  }
 }
});

test('Every displayed JSON cell preserves its table count, symbol, status, vector, decimals and coordinate', () => {
 for (const snapshot of datasets) {
  const source = byCoordinate(snapshot.canonical.rows), categories = members(snapshot, 5), seen = new Set();
  for (const record of snapshot.records) {
   assert.deepEqual(Object.keys(record.values), selectedIds[snapshot.topic]);
   for (const [id, cell] of [['1', record.denominator], ...Object.entries(record.values)]) {
    assert.ok(!seen.has(cell.coordinate));seen.add(cell.coordinate);
    const row = source.get(cell.coordinate);assert.ok(row, `${snapshot.topic}/${cell.coordinate}`);
    assert.equal(row.DGUID, record.dguid);assert.equal(row.COORDINATE.split('.')[4], id);
    assert.equal(row[snapshot.topic === 'ethnicity' ? 'Population group (87)' : 'Religion (25)'], categories.find(member => String(member.memberId) === id).memberNameEn);
    assert.deepEqual(cell, {value: valueOf(row), symbol: row.SYMBOL, status: row.STATUS, vector: row.VECTOR, decimals: Number(row.DECIMALS), coordinate: row.COORDINATE});
    assert.ok(cell.value === null || Number.isInteger(cell.value) && cell.value >= 0 && cell.value <= record.denominator.value);
   }
   assert.ok(record.denominator.value > 0);
  }
  assert.equal(seen.size, snapshot.topic === 'ethnicity' ? 630 : 420);
 }
});

test('Selected categories partition the official hierarchy without counting parents and their children twice or correcting rounding', () => {
 for (const snapshot of datasets) {
  const categories = members(snapshot, 5), byId = new Map(categories.map(member => [String(member.memberId), member]));
  assert.equal(categories.length, snapshot.topic === 'ethnicity' ? 87 : 25);
  assert.deepEqual(snapshot.data.groups.map(group => group.id), selectedIds[snapshot.topic]);
  const partition = categories.filter(member => snapshot.topic === 'ethnicity'
   ? member.parentMemberId === 2 || member.parentMemberId === 1 && member.memberId !== 2
   : member.parentMemberId === 1).map(member => String(member.memberId));
  assert.deepEqual(partition, selectedIds[snapshot.topic]);
  for (const group of snapshot.data.groups) {
   const official = byId.get(group.id);assert.equal(group.englishName, official.memberNameEn);assert.equal(group.parentId, String(official.parentMemberId));
   let parent = official.parentMemberId;
   while (parent !== null) {
    assert.ok(!selectedIds[snapshot.topic].includes(String(parent)), `Selected ancestor of ${group.id}`);
    parent = byId.get(String(parent)).parentMemberId;
   }
  }
  const residuals = snapshot.records.map(record => ({id: record.id, difference: Object.values(record.values).reduce((sum, cell) => sum + cell.value, 0) - record.denominator.value}));
  assert.ok(residuals.some(row => row.difference !== 0), 'Published random-rounding differences remain intact');
  const documented = snapshot.topic === 'ethnicity' ? snapshot.manifest.audit.roundingDifferences : snapshot.manifest.checks.categorySumResiduals;
  assert.deepEqual(residuals, documented.map(({id, difference}) => ({id, difference})));
 }
});

test('The one recovered population-group zero is explicitly published at the exact Drummondville/Japanese/total-visible-minority intersection', async () => {
 const snapshot = datasets.find(item => item.topic === 'ethnicity'), {table, manifest, raw, canonical, data} = snapshot;
 const recovery = manifest.zeroCellRecovery, request = await readJson(snapshot.folder + 'drummondville-display-original.request.json');
 assert.deepEqual({dguid: recovery.dguid, groupId: recovery.groupId, coordinate: recovery.coordinate, value: recovery.value},
  {dguid: '2021S0503447', groupId: '13', coordinate: '32.1.1.1.13.1', value: 0});
 assert.deepEqual(data.source.zeroCellRecovery, recovery);assert.equal(recovery.sourceUrl, request.url);
 assert.equal(table.headers.columnHeaders.find(header => header.name === 'Geography').values[0].meta.memberId, 32);
 for (const name of ['Generation status (4)', 'Age (15C)', 'Statistics (3)']) {
  assert.deepEqual(table.headers.columnHeaders.find(header => header.name === name).values.map(value => value.meta.memberId), [1]);
 }
 const columns = table.headers.columnHeaders.find(header => header.name === 'Visible minority (15)').values;
 const japanese = table.rows.find(row => row.values[0].meta.memberId === 13), cell = japanese.values[columns.findIndex(column => column.meta.memberId === 1) + 1];
 assert.equal(cell.value, '0.0');assert.equal(cell.meta.formattedValue, '0');assert.equal(cell.meta.reference, '');
 assert.equal(byCoordinate(raw.rows).has(recovery.coordinate), false);
 assert.equal(byCoordinate(canonical.rows).get(recovery.coordinate).VALUE, '0');
 assert.equal(data.cmas.find(row => row.id === '447').values['13'].value, 0);
 assert.equal(manifest.audit.recoveredOfficialDisplayZeroCells, 1);assert.equal(manifest.audit.zeroCells, 1);
});

test('All religion CSV omissions are exactly the 17 explicit official HTML zeros, while every adopted count matches the official table', () => {
 const snapshot = datasets.find(item => item.topic === 'religion'), {table, raw, canonical, manifest} = snapshot;
 const source = byCoordinate(raw.rows), evidence = new Map(manifest.explicitZeroEvidence.map(item => [item.coordinate, item]));
 const rows = new Map(table.rows.map(row => [String(row.values[0].meta.memberId), row]));
 const columns = table.headers.columnHeaders.find(header => header.name === 'Religion (25)').values;
 assert.equal(evidence.size, 17);assert.equal(manifest.explicitZeroEvidence.length, 17);
 for (const row of canonical.rows) {
  const [geographyId, , , , religionId] = row.COORDINATE.split('.'), displayedRow = rows.get(geographyId);
  const offset = displayedRow.values.findIndex(value => !value.meta.isHeader);
  const cell = displayedRow.values[offset + columns.findIndex(column => String(column.meta.memberId) === religionId)];
  assert.equal(valueOf(row), cell.value === '' ? null : Number(cell.value), row.COORDINATE);
  if (!source.has(row.COORDINATE)) {
   const recorded = evidence.get(row.COORDINATE);assert.ok(recorded);
   assert.equal(recorded.dguid, row.DGUID);assert.equal(recorded.religionId, religionId);
   assert.equal(recorded.geography, displayedRow.values[0].value);assert.equal(recorded.religion, row['Religion (25)']);
   assert.equal(recorded.displayedValue, '0.0');assert.equal(recorded.formattedValue, '0');assert.equal(recorded.reference, '');
   assert.equal(cell.value, recorded.displayedValue);assert.equal(cell.meta.formattedValue, recorded.formattedValue);assert.equal(cell.meta.reference, recorded.reference);
   assert.equal(row.SOURCE_DATA_ORIGIN, 'official-table-html-explicit-zero');assert.equal(row.VALUE, '0');
  }
 }
 assert.equal(manifest.checks.verifiedExplicitZeros, 17);
 assert.equal(manifest.checks.displayedGroupExplicitZeros, 5);
 assert.equal(manifest.checks.missingValues, 0);
});

test('Geographic quality flags and total non-response rates remain those supplied for each official geography', () => {
 for (const snapshot of datasets) {
  for (const record of snapshot.records) {
   const geography = record.denominator.coordinate.split('.')[0], attribute = name => snapshot.attributes.get(`${geography}:${name}`);
   const quality = record.quality;
   assert.equal(snapshot.topic === 'ethnicity' ? quality.codes.dataQualityFlag : quality.codes[0], attribute('DQF_CODE'));
   assert.deepEqual(quality.notes, attribute('DQF_NOTE') === '...' ? [] : [attribute('DQF_NOTE')]);
   assert.equal(snapshot.topic === 'ethnicity' ? quality.tnrLongFormPercent : quality.tnr.longForm, Number(attribute('TNR_LONG_FORM')));
   assert.equal(snapshot.topic === 'ethnicity' ? quality.tnrShortFormPercent : quality.tnr.shortForm, Number(attribute('TNR_SHORT_FORM')));
  }
  assert.deepEqual(new Set(snapshot.records.filter(row => row.quality.notes.length).map(row => row.id)), new Set(['Canada', '462', '933', '825', '543']));
 }
});

test('Preserved source evidence and the religion publication match their recorded SHA-256 ledgers', async () => {
 const hash = bytes => createHash('sha256').update(bytes).digest('hex');
 for (const snapshot of datasets) {
  await Promise.all((snapshot.manifest.originalFiles ?? snapshot.manifest.sources).map(async item => {
   const bytes = await readFile(snapshot.folder + item.file);assert.equal(bytes.length, item.bytes);assert.equal(hash(bytes), item.sha256);
  }));
 }
 const religion = datasets.find(item => item.topic === 'religion');
 for (const item of religion.manifest.assets) {
  const bytes = await readFile(assets + item.file);assert.equal(bytes.length, item.bytes);assert.equal(hash(bytes), item.sha256);
 }
 assert.equal(hash(await readFile(religion.manifest.output.file)), religion.manifest.output.sha256);
});
