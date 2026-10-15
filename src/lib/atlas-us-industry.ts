import {usIndustries,usIndustrySites,usIndustrySectors,usSectorIndustryIds,type UsSector,type UsSite} from '../data/atlas/us-industry.ts';

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
export type UsLabelBox={id:string;left:number;top:number;width:number;height:number;anchor:[number,number]};
export type UsMapGroup={id:string;industry:string;sites:UsSite[];anchor:[number,number]};
/** A group is a screen-space collection of source examples, never a plant count.
 * Its anchor remains one original source position, rather than an invented centroid. */
export function groupUsIndustryPoints(points:{site:UsSite;point:[number,number]}[],radius=16):UsMapGroup[]{
 const groups:UsMapGroup[]=[];
 for(const {site,point} of points){
  const panel=site.coordinates[1]>51?'alaska':site.coordinates[0]<-150?'hawaii':'main';
  const match=groups.find(g=>g.industry===site.industry&&
   (g.sites[0].coordinates[1]>51?'alaska':g.sites[0].coordinates[0]<-150?'hawaii':'main')===panel&&
   Math.hypot(g.anchor[0]-point[0],g.anchor[1]-point[1])<=radius);
  if(match)match.sites.push(site);else groups.push({id:site.id,industry:site.industry,sites:[site],anchor:point});
 }
 return groups;
}
export const usMapLabelIndustryOrder=['crude-oil','natural-gas','power','mining','auto','aerospace','chip-fabrication','petrochemicals','pharma','food','chip-design','refining','chip-equipment','steel','machinery','oilseed-processing','biofuels','medical-devices','chip-packaging','chip-materials','shipbuilding','railway','other-manufacturing','software-cloud','finance','logistics','tourism','professional','health-education','construction','real-estate'];
export const usMapLabelSitePreference:Record<string,string>={'crude-oil':'permian','natural-gas':'appalachia',power:'il-nuclear',refining:'la-refining','software-cloud':'virginia-data',logistics:'la-port'};
export function usMapIndustryLabel(id:string){
 const short:Record<string,string>={power:'発電',mining:'鉱業',auto:'自動車',refining:'精製',pharma:'医薬',food:'食品','natural-gas':'天然ガス','software-cloud':'情報・クラウド',finance:'金融',logistics:'物流',tourism:'観光','oilseed-processing':'搾油',biofuels:'エタノール'};
 return short[id]??usIndustries.find(i=>i.id===id)!.short;
}
export function usMapPlaceLabel(site:UsSite){
 const short:Record<string,string>={'az-packaging-plan':'アリゾナ','mn-devices':'ミネアポリス都市圏','nc-pharma':'研究三角地帯','baytown-chemical-petrochemicals':'ベイタウン','puget-refinery-refining':'ピュージェットサウンド'};
 return short[site.id]??site.place.split(/[／（]/)[0];
}
export function usMapLabelBudget(width:number){return width>=900?8:width>=650?6:width>=500?5:3;}
/** Small annotations stay beside their evidence. If no nearby slot is available,
 * the point remains inspectable and its full information stays outside the map. */
export function layoutUsIndustryLabels(inputs:{id:string;anchor:[number,number];width:number}[],width:number,height:number):UsLabelBox[]{
 const placed:UsLabelBox[]=[],gap=5,labelHeight=18;
 const collides=(l:number,t:number,w:number)=>placed.some(b=>l<b.left+b.width+gap&&l+w>b.left-gap&&t<b.top+b.height+gap&&t+labelHeight>b.top-gap);
 for(const input of inputs){
  if(placed.length>=usMapLabelBudget(width))break;
  const [x,y]=input.anchor,w=Math.min(input.width,width-12);
  const candidates:[number,number][]=[[x+9,y-9],[x+9,y+5],[x-w-9,y-9],[x-w-9,y+5],[x-w/2,y-26],[x-w/2,y+9]];
  const candidate=candidates.find(([l,t])=>l>=6&&l+w<=width-6&&t>=6&&t+labelHeight<=height-32&&
   !(t<48&&l+w>width-150)&&!collides(l,t,w));
  if(candidate)placed.push({id:input.id,left:candidate[0],top:candidate[1],width:w,height:labelHeight,anchor:input.anchor});
 }
 return placed;
}
export const usIndustryById=(id:string|null)=>usIndustries.find(i=>i.id===id);
