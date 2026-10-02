import {withBase} from '../lib/urls';
import {
 russiaFields,russiaRegions,russiaThemes,createRussiaState,
 getRussiaTheme,getRussiaLayer,renderRussiaScene,renderRussiaLegend,
 russiaCoverage,getRussiaComparisonReading,russiaBoundarySources,
} from '../data/atlas/russia-learning';

type RussiaField=keyof typeof russiaFields;
type RussiaState=ReturnType<typeof createRussiaState>;
type RussiaSource={title:string;url:string;note?:string};
const htmlEscape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ownKeys=['theme','layer','place','scope','view','compare'];

const climateShortNames:Record<string,string>={BWk:'低温砂漠',BSk:'低温半乾燥',Cfa:'温暖湿潤',Cfb:'西岸海洋性',Dsc:'冷帯夏乾冷夏',Dsd:'冷帯夏乾厳冬',Dwa:'冷帯冬乾暑夏',Dwb:'冷帯冬乾暖夏',Dwc:'冷帯冬乾冷夏',Dwd:'冷帯冬乾厳冬',Dfa:'冷帯湿潤暑夏',Dfb:'冷帯湿潤暖夏',Dfc:'冷帯湿潤冷夏',Dfd:'冷帯湿潤厳冬',ET:'ツンドラ',EF:'氷雪'};
export function renderRussiaWorkspaceLegend(layer:ReturnType<typeof getRussiaLayer>):string {
 return renderRussiaLegend(layer.id==='climate'?{...layer,legend:layer.legend.map(item=>{const code=item.label.split(' ')[0];return {...item,label:climateShortNames[code]?code+climateShortNames[code]:item.label};})}:layer);
}

export function initRussiaLearningAtlas(root:HTMLElement):void {
 if(root.dataset.russiaReady==='true')return;
 const field=root.dataset.field as RussiaField;
 let state=createRussiaState(location.search,field);
 const overview=root.dataset.russiaOverview==='true';
 if(overview){state.layer='cities';if(!new URLSearchParams(location.search).has('compare'))state.compareLayer='density';}
 let selected=state.place!=='all'||state.scope!=='all';
 const one=<T extends HTMLElement=HTMLElement>(hook:string)=>root.querySelector<T>(`[data-${hook}]`)!;
 const text=(hook:string,value:string)=>{one(hook).textContent=value;};
 const selectedName=()=>russiaRegions.find(region=>region.code===state.place)?.name??'ロシア全域';
 const targetName=()=>state.scope==='region'?selectedName():state.scope==='theme'?getRussiaTheme(state).title:'ロシア全域';
 const serialized=(s:RussiaState,href=location.href)=>{
  const url=new URL(href,location.href);
  for(const key of ownKeys)url.searchParams.delete(key);
  url.searchParams.set('theme',s.theme);url.searchParams.set('layer',s.layer);
  url.searchParams.set('place',s.place);url.searchParams.set('scope',s.scope);
  if(s.comparison)url.searchParams.set('view','comparison');
  url.searchParams.set('compare',s.compareLayer);
  const params=new URLSearchParams(location.search);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}
  return url;
 };
 const chooseRegionTheme=()=>{
  if(state.place==='all'||getRussiaTheme(state).regionCodes.some(code=>code===state.place))return;
  const suitable=russiaThemes.find(theme=>theme.field===field&&theme.regionCodes.some(code=>code===state.place));
  if(suitable){state.theme=suitable.id;state.layer=suitable.defaultLayer;state.compareLayer=suitable.comparisonLayer;}
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
   const focusedMarker=active&&root.contains(active)?active.closest<SVGElement>('[data-region-marker]'):null;
   const focusedScene=focusedMarker?.closest<HTMLElement>('[data-primary-map],[data-original-map],[data-comparison-map]');
   const focusedHook=focusedScene?.hasAttribute('data-primary-map')?'primary-map':focusedScene?.hasAttribute('data-original-map')?'original-map':focusedScene?'comparison-map':undefined;
   const focusedPlace=focusedMarker?.dataset.mapPlace;
  const theme=getRussiaTheme(state),layer=getRussiaLayer(state.layer,state),compare=getRussiaLayer(state.compareLayer,state);
  const comparisonReading=getRussiaComparisonReading(state);
  one<HTMLSelectElement>('place').value=state.place;
  one<HTMLSelectElement>('layer').value=state.layer;
  const distribution=root.querySelector<HTMLSelectElement>('[data-distribution-layer]');if(distribution)distribution.value=state.layer;
  root.querySelectorAll<HTMLButtonElement>('[data-region-option]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.regionOption===state.place)));
  one<HTMLSelectElement>('compare-layer').value=state.compareLayer;
  root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.theme===state.theme)));
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
   one('climate-dictionary').hidden=layer.id!=='climate';
   one('primary-legend-definitions').innerHTML=renderRussiaLegend(layer);
  }
  text('reading-status',selected?'選んだ場所・分布の説明':'ロシアの概要');
  text('theme-title',overview&&!selected?'広い国土を、都市と分野の分布から読む':theme.title);text('takeaway',overview&&!selected?'欧州側・シベリア・極東を同じ表示枠で確かめ、自然条件に設備・交通・市場・社会を重ねて読む。都市中心の円は行政人口ではなく、固定された都市範囲の人口です。':theme.takeaway);
  text('explanation',theme.explanation);text('social-context',theme.social);
  text('coverage',russiaCoverage(layer,state));
  text('comparison',compare.title+'と比べる →');
  text('return','← '+layer.title+'へ戻る：'+targetName()+(state.scope!=='region'&&state.place!=='all'?'／選択：'+selectedName():''));
  text('comparison-explanation',comparisonReading.message);
  const shorter=one(layer.legend.length<=compare.legend.length?'original-map':'comparison-map').closest('.russia-learning-map-panel');
  shorter?.append(one('comparison-explanation'));
  sources([...russiaBoundarySources,...layer.sources,...theme.sources,...(state.comparison?[...compare.sources,...comparisonReading.sources]:[])]);
  root.querySelectorAll<HTMLAnchorElement>('[data-field-link]').forEach(link=>{
   const nextField=link.dataset.fieldLink as RussiaField;
   const available=russiaThemes.filter(item=>item.field===nextField);
   const nextTheme=available.find(item=>item.regionCodes.some(code=>code===state.place))??available[0];
   link.href=serialized({...state,field:nextField,theme:nextTheme.id,layer:nextTheme.defaultLayer,compareLayer:nextTheme.comparisonLayer,comparison:false},withBase(`/atlas/russia/${nextField}/`)).href;
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-russia-overview-link]').forEach(link=>{link.href=serialized({...state,comparison:false},link.href).href;});
   if(state.comparison){scene('original-map',state.layer);scene('comparison-map',state.compareLayer);}
   else scene('primary-map',state.layer);
   if(focusedHook&&focusedPlace)one(focusedHook).querySelector<SVGElement>(`[data-region-marker][data-map-place="${focusedPlace}"]`)?.focus({preventScroll:true});
 };
 const update=(mutate:()=>void,focus?:string)=>{
  mutate();selected=true;history.pushState({},'',serialized(state));render();
  if(focus)one(focus).focus();
 };
 one<HTMLSelectElement>('place').addEventListener('change',event=>update(()=>{
  state.place=(event.target as HTMLSelectElement).value as RussiaState['place'];
  state.scope=state.place==='all'?'all':'region';chooseRegionTheme();
 }));
 one<HTMLSelectElement>('layer').addEventListener('change',event=>update(()=>{state.layer=(event.target as HTMLSelectElement).value;}));
 root.querySelector<HTMLSelectElement>('[data-distribution-layer]')?.addEventListener('change',event=>update(()=>{state.layer=(event.target as HTMLSelectElement).value;}));
 one<HTMLSelectElement>('compare-layer').addEventListener('change',event=>update(()=>{state.compareLayer=(event.target as HTMLSelectElement).value;}));
 root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button=>button.addEventListener('click',()=>update(()=>{
  const theme=getRussiaTheme({...state,field,theme:button.dataset.theme!});
  state.theme=theme.id;state.layer=theme.defaultLayer;state.compareLayer=theme.comparisonLayer;state.scope='theme';
 })));
 root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(button=>button.addEventListener('click',()=>update(()=>{
  state.scope=button.dataset.scope as RussiaState['scope'];
  if(state.scope==='region')chooseRegionTheme();
 })));
 one('comparison').addEventListener('click',()=>update(()=>{state.comparison=true;},'return'));
 one('return').addEventListener('click',()=>update(()=>{state.comparison=false;},'comparison'));
  const selectMapRegion=(selected:HTMLElement|SVGElement)=>{
   if(!russiaRegions.some(region=>region.code===selected.dataset.mapPlace))return;
   const scene=selected.closest<HTMLElement>('[data-primary-map],[data-original-map],[data-comparison-map]');
   const hook=scene?.hasAttribute('data-primary-map')?'primary-map':scene?.hasAttribute('data-original-map')?'original-map':scene?'comparison-map':undefined;
   const place=selected.dataset.mapPlace!;
   update(()=>{state.place=place;state.scope='region';chooseRegionTheme();});
   if(hook)one(hook).querySelector<SVGElement>(`[data-region-marker][data-map-place="${place}"]`)?.focus({preventScroll:true});
  };
  root.addEventListener('click',event=>{
   const selected=(event.target as Element).closest<HTMLElement|SVGElement>('[data-map-place]');
   if(selected)selectMapRegion(selected);
  });
  root.addEventListener('keydown',event=>{
   const selected=(event.target as Element).closest<SVGElement>('[data-region-marker]');
   if(!selected||(event.key!=='Enter'&&event.key!==' '))return;
   event.preventDefault();if(!event.repeat)selectMapRegion(selected);
  });
 window.addEventListener('popstate',()=>{state=createRussiaState(location.search,field);if(overview){state.layer='cities';const requested=new URLSearchParams(location.search).get('compare');if(!requested||getRussiaLayer(requested).id!==requested)state.compareLayer='density';}selected=state.place!=='all'||state.scope!=='all';render();});
 history.replaceState({},'',serialized(state));render();
 let resizing=false;
 new ResizeObserver(()=>{
  if(resizing)return;resizing=true;
  requestAnimationFrame(()=>{render();resizing=false;});
 }).observe(root);
 root.dataset.russiaReady='true';
}
