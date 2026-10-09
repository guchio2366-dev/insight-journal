import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const bundle=await build({entryPoints:['src/scripts/atlas-west-asia.ts'],bundle:true,write:false,format:'iife'});
async function until(check){for(let i=0;i<300;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('West Asia natural controller did not settle');}
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


test('水資源の3区分は河川・地下水、年降水量、代表流域を分け、概要と個別説明を同期する',async()=>{
 const {w,q,fetched}=await setup('nature','?topic=rivers');
 try{
  const counts=()=>[q('[data-west-scene]').querySelectorAll('[data-west-band]').length,q('[data-west-water-groundwater]')?.children.length??0,q('[data-west-water-rivers]')?.children.length??0,q('[data-west-scene]').querySelectorAll('[data-basin]').length];
  assert.deepEqual(counts(),[0,166,162,0]);assert.equal(q('[data-west-country]').value,'');assert.equal(q('[data-west-natural-selection]'),null);assert.match(q('.atlas-reading-takeaway').textContent,/ナイル川.*チグリス.*アラビア半島.*エネルギー/);assert.match(q('[data-west-source]').textContent,/Natural Earth.*WHYMAP/);assert.doesNotMatch(q('[data-west-source]').textContent,/GPCC|HydroATLAS/);assert(!fetched.some(url=>url.includes('precipitation')||url.includes('natural-presentation')));
  const frame=q('[data-west-map]').getAttribute('viewBox');
  q('[data-natural-feature="ground:0"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-natural-selection]')?.textContent.includes('地下水を含む地層'));
  assert.deepEqual(counts(),[0,166,162,0]);assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);assert.match(q('[data-west-natural-method]').textContent,/涵養区分.*残存量・取水量ではありません/);assert.equal(q('[data-west-natural-method]').open,false);const saved=new URL(w.location.href).search;
  const reload=await setup('nature',saved);try{assert.match(reload.q('[data-west-natural-selection]').textContent,/乾燥したアラビア半島/);assert.match(reload.q('[data-west-natural-method]').textContent,/残存量・取水量ではありません/);}finally{await reload.w.happyDOM.close();}
  const river=q('[data-natural-feature^="river:"][tabindex="0"]');river.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-natural-method]')?.textContent.includes('Natural Earth'));assert.deepEqual(counts(),[0,166,162,0]);assert.doesNotMatch(q('[data-west-natural-selection]').textContent,/Natural Earth/);
  q('[data-west-reading-overview]').click();assert.equal(q('[data-west-natural-selection]'),null);assert.match(q('.atlas-reading-takeaway').textContent,/ナイル川/);
  q('[data-west-topic-button="annual-precipitation"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');assert.deepEqual(counts(),[107,0,0,0]);assert.equal(q('[data-west-natural-selection]'),null);assert.match(q('.atlas-reading-takeaway').textContent,/リゼ.*アンカラ.*リヤド/);q('[data-natural-feature="rainfall:250"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-natural-selection]')?.textContent.includes('250〜500'));assert.match(q('[data-west-natural-method]').textContent,/同じ広域の平滑化格子/);assert.equal(q('[data-west-natural-method]').open,false);
  q('[data-west-topic-button="basins"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');assert.deepEqual(counts(),[0,0,0,2]);assert.equal(q('[data-west-natural-selection]'),null);assert.match(q('.atlas-reading-takeaway').textContent,/ナイル川.*トルコ.*シリア・イラク/);assert.equal(q('[data-west-basin]'),null);q('[data-basin="1060034260"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-regional-reading]')?.textContent.includes('地域外の南'));assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);assert.match(q('[data-west-natural-method]').textContent,/HydroATLAS/);
  w.history.replaceState({},'',saved);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-atlas]').dataset.ready==='true'&&q('[data-west-atlas]').dataset.topic==='rivers');assert.match(q('[data-west-natural-selection]').textContent,/地下水を含む地層/);
 }finally{await w.happyDOM.close();}
});

test('標高500mは同じ色帯と線を描き、地形は輪郭だけで海面下・地点欠測も区別する',async()=>{
 const {w,q}=await setup('nature','?topic=contours&feature=elevation:-500&at=35.5,31.5');
 try{assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,0);assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-band="elevation"]').length,1198);assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-aligned-line="elevation"]').length,1155);assert.match(q('[data-west-legend]').textContent,/-500〜0未満/);assert.match(q('[data-west-natural-selection]').textContent,/-500〜0未満/);await until(()=>q('[data-west-natural-value]').textContent.includes('ETOPO 2022'));
  q('[data-west-standard-group="地形"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-band]').length,0);assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,0);assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-aligned-line]').length,1155);q('[data-natural-feature="line:500"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-natural-selection]')?.textContent.includes('500mの等高線'));
 }finally{await w.happyDOM.close();}
 const missing=await setup('nature','?topic=annual-precipitation&at=55,15');try{await until(()=>missing.q('[data-west-natural-value]')?.textContent.includes('未収録'));assert.doesNotMatch(missing.q('[data-west-natural-value]').textContent,/：0/);}finally{await missing.w.happyDOM.close();}
});

test('等値線manifest不整合・形状破損を示し、選択URLを保って再試行する',async()=>{
 const manifest=JSON.parse(await readFile('public/assets/atlas/west-asia-natural-presentation-v1/manifest.json','utf8'));let broken=true;
 const app=await setup('nature','?topic=annual-precipitation&feature=rainfall:250&at=51.4,35.7',{expectFailure:true,fetch:url=>broken&&url.endsWith('west-asia-natural-presentation-v1/manifest.json')?new Response(JSON.stringify({...manifest,layers:{...manifest.layers,rainfall:{...manifest.layers.rainfall,interval:500}}})):undefined});
 try{const saved=app.w.location.href;assert.match(app.q('[data-west-loading]').textContent,/等値線・色帯の資料を確認できません/);broken=false;app.q('[data-west-retry]').click();await until(()=>app.q('[data-west-atlas]').dataset.ready==='true');assert.equal(app.w.location.href,saved);assert.match(app.q('[data-west-natural-selection]').textContent,/250〜500/);}finally{await app.w.happyDOM.close();}
 const second=await setup('nature','?topic=terrain',{expectFailure:true,fetch:url=>url.endsWith(manifest.layers.elevation.lineChunks[0].file)?new Response(new Uint8Array([1,2,3])):undefined});try{assert.match(second.q('[data-west-loading]').textContent,/資料を確認できません/);assert.equal(second.q('[data-west-scene]').children.length,0);}finally{await second.w.happyDOM.close();}
});
