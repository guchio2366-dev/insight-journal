import {withBase} from '../lib/urls.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import {africaAgriFocusedLayer,africaAgriVisibleLayers,countries,type State} from '../data/atlas/africa-atlas.ts';
import {africaCultureGuides,africaCultureGuideReason} from '../data/atlas/africa-culture-guide.ts';
import {africaRiverForFeature,africaRiverSelectedColor} from '../data/atlas/africa-river-reading.ts';

type Row=Record<string,any>;
type Feature={type:string;id?:string;geometry:Row;properties:Row};
export type AfricaLayerKey={id:string;label:string;color:string;code?:string;description?:string};
export type AfricaLayerView={key:string;ready:boolean;loading:boolean;error:string;title:string;period:string;unit:string;scope:string;method:string;sourceUrl:string;sourceLabel:string;legend:AfricaLayerKey[];takeaway:string;description:string;guide?:boolean;selectedVisible?:boolean;visibleLayers?:{key:string;title:string;unit:string;color:string;ready:boolean;loading:boolean;error:string;period:string;sourceUrl:string;sourceLabel:string}[]};
type Loaded={value?:any;error?:string;promise?:Promise<void>};
const SVG='http://www.w3.org/2000/svg';
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
 function request(url:string,binary=false):Loaded {
  const found=cache.get(url);if(found)return found;
  const loaded:Loaded={};cache.set(url,loaded);
  loaded.promise=(async()=>{try{const response=await fetcher(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);let bytes=new Uint8Array(await response.arrayBuffer());if(bytes[0]===31&&bytes[1]===139)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());loaded.value=binary?bytes:JSON.parse(new TextDecoder().decode(bytes));}catch(error){loaded.error=error instanceof Error?error.message:'取得失敗';}finally{loaded.promise=undefined;notify();}})();
  return loaded;
 }
 const svg=(tag:string,attrs:Row)=>{const node=document.createElementNS(SVG,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));return node;};
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
  const outlineSelection=['climate','terrain','elevation','distribution'].includes(key);
  if(key==='ethnicity'||key==='religion'){const guide=africaCultureGuides[key];group.replaceChildren();lastPaint='';return {key,guide:true,ready:true,loading:false,error:'',title:guide.title,period:'2021年公開版',unit:'資料案内（分布は未配信）',scope:guide.scope,method:africaCultureGuideReason,sourceUrl:guide.source.url,sourceLabel:guide.source.label,legend:[],takeaway:guide.description,description:africaCultureGuideReason};}
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
  const paint=[key,state.place,state.compare,state.layerClass,state.river,file,ready,data?.value?'loaded':'',grid?.value?'grid':'',layer.image,mode,borders].join('|');
  if(paint!==lastPaint){
   const focusedRiverFeature=group.contains(document.activeElement)?document.activeElement?.getAttribute('data-africa-river-hit-feature'):null;
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
     if(state.layerClass&&!layer.vectorBands&&key!=='terrain'&&categories.length!==1&&id!==state.layerClass&&props.id!==state.layerClass)continue;
     let d=paths.get(feature);if(!d){d=africaLayerPath(feature.geometry);paths.set(feature,d);}if(!d)continue;
     const line=/LineString/.test(feature.geometry.type),boundary=config.id==='basins';
     const contour=layer.vectorBands&&props.kind==='contour',band=layer.vectorBands&&props.kind==='band';
     const river=key==='water-river'?africaRiverForFeature(feature):undefined,selected=!!river&&river.id===state.river;
     const color=contour?'#875d40':selected?africaRiverSelectedColor:text(props.color,categories.find(row=>text(row.id)===id)?.color??(key==='terrain'?'#655449':categories.length===1?categories[0].color:'#447f9d'));
     const path=svg('path',{d,fill:line||boundary?'none':color,'fill-opacity':1,stroke:band?'none':line||boundary?color:'#ffffff','stroke-width':contour?props.major?1.15:.55:selected?3.2:line||boundary?1.3:.3,'vector-effect':'non-scaling-stroke','fill-rule':'evenodd','data-africa-layer-feature':text(props.id,id),'pointer-events':'none'});
     if(contour)path.setAttribute('data-africa-elevation-contour',String(props.elevationM));
     if(band)path.setAttribute('data-africa-elevation-band',id);
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
   if(focusedRiverFeature)riverHits.find(hit=>hit.getAttribute('data-africa-river-hit-feature')===focusedRiverFeature)?.focus({preventScroll:true});
  }
  return output;
 }
 function paintBorders(state:State,target:SVGGElement){for(const original of root.querySelectorAll<SVGPathElement>('[data-country-path]'))target.append(svg('path',{d:original.getAttribute('d')??'',fill:'none',stroke:original.dataset.countryPath===state.place?'#b13e30':original.dataset.countryPath===state.compare?'#364c91':'#708e91','stroke-width':original.dataset.countryPath===state.place||original.dataset.countryPath===state.compare?2:.65,'stroke-dasharray':original.dataset.countryPath===state.compare?'5 3':'','vector-effect':'non-scaling-stroke','pointer-events':'none'}));}
 function commodityState(state:State,key:string):State {if(key.startsWith('crop-')){const [,crop,cropMeasure]=key.split('-');return {...state,topic:'farming',crop:crop as State['crop'],cropMeasure:cropMeasure as State['cropMeasure']};}return {...state,topic:'livestock',livestock:key.slice(10) as State['livestock']};}
 function commodityView(state:State,key:string,summary:Row|undefined):AfricaLayerView {
  const config=setup(key)!,manifestResult=request(config.base+'manifest.json'),manifest=manifestResult.value;
  const layer=manifest?.layers?.[config.id] as Row|undefined;
  const grid=layer?.grid?request(config.base+layer.grid,true):null;
  const input=key.startsWith('livestock-')?layer?.countryInputs?.[state.place]:undefined;
  const sourceMethod=note(layer?.method??manifest?.method)+(input?` 選択国の入力統計年：${input.censusYear??'未記載'}。元統計の平均空間解像度：${input.averageSpatialResolutionKm??'未記載'} km。${input.inputSource??''}`:'');
  const commodity=key.replace(/^crop-|^livestock-/,'').replace(/-harvested$|-production$/,'');
  const view:AfricaLayerView={key,ready:!!summary&&!!grid?.value,loading:!!manifestResult.promise||!!grid?.promise,error:manifestResult.error??grid?.error??'',title:layer?.title??africaCommodityLabels[commodity],period:layer?.period??'',unit:layer?.unit??'',scope:note(layer?.scope??layer?.limitations??manifest?.scope??manifest?.limitations),method:sourceMethod,sourceUrl:layer?.sourceUrl??'',sourceLabel:layer?.sourceLabel??'',legend:[],takeaway:layer?.takeaway??'',description:layer?.description??''};
  if(layer)viewCache.set(key,{manifest,layer,base:config.base,view,grid:grid?.value});
  return view;
 }
 function agriPick(node:SVGElement,key:string,focusId:string,selected:boolean,labelText:string){
  node.setAttribute('data-africa-agri-pick',key);node.setAttribute('data-africa-agri-focus',focusId);
  node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',labelText+'を読む');node.setAttribute('aria-pressed',String(selected));
  node.setAttribute('class','africa-agri-pick');node.style.cursor='pointer';
 }
 function agriOutline(summary:Row,key:string):string {
  const cacheKey='agri-summary|'+key;let d=outlineCache.get(cacheKey);if(d!==undefined)return d;
  const mask=new Uint8Array(summary.width*summary.height);for(const [row,col]of summary.layers[key].cells)mask[row*summary.width+col]=1;
  d=africaGridClassOutline(mask,{width:summary.width,height:summary.height,bounds:summary.bounds,noData:0,classes:[{id:1,color:summary.layers[key].color}]},'1');outlineCache.set(cacheKey,d);return d;
 }
 function render(state:State):AfricaLayerView|null {
  const agriculture=state.field==='agriculture'&&state.view!=='statistics'&&(state.topic==='farming'||state.topic==='livestock');
  if(!agriculture){if(agriMode){baseGroup.replaceChildren();agriGroups.clear();lastPaint='';lastAgriPaint='';}agriMode=false;visibleKeys=[];group=baseGroup;return renderOne(state);}
  if(!agriMode){baseGroup.replaceChildren();lastPaint='';lastAgriPaint='';}agriMode=true;
  const focused=africaAgriFocusedLayer(state),active:string[]=africaAgriVisibleLayers(state);visibleKeys=active;currentKey=focused;
  const summaryResult=request(withBase('/assets/atlas/africa-agriculture-overview-v1/manifest.json')),summary=summaryResult.value as Row|undefined;
  const keys=['crop-maize-harvested','crop-rice-harvested','crop-wheat-harvested','crop-cassava-harvested','livestock-cattle','livestock-goats','livestock-sheep'];
  const views=keys.map(key=>commodityView(state,key,summary?.layers[key]));
  const selected=views.find(view=>view.key===focused)??views[0];
  const visibleLayers=views.filter(view=>active.includes(view.key)).map(view=>({key:view.key,title:view.title,unit:view.unit,color:africaCommodityColor(view.key),ready:view.ready,loading:view.loading,error:view.error,period:view.period,sourceUrl:view.sourceUrl,sourceLabel:view.sourceLabel}));
  const legend=visibleLayers.map(view=>({id:view.key,label:summary?.layers[view.key]?.label??view.title.split('｜')[0].replace('の推定飼養密度',''),color:view.color}));
  const thresholdDetails=summary?keys.map(key=>{const layer=summary.layers[key];return `${layer.label}：${Number(layer.threshold).toLocaleString('ja-JP',{maximumFractionDigits:3})} ${layer.unit}以上`;}).join('。'):'';
  const backgroundSource=summary?.background?`背景出典：${summary.background.sourceLabel}。${summary.background.sourceUrl} ${summary.background.note}`:'';
  const result:AfricaLayerView={...selected,ready:!!summary&&visibleLayers.every(view=>view.ready),error:summaryResult.error??(selected.error||visibleLayers.find(view=>view.error)?.error||''),selectedVisible:active.includes(focused),loading:!!summaryResult.promise||visibleLayers.some(view=>view.loading),visibleLayers,legend,method:[summary?.method,thresholdDetails,summary?.display,...(summary?.limitations??[]),backgroundSource,selected.method].filter(Boolean).join(' '),scope:'色帯は作物、動物記号は家畜の比較的集中する範囲を示します。1°集約・品目内上位25%を抽出し、数量や品目間の優劣は表しません。抽出外も生産なしとは限りません。'};
  if(state.overview){result.title='作物と家畜の特徴的な分布';result.period='作物・家畜とも2020年基準のモデル';result.unit='品目内の相対的な集中';result.sourceUrl='';result.sourceLabel='';result.takeaway='作物の帯と家畜の記号から、生産の地域差を読む';result.description='作物は収穫面積、家畜は飼養密度のモデルから、それぞれの品目が比較的集中する範囲を示します。';}
  if(!summary){baseGroup.replaceChildren();lastAgriPaint='';return result;}
  // Summary geometry does not change when an original query grid arrives late.
  // Paint and selection are derived only from the current state supplied here.
  const map=baseGroup.ownerSVGElement,box=map?.getBoundingClientRect(),viewport=(map?.getAttribute('viewBox')??`0 0 ${africaWidth} ${africaHeight}`).split(/[ ,]+/).map(Number);
  const labelScale=Math.max(viewport[2]/(box?.width||700),viewport[3]/(box?.height||580));
  const paint=[focused,state.overview,active.join(','),state.place,state.compare,state.region,state.zoom,labelScale.toFixed(3),viewport.join(',')].join('|');
  if(paint===lastAgriPaint)return result;lastAgriPaint=paint;
  const focusedElement=baseGroup.contains(document.activeElement)?document.activeElement?.getAttribute('data-africa-agri-focus'):null;
  baseGroup.replaceChildren();agriGroups.clear();
  const defs=svg('defs',{}),clip=svg('clipPath',{id:'africa-agri-land-clip'}),filter=svg('filter',{id:'africa-agri-neutral-relief'});
  for(const original of root.querySelectorAll<SVGPathElement>('[data-country-path]'))clip.append(svg('path',{d:original.getAttribute('d')??'','fill-rule':'evenodd','clip-rule':'evenodd'}));
  filter.append(svg('feColorMatrix',{type:'saturate',values:0}));defs.append(clip,filter);baseGroup.append(defs);
  const background=svg('g',{'pointer-events':'none','aria-hidden':'true'});
  for(const original of root.querySelectorAll<SVGPathElement>('[data-country-path]'))background.append(svg('path',{d:original.getAttribute('d')??'',fill:'#f5f2e9','fill-rule':'evenodd'}));
  background.append(svg('image',{href:withBase('/assets/atlas/africa-physical-v1/elevation.png'),x:0,y:0,width:africaWidth,height:africaHeight,preserveAspectRatio:'none',filter:'url(#africa-agri-neutral-relief)',opacity:.22}));baseGroup.append(background);
  const memberships=new Map<string,string[]>();
  for(const key of keys.filter(key=>key.startsWith('crop-')&&active.includes(key)))for(const [row,col]of summary.layers[key].cells){const id=`${row},${col}`,list=memberships.get(id)??[];list.push(key);memberships.set(id,list);}
  const labelJobs:{key:string;anchor:Row;index:number;livestock:boolean}[]=[];
  for(const key of keys){
   const layer=summary.layers[key],selectedNow=!state.overview&&key===focused,livestock=key.startsWith('livestock-');
   const node=svg('g',{'data-africa-commodity-layer':key,'data-africa-summary-threshold':layer.threshold}) as SVGGElement;node.style.display=active.includes(key)?'':'none';node.style.opacity=livestock&&!state.overview&&focused.startsWith('crop-')?'.32':'1';agriGroups.set(key,node);
   if(!livestock){let d='';for(const [row,col]of layer.cells){const all=memberships.get(`${row},${col}`)??[key],slot=all.indexOf(key),parts=all.length;if(slot<0)continue;const [x,y]=projectAfrica([summary.bounds[0]+col,summary.bounds[3]-row-slot/parts]),[right,bottom]=projectAfrica([summary.bounds[0]+col+1,summary.bounds[3]-row-(slot+1)/parts]);d+=`M${x.toFixed(2)},${y.toFixed(2)}H${right.toFixed(2)}V${bottom.toFixed(2)}H${x.toFixed(2)}Z`;}
    const path=svg('path',{d,fill:africaCommodityColor(key),'fill-opacity':.9,'clip-path':'url(#africa-agri-land-clip)','data-africa-agri-distribution':key,'stroke-linejoin':'round'});agriPick(path,key,key+'-distribution',selectedNow,layer.label);path.style.display=node.style.display;baseGroup.append(path);
   }
   const inViewport=(anchor:Row)=>{const [x,y]=projectAfrica([anchor.lon,anchor.lat]);return x>=viewport[0]&&x<=viewport[0]+viewport[2]&&y>=viewport[1]&&y<=viewport[1]+viewport[3];};
   let anchors:Row[]=layer.anchors;
   if(state.zoom!=='all'&&state.region!=='all'){
    anchors=anchors.filter(inViewport);
    if(!anchors.length){const cell=layer.cells.filter(([row,col]:number[])=>inViewport({lon:summary.bounds[0]+col+.5,lat:summary.bounds[3]-row-.5})).sort((a:number[],b:number[])=>b[2]-a[2])[0];if(cell)anchors=[{row:cell[0],col:cell[1],lon:summary.bounds[0]+cell[1]+.5,lat:summary.bounds[3]-cell[0]-.5}];}
   }
   for(const [index,anchor]of anchors.entries())labelJobs.push({key,anchor,index,livestock});
  }
  paintBorders(state,baseGroup);
  if(!state.overview&&active.includes(focused)){
   const outline=svg('g',{'data-africa-agri-footprint':focused,'pointer-events':'none','aria-hidden':'true','clip-path':'url(#africa-agri-land-clip)'});
   const d=agriOutline(summary,focused);for(const [stroke,width]of [['#ffffff',3.5],[africaCommodityColor(focused),1.8]]as const)outline.append(svg('path',{d,fill:'none',stroke,'stroke-width':width,'vector-effect':'non-scaling-stroke','stroke-linecap':'round','stroke-linejoin':'round'}));baseGroup.append(outline);
  }
  // Labels carry exact source-summary anchors. Short leaders permit legible names
  // without implying that the displaced label is itself a production location.
  const occupied:{x:number;y:number;w:number;h:number}[]=[];
  for(const job of labelJobs){
   const {key,anchor,index,livestock}=job,layer=summary.layers[key],node=agriGroups.get(key)!,selectedNow=!state.overview&&key===focused;
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
