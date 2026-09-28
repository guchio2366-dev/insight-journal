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
  const other=await setup('agriculture',new URL(link.href).search);
  try{assert.equal(other.q('[data-west-map]').getAttribute('viewBox'),q('[data-west-map]').getAttribute('viewBox'),'分野を移動しても地域全体の表示範囲を保つ');}finally{await other.w.happyDOM.close();}
  select('[data-west-country]','QAT');assert.equal(q('[data-west-city]').value,'');assert.match(q('[data-west-detail]').textContent,/今回の資料取得範囲に観測所の平年値がありません/);
  w.history.replaceState({},'',source);w.dispatchEvent(new w.PopStateEvent('popstate'));
  await until(()=>q('[data-west-point]').textContent.includes('BWh'));assert.equal(q('[data-west-city]').value,'bahrain');
 }finally{await w.happyDOM.close();}
});
test('資料取得に失敗しても国と主題を切り替えられる',async()=>{
 const {w,q,select}=await setup('nature','',true);
 try{
  q('[data-west-group="水資源"]').click();q('[data-west-topic-button="basins"]').click();await until(()=>!q('[data-west-retry]').hidden);
  assert.match(q('[data-west-loading]').textContent,/読み込めません/);
  q('[data-west-group="気候区分"]').click();await until(()=>q('[data-west-loading]').hidden);
  select('[data-west-country]','SAU');await until(()=>q('[data-west-climate-class]')?.textContent.includes('BWh'));assert.equal(q('[data-west-country]').value,'SAU');assert.match(q('[data-west-scope]').textContent,/サウジアラビア/);
 }finally{await w.happyDOM.close();}
});
test('直接指定された未収録年は保ち、主題切替時は実際の収録年を明示する',async()=>{
 const {w,q,select}=await setup('industry','?topic=oil&country=SAU&year=2024');
 try{
  assert.equal(q('[data-west-year]').value,'2024');assert.match(q('[data-west-detail]').textContent,/未収録/);
  q('[data-west-topic-button="gas"]').click();assert.equal(q('[data-west-year]').value,'2021');assert.match(q('[data-west-point]').textContent,/2021年へ切り替え/);assert.match(q('[data-west-detail]').textContent,/天然ガス資源レント/);
 }finally{await w.happyDOM.close();}
});

test('北米と同じ読み順で初期雨温図が表示され、都市選択で地図の範囲は動かない',async()=>{
 const {w,q}=await setup('nature');
 try{
  await until(()=>q('[data-west-climate-class]')?.textContent.includes('BWh'));
  assert.equal(q('[data-west-city]').value,'riyadh');assert.equal(q('[data-west-detail]').querySelector('h3').textContent,'都市の雨温図');
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-city]').length,18);
  const before=q('[data-west-map]').getAttribute('viewBox');
  q('[data-city="tehran"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await until(()=>q('[data-west-city]').value==='tehran');
  assert.equal(q('[data-west-map]').getAttribute('viewBox'),before);assert.match(q('[data-west-active-chart]').textContent,/テヘラン/);
  q('[data-west-group="気候区分"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  await until(()=>q('[data-west-loading]').hidden);
  assert.equal(q('[data-west-group="水資源"]').getAttribute('aria-selected'),'true');assert.equal(q('[data-west-subgroup="水資源"]').hidden,false);
  assert.equal(q('[data-west-climate-overview]').hidden,true);
 }finally{await w.happyDOM.close();}
});

test('農林業の地図下の品目と栽培方法、人口の上部タブを切り替えられる',async()=>{
 const agriculture=await setup('agriculture');
 try{
  const {q}=agriculture;q('.west-agri-picker [data-west-topic-button="barley"]').click();
  assert.equal(q('[data-west-cultivation="barley"]').hidden,false);assert.equal(q('[data-west-cultivation="wheat"]').hidden,true);
  q('[data-west-topic-button="barley-rainfed"]').click();assert.equal(q('.west-agri-picker [data-west-topic-button="barley"]').getAttribute('aria-pressed'),'true');
  assert.match(q('[data-west-detail]').textContent,/天水栽培/);assert.equal(q('[data-west-comparison]').hidden,false);
 }finally{await agriculture.w.happyDOM.close();}
 const population=await setup('population');
 try{
  const {q}=population;q('[data-west-group="年齢構成"]').click();q('[data-west-topic-button="age-older"]').click();
  assert.equal(q('[data-west-topic-button="age-older"]').getAttribute('aria-selected'),'true');assert.match(q('[data-west-detail]').textContent,/65歳以上/);
 }finally{await population.w.happyDOM.close();}
});
