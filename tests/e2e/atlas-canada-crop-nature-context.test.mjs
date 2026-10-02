import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {bundleCanadaCropComparison as bundle} from '../fixtures/bundle-canada-crop-comparison.mjs';
const browserCode=await bundle('src/scripts/atlas-canada-crop-nature-comparison.ts',{globalName:'CropNature'});
const helperCode=await bundle('src/lib/atlas-canada-crop-comparison.ts',{platform:'node',format:'esm'});
const natureCode=await bundle('src/lib/atlas-canada-nature.ts',{platform:'node',format:'esm'});
const mapCode=await bundle('src/lib/atlas-canada-census-map.ts',{platform:'node',format:'esm'});
const load=code=>import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const {buildCanadaCropNatureUrl:toNature,readCanadaCropComparison:read}=await load(helperCode);
const {writeCanadaNatureState:writeNature}=await load(natureCode);
const {canadaCensusPath}=await load(mapCode);
const census=JSON.parse(await readFile('src/data/atlas/canada/census-agriculture.json','utf8'));
const geometry=JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/ccs.geojson','utf8'));
const root='/insight-journal/atlas/north-america/canada/';
const natureState={city:'regina',compare:null,view:'climate',water:null,only:false,frame:null};
const selectedId='2021S05024810036';
function source(crop,map='beef'){
 const url=new URL('https://example.com'+root+(crop==='wheat'?'agriculture/wheat/':crop==='beef'?'agriculture/beef/':'agriculture/')+(crop==='beef'?`?year=2026&province=Ontario&compare=Quebec&metric=dairy&map=${map}&zoom=1`:'?year=2025&province=Alberta&compare=Manitoba&metric=production&zoom=1'));
 url.searchParams.set('ccs',selectedId);url.searchParams.set('ccsOnly','1');url.searchParams.set('ccsBounds','-115,51,-108,57');return url;
}
function fixture(url){
 const w=new Window({url:url.href,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const representative=new Set([selectedId,...['canola','wheat','beef','pasture','hay'].flatMap(id=>['quality-f','not-covered','published'].map(status=>Object.entries(census.records).find(([,r])=>r.cells[id].status===status&&(status!=='published'||r.cells[id].value===0))?.[0]).filter(Boolean))]);
 const paths=geometry.features.filter(f=>representative.has(f.properties.DGUID)).map(f=>`<path data-canada-census-shape="${f.properties.DGUID}" d="${canadaCensusPath(f.geometry)}" aria-pressed="false"></path>`).join('');
 w.document.write(`<article data-canada-nature>
 <a data-canada-crop-return href="https://unsafe.example/">old return</a>
 <section data-canada-crop-source hidden><h2 data-canada-crop-map-title></h2><div data-canada-crop-native-slot><div data-canada-crop-gis>
 <section data-canada-census hidden><span data-canada-census-product-title></span><div data-canada-census-stage><svg data-canada-census-fallback viewBox="0 0 900 580"><title data-canada-census-map-title></title><desc></desc>${paths}<g data-canada-census-fallback-labels></g></svg><div data-canada-census-live hidden></div><select data-canada-census-region><option value=""></option>${Object.entries(census.records).map(([id,r])=>`<option value="${id}">${r.name}</option>`).join('')}</select><button data-canada-census-reset></button><button data-canada-census-zoom="in"></button><button data-canada-census-zoom="out"></button><button data-canada-census-focus></button></div>
 <div data-canada-census-legend><strong data-canada-census-legend-title></strong><ul data-canada-census-scale></ul><ul><li>非公表 F</li><li>対象外・未収録</li></ul></div><input type="checkbox" data-canada-census-only /><p data-canada-census-status></p><p data-canada-census-definition></p><a data-canada-census-table-source></a><script type="application/json" data-canada-census-config></script></section>
 <section data-canada-census-reading hidden><h3 data-canada-census-reading-title></h3><p data-canada-census-reading-value></p><p data-canada-census-reading-quality></p><p data-canada-census-reading-components></p><p data-canada-census-reading-id></p><a data-canada-census-reading-source></a></section>
 </div></div><p data-canada-crop-map-key></p></section>
 <svg data-canada-map viewBox="0 0 900 580"><g data-canada-land></g></svg>
 <section data-canada-crop-context hidden><h2 data-canada-crop-context-title></h2><p data-canada-crop-context-text></p><p data-canada-crop-scope></p><div data-canada-crop-mini hidden></div><details><summary>年・対象・出典</summary><p data-canada-crop-origin></p><p data-canada-crop-mechanism></p></details></section>
 </article>`);
 const q=selector=>w.document.querySelector(selector);
 q('[data-canada-census-config]').textContent=JSON.stringify({geometry:{url:root.replace(/\/atlas\/.*/, '')+census.geometry.url},records:census.records,products:census.products,productId:'canola',context:{type:'FeatureCollection',features:[]},workerUrl:'/worker.js',geographicLabels:[],patternF:'test-f',patternMissing:'test-missing'});
 w.eval(browserCode);
 return{w,q,render:state=>w.eval(`CropNature.renderCanadaCropNatureComparison(document.querySelector('[data-canada-nature]'),${JSON.stringify(state)});`)};
}
function assertNativeKey(q,comparison){
 const legend=q('[data-canada-census-legend]');assert.equal(legend.querySelectorAll('li').length,8);assert.match(legend.textContent,/2021/);assert.ok(legend.textContent.includes(comparison.product.label));assert.ok(legend.textContent.includes(comparison.product.unit));assert.match(legend.textContent,/0 .*非公表 F.*対象外・未収録/s);
 assert.equal(q('[data-canada-census-table-source]').href,comparison.product.sourceTableUrl);assert.equal(q('[data-canada-crop-gis]').querySelectorAll('img,image').length,0);
 assert.equal(q('[data-canada-census-region]').value,comparison.censusState.selected??'');assert.equal(q('[data-canada-census-only]').checked,comparison.censusState.only);
}

test('All five climate comparisons use selectable official GIS data and eight quantitative/missing keys with complete annual/CCS returns',async()=>{
 for(const [crop,mapId]of [['canola'],['wheat'],['beef','beef'],['beef','pasture'],['beef','hay']]){
  const initial=toNature(source(crop,mapId),crop),comparison=read(initial),{w,q,render}=fixture(initial);
  try{
   assert.equal(render(natureState),true);assert.equal(q('[data-canada-crop-source]').hidden,false);assert.equal(q('[data-canada-crop-context]').hidden,false);assert.equal(q('[data-canada-crop-mini]').hidden,true);assert.equal(q('[data-canada-census]').hidden,false);
   assert.equal(q('[data-canada-crop-native-slot]').contains(q('[data-canada-crop-gis]')),true);assertNativeKey(q,comparison);
   assert.equal(q('[data-canada-crop-return]').href,comparison.returnUrl.href);assert.equal(q('[data-canada-crop-return]').textContent,comparison.returnLabel);assert.match(q('[data-canada-crop-return]').textContent,/Vermilion River County.*4810036/);
   assert.equal(q('[data-canada-crop-context-title]').textContent,comparison.product.label+'とReginaの季節を比べる');assert.match(q('[data-canada-census-reading-value]').textContent,/2021年/);assert.match(q('[data-canada-census-reading-title]').textContent,/Vermilion River County/);
   const origin=q('[data-canada-crop-origin]').textContent;assert.ok(origin.includes(comparison.sourceLabel));assert.ok(origin.includes(comparison.product.definition));assert.equal(q('[data-canada-crop-origin]').querySelector('[data-canada-crop-original-source]').href,comparison.selectedMap.source);
   if(mapId==='hay')assert.match(origin,/2成分.*5,394,265 ha.*定義が異な/);
   assert.match(q('[data-canada-crop-scope]').textContent,/2021年.*1991–2020.*Reginaは1地点.*地域平均・土壌水分ではありません/s);
   const short=q('[data-canada-crop-context-text]').textContent;assert.match(short,/Regina.*気温・降水.*季節配分.*申告値の場所/s);assert.ok(short.includes(comparison.product.label));
   const mechanism=q('[data-canada-crop-mechanism]');assert.equal(mechanism.closest('details').open,false);assert.match(mechanism.textContent,/Regina.*サスカチュワン州.*季節.*プレーリー.*地域別申告値/s);
   assert.match(mechanism.textContent,crop==='beef'?/草が育つ季節.*冬.*放牧.*貯蔵飼料.*繁殖.*育成.*肥育/s:crop==='wheat'?/春播き.*秋播き.*越冬.*播種.*土壌水分.*刈株/s:/夏の熱.*根が使える水.*品種.*輪作.*排水/s);
  }finally{await w.happyDOM.close();}
 }
});

test('Landform and water keep the same GIS DOM and selections in the right column while nature controls and history stay independent',async()=>{
 for(const crop of ['canola','wheat','beef']){
  const initial=toNature(source(crop,'hay'),crop),comparison=read(initial),{w,q,render}=fixture(initial);
  try{
   render(natureState);const host=q('[data-canada-crop-gis]'),fallback=q('[data-canada-census-fallback]');
   for(const view of ['landform','water']){
    const state={...natureState,city:'winnipeg',compare:'ottawa',view,water:view==='water'?'St. Lawrence':null,only:view==='water',frame:[150,200,300,200]};
    w.history.pushState(null,'',writeNature(new URL(w.location.href),state).href);assert.equal(render(state),true);assert.equal(q('[data-canada-crop-source]').hidden,true);assert.equal(q('[data-canada-crop-mini]').hidden,false);assert.equal(q('[data-canada-crop-mini]').contains(host),true);assert.equal(q('[data-canada-census-fallback]'),fallback);assertNativeKey(q,comparison);assert.deepEqual(read(new URL(w.location.href)).censusState,comparison.censusState);assert.deepEqual(read(new URL(w.location.href)).state,comparison.state);
    assert.equal(q('[data-canada-map]').querySelectorAll('image').length,0);const text=q('[data-canada-crop-context-text]').textContent,mechanism=q('[data-canada-crop-mechanism]').textContent;assert.ok(text.includes(comparison.product.label));
    if(view==='water'){assert.match(q('[data-canada-crop-scope]').textContent,/2021年.*Natural Earth v5\.1\.2.*流量の測定ではありません/s);assert.doesNotMatch(q('[data-canada-crop-scope]').textContent,/気候1991/);assert.match(text,/St\. Lawrenceだけ.*位置.*地域別申告値.*位置は使える水量を示しません/s);assert.match(mechanism,/St\. Lawrenceだけ.*地域別申告値.*水域の位置.*管理/s);assert.match(mechanism,crop==='beef'?/草地・家畜が使える水量.*放牧・冬飼料/s:/畑の土壌水分.*根が使える水と排水/s);}
    else{assert.match(q('[data-canada-crop-scope]').textContent,/2021年.*地形GIS公開2019年.*標高・農地ではありません/s);assert.doesNotMatch(q('[data-canada-crop-scope]').textContent,/気候1991/);assert.match(text,/地形地域の位置.*地域別申告値/s);assert.match(mechanism,crop==='beef'?/プレーリーの平原.*西部の山地.*地域別申告値.*放牧の頭数・期間.*冬の貯蔵飼料の管理/s:/プレーリー南部の地域別申告面積.*内陸平原と山地.*生育条件.*播種・収穫・貯蔵.*人の管理/s);}
   }
   w.history.replaceState(null,'',initial.href);w.dispatchEvent(new w.PopStateEvent('popstate'));render(natureState);assert.equal(q('[data-canada-crop-native-slot]').contains(host),true);assert.equal(q('[data-canada-crop-mini]').childElementCount,0);assert.equal(q('[data-canada-crop-return]').href,comparison.returnUrl.href);
  }finally{await w.happyDOM.close();}
 }
});

test('Real GIS controls save changed CCS/F/zero/uncovered selection, only-filter and camera in cropReturn without changing the source annual question',async()=>{
 const initial=toNature(source('canola'),'canola'),before=read(initial),{w,q,render}=fixture(initial);
 try{
  render(natureState);const host=q('[data-canada-crop-gis]');
  for(const type of ['zero','quality-f','not-covered']){
   const [id,r]=Object.entries(census.records).find(([,r])=>type==='zero'?r.cells.canola.value===0:r.cells.canola.status===type);
   const select=q('[data-canada-census-region]');select.value=id;select.dispatchEvent(new w.Event('change',{bubbles:true}));const after=read(new URL(w.location.href));assert.equal(after.censusState.selected,id);assert.deepEqual(after.state,before.state);assert.ok(q('[data-canada-crop-return]').textContent.includes(r.name));
   const reading=q('[data-canada-census-reading-value]').textContent,quality=q('[data-canada-census-reading-quality]').textContent;if(type==='zero')assert.match(reading,/0 ha/);if(type==='quality-f'){assert.match(reading,/非公表/);assert.match(quality,/非公表.*F/);}if(type==='not-covered'){assert.match(reading,/対象外・未収録/);assert.match(quality,/対象外・未収録.*ゼロではありません/);}
  }
  const only=q('[data-canada-census-only]');only.checked=true;only.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(read(new URL(w.location.href)).censusState.only,true);
  host.dispatchEvent(new w.CustomEvent('canada-census-camera',{detail:{bounds:[-120,48,-100,60]},bubbles:true}));assert.deepEqual(read(new URL(w.location.href)).censusState.bounds,[-120,48,-100,60]);assert.equal(new URL(q('[data-canada-crop-return]').href).searchParams.get('ccsBounds'),'-120,48,-100,60');
  q('[data-canada-census-reset]').click();assert.deepEqual(read(new URL(w.location.href)).censusState,{selected:null,only:false,bounds:null});assert.deepEqual(read(new URL(w.location.href)).state,before.state);
  w.history.replaceState(null,'',initial.href);render(natureState);assert.deepEqual(read(new URL(w.location.href)).censusState,before.censusState);assertNativeKey(q,before);
 }finally{await w.happyDOM.close();}
});

test('A non-Prairie observation keeps the original Regina question and states the single-station limit',async()=>{
 const {w,q,render}=fixture(toNature(source('canola'),'canola'));
  try{render({...natureState,city:'vancouver'});assert.match(q('[data-canada-crop-context-text]').textContent,/現在はVancouver.*元の問い.*Regina.*地域分布/s);assert.match(q('[data-canada-crop-scope]').textContent,/2021年.*1991–2020.*Vancouverは1地点.*地域平均・土壌水分ではありません/s);assert.match(q('[data-canada-crop-mechanism]').textContent,/現在の地点はVancouver.*元の問いはRegina.*夏の熱・水.*生育・成熟.*品種・輪作・排水の管理/s);}finally{await w.happyDOM.close();}
});

test('Invalid or external comparison destroys the GIS controller and clears all unsafe returns and context, then safely reopens',async()=>{
 const initial=toNature(source('beef','pasture'),'beef'),{w,q,render}=fixture(initial);
 try{
  for(const [crop,raw]of [['barley',root+'agriculture/'],['beef','https://unsafe.example/'],['beef','//unsafe.example/'],['beef',root+'population/'],['canola',root+'agriculture/wheat/'],['beef',root+'agriculture/beef/?redirect=https://unsafe.example/']]){
   w.history.replaceState(null,'',initial.href);assert.equal(render({...natureState,view:'water'}),true);assert.equal(q('[data-canada-crop-mini]').contains(q('[data-canada-crop-gis]')),true);
   const fallback=q('[data-canada-census-fallback]'),live=q('[data-canada-census-live]');fallback.style.visibility='hidden';fallback.setAttribute('aria-hidden','true');fallback.setAttribute('tabindex','-1');live.hidden=false;live.style.visibility='visible';
   const invalid=new URL('https://example.com'+root+'nature/');invalid.searchParams.set('crop',crop);invalid.searchParams.set('cropReturn',raw);w.history.replaceState(null,'',invalid.href);assert.equal(render(natureState),false);
   for(const selector of ['[data-canada-crop-return]','[data-canada-crop-source]','[data-canada-crop-context]','[data-canada-crop-mini]','[data-canada-census]'])assert.equal(q(selector).hidden,true);assert.equal(q('[data-canada-crop-return]').hasAttribute('href'),false);assert.equal(q('[data-canada-crop-mini]').childElementCount,0);
   assert.equal(fallback.style.visibility,'visible');assert.equal(fallback.hasAttribute('aria-hidden'),false);assert.equal(fallback.getAttribute('tabindex'),'0');assert.equal(live.hidden,true);
   for(const selector of ['[data-canada-crop-map-title]','[data-canada-crop-map-key]','[data-canada-crop-context-title]','[data-canada-crop-context-text]','[data-canada-crop-scope]','[data-canada-crop-origin]'])assert.equal(q(selector).textContent,'');
  }
  w.history.replaceState(null,'',initial.href);assert.equal(render(natureState),true);assertNativeKey(q,read(initial));
 }finally{await w.happyDOM.close();}
});
