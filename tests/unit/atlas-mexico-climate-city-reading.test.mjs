import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {transform} from '@astrojs/compiler-rs';
import {transform as stripTypes, build} from 'esbuild';
import {experimental_AstroContainer} from 'astro/container';
import {Window} from 'happy-dom';

const json = async path => JSON.parse(await readFile(path, 'utf8'));
const normals = await json('src/data/atlas/mexico/climate-normals.json');
const readings = await json('src/data/atlas/mexico/climate-city-reading.json');
const audit = await json(readings.auditFile);
const dataUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
async function compile(file, imports = {}) {
 const compiled = transform(await readFile(file, 'utf8'), {filename:file, internalURL:import.meta.resolve('astro/compiler-runtime'), resolvePath:specifier => specifier});
 assert.deepEqual(compiled.diagnostics, []);
 let code = compiled.code.replaceAll('"astro/runtime/server/index.js"', JSON.stringify(import.meta.resolve('astro/runtime/server/index.js')));
 for (const [specifier, url] of Object.entries(imports)) code = code.replaceAll(JSON.stringify(specifier), JSON.stringify(url));
 return dataUrl((await stripTypes(code, {loader:'ts',format:'esm'})).code);
}
const plot = await compile('src/components/atlas/AtlasClimatePlot.astro', {
 '../../lib/atlas-climate-axes': new URL('../../src/lib/atlas-climate-axes.ts', import.meta.url).href,
});
const componentUrl = await compile('src/components/atlas/MexicoClimateDiagrams.astro', {
 './AtlasClimatePlot.astro': plot,
 '../../data/atlas/mexico/climate-normals.json': dataUrl(`export default ${JSON.stringify(normals)}`),
 '../../data/atlas/mexico/climate-city-reading.json': dataUrl(`export default ${JSON.stringify(readings)}`),
});
const component = (await import(componentUrl)).default;
const container = await experimental_AstroContainer.create();
const html = await container.renderToString(component);
const controller = (await build({entryPoints:['src/scripts/atlas-mexico-climate.ts'],bundle:true,format:'iife',globalName:'Climate',write:false})).outputFiles[0].text;
async function setup(search='') {
 const window = new Window({url:`https://example.test/nature/${search}`,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.body.innerHTML = `<main>${html}</main>`;
 window.eval(controller+';Climate.initMexicoClimate(document.querySelector("main"));');
 return window;
}

test('city classes reproduce from original official SHP/DBF and exact SMN source coordinates', async () => {
 const scratch = await mkdtemp(join(tmpdir(), 'mexico-city-climate-'));
 try {
  const output = join(scratch, 'audit.json');
  execFileSync(process.execPath, ['scripts/audit-mexico-city-climate.mjs', process.cwd(), output], {stdio:'pipe'});
  assert.deepEqual(await json(output), audit);
  for (const item of readings.stations) {
   const original = audit.results.find(result => result.stationId === item.id);
   const station = normals.stations.find(station => station.id === item.id);
   assert.deepEqual(item.coordinates, station.coordinates);
   assert.equal(item.stationId, station.stationId);
   assert.equal(item.sourceFeatureId, original.original.featureId);
   assert.equal(item.sourceObjectId, original.original.objectId);
   for (const key of ['classId','sourceCode','sourceLabel']) assert.equal(item[key], original.original[key]);
   assert.equal(item.labelJa, original.labelJa);
   assert.equal(original.original.strictlyInside, true);
   assert.equal(original.displayGeometryMatches.length, 1);
   assert.equal(original.classificationObservationPeriod, null);
  }
 } finally { await rm(scratch, {recursive:true,force:true}); }
});

test('actual city markup puts original classification and explanation immediately after each plot', async () => {
 const window = await setup();
 try {
  for (const item of readings.stations) {
   const plot = window.document.querySelector(`[data-mexico-climate-plot="${item.id}"]`);
   const reading = plot.querySelector('[data-mexico-climate-city-reading]');
   assert.equal(plot.querySelector(':scope > svg').nextElementSibling, reading);
   assert.equal(reading.querySelector('[data-mexico-climate-city-class]').textContent, `${item.labelJa}｜${item.sourceCode}`);
   assert.equal(reading.querySelector('[data-mexico-climate-city-explanation]').textContent, item.explanationJa);
   assert.equal(reading.dataset.climateSourceFeature, item.sourceFeatureId);
   assert.match(reading.querySelector('[data-mexico-climate-city-classification-note]').textContent, /観測所所在地.*INEGI.*García.*2008.*米国版.*同一ではありません/);
   const details = plot.querySelector('[data-mexico-climate-city-observations]');
   assert.equal(details.open, false);
   assert.ok(reading.compareDocumentPosition(details) & window.Node.DOCUMENT_POSITION_FOLLOWING);
   assert.equal(details.querySelector('[data-mexico-climate-observation-reading]').textContent, item.observationReadingJa);
   assert.equal(details.querySelectorAll('tbody tr').length, 12);
   assert.ok(details.textContent.includes(item.locationCautionJa));
   const station = normals.stations.find(station => station.id === item.id);
   assert.ok(details.textContent.includes(station.scopeNoteJa));
   assert.equal(details.querySelector('a').href, station.sourceUrl);
   assert.match(details.textContent, /1991–2020/);
  }
  assert.match(window.document.querySelector('.mexico-climate-code-reading').textContent, /BS1.*BS0.*BW/);
 } finally { await window.happyDOM.close(); }
});

test('city selection and history restore the matching classification without changing comparison or camera', async () => {
 const window = await setup('?view=climate&state=25&frame=10,20,450,290');
 try {
  const active = () => [...window.document.querySelectorAll('[data-mexico-climate-plot]')].filter(plot => !plot.hidden);
  assert.equal(active().length, 1);
  assert.equal(active()[0].querySelector('[data-mexico-climate-city-class]').textContent, '温帯・亜湿潤｜C(w1)(w)');
  window.document.querySelector('[data-mexico-climate-city="culiacan-dge"]').dispatchEvent(new window.MouseEvent('click', {bubbles:true}));
  assert.equal(active().length, 1);
  assert.equal(active()[0].querySelector('[data-mexico-climate-city-class]').textContent, "半乾燥・高温｜BS1(h')hw");
  assert.equal(new URL(window.location).searchParams.get('frame'), '10,20,450,290');
  window.history.back(); await window.happyDOM.waitUntilComplete();
  assert.equal(active()[0].querySelector('[data-mexico-climate-city-class]').textContent, '温帯・亜湿潤｜C(w1)(w)');
 } finally { await window.happyDOM.close(); }
});
