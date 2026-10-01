export type MexicoAgricultureMetric = 'maize' | 'irrigation' | 'pine';
export interface MexicoAgricultureState {
  metric: MexicoAgricultureMetric;
  state: string;
  only: boolean;
  fallback: boolean;
}
export interface MexicoAgricultureRecord {
  code: string;
  name: string;
  nameJa: string;
  agriculturalAreaHa: number;
  irrigatedAreaHa: number;
  rainfedAreaHa: number;
  irrigationSharePct: number;
  maizeWhiteProductionT: number;
  maizeWhiteIrrigatedProductionT: number;
  maizeWhiteRainfedProductionT: number;
  pineObtainedM3: number;
  status: string;
}
export const agricultureMetrics = [
  {id: 'maize' as const, name: '白粒トウモロコシ', unit: 't', defaultState: '25',
    title: '白粒の生産は、どこに集まる？', color: '#b87820',
    caption: '露地の一年生作物・白粒の穀粒生産量。円の面積は州合計に比例します。',
    comparisonTitle: '白粒生産と乾燥気候を比べる',
    comparisonDescription: '気候分布と元の白粒生産量を並べ、灌漑率と秋冬作の説明から水の条件を読む。',
    table: 'ca2022_agr02'},
  {id: 'irrigation' as const, name: '灌漑農地率', unit: '%', defaultState: '25',
    title: '農地は、どれほど灌漑に支えられる？', color: '#3d713a',
    caption: '農業用地総面積に占める灌漑面積。州の総面積や生産量を分母にしません。',
    comparisonTitle: '乾燥気候と灌漑率を比べる',
    comparisonDescription: '気候分布と元の灌漑農地率を並べ、雨だけに頼らない耕作の条件を読む。',
    table: 'ca2022_11'},
  {id: 'pine' as const, name: '松材取得量', unit: 'm³', defaultState: '10',
    title: '松材の取得は、どの山地側に集まる？', color: '#3b7063',
    caption: '取得した松材の体積。円の面積は州合計に比例し、森林の広さを表しません。',
    comparisonTitle: '松材取得と山地を比べる',
    comparisonDescription: '地形と元の松材取得量を並べ、冷涼な山地の森林資源が木材供給につながる背景を読む。',
    table: 'ca2022_for15'},
];
export const agricultureSymbolKeys = {maize: [100000, 1000000, 5000000], pine: [100000, 1000000, 4000000]};
export const irrigationBins = [
  {min: 0, max: 25, label: '0～25%未満', color: '#e8f1d8'},
  {min: 25, max: 50, label: '25～50%未満', color: '#c0d991'},
  {min: 50, max: 75, label: '50～75%未満', color: '#7fad57'},
  {min: 75, max: 100, label: '75～100%', color: '#396e37'},
];
export function irrigationColor(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 100) return '#e5e5df';
  return (irrigationBins.find(bin => value >= bin.min && value < bin.max) ?? irrigationBins[3]).color;
}
/** Circle area, not radius, encodes volume. The domain remains all 32 states. */
export function quantityRadius(value: number, maximum: number, maximumRadius = 32): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || value <= 0 || maximum <= 0) return 0;
  return maximumRadius * Math.sqrt(value / maximum);
}
export function agricultureValue(record: MexicoAgricultureRecord, metric: MexicoAgricultureMetric): number {
  return metric === 'irrigation' ? record.irrigationSharePct : metric === 'pine' ? record.pineObtainedM3 : record.maizeWhiteProductionT;
}
export function formatAgricultureValue(value: number, metric: MexicoAgricultureMetric, includeUnit = true): string {
  if (!Number.isFinite(value)) return '未取得';
  const unit = agricultureMetrics.find(item => item.id === metric)!.unit;
  const number = value.toLocaleString('ja-JP', {maximumFractionDigits: metric === 'irrigation' ? 1 : 0,
    minimumFractionDigits: metric === 'irrigation' ? 1 : 0});
  return `${number}${includeUnit ? ` ${unit}` : ''}`;
}
export function readMexicoAgricultureState(url: URL, codes: string[] = Array.from({length: 32}, (_, i) => `${i + 1}`.padStart(2, '0'))): MexicoAgricultureState {
  const rawMetric = url.searchParams.get('metric');
  const metric = agricultureMetrics.some(item => item.id === rawMetric) ? rawMetric as MexicoAgricultureMetric : 'maize';
  const defaultState = agricultureMetrics.find(item => item.id === metric)!.defaultState;
  const rawCode = url.searchParams.get('state') ?? defaultState;
  const code = /^\d{1,2}$/.test(rawCode) ? rawCode.padStart(2, '0') : '';
  return {metric, state: codes.includes(code) ? code : defaultState,
    only: ['1', 'true'].includes(url.searchParams.get('only') ?? ''),
    fallback: ['1', 'true'].includes(url.searchParams.get('fallback') ?? '')};
}
export function writeMexicoAgricultureState(url: URL, state: MexicoAgricultureState): URL {
  const result = new URL(url.href);
  result.searchParams.set('metric', state.metric);
  result.searchParams.set('state', state.state);
  for (const key of ['only', 'fallback'] as const) {
    if (state[key]) result.searchParams.set(key, '1');
    else result.searchParams.delete(key);
  }
  return result;
}
export function agricultureNatureComparisonUrl(naturePath: string, state: MexicoAgricultureState, origin = 'https://example.invalid'): URL {
  const result = new URL(naturePath, origin);
  result.searchParams.set('compare', 'irrigation');
  result.searchParams.set('state', state.state);
  result.searchParams.set('from', 'agriculture');
  result.searchParams.set('sourceMetric', state.metric);
  result.searchParams.set('sourceState', state.state);
  result.searchParams.set('sourceOnly', state.only ? '1' : '0');
  result.searchParams.set('sourceFallback', state.fallback ? '1' : '0');
  return result;
}
