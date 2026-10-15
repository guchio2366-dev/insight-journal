import {ruIndustries,ruSites,type RuSector,type RuSite} from '../data/atlas/russia-industry-catalog';
import {projectRussia,russiaWidth,russiaHeight} from './atlas-russia-geometry';
import {ruMapLabelSpecs} from '../data/atlas/russia-industry-map-labels';
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
export type RuLabel={id:string;industries:string[];box:[number,number,number,number];anchor:[number,number];place:string;title:string};
const textWidth=(text:string,size:number)=>[...text].reduce((n,c)=>n+size*(/[\x20-\x7e]/.test(c)?.61:1),0);
export function layoutRuIndustryLabels(sector:RuSector,width:number,height:number):RuLabel[]{
 const points=groupRuPoints(sector,width,height),occupied=points.map(g=>[g.point[0]-13,g.point[1]-13,g.point[0]+13,g.point[1]+13]);
 const out:RuLabel[]=[],covered=new Set<string>(),remaining=[...ruMapLabelSpecs[sector]];
 const limit=sector==='services'?10:width<900?10:12;
 while(remaining.length&&out.length<limit){
  // Cover distinct industries first, then add geographic examples. Selection is never an input.
  remaining.sort((a,b)=>Number(b.industries.some(id=>!covered.has(id)))-Number(a.industries.some(id=>!covered.has(id)))||b.priority-a.priority);
  const spec=remaining.shift()!,group=points.find(g=>g.sites.some(s=>s.id===spec.site));if(!group)continue;
  const anchor=group.point,[a,b]=anchor,w=Math.ceil(Math.max(textWidth(spec.title,12),textWidth(spec.place,10)))+4,h=29;
  let best:[number,number,number,number]|null=null,score=Infinity;
  const candidates=[18,30].flatMap(d=>[[a+d,b-h/2],[a-w-d,b-h/2],[a-w/2,b-h-d],[a-w/2,b+d],[a+d,b-h-6],[a-w-d,b-h-6],[a+d,b+6],[a-w-d,b+6]]);
  for(const [x,y] of candidates){
   const b:[number,number,number,number]=[x,y,x+w,y+h];
   if(x<6||y<6||x+w>width-6||y+h>height-6||occupied.some(a=>b[0]<a[2]+4&&b[2]>a[0]-4&&b[1]<a[3]+4&&b[3]>a[1]-4))continue;
   const d=Math.hypot(x+w/2-anchor[0],y+h/2-anchor[1]);if(d<score){score=d;best=b;}
  }
  // Leave the sourced marker and list entry intact if a nearby annotation cannot fit.
  if(!best)continue;
  occupied.push(best);spec.industries.forEach(id=>covered.add(id));out.push({id:spec.site,industries:spec.industries,box:best,anchor,place:spec.place,title:spec.title});
 }
 return out;
}
