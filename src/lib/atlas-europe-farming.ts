import type { Map as LibreMap } from 'maplibre-gl';
import type { EuropeState } from './atlas-europe-view';

export type FarmingItem = { id:string; name:string; kind:'crop'|'livestock'; color:string; labelCoordinate:number[] };
export type FarmingAreas = {type:'FeatureCollection';features:{type:'Feature';properties:FarmingItem;geometry:unknown}[]};

/** Selection and visibility are independent; a single-item view preserves both switches. */
export function farmingPresentation(state:EuropeState, items:FarmingItem[]) {
  const item=items.find(item=>item.id===state.layer);
  const active=state.layer==='crops'||!!item;
  const single=active&&!!item&&state.single===true;
  const visible=active?items.filter(candidate=>single?candidate.id===item!.id:candidate.kind==='crop'?state.showCrops!==false:state.showLivestock!==false):[];
  return {active,item,single,visible,selectedVisible:!!item&&visible.some(candidate=>candidate.id===item.id)};
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

export function updateFarmingMap(root:HTMLElement,map:LibreMap|undefined,data:FarmingAreas,state:EuropeState) {
  const view=farmingPresentation(state,data.features.map(feature=>feature.properties));
  const ids=view.visible.map(item=>item.id);
  root.querySelectorAll<SVGPathElement>('[data-eu-farm-area]').forEach(path=>{
    const item=data.features.find(feature=>feature.properties.id===path.dataset.euFarmArea)?.properties;
    path.style.display=ids.includes(path.dataset.euFarmArea!)?'':'none';
    path.style.fillOpacity=String(item?.kind==='livestock'?(view.single?.30:.13):(view.single?.65:.44));
  });
  root.querySelectorAll<SVGPathElement>('[data-eu-farm-outline]').forEach(path=>{
    path.style.display=view.selectedVisible&&path.dataset.euFarmOutline===view.item?.id?'':'none';
  });
  if(map?.getLayer('land')) {
    if(!map.getSource('eu-farming')) {
      map.addSource('eu-farming',{type:'geojson',data:data as any});
      for(const kind of ['crop','livestock'] as const) {
        map.addLayer({id:'eu-farm-'+kind+'-fill',type:'fill',source:'eu-farming',filter:['==',['get','kind'],kind],paint:{'fill-color':['get','color'],'fill-opacity':kind==='crop'?.44:.13}});
        map.addLayer({id:'eu-farm-'+kind+'-line',type:'line',source:'eu-farming',filter:['==',['get','kind'],kind],paint:{'line-color':['get','color'],'line-width':kind==='crop'?.8:1.2,...(kind==='livestock'?{'line-dasharray':[4,2]}:{}),'line-opacity':.85}});
      }
      map.addLayer({id:'eu-farm-selection-halo',type:'line',source:'eu-farming',paint:{'line-color':'#fffdf2','line-width':5}});
      map.addLayer({id:'eu-farm-selection',type:'line',source:'eu-farming',paint:{'line-color':'#173c48','line-width':2.5}});
    }
    for(const kind of ['crop','livestock'] as const) {
      const filter:any=['all',['==',['get','kind'],kind],['in',['get','id'],['literal',ids]]];
      for(const suffix of ['fill','line'])map.setFilter('eu-farm-'+kind+'-'+suffix,filter);
      map.setPaintProperty('eu-farm-'+kind+'-fill','fill-opacity',kind==='crop'?(view.single?.65:.44):(view.single?.30:.13));
    }
    for(const id of ['eu-farm-selection-halo','eu-farm-selection']) {
      map.setFilter(id,['==',['get','id'],view.selectedVisible?view.item!.id:'']);
      map.moveLayer(id);
    }
  }
  return view;
}
