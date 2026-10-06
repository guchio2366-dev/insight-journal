import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {africaLayerPath} from '../../src/scripts/atlas-africa-layers.ts';
import {readState,africaComparisonSnapshot} from '../../src/data/atlas/africa-atlas.ts';
import {africaRivers,africaRiverSelectedColor} from '../../src/data/atlas/africa-river-reading.ts';

const base='https://example.com/insight-journal/atlas/africa/';
const initial='?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&view=distribution&place=EGY&compare=COD&year=2022&region=all&zoom=all';
const native=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-water-v1/rivers.geojson',import.meta.url)));
const nativePaths=new Map(native.features.map(feature=>[feature.properties.id,africaLayerPath(feature.geometry)]));
const parameters=window=>new URL(window.location.href).searchParams;
const wait=async(condition,message)=>{const end=Date.now()+10000;while(!condition()&&Date.now()<end)await new Promise(resolve=>setImmediate(resolve));assert.ok(condition(),message);};

async function withAfricaPage(search,run,{delayMatch}={}){
 const window=new Window({url:base+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 const requests=[],completed=[],releases=[];let released=false;
 const release=()=>{released=true;for(const resolve of releases.splice(0))resolve();};
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async input=>{
   const path=new URL(input,base).pathname.replace(/^\/insight-journal/,'');requests.push(path);
   if(delayMatch?.test(path)&&!released)await new Promise(resolve=>releases.push(resolve));
   const response=new Response(readFileSync(new URL('../../public'+path,import.meta.url)),{status:200});completed.push(path);return response;
  };
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),q=selector=>root.querySelector(selector);
  q('.africa-map').getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();
  if(!delayMatch)await wait(()=>root.dataset.actualLayer==='true','the selected local distribution must load');
  await run({window,root,q,requests,completed,release});
 }finally{
  for(const [key,value]of Object.entries(previous))globalThis[key]=value;
  release();await window.happyDOM.abort();
 }
}

function assertRiver({window,root,q},id,{ready=true}={}){
 const river=africaRivers.find(row=>row.id===id);assert.ok(river);
 assert.equal(parameters(window).get('river'),id);
 assert.equal(root.dataset.riverView,'true');assert.equal(q('[data-africa-river-choices]').hidden,false);
 assert.equal(q('[data-theme-title]').textContent,river.label);
 assert.equal(q('[data-theme-takeaway-detail]').textContent,river.reading.text);
 assert.equal(q('[data-theme-source]').hidden,false);assert.equal(q('[data-theme-source]').href,river.reading.source);assert.equal(q('[data-theme-source]').textContent,river.reading.sourceLabel);
 for(const choice of q('[data-africa-river-choices]').children)assert.equal(choice.getAttribute('aria-pressed'),String(choice.dataset.africaRiverChoice===id));
 if(!ready)return;
 assert.equal(root.dataset.actualLayer,'true');
 const all=[...root.querySelectorAll('[data-africa-layer-feature]')];
 assert.equal(all.length,90,'the complete existing collection remains visible');
 assert.equal(new Set(all.map(path=>path.dataset.africaLayerFeature)).size,90);
 for(const path of all){assert.equal(path.getAttribute('d'),nativePaths.get(path.dataset.africaLayerFeature));assert.equal(path.style.display,'');assert.equal(path.getAttribute('fill'),'none');}
 const selected=all.filter(path=>path.classList.contains('is-selected'));
 assert.deepEqual(selected.map(path=>path.dataset.africaLayerFeature).sort(),[...river.featureIds].sort());
 for(const path of selected){assert.equal(path.getAttribute('stroke'),africaRiverSelectedColor);assert.equal(path.getAttribute('stroke-width'),'3.2');assert.equal(path.querySelector('title').textContent,river.label);}
 for(const hit of root.querySelectorAll('[data-africa-river]')){
  assert.equal(hit.getAttribute('aria-pressed'),String(hit.dataset.africaRiver===id));
  assert.equal(hit.getAttribute('d'),nativePaths.get(hit.dataset.africaRiverHitFeature));
  assert.equal(hit.getAttribute('fill'),'none');assert.equal(hit.getAttribute('stroke'),'transparent');
 }
 const legend=q('[data-africa-layer-legend]');assert.equal(legend.children.length,2);assert.equal(legend.children[0].textContent,'収録河道');assert.equal(legend.children[1].textContent,`${river.label}（選択）`);
 assert.match(legend.children[1].querySelector('i').getAttribute('style'),/#165a80|rgb\(22,\s*90,\s*128\)/);
 assert.match(q('[data-africa-layer-caption]').textContent,/太さは流量を表しません/);
 assert.doesNotMatch(root.textContent,/アフリカ90河川/);
}

test('names and either native river segment select the same explanation, sources and two features while keeping all 90 lines',async()=>{
 await withAfricaPage(initial,context=>{
  const {window,root,q}=context;
  assert.equal(q('[data-africa-river-choice=""]').getAttribute('aria-pressed'),'true');
  assert.equal(q('[data-theme-comparison]').hidden,true);assert.equal(q('[data-theme-source]').hidden,true);
  for(const river of africaRivers){
   q(`[data-africa-river-choice="${river.id}"]`).click();assertRiver(context,river.id);
   for(const feature of river.featureIds){
    q('[data-africa-river-choice=""]').click();assert.equal(parameters(window).has('river'),false);assert.equal(root.querySelectorAll('.africa-river-path.is-selected').length,0);
    q(`[data-africa-river-hit-feature="${feature}"]`).dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
    assertRiver(context,river.id);assert.equal(parameters(window).has('layerPoint'),false,'line activation must not become a country map-point selection');
   }
  }
  q('[data-africa-river-choice="nile"]').click();
  const nile=africaRivers.find(river=>river.id==='nile');assert.ok(q('[data-theme-details]').textContent.includes(nile.theme.takeaway));
  for(const source of [{url:nile.theme.source},...nile.theme.evidenceSources??[]])assert.ok([...q('[data-theme-details]').querySelectorAll('a')].some(link=>link.href===source.url));
  q('[data-africa-river-choice="congo"]').click();assert.equal(q('[data-theme-caveat]').hidden,false);assert.match(q('[data-theme-caveat]').textContent,/盆地や全流域の境界を示しません/);
 });
});

test('river comparison survives URL reload and restores the complete original selection after country and year changes',async()=>{
 for(const river of africaRivers){
  let comparisonURL,source;
  await withAfricaPage(initial,context=>{
   const {window,root,q}=context;q(`[data-africa-river-choice="${river.id}"]`).click();source=readState(window.location.search);
   const geometry=[...root.querySelectorAll('[data-africa-layer-feature]')].map(path=>path.outerHTML);
   assert.equal(q('[data-theme-comparison]').disabled,false);q('[data-theme-comparison]').click();
   assert.equal(parameters(window).get('context'),'ER.H2O.INTR.PC');assert.equal(parameters(window).get('sourceState'),africaComparisonSnapshot(source));
   assertRiver(context,river.id);assert.deepEqual([...root.querySelectorAll('[data-africa-layer-feature]')].map(path=>path.outerHTML),geometry);
   assert.equal(q('[data-theme-return]').hidden,false);assert.equal(q('[data-theme-return]').textContent,`← ${river.label}の解説へ戻る`);
   assert.equal(q('[data-africa-statistics-key]').hidden,false);assert.equal(root.querySelectorAll('[data-africa-comparison-country]').length,2);
   assert.ok([...q('[data-theme-details]').querySelectorAll('a')].some(link=>link.href==='https://data.worldbank.org/indicator/ER.H2O.INTR.PC'));
   comparisonURL=window.location.search;
  });
  await withAfricaPage(comparisonURL,context=>{
   const {window,q}=context;assertRiver(context,river.id);assert.equal(q('[data-theme-return]').hidden,false);
   for(const [selector,value] of [['[data-place]','KEN'],['[data-compare]','ETH'],['[data-year]','2023']]){q(selector).value=value;q(selector).dispatchEvent(new window.Event('change'));}
   q('[data-zoom="country"]').click();assert.equal(parameters(window).get('place'),'KEN');assert.equal(parameters(window).get('year'),'2023');
   q('[data-theme-return]').click();assert.deepEqual(readState(window.location.search),source);assertRiver(context,river.id);
   assert.equal(q('[data-theme-return]').hidden,true);assert.equal(q('[data-africa-statistics-key]').hidden,true);assert.equal(parameters(window).has('sourceState'),false);
  });
 }
});

test('name choices, comparison, back/forward and reset restore only the selected history entry',async()=>{
 let saved;
 await withAfricaPage(initial,async context=>{
  const {window,root,q}=context;
  q('[data-africa-river-choice="nile"]').click();q('[data-africa-river-choice="congo"]').click();q('[data-theme-comparison]').click();saved=window.location.search;
  window.history.back();assertRiver(context,'congo');assert.equal(parameters(window).has('context'),false);
  window.history.back();assertRiver(context,'nile');
  window.history.forward();assertRiver(context,'congo');
  window.history.forward();assertRiver(context,'congo');assert.equal(parameters(window).get('context'),'ER.H2O.INTR.PC');
  q('[data-reset]').click();await wait(()=>q('[data-africa-raster="climate"]'),'reset must load the default climate map');
  assert.equal(parameters(window).has('river'),false);assert.equal(parameters(window).has('sourceState'),false);assert.equal(q('[data-africa-river-choices]').hidden,true);assert.equal(root.querySelectorAll('[data-africa-river]').length,0);
  window.history.back();assertRiver(context,'congo');assert.equal(parameters(window).get('context'),'ER.H2O.INTR.PC');
 });
 await withAfricaPage(saved,context=>{assertRiver(context,'congo');context.q('[data-theme-return]').click();assertRiver(context,'congo');assert.equal(parameters(context.window).has('context'),false);});
});

test('Enter and Space activate native river hit targets while preserving the specific segment focus',async()=>{
 await withAfricaPage(initial,context=>{
  const {window,q}=context;
  for(const [id,key] of [['nile','Enter'],['congo',' ']]){
   const river=africaRivers.find(row=>row.id===id),feature=river.featureIds[1],selector=`[data-africa-river-hit-feature="${feature}"]`,hit=q(selector);
   assert.equal(hit.getAttribute('role'),'button');assert.equal(hit.getAttribute('tabindex'),'0');assert.equal(hit.getAttribute('aria-label'),`${river.label}を読む`);
   hit.focus();const event=new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});hit.dispatchEvent(event);
   assert.equal(event.defaultPrevented,true,'Space must not scroll the page');assertRiver(context,id);
   assert.equal(window.document.activeElement,q(selector),'the same native segment retains keyboard focus after rendering');
  }
  const selector='[data-africa-river-choice="nile"]',choice=q(selector);choice.focus();
  // Happy DOM does not synthesize native button activation from keyboard events.
  // click() supplies that browser default; SVG activation above is the real handler.
  choice.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));choice.click();
  assertRiver(context,'nile');assert.equal(window.document.activeElement,q(selector));
 });
});

test('delayed river geometry renders the newest name selection and never reverts Congo to Nile',async()=>{
 await withAfricaPage(initial,async context=>{
  const {root,q,requests,release}=context;
  await wait(()=>requests.some(path=>path.endsWith('/rivers.geojson')),'the real geometry request must be pending');
  q('[data-africa-river-choice="nile"]').click();q('[data-africa-river-choice="congo"]').click();
  assertRiver(context,'congo',{ready:false});assert.equal(root.querySelectorAll('[data-africa-layer-feature]').length,0);assert.equal(q('[data-theme-comparison]').disabled,true);
  release();await wait(()=>root.dataset.actualLayer==='true','the delayed geometry must finish');
  assertRiver(context,'congo');assert.equal(q('[data-theme-comparison]').disabled,false);assert.equal(requests.filter(path=>path.endsWith('/rivers.geojson')).length,1);
 },{delayMatch:/\/rivers\.geojson$/});
});

test('delayed river completion cannot overwrite a newer climate selection or restore stale river controls',async()=>{
 await withAfricaPage(initial,async context=>{
  const {window,root,q,requests,completed,release}=context;
  await wait(()=>requests.some(path=>path.endsWith('/rivers.geojson')),'the real geometry request must be pending');
  q('[data-africa-river-choice="nile"]').click();q('[data-africa-river-choice="congo"]').click();q('[data-africa-topic="climate"]').click();
  await wait(()=>q('[data-africa-raster="climate"]'),'the independent climate layer must finish first');
  const title=q('[data-theme-title]').textContent,explanation=q('[data-theme-takeaway-detail]').textContent;
  release();await wait(()=>completed.some(path=>path.endsWith('/rivers.geojson')),'the abandoned river request must complete');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(parameters(window).get('topic'),'climate');assert.equal(parameters(window).has('river'),false);assert.equal(root.dataset.riverView,'false');
  assert.equal(q('[data-theme-title]').textContent,title);assert.equal(q('[data-theme-takeaway-detail]').textContent,explanation);assert.equal(q('[data-africa-river-choices]').hidden,true);
  assert.equal(root.querySelectorAll('[data-africa-river],[data-africa-river-feature]').length,0);assert.ok(q('[data-africa-raster="climate"]'));
 },{delayMatch:/\/rivers\.geojson$/});
});
