import canonical from './south-asia-agro-flow.json' with {type:'json'};

export const southAsiaAgroCountries = ['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK'] as const;
export type SouthAsiaAgroFlow = (typeof canonical.records)[number];

/** The selected map product is a navigation key, never a statistical crosswalk.
 * Each packet explicitly labels its milled/lint basis instead of mutating QCL. */
export function southAsiaAgroFlow(country:string, selectionSeriesId:string):SouthAsiaAgroFlow|undefined {
 const row=canonical.records.find(row=>row.countryCode===country&&row.selectionSeriesId===selectionSeriesId);
 return row?structuredClone(row):undefined;
}
