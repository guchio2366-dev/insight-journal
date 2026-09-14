export type ProductionCountry = { code:string; country:string; value:number; members?:readonly string[] };
export type ProductionTrend = { year:number; us:number; world:number; share:number };

/** A partition of the reported world total, never a renormalized top-country list. */
export function productionShares(worldTotal:number, countries:readonly ProductionCountry[]) {
  if(!Number.isFinite(worldTotal)||worldTotal<=0)throw new Error('World production must be positive');
  const seen=new Set<string>();
  for(const row of countries){
    if(!row.code||seen.has(row.code)||!Number.isFinite(row.value)||row.value<0)throw new Error('Invalid or duplicate production country');
    seen.add(row.code);
  }
  for(const row of countries){
    if(row.members?.some(code=>seen.has(code)))throw new Error('Overlapping production aggregates');
    if(['E4','EU','EU27'].includes(row.code)&&countries.some(c=>['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'].includes(c.code)))throw new Error('EU/member overlap');
  }
  const us=countries.find(row=>row.code==='US');
  if(!us||us.value>worldTotal)throw new Error('Missing or invalid US production');
  if(countries.reduce((sum,row)=>sum+row.value,0)>worldTotal)throw new Error('Country production exceeds world total');
  const selected=[...countries].sort((a,b)=>b.value-a.value).slice(0,5);
  if(!selected.some(row=>row.code==='US'))selected.push(us);
  const other=worldTotal-selected.reduce((sum,row)=>sum+row.value,0);
  return [...selected,{code:'OTHER',country:'Other',value:other}].map(row=>({...row,share:row.value/worldTotal*100}));
}

export function validateProductionTrend(trend:readonly ProductionTrend[], worldTotal:number, us:number) {
  if(trend.length<2)throw new Error('Production trend is too short');
  for(let i=0;i<trend.length;i++){
    const row=trend[i];
    if(!Number.isInteger(row.year)||!Number.isFinite(row.us)||!Number.isFinite(row.world)||row.world<=0||row.us<0||row.us>row.world||Math.abs(row.share-row.us/row.world*100)>.001||(i>0&&row.year!==trend[i-1].year+1))throw new Error('Invalid or incomplete production trend');
  }
  const last=trend.at(-1)!;
  if(last.world!==worldTotal||last.us!==us)throw new Error('Production endpoint does not match');
}
