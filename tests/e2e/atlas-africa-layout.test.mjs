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

test('actual distribution legends live beside the map and remain there during comparison',async()=>{
 for(const search of ['?field=nature&topic=climate&zoom=all','?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&river=nile&zoom=all','?field=agriculture&topic=farming&crop=maize&zoom=all','?field=population&topic=distribution&zoom=all']){
  await withAfricaPage(search,({root,q})=>{
   const legend=q('[data-africa-actual-key]');assert.equal(root.querySelectorAll('[data-africa-actual-key]').length,1);assert.equal(legend.hidden,false);assert.ok(q('.africa-map-card').contains(legend));assert.equal(q('.africa-detail').contains(legend),false);assert.ok(legend.querySelector('[data-africa-layer-legend]').children.length>0);
   assert.ok(q('.africa-map').compareDocumentPosition(legend)&4,'the full actual legend follows the map');
   const labels=legend.textContent;q('[data-theme-comparison]').click();
   assert.equal(legend.hidden,false);assert.ok(q('.africa-map-card').contains(legend));assert.equal(q('[data-africa-statistics-key]').hidden,false);assert.ok(labels.trim());
   q('[data-theme-return]').click();assert.equal(legend.hidden,false);assert.equal(q('[data-africa-statistics-key]').hidden,true);
  });
 }
});

test('reference country statistics preserve disclosure choices and comparison/return changes their mode',async()=>{
 for(const [search,hidden] of [
  ['?field=nature&topic=climate&place=EGY&compare=COD&zoom=all',false],
  ['?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&river=congo&place=COD&compare=EGY&zoom=all',true],
  ['?field=agriculture&topic=farming&crop=rice&place=KEN&compare=ETH&zoom=all',false]
 ]){
  await withAfricaPage(search,({window,q,change})=>{
   const details=q('[data-country-statistics]');assert.equal(details.hidden,hidden);assert.equal(details.open,false);assert.equal(details.dataset.mode,'reference');
   if(!hidden){details.open=true;change('[data-place]','GHA');assert.equal(details.open,true);details.open=false;change('[data-place]','KEN');assert.equal(details.open,false);}
   const source=readState(window.location.search);q('[data-theme-comparison]').click();
   assert.equal(details.hidden,false);assert.equal(details.open,true);assert.equal(details.dataset.mode,'comparison');assert.equal(q('.africa-selected').hidden,false);
   assert.ok(parameters(window).get('context'));assert.equal(readState('?'+parameters(window).get('sourceState')).place,source.place);
   details.open=false;change('[data-place]','ZAF');assert.equal(details.open,false,'country changes must respect a manual collapse during comparison');
   q('[data-theme-return]').click();assert.deepEqual(readState(window.location.search),source);assert.equal(details.dataset.mode,'reference');assert.equal(details.open,false);assert.equal(details.hidden,hidden);
  });
 }
});

test('agriculture layer disclosure stays open with the focused checkbox through toggles and asynchronous renders',async()=>{
 await withAfricaPage('?field=agriculture&topic=farming&crop=maize&place=KEN&zoom=all',async({window,root,q,change})=>{
  let disclosure=q('.africa-agri-layer-disclosure');assert.ok(disclosure);assert.equal(disclosure.open,false);assert.equal(disclosure.querySelector('summary').textContent,'品目を重ねる');assert.equal(disclosure.querySelectorAll('[data-africa-agri-layer]').length,7);
  assert.equal(disclosure.closest('[data-africa-layer-options]'),q('[data-africa-layer-options]'));assert.equal(q('[data-africa-layer-options]').hidden,false);assert.equal(q('[data-africa-subfields]').closest('[data-africa-map-subfields]'),q('[data-africa-map-subfields]'));
  disclosure.open=true;
  for(const [selector,checked] of [['[data-africa-agri-layer="crop-rice-harvested"]',true],['[data-africa-agri-layer="crop-maize-harvested"]',false],['[data-africa-agri-outline]',true]]){
   const input=q(selector);input.focus();input.checked=checked;input.dispatchEvent(new window.Event('change',{bubbles:true}));
   disclosure=q('.africa-agri-layer-disclosure');assert.equal(disclosure.open,true);assert.equal(q(selector).checked,checked);assert.equal(window.document.activeElement,q(selector));
  }
  await wait(()=>q('[data-africa-commodity-layer="crop-rice-harvested"] image'),'the newly enabled rice model layer must finish');
  assert.equal(q('.africa-agri-layer-disclosure').open,true);assert.equal(window.document.activeElement,q('[data-africa-agri-outline]'));
  assert.equal(parameters(window).get('agriLayers'),'crop-rice-harvested');assert.equal(parameters(window).get('agriOutline'),'1');
  q('.africa-agri-layer-disclosure').open=false;change('[data-place]','ETH');assert.equal(q('.africa-agri-layer-disclosure').open,false,'an unrelated redraw must preserve a closed disclosure');
  q('[data-africa-topic="livestock"]').click();assert.equal(q('.africa-agri-layer-disclosure').open,false);assert.equal(root.querySelectorAll('[data-africa-agri-layer]').length,7);assert.equal(q('[data-africa-agri-layer="crop-rice-harvested"]').checked,true);
  q('[data-africa-topic="forestry"]').click();assert.equal(q('.africa-agri-layer-disclosure'),null);
 });
});
