import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';

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
  assertTabs(context,'[data-africa-topic]','water',{focused:false});assert.equal(parameters(context.window).has('metric'),false);
 });
});

test('population tabs retain roving focus when changing between density and the two source guides',async()=>{
 await withAfricaPage('?field=population&topic=distribution&zoom=all',context=>{
  assertTabs(context,'[data-africa-topic]','distribution',{focused:false});
  navigateTabs(context,'data-africa-topic',[['ArrowRight','ethnicity'],['End','religion'],['ArrowRight','distribution'],['ArrowLeft','religion'],['ArrowLeft','ethnicity'],['Home','distribution']]);
});
});

test('source guides offer alternatives beside the reading and keep empty map legends hidden',async()=>{
 await withAfricaPage('?field=population&topic=distribution',async context=>{
  const {root,q}=context,status=q('[data-africa-subfield-status]');assert.equal(status.getAttribute('role'),'status');
  assert.equal(root.querySelectorAll('[data-africa-layer-class]').length,7);assert.equal(q('[data-africa-actual-key]').hidden,false);
  for(const topic of ['ethnicity','religion']){q(`[data-africa-topic="${topic}"]`).click();assert.equal(q('[data-africa-actual-key]').hidden,true);assert.equal(q('[data-africa-alternatives]').hidden,false);assert.ok(q('.africa-detail').contains(q('[data-africa-alternatives]')));assert.equal(root.querySelectorAll('[data-africa-raster]').length,0);}
  q('[data-africa-topic="distribution"]').click();await wait(()=>q('[data-africa-raster="distribution"]'),'density returns');assert.equal(q('[data-africa-alternatives]').hidden,true);assert.equal(root.querySelectorAll('[data-africa-subfield-status]').length,1);
 });
});

test('source legends remain beside the map through selection, return and history without country statistics',async()=>{
 for(const search of ['?field=nature&topic=climate','?field=nature&topic=water&water=river&river=nile','?field=agriculture&crop=maize','?field=population&topic=distribution']){
  await withAfricaPage(search,({window,root,q})=>{
   const legend=q('[data-africa-actual-key]');assert.equal(root.querySelectorAll('[data-africa-actual-key]').length,1);assert.equal(legend.hidden,false);assert.ok(q('.africa-map-card').contains(legend));assert.equal(q('.africa-detail').contains(legend),false);assert.ok(legend.querySelector('[data-africa-layer-legend]').children.length>0);assert.ok(q('.africa-map').compareDocumentPosition(legend)&4);
   assert.equal(q('[data-country-statistics]'),null);assert.equal(q('[data-theme-comparison]'),null);
   if(root.dataset.field==='agriculture'){assert.equal(legend.querySelectorAll('[data-africa-agri-pick]').length,7);assert.equal(q('[data-africa-agri-value-legend]').hidden,false);q('[data-africa-agri-overview]').click();assert.equal(q('[data-africa-agri-value-legend]').hidden,true);}
   else if(root.dataset.riverView==='true')q('[data-africa-selection-return]').click();
   else q('[data-africa-layer-class]').click();
   assert.equal(legend.hidden,false);window.history.back();assert.equal(legend.hidden,false);assert.ok(q('.africa-map-card').contains(legend));
  });
 }
});

test('agriculture reading, compact key and supplements occupy the main content column',async()=>{
 await withAfricaPage('?field=agriculture&topic=farming&crop=maize&zoom=all',async({window,root,q})=>{
  assert.equal(q('.africa-secondary').parentElement,q('.africa-main'));
  assert.equal(q('.africa-secondary').contains(q('.africa-sources')),true);
  assert.equal(q('[data-africa-agri-notes]').contains(q('.africa-theme-full')),true);
  assert.equal(q('.africa-detail').contains(q('[data-africa-agri-context]')),true);
  assert.equal(q('.africa-detail').contains(q('[data-africa-agri-only]')),true);
  assert.equal(root.querySelectorAll('[data-africa-commodity],[data-africa-crop-measure],[data-africa-agri-layer]').length,0);
  assert.deepEqual([...root.querySelectorAll('[data-africa-topic]')].map(button=>button.textContent),['農畜産','林業']);
  assert.match(q('[data-africa-agri-context]').textContent,/西部|東部|南部/);
  assert.match(q('[data-theme-details]').textContent,/5分角/);assert.doesNotMatch(q('[data-theme-details]').textContent,/上位25%|75パーセンタイル/);
  assert.equal(q('[data-theme-comparison]'),null);
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
  assert.equal(root.dataset.overview,'true');assert.equal(q('[data-place]'),null);assert.equal(q('[data-country-statistics]'),null);
  assert.equal(root.querySelectorAll('[data-africa-layer-legend] [data-africa-agri-pick]').length,7);assert.equal(layers().length,7);assert.ok(layers().every(row=>row.display===''));
  assert.equal(q('[data-country-path="EGY"]').style.pointerEvents,'none');
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
