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

export function initRussiaLearningAtlas(root:HTMLElement):void {
 if(root.dataset.russiaReady==='true')return;
 const field=root.dataset.field as RussiaField;
 let state=createRussiaState(location.search,field);
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
  return url;
 };
 const chooseRegionTheme=()=>{
  if(state.place==='all'||getRussiaTheme(state).regionCodes.some(code=>code===state.place))return;
  const suitable=russiaThemes.find(theme=>theme.field===field&&theme.regionCodes.some(code=>code===state.place));
  if(suitable){state.theme=suitable.id;state.layer=suitable.defaultLayer;state.compareLayer=suitable.comparisonLayer;}
 };
 const scene=(hook:string,id:string)=>{
  const el=one(hook),bounds=el.getBoundingClientRect();
  el.innerHTML=renderRussiaScene(getRussiaLayer(id,state),state,hook,{width:bounds.width||640,height:bounds.height||320});
 };
 const sources=(items:RussiaSource[])=>{
  const unique=[...new Map(items.map(source=>[source.url+'|'+source.title,source])).values()];
  one('source-list').innerHTML=unique.map(source=>`<div class="russia-learning-citation"><a href="${htmlEscape(source.url)}">${htmlEscape(source.title)}</a>${source.note?`<p>${htmlEscape(source.note)}</p>`:''}</div>`).join('');
 };
 const render=()=>{
  const theme=getRussiaTheme(state),layer=getRussiaLayer(state.layer,state),compare=getRussiaLayer(state.compareLayer,state);
  const comparisonReading=getRussiaComparisonReading(state);
  one<HTMLSelectElement>('place').value=state.place;
  one<HTMLSelectElement>('layer').value=state.layer;
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
   one(prefix+'-legend').innerHTML=renderRussiaLegend(item);
  }
  text('theme-title',theme.title);text('takeaway',theme.takeaway);
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
  if(state.comparison){scene('original-map',state.layer);scene('comparison-map',state.compareLayer);}
  else scene('primary-map',state.layer);
 };
 const update=(mutate:()=>void,focus?:string)=>{
  mutate();history.pushState({},'',serialized(state));render();
  if(focus)one(focus).focus();
 };
 one<HTMLSelectElement>('place').addEventListener('change',event=>update(()=>{
  state.place=(event.target as HTMLSelectElement).value as RussiaState['place'];
  state.scope=state.place==='all'?'all':'region';chooseRegionTheme();
 }));
 one<HTMLSelectElement>('layer').addEventListener('change',event=>update(()=>{state.layer=(event.target as HTMLSelectElement).value;}));
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
 root.addEventListener('click',event=>{
  const selected=(event.target as Element).closest<SVGElement>('[data-map-place]');
  if(selected&&russiaRegions.some(region=>region.code===selected.dataset.mapPlace))update(()=>{
   state.place=selected.dataset.mapPlace as RussiaState['place'];state.scope='region';chooseRegionTheme();
  });
 });
 window.addEventListener('popstate',()=>{state=createRussiaState(location.search,field);render();});
 history.replaceState({},'',serialized(state));render();
 let resizing=false;
 new ResizeObserver(()=>{
  if(resizing)return;resizing=true;
  requestAnimationFrame(()=>{render();resizing=false;});
 }).observe(root);
 root.dataset.russiaReady='true';
}
