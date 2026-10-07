import { europeLayers, type EuropeField } from '../data/atlas/europe/layers.ts';
import { europeReadings } from '../data/atlas/europe/readings.ts';
import countries from '../data/atlas/europe/countries.json' with { type:'json' };
import climateCities from '../data/atlas/europe/climate-cities.json' with { type:'json' };
import populationCities from '../data/atlas/europe/population-cities.json' with { type:'json' };
import { normaliseEuropePoint, readEuropeState, writeEuropeState, type EuropeState } from './atlas-europe-view.ts';
import { cultureSelection } from './atlas-europe-population-cases.ts';
import { normaliseEuropeDrainageBasin } from './atlas-europe-drainage.ts';
import { europeFarmingComparisonLinks, europeFarmingComparisonFocus, writeEuropeFarmingFocus } from '../data/atlas/europe/farming-water-comparisons.ts';

export type EuropeComparisonLink = {
  id: string;
  label: string;
  question: string;
  targetLayer: string;
  city?: string;
  feature?: string;
  basin?: string;
  title?: string;
  description?: string;
  period?: string;
  pointLabel?: string;
  point?: readonly [number, number];
  focusBounds?: readonly [number, number, number, number];
  sources?: readonly { label: string; url: string }[];
};

const returnKeys = new Set(['region', 'place', 'city', 'compare', 'render', 'layer', 'returnLayer', 'feature', 'point', 'crops', 'livestock', 'single','cultureCase','cultureCategory','cultureArea','basin','farmYear','farmMeasure','farmCompare','farmExtent']);
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
  const layer = sourceLayer(state), definition=europeLayers.find(item => item.id === layer), field = definition?.field;
  if (!field) return [];
  if (field === 'agriculture') {
    if (layer === 'dairy') return [
      link('dairy-alps', '酪農とアルプスの地形', 'オーストリアの国全体の生乳統計と、アルプスの山地・周辺の低地を読み比べます。生乳の値を山地だけの生産量と扱わず、牛の総飼養分布を酪農専用の分布として読み替えません。', 'terrain', { feature: 'alps' }),
      link('dairy-climate', '酪農と欧州の気候', '国全体の生乳統計と欧州の気候区分を別々の資料として読みます。気候だけから酪農の立地や生乳の生産量を推定せず、飼料や土地利用の条件も区別して確かめます。', 'climate'),
    ];
    if(layer==='treecover')return [
      link('treecover-kaukas','樹木被覆とカウカスの加工拠点','2021年の樹木被覆とカウカスの加工拠点を比べ、樹木がある場所と木材を加工する場所を区別します。この重なりから木材の調達先や供給量は推定できません。','hubs',{feature:'kaukas'}),
      link('treecover-climate','樹木被覆と北欧の気候','樹木被覆と気候区分を比べ、北欧とロシア西部の位置関係を確かめます。ヘルシンキ1観測所の平年値を森林全体の平均とは扱いません。','climate',{city:'helsinki'}),
      link('treecover-terrain','樹木被覆と地形','樹木被覆と山地・低地の位置を比べ、土地被覆と標高の違いを確かめます。地図の重なりだけで植生や林業の立地の原因は決まりません。','terrain'),
    ];
    if (layer === 'forest') return [
      link('forest-kaukas', '森林とカウカスの加工拠点', '国全体の森林面積比率と、木材を原料にするカウカスの加工拠点の位置を比べます。森林の割合から工場の生産量を推定せずに読めますか。', 'hubs', { feature: 'kaukas' }),
      link('forest-terrain', '森林と地形を比べる', '国全体の森林面積比率と地形・標高を読み比べます。国の平均と、山地や平野の位置を分けて確かめます。', 'terrain'),
    ];
    return europeFarmingComparisonLinks({ ...state, layer });
  }
  if (field === 'industry') {
    if(layer!=='hubs')return [
      link(`${layer}-rhine`, `${definition!.title}とライン川`, `${definition!.title}（2023年・国全体のGDP比）とライン川の位置を読み比べます。国単位の産業構成と河川の位置は粒度が異なり、比率から沿岸の生産量や輸送量を推定できません。`, 'water', {feature:'rhine'}),
      link(`${layer}-density`, `${definition!.title}と人口密度`, `${definition!.title}（2023年・国全体のGDP比）と2020年の人口密度を読み比べます。国の産業構成と国内の人口分布を分けて読み、就業者数や都市の生産額として扱わないでください。`, 'density'),
    ];
    if (state.feature === 'kaukas') return [
      link('kaukas-treecover','カウカスと樹木被覆','カウカスの加工拠点と2021年の樹木被覆を比べます。資源の分布と加工する場所は別で、点から木材の調達範囲は分かりません。','treecover'),
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
  if(layer==='ethnicity'||layer==='religion')return [
    link('culture-hubs','地域事例と産業拠点','2021年国勢調査の自己申告分類と、産業拠点の代表位置を別々の資料として読みます。分類、行政区と全国値、資料の年を確認し、重なりから就業や移動の原因を判断しません。','hubs'),
    link('culture-terrain','地域事例と地形','2021年国勢調査の地域事例と地形の位置を比べます。行政区の回答割合と標高は別の情報で、自然条件から民族や宗教を推定しません。','terrain'),
  ];
  if (field === 'population'&&layer!=='density')return [
    link('population-hubs', `${definition!.title}と産業拠点`, `${definition!.title}（2023年・国全体）と産業拠点の代表位置を読み比べます。キルナの採掘拠点を確かめ、国の人口指標と個別拠点の位置を区別します。この比率から拠点の雇用数や人口変化の原因は判断できません。`, 'hubs', {feature:'kiruna'}),
    link('population-terrain', `${definition!.title}と地形`, `${definition!.title}（2023年・国全体）とアルプス、周囲の低地を読み比べます。国の値を国内の分布として塗り分けず、地形との位置関係と資料の粒度を確かめます。`, 'terrain', {feature:'alps'}),
  ];
  if (field === 'population') return [
    link('population-hubs', '人口と産業拠点を比べる', '人口密度と産業拠点の位置を読み比べます。キルナの採掘拠点や都市以外の製造拠点を確かめ、人口の集まりと工場立地の違いを読みます。', 'hubs', { feature: 'kiruna' }),
    link('population-terrain', '人口と地形を比べる', 'アルプスの北側の低地と南側のポー平原を地形図で確かめ、人口の分布と読み比べます。標高と人口はそれぞれの凡例で読みます。', 'terrain', { feature: 'alps' }),
  ];
  if(layer==='drainage')return [
    link('drainage-farming','流域区画と農畜産の分布','流域区画と作物・家畜の主な分布を読み比べ、同じ区画の中の土地利用の違いを確かめます。区画は地形・排水モデルによる境界で、灌漑の範囲や利用できる水量を表しません。','crops'),
    link('drainage-hubs','流域区画と産業拠点','流域区画とロッテルダムの代表位置を比べ、国境・水系と産業拠点の位置関係を確かめます。表示位置を含むレベル4の区画を、ライン川の全流域や施設への水の供給範囲として扱いません。','hubs',{feature:'rotterdam'}),
    link('drainage-density','流域区画と人口密度','流域区画と2020年の人口密度を読み比べ、区画の内外で人が集まる場所の違いを確かめます。色は区画の識別用で、人口の集中や利用する水量を表さず、重なりから立地の原因を判断しません。','density'),
  ];
  if(layer==='precipitation')return [
    link('precipitation-farming','年降水量と農畜産の分布','年降水量と作物・家畜の主な分布を比べ、湿潤な沿岸と乾燥した内陸で何が生産されているか確かめます。年間の雨量だけでは生育期の水や灌漑条件は分からず、生産量を推定しません。','crops'),
    link('precipitation-treecover','年降水量と樹木被覆','年降水量と2021年の樹木被覆を比べ、雨の多い場所と樹木がある場所の位置関係を確かめます。気温、土地利用、管理も異なるため、雨量だけから樹木の生育や林業生産量を判断しません。','treecover'),
    link('precipitation-density','年降水量と人口密度','年降水量と2020年の人口密度を比べ、雨の多い沿岸と人口が集まる場所の違いを確かめます。格子資料の年と解像度を区別し、分布の重なりだけで人口集中の原因を断定しません。','density'),
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
  const focus = europeFarmingComparisonFocus(comparison.id);
  if (focus && focus.targetLayer !== comparison.targetLayer) throw new TypeError('Europe comparison focus does not match its layer');
  // An entrance may name a point in another country. Start at the Europe scope
  // so both that point and the saved source distribution can be seen together.
  const target: EuropeState = { ...source, region: 'all', place: '', compare: [], layer: comparison.targetLayer };
  // Unnamed field comparisons keep independent saved selections, including
  // the source's basin when viewing crops or population. Named destinations
  // and registered farming focuses own their target point instead.
  if (focus) { target.feature = undefined; target.basin = undefined; target.point = undefined; }
  if (comparison.city) target.city = comparison.city;
  if (comparison.feature) {
    target.feature = comparison.feature;
    const feature=europeReadings.find(item=>item.id===comparison.feature);
    target.point=!focus&&['terrain','contours','drainage'].includes(target.layer)
      ? normaliseEuropePoint(feature?.coordinates) : undefined;
  }
  if (comparison.basin) target.basin = comparison.basin;
  const next = writeEuropeState(localFieldUrl(base, target), target);
  next.searchParams.set('europeReturn', encodeEuropeReturn(source));
  // Each entrance replaces the previous comparison focus, including a second
  // comparison launched from a focused nature view. No arbitrary camera URL.
  return writeEuropeFarmingFocus(next, focus?.id);
}

/** Returning cannot resolve a caller-supplied pathname or external destination. */
export function europeNamedReturnUrl(base: URL, source: EuropeState): URL {
  const next = localFieldUrl(base, source);
  next.search = encodeEuropeReturn(source);
  return next;
}

export function europeComparisonQuestion(source: EuropeState, targetLayer: string, city?: string, feature?: string, focusId?: string, basin?: string): string {
  const generic = '元の分布と現在の地図を読み比べ、位置、単位、対象年をそれぞれの資料で確かめます。';
  const candidates = europeComparisonLinks(source).filter(item => item.targetLayer === targetLayer);
  if (focusId) {
    const entrance = candidates.find(item => item.id === focusId);
    if (!entrance || !europeFarmingComparisonFocus(focusId)
      || entrance.city && entrance.city !== city || entrance.feature && entrance.feature !== feature || entrance.basin && entrance.basin !== basin) return generic;
    return entrance.question;
  }
  const entrance = candidates.find(item => (!item.city || city === undefined || item.city === city) && (!item.feature || feature === undefined || item.feature === feature) && (!item.basin || basin === undefined || item.basin === basin)) ?? candidates[0];
  if (!entrance) return generic;
  if (entrance.city && city !== undefined && entrance.city !== city || entrance.feature && feature !== undefined && entrance.feature !== feature) {
    return `入口は「${entrance.label}」です。現在の選択は別の地点です。元の分布と現在の地点の位置を読み比べ、単位と対象年をそれぞれの資料で確かめます。`;
  }
  return entrance.question;
}

export function europeComparisonSourceLabel(source: EuropeState): string {
  const layer = europeLayers.find(item => item.id === sourceLayer(source));
  if(layer?.id==='drainage') {
    const basin=normaliseEuropeDrainageBasin(source.basin);
    return basin?`${layer.title}・HYBAS_ID ${basin}`:layer.title;
  }
  if(layer?.id==='ethnicity'||layer?.id==='religion')return `${layer.id==='ethnicity'?'民族的帰属':'宗教的帰属'}・${cultureSelection(source,layer.id).area?.name ?? '欧州全体・地域未選択'}`;
  const feature = europeReadings.find(item => item.id === source.feature && item.field===layer?.field
    && (layer.field==='industry'?layer.id==='hubs':item.layer===(layer.id==='contours'?'terrain':layer.id))
    && (source.place?item.country===source.place:source.region==='all'||countries.find(c=>c.code===item.country)?.region===source.region));
  const city=layer?.id==='climate'?climateCities.find(c=>c.id===source.city):layer?.field==='population'?populationCities.find(c=>c.id===source.feature&&(source.place?c.country===source.place:source.region==='all'||countries.find(country=>country.code===c.country)?.region===source.region)):undefined;
  const selected=feature?.name??city?.name??countries.find(c=>c.code===source.place)?.name??({north:'北欧',west:'西欧',south:'南欧',east:'東欧'} as Record<string,string>)[source.region];
  return [layer?.title ?? 'ヨーロッパの分布', selected].filter(Boolean).join('・');
}
