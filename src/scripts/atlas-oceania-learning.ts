import {withBase} from '../lib/urls';
import {getOceaniaComparisonReading} from '../data/atlas/oceania-comparison-reading';
import {oceaniaFields,oceaniaCountries,oceaniaLayers,oceaniaThemes,oceaniaPopulationReading,createOceaniaState,getOceaniaTheme,getOceaniaLayer,renderOceaniaScene,renderOceaniaLegend,oceaniaCoverage,oceaniaFocusName,type OceaniaField,type OceaniaState,type OceaniaSource} from '../data/atlas/oceania-learning';

const htmlEscape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ownKeys=['theme','layer','place','scope','view','compare'];
export function initOceaniaLearningAtlas(root:HTMLElement):void{
 const field=root.dataset.field as OceaniaField;
 let state=createOceaniaState(location.search,field);
 const one=<T extends HTMLElement=HTMLElement>(hook:string)=>root.querySelector<T>(`[data-${hook}]`)!;
 const text=(hook:string,value:string)=>{one(hook).textContent=value;};
 const targetName=()=>state.scope==='country'?(oceaniaCountries.find(c=>c.code===state.place)?.name??'オセアニア全体'):state.scope==='theme'?getOceaniaTheme(state).title:'オセアニア全体';
 const serialized=(s:OceaniaState,href=location.href)=>{
  const url=new URL(href,location.href);for(const key of ownKeys)url.searchParams.delete(key);
  url.searchParams.set('theme',s.theme);url.searchParams.set('layer',s.layer);url.searchParams.set('place',s.place);url.searchParams.set('scope',s.scope);
  if(s.comparison)url.searchParams.set('view','comparison');url.searchParams.set('compare',s.compareLayer);return url;
 };
 const chooseCountryTheme=()=>{
  if(state.place==='all')return;
  const theme=getOceaniaTheme(state);if(theme.countryCodes.includes(state.place))return;
  const suitable=oceaniaThemes.find(t=>t.field===field&&t.countryCodes.includes(state.place));
  if(suitable){state.theme=suitable.id;state.layer=suitable.defaultLayer;state.compareLayer=suitable.comparisonLayer;}
 };
 const comparisonText=()=>{
  return `${targetName()}：${getOceaniaComparisonReading(state).message}`;
 };
 const scene=(hook:string,id:string)=>{
  const el=one(hook),b=el.getBoundingClientRect();
  el.innerHTML=renderOceaniaScene(getOceaniaLayer(id,state),state,hook,{width:b.width||640,height:b.height||350});
 };
 const sources=(items:OceaniaSource[])=>{
  const unique=[...new Map(items.map(s=>[s.url+'|'+s.title,s])).values()];
  one('source-list').innerHTML=unique.map(s=>`<div class="oceania-learning-citation"><a href="${htmlEscape(s.url)}">${htmlEscape(s.title)}</a>${s.note?`<p>${htmlEscape(s.note)}</p>`:''}</div>`).join('');
 };
 const render=()=>{
  const theme=getOceaniaTheme(state),layer=getOceaniaLayer(state.layer,state),compare=getOceaniaLayer(state.compareLayer,state);
  one<HTMLSelectElement>('place').value=state.place;one<HTMLSelectElement>('layer').value=state.layer;one<HTMLSelectElement>('compare-layer').value=state.compareLayer;
  root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===state.theme)));
  root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.scope===state.scope));b.disabled=b.dataset.scope==='country'&&state.place==='all';});
  one('normal-view').hidden=state.comparison;one('comparison-view').hidden=!state.comparison;
  for(const [prefix,item] of [['primary',layer],['original',layer],['comparison',compare]] as const){
   text(prefix+'-title',(prefix==='original'?'元の分布：':'')+item.title+(state.scope==='country'?' · '+targetName()+(oceaniaFocusName(state)?'／'+oceaniaFocusName(state):''):''));
   text(prefix+'-period',item.period);text(prefix+'-unit',item.unit+(item.resolution?' · '+item.resolution:''));one(prefix+'-legend').innerHTML=renderOceaniaLegend(item);
  }
  text('theme-title',theme.title);text('takeaway',theme.takeaway);text('explanation',theme.explanation);
  text('coverage',oceaniaCoverage(layer,state));text('comparison',compare.title+'と比べる →');text('return','← '+layer.title+'へ戻る：'+targetName()+(state.scope!=='country'&&state.place!=='all'?'／選択：'+oceaniaCountries.find(c=>c.code===state.place)?.name:''));text('comparison-explanation',comparisonText());
  const shorter=one(layer.legend.length<=compare.legend.length?'original-map':'comparison-map').closest('.oceania-learning-map-panel');shorter?.append(one('comparison-explanation'));
  const keys:Record<string,keyof typeof oceaniaPopulationReading.contexts>={AUS:'australia',NZL:'new-zealand',PNG:'papua-new-guinea',FJI:'fiji',KIR:'tarawa',PYF:'tahiti',WSM:'samoa'};
  if(field==='population'){const context=oceaniaPopulationReading.contexts[keys[state.place]??'overview'];text('explanation',[context,theme.explanation.replace(context,'').trim()].filter(Boolean).join(' '));}
  text('social-context',oceaniaPopulationReading.socialConnections.map(c=>c.title+'：'+c.text).join('\n\n'));
  sources([...layer.sources,...theme.sources,...(state.comparison?[...compare.sources,...getOceaniaComparisonReading(state).sources]:[]),...oceaniaPopulationReading.sources.filter(s=>s.id.startsWith('world-bank')||s.id.startsWith('abs')).map(s=>({title:s.title,url:s.url}))]);
  root.querySelectorAll<HTMLAnchorElement>('[data-field-link]').forEach(a=>{
   const nextField=a.dataset.fieldLink as OceaniaField,available=oceaniaThemes.filter(t=>t.field===nextField),nextTheme=available.find(t=>t.countryCodes.includes(state.place))??available[0];
   a.href=serialized({...state,field:nextField,theme:nextTheme.id,layer:nextTheme.defaultLayer,compareLayer:nextTheme.comparisonLayer,comparison:false},withBase(`/atlas/oceania/${nextField}/`)).href;
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-oceania-overview-link],[data-oceania-base-link]').forEach(a=>{a.href=serialized({...state,comparison:false},a.href).href;});
  if(state.comparison){scene('original-map',state.layer);scene('comparison-map',state.compareLayer);}else scene('primary-map',state.layer);
 };
 const update=(mutate:()=>void,focus?:string)=>{
  mutate();history.pushState({},'',serialized(state));render();if(focus)one(focus).focus();
 };
 one<HTMLSelectElement>('place').addEventListener('change',e=>update(()=>{state.place=(e.target as HTMLSelectElement).value;state.scope=state.place==='all'?'all':'country';chooseCountryTheme();}));
 one<HTMLSelectElement>('layer').addEventListener('change',e=>update(()=>{state.layer=(e.target as HTMLSelectElement).value;}));
 one<HTMLSelectElement>('compare-layer').addEventListener('change',e=>update(()=>{state.compareLayer=(e.target as HTMLSelectElement).value;}));
 root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.addEventListener('click',()=>update(()=>{const t=getOceaniaTheme({field,theme:b.dataset.theme!});state.theme=t.id;state.layer=t.defaultLayer;state.compareLayer=t.comparisonLayer;state.scope='theme';})));
 root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(b=>b.addEventListener('click',()=>update(()=>{state.scope=b.dataset.scope as OceaniaState['scope'];if(state.scope==='country')chooseCountryTheme();})));
 one('comparison').addEventListener('click',()=>update(()=>{state.comparison=true;},'return'));
 one('return').addEventListener('click',()=>update(()=>{state.comparison=false;},'comparison'));
 root.addEventListener('click',e=>{const selected=(e.target as Element).closest<SVGElement>('[data-map-place]');if(selected)update(()=>{state.place=selected.dataset.mapPlace!;state.scope='country';chooseCountryTheme();});});
 window.addEventListener('popstate',()=>{state=createOceaniaState(location.search,field);render();});
 history.replaceState({},'',serialized(state));render();
 let resizing=false;new ResizeObserver(()=>{if(resizing)return;resizing=true;requestAnimationFrame(()=>{render();resizing=false;});}).observe(root);
}
