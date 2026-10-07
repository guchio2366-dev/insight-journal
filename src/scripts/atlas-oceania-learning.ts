import {withBase} from '../lib/urls';
import {renderOceaniaRequiredLegend} from './atlas-oceania-legend';
import {getOceaniaComparisonReading} from '../data/atlas/oceania-comparison-reading';
import {oceaniaFields,oceaniaCountries,oceaniaLayers,oceaniaThemes,oceaniaPopulationReading,oceaniaOverviewReadings,createOceaniaState,getOceaniaTheme,getOceaniaLayer,renderOceaniaScene,renderOceaniaLegend,oceaniaCoverage,oceaniaFocusName,type OceaniaField,type OceaniaState,type OceaniaSource} from '../data/atlas/oceania-learning';

const htmlEscape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ownKeys=['theme','layer','place','scope','view','compare','reading'];
export function initOceaniaLearningAtlas(root:HTMLElement):void{
 if(root.dataset.oceaniaReady==='true')return;
 const field=root.dataset.field as OceaniaField;
 let state=createOceaniaState(location.search,field);
 const isSelectedReading=()=>new URLSearchParams(location.search).get('reading')==='selection'||state.place!=='all'||state.scope!=='all';
 let selectedReading=isSelectedReading();
 const overview=oceaniaOverviewReadings[field];
 const one=<T extends HTMLElement=HTMLElement>(hook:string)=>root.querySelector<T>(`[data-${hook}]`)!;
 const text=(hook:string,value:string)=>{one(hook).textContent=value;};
 const targetName=()=>state.scope==='country'?(oceaniaCountries.find(c=>c.code===state.place)?.name??'オセアニア全体'):state.scope==='theme'?getOceaniaTheme(state).title:'オセアニア全体';
 const serialized=(s:OceaniaState,href=location.href)=>{
  const url=new URL(href,location.href);for(const key of ownKeys)url.searchParams.delete(key);
  url.searchParams.set('theme',s.theme);url.searchParams.set('layer',s.layer);url.searchParams.set('place',s.place);url.searchParams.set('scope',s.scope);
  if(s.comparison)url.searchParams.set('view','comparison');url.searchParams.set('compare',s.compareLayer);if(selectedReading)url.searchParams.set('reading','selection');const params=new URLSearchParams(location.search);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}return url;
 };
 const chooseCountryTheme=()=>{
  if(state.place==='all')return;
  const theme=getOceaniaTheme(state);if(theme.countryCodes.includes(state.place))return;
  const suitable=oceaniaThemes.find(t=>t.field===field&&t.countryCodes.includes(state.place)&&(field==='industry'||t.defaultLayer===state.layer));
  if(suitable){state.theme=suitable.id;}
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
  const contextualReading=selectedReading&&(state.place==='all'||theme.countryCodes.includes(state.place));
  const selectedName=oceaniaCountries.find(country=>country.code===state.place)?.name;
  one<HTMLSelectElement>('place').value=state.place;one<HTMLSelectElement>('layer').value=state.layer;one<HTMLSelectElement>('compare-layer').value=state.compareLayer;
  root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(selectedReading&&b.dataset.theme===state.theme)));
  root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.scope===state.scope));b.disabled=b.dataset.scope==='country'&&state.place==='all';});
  one('normal-view').hidden=state.comparison;one('comparison-view').hidden=!state.comparison;
  for(const [prefix,item] of [['primary',layer],['original',layer],['comparison',compare]] as const){
   text(prefix+'-title',(prefix==='original'?'元の分布：':'')+item.title+(state.scope==='country'?' · '+targetName()+(oceaniaFocusName(state)?'／'+oceaniaFocusName(state):''):''));
   text(prefix+'-period',item.period);text(prefix+'-unit',item.unit+(item.resolution?' · '+item.resolution:''));const legend=renderOceaniaLegend(item);one(prefix+'-legend').innerHTML=prefix==='primary'?renderOceaniaRequiredLegend(item):legend;
   if(prefix==='primary'){one('primary-legend-spacer').innerHTML=legend;one('primary-legend-dictionary-content').innerHTML=legend;one('primary-legend-dictionary').hidden=item.id!=='climate';text('primary-legend-unit',item.period+' ・ '+item.unit);root.querySelector<HTMLElement>('[data-required-legend-layer]')!.dataset.requiredLegendLayer=item.id;}
  }
  text('theme-title',contextualReading?theme.title:selectedName?selectedName+'の'+layer.title:overview.title);text('takeaway',contextualReading?theme.takeaway:overview.takeaway);text('explanation',contextualReading?theme.explanation:(selectedName?selectedName+'を選択しています。 ':'')+overview.explanation);
  text('coverage',oceaniaCoverage(layer,state));text('comparison',compare.title+'と比べる →');text('return','← '+layer.title+'へ戻る：'+targetName()+(state.scope!=='country'&&state.place!=='all'?'／選択：'+oceaniaCountries.find(c=>c.code===state.place)?.name:''));text('comparison-explanation',comparisonText());
  const shorter=one(layer.legend.length<=compare.legend.length?'original-map':'comparison-map').closest('.oceania-learning-map-panel');shorter?.append(one('comparison-explanation'));
  const keys:Record<string,keyof typeof oceaniaPopulationReading.contexts>={AUS:'australia',NZL:'new-zealand',PNG:'papua-new-guinea',FJI:'fiji',KIR:'tarawa',PYF:'tahiti',WSM:'samoa'};
  if(field==='population'&&selectedReading){const context=oceaniaPopulationReading.contexts[keys[state.place]??'overview'];text('explanation',[context,theme.explanation.replace(context,'').trim()].filter(Boolean).join(' '));}
  text('social-context',oceaniaPopulationReading.socialConnections.map(c=>c.title+'：'+c.text).join('\n\n'));
  sources([...layer.sources,...theme.sources,...(state.comparison?[...compare.sources,...getOceaniaComparisonReading(state).sources]:[]),...oceaniaPopulationReading.sources.filter(s=>s.id.startsWith('world-bank')||s.id.startsWith('abs')).map(s=>({title:s.title,url:s.url}))]);
  root.querySelectorAll<HTMLAnchorElement>('[data-field-link]').forEach(a=>{
   const nextField=a.dataset.fieldLink as OceaniaField,available=oceaniaThemes.filter(t=>t.field===nextField),nextTheme=available.find(t=>t.countryCodes.includes(state.place))??available[0];
   a.href=serialized({...state,field:nextField,theme:nextTheme.id,layer:nextField==='industry'?'industry-all':nextTheme.defaultLayer,compareLayer:nextTheme.comparisonLayer,comparison:false},withBase(`/atlas/oceania/${nextField}/`)).href;
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-oceania-overview-link],[data-oceania-base-link]').forEach(a=>{a.href=serialized({...state,comparison:false},a.href).href;});
  if(state.comparison){scene('original-map',state.layer);scene('comparison-map',state.compareLayer);}else scene('primary-map',state.layer);
 };
 const update=(mutate:()=>void,focus?:string)=>{
  mutate();history.pushState({},'',serialized(state));render();if(focus)one(focus).focus();
 };
 one<HTMLSelectElement>('place').addEventListener('change',e=>update(()=>{state.place=(e.target as HTMLSelectElement).value;if(state.place==='all')state.scope='all';selectedReading=state.place!=='all';chooseCountryTheme();}));
 one<HTMLSelectElement>('layer').addEventListener('change',e=>update(()=>{state.layer=(e.target as HTMLSelectElement).value;selectedReading=true;const matching=oceaniaThemes.find(t=>t.field===field&&t.defaultLayer===state.layer)||oceaniaThemes.find(t=>t.field===field&&t.id===(state.layer==='sheep'?'livestock':state.layer==='cacao'?'tropical-crops':state.theme));if(matching)state.theme=matching.id;}));
 one<HTMLSelectElement>('compare-layer').addEventListener('change',e=>update(()=>{state.compareLayer=(e.target as HTMLSelectElement).value;}));
 root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.addEventListener('click',()=>update(()=>{const t=getOceaniaTheme({field,theme:b.dataset.theme!});selectedReading=true;state.theme=t.id;if(field!=='industry')state.layer=t.defaultLayer;})));
 root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(b=>b.addEventListener('click',()=>update(()=>{state.scope=b.dataset.scope as OceaniaState['scope'];selectedReading=state.scope!=='all'||state.place!=='all';if(state.scope==='country')chooseCountryTheme();})));
 one('comparison').addEventListener('click',()=>update(()=>{state.comparison=true;},'return'));
 one('return').addEventListener('click',()=>update(()=>{state.comparison=false;},'comparison'));
 root.addEventListener('click',e=>{const selected=(e.target as Element).closest<SVGElement>('[data-map-place]');if(selected)update(()=>{selectedReading=true;state.place=selected.dataset.mapPlace!;chooseCountryTheme();});});
 window.addEventListener('popstate',()=>{state=createOceaniaState(location.search,field);selectedReading=isSelectedReading();render();});
 history.replaceState({},'',serialized(state));render();
 let resizing=false;new ResizeObserver(()=>{if(resizing)return;resizing=true;requestAnimationFrame(()=>{render();resizing=false;});}).observe(root);
 root.dataset.oceaniaReady='true';
}
