import {industrySectors,sectorLabel,subsectorLabel,type IndustrySector} from '../data/atlas/industry-catalog';
import {readIndustryState,writeIndustryState,type IndustryState} from '../lib/atlas-industry-state';
import type {IndustryRegion} from '../data/atlas/industry-regions';

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
  function renderMarkers(){
    markers.hidden=!hooks.active();if(!hooks.active())return;
    const project=projection(),all=visible(),places=new Map<string,IndustryRegion[]>();
    for(const r of all){if(!places.has(r.placeId))places.set(r.placeId,[]);places.get(r.placeId)!.push(r);}
    let groups=[...places.values()].filter(rs=>state.sector!=='all'||rs.some(r=>r.overview)).map(rs=>({...project(rs[0].coordinates),regions:rs})).filter(p=>p.x>=12&&p.y>=12&&p.x<=frame.clientWidth-12&&p.y<=frame.clientHeight-30);
    // Merge overlapping hit/label rectangles. Keep the cluster anchored at an actual representative point.
    const width=frame.clientWidth<650?92:120,height=48;
    for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)if(Math.abs(groups[i].x-groups[j].x)<width&&Math.abs(groups[i].y-groups[j].y)<height){groups[i].regions.push(...groups[j].regions);groups.splice(j--,1);}
    const nextSignature=groups.map(g=>g.regions.map(r=>r.id).join(',')).join('|');
    if(nextSignature!==signature){
      const focused=(document.activeElement as HTMLElement)?.dataset.industryMarker;
      markers.replaceChildren();signature=nextSignature;
      for(const group of groups){
        const button=document.createElement('button');button.type='button';button.className='industry-marker';button.dataset.industryMarker=group.regions[0].id;
        const names=[...new Set(group.regions.map(r=>r.name))],sector=industrySectors.find(s=>s.id===group.regions[0].sector)!;
        button.style.setProperty('--industry-color',sector.color);
        const dot=document.createElement('i');dot.textContent=group.regions.length>1?String(group.regions.length):sector.symbol;dot.setAttribute('aria-hidden','true');
        const label=document.createElement('span');label.textContent=names.length>1?`${names[0]} ほか`:names[0];
        button.append(dot,label);button.setAttribute('aria-label',`${names.join('・')}：${group.regions.length}分野の地域説明`);
        button.addEventListener('click',()=>group.regions.length>1?showCandidates(group.regions):selectRegion(group.regions[0].id));markers.append(button);
      }
      if(focused)markers.querySelector<HTMLButtonElement>(`[data-industry-marker="${focused}"]`)?.focus({preventScroll:true});
    }
    [...markers.children].forEach((node,index)=>{const group=groups[index];(node as HTMLElement).classList.toggle('is-left-label',group.x>frame.clientWidth-width);(node as HTMLElement).style.transform=`translate(${Math.round(group.x-18)}px,${Math.round(group.y-22)}px)`;node.setAttribute('aria-pressed',String(group.regions.some(r=>r.id===state.industryRegion)));});
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
  function showRegion(region:IndustryRegion){hooks.show(region);sourceLink(region);}
  function selectRegion(id:string,push=true){const region=visible().find(r=>r.id===id);if(!region)return;state.industryRegion=id;showRegion(region);renderMarkers();if(push)hooks.changed(true);}
  function setScope(sector:IndustrySector,subsector='all',push=true,insight:string|null=null){
    state=readIndustryState(writeIndustryState(new URL(location.href),{sector,subsector,industryRegion:null,industryInsight:insight}),regions);hooks.hide();render();if(push)hooks.changed(true);
  }
  function render(){
    q('[data-industry-controls]').hidden=!hooks.active();q('[data-industry-key]').hidden=!hooks.active();
    root.dataset.industrySector=state.sector;root.dataset.industrySubsector=state.subsector;
    root.querySelectorAll<HTMLElement>('[data-industry-sector]').forEach(b=>{const active=b.dataset.industrySector===state.sector;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    root.querySelectorAll<HTMLElement>('[data-industry-subtabs]').forEach(p=>p.hidden=p.dataset.industrySubtabs!==state.sector);
    root.querySelectorAll<HTMLElement>('[data-industry-subsector]').forEach(b=>{const active=b.dataset.industrySubsector===state.subsector;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    root.querySelectorAll<HTMLElement>('[data-industry-national-panel]').forEach(p=>p.hidden=p.dataset.industryNationalPanel!==state.sector);
    root.querySelectorAll<HTMLElement>('[data-industry-detail]').forEach(p=>p.hidden=p.dataset.industryDetail!==`${state.sector}:${state.subsector}`);
    root.querySelectorAll<HTMLElement>('[data-industry-insight-card]').forEach(p=>p.classList.toggle('is-selected',p.dataset.industryInsightCard===state.industryInsight));
    q('[data-industry-breadcrumb]').textContent=sectorLabel(state.sector)+(state.sector==='all'?'':` ／ ${subsectorLabel(state.sector,state.subsector)}`);
    q('#industry-detail').setAttribute('aria-labelledby',state.sector==='all'?'industry-sector-all':`industry-sub-${state.sector}-${state.subsector}`);
    const selected=visible();root.querySelectorAll<HTMLElement>('[data-industry-region-option]').forEach(option=>option.hidden=!selected.some(r=>r.id===option.dataset.industryRegionOption));
    q('[data-industry-empty]').hidden=selected.length>0;
    if(hooks.active())q('[data-map-panel]').setAttribute('aria-labelledby',`industry-sector-${state.sector}`);
    if(hooks.active())q('[data-layer-caption]').textContent='産業の代表地域 · 対象年は地域ごとに表示';renderMarkers();
  }
  function wireTabs(selector:string,action:(button:HTMLElement)=>void){
    root.querySelectorAll<HTMLElement>(selector).forEach(button=>{
      button.addEventListener('click',()=>action(button));
      button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const siblings=[...button.parentElement!.querySelectorAll<HTMLElement>('[role=tab]')];const index=event.key==='Home'?0:event.key==='End'?siblings.length-1:(siblings.indexOf(button)+(event.key==='ArrowRight'?1:-1)+siblings.length)%siblings.length;const next=siblings[index];next.focus({preventScroll:true});action(next);const row=next.parentElement!;if(next.offsetLeft<row.scrollLeft)row.scrollLeft=next.offsetLeft;if(next.offsetLeft+next.offsetWidth>row.scrollLeft+row.clientWidth)row.scrollLeft=next.offsetLeft+next.offsetWidth-row.clientWidth;});
    });
  }
  wireTabs('[data-industry-sector]',b=>setScope(b.dataset.industrySector as IndustrySector));
  wireTabs('[data-industry-subsector]',b=>setScope(state.sector,b.dataset.industrySubsector));
  root.querySelectorAll<HTMLElement>('[data-industry-region-option]').forEach(b=>b.addEventListener('click',()=>selectRegion(b.dataset.industryRegionOption!)));
  root.querySelectorAll<HTMLAnchorElement>('[data-industry-jump-sector],[data-industry-agriculture]').forEach(link=>link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(link.dataset.industryJumpSector==='agriculture'||link.hasAttribute('data-industry-agriculture')){hooks.agriculture();return;}setScope(link.dataset.industryJumpSector as IndustrySector,link.dataset.industryJumpSubsector,true,link.dataset.industryInsight??null);q('[data-industry-controls]').scrollIntoView({block:'start'});}));
  q('[data-selection-link]').addEventListener('click',event=>{
    if(!hooks.active()||!state.industryRegion)return;
    const region=regions.find(r=>r.id===state.industryRegion);if(!region)return;
    event.preventDefault();setScope(region.sector,region.subsector);q('#industry-detail').scrollIntoView({block:'start'});q('#industry-detail').focus({preventScroll:true});
  });
  new ResizeObserver(()=>renderMarkers()).observe(frame);
  q<HTMLImageElement>('[data-fallback-image]').addEventListener('load',renderMarkers);
  return {render,renderMarkers,getState:()=>state,setScope,clearSelection:()=>{state.industryRegion=null;renderMarkers();},write:(url:URL)=>writeIndustryState(url,state),restore:()=>{state=readIndustryState(new URL(location.href),regions);render();},restoreSelection:()=>{if(state.industryRegion)selectRegion(state.industryRegion,false);}};
}
