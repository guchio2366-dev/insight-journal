import data from '../data/atlas/west-asia.json';
import {westIndustryCatalog as catalog,westIndustrySectors as sectors,westIndustrySources as sources} from '../data/atlas/west-asia-industry-catalog.mjs';
import {westIndustryFrame,projectWestIndustry,readWestIndustryState,westIndustrySearch,layoutWestIndustryAnnotations,westIndustryMapLocations,clusterWestIndustryLocations,layoutWestIndustryPointSymbols,comparableWestIndustryMapRows,westIndustryValue,westIndustryShade} from '../lib/atlas-west-asia-industry.mjs';

import {westIndustryMapSectorCopy,westIndustryMapReading,westIndustryMapLabel} from '../data/atlas/west-asia-industry-map.mjs';

const root=document.querySelector<HTMLElement>('[data-west-industry]');
if(root)initWestIndustry(root);
export function initWestIndustry(root:HTMLElement){
 const $=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const all=<T extends Element=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
 const svg=$<SVGSVGElement>('[data-wi-map]'),points=$<SVGGElement>('[data-wi-points]'),labels=$('[data-wi-labels]'),country=$<HTMLSelectElement>('[data-wi-country]');
 const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 let state=readWestIndustryState(location.search),builtSector='',layout:any[]=[],clusters:any[]=[];
 const items=()=>catalog.filter(i=>i.sectors.includes(state.sector));
 const item=()=>catalog.find(i=>i.id===state.industry);
 const link=(id:string)=>`<a href="${esc((sources as any)[id].url)}">${esc((sources as any)[id].title)}</a>`;
 const commit=()=>{const query=westIndustrySearch(state);if(query!==location.search)history.pushState({},'',query);};
 function drawSector(){
  builtSector=state.sector;svg.dataset.mapSector=state.sector;
  svg.setAttribute('aria-label',`${westIndustryMapSectorCopy[state.sector].title}。表示中の分野の地点だけを掲載。産業は地図外の一覧から選択。矢印キーで地図を移動。`);
  svg.querySelector('title')!.textContent=westIndustryMapSectorCopy[state.sector].title;
  placeList();position();
 }
 function placeList(){
  $('[data-wi-place-list]').innerHTML=items().filter(i=>!state.industry||i.id===state.industry).map(i=>`<strong>${esc(westIndustryMapLabel(i,state.sector))}</strong>`+westIndustryMapLocations(i,state.sector).map(l=>`<button type="button" data-wi-place-button="${i.id}" data-wi-place="${l.index}">${esc(l.name)}<span>${esc(l.stage)} · ${esc(data.countries.find(c=>c.code===l.country)?.name??'国際通過点')}</span></button>`).join('')).join('');
 }
 function position(){
  const rect=svg.getBoundingClientRect(),width=rect.width||750,height=rect.height||740;
  layout=layoutWestIndustryAnnotations(state.sector,width,height,state.view);
  clusters=clusterWestIndustryLocations(items(),state.sector,width,state.view);
  const symbols=layoutWestIndustryPointSymbols(clusters,width,height,state.view),scale=state.view[2]/width;
  for(const n of all<SVGTextElement>('.wi-country-labels text'))n.style.fontSize=`${(width<500?11:13)*scale}px`;
  labels.innerHTML=layout.map(r=>`<div class="wi-map-annotation" data-wi-annotation="${r.id}" data-wi-industries="${r.industries.join(',')}" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px"><strong>${esc(r.title)}</strong><small>${esc(r.place)}</small></div>`).join('');
  points.innerHTML=symbols.map(g=>{
   const i=catalog.find(i=>i.id===g.industry)!,hq=g.stage==='企業本社',processing=!hq&&(state.sector==='manufacturing'||/製造|精製|精錬|加工|液化|製鋼/.test(g.stage)),r=g.radius*scale;
   const x=state.view[0]+g.x/width*state.view[2],y=state.view[1]+g.y/height*state.view[3];
   const names=g.members.map((n:number)=>`${i.locations[n].name}（${i.locations[n].stage}）`).join('、');
   const guide=Math.hypot(...g.offset)>.1?`<g class="wi-point-guide" data-wi-point-guide="${g.id}" data-industry="${i.id}"><circle cx="${g.source[0]}" cy="${g.source[1]}" r="${1.5*scale}"/><line x1="${g.source[0]}" y1="${g.source[1]}" x2="${x}" y2="${y}" vector-effect="non-scaling-stroke"/></g>`:'';
   const symbol=hq?`<path data-wi-symbol="headquarters" d="M0 ${-r*1.2} L${r*1.2} 0 L0 ${r*1.2} L${-r*1.2} 0 Z"/>`:processing?`<rect data-wi-symbol="processing" x="${-r}" y="${-r}" width="${r*2}" height="${r*2}"/>`:`<circle data-wi-symbol="location" r="${r}"/>`;
   return guide+`<g class="wi-marker" data-wi-point="${i.id}" data-wi-cluster="${g.id}" data-wi-members="${g.members.join(',')}" data-wi-place="${g.members.length===1?g.anchor:''}" data-x="${g.source[0]}" data-y="${g.source[1]}" transform="translate(${x},${y})" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(i.label+'：'+names+(g.members.length>1?'。'+g.members.length+'地点をまとめて表示':''))}" fill="${i.color}"><title>${esc(i.label+' · '+names)}</title>${symbol}${g.members.length>1?`<text class="wi-cluster-count" text-anchor="middle" dy="${3*scale}" style="font-size:${9*scale}px">${g.members.length}</text>`:''}</g>`;
  }).join('');
  visibility();
 }
 function visibility(){
  for(const n of all('[data-wi-annotation]')){const ids=(n.dataset.wiIndustries??'').split(','),relevant=ids.includes(state.industry??'');n.hidden=state.only&&(!relevant||ids.length>1);n.classList.toggle('is-highlighted',relevant);}
  for(const n of all<SVGElement>('[data-wi-point]')){const active=n.dataset.wiPoint===state.industry,selected=active&&state.place!==null&&(n.dataset.wiMembers??'').split(',').includes(String(state.place));
   n.style.display=state.only&&!active?'none':'';n.classList.toggle('is-context',!!state.industry&&!active);n.classList.toggle('is-selected',selected);n.setAttribute('aria-pressed',String(selected));n.setAttribute('tabindex',state.only&&!active?'-1':'0');}
  for(const n of all<SVGElement>('[data-wi-point-guide]'))n.style.display=state.only&&n.dataset.industry!==state.industry?'none':'';
 }
 function activatePoint(node:HTMLElement|SVGElement){
  const n=node.dataset.wiPlace;choose(node.dataset.wiPoint!,n!==''&&n!==undefined?Number(n):null);
 }
 function render(){
  const selected=item(),sector=sectors.find(s=>s.id===state.sector)!;
  root.dataset.ready='false';root.dataset.sector=state.sector;root.dataset.industry=state.industry??'';root.dataset.country=state.country??'';
  root.dataset.topic='industry-'+state.sector;
  svg.setAttribute('viewBox',state.view.join(' '));
  for(const n of all<HTMLButtonElement>('[data-wi-sector]')){const active=n.dataset.wiSector===state.sector;n.setAttribute('aria-selected',String(active));n.tabIndex=active?0:-1;}
  $('[role="tabpanel"]').setAttribute('aria-labelledby','wi-sector-'+state.sector);
  for(const n of all('[data-wi-picker]'))n.hidden=n.dataset.wiPicker!==state.sector;
  for(const n of all('[data-wi-industry]'))n.setAttribute('aria-pressed',String(n.dataset.wiIndustry===state.industry));
  country.value=state.country??'';
  for(const a of all<HTMLAnchorElement>('[data-west-field]')){
   const url=new URL(a.href);url.search='';
   if(state.country)url.searchParams.set('country',state.country);
   if(state.view.some((v:number,n:number)=>v!==westIndustryFrame[n]))url.searchParams.set('map',state.view.map((v:number)=>Number(v.toFixed(3))).join(','));
   if(a.dataset.westField==='industry')url.search=westIndustrySearch(state);
   a.href=url.href;
  }
  $('[data-wi-scope]').textContent=data.countries.find(c=>c.code===state.country)?.name??'20か国・地域';
  $('[data-wi-title]').textContent=selected?westIndustryMapReading(selected,state.sector).label:sector.label;
  $('[data-wi-summary]').textContent=selected?westIndustryMapReading(selected,state.sector).summary:sector.summary;
  $('[data-wi-why]').textContent=selected?westIndustryMapReading(selected,state.sector).why:sector.why;
  $('[data-wi-meaning]').hidden=!selected;
  $('[data-wi-meaning] p').textContent=selected?.meaning??'';
  $('[data-wi-clear]').hidden=!selected;
  $('[data-wi-only-wrap]').hidden=!selected;
  $<HTMLInputElement>('[data-wi-only]').checked=state.only;
  $('[data-wi-limit]').textContent=state.sector==='resources'&&selected?.id==='aluminium'?'この地図はボーキサイトの採掘地点です。地図下の一次アルミ生産量は精錬という別工程の統計なので、この採掘地図の国の色へ使いません。':selected?'地図の地点と国・企業の統計は別の範囲です。年・単位・未取得の詳細は地図下の統計へ。':'比較できる国別値がある系列は、選択時に国の色で実績を示します。未取得は薄い地色で、0ではありません。詳しい年・分母・出典は地図下にあります。';
  const place=selected&&state.place!==null?selected.locations[state.place]:null;
  $('[data-wi-place-reading]').hidden=!place;
  $('[data-wi-place-reading]').innerHTML=place?`<h3>${esc(place.name)} · ${esc(place.stage)}</h3><p>${esc(place.note)}</p><p>${esc(place.status)}</p><p>${link(place.source)}</p>`:'';
  if(builtSector!==state.sector)drawSector();else{visibility();placeList();}
  // The selected country's outline changes; the camera and labels do not.
  const stageMismatch=state.sector==='resources'&&selected?.id==='aluminium',comparable=comparableWestIndustryMapRows(selected,state.sector),national=!['port-teu','airport-passengers'].includes(comparable[0]?.group??'');
  const values=new Map(national?comparable.map((r:any)=>[r.country,r]):[]),max=Math.max(1,...comparable.map((r:any)=>r.value));
  for(const path of all<SVGPathElement>('[data-wi-country-shape]')){const row:any=values.get(path.dataset.wiCountryShape);path.setAttribute('fill',westIndustryShade(row?.value??null,max));path.classList.toggle('is-selected',path.dataset.wiCountryShape===state.country);const title=path.querySelector('title');if(title){const name=data.countries.find(c=>c.code===path.dataset.wiCountryShape)?.name??path.dataset.wiCountryShape;title.textContent=row?`${name}：${westIndustryValue(row)} ${row.unit} · ${row.year}年 ${row.measure}`:`${name}：${stageMismatch?'採掘の位置を表示。一次アルミの統計は別工程':selected?'この系列は未取得':'国土の参考位置'}`;}}
  const visibleSymbols=all<SVGElement>('[data-wi-point]').filter(n=>n.style.display!=='none').map(n=>n.querySelector('[data-wi-symbol]')?.getAttribute('data-wi-symbol'));
  const stages=[visibleSymbols.includes('location')?(state.sector==='services'?'● サービス・通過点':'● 採取・産地'):null,visibleSymbols.includes('processing')?'■ 加工・製造':null,visibleSymbols.includes('headquarters')?'◇ 企業本社':null].filter(Boolean).join('　');
  const magnitude=comparable.length&&national?`<strong>国の色＝${esc(comparable[0].measure)} · ${comparable[0].year}年 · ${esc(comparable[0].unit)}</strong><span><i class="wi-scale"></i>0 → ${esc(westIndustryValue({value:max}))}　地色＝未取得</span>`:`<strong>${esc(westIndustryMapSectorCopy[state.sector].key)}</strong>${comparable.length?'<span>規模は地図下</span>':''}`;
  $('[data-wi-map-key]').innerHTML=magnitude+`<span>${stages} · 数字＝まとめた掲載地点数</span>`;
  $('[data-wi-stat-overview]').hidden=!!selected;
  for(const n of all('[data-wi-stat-panel]'))n.hidden=n.dataset.wiStatPanel!==state.industry;
  if(selected){
   const panel=$(`[data-wi-stat-panel="${selected.id}"]`),filtered=selected.metrics.filter((m:any)=>!state.country||m.country===state.country);
   for(const tr of [...panel.querySelectorAll<HTMLElement>('[data-wi-metric-country]')])tr.hidden=!!state.country&&tr.dataset.wiMetricCountry!==state.country;
   const rows=comparable.filter((m:any)=>!state.country||m.country===state.country).sort((a:any,b:any)=>b.value-a.value);
   $(`[data-wi-ranking="${selected.id}"]`).innerHTML=stageMismatch?'<p>採掘地点の地図です。下表の一次アルミ生産は別工程なので、棒と国の色には使いません。</p>':rows.length?rows.map((r:any)=>`<div class="wi-rank-row"><div><strong>${esc(r.place)}</strong><span>${esc(westIndustryValue(r))} ${esc(r.unit)}</span></div><i><span style="width:${r.value/max*100}%"></span></i></div>`).join(''):`<p>${state.country&&!filtered.length?'この国の同一定義の値は未取得です。':'同一年・同一指標の比較可能な地域系列は未取得です。'}0を意味しません。</p>`;
   const scope=panel.querySelector('[data-wi-stat-scope]')!;scope.textContent=rows.length?`${rows[0].year}年 · ${rows[0].measure} · ${rows[0].unit}。${national?'全国値を国の色にも使用。':'地点実績。国の色へ配分しません。'}`:'表の各行の範囲・単位を参照。企業・都市・異なる製品段階を同列の棒にしません。';
   const missing=data.countries.filter(c=>!selected.metrics.some((m:any)=>m.country===c.code));
   $(`[data-wi-missing="${selected.id}"]`).textContent=`この系列の国別細分値が未取得：${missing.map(c=>c.name).join('、')}。未取得は0・産業の不在ではありません。${state.country&&!filtered.length?' 選択した国の表は未取得のため空欄です。':''}`;
  }
  root.dataset.ready='true';
 }
 function choose(id:string,place:number|null=null){const next=catalog.find(i=>i.id===id);if(!next)return;state.industry=id;state.place=place;if(!next.sectors.includes(state.sector))state.sector=next.sectors[0];commit();render();}
 function clear(){state.industry=null;state.place=null;state.only=false;commit();render();}
 function sector(id:string){if(!sectors.some(s=>s.id===id))return;state.sector=id;state.industry=null;state.place=null;state.only=false;commit();render();}
 function camera(factor:number){const [x,y,w,h]=state.view,nw=Math.max(200,Math.min(4000,w*factor)),nh=nw/w*h;state.view=[x+(w-nw)/2,y+(h-nh)/2,nw,nh];svg.setAttribute('viewBox',state.view.join(' '));commit();position();}
 root.addEventListener('click',e=>{
  const t=e.target as Element;
  const s=t.closest<HTMLElement>('[data-wi-sector]');if(s){sector(s.dataset.wiSector!);return;}
  const point=t.closest<SVGElement>('[data-wi-point]');if(point){activatePoint(point);return;}
  const p=t.closest<HTMLElement>('[data-wi-place-button]');if(p){choose(p.dataset.wiPlaceButton!,Number(p.dataset.wiPlace));return;}
  const i=t.closest<HTMLElement>('[data-wi-industry]');if(i){choose(i.dataset.wiIndustry!);return;}
  if(t.closest('[data-wi-clear]')){clear();return;}
  const z=t.closest<HTMLElement>('[data-wi-zoom]');if(z){camera(Number(z.dataset.wiZoom));return;}
  if(t.closest('[data-wi-reset]')){state.view=westIndustryFrame.slice();commit();svg.setAttribute('viewBox',state.view.join(' '));position();}
 });
 root.addEventListener('change',e=>{const t=e.target as HTMLInputElement;if(t.matches('[data-wi-only]')){state.only=t.checked;commit();render();}else if(t.matches('[data-wi-country]')){state.country=t.value||null;commit();render();}});
 root.addEventListener('keydown',e=>{
  const t=e.target as HTMLElement,s=t.closest<HTMLElement>('[data-wi-sector]');
  if(s&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=sectors.findIndex(x=>x.id===state.sector),index=e.key==='Home'?0:e.key==='End'?2:(n+(e.key==='ArrowRight'?1:2))%3;sector(sectors[index].id);$<HTMLButtonElement>(`[data-wi-sector="${state.sector}"]`).focus();return;}
  if(t.matches('[data-wi-point]')&&['Enter',' '].includes(e.key)){e.preventDefault();activatePoint(t);return;}
  if(e.key==='Escape'){clear();return;}
  if(t!==svg)return;
  if(['+','=','-'].includes(e.key)){e.preventDefault();camera(e.key==='-'?1.43:.7);return;}
  const vectors:any={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};
  if(vectors[e.key]){e.preventDefault();state.view[0]+=vectors[e.key][0]*state.view[2];state.view[1]+=vectors[e.key][1]*state.view[3];svg.setAttribute('viewBox',state.view.join(' '));commit();position();}
 });
 let drag:any=null;
 svg.addEventListener('pointerdown',e=>{if(e.button!==0||(e.target as Element).closest('[data-wi-point]'))return;drag={x:e.clientX,y:e.clientY,view:state.view.slice()};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const r=svg.getBoundingClientRect();state.view=[drag.view[0]-(e.clientX-drag.x)/r.width*drag.view[2],drag.view[1]-(e.clientY-drag.y)/r.height*drag.view[3],drag.view[2],drag.view[3]];svg.setAttribute('viewBox',state.view.join(' '));position();});
 svg.addEventListener('pointerup',()=>{if(drag){drag=null;commit();}});svg.addEventListener('pointercancel',()=>{drag=null;});
 const observer=new ResizeObserver(()=>position());observer.observe(svg);
 window.addEventListener('popstate',()=>{state=readWestIndustryState(location.search);builtSector='';render();});
 render();
}
