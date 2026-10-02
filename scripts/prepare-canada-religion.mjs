import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root = new URL('../', import.meta.url);
const input = new URL('data-source/atlas/canada-demographics-v1/religion/', root);
const assets = new URL('public/assets/atlas/canada-demographics-v1/', root);
const output = new URL('src/data/atlas/canada/demographics-religion.json', root);
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const readJson = async file => JSON.parse((await fs.readFile(new URL(file, input), 'utf8')).replace(/^\uFEFF/, ''));
function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (character === ',' && !quoted) { row.push(value); value = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[i + 1] === '\n') i++;
      row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = '';
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
}
function extractTable(html) {
  const marker = 'prepareTable(';
  const start = html.indexOf(marker) + marker.length;
  assert(start >= marker.length, 'Official rendered table JSON not found');
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const character = html[i];
    if (quoted) { if (escaped) escaped = false; else if (character === '\\') escaped = true; else if (character === '"') quoted = false; }
    else if (character === '"') quoted = true;
    else if (character === '{' || character === '[') depth++;
    else if (character === '}' || character === ']') { if (--depth === 0) return JSON.parse(html.slice(start, i + 1)); }
  }
  throw new Error('Incomplete official rendered table JSON');
}
const metadataResponse = await readJson('wds-metadata-98100353.json');
assert.equal(metadataResponse[0].status, 'SUCCESS');
const metadata = metadataResponse[0].object;
assert.equal(metadata.productId, '98100353');
assert.equal(metadata.releaseTime.slice(0, 10), '2023-06-21');
const request = await readJson('selected-request.json');
const population = JSON.parse(await fs.readFile(new URL('src/data/atlas/canada/population.json', root), 'utf8'));
assert.equal(population.cmas.length, 41);
const religionMembers = metadata.dimension.find(d => d.dimensionPositionId === 5).member;
const geographyMembers = metadata.dimension.find(d => d.dimensionPositionId === 1).member;
assert.equal(religionMembers.length, 25);
const topLevel = religionMembers.filter(m => m.parentMemberId === 1);
assert.deepEqual(topLevel.map(m => m.memberId), [2, 3, 19, 20, 21, 22, 23, 24, 25]);
const html = await fs.readFile(new URL('table-9810035302.html', input), 'utf8');
const table = extractTable(html);
const renderedRows = new Map(table.rows.map(row => [row.values[0].meta.memberId, row]));
const columns = table.headers.columnHeaders.find(column => column.name === 'Religion (25)').values;
assert.deepEqual(columns.map(column => column.meta.memberId), religionMembers.map(member => member.memberId));
const csvRows = parseCsv(await fs.readFile(new URL('selected-counts-9810035302.csv', input), 'utf8'));
const headers = csvRows.shift();
const sourceRows = csvRows.map(row => Object.fromEntries(headers.map((name, i) => [name, row[i] ?? ''])));
const byCoordinate = new Map(sourceRows.map(row => [row.COORDINATE, row]));
assert.equal(byCoordinate.size, sourceRows.length, 'Duplicate selected CSV coordinates');
assert.equal(sourceRows.length, 1033);
const translatedNames = {
  2: '仏教', 3: 'キリスト教', 19: 'ヒンドゥー教', 20: 'ユダヤ教', 21: 'イスラム教', 22: 'シク教',
  23: '伝統的な北米先住民の精神的信仰', 24: 'その他の宗教・精神的伝統', 25: '無宗教・世俗的な考え方'
};
const footnotesFor = id => metadata.footnote.filter(note => note.link.dimensionPositionId === 5 && note.link.memberId === id).map(note => ({id: String(note.footnoteId), text: note.footnotesEn}));
const groups = topLevel.map(member => ({id: String(member.memberId), englishName: member.memberNameEn, name: translatedNames[member.memberId], parentId: String(member.parentMemberId), footnotes: footnotesFor(member.memberId)}));
const completedRows = [], explicitZeros = [], sumResiduals = [];
function geoAttribute(memberId, title) {
  const attribute = metadata.geoAttribute.find(attribute => attribute.memberId === memberId && attribute.title === title);
  assert(attribute, `Missing official ${title} for geography ${memberId}`);
  return attribute.valueEn;
}
function makeGeography(geography, populationRow) {
  const dguid = geoAttribute(geography.memberId, 'DGUID');
  if (populationRow) { assert.equal(geography.geoLevel, 503); assert.equal(geography.classificationCode, populationRow.id); assert.equal(dguid, populationRow.dguid); }
  else { assert.equal(geography.memberNameEn, 'Canada'); assert.equal(dguid, '2021A000011124'); }
  const cells = {};
  const rendered = renderedRows.get(geography.memberId);
  assert(rendered, `Missing official table geography ${geography.memberId}`);
  for (const [i, member] of religionMembers.entries()) {
    const coordinate = `${geography.memberId}.1.1.1.${member.memberId}`;
    const officialCell = rendered.values[i + 3];
    assert(officialCell, `Missing rendered cell ${coordinate}`);
    const displayed = officialCell.value === '' ? null : Number(officialCell.value);
    assert(displayed === null || Number.isFinite(displayed), `Invalid rendered cell ${coordinate}`);
    let row = byCoordinate.get(coordinate), origin = 'selected-statcan-csv';
    if (!row) {
      // The database-loading export omits these cells. Zero is accepted only
      // when this exact official table cell explicitly publishes numeric zero.
      assert.equal(displayed, 0, `Unverified missing CSV coordinate ${coordinate}`);
      assert.equal(officialCell.meta.formattedValue, '0');
      assert.equal(officialCell.meta.reference, '');
      row = Object.fromEntries(headers.map(name => [name, '']));
      Object.assign(row, {REF_DATE: '2021', GEO: geography.memberNameEn, DGUID: dguid, 'Age (15C)': 'Total - Age', 'Gender (3)': 'Total - Gender', 'Statistics (2)': '2021 Counts', 'Religion (25)': member.memberNameEn, UOM_ID: '0', SCALAR_FACTOR: 'units', SCALAR_ID: '0', COORDINATE: coordinate, VALUE: '0', DECIMALS: '0'});
      origin = 'official-table-html-explicit-zero';
      explicitZeros.push({coordinate, dguid, geography: geography.memberNameEn, religionId: String(member.memberId), religion: member.memberNameEn, displayedValue: officialCell.value, formattedValue: officialCell.meta.formattedValue, reference: officialCell.meta.reference});
    }
    assert.equal(row.REF_DATE, '2021'); assert.equal(row.DGUID, dguid);
    assert.equal(row['Age (15C)'], 'Total - Age'); assert.equal(row['Gender (3)'], 'Total - Gender');
    assert.equal(row['Statistics (2)'], '2021 Counts'); assert.equal(row['Religion (25)'], member.memberNameEn);
    assert.equal(row.SCALAR_FACTOR, 'units'); assert.equal(row.SCALAR_ID, '0');
    const value = row.VALUE === '' ? null : Number(row.VALUE);
    assert.equal(value, displayed, `CSV/rendered count disagreement ${coordinate}`);
    assert(value === null || Number.isInteger(value) && value >= 0, `Invalid count ${coordinate}`);
    assert.equal(row.STATUS, ''); assert.equal(row.SYMBOL, '');
    cells[String(member.memberId)] = {value, symbol: row.SYMBOL, status: row.STATUS, vector: row.VECTOR, decimals: Number(row.DECIMALS), coordinate};
    completedRows.push({...row, SOURCE_DATA_ORIGIN: origin});
  }
  const denominator = cells['1'];
  assert(denominator.value > 0);
  const values = Object.fromEntries(groups.map(group => [group.id, cells[group.id]]));
  for (const cell of Object.values(values)) assert(cell.value === null || cell.value <= denominator.value);
  const sum = Object.values(values).reduce((total, cell) => total + cell.value, 0);
  sumResiduals.push({id: populationRow?.id ?? 'Canada', difference: sum - denominator.value});
  return {
    id: populationRow?.id ?? 'Canada', dguid, name: populationRow?.name ?? '全国', sourceName: geography.memberNameEn,
    denominator, values,
    quality: {
      codes: [geoAttribute(geography.memberId, 'DQF_CODE')],
      notes: [geoAttribute(geography.memberId, 'DQF_NOTE')].filter(note => note && note !== '...'),
      tnr: {longForm: Number(geoAttribute(geography.memberId, 'TNR_LONG_FORM')), shortForm: Number(geoAttribute(geography.memberId, 'TNR_SHORT_FORM'))}
    }
  };
}
const canada = geographyMembers.find(member => member.memberNameEn === 'Canada');
const national = makeGeography(canada);
const cmas = population.cmas.map(populationRow => {
  const matches = geographyMembers.filter(member => member.classificationCode === populationRow.id && member.geoLevel === 503);
  assert.equal(matches.length, 1, `Nonunique official CMA ${populationRow.id}`);
  return makeGeography(matches[0], populationRow);
});
assert.equal(cmas.length, 41); assert.equal(new Set(cmas.map(cma => cma.dguid)).size, 41);
assert.equal(cmas.find(cma => cma.id === '505').denominator.coordinate, '85.1.1.1.1');
assert.equal(completedRows.length, 1050); assert.equal(explicitZeros.length, 17);
assert.equal(explicitZeros.filter(zero => groups.some(group => group.id === zero.religionId)).length, 5);
assert.equal(sourceRows.filter(row => !completedRows.some(complete => complete.COORDINATE === row.COORDINATE)).length, 0);
const source = {
  tableId: '98-10-0353-02', pid: '98100353', viewPid: '9810035302',
  url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810035302',
  title: 'Religion by gender and age: Census metropolitan areas and census agglomerations',
  releaseDate: '2023-06-21', accessedAt: request.retrievedAt, universe: 'Persons in private households in occupied private dwellings, 2021 Census — 25% Sample data',
  sample: '2021 Census long-form 25% sample, weighted estimates of persons in private households; all ages and total gender.',
  licenceUrl: 'https://www.statcan.gc.ca/en/terms-conditions/open-licence',
  attribution: 'Adapted from Statistics Canada, Religion by gender and age: Census metropolitan areas and census agglomerations (Table 98-10-0353-02), 2021. This does not constitute an endorsement by Statistics Canada of this product.',
  rounding: 'Census tabulation counts undergo random rounding. Derived percentages use this table’s Total - Religion denominator; category totals and percentages may differ slightly from the denominator and 100%. A published rounded zero is preserved as zero.',
  roundingUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/ref/98-304/2021001/chap10-eng.cfm',
  definitionUrl: 'https://www12.statcan.gc.ca/census-recensement/2021/ref/98-500/016/98-500-x2021016-eng.pdf',
  definitions: {
    affiliation: 'Religion is a person’s self-identified connection or affiliation with a religious denomination, group, body, community or belief system. It is not limited to formal membership. Respondents were asked to report their affiliation even if they were not currently practising.',
    denominator: 'The published Total - Religion count for the same geography, 2021, Total - Age, Total - Gender and 2021 Counts. This differs from whole-population census counts.',
    children: 'For infants and children, religion refers to the religion or denomination in which they are being raised, if any.',
    hierarchy: 'The nine displayed categories are immediate children of Total - Religion. Christian includes its denominations; denominations are retained only in the extraction CSV and are not added to the Christian parent.'
  },
  footnotes: [...footnotesFor(0), ...footnotesFor(1)]
};
const data = {topic: 'religion', year: 2021, source, defaultGroup: '25', groups, national, cmas};
await fs.mkdir(assets, {recursive: true});
await fs.writeFile(output, JSON.stringify(data, null, 2) + '\n');
const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const publicHeaders = [...headers, 'SOURCE_DATA_ORIGIN'];
const selectedCsv = [publicHeaders, ...completedRows.map(row => publicHeaders.map(header => row[header]))].map(row => row.map(quote).join(',')).join('\n') + '\n';
await fs.writeFile(new URL('religion-selected.csv', assets), selectedCsv);
const sourceDescriptors = [
  ['selected-counts-9810035302.csv', request.url],
  ['table-9810035302.html', source.url],
  ['wds-metadata-98100353.json', 'https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata', 'POST', [{productId: 98100353}]],
  ['selected-request.json', source.url],
  ['religion-reference-guide.pdf', source.definitionUrl],
  ['statcan-open-licence.html', source.licenceUrl],
  ['census-guide-dissem-chap10.html', source.roundingUrl]
];
const sources = await Promise.all(sourceDescriptors.map(async ([file, url, method, body]) => {
  const bytes = await fs.readFile(new URL(file, input));
  return {file, url, ...(method ? {method, body} : {}), bytes: bytes.length, sha256: hash(bytes)};
}));
const publicFiles = await Promise.all(['religion-selected.csv'].map(async file => {
  const buffer = await fs.readFile(new URL(file, assets));
  return {file, bytes: buffer.length, sha256: hash(buffer)};
}));
const manifest = {
  version: 'canada-demographics-v1', topic: 'religion', year: 2021, source,
  selection: {geographies: 42, cmas: 41, national: 1, ageId: 1, genderId: 1, statisticsId: 1, religionIds: religionMembers.map(member => String(member.memberId)), displayedGroupIds: groups.map(group => group.id), rows: 1050, originalSelectedCsvRows: 1033},
  missingPolicy: 'Empty or unavailable numeric values remain null. Published zero remains zero. Seventeen CSV-omitted coordinates are retained only after matching the exact official geography/religion table cell with value 0.0, formattedValue 0 and empty reference. This is not zero imputation. All status/symbol, coordinate, DGUID and official geographic quality attributes are retained.',
  geographyJoin: 'Exact official 2021 classificationCode and geoLevel 503, then exact DGUID against existing population atlas. Ottawa - Gatineau is member 85 / CMA 505 / DGUID 2021S0503505; provincial part members 86 and 87 are excluded.',
  checks: {uniqueCmas: 41, selectedCells: 1050, rawCsvCellsCrossCheckedAgainstOfficialHtml: 1033, verifiedExplicitZeros: 17, displayedGroupExplicitZeros: 5, missingValues: completedRows.filter(row => row.VALUE === '').length, flaggedGeographies: [national, ...cmas].filter(geo => geo.quality.notes.length).map(geo => ({id: geo.id, dguid: geo.dguid, ...geo.quality})), categorySumResidualRange: [Math.min(...sumResiduals.map(row => row.difference)), Math.max(...sumResiduals.map(row => row.difference))], categorySumResiduals: sumResiduals},
  explicitZeroEvidence: explicitZeros, sources, assets: publicFiles,
  output: {file: 'src/data/atlas/canada/demographics-religion.json', sha256: hash(await fs.readFile(output))}
};
await fs.writeFile(new URL('religion-manifest.json', assets), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(new URL('provenance.json', input), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({topic: data.topic, cmas: cmas.length, groups: groups.length, cells: completedRows.length, rawCsvRows: sourceRows.length, verifiedExplicitZeros: explicitZeros.length, displayedZeroCells: explicitZeros.filter(zero => groups.some(group => group.id === zero.religionId)).length, flagged: manifest.checks.flaggedGeographies.map(geo => geo.id), categorySumResidualRange: manifest.checks.categorySumResidualRange, nationalDenominator: national.denominator.value, assets: publicFiles}, null, 2));
