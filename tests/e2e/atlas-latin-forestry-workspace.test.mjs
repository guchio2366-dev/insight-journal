import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const code=(await build({stdin:{contents:"import {initLatinWorkspaceLayout} from './src/scripts/atlas-latin-workspace-layout';import {initRegionalForestry} from './src/scripts/atlas-regional-forestry';initLatinWorkspaceLayout();initRegionalForestry();",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife'})).outputFiles[0].text;
function page(section,query='',interactive=false){
 const w=new Window({url:`https://example.com/insight-journal/atlas/latin-america/agriculture/${section==='forestry'?'forestry/':''}${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:interactive,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write(readFileSync(`dist/atlas/latin-america/agriculture/${section==='forestry'?'forestry/':''}index.html`,'utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));if(interactive)w.eval(code);return w;
}
const labels=nav=>[...nav.children].map(el=>el.textContent.trim());
test('Latin forestry and farming share one region frame, category band, news rail and reading grid before hydration',async()=>{
 const a=page('agriculture'),f=page('forestry');try{
  for(const w of [a,f]){const d=w.document,root=d.querySelector('[data-latin-workspace]');assert.equal(d.querySelectorAll('.atlas-desktop-shell').length,1);assert.equal(d.querySelectorAll('main').length,1);assert.equal(root.dataset.latinField,'agriculture');assert.deepEqual(labels(d.querySelector('.latin-fields')),['概要','農林業','自然環境','主要産業','人口']);assert.equal(d.querySelector('.latin-fields [aria-current]').textContent,'農林業');assert.deepEqual(labels(d.querySelector('.latin-agriculture-subfields')),['農畜産','林業']);assert.ok(root.querySelector('.latin-primary-grid>.latin-map-column>.latin-items>.latin-agriculture-subfields'));assert.ok(root.querySelector('.latin-primary-grid>.latin-reading>.latin-reading-fixed'));assert.equal(d.querySelectorAll('.forest-fields,.forest-subfields').length,0);}
  assert.equal(a.document.querySelector('.atlas-news').outerHTML,f.document.querySelector('.atlas-news').outerHTML);
  assert.equal(a.document.querySelector('.latin-fields').outerHTML,f.document.querySelector('.latin-fields').outerHTML);
  assert.equal(a.document.querySelector('.latin-navigation').outerHTML,f.document.querySelector('.latin-navigation').outerHTML);
  assert.equal(f.document.querySelector('.latin-agriculture-subfields [aria-current]').textContent,'林業');assert.equal(a.document.querySelector('.latin-agriculture-subfields [aria-pressed=true]').textContent,'農畜産');
 }finally{await a.happyDOM.close();await f.happyDOM.close();}
});
test('direct forestry URL and popstate retain forestry activation, selected reading, and return country/scope',async()=>{
 const query='?place=CRI&scope=country&only=1&fallback=1';const w=page('forestry',query,true);try{
  await w.happyDOM.waitUntilComplete();const d=w.document,root=d.querySelector('[data-latin-workspace]');assert.equal(root.dataset.latinActiveSection,'forestry');assert.equal(root.classList.contains('has-unavailable-section'),false);
  const returnLink=root.querySelector('[data-latin-agriculture-link=agriculture]');const url=new URL(returnLink.href);assert.equal(url.pathname,'/insight-journal/atlas/latin-america/agriculture/');for(const [key,value] of new URLSearchParams(query))assert.equal(url.searchParams.get(key),value);
  const config=JSON.parse(d.querySelector('[data-forest-config]').textContent),id=config.reading.examples[0].id;
  w.history.replaceState(null,'',query+'&example='+id);w.dispatchEvent(new w.PopStateEvent('popstate'));await w.happyDOM.waitUntilComplete();assert.equal(d.querySelector('[data-forest-reading-title]').textContent,config.reading.examples[0].title);assert.equal(root.querySelector('[data-latin-agriculture-link=forestry]').getAttribute('aria-current'),'page');
  w.history.replaceState(null,'',query);w.dispatchEvent(new w.PopStateEvent('popstate'));await w.happyDOM.waitUntilComplete();assert.equal(d.querySelector('[data-forest-clear]').hidden,true);assert.equal(root.dataset.latinActiveSection,'forestry');
 }finally{await w.happyDOM.close();}
});
