import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const result = await build({stdin: {contents: "import {initMexicoNature} from './src/scripts/atlas-mexico-nature.ts';initMexicoNature(document.querySelector('[data-mexico-workspace]'));", resolveDir: process.cwd(), loader: 'ts'}, bundle: true, platform: 'browser', format: 'iife', write: false});
const code = result.outputFiles[0].text;
function fixture(search, water = false) {
  const window = new Window({url: `https://example.test/nature/${search}`, settings: {enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true}});
  const value = state => ({code: state, name: state === '10' ? 'ドゥランゴ' : 'シナロア', point: [100,100], irrigationSharePct: 45, pineObtainedM3: 1000000, maizeWhiteProductionT: state === '10' ? 100000 : 1000000, cattleHeads: state === '10' ? 2500000 : 1000000, density: 50, population: 10000});
  const item = (id, title) => ({id, title, labelJa: title, lead: 'INEGI・原分類', body: `${title}は地域区分。標高の数値ではありません。`});
  const config = {routes: {nature: '/nature/', agriculture: '/agriculture/', population: '/population/'}, defaultViewBox: '0 0 900 580', states: [value('25'),value('10')], sinaloaWinter: {productionT: 1, irrigatedProductionSharePct: 99}, staticMaps: {climate: '/climate.svg', relief: '/relief.svg'}, items: {climate: [item('59','乾燥・温帯')], relief: [item('III','西シエラマドレ'),item('S/It','原資料の地形分類なし')]}};
  window.document.write(`<main data-mexico-workspace><button data-mexico-nature-view="climate"></button><button data-mexico-nature-view="relief"></button><button data-mexico-nature-category="rivers-groundwater"></button><div data-mexico-nature-water-tabs hidden><button data-mexico-nature-category="precipitation"></button></div><select data-mexico-nature-item-select></select><select data-mexico-nature-state-select><option value="25">25</option><option value="10">10</option></select><svg data-mexico-nature-main-map><g data-mexico-nature-layer="climate"><path data-mexico-nature-feature="climate-3" data-nature-class="59"></path></g><g data-mexico-nature-layer="relief"><path data-mexico-nature-feature="relief-5" data-nature-class="III"></path><path data-mexico-nature-feature="relief-6" data-nature-class="S/It"></path></g></svg><section data-mexico-nature-overview></section><section data-mexico-nature-feature-reading><h2 data-mexico-nature-feature-title></h2><p data-mexico-nature-feature-lead></p><p data-mexico-nature-feature-body></p></section><p data-mexico-nature-reference></p><a data-mexico-nature-source-return></a><script type="application/json" data-mexico-nature-config>${JSON.stringify(config)}</script></main>`);
  const root=window.document.querySelector('[data-mexico-workspace]');root.insertAdjacentHTML('beforeend','<svg><g data-mexico-nature-quantity-symbols><circle data-mexico-nature-compare-symbol="25"></circle><circle data-mexico-nature-compare-symbol="10"></circle></g></svg><div data-mexico-nature-quantity-legend><p data-mexico-nature-quantity-definition></p><svg data-mexico-nature-quantity-key></svg><ul data-mexico-nature-quantity-key-values></ul></div>');
  if(water){
    root.querySelector('[data-mexico-nature-config]').textContent=JSON.stringify({...config,waterAssetBase:'/water/'});
    const label=window.document.createElement('label'),nativePicker=root.querySelector('[data-mexico-nature-item-select]');nativePicker.before(label);label.append(nativePicker);
    const group=window.document.createElementNS('http://www.w3.org/2000/svg','g');group.setAttribute('data-mexico-hydrology-overlay','');root.querySelector('[data-mexico-nature-main-map]').append(group);
    root.insertAdjacentHTML('beforeend','<ul data-mexico-hydrology-legend></ul><div data-mexico-hydrology-reading><h2 data-mexico-hydrology-title></h2><p data-mexico-hydrology-lead></p><p data-mexico-hydrology-status></p><button data-mexico-hydrology-retry></button></div><select data-mexico-hydrology-item></select><a data-mexico-nature-plain-return></a><a data-mexico-nature-compare-link="population"></a><p data-mexico-nature-comparison-body></p><p data-mexico-nature-comparison-definition></p>');
    const body=window.document.createElement('div');body.className='mexico-nature-reading-body';body.setAttribute('data-mexico-hydrology-body','');body.innerHTML='<p data-mexico-hydrology-value></p><p data-mexico-hydrology-definition></p><p data-mexico-hydrology-limitations></p><div data-mexico-hydrology-source></div>';root.querySelector('[data-mexico-hydrology-reading]').append(body);
    const comparison=window.document.createElement('section');comparison.setAttribute('data-mexico-nature-comparison','');comparison.innerHTML='<h2 data-mexico-nature-comparison-title></h2><p data-mexico-nature-comparison-lead></p><div class="mexico-nature-reading-body"></div>';root.append(comparison);for(const selector of ['[data-mexico-nature-comparison-body]','[data-mexico-nature-comparison-definition]','[data-mexico-nature-plain-return]'])comparison.lastElementChild.append(root.querySelector(selector));
    const dock=window.document.createElement('nav');dock.className='mexico-nature-comparison-dock';root.querySelector('[data-mexico-hydrology-reading]').before(dock);dock.append(root.querySelector('[data-mexico-nature-compare-link]'));const overview=window.document.createElement('button');overview.setAttribute('data-mexico-overview-button','');overview.textContent='メキシコの概要';root.prepend(overview);
    root.insertAdjacentHTML('beforeend','<p data-mexico-nature-comparison-value></p><div data-mexico-water-background-key hidden><p data-mexico-water-background-key-title></p><div data-mexico-water-background-key-host></div></div><ul data-mexico-nature-legend="climate">'+Array.from({length:6},(_,i)=>`<li><i style="background:rgb(${i},0,0)"></i>気候群${i}</li>`).join('')+'</ul><ul data-mexico-nature-legend="relief">'+Array.from({length:16},(_,i)=>`<li><i class="${i===15?'is-missing':''}"></i>地形地域${i}</li>`).join('')+'</ul>');
    comparison.lastElementChild.prepend(root.querySelector('[data-mexico-nature-comparison-value]'));root.insertAdjacentHTML('beforeend','<select data-mexico-hydrology-base><option value="plain">白地図</option><option value="climate">気候</option><option value="relief">地形</option></select>');
    window.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('manifest.json')?{layers:{contours:{file:'contours.json',publisher:'NOAA NCEI',edition:2022,displayIntervalM:500}}}:{type:'FeatureCollection',features:[{type:'Feature',properties:{id:'contours-1000-1',name:'1000 m',elevationM:1000},geometry:{type:'LineString',coordinates:[[-104,24],[-102,25]]}}]}});
  }
  window.eval(code); return window;
}

test('Water target comparison and named natural return retain the actual segment, background and source while defining the contour as a line', async()=>{
  const wait=async window=>{for(let n=0;n<100&&window.document.querySelector('[data-mexico-workspace]').dataset.mexicoHydrologyReady!=='true';n++)await new Promise(resolve=>setTimeout(resolve,5));};
  const window=fixture('?category=elevation&waterFeature=contours:contours-1000-1&waterBase=relief&compare=population&from=population&sourceView=population&sourceState=10&state=25&frame=210,100,350,220',true);let restored;
  try{
    await wait(window);const document=window.document,link=new URL(document.querySelector('[data-mexico-nature-plain-return]').href);
    assert.equal(link.searchParams.get('waterFeature'),'contours:contours-1000-1');assert.equal(link.searchParams.get('waterBase'),'relief');assert.equal(link.searchParams.get('compare'),null);
    assert.equal(link.searchParams.get('sourceState'),'10');assert.equal(link.searchParams.get('frame'),'210,100,350,220');
    assert.match(document.querySelector('[data-mexico-nature-comparison-body]').textContent,/等高線は同じ標高m（EGM2008）を結ぶ線/);assert.doesNotMatch(document.querySelector('[data-mexico-nature-comparison-body]').textContent,/地域の分類|自然地域の境/);
    assert.equal(document.querySelector('[data-mexico-hydrology-reading]').hidden,true,'A water comparison shows one reading section');
    assert.ok(document.querySelector('[data-mexico-water-comparison-details]').contains(document.querySelector('[data-mexico-hydrology-body]')),'Original water body and sources remain reachable inside comparison');
    assert.equal(document.querySelectorAll('[data-mexico-hydrology-body]').length,1);assert.equal(document.querySelectorAll('[data-mexico-hydrology-source]').length,1);
    assert.ok(!document.querySelector('[data-mexico-nature-comparison]').contains(document.querySelector('[data-mexico-nature-plain-return]')),'Named return is fixed outside the scrolling comparison body');
    assert.ok(document.querySelector('[data-mexico-nature-comparison] .mexico-nature-reading-body').contains(document.querySelector('[data-mexico-overview-button]')));assert.ok(document.querySelector('[data-mexico-water-reading-actions]').contains(document.querySelector('[data-mexico-nature-plain-return]')));assert.equal(document.querySelectorAll('[data-mexico-overview-button]').length,1);
    assert.match(document.querySelector('[data-mexico-nature-compare-link="population"]').getAttribute('aria-label'),/標高・等高線と人口規模/);
    const target=new URL(document.querySelector('[data-mexico-nature-compare-link="population"]').href);assert.equal(target.searchParams.get('waterFeature'),'contours:contours-1000-1');assert.equal(target.searchParams.get('waterBase'),'relief');
    restored=fixture(link.search,true);await wait(restored);assert.equal(restored.document.querySelector('[data-mexico-workspace]').dataset.mexicoWaterFeature,'contours:contours-1000-1');
    assert.match(restored.document.querySelector('[data-mexico-hydrology-lead]').textContent,/原DEMから作成した1,000 m/);
    window.history.replaceState(null,'',link);window.dispatchEvent(new window.PopStateEvent('popstate'));await wait(window);
    assert.equal(document.querySelector('[data-mexico-hydrology-reading]').hidden,false);assert.ok(document.querySelector('[data-mexico-hydrology-reading]').contains(document.querySelector('[data-mexico-hydrology-body]')));assert.ok(document.querySelector('[data-mexico-nature-comparison]').contains(document.querySelector('[data-mexico-nature-plain-return]')));
    assert.equal(document.querySelector('[data-mexico-water-reading-actions]'),null);assert.equal(document.querySelectorAll('[data-mexico-overview-button]').length,1);
  }finally{await window.happyDOM.close();await restored?.happyDOM.close();}
});
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
test('Comparison entry names follow the metric retained by their destination URL',async()=>{
  for(const [metric,label] of [['cattle','牛頭数'],['maize','白粒トウモロコシ生産量'],['pine','松材取得量']]){const window=fixture(`?category=elevation&compare=irrigation&from=agriculture&sourceMetric=${metric}&sourceState=10&state=25`,true);try{const root=window.document.querySelector('[data-mexico-workspace]'),link=window.document.createElement('a');link.setAttribute('data-mexico-nature-compare-link','irrigation');root.append(link);window.dispatchEvent(new window.PopStateEvent('popstate'));assert.match(link.textContent,new RegExp(label));assert.equal(new URL(link.href).searchParams.get('sourceMetric'),metric);}finally{await window.happyDOM.close();}}
});

test('Active background keys, fixed state values and truthful comparison copy retain original nodes through base and mode changes',async()=>{
  const window=fixture('?category=elevation&waterFeature=contours:contours-1000-1&waterBase=climate&compare=irrigation&from=agriculture&sourceMetric=irrigation&sourceState=10&state=25',true);
  const wait=async()=>{for(let n=0;n<100&&window.document.querySelector('[data-mexico-workspace]').dataset.mexicoHydrologyReady!=='true';n++)await new Promise(resolve=>setTimeout(resolve,5));};
  try{
    await wait();const document=window.document,climate=document.querySelector('[data-mexico-nature-legend="climate"]'),relief=document.querySelector('[data-mexico-nature-legend="relief"]'),value=document.querySelector('[data-mexico-nature-comparison-value]'),dock=document.querySelector('.mexico-nature-comparison-dock'),host=document.querySelector('[data-mexico-water-background-key-host]');
    assert.equal(climate.children.length,6);assert.equal(relief.children.length,16);assert.ok(host.contains(climate));assert.equal(climate.hidden,false);assert.equal(relief.hidden,true);assert.equal(document.querySelector('[data-mexico-water-background-key]').hidden,false);
    assert.ok(value.hasAttribute('data-mexico-water-fixed-value'));assert.equal(value.textContent,'シナロア：灌漑農地率 45.0%');assert.ok(!document.querySelector('[data-mexico-nature-comparison]').contains(value));
    assert.match(document.querySelector('[data-mexico-nature-comparison-lead]').textContent,/主図に指標分布なし。州値で照合／別図は詳細/);assert.match(document.querySelector('[data-mexico-nature-comparison-body]').textContent,/同じ範囲の別図/);assert.ok(document.querySelector('[data-mexico-hydrology-body]').contains(document.querySelector('[data-mexico-hydrology-title]')));
    assert.ok(document.querySelector('[data-mexico-water-other-comparisons]').contains(dock));assert.equal(document.querySelector('[data-mexico-water-other-comparisons]').open,false);
    const base=document.querySelector('[data-mexico-hydrology-base]');base.value='relief';base.dispatchEvent(new window.Event('change',{bubbles:true}));await wait();
    assert.ok(host.contains(relief));assert.equal(relief.hidden,false);assert.equal(climate.hidden,true);assert.equal(relief.children.length,16);assert.equal(relief.querySelectorAll('.is-missing').length,1);assert.equal(new URL(window.location.href).searchParams.get('sourceState'),'10');
    for(const [mode,query,text] of [['maize','compare=irrigation&from=agriculture&sourceMetric=maize','白粒トウモロコシ生産量 1,000,000 t'],['cattle','compare=irrigation&from=agriculture&sourceMetric=cattle','牛頭数 1,000,000 頭'],['pine','compare=irrigation&from=agriculture&sourceMetric=pine','松材取得量 1,000,000 m³'],['density','compare=population','人口密度 50.0 人/km²'],['population','compare=population&from=population&sourceView=population','人口規模 10,000 人']]){
      window.history.replaceState(null,'',`/nature/?category=elevation&waterBase=relief&waterFeature=contours:contours-1000-1&state=25&sourceState=10&${query}`);window.dispatchEvent(new window.PopStateEvent('popstate'));await wait();assert.equal(document.querySelector('[data-mexico-nature-comparison-value]'),value);assert.ok(value.textContent.includes(text),mode);assert.equal(document.querySelectorAll('[data-mexico-nature-comparison-value]').length,1);assert.equal(document.querySelectorAll('.mexico-nature-comparison-dock').length,1);
    }
    window.history.replaceState(null,'','/nature/?category=basins&waterBase=climate&state=25&sourceState=10&compare=irrigation');window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.match(document.querySelector('[data-mexico-water-background-key-title]').textContent,/流域面が上に重なる背景/);assert.match(document.querySelector('[data-mexico-nature-comparison-body]').textContent,/自然資料の線・面と選択した背景/);assert.doesNotMatch(document.querySelector('[data-mexico-nature-comparison-body]').textContent,/主図の面は.*背景/);
    window.history.replaceState(null,'','/nature/?view=climate&state=25');window.dispatchEvent(new window.PopStateEvent('popstate'));await wait();
    assert.equal(document.querySelector('[data-mexico-water-background-key]').hidden,true);assert.ok(!host.contains(climate));assert.equal(climate.hidden,false);assert.equal(relief.hidden,true);assert.ok(document.querySelector('[data-mexico-nature-comparison]').contains(value));assert.equal(value.hasAttribute('data-mexico-water-fixed-value'),false);assert.equal(document.querySelector('[data-mexico-water-other-comparisons]'),null);assert.ok(!document.querySelector('[data-mexico-nature-comparison]').contains(dock));
  }finally{await window.happyDOM.close();}
});
