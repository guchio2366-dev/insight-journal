import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

const fields=['agriculture','nature','industry','population'];
const labels=['概要','農林業','自然環境','主要産業','人口'];
for(const field of fields){
 test(`Mexico ${field} retains the shared U.S. navigation, map and reading topology`,async()=>{
  const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
  try{
   const html=await readFile(`dist/atlas/north-america/mexico/${field}/index.html`,'utf8');
   window.document.write(html.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
   const root=window.document.querySelector('[data-mexico-workspace]');
   assert.ok(root.classList.contains('atlas-explorer'));
   assert.equal(root.hasAttribute('data-atlas-explorer'),false,'Mexico must retain its own controller');
   const tabs=[...root.querySelectorAll('.atlas-tabs.atlas-tabs-with-overview>a')];
   assert.deepEqual(tabs.map(tab=>tab.textContent.trim()),labels);
   assert.equal(tabs.filter(tab=>tab.getAttribute('aria-current')==='page').length,1);
   assert.ok(tabs[0].getAttribute('href').includes('country=MEX'));
   assert.ok(tabs.find(tab=>tab.getAttribute('aria-current')==='page').getAttribute('href').includes(`/mexico/${field}/`));
   const workspace=root.querySelector('.mexico-learning-workspace');
   const grid=workspace.querySelector('.atlas-primary-grid');
   assert.ok(grid.querySelector(':scope>.atlas-map-column'));
   if(field==='agriculture'){
    assert.ok(grid.querySelector(':scope>[data-field-national="agriculture"] .atlas-national'));
    assert.ok(grid.querySelector('.atlas-map-frame [data-mexico-map]'));
    assert.ok(grid.querySelector('.atlas-key [data-forestry-select]'));
    assert.equal(grid.querySelector('.atlas-national h2').textContent.trim(),'メキシコの農林業');
    assert.ok(grid.querySelector('[data-agri-reading-content]').textContent.trim().length>100);
   }else{
    assert.ok(grid.querySelector(':scope>.atlas-national.mexico-reading'));
    assert.ok(grid.querySelector('.atlas-map-frame.mexico-map-frame [data-mexico-map]'));
    assert.ok(grid.querySelector('.atlas-key.mexico-items'));
    assert.ok(grid.querySelector('.mexico-reading h1').textContent.trim());
    assert.ok(grid.querySelector('.mexico-reading-content').textContent.trim().length>100);
   }
   assert.equal(root.querySelector('.mexico-statistics').parentElement,root,'Statistics follow the complete learning workspace');
   assert.equal(root.querySelector('.mexico-sources').parentElement,root);
   assert.equal(root.dataset.mexicoReadingSelected,'false','The country summary is the initial reading entry');
   assert.ok(field==='agriculture'?root.querySelector('[data-agri-reading-panel]').hidden:root.querySelector('[data-mexico-overview-button]').hidden);
   if(field==='industry')assert.equal(root.querySelectorAll('[data-mi-shape]').length,64);
   if(field==='population')assert.equal(root.querySelectorAll('[data-population-state-shape]').length,32);
   if(field==='agriculture')assert.equal(root.querySelectorAll('path[data-agriculture-state-code]').length,32);
   if(field==='nature')assert.equal(root.querySelectorAll('[data-mexico-nature-state]').length,32);
  }finally{await window.happyDOM.close();}
 });
}
