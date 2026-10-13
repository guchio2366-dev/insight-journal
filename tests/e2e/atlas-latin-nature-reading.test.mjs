import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {industryBundle} from '../unit/atlas-latin-industry-helpers.mjs';
const script=await industryBundle("import './src/scripts/atlas-latin-nature.ts';import './src/scripts/atlas-latin-water-terrain.ts';import {initLatinWorkspaceLayout} from './src/scripts/atlas-latin-workspace-layout.ts';initLatinWorkspaceLayout();",'iife','browser',true);
async function page(search){
 const w=new Window({url:'https://example.test/insight-journal/atlas/latin-america/nature/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 Object.defineProperty(w.document,'fonts',{value:{ready:Promise.resolve()}});
 w.document.write((await readFile('dist/atlas/latin-america/nature/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));w.eval(script);await w.happyDOM.whenAsyncComplete();return w;
}
test('Real nature page direct URLs/reload keep the active section, geographic scope and common navigation',async()=>{
 for(const section of ['climate','rivers','rainfall','terrain','elevation']){
  const query=`?section=${section}&scope=south&place=BRA`,w=await page(query);
  try{assert.equal(w.document.querySelector('[data-latin-workspace]').dataset.latinActiveSection,section);assert.equal(w.document.querySelector('select[data-nature-scope]').value,'south');assert.equal(w.document.querySelector('select[data-nature-place]').value,'BRA');assert.deepEqual([...w.document.querySelectorAll('.latin-fields>a')].map(n=>n.textContent),['概要','農林業','自然環境','主要産業','人口']);assert.ok(w.document.querySelector('.atlas-news'));const host=w.document.querySelector(section==='climate'?'[data-nature-map-host]':`[data-foundation-map=${section}]`);assert.equal(host.querySelectorAll('svg').length,1);if(section==='terrain')assert.equal(host.querySelectorAll('[data-landform-area]').length,11);if(section==='climate')assert.equal(w.document.querySelectorAll('[data-climate-class]').length,21);}finally{await w.happyDOM.close();}
 }
});
test('Section transitions/back and river keyboard selection restore actual displayed geography',async()=>{
 const w=await page('?scope=central');try{
  const root=w.document.querySelector('[data-latin-workspace]');
  for(const section of ['rivers','rainfall','terrain','elevation']){w.document.querySelector(`[data-latin-section=${section}]`).click();await w.happyDOM.whenAsyncComplete();assert.equal(root.dataset.latinActiveSection,section);assert.equal(w.document.querySelector(`[data-latin-section-panel=${section}]`).hidden,false);assert.equal(w.document.querySelector('[data-latin-unavailable]').hidden,true);assert.equal(w.document.querySelector('select[data-nature-scope]').value,'central');}
  w.history.replaceState(null,'','?section=rivers&scope=central');w.dispatchEvent(new w.PopStateEvent('popstate'));await w.happyDOM.whenAsyncComplete();assert.equal(root.dataset.latinActiveSection,'rivers');
  const river=w.document.querySelector('[data-foundation-river]'),id=river.dataset.foundationRiver;river.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await w.happyDOM.whenAsyncComplete();assert.equal(new URL(w.location.href).searchParams.get('river'),id);assert.equal(w.document.querySelector(`[data-foundation-river=${id}]`).getAttribute('aria-pressed'),'true');
  w.history.replaceState(null,'','?scope=central');w.dispatchEvent(new w.PopStateEvent('popstate'));await w.happyDOM.whenAsyncComplete();assert.equal(root.dataset.latinActiveSection,'climate');assert.equal(w.document.querySelectorAll('[data-climate-class]').length,21);
 }finally{await w.happyDOM.close();}
});
