import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const browserCode=await bundleCanadaSource('src/scripts/atlas-canada-crop-nature-comparison.ts',{globalName:'CropNature'});
const helperCode=await bundleCanadaSource('src/lib/atlas-canada-crop-comparison.ts',{platform:'node',format:'esm'});
const natureCode=await bundleCanadaSource('src/lib/atlas-canada-nature.ts',{platform:'node',format:'esm'});
const {buildCanadaCropNatureUrl:toNature,readCanadaCropComparison:read}=await import(`data:text/javascript;base64,${Buffer.from(helperCode).toString('base64')}`);
const {writeCanadaNatureState:writeNature}=await import(`data:text/javascript;base64,${Buffer.from(natureCode).toString('base64')}`);
const root='/insight-journal/atlas/north-america/canada/';
const natureState={city:'regina',compare:null,view:'climate',water:null,only:false,frame:null};
const source=(crop,map='beef')=>new URL('https://example.com'+root+(crop==='wheat'?'agriculture/wheat/':crop==='beef'?'agriculture/beef/':'agriculture/')+(crop==='beef'?`?year=2026&province=Ontario&compare=Quebec&metric=dairy&map=${map}&zoom=1`:'?year=2025&province=Alberta&compare=Manitoba&metric=production&zoom=1'));
function fixture(url){
 const w=new Window({url:url.href,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write(`<article data-canada-nature>
  <a data-canada-crop-return href="https://unsafe.example/">old return</a>
  <figure data-canada-crop-source hidden><h2 data-canada-crop-map-title></h2><a data-canada-crop-image-link><img data-canada-crop-image /></a><figcaption><p data-canada-crop-map-key></p></figcaption></figure>
  <svg data-canada-map viewBox="0 0 900 580"><g data-canada-land></g></svg>
  <section data-canada-crop-context hidden><h2 data-canada-crop-context-title></h2><p data-canada-crop-context-text></p><p data-canada-crop-scope></p><div data-canada-crop-mini hidden></div><details><summary>年・対象・出典</summary><p data-canada-crop-origin></p></details></section>
 </article>`);
 w.eval(browserCode);
 return {w,q:selector=>w.document.querySelector(selector),render:state=>w.eval(`CropNature.renderCanadaCropNatureComparison(document.querySelector('[data-canada-nature]'),${JSON.stringify(state)});`)};
}
function assertCompleteKey(key,map){
 assert.equal(key.querySelectorAll('[data-canada-crop-legend]').length,8);
 assert.match(key.textContent,/2021年農業センサス/);assert.ok(key.textContent.includes(map.dot));assert.ok(key.textContent.includes(map.total));
 for(const label of ['赤い点','秘匿','農業地域またはnull値','農業地域外','首都','州・準州の都','センサス区界','州・準州界','ランダム','農場・肥育場','丸め'])assert.ok(key.textContent.includes(label),label);
 assert.equal(key.querySelector('[data-canada-crop-original-source]').href,map.source);
}

test('Climate comparisons show the exact complete source JPEG and full HTML legend with a named, sanitized annual-state return',async()=>{
 for(const [crop,mapId] of [['canola'],['wheat'],['beef','beef'],['beef','pasture'],['beef','hay']]){
  const url=toNature(source(crop,mapId),crop),context=read(url),{w,q,render}=fixture(url);
  try{
   assert.equal(render(natureState),true);assert.equal(q('[data-canada-crop-source]').hidden,false);assert.equal(q('[data-canada-crop-context]').hidden,false);assert.equal(q('[data-canada-crop-mini]').hidden,true);
   assert.equal(q('[data-canada-crop-image]').getAttribute('src'),context.selectedMap.image);assert.equal(q('[data-canada-crop-image]').width,1133);assert.equal(q('[data-canada-crop-image]').height,814);
   assert.equal(q('[data-canada-crop-image-link]').getAttribute('href'),context.selectedMap.image);assert.match(q('[data-canada-crop-map-title]').textContent,/2021年.*センサス/);
   assertCompleteKey(q('[data-canada-crop-map-key]'),context.selectedMap);assert.equal(q('[data-canada-map]').querySelectorAll('image').length,0);
   assert.equal(q('[data-canada-crop-return]').href,context.returnUrl.href);assert.equal(q('[data-canada-crop-return]').textContent,context.returnLabel);
   assert.equal(q('[data-canada-crop-context-title]').textContent,context.selectedMap.name+'とReginaの季節を比べる');
   const origin=q('[data-canada-crop-origin]').textContent;assert.ok(origin.includes(context.sourceLabel));assert.ok(origin.includes(context.selectedMap.description));assert.match(origin,/2021年農業センサス/);
   assert.match(q('[data-canada-crop-scope]').textContent,/2021年.*1991–2020.*1観測点.*プレーリー平均.*土壌水分/s);
   assert.equal((q('[data-canada-crop-context-text]').textContent.match(/。/g)??[]).length,2);
  }finally{await w.happyDOM.close();}
 }
});

test('Landform and water use a separate complete mini figure while nature selection and history preserve every source choice',async()=>{
 for(const crop of ['canola','wheat','beef']){
  const initial=toNature(source(crop,'hay'),crop),context=read(initial),{w,q,render}=fixture(initial);
  try{
   render(natureState);
   for(const view of ['landform','water']){
    const selected={...natureState,city:'winnipeg',compare:'ottawa',view,water:view==='water'?'St. Lawrence':null,only:view==='water',frame:[150,200,300,200]};
    w.history.pushState(null,'',writeNature(new URL(w.location.href),selected).href);assert.equal(render(selected),true);
    assert.equal(q('[data-canada-crop-source]').hidden,true);assert.equal(q('[data-canada-crop-mini]').hidden,false);
    const mini=q('[data-canada-crop-mini]');assert.equal(mini.querySelectorAll('figure').length,1);assert.equal(mini.querySelector('img').getAttribute('src'),context.selectedMap.image);assert.equal(mini.querySelector('a').getAttribute('href'),context.selectedMap.image);assertCompleteKey(mini.querySelector('figcaption'),context.selectedMap);
    assert.equal(q('[data-canada-crop-return]').href,context.returnUrl.href);assert.deepEqual(read(new URL(w.location.href)).state,context.state);assert.equal(q('[data-canada-map]').querySelectorAll('image').length,0);
    const text=q('[data-canada-crop-context-text]').textContent;assert.equal((text.match(/。/g)??[]).length,2);if(view==='water')assert.match(text,/St\. Lawrenceだけ.*水域の位置.*管理/s);
   }
   w.history.replaceState(null,'',initial.href);w.dispatchEvent(new w.PopStateEvent('popstate'));render(natureState);
   assert.equal(q('[data-canada-crop-source]').hidden,false);assert.equal(q('[data-canada-crop-mini]').hidden,true);assert.equal(q('[data-canada-crop-mini]').childElementCount,0);assert.equal(q('[data-canada-crop-return]').href,context.returnUrl.href);
  }finally{await w.happyDOM.close();}
 }
});

test('Changing to an observation outside the Prairie keeps the original Regina question and names the current single station',async()=>{
 const {w,q,render}=fixture(toNature(source('canola'),'canola'));
 try{render({...natureState,city:'vancouver'});assert.match(q('[data-canada-crop-context-text]').textContent,/現在の地点はVancouver.*元の問い.*Regina/s);assert.match(q('[data-canada-crop-scope]').textContent,/Vancouverは1観測点.*プレーリー平均/s);assert.equal((q('[data-canada-crop-context-text]').textContent.match(/。/g)??[]).length,2);}finally{await w.happyDOM.close();}
});

test('Invalid or external crop context removes previous images, legends and unsafe return targets after a valid display',async()=>{
 const initial=toNature(source('beef','pasture'),'beef'),{w,q,render}=fixture(initial);
 try{
  for(const [crop,raw] of [['barley',root+'agriculture/'],['beef','https://unsafe.example/'],['beef','//unsafe.example/'],['beef',root+'population/'],['canola',root+'agriculture/wheat/'],['beef',root+'agriculture/beef/?redirect=https://unsafe.example/']]){
   w.history.replaceState(null,'',initial.href);render({...natureState,view:'water'});assert.equal(q('[data-canada-crop-mini]').childElementCount,1);
   const invalid=new URL('https://example.com'+root+'nature/');invalid.searchParams.set('crop',crop);invalid.searchParams.set('cropReturn',raw);w.history.replaceState(null,'',invalid.href);
   assert.equal(render(natureState),false);assert.equal(q('[data-canada-crop-return]').hidden,true);assert.equal(q('[data-canada-crop-source]').hidden,true);assert.equal(q('[data-canada-crop-context]').hidden,true);assert.equal(q('[data-canada-crop-mini]').hidden,true);
   assert.equal(q('[data-canada-crop-return]').hasAttribute('href'),false);assert.equal(q('[data-canada-crop-image-link]').hasAttribute('href'),false);assert.equal(q('[data-canada-crop-image]').hasAttribute('src'),false);assert.equal(q('[data-canada-crop-mini]').childElementCount,0);
   for(const selector of ['[data-canada-crop-map-title]','[data-canada-crop-map-key]','[data-canada-crop-context-title]','[data-canada-crop-context-text]','[data-canada-crop-scope]','[data-canada-crop-origin]'])assert.equal(q(selector).textContent,'');
  }
 }finally{await w.happyDOM.close();}
});
