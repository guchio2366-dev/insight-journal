import data from '../../../public/assets/atlas/industry-v1/state-economy.json' with {type:'json'};
import {economicCircleRadius} from './industry-regional-economy';
export type StateEconomyField=typeof data.fields[keyof typeof data.fields];
export function industryStateComparison(sector:string,subsector:string){
 const field=(data.fields as Record<string,StateEconomyField>)[subsector];
 if(sector==='all'||subsector==='all'||!field||field.sector!==sector)return null;
 const rows=field.rows.map(r=>({...data.states.find(s=>s.id===r.id)!,...r,status:r.status==='missing'&&r.cells.some(c=>c.status==='unavailable')?'unavailable':r.status}));
 const valid=rows.filter(r=>r.value!==null&&r.value>0).sort((a,b)=>b.value!-a.value!||a.id.localeCompare(b.id));
 if(valid.length<2)return null;
 const max=valid[0].value!;
 const points=valid.map(r=>({...r,value:r.value!,radius:economicCircleRadius(r.value!,max),rank:1+valid.filter(p=>p.value!>r.value!).length}));
 return {...field,sourceInfo:data.sources[field.source as keyof typeof data.sources],max,total:rows.filter(r=>r.value!==null).length,rows,points};
}
export type StateEconomyComparison=NonNullable<ReturnType<typeof industryStateComparison>>;
export function stateEconomyValue(value:number,comparison:StateEconomyComparison){return (value/comparison.divisor).toLocaleString('ja-JP',{maximumFractionDigits:2});}
export const stateEconomyStatus=(status:string)=>({published:'公表値',zero:'公表ゼロ',suppressed:'秘匿',missing:'未収録',unavailable:'利用不可'}[status]??'利用不可');
