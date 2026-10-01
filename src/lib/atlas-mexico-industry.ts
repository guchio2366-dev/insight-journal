export type MexicoIndustryMetric = 'transport' | 'electronics';
export type MexicoIndustryStatus = 'available' | 'zero' | 'confidential' | 'unknown' | 'notSignificant' | 'notApplicable' | 'unretrieved';
export type MexicoIndustryValue = {value:number|null;sourceValue:number|null;sourceStatus:string;publicationStatus:string;status:MexicoIndustryStatus};
export type MexicoIndustryState = {state:string;metric:MexicoIndustryMetric;compare:'electronics'|'population'|null;sourceView:'density'|'population';from:'industry'|'population';only:boolean;zoom:boolean;fallback:boolean};

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

const keys=['state','metric','compare','sourceView','from','only','zoom','fallback'] as const;
export function readMexicoIndustryState(url:URL,stateIds:readonly string[]):MexicoIndustryState {
 const p=url.searchParams,code=p.get('state')??'',compare=p.get('compare'),sourceView=p.get('sourceView');
 return {state:stateIds.includes(code)?code:'05',metric:p.get('metric')==='electronics'?'electronics':'transport',compare:compare==='electronics'||compare==='population'?compare:null,sourceView:sourceView==='population'?'population':'density',from:compare==='population'&&p.get('from')==='population'?'population':'industry',only:p.get('only')==='1',zoom:p.get('zoom')==='1',fallback:p.get('fallback')==='1'};
}
export function writeMexicoIndustryState(url:URL,state:MexicoIndustryState):URL {
 const target=new URL(url);for(const key of keys)target.searchParams.delete(key);
 target.searchParams.set('state',state.state);target.searchParams.set('metric',state.metric);
 if(state.compare)target.searchParams.set('compare',state.compare);
 if(state.compare==='population'){target.searchParams.set('sourceView',state.sourceView);target.searchParams.set('from',state.from);}
 if(state.only)target.searchParams.set('only','1');if(state.zoom)target.searchParams.set('zoom','1');if(state.fallback)target.searchParams.set('fallback','1');
 return target;
}
export function industryPopulationReturnUrl(populationHref:string,current:URL,state:MexicoIndustryState):URL {
 const target=new URL(populationHref,current);
 target.searchParams.set('view',state.sourceView);target.searchParams.set('state',state.state);
 if(state.only)target.searchParams.set('only','1');if(state.fallback)target.searchParams.set('fallback','1');
 return target;
}
export function industryComparisonUrl(current:URL,state:MexicoIndustryState,compare:'electronics'|'population'):URL {
 return writeMexicoIndustryState(current,{...state,compare,from:'industry'});
}
