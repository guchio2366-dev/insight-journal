import {withBase} from '../lib/urls.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import type {State} from '../data/atlas/africa-atlas.ts';

type Row=Record<string,any>;
type Feature={type:string;geometry:Row;properties:Row};
export type AfricaLayerKey={id:string;label:string;color:string;code?:string;description?:string};
export type AfricaLayerView={key:string;ready:boolean;loading:boolean;error:string;title:string;period:string;unit:string;scope:string;method:string;sourceUrl:string;sourceLabel:string;legend:AfricaLayerKey[];takeaway:string;description:string};
type Loaded={value?:any;error?:string;promise?:Promise<void>};
const SVG='http://www.w3.org/2000/svg';
const text=(v:any,fallback=''):string=>typeof v==='string'?v:v===null||v===undefined?fallback:String(v);
const note=(v:any,fallback=''):string=>typeof v==='string'?v:Array.isArray(v)?v.map(item=>note(item)).filter(Boolean).join(' '):v&&typeof v==='object'?text(v.note??v.description??v.label,fallback):fallback;
const label=(r:Row)=>text(r.label??r.nameJa??r.name??r.code??r.id);
export function africaActualLayerKey(state:Pick<State,'field'|'topic'|'water'>):string {
 if(state.field==='nature')return state.topic==='water'?`water-${state.water}`:state.topic;
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
 return value===metadata.noData?null:value;
}
export function africaRasterCategory(value:number,layer:Row):{id:string;color:string}|null {
 if(value===layer.noData)return null;
 if(layer.breaks){const bucket=layer.breaks.findIndex((edge:number)=>value<edge),index=bucket<0?layer.colors.length-1:bucket;return {id:text(layer.legend?.[index]?.id,String(index)),color:layer.colors[index]};}
 const category=layer.classes?.find((row:Row)=>Number(row.id)===value);return category?{id:text(category.id),color:category.color}:null;
}

export function createAfricaLayerRenderer(root:HTMLElement,onReady:()=>void,fetcher:typeof fetch=fetch){
 const cache=new Map<string,Loaded>(),paths=new WeakMap<object,string>();
 const group=root.querySelector<SVGGElement>('[data-africa-actual-layer]')!;
 const viewCache=new Map<string,{manifest:Row;layer:Row;base:string;view:AfricaLayerView;grid?:Uint8Array}>();
 let currentKey='',lastPaint='';
 const notify=()=>{if(root.isConnected)onReady();};
 function request(url:string,binary=false):Loaded {
  const found=cache.get(url);if(found)return found;
  const loaded:Loaded={};cache.set(url,loaded);
  loaded.promise=(async()=>{try{const response=await fetcher(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);let bytes=new Uint8Array(await response.arrayBuffer());if(bytes[0]===31&&bytes[1]===139)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());loaded.value=binary?bytes:JSON.parse(new TextDecoder().decode(bytes));}catch(error){loaded.error=error instanceof Error?error.message:'取得失敗';}finally{loaded.promise=undefined;notify();}})();
  return loaded;
 }
 const svg=(tag:string,attrs:Row)=>{const node=document.createElementNS(SVG,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
 const setup=(key:string)=>{
  if(['climate','terrain','elevation'].includes(key))return {base:withBase('/assets/atlas/africa-physical-v1/'),family:'physical',id:key};
  if(['ethnicity','religion'].includes(key))return {base:withBase('/assets/atlas/africa-settlements-v1/'),family:'social',id:key};
  if(key==='distribution')return {base:withBase('/assets/atlas/africa-population-v1/'),family:'population',id:'population'};
  if(key==='water-rain')return null;
  if(key.startsWith('water-'))return {base:withBase('/assets/atlas/africa-water-v1/'),family:'water',id:key==='water-basin'?'basins':'rivers'};
  return null;
 };
 function render(state:State):AfricaLayerView|null {
  const key=africaActualLayerKey(state),config=setup(key);currentKey=key;
  if(!config||state.view==='statistics'){group.replaceChildren();lastPaint='';return null;}
  const manifestResult=request(config.base+'manifest.json');
  const empty: AfricaLayerView={key,ready:false,loading:!!manifestResult.promise,error:manifestResult.error??'',title:({climate:'気候区分',terrain:'標高区分と等高線',elevation:'標高',ethnicity:'掲載集団の居住範囲',religion:'掲載集団の宗教的特徴',distribution:'人口の格子分布','water-rain':'降水量の分布','water-river':'河川・湖の中心線','water-basin':'河川の流域'} as Row)[key]??key,period:'',unit:'',scope:'分布データを読み込んでいます。国別統計は下の比較欄で確認できます。',method:'',sourceUrl:'',sourceLabel:'',legend:[],takeaway:'',description:''};
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
  const view: AfricaLayerView={...empty,title:text(layer.title,empty.title),period,unit:key==='climate'?'気候区分':key==='terrain'?'m（標高区分・等高線）':text(layer.unit??source.unit),scope,method:note(layer.method??manifest.method),sourceUrl:text(layer.sourceUrl??source.url??source.sourceUrl??manifest.sources?.[0]?.page??manifest.sources?.[0]?.url),sourceLabel:text(layer.sourceLabel??source.label??source.name??source.publisher??layer.publisher,'分布の原典・加工方法'),legend,loading:false,error:'',takeaway:text(layer.takeaway),description:text(layer.description??layer.definition)};
  const file=layer.file??layer.contours??layer.geometry??(typeof layer.geojson==='string'?layer.geojson:undefined);
  const data=file?request(config.base+file):null;
  const grid=layer.grid?request(config.base+layer.grid,true):null;
  if(data?.error||grid?.error)return {...view,error:data?.error??grid?.error??'',ready:false};
  const ready=!!layer.image||!!data?.value;
  const output={...view,ready,loading:!!data?.promise||!!grid?.promise};
  viewCache.set(key,{manifest,layer,base:config.base,view:output,grid:grid?.value});
  const paint=[key,state.place,state.compare,state.layerClass,file,ready,data?.value?'loaded':'',grid?.value?'grid':'',layer.image].join('|');
  if(paint!==lastPaint){
   group.replaceChildren();lastPaint=paint;
   if(layer.image){const bounds=layer.bounds??manifest.bounds??[-27,-36,64,39],[x,y]=projectAfrica([bounds[0],bounds[3]]),[right,bottom]=projectAfrica([bounds[2],bounds[1]]);let href=config.base+layer.image;
    if(state.layerClass&&grid?.value){const width=layer.width??manifest.width,height=layer.height??manifest.height,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(context){const pixels=context.createImageData(width,height),bytes=grid.value as Uint8Array,dataView=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let index=0;index<width*height;index++){const value=layer.encoding?.includes('float32')?dataView.getFloat32(index*4,true):layer.encoding?.includes('int16')?dataView.getInt16(index*2,true):bytes[index];if(value===layer.noData)continue;const category=africaRasterCategory(value,layer);if(!category||String(category.id)!==state.layerClass)continue;const color=parseInt(category.color.replace('#',''),16);pixels.data.set([(color>>16)&255,(color>>8)&255,color&255,255],index*4);}context.putImageData(pixels,0,0);href=canvas.toDataURL('image/png');}}
    group.append(svg('image',{href,x,y,width:right-x,height:bottom-y,'preserveAspectRatio':'none','pointer-events':'none','data-africa-raster':key}));}
   if(data?.value){const collection=data.value.features??[];const ids=new Set(categories.map(row=>text(row.id)));for(const feature of collection as Feature[]){const props=feature.properties??{},id=text(props.categoryId??props.classId??props.id);if(config.family==='social'&&key==='ethnicity'&&!ids.has(id))continue;if(state.layerClass&&key!=='terrain'&&categories.length!==1&&id!==state.layerClass&&props.id!==state.layerClass)continue;let d=paths.get(feature);if(!d){d=africaLayerPath(feature.geometry);paths.set(feature,d);}if(!d)continue;const line=/LineString/.test(feature.geometry.type),boundary=config.id==='basins',color=text(props.color,categories.find(row=>text(row.id)===id)?.color??(key==='terrain'?'#655449':categories.length===1?categories[0].color:'#447f9d'));const path=svg('path',{d,fill:line||boundary?'none':color,'fill-opacity':1,stroke:line||boundary?color:'#ffffff', 'stroke-width':line||boundary?1.3:.3,'vector-effect':'non-scaling-stroke','fill-rule':'evenodd','data-africa-layer-feature':text(props.id,id),'pointer-events':'none'});const title=svg('title',{});title.textContent=label(props);path.append(title);group.append(path);}}
   if(ready)for(const original of root.querySelectorAll<SVGPathElement>('[data-country-path]'))group.append(svg('path',{d:original.getAttribute('d')??'',fill:'none',stroke:original.dataset.countryPath===state.place?'#b13e30':original.dataset.countryPath===state.compare?'#364c91':'#708e91','stroke-width':original.dataset.countryPath===state.place||original.dataset.countryPath===state.compare?2: .65,'stroke-dasharray':original.dataset.countryPath===state.compare?'5 3':'','vector-effect':'non-scaling-stroke','pointer-events':'none'}));
  }
  return output;
 }
 function inspect(lon:number,lat:number):string {
  const current=viewCache.get(currentKey);if(!current)return 'この地点の分布値はまだ読み込まれていません。';
  const {layer,manifest,view,grid}=current;if(!grid)return '元資料の分類・範囲は凡例と出典で確認できます。';
  const value=africaGridValue(grid,{...manifest,...layer},lon,lat);if(value===null)return 'この表示格子は未収録です。';
  const category=layer.classes?view.legend.find(row=>Number(row.id)===value):undefined;return `${lon.toFixed(2)}°E / ${lat.toFixed(2)}°N：${category?`${category.code??''} ${category.label}`:`${value.toLocaleString('ja-JP')} ${view.unit}`}（表示格子）`;
 }
 function retry(){for(const [url,result]of cache)if(result.error)cache.delete(url);lastPaint='';onReady();}
 return {render,inspect,retry};
}
