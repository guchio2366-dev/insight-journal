export const ethnicityColors=['#d3d6d4','#218b83','#e28b40','#8870b5','#bd983b','#4f91ba','#bd788e','#927563'] as const;
/** Eight mutually exclusive ACS estimates. A tie, missing estimate or no residents has no unique winner. */
export function dominantCategory(counts:unknown):number|null{
 if(!Array.isArray(counts)||counts.length!==8)return null;
 const estimates=counts.map(pair=>Array.isArray(pair)?pair[0]:null);
 if(estimates.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0))return null;
 const maximum=Math.max(...estimates);
 return maximum>0&&estimates.filter(n=>n===maximum).length===1?estimates.indexOf(maximum):null;
}
