import countries from './countries.json' with {type:'json'};
import environment from './country-overview-environment.json' with {type:'json'};
import society from './country-overview-society.json' with {type:'json'};
import politicsEU from './country-overview-politics-eu.json' with {type:'json'};
import politicsOther from './country-overview-politics-other.json' with {type:'json'};
import statistics from './country-statistics.json' with {type:'json'};
import {europeLayers} from './layers.ts';

export const europeOverviewTopics=[{id:'agriculture',label:'農林業'},{id:'nature',label:'自然環境'},{id:'industry',label:'産業'},{id:'population',label:'人口'},{id:'politics',label:'政治'}] as const;
export type EuropeOverviewTopicId=typeof europeOverviewTopics[number]['id'];
export type EuropeOverviewSource={id:string;label:string;url:string;period:string;checkedAt:string};
export type EuropeOverviewCopy={takeaway:string;body:string;sourceIds:string[];links:{label:string;href:string}[];evidenceNote?:string};
export type EuropeOverviewPackage={countries:Record<string,Partial<Record<EuropeOverviewTopicId,EuropeOverviewCopy>>>;sources:EuropeOverviewSource[]};
export type EuropeOverviewFact={id:string;label:string;value:number|null;unit:string;year:number;sourceUrl:string};
export type EuropeCountryOverview={code:string;name:string;topics:Partial<Record<EuropeOverviewTopicId,EuropeOverviewCopy>>;facts:EuropeOverviewFact[]};

const layerSource=(id:string,label:string):EuropeOverviewSource=>{
 const layer=europeLayers.find(layer=>layer.id===id)!;
 return{id,label,url:layer.source,period:layer.period,checkedAt:'2026-10-02'};
};
const baseSources:EuropeOverviewSource[]=[
 layerSource('climate','Beckほか：気候区分'),
 layerSource('terrain','NOAA ETOPO：地形標高'),
 layerSource('precipitation','GPCC/DWD：年降水量の平年値'),
 layerSource('treecover','ESA WorldCover：樹木被覆'),
 {id:'farming',label:'IFPRI SPAM：作物の分布推計',url:'https://www.mapspam.info/data/',period:'SPAM 2020',checkedAt:'2026-10-02'},
 {id:'livestock',label:'FAO GLW4：家畜の分布推計',url:'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/',period:'GLW4 2020',checkedAt:'2026-10-02'},
 {id:'observations',label:'気象庁 ClimatView：観測地点の月別平年値',url:'https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/',period:'主に1991–2020年・地点別',checkedAt:'2026-10-02'},
 {id:'context',label:'Natural Earth：国境・都市・河川の概略',url:'https://www.naturalearthdata.com/',period:'Natural Earth 5.1.2',checkedAt:'2026-10-02'},
 {id:'statistics',label:'World Bank WDI：国別指標',url:'https://data.worldbank.org/',period:'2023年・国全体',checkedAt:'2026-10-02'},
];
// Layer IDs and editorial source IDs need not be identical.
baseSources[0].id='climate';baseSources[1].id='terrain';baseSources[2].id='precipitation';baseSources[3].id='treecover';
const packages=[environment,society,politicsEU,politicsOther] as unknown as EuropeOverviewPackage[];
export const europeCountryOverviewSources=[...baseSources,...packages.flatMap(item=>item.sources??[])];
export const europeCountryOverviews:EuropeCountryOverview[]=countries.map(country=>({
 code:country.code,name:country.name,
 topics:Object.assign({},...packages.map(item=>item.countries[country.code]??{})),
 facts:statistics.indicators.map(indicator=>({id:indicator.id,label:indicator.label,value:(indicator.values as Record<string,Record<string,number|null>>)[country.code]?.[String(statistics.year)]??null,unit:indicator.unit,year:statistics.year,sourceUrl:indicator.sourceUrl})),
}));
export const overviewFactIds:Record<EuropeOverviewTopicId,string[]>={agriculture:['agrishare','forest'],nature:['forest'],industry:['manufacturing','services'],population:['population','urban','age','growth'],politics:[]};
export function countryOverview(code:string){return europeCountryOverviews.find(country=>country.code===code);}
export function countryOverviewSource(id:string){return europeCountryOverviewSources.find(source=>source.id===id);}
export function formatOverviewFact(fact:EuropeOverviewFact):string{
 if(fact.value===null)return'未掲載';
 return fact.value.toLocaleString('ja-JP',{maximumFractionDigits:fact.id==='population'?0:1})+' '+fact.unit;
}
