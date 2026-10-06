import census from '../data/atlas/mexico/agriculture.json';
import censusLivestock from '../data/atlas/mexico/livestock.json';
import {mexicoAgricultureLabel} from '../data/atlas/mexico/agriculture-catalog';
export interface MexicoProduction { label?:string; production:number|null; unit:string|null; valueMxN:number }
export interface MexicoProductionRegion {code:string;items:Record<string,MexicoProduction>;totalValueMxN:number}
export interface MexicoAgricultureAtlasData {
 schemaVersion:number; years:{map:number;statistics:number};
 cropZones:{type:string;features:{type:string;properties:{cropId:string;componentId:string;sourceCellCount:number};geometry:{type:string;coordinates:any}}[]};
 cropLabels:{id:string;cropId:string;label:string;anchor:[number,number];sourceCellCount:number}[];
 livestockMarkers:{id:string;kindId:string;label:string;stateCode:string;municipalityCode:string;anchor:[number,number];production:number;unit:string|null;valueMxN:number;sourceUrl:string}[];
 crops:{national:{items:Record<string,MexicoProduction>;totalValueMxN:number};states:MexicoProductionRegion[]};
 livestock:{national:{items:Record<string,MexicoProduction>;totalValueMxN:number};states:MexicoProductionRegion[]};
 composition:{id:string;label:string;totalValueMxN:number;items:{id:string;label:string;valueMxN:number}[]}[];
 metadata:{sources:any;methods:any;checks:any};
}
export function agricultureProductStatistics(data:MexicoAgricultureAtlasData,id:string) {
 if(['pine','irrigation','cattle'].includes(id)){
  const value=(record:typeof census.national)=>id==='pine'?record.pineObtainedM3:id==='irrigation'?record.irrigationSharePct:record.code==='00'?censusLivestock.national:censusLivestock.states[record.code as keyof typeof censusLivestock.states];
  return {label:mexicoAgricultureLabel(id),year:'2022年農業センサス',unit:id==='pine'?'m³':id==='irrigation'?'%':'頭',national:value(census.national),valueMxN:null,
   rows:census.states.map(record=>({code:record.code,name:record.nameJa,production:value(record),valueMxN:null})).sort((a,b)=>b.production-a.production),
   definition:id==='pine'?census.definitions.pineObtainedM3:id==='irrigation'?census.definitions.irrigationSharePct:censusLivestock.scope};
 }
 const group=Object.hasOwn(data.crops.national.items,id)?data.crops:data.livestock;
 const national=group.national.items[id];
 if(!national)return null;
 return {label:national.label??mexicoAgricultureLabel(id),year:`${data.years.statistics}年`,unit:national.unit??'',national:national.production,valueMxN:national.valueMxN,
  rows:group.states.map(record=>({code:record.code,name:census.states.find(item=>item.code===record.code)?.nameJa??record.code,production:record.items[id]?.production??null,valueMxN:record.items[id]?.valueMxN??0})).sort((a,b)=>(b.valueMxN??0)-(a.valueMxN??0)),
  definition:'DGSIAPの年次生産統計。生産量と当年価格の生産額。'+(id==='coffee'?'数量は収穫したコーヒー果実（生豆ではありません）。':id==='rice'?'米の数量は籾米です。':id==='cotton'?'綿花の数量は種付き綿です。':'')+'地図の2020年推計とは対象年・作物分類が異なります。資料に掲載のない州・品目は集計値0となり、実際の不在を意味しません。'};
}
export const formatMexicoProduction=(value:number|null,unit='')=>value===null?'数量は単純合算しません':`${value.toLocaleString('ja-JP',{maximumFractionDigits:unit==='%'?1:0})}${unit?' '+unit:''}`;
export const formatMexicoValue=(value:number|null)=>value===null?'―':`${(value/1e9).toLocaleString('ja-JP',{maximumFractionDigits:2})} 十億ペソ`;
