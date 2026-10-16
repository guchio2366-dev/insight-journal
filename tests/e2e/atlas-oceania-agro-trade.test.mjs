import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const bundle=async(file,name)=>(await build({entryPoints:[file],bundle:true,write:false,format:'iife',globalName:name,platform:'browser',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}})).outputFiles[0].text;
const farm=await bundle('src/scripts/atlas-oceania-learning.ts','Farm');
const forest=await bundle('src/scripts/atlas-regional-forestry.ts','Forest');
const trade=await bundle('src/scripts/atlas-oceania-agro-trade.ts','Trade');
function page(path,query=''){
 const w=new Window({url:'https://example.test/insight-journal/atlas/oceania/'+path+'/'+query,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write(readFileSync(`dist/atlas/oceania/${path}/index.html`,'utf8'));
 w.ResizeObserver=class{observe(){}disconnect(){}};
 w.TextDecoder=TextDecoder;w.Response=Response;
 // Serve the real retained payload as JSON; gzip transport has separate shared tests.
 w.fetch=async url=>{
  const pathname=new URL(String(url),w.location.href).pathname.replace('/insight-journal/','');
  if(pathname.endsWith('.json.gz')){
   const {gunzipSync}=await import('node:zlib');return new Response(gunzipSync(readFileSync('dist/'+pathname)));
  }
  return new Response(readFileSync('dist/'+pathname));
 };
 return w;
}
const change=(w,selector,value)=>{const e=w.document.querySelector(selector);e.value=value;e.dispatchEvent(new w.Event('change'));};
async function ready(w){for(let i=0;i<100;i++){await new Promise(resolve=>setImmediate(resolve));await w.happyDOM.waitUntilComplete();if(w.document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true')return;}assert.fail('shared national statistics did not settle');}

test('built Oceania agriculture preserves the default, then attaches true quantities to the current national product',async()=>{
 const w=page('agriculture');
 try{
  w.eval(farm+';Farm.initOceaniaLearningAtlas(document.querySelector("[data-oceania-learning]"));');
  assert.equal(w.document.querySelector('[data-agro-statistics]').hidden,true);
  assert.equal(w.document.querySelectorAll('[data-oceania-trade-id]').length,0);
  const initial=w.document.querySelector('[data-export-reading]'),map=w.document.querySelector('[data-primary-map] svg'),frame=map.getAttribute('viewBox');
  change(w,'[data-place]','AUS');change(w,'[data-layer]','wheat');await ready(w);
  assert.match(w.document.querySelector('[data-agro-stage="production"]').textContent,/2024\/25販売年度/);
  assert.ok(w.document.querySelector('[data-oceania-trade-id="AUS-wheat-2024"]'));assert.ok(w.document.querySelector('[data-oceania-trade-id="AUS-nondurum-wheat-2023"]'));
  change(w,'[data-layer]','cattle');await ready(w);
  assert.ok(w.document.querySelector('[data-oceania-trade-id="AUS-beef-2024"]'));
  change(w,'[data-place]','NZL');await ready(w);change(w,'[data-agro-series-select]','cattle-milk');await ready(w);
  assert.ok(w.document.querySelector('[data-oceania-trade-id="NZL-milk-powder-2024"]'));
  assert.equal(w.document.querySelector('[data-oceania-trade-id="AUS-beef-2024"]'),null);
  assert.equal(w.document.querySelector('[data-primary-map] svg').getAttribute('viewBox'),frame);
  change(w,'[data-place]','all');change(w,'[data-layer]','farming-all');await w.happyDOM.waitUntilComplete();
  assert.equal(w.document.querySelector('[data-agro-statistics]').hidden,true);assert.equal(w.document.querySelector('[data-export-reading]'),initial);assert.equal(initial.closest('.agro-existing-regional-reference'),null);
 }finally{await w.happyDOM.close();}
});

test('the built Oceania-specific forestry route retains its map, selects three product stages, and restores the overview',async()=>{
 const html=readFileSync('dist/atlas/oceania/agriculture/forestry/index.html','utf8');
 assert.match(html,/atlas-oceania-agro-trade|initOceaniaForestryTrade|_astro\//);
 const w=page('agriculture/forestry','?example=new-zealand');
 try{
  w.eval(forest+';Forest.initRegionalForestry();');
  const original=w.document.querySelector('[data-agro-content]').firstElementChild;
  const map=w.document.querySelector('[data-forest-map]'),frame=map.getAttribute('viewBox');
  const images=[...map.querySelectorAll('image')].map(e=>e.getAttribute('href'));
  w.eval(trade+';Trade.initOceaniaForestryTrade();');
  assert.ok(w.document.querySelector('[data-oceania-trade-id="NZL-logs-2024"]'));
  for(const [series,id]of [['sawnwood-production','NZL-sawn-2024'],['wood-pulp-production','NZL-pulp-2024']]){
   change(w,'[data-oceania-forest-product] select',series);assert.ok(w.document.querySelector(`[data-oceania-trade-id="${id}"]`));
   assert.equal(map.getAttribute('viewBox'),frame);assert.deepEqual([...map.querySelectorAll('image')].map(e=>e.getAttribute('href')),images);
  }
  w.document.querySelector('[data-forest-overview]').click();await w.happyDOM.waitUntilComplete();
  assert.equal(w.document.querySelector('[data-agro-content]').firstElementChild,original);assert.equal(w.document.querySelector('[data-oceania-forest-product]').hidden,true);
 }finally{await w.happyDOM.close();}
});
