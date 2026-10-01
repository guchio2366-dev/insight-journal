import {industryExportColor,industryValueText,industryComparisonUrl,industryPopulationReturnUrl,readMexicoIndustryState,writeMexicoIndustryState,mexicoIndustryStatusLabels,type MexicoIndustryMetric,type MexicoIndustryState,type MexicoIndustryValue} from '../lib/atlas-mexico-industry';
import {formatMexicoDensity,formatMexicoPopulation,mexicoDensityColor,mexicoPopulationRadius,mexicoPopulationSymbolColor,mexicoPopulationSymbolOpacity,mexicoPopulationSymbolStroke,mexicoPopulationSelectedSymbolStroke,mexicoPopulationSelectedSymbolOpacity,type MexicoPopulationRow} from '../lib/atlas-mexico-population';

type IndustryRow={id:string;values:Record<MexicoIndustryMetric,MexicoIndustryValue>};
type IndustryPlace={id:string;name:string;short:string;sourceName:string};
type Reading={comparison:{title:string;lead:string;text:string};populationComparison:{title:string;lead:string;text:string;periodNote:string};transport:{heading:string;text:string};electronics:{heading:string;text:string}};
type Config={data:{year:number;states:IndustryPlace[];rows:IndustryRow[];metrics:{id:MexicoIndustryMetric;name:string}[]};population:{states:MexicoPopulationRow[]};reading:Reading;labels:Record<string,[number,number]>;views:Record<string,string>;industryHref:string;populationHref:string;mapViewBox:string};

export function initMexicoIndustry(root:HTMLElement):void {
 if(root.dataset.miInitialized==='true')return;
 const raw=root.querySelector<HTMLScriptElement>('[data-mi-config]')?.textContent;
 if(!raw)return;
 const config=JSON.parse(raw) as Config;
 const stateIds=config.data.states.map(s=>s.id),places=new Map(config.data.states.map(s=>[s.id,s])),rows=new Map(config.data.rows.map(r=>[r.id,r])),population=new Map(config.population.states.map(r=>[r.stateCode,r]));
 let state=readMexicoIndustryState(new URL(window.location.href),stateIds);
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
   for(const label of Array.from(svg.querySelectorAll<SVGTextElement>('[data-mi-label],[data-mi-context-label]'))) {
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
  const isPopulation=metric===null,svg=one<SVGSVGElement>(`[data-mi-map="${slot}"]`)!;
  svg.setAttribute('viewBox',state.zoom&&!isPopulation?config.views[state.state]:config.mapViewBox);
  svg.dataset.miKind=isPopulation?state.sourceView:metric!;
  const title=isPopulation?`${state.sourceView==='density'?'人口密度':'人口'}・2020年`:`${metricName(metric!)}の輸出額・2025年速報`;
  const heading=one(`[data-mi-map-heading="${slot}"]`)!;
  const sub=document.createElement('span');sub.textContent=isPopulation?(state.sourceView==='density'?'州平均・人/km²':'円の面積が人口に比例・人'):'FOB・10億米ドル';
  heading.replaceChildren(document.createTextNode(title),sub);
  text(`#mi-${slot}-title`,title);
  text(`#mi-${slot}-desc`,isPopulation?(state.sourceView==='density'?'元の2020年人口密度分布。色は州平均の人/km²。':'元の2020年人口分布。円の面積は人口に比例。'):'色は州の生産地に配分されたFOB輸出額。両業種は共通階級。秘匿は斜線、未把握は点模様。');
  const top=isPopulation?[]:metric==='transport'?['05','11']:['08','14'];
  for(const shape of Array.from(svg.querySelectorAll<SVGPathElement>('[data-mi-shape]'))) {
   const code=shape.dataset.miShape!,selected=code===state.state;
   shape.toggleAttribute('hidden',state.only&&!selected);shape.classList.toggle('is-selected',selected);
   const fill=isPopulation?(state.sourceView==='density'?mexicoDensityColor(population.get(code)!.density,population.get(code)!.densityStatus):'#e0e7d8'):industryExportColor(valueFor(code,metric!).value,valueFor(code,metric!).status,`mi-${slot}`);
   shape.setAttribute('fill',fill);shape.setAttribute('tabindex',state.fallback?'-1':'0');shape.setAttribute('role',state.fallback?'img':'button');
   if(state.fallback)shape.removeAttribute('aria-pressed');else shape.setAttribute('aria-pressed',String(selected));
   const label=`${places.get(code)!.name} ${isPopulation?populationValue(code):industryValueText(valueFor(code,metric!))} ${isPopulation?'2020年':'2025年速報'}`;
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
  show(`[data-mi-export-legend="${slot}"]`,!isPopulation);
  if(slot==='secondary') {
   show('[data-mi-population-legend]',isPopulation);show('[data-mi-density-legend]',isPopulation&&state.sourceView==='density');
   show('[data-mi-population-size-legend]',isPopulation&&state.sourceView==='population');show('[data-mi-population-circles]',isPopulation&&state.sourceView==='population');
  }
  text(`[data-mi-map-caption="${slot}"]`,state.only?(isPopulation?'2020年。灰色は位置の参照。':'全世界向け。灰色は位置の参照。'):(isPopulation?(state.sourceView==='density'?'2020年。元の人口密度の階級。':'2020年。元の人口の面積比例円。'):`全世界向け・2025年速報。公開値 ${config.data.rows.filter(r=>['available','zero'].includes(r.values[metric!].status)).length}/32州。`));
 }

 function render():void {
  const selected=places.get(state.state)!,comparison=state.compare!==null,popComparison=state.compare==='population';
  root.classList.toggle('is-comparison',comparison);root.dataset.miRenderer=state.fallback?'static-fallback':'svg';root.dataset.miCompare=state.compare??'none';root.dataset.miSelected=state.state;
  one('[data-mi-map-grid]')!.classList.toggle('mi-comparison-grid',comparison);
  show('[data-mi-figure="secondary"]',comparison);
  one<HTMLElement>('[data-mi-figure="secondary"]')!.style.order=popComparison?'0':'1';one<HTMLElement>('[data-mi-figure="primary"]')!.style.order=popComparison?'1':'0';
  show('[data-mi-source-view-control]',popComparison);show('[data-mi-comparison-heading]',comparison);show('[data-mi-reading-comparison]',comparison);show('[data-mi-reading-normal]',!comparison);
  const explanation=popComparison?config.reading.populationComparison:config.reading.comparison;
  text('[data-mi-comparison-title]',explanation.title);text('[data-mi-comparison-lead]',explanation.lead);text('[data-mi-reading-comparison-title]',explanation.title);text('[data-mi-reading-comparison-text]',explanation.text);
  show('[data-mi-period-note]',popComparison);show('[data-mi-population-card]',popComparison);show('[data-mi-population-stats]',popComparison);
  const periodLabel=`${state.sourceView==='density'?'人口密度':'人口'}・2020年`;
  text('[data-mi-population-card-label]',periodLabel);text('[data-mi-population-card-value]',populationValue(state.state));text('[data-mi-population-stats-label]',`${periodLabel}・${state.sourceView==='density'?'人/km²':'人'}`);text('[data-mi-population-stats-value]',populationValue(state.state));
  text('[data-mi-selected-name]',selected.name);text('[data-mi-stats-state]',selected.name);
  for(const metric of ['transport','electronics'] as const) {
   const value=valueFor(state.state,metric);text(`[data-mi-value="${metric}"]`,industryValueText(value));text(`[data-mi-stats-value="${metric}"]`,industryValueText(value));text(`[data-mi-stats-status="${metric}"]`,value.sourceStatus);
   show(`[data-mi-value-card="${metric}"]`,!popComparison||metric===state.metric);
  }
  for(const row of all('[data-mi-data-row]'))row.classList.toggle('is-selected',row.getAttribute('data-mi-data-row')===state.state);
  const reading=config.reading[state.metric];text('[data-mi-topic-heading]',reading.heading);text('[data-mi-topic-text]',reading.text);
  one<HTMLSelectElement>('[data-mi-metric]')!.value=state.metric;one<HTMLSelectElement>('[data-mi-state-select]')!.value=state.state;one<HTMLSelectElement>('[data-mi-source-view]')!.value=state.sourceView;one<HTMLInputElement>('[data-mi-only]')!.checked=state.only;
  one<HTMLButtonElement>('[data-mi-zoom]')!.setAttribute('aria-pressed',String(state.zoom));text('[data-mi-zoom]',popComparison?(state.zoom?'輸出図を全国の広さに戻す':'輸出の州を拡大'):(state.zoom?'全国の広さに戻す':'読む州を拡大'));
  const current=new URL(window.location.href);
  one<HTMLAnchorElement>('[data-mi-electronics-link]')!.href=industryComparisonUrl(current,state,'electronics').href;one<HTMLAnchorElement>('[data-mi-population-link]')!.href=industryComparisonUrl(current,state,'population').href;
  text('[data-mi-population-link]',`${state.sourceView==='density'?'人口密度':'人口'}2020 × 輸出額2025：人と生産拠点の位置を比べる`);
  const back=one<HTMLAnchorElement>('[data-mi-return]')!;
  if(popComparison&&state.from==='population') {
   back.href=industryPopulationReturnUrl(config.populationHref,current,state).href;back.textContent=`${selected.name}の元の${state.sourceView==='density'?'人口密度':'人口'}地図へ戻る`;
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
 one<HTMLSelectElement>('[data-mi-metric]')!.addEventListener('change',event=>change({metric:(event.target as HTMLSelectElement).value as MexicoIndustryMetric}));
 one<HTMLSelectElement>('[data-mi-source-view]')!.addEventListener('change',event=>change({sourceView:(event.target as HTMLSelectElement).value as 'density'|'population'}));
 one<HTMLInputElement>('[data-mi-only]')!.addEventListener('change',event=>change({only:(event.target as HTMLInputElement).checked}));
 one<HTMLButtonElement>('[data-mi-zoom]')!.addEventListener('click',()=>change({zoom:!state.zoom}));
 one<HTMLButtonElement>('[data-mi-all]')!.addEventListener('click',()=>change({only:false,zoom:false}));
 window.addEventListener('popstate',()=>{state=readMexicoIndustryState(new URL(window.location.href),stateIds);render();});
 const observer=new ResizeObserver(resizeLabels);for(const svg of all<SVGSVGElement>('[data-mi-map]'))observer.observe(svg);
 root.dataset.miInitialized='true';render();
}
