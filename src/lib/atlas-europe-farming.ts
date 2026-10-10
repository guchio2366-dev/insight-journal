import type { Map as LibreMap } from 'maplibre-gl';
import type { EuropeState } from './atlas-europe-view';
import { europeFarmingGenreForLayer, europeFarmingGenres } from '../data/atlas/europe/farming-genres.ts';

export type FarmingItem = { id:string; name:string; kind:'crop'|'livestock'; color:string; labelCoordinate:number[] };
export type FarmingAreas = {type:'FeatureCollection';features:{type:'Feature';properties:FarmingItem;geometry:unknown}[]};

/** All source-backed areas in the selected genre carry their own color. */
export function farmingVisualWeight(item:FarmingItem,selectedId:string|undefined,single:boolean){
  if(single||item.id===selectedId)return {fill:.8,line:.9,width:1.4};
  return {fill:selectedId?.42:.57,line:selectedId?.18:.2,width:.55};
}

/** A genre shows every available item; selection emphasizes one without hiding peers. */
export function farmingPresentation(state:EuropeState, items:FarmingItem[]) {
  const item=items.find(item=>item.id===state.layer);
  const genre=europeFarmingGenreForLayer(state.layer);
  const active=!!genre;
  const single=active&&!!item&&state.single===true;
  const genreContainsItem=!!item&&!!genre&&europeFarmingGenres[genre].ids.some(id=>id===item.id);
  const visible=genre?(single||item&&!genreContainsItem?items.filter(candidate=>candidate.id===item!.id):europeFarmingGenres[genre].ids.map(id=>items.find(candidate=>candidate.id===id)).filter((candidate):candidate is FarmingItem=>!!candidate)):[];
  return {active,genre,item,single,visible,selectedVisible:!!item&&visible.some(candidate=>candidate.id===item.id)};
}

/** Test the same polygons in both renderers, including holes and overlapping items. */
export function farmingAtPoint(data:FarmingAreas, point:number[], visibleIds:string[]) {
  const insideRing=(ring:number[][])=>{
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  };
  return data.features.filter(feature=>{
    if(!visibleIds.includes(feature.properties.id))return false;
    const geometry=feature.geometry as {type:string;coordinates:any[]};
    const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
    return polygons.some((rings:number[][][])=>rings.length&&insideRing(rings[0])&&!rings.slice(1).some(insideRing));
  }).map(feature=>feature.properties);
}

export function updateFarmingMap(root:HTMLElement,map:LibreMap|undefined,data:FarmingAreas,dominant:FarmingAreas,secondary:FarmingAreas,state:EuropeState) {
  const view=farmingPresentation(state,data.features.map(feature=>feature.properties));
  const ids=view.visible.map(item=>item.id);
  root.querySelectorAll<SVGElement>('[data-eu-farm-area]').forEach(path=>{
    const item=data.features.find(feature=>feature.properties.id===path.dataset.euFarmArea)?.properties;
    path.style.display=ids.includes(path.dataset.euFarmArea!)?'':'none';
    if(!item)return;
    const weight=farmingVisualWeight(item,view.selectedVisible?view.item?.id:undefined,view.single);
    const categorical=view.genre==='crops'&&dominant.features.some(feature=>feature.properties.id===item.id);
    path.style.fillOpacity=String(categorical?1:weight.fill);
    path.style.strokeOpacity=String(categorical?.35:weight.line);
    path.style.strokeWidth=String(weight.width);
  });
  root.querySelectorAll<SVGElement>('[data-eu-farm-outline]').forEach(path=>{
    path.style.display=view.selectedVisible&&path.dataset.euFarmOutline===view.item?.id?'':'none';
  });
  const secondaryLayer=root.querySelectorAll<SVGGElement>('[data-eu-farming-secondary]')[0];
  if(secondaryLayer)secondaryLayer.style.display=view.genre==='crops'?'':'none';
  root.querySelectorAll<SVGElement>('[data-eu-farm-secondary]').forEach(path=>{
    path.style.display=view.genre==='crops'&&ids.includes(path.getAttribute('data-eu-farm-secondary')??'')?'':'none';
  });
  if(map?.getLayer('land')) {
    if(!map.getSource('eu-farming')) {
      map.addSource('eu-farming',{type:'geojson',data:data as any});
      map.addSource('eu-farming-dominant',{type:'geojson',data:dominant as any});
      map.addSource('eu-farming-secondary',{type:'geojson',data:secondary as any});
      for(const kind of ['crop','livestock'] as const) {
        const source=kind==='crop'?'eu-farming-dominant':'eu-farming';
        map.addLayer({id:'eu-farm-'+kind+'-fill',type:'fill',source,filter:['==',['get','kind'],kind],paint:{'fill-color':['get','color'],'fill-opacity':0}});
        map.addLayer({id:'eu-farm-'+kind+'-line',type:'line',source,filter:['==',['get','kind'],kind],paint:{'line-color':['get','color'],'line-width':.7,...(kind==='livestock'?{'line-dasharray':[4,2]}:{}),'line-opacity':0}});
      }
      map.addLayer({id:'eu-farm-secondary-line',type:'line',source:'eu-farming-secondary',paint:{'line-color':['get','color'],'line-width':1.4,'line-opacity':.78,'line-dasharray':[3,2]}});
      map.addLayer({id:'eu-farm-selection-halo',type:'line',source:'eu-farming',paint:{'line-color':'#fffdf2','line-width':5}});
      map.addLayer({id:'eu-farm-selection',type:'line',source:'eu-farming',paint:{'line-color':'#173c48','line-width':2.5}});
    }
    for(const kind of ['crop','livestock'] as const) {
      const filter:any=['all',['==',['get','kind'],kind],['in',['get','id'],['literal',ids]]];
      for(const suffix of ['fill','line'])map.setFilter('eu-farm-'+kind+'-'+suffix,filter);
      const weights=data.features.filter(feature=>feature.properties.kind===kind).map(feature=>[feature.properties.id,farmingVisualWeight(feature.properties,view.selectedVisible?view.item?.id:undefined,view.single)] as const);
      const property=(key:'fill'|'line'|'width')=>['match',['get','id'],...weights.flatMap(([id,weight])=>[id,kind==='crop'&&view.genre==='crops'&&key==='fill'?1:kind==='crop'&&view.genre==='crops'&&key==='line'?.35:weight[key]]),0] as any;
      map.setPaintProperty('eu-farm-'+kind+'-fill','fill-opacity',property('fill'));
      map.setPaintProperty('eu-farm-'+kind+'-line','line-opacity',property('line'));
      map.setPaintProperty('eu-farm-'+kind+'-line','line-width',property('width'));
    }
    map.setFilter('eu-farm-secondary-line',['in',['get','id'],['literal',view.genre==='crops'?ids:[]]]);
    for(const id of ['eu-farm-selection-halo','eu-farm-selection']) {
      map.setFilter(id,['==',['get','id'],view.selectedVisible?view.item!.id:'']);
      map.moveLayer(id);
    }
  }
  return view;
}
