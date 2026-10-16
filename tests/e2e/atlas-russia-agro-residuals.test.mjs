import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
const compiled=await build({entryPoints:['src/scripts/atlas-russia-learning.ts'],bundle:true,platform:'browser',format:'iife',globalName:'RussiaAgroPage',write:false,define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}});
const html=readFileSync('dist/atlas/russia/agriculture/index.html','utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
after(()=>stop());
async function page(query,run){
 const window=new Window({url:'https://example.test/insight-journal/atlas/russia/agriculture/'+query,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.TextDecoder=TextDecoder;window.ResizeObserver=class{observe(){} disconnect(){}};
 const requests=[];
 window.fetch=async input=>{const url=new URL(String(input),window.location.href),relative=url.pathname.replace(/^\/insight-journal\//,'');assert(relative.startsWith('assets/atlas/'));assert(!relative.includes('..'));requests.push(relative);let bytes=readFileSync('dist/'+relative);if(bytes[0]===0x1f&&bytes[1]===0x8b)bytes=gunzipSync(bytes);return new window.Response(bytes);};
 window.document.body.innerHTML=html;window.eval(compiled.outputFiles[0].text+';RussiaAgroPage.initRussiaLearningAtlas(document.querySelector("[data-russia-learning]"));');
 const root=window.document.querySelector('[data-russia-learning]'),host=root.querySelector('[data-agro-statistics]');
 const settle=async predicate=>{for(let n=0;n<180;n++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}assert.fail(host.querySelector('[data-agro-status]').textContent);};
 const ready=()=>host.dataset.agroReady==='true';
 try{await run({window,root,host,requests,settle,ready});}finally{await window.happyDOM.close();}
}

test('the built Russia page wires explicit years to the shared columns without changing the map or unselected references',async()=>page('',async({window,root,host,requests,settle,ready})=>{
 await settle(ready);
 const control=root.querySelector('[data-russia-agro-year-control]'),year=root.querySelector('[data-russia-agro-year]'),layer=root.querySelector('[data-layer]');
 const native=root.querySelector('.russia-farming-trade-grid');assert.equal(control.hidden,true);assert(!native.closest('[data-russia-agro-reference]'));
 layer.value='wheat';layer.dispatchEvent(new window.Event('change',{bubbles:true}));await settle(()=>ready()&&host.querySelector('[data-russia-wheat-supply]'));
 assert.equal(control.hidden,false);assert.equal(host.querySelector('[data-agro-stage="production"] .agro-world-pie'),null);
 const map=root.querySelector('[data-primary-map]').innerHTML,count=requests.length;
 year.value='2022';year.dispatchEvent(new window.Event('change',{bubbles:true}));await settle(()=>ready()&&host.querySelector('[data-agro-stage="production"]').textContent.includes('2022暦年'));
 assert.match(host.querySelector('[data-agro-stage="production"]').textContent,/104,233,944/);assert(host.querySelector('[data-agro-stage="production"] .agro-world-pie'));
 assert.equal(root.querySelector('[data-primary-map]').innerHTML,map);assert.equal(requests.length,count);
 const supply=host.querySelector('[data-russia-wheat-supply]');assert.match(supply.textContent,/2020\/21販売年度/);assert.equal(supply.closest('.agro-other-reference').open,false);
 layer.value='farming-all';layer.dispatchEvent(new window.Event('change',{bubbles:true}));await settle(ready);
 assert.equal(control.hidden,true);assert.equal(root.querySelector('.russia-farming-trade-grid'),native);assert(!native.closest('[data-russia-agro-reference]'));assert.equal(host.querySelector('[data-russia-wheat-supply]'),null);
}));

test('a direct cattle/year URL restores the year and separate milk series, with no wheat supply attached',async()=>page('?layer=cattle&russiaStatsYear=2022',async({window,root,host,settle,ready})=>{
 await settle(()=>ready()&&host.querySelector('[data-agro-series="cattle-meat"]'));
 assert.equal(root.querySelector('[data-russia-agro-year]').value,'2022');assert.equal(host.querySelector('[data-russia-wheat-supply]'),null);
 const select=host.querySelector('[data-agro-series-select]');select.value='cattle-milk';select.dispatchEvent(new window.Event('change',{bubbles:true}));
 await settle(()=>ready()&&host.querySelector('[data-agro-series="cattle-milk"]'));
 assert.match(host.querySelector('[data-agro-stage="production"]').textContent,/2022暦年.*32,738,522/s);assert.equal(host.querySelector('[data-russia-wheat-supply]'),null);
 assert.match(window.location.search,/layer=cattle/);assert.match(window.location.search,/russiaStatsYear=2022/);
}));
