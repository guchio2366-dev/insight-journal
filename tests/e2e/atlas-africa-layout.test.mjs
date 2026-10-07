import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {readState} from '../../src/data/atlas/africa-atlas.ts';

const base='https://example.com/insight-journal/atlas/africa/';
const wait=async(condition,message)=>{const end=Date.now()+10000;while(!condition()&&Date.now()<end)await new Promise(resolve=>setImmediate(resolve));assert.ok(condition(),message);};
const parameters=window=>new URL(window.location.href).searchParams;

async function withAfricaPage(search,run){
 const window=new Window({url:base+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async input=>new Response(readFileSync(new URL('../../public'+new URL(input,base).pathname.replace(/^\/insight-journal/,''),import.meta.url)),{status:200});
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),q=selector=>root.querySelector(selector);
  q('.africa-map').getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();await wait(()=>root.dataset.actualLayer==='true'||root.dataset.layerMode==='guide','the selected local distribution or source guide must be ready');
  const change=(selector,value)=>{const input=q(selector);assert.ok(input,selector);input.value=value;input.dispatchEvent(new window.Event('change',{bubbles:true}));};
  await run({window,root,q,change});
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
}

function assertTabs({window,root,q},selector,id,{focused=true}={}){
 const tabs=[...root.querySelectorAll(selector)],active=tabs.find(tab=>tab.getAttribute(selector.slice(1,-1))===id);
 assert.ok(active,`${selector} ${id}`);assert.equal(active.closest('[role="tablist"]')?.getAttribute('role'),'tablist');
 assert.equal(tabs.filter(tab=>tab.tabIndex===0).length,1);assert.equal(tabs.filter(tab=>tab.getAttribute('aria-selected')==='true').length,1);
 for(const tab of tabs){const selected=tab===active;assert.equal(tab.getAttribute('role'),'tab');assert.equal(tab.getAttribute('aria-selected'),String(selected));assert.equal(tab.getAttribute('aria-pressed'),String(selected));assert.equal(tab.tabIndex,selected?0:-1);assert.equal(tab.getAttribute('aria-controls'),'africa-map-panel');assert.ok(q('#'+tab.getAttribute('aria-controls')));}
 if(focused)assert.equal(window.document.activeElement,active,'keyboard focus must survive control replacement');
}

function navigateTabs(context,attribute,moves){
 const {window,root}=context,selector=`[${attribute}]`;
 for(const [key,id] of moves){
  const active=root.querySelector(`${selector}[aria-selected="true"]`);active.focus();
  const event=new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});active.dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);assertTabs(context,selector,id);
  assert.equal(parameters(window).get(attribute==='data-africa-water'?'water':'topic'),id);
 }
}

test('nature tabs support arrow keys, Home and End with automatic selection and one keyboard stop',async()=>{
 await withAfricaPage('?field=nature&topic=climate&zoom=all',context=>{
  assertTabs(context,'[data-africa-topic]','climate',{focused:false});
  navigateTabs(context,'data-africa-topic',[['ArrowRight','water'],['ArrowLeft','climate'],['End','elevation'],['ArrowRight','climate'],['ArrowLeft','elevation'],['Home','climate']]);
 });
});

test('water subtabs keep their own keyboard selection independent of the nature tablist',async()=>{
 await withAfricaPage('?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&zoom=all',context=>{
  assertTabs(context,'[data-africa-water]','river',{focused:false});
  navigateTabs(context,'data-africa-water',[['ArrowRight','rain'],['End','basin'],['ArrowLeft','rain'],['Home','river'],['ArrowLeft','basin'],['ArrowRight','river']]);
  assertTabs(context,'[data-africa-topic]','water',{focused:false});assert.equal(parameters(context.window).get('metric'),'ER.H2O.INTR.PC');
 });
});

test('population tabs retain roving focus when changing between density and the two source guides',async()=>{
 await withAfricaPage('?field=population&topic=distribution&zoom=all',context=>{
  assertTabs(context,'[data-africa-topic]','distribution',{focused:false});
  navigateTabs(context,'data-africa-topic',[['ArrowRight','ethnicity'],['End','religion'],['ArrowRight','distribution'],['ArrowLeft','religion'],['ArrowLeft','ethnicity'],['Home','distribution']]);
});
});

test('population data status follows the tabs and distinguishes density estimates from unpublished source guides',async()=>{
 await withAfricaPage('?field=population&topic=distribution&zoom=all',async context=>{
  const {root,q}=context,status=q('[data-africa-subfield-status]'),nav=q('[data-africa-subfields]');
  assert.equal(status.previousElementSibling,nav);assert.equal(status.nextElementSibling,q('.africa-workspace'));
  assert.equal(status.getAttribute('role'),'status');assert.equal(status.hidden,false);
  assert.equal(status.textContent,'色は人口密度の推計区分。国の平均とは異なります。');
  assert.equal(q('[data-africa-layer-scope]').hidden,true,'the same explanation must not repeat below the legend');
  assert.equal(root.querySelectorAll('[data-africa-layer-class]').length,7,'all original density classes remain available');
  navigateTabs(context,'data-africa-topic',[['ArrowRight','ethnicity']]);
  assert.match(status.textContent,/2021版.*この画面に分布図はありません/);assert.equal(status.previousElementSibling,nav);
  navigateTabs(context,'data-africa-topic',[['End','religion']]);
  assert.match(status.textContent,/2020年の局所観測ではなく、この画面に分布図はありません/);
  navigateTabs(context,'data-africa-topic',[['Home','distribution']]);
  assert.equal(status.textContent,'色は人口密度の推計区分。国の平均とは異なります。');
  q('.africa-fields [data-field="nature"]').click();
  await wait(()=>q('[data-africa-layer-class]')&&root.dataset.actualLayer==='true','nature distribution must load after leaving population');
  assert.equal(q('.africa-map-card').contains(status),true);assert.equal(status.hidden,true);assert.equal(q('[data-africa-layer-scope]').hidden,false);
  assert.equal(root.querySelectorAll('[data-africa-subfield-status]').length,1);
 });
});

test('actual distribution legends live beside the map and remain there during comparison',async()=>{
 for(const search of ['?field=nature&topic=climate&zoom=all','?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&river=nile&zoom=all','?field=agriculture&topic=farming&crop=maize&zoom=all','?field=population&topic=distribution&zoom=all']){
  await withAfricaPage(search,({root,q})=>{
   const legend=q('[data-africa-actual-key]');assert.equal(root.querySelectorAll('[data-africa-actual-key]').length,1);assert.equal(legend.hidden,false);assert.ok(q('.africa-map-card').contains(legend));assert.equal(q('.africa-detail').contains(legend),false);assert.ok(legend.querySelector('[data-africa-layer-legend]').children.length>0);
   assert.ok(q('.africa-map').compareDocumentPosition(legend)&4,'the full actual legend follows the map');
   const labels=legend.textContent;if(root.dataset.field==='agriculture'){assert.equal(q('[data-theme-comparison]').hidden,true);assert.equal(legend.querySelectorAll('[data-africa-agri-pick]').length,7);assert.ok(labels.trim());return;}q('[data-theme-comparison]').click();
   assert.equal(legend.hidden,false);assert.ok(q('.africa-map-card').contains(legend));assert.equal(q('[data-africa-statistics-key]').hidden,false);assert.ok(labels.trim());
   q('[data-theme-return]').click();assert.equal(legend.hidden,false);assert.equal(q('[data-africa-statistics-key]').hidden,true);
  });
 }
});

test('reference country statistics preserve disclosure choices and comparison/return changes their mode',async()=>{
 for(const [search,hidden] of [
  ['?field=nature&topic=climate&place=EGY&compare=COD&zoom=all',false],
  ['?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&river=congo&place=COD&compare=EGY&zoom=all',true],
  ['?field=agriculture&topic=farming&crop=rice&place=KEN&compare=ETH&zoom=all',true]
 ]){
  await withAfricaPage(search,({window,q,change})=>{
   const details=q('[data-country-statistics]');assert.equal(details.hidden,hidden);assert.equal(details.open,false);assert.equal(details.dataset.mode,'reference');
   if(!hidden){details.open=true;change('[data-place]','GHA');assert.equal(details.open,true);details.open=false;change('[data-place]','KEN');assert.equal(details.open,false);}
   const source=readState(window.location.search);if(source.field==='agriculture'){assert.equal(q('[data-theme-comparison]').hidden,true);assert.equal(source.compare,'');assert.equal(parameters(window).has('year'),false);return;}q('[data-theme-comparison]').click();
   assert.equal(details.hidden,false);assert.equal(details.open,true);assert.equal(details.dataset.mode,'comparison');assert.equal(q('.africa-selected').hidden,false);
   assert.ok(parameters(window).get('context'));assert.equal(readState('?'+parameters(window).get('sourceState')).place,source.place);
   details.open=false;change('[data-place]','ZAF');assert.equal(details.open,false,'country changes must respect a manual collapse during comparison');
   q('[data-theme-return]').click();assert.deepEqual(readState(window.location.search),source);assert.equal(details.dataset.mode,'reference');assert.equal(details.open,false);assert.equal(details.hidden,hidden);
  });
 }
});

// The user replaced the former checkbox/quantity controls with direct map
// selection and an explicit right-panel isolation action. Keep those semantics
// separate from the other fields' comparison/disclosure contract above.
test('agriculture reading, compact key and supplements occupy the main content column',async()=>{
 await withAfricaPage('?field=agriculture&topic=farming&crop=maize&zoom=all',async({window,root,q})=>{
  assert.equal(q('.africa-secondary').parentElement,q('.africa-main'));
  assert.equal(q('.africa-secondary').contains(q('.africa-sources')),true);
  assert.equal(q('[data-africa-agri-notes]').contains(q('.africa-theme-full')),true);
  assert.equal(q('.africa-theme-full').contains(q('[data-africa-layer-selection]')),true);
  assert.equal(q('.africa-detail').contains(q('[data-africa-agri-context]')),true);
  assert.equal(q('.africa-detail').contains(q('[data-africa-agri-only]')),true);
  assert.equal(root.querySelectorAll('[data-africa-commodity],[data-africa-crop-measure],[data-africa-agri-layer]').length,0);
  assert.deepEqual([...root.querySelectorAll('[data-africa-topic]')].map(button=>button.textContent),['農畜産','林業']);
  assert.match(q('[data-africa-agri-context]').textContent,/西部|東部|南部/);
  assert.match(q('[data-theme-details]').textContent,/75%|25%/);
  assert.equal(q('[data-theme-comparison]').hidden,true);
  q('.africa-theme-full').open=true;
  q('[data-africa-layer-legend] [data-africa-agri-pick="crop-rice-harvested"]').click();
  assert.equal(q('.africa-theme-full').open,true,'the supplement keeps its disclosure choice on product selection');
  q('[data-field="nature"]').click();await wait(()=>q('[data-africa-raster="climate"]'),'nature must restore its physical layer');
  assert.equal(q('.africa-detail-scroll').contains(q('.africa-theme-full')),true);
  assert.equal(q('.africa-detail-scroll').contains(q('[data-africa-layer-selection]')),true);
  assert.equal(q('[data-africa-agri-notes]').hidden,true);
 });
});

test('agriculture map selection and keyboard focus preserve seven distributions without a country popup',async()=>{
 await withAfricaPage('?field=agriculture',async({window,root,q})=>{
  const layers=()=>[...root.querySelectorAll('[data-africa-commodity-layer]')].map(node=>({key:node.dataset.africaCommodityLayer,display:node.style.display,opacity:Number(node.style.opacity)}));
  assert.equal(root.dataset.overview,'true');assert.equal(q('[data-place]').value,'');assert.equal(q('[data-country-statistics]').hidden,true);
  assert.equal(root.querySelectorAll('[data-africa-layer-legend] [data-africa-agri-pick]').length,7);assert.equal(layers().length,7);assert.ok(layers().every(row=>row.display===''));
  assert.equal(root.querySelectorAll('[data-country-path] title').length,0);assert.equal(q('[data-country-path="EGY"]').style.pointerEvents,'none');
  q('[data-africa-agri-label="crop-rice-harvested"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  await wait(()=>q('[data-africa-agri-footprint="crop-rice-harvested"]'),'rice selection must show its derived outline');
  assert.equal(root.dataset.overview,'false');assert.equal(layers().length,7);assert.ok(layers().every(row=>row.display===''));
  assert.ok(layers().filter(row=>row.key.startsWith('livestock-')).every(row=>row.opacity<1));assert.match(q('[data-africa-agri-context]').textContent,/マダガスカル/);
  const label=q('[data-africa-agri-label="livestock-cattle"]');label.focus();label.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(parameters(window).get('livestock'),'cattle');assert.equal(window.document.activeElement.getAttribute('data-africa-agri-pick'),'livestock-cattle');
  assertTabs({window,root,q},'[data-africa-topic]','farming',{focused:false});
  q('[data-africa-agri-overview]').click();assert.equal(root.dataset.overview,'true');assert.equal(layers().length,7);
  q('[data-field="nature"]').click();await wait(()=>q('[data-africa-raster="climate"]'),'nature returns to climate');assert.equal(root.querySelectorAll('[data-africa-commodity-layer]').length,0);
 });
});
