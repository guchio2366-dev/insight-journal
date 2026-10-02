import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {europeCountryOverviews} from '../../src/data/atlas/europe/country-overviews.ts';

const html=await readFile('dist/atlas/europe/overview/index.html','utf8');
const bundle=(await build({entryPoints:['src/scripts/atlas-europe-country-overview.ts'],bundle:true,write:false,format:'iife',globalName:'CountryOverview'})).outputFiles[0].text+';CountryOverview.initEuropeCountryOverview(document.querySelector("[data-country-overview]"));';
function setup(search='',interactive=false){const w=new Window({url:`https://example.test/insight-journal/atlas/europe/overview/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});w.document.body.innerHTML=html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');if(interactive)w.eval(bundle);return w;}

test('published overview SSR keeps the regional SVG and embeds a complete 45×5 sourced edition without placeholder articles',async()=>{
 const w=setup();try{const d=w.document,config=JSON.parse(d.querySelector('[data-overview-config]').textContent);
  assert.equal(config.overviews.length,45);assert.deepEqual(config.overviews.map(c=>c.code),europeCountryOverviews.map(c=>c.code));
  assert.equal(d.querySelectorAll('[data-overview-map-country]').length,45);assert.equal(d.querySelector('[data-overview-country-detail]').hidden,true);assert.equal(d.querySelector('[data-overview-europe-country-slot]').hidden,true);
  assert.equal(d.querySelectorAll('[role="tab"]').length,5);assert.equal(d.querySelectorAll('[role="tabpanel"]').length,5);assert.equal(d.querySelector('.country-overview-status'),null);
  assert.match(d.querySelector('noscript').textContent,/JavaScript/);
  for(const country of config.overviews){assert.deepEqual(country.topics,europeCountryOverviews.find(c=>c.code===country.code).topics);assert.equal(Object.keys(country.topics).length,5);assert.equal(country.facts.length,10);
   for(const copy of Object.values(country.topics)){assert.ok(copy.takeaway.trim()&&copy.body.trim());assert.doesNotMatch(copy.takeaway+copy.body,/準備中|本文を準備|説明する予定/);assert.ok(copy.sourceIds.length);assert.ok(copy.sourceIds.every(id=>config.sources.some(s=>s.id===id)));}
  }
  const ids=[...d.querySelectorAll('[id]')].map(node=>node.id);assert.equal(new Set(ids).size,ids.length);
 }finally{w.happyDOM.abort();}
});

test('all 225 selections in built HTML expose their own copy, source fold and country-preserving field destinations',async()=>{
 const w=setup('?country=DEU&topic=politics',true);try{const d=w.document,picker=d.querySelector('[data-overview-country]');
  for(const country of europeCountryOverviews){picker.value=country.code;picker.dispatchEvent(new w.Event('change'));
   for(const [topic,copy] of Object.entries(country.topics)){d.querySelector(`[data-overview-topic="${topic}"]`).click();const panel=d.querySelector(`#overview-panel-${topic}`);assert.equal(panel.hidden,false);assert.equal(panel.querySelector('[data-eu-country-takeaway]').textContent,copy.takeaway);assert.equal(panel.querySelector('[data-eu-country-sources]').children.length,copy.sourceIds.length);assert.equal(panel.querySelector('details').open,false);
    for(const a of panel.querySelectorAll('[data-eu-country-links] a')){const u=new URL(a.href);if(u.origin===w.location.origin){assert.equal(u.searchParams.get('place'),country.code);assert.ok(u.searchParams.get('overviewReturn'));await access('dist/'+u.pathname.replace('/insight-journal/','')+'index.html');}}
   }
  }
 }finally{w.happyDOM.abort();}
});

test('only European learning routes load the new country return controller',async()=>{
 for(const field of ['agriculture','nature','industry','population']){const page=await readFile(`src/pages/atlas/europe/${field}/index.astro`,'utf8');assert.match(page,/initEuropeCountryOverviewReturn/);}
 for(const route of ['north-america/canada/nature','north-america/mexico/nature','asia/east-asia/overview']){const page=await readFile(`dist/atlas/${route}/index.html`,'utf8');assert.doesNotMatch(page,/eu-country-overview-return|data-europe-country-overview/);}
});
