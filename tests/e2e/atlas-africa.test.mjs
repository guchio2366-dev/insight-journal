import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {themes} from '../../src/data/atlas/africa-themes.ts';
const html=()=>readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8');

test('Africa build includes sitemap, all fields, countries, sources and CSV fallback',()=>{
 const w=new Window();w.document.write(html());const doc=w.document;
 assert.equal(doc.querySelectorAll('main').length,1);
 assert.equal(doc.querySelectorAll('[data-country-path]').length,55);
 assert.equal(doc.querySelectorAll('[data-field]').length,4);
 assert.equal(doc.querySelector('[data-place]').options.length,55);
 assert.equal(doc.querySelector('[data-metric]').options.length,15);
 assert.ok(doc.querySelector('noscript').textContent.includes('CSV'));
 assert.ok(readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8').includes('/insight-journal/atlas/africa/'));
 const csv=readFileSync(new URL('../../dist/assets/atlas/africa/indicators.csv',import.meta.url),'utf8');
 assert.ok(csv.includes('NGA,ナイジェリア,SP.POP.TOTL,2023,227882945'));
 assert.ok(csv.includes('ESH,西サハラ,SP.POP.TOTL,2023,\r\n'));
 w.happyDOM.abort();
});

test('Africa controller retains country across fields, compares, restores URL history, reports missing and recovers valid year',()=>{
 const w=new Window({url:'https://example.com/insight-journal/atlas/africa/?field=population&place=NGA&compare=EGY&year=2023'});
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
 assert.equal(q('[data-selected-value]').textContent,'7,402');assert.ok(q('[data-comparison]').textContent.includes('1,549'));assert.notEqual(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
 q('[data-field="nature"]').click();assert.ok(q('[data-year]').disabled);assert.ok(q('[data-trend]').textContent.includes('長期平均'));
 q('[data-reset]').click();assert.equal(q('[data-place]').value,'EGY');assert.equal(q('[data-compare]').value,'');assert.equal(q('.africa-map').dataset.theme,'nile-water');assert.notEqual(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
 } finally {for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
});

test('each thematic comparison retains the source marks, all legends and named return with exact source selection',()=>{
 const w=new Window({url:'https://example.com/insight-journal/atlas/africa/'});
 const previous=Object.fromEntries(['window','document','location','history'].map(k=>[k,globalThis[k]]));
 try{
  for(const k of Object.keys(previous))globalThis[k]=w[k];
  w.document.write(html());
  for(const path of w.document.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();const q=s=>w.document.querySelector(s);
  for(const theme of themes){
   w.history.replaceState(null,'',`?field=${theme.field}&place=GHA&compare=EGY&year=2023&zoom=theme&theme=${theme.id}`);
   w.dispatchEvent(new w.PopStateEvent('popstate'));
   const sourceMetric=q('[data-metric]').value,sourceYear=q('[data-year]').value,sourceView=q('.africa-map').getAttribute('viewBox');
   const sourceMarks=q('[data-theme-marks]').innerHTML;
   assert.equal(q('[data-theme-title]').textContent,`ガーナ：${theme.title}`);
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
  assert.equal(q('[data-theme-takeaway-detail]').textContent,themes.find(t=>t.field==='industry').takeaway);
 }finally{for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
});

test('theme entry aligns unselected countries and preserves explicit selection without muting the theme',()=>{
 const w=new Window({url:'https://example.com/insight-journal/atlas/africa/'});
 const previous=Object.fromEntries(['window','document','location','history'].map(k=>[k,globalThis[k]]));
 try{
  for(const k of Object.keys(previous))globalThis[k]=w[k];
  w.document.write(html());
  for(const path of w.document.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();const q=s=>w.document.querySelector(s);
  q('[data-field="agriculture"]').click();assert.equal(q('[data-place]').value,'CIV');
  q('[data-field="industry"]').click();assert.equal(q('[data-place]').value,'ZMB');
  q('[data-place]').value='EGY';q('[data-place]').dispatchEvent(new w.Event('change'));
  q('[data-field="agriculture"]').click();assert.equal(q('[data-place]').value,'EGY');
  w.history.replaceState(null,'','?field=population&theme=urban-connections&place=EGY&compare=GHA&region=north&year=2021&zoom=theme');
  w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(w.document.querySelectorAll('.africa-country.is-muted').length,0);
  assert.equal(q('[data-country-marker="NGA"]').getAttribute('opacity'),'1');
  const sourceView=q('.africa-map').getAttribute('viewBox');
  q('[data-theme-comparison]').click();q('[data-theme-return]').click();
  assert.equal(q('[data-place]').value,'EGY');assert.equal(q('[data-compare]').value,'GHA');assert.equal(q('[data-region]').value,'north');
  assert.equal(q('.africa-map').getAttribute('viewBox'),sourceView);
  q('[data-field="industry"]').click();assert.equal(q('[data-place]').value,'EGY');assert.equal(q('[data-region]').value,'north');
  assert.ok(q('[data-place-note]').textContent.includes('テーマの代表地点の数値ではありません'));
  q('[data-zoom="region"]').click();assert.ok(w.document.querySelectorAll('.africa-country.is-muted').length>0);
 }finally{for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
});
