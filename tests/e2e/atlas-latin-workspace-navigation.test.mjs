import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {initLatinWorkspaceLayout} from '../../src/scripts/atlas-latin-workspace-layout.ts';
import {initLatinOverviewLinks} from '../../src/scripts/atlas-latin-overview-layout.ts';

async function withPage(field,run){
 const w=new Window({url:`https://example.com/insight-journal/atlas/latin-america/${field}/?place=CRI&country=CRI&scope=country&only=1&fallback=1`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const previous=Object.fromEntries(['window','document','location','requestAnimationFrame'].map(key=>[key,globalThis[key]]));
 try{
  globalThis.window=w;globalThis.document=w.document;globalThis.location=w.location;globalThis.requestAnimationFrame=callback=>{callback(0);return 0;};
  w.document.body.innerHTML=readFileSync(new URL(`../../dist/atlas/latin-america/${field}/index.html`,import.meta.url),'utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
  await run(w.document,w);
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}await w.happyDOM.close();}
}

for(const field of ['agriculture','nature','industry','population'])test(`Latin ${field} keeps country, scope and display flags when controls move and another field opens`,async()=>{
 await withPage(field,async(d,w)=>{
  const root=d.querySelector('[data-latin-workspace]');
  const place=root.querySelector('[data-latin-agriculture-place],[data-nature-place],[data-industry-place],[data-lp-place-select]');
  const scope=root.querySelector('[data-latin-agriculture-scope],[data-nature-scope],[data-industry-scope],[data-lp-scope-select]');
  assert.ok(place&&scope);
  // The layout module can run before field controllers restore the URL selection.
  place.value='all';scope.value='all';
  let changes=0;place.addEventListener('change',()=>changes++);
  initLatinWorkspaceLayout();
  for(const link of root.querySelectorAll('.latin-fields>a')){const url=new URL(link.href);if(url.pathname.endsWith('/overview/'))assert.equal(url.searchParams.get('country'),'CRI');else{assert.equal(url.searchParams.get('place'),'CRI');assert.equal(url.searchParams.get('scope'),'country');}}
  assert.equal(root.querySelector('[data-latin-navigation-selection] select'+place.getAttributeNames().filter(name=>name.startsWith('data-')).map(name=>`[${name}]`).join('')),place);
  place.value='CRI';scope.value='country';
  place.dispatchEvent(new w.Event('change',{bubbles:true}));await Promise.resolve();
  assert.equal(changes,1);
  const links=[...root.querySelectorAll('.latin-fields>a')];assert.equal(links.length,5);
  for(const link of links){const url=new URL(link.href);assert.equal(url.searchParams.get('only'),'1');assert.equal(url.searchParams.get('fallback'),'1');if(url.pathname.endsWith('/overview/'))assert.equal(url.searchParams.get('country'),'CRI');else{assert.equal(url.searchParams.get('place'),'CRI');assert.equal(url.searchParams.get('scope'),'country');}}
  initLatinWorkspaceLayout();assert.equal(root.querySelectorAll('[data-latin-navigation-selection] select').length,2);
 });
});

test('Latin overview country selection opens all four fields with the same country and display flags',async()=>{
 await withPage('overview',async(d,w)=>{
  const root=d.querySelector('[data-country-overview]'),picker=root.querySelector('[data-overview-country]');
  picker.value='CRI';initLatinOverviewLinks(root);picker.dispatchEvent(new w.Event('change',{bubbles:true}));await Promise.resolve();
  const links=[...root.querySelectorAll('.country-overview-fields [data-overview-field]')];assert.equal(links.length,4);
  for(const link of links){const url=new URL(link.href);assert.equal(url.searchParams.get('place'),'CRI');assert.equal(url.searchParams.get('scope'),'country');assert.equal(url.searchParams.get('only'),'1');assert.equal(url.searchParams.get('fallback'),'1');}
 });
});
