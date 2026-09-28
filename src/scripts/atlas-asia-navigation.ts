import {industryTopicGroup,industrySectors,industrySubsectors,naturalGroup,populationGroup} from '../data/atlas/asia-navigation.ts';
import type {IndustryRegion} from '../data/atlas/asia-industry';
import type {AsiaState} from '../lib/atlas-asia-state';
import type {IndustrySector} from '../data/atlas/industry-catalog';
export function createAsiaNavigation(root:HTMLElement,industry:IndustryRegion|undefined,getState:()=>AsiaState,navigate:(s:AsiaState,fit?:boolean)=>void,choosePopulation:(topic:string)=>void,chooseNatural:(topic:string)=>void,chooseFarm:(topic:string)=>void){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s);
 const all=<T extends HTMLElement=HTMLElement>(s:string)=>[...root.querySelectorAll<T>(s)];
 for(const b of all('[data-natural-group]'))b.addEventListener('click',()=>chooseNatural(b.dataset.naturalGroup!));
 for(const b of all('[data-population-group]'))b.addEventListener('click',()=>{if(b.dataset.topic)choosePopulation(b.dataset.topic);});
 for(const b of all('[data-population-choice]'))b.addEventListener('click',()=>choosePopulation(b.dataset.populationChoice!));
 for(const b of all('[data-farm-choice]'))b.addEventListener('click',()=>chooseFarm(b.dataset.farmChoice!));
 function selectIndustry(sector:IndustrySector,subsector:string){
  const state=getState(),matches=industry?.topics.filter(t=>{const group=industryTopicGroup(t);return group.sector===sector&&(subsector==='all'||group.subsector===subsector);})??[];
  const current=matches.find(t=>t.id===state.topic),target=current??matches.find(t=>!t.country)??matches[0];
  // A transport-equipment total, for example, is not an automobile-only map.
  navigate({...state,sector,subsector,topic:target?.id??state.topic,detail:target&&target.id!==state.topic?null:state.detail,place:target?.country??state.place,camera:target?.country&&target.country!==state.place?null:state.camera,point:target&&target.id!==state.topic?null:state.point,story:null},!!target?.country&&target.country!==state.place);
 }
 for(const b of all('[data-industry-sector]'))b.addEventListener('click',()=>selectIndustry(b.dataset.industrySector as IndustrySector,'all'));
 for(const b of all('[data-industry-subsector]'))b.addEventListener('click',()=>selectIndustry(b.dataset.sector as IndustrySector,b.dataset.industrySubsector!));
 function render(){
  const state=getState(),natural=naturalGroup(state.topic??'climate');
  for(const b of all('[data-natural-group]'))b.setAttribute('aria-pressed',String(b.dataset.naturalGroup===natural));
  const water=$('[data-water-topics]');if(water)water.hidden=state.field!=='natural'||!['water','precipitation'].includes(natural);
  const kinds=$('[data-water-kinds]');if(kinds)kinds.hidden=state.field!=='natural'||!['water','groundwater'].includes(state.topic??'');
  for(const b of all('[data-water-view]'))b.setAttribute('aria-pressed',String(b.dataset.waterView===(state.topic==='groundwater'?'water':state.topic)));
  for(const a of all<HTMLAnchorElement>('[data-focus-link]')){
   const url=new URL(a.href);url.pathname=url.pathname.replace(/\/(nature|agriculture|industry|population)\/$/,'/'+({natural:'nature',agriculture:'agriculture',industry:'industry',population:'population'}[state.field])+'/');
   url.search='';if(state.topic)url.searchParams.set('topic',state.topic);if(state.overlay)url.searchParams.set('overlay',state.overlay);a.href=url.href;
  }
  const population=populationGroup(state.topic??'density');
  for(const b of all('[data-population-group]'))b.setAttribute('aria-pressed',String(b.dataset.populationGroup===population));
  for(const nav of all('[data-population-subgroup]'))nav.hidden=nav.dataset.populationSubgroup!==population;
  for(const b of all('[data-population-choice]'))b.setAttribute('aria-pressed',String(b.dataset.populationChoice===(state.topic??'density')));
  const populationSelect=$('[data-population-selector]');if(populationSelect)populationSelect.hidden=true;
  const navigation=$('[data-industry-navigation]');if(navigation)navigation.hidden=state.field!=='industry';
  if(!industry||state.field!=='industry')return;
  const current=industry.topics.find(t=>t.id===state.topic)??industry.topics[0],group=industryTopicGroup(current);
  const sector=(state.sector??group.sector) as IndustrySector,subsector=state.subsector??(state.sector?'all':group.subsector);
  for(const b of all('[data-industry-sector]'))b.setAttribute('aria-pressed',String(b.dataset.industrySector===sector));
  for(const row of all('[data-industry-subsectors]'))row.hidden=row.dataset.industrySubsectors!==sector;
  for(const b of all('[data-industry-subsector]'))b.setAttribute('aria-pressed',String(b.dataset.sector===sector&&b.dataset.industrySubsector===subsector));
  const title=$('[data-industry-navigation-label]');if(title)title.textContent=(industrySectors.find(s=>s.id===sector)?.label??'全産業')+(sector==='all'?'':' ／ '+(industrySubsectors[sector].find(s=>s.id===subsector)?.label??'全分野'));
  const currentMap=$('[data-industry-current-map]');if(currentMap)currentMap.textContent=current.title;
  const note=$('[data-industry-navigation-note]');if(note){const matches=sector==='all'||sector===group.sector&&(subsector==='all'||subsector===group.subsector);note.hidden=matches;note.textContent=`選択した分野だけを示す地図は未収録です。現在の地図は「${current.title}」を表示しています。`;}
 }
 return {render};
}
