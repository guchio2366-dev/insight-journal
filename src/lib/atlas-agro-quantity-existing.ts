import {agroMarketingYearFlow,agroMarketingYearFlows} from '../data/atlas/agro-marketing-year-flow.ts';
import type {AgroQuantity,AgroQuantityRecord,AgroRegionId} from './atlas-agro-quantity-contract.ts';

const regions:Record<string,AgroRegionId>={USA:'us',CAN:'canada',MEX:'mexico',BRA:'latin-america',ARG:'latin-america',PRY:'latin-america',AUS:'oceania',CHN:'east-asia',IND:'south-asia',KAZ:'central-asia'};

/** Audit adapter for retained WASDE observations. It adds no partner data and
 * does not use calendar-year trade to complete a marketing-year record. */
export function existingAgroMarketingQuantity(countryCode:string,seriesId:string):AgroQuantityRecord|undefined{
  const row=agroMarketingYearFlow(countryCode,seriesId),region=regions[countryCode];
  if(!row||!region)return undefined;
  const sourceId='wasde-675';
  const amount=(key:string,value:number,raw:string):AgroQuantity=>({value,basis:'wasde',sourceIds:[sourceId],raw,quality:'reported',...(key==='imports'&&'importsQuality' in row?{flag:row.importsQuality}:{})});
  const raw=row.rawValues as Record<string,string>;
  const source={id:sourceId,title:row.source.report,url:row.source.url,file:row.source.path,sha256:row.source.sha256,locator:`${countryCode} ${row.year} · p.${row.source.page}; World p.${'worldPage' in row.source?row.source.worldPage:row.source.page}`,kind:'official-extract' as const};
  return {
    id:`wasde-675-${countryCode}-${seriesId}`,region,seriesId,
    scope:{id:countryCode,label:row.countryName,kind:'country',members:[countryCode],observedMembers:[countryCode]},
    bases:{wasde:{period:row.year,periodKind:'marketing',product:seriesId,definition:row.label,unit:row.unit,edition:row.source.report+' '+row.source.releaseDate}},sources:[source],
    production:amount('production',row.production,raw.production),
    worldProduction:amount('worldProduction',row.worldProduction,row.worldProductionRawValue),
    balance:{method:'reported',imports:amount('imports',row.imports,raw.imports),exports:amount('exports',row.exports,raw.exports),domesticUse:amount('domesticUse',row.domesticUse,raw.domesticUse),
      stocks:{kind:'levels',beginning:amount('beginningStocks',row.beginningStocks,raw.beginningStocks),ending:amount('endingStocks',row.endingStocks,raw.endingStocks)},
      ...('lossAdjustment' in row?{adjustment:{amount:amount('lossAdjustment',row.lossAdjustment,raw.lossAdjustment),side:'use' as const}}:{}),
      components:row.domesticSubset?[{id:'retained-domestic-subset',label:row.domesticSubset.label,amount:amount('domesticSubset',row.domesticSubset.value,raw.domesticSubset)}]:[],
      tolerance:{absolute:row.roundingTolerance,explanation:'Retained canonical WASDE check: original two-decimal quantities and their recorded rounding tolerance.'},notes:[...row.notes]},
    trade:{boundary:'foreign',coverage:'missing',totalExports:amount('exports',row.exports,raw.exports),partners:[],tolerance:{absolute:0,explanation:'No partner quantities are retained.'},notes:['同じ販売年度・商品基準の全相手数量は未収録。別暦年の相手を接合しません。']},
  };
}

export function existingAgroMarketingQuantities(){
  return agroMarketingYearFlows.map(row=>existingAgroMarketingQuantity(row.countryCode,row.seriesId)!).filter(Boolean);
}
