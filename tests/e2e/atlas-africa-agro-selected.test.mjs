import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
const html=readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8');
async function fixture(query,run){
 const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:'https://example.com/insight-journal/atlas/africa/'+query}),keys=['window','document','location','history','fetch'],previous=Object.fromEntries(keys.map(key=>[key,globalThis[key]]));
 try{
  for(const key of keys.slice(0,4))globalThis[key]=window[key];
  globalThis.fetch=async url=>{const path=new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,'');let bytes=readFileSync(new URL('../../public'+path,import.meta.url));if(bytes[0]===31&&bytes[1]===139)bytes=gunzipSync(bytes);return new Response(bytes,{status:200});};
  window.document.write(html.replace(/<script\b(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),q=selector=>root.querySelector(selector),map=q('.africa-map');map.getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();
  const wait=async(predicate,message)=>{for(let i=0;i<200&&!predicate();i++)await new Promise(resolve=>setTimeout(resolve,5));assert(predicate(),message);};
  await wait(()=>root.querySelectorAll('[data-africa-commodity-layer]').length===9,'all nine existing map distributions retained');
  const navigate=query=>{window.history.replaceState(null,'',query);window.dispatchEvent(new window.PopStateEvent('popstate'));};
  await run({window,root,q,map,wait,navigate});
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
}

test('built Africa overview returns unchanged after selecting a regional product, with map geometry and all nine distributions retained',async()=>fixture('?field=agriculture',async({q,root,map,window})=>{
 const legacy=q('[data-africa-regional-statistics]');assert.equal(legacy.hidden,false);const previous=legacy.innerHTML,camera=map.getAttribute('viewBox'),labels=[...root.querySelectorAll('[data-africa-agri-label]')].map(node=>[node.dataset.africaAgriLabel,node.getAttribute('transform')]);
 assert.equal(q('[data-africa-selected-agro]').hidden,true);assert.equal(q('[data-agro-statistics]').hidden,true);
 q('[data-africa-layer-legend] [data-africa-agri-pick="crop-coffee-harvested"]').click();const custom=q('[data-africa-selected-agro]');assert.equal(custom.hidden,false);assert.match(custom.querySelector('h2').textContent,/コーヒー/);assert.equal(custom.querySelectorAll('.agro-columns>section').length,3);assert.match(custom.textContent,/16.93%/);assert.equal(legacy.hidden,true);
 assert.equal(map.getAttribute('viewBox'),camera);assert.equal(root.querySelectorAll('[data-africa-commodity-layer]').length,9);assert.deepEqual([...root.querySelectorAll('[data-africa-agri-label]')].map(node=>[node.dataset.africaAgriLabel,node.getAttribute('transform')]),labels);
 custom.querySelector('details').open=true;q('[data-africa-agri-overview]').click();assert.equal(custom.hidden,true);assert.equal(legacy.hidden,false);assert.equal(legacy.innerHTML,previous);assert.equal(new URL(window.location).searchParams.get('overview'),'1');
}));

test('built national marketing rows switch through history and national FAO data without late restoration or duplicate overview statistics',async()=>fixture('?field=agriculture&crop=maize&place=ZAF&overview=0',async({q,navigate,wait,root,map})=>{
 const custom=q('[data-africa-selected-agro]');assert.equal(custom.hidden,false);assert.match(custom.querySelector('h2').textContent,/南アフリカ/);assert.match(custom.textContent,/17.35/);assert.equal(q('[data-agro-statistics]').hidden,true);assert.equal(q('[data-africa-regional-statistics]').hidden,true);assert.equal(custom.querySelector('[data-africa-trade-reference]').open,false);
 navigate('?field=agriculture&crop=wheat&place=NGA&overview=0');assert.match(custom.querySelector('h2').textContent,/ナイジェリア/);assert.match(custom.textContent,/799.1/);assert.equal(custom.querySelector('[data-africa-trade-reference]'),null);
 navigate('?field=agriculture&topic=livestock&livestock=cattle&place=KEN&overview=0');assert.equal(custom.hidden,true);await wait(()=>q('[data-agro-statistics]').dataset.agroReady==='true','shared Kenya cattle data loads');assert.equal(q('[data-agro-statistics]').hidden,false);assert(q('[data-agro-country="KEN"][data-agro-series="cattle-meat"]'));
 navigate('?field=agriculture&crop=maize&place=EGY&overview=0');assert.equal(custom.hidden,false);assert.match(custom.querySelector('h2').textContent,/エジプト/);assert.equal(q('[data-agro-statistics]').hidden,true);
 assert.equal(root.querySelectorAll('[data-africa-commodity-layer]').length,9);assert(map.getAttribute('viewBox'));
 navigate('?field=agriculture');assert.equal(custom.hidden,true);assert.equal(q('[data-agro-statistics]').hidden,true);assert.equal(q('[data-africa-regional-statistics]').hidden,false);
}));
