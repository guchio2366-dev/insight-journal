import {withBase} from '../lib/urls';
import {renderOceaniaRequiredLegend} from './atlas-oceania-legend';
import {getOceaniaComparisonReading} from '../data/atlas/oceania-comparison-reading';
import {oceaniaFields,oceaniaCountries,oceaniaLayers,oceaniaThemes,oceaniaPopulationReading,createOceaniaState,getOceaniaTheme,getOceaniaLayer,renderOceaniaScene,renderOceaniaLegend,oceaniaCoverage,oceaniaFocusName,type OceaniaField,type OceaniaState,type OceaniaSource} from '../data/atlas/oceania-learning';

const htmlEscape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ownKeys=['theme','layer','place','scope','view','compare','reading'];
export function initOceaniaLearningAtlas(root:HTMLElement):void{
 const field=root.dataset.field as OceaniaField;
 let state=createOceaniaState(location.search,field);
 const isSelectedReading=()=>new URLSearchParams(location.search).get('reading')==='selection'||state.place!=='all'||state.scope!=='all';
 let selectedReading=isSelectedReading();
 const overview={
  nature:{title:'オセアニアの自然環境を読む',takeaway:'大陸の乾燥、沿岸の気候、山地と島々を、水利用・暮らしとのつながりから比べます。',explanation:'気候区分の分布を共通の土台にします。地図直下の地域・項目を選ぶと、その場所の自然条件と農業・交通・制度をつなぐ説明に切り替わります。水資源・地形・標高の詳しい分布資料は未整備です。'},
  agriculture:{title:'オセアニアの農林業を読む',takeaway:'小麦、羊・牛、メラネシアの熱帯作物を、自然条件と技術・加工・市場へのつながりから比べます。',explanation:'元の分布と凡例を確かめ、地図直下の項目を選んで理由を読みます。作物の収穫面積と家畜の密度は異なる量です。空白は未収録の場合があり、農業がないとは読めません。林業の分布資料は未整備です。'},
  industry:{title:'オセアニアの主要産業を読む',takeaway:'鉱物資源と、加工・港・サービスの代表地点を、交通や市場・協議とのつながりから読みます。',explanation:'地域主要産業の中で、豪州の稼働鉱山と島々の加工・港の代表例を切り替えられます。地図直下の項目を選ぶと地域の説明に切り替わります。地点の数や記号の大きさは生産量を表しません。'},
  population:{title:'オセアニアの人口分布を読む',takeaway:'沿岸と内陸、大陸と小さな島の居住を、交通・公共サービス・制度と合わせて比べます。',explanation:'人口密度と都市中心を切り替え、地図直下の項目や国・地域を選んで暮らしの背景を読みます。未収録は無人を意味せず、都市中心は国全体の人口の代用ではありません。人種・民族と宗教の地域分布資料は未整備です。'},
 }[field];
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
   text(prefix+'-period',item.period);text(prefix+'-unit',item.unit+(item.resolution?' · '+item.resolution:''));const legend=renderOceaniaLegend(item);one(prefix+'-legend').innerHTML=prefix==='primary'?renderOceaniaRequiredLegend(item):legend;
   if(prefix==='primary'){one('primary-legend-spacer').innerHTML=legend;one('primary-legend-dictionary-content').innerHTML=legend;one('primary-legend-dictionary').hidden=item.id!=='climate';text('primary-legend-unit',item.period+' ・ '+item.unit);root.querySelector<HTMLElement>('[data-required-legend-layer]')!.dataset.requiredLegendLayer=item.id;}
  }
  text('theme-title',selectedReading?theme.title:overview.title);text('takeaway',selectedReading?theme.takeaway:overview.takeaway);text('explanation',selectedReading?theme.explanation:overview.explanation);
  text('coverage',oceaniaCoverage(layer,state));text('comparison',compare.title+'と比べる →');text('return','← '+layer.title+'へ戻る：'+targetName()+(state.scope!=='country'&&state.place!=='all'?'／選択：'+oceaniaCountries.find(c=>c.code===state.place)?.name:''));text('comparison-explanation',comparisonText());
  const shorter=one(layer.legend.length<=compare.legend.length?'original-map':'comparison-map').closest('.oceania-learning-map-panel');shorter?.append(one('comparison-explanation'));
  const keys:Record<string,keyof typeof oceaniaPopulationReading.contexts>={AUS:'australia',NZL:'new-zealand',PNG:'papua-new-guinea',FJI:'fiji',KIR:'tarawa',PYF:'tahiti',WSM:'samoa'};
  if(field==='population'&&selectedReading){const context=oceaniaPopulationReading.contexts[keys[state.place]??'overview'];text('explanation',[context,theme.explanation.replace(context,'').trim()].filter(Boolean).join(' '));}
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
 one<HTMLSelectElement>('place').addEventListener('change',e=>update(()=>{state.place=(e.target as HTMLSelectElement).value;state.scope=state.place==='all'?'all':'country';selectedReading=state.place!=='all';chooseCountryTheme();}));
 one<HTMLSelectElement>('layer').addEventListener('change',e=>update(()=>{state.layer=(e.target as HTMLSelectElement).value;selectedReading=true;const matching=oceaniaThemes.find(t=>t.field===field&&t.defaultLayer===state.layer)||oceaniaThemes.find(t=>t.field===field&&t.id===(state.layer==='sheep'?'livestock':state.layer==='cacao'?'tropical-crops':state.theme));if(matching)state.theme=matching.id;}));
 one<HTMLSelectElement>('compare-layer').addEventListener('change',e=>update(()=>{state.compareLayer=(e.target as HTMLSelectElement).value;}));
 root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.addEventListener('click',()=>update(()=>{const t=getOceaniaTheme({field,theme:b.dataset.theme!});selectedReading=true;state.theme=t.id;state.layer=t.defaultLayer;state.compareLayer=t.comparisonLayer;state.scope='theme';})));
 root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(b=>b.addEventListener('click',()=>update(()=>{state.scope=b.dataset.scope as OceaniaState['scope'];if(state.scope==='country')chooseCountryTheme();})));
 one('comparison').addEventListener('click',()=>update(()=>{state.comparison=true;},'return'));
 one('return').addEventListener('click',()=>update(()=>{state.comparison=false;},'comparison'));
 root.addEventListener('click',e=>{const selected=(e.target as Element).closest<SVGElement>('[data-map-place]');if(selected)update(()=>{selectedReading=true;state.place=selected.dataset.mapPlace!;state.scope='country';chooseCountryTheme();});});
 window.addEventListener('popstate',()=>{state=createOceaniaState(location.search,field);selectedReading=isSelectedReading();render();});
 history.replaceState({},'',serialized(state));render();
 let resizing=false;new ResizeObserver(()=>{if(resizing)return;resizing=true;requestAnimationFrame(()=>{render();resizing=false;});}).observe(root);
}
