export type CanadaPopulationMetric='population'|'density';
export type CanadaPopulationState={year:2016|2021;cma:string;compare:string|null;metric:CanadaPopulationMetric;only:boolean;zoom:'south'|'country'|'selected'};
export const populationStateKeys=['year','cma','compare','metric','only','zoom'] as const;
export const populationStorageKey='insight-journal:canada-population:v1';
export function readCanadaPopulationState(url:URL,ids:string[]):CanadaPopulationState {
 const p=url.searchParams,cma=ids.includes(p.get('cma')??'')?p.get('cma')!:'535',compare=p.get('compare'),metric=p.get('metric')==='density'?'density':'population';
 return {year:metric==='density'||p.get('year')!=='2016'?2021:2016,cma,compare:compare&&ids.includes(compare)&&compare!==cma?compare:null,metric,only:p.get('only')==='1',zoom:['country','selected'].includes(p.get('zoom')??'')?p.get('zoom') as CanadaPopulationState['zoom']:'south'};
}
export function writeCanadaPopulationState(url:URL,state:CanadaPopulationState){const u=new URL(url);for(const key of populationStateKeys)u.searchParams.delete(key);for(const key of ['year','cma','metric','zoom'] as const)u.searchParams.set(key,String(state[key]));if(state.compare)u.searchParams.set('compare',state.compare);if(state.only)u.searchParams.set('only','1');return u;}
export function formatCanadaPopulationValue(value:number|null,metric:CanadaPopulationMetric='population'){return value===null?'未公表':value.toLocaleString('ja-JP',{minimumFractionDigits:metric==='density'?1:0,maximumFractionDigits:metric==='density'?1:0});}
export function canadaPopulationNatureUrl(source:URL,target:URL,state:CanadaPopulationState){const saved=writeCanadaPopulationState(new URL(source.pathname,source),state);target.searchParams.set('populationReturn',saved.searchParams.toString());return target;}
export const populationDensityColors=['#e4ebcf','#aecb9b','#679b80','#2f735e','#144936'];
export const populationDensityBreaks=[50,150,300,600];
export function canadaPopulationDensityColor(value:number|null){if(value===null)return '#b7b7af';return populationDensityColors[populationDensityBreaks.filter(v=>value>=v).length];}
export function canadaPopulationFrame(state:CanadaPopulationState,geometry:{id:string;bounds:number[]}[]){
 if(state.zoom==='country')return [0,0,900,580];
 if(state.zoom==='south')return [140,340,760,240];
 const selected=geometry.filter(g=>[state.cma,state.compare].includes(g.id)),points=selected.flatMap(g=>[[g.bounds[0],g.bounds[1]],[g.bounds[2],g.bounds[3]]]);
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),width=Math.max(80,xmax-xmin+30),height=Math.max(55,ymax-ymin+20);
 return [Math.max(0,Math.min(900-width,(xmin+xmax-width)/2)),Math.max(0,Math.min(580-height,(ymin+ymax-height)/2)),width,height];
}
