import {industryExportColor,industryValueText,industryComparisonUrl,industryPopulationReturnUrl,readMexicoIndustryState,writeMexicoIndustryState,isMexicoIndustryPairMetric,mexicoIndustryStatusLabels,mexicoIndustrySectors,mexicoIndustryMetricChoices,type MexicoIndustryMetric,type MexicoIndustryState,type MexicoIndustryValue} from '../lib/atlas-mexico-industry';
import {formatMexicoDensity,formatMexicoPopulation,mexicoDensityColor,mexicoPopulationRadius,mexicoPopulationSymbolColor,mexicoPopulationSymbolOpacity,mexicoPopulationSymbolStroke,mexicoPopulationSelectedSymbolStroke,mexicoPopulationSelectedSymbolOpacity,type MexicoPopulationRow} from '../lib/atlas-mexico-population';

type IndustryRow={id:string;values:Record<MexicoIndustryMetric,MexicoIndustryValue>};
type IndustryPlace={id:string;name:string;short:string;sourceName:string};
type Reading={comparison:{title:string;lead:string;text:string};populationComparison:{title:string;lead:string;text:string;periodNote:string};transport:{heading:string;text:string};electronics:{heading:string;text:string};causal:string[]};
type Config={data:{year:number;states:IndustryPlace[];rows:IndustryRow[];metrics:{id:MexicoIndustryMetric;name:string;sector:string;scope?:string;code?:string;sourceCodes?:string[];longName?:string}[]};population:{states:MexicoPopulationRow[]};reading:Reading&Record<string,{heading:string;text:string;note?:string}>;labels:Record<string,[number,number]>;views:Record<string,string>;industryHref:string;populationHref:string;mapViewBox:string;catalog:{sectorReadings:Record<string,{text:string;places:{state:string;text:string}[]}>}};

export function initMexicoIndustry(root:HTMLElement):void {
 if(root.dataset.miInitialized==='true')return;
 const raw=root.querySelector<HTMLScriptElement>('[data-mi-config]')?.textContent;
 if(!raw)return;
 const config=JSON.parse(raw) as Config;
 const stateIds=config.data.states.map(s=>s.id),places=new Map(config.data.states.map(s=>[s.id,s])),rows=new Map(config.data.rows.map(r=>[r.id,r])),population=new Map(config.population.states.map(r=>[r.stateCode,r]));
 const selection=(url:URL)=>{const value=readMexicoIndustryState(url,stateIds),choice=mexicoIndustryMetricChoices.find(m=>m.id===value.metric)!;if(!value.sector){value.sector=url.searchParams.has('metric')||value.compare?choice.sector as MexicoIndustryState['sector']:'all';value.subsector=value.sector!=='all'?value.metric:'all';}if(value.compare){value.sector=choice.sector as MexicoIndustryState['sector'];value.subsector=value.metric;}return value;};
 let state=selection(new URL(window.location.href));
 const cameraViews=new WeakMap<SVGSVGElement,string>();
 const one=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector);
 const all=<T extends Element=HTMLElement>(selector:string)=>Array.from(root.querySelectorAll<T>(selector));
 const text=(selector:string,value:string)=>{for(const el of all(selector))el.textContent=value;};
 const show=(selector:string,visible:boolean)=>{for(const el of all(selector))el.toggleAttribute('hidden',!visible);};
 const otherMetric=(metric:MexicoIndustryMetric):MexicoIndustryMetric=>metric==='transport'?'electronics':'transport';
 const metricName=(metric:MexicoIndustryMetric)=>config.data.metrics.find(m=>m.id===metric)!.name;
 const missing:MexicoIndustryValue={value:null,sourceValue:null,sourceStatus:'未取得',publicationStatus:'',status:'unretrieved'};
 const valueFor=(code:string,metric:MexicoIndustryMetric)=>rows.get(code)?.values[metric]??missing;
 const populationValue=(code:string)=>{const row=population.get(code)!;return state.sourceView==='density'?`${formatMexicoDensity(row.density,row.densityStatus)} 人/km²`:`${formatMexicoPopulation(row.population,row.populationStatus)} 人`;};

 function resizeLabels():void {
  for(const svg of all<SVGSVGElement>('[data-mi-map]')) {
   if(svg.closest('[hidden]'))continue;
   const parts=svg.getAttribute('viewBox')!.split(/\s+/).map(Number),rect=svg.getBoundingClientRect(),scale=Math.min(rect.width/parts[2],rect.height/parts[3]);
   if(!scale)continue;
   const size=14/scale;
   for(const label of Array.from(svg.querySelectorAll<SVGTextElement>('[data-mi-label],[data-mi-context-label],[data-mi-region-label]'))) {
    label.style.fontSize=`${size}px`;label.style.strokeWidth=`${3/scale}px`;
    if(label.dataset.miLabel){const code=label.dataset.miLabel;label.setAttribute('y',String(config.labels[code][1]-(svg.dataset.miKind==='population'?mexicoPopulationRadius(population.get(code)!.population)+6/scale:7)));}
   }
  }
  const source=one<SVGSVGElement>('[data-mi-map="secondary"]'),legend=one<SVGSVGElement>('.mi-circle-legend');
  if(state.compare==='population'&&state.sourceView==='population'&&source&&legend){
   const sourceBox=source.getAttribute('viewBox')!.split(/\s+/).map(Number),sourceRect=source.getBoundingClientRect(),legendRect=legend.getBoundingClientRect();
   const sourceScale=Math.min(sourceRect.width/sourceBox[2],sourceRect.height/sourceBox[3]),legendScale=Math.min(legendRect.width/330,legendRect.height/75);
   if(sourceScale&&legendScale){for(const circle of Array.from(legend.querySelectorAll<SVGCircleElement>('[data-mi-size-reference]'))){circle.setAttribute('r',String(mexicoPopulationRadius(Number(circle.dataset.miSizeReference))*sourceScale/legendScale));circle.style.fill=mexicoPopulationSymbolColor;circle.style.fillOpacity=String(mexicoPopulationSymbolOpacity);circle.style.stroke=mexicoPopulationSymbolStroke;circle.style.strokeWidth=String(1.4*sourceScale/legendScale);circle.style.vectorEffect='none';}for(const label of Array.from(legend.querySelectorAll<SVGTextElement>('text')))label.style.fontSize=`${14/legendScale}px`;}
  }
 }

 function map(slot:'primary'|'secondary',metric:MexicoIndustryMetric|null):void {
  const isPopulation=metric===null,svg=one<SVGSVGElement>(`[data-mi-map="${slot}"]`)!,geographic=slot==='primary'&&!state.compare;
  svg.dataset.miKind=isPopulation?state.sourceView:metric!;
  const title=geographic?`${mexicoIndustrySectors.find(s=>s.id===state.sector)!.label}を読む地域`:isPopulation?`${state.sourceView==='density'?'人口密度':'人口'}・2020年`:`${metricName(metric!)}の輸出額・2025年速報`;
  const heading=one(`[data-mi-map-heading="${slot}"]`)!;
  const category=isPopulation?null:config.data.metrics.find(m=>m.id===metric)!;
  const sub=document.createElement('span');sub.textContent=geographic?'州の位置案内・点の大きさは数量ではない':isPopulation?(state.sourceView==='density'?'州平均・人/km²':'円の面積が人口に比例・人'):`SCIAN ${category!.sourceCodes?.join('＋')??category!.code}：${category!.longName??category!.name}${metric==='electronics'?'（半導体単独ではない）':''}｜FOB・10億米ドル`;
  heading.replaceChildren(document.createTextNode(title),sub);
  text(`#mi-${slot}-title`,title);
  text(`#mi-${slot}-desc`,geographic?'州境は位置の参照。点は本文の州を読む案内位置で、工場の所在地や数量を表しません。':isPopulation?(state.sourceView==='density'?'元の2020年人口密度分布。色は州平均の人/km²。':'元の2020年人口分布。円の面積は人口に比例。'):'色は州の生産地に配分されたFOB輸出額。両業種は共通階級。秘匿は斜線、未把握は点模様。');
  const top=isPopulation?[]:metric==='transport'?['05','11']:['08','14'];
  for(const shape of Array.from(svg.querySelectorAll<SVGPathElement>('[data-mi-shape]'))) {
   const code=shape.dataset.miShape!,selected=code===state.state;
   shape.toggleAttribute('hidden',!geographic&&state.only&&!selected);shape.classList.toggle('is-selected',!geographic&&selected);
   const fill=geographic?'#edf1df':isPopulation?(state.sourceView==='density'?mexicoDensityColor(population.get(code)!.density,population.get(code)!.densityStatus):'#e0e7d8'):industryExportColor(valueFor(code,metric!).value,valueFor(code,metric!).status,`mi-${slot}`);
   shape.setAttribute('fill',fill);shape.setAttribute('tabindex',state.fallback?'-1':'0');shape.setAttribute('role',state.fallback?'img':'button');
   if(state.fallback)shape.removeAttribute('aria-pressed');else shape.setAttribute('aria-pressed',String(!geographic&&selected));
   const label=geographic?`${places.get(code)!.name}の位置を選ぶ`:`${places.get(code)!.name} ${isPopulation?populationValue(code):industryValueText(valueFor(code,metric!))} ${isPopulation?'2020年':'2025年速報'}`;
   shape.setAttribute('aria-label',label);const shapeTitle=shape.querySelector('title');if(shapeTitle)shapeTitle.textContent=label;
   shape.dataset.miStatus=isPopulation?'value':valueFor(code,metric!).status;
  }
  for(const label of Array.from(svg.querySelectorAll<SVGTextElement>('[data-mi-label]'))) {
   const code=label.dataset.miLabel!;label.toggleAttribute('hidden',state.only?code!==state.state:!(code===state.state||top.includes(code)));
  }
  svg.querySelector('[data-mi-context-label]')?.toggleAttribute('hidden',(state.zoom&&!isPopulation)||state.only);
  for(const circle of Array.from(svg.querySelectorAll<SVGCircleElement>('[data-mi-population-circle]'))) {
   const selected=circle.dataset.miPopulationCircle===state.state;
   circle.style.fill=mexicoPopulationSymbolColor;circle.style.fillOpacity=String(selected?mexicoPopulationSelectedSymbolOpacity:mexicoPopulationSymbolOpacity);circle.style.stroke=selected?mexicoPopulationSelectedSymbolStroke:mexicoPopulationSymbolStroke;circle.style.strokeWidth=selected?'3.2':'1.4';circle.style.vectorEffect='none';
   circle.toggleAttribute('hidden',state.only&&!selected);circle.classList.toggle('is-selected',selected);circle.setAttribute('tabindex',state.fallback?'-1':'0');circle.setAttribute('role',state.fallback?'img':'button');
   if(state.fallback)circle.removeAttribute('aria-pressed');else circle.setAttribute('aria-pressed',String(selected));
  }
  show(`[data-mi-export-legend="${slot}"]`,!isPopulation&&!geographic);
  if(slot==='secondary') {
   show('[data-mi-population-legend]',isPopulation);show('[data-mi-density-legend]',isPopulation&&state.sourceView==='density');
   show('[data-mi-population-size-legend]',isPopulation&&state.sourceView==='population');show('[data-mi-population-circles]',isPopulation&&state.sourceView==='population');
  }
  text(`[data-mi-map-caption="${slot}"]`,geographic?'州境は位置の参照。本文の地域から分野の分布へ進みます。':state.only?(isPopulation?'2020年。灰色は位置の参照。':'全世界向け。灰色は位置の参照。'):(isPopulation?(state.sourceView==='density'?'2020年。元の人口密度の階級。':'2020年。元の人口の面積比例円。'):`全世界向け・2025年速報。公開値 ${config.data.rows.filter(r=>['available','zero'].includes(r.values[metric!].status)).length}/32州。`));
 }

 function render():void {
  applyCamera();
  const selected=places.get(state.state)!,comparison=state.compare!==null,popComparison=state.compare==='population';
  root.classList.toggle('is-comparison',comparison);root.dataset.miRenderer=state.fallback?'static-fallback':'svg';root.dataset.miCompare=state.compare??'none';root.dataset.miSelected=state.state;root.dataset.miSourceState=state.sourceState;
  one('[data-mi-map-grid]')!.classList.toggle('mi-comparison-grid',comparison);
  show('[data-mi-figure="secondary"]',comparison);
  one<HTMLElement>('[data-mi-figure="secondary"]')!.style.order=popComparison?'0':'1';one<HTMLElement>('[data-mi-figure="primary"]')!.style.order=popComparison?'1':'0';
  show('[data-mi-source-view-control]',popComparison);show('[data-mi-comparison-heading]',comparison);show('[data-mi-reading-comparison]',comparison);show('[data-mi-reading-normal]',!comparison);
  const sector=mexicoIndustrySectors.find(s=>s.id===state.sector)!,scope=`${state.sector}:${state.subsector}`;
  root.dataset.industrySector=state.sector;root.dataset.industrySubsector=state.subsector;
  for(const button of all<HTMLButtonElement>('[data-industry-sector]')){const active=button.dataset.industrySector===state.sector;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  for(const row of all('[data-industry-subtabs]'))row.hidden=row.dataset.industrySubtabs!==state.sector;
  for(const button of all<HTMLButtonElement>('[data-industry-subsector]')){const active=button.dataset.industrySubsector===state.subsector;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  for(const panel of all('[data-mi-industry-panel]'))panel.hidden=comparison||panel.dataset.miIndustryPanel!==scope;
  text('[data-industry-breadcrumb]',sector.label+(state.sector!=='all'?' ／ '+(state.subsector==='all'?'全分野':mexicoIndustryMetricChoices.find(m=>m.id===state.subsector)?.name??'全分野'):''));
  one('[data-mi-map="primary"]')!.setAttribute('aria-labelledby',`mi-sector-${state.sector} mi-primary-title mi-primary-desc`);
  show('[data-mi-reading-markers]',!comparison);
  for(const point of all<SVGElement>('[data-mi-reading-markers] [data-mi-region-option]')){const visible=state.subsector==='all'?(point.dataset.miOverviewPlace==='true'&&(state.sector==='all'||point.dataset.miRegionSector===state.sector)):point.dataset.miRegionMetric===state.subsector;point.toggleAttribute('hidden',!visible);point.setAttribute('tabindex',visible?'0':'-1');point.classList.toggle('is-selected',visible&&point.dataset.miRegionOption===state.state);point.setAttribute('aria-pressed',String(visible&&point.dataset.miRegionOption===state.state));}
  text('[data-mi-selected-place-name]',selected.name+'｜'+(state.subsector==='all'?sector.label:metricName(state.metric)));
  const sectorCopy=config.catalog.sectorReadings[state.sector!],local=sectorCopy?.places.find(p=>p.state===state.state);
  const broad=local?.text??sectorCopy?.text??config.reading.causal[0];
  const fine=state.metric==='transport'&&state.state==='05'?'コアウイラの輸送機器を、米国国境への近さ、部品の集積、道路・鉄道と市場につなげて読む。':state.metric==='transport'&&state.state==='11'?'グアナフアトは内陸のバヒオ。組立工場と部品集積が、国境・港への交通と市場につながる。':state.metric==='electronics'&&state.state==='08'?'チワワの電子機器を、北部の生産拠点と米国への交通・市場につなげて読む。':state.metric==='electronics'&&state.state==='14'?'ハリスコの電子機器を、グアダラハラ周辺の技術・部品集積と輸送・市場につなげて読む。':config.reading[state.metric].text;
  text('[data-mi-selected-place-text]',state.subsector==='all'?broad:fine);
  show('[data-mi-selected-place-reading]',!comparison&&state.sector!=='all');
  show('[data-mi-sector-legend]',!comparison);show('[data-mi-geography-scope]',!comparison&&(state.sector==='all'||state.subsector==='all'));
  show('.mi-items',comparison||state.subsector!=='all');show('[data-mi-electronics-link]',isMexicoIndustryPairMetric(state.metric)&&(comparison||(state.sector==='manufacturing'&&state.subsector!=='all')));
  show('[data-mi-legend-slot="secondary"]',comparison);
  const explanation=popComparison?config.reading.populationComparison:config.reading.comparison;
  text('[data-mi-comparison-title]',explanation.title);text('[data-mi-comparison-lead]',explanation.lead);text('[data-mi-reading-comparison-title]',explanation.title);text('[data-mi-reading-comparison-text]',explanation.text);
  show('[data-mi-period-note]',popComparison);show('[data-mi-population-card]',popComparison);show('[data-mi-population-stats]',popComparison);
  const periodLabel=`${state.sourceView==='density'?'人口密度':'人口'}・2020年`;
  text('[data-mi-population-card-label]',periodLabel);text('[data-mi-population-card-value]',populationValue(state.state));text('[data-mi-population-stats-label]',`${periodLabel}・${state.sourceView==='density'?'人/km²':'人'}`);text('[data-mi-population-stats-value]',populationValue(state.state));
  text('[data-mi-selected-name]',selected.name);text('[data-mi-stats-state]',selected.name);
  for(const {id:metric} of config.data.metrics) {
   const value=valueFor(state.state,metric);text(`[data-mi-value="${metric}"]`,industryValueText(value));text(`[data-mi-stats-value="${metric}"]`,industryValueText(value));text(`[data-mi-stats-status="${metric}"]`,value.sourceStatus);
   show(`[data-mi-value-card="${metric}"]`,!popComparison||metric===state.metric);
  }
  for(const row of all('[data-mi-data-row]'))row.classList.toggle('is-selected',row.getAttribute('data-mi-data-row')===state.state);
  const reading=config.reading[state.metric];text('[data-mi-topic-heading]',reading.heading);text('[data-mi-topic-text]',reading.text);
  one<HTMLSelectElement>('[data-mi-metric]')!.value=state.metric;
  for(const button of all<HTMLButtonElement>('[data-mi-metric-button]')) {
   const selected=button.dataset.ownerSector===state.sector&&button.dataset.miMetricButton===state.subsector;
   button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  }
  one<HTMLSelectElement>('[data-mi-state-select]')!.value=state.state;one<HTMLSelectElement>('[data-mi-source-view]')!.value=state.sourceView;
  one<HTMLInputElement>('[data-mi-only]')!.checked=state.only;one<HTMLButtonElement>('[data-mi-zoom]')!.setAttribute('aria-pressed',String(state.zoom));
  text('[data-mi-zoom]',popComparison?'輸出図を拡大':'読む州を拡大');
  const current=new URL(window.location.href);
  one<HTMLAnchorElement>('[data-mi-electronics-link]')!.href=industryComparisonUrl(current,state,'electronics').href;one<HTMLAnchorElement>('[data-mi-population-link]')!.href=industryComparisonUrl(current,state,'population').href;
  text('[data-mi-population-link]',`${state.sourceView==='density'?'人口密度':'人口'}2020 × 輸出額2025：人と生産拠点の位置を比べる`);
  const back=one<HTMLAnchorElement>('[data-mi-return]')!;
  if(popComparison&&state.from==='population') {
   back.href=industryPopulationReturnUrl(config.populationHref,current,state).href;back.textContent=`${places.get(state.sourceState)!.name}の元の${state.sourceView==='density'?'人口密度':'人口'}地図へ戻る`;
  } else {
   back.href=writeMexicoIndustryState(current,{...state,compare:null,from:'industry'}).href;back.textContent=`${selected.name}の${metricName(state.metric)}地図へ戻る`;
  }
  map('primary',state.metric);if(comparison)map('secondary',popComparison?null:otherMetric(state.metric));
  const mode=state.only?`${selected.name}と比較相手の同州を表示`:'全32州を表示';
  const period=comparison?(popComparison?`人口2020年 × ${metricName(state.metric)}輸出2025年速報。`:`${metricName(state.metric)} × ${metricName(otherMetric(state.metric))}・2025年速報。`):'2025年速報・州の生産地に配分された輸出額。';
  text('[data-mi-map-status]',`${period}${mode}。${state.fallback?'簡易表示。':''}`);
  show('[data-mi-fallback-note]',state.fallback);
  document.title=`${comparison?explanation.title:'メキシコの主要産業'} | Insight Journal`;
  root.dataset.miReady='true';requestAnimationFrame(resizeLabels);
 }

 function change(patch:Partial<MexicoIndustryState>):void {
  state={...state,...patch};window.history.pushState(null,'',writeMexicoIndustryState(new URL(window.location.href),state));render();
  root.dispatchEvent(new CustomEvent('mexico-reading-mode',{detail:{selected:state.subsector!=='all'||!!state.compare}}));
 }
 root.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest<SVGElement>('[data-mi-shape],[data-mi-population-circle]'):null;
  if(target&&!state.fallback)change({state:target.getAttribute('data-mi-shape')??target.getAttribute('data-mi-population-circle')!});
 });
 root.addEventListener('keydown',event=>{
  if(!['Enter',' '].includes(event.key)||state.fallback)return;
  const target=event.target instanceof Element?event.target.closest<SVGElement>('[data-mi-shape],[data-mi-population-circle]'):null;
  if(target){event.preventDefault();change({state:target.getAttribute('data-mi-shape')??target.getAttribute('data-mi-population-circle')!});}
 });
 one<HTMLSelectElement>('[data-mi-state-select]')!.addEventListener('change',event=>change({state:(event.target as HTMLSelectElement).value}));
 const chooseMetric=(metric:MexicoIndustryMetric)=>change({metric,sector:mexicoIndustryMetricChoices.find(m=>m.id===metric)!.sector as MexicoIndustryState['sector'],subsector:metric,...(state.compare==='electronics'&&!isMexicoIndustryPairMetric(metric)?{compare:null}:{})});
 one<HTMLSelectElement>('[data-mi-metric]')!.addEventListener('change',event=>chooseMetric((event.target as HTMLSelectElement).value as MexicoIndustryMetric));
 for(const button of all<HTMLButtonElement>('[data-industry-sector]'))button.addEventListener('click',()=>{const sector=button.dataset.industrySector as MexicoIndustryState['sector'],place=config.catalog.sectorReadings[sector!]?.places[0];change({sector,subsector:'all',compare:null,...(place?{state:place.state}:{})});});
 for(const button of all<HTMLButtonElement>('[data-industry-subsector]'))button.addEventListener('click',()=>button.dataset.industrySubsector==='all'?change({sector:button.dataset.ownerSector as MexicoIndustryState['sector'],subsector:'all',compare:null}):chooseMetric(button.dataset.industrySubsector as MexicoIndustryMetric));
 for(const button of all<HTMLButtonElement>('[data-mi-jump-metric]'))button.addEventListener('click',()=>chooseMetric(button.dataset.miJumpMetric as MexicoIndustryMetric));
 for(const item of all<HTMLElement|SVGElement>('[data-mi-region-option]')){const choose=()=>change({state:item.dataset.miRegionOption!,sector:item.dataset.miRegionSector as MexicoIndustryState['sector'],subsector:item.dataset.miRegionMetric||'all',...(item.dataset.miRegionMetric?{metric:item.dataset.miRegionMetric}:{})});item.addEventListener('click',choose);if(item.tagName.toLowerCase()!=='button')item.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}});}
 const overview=()=>{change({subsector:'all',compare:null});one<HTMLButtonElement>(`[data-industry-sector="${state.sector}"]`)?.focus();};
 for(const button of all('[data-industry-overview]'))button.addEventListener('click',overview);
 one('#mi-description')?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();overview();}});
 for(const row of all('[role="tablist"]'))row.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=Array.from(row.querySelectorAll<HTMLButtonElement>('[role="tab"]')),index=tabs.indexOf(event.target as HTMLButtonElement);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
 one<HTMLAnchorElement>('a[href="#mi-statistics"]')?.addEventListener('click',()=>{one<HTMLDetailsElement>('#mi-statistics')!.open=true;});
 one<HTMLSelectElement>('[data-mi-source-view]')!.addEventListener('change',event=>change({sourceView:(event.target as HTMLSelectElement).value as 'density'|'population'}));
 function applyCamera(force=false):void {
  for(const svg of all<SVGSVGElement>('[data-mi-map]')) {
   const view=state.zoom&&(svg.dataset.miMap==='primary'||state.compare==='electronics')?config.views[state.state]:config.mapViewBox;
   // Preserve the current frame while an unzoomed selection keeps the same camera.
   if(force||cameraViews.get(svg)!==view)svg.setAttribute('viewBox',view);
   cameraViews.set(svg,view);
  }
 }
 one<HTMLInputElement>('[data-mi-only]')!.addEventListener('change',event=>change({only:(event.target as HTMLInputElement).checked}));
 one<HTMLButtonElement>('[data-mi-zoom]')!.addEventListener('click',()=>change({zoom:!state.zoom}));
 one<HTMLButtonElement>('[data-mi-all]')!.addEventListener('click',()=>{change({only:false,zoom:false});applyCamera(true);resizeLabels();});
 window.addEventListener('popstate',()=>{state=selection(new URL(window.location.href));render();});
 const observer=new ResizeObserver(resizeLabels);for(const svg of all<SVGSVGElement>('[data-mi-map]'))observer.observe(svg);
 root.dataset.miInitialized='true';render();
}
