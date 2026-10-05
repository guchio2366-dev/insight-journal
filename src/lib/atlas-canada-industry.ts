import {readCanadaPopulationState,writeCanadaPopulationState} from './atlas-canada-population';
import {isCanadaDemographicTopic} from './atlas-canada-demographics';
import {canadaIndustryRegions,canadaIndustrySectors,type CanadaIndustrySector} from '../data/atlas/canada/industry-reading';
export type CanadaIndustryState={year:number;province:string;compare:string|null;metric:'mining'|'manufacturing'|'services';only:boolean;zoom:boolean;sector?:CanadaIndustrySector;region?:string|null};
export const canadaIndustryKeys=['year','province','compare','metric','only','zoom','sector','region'] as const;
export const canadaIndustryColors=['#edf1df','#d7e3bd','#adc98b','#7ba65f','#467f48','#22543d'];
export function industryShareColor(value:number|null){if(value===null)return 'url(#industry-missing)';return canadaIndustryColors[value<5?0:value<15?1:value<30?2:value<60?3:value<80?4:5];}
export function formatCanadaIndustryValue(value:number|null){return value===null?'欠損':value.toLocaleString('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2});}
export function readCanadaIndustryState(url:URL,years:number[],provinces:string[]):CanadaIndustryState{
 const p=url.searchParams,province=provinces.includes(p.get('province')??'')?p.get('province')!:'Alberta',compare=p.get('compare'),year=Number(p.get('year'));
 const state:CanadaIndustryState={year:years.includes(year)?year:2025,province,compare:compare&&provinces.includes(compare)&&compare!==province?compare:null,metric:['mining','manufacturing','services'].includes(p.get('metric')??'')?p.get('metric') as CanadaIndustryState['metric']:'mining',only:p.get('only')==='1',zoom:p.get('zoom')==='1'};
 const sector=p.get('sector');
 if(canadaIndustrySectors.some(s=>s.id===sector)){
  state.sector=sector as CanadaIndustrySector;
  const region=canadaIndustryRegions.find(r=>r.id===p.get('region')&&(state.sector==='all'||r.sector===state.sector));
  state.region=region?.id??null;
  if(region){state.province=region.province;state.metric=region.gdpMetric;if(state.compare===state.province)state.compare=null;}
 }
 return state;
}
export function writeCanadaIndustryState(url:URL,state:CanadaIndustryState){
 const u=new URL(url);for(const key of canadaIndustryKeys)u.searchParams.delete(key);
 for(const key of ['year','province','metric'] as const)u.searchParams.set(key,String(state[key]));
 if(state.compare)u.searchParams.set('compare',state.compare);if(state.only)u.searchParams.set('only','1');if(state.zoom)u.searchParams.set('zoom','1');
 if(state.sector&&canadaIndustrySectors.some(s=>s.id===state.sector)){
  u.searchParams.set('sector',state.sector);
  const region=canadaIndustryRegions.find(r=>r.id===state.region&&(state.sector==='all'||r.sector===state.sector));
  if(region)u.searchParams.set('region',region.id);
 }
 return u;
}
/** Carry one flat, validated population selection; never carry nested return URLs. */
export function canadaIndustryReturnUrl(source:URL,state:CanadaIndustryState,populationIds:string[]=[]){
 const saved=writeCanadaIndustryState(new URL(source.pathname,source),state),raw=source.searchParams.get('populationReturn');
 if(raw&&populationIds.length){const context=new URL('?'+raw,source);if(!isCanadaDemographicTopic(context.searchParams.get('topic'))){const selection=readCanadaPopulationState(context,populationIds);saved.searchParams.set('populationReturn',writeCanadaPopulationState(new URL(source.pathname,source),selection).searchParams.toString());}}
 return saved;
}
export function canadaIndustryComparisonUrl(source:URL,target:URL,state:CanadaIndustryState,populationIds:string[]=[]){target.searchParams.set('industryReturn',canadaIndustryReturnUrl(source,state,populationIds).searchParams.toString());return target;}
