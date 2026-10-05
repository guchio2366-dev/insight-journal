import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';

const folder='atlas/north-america/canada',base=`https://example.com/insight-journal/${folder}`;
const population=JSON.parse(await readFile('src/data/atlas/canada/population.json','utf8'));
const sourceGeometry=JSON.parse(await readFile('src/data/atlas/canada/population-geometry.json','utf8')).features;
const industry=JSON.parse(await readFile('src/data/atlas/canada/industry.json','utf8'));
const stripScripts=html=>html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
async function bundle(name){const init={population:'initCanadaPopulation',industry:'initCanadaIndustry',nature:'initCanadaNature'}[name],globalName=`CanadaPopulationIndustry_${name}`;return await bundleCanadaSource(`src/scripts/atlas-canada-${name}.ts`,{globalName})+`\n${globalName}.${init}(document.querySelector('[data-canada-${name}]'));`;}
const code=Object.fromEntries(await Promise.all(['population','industry','nature'].map(async name=>[name,await bundle(name)])));

async function page(name,search=''){
 const url=search instanceof URL?search.href:`${base}/${name}/${search}`;
 const w=new Window({url,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 try{
  w.document.write(stripScripts(await readFile(`dist/${folder}/${name}/index.html`,'utf8')));
  const element=w.document.querySelector({population:'[data-population-config]',industry:'[data-industry-config]',nature:'[data-canada-config]'}[name]);
  assert.ok(element,`Built ${name} HTML has its config`);
  if(name==='industry')assert.ok(w.document.querySelector('[data-canada-population-industry-scope]'),'Built industry HTML predates the population scope markup; a current build is required');
  const config=JSON.parse(element.textContent);
  // These tests exercise synchronous comparison rendering. Async geometry loading has its own tests.
  if(name==='population'){assert.ok(Array.isArray(config.industryProvinces),'Built population HTML lacks the industry province mapping metadata; a current build is required');config.geometry=sourceGeometry;}else{assert.ok(config.population,`Built ${name} config includes population metadata`);config.population.geometry=sourceGeometry;}
  element.textContent=JSON.stringify(config);w.eval(code[name]);await Promise.resolve();
  return w;
 }catch(error){await w.happyDOM.close();throw error;}
}
function change(w,selector,value){const element=w.document.querySelector(selector);assert.ok(element,selector);element.value=String(value);element.dispatchEvent(new w.Event('change'));}
function contextUrl(source,current={year:'2025',province:'Ontario',compare:'Quebec',metric:'services'}){return `?${new URLSearchParams({...current,populationReturn:new URLSearchParams(source).toString()})}`;}
function sourceRecord(id){return population.cmas.find(r=>r.id===id);}
function valueText(record,year,metric){const value=metric==='density'?record.density2021:record.population[year];return value.value.toLocaleString('ja-JP',{minimumFractionDigits:metric==='density'?1:0,maximumFractionDigits:metric==='density'?1:0});}
function assertReturn(w,expected){
 const back=w.document.querySelector('[data-canada-population-industry-return]');assert.equal(back.hidden,false);
 const url=new URL(back.href);assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,`/insight-journal/${folder}/population/`);
 assert.deepEqual(new Set(url.searchParams.keys()),new Set(Object.keys(expected)));
 for(const [key,value] of Object.entries(expected))assert.equal(url.searchParams.get(key),String(value));
 return url;
}
function assertSource(w,{year,cma,compare,metric='population',only=true,zoom='selected'}){
 const q=s=>w.document.querySelector(s),map=q('[data-canada-population-industry-map]'),ids=[cma,compare].filter(Boolean);
 assert.equal(q('[data-canada-population-industry-context]').hidden,false);
 const markers=[...map.querySelectorAll('[data-population-industry-cma]')];assert.equal(markers.length,only?ids.length:41);
 assert.deepEqual(new Set(map.querySelectorAll('[data-population-industry-label]')).size,ids.length);
 if(only)assert.deepEqual(new Set(markers.map(g=>g.dataset.populationIndustryCma)),new Set(ids));
 const frame=map.getAttribute('viewBox').split(/\s+/).map(Number);assert.equal(frame.length,4);
 if(zoom==='country')assert.deepEqual(frame,[0,0,900,580]);if(zoom==='south')assert.deepEqual(frame,[140,340,760,240]);
 const factor=frame[2]/760,max=Math.max(...population.cmas.flatMap(r=>[r.population[2016].value,r.population[2021].value]));
 for(const id of ids){
  const record=sourceRecord(id),shape=sourceGeometry.find(g=>g.id===id),marker=map.querySelector(`[data-population-industry-cma="${id}"]`),path=marker.querySelector('path');
  assert.equal(path.getAttribute('fill-rule'),'evenodd');
  const first=path.getAttribute('d').match(/^M(-?[\d.]+),(-?[\d.]+)/),[lon,lat]=shape.rings[0][0];
  assert.ok(first);assert.ok(Math.abs(Number(first[1])-(lon+145)/95*900)<=0.00051);assert.ok(Math.abs(Number(first[2])-(85-lat)/45*580)<=0.00051);
  assert.ok(marker.querySelector('title').textContent.includes(`${year}年`));assert.ok(marker.querySelector('title').textContent.includes(valueText(record,year,metric)));
  assert.equal(marker.querySelector('[data-population-industry-label]').textContent,record.name.split('（')[0]);
  if(metric==='population'){
   const circle=marker.querySelector('[data-population-industry-symbol]');assert.ok(circle);assert.equal(Number(circle.getAttribute('cx')),shape.point[0]);assert.equal(Number(circle.getAttribute('cy')),shape.point[1]);
   assert.ok(Math.abs(Number(circle.getAttribute('r'))**2/(22*factor)**2-record.population[year].value/max)<1e-10);
   if(record.population[year].symbol)assert.ok(marker.querySelector('title').textContent.includes(record.population[year].symbol));
  }else{
   assert.equal(marker.querySelector('circle'),null);const breaks=[50,150,300,600],colors=['#e4ebcf','#aecb9b','#679b80','#2f735e','#144936'];
   assert.equal(path.getAttribute('fill'),colors[breaks.filter(b=>record.density2021.value>=b).length]);
  }
 }
 if(metric==='population'){
  const keys=[...map.querySelectorAll('[data-population-industry-legend-count]')];assert.deepEqual(keys.map(c=>Number(c.dataset.populationIndustryLegendCount)),[1000000,5000000]);
  assert.ok(Math.abs((Number(keys[1].getAttribute('r'))/Number(keys[0].getAttribute('r')))**2-5)<1e-10);
  const transform=map.querySelector('[data-population-industry-scale]').getAttribute('transform'),scale=Number(transform.match(/scale\(([-\d.eE]+)\)/)?.[1]);
  assert.ok(Number.isFinite(scale));assert.ok(Math.abs(scale-factor)<1e-10);
  const radius=Number(map.querySelector(`[data-population-industry-cma="${cma}"] circle`).getAttribute('r')),reference=Number(keys[0].getAttribute('r'))*scale;
  assert.ok(Math.abs((radius/reference)**2-sourceRecord(cma).population[year].value/1000000)<1e-10);
  assert.equal(map.querySelectorAll('[data-population-industry-density-swatch]').length,0);
 }else{assert.equal(map.querySelectorAll('circle').length,0);assert.equal(map.querySelectorAll('[data-population-industry-density-swatch]').length,5);assert.match(map.textContent,/50未満.*50–150未満.*150–300未満.*300–600未満.*600以上.*人\/km²/s);}
 assert.match(q('[data-canada-population-industry-legend]').textContent,metric==='density'?/2021年・人口密度.*2021年CMA境界/s:new RegExp(`${year}年・人口.*円の面積.*2021年CMA境界`,'s'));
 return map;
}

test('Population DOM links hand Toronto–Montréal 2016 source state to Ontario–Quebec 2025 services with honest source circles',async()=>{
 const state={year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected'};
 const source=await page('population',`?${new URLSearchParams({...state,keep:'drop',next:'https://evil.example/'})}`);let target;
 try{
  const link=source.document.querySelector('[data-population-industry-link]');assert.ok(link);const url=new URL(link.href),saved=new URLSearchParams(url.searchParams.get('populationReturn'));
  assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,`/insight-journal/${folder}/industry/`);assert.equal(url.searchParams.get('province'),'Ontario');assert.equal(url.searchParams.get('compare'),'Quebec');assert.equal(url.searchParams.get('year'),'2025');assert.equal(url.searchParams.get('metric'),'services');
  assert.deepEqual(Object.fromEntries(saved),state);
  target=await page('industry',url);assertSource(target,{year:2016,cma:'535',compare:'462'});assertReturn(target,state);
  const text=target.document.querySelector('[data-canada-population-industry-text]').textContent;assert.match(text,/元図2016年都市圏人口.*Toronto.*Montréal.*左はサービス業.*関連統計は2025年の州内GDP/s);
  assert.match(text,/都市の雇用数・GDPではなく.*原因.*決めません/s);assert.equal(target.document.querySelector('[data-canada-population-industry-scope]').hidden,true);
 }finally{await source.happyDOM.close();if(target)await target.happyDOM.close();}
});

test('Cross-province Ottawa–Gatineau and Vancouver map to Quebec and BC and explicitly name the omitted Ontario portion',async()=>{
 const state={year:'2021',cma:'505',compare:'933',metric:'population',only:'1',zoom:'country'};
 const source=await page('population',`?${new URLSearchParams(state)}`);let target;
 try{
  const url=new URL(source.document.querySelector('[data-population-industry-link]').href);assert.equal(url.searchParams.get('province'),'Quebec');assert.equal(url.searchParams.get('compare'),'British Columbia');
  target=await page('industry',url);assertSource(target,{year:2021,cma:'505',compare:'933',zoom:'country'});assertReturn(target,state);
  const scope=target.document.querySelector('[data-canada-population-industry-scope]');assert.equal(scope.hidden,false);assert.match(scope.textContent,/州をまたぐ.*Ottawa–Gatineau.*オンタリオ.*選択していません/s);
  for(const name of ['Ottawa–Gatineau','Vancouver'])assert.ok(target.document.querySelector('[data-canada-population-industry-return]').textContent.includes(name));
 }finally{await source.happyDOM.close();if(target)await target.happyDOM.close();}
});

test('Density is fixed to 2021 and keeps a separate five-color CMA legend instead of population circles',async()=>{
 const source={year:'2016',cma:'535',compare:'462',metric:'density',only:'1',zoom:'south'},w=await page('industry',contextUrl(source));
 try{
  assertSource(w,{year:2021,cma:'535',compare:'462',metric:'density',zoom:'south'});assertReturn(w,{...source,year:'2021'});
  assert.match(w.document.querySelector('[data-canada-population-industry-text]').textContent,/元図2021年人口密度.*人\/km².*左はサービス業.*関連統計は2025年.*州内GDP/s);
  assert.match(w.document.querySelector('[data-canada-population-industry-legend]').textContent,/左の3分野.*案内.*数量を表しません.*GDPは関連統計/s);
 }finally{await w.happyDOM.close();}
});

test('GDP year/classification changes retain source population scale and popstate restores the complete source and local return',async()=>{
 const saved={year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected'},w=await page('industry',contextUrl(saved));let returned;
 try{
  const map=assertSource(w,{year:2016,cma:'535',compare:'462'}),signature=()=>createHash('sha256').update(map.outerHTML).digest('hex'),initial=signature();
  change(w,'[data-industry-year]',2024);change(w,'[data-industry-metric]','manufacturing');change(w,'[data-industry-province]','Alberta');change(w,'[data-industry-compare]','Ontario');
  assert.equal(w.document.querySelector('[data-industry-only]'),null);
  assert.equal(signature(),initial);assertReturn(w,saved);
  const text=w.document.querySelector('[data-canada-population-industry-text]').textContent;assert.match(text,/元図2016年.*関連統計は2024年.*製造業/s);
  for(const id of ['Alberta','Ontario'])assert.ok(text.includes(industry.data.find(r=>r.id===id&&r.year===2024).values.manufacturing.value.toFixed(2)+'%'));
  assert.equal([...w.document.querySelectorAll('[data-industry-province-shape]')].filter(p=>p.style.display!=='none').length,13);
  const next={year:'2021',cma:'505',compare:'933',metric:'population',only:'0',zoom:'country'};
  w.history.replaceState(null,'',contextUrl(next,{year:'2023',province:'Quebec',compare:'British Columbia',metric:'services'}));w.dispatchEvent(new w.PopStateEvent('popstate'));
  assertSource(w,{year:2021,cma:'505',compare:'933',only:false,zoom:'country'});
  const expected={year:'2021',cma:'505',compare:'933',metric:'population',zoom:'country'},url=assertReturn(w,expected);returned=await page('population',url);
  for(const key of ['year','cma','compare','metric','zoom'])assert.equal(returned.document.querySelector(`[data-population-${key}]`).value,expected[key]);
  assert.equal(returned.document.querySelector('[data-population-only]').getAttribute('aria-pressed'),'false');
 }finally{await w.happyDOM.close();if(returned)await returned.happyDOM.close();}
});

test('Return state rejects foreign navigation and invalid CMA fields while a direct industry visit hides population context',async()=>{
 const invalid={year:'2016',cma:'unknown',compare:'unknown',metric:'density',only:'1',zoom:'bad',next:'https://evil.example/',href:'/outside/',returnTo:'https://evil.example/'},w=await page('industry',contextUrl(invalid));let direct;
 try{
  assertSource(w,{year:2021,cma:'535',metric:'density',zoom:'south'});assertReturn(w,{year:'2021',cma:'535',metric:'density',only:'1',zoom:'south'});
  direct=await page('industry');assert.equal(direct.document.querySelector('[data-canada-population-industry-context]').hidden,true);assert.equal(direct.document.querySelector('[data-canada-population-industry-return]').hidden,true);
  assert.equal(direct.document.querySelector('[data-canada-population-industry-map]').querySelectorAll('[data-population-industry-cma]').length,0);
 }finally{await w.happyDOM.close();if(direct)await direct.happyDOM.close();}
});

function assertIndustryHandoff(url,current,saved){
 assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,`/insight-journal/${folder}/industry/`);
 assert.deepEqual(new Set(url.searchParams.keys()),new Set([...Object.keys(current),'sector','populationReturn']));
 for(const [key,value] of Object.entries(current))assert.equal(url.searchParams.get(key),value);assert.equal(url.searchParams.get('sector'),current.metric==='mining'?'resources':current.metric);
 const original=new URLSearchParams(url.searchParams.get('populationReturn'));
 assert.deepEqual(Object.fromEntries(original),saved);
 assert.deepEqual(new Set(original.keys()),new Set(Object.keys(saved)),'Population return has exactly one flat, normalized state level');
 return original;
}

test('Population → industry → Fraser → industry keeps the original 2016 source map, quantity scale and final population return',async()=>{
 const saved={year:'2016',cma:'535',compare:'462',metric:'population',only:'1',zoom:'selected'},current={year:'2024',province:'Ontario',compare:'Quebec',metric:'services',only:'1',zoom:'1'};
 const windows=[];const open=async(name,url)=>{const w=await page(name,url);windows.push(w);return w;};
 try{
  const populationPage=await open('population',`?${new URLSearchParams(saved)}`);
  const industryURL=new URL(populationPage.document.querySelector('[data-population-industry-link]').href);industryURL.searchParams.set('only','1');industryURL.searchParams.set('zoom','1');const firstIndustry=await open('industry',industryURL);
  const originalMap=assertSource(firstIndustry,{year:2016,cma:'535',compare:'462'}),signature=createHash('sha256').update(originalMap.outerHTML).digest('hex');
  change(firstIndustry,'[data-industry-year]',2024);change(firstIndustry,'[data-industry-metric]','services');
  assert.equal(firstIndustry.document.querySelector('[data-industry-only]'),null);assert.equal(firstIndustry.document.querySelector('[data-industry-focus]'),null);
  const natureUrl=new URL(firstIndustry.document.querySelector('[data-industry-nature-link*="Fraser"]').href),handoff=new URL(`?${natureUrl.searchParams.get('industryReturn')}`,`${base}/industry/`);
  assertIndustryHandoff(handoff,current,saved);assert.equal(natureUrl.searchParams.get('view'),'water');assert.equal(natureUrl.searchParams.get('water'),'Fraser');
  const naturePage=await open('nature',natureUrl),natureDoc=naturePage.document;
  assert.equal(natureDoc.querySelector('[data-canada-view=water]').getAttribute('aria-pressed'),'true');assert.equal(natureDoc.querySelector('[data-canada-water]').value,'Fraser');
  const water=[...natureDoc.querySelectorAll('[data-canada-water-shape]')].filter(p=>p.style.display!=='none');assert.ok(water.length);assert.deepEqual(new Set(water.map(p=>p.dataset.canadaWaterShape)),new Set(['Fraser']));
  assert.deepEqual(new Set([...natureDoc.querySelectorAll('[data-canada-industry-context-province]')].map(p=>p.dataset.canadaIndustryContextProvince)),new Set(industry.provinces.map(p=>p.id)));
  assert.deepEqual([...natureDoc.querySelector('[data-canada-industry-context-map]').querySelectorAll('[data-canada-industry-context-region]')].map(g=>g.dataset.canadaIndustryContextRegion),['bc-transport-services']);
  assert.equal(natureDoc.querySelector('[data-canada-industry-context-reading-scale]').children.length,3);assert.match(natureDoc.querySelector('[data-canada-industry-context-legend]').textContent,/サービス業.*同じ大きさ.*案内位置/s);
  const back=natureDoc.querySelector('[data-canada-industry-return]');assert.equal(back.hidden,false);const industryUrl=new URL(back.href);assertIndustryHandoff(industryUrl,current,saved);
  const restored=await open('industry',industryUrl),restoredMap=assertSource(restored,{year:2016,cma:'535',compare:'462'});
  assert.equal(createHash('sha256').update(restoredMap.outerHTML).digest('hex'),signature,'The complete original source SVG, including its quantity scale, survives the third hop');
  for(const key of ['year','province','compare','metric'])assert.equal(restored.document.querySelector(`[data-industry-${key}]`).value,current[key]);
  assert.equal(restored.document.querySelector('[data-industry-only]'),null);assert.equal(restored.document.querySelector('[data-industry-focus]'),null);assert.equal(industryUrl.searchParams.get('only'),'1');assert.equal(industryUrl.searchParams.get('zoom'),'1');
  assert.match(restored.document.querySelector('[data-canada-population-industry-text]').textContent,/元図2016年.*Toronto.*Montréal.*関連統計は2024年/s);
  const populationBack=restored.document.querySelector('[data-canada-population-industry-return]');for(const name of ['Toronto','Montréal'])assert.ok(populationBack.textContent.includes(name));
  const finalPopulation=await open('population',assertReturn(restored,saved));
  for(const key of ['year','cma','compare','metric','zoom'])assert.equal(finalPopulation.document.querySelector(`[data-population-${key}]`).value,saved[key]);
  assert.equal(finalPopulation.document.querySelector('[data-population-only]').getAttribute('aria-pressed'),'true');
 }finally{for(const w of windows)await w.happyDOM.close();}
});

test('Three-hop handoff strips nested return levels, foreign destinations and unknown fields while normalizing the source CMA state',async()=>{
 const saved={year:'2021',cma:'535',metric:'density',only:'1',zoom:'south'},bad={year:'2016',cma:'unknown',compare:'unknown',metric:'density',only:'1',zoom:'bad',next:'https://evil.example/',href:'//evil.example/',returnTo:'https://evil.example/',populationReturn:'year=2016&cma=933&next=https://evil.example/',industryReturn:'year=2023&province=Alberta',forestryReturn:'province=Quebec'},current={year:'2025',province:'Ontario',compare:'Quebec',metric:'services'};
 const windows=[];const open=async(name,url)=>{const w=await page(name,url);windows.push(w);return w;};
 try{
  const first=await open('industry',contextUrl(bad,{...current,next:'https://evil.example/',href:'/outside/',industryReturn:'href=https://evil.example/'}));
  const target=new URL(first.document.querySelector('[data-industry-nature-link*="Fraser"]').href),raw=new URL(`?${target.searchParams.get('industryReturn')}`,`${base}/industry/`);assertIndustryHandoff(raw,current,saved);
  const tampered=new URLSearchParams(target.searchParams.get('industryReturn'));tampered.set('next','https://evil.example/');tampered.set('href','//evil.example/');tampered.set('industryReturn','populationReturn=href=https://evil.example/');
  const original=new URLSearchParams(tampered.get('populationReturn'));original.set('populationReturn','cma=933');original.set('industryReturn','href=https://evil.example/');original.set('href','https://evil.example/');original.set('unrecognized','discard');tampered.set('populationReturn',original.toString());target.searchParams.set('industryReturn',tampered.toString());
  const nature=await open('nature',target),returnUrl=new URL(nature.document.querySelector('[data-canada-industry-return]').href);assertIndustryHandoff(returnUrl,current,saved);
  const restored=await open('industry',returnUrl);assertSource(restored,{year:2021,cma:'535',metric:'density',zoom:'south'});assertReturn(restored,saved);
 }finally{for(const w of windows)await w.happyDOM.close();}
});
