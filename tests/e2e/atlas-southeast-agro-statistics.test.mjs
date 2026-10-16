import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

test('built Southeast page mounts its selected statistics below the map and restores its published overview',async()=>{
 const compiled=await build({entryPoints:['src/scripts/atlas-southeast-agro-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const {initSoutheastAgroStatistics}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),saved={document:globalThis.document,MutationObserver:globalThis.MutationObserver};
 globalThis.document=w.document;globalThis.MutationObserver=w.MutationObserver;
 try{
  w.document.write(readFileSync('dist/atlas/asia/southeast-asia/agriculture/index.html','utf8'));
  const root=w.document.querySelector('.asia-atlas-root[data-region="southeast-asia"]'),map=root.querySelector('.asia-map-frame'),mapHTML=map.outerHTML,overview=root.querySelector('[data-south-central-farm-connections]'),overviewHTML=overview.outerHTML;
  initSoutheastAgroStatistics(root);const host=root.querySelector('[data-southeast-agro-statistics]');assert.ok(host);assert.equal(host.hidden,true);
  root.dataset.southeastFarmTopic='rice';await w.happyDOM.whenAsyncComplete();for(let i=0;i<100&&host.dataset.ready!=='true';i++)await new Promise(r=>setImmediate(r));
  assert.equal(host.hidden,false);assert.equal(host.parentElement,root.querySelector('.asia-layout'));assert.ok(map.compareDocumentPosition(host)&w.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.match(host.textContent,/197,000,960\.13.*報告10\/11/s);assert.equal(host.querySelectorAll('.agro-columns>section').length,3);
  const country=host.querySelector('[data-southeast-agro-country]');country.value='VNM';country.dispatchEvent(new w.Event('change',{bubbles:true}));await w.happyDOM.whenAsyncComplete();
  assert.match(host.textContent,/2024\/25.*26\.85.*22\.3/s);assert.equal(root.querySelector('[data-country-select]').value,'');
  root.dataset.southeastFarmTopic='overview';await w.happyDOM.whenAsyncComplete();assert.equal(host.hidden,true);assert.equal(root.hasAttribute('data-southeast-selected-statistics'),false);
  assert.equal(overview.outerHTML,overviewHTML);assert.equal(map.outerHTML,mapHTML,'no map markup, size or data edits');
  assert.equal(root.querySelectorAll('[data-southeast-agro-statistics]').length,1);initSoutheastAgroStatistics(root);assert.equal(root.querySelectorAll('[data-southeast-agro-statistics]').length,1);
 }finally{Object.assign(globalThis,saved);await w.happyDOM.close();stop();}
});
