import {southIndustryCatalog,southIndustrySites,type SouthIndustrySite} from './south-asia-major-industries.ts';
import {southIndustryMapSector,southIndustrySectorReadings} from './south-asia-industry-sectors.ts';

export const southIndustryMapBounds=[60,-1,98,39] as const;
const industryNames:Record<string,string>={
 'sc-coal':'石炭','sc-refining':'精製','sc-hydro':'水力','sc-textiles':'繊維・衣料',
 'sc-steel':'鉄鋼','sc-two-wheelers':'二輪車','sc-auto':'乗用車','sc-pharma':'医薬品',
 'sc-tea':'製茶','sc-rice':'精米','sc-it':'IT・業務受託','sc-tourism':'観光',
};
// Label summaries are not new factories, production totals or flows. Anchors
// use existing sites. Every original coordinate and its evidence stays in sites.
const summaries=[
 {anchor:'sc-bhutan-hydro',place:'ブータン',members:['sc-bhutan-hydro','sc-tala-hydro','sc-mangdechhu-hydro']},
 {anchor:'sc-odisha-steel',place:'オディシャ',members:['sc-odisha-steel','sc-meramandali-steel']},
 {anchor:'sc-manesar-two-wheelers',place:'マネサル周辺',members:['sc-manesar-two-wheelers','sc-tapukara-two-wheelers']},
 {anchor:'sc-gurugram-auto',place:'ハリヤーナ',members:['sc-gurugram-auto','sc-manesar-auto','sc-kharkhoda-auto']},
 {anchor:'sc-ahmedabad-pharma',place:'グジャラート',members:['sc-ahmedabad-pharma','sc-ankleshwar-pharma']},
 {anchor:'sc-nuwara-eliya-tea',place:'スリランカ高地',members:['sc-nuwara-eliya-tea','sc-uva-tea']},
] as const;
const priority=[
 'sc-dhaka-garments','sc-odisha-steel','sc-manesar-two-wheelers','sc-gurugram-auto',
 'sc-hyderabad-pharma','sc-nuwara-eliya-tea','sc-dhuri-rice','sc-faisalabad-textiles',
 'sc-thar-coal','sc-odisha-coal','sc-jamnagar-refining','sc-bhutan-hydro','sc-nepal-hydro',
 'sc-bengaluru-it','sc-maldives-tourism','sc-colombo-tourism','sc-pokhara-tourism',
 'sc-hyderabad-it','sc-tiruppur-textiles','sc-assam-tea','sc-chattogram-garments',
];
export type SouthIndustryMapLabel={
 id:string;anchorId:string;siteIds:string[];group:string;country:string;
 industry:string;place:string;point:[number,number];color:string;summary:boolean;
};
export function southIndustryMapView(topic:string|null|undefined,country:string|null=null){
 const sector=southIndustryMapSector(topic),groupIds:readonly string[]=sector.groups;
 const groups=southIndustryCatalog.filter(group=>groupIds.includes(group.id));
 const sites=southIndustrySites.filter(site=>groupIds.includes(site.group)&&(!country||site.country===country));
 const ids=new Set(sites.map(site=>site.id));
 const activeSummaries=summaries.filter(summary=>summary.members.every(id=>ids.has(id)));
 const subordinate=new Set(activeSummaries.flatMap(summary=>summary.members.filter(id=>id!==summary.anchor)));
 const labels:SouthIndustryMapLabel[]=sites.filter(site=>!subordinate.has(site.id)).map(site=>{
  const summary=activeSummaries.find(item=>item.anchor===site.id),group=groups.find(group=>group.id===site.group)!;
  return {id:'south-label-'+site.id,anchorId:site.id,siteIds:summary?[...summary.members]:[site.id],
   group:site.group,country:site.country,industry:industryNames[site.group],
   place:summary?.place??site.name.split('：')[0],point:[...site.point] as [number,number],
   color:group.color,summary:!!summary};
 });
 const rank=(label:SouthIndustryMapLabel)=>{const index=priority.indexOf(label.anchorId);return index<0?100+sites.findIndex(site=>site.id===label.anchorId):index;};
 labels.sort((a,b)=>rank(a)-rank(b));
 return {sector,groupIds,groups,sites,labels,bounds:southIndustryMapBounds,
  reading:southIndustrySectorReadings[sector.id],
  // No sourced transport edges exist here; close text needs no leader lines.
  guides:[] as never[]};
}
export function southIndustrySiteInMap(topic:string|null|undefined,site:Pick<SouthIndustrySite,'group'>){
 return southIndustryMapSector(topic).groups.some(id=>id===site.group);
}
