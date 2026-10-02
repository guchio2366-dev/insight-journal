import type {MexicoPopulationCategory, MexicoPopulationValueStatus} from './atlas-mexico-population';

export type MexicoCompositionCategory = Exclude<MexicoPopulationCategory, 'distribution'>;
export type MexicoCompositionMeasure = 'share' | 'count';
export interface MexicoCompositionInterval {lower:number|null;upper:number|null}
export interface MexicoCompositionRecord {count:number|null;denominator:number|null;status:MexicoPopulationValueStatus;shareConfidenceInterval90?:MexicoCompositionInterval;confidenceInterval90?:MexicoCompositionInterval;countConfidenceInterval90?:MexicoCompositionInterval;countCVPercentage?:number;percentageCVPercentage?:number;unknownCount?:number|null}
export interface MexicoCompositionBin {min:number;max:number|null;color:string;label:string}
export interface MexicoCompositionMetric {
  id:string;category:MexicoCompositionCategory;label:string;definition:string;takeaway:string;
  countDenominatorLabel:string;nationalCount:number|null;nationalDenominator:number|null;nationalStatus:MexicoPopulationValueStatus;
  states:Record<string,MexicoCompositionRecord>;
  source:{label:string;url:string;table:string;periodNote:string;methodNote:string};
  shareBins?:MexicoCompositionBin[];countLegendValues?:number[];countRadiusReference?:number;countMaximumRadius?:number;
  sharePrecision?:number;isEstimate?:boolean;nationalShareConfidenceInterval90?:MexicoCompositionInterval;nationalConfidenceInterval90?:MexicoCompositionInterval;nationalCountConfidenceInterval90?:MexicoCompositionInterval;nationalUnknownCount?:number;comparabilityNote?:string;distributionSummary?:string;
}
export interface MexicoCompositionData {referenceYear:number;metrics:MexicoCompositionMetric[]}
export interface MexicoCompositionSelection {metric:string;measure:MexicoCompositionMeasure;compare:boolean;sourceQuery:string|null}
export const mexicoCompositionKeys=['compositionMetric','compositionMeasure','compositionCompare','compositionFrom'] as const;
export const mexicoCompositionShareBins:MexicoCompositionBin[]=[
  {min:0,max:1,color:'#edf3df',label:'1%未満'},
  {min:1,max:5,color:'#d1e6c6',label:'1–5%未満'},
  {min:5,max:10,color:'#a1ceb1',label:'5–10%未満'},
  {min:10,max:25,color:'#70b3a5',label:'10–25%未満'},
  {min:25,max:50,color:'#41958e',label:'25–50%未満'},
  {min:50,max:75,color:'#24756f',label:'50–75%未満'},
  {min:75,max:null,color:'#154d49',label:'75–100%'},
];

export function mexicoCompositionShare(record:MexicoCompositionRecord):number|null {
  if(!['value','zero'].includes(record.status)||record.count===null||record.denominator===null||!Number.isFinite(record.count)||!Number.isFinite(record.denominator)||record.count<0||record.denominator<=0||record.count>record.denominator)return null;
  return record.count/record.denominator*100;
}
export function mexicoCompositionColor(record:MexicoCompositionRecord,metric:MexicoCompositionMetric):string {
  const share=mexicoCompositionShare(record);
  return share===null?'url(#mexico-population-missing)':(metric.shareBins??mexicoCompositionShareBins).find(bin=>share>=bin.min&&(bin.max===null||share<bin.max))?.color??'url(#mexico-population-missing)';
}
export function formatMexicoCompositionShare(record:MexicoCompositionRecord,metric:MexicoCompositionMetric):string {
  const share=mexicoCompositionShare(record);
  if(share===null)return record.status==='confidential'?'秘匿':record.status==='missing'?'欠測':'未取得';
  if(share===0)return '0%';
  const precision=metric.sharePrecision??1,threshold=10**-precision;
  return share<threshold?`<${threshold.toLocaleString('ja-JP',{maximumFractionDigits:precision})}%`:`${share.toLocaleString('ja-JP',{minimumFractionDigits:precision,maximumFractionDigits:precision})}%`;
}
export function mexicoCompositionRadius(record:MexicoCompositionRecord,metric:MexicoCompositionMetric):number {
  const reference=metric.countRadiusReference??10_000_000,maximum=metric.countMaximumRadius??33;
  return ['value','zero'].includes(record.status)&&record.count!==null&&Number.isFinite(record.count)&&record.count>=0&&reference>0&&maximum>0?maximum*Math.sqrt(record.count/reference):0;
}
export function formatMexicoCompositionCountKey(count:number):string {
  return count>=10_000?`${(count/10_000).toLocaleString('ja-JP',{maximumFractionDigits:4})}万人`:`${count.toLocaleString('ja-JP')}人`;
}
export function mexicoCompositionMetric(data:MexicoCompositionData,category:MexicoPopulationCategory,id:string):MexicoCompositionMetric|undefined {
  return data.metrics.find(metric=>metric.category===category&&metric.id===id)??data.metrics.find(metric=>metric.category===category);
}
export function readMexicoCompositionSelection(url:URL,data:MexicoCompositionData,category:MexicoPopulationCategory):MexicoCompositionSelection {
  const p=url.searchParams,metric=mexicoCompositionMetric(data,category,p.get('compositionMetric')??'');
  const source=p.get('compositionFrom'),sourceURL=source?.startsWith('?')?new URL(source,url):null;
  const sourceMetric=sourceURL?data.metrics.find(metric=>metric.category===sourceURL.searchParams.get('category')&&metric.id===sourceURL.searchParams.get('compositionMetric')):undefined;
  const validSource=!!sourceURL&&!sourceURL.searchParams.has('compositionCompare')&&!sourceURL.searchParams.has('compositionFrom')&&!!sourceMetric&&sourceMetric.id===metric?.id&&!!sourceMetric.states[sourceURL.searchParams.get('state')??'']&&['share','count'].includes(sourceURL.searchParams.get('compositionMeasure')??'');
  return {metric:metric?.id??'',measure:p.get('compositionMeasure')==='count'?'count':'share',compare:p.get('compositionCompare')==='scale'&&validSource,sourceQuery:validSource?source:null};
}
export function writeMexicoCompositionSelection(url:URL,selection:MexicoCompositionSelection,category:MexicoPopulationCategory):URL {
  const next=new URL(url);for(const key of mexicoCompositionKeys)next.searchParams.delete(key);
  if(category==='distribution'||!selection.metric)return next;
  next.searchParams.set('compositionMetric',selection.metric);next.searchParams.set('compositionMeasure',selection.measure);
  if(selection.compare&&selection.sourceQuery?.startsWith('?')){next.searchParams.set('compositionCompare','scale');next.searchParams.set('compositionFrom',selection.sourceQuery);}
  return next;
}
export function mexicoCompositionComparisonUrl(source:URL):URL {
  const next=new URL(source);next.searchParams.delete('compositionCompare');next.searchParams.delete('compositionFrom');
  const sourceQuery=next.search;next.searchParams.set('compositionCompare','scale');next.searchParams.set('compositionFrom',sourceQuery);return next;
}
export function mexicoCompositionReturnUrl(current:URL,selection:MexicoCompositionSelection):URL {
  return selection.sourceQuery?.startsWith('?')?new URL(selection.sourceQuery,current):writeMexicoCompositionSelection(current,{...selection,compare:false,sourceQuery:null},current.searchParams.get('category') as MexicoPopulationCategory);
}
