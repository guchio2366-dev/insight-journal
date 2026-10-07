import { project, viewPath, frame } from './atlas-europe-view.ts';
import type { EuropeState } from './atlas-europe-view';
import { layerColor, type EuropeLayer } from '../data/atlas/europe/layers.ts';
import type { FarmingAreas } from './atlas-europe-farming';
import { farmingPresentation } from './atlas-europe-farming.ts';
import type { Map as LibreMap } from 'maplibre-gl';
import type { Geometry } from './atlas-europe-geometry';
import climateLegend from '../data/atlas/europe/climate-legend.json' with { type:'json' };
import { europeCultureData, fetchCaseGeometry, cultureSelection, caseMapData, cultureGeometryPath, cultureBounds, cultureLegend, cultureColor, formatCultureShare, type CultureGeometry } from './atlas-europe-population-cases.ts';
import { europeDrainageGrid, europeDrainageIndexForBasin, europeDrainageOutline, readEuropeDrainageValues } from './atlas-europe-drainage.ts';

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
const originHomes = new WeakMap<HTMLElement, Comment>();
const originGenerations = new WeakMap<HTMLElement, number>();
const drainageValueRequests = new Map<string, Promise<Float32Array>>();
type OriginOptions = { fetchCultureGeometry?: typeof fetchCaseGeometry; fetchDrainageValues?: (url:string)=>Promise<Float32Array>; base?: string };
async function drainageValues(url:string) {
  if(!drainageValueRequests.has(url)) {
    const request=fetch(url).then(async response=>{
      if(!response.ok)throw new Error('Original drainage display lookup unavailable');
      const bytes=new Uint8Array(await response.arrayBuffer());
      const buffer=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes.buffer;
      return readEuropeDrainageValues(buffer);
    });
    drainageValueRequests.set(url,request);request.catch(()=>drainageValueRequests.delete(url));
  }
  return drainageValueRequests.get(url)!;
}
function svg(tag:string, attrs:Record<string,string>, text?:string) {
  const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;
}

/** The source keeps its own colour scale next to the target map, in either renderer. */
function positionOrigin(root:HTMLElement, key:HTMLElement, separateMap:boolean) {
  let home=originHomes.get(key);
  if(!home){home=root.ownerDocument.createComment('Europe comparison source position');key.before(home);originHomes.set(key,home);}
  const panel=root.querySelector<HTMLElement>('.eu-map-panel');
  const stage=panel?.querySelector<HTMLElement>('.eu-map-stage');
  const paired=separateMap&&!!panel&&!!stage;
  root.classList.toggle('has-eu-source-map',paired);
  key.classList.toggle('eu-origin-reference-map',paired);
  if(paired) {
    if(key.parentNode!==panel||stage!.nextSibling!==key)stage!.after(key);
  } else if(home.parentNode&&(key.parentNode!==home.parentNode||home.nextSibling!==key))home.after(key);
}

function sourceReading(root:HTMLElement, key:HTMLElement, separateMap:boolean) {
  const legend=root.querySelector<HTMLElement>('[data-eu-origin-legend]')!;
  let brief=root.querySelector<HTMLElement>('[data-eu-origin-question]');
  if(!brief){brief=root.ownerDocument.createElement('p');brief.dataset.euOriginQuestion='';key.append(brief);}
  const question=root.querySelector('[data-eu-comparison-question]')?.textContent?.trim()??'';
  const sentences=question.match(/[^。]+。?/g)??[];
  brief.textContent=(question.startsWith('入口は')?sentences.slice(0,2):sentences.slice(0,1)).join('');
  brief.hidden=!separateMap||!brief.textContent;
  const panel=root.querySelector<HTMLElement>('.eu-map-panel');
  const wide=separateMap&&!!panel&&legend.children.length>=12;
  root.classList.toggle('has-eu-wide-source-key',wide);
  legend.classList.toggle('eu-origin-wide-legend',wide);
  brief.classList.toggle('eu-origin-wide-question',wide);
  legend.setAttribute('aria-label','元の図の全凡例');
  if(wide){key.after(legend);legend.after(brief);}
  else {key.append(legend,brief);}
}

/** Source marks use the same registered Mercator frame as both Europe renderers. */
export function renderEuropeOrigin(root:HTMLElement, source:EuropeState|null, target:EuropeLayer, config:Config, map?:LibreMap, options:OriginOptions={}) {
  const generation=(originGenerations.get(root)??0)+1;
  originGenerations.set(root,generation);
  const overlay=root.querySelector<SVGGElement>('[data-eu-comparison-overlay]')!;
  const key=root.querySelector<HTMLElement>('[data-eu-origin-key]')!;
  const caption=root.querySelector<HTMLElement>('[data-eu-origin-caption]')!;
  const legend=root.querySelector<HTMLElement>('[data-eu-origin-legend]')!;
  const mini=root.querySelector<SVGSVGElement>('[data-eu-origin-map]')!;
  const originImage=root.querySelector<SVGImageElement>('[data-eu-origin-image]');
  if(originImage)originImage.style.display='none';
  overlay.replaceChildren();legend.replaceChildren();mini.replaceChildren();mini.toggleAttribute('hidden',true);key.hidden=!source;
  mini.setAttribute('viewBox',`0 0 ${frame.width} ${frame.height}`);
  key.classList.remove('eu-origin-culture-reference');
  for(const name of ['euOriginCase','euOriginCategory','euOriginArea','euOriginGrain','euOriginBasin'])delete mini.dataset[name];
  key.querySelector('[data-eu-origin-status]')?.remove();
  for(const id of ['eu-origin-raster','eu-origin-fill','eu-origin-line','eu-origin-livestock-line','eu-origin-points'])if(map?.getLayer(id))map.removeLayer(id);
  if(map?.getSource('eu-origin'))map.removeSource('eu-origin');
  if(map?.getSource('eu-origin-image'))map.removeSource('eu-origin-image');
  if(!source){positionOrigin(root,key,false);sourceReading(root,key,false);return;}
  const layer=config.layers.find(l=>l.id===(source.layer==='overlay'?(source.returnLayer==='climate'?'wheat':source.returnLayer):source.layer));
  if(!layer){key.hidden=true;positionOrigin(root,key,false);sourceReading(root,key,false);return;}
  caption.textContent=`元の図：${layer.title} · ${layer.period} · ${layer.unit}`;
  mini.setAttribute('aria-label',`${layer.title}の元の分布図、${layer.period}、${layer.unit}。色は元の図の凡例に対応します。`);
  const addKey=(color:string,label:string)=>{const row=document.createElement('div'),swatch=document.createElement('span'),text=document.createElement('span');swatch.className='eu-swatch';swatch.style.background=color;text.textContent=label;row.append(swatch,text);legend.append(row);};
  if(source.layer==='ethnicity'||source.layer==='religion') {
    const kind=source.layer;
    const selection=cultureSelection({cultureCase:source.cultureCase??'',cultureCategory:source.cultureCategory??'',cultureArea:source.cultureArea??''},kind);
    if(!selection.state.cultureCase || !selection.category) {
      caption.textContent=`元の図：${layer.title} · 欧州全体 · 事例・回答分類未選択`;
      addKey(cultureColor(null),'回答分類未選択・未掲載（0%ではありません）');
      positionOrigin(root,key,false);sourceReading(root,key,false);return;
    }
    const grain=selection.censusCase.grain==='LAD'?'行政区（LAD2021）· 331地域':'全国値 · 1地域';
    caption.textContent=`元の図：${selection.topic.titleJa} · ${selection.topic.year}年 · ${grain} · ${selection.category.label} · ${selection.area?.name ?? '地域未選択'}（総人口比%）`;
    mini.setAttribute('aria-label',`${caption.textContent}。各地域のこの表の総人口に対する割合。欧州全域の分布ではありません。`);
    mini.dataset.euOriginCase=selection.censusCase.id;
    mini.dataset.euOriginCategory=selection.category.id;
    mini.dataset.euOriginArea=selection.area?.code ?? '';
    mini.dataset.euOriginGrain=selection.censusCase.grain;
    key.classList.add('eu-origin-culture-reference');
    mini.removeAttribute('hidden');positionOrigin(root,key,true);caption.after(mini);
    cultureLegend.forEach(item=>addKey(item.color,item.label));
    const status=root.ownerDocument.createElement('p');status.dataset.euOriginStatus='';status.setAttribute('role','status');
    status.textContent='元の地域境界を読み込んでいます。色はこの表の総人口に対する割合です。';mini.after(status);
    sourceReading(root,key,true);
    const pathname=root.ownerDocument.location?.pathname??'/';
    const base=options.base??(pathname.includes('/atlas/europe/')?pathname.split('/atlas/europe/')[0]+'/':'/');
    return (options.fetchCultureGeometry??fetchCaseGeometry)(selection.censusCase.id,{base}).then((geometry:CultureGeometry)=>{
      if(originGenerations.get(root)!==generation||!root.isConnected)return;
      const bounds=cultureBounds(geometry),[left,top]=project([bounds[0][0],bounds[1][1]]),[right,bottom]=project([bounds[1][0],bounds[0][1]]);
      const width=right-left,height=bottom-top,padding=Math.max(width,height)*.025;
      mini.setAttribute('viewBox',[left-padding,top-padding,width+padding*2,height+padding*2].join(' '));
      const features=caseMapData(europeCultureData,geometry,kind,selection.state).features;
      mini.replaceChildren(...features.map(feature=>{
        const p=feature.properties;
        const node=svg('path',{d:cultureGeometryPath(feature.geometry),fill:p.fill,'fill-rule':'evenodd',stroke:p.selected?'#841e37':'#f7f5eb','stroke-width':p.selected?'2.5':'.6','vector-effect':'non-scaling-stroke','data-eu-origin-culture-code':p.code,'data-eu-origin-culture-selected':String(p.selected)});
        node.append(svg('title',{},`${p.name}：${formatCultureShare(p.value)}、${p.year}年、${p.count===null?'人数なし':p.count+'人'}／${p.denominator===null?'総人口なし':p.denominator+'人'}。${selection.category.label}`));return node;
      }));
      status.remove();
    }).catch(()=>{
      if(originGenerations.get(root)!==generation||!root.isConnected)return;
      status.textContent='元の地域境界を表示できません。分類・対象年・選択地域は上記の元の図に対応しています。';
    });
  }
  const farm=farmingPresentation(source,config.farmingAreas.features.map(f=>f.properties));
  const sourceVisible=(f:{country:string})=>source.place?f.country===source.place:source.region==='all'||config.countries.find(c=>c.code===f.country)?.region===source.region;
  const feature=config.readings.find(f=>f.id===source.feature&&f.field==='industry'&&sourceVisible(f));
  const marks:any[]=[];
  if(farm.active) {
    positionOrigin(root,key,false);
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
    positionOrigin(root,key,false);
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
    // Point locations can sit on the original density image. Two coloured
    // raster/indicator layers instead keep separate maps and legends.
    const densityBehindHubs=layer.id==='density'&&target.id==='hubs'&&!!originImage;
    mini.toggleAttribute('hidden',densityBehindHubs);mini.append(svg('rect',{width:String(frame.width),height:String(frame.height),fill:'#e7eff1'}));
    positionOrigin(root,key,!densityBehindHubs);
    // Read each source as title → registered map → complete colour key.
    if(!densityBehindHubs&&caption.nextSibling!==mini)caption.after(mini);
    if(densityBehindHubs) {
      originImage!.setAttribute('href',layer.image!);originImage!.style.display='';
      if(map?.getLayer('land')) {
        map.addSource('eu-origin-image',{type:'image',url:layer.image!,coordinates:[[-25,73],[65,73],[65,32],[-25,32]]});
        map.addLayer({id:'eu-origin-raster',type:'raster',source:'eu-origin-image',paint:{'raster-resampling':'nearest','raster-opacity':1,'raster-fade-duration':0}},'context');
      }
    }
    const ind=config.statistics.indicators.find(i=>i.id===layer.indicator);
    for(const f of config.geography.features)mini.append(svg('path',{d:viewPath(f.geometry),fill:ind?layerColor(layer,ind.values[f.properties.code]?.['2023']??null):'#edece5',stroke:'#536a6f','stroke-width':'.7','fill-rule':'evenodd'}));
    if(layer.image)mini.append(svg('image',{href:layer.image,x:'0',y:'0',width:String(frame.width),height:String(frame.height),preserveAspectRatio:'none'}));
    if(layer.id==='climate')for(const f of config.climateWater.features)mini.append(svg('path',{d:viewPath(f.geometry),fill:'#e7eff1',stroke:'#8ca6aa','stroke-width':'.7','fill-rule':'evenodd'}));
    for(const f of config.geography.features)mini.append(svg('path',{d:viewPath(f.geometry),fill:'none',stroke:'#536a6f','stroke-width':'.7','fill-rule':'evenodd'}));
    const originalMap=densityBehindHubs?overlay:mini;
    if(source.place)for(const f of config.geography.features.filter(f=>f.properties.code===source.place)) {
      originalMap.append(svg('path',{d:viewPath(f.geometry),fill:'none',stroke:'#173c48','stroke-width':'2.5','vector-effect':'non-scaling-stroke','data-eu-origin-place':source.place}));
      if(densityBehindHubs)marks.push({type:'Feature',properties:{color:'#173c48'},geometry:f.geometry});
    }
    const point=layer.id==='climate'?config.cities.find(c=>c.id===source.city):layer.field==='population'?config.populationCities.find(c=>c.id===source.feature&&sourceVisible(c)):undefined;
    if(point) {
      const matrix=densityBehindHubs?root.querySelector<SVGSVGElement>('[data-eu-static]')?.getScreenCTM?.():undefined;
      const [x,y]=project(point.coordinates),scale=matrix?Math.max(.01,Math.hypot(matrix.a,matrix.b)):Math.max(.01,(mini.clientWidth||240)/frame.width);
      originalMap.append(svg('circle',{cx:String(x),cy:String(y),r:String(6/scale),fill:'#fff0ba',stroke:'#173c48','stroke-width':'2','vector-effect':'non-scaling-stroke','data-eu-origin-point':point.id}));
      originalMap.append(svg('text',{x:String(x+10/scale),y:String(y-8/scale),fill:'#173c48',stroke:'#fffdf2','stroke-width':String(3/scale),'paint-order':'stroke','font-size':String(12/scale)},point.name));
      if(densityBehindHubs)marks.push({type:'Feature',properties:{color:'#173c48'},geometry:{type:'Point',coordinates:point.coordinates}});
      caption.textContent+=` · 選択：${point.name}`;
      addKey('#fff0ba',`${point.name}：元の選択地点（位置）`);
    }
    const labels=layer.labels??(layer.breaks?[...layer.breaks.map((value,i)=>i===0?`${value}未満`:`${layer.breaks![i-1]}〜${value}未満`),`${layer.breaks.at(-1)}以上`]:[]);
    labels.forEach((label,i)=>addKey(layer.colors![i],layer.id==='drainage'?`識別色 ${String.fromCharCode(65+i)}`:label));
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
  sourceReading(root,key,!mini.hasAttribute('hidden'));
  if(layer.id==='drainage') {
    const selectedIndex=europeDrainageIndexForBasin(source.basin);
    caption.textContent=`元の図：${layer.title} · v1.0（2019年公開） · 識別色（量の大小なし）${selectedIndex===undefined?'':` · 輪郭：HYBAS_ID ${source.basin}`}`;
    mini.setAttribute('aria-label',`${caption.textContent}。輪郭は表示格子上の選択区画です。名前のある河川の流域全体とは限りません。`);
    if(selectedIndex===undefined||!layer.grid)return;
    mini.dataset.euOriginBasin=source.basin!;
    const status=root.ownerDocument.createElement('p');status.dataset.euOriginStatus='';status.setAttribute('role','status');status.textContent='元の選択区画の輪郭を読み込んでいます。';mini.after(status);
    return (options.fetchDrainageValues??drainageValues)(layer.grid).then(values=>{
      if(originGenerations.get(root)!==generation||!root.isConnected)return;
      const outline=europeDrainageOutline(values,selectedIndex),canvas=root.ownerDocument.createElement('canvas');
      canvas.width=europeDrainageGrid.width;canvas.height=europeDrainageGrid.height;
      const context=canvas.getContext('2d');if(!context)throw new Error('Original drainage outline unavailable');
      const pixels=context.createImageData(canvas.width,canvas.height);pixels.data.set(outline.rgba);context.putImageData(pixels,0,0);
      mini.append(svg('image',{href:canvas.toDataURL('image/png'),x:'0',y:'0',width:String(frame.width),height:String(frame.height),preserveAspectRatio:'none','data-eu-origin-drainage-outline':source.basin!,'aria-label':`HYBAS_ID ${source.basin}：表示格子上の選択区画の輪郭。河川の流域全体とは限りません。`}));
      if(outline.transparent)status.textContent='選択区画は、この表示範囲に有効な画素がありません。';else status.remove();
    }).catch(()=>{
      if(originGenerations.get(root)!==generation||!root.isConnected)return;
      status.textContent='選択区画の輪郭を表示できません。元の識別色とHYBAS_IDは上記の選択に対応しています。';
    });
  }
}
