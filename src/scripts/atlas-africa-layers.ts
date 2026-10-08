import {withBase} from '../lib/urls.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import {africaAgriFocusedLayer,africaAgriVisibleLayers,countries,type State} from '../data/atlas/africa-atlas.ts';
import {africaCultureGuides,africaCultureGuideReason} from '../data/atlas/africa-culture-guide.ts';
import {africaHydrologyRivers,africaHydrologyRiverForFeature,africaHydrologyBasinRelations,africaHydrologyOverview} from '../data/atlas/africa-hydrology-reading.ts';
import {africaClimateCities,africaClimateCityCoverage} from '../data/atlas/africa-climate-cities.ts';

type Row=Record<string,any>;
type Feature={type:string;id?:string;geometry:Row;properties:Row};
export type AfricaLayerKey={id:string;label:string;color:string;code?:string;description?:string};
export type AfricaLayerView={key:string;ready:boolean;loading:boolean;error:string;title:string;period:string;unit:string;scope:string;method:string;sourceUrl:string;sourceLabel:string;legend:AfricaLayerKey[];takeaway:string;description:string;guide?:boolean;selectedVisible?:boolean;visibleLayers?:{key:string;title:string;unit:string;color:string;ready:boolean;loading:boolean;error:string;period:string;sourceUrl:string;sourceLabel:string;scope?:string;threshold?:number}[]};
type Loaded={value?:any;error?:string;promise?:Promise<void>};
const SVG='http://www.w3.org/2000/svg';
export const africaRiverDisplayColors={base:'#9bb5c1',named:'#377f9d',selected:'#b15e32'} as const;
export const africaClimateClassAnchors=[{coordinates:[10,24],id:4,label:'BWh 砂漠'},{coordinates:[20,0],id:1,label:'Af 熱帯雨林'},{coordinates:[23,-9],id:3,label:'Aw サバナ'},{coordinates:[38,12],id:12,label:'Cwb 温帯冬季少雨'},{coordinates:[19,-33],id:8,label:'Csa 地中海性'}] as const;
export const africaCommodityColors:Record<string,string>={maize:'#c59320',rice:'#287daa',wheat:'#8b64aa',cassava:'#268365',cattle:'#98513e',goats:'#aa6b28',sheep:'#50698c'};
export const africaCommodityLabels:Record<string,string>={maize:'とうもろこし',rice:'稲',wheat:'小麦',cassava:'キャッサバ',cattle:'牛',goats:'ヤギ',sheep:'羊'};
export function africaCommodityColor(key:string):string{return africaCommodityColors[key.replace(/^crop-|^livestock-/,'').replace(/-harvested$|-production$/,'')]??'#567c77';}
/** Existing country locator, deliberately distinct from a crop-summary anchor. */
export function africaAgriContextPlace(overview:boolean,focused:string,activeKeys:string[],viewport:number[]){
 const rice='crop-rice-harvested';
 if(!activeKeys.includes(rice)||!overview&&focused!==rice)return null;
 const place=countries.find(country=>country.code==='MDG');if(!place)return null;
 const [x,y]=projectAfrica(place.point);
 return x>=viewport[0]&&x<=viewport[0]+viewport[2]&&y>=viewport[1]&&y<=viewport[1]+viewport[3]?place:null;
}
const text=(v:any,fallback=''):string=>typeof v==='string'?v:v===null||v===undefined?fallback:String(v);
const note=(v:any,fallback=''):string=>typeof v==='string'?v:Array.isArray(v)?v.map(item=>note(item)).filter(Boolean).join(' '):v&&typeof v==='object'?text(v.note??v.description??v.label,fallback):fallback;
const label=(r:Row)=>text(r.label??r.nameJa??r.name??r.code??r.id);
export function africaGridValueLabel(value:number):string {
 return value>0&&value<.001?new Intl.NumberFormat('ja-JP',{maximumSignificantDigits:4}).format(value):value.toLocaleString('ja-JP');
}
export function africaActualLayerKey(state:Pick<State,'field'|'topic'|'water'> & Partial<Pick<State,'crop'|'livestock'|'cropMeasure'>>):string {
 if(state.field==='nature')return state.topic==='water'?`water-${state.water}`:state.topic;
 if(state.field==='agriculture')return state.topic==='farming'?`crop-${state.crop??'maize'}-${state.cropMeasure??'harvested'}`:state.topic==='livestock'?`livestock-${state.livestock??'cattle'}`:'';
 return state.field==='population'?state.topic:'';
}
export function africaLayerPath(geometry:Row):string {
 const line=(points:number[][])=>points.map((point,index)=>{const [x,y]=projectAfrica(point);return `${index?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join('');
 if(geometry.type==='LineString')return line(geometry.coordinates);
 if(geometry.type==='MultiLineString')return geometry.coordinates.map(line).join('');
 if(geometry.type==='Polygon')return geometry.coordinates.map((ring:number[][])=>line(ring)+'Z').join('');
 if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap((polygon:number[][][])=>polygon.map(ring=>line(ring)+'Z')).join('');
 return '';
}
export function africaGridValue(bytes:Uint8Array,metadata:Row,lon:number,lat:number):number|null {
 const bounds=metadata.bounds??[-27,-36,64,39],width=Number(metadata.width),height=Number(metadata.height);
 if(!Number.isInteger(width)||!Number.isInteger(height)||lon<bounds[0]||lon>=bounds[2]||lat<=bounds[1]||lat>bounds[3])return null;
 const col=Math.floor((lon-bounds[0])/(bounds[2]-bounds[0])*width),row=Math.floor((bounds[3]-lat)/(bounds[3]-bounds[1])*height),index=row*width+col;
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const value=metadata.encoding?.includes('float32')?index*4+3<bytes.length?data.getFloat32(index*4,true):null:metadata.encoding?.includes('int16')?index*2+1<bytes.length?data.getInt16(index*2,true):null:index<bytes.length?bytes[index]:null;
 return value===metadata.noData||value===null||!Number.isFinite(value)?null:value;
}
export function africaRasterCategory(value:number,layer:Row):{id:string;color:string}|null {
 if(value===layer.noData||!Number.isFinite(value))return null;
 if(layer.zeroValue!==undefined&&value===layer.zeroValue)return {id:text(layer.zeroId,'zero'),color:layer.zeroColor};
 if(layer.breaks){const bucket=layer.breaks.findIndex((edge:number)=>value<edge),index=bucket<0?layer.colors.length-1:bucket;return {id:text((layer.positiveLegend??layer.legend)?.[index]?.id,String(index)),color:layer.colors[index]};}
 const category=layer.classes?.find((row:Row)=>Number(row.id)===value);return category?{id:text(category.id),color:category.color}:null;
}

/** Trace only edges between selected and unselected display cells, retaining holes and gaps. */
export function africaGridClassOutline(bytes:Uint8Array,layer:Row,classId:string):string {
 const width=Number(layer.width),height=Number(layer.height),bounds=layer.bounds??[-27,-36,64,39];
 if(!classId||!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0)return '';
 const stride=layer.encoding?.includes('float32')?4:layer.encoding?.includes('int16')?2:1;
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),selected=new Uint8Array(width*height);
 for(let index=0;index<selected.length&&index*stride+stride<=bytes.byteLength;index++){
  const value=stride===4?data.getFloat32(index*4,true):stride===2?data.getInt16(index*2,true):bytes[index];
  selected[index]=Number(africaRasterCategory(value,layer)?.id===classId);
 }
 const [left,top]=projectAfrica([bounds[0],bounds[3]]),[right,bottom]=projectAfrica([bounds[2],bounds[1]]);
 const x=(column:number)=>(left+(right-left)*column/width).toFixed(2),y=(row:number)=>(top+(bottom-top)*row/height).toFixed(2),segments:string[]=[];
 // Coalesce collinear edges without joining disconnected outlines across empty cells.
 for(let row=0;row<=height;row++){
  let start=-1;
  for(let col=0;col<=width;col++){
   const edge=col<width&&(row>0?selected[(row-1)*width+col]:0)!==(row<height?selected[row*width+col]:0);
   if(edge&&start<0)start=col;
   if(!edge&&start>=0){segments.push(`M${x(start)},${y(row)}H${x(col)}`);start=-1;}
  }
 }
 for(let col=0;col<=width;col++){
  let start=-1;
  for(let row=0;row<=height;row++){
   const edge=row<height&&(col>0?selected[row*width+col-1]:0)!==(col<width?selected[row*width+col]:0);
   if(edge&&start<0)start=row;
   if(!edge&&start>=0){segments.push(`M${x(col)},${y(start)}V${y(row)}`);start=-1;}
  }
 }
 return segments.join('');
}

export function createAfricaLayerRenderer(root:HTMLElement,onReady:()=>void,fetcher:typeof fetch=fetch){
 const cache=new Map<string,Loaded>(),paths=new WeakMap<object,string>();
 const baseGroup=root.querySelector<SVGGElement>('[data-africa-actual-layer]')!;
 let group=baseGroup;
 const agriGroups=new Map<string,SVGGElement>(),rasterCache=new Map<string,string>(),outlineCache=new Map<string,string>();
 const viewCache=new Map<string,{manifest:Row;layer:Row;base:string;view:AfricaLayerView;grid?:Uint8Array}>();
 let currentKey='',lastPaint='',visibleKeys:string[]=[],agriMode=false;
 let lastAgriPaint='';
 const notify=()=>{if(root.isConnected)onReady();};
 function request(url:string,binary=false,parts?:Row[]):Loaded {
  const found=cache.get(url);if(found)return found;
  const loaded:Loaded={};cache.set(url,loaded);
  loaded.promise=(async()=>{try{let bytes:Uint8Array;if(parts?.length){const chunks:Uint8Array[]=[];let total=0;for(const part of parts){const response=await fetcher(url.slice(0,url.lastIndexOf('/')+1)+text(part.file));if(!response.ok)throw new Error(`HTTP ${response.status}`);const chunk=new Uint8Array(await response.arrayBuffer());if(chunk.length!==part.bytes)throw new Error('分割ファイルの長さが一致しません');chunks.push(chunk);total+=chunk.length;}bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}}else{const response=await fetcher(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);bytes=new Uint8Array(await response.arrayBuffer());}if(bytes[0]===31&&bytes[1]===139)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());loaded.value=binary?bytes:JSON.parse(new TextDecoder().decode(bytes));}catch(error){loaded.error=error instanceof Error?error.message:'取得失敗';}finally{loaded.promise=undefined;notify();}})();
  return loaded;
 }
 const svg=(tag:string,attrs:Row)=>{const node=document.createElementNS(SVG,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
 const mapMetrics=()=>{const map=baseGroup.ownerSVGElement,box=map?.getBoundingClientRect(),viewport=(map?.getAttribute('viewBox')??`0 0 ${africaWidth} ${africaHeight}`).split(/[ ,]+/).map(Number);return {viewport,scale:Math.max(viewport[2]/(box?.width||700),viewport[3]/(box?.height||580))};};
 type LabelBox={x:number;y:number;w:number;h:number};
 function namedMapLabel(target:SVGGElement,name:string,coordinates:readonly number[],color:string,attrs:Row,occupied:LabelBox[]){
  const {viewport,scale}=mapMetrics(),[ax,ay]=projectAfrica([...coordinates]);
  if(ax<viewport[0]||ax>viewport[0]+viewport[2]||ay<viewport[1]||ay>viewport[1]+viewport[3])return null;
  const font=14*scale,width=(name.length*14+8)*scale,height=21*scale,gap=5*scale,candidates:number[][]=[];
  for(const offset of [-12,19,-39,46,-66,73,-93,100])candidates.push([gap,offset*scale],[-width-gap,offset*scale]);
  const minX=viewport[0]+4*scale,maxX=viewport[0]+viewport[2]-width-4*scale,minY=viewport[1]+height,maxY=viewport[1]+viewport[3]-6*scale;
  const fits=(box:LabelBox)=>!occupied.some(other=>box.x<other.x+other.w+gap&&box.x+box.w+gap>other.x&&box.y-box.h<other.y+gap&&box.y+gap>other.y-other.h);
  const position=candidates.map(([dx,dy])=>({x:Math.max(minX,Math.min(maxX,ax+dx)),y:Math.max(minY,Math.min(maxY,ay+dy)),w:width,h:height})).find(fits);
  if(!position)return null;occupied.push(position);
  // Keep the leader outside the interactive group: a long leader enlarges the
  // group's hit box, so a normal click at its center can land on another name.
  target.append(svg('path',{d:`M${ax},${ay}L${Math.max(position.x,Math.min(position.x+width,ax))},${position.y-5*scale}`,fill:'none',stroke:color,'stroke-width':1,'vector-effect':'non-scaling-stroke','pointer-events':'none','aria-hidden':'true'}));
  const node=svg('g',attrs),nameNode=svg('text',{x:position.x,y:position.y,'font-size':font,'font-weight':650,fill:color,stroke:'#fffdf8','stroke-width':3*scale,'paint-order':'stroke','stroke-linejoin':'round'});nameNode.textContent=name;node.append(nameNode);target.append(node);return node;
 }
 const basinColors=['#c9dfd7','#d9d2e6','#e2d7b4','#c8dae8','#e5cfc3','#d4ddb8','#c7e0df','#e5d1d9','#d5d8b8'];
 function inGeometry(point:readonly number[],geometry:Row):boolean {
  const inRing=(ring:number[][])=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.some((rings:number[][][])=>inRing(rings[0])&&!rings.slice(1).some(inRing));
 }
 const setup=(key:string)=>{
  if(key==='elevation')return {base:withBase('/assets/atlas/africa-elevation-500m-v1/'),family:'physical',id:key};
  if(['climate','terrain'].includes(key))return {base:withBase('/assets/atlas/africa-physical-v1/'),family:'physical',id:key};
  if(['ethnicity','religion'].includes(key))return {base:withBase('/assets/atlas/africa-settlements-v1/'),family:'social',id:key};
  if(key==='distribution')return {base:withBase('/assets/atlas/africa-population-v1/'),family:'population',id:'population'};
  if(key.startsWith('crop-'))return {base:withBase('/assets/atlas/africa-crops-v1/'),family:'crops',id:key.slice(5)};
  if(key.startsWith('livestock-'))return {base:withBase('/assets/atlas/africa-livestock-v1/'),family:'livestock',id:key.slice(10)};
  if(key==='water-rain')return null;
  if(key.startsWith('water-'))return {base:withBase('/assets/atlas/africa-water-v1/'),family:'water',id:key==='water-basin'?'basins':'rivers'};
  return null;
 };
 function renderOne(state:State,mode:'original'|'presence'|'positive'|'zero'='original',borders=true):AfricaLayerView|null {
  const key=africaActualLayerKey(state),config=setup(key);currentKey=key;
  const outlineSelection=['climate','elevation','distribution'].includes(key);
  if(['terrain','water-rain','water-groundwater'].includes(key)){
   const unavailable=key==='terrain'?{title:'地形の分類',scope:'地形分類の分布資料は未収録です。標高・等高線は地形の成因や地形分類を表す資料ではありません。標高は「標高」から確認できます。'}:key==='water-rain'?{title:'年降水量の分布',scope:'年降水量の連続分布と250 mm間隔の区分は未収録です。国平均の降水量で地図を塗り替えず、取得済みの気候区分とは別の未収録項目として示します。'}:{title:'地下水の分布',scope:africaHydrologyOverview.river.groundwater};
   group.replaceChildren();lastPaint='';return {key,guide:true,ready:true,loading:false,error:'',title:unavailable.title,period:'未収録',unit:'資料未収録',scope:unavailable.scope,method:'未収録の分布を国別平均・隣接地点・別の指標から補完しません。',sourceUrl:'',sourceLabel:'',legend:[],takeaway:unavailable.scope,description:unavailable.scope};
  }
  if(key==='ethnicity'||key==='religion'){const guide=africaCultureGuides[key];group.replaceChildren();lastPaint='';return {key,guide:true,ready:true,loading:false,error:'',title:guide.title,period:'2021年公開版',unit:'資料案内（分布は未配信）',scope:guide.scope,method:africaCultureGuideReason,sourceUrl:guide.source.url,sourceLabel:guide.source.label,legend:[],takeaway:guide.description,description:africaCultureGuideReason};}
  if(!config){group.replaceChildren();lastPaint='';return null;}
  const manifestResult=request(config.base+'manifest.json');
  const empty: AfricaLayerView={key,ready:false,loading:!!manifestResult.promise,error:manifestResult.error??'',title:({climate:'気候区分',terrain:'標高区分と等高線',elevation:'標高',ethnicity:'掲載集団の居住範囲',religion:'掲載集団の宗教的特徴',distribution:'人口の格子分布','water-rain':'降水量の分布','water-river':'河川・湖の中心線','water-basin':'収録集水区の区画'} as Row)[key]??key,period:'',unit:'',scope:'分布データを読み込んでいます。',method:'',sourceUrl:'',sourceLabel:'',legend:[],takeaway:'',description:''};
  const manifest=manifestResult.value;if(!manifest){group.replaceChildren();lastPaint='';return empty;}
  const layer:Row=config.family==='social'?manifest.regions?.africa?.[config.id]:manifest.layers?.[config.id]??(config.family==='population'?manifest.population??manifest:{});
  if(!layer||!Object.keys(layer).length){group.replaceChildren();return {...empty,loading:false,error:'この分布は配信対象に含まれていません。'};}
  const rows:Row[]=layer.categories??layer.classes??layer.legend??[];
  const categories=config.family==='social'&&key==='ethnicity'?rows.filter(row=>row.id==='shared'||row.sourceCountries?.includes(state.place)):rows;
  const legend:AfricaLayerKey[]=categories.map(row=>({id:text(row.id),label:label(row),color:text(row.color,'#5b7c77'),code:row.code,description:text(row.description)}));
  if(!legend.length&&layer.breaks){const colors=layer.colors??[];for(let i=0;i<colors.length;i++)legend.push({id:String(i),label:i===0?`${layer.breaks[0]}未満`:i===colors.length-1?`${layer.breaks.at(-1)}以上`:`${layer.breaks[i-1]}〜${layer.breaks[i]}未満`,color:colors[i]});}
  const source=layer.source??manifest.sources?.[config.id]??manifest.source??{};
  const rawPeriod=text(layer.period??source.period??layer.sourcePeriod??manifest.period??manifest.year);
  const period=rawPeriod.includes('ETOPO 2022')?'ETOPO 2022版（観測年は複数）':rawPeriod;
  const scope=config.family==='social'?`GeoEPR掲載の政治的に関連する集団の事例です。全住民の分布・構成比ではありません。${note(layer.unlisted)}`:note(layer.scope??layer.limitations??manifest.scope??manifest.limitations,'国の平均ではなく、出典に基づく空間分布です。');
  const input=config.family==='livestock'?layer.countryInputs?.[state.place]:undefined;
  const inputMethod=config.family==='livestock'?` 選択国の入力統計年：${input?.censusYear??'未記載'}。${input?.averageSpatialResolutionKm!==null&&input?.averageSpatialResolutionKm!==undefined?`元統計の平均空間解像度：約${input.averageSpatialResolutionKm} km（表示格子の5分角とは別）。`:''}${input?.inputSource?`入力統計の機関：${input.inputSource}。`:''}`:'';
  const view: AfricaLayerView={...empty,title:text(layer.title,empty.title),period,unit:key==='climate'?'気候区分':key==='terrain'?'m（標高区分・等高線）':text(layer.unit??source.unit),scope,method:note(layer.method??manifest.method)+inputMethod,sourceUrl:text(layer.sourceUrl??source.url??source.sourceUrl??manifest.sources?.[0]?.page??manifest.sources?.[0]?.url),sourceLabel:text(layer.sourceLabel??source.label??source.name??source.publisher??layer.publisher,'分布の原典・加工方法'),legend,loading:false,error:'',takeaway:text(layer.takeaway),description:text(layer.description??layer.definition)};
  const file=layer.file??layer.contours??layer.geometry??(typeof layer.geojson==='string'?layer.geojson:undefined);
  const data=file?request(config.base+file):null;
  const grid=layer.grid?request(config.base+layer.grid,true):null;
  if(data?.error||grid?.error){const failed={...view,error:data?.error??grid?.error??'',ready:false};viewCache.set(key,{manifest,layer,base:config.base,view:failed});return failed;}
  const ready=!!layer.image||!!data?.value;
  const output={...view,ready,loading:!!data?.promise||!!grid?.promise};
  viewCache.set(key,{manifest,layer,base:config.base,view:output,grid:grid?.value});
  const mapLayout=mapMetrics(),basinId=(state as State & {basin?:string}).basin??'',cityId=(state as State & {city?:string}).city??'';
  const paint=[key,state.place,state.compare,state.layerClass,state.river,basinId,cityId,state.overview,file,ready,data?.value?'loaded':'',grid?.value?'grid':'',layer.image,mode,borders,mapLayout.viewport.join(','),mapLayout.scale.toFixed(3)].join('|');
  if(paint!==lastPaint){
   const focusedRiverFeature=group.contains(document.activeElement)?document.activeElement?.getAttribute('data-africa-river-hit-feature'):null;
   const focusedMapLabel=group.contains(document.activeElement)?document.activeElement?.getAttribute('data-africa-map-focus'):null;
   group.replaceChildren();lastPaint=paint;
   if(layer.image){const bounds=layer.bounds??manifest.bounds??[-27,-36,64,39],[x,y]=projectAfrica([bounds[0],bounds[3]]),[right,bottom]=projectAfrica([bounds[2],bounds[1]]);let href=config.base+layer.image;
    if((state.layerClass&&!outlineSelection||mode!=='original')&&grid?.value){const rasterId=[key,state.layerClass,mode].join('|');href=rasterCache.get(rasterId)??'';if(!href){const width=layer.width??manifest.width,height=layer.height??manifest.height,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(context){const pixels=context.createImageData(width,height),bytes=grid.value as Uint8Array,dataView=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let index=0;index<width*height;index++){const value=layer.encoding?.includes('float32')?dataView.getFloat32(index*4,true):layer.encoding?.includes('int16')?dataView.getInt16(index*2,true):bytes[index];if(value===layer.noData||mode==='zero'&&value!==0||mode!=='original'&&mode!=='zero'&&value<=0)continue;const category=africaRasterCategory(value,layer);if(!category||state.layerClass&&String(category.id)!==state.layerClass)continue;const color=parseInt((mode==='presence'?africaCommodityColor(key):category.color).replace('#',''),16);pixels.data.set([(color>>16)&255,(color>>8)&255,color&255,255],index*4);}context.putImageData(pixels,0,0);href=canvas.toDataURL('image/png');rasterCache.set(rasterId,href);}}}
    // A positive-only layer must wait for its native grid; the source PNG has opaque zero cells.
    if(mode==='original'||grid?.value)
    group.append(svg('image',{href,x,y,width:right-x,height:bottom-y,'preserveAspectRatio':'none','pointer-events':'none','data-africa-raster':key}));}
   const riverHits:SVGElement[]=[];
   if(data?.value){
    const collection=data.value.features??[],ids=new Set(categories.map(row=>text(row.id)));
    for(const feature of collection as Feature[]){
     const props=feature.properties??{},id=text(props.categoryId??props.classId??props.id);
     if(config.family==='social'&&key==='ethnicity'&&!ids.has(id))continue;
     if(state.layerClass&&!layer.vectorBands&&config.family!=='water'&&key!=='terrain'&&categories.length!==1&&id!==state.layerClass&&props.id!==state.layerClass)continue;
     let d=paths.get(feature);if(!d){d=africaLayerPath(feature.geometry);paths.set(feature,d);}if(!d)continue;
     const line=/LineString/.test(feature.geometry.type),boundary=config.id==='basins';
     const contour=layer.vectorBands&&props.kind==='contour',band=layer.vectorBands&&props.kind==='band';
     const river=key==='water-river'?africaHydrologyRiverForFeature(feature):undefined,selected=!!river&&river.id===state.river;
     const basinIndex=boundary?africaHydrologyBasinRelations.findIndex(relation=>relation.basinId===id):-1,selectedBasin=boundary&&id===basinId,relatedBasin=basinIndex>=0?africaHydrologyBasinRelations[basinIndex]:undefined;
     const color=contour?'#875d40':selected?africaRiverDisplayColors.selected:river?africaRiverDisplayColors.named:key==='water-river'?africaRiverDisplayColors.base:text(props.color,categories.find(row=>text(row.id)===id)?.color??(key==='terrain'?'#655449':categories.length===1?categories[0].color:'#447f9d'));
     const path=svg('path',{d,fill:boundary?relatedBasin?basinColors[basinIndex]:'none':line?'none':color,'fill-opacity':1,stroke:boundary?selectedBasin?'#165a80':relatedBasin?'#718f91':'#becbc8':band?'none':line?color:'#ffffff','stroke-width':boundary?selectedBasin?2.6:relatedBasin?1:.45:contour?props.major?1.15:.55:selected?3.2:river?1.8:line?1:.3,'vector-effect':'non-scaling-stroke','fill-rule':'evenodd','data-africa-layer-feature':text(props.id,id),'pointer-events':'none'});
     if(contour)path.setAttribute('data-africa-elevation-contour',String(props.elevationM));
     if(band)path.setAttribute('data-africa-elevation-band',id);
     if(relatedBasin){path.setAttribute('data-africa-basin',id);path.setAttribute('data-africa-basin-feature',id);path.setAttribute('pointer-events','visiblePainted');path.setAttribute('role','button');path.setAttribute('tabindex','0');path.setAttribute('aria-label',relatedBasin.label+'を読む');path.setAttribute('aria-pressed',String(selectedBasin));path.setAttribute('data-africa-map-focus','basin-'+id);path.setAttribute('class','africa-basin-hit');}
     if(river){path.setAttribute('data-africa-river-feature',river.id);path.setAttribute('class',`africa-river-path${selected?' is-selected':''}`);}
     const title=svg('title',{});title.textContent=river?.label??label(props);path.append(title);group.append(path);
     if(river){
      // The hit target follows the same source segments, including every gap.
      // Its width is an interaction aid and does not encode river width or flow.
      const hit=svg('path',{d,fill:'none',stroke:'transparent','stroke-width':14,'vector-effect':'non-scaling-stroke','pointer-events':'stroke','data-africa-river':river.id,'data-africa-river-hit-feature':text(props.id,id),class:`africa-river-hit${selected?' is-selected':''}`,tabindex:0,role:'button','aria-label':`${river.label}を読む`,'aria-pressed':selected});
      riverHits.push(hit);
     }
    }
   }
   if(layer.vectorBands&&state.layerClass&&data?.value){
    const feature=data.value.features.find((row:Feature)=>row.properties.kind==='band'&&row.properties.id===state.layerClass);
    if(feature){const outline=svg('g',{'data-africa-class-outline':state.layerClass,'data-africa-outline-layer':key,'pointer-events':'none','aria-hidden':'true'});
     for(const [stroke,width]of [['#ffffff',2.5],['#183c4a',1]] as const)outline.append(svg('path',{d:africaLayerPath(feature.geometry),fill:'none',stroke,'stroke-width':width,'vector-effect':'non-scaling-stroke'}));group.append(outline);}
   }
   if(outlineSelection&&!layer.vectorBands&&state.layerClass&&grid?.value){
    const outlineKey=[key,state.layerClass].join('|');let d=outlineCache.get(outlineKey);
    if(d===undefined){d=africaGridClassOutline(grid.value,{...manifest,...layer},state.layerClass);outlineCache.set(outlineKey,d);}
    if(d){const outline=svg('g',{'data-africa-class-outline':state.layerClass,'data-africa-outline-layer':key,'pointer-events':'none','aria-hidden':'true'});
     for(const [stroke,width]of [['#ffffff',2.5],['#183c4a',1]] as const)outline.append(svg('path',{d,fill:'none',stroke,'stroke-width':width,'vector-effect':'non-scaling-stroke','stroke-linejoin':'round','stroke-linecap':'round'}));
     group.append(outline);
    }
   }
   if(ready&&borders)paintBorders(state,group);
   group.append(...riverHits);
   const labelBoxes:LabelBox[]=[],inside=(coordinates:readonly number[])=>{const [x,y]=projectAfrica([...coordinates]);return x>=mapLayout.viewport[0]&&x<=mapLayout.viewport[0]+mapLayout.viewport[2]&&y>=mapLayout.viewport[1]&&y<=mapLayout.viewport[1]+mapLayout.viewport[3];};
   if(key==='water-river'&&data?.value)for(const river of africaHydrologyRivers){
    const candidate=river.labelCandidates.find(row=>inside(row.coordinates));if(!candidate)continue;
    namedMapLabel(group,river.label,candidate.coordinates,river.id===state.river?africaRiverDisplayColors.selected:africaRiverDisplayColors.named,{'data-africa-river':river.id,'data-africa-river-label':river.id,'data-africa-map-focus':'river-'+river.id,'data-africa-label-source-feature':candidate.featureId,'data-africa-label-source-vertex':candidate.vertexIndex,role:'button',tabindex:0,'aria-label':river.label+'を読む','aria-pressed':String(river.id===state.river),class:'africa-map-pick-label'},labelBoxes);
   }
   if(key==='water-basin'&&data?.value)for(const relation of africaHydrologyBasinRelations){
    const feature=data.value.features.find((item:Feature)=>item.properties.id===relation.basinId),river=africaHydrologyRivers.find(item=>item.id===relation.riverId);if(!feature||!river)continue;
    const candidate=river.labelCandidates.find(row=>inside(row.coordinates)&&inGeometry(row.coordinates,feature.geometry));if(!candidate)continue;
    namedMapLabel(group,river.label+'対応区画',candidate.coordinates,'#385d66',{'data-africa-basin':relation.basinId,'data-africa-basin-label':relation.basinId,'data-africa-map-focus':'basin-label-'+relation.basinId,role:'button',tabindex:0,'aria-label':relation.label+'を読む','aria-pressed':String(relation.basinId===basinId),class:'africa-map-pick-label'},labelBoxes);
   }
   if(key==='climate')for(const city of africaClimateCities){
    if(!inside(city.coordinates))continue;const [cx,cy]=projectAfrica(city.coordinates),selected=city.id===cityId;
    const marker=svg('g',{'data-africa-city':city.id,'data-africa-city-point':city.id,'data-africa-map-focus':'city-point-'+city.id,role:'button',tabindex:0,'aria-label':city.name+'の雨温図を読む','aria-pressed':String(selected),class:'africa-map-pick-label'});
    marker.append(svg('circle',{cx,cy,r:10*mapLayout.scale,fill:'transparent'}),svg('circle',{cx,cy,r:(selected?5:4)*mapLayout.scale,fill:'#334e68',stroke:'#fff','stroke-width':2,'vector-effect':'non-scaling-stroke'}));group.append(marker);
    namedMapLabel(group,city.name,city.coordinates,'#334e68',{'data-africa-city':city.id,'data-africa-city-label':city.id,'data-africa-map-focus':'city-label-'+city.id,role:'button',tabindex:0,'aria-label':city.name+'の雨温図を読む','aria-pressed':String(selected),class:'africa-map-pick-label'},labelBoxes);
   }
   // Each caption is anchored inside a verified class cell in the published grid.
   // City labels take priority in the collision list, and captions do not select classes.
   if(key==='climate'&&grid?.value){
    for(const item of africaClimateClassAnchors){if(africaGridValue(grid.value,layer,item.coordinates[0],item.coordinates[1])!==item.id||!inside(item.coordinates))continue;
     namedMapLabel(group,item.label,item.coordinates,'#183d4a',{'data-africa-climate-map-label':String(item.id),'aria-hidden':'true','pointer-events':'none',class:'africa-climate-map-label'},labelBoxes);
    }
   }
   if(focusedMapLabel)group.querySelector<SVGElement>(`[data-africa-map-focus="${focusedMapLabel}"]`)?.focus({preventScroll:true});
   else if(focusedRiverFeature)riverHits.find(hit=>hit.getAttribute('data-africa-river-hit-feature')===focusedRiverFeature)?.focus({preventScroll:true});
  }
  if(key==='water-river'){output.title=africaHydrologyOverview.river.title;output.scope=africaHydrologyOverview.river.scope;output.description=africaHydrologyOverview.river.reading;output.method+=' '+africaHydrologyOverview.river.groundwater;output.legend=[{id:'river-base',label:'収録された河道',color:africaRiverDisplayColors.base},{id:'river-named',label:'名前から選べる9河川',color:africaRiverDisplayColors.named},{id:'river-selected',label:'選択した河川',color:africaRiverDisplayColors.selected}];}
  if(key==='water-basin'){output.title=africaHydrologyOverview.basin.title;output.scope=africaHydrologyOverview.basin.scope;output.description=africaHydrologyOverview.basin.reading;output.legend=africaHydrologyBasinRelations.map((relation,index)=>({id:relation.basinId,label:relation.riverLabel+'との対応区画',color:basinColors[index]}));}
  if(key==='climate')output.scope+=' '+africaClimateCityCoverage;
  return output;
 }
 function paintBorders(state:State,target:SVGGElement){for(const original of root.querySelectorAll<SVGPathElement>('[data-country-path]'))target.append(svg('path',{d:original.getAttribute('d')??'',fill:'none',stroke:original.dataset.countryPath===state.place?'#b13e30':original.dataset.countryPath===state.compare?'#364c91':'#708e91','stroke-width':original.dataset.countryPath===state.place||original.dataset.countryPath===state.compare?2:.65,'stroke-dasharray':original.dataset.countryPath===state.compare?'5 3':'','vector-effect':'non-scaling-stroke','pointer-events':'none'}));}
 function agriPick(node:SVGElement,key:string,focusId:string,selected:boolean,labelText:string){
  node.setAttribute('data-africa-agri-pick',key);node.setAttribute('data-africa-agri-focus',focusId);
  node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',labelText+'を読む');node.setAttribute('aria-pressed',String(selected));
  node.setAttribute('class','africa-agri-pick');node.style.cursor='pointer';
 }
 function featurePath(feature:Feature):string {let path=paths.get(feature);if(path===undefined){path=africaLayerPath(feature.geometry);paths.set(feature,path);}return path;}
 function render(state:State):AfricaLayerView|null {
  const agriculture=state.field==='agriculture'&&(state.topic==='farming'||state.topic==='livestock');
  if(!agriculture){if(agriMode){baseGroup.replaceChildren();agriGroups.clear();lastPaint='';lastAgriPaint='';}agriMode=false;visibleKeys=[];group=baseGroup;return renderOne(state);}
  if(!agriMode){baseGroup.replaceChildren();lastPaint='';lastAgriPaint='';}agriMode=true;
  const focused=africaAgriFocusedLayer(state).replace(/-production$/,'-harvested'),active:string[]=africaAgriVisibleLayers(state).map(key=>key.replace(/-production$/,'-harvested'));visibleKeys=active;currentKey=focused;
  const base=withBase('/assets/atlas/africa-agriculture-distribution-v1/'),manifestResult=request(base+'manifest.json'),distribution=manifestResult.value as Row|undefined;
  const keys=['crop-maize-harvested','crop-rice-harvested','crop-wheat-harvested','crop-cassava-harvested','livestock-cattle','livestock-goats','livestock-sheep'];
  const empty:AfricaLayerView={key:focused,ready:false,loading:!!manifestResult.promise,error:manifestResult.error??'',title:'作物と家畜の分布',period:'2020年基準のモデル',unit:'品目ごとの元の単位',scope:'分布データを読み込んでいます。',method:'',sourceUrl:'',sourceLabel:'',legend:[],takeaway:'',description:''};
  if(!distribution){baseGroup.replaceChildren();lastAgriPaint='';return empty;}
  const assets=new Map<string,{contours:Loaded;bands:Loaded|null;grid:Loaded;threshold:number}>(),views:AfricaLayerView[]=[];
  for(const key of keys){
   const layer=distribution.layers[key],contours=request(base+layer.contoursFile,false,distribution.parts?.[layer.contoursFile]),bands=!state.overview&&key===focused?request(base+layer.file,false,distribution.parts?.[layer.file]):null,grid=request(base+layer.grid,true);
   const originalResult=request(base+layer.sourceManifest),original=originalResult.value?.layers?.[layer.sourceLayer],input=key.startsWith('livestock-')?original?.countryInputs?.[state.place]:undefined;
   const threshold=Number(layer.sourceThresholds[Math.min(2,layer.sourceThresholds.length-1)]);assets.set(key,{contours,bands,grid,threshold});
   const ready=!!contours.value&&!!grid.value&&(!bands||!!bands.value),error=contours.error??bands?.error??grid.error??originalResult.error??'';
   const view:AfricaLayerView={key,ready,loading:!!contours.promise||!!bands?.promise||!!grid.promise||!!originalResult.promise,error,title:layer.title,period:layer.period,unit:layer.unit,scope:layer.scope,method:[layer.method,layer.zeroDisplay,layer.queryDisplayDifference,note(original?.limitations??originalResult.value?.limitations),input?`選択国の入力統計年：${input.censusYear??'未記載'}。元統計の平均空間解像度：${input.averageSpatialResolutionKm??'未記載'} km。${input.inputSource??''}`:''].filter(Boolean).join(' '),sourceUrl:layer.sourceUrl,sourceLabel:layer.sourceLabel,legend:layer.legend.map((row:Row)=>({id:text(row.id),label:label(row),color:row.color})),takeaway:layer.takeaway,description:layer.description};
   viewCache.set(key,{manifest:distribution,layer,base,view,grid:grid.value});views.push(view);
  }
  const selected=views.find(view=>view.key===focused)??views[0];
  const visibleLayers=views.filter(view=>active.includes(view.key)).map(view=>{const threshold=assets.get(view.key)!.threshold,unit=view.key.startsWith('crop-')?'ha / 元5分角セル':'頭/km²';return {key:view.key,title:distribution.layers[view.key].label,unit:`輪郭：${threshold} ${unit}`,threshold,scope:`元凡例にある${threshold} ${unit}の等値線を表示。新しい分位・抽出閾値は設定していません。`,color:africaCommodityColor(view.key),ready:view.ready,loading:view.loading,error:view.error,period:view.period,sourceUrl:view.sourceUrl,sourceLabel:view.sourceLabel};});
  const overviewLegend=visibleLayers.map(view=>({id:view.key,label:view.title,color:view.color,description:view.scope}));
  const thresholdDetails=visibleLayers.map(view=>`${view.title}：${view.unit}`).join('。');
  const result:AfricaLayerView={...selected,ready:visibleLayers.length>0&&visibleLayers.every(view=>view.ready),error:selected.error||visibleLayers.find(view=>view.error)?.error||'',selectedVisible:active.includes(focused),loading:visibleLayers.some(view=>view.loading),visibleLayers,legend:state.overview?overviewLegend:selected.legend,scope:state.overview?'作物・家畜の元凡例にある等値線を品目別の色で示します。作物は100 ha/元5分角セル、家畜は50 頭/km²。線がない場所を生産なしとは判断しません。':selected.scope,method:[thresholdDetails,selected.method,...distribution.limitations,'背景：NOAA ETOPO 2022の既存標高画像を彩度0・不透明度22%で表示。背景は農畜産の数値や区分の算定には使いません。https://www.ncei.noaa.gov/products/etopo-global-relief-model'].join(' ')};
  if(state.overview){result.title='作物と家畜の分布';result.period='作物・家畜とも2020年基準のモデル';result.unit='作物：ha / 元5分角セル・家畜：頭/km²';result.sourceUrl='';result.sourceLabel='';result.takeaway='品目別の輪郭から、作物と家畜の地域差を読む';result.description='各品目の線や名前を選ぶと、その品目の数量区分を色の濃淡で読みます。他の品目は輪郭を残して位置を見比べられます。';}
  const {viewport,scale:labelScale}=mapMetrics();
  const assetStamp=keys.map(key=>{const item=assets.get(key)!;return `${key}:${!!item.contours.value}:${!!item.bands?.value}`;}).join('|');
  const paint=[focused,state.overview,state.layerClass,active.join(','),state.place,state.region,state.zoom,labelScale.toFixed(3),viewport.join(','),assetStamp].join('|');
  if(paint===lastAgriPaint)return result;lastAgriPaint=paint;
  const focusedElement=baseGroup.contains(document.activeElement)?document.activeElement?.getAttribute('data-africa-agri-focus'):null;
  baseGroup.replaceChildren();agriGroups.clear();
  const defs=svg('defs',{}),filter=svg('filter',{id:'africa-agri-neutral-relief'}),missing=svg('pattern',{id:'africa-agri-unavailable',width:8*labelScale,height:8*labelScale,patternUnits:'userSpaceOnUse'});
  filter.append(svg('feColorMatrix',{type:'saturate',values:0}));missing.append(svg('rect',{width:8*labelScale,height:8*labelScale,fill:'#f8f6ef'}),svg('path',{d:`M0 ${8*labelScale}L${8*labelScale} 0`,stroke:'#d2d8d5','stroke-width':.7*labelScale}));defs.append(filter,missing);baseGroup.append(defs);
  const background=svg('g',{'pointer-events':'none','aria-hidden':'true'});
  for(const original of root.querySelectorAll<SVGPathElement>('[data-country-path]'))background.append(svg('path',{d:original.getAttribute('d')??'',fill:state.overview?'#f5f2e9':'url(#africa-agri-unavailable)','fill-rule':'evenodd'}));
  background.append(svg('image',{href:withBase('/assets/atlas/africa-physical-v1/elevation.png'),x:0,y:0,width:africaWidth,height:africaHeight,preserveAspectRatio:'none',filter:'url(#africa-agri-neutral-relief)',opacity:.22}));baseGroup.append(background);
  // Only the selected commodity contributes colour faces. Supplied zeros are
  // drawn after positive faces; absent geometry remains visibly distinct.
  if(!state.overview&&active.includes(focused)){
   const data=assets.get(focused)!.bands?.value;
   if(data){const layer=svg('g',{'data-africa-agri-bands':focused});
    for(const feature of data.features as Feature[])if(feature.properties.kind==='band'||feature.properties.kind==='zero'){
     const props=feature.properties,path=svg('path',{d:featurePath(feature),fill:props.color??distribution.layers[focused].zeroColor,stroke:'none','fill-rule':'evenodd','pointer-events':'none','data-africa-agri-band':text(props.classId??props.id),'data-africa-agri-band-kind':props.kind});layer.append(path);
    }baseGroup.append(layer);
   }
  }
  const labelJobs:{key:string;anchor:Row;index:number;livestock:boolean}[]=[];
  for(const key of keys){
   const layer=distribution.layers[key],asset=assets.get(key)!,selectedNow=!state.overview&&key===focused,livestock=key.startsWith('livestock-');
   const node=svg('g',{'data-africa-commodity-layer':key,'data-africa-contour-threshold':asset.threshold}) as SVGGElement;node.style.display=active.includes(key)?'':'none';node.style.opacity=!state.overview&&!selectedNow?livestock&&focused.startsWith('crop-')?'.25':'.4':'1';agriGroups.set(key,node);
   const contours=(asset.contours.value?.features??[]) as Feature[];
   const shown=selectedNow?contours:contours.filter(feature=>Number(feature.properties.value)===asset.threshold);
   const contourGroup=svg('g',{'data-africa-agri-distribution':key,...(selectedNow?{'data-africa-agri-footprint':key}:{})});contourGroup.style.display=node.style.display;contourGroup.style.opacity=node.style.opacity;
   for(const feature of shown){const path=svg('path',{d:featurePath(feature),fill:'none',stroke:africaCommodityColor(key),'stroke-width':selectedNow?1.05:.8,'vector-effect':'non-scaling-stroke','stroke-linejoin':'round','data-africa-agri-contour':String(feature.properties.value),'pointer-events':'stroke'});agriPick(path,key,key+'-'+text(feature.properties.id),selectedNow,layer.label);contourGroup.append(path);}baseGroup.append(contourGroup);
   // Labels use stored contour vertices, with no one-degree summaries or new
   // production locations. Prefer long visible segments, then retain spacing.
   const representative=contours.find(feature=>Number(feature.properties.value)===asset.threshold),lines=representative?.geometry.type==='MultiLineString'?representative.geometry.coordinates:representative?.geometry.type==='LineString'?[representative.geometry.coordinates]:[];
   const inside=(p:number[])=>{const [x,y]=projectAfrica(p);return x>=viewport[0]&&x<=viewport[0]+viewport[2]&&y>=viewport[1]&&y<=viewport[1]+viewport[3];};
   const candidates=(lines as number[][][]).map(line=>({line,visible:line.filter(inside)})).filter(row=>row.visible.length).sort((a,b)=>b.visible.length-a.visible.length);
   const anchors:number[][]=[];for(const candidate of candidates){const point=candidate.visible[Math.floor(candidate.visible.length/2)];if(anchors.every(other=>Math.hypot(point[0]-other[0],point[1]-other[1])>=14)){anchors.push(point);if(anchors.length>=(livestock?3:2))break;}}
   anchors.forEach((point,index)=>labelJobs.push({key,anchor:{lon:point[0],lat:point[1]},index,livestock}));
  }
  paintBorders(state,baseGroup);
  if(!state.overview&&active.includes(focused)&&state.layerClass){
   const feature=(assets.get(focused)!.bands?.value?.features??[]).find((item:Feature)=>(item.properties.kind==='band'||item.properties.kind==='zero')&&text(item.properties.classId??item.properties.id)===state.layerClass);
   if(feature){const outline=svg('g',{'data-africa-class-outline':state.layerClass,'data-africa-outline-layer':focused,'pointer-events':'none','aria-hidden':'true'});
    for(const [stroke,width]of [['#fffdf8',3],['#253f49',1.35]] as const)outline.append(svg('path',{d:featurePath(feature),fill:'none',stroke,'stroke-width':width,'vector-effect':'non-scaling-stroke','stroke-linejoin':'round','stroke-linecap':'round'}));baseGroup.append(outline);
   }
  }
  // Labels carry exact stored contour vertices. Short leaders permit legible names
  // without implying that the displaced label is itself a production location.
  const occupied:{x:number;y:number;w:number;h:number}[]=[];
  for(const job of labelJobs){
   const {key,anchor,index,livestock}=job,layer=distribution.layers[key],node=agriGroups.get(key)!,selectedNow=!state.overview&&key===focused;
   const [ax,ay]=projectAfrica([anchor.lon,anchor.lat]),font=14*labelScale,iconScale=.55*labelScale,iconWidth=livestock?22*labelScale:0,width=layer.label.length*font+iconWidth+5*labelScale,height=19*labelScale,gap=5*labelScale;
   const candidates=[[gap,-12*labelScale],[gap,17*labelScale],[-width-gap,-12*labelScale],[-width-gap,17*labelScale],[gap,-35*labelScale],[-width-gap,40*labelScale],[gap,40*labelScale],[-width-gap,-35*labelScale],[gap,-58*labelScale],[-width-gap,63*labelScale]];
   const visibleAnchor=ax>=viewport[0]&&ax<=viewport[0]+viewport[2]&&ay>=viewport[1]&&ay<=viewport[1]+viewport[3];
   const minX=viewport[0]+4*labelScale,maxX=viewport[0]+viewport[2]-width-4*labelScale,minY=viewport[1]+height,maxY=viewport[1]+viewport[3]-6*labelScale;
   let position=candidates.map(([dx,dy])=>({x:Math.max(minX,Math.min(maxX,ax+dx)),y:Math.max(minY,Math.min(maxY,ay+dy)),w:width,h:height})).find(box=>!occupied.some(other=>box.x<other.x+other.w+gap&&box.x+box.w+gap>other.x&&box.y-height<other.y+gap&&box.y+gap>other.y-other.h));
   position??={x:Math.max(minX,Math.min(maxX,ax+gap)),y:Math.min(maxY,ay+86*labelScale),w:width,h:height};if(active.includes(key)&&visibleAnchor)occupied.push(position);
   const labelGroup=svg('g',{'data-africa-agri-label':key,'data-africa-agri-label-anchor':`${anchor.lon},${anchor.lat}`});agriPick(labelGroup,key,`${key}-label-${index}`,selectedNow,layer.label);
   if(!visibleAnchor)labelGroup.setAttribute('display','none');
   labelGroup.append(svg('path',{d:`M${ax},${ay}L${Math.max(position.x,Math.min(position.x+width,ax))},${position.y-5*labelScale}`,fill:'none',stroke:africaCommodityColor(key),'stroke-width':1,'vector-effect':'non-scaling-stroke','pointer-events':'none'}));
   labelGroup.append(svg('circle',{cx:ax,cy:ay,r:2*labelScale,fill:africaCommodityColor(key),stroke:'#fff','stroke-width':1,'vector-effect':'non-scaling-stroke','pointer-events':'none'}));
   if(livestock){const name=key.slice(10),icon=svg('g',{transform:`translate(${position.x},${position.y-12*labelScale}) scale(${iconScale})`,'data-africa-agri-glyph':name,fill:africaCommodityColor(key),stroke:africaCommodityColor(key),'stroke-width':1.6,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'});
    icon.append(svg('path',{d:name==='sheep'?'M5 15C0 12 3 5 8 7C9 1 15 2 17 6C22 2 28 5 27 11C33 12 29 19 25 19H8Z':name==='goats'?'M5 8H23L27 4L33 8L30 14H25L22 20H8Z':'M4 7H23L27 4L34 8L31 16H25L23 20H7Z'}));
    icon.append(svg('path',{d:'M8 18V27M21 18V27',fill:'none','stroke-width':2.5}));
    if(name==='goats')icon.append(svg('path',{d:'M28 5Q20 -5 29 -5M31 6Q27 -4 35 -4M31 13L29 19',fill:'none'}));
    if(name==='cattle')icon.append(svg('path',{d:'M27 5L23 0M31 6L35 1M4 8L0 3',fill:'none'}));labelGroup.append(icon);
   }
   const title=svg('text',{x:position.x+iconWidth,y:position.y,'font-size':font,'font-weight':selectedNow?800:700,fill:africaCommodityColor(key),stroke:'#fffdf8','stroke-width':3*labelScale,'paint-order':'stroke','stroke-linejoin':'round','data-africa-agri-label-text':key});title.textContent=layer.label;labelGroup.append(title);node.append(labelGroup);
  }
  baseGroup.append(...agriGroups.values());
  const contextPlace=africaAgriContextPlace(state.overview,focused,active,viewport);
  if(contextPlace){
   const [ax,ay]=projectAfrica(contextPlace.point),font=14*labelScale,width=contextPlace.name.length*font+5*labelScale,height=19*labelScale,gap=5*labelScale;
   const minX=viewport[0]+4*labelScale,maxX=viewport[0]+viewport[2]-width-4*labelScale,minY=viewport[1]+height,maxY=viewport[1]+viewport[3]-6*labelScale;
   // Use the same viewport bounds and occupied-label boxes as commodity names.
   // Additional rings make a country name yield to existing crop/animal labels.
   const candidates:number[][]=[];for(const offset of [-12,17,-35,40,-58,63,-81,86])candidates.push([gap,offset*labelScale],[-width-gap,offset*labelScale]);
   const position=maxX>=minX?candidates.map(([dx,dy])=>({x:Math.max(minX,Math.min(maxX,ax+dx)),y:Math.max(minY,Math.min(maxY,ay+dy)),w:width,h:height})).find(box=>!occupied.some(other=>box.x<other.x+other.w+gap&&box.x+box.w+gap>other.x&&box.y-height<other.y+gap&&box.y+gap>other.y-other.h)):undefined;
   if(position){
    const place=svg('g',{'data-africa-agri-place-label':contextPlace.code,'data-africa-agri-place-anchor':contextPlace.point.join(','),'pointer-events':'none','aria-label':`国名：${contextPlace.name}`});
    const note=svg('title',{});note.textContent='既存の国位置データによる地名案内。作物の生産地点を表す印ではありません。';place.append(note);
    place.append(svg('path',{d:`M${ax},${ay}L${Math.max(position.x,Math.min(position.x+width,ax))},${position.y-5*labelScale}`,fill:'none',stroke:'#53656a','stroke-width':1,'vector-effect':'non-scaling-stroke'}));
    const name=svg('text',{x:position.x,y:position.y,'font-size':font,'font-weight':600,fill:'#53656a',stroke:'#fffdf8','stroke-width':3*labelScale,'paint-order':'stroke','stroke-linejoin':'round','data-africa-agri-place-text':contextPlace.code});name.textContent=contextPlace.name;place.append(name);baseGroup.append(place);
   }
  }
  if(focusedElement)baseGroup.querySelector<SVGElement>(`[data-africa-agri-focus="${focusedElement}"]`)?.focus({preventScroll:true});
  return result;
 }
 function inspect(lon:number,lat:number):string {
  if(agriMode&&(visibleKeys.length!==1||visibleKeys[0]!==currentKey)){const readings=visibleKeys.map(key=>{const row=viewCache.get(key);if(!row?.grid)return `${row?.view.title??key}：${row?.view.error?'取得失敗。再読込できます':'読込中'}`;const value=africaGridValue(row.grid,{...row.manifest,...row.layer},lon,lat);return `${row.view.title}：${value===null?'値なし':`${africaGridValueLabel(value)} ${row.view.unit}`}`;});return readings.length?`${lon.toFixed(2)}°E / ${lat.toFixed(2)}°N（元の5分角格子・推定値、表示桁は丸め・数量は合算しません）：${readings.join(' ／ ')}`:'表示品目はすべてOFFです。読み解く品目の選択は保持しています。';}
  const current=viewCache.get(currentKey);if(!current)return 'この地点の分布値はまだ読み込まれていません。';
  const {layer,manifest,view,grid}=current;if(!grid)return '元資料の分類・範囲は凡例と出典で確認できます。';
  const value=africaGridValue(grid,{...manifest,...layer},lon,lat);if(value===null)return 'この表示格子は未収録です。';
  const category=layer.classes?view.legend.find(row=>Number(row.id)===value):undefined,model=currentKey.startsWith('crop-')||currentKey.startsWith('livestock-');return `${lon.toFixed(2)}°E / ${lat.toFixed(2)}°N：${category?`${category.code??''} ${category.label}`:`${africaGridValueLabel(value)} ${view.unit}`}（${model?'元の5分角格子・推定値、表示桁は丸め':'表示格子'}）`;
 }
 function retry(){for(const [url,result]of cache)if(result.error)cache.delete(url);lastPaint='';lastAgriPaint='';agriGroups.clear();agriMode=false;rasterCache.clear();outlineCache.clear();onReady();}
 return {render,inspect,retry};
}
