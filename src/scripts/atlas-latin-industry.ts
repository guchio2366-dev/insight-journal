import {latinIndustryLocationById,latinIndustryLocationOverview,latinIndustryLocations} from '../data/atlas/latin-america-industry-locations.ts';
import {latinCountries} from '../lib/atlas-latin-america-geometry';
import {readLatinLearningState,writeLatinLearningState,latinLearningUrl,latinSourceReturnUrl,latinComparisonState,type LatinLearningState,type LatinLearningSelection} from '../lib/atlas-latin-learning-state';
import {latinIndustryData,latinIndustryLayers,latinIndustryReadings,renderLatinIndustryMap,renderLatinIndustryLegend,industryCountryRow,industryCountryName,industryReadingForPlace,formatLatinIndustryValue} from '../lib/atlas-latin-industry';
import {renderLatinPopulationMap,renderLatinPopulationLegend,latinPopulationRows,latinPopulationValue} from '../lib/atlas-latin-america-population';
import {renderLatinNatureMap,renderLatinNatureLegend} from '../lib/atlas-latin-nature';
import {renderLatinAgricultureMap,renderLatinAgricultureLegend,agricultureLayerTitle} from '../lib/atlas-latin-agriculture';

export function initLatinIndustry(root:HTMLElement){
 const base=root.dataset.basePath??'/atlas/latin-america/';
 const shared=root.closest<HTMLElement>('[data-latin-workspace]');
 const allowed=latinIndustryLayers.map(l=>l.id);
 let state=readLatinLearningState(window.location.search,'industry',allowed,'locations');
 let generation=0;
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const text=(selector:string,value:string)=>{const node=q<HTMLElement>(selector);if(node)node.textContent=value;};
 const shown=(selector:string,value:boolean)=>{const node=q<HTMLElement>(selector);if(node)node.hidden=!value;};
 const layerName=(id:string)=>latinIndustryLayers.find(l=>l.id===id)?.name??id;
 const valueText=(place:string)=>{
  const row=industryCountryRow(place);
  if(!row)return '中南米全体 · 商品輸出額に占める2024年の割合。国を選ぶと二つの比率を確かめられます。';
  return `${industryCountryName(place)} · 2024年：鉱石・金属 ${formatLatinIndustryValue(row.values.ores.value,row.values.ores.status)} ／ 製造品 ${formatLatinIndustryValue(row.values.manufactures.value,row.values.manufactures.status)}`;
 };
 const populationTitle=(layer:string)=>layer==='spatial'?'国内の居住人口分布':layer==='population'?'人口の規模':layer==='scale'?'人口密度と人口規模':'人口密度';
 const populationPeriod=(layer:string)=>layer==='spatial'?'2020年 · GHSL居住人口推計 · 10km等積格子集計 · 人/km²':layer==='population'?'2023年 · 国・地域単位 · 人（円の面積）':layer==='scale'?'2023年 · 国・地域単位 · 人/km²（色）・人（円の面積）':'2023年 · 国・地域単位 · 人/km²';
 function save(push=true){
  const url=new URL(window.location.href);url.search=writeLatinLearningState(state);
  if(push)window.history.pushState(null,'',url);else window.history.replaceState(null,'',url);
 }
 function update(next:Partial<LatinLearningState>,push=true){
  state={...state,...next};
  if('layer' in next&&next.layer!=='locations'||'place' in next||'scope' in next)state.case=undefined;
  if(state.source&&state.source.field!=='nature'&&state.layer==='canal')state.layer='manufactures';
  if(state.place==='all'){state.only=false;if(state.scope==='country')state.scope='all';}
  if(state.source&&('place' in next||'scope' in next||'only' in next))state.source={...state.source,place:state.place,scope:state.scope,only:state.only};
  save(push);void render();
 }
 function renderSource(source:LatinLearningSelection,prefix:string){
  if(source.field==='population')return {map:renderLatinPopulationMap(source,prefix),legend:renderLatinPopulationLegend(source.layer),title:populationTitle(source.layer),period:populationPeriod(source.layer)};
  if(source.field==='nature')return {map:renderLatinNatureMap(source,prefix),legend:renderLatinNatureLegend(source.layer),title:'気候区分',period:'1991–2020年 · 0.1度 · 5気候群'};
  if(source.field==='agriculture')return {map:renderLatinAgricultureMap(source,prefix),legend:renderLatinAgricultureLegend(source.layer),title:agricultureLayerTitle(source.layer),period:'2020年 · 面積・密度の元分布（単位は元凡例に表示）'};
  return {map:renderLatinIndustryMap(source,prefix),legend:renderLatinIndustryLegend(source.layer),title:layerName(source.layer),period:source.layer==='locations'?'資料ごとの公表年 · 代表位置（数量記号ではありません）':source.layer==='canal'?'2024会計年度 · パナマ運河・大型外航船の通航':'2024年 · 国単位 · 商品輸出額に占める割合（%）'};
 }
 const imageCache=new Map<string,Promise<string>>();
 async function embeddedImage(href:string){
  if(href.startsWith('data:'))return href;
  const url=new URL(href,window.location.href);
  if(!imageCache.has(url.href))imageCache.set(url.href,(async()=>{const response=await fetch(url);if(!response.ok)throw new Error(`Map asset HTTP ${response.status}`);const blob=await response.blob();return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});})());
  return await imageCache.get(url.href)!;
 }
 async function fallbackImage(container:HTMLElement,token:number){
  const svg=container.querySelector<SVGSVGElement>('svg');if(!svg)return;
  const copy=svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  for(const external of Array.from(copy.querySelectorAll<SVGImageElement>('image'))){const href=external.getAttribute('href')??external.getAttribute('xlink:href');if(href)external.setAttribute('href',await embeddedImage(href));}
  if(token!==generation)return;
  const img=document.createElement('img');img.className='latin-industry-fallback-image';img.alt=svg.querySelector('title')?.textContent??'選択した分布の画像表示';img.dataset.industryFallbackImage='';
  img.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  container.replaceChildren(img);
 }
 async function render(){
  const token=++generation;
  const source=state.source,location=state.layer==='locations'?latinIndustryLocationById(state.case):undefined;
  shared?.classList.toggle('is-comparison',!!source);
  root.dataset.industryMode=source?'comparison':'normal';root.dataset.layer=state.layer;root.dataset.place=state.place;root.dataset.scope=state.scope;
  q<HTMLSelectElement>('[data-industry-layer]').value=state.layer;q<HTMLSelectElement>('[data-industry-place]').value=state.place;q<HTMLSelectElement>('[data-industry-scope]').value=state.scope;
  const canalOption=q<HTMLSelectElement>('[data-industry-layer]').querySelector<HTMLOptionElement>('option[value=canal]');if(canalOption)canalOption.disabled=!!source&&source.field!=='nature';
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-industry-layer-option]')){button.setAttribute('aria-pressed',String(button.dataset.industryLayerOption===state.layer));button.disabled=button.dataset.industryLayerOption==='canal'&&!!source&&source.field!=='nature';}
  text('[data-industry-layer-status]',state.layer==='locations'?'全産業の代表位置。点または産業名を選ぶと、立地・数量・出典を読めます。':state.layer==='canal'?'パナマ運河・2024会計年度。淡水・物流の仕組み図です。':'2024年・国別の輸出構成。代表地域を地図の下から選べます。');
  q<HTMLButtonElement>('[data-industry-only]').setAttribute('aria-pressed',String(state.only));q<HTMLButtonElement>('[data-industry-only]').disabled=state.place==='all';
  q<HTMLButtonElement>('[data-industry-fallback]').setAttribute('aria-pressed',String(state.fallback));
  shown('[data-industry-normal]',!source);shown('[data-industry-comparison]',!!source);shown('[data-industry-return]',!!source);
  shown('[data-industry-source-attribution]',false);
  const reading=industryReadingForPlace(state.place,state.layer);
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-industry-topic]'))button.setAttribute('aria-pressed',String(state.place!=='all'&&button.dataset.industryTopic===reading.id));
   text('[data-industry-reading-title]',state.place==='all'&&state.layer!=='canal'?'中南米全体の輸出構成':reading.title);text('[data-industry-takeaway]',state.place==='all'&&state.layer!=='canal'?'鉱石・金属と製造品の輸出比率を国ごとに見渡します。各国の商品輸出額を分母とした割合で、生産量・GDPやサービス輸出の規模とは区別します。代表例を選ぶと資源・技能・交通・市場のつながりを読めます。':reading.takeaway);text('[data-industry-selected]',state.layer==='canal'?'パナマ運河 · 2024会計年度 · 大型外航船9,944通航（前年比21%減）':valueText(state.place));
   const brief=q<HTMLElement>('[data-industry-brief]');if(brief)brief.textContent=state.layer==='canal'?'流域の雨と貯水が閘門の通航を支え、干ばつ時は通航を調整する。':'鉱石・金属と製造品の輸出比率を分け、資源・技能・交通・市場を読む。';
  const imageContainers:HTMLElement[]=[];
  shown('[data-industry-location-choices]',state.layer==='locations');shown('[data-industry-country-topics]',state.layer!=='locations');
  for(const button of root.querySelectorAll('[data-industry-location-choice]'))button.setAttribute('aria-pressed',String(button.getAttribute('data-industry-location-choice')===location?.id));
  shown('[data-industry-takeaway]',state.layer!=='locations'||!!location);shown('[data-industry-location-reading]',state.layer==='locations');shown('[data-industry-location-return]',state.layer==='locations'&&!!location);
  if(state.layer==='locations'){const overview=latinIndustryLocationOverview;
   text('[data-industry-reading-title]',location?.title??overview.title);text('[data-industry-takeaway]',location?.summary??overview.distribution);text('[data-industry-brief]',location?.summary??overview.distribution);text('[data-industry-selected]',location?.placeLabel??overview.scope);
   const body=q<HTMLElement>('[data-industry-location-reading]');body.replaceChildren();
   const append=(tag:string,value:string)=>{const node=document.createElement(tag);node.textContent=value;body.append(node);};
   if(location){for(const section of location.sections){append('h3',section.title);append('p',section.body);}for(const stat of location.stats??[])append('p',`${stat.label}：${stat.value.toLocaleString('ja-JP')} ${stat.unit}（${stat.year}） · ${stat.scope}`);for(const source of location.sources){const p=document.createElement('p'),a=document.createElement('a');a.href=source.url;a.textContent=source.label+' · '+source.period;p.append(a);body.append(p);}}
   else{append('h3','なぜ、その場所にあるか');append('p',overview.reason);}
  }
  if(!source){
   text('[data-industry-title]',layerName(state.layer));text('[data-industry-period]',state.layer==='locations'?'資料ごとの公表年 · 代表位置（点は数量を表しません）':state.layer==='canal'?'2024会計年度（2023年10月–2024年9月） · パナマ運河の大型外航船通航':'2024年 · 国単位 · 商品輸出額に占める割合（%）');
   const map=q<HTMLElement>('[data-industry-primary-map]');const bounds=map.getBoundingClientRect();map.innerHTML=renderLatinIndustryMap(state,'latin-industry-primary',{width:bounds.width||640,height:460});imageContainers.push(map);
   q('[data-industry-primary-legend]').innerHTML=renderLatinIndustryLegend(state.layer);
   map.closest<HTMLElement>('.latin-industry-panel')!.dataset.layer=state.layer;
   text('[data-industry-map-note]',state.layer==='locations'?latinIndustryLocationOverview.scope:state.layer==='canal'?'淡水を使う仕組みと活動の説明図です。運河サービスは商品の輸出構成比には含まれません。':'2024年固定 · 24国に値、9国・地域は原典欠測、1地域は対象統計なし。');
   const opposite=state.layer==='ores'?'manufactures':'ores';
    const exportsLink=q<HTMLAnchorElement>('[data-industry-compare-exports]');exportsLink.href=latinLearningUrl(base,latinComparisonState(state,'industry',opposite));exportsLink.hidden=state.layer==='canal';exportsLink.textContent=state.layer==='locations'?'産業の位置と国別の輸出構成を比べる →':'鉱石・金属と製造品の輸出構成を比べる →';
    const populationLink=q<HTMLAnchorElement>('[data-industry-compare-population]');populationLink.hidden=state.layer==='canal';populationLink.href=latinLearningUrl(base,latinComparisonState(state,'population','density'));populationLink.textContent=`${industryCountryName(state.place)}：${state.layer==='locations'?'産業の位置':'輸出構成'}と人口密度を比べる →`;
    q<HTMLAnchorElement>('[data-industry-compare-water]').textContent='パナマの気候・淡水と物流を比べる →';
   q<HTMLAnchorElement>('[data-industry-compare-water]').href=latinLearningUrl(base,{field:'industry',layer:'canal',place:'PAN',scope:'central',only:false,fallback:state.fallback,source:{field:'nature',layer:'climate',place:'PAN',scope:'central',only:false,fallback:state.fallback}});
  }else{
   const original=renderSource(source,'latin-industry-original');
   text('[data-industry-source-title]',`元の分布：${original.title}`);text('[data-industry-source-period]',original.period);
   const sourceMap=q<HTMLElement>('[data-industry-source-map]');sourceMap.innerHTML=original.map;imageContainers.push(sourceMap);q('[data-industry-source-legend]').innerHTML=original.legend;
   const sourceAttribution=q<HTMLElement>('[data-industry-source-legend] .latin-nature-period');
   if(sourceAttribution){text('[data-industry-source-attribution]',sourceAttribution.textContent??'');shown('[data-industry-source-attribution]',true);sourceAttribution.remove();}
   text('[data-industry-target-title]',layerName(state.layer));text('[data-industry-target-period]',state.layer==='locations'?'資料ごとの公表年 · 代表位置（数量記号ではありません）':state.layer==='canal'?'2024会計年度 · 大型外航船の通航（回）':'2024年 · 国単位 · 商品輸出額に占める割合（%）');
   const targetMap=q<HTMLElement>('[data-industry-target-map]');targetMap.innerHTML=renderLatinIndustryMap(state,'latin-industry-target');imageContainers.push(targetMap);q('[data-industry-target-legend]').innerHTML=renderLatinIndustryLegend(state.layer);targetMap.closest<HTMLElement>('.latin-industry-panel')!.dataset.layer=state.layer;
   text('[data-industry-comparison-title]',`${industryCountryName(state.place)}：${original.title}と${layerName(state.layer)}を比べる`);
   let explanation=reading.comparison,values=valueText(state.place);
   if(source.field==='population'){
    explanation=`${populationTitle(source.layer)}（2023年）と${layerName(state.layer)}（2024年）を並べ、人口・市場と輸出産業の関係を読みます。単位・分母が異なり、人口から生産や産業全体の規模は求めていません。`;
   const row=latinPopulationRows.find(r=>r.countryCode===source.place);if(row)values=`${industryCountryName(source.place)} · 元人口2023年：${source.layer==='density'?`${latinPopulationValue(row.density,row.densityStatus,1)}人/km²`:`${latinPopulationValue(row.population,row.populationStatus)}人`} ／ ${valueText(state.place)}`;
    if(source.layer==='spatial'){explanation=`国内の居住人口分布（GHSL2020年）と${layerName(state.layer)}（2024年）を並べます。人口は10km等積格子の密度推計、輸出比率は国全体の商品輸出額に占める割合です。年・粒度・分母が異なり、人口から産業の量は求めません。`;values=`GHSL2020：国内の居住人口分布（人/km²） ／ ${valueText(state.place)}`;}
   }else if(source.field==='nature'){
    if(state.layer==='canal'){explanation='パナマの気候（1991–2020年）と雨→貯水→閘門→通航を並べ、物流を支える淡水を読みます。2024会計年度の通航を示す説明図で、気候区分から水収支は計算していません。';values='パナマ · 元気候1991–2020年 ／ 運河2024会計年度：大型外航船9,944通航、前年比21%減。通航回数から商品輸出額や運河収入を推計していません。';}
    else explanation=`元の気候分布（1991–2020年）と、${layerName(state.layer)}（2024年）を並べます。自然条件・資源と、加工・交通・市場を結び付けて産業の成立を考えます。気候区分から個々の鉱床や工場の位置、輸出額は推計していません。`;
   }else if(source.field==='agriculture'){
    explanation=`元の${original.title}（2020年）と、商品輸出額に占める${layerName(state.layer)}（2024年）を並べます。原料を生む土地と、加工・交通・市場の関係を読み、産地の面積と国全体の輸出構成を別の指標として確かめます。収穫面積から輸出額や生産量を推計していません。`;
   }else{
    explanation=`${industryCountryName(state.place)}の${original.title}と${layerName(state.layer)}を、2024年・商品輸出額を分母とする%・同じ凡例で比べます。${reading.comparison}`;
   }
   if(state.layer==='locations'||source.field==='industry'&&source.layer==='locations')explanation='資料に基づく産業の代表位置と、元の分布を同じ地理的な範囲で比べます。資源・加工・交通・市場の立地と、全国統計や人口・気候の年・単位・対象範囲は異なり、国の割合や色から地点の生産量を求めていません。';
   text('[data-industry-comparison-explanation]',explanation);text('[data-industry-comparison-values]',values);
   const returnUrl=latinSourceReturnUrl(base,state),returnText=`← ${industryCountryName(source.place)}の${original.title}へ戻る`;
   for(const selector of ['[data-industry-return]','[data-industry-comparison-return]']){const a=q<HTMLAnchorElement>(selector);a.href=returnUrl;a.textContent=returnText;}
  }
  root.dataset.latinReady='true';root.dataset.renderer=state.fallback?'image':'svg';
  if(state.fallback){root.dataset.latinReady='false';try{await Promise.all(imageContainers.map(c=>fallbackImage(c,token)));if(token===generation)root.dataset.latinReady='true';}catch(error){if(token===generation){root.dataset.latinReady='true';root.dataset.renderer='svg-recovery';root.dataset.fallbackError=String(error);}}}
 }
 q<HTMLSelectElement>('[data-industry-layer]').addEventListener('change',e=>update({layer:(e.currentTarget as HTMLSelectElement).value}));
 q<HTMLSelectElement>('[data-industry-place]').addEventListener('change',e=>update({place:(e.currentTarget as HTMLSelectElement).value}));
 q<HTMLSelectElement>('[data-industry-scope]').addEventListener('change',e=>update({scope:(e.currentTarget as HTMLSelectElement).value as LatinLearningState['scope']}));
 q('[data-industry-only]').addEventListener('click',()=>update({only:!state.only}));
 q('[data-industry-fallback]').addEventListener('click',()=>update({fallback:!state.fallback}));
 root.addEventListener('click',event=>{
  const target=event.target as Element;
  if(target.closest('[data-industry-location-return]')){update({case:undefined,place:'all',scope:'all',only:false});return;}
  const location=target.closest<HTMLElement|SVGElement>('[data-industry-location],[data-industry-location-choice]');if(location){const item=latinIndustryLocationById(location.getAttribute('data-industry-location')??location.getAttribute('data-industry-location-choice')??'');if(item){const id=item.id;if(state.case===id)return;update({case:id});root.querySelector<SVGElement>(`[data-industry-location="${id}"]`)?.focus({preventScroll:true});}return;}
  const layer=target.closest<HTMLButtonElement>('[data-industry-layer-option]');if(layer){if(!layer.disabled&&allowed.includes(layer.dataset.industryLayerOption!))update({layer:layer.dataset.industryLayerOption!});return;}
  const topic=target.closest<HTMLElement>('[data-industry-topic]');if(topic){const reading=latinIndustryReadings.find(r=>r.id===topic.dataset.industryTopic);if(reading)update({layer:reading.layer,place:reading.place,scope:reading.scope as LatinLearningState['scope'],only:false,source:undefined});return;}
  const country=target.closest<HTMLElement>('[data-industry-country],[data-lp-country],[data-lp-symbol],[data-nature-country],[data-latin-agriculture-country]');if(country){const place=country.dataset.industryCountry??country.dataset.lpCountry??country.dataset.lpSymbol??country.dataset.natureCountry??country.dataset.latinAgricultureCountry;if(place&&latinCountries.some(c=>c.code===place))update({place});}
 });
 root.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=event.target as Element;const location=target.closest('[data-industry-location]');if(location){event.preventDefault();location.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}if(target.matches('[data-industry-country],[data-lp-country],[data-lp-symbol],[data-nature-country],[data-latin-agriculture-country]')){event.preventDefault();(target as HTMLElement).dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 window.addEventListener('popstate',()=>{state=readLatinLearningState(window.location.search,'industry',allowed,'locations');if(state.source&&state.source.field!=='nature'&&state.layer==='canal')state.layer='manufactures';void render();});
 if(state.source&&state.source.field!=='nature'&&state.layer==='canal')state.layer='manufactures';
 save(false);void render();
}
