import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const compiled=await build({entryPoints:['src/lib/atlas-agro-statistics.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {agroShare,agroRanking,agroTopicSeries,agroDisposition,renderAgroColumns,renderAgroWorld}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
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

test('an unsupported selected product keeps the reading order with brief gaps and no substitute series',async()=>withDom(window=>{
 const data=dataset({CAN:{name:'カナダ',series:[series([observation(2024,100)],{id:'soybean-production',item:'236'})]}});
 const root=parse(window,renderAgroColumns(data,'CAN','roundwood-production'));
 assert.deepEqual([...root.querySelectorAll('.agro-columns>section')].map(n=>n.dataset.agroStage),['production','use','destinations']);
 assert.equal(root.querySelectorAll('.agro-world-pie,.agro-partner-pie,.agro-band,svg').length,0);
 assert.doesNotMatch(root.textContent,/100 t|米（籾米）/,'another retained crop is not a forest production value');
 assert.equal(root.querySelectorAll('.agro-flow-gap').length,3);
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

test('the quantity flow keeps stockless apparent use distinct from domestic production allocation',async()=>withDom(window=>{
 const base={id:'roundwood-production',label:'丸太',domain:'FO',item:'1861',element:'5516',unit:'m3'};
 const production=series([observation(2024,300)],base);
 const imports=series([observation(2024,100,null)],{...base,id:'roundwood-imports',element:'5616'});
 const exports=series([observation(2024,350,null)],{...base,id:'roundwood-exports',element:'5916'});
 const data=dataset({CHN:{name:'中国',series:[production,imports,exports]}});
 const root=parse(window,renderAgroColumns(data,'CHN',production.id)),use=root.querySelector('[data-agro-stage="use"]');
 assert.deepEqual([...root.querySelectorAll('.agro-columns>section')].map(n=>n.dataset.agroStage),['production','use','destinations']);
 assert.match(use.querySelector('figcaption').textContent,/輸入込み・在庫未調整.*400 m³/);
 const bands=[...use.querySelectorAll('.agro-track span')];
 assert.equal(bands.length,2);
 assert.deepEqual(bands.map(piece=>piece.style.width),['12.5%','87.5%']);
 assert.match(use.textContent,/輸出量：350 m³.*116\.67%/s);
 assert.match(use.textContent,/生産量を国内・輸出へ二分した比率ではありません/);
 assert.equal(use.querySelectorAll('figure').length,1);
 assert.match(use.textContent,/国内見掛消費 50 m³/);
 assert.doesNotMatch(use.textContent,/実消費 50|国産分の国内仕向け 50/,'P + I - X is not a measured domestic-harvest use');
 assert.equal(agroDisposition(data,'CHN',production,2023).apparent,null,'never substitute another year');
 imports.rows[0].value=null;
 assert.equal(agroDisposition(data,'CHN',production,2024).apparent,null,'a missing import is not zero');
 imports.rows[0].value=0;
 assert.equal(agroDisposition(data,'CHN',production,2024).apparent,null,'a negative balance is not a domestic consumption');
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

test('the retained Chinese soy comparison connects one year and one export denominator across all three stages',async()=>withDom(window=>{
 const data=JSON.parse(readFileSync('public/assets/atlas/regional-production-statistics-v1/statistics.json'));
 const root=parse(window,renderAgroColumns(data,'CHN','soybean-production'));
 assert.equal(root.querySelector('[data-agro-quantity-flow]').dataset.agroQuantityFlow,'2023');
 const production=root.querySelector('[data-agro-stage="production"]'),use=root.querySelector('[data-agro-stage="use"]'),destinations=root.querySelector('[data-agro-stage="destinations"]');
 assert.match(production.textContent,/2023暦年.*20,841,700 t/s);
 assert.match(production.textContent,/370,876,094\.01 t/);
 assert.match(use.textContent,/輸出量 71,398\.1 t.*0\.34%/s);
 assert.match(use.textContent,/国内見掛消費 108,157,901\.9 t/);
 assert.match(use.textContent,/実消費・国産分の国内仕向けではありません/);
 assert.match(destinations.textContent,/71,398\.1 t/);
 assert.match(destinations.textContent,/Korea, Rep\..*40,404 t.*56\.59%/s);
 assert.match(destinations.textContent,/Japan.*16,511\.8 t/);
 assert.equal(destinations.querySelectorAll('tbody tr').length,42);
 assert.match(destinations.textContent,/0\.015 t/);
 assert.equal(destinations.querySelector('[data-agro-partner-gap]'),null);
 assert.equal(destinations.querySelector('[data-agro-existing-trade]'),null,'different-year money does not appear inside this quantity flow');
 const mismatched=structuredClone(data);mismatched.countries.CHN.series.find(s=>s.id==='soybean-production').rows.find(r=>r.year===2023).value++;
 assert.throws(()=>renderAgroColumns(mismatched,'CHN','soybean-production'),/版が一致しません/,'an inconsistent revision cannot silently join the chain');
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

test('ready selections preserve opened references while year, country and explicit product changes still render',async()=>withDom(async window=>{
 const h=await harness(window),rice=series([observation(2023,20),observation(2024,30)]),maize=series([observation(2023,40),observation(2024,50)],{id:'maize-production',item:'56',label:'トウモロコシ'});
 globalThis.fetch=async url=>new Response(JSON.stringify(dataset({CHN:{name:'中国',series:[url.endsWith('maize.json')?maize:rice]},IDN:{name:'インドネシア',series:[url.endsWith('maize.json')?maize:rice]}})));
 const waitReady=()=>settled(()=>h.host.dataset.agroReady==='true'&&h.content.querySelector('[data-agro-series]'),'changed source selection did not settle');
 h.sync({country:'IDN',topic:'rice',active:true,year:2024});await waitReady();
 const readyNode=h.content.firstElementChild,definitions=h.content.querySelector('.agro-definitions');definitions.open=true;
 for(const next of [{country:'IDN',topic:'rice',active:true},{country:'IDN',topic:'rice',year:2024},{country:'IDN',topic:'rice',active:true,year:2024}]){
  h.sync(next);assert.equal(h.content.firstElementChild,readyNode,'same effective selection must not clear ready figures');assert.equal(h.host.dataset.agroReady,'true');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.content.firstElementChild,readyNode);assert.equal(definitions.open,true,'late native synchronization keeps disclosure state');
 }
 h.sync({country:'IDN',topic:'rice',active:true,year:2023});assert.equal(h.content.childElementCount,0,'changing the effective year still clears stale content');await waitReady();assert.notEqual(h.content.firstElementChild,readyNode);assert.match(h.content.textContent,/2023/);
 h.sync({country:'CHN',topic:'rice',active:true,year:2023});await waitReady();assert.equal(h.content.querySelector('[data-agro-country]').dataset.agroCountry,'CHN');
 h.sync({country:'IDN',topic:'overview',active:true,year:2024});await waitReady();
 h.select.value='maize-production';h.select.dispatchEvent(new window.Event('change'));assert.equal(h.content.childElementCount,0,'an explicitly changed product must not be deduplicated');await waitReady();assert.equal(h.content.querySelector('[data-agro-series]').dataset.agroSeries,'maize-production');
 const chosenNode=h.content.firstElementChild;h.sync({country:'IDN',topic:'overview',active:true,year:2024});await new Promise(resolve=>setImmediate(resolve));assert.equal(h.content.firstElementChild,chosenNode,'the selected product remains stable once rendered');
 h.sync({country:'IDN',topic:'overview',active:false,year:2024});assert.equal(h.host.hidden,true);assert.equal(h.content.childElementCount,0);
 h.sync({country:'IDN',topic:'overview',active:true,year:2024});await waitReady();assert.equal(h.host.hidden,false);assert.equal(h.content.querySelector('[data-agro-series]').dataset.agroSeries,'maize-production');
}));

test('late native sources refresh only references and preserve ready primary figures and disclosure state',async()=>withDom(async window=>{
 const h=await harness(window),rice=series([observation(2024,30)]);window.document.body.append(h.root);
 globalThis.fetch=async()=>new Response(JSON.stringify(single(rice)));
 const selection={country:'CHN',topic:'rice',active:true};h.sync(selection);
 await settled(()=>h.host.dataset.agroReady==='true','primary rice did not settle');
 const primary=h.content.querySelector('[data-agro-stage="production"]'),definitions=h.content.querySelector('.agro-definitions'),trade=h.content.querySelector('[data-agro-existing-trade]'),outer=trade.closest('details');
 definitions.open=true;outer.open=true;assert.equal(outer.hidden,true,'empty reference disclosure remains attached and hidden');
 const native=document.createElement('section');native.dataset.eastFarmFoundations='';window.document.body.append(native);
 h.sync(selection);h.sync(selection);
 await settled(()=>trade.querySelector('.east-pie'),'late native source did not populate the retained reference marker');
 assert.equal(h.content.querySelector('[data-agro-stage="production"]'),primary);assert.equal(definitions.open,true);assert.equal(trade.closest('details'),outer);assert.equal(outer.open,true);assert.equal(outer.hidden,false);
 const inner=trade.querySelector('details');inner.open=true;const partnerCard=trade.querySelector('.east-trade-card');
 h.sync(selection);await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(trade.querySelector('.east-trade-card'),partnerCard,'identical source markup must not be replaced merely because a nested disclosure is open');assert.equal(inner.open,true);
 const obsolete=document.createElement('p');obsolete.textContent='obsolete reference-only content';trade.append(obsolete);h.sync(selection);
 await settled(()=>!trade.textContent.includes('obsolete reference-only content'),'changed references did not refresh');
 assert.equal(trade.querySelector('details').open,true,'changed reference content keeps the matching nested disclosure state');assert.equal(outer.open,true);assert.equal(h.content.querySelector('[data-agro-stage="production"]'),primary);
 const originalQuery=document.querySelector.bind(document);let referenceFailure=true;
 document.querySelector=selector=>{if(referenceFailure&&selector==='[data-east-farm-foundations]')throw Error('Test: optional native source temporarily unavailable');return originalQuery(selector);};
 h.sync(selection);await settled(()=>!h.retry.hidden,'reference failure did not offer retry');assert.match(h.status.textContent,/主統計は表示済み.*参考資料.*失敗/);assert.equal(h.content.querySelector('[data-agro-stage="production"]'),primary);assert.equal(trade.closest('details').open,true);
 referenceFailure=false;h.retry.click();await settled(()=>h.retry.hidden,'reference retry did not recover');assert.doesNotMatch(h.status.textContent,/失敗/);assert.equal(h.content.querySelector('[data-agro-stage="production"]'),primary);document.querySelector=originalQuery;
 h.sync(selection);h.sync({country:'JPN',topic:'rice',active:true});await new Promise(resolve=>setImmediate(resolve));assert.equal(h.host.hidden,true);assert.equal(h.content.childElementCount,0,'a late reference refresh cannot repopulate a different selection');
}));

test('an unretained product keeps its supplied reference visible even when native reference markers are empty',async()=>withDom(async window=>{
 const h=await harness(window,{files:{},reference:{label:'Existing source reference',value:7,unit:'t',year:2022,sourceUrl:'https://example.test/source',definition:'Retained reference definition.'}});
 globalThis.fetch=()=>assert.fail('an unretained product must not fetch a substitute');h.sync({country:'IDN',topic:'temf',active:true});
 await settled(()=>h.host.dataset.agroReady==='true','unretained selected product did not settle');
 const reference=h.content.querySelector('[data-agro-existing-supply]').closest('details');assert.equal(reference.hidden,false);assert.match(reference.textContent,/Existing source reference.*7 t/s);assert.match(reference.textContent,/Retained reference definition/);
}));

test('a regional source link opens its disclosures and scrolls without changing the app URL or selection',async()=>withDom(async window=>{
 window.happyDOM.setURL('https://example.test/atlas/example/agriculture/?country=IDN&topic=rice&year=2024');
 const h=await harness(window),rice=series([observation(2024,30)]);document.body.append(h.root);
 globalThis.fetch=async()=>new Response(JSON.stringify(dataset({IDN:{name:'インドネシア',series:[rice]}})));
 h.sync({country:'IDN',topic:'rice',active:true,year:2024});await settled(()=>h.host.dataset.agroReady==='true','primary source selection did not settle');
 const primary=h.content.querySelector('[data-agro-stage="production"]'),beforeUrl=window.location.href,beforeHistory=window.history.length;
 const outer=document.createElement('details');outer.className='agro-existing-regional-reference';outer.innerHTML='<summary>別年・範囲の参考</summary><details><summary>原表の説明</summary><section id="agro-reference-west-wheat">Regional source reference</section></details>';document.body.append(outer);
 const inner=outer.querySelector('details'),target=outer.querySelector('section');let scrollCalls=0;target.scrollIntoView=options=>{scrollCalls++;assert.equal(options.block,'nearest');};
 const link=document.createElement('a');link.href='#agro-reference-west-wheat';link.dataset.agroReferenceLink='';link.textContent='地域の原表を読む';h.content.append(link);
 const click=new window.MouseEvent('click',{bubbles:true,cancelable:true,button:0});link.dispatchEvent(click);
 assert.equal(click.defaultPrevented,true,'an in-page source disclosure must not trigger hash navigation and native route rendering');assert.equal(outer.open,true);assert.equal(inner.open,true);assert.equal(scrollCalls,1);assert.equal(window.location.href,beforeUrl);assert.equal(window.history.length,beforeHistory);assert.equal(h.content.querySelector('[data-agro-stage="production"]'),primary);assert.equal(h.content.querySelector('[data-agro-country]').dataset.agroCountry,'IDN');assert.equal(link.getAttribute('href'),'#agro-reference-west-wheat','the target URL remains available for copying or modified clicks');
 outer.open=false;inner.open=false;const modified=new window.MouseEvent('click',{bubbles:true,cancelable:true,button:0,ctrlKey:true});link.dispatchEvent(modified);assert.equal(modified.defaultPrevented,false);assert.equal(outer.open,false);assert.equal(inner.open,false);assert.equal(scrollCalls,1,'modified clicks retain browser link behavior');
}));

test('optional statistics without embedded configuration cannot interrupt an atlas reader',async()=>{
 await withDom(async window=>{
  const h=await harness(window);h.host.querySelector('[data-agro-config]').remove();
  const map=window.document.createElement('p');map.textContent='既存の地図・凡例';h.root.append(map);
  globalThis.fetch=()=>{assert.fail('a reader without statistics configuration must not request data');};
  assert.doesNotThrow(()=>h.sync({country:'CHN',topic:'rice',active:true}));
  assert.equal(h.host.hidden,true);assert.equal(map.textContent,'既存の地図・凡例');
 });
});
