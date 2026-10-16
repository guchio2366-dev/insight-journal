import packet from './selected-quantity-flow.json' with {type:'json'};

type Base={countryCode:string;countryName:string;topic:string;seriesId:string;label:string;unit:string;production:number;worldProduction:number;imports:number;exports:number};
export type EuropeCalendarQuantityFlow=Base & {
  kind:'calendar-quantity-comparison';year:number;productionRaw:string;worldProductionRaw:string;
  productionFlag:string;worldFlag:string;partners:{name:string;value:number}[];partnerRoundingGap:number;
  actualDomesticUse:null;stockVariation:null;feedUse:null;crushUse:null;domesticOriginExports:null;
  source:{productionUrl:string;productionArchiveSha256:string;importUrl:string;exportUrl:string};
};
export type EuropeMarketingQuantityFlow=Base & {
  kind:'marketing-year-balance';year:string;beginningStocks:number;endingStocks:number;domesticUse:number;
  domesticSubset:number;domesticSubsetLabel:string;roundingGap:number;partners:null;rawLine:string;worldRawLine:string;notes:string[];
  source:{url:string;page:number;path:string;sha256:string};
};
export type EuropeSelectedQuantityFlow=EuropeCalendarQuantityFlow|EuropeMarketingQuantityFlow;
export const europeSelectedQuantitySources = packet.sources;

/** No substitute country, year, product or regional sum is returned. */
export function europeSelectedQuantityFlow(country:string, topic:string):EuropeSelectedQuantityFlow|undefined {
  const row=(packet.records as EuropeSelectedQuantityFlow[]).find(row=>row.countryCode===country&&row.topic===topic);
  return row?structuredClone(row):undefined;
}
