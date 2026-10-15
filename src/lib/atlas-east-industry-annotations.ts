import {boxesOverlap,leaderEnd,lineIntersectsBox,type Box,type Point} from './atlas-nature-labels.ts';
import type {EastSector,EastSectorSite} from '../data/atlas/east-asia-industry-sectors.ts';

export type EastAnnotationSite=EastSectorSite&{screen:Point};
export type EastIndustryAnnotation={id:string;industry:string;anchor:EastAnnotationSite;members:EastAnnotationSite[];place:string};
export type EastAnnotationPlacement=EastIndustryAnnotation&Box&{overview:boolean};
// Geographic annotations, never another set of industry-selection controls.
// The order balances countries and stages; it does not rank output or capacity.
const priorities:Record<EastSector,[string,string][]>= {
 resources:[['coal','ukhaa-khudag'],['coal','zhungeer-coal'],['rareearths','baotou-magnets'],['gas','incheon-lng'],['gas','naoetsu-lng'],['copper','oyu-tolgoi'],['gas','taichung-lng'],['minorMetals','akita-gallium'],['refining','mizushima'],['rareearths','ganzhou-magnets']],
 manufacturing:[['foundry','hsinchu'],['memory','cheongju'],['equipment','koshi-equipment'],['batteries','ningde'],['auto','toyota'],['photovoltaic','shangrao-pv'],['steel','tangshan'],['ships','ulsan'],['soybean','zhangjiagang-soybean'],['packaging','kaohsiung-packaging'],['materials','omura-materials'],['memory','wuxi-memory']],
 services:[['finance','tokyo-finance'],['finance','shanghai-finance'],['logistics','busan-port'],['digital','hangzhou-digital'],['finance','hongkong-finance'],['research','tsinghua-research'],['digital','seongnam-digital'],['logistics','kaohsiung-port'],['design','hsinchu-design']],
};
const shortNames:Record<string,string>={toyota:'中京',kitakyushu:'北九州',osaka:'関西',imabari:'今治',tangshan:'唐山',changzhou:'溧陽',
 'ukhaa-khudag':'南ゴビ','oyu-tolgoi':'オユ・トルゴイ','zhungeer-coal':'准格爾','yokkaichi-memory':'四日市','taiwa-equipment':'大和','nirasaki-equipment':'韮崎','koshi-equipment':'合志','omura-materials':'大村','hsinchu-design':'新竹','taipei-design':'台北','akita-gallium':'秋田',
 'shangrao-pv':'上饒','haining-pv':'海寧','huaping-pv':'華坪','tsinghua-research':'北京','hongo-research':'東京','seoul-research':'ソウル','taipei-research':'台北'};
export const eastAnnotationLimit=(width:number)=>width<650?4:width<1100?8:10;
export const eastAnnotationKindLabel=(industry:string,sector:EastSector,fallback:string)=>industry==='copper'?(sector==='resources'?'銅採掘':'銅製錬'):industry==='minorMetals'?'Ga原料':industry==='power'?'発電':industry==='digital'?'IT':industry==='research'?'研究':fallback;
const name=(s:EastAnnotationSite)=>{const label=shortNames[s.id]??s.name.split('・')[0];return (s.industries.includes('logistics')?label.replace(/港$/,''):label).replace('ウランバートル第4','ウランバートル');};
const km=(a:EastAnnotationSite,b:EastAnnotationSite)=>{
 const radians=Math.PI/180,lat=(a.point[1]+b.point[1])/2*radians;
 return Math.hypot((a.point[0]-b.point[0])*Math.cos(lat),a.point[1]-b.point[1])*111.2;
};
/** Complete-link groups: same industry, same country, <=125 km and <=32 px.
 * No chain across a coastline; original dots, stages and source IDs stay intact.
 * Selection is deliberately absent from the grouping/layout inputs. */
export function groupEastIndustryAnnotations(sites:EastAnnotationSite[],sector:EastSector,industries:string[]):EastIndustryAnnotation[]{
 const priority=priorities[sector],rank=(industry:string,id:string)=>{const i=priority.findIndex(([kind,site])=>kind===industry&&site===id);return i<0?1000:i;};
 const result:EastIndustryAnnotation[]=[];
 for(const industry of industries){
  const groups:EastAnnotationSite[][]=[];
  const rows=sites.filter(s=>s.industries.includes(industry)).sort((a,b)=>rank(industry,a.id)-rank(industry,b.id)||a.id.localeCompare(b.id));
  for(const site of rows){const group=groups.find(g=>g[0].country===site.country&&g.every(member=>km(member,site)<=125&&Math.hypot(member.screen.x-site.screen.x,member.screen.y-site.screen.y)<=32));if(group)group.push(site);else groups.push([site]);}
  for(const members of groups){const anchor=members[0],names=[...new Set(members.map(name))];const pair=names.slice(0,2).join('・');result.push({id:industry+'-'+anchor.id,industry,anchor,members,place:names.length===1?names[0]:pair.length<=9?pair+(names.length>2?'等':''):names[0]+'等'});}
 }
 return result.sort((a,b)=>rank(a.industry,a.anchor.id)-rank(b.industry,b.anchor.id)||a.industry.localeCompare(b.industry)||a.id.localeCompare(b.id));
}

type Measured=EastIndustryAnnotation&{width:number;height:number};
/** Close unboxed text; do not push an annotation far inland to make it fit. */
export function placeEastIndustryAnnotations(items:Measured[],bounds:Box,obstacles:Box[]):EastAnnotationPlacement[]{
 const limit=eastAnnotationLimit(bounds.right-bounds.left);
 const cache=new Map<string,EastAnnotationPlacement[]>();
 function candidates(item:Measured):EastAnnotationPlacement[]{
  if(cache.has(item.id))return cache.get(item.id)!;
  const anchor=item.anchor.screen,result:EastAnnotationPlacement[]=[];
  for(const dx of [8,-item.width-8,-item.width/2])for(const dy of [-item.height/2,-item.height-8,8,-item.height-18,18]){
   const rect={...item,left:anchor.x+dx,top:anchor.y+dy,right:anchor.x+dx+item.width,bottom:anchor.y+dy+item.height,overview:true};
   const end=leaderEnd(anchor,rect),length=Math.hypot(end.x-anchor.x,end.y-anchor.y);
   if(length<6||length>24||rect.left<bounds.left+3||rect.top<bounds.top+3||rect.right>bounds.right-3||rect.bottom>bounds.bottom-3)continue;
   if(obstacles.some(b=>boxesOverlap(rect,b,3)))continue;
   result.push(rect);
  }
  const length=(rect:Box)=>{const end=leaderEnd(anchor,rect);return Math.hypot(end.x-anchor.x,end.y-anchor.y);};
  result.sort((a,b)=>length(a)-length(b));cache.set(item.id,result);return result;
 }
 const fits=(rect:EastAnnotationPlacement,occupied:EastAnnotationPlacement[])=>!occupied.some(b=>boxesOverlap(rect,b,3)||lineIntersectsBox([rect.anchor.screen,leaderEnd(rect.anchor.screen,rect)],b,2)||lineIntersectsBox([b.anchor.screen,leaderEnd(b.anchor.screen,b)],rect,2));
 // Reserve variety before repeated labels for one kind. Jointly try nearby
 // placements/alternative source groups so an early label cannot crowd out a
 // later industry. The bounded search has no selection-dependent priorities.
 const industries=[...new Set(items.map(i=>i.industry))].slice(0,limit);
 let overview:EastAnnotationPlacement[]=[],visits=0;
 function solve(index:number,placed:EastAnnotationPlacement[]):boolean{
  if(placed.length>overview.length)overview=[...placed];
  if(index===industries.length)return placed.length===industries.length;
  if(++visits>1200)return false;
  for(const item of items.filter(i=>i.industry===industries[index]))for(const rect of candidates(item))if(fits(rect,placed)&&solve(index+1,[...placed,rect]))return true;
  return solve(index+1,placed);
 }
 solve(0,[]);
 for(const item of items){if(overview.length===limit)break;if(overview.some(p=>p.id===item.id))continue;const rect=candidates(item).find(p=>fits(p,overview));if(rect)overview.push(rect);}
 // Single-industry mode can reveal additional, already fixed, geographic names.
 // Retain overview positions, and solve the other groups independently by kind.
 const all=[...overview];
 for(const industry of [...new Set(items.map(i=>i.industry))]){
  const same=overview.filter(p=>p.industry===industry);
  for(const item of items.filter(i=>i.industry===industry&&!overview.some(p=>p.id===i.id))){const rect=candidates(item).find(p=>fits(p,same));if(rect){const placed={...rect,overview:false};same.push(placed);all.push(placed);}}
 }
 return all;
}
