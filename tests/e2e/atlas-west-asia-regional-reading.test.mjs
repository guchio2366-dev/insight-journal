import test from 'node:test';
import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const bundle=await build({entryPoints:['src/scripts/atlas-west-asia.ts'],bundle:true,write:false,format:'iife'});
async function until(check){for(let i=0;i<300;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('West Asia reading did not settle');}
async function setup(route,query=''){
 const w=new Window({url:`https://example.com/insight-journal/atlas/west-asia/${route}/${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 w.happyDOM.setWindowSize({width:1440,height:1000});
 w.document.body.innerHTML=(await readFile(`dist/atlas/west-asia/${route}/index.html`,'utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'');
 w.ResizeObserver=class{observe(){}disconnect(){}};Object.defineProperty(w,'crypto',{value:webcrypto});w.Response=Response;w.Blob=Blob;w.DecompressionStream=DecompressionStream;
 w.fetch=async url=>new Response(await readFile('public/'+String(url).replace('/insight-journal/','')));
 w.eval(bundle.outputFiles[0].text);const q=selector=>w.document.querySelector(selector);
 await until(()=>q('[data-west-atlas]')?.dataset.ready==='true'&&q('[data-west-loading]').hidden);
 return {w,q,select:(selector,value)=>{q(selector).value=value;q(selector).dispatchEvent(new w.Event('change'));}};
}
// Industry now has 21 researched series and its own controller; its acceptance
// coverage lives in atlas-west-asia-industry.test.mjs and the PC review.
test('地域水説明・元流域・雨温図の具体的理由を既存資料と一緒に保持する',async()=>{
 for(const [query,pattern] of [['?topic=groundwater',/再生しにくい地下水.*アル・アハサー.*エネルギー/s],['?topic=desalination',/電力.*送水.*小麦畑.*断定/s],['?topic=basins&basin=1060034260',/ナイル川.*地域外の南/s],['?topic=basins&basin=2060073570',/チグリス・ユーフラテス.*シリア・イラク/s]]){
  const {w,q}=await setup('nature',query);try{assert.match(q('[data-west-detail]').textContent,pattern);assert.ok(q('[data-west-regional-reading] a'));}finally{await w.happyDOM.close();}
 }
 const {w,q}=await setup('nature','?topic=climate&city=helwan&country=EGY');
 try{
  await until(()=>q('[data-west-climate-class]')?.textContent.includes('BWh'));
  assert.match(q('[data-west-city-geography]').textContent,/ナイル川.*地域外の上流.*流量/s);
  assert.ok(q('[data-west-active-chart] [data-city-numbers] table'));
  assert.equal(q('[data-west-city-geography]').previousElementSibling.dataset.westClimateDescription,'');
  assert.equal(q('.west-reading [data-west-related]'),null);
  assert.ok(q('.atlas-map-column [data-west-related]'));
  assert.equal(q('[data-west-detail]').children[1].className,'atlas-city-climate');
  q('[data-west-reading-overview]').click();
  assert.match(q('#west-detail-title').textContent,/自然環境の概論/);assert.equal(q('[data-west-active-chart]'),null);
  q('[data-city="helwan"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await until(()=>q('[data-west-climate-class]')?.textContent.includes('BWh'));
  assert.equal(q('[data-west-detail]').children[1].className,'atlas-city-climate');
 }finally{await w.happyDOM.close();}
});
test('気候区分の大小文字を保ち、地図上の略号を控えめに拡大する',async()=>{
 const {w,q}=await setup('nature','?topic=climate');
 try{
  const svg=q('[data-west-map]');
  Object.defineProperties(svg,{clientWidth:{value:900,configurable:true},clientHeight:{value:650,configurable:true}});
  q('[data-west-reset]').click();
  const labels=[...q('[data-west-scene]').querySelectorAll('.west-climate-code')];
  assert(labels.length>0);
  const [, ,width,height]=svg.getAttribute('viewBox').split(' ').map(Number),scale=Math.max(width/900,height/650);
  for(const label of labels){
   assert.match(label.textContent,/^[A-E][a-zA-Z]{1,2}$/);
   assert(Math.abs(Number.parseFloat(label.style.fontSize)-12*scale)<0.00001);
  }
 }finally{await w.happyDOM.close();}
});
test('背景国が必要な地図選択を遮らず、国選択は都市も地図範囲も自動変更しない',async()=>{
 for(const query of ['?topic=climate','?topic=groundwater','?topic=basins','?topic=terrain']){
  const {w,q,select}=await setup('nature',query);
  try{
   const frame=q('[data-west-map]').getAttribute('viewBox');
   assert.equal(q('[data-west-scene]').querySelectorAll('[data-country]').length,0);
   if(query.includes('groundwater'))assert.ok(q('[data-ground]'));
   if(query.includes('basins'))assert.ok(q('[data-basin]'));
   select('[data-west-country]','SAU');await until(()=>q('[data-west-loading]').hidden);
   assert.equal(q('[data-west-city]').value,'');assert.equal(q('[data-west-active-chart]'),null);
   assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);
  }finally{await w.happyDOM.close();}
 }
});
test('ナイル流域の直接URLと履歴復元は地域範囲を保ち、明示したカメラは保持する',async()=>{
 const full=await setup('nature','?topic=basins&basin=1060034260');
 const explicit=await setup('nature','?topic=basins&basin=1060034260&map=10,20,400,300');
 try{
  const fitted=full.q('[data-west-map]').getAttribute('viewBox');
  assert.equal(fitted,'0 0 1000 987');
  assert.equal(explicit.q('[data-west-map]').getAttribute('viewBox'),'10 20 400 300');
  explicit.w.history.replaceState({},'','?topic=basins&basin=1060034260');
  explicit.w.dispatchEvent(new explicit.w.PopStateEvent('popstate'));
  await until(()=>explicit.q('[data-west-map]').getAttribute('viewBox')===fitted);
 }finally{await full.w.happyDOM.close();await explicit.w.happyDOM.close();}
});
test('農畜産の全面分布を保ち、右欄上部の単独表示から同じ地図範囲で全品目へ戻る',async()=>{
 const {w,q}=await setup('agriculture','?topic=wheat');
 try{
  const frame=q('[data-west-map]').getAttribute('viewBox');
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-farm-coverage]').length,5);
  assert.equal(q('[data-west-farming-only]').parentElement,q('[data-west-detail]'),'the action precedes the longer regional explanation');
  q('[data-west-farming-only]').click();await until(()=>q('[data-west-scene]').querySelectorAll('[data-west-farm-context]').length===1);
  assert.equal(q('[data-west-farm-context]').dataset.westFarmContext,'wheat');
  q('[data-west-farming-only]').click();await until(()=>q('[data-west-scene]').querySelectorAll('[data-west-farm-context]').length===5);
  assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);
 }finally{await w.happyDOM.close();}
});
