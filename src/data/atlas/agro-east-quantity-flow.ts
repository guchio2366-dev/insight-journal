import retained from './agro-east-quantity-flow.json' with {type:'json'};

/** National quantity comparison, not a traced partition of domestic production.
 * Partner codes are the labels actually retained by WITS, not inferred ISO codes. */
export type AgroEastQuantityFlow = (typeof retained.records)[number];

/** Only a verified, selected national product has a record. Regional overviews,
 * Japan and unverified commodities remain undefined; no year/product fallback. */
export function agroEastQuantityFlow(countryCode: string, seriesId: string): AgroEastQuantityFlow | undefined {
  const record = retained.records.find(row => row.countryCode === countryCode && row.seriesId === seriesId);
  return record ? structuredClone(record) : undefined;
}
