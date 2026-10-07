import {industrySectors,type IndustrySector} from '../data/atlas/industry-catalog.ts';
import catalog from '../data/atlas/mexico/industry-catalog.json' with {type:'json'};
export const mexicoIndustrySectors=industrySectors;
export const mexicoIndustryMetricChoices=[{id:'transport',sector:'manufacturing',subsector:'transport',name:'輸送機器'},{id:'electronics',sector:'manufacturing',subsector:'electronics',name:'半導体・電子機器'},...catalog.metrics];
export const mexicoIndustrySubsectorsFor=(sector:IndustrySector)=>[{id:'all',label:'全分野'},...mexicoIndustryMetricChoices.filter(m=>m.sector===sector).map(m=>({id:m.id,label:m.name}))];
export const mexicoIndustrySubsectors=mexicoIndustrySubsectorsFor('manufacturing');
export type MexicoIndustryMetric = string;
export type MexicoIndustryStatus = 'available' | 'zero' | 'confidential' | 'unknown' | 'notSignificant' | 'notApplicable' | 'unretrieved';
export type MexicoIndustryValue = {value:number|null;sourceValue:number|null;sourceStatus:string;publicationStatus:string;status:MexicoIndustryStatus};
export type MexicoIndustryFrame=[number,number,number,number];
export type MexicoIndustryState = {state:string;sourceState:string;sourceOnly?:boolean;sourcePopulationQuery?:string;frame?:MexicoIndustryFrame;metric:MexicoIndustryMetric;compare:'electronics'|'population'|null;sourceView:'density'|'population';from:'industry'|'population';only:boolean;zoom:boolean;fallback:boolean;sector?:IndustrySector;subsector?:'all'|MexicoIndustryMetric};
export function isMexicoIndustryPairMetric(metric:MexicoIndustryMetric):boolean {return metric==='transport'||metric==='electronics';}

export const mexicoIndustryColors=['#eef1e3','#d4e2c1','#a9ca91','#75a76e','#427e58','#205b45'];
export const mexicoIndustryBins=[{label:'0超–1未満',color:mexicoIndustryColors[0]},{label:'1–5未満',color:mexicoIndustryColors[1]},{label:'5–10未満',color:mexicoIndustryColors[2]},{label:'10–20未満',color:mexicoIndustryColors[3]},{label:'20–40未満',color:mexicoIndustryColors[4]},{label:'40以上',color:mexicoIndustryColors[5]}];
export const mexicoIndustryStatusLabels:Record<MexicoIndustryStatus,string>={available:'公開値',zero:'輸出なし（0）',confidential:'秘匿',unknown:'未把握',notSignificant:'500米ドル未満',notApplicable:'対象外',unretrieved:'未取得'};

export function industryExportColor(value:number|null,status:MexicoIndustryStatus,prefix='mi') {
 if(status==='zero')return '#fff';
 if(status!=='available'||value===null)return `url(#${prefix}-${status})`;
 return mexicoIndustryColors[value<1?0:value<5?1:value<10?2:value<20?3:value<40?4:5];
}
export function formatIndustryBillions(value:number|null):string {
 if(value===null)return '—';
 if(value===0)return '0';
 if(value<.001)return '0.001未満';
 return value.toLocaleString('ja-JP',{minimumFractionDigits:value<.01?3:2,maximumFractionDigits:value<.01?3:2});
}
export function industryValueText(value:MexicoIndustryValue):string {
 if(value.status==='available'||value.status==='zero')return `${formatIndustryBillions(value.value)} 10億米ドル`;
 return mexicoIndustryStatusLabels[value.status];
}

export function industryCameraFrame(frame:MexicoIndustryFrame):MexicoIndustryFrame {
 const width=Math.max(180,Math.min(900,frame[2])),height=width*580/900;
 return [Math.max(0,Math.min(900-width,frame[0])),Math.max(0,Math.min(580-height,frame[1])),width,height].map(value=>Math.round(value*1000)/1000) as MexicoIndustryFrame;
}
export function zoomMexicoIndustryFrame(frame:MexicoIndustryFrame,action:'in'|'out'|'fit'):MexicoIndustryFrame {
 if(action==='fit')return [0,0,900,580];
 const width=Math.max(180,Math.min(900,frame[2]*(action==='in'?1/1.35:1.35))),height=width*580/900;
 return industryCameraFrame([frame[0]+(frame[2]-width)/2,frame[1]+(frame[3]-height)/2,width,height]);
}
export function industryPopulationSourceQuery(raw:string|null|undefined):string|null {
 if(!raw?.startsWith('?')||raw.length>4096||raw.includes('#'))return null;
 const params=new URLSearchParams(raw),state=params.get('state')??'',view=params.get('view');
 if(state!==''&&!/^(0[1-9]|[12][0-9]|3[0-2])$/.test(state))return null;
 return view==='density'||view==='population'?`?${params.toString()}`:null;
}
const keys=['state','sourceState','sourceOnly','sourcePopulationQuery','industryFrame','metric','compare','sourceView','from','only','zoom','fallback','sector','subsector'] as const;
export function readMexicoIndustryState(url:URL,stateIds:readonly string[]):MexicoIndustryState {
 const p=url.searchParams,code=p.get('state')??'',compare=p.get('compare'),sourceView=p.get('sourceView');
 const state=stateIds.includes(code)?code:'',sourceCode=p.get('sourceState')??'';
 const result:MexicoIndustryState={state,sourceState:compare==='population'&&p.get('from')==='population'&&p.has('sourceState')&&(sourceCode===''||stateIds.includes(sourceCode))?sourceCode:state,metric:mexicoIndustryMetricChoices.some(m=>m.id===p.get('metric'))?p.get('metric')!:'transport',compare:compare==='electronics'||compare==='population'?compare:null,sourceView:sourceView==='population'?'population':'density',from:compare==='population'&&p.get('from')==='population'?'population':'industry',only:!!state&&p.get('only')==='1',zoom:!!state&&p.get('zoom')==='1',fallback:p.get('fallback')==='1'};
 if(result.compare==='population'&&result.from==='population'&&p.has('sourceOnly'))result.sourceOnly=p.get('sourceOnly')==='1';
 const sourceQuery=industryPopulationSourceQuery(p.get('sourcePopulationQuery'));if(result.compare==='population'&&result.from==='population'&&sourceQuery)result.sourcePopulationQuery=sourceQuery;
 const frame=p.get('industryFrame')?.split(',').map(Number);if(frame?.length===4&&frame.every(Number.isFinite)&&frame[2]>0&&frame[3]>0)result.frame=industryCameraFrame(frame as MexicoIndustryFrame);
 const sector=p.get('sector');if(industrySectors.some(s=>s.id===sector)){result.sector=sector as IndustrySector;result.subsector=mexicoIndustryMetricChoices.some(m=>m.sector===sector&&m.id===p.get('subsector'))?p.get('subsector')!:'all';if(result.subsector!=='all')result.metric=result.subsector;}
 if(result.compare==='electronics'&&!isMexicoIndustryPairMetric(result.metric))result.compare=null;
 return result;
}
export function writeMexicoIndustryState(url:URL,state:MexicoIndustryState):URL {
 const target=new URL(url);for(const key of keys)target.searchParams.delete(key);
 if(state.state)target.searchParams.set('state',state.state);target.searchParams.set('metric',state.metric);
 if(state.compare&&(state.compare!=='electronics'||isMexicoIndustryPairMetric(state.metric)))target.searchParams.set('compare',state.compare);
 if(state.compare==='population'){target.searchParams.set('sourceView',state.sourceView);target.searchParams.set('from',state.from);if(state.from==='population'){target.searchParams.set('sourceState',state.sourceState);if(state.sourceOnly!==undefined)target.searchParams.set('sourceOnly',state.sourceOnly?'1':'0');const query=industryPopulationSourceQuery(state.sourcePopulationQuery);if(query)target.searchParams.set('sourcePopulationQuery',query);}}
 if(state.state&&state.only)target.searchParams.set('only','1');if(state.state&&state.zoom)target.searchParams.set('zoom','1');if(state.fallback)target.searchParams.set('fallback','1');
 if(state.frame&&state.frame[2]<900)target.searchParams.set('industryFrame',industryCameraFrame(state.frame).join(','));
 if(state.sector&&industrySectors.some(s=>s.id===state.sector)){target.searchParams.set('sector',state.sector);target.searchParams.set('subsector',mexicoIndustryMetricChoices.some(m=>m.sector===state.sector&&m.id===state.subsector)?state.subsector!:'all');}
 return target;
}
export function industryPopulationReturnUrl(populationHref:string,current:URL,state:MexicoIndustryState):URL {
 const target=new URL(populationHref,current);
 const query=industryPopulationSourceQuery(state.sourcePopulationQuery);if(query){target.search=query;return target;}
 target.searchParams.set('view',state.sourceView);if(state.sourceState)target.searchParams.set('state',state.sourceState);
 if(state.sourceState&&(state.sourceOnly??state.only))target.searchParams.set('only','1');if(state.fallback)target.searchParams.set('fallback','1');
 return target;
}
export function industryComparisonUrl(current:URL,state:MexicoIndustryState,compare:'electronics'|'population'):URL {
 return writeMexicoIndustryState(current,{...state,compare,from:'industry'});
}
