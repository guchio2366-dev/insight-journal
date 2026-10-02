export const canadaDemographicTopics = ['ethnicity', 'religion'] as const;
export type CanadaDemographicTopic = typeof canadaDemographicTopics[number];
export type CanadaPopulationTopic = 'distribution' | CanadaDemographicTopic;
export type CanadaDemographicMeasure = 'share' | 'count';

export interface CanadaDemographicsState {
 topic: CanadaPopulationTopic;
 group: string | null;
 measure: CanadaDemographicMeasure;
}

export type CanadaDemographicsCatalog = Record<CanadaDemographicTopic, {
 ids: readonly string[];
 defaultId: string;
}>;

/** Original published cells remain available alongside any derived percentage. */
export interface CanadaDemographicCell {
 value: number | null;
 symbol: string;
 status?: string;
 vector?: string;
}

export interface CanadaDemographicSource {
 tableId: string;
 title: string;
 url: string;
 referenceYear: 2021;
 universe: string;
 sample?: string;
 releaseDate?: string;
}

export const canadaDemographicsStateKeys = ['topic', 'group', 'measure'] as const;

export function isCanadaDemographicTopic(value: unknown): value is CanadaDemographicTopic {
 return value === 'ethnicity' || value === 'religion';
}

/** The population year, CMA selection, and map camera belong to the existing state. */
export function readCanadaDemographicsState(url: URL, catalog: CanadaDemographicsCatalog): CanadaDemographicsState {
 const params = url.searchParams, topic = params.get('topic');
 if (!isCanadaDemographicTopic(topic)) return {topic: 'distribution', group: null, measure: 'share'};
 const group = params.get('group'), choices = catalog[topic];
 return {
  topic,
  group: group !== null && choices.ids.includes(group) ? group : choices.defaultId,
  measure: params.get('measure') === 'count' ? 'count' : 'share',
 };
}

/** Own only the three demographic parameters and never mutate the supplied URL. */
export function writeCanadaDemographicsState(url: URL, state: CanadaDemographicsState): URL {
 const next = new URL(url);
 for (const key of canadaDemographicsStateKeys) next.searchParams.delete(key);
 if (state.topic !== 'distribution') {
  next.searchParams.set('topic', state.topic);
  if (state.group !== null) next.searchParams.set('group', state.group);
  next.searchParams.set('measure', state.measure);
 }
 return next;
}

/** Use this table's own population universe; invalid ratios stay missing, never clamped. */
export function canadaDemographicShare(count: number | null, denominator: number | null): number | null {
 if (count === null || denominator === null || !Number.isFinite(count) || !Number.isFinite(denominator)
  || count < 0 || denominator <= 0 || count > denominator) return null;
 return count / denominator * 100;
}

export function canadaDemographicValueForMeasure(
 count: number | null,
 denominator: number | null,
 measure: CanadaDemographicMeasure,
): number | null {
 if (measure === 'share') return canadaDemographicShare(count, denominator);
 return count !== null && Number.isFinite(count) && count >= 0 ? count : null;
}

// Retain the original absolute percentage bins for callers without an adaptive scale.
export const canadaDemographicShareBreaks = [1, 5, 10, 25, 50] as const;
export const canadaDemographicShareColors = ['#edf1df', '#d7e3bd', '#adc98b', '#7ba65f', '#467f48', '#22543d'] as const;
export const canadaDemographicMissingColor = '#b7b7af';

export interface CanadaDemographicShareScale {
 breaks: [number, number, number, number, number];
 upper: number;
 decimals: number;
}

/** Adaptive thresholds are absolute percentages, shared by every geography for one group. */
export function canadaDemographicShareScale(values: readonly number[]): CanadaDemographicShareScale {
 const max = values.reduce((current, value) => Number.isFinite(value) && value >= 0 && value <= 100
  ? Math.max(current, value) : current, 0);
 if (max === 0) return {breaks: [0.1, 0.2, 0.4, 0.6, 0.8], upper: 1, decimals: 1};
 // Five 20% intervals fit the percentage ceiling; split the first to keep six classes.
 if (max > 60) return {breaks: [10, 20, 40, 60, 80], upper: 100, decimals: 0};
 const clean = (value: number) => Number(value.toPrecision(12));
 const target = Math.max(max / 6, Number.MIN_VALUE);
 const magnitude = 10 ** Math.max(-323, Math.floor(Math.log10(target)));
 const step = [1, 2, 5, 10].map(factor => clean(factor * magnitude))
  .find(value => clean(value * 6) >= max)!;
 return {
  breaks: [1, 2, 3, 4, 5].map(factor => clean(factor * step)) as CanadaDemographicShareScale['breaks'],
  upper: clean(step * 6),
  decimals: Math.max(0, -Number(step.toExponential().split('e')[1])),
 };
}

export function canadaDemographicShareColor(
 share: number | null,
 breaks: readonly number[] = canadaDemographicShareBreaks,
): string {
 if (share === null || !Number.isFinite(share) || share < 0 || share > 100) return canadaDemographicMissingColor;
 if (breaks.length !== 5 || breaks.some((value, index) => !Number.isFinite(value) || value <= 0 || value > 100
  || index > 0 && value <= breaks[index - 1])) throw new RangeError('A demographic share scale needs five increasing percentage thresholds');
 return canadaDemographicShareColors[breaks.filter(value => share >= value).length];
}
