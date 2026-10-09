import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {createAfricaLayerRenderer,africaGridValue,africaGridValueLabel} from '../../src/scripts/atlas-africa-layers.ts';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {projectAfrica,africaWidth,africaHeight} from '../../src/lib/atlas-africa-geometry.ts';
import {readState} from '../../src/data/atlas/africa-atlas.ts';

async function withLayers(search,run){
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 try{
  window.document.body.innerHTML='<div data-africa-atlas><svg><path data-country-path="EGY" d="M1 1L2 1L2 2Z"></path><g data-africa-actual-layer></g></svg></div>';
  const root=window.document.querySelector('[data-africa-atlas]');let state=readState(search),view;const requests=[];
  const fetcher=async url=>{requests.push(url);const path=new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,'');return new Response(readFileSync(new URL('../../public'+path,import.meta.url)),{status:200});};
  const renderer=createAfricaLayerRenderer(root,()=>{view=renderer.render(state);},fetcher);view=renderer.render(state);
  const deadline=Date.now()+10000;while((view.loading||!view.ready)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(view.error,'');assert.equal(view.ready,true);assert.equal(view.loading,false);
  await run({root,renderer,requests,get view(){return view;},setState(next){state=readState(next);view=renderer.render(state);return view;}});
 }finally{globalThis.document=previous;await window.happyDOM.abort();}
}
test('actual climate raster and point query read the same stored classification and retain every key',async()=>{
 await withLayers('?field=nature&topic=climate&zoom=all',({root,renderer,view})=>{
  const manifest=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-physical-v1/manifest.json',import.meta.url),'utf8'));
  assert.equal(view.legend.length,manifest.layers.climate.classes.length);assert.equal(view.period,'1991–2020');
  assert.equal(root.querySelector('[data-africa-raster]').getAttribute('width'),'1100');
  assert.match(renderer.inspect(31.2,30),/表示格子/);assert.match(renderer.inspect(-26,-35),/未収録/);
 });
});
test('both cultural topics provide source guidance immediately without requesting or rendering derived distributions',async()=>{
 for(const topic of ['ethnicity','religion'])await withLayers(`?field=population&topic=${topic}&place=EGY&zoom=all`,({root,view,requests})=>{
  assert.equal(view.guide,true);assert.equal(view.ready,true);assert.equal(view.loading,false);assert.equal(view.legend.length,0);assert.match(view.scope,/この画面に分布図はありません/);assert.match(view.method,/明示許諾/);assert.match(view.sourceUrl,/^https:\/\/icr\.ethz\.ch\/data\/epr\/(?:geoepr|ed)\/$/);
  assert.equal(root.querySelectorAll('[data-africa-layer-feature],[data-africa-raster]').length,0);assert.deepEqual(requests,[]);
 });
});
test('the river key selects the actual source lines without discarding their original feature IDs',async()=>{
 await withLayers('?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&zoom=all',({root,view,setState})=>{
  assert.equal(view.title,'河川・湖の中心線');assert.doesNotMatch(view.title,/水文地質/);assert.equal(view.legend.length,1);assert.equal(view.legend[0].id,'river');const count=root.querySelectorAll('[data-africa-layer-feature]').length;assert.equal(count,90);
  setState('?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&layerClass=river&zoom=all');assert.equal(root.querySelectorAll('[data-africa-layer-feature]').length,count);
});
});
test('real zero and low elevations are metres rather than similarly numbered legend categories',async()=>{
 await withLayers('?field=nature&topic=elevation&zoom=all',({renderer})=>{
  const layer=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-physical-v1/manifest.json',import.meta.url),'utf8')).layers.elevation,grid=gunzipSync(readFileSync(new URL('../../public/assets/atlas/africa-physical-v1/'+layer.grid,import.meta.url)));
  for(const metres of [0,2,7]){let index=-1;for(let i=0;i<grid.length/2;i++)if(grid.readInt16LE(i*2)===metres){index=i;break;}assert.ok(index>=0);const lon=layer.bounds[0]+(index%layer.width+.5)*.1,lat=layer.bounds[3]-(Math.floor(index/layer.width)+.5)*.1;assert.match(renderer.inspect(lon,lat),new RegExp(`：${metres} m（表示格子）`));}
 });
});

test('all source crop measures and livestock retain raw zero, positive and no-data quantities',()=>{
 // Production is no longer a display toggle. Both published H/P source grids
 // remain independently checkable; no derived concentration replaces a value.
 for(const family of ['crops','livestock']){
  const manifest=JSON.parse(readFileSync(new URL(`../../public/assets/atlas/africa-${family}-v1/manifest.json`,import.meta.url),'utf8'));
  for(const [id,layer] of Object.entries(manifest.layers)){
   const grid=gunzipSync(readFileSync(new URL(`../../public/assets/atlas/africa-${family}-v1/${layer.grid}`,import.meta.url))),indices={zero:-1,positive:-1,missing:-1};
   for(let i=0;i<grid.length/4;i++){const value=grid.readFloatLE(i*4);if(value===0&&indices.zero<0)indices.zero=i;if(value>0&&indices.positive<0)indices.positive=i;if(value===layer.noData&&indices.missing<0)indices.missing=i;if(Object.values(indices).every(index=>index>=0))break;}
   for(const [kind,index] of Object.entries(indices)){assert.ok(index>=0,`${id} ${kind} available`);const lon=layer.bounds[0]+(index%layer.width+.5)*(layer.bounds[2]-layer.bounds[0])/layer.width,lat=layer.bounds[3]-(Math.floor(index/layer.width)+.5)*(layer.bounds[3]-layer.bounds[1])/layer.height;assert.equal(africaGridValue(grid,layer,lon,lat),kind==='missing'?null:grid.readFloatLE(index*4));}
   assert.match(layer.period,/2020/);assert.equal(layer.legend[0].id,layer.zeroId);
   assert.equal(layer.unit,family==='livestock'?'頭/km²':id.endsWith('-production')?'t / 5分角セル':'ha / 5分角セル');
  }
 }
});

test('seven fixed concentration distributions retain each original query grid, unit, year and source',async()=>{
 for(const family of ['crops','livestock']){
  const manifest=JSON.parse(readFileSync(new URL(`../../public/assets/atlas/africa-${family}-v1/manifest.json`,import.meta.url),'utf8'));
  for(const [id,layer] of Object.entries(manifest.layers).filter(([id])=>!id.endsWith('-production'))){
   const search=family==='crops'?`?field=agriculture&crop=${id.split('-')[0]}&cropMeasure=harvested&zoom=all`:`?field=agriculture&topic=livestock&livestock=${id}&zoom=all`;
   await withLayers(search,({root,renderer,view,requests})=>{
    const key=family==='crops'?`crop-${id}`:`livestock-${id}`;
    assert.equal(view.key,key);assert.equal(view.unit,layer.unit);assert.equal(view.period,layer.period);assert.match(view.sourceUrl,/^https:\/\//);assert.equal(view.legend.length,9);assert.equal(root.querySelectorAll('[data-africa-commodity-layer]').length,7);
    assert.ok(requests.some(url=>url.endsWith('/'+layer.grid)),'the selected item still fetches its original numeric grid');
    const grid=gunzipSync(readFileSync(new URL(`../../public/assets/atlas/africa-${family}-v1/${layer.grid}`,import.meta.url))),indices={zero:-1,positive:-1,missing:-1};
    for(let i=0;i<grid.length/4;i++){const value=grid.readFloatLE(i*4);if(value===0&&indices.zero<0)indices.zero=i;if(value>0&&indices.positive<0)indices.positive=i;if(value===layer.noData&&indices.missing<0)indices.missing=i;if(Object.values(indices).every(index=>index>=0))break;}
    for(const [kind,index] of Object.entries(indices)){const lon=layer.bounds[0]+(index%layer.width+.5)*(layer.bounds[2]-layer.bounds[0])/layer.width,lat=layer.bounds[3]-(Math.floor(index/layer.width)+.5)*(layer.bounds[3]-layer.bounds[1])/layer.height,reading=renderer.inspect(lon,lat);assert.ok(reading.includes(`${layer.title}：${kind==='missing'?'値なし':africaGridValueLabel(grid.readFloatLE(index*4))+' '+layer.unit}`),`${key} ${kind} reads its own original value`);assert.match(reading,/元の5分角格子/);}
   });
  }
 }
});

test('livestock source details keep input census years separate from the 2020 model and retain missing input metadata',async()=>{
 await withLayers('?field=agriculture&topic=livestock&livestock=goats&place=ETH&zoom=all',({view,setState})=>{
  assert.match(view.period,/2020/);assert.match(view.method,/入力統計年：2002/);assert.match(view.method,/平均空間解像度：(?:約)?45.5 km/);assert.match(view.method,/5分角/);
  const kenya=setState('?field=agriculture&topic=livestock&livestock=goats&place=KEN&zoom=all');assert.match(kenya.method,/入力統計年：2019/);assert.match(kenya.period,/2020/);
 });
 await withLayers('?field=agriculture&topic=livestock&livestock=sheep&place=SDN&zoom=all',({view})=>{assert.match(view.method,/入力統計年：未記載/);assert.doesNotMatch(view.method,/入力統計年：2017/);});
});

test('actual tiny crop and cattle grid readings retain positive values instead of a zero label',async()=>{
 await withLayers('?field=agriculture&topic=farming&crop=maize&cropMeasure=harvested&zoom=all',({renderer})=>{const reading=renderer.inspect(-2.291666,9.125);assert.match(reading,/：0\.0001014 ha/);assert.doesNotMatch(reading,/：0 ha/);assert.match(reading,/推定値、表示桁は丸め/);});
 await withLayers('?field=agriculture&topic=livestock&livestock=cattle&zoom=all',({renderer})=>{const reading=renderer.inspect(12.208333,25.625);assert.match(reading,/：0\.0000004657 頭\/km²/);assert.doesNotMatch(reading,/：0 頭/);assert.match(reading,/推定値、表示桁は丸め/);});
});
test('actual map point does not select a passive country and the overview preserves its source state',async()=>{
 const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true},url:'https://example.com/insight-journal/atlas/africa/?field=nature&topic=climate&place=EGY&compare=GHA&year=2023&zoom=all'}),previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async url=>new Response(readFileSync(new URL('../../public'+new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,''),import.meta.url)),{status:200});
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),map=root.querySelector('.africa-map');map.getBoundingClientRect=()=>({left:0,top:0,width:640,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();for(let i=0;i<100&&(root.dataset.actualLayer!=='true'||root.querySelector('[data-africa-layer-category]').options.length<2);i++)await new Promise(resolve=>setTimeout(resolve,5));await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(root.dataset.actualLayer,'true');const [x,y]=projectAfrica([5.05,24.95]),scale=Math.min(640/africaWidth,416/africaHeight),offsetX=(640-africaWidth*scale)/2;
  root.querySelector('[data-country-path="DZA"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true,clientX:offsetX+x*scale,clientY:y*scale}));
  const point=new URL(window.location.href).searchParams.get('layerPoint');assert.equal(point,'5.0500,24.9500');assert.equal(root.querySelector('[data-place]').value,'EGY');assert.equal(root.querySelector('[data-country-path="DZA"] title'),null);assert.equal(root.querySelector('[data-country-path="DZA"]').style.pointerEvents,'none');
  const pointReading=root.querySelector('[data-africa-point-reading]'),pointDeadline=Date.now()+5000;while(!/砂漠/.test(pointReading.textContent)&&Date.now()<pointDeadline)await new Promise(resolve=>setTimeout(resolve,10));assert.match(pointReading.textContent,/砂漠/);
  assert.doesNotMatch(root.querySelector('[data-map-caption]').textContent,/色は国平均/);root.querySelector('[data-theme-comparison]').click();assert.equal(root.querySelector('[data-theme-legend]').hidden,true);assert.equal(root.querySelector('[data-africa-statistics-key]').hidden,false);
  const href=new URL(root.querySelector('[data-africa-overview-link]').href);assert.equal(href.searchParams.get('layerPoint'),point);assert.equal(href.searchParams.get('place'),'EGY');assert.equal(href.searchParams.get('compare'),'GHA');assert.equal(href.searchParams.get('year'),'2023');assert.ok(href.searchParams.get('sourceState'));
  root.querySelector('[data-theme-return]').click();assert.equal(new URL(window.location.href).searchParams.get('layerPoint'),'5.05,24.95');const picker=root.querySelector('[data-place]');picker.value='EGY';picker.dispatchEvent(new window.Event('change'));assert.equal(new URL(window.location.href).searchParams.has('layerPoint'),false);
  for(const topic of ['ethnicity','religion']){window.history.replaceState(null,'',`?field=population&topic=${topic}&place=EGY&compare=GHA&year=2023&zoom=all&context=EN.POP.DNST&layerClass=old&layerPoint=7,10&sourceState=old`);window.dispatchEvent(new window.PopStateEvent('popstate'));assert.equal(root.dataset.layerMode,'guide');assert.equal(root.dataset.actualLayer,'false');assert.equal(root.querySelectorAll('[data-africa-layer-feature],[data-africa-raster],[data-theme-mark],[data-africa-comparison-country],[data-symbols] [data-country-marker]').length,0);assert.equal(root.querySelector('[data-theme-comparison]').hidden,true);assert.equal(root.querySelector('[data-theme-comparison]').disabled,true);assert.equal(root.querySelector('[data-africa-subfield-status]').hidden,false);assert.match(root.querySelector('[data-africa-subfield-status]').textContent,/この画面に分布図はありません/);assert.equal(root.querySelector('[data-africa-layer-selection]').hidden,true);assert.match(root.querySelector('[data-theme-takeaway-detail]').textContent,/明示許諾/);const links=[root.querySelector('[data-theme-source]').href,root.querySelector('[data-africa-culture-source]').href];assert.ok(links.includes('https://icr.ethz.ch/data/epr/geoepr/'));assert.ok(links.includes('https://icr.ethz.ch/data/epr/ed/'));for(const path of root.querySelectorAll('[data-country-path]')){assert.equal(path.getAttribute('fill'),'#f3f1e9');assert.equal(path.querySelector('title'),null);assert.equal(path.style.pointerEvents,'none');}picker.value='NGA';picker.dispatchEvent(new window.Event('change'));assert.equal(root.querySelector('[data-compare]').value,'GHA');assert.equal(root.querySelector('[data-year]').value,'2023');for(const key of ['context','layerClass','layerPoint','sourceState'])assert.equal(new URL(window.location.href).searchParams.has(key),false);}
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
});
