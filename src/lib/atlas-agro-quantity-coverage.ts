import {agroRegionIds,assessAgroQuantityRecord,type AgroQuantityRecord,type AgroRegionId} from './atlas-agro-quantity-contract.ts';

export type AgroQuantityRegionCoverage={
  id:AgroRegionId;
  inventoryVerified:boolean;
  inventory?:{scopeId:string;seriesId:string;recordId:string}[];
  records:string[];
  qualificationsReviewed?:string[];
  unresolved:{id:string;reason:string}[];
};
export type AgroQuantityCoverage={baseCommit:string;regions:AgroQuantityRegionCoverage[]};

/** A status label or thirteen delivery names cannot substitute for complete
 * item/scope bindings and source-validated quantity records. */
export function assessAgroQuantityCoverage(coverage:AgroQuantityCoverage,records:AgroQuantityRecord[]){
  const errors:string[]=[],gaps:string[]=[],summaries:{region:string;required:number;complete:number;qualified:number;partial:number;invalid:number}[]=[];
  if(!/^[a-f0-9]{40}$/.test(coverage.baseCommit))errors.push('coverage.base-commit');
  const ids=coverage.regions.map(region=>region.id),recordIds=records.map(record=>record.id);
  if(new Set(ids).size!==ids.length)errors.push('coverage.duplicate-region');
  if(ids.some(id=>!agroRegionIds.includes(id)))errors.push('coverage.unknown-region');
  if(new Set(recordIds).size!==recordIds.length)errors.push('coverage.duplicate-record');
  for(const id of agroRegionIds){
    const region=coverage.regions.find(region=>region.id===id);
    if(!region){gaps.push(`${id}.delivery`);continue;}
    const inventory=region.inventory??[];
    if(!region.inventoryVerified)gaps.push(`${id}.inventory-unverified`);
    if(!inventory.length)gaps.push(`${id}.inventory-empty`);
    if(new Set(inventory.map(item=>[item.scopeId,item.seriesId].join('|'))).size!==inventory.length)errors.push(`${id}.inventory-duplicate`);
    if(new Set(region.records).size!==region.records.length)errors.push(`${id}.records-duplicate`);
    const summary={region:id,required:inventory.length,complete:0,qualified:0,partial:0,invalid:0};
    for(const item of inventory){
      const key=`${id}.${item.scopeId}.${item.seriesId}`,record=records.find(record=>record.id===item.recordId);
      if(!region.records.includes(item.recordId)||!record){gaps.push(`${key}.record`);summary.partial++;continue;}
      if(record.region!==id||record.scope.id!==item.scopeId||record.seriesId!==item.seriesId){errors.push(`${key}.wrong-scope-or-product`);summary.invalid++;continue;}
      const assessment=assessAgroQuantityRecord(record);summary[assessment.status]++;
      errors.push(...assessment.errors.map(error=>`${key}.${error}`));
      gaps.push(...assessment.gaps.map(gap=>`${key}.${gap}`));
      if(assessment.status==='qualified'&&!region.qualificationsReviewed?.includes(record.id))gaps.push(`${key}.qualifications-unreviewed`);
    }
    for(const recordId of region.records){
      const record=records.find(record=>record.id===recordId);
      if(!record||record.region!==id)errors.push(`${id}.record-link.${recordId}`);
    }
    for(const unresolved of region.unresolved)gaps.push(`${id}.reported.${unresolved.id}`);
    summaries.push(summary);
  }
  return {dataGatePassed:errors.length===0&&gaps.length===0,errors:[...new Set(errors)],gaps:[...new Set(gaps)],regions:summaries};
}
