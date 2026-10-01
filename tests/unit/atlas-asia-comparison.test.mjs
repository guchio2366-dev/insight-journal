import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {resolve} from 'node:path';
import {startAsiaComparison,restoreAsiaComparison,writeAsiaAtlasState} from '../../src/lib/atlas-asia-state.ts';

const built=await build({entryPoints:[resolve('src/scripts/atlas-asia-comparison.ts')],bundle:true,format:'iife',globalName:'AsiaComparison',platform:'browser',write:false,logLevel:'silent'});
const context={countries:['CHN','JPN'],cities:[],bounds:[72,17,147,55],fields:['natural','agriculture','industry','population'],topics:{natural:['climate'],agriculture:['wheat','overview'],industry:['trade-exports','power'],population:['density','urban','ethnicity']},details:{population:['tibetan','uc-selected','uc-other'],industry:['plant']}};
const originalUrl=new URL('https://example.org/atlas/asia/east-asia/');
const base={field:'agriculture',topic:'wheat',place:'CHN',city:null,point:[115,37.8],camera:{lng:117,lat:35,zoom:4},back:null};

test('比較を続けても最初の主題・地点・カメラへの復帰先を保持する',()=>{
  const first=startAsiaComparison(originalUrl,base,'natural');
  const second=startAsiaComparison(writeAsiaAtlasState(originalUrl,first),{...first,point:[120,40]},'population');
  assert.equal(second.back,first.back);
  assert.deepEqual(restoreAsiaComparison(originalUrl,second,context),base);
});

function setup(from,to,fetcher){
  const state={...startAsiaComparison(originalUrl,from,to.field),...to};
  const url=writeAsiaAtlasState(originalUrl,state),window=new Window({url:url.href});
  window.document.body.innerHTML='<main data-asia-atlas><section data-comparison-reading hidden><h3 data-comparison-title></h3><p data-comparison-summary></p><div data-comparison-compact></div></section><details data-comparison-method hidden><summary>詳細</summary><div data-comparison-legend></div></details><button data-comparison-back>戻る</button></main>';
  window.fetch=fetcher??(async()=>{throw Error('unexpected request')});window.eval(built.outputFiles[0].text+';window.createComparison=AsiaComparison.createAsiaComparison;');
  const config={regionId:'east-asia',label:'東アジア',countries:[{code:'CHN',name:'中国'},{code:'JPN',name:'日本'}],cities:[],classes:[{id:1,code:'Af',name:'熱帯雨林気候',color:'#0000ff'},{id:2,code:'Am',name:'熱帯季節風気候',color:'#0078ff'}],climate:{classIds:[1,2],image:'climate.png',imageCoordinates:[[72,55],[147,55],[147,17],[72,17]]},climateBase:'/climate/',agricultureBase:'/rice/',geographyUrl:'/geography.json',populationBase:'/population/',population:{image:'population.png',imageCoordinates:[[72,55],[147,55],[147,17],[72,17]],cities:[]},farmingBase:'/farm/',farming:{layers:[{id:'wheat',title:'小麦の収穫面積',kind:'crop',year:2020,unit:'ha/格子',image:'wheat.png',imageCoordinates:[[72,55],[147,55],[147,17],[72,17]],breaks:[10,100],colors:['eeeeee','aaaaaa','555555']}]},industry:{topics:[{id:'trade-exports',title:'商品輸出額',kind:'trade'}],countries:['CHN','JPN']},tradeBase:'/trade/',trade:{file:'trade.json',countries:['CHN','JPN']},presentation:{settlements:{ethnicity:{file:'ethnicity.json',categories:[{id:'tibetan',label:'チベット系',color:'#aabbcc'}]}}},presentationBase:'/asia-presentation-v1/'};
  const root=window.document.querySelector('main'),controller=window.createComparison(root,config,context,()=>state);
  return {window,root,state,controller,config};
}
async function waitForReading(root){
  const deadline=Date.now()+5000;
  while(!root.querySelector('[data-comparison-original]')){
    assert.ok(Date.now()<deadline,'比較元と比較先の凡例が準備完了しませんでした: '+root.querySelector('[data-comparison-legend]').textContent);
    await new Promise(resolve=>setImmediate(resolve));
  }
}
const response=data=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(data)).buffer});

test('比較元の全色区分と比較先の全色区分を、年・単位とともに表示する',async()=>{
  const {root,controller,state}=setup(base,{field:'natural',topic:'climate'});
  controller.render(state);
  await waitForReading(root);
  const legend=root.querySelector('[data-comparison-legend]').textContent;
  for(const expected of ['小麦の収穫面積','2020年','ha/格子','10未満','10以上100未満','100以上','Af 熱帯雨林気候','Am 熱帯季節風気候','1991–2020年'])assert.ok(legend.includes(expected),expected);
  assert.match(root.querySelector('[data-comparison-back]').textContent,/中国の小麦の収穫面積へ戻る/);
  assert.match(root.querySelector('[data-comparison-summary]').textContent,/灌漑/);
  const compact=root.querySelector('[data-comparison-compact]');
  assert.equal(compact.closest('details'),null);assert.equal(compact.hidden,false);
  assert.equal(root.querySelector('[data-comparison-method]').hidden,false);
  const original=compact.querySelector('[data-comparison-compact-role="original"]'),current=compact.querySelector('[data-comparison-compact-role="current"]');
  assert.match(original.textContent,/2020年.*ha\/格子/);assert.equal(original.querySelectorAll('i').length,3);
  assert.match(current.textContent,/1991–2020年.*ケッペン＝ガイガー分類/);assert.equal(current.querySelectorAll('i').length,2);
  assert.deepEqual([...current.querySelectorAll('.asia-comparison-compact-key>span')].map(e=>e.textContent),['Af','Am']);
  assert.equal(current.querySelector('.asia-comparison-compact-key>span').getAttribute('aria-label'),'Af 熱帯雨林気候');
  controller.render({...state,back:null});assert.equal(compact.hidden,true);assert.equal(compact.children.length,0);
  assert.equal(root.querySelector('[data-comparison-method]').hidden,true);
});

test('貿易凡例の百万米ドルと閾値の倍率を揃え、元区域の分布を描画する',async()=>{
  const geography={type:'FeatureCollection',features:[{type:'Feature',properties:{code:'CHN'},geometry:{type:'Polygon',coordinates:[[[100,30],[110,30],[110,40],[100,30]]]}}]};
  const data={countries:{CHN:{products:{TOTAL:{X:100000000}}},JPN:{products:{TOTAL:{X:null}}}}};
  const {root,controller,state}=setup({...base,field:'industry',topic:'trade-exports'},{field:'population',topic:'density'},async url=>response(url.includes('geography')?geography:data));
  controller.render(state);await waitForReading(root);
  const text=root.querySelector('[data-comparison-legend]').textContent;
  assert.match(text,/百万米ドル/);assert.match(text,/1未満/);assert.match(text,/10以上30未満/);assert.ok(!text.includes('1,000,000未満'));
  const map={sources:{},layers:{},getStyle(){return {};},getSource(id){return this.sources[id];},getLayer(id){return this.layers[id];},addSource(id,source){this.sources[id]=source;},addLayer(layer){this.layers[layer.id]=layer;},setLayoutProperty(id,name,value){(this.layers[id].layout??={})[name]=value;},setPaintProperty(){},setFilter(id,filter){this.layers[id].filter=filter;}};
  await controller.show(map);
  assert.equal(map.sources['asia-comparison-original'].data.features[0].properties.code,'CHN');
  assert.equal(map.layers['asia-comparison-original-line'].layout.visibility,'visible');
  assert.equal(root.dataset.comparisonOriginal,'outline');
});

test('選択した居住集団の名前を比較の戻り先に含める',async()=>{
  const {root,controller,state}=setup({...base,field:'population',topic:'ethnicity',place:null,detail:'tibetan'},{field:'natural',topic:'climate'},async()=>response({type:'FeatureCollection',features:[]}));
  controller.render(state);await waitForReading(root);
  assert.match(root.querySelector('[data-comparison-back]').textContent,/チベット系の民族の居住域へ戻る/);
  assert.ok(!root.querySelector('[data-comparison-legend]').textContent.includes('undefined'));
});

test('元区域と発電施設を比較し直しても、設備容量の半径と代表点の記号を混ぜない',async()=>{
  const geometry={type:'FeatureCollection',features:[{type:'Feature',properties:{code:'CHN'},geometry:{type:'Polygon',coordinates:[[[100,30],[110,30],[110,40],[100,30]]]}}]};
  const trade={countries:{CHN:{products:{TOTAL:{X:100000000}}},JPN:{products:{TOTAL:{X:null}}}}};
  const industry={admin:[],steel:{},geometry,power:[{id:'plant',country:'CHN',name:'資料中の発電施設',point:[105,35],fuel:'Coal',capacity:1000}]};
  const from={...base,field:'industry',topic:'trade-exports'};
  const {root,controller,state,config}=setup(from,{field:'natural',topic:'climate'},async url=>response(url.includes('geography')?geometry:url.includes('national')?{indicators:[]}:url.includes('industry')?industry:trade));
  config.industry.data='industry.json';config.industry.topics.push({id:'power',title:'発電施設の設備容量',kind:'power',fuel:'all',unit:'MW',year:'資料の設備年'});
  const map={sources:{},layers:{},getStyle(){return {};},getSource(id){return this.sources[id];},getLayer(id){return this.layers[id];},addSource(id,source){this.sources[id]={...source,setData(data){this.data=data;}};},addLayer(layer){this.layers[layer.id]=layer;},setLayoutProperty(id,name,value){(this.layers[id].layout??={})[name]=value;},setPaintProperty(id,name,value){this.layers[id].paint[name]=value;},setFilter(id,filter){this.layers[id].filter=filter;}};
  const id='asia-comparison-original-point';
  controller.render(state);await waitForReading(root);await controller.show(map);assert.equal(map.layers[id].paint['circle-radius'],4);
  state.back=startAsiaComparison(originalUrl,{...from,topic:'power',detail:'plant'},'natural').back;
  controller.render(state);await waitForReading(root);await controller.show(map);
  assert.ok(Array.isArray(map.layers[id].paint['circle-radius']));
  assert.match(JSON.stringify(map.layers[id].paint['circle-radius']),/capacity/);
  assert.equal(map.layers[id].paint['circle-opacity'],0);
  assert.equal(map.sources['asia-comparison-original'].data.features[0].properties.capacity,1000);
  assert.match(root.querySelector('[data-comparison-legend]').textContent,/100MWで3px、1,000MWで9px、4,000MW以上で18px/);
  assert.match(root.querySelector('[data-comparison-compact]').textContent,/100MW＝3px \/ 1,000MW＝9px \/ 4,000MW以上＝18px/);
  assert.match(root.querySelector('[data-comparison-back]').textContent,/資料中の発電施設/);
  controller.render(state);
  assert.match(root.querySelector('[data-comparison-back]').textContent,/資料中の発電施設/);
  state.back=startAsiaComparison(originalUrl,from,'natural').back;
  controller.render(state);await waitForReading(root);await controller.show(map);
  assert.equal(map.layers[id].paint['circle-radius'],4);
  assert.equal(map.layers[id].paint['circle-color'],'#fff');
  assert.equal(map.layers[id].paint['circle-opacity'],1);
});

test('都市人口から比較しても元の人口図と選択都市だけの境界を同時に残す',async()=>{
  const cityFeature=id=>({type:'Feature',properties:{id},geometry:{type:'Polygon',coordinates:[[[100,30],[110,30],[110,40],[100,30]]]}});
  const urban={type:'FeatureCollection',features:[cityFeature('uc-selected'),cityFeature('uc-other')]},requested=[];
  const {root,window,controller,state,config}=setup({...base,field:'population',topic:'urban',detail:'uc-selected'},{field:'natural',topic:'climate'},async url=>{requested.push(url);return response(urban);});
  config.population.urban='urban.json';config.population.cities=[{id:'uc-selected',name:'都市A',country:'CHN'},{id:'uc-other',name:'都市B',country:'CHN'}];
  window.Image=class{naturalWidth=3;naturalHeight=3;async decode(){}};
  const pixels=new Uint8ClampedArray(36);for(let i=0;i<pixels.length;i+=4){pixels[i]=120;pixels[i+1]=100;pixels[i+2]=80;pixels[i+3]=255;}
  window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData(){return {data:pixels};},createImageData(){return {data:new Uint8ClampedArray(36)};},putImageData(){}});
  window.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,fixture';
  const map={sources:{},layers:{},getStyle(){return {};},getSource(id){return this.sources[id];},getLayer(id){return this.layers[id];},addSource(id,source){this.sources[id]={...source,setData(data){this.data=data;}};},removeSource(id){delete this.sources[id];},addLayer(layer){this.layers[layer.id]=layer;},removeLayer(id){delete this.layers[id];},setLayoutProperty(id,name,value){(this.layers[id].layout??={})[name]=value;},setPaintProperty(id,name,value){this.layers[id].paint[name]=value;},setFilter(id,filter){this.layers[id].filter=filter;}};
  controller.render(state);await waitForReading(root);await controller.show(map);
  assert.deepEqual(requested,['/population/urban.json']);
  assert.ok(map.layers['asia-comparison-original-raster']);
  const selected=map.sources['asia-comparison-original'].data.features;
  assert.equal(selected.length,1);assert.equal(selected[0].properties.id,'uc-selected');
  assert.equal(map.layers['asia-comparison-original-line'].layout.visibility,'visible');
  assert.equal(map.layers['asia-comparison-original-area'].layout.visibility,'none');
  const legend=root.querySelector('[data-comparison-legend]').textContent;
  assert.match(legend,/都市Aの都市範囲（2025年資料の固定境界）/);assert.ok(!legend.includes('都市B'));
  root.querySelector('[data-comparison-original]').click();await controller.show(map);
  assert.equal(map.sources['asia-comparison-original-raster'].url,'/population/population.png');
  assert.equal(map.layers['asia-comparison-original-line'].layout.visibility,'visible');
  assert.equal(map.layers['asia-comparison-original-area'].layout.visibility,'none');
});

test('比較先の米・雨・川と農畜産切替で、その表示に対応する凡例を更新する',async()=>{
  const features=[{type:'Feature',properties:{kind:'crop',id:'rice',color:'#00ff00'},geometry:{type:'Polygon',coordinates:[]}},{type:'Feature',properties:{kind:'crop',id:'soybean',color:'#ffaa00'},geometry:{type:'Polygon',coordinates:[]}}];
  const {root,controller,state,config}=setup(base,{field:'agriculture',topic:'overview'},async()=>response({type:'FeatureCollection',features}));
  config.presentation.farming={file:'overview.json',products:[{id:'rice',title:'米',kind:'crop',color:'#00ff00'},{id:'soybean',title:'大豆',kind:'crop',color:'#ffaa00'},{id:'cattle',title:'牛',kind:'livestock',color:'#aabbcc'}],labels:[]};config.presentation.rainfall={file:'rain.json'};
  controller.render(state);await waitForReading(root);assert.match(root.querySelector('[data-comparison-legend]').textContent,/大豆/);
  state.overlay='water';controller.render(state);await waitForReading(root);
  let legend=root.querySelector('[data-comparison-legend]').textContent;assert.match(legend,/年降水量の等雨量線/);assert.ok(!legend.includes('大豆'));
  state.overlay=null;state.farms='crop';controller.render(state);await waitForReading(root);assert.match(root.querySelector('[data-comparison-legend]').textContent,/大豆/);
  assert.deepEqual([...root.querySelectorAll('[data-comparison-compact-role="current"] .asia-comparison-compact-key>span')].map(e=>e.textContent),['米','大豆']);
  state.farms='none';controller.render(state);assert.match(root.querySelector('[data-comparison-legend]').textContent,/読み込んでいます/);await waitForReading(root);
  assert.equal(root.querySelectorAll('[data-comparison-compact-role="current"] .asia-comparison-compact-key>span').length,0);
});
