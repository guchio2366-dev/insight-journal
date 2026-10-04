import {industrySectors, industrySubsectors, type IndustrySector} from './industry-catalog.ts';
import type {IndustryTopic} from './asia-industry';
export {industrySectors, industrySubsectors};
export const majorAsiaIndustries:Record<string,{id:string;label:string}[]>={
 'east-asia':[{id:'manufacturing',label:'製造業全体'},{id:'jp-31',label:'輸送用機械（日本）'},{id:'jp-28',label:'電子部品（日本）'},{id:'cn-steel',label:'鉄鋼（中国）'},{id:'power-all',label:'電力'},{id:'services',label:'サービス業'}],
 'southeast-asia':[{id:'manufacturing',label:'製造業'},{id:'my-p2',label:'鉱業（マレーシア）'},{id:'power-all',label:'電力'},{id:'services',label:'サービス業'}],
 'south-central-asia':[{id:'manufacturing',label:'製造業'},{id:'steel-capacity',label:'鉄鋼'},{id:'resource-rents',label:'天然資源'},{id:'power-all',label:'電力'},{id:'services',label:'サービス業'}],
};
export function industryTopicGroup(t:Pick<IndustryTopic,'id'>):{sector:IndustrySector;subsector:string} {
 const id=t.id;
 if(id.startsWith('power-'))return {sector:'resources',subsector:'utilities'};
 if(id==='resource-rents'||id==='my-p2')return {sector:'resources',subsector:id==='my-p2'?'mining':'all'};
 if(['services','service-employment','in-services','my-p5'].includes(id))return {sector:'services',subsector:'all'};
 if(id==='my-p4')return {sector:'construction-real-estate',subsector:'construction'};
 const jp:Record<string,string>={'09':'food','10':'food','16':'chemicals','17':'chemicals','18':'chemicals','19':'chemicals','22':'metals','23':'metals','24':'metals','25':'machinery','26':'machinery','27':'machinery','28':'electronics','29':'electronics','30':'electronics'};
 if(id.startsWith('jp-'))return {sector:'manufacturing',subsector:jp[id.slice(3)]??(['00','31'].includes(id.slice(3))?'all':'other-manufacturing')};
 if(['cn-steel','steel-capacity'].includes(id))return {sector:'manufacturing',subsector:'metals'};
 if(['manufacturing','my-p3','in-manufacturing'].includes(id))return {sector:'manufacturing',subsector:'all'};
 // Economy-wide employment and trade measures are not separate industries.
 return {sector:'all',subsector:'all'};
}
export function populationGroup(topic:string){
 if(/religion/.test(topic))return 'religion';
 if(/nationality|ethnicity|citizenship|language/.test(topic))return 'identity';
 if(/age|growth/.test(topic))return 'distribution';
 return 'distribution';
}
export const populationGroups=[{id:'distribution',label:'人口分布'},{id:'identity',label:'人種・民族'},{id:'religion',label:'宗教'}];
export const naturalGroups=[{id:'climate',label:'気候区分'},{id:'water',label:'水資源'},{id:'landform',label:'地形'},{id:'terrain',label:'標高（等高線）'}];
export const naturalGroup=(topic:string)=>['precipitation','seasonal-precipitation','basins','groundwater'].includes(topic)?'water':topic;
