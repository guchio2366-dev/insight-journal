import {russiaIndustryMarks} from '../data/atlas/russia-industry-reading';
import {withBase} from '../lib/urls';
import {createRegionalClimateSelection} from './atlas-regional-climate-selection';
import {
 russiaFields,russiaRegions,russiaThemes,russiaOverviewReadings,createRussiaState,
 getRussiaTheme,getRussiaLayer,renderRussiaScene,renderRussiaLegend,renderRussiaFarmingKey,getRussiaFarmingGeography,
 russiaCoverage,getRussiaComparisonReading,russiaBoundarySources,
} from '../data/atlas/russia-learning';

type RussiaField=keyof typeof russiaFields;
type RussiaState=ReturnType<typeof createRussiaState>;
type RussiaSource={title:string;url:string;note?:string};
const htmlEscape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ownKeys=['theme','layer','place','scope','view','compare','reading','industryLocation'];

const climateShortNames:Record<string,string>={BWk:'低温砂漠',BSk:'低温半乾燥',Cfa:'温暖湿潤',Cfb:'西岸海洋性',Dsc:'冷帯夏乾冷夏',Dsd:'冷帯夏乾厳冬',Dwa:'冷帯冬乾暑夏',Dwb:'冷帯冬乾暖夏',Dwc:'冷帯冬乾冷夏',Dwd:'冷帯冬乾厳冬',Dfa:'冷帯湿潤暑夏',Dfb:'冷帯湿潤暖夏',Dfc:'冷帯湿潤冷夏',Dfd:'冷帯湿潤厳冬',ET:'ツンドラ',EF:'氷雪'};
export function renderRussiaWorkspaceLegend(layer:ReturnType<typeof getRussiaLayer>):string {
 if(layer.field==='agriculture')return renderRussiaFarmingKey(layer);
 return renderRussiaLegend(layer.id==='climate'?{...layer,legend:layer.legend.map(item=>{const code=item.label.split(' ')[0];return {...item,label:climateShortNames[code]?code+climateShortNames[code]:item.label};})}:layer);
}

export function initRussiaLearningAtlas(root:HTMLElement):void {
 if(root.dataset.russiaReady==='true')return;
 const field=root.dataset.field as RussiaField;
 let state=createRussiaState(location.search,field);
 const overview=root.dataset.russiaOverview==='true';
 const climateSelection=createRegionalClimateSelection(root,'russia',()=>!overview&&field==='nature'&&state.layer==='climate'&&!state.comparison,mutate=>update(mutate));
 if(overview){state.layer='cities';if(!new URLSearchParams(location.search).has('compare'))state.compareLayer='density';}
 const isSelectedReading=()=>!!state.industryLocation||new URLSearchParams(location.search).get('reading')==='selection'||state.place!=='all'||state.scope!=='all'||(field==='agriculture'&&state.layer!=='farming-all');
 let selected=isSelectedReading();
 const fieldOverview=russiaOverviewReadings[field];
 if(field==='industry'&&!overview){const readings=root.querySelector('.russia-learning-detailed-readings');if(readings)root.querySelector('.russia-reading-scroll')?.prepend(readings);}
 const one=<T extends HTMLElement=HTMLElement>(hook:string)=>root.querySelector<T>(`[data-${hook}]`)!;
 const text=(hook:string,value:string)=>{one(hook).textContent=value;};
 const selectedName=()=>russiaRegions.find(region=>region.code===state.place)?.name??'ロシア全域';
 const targetName=()=>state.scope==='region'?selectedName():state.scope==='theme'?getRussiaTheme(state).title:'ロシア全域';
 const serialized=(s:RussiaState,href=location.href)=>{
  const url=new URL(href,location.href);
  climateSelection.serialize(url,s.field==='nature'&&s.layer==='climate'&&!s.comparison&&url.pathname.includes('/nature/'));
  for(const key of ownKeys)url.searchParams.delete(key);
  url.searchParams.set('theme',s.theme);url.searchParams.set('layer',s.layer);
  url.searchParams.set('place',s.place);url.searchParams.set('scope',s.scope);
  if(s.comparison)url.searchParams.set('view','comparison');
  url.searchParams.set('compare',s.compareLayer);
  if(selected)url.searchParams.set('reading','selection');
  if(s.field==='industry'&&s.layer==='places'&&s.industryLocation)url.searchParams.set('industryLocation',s.industryLocation);
  const params=new URLSearchParams(location.search);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}
  return url;
 };
 const chooseRegionTheme=()=>{
  if(state.place==='all'||getRussiaTheme(state).regionCodes.some(code=>code===state.place))return;
  const suitable=russiaThemes.find(theme=>theme.field===field&&theme.regionCodes.some(code=>code===state.place)&&theme.defaultLayer===state.layer);
  if(suitable){state.theme=suitable.id;}
 };
 const scene=(hook:string,id:string)=>{
  const el=one(hook),bounds=el.getBoundingClientRect();
  const layer=getRussiaLayer(id,state);
   el.innerHTML=renderRussiaScene(layer,state,hook,{width:bounds.width||640,height:bounds.height||320});
   el.querySelector('.russia-map-captions')!.insertAdjacentHTML('beforeend',`<span class="russia-map-caption">${htmlEscape(layer.period+'・'+layer.unit)}</span>`);
 };
 const sources=(items:RussiaSource[])=>{
  const unique=[...new Map(items.map(source=>[source.url+'|'+source.title,source])).values()];
  one('source-list').innerHTML=unique.map(source=>`<div class="russia-learning-citation"><a href="${htmlEscape(source.url)}">${htmlEscape(source.title)}</a>${source.note?`<p>${htmlEscape(source.note)}</p>`:''}</div>`).join('');
 };
  const render=()=>{
   const active=document.activeElement as Element|null;
   const focusedIndustry=active?.closest<SVGElement>('[data-russia-industry-location]')?.dataset.russiaIndustryLocation;
   const focusedMarker=active&&root.contains(active)?active.closest<SVGElement>('[data-region-marker]'):null;
   const focusedScene=focusedMarker?.closest<HTMLElement>('[data-primary-map],[data-original-map],[data-comparison-map]');
   const focusedHook=focusedScene?.hasAttribute('data-primary-map')?'primary-map':focusedScene?.hasAttribute('data-original-map')?'original-map':focusedScene?'comparison-map':undefined;
   const focusedPlace=focusedMarker?.dataset.mapPlace;
  const theme=getRussiaTheme(state),layer=getRussiaLayer(state.layer,state),compare=getRussiaLayer(state.compareLayer,state);
  const comparisonReading=getRussiaComparisonReading(state);
  const contextualReading=selected&&layer.id!=='farming-all'&&(layer.field!=='agriculture'||theme.defaultLayer===layer.id)&&(state.place==='all'||theme.regionCodes.includes(state.place));
  one<HTMLSelectElement>('place').value=state.place;
  one<HTMLSelectElement>('layer').value=state.layer;
  const distribution=root.querySelector<HTMLSelectElement>('[data-distribution-layer]');if(distribution)distribution.value=state.layer;
  root.querySelectorAll<HTMLButtonElement>('[data-region-option]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.regionOption===state.place)));
  one<HTMLSelectElement>('compare-layer').value=state.compareLayer;
  root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button=>button.setAttribute('aria-pressed',String(selected&&button.dataset.theme===state.theme)));
  root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.scope===state.scope));
   button.disabled=button.dataset.scope==='region'&&state.place==='all';
  });
  one('normal-view').hidden=state.comparison;
  one('comparison-view').hidden=!state.comparison;
  for(const [prefix,item] of [['primary',layer],['original',layer],['comparison',compare]] as const){
   text(prefix+'-title',(prefix==='original'?'元の分布：':'')+item.title+(state.scope==='region'?' ・ '+targetName():''));
   text(prefix+'-period',item.period);
   text(prefix+'-unit',item.unit+(item.resolution?' ・ '+item.resolution:''));
   one(prefix+'-legend').innerHTML=prefix==='primary'&&!overview?renderRussiaWorkspaceLegend(item):renderRussiaLegend(item);
  }
  if(!overview){
   one('primary-legend-spacer').innerHTML=renderRussiaLegend(layer);
   text('current-legend-unit',layer.period+'・'+layer.unit);
   text('legend-resolution',layer.resolution??'');one('legend-resolution').hidden=!layer.resolution;
   one('key-legend').dataset.climateLegend=String(layer.id==='climate');
   one('climate-dictionary').hidden=layer.id!=='climate'&&layer.field!=='agriculture';
   one('primary-legend-definitions').innerHTML=renderRussiaLegend(layer);
  }
  text('reading-status',selected?'選んだ場所・分布の説明':'ロシアの概要');
  text('theme-title',!selected?(overview?'広い国土を、都市と分野の分布から読む':fieldOverview.title):contextualReading?theme.title:selectedName()+'の'+layer.title);text('takeaway',!selected?(overview?'欧州側・シベリア・極東を同じ表示枠で確かめ、自然条件に設備・交通・市場・社会を重ねて読む。都市中心の円は行政人口ではなく、固定された都市範囲の人口です。':fieldOverview.takeaway):contextualReading?theme.takeaway:fieldOverview.takeaway);
  text('explanation',contextualReading?theme.explanation:selected?selectedName()+'を選択しています。 '+layer.coverage:fieldOverview.explanation);text('social-context',theme.social);
  const industryPoint=field==='industry'&&state.layer==='places'?russiaIndustryMarks.find(m=>m.id===state.industryLocation):undefined;
  const industryReturn=root.querySelector<HTMLElement>('[data-russia-industry-return]');if(industryReturn)industryReturn.hidden=!industryPoint;
  if(industryPoint){text('theme-title',industryPoint.name);text('takeaway',industryPoint.reading??industryPoint.note);text('explanation',industryPoint.note);}
  if(field==='agriculture'&&!overview)text('geography-reading',getRussiaFarmingGeography(layer.id,state.place));
  text('coverage',russiaCoverage(layer,state));
  text('comparison',compare.title+'と比べる →');
  text('return','← '+layer.title+'へ戻る：'+targetName()+(state.scope!=='region'&&state.place!=='all'?'／選択：'+selectedName():''));
  text('comparison-explanation',comparisonReading.message);
  const shorter=one(layer.legend.length<=compare.legend.length?'original-map':'comparison-map').closest('.russia-learning-map-panel');
  shorter?.append(one('comparison-explanation'));
  sources([...russiaBoundarySources,...layer.sources,...(layer.field==='agriculture'?getRussiaLayer('farming-all').sources:[]),...theme.sources,...(state.comparison?[...compare.sources,...comparisonReading.sources]:[])]);
  root.querySelectorAll<HTMLAnchorElement>('[data-field-link]').forEach(link=>{
   const nextField=link.dataset.fieldLink as RussiaField;
   const available=russiaThemes.filter(item=>item.field===nextField);
   const nextTheme=available.find(item=>item.regionCodes.some(code=>code===state.place))??available[0];
   link.href=serialized({...state,field:nextField,theme:nextTheme.id,layer:nextField==='agriculture'?'farming-all':nextTheme.defaultLayer,compareLayer:nextTheme.comparisonLayer,comparison:false},withBase(`/atlas/russia/${nextField}/`)).href;
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-russia-overview-link]').forEach(link=>{link.href=serialized({...state,comparison:false},link.href).href;});
   if(state.comparison){scene('original-map',state.layer);scene('comparison-map',state.compareLayer);}
   else scene('primary-map',state.layer);
   climateSelection.render();
   if(focusedIndustry)root.querySelector<SVGElement>(`[data-russia-industry-location="${focusedIndustry}"]`)?.focus({preventScroll:true});
   if(focusedHook&&focusedPlace)one(focusedHook).querySelector<SVGElement>(`[data-region-marker][data-map-place="${focusedPlace}"]`)?.focus({preventScroll:true});
 };
 const update=(mutate:()=>void,focus?:string)=>{
  mutate();if(field!=='industry'||state.layer!=='places')delete state.industryLocation;history.pushState({},'',serialized(state));render();
  if(focus)one(focus).focus();
 };
 one<HTMLSelectElement>('place').addEventListener('change',event=>update(()=>{
  delete state.industryLocation;state.place=(event.target as HTMLSelectElement).value as RussiaState['place'];
  if(state.place==='all')state.scope='all';selected=state.place!=='all'||(field==='agriculture'&&state.layer!=='farming-all');chooseRegionTheme();
 }));
 const chooseLayer=(event:Event)=>update(()=>{
  state.layer=(event.target as HTMLSelectElement).value;selected=state.layer!=='farming-all'||state.place!=='all';
  const theme=russiaThemes.find(item=>item.field===field&&item.defaultLayer===state.layer);
  if(theme)state.theme=theme.id;
 });
 one<HTMLSelectElement>('layer').addEventListener('change',chooseLayer);
 root.querySelector<HTMLSelectElement>('[data-distribution-layer]')?.addEventListener('change',chooseLayer);
 one<HTMLSelectElement>('compare-layer').addEventListener('change',event=>update(()=>{state.compareLayer=(event.target as HTMLSelectElement).value;}));
 root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button=>button.addEventListener('click',()=>update(()=>{
  const theme=getRussiaTheme({...state,field,theme:button.dataset.theme!});
  delete state.industryLocation;state.theme=theme.id;state.layer=theme.defaultLayer;selected=true;
 })));
 root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(button=>button.addEventListener('click',()=>update(()=>{
  state.scope=button.dataset.scope as RussiaState['scope'];selected=state.scope!=='all'||state.place!=='all'||(field==='agriculture'&&state.layer!=='farming-all');
  if(state.scope==='region')chooseRegionTheme();
 })));
 one('comparison').addEventListener('click',()=>update(()=>{state.comparison=true;},'return'));
 one('return').addEventListener('click',()=>update(()=>{state.comparison=false;},'comparison'));
  const selectMapRegion=(marker:HTMLElement|SVGElement)=>{
   if(!russiaRegions.some(region=>region.code===marker.dataset.mapPlace))return;
   const scene=marker.closest<HTMLElement>('[data-primary-map],[data-original-map],[data-comparison-map]');
   const hook=scene?.hasAttribute('data-primary-map')?'primary-map':scene?.hasAttribute('data-original-map')?'original-map':scene?'comparison-map':undefined;
   const place=marker.dataset.mapPlace!;
   update(()=>{delete state.industryLocation;state.place=place;selected=true;chooseRegionTheme();});
   if(hook)one(hook).querySelector<SVGElement>(`[data-region-marker][data-map-place="${place}"]`)?.focus({preventScroll:true});
  };
  root.addEventListener('click',event=>{
   if((event.target as Element).closest('[data-russia-industry-return]')){update(()=>{delete state.industryLocation;state.place='all';state.scope='all';selected=false;});return;}
   const point=(event.target as Element).closest<SVGElement>('[data-russia-industry-location]');if(point){const id=point.dataset.russiaIndustryLocation;if(state.industryLocation===id)return;update(()=>{state.industryLocation=id;selected=true;});root.querySelector<SVGElement>(`[data-russia-industry-location="${id}"]`)?.focus({preventScroll:true});return;}
   const regionSelected=(event.target as Element).closest<HTMLElement|SVGElement>('[data-map-place]');
   if(regionSelected)selectMapRegion(regionSelected);
  });
  root.addEventListener('keydown',event=>{
   const point=(event.target as Element).closest<SVGElement>('[data-russia-industry-location]');if(point&&(event.key==='Enter'||event.key===' ')){event.preventDefault();if(!event.repeat)point.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
   const selected=(event.target as Element).closest<SVGElement>('[data-region-marker]');
   if(!selected||(event.key!=='Enter'&&event.key!==' '))return;
   event.preventDefault();if(!event.repeat)selectMapRegion(selected);
  });
 window.addEventListener('popstate',()=>{state=createRussiaState(location.search,field);if(overview){state.layer='cities';const requested=new URLSearchParams(location.search).get('compare');if(!requested||getRussiaLayer(requested).id!==requested)state.compareLayer='density';}selected=isSelectedReading();climateSelection.read();render();});
 history.replaceState({},'',serialized(state));render();
 let resizing=false;
 new ResizeObserver(()=>{
  if(resizing)return;resizing=true;
  requestAnimationFrame(()=>{render();resizing=false;});
 }).observe(root);
 root.dataset.russiaReady='true';
}
