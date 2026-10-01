import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

const lib = await readFile('src/lib/atlas-mexico-agriculture.ts', 'utf8');
const controller = (await readFile('src/scripts/atlas-mexico-agriculture.ts', 'utf8')).replace(/^import \{[\s\S]*?\} from [^;]+;\r?\n/, '');
const readingController=(await readFile('src/components/atlas/MexicoWorkspace.astro','utf8')).match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const code = (await transform(`${readingController}\n${lib}\n${controller}\ninitMexicoAgriculture(document.querySelector('[data-mexico-field="agriculture"]'));`, {loader:'ts', format:'iife'})).code;
const path = 'dist/atlas/north-america/mexico/agriculture/index.html';
async function page(search = '', interactive = false) {
  const window = new Window({url:`https://example.com/insight-journal/atlas/north-america/mexico/agriculture/${search}`, settings:{disableCSSFileLoading:true, disableJavaScriptFileLoading:true, enableJavaScriptEvaluation:interactive, suppressInsecureJavaScriptEnvironmentWarning:true}});
  window.document.write((await readFile(path, 'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g, ''));
  if (interactive) window.eval(code);
  return window;
}

test('Static agriculture HTML contains 32-state distribution, all statistics, forest reading and original-source chain', async () => {
  const window = await page();
  try {
    const doc = window.document;
    assert.equal(doc.querySelectorAll('path[data-agriculture-state-code]').length, 32);
    assert.equal(doc.querySelectorAll('[data-agriculture-symbol]').length, 32);
    assert.equal(doc.querySelectorAll('[data-agriculture-stat-row]').length, 33);
    assert.equal(doc.querySelectorAll('[data-agriculture-fallback-row]').length, 32);
    assert.equal(doc.querySelectorAll('.mexico-items [data-agriculture-metric]').length, 3);
    assert.equal(doc.querySelector('[data-agriculture-state]').value,'');
    assert.equal(doc.querySelectorAll('path[data-agriculture-state-code][aria-pressed="true"]').length,0);
    assert.equal(doc.querySelector('.mexico-reading-content').hidden,true);
    assert.equal(doc.querySelector('[data-mexico-country-summary]').hidden,false);
    assert.match(doc.querySelector('[data-agriculture-reading="pine"]').textContent, /山地.*丸太.*加工.*市場.*水の浸透/s);
    assert.match(doc.querySelector('#mexico-agriculture-sources').textContent, /2021年10月.*2022年9月.*2025年12月.*NA.*非該当.*自由|2021年10月.*Términos de Libre Uso/s);
    assert.match(doc.querySelector('[data-agriculture-nature-comparison]').textContent, /白粒生産.*乾燥気候.*元の白粒.*灌漑/s);
    assert.equal(doc.querySelector('[data-agriculture-map-fallback]').hidden, true);
    assert.ok(doc.querySelector('[data-news-rail]'));
    await access('dist/assets/atlas/mexico-agriculture-v1/selected-states.csv');
    await access('dist/atlas/north-america/mexico/nature/index.html');
  } finally {await window.happyDOM.close();}
});

test('National agriculture overview opens first, same-default Sinaloa is selectable, and country return clears selection',async()=>{
 const window=await page('',true);
 try{
  await window.happyDOM.waitUntilComplete();
  const doc=window.document,root=doc.querySelector('[data-mexico-field="agriculture"]');
  assert.equal(root.dataset.mexicoReadingSelected,'false');
  assert.equal(doc.querySelector('[data-agriculture-state]').value,'');
  assert.equal(doc.querySelectorAll('path[data-agriculture-state-code][aria-pressed="true"]').length,0);
  assert.equal(doc.querySelector('.mexico-reading-content').hidden,true);
  assert.match(doc.querySelector('[data-mexico-country-summary]').textContent,/全国.*白粒.*松材/s);
  const initialReload=await page(window.location.search,true);try{await initialReload.happyDOM.waitUntilComplete();assert.equal(initialReload.document.querySelector('[data-mexico-field="agriculture"]').dataset.mexicoReadingSelected,'false');assert.equal(initialReload.document.querySelector('[data-agriculture-state]').value,'');}finally{await initialReload.happyDOM.close();}
  doc.querySelector('path[data-agriculture-state-code="25"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await window.happyDOM.waitUntilComplete();
  assert.equal(root.dataset.mexicoReadingSelected,'true');
  assert.equal(doc.querySelector('[data-agriculture-state]').value,'25');
  assert.equal(doc.querySelector('path[data-agriculture-state-code="25"]').getAttribute('aria-pressed'),'true');
  assert.equal(doc.querySelector('.mexico-reading-content').hidden,false);
  assert.match(doc.querySelector('[data-agriculture-selection-name]').textContent,/シナロア/);
  doc.querySelector('[data-mexico-overview-button]').click();
  await window.happyDOM.waitUntilComplete();
  assert.equal(root.dataset.mexicoReadingSelected,'false');
  assert.equal(doc.querySelector('[data-agriculture-state]').value,'');
  assert.equal(doc.querySelectorAll('path[data-agriculture-state-code][aria-pressed="true"]').length,0);
  assert.equal(doc.querySelector('.mexico-reading-content').hidden,true);
  assert.equal(new URL(window.location.href).searchParams.get('reading'),'overview');
  const reload=await page(window.location.search,true);try{
   await reload.happyDOM.waitUntilComplete();
   assert.equal(reload.document.querySelector('[data-mexico-field="agriculture"]').dataset.mexicoReadingSelected,'false');
   const select=reload.document.querySelector('[data-agriculture-state]');select.value='08';select.dispatchEvent(new reload.Event('change',{bubbles:true}));
   await reload.happyDOM.waitUntilComplete();
   assert.equal(reload.document.querySelector('[data-mexico-field="agriculture"]').dataset.mexicoReadingSelected,'true');
   assert.equal(reload.document.querySelector('path[data-agriculture-state-code="08"]').getAttribute('aria-pressed'),'true');
   assert.match(reload.document.querySelector('[data-agriculture-selection-name]').textContent,/チワワ/);
  }finally{await reload.happyDOM.close();}
 }finally{await window.happyDOM.close();}
});

test('Irrigation, pine zeros, fallback and focus retain every related geographic object', async () => {
  const window = await page('?metric=irrigation&state=25&only=1&fallback=1', true);
  try {
    const doc = window.document, root = doc.querySelector('[data-mexico-field="agriculture"]');
    const map = doc.querySelector('[data-agriculture-map]');
    assert.equal(root.dataset.agricultureReady, 'true');
    assert.equal(doc.querySelector('[data-agriculture-selection-value]').textContent, '68.9 %');
    assert.equal(map.hasAttribute('hidden'), true);
    assert.equal(doc.querySelector('[data-agriculture-map-fallback]').hidden, false);
    assert.ok(map.classList.contains('is-only'));
    assert.equal(doc.querySelectorAll('path[data-agriculture-state-code]').length, 32);
    assert.equal(doc.querySelectorAll('[data-agriculture-symbol]').length, 32);
    assert.equal(doc.querySelector('[data-agriculture-legend="irrigation"]').hidden, false);
    doc.querySelector('[data-agriculture-fallback]').click();
    assert.equal(map.hasAttribute('hidden'), false);
    assert.equal(doc.querySelector('[data-agriculture-map-fallback]').hidden, true);
    doc.querySelector('[data-agriculture-metric="pine"]').click();
    assert.equal(root.dataset.agricultureCurrentState, '10');
    assert.equal(doc.querySelector('[data-agriculture-selection-value]').textContent, '4,173,804 m³');
    doc.querySelector('[data-agriculture-state]').value = '05';
    doc.querySelector('[data-agriculture-state]').dispatchEvent(new window.Event('change'));
    assert.equal(doc.querySelector('[data-agriculture-selection-value]').textContent, '0 m³');
    assert.equal(doc.querySelector('[data-agriculture-symbol="05"]').getAttribute('r'), '0');
    assert.equal(doc.querySelector('[data-agriculture-legend="pine"]').hidden, false);
    assert.equal(doc.querySelector('[data-agriculture-reading="pine"]').hidden, false);
    assert.match(doc.querySelector('[data-agriculture-comparison-label]').textContent, /松材取得と山地/);
  } finally {await window.happyDOM.close();}
});

test('URL refresh, keyboard selection, history and comparison target restore field state', async () => {
  const window = await page('?metric=pine&state=08&only=1&fallback=1&extra=keep', true);
  try {
    const doc = window.document, root = doc.querySelector('[data-mexico-field="agriculture"]');
    assert.equal(root.dataset.agricultureCurrentMetric, 'pine');
    assert.equal(root.dataset.agricultureCurrentState, '08');
    const link = new URL(doc.querySelector('[data-agriculture-nature-comparison]').href);
    assert.equal(link.searchParams.get('state'), '08');
    assert.equal(link.searchParams.get('sourceMetric'), 'pine');
    assert.equal(link.searchParams.get('sourceOnly'), '1');
    assert.equal(link.searchParams.get('sourceFallback'), '1');
    doc.querySelector('path[data-agriculture-state-code="25"]').dispatchEvent(new window.KeyboardEvent('keydown', {key:'Enter'}));
    assert.equal(root.dataset.agricultureCurrentState, '25');
    assert.equal(new URL(window.location.href).searchParams.get('extra'), 'keep');
    window.history.replaceState(null, '', '?metric=irrigation&state=26&only=1');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(root.dataset.agricultureCurrentMetric, 'irrigation');
    assert.equal(root.dataset.agricultureCurrentState, '26');
    assert.equal(doc.querySelector('[data-agriculture-selection-value]').textContent, '84.7 %');
    assert.equal(doc.querySelector('[data-agriculture-map]').hasAttribute('hidden'), false);
    assert.equal(doc.querySelectorAll('path[data-agriculture-state-code][aria-pressed="true"]').length, 1);
    const reread = await page(new URL(window.location.href).search, true);
    try {assert.equal(reread.document.querySelector('[data-mexico-field="agriculture"]').dataset.agricultureCurrentState, '26');}
    finally {await reread.happyDOM.close();}
  } finally {await window.happyDOM.close();}
});
