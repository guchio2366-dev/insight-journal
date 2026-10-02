import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {mexicoDensityColor,mexicoPopulationRadius,mexicoPopulationLegendValues} from '../../src/lib/atlas-mexico-population.ts';
import {mexicoCompositionColor,mexicoCompositionRadius,formatMexicoCompositionShare} from '../../src/lib/atlas-mexico-population-composition.ts';

const folder='atlas/north-america/mexico/population';
const population=JSON.parse(await readFile('src/data/atlas/mexico/population.json','utf8'));
const compositionData=JSON.parse(await readFile('src/data/atlas/mexico/population-composition.json','utf8'));
const localModules={name:'mexico-population-local-modules',setup(b){
 b.onResolve({filter:/^\./},args=>{const resolved=path.resolve(args.resolveDir,args.path);return {path:resolved+(path.extname(resolved)?'':'.ts')};});
 b.onLoad({filter:/\.ts$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}));
 b.onLoad({filter:/\.json$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'json',resolveDir:path.dirname(args.path)}));
}};
const compiled=await build({stdin:{contents:"import {initMexicoPopulation} from './src/scripts/atlas-mexico-population.ts';initMexicoPopulation(document.querySelector('[data-mexico-field=population]'));",resolveDir:process.cwd(),sourcefile:'mexico-population-e2e-entry.ts',loader:'ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},plugins:[localModules],bundle:true,format:'iife',platform:'browser',write:false});
async function page(search='',interactive=true){
 const w=new Window({url:`https://example.com/insight-journal/${folder}/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write((await readFile(`dist/${folder}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 if(interactive)w.eval(compiled.outputFiles[0].text);return w;
}
const change=(w,selector,value)=>{const control=w.document.querySelector(selector);control.value=value;control.dispatchEvent(new w.Event('change'));};
const visible=(d,selector)=>[...d.querySelectorAll(selector)].filter(el=>el.style.display!=='none');

test('JavaScript-free population page retains every source value, actual geometry, disabled controls and an open table',async()=>{
 const w=await page('',false);try{const d=w.document;
  assert.equal(d.querySelectorAll('[data-population-state-shape]').length,32);assert.equal(d.querySelectorAll('[data-population-state-symbol]').length,32);assert.equal(d.querySelectorAll('[data-population-row]').length,32);
  assert.equal(d.querySelector('[data-population-table]').open,true);assert.equal(d.querySelector('[data-population-view]').disabled,true);assert.equal(d.querySelector('[data-population-state]').disabled,true);assert.equal(d.querySelector('[data-population-only]').disabled,true);
  assert.equal(d.querySelector('[data-population-symbols]').hasAttribute('hidden'),true);assert.equal(d.querySelector('[data-population-fallback]').hidden,true);
  for(const row of population.states){const shape=d.querySelector(`[data-population-state-shape="${row.stateCode}"]`);assert.ok(shape.getAttribute('d').length>50);assert.equal(shape.getAttribute('fill'),mexicoDensityColor(row.density));assert.equal(shape.getAttribute('role'),'button');assert.equal(shape.getAttribute('fill-rule'),'evenodd');const tr=d.querySelector(`[data-population-row="${row.stateCode}"]`);assert.ok(tr.textContent.includes(row.population.toLocaleString('ja-JP')));assert.ok(tr.textContent.includes(row.density.toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1})));}
  for(const file of ['population-density-2020.csv','population-2020.json','manifest.json']){assert.ok(d.querySelector(`a[href$="${file}"]`));await access(`dist/assets/atlas/mexico-population-v1/${file}`);}
  assert.match(d.querySelector('.population-national-summary').textContent,/126,014,024/);assert.match(d.querySelector('.population-national-summary').textContent,/64\.3/);
 }finally{await w.happyDOM.close();}
});

test('Every state and both metrics retain original values, common legends and area-proportional symbols',async()=>{
 const w=await page();try{const d=w.document,q=s=>d.querySelector(s);
  assert.equal(q('[data-mexico-field=population]').dataset.populationReady,'1');assert.equal(q('[data-population-table]').open,false);assert.equal(q('[data-population-view]').disabled,false);
  for(const view of ['density','population']){change(w,'[data-population-view]',view);assert.equal(q('[data-population-symbols]').hasAttribute('hidden'),view==='density');assert.equal(q('[data-population-density-key]').hidden,view==='population');assert.equal(q('[data-population-symbol-key]').hidden,view==='density');
   for(const row of population.states){change(w,'[data-population-state]',row.stateCode);assert.equal(q('[data-population-selected-population]').textContent,row.population.toLocaleString('ja-JP'));assert.equal(q('[data-population-selected-density]').textContent,row.density.toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1}));assert.equal(q(`[data-population-state-shape="${row.stateCode}"]`).getAttribute('aria-pressed'),'true');assert.equal(Number(q(`[data-population-state-symbol="${row.stateCode}"] circle`).getAttribute('r')),mexicoPopulationRadius(row.population));assert.equal(new URL(w.location).searchParams.get('state'),row.stateCode);assert.equal(d.querySelectorAll('.is-selected-population-row').length,1);}
  }
  const legend=q('[data-population-map-symbol-key]');assert.equal(legend.closest('svg'),q('[data-population-map]'));assert.deepEqual([...legend.querySelectorAll('circle')].map(c=>Number(c.getAttribute('r'))),mexicoPopulationLegendValues.map(mexicoPopulationRadius));
 }finally{await w.happyDOM.close();}
});

test('Density and population comparison keeps both distributions, both legends and a state-specific source return',async()=>{
 const w=await page('?view=population&state=08&only=1');let reload;try{const d=w.document,q=s=>d.querySelector(s);
  q('[data-population-scale-link]').click();assert.equal(q('[data-population-symbols]').hasAttribute('hidden'),false);assert.equal(q('[data-population-density-key]').hidden,false);assert.equal(q('[data-population-symbol-key]').hidden,false);assert.equal(q('[data-population-scale-reading]').hidden,false);assert.equal(new URL(w.location).searchParams.get('compare'),'scale');assert.equal(new URL(w.location).searchParams.get('sourceView'),'population');
  assert.deepEqual(visible(d,'[data-population-state-shape]').map(el=>el.dataset.populationStateShape),['08']);assert.deepEqual(visible(d,'[data-population-state-symbol]').map(el=>el.dataset.populationStateSymbol),['08']);assert.equal(q('[data-population-state-shape="08"]').getAttribute('fill'),mexicoDensityColor(15.1));
  change(w,'[data-population-state]','15');const back=new URL(q('[data-population-return]').href);assert.equal(back.searchParams.get('view'),'population');assert.equal(back.searchParams.get('state'),'15');assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.has('compare'),false);assert.ok(q('[data-population-return]').textContent.includes(population.states.find(s=>s.stateCode==='15').nameJa));
  reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-population-state]').value,'15');assert.equal(reload.document.querySelector('[data-population-only]').checked,true);assert.equal(reload.document.querySelector('[data-population-scale-reading]').hidden,false);
  q('[data-population-return]').click();assert.equal(q('[data-population-scale-reading]').hidden,true);assert.equal(q('[data-population-view]').value,'population');assert.equal(q('[data-population-only]').checked,true);
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('Natural-region and export comparisons name the selected population metric and preserve target state, only and fallback',async()=>{
 const w=await page('?view=population&state=19&only=1&fallback=1');try{const d=w.document,q=s=>d.querySelector(s);
  for(const field of ['nature','industry']){const url=new URL(q(`[data-population-${field}-link]`).href);assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,`/insight-journal/atlas/north-america/mexico/${field}/`);assert.equal(url.searchParams.get('compare'),'population');assert.equal(url.searchParams.get('from'),'population');assert.equal(url.searchParams.get('sourceView'),'population');assert.equal(url.searchParams.get('state'),'19');assert.equal(url.searchParams.get('only'),'1');assert.equal(url.searchParams.get('fallback'),'1');assert.match(q(`[data-population-${field}-link-label]`).textContent,/人口規模/);}
  change(w,'[data-population-view]','density');assert.match(q('[data-population-industry-link-label]').textContent,/人口密度/);assert.match(q('[data-population-nature-link-label]').textContent,/人口密度/);assert.equal(new URL(q('[data-population-industry-link]').href).searchParams.get('sourceView'),'density');
 }finally{await w.happyDOM.close();}
});

test('Fallback image preserves selected values, isolation, quantity symbols and data map legends',async()=>{
 const w=await page('?view=population&state=08&only=1&fallback=1');try{const d=w.document,q=s=>d.querySelector(s);
  assert.equal(q('[data-population-normal]').hidden,true);assert.equal(q('[data-population-fallback]').hidden,false);const image=q('[data-population-fallback-image]');assert.match(image.src,/^data:image\/svg\+xml/);
  const decoded=decodeURIComponent(image.src.slice(image.src.indexOf(',')+1));const svg=new w.DOMParser().parseFromString(decoded,'image/svg+xml');assert.equal(svg.querySelectorAll('[data-population-state-shape]').length,32);assert.equal(svg.querySelector('[data-population-state-shape="08"]').style.display,'');assert.equal(svg.querySelector('[data-population-state-shape="09"]').style.display,'none');assert.equal(svg.querySelector('[data-population-symbols]').hasAttribute('hidden'),false);assert.equal(svg.querySelector('[data-population-map-symbol-key]').hasAttribute('hidden'),false);assert.equal(svg.querySelector('[data-population-selected-label-text]').textContent,population.states.find(s=>s.stateCode==='08').nameJa);
  change(w,'[data-population-state]','09');assert.equal(q('[data-population-selected-population]').textContent,'9,209,944');assert.ok(decodeURIComponent(image.src.slice(image.src.indexOf(',')+1)).includes('メキシコ市'));q('[data-population-reset]').click();assert.equal(q('[data-population-only]').checked,false);assert.equal(visible(d,'[data-population-state-shape]').length,32);assert.equal(visible(d,'[data-population-state-symbol]').length,32);
 }finally{await w.happyDOM.close();}
});

test('Invalid URLs normalize, keyboard selection remains accessible, and history restores the full source state',async()=>{
 const w=await page('?view=bad&state=999&only=true&compare=unknown&fallback=true&extra=keep');try{const d=w.document,q=s=>d.querySelector(s);assert.equal(q('[data-population-state]').value,'09');assert.equal(q('[data-population-view]').value,'density');assert.equal(q('[data-population-only]').checked,false);assert.equal(q('[data-population-fallback]').hidden,true);assert.equal(new URL(w.location).searchParams.get('extra'),'keep');
  q('[data-population-state-shape="08"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-population-state]').value,'08');
  w.history.replaceState(null,'','?view=population&state=15&only=1&compare=scale&sourceView=density&fallback=1');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-population-state]').value,'15');assert.equal(q('[data-population-view]').value,'population');assert.equal(q('[data-population-only]').checked,true);assert.equal(q('[data-population-fallback]').hidden,false);assert.equal(q('[data-population-scale-reading]').hidden,false);assert.equal(new URL(q('[data-population-return]').href).searchParams.get('view'),'density');
 }finally{await w.happyDOM.close();}
});
test('All eleven official ethnicity and religion metrics render every state count, denominator, color, area and full keys',async()=>{
 const w=await page('?category=ethnicity&state=20');try{const d=w.document,q=s=>d.querySelector(s);
  for(const metric of compositionData.metrics){q(`[data-population-category="${metric.category}"]`).click();change(w,'[data-population-composition-metric]',metric.id);
   assert.equal(new URL(w.location).searchParams.get('compositionMetric'),metric.id);assert.equal(q('[data-population-unavailable]').hidden,true);assert.equal(q('[data-population-distribution-reading]').hidden,true);assert.equal(q('[data-population-density-key]').hidden,true);
   assert.equal(d.querySelectorAll('[data-population-composition-row]').length,32);assert.equal(q('[data-population-composition-table]').hidden,false);assert.ok(q('[data-population-map] title').textContent.includes(metric.label));
   for(const row of population.states){const record=metric.states[row.stateCode],shape=q(`[data-population-state-shape="${row.stateCode}"]`),circle=q(`[data-population-state-symbol="${row.stateCode}"] circle`);
    assert.equal(shape.getAttribute('fill'),mexicoCompositionColor(record,metric));assert.equal(Number(circle.getAttribute('r')),mexicoCompositionRadius(record,metric));assert.match(shape.getAttribute('aria-label'),new RegExp(record.count.toLocaleString('ja-JP')));
    const cells=q(`[data-population-composition-row="${row.stateCode}"]`).querySelectorAll('td');assert.equal(cells[0].textContent,record.count.toLocaleString('ja-JP'));assert.equal(cells[1].textContent,record.denominator.toLocaleString('ja-JP'));assert.equal(cells[2].textContent,formatMexicoCompositionShare(record,metric));
   }
   assert.deepEqual([...q('[data-population-composition-color-key]').querySelectorAll('i')].slice(0,-1).map(i=>i.style.background),metric.shareBins.map(bin=>{const el=d.createElement('i');el.style.background=bin.color;return el.style.background;}));
   change(w,'[data-population-view]','count');assert.equal(q('[data-population-symbols]').hasAttribute('hidden'),false);assert.equal(q('[data-population-composition-share-key]').hidden,true);assert.equal(q('[data-population-composition-count-key]').hidden,false);
   assert.deepEqual([...q('[data-population-map-symbol-key]').querySelectorAll('circle')].map(c=>Number(c.getAttribute('r'))),metric.countLegendValues.map(count=>mexicoCompositionRadius({count,denominator:count,status:'value'},metric)));
   assert.match(q('[data-population-composition-count-note]').textContent,/他指標の円とは直接比べません/);change(w,'[data-population-view]','share');
  }
 }finally{await w.happyDOM.close();}
});

test('Bare category URLs and category transitions normalize before comparison, preserving the original state and source flags',async()=>{
 const w=await page('?category=ethnicity&view=population&state=08&only=1&metric=cattle&measure=quantity&from=agriculture&sourceMetric=cattle&sourceCrops=0&sourceLivestock=1');let reload;
 try{const d=w.document,q=s=>d.querySelector(s);
  for(const category of ['ethnicity','religion','ethnicity']){q(`[data-population-category="${category}"]`).click();change(w,'[data-population-view]','count');const original=w.location.href;const currentMetric=q('[data-population-composition-metric]').value;
   assert.equal(new URL(original).searchParams.get('compositionMetric'),currentMetric);q('[data-population-composition-compare]').click();assert.equal(q('[data-population-composition-return]').hidden,false);assert.equal(q('[data-population-view]').disabled,true);assert.equal(q('[data-population-composition-metric]').disabled,true);
   change(w,'[data-population-state]','09');assert.deepEqual(visible(d,'[data-population-state-symbol]').map(el=>el.dataset.populationStateSymbol),['08']);assert.deepEqual(visible(d,'[data-population-state-shape]').map(el=>el.dataset.populationStateShape),['09']);assert.equal(q('[data-population-composition-return]').href,original);
   reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-population-composition-return]').href,original);assert.equal(reload.document.querySelector('[data-population-view]').disabled,true);await reload.happyDOM.close();reload=null;
   q('[data-population-composition-return]').click();assert.equal(w.location.href,original);assert.equal(q('[data-population-state]').value,'08');assert.equal(q('[data-population-view]').value,'count');assert.equal(q('[data-population-only]').checked,true);
   for(const [key,value]of Object.entries({metric:'cattle',measure:'quantity',from:'agriculture',sourceMetric:'cattle',sourceCrops:'0',sourceLivestock:'1'}))assert.equal(new URL(w.location).searchParams.get(key),value);
  }
  w.history.replaceState(null,'','?category=ethnicity');w.dispatchEvent(new w.PopStateEvent('popstate'));q('[data-population-composition-compare]').click();assert.equal(q('[data-population-composition-return]').hidden,false);
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
 const bare=await page('?category=ethnicity');try{bare.document.querySelector('[data-population-composition-compare]').click();assert.equal(bare.document.querySelector('[data-population-composition-return]').hidden,false);}finally{await bare.happyDOM.close();}
});

test('Source share distribution and exact return survive target selection, history and fallback without substituting density',async()=>{
 const w=await page('?category=religion&compositionMetric=islamic&compositionMeasure=share&state=20&only=1&fallback=1');let reload;
 try{const d=w.document,q=s=>d.querySelector(s),metric=compositionData.metrics.find(m=>m.id==='islamic'),original=w.location.href;
  q('[data-population-composition-compare]').click();change(w,'[data-population-state]','09');assert.deepEqual(visible(d,'[data-population-state-shape]').map(el=>el.dataset.populationStateShape),['20']);assert.deepEqual(visible(d,'[data-population-state-symbol]').map(el=>el.dataset.populationStateSymbol),['09']);
  const source=q('[data-population-fallback-image]').src;assert.match(source,/^data:image\/svg\+xml/);const svg=new w.DOMParser().parseFromString(decodeURIComponent(source.slice(source.indexOf(',')+1)),'image/svg+xml');assert.match(svg.querySelector('title').textContent,/イスラム/);assert.equal(svg.querySelector('[data-population-state-shape="20"]').getAttribute('fill'),mexicoCompositionColor(metric.states['20'],metric));
  const compared=w.location.href;reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-population-composition-return]').href,original);q('[data-population-composition-return]').click();assert.equal(w.location.href,original);
  w.history.replaceState(null,'',compared);w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-population-state]').value,'09');assert.equal(q('[data-population-composition-return]').href,original);assert.equal(q('[data-population-composition-share-key]').hidden,false);assert.equal(q('[data-population-composition-count-key]').hidden,false);
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('Official estimates expose original percentage intervals without deriving them from the count interval',async()=>{
 const metric=compositionData.metrics.find(m=>m.id==='indigenous_identity_estimate'),w=await page('?category=ethnicity&compositionMetric=indigenous_identity_estimate&state=20');try{const d=w.document,q=s=>d.querySelector(s),record=metric.states['20'];
  assert.match(q('[data-population-map] title').textContent,/公式推計/);assert.match(q('[data-population-composition-key-title]').textContent,/公式推計/);assert.match(q('[data-population-composition-count-label]').textContent,/公式推計/);assert.equal(q('[data-population-composition-confidence]').hidden,false);
  for(const bound of [record.confidenceInterval90.lower,record.confidenceInterval90.upper])assert.ok(q('[data-population-composition-confidence]').textContent.includes(bound.toLocaleString('ja-JP',{maximumFractionDigits:Math.min(3,metric.sharePrecision+1)})));
  assert.match(q('[data-population-composition-confidence-detail]').textContent,/再計算していません/);assert.match(q('[data-population-composition-confidence-detail]').textContent,/人数CV/);assert.equal(q('[data-population-composition-ci-heading]').hidden,false);assert.ok(q('[data-population-composition-row="20"] td:last-child').textContent.includes(record.confidenceInterval90.lower.toLocaleString('ja-JP',{maximumFractionDigits:6})));
  assert.equal(q('[data-population-composition-return]').closest('[data-population-composition-hero]')!==null,true);assert.equal(q('[data-population-composition-hero]').parentElement,q('.mexico-reading-legend'));
 }finally{await w.happyDOM.close();}
});

test('Returning to population distribution restores the original option and legend nodes, radii and remembered density mode',async()=>{
 const w=await page('?view=population&state=20');try{const d=w.document,q=s=>d.querySelector(s),options=[...q('[data-population-view]').children],keys=[...q('[data-population-map-symbol-key]').children];
  q('[data-population-category="ethnicity"]').click();change(w,'[data-population-composition-metric]','afro_identity');change(w,'[data-population-view]','share');q('[data-population-category="distribution"]').click();
  assert.deepEqual([...q('[data-population-view]').children],options);assert.deepEqual([...q('[data-population-map-symbol-key]').children],keys);assert.equal(q('[data-population-view]').value,'population');assert.equal(q('[data-population-composition-key]').hidden,true);assert.equal(q('[data-population-composition-hero]').hidden,true);assert.equal(q('[data-population-distribution-reading]').hidden,false);assert.equal(q('[data-population-table]').hidden,false);
  for(const row of population.states)assert.equal(Number(q(`[data-population-state-symbol="${row.stateCode}"] circle`).getAttribute('r')),mexicoPopulationRadius(row.population));change(w,'[data-population-view]','density');assert.equal(q('[data-population-density-key]').hidden,false);assert.equal(q('[data-population-state-shape="20"]').getAttribute('fill'),mexicoDensityColor(population.states.find(s=>s.stateCode==='20').density));
 }finally{await w.happyDOM.close();}
});
