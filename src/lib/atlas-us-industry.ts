import {usIndustries,usIndustrySites,usIndustrySectors,usSectorIndustryIds,type UsSector} from '../data/atlas/us-industry.ts';

export type UsIndustryState={sector:UsSector;industry:string|null;site:string|null;only:boolean;zoom:number;x:number;y:number};
export function readUsIndustryState(url:URL):UsIndustryState{
 const p=url.searchParams,raw=p.get('sector'),sector=(usIndustrySectors.some(s=>s.id===raw)?raw:'resources') as UsSector;
 const old=p.get('subsector'),aliases:Record<string,string>={'oil-gas':'crude-oil',utilities:'power',electronics:'chip-design',chemicals:'petrochemicals',information:'software-cloud','trade-logistics':'logistics',metals:'steel'};
 const requested=p.get('industry')??(old&&old!=='all'?(aliases[old]??old):null),industry=requested&&usSectorIndustryIds(sector).includes(requested)?requested:null;
 const rawSite=p.get('site')??p.get('industryRegion'),site=usIndustrySites.find(s=>(s.id===rawSite||s.id===`${rawSite}-${s.industry}`)&&(!industry||s.industry===industry)&&usSectorIndustryIds(sector).includes(s.industry));
 const number=(key:string,fallback:number)=>{const n=Number(p.get(key));return p.has(key)&&Number.isFinite(n)?n:fallback;};
 return {sector,industry:industry??site?.industry??null,site:site?.id??null,only:p.get('only')==='1'&&!!(industry??site),zoom:Math.max(1,Math.min(3,number('iz',1))),x:Math.max(-2000,Math.min(2000,number('ix',0))),y:Math.max(-1200,Math.min(1200,number('iy',0)))};
}
export function writeUsIndustryState(url:URL,state:UsIndustryState){
 const next=new URL(url);for(const key of ['subsector','industryRegion','industryInsight','industryState'])next.searchParams.delete(key);
 next.searchParams.set('sector',state.sector);
 for(const [key,value] of [['industry',state.industry],['site',state.site],['only',state.only?'1':null],['iz',state.zoom===1?null:String(state.zoom)],['ix',state.x?String(Math.round(state.x)):null],['iy',state.y?String(Math.round(state.y)):null]])if(value)next.searchParams.set(key,value);else next.searchParams.delete(key);
 return next;
}
const merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
export const usMapPanels={main:{bounds:[-125,24,-66,50],box:[5,5,990,515]},alaska:{bounds:[-170,51,-130,72],box:[18,438,170,150]},hawaii:{bounds:[-161,18,-154,23],box:[206,530,115,58]}} as const;
export function projectUsIndustry([lng,lat]:readonly number[],panel:keyof typeof usMapPanels=lat>51?'alaska':lng<-150?'hawaii':'main'):[number,number]{
 const {bounds:[w,s,e,n],box:[x,y,width,height]}=usMapPanels[panel];
 const sx=(e-w)*Math.PI/180,sy=merc(n)-merc(s),scale=Math.min(width/sx,height/sy);
 return [x+(width-sx*scale)/2+(lng-w)*Math.PI/180*scale,y+(height-sy*scale)/2+(merc(n)-merc(lat))*scale];
}
export function usIndustryGeometryPath(geometry:{type:string;coordinates:any},panel:keyof typeof usMapPanels='main'){
 const rings=geometry.type==='Polygon'?geometry.coordinates:geometry.type==='MultiPolygon'?geometry.coordinates.flat():[];
 return rings.map((ring:number[][])=>ring.map((p,i)=>{const [x,y]=projectUsIndustry(p,panel);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join(' ')+'Z').join(' ');
}
export type UsLabelBox={id:string;left:number;top:number;width:number;height:number};
/** Deterministic, selection-independent placement; every industry keeps a label. */
export function layoutUsIndustryLabels(inputs:{id:string;anchor:[number,number];width:number}[],width:number,height:number):UsLabelBox[]{
 const placed:UsLabelBox[]=[];const gap=4,labelHeight=44;
 const collides=(l:number,t:number,w:number)=>placed.some(b=>l<b.left+b.width+gap&&l+w>b.left-gap&&t<b.top+b.height+gap&&t+labelHeight>b.top-gap);
 for(const input of inputs){
  const w=Math.min(input.width,width-12),candidates:[number,number][]=[];
  for(let t=6;t<=height-labelHeight-30;t+=6)for(let l=6;l<=width-w-6;l+=6)if(!(t<46&&l+w>width-145)&&!collides(l,t,w))candidates.push([l,t]);
  candidates.sort((a,b)=>(a[0]+w/2-input.anchor[0])**2+(a[1]+labelHeight/2-input.anchor[1])**2-((b[0]+w/2-input.anchor[0])**2+(b[1]+labelHeight/2-input.anchor[1])**2));
  if(!candidates.length){
   // Dense screens use a complete shelf packing instead of an overlapping
   // last-resort box. Coordinates of the actual industrial points stay intact.
   const rows:{used:number;items:typeof inputs}[]=[];
   for(const item of [...inputs].sort((a,b)=>b.width-a.width||a.id.localeCompare(b.id))){
    const row=rows.find((r,index)=>r.used+item.width+gap<=width-12-(index===0?145:0));
    if(row){row.items.push(item);row.used+=item.width+gap;}else rows.push({used:item.width+gap,items:[item]});
   }
   return rows.flatMap((row,index)=>{let left=6;return row.items.sort((a,b)=>a.anchor[0]-b.anchor[0]||a.id.localeCompare(b.id)).map(item=>{const box={id:item.id,left,top:6+index*(labelHeight+gap),width:item.width,height:labelHeight};left+=item.width+gap;return box;});});
  }
  const [left,top]=candidates[0];placed.push({id:input.id,left,top,width:w,height:labelHeight});
 }
 return placed;
}
export const usIndustryById=(id:string|null)=>usIndustries.find(i=>i.id===id);
