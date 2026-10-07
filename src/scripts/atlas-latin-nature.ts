import {latinCountries} from '../lib/atlas-latin-america-geometry';
import {latinNatureCases,latinNatureLayers,renderLatinNatureMap,renderLatinNatureLegend,renderLatinNatureNormals,natureCaseForPlace,natureCountryName,natureScopeForPlace,natureComparisonReading,escapeNatureHtml} from '../lib/atlas-latin-nature';
import {renderLatinAgricultureMap,renderLatinAgricultureLegend,agricultureLayerTitle} from '../lib/atlas-latin-agriculture';
import {renderLatinPopulationMap,renderLatinPopulationLegend} from '../lib/atlas-latin-america-population';
import {renderLatinIndustryMap,renderLatinIndustryLegend} from '../lib/atlas-latin-industry';
import {readLatinLearningState,writeLatinLearningState,latinLearningUrl,latinSourceReturnUrl,latinComparisonState,type LatinLearningState} from '../lib/atlas-latin-learning-state';
import {withBase} from '../lib/urls';

const workspace=document.querySelector<HTMLElement>('[data-latin-workspace][data-latin-field="nature"]');
if(workspace){
 const q=<T extends Element=HTMLElement>(selector:string)=>workspace.querySelector<T>(selector)!;
 const base=withBase('/atlas/latin-america/');
 const esc=escapeNatureHtml;
 let state:LatinLearningState;
 let currentCaseId='overview';
 let renderVersion=0;
 const imageData=new Map<string,Promise<string>>();
 function read(){
  state=readLatinLearningState(location.search,'nature',latinNatureLayers,'climate');
  const params=new URLSearchParams(location.search);
  currentCaseId=natureCaseForPlace(state.place,params.get('case')??undefined).id;
 }
 function write(push:boolean){
  state.case=currentCaseId;
  const params=new URLSearchParams(writeLatinLearningState(state));
  params.set('case',currentCaseId);
  const url=location.pathname+'?'+params.toString();
  if(push)history.pushState(null,'',url);else if(location.pathname+location.search!==url)history.replaceState(null,'',url);
 }
 function normalCase(){return natureCaseForPlace(state.place,currentCaseId);}
 function sourceTitle(){
  const source=state.source;
  if(!source)return '';
  if(source.field==='agriculture')return `${natureCountryName(source.place)} · ${agricultureLayerTitle(source.layer)} · 2020年`;
  if(source.field==='population')return `${natureCountryName(source.place)} · ${source.layer==='density'?'人口密度':source.layer==='population'?'人口規模':'人口密度と規模'} · 2023年`;
  if(source.field==='industry')return source.layer==='canal'?'パナマ運河 · 淡水と物流 · 2024会計年度':`${natureCountryName(source.place)} · ${source.layer==='manufactures'?'製造品':'鉱石・金属'}の輸出比率 · 2024年`;
  return `${natureCountryName(source.place)} · 気候群 · 1991–2020年`;
 }
 function sourceMap(){
  const source=state.source!;
  if(source.field==='agriculture')return renderLatinAgricultureMap(source,'nature-agriculture-source');
  if(source.field==='population')return renderLatinPopulationMap(source,'nature-population-source');
  if(source.field==='industry')return renderLatinIndustryMap(source,'nature-industry-source');
  return renderLatinNatureMap(source,'nature-source');
 }
 function sourceLegend(){
  const source=state.source!;
  if(source.field==='agriculture')return renderLatinAgricultureLegend(source.layer);
  if(source.field==='population')return renderLatinPopulationLegend(source.layer);
  if(source.field==='industry')return renderLatinIndustryLegend(source.layer);
  return renderLatinNatureLegend(source.layer);
 }
 function alignMapCaptions(){
  const captions=[q<HTMLElement>('[data-nature-primary-caption]'),q<HTMLElement>('[data-nature-source-caption]')];
  captions.forEach(caption=>caption.style.removeProperty('min-height'));
  if(!state.source)return;
  const height=Math.ceil(Math.max(...captions.map(caption=>caption.getBoundingClientRect().height)));
  captions.forEach(caption=>caption.style.minHeight=`${height}px`);
 }
 async function inlineImage(url:string){
  if(!imageData.has(url))imageData.set(url,fetch(url).then(response=>{if(!response.ok)throw new Error('地図画像を取得できません');return response.blob();}).then(blob=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);})));return imageData.get(url)!;
 }
 async function fallbackMap(host:HTMLElement,version:number){
  const original=host.querySelector('svg');if(!original)return;
  const clone=original.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  try{
   for(const img of clone.querySelectorAll('image')){const href=img.getAttribute('href');if(href&&!href.startsWith('data:'))img.setAttribute('href',await inlineImage(href));}
   if(version!==renderVersion)return;
   const img=document.createElement('img');img.className='latin-nature-fallback';img.alt=original.querySelector('title')?.textContent??'比較地図';img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));img.setAttribute('data-nature-fallback','');
   host.replaceChildren(img);
  }catch{if(version===renderVersion){q('[data-nature-renderer]').textContent='地図画像を取得できません。元区分と観測所の数値一覧で確認できます。';workspace.dataset.natureRenderer='unavailable';}}
 }
 function render(push=false){
  const version=++renderVersion,selected=normalCase(),comparison=!!state.source;
  state.case=currentCaseId;
  workspace.classList.toggle('is-comparison',comparison);
  q('[data-nature-panes]').classList.toggle('is-comparison',comparison);
  q<HTMLElement>('[data-nature-source-pane]').hidden=!comparison;
  q<HTMLElement>('[data-nature-map-host]').innerHTML=renderLatinNatureMap(state,'nature-main');
  q<HTMLElement>('[data-nature-legend-host]').innerHTML=renderLatinNatureLegend(state.layer);
  q<HTMLSelectElement>('[data-nature-place]').value=state.place;
  q<HTMLSelectElement>('[data-nature-scope]').value=state.scope;
  q<HTMLSelectElement>('[data-nature-place]').disabled=comparison;
  q<HTMLSelectElement>('[data-nature-scope]').disabled=comparison;
  q<HTMLInputElement>('[data-nature-only]').checked=state.only;
  q<HTMLInputElement>('[data-nature-only]').disabled=state.place==='all';
  const returnLink=q<HTMLAnchorElement>('[data-nature-return]');returnLink.hidden=!comparison;
  const comparisonReading=comparison?natureComparisonReading(state.source!):null;
  q<HTMLElement>('[data-nature-comparison-header]').hidden=!comparison;
  if(comparison){
   q('[data-nature-source-caption]').textContent='元の分布：'+sourceTitle();
   q('[data-nature-source-map]').innerHTML=sourceMap();
   q('[data-nature-source-legend]').innerHTML=sourceLegend();
   returnLink.href=latinSourceReturnUrl(base,state);
   returnLink.textContent=sourceTitle()+'へ戻る';
   q('[data-nature-map-title]').textContent=comparisonReading!.title;
   q('[data-nature-comparison-takeaway]').textContent=comparisonReading!.takeaway;
  }else q('[data-nature-map-title]').textContent=`${natureCountryName(state.place)}の気候群と雨の季節`;
  q('[data-nature-primary-caption]').textContent=`${natureCountryName(state.place)} · 気候群 · 1991–2020年`;
  const representative=state.place!=='all'&&selected.place!==state.place;
  q('[data-nature-reading-title]').textContent=comparisonReading?.title??(representative?`${selected.title}（${natureCountryName(selected.place)}の代表例）`:selected.title);
  q('[data-nature-takeaway]').textContent=comparisonReading?.takeaway??(representative?`${natureCountryName(state.place)}の分布を、同じ地域の代表例として読みます。${selected.takeaway}`:selected.takeaway);
  q('[data-nature-comparison-explanation]').textContent=comparisonReading?.explanation??selected.compare;
  q('[data-nature-case-sources]').innerHTML=(comparisonReading?.sources??selected.sources).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('');
  q('[data-nature-normals]').innerHTML=renderLatinNatureNormals(selected.city);
  workspace.querySelectorAll<HTMLButtonElement>('[data-nature-case]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.natureCase===selected.id)));
  const agriculture=q<HTMLAnchorElement>('[data-nature-agriculture]'),population=q<HTMLAnchorElement>('[data-nature-population]'),industry=q<HTMLAnchorElement>('[data-nature-industry]');
  state.case=currentCaseId;
  agriculture.href=latinLearningUrl(base,latinComparisonState({...state,source:undefined},'agriculture',selected.crop));
  agriculture.textContent=`${natureCountryName(state.place)}の気候と${agricultureLayerTitle(selected.crop)}を比べる`;
  population.href=latinLearningUrl(base,latinComparisonState({...state,source:undefined},'population','density'));
  population.textContent=`${natureCountryName(state.place)}の気候と人口密度を比べる`;
  industry.hidden=state.place!=='PAN';industry.href=latinLearningUrl(base,latinComparisonState({...state,source:undefined},'industry','canal'));
  q('[data-nature-map-description]').textContent=comparison?'同じ範囲で元の分布と比較。代表例を選ぶと自然の通常表示に戻ります。':'5気候群の中にも雨季・乾季の違いがあります。右の観測所の月別平年値で確かめます。';
  alignMapCaptions();
  q('[data-nature-renderer]').textContent=state.fallback?'静的画像表示（地図と同じ分布・凡例）':'';
  workspace.dataset.natureReady='true';workspace.dataset.natureLayer=state.layer;workspace.dataset.naturePlace=state.place;workspace.dataset.natureScope=state.scope;workspace.dataset.natureRenderer=state.fallback?'fallback':'svg';
  write(push);
  if(state.fallback)void fallbackMap(q('[data-nature-map-host]'),version);
  if(comparison&&(state.source?.fallback??state.fallback))void fallbackMap(q('[data-nature-source-map]'),version);
 }
 q<HTMLSelectElement>('[data-nature-place]').addEventListener('change',event=>{const place=(event.target as HTMLSelectElement).value;state={...state,place,scope:natureScopeForPlace(place,state.scope),source:undefined};currentCaseId=natureCaseForPlace(state.place).id;render(true);});
 q<HTMLSelectElement>('[data-nature-scope]').addEventListener('change',event=>{const scope=(event.target as HTMLSelectElement).value as LatinLearningState['scope'];let place=state.place;if(place!=='all'&&(scope==='central'||scope==='south')&&natureScopeForPlace(place,scope)!==scope)place=scope==='south'?'BRA':'CRI';state={...state,place,scope:scope==='country'&&place==='all'?'all':scope,source:undefined};currentCaseId=natureCaseForPlace(place).id;render(true);});
 q<HTMLInputElement>('[data-nature-only]').addEventListener('change',event=>{state={...state,only:(event.target as HTMLInputElement).checked};render(true);});
 workspace.addEventListener('click',event=>{
  const target=(event.target as Element).closest<HTMLElement>('[data-nature-case],[data-nature-country]');if(!target)return;
  if(target.dataset.natureCase){const selected=latinNatureCases.find(c=>c.id===target.dataset.natureCase)!;state={...state,place:selected.place,scope:selected.place==='all'?'all':state.scope==='all'?'all':selected.scope as LatinLearningState['scope'],only:false,source:undefined};currentCaseId=selected.id;render(true);}
  else if(!state.source&&target.dataset.natureCountry){state={...state,place:target.dataset.natureCountry};currentCaseId=natureCaseForPlace(state.place).id;render(true);}
 });
 workspace.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){const target=(event.target as Element).closest<SVGElement>('[data-nature-country]');if(target){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}});
 const restore=()=>{read();render();};
 window.addEventListener('popstate',restore);window.addEventListener('latin-section-change',restore);
 window.addEventListener('resize',alignMapCaptions);
 read();render();
 void document.fonts.ready.then(alignMapCaptions);
}
