import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const read=p=>readFileSync(p,'utf8'),data=JSON.parse(read('public/assets/atlas/latin-agro-quantity-v1/data.json'));
const libBundle=await build({entryPoints:['src/lib/atlas-latin-agro-quantity.ts'],bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(libBundle.outputFiles[0].text).toString('base64'));
const row=code=>data.records.find(r=>r.countryCode===code);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const dom=html=>{const w=new Window();w.document.body.innerHTML=html;return w;};

test('Latin extraction reproduces the official table transcriptions and source fingerprints offline',()=>{
 const before=sha(readFileSync('public/assets/atlas/latin-agro-quantity-v1/data.json'));
 execFileSync('python3',['scripts/prepare-latin-agro-quantity.py'],{stdio:'pipe'});
 assert.equal(sha(readFileSync('public/assets/atlas/latin-agro-quantity-v1/data.json')),before);
 for(const s of data.sources)assert.equal(sha(readFileSync(s.path)),s.sha256,s.path);
 assert.deepEqual(data.records.map(r=>r.countryCode),['ARG','BOL','BRA','PRY','URY']);
 assert.equal(row('ARG').production.value,48213207);
 assert.equal(row('PRY').production.value,11100256);
 assert.equal(row('URY').production.flag,'X');assert.equal(row('URY').production.note,'Unofficial figure');
 for(const r of data.records){assert.equal(r.year,2024);assert.equal(r.unit,'t');assert.equal(r.production.itemCode,'236');assert.equal(r.world.areaCode,'5000');}
});

test('Latin apparent quantity includes gross imports and remains distinct from real consumption and origin allocation',()=>{
 for(const [code,expected] of [['ARG',51648807],['BOL',3014957.413],['PRY',3119523.08]]){
  assert.ok(Math.abs(api.latinApparentUse(row(code))-expected)<1e-7);
  const w=dom(api.renderLatinSoyColumns(row(code),data.method)),main=w.document.querySelector('[data-latin-calendar-flow]');
  assert.deepEqual([...main.children].map(s=>s.dataset.agroStage),['production','use','destinations']);
  const use=main.querySelector('[data-agro-stage="use"]').textContent;
  assert.match(use,/生産＋輸入−輸出/);assert.match(use,/実消費・国産分の国内仕向けではありません/);
  assert.match(use,/飼料・加工・食用・損失・在庫変動は未収録/);assert.match(use,/再輸出/);
  assert.equal(main.querySelectorAll('tbody tr').length,row(code).partners.length);
 }
 assert.equal(api.latinApparentUse({...row('PRY'),imports:null}),null);
 assert.equal(api.latinApparentUse({...row('PRY'),exports:999999999}),null,'negative apparent quantities stay absent');
 assert.equal(api.latinApparentUse({...row('PRY'),imports:0,exports:0}),11100256,'published zeros are valid');
});

test('Latin national partner denominators preserve internal trade, null World cells, residuals and Free Zones',()=>{
 assert.equal(row('PRY').partners.find(p=>p.name==='Argentina').region,'internal');
 assert.equal(row('PRY').partners.find(p=>p.name==='Argentina').tonnes,6884070);
 assert.equal(row('PRY').partners.length,15);assert.equal(row('PRY').partnerRoundingGap,3.828);
 const w=dom(api.renderLatinDestinations(row('PRY')));
 assert.match(w.document.body.textContent,/Argentina.*対象34国・地域内.*86.19%/s);
 assert.match(w.document.body.textContent,/7,987,010 t/);assert.match(w.document.body.textContent,/3.828 t/);
 assert.equal(row('BRA').exports,null);assert.equal(row('BRA').imports,null);
 assert.equal(row('BRA').partners.find(p=>p.name==='Bulgaria').tonnes,null);
 assert.equal(row('BRA').partners.find(p=>p.name==='Aruba').region,'external','boundary is the existing closed 34-target set');
 assert.equal(row('BRA').partners.find(p=>p.name==='Other Asia, nes').region,'unresolved','statistical area is not assigned outside the region');
 const brazil=dom(api.renderLatinDestinations(row('BRA'),true));
 assert.equal(brazil.document.querySelectorAll('.latin-partner-track,.agro-partner-pie').length,0);
 assert.match(brazil.document.body.textContent,/販売年度の相手数量は未収録/);
 assert.doesNotMatch(brazil.document.body.textContent,/%/,'no shares without a World denominator');
 assert.equal(api.latinApparentUse(row('URY')),null);
 assert.equal(row('URY').partners.find(p=>p.name==='Free Zones').region,'unresolved');
 const uruguay=dom(api.renderLatinSoyColumns(row('URY'),data.method));
 assert.equal(uruguay.document.querySelectorAll('.agro-band').length,0);
 assert.match(uruguay.document.body.textContent,/Free Zones.*特定国や域外へ割り当てず/s);
 assert.doesNotMatch(uruguay.document.querySelector('[data-agro-stage="use"]').textContent,/生産量との比/);
});

test('Chile forest stages retain units, real industrial inputs, missing categories and rounded source discrepancies',()=>{
 assert.equal(data.forest.sawnwood.production,7036700);assert.equal(data.forest.sawnwood.exports,2010000);
 assert.equal(data.forest.pulp.production,5938000);
 assert.equal(data.forest.roundwood.parts[5].value,null);assert.equal(data.forest.roundwood.parts[8].value,null);
 const wood=dom(api.renderLatinForestColumns(data.forest,'roundwood'));
 const production=wood.document.querySelector('[data-agro-stage="production"]');
 assert.doesNotMatch(production.textContent,/42,254,600/,'industrial use is not roundwood production');
 assert.match(wood.document.body.textContent,/樹皮なし実材積/);assert.match(wood.document.body.textContent,/100 m³/);
 assert.match(wood.document.body.textContent,/製材所由来チップを含みません/);
 const sawn=dom(api.renderLatinForestColumns(data.forest,'sawnwood'));
 assert.match(sawn.document.body.textContent,/7,036,700 m³/);assert.match(sawn.document.body.textContent,/2,010,000 m³/);
 assert.equal(sawn.document.querySelectorAll('.agro-band').length,0,'no residual-use band without imports/stocks');
 const pulp=dom(api.renderLatinForestColumns(data.forest,'pulp'));
 assert.match(pulp.document.body.textContent,/5,938,000 t/);
 assert.doesNotMatch(pulp.document.body.textContent,/7,036,700|2,010,000/);
 for(const w of [wood,sawn,pulp]){
  assert.equal(w.document.querySelectorAll('[data-agro-stage]').length,3);
  assert.equal(w.document.querySelectorAll('.agro-world-pie,.agro-partner-pie').length,0);
  assert.match(w.document.body.textContent,/同年・同製品・同単位の全相手数量は未収録/);
 }
});

const controller=await build({entryPoints:['src/scripts/atlas-latin-agro-quantity.ts'],bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/insight-journal/"'}});
let instanceId=0;
async function settled(condition){const deadline=Date.now()+8000;while(Date.now()<deadline){if(condition())return;await new Promise(r=>setTimeout(r,5));}assert.fail('controller did not settle');}
async function harness(run){
 const w=new Window({url:'http://localhost/insight-journal/atlas/latin-america/agriculture/'}),saved={document:globalThis.document,fetch:globalThis.fetch,MutationObserver:globalThis.MutationObserver};
 Object.assign(globalThis,{document:w.document,MutationObserver:w.MutationObserver});
 w.document.body.innerHTML='<main><section data-agro-statistics><h2 data-agro-heading></h2><p data-agro-status></p><div data-agro-series-control><select data-agro-series-select></select></div><button data-agro-retry hidden></button><div data-agro-content></div><script type="application/json" data-agro-config></script></section></main>';
 const root=w.document.querySelector('main'),host=root.firstElementChild;
 const manifest=JSON.parse(read('public/assets/atlas/regional-production-statistics-v1/manifest.json'));
 host.querySelector('[data-agro-config]').textContent=JSON.stringify({scope:'中南米',country:'',topic:'all',topics:['soyb','maiz'],countries:[{code:'ARG',name:'アルゼンチン'},{code:'PRY',name:'パラグアイ'}],nationalOnly:true,url:'/shared/',files:manifest.files,labels:{}});
 let quantityFetch=async()=>new Response(JSON.stringify(data));
 globalThis.fetch=async input=>String(input).includes('latin-agro-quantity')?quantityFetch():new Response(readFileSync('public/assets/atlas/regional-production-statistics-v1/'+String(input).replace('/shared/','')));
 const code=controller.outputFiles[0].text+'\n// isolated controller '+(++instanceId);
 const controllerApi=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 try{await run({w,root,host,api:controllerApi,setFetch:fn=>{quantityFetch=fn;}});}finally{Object.assign(globalThis,saved);await w.happyDOM.close();}
}

test('Latin controller leaves overview intact and restores it after enhancing an explicit soybean selection',()=>harness(async({root,host,api})=>{
 api.syncLatinAgroStatistics(root,{country:'ARG',topic:'all'});
 await settled(()=>host.dataset.agroReady==='true');
 const overview=host.querySelector('[data-agro-content]').innerHTML;
 assert.equal(host.querySelector('[data-latin-calendar-flow]'),null);
 api.syncLatinAgroStatistics(root,{country:'ARG',topic:'soyb'});
 await settled(()=>host.querySelector('[data-latin-calendar-flow]'));
 assert.ok(host.querySelector('[data-latin-retained-statistics] [data-agro-marketing-year="2024/25"]'));
 api.syncLatinAgroStatistics(root,{country:'ARG',topic:'all'});
 await settled(()=>host.dataset.agroReady==='true'&&!host.querySelector('[data-latin-quantity-key]'));
 assert.equal(host.querySelector('[data-agro-content]').innerHTML,overview);
}));

test('Latin delayed supplemental fetch never restores an old country or crop; failures retain shared statistics and retry',()=>harness(async({root,host,api,setFetch})=>{
 let resolveData;
 setFetch(()=>new Promise(r=>{resolveData=r;}));
 api.syncLatinAgroStatistics(root,{country:'ARG',topic:'soyb'});
 await settled(()=>resolveData);
 api.syncLatinAgroStatistics(root,{country:'ARG',topic:'maiz'});
 resolveData(new Response(JSON.stringify(data)));
 await settled(()=>host.dataset.agroReady==='true'&&host.querySelector('[data-agro-series="maize-production"]'));
 assert.equal(host.querySelector('[data-latin-calendar-flow]'),null);
 api.syncLatinAgroStatistics(root,{country:'PRY',topic:'soyb'});
 await settled(()=>host.querySelector('[data-latin-calendar-flow]'));
 assert.equal(host.querySelector('[data-latin-calendar-flow]').dataset.agroCountry,'PRY');
}));

test('Latin supplemental network failure keeps the native flow and offers a working retry',()=>harness(async({root,host,api,setFetch})=>{
 setFetch(async()=>{throw Error('fixture failure');});
 api.syncLatinAgroStatistics(root,{country:'ARG',topic:'soyb'});
 await settled(()=>host.querySelector('[data-latin-quantity-error]'));
 assert.ok(host.querySelector('[data-agro-marketing-year="2024/25"]'));
 setFetch(async()=>new Response(JSON.stringify(data)));
 host.querySelector('[data-latin-quantity-error] button').click();
 await settled(()=>host.querySelector('[data-latin-calendar-flow]'));
 assert.equal(host.querySelector('[data-latin-quantity-error]'),null);
}));
