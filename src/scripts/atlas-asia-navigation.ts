import {industryTopicGroup,industrySectors,industrySubsectors,naturalGroup,populationGroup} from '../data/atlas/asia-navigation.ts';
import {eastIndustryCountries,isEastIndustryRegion,industryTopicsForPlace,type IndustryRegion} from '../data/atlas/asia-industry.ts';
import type {AsiaState} from '../lib/atlas-asia-state';
import type {IndustrySector} from '../data/atlas/industry-catalog';
export function createAsiaNavigation(root:HTMLElement,industry:IndustryRegion|undefined,getState:()=>AsiaState,navigate:(s:AsiaState,fit?:boolean)=>void,choosePopulation:(topic:string)=>void,chooseNatural:(topic:string)=>void,chooseFarm:(topic:string)=>void){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s);
 const all=<T extends HTMLElement=HTMLElement>(s:string)=>[...root.querySelectorAll<T>(s)];
 for(const b of all('[data-natural-group]'))b.addEventListener('click',()=>chooseNatural(b.dataset.naturalGroup!));
 for(const b of all('[data-population-group]'))b.addEventListener('click',()=>{if(b.dataset.topic)choosePopulation(b.dataset.topic);});
 for(const b of all('[data-population-choice]'))b.addEventListener('click',()=>choosePopulation(b.dataset.populationChoice!));
 for(const b of all('[data-farm-choice]'))b.addEventListener('click',()=>chooseFarm(b.dataset.farmChoice!));
 for(const b of all('[data-farm-group-topic]'))b.addEventListener('click',()=>{if(b.dataset.farmGroupTopic)chooseFarm(b.dataset.farmGroupTopic);});
 const east=!!industry&&isEastIndustryRegion(industry);
 for(const b of all('[data-industry-country]'))b.addEventListener('click',()=>{
  if(!industry||!east)return;
  const state=getState(),place=b.dataset.industryCountry==='all'?null:b.dataset.industryCountry!;
  if(place&&!eastIndustryCountries.some(c=>c.code===place))return;
  const same=place===state.place,topics=industryTopicsForPlace(industry,place);
  const current=topics.find(t=>t.id===state.topic&&(!!place||!t.country)),target=current??topics.find(t=>t.id==='manufacturing')??topics[0];
  const keepDetail=same||target.kind==='trade'&&target.id===state.topic;
  navigate({...state,field:'industry',place,topic:target.id,sector:null,subsector:null,detail:keepDetail?state.detail:null,point:same?state.point:null,city:null,camera:same?state.camera:null,story:null},!same);
 });
 for(const b of all('[data-industry-reading-topic]'))b.addEventListener('click',()=>{const s=getState(),t=industry?.topics.find(t=>t.id===b.dataset.industryReadingTopic);if(t)navigate({...s,field:'industry',topic:t.id,detail:b.dataset.industryReadingDetail??null,sector:null,subsector:null,point:null,city:null,camera:s.camera},false);});
 function selectIndustry(sector:IndustrySector,subsector:string){
  const state=getState(),matches=industry?industryTopicsForPlace(industry,state.place).filter(t=>{const group=industryTopicGroup(t);return group.sector===sector&&(subsector==='all'||group.subsector===subsector);}):[];
  const current=matches.find(t=>t.id===state.topic),featured=subsector==='all'?all('[data-industry-feature]:not([data-industry-current-feature])').filter(b=>!b.hidden).map(b=>matches.find(t=>t.id===b.dataset.industryFeature)).find(Boolean):undefined,target=featured??current??matches.find(t=>!t.country)??matches[0];
  // A transport-equipment total, for example, is not an automobile-only map.
  navigate({...state,sector,subsector,topic:target?.id??state.topic,detail:target&&target.id!==state.topic?null:state.detail,place:target?.country??state.place,camera:target?.country&&target.country!==state.place?null:state.camera,point:target&&target.id!==state.topic?null:state.point,story:null},!!target?.country&&target.country!==state.place);
 }
 for(const b of all('[data-industry-sector]'))b.addEventListener('click',()=>selectIndustry(b.dataset.industrySector as IndustrySector,'all'));
 for(const b of all('[data-industry-subsector]'))b.addEventListener('click',()=>selectIndustry(b.dataset.sector as IndustrySector,b.dataset.industrySubsector!));
 for(const b of all('[data-industry-feature]'))b.addEventListener('click',()=>{
  const t=industry?.topics.find(t=>t.id===b.dataset.industryFeature);if(!t)return;
  const s=getState();if(east&&s.place&&t.country&&t.country!==s.place)return;
  const place=t.country??(east?s.place:null),fit=!!place&&place!==s.place;navigate({...s,topic:t.id,sector:null,subsector:null,detail:null,city:null,point:null,place,camera:fit?null:s.camera},fit);
 });
 function render(){
  const state=getState(),natural=naturalGroup(state.topic??'climate');
  const farms=$('[data-agriculture-topics]');if(farms)farms.hidden=state.field!=='agriculture';
  for(const b of all('[data-farm-group]'))b.setAttribute('aria-pressed',String(b.dataset.farmGroup==='forestry'?state.topic===b.dataset.farmGroupTopic:state.topic!==all('[data-farm-group="forestry"]')[0]?.dataset.farmGroupTopic));
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
  const populationSelect=$('[data-population-selector]');if(populationSelect)populationSelect.hidden=state.field!=='population';
  const populationScope=$('[data-population-scope]');if(populationScope)populationScope.hidden=state.field!=='population'||!['density','urban'].includes(state.topic??'density');
  const navigation=$('[data-industry-navigation]');if(navigation)navigation.hidden=state.field!=='industry';
  const advanced=$('[data-industry-all]');if(advanced)advanced.hidden=state.field!=='industry';
  if(!industry||state.field!=='industry')return;
  const topics=industryTopicsForPlace(industry,state.place);
  for(const b of all('[data-industry-country]'))b.setAttribute('aria-pressed',String(b.dataset.industryCountry===(state.place??'all')));
  const scope=$('[data-industry-country-scope]');if(scope)scope.textContent=state.place?`${eastIndustryCountries.find(c=>c.code===state.place)?.name??state.place}の産業。主題と施設はこの国に絞っています。「東アジア全体」で地域の比較へ戻れます。`:'東アジア全体の産業を比較しています。中国・日本・韓国・台湾を選ぶと、その国の収録主題へ進めます。';
  for(const b of all('[data-industry-feature]:not([data-industry-current-feature])'))b.hidden=!topics.some(t=>t.id===b.dataset.industryFeature);
  const selector=$<HTMLSelectElement>('[data-industry-topic]');if(selector){for(const o of [...selector.options]){o.hidden=!topics.some(t=>t.id===o.value);o.disabled=o.hidden;}for(const group of [...selector.querySelectorAll('optgroup')])group.hidden=[...group.children].every(o=>(o as HTMLOptionElement).hidden);}
  for(const b of all('[data-industry-feature]'))b.setAttribute('aria-pressed',String(b.dataset.industryFeature===(state.topic??'manufacturing')));
  const current=industry.topics.find(t=>t.id===state.topic)??industry.topics[0],group=industryTopicGroup(current);
  const sector=(state.sector??group.sector) as IndustrySector,subsector=state.subsector??(state.sector?'all':group.subsector);
  for(const b of all('[data-industry-sector]'))b.setAttribute('aria-pressed',String(b.dataset.industrySector===sector));
  for(const row of all('[data-industry-subsectors]')){
   row.hidden=row.dataset.industrySubsectors!==sector;
   const currentFeature=row.querySelector<HTMLButtonElement>('[data-industry-current-feature]');
   if(currentFeature){const listed=[...row.querySelectorAll<HTMLElement>('[data-industry-feature]:not([data-industry-current-feature])')].some(b=>b.dataset.industryFeature===current.id);currentFeature.hidden=row.hidden||listed||group.sector!==sector;currentFeature.dataset.industryFeature=currentFeature.hidden?'':current.id;currentFeature.textContent=current.title;currentFeature.setAttribute('aria-pressed','true');}
  }
  for(const b of all('[data-industry-subsector]'))b.setAttribute('aria-pressed',String(b.dataset.sector===sector&&b.dataset.industrySubsector===subsector));
  const title=$('[data-industry-navigation-label]');if(title)title.textContent=(industrySectors.find(s=>s.id===sector)?.label??'全産業')+(sector==='all'?'':' ／ '+(industrySubsectors[sector].find(s=>s.id===subsector)?.label??'全分野'));
  const currentMap=$('[data-industry-current-map]');if(currentMap)currentMap.textContent=current.title;
  const note=$('[data-industry-navigation-note]');if(note){const matches=sector==='all'||sector===group.sector&&(subsector==='all'||subsector===group.subsector);note.hidden=matches;note.textContent=`選択した分野だけを示す地図は未収録です。現在の地図は「${current.title}」を表示しています。`;}
 }
 return {render};
}
