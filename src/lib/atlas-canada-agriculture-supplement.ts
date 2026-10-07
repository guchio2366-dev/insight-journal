/** Combine independently published province measures without allocating them to CCS. */
export function combineCanadaAgricultureSources(census: any, supplement: any) {
  const result = structuredClone(census);
  for (const product of Object.values(result.products) as any[]) {
    product.referenceYear = census.year;
    product.resolution = 'ccs';
    product.referenceLabel = '2021年・農業センサス';
    product.sourceName = 'Statistics Canada, Census of Agriculture';
  }
  const absent = () => ({value:null,quality:null,status:'not-covered',components:[]});
  for (const [id, product] of Object.entries(supplement.products) as [string, any][]) {
    const published = (value: number, unit: string) => ({value,quality:null,status:'published',unit,components:[],qualityNote:'この原表に品質等級の記載はありません。'});
    result.products[id] = {...product,national:published(product.nationalValue,product.nationalUnit),resolution:'province'};
    for (const province of result.provinces) province.cells[id] = product.provinces[province.code] === undefined ? absent() : published(product.provinces[province.code], product.unit);
    for (const record of Object.values(result.records) as any[]) record.cells[id] = absent();
  }
  result.supplement = {source:supplement.source,method:supplement.method,licence:supplement.licence};
  return result;
}
