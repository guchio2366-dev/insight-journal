import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {southeastFarmGroups,southeastFarmGroupTopics,southeastFarmVisibleProducts} from '../../src/data/atlas/asia/southeast-asia-farm-groups.ts';
import {startAsiaComparison,writeAsiaAtlasState,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';

const farm=JSON.parse(readFileSync('public/assets/atlas/asia-presentation-v1/manifest.json','utf8')).regions['southeast-asia'].farming;
const geometry=JSON.parse(gunzipSync(readFileSync('public/assets/atlas/asia-presentation-v1/'+farm.file)));
const built=await build({entryPoints:['src/scripts/atlas-asia-comparison.ts'],bundle:true,format:'iife',globalName:'ComparisonTest',write:false});
const context={countries:['VNM'],cities:[],bounds:[90,-12,142,28],fields:['natural','agriculture'],topics:{natural:['climate'],agriculture:['overview',...southeastFarmGroupTopics,...farm.products.map(product=>product.id)]}};
const url=new URL('https://example.test/atlas/asia/southeast-asia/agriculture/');
const base={field:'agriculture',topic:'overview',place:'VNM',city:null,point:[108.1,12.7],camera:{lng:110,lat:9,zoom:4},back:null};
const config={regionId:'southeast-asia',label:'東南アジア',countries:[{code:'VNM',name:'ベトナム'}],cities:[],classes:[{id:1,code:'Af',name:'熱帯雨林気候',color:'#008842'}],climate:{classIds:[1],image:'climate.png',imageCoordinates:[[90,28],[142,28],[142,-12],[90,-12]]},climateBase:'/climate/',agricultureBase:'/rice/',geographyUrl:'/geography.json',presentation:{farming:farm},presentationBase:'/presentation/'};
const settle=async check=>{for(let attempt=0;attempt<100;attempt++){if(check())return;await new Promise(resolve=>setImmediate(resolve));}assert.fail('comparison did not settle');};

test('Southeast comparison retains each group or single product in the original geometry and both legends',async()=>{
 for(const selection of [...southeastFarmGroupTopics.map(topic=>({topic})),{topic:'overview'},{topic:'maize'},{topic:'maize',single:true},{topic:'chicken'},{topic:'chicken',single:true}]){
  const from={...base,...selection},state={...startAsiaComparison(url,from,'natural'),topic:'climate'},requests=[];
  const window=new Window({url:writeAsiaAtlasState(url,state).href,settings:{enableJavaScriptEvaluation:true}});
  try{
   window.document.body.innerHTML='<main><div data-reading-map-legend></div><section data-comparison-reading><h3 data-comparison-title></h3><p data-comparison-summary></p><div data-comparison-compact></div></section><details data-comparison-method><div data-comparison-legend></div></details><button data-comparison-back></button></main>';
   window.fetch=async requested=>{requests.push(requested);assert.equal(requested,'/presentation/'+farm.file);return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(geometry)).buffer};};
   window.eval(built.outputFiles[0].text+';window.createComparison=ComparisonTest.createAsiaComparison;');
   const root=window.document.querySelector('main'),controller=window.createComparison(root,config,context,()=>state);
   const map={sources:{},layers:{},getStyle(){return {};},getSource(id){return this.sources[id];},getLayer(id){return this.layers[id];},addSource(id,source){this.sources[id]=source;source.setData=data=>{source.data=data;};},addLayer(layer){this.layers[layer.id]=layer;},setLayoutProperty(id,name,value){(this.layers[id].layout??={})[name]=value;},setPaintProperty(){},setFilter(){}};
   controller.render(state);await settle(()=>root.querySelector('[data-comparison-original]'));await controller.show(map);
   const allowed=southeastFarmVisibleProducts(from.topic,from.single);
   assert.ok(map.sources['asia-comparison-original'],'group must use its geometry, never the fallback rice raster');
   assert.equal(map.sources['asia-comparison-original-raster'],undefined);
   const features=map.sources['asia-comparison-original'].data.features;
   assert.ok(features.length>0);
   assert.deepEqual([...new Set(features.map(feature=>feature.properties.id))].sort(),[...allowed].sort(),JSON.stringify(selection));
   const original=root.querySelector('[data-comparison-compact-role="original"]');
   assert.deepEqual([...original.querySelectorAll('.asia-comparison-compact-key>span')].map(element=>element.textContent),farm.products.filter(product=>allowed.includes(product.id)).map(product=>product.title));
   assert.match(root.querySelector('[data-comparison-compact-role="current"]').textContent,/Af/);
   assert.deepEqual(requests,['/presentation/'+farm.file]);
   assert.equal(restoreAsiaComparison(url,state,context).topic,from.topic);
   const group=southeastFarmGroups.find(group=>group.id===from.topic);
   if(group)assert.ok(root.querySelector('[data-comparison-back]').textContent.includes(group.title));
   if(from.topic==='farm-livestock')assert.ok(features.every(feature=>feature.geometry.type==='Point'));
  }finally{await window.happyDOM.close();}
 }
});

test('changing single-product mode refreshes the Southeast current legend',async()=>{
 const window=new Window({url:url.href,settings:{enableJavaScriptEvaluation:true}});
 try{
  window.document.body.innerHTML='<main><div data-reading-map-legend></div><section data-comparison-reading><div data-comparison-compact></div></section><div data-comparison-legend></div></main>';
  window.fetch=async()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(geometry)).buffer});
  window.eval(built.outputFiles[0].text+';window.createComparison=ComparisonTest.createAsiaComparison;');
  let state={...base,topic:'maize',single:false};const root=window.document.querySelector('main'),controller=window.createComparison(root,config,context,()=>state);
  controller.render(state);await settle(()=>root.querySelector('[data-comparison-compact-role="main"]'));
  const labels=()=>[...root.querySelectorAll('[data-reading-map-legend] .asia-comparison-compact-key>span')].map(element=>element.textContent);
  assert.deepEqual(labels(),['米','トウモロコシ']);
  state={...state,single:true};controller.render(state);await settle(()=>labels().length===1);assert.deepEqual(labels(),['トウモロコシ']);
  state={...state,single:false};controller.render(state);await settle(()=>labels().length===2);assert.deepEqual(labels(),['米','トウモロコシ']);
 }finally{await window.happyDOM.close();}
});

