/** Country statistics share a year and GDP denominator; other places use
 * the individually sourced industrial cases. */
export const europeIndustryCountries = ['DEU', 'GBR', 'FRA', 'ITA'] as const;
export const europeIndustryGroups = ['資源・素材', '機械・輸送', '技術・医薬', '物流・サービス'] as const;
export type EuropeIndustryGroup = typeof europeIndustryGroups[number];
export function normaliseEuropeIndustryGroup(value: unknown): EuropeIndustryGroup | undefined {
  return europeIndustryGroups.find(group => group === value);
}
export function isEuropeIndustryCountry(code: string): boolean {
  return (europeIndustryCountries as readonly string[]).includes(code);
}
export const europeIndustryGroupCopy: Record<EuropeIndustryGroup, string> = {
  '資源・素材': 'キルナの鉄鉱石、ロッテルダムとルートヴィヒスハーフェンの化学、ラッペーンランタの木材加工を比べます。原料の採掘・加工と製品の製造を同じ生産量として数えません。',
  '機械・輸送': '自動車のミュンヘン、ムラダー・ボレスラフ、クヴァシニと、航空機のトゥールーズ、ハンブルク、ブラショフを比べます。各点は国際的な生産網の一地点で、国全体の生産額を表しません。',
  '技術・医薬': 'フェルトホーフェンの半導体製造装置、カロンボーの医薬品原薬、オウルの無線通信を比べます。研究・装置製造・原薬生産など、工程の異なる拠点を個別の出典で読みます。',
  '物流・サービス': '欧州中央銀行が所在するフランクフルトを読みます。中央銀行の位置を都市全体の金融雇用や生産額の指標にはしていません。港湾に結びつく原料・加工拠点は「資源・素材」で比べられます。',
};
