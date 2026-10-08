/** National FAOSTAT rows are loaded separately from the spatial model assets. */
export type EuropeFarmDomain = 'QCL' | 'FO' | 'RL';
export type EuropeFarmMetric = {
  id:string; topics:readonly string[]; label:string; unit:string; definition:string;
  itemCode:string; elementCode:string; domain:EuropeFarmDomain;
  share:boolean; shareLabel:string;
};
export type EuropeFarmTuple = [measureId:string, year:number, rawDecimal:string, unit:string, flag:string, note?:string];
export type EuropeFarmSourceName = { name:string; areaCode:string; m49Raw:string };
export type EuropeFarmCountry = { m49:number|null; sourceNames:Partial<Record<EuropeFarmDomain,EuropeFarmSourceName>>; observations:EuropeFarmTuple[] };
export type EuropeFarmSource = {
  id:EuropeFarmDomain; publisher:string; dataset:string; releaseDate:string; url:string; landingUrl:string;
  license:string; licenseUrl:string; cacheReusedAt:string; licenseVerifiedAt:string; originalRetrievedAt:string|null;
  archive:{file:string;bytes:number;sha256:string}; sourceMember:string;
};
export type EuropeFarmStatistics = {
  schemaVersion:1; comparisonYear:2024; years:number[]; measures:EuropeFarmMetric[];
  countries:Record<string,EuropeFarmCountry>; world:EuropeFarmCountry;
  sources:EuropeFarmSource[]; sourceItems:Record<EuropeFarmDomain,Record<string,string>>;
  flags:Record<EuropeFarmDomain,Record<string,string>>; observationTuple:string[]; method:string;
};
export type EuropeFarmObservation = {
  value:number; rawValue:string; unit:string; flag:string; note?:string; year:number;
  measureId:string; flagDescription:string; sourceId:EuropeFarmDomain;
  sourceName?:EuropeFarmSourceName;
};
export type EuropeFarmShare = {
  /** Unrounded percent: published national value / same-year World value * 100. */
  value:number; countryObservation:EuropeFarmObservation; worldObservation:EuropeFarmObservation;
};

const productionDefinition = 'FAOSTAT の当該作物の生産量。穀物は乾燥子実の収穫で、青刈り・飼料用サイレージを含みません。';
const stockDefinition = '全国の生体家畜数。肉用・乳用・採卵用などの用途別頭数を示しません。鶏は原資料の千羽単位です。';
const livestockDefinition = 'FAOSTAT の直接分類による全国生産量。生体家畜数とは別の指標です。';
const metric = (id:string,topic:string,label:string,domain:EuropeFarmDomain,itemCode:string,elementCode:string,unit:string,definition:string):EuropeFarmMetric => ({
  id,topics:topic==='forest'?['forest','treecover']:[topic],label,domain,itemCode,elementCode,unit,definition,share:true,
  shareLabel:elementCode==='5111'||elementCode==='5112'?'世界飼養数比':elementCode==='5110'?'世界森林面積比':'世界生産量比',
});
export const europeFarmYears = Object.freeze(Array.from({length:10},(_,i)=>2015+i));
export const europeFarmComparisonYear = 2024;
export const europeFarmMetrics:readonly EuropeFarmMetric[] = Object.freeze([
  ...([['wheat','小麦','15'],['barley','大麦','44'],['maize','トウモロコシ','56'],['rapeseed','菜種','270'],['sunflower','ヒマワリ','267'],['sugarbeet','テンサイ','157'],['potato','ジャガイモ','116'],['rice','米','27'],['soybean','大豆','236']] as const).map(([topic,label,item])=>
    metric(topic+'-production',topic,label+'生産量','QCL',item,'5510','t',topic==='rice'?'FAOSTAT Rice の生産量（籾米）。精米量ではありません。':productionDefinition)),
  ...([['cattle','牛','866','5111','An'],['pig','豚','1034','5111','An'],['chicken','鶏','1057','5112','1000 An'],['sheep','羊','976','5111','An']] as const).map(([topic,label,item,element,unit])=>
    metric(topic+'-stocks',topic,label+'飼養数','QCL',item,element,unit,stockDefinition)),
  ...([['cattle-meat','cattle','牛肉生産量','867'],['cattle-milk','cattle','牛の生乳生産量','882'],['pig-meat','pig','豚肉生産量','1035'],['chicken-meat','chicken','鶏肉生産量','1058'],['chicken-eggs','chicken','鶏卵生産量','1062'],['sheep-meat','sheep','羊肉生産量','977']] as const).map(([id,topic,label,item])=>
    metric(id,topic,label,'QCL',item,'5510','t',livestockDefinition)),
  metric('roundwood-production','forest','丸太生産量','FO','1861','5516','m3','FAOSTAT Roundwood。林地・樹木から搬出された丸太で、薪材と産業用丸太を含みます。製材と足し合わせません。'),
  metric('sawnwood-production','forest','製材生産量','FO','1872','5516','m3','FAOSTAT Sawnwood。丸太を加工した製材品の生産量。丸太との二重合算を行いません。'),
  metric('forest-area','forest','森林面積','RL','6646','5110','1000 ha','FAOSTAT Forest land の土地利用面積（千ha）。樹木被覆地図の画素合計や林産物の生産量とは別の統計です。'),
]);
const metricById = new Map(europeFarmMetrics.map(value=>[value.id,value]));

export function europeFarmMetric(id:string):EuropeFarmMetric|undefined { return metricById.get(id); }
export function europeFarmAvailableMetrics(topic:string):EuropeFarmMetric[] {
  if(topic==='dairy')return [metricById.get('cattle-milk')!];
  return europeFarmMetrics.filter(value=>value.topics.includes(topic));
}
export function europeFarmValidYear(year:unknown):year is number {
  return typeof year==='number'&&Number.isInteger(year)&&year>=2015&&year<=2024;
}
export function europeFarmUnitLabel(unit:string):string {
  return ({t:'t',An:'頭','1000 An':'千羽',m3:'m³','1000 ha':'千ha'} as Record<string,string>)[unit]??unit;
}

function decodeObservation(data:EuropeFarmStatistics,country:EuropeFarmCountry|undefined,metric:EuropeFarmMetric,year:number):EuropeFarmObservation|null {
  const tuple=country?.observations.find(row=>row[0]===metric.id&&row[1]===year);
  if(!tuple||tuple[2].trim()===''||tuple[4]==='M'||tuple[4]==='L')return null;
  const value=Number(tuple[2]);
  if(!Number.isFinite(value)||value<0)return null;
  return {value,rawValue:tuple[2],unit:tuple[3],flag:tuple[4],...(tuple[5]?{note:tuple[5]}:{}),year,measureId:metric.id,sourceId:metric.domain,flagDescription:data.flags[metric.domain]?.[tuple[4]]??tuple[4],sourceName:country?.sourceNames[metric.domain]};
}

/** No fallback year, nearby country, estimated row or zero is manufactured. */
export function europeFarmObservation(data:EuropeFarmStatistics,code:string,measureId:string,year:number):EuropeFarmObservation|null {
  const metric=europeFarmMetric(measureId);
  return metric&&europeFarmValidYear(year)?decodeObservation(data,data.countries[code],metric,year):null;
}
export function europeFarmWorldObservation(data:EuropeFarmStatistics,measureId:string,year:number):EuropeFarmObservation|null {
  const metric=europeFarmMetric(measureId);
  return metric&&europeFarmValidYear(year)?decodeObservation(data,data.world,metric,year):null;
}
/** Shares use the retained publisher World row and require identical units. */
export function europeFarmWorldShare(data:EuropeFarmStatistics,code:string,measureId:string,year:number):EuropeFarmShare|null {
  const metric=europeFarmMetric(measureId);if(!metric?.share)return null;
  const countryObservation=europeFarmObservation(data,code,measureId,year),worldObservation=europeFarmWorldObservation(data,measureId,year);
  if(!countryObservation||!worldObservation||worldObservation.value<=0||countryObservation.unit!==worldObservation.unit||countryObservation.unit!==metric.unit)return null;
  return {value:countryObservation.value/worldObservation.value*100,countryObservation,worldObservation};
}
export function europeFarmCountryRows(data:EuropeFarmStatistics,measureId:string,year:number) {
  return Object.entries(data.countries).map(([code,country])=>({code,m49:country.m49,observation:europeFarmObservation(data,code,measureId,year),share:europeFarmWorldShare(data,code,measureId,year)}));
}
/** A national processing comparison, ranked by sawnwood output. These two
 * product volumes are independent observations, not a timber balance. */
export function europeForestryLeaders(data:EuropeFarmStatistics,year=2024) {
  return Object.keys(data.countries).flatMap(code=>{
    const roundwood=europeFarmObservation(data,code,'roundwood-production',year);
    const sawnwood=europeFarmObservation(data,code,'sawnwood-production',year);
    return roundwood&&sawnwood?[{code,roundwood,sawnwood}]:[];
  }).sort((a,b)=>b.sawnwood.value-a.sawnwood.value||a.code.localeCompare(b.code));
}
export function europeFarmSeries(data:EuropeFarmStatistics,code:string,measureId:string) {
  return europeFarmYears.map(year=>({year,observation:europeFarmObservation(data,code,measureId,year),share:europeFarmWorldShare(data,code,measureId,year)}));
}
