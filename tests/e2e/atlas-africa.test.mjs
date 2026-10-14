import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {latestValueAt,formatValue,metricById} from '../../src/data/atlas/africa-atlas.ts';
import {africaIndustrySectors,africaSectorIndustries,africaIndustrySectorSites,africaSectorSites} from '../../src/data/atlas/africa-industry-sectors.ts';
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

test('country supplements follow the whole-Africa explanation and open only by matching country or explicit disclosure',async()=>{
 for(const [topic,country,other]of [['language','ZAF','EGY'],['religion','GHA','ZAF']])await withAfricaPage(`https://example.com/atlas/africa/?field=population&topic=${topic}`,async(w,q,settle)=>{
  const supplement=()=>q('[data-africa-culture-supplement]'),reader=q('[data-africa-culture-evidence]'),explanation=q('[data-theme-takeaway-detail]'),source=q('[data-theme-source]');
  assert(explanation.compareDocumentPosition(reader)&w.Node.DOCUMENT_POSITION_FOLLOWING);assert.equal(source.nextElementSibling,reader);assert.equal(supplement().open,false);assert.equal(supplement().dataset.africaCultureSupplement,country);
  supplement().open=true;change(w,q('[data-africa-layer-category]'),'');assert.equal(supplement().open,true,'explicit expansion survives same-context renders');
  change(w,q('[data-place]'),other);await settle();assert.equal(supplement().open,false,'another country does not automatically show the example');
  change(w,q('[data-place]'),country);await settle();assert.equal(supplement().open,true,'matching country exposes its limited source');
  supplement().open=false;change(w,q('[data-africa-layer-category]'),'');assert.equal(supplement().open,false,'explicit collapse is respected');
  change(w,q('[data-place]'),'');await settle();assert.equal(supplement().open,false,'whole-Africa return closes country details');
  if(topic==='language')assert.equal(q('[data-africa-language-record]').options.length,2223);
 });
});

test('individual language selection retains every source point and camera through clicks, keyboard, URL and history',async()=>{
 let saved;
 await withAfricaPage('https://example.com/atlas/africa/?field=population&topic=language&unknown=keep',async(w,q,settle)=>{
  const records=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-culture-v2/language-points.json',import.meta.url))).points;
  const choices=records.filter(row=>/Swahili|Zulu/.test(row.name)).slice(0,2);assert.equal(choices.length,2);
  const positions=()=>[...q('[data-africa-actual-layer]').querySelectorAll('[data-africa-language-point]')].map(n=>[n.dataset.africaLanguagePoint,n.getAttribute('cx'),n.getAttribute('cy'),n.getAttribute('r')]);
  const before=positions(),camera=q('.africa-map').getAttribute('viewBox');assert.equal(q('[data-africa-language-record]').options.length,2223);assert.equal(q('.africa-map').getAttribute('role'),'group');assert(q('#africa-svg-desc').textContent.includes('話者数や居住域ではありません'));
  change(w,q('[data-africa-language-record]'),choices[0].id);assert.equal(q('[data-africa-language-reading]').dataset.africaLanguageReading,choices[0].id);assert.deepEqual(positions(),before);assert.equal(q('.africa-map').getAttribute('viewBox'),camera);assert.equal(new URL(w.location.href).searchParams.get('layerClass'),'language:'+choices[0].id);
  q(`[data-africa-language-point="${choices[1].id}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(q('[data-africa-language-reading]').dataset.africaLanguageReading,choices[1].id);assert.deepEqual(positions(),before);assert.equal(q(`[data-africa-language-point="${choices[1].id}"]`).getAttribute('aria-pressed'),'true');saved=w.location.href;
  q(`[data-africa-language-point="${choices[0].id}"]`).dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(q('[data-africa-language-reading]').dataset.africaLanguageReading,choices[0].id);w.history.back();await settle();assert.equal(q('[data-africa-language-reading]').dataset.africaLanguageReading,choices[1].id);assert.equal(new URL(w.location.href).searchParams.get('unknown'),'keep');
  const table=q('[data-africa-culture-evidence] table');assert.equal(table.querySelectorAll('tbody tr').length,17);assert.equal(table.querySelectorAll('thead th').length,10);assert(q('[data-africa-culture-evidence]').textContent.includes('1歳未満を除く'));
  q('[data-field="nature"]').click();await settle();assert.equal(q('[data-africa-culture-evidence]').hidden,true);assert(!new URL(w.location.href).searchParams.has('layerClass'));
 });
 await withAfricaPage(saved,(_w,q)=>assert(q('[data-africa-language-reading]')));
});

test('Ghana denomination table supplements the original Pew map and keeps all source counts separate from shapes',async()=>{
 await withAfricaPage('https://example.com/atlas/africa/?field=population&topic=religion',(w,q)=>{
  assert.equal(w.document.querySelectorAll('[data-africa-religion-country]:not([data-africa-religion-mixed])').length,55);
  assert.equal(w.document.querySelectorAll('[data-africa-religion-region]').length,0);assert.equal(q('[data-africa-culture-evidence]').querySelectorAll('[data-africa-religion-evidence-group]').length,8);
  const table=q('[data-africa-culture-evidence] table');assert.equal(table.querySelectorAll('tbody tr').length,16);assert.equal(table.querySelectorAll('thead th').length,9);assert.match(q('[data-africa-culture-evidence]').textContent,/30,753,327/);assert.match(q('[data-theme-source]').href,/pewresearch/);
  q('[data-africa-topic="ethnicity"]').click();assert.equal(q('[data-africa-culture-evidence]').hidden,true);assert.equal(q('[data-africa-atlas]').dataset.layerMode,'guide');assert.equal(w.document.querySelectorAll('[data-africa-ethnicity-composition-group]').length,144);
 });
});

test('three industry sectors keep all sector points, fixed labels, right-only filtering and history',async()=>{
 await withAfricaPage('https://example.com/insight-journal/atlas/africa/?field=industry&place=EGY&compare=GHA&year=2023&unknown=preserve',(w,q)=>{
  const marks=()=>[...q('[data-theme-marks]').querySelectorAll('[data-africa-industry-location]')];
  const layout=()=>[...q('[data-theme-marks]').querySelectorAll('[data-africa-industry-label]')].map(n=>[n.dataset.africaIndustryLabel,n.dataset.layoutBox]);
  const camera=q('.africa-map').getAttribute('viewBox');
  for(const sector of africaIndustrySectors){q(`[data-africa-industry-sector="${sector.id}"]`).click();const expected=africaIndustrySectorSites(sector.id),baseline=layout();assert.equal(marks().length,expected.length);assert.equal(q('[data-theme-marks] [fill="transparent"][pointer-events="all"]'),null,'an invisible hit area must not block a nearby visible site');assert.equal(q('[data-africa-layer-legend]').children.length,africaSectorIndustries.filter(row=>row.sector===sector.id).length);
   for(const industry of africaSectorIndustries.filter(row=>row.sector===sector.id)){change(w,q('[data-africa-industry-commodity]'),industry.id);assert.equal(q('[data-theme-title]').textContent,industry.label);assert.equal(marks().length,expected.length);assert.deepEqual(layout(),baseline);assert.equal(q('.africa-map').getAttribute('viewBox'),camera);const other=marks().filter(n=>n.dataset.industry!==industry.id);assert(other.every(n=>n.style.display!=='none'));assert(q('[data-africa-industry-why]').textContent.includes(sector.why));
    const checkbox=q('[data-africa-industry-only]');checkbox.checked=true;checkbox.dispatchEvent(new w.Event('change',{bubbles:true}));assert.deepEqual(layout(),baseline);assert.equal(new URL(w.location.href).searchParams.get('industryOnly'),'1');assert(marks().filter(n=>n.dataset.industry!==industry.id).every(n=>n.style.display==='none'));w.history.back();assert.equal(q('[data-africa-industry-only]').checked,false);
   }
   q('[data-africa-industry-return]').click();assert.deepEqual(layout(),baseline);assert.equal(q('[data-africa-industry-only]'),null);
  }
  assert.equal(q('[data-theme-marks] [data-geographic-scope="country"]'),null);q('[data-field="nature"]').click();assert.equal(q('[data-africa-industry-reading]').hidden,true);assert(!new URL(w.location.href).searchParams.has('industrySector'));assert(!new URL(w.location.href).searchParams.has('industryOnly'));assert.equal(new URL(w.location.href).searchParams.get('unknown'),'preserve');
 });
});

test('legacy industry theme URLs resolve to commodity distributions',async()=>{
 for(const [theme,commodity] of [['copperbelt-connections','copper'],['casablanca-manufacturing','aerospace']])await withAfricaPage(`https://example.com/atlas/africa/?field=industry&theme=${theme}`,(_w,q)=>{assert.equal(q('[data-africa-industry-commodity]').value,commodity);assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');});
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
 await withAfricaPage('https://example.com/atlas/africa/',(_w,q)=>{assert.equal(q('[data-africa-atlas]').querySelectorAll('[data-country-path]').length,55);assert.equal(q('[data-place]').options.length,56);assert.equal(q('[data-place]').options[0].value,'');assert.equal(q('[data-metric]').options.length,15);assert.equal(q('[data-africa-atlas]').querySelectorAll('[data-field]').length,4);assert.ok([..._w.document.querySelectorAll('noscript')].some(node=>/CSV/.test(node.textContent)));});
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

test('every mapped sector site has source readings, focus, fixed point positions and reload',async()=>{
 let saved,savedSite;
 await withAfricaPage('https://example.com/atlas/africa/?field=industry&unknown=keep',(w,q)=>{
  for(const sector of africaIndustrySectors){q(`[data-africa-industry-sector="${sector.id}"]`).click();const sites=africaIndustrySectorSites(sector.id);for(const site of sites){const selector=`[data-theme-marks] [data-africa-industry-location="${site.id}"]`;q(selector).dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(new URL(w.location.href).searchParams.get('industryLocation'),site.id);assert.equal(q('[data-africa-industry-site-reading] h3').textContent,site.label);assert(q('[data-africa-industry-site-reading]').textContent.includes(site.reading));assert.equal(q('[data-theme-marks]').querySelectorAll('[data-africa-industry-location]').length,sites.length);assert.equal(w.document.activeElement.getAttribute('data-africa-industry-location'),site.id);for(const source of site.sources)assert([...q('[data-africa-industry-site-reading]').querySelectorAll('a')].some(a=>a.href===source.url));assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');saved=w.location.href;savedSite=site.id;}}
  q('[data-africa-industry-return]').click();assert(!new URL(w.location.href).searchParams.has('industryLocation'));w.history.back();assert(new URL(w.location.href).searchParams.has('industryLocation'));assert.equal(new URL(w.location.href).searchParams.get('unknown'),'keep');
 });
 await withAfricaPage(saved,(_w,q)=>assert.equal(q('[data-africa-industry-site-reading]').dataset.africaIndustrySiteReading,savedSite));
});

test('industry map clicks select the actual industry and country-only references never become sites',async()=>{
 await withAfricaPage('https://example.com/atlas/africa/?field=industry',(w,q)=>{
  const select=id=>q(`[data-theme-marks] [data-africa-industry-location="${id}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  change(w,q('[data-africa-industry-commodity]'),'copper');select('jwaneng-diamonds');assert.equal(q('[data-africa-industry-commodity]').value,'diamonds');assert.equal(q('[data-africa-industry-site-reading] h3').textContent,'ダイヤ：ジュワネン');
  q('[data-africa-industry-return]').click();select('niger-delta-oil');assert.equal(q('[data-africa-industry-commodity]').value,'oil');assert.equal(q('[data-theme-marks] [data-africa-industry-location="jwaneng-diamonds"]').getAttribute('aria-pressed'),'false');assert.equal(q('.africa-map').getAttribute('viewBox'),'0 0 1100 907');
  for(const site of africaSectorSites.filter(row=>!row.roles.length)){assert.equal(q(`[data-theme-marks] [data-africa-industry-location="${site.id}"]`),null);assert(q('[data-theme-details]').textContent.includes(site.label));}
 });
});
