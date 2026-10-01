import {restoreAsiaComparison,type AsiaState,type AsiaStateContext,type AsiaField} from '../lib/atlas-asia-state';
import {asiaRiceLegend,getAsiaRiceLayer} from '../data/atlas/asia-agriculture';
import {asiaNaturalTopics} from '../data/atlas/asia-physical-reading';
import {asiaPopulationColors,asiaPopulationLabels,type AsiaPopulationRegion} from '../data/atlas/asia-population';
import {precipitationColors,precipitationBreaks,groundwaterClasses,basinColor,waterScenes,type WaterRegion,type WaterDataset} from '../data/atlas/asia-water';
import {industryTopic,industryValues,industryScale,industryFuelColors,industryFuelNames,type IndustryRegion,type IndustryData,type IndustryNational} from '../data/atlas/asia-industry';
import {socialTopic,socialGroup,socialValue,socialColor,socialColors,type SocialRegion,type SocialData} from '../data/atlas/asia-social';
import {leadingCategory,areaCategories} from '../data/atlas/asia-social-overview';
import {isTradeTopic,tradeChapter,tradeFlow,tradeValue,tradeScale,tradeColors,type TradeRegion,type TradeData} from '../data/atlas/asia-trade';
import {asiaPlaceReadings} from '../data/atlas/asia-place-readings';
import {asiaWaterFocus} from '../data/atlas/asia-water-focus';
import type {AsiaFarmingRegion} from '../data/atlas/asia-farming';
import type {AsiaPresentation} from './atlas-asia-presentation';

type Key={label:string;color:string};
type Raster={url:string;coordinates:number[][]};
type Reading={title:string;period:string;unit:string;keys:Key[];note:string;subject?:string;raster?:Raster;geometry?:any;points?:boolean};
type Config={regionId:'east-asia'|'southeast-asia'|'south-central-asia';label:string;countries:{code:string;name:string}[];cities:{id:string;name:string}[];classes:{id:number;code:string;name:string;color:string}[];climate:any;climateBase:string;agricultureBase:string;geographyUrl:string;physical?:any;physicalBase?:string;physicalFocus?:{id:string;name:string}[];population?:AsiaPopulationRegion;populationBase?:string;farming?:AsiaFarmingRegion;farmingBase?:string;water?:WaterRegion;waterBase?:string;industry?:IndustryRegion;industryBase?:string;social?:SocialRegion;socialBase?:string;trade?:TradeRegion;tradeBase?:string;tradeChapters?:Record<string,string>;presentation?:AsiaPresentation;presentationBase?:string;farmInsight?:{rivers:string[]}};
const fieldNames:Record<AsiaField,string>={natural:'自然環境',agriculture:'農林畜産業',industry:'主要産業',population:'人口・社会'};
const asset=(base:string,file:string)=>base+file.split('/').at(-1);
const fmt=(n:number)=>n.toLocaleString('ja-JP',{maximumFractionDigits:2});
const bins=(colors:string[],breaks:number[]):Key[]=>colors.map((color,i)=>({color:color.startsWith('#')?color:'#'+color,label:i===0?`${fmt(breaks[0])}未満`:i===breaks.length?`${fmt(breaks[i-1])}以上`:`${fmt(breaks[i-1])}以上${fmt(breaks[i])}未満`}));

export function comparisonQuestion(from:AsiaField,to:AsiaField):string {
  const pair=[from,to].sort().join(':');
  if(pair==='agriculture:natural')return '作物・家畜の分布と、雨・気温・地形・水の位置を比べます。季節、灌漑、飼料や技術も生産を支えるため、自然条件だけで立地を決めつけずに読んでください。';
  if(pair==='agriculture:industry')return '生産地と加工・輸送・市場を結ぶ地域を比べます。作物の面積や家畜の頭数と、産業の金額・貿易額は別の指標です。';
  if(pair==='industry:population')return '人口の集中と産業の集積を比べます。雇用や市場、交通、人材の関係を考え、都市範囲の人口と行政区域の産業統計を区別してください。';
  if(pair==='natural:population')return '人口の集中と平野・水系・気候の位置を比べます。土地条件に加え、交通・雇用・移動や歴史が居住の分布を形づくります。';
  if(pair==='industry:natural')return '自然条件と産業の位置を比べます。資源や水の位置だけでなく、輸送、市場、技術や政策が立地を支える関係を考えてください。';
  if(pair==='agriculture:population')return '生産地と人口・都市の位置を比べます。食料を供給する農地と消費する市場の関係を考え、重なりだけで調達先を断定しないでください。';
  return '同じ地点・同じ縮尺で、二つの主題の分布を比べます。色の濃さを直接比べず、それぞれの単位・資料年・対象範囲を確認してください。';
}

export function createAsiaComparison(root:HTMLElement,config:Config,context:AsiaStateContext,getState:()=>AsiaState){
  const panel=root.querySelector<HTMLElement>('[data-comparison-reading]');
  if(!panel)return {render(_state:AsiaState){},async show(_map:import('maplibre-gl').Map){}};
  const title=root.querySelector<HTMLElement>('[data-comparison-title]');
  const summary=root.querySelector<HTMLElement>('[data-comparison-summary]');
  const legend=root.querySelector<HTMLElement>('[data-comparison-legend]');
  const back=root.querySelector<HTMLButtonElement>('[data-comparison-back]');
  const cache=new Map<string,Promise<any>>(),outlineCache=new Map<string,Promise<string>>();
  let revision=0,displayRevision=0,key='',showFilled=false,map:import('maplibre-gl').Map|null=null,reading:Reading|null=null;
  const ids=['asia-comparison-original-raster','asia-comparison-original-area','asia-comparison-original-line','asia-comparison-original-point'];
  const sourceState=()=>restoreAsiaComparison(new URL(location.href),getState(),context);
  function topicName(s:AsiaState){
    if(s.field==='natural')return asiaNaturalTopics.find(t=>t.id===(s.topic??'climate'))?.label??fieldNames[s.field];
    if(s.field==='agriculture')return s.topic==='overview'||!s.topic&&!s.city?'農畜産物の分布':config.farming?.layers.find(t=>t.id===(s.topic??'rice'))?.title??'米の収穫面積';
    if(s.field==='industry')return config.industry?.topics.find(t=>t.id===s.topic)?.title??fieldNames[s.field];
    return config.social?.topics.find(t=>t.id===s.topic)?.title??(s.topic==='ethnicity'?'民族の居住域':s.topic==='religion'?'宗教と結びついた居住域':s.topic==='urban'?'都市の広がりと人口':'人口の分布');
  }
  function subject(s:AsiaState){
    const story=asiaPlaceReadings.find(r=>r.region===config.regionId&&r.id===s.story);
    const city=config.cities.find(c=>c.id===s.city)??config.population?.cities.find(c=>c.id===s.detail);
    const detail=config.presentation?.settlements?.[s.topic??'']?.categories.find(c=>c.id===s.detail)?.label??config.physicalFocus?.find(f=>f.id===s.detail)?.name??config.physical?.waterFeatures?.find((f:any)=>f.id===s.detail)?.label??waterScenes.find(w=>w.region===config.regionId&&w.id===s.detail)?.name;
    const chapter=isTradeTopic(s.topic)?config.tradeChapters?.[tradeChapter(s)]:null;
    return story?.name??[detail??city?.name??config.countries.find(c=>c.code===s.place)?.name??config.label,chapter??topicName(s)].join('の');
  }
  async function json(url:string){
    if(!cache.has(url))cache.set(url,(async()=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);try{const r=await fetch(url,{signal:abort.signal});if(!r.ok)throw Error(String(r.status));const bytes=new Uint8Array(await r.arrayBuffer());return JSON.parse(bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes));}finally{clearTimeout(timer);}})().catch(e=>{cache.delete(url);throw e;}));
    return cache.get(url)!;
  }
  async function countryGeometry(colors:Record<string,string>){const data=await json(config.population?.geography?asset(config.populationBase!,config.population.geography):config.geographyUrl);return {...data,features:data.features.filter((f:any)=>config.countries.some(c=>c.code===f.properties.code)).map((f:any)=>({...f,properties:{...f.properties,color:colors[f.properties.code]??'#d2ceca'}}))};}
  async function describe(s:AsiaState):Promise<Reading>{
    const missing={label:'未掲載・欠測',color:'#d2ceca'},base={title:topicName(s),period:'',unit:'',keys:[] as Key[],note:''};
    if(s.field==='agriculture'){
      const topic=s.topic??(s.city?'rice':config.presentation?'overview':'rice'),layer=config.farming?.layers.find(t=>t.id===topic);
      if(layer)return {...base,title:layer.title,period:String(layer.year)+'年',unit:layer.unit??'森林参考図',keys:layer.kind==='forest'?[{label:'資料で森林と分類された場所',color:'#4d9221'}]:bins(layer.colors??[],layer.breaks??[]),note:layer.kind==='forest'?'森林の参考図です。管理方式や木材生産量を色から求めません。':'色なしは推計0・欠測・海を含みます。色は収穫面積（ha/格子）または家畜密度で、個別の農場の境界ではありません。',raster:{url:asset(config.farmingBase!,layer.image),coordinates:layer.imageCoordinates}};
      if(topic==='overview'&&config.presentation){const p=config.presentation.farming,data=await json(config.presentationBase!+p.file),water=s.overlay==='water';const features=data.features.filter((f:any)=>f.properties.kind==='crop'&&(water?f.properties.id==='rice':s.farms!=='none'&&s.farms!=='livestock'));
        if(!water&&s.farms!=='none'&&s.farms!=='crop')features.push(...p.labels.filter(a=>a.kind==='livestock'&&Number(a.id.split('-').at(-1))<3).map(a=>({type:'Feature',properties:{kind:'livestock',color:a.color},geometry:{type:'Point',coordinates:a.coordinate}})));
        if(water){const [rain,rivers]=await Promise.all([json(config.presentationBase!+config.presentation.rainfall.file),config.physical?json(asset(config.physicalBase!,config.physical.water)):Promise.resolve({features:[]})]);features.push(...rain.features.map((f:any)=>({...f,properties:{...f.properties,color:'#347d9c'}})),...rivers.features.filter((f:any)=>config.farmInsight?.rivers.includes(f.properties.id)).map((f:any)=>({...f,properties:{...f.properties,color:'#17688b'}})));}
        return {...base,period:water?'米2020年・年降水量1981–2010年':'2020年の推計から作成',unit:'特徴的な分布の概略',keys:water?[...p.products.filter(p=>p.id==='rice').map(p=>({label:p.title,color:p.color})),{label:'主な川の流路',color:'#17688b'},{label:'年降水量の等雨量線（250mm間隔）',color:'#347d9c'}]:p.products.map(p=>({label:p.title,color:p.color})),note:'輪郭は作物の特徴的な分布、家畜は元の地図と同じ代表地点です。農場の位置や全生産地の境界ではありません。',geometry:{...data,features}};}
      const rice=getAsiaRiceLayer(config.regionId)!;return {...base,title:'米の収穫面積',period:'2020年の推計',unit:'ha/格子',keys:asiaRiceLegend,note:'色なしは1ha未満・推計0・データなしを含みます。同じ農地で複数回収穫すると、収穫面積は土地の面積より大きくなります。',raster:{url:asset(config.agricultureBase,rice.imageUrl),coordinates:rice.coordinates}};
    }
    if(s.field==='natural'){
      const topic=s.topic??'climate';
      if(topic==='climate')return {...base,period:'1991–2020年',unit:'ケッペン＝ガイガー分類',keys:config.classes.filter(c=>config.climate.classIds.includes(c.id)).map(c=>({color:c.color,label:c.code+' '+c.name})),note:'区分境界は加工した広域格子に基づきます。海岸・小島の欠測を含みます。',raster:{url:asset(config.climateBase,config.climate.image),coordinates:config.climate.imageCoordinates}};
      if(['terrain','landform'].includes(topic)&&config.physical)return {...base,period:'ETOPO 2022',unit:'標高 m（EGM2008基準）',keys:bins(['b4cfbf','d8e2b5','e0d5a0','cdbc88','b09a78','987d6b','b9aaa0','eee9e1'],[0,200,500,1000,2000,3000,4500]),note:'広域格子の標高です。個別の山頂や谷底の測量値ではありません。',raster:{url:asset(config.physicalBase!,config.physical.image),coordinates:config.physical.imageCoordinates}};
      if(topic==='precipitation'&&config.water)return {...base,period:'1981–2010年の推計平年値',unit:'mm/年',keys:bins(precipitationColors,precipitationBreaks),note:'年間合計です。雨温図とは資料・期間が異なり、季節配分や現在の雨を表しません。',raster:{url:asset(config.waterBase!,config.water.precipitation.image),coordinates:config.water.precipitation.imageCoordinates}};
      if(config.water&&['water','basins','groundwater'].includes(topic)){const basins=topic==='basins',data=await json(config.waterBase!+config.water[basins?'basins':'groundwater']) as WaterDataset,selected=data.records.find(r=>r.id===s.detail),allowed=[...asiaWaterFocus[config.regionId].map(f=>f.id),s.detail];
        const features=data.geometry.features.filter((f:any)=>basins?allowed.includes(f.properties.id):f.properties.category<20).map((f:any)=>({...f,properties:{...f.properties,color:basins?basinColor(f.properties.id):'#a9d2da'}}));
        if(config.physical){const rivers=await json(asset(config.physicalBase!,config.physical.water));features.push(...rivers.features.map((f:any)=>({...f,properties:{...f.properties,color:'#176c94'}})));}
        return {...base,subject:selected&&'name' in selected?selected.name:undefined,period:basins?'BasinATLAS v1.0':'WHYMAP 2008年',unit:basins?'集水域の区分':'主要な地下水盆地の概略',keys:[...(basins?[{label:'色は流域を区別する記号（大小の順序なし）',color:'#b5ced9'}]:[{label:'主要な地下水盆地（面色は涵養量の尺度ではありません）',color:'#a9d2da'}]),{label:'河川・湖の概略形状',color:'#176c94'}],note:basins?'元の地図と同じ主な流域と選択流域を残しています。色は現在の流量を表しません。':'青い面は主要な地下水盆地です。涵養量の区分は元の地点選択で確認でき、面色から現在の水位や取水可能量は求めません。',geometry:{...data.geometry,features}};}
      if(config.physical){const data=await json(asset(config.physicalBase!,config.physical.water));return {...base,period:'Natural Earth v5.1.2',unit:'河川の流路・湖の概略範囲',keys:[{label:'河川・湖',color:'#176c94'}],note:'現在の水量や湖面の広がりを示しません。線の太さは河川幅ではありません。',geometry:{...data,features:data.features.map((f:any)=>({...f,properties:{...f.properties,color:'#176c94'}}))}};}
    }
    if(s.field==='population'){
      const settlement=config.presentation?.settlements?.[s.topic??''];
      if(settlement){const data=await json(config.presentationBase!.replace('asia-presentation-v1/','asia-settlements-v1/')+settlement.file);return {...base,period:'2020年の資料',unit:'掲載集団の居住域の概略',keys:settlement.categories.map(c=>({color:c.color,label:c.label})),note:'居住域は概略です。色なしは未分類で、個人の民族・宗教を推定できません。',geometry:data};}
      const topic=config.social&&socialTopic(config.social,s),group=config.social&&socialGroup(config.social,s);
      if(topic&&group){const data=await json(config.socialBase!+config.social!.data) as SocialData;const color=(r:any)=>!r?'#d2ceca':topic.key==='overview'?leadingCategory(r,config.social!,group)?.color??'#d2ceca':socialColor(socialValue(r,topic,group),topic);return {...base,subject:data.records.find(r=>r.id===s.detail)?.name,period:group.year+'年',unit:topic.key==='overview'?'区域内の最多区分':'%（主題ごとの分母）',keys:[...(topic.key==='overview'?areaCategories(config.social!,group).map(c=>({color:c.color,label:c.title})):bins(socialColors,topic.breaks)),{...missing,label:topic.key==='overview'?'未掲載・最多区分が同率':missing.label}],note:group.note,geometry:group.kind==='admin'?{...data.geometry,features:data.geometry.features.filter((f:any)=>f.properties.country===group.country).map((f:any)=>({...f,properties:{...f.properties,color:color(data.records.find(r=>r.id===f.properties.id))}}))}:await countryGeometry(Object.fromEntries(config.countries.map(c=>[c.code,color(data.national[c.code])])))};}
      if(config.population){const city=config.population.cities.find(c=>c.id===s.detail),record=city?.detail??config.population;return {...base,period:'2020年の推計',unit:'人/km²（格子面積当たり）',keys:asiaPopulationColors.map((color,i)=>({color,label:asiaPopulationLabels[i]})),note:'色なしは推計0・欠測・海を含みます。都市範囲と行政区域は異なります。',raster:{url:asset(config.populationBase!,record.image),coordinates:record.imageCoordinates}};}
    }
    if(s.field==='industry'&&config.industry){
      if(config.trade&&isTradeTopic(s.topic)){const data=await json(config.tradeBase!+config.trade.file) as TradeData,values=config.trade.countries.map(code=>({code,value:tradeValue(data.countries[code],tradeChapter(s),tradeFlow(s))})),scale=tradeScale(values.map(v=>v.value));return {...base,period:'2023年',unit:'百万米ドル',keys:[...bins(tradeColors,scale.breaks.map(v=>v/1e6)),missing],note:'国・区分全体の商品貿易額です。生産地や個別の港の取扱量ではありません。',geometry:await countryGeometry(Object.fromEntries(values.map(v=>[v.code,scale.color(v.value)])))};}
      const [data,national]=await Promise.all([json(config.industryBase!+config.industry.data),json(config.industryBase!+'national.json.gz')]) as [IndustryData,IndustryNational],t=industryTopic(config.industry,s),values=industryValues(t,data,national,config.industry.countries),scale=industryScale(t,values);
      Object.assign(base,{subject:(t.kind==='power'?data.power:data.admin).find(r=>r.id===s.detail)?.name});
      if(t.kind==='power')return {...base,period:t.year,unit:'設備容量 MW',keys:Object.entries(industryFuelColors).filter(([fuel])=>t.fuel==='all'||fuel===t.fuel).map(([fuel,color])=>({color,label:industryFuelNames[fuel]})),note:'点は資料にある発電施設の位置です。点の大きさは元の容量の大小を示し、稼働状況や現在の発電量ではありません。',points:true,geometry:{type:'FeatureCollection',features:data.power.filter(p=>(t.fuel==='all'||p.fuel===t.fuel)&&(!s.place||s.place===p.country)).map(p=>({type:'Feature',properties:{color:industryFuelColors[p.fuel],capacity:p.capacity??0},geometry:{type:'Point',coordinates:p.point}}))}};
      const colors=Object.fromEntries(values.map(v=>[v.id,scale.color(v.value)]));return {...base,title:t.title,period:t.year,unit:t.unit,keys:[...bins(scale.colors,scale.breaks),missing],note:t.note,geometry:t.kind==='admin'?{...data.geometry,features:data.geometry.features.filter((f:any)=>f.properties.country===t.country).map((f:any)=>({...f,properties:{...f.properties,color:colors[f.properties.id]??'#d2ceca'}}))}:await countryGeometry(colors)};
    }
    return {...base,note:'この主題の元分布は戻るボタンから確認できます。'};
  }
  function appendKeys(parent:HTMLElement,r:Reading){parent.append(Object.assign(document.createElement('p'),{textContent:`${r.title} · ${r.period} · ${r.unit}`}));const list=document.createElement('div');list.className='asia-comparison-key';for(const k of r.keys){const item=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=k.color;swatch.setAttribute('aria-hidden','true');item.append(swatch,document.createTextNode(k.label));list.append(item);}parent.append(list,Object.assign(document.createElement('p'),{textContent:r.note}));}
  function render(state:AsiaState){
    if(panel)panel.hidden=!state.back;
    if(!state.back){key='';reading=null;hide();return;}
    const from=sourceState(),next=state.back+'|'+state.field+'|'+state.topic+'|'+state.detail;
    if(back)back.textContent=next===key&&reading?.subject&&!from.story?`${reading.subject}の${topicName(from)}へ戻る`:`${subject(from)}へ戻る`;
    if(title)title.textContent=`${topicName(from)} × ${topicName(state)}`;
    const story=asiaPlaceReadings.find(r=>r.region===config.regionId&&r.id===from.story);
    if(summary)summary.textContent=(story?story.lead+' ':'')+comparisonQuestion(from.field,state.field);
    if(next===key)return;key=next;reading=null;hide();showFilled=false;const seq=++revision;
    if(legend)legend.textContent='元の分布と両方の凡例を読み込んでいます。';
    void Promise.all([describe(from),describe(state)]).then(([original,current])=>{if(seq!==revision||key!==next)return;reading=original;if(back&&original.subject&&!from.story)back.textContent=`${original.subject}の${topicName(from)}へ戻る`;if(legend){legend.replaceChildren();const toggle=document.createElement('button');toggle.type='button';toggle.dataset.comparisonOriginal='';toggle.textContent='元の色面を確認';toggle.setAttribute('aria-pressed','false');toggle.addEventListener('click',()=>{showFilled=!showFilled;toggle.setAttribute('aria-pressed',String(showFilled));toggle.textContent=showFilled?'比較の地図へ戻す':'元の色面を確認';if(map)void show(map);});legend.append(toggle);const detail=document.createElement('details'),label=document.createElement('summary');detail.open=true;label.textContent='元分布と比較先の全凡例';detail.append(label,Object.assign(document.createElement('p'),{textContent:'比較中の色付き輪郭は元の分布の色区分を示します。「元の色面を確認」で元の分布を同じ位置に表示します。比較先の数値は比較先の指標です。'}));appendKeys(detail,original);appendKeys(detail,current);legend.append(detail);}if(map)void show(map);}).catch(()=>{if(seq===revision&&legend)legend.textContent='元分布・凡例を取得できませんでした。対象名付きの戻るボタンで元の解説を確認できます。';});
  }
  function hide(){if(map?.getStyle())for(const id of ids)if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');}
  async function outlined(url:string):Promise<string>{
    if(!outlineCache.has(url))outlineCache.set(url,(async()=>{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);const original=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=original.data,output=ctx.createImageData(canvas.width,canvas.height),out=output.data,w=canvas.width,h=canvas.height;
      // Preserve the source palette; only color-class edges are shown. No
      // statistics or boundaries are inferred outside the existing image.
      const dx=[-2,2,0,0],dy=[0,0,-2,2];
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(pixels[i+3]<32)continue;let edge=false;for(let n=0;n<4;n++){const xx=x+dx[n],yy=y+dy[n];if(xx<0||xx>=w||yy<0||yy>=h){edge=true;break;}const j=(yy*w+xx)*4;if(pixels[j+3]<32||Math.abs(pixels[i]-pixels[j])+Math.abs(pixels[i+1]-pixels[j+1])+Math.abs(pixels[i+2]-pixels[j+2])>40){edge=true;break;}}if(edge){out[i]=pixels[i];out[i+1]=pixels[i+1];out[i+2]=pixels[i+2];out[i+3]=255;}}
      ctx.putImageData(output,0,0);return canvas.toDataURL('image/png');})().catch(e=>{outlineCache.delete(url);throw e;}));return outlineCache.get(url)!;
  }
  async function show(currentMap:import('maplibre-gl').Map){
    map=currentMap;const display=++displayRevision;hide();if(!getState().back||!reading)return;const original=reading,seq=revision;
    try{if(original.raster){const image=showFilled?original.raster.url:await outlined(original.raster.url);if(seq!==revision||display!==displayRevision||!getState().back||map!==currentMap||!map.getStyle())return;const id=ids[0];if(map.getLayer(id))map.removeLayer(id);if(map.getSource(id))map.removeSource(id);map.addSource(id,{type:'image',url:image,coordinates:original.raster.coordinates as [number,number][]});map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':1,'raster-resampling':'nearest','raster-fade-duration':0}});}
      else if(original.geometry){const source='asia-comparison-original';if(map.getSource(source))(map.getSource(source) as import('maplibre-gl').GeoJSONSource).setData(original.geometry);else map.addSource(source,{type:'geojson',data:original.geometry});
        if(original.points){const paint={'circle-radius':['min',18,['max',3,['*',.28460499,['sqrt',['coalesce',['get','capacity'],0]]]]],'circle-color':['get','color'],'circle-opacity':showFilled?.9:0,'circle-stroke-color':['get','color'],'circle-stroke-width':2};if(!map.getLayer(ids[3]))map.addLayer({id:ids[3],type:'circle',source,paint:paint as any});map.setFilter(ids[3],['==',['geometry-type'],'Point']);for(const [name,value] of Object.entries(paint))map.setPaintProperty(ids[3],name,value);map.setLayoutProperty(ids[3],'visibility','visible');}
        else {if(!map.getLayer(ids[1]))map.addLayer({id:ids[1],type:'fill',source,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':['get','color'],'fill-opacity':1}});if(!map.getLayer(ids[2]))map.addLayer({id:ids[2],type:'line',source,paint:{'line-color':['get','color'],'line-width':2.2}});const paint={'circle-radius':4,'circle-color':'#fff','circle-opacity':1,'circle-stroke-color':['get','color'],'circle-stroke-width':2};if(!map.getLayer(ids[3]))map.addLayer({id:ids[3],type:'circle',source,filter:['==',['geometry-type'],'Point'],paint:paint as any});map.setFilter(ids[3],['==',['geometry-type'],'Point']);for(const [name,value] of Object.entries(paint))map.setPaintProperty(ids[3],name,value);map.setLayoutProperty(ids[1],'visibility',showFilled?'visible':'none');map.setLayoutProperty(ids[2],'visibility','visible');map.setLayoutProperty(ids[3],'visibility','visible');}
      }
      root.dataset.comparisonOriginal=showFilled?'fill':'outline';
    }catch{if(seq===revision&&legend)legend.append(Object.assign(document.createElement('p'),{textContent:'元分布の描画を取得できませんでした。凡例と対象名付きの戻るボタンは利用できます。'}));}
  }
  return {render,show};
}
