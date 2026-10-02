import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {createAfricaLayerRenderer} from '../../src/scripts/atlas-africa-layers.ts';
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
  for(let i=0;i<60&&(view.loading||!view.ready);i++)await new Promise(resolve=>setTimeout(resolve,5));
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
test('actual map point survives the bubbling country selection and the overview preserves its source state',async()=>{
 const window=new Window({url:'https://example.com/insight-journal/atlas/africa/?field=nature&topic=climate&place=EGY&compare=GHA&year=2023&zoom=all'}),previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async url=>new Response(readFileSync(new URL('../../public'+new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,''),import.meta.url)),{status:200});
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),map=root.querySelector('.africa-map');map.getBoundingClientRect=()=>({left:0,top:0,width:640,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  initializeAfricaAtlas();for(let i=0;i<100&&(root.dataset.actualLayer!=='true'||root.querySelector('[data-africa-layer-category]').options.length<2);i++)await new Promise(resolve=>setTimeout(resolve,5));await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(root.dataset.actualLayer,'true');const [x,y]=projectAfrica([5.05,24.95]),scale=Math.min(640/africaWidth,416/africaHeight),offsetX=(640-africaWidth*scale)/2;
  root.querySelector('[data-country-path="DZA"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true,clientX:offsetX+x*scale,clientY:y*scale}));
  const point=new URL(window.location.href).searchParams.get('layerPoint');assert.equal(point,'5.0500,24.9500');assert.equal(root.querySelector('[data-place]').value,'DZA');
  const pointReading=root.querySelector('[data-africa-point-reading]'),pointDeadline=Date.now()+5000;while(!/砂漠/.test(pointReading.textContent)&&Date.now()<pointDeadline)await new Promise(resolve=>setTimeout(resolve,10));assert.match(pointReading.textContent,/砂漠/);
  assert.doesNotMatch(root.querySelector('[data-map-caption]').textContent,/色は国平均/);root.querySelector('[data-theme-comparison]').click();assert.equal(root.querySelector('[data-theme-legend]').hidden,true);assert.equal(root.querySelector('[data-africa-statistics-key]').hidden,false);
  const href=new URL(root.querySelector('[data-africa-overview-link]').href);assert.equal(href.searchParams.get('layerPoint'),point);assert.equal(href.searchParams.get('place'),'DZA');assert.equal(href.searchParams.get('compare'),'GHA');assert.equal(href.searchParams.get('year'),'2023');assert.ok(href.searchParams.get('sourceState'));
  root.querySelector('[data-theme-return]').click();assert.equal(new URL(window.location.href).searchParams.get('layerPoint'),'5.05,24.95');const picker=root.querySelector('[data-place]');picker.value='EGY';picker.dispatchEvent(new window.Event('change'));assert.equal(new URL(window.location.href).searchParams.has('layerPoint'),false);
  for(const topic of ['ethnicity','religion']){window.history.replaceState(null,'',`?field=population&topic=${topic}&place=EGY&compare=GHA&year=2023&zoom=all&context=EN.POP.DNST&layerClass=old&layerPoint=7,10&sourceState=old`);window.dispatchEvent(new window.PopStateEvent('popstate'));assert.equal(root.dataset.layerMode,'guide');assert.equal(root.dataset.actualLayer,'false');assert.equal(root.querySelectorAll('[data-africa-layer-feature],[data-africa-raster],[data-theme-mark],[data-africa-comparison-country],[data-symbols] [data-country-marker]').length,0);assert.equal(root.querySelector('[data-theme-comparison]').hidden,true);assert.equal(root.querySelector('[data-theme-comparison]').disabled,true);assert.equal(root.querySelector('[data-africa-subfield-status]').hidden,true);assert.equal(root.querySelector('[data-africa-layer-selection]').hidden,true);assert.match(root.querySelector('[data-theme-takeaway-detail]').textContent,/明示許諾/);const links=[root.querySelector('[data-theme-source]').href,root.querySelector('[data-africa-culture-source]').href];assert.ok(links.includes('https://icr.ethz.ch/data/epr/geoepr/'));assert.ok(links.includes('https://icr.ethz.ch/data/epr/ed/'));for(const path of root.querySelectorAll('[data-country-path]'))assert.equal(path.getAttribute('fill'),'#f3f1e9');picker.value='NGA';picker.dispatchEvent(new window.Event('change'));assert.equal(root.querySelector('[data-compare]').value,'GHA');assert.equal(root.querySelector('[data-year]').value,'2023');for(const key of ['context','layerClass','layerPoint','sourceState'])assert.equal(new URL(window.location.href).searchParams.has(key),false);}
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
});
