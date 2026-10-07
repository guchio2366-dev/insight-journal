import data from '../data/atlas/latin-america/agriculture.json';
import {latinCountries34,latinCountryName} from '../lib/atlas-latin-america-geometry';
import {agricultureLayer,agricultureLayerTitle,latinAgricultureReading,renderLatinAgricultureMap,renderLatinAgricultureLegend,renderLatinAgricultureWorkspaceMap,renderLatinAgricultureOverviewLegend,latinAgricultureOverviewReading,formatLatinAgricultureValue,faoFlagLabel,type LatinAgricultureLayer} from '../lib/atlas-latin-agriculture';
import {readLatinLearningState,writeLatinLearningState,latinComparisonState,latinLearningUrl,latinSourceReturnUrl,type LatinLearningState} from '../lib/atlas-latin-learning-state';
import {withBase} from '../lib/urls';
import {renderLatinNatureMap,renderLatinNatureLegend,natureScopeForPlace} from '../lib/atlas-latin-nature';

const escape=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const layers=['all',...data.layers.map(l=>l.id)];
const base=withBase('/atlas/latin-america/');
export function initialiseLatinAgriculture():void {
 const workspace=document.querySelector<HTMLElement>('[data-latin-field="agriculture"]');
 if(!workspace||workspace.dataset.latinAgricultureReady==='true')return;
 const query=<T extends Element=HTMLElement>(name:string)=>workspace.querySelector<T>(`[data-latin-agriculture-${name}]`)!;
 const text=(name:string,value:string)=>{query(name).textContent=value;};
 let state=readLatinLearningState(window.location.search,'agriculture',layers,'all');
 const push=(replace=false)=>{
  const params=new URLSearchParams(window.location.search);
  for(const name of ['layer','place','scope','only','fallback','from','sourceLayer','sourcePlace','sourceScope','sourceOnly','sourceFallback','sourceCase','renderer'])params.delete(name);
  for(const [name,value] of new URLSearchParams(writeLatinLearningState(state)))params.set(name,value);
  const url=`${window.location.pathname}?${params}${window.location.hash}`;
  if(replace)window.history.replaceState({},'',url);else window.history.pushState({},'',url);
 };
 const render=()=>{
  const overview=state.layer==='all',layer=agricultureLayer(state.layer),reading=overview?latinAgricultureOverviewReading:latinAgricultureReading[layer.id as LatinAgricultureLayer];
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
   text('target-title',`${overview?'作物と家畜':layer.label}の分布（2020年）`);
   text('comparison-explanation',`${reading.compare}。左は1991–2020年の気候群、右は2020年の${overview?'作物・家畜の合成分布':layer.id==='cattle'?'牛密度':'収穫面積'}推計。気候と技術・市場のつながりを読みます。`);
  }
  const unit=layer.id==='cattle'?'頭/km²':'ha';
  query<HTMLSelectElement>('place').value=state.place;
  query<HTMLSelectElement>('scope').value=state.scope;
  query<HTMLInputElement>('only').checked=state.only;
  query<HTMLInputElement>('only').disabled=state.place==='all';
  query<HTMLButtonElement>('fallback').setAttribute('aria-pressed',String(state.fallback));
  text('title',agricultureLayerTitle(state.layer));
  query('map-container').innerHTML=isComparison?renderLatinAgricultureMap(state,'latin-agriculture-main'):renderLatinAgricultureWorkspaceMap(state,'latin-agriculture-main');
  query('legend-container').innerHTML=isComparison?renderLatinAgricultureLegend(state.layer):renderLatinAgricultureOverviewLegend(state.layer);
  query<HTMLElement>('normal-container').hidden=state.fallback&&!isComparison;
  query<HTMLElement>('map-container').hidden=state.fallback;
  query<HTMLElement>('legend-container').hidden=state.fallback&&!isComparison;
  const fallbackContainer=query<HTMLElement>('fallback-container');
  if(isComparison)query('target-pane').append(fallbackContainer);else query('normal-container').after(fallbackContainer);
  query<HTMLElement>('fallback-container').hidden=!state.fallback;
  text('map-caption',!isComparison?'12作物と3家畜の既存格子推計を合成。色は品目で、数量を比較する尺度ではありません。':layer.id==='cattle'?'約9kmの格子の牛の密度推計。頭数や牧場面積を示す色ではありません。':'約9kmの格子に推計された年間収穫面積。農地の境界を示す図ではありません。');
  text('reading-title',overview?reading.title:isComparison?`気候と${layer.label}の分布を比べる`:`${latinCountryName(state.place)}：${agricultureLayerTitle(state.layer)}`);text('takeaway',overview?reading.takeaway:`地域事例：${reading.title}。${reading.takeaway}`);
  text('selected-name',latinCountryName(state.place));
  text('selected-spatial',overview&&selected?data.layers.map(l=>`${l.label} ${formatLatinAgricultureValue(l.countries.find(c=>c.code===state.place)?.spatial.value,l.id==='cattle'?'頭/km²':'ha',l.countries.find(c=>c.code===state.place)?.spatial.status)}`).join(' ／ '):selected?formatLatinAgricultureValue(selected.spatial.value,unit,selected.spatial.status):'国を選ぶと値を読めます');
  text('selected-unit',overview?'国別の年間収穫面積・牛の平均密度推計（2020年）。品目間の数量を合計していません。':layer.id==='cattle'?'国の有効格子の面積加重平均密度・2020年':'国全体の年間収穫面積推計・2020年');
  query('steps').innerHTML=reading.steps.map(([title,body],index)=>`<details${index===0?' open':''}><summary>${escape(title)}</summary><p>${escape(body)}</p></details>`).join('');
  query('examples').innerHTML=reading.examples.map(e=>`<button type="button" data-latin-agriculture-example="${e.place}">${escape(e.label)}<span>${escape(e.text)}</span></button>`).join('');
  text('definition',layer.id==='cattle'?data.definitions.cattle:data.definitions.crop);
  query<HTMLElement>('coffee-definition').hidden=layer.id!=='coff';
  query('reading-sources').innerHTML=reading.sources.map(s=>`<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.label)}</a> — ${escape(s.period)}</li>`).join('');
  const compare=query<HTMLAnchorElement>('compare');compare.textContent=`${latinCountryName(state.place)}の気候と${agricultureLayerTitle(state.layer)}を比べる →`;compare.href=latinLearningUrl(base,latinComparisonState(state,'nature','climate'));
  const returnLink=query<HTMLAnchorElement>('return');returnLink.hidden=!state.source;
  if(state.source){returnLink.href=latinSourceReturnUrl(base,state);returnLink.textContent=`${latinCountryName(state.source.place)}の${state.source.field==='nature'?'自然環境':state.source.field==='industry'?'主要産業':state.source.field==='population'?'人口':'農畜産'}に戻る →`;}
  for(const button of workspace.querySelectorAll<HTMLButtonElement>('[data-latin-agriculture-layer]'))button.setAttribute('aria-pressed',String(button.dataset.latinAgricultureLayer===state.layer));
  const ranked=[...layer.countries].sort((a,b)=>(b.spatial.value??-1)-(a.spatial.value??-1));
  const sorted=selected?[selected,...ranked.filter(c=>c.code!==selected.code)]:ranked;
  query('fallback-rows').innerHTML=sorted.map(c=>`<tr ${c.code===state.place?'aria-selected="true"':''}><th><button type="button" data-latin-agriculture-country="${c.code}">${escape(latinCountryName(c.code))}</button></th><td>${overview?data.layers.map(l=>{const row=l.countries.find(r=>r.code===c.code)!;return `${escape(l.label)} ${escape(formatLatinAgricultureValue(row.spatial.value,l.id==='cattle'?'頭/km²':'ha',row.spatial.status))}`;}).join('<br>'):escape(formatLatinAgricultureValue(c.spatial.value,unit,c.spatial.status))}</td></tr>`).join('');
  text('fallback-caption',overview?'3作物・牛の国別推計（2020年・指標を別々に表示）':`${layer.label}・国別${layer.id==='cattle'?'平均密度':'収穫面積合計'}（2020年・推計）`);
  text('fallback-unit',overview?'各作物の収穫面積 ha／牛の平均密度 頭/km²':layer.id==='cattle'?'平均密度 頭/km²':'収穫面積 ha');
  const statRows=query('stat-rows'),statTable=statRows.closest('table')!;
  statTable.querySelector('thead')!.innerHTML=`<tr><th>国・地域</th><th>${layer.id==='cattle'?'平均密度 頭/km²':'収穫面積推計 ha'}（2020）</th><th>${layer.id==='cattle'?'飼養頭数 頭':layer.id==='coff'?'生豆・全品種 t':'生産量 t'}（2024）</th><th>FAO注記</th>${layer.id==='cattle'?'<th>牛肉生産 t（2024）</th><th>牛乳生産 t（2024）</th>':''}</tr>`;
  statRows.innerHTML=layer.countries.map(c=>`<tr><th>${escape(latinCountryName(c.code))}</th><td>${escape(formatLatinAgricultureValue(c.spatial.value,unit,c.spatial.status))}</td><td>${escape(formatLatinAgricultureValue(c.national2024.value,layer.id==='cattle'?'頭':'t',c.national2024.status))}</td><td>${escape(faoFlagLabel(c.national2024.flag))}</td>${layer.id==='cattle'&&'beef2024' in c&&'milk2024' in c?`<td>${escape(formatLatinAgricultureValue(c.beef2024?.value,'t',c.beef2024?.status))}（${escape(faoFlagLabel(c.beef2024?.flag??null))}）</td><td>${escape(formatLatinAgricultureValue(c.milk2024?.value,'t',c.milk2024?.status))}（${escape(faoFlagLabel(c.milk2024?.flag??null))}）</td>`:''}</tr>`).join('');
  if(overview){
   statTable.querySelector('thead')!.innerHTML=`<tr><th>国・地域</th>${data.layers.map(l=>`<th>${escape(l.label)} ${l.id==='cattle'?'飼養頭数 頭':l.id==='coff'?'生豆・全品種 t':'生産量 t'}（2024）・FAO注記</th>`).join('')}</tr>`;
   statRows.innerHTML=layer.countries.map(c=>`<tr><th>${escape(latinCountryName(c.code))}</th>${data.layers.map(l=>{const row=l.countries.find(r=>r.code===c.code)!;return `<td>${escape(formatLatinAgricultureValue(row.national2024.value,l.id==='cattle'?'頭':'t',row.national2024.status))}（${escape(faoFlagLabel(row.national2024.flag))}）</td>`;}).join('')}</tr>`).join('');
  }
  text('stat-caption',`${overview?'農畜産':layer.label}・34か国／地域`);
  text('stat-note',overview?'国別統計はFAOSTATの2024年生産量（t）・飼養頭数（頭）です。地図の2020年格子推計とは年・単位が異なります。コーヒーは生豆・全品種。その他の品目は基礎地図・既存の詳しい資料から確認できます。':layer.id==='cattle'?'地図は2020年の牛密度推計。2024年の飼養頭数・牛肉・牛乳はFAOSTATの国別統計です。製品の生産量はtで示し、頭数と区別します。':layer.id==='coff'?data.definitions.coffee:'国別統計はFAOSTATの2024年生産量（t）。地図の2020年収穫面積（ha）とは年・単位が異なります。');
  workspace.dataset.latinAgricultureCurrentLayer=state.layer;workspace.dataset.latinAgricultureCurrentPlace=state.place;workspace.dataset.latinAgricultureRenderMode=state.fallback?'fallback':'normal';
 };
 workspace.addEventListener('change',event=>{
  const target=event.target as HTMLElement;
  if(target.matches('[data-latin-agriculture-place]')){state.place=(target as HTMLSelectElement).value;state.scope=state.place==='all'?'all':natureScopeForPlace(state.place,state.scope);if(state.place==='all')state.only=false;}
  else if(target.matches('[data-latin-agriculture-scope]')){
   state.scope=(target as HTMLSelectElement).value as LatinLearningState['scope'];
   if(state.scope==='country'&&state.place==='all')state.scope='all';
   if(state.scope==='central'&&latinCountries34.find(c=>c.code===state.place)?.subregion==='South America')state.place='all';
   if(state.scope==='south'&&state.place!=='all'&&latinCountries34.find(c=>c.code===state.place)?.subregion!=='South America')state.place='all';
  }
  else if(target.matches('[data-latin-agriculture-only]'))state.only=(target as HTMLInputElement).checked;
  else return;
  render();push();
 });
 const choose=(target:Element)=>{
  const country=target.closest<HTMLElement>('[data-latin-agriculture-country],[data-latin-agriculture-example],[data-nature-country]');
  if(country){state.place=country.dataset.latinAgricultureCountry??country.dataset.latinAgricultureExample??country.dataset.natureCountry!;state.scope=natureScopeForPlace(state.place,state.scope);render();push();return;}
  const button=target.closest<HTMLElement>('[data-latin-agriculture-layer]');
  if(button){state.layer=button.dataset.latinAgricultureLayer!;render();push();return;}
  if(target.closest('[data-latin-agriculture-fallback]')){state.fallback=!state.fallback;render();push();}
 };
 workspace.addEventListener('click',event=>{if(event.target instanceof Element)choose(event.target);});
 workspace.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&event.target instanceof SVGElement&&(event.target.hasAttribute('data-latin-agriculture-country')||event.target.hasAttribute('data-nature-country'))){event.preventDefault();choose(event.target);}
 });
 const restore=()=>{state=readLatinLearningState(window.location.search,'agriculture',layers,'all');render();};
 window.addEventListener('popstate',restore);window.addEventListener('latin-section-change',restore);
 render();push(true);workspace.dataset.latinAgricultureReady='true';
}
initialiseLatinAgriculture();
document.addEventListener('astro:page-load',initialiseLatinAgriculture);
