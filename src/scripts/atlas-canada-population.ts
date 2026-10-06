import {canadaLegacyFrame,canadaMapPath} from '../lib/atlas-canada-map-presentation';
import {renderCanadaPopulationOverview} from './atlas-canada-population-overview';
import {readCanadaPopulationState,writeCanadaPopulationState,formatCanadaPopulationValue,canadaPopulationDensityColor,canadaPopulationNatureUrl,canadaPopulationIndustryUrl,canadaPopulationFrame,populationStateKeys,populationStorageKey,type CanadaPopulationState} from '../lib/atlas-canada-population';
import {readCanadaDemographicsState,writeCanadaDemographicsState,canadaDemographicsStateKeys,canadaDemographicShare,canadaDemographicShareColor,canadaDemographicShareColors,canadaDemographicShareScale,type CanadaDemographicsState,type CanadaDemographicCell,type CanadaDemographicTopic} from '../lib/atlas-canada-demographics';

export function initCanadaPopulation(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-population-config]')!.textContent!),ids=config.cmas.map((r:any)=>r.id);
 const catalog=Object.fromEntries(['ethnicity','religion'].map(topic=>[topic,{ids:config.demographics[topic].groups.map((g:any)=>g.id),defaultId:config.demographics[topic].defaultGroup}])) as Parameters<typeof readCanadaDemographicsState>[1];
 const allKeys=[...populationStateKeys,...canadaDemographicsStateKeys],initialUrl=new URL(location.href);
 let initial=initialUrl;
 let state=readCanadaPopulationState(initial,ids),demographic=readCanadaDemographicsState(initial,catalog);
 if(!initial.searchParams.has('metric'))state.metric='density';
 const readCamera=()=>{const p=new URL(location.href).searchParams.get('mapFrame')?.split(',').map(Number);return p?.length===4&&p.every(Number.isFinite)&&p[2]>=30&&p[3]>=20&&p[2]<=1800&&p[3]<=1160?p:null;};
 let mapCamera=readCamera();
 const combinedUrl=(url:URL,population=state,demographics=demographic)=>writeCanadaDemographicsState(writeCanadaPopulationState(url,population),demographics);
 if(initial!==initialUrl)history.replaceState(null,'',combinedUrl(initialUrl));
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const distributionMax=Math.max(1,...config.cmas.flatMap((r:any)=>[r.population[2016].value??0,r.population[2021].value??0]));
 const demographicMax=Math.max(1,...Object.values(config.demographics).flatMap((d:any)=>d.cmas.flatMap((r:any)=>Object.values(r.values).map((v:any)=>v.value??0))));
 const metricValue=(record:any)=>state.metric==='density'?record.density2021:record.population[state.year];
 const countText=(cell:CanadaDemographicCell)=>cell.value===null?cell.symbol==='x'||cell.status==='x'?'秘匿（x）':'未公表':`${cell.value.toLocaleString('ja-JP')}人${cell.symbol?' ('+cell.symbol+')':''}`;
 const shareText=(cell:CanadaDemographicCell,denominator:CanadaDemographicCell)=>{const value=canadaDemographicShare(cell.value,denominator.value);return value===null?cell.value===null?countText(cell):'割合は算出不可':value===0?'0.00%（公表丸め値）':value<0.01?'0.01%未満':value.toFixed(2)+'%';};
 const longTnr=(r:any)=>r.quality?.tnrLongFormPercent??r.quality?.tnr?.longForm;
 const qualityText=(r:any)=>`${r.quality?.notes?.length?'不完全調査の保留地・集落を除外 / ':''}長形式TNR ${longTnr(r)??'未公表'}%`;
 function alignQuantityLegend(){const map=root.querySelector<SVGSVGElement>('[data-population-map]')!,legend=root.querySelector<SVGSVGElement>(demographic.topic==='distribution'?'[data-population-population-legend] svg':'[data-demographic-count-legend] svg');const matrix=map.getScreenCTM?.();if(legend&&matrix&&Number.isFinite(matrix.a)&&matrix.a>0){const frame=canadaPopulationFrame(state,config.geometry);legend.style.width=`${280*matrix.a*frame[2]/760}px`;}}
 function demographicOrigin(){
  const raw=new URL(location.href).searchParams.get('demographicsReturn');if(!raw)return null;
  const source=new URL('?'+raw,location.href),saved=readCanadaDemographicsState(source,catalog);if(saved.topic==='distribution')return null;
  const savedPopulation=readCanadaPopulationState(source,ids),data=config.demographics[saved.topic],group=data.groups.find((g:any)=>g.id===saved.group);
  return {saved,savedPopulation,data,group};
 }
 function showDistributionReturn(origin:ReturnType<typeof demographicOrigin>){
  const wrapper=$('[data-demographic-return-container]');wrapper.hidden=!origin;if(!origin)return;
  const {saved,savedPopulation,data,group}=origin,cma=config.cmas.find((r:any)=>r.id===savedPopulation.cma),target=combinedUrl(new URL(location.pathname,location.href),savedPopulation,saved);
  $<HTMLAnchorElement>('[data-demographic-return]').href=target.href;$('[data-demographic-return]').textContent=`${cma.name}・${group.name}の比較へ戻る`;
  const close=combinedUrl(new URL(location.href));close.searchParams.delete('demographicsReturn');$<HTMLAnchorElement>('[data-demographic-context-clear]').href=close.href;
  const records=data.cmas.filter((r:any)=>[state.cma,state.compare].includes(r.id));$('[data-demographic-origin-comparison]').textContent=`元の集団・2021年 ${group.name}：${records.map((r:any)=>`${r.name} ${shareText(r.values[group.id],r.denominator)} / ${countText(r.values[group.id])}`).join(' / ')}。`;
 }
 function renderDemographics(data:any,selected:any,compare:any){
  const group=data.groups.find((g:any)=>g.id===demographic.group);
  $('[data-demographic-heading]').textContent=demographic.topic==='ethnicity'?'都市圏ごとの人口集団':'都市圏ごとの宗教・無宗教';
  $('[data-demographic-lead]').textContent=demographic.topic==='ethnicity'?'人口集団の割合は都市圏ごとに異なる。同じ集団を選んで、その違いを比べる。':'宗教・無宗教の割合は都市圏ごとに異なる。同じ分類を選んで、その違いを比べる。';
  const record=(r:any)=>`${r.name}：${shareText(r.values[group.id],r.denominator)} / ${countText(r.values[group.id])}`;
  $('[data-demographic-comparison]').textContent=`2021年 ${group.name} — ${[selected,compare].filter(Boolean).map(record).join(' / ')}`;
  const national=data.national;$('[data-demographic-national]').textContent=`全国：${shareText(national.values[group.id],national.denominator)} / ${countText(national.values[group.id])}。分母 ${national.denominator.value?.toLocaleString('ja-JP')??'未公表'}人（この表の私的世帯人口）。`;
  $('[data-demographic-definition]').textContent=demographic.topic==='ethnicity'?group.id==='87'?'先住民：質問24の回答。別変数のIndigenous identityとは範囲が異なります。':group.id==='15'?'複数回答の公式小計。単一回答の各集団には重複加算しません。':'人口集団の単一回答。民族的出自・国籍・出生国とは異なります。':'本人が申告した宗教的所属。実践していない人も含み、教団の会員数ではありません。';
  $('[data-demographic-explanation]').textContent=demographic.topic==='ethnicity'?'StatCanは、2021年の人口集団構成に都市圏・地域による違いがあること、racialized groupsの増加に移民とカナダ生まれの子どもが寄与したことを説明しています。ここでは単一回答などの人口集団を選ぶため、その分析の人数は転記していません。地図の色から国籍や出生地を推定しません。':'StatCanの2021年分析では、仏教・イスラム教・ヒンドゥー教・シク教の所属を申告した人は、各集団で移民が過半数でした。宗教の分布を読む際に移住も一つの背景として確かめます。これは全国の宗教集団内の分析で、個別都市圏の割合ではありません。地図から個人の信仰・行動や地域差の原因を決めません。無宗教には無神論・不可知論・人道主義などの回答が含まれます。';
  $('[data-demographic-classification]').textContent=demographic.topic==='ethnicity'?'サイトの表示14区分：単一回答12群、複数回答の公式小計、質問24由来の先住民。公式の人口集団メンバーを選択し、末端の回答を足して再構成していません。':'公式の9上位分類。キリスト教の下位教派を別に足しません。';
  $('[data-demographic-quality]').textContent=[selected,compare].filter(Boolean).map((r:any)=>`${r.name}：${qualityText(r)}`).join(' / ');
  const origin=combinedUrl(new URL(location.pathname,location.href)),target=writeCanadaPopulationState(new URL(location.pathname,location.href),{...state,year:2021,metric:'population'});target.searchParams.set('demographicsReturn',origin.searchParams.toString());
  const link=$<HTMLAnchorElement>('[data-demographic-population-link]');link.href=target.href;link.textContent=`${selected.name}の2021年人口と照合：集団割合と都市圏の規模を分ける`;
  const tbody=root.querySelector('[data-demographic-table] tbody')!;tbody.replaceChildren();
  for(const r of [...data.cmas,national]){const tr=document.createElement('tr');tr.dataset.demographicRow=r.id;tr.classList.toggle('is-selected-province',[state.cma,state.compare].includes(r.id));const cells=[r.name,countText(r.values[group.id]),r.denominator.value===null?'未公表':r.denominator.value.toLocaleString('ja-JP'),shareText(r.values[group.id],r.denominator),qualityText(r)];for(const [i,value] of cells.entries()){const cell=document.createElement(i?'td':'th');cell.textContent=value;tr.append(cell);}tbody.append(tr);}
  $('[data-demographic-table-caption]').textContent=`2021年 ${group.name} / ${data.source.tableId}。人数・分母は同じ表の原値。割合だけを原値から計算。丸め0と欠測・秘匿を区別します。`;
 }
 function render(){
  const isDistribution=demographic.topic==='distribution',data=isDistribution?null:config.demographics[demographic.topic],origin=isDistribution?demographicOrigin():null;
  if(origin&&(state.year!==2021||state.metric!=='population')){state={...state,year:2021,metric:'population'};history.replaceState(null,'',combinedUrl(new URL(location.href)));}
  root.classList.toggle('has-demographic-context',Boolean(origin));
  for(const element of root.querySelectorAll<HTMLElement>('[data-population-change],[data-population-comparison-links],.population-summary,.population-background,.population-more'))element.hidden=Boolean(origin);
  const lead=$('[data-population-distribution-lead]'),heading=$('[data-population-distribution-heading]');lead.dataset.originalText??=lead.textContent!;heading.dataset.originalText??=heading.textContent!;
  lead.textContent=origin?'同じ都市圏で、集団の構成（色）と全人口の規模（円）を照合する。':lead.dataset.originalText;heading.textContent=origin?'集団の構成と、都市圏の規模':heading.dataset.originalText;
  for(const button of root.querySelectorAll<HTMLElement>('[data-population-topic]'))button.setAttribute('aria-pressed',String(button.dataset.populationTopic===demographic.topic));
  for(const element of root.querySelectorAll<HTMLElement>('[data-population-distribution-control]'))element.hidden=!isDistribution;
  for(const element of root.querySelectorAll<HTMLElement>('[data-demographic-control]'))element.hidden=isDistribution;
  $('[data-population-distribution-reading]').hidden=!isDistribution;$('[data-demographic-reading]').hidden=isDistribution;
  $('[data-population-distribution-table]').hidden=!isDistribution;$('[data-demographic-tables]').hidden=isDistribution;
  const selected=(data??config).cmas.find((r:any)=>r.id===state.cma),compare=(data??config).cmas.find((r:any)=>r.id===state.compare),colorData=data??origin?.data,group=data?.groups.find((g:any)=>g.id===demographic.group)??origin?.group,frame=mapCamera??(state.zoom==='south'?[0,0,900,580]:canadaLegacyFrame(canadaPopulationFrame(state,config.geometry))),scale=frame[2]/900;
  const density=isDistribution&&state.metric==='density',share=Boolean(origin)||!isDistribution&&demographic.measure==='share',max=isDistribution?density?Math.max(1,...config.cmas.map((r:any)=>r.density2021.value??0)):distributionMax:demographicMax;
  const shareScale=colorData?canadaDemographicShareScale(colorData.cmas.map((r:any)=>canadaDemographicShare(r.values[group.id].value,r.denominator.value)).filter((v:any)=>v!==null)):null;
  root.querySelector('[data-population-map]')!.setAttribute('viewBox',frame.join(' '));
  root.querySelector('#canada-population-title')!.textContent=origin?`カナダの41都市圏、2021年 ${group.name}の割合（色）と全人口（円）`:isDistribution?`カナダの41都市圏、${state.year}年${density?'人口密度':'人口'}`:`カナダの41都市圏、2021年 ${group.name}の${share?'割合':'人数'}`;
  root.querySelector('#canada-population-desc')!.textContent=origin?'色は選択集団の私的世帯人口に占める割合、円の面積は全住民の2021年人口です。分母が異なる2変数を同じ2021年CMA境界で照合します。':isDistribution?'円の面積は都市圏人口、色は密度。輪郭は2021年CMA境界で自治体境界ではありません。':`輪郭は2021年CMA境界。${share?'色は同じ都市圏の私的世帯人口に占める選択集団の割合。集団を変えると色の目盛も変わります。':'円の面積は選択集団の人数。集団間で共通尺度。'}CMA外の白い地域を0とはしません。`;
  for(const g of root.querySelectorAll<SVGElement>('[data-population-map-cma]')){
   const id=g.dataset.populationMapCma!,r=(data??config).cmas.find((r:any)=>r.id===id),v=isDistribution?metricValue(r):r.values[group.id],isSelected=[state.cma,state.compare].includes(id);g.style.display=state.only&&!isSelected?'none':'';g.setAttribute('aria-pressed',String(id===state.cma));g.classList.toggle('is-selected-cma',id===state.cma);g.classList.toggle('is-comparing-cma',id===state.compare);
   const colorRecord=origin?colorData.cmas.find((r:any)=>r.id===id):r,colorCell=origin?colorRecord.values[group.id]:v;
   const polygon=g.querySelector<SVGPathElement>('[data-population-boundary]')!;polygon.style.fill=density?canadaPopulationDensityColor(v.value):share?canadaDemographicShareColor(canadaDemographicShare(colorCell.value,colorRecord.denominator.value),shareScale!.breaks):v.value===null?'#b7b7af':'#c7d9bc';
   const circle=g.querySelector<SVGCircleElement>('[data-population-symbol]')!;circle.style.display=!density&&(!share||Boolean(origin))&&v.value!==null?'':'none';circle.setAttribute('r',String(v.value===null?0:Math.sqrt(v.value/max)*22*scale));
   const title=isDistribution?`${r.name}都市圏、${state.year}年 ${formatCanadaPopulationValue(v.value,state.metric)} ${density?'人/km²':'人'}${v.symbol?' '+v.symbol:''}${origin?` / ${group.name} ${shareText(colorCell,colorRecord.denominator)}、${countText(colorCell)}`:''}`:`${r.name}都市圏、2021年 ${group.name}：${countText(v)}、${shareText(v,r.denominator)}。分母 ${r.denominator.value??'未公表'}人`;
   g.querySelector('title')!.textContent=title;g.setAttribute('aria-label',title+'。この都市圏を選ぶ');
   const label=g.querySelector<SVGTextElement>('[data-population-label]')!;label.style.display=isSelected||['535','462','933'].includes(id)&&!state.only?'':'none';label.style.fontSize=`${18*scale}px`;
  }
  if(isDistribution){
   const cards=[selected,compare].filter(Boolean).map((r:any)=>{const v=metricValue(r);return `${r.name}: ${formatCanadaPopulationValue(v.value,state.metric)}${v.value===null?'':' '+(density?'人/km²':'人')}${v.symbol?' ('+v.symbol+')':''}`;});
   $('[data-population-comparison]').textContent=`${state.year}年 ${density?'都市圏全体の人口密度':'都市圏人口'} — ${cards.join(' / ')}`;
   const growth=(r:any)=>r.changePercent.value===null?'未公表':`${r.changePercent.value>0?'+':''}${r.changePercent.value.toFixed(1)}%${r.changePercent.symbol?' '+r.changePercent.symbol:''}`;
   $('[data-population-change]').textContent=`2016→2021年の変化: ${selected.name} ${growth(selected)}${compare?' / '+compare.name+' '+growth(compare):''}。2021年境界での比較。`;
   showDistributionReturn(origin);
  }else renderDemographics(data,selected,compare);
  $('[data-population-map-status]').textContent=`境界は2021年固定 / ${origin?`2021年 ${group.name}の割合（色）+全人口（円）`:isDistribution?density?'2021年密度を色で表示':state.year+'年人口を円の面積で表示':`2021年 ${group.name} ${share?'割合%（色）':'人数（円の面積）'}`} / ${state.only?'選択した都市圏だけ':'41都市圏'} / ${state.zoom==='country'?'カナダ全体':state.zoom==='selected'?'選択都市圏を拡大':'南部'}`;
  $('[data-population-population-legend]').hidden=!isDistribution||density;$('[data-population-density-legend]').hidden=!density;
  $('[data-demographic-share-legend]').hidden=!share;$('[data-demographic-count-legend]').hidden=isDistribution||share;
  $('[data-demographic-origin-legend]').hidden=!origin;if(origin)$('[data-demographic-origin-legend]').textContent=`元の集団：${group.name}の割合（色）${origin.saved.measure==='count'?'。元の人数指定は、照合では割合へ変換。':''}`;
  if(share){const list=$('[data-demographic-share-classes]'),threshold=shareScale!.breaks,fmt=(v:number)=>v.toLocaleString('ja-JP',{maximumFractionDigits:Math.max(2,shareScale!.decimals)});list.replaceChildren();for(let i=0;i<6;i++){const li=document.createElement('li'),swatch=document.createElement('i');swatch.style.background=canadaDemographicShareColors[i];swatch.setAttribute('aria-hidden','true');li.append(swatch,i===0?`${fmt(threshold[0])}未満`:i===5?`${fmt(threshold[4])}以上`:`${fmt(threshold[i-1])}–${fmt(threshold[i])}未満`);list.append(li);}}
  for(const circle of root.querySelectorAll<SVGCircleElement>('[data-demographic-legend-count]'))circle.setAttribute('r',String(Math.sqrt(Number(circle.dataset.demographicLegendCount)/demographicMax)*22));
  for(const row of root.querySelectorAll<HTMLElement>('[data-population-row]')){const r=config.cmas.find((r:any)=>r.id===row.dataset.populationRow),v=metricValue(r);row.classList.toggle('is-selected-province',[state.cma,state.compare].includes(r.id));const bar=row.querySelector<HTMLElement>('[data-population-bar]')!;bar.style.width=v.value===null?'0%':`${v.value/(density?max:distributionMax)*100}%`;bar.parentElement!.classList.toggle('is-missing',v.value===null);bar.parentElement!.setAttribute('aria-label',`${r.name}: ${formatCanadaPopulationValue(v.value,state.metric)} ${density?'人/km²':'人'}`);}
  for(const td of root.querySelectorAll<HTMLElement>('[data-population-cell]'))td.classList.toggle('is-current-metric',td.dataset.populationCell===(state.metric==='density'?'density':String(state.year)));
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-population-nature-link]'))a.href=canadaPopulationNatureUrl(new URL(location.href),new URL(a.dataset.populationNatureLink!,location.href),state).href;
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-population-industry-link]'))a.href=canadaPopulationIndustryUrl(new URL(location.href),new URL(a.dataset.populationIndustryLink!,location.href),state,config.geometry,config.industryProvinces).href;
  try{localStorage.setItem(populationStorageKey,combinedUrl(new URL(location.href)).searchParams.toString());}catch{}
  renderCanadaPopulationOverview(root,config,state,demographic,group=>{if(group)demographic={...demographic,group};const url=combinedUrl(new URL(location.href));if(group)url.searchParams.set('mapGroup','1');else url.searchParams.delete('mapGroup');commitUrl(url);});
  alignQuantityLegend();
 }
 function commitUrl(url:URL){history.pushState(null,'',url);state=readCanadaPopulationState(url,ids);if(!url.searchParams.has('metric'))state.metric='density';demographic=readCanadaDemographicsState(url,catalog);render();}
 function update(patch:Partial<CanadaPopulationState>){state={...state,...patch};if(state.metric==='density')state.year=2021;if(state.compare===state.cma)state.compare=null;const url=combinedUrl(new URL(location.href));if(patch.cma){root.dataset.populationReadingFocus='city';url.searchParams.delete('cd');}commitUrl(url);}
 for(const button of root.querySelectorAll<HTMLElement>('[data-population-topic]'))button.addEventListener('click',()=>{const topic=button.dataset.populationTopic as CanadaDemographicsState['topic'];if(topic===demographic.topic)return;demographic=topic==='distribution'?{topic,group:null,measure:'share'}:{topic,group:catalog[topic as CanadaDemographicTopic].defaultId,measure:'share'};const target=combinedUrl(new URL(location.href));target.searchParams.delete('demographicsReturn');target.searchParams.delete('mapGroup');commitUrl(target);});
 for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-demographic-population-link],[data-demographic-return],[data-demographic-context-clear]'))a.addEventListener('click',e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();commitUrl(new URL(a.href));}});
 for(const marker of root.querySelectorAll<SVGElement>('[data-population-map-cma]')){const choose=()=>update({cma:marker.dataset.populationMapCma});marker.addEventListener('click',choose);marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}
 for(const button of root.querySelectorAll<HTMLElement>('[data-population-locate]'))button.addEventListener('click',()=>update({cma:button.dataset.populationLocate,zoom:'south'}));
 $('[data-population-reset]').addEventListener('click',()=>{mapCamera=null;const u=new URL(location.href);u.searchParams.delete('mapFrame');history.replaceState(null,'',u);update({only:false,zoom:'south'});});
 const map=root.querySelector<SVGSVGElement>('[data-population-map]')!;
 const camera=(frame:number[],commit=true)=>{mapCamera=frame;map.setAttribute('viewBox',frame.join(' '));if(commit){const url=new URL(location.href);url.searchParams.set('mapFrame',frame.map(n=>Number(n.toFixed(3))).join(','));history.pushState(null,'',url);}};
 for(const button of root.querySelectorAll<HTMLElement>('[data-population-scale]'))button.addEventListener('click',()=>{const [x,y,w,h]=map.getAttribute('viewBox')!.split(' ').map(Number),factor=button.dataset.populationScale==='in'?.7:1/.7;if(w*factor<30||w*factor>1800)return;camera([x+w*(1-factor)/2,y+h*(1-factor)/2,w*factor,h*factor]);});
 let drag:{x:number;y:number;frame:number[];moved:boolean}|null=null,ignoreClick=false;
 map.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;drag={x:e.clientX,y:e.clientY,frame:map.getAttribute('viewBox')!.split(' ').map(Number),moved:false};});
 map.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)<5&&!drag.moved)return;drag.moved=true;map.setPointerCapture?.(e.pointerId);const box=map.getBoundingClientRect(),scale=Math.min(box.width/drag.frame[2],box.height/drag.frame[3]);camera([drag.frame[0]-dx/scale,drag.frame[1]-dy/scale,drag.frame[2],drag.frame[3]],false);});
 map.addEventListener('pointerup',()=>{if(drag?.moved&&mapCamera){ignoreClick=true;camera(mapCamera);}drag=null;});map.addEventListener('pointercancel',()=>{drag=null;});
 map.addEventListener('click',e=>{if(ignoreClick){e.stopPropagation();ignoreClick=false;}},true);
 map.addEventListener('keydown',e=>{if(e.target!==map)return;const direction:Record<string,number[]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=direction[e.key];if(d){e.preventDefault();const [x,y,w,h]=map.getAttribute('viewBox')!.split(' ').map(Number);camera([x+d[0]*w*.15,y+d[1]*h*.15,w,h]);}});
 window.addEventListener('popstate',()=>{mapCamera=readCamera();state=readCanadaPopulationState(new URL(location.href),ids);demographic=readCanadaDemographicsState(new URL(location.href),catalog);render();});
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(alignQuantityLegend);observer.observe(root.querySelector('[data-population-map]')!);}
 window.addEventListener('resize',alignQuantityLegend);
 render();
 if(typeof fetch==='function')fetch(config.regionsUrl).then(r=>{if(!r.ok)throw Error('Region geometry unavailable');return r.json();}).then(geo=>{
  if(!root.isConnected)return;
  const valid=new Set(config.demographics.ethnicity.regions.map((r:any)=>r.id));
  if(!Array.isArray(geo.features)||geo.features.length!==293||geo.features.some((f:any)=>!valid.has(f.id)))throw Error('Invalid region geometry');
  const group=root.querySelector('[data-population-regions]')!;
  for(const f of geo.features){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.dataset.populationRegion=f.id;path.setAttribute('d',canadaMapPath(f.geometry));path.setAttribute('fill-rule','evenodd');path.setAttribute('role','button');path.setAttribute('tabindex','0');const choose=()=>{root.dataset.populationReadingFocus='region';const url=new URL(location.href);url.searchParams.set('cd',f.id);commitUrl(url);};path.addEventListener('click',choose);path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});group.append(path);}
  root.dataset.regionsReady='true';render();
 }).catch(()=>{if(root.isConnected){root.dataset.regionsError='true';render();}});
}
