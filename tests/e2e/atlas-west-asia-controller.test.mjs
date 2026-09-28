import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const bundle=await build({entryPoints:['src/scripts/atlas-west-asia.ts'],bundle:true,write:false,format:'iife'});
async function until(check){for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('West Asia controller did not settle');}
async function setup(route,query='',failBasins=false){
 const w=new Window({url:`https://example.com/insight-journal/atlas/west-asia/${route}/${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 w.document.body.innerHTML=(await readFile(`dist/atlas/west-asia/${route}/index.html`,'utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'');
 w.ResizeObserver=class{observe(){} disconnect(){}};w.Response=Response;w.Blob=Blob;w.DecompressionStream=DecompressionStream;
 w.fetch=async url=>{if(failBasins&&String(url).endsWith('basins.json'))throw Error('Test: unavailable vector');return new Response(await readFile('public/'+String(url).replace('/insight-journal/','')));};
 w.eval(bundle.outputFiles[0].text);const q=s=>w.document.querySelector(s);
 await until(()=>q('[data-west-loading]').hidden);return {w,q,select:(s,v)=>{q(s).value=v;q(s).dispatchEvent(new w.Event('change'));}};
}
test('小国と観測所の選択、分野間リンク、履歴復元が同じ場所を指す',async()=>{
 const {w,q,select}=await setup('nature','?country=BHR&city=bahrain&topic=climate&year=2024');
 try{
  await until(()=>q('[data-west-point]').textContent.includes('BWh'));
  assert.match(q('[data-west-detail]').textContent,/バーレーン/);assert.ok(q('[data-west-active-chart] svg'));
  const source=w.location.href;const link=q('.atlas-tabs [data-west-field=agriculture]');
  assert.equal(new URL(link.href).searchParams.get('country'),'BHR');assert.equal(new URL(link.href).searchParams.get('city'),'bahrain');
  select('[data-west-country]','QAT');assert.equal(q('[data-west-city]').value,'');assert.match(q('[data-west-detail]').textContent,/今回の資料取得範囲に観測所の平年値がありません/);
  w.history.replaceState({},'',source);w.dispatchEvent(new w.PopStateEvent('popstate'));
  await until(()=>q('[data-west-point]').textContent.includes('BWh'));assert.equal(q('[data-west-city]').value,'bahrain');
 }finally{await w.happyDOM.close();}
});
test('資料取得に失敗しても国と主題を切り替えられる',async()=>{
 const {w,q,select}=await setup('nature','',true);
 try{
  select('[data-west-topic]','basins');await until(()=>!q('[data-west-retry]').hidden);
  assert.match(q('[data-west-loading]').textContent,/読み込めません/);
  select('[data-west-topic]','climate');await until(()=>q('[data-west-loading]').hidden);
  select('[data-west-country]','SAU');assert.equal(q('[data-west-country]').value,'SAU');assert.match(q('[data-west-detail]').textContent,/サウジアラビア/);
 }finally{await w.happyDOM.close();}
});
test('直接指定された未収録年は保ち、主題切替時は実際の収録年を明示する',async()=>{
 const {w,q,select}=await setup('industry','?topic=oil&country=SAU&year=2024');
 try{
  assert.equal(q('[data-west-year]').value,'2024');assert.match(q('[data-west-detail]').textContent,/未収録/);
  select('[data-west-topic]','gas');assert.equal(q('[data-west-year]').value,'2021');assert.match(q('[data-west-point]').textContent,/2021年へ切り替え/);assert.match(q('[data-west-detail]').textContent,/天然ガス資源レント/);
 }finally{await w.happyDOM.close();}
});
