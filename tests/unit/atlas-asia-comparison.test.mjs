import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {resolve} from 'node:path';
import {startAsiaComparison,restoreAsiaComparison,writeAsiaAtlasState} from '../../src/lib/atlas-asia-state.ts';

const built=await build({entryPoints:[resolve('src/scripts/atlas-asia-comparison.ts')],bundle:true,format:'iife',globalName:'AsiaComparison',platform:'browser',write:false,logLevel:'silent'});
const context={countries:['CHN','JPN'],cities:[],bounds:[72,17,147,55],fields:['natural','agriculture','industry','population'],topics:{natural:['climate'],agriculture:['wheat'],industry:['trade-exports'],population:['density','ethnicity']},details:{population:['tibetan']}};
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
  window.document.body.innerHTML='<main data-asia-atlas><section data-comparison-reading hidden><h3 data-comparison-title></h3><p data-comparison-summary></p><div data-comparison-legend></div></section><button data-comparison-back>戻る</button></main>';
  window.fetch=fetcher??(async()=>{throw Error('unexpected request')});window.eval(built.outputFiles[0].text+';window.createComparison=AsiaComparison.createAsiaComparison;');
  const config={regionId:'east-asia',label:'東アジア',countries:[{code:'CHN',name:'中国'},{code:'JPN',name:'日本'}],cities:[],classes:[{id:1,code:'Af',name:'熱帯雨林気候',color:'#0000ff'},{id:2,code:'Am',name:'熱帯季節風気候',color:'#0078ff'}],climate:{classIds:[1,2],image:'climate.png',imageCoordinates:[[72,55],[147,55],[147,17],[72,17]]},climateBase:'/climate/',agricultureBase:'/rice/',geographyUrl:'/geography.json',populationBase:'/population/',population:{image:'population.png',imageCoordinates:[[72,55],[147,55],[147,17],[72,17]],cities:[]},farmingBase:'/farm/',farming:{layers:[{id:'wheat',title:'小麦の収穫面積',kind:'crop',year:2020,unit:'ha/格子',image:'wheat.png',imageCoordinates:[[72,55],[147,55],[147,17],[72,17]],breaks:[10,100],colors:['eeeeee','aaaaaa','555555']}]},industry:{topics:[{id:'trade-exports',title:'商品輸出額',kind:'trade'}],countries:['CHN','JPN']},tradeBase:'/trade/',trade:{file:'trade.json',countries:['CHN','JPN']},presentation:{settlements:{ethnicity:{file:'ethnicity.json',categories:[{id:'tibetan',label:'チベット系',color:'#aabbcc'}]}}},presentationBase:'/asia-presentation-v1/'};
  const root=window.document.querySelector('main'),controller=window.createComparison(root,config,context,()=>state);
  return {window,root,state,controller};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
const response=data=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(data)).buffer});

test('比較元の全色区分と比較先の全色区分を、年・単位とともに表示する',async()=>{
  const {root,controller,state}=setup(base,{field:'natural',topic:'climate'});
  controller.render(state);
  await settle();
  const legend=root.querySelector('[data-comparison-legend]').textContent;
  for(const expected of ['小麦の収穫面積','2020年','ha/格子','10未満','10以上100未満','100以上','Af 熱帯雨林気候','Am 熱帯季節風気候','1991–2020年'])assert.ok(legend.includes(expected),expected);
  assert.match(root.querySelector('[data-comparison-back]').textContent,/中国の小麦の収穫面積へ戻る/);
  assert.match(root.querySelector('[data-comparison-summary]').textContent,/灌漑/);
});

test('貿易凡例の百万米ドルと閾値の倍率を揃え、元区域の分布を描画する',async()=>{
  const geography={type:'FeatureCollection',features:[{type:'Feature',properties:{code:'CHN'},geometry:{type:'Polygon',coordinates:[[[100,30],[110,30],[110,40],[100,30]]]}}]};
  const data={countries:{CHN:{products:{TOTAL:{X:100000000}}},JPN:{products:{TOTAL:{X:null}}}}};
  const {root,controller,state}=setup({...base,field:'industry',topic:'trade-exports'},{field:'population',topic:'density'},async url=>response(url.includes('geography')?geography:data));
  controller.render(state);await settle();
  const text=root.querySelector('[data-comparison-legend]').textContent;
  assert.match(text,/百万米ドル/);assert.match(text,/1未満/);assert.match(text,/10以上30未満/);assert.ok(!text.includes('1,000,000未満'));
  const map={sources:{},layers:{},getStyle(){return {};},getSource(id){return this.sources[id];},getLayer(id){return this.layers[id];},addSource(id,source){this.sources[id]=source;},addLayer(layer){this.layers[layer.id]=layer;},setLayoutProperty(id,name,value){(this.layers[id].layout??={})[name]=value;},setPaintProperty(){}};
  await controller.show(map);
  assert.equal(map.sources['asia-comparison-original'].data.features[0].properties.code,'CHN');
  assert.equal(map.layers['asia-comparison-original-line'].layout.visibility,'visible');
  assert.equal(root.dataset.comparisonOriginal,'outline');
});

test('選択した居住集団の名前を比較の戻り先に含める',async()=>{
  const {root,controller,state}=setup({...base,field:'population',topic:'ethnicity',place:null,detail:'tibetan'},{field:'natural',topic:'climate'},async()=>response({type:'FeatureCollection',features:[]}));
  controller.render(state);await settle();
  assert.match(root.querySelector('[data-comparison-back]').textContent,/チベット系の民族の居住域へ戻る/);
  assert.ok(!root.querySelector('[data-comparison-legend]').textContent.includes('undefined'));
});
