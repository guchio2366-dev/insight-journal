import { europeLayers, type EuropeField } from '../data/atlas/europe/layers.ts';
import { europeReadings } from '../data/atlas/europe/readings.ts';
import countries from '../data/atlas/europe/countries.json' with { type:'json' };
import climateCities from '../data/atlas/europe/climate-cities.json' with { type:'json' };
import populationCities from '../data/atlas/europe/population-cities.json' with { type:'json' };
import { readEuropeState, writeEuropeState, type EuropeState } from './atlas-europe-view.ts';

export type EuropeComparisonLink = {
  id: string;
  label: string;
  question: string;
  targetLayer: string;
  city?: string;
  feature?: string;
};

const returnKeys = new Set(['region', 'place', 'city', 'compare', 'render', 'layer', 'returnLayer', 'feature', 'crops', 'livestock', 'single']);
const returnLimit = 2048;
const knownLayer = (id: string) => europeLayers.some(layer => layer.id === id);
const sourceLayer = (state: EuropeState) => state.layer === 'overlay' ? (state.returnLayer === 'climate' ? 'wheat' : state.returnLayer) : state.layer;
const fieldFor = (state: EuropeState): EuropeField => {
  const field = europeLayers.find(layer => layer.id === sourceLayer(state))?.field;
  if (!field) throw new TypeError('Unknown Europe layer');
  return field;
};

function localFieldUrl(base: URL, state: EuropeState): URL {
  if (!['https:', 'http:'].includes(base.protocol) || base.origin === 'null') throw new TypeError('A web origin is required');
  const marker = base.pathname.search(/\/atlas\/europe(?:\/|$)/);
  const prefix = marker >= 0 ? base.pathname.slice(0, marker) : '';
  const next = new URL(base.origin);
  // Assign a pathname instead of resolving a string: even a trusted base with
  // a double slash in its path cannot become a protocol-relative destination.
  next.pathname = `${prefix}/atlas/europe/${fieldFor(state)}/`;
  return next;
}

/** A query of published state choices only; never a URL or another return value. */
export function encodeEuropeReturn(state: EuropeState): string {
  if (!(knownLayer(state.layer) || state.layer === 'overlay') || !knownLayer(state.returnLayer)) throw new TypeError('Unknown Europe layer');
  const query = writeEuropeState(new URL('https://europe-state.invalid/atlas/europe/nature/'), state).searchParams;
  // The existing writer omits this key outside overlay mode. Keep it in the
  // source snapshot so returning does not change the saved overlay choice.
  query.set('returnLayer', state.returnLayer);
  const raw = query.toString();
  if (raw.length > returnLimit) throw new TypeError('Europe state is too large');
  return raw;
}

/** Validate the envelope, then let the shared state codec normalize its values. */
export function readEuropeReturn(raw: string, countries: { code: string; region: string }[], cityIds: string[]): EuropeState | null {
  if (typeof raw !== 'string' || !raw || raw.length > returnLimit || /[?#\\\u0000-\u001f\u007f]/.test(raw) || /%(?![a-f\d]{2})/i.test(raw)) return null;
  if (raw.split('&').some(pair => pair.indexOf('=') < 1)) return null;
  let query: URLSearchParams;
  try {
    // URLSearchParams tolerates invalid UTF-8 and malformed escaping; a saved
    // source query must be decodable before its values are normalized.
    decodeURIComponent(raw.replace(/\+/g, ' '));
    query = new URLSearchParams(raw);
  } catch { return null; }
  for (const [key, value] of query) {
    if (!returnKeys.has(key) || query.getAll(key).length !== 1 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  }
  const layer = query.get('layer');
  if (!layer || !(knownLayer(layer) || layer === 'overlay')) return null;
  const savedLayer = query.get('returnLayer');
  if (savedLayer !== null && !knownLayer(savedLayer)) return null;
  const normalized = readEuropeState(query.toString(), countries, cityIds);
  return readEuropeState(encodeEuropeReturn(normalized), countries, cityIds);
}

const link = (id: string, label: string, question: string, targetLayer: string, selection: Pick<EuropeComparisonLink, 'city' | 'feature'> = {}): EuropeComparisonLink => ({ id, label, question, targetLayer, ...selection });

/** Questions compare existing sourced layers; they do not assert causation. */
export function europeComparisonLinks(state: EuropeState): EuropeComparisonLink[] {
  const layer = sourceLayer(state), field = europeLayers.find(item => item.id === layer)?.field;
  if (!field) return [];
  if (field === 'agriculture') {
    if (layer === 'forest') return [
      link('forest-kaukas', '森林とカウカスの加工拠点', '国全体の森林面積比率と、木材を原料にするカウカスの加工拠点の位置を比べます。森林の割合から工場の生産量を推定せずに読めますか。', 'hubs', { feature: 'kaukas' }),
      link('forest-terrain', '森林と地形を比べる', '国全体の森林面積比率と地形・標高を読み比べます。国の平均と、山地や平野の位置を分けて確かめます。', 'terrain'),
    ];
    const livestock = ['cattle', 'pig', 'chicken', 'sheep'].includes(layer);
    return [
      link(`${layer}-climate`, livestock ? '家畜の分布とロンドンの季節' : '作物の分布と気候を比べる', livestock
        ? '家畜の分布とロンドンの月別気温・降水量を比べます。イングランドの地域別農畜産の例を参照し、観測点の平年値と飼養密度を分けて読みます。'
        : '作物の分布とパリの月別気温・降水量を比べ、季節と位置を確かめます。観測点の平年値を農地全体の値として扱わずに読みます。', 'climate', { city: livestock ? 'london' : 'paris' }),
      link(`${layer}-terrain`, '農畜産の分布と地形', 'アルプスと周囲の平野を地形図で確かめ、農畜産の分布と読み比べます。二つの地図の位置関係から確認できることは何でしょうか。', 'terrain', { feature: 'alps' }),
    ];
  }
  if (field === 'industry') {
    if (state.feature === 'kaukas') return [
      link('kaukas-forest', 'カウカスと森林面積比率', 'UPMカウカスの加工拠点と国全体の森林面積比率を読み比べます。原料を加工する場所と、国の森林の割合を区別して確かめます。', 'forest'),
      link('kaukas-density', '加工拠点と人口の分布', 'カウカスの位置を人口密度の地図と比べます。拠点の点は位置を表し、生産量や雇用の大きさを表していません。', 'density'),
    ];
    if (state.feature === 'kiruna') return [
      link('kiruna-density', 'キルナと人口密度', 'キルナの資源採掘拠点を人口密度図と比べ、南部スウェーデンとの違いを確かめます。人口が集まる場所と採掘拠点はどのような位置関係でしょうか。', 'density'),
      link('kiruna-climate', 'キルナと北欧の気候', 'キルナの拠点の位置と北欧の気候区分を比べます。ヘルシンキの観測点の平年値は、キルナの観測値とは区別して読みます。', 'climate', { city: 'helsinki' }),
    ];
    return [
      link('hubs-rhine', '産業拠点とライン川', 'ライン川の水地図とロッテルダム、ルートヴィヒスハーフェンの拠点を読み比べ、海港と内陸の位置関係を確かめます。川の線の太さは流量を表していません。', 'water', { feature: 'rhine' }),
      link('hubs-density', '産業拠点と人口密度', '産業拠点と人口密度の分布を読み比べます。代表地点の位置と人口の集まりを確かめ、点の数から生産量や雇用を推定せずに読みます。', 'density'),
    ];
  }
  if (field === 'population') return [
    link('population-hubs', '人口と産業拠点を比べる', '人口密度と産業拠点の位置を読み比べます。キルナの採掘拠点や都市以外の製造拠点を確かめ、人口の集まりと工場立地の違いを読みます。', 'hubs', { feature: 'kiruna' }),
    link('population-terrain', '人口と地形を比べる', 'アルプスの北側の低地と南側のポー平原を地形図で確かめ、人口の分布と読み比べます。標高と人口はそれぞれの凡例で読みます。', 'terrain', { feature: 'alps' }),
  ];
  if (layer === 'water') return [
    link('water-rotterdam', 'ライン川からロッテルダムへ', 'ライン川とロッテルダムの産業拠点を比べ、海港と内陸の位置関係を確かめます。港湾地区の代表位置と施設全体の範囲は区別して読みます。', 'hubs', { feature: 'rotterdam' }),
    link('water-density', '河川と人口密度を比べる', '河川・湖の位置と人口密度の分布を読み比べます。川の位置から利用する水量や人口の移動を推定せずに読みます。', 'density'),
  ];
  return [
    link('nature-farming', '自然環境と農畜産の分布', '自然環境と作物・家畜の分布を読み比べます。農畜産の例は出典の対象地域を確かめ、気候区分が分布を直接決めるという読み方を避けます。', 'crops'),
    link('nature-density', '自然環境と人口密度', '地形や気候の位置を人口密度図と読み比べます。分布の重なりを確認し、それぞれの資料の対象年と単位を確かめます。', 'density'),
  ];
}

/** Fixed same-origin field route; source state lives in a separate flat query. */
export function europeComparisonUrl(base: URL, source: EuropeState, comparison: EuropeComparisonLink): URL {
  if (!knownLayer(comparison.targetLayer)) throw new TypeError('Unknown Europe target layer');
  // An entrance may name a point in another country. Start at the Europe scope
  // so both that point and the saved source distribution can be seen together.
  const target: EuropeState = { ...source, region: 'all', place: '', compare: [], layer: comparison.targetLayer };
  if (comparison.city) target.city = comparison.city;
  if (comparison.feature) target.feature = comparison.feature;
  const next = writeEuropeState(localFieldUrl(base, target), target);
  next.searchParams.set('europeReturn', encodeEuropeReturn(source));
  return next;
}

/** Returning cannot resolve a caller-supplied pathname or external destination. */
export function europeNamedReturnUrl(base: URL, source: EuropeState): URL {
  const next = localFieldUrl(base, source);
  next.search = encodeEuropeReturn(source);
  return next;
}

export function europeComparisonQuestion(source: EuropeState, targetLayer: string, city?: string, feature?: string): string {
  const candidates = europeComparisonLinks(source).filter(item => item.targetLayer === targetLayer);
  const entrance = candidates.find(item => (!item.city || city === undefined || item.city === city) && (!item.feature || feature === undefined || item.feature === feature)) ?? candidates[0];
  if (!entrance) return '元の分布と現在の地図を読み比べ、位置、単位、対象年をそれぞれの資料で確かめます。';
  if (entrance.city && city !== undefined && entrance.city !== city || entrance.feature && feature !== undefined && entrance.feature !== feature) {
    return `入口は「${entrance.label}」です。現在の選択は別の地点です。元の分布と現在の地点の位置を読み比べ、単位と対象年をそれぞれの資料で確かめます。`;
  }
  return entrance.question;
}

export function europeComparisonSourceLabel(source: EuropeState): string {
  const layer = europeLayers.find(item => item.id === sourceLayer(source));
  const feature = europeReadings.find(item => item.id === source.feature && item.field===layer?.field
    && (layer.field==='industry'?layer.id==='hubs':item.layer===(layer.id==='contours'?'terrain':layer.id))
    && (source.place?item.country===source.place:source.region==='all'||countries.find(c=>c.code===item.country)?.region===source.region));
  const city=layer?.id==='climate'?climateCities.find(c=>c.id===source.city):layer?.field==='population'?populationCities.find(c=>c.id===source.feature&&(source.place?c.country===source.place:source.region==='all'||countries.find(country=>country.code===c.country)?.region===source.region)):undefined;
  const selected=feature?.name??city?.name??countries.find(c=>c.code===source.place)?.name??({north:'北欧',west:'西欧',south:'南欧',east:'東欧'} as Record<string,string>)[source.region];
  return [layer?.title ?? 'ヨーロッパの分布', selected].filter(Boolean).join('・');
}
