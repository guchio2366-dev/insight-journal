import test from 'node:test';
import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {decodeWestGrid} from '../../src/lib/atlas-west-asia-state.mjs';
const climateData=JSON.parse(await readFile('public/assets/atlas/west-asia-v1/data.json','utf8'));
const climateLayer=climateData.layers.find(l=>l.id==='climate');
const climateBytes=await readFile('public/assets/atlas/west-asia-v1/'+climateLayer.grid);
const regionalIds=new Set(await decodeWestGrid(climateBytes.buffer.slice(climateBytes.byteOffset,climateBytes.byteOffset+climateBytes.byteLength),climateLayer));
const regionalClasses=climateData.classes.filter(c=>regionalIds.has(c.id));
const bundle=await build({entryPoints:['src/scripts/atlas-west-asia.ts'],bundle:true,write:false,format:'iife'});
async function until(check){for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('West Asia controller did not settle');}
async function setup(route,query='',failBasins=false,viewport={width:1024,height:768},fixture={}){
 const w=new Window({url:`https://example.com/insight-journal/atlas/west-asia/${route}/${query}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true}});
 w.happyDOM.setWindowSize(viewport);
 const media=[],matchMedia=w.matchMedia.bind(w);w.matchMedia=query=>{const result=matchMedia(query);media.push(result);return result;};
 w.document.body.innerHTML=(await readFile(`dist/atlas/west-asia/${route}/index.html`,'utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'');
 const observed=[];w.ResizeObserver=class{constructor(callback){this.callback=callback;}observe(target){observed.push({target,callback:this.callback});}disconnect(){}};Object.defineProperty(w,'crypto',{value:webcrypto});w.Response=Response;w.Blob=Blob;w.DecompressionStream=DecompressionStream;
 w.fetch=async url=>{const injected=fixture.fetch?.(String(url));if(injected!==undefined)return injected;if(failBasins&&String(url).endsWith('basins.json'))throw Error('Test: unavailable vector');return new Response(await readFile('public/'+String(url).replace('/insight-journal/','')));};
 w.eval(bundle.outputFiles[0].text);const q=s=>w.document.querySelector(s);
 await until(()=>fixture.expectFailure?!q('[data-west-retry]').hidden:q('[data-west-loading]').hidden);return {w,q,media,notifyResize:selector=>observed.filter(x=>x.target.matches(selector)).forEach(x=>x.callback([{target:x.target}])),select:(s,v)=>{q(s).value=v;q(s).dispatchEvent(new w.Event('change'));}};
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

test('中東の農畜産は五品目を同時表示し、作物の輪郭選択・薄い家畜・履歴復元で分布を失わない',async()=>{
 const {w,q}=await setup('agriculture');
 try{
  const initial=w.location.href,frame=q('[data-west-map]').getAttribute('viewBox');
  const contexts=()=>[...q('[data-west-scene]').querySelectorAll('[data-west-farm-context]')].map(el=>el.dataset.westFarmContext);
  assert.deepEqual(contexts(),['wheat','barley','sheep','goat','cattle']);
  assert.equal(q('[data-west-country]').value,'');assert.equal(q('[data-west-atlas]').dataset.topic,'farming-overview');
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,0);
  assert.match(q('[data-west-legend]').textContent,/2020年.*品目.*選択作物/);
  q('[data-west-topic-button=wheat]').click();await until(()=>q('[data-west-farm-selected=wheat]'));
  assert.deepEqual(contexts(),['wheat','barley','sheep','goat','cattle']);
  for(const id of ['sheep','goat','cattle'])assert.equal(q('[data-west-farm-context='+id+']').getAttribute('opacity'),'.2');
  assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);
  q('[data-west-topic-button=sheep]').click();await until(()=>!q('[data-west-farm-selected]')&&q('[data-west-farm-context=sheep]')?.getAttribute('opacity')==='1');
  assert.deepEqual(contexts(),['wheat','barley','sheep','goat','cattle']);
  w.history.replaceState({},'',initial);w.dispatchEvent(new w.PopStateEvent('popstate'));
  await until(()=>q('[data-west-atlas]').dataset.topic==='farming-overview'&&q('[data-west-loading]').hidden);
  assert.deepEqual(contexts(),['wheat','barley','sheep','goat','cattle']);assert.equal(q('[data-west-country]').value,'');
 }finally{await w.happyDOM.close();}
});

test('中東の採用10品目は国別生産量にだけ切り替わり、欠測を残す',async()=>{
 const {w,q,select}=await setup('agriculture');
 try{
  const table=q('[data-west-production-selection]');
  assert.equal(q('[data-west-comparison]').hidden,false);
  assert.equal(table.querySelectorAll('tbody tr').length,10);
  assert.match(table.textContent,/牛の生乳.*19／20/);
  assert.match(table.textContent,/水牛の生乳.*6／20/);
  table.querySelector('[data-west-topic-button="cattle-milk"]').click();
  await until(()=>q('[data-west-atlas]').dataset.topic==='cattle-milk'&&q('[data-west-atlas]').dataset.ready==='true');
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-farm-context]').length,0);
  assert.match(q('[data-west-detail]').textContent,/牛の密度図.*生乳の生産量に換算できません/);
  select('[data-west-country]','TUR');
  await until(()=>q('[data-west-detail]').textContent.includes('トルコ')&&q('[data-west-loading]').hidden);
  assert.match(q('[data-west-detail]').textContent,/FAOSTAT/);
 }finally{await w.happyDOM.close();}
});

test('中東の初期気候は地域全体、選んだ都市の雨温図と説明は右に同居し国名hoverを出さない',async()=>{
 const {w,q,select}=await setup('nature');
 try{
  assert.equal(q('[data-west-city]').value,'');assert.equal(q('[data-west-active-chart]'),null);
  assert.equal(q('[data-west-scene]').querySelectorAll('.west-country-line title').length,0);
  assert.equal(q('.west-subtabs [data-west-topic-button=precipitation]'),null);
  const frame=q('[data-west-map]').getAttribute('viewBox');select('[data-west-city]','riyadh');
  await until(()=>q('[data-west-point]').textContent.includes('BWh'));
  await until(()=>q('[data-west-detail] [data-west-active-chart] svg'));
  const chart=q('[data-west-detail] [data-west-active-chart]');
  assert.ok(chart.querySelector('.atlas-city-reading'));assert.ok(chart.querySelector('[data-city-numbers] table'));
  assert.equal(q('[data-west-comparison] [data-west-active-chart]'),null);
  assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);
 }finally{await w.happyDOM.close();}
});

test('標準階層から掲載民族・宗教域へ進み、通常統計と概論・履歴へ戻れる',async()=>{
 const app=await setup('population');
 try{
  const {w,q,select}=app,frame=q('[data-west-map]').getAttribute('viewBox');
  assert.match(q('#west-detail-title').textContent,/人口の概論/);
  const statistics=q('[data-west-comparison]');assert.equal(statistics.parentElement,q('[data-atlas-shell]'));
  q('[data-west-standard-group="人種・民族"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');
  assert.equal(new URL(w.location.href).searchParams.get('topic'),'ethnicity');assert.equal(new URL(w.location.href).searchParams.has('category'),false);
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-settlement]').length,17);assert.equal(q('[data-west-legend]').querySelectorAll('[data-west-settlement-button]').length,17);
  assert.match(q('[data-west-detail]').textContent,/全民族の分布.*多数派|全民族の分布/);assert.equal(statistics.hidden,true);
  select('[data-west-settlement]','ethnicity-copts');await until(()=>q('[data-west-atlas]').dataset.ready==='true');
  assert.equal([...q('[data-west-scene]').querySelectorAll('[data-settlement]')].at(-1)?.dataset.settlement,'ethnicity-copts');assert.match(q('[data-west-settlement-reading] h3').textContent,/コプト/);
  const saved=w.location.href;q('[data-west-standard-group="宗教"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');
  assert.equal(new URL(w.location.href).searchParams.get('topic'),'religion');assert.equal(q('[data-west-scene]').querySelectorAll('[data-settlement]').length,4);assert.match(q('[data-west-detail]').textContent,/信者割合|住民全員の宗教/);
  q('[data-west-standard-group="人口分布"]').click();await until(()=>q('[data-west-loading]').hidden);assert.equal(statistics.hidden,false);assert.equal(q('[data-west-map]').getAttribute('viewBox'),frame);
  select('[data-west-country]','TUR');await until(()=>q('[data-west-loading]').hidden);assert.match(q('[data-west-detail]').textContent,/トルコ/);
  q('[data-west-reading-overview]').click();assert.match(q('#west-detail-title').textContent,/人口の概論/);
  statistics.querySelector('[data-west-country-button="IRN"]').click();await until(()=>q('[data-west-loading]').hidden);assert.equal(q('[data-west-country]').value,'IRN');
  w.history.replaceState({},'',saved);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-atlas]').dataset.ready==='true');assert.equal(q('[data-west-settlement]').value,'ethnicity-copts');assert.equal(q('[data-west-comparison]').hidden,true);
 }finally{await app.w.happyDOM.close();}
});

test('掲載域比較の元選択は左の非操作凡例に残り、両側の集団原典と薄灰・重なりを区別する',async()=>{
 const from='?topic=ethnicity&country=EGY&group=ethnicity-copts&year=2020';
 const app=await setup('population','?topic=religion&country=EGY&group=religion-christianity&year=2020&from='+encodeURIComponent(from),false,{width:1366,height:768});
 try{
  const {w,q}=app,left=q('.west-legend-subject'),keys=left.querySelectorAll('[data-west-settlement-source-key]');
  assert.equal(keys.length,17);assert.equal(left.querySelectorAll('[data-west-settlement-button]').length,0);
  assert.equal(left.querySelector('[data-west-settlement-source-key="ethnicity-copts"]').dataset.selected,'true');
  assert.equal(q('[data-west-source]').querySelectorAll('a[href$="west-asia-settlements-v1/manifest.json"]').length,2);assert.doesNotMatch(q('[data-west-source]').textContent,/自然環境資料/);
  assert.match(q('[data-west-settlement-reading]').textContent,/薄い灰色の背景.*濃い灰色.*重なり/);
  q('[data-west-settlement-button="religion-islam"]').click();await until(()=>q('[data-west-atlas]').dataset.ready==='true');
  const sourcePaths=q('[clip-path="url(#west-source-half)"]').querySelectorAll('path');assert.match([...sourcePaths].at(-1).querySelector('title').textContent,/コプト/);assert.equal([...sourcePaths].at(-1).getAttribute('stroke-width'),'2.2');
  assert.equal(new URL(q('[data-west-return]').href).searchParams.get('group'),'ethnicity-copts');assert.equal(new URL(w.location.href).searchParams.get('group'),'religion-islam');
 }finally{await app.w.happyDOM.close();}
 const rain=await setup('nature','?topic=climate&country=TUR&year=2020&from='+encodeURIComponent('?topic=precipitation&country=TUR&year=2020'),false,{width:1366,height:768});
 try{assert.match(rain.q('[data-west-source]').textContent,/左の元図.*気象庁 ClimatView/);assert.equal(rain.q('[data-west-source]').querySelectorAll('a').length,2);}finally{await rain.w.happyDOM.close();}
});

test('通常の気候16区分と人口密度全階級・時点は地図下の凡例に残り年操作と国選択で変わらない',async()=>{
 const climate=await setup('nature','?topic=climate&year=2020',false,{width:1366,height:768});
 try{
  const {w,q,select}=climate,verify=()=>{const legend=q('.atlas-map-column [data-west-legend]');assert.ok(legend);const keys=[...legend.querySelectorAll('[data-west-climate-key]')];assert.deepEqual(keys.map(x=>x.dataset.westClimateKey).sort(),regionalClasses.map(c=>c.code).sort());for(const c of regionalClasses){const key=keys.find(x=>x.dataset.westClimateKey===c.code);assert.equal(key.title,c.name);assert.ok(key.textContent.length>c.code.length);assert.equal(key.querySelector('i').getAttribute('style'),'background:'+c.color);}assert.match(legend.textContent,/全16区分.*1991–2020年/);const dictionary=q('[data-west-climate-dictionary]');assert.equal(dictionary.open,false);assert.ok(dictionary.closest('.atlas-map-column'));assert.equal(dictionary.querySelectorAll('.west-swatches span').length,30);};
  verify();select('[data-west-country]','TUR');await until(()=>q('[data-west-loading]').hidden);verify();q('[data-west-map]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));verify();q('[data-west-reading-overview]').click();verify();
 }finally{await climate.w.happyDOM.close();}
 const population=await setup('population','?topic=density&year=2024',false,{width:1366,height:768});
 try{
  const {w,q,select}=population,l=climateData.layers.find(x=>x.id==='population'),verify=()=>{const legend=q('.atlas-map-column [data-west-legend]');assert.ok(legend);assert.deepEqual([...legend.querySelectorAll('i')].slice(0,-1).map(x=>x.getAttribute('style')),l.colors.map(c=>'background:'+c));assert.equal(legend.querySelectorAll('i').length,l.colors.length+1);assert.match(legend.textContent,/人／km².*2020/);for(const b of l.breaks)assert.ok(legend.textContent.includes(b.toLocaleString('ja-JP')));assert.match(legend.textContent,/周辺国・未収録/);assert.equal(q('[data-west-stat-controls]').closest('[data-west-comparison]'),q('[data-west-comparison]'));assert.equal(w.document.querySelectorAll('[data-west-year]').length,1);};
  verify();for(const country of ['EGY','TUR']){select('[data-west-country]',country);await until(()=>q('[data-west-loading]').hidden);verify();}select('[data-west-year]','2020');await until(()=>q('[data-west-comparison] caption').textContent.includes('2020年'));verify();assert.equal(new URL(w.location.href).searchParams.get('year'),'2020');
 }finally{await population.w.happyDOM.close();}

});

test('水資源から実降水地点へ進み、元作物分布・地点・年・対象・履歴を保つ',async()=>{
 for(const source of ['wheat','barley']){
  const initial='?topic=climate&country=TUR&city=istanbul&year=2020&map=100,120,400,300&at=29,41&side=source&from='+encodeURIComponent('?topic='+source+'&country=TUR&year=2020');
  const app=await setup('nature',initial,false,{width:1366,height:768});
  try{
   const {w,q}=app,original=new URL(w.location.href).searchParams,view=q('[data-west-map]').getAttribute('viewBox');
   q('[data-west-standard-group="水資源"]').click();await until(()=>q('[data-west-loading]').hidden);
   const legacy=new URL(w.location.href);legacy.searchParams.set('topic','precipitation');w.history.replaceState({},'',legacy.href);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-atlas]').dataset.topic==='precipitation'&&q('[data-west-loading]').hidden);
   const saved=w.location.href,p=new URL(saved).searchParams;assert.equal(p.get('topic'),'precipitation');assert.equal(p.has('category'),false);
   for(const key of ['country','year','city','map','at','from','side'])assert.equal(p.get(key),original.get(key),key);
   assert.equal(q('[data-west-map]').getAttribute('viewBox'),view);assert.equal(q('[data-west-scene]').querySelectorAll('[data-city]').length,18);assert.ok(q('[data-west-return]'));
   assert.match(q('[data-west-detail]').textContent,/国平均|観測所/);assert.match(q('[data-west-legend]').textContent,/mm／年/);assert.ok(q('[data-west-comparison] [data-west-active-chart] svg'));
   const reload=await setup('nature',new URL(saved).search);try{assert.equal(reload.q('[data-west-city]').value,'istanbul');assert.equal(new URL(reload.q('[data-west-return]').href).searchParams.get('topic'),source);}finally{await reload.w.happyDOM.close();}
   w.history.replaceState({},'',initial);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-loading]').hidden);assert.equal(new URL(w.location.href).searchParams.get('topic'),'climate');
   w.history.replaceState({},'',saved);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-atlas]').dataset.ready==='true');assert.equal(q('[data-west-atlas]').dataset.topic,'precipitation');assert.equal(q('.west-subtabs [data-west-topic-button="precipitation"]'),null);
  }finally{await app.w.happyDOM.close();}
 }
});

test('農林業の概略凡例は品目と固定年を保ち、森林の参考画像と区別する',async()=>{
 const app=await setup('agriculture','?topic=wheat&country=TUR&year=2020',false,{width:1366,height:768});
 try{
  const {w,q,select}=app,verify=()=>{const legend=q('.atlas-map-column [data-west-legend]');assert.ok(legend);assert.equal(legend.querySelectorAll('i').length,6);for(const label of ['小麦','大麦','羊','山羊','牛'])assert.ok(legend.textContent.includes(label));assert.match(legend.textContent,/2020年の推計.*品目.*選択作物/);assert.match(legend.textContent,/正の推計なし・欠測/);assert.equal(w.document.querySelectorAll('[data-west-legend]').length,1);};
  verify();select('[data-west-country]','IRN');await until(()=>q('[data-west-loading]').hidden);verify();
  q('[data-west-standard-group="林業"]').click();await until(()=>q('[data-west-loading]').hidden);assert.equal(q('[data-west-legend]').querySelectorAll('i').length,2);assert.match(q('[data-west-legend]').textContent,/森林の参考分布（2020年）/);assert.equal(q('[data-west-cultivation="wheat"]').hidden,true);
  q('[data-west-standard-group="農畜産"]').click();await until(()=>q('[data-west-loading]').hidden);verify();assert.equal(q('[data-west-atlas]').dataset.topic,'farming-overview');assert.equal(q('[data-west-cultivation="wheat"]').hidden,true);
  q('[data-west-topic-button=wheat]').click();await until(()=>q('[data-west-farm-selected=wheat]'));assert.equal(q('[data-west-cultivation="wheat"]').hidden,false);
 }finally{await app.w.happyDOM.close();}
});

test('資料取得に失敗しても国と主題を切り替えられる',async()=>{
 const {w,q,select}=await setup('nature','',true);
 try{
  q('[data-west-group="水資源"]').click();q('[data-west-topic-button="basins"]').click();await until(()=>!q('[data-west-retry]').hidden);
  assert.match(q('[data-west-loading]').textContent,/読み込めません/);
  q('[data-west-group="気候区分"]').click();await until(()=>q('[data-west-loading]').hidden);
  select('[data-west-country]','SAU');assert.equal(q('[data-west-active-chart]'),null);select('[data-west-city]','riyadh');await until(()=>q('[data-west-climate-class]')?.textContent.includes('BWh'));assert.equal(q('[data-west-country]').value,'SAU');assert.match(q('[data-west-scope]').textContent,/サウジアラビア/);
 }finally{await w.happyDOM.close();}
});
test('直接指定された未収録年は保ち、主題切替時は実際の収録年を明示する',async()=>{
 const {w,q,select}=await setup('industry','?topic=oil&country=SAU&year=2024');
 try{
  assert.equal(q('[data-west-year]').value,'2024');assert.match(q('[data-west-detail]').textContent,/未収録/);
  q('[data-west-topic-button="gas"]').click();assert.equal(q('[data-west-year]').value,'2021');assert.match(q('[data-west-point]').textContent,/2021年へ切り替え/);assert.match(q('[data-west-detail]').textContent,/天然ガス資源レント/);
 }finally{await w.happyDOM.close();}
});

test('地域の気候から都市を選ぶと雨温図・説明を右に読み、地図の範囲は動かない',async()=>{
 const {w,q,select}=await setup('nature');
 try{
  assert.equal(q('[data-west-city]').value,'');assert.equal(q('[data-west-active-chart]'),null);
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-city]').length,18);const before=q('[data-west-map]').getAttribute('viewBox');
  select('[data-west-city]','riyadh');await until(()=>q('[data-west-point]').textContent.includes('BWh'));
  assert.match(q('[data-west-detail] .atlas-city-climate h3').textContent,/リヤド.*気候/);assert.ok(q('[data-west-detail] [data-west-active-chart] svg'));assert.ok(q('[data-west-detail] [data-city-numbers] table'));assert.equal(q('[data-west-comparison] [data-west-active-chart]'),null);
  q('[data-city="tehran"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>q('[data-west-point]').textContent.includes('テヘラン'));assert.equal(q('[data-west-map]').getAttribute('viewBox'),before);
  q('[data-west-group="気候区分"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await until(()=>q('[data-west-loading]').hidden);assert.equal(q('[data-west-group="水資源"]').getAttribute('aria-selected'),'true');assert.equal(q('[data-west-subgroup="水資源"]').hidden,false);
 }finally{await w.happyDOM.close();}
});

test('農林業の地図下の品目と栽培方法、人口の上部タブを切り替えられる',async()=>{
 const agriculture=await setup('agriculture');
 try{
  const {q}=agriculture;q('.west-agri-picker [data-west-topic-button="barley"]').click();
  assert.equal(q('[data-west-cultivation="barley"]').hidden,false);assert.equal(q('[data-west-cultivation="wheat"]').hidden,true);
  q('[data-west-topic-button="barley-rainfed"]').click();assert.equal(q('.west-agri-picker [data-west-topic-button="barley"]').getAttribute('aria-pressed'),'true');
  assert.match(q('[data-west-detail]').textContent,/天水栽培/);assert.equal(q('[data-west-comparison]').hidden,false);
  q('[data-west-standard-group="林業"]').click();assert.equal(q('.west-agri-picker [data-west-topic-button="forest"]').hidden,false);assert.equal(q('.west-agri-picker [data-west-topic-button="pasture"]').hidden,true);
  q('[data-west-standard-group="農畜産"]').click();assert.equal(q('.west-agri-picker [data-west-topic-button="pasture"]').hidden,false);assert.equal(q('.west-agri-picker [data-west-topic-button="forest"]').hidden,true);
 }finally{await agriculture.w.happyDOM.close();}
 const population=await setup('population');
 try{
  const {q}=population;q('.west-additional-topics').open=true;q('[data-west-topic-button="age-older"]').click();
  assert.equal(q('[data-west-topic-button="age-older"]').getAttribute('aria-pressed'),'true');assert.match(q('[data-west-detail]').textContent,/65歳以上/);
 }finally{await population.w.happyDOM.close();}
});

test('比較は元の分布・全凡例・対象名付き戻りと元の選択を保つ',async()=>{
 const source=await setup('agriculture','?topic=wheat-rainfed&country=IRN&city=tehran&year=2020&map=100,120,400,300&at=51.4,35.7');
 let comparison;
 try{
  const link=source.q('[data-west-compare="climate"]');assert.ok(link);
  comparison=await setup('nature',new URL(link.href).search);const {w,q}=comparison;
  await until(()=>q('[data-west-climate-class]')?.textContent.match(/^[ABCDE][A-Za-z]/));
  assert.equal(q('[data-west-atlas]').dataset.comparing,'true');
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-raster]').length,1);
  assert.equal(q('[data-west-source-clip]').getAttribute('width'),'200');
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-farm-context]').length,5);
  assert.ok(q('[data-west-farm-selected="wheat-rainfed"]'));
  assert.equal(q('[data-west-legend]').querySelectorAll('.west-legend-subject').length,2);
  assert.match(q('[data-west-legend]').textContent,/小麦・天水栽培/);
  assert.equal(q('.west-complete-key .west-swatches').querySelectorAll('span').length,30);
  assert.match(q('[data-west-detail]').textContent,/栽培時期/);
  assert.match(q('[data-west-return]').textContent,/小麦・天水栽培へ戻る/);
  const back=new URL(q('[data-west-return]').href);
  for(const [key,value] of Object.entries({topic:'wheat-rainfed',country:'IRN',city:'tehran',year:'2020',map:'100,120,400,300',at:'51.4,35.7'}))assert.equal(back.searchParams.get(key),value,key);
  const slider=q('[data-west-split]');slider.value='70';slider.dispatchEvent(new w.Event('input'));
  assert.equal(q('[data-west-source-clip]').getAttribute('width'),'280');
  assert.equal(q('[data-west-target-clip]').getAttribute('width'),'120');
  q('[data-west-group="地形"]').click();await until(()=>q('[data-west-loading]').hidden);
  assert.equal(q('[data-west-swipe]').hidden,true);assert.equal(q('[data-west-return]'),null);
  assert.equal(new URL(w.location.href).searchParams.has('from'),false);
 }finally{await source.w.happyDOM.close();if(comparison)await comparison.w.happyDOM.close();}
});

test('都市中心部の固定範囲・3時点人口は全列下に一つだけあり都市と履歴へ同期する',async()=>{
 const [first,second]=climateData.urban.cities.slice(0,2),app=await setup('population','?topic=cities&country='+first.countryCode+'&urban='+first.id+'&year=2020');
 try{
  const {w,q,select}=app,stats=q('[data-west-comparison]');
  const verify=city=>{assert.equal(stats.hidden,false);assert.equal(stats.parentElement,q('[data-atlas-shell]'));assert.equal(q('[data-west-detail] table'),null);assert.equal(w.document.querySelectorAll('[data-west-urban-statistics]').length,1);assert.match(stats.querySelector('h2').textContent,new RegExp(city.name));assert.deepEqual([...stats.querySelectorAll('tbody tr')].map(tr=>[tr.cells[0].textContent,tr.cells[1].textContent]),Object.entries(city.history).map(([year,value])=>[year+'年',value.toLocaleString('ja-JP',{maximumFractionDigits:0})+'人']));assert.match(stats.textContent,/2025年の範囲/);assert.match(stats.textContent,/km²/);assert.match(stats.querySelector('caption').textContent,/JRC UCDB R2024A/);};
  verify(first);const before=w.location.href;select('[data-west-country]','');select('[data-west-urban]',second.id);await until(()=>q('[data-west-loading]').hidden);verify(second);assert.equal(new URL(w.location.href).searchParams.get('urban'),second.id);
  const view=q('[data-west-map]').getAttribute('viewBox'),url=w.location.href;q('[data-west-reading-overview]').click();verify(second);assert.equal(q('[data-west-map]').getAttribute('viewBox'),view);assert.equal(w.location.href,url);
  w.history.replaceState({},'',before);w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-loading]').hidden);verify(first);assert.equal(q('[data-west-urban]').value,first.id);
  q('[data-west-standard-group="人口分布"]').click();await until(()=>q('[data-west-loading]').hidden);assert.equal(q('[data-west-urban-statistics]'),null);assert.equal(stats.parentElement,q('[data-atlas-shell]'));
 }finally{await app.w.happyDOM.close();}
});

test('比較で系列の収録年が異なる場合も元の年へ戻り、不正な比較元を採用しない',async()=>{
 const source=await setup('industry','?topic=manufacturing&country=SAU&year=2024');let comparison;
 try{
  comparison=await setup('industry',new URL(source.q('[data-west-compare="oil"]').href).search);
  assert.equal(comparison.q('[data-west-year]').value,'2021');
  assert.match(comparison.q('[data-west-legend]').textContent,/2024年/);
  assert.match(comparison.q('[data-west-legend]').textContent,/2021年/);
  assert.equal(new URL(comparison.q('[data-west-return]').href).searchParams.get('year'),'2024');
 }finally{await source.w.happyDOM.close();if(comparison)await comparison.w.happyDOM.close();}
 const invalid=await setup('nature','?topic=climate&from='+encodeURIComponent('?topic=oil&country=XXX&year=1800'));
 try{assert.equal(invalid.q('[data-west-atlas]').dataset.comparing,'false');assert.equal(invalid.q('[data-west-return]'),null);}finally{await invalid.w.happyDOM.close();}
});

test('比較の戻りは選択都市の雨温図より先にあり、都市を自動選択せず比較元も変えない',async()=>{
 const source=await setup('agriculture','?topic=wheat&country=TUR&year=2020');let comparison;
 try{
  comparison=await setup('nature',new URL(source.q('[data-west-compare="climate"]').href).search);
  const {w,q,select}=comparison,back=q('[data-west-return]');assert.equal(q('[data-west-active-chart]'),null);assert.match(back.textContent,/トルコ/);
  const id=[...q('[data-west-city]').options].find(o=>o.value)?.value;select('[data-west-city]',id);await until(()=>q('[data-west-point]').textContent.includes('東経'));
  const chart=q('.west-reading [data-west-active-chart]');assert.ok(chart);assert.ok(q('[data-west-return]').compareDocumentPosition(chart)&w.Node.DOCUMENT_POSITION_FOLLOWING);assert.equal(new URL(q('[data-west-return]').href).searchParams.has('city'),false);
 }finally{await source.w.happyDOM.close();if(comparison)await comparison.w.happyDOM.close();}
});

test('比較の全凡例・詳細操作は幅変更と通常主題への復帰で欠落も複製も起こさない',async()=>{
 const from='?topic=wheat&country=TUR&year=2020&map=100,120,400,300';
 const {w,q,media,select}=await setup('nature','?topic=climate&country=TUR&year=2020&from='+encodeURIComponent(from),false,{width:1180,height:757});
 try{
  const root=q('[data-west-atlas]'),legend=q('[data-west-legend]'),extras=q('[data-west-map-extras]'),agri=q('[data-west-agri-switches]'),stats=q('[data-west-stat-controls]');
  const dictionary=()=>q('[data-west-climate-dictionary]');
  const labels=()=>[...dictionary().querySelectorAll('.west-swatches span')].map(x=>x.textContent).sort();
  const marks=()=>[...dictionary().querySelectorAll('.west-swatches span')].map(x=>x.textContent+'|'+x.querySelector('i').getAttribute('style')).sort();
  const expected=labels(),expectedMarks=marks(),view=q('[data-west-map]').getAttribute('viewBox');
  const classes=climateData.classes;
  for(const c of classes)assert.ok(expected.includes(c.code+' '+c.name),c.code);
  assert.equal(classes.length,30);assert.match(legend.textContent,/2020年の推計.*品目.*選択作物/);assert.match(legend.textContent,/1991–2020年/);
  assert.match(legend.textContent,/周辺国・未収録/);assert.match(legend.textContent,/雨温図の都市/);
  assert.equal(dictionary().open,false);assert.ok(dictionary().closest('[data-west-more-reading]'));
  const unique=(climate=true)=>{for(const selector of ['[data-west-legend]','[data-west-map-extras]','[data-west-agri-switches]','[data-west-stat-controls]','[data-west-reading-extra]'])assert.equal(w.document.querySelectorAll(selector).length,1,selector);assert.equal(root.querySelectorAll('[data-west-climate-dictionary]').length,climate?1:0);};
  assert.equal(root.dataset.comparisonWorkspace,'true');assert.ok(legend.closest('[data-west-comparison-key]'));assert.ok(stats.closest('[data-west-more-reading]'));assert.ok(extras.closest('[data-west-more-map]'));
  assert.equal(q('[data-west-comparison-details]').open,false);unique();
  // HappyDOM starts each change listener at false instead of its initial match.
  // Dispatch the native MQL event explicitly; the real-browser flow verifies it naturally.
  const resize=(width,height)=>{w.happyDOM.setWindowSize({width,height});w.dispatchEvent(new w.Event('resize'));for(const mql of media)mql.dispatchEvent(new w.MediaQueryListEvent('change',{matches:mql.matches,media:mql.media}));};
  resize(600,844);await until(()=>root.dataset.comparisonWorkspace==='false');
  assert.ok(legend.closest('.atlas-map-column'));assert.ok(extras.closest('.atlas-map-column'));assert.ok(agri.closest('.atlas-map-column'));assert.ok(stats.closest('.west-reading'));assert.equal(q('[data-west-comparison-details]').hidden,true);
  assert.deepEqual(labels(),expected);assert.deepEqual(marks(),expectedMarks);unique();
  resize(1366,768);await until(()=>root.dataset.comparisonWorkspace==='true');
  assert.deepEqual(labels(),expected);assert.deepEqual(marks(),expectedMarks);assert.ok(legend.closest('[data-west-comparison-key]'));unique();
  select('[data-west-year]','2024');assert.equal(new URL(w.location.href).searchParams.get('year'),'2024');assert.equal(new URL(q('[data-west-return]').href).searchParams.get('year'),'2020');
  q('[data-west-group="地形"]').click();await until(()=>q('[data-west-loading]').hidden);
  assert.equal(root.dataset.comparisonWorkspace,'false');assert.equal(new URL(w.location.href).searchParams.has('from'),false);
  assert.ok(legend.closest('.atlas-map-column'));assert.ok(stats.closest('[data-west-comparison]'));assert.ok(extras.closest('.atlas-map-column'));assert.ok(agri.closest('.atlas-map-column'));
  assert.equal(q('[data-west-map]').getAttribute('viewBox'),view);assert.equal(q('[data-west-country]').value,'TUR');assert.ok(q('[data-west-reading-extra]').closest('[data-west-detail]'));
  assert.equal(q('[data-west-more-reading]').children.length,0);assert.equal(q('[data-west-more-map]').children.length,0);unique(false);
 }finally{await w.happyDOM.close();}
});

test('比較詳細内の資料失敗は閉じたパネルを開き再試行へ到達できる',async()=>{
 const initial='?topic=wheat-rainfed&country=TUR&year=2020&from='+encodeURIComponent('?topic=climate&country=TUR&year=2020');
 const failed='?topic=wheat-irrigated&country=TUR&year=2020&from='+encodeURIComponent('?topic=basins&country=TUR&year=2020');
 const {w,q}=await setup('agriculture',initial,true,{width:1180,height:757});
 try{
  const more=q('[data-west-comparison-details]'),retry=q('[data-west-retry]');
  assert.equal(more.open,false);assert.ok(more.contains(retry));
  w.history.replaceState({},'',failed);w.dispatchEvent(new w.PopStateEvent('popstate'));
  await until(()=>!retry.hidden);
  assert.equal(q('[data-west-atlas]').dataset.comparing,'true');
  assert.match(q('[data-west-loading]').textContent,/読み込めません/);assert.ok(more.contains(retry));assert.equal(more.open,true);
  w.history.replaceState({},'',initial);w.dispatchEvent(new w.PopStateEvent('popstate'));
  await until(()=>q('[data-west-loading]').hidden);
  assert.equal(retry.hidden,true);assert.equal(more.hidden,false);assert.ok(more.contains(retry));
 }finally{await w.happyDOM.close();}
});

test('比較横配置はニュースによる実作業幅の変更へ追随し選択と凡例を保つ',async()=>{
 const {w,q,notifyResize}=await setup('nature','?topic=climate&country=TUR&year=2020&from='+encodeURIComponent('?topic=wheat&country=TUR&year=2020'),false,{width:1366,height:768});
 try{
  const root=q('[data-west-atlas]'),grid=q('.atlas-primary-grid'),view=q('[data-west-map]').getAttribute('viewBox'),url=w.location.href;
  const keys=()=>[...q('[data-west-legend]').querySelectorAll('i')].map(x=>x.getAttribute('style')).sort();const expected=keys();
  let width=984;grid.getBoundingClientRect=()=>({width,top:249});
  for(const [available,columns] of [[984,'true'],[916,'true'],[884,'true'],[883,'false'],[873,'false'],[1050,'true']]){
   width=available;notifyResize('.atlas-primary-grid');assert.equal(root.dataset.comparisonColumns,columns);
   assert.equal(w.innerWidth,1366);assert.equal(w.location.href,url);assert.equal(q('[data-west-map]').getAttribute('viewBox'),view);assert.deepEqual(keys(),expected);
  }
  width=884;grid.style.padding='0 7px';notifyResize('.atlas-primary-grid');assert.equal(root.dataset.comparisonColumns,'false','外寸ではなくpaddingを除いた作業幅を使う');
  grid.style.padding='';notifyResize('.atlas-primary-grid');assert.equal(root.dataset.comparisonColumns,'true');
 }finally{await w.happyDOM.close();}
});

test('比較の常時気候凡例は描画格子の全実在区分を意味付きで保持し、正式30区分辞書は閉じる',async()=>{
 assert.equal(regionalClasses.length,16);assert.ok(regionalClasses.some(c=>c.code==='Cwb'),'4セルの区分も落とさない');
 for(const [route,target,source] of [['nature','climate','wheat'],['agriculture','wheat-rainfed','climate']]){
  const from='?topic='+source+'&country=TUR&year=2020';
  const {w,q,select,notifyResize}=await setup(route,'?topic='+target+'&country=TUR&year=2020&from='+encodeURIComponent(from),false,{width:1180,height:757});
  try{
   const keys=()=>[...q('[data-west-legend]').querySelectorAll('[data-west-climate-key]')];
   const expected=regionalClasses.map(c=>c.code).sort();
   assert.deepEqual(keys().map(x=>x.dataset.westClimateKey).sort(),expected,'PNGと同じ国境mask格子の全区分');
   for(const c of regionalClasses){const key=keys().find(x=>x.dataset.westClimateKey===c.code);assert.equal(key.title,c.name);assert.ok(key.textContent.length>c.code.length+1,'略号だけを表示しない');assert.equal(key.querySelector('i').getAttribute('style'),'background:'+c.color);}
   const dictionary=q('[data-west-climate-dictionary]');assert.equal(dictionary.open,false);assert.ok(dictionary.closest('[data-west-comparison-details]'));
   assert.match(q('[data-west-comparison-details]>summary').textContent,/全30気候区分の辞書/);
   assert.equal(dictionary.querySelectorAll('.west-swatches>span').length,30);
   for(const c of climateData.classes)assert.ok(dictionary.textContent.includes(c.code+' '+c.name));
   assert.match(q('[data-west-legend]').textContent,/1991–2020年/);assert.match(q('[data-west-legend]').textContent,/2020年の推計.*品目.*選択作物/);assert.match(q('[data-west-legend]').textContent,/周辺国・未収録/);
   const svg=q('[data-west-map]');
   for(const [screenWidth,screenHeight] of [[500,420],[500,800]]){
    Object.defineProperties(svg,{clientWidth:{value:screenWidth,configurable:true},clientHeight:{value:screenHeight,configurable:true}});notifyResize('[data-west-map]');
    for(const percent of [40,60]){
    const slider=q('[data-west-split]');slider.value=String(percent);slider.dispatchEvent(new w.Event('input'));
    const [vx,vy,vw,vh]=svg.getAttribute('viewBox').split(' ').map(Number),k=Math.max(vw/screenWidth,vh/screenHeight),ox=(screenWidth-vw/k)/2,oy=(screenHeight-vh/k)/2,boundary=ox+vw*percent/100/k;
    let visible=0;
    for(const marker of q('[data-west-scene]').querySelectorAll('[data-marker]')){
     const label=marker.querySelector('[data-marker-label]');if(label.style.display==='none')continue;visible++;
     const translate=label.getAttribute('transform').match(/^translate\(([^,]+),([^)]*)\)$/),left=(Number(marker.dataset.x)-vx)/k+ox+Number(translate[1]),right=left+Number(label.dataset.width),top=(Number(marker.dataset.y)-vy)/k+oy+Number(translate[2]),bottom=top+Number(label.querySelector('rect').getAttribute('height'));
     const min=marker.dataset.markerSide==='target'?boundary:ox,max=marker.dataset.markerSide==='source'?boundary:ox+vw/k;
     assert.ok(left>=min-0.01&&right<=max+0.01,'都市名を余白ではなく実投影された分布側に収める');
     assert.ok(top>=oy-0.01&&bottom<=oy+vh/k+0.01,'上下の余白でも地理クリップ端で都市名を切らない');
    }
    assert.ok(visible>0,'境界を動かしても読める都市名が残る');
    }
   }
   select('[data-west-country]','IRN');await until(()=>q('[data-west-loading]').hidden);assert.deepEqual(keys().map(x=>x.dataset.westClimateKey).sort(),expected,'国の選択で地域の凡例を減らさない');
   const query=new URL(w.location.href).searchParams;query.set('map','100,120,400,300');w.history.replaceState({},'','?'+query.toString());w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>q('[data-west-loading]').hidden);
   assert.deepEqual(keys().map(x=>x.dataset.westClimateKey).sort(),expected,'表示範囲を変えても地域の凡例を減らさない');
  }finally{await w.happyDOM.close();}
 }
});

test('比較の地点格子取得失敗は閉じた詳細を開き対象名付きエラーから再試行できる',async()=>{
 let rejectGrid,broken=true;const pending=new Promise((_,reject)=>{rejectGrid=reject;});
 const query='?topic=wheat-rainfed&country=TUR&year=2020&at=35,39&side=source&from='+encodeURIComponent('?topic=climate&country=TUR&year=2020');
 const {w,q}=await setup('agriculture',query,false,{width:1180,height:757},{fetch:url=>broken&&url.endsWith('climate.values.gz')?pending:undefined});
 try{
  const more=q('[data-west-comparison-details]'),view=q('[data-west-map]').getAttribute('viewBox'),before=w.location.href;more.open=false;
  rejectGrid(Error('Test: point grid unavailable'));await until(()=>!q('[data-west-retry]').hidden);
  assert.equal(more.open,true);assert.equal(q('[data-west-loading]').hidden,false);assert.match(q('[data-west-loading]').textContent,/選択地点・気候区分/);
  assert.match(q('[data-west-point]').textContent,/読み込めません/);assert.ok(more.contains(q('[data-west-retry]')));
  broken=false;q('[data-west-retry]').click();await until(()=>q('[data-west-loading]').hidden&&q('[data-west-retry]').hidden&&!q('[data-west-point]').textContent.includes('読み込んでいます'));
  assert.doesNotMatch(q('[data-west-point]').textContent,/読み込めません/);assert.equal(w.location.href,before);assert.equal(q('[data-west-map]').getAttribute('viewBox'),view);assert.equal(q('[data-west-atlas]').dataset.comparing,'true');
 }finally{await w.happyDOM.close();}
});

test('比較の気候格子decode失敗を再試行し、都市の未選択とURLを保つ',async()=>{
 let broken=true;
 const {w,q}=await setup('nature','?topic=climate&country=TUR&year=2020&from='+encodeURIComponent('?topic=wheat&country=TUR&year=2020'),false,{width:1180,height:757},{expectFailure:true,fetch:url=>broken&&url.endsWith('climate.values.gz')?new Response('invalid grid'):undefined});
 try{
  const more=q('[data-west-comparison-details]'),before=w.location.href;
  assert.equal(more.open,true);assert.equal(q('[data-west-loading]').hidden,false);assert.ok(more.contains(q('[data-west-retry]')));
  broken=false;q('[data-west-retry]').click();await until(()=>q('[data-west-loading]').hidden&&q('[data-west-retry]').hidden);
  assert.equal(q('[data-west-city]').value,'');assert.equal(q('[data-west-active-chart]'),null);
  assert.equal(more.open,false);assert.equal(w.location.href,before);assert.equal(q('[data-west-country]').value,'TUR');assert.equal(q('[data-west-year]').value,'2020');
 }finally{await w.happyDOM.close();}
});


test('農畜産分布の格子取得失敗から同じ品目・比較・地点へ再試行できる',async()=>{
 let broken=true;
 const query='?topic=climate&country=TUR&year=2020&at=35,39&side=source&map=100,120,400,300&from='+encodeURIComponent('?topic=wheat&country=TUR&year=2020');
 const {w,q}=await setup('nature',query,false,{width:1180,height:757},{expectFailure:true,fetch:url=>broken&&url.endsWith('wheat.values.gz')?Promise.reject(Error('Test: farming grid unavailable')):undefined});
 try{
  const before=w.location.href;
  assert.match(q('[data-west-loading]').textContent,/資料を読み込めません/);
  assert.equal(q('[data-west-atlas]').dataset.ready,'false');
  broken=false;q('[data-west-retry]').click();
  await until(()=>q('[data-west-loading]').hidden&&q('[data-west-retry]').hidden);
  await until(()=>q('[data-west-point]').textContent.includes('ha'));
  assert.equal(w.location.href,before);assert.equal(q('[data-west-map]').getAttribute('viewBox'),'100 120 400 300');
  assert.equal(q('[data-west-atlas]').dataset.comparing,'true');
  assert.equal(q('[data-west-scene]').querySelectorAll('[data-west-farm-context]').length,5);
 }finally{await w.happyDOM.close();}
});
