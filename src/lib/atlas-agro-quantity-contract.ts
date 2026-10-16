/** Selected-product quantities only. This module neither changes the published
 * overview nor supplies a country's missing observations from another country. */
export const agroRegionIds = ['us','canada','mexico','europe','east-asia','southeast-asia','south-asia','central-asia','west-asia','africa','oceania','latin-america','russia'] as const;
export type AgroRegionId = typeof agroRegionIds[number];

export type AgroQuantityBasis = {
  period: string;
  periodKind: 'calendar'|'marketing'|'fiscal'|'average';
  product: string;
  definition: string;
  unit: string;
  edition: string;
};
export type AgroQuantitySource = {
  id: string;
  title: string;
  url: string;
  file: string;
  sha256: string;
  locator: string;
  kind: 'original'|'official-extract';
};
export type AgroQuantity = {
  value: number|null;
  basis: string;
  sourceIds: string[];
  raw: string|null;
  quality: 'reported'|'estimated'|'derived'|'missing';
  flag?: string;
  derivation?: string;
};
export type AgroQuantityTolerance = {absolute:number; explanation:string};
export type AgroQuantityRecord = {
  id: string;
  region: AgroRegionId;
  seriesId: string;
  scope: {id:string; label:string; kind:'country'|'region'; members:string[]; observedMembers:string[]};
  bases: Record<string,AgroQuantityBasis>;
  sources: AgroQuantitySource[];
  production: AgroQuantity;
  worldProduction: AgroQuantity;
  balance: {
    method:'reported'|'apparent-stock-unadjusted'|'unavailable';
    imports:AgroQuantity;
    exports:AgroQuantity;
    domesticUse:AgroQuantity;
    stocks: {kind:'levels'; beginning:AgroQuantity; ending:AgroQuantity}
      | {kind:'change'; change:AgroQuantity; positiveMeans:'supply-withdrawal'|'stock-addition'}
      | {kind:'not-published'};
    adjustment?: {amount:AgroQuantity; side:'supply'|'use'};
    components?: {id:string; label:string; amount:AgroQuantity; parentId?:string}[];
    tolerance:AgroQuantityTolerance;
    notes:string[];
  };
  trade: {
    boundary:'foreign'|'external-region';
    coverage:'complete'|'partial'|'missing';
    totalExports:AgroQuantity;
    partners:{id:string; label:string; kind:'partner'|'reported-other'; amount:AgroQuantity}[];
    tolerance:AgroQuantityTolerance;
    notes:string[];
  };
  unresolved?:{field:string; reason:string; evidence:string[]}[];
};
export type AgroQuantityAssessment = {
  status:'complete'|'qualified'|'partial'|'invalid';
  errors:string[];
  gaps:string[];
  qualifications:string[];
};

/** Semantic comparability is explicit. Product IDs must include processing and
 * conversion basis; a shared display name is never a commodity crosswalk. */
export function agroQuantityComparable(record:AgroQuantityRecord,a:AgroQuantity,b:AgroQuantity,sameEdition=false){
  const x=record.bases[a.basis],y=record.bases[b.basis];
  return !!x&&!!y&&x.period===y.period&&x.periodKind===y.periodKind&&x.product===y.product&&x.unit===y.unit&&(!sameEdition||x.edition===y.edition);
}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const distinct=(values:string[])=>new Set(values).size===values.length;

/** Invalid claims and unfilled requirements are separate. A qualified apparent
 * quantity can be displayed honestly, but is never classified as actual use. */
export function assessAgroQuantityRecord(record:AgroQuantityRecord):AgroQuantityAssessment{
  const errors:string[]=[],gaps:string[]=[],qualifications:string[]=[];
  const sourceIds=new Set(record.sources.map(source=>source.id));
  if(!record.id||!record.seriesId||!agroRegionIds.includes(record.region))errors.push('record.identity');
  if(!record.scope.id||!record.scope.label||!record.scope.members.length||!distinct(record.scope.members)||!distinct(record.scope.observedMembers))errors.push('scope.members');
  if(record.scope.observedMembers.some(code=>!record.scope.members.includes(code)))errors.push('scope.observed-outside-members');
  if(record.scope.kind==='country'&&(record.scope.members.length!==1||record.scope.members[0]!==record.scope.id))errors.push('scope.country-proxy');
  if(record.scope.members.some(code=>!record.scope.observedMembers.includes(code)))gaps.push('scope.coverage');
  if(sourceIds.size!==record.sources.length)errors.push('sources.duplicate-id');
  for(const source of record.sources){
    if(!source.id||!source.title||!source.locator||!/^https?:\/\//.test(source.url)||!/^[a-f0-9]{64}$/.test(source.sha256)||!source.file||source.file.startsWith('/')||source.file.split('/').includes('..'))errors.push(`source.${source.id}.provenance`);
  }
  for(const [id,basis] of Object.entries(record.bases)){
    if(!basis.period||!basis.product||!basis.definition||!basis.unit||!basis.edition||!['calendar','marketing','fiscal','average'].includes(basis.periodKind))errors.push(`basis.${id}.definition`);
  }
  const quantity=(field:string,amount:AgroQuantity,signed=false)=>{
    if(!record.bases[amount.basis])errors.push(`${field}.basis`);
    if(amount.value===null){gaps.push(field);return null;}
    if(!finite(amount.value)||!signed&&amount.value<0)errors.push(`${field}.value`);
    if(amount.quality==='missing')errors.push(`${field}.missing-is-not-zero`);
    if(!amount.sourceIds.length||amount.sourceIds.some(id=>!sourceIds.has(id)))errors.push(`${field}.source`);
    if(amount.quality==='derived'?!amount.derivation:amount.raw===null||!amount.raw.trim())errors.push(`${field}.raw-or-derivation`);
    return amount.value;
  };
  const tolerance=(field:string,value:AgroQuantityTolerance)=>{
    if(!finite(value.absolute)||value.absolute<0||value.absolute>0&&!value.explanation.trim())errors.push(`${field}.rounding-evidence`);
    return finite(value.absolute)&&value.absolute>=0?value.absolute:0;
  };
  const p=quantity('production',record.production),world=quantity('worldProduction',record.worldProduction);
  if(p!==null&&world!==null){
    if(world<=0||p>world)errors.push('production.world-denominator');
    if(!agroQuantityComparable(record,record.production,record.worldProduction,true))errors.push('production.world-basis');
  }
  const balance=record.balance;
  const imports=quantity('balance.imports',balance.imports),exports=quantity('balance.exports',balance.exports),use=quantity('balance.domesticUse',balance.domesticUse);
  const epsilon=tolerance('balance',balance.tolerance);
  const balanceComparable=[balance.imports,balance.exports,balance.domesticUse].every(amount=>amount.value===null||agroQuantityComparable(record,record.production,amount,balance.method==='reported'));
  if(!balanceComparable)gaps.push('balance.comparable-basis');
  let stockSupply:number|null=null,stockComparable=true,adjustmentComparable=true;
  if(balance.stocks.kind==='levels'){
    const begin=quantity('balance.beginningStocks',balance.stocks.beginning),end=quantity('balance.endingStocks',balance.stocks.ending);
    stockComparable=[balance.stocks.beginning,balance.stocks.ending].every(amount=>agroQuantityComparable(record,record.production,amount,balance.method==='reported'));
    if(!stockComparable)gaps.push('balance.stock-basis');
    if(begin!==null&&end!==null)stockSupply=begin-end;
  }else if(balance.stocks.kind==='change'){
    const change=quantity('balance.stockChange',balance.stocks.change,true);
    stockComparable=agroQuantityComparable(record,record.production,balance.stocks.change,balance.method==='reported');
    if(!stockComparable)gaps.push('balance.stock-basis');
    if(change!==null)stockSupply=change*(balance.stocks.positiveMeans==='supply-withdrawal'?1:-1);
  }
  let adjustment=0;
  if(balance.adjustment){
    const value=quantity('balance.adjustment',balance.adjustment.amount,true);
    adjustmentComparable=agroQuantityComparable(record,record.production,balance.adjustment.amount,balance.method==='reported');
    if(!adjustmentComparable)gaps.push('balance.adjustment-basis');
    if(value!==null)adjustment=value*(balance.adjustment.side==='supply'?1:-1);
  }
  if(balance.method==='unavailable')gaps.push('balance.method');
  if(balance.method==='reported'&&stockSupply===null)gaps.push('balance.stocks');
  if(balance.method==='apparent-stock-unadjusted'){
    qualifications.push('balance.apparent-not-actual-consumption');
    if(!balance.notes.length)errors.push('balance.apparent-definition');
    if(p!==null&&imports!==null&&exports!==null&&use!==null&&balanceComparable&&Math.abs(p+imports-exports-use)>epsilon+1e-9)errors.push('balance.apparent-equation');
    if(balance.domesticUse.quality!=='derived')errors.push('balance.apparent-reported-as-use');
  }else if(balance.method==='reported'&&p!==null&&imports!==null&&exports!==null&&use!==null&&stockSupply!==null&&balanceComparable&&stockComparable&&adjustmentComparable){
    if(Math.abs(p+imports+stockSupply+adjustment-exports-use)>epsilon+1e-9)errors.push('balance.equation');
  }
  if(p!==null&&exports!==null&&exports>p)qualifications.push('balance.exports-exceed-production-not-an-allocation');
  const components=balance.components??[],componentIds=new Set(components.map(component=>component.id));
  if(componentIds.size!==components.length)errors.push('balance.components.duplicate');
  for(const component of components){
    quantity(`balance.component.${component.id}`,component.amount);
    if(!agroQuantityComparable(record,balance.domesticUse,component.amount))gaps.push(`balance.component.${component.id}.basis`);
    if(component.parentId&&(!componentIds.has(component.parentId)||component.parentId===component.id))errors.push(`balance.component.${component.id}.parent`);
    const seen=new Set([component.id]);let parent=component.parentId;
    while(parent){if(seen.has(parent)){errors.push('balance.components.cycle');break;}seen.add(parent);parent=components.find(candidate=>candidate.id===parent)?.parentId;}
  }
  if(use!==null&&components.filter(component=>!component.parentId).reduce((sum,component)=>sum+(component.amount.value??0),0)>use+epsilon)errors.push('balance.components.exceed-use');
  for(const parent of components){
    const children=components.filter(component=>component.parentId===parent.id);
    if(parent.amount.value!==null&&children.reduce((sum,component)=>sum+(component.amount.value??0),0)>parent.amount.value+epsilon)errors.push(`balance.component.${parent.id}.children-exceed-parent`);
  }
  const trade=record.trade,total=quantity('trade.totalExports',trade.totalExports),tradeEpsilon=tolerance('trade',trade.tolerance);
  if(record.scope.kind==='region'&&trade.boundary!=='external-region'||record.scope.kind==='country'&&trade.boundary!=='foreign')errors.push('trade.boundary');
  if(trade.coverage!=='complete')gaps.push('trade.coverage');
  if(!agroQuantityComparable(record,balance.exports,trade.totalExports))gaps.push('trade.balance-basis');
  else if(exports!==null&&total!==null&&Math.abs(exports-total)>tradeEpsilon+1e-9)gaps.push('trade.balance-total');
  if(!distinct(trade.partners.map(partner=>partner.id)))errors.push('trade.duplicate-partner');
  let sum=0,hasMissing=false;
  for(const partner of trade.partners){
    const value=quantity(`trade.partner.${partner.id}`,partner.amount);if(value===null)hasMissing=true;else sum+=value;
    if(!agroQuantityComparable(record,trade.totalExports,partner.amount))errors.push(`trade.partner.${partner.id}.basis`);
    if(partner.kind==='partner'&&record.scope.members.includes(partner.id)){
      if(record.scope.kind==='region')errors.push(`trade.partner.${partner.id}.internal-trade`);
      else qualifications.push('trade.reported-self-partner-not-inferred-domestic-trade');
    }
    if(/^(WLD|WORLD|TOTAL|ALL)$/i.test(partner.id))errors.push(`trade.partner.${partner.id}.aggregate`);
  }
  if(total!==null){
    if(sum>total+tradeEpsilon+1e-9)errors.push('trade.partners-exceed-total');
    if(trade.coverage==='complete'&&!hasMissing&&Math.abs(sum-total)>tradeEpsilon+1e-9)errors.push('trade.complete-total');
    if(total>0&&!trade.partners.length)gaps.push('trade.partners');
    if(total===0&&sum===0)qualifications.push('trade.zero-no-percentage');
  }
  for(const gap of record.unresolved??[])gaps.push(`reported.${gap.field}`);
  const unique=(values:string[])=>[...new Set(values)];
  return {status:errors.length?'invalid':gaps.length?'partial':qualifications.length?'qualified':'complete',errors:unique(errors),gaps:unique(gaps),qualifications:unique(qualifications)};
}
