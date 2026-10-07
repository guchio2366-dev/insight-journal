import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {resolve} from 'node:path';
import {startAsiaComparison,restoreAsiaComparison,writeAsiaAtlasState} from '../../src/lib/atlas-asia-state.ts';
import {asiaPlaceReadings,choosePlaceReading,startPlaceComparison} from '../../src/data/atlas/asia-place-readings.ts';

const built=await build({entryPoints:[resolve('src/scripts/atlas-asia-comparison.ts')],bundle:true,format:'iife',globalName:'AsiaComparison',platform:'browser',write:false,logLevel:'silent'});
const context={countries:['CHN','JPN'],cities:[],bounds:[72,17,147,55],fields:['natural','agriculture','industry','population'],topics:{natural:['climate','precipitation'],agriculture:['wheat','overview'],industry:['trade-exports','power'],population:['density','urban','ethnicity']},details:{population:['tibetan','uc-selected','uc-other'],industry:['plant']},stories:{agriculture:['north-china-wheat']}};
const originalUrl=new URL('https://example.org/atlas/asia/east-asia/');
const base={field:'agriculture',topic:'wheat',place:'CHN',city:null,point:[115,37.8],camera:{lng:117,lat:35,zoom:4},back:null};

test('比較を続けても最初の主題・地点・カメラへの復帰先を保持する',()=>{
  const first=startAsiaComparison(originalUrl,base,'natural');
  const second=startAsiaComparison(writeAsiaAtlasState(originalUrl,first),{...first,point:[120,40]},'population');
  assert.equal(second.back,first.back);
  assert.deepEqual(restoreAsiaComparison(originalUrl,second,context),base);
});

function setup(from,to,fetcher,withMainLegend=false){
  const state={...startAsiaComparison(originalUrl,from,to.field),...to};
  const url=writeAsiaAtlasState(originalUrl,state),window=new Window({url:url.href});
  window.document.body.innerHTML='<main data-asia-atlas><section data-comparison-reading hidden><h3 data-comparison-title></h3><p data-comparison-summary></p><div data-comparison-compact></div></section><details data-comparison-method hidden><summary>詳細</summary><div data-comparison-legend></div></details><button data-comparison-back>戻る</button></main>';
  if(withMainLegend)window.document.querySelector('main').insertAdjacentHTML('afterbegin','<div data-reading-map-legend></div>');
  window.fetch=fetcher??(async()=>{throw Error('unexpected request')});window.eval(built.outputFiles[0].text+';window.createComparison=AsiaComparison.createAsiaComparison;window.comparisonQuestion=AsiaComparison.comparisonQuestion;');
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
  assert.match(root.querySelector('[data-comparison-summary]').textContent,/民族の居住域と気候区分/);
  assert.ok(!root.querySelector('[data-comparison-summary]').textContent.includes('人口の集中'));
  assert.ok(!root.querySelector('[data-comparison-legend]').textContent.includes('undefined'));
});

test('全6分野ペアの双方向で、選択主題の意味を説明する',()=>{
  const {window,config}=setup(base,{field:'natural',topic:'climate'});
  const question=window.comparisonQuestion;
  config.industry.topics.push({id:'manufacturing',title:'製造業のGDP比',kind:'national',unit:'%'});
  const choices=[{field:'natural',topic:'climate',label:'気候区分'},{field:'agriculture',topic:'wheat',label:'小麦の収穫面積'},{field:'industry',topic:'manufacturing',label:'製造業のGDP比'},{field:'population',topic:'ethnicity',label:'民族の居住域'}];
  for(let a=0;a<choices.length;a++)for(let b=0;b<choices.length;b++)if(a!==b){
    const text=question({...base,...choices[a]},{...base,...choices[b]},config);
    assert.match(text,new RegExp(choices[a].label+'と'+choices[b].label));
    assert.ok(!text.includes('人口の集中')&&!text.includes('産業の集積'),`${a}→${b}: ${text}`);
    assert.ok(text.length<=115,`${a}→${b}: ${text.length}字`);
  }
});

test('密度・社会構成・GDP比・輸出比・貿易・MW・森林を別の指標として説明する',()=>{
  const {window,config}=setup(base,{field:'natural',topic:'climate'}),question=window.comparisonQuestion;
  const topics=[['manufacturing','製造業のGDP比','national'],['power','発電施設の設備容量','power'],['steel-capacity','国別の粗鋼生産能力','steel'],['industrial-employment','工業の就業者比','national'],['manufactured-exports','商品輸出に占める製造品の割合','national'],['hightech-exports','製造品輸出に占める高技術製品の割合','national'],['resource-rents','天然資源レントのGDP比','national'],['real-gdp','実質GDP','national'],['gdp-growth','GDP成長率','national'],['jp-31','輸送用機械器具の製造品出荷額','admin'],['cn-steel','粗鋼の生産能力','admin'],['in-services','州のサービス業付加価値','admin']];
  config.industry.topics.push(...topics.map(([id,title,kind])=>({id,title,kind,unit:'%'})));
  config.farming.layers.push({id:'sheep',title:'羊の密度',kind:'livestock'},{id:'forest',title:'森林参考図',kind:'forest'});
  config.social={topics:[{id:'age',title:'65歳以上の割合',key:'old'},{id:'nationality',title:'外国籍の割合',key:'foreign'},{id:'language',title:'母語の割合',key:'language'},{id:'religion-share',title:'宗教別の割合',key:'hindu'},{id:'growth',title:'人口増減率',key:'rate'},{id:'composition',title:'区域内の最多区分',key:'overview'}]};
  const cases=[
    ['population','density',/人口密度/,/民族・信仰・勤務先/],['population','urban',/都市範囲と人口密度/,/行政区域・通勤圏/],['population','religion',/宗教と結びついた居住域/,/個人の信仰/],
    ...config.social.topics.map(t=>['population',t.id,new RegExp(t.title),t.key==='overview'?/最多区分で、人数や密度ではありません/:/割合・分母/]),
    ['industry','manufacturing',/製造業のGDP比/,/GDP比は工場の集積や生産額の規模を示しません/],['industry','power',/発電施設の設備容量/,/MWは設備容量で、発電量ではありません/],
    ['industry','steel-capacity',/国別の粗鋼生産能力/,/国全体の生産能力で、実際の生産量ではありません/],
    ['industry','trade-exports',/商品輸出額/,/生産地や港の取扱量は示しません/],['industry','trade-imports',/商品輸入額/,/生産地や港の取扱量は示しません/],
    ['industry','industrial-employment',/工業の就業者比/,/全就業者に占める割合/],['industry','manufactured-exports',/商品輸出に占める製造品/,/商品輸出に占める割合/],['industry','hightech-exports',/高技術製品/,/製造品輸出に占める割合/],['industry','resource-rents',/天然資源レント/,/生産費を差し引いたGDP比/],['industry','real-gdp',/実質GDP/,/2015年価格/],['industry','gdp-growth',/GDP成長率/,/前年比/],['industry','jp-31',/製造品出荷額/,/付加価値や工場の位置と異なります/],['industry','cn-steel',/生産能力/,/実際の生産量・出荷額/],['industry','in-services',/州のサービス業付加価値/,/都市や工場ごとの値ではありません/],
    ['agriculture','forest',/森林の分布/,/木材生産量・用途/],['agriculture','sheep',/羊の密度/,/肉・乳の生産量/],['natural','precipitation',/年降水量/,/季節配分や現在の雨/],['natural','basins',/流域/,/現在の流量ではありません/],['natural','groundwater',/地下水盆地と河川/,/現在の水量・取水量/]
  ];
  for(const [field,topic,label,note] of cases)for(const reverse of [false,true]){
    const selected={...base,field,topic},other={...base,field:'natural',topic:'terrain'},text=question(reverse?other:selected,reverse?selected:other,config);
    assert.match(text,label,`${topic} label`);assert.match(text,note,`${topic} definition`);
    assert.ok(!text.includes('人口の集中と産業の集積'),topic);
  }
  config.social.groups=[{id:'jp-nationality',label:'日本：都道府県の国籍'},{id:'my-ethnicity',label:'マレーシア：市民の民族構成'},{id:'in-religion',label:'インド：宗教の構成'},{id:'in-language',label:'インド：母語の言語群'}];
  for(const [group,label] of [['jp-nationality','外国人住民の国籍'],['my-ethnicity','市民の民族'],['in-religion','宗教'],['in-language','母語の言語群']]){
    const id=group+'-overview';config.social.topics.push({id,group,key:'overview',title:'区域ごとの構成をまとめて見る'});
    assert.match(question({...base,field:'population',topic:id},{...base,field:'natural',topic:'climate'},config),new RegExp(label+'の最多区分'));
  }
  const none=question({...base,field:'agriculture',topic:'overview',farms:'none'},{...base,field:'natural',topic:'climate'},config);
  assert.match(none,/農畜産の表示と気候区分/);assert.ok(!none.includes('作物・家畜の概略分布'));
  assert.match(question({...base,field:'agriculture',topic:'overview',farms:'none',overlay:'water'},{...base,field:'natural',topic:'climate'},config),/米・雨・川の概略分布/);
});

test('事例の要点は正規選択と適合する橋だけで使い、主題変更や連続比較へ持ち越さない',()=>{
  const {window,config}=setup(base,{field:'natural',topic:'climate'}),question=window.comparisonQuestion;
  const from={...base,story:'north-china-wheat'},to={...base,field:'natural',topic:'precipitation'};
  const lead='冬小麦が育つ季節と、雨が多い季節のずれを読む。';
  assert.ok(question(from,to,config).startsWith(lead));
  assert.match(question(from,to,config),/収穫面積と灌漑.*年合計と雨の季節配分を分けます/);
  assert.equal(question(from,to,config).length,53,'the approved story follow-up remains two short lines beside both complete legends');
  for(const changed of [{...from,topic:'rice'},{...from,place:'JPN'},{...from,detail:'stale'},{...from,point:[116,38]},{...from,field:'population'}])assert.ok(!question(changed,to,config).includes(lead));
  for(const changed of [{...to,topic:'climate'},{...to,field:'population',topic:'density'},{...to,place:'JPN'},{...to,point:[116,38]}])assert.ok(!question(from,changed,config).includes(lead));
  assert.ok(!question(from,to,{...config,regionId:'southeast-asia'}).includes(lead));
  for(const scene of asiaPlaceReadings)for(const bridge of scene.bridges){
    const source=choosePlaceReading(base,scene),target=startPlaceComparison(originalUrl,source,bridge),regionConfig={...config,regionId:scene.region};
    assert.ok(question(source,target,regionConfig).startsWith(scene.lead),`${scene.id}→${bridge.topic}`);
    assert.ok(!question(source,{...target,point:[99,20]},regionConfig).startsWith(scene.lead),`${scene.id}: changed target point`);
    assert.ok(!question({...source,point:[99,20]},target,regionConfig).startsWith(scene.lead),`${scene.id}: changed source point`);
  }
});

test('比較先の地点・国だけ変えても、詳細の事例要点を同期し凡例と復帰先は保持する',async()=>{
  const {root,controller,state}=setup({...base,story:'north-china-wheat'},{field:'natural',topic:'precipitation',point:base.point});
  const lead='冬小麦が育つ季節と、雨が多い季節のずれを読む。';
  controller.render(state);await waitForReading(root);
  assert.ok(root.querySelector('[data-comparison-summary]').textContent.includes(lead));
  assert.ok(root.querySelector('[data-comparison-legend]').textContent.includes(lead));
  const compact=root.querySelector('[data-comparison-compact]').innerHTML,back=state.back;
  for(const changed of [{point:[120,40]},{point:base.point,place:'JPN'}]){
    Object.assign(state,changed);controller.render(state);
    assert.ok(!root.querySelector('[data-comparison-summary]').textContent.includes(lead));
    assert.ok(!root.querySelector('[data-comparison-legend]').textContent.includes(lead));
    assert.equal(root.querySelector('[data-comparison-compact]').innerHTML,compact);assert.equal(state.back,back);
  }
  Object.assign(state,{point:base.point,place:'CHN'});controller.render(state);
  assert.ok(root.querySelector('[data-comparison-legend]').textContent.includes(lead));
  const pending=setup({...base,story:'north-china-wheat'},{field:'natural',topic:'precipitation',point:base.point});
  pending.controller.render(pending.state);pending.state.point=[120,40];pending.controller.render(pending.state);await waitForReading(pending.root);
  assert.ok(!pending.root.querySelector('[data-comparison-legend]').textContent.includes(lead),'async completion cannot restore the invalidated lead');
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

test('初期の自然・人口・産業にも年・単位・全凡例を常時表示し、旧DOMでは追加取得しない',async()=>{
  let fetches=0;
  const fetcher=async url=>{fetches++;return response(url.includes('geography')?{type:'FeatureCollection',features:[]}:{countries:{CHN:{products:{TOTAL:{X:100000000}}},JPN:{products:{TOTAL:{X:null}}}}});};
  const {root,controller,state}=setup(base,{field:'natural',topic:'climate'},fetcher,true);
  async function showMain(field,topic){Object.assign(state,{field,topic,back:null,detail:null});controller.render(state);const deadline=Date.now()+5000;while(!root.querySelector('[data-reading-map-legend] [data-comparison-compact-role="main"]')){assert.ok(Date.now()<deadline);await new Promise(resolve=>setImmediate(resolve));}return root.querySelector('[data-reading-map-legend]');}
  let main=await showMain('natural','climate');assert.equal(main.hidden,false);assert.equal(main.closest('details'),null);assert.match(main.textContent,/1991–2020年.*ケッペン＝ガイガー分類/);assert.equal(main.querySelectorAll('i').length,2);
  main=await showMain('population','density');assert.match(main.textContent,/2020年の推計.*人\/km²/);assert.equal(main.querySelectorAll('i').length,7);
  main=await showMain('industry','trade-exports');assert.match(main.textContent,/2023年.*百万米ドル/);assert.equal(main.querySelectorAll('i').length,6);assert.equal(fetches,2);
  Object.assign(state,{field:'agriculture',topic:'overview'});controller.render(state);assert.equal(main.hidden,true);assert.equal(main.children.length,0);
  const legacy=setup(base,{field:'industry',topic:'trade-exports'},fetcher);legacy.controller.render({...legacy.state,back:null});await new Promise(resolve=>setImmediate(resolve));assert.equal(fetches,2);
});

test('米の個別図と都市選択には全色区分・年・単位を表示し、農畜産の全体図には重複させない',async()=>{
  let fetches=0;
  const {root,controller,state,config}=setup(base,{field:'agriculture',topic:'rice'},async()=>{fetches++;throw Error('米の凡例に取得は不要');},true);
  config.regionId='southeast-asia';
  const main=root.querySelector('[data-reading-map-legend]');
  async function renderRice(topic,city){
    Object.assign(state,{field:'agriculture',topic,city,back:null});controller.render(state);
    const deadline=Date.now()+5000;
    while(!main.querySelector('[data-comparison-compact-role="main"]')){assert.ok(Date.now()<deadline,main.textContent);await new Promise(resolve=>setImmediate(resolve));}
    assert.equal(main.hidden,false);assert.equal(main.closest('details'),null);
    assert.match(main.textContent,/米の収穫面積.*2020年の推計.*ha\/格子/);
    assert.deepEqual([...main.querySelectorAll('.asia-comparison-compact-key>span')].map(e=>e.textContent),['1–10ha未満','10–100ha未満','100–1,000ha未満','1,000–5,000ha未満','5,000ha以上']);
  }
  await renderRice('rice',null);
  for(const topic of ['overview',null]){
    Object.assign(state,{topic,city:null});controller.render(state);assert.equal(main.hidden,true);assert.equal(main.children.length,0);
    await renderRice(null,'bangkok');
  }
  Object.assign(state,{topic:'wheat',city:null});controller.render(state);
  const deadline=Date.now()+5000;while(!main.querySelector('[data-comparison-compact-role="main"]')){assert.ok(Date.now()<deadline);await new Promise(resolve=>setImmediate(resolve));}
  assert.match(main.textContent,/小麦の収穫面積.*2020年.*ha\/格子/);assert.equal(main.querySelectorAll('i').length,3);
  assert.equal(fetches,0);
});


test('作物選択の比較元にも全作物・薄い家畜を残し、概略の凡例と選択輪郭を一致させる',async()=>{
  const features=['rice','wheat'].map(id=>({type:'Feature',properties:{kind:'crop',id,color:id==='rice'?'#00ff00':'#ffaa00'},geometry:{type:'Polygon',coordinates:[]}}));
  const {root,controller,state,config}=setup({...base,topic:'wheat'},{field:'natural',topic:'climate'},async()=>response({type:'FeatureCollection',features}));
  config.presentation.farming={file:'overview.json',products:[{id:'rice',title:'米',kind:'crop',color:'#00ff00'},{id:'wheat',title:'小麦',kind:'crop',color:'#ffaa00'},{id:'cattle',title:'牛',kind:'livestock',color:'#aabbcc'}],labels:[{id:'cattle-0',kind:'livestock',color:'#aabbcc',coordinate:[100,30]}]};
  controller.render(state);await waitForReading(root);
  const legend=root.querySelector('[data-comparison-legend]');
  for(const product of ['米','小麦','牛'])assert.ok(legend.textContent.includes(product));
  assert.match(legend.textContent,/概略.*太い輪郭.*薄い点/);assert.doesNotMatch(legend.textContent,/ha\/格子/);
  const map={sources:{},layers:{},getStyle(){return {};},getSource(id){return this.sources[id];},getLayer(id){return this.layers[id];},addSource(id,source){this.sources[id]=source;},addLayer(layer){this.layers[layer.id]=layer;},setLayoutProperty(id,name,value){(this.layers[id].layout??={})[name]=value;},setPaintProperty(id,name,value){this.layers[id].paint[name]=value;},setFilter(id,filter){this.layers[id].filter=filter;}};
  await controller.show(map);
  const shown=map.sources['asia-comparison-original'].data.features;
  assert.deepEqual(JSON.parse(JSON.stringify(shown.filter(f=>f.properties.kind==='crop').map(f=>[f.properties.id,f.properties.selected]))),[['rice',false],['wheat',true]]);
  assert.equal(shown.find(f=>f.properties.kind==='livestock').properties.opacity,.2);
  assert.deepEqual(JSON.parse(JSON.stringify(map.layers['asia-comparison-original-line'].paint['line-width'])),['case',['boolean',['get','selected'],false],2.8,.85]);
  assert.equal(map.layers['asia-comparison-original-area'].layout.visibility,'none');
});
