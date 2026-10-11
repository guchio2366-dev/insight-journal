import type {Map} from 'maplibre-gl';
import reference from '../../public/assets/atlas/japan-agriculture-v3/manifest.json';

/** Quantity grain and land mask are owned by the offline source adapter. */
export function mountJapanAgricultureLayers(map:Map,base:string){
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
 }};
}
