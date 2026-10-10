import {groundwaterClasses,basinColor} from '../data/atlas/asia-water';
import type {Map, MapMouseEvent} from 'maplibre-gl';
import {decodeAsiaNumericGrid,readAsiaNumericCell,type AsiaNumericGrid} from '../lib/atlas-asia-numeric-grid';

type Surface={bands:string;contours:string;image:string;grid:string;width:number;height:number;bounds3857:number[];imageCoordinates:[number,number][];noData:number;unit:string;period?:string;edition?:number;sourceResolutionDegrees:number};
type Manifest={elevation:Surface;precipitation:Surface;climate?:Surface & {classes?:{id:number;code:string;color:string;name:string}[]};water:Record<'basins'|'groundwater'|'rivers',{geometry:string;records?:string}>};
export type JapanNatureLayers={show:(topic:string,feature:string|null)=>void;hit:(event:MapMouseEvent,topic:string)=>string|null;sample:(topic:string,lng:number,lat:number)=>Promise<string|null>;legend:(topic:string)=>{label:string;color:string}[];featureIds:string[]};

// Japan has its own source and layer lifecycle. A missing nature asset leaves
// the national base and the other three fields usable.
export async function mountJapanNatureLayers(map:Map,base:string):Promise<JapanNatureLayers>{
 const get=async<T>(file:string):Promise<T>=>{const response=await fetch(base+file,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Japan nature asset '+response.status);return response.json();};
 const manifest=await get<Manifest>('manifest.json');
 const geometries:Record<string,any>={};
 const surfaces=['elevation','precipitation'] as const;
 await Promise.all(surfaces.map(async name=>{const surface=manifest[name];const [bands,contours]=await Promise.all([get<any>(surface.bands),get<any>(surface.contours)]);geometries[name]=bands;geometries[name+'-contours']=contours;}));
 await Promise.all(Object.entries(manifest.water).map(async([name,record])=>{geometries[name]=await get<any>(record.geometry);}));
 const ids:string[]=[],layers:string[]=[];
 const add=(layer:any)=>{map.addLayer({...layer,layout:{...layer.layout,visibility:'none'}},'japan-prefecture-border');layers.push(layer.id);};
 for(const [name,geometry] of Object.entries(geometries)){
  map.addSource('japan-nature-'+name,{type:'geojson',data:geometry});
  for(const feature of geometry.features)if(typeof feature.properties.id==='string')ids.push(feature.properties.id);
 }
 for(const name of surfaces){
  add({id:'japan-nature-'+name,type:'fill',source:'japan-nature-'+name,paint:{'fill-color':['get','color'],'fill-opacity':.94}});
  add({id:'japan-nature-'+name+'-contours',type:'line',source:'japan-nature-'+name+'-contours',paint:{'line-color':name==='elevation'?'#79664c':'#426d93','line-width':.75,'line-opacity':.8}});
  add({id:'japan-nature-'+name+'-selected',type:'line',source:'japan-nature-'+name,filter:['==',['get','id'],''],paint:{'line-color':'#a74830','line-width':2}});
 }
 add({id:'japan-nature-basins',type:'fill',source:'japan-nature-basins',paint:{'fill-color':['match',['get','id'],...geometries.basins.features.flatMap((f:any)=>[f.properties.id,basinColor(f.properties.id)]),'#8ac0c2'],'fill-opacity':.55}});
 add({id:'japan-nature-basins-border',type:'line',source:'japan-nature-basins',paint:{'line-color':'#527e83','line-width':.7}});
 add({id:'japan-nature-groundwater',type:'fill',source:'japan-nature-groundwater',paint:{'fill-color':['match',['get','category'],...Object.entries(groundwaterClasses).flatMap(([id,value])=>[Number(id),value.color]),'#d6d1c8'],'fill-opacity':.85}});
 for(const name of ['basins','groundwater'])add({id:'japan-nature-'+name+'-selected',type:'line',source:'japan-nature-'+name,filter:['==',['get','id'],''],paint:{'line-color':'#a74830','line-width':2}});
 add({id:'japan-nature-rivers',type:'line',source:'japan-nature-rivers',paint:{'line-color':'#27799b','line-width':2}});
 add({id:'japan-nature-rivers-selected',type:'line',source:'japan-nature-rivers',filter:['==',['get','id'],''],paint:{'line-color':'#a74830','line-width':3}});
 if(manifest.climate){const climate=manifest.climate;map.addSource('japan-nature-climate',{type:'image',url:base+climate.image,coordinates:climate.imageCoordinates});add({id:'japan-nature-climate',type:'raster',source:'japan-nature-climate',paint:{'raster-resampling':'nearest','raster-fade-duration':0}});}
 const topicLayers=(topic:string)=>topic==='water'?['basins','basins-border','basins-selected','rivers','rivers-selected']:topic==='groundwater'?['groundwater','groundwater-selected']:surfaces.includes(topic as any)?[topic,topic+'-contours',topic+'-selected']:topic==='climate'&&manifest.climate?['climate']:[];
 const grids=new globalThis.Map<string,Promise<AsiaNumericGrid>>();
 return {
  featureIds:[...new Set(ids)],
  show(topic,feature){const visible=topicLayers(topic).map(id=>'japan-nature-'+id);for(const id of layers){map.setLayoutProperty(id,'visibility',visible.includes(id)?'visible':'none');if(id.endsWith('-selected'))map.setFilter(id,['==',['get','id'],feature??'']);}},
  hit(event,topic){const names=topic==='water'?['rivers','basins']:topic==='groundwater'?['groundwater']:surfaces.includes(topic as any)?[topic]:[];for(const name of names){const result=map.queryRenderedFeatures([[event.point.x-4,event.point.y-4],[event.point.x+4,event.point.y+4]],{layers:['japan-nature-'+name]})[0];if(result?.properties?.id)return result.properties.id;}return null;},
  legend(topic){if(surfaces.includes(topic as any))return geometries[topic].features.map((f:any)=>({label:f.properties.label,color:f.properties.color})).filter((v:any,i:number,a:any[])=>a.findIndex(k=>k.label===v.label)===i);if(topic==='water')return [{label:'集水域ごとの色（面積・水量ではない）',color:'#8ac0c2'},{label:'収録河川3例',color:'#27799b'}];if(topic==='groundwater')return [...new Set<number>(geometries.groundwater.features.map((f:any)=>Number(f.properties.category)))].sort((a,b)=>a-b).map(id=>({label:groundwaterClasses[id].type+'／涵養 '+groundwaterClasses[id].recharge+' mm/年',color:groundwaterClasses[id].color}));return topic==='climate'?manifest.climate?.classes?.map(c=>({label:c.name,color:c.color}))??[]:[];},
  async sample(topic,lng,lat){if(!surfaces.includes(topic as any))return null;const surface=manifest[topic as typeof surfaces[number]];if(!grids.has(topic))grids.set(topic,(async()=>{const response=await fetch(base+surface.grid,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Japan nature grid '+response.status);return decodeAsiaNumericGrid(new Uint8Array(await response.arrayBuffer()),surface,'float32',surface.noData);})().catch(error=>{grids.delete(topic);throw error;}));const value=readAsiaNumericCell(await grids.get(topic)!,lng,lat);return `${lat.toFixed(3)}°N / ${lng.toFixed(3)}°E：${value==null?'原資料の欠測・未収録':value.toLocaleString('ja-JP',{maximumFractionDigits:1})+' '+surface.unit}。${topic==='precipitation'?'1991–2020年の原格子平年値（0.25°）':'ETOPO 2022・原格子60秒の標高'}。表示画素の細かさは観測精度ではありません。`;}
 };
}
