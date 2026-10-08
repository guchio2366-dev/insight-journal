import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {themes} from '../../src/data/atlas/africa-themes.ts';
import {africaClimateCities} from '../../src/data/atlas/africa-climate-cities.ts';
import {africaIndustryLocations} from '../../src/data/atlas/africa-industry-locations.ts';
import {africaCultureAlternatives} from '../../src/data/atlas/africa-culture-guide.ts';

const base='https://example.com/insight-journal/atlas/africa/';
const params=window=>new URL(window.location.href).searchParams;
const wait=async(condition,message)=>{const end=Date.now()+15000;while(!condition()&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(condition(),message);};
async function page(search,run,{delayMatch}={}){
 const window=new Window({url:base+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 let release;const gate=delayMatch?new Promise(resolve=>release=resolve):Promise.resolve();const requests=[];
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async input=>{const path=new URL(input,base).pathname.replace(/^\/insight-journal/,'');requests.push(path);if(delayMatch?.test(path))await gate;return new Response(readFileSync(new URL('../../public'+path,import.meta.url)));};
  document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=document.querySelector('[data-africa-atlas]'),q=selector=>root.querySelector(selector);
  q('.africa-map').getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();
  if(!delayMatch)await wait(()=>root.dataset.actualLayer==='true'||root.dataset.layerMode==='guide'||root.dataset.field==='industry'||root.dataset.topic==='forestry','source map or explicit guide ready');
  await run({window,root,q,requests,release});
 }finally{release?.();await window.happyDOM.abort();for(const [key,value] of Object.entries(previous))globalThis[key]=value;}
}
const activate=({window,q},selector)=>q(selector).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));

const routes=[['nature','climate',''],['nature','terrain',''],['nature','elevation',''],['nature','water','river'],['nature','water','basin'],['nature','water','rain'],['agriculture','farming',''],['agriculture','livestock',''],['agriculture','forestry',''],['industry','regional',''],['population','distribution',''],['population','ethnicity',''],['population','religion','']];
test('every main topic normalizes legacy statistics URLs and removes country controls instead of hiding them',async()=>{
 for(const [field,topic,water] of routes){
  const search='?'+new URLSearchParams({field,topic,water,place:'EGY',compare:'COD',year:'2023',metric:field==='nature'?'ER.H2O.INTR.PC':'EN.POP.DNST',region:'north',zoom:'country',context:'EN.POP.DNST',sourceState:'field=population&place=EGY',view:'statistics',utm:'keep'});
  await page(search,({window,root,q})=>{
   for(const key of ['place','compare','year','metric','context','sourceState','view'])assert.equal(params(window).has(key),false,`${field}/${topic}: ${key}`);
   assert.equal(params(window).get('utm'),'keep');assert.equal(root.dataset.field,field);assert.equal(root.dataset.topic,topic);assert.equal(root.dataset.layerMode==='guide'||root.dataset.actualLayer==='true'||field==='industry'||topic==='forestry',true);
   for(const selector of ['[data-place]','[data-compare]','[data-year]','[data-metric]','[data-theme-comparison]','[data-theme-return]','[data-country-statistics]'])assert.equal(q(selector),null,selector);
   assert.equal(root.querySelectorAll('[data-country-path]').length,55);for(const path of root.querySelectorAll('[data-country-path]')){assert.equal(path.getAttribute('fill'),'#f3f1e9');assert.equal(path.style.pointerEvents,'none');assert.equal(path.hasAttribute('tabindex'),false);}
   assert.equal(root.querySelectorAll('[data-country-marker],[data-africa-comparison-country]').length,0);
  });
 }
});

test('industry source locations and approved themes retain explanations, sources and reversible selection',async()=>{
 let saved;
 await page('?field=industry&place=EGY&year=2023',context=>{
  const {window,root,q}=context;assert.equal(root.querySelectorAll('[data-africa-industry-location]').length,africaIndustryLocations.length);assert.equal(africaIndustryLocations.length,7);
  for(const item of africaIndustryLocations){activate(context,`[data-africa-industry-location="${item.id}"]`);assert.equal(params(window).get('industryLocation'),item.id);assert.equal(q('[data-theme-title]').textContent,item.label);assert.equal(q('[data-theme-takeaway]').textContent,item.reading);for(const source of item.sources)assert.ok([...q('[data-theme-details]').querySelectorAll('a')].some(link=>link.href===source.url));}
  saved=window.location.search;q('[data-africa-selection-return]').click();assert.equal(params(window).has('industryLocation'),false);window.history.back();assert.equal(window.location.search,saved);
  for(const theme of themes.filter(row=>row.field==='industry')){q(`button[data-theme="${theme.id}"]`).click();assert.equal(q('[data-theme-takeaway]').textContent,theme.takeaway);assert.equal(q('[data-theme-source]').href,theme.source);assert.equal(root.querySelectorAll('[data-africa-industry-location]').length,7);}
  const pick=q('[data-africa-industry-location="jwaneng-diamonds"]');pick.focus();pick.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));assert.equal(params(window).get('industryLocation'),'jwaneng-diamonds');assert.equal(window.document.activeElement.getAttribute('data-africa-industry-location'),'jwaneng-diamonds');
 });
 await page(saved,({q,window})=>assert.equal(q(`[data-africa-industry-location="${params(window).get('industryLocation')}"]`).getAttribute('aria-pressed'),'true'));
});

test('clicking source prose or a passive country boundary never behaves like a field-navigation button',async()=>{
 await page('?field=industry&industryLocation=jwaneng-diamonds&overview=0',context=>{
  const {window,q}=context,search=window.location.search,historyLength=window.history.length;
  assert.equal(q('[data-theme-title]').textContent,africaIndustryLocations.find(row=>row.id==='jwaneng-diamonds').label);
  for(const selector of ['[data-theme-takeaway]','[data-theme-details]','[data-country-path="BWA"]']){
   activate(context,selector);
   assert.equal(window.location.search,search,'passive content cannot clear the source selection or push history');
   assert.equal(window.history.length,historyLength);
   assert.equal(q('[data-africa-industry-location="jwaneng-diamonds"]').getAttribute('aria-pressed'),'true');
  }
 });
});

test('Helwan point and name open the same twelve original monthly values, classification and source with history and reload',async()=>{
 const city=africaClimateCities[0];let saved;
 await page('?field=nature&topic=climate',context=>{
  const {window,root,q}=context;assert.equal(root.querySelectorAll('[data-africa-city-point]').length,1);assert.equal(q('[data-africa-city-readings]').hidden,true);
  for(const selector of ['[data-africa-city-point="helwan"]','[data-africa-city-label="helwan"]']){
   activate(context,selector);assert.equal(params(window).get('city'),'helwan');assert.equal(q('[data-theme-title]').textContent,city.name);
   const article=q('[data-africa-city-reading="helwan"]');assert.equal(article.hidden,false);assert.equal(q('[data-africa-city-readings]').hidden,false);assert.equal(q('[data-theme-source]').href,city.sourceUrl);
   const rows=[...article.querySelectorAll('tbody tr')];assert.equal(rows.length,12);for(const [index,row] of rows.entries()){assert.equal(row.querySelector('th').textContent,`${index+1}月`);const cells=row.querySelectorAll('td');assert.equal(cells[0].textContent,`${city.temperatureC[index].toFixed(1)} ℃`);assert.equal(cells[1].textContent,`${city.precipitationMm[index].toFixed(1)} mm`);}
   assert.ok(article.querySelector('svg'));assert.ok(article.textContent.includes(city.classification.name));assert.equal(q('[data-africa-city-classification-source="helwan"]').href,city.classification.sourceUrl);
   saved=window.location.search;q('[data-africa-selection-return]').click();assert.equal(article.hidden,true);window.history.back();assert.equal(article.hidden,false);window.history.forward();assert.equal(article.hidden,true);
  }
  const label=q('[data-africa-city-label="helwan"]');label.focus();label.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(window.document.activeElement.getAttribute('data-africa-city-label'),'helwan');
 });
 await page(saved,({q})=>assert.equal(q('[data-africa-city-reading="helwan"]').hidden,false));
});

test('late climate grid resolves the current city and never restores a city article on another topic',async()=>{
 for(const leave of [false,true])await page('?field=nature&topic=climate&city=helwan',async context=>{
  const {window,root,q,requests,release}=context;await wait(()=>requests.some(path=>path.endsWith('/climate.values.gz')),'climate grid requested');
  if(leave)q('[data-africa-topic="terrain"]').click();else{q('[data-africa-selection-return]').click();activate(context,'[data-africa-city-label="helwan"]');}
  release();await new Promise(resolve=>setTimeout(resolve,40));
  assert.equal(params(window).get('city'),leave?null:'helwan');assert.equal(q('[data-africa-city-reading="helwan"]').hidden,leave);assert.equal(root.dataset.topic,leave?'terrain':'climate');
 },{delayMatch:/\/climate\.values\.gz$/});
});

test('terrain, rain and forestry expose source gaps without inventing a contour or country distribution',async()=>{
 for(const search of ['?field=nature&topic=terrain','?field=nature&topic=water&water=rain','?field=agriculture&topic=forestry'])await page(search,({root,q,requests})=>{
  assert.match(q('[data-theme-title]').textContent,/地形|降水|森林/);assert.match(q('[data-theme-takeaway]').textContent,/未収録/);
  assert.equal(root.querySelectorAll('[data-africa-raster],[data-africa-elevation-contour],[data-africa-layer-feature]').length,0);assert.equal(requests.some(path=>path.includes('africa-elevation-500m')),false);
  assert.equal(q('[data-africa-actual-key]').hidden,true);
 });
});

test('culture offers source-based alternatives with conditions and implementation status while keeping unprovided maps absent',async()=>{
 for(const topic of ['ethnicity','religion'])await page('?field=population&topic='+topic,({root,q})=>{
  const host=q('[data-africa-alternatives]');assert.equal(host.hidden,false);assert.equal(host.querySelectorAll('.africa-alternative').length,africaCultureAlternatives[topic].length);
  for(const item of africaCultureAlternatives[topic]){for(const text of [item.title,item.proposal,item.reason,item.limitations,item.conditions,item.status])assert.ok(host.textContent.includes(text));for(const source of item.sources)assert.ok([...host.querySelectorAll('a')].some(a=>a.href===source.url));}
  assert.equal(root.querySelectorAll('[data-africa-layer-feature],[data-africa-raster]').length,0);assert.equal(q('[data-africa-actual-key]').hidden,true);
 });
});

test('build retains passive island boundaries, four fields, source downloads and overview route',async()=>{
 await page('',({root,q})=>{assert.equal(root.querySelectorAll('[data-country-path]').length,55);for(const code of ['CPV','STP','COM','MUS','SYC','SSD','ESH'])assert.ok(q(`[data-country-path="${code}"]`));assert.deepEqual([...root.querySelectorAll('.africa-fields [data-field]')].map(node=>node.dataset.field),['agriculture','nature','industry','population']);const overview=new URL(q('[data-africa-overview-link]').href);assert.ok(overview.pathname.endsWith('/atlas/africa/overview/'));assert.equal(overview.searchParams.has('place'),false);assert.equal(overview.searchParams.has('compare'),false);assert.ok(q('.africa-sources'));});
 const sitemap=readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8');assert.match(sitemap,/\/atlas\/africa\//);
});
