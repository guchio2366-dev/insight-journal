import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { europePopulationCases, populationCaseShare, normalisePopulationCaseChoice } from '../../src/data/atlas/europe/population-cases.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = path.join(root, 'data-source/atlas/europe/population-cases');
const assetPath = path.join(root, 'public/assets/atlas/europe/population-cases-v1');
const readJson = file => fs.readFile(file, 'utf8').then(JSON.parse);
const packageData = await readJson(path.join(assetPath, 'cases.json'));
const censusCase = packageData.cases[0];
const geometry = await readJson(path.join(assetPath, 'england-wales-lad2021.geojson'));
const manifest = await readJson(path.join(sourcePath, 'manifest.json'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('URL and UI choices use one dependency-free case/topic/category/area normaliser', async () => {
  const moduleSource = await fs.readFile(path.join(root, 'src/data/atlas/europe/population-cases.ts'), 'utf8');
  assert.equal(/^import\s/m.test(moduleSource), false, 'Data contract must not import the map view or DOM controller');
  assert.deepEqual(normalisePopulationCaseChoice({}, 'ethnicity', packageData), { cultureCase: '', cultureCategory: '', cultureArea: '' });
  assert.deepEqual(normalisePopulationCaseChoice(new URLSearchParams('cultureCase=invalid&cultureCategory=hr-religion-AB&cultureArea=HRV'), 'religion', packageData), { cultureCase: '', cultureCategory: '', cultureArea: '' });
  assert.deepEqual(normalisePopulationCaseChoice({ cultureCase: 'croatia-national-2021', cultureCategory: 'ts021-17', cultureArea: 'E06000002' }, 'ethnicity', packageData), { cultureCase: 'croatia-national-2021', cultureCategory: '', cultureArea: '' });
  const religiousChoice = { cultureCase: 'croatia-national-2021', cultureCategory: 'hr-religion-AB', cultureArea: 'HRV' };
  assert.deepEqual(normalisePopulationCaseChoice(religiousChoice, 'religion', packageData), religiousChoice);
  assert.deepEqual(normalisePopulationCaseChoice(new URLSearchParams('cultureCase=england-wales-2021&cultureCategory=ts030-09&cultureArea=E06000002'), 'religion', packageData), { cultureCase: 'england-wales-2021', cultureCategory: 'ts030-09', cultureArea: 'E06000002' });
});

// Independent CSV reader for these original, single-line Nomis records.
function readSourceRows(text) {
  return text.trim().split(/\r?\n/).map(line => {
    const cells = line.match(/(?:"(?:[^"]|"")*"|[^,]*)(?:,|$)/g);
    return cells.slice(0, -1).map(cell => cell.replace(/,$/, '').replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
  });
}

test('census case scope and exact 2021 administrative-code join', () => {
  assert.equal(packageData.schemaVersion, 1);
  assert.deepEqual(packageData.cases.map(item => item.id), ['england-wales-2021', 'croatia-national-2021']);
  assert.deepEqual(europePopulationCases.caseIds, ['england-wales-2021', 'croatia-national-2021']);
  assert.match(packageData.scope, /not Europe-wide/);
  assert.match(censusCase.coverage, /Scotland and Northern Ireland are excluded/);
  assert.equal(censusCase.geographyCount, 331);
  assert.equal(censusCase.grain, 'LAD');
  assert.equal(censusCase.boundaryEdition, 'December 2021');
  assert.equal(censusCase.assetCRS, 'EPSG:4326');
  const codes = geometry.features.map(feature => feature.properties.code).sort();
  assert.equal(new Set(codes).size, 331);
  assert.equal(codes.filter(code => code.startsWith('E')).length, 309);
  assert.equal(codes.filter(code => code.startsWith('W')).length, 22);
  for (const topic of censusCase.topics) {
    assert.deepEqual(topic.areas.map(area => area.code).sort(), codes);
    assert.equal(topic.censusDate, '2021-03-21');
    assert.equal(topic.unit, 'person');
    assert.deepEqual(topic.countries.map(area => area.code), ['E92000001', 'W92000004']);
  }
});

test('every original source count, label and topic denominator survives preparation', async () => {
  for (const topic of censusCase.topics) {
    for (const geography of ['ltla', 'ctry']) {
      const rows = readSourceRows(await fs.readFile(path.join(sourcePath, `census2021-${topic.id}-${geography}.csv`), 'utf8'));
      const header = rows.shift();
      assert.deepEqual(topic.categories.map(category => category.sourceColumn), header.slice(4));
      assert.equal(topic.denominatorColumn, header[3]);
      const outputRows = geography === 'ltla' ? topic.areas : topic.countries;
      for (const source of rows.filter(row => outputRows.some(area => area.code === row[2]))) {
        const area = outputRows.find(area => area.code === source[2]);
        assert.equal(area.name, source[1]);
        assert.equal(area.denominator, Number(source[3]));
        assert.deepEqual(area.counts, source.slice(4).map(Number));
        assert.ok(area.counts.every(count => Number.isInteger(count) && count >= 0));
      }
    }
  }
});

test('official coordinates are preserved and no surrogate geometry is added', async () => {
  const original = await readJson(path.join(sourcePath, 'england-wales-lad2021-source.geojson'));
  for (const feature of geometry.features) {
    const source = original.features.find(item => item.properties.LAD21CD === feature.id);
    assert.ok(source, `Official feature absent: ${feature.id}`);
    assert.deepEqual(feature.geometry, source.geometry);
    assert.ok(['Polygon', 'MultiPolygon'].includes(feature.geometry.type));
    const rings = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
    for (const ring of rings) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring[0], ring.at(-1));
      for (const [longitude, latitude] of ring) {
        assert.ok(Number.isFinite(longitude) && longitude > -9 && longitude < 3);
        assert.ok(Number.isFinite(latitude) && latitude > 49 && latitude < 56);
      }
    }
  }
});

test('hierarchical ethnic responses and religious nonresponse retain their meaning', () => {
  const ethnic = censusCase.topics.find(topic => topic.id === 'ts021');
  const religion = censusCase.topics.find(topic => topic.id === 'ts030');
  assert.equal(ethnic.categories.filter(category => category.level === 'aggregate').length, 5);
  assert.equal(ethnic.partitionCategoryIds.length, 19);
  assert.equal(religion.partitionCategoryIds.length, 9);
  for (const category of ethnic.categories) {
    if (category.level === 'aggregate') assert.ok(!ethnic.partitionCategoryIds.includes(category.id));
    else assert.ok(ethnic.categories.some(parent => parent.id === category.parentId && parent.level === 'aggregate'));
  }
  const noReligion = religion.categories.find(category => category.responseKind === 'no-religion');
  const notAnswered = religion.categories.find(category => category.responseKind === 'not-answered');
  assert.equal(noReligion.label, 'No religion');
  assert.equal(notAnswered.label, 'Not answered');
  assert.notEqual(noReligion.id, notAnswered.id);
  for (const topic of censusCase.topics) {
    const partitionIndices = topic.partitionCategoryIds.map(id => topic.categories.findIndex(category => category.id === id));
    for (const area of topic.areas) {
      const difference = partitionIndices.reduce((total, index) => total + area.counts[index], 0) - area.denominator;
      assert.equal(area.detailSumDifference, difference);
      assert.equal(populationCaseShare(area, topic, topic.categories[0].id), area.counts[0] / area.denominator * 100);
      assert.equal(populationCaseShare(area, topic, 'absent-source-category'), null);
    }
  }
  const ethnicMiddlesbrough = ethnic.areas.find(area => area.code === 'E06000002');
  const religionMiddlesbrough = religion.areas.find(area => area.code === 'E06000002');
  assert.equal(ethnicMiddlesbrough.denominator, 143922);
  assert.equal(religionMiddlesbrough.denominator, 143924);
  assert.notEqual(ethnicMiddlesbrough.denominator, religionMiddlesbrough.denominator);
});

test('source and asset integrity, public reuse terms and declared adaptations are retained', async () => {
  for (const item of manifest.selectedExtracts) {
    const bytes = await fs.readFile(path.join(sourcePath, item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha(bytes), item.sha256);
  }
  for (const item of manifest.assets) {
    const bytes = await fs.readFile(path.join(assetPath, item.file));
    assert.equal(bytes.length, item.bytes);
    assert.equal(sha(bytes), item.sha256);
  }
  assert.match(censusCase.licence.url, /open-government-licence\/version\/3/);
  assert.ok(censusCase.attribution.some(value => value.includes('Office for National Statistics')));
  assert.ok(censusCase.attribution.some(value => value.includes('Contains OS data')));
  assert.match(censusCase.adaptations, /No geometry inference/);
  for (const topic of censusCase.topics) {
    const metadata = await fs.readFile(path.join(sourcePath, `${topic.id}-source-metadata.txt`), 'utf8');
    assert.match(metadata, /Version: 1/);
    assert.match(topic.sourceVersion, /version 1/);
    assert.match(topic.disclosureControl, /preserved without adjustment/);
  }
});

test('Croatia is an explicit national source row with distinct original response categories', async () => {
  const croatia = packageData.cases.find(item => item.id === 'croatia-national-2021');
  const extract = await readJson(path.join(sourcePath, 'croatia-national-2021-source.json'));
  assert.equal(croatia.grain, 'national');
  assert.notEqual(croatia.grain, censusCase.grain);
  assert.equal(croatia.geographyCount, 1);
  assert.match(croatia.coverage, /No county distribution/);
  assert.match(croatia.boundaryEdition, /display only, not a Census 2021/);
  assert.equal(extract.censusDate, '2021-08-31');
  assert.equal(extract.lastModifiedAt, '2025-06-13T09:04:57Z');
  // Verify original non-ASCII labels survive the XLSX UTF-8/XML extraction.
  assert.equal(extract.sheets[0].header.A, '\u017dupanija');
  for (const [index, topic] of croatia.topics.entries()) {
    const sheet = extract.sheets[index];
    assert.equal(sheet.nationalRow, 9);
    assert.equal(sheet.national.A, 'Republika Hrvatska');
    assert.equal(sheet.national.C, 'Republic of Croatia');
    assert.equal(sheet.national.F, '3871833');
    assert.equal(sheet.national.E, '');
    assert.equal(topic.sourceSheet, sheet.name);
    assert.equal(topic.sourceRow, 9);
    assert.equal(topic.areas.length, 1);
    assert.deepEqual(topic.areas, topic.countries);
    assert.equal(topic.areas[0].code, 'HRV');
    assert.equal(topic.areas[0].denominator, 3871833);
    assert.equal(topic.categories.length, index === 0 ? 29 : 12);
    for (const [categoryIndex, category] of topic.categories.entries()) {
      const column = /!([A-Z]+)8$/.exec(category.sourceColumn)[1];
      assert.equal(category.sourceLabel, sheet.header[column]);
      assert.equal(topic.areas[0].counts[categoryIndex], Number(sheet.national[column]));
    }
    assert.ok(topic.categories.some(category => category.label === 'Not declared' && category.responseKind === 'not-declared'));
    assert.ok(topic.categories.some(category => category.label === 'Unknown' && category.responseKind === 'unknown'));
  }
  const religion = croatia.topics.find(topic => topic.kind === 'religion');
  const countFor = label => religion.areas[0].counts[religion.categories.findIndex(category => category.label === label)];
  assert.equal(countFor('Catholics'), 3057735);
  assert.equal(countFor('Orthodox'), 128395);
  assert.equal(countFor('Not religious and atheists'), 182188);
  assert.equal(countFor('Not declared'), 66581);
  assert.equal(countFor('Unknown'), 83045);
  assert.ok(religion.categories.some(category => category.label === 'Agnostics and sceptics'));
  assert.ok(religion.notes.some(note => /96[.,]47/.test(note)));
  assert.match(croatia.licence.url, /Open%20Licence\.pdf/);
  assert.ok(croatia.attribution.some(value => value.includes('Croatian Bureau of Statistics') && value.includes('13 June 2025')));
  const sourceAttribution = croatia.attribution.find(value => value.includes('Croatian Bureau of Statistics'));
  assert.ok(sourceAttribution.includes('Contains public sector information licensed under the Open Data Licence'));
  assert.match(sourceAttribution, /Adapted: explicit national rows and original count columns selected/);
  assert.match(sourceAttribution, /Japanese explanatory headings added/);
  assert.match(sourceAttribution, /outline selected for display only, with coordinates unchanged/);
  const originalBasemap = await readJson(path.join(root, 'src/data/atlas/europe-countries.json'));
  const outline = await readJson(path.join(assetPath, 'croatia-national-outline.geojson'));
  assert.equal(outline.features.length, 1);
  assert.equal(outline.features[0].properties.displayOnly, true);
  assert.deepEqual(outline.features[0].geometry, originalBasemap.features.find(feature => feature.properties.code === 'HRV').geometry);
});

test('offline preparation reproduces every frozen asset without rewriting shared test inputs', async () => {
  const temporaryOutput = await fs.mkdtemp(path.join(tmpdir(), 'europe-population-cases-test-'));
  try {
    const files = [
      ...manifest.assets.map(item => ({ file: item.file, source: path.join(assetPath, item.file), asset: item })),
      { file: 'manifest.json', source: path.join(sourcePath, 'manifest.json') },
    ];
    const frozen = await Promise.all(files.map(async item => ({
      ...item,
      bytes: await fs.readFile(item.source),
      modifiedAt: (await fs.stat(item.source, { bigint: true })).mtimeNs,
    })));
    execFileSync(process.execPath, [path.join(root, 'scripts/europe/prepare-population-cases.mjs'), '--output-dir', temporaryOutput], { cwd: root, stdio: 'pipe', timeout: 30000 });
    assert.deepEqual((await fs.readdir(temporaryOutput)).sort(), files.map(item => item.file).sort());
    for (const item of frozen) {
      const generated = await fs.readFile(path.join(temporaryOutput, item.file));
      assert.deepEqual(generated, item.bytes, `${item.file}: isolated output differs from frozen output`);
      assert.equal(sha(generated), sha(item.bytes), `${item.file}: isolated SHA-256 differs`);
      if (item.asset) {
        assert.equal(generated.length, item.asset.bytes);
        assert.equal(sha(generated), item.asset.sha256);
      }
      assert.deepEqual(await fs.readFile(item.source), item.bytes, `${item.file}: shared bytes changed`);
      assert.equal((await fs.stat(item.source, { bigint: true })).mtimeNs, item.modifiedAt, `${item.file}: shared file was rewritten`);
    }
  } finally {
    // This is the unique directory created above, never the published asset directory.
    await fs.rm(temporaryOutput, { recursive: true, force: true });
  }
});
