import {irrigationBins as sourceIrrigationBins} from './atlas-mexico-agriculture.ts';
import {mexicoDensityBins} from './atlas-mexico-population.ts';

export const natureViews = ['climate', 'relief'] as const;
export type MexicoNatureView = typeof natureViews[number];
export type MexicoNatureComparison = 'irrigation' | 'population' | null;
export type MexicoNatureIndicator = 'irrigation' | 'density' | 'maize' | 'cattle' | 'pine' | 'population';
export const natureCategories = ['rivers-groundwater', 'precipitation', 'basins', 'elevation'] as const;
export type MexicoNatureCategory = '' | typeof natureCategories[number];
export const natureClassIds = {climate: ['11','12','21','22','31','32','42','51','52','53','54','55','56','57','58','59','61','62','63','64','70'], relief: ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','S/It']} as const;
export interface MexicoNatureState {
  view: MexicoNatureView;
  city: string | null;
  category: MexicoNatureCategory;
  item: string;
  feature: string;
  state: string;
  compare: MexicoNatureComparison;
  only: boolean;
  fallback: boolean;
  frame: number[] | null;
  from: 'agriculture' | 'population' | null;
  sourceState: string;
  sourceOnly: boolean;
  sourceFallback: boolean;
  sourceMetric: 'maize' | 'cattle' | 'irrigation' | 'pine';
  sourceCrops: boolean;
  sourceLivestock: boolean;
  sourceOnlyItem: boolean;
  sourceView: 'density' | 'population';
}
const validState = (value: string | null, codes: readonly string[], fallback: string) => value && codes.includes(value) ? value : fallback;
export function readMexicoNatureState(url: URL, codes: readonly string[]): MexicoNatureState {
  const q = url.searchParams, compare = q.get('compare');
  const comparison = compare === 'irrigation' || compare === 'population' ? compare : null;
  const state = validState(q.get('state'), codes, comparison === 'population' ? '09' : '25');
  const frame = q.get('frame')?.split(',').map(Number);
  const validFrame = frame?.length === 4 && frame.every(Number.isFinite) && frame[0] >= -100 && frame[0] <= 900 && frame[1] >= -100 && frame[1] <= 580 && frame[2] >= 35 && frame[2] <= 1000 && frame[3] >= 25 && frame[3] <= 700;
  const metric = q.get('sourceMetric'), view = q.get('view'), from = q.get('from');
  const selectedView: MexicoNatureView = natureViews.includes(view as MexicoNatureView) ? view as MexicoNatureView : comparison === 'population' || (comparison === 'irrigation' && from === 'agriculture' && metric === 'pine') ? 'relief' : 'climate';
  const item = q.get('item') ?? '', feature = q.get('feature') ?? '';
  return {
    view: selectedView,
    city: q.get('city'),
    category: natureCategories.includes(q.get('category') as typeof natureCategories[number]) ? q.get('category') as MexicoNatureCategory : '',
    item: [...natureClassIds.climate, ...natureClassIds.relief].includes(item as never) ? item : '',
    feature: /^(climate|relief)-[1-9][0-9]*$/.test(feature) ? feature : '',
    state, compare: comparison, only: q.get('only') === '1' || (!q.has('only') && q.get('sourceOnly') === '1'), fallback: q.get('fallback') === '1', frame: validFrame ? frame! : null,
    from: from === 'agriculture' || from === 'population' ? from : null,
    sourceState: validState(q.get('sourceState'), codes, state), sourceOnly: q.get('sourceOnly') === '1' || (!q.has('sourceOnly') && q.get('only') === '1'),
    sourceFallback: q.get('sourceFallback') === '1' || (!q.has('sourceFallback') && q.get('fallback') === '1'),
    sourceMetric: metric === 'maize' || metric === 'cattle' || metric === 'pine' || metric === 'irrigation' ? metric : 'irrigation', sourceView: q.get('sourceView') === 'population' ? 'population' : 'density',
    sourceCrops: q.get('sourceCrops') !== '0', sourceLivestock: q.get('sourceLivestock') !== '0', sourceOnlyItem: q.get('sourceOnlyItem') === '1',
  };
}
export function writeMexicoNatureState(url: URL, state: MexicoNatureState): URL {
  const next = new URL(url);
  for (const key of ['view', 'city', 'category', 'item', 'feature', 'state', 'compare', 'only', 'fallback', 'frame', 'from', 'sourceState', 'sourceOnly', 'sourceFallback', 'sourceMetric', 'sourceView', 'sourceCrops', 'sourceLivestock', 'sourceOnlyItem']) next.searchParams.delete(key);
  next.searchParams.set('view', state.view); next.searchParams.set('state', state.state);
  if (state.city !== null && typeof state.city === 'string') next.searchParams.set('city', state.city);
  if (state.category && natureCategories.includes(state.category)) next.searchParams.set('category', state.category);
  if (state.item && [...natureClassIds.climate, ...natureClassIds.relief].includes(state.item as never)) next.searchParams.set('item', state.item);
  if (state.feature && /^(climate|relief)-[1-9][0-9]*$/.test(state.feature)) next.searchParams.set('feature', state.feature);
  if (state.compare) next.searchParams.set('compare', state.compare);
  if (state.only) next.searchParams.set('only', '1');
  else if (state.from && state.sourceOnly) next.searchParams.set('only', '0');
  if (state.fallback) next.searchParams.set('fallback', '1');
  if (state.frame) next.searchParams.set('frame', state.frame.map(value => Math.round(value * 100) / 100).join(','));
  if (state.from) {
    next.searchParams.set('from', state.from); next.searchParams.set('sourceState', state.sourceState); next.searchParams.set('sourceOnly', state.sourceOnly ? '1' : '0');
    next.searchParams.set('sourceFallback', state.sourceFallback ? '1' : '0');
    if (state.from === 'agriculture') {next.searchParams.set('sourceMetric', state.sourceMetric); next.searchParams.set('sourceCrops', state.sourceCrops ? '1' : '0'); next.searchParams.set('sourceLivestock', state.sourceLivestock ? '1' : '0'); next.searchParams.set('sourceOnlyItem', state.sourceOnlyItem ? '1' : '0');}
    if (state.from === 'population') next.searchParams.set('sourceView', state.sourceView);
  }
  return next;
}
export function mexicoNatureReturnUrl(base: string, state: MexicoNatureState): string {
  const q = new URLSearchParams({state: state.from ? state.sourceState : state.state});
  if (state.from === 'agriculture') {q.set('metric', state.sourceMetric); if (!state.sourceCrops) q.set('crops', '0'); if (!state.sourceLivestock) q.set('livestock', '0'); if (state.sourceOnlyItem) q.set('onlyItem', '1');}
  if (state.from === 'population') q.set('view', state.sourceView);
  if (state.sourceOnly) q.set('only', '1');
  if (state.sourceFallback) q.set('fallback', '1');
  return `${base}?${q}`;
}
// Preserve the exact source-page classification, colors and labels in comparisons.
export function mexicoNatureIndicator(state: MexicoNatureState): MexicoNatureIndicator {
  if (state.compare === 'population') return state.from === 'population' && state.sourceView === 'population' ? 'population' : 'density';
  return state.from === 'agriculture' ? state.sourceMetric : 'irrigation';
}
export function mexicoNatureNormalView(state: MexicoNatureState, view: MexicoNatureView): MexicoNatureState {
  return {...state, view, category: '', item: '', feature: '', compare: null, only: false, from: null, sourceState: state.state, sourceOnly: false, sourceFallback: state.fallback, sourceMetric: 'irrigation', sourceView: 'density'};
}
// A natural-layer choice changes the target while keeping the original comparison.
export function mexicoNatureSelectView(state: MexicoNatureState, view: MexicoNatureView): MexicoNatureState {
  return {...state, view, category: ''};
}
// Both maps share one camera; source-page selections remain independent of it.
export function mexicoNatureZoomFrame(frame: number[] | null, full: readonly number[], direction: 'in' | 'out'): number[] | null {
  const [left, top, width, height] = full;
  const [x, y, currentWidth, currentHeight] = frame ?? full;
  const factor = direction === 'in' ? .75 : 1 / .75;
  const nextWidth = Math.min(width, Math.max(35, currentWidth * factor));
  const nextHeight = Math.min(height, Math.max(25, currentHeight * factor));
  if (nextWidth === width && nextHeight === height) return null;
  return [Math.max(left, Math.min(left + width - nextWidth, x + (currentWidth - nextWidth) / 2)), Math.max(top, Math.min(top + height - nextHeight, y + (currentHeight - nextHeight) / 2)), nextWidth, nextHeight];
}
export const irrigationBins = sourceIrrigationBins.map(bin => ({...bin, minimum: bin.min}));
export const densityBins = mexicoDensityBins.map(bin => ({...bin, minimum: bin.min}));
export function indicatorColor(value: number | null, bins: {minimum: number; color: string}[]): string {
  if (value === null || !Number.isFinite(value) || value < 0) return '#c6c9cb';
  return [...bins].reverse().find(bin => value >= bin.minimum)?.color ?? bins[0].color;
}
export function natureComparisonReading(comparison: MexicoNatureComparison, stateCode: string): {lead: string; body: string; consequence: string} {
  if (comparison === 'population') return stateCode === '09' || stateCode === '15' ? {
    lead: '中央部の火山帯に位置する首都圏と、人口の集中を比べる。',
    body: 'メキシコ市とメキシコ州は、中央部の都市・交通・市場を結ぶ首都圏を構成する。地形地域の位置と州平均の人口密度を見比べ、人口がどこに集中しているかを確かめる。',
    consequence: '人口と産業の集積は、水供給・交通・住宅への需要を大きくする。',
  } : {
    lead: '地形地域と州平均の人口密度を、同じ範囲で比べる。',
    body: '山系・高原・沿岸平原をまたぐ州もある。自然地理の区分と州の平均値は別の粒度として読み、都市や交通・市場の位置と結び付ける。',
    consequence: '人口密度は州全体の平均。都市の局地的な集積は人口分野の規模と併せて読む。',
  };
  return ['02', '03', '25', '26'].includes(stateCode) ? {
    lead: '北西部では、乾燥する地域の農業を灌漑が支える。',
    body: '左の気候区分で北西部の乾燥域を、右の州別図で灌漑農地率を確かめる。川や貯水池から水を配る仕組みが、降水だけに依存しない作期を支える。',
    consequence: '冬春作を支える水管理は、農産物の供給と水への需要を結び付ける。',
  } : {
    lead: '気候の地域差と、農地への水の配り方を比べる。',
    body: '気候区分は連続する地域の分布、灌漑農地率は州ごとの面積割合。北西部の乾燥域と高い灌漑率の対応を全国の分布から読み、選んだ州の値を確かめる。',
    consequence: '灌漑率は農地の面積割合で、生産量や取水量の割合ではない。',
  };
}
