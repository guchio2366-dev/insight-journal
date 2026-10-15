import {syncAgroStatistics} from './atlas-agro-statistics.ts';
import {getOceaniaCatalogItem,oceaniaCatalogSources,oceaniaIndustryCatalog} from '../data/atlas/oceania-industry-catalog';
import {withBase} from '../lib/urls';
import {createRegionalClimateSelection} from './atlas-regional-climate-selection';
import {renderOceaniaRequiredLegend} from './atlas-oceania-legend';
import {getOceaniaComparisonReading} from '../data/atlas/oceania-comparison-reading';
import {oceaniaIndustryReadingThemes,oceaniaIndustryRepresentativeMarks,oceaniaIndustrySectors,oceaniaIndustryMarkSectors,type OceaniaIndustrySector} from '../data/atlas/oceania-industry-reading';
import {oceaniaFields,oceaniaCountries,oceaniaLayers,oceaniaThemes,oceaniaPopulationReading,oceaniaOverviewReadings,getOceaniaFarmingGeography,createOceaniaState,getOceaniaTheme,getOceaniaLayer,renderOceaniaScene,renderOceaniaLegend,oceaniaCoverage,oceaniaFocusName,type OceaniaField,type OceaniaState,type OceaniaSource} from '../data/atlas/oceania-learning';

const htmlEscape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ownKeys=['theme','layer','place','scope','view','compare','reading','single','industryLocation','sector','sectorOnly','product','productOnly'];
export function initOceaniaLearningAtlas(root:HTMLElement):void{
 if(root.dataset.oceaniaReady==='true')return;
 const field=root.dataset.field as OceaniaField;
 let state=createOceaniaState(location.search,field);
 const climateSelection=createRegionalClimateSelection(root,'oceania',()=>field==='nature'&&state.layer==='climate'&&!state.comparison,mutate=>update(mutate));
 const isSelectedReading=()=>new URLSearchParams(location.search).get('reading')==='selection'||state.place!=='all'||state.scope!=='all'||!!state.industryLocation||!!state.industry||(field==='agriculture'&&state.layer!=='farming-all');
 let selectedReading=isSelectedReading();
 let selectedRiver:string|undefined;
 const riverNames:Record<string,string>={Murray:'マレー川',Darling:'ダーリング川',Waikato:'ワイカト川'};
 const overview=oceaniaOverviewReadings[field];
 const one=<T extends HTMLElement=HTMLElement>(hook:string)=>root.querySelector<T>(`[data-${hook}]`)!;
 const text=(hook:string,value:string)=>{one(hook).textContent=value;};
 const targetName=()=>state.scope==='country'?(oceaniaCountries.find(c=>c.code===state.place)?.name??'オセアニア全体'):state.scope==='theme'?getOceaniaTheme(state).title:'オセアニア全体';
 const serialized=(s:OceaniaState,href=location.href)=>{
  const url=new URL(href,location.href);for(const key of ownKeys)url.searchParams.delete(key);
  if(s.field==='industry'&&s.industry){url.searchParams.set('product',s.industry);if(s.industryOnly)url.searchParams.set('productOnly','1');}
  climateSelection.serialize(url,s.field==='nature'&&s.layer==='climate'&&!s.comparison&&url.pathname.includes('/nature/'));
  url.searchParams.set('theme',s.theme);url.searchParams.set('layer',s.layer);url.searchParams.set('place',s.place);url.searchParams.set('scope',s.scope);
  if(s.comparison)url.searchParams.set('view','comparison');url.searchParams.set('compare',s.compareLayer);if(s.field==='agriculture'&&s.layer!=='farming-all'&&s.single)url.searchParams.set('single','1');if(s.field==='industry'&&['industry-all','places'].includes(s.layer)&&s.industryLocation)url.searchParams.set('industryLocation',s.industryLocation);if(s.field==='industry'&&s.sector){url.searchParams.set('sector',s.sector);if(s.sectorOnly)url.searchParams.set('sectorOnly','1');}if(selectedReading)url.searchParams.set('reading','selection');const params=new URLSearchParams(location.search);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}return url;
 };
 const chooseCountryTheme=()=>{
  if(state.place==='all')return;
  const theme=getOceaniaTheme(state);if(theme.countryCodes.includes(state.place))return;
  const suitable=oceaniaThemes.find(t=>t.field===field&&t.countryCodes.includes(state.place)&&(state.layer==='industry-all'||state.layer==='farming-all'||t.defaultLayer===state.layer));
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
  syncAgroStatistics(root,{country:state.place==='all'?'':state.place,topic:state.layer,active:field==='agriculture'});
  climateSelection.beforeRender();
  const theme=getOceaniaTheme(state),layer=getOceaniaLayer(state.layer,state),compare=getOceaniaLayer(state.compareLayer,state);
  const contextualReading=selectedReading&&layer.id!=='farming-all'&&(state.place==='all'||theme.countryCodes.includes(state.place));
  const selectedName=oceaniaCountries.find(country=>country.code===state.place)?.name;
  one<HTMLSelectElement>('place').value=state.place;one<HTMLSelectElement>('layer').value=state.layer;one<HTMLSelectElement>('compare-layer').value=state.compareLayer;
  const single=root.querySelector<HTMLButtonElement>('[data-farming-single]');if(single){single.hidden=layer.id==='farming-all';single.setAttribute('aria-pressed',String(!!state.single));single.textContent=state.single?'全品目を表示':'この品目だけ表示';}
  root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(selectedReading&&(field!=='agriculture'||layer.id!=='farming-all')&&b.dataset.theme===state.theme)));
  root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.scope===state.scope));b.disabled=b.dataset.scope==='country'&&state.place==='all';});
  one('normal-view').hidden=state.comparison;one('comparison-view').hidden=!state.comparison;
  for(const [prefix,item] of [['primary',layer],['original',layer],['comparison',compare]] as const){
   text(prefix+'-title',(prefix==='original'?'元の分布：':'')+item.title+(state.scope==='country'?' · '+targetName()+(oceaniaFocusName(state)?'／'+oceaniaFocusName(state):''):''));
   text(prefix+'-period',item.period);text(prefix+'-unit',item.unit+(item.resolution?' · '+item.resolution:''));const legend=renderOceaniaLegend(item);one(prefix+'-legend').innerHTML=prefix==='primary'?renderOceaniaRequiredLegend(item):legend;
   if(prefix==='primary'){one('primary-legend-spacer').innerHTML=legend;one('primary-legend-dictionary-content').innerHTML=legend;const summary=root.querySelector<HTMLElement>('[data-legend-dictionary-summary]');if(summary)summary.textContent=item.id==='climate'?'気候コードの名称を詳しく読む':'全ての数量階級と線の凡例';one('primary-legend-dictionary').hidden=item.field!=='nature'&&field!=='agriculture';text('primary-legend-unit',item.period+' ・ '+item.unit);root.querySelector<HTMLElement>('[data-required-legend-layer]')!.dataset.requiredLegendLayer=item.id;}
  }
  if(field==='agriculture')root.querySelectorAll<HTMLElement>('[data-farming-key],[data-farming-legend]').forEach(item=>{const product=item.dataset.farmingKey??item.dataset.farmingLegend;item.hidden=!!state.single&&product!==layer.id;});
  text('theme-title',contextualReading?theme.title:selectedName?selectedName+'の'+layer.title:overview.title);text('takeaway',contextualReading?theme.takeaway:overview.takeaway);text('explanation',contextualReading?theme.explanation:selectedName?selectedName+'を選択しています。 '+layer.coverage:overview.explanation);
  if(field==='nature'&&layer.id!=='climate'){text('theme-title',layer.title);text('takeaway',layer.id==='precipitation'?'長期の年降水量は地域ごとに違います。地図の青い階級と250 mm間隔の線を照らし合わせて読みます。':layer.id==='rivers'?'名称付きの代表河川の位置を確認します。線の順序から流向や河口は判断しません。':'海抜500 mごとの段階色と等高線から、大陸・島々の高さの違いを読みます。');text('explanation',layer.coverage);}
  if(field==='agriculture'){one('geography-reading').textContent=getOceaniaFarmingGeography(layer.id,state.place);text('explanation',overview.explanation);}
  const industryMark=field==='industry'?oceaniaIndustryRepresentativeMarks.find(mark=>mark.id===state.industryLocation):undefined;
  const catalogItem=field==='industry'?getOceaniaCatalogItem(state.industry):undefined;
  const mapKey=root.querySelector<HTMLElement>('[data-oceania-industry-map-key]');
  if(mapKey){const sector=state.sector??'resources';mapKey.textContent=(sector==='resources'?'資源・エネルギーの分布。色付き丸＝2025年鉱山原本、白抜き記号＝都市・地区案内。石炭は炭種未分類。':sector==='manufacturing'?'製造業の分布。記号＝加工地区・都市案内。都市案内は工場敷地ではありません。':'サービス業の分布。記号＝観光・教育の都市案内と港湾・物流の代表。')+' 記号の大きさは生産量ではありません。全国注記は施設位置ではなく、統計・工程・出典は地図下。NC＝ニューカレドニア。';}

  const industryTheme=industryMark?oceaniaIndustryReadingThemes.find(item=>item.marks.some(mark=>mark.id===industryMark.id)):undefined;
  const industryReturn=root.querySelector<HTMLButtonElement>('[data-oceania-industry-return]');if(industryReturn)industryReturn.hidden=!industryMark;
  if(field==='industry'&&state.sector&&!industryMark){const sector=oceaniaIndustrySectors[state.sector];text('theme-title','オセアニアの'+sector.title);text('takeaway',sector.takeaway);text('explanation',sector.explanation);}
  const only=root.querySelector<HTMLButtonElement>('[data-industry-only]');if(only){only.hidden=true;only.setAttribute('aria-pressed','true');}
  root.querySelectorAll<HTMLButtonElement>('[data-industry-sector]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.industrySector===state.sector)));
  if(industryMark){text('theme-title',industryMark.name);text('takeaway',industryMark.coordinateMeaning==='urban-centre-guide-not-factory'?'企業の工程・所在地を読む都市中心の案内位置です。工場の入口・敷地ではありません。':industryTheme?.takeaway??oceaniaOverviewReadings.industry.takeaway);text('explanation',industryMark.note);}
  if(catalogItem&&!industryMark){text('theme-title',catalogItem.label);text('takeaway',catalogItem.geography);text('explanation',catalogItem.meaning+' '+catalogItem.stages+' '+catalogItem.limitation);}
  const productSelect=root.querySelector<HTMLSelectElement>('[data-oceania-product]');if(productSelect){const items=oceaniaIndustryCatalog.filter(i=>i.sector===state.sector);productSelect.innerHTML='<option value="all">この分野の全産業</option>'+items.map(i=>`<option value="${i.id}">${htmlEscape(i.label)}</option>`).join('');productSelect.value=state.industry??'all';}
  const productOnly=root.querySelector<HTMLButtonElement>('[data-oceania-product-only]');if(productOnly){productOnly.disabled=!state.industry;productOnly.setAttribute('aria-pressed',String(!!state.industryOnly));productOnly.textContent=state.industryOnly?'他の産業も表示':'この産業だけ表示';}
  const statistics=root.querySelector<HTMLElement>('[data-oceania-industry-statistics]');
  if(statistics){statistics.querySelector('[data-catalog-stat-title]')!.textContent=catalogItem?catalogItem.label+'：年・対象範囲を分けて読む':oceaniaIndustrySectors[state.sector??'resources'].title+'の規模と供給網';for(const [key,id] of [['scale',state.sector==='manufacturing'?'dairy':state.sector==='services'?'tourism':'gold'],['world',state.sector==='manufacturing'?'aluminium':state.sector==='services'?'education':'iron'],['concentration',state.sector==='manufacturing'?'tuna':state.sector==='services'?'tourism':'lng']] as const){const stat=(catalogItem??getOceaniaCatalogItem(id)!)[key],card=statistics.querySelector(`[data-catalog-stat="${key}"]`)!;card.querySelector('[data-catalog-stat-copy]')!.textContent=stat.text;card.querySelector('[data-catalog-stat-sources]')!.innerHTML=stat.sources.map(id=>`<a href="${htmlEscape(oceaniaCatalogSources[id].url)}">${htmlEscape(oceaniaCatalogSources[id].title)}</a>`).join('');}}
  text('coverage',oceaniaCoverage(layer,state));text('comparison',compare.title+'と比べる →');text('return','← '+layer.title+'へ戻る：'+targetName()+(state.scope!=='country'&&state.place!=='all'?'／選択：'+oceaniaCountries.find(c=>c.code===state.place)?.name:''));text('comparison-explanation',comparisonText());
  const shorter=one(layer.legend.length<=compare.legend.length?'original-map':'comparison-map').closest('.oceania-learning-map-panel');shorter?.append(one('comparison-explanation'));
  const keys:Record<string,keyof typeof oceaniaPopulationReading.contexts>={AUS:'australia',NZL:'new-zealand',PNG:'papua-new-guinea',FJI:'fiji',KIR:'tarawa',PYF:'tahiti',WSM:'samoa'};
  if(field==='population'&&selectedReading){const context=oceaniaPopulationReading.contexts[keys[state.place]??'overview'];text('explanation',[context,theme.explanation.replace(context,'').trim()].filter(Boolean).join(' '));}
  text('social-context',field==='agriculture'?getOceaniaFarmingGeography(layer.id):field==='population'?oceaniaPopulationReading.socialConnections.map(c=>c.title+'：'+c.text).join('\n\n'):field==='industry'&&state.sector&&!industryMark?oceaniaIndustrySectors[state.sector].explanation:industryTheme?.explanation??theme.explanation);
  if(catalogItem&&!industryMark)text('social-context',catalogItem.meaning+' '+catalogItem.stages);
  sources([...(catalogItem?[...new Set([...catalogItem.scale.sources,...catalogItem.world.sources,...catalogItem.concentration.sources,'mines','cities','boundaries'])].map(id=>oceaniaCatalogSources[id]):[]),...layer.sources,...theme.sources,...(industryMark?[{title:industryMark.name+(industryMark.coordinateMeaning==='urban-centre-guide-not-factory'?'の企業公式資料（座標資料とは別）':'の位置資料'),url:industryMark.sourceUrl},...(industryTheme?.sources??[])]:[]),...(field==='agriculture'?[...getOceaniaLayer('farming-all').sources,...oceaniaThemes.filter(t=>t.field==='agriculture').flatMap(t=>t.sources)]:[]),...(state.comparison?[...compare.sources,...getOceaniaComparisonReading(state).sources]:[]),...oceaniaPopulationReading.sources.filter(s=>s.id.startsWith('world-bank')||s.id.startsWith('abs')).map(s=>({title:s.title,url:s.url}))]);
  root.querySelectorAll<HTMLAnchorElement>('[data-field-link]').forEach(a=>{
   const nextField=a.dataset.fieldLink as OceaniaField,available=oceaniaThemes.filter(t=>t.field===nextField),nextTheme=available.find(t=>t.countryCodes.includes(state.place))??available[0];
   a.href=serialized({...state,field:nextField,theme:nextTheme.id,layer:nextField==='industry'?'industry-all':nextField==='agriculture'?'farming-all':nextTheme.defaultLayer,compareLayer:nextTheme.comparisonLayer,comparison:false},withBase(`/atlas/oceania/${nextField}/`)).href;
  });
  root.querySelectorAll<HTMLAnchorElement>('[data-oceania-overview-link],[data-oceania-base-link]').forEach(a=>{a.href=serialized({...state,comparison:false},a.href).href;});
  if(state.comparison){scene('original-map',state.layer);scene('comparison-map',state.compareLayer);}else scene('primary-map',state.layer);
  if(field==='industry')root.querySelectorAll<SVGElement>('[data-industry-sectors]').forEach(item=>{const match=!state.sector||item.dataset.industrySectors?.split(' ').includes(state.sector);item.dataset.sectorMatch=String(!!match);item.dataset.sectorOnly=String(!!state.sectorOnly);});
  if(field==='industry'&&state.industryOnly)root.querySelectorAll<SVGElement>('[data-oceania-industry-location]').forEach(mark=>{if(!catalogItem?.anchors.some(anchor=>anchor.kind==='saved'&&anchor.key===mark.dataset.oceaniaIndustryLocation))mark.style.display='none';});
  if(field==='industry')root.querySelectorAll<SVGElement>('[data-oceania-mine-tags]').forEach(mark=>{const match=!state.industry||mark.dataset.oceaniaMineTags?.split(' ').includes(state.industry);mark.style.opacity=match?'1':'.18';if(state.industryOnly&&!match)mark.style.display='none';});
  climateSelection.render();
  if(field==='nature'&&state.layer==='rivers'&&selectedRiver&&riverNames[selectedRiver]){
   text('theme-title',riverNames[selectedRiver]);
   text('takeaway',`${riverNames[selectedRiver]}の原本河川中心線を示します。流向・河口・流域境界はこの資料から判断しません。`);
   text('explanation',layer.coverage);
   root.querySelectorAll<SVGElement>('[data-primary-map] [data-river-name]').forEach(item=>item.dataset.selected=String(item.dataset.riverName===selectedRiver));
   root.querySelectorAll<SVGElement>('[data-primary-map] [data-river-label]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.riverLabel===selectedRiver)));
  }
 };
 const update=(mutate:()=>void,focus?:string)=>{
  mutate();history.pushState({},'',serialized(state));render();if(focus)one(focus).focus();
 };
 const chooseProduct=(id:string)=>{const item=getOceaniaCatalogItem(id);update(()=>{state.industry=item?.id;state.industryOnly=false;state.industryLocation=undefined;state.sector=item?.sector??state.sector??'resources';state.sectorOnly=true;state.layer='industry-all';selectedReading=!!item;});};
 root.querySelector<HTMLSelectElement>('[data-oceania-product]')?.addEventListener('change',e=>chooseProduct((e.target as HTMLSelectElement).value));
 root.querySelector('[data-oceania-product-only]')?.addEventListener('click',()=>{if(state.industry)update(()=>{state.industryOnly=!state.industryOnly;});});
 root.querySelector('[data-oceania-product-clear]')?.addEventListener('click',()=>chooseProduct('all'));
 one<HTMLSelectElement>('place').addEventListener('change',e=>update(()=>{state.place=(e.target as HTMLSelectElement).value;state.industryLocation=undefined;if(state.place==='all')state.scope='all';selectedReading=state.place!=='all'||(field==='agriculture'&&state.layer!=='farming-all');chooseCountryTheme();}));
 one<HTMLSelectElement>('layer').addEventListener('change',e=>update(()=>{state.layer=(e.target as HTMLSelectElement).value;state.industry=undefined;state.industryOnly=false;selectedRiver=undefined;state.single=false;state.industryLocation=undefined;if(field==='industry'){state.sector=state.sector??'resources';state.sectorOnly=true;}selectedReading=state.layer!=='farming-all'||state.place!=='all'||state.scope!=='all';const matching=oceaniaThemes.find(t=>t.field===field&&t.defaultLayer===state.layer)||oceaniaThemes.find(t=>t.field===field&&t.id===(['sheep','cattle'].includes(state.layer)?'livestock':['coconut','cacao'].includes(state.layer)?'tropical-crops':state.theme));if(matching)state.theme=matching.id;}));
 root.querySelectorAll<HTMLButtonElement>('[data-industry-sector]').forEach(button=>button.addEventListener('click',()=>update(()=>{const sector=button.dataset.industrySector as OceaniaIndustrySector;state.sector=sector;state.sectorOnly=true;state.industryLocation=undefined;state.industry=undefined;state.industryOnly=false;state.layer='industry-all';selectedReading=!!state.sector;})));
 root.querySelector<HTMLButtonElement>('[data-industry-only]')?.addEventListener('click',()=>update(()=>{state.sectorOnly=true;}));
 root.querySelector<HTMLButtonElement>('[data-farming-single]')?.addEventListener('click',()=>update(()=>{state.single=!state.single;}));
 root.querySelectorAll<HTMLButtonElement>('[data-farming-group]').forEach(button=>button.addEventListener('click',()=>{
  const group=button.dataset.farmingGroup;
  if(group!=='crop'&&group!=='livestock')return;
  const visible=button.getAttribute('aria-pressed')!=='true';
  button.setAttribute('aria-pressed',String(visible));
  root.classList.toggle(`farming-${group}-hidden`,!visible);
 }));
 one<HTMLSelectElement>('compare-layer').addEventListener('change',e=>update(()=>{state.compareLayer=(e.target as HTMLSelectElement).value;}));
 root.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.addEventListener('click',()=>update(()=>{const t=getOceaniaTheme({field,theme:b.dataset.theme!});selectedReading=true;state.theme=t.id;state.industryLocation=undefined;if(field!=='industry'){state.layer=t.defaultLayer;state.single=false;}})));
 root.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(b=>b.addEventListener('click',()=>update(()=>{state.scope=b.dataset.scope as OceaniaState['scope'];selectedReading=state.scope!=='all'||state.place!=='all'||(field==='agriculture'&&state.layer!=='farming-all');if(state.scope==='country')chooseCountryTheme();})));
 one('comparison').addEventListener('click',()=>update(()=>{state.comparison=true;},'return'));
 one('return').addEventListener('click',()=>update(()=>{state.comparison=false;},'comparison'));
 root.querySelector<HTMLButtonElement>('[data-oceania-industry-return]')?.addEventListener('click',()=>update(()=>{state.industryLocation=undefined;state.sector=state.sector??'resources';state.sectorOnly=true;selectedReading=state.place!=='all'||state.scope!=='all';}));
 const chooseIndustryMark=(id:string)=>{const mark=oceaniaIndustryRepresentativeMarks.find(item=>item.id===id);if(!mark||field!=='industry')return;update(()=>{state.industryLocation=id;state.industry=undefined;state.industryOnly=false;const sectors=oceaniaIndustryMarkSectors[id];if(!state.sector||!sectors.includes(state.sector)){state.sector=sectors[0];state.sectorOnly=true;}state.theme=oceaniaIndustryReadingThemes.find(item=>item.marks.some(itemMark=>itemMark.id===id))?.id??state.theme;selectedReading=true;});root.querySelector<SVGElement>(`[data-oceania-industry-location="${id}"]`)?.focus();};
 const chooseRiver=(id:string)=>{if(field!=='nature'||state.layer!=='rivers'||!riverNames[id])return;selectedRiver=id;render();root.querySelector<SVGElement>(`[data-primary-map] [data-river-label="${id}"]`)?.focus({preventScroll:true});};
 root.addEventListener('click',e=>{const target=e.target as Element;const river=target.closest<SVGElement>('[data-primary-map] [data-river-name],[data-primary-map] [data-river-label]');if(river){chooseRiver(river.dataset.riverName??river.dataset.riverLabel!);return;}const industry=target.closest<SVGElement>('[data-oceania-industry-location]');if(industry){chooseIndustryMark(industry.dataset.oceaniaIndustryLocation!);return;}const selected=target.closest<SVGElement>('[data-map-place]');if(selected)update(()=>{selectedReading=true;state.industryLocation=undefined;state.place=selected.dataset.mapPlace!;chooseCountryTheme();});});
 root.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const river=(e.target as Element).closest<SVGElement>('[data-primary-map] [data-river-label]');if(river){e.preventDefault();chooseRiver(river.dataset.riverLabel!);return;}const industry=(e.target as Element).closest<SVGElement>('[data-oceania-industry-location]');if(industry){e.preventDefault();chooseIndustryMark(industry.dataset.oceaniaIndustryLocation!);}});
 window.addEventListener('popstate',()=>{state=createOceaniaState(location.search,field);selectedReading=isSelectedReading();climateSelection.read();render();});
 history.replaceState({},'',serialized(state));render();
 let resizing=false;new ResizeObserver(()=>{if(resizing)return;resizing=true;requestAnimationFrame(()=>{render();resizing=false;});}).observe(root);
 root.dataset.oceaniaReady='true';
}
