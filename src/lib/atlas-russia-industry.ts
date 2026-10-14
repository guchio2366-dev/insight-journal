import {ruIndustries,ruSites,type RuSector,type RuSite} from '../data/atlas/russia-industry-catalog';
import {projectRussia,russiaWidth,russiaHeight} from './atlas-russia-geometry';
export type RuIndustryState={sector:RuSector;industry:string|null;site:string|null;only:boolean};
export const sectorIndustries=(sector:RuSector)=>ruIndustries.filter(i=>i.sectors.includes(sector));
export function readRuIndustryState(url:URL):RuIndustryState{
 const p=url.searchParams,raw=p.get('sector'),sector:RuSector=raw==='manufacturing'||raw==='services'?raw:'resources';
 const legacy=ruSites.find(s=>s.id===p.get('industryLocation'));
 const requested=ruIndustries.find(i=>i.id===p.get('industry')&&i.sectors.includes(sector));
 const site=ruSites.find(s=>s.id===(p.get('site')??legacy?.id)&&s.sectors.includes(sector)&&(!requested||s.industries.includes(requested.id)));
 const industry=requested??(site&&ruIndustries.find(i=>site.industries.includes(i.id)&&i.sectors.includes(sector)));
 // Legacy links to a manufacturing or service site keep their intended destination.
 if(legacy&&!raw&&!requested&&!site){const own=legacy.sectors[0];return {sector:own,industry:legacy.industries[0],site:legacy.id,only:false};}
 return {sector,industry:industry?.id??null,site:site?.id??null,only:p.get('only')==='1'&&!!industry};
}
export function writeRuIndustryState(url:URL,state:RuIndustryState):URL{
 const next=new URL(url);for(const key of ['sector','industry','site','only','industryLocation'])next.searchParams.delete(key);
 next.searchParams.set('sector',state.sector);if(state.industry)next.searchParams.set('industry',state.industry);if(state.site)next.searchParams.set('site',state.site);if(state.only&&state.industry)next.searchParams.set('only','1');return next;
}
export function visibleRuSites(sector:RuSector):RuSite[]{return ruSites.filter(s=>s.sectors.includes(sector)&&s.industries.some(id=>sectorIndustries(sector).some(i=>i.id===id)));}
export function ruPoint(site:RuSite,width:number,height:number):[number,number]{const [x,y]=projectRussia(site.coordinates);return [x/russiaWidth*width,y/russiaHeight*height];}
export type RuPointGroup={id:string;sites:RuSite[];point:[number,number]};
/** Near points share a hit target at the FIRST source point; no source coordinate is displaced. */
export function groupRuPoints(sector:RuSector,width:number,height:number):RuPointGroup[]{
 const groups:RuPointGroup[]=[];
 for(const site of visibleRuSites(sector)){const point=ruPoint(site,width,height),group=groups.find(g=>Math.hypot(point[0]-g.point[0],point[1]-g.point[1])<26);if(group)group.sites.push(site);else groups.push({id:site.id,sites:[site],point});}return groups;
}
export type RuLabel={id:string;industry:string;box:[number,number,number,number];anchor:[number,number];place:string};
export function layoutRuIndustryLabels(sector:RuSector,width:number,height:number):RuLabel[]{
 const points=groupRuPoints(sector,width,height),occupied=points.map(g=>[g.point[0]-13,g.point[1]-13,g.point[0]+13,g.point[1]+13]);
 const out:RuLabel[]=[],w=114,h=46;
 for(const industry of sectorIndustries(sector)){
  const site=visibleRuSites(sector).find(s=>s.industries.includes(industry.id))!;
  const group=points.find(g=>g.sites.some(s=>s.id===site.id))!,anchor=group.point;
  let best:[number,number,number,number]|null=null,score=Infinity;
  for(let y=8;y+h<=height-8;y+=8)for(let x=8;x+w<=width-8;x+=8){
   const b:[number,number,number,number]=[x,y,x+w,y+h];
   if(occupied.some(a=>b[0]<a[2]+5&&b[2]>a[0]-5&&b[1]<a[3]+5&&b[3]>a[1]-5))continue;
   const d=Math.hypot(x+w/2-anchor[0],y+h/2-anchor[1]);if(d<score){score=d;best=b;}
  }
  if(!best)throw new Error(`Russia industry label does not fit: ${industry.id} (${width}×${height})`);
  occupied.push(best);out.push({id:industry.id,industry:industry.id,box:best,anchor,place:site.place});
 }
 return out;
}
