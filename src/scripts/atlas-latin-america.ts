import {readLatinState,writeLatinState,cropValueAt,type LatinState} from '../lib/atlas-latin-america-state';
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
 function commit(next:LatinState,options:{replace?:boolean;keepView?:boolean;comparison?:boolean}={}){
  if(options.comparison)returnTo={...state,camera:currentCamera()};
  else if(!options.replace)returnTo=undefined;
  state={...next,camera:options.keepView?currentCamera():next.camera};
  const url=new URL(location.href);url.pathname=config.basePath+(state.field==='overview'?'':state.field+'/');url.search=writeLatinState(state);
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
  if(city)fitBounds([city.longitude-2,city.latitude-2,city.longitude+2,city.latitude+2]);
  else fitBounds(topic?.extent??country?.bounds??config.bounds);
 }
 function visibleTopics(){return topics.filter(t=>t.field===state.field&&(!state.place||t.countries.includes(state.place)));}
 function render(move=true){
  const isLivestock=['cattle','pig','chicken'].includes(state.crop);
  const topic=topics.find(t=>t.id===state.topic),field=config.fields.find((f:any)=>f.id===state.field);
  const displayCity=state.city||(!state.topic&&state.field==='nature'&&state.view==='climate'?(state.place?cities.find(c=>c.countryCode===state.place)?.id:cities.find(c=>c.id==='sao-paulo')?.id):'')||'';
  explorer.dataset.field=state.field==='nature'?'natural':state.field;
  explorer.dataset.natureMode=state.view==='climate'?'climate':'water';
  q('[data-field-national]').setAttribute('data-field-national',explorer.dataset.field);
  all<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(b=>{if(b.dataset.field===state.field)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  q('[data-current-place]').textContent=config.countries.find((c:any)=>c.code===state.place)?.name??'中米・カリブ・南米';
  q('[data-overview-fields]').hidden=state.field!=='overview';
  q('[data-city-picker]').hidden=state.field!=='nature'||state.view!=='climate';
  q('[data-reading-topbar]').hidden=!state.topic&&!state.city;
  q('[data-reading-overview]').textContent=`← 中南米の${field.name}`;
  q('.latin-reading').setAttribute('data-selected',String(Boolean(state.topic||state.city)));
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
  q('[data-overview]').hidden=Boolean(state.topic||displayCity);q('[data-overview-title]').textContent=field.subtitle;q('[data-overview-summary]').textContent=field.summary;q('[data-reading-field]').textContent=field.name;
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
  if(mapReady)map.setPaintProperty('countries-line','line-width',['case',['==',['get','code'],state.place],2.5,.8]);
  if(move)fit();
  q('[data-reading-scroll]').scrollTop=0;
  drawMarkers();loadRaster();syncReadingHeight();renderStatistics();
 }
 function markerRows(){
  const candidates=state.field==='overview'?topics.filter(t=>t.field==='nature'):state.field==='nature'&&state.view==='climate'?visibleTopics().filter(t=>t.id===state.topic):visibleTopics();
  const rows=candidates.map(t=>({id:t.id,label:t.label,lon:t.location[0],lat:t.location[1],num:topics.indexOf(t)+1,city:false}));
  if(state.field==='nature'&&state.view==='climate')for(const c of cities.filter(c=>!state.place||c.countryCode===state.place))rows.push({id:c.id,label:c.name.split('（')[0],lon:c.longitude,lat:c.latitude,num:0,city:true});
  return rows;
 }
 function selectTopic(id:string,comparison=false){
  const t=topics.find(t=>t.id===id);if(!t)return;
  const layers:Record<string,string>={'cerrado-soy':'soyb','brazil-second-maize':'maiz','brazil-coffee':'coff','colombia-coffee':'coff','central-coffee':'coff','brazil-sugar':'sugc','pampas-farming':'whea','chile-fruit':'temf','andean-farming':'pota','tropical-bananas':'bana','planted-forests':'none'};
  commit({...state,field:t.field,topic:id,city:'',crop:layers[id]??state.crop,place:t.countries.includes(state.place)?state.place:'',camera:undefined},{comparison});
 }
 function drawMarkers(){
  markers.forEach(m=>m.remove());markers=[];
  const group=q<SVGGElement>('[data-fallback-markers]');group.replaceChildren();
  const frame=q('.latin-map-frame').getBoundingClientRect(),boxes:{left:number;top:number;right:number;bottom:number}[]=[];
  const rows=markerRows().sort((a,b)=>Number(b.id===(state.city||state.topic||'sao-paulo'))-Number(a.id===(state.city||state.topic||'sao-paulo'))).filter(r=>{
   if(!frame.width||!frame.height)return true;
   const v=svg.viewBox.baseVal,p=mapReady?map.project([r.lon,r.lat]):{x:(r.lon-v.x)/v.width*frame.width,y:(-merc(r.lat)-v.y)/v.height*frame.height};
   const width=Math.max(40,r.label.length*11+14),box={left:p.x-width/2,top:p.y-43,right:p.x+width/2,bottom:p.y};
   if(box.left<0||box.right>frame.width||box.top<0||box.bottom>frame.height||boxes.some(b=>box.left<b.right+3&&box.right>b.left-3&&box.top<b.bottom+3&&box.bottom>b.top-3))return false;
   boxes.push(box);return true;
  });
  if(mapReady){
   for(const r of rows){
    const b=document.createElement('button');b.type='button';b.className=`latin-marker${r.city?' climate-city':''}`;b.setAttribute('aria-label',`${r.city?'雨温図':'解説'}：${r.label}`);b.setAttribute('aria-pressed',String(r.id===(r.city?state.city:state.topic)));b.textContent=r.label;b.title=r.label;
    b.addEventListener('click',e=>{e.stopPropagation();if(r.city)commit({...state,field:'nature',city:r.id,topic:'',camera:undefined});else selectTopic(r.id)});
    markers.push(new (window as any).__latinMarker({element:b,anchor:'bottom',offset:[0,-6]}).setLngLat([r.lon,r.lat]).addTo(map));
   }
  }else{
   const scale=Math.max(svg.viewBox.baseVal.width/Math.max(svg.clientWidth,300),svg.viewBox.baseVal.height/Math.max(svg.clientHeight,300));
   for(const r of rows){
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform',`translate(${r.lon},${-merc(r.lat)})`);g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`${r.city?'雨温図':'解説'}：${r.label}`);g.classList.add('latin-svg-marker');
    const width=Math.max(34,r.label.length*11+12),rect=document.createElementNS(g.namespaceURI,'rect');rect.setAttribute('x',String(-width/2*scale));rect.setAttribute('y',String(-29*scale));rect.setAttribute('width',String(width*scale));rect.setAttribute('height',String(23*scale));rect.setAttribute('rx',String(3*scale));rect.setAttribute('fill',r.id===(r.city?state.city:state.topic)?'#fff0b3':'#fffef4');rect.setAttribute('stroke','#60767c');rect.setAttribute('stroke-width',String(scale));g.append(rect);
    const text=document.createElementNS(g.namespaceURI,'text');text.textContent=r.label;text.setAttribute('y',String(-17*scale));text.setAttribute('font-size',String(11*scale));text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.setAttribute('fill','#203b47');g.append(text);
    const circle=document.createElementNS(g.namespaceURI,'circle');circle.setAttribute('r',String(2.5*scale));circle.setAttribute('fill','#fffef4');circle.setAttribute('stroke','#344e59');circle.setAttribute('stroke-width',String(scale));g.append(circle);
    const act=()=>r.city?commit({...state,city:r.id,topic:'',camera:undefined}):selectTopic(r.id);
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
  if(state.field==='nature'&&state.view==='climate'&&items.length>5){const families=document.createElement('div');families.className='latin-legend-items';for(const name of ['A 熱帯','B 乾燥帯','C 温帯','D 冷帯','E 寒帯','○ 雨温図の都市']){const span=document.createElement('span');span.textContent=name;families.append(span)}const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='各気候区分の凡例';details.append(summary,list);el.append(families,details,p);}else el.append(list,p);
 }
 async function loadRaster(){
  const ticket=++rasterRequest,field=state.field,crop=state.crop,view=state.view;
  activeGrid=null;activeLayer='';setRaster(null);
  q('[data-grid-reading]').textContent='地図の地域名か一覧から、解説を選べます。';
  try{
   if(field==='nature'&&view==='climate'){
    climateManifest??=await json(base+'latin-america-climate-v1/manifest.json');const info=climateManifest.regions['latin-america'];
    const grid=await json(base+'latin-america-climate-v1/'+info.grid);if(ticket!==rasterRequest)return;
    activeGrid=grid;activeLayer='climate';setRaster(base+'latin-america-climate-v1/'+info.image,info.imageCoordinates);
    legend(config.classes.filter((c:any)=>info.classIds.includes(c.id)).map((c:any)=>({color:c.color,label:`${c.code} ${c.name}`})),'1991–2020年 · 0.1度区分を表示。地図の陸地を選ぶと区分と意味が分かります。透明部分は対象外またはデータなし。');
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
  const topicIds:Record<string,string>={soyb:'cerrado-soy',maiz:'brazil-second-maize',whea:'pampas-farming',sugc:'brazil-sugar',coff:state.place==='COL'?'colombia-coffee':'brazil-coffee',bana:'tropical-bananas',pota:'andean-farming',temf:'chile-fruit',none:'planted-forests',cattle:'pampas-farming'};
  const topic=topics.find(t=>t.id===topicIds[crop]&&(!state.place||t.countries.includes(state.place)));
  commit({...state,field:'agriculture',crop,topic:topic?.id??'',city:''},{keepView:true});renderStatistics();
 }
 function syncReadingHeight(){explorer.style.setProperty('--latin-map-height',`${Math.max(300,q('.latin-map-frame').getBoundingClientRect().height)}px`)}
 root.addEventListener('click',e=>{
  const link=(e.target as Element).closest<HTMLAnchorElement>('.atlas-tabs a[data-field],a[data-open-field]');
  if(link){if(e instanceof MouseEvent&&(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0))return;e.preventDefault();commit({...state,field:link.dataset.field??link.dataset.openField!,topic:'',city:''},{keepView:true});return;}
  const b=(e.target as Element).closest<HTMLElement>('button');if(!b)return;
  if(b.dataset.field)commit({...state,field:b.dataset.field,topic:'',city:''},{keepView:true});
  else if(b.dataset.cropOption)changeCrop(b.dataset.cropOption);
  else if(b.dataset.viewOption)commit({...state,view:b.dataset.viewOption,city:'',topic:''},{keepView:true});
  else if(b.hasAttribute('data-reading-overview'))commit({...state,topic:'',city:''},{keepView:true});
  else if(b.dataset.selectTopic)selectTopic(b.dataset.selectTopic);
  else if(b.dataset.compareTopic)selectTopic(b.dataset.compareTopic,true);
  else if(b.dataset.compareField){
   const city=cities.find(c=>c.id===b.closest<HTMLElement>('[data-city-panel]')?.dataset.cityPanel);
   commit({...state,field:b.dataset.compareField,topic:'',city:'',camera:city?[city.longitude,city.latitude,5]:state.camera},{keepView:!city,comparison:true});
  }
  else if(b.hasAttribute('data-return')&&returnTo){const previous=returnTo;commit(previous);}
  else if(b.dataset.countryButton){commit({...state,place:b.dataset.countryButton,topic:'',city:'',camera:undefined});renderStatistics();}
  else if(b.hasAttribute('data-reset')){commit({...state,place:'',topic:'',city:'',camera:undefined});renderStatistics();}
  else if(b.hasAttribute('data-fit')){fitBounds(config.bounds);state.camera=currentCamera();const url=new URL(location.href);url.search=writeLatinState(state);history.replaceState({latinReturn:returnTo},'',url);drawMarkers();}
  else if(b.dataset.zoom){if(mapReady)map.zoomTo(map.getZoom()+Number(b.dataset.zoom),{duration:0});else{const v=svg.viewBox.baseVal,f=Number(b.dataset.zoom)>0?.7:1.4;svg.setAttribute('viewBox',`${v.x+v.width*(1-f)/2} ${v.y+v.height*(1-f)/2} ${v.width*f} ${v.height*f}`);state.camera=currentCamera();const url=new URL(location.href);url.search=writeLatinState(state);history.replaceState({latinReturn:returnTo},'',url);drawMarkers();}}
 });
 q<HTMLSelectElement>('[data-place]').addEventListener('change',e=>{commit({...state,place:(e.target as HTMLSelectElement).value,topic:'',city:'',camera:undefined});renderStatistics()});
 q<HTMLSelectElement>('[data-topic]').addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;if(value)selectTopic(value);else commit({...state,topic:'',city:''},{keepView:true})});
 q<HTMLSelectElement>('[data-city]').addEventListener('change',e=>{const city=(e.target as HTMLSelectElement).value,selected=cities.find(c=>c.id===city);commit({...state,city,topic:'',place:selected&&selected.countryCode!==state.place?'':state.place,camera:undefined});renderStatistics()});
 q<HTMLSelectElement>('[data-crop]').addEventListener('change',e=>changeCrop((e.target as HTMLSelectElement).value));
 q<HTMLSelectElement>('[data-view]').addEventListener('change',e=>commit({...state,view:(e.target as HTMLSelectElement).value},{keepView:true}));
 q<HTMLSelectElement>('[data-statistic]').addEventListener('change',renderStatistics);
 svg.addEventListener('click',e=>{const matrix=svg.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());sample(p.x,invMerc(-p.y))});
 window.addEventListener('popstate',()=>{state=read();returnTo=history.state?.latinReturn;render();renderStatistics()});
 window.addEventListener('resize',()=>{syncReadingHeight();if(!mapReady)drawMarkers()});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncReadingHeight).observe(q('.latin-map-frame'));
 render();
 json(base+'latin-america-context-v1/statistics.json').then(data=>{stats=data;renderStatistics()}).catch(()=>q('[data-statistics-status]').textContent='国別統計を読み込めませんでした。下の出典から確認できます。');
 Promise.all([json(base+'latin-america-context-v1/countries.json'),json(base+'latin-america-context-v1/rivers.json')]).then(async([countries,rivers])=>{
  const group=q<SVGGElement>('[data-fallback-rivers]');
  for(const f of rivers.features){const line=document.createElementNS('http://www.w3.org/2000/svg','path');const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;line.setAttribute('d',lines.map((r:number[][])=>r.map((p,i)=>`${i?'L':'M'}${p[0]},${-merc(p[1])}`).join('')).join(''));group.append(line);}
  if(new URLSearchParams(location.search).get('renderer')==='svg')return;
  const {Map,Marker,setWorkerUrl}=await import('maplibre-gl');setWorkerUrl(mapWorkerUrl);(window as any).__latinMarker=Marker;
  try{
   map=new Map({container:q('[data-map-surface]'),attributionControl:false,cooperativeGestures:true,center:[-62,-15],zoom:2,minZoom:1,maxZoom:9,maxBounds:[[-180,-70],[90,70]],style:{version:8,sources:{countries:{type:'geojson',data:countries},rivers:{type:'geojson',data:rivers}},layers:[{id:'sea',type:'background',paint:{'background-color':'#e7eff3'}},{id:'countries-fill',type:'fill',source:'countries',paint:{'fill-color':['case',['in',['get','code'],['literal',config.countries.map((c:any)=>c.code)]],'#d8e0da','#dddfe0']}},{id:'countries-line',type:'line',source:'countries',paint:{'line-color':'#6b7c80','line-width':.8}},{id:'rivers-line',type:'line',source:'rivers',paint:{'line-color':'#4f91b2','line-width':1.4,'line-opacity':.8}}]}});
   map.on('styledata',()=>{root.dataset.mapStage='style';});
   map.on('sourcedata',()=>{root.dataset.mapStage='source';});
   map.on('load',()=>{mapReady=true;fallback=false;svg.style.display='none';q('[data-map-surface]').hidden=false;fit();drawMarkers();loadRaster();root.dataset.renderer='maplibre';});
   map.on('click',(e:any)=>sample(e.lngLat.lng,e.lngLat.lat));
   map.on('moveend',()=>{if(!mapReady)return;drawMarkers();state.camera=currentCamera();const url=new URL(location.href);url.search=writeLatinState(state);history.replaceState({latinReturn:returnTo},'',url)});
   map.on('error',(e:any)=>{console.warn('Latin America map:',e.error);if(!mapReady)useFallback();else if(e.error)q('[data-map-status]').textContent='地図データの一部を表示できません。分野を選び直して再試行できます。'});
  }catch{useFallback()}
 }).catch(()=>useFallback());
 function useFallback(){mapReady=false;fallback=true;map?.remove();map=null;q('[data-map-surface]').hidden=true;svg.style.display='';root.dataset.renderer='svg';q('[data-map-status]').textContent='簡易地図 · 一覧と拡大ボタンでも操作できます';fit();drawMarkers();}
}
