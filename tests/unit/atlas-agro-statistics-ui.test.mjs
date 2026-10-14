import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const compiled=await build({entryPoints:['src/lib/atlas-agro-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {agroShare,agroRanking,agroTopicSeries,renderAgroColumns,renderAgroWorld}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const controller=await build({entryPoints:['src/scripts/atlas-agro-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
let controllerId=0;

// Arithmetic fixtures exist only in this test; none are published statistics.
const observation=(year,value,worldValue=1000)=>({year,value,rawValue:value===null?null:String(value),flag:value===null?'M':'A',worldValue,worldFlag:worldValue===null?null:'A',share:null});
const series=(rows,overrides={})=>({id:'rice-production',label:'米（籾米）',domain:'QCL',item:'27',element:'5510',unit:'t',definition:'テストの籾米原量。精米と足さない。',sourceUrl:'https://example.test/fao',rows,...overrides});
const dataset=countries=>({countries,sources:[],method:'テストfixture。別年・別品目で補完しない。'});
const single=product=>dataset({CHN:{name:'中国本土',series:[product]}});
async function withDom(run){
 const window=new Window(),previousDocument=globalThis.document,previousFetch=globalThis.fetch;
 globalThis.document=window.document;
 try{return await run(window);}finally{globalThis.document=previousDocument;globalThis.fetch=previousFetch;await window.happyDOM.close();}
}
const parse=(window,html)=>{const root=window.document.createElement('main');root.innerHTML=html;return root;};
async function settled(predicate,message){
 for(let i=0;i<80;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}
 assert.fail(message);
}
async function harness(window,overrides={}){
 const root=window.document.createElement('main');
 root.innerHTML='<section data-agro-statistics><script type="application/json" data-agro-config></script><h2 data-agro-heading></h2><p data-agro-status></p><label data-agro-country-control><select data-agro-country-select><option value="CHN">中国</option><option value="IDN">インドネシア</option></select></label><label data-agro-series-control><select data-agro-series-select></select></label><button data-agro-retry hidden></button><div data-agro-content></div></section>';
 const config={scope:'東アジア',country:'',topic:'rice',topics:['rice','maize'],countries:[{code:'CHN',name:'中国'},{code:'IDN',name:'インドネシア'}],nationalOnly:true,url:'/fixture/',files:{'rice-production':{file:'rice.json'},'maize-production':{file:'maize.json'},'soybean-production':{file:'soybean.json'}},labels:{'rice-production':'米','maize-production':'トウモロコシ','soybean-production':'大豆'},...overrides};
 root.querySelector('[data-agro-config]').textContent=JSON.stringify(config);
 // Fresh module state isolates the request cache between controller scenarios.
 const code=controller.outputFiles[0].text+'\n// fixture instance '+(++controllerId);
 const api=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 return {root,host:root.firstElementChild,content:root.querySelector('[data-agro-content]'),status:root.querySelector('[data-agro-status]'),retry:root.querySelector('[data-agro-retry]'),select:root.querySelector('[data-agro-series-select]'),sync:selection=>api.syncAgroStatistics(root,selection)};
}

test('a missing year remains missing while a published zero retains its zero share',async()=>withDom(window=>{
 const missing=series([observation(2023,77),observation(2024,null)]);
 const root=parse(window,renderAgroColumns(single(missing),'CHN',missing.id,2024));
 const left=root.querySelector('.agro-columns>section');
 assert.match(left.textContent,/2024暦年/);
 assert.match(left.textContent,/国内生産：未収録/);
 assert.doesNotMatch(left.textContent,/77/,'the previous year must not substitute for 2024');
 assert.equal(root.querySelector('.agro-world-pie'),null);
 assert.equal(agroShare(missing.rows[1]),null);
 const zero=series([observation(2024,0)]),zeroRoot=parse(window,renderAgroColumns(single(zero),'CHN',zero.id));
 assert.equal(agroShare(zero.rows[0]),0);
 assert.match(zeroRoot.querySelector('.agro-world-pie').textContent,/0%/);
 assert.match(zeroRoot.querySelector('.agro-columns>section').textContent,/国内生産：0 t/);
}));

test('a null World denominator never yields a ratio or world pie',async()=>withDom(window=>{
 const product=series([observation(2024,125,null)]);
 assert.equal(agroShare(product.rows[0]),null);
 const root=parse(window,renderAgroWorld(single(product),'CHN',product));
 assert.equal(root.querySelector('.agro-world-pie'),null);
 assert.equal(root.querySelector('.agro-trend'),null);
 assert.match(root.textContent,/世界分母は未収録/);
 assert.doesNotMatch(root.textContent,/NaN|Infinity/);
}));

test('equal production shares a rank and an appended selected country keeps its true rank',async()=>withDom(window=>{
 const countries=Object.fromEntries([100,100,90,80,70,60,50,40].map((value,index)=>['C'+index,{name:'対象'+index,series:[series([observation(2024,value)])]}]));
 // A differently defined observation must not enter the matching ranking.
 countries.BAD={name:'単位違い',series:[series([observation(2024,999)],{unit:'1000 t'})]};
 const data=dataset(countries),product=countries.C7.series[0],ranks=agroRanking(data,product,2024);
 assert.deepEqual(ranks.map(row=>row.rank),[1,1,3,4,5,6,7,8]);
 const root=parse(window,renderAgroWorld(data,'C7',product));
 const rows=[...root.querySelectorAll('.agro-ranking tbody tr')];
 assert.equal(rows.length,6,'show top five plus the selected country');
 assert.match(rows[5].textContent,/8\. 対象7/);
 assert.doesNotMatch(rows[5].textContent,/6\. 対象7/);
 assert.doesNotMatch(root.textContent,/単位違い/);
 assert.match(root.textContent,/全世界の網羅順位ではありません/);
}));

test('forestry bands include production and imports without fabricating domestic use from exports',async()=>withDom(window=>{
 const base={id:'roundwood-production',label:'丸太',domain:'FO',item:'1861',element:'5516',unit:'m3'};
 const production=series([observation(2024,300)],base);
 const imports=series([observation(2024,100,null)],{...base,id:'roundwood-imports',element:'5616'});
 const exports=series([observation(2024,350,null)],{...base,id:'roundwood-exports',element:'5916'});
 const data=dataset({CHN:{name:'中国',series:[production,imports,exports]}});
 const root=parse(window,renderAgroColumns(data,'CHN',production.id)),left=root.querySelector('.agro-columns>section');
 assert.match(left.querySelector('figcaption').textContent,/供給元（在庫を含まない） · 400 m³/);
 const bands=[...left.querySelectorAll('.agro-track span')];
 assert.equal(bands.length,2);
 assert.deepEqual(bands.map(piece=>piece.style.width),['75%','25%']);
 assert.match(left.textContent,/公表輸出：350 m³/);
 assert.match(left.textContent,/国内仕向けの帯や実消費は算出しません/);
 assert.equal(left.querySelectorAll('figure').length,1);
 assert.doesNotMatch(left.textContent,/国内消費.*50|国内仕向け.*50/,'P + I - X is not a measured end use');
}));

test('trend lines break at both explicit missing observations and absent calendar years',async()=>withDom(window=>{
 for(const middle of [[observation(2022,null)],[]]){
  const product=series([observation(2020,10),observation(2021,20),...middle,observation(2023,30),observation(2024,40)]);
  const root=parse(window,renderAgroWorld(single(product),'CHN',product)),paths=[...root.querySelectorAll('.agro-trend polyline')];
  assert.equal(paths.length,2);
  assert.deepEqual(paths.map(path=>path.getAttribute('points').trim().split(/\s+/).length),[2,2]);
  assert.equal(root.querySelectorAll('.agro-trend circle').length,4);
  assert.doesNotMatch(root.querySelector('.agro-trend').textContent,/2022年/);
 }
}));

test('existing Latin and Asia topic aliases resolve to their retained product files',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/atlas/regional-production-statistics-v1/manifest.json'));
 const cases={soyb:'soybean-production',maiz:'maize-production',whea:'wheat-production',sugc:'qcl-156-production',coff:'coffee-production',cott:'qcl-328-production',bana:'banana-production',pota:'potato-production',cotton:'qcl-328-production',oilpalm:'qcl-254-production',rubber:'qcl-836-production',sugarcane:'qcl-156-production',chickpea:'qcl-191-production',lentil:'qcl-201-production',pearlmillet:'qcl-79-production',buffalo:'buffalo-milk'};
 for(const [topic,id] of Object.entries(cases)){assert.deepEqual(agroTopicSeries(topic),[id],topic);assert.ok(manifest.files[id],topic+' must have a retained product packet');}
 assert.deepEqual(agroTopicSeries('cattle'),['cattle-meat','cattle-milk']);
 assert.deepEqual(agroTopicSeries('forest'),['roundwood-production','sawnwood-production']);
 assert.deepEqual(agroTopicSeries('temf'),['temf-production'],'mixed temperate fruit must not be relabelled as one retained fruit');
});

test('late requests keep the latest country and cannot restore content after selecting Japan',async()=>withDom(async window=>{
 const h=await harness(window),pending=[];
 globalThis.fetch=url=>new Promise(resolve=>pending.push({url,resolve}));
 const rice=series([observation(2024,100)]),data=dataset({CHN:{name:'中国',series:[rice]},IDN:{name:'インドネシア',series:[rice]}});
 h.sync({country:'CHN',topic:'rice',active:true});
 h.sync({country:'IDN',topic:'rice',active:true});
 assert.equal(h.content.childElementCount,0,'old national content clears while waiting');
 assert.equal(pending.length,1,'matching product requests share the pending fetch');
 pending[0].resolve(new Response(JSON.stringify(data)));
 await settled(()=>h.content.querySelector('[data-agro-country]'),'latest national selection did not render');
 assert.equal(h.content.querySelector('[data-agro-country]').dataset.agroCountry,'IDN');
 h.sync({country:'CHN',topic:'maize',active:true});
 h.sync({country:'JPN',topic:'maize',active:true});
 assert.equal(pending.length,2,'Japan must not start a separate request');
 const maize=series([observation(2024,50)],{id:'maize-production',item:'56',label:'トウモロコシ'});
 pending[1].resolve(new Response(JSON.stringify(single(maize))));
 await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.host.hidden,true);
 assert.equal(h.content.childElementCount,0,'a late fetch must not restore Japan content');
}));

test('retry drops a failed request and keeps the selected country and product',async()=>withDom(async window=>{
 const h=await harness(window),rice=series([observation(2024,10)]),data=dataset({IDN:{name:'インドネシア',series:[rice]}});let attempts=0;
 globalThis.fetch=async()=>++attempts===1?new Response('',{status:503}):new Response(JSON.stringify(data));
 h.sync({country:'IDN',topic:'rice',active:true});
 await settled(()=>!h.retry.hidden,'failed request did not offer retry');
 assert.match(h.status.textContent,/統計を取得できませんでした/);
 h.retry.click();
 await settled(()=>h.content.querySelector('[data-agro-country]'),'retry did not render the retained selection');
 assert.equal(attempts,2);
 assert.equal(h.retry.hidden,true);
 assert.equal(h.content.querySelector('[data-agro-country]').dataset.agroCountry,'IDN');
 assert.equal(h.content.querySelector('[data-agro-series]').dataset.agroSeries,'rice-production');
}));

test('overview product controls offer only existing page topics and fetch one selected product',async()=>withDom(async window=>{
 const h=await harness(window),requested=[];
 globalThis.fetch=async url=>{requested.push(url);const maize=url.endsWith('maize.json');const product=series([observation(2024,maize?80:30)],maize?{id:'maize-production',item:'56',label:'トウモロコシ'}:{});return new Response(JSON.stringify(single(product)));};
 h.sync({country:'CHN',topic:'overview',active:true});
 await settled(()=>h.content.querySelector('[data-agro-series]'),'overview did not render');
 assert.deepEqual([...h.select.options].map(option=>option.value),['rice-production','maize-production']);
 assert.deepEqual(requested,['/fixture/rice.json'],'do not download every retained world product for an overview');
 assert.equal(h.root.querySelector('[data-agro-series-control]').hidden,false);
 h.select.value='maize-production';h.select.dispatchEvent(new window.Event('change'));
 await settled(()=>h.content.querySelector('[data-agro-series]')?.dataset.agroSeries==='maize-production','overview product switch did not render');
 assert.deepEqual(requested,['/fixture/rice.json','/fixture/maize.json']);
 assert.equal([...h.select.options].some(option=>option.value==='soybean-production'),false,'an unrelated retained product must not enlarge page scope');
}));
