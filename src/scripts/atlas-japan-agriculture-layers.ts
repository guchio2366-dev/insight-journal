import type {Map} from 'maplibre-gl';
import reference from '../../public/assets/atlas/japan-agriculture-v3/manifest.json';
import {decodeAsiaNumericGrid,readAsiaNumericCell,type AsiaNumericGrid} from '../lib/atlas-asia-numeric-grid';

/** Quantity grain and land mask are owned by the offline source adapter. */
export function mountJapanAgricultureLayers(map:Map,base:string){
 const grids=new globalThis.Map<string,Promise<AsiaNumericGrid>>();
 for(const layer of reference.layers){
  map.addSource('japan-farm-'+layer.id,{type:'image',url:base+layer.image,coordinates:layer.imageCoordinates as [number,number][]});
  map.addLayer({id:'japan-farm-'+layer.id,type:'raster',source:'japan-farm-'+layer.id,layout:{visibility:'none'},paint:{'raster-resampling':'nearest','raster-fade-duration':0}},'japan-prefecture-border');
 }
 return {show(field:string,topic:string){
  for(const layer of reference.layers){
   const visible=field==='agriculture'&&(topic==='forest'?layer.id==='forest':layer.id!=='forest');
   map.setLayoutProperty('japan-farm-'+layer.id,'visibility',visible?'visible':'none');
   map.setPaintProperty('japan-farm-'+layer.id,'raster-opacity',topic==='all'||topic==='forest'||(topic==='pork'?'pig':topic)===layer.id?1:.35);
  }
 },async sample(topic:string,lng:number,lat:number){
  const selected=topic==='all'?['rice','wheat','pig']:topic==='pork'?['pig']:['rice','wheat'].includes(topic)?[topic]:[];
  if(!selected.length)return topic==='forest'?'森林はJRCの参考画像で、地点の森林判定や面積計算は行いません。':'この品目の地域数量は未収録。背景の面は米・小麦・豚の別資料です。';
  const parts=await Promise.all(selected.map(async id=>{
   const layer=reference.layers.find(l=>l.id===id)!;
   if(!grids.has(id))grids.set(id,(async()=>{const response=await fetch(base+layer.grid,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Japan agriculture grid '+response.status);return decodeAsiaNumericGrid(new Uint8Array(await response.arrayBuffer()),layer,'float32',layer.noData);})().catch(error=>{grids.delete(id);throw error;}));
   const value=readAsiaNumericCell(await grids.get(id)!,lng,lat);
   return ({rice:'米',wheat:'小麦',pig:'豚'}[id as 'rice'|'wheat'|'pig'])+'：'+(value==null?'欠測・未収録（0ではない）':value.toLocaleString('ja-JP',{maximumFractionDigits:1})+' '+layer.unit);
  }));
  return `${lat.toFixed(3)}°N / ${lng.toFixed(3)}°E：${parts.join('、')}。2020年のモデル推計・原5分角（約7–9km）。園地・農場の境界ではありません。`;
 }};
}
