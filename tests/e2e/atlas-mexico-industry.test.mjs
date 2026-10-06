import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {industryExportColor,industryValueText,mexicoIndustrySectors,mexicoIndustryMetricChoices} from '../../src/lib/atlas-mexico-industry.ts';
import catalog from '../../src/data/atlas/mexico/industry-catalog.json' with {type:'json'};
import {formatMexicoDensity,mexicoDensityColor,mexicoPopulationRadius,mexicoPopulationSymbolColor,mexicoPopulationSymbolOpacity,mexicoPopulationSelectedSymbolOpacity} from '../../src/lib/atlas-mexico-population.ts';

const folder='atlas/north-america/mexico/industry',data=JSON.parse(await readFile('src/data/atlas/mexico/industry.json','utf8')),population=JSON.parse(await readFile('src/data/atlas/mexico/population.json','utf8'));
// These three local TypeScript modules need no package lookup above the restricted checkout.
const localModules={name:'mexico-industry-local-modules',setup(b){b.onResolve({filter:/^\./},args=>{const resolved=path.resolve(args.resolveDir,args.path);return {path:resolved+(path.extname(resolved)?'':'.ts')};});b.onLoad({filter:/\.ts$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}));}};
const compiled=await build({stdin:{contents:"import {initMexicoIndustry} from './src/scripts/atlas-mexico-industry.ts';initMexicoIndustry(document.querySelector('[data-mexico-field=industry]'));",resolveDir:process.cwd(),sourcefile:'mexico-industry-e2e-entry.ts',loader:'ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},plugins:[localModules],bundle:true,format:'iife',platform:'browser',write:false});
const code=compiled.outputFiles[0].text;
async function page(search='',interactive=true){const w=new Window({url:`https://example.com/insight-journal/${folder}/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.write((await readFile(`dist/${folder}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));if(interactive)w.eval(code);return w;}
const change=(w,selector,value)=>{const el=w.document.querySelector(selector);el.value=value;el.dispatchEvent(new w.Event('change'));};
const visible=(d,slot,selector='[data-mi-shape]')=>[...d.querySelector(`[data-mi-map=${slot}]`).querySelectorAll(selector)].filter(el=>!el.hasAttribute('hidden'));

test('US sector and supported-field navigation opens visible geographic readings and statistics without moving the map',async()=>{
 const w=await page();let reload;
 try{
  const d=w.document,q=s=>d.querySelector(s),map=q('[data-mi-map=primary]');map.setAttribute('viewBox','60 50 790 500');
  assert.equal(q('[data-mi-legend-slot=secondary]').hidden,true);
  assert.equal(visible(d,'primary','[data-mi-reading-markers] [data-mi-region-option]').length,10);
  assert.equal(new Set(visible(d,'primary','[data-mi-reading-markers] [data-mi-region-option]').map(point=>point.dataset.miRegionOption)).size,9);
  for(const sector of mexicoIndustrySectors){
   q(`[role=tab][data-industry-sector="${sector.id}"]`).click();assert.equal(q('[data-industry-sector][aria-selected=true]').dataset.industrySector,sector.id);
   assert.equal(q('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,`${sector.id}:all`);assert.equal(map.getAttribute('viewBox'),'60 50 790 500');
   if(catalog.sectorReadings[sector.id])assert.equal(q('[data-mi-selected-place-text]').textContent,catalog.sectorReadings[sector.id].places[0].text);
   assert.equal(q('[data-mi-electronics-link]').hidden,true);
  }
  for(const metric of mexicoIndustryMetricChoices){
   q(`[role=tab][data-industry-sector="${metric.sector}"]`).click();q(`[data-mi-metric-button="${metric.id}"]`).click();
   assert.equal(q('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,`${metric.sector}:${metric.id}`);
   assert.equal(q(`[data-mi-metric-button="${metric.id}"]`).getAttribute('aria-selected'),'true');assert.equal(q(`[data-mi-metric-button="${metric.id}"]`).tabIndex,0);
   assert.equal(new URL(w.location).searchParams.get('sector'),metric.sector);assert.equal(new URL(w.location).searchParams.get('subsector'),metric.id);assert.equal(map.getAttribute('viewBox'),'60 50 790 500');
   const mapPlace=q(`[data-mi-reading-markers] [data-mi-region-metric="${metric.id}"]:not([hidden])`);assert.ok(mapPlace);mapPlace.querySelector('text').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(q('[data-mi-state-select]').value,mapPlace.dataset.miRegionOption);assert.equal(new URL(w.location).searchParams.get('sector'),metric.sector);assert.equal(new URL(w.location).searchParams.get('subsector'),metric.id);
   const panel=q('[data-mi-industry-panel]:not([hidden])'),place=panel.querySelector('[data-mi-region-option]');assert.ok(place);assert.ok(!place.closest('[hidden]'));
   place.click();assert.equal(q('[data-mi-state-select]').value,place.dataset.miRegionOption);assert.ok(q('[data-mi-selected-place-name]').textContent.includes(place.textContent.replace('を地図で見る','')));
   q('a[href="#mi-statistics"]').click();assert.equal(q('#mi-statistics').open,true);
   const source=q('[data-mi-map=primary]');assert.equal(source.getAttribute('viewBox'),'60 50 790 500');
   const cmp=new URL(q('[data-mi-population-link]').href),params=cmp.searchParams;assert.equal(params.get('sector'),metric.sector);assert.equal(params.get('subsector'),metric.id);
   const cmpWindow=await page(cmp.search);try{const cd=cmpWindow.document,heading=cd.querySelector('[data-mi-map-heading=primary]').textContent,back=new URL(cd.querySelector('[data-mi-return]').href);assert.equal(back.searchParams.get('sector'),metric.sector);assert.equal(back.searchParams.get('subsector'),metric.id);assert.equal(back.searchParams.get('metric'),metric.id);if(catalog.metrics.find(m=>m.id===metric.id)){for(const code of catalog.metrics.find(m=>m.id===metric.id).sourceCodes)assert.ok(heading.includes(code));assert.equal(cd.querySelector('[data-mi-selected-place-text]').textContent,catalog.metrics.find(m=>m.id===metric.id).reading.text);}}finally{await cmpWindow.happyDOM.close();}
   panel.querySelector('[data-industry-overview]').click();assert.equal(q('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,`${metric.sector}:all`);assert.equal(d.activeElement?.id,`mi-sector-${metric.sector}`,'Overview focuses the active sector tab');
  }
  q('[role=tab][data-industry-sector=manufacturing]').click();q('[data-mi-metric-button=electronics]').click();
  assert.match(q('[data-mi-industry-panel]:not([hidden])').textContent,/半導体だけの輸出額ではありません/);
  q('#mi-description').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(q('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,'manufacturing:all');
  q('[data-mi-metric-button=transport]').click();reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,'manufacturing:transport');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('Industry SSR preserves 32 geography keys, both source columns, accessible state selection and closed long detail',async()=>{
 const w=await page('',false);try{const d=w.document;assert.equal(d.querySelectorAll('[data-mi-map]').length,2);assert.equal(d.querySelectorAll('[data-mi-shape]').length,64);assert.equal(d.querySelectorAll('[data-mi-context-state]').length,64);assert.equal(d.querySelectorAll('[data-mi-data-row]').length,32);assert.equal(d.querySelector('[data-mi-figure=secondary]').hidden,true);assert.equal(d.querySelector('[data-mi-reading-comparison]').hidden,true);assert.equal(d.querySelector('.mi-all-data').open,false);assert.equal(d.querySelector('.mexico-sources details').open,false);
  assert.deepEqual([...d.querySelectorAll('[data-industry-sector]')].map(button=>({id:button.dataset.industrySector,label:button.textContent})),mexicoIndustrySectors.map(sector=>({id:sector.id,label:sector.label})));
 assert.deepEqual(new Set([...d.querySelectorAll('[data-mi-metric-button]')].map(button=>button.dataset.miMetricButton)),new Set(mexicoIndustryMetricChoices.map(metric=>metric.id)));
 assert.equal(d.querySelector('[data-industry-sector][aria-selected=true]').dataset.industrySector,'all');assert.equal(d.querySelectorAll('[data-mi-industry-panel]:not([hidden])').length,1);assert.equal(d.querySelector('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,'all:all');
 assert.equal(d.querySelector('[data-mi-metric]').hidden,true);
 assert.equal(d.querySelector('[data-mi-state-select]').closest('details').id,'mi-statistics');
 assert.equal(d.querySelector('[data-mi-source-view]').closest('details').id,'mi-statistics');
 assert.equal(d.querySelector('[data-mi-figure=secondary] [data-mi-supplementary-controls]'),null);
 for(const slot of ['primary','secondary'])for(const state of data.states){const shape=d.querySelector(`[data-mi-map=${slot}] [data-mi-shape="${state.id}"]`);assert.ok(shape.getAttribute('d').length>50);assert.equal(shape.getAttribute('role'),'button');assert.equal(shape.getAttribute('tabindex'),'0');assert.equal(shape.getAttribute('fill-rule'),'evenodd');assert.ok(shape.querySelector('title').textContent.includes(state.name));assert.ok(population.states.find(s=>s.stateCode===state.id));}
 for(const row of data.rows){const tr=d.querySelector(`[data-mi-data-row="${row.id}"]`);for(const metric of ['transport','electronics']){const v=row.values[metric];assert.ok(tr.textContent.includes(v.sourceStatus));assert.ok(tr.textContent.includes(industryValueText(v)));if(v.sourceValue!==null)assert.ok(tr.textContent.includes(v.sourceValue.toLocaleString('ja-JP')));}}
 for(const file of ['industry-selected-2025.csv','official-metadata.txt','official-data-dictionary.csv','manifest.json']){assert.ok(d.querySelector(`a[href$="${file}"]`));await access(`dist/assets/atlas/mexico-industry-v1/${file}`);}
 assert.match(d.querySelector('.mexico-sources').textContent,/2025.*2026.*1,000,000|2025.*2026/s);
 }finally{await w.happyDOM.close();}
});

test('All 32 states and both industries show the original absolute amount, separate state geography, original status and selected source table',async()=>{
 const w=await page();try{const d=w.document;for(const metric of ['transport','electronics']){d.querySelector(`[data-mi-metric-button=${metric}]`).click();assert.equal(d.querySelector('[data-mi-metric]').value,metric);assert.equal(d.querySelector(`[data-mi-metric-button=${metric}]`).getAttribute('aria-selected'),'true');for(const row of data.rows){change(w,'[data-mi-state-select]',row.id);const v=row.values[metric],shape=d.querySelector(`[data-mi-map=primary] [data-mi-shape="${row.id}"]`);assert.equal(shape.getAttribute('fill'),'#edf1df');assert.equal(shape.dataset.miStatus,v.status);assert.equal(shape.getAttribute('aria-pressed'),'false');assert.equal(shape.getAttribute('aria-label'),shape.querySelector('title').textContent);assert.equal(d.querySelector(`[data-mi-value="${metric}"]`).textContent,industryValueText(v));assert.equal(d.querySelector(`[data-mi-stats-status="${metric}"]`).textContent,v.sourceStatus);assert.equal(new URL(w.location).searchParams.get('state'),row.id);assert.equal(d.querySelectorAll('.mi-all-data tr.is-selected').length,1);assert.equal(visible(d,'primary').length,32);}}
 assert.equal(d.querySelector('[data-mexico-field=industry]').dataset.miRenderer,'svg');assert.equal(d.querySelector('[data-mi-fallback-note]').hidden,true);
 }finally{await w.happyDOM.close();}
});

test('Category buttons keep keyboard, native selection, URL, reload and actual history in sync',async()=>{
 const w=await page('?state=14&metric=electronics');let reload;
 try{
  const d=w.document,q=selector=>d.querySelector(selector),button=metric=>q(`[data-mi-metric-button=${metric}]`);
  const assertMetric=metric=>{
   const name=data.metrics.find(item=>item.id===metric).name;
   assert.equal(q('[data-mi-metric]').value,metric);
   assert.equal(q('[data-mi-map=primary]').dataset.miKind,metric);
   assert.equal(new URL(w.location).searchParams.get('metric'),metric);
   assert.match(q('[data-mi-industry-panel]:not([hidden])').textContent,new RegExp(name));
   assert.match(q('[data-mi-selected-place-name]').textContent,new RegExp(name));
   assert.match(q('[data-mi-topic-heading]').textContent,new RegExp(name));
   assert.equal(q('[data-mi-export-legend=primary]').hidden,true);
   for(const item of data.metrics){assert.equal(button(item.id).getAttribute('aria-selected'),String(item.id===metric));assert.equal(button(item.id).tabIndex,item.id===metric?0:-1);}
  };
  assertMetric('electronics');
  button('transport').click();assertMetric('transport');assert.equal(q('[data-mi-state-select]').value,'14');
  w.history.back();await w.happyDOM.waitUntilComplete();assertMetric('electronics');
  w.history.forward();await w.happyDOM.waitUntilComplete();assertMetric('transport');
  button('transport').focus();button('transport').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assertMetric('electronics');assert.equal(d.activeElement?.getAttribute('data-mi-metric-button'),'electronics','Keyboard selection focuses electronics');
  button('electronics').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(q('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,'manufacturing:all');
  q('[data-industry-subtabs=manufacturing] [data-industry-subsector=all]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(q('[role=tab][data-industry-subsector=machinery]').getAttribute('aria-selected'),'true');
  change(w,'[data-mi-metric]','transport');assertMetric('transport');
  reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-mi-metric-button=transport]').getAttribute('aria-selected'),'true');assert.equal(reload.document.querySelector('[data-mi-state-select]').value,'14');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('The transport–electronics destination has a dedicated explanation, two common legends and two selected-state distributions',async()=>{
 const w=await page('?compare=electronics&state=05&metric=transport&only=1&zoom=1');let reload;try{const d=w.document,q=s=>d.querySelector(s);assert.equal(q('[data-mi-figure=secondary]').hidden,false);assert.equal(q('[data-mi-reading-comparison]').hidden,false);assert.equal(d.querySelectorAll('[data-mi-reading-normal]:not([hidden])').length,0);assert.match(q('[data-mi-reading-comparison-title]').textContent,/輸送機器.*電子機器/);assert.deepEqual([...d.querySelectorAll('[data-mi-export-legend]')].map(el=>el.querySelector('ul').textContent),[q('[data-mi-export-legend=primary] ul').textContent,q('[data-mi-export-legend=primary] ul').textContent]);
 for(const slot of ['primary','secondary']){assert.deepEqual(visible(d,slot).map(el=>el.dataset.miShape),['05']);assert.equal(visible(d,slot,'[data-mi-context-state]').length,32);assert.notEqual(q(`[data-mi-map=${slot}]`).getAttribute('viewBox'),'0 0 900 580');}
 change(w,'[data-mi-state-select]','06');assert.equal(q('[data-mi-map=primary] [data-mi-shape="06"]').getAttribute('fill'),'url(#mi-primary-confidential)');assert.equal(q('[data-mi-map=secondary] [data-mi-shape="06"]').getAttribute('fill'),'url(#mi-secondary-unknown)');
 q('[data-mi-map=primary] [data-mi-shape="14"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-mi-state-select]').value,'14');q('[data-mi-metric-button=electronics]').click();assert.equal(q('[data-mi-map=primary]').dataset.miKind,'electronics');assert.equal(q('[data-mi-map=secondary]').dataset.miKind,'transport');reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-mi-state-select]').value,'14');assert.equal(reload.document.querySelector('[data-mi-only]').checked,true);const back=new URL(q('[data-mi-return]').href);assert.equal(back.searchParams.get('state'),'14');assert.equal(back.searchParams.get('metric'),'electronics');assert.equal(back.searchParams.has('compare'),false);assert.match(q('[data-mi-return]').textContent,/ハリスコ.*電子機器/);
 q('[data-mi-all]').click();assert.equal(visible(d,'primary').length,32);assert.equal(visible(d,'secondary').length,32);assert.equal(q('[data-mi-map=primary]').getAttribute('viewBox'),'0 0 900 580');assert.equal(new URL(w.location).searchParams.get('compare'),'electronics');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('Population density is retained as the source distribution with original bins, year, units, selection and a targeted return',async()=>{
 const w=await page('?compare=population&state=08&from=population&sourceView=density&only=1&next=https://evil.example/');try{const d=w.document,q=s=>d.querySelector(s),source=population.states.find(s=>s.stateCode==='08');assert.equal(q('[data-mi-figure=secondary]').style.order,'0');assert.equal(q('[data-mi-figure=primary]').style.order,'1');assert.equal(q('[data-mi-map=secondary]').dataset.miKind,'density');assert.equal(q('[data-mi-map=secondary] [data-mi-shape="08"]').getAttribute('fill'),mexicoDensityColor(source.density,source.densityStatus));assert.equal(q('[data-mi-population-legend]').hidden,false);assert.equal(q('[data-mi-export-legend=secondary]').hidden,true);assert.equal(q('[data-mi-export-legend=primary]').hidden,false);assert.equal(q('[data-mi-population-circles]').hasAttribute('hidden'),true);assert.equal(q('[data-mi-density-legend]').hidden,false);assert.match(q('[data-mi-reading-comparison-title]').textContent,/人口.*輸出工業/);assert.match(q('[data-mi-period-note]').textContent,/2020.*2025/s);assert.match(q('[data-mi-population-card-value]').textContent,/人\/km²/);assert.equal(d.querySelectorAll('[data-mi-reading-normal]:not([hidden])').length,0);for(const slot of ['primary','secondary'])assert.deepEqual(visible(d,slot).map(el=>el.dataset.miShape),['08']);
 const back=new URL(q('[data-mi-return]').href);assert.equal(back.origin,'https://example.com');assert.equal(back.pathname,'/insight-journal/atlas/north-america/mexico/population/');assert.deepEqual(Object.fromEntries(back.searchParams),{view:'density',state:'08',only:'1'});assert.match(q('[data-mi-return]').textContent,/チワワ.*元の人口密度/);assert.equal(q('[data-mi-value-card=electronics]').hidden,true);
 q('[data-mi-metric-button=electronics]').click();assert.equal(q('[data-mi-map=primary]').dataset.miKind,'electronics');assert.equal(q('[data-mi-map=secondary]').dataset.miKind,'density');assert.equal(q('[data-mi-source-view-control]').hidden,false);assert.equal(q('[data-mi-source-view]').closest('details').id,'mi-statistics');assert.equal(q('[data-mi-value-card=electronics]').hidden,false);assert.equal(q('[data-mi-value-card=transport]').hidden,true);assert.equal(q('[data-mi-population-card-value]').textContent,`${formatMexicoDensity(source.density,source.densityStatus)} 人/km²`);assert.deepEqual(Object.fromEntries(new URL(q('[data-mi-return]').href).searchParams),{view:'density',state:'08',only:'1'});
 }finally{await w.happyDOM.close();}
});

test('Population quantities retain area-proportional circles through selection, refresh and history, with both comparison maps kept in isolation',async()=>{
 const w=await page('?compare=population&state=19&metric=electronics&from=population&sourceView=population&only=1');let reload;try{const d=w.document,q=s=>d.querySelector(s);assert.equal(q('[data-mi-population-circles]').hasAttribute('hidden'),false);assert.equal(q('[data-mi-density-legend]').hidden,true);assert.equal(q('[data-mi-population-size-legend]').hidden,false);assert.equal(visible(d,'secondary','[data-mi-population-circle]').length,1);assert.equal(d.querySelectorAll('[data-mi-size-reference]').length,3);for(const row of population.states){const circle=q(`[data-mi-population-circle="${row.stateCode}"]`);assert.equal(Number(circle.getAttribute('r')),mexicoPopulationRadius(row.population));assert.equal(circle.style.fill,mexicoPopulationSymbolColor);assert.equal(Number(circle.style.fillOpacity),row.stateCode==='19'?mexicoPopulationSelectedSymbolOpacity:mexicoPopulationSymbolOpacity);}
 q('[data-mi-population-circle="15"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(q('[data-mi-state-select]').value,'15');assert.deepEqual(visible(d,'primary').map(el=>el.dataset.miShape),['15']);assert.deepEqual(visible(d,'secondary').map(el=>el.dataset.miShape),['15']);assert.equal(visible(d,'secondary','[data-mi-population-circle]')[0].dataset.miPopulationCircle,'15');assert.ok(q('[data-mi-population-card-value]').textContent.includes(population.states.find(s=>s.stateCode==='15').population.toLocaleString('ja-JP')));
 reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-mi-map=secondary]').dataset.miKind,'population');assert.equal(reload.document.querySelector('[data-mi-state-select]').value,'15');
 q('[data-mi-zoom]').click();assert.notEqual(q('[data-mi-map=primary]').getAttribute('viewBox'),'0 0 900 580');assert.equal(q('[data-mi-map=secondary]').getAttribute('viewBox'),'0 0 900 580');assert.match(q('[data-mi-zoom]').textContent,/輸出図/);
 w.history.replaceState(null,'','?compare=population&state=08&metric=transport&from=population&sourceView=density&only=1');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-mi-source-view]').value,'density');assert.equal(q('[data-mi-state-select]').value,'08');assert.equal(q('[data-mi-population-circles]').hasAttribute('hidden'),true);assert.equal(new URL(q('[data-mi-return]').href).searchParams.get('view'),'density');
 }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
});

test('Population source state and named return survive changing the industry target, reload and history',async()=>{
 for(const view of ['density','population']){
  const w=await page(`?compare=population&state=09&from=population&sourceView=${view}&only=1&fallback=1`);let reload;
  try{
   const q=s=>w.document.querySelector(s);
   const assertReturn=(document)=>{
    const link=document.querySelector('[data-mi-return]'),back=new URL(link.href);
    assert.equal(back.searchParams.get('state'),'09');assert.equal(back.searchParams.get('view'),view);
    assert.equal(back.searchParams.get('only'),'1');assert.equal(back.searchParams.get('fallback'),'1');
    assert.match(link.textContent,/メキシコ市.*元の/);
   };
   change(w,'[data-mi-state-select]','05');
   assert.equal(q('[data-mi-state-select]').value,'05');assert.equal(new URL(w.location).searchParams.get('sourceState'),'09');assertReturn(w.document);
   reload=await page(w.location.search);assert.equal(reload.document.querySelector('[data-mi-state-select]').value,'05');assertReturn(reload.document);
   change(w,'[data-mi-state-select]','10');assertReturn(w.document);
   w.history.back();await w.happyDOM.waitUntilComplete();assert.equal(q('[data-mi-state-select]').value,'05');assertReturn(w.document);
   w.history.back();await w.happyDOM.waitUntilComplete();assert.equal(q('[data-mi-state-select]').value,'09');assertReturn(w.document);
   w.history.forward();await w.happyDOM.waitUntilComplete();assert.equal(q('[data-mi-state-select]').value,'05');assertReturn(w.document);
  }finally{await w.happyDOM.close();if(reload)await reload.happyDOM.close();}
 }
});

test('Changing to other fields exits the two-industry comparison without inventing a new comparison explanation',async()=>{
 const w=await page('?compare=electronics&state=14&metric=transport&only=1&zoom=1');
 try{
  const q=s=>w.document.querySelector(s);
  const assertPair=metric=>{
   assert.equal(new URL(w.location).searchParams.get('compare'),'electronics');
   assert.equal(q('[data-mi-map=primary]').dataset.miKind,metric);assert.equal(q('[data-mi-map=secondary]').dataset.miKind,metric==='transport'?'electronics':'transport');
   assert.equal(q('[data-mi-figure=secondary]').hidden,false);assert.equal(q('[data-mi-reading-comparison]').hidden,false);
  };
  const assertNormal=metric=>{
   assert.equal(new URL(w.location).searchParams.has('compare'),false);assert.equal(new URL(w.location).searchParams.get('metric'),metric);
   assert.equal(q('[data-mi-map=primary]').dataset.miKind,metric);assert.equal(q('[data-mi-figure=secondary]').hidden,true);
   assert.equal(q('[data-mi-reading-comparison]').hidden,true);assert.equal(q('[data-mi-electronics-link]').hidden,true);
   assert.equal(q('[data-mi-industry-panel]:not([hidden])').dataset.miIndustryPanel,`manufacturing:${metric}`);
   assert.equal(q('[data-mi-state-select]').value,'14');assert.equal(q('[data-mi-only]').checked,true);assert.equal(q('[data-mi-zoom]').getAttribute('aria-pressed'),'true');
  };
  assertPair('transport');q('[data-mi-metric-button=electronics]').click();assertPair('electronics');
  q('[data-mi-metric-button=food]').click();assertNormal('food');
  w.history.back();await w.happyDOM.waitUntilComplete();assertPair('electronics');
  change(w,'[data-mi-metric]','chemicals');assertNormal('chemicals');
 }finally{await w.happyDOM.close();}
 const populationWindow=await page('?compare=population&state=05&metric=food&from=population&sourceState=09&sourceView=population&only=1&zoom=1');
 try{
  const q=s=>populationWindow.document.querySelector(s);
  for(const metric of ['food','chemicals']){
   change(populationWindow,'[data-mi-metric]',metric);
   assert.equal(new URL(populationWindow.location).searchParams.get('compare'),'population');assert.equal(q('[data-mi-map=primary]').dataset.miKind,metric);
   assert.equal(q('[data-mi-map=secondary]').dataset.miKind,'population');assert.equal(q('[data-mi-map=secondary]').getAttribute('viewBox'),'0 0 900 580');
   assert.equal(q('[data-mi-electronics-link]').hidden,true);assert.equal(new URL(q('[data-mi-electronics-link]').href).searchParams.has('compare'),false);
   assert.equal(new URL(q('[data-mi-return]').href).searchParams.get('state'),'09');
  }
  change(populationWindow,'[data-mi-metric]','electronics');assert.equal(q('[data-mi-electronics-link]').hidden,false);
  assert.equal(new URL(q('[data-mi-electronics-link]').href).searchParams.get('compare'),'electronics');
 }finally{await populationWindow.happyDOM.close();}
 const invalid=await page('?compare=electronics&state=14&metric=food&sector=manufacturing&subsector=food');
 try{
  assert.equal(invalid.document.querySelector('[data-mi-map=primary]').dataset.miKind,'food');
  assert.equal(invalid.document.querySelector('[data-mi-figure=secondary]').hidden,true);
  assert.equal(invalid.document.querySelector('[data-mi-reading-comparison]').hidden,true);
  assert.equal(invalid.document.querySelector('[data-mi-electronics-link]').hidden,true);
 }finally{await invalid.happyDOM.close();}
});

test('Zoomed state changes and history restore the camera while the population source keeps its national frame',async()=>{
 for(const compare of ['', 'electronics', 'population']){
  const w=await page(`?state=05&metric=transport${compare?`&compare=${compare}&from=industry`:''}`);
  try{
   const d=w.document,q=s=>d.querySelector(s),config=JSON.parse(q('[data-mi-config]').textContent);
   const primary=q('[data-mi-map=primary]'),secondary=q('[data-mi-map=secondary]');
   const assertFrame=(state,zoom)=>{
    assert.equal(q('[data-mi-state-select]').value,state);
    assert.equal(q('[data-mi-selected-name]').textContent,data.states.find(item=>item.id===state).name);
    assert.equal(q('[data-mi-zoom]').getAttribute('aria-pressed'),String(zoom));
    assert.equal(new URL(w.location).searchParams.get('zoom')==='1',zoom);
    assert.equal(primary.getAttribute('viewBox'),zoom?config.views[state]:config.mapViewBox);
    assert.equal(secondary.getAttribute('viewBox'),zoom&&compare==='electronics'?config.views[state]:config.mapViewBox);
   };
   assertFrame('05',false);
   q('[data-mi-zoom]').click();assertFrame('05',true);
   change(w,'[data-mi-state-select]','14');assertFrame('14',true);
   q('[data-mi-all]').click();assertFrame('14',false);
   w.history.back();await w.happyDOM.waitUntilComplete();assertFrame('14',true);
   w.history.back();await w.happyDOM.waitUntilComplete();assertFrame('05',true);
   w.history.back();await w.happyDOM.waitUntilComplete();assertFrame('05',false);
   w.history.forward();await w.happyDOM.waitUntilComplete();assertFrame('05',true);
   q('[data-mi-all]').click();assertFrame('05',false);
   primary.setAttribute('viewBox','60 50 790 500');
   change(w,'[data-mi-state-select]','14');assert.equal(primary.getAttribute('viewBox'),'60 50 790 500');
   q('[data-mi-all]').click();assertFrame('14',false);
  }finally{await w.happyDOM.close();}
 }
});

test('Explicit fallback retains both data distributions and status patterns, while the state selector and return remain usable',async()=>{
 const w=await page('?compare=population&state=06&from=population&sourceView=density&only=1&fallback=1');try{const d=w.document,q=s=>d.querySelector(s);assert.equal(q('[data-mexico-field=industry]').dataset.miRenderer,'static-fallback');assert.equal(q('[data-mi-fallback-note]').hidden,false);assert.equal(q('[data-mi-map=primary] [data-mi-shape="06"]').getAttribute('fill'),'url(#mi-primary-confidential)');assert.equal(q('[data-mi-map=primary] [data-mi-shape="06"]').getAttribute('tabindex'),'-1');q('[data-mi-map=primary] [data-mi-shape="08"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(q('[data-mi-state-select]').value,'06');change(w,'[data-mi-state-select]','08');assert.equal(q('[data-mi-state-select]').value,'08');assert.equal(new URL(q('[data-mi-return]').href).searchParams.get('fallback'),'1');for(const slot of ['primary','secondary'])assert.deepEqual(visible(d,slot).map(el=>el.dataset.miShape),['08']);
 }finally{await w.happyDOM.close();}
});
