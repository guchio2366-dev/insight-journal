import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const bundle=await build({entryPoints:['src/scripts/atlas-west-asia.ts'],bundle:true,write:false,format:'iife'});
async function until(check){for(let i=0;i<300;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('West Asia annual precipitation controller did not settle');}
async function setup(route,query='',fixture={}){
 const w=new Window({url:`https://example.com/insight-journal/atlas/west-asia/${route}/${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 w.happyDOM.setWindowSize({width:1366,height:768});
 w.document.body.innerHTML=(await readFile(`dist/atlas/west-asia/${route}/index.html`,'utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'');
 w.ResizeObserver=class{observe(){}disconnect(){}};w.Response=Response;w.Blob=Blob;w.DecompressionStream=DecompressionStream;Object.defineProperty(w,'crypto',{value:webcrypto});
 const fetched=[];
 w.fetch=async value=>{const url=String(value);fetched.push(url);const injected=fixture.fetch?.(url);if(injected!==undefined)return injected;return new Response(await readFile('public/'+url.replace('/insight-journal/','')));};
 w.eval(bundle.outputFiles[0].text);const q=selector=>w.document.querySelector(selector);
 await until(()=>fixture.expectFailure?!q('[data-west-retry]').hidden:q('[data-west-loading]').hidden);
 return {w,q,fetched,select:(selector,value)=>{q(selector).value=value;q(selector).dispatchEvent(new w.Event('change'));}};
}

test('年降水量は選択時だけ別assetを読み、全8階級・平年期間・定義を表示する',async()=>{
 const climate=await setup('nature');try{assert.equal(climate.fetched.some(url=>url.includes('west-asia-precipitation-v1')),false);}finally{await climate.w.happyDOM.close();}
 const {w,q,fetched}=await setup('nature','?topic=annual-precipitation&country=IRN&at=51.4,35.7&year=2024');
 try{await until(()=>q('[data-west-point]').textContent.includes('GPCC v2025'));assert.equal(q('[data-west-atlas]').dataset.topic,'annual-precipitation');assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,1);assert.ok(q('[data-west-raster]').getAttribute('href').includes('west-asia-precipitation-v1/precipitation.png'));const legend=q('[data-west-reading-key] [data-west-legend]');assert.ok(legend);assert.equal(legend.querySelectorAll(':scope>.west-swatches:first-child>span').length,8);assert.match(legend.textContent,/mm／年.*1991–2020/);assert.match(q('[data-west-point]').textContent,/12か月合計/);assert.match(q('[data-west-point]').textContent,/現在の水利用可能量ではありません/);assert.match(q('[data-west-source]').textContent,/GPCC.*CC BY 4.0/);assert.equal(new URL(w.location.href).searchParams.get('year'),'2024');assert.ok(fetched.some(url=>url.endsWith('values.bin.gz')));assert.equal(q('[data-west-city-label]').hidden,true);assert.ok(q('[data-west-compare="wheat-irrigated"]'));assert.ok(q('[data-west-compare="wheat-rainfed"]'));}finally{await w.happyDOM.close();}
});

test('灌漑・天水小麦から年降水量へ進み、元の分布・両凡例・名前付き復帰を保つ',async()=>{
 for(const topic of ['wheat-irrigated','wheat-rainfed']){
  const initial=`?topic=${topic}&country=IRN&city=tehran&year=2020&map=100,120,400,300&at=51.4,35.7`,source=await setup('agriculture',initial);let comparison;
  try{const link=source.q('[data-west-compare="annual-precipitation"]');assert.ok(link);comparison=await setup('nature',new URL(link.href).search);const {w,q}=comparison;await until(()=>q('[data-west-point]').textContent.includes('GPCC v2025'));assert.equal(q('[data-west-atlas]').dataset.comparing,'true');assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,2);assert.equal(q('[data-west-legend]').querySelectorAll('.west-legend-subject').length,2);assert.match(q('[data-west-legend]').textContent,/1991–2020/);assert.match(q('[data-west-legend]').textContent,/2020/);assert.match(q('[data-west-detail]').textContent,/取水量|栽培限界/);assert.match(q('[data-west-return]').textContent,topic.endsWith('irrigated')?/小麦・灌漑栽培へ戻る/:/小麦・天水栽培へ戻る/);const back=new URL(q('[data-west-return]').href);for(const [key,value]of new URLSearchParams(initial))assert.equal(back.searchParams.get(key),value,key);const original=q('[data-west-scene]').querySelector('g[clip-path="url(#west-source-half)"]');assert.ok(original);assert.ok([...q('[data-west-scene]').querySelectorAll('[data-west-raster]')].some(image=>image.getAttribute('href').endsWith(topic+'.png')));const slider=q('[data-west-split]');slider.value='70';slider.dispatchEvent(new w.Event('input'));assert.equal(q('[data-west-source-clip]').getAttribute('width'),'280');assert.equal(q('[data-west-target-clip]').getAttribute('width'),'120');const saved=w.location.href;const reload=await setup('nature',new URL(saved).search);try{assert.equal(reload.q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,2);assert.equal(new URL(reload.q('[data-west-return]').href).searchParams.get('topic'),topic);}finally{await reload.w.happyDOM.close();}}finally{await source.w.happyDOM.close();if(comparison)await comparison.w.happyDOM.close();}
 }
});

test('年降水量から小麦へ進んでも平年値を統計の年へ変更せず、観測所との比較を残す',async()=>{
 const source=await setup('nature','?topic=annual-precipitation&country=TUR&year=2020&map=100,100,500,350');let comparison;
 try{const link=source.q('[data-west-compare="wheat-rainfed"]');comparison=await setup('agriculture',new URL(link.href).search);const {w,q,select}=comparison;assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,2);assert.match(q('[data-west-legend]').textContent,/1991–2020/);assert.match(q('[data-west-return]').textContent,/年降水量の分布へ戻る/);select('[data-west-year]','2024');assert.match(q('[data-west-legend]').textContent,/1991–2020/);assert.equal(new URL(q('[data-west-return]').href).searchParams.get('year'),'2020');assert.equal(new URL(w.location.href).searchParams.get('year'),'2024');const stations=await setup('nature',new URL(source.q('[data-west-compare="precipitation"]').href).search);try{assert.equal(stations.q('[data-west-scene]').querySelectorAll('[data-city]').length,18);assert.equal(stations.q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,1);assert.match(stations.q('[data-west-source]').textContent,/ClimatView/);assert.match(stations.q('[data-west-source]').textContent,/GPCC/);}finally{await stations.w.happyDOM.close();}}finally{await source.w.happyDOM.close();if(comparison)await comparison.w.happyDOM.close();}
});

test('manifest不整合と格子破損を表示し、元の選択を保って再取得する',async()=>{
 const manifest=JSON.parse(await readFile('public/assets/atlas/west-asia-precipitation-v1/manifest.json','utf8'));let broken=true;
 const {w,q}=await setup('nature','?topic=annual-precipitation&country=IRN&at=51.4,35.7&map=100,120,400,300',{expectFailure:true,fetch:url=>broken&&url.endsWith('west-asia-precipitation-v1/manifest.json')?new Response(JSON.stringify({...manifest,period:'1981-01-01/2010-12-31'})):undefined});
 try{assert.match(q('[data-west-loading]').textContent,/資料を確認できません/);const before=w.location.href;broken=false;q('[data-west-retry]').click();await until(()=>q('[data-west-loading]').hidden);await until(()=>q('[data-west-point]').textContent.includes('GPCC v2025'));assert.equal(w.location.href,before);assert.equal(q('[data-west-country]').value,'IRN');}finally{await w.happyDOM.close();}
 let corrupt=true;const second=await setup('nature','?topic=annual-precipitation&country=IRN&at=51.4,35.7',{expectFailure:true,fetch:url=>corrupt&&url.endsWith('west-asia-precipitation-v1/values.bin.gz')?new Response(new Uint8Array([1,2,3])):undefined});
 try{await until(()=>!second.q('[data-west-retry]').hidden);assert.match(second.q('[data-west-loading]').textContent,/数値を読み込めません/);corrupt=false;second.q('[data-west-retry]').click();await until(()=>second.q('[data-west-point]').textContent.includes('GPCC v2025'));assert.equal(second.q('[data-west-retry]').hidden,true);}finally{await second.w.happyDOM.close();}
});

test('配信側のgzip展開後も同じ値を読み、海の欠測を0へ変更しない',async()=>{
 const raw=gunzipSync(await readFile('public/assets/atlas/west-asia-precipitation-v1/values.bin.gz'));
 const {w,q}=await setup('nature','?topic=annual-precipitation&at=55,15',{fetch:url=>url.endsWith('west-asia-precipitation-v1/values.bin.gz')?new Response(raw):undefined});
 try{await until(()=>q('[data-west-point]').textContent.includes('未収録'));assert.match(q('[data-west-point]').textContent,/この格子の値は未収録/);assert.equal(q('[data-west-retry]').hidden,true);}finally{await w.happyDOM.close();}
});

test('遅い年降水量manifest応答が別主題・履歴へ戻った画面を上書きしない',async()=>{
 let release;const pending=new Promise(resolve=>release=resolve),manifest=await readFile('public/assets/atlas/west-asia-precipitation-v1/manifest.json');
 const {w,q}=await setup('nature','?topic=climate&country=IRN&city=tehran',{fetch:url=>url.endsWith('west-asia-precipitation-v1/manifest.json')?pending:undefined});
 try{q('[data-west-group="水資源"]').click();await until(()=>q('[data-west-loading]').hidden);q('[data-west-topic-button="annual-precipitation"]').click();await until(()=>q('[data-west-atlas]').dataset.topic==='annual-precipitation');q('[data-west-group="気候区分"]').click();await until(()=>q('[data-west-atlas]').dataset.topic==='climate'&&q('[data-west-atlas]').dataset.ready==='true');release(new Response(manifest));await new Promise(resolve=>setTimeout(resolve,40));assert.equal(q('[data-west-atlas]').dataset.topic,'climate');assert.equal(new URL(w.location.href).searchParams.get('topic'),'climate');assert.equal(q('[data-west-scene]').querySelector('[data-west-raster]').getAttribute('href').endsWith('climate.png'),true);}finally{release(new Response(manifest));await w.happyDOM.close();}
});
