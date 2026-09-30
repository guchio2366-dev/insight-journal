export type CanadaAgricultureState={year:number;province:string;compare:string|null;metric:'seeded'|'harvested'|'production';zoom:boolean};
export function readCanadaAgricultureState(url:URL,years:number[],provinces:string[]):CanadaAgricultureState{
 const p=url.searchParams,y=Number(p.get('year')),province=provinces.includes(p.get('province')??'')?p.get('province')!:'Saskatchewan',compare=p.get('compare');
 return {year:years.includes(y)?y:2021,province,compare:compare&&provinces.includes(compare)&&compare!==province?compare:null,metric:['seeded','harvested','production'].includes(p.get('metric')??'')?p.get('metric') as CanadaAgricultureState['metric']:'seeded',zoom:p.get('zoom')==='1'};
}
export function writeCanadaAgricultureState(url:URL,state:CanadaAgricultureState){const u=new URL(url);for(const key of ['year','province','compare','metric','zoom'])u.searchParams.delete(key);u.searchParams.set('year',String(state.year));u.searchParams.set('province',state.province);u.searchParams.set('metric',state.metric);if(state.compare)u.searchParams.set('compare',state.compare);if(state.zoom)u.searchParams.set('zoom','1');return u;}
