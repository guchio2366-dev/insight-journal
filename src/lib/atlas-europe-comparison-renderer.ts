import { project, viewPath, frame } from './atlas-europe-view.ts';
import type { EuropeState } from './atlas-europe-view';
import { layerColor, type EuropeLayer } from '../data/atlas/europe/layers.ts';
import type { FarmingAreas } from './atlas-europe-farming';
import { farmingPresentation } from './atlas-europe-farming.ts';
import type { Map as LibreMap } from 'maplibre-gl';
import type { Geometry } from './atlas-europe-geometry';
import climateLegend from '../data/atlas/europe/climate-legend.json' with { type:'json' };

type Config = {
  layers: EuropeLayer[]; farmingAreas:FarmingAreas;
  geography:{features:{properties:{code:string;kind:string};geometry:Geometry}[]};
  readings:{id:string;name:string;coordinates:number[];period:string;field:string;country:string}[];
  countries:{code:string;region:string}[];
  climateWater:{features:{geometry:Geometry}[]};
  cities:{id:string;name:string;coordinates:number[];country:string}[];
  populationCities:{id:string;name:string;coordinates:number[];country:string}[];
  statistics:{indicators:{id:string;values:Record<string,Record<string,number|null>>}[]};
};
const ns='http://www.w3.org/2000/svg';
function svg(tag:string, attrs:Record<string,string>, text?:string) {
  const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;
}

/** Source marks use the same registered Mercator frame as both Europe renderers. */
export function renderEuropeOrigin(root:HTMLElement, source:EuropeState|null, target:EuropeLayer, config:Config, map?:LibreMap) {
  const overlay=root.querySelector<SVGGElement>('[data-eu-comparison-overlay]')!;
  const key=root.querySelector<HTMLElement>('[data-eu-origin-key]')!;
  const caption=root.querySelector<HTMLElement>('[data-eu-origin-caption]')!;
  const legend=root.querySelector<HTMLElement>('[data-eu-origin-legend]')!;
  const mini=root.querySelector<SVGSVGElement>('[data-eu-origin-map]')!;
  overlay.replaceChildren();legend.replaceChildren();mini.replaceChildren();mini.hidden=true;key.hidden=!source;
  for(const id of ['eu-origin-fill','eu-origin-line','eu-origin-livestock-line','eu-origin-points'])if(map?.getLayer(id))map.removeLayer(id);
  if(map?.getSource('eu-origin'))map.removeSource('eu-origin');
  if(!source)return;
  const layer=config.layers.find(l=>l.id===(source.layer==='overlay'?(source.returnLayer==='climate'?'wheat':source.returnLayer):source.layer));
  if(!layer){key.hidden=true;return;}
  caption.textContent=`元の図：${layer.title} · ${layer.period} · ${layer.unit}`;
  const addKey=(color:string,label:string)=>{const row=document.createElement('div'),swatch=document.createElement('span'),text=document.createElement('span');swatch.className='eu-swatch';swatch.style.background=color;text.textContent=label;row.append(swatch,text);legend.append(row);};
  const farm=farmingPresentation(source,config.farmingAreas.features.map(f=>f.properties));
  const sourceVisible=(f:{country:string})=>source.place?f.country===source.place:source.region==='all'||config.countries.find(c=>c.code===f.country)?.region===source.region;
  const feature=config.readings.find(f=>f.id===source.feature&&f.field==='industry'&&sourceVisible(f));
  const marks:any[]=[];
  if(farm.active) {
    caption.textContent=`元の図：${layer.title} · ${layer.period} · 主な集中域の輪郭（数量の色分けではない）`;
    // Only distributions visible in the original selection are carried forward.
    const selected=farm.item?farm.visible.filter(item=>item.id===farm.item!.id):farm.visible;
    for(const item of selected) {
      const f=config.farmingAreas.features.find(f=>f.properties.id===item.id)!;
      overlay.append(svg('path',{d:viewPath(f.geometry as Geometry),fill:'none',stroke:item.color,'stroke-width':'2.5','stroke-dasharray':item.kind==='livestock'?'5 3':'none','vector-effect':'non-scaling-stroke'}));
      addKey(item.color,`${item.name}：${item.kind==='crop'?'実線':'破線'}の主な集中域`);
      marks.push({type:'Feature',properties:{color:item.color,kind:item.kind},geometry:f.geometry});
    }
    if(!selected.length)addKey('#e3e4df','元の選択では対象の分布は非表示です');
  } else if(layer.id==='hubs') {
    const originalPoints=feature?[feature]:config.readings.filter(f=>f.field==='industry'&&sourceVisible(f));
    const matrix=root.querySelector<SVGSVGElement>('[data-eu-static]')?.getScreenCTM?.();
    const scale=matrix?Math.max(.01,Math.hypot(matrix.a,matrix.b)):.4;
    for(const point of originalPoints) {
    const [x,y]=project(point.coordinates);
    overlay.append(svg('circle',{cx:String(x),cy:String(y),r:String(7/scale),fill:'#fff0ba',stroke:'#173c48','stroke-width':'2','vector-effect':'non-scaling-stroke'}));
    if(feature)overlay.append(svg('text',{x:String(x+12/scale),y:String(y-10/scale),fill:'#173c48',stroke:'#fffdf2','stroke-width':String(3/scale),'paint-order':'stroke','font-size':String(13/scale)},point.name));
    marks.push({type:'Feature',properties:{color:'#173c48'},geometry:{type:'Point',coordinates:point.coordinates}});
    }
    addKey('#fff0ba',`${feature?.name??originalPoints.length+'産業拠点'}：代表位置（数量ではない）`);
  } else {
    // Keep independent raster/indicator legends; overlapping their colours would
    // change the meaning. The small source map is a separate comparison view.
    mini.hidden=false;mini.append(svg('rect',{width:String(frame.width),height:String(frame.height),fill:'#e7eff1'}));
    const ind=config.statistics.indicators.find(i=>i.id===layer.indicator);
    for(const f of config.geography.features)mini.append(svg('path',{d:viewPath(f.geometry),fill:ind?layerColor(layer,ind.values[f.properties.code]?.['2023']??null):'#edece5',stroke:'#536a6f','stroke-width':'.7','fill-rule':'evenodd'}));
    if(layer.image)mini.append(svg('image',{href:layer.image,x:'0',y:'0',width:String(frame.width),height:String(frame.height),preserveAspectRatio:'none'}));
    if(layer.id==='climate')for(const f of config.climateWater.features)mini.append(svg('path',{d:viewPath(f.geometry),fill:'#e7eff1',stroke:'#8ca6aa','stroke-width':'.7','fill-rule':'evenodd'}));
    for(const f of config.geography.features)mini.append(svg('path',{d:viewPath(f.geometry),fill:'none',stroke:'#536a6f','stroke-width':'.7','fill-rule':'evenodd'}));
    if(source.place)for(const f of config.geography.features.filter(f=>f.properties.code===source.place))mini.append(svg('path',{d:viewPath(f.geometry),fill:'none',stroke:'#173c48','stroke-width':'2.5','vector-effect':'non-scaling-stroke','data-eu-origin-place':source.place}));
    const point=layer.id==='climate'?config.cities.find(c=>c.id===source.city):layer.field==='population'?config.populationCities.find(c=>c.id===source.feature&&sourceVisible(c)):undefined;
    if(point) {
      const [x,y]=project(point.coordinates),scale=Math.max(.01,Math.min((mini.clientWidth||350)/frame.width,145/frame.height));
      mini.append(svg('circle',{cx:String(x),cy:String(y),r:String(6/scale),fill:'#fff0ba',stroke:'#173c48','stroke-width':'2','vector-effect':'non-scaling-stroke','data-eu-origin-point':point.id}));
      mini.append(svg('text',{x:String(x+10/scale),y:String(y-8/scale),fill:'#173c48',stroke:'#fffdf2','stroke-width':String(3/scale),'paint-order':'stroke','font-size':String(12/scale)},point.name));
      caption.textContent+=` · 選択：${point.name}`;
      addKey('#fff0ba',`${point.name}：元の選択地点（位置）`);
    }
    const labels=layer.labels??(layer.breaks?[...layer.breaks.map((value,i)=>i===0?`${value}未満`:`${layer.breaks![i-1]}〜${value}未満`),`${layer.breaks.at(-1)}以上`]:[]);
    labels.forEach((label,i)=>addKey(layer.colors![i],label));
    if(layer.id==='climate')climateLegend.forEach(item=>addKey(item.color,`${item.code} ${item.name}`));
    if(layer.grid||layer.indicator)addKey('#d9dcda','データなし');
    if(layer.id==='hubs')addKey('#173c48','産業拠点の代表位置（数量ではない）');
  }
  if(map?.getLayer('land')&&marks.length) {
    map.addSource('eu-origin',{type:'geojson',data:{type:'FeatureCollection',features:marks}});
    map.addLayer({id:'eu-origin-line',type:'line',source:'eu-origin',filter:['all',['!=',['geometry-type'],'Point'],['!=',['get','kind'],'livestock']],paint:{'line-color':['get','color'],'line-width':2.5}});
    map.addLayer({id:'eu-origin-livestock-line',type:'line',source:'eu-origin',filter:['==',['get','kind'],'livestock'],paint:{'line-color':['get','color'],'line-width':2.5,'line-dasharray':[4,2]}});
    map.addLayer({id:'eu-origin-points',type:'circle',source:'eu-origin',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':'#fff0ba','circle-radius':7,'circle-stroke-color':'#173c48','circle-stroke-width':2}});
  }
}
