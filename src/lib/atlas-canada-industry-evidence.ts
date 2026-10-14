import raw from '../data/atlas/canada/industry-evidence.json';

export type CanadaIndustryFact = {
 label:string;value:number|string|null;unit:string;year:string;geography:string;
 denominator:string;definition:string;sources:string[];numerator?:number;denominatorValue?:number;
};
export type CanadaIndustryEvidence = {
 confidence:string;adoptionReason:string;
 scale:CanadaIndustryFact[];comparison:CanadaIndustryFact[];strategy:CanadaIndustryFact[];
};
export const canadaIndustryEvidence=raw as {asOf:string;currency:string;items:Record<string,CanadaIndustryEvidence>};
export function formatCanadaIndustryFact(fact:CanadaIndustryFact):string {
 if(fact.value===null)return '未確認';
 const value=typeof fact.value==='number'?fact.value.toLocaleString('ja-JP',{maximumFractionDigits:6}):fact.value;
 return value+(fact.unit?' '+fact.unit:'');
}
