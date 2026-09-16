import {renderIndustryOverview} from './atlas-industry-overview';
import {industryStateComparison,stateEconomyValue,stateEconomyStatus} from '../data/atlas/industry-state-economy';
import {renderStateCircles} from './atlas-industry-state-circles';
import {groupIndustryMarkers,placeIndustryEconomicLabels} from '../lib/atlas-industry-markers';
import {industrySectors,industrySymbol,sectorLabel,subsectorLabel,type IndustrySector} from '../data/atlas/industry-catalog';
import {readIndustryState,writeIndustryState,type IndustryState} from '../lib/atlas-industry-state';
import type {IndustryRegion} from '../data/atlas/industry-regions';

import {industryRegionalComparison,regionalEconomySource,economicCircleRadius} from '../data/atlas/industry-regional-economy';

interface Hooks{active:()=>boolean;project:()=>((p:[number,number])=>{x:number;y:number})|null;changed:(push:boolean)=>void;hide:()=>void;show:(region:IndustryRegion)=>void;agriculture:()=>void}
export function createIndustryController(root:HTMLElement,regions:IndustryRegion[],sources:Record<string,{title:string;url:string}>,hooks:Hooks){
  const q=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
  let state=readIndustryState(new URL(location.href),regions),signature='';
  const markers=q('[data-industry-markers]'),frame=q('[data-map-frame]');
  const visible=()=>regions.filter(r=>(state.sector==='all'||r.sector===state.sector)&&(state.subsector==='all'||r.subsector===state.subsector));
  const projection=()=>{
    const live=hooks.project();if(live)return live;
    // Same 3857 extent and object-fit:contain rectangle as the v3 fallback image.
    const box=q('[data-fallback-image]').getBoundingClientRect(),parent=frame.getBoundingClientRect();
    const width=box.width||frame.clientWidth,height=box.height||frame.clientHeight;
    const ratio=1800/1084,w=Math.min(width,height*ratio),h=w/ratio;
    const left=box.left-parent.left+(width-w)/2,top=box.top-parent.top+(height-h)/2;
    const merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
    return (p:[number,number])=>({x:left+(p[0]+128)/64*w,y:top+(merc(52)-merc(p[1]))/(merc(52)-merc(22))*h});
  };
  const stateComparison=()=>industryStateComparison(state.sector,state.subsector);
  const comparison=()=>stateComparison()?null:industryRegionalComparison(regions,state.sector,state.subsector);
  const money=(value:number)=>(value/1e6).toLocaleString('ja-JP',{maximumFractionDigits:2});
  function renderMarkers(){
    markers.hidden=!hooks.active();if(!hooks.active())return;
    const overviewList=q('[data-industry-overview-list]');overviewList.hidden=true;
    if(state.subsector==='all'){signature='';renderIndustryOverview(markers,frame,overviewList,visible(),projection(),state.industryRegion,rs=>rs.length>1?showCandidates(rs):selectRegion(rs[0].id));return;}
    const focusedState=(document.activeElement as HTMLElement)?.dataset.industryStateMarker;
    markers.querySelector('[data-industry-state-layer]')?.remove();
    markers.dataset.stateEconomy=String(!!stateComparison());
    const project=projection(),all=stateComparison()?[]:visible(),places=new Map<string,IndustryRegion[]>();
    for(const r of all){if(!places.has(r.placeId))places.set(r.placeId,[]);places.get(r.placeId)!.push(r);}
    const projected=[...places.values()].filter(rs=>state.sector!=='all'||rs.some(r=>r.overview)).map(rs=>({...project(rs[0].coordinates),regions:rs})).filter(p=>p.x>=20&&p.y>=24&&p.x<=frame.clientWidth-20&&p.y<=frame.clientHeight-40);
    const economic=comparison();
    // Quantitative circles retain their own location and scale, even when labels overlap.
    const groups=economic?projected.filter(g=>economic.points.slice(0,5).some(p=>p.regionIds.includes(g.regions[0].id))):groupIndustryMarkers(projected,frame.clientWidth),width=frame.clientWidth<650?92:120;
    const nextSignature=`${state.sector}:${state.subsector}:${economic?.max??'fixed'}:`+groups.map(g=>g.regions.map(r=>r.id).join(',')).join('|');
    if(nextSignature!==signature){
      const focused=(document.activeElement as HTMLElement)?.dataset.industryMarker;
      markers.replaceChildren();signature=nextSignature;
      for(const group of groups){
        const button=document.createElement('button');button.type='button';button.className='industry-marker';button.dataset.industryMarker=group.regions[0].id;
        const names=[...new Set(group.regions.map(r=>r.name))],sector=industrySectors.find(s=>s.id===group.regions[0].sector)!;
        button.style.setProperty('--industry-color',sector.color);
        const point=economic?.points.find(p=>p.regionIds.includes(group.regions[0].id));
        const dot=document.createElement('i');
        const fields=new Set(group.regions.map(r=>`${r.sector}:${r.subsector}`));
        dot.textContent=industrySymbol(group.regions[0].sector,group.regions[0].subsector);dot.setAttribute('aria-hidden','true');
        if(point){
          button.classList.add('is-economic');button.classList.toggle('is-small-value',point.radius<10);
          button.style.setProperty('--economic-radius',`${point.radius}px`);button.dataset.economicValue=String(point.value);button.dataset.economicRank=String(point.rank);button.dataset.economicMetro=point.id;
          const leader=document.createElement('b');leader.className='industry-economic-leader';leader.setAttribute('aria-hidden','true');button.append(leader);
          const circle=document.createElement('em');circle.className='industry-economic-circle';circle.setAttribute('aria-hidden','true');circle.style.width=circle.style.height=`${2*point.radius}px`;button.append(circle);
        }else if(economic)button.classList.add('is-unmeasured');
        const label=document.createElement('span');label.textContent=point?point.name:(names.length>1?`${names[0]} ほか`:names[0]);
        button.append(dot,label);
        if(group.regions.length>1){const count=document.createElement('b');count.className='industry-marker-count';count.textContent=String(group.regions.length);count.setAttribute('aria-hidden','true');button.append(count);}
        button.setAttribute('aria-label',point?`${point.name}：${economic!.year}年 ${economic!.label}の付加価値 ${money(point.value)} 十億米ドル、比較対象${economic!.total}都市圏中${point.rank}位`:`${names.join('・')}：${group.regions.length}分野の地域説明${economic?'、比較可能な数値なし':''}`);
        button.addEventListener('click',()=>group.regions.length>1?showCandidates(group.regions):selectRegion(group.regions[0].id));markers.append(button);
      }
      if(focused)markers.querySelector<HTMLButtonElement>(`[data-industry-marker="${focused}"]`)?.focus({preventScroll:true});
    }
    [...markers.children].forEach((node,index)=>{const group=groups[index];(node as HTMLElement).classList.toggle('is-left-label',group.x>frame.clientWidth-width);(node as HTMLElement).style.transform=`translate(${Math.round(group.x-18)}px,${Math.round(group.y-22)}px)`;node.setAttribute('aria-pressed',String(group.regions.some(r=>r.id===state.industryRegion)));});
    if(economic){
      const nodes=[...markers.children] as HTMLElement[];
      const targets=groups.flatMap((g,index)=>{const point=economic.points.find(p=>p.regionIds.includes(g.regions[0].id));if(!point)return [];const label=nodes[index].querySelector('span')!;return [{id:String(index),x:g.x,y:g.y,radius:point.radius,width:label.offsetWidth||90,height:label.offsetHeight||34}];});
      for(const box of placeIndustryEconomicLabels(targets,frame.clientWidth,frame.clientHeight)){
        const index=Number(box.id),group=groups[index],button=nodes[index],label=button.querySelector('span')!;
        label.style.left=`${box.left-Math.round(group.x-18)}px`;label.style.right='auto';label.style.top=`${box.top-Math.round(group.y-22)}px`;label.style.transform='none';
        const endX=Math.max(box.left,Math.min(box.left+box.width,group.x)),endY=Math.max(box.top,Math.min(box.top+box.height,group.y));
        const leader=button.querySelector<HTMLElement>('.industry-economic-leader')!;
        leader.style.width=`${Math.hypot(endX-group.x,endY-group.y)}px`;leader.style.transform=`rotate(${Math.atan2(endY-group.y,endX-group.x)}rad)`;
      }
    }
    renderStateCircles(markers,frame,stateComparison(),project,state.industryState??null,id=>selectState(id));
    if(focusedState)markers.querySelector<HTMLButtonElement>(`[data-industry-state-marker="${focusedState}"]`)?.focus({preventScroll:true});
  }
  function selectState(id:string,push=true){
    const c=stateComparison(),p=c?.rows.find(r=>r.id===id);if(!c||!p)return;
    state.industryRegion=null;state.industryState=id;
    const value=p.value===null?stateEconomyStatus(p.status):`${stateEconomyValue(p.value,c)} ${c.displayUnit}`;
    const rank=c.points.find(r=>r.id===id)?.rank;
    hooks.show({id:`state-${id}`,placeId:`state-${id}`,name:p.name,sector:state.sector,subsector:state.subsector,coordinates:p.coordinates as [number,number],function:`${c.label}の${c.metric}：${value}`,description:`${rank?`公表値のある${c.total}州・DC中${rank}位。`:''}州全体の数値です。円の位置は州内の代表点です。`,source:'washington',scope:'州・DC',year:String(c.year),selectionReason:'州別公式統計',employment:null,lq:null,nationalShare:null,overview:false});
    const holder=q('[data-selection-candidates]');holder.replaceChildren();holder.hidden=false;
    const a=document.createElement('a');a.href=c.sourceInfo.url;a.textContent=c.sourceInfo.title;holder.append(a);
    renderMarkers();if(push)hooks.changed(true);
  }
  function sourceLink(region:IndustryRegion){
    const holder=q('[data-selection-candidates]');holder.hidden=false;
    const anchor=document.createElement('a');anchor.href=sources[region.source].url;anchor.textContent='地域の出典';holder.append(anchor);
  }
  function showCandidates(candidates:IndustryRegion[]){
    state.industryRegion=null;hooks.show({...candidates[0],function:'地域と分野を選択',description:'この周辺に複数の地域・分野があります。読みたい対象を選んでください。',scope:'代表地域',year:'各資料の対象年'});hooks.changed(false);renderMarkers();q('[data-selection-title]').textContent=[...new Set(candidates.map(r=>r.name))].join('・');q('[data-selection-text]').textContent='この地域で読む分野を選んでください。';
    const holder=q('[data-selection-candidates]');holder.replaceChildren();holder.hidden=false;
    for(const region of candidates){const button=document.createElement('button');button.type='button';button.textContent=`${region.name}：${subsectorLabel(region.sector,region.subsector)}`;button.addEventListener('click',()=>{state={...state,sector:region.sector,subsector:region.subsector,industryRegion:region.id};render();showRegion(region);hooks.changed(true);});holder.append(button);}
  }
  function showRegion(region:IndustryRegion){
    hooks.show(region);sourceLink(region);
    const economic=comparison();if(!economic)return;
    const point=economic.points.find(p=>p.regionIds.includes(region.id));
    const box=document.createElement('p');box.className='industry-economic-value';
    box.textContent=point?`${point.name} ／ ${economic.label}の付加価値：${money(point.value)} 十億米ドル（${economic.year}年）。比較対象${economic.total}都市圏中${point.rank}位。公的統計から集計。`:'同じ条件で比較できる都市圏値がないため、規模の比較から除いています。';
    if(point){const link=document.createElement('a');link.href=regionalEconomySource;link.textContent=' BEA郡別GDP';box.append(link);}
    q('[data-selection-candidates]').append(box);
  }
  function renderLegend(){
    const economic=comparison(),c=stateComparison(),holder=q('[data-industry-economic-legend]');holder.replaceChildren();holder.hidden=!economic&&!c;
    if(c){renderStateLegend(holder,c);q('[data-industry-size-note]').hidden=true;return;}
    q('[data-industry-size-note]').hidden=!!economic;
    if(!economic)return;
    const title=document.createElement('p');title.textContent=`円の面積＝${economic.label}の付加価値（${economic.year}年・名目）。同じ分野の比較対象${economic.total}都市圏内。`;
    const key=document.createElement('div');key.className='industry-size-key';
    for(const share of [.25,1]){const value=economic.max*share,item=document.createElement('span'),circle=document.createElement('i');circle.style.width=circle.style.height=`${economicCircleRadius(value,economic.max)*2}px`;circle.setAttribute('aria-hidden','true');item.append(circle,document.createTextNode(`${money(value)} 十億米ドル`));key.append(item);}
    const note=document.createElement('p');note.textContent='公的統計から集計。円は比較対象内の上位5地域まで。全米順位ではありません。円の縮尺は地図を動かしても変わりません。';
    holder.append(title,key,note);
  }
  function renderStateLegend(holder:HTMLElement,c:NonNullable<ReturnType<typeof stateComparison>>){
    const lead=document.createElement('p');lead.className='industry-state-takeaway';
    lead.textContent=`${c.label}の${c.metric}は、${c.points.slice(0,3).map(p=>p.name).join('・')}が公表値の上位です。`;
    const note=document.createElement('p');note.textContent=`${c.year}年｜円の面積＝州の${c.metric}｜公表値のある${c.total}/51州・DC。円は公表値の上位5地域のみ。文字は選択分野の先頭文字。全地域の値は一覧で確認できます。`;
    const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='州別の数値と出典';details.append(summary);
    const scope=document.createElement('p');scope.textContent=`対象：${c.label}（${c.source==='census'?'NAICS':'BEA行'} ${c.codes.join('・')}）。${c.metric==='出荷額'?'出荷額は製品を出荷した金額で、付加価値とは異なります。':'付加価値は生産額から原材料などの中間投入を差し引いた、新たに生み出した価値です。'}秘匿・未収録はゼロと区別しています。縮尺は地図移動で変わりません。`;
    const table=document.createElement('table');table.className='industry-state-table';const caption=document.createElement('caption');caption.textContent=`${c.year}年 ${c.label}の${c.metric}（${c.displayUnit}）`;table.append(caption);
    const head=document.createElement('thead');head.innerHTML='<tr><th scope="col">州・DC</th><th scope="col">金額</th><th scope="col">公表値内順位</th></tr>';table.append(head);
    const body=document.createElement('tbody');
    const rows=[...c.rows].sort((a,b)=>(b.value??-1)-(a.value??-1)||a.id.localeCompare(b.id));
    for(const r of rows){const tr=document.createElement('tr'),th=document.createElement('th'),button=document.createElement('button'),amount=document.createElement('td'),rank=document.createElement('td');th.scope='row';button.type='button';button.textContent=r.name;button.dataset.industryStateOption=r.id;button.addEventListener('click',()=>selectState(r.id));th.append(button);amount.textContent=r.value===null?stateEconomyStatus(r.status):stateEconomyValue(r.value,c);rank.textContent=String(c.points.find(p=>p.id===r.id)?.rank??'—');tr.append(th,amount,rank);body.append(tr);}table.append(body);
    const link=document.createElement('a');link.href=c.sourceInfo.url;link.textContent=c.sourceInfo.title;details.append(scope,table,link);holder.append(lead,note,details);
  }
  function selectRegion(id:string,push=true){const region=visible().find(r=>r.id===id);if(!region)return;state.industryRegion=id;state.industryState=null;showRegion(region);renderMarkers();if(push)hooks.changed(true);}
  function setScope(sector:IndustrySector,subsector='all',push=true,insight:string|null=null){
    state=readIndustryState(writeIndustryState(new URL(location.href),{sector,subsector,industryRegion:null,industryInsight:insight}),regions);hooks.hide();render();if(push)hooks.changed(true);
    if(push&&state.subsector!=='all'){
      q('[data-atlas-live]').textContent=`${subsectorLabel(state.sector,state.subsector)}の解説と統計を表示しました。`;
      const panel=q('[data-industry-description]'),box=panel.getBoundingClientRect();
      if(!window.matchMedia('(min-width:960px) and (min-height:600px)').matches&&(box.top<0||box.top>window.innerHeight-80))panel.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    }
  }
  function render(){
    q('[data-industry-overview-list]').hidden=!hooks.active()||state.subsector!=='all';q('[data-industry-controls]').hidden=!hooks.active();q('[data-industry-key]').hidden=!hooks.active();q('[data-industry-insights]').hidden=!hooks.active();
    root.dataset.industrySector=state.sector;root.dataset.industrySubsector=state.subsector;
    q('[data-industry-national-summary]').hidden=false;q('[data-industry-description]').hidden=false;
    root.querySelectorAll<HTMLElement>('[data-industry-description-panel]').forEach(p=>p.hidden=p.dataset.industryDescriptionPanel!==`${state.sector}:${state.subsector}`);
    q('[data-industry-description]').setAttribute('aria-labelledby',`industry-description-${state.sector}-${state.subsector}`);
    root.querySelectorAll<HTMLElement>('[data-industry-sector]').forEach(b=>{const active=b.dataset.industrySector===state.sector;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    root.querySelectorAll<HTMLElement>('[data-industry-subtabs]').forEach(p=>p.hidden=p.dataset.industrySubtabs!==state.sector);
    root.querySelectorAll<HTMLElement>('[data-industry-subsector]').forEach(b=>{const active=b.dataset.industrySubsector===state.subsector;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    root.querySelectorAll<HTMLElement>('[data-industry-national-panel]').forEach(p=>p.hidden=p.dataset.industryNationalPanel!==state.sector);
    root.querySelectorAll<HTMLElement>('[data-industry-detail]').forEach(p=>p.hidden=p.dataset.industryDetail!==`${state.sector}:${state.subsector}`);
    root.querySelectorAll<HTMLElement>('[data-industry-insight-card]').forEach(p=>p.classList.toggle('is-selected',p.dataset.industryInsightCard===state.industryInsight));
    q('[data-industry-breadcrumb]').textContent=sectorLabel(state.sector)+(state.sector==='all'?'':` ／ ${subsectorLabel(state.sector,state.subsector)}`);
    q('#industry-detail').setAttribute('aria-labelledby',state.sector==='all'?'industry-sector-all':`industry-sub-${state.sector}-${state.subsector}`);
    const selected=visible();root.querySelectorAll<HTMLElement>('[data-industry-region-option]').forEach(option=>option.hidden=!selected.some(r=>r.id===option.dataset.industryRegionOption));
    q('[data-industry-empty]').hidden=selected.length>0||!!stateComparison();
    if(hooks.active())q('[data-map-panel]').setAttribute('aria-labelledby',`industry-sector-${state.sector}`);
    if(hooks.active()){const c=stateComparison();q('[data-layer-caption]').textContent=c?`州別${c.metric} · ${c.year}年`:comparison()?'都市圏の付加価値 · 2024年':'産業の代表地域 · 対象年は地域ごとに表示';}renderLegend();renderMarkers();
  }
  function wireTabs(selector:string,action:(button:HTMLElement)=>void){
    root.querySelectorAll<HTMLElement>(selector).forEach(button=>{
      button.addEventListener('click',()=>action(button));
      button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const siblings=[...button.parentElement!.querySelectorAll<HTMLElement>('[role=tab]')];const index=event.key==='Home'?0:event.key==='End'?siblings.length-1:(siblings.indexOf(button)+(event.key==='ArrowRight'?1:-1)+siblings.length)%siblings.length;const next=siblings[index];next.focus({preventScroll:true});action(next);const row=next.parentElement!;if(next.offsetLeft<row.scrollLeft)row.scrollLeft=next.offsetLeft;if(next.offsetLeft+next.offsetWidth>row.scrollLeft+row.clientWidth)row.scrollLeft=next.offsetLeft+next.offsetWidth-row.clientWidth;});
    });
  }
  wireTabs('[data-industry-sector]',b=>setScope(b.dataset.industrySector as IndustrySector));
  wireTabs('[data-industry-subsector]',b=>setScope(state.sector,b.dataset.industrySubsector));
  root.querySelectorAll<HTMLElement>('[data-industry-overview]').forEach(b=>b.addEventListener('click',()=>setScope(state.sector)));
  q('[data-industry-description]').addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();setScope(state.sector);q(`[data-industry-sector="${state.sector}"]`).focus({preventScroll:true});}});
  root.querySelectorAll<HTMLElement>('[data-industry-region-option]').forEach(b=>b.addEventListener('click',()=>{selectRegion(b.dataset.industryRegionOption!);if(b.hasAttribute('data-industry-reading-place')){const panel=q('[data-map-frame]');panel.scrollIntoView({block:'center'});q('[data-atlas-live]').textContent=`${b.textContent?.replace('を地図で見る','')}を地図で選択しました。`;}}));
  root.querySelectorAll<HTMLAnchorElement>('[data-industry-jump-sector],[data-industry-agriculture]').forEach(link=>link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(link.dataset.industryJumpSector==='agriculture'||link.hasAttribute('data-industry-agriculture')){hooks.agriculture();return;}setScope(link.dataset.industryJumpSector as IndustrySector,link.dataset.industryJumpSubsector,true,link.dataset.industryInsight??null);q('[data-industry-controls]').scrollIntoView({block:'start'});}));
  q('[data-selection-link]').addEventListener('click',event=>{
    if(!hooks.active())return;
    if(state.industryState){event.preventDefault();q('#industry-detail').scrollIntoView({block:'start'});q('#industry-detail').focus({preventScroll:true});return;}
    if(!state.industryRegion)return;
    const region=regions.find(r=>r.id===state.industryRegion);if(!region)return;
    event.preventDefault();setScope(region.sector,region.subsector);q('#industry-detail').scrollIntoView({block:'start'});q('#industry-detail').focus({preventScroll:true});
  });
  new ResizeObserver(()=>renderMarkers()).observe(frame);
  q<HTMLImageElement>('[data-fallback-image]').addEventListener('load',renderMarkers);
  return {render,renderMarkers,getState:()=>state,setScope,clearSelection:()=>{state.industryRegion=null;state.industryState=null;renderMarkers();},write:(url:URL)=>writeIndustryState(url,state),restore:()=>{state=readIndustryState(new URL(location.href),regions);render();},restoreSelection:()=>{if(state.industryState){selectState(state.industryState,false);return;}if(state.industryRegion)selectRegion(state.industryRegion,false);}};
}
