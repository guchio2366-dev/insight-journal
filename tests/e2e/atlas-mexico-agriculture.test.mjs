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
    assert.equal(doc.querySelectorAll('.mexico-items [data-agriculture-metric]').length, 4);
    assert.equal(doc.querySelectorAll('[data-agriculture-cattle-symbol]').length,32);
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
  assert.equal(doc.querySelectorAll('[data-agriculture-pick][aria-pressed="true"]').length,0);
  assert.equal(doc.querySelector('.mexico-reading-content').hidden,true);
  assert.equal(doc.querySelector('[data-agriculture-only]').disabled,true);
  assert.equal(doc.querySelector('[data-agriculture-only]').closest('label').hidden,true);
  assert.equal(doc.querySelector('[data-agriculture-map]').classList.contains('is-only'),false);
  assert.match(doc.querySelector('[data-mexico-country-summary]').textContent,/全国.*白粒.*松材/s);
  const initialReload=await page(window.location.search,true);try{await initialReload.happyDOM.waitUntilComplete();assert.equal(initialReload.document.querySelector('[data-mexico-field="agriculture"]').dataset.mexicoReadingSelected,'false');assert.equal(initialReload.document.querySelector('[data-agriculture-state]').value,'');}finally{await initialReload.happyDOM.close();}
  doc.querySelector('path[data-agriculture-state-code="25"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await window.happyDOM.waitUntilComplete();
  assert.equal(root.dataset.mexicoReadingSelected,'true');
  assert.equal(doc.querySelector('[data-agriculture-state]').value,'25');
  assert.equal(doc.querySelector('path[data-agriculture-state-code="25"]').getAttribute('aria-pressed'),'true');
  assert.ok(doc.querySelector('[data-agriculture-pick="25"][aria-pressed="true"]'));
  assert.equal(doc.querySelector('.mexico-reading-content').hidden,false);
  assert.match(doc.querySelector('[data-agriculture-selection-name]').textContent,/シナロア/);
  const only=doc.querySelector('[data-agriculture-only]');
  assert.equal(only.disabled,false);
  assert.equal(only.closest('label').hidden,false);
  only.checked=true;only.dispatchEvent(new window.Event('change',{bubbles:true}));
  await window.happyDOM.waitUntilComplete();
  assert.equal(doc.querySelector('[data-agriculture-map]').classList.contains('is-only'),true);
  doc.querySelector('[data-mexico-overview-button]').click();
  await window.happyDOM.waitUntilComplete();
  assert.equal(root.dataset.mexicoReadingSelected,'false');
  assert.equal(doc.querySelector('[data-agriculture-state]').value,'');
  assert.equal(doc.querySelectorAll('path[data-agriculture-state-code][aria-pressed="true"]').length,0);
  assert.equal(doc.querySelectorAll('[data-agriculture-pick][aria-pressed="true"]').length,0);
  assert.equal(doc.querySelector('.mexico-reading-content').hidden,true);
  assert.equal(doc.querySelector('[data-agriculture-map]').classList.contains('is-only'),false);
  assert.equal(only.checked,true,'The saved native focus mode remains available for the next selection');
  assert.equal(only.disabled,true);
  assert.equal(only.closest('label').hidden,true);
  assert.equal(new URL(window.location.href).searchParams.get('only'),'1');
  assert.equal(new URL(window.location.href).searchParams.get('reading'),'overview');
  const reload=await page(window.location.search,true);try{
   await reload.happyDOM.waitUntilComplete();
   assert.equal(reload.document.querySelector('[data-mexico-field="agriculture"]').dataset.mexicoReadingSelected,'false');
   assert.equal(reload.document.querySelector('[data-agriculture-map]').classList.contains('is-only'),false);
   assert.equal(reload.document.querySelector('[data-agriculture-only]').disabled,true);
   const select=reload.document.querySelector('[data-agriculture-state]');select.value='08';select.dispatchEvent(new reload.Event('change',{bubbles:true}));
   await reload.happyDOM.waitUntilComplete();
   assert.equal(reload.document.querySelector('[data-mexico-field="agriculture"]').dataset.mexicoReadingSelected,'true');
   assert.equal(reload.document.querySelector('path[data-agriculture-state-code="08"]').getAttribute('aria-pressed'),'true');
   assert.equal(reload.document.querySelector('[data-agriculture-only]').checked,true);
   assert.equal(reload.document.querySelector('[data-agriculture-only]').disabled,false);
   assert.equal(reload.document.querySelector('[data-agriculture-map]').classList.contains('is-only'),true);
   assert.ok(reload.document.querySelector('[data-agriculture-pick="08"][aria-pressed="true"]'));
   assert.match(reload.document.querySelector('[data-agriculture-selection-name]').textContent,/チワワ/);
  }finally{await reload.happyDOM.close();}
 }finally{await window.happyDOM.close();}
});

test('Escape returns a focused irrigation selection to an unfocused country map with a truthful description',async()=>{
 const window=await page('?metric=irrigation&state=25&only=1',true);
 try{
  await window.happyDOM.waitUntilComplete();
  const doc=window.document,root=doc.querySelector('[data-mexico-field="agriculture"]'),map=doc.querySelector('[data-agriculture-map]'),only=doc.querySelector('[data-agriculture-only]');
  assert.equal(root.dataset.mexicoReadingSelected,'true');
  assert.equal(map.classList.contains('is-only'),true);
  root.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await window.happyDOM.waitUntilComplete();
  assert.equal(root.dataset.mexicoReadingSelected,'false');
  assert.equal(map.classList.contains('is-only'),false);
  assert.equal(only.disabled,true);
  assert.equal(only.checked,true);
  assert.equal(only.closest('label').hidden,true);
  assert.equal(doc.querySelectorAll('[data-agriculture-pick][aria-pressed="true"]').length,0);
  assert.equal(doc.querySelectorAll('path[data-agriculture-state-code][aria-pressed="true"]').length,0);
  assert.doesNotMatch(doc.querySelector('#mexico-agriculture-svg-desc').textContent,/円.*生産量/);
  assert.equal(new URL(window.location.href).searchParams.get('metric'),'irrigation');
  assert.equal(new URL(window.location.href).searchParams.get('only'),'1');
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
    assert.equal(root.dataset.agricultureCurrentState, '25','changing the indicator preserves the selected state');
    const data=JSON.parse(await readFile('src/data/atlas/mexico/agriculture.json','utf8'));
    assert.equal(doc.querySelector('[data-agriculture-selection-value]').textContent,Math.round(data.states.find(s=>s.code==='25').pineObtainedM3).toLocaleString('ja-JP')+' m³');
    doc.querySelector('[data-agriculture-state]').value = '05';
    doc.querySelector('[data-agriculture-state]').dispatchEvent(new window.Event('change'));
    assert.equal(doc.querySelector('[data-agriculture-selection-value]').textContent, '0 m³');
    assert.equal(doc.querySelector('[data-agriculture-symbol="05"]').getAttribute('r'), '0');
    assert.equal(doc.querySelector('[data-agriculture-legend="pine"]').hidden, false);
    assert.equal(doc.querySelector('[data-agriculture-reading="pine"]').hidden, false);
    assert.match(doc.querySelector('[data-agriculture-comparison-label]').textContent, /松材取得と山地/);
  } finally {await window.happyDOM.close();}
});

test('Crop and livestock quantities open together; independent switches, item-only view, forest grouping and source flags survive history',async()=>{
 const window=await page('',true);
 try{
  await window.happyDOM.waitUntilComplete();const doc=window.document,root=doc.querySelector('[data-mexico-field="agriculture"]');
  const crop=doc.querySelector('[data-agriculture-symbol="08"]'),cattle=doc.querySelector('[data-agriculture-cattle-symbol="08"]');
  assert.notEqual(crop.style.display,'none');assert.notEqual(cattle.style.display,'none');
  assert.equal(doc.querySelector('[data-agriculture-legend="maize"]').hidden,false);assert.equal(doc.querySelector('[data-agriculture-legend="cattle"]').hidden,false);
  doc.querySelector('[data-agriculture-layer="livestock"]').click();assert.equal(cattle.style.display,'none');assert.notEqual(crop.style.display,'none');
  doc.querySelector('[data-agriculture-metric="cattle"]').click();
  const only=doc.querySelector('[data-agriculture-only-item]');only.checked=true;only.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(crop.style.display,'none');assert.notEqual(cattle.style.display,'none');
  assert.equal(new URL(window.location.href).searchParams.get('livestock'),'0','item-only mode preserves the previous independent switch');
  doc.querySelector('[data-agriculture-layer="livestock"]').click();
  assert.equal(cattle.style.display,'none','switching OFF the visible item acts on its effective display, not the saved pre-item flag');
  assert.equal(only.checked,false);assert.notEqual(crop.style.display,'none');
  only.checked=true;only.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.notEqual(cattle.style.display,'none');assert.equal(crop.style.display,'none');
  const source=new URL(doc.querySelector('[data-agriculture-nature-comparison]').href);
  assert.equal(source.searchParams.get('sourceMetric'),'cattle');assert.equal(source.searchParams.get('sourceLivestock'),'0');assert.equal(source.searchParams.get('sourceOnlyItem'),'1');
  window.history.replaceState(null,'','?metric=cattle&state=08&livestock=0&onlyItem=1&reading=item');window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(root.dataset.agricultureCurrentState,'08');assert.equal(only.checked,true);assert.notEqual(cattle.style.display,'none');
  doc.querySelector('[data-agriculture-group="forestry"]').click();await window.happyDOM.waitUntilComplete();
  assert.equal(root.dataset.agricultureCurrentState,'08');assert.equal(root.dataset.agricultureCurrentMetric,'pine');
  assert.equal(doc.querySelector('[data-agriculture-group-items="agriculture"]').hidden,true);assert.equal(doc.querySelector('[data-agriculture-group-items="forestry"]').hidden,false);
  assert.equal(cattle.style.display,'none');assert.equal(doc.querySelector('[data-agriculture-legend="pine"]').hidden,false);
  doc.querySelector('[data-agriculture-group="agriculture"]').click();await window.happyDOM.waitUntilComplete();
  assert.equal(root.dataset.agricultureCurrentState,'08');assert.equal(only.checked,false);assert.notEqual(crop.style.display,'none');assert.equal(cattle.style.display,'none');
  assert.equal(root.dataset.mexicoReadingSelected,'false','group navigation opens the existing national overview');
 }finally{await window.happyDOM.close();}
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
