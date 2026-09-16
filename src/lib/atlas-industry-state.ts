import {industrySectors, industrySubsectors, industryInsightIds, type IndustrySector} from '../data/atlas/industry-catalog.ts';
export interface IndustryState {sector:IndustrySector;subsector:string;industryRegion:string|null;industryInsight:string|null;industryState?:string|null}
export function readIndustryState(url:URL, regions:readonly {id:string;sector:string;subsector:string}[]=[]):IndustryState{
  const raw=url.searchParams.get('sector');
  const sector=industrySectors.some(s=>s.id===raw)?raw as IndustrySector:'all';
  const sub=url.searchParams.get('subsector');
  const subsector=industrySubsectors[sector].some(s=>s.id===sub)?sub!:'all';
  const region=url.searchParams.get('industryRegion');
  const industryRegion=regions.some(r=>r.id===region&&(sector==='all'||r.sector===sector)&&(subsector==='all'||r.subsector===subsector))?region:null;
  const insight=url.searchParams.get('industryInsight');
  const selectedState=url.searchParams.get('industryState');
  const extra=selectedState&&/^(0[1245689]|1[012356789]|2[0123456789]|3[012456789]|4[012456789]|5[013456])$/.test(selectedState)&&subsector!=='all'?{industryState:selectedState}:{};
  return {sector,subsector,industryRegion,industryInsight:industryInsightIds.includes(insight as any)?insight:null,...extra};
}
export function writeIndustryState(url:URL,state:IndustryState){
  const next=new URL(url);
  for(const key of ['sector','subsector','industryRegion','industryInsight','industryState'] as const){
    const value=state[key];if(value&&value!=='all')next.searchParams.set(key,value);else next.searchParams.delete(key);
  }
  return next;
}
