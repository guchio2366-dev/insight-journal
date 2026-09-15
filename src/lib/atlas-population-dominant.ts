export const ethnicityColors=['#376a85','#ad6657','#ccac53','#579792','#897bac','#96977d','#bb87a1','#767e83'] as const;
/** Eight mutually exclusive ACS estimates. A tie, missing estimate or no residents has no unique winner. */
export function dominantCategory(counts:unknown):number|null{
 if(!Array.isArray(counts)||counts.length!==8)return null;
 const estimates=counts.map(pair=>Array.isArray(pair)?pair[0]:null);
 if(estimates.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0))return null;
 const maximum=Math.max(...estimates);
 return maximum>0&&estimates.filter(n=>n===maximum).length===1?estimates.indexOf(maximum):null;
}
