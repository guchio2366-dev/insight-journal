import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
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
 q('[data-reset]').click();assert.equal(q('[data-place]').value,'EGY');assert.equal(q('[data-compare]').value,'');assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
 } finally {for(const k of Object.keys(previous))globalThis[k]=previous[k];w.happyDOM.abort();}
});
