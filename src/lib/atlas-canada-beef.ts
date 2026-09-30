export type CanadaBeefState={year:number;province:string;compare:string|null;metric:'beef'|'dairy'|'total';map:'beef'|'pasture'|'hay';zoom:boolean};
export function readCanadaBeefState(url:URL,years:number[],provinces:string[]):CanadaBeefState{
 const p=url.searchParams,y=Number(p.get('year')),province=provinces.includes(p.get('province')??'')?p.get('province')!:'Alberta',compare=p.get('compare');
 return {year:years.includes(y)?y:2021,province,compare:compare&&provinces.includes(compare)&&compare!==province?compare:null,metric:['beef','dairy','total'].includes(p.get('metric')??'')?p.get('metric') as CanadaBeefState['metric']:'beef',map:['beef','pasture','hay'].includes(p.get('map')??'')?p.get('map') as CanadaBeefState['map']:'beef',zoom:p.get('zoom')==='1'};
}
export function writeCanadaBeefState(url:URL,state:CanadaBeefState){const u=new URL(url);for(const key of ['year','province','compare','metric','map','zoom'])u.searchParams.delete(key);u.searchParams.set('year',String(state.year));u.searchParams.set('province',state.province);u.searchParams.set('metric',state.metric);u.searchParams.set('map',state.map);if(state.compare)u.searchParams.set('compare',state.compare);if(state.zoom)u.searchParams.set('zoom','1');return u;}
export function formatCanadaBeefValue(v:number|null){return v===null?'未収録':v.toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1});}
