import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {africaLayerPath} from '../../src/scripts/atlas-africa-layers.ts';
import {africaHydrologyRivers as africaRivers,africaHydrologyBasinRelations} from '../../src/data/atlas/africa-hydrology-reading.ts';
import {africaRiverDisplayColors} from '../../src/scripts/atlas-africa-layers.ts';

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

function assertRiver({window,root,q},id){
 const river=africaRivers.find(row=>row.id===id);assert.ok(river);
 assert.equal(parameters(window).get('river'),id);assert.equal(root.dataset.riverView,'true');assert.equal(q('[data-theme-title]').textContent,river.label);
 assert.equal(q('[data-theme-takeaway]').textContent.includes(river.reading?.text??`${river.label}の収録河道を強調`),true);
 assert.equal(q('[data-theme-source]').hidden,false);assert.equal(q('[data-theme-source]').href,river.reading?.source??river.source);
 assert.equal(q('[data-africa-selection-return]').hidden,false);assert.equal(root.dataset.actualLayer,'true');
 const all=[...root.querySelectorAll('[data-africa-layer-feature]')];assert.equal(all.length,native.features.length);assert.equal(new Set(all.map(path=>path.dataset.africaLayerFeature)).size,90);
 for(const path of all){assert.equal(path.getAttribute('d'),nativePaths.get(path.dataset.africaLayerFeature));assert.equal(path.style.display,'');assert.equal(path.getAttribute('fill'),'none');}
 const selected=all.filter(path=>path.classList.contains('is-selected'));
 assert.deepEqual(selected.map(path=>path.dataset.africaLayerFeature).sort(),[...river.featureIds].sort());
 for(const path of selected){assert.equal(path.getAttribute('stroke'),africaRiverDisplayColors.selected);assert.equal(path.querySelector('title').textContent,river.label);}
 for(const hit of root.querySelectorAll('[data-africa-river-hit-feature]')){
  assert.equal(hit.getAttribute('aria-pressed'),String(hit.dataset.africaRiver===id));assert.equal(hit.getAttribute('d'),nativePaths.get(hit.dataset.africaRiverHitFeature));assert.equal(hit.getAttribute('fill'),'none');assert.equal(hit.getAttribute('stroke'),'transparent');
 }
 const names=[...root.querySelectorAll('[data-africa-river-label]')];assert.deepEqual(names.map(node=>node.dataset.africaRiver).sort(),africaRivers.map(row=>row.id).sort());
 for(const name of names)assert.equal(name.getAttribute('aria-pressed'),String(name.dataset.africaRiver===id));
 const legend=q('[data-africa-layer-legend]');assert.equal(legend.children.length,3);assert.match(legend.textContent,/9河川/);
 assert.match(q('[data-africa-layer-scope]').textContent,/太さは川幅・流量を表しません/);assert.doesNotMatch(root.textContent,/アフリカ90河川/);
}
const activate=(context,selector)=>context.q(selector).dispatchEvent(new context.window.MouseEvent('click',{bubbles:true}));
const restore=(context,search)=>{context.window.history.replaceState(null,'',search);context.window.dispatchEvent(new context.window.PopStateEvent('popstate'));};

test('all nine map names and original river segments select identical reading, source and geometry without hiding other lines',async()=>{
 await withAfricaPage(initial,context=>{
  const {window,root,q}=context;
  assert.equal(q('[data-africa-selection-return]').hidden,true);
  for(const river of africaRivers){
   activate(context,`[data-africa-river-label="${river.id}"]`);assertRiver(context,river.id);
   for(const feature of river.featureIds){
    q('[data-africa-selection-return]').click();assert.equal(parameters(window).has('river'),false);assert.equal(root.querySelectorAll('.africa-river-path.is-selected').length,0);
    activate(context,`[data-africa-river-hit-feature="${feature}"]`);assertRiver(context,river.id);assert.equal(parameters(window).has('layerPoint'),false);
   }
  }
  activate(context,'[data-africa-river-label="nile"]');const nile=africaRivers.find(row=>row.id==='nile');assert.ok(q('[data-theme-details]').textContent.includes(nile.theme.takeaway));
  for(const source of [{url:nile.theme.source},...nile.theme.evidenceSources??[]])assert.ok([...q('[data-theme-details]').querySelectorAll('a')].some(link=>link.href===source.url));
  activate(context,'[data-africa-river-label="congo"]');assert.match(q('[data-theme-caveat]').textContent,/盆地や全流域の境界ではありません/);
 });
});

test('legacy river URLs reload the same named source and retire every country comparison control and parameter',async()=>{
 for(const river of africaRivers){
  let saved;
  await withAfricaPage(initial+'&river='+river.id+'&context=ER.H2O.INTR.PC&sourceState=field%3Dnature',context=>{
   assertRiver(context,river.id);saved=context.window.location.search;
   for(const key of ['place','compare','year','metric','context','sourceState','view'])assert.equal(parameters(context.window).has(key),false,key);
   for(const selector of ['[data-place]','[data-compare]','[data-year]','[data-theme-comparison]','[data-country-statistics]'])assert.equal(context.q(selector),null,selector);
  });
  await withAfricaPage(saved,context=>{assertRiver(context,river.id);context.q('[data-africa-selection-return]').click();assert.equal(parameters(context.window).has('river'),false);assert.equal(context.root.querySelectorAll('.africa-river-path.is-selected').length,0);});
 }
});

test('river name selection, overview return, back/forward and reset restore only the selected history entry',async()=>{
 await withAfricaPage(initial,async context=>{
  const {window,root,q}=context;
  activate(context,'[data-africa-river-label="nile"]');activate(context,'[data-africa-river-label="congo"]');q('[data-africa-selection-return]').click();
  window.history.back();assertRiver(context,'congo');window.history.back();assertRiver(context,'nile');window.history.forward();assertRiver(context,'congo');
  window.history.forward();assert.equal(parameters(window).has('river'),false);window.history.back();assertRiver(context,'congo');
  q('[data-reset]').click();await wait(()=>q('[data-africa-raster="climate"]'),'reset loads default climate');assert.equal(parameters(window).has('river'),false);assert.equal(root.querySelectorAll('[data-africa-river]').length,0);
  window.history.back();assertRiver(context,'congo');
 });
});

test('Enter and Space activate river lines and names while preserving the exact keyboard target',async()=>{
 await withAfricaPage(initial,context=>{
  const {window,q}=context;
  for(const [selector,id,key] of [['[data-africa-river-hit-feature="ne50-river-0298"]','nile','Enter'],['[data-africa-river-label="niger"]','niger',' ']]){
   const hit=q(selector);assert.equal(hit.getAttribute('role'),'button');assert.equal(hit.getAttribute('tabindex'),'0');hit.focus();
   const event=new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});hit.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assertRiver(context,id);assert.equal(window.document.activeElement,q(selector));
  }
 });
});

test('delayed river geometry follows the newest URL selection and cannot overwrite a later climate topic',async()=>{
 for(const leave of [false,true])await withAfricaPage(initial+'&river=nile',async context=>{
  const {root,q,requests,completed,release}=context;await wait(()=>requests.some(path=>path.endsWith('/rivers.geojson')),'river geometry is pending');
  restore(context,initial+'&river=congo');assert.equal(q('[data-theme-title]').textContent,'コンゴ川');
  if(leave){q('[data-africa-topic="climate"]').click();await wait(()=>q('[data-africa-raster="climate"]'),'climate loads independently');}
  release();await wait(()=>completed.some(path=>path.endsWith('/rivers.geojson')),'delayed river request finishes');await new Promise(resolve=>setImmediate(resolve));
  if(leave){assert.equal(parameters(context.window).get('topic'),'climate');assert.equal(root.querySelectorAll('[data-africa-river]').length,0);assert.ok(q('[data-africa-raster="climate"]'));}
  else {await wait(()=>root.dataset.actualLayer==='true','river map ready');assertRiver(context,'congo');}
 },{delayMatch:/\/rivers\.geojson$/});
});

test('named basin relations select real source polygons with pale independent fills and reversible history',async()=>{
 const basins=JSON.parse(gunzipSync(readFileSync(new URL('../../public/assets/atlas/africa-water-v1/basins.geojson.gz',import.meta.url))));
 let saved;
 await withAfricaPage('?field=nature&topic=water&water=basin',context=>{
  const {root,q,window}=context;const paths=[...root.querySelectorAll('[data-africa-layer-feature]')];assert.equal(paths.length,basins.features.length);
  for(const feature of basins.features)assert.equal(q(`[data-africa-layer-feature="${feature.properties.id}"]`).getAttribute('d'),africaLayerPath(feature.geometry));
  for(const relation of africaHydrologyBasinRelations){
   const selector=`[data-africa-basin-feature="${relation.basinId}"]`,polygon=q(selector);assert.notEqual(polygon.getAttribute('fill'),'none');activate(context,selector);
   assert.equal(parameters(window).get('basin'),relation.basinId);assert.equal(q(selector).getAttribute('aria-pressed'),'true');assert.match(q('[data-theme-title]').textContent,new RegExp(relation.riverLabel));assert.ok(q('[data-theme-caveat]').textContent.includes(relation.scope));
   assert.equal(root.querySelectorAll('[data-africa-layer-feature]').length,1037);assert.equal(root.querySelectorAll('[data-africa-basin-feature][aria-pressed="true"]').length,1);
  }
  saved=window.location.search;q('[data-africa-selection-return]').click();assert.equal(parameters(window).has('basin'),false);window.history.back();assert.equal(window.location.search,saved);
  const first=africaHydrologyBasinRelations[0],label=q(`[data-africa-basin-label="${first.basinId}"]`);label.focus();label.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));assert.equal(parameters(window).get('basin'),first.basinId);assert.equal(window.document.activeElement.getAttribute('data-africa-basin'),first.basinId);
 });
 await withAfricaPage(saved,({q,window})=>assert.equal(q(`[data-africa-basin-feature="${parameters(window).get('basin')}"]`).getAttribute('aria-pressed'),'true'));
});

test('late basin polygons honor a newer basin URL or a later rainfall guide',async()=>{
 const [first,second]=africaHydrologyBasinRelations;
 for(const leave of [false,true])await withAfricaPage(`?field=nature&topic=water&water=basin&basin=${first.basinId}`,async context=>{
  const {root,q,requests,completed,release}=context;await wait(()=>requests.some(path=>path.endsWith('/basins.geojson.gz')),'basin polygons pending');
  restore(context,`?field=nature&topic=water&water=basin&basin=${second.basinId}`);
  if(leave)q('[data-africa-water="rain"]').click();release();await wait(()=>completed.some(path=>path.endsWith('/basins.geojson.gz')),'basin response finishes');
  if(leave){await new Promise(resolve=>setTimeout(resolve,50));assert.equal(parameters(context.window).get('water'),'rain');assert.equal(root.querySelectorAll('[data-africa-basin]').length,0);assert.equal(root.dataset.layerMode,'guide');}
  else{await wait(()=>!!q(`[data-africa-basin-feature="${second.basinId}"]`),'current basin drawn');assert.equal(q(`[data-africa-basin-feature="${second.basinId}"]`).getAttribute('aria-pressed'),'true');assert.equal(q(`[data-africa-basin-feature="${first.basinId}"]`).getAttribute('aria-pressed'),'false');}
 },{delayMatch:/\/basins\.geojson\.gz$/});
});
