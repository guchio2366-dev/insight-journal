import population from '../data/atlas/latin-america/population.json';
import {latinCountryName} from '../lib/atlas-latin-america-geometry';
import {readLatinLearningState,writeLatinLearningState,latinLearningUrl,latinSourceReturnUrl,latinComparisonState,type LatinLearningState,type LatinLearningSelection} from '../lib/atlas-latin-learning-state';
import {renderLatinPopulationMap,renderLatinPopulationLegend,latinPopulationValue,latinPopulationScopeIncludes,type LatinPopulationMapState} from '../lib/atlas-latin-america-population';
import {latinPopulationReadingFor} from '../data/atlas/latin-america/population-reading';
import {renderLatinNatureMap,renderLatinNatureLegend} from '../lib/atlas-latin-nature';
import {renderLatinIndustryMap,renderLatinIndustryLegend} from '../lib/atlas-latin-industry';
import {renderLatinAgricultureMap,renderLatinAgricultureLegend} from '../lib/atlas-latin-agriculture';

const allowed=['density','population','scale'];
interface PopulationRoutes {base:string;assets:string;spatialAssets:string}
export function initLatinPopulation(root:HTMLElement){
 if(root.dataset.latinPopulationReady==='1')return;
 const config=root.querySelector('[data-lp-config]');if(!config?.textContent)return;
 const routes=JSON.parse(config.textContent) as PopulationRoutes;
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 let state=readLatinLearningState(location.search,'population',allowed,'density');
 const name=(code:string)=>code==='all'?'中南米全体':latinCountryName(code);
 const metricName=(layer:string)=>layer==='population'?'人口規模2023':layer==='scale'?'人口規模・密度2023':'人口密度2023';
 const sourceName=(source:LatinLearningSelection)=>source.field==='population'?metricName(source.layer):source.field==='nature'?'気候1991–2020':source.field==='industry'?source.layer==='ores'?'鉱石・金属の輸出比率2024':source.layer==='canal'?'パナマ運河2024会計年度':'製造品の輸出比率2024':source.layer==='cattle'?'牛の飼育密度2020':'作物の収穫面積2020';
 function fallbackImage(svg:string,alt:string){
  const image=document.createElement('img');image.className='lp-fallback-map';image.width=900;image.height=580;image.alt=alt;image.dataset.lpFallbackImage='';
  const parsed=new DOMParser().parseFromString(svg,'text/html').querySelector('svg');
  if(!parsed)throw new Error('Population SVG was not parsed');
  parsed.setAttribute('width','900');parsed.setAttribute('height','580');
  image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(parsed))}`;return image;
 }
 function sourceRender(source:LatinLearningSelection){
  const selection={...source,place:state.place,scope:state.scope,only:state.only};
  if(source.field==='nature')return {map:renderLatinNatureMap(selection,'lp-source'),legend:renderLatinNatureLegend(source.layer)};
  if(source.field==='industry')return {map:renderLatinIndustryMap(selection,'lp-source'),legend:renderLatinIndustryLegend(source.layer)};
  if(source.field==='agriculture')return {map:renderLatinAgricultureMap(selection,'lp-source'),legend:renderLatinAgricultureLegend(source.layer)};
  return {map:renderLatinPopulationMap(selection,'lp-source'),legend:renderLatinPopulationLegend(source.layer)};
 }
 function render(){
  const selected=population.countries.find(row=>row.countryCode===state.place);
  const example=selected??population.countries.find(row=>row.countryCode===(state.scope==='central'?'GTM':'BRA'))!;
  const reading=latinPopulationReadingFor(state.place,state.scope);
  const external=!!state.source&&state.source.field!=='population';
  const scale=state.layer==='scale';
  root.classList.toggle('is-comparison',external||scale);
  root.dataset.lpLayer=state.layer;root.dataset.lpPlace=state.place;root.dataset.lpScope=state.scope;root.dataset.lpOnly=String(state.only);root.dataset.lpRenderer=state.fallback?'static-image':'svg';
  q<HTMLSelectElement>('[data-lp-layer-select]').value=state.layer;q<HTMLSelectElement>('[data-lp-place-select]').value=state.place;q<HTMLSelectElement>('[data-lp-scope-select]').value=state.scope;
  const only=q<HTMLInputElement>('[data-lp-only]');only.checked=state.only;only.disabled=state.place==='all';
  q<HTMLElement>('[data-lp-map-heading]').textContent=external?`${sourceName(state.source!)} × ${metricName(state.layer)}`:scale?'同じ2023年：人口規模 × 国平均密度':state.layer==='population'?'2023年、国・地域の人口規模を比べる':'2023年、国・地域の人口密度を比べる';
  const map=renderLatinPopulationMap(state as LatinPopulationMapState,'lp-primary');
  const primary=q<HTMLElement>('[data-lp-target-map]');
  if(state.fallback)primary.replaceChildren(fallbackImage(map,`${metricName(state.layer)}。${state.only?name(state.place)+'のデータだけ':'33国・地域の値とFLK対象統計なし'}。国・地域メニュー、凡例、下の表でも値を確認できます。`));else primary.innerHTML=map;
  q<HTMLElement>('[data-lp-target-legend]').innerHTML=renderLatinPopulationLegend(state.layer);
  q<HTMLElement>('[data-lp-source-figure]').hidden=!external;q<HTMLElement>('[data-lp-target-caption]').hidden=!external;
  q<HTMLElement>('[data-lp-map-pair]').classList.toggle('is-two-maps',external);
  if(external){
   const original=sourceRender(state.source!);
   // Source maps use raster/image resources too. Keep their real SVG resource
   // references; a data-URI SVG used as an image cannot load external rasters.
   q<HTMLElement>('[data-lp-source-map]').innerHTML=original.map.replace(/\srole="button"/g,'').replace(/tabindex="0"/g,'tabindex="-1"');
   q<HTMLElement>('[data-lp-source-legend]').innerHTML=original.legend;
   q<HTMLElement>('[data-lp-source-caption]').textContent=state.source!.field==='industry'&&state.source!.layer==='canal'?`元：${sourceName(state.source!)}`:`元：${name(state.place)}・${sourceName(state.source!)}`;
   q<HTMLElement>('[data-lp-target-caption]').textContent=`比較先：${name(state.place)}・${metricName(state.layer)}`;
  }
  q<HTMLElement>('[data-lp-value-name]').textContent=selected?`${example.nameJa}・${example.countryCode}`:`${state.scope==='central'?'中米の例':'人口最多の例'}：${example.nameJa}`;
  q<HTMLElement>('[data-lp-value-population]').textContent=latinPopulationValue(example.population,example.populationStatus);
  q<HTMLElement>('[data-lp-value-density]').textContent=latinPopulationValue(example.density,example.densityStatus,1);
  q<HTMLElement>('[data-lp-value-urban]').textContent=latinPopulationValue(example.urbanShare,example.urbanShareStatus,1);
  q<HTMLElement>('[data-lp-population-unit]').hidden=example.population===null;q<HTMLElement>('[data-lp-density-unit]').hidden=example.density===null;q<HTMLElement>('[data-lp-urban-unit]').hidden=example.urbanShare===null;
  q<HTMLElement>('[data-lp-reading-title]').textContent=reading.title;q<HTMLElement>('[data-lp-reading-text]').textContent=reading.text;q<HTMLElement>('[data-lp-reading-cause]').textContent=reading.cause;
  q<HTMLElement>('[data-lp-cause-brief]').textContent=state.place==='all'&&state.scope==='all'?'高地・沿岸・河川の条件に港・産業・交通が重なり、人の集積と住宅・水・通勤の需要を生みます。':reading.cause;
  q<HTMLElement>('[data-lp-reading-short]').textContent=selected?example.population===null?`${example.nameJa}の2023年指標は対象統計なし。数値のある国・地域と区別して表示します。`:`${example.nameJa}は人口${latinPopulationValue(example.population)}人、密度${latinPopulationValue(example.density,'value',1)}人/陸地km²。国人口の規模と密度を分けて読みます。`:state.scope==='central'?'中米・カリブを拡大。グアテマラやジャマイカを選び、国人口と密度を比べます。':'ブラジルは約2.11億人、密度25.3人/陸地km²。バルバドスは約28.2万人、密度656.6人/陸地km²。';
  q<HTMLElement>('[data-lp-comparison-reading]').hidden=!(external||scale);
  q<HTMLElement>('[data-lp-comparison-title]').textContent=external?`${sourceName(state.source!)} × ${metricName(state.layer)}`:scale?'人口が多い国と、密度が高い国はどう違う？':'';
  q<HTMLElement>('[data-lp-comparison-text]').textContent=external?(state.source?.field==='nature'?'1991–2020年の気候分類と、2023年の国・地域人口を同じ地理範囲で比べます。気候セルと国全体の人口は別の粒度。自然条件と人の集まりの位置関係を読みます。':state.source?.field==='industry'?(state.source.layer==='canal'?'パナマ運河の2024会計年度の通航と、2023年の国・地域人口を比べます。通航隻数と人口は別の単位。国をまたぐ物流と港・都市のつながりを読みます。':'2024年商品輸出に占める製造品・鉱石金属の割合と、2023年の人口を比べます。輸出構成は%、人口は人数または人/陸地km²。市場や交通のつながりを読みます。'):'2020年の生産分布と、2023年の国・地域人口を同じ範囲で比べます。生産地、暮らす場所、交通・市場との位置関係を読みます。'):'色と円は同じ2023年、同じ国・地域の値です。ブラジルの大人口と、中米・カリブの高い密度を、両方の凡例で読みます。';
  const returnState=state.source?state:{...state,source:{field:'population' as const,layer:'density',place:state.place,scope:state.scope,only:state.only,fallback:state.fallback}};
  const back=q<HTMLAnchorElement>('[data-lp-return]');back.href=latinSourceReturnUrl(routes.base,returnState);back.textContent=`${name(returnState.source!.place)}の${sourceName(returnState.source!)}に戻る`;
  q<HTMLElement>('[data-lp-map-comparison-brief]').hidden=!(external||scale);
  q<HTMLElement>('[data-lp-map-comparison-text]').textContent=external?(state.source?.field==='nature'?'気候の分類セルと国・地域の人口を、同じ地理範囲・各凡例で比べ、集まりの位置関係を読みます。':state.source?.field==='industry'?(state.source.layer==='canal'?'パナマ運河の通航条件と2023年人口を比べ、国をまたぐ物流と港・都市のつながりを読みます。':'2024年の輸出構成と2023年人口を、同じ国・地域で比べ、交通・市場と人口のつながりを読みます。'):'2020年の生産分布と2023年人口を、同じ範囲で比べ、生産地・暮らす場所・市場の位置関係を読みます。'):'同じ2023年の人数と国平均密度を重ねます。ブラジルの大人口と、中米・カリブの高密度を二つの凡例で読みます。';
  const mapBack=q<HTMLAnchorElement>('[data-lp-map-return]');mapBack.href=back.href;mapBack.textContent=back.textContent;
  q<HTMLAnchorElement>('[data-lp-scale-link]').href=latinLearningUrl(routes.base,latinComparisonState(state,'population','scale'));
  q<HTMLElement>('[data-lp-scale-link]').hidden=scale||external;
  q<HTMLAnchorElement>('[data-lp-nature-link]').href=latinLearningUrl(routes.base,latinComparisonState(state,'nature','climate'));
  q<HTMLAnchorElement>('[data-lp-industry-link]').href=latinLearningUrl(routes.base,latinComparisonState(state,'industry','manufactures'));
  q<HTMLElement>('[data-lp-nature-label]').textContent=`${metricName(state.layer)} × 気候1991–2020`;
  q<HTMLElement>('[data-lp-industry-label]').textContent=`${metricName(state.layer)} × 製造品輸出比率2024`;
  for(const row of root.querySelectorAll<HTMLElement>('[data-lp-row]'))row.classList.toggle('lp-row-selected',row.dataset.lpRow===state.place);
  const status=`2023年・${state.scope==='central'?'中米・カリブ':state.scope==='south'?'南米':state.scope==='country'?name(state.place):'中南米全体'}。${state.only?'対象のデータだけ（背景国境は位置の参考）':'33対象に値、FLKは対象統計なし'}。${state.fallback?'画像による代替表示。':''}`;
  q<HTMLElement>('[data-lp-status]').textContent=status;
 }
 function update(patch:Partial<LatinLearningState>){
  state={...state,...patch};
  if(state.place==='all'){state.only=false;if(state.scope==='country')state.scope='all';}
  if(state.source&&('place'in patch||'scope'in patch||'only'in patch))state.source={...state.source,place:state.place,scope:state.scope,only:state.only};
  history.pushState(null,'',`?${writeLatinLearningState(state)}`);render();
 }
 function choose(code:string){let scope=state.scope;if(!latinPopulationScopeIncludes(code,scope))scope='all';update({place:code,scope});}
 q<HTMLSelectElement>('[data-lp-layer-select]').addEventListener('change',event=>{
  const layer=(event.target as HTMLSelectElement).value;
  if(layer==='scale'&&state.layer!=='scale'&&!state.source)state=latinComparisonState(state,'population','scale');
  if(layer!=='scale'&&state.source?.field==='population')state={...state,source:undefined};
  update({layer});
 });
 q<HTMLSelectElement>('[data-lp-place-select]').addEventListener('change',event=>choose((event.target as HTMLSelectElement).value));
 q<HTMLSelectElement>('[data-lp-scope-select]').addEventListener('change',event=>{
  const scope=(event.target as HTMLSelectElement).value as LatinLearningState['scope'];
  const place=scope==='country'?(state.place==='all'?'BRA':state.place):latinPopulationScopeIncludes(state.place,scope)?state.place:'all';update({scope,place});
 });
 q<HTMLInputElement>('[data-lp-only]').addEventListener('change',event=>update({only:(event.target as HTMLInputElement).checked}));
 q<HTMLButtonElement>('[data-lp-all]').addEventListener('click',()=>update({place:'all',scope:'all',only:false}));
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-lp-quick]'))button.addEventListener('click',()=>choose(button.dataset.lpQuick!));
 const primary=q<HTMLElement>('[data-lp-target-map]');
 primary.addEventListener('click',event=>{if(state.fallback)return;const target=(event.target as Element).closest<SVGElement>('[data-lp-country],[data-lp-symbol]');if(target)choose(target.dataset.lpCountry??target.dataset.lpSymbol!);});
 primary.addEventListener('keydown',event=>{if(state.fallback||!['Enter',' '].includes(event.key))return;const target=(event.target as Element).closest<SVGElement>('[data-lp-country],[data-lp-symbol]');if(!target)return;event.preventDefault();const code=target.dataset.lpCountry??target.dataset.lpSymbol!;choose(code);root.querySelector<SVGGraphicsElement>(`[data-lp-${state.layer==='density'?'country':'symbol'}="${code}"]`)?.focus();});
 q<HTMLAnchorElement>('[data-lp-scale-link]').addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();state=latinComparisonState(state,'population','scale');update({});});
 for(const back of root.querySelectorAll<HTMLAnchorElement>('[data-lp-return],[data-lp-map-return]'))back.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||state.source?.field!=='population')return;event.preventDefault();const source=state.source;state={...source,field:'population',fallback:source.fallback??state.fallback,source:undefined};update({});});
 window.addEventListener('popstate',()=>{state=readLatinLearningState(location.search,'population',allowed,'density');render();});
 render();history.replaceState(null,'',`?${writeLatinLearningState(state)}`);
 for(const control of root.querySelectorAll<HTMLSelectElement|HTMLButtonElement>('[data-lp-layer-select],[data-lp-scope-select],[data-lp-place-select],[data-lp-all],[data-lp-quick]'))control.disabled=false;
 q<HTMLDetailsElement>('[data-lp-country-table]').open=false;
 root.dataset.latinPopulationReady='1';
}
