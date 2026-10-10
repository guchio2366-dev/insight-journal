import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {latestValueAt,formatValue,metricById} from '../../src/data/atlas/africa-atlas.ts';
import {themes} from '../../src/data/atlas/africa-themes.ts';
const html=()=>readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8');
function withAfricaPage(url,run){
 const w=new Window({url,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const previous=Object.fromEntries(['window','document','location','history'].map(k=>[k,globalThis[k]]));
 try{
  for(const k of Object.keys(previous))globalThis[k]=w[k];
  w.document.write(html());
  for(const path of w.document.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();return run(w,s=>w.document.querySelector(s));
 }finally{for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
}

test('actual industry entries change the theme, map and reader while preserving pinned selections',()=>{
 withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=industry&place=EGY&compare=GHA&year=2023&only=1&fallback=1',(w,q)=>{
  const entries=[...q('[data-africa-subfields]').querySelectorAll('button[data-theme]')];
  assert.deepEqual(entries.map(b=>b.dataset.theme),themes.filter(t=>t.field==='industry').map(t=>t.id));
  assert.equal(w.document.querySelectorAll('button[data-theme]').length,2);
  assert.equal(q('[data-africa-topic="regional"]'),null);
  q('button[data-theme="copperbelt-connections"]').click();
  const copperView=q('.africa-map').getAttribute('viewBox');
  q('button[data-theme="casablanca-manufacturing"]').click();
  const casablanca=themes.find(t=>t.id==='casablanca-manufacturing');
  assert.equal(q('.africa-map').dataset.theme,casablanca.id);
  assert.equal(q('.africa-map').getAttribute('viewBox'),copperView);
  assert.equal(q('button[data-theme="casablanca-manufacturing"]').getAttribute('aria-pressed'),'true');
  assert.equal(q('button[data-theme="copperbelt-connections"]').getAttribute('aria-pressed'),'false');
  assert.ok(q('[data-theme-title]').textContent.includes(casablanca.title));
  assert.equal(q('[data-theme-takeaway-detail]').textContent,casablanca.takeaway);
  assert.equal(q('[data-theme-legend]').children.length,casablanca.marks.length);
  for(const [key,value] of Object.entries({place:'EGY',compare:'GHA',year:'2023',only:'1',fallback:'1'}))assert.equal(new URL(w.location.href).searchParams.get(key),value);
  w.history.back();assert.equal(q('.africa-map').dataset.theme,'copperbelt-connections');
  assert.equal(q('button[data-theme="copperbelt-connections"]').getAttribute('aria-pressed'),'true');
 });
});

test('legacy agriculture metric URLs follow selection, history and reload',()=>{
 const forestURL=withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=agriculture&place=GHA&unknown=preserve',(w,q)=>{
  assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');
  assert.ok(q('.africa-main').contains(q('[data-africa-subfields]')));
  assert.equal(q('[data-africa-subfields]').closest('[data-africa-map-subfields]'),q('[data-africa-map-subfields]'));
  q('[data-metric]').value='AG.LND.FRST.ZS';q('[data-metric]').dispatchEvent(new w.Event('change'));
  assert.equal(q('[data-theme-marks]').children.length,0);
  assert.equal(q('[data-theme-legend]').children.length,0);
  assert.ok(q('[data-theme-title]').textContent.includes('森林'));
  assert.equal(q('[data-metric]').value,'AG.LND.FRST.ZS');
  assert.equal(new URL(w.location.href).searchParams.get('topic'),'forestry');
  const saved=w.location.href;
  w.history.back();assert.equal(q('[data-metric]').value,'AG.LND.ARBL.ZS');
  assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');
  assert.equal(q('[data-africa-topic="forestry"]').getAttribute('aria-pressed'),'false');
  w.history.forward();assert.equal(q('[data-africa-topic="forestry"]').getAttribute('aria-pressed'),'true');
  q('[data-metric]').value='AG.YLD.CREL.KG';q('[data-metric]').dispatchEvent(new w.Event('change'));
  assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');
  q('[data-metric]').value='AG.LND.FRST.ZS';q('[data-metric]').dispatchEvent(new w.Event('change'));
  assert.equal(q('[data-africa-topic="forestry"]').getAttribute('aria-pressed'),'true');
  assert.equal(new URL(w.location.href).searchParams.get('unknown'),'preserve');return saved;
 });
 withAfricaPage(forestURL,(_w,q)=>assert.equal(q('[data-africa-topic="forestry"]').getAttribute('aria-pressed'),'true'));
 withAfricaPage('https://example.com/atlas/africa/?field=agriculture&metric=AG.LND.ARBL.ZS&topic=forestry',(_w,q)=>assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true'));
});

test('the forestry tab opens the independent regional forestry route',()=>{
 withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=agriculture',(w,q)=>{
  let destination;w.location.assign=url=>{destination=url;};
  q('[data-africa-topic="forestry"]').click();
  assert.equal(destination,'/insight-journal/atlas/africa/agriculture/forestry/');
 });
});

test('spatial categories and water depth persist across reload, country changes and back/forward',()=>{
 for(const [field,planned,ready] of [['nature','climate','water'],['population','religion','distribution']]){
  const saved=withAfricaPage(`https://example.com/insight-journal/atlas/africa/?field=${field}&topic=${ready}&place=EGY&unknown=preserve`,(w,q)=>{
   q(`[data-africa-topic="${planned}"]`).click();
   assert.equal(new URL(w.location.href).searchParams.get('topic'),planned);
   assert.equal(q('[data-africa-subfield-status]').hidden,false);if(field==='population'){assert.match(q('[data-africa-subfield-status]').textContent,/この画面に分布図はありません/);assert.equal(q('[data-africa-subfield-status]').previousElementSibling,q('[data-africa-subfields]'));}
   const saved=w.location.href;
   q('[data-place]').value='GHA';q('[data-place]').dispatchEvent(new w.Event('change'));
   w.history.back();assert.equal(q('[data-place]').value,'EGY');
   assert.equal(q(`[data-africa-topic="${planned}"]`).getAttribute('aria-pressed'),'true');
   w.history.back();assert.equal(q(`[data-africa-topic="${ready}"]`).getAttribute('aria-pressed'),'true');
   assert.equal(q('[data-africa-subfield-status]').hidden,field==='nature');
   w.history.forward();assert.equal(q(`[data-africa-topic="${planned}"]`).getAttribute('aria-pressed'),'true');
   w.history.forward();assert.equal(q('[data-place]').value,'GHA');
   assert.equal(q('[data-africa-subfield-status]').hidden,false);if(field==='population'){assert.match(q('[data-africa-subfield-status]').textContent,/この画面に分布図はありません/);assert.equal(q('[data-africa-subfield-status]').previousElementSibling,q('[data-africa-subfields]'));}return saved;
  });
  withAfricaPage(saved,(_w,q)=>{assert.equal(q(`[data-africa-topic="${planned}"]`).getAttribute('aria-pressed'),'true');assert.equal(q('[data-africa-subfield-status]').hidden,false);if(field==='population'){assert.match(q('[data-africa-subfield-status]').textContent,/この画面に分布図はありません/);assert.equal(q('[data-africa-subfield-status]').previousElementSibling,q('[data-africa-subfields]'));}});
 }
 const basinURL=withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=nature&topic=water&place=EGY',(w,q)=>{
  q('[data-africa-water="river"]').click();assert.equal(q('[data-metric]').value,'ER.H2O.INTR.PC');
  q('[data-africa-water="basin"]').click();assert.equal(new URL(w.location.href).searchParams.get('water'),'basin');
  const saved=w.location.href;assert.equal(q('[data-africa-subfield-status]').hidden,false);
  q('[data-africa-water="rain"]').click();assert.equal(q('[data-metric]').value,'AG.LND.PRCP.MM');assert.equal(q('[data-africa-subfield-status]').hidden,true);
  w.history.back();assert.equal(q('[data-africa-water="basin"]').getAttribute('aria-pressed'),'true');
  w.history.back();assert.equal(q('[data-africa-water="river"]').getAttribute('aria-pressed'),'true');assert.equal(q('[data-africa-subfield-status]').hidden,false);
  w.history.forward();assert.equal(q('[data-africa-water="basin"]').getAttribute('aria-pressed'),'true');
  w.history.forward();assert.equal(q('[data-africa-water="rain"]').getAttribute('aria-pressed'),'true');return saved;
 });
 withAfricaPage(basinURL,(_w,q)=>{assert.equal(q('[data-africa-water="basin"]').getAttribute('aria-pressed'),'true');assert.equal(q('[data-africa-subfield-status]').hidden,false);});
 withAfricaPage('https://example.com/atlas/africa/?field=population&topic=__proto__&water=bad',(_w,q)=>{assert.equal(q('[data-africa-topic="distribution"]').getAttribute('aria-pressed'),'true');assert.equal(q('[data-africa-subfield-status]').hidden,false);});
});

test('Africa build includes sitemap, all fields, countries, sources and CSV fallback',()=>{
 const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.write(html());const doc=w.document;
 assert.equal(doc.querySelectorAll('main').length,1);
 assert.equal(doc.querySelectorAll('[data-country-path]').length,55);
 assert.equal(doc.querySelectorAll('[data-field]').length,4);
 assert.equal(doc.querySelector('[data-place]').options.length,56);
 assert.equal(doc.querySelector('[data-place]').options[0].value,'');
 assert.equal(doc.querySelector('[data-metric]').options.length,15);
 assert.ok(doc.querySelector('noscript').textContent.includes('CSV'));
 assert.ok(readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8').includes('/insight-journal/atlas/africa/'));
 const csv=readFileSync(new URL('../../dist/assets/atlas/africa/indicators.csv',import.meta.url),'utf8');
 assert.ok(csv.includes('NGA,ナイジェリア,SP.POP.TOTL,2023,227882945'));
 assert.ok(csv.includes('ESH,西サハラ,SP.POP.TOTL,2023,\r\n'));
 w.happyDOM.abort();
});

test('Africa controller retains country across fields, compares, restores URL history, reports missing and recovers valid year',()=>{
 const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:'https://example.com/insight-journal/atlas/africa/?field=population&place=NGA&compare=EGY&year=2023'});
 const previous=Object.fromEntries(['window','document','location','history'].map(k=>[k,globalThis[k]]));
 try{
 for(const k of Object.keys(previous))globalThis[k]=w[k];
 w.document.write(html());
 for(const path of w.document.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
 initializeAfricaAtlas();const doc=w.document;const q=s=>doc.querySelector(s);
 assert.equal(q('[data-selected-name]').textContent,'ナイジェリア');assert.equal(q('[data-selected-value]').textContent,'227,882,945');assert.ok(q('[data-comparison]').textContent.includes('114,535,772'));
 q('[data-field="industry"]').click();assert.equal(q('[data-place]').value,'NGA');assert.equal(q('[data-year]').value,'2023');
 q('[data-metric]').value='NY.GDP.TOTL.RT.ZS';q('[data-metric]').dispatchEvent(new w.Event('change'));assert.equal(q('[data-selected-value]').textContent,'未収録');
 q('[data-latest]').click();assert.equal(q('[data-year]').value,'2021');assert.notEqual(q('[data-selected-value]').textContent,'未収録');
 q('[data-place]').value='ESH';q('[data-place]').dispatchEvent(new w.Event('change'));assert.equal(q('[data-selected-value]').textContent,'未収録');assert.ok(q('[data-place-note]').textContent.includes('転用しません'));
 w.history.replaceState(null,'','?field=agriculture&metric=AG.YLD.CREL.KG&place=EGY&compare=NGA&year=2023&zoom=country');w.dispatchEvent(new w.PopStateEvent('popstate'));
 assert.equal(q('[data-selected-value]').textContent,formatValue(latestValueAt('AG.YLD.CREL.KG','EGY').value,metricById('AG.YLD.CREL.KG')));assert.equal(q('[data-compare]').value,'');assert.match(q('[data-metric-year]').textContent,/最新収録年/);assert.notEqual(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
 q('[data-field="nature"]').click();assert.ok(q('[data-year]').disabled);assert.ok(q('[data-trend]').textContent.includes('長期平均'));
 q('[data-reset]').click();assert.equal(q('[data-place]').value,'');assert.equal(q('[data-compare]').value,'');assert.equal(q('[data-africa-topic="climate"]').getAttribute('aria-pressed'),'true');assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
 } finally {for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
});

test('each thematic comparison retains the source marks, all legends and named return with exact source selection',()=>{
 const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:'https://example.com/insight-journal/atlas/africa/'});
 const previous=Object.fromEntries(['window','document','location','history'].map(k=>[k,globalThis[k]]));
 try{
  for(const k of Object.keys(previous))globalThis[k]=w[k];
  w.document.write(html());
  for(const path of w.document.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();const q=s=>w.document.querySelector(s);
  // Agriculture now has a fixed distribution-first reading and no comparison action.
  // Its retained original reading/source is covered by the agriculture E2E suite.
  for(const theme of themes.filter(theme=>theme.field!=='agriculture')){
   w.history.replaceState(null,'',`?field=${theme.field}&place=GHA&compare=EGY&year=2023&zoom=theme&theme=${theme.id}`);
   w.dispatchEvent(new w.PopStateEvent('popstate'));
   const sourceMetric=q('[data-metric]').value,sourceYear=q('[data-year]').value,sourceView=q('.africa-map').getAttribute('viewBox');
   const sourceMarks=q('[data-theme-marks]').innerHTML;
   assert.equal(q('[data-theme-title]').textContent,theme.title);
   assert.ok(q('.africa-kicker').textContent.includes('ガーナ'));
   assert.equal(q('[data-theme-legend]').children.length,theme.marks.length);
   assert.equal(q('[data-legend]').children.length,sourceMetric==='SP.POP.TOTL'?2:6);
   q('[data-theme-comparison]').click();
   assert.equal(q('[data-theme-marks]').innerHTML,sourceMarks);
   assert.equal(q('[data-theme-legend]').children.length,theme.marks.length);
   assert.equal(q('[data-legend]').children.length,6);
   assert.equal(q('[data-theme-takeaway-detail]').textContent,theme.compareText);
   assert.ok(q('[data-theme-takeaway]').textContent.trim());
   assert.ok(q('[data-theme-return]').textContent.includes(theme.title));
   assert.ok(q('[data-theme-return]').textContent.includes('ガーナ'));
   assert.equal(q('[data-place]').value,'GHA');assert.equal(q('[data-compare]').value,'EGY');
   assert.equal(q('[data-metric]').value,sourceMetric);assert.equal(q('[data-year]').value,sourceYear);
   assert.equal(q('[data-source]').getAttribute('href'),`https://data.worldbank.org/indicator/${theme.compareMetric}`);
   w.dispatchEvent(new w.PopStateEvent('popstate'));
   assert.equal(q('[data-theme-takeaway-detail]').textContent,theme.compareText);
   q('[data-theme-return]').click();
   assert.equal(q('[data-theme-takeaway-detail]').textContent,theme.takeaway);
   assert.equal(q('[data-metric]').value,sourceMetric);assert.equal(q('[data-year]').value,sourceYear);
   assert.equal(q('.africa-map').getAttribute('viewBox'),sourceView);
   assert.equal(new URL(w.location.href).searchParams.has('context'),false);
  }
  q('[data-theme-comparison]').click();q('[data-field="industry"]').click();
  assert.equal(new URL(w.location.href).searchParams.has('context'),false);
  assert.equal(q('[data-africa-atlas]').dataset.overview,'true');
  q('button[data-theme="copperbelt-connections"]').click();
  assert.equal(q('[data-theme-takeaway-detail]').textContent,themes.find(t=>t.field==='industry').takeaway);
 }finally{for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
});

test('theme entry aligns unselected countries and preserves explicit selection without muting the theme',()=>{
 const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:'https://example.com/insight-journal/atlas/africa/'});
 const previous=Object.fromEntries(['window','document','location','history'].map(k=>[k,globalThis[k]]));
 try{
  for(const k of Object.keys(previous))globalThis[k]=w[k];
  w.document.write(html());
  for(const path of w.document.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();const q=s=>w.document.querySelector(s);
  q('[data-field="agriculture"]').click();assert.equal(q('[data-place]').value,'');
  q('[data-field="industry"]').click();assert.equal(q('[data-place]').value,'');
  assert.equal(q('[data-africa-industry-overview]').getAttribute('aria-pressed'),'true');assert.equal(w.document.querySelectorAll('[data-africa-industry-theme]').length,2);assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
  q('[data-africa-industry-theme="casablanca-manufacturing"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(q('[data-africa-atlas]').dataset.overview,'false');assert.equal(q('[data-place]').value,'');assert.equal(q('[data-theme-takeaway-detail]').textContent,themes.find(t=>t.id==='casablanca-manufacturing').takeaway);
  q('[data-field="population"]').click();assert.equal(q('[data-place]').value,'');assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
  q('[data-place]').value='EGY';q('[data-place]').dispatchEvent(new w.Event('change'));
  q('[data-field="agriculture"]').click();assert.equal(q('[data-place]').value,'EGY');
  w.history.replaceState(null,'','?field=population&theme=urban-connections&place=EGY&compare=GHA&region=north&year=2021&zoom=theme');
  w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(w.document.querySelectorAll('.africa-country.is-muted').length,0);
  assert.equal(q('[data-country-marker="NGA"]').getAttribute('opacity'),'1');
  const sourceView=q('.africa-map').getAttribute('viewBox');
  const overview=new URL(q('[data-africa-overview-link]').href);for(const [key,value]of Object.entries({place:'EGY',compare:'GHA',region:'north',year:'2021',zoom:'theme',field:'population',view:'statistics'}))assert.equal(overview.searchParams.get(key),value);assert.equal(overview.searchParams.has('country'),false);
  q('[data-theme-comparison]').click();q('[data-theme-return]').click();
  assert.equal(q('[data-place]').value,'EGY');assert.equal(q('[data-compare]').value,'GHA');assert.equal(q('[data-region]').value,'north');
  assert.equal(q('.africa-map').getAttribute('viewBox'),sourceView);
  q('[data-field="industry"]').click();assert.equal(q('[data-place]').value,'EGY');assert.equal(q('[data-region]').value,'north');
  assert.ok(q('[data-place-note]').textContent.includes('テーマの代表地点の数値ではありません'));
  q('[data-zoom="region"]').click();assert.ok(w.document.querySelectorAll('.africa-country.is-muted').length>0);
 }finally{for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
});
