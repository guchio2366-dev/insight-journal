import {usIndustries,usIndustrySites,usIndustrySectors,usIndustrySources,usSectorIndustryIds,usSitesForSector,type UsSite,type UsSector} from '../data/atlas/us-industry.ts';
import {readUsIndustryState,writeUsIndustryState,projectUsIndustry,layoutUsIndustryLabels,usIndustryById} from '../lib/atlas-us-industry.ts';
import {readPopulationInsight} from '../lib/atlas-population-insight-state.ts';

const ns='http://www.w3.org/2000/svg';
const status={cluster:'確認集積例',operating:'稼働施設例',registered:'登録位置・現在の稼働未確認',planned:'計画・建設段階',headquarters:'企業本社'};
export function initUsIndustry(root:HTMLElement){
 const legacyUrl=new URL(location.href),base=legacyUrl.pathname.replace(/industry\/$/,'');if(readPopulationInsight(legacyUrl,base)?.item.page==='industry'){legacyUrl.pathname=base+'population/industry/';location.replace(legacyUrl.href);return;}
 if(root.dataset.usInitialized)return;root.dataset.usInitialized='true';
 const q=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const frame=q<HTMLElement>('[data-us-map-frame]'),map=q<SVGSVGElement>('[data-us-map]'),overlay=q<HTMLElement>('[data-us-overlay]');
 let state=readUsIndustryState(new URL(location.href));
 let cachedLayout:{key:string;boxes:ReturnType<typeof layoutUsIndustryLabels>}|null=null;
 const el=(tag:string,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
 const svg=(tag:string,attrs:Record<string,string|number>)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 const link=(id:string)=>{const s=usIndustrySources[id],a=el('a',s.title) as HTMLAnchorElement;a.href=s.url;return a;};
 const set=(selector:string,text:string)=>{q(selector).textContent=text;};
 const camera=()=>{const w=1000/state.zoom,h=600/state.zoom;return [(1000-w)/2+state.x,(600-h)/2+state.y,w,h];};
 const screen=(p:number[])=>{const [x,y,w,h]=camera(),width=frame.clientWidth||1000,height=frame.clientHeight||600,scale=Math.min(width/w,height/h);return [(width-w*scale)/2+(p[0]-x)*scale,(height-h*scale)/2+(p[1]-y)*scale] as [number,number];};
 function save(push=true){const next=writeUsIndustryState(new URL(location.href),state);if(push&&next.href!==location.href)history.pushState(null,'',next);render();}
 function chooseIndustry(id:string|null){state.industry=id;state.site=null;state.only=false;save();}
 function chooseSite(site:UsSite){state.industry=site.industry;state.site=site.id;save();q('[data-us-site-reading]').scrollTop=0;}
 function renderMap(){
  map.setAttribute('viewBox',camera().join(' '));const selectedFocus=(document.activeElement as HTMLElement)?.dataset.usMapIndustry,siteFocus=(document.activeElement as HTMLElement)?.dataset.usSite;
  const sectorSites=usSitesForSector(state.sector),ids=usSectorIndustryIds(state.sector),width=frame.clientWidth||1000,height=frame.clientHeight||600;
  const positions=sectorSites.map(s=>({site:s,point:screen(projectUsIndustry(s.coordinates))})).filter(p=>p.point[0]>=0&&p.point[0]<=width&&p.point[1]>=0&&p.point[1]<=height-30);
  // Layout inputs depend on classification/camera/viewport only, never selection.
  const inputs=ids.map(id=>{const peers=positions.filter(p=>p.site.industry===id),item=usIndustryById(id)!,reference=peers.find(p=>p.site.mapScale)??peers[0];return {id,anchor:reference?.point??[width/2,height/2] as [number,number],width:Math.min(175,Math.max(126,item.short.length*12+22,(reference?.site.mapScale?.length??0)*6+22))};});
  const layoutKey=[state.sector,width,height,...camera()].join(':');if(cachedLayout?.key!==layoutKey)cachedLayout={key:layoutKey,boxes:layoutUsIndustryLabels(inputs,width,height)};
  const layout=cachedLayout.boxes,points=svg('svg',{width:'100%',height:'100%','aria-label':'確認した集積地域・施設状態'});points.classList.add('us-industry-points');
  overlay.replaceChildren(points);
  for(const box of layout){if(state.only&&box.id!==state.industry)continue;const anchor=inputs.find(i=>i.id===box.id)!.anchor,x=Math.max(box.left,Math.min(box.left+box.width,anchor[0])),y=Math.max(box.top,Math.min(box.top+box.height,anchor[1]));if(Math.hypot(x-anchor[0],y-anchor[1])>4)points.append(svg('line',{x1:anchor[0],y1:anchor[1],x2:x,y2:y,stroke:usIndustryById(box.id)!.color,'stroke-width':1,opacity:state.industry&&state.industry!==box.id?'.2':'.55','pointer-events':'none'}));}
  for(const {site,point:[px,py]} of positions){
   const peers=positions.filter(p=>p.site.coordinates.join(',')===site.coordinates.join(',')),index=peers.findIndex(p=>p.site.id===site.id),angle=index*Math.PI*2/peers.length;
   const x=px+(peers.length>1?Math.cos(angle)*10:0),y=py+(peers.length>1?Math.sin(angle)*10:0),item=usIndustryById(site.industry)!;
   const group=svg('g',{'data-us-site':site.id,'data-industry':site.industry,'data-coordinate':site.coordinates.join(','),'data-status':site.status,role:'button',tabindex:state.only&&state.industry!==site.industry?-1:0,'aria-label':`${item.label} · ${site.place} · ${site.stage} · ${status[site.status]}`,'aria-pressed':String(state.site===site.id)});
   group.classList.add('us-industry-pin');if(state.only&&state.industry!==site.industry)group.style.display='none';
   else if(state.industry&&state.industry!==site.industry)group.setAttribute('opacity','.38');
   group.append(svg('circle',{cx:x,cy:y,r:12,fill:'transparent'}));
   const attrs={fill:site.status==='planned'||site.status==='registered'?'#fffef5':item.color,stroke:item.color,'stroke-width':1.5};
   group.append(site.status==='planned'||site.status==='registered'?svg('path',{d:`M${x},${y-5}L${x+5},${y}L${x},${y+5}L${x-5},${y}Z`,...attrs}):site.status==='operating'?svg('rect',{x:x-4,y:y-4,width:8,height:8,...attrs}):svg('circle',{cx:x,cy:y,r:4,...attrs}));
   if(state.industry===site.industry)group.append(svg('circle',{cx:x,cy:y,r:8,fill:'none',stroke:item.color,'stroke-width':state.site===site.id?3:1.2,'pointer-events':'none'}));
   const title=svg('title',{});title.textContent=`${item.label}｜${site.place}｜${site.scale??'地域規模の同一定義値は未収録'}`;group.append(title);
   group.addEventListener('click',()=>chooseSite(site));group.addEventListener('keydown',e=>{const event=e as KeyboardEvent;if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseSite(site);}});points.append(group);
  }
  for(const box of layout){
   const item=usIndustryById(box.id)!,button=el('button') as HTMLButtonElement,reference=positions.find(p=>p.site.industry===item.id&&p.site.mapScale)?.site;button.append(el('strong',item.short));if(reference)button.append(el('small',reference.mapScale!));button.type='button';button.className='us-industry-map-label';button.dataset.usMapIndustry=item.id;
   button.setAttribute('aria-label',`${item.label}の分布と規模を読む`);button.title=[item.label,reference?`${reference.place}：${reference.mapScale}`:''].filter(Boolean).join(' · ');button.setAttribute('aria-pressed',String(state.industry===item.id));button.style.cssText=`left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;--us-color:${item.color}`;
   if(state.only&&item.id!==state.industry)button.hidden=true;else if(state.industry&&item.id!==state.industry)button.classList.add('is-context');
   button.addEventListener('click',()=>chooseIndustry(item.id));overlay.append(button);
  }
  overlay.dataset.layout=JSON.stringify(layout);
  if(selectedFocus)overlay.querySelector<HTMLButtonElement>(`[data-us-map-industry="${selectedFocus}"]`)?.focus({preventScroll:true});
  else if(siteFocus)overlay.querySelector<SVGElement>(`[data-us-site="${siteFocus}"]`)?.focus({preventScroll:true});
 }
 function statistics(){
  const holder=q('[data-us-statistics]');holder.replaceChildren();const items=state.industry?[usIndustryById(state.industry)!]:usIndustries.filter(i=>usSectorIndustryIds(state.sector).includes(i.id));
  set('[data-us-stat-heading]',`${state.industry?usIndustryById(state.industry)!.label:usIndustrySectors.find(s=>s.id===state.sector)!.label}の規模と分布`);
  for(const item of items){const section=el('section');section.dataset.usStatisticsIndustry=item.id;section.className='us-industry-stat-card';section.append(el('h3',item.label));const list=el('dl');
   for(const m of item.metrics){const row=el('div');row.dataset.status=m.status;row.append(el('dt',m.label),el('dd',m.display),el('p',`${m.period} · ${m.definition}`),link(m.source));list.append(row);}section.append(list);holder.append(section);}
  const regions=el('section');regions.className='us-industry-stat-card';regions.dataset.usRegionalStatistics='';regions.append(el('h3','地域にどの程度集まるか'));
  for(const site of usSitesForSector(state.sector).filter(s=>!state.industry||s.industry===state.industry)){const p=el('p');p.append(el('strong',`${site.place}：`),document.createTextNode(`${site.scale??'同一定義の地域規模は未収録'}（${site.period}）`));regions.append(p);}
  holder.append(regions);
 }
 function render(){
  const sector=usIndustrySectors.find(s=>s.id===state.sector)!,item=usIndustryById(state.industry),site=usIndustrySites.find(s=>s.id===state.site),sites=usSitesForSector(state.sector).filter(s=>!item||s.industry===item.id);
  root.dataset.industrySector=state.sector;root.dataset.industrySubsector=item?.id??'all';root.dataset.usIndustry=state.industry??'';root.dataset.usSite=state.site??'';
  set('[data-us-title]',item?.label??sector.label);set('[data-us-reading]',item?.reading??sector.reading);set('[data-us-why]',item?.why??sector.why);set('[data-us-breadcrumb]',sector.label+(item?` ／ ${item.label}`:''));
  q('#us-industry-panel').setAttribute('aria-labelledby',`us-sector-${state.sector}`);
  root.querySelectorAll<HTMLElement>('[data-us-sector]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.usSector===state.sector));b.tabIndex=b.dataset.usSector===state.sector?0:-1;});
  root.querySelectorAll<HTMLElement>('[data-us-subtabs]').forEach(g=>g.hidden=g.dataset.usSubtabs!==state.sector);
  root.querySelectorAll<HTMLElement>('[data-us-product]').forEach(b=>{const active=(b.dataset.usProduct??'')===(item?.id??'');b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  q<HTMLElement>('[data-us-only-wrap]').hidden=!item;q<HTMLInputElement>('[data-us-only]').checked=state.only;q<HTMLElement>('[data-us-clear]').hidden=!item;
  q<HTMLElement>('[data-us-site-reading]').hidden=!site;
  if(site){set('[data-us-site-title]',`${site.place} · ${site.stage}`);set('[data-us-site-copy]',site.reading);set('[data-us-site-scale]',site.scale??'地域規模の同一定義値は未収録。記号は数量を表しません。');set('[data-us-site-scope]',`${status[site.status]} · ${site.period} · ${site.scope}`);q('[data-us-site-sources]').replaceChildren(...site.sources.map(link));}
  const list=q('[data-us-site-list]');list.replaceChildren();for(const s of sites){const button=el('button',`${s.place} · ${s.stage}`) as HTMLButtonElement;button.type='button';button.dataset.usSiteOption=s.id;button.setAttribute('aria-pressed',String(s.id===state.site));button.addEventListener('click',()=>chooseSite(s));list.append(button);}
  const sourceIds=[...new Set((item?item.metrics.map(m=>m.source):[]).concat(sites.flatMap(s=>s.sources)))];q('[data-us-product-sources]').replaceChildren(...sourceIds.map(link));set('[data-us-product-scope]',item?.why??'統計と位置はそれぞれの一次資料の年・範囲で示す。集積案内・稼働・登録・計画と企業本社を区別する。');
  const key=q('[data-us-key]');key.replaceChildren();for(const id of usSectorIndustryIds(state.sector)){const i=usIndustryById(id)!,button=el('button',i.label) as HTMLButtonElement;button.type='button';button.dataset.usKey=id;button.style.setProperty('--us-color',i.color);button.setAttribute('aria-pressed',String(item?.id===id));button.addEventListener('click',()=>chooseIndustry(id));key.append(button);}
  // Original published charts remain separate from the new narrow product metrics.
  root.querySelectorAll<HTMLElement>('[data-industry-national-panel]').forEach(p=>p.hidden=p.dataset.industryNationalPanel!==state.sector);
  root.querySelectorAll<HTMLElement>('[data-industry-detail]').forEach(p=>p.hidden=p.dataset.industryDetail!==`${item?.legacy?item.sector:state.sector}:${item?.legacy??'all'}`);
  statistics();renderMap();root.dataset.renderState='ready';set('[data-us-live]',`${item?.label??sector.label}の分布・解説・統計を表示しました。`);
 }
 const sector=(id:string)=>{state={...state,sector:id as UsSector,industry:null,site:null,only:false};save();};
 root.querySelectorAll<HTMLElement>('[data-us-sector]').forEach(button=>button.addEventListener('click',()=>sector(button.dataset.usSector!)));
 root.querySelectorAll<HTMLElement>('[data-us-product]').forEach(button=>button.addEventListener('click',()=>chooseIndustry(button.dataset.usProduct||null)));
 root.querySelectorAll<HTMLElement>('[role=tab]').forEach(button=>button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...button.parentElement!.querySelectorAll<HTMLElement>('[role=tab]')],index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(tabs.indexOf(button)+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[index].click();tabs[index].focus({preventScroll:true});}));
 q('[data-us-clear]').addEventListener('click',()=>chooseIndustry(null));q<HTMLInputElement>('[data-us-only]').addEventListener('change',event=>{state.only=(event.target as HTMLInputElement).checked;save();});
 root.querySelectorAll<HTMLElement>('[data-us-zoom]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.usZoom==='fit'){state.zoom=1;state.x=0;state.y=0;}else state.zoom=Math.max(1,Math.min(3,state.zoom*(button.dataset.usZoom==='in'?1.25:.8)));save();}));
 map.addEventListener('keydown',event=>{if(event.key==='Escape'){chooseIndustry(null);return;}const moves:Record<string,number[]>={ArrowLeft:[-40,0],ArrowRight:[40,0],ArrowUp:[0,-40],ArrowDown:[0,40]};if(moves[event.key]){event.preventDefault();state.x+=moves[event.key][0]/state.zoom;state.y+=moves[event.key][1]/state.zoom;save();}});
 let drag:{x:number;y:number;startX:number;startY:number}|null=null;
 map.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,startX:state.x,startY:state.y};map.setPointerCapture(event.pointerId);});
 map.addEventListener('pointermove',event=>{if(!drag)return;state.x=drag.startX-(event.clientX-drag.x)*1000/(frame.clientWidth||1000)/state.zoom;state.y=drag.startY-(event.clientY-drag.y)*600/(frame.clientHeight||600)/state.zoom;renderMap();});
 map.addEventListener('pointerup',()=>{if(drag){drag=null;save();}});map.addEventListener('pointercancel',()=>drag=null);
 new ResizeObserver(()=>renderMap()).observe(frame);document.fonts?.ready.then(renderMap);
 window.addEventListener('popstate',()=>{state=readUsIndustryState(new URL(location.href));render();});render();
 return {getState:()=>({...state}),render};
}
