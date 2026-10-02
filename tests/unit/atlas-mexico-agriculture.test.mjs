import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';

const data = JSON.parse(await readFile('src/data/atlas/mexico/agriculture.json', 'utf8'));
const manifest = JSON.parse(await readFile('public/assets/atlas/mexico-agriculture-v1/manifest.json', 'utf8'));
const {code} = await transform(await readFile('src/lib/atlas-mexico-agriculture.ts', 'utf8'), {loader:'ts', format:'esm'});
const lib = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const state = code => data.states.find(record => record.code === code);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('Mexico agriculture keeps all 32 official numeric regions, correct crop scope and explicit pine zero', () => {
  assert.deepEqual(data.states.map(record => record.code), Array.from({length:32}, (_, i) => String(i + 1).padStart(2, '0')));
  assert.ok(data.states.every(record => record.status === 'valid'));
  assert.deepEqual(data.period, {from:'2021-10-01', to:'2022-09-30', label:'2022年農業センサス', display:'2021年10月～2022年9月'});
  assert.equal(state('25').maizeWhiteProductionT, 7451358.0778);
  assert.equal(data.national.maizeWhiteProductionT, 21926226.0479);
  assert.equal(state('10').pineObtainedM3, 4173803.736);
  assert.equal(state('08').pineObtainedM3, 1800391.2751);
  assert.equal(state('05').pineObtainedM3, 0);
  assert.equal(state('17').pineObtainedM3, 0);
  assert.match(data.definitions.maizeWhiteProductionT, /露地.*一年生.*白粒/);
  assert.match(data.definitions.pineObtainedM3, /丸太以外/);
});

test('Irrigation denominator, five nationwide totals and Sinaloa winter crop ratios reconcile', () => {
  for (const record of [data.national, ...data.states]) {
    assert.ok(Math.abs(record.agriculturalAreaHa - record.irrigatedAreaHa - record.rainfedAreaHa) < .0001);
    assert.ok(Math.abs(record.irrigationSharePct - record.irrigatedAreaHa / record.agriculturalAreaHa * 100) < 1e-10);
    assert.ok(record.irrigationSharePct >= 0 && record.irrigationSharePct <= 100);
  }
  for (const [field, check] of Object.entries(manifest.qualityChecks)) {
    assert.ok(Math.abs(data.states.reduce((sum, record) => sum + record[field], 0) - data.national[field]) < .0001);
    assert.equal(check.difference, 0);
  }
  assert.equal(state('25').irrigationSharePct.toFixed(1), '68.9');
  assert.equal(state('03').irrigationSharePct.toFixed(1), '99.7');
  const winter = data.caseStudies.sinaloaAutumnWinterWhiteMaize;
  assert.equal(winter.crop, 'Maíz grano blanco');
  assert.equal(winter.cycle, 'Otoño-invierno');
  assert.equal(winter.productionT, 4003356.4681);
  assert.equal(winter.irrigatedProductionT, 3991350.1689);
  assert.equal(winter.irrigatedProductionSharePct.toFixed(1), '99.7');
  assert.notEqual(winter.irrigatedProductionSharePct.toFixed(1), state('25').irrigationSharePct.toFixed(1));
  assert.equal(((state('10').pineObtainedM3 + state('08').pineObtainedM3) / data.national.pineObtainedM3 * 100).toFixed(1), '79.4');
});

test('Map encodes quantity with circle area and rates with complete non-overlapping bins', () => {
  assert.equal(lib.quantityRadius(0, 100), 0);
  assert.equal(lib.quantityRadius(100, 100), 32);
  assert.equal(lib.quantityRadius(25, 100), 16);
  assert.equal(lib.quantityRadius(NaN, 100), 0);
  assert.equal(lib.quantityRadius(10, 0), 0);
  assert.equal(lib.irrigationColor(0), lib.irrigationBins[0].color);
  assert.equal(lib.irrigationColor(25), lib.irrigationBins[1].color);
  assert.equal(lib.irrigationColor(50), lib.irrigationBins[2].color);
  assert.equal(lib.irrigationColor(75), lib.irrigationBins[3].color);
  assert.equal(lib.irrigationColor(100), lib.irrigationBins[3].color);
  assert.equal(lib.irrigationColor(NaN), '#e5e5df');
  assert.equal(lib.formatAgricultureValue(0, 'pine'), '0 m³');
  assert.equal(lib.formatAgricultureValue(NaN, 'pine'), '未取得');
});

test('Field URL and dedicated nature comparison preserve target, metric, focus and fallback', () => {
  const desired = {metric:'pine', state:'08', only:true, fallback:true,crops:true,livestock:true,onlyItem:false};
  const original = new URL('https://example.com/insight-journal/atlas/north-america/mexico/agriculture/?extra=keep');
  const encoded = lib.writeMexicoAgricultureState(original, desired);
  assert.deepEqual(lib.readMexicoAgricultureState(encoded), desired);
  assert.equal(encoded.searchParams.get('extra'), 'keep');
  assert.equal(original.searchParams.has('metric'), false);
  assert.deepEqual(lib.readMexicoAgricultureState(new URL('https://example.com/?metric=bad&state=99&only=yes')), {metric:'maize', state:'25', only:false, fallback:false,crops:true,livestock:true,onlyItem:false});
  assert.equal(lib.readMexicoAgricultureState(new URL('https://example.com/?metric=pine&state=8')).state, '08');
  const compare = lib.agricultureNatureComparisonUrl('/insight-journal/atlas/north-america/mexico/nature/', desired, original.origin);
  assert.equal(compare.searchParams.get('compare'), 'irrigation');
  assert.equal(compare.searchParams.get('state'), '08');
  assert.equal(compare.searchParams.get('from'), 'agriculture');
  assert.equal(compare.searchParams.get('sourceMetric'), 'pine');
  assert.equal(compare.searchParams.get('sourceState'), '08');
  assert.equal(compare.searchParams.get('sourceOnly'), '1');
  assert.equal(compare.searchParams.get('sourceFallback'), '1');
});

test('Retained livestock totals include production units and households, reconcile nationally and keep source hashes',async()=>{
 const cattle=JSON.parse(await readFile('src/data/atlas/mexico/livestock.json','utf8'));
 assert.equal(cattle.unit,'頭');assert.equal(cattle.period,'2022年9月');assert.match(cattle.scope,/生産単位.*住宅/);
 assert.deepEqual(Object.keys(cattle.states).sort(),Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0')));
 assert.ok(Object.values(cattle.states).every(value=>Number.isSafeInteger(value)&&value>=0));
 assert.equal(Object.values(cattle.states).reduce((a,b)=>a+b,0),24808075);assert.equal(cattle.national,24808075);
 assert.equal(cattle.states['30'],2723963);assert.equal(cattle.states['08'],1746817);
 assert.equal(cattle.provenance.archiveSha256,sha(await readFile(cattle.provenance.archive)));
 assert.match(cattle.provenance.filter,/TIPO_UNIDAD/);assert.match(cattle.provenance.periodUnitUrl,/inegi\.org\.mx/);
 assert.equal(lib.agricultureValue({...state('08'),cattleHeads:cattle.states['08']},'cattle'),1746817);
 assert.equal(lib.formatAgricultureValue(1746817,'cattle'),'1,746,817 頭');
 assert.ok(Number.isNaN(lib.agricultureValue(state('08'),'cattle')),'unprovided livestock is not silently zero');
});

test('Independent crop/livestock switches and item-only mode round-trip without changing the selected state or units',()=>{
 const desired={metric:'cattle',state:'08',only:true,fallback:false,crops:false,livestock:true,onlyItem:true};
 const url=lib.writeMexicoAgricultureState(new URL('https://example.com/?extra=keep'),desired);
 assert.deepEqual(lib.readMexicoAgricultureState(url),desired);assert.equal(url.searchParams.get('extra'),'keep');
 const comparison=lib.agricultureNatureComparisonUrl('/nature/',desired);
 assert.equal(comparison.searchParams.get('sourceMetric'),'cattle');assert.equal(comparison.searchParams.get('sourceCrops'),'0');
 assert.equal(comparison.searchParams.get('sourceLivestock'),'1');assert.equal(comparison.searchParams.get('sourceOnlyItem'),'1');
});

test('Release ledger hashes retained sources and public outputs, with metadata reuse terms', async () => {
  assert.equal(manifest.coverage.states, 32);
  assert.equal(manifest.coverage.missingMainIndicators, 0);
  assert.equal(manifest.coverage.suppressedMainIndicators, 0);
  assert.equal(manifest.datasetSha256, sha(await readFile('src/data/atlas/mexico/agriculture.json')));
  assert.equal(manifest.datasetSha256, sha(await readFile('public/assets/atlas/mexico-agriculture-v1/agriculture.json')));
  assert.equal(manifest.selectedCsvSha256, sha(await readFile('public/assets/atlas/mexico-agriculture-v1/selected-states.csv')));
  for (const archive of manifest.sourceArchives) {
    assert.equal(archive.sha256, sha(await readFile(archive.path)));
    assert.equal(archive.metadata.license, manifest.licenceUrl);
    assert.match(archive.metadata.temporal, /2021-10-01.*2022-09-30/);
  }
  for (const source of manifest.sources) assert.equal(source.workbookSha256, sha(await readFile(source.retainedWorkbook)));
  for (const source of manifest.contextReferences.filter(source => source.retainedWorkbook)) assert.equal(source.workbookSha256, sha(await readFile(source.retainedWorkbook)));
  assert.match(manifest.sourceFootnotes.symbols, /NA.*非該当.*CSV空欄/);
  assert.match(manifest.sources.find(source => source.id === 'autumn-winter').filter, /Sinaloa case only/);
});
