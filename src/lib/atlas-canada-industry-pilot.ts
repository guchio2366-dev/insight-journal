import raw from '../data/atlas/canada/industry-pilot.json';
export type PilotSector = 'resources' | 'manufacturing' | 'services';
export type PilotIndustry = {id:string;label:string;color:string;sectors:string[];metrics:Record<string,string>;overview:string;why:string};
export type PilotCluster = {id:string;place:string;coordinates:number[];industry:string;stage:string;sources:string[];sectors:string[];note:string};
export const canadaIndustryPilot = raw as typeof raw & {industries:PilotIndustry[];clusters:PilotCluster[]};
export const pilotClusters = (sector:string, industry:string|null=null) => canadaIndustryPilot.clusters.filter(c=>c.sectors.includes(sector)&&(!industry||c.industry===industry));
export const pilotIndustry = (id:string) => canadaIndustryPilot.industries.find(i=>i.id===id);
export const pilotIndustryLabel = (id:string,sector:string) => id==='nickel'&&sector==='manufacturing'?'ニッケル精錬':pilotIndustry(id)?.label??'';
export type PilotState = {sector:PilotSector;industry:string|null;site:string|null;only:boolean;province:string|null;frame:number[]|null};
export function zoomPilotFrame(frame:number[],factor:number):number[] {
 const ratio=frame[2]/frame[3],width=Math.max(Math.max(150,100*ratio),Math.min(Math.min(2600,2600*ratio),frame[2]*factor)),height=width/ratio;
 return [frame[0]+(frame[2]-width)/2,frame[1]+(frame[3]-height)/2,width,height];
}
export function readPilotState(url:URL,provinceIds:string[]):PilotState {
 const p=url.searchParams,legacy=p.get('metric');
 const sector=(['resources','manufacturing','services'].includes(p.get('sector')??'')?p.get('sector'):legacy==='services'?'services':legacy==='manufacturing'?'manufacturing':'resources') as PilotSector;
 const old=p.get('subsector'),candidate=old==='mining'?'nickel':old==='utilities'?'hydro':old;
 const industry=canadaIndustryPilot.industries.some(i=>i.id===candidate&&i.sectors.includes(sector))?candidate:null;
 const site=pilotClusters(sector,industry).find(c=>c.id===p.get('site'))?.id??null;
 const parts=p.get('industryFrame')?.split(',')??[],saved=parts.map(Number);
 const frame=parts.length===4&&parts.every(v=>v.trim()!=='')&&saved.every(Number.isFinite)&&Math.abs(saved[0])<=4000&&Math.abs(saved[1])<=4000&&saved[2]>=150&&saved[2]<=2600&&saved[3]>=100&&saved[3]<=2600?saved:null;
 return {sector,industry,site,only:!!industry&&p.get('only')==='1',province:provinceIds.includes(p.get('province')??'')?p.get('province'):null,frame};
}
export function writePilotState(url:URL,state:PilotState):URL {
 const next=new URL(url);
 for(const key of ['metric','year','compare','zoom'])next.searchParams.delete(key);
 for(const [key,value]of Object.entries({sector:state.sector,subsector:state.industry,site:state.site,only:state.only?'1':null,province:state.province,industryFrame:state.frame?.map(v=>Number(v.toFixed(3))).join(',')})){
  if(value)next.searchParams.set(key,value);else next.searchParams.delete(key);
 }
 return next;
}
