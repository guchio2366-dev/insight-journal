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


test('水系の初期全体で4資料を同時に残し、地図選択・対象切替・URL復元で右説明を同期する',async()=>{
 const {w,q}=await setup('nature','?topic=water-overview');
 try{
  const counts=()=>[q('[data-west-scene]').querySelectorAll('[data-west-band="rainfall"]').length,q('[data-west-water-groundwater]').children.length,q('[data-west-water-rivers]').children.length,q('[data-west-water-basins]').children.length];
  assert.deepEqual(counts(),[107,166,162,2]);assert.equal(q('[data-west-country]').value,'');assert.equal(q('[data-west-natural-selection]'),null);assert.match(q('[data-west-source]').textContent,/GPCC.*WHYMAP.*HydroATLAS/);
  const frame=q('[data-west-map]').getAttribute('viewBox');
  q('[data-west-water-pick="groundwater"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');
  q('[data-natural-feature="ground:0"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-natural-selection]')?.textContent.includes('涵養区分'));
  assert.deepEqual(counts(),[107,166,162,2]);assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);const saved=new URL(w.location.href).search;
  const reload=await setup('nature',saved);try{assert.match(reload.q('[data-west-natural-selection]').textContent,/残存量・取水量ではありません/);assert.equal(reload.q('[data-west-water-pick="groundwater"]').getAttribute('aria-pressed'),'true');}finally{await reload.w.happyDOM.close();}
  q('[data-west-water-pick="basins"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');q('[data-basin="1060034260"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-regional-reading]')?.textContent.includes('南の上流'));assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);assert.equal(new URL(q('[data-west-natural-selection] a').href).searchParams.get('basin'),'1060034260');
  q('[data-west-water-pick="rainfall"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');q('[data-natural-feature="rainfall:250"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-natural-selection]')?.textContent.includes('250〜500'));assert.deepEqual(counts(),[107,166,162,2]);assert.equal(new URL(w.location.href).searchParams.has('basin'),false);
  w.history.replaceState({},'',saved);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-atlas]').dataset.ready==='true'&&q('[data-west-water-pick="groundwater"]').getAttribute('aria-pressed')==='true');assert.match(q('[data-west-natural-selection]').textContent,/涵養区分/);
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
