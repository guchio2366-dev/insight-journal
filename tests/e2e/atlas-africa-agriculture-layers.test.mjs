import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {initializeAfricaAtlas} from '../../src/scripts/atlas-africa.ts';
import {createAfricaLayerRenderer} from '../../src/scripts/atlas-africa-layers.ts';
import {readState,africaComparisonSnapshot} from '../../src/data/atlas/africa-atlas.ts';
import {projectAfrica,africaWidth,africaHeight} from '../../src/lib/atlas-africa-geometry.ts';

const wait=async(condition,message)=>{const end=Date.now()+10000;while(!condition()&&Date.now()<end)await new Promise(resolve=>setImmediate(resolve));assert.ok(condition(),message);};
const base='https://example.com/insight-journal/atlas/africa/';
const visibleKeys=root=>[...root.querySelectorAll('[data-africa-commodity-layer]')].filter(node=>node.style.display!=='none').map(node=>node.dataset.africaCommodityLayer).sort();
const parameters=window=>new URL(window.location.href).searchParams;

async function withController(search,run){
 const window=new Window({url:base+search});
 const previous=Object.fromEntries(['window','document','location','history','fetch'].map(key=>[key,globalThis[key]]));
 try{
  for(const key of ['window','document','location','history'])globalThis[key]=window[key];
  globalThis.fetch=async url=>new Response(readFileSync(new URL('../../public'+new URL(url,base).pathname.replace(/^\/insight-journal/,''),import.meta.url)),{status:200});
  window.document.write(readFileSync(new URL('../../dist/atlas/africa/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const root=window.document.querySelector('[data-africa-atlas]'),q=selector=>root.querySelector(selector);
  q('.africa-map').getBoundingClientRect=()=>({left:0,top:0,width:645,height:416});
  for(const path of root.querySelectorAll('[data-country-path]'))path.getBBox=()=>({x:10,y:10,width:100,height:100});
  const agriculture=readState(search).field==='agriculture';
  initializeAfricaAtlas();await wait(()=>root.dataset.actualLayer==='true'&&(!agriculture||root.querySelectorAll('[data-africa-agri-layer]').length===7),'the selected distribution and its controls must be ready');
  const check=(selector,checked)=>{const input=q(selector);assert.ok(input,selector);input.checked=checked;input.dispatchEvent(new window.Event('change',{bubbles:true}));};
  const navigate=search=>{window.history.replaceState(null,'',search);window.dispatchEvent(new window.PopStateEvent('popstate'));};
  await run({window,root,q,check,navigate});
 }finally{for(const [key,value]of Object.entries(previous))globalThis[key]=value;await window.happyDOM.abort();}
}

test('layer checkboxes retain focus while single other-visible and explicit all-off maps stay neutral through reload',async()=>{
 let reload;
 await withController('?field=agriculture&crop=maize&place=KEN&compare=ETH&year=2023&zoom=all&agriLayers=crop-maize-harvested,livestock-cattle',async({window,root,q,check})=>{
  assert.equal(q('[data-africa-agri-layer="crop-maize-harvested"]').checked,true);
  assert.equal(q('[data-africa-agri-layer="livestock-cattle"]').checked,true);
  check('[data-africa-agri-layer="crop-maize-harvested"]',false);
  assert.equal(parameters(window).get('agriLayers'),'livestock-cattle');
  assert.equal(parameters(window).get('crop'),'maize');
  assert.deepEqual(visibleKeys(root),['livestock-cattle']);
  assert.match(q('[data-africa-layer-caption]').textContent,/表示OFF/);
  assert.match(q('[data-unit]').textContent,/ha/);
  assert.match(q('[data-africa-point-reading]').textContent,/品目はOFF/);
  await wait(()=>q('[data-africa-commodity-layer="livestock-cattle"] image'),'the visible cattle native grid must finish before the map point is inspected');
  const livestockBase=new URL('../../public/assets/atlas/africa-livestock-v1/',import.meta.url),layer=JSON.parse(readFileSync(new URL('manifest.json',livestockBase))).layers.cattle;
  const grid=gunzipSync(readFileSync(new URL(layer.grid,livestockBase))),col=Math.floor((38-layer.bounds[0])/(layer.bounds[2]-layer.bounds[0])*layer.width),row=Math.floor((layer.bounds[3]-1)/(layer.bounds[3]-layer.bounds[1])*layer.height);
  const value=grid.readFloatLE((row*layer.width+col)*4);assert.ok(Number.isFinite(value)&&value>0,'the selected Kenya cell has a real positive cattle model value');
  const lon=layer.bounds[0]+(col+.5)*(layer.bounds[2]-layer.bounds[0])/layer.width,lat=layer.bounds[3]-(row+.5)*(layer.bounds[3]-layer.bounds[1])/layer.height;
  const [x,y]=projectAfrica([lon,lat]),scale=Math.min(645/africaWidth,416/africaHeight),left=(645-africaWidth*scale)/2,top=(416-africaHeight*scale)/2;
  q('.africa-map').dispatchEvent(new window.MouseEvent('click',{bubbles:true,clientX:left+x*scale,clientY:top+y*scale}));
  const point=q('[data-africa-point-reading]').textContent;assert.match(point,/品目はOFF/);assert.ok(point.includes(layer.title),'the OFF warning must coexist with the visible cattle reading');assert.ok(point.includes(value.toLocaleString('ja-JP')+' '+layer.unit),'the same point reading includes the native visible cattle value and unit');
  check('[data-africa-agri-layer="livestock-cattle"]',false);
  assert.equal(parameters(window).has('agriLayers'),true);assert.equal(parameters(window).get('agriLayers'),'');
  assert.deepEqual(visibleKeys(root),[]);assert.match(q('[data-africa-point-reading]').textContent,/すべてOFF/);
  assert.equal(q('[data-africa-statistics-key]').hidden,true);
  for(const path of root.querySelectorAll('[data-country-path]'))assert.equal(path.getAttribute('fill'),'#f3f1e9');
  q('[data-africa-commodity="rice"]').click();await wait(()=>/米の収穫面積/.test(q('[data-theme-title]').textContent),'focus reading must change while every distribution remains off');
  assert.equal(parameters(window).get('agriLayers'),'');assert.equal(parameters(window).get('crop'),'rice');assert.deepEqual(visibleKeys(root),[]);
  assert.match(q('[data-period]').textContent,/2020/);assert.match(q('[data-unit]').textContent,/ha/);
  check('[data-africa-agri-outline]',true);assert.equal(parameters(window).get('agriOutline'),'1');assert.equal(root.querySelector('[data-africa-agri-footprint]'),null);
  reload=window.location.search;
 });
 await withController(reload,({window,root,q})=>{assert.equal(parameters(window).get('agriLayers'),'');assert.equal(parameters(window).get('crop'),'rice');assert.equal(parameters(window).get('place'),'KEN');assert.equal(parameters(window).get('compare'),'ETH');assert.equal(parameters(window).get('year'),'2023');assert.deepEqual(visibleKeys(root),[]);assert.ok(q('[data-africa-agri-outline]').checked);assert.match(q('[data-africa-point-reading]').textContent,/すべてOFF/);});
});

test('all eleven H/P and livestock keys remain canonical through checkbox state, focus change and comparison links',async()=>{
 const all='crop-maize-harvested,crop-maize-production,crop-rice-harvested,crop-rice-production,crop-wheat-harvested,crop-wheat-production,crop-cassava-harvested,crop-cassava-production,livestock-cattle,livestock-goats,livestock-sheep';
 const raw=all.split(',').reverse().concat(['livestock-goats']).join(',');
 await withController('?field=agriculture&crop=maize&place=KEN&zoom=all&agriLayers='+encodeURIComponent(raw),({window,root,q,check})=>{
  assert.equal(root.querySelectorAll('[data-africa-agri-layer]:checked').length,7);
  check('[data-africa-agri-outline]',true);assert.equal(parameters(window).get('agriLayers'),all);
  q('[data-africa-commodity="wheat"]').click();assert.equal(parameters(window).get('agriLayers'),all);assert.equal(parameters(window).get('crop'),'wheat');
  q('[data-theme-comparison]').click();const source=new URLSearchParams(parameters(window).get('sourceState'));assert.equal(source.get('agriLayers'),all);assert.equal(source.get('agriOutline'),'1');
  const overview=new URL(q('[data-africa-overview-link]').href);assert.equal(overview.searchParams.get('agriLayers'),all);assert.equal(overview.searchParams.get('agriOutline'),'1');
 });
});

test('a mixed H/P commodity checkbox removes both variants and measure changes convert all visible crops without changing livestock',async()=>{
 await withController('?field=agriculture&crop=maize&cropMeasure=harvested&zoom=all&agriLayers=crop-maize-production,crop-rice-harvested,livestock-cattle',({window,root,q,check,navigate})=>{
  assert.equal(q('[data-africa-agri-layer="crop-maize-harvested"]').checked,true,'the crop checkbox reflects its P layer even while H is the current measure');
  navigate('?field=agriculture&crop=maize&cropMeasure=harvested&zoom=all&agriLayers=crop-maize-harvested,crop-maize-production,crop-rice-harvested,livestock-cattle');
  const selector='[data-africa-agri-layer="crop-maize-harvested"]',input=q(selector);input.focus();assert.equal(window.document.activeElement,input);
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true}));
  // Happy DOM does not synthesize Space's browser-default activation. click()
  // supplies that native checkbox activation rather than a controller change.
  input.click();window.document.activeElement.dispatchEvent(new window.KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));
  assert.ok(window.document.activeElement===q(selector),'the keyboard user retains focus on the same commodity after controls are redrawn');assert.equal(q(selector).checked,false);
  assert.equal(parameters(window).get('agriLayers'),'crop-rice-harvested,livestock-cattle');
  assert.equal(q('[data-africa-agri-layer="crop-maize-harvested"]').checked,false);
  check('[data-africa-agri-layer="crop-maize-harvested"]',true);
  q('[data-africa-crop-measure="production"]').click();
  assert.equal(parameters(window).get('agriLayers'),'crop-maize-production,crop-rice-production,livestock-cattle');
  assert.equal(q('[data-africa-agri-layer="crop-maize-production"]').checked,true);assert.equal(q('[data-africa-agri-layer="crop-rice-production"]').checked,true);
  q('[data-africa-commodity="wheat"]').click();assert.equal(parameters(window).get('crop'),'wheat');assert.equal(parameters(window).get('agriLayers'),'crop-maize-production,crop-rice-production,livestock-cattle');
  assert.deepEqual(visibleKeys(root),['crop-maize-production','crop-rice-production','livestock-cattle']);
  q('[data-africa-crop-measure="harvested"]').click();assert.equal(parameters(window).get('agriLayers'),'crop-maize-harvested,crop-rice-harvested,livestock-cattle');
  const retainedLayers=parameters(window).get('agriLayers'),statisticsUrl=new URL(window.location.href);
  statisticsUrl.searchParams.set('view','statistics');navigate(statisticsUrl.search);
  assert.equal(root.querySelectorAll('[data-africa-agri-layer]').length,0,'statistics mode exposes no controls implying visible distribution layers');
  assert.equal(q('.africa-agri-layer-controls'),null);
  assert.equal(parameters(window).get('crop'),'wheat');assert.equal(parameters(window).get('agriLayers'),retainedLayers);
  q('[data-africa-commodity="wheat"]').click();
  assert.equal(parameters(window).get('view'),'distribution');assert.equal(root.querySelectorAll('[data-africa-agri-layer]').length,7);
  assert.equal(parameters(window).get('crop'),'wheat');assert.equal(parameters(window).get('agriLayers'),retainedLayers);
  assert.equal(q('[data-africa-commodity="wheat"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(visibleKeys(root),['crop-maize-harvested','crop-rice-harvested','livestock-cattle']);
 });
});

test('comparison, nature URL reload, return and overview links retain explicit layers and outline with the original selection',async()=>{
 let natureURL,source;
 await withController('?field=agriculture&topic=farming&crop=rice&cropMeasure=production&livestock=goats&place=KEN&compare=ETH&year=2023&zoom=all&agriLayers=crop-rice-production,livestock-goats&agriOutline=1',({window,q})=>{
  source=readState(window.location.search);q('[data-theme-comparison]').click();
  assert.equal(parameters(window).get('agriLayers'),source.agriLayers);assert.equal(parameters(window).get('agriOutline'),'1');
  const snapshot=parameters(window).get('sourceState');assert.equal(snapshot,africaComparisonSnapshot(source));
  const overview=new URL(q('[data-africa-overview-link]').href);assert.equal(overview.searchParams.get('agriLayers'),source.agriLayers);assert.equal(overview.searchParams.get('agriOutline'),'1');assert.equal(overview.searchParams.get('sourceState'),snapshot);
  natureURL='?'+new URLSearchParams({...Object.fromEntries(parameters(window)),field:'nature',metric:'AG.LND.PRCP.MM',topic:'climate',context:'AG.LND.PRCP.MM',sourceState:snapshot});
 });
 await withController(natureURL,async({window,root,q})=>{
  assert.equal(parameters(window).get('agriLayers'),source.agriLayers);assert.equal(parameters(window).get('agriOutline'),'1');
  q('[data-theme-return]').click();await wait(()=>root.dataset.field==='agriculture'&&root.querySelectorAll('[data-africa-agri-layer]').length===7,'return must restore agriculture controls');
  const restored=readState(window.location.search);assert.deepEqual(restored,source);
  assert.deepEqual(visibleKeys(root),['crop-rice-production','livestock-goats']);assert.match(q('[data-theme-return]').textContent,/ケニア/);
 });
});

// Canvas and network are boundary fixtures. The real renderer determines every
// pixel, selected-class filter, draw order, footprint and async state transition.
async function withRasterFixture(run){
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 const captures=new Map();let serial=0;
 const prototype=window.HTMLCanvasElement.prototype;
 prototype.getContext=function(){const canvas=this;return this._context??= {pixels:null,segments:[],point:null,createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4)}),putImageData(image){this.pixels=[...image.data];},beginPath(){this.segments=[];},moveTo(x,y){this.point=[x,y];},lineTo(x,y){this.segments.push([...this.point,x,y]);this.point=[x,y];},stroke(){},canvas};};
 prototype.toDataURL=function(){const id='data:image/png;fixture,'+(++serial);captures.set(id,{pixels:this._context.pixels,segments:this._context.segments.map(row=>[...row])});return id;};
 const gridValues={'maize-harvested':[0,2,-1,8,NaN,0],'rice-harvested':[0,.0000001,0,4,-1,0],cattle:[3,0,4,-1,0,6]};
 const layer=(id,unit)=>({title:id,period:'2020年モデル',unit,width:3,height:2,bounds:[-27,-36,64,39],encoding:'float32-le',noData:-1,zeroValue:0,zeroId:'zero',zeroColor:'#eeeeee',breaks:[5],colors:['#112233','#445566'],legend:[{id:'zero',label:'0',color:'#eeeeee'},{id:'low',label:'5未満',color:'#112233'},{id:'high',label:'5以上',color:'#445566'}],positiveLegend:[{id:'low',color:'#112233'},{id:'high',color:'#445566'}],grid:id+'.bin',image:id+'.png',source:{url:'https://example.com/primary',period:'2020年モデル'}});
 const manifests={crops:{layers:{'maize-harvested':layer('maize-harvested','ha'),'rice-harvested':layer('rice-harvested','ha')}},livestock:{layers:{cattle:layer('cattle','頭/km²')}}};
 try{
  window.document.body.innerHTML='<div><svg><path data-country-path="KEN" d="M1 1L2 1L2 2Z"></path><g data-africa-actual-layer></g></svg></div>';
  const root=window.document.body.firstElementChild;let state=readState('?field=agriculture&crop=maize&zoom=all&agriLayers=crop-maize-harvested,crop-rice-harvested,livestock-cattle&agriOutline=1'),view;
  const fetcher=async url=>{const file=new URL(url,base).pathname.split('/').at(-1),family=url.includes('crops')?'crops':'livestock';if(file==='manifest.json')return new Response(JSON.stringify(manifests[family]));const values=gridValues[file.replace('.bin','')];assert.ok(values,'fixture grid exists: '+file);return new Response(new Float32Array(values));};
  const renderer=createAfricaLayerRenderer(root,()=>{view=renderer.render(state);},fetcher);
  const settle=async()=>{await wait(()=>view?.ready&&!view.loading&&view.visibleLayers.every(row=>row.ready),'all native fixture grids must finish before pixel assertions');};
  view=renderer.render(state);await settle();
  const capture=selector=>{const image=root.querySelector(selector);assert.ok(image,selector);const result=captures.get(image.getAttribute('href'));assert.ok(result,'renderer must draw the fixture canvas');return result;};
  await run({root,capture,get view(){return view;},async select(classId){state={...state,layerClass:classId};view=renderer.render(state);await settle();}});
 }finally{globalThis.document=previous;await window.happyDOM.abort();}
}

const rgba=(pixels,index)=>pixels.slice(index*4,index*4+4);
test('mixed rendering retains focused quantities and zeros, with distinct other-product colors only for raw positive cells',async()=>{
 await withRasterFixture(({root,capture})=>{
  const focus=capture('[data-africa-commodity-layer="crop-maize-harvested"] image').pixels;
  assert.deepEqual(rgba(focus,1),[17,34,51,255]);assert.deepEqual(rgba(focus,3),[68,85,102,255]);
  for(const i of [0,2,4,5])assert.equal(rgba(focus,i)[3],0);
  const zero=capture('[data-africa-agri-zero-base] image').pixels;for(const i of [0,5])assert.deepEqual(rgba(zero,i),[238,238,238,255]);for(const i of [1,2,3,4])assert.equal(rgba(zero,i)[3],0);
  const rice=capture('[data-africa-commodity-layer="crop-rice-harvested"] image').pixels,cattle=capture('[data-africa-commodity-layer="livestock-cattle"] image').pixels;
  for(const i of [1,3])assert.deepEqual(rgba(rice,i),[54,123,176,255]);for(const i of [0,2,5])assert.deepEqual(rgba(cattle,i),[185,87,77,255]);
  for(const i of [0,2,4,5])assert.equal(rgba(rice,i)[3],0);for(const i of [1,3,4])assert.equal(rgba(cattle,i)[3],0);
  assert.equal(root.querySelector('[data-africa-actual-layer]').firstElementChild.hasAttribute('data-africa-agri-zero-base'),true);
 });
});

test('quantity class filters preserve independent presence layers and whole raw-positive outlines, while zero follows the selected class',async()=>{
 await withRasterFixture(async({capture,select})=>{
  const outline=capture('[data-africa-agri-footprint]').segments;assert.equal(outline.length,8,'both isolated positive cells contribute four boundary edges');
  const presence=capture('[data-africa-commodity-layer="livestock-cattle"] image').pixels;
  await select('low');let focus=capture('[data-africa-commodity-layer="crop-maize-harvested"] image').pixels;
  assert.deepEqual(rgba(focus,1),[17,34,51,255]);assert.equal(rgba(focus,3)[3],0);
  assert.ok(capture('[data-africa-agri-zero-base] image').pixels.every(value=>value===0));assert.deepEqual(capture('[data-africa-commodity-layer="livestock-cattle"] image').pixels,presence);assert.deepEqual(capture('[data-africa-agri-footprint]').segments,outline);
  await select('zero');focus=capture('[data-africa-commodity-layer="crop-maize-harvested"] image').pixels;assert.ok(focus.every(value=>value===0));assert.equal(rgba(capture('[data-africa-agri-zero-base] image').pixels,0)[3],255);assert.deepEqual(capture('[data-africa-agri-footprint]').segments,outline);
 });
});
