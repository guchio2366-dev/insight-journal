import data from '../data/atlas/latin-america/agriculture.json';
import {latinCountries34,latinCountryName} from '../lib/atlas-latin-america-geometry';
import {agricultureLayer,agricultureLayerTitle,latinAgricultureReading,renderLatinAgricultureMap,renderLatinAgricultureLegend,formatLatinAgricultureValue,faoFlagLabel,type LatinAgricultureLayer} from '../lib/atlas-latin-agriculture';
import {readLatinLearningState,writeLatinLearningState,latinComparisonState,latinLearningUrl,latinSourceReturnUrl,type LatinLearningState} from '../lib/atlas-latin-learning-state';
import {withBase} from '../lib/urls';
import {renderLatinNatureMap,renderLatinNatureLegend} from '../lib/atlas-latin-nature';

const escape=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const layers=data.layers.map(l=>l.id);
const base=withBase('/atlas/latin-america/');
const representatives:Record<string,{place:string;scope:'central'|'south'|'country'}>={bana:{place:'CRI',scope:'central'},coff:{place:'HND',scope:'central'},soyb:{place:'BRA',scope:'south'},cattle:{place:'URY',scope:'south'}};
export function initialiseLatinAgriculture():void {
 const workspace=document.querySelector<HTMLElement>('[data-latin-field="agriculture"]');
 if(!workspace||workspace.dataset.latinAgricultureReady==='true')return;
 const query=<T extends Element=HTMLElement>(name:string)=>workspace.querySelector<T>(`[data-latin-agriculture-${name}]`)!;
 const text=(name:string,value:string)=>{query(name).textContent=value;};
 let state=readLatinLearningState(window.location.search,'agriculture',layers,'bana');
 let hasChosenPlace=new URLSearchParams(window.location.search).has('place');
 if(!hasChosenPlace){state.place='CRI';if(!new URLSearchParams(window.location.search).has('scope'))state.scope='central';}
 const push=(replace=false)=>{
  const params=new URLSearchParams(window.location.search);
  for(const name of ['layer','place','scope','only','fallback','from','sourceLayer','sourcePlace','sourceScope','sourceOnly','sourceFallback','sourceCase','renderer'])params.delete(name);
  for(const [name,value] of new URLSearchParams(writeLatinLearningState(state)))params.set(name,value);
  const url=`${window.location.pathname}?${params}${window.location.hash}`;
  if(replace)window.history.replaceState({},'',url);else window.history.pushState({},'',url);
 };
 const render=()=>{
  const layer=agricultureLayer(state.layer),reading=latinAgricultureReading[layer.id as LatinAgricultureLayer];
  const selected=layer.countries.find(c=>c.code===state.place);
  const isComparison=state.source?.field==='nature';
  workspace.classList.toggle('is-comparison',isComparison);
  query('map-panes').classList.toggle('is-comparison',isComparison);
  query<HTMLElement>('source-pane').hidden=!isComparison;
  query<HTMLElement>('target-title').hidden=!isComparison;
  query<HTMLElement>('comparison-message').hidden=!state.source;
  if(isComparison&&state.source){
   const original={layer:state.source.layer,place:state.place,scope:state.scope,only:state.source.only,case:state.source.case};
   query('source-map').innerHTML=renderLatinNatureMap(original,'latin-agriculture-source-nature');
   query('source-legend').innerHTML=renderLatinNatureLegend(state.source.layer);
   text('source-title',`比較元：${latinCountryName(state.place)}の気候（1991–2020年）`);
   text('target-title',`${layer.label}の分布（2020年）`);
   text('comparison-explanation',`${reading.compare}。左は1991–2020年の気候群、右は2020年の${layer.id==='cattle'?'牛密度':'収穫面積'}推計。気候と技術・市場のつながりを読みます。`);
  }
  const unit=layer.id==='cattle'?'頭/km²':'ha';
  query<HTMLSelectElement>('place').value=state.place;
  query<HTMLSelectElement>('scope').value=state.scope;
  query<HTMLInputElement>('only').checked=state.only;
  query<HTMLInputElement>('only').disabled=state.place==='all';
  query<HTMLButtonElement>('fallback').setAttribute('aria-pressed',String(state.fallback));
  text('title',agricultureLayerTitle(layer.id));
  query('map-container').innerHTML=renderLatinAgricultureMap(state,'latin-agriculture-main');
  query('legend-container').innerHTML=renderLatinAgricultureLegend(layer.id);
  query<HTMLElement>('normal-container').hidden=state.fallback&&!isComparison;
  query<HTMLElement>('map-container').hidden=state.fallback;
  query<HTMLElement>('legend-container').hidden=state.fallback&&!isComparison;
  const fallbackContainer=query<HTMLElement>('fallback-container');
  if(isComparison)query('target-pane').append(fallbackContainer);else query('normal-container').after(fallbackContainer);
  query<HTMLElement>('fallback-container').hidden=!state.fallback;
  text('map-caption',layer.id==='cattle'?'約9kmの格子の牛の密度推計。頭数や牧場面積を示す色ではありません。':'約9kmの格子に推計された年間収穫面積。農地の境界を示す図ではありません。');
  text('reading-title',isComparison?`気候と${layer.label}の分布を比べる`:reading.title);text('takeaway',reading.takeaway);
  text('selected-name',latinCountryName(state.place));
  text('selected-spatial',selected?formatLatinAgricultureValue(selected.spatial.value,unit,selected.spatial.status):'国を選ぶと値を読めます');
  text('selected-unit',layer.id==='cattle'?'国の有効格子の面積加重平均密度・2020年':'国全体の年間収穫面積推計・2020年');
  query('steps').innerHTML=reading.steps.map(([title,body],index)=>`<details${index===0?' open':''}><summary>${escape(title)}</summary><p>${escape(body)}</p></details>`).join('');
  query('examples').innerHTML=reading.examples.map(e=>`<button type="button" data-latin-agriculture-example="${e.place}">${escape(e.label)}<span>${escape(e.text)}</span></button>`).join('');
  text('definition',layer.id==='cattle'?data.definitions.cattle:data.definitions.crop);
  query<HTMLElement>('coffee-definition').hidden=layer.id!=='coff';
  query('reading-sources').innerHTML=reading.sources.map(s=>`<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.label)}</a> — ${escape(s.period)}</li>`).join('');
  const compare=query<HTMLAnchorElement>('compare');compare.textContent=`${reading.compare} →`;compare.href=latinLearningUrl(base,latinComparisonState(state,'nature','climate'));
  const returnLink=query<HTMLAnchorElement>('return');returnLink.hidden=!state.source;
  if(state.source){returnLink.href=latinSourceReturnUrl(base,state);returnLink.textContent=`${latinCountryName(state.source.place)}の${state.source.field==='nature'?'自然環境':state.source.field==='industry'?'主要産業':state.source.field==='population'?'人口':'農畜産'}に戻る →`;}
  for(const button of workspace.querySelectorAll<HTMLButtonElement>('[data-latin-agriculture-layer]'))button.setAttribute('aria-pressed',String(button.dataset.latinAgricultureLayer===state.layer));
  const ranked=[...layer.countries].sort((a,b)=>(b.spatial.value??-1)-(a.spatial.value??-1));
  const sorted=selected?[selected,...ranked.filter(c=>c.code!==selected.code)]:ranked;
  query('fallback-rows').innerHTML=sorted.map(c=>`<tr ${c.code===state.place?'aria-selected="true"':''}><th><button type="button" data-latin-agriculture-country="${c.code}">${escape(latinCountryName(c.code))}</button></th><td>${escape(formatLatinAgricultureValue(c.spatial.value,unit,c.spatial.status))}</td></tr>`).join('');
  text('fallback-caption',`${layer.label}・国別${layer.id==='cattle'?'平均密度':'収穫面積合計'}（2020年・推計）`);
  text('fallback-unit',layer.id==='cattle'?'平均密度 頭/km²':'収穫面積 ha');
  const statRows=query('stat-rows'),statTable=statRows.closest('table')!;
  statTable.querySelector('thead')!.innerHTML=`<tr><th>国・地域</th><th>${layer.id==='cattle'?'平均密度 頭/km²':'収穫面積推計 ha'}（2020）</th><th>${layer.id==='cattle'?'飼養頭数 頭':layer.id==='coff'?'生豆・全品種 t':'生産量 t'}（2024）</th><th>FAO注記</th>${layer.id==='cattle'?'<th>牛肉生産 t（2024）</th><th>牛乳生産 t（2024）</th>':''}</tr>`;
  statRows.innerHTML=layer.countries.map(c=>`<tr><th>${escape(latinCountryName(c.code))}</th><td>${escape(formatLatinAgricultureValue(c.spatial.value,unit,c.spatial.status))}</td><td>${escape(formatLatinAgricultureValue(c.national2024.value,layer.id==='cattle'?'頭':'t',c.national2024.status))}</td><td>${escape(faoFlagLabel(c.national2024.flag))}</td>${layer.id==='cattle'&&'beef2024' in c&&'milk2024' in c?`<td>${escape(formatLatinAgricultureValue(c.beef2024?.value,'t',c.beef2024?.status))}（${escape(faoFlagLabel(c.beef2024?.flag??null))}）</td><td>${escape(formatLatinAgricultureValue(c.milk2024?.value,'t',c.milk2024?.status))}（${escape(faoFlagLabel(c.milk2024?.flag??null))}）</td>`:''}</tr>`).join('');
  text('stat-caption',`${layer.label}・34か国／地域`);
  text('stat-note',layer.id==='cattle'?'地図は2020年の牛密度推計。2024年の飼養頭数・牛肉・牛乳はFAOSTATの国別統計です。製品の生産量はtで示し、頭数と区別します。':layer.id==='coff'?data.definitions.coffee:'国別統計はFAOSTATの2024年生産量（t）。地図の2020年収穫面積（ha）とは年・単位が異なります。');
  workspace.dataset.latinAgricultureCurrentLayer=state.layer;workspace.dataset.latinAgricultureCurrentPlace=state.place;workspace.dataset.latinAgricultureRenderMode=state.fallback?'fallback':'normal';
 };
 workspace.addEventListener('change',event=>{
  const target=event.target as HTMLElement;
  if(target.matches('[data-latin-agriculture-place]')){state.place=(target as HTMLSelectElement).value;hasChosenPlace=true;state.scope=state.place==='all'?'all':'country';if(state.place==='all')state.only=false;}
  else if(target.matches('[data-latin-agriculture-scope]')){
   state.scope=(target as HTMLSelectElement).value as LatinLearningState['scope'];
   if(state.scope==='country'&&state.place==='all')state.place=representatives[state.layer].place;
   if(state.scope==='central'&&latinCountries34.find(c=>c.code===state.place)?.subregion==='South America')state.place='CRI';
   if(state.scope==='south'&&latinCountries34.find(c=>c.code===state.place)?.subregion!=='South America')state.place='BRA';
  }
  else if(target.matches('[data-latin-agriculture-only]'))state.only=(target as HTMLInputElement).checked;
  else return;
  render();push();
 });
 const choose=(target:Element)=>{
  const country=target.closest<HTMLElement>('[data-latin-agriculture-country],[data-latin-agriculture-example],[data-nature-country]');
  if(country){state.place=country.dataset.latinAgricultureCountry??country.dataset.latinAgricultureExample??country.dataset.natureCountry!;state.scope='country';hasChosenPlace=true;render();push();return;}
  const button=target.closest<HTMLElement>('[data-latin-agriculture-layer]');
  if(button){state.layer=button.dataset.latinAgricultureLayer!;if(!hasChosenPlace){state.place=representatives[state.layer].place;state.scope=representatives[state.layer].scope;}render();push();return;}
  if(target.closest('[data-latin-agriculture-fallback]')){state.fallback=!state.fallback;render();push();}
 };
 workspace.addEventListener('click',event=>{if(event.target instanceof Element)choose(event.target);});
 workspace.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&event.target instanceof SVGElement&&(event.target.hasAttribute('data-latin-agriculture-country')||event.target.hasAttribute('data-nature-country'))){event.preventDefault();choose(event.target);}
 });
 window.addEventListener('popstate',()=>{state=readLatinLearningState(window.location.search,'agriculture',layers,'bana');hasChosenPlace=true;render();});
 render();push(true);workspace.dataset.latinAgricultureReady='true';
}
initialiseLatinAgriculture();
document.addEventListener('astro:page-load',initialiseLatinAgriculture);
