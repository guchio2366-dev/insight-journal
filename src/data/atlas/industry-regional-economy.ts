import data from '../../../public/assets/atlas/industry-v1/regional-economy.json' with {type:'json'};
import type {IndustryRegion} from './industry-regions';
export const industryRegionalLabels:Record<string,string>={information:'情報通信',finance:'金融・保険',professional:'専門・業務支援','trade-logistics':'商業・物流',tourism:'娯楽・宿泊・飲食','health-education':'民間の医療・教育・福祉','other-services':'その他のサービス',construction:'建設','real-estate':'不動産・賃貸',utilities:'電力・ガス・水道'};
export const regionalEconomyYear=data.year;
export const regionalEconomySource='https://www.bea.gov/data/gdp/gdp-by-county';
export function regionalEconomyFor(region:Pick<IndustryRegion,'placeId'|'subsector'>){
 const metro=data.metros.find(m=>m.placeId===region.placeId||(region.placeId==='fortworth'&&m.placeId==='dallas'));
 if(!metro)return null;
 const value=metro.values[region.subsector as keyof typeof metro.values];
 return value===null||value===undefined||!Number.isFinite(value)||value<0?null:{...metro,value};
}
export function economicCircleRadius(value:number,max:number){return Number.isFinite(value)&&Number.isFinite(max)&&value>=0&&max>0?32*Math.sqrt(value/max):0;}
export function industryRegionalComparison(regions:readonly IndustryRegion[],sector:string,subsector:string){
 if(sector==='all'||subsector==='all'||!industryRegionalLabels[subsector])return null;
 const candidates=regions.filter(r=>r.sector===sector&&r.subsector===subsector);
 const unique=new Map<string,NonNullable<ReturnType<typeof regionalEconomyFor>>&{regionIds:string[]}>();
 for(const r of candidates){const value=regionalEconomyFor(r);if(!value)continue;const existing=unique.get(value.id);if(existing)existing.regionIds.push(r.id);else unique.set(value.id,{...value,regionIds:[r.id]});}
 const values=[...unique.values()].sort((a,b)=>b.value-a.value);
 if(values.length<2||values[0].value<=0)return null;
 const max=values[0].value;
 return {label:industryRegionalLabels[subsector],year:data.year,total:values.length,max,
  points:values.map(p=>({...p,rank:1+values.filter(x=>x.value>p.value).length,radius:economicCircleRadius(p.value,max)}))};
}
