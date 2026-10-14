import canonical from './agro-marketing-year-flow.json' with {type:'json'};

/** Same-table, same-revision, same-commodity quantities. Publisher marketing
 * years are not a common calendar year. Unretained destination records stay null. */
export type AgroMarketingYearFlow = (typeof canonical.records)[number];
export const agroMarketingYearFlows = canonical.records;
export const agroMarketingYearFlowMethod = canonical.method;

export function agroMarketingYearFlow(countryCode:string, seriesId:string):AgroMarketingYearFlow|undefined {
  return agroMarketingYearFlows.find(row => row.countryCode === countryCode && row.seriesId === seriesId);
}
