import {usIndustries,usIndustrySites,usIndustrySectors,usIndustrySources,usSectorIndustryIds,usSitesForSector,type UsSite,type UsSector} from '../data/atlas/us-industry.ts';
import {readUsIndustryState,writeUsIndustryState,projectUsIndustry,layoutUsIndustryLabels,groupUsIndustryPoints,usMapLabelBudget,usMapLabelIndustryOrder,usMapLabelSitePreference,usMapIndustryLabel,usMapPlaceLabel,usIndustryById} from '../lib/atlas-us-industry.ts';
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
  map.setAttribute('viewBox',camera().join(' '));const siteFocus=(document.activeElement as HTMLElement)?.dataset.usSite;
  const sectorSites=usSitesForSector(state.sector),width=frame.clientWidth||1000,height=frame.clientHeight||600;
  const positions=sectorSites.map(s=>({site:s,point:screen(projectUsIndustry(s.coordinates))})).filter(p=>p.point[0]>=0&&p.point[0]<=width&&p.point[1]>=0&&p.point[1]<=height-6);
  const groups=groupUsIndustryPoints(positions);
  // Grouping and nearby annotation slots never depend on the selected item.
  // All industry controls and complete statistics stay outside the map.
  const preferred=(g:typeof groups[number])=>g.sites.some(s=>s.id===usMapLabelSitePreference[g.industry])?0:1;
  const seen=new Set<string>(),candidates=[...groups].sort((a,b)=>usMapLabelIndustryOrder.indexOf(a.industry)-usMapLabelIndustryOrder.indexOf(b.industry)||preferred(a)-preferred(b));
  const noteText=(g:typeof groups[number])=>`${usMapIndustryLabel(g.industry)} · ${usMapPlaceLabel(g.sites[0])}${g.sites.every(s=>s.status==='planned')?'（計画）':g.sites.every(s=>s.status==='registered')?'（登録）':''}`;
  const inputs=candidates.filter(g=>{if(seen.has(g.industry))return false;seen.add(g.industry);return true;}).map(g=>{
   const label=noteText(g);
   return {id:g.id,anchor:g.anchor,width:Math.min(230,Math.max(60,label.length*10.5+6))};
  });
  const layoutKey=[state.sector,width,height,...camera()].join(':');if(cachedLayout?.key!==layoutKey)cachedLayout={key:layoutKey,boxes:layoutUsIndustryLabels(inputs,width,height)};
  const layout=cachedLayout.boxes,points=svg('svg',{width:'100%',height:'100%','aria-label':'確認した集積地域・施設状態'});points.classList.add('us-industry-points');
  overlay.replaceChildren(points);
  for(const box of layout){const g=groups.find(g=>g.id===box.id)!,anchor=box.anchor,x=Math.max(box.left,Math.min(box.left+box.width,anchor[0])),y=Math.max(box.top,Math.min(box.top+box.height,anchor[1]));if(state.only&&g.industry!==state.industry)continue;if(Math.hypot(x-anchor[0],y-anchor[1])>4)points.append(svg('line',{'data-us-label-guide':g.id,x1:anchor[0],y1:anchor[1],x2:x,y2:y,stroke:'#62746b','stroke-width':.7,opacity:state.industry&&state.industry!==g.industry?'.2':'.45','pointer-events':'none'}));}
  for(const g of groups){
   const site=g.sites[0],[px,py]=g.anchor,peers=groups.filter(p=>p.anchor.join(',')===g.anchor.join(',')),index=peers.findIndex(p=>p.id===g.id),angle=index*Math.PI*2/peers.length;
   const x=px+(peers.length>1?Math.cos(angle)*8:0),y=py+(peers.length>1?Math.sin(angle)*8:0),item=usIndustryById(g.industry)!;
   const groupedStatus=g.sites.every(s=>s.status===site.status)?site.status:'mixed',selected=g.sites.some(s=>s.id===state.site);
   const group=svg('g',{'data-us-site':site.id,'data-us-sites':JSON.stringify(g.sites.map(s=>s.id)),'data-industry':g.industry,'data-coordinate':site.coordinates.join(','),'data-source-coordinates':JSON.stringify(g.sites.map(s=>s.coordinates)),'data-status':groupedStatus,role:'button',tabindex:state.only&&state.industry!==g.industry?-1:0,'aria-label':`${item.label} · ${g.sites.map(s=>`${s.place} · ${s.stage} · ${status[s.status]}`).join('／')}${g.sites.length>1?` · 確認例${g.sites.length}件（工場数ではない）`:''}`,'aria-pressed':String(selected)});
   group.classList.add('us-industry-pin');if(state.only&&state.industry!==site.industry)group.style.display='none';
   else if(state.industry&&state.industry!==site.industry)group.setAttribute('opacity','.38');
   group.append(svg('circle',{cx:x,cy:y,r:12,fill:'transparent'}));
   const attrs={fill:groupedStatus==='planned'||groupedStatus==='registered'?'#fffef5':item.color,stroke:item.color,'stroke-width':1.5};
   group.append(groupedStatus==='planned'||groupedStatus==='registered'?svg('path',{d:`M${x},${y-5}L${x+5},${y}L${x},${y+5}L${x-5},${y}Z`,...attrs}):groupedStatus==='operating'?svg('rect',{x:x-4,y:y-4,width:8,height:8,...attrs}):svg('circle',{cx:x,cy:y,r:g.sites.length>1?6:4,...attrs}));
   if(g.sites.length>1){const count=svg('text',{x,y:y+3,'text-anchor':'middle','aria-hidden':'true'});count.classList.add('us-industry-point-count');count.textContent=String(g.sites.length);group.append(count);}
   if(state.industry===g.industry)group.append(svg('circle',{cx:x,cy:y,r:9,fill:'none',stroke:item.color,'stroke-width':selected?3:1.2,'pointer-events':'none'}));
   const title=svg('title',{});title.textContent=g.sites.map(s=>`${item.label}｜${s.place}｜${s.scale??'地域規模の同一定義値は未収録'}｜${status[s.status]}`).join('\n');group.append(title);
   group.addEventListener('click',()=>chooseSite(site));group.addEventListener('keydown',e=>{const event=e as KeyboardEvent;if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseSite(site);}});points.append(group);
  }
  for(const box of layout){
   const g=groups.find(g=>g.id===box.id)!,item=usIndustryById(g.industry)!,note=el('span',noteText(g));note.className='us-industry-map-label';note.dataset.usMapLabel=g.id;note.dataset.industry=g.industry;
   note.title=g.sites.map(s=>`${item.label} · ${s.place} · ${s.stage} · ${status[s.status]}`).join('／');note.style.cssText=`left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;--us-color:${item.color}`;
   if(state.only&&g.industry!==state.industry)note.hidden=true;else if(state.industry&&g.industry!==state.industry)note.classList.add('is-context');
   overlay.append(note);
  }
  overlay.dataset.layout=JSON.stringify(layout);
  overlay.dataset.labelBudget=String(usMapLabelBudget(width));overlay.dataset.sector=state.sector;overlay.dataset.groupCount=String(groups.length);overlay.dataset.sourceCount=String(positions.length);
  if(siteFocus)[...overlay.querySelectorAll<SVGElement>('[data-us-sites]')].find(n=>JSON.parse(n.dataset.usSites!).includes(siteFocus))?.focus({preventScroll:true});
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
  const picker=q<HTMLSelectElement>('[data-us-product-select]');
  const all=el('option','この分野の分布') as HTMLOptionElement;all.value='';
  picker.replaceChildren(all,...usSectorIndustryIds(state.sector).map(id=>{const industry=usIndustryById(id)!,option=el('option',industry.label) as HTMLOptionElement;option.value=id;return option;}));picker.value=item?.id??'';
  const supplemental=q<HTMLDetailsElement>('[data-us-supplemental-sector]');if(state.sector==='construction-real-estate')supplemental.open=true;
  q('[data-us-sector="construction-real-estate"]').setAttribute('aria-pressed',String(state.sector==='construction-real-estate'));
  q<HTMLElement>('[data-us-only-wrap]').hidden=!item;q<HTMLInputElement>('[data-us-only]').checked=state.only;q<HTMLElement>('[data-us-clear]').hidden=!item;
  q<HTMLElement>('[data-us-site-reading]').hidden=!site;
  if(site){set('[data-us-site-title]',`${site.place} · ${site.stage}`);set('[data-us-site-copy]',site.reading);set('[data-us-site-scale]',site.scale??'地域規模の同一定義値は未収録。記号は数量を表しません。');set('[data-us-site-scope]',`${status[site.status]} · ${site.period} · ${site.scope}`);q('[data-us-site-sources]').replaceChildren(...site.sources.map(link));}
  const list=q('[data-us-site-list]');list.replaceChildren();for(const s of sites){const button=el('button',`${s.place} · ${s.stage}`) as HTMLButtonElement;button.type='button';button.dataset.usSiteOption=s.id;button.setAttribute('aria-pressed',String(s.id===state.site));button.addEventListener('click',()=>chooseSite(s));list.append(button);}
  const sourceIds=[...new Set((item?item.metrics.map(m=>m.source):[]).concat(sites.flatMap(s=>s.sources)))];q('[data-us-product-sources]').replaceChildren(...sourceIds.map(link));set('[data-us-product-scope]',item?.why??'統計と位置はそれぞれの一次資料の年・範囲で示す。集積案内・稼働・登録・計画と企業本社を区別する。');
  const key=q('[data-us-key]');key.replaceChildren();for(const id of usSectorIndustryIds(state.sector)){const i=usIndustryById(id)!,label=el('span',i.label);label.dataset.usKey=id;label.style.setProperty('--us-color',i.color);key.append(label);}
  // Original published charts remain separate from the new narrow product metrics.
  root.querySelectorAll<HTMLElement>('[data-industry-national-panel]').forEach(p=>p.hidden=p.dataset.industryNationalPanel!=='all'&&p.dataset.industryNationalPanel!==state.sector);
  root.querySelectorAll<HTMLElement>('[data-industry-detail]').forEach(p=>p.hidden=p.dataset.industryDetail!=='all:all'&&p.dataset.industryDetail!==`${item?.legacy?item.sector:state.sector}:${item?.legacy??'all'}`);
  statistics();renderMap();root.dataset.renderState='ready';set('[data-us-live]',`${item?.label??sector.label}の分布・解説・統計を表示しました。`);
 }
 const sector=(id:string)=>{state={...state,sector:id as UsSector,industry:null,site:null,only:false};save();};
 root.querySelectorAll<HTMLElement>('[data-us-sector]').forEach(button=>button.addEventListener('click',()=>sector(button.dataset.usSector!)));
 q<HTMLSelectElement>('[data-us-product-select]').addEventListener('change',event=>chooseIndustry((event.target as HTMLSelectElement).value||null));
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
