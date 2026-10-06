import {canadaLegacyFrame,projectCanadaComparison} from '../lib/atlas-canada-map-presentation';
import {renderPopulationNatureComparison} from './atlas-canada-population-comparison';
import {hydrateCanadaPopulationGeometry} from './atlas-canada-population-geometry-loader';
import {renderIndustryNatureComparison} from './atlas-canada-industry-comparison';
import {renderCanadaCropNatureComparison} from './atlas-canada-crop-nature-comparison';
import {readCanadaNatureState,writeCanadaNatureState,type CanadaNatureState} from '../lib/atlas-canada-nature';
import {initCanadaLandform} from './atlas-canada-landform';
import physiography from '../data/atlas/canada/physiography.json';
import {selectedWaterReading} from '../data/atlas/canada/reading';
import {initCanadaNaturalLayer} from './atlas-canada-natural-layer';
import {readCanadaNaturalLayerState,writeCanadaNaturalLayerState,type NaturalLayer,type NaturalLayerState} from '../lib/atlas-canada-natural-state';
import {initCanadaWaterResources} from './atlas-canada-water-resources';
import {canadaWaterFullFrame, readCanadaWaterState,writeCanadaWaterState,type CanadaWaterState} from '../lib/atlas-canada-water-state';
import {renderCanadaWaterOrigin} from './atlas-canada-water-origin';
export function initCanadaNature(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-canada-config]')!.textContent!);
 const ids=config.cities.map((c:any)=>c.id),waters=config.waters;
 const $=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const map=$<SVGSVGElement>('[data-canada-map]');
 let state=readCanadaNatureState(new URL(location.href),ids,waters);
 const waterHost=root.querySelector<HTMLElement>('[data-canada-water-resources]');
 const waterConfig=waterHost?JSON.parse(waterHost.querySelector('[data-canada-water-resource-config]')!.textContent!):null;
 const waterGroups=Object.fromEntries(Object.entries(waterConfig?.datasets??waterConfig?.layers??{}).map(([topic,value]:[string,any])=>[topic,[...value.groups,...(value.areas??[])].map((g:any)=>g.id)]));
 let waterState=readCanadaWaterState(new URL(location.href),waterGroups);
 const waterMap=waterHost?initCanadaWaterResources(waterHost):null;
 const landformHost=root.querySelector<HTMLElement>('[data-canada-landform]');
 const landformMap=landformHost?initCanadaLandform(landformHost):null;
 const naturalLayers=['climate','elevation'] as const;
 const naturalHosts=Object.fromEntries(naturalLayers.map(layer=>[layer,root.querySelector<HTMLElement>(`[data-canada-natural-layer="${layer}"]`)]));
 const naturalMaps=Object.fromEntries(naturalLayers.map(layer=>[layer,naturalHosts[layer]?initCanadaNaturalLayer(naturalHosts[layer]!,{deferStart:true}):null]));
 let naturalStates=Object.fromEntries(naturalLayers.map(layer=>[layer,readCanadaNaturalLayerState(new URL(location.href),layer,(config.layers?.[layer]?.groups??[]).map((g:any)=>g.id))])) as Record<NaturalLayer,NaturalLayerState>;
 const full=[...canadaWaterFullFrame];
 function render(){
  const waterResource=state.view==='water'&&waterState.topic!=='surface';
  root.classList.toggle('is-water-resource',waterResource);
  const waterFamily=['precipitation','drainage'].includes(waterState.topic)?waterState.topic:'surface';
  root.classList.toggle('is-water-river-family',state.view==='water'&&waterFamily==='surface');
  const waterSubtopics=root.querySelector<HTMLElement>('[data-canada-water-subtopics]');if(waterSubtopics){waterSubtopics.hidden=state.view!=='water'||waterFamily!=='surface';const reading=waterResource?waterHost?.querySelector('.canada-water-reading'):root.querySelector('[data-canada-reading=water]');if(reading&&waterSubtopics.parentElement!==reading)reading.prepend(waterSubtopics);}
  for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-family]'))button.setAttribute('aria-pressed',String(button.dataset.canadaWaterFamily===waterFamily));
  if(waterHost)waterHost.hidden=!waterResource;
  const originalMap=root.querySelector<HTMLElement>('[data-canada-original-map-column]'),originalReading=root.querySelector<HTMLElement>('[data-canada-original-reading]');
  if(originalMap)originalMap.hidden=waterResource;if(originalReading)originalReading.hidden=waterResource;
  for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-topic]'))button.setAttribute('aria-pressed',String(button.dataset.canadaWaterTopic===waterState.topic));
  waterMap?.render(waterResource?waterState:{...waterState,topic:'surface'});
  const forestryBack=root.querySelector<HTMLAnchorElement>('[data-canada-forestry-return]'),savedForestry=new URL(location.href).searchParams.get('forestryReturn');
  if(forestryBack){forestryBack.hidden=!savedForestry;if(savedForestry){const back=new URL(forestryBack.getAttribute('href')!,location.href),params=new URLSearchParams(savedForestry);back.search='';for(const key of ['year','province','compare','metric','cover','region','zoom']){const value=params.get(key);if(value)back.searchParams.set(key,value);}forestryBack.href=back.href;}}
  const forestContext=root.querySelector<HTMLElement>('[data-canada-forest-context]'),forestMap=root.querySelector<SVGElement>('[data-canada-forest-context-map]'),forestLegend=root.querySelector<HTMLElement>('[data-canada-forest-context-legend]');
  if(forestContext&&forestMap&&forestLegend){
   forestContext.hidden=!savedForestry;root.classList.toggle('is-learning-comparison',!!savedForestry);forestMap.style.display=savedForestry&&state.view!=='landform'?'':'none';forestLegend.hidden=!savedForestry||state.view==='landform';
   const text=forestContext.querySelector<HTMLElement>('[data-canada-forest-context-text]')!;
   const waterText=state.water&&state.water!=='Fraser'?`現在は${state.water}${state.only?'だけ':'を選択して全水系'}を表示しています。林業の比較入口はFraser川とBCの針葉樹林です。Fraserを選ぶと、森林と海岸の位置関係へ戻れます。`:'針葉樹林とFraser川の位置を重ね、森林と海岸のつながりを照合します。木材輸送には道路・港も必要です。';
   text.textContent=state.view==='elevation'?'山地の高さをETOPOの等高線で確かめます。森林の重ね図と沿岸の観測点へは「気候区分・都市」で戻れます。':state.view==='landform'?'山地と海岸を地形図で確かめます。針葉樹林と観測点の重ね図へは「都市の気候」で戻れます。':state.view==='water'?waterText:state.city==='vancouver'?'Vancouverの温和な冬・秋冬の雨を、沿岸の針葉樹林と比べます。':'観測点を切り替えています。元の問いはVancouverの沿岸気候と針葉樹林の関係です。Vancouverで沿岸の事例へ戻れます。';
  }
  const industryComparison=renderIndustryNatureComparison(root,config,state),populationComparison=renderPopulationNatureComparison(root,config,state),cropComparison=renderCanadaCropNatureComparison(root,state);root.classList.toggle('is-learning-comparison',!!savedForestry||industryComparison||populationComparison||cropComparison);root.classList.toggle('is-crop-comparison',cropComparison);
  renderCanadaWaterOrigin(root,waterState);
  const comparison=!!savedForestry||industryComparison||populationComparison||cropComparison;
  const classifiedClimate=state.view==='climate'&&!comparison&&!!naturalMaps.climate;
  root.classList.toggle('is-classified-climate',classifiedClimate);
  root.classList.toggle('is-elevation-reading',state.view==='elevation');
  for(const layer of naturalLayers){const host=naturalHosts[layer];if(host){host.hidden=layer==='climate'?!classifiedClimate:state.view!=='elevation';naturalMaps[layer]?.render({...naturalStates[layer],city:state.city});}}
  const zoneReading=root.querySelector<HTMLElement>('[data-canada-zone-reading]');if(zoneReading)zoneReading.hidden=!classifiedClimate;
  const zone=config.layers?.climate?.groups?.find((g:any)=>g.id===naturalStates.climate.selected);
  const zoneTitle=root.querySelector<HTMLElement>('[data-canada-zone-title]'),zoneText=root.querySelector<HTMLElement>('[data-canada-zone-text]'),zoneCity=root.querySelector<HTMLElement>('[data-canada-zone-city]');
  if(zoneTitle)zoneTitle.textContent=zone?`${zone.id} ${zone.name}`:'気候区分と都市の季節を比べる';
  if(zoneText)zoneText.textContent=zone?.description??'色は1991–2020年のケッペン区分。冬の寒さ・夏の長さ・雨の季節配分を、都市の雨温図と照合します。';
  const citySample=config.layers?.climate?.stations?.find((s:any)=>s.id===state.city);
  if(zoneCity)zoneCity.textContent=`${config.cities.find((c:any)=>c.id===state.city).name}の元0.1°格子：${citySample?.class??citySample?.code??'未収録'}${citySample?.boundaryCandidates?.length>1?`（${citySample.boundaryCandidates.join('/')}の格子境界）`:''}。雨温図はECCCの一点の平年値です。`;
  const elevation=config.layers?.elevation?.groups?.find((g:any)=>g.id===naturalStates.elevation.selected);
  const elevationTitle=root.querySelector<HTMLElement>('[data-canada-elevation-title]'),elevationText=root.querySelector<HTMLElement>('[data-canada-elevation-text]');
  if(elevationTitle)elevationTitle.textContent=elevation?`${elevation.name}の等高線を読む`:'西部山地と内陸の高さを、等高線で読む';
  if(elevationText)elevationText.textContent=elevation?.id==='500'?`500 mの地点は西部の山地にも内陸の平原にもあります。西部でより高い等高線が近づく所と比べます。${elevation.description}`:elevation?.description??'等高線は同じ標高を結ぶ線です。西部の高い山地と内陸・海岸の位置を比べ、斜面や山越えが交通・水の流れに関わる場所を確かめます。';
  root.classList.toggle('is-landform-reading',state.view==='landform');
  root.classList.toggle('is-water-reading',state.view==='water');
  for(const detail of root.querySelectorAll<HTMLDetailsElement>('[data-canada-general-reading]')){const context=String(comparison);if(detail.dataset.comparison!==context){detail.open=!comparison&&!detail.closest('[data-canada-reading="landform"],[data-canada-reading="water"]');detail.dataset.comparison=context;}}
  $<HTMLSelectElement>('[data-canada-city]').value=state.city;
  $<HTMLSelectElement>('[data-canada-compare]').value=state.compare??'';
  for(const option of $<HTMLSelectElement>('[data-canada-compare]').options)option.disabled=option.value===state.city;
  for(const el of root.querySelectorAll<HTMLElement>('[data-canada-city-button],[data-canada-map-city]'))el.setAttribute('aria-pressed',String((el.dataset.canadaCityButton??el.dataset.canadaMapCity)===state.city));
  for(const button of root.querySelectorAll<HTMLElement>('[data-canada-view]'))button.setAttribute('aria-pressed',String(button.dataset.canadaView===state.view));
  for(const panel of root.querySelectorAll<HTMLElement>('[data-canada-reading]'))panel.hidden=panel.dataset.canadaReading!==state.view;
  for(const card of root.querySelectorAll<HTMLElement>('[data-canada-climate-card]'))card.hidden=![state.city,state.compare].includes(card.dataset.canadaClimateCard!);
  $('.canada-climate-cards').classList.toggle('is-comparing',!!state.compare);
  $('[data-canada-locator]').hidden=classifiedClimate||state.view==='elevation'||state.view==='landform'||cropComparison&&state.view==='climate';
  $('[data-canada-physical]').hidden=state.view!=='landform';
  if(landformHost){landformHost.hidden=state.view!=='landform';landformMap?.render({selected:state.landform,only:state.landformOnly,bounds:state.landformBounds});}
  const landform=physiography.regions.find(region=>region.id===state.landform);
  const landformTitle=root.querySelector<HTMLElement>('[data-canada-landform-reading-title]'),landformText=root.querySelector<HTMLElement>('[data-canada-landform-reading-text]');
  if(landformTitle)landformTitle.textContent=landform?.name??'山地・平原・低地を、場所で見分ける';
  if(landformText)landformText.textContent=landform?.description??'西部の山地、中央の平原、東部の盾状地を比較します。地図か凡例で地域を選ぶと、その範囲と説明が対応します。';
  const cityList=root.querySelector<HTMLElement>('.canada-city-list');if(cityList)cityList.hidden=classifiedClimate||state.view==='water'||state.view==='landform'||state.view==='elevation';
  $('[data-canada-water-controls]').hidden=state.view!=='water';
  const group=$<SVGGElement>('[data-canada-water-layers]');group.setAttribute('display',state.view==='water'?'':'none');group.removeAttribute('hidden');
  $<HTMLSelectElement>('[data-canada-water]').value=state.water??'';
  $<HTMLInputElement>('[data-canada-only]').checked=state.only;
  $<HTMLInputElement>('[data-canada-only]').disabled=!state.water;
  const waterGroup=root.dataset.canadaIndustryWaterGroup==='great-lakes',comparisonWaters=['St. Lawrence','Lake Superior','Lake Ontario','Lake Huron','Lake Erie','Lake Michigan'];
  const onlyLabel=root.querySelector<HTMLElement>('[data-canada-only-label]');if(onlyLabel)onlyLabel.textContent=waterGroup?'比較する五大湖5湖・St. Lawrence上流だけを表示':'選んだ川・湖だけを表示';
  const selectedWater=state.water?selectedWaterReading[state.water]:null;
  const waterTitle=root.querySelector<HTMLElement>('[data-canada-water-reading-title]'),waterText=root.querySelector<HTMLElement>('[data-canada-water-reading-text]'),waterScope=root.querySelector<HTMLElement>('[data-canada-water-reading-scope]');
  if(waterTitle)waterTitle.textContent=waterGroup?'五大湖・セントローレンス上流と大西洋側':selectedWater?selectedWater.name:'湖と川を、海までつないで読む';
  if(waterText)waterText.textContent=waterGroup?'五大湖とセントローレンス上流の位置を、産業の州別構成と比べます。この図は航路や輸送量を示しません。':selectedWater?.body??'湖や川を選び、内陸から海への出口と位置を確かめます。';
  if(waterScope)waterScope.textContent=state.only&&state.water?'選択水域だけを表示中です。つながる他の湖・川は「すべての水系へ戻す」で照合できます。線の太さは流量、湖の色は水質ではありません。':'線は川、面は湖の概略形状です。流量・水質・地下水・流域境界の地図ではありません。';
  const waterLabels=root.querySelector<SVGElement>('[data-canada-industry-water-labels]');if(waterLabels)waterLabels.style.display=waterGroup?'':'none';
  for(const ocean of root.querySelectorAll<SVGElement>('.canada-ocean'))ocean.style.display=waterGroup?'none':'';
  const mapHeading=root.querySelector<HTMLElement>('.canada-map-title h2');if(mapHeading){mapHeading.dataset.original??=mapHeading.textContent!;mapHeading.textContent=waterGroup?'五大湖・川上流・大西洋側':mapHeading.dataset.original;}
  for(const point of root.querySelectorAll<SVGElement>('[data-canada-map-city]'))point.style.display=waterGroup?'none':'';
  if(waterGroup)$('[data-canada-position-caption]').textContent='五大湖5湖・St. Lawrence上流・大西洋側の位置を比較します。気候観測点はこの表示では非表示です。「都市の気候」で観測点を確認できます。面積や航路の図ではありません。';
  const mapDesc=map.querySelector<SVGDescElement>('desc');if(mapDesc){mapDesc.dataset.original??=mapDesc.textContent!;mapDesc.textContent=waterGroup?'五大湖5湖とセントローレンス川上流を赤い縁・線で強調。大西洋側も表示しますが、下流の河道・航路は描いていません。観測地点はこの比較では非表示。':mapDesc.dataset.original;}
  for(const shape of root.querySelectorAll<SVGPathElement>('[data-canada-water-shape]')){
   const selected=waterGroup?comparisonWaters.includes(shape.dataset.canadaWaterShape!):shape.dataset.canadaWaterShape===state.water;
   shape.style.display=state.only&&state.water&&!selected?'none':'';shape.classList.toggle('is-selected',selected);
  }
  map.setAttribute('viewBox',canadaLegacyFrame(state.frame).join(' '));
  for(const selector of ['[data-canada-industry-context-map]','[data-canada-population-context-map]']){const group=root.querySelector<SVGElement>(selector);if(group)projectCanadaComparison(group);}
  const name=config.cities.find((c:any)=>c.id===state.city).name;
  $('[data-canada-announcement]').textContent=state.view==='landform'?`${landform?.name??'七つの地形地域'}${state.landformOnly?'だけ':''}を表示。`:state.view==='elevation'?`${elevation?.name??'標高の等高線'}を表示。`:`${name}${state.compare?'と比較':''}。${({climate:'都市の気候',landform:'地形地域',water:'湖と河川'})[state.view]}を表示。`;
 }
 function update(patch:Partial<CanadaNatureState>){state={...state,...patch};if(state.compare===state.city)state.compare=null;history.pushState(null,'',writeCanadaNatureState(new URL(location.href),state));render();}
 function updateWater(patch:Partial<CanadaWaterState>){waterState={...waterState,...patch};state={...state,view:'water'};history.pushState(null,'',writeCanadaWaterState(writeCanadaNatureState(new URL(location.href),state),waterState));render();}
 waterHost?.addEventListener('canada-water-update',event=>updateWater((event as CustomEvent<Partial<CanadaWaterState>>).detail));
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-water-family]'))button.addEventListener('click',()=>{const family=button.dataset.canadaWaterFamily!,currentFamily=['precipitation','drainage'].includes(waterState.topic)?waterState.topic:'surface';if(state.view==='water'&&family===currentFamily)return;const topic=family==='surface'&&['surface','groundwater','aquifers'].includes(waterState.topic)?waterState.topic:family as CanadaWaterState['topic'];updateWater({topic,area:null,only:false,frame:null});});
 for(const button of root.querySelectorAll<HTMLElement>('.country-water-subtopics [data-canada-water-topic]'))button.addEventListener('click',()=>{const topic=button.dataset.canadaWaterTopic as CanadaWaterState['topic'];if(state.view==='water'&&topic===waterState.topic)return;updateWater({topic,area:null,only:false,frame:null});});
 const select=(city:string)=>update({city});
 function updateNatural(layer:NaturalLayer,patch:Partial<NaturalLayerState>){naturalStates[layer]={...naturalStates[layer],...patch};history.pushState(null,'',writeCanadaNaturalLayerState(new URL(location.href),layer,naturalStates[layer]));render();}
 for(const layer of naturalLayers){const host=naturalHosts[layer];if(!host)continue;
  host.addEventListener('canada-natural-select',event=>updateNatural(layer,{selected:(event as CustomEvent).detail.id}));
  host.addEventListener('canada-natural-only',event=>updateNatural(layer,{only:(event as CustomEvent).detail.only}));
  host.addEventListener('canada-natural-camera',event=>updateNatural(layer,{bounds:(event as CustomEvent).detail.bounds}));
  host.addEventListener('canada-natural-reset',()=>updateNatural(layer,{selected:null,only:false,bounds:null}));
  host.addEventListener('canada-natural-city',event=>select((event as CustomEvent).detail.id));
 }
 landformHost?.addEventListener('canada-landform-select',event=>update({landform:(event as CustomEvent<{id:string}>).detail.id}));
 landformHost?.addEventListener('canada-landform-only',event=>update({landformOnly:(event as CustomEvent<{only:boolean}>).detail.only}));
 landformHost?.addEventListener('canada-landform-camera',event=>update({landformBounds:(event as CustomEvent<{bounds:[number,number,number,number]|null}>).detail.bounds}));
 landformHost?.addEventListener('canada-landform-reset',()=>update({landform:null,landformOnly:false,landformBounds:null}));
 $<HTMLSelectElement>('[data-canada-city]').addEventListener('change',e=>select((e.target as HTMLSelectElement).value));
 $<HTMLSelectElement>('[data-canada-compare]').addEventListener('change',e=>update({compare:(e.target as HTMLSelectElement).value||null}));
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-city-button],[data-canada-map-city]')){
  const action=()=>select((button.dataset.canadaCityButton??button.dataset.canadaMapCity)!);
  button.addEventListener('click',action);
  if(button.dataset.canadaMapCity)button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});
 }
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-view]'))button.addEventListener('click',()=>update({view:button.dataset.canadaView as CanadaNatureState['view']}));
 $<HTMLSelectElement>('[data-canada-water]').addEventListener('change',e=>update({water:(e.target as HTMLSelectElement).value||null,only:false}));
 $<HTMLInputElement>('[data-canada-only]').addEventListener('change',e=>update({only:(e.target as HTMLInputElement).checked}));
 $('[data-canada-all-water]').addEventListener('click',()=>update({water:null,only:false}));
 $('[data-canada-reset]').addEventListener('click',()=>update({frame:null}));
 $('[data-canada-focus]').addEventListener('click',()=>{const p=config.cities.find((c:any)=>c.id===state.city).point;update({frame:[p[0]-150,p[1]-100,300,200]});});
 for(const button of root.querySelectorAll<HTMLElement>('[data-canada-zoom]'))button.addEventListener('click',()=>{
  const [x,y,w,h]=state.frame??full,factor=button.dataset.canadaZoom==='in'?.75:1/.75;
  const nw=Math.min(config.width,Math.max(30,w*factor)),nh=Math.min(config.height,Math.max(20,h*factor));
  update({frame:nw===config.width?null:[Math.max(0,Math.min(config.width-nw,x+(w-nw)/2)),Math.max(0,Math.min(config.height-nh,y+(h-nh)/2)),nw,nh]});
 });
 window.addEventListener('popstate',()=>{state=readCanadaNatureState(new URL(location.href),ids,waters);waterState=readCanadaWaterState(new URL(location.href),waterGroups);naturalStates=Object.fromEntries(naturalLayers.map(layer=>[layer,readCanadaNaturalLayerState(new URL(location.href),layer,(config.layers?.[layer]?.groups??[]).map((g:any)=>g.id))])) as Record<NaturalLayer,NaturalLayerState>;render();void hydrateCanadaPopulationGeometry(root,'[data-canada-config]',{config,onReady:render,onError:render});});
 render();
 void hydrateCanadaPopulationGeometry(root,'[data-canada-config]',{config,onReady:render,onError:render});
}
