export type CultureTopic='ethnicity'|'religion';
export type CultureTable={definition:string;rows:[string,string][];rowLabel?:string;colors?:string[];source:string;sourceTitle:string;license:string;licenseUrl:string;note:string;supplement?:{label:string;value:string;definition:string;source:string;sourceTitle:string}};
export type CultureRecord={id:string;name:string;point:number[];chartPoint?:number[];year:string;topics:Partial<Record<CultureTopic,CultureTable>>};
export type CultureRegion={id:string;name:string;topics:Record<CultureTopic,{title:string;mapTitle?:string;overview:string;explanation:string;gap:string;sources?:{title:string;url:string}[]}>;records:CultureRecord[]};
export const cultureColors=['#476d9a','#c07835','#775991','#397968','#a5516d','#887126','#487b83','#985b41','#786c9e','#74764c'];
/** Bounds stay bounds; missing values never become zero, including Pew's <0.1. */
export function cultureShare(value:string):number|null{return /^\d+(\.\d+)?$/.test(value)?Number(value):null;}
export function culturePercentage(value:string):string{return value.startsWith('<')?'0.1%未満':value+'%';}
export function cultureShortLabel(label:string):string{return label.match(/^[A-Za-z].*[（(]([^）)]*)[）)]$/)?.[1]??label;}
