import {readLatinState,writeLatinState,cropValueAt,latinCapital,latinTopicCrops,type LatinState} from '../lib/atlas-latin-america-state';
import type {LatinTopic,LatinClimateCity} from '../data/atlas/latin-america-types';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

const root=document.querySelector<HTMLElement>('[data-latin-atlas]');
if(root) init(root);
export function init(root:HTMLElement){
 const q=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const all=<T extends Element=HTMLElement>(s:string)=>[...root.querySelectorAll<T>(s)];
 const config=JSON.parse(q('[data-latin-config]').textContent!);
 const topics=config.topics as LatinTopic[],cities=config.cities as LatinClimateCity[];
 const explorer=q<HTMLElement>('[data-latin-explorer]');
 const read=()=>{const pathField=location.pathname.slice(config.basePath.length).split('/')[0];return readLatinState(location.search,topics,config.countries.map((c:any)=>c.code),cities,['nature','agriculture','industry','population'].includes(pathField)?pathField:config.initialField)};
 let initialClimate=!new URLSearchParams(location.search).has('city')&&!new URLSearchParams(location.search).has('topic');
 let state=read(),returnTo:LatinState|undefined=history.state?.latinReturn;
 let map:any=null,markers:any[]=[],mapReady=false,fallback=true,rasterRequest=0,activeGrid:any=null,activeLayer='';
 let stats:any=null,cropManifest:any=null,climateManifest:any=null,livestockManifest:any=null;
 const cache=new Map<string,Promise<any>>();
 const json=(url:string)=>{if(!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}).catch(e=>{cache.delete(url);throw e}));return cache.get(url)!};
 const base=config.assetBase;
 const merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*180/Math.PI;
 const invMerc=(y:number)=>Math.atan(Math.sinh(y*Math.PI/180))*180/Math.PI;
 const svg=q<SVGSVGElement>('[data-map-fallback]');
 const defaultFrame=svg.dataset.defaultFrame!.split(' ').map(Number);
 const currentCamera=():[number,number,number]|undefined=>{if(mapReady)return [map.getCenter().lng,map.getCenter().lat,map.getZoom()];const b=svg.viewBox.baseVal;return [b.x+b.width/2,invMerc(-b.y-b.height/2),Math.max(1,Math.min(9,Math.log2(360/b.width)))];};
 function commit(next:LatinState,options:{replace?:boolean;keepView?:boolean;comparison?:boolean;keepReturn?:boolean}={}){
  if(options.comparison)returnTo={...state,camera:currentCamera()};
  else if(!options.replace&&!options.keepReturn)returnTo=undefined;
  initialClimate=false;
  state={...next,camera:options.keepView?currentCamera():next.camera};
  const url=new URL(location.href);url.pathname=config.basePath+(state.field==='overview'?'':state.field+'/');url.search=writeLatinState(state);if(new URLSearchParams(location.search).get('renderer')==='svg')url.searchParams.set('renderer','svg');
  history[options.replace?'replaceState':'pushState']({latinReturn:returnTo},'',url);
  render(!options.keepView);
 }
 function fitBounds(b:number[]){
  if(mapReady){map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:35,duration:0,maxZoom:7});return;}
  const box=[b[0],-merc(b[3]),b[2]-b[0],merc(b[3])-merc(b[1])];
  const aspect=Math.max(svg.clientWidth,1)/Math.max(svg.clientHeight,1),width=Math.max(box[2]*1.18,box[3]*1.18*aspect,.2),height=width/aspect;
  svg.setAttribute('viewBox',`${box[0]+box[2]/2-width/2} ${box[1]+box[3]/2-height/2} ${width} ${height}`);
 }
 function fit(){
  if(state.camera){
   if(mapReady)map.jumpTo({center:state.camera.slice(0,2),zoom:state.camera[2]});
   else{const [lon,lat,z]=state.camera,w=360/2**z,h=w*Math.max(svg.clientHeight,1)/Math.max(svg.clientWidth,1);svg.setAttribute('viewBox',`${lon-w/2} ${-merc(lat)-h/2} ${w} ${h}`);}return;
  }
  const city=cities.find(c=>c.id===state.city),topic=topics.find(t=>t.id===state.topic),country=config.countries.find((c:any)=>c.code===state.place);
  if(city&&!initialClimate)fitBounds([city.longitude-2,city.latitude-2,city.longitude+2,city.latitude+2]);
  else fitBounds(topic?.extent??country?.bounds??config.bounds);
 }
 function visibleTopics(){return topics.filter(t=>t.field===state.field&&(!state.place||t.countries.includes(state.place)));}
 function render(move=true){
  const isLivestock=['cattle','pig','chicken'].includes(state.crop);
  const topic=topics.find(t=>t.id===state.topic),field=config.fields.find((f:any)=>f.id===state.field);
  const displayCity=state.field==='nature'&&state.view==='climate'&&!state.topic?state.city:'';
  const product=state.field==='agriculture'?config.products.find((p:any)=>p.id===state.crop):undefined;
  const hasSelection=Boolean(state.topic||displayCity||product);
  explorer.dataset.field=state.field==='nature'?'natural':state.field==='overview'?'regional-overview':state.field;
  explorer.dataset.natureMode=state.view==='climate'?'climate':'water';
  q('[data-field-national]').setAttribute('data-field-national',explorer.dataset.field);
  all<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(b=>{if(b.dataset.field===state.field)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  q('[data-current-place]').textContent=config.countries.find((c:any)=>c.code===state.place)?.name??'中米・カリブ・南米';
  q('[data-overview-fields]').hidden=state.field!=='overview';
  q('[data-city-picker]').hidden=state.field!=='nature'||state.view!=='climate';
  q('[data-reading-topbar]').hidden=!hasSelection;
  q('[data-reading-overview]').textContent=`← 中南米の${field.name}`;
  q('.latin-reading').setAttribute('data-selected',String(hasSelection));
  all<HTMLButtonElement>('[data-crop-option]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cropOption===state.crop)));
  all<HTMLButtonElement>('[data-view-option]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.viewOption===state.view)));
  q<HTMLSelectElement>('[data-place]').value=state.place;
  const select=q<HTMLSelectElement>('[data-topic]');
  select.replaceChildren(new Option('分野の全体像',''),...visibleTopics().map(t=>new Option(t.title,t.id)));select.value=state.topic;
  q<HTMLSelectElement>('[data-city]').value=displayCity;q<HTMLSelectElement>('[data-view]').value=state.view;q<HTMLSelectElement>('[data-crop]').value=state.crop;
  q('[data-nature-controls]').hidden=state.field!=='nature';q('[data-agriculture-controls]').hidden=state.field!=='agriculture';
  q('[data-map-title]').textContent=state.field==='overview'?'中南米の地理':state.field==='nature'?(state.view==='climate'?'気候と地域の違い':'河川・地形を読む'):state.field==='agriculture'?(isLivestock?'家畜の分布':state.crop==='none'?'農林業の地域を読む':'作物が育つ場所'):state.field==='industry'?'資源・加工・物流の拠点':'都市と人口分布の背景';
  q('[data-map-kicker]').textContent=state.field==='overview'?'Geographic base':state.field==='nature'?(state.view==='climate'?'Climate · 1991–2020':'Rivers · Natural Earth'):state.field==='agriculture'?(isLivestock?'Livestock density · 2020':state.crop==='none'?'Agriculture · Regional reading':'Harvested area · 2020'):state.field==='industry'?'Industry · Regional reading':'Population density · 2020';
  q('[data-layer-caption]').textContent=state.field==='overview'?'国境・主な河川':state.field==='nature'?(state.view==='climate'?'ケッペン＝ガイガー区分 · 1991–2020':'主な河川・地域の代表位置'):state.field==='agriculture'?(state.crop==='none'?'林業を読むための代表位置':`${isLivestock?'家畜密度':'年間収穫面積'} · 2020年`):state.field==='population'?'人口密度 · 2020年':'産業・物流を読むための代表位置';
  if(state.field==='agriculture'&&state.agriMode==='all'&&state.crop!=='none')q('[data-layer-caption]').textContent='作物・畜産の分布の概況 · 2020年';
  q('[data-overview]').hidden=hasSelection;q('[data-overview-title]').textContent=field.subtitle;q('[data-overview-summary]').textContent=field.summary;q('[data-reading-field]').textContent=field.name;
  all('[data-topic-panel]').forEach(e=>e.hidden=e.dataset.topicPanel!==state.topic);
  all('[data-city-panel]').forEach(e=>e.hidden=e.dataset.cityPanel!==displayCity);
  const visible=new Set(visibleTopics().map(t=>t.id));
  all('[data-select-topic]').forEach(e=>e.hidden=!visible.has(e.dataset.selectTopic!));
  const overview=q('[data-overview]');let empty=overview.querySelector<HTMLElement>('[data-empty-topics]');
  if(!empty){empty=document.createElement('p');empty.dataset.emptyTopics='';empty.className='latin-small';overview.append(empty);}
  empty.hidden=state.field==='overview'||visible.size>0;empty.textContent='この国に対応する個別解説はありません。地図の分布と下の国別統計を参照できます。「中南米全体」で周辺地域の解説を読めます。';
  all<HTMLButtonElement>('[data-country-button]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.countryButton===state.place)));
  all<SVGPathElement>('[data-map-country]').forEach(p=>p.classList.toggle('is-selected',p.dataset.mapCountry===state.place));
  q('[data-comparison-return]').hidden=!returnTo;
  renderSelection(topic,displayCity,product);
  renderSelectedStatistics();
  if(mapReady)map.setPaintProperty('countries-line','line-width',['case',['==',['get','code'],state.place],2.5,.8]);
  if(move)fit();
  q('[data-reading-scroll]').scrollTop=0;
  drawMarkers();loadRaster();syncReadingHeight();renderStatistics();
 }
 function markerRows(){
  if(state.field==='agriculture'&&state.crop!=='none')return config.overviewManifest.labels.filter((p:any)=>state.agriMode==='single'?p.id===state.crop:(p.kind==='crop'?state.cropsOn:state.livestockOn)).map((p:any)=>({id:p.id,label:p.name,lon:p.coordinate[0],lat:p.coordinate[1],num:0,city:false,product:true}));
  const candidates=state.field==='overview'?topics.filter(t=>t.field==='nature'):state.field==='nature'&&state.view==='climate'?visibleTopics().filter(t=>t.id===state.topic):visibleTopics();
  const rows=candidates.map(t=>({id:t.id,label:t.label,lon:t.location[0],lat:t.location[1],num:topics.indexOf(t)+1,city:false}));
  if(state.field==='nature'&&state.view==='climate')for(const c of cities.filter(c=>!state.place||c.countryCode===state.place)){const code=climateCodeAt(c.longitude,c.latitude);rows.push({id:c.id,label:c.name.split('（')[0]+(code?' '+code:''),lon:c.longitude,lat:c.latitude,num:0,city:true});}
  return rows;
 }
 function climateCodeAt(lon:number,lat:number){
  if(activeLayer!=='climate'||!activeGrid?.bounds4326)return '';
  const [w,s,e,n]=activeGrid.bounds4326;if(lon<w||lon>=e||lat<=s||lat>n)return '';
  const col=Math.floor((lon-w)/(e-w)*activeGrid.width),row=Math.floor((merc(n)-merc(lat))/(merc(n)-merc(s))*activeGrid.height);
  return config.classes.find((c:any)=>c.id===activeGrid.values[row*activeGrid.width+col])?.code??'';
 }
 function selectTopic(id:string,comparison=false){
  const t=topics.find(t=>t.id===id);if(!t)return;
  commit({...state,field:t.field,topic:id,city:'',crop:latinTopicCrops[id]??state.crop,place:t.countries.includes(state.place)?state.place:'',camera:undefined},{comparison});
 }
 function drawMarkers(){
  markers.forEach(m=>m.remove());markers=[];
  const group=q<SVGGElement>('[data-fallback-markers]');group.replaceChildren();
  const frame=q('.latin-map-frame').getBoundingClientRect(),boxes:{left:number;top:number;right:number;bottom:number}[]=[];
  const rows=markerRows().sort((a,b)=>Number(b.id===(state.city||state.crop||state.topic||'brasilia'))-Number(a.id===(state.city||state.crop||state.topic||'brasilia'))).filter(r=>{
   if(!frame.width||!frame.height)return true;
   const v=svg.viewBox.baseVal,p=mapReady?map.project([r.lon,r.lat]):{x:(r.lon-v.x)/v.width*frame.width,y:(-merc(r.lat)-v.y)/v.height*frame.height};
   const width=Math.max(40,r.label.length*11+14),box={left:p.x-width/2,top:p.y-43,right:p.x+width/2,bottom:p.y};
   if(box.left<0||box.right>frame.width||box.top<0||box.bottom>frame.height||boxes.some(b=>box.left<b.right+3&&box.right>b.left-3&&box.top<b.bottom+3&&box.bottom>b.top-3))return false;
   boxes.push(box);return true;
  });
  if(mapReady){
   for(const r of rows){
    const b=document.createElement('button');b.type='button';b.className=`latin-marker${r.city?' climate-city':''}`;b.setAttribute('aria-label',`${r.city?'雨温図':'解説'}：${r.label}`);b.setAttribute('aria-pressed',String(r.id===(r.city?state.city:r.product?state.crop:state.topic)));b.textContent=r.label;b.title=r.label;
    b.addEventListener('click',e=>{e.stopPropagation();if(r.city)commit({...state,field:'nature',city:r.id,topic:'',camera:undefined});else if(r.product)changeCrop(r.id);else selectTopic(r.id)});
    markers.push(new (window as any).__latinMarker({element:b,anchor:'bottom',offset:[0,-6]}).setLngLat([r.lon,r.lat]).addTo(map));
   }
  }else{
   const scale=Math.max(svg.viewBox.baseVal.width/Math.max(svg.clientWidth,300),svg.viewBox.baseVal.height/Math.max(svg.clientHeight,300));
   for(const r of rows){
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform',`translate(${r.lon},${-merc(r.lat)})`);g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`${r.city?'雨温図':'解説'}：${r.label}`);g.classList.add('latin-svg-marker');
    const width=Math.max(34,r.label.length*11+12),rect=document.createElementNS(g.namespaceURI,'rect');rect.setAttribute('x',String(-width/2*scale));rect.setAttribute('y',String(-29*scale));rect.setAttribute('width',String(width*scale));rect.setAttribute('height',String(23*scale));rect.setAttribute('rx',String(3*scale));rect.setAttribute('fill',r.id===(r.city?state.city:r.product?state.crop:state.topic)?'#fff0b3':'#fffef4');rect.setAttribute('stroke','#60767c');rect.setAttribute('stroke-width',String(scale));g.append(rect);
    const text=document.createElementNS(g.namespaceURI,'text');text.textContent=r.label;text.setAttribute('y',String(-17*scale));text.setAttribute('font-size',String(11*scale));text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.setAttribute('fill','#203b47');g.append(text);
    const circle=document.createElementNS(g.namespaceURI,'circle');circle.setAttribute('r',String(2.5*scale));circle.setAttribute('fill','#fffef4');circle.setAttribute('stroke','#344e59');circle.setAttribute('stroke-width',String(scale));g.append(circle);
    const act=()=>r.city?commit({...state,city:r.id,topic:'',camera:undefined}):r.product?changeCrop(r.id):selectTopic(r.id);
    g.addEventListener('click',e=>{e.stopPropagation();act()});g.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();act()}});group.append(g);
   }
  }
 }
 function setRaster(url:string|null,coordinates?:number[][]){
  const image=q<SVGImageElement>('[data-fallback-raster]');
  if(url){image.setAttribute('href',url);image.style.display='';if(coordinates){const [[w,n],[e],,[,s]]=coordinates;image.setAttribute('x',String(w));image.setAttribute('y',String(-merc(n)));image.setAttribute('width',String(e-w));image.setAttribute('height',String(merc(n)-merc(s)));}}
  else{image.removeAttribute('href');image.style.display='none';}
  if(!mapReady)return;
  if(map.getLayer('thematic-raster'))map.removeLayer('thematic-raster');if(map.getSource('thematic-image'))map.removeSource('thematic-image');
  if(url){map.addSource('thematic-image',{type:'image',url,coordinates});map.addLayer({id:'thematic-raster',type:'raster',source:'thematic-image',paint:{'raster-opacity':.85,'raster-resampling':'nearest','raster-fade-duration':0}},'countries-line');}
 }
 function legend(items:{color:string;label:string}[],note:string){
  const el=q('[data-legend]');el.replaceChildren();
  const list=document.createElement('div');list.className='latin-legend-items';
  items.forEach(item=>{const span=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=item.color;span.append(swatch,document.createTextNode(item.label));list.append(span)});
  const p=document.createElement('p');p.textContent=note;
  if(state.field==='nature'&&state.view==='climate'&&items.length>5){const families=document.createElement('div');families.className='latin-legend-items';for(const name of ['A 熱帯','B 乾燥帯','C 温帯','D 冷帯','E 寒帯','○ 雨温図の都市']){const span=document.createElement('span');span.textContent=name;families.append(span)}const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='各気候区分の凡例';details.append(summary,list);el.append(families,details,p);}else if(state.field==='agriculture'&&state.agriMode==='all'){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='一枚図の読み方と表示上の省略';details.append(summary,p);el.append(details);}else el.append(list,p);
 }
 async function loadRaster(){
  clearExtraRasters();
  const ticket=++rasterRequest,field=state.field,crop=state.crop,view=state.view;
  activeGrid=null;activeLayer='';setRaster(null);
  q('[data-grid-reading]').textContent='地図の地域名か一覧から、解説を選べます。';
  try{
   if(field==='nature'&&view==='climate'){
    climateManifest??=await json(base+'latin-america-climate-v1/manifest.json');const info=climateManifest.regions['latin-america'];
    const grid=await json(base+'latin-america-climate-v1/'+info.grid);if(ticket!==rasterRequest)return;
    activeGrid=grid;activeLayer='climate';setRaster(base+'latin-america-climate-v1/'+info.image,info.imageCoordinates);drawMarkers();
    legend(config.classes.filter((c:any)=>info.classIds.includes(c.id)).map((c:any)=>({color:c.color,label:`${c.code} ${c.name}`})),'1991–2020年 · 0.1度区分を表示。地図の陸地を選ぶと区分と意味が分かります。透明部分は対象外またはデータなし。');
   }else if(field==='agriculture'&&crop!=='none'&&state.agriMode==='all'){
    const info=config.overviewManifest;
    if(state.cropsOn)addExtraRaster('crops',base+'latin-america-overview-v1/'+info.groups.crop.image,info.coordinates);
    if(state.livestockOn)addExtraRaster('livestock',base+'latin-america-overview-v1/'+info.groups.livestock.image,info.coordinates);
    const product=config.products.find((p:any)=>p.id===crop);
    if(product&&(product.kind==='crop'?state.cropsOn:state.livestockOn))addExtraRaster('selection',base+'latin-america-overview-v1/'+crop+'-outline.png',info.coordinates);
    legend(config.products.filter((p:any)=>p.kind==='crop'?state.cropsOn:state.livestockOn).map((p:any)=>({color:p.color,label:p.name})), '2020年の分布の概況。作物は面、畜産は点模様です。重なる格子は品目ごとに調整した表示用スコアの上位2品目を縞で併記します。色の面積・濃さは品目間の数量比ではありません。選んだ品目は表示下限以上の全格子の輪郭を示します。詳細な値は「この品目のみ」の図で照会できます。');
   }else if(field==='agriculture'&&crop==='none'){
    legend([],'林業の解説では代表位置を表示しています。森林の実分布や伐採量の地図ではありません。');
   }else if(field==='agriculture'&&['cattle','pig','chicken'].includes(crop)){
    livestockManifest??=await json(base+'latin-america-livestock-v1/manifest.json');const info=livestockManifest.layers.find((l:any)=>l.id===crop);
    const grid=await json(base+'latin-america-livestock-v1/'+info.query);if(ticket!==rasterRequest)return;
    activeGrid=grid;activeLayer='livestock';setRaster(base+'latin-america-livestock-v1/'+info.image,info.coordinates);
    const unit=crop==='chicken'?'羽/km²':'頭/km²';legend(info.colors.map((color:string,i:number)=>({color,label:i===info.breaks.length-1?`${info.breaks[i]} ${unit}以上`:`${info.breaks[i]}–${info.breaks[i+1]} ${unit}未満`})),'2020年 · GLW4の家畜密度推計。農場の実位置ではありません。1頭（羽）/km²未満と欠測は地点を選んで区別できます。');
   }else if(field==='agriculture'){
    cropManifest??=await json(base+'latin-america-agriculture-v1/manifest.json');const info=cropManifest.layers.find((l:any)=>l.id===crop);
    const grid=await json(base+'latin-america-agriculture-v1/'+info.query);if(ticket!==rasterRequest)return;
    activeGrid=grid;activeLayer='crop';setRaster(base+'latin-america-agriculture-v1/'+info.image,info.coordinates);
    legend(info.colors.map((color:string,i:number)=>({color,label:i===info.breaks.length-1?`${info.breaks[i].toLocaleString()} ha以上`:`${info.breaks[i].toLocaleString()}–${info.breaks[i+1].toLocaleString()} ha未満`})),'1格子内の年間収穫面積。地図を選ぶと値を表示。色のない場所は1ha未満または欠測で、同じ意味ではありません。');
   }else if(field==='population'){
    // A population layer can be unavailable without hiding the location readings.
    try{const info=await json(base+'latin-america-population-v1/manifest.json');const layer=info.regions?.['latin-america']??info;
     if(layer.image&&layer.grid&&layer.imageCoordinates){const grid=await json(base+'latin-america-population-v1/'+layer.grid);if(ticket!==rasterRequest)return;activeGrid=grid;activeLayer='population';setRaster(base+'latin-america-population-v1/'+layer.image,layer.imageCoordinates);legend(info.classes.map((c:any)=>({color:c.color,label:c.label})),'2020年の人口密度推計。国勢調査等を空間配分し、10km格子に集計。地図を選ぶと密度を表示。');}
    }catch{if(ticket!==rasterRequest)return;legend([],'番号は人口分布を読むための地域・都市の代表位置。国の人口と都市人口比率は下の比較表で確認できます。');}
   }else{if(ticket!==rasterRequest)return;legend(field==='nature'||field==='overview'?[{color:'#4f91b2',label:'主な河川'}]:[],'地域名は解説する場所の代表位置です。範囲や生産量の大小を表しません。');}
   if(ticket===rasterRequest)q('[data-map-status]').textContent=fallback?'簡易地図 · 一覧と拡大ボタンでも操作できます':'地図上の分布と解説を選べます';
  }catch(e){if(ticket!==rasterRequest)return;q('[data-map-status]').textContent='分布データを読み込めませんでした。分野を選び直すと再試行します。';legend([],'基礎地図と地域解説を表示しています。分布データは未表示です。');}
 }
 function sample(lon:number,lat:number){
  if(!activeGrid)return;
  let value:number|null=null;
  if(activeLayer==='crop'||activeLayer==='livestock')value=cropValueAt(activeGrid,lon,lat);
  else{
   const b=activeGrid.bounds4326;if(!b||lon<b[0]||lon>=b[2]||lat<=b[1]||lat>b[3]){q('[data-grid-reading]').textContent='この場所はデータなし、海域、または対象範囲外です。';return;}
   const col=Math.floor((lon-b[0])/(b[2]-b[0])*activeGrid.width),row=Math.floor((merc(b[3])-merc(lat))/(merc(b[3])-merc(b[1]))*activeGrid.height);
   const v=activeGrid.values[row*activeGrid.width+col];value=v===activeGrid.noData||v==null?null:v;
  }
  let text='この場所はデータなし、海域、または対象範囲外です。';
  if(value!==null&&activeLayer==='climate'){const c=config.classes.find((c:any)=>c.id===value);if(c)text=`${c.code} ${c.name} — ${c.description}`;}
  else if(value!==null)text=activeLayer==='crop'?`${cropManifest.layers.find((l:any)=>l.id===state.crop).label}：${value.toLocaleString('ja-JP',{maximumSignificantDigits:3})} ha / 5分格子（2020年・推計）`:activeLayer==='livestock'?`${livestockManifest.layers.find((l:any)=>l.id===state.crop).label}：${value.toLocaleString('ja-JP',{maximumSignificantDigits:3})} ${state.crop==='chicken'?'羽':'頭'}/km²（2020年・推計）`:`人口密度：${value.toLocaleString('ja-JP',{maximumSignificantDigits:3})} 人/km²（2020年・推計）`;
  q('[data-grid-reading]').textContent=text;
 }

 const extraRasterIds=new Set<string>();
 function clearExtraRasters(){
  q('[data-fallback-extra]').replaceChildren();
  if(mapReady)for(const id of extraRasterIds){if(map.getLayer(id))map.removeLayer(id);if(map.getSource(id))map.removeSource(id);}
  extraRasterIds.clear();
 }
 function addExtraRaster(name:string,url:string,coordinates:number[][]){
  const id='latin-'+name,[[w,n],[e],,[,s]]=coordinates;
  const image=document.createElementNS('http://www.w3.org/2000/svg','image');
  image.dataset.extraRaster=name;image.setAttribute('href',url);image.setAttribute('x',String(w));image.setAttribute('y',String(-merc(n)));image.setAttribute('width',String(e-w));image.setAttribute('height',String(merc(n)-merc(s)));image.setAttribute('preserveAspectRatio','none');
  image.addEventListener('error',()=>{if(image.isConnected)q('[data-map-status]').textContent='分布画像の一部を読み込めませんでした。表示を切り替えて再試行できます。';});
  q('[data-fallback-extra]').append(image);
  if(mapReady){map.addSource(id,{type:'image',url,coordinates});map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':name==='selection'?1:.85,'raster-resampling':'nearest','raster-fade-duration':0}},name==='selection'?undefined:'countries-line');}
  extraRasterIds.add(id);
 }
 function renderSelection(topic:LatinTopic|undefined,cityId:string,product:any){
  const city=cities.find(c=>c.id===cityId),country=(code:string)=>config.countries.find((c:any)=>c.code===code)?.name??code;
  const summary=q('[data-selection-summary]');summary.hidden=!topic&&!city&&!product;
  q('[data-selection-title]').textContent=topic?.title??(city?`${city.name} ― ${country(city.countryCode)}`:product?.name??'');
  q('[data-selection-kind]').textContent=topic?.placeLabel??(city?'観測所の気候':'選択した農畜産物');
  q('[data-selection-takeaway]').textContent=topic?.summary??city?.summary??(product?.kind==='livestock'?'家畜を飼育する地域の広がりを、2020年の頭羽数密度の推計で読みます。':'栽培域の広がりを、2020年の年間収穫面積の推計で読みます。');
  const actions=q('[data-selection-actions]');actions.replaceChildren();
  if(topic){const related=q(`[data-topic-panel="${topic.id}"] .latin-related`);if(related)actions.append(related.cloneNode(true));}
  const productPanel=q('[data-product-panel]');productPanel.hidden=!product||Boolean(topic);
  q('[data-product-actions]').hidden=!product;
  const single=state.agriMode==='single',shown=single||Boolean(product&&(product.kind==='crop'?state.cropsOn:state.livestockOn));
  q('[data-only-selected]').hidden=single;q('[data-only-selected]').textContent=`${product?.name??'選択品目'}のみの表示に切り替える`;
  q('[data-all-products]').hidden=!single;
  q('[data-show-selected]').hidden=!product||shown;
  q('[data-show-selected]').textContent=product?.kind==='livestock'?'畜産の分布を表示する':'作物の分布を表示する';
  q('[data-layer-switches]').hidden=state.field!=='agriculture'||state.crop==='none';
  for(const [selector,on,name] of [['[data-toggle-crops]',single?product?.kind==='crop':state.cropsOn,'作物'],['[data-toggle-livestock]',single?product?.kind==='livestock':state.livestockOn,'畜産']] as const){q(selector).textContent=`${name}の分布 ${on?'ON':'OFF'}`;q(selector).setAttribute('aria-pressed',String(Boolean(on)));}
  const notice=q('[data-layer-notice]');notice.hidden=state.field!=='agriculture'||state.crop==='none';
  notice.textContent=single?`${product?.name}だけを表示しています。` : !state.cropsOn&&!state.livestockOn?'作物・畜産の分布は非表示です。データ欠測や生産がないという意味ではありません。':product&&!shown?`${product.name}の分布は非表示です。説明はそのまま読めます。`:product?`${product.name}の分布を輪郭で強調しています。他品目も比較できます。`:'作物12区分と家畜3種類の分布を一枚で比較します。';
  if(product){
   const livestock=product.kind==='livestock';
   q('[data-product-definition]').textContent=livestock?`「密度」は1km²当たりの${product.id==='chicken'?'羽数':'頭数'}です。GLW4は統計等を格子へ配分した推計で、個々の農場の位置や飼育面積は示しません。`:'「年間収穫面積」は、その年に収穫した面積です。同じ畑で年に複数回収穫する場合は重ねて数えるため、土地そのものの面積とは異なります。MapSPAMは統計等を格子へ配分した推計です。';
   q('[data-product-limit]').textContent=livestock?'牛は肉牛と乳牛、鶏は肉用鶏と採卵鶏を区別しない収録です。肉・乳・卵の生産量はこの図からは分かりません。':'5分角格子（赤道付近で約9km）の分布です。畑の境界や2026年の作付けは示しません。温帯果樹は複数の果樹を含む資料上の区分で、果樹全体ではありません。';
   q<HTMLAnchorElement>('[data-product-source]').href=livestock?'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/':'https://cgiar-climate-data-hub.github.io/catalog/spam2020/';
   const list=q('[data-product-topics]');list.replaceChildren();
   for(const id of product.topics){const t=topics.find(t=>t.id===id);if(!t||state.place&&!t.countries.includes(state.place))continue;const b=document.createElement('button');b.type='button';b.dataset.selectTopic=id;b.textContent=t.title;list.append(b);}
   q('[data-product-empty]').hidden=list.childElementCount>0;
  }
  q('[data-capital-missing]').hidden=state.field!=='nature'||state.view!=='climate'||Boolean(cityId)||Boolean(state.topic)||!state.place||cities.some(c=>c.id===latinCapital(state.place));
  q('[data-capital-missing]').textContent=`${country(state.place)}の首都の観測資料は未収録です。別の都市を首都の代わりに自動選択しません。収録済みの都市は一覧から選べます。`;
  if(city&&!state.place)q('[data-current-place]').textContent=`中米・カリブ・南米 ／ 気候の選択国：${country(city.countryCode)}`;
 }
 function prepareSelectedStatistics(){
  for(const panel of all('[data-topic-panel]')){
   const facts=panel.querySelector('.latin-facts');if(!facts)continue;
   const block=document.createElement('section'),title=document.createElement('h2');block.dataset.topicStat=panel.dataset.topicPanel;
   title.textContent=topics.find(t=>t.id===panel.dataset.topicPanel)?.title??'';block.append(title,facts);q('[data-topic-statistics]').append(block);
  }
  for(const panel of all('[data-city-panel]')){
   const city=cities.find(c=>c.id===panel.dataset.cityPanel)!,block=document.createElement('section'),title=document.createElement('h2'),note=document.createElement('p');
   block.dataset.cityStat=city.id;title.textContent=`${city.name} ― ${config.countries.find((c:any)=>c.code===city.countryCode)?.name} の雨温図`;
   note.className='latin-small';note.textContent=`${city.period} ／ 観測所：${city.stationName} ／ ${city.latitude}°, ${city.longitude}°${city.elevationM!=null?' ／ 標高 '+city.elevationM+'m':''}。棒は降水量（mm）、線は平均気温（℃）です。`;
   block.append(title,note);for(const node of [...panel.querySelectorAll('.latin-climate-chart,details,.latin-source-link')])block.append(node);
   q('[data-city-statistics]').append(block);
  }
 }
 let productStatRequest=0;
 async function renderSelectedStatistics(){
  const ticket=++productStatRequest,product=state.field==='agriculture'?config.products.find((p:any)=>p.id===state.crop):undefined;
  const cityId=state.field==='nature'&&state.view==='climate'&&!state.topic?state.city:'';
  all('[data-topic-stat]').forEach(e=>e.hidden=e.dataset.topicStat!==state.topic);
  all('[data-city-stat]').forEach(e=>e.hidden=e.dataset.cityStat!==cityId);
  q('[data-selected-statistics]').hidden=!product&&!cityId&&!all('[data-topic-stat]').some(e=>!e.hidden);
  q('[data-product-statistics]').hidden=!product;
  q('[data-product-stat-table]').replaceChildren();
  if(!product)return;
  const livestock=product.kind==='livestock',dir=livestock?'latin-america-livestock-v1/':'latin-america-agriculture-v1/';
  q('[data-product-stat-title]').textContent=`${product.name}：${livestock?'概算飼養頭羽数':'概算年間収穫面積'}（2020年）`;
  q('[data-product-stat-note]').textContent=livestock?'密度×格子面積を国境内の格子中心で集計した推計です。公式の家畜頭羽数ではありません。':'収録格子を国境内の格子中心で集計した推計（ha）です。公式国別値とは異なり、生産量（t）でも土地の実面積でもありません。';
  q('[data-product-stat-status]').textContent='選択品目の概算値を読み込んでいます。';
  try{
   const manifest=await json(base+dir+'manifest.json');if(ticket!==productStatRequest)return;
   const layer=manifest.layers.find((l:any)=>l.id===product.id),table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr');
   for(const label of ['国・地域',livestock?product.id==='chicken'?'概算 羽':'概算 頭':'概算 ha']){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);}thead.append(head);table.append(thead);
   const body=document.createElement('tbody');
   for(const c of config.countries){const row=layer.countries.find((r:any)=>r.code===c.code),tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.scope='row';th.textContent=c.name;td.textContent=row?.value==null?'データなし':row.value.toLocaleString('ja-JP',{maximumFractionDigits:1});if(c.code===state.place)tr.className='is-selected';tr.append(th,td);body.append(tr);}
   table.append(body);q('[data-product-stat-table]').append(table);q('[data-product-stat-status]').textContent='海岸や小島の省略があります。「データなし」はゼロではありません。';q<HTMLAnchorElement>('[data-product-stat-source]').href=manifest.source.url;
  }catch{if(ticket===productStatRequest)q('[data-product-stat-status]').textContent='概算統計を読み込めませんでした。品目を選び直して再試行できます。';}
 }

 function renderStatistics(){
  if(!stats)return;const metric=stats.indicators.find((i:any)=>i.id===q<HTMLSelectElement>('[data-statistic]').value);
  const rows=config.countries.map((c:any)=>({...c,value:metric.values[c.code]??null})).sort((a:any,b:any)=>(b.value??-1)-(a.value??-1));
  const max=Math.max(...rows.map((r:any)=>r.value??0)),table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr');
  for(const title of ['国・地域',`${metric.label}（${metric.unit}）`]){const th=document.createElement('th');th.textContent=title;th.scope='col';head.append(th);}thead.append(head);table.append(thead);
  const tbody=document.createElement('tbody');
  for(const r of rows){const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.scope='row';th.textContent=r.name;if(r.code===state.place)tr.classList.add('is-selected');const bar=document.createElement('span');bar.className='latin-stat-bar';bar.style.width=`${r.value===null?0:r.value/max*100}%`;const value=document.createElement('span');value.textContent=r.value===null?'データなし':r.value.toLocaleString('ja-JP',{maximumFractionDigits:metric.unit==='人'?0:1});td.append(bar,value);tr.append(th,td);tbody.append(tr);}
  table.append(tbody);q('[data-statistics-table]').replaceChildren(table);q('[data-statistics-status]').textContent='';q<HTMLAnchorElement>('[data-statistics-source]').href=metric.sourceUrl;
 }
 function changeCrop(crop:string){
  commit({...state,field:'agriculture',crop,topic:crop==='none'?'planted-forests':'',city:'',agriMode:crop==='none'?'all':state.agriMode},{keepView:true,keepReturn:state.agriMode==='single'&&crop!=='none'});
 }
 function syncReadingHeight(){explorer.style.setProperty('--latin-map-height',`${Math.max(300,q('.latin-map-frame').getBoundingClientRect().height)}px`)}
 root.addEventListener('click',e=>{
  const link=(e.target as Element).closest<HTMLAnchorElement>('.atlas-tabs a[data-field],a[data-open-field]');
  if(link){if(e instanceof MouseEvent&&(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0))return;e.preventDefault();commit({...state,field:link.dataset.field??link.dataset.openField!,topic:'',city:(link.dataset.field??link.dataset.openField)==='nature'?(state.city||latinCapital(state.place)):'',crop:'',agriMode:'all'},{keepView:true});return;}
  const b=(e.target as Element).closest<HTMLElement>('button');if(!b)return;
  if(b.dataset.field)commit({...state,field:b.dataset.field,topic:'',city:''},{keepView:true});
  else if(b.dataset.cropOption)changeCrop(b.dataset.cropOption);
  else if(b.dataset.viewOption)commit({...state,view:b.dataset.viewOption,city:state.city||latinCapital(state.place),topic:''},{keepView:true});
  else if(b.hasAttribute('data-reading-overview'))commit({...state,topic:'',city:'',crop:'',agriMode:'all'},{keepView:true});
  else if(b.hasAttribute('data-toggle-crops')){const single=state.agriMode==='single',livestock=['cattle','pig','chicken'].includes(state.crop);commit({...state,cropsOn:single?livestock:!state.cropsOn,livestockOn:single?livestock:state.livestockOn,agriMode:'all'},{keepView:true});}
  else if(b.hasAttribute('data-toggle-livestock')){const single=state.agriMode==='single',livestock=['cattle','pig','chicken'].includes(state.crop);commit({...state,livestockOn:single?!livestock:!state.livestockOn,cropsOn:single?!livestock:state.cropsOn,agriMode:'all'},{keepView:true});}
  else if(b.hasAttribute('data-show-selected')){const livestock=['cattle','pig','chicken'].includes(state.crop);commit({...state,cropsOn:livestock?state.cropsOn:true,livestockOn:livestock?true:state.livestockOn},{keepView:true});}
  else if(b.hasAttribute('data-only-selected'))commit({...state,agriMode:'single'},{keepView:true,comparison:true});
  else if(b.hasAttribute('data-all-products')){if(returnTo?.field==='agriculture'){const previous=returnTo;commit(previous,{keepView:true});}else commit({...state,agriMode:'all'},{keepView:true});}
  else if(b.dataset.selectTopic)selectTopic(b.dataset.selectTopic);
  else if(b.dataset.compareTopic)selectTopic(b.dataset.compareTopic,true);
  else if(b.dataset.compareField){
   const city=cities.find(c=>c.id===b.closest<HTMLElement>('[data-city-panel]')?.dataset.cityPanel);
   commit({...state,field:b.dataset.compareField,topic:'',city:'',camera:city?[city.longitude,city.latitude,5]:state.camera},{keepView:!city,comparison:true});
  }
  else if(b.hasAttribute('data-return')&&returnTo){const previous=returnTo;commit(previous);}
  else if(b.dataset.countryButton){commit({...state,place:b.dataset.countryButton,topic:'',city:state.field==='nature'?latinCapital(b.dataset.countryButton):'',camera:undefined});renderStatistics();}
  else if(b.hasAttribute('data-reset')){commit({...state,place:'',topic:'',city:state.field==='nature'?latinCapital(''):'',camera:undefined});renderStatistics();}
  else if(b.hasAttribute('data-fit')){fitBounds(config.bounds);state.camera=currentCamera();const url=new URL(location.href);url.search=writeLatinState(state);if(new URLSearchParams(location.search).get('renderer')==='svg')url.searchParams.set('renderer','svg');history.replaceState({latinReturn:returnTo},'',url);drawMarkers();}
  else if(b.dataset.zoom){if(mapReady)map.zoomTo(map.getZoom()+Number(b.dataset.zoom),{duration:0});else{const v=svg.viewBox.baseVal,f=Number(b.dataset.zoom)>0?.7:1.4;svg.setAttribute('viewBox',`${v.x+v.width*(1-f)/2} ${v.y+v.height*(1-f)/2} ${v.width*f} ${v.height*f}`);state.camera=currentCamera();const url=new URL(location.href);url.search=writeLatinState(state);if(new URLSearchParams(location.search).get('renderer')==='svg')url.searchParams.set('renderer','svg');history.replaceState({latinReturn:returnTo},'',url);drawMarkers();}}
 });
 q<HTMLSelectElement>('[data-place]').addEventListener('change',e=>{commit({...state,place:(e.target as HTMLSelectElement).value,topic:'',city:state.field==='nature'?latinCapital((e.target as HTMLSelectElement).value):'',camera:undefined});renderStatistics()});
 q<HTMLSelectElement>('[data-topic]').addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;if(value)selectTopic(value);else commit({...state,topic:'',city:''},{keepView:true})});
 q<HTMLSelectElement>('[data-city]').addEventListener('change',e=>{const city=(e.target as HTMLSelectElement).value,selected=cities.find(c=>c.id===city);commit({...state,city,topic:'',place:selected&&selected.countryCode!==state.place?'':state.place,camera:undefined});renderStatistics()});
 q<HTMLSelectElement>('[data-crop]').addEventListener('change',e=>changeCrop((e.target as HTMLSelectElement).value));
 q<HTMLSelectElement>('[data-view]').addEventListener('change',e=>commit({...state,view:(e.target as HTMLSelectElement).value},{keepView:true}));
 q('.latin-reading').addEventListener('keydown',e=>{if((e as KeyboardEvent).key==='Escape')commit({...state,topic:'',city:'',crop:'',agriMode:'all'},{keepView:true});});
 q<HTMLSelectElement>('[data-statistic]').addEventListener('change',renderStatistics);
 svg.addEventListener('click',e=>{const matrix=svg.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());sample(p.x,invMerc(-p.y))});
 window.addEventListener('popstate',()=>{initialClimate=false;state=read();returnTo=history.state?.latinReturn;render();renderStatistics()});
 window.addEventListener('resize',()=>{syncReadingHeight();if(!mapReady)drawMarkers()});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncReadingHeight).observe(q('.latin-map-frame'));
 prepareSelectedStatistics();
 render();
 if(state.field==='nature'&&state.city){const url=new URL(location.href);url.search=writeLatinState(state);if(new URLSearchParams(location.search).get('renderer')==='svg')url.searchParams.set('renderer','svg');history.replaceState({latinReturn:returnTo},'',url);}
 json(base+'latin-america-context-v1/statistics.json').then(data=>{stats=data;renderStatistics()}).catch(()=>q('[data-statistics-status]').textContent='国別統計を読み込めませんでした。下の出典から確認できます。');
 Promise.all([json(base+'latin-america-context-v1/countries.json'),json(base+'latin-america-context-v1/rivers.json')]).then(async([countries,rivers])=>{
  const group=q<SVGGElement>('[data-fallback-rivers]');
  for(const f of rivers.features){const line=document.createElementNS('http://www.w3.org/2000/svg','path');const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;line.setAttribute('d',lines.map((r:number[][])=>r.map((p,i)=>`${i?'L':'M'}${p[0]},${-merc(p[1])}`).join('')).join(''));group.append(line);}
  if(new URLSearchParams(location.search).get('renderer')==='svg'){useFallback();return;}
  const {Map,Marker,setWorkerUrl}=await import('maplibre-gl');setWorkerUrl(mapWorkerUrl);(window as any).__latinMarker=Marker;
  try{
   map=new Map({container:q('[data-map-surface]'),attributionControl:false,cooperativeGestures:true,center:[-62,-15],zoom:2,minZoom:1,maxZoom:9,maxBounds:[[-180,-70],[90,70]],style:{version:8,sources:{countries:{type:'geojson',data:countries},rivers:{type:'geojson',data:rivers}},layers:[{id:'sea',type:'background',paint:{'background-color':'#e7eff3'}},{id:'countries-fill',type:'fill',source:'countries',paint:{'fill-color':['case',['in',['get','code'],['literal',config.countries.map((c:any)=>c.code)]],'#d8e0da','#dddfe0']}},{id:'countries-line',type:'line',source:'countries',paint:{'line-color':'#6b7c80','line-width':.8}},{id:'rivers-line',type:'line',source:'rivers',paint:{'line-color':'#4f91b2','line-width':1.4,'line-opacity':.8}}]}});
   map.on('styledata',()=>{root.dataset.mapStage='style';});
   map.on('sourcedata',()=>{root.dataset.mapStage='source';});
   map.on('load',()=>{mapReady=true;fallback=false;svg.style.display='none';q('[data-map-surface]').hidden=false;fit();drawMarkers();loadRaster();root.dataset.renderer='maplibre';});
   map.on('click',(e:any)=>sample(e.lngLat.lng,e.lngLat.lat));
   map.on('moveend',()=>{if(!mapReady)return;drawMarkers();state.camera=currentCamera();const url=new URL(location.href);url.search=writeLatinState(state);if(new URLSearchParams(location.search).get('renderer')==='svg')url.searchParams.set('renderer','svg');history.replaceState({latinReturn:returnTo},'',url)});
   map.on('error',(e:any)=>{console.warn('Latin America map:',e.error);if(!mapReady)useFallback();else if(e.error)q('[data-map-status]').textContent='地図データの一部を表示できません。分野を選び直して再試行できます。'});
  }catch{useFallback()}
 }).catch(()=>useFallback());
 function useFallback(){mapReady=false;fallback=true;map?.remove();map=null;q('[data-map-surface]').hidden=true;svg.style.display='';root.dataset.renderer='svg';q('[data-map-status]').textContent='簡易地図 · 一覧と拡大ボタンでも操作できます';fit();drawMarkers();}
}
