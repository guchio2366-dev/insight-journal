import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {latestValueAt,formatValue,metricById} from '../../src/data/atlas/africa-atlas.ts';
import {africaIndustryLocations,africaIndustryCommodities} from '../../src/data/atlas/africa-industry-locations.ts';
const html=()=>readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
async function withAfricaPage(url,run){
 const w=new Window({url,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(k=>[k,globalThis[k]]));
 const requests=[];
 try{
  for(const k of ['window','document','location','history'])globalThis[k]=w[k];
  globalThis.fetch=async url=>{const path=new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,'');assert.ok(path.startsWith('/assets/atlas/'),'fixture fetches only local atlas assets');requests.push(path);return new Response(readFileSync(new URL('../../public'+path,import.meta.url)),{status:200});};
  w.document.write(html());
  for(const path of w.document.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  const q=s=>w.document.querySelector(s);
  // Let local JSON/decompression callbacks finish before reading actual layers.
  const settle=async()=>{for(let n=0;n<600;n++){await new Promise(resolve=>setTimeout(resolve,5));const root=q('[data-africa-atlas]'),params=new URL(w.location.href).searchParams;if(root.dataset.actualLayer==='true'||root.dataset.layerMode==='guide'||root.dataset.field==='industry'||params.get('view')==='statistics'||q('[data-metric]').value==='AG.LND.FRST.ZS'){await new Promise(resolve=>setTimeout(resolve,5));return;}}throw new Error('Local atlas fixture did not finish loading');};
  initializeAfricaAtlas();await settle();return await run(w,q,settle,requests);
 }finally{await w.happyDOM.abort();for(const k of Object.keys(previous))globalThis[k]=previous[k];}
}
const change=(w,node,value)=>{node.value=value;node.dispatchEvent(new w.Event('change',{bubbles:true}));};

test('industry commodity selection retains all 49 locations, emphasizes matching marks and restores history',async()=>{
 await withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=industry&place=EGY&compare=GHA&year=2023&only=1&fallback=1',(w,q)=>{
  const select=q('[data-africa-industry-commodity]');assert.deepEqual([...select.options].slice(1).map(o=>o.value),africaIndustryCommodities.map(item=>item.id));assert.equal(select.options.length,19);
  assert.equal(q('button[data-theme]'),null);assert.equal(w.document.querySelectorAll('[data-africa-industry-location]').length,49);assert.equal(q('[data-africa-layer-legend]').children.length,18);
  const camera=q('.africa-map').getAttribute('viewBox');change(w,select,'copper-cobalt');change(w,q('[data-africa-industry-commodity]'),'automotive-aerospace');
  assert.equal(q('[data-theme-title]').textContent,'自動車・航空機製造の分布');assert.equal(q('[data-africa-layer-legend]').children.length,1);assert.equal(q('.africa-map').getAttribute('viewBox'),camera);
  assert.equal(w.document.querySelectorAll('[data-africa-industry-location]').length,49);assert.equal(q('[data-africa-industry-location="jwaneng-diamonds"] circle:nth-child(2)').getAttribute('opacity'),'0.35');
  for(const [key,value] of Object.entries({place:'EGY',compare:'GHA',year:'2023',only:'1',fallback:'1'}))assert.equal(new URL(w.location.href).searchParams.get(key),value);
  w.history.back();assert.equal(q('[data-africa-industry-commodity]').value,'copper-cobalt');assert.equal(q('[data-theme-title]').textContent,'銅・コバルトの分布');
 });
});

test('legacy industry theme URLs resolve to commodity distributions',async()=>{
 for(const [theme,commodity] of [['copperbelt-connections','copper-cobalt'],['casablanca-manufacturing','automotive-aerospace']])await withAfricaPage(`https://example.com/atlas/africa/?field=industry&theme=${theme}`,(_w,q)=>{assert.equal(q('[data-africa-industry-commodity]').value,commodity);assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');});
});

test('legacy agriculture metric URLs retain history, reload and navigation above the map frame',async()=>{
 const saved=await withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=agriculture&place=GHA&unknown=preserve',(w,q)=>{
  const nav=q('[data-africa-subfields]');assert.equal(nav.parentElement,q('.africa-main'));assert.equal(nav.closest('[data-africa-map-subfields]'),null);assert.ok(nav.compareDocumentPosition(q('.africa-map'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');change(w,q('[data-metric]'),'AG.LND.FRST.ZS');
  assert.equal(q('[data-theme-marks]').children.length,0);assert.equal(q('[data-theme-legend]').children.length,0);assert.match(q('[data-theme-title]').textContent,/森林/);assert.equal(new URL(w.location.href).searchParams.get('topic'),'forestry');const saved=w.location.href;
  w.history.back();assert.equal(q('[data-metric]').value,'AG.LND.ARBL.ZS');assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');w.history.forward();assert.equal(q('[data-africa-topic="forestry"]').getAttribute('aria-pressed'),'true');
  change(w,q('[data-metric]'),'AG.YLD.CREL.KG');assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true');change(w,q('[data-metric]'),'AG.LND.FRST.ZS');assert.equal(new URL(w.location.href).searchParams.get('unknown'),'preserve');return saved;
 });
 await withAfricaPage(saved,(_w,q)=>assert.equal(q('[data-africa-topic="forestry"]').getAttribute('aria-pressed'),'true'));
 await withAfricaPage('https://example.com/atlas/africa/?field=agriculture&metric=AG.LND.ARBL.ZS&topic=forestry',(_w,q)=>assert.equal(q('[data-africa-topic="farming"]').getAttribute('aria-pressed'),'true'));
});

test('the forestry tab opens the independent regional forestry route',async()=>{
 await withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=agriculture',(w,q)=>{let destination;w.location.assign=url=>{destination=url;};q('[data-africa-topic="forestry"]').click();assert.equal(destination,'/insight-journal/atlas/africa/agriculture/forestry/');});
});

test('population topics distinguish Pew religion, language points and the unresolved ethnicity guide through history',async()=>{
 const saved=await withAfricaPage('https://example.com/atlas/africa/?field=population&topic=religion&place=EGY&unknown=preserve',async(w,q,settle)=>{
  assert.equal(q('[data-africa-atlas]').dataset.actualLayer,'true');assert.equal(w.document.querySelectorAll('[data-africa-religion-country]:not([data-africa-religion-mixed])').length,55);assert.match(q('[data-theme-source]').href,/pewresearch/);
  q('[data-africa-topic="language"]').click();await settle();assert.equal(w.document.querySelectorAll('[data-africa-language-point]').length,2222);assert.match(q('[data-theme-source]').href,/glottolog/);assert.equal(w.document.querySelectorAll('[data-africa-religion-country]:not([data-africa-religion-mixed])').length,0);
  q('[data-africa-topic="ethnicity"]').click();assert.equal(q('[data-africa-atlas]').dataset.layerMode,'guide');assert.match(q('[data-africa-subfield-status]').textContent,/ガーナ.*全域は未取得/);assert.equal(q('[data-theme-comparison]').hidden,true);assert.equal(w.document.querySelectorAll('[data-africa-ethnicity-group]').length,9);assert.equal(w.document.querySelectorAll('[data-africa-ethnicity-region]').length,16);assert.equal(w.document.querySelectorAll('[data-africa-ethnicity-regional-group]').length,144);assert.match(q('[data-africa-ethnicity-evidence-reading]').textContent,/エジプトの民族構成は未取得/);const saved=w.location.href;
  change(w,q('[data-place]'),'GHA');w.history.back();assert.equal(q('[data-place]').value,'EGY');w.history.back();await settle();assert.equal(q('[data-africa-topic="language"]').getAttribute('aria-pressed'),'true');assert.equal(w.document.querySelectorAll('[data-africa-language-point]').length,2222);w.history.back();assert.equal(w.document.querySelectorAll('[data-africa-religion-country]:not([data-africa-religion-mixed])').length,55);assert.equal(new URL(w.location.href).searchParams.get('unknown'),'preserve');return saved;
 });
 await withAfricaPage(saved,(_w,q)=>assert.equal(q('[data-africa-atlas]').dataset.layerMode,'guide'));
 await withAfricaPage('https://example.com/atlas/africa/?field=population&topic=__proto__&water=bad',(_w,q)=>assert.equal(q('[data-africa-topic="distribution"]').getAttribute('aria-pressed'),'true'));
});

test('water modes retain ready local distributions, metric units and URL history',async()=>{
 const saved=await withAfricaPage('https://example.com/atlas/africa/?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&place=EGY',async(w,q,settle)=>{
  assert.equal(q('[data-metric]').value,'ER.H2O.INTR.PC');assert.equal(w.document.querySelectorAll('[data-africa-layer-feature]').length,32);
  q('[data-africa-water="basin"]').click();await settle();assert.equal(w.document.querySelectorAll('[data-africa-basin]').length,11);assert.equal(q('[data-africa-subfield-status]').hidden,true);const saved=w.location.href;
  q('[data-africa-water="rain"]').click();await settle();assert.equal(q('[data-metric]').value,'AG.LND.PRCP.MM');assert.match(q('[data-unit]').textContent,/mm/);assert.match(q('[data-theme-source]').href,/gpcc/);
  w.history.back();assert.equal(q('[data-africa-water="basin"]').getAttribute('aria-pressed'),'true');w.history.back();assert.equal(q('[data-africa-water="river"]').getAttribute('aria-pressed'),'true');w.history.forward();w.history.forward();assert.equal(q('[data-africa-water="rain"]').getAttribute('aria-pressed'),'true');return saved;
 });
 await withAfricaPage(saved,(_w,q)=>assert.equal(q('[data-africa-water="basin"]').getAttribute('aria-pressed'),'true'));
});

test('Africa build includes sitemap, all fields, countries, sources and truthful CSV missing values',async()=>{
 await withAfricaPage('https://example.com/atlas/africa/',(_w,q)=>{assert.equal(q('[data-africa-atlas]').querySelectorAll('[data-country-path]').length,55);assert.equal(q('[data-place]').options.length,56);assert.equal(q('[data-place]').options[0].value,'');assert.equal(q('[data-metric]').options.length,15);assert.equal(q('[data-africa-atlas]').querySelectorAll('[data-field]').length,4);assert.match(q('noscript').textContent,/CSV/);});
 assert.ok(readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8').includes('/insight-journal/atlas/africa/'));const csv=readFileSync(new URL('../../dist/assets/atlas/africa/indicators.csv',import.meta.url),'utf8');assert.ok(csv.includes('NGA,ナイジェリア,SP.POP.TOTL,2023,227882945'));assert.ok(csv.includes('ESH,西サハラ,SP.POP.TOTL,2023,\r\n'));
});

test('country statistics retain comparison, missing values, valid years and reset across fields',async()=>{
 await withAfricaPage('https://example.com/atlas/africa/?field=population&place=NGA&compare=EGY&year=2023',async(w,q,settle)=>{
  assert.equal(q('[data-selected-name]').textContent,'ナイジェリア');assert.equal(q('[data-selected-value]').textContent,'227,882,945');assert.match(q('[data-comparison]').textContent,/114,535,772/);
  q('[data-field="industry"]').click();assert.equal(q('[data-place]').value,'NGA');assert.equal(q('[data-year]').value,'2023');change(w,q('[data-metric]'),'NY.GDP.TOTL.RT.ZS');assert.equal(q('[data-selected-value]').textContent,'未収録');q('[data-latest]').click();assert.equal(q('[data-year]').value,'2021');assert.notEqual(q('[data-selected-value]').textContent,'未収録');change(w,q('[data-place]'),'ESH');assert.equal(q('[data-selected-value]').textContent,'未収録');assert.match(q('[data-place-note]').textContent,/転用しません/);
  w.history.replaceState(null,'','?field=agriculture&metric=AG.YLD.CREL.KG&place=EGY&compare=NGA&year=2023&zoom=country');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-selected-value]').textContent,formatValue(latestValueAt('AG.YLD.CREL.KG','EGY').value,metricById('AG.YLD.CREL.KG')));assert.equal(q('[data-compare]').value,'');assert.match(q('[data-metric-year]').textContent,/最新収録年/);assert.notEqual(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
  q('[data-field="nature"]').click();await settle();assert.equal(q('[data-year]').disabled,true);assert.match(q('[data-trend]').textContent,/長期平均/);q('[data-reset]').click();assert.equal(q('[data-place]').value,'');assert.equal(q('[data-compare]').value,'');assert.equal(q('[data-africa-topic="climate"]').getAttribute('aria-pressed'),'true');assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
 });
});

test('population comparison preserves the actual source map and returns to its exact source state',async()=>{
 await withAfricaPage('https://example.com/atlas/africa/?field=population&topic=distribution&place=GHA&compare=EGY&year=2023&region=west&zoom=all',(w,q)=>{
  const camera=q('.africa-map').getAttribute('viewBox'),source=q('[data-theme-source]').href,raster=q('[data-africa-raster]').getAttribute('href'),metric=q('[data-metric]').value;
  assert.equal(q('[data-theme-comparison]').hidden,false);assert.equal(q('[data-theme-comparison]').disabled,false);q('[data-theme-comparison]').click();assert.equal(q('[data-africa-raster]').getAttribute('href'),raster);assert.equal(q('[data-theme-source]').href,source);assert.equal(q('[data-africa-statistics-key]').hidden,false);assert.match(q('[data-theme-return]').textContent,/ガーナ/);assert.ok(new URL(w.location.href).searchParams.get('sourceState'));assert.equal(q('[data-source]').href,'https://data.worldbank.org/indicator/'+metric);
  const overview=new URL(q('[data-africa-overview-link]').href);for(const [key,value] of Object.entries({place:'GHA',compare:'EGY',year:'2023',region:'west',view:'distribution'}))assert.equal(overview.searchParams.get(key),value);assert.ok(overview.searchParams.get('sourceState'));
  w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(q('[data-africa-statistics-key]').hidden,false);q('[data-theme-return]').click();assert.equal(new URL(w.location.href).searchParams.has('context'),false);assert.equal(q('[data-place]').value,'GHA');assert.equal(q('[data-compare]').value,'EGY');assert.equal(q('[data-region]').value,'west');assert.equal(q('[data-year]').value,'2023');assert.equal(q('.africa-map').getAttribute('viewBox'),camera);assert.equal(q('[data-theme-source]').href,source);
 });
});

test('all sourced industry locations retain focus, other marks, source links and overview history',async()=>{
 let saved;const last=africaIndustryLocations.at(-1);
 await withAfricaPage('https://example.com/atlas/africa/?field=industry&place=EGY&year=2023&unknown=keep',(w,q)=>{
  for(const item of africaIndustryLocations){q(`[data-africa-industry-location="${item.id}"]`).dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(new URL(w.location.href).searchParams.get('industryLocation'),item.id);assert.equal(q('[data-theme-details] h3').textContent,item.label);assert.ok(q('[data-theme-details]').textContent.includes(item.reading));assert.equal(w.document.querySelectorAll('[data-africa-industry-location]').length,49);assert.equal(w.document.activeElement.getAttribute('data-africa-industry-location'),item.id);assert.equal(q(`[data-africa-industry-location="${item.id}"]`).getAttribute('data-label-visible'),'true');for(const source of item.sources)assert.ok([...q('[data-theme-details]').querySelectorAll('a')].some(a=>a.href===source.url));}
  saved=w.location.href;q('[data-africa-industry-return]').click();assert.equal(new URL(w.location.href).searchParams.has('industryLocation'),false);assert.equal(q('[data-africa-industry-commodity]').value,'');assert.equal(q('[data-africa-industry-overview]').getAttribute('aria-pressed'),'true');assert.equal(q('[data-africa-layer-legend]').children.length,18);w.history.back();assert.equal(q(`[data-africa-industry-location="${last.id}"]`).getAttribute('aria-pressed'),'true');assert.equal(new URL(w.location.href).searchParams.get('unknown'),'keep');
 });
 await withAfricaPage(saved,(_w,q)=>assert.equal(q(`[data-africa-industry-location="${last.id}"]`).getAttribute('aria-pressed'),'true'));
});

test('industry selection keeps commodity context and separates Nigeria oil and Jwaneng diamonds',async()=>{
 await withAfricaPage('https://example.com/atlas/africa/?field=industry',(w,q)=>{
  const pick=id=>q(`[data-africa-industry-location="${id}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  change(w,q('[data-africa-industry-commodity]'),'copper-cobalt');pick('jwaneng-diamonds');assert.equal(q('[data-africa-industry-commodity]').value,'copper-cobalt');assert.equal(q('[data-theme-details] h3').textContent,'ダイヤ：ジュワネン');assert.equal(q('[data-africa-industry-location="jwaneng-diamonds"]').getAttribute('aria-pressed'),'true');
  q('[data-africa-industry-return]').click();pick('niger-delta-oil');assert.equal(q('[data-africa-industry-commodity]').value,'oil');assert.match(q('[data-theme-details] h3').textContent,/ナイジェリア/);assert.match(q('[data-africa-industry-location="niger-delta-oil"] text').textContent,/ナイジェリア/);assert.equal(q('[data-africa-industry-location="jwaneng-diamonds"]').getAttribute('aria-pressed'),'false');assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
  change(w,q('[data-place]'),'BWA');assert.equal(new URL(w.location.href).searchParams.has('industryLocation'),false);assert.equal(q('[data-theme-details] h3'),null);
 });
});
