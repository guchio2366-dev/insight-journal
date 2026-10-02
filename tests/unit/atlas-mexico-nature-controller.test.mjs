import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const result = await build({stdin: {contents: "import {initMexicoNature} from './src/scripts/atlas-mexico-nature.ts';initMexicoNature(document.querySelector('[data-mexico-workspace]'));", resolveDir: process.cwd(), loader: 'ts'}, bundle: true, platform: 'browser', format: 'iife', write: false});
const code = result.outputFiles[0].text;
function fixture(search) {
  const window = new Window({url: `https://example.test/nature/${search}`, settings: {enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true}});
  const value = state => ({code: state, name: state === '10' ? 'ドゥランゴ' : 'シナロア', point: [100,100], irrigationSharePct: 45, pineObtainedM3: 1000000, maizeWhiteProductionT: state === '10' ? 100000 : 1000000, cattleHeads: state === '10' ? 2500000 : 1000000, density: 50, population: 10000});
  const item = (id, title) => ({id, title, labelJa: title, lead: 'INEGI・原分類', body: `${title}は地域区分。標高の数値ではありません。`});
  const config = {routes: {nature: '/nature/', agriculture: '/agriculture/', population: '/population/'}, defaultViewBox: '0 0 900 580', states: [value('25'),value('10')], sinaloaWinter: {productionT: 1, irrigatedProductionSharePct: 99}, staticMaps: {climate: '/climate.svg', relief: '/relief.svg'}, items: {climate: [item('59','乾燥・温帯')], relief: [item('III','西シエラマドレ'),item('S/It','原資料の地形分類なし')]}};
  window.document.write(`<main data-mexico-workspace><button data-mexico-nature-view="climate"></button><button data-mexico-nature-view="relief"></button><button data-mexico-nature-category="rivers-groundwater"></button><div data-mexico-nature-water-tabs hidden><button data-mexico-nature-category="precipitation"></button></div><select data-mexico-nature-item-select></select><select data-mexico-nature-state-select><option value="25">25</option><option value="10">10</option></select><svg data-mexico-nature-main-map><g data-mexico-nature-layer="climate"><path data-mexico-nature-feature="climate-3" data-nature-class="59"></path></g><g data-mexico-nature-layer="relief"><path data-mexico-nature-feature="relief-5" data-nature-class="III"></path><path data-mexico-nature-feature="relief-6" data-nature-class="S/It"></path></g></svg><section data-mexico-nature-overview></section><section data-mexico-nature-feature-reading><h2 data-mexico-nature-feature-title></h2><p data-mexico-nature-feature-lead></p><p data-mexico-nature-feature-body></p></section><p data-mexico-nature-reference></p><a data-mexico-nature-source-return></a><script type="application/json" data-mexico-nature-config>${JSON.stringify(config)}</script></main>`);
  const root=window.document.querySelector('[data-mexico-workspace]');root.insertAdjacentHTML('beforeend','<svg><g data-mexico-nature-quantity-symbols><circle data-mexico-nature-compare-symbol="25"></circle><circle data-mexico-nature-compare-symbol="10"></circle></g></svg><div data-mexico-nature-quantity-legend><p data-mexico-nature-quantity-definition></p><svg data-mexico-nature-quantity-key></svg><ul data-mexico-nature-quantity-key-values></ul></div>');
  window.eval(code); return window;
}
test('Actual feature click and item selection synchronize description and URL without replacing source quantities', async () => {
  const window = fixture('?compare=irrigation&from=agriculture&sourceMetric=pine&sourceState=10&state=25&view=relief&sourceOnly=1&sourceFallback=1&only=0&frame=210,100,350,220&side=source');
  let restored, switchedReload;
  try {
    const document = window.document, feature = document.querySelector('[data-mexico-nature-feature="relief-5"]');
    feature.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
    const query = new URL(window.location.href).searchParams;
    assert.equal(query.get('feature'), 'relief-5'); assert.equal(query.get('item'), 'III'); assert.equal(query.get('compare'), 'irrigation');
    for (const [key, expected] of Object.entries({sourceMetric:'pine',sourceState:'10',sourceOnly:'1',sourceFallback:'1',only:'0',frame:'210,100,350,220',side:'source',reading:'item'})) assert.equal(query.get(key), expected);
    assert.equal(document.querySelector('[data-mexico-nature-feature-title]').textContent, '西シエラマドレ');
    assert.equal(feature.getAttribute('aria-pressed'), 'true'); assert.equal(document.querySelector('[data-mexico-nature-item-select]').value, 'III');
    document.querySelector('[data-mexico-nature-view="climate"]').click();
    assert.equal(document.querySelector('[data-mexico-nature-feature-reading]').hidden, true);
    assert.equal(new URL(window.location.href).searchParams.get('feature'), 'relief-5');
    assert.equal(document.querySelector('[data-mexico-workspace]').dataset.mexicoNatureView, 'climate');
    switchedReload = fixture(window.location.search);
    assert.equal(switchedReload.document.querySelector('[data-mexico-nature-feature-reading]').hidden, true);
    switchedReload.document.querySelector('[data-mexico-nature-view="relief"]').click();
    assert.equal(switchedReload.document.querySelector('[data-mexico-nature-feature-title]').textContent, '西シエラマドレ');
    document.querySelector('[data-mexico-nature-view="relief"]').click();
    assert.equal(document.querySelector('[data-mexico-nature-feature-title]').textContent, '西シエラマドレ');
    document.querySelector('[data-mexico-nature-category="precipitation"]').click();
    assert.match(document.querySelector('[data-mexico-nature-reference]').textContent, /未整備.*地形地域分布/);
    restored = fixture(window.location.search);
    assert.equal(restored.document.querySelector('[data-mexico-workspace]').dataset.mexicoNatureCategory, 'precipitation');
    assert.match(restored.document.querySelector('[data-mexico-nature-source-return]').href, /state=10.*metric=pine.*only=1.*fallback=1/);
    window.history.replaceState(null, '', '/nature/?view=relief&item=S%2FIt&compare=irrigation&from=agriculture&sourceMetric=pine&state=25&sourceState=10');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.match(document.querySelector('[data-mexico-nature-feature-title]').textContent, /原資料の地形分類なし/);
    assert.equal(document.querySelector('[data-mexico-workspace]').dataset.mexicoNatureCategory, '');
    const picker = document.querySelector('[data-mexico-nature-item-select]'); picker.value='III'; picker.dispatchEvent(new window.Event('change', {bubbles:true}));
    assert.equal(new URL(window.location.href).searchParams.has('feature'), false);
    assert.equal(feature.getAttribute('aria-pressed'), 'true');
  } finally {if(restored)await restored.happyDOM.close();if(switchedReload)await switchedReload.happyDOM.close();await window.happyDOM.close();}
});
test('The source crop/livestock layers retain independent domains, offsets, flags and return selection', async () => {
  const window=fixture('?view=climate&compare=irrigation&from=agriculture&sourceMetric=cattle&sourceState=10&state=25&sourceCrops=1&sourceLivestock=1&sourceOnlyItem=0');
  try {
    const document=window.document, maize=document.querySelector('[data-mexico-nature-quantity-kind="maize"][data-mexico-nature-compare-symbol="25"]'), cattle=document.querySelector('[data-mexico-nature-quantity-kind="cattle"][data-mexico-nature-compare-symbol="25"]');
    assert.equal(maize.getAttribute('cx'),'88'); assert.equal(cattle.getAttribute('cx'),'112'); assert.equal(maize.getAttribute('cy'),'90'); assert.equal(cattle.getAttribute('cy'),'110');
    assert.equal(Number(maize.getAttribute('r')),32); assert.equal(Number(cattle.getAttribute('r')),32*Math.sqrt(1000000/2500000));
    assert.match(document.querySelector('[data-mexico-nature-agriculture-key]').textContent,/白粒.*牛の飼養頭数/s);
    assert.match(document.querySelector('[data-mexico-nature-source-return]').href,/metric=cattle/);
    window.history.replaceState(null,'','/nature/?view=climate&compare=irrigation&from=agriculture&sourceMetric=cattle&state=25&sourceState=10&sourceCrops=0&sourceLivestock=1&sourceOnlyItem=1');window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(maize.style.display,'none'); assert.equal(cattle.getAttribute('cx'),'100');
    assert.match(document.querySelector('[data-mexico-nature-source-return]').href,/crops=0.*onlyItem=1/);
  }finally{await window.happyDOM.close();}
});
