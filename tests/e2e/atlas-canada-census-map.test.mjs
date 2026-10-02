import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bundleCanadaSource } from '../fixtures/bundle-canada-source.mjs';
import { Window } from 'happy-dom';

const data = JSON.parse(await readFile('src/data/atlas/canada/census-agriculture.json', 'utf8'));
const geometry = JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/ccs.geojson', 'utf8'));
const helperCode = await bundleCanadaSource('src/lib/atlas-canada-census-map.ts', { format: 'esm', platform: 'node' });
const helper = await import(`data:text/javascript;base64,${Buffer.from(helperCode).toString('base64')}`);
async function nativeCode(beef) {
  const name=beef?'Beef':'Agriculture',selector=beef?'beef':'agriculture';
  let code=await bundleCanadaSource(`src/scripts/atlas-canada-${selector}.ts`,{globalName:'CensusNative'});
  code+=`\nCensusNative.initCanada${name}(document.querySelector('[data-canada-${selector}]'));`;
  if(!beef){code+=await bundleCanadaSource('src/scripts/atlas-canada-agriculture-overview.ts',{globalName:'CensusOverview'});code+="\nCensusOverview.initCanadaAgricultureOverview(document.querySelector('[data-canada-agriculture]'));";}
  return code;
}
const codes = { crop: await nativeCode(false), beef: await nativeCode(true) };
const change = (w, selector, value) => { const input = w.document.querySelector(selector); input.value = String(value); input.dispatchEvent(new w.Event('change')); };
async function page(product, query = '', interactive = true) {
  const suffix = product === 'canola' ? '' : product === 'wheat' ? 'wheat/' : 'beef/';
  const search = query || (product === 'canola' ? '?item=canola&render=static' : product === 'wheat' ? '?render=static' : `?map=${product}&render=static`);
  const w = new Window({ url: `https://example.com/insight-journal/atlas/north-america/canada/agriculture/${suffix}${search}`, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  const html = await readFile(`dist/atlas/north-america/canada/agriculture/${suffix}index.html`, 'utf8');
  w.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g, ''));
  if(interactive)w.eval(product === 'canola' || product === 'wheat' ? codes.crop : codes.beef);
  return w;
}

test('Census choropleths retain exact official geometry, distinct zero/F/uncovered classes and checked province labels', () => {
  for (const product of ['canola', 'wheat', 'beef', 'pasture', 'hay']) {
    const joined = helper.joinCanadaCensusGeometry(geometry, data.records, product);
    assert.equal(joined.features.length, 1757);
    for (const [index, feature] of joined.features.entries()) {
      const cell = data.records[feature.id].cells[product];
      assert.equal(feature.geometry, geometry.features[index].geometry);
      assert.equal(feature.properties.DGUID, geometry.features[index].properties.DGUID);
      assert.equal(feature.properties.status, cell.status);
      assert.equal(feature.properties.color, helper.canadaCensusColor(cell, product));
    }
    const zero = Object.values(data.records).find(record => record.cells[product].status === 'published' && record.cells[product].value === 0).cells[product];
    const missing = Object.values(data.records).find(record => record.cells[product].status === 'quality-f').cells[product];
    const uncovered = Object.values(data.records).find(record => !record.covered).cells[product];
    assert.notEqual(helper.canadaCensusColor(zero, product), helper.canadaCensusColor(missing, product));
    assert.notEqual(helper.canadaCensusColor(missing, product), helper.canadaCensusColor(uncovered, product));
    assert.match(helper.canadaCensusValueText(zero, data.products[product].unit), /^0 /);
    assert.match(helper.canadaCensusValueText(missing, data.products[product].unit), /非公表/);
    assert.match(helper.canadaCensusValueText(uncovered, data.products[product].unit), /ゼロではありません/);
    assert.equal(helper.canadaCensusLegend(product, data.products[product].unit).length, 6);
  }
  const labels = helper.canadaCensusGeographicLabels(geometry);
  for (const label of labels) assert.ok(geometry.features.some(feature => String(feature.properties.PRUID) === label.id && helper.canadaCensusContains(feature.geometry, label.labelAnchor)), `${label.name} must be anchored within its official province geometry`);
  assert.ok(labels.length >= 10);
  const cautious = Object.values(data.records).flatMap(record => Object.entries(record.cells)).find(([, cell]) => cell.status === 'published' && (cell.quality === 'E' || cell.components.some(component => component.quality === 'E')));
  assert.match(helper.canadaCensusValueText(cautious[1], data.products[cautious[0]].unit), /注意して利用/);
});

test('Canola and wheat select actual CCS quantities while annual year and province comparison stay independent', async () => {
  for (const product of ['canola', 'wheat']) {
    const w = await page(product);
    try {
      const d = w.document, q = selector => d.querySelector(selector), records = JSON.parse(q('[data-canada-census-config]').textContent).records;
      assert.equal(d.querySelectorAll('[data-canada-census-shape]').length, 1757);
      assert.equal(d.querySelectorAll('[data-canada-census-status]').length, 1);
      assert.equal(q('[data-canada-census-status]').localName, 'p');
      assert.equal(q('.canada-census-original').open, false);
      assert.ok(q('.canada-census-original img'));
      assert.ok(Object.values(records).every(record => Object.keys(record.cells).length === 1), 'only needed display products should be inline');
      assert.ok(Object.values(records).every(record => record.cells[product].components.every(component => !('vector' in component) && !('coordinate' in component))), 'CSV provenance stays in source assets');
      const [id, record] = Object.entries(records).find(([, record]) => record.cells[product].status === 'published' && record.cells[product].value > 0);
      change(w, '[data-canada-census-region]', id);
      assert.equal(new URL(w.location.href).searchParams.get('ccs'), id);
      assert.equal(q('[data-canada-census-reading]').hidden, false);
      assert.equal(q('[data-canada-census-selected-value]').hidden,false);
      assert.equal(q('[data-canada-census-selected-value]').textContent,helper.canadaCensusShortValueText(record.cells[product],data.products[product].unit));
      assert.ok(q('[data-canada-census-reading-title]').textContent.includes(record.name));
      assert.equal(q('.canada-census-reading-details').open, false);
      assert.equal(q('[data-canada-census-national-header]').hidden, true);
      assert.ok(q('[data-canada-census-reading-quality]').textContent.includes('品質'));
      assert.ok(q('[data-canada-census-reading-value]').textContent.includes(record.cells[product].value.toLocaleString('ja-JP')));
      assert.match(q('[data-canada-census-reading-id]').textContent, /農場の本拠地/);
      const year = data.year === 2021 ? '2025' : '2021';
      change(w, '[data-canola-year]', year);
      assert.equal(q('[data-canola-year]').value, year);
      assert.match(q('[data-canada-census-map-title]').textContent, /2021/);
      assert.equal(new URL(w.location.href).searchParams.get('ccs'), id);
      q('[data-canada-census-only]').checked = true; q('[data-canada-census-only]').dispatchEvent(new w.Event('change'));
      assert.equal(d.querySelectorAll('[data-canada-census-shape]:not([hidden])').length, 1);
      assert.equal(new URL(w.location.href).searchParams.get('ccsOnly'), '1');
      q('[data-canada-census-zoom="in"]').click();
      const savedBounds = new URL(w.location.href).searchParams.get('ccsBounds'); assert.ok(savedBounds);
      const restored = await page(product, w.location.search);
      try { assert.equal(restored.document.querySelector('[data-canada-census-region]').value, id); assert.equal(restored.document.querySelector('[data-canada-census-only]').checked, true); } finally { await restored.happyDOM.close(); }
      w.history.replaceState(null, '', product === 'canola' ? '?item=canola&year=2021&render=static' : '?year=2021&render=static'); w.dispatchEvent(new w.PopStateEvent('popstate'));
      assert.equal(q('[data-canada-census-region]').value, ''); assert.equal(q('[data-canada-census-only]').checked, false);
      assert.equal(d.querySelectorAll('[data-canada-census-shape]:not([hidden])').length, 1757);
      assert.equal(q('[data-canola-year]').value, '2021');
      assert.equal(q('[data-canada-census-national-header]').hidden, false);
      assert.equal(q('[data-canada-census-reading]').hidden, true);
    } finally { await w.happyDOM.close(); }
  }
});

test('Beef, pasture and defined two-component hay share boundaries and expose exact source grades and quantities', async () => {
  const w = await page('beef');
  try {
    const d = w.document, q = selector => d.querySelector(selector), [id, record] = Object.entries(data.records).find(([, record]) => record.covered && record.cells.beef.status === 'published' && record.cells.pasture.status === 'published' && record.cells.hay.status === 'published');
    change(w, '[data-canada-census-region]', id);
    assert.equal(d.querySelectorAll('[data-canada-census-status]').length, 1);
    assert.equal(q('[data-canada-census-status]').localName, 'p');
    assert.equal(q('[data-canada-census-national-header]').hidden, true);
    assert.equal(q('.canada-census-reading-details').open, false);
    for (const product of ['beef', 'pasture', 'hay']) {
      // A renderer or DOM transformation may omit a path title. Product changes must recover it.
      if(product!=='beef')q('[data-canada-census-shape] title')?.remove();
      change(w, '[data-beef-map]', product);
      assert.match(q('[data-canada-census-map-title]').textContent, /2021/);
      assert.ok(q('[data-canada-census-legend-title]').textContent.includes(data.products[product].label));
      assert.ok(q('[data-canada-census-reading-value]').textContent.includes(record.cells[product].value.toLocaleString('ja-JP')));
      assert.equal(q('[data-canada-census-selected-value]').textContent,helper.canadaCensusShortValueText(record.cells[product],data.products[product].unit));
      for (const component of record.cells[product].components) assert.ok(q('[data-canada-census-reading-components]').textContent.includes(component.variable));
      for(const shape of d.querySelectorAll('[data-canada-census-shape]')){const title=shape.querySelector('title');assert.ok(title);assert.ok(title.textContent.includes(data.products[product].label));assert.match(title.textContent,/2021/);}
      assert.equal(new URL(w.location.href).searchParams.get('ccs'), id);
    }
    assert.ok(q('[data-canada-census-definition]').textContent.includes(data.products.hay.definition), 'hay definition must retain the exact source-backed two-component scope');
    assert.match(q('[data-canada-census-definition]').textContent, /採種用牧草(?:を含まない|は含めない)/);
    assert.equal(q('[data-beef-map]').selectedOptions[0].textContent, data.products.hay.label);
    assert.ok(q('[data-canada-crop-nature-primary]').textContent.includes(data.products.hay.label));
    q('[data-canada-census-reset]').click();
    assert.equal(new URL(w.location.href).searchParams.has('ccs'), false);
    assert.equal(new URL(w.location.href).searchParams.has('ccsBounds'), false);
    assert.equal(q('[data-canada-census-national-header]').hidden, false);
    assert.equal(q('[data-canada-census-reading]').hidden, true);
  } finally { await w.happyDOM.close(); }
});

test('Census map URL state validates region and geographic camera independently of annual controls', () => {
  const ids = Object.keys(data.records), selected = ids[0], state = { selected, only: true, bounds: [-120, 40, -90, 60] };
  const url = helper.writeCanadaCensusMapState(new URL('https://example.com/agriculture/?year=2025&province=Alberta&keep=yes'), state);
  assert.deepEqual(helper.readCanadaCensusMapState(url, ids), state);
  assert.equal(url.searchParams.get('year'), '2025'); assert.equal(url.searchParams.get('province'), 'Alberta'); assert.equal(url.searchParams.get('keep'), 'yes');
  for (const query of ['?ccs=unknown&ccsOnly=1', '?ccsBounds=NaN,20,30,40', '?ccsBounds=10,20,5,40', '?ccsBounds=-200,20,30,40']) assert.equal(helper.readCanadaCensusMapState(new URL('https://example.com/' + query), ids).bounds, null);
  assert.equal(helper.readCanadaCensusMapState(new URL('https://example.com/?ccs=unknown&ccsOnly=1'), ids).only, false);
});

test('Optional official climate annotations retain true locations, remain separate in only mode and report offscreen stations', async () => {
  const climate = JSON.parse(await readFile('src/data/atlas/canada/climate.json', 'utf8'));
  // HappyDOM serializes CSS px lengths to six decimals; source coordinate assertions remain exact.
  const cssPixelTolerance=1e-6;
  for (const station of climate.stations) {
    const resolved = helper.resolveCanadaCensusObservation(station);
    assert.equal(resolved.name, station.name);
    assert.equal(resolved.station, station.station);
    assert.deepEqual(resolved.coordinates, station.coordinates);
  }
  assert.equal(helper.resolveCanadaCensusObservation({name:'invented',coordinates:climate.stations[0].coordinates}), null);
  assert.equal(helper.resolveCanadaCensusObservation({...climate.stations[0],coordinates:[-100,50]}), null);
  const w = await page('canola', '?item=canola&render=static', false);
  try {
    const root=w.document.querySelector('[data-canada-census]'),stage=root.querySelector('[data-canada-census-stage]');
    Object.defineProperty(stage,'clientWidth',{value:640});
    Object.defineProperty(stage,'clientHeight',{value:360});
    w.eval(await bundleCanadaSource('src/scripts/atlas-canada-census-map.ts',{globalName:'CensusAnnotation'})+"\nwindow.annotationController=CensusAnnotation.initCanadaCensusMap(document.querySelector('[data-canada-census]'));");
    const controller=w.annotationController,marker=root.querySelector('[data-canada-census-observation]'),key=root.querySelector('[data-canada-census-observation-key]'),outside=root.querySelector('[data-canada-census-observation-outside]'),label=root.querySelector('[data-canada-census-observation-label]');
    const initialUrl=w.location.href,cameraEvents=[];root.addEventListener('canada-census-camera',event=>cameraEvents.push(event.detail));
    assert.equal(marker.hidden,true);assert.equal(key.hidden,true);
    for(const station of climate.stations){
      controller.render({product:'canola',selected:null,only:false,bounds:null,observation:station});
      const frame=root.querySelector('[data-canada-census-fallback]').getAttribute('viewBox').split(' ').map(Number),point=helper.projectCanadaCensus(station.coordinates),ratio=Math.min(640/frame[2],360/frame[3]);
      const expected=[(point[0]-frame[0])*ratio+(640-frame[2]*ratio)/2,(point[1]-frame[1])*ratio+(360-frame[3]*ratio)/2];
      assert.ok(Math.abs(parseFloat(marker.style.left)-expected[0])<cssPixelTolerance);assert.ok(Math.abs(parseFloat(marker.style.top)-expected[1])<cssPixelTolerance);
      assert.equal(marker.hidden,false);assert.equal(key.hidden,false);assert.equal(outside.hidden,true);
      assert.ok(label.textContent.includes(station.name));assert.ok(label.textContent.includes(station.station));assert.match(key.textContent,/気候観測点（面積・頭数ではない）/);
    }
    const station=climate.stations.find(station=>station.id==='regina'),selected=Object.keys(data.records)[0];
    controller.render({product:'canola',selected,only:true,bounds:null,observation:station});
    assert.equal(root.querySelectorAll('[data-canada-census-shape]:not([hidden])').length,1);assert.equal(marker.hidden,false);assert.equal(key.hidden,false);
    const bounds=[-80,44,-70,49];controller.render({product:'canola',selected,only:true,bounds,observation:station});
    assert.equal(marker.hidden,true);assert.equal(outside.hidden,false);assert.match(outside.textContent,/表示範囲外/);
    const frame=root.querySelector('[data-canada-census-fallback]').getAttribute('viewBox').split(' ').map(Number),point=helper.projectCanadaCensus(station.coordinates),ratio=Math.min(640/frame[2],360/frame[3]);
    assert.ok(Math.abs(parseFloat(marker.style.left)-((point[0]-frame[0])*ratio+(640-frame[2]*ratio)/2))<cssPixelTolerance,'offscreen marker must not move to a false location');
    assert.equal(w.location.href,initialUrl);assert.equal(cameraEvents.length,0);
    controller.render({product:'canola',selected,only:true});assert.equal(marker.hidden,true);assert.equal(key.hidden,true);assert.equal(root.querySelector('[data-canada-census-only]').checked,true);
    controller.destroy();
  } finally { await w.happyDOM.close(); }
});

test('Compact selected quantities preserve zero, suppressed and uncovered values without assigning a derived quality grade', () => {
  const published={value:118846,quality:'A',status:'published',components:[]};
  assert.equal(helper.canadaCensusShortValueText(published,'ha'),'118,846 ha（品質 A）');
  assert.equal(helper.canadaCensusShortValueText({...published,value:0},'頭'),'0 頭（品質 A）');
  assert.equal(helper.canadaCensusShortValueText({...published,value:null,quality:'F',status:'quality-f'},'ha'),'非公表（品質 F）');
  assert.match(helper.canadaCensusShortValueText({...published,value:null,quality:null,status:'not-covered'},'ha'),/対象外.*ゼロではありません/);
  assert.equal(helper.canadaCensusShortValueText({...published,value:27174,quality:null,components:[{quality:'B'},{quality:'B'}]},'ha'),'27,174 ha');
  assert.match(helper.canadaCensusShortValueText({...published,quality:'E'},'ha'),/品質 E.*注意して利用/);
});
