import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

// Exercise the proposed shared hook in memory; the regional branch does not
// modify the shared controller. Works after integration as well as before it.
const sharedPath='src/scripts/atlas-agro-statistics.ts';
const original=readFileSync(sharedPath,'utf8');
const patch=readFileSync('docs/patches/south-asia-agro-controller-20261016.patch','utf8');
function applyProposal(source){
 const hunks=patch.split(/^@@.*@@.*\n/m).slice(1);
 assert.ok(hunks.length>0);
 for(const hunk of hunks){
  const lines=hunk.split('\n').filter(line=>/^[ +\-]/.test(line));
  const before=lines.filter(line=>line[0]!=='+').map(line=>line.slice(1)).join('\n')+'\n';
  const after=lines.filter(line=>line[0]!=='-').map(line=>line.slice(1)).join('\n')+'\n';
  if(source.includes(after))continue;
  assert.ok(source.includes(before),'shared controller changed: rebase the proposal before integration');
  source=source.replace(before,after);
 }
 return source;
}
const proposed=applyProposal(original);
const bundles=await Promise.all([original,proposed].map(contents=>build({entryPoints:[sharedPath],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'regional-integration-fixture',setup(b){b.onLoad({filter:/\/scripts\/atlas-agro-statistics\.ts$/},()=>({contents,loader:'ts'}));}}]})));
after(()=>stop());
const data=JSON.parse(readFileSync('public/assets/atlas/regional-production-statistics-v1/statistics.json'));
const manifest=JSON.parse(readFileSync('public/assets/atlas/regional-production-statistics-v1/manifest.json'));
let instance=0;
async function settled(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}assert.fail('controller did not settle');}
async function fixture(run,{region='south-central-asia',focus='south-asia',integrated=true}={}){
 const window=new Window(),previousDocument=globalThis.document,previousFetch=globalThis.fetch;
 globalThis.document=window.document;
 globalThis.fetch=async()=>new Response(JSON.stringify(data));
 const root=window.document.createElement('main');root.dataset.asiaAtlas='';root.dataset.region=region;root.dataset.focus=focus;
 root.innerHTML='<section data-south-central-farm-connections>既存の地域参考</section><section data-agro-statistics><script type="application/json" data-agro-config></script><h2 data-agro-heading></h2><p data-agro-status></p><label data-agro-country-control><select data-agro-country-select></select></label><label data-agro-series-control><select data-agro-series-select></select></label><button data-agro-retry hidden></button><div data-agro-content></div></section>';
 window.document.body.append(root);
 const config={scope:'南アジア',country:'',topic:'overview',topics:['rice','wheat','cotton','forest'],countries:['IND','PAK','BGD','KAZ'].map(code=>({code,name:data.countries[code].name})),nationalOnly:true,url:'/fixture/',files:manifest.files,labels:{}};
 root.querySelector('[data-agro-config]').textContent=JSON.stringify(config);
 const api=await import('data:text/javascript;base64,'+Buffer.from(bundles[Number(integrated)].outputFiles[0].text+'\n// instance '+(++instance)).toString('base64'));
 const host=root.querySelector('[data-agro-statistics]'),content=host.querySelector('[data-agro-content]');
 const sync=async(country,topic,active=true)=>{api.syncAgroStatistics(root,{country,topic,active});if(active&&(country||topic!=='overview'&&focus==='south-asia'))await settled(()=>host.dataset.agroReady==='true'&&content.querySelector('[data-agro-country]')?.dataset.agroCountry===country);};
 try{return await run({window,root,host,content,sync,api});}
 finally{globalThis.document=previousDocument;globalThis.fetch=previousFetch;await window.happyDOM.close();}
}

test('proposed hook shows rice and cotton, retains the separate basmati reference, and clears old country references',async()=>fixture(async h=>{
 await h.sync('IND','rice');
 assert.equal(h.content.querySelector('[data-south-asia-product-basis]').dataset.southAsiaProductBasis,'rice-milled-production');
 assert.match(h.content.querySelector('[data-agro-existing-trade]').textContent,/5,242,182t/);
 assert.equal(h.content.querySelector('.agro-other-reference').open,false);
 const trade=h.content.querySelector('[data-agro-existing-trade]');
 assert.match(trade.textContent,/2023–24年度/);assert.match(trade.textContent,/16,358,885t/);
 await h.sync('BGD','cotton');
 assert.equal(h.content.querySelector('[data-south-asia-product-basis]').dataset.southAsiaProductBasis,'cotton-lint-production');
 assert.doesNotMatch(h.content.textContent,/バスマティ|5,242,182/);
 await h.sync('PAK','rice');
 assert.match(h.content.textContent,/パキスタン全国/);assert.equal(h.content.querySelector('[data-agro-existing-trade]').textContent,'');assert.doesNotMatch(h.content.textContent,/5,242,182/);
 assert.equal(h.content.querySelector('[data-agro-country]').dataset.agroCountry,'PAK');
}));

test('selected-to-overview restore is identical to the original shared overview; country clear and field change restore nodes',async()=>{
 const baseline=await fixture(async h=>{await h.sync('IND','overview');return h.content.innerHTML;},{integrated:false});
 await fixture(async h=>{
  const retained=h.root.querySelector('[data-south-central-farm-connections]'),parent=retained.parentElement;
  await h.sync('IND','rice');assert.equal(retained.closest('details')?.open,false);
  await h.sync('IND','overview');assert.equal(h.content.innerHTML,baseline);
  assert.equal(retained.parentElement,parent);
  await h.sync('IND','cotton');await h.sync('','cotton');
  assert.equal(h.host.hidden,false);assert.ok(h.content.querySelector('[data-south-asia-regional-production]'));
  await h.sync('','overview');
  assert.equal(h.host.hidden,true);assert.equal(h.content.childElementCount,0);assert.equal(retained.parentElement,parent);
  await h.sync('IND','rice');await h.sync('IND','rice',false);
  assert.equal(h.host.hidden,true);assert.equal(h.content.childElementCount,0);assert.equal(retained.parentElement,parent);
 });
});

test('Central Asia and other region hosts retain their original selected statistics',async()=>{
 for(const [region,country,topic] of [['south-central-asia','KAZ','wheat'],['east-asia','IND','rice']]){
  const baseline=await fixture(async h=>{await h.sync(country,topic);return h.content.innerHTML;},{region,integrated:false});
  const candidate=await fixture(async h=>{await h.sync(country,topic);return h.content.innerHTML;},{region});
  assert.equal(candidate,baseline);
 }
});

test('a late quantity request cannot restore a cleared national selection',async()=>fixture(async h=>{
 let release;
 globalThis.fetch=()=>new Promise(resolve=>{release=resolve;});
 h.api.syncAgroStatistics(h.root,{country:'IND',topic:'rice',active:true});
  h.api.syncAgroStatistics(h.root,{country:'',topic:'overview',active:true});
 assert.equal(h.host.hidden,true);
 release(new Response(JSON.stringify(data)));
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.host.hidden,true);assert.equal(h.content.childElementCount,0);
}));

test('South Asia product-only selection shows regional coverage and forest series can switch without a country proxy',async()=>fixture(async h=>{
 await h.sync('','rice');assert.match(h.content.textContent,/304,373,038/);
 assert.match(h.content.textContent,/7\/8/);assert.equal(h.content.querySelector('[data-south-asia-product-basis]'),null);
 await h.sync('','forest');
 const select=h.host.querySelector('[data-agro-series-select]');
 assert.deepEqual([...select.options].map(o=>o.value),['roundwood-production','sawnwood-production']);
 select.value='sawnwood-production';select.dispatchEvent(new h.window.Event('change'));
 await settled(()=>h.content.querySelector('[data-agro-series]')?.dataset.agroSeries==='sawnwood-production'&&h.host.dataset.agroReady==='true');
 assert.match(h.content.textContent,/26,806,827/);assert.match(h.content.textContent,/対象8か国/);
 assert.equal(h.content.querySelectorAll('[data-agro-existing-trade]').length,0);
}));
