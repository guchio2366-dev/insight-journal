import climateCities from './climate-cities.json' with { type: 'json' };
import { europePrecipitationReading } from './water-reading.ts';
import { drainageReading } from './drainage-reading.ts';
import { europeReadings } from './readings.ts';

export type EuropeFarmingComparisonFocus = {
  id: string; label: string; title: string; question: string; description: string;
  targetLayer: 'climate' | 'precipitation' | 'drainage' | 'terrain' | 'density';
  period: string; focusBounds: readonly [number, number, number, number];
  point: readonly [number, number]; pointLabel: string; city?: string; feature?: string; basin?: string;
  sources: readonly { label: string; url: string }[];
};
type FarmingSource = { layer: string; place?: string; region?: string };
type RegionCase = {
  id: string; name: string; city: string; point: readonly [number, number];
  bounds: readonly [number, number, number, number]; basin?: string;
};

// Representative positions are reading anchors, not irrigation intakes or farm locations.
// The Po anchor is a retained SPAM rice/maize cell centre in display unit
// 2040012730. Portugal [-8.80,38.90] remains in display unit 2040018470.
// Neither identifier names a whole river basin. Tests additionally check exact
// BasinATLAS containment when the private original GIS is available.
const regions: Record<string, RegionCase> = {
  plains: { id: 'plains', name: '欧州平原', city: 'warsaw', point: [20.96, 52.16], bounds: [-2, 45, 35, 57] },
  eastern: { id: 'eastern', name: '東欧の平原', city: 'kyiv', point: [30.54, 50.39], bounds: [18, 43, 39, 56] },
  pannonian: { id: 'pannonian', name: '中欧の平原', city: 'budapest', point: [19.18, 47.43], bounds: [13, 43, 25, 50] },
  po: { id: 'po', name: 'ポー平原', city: '', point: [8.708333333333336, 45.29166666666667], bounds: [6.5, 43.5, 13.5, 47.5], basin: '2040012730' },
  portugal: { id: 'portugal', name: 'ポルトガル中部', city: 'lisbon', point: [-8.80, 38.90], bounds: [-10, 36.5, -6, 42.5], basin: '2040018470' },
  britain: { id: 'britain', name: 'イングランドと周辺', city: 'london', point: [-2.5, 52.5], bounds: [-7, 49, 3, 59] },
  northern: { id: 'northern', name: '北欧', city: 'helsinki', point: [24.95, 60.18], bounds: [10, 55, 32, 68] },
  iberia: { id: 'iberia', name: 'イベリア半島', city: 'madrid', point: [-3.68, 40.41], bounds: [-10, 35.5, 4, 44.5] },
  france: { id: 'france', name: 'フランスと周辺', city: 'paris', point: [2.38, 48.72], bounds: [-5, 43, 9, 53] },
  german: { id: 'german', name: 'ドイツと周辺の平原', city: 'berlin', point: [13.3, 52.47], bounds: [4, 46, 23, 56] },
};
const products: Record<string, { name: string; region: string; livestock?: boolean; demand?: boolean }> = {
  crops: { name: '穀物・畑作', region: 'plains' },
  wheat: { name: '小麦', region: 'plains' }, barley: { name: '大麦', region: 'northern' },
  maize: { name: 'トウモロコシ', region: 'pannonian' },
  rapeseed: { name: '菜種', region: 'pannonian' }, sunflower: { name: 'ヒマワリ', region: 'eastern' },
  sugarbeet: { name: 'テンサイ', region: 'german' }, potato: { name: 'ジャガイモ', region: 'plains' },
  rice: { name: '米', region: 'po' }, soybean: { name: '大豆', region: 'pannonian' },
  vegetables: { name: 'その他の野菜', region: 'german' },
  temperatefruit: { name: '温帯果樹', region: 'iberia' }, citrus: { name: '柑橘類', region: 'iberia' },
  cattle: { name: '牛', region: 'britain', livestock: true },
  sheep: { name: '羊', region: 'britain', livestock: true },
  pig: { name: '豚', region: 'german', livestock: true, demand: true },
  chicken: { name: '鶏', region: 'german', livestock: true, demand: true },
};
const countryRegions: Record<string, string> = {
  GBR: 'britain', IRL: 'britain', FRA: 'france', DEU: 'german', NLD: 'german', BEL: 'german',
  FIN: 'northern', SWE: 'northern', NOR: 'northern', EST: 'northern',
  UKR: 'eastern', BLR: 'eastern', RUS: 'eastern', MDA: 'eastern',
  POL: 'plains', HUN: 'pannonian', SRB: 'pannonian', ROU: 'pannonian',
  CZE: 'german', SVK: 'pannonian', AUT: 'pannonian', ESP: 'iberia', PRT: 'portugal',
};

function regionFor(source: FarmingSource): RegionCase {
  const product = products[source.layer];
  if (source.layer === 'rice') return regions[source.place === 'PRT' ? 'portugal' : 'po'];
  if (source.layer === 'maize' && source.place === 'ITA') return regions.po;
  // Every case is an explicitly named regional example. A country without a
  // matching observation is never assigned an invented city or rain series.
  const country = countryRegions[source.place ?? ''];
  const regional = source.region === 'north' ? 'northern' : source.region === 'east' ? 'eastern' : source.region === 'south' ? 'iberia' : undefined;
  return regions[country ?? regional ?? product.region];
}

function comparison(productId: string, region: RegionCase, targetLayer: EuropeFarmingComparisonFocus['targetLayer']): EuropeFarmingComparisonFocus {
  const product = products[productId], name = product.name;
  const common = { id: `${productId}-${region.id}-${targetLayer}`, targetLayer, focusBounds: region.bounds, point: region.point, pointLabel: `${region.name}の比較参照点（位置）` };
  if (targetLayer === 'climate') {
    const city = climateCities.find(item => item.id === region.city)!;
    const title = `${name}と${city.name}の季節`;
    const temperatures = city.months.filter(month => month.temperature !== null).length;
    const rainfall = city.months.filter(month => month.precipitation !== null).length;
    const temperatureComplete = city.months.length === 12 && temperatures === 12;
    const rainfallComplete = city.months.length === 12 && rainfall === 12;
    const question = temperatureComplete && rainfallComplete
      ? `${region.name}の${name}の分布と、${city.name}の月別気温・降水量を比べます。雨の多い月と少ない月はいつでしょうか。`
      : temperatureComplete
        ? `${region.name}の${name}の分布と、${city.name}の月別気温を比べます。暖かい月と寒い月はいつでしょうか。`
        : rainfallComplete
          ? `${region.name}の${name}の分布と、${city.name}の月別降水量を比べます。雨の多い月と少ない月はいつでしょうか。`
          : `${region.name}の${name}の分布と、${city.name}で収録された月の気候を比べます。どの月に値があり、どの月が欠測でしょうか。`;
    const description = temperatureComplete && rainfallComplete
      ? `月別の気温・雨から、年合計では見えない${city.name}の季節差を読みます。1観測所の平年値であり、${region.name}全体の平均や${product.livestock ? '飼料の調達先' : '農地への供給水量'}ではありません。`
      : temperatureComplete
        ? `${city.name}1観測所の月別気温から季節の寒暖を読みます。降水${12 - rainfall}か月は未収録のため、雨の季節や年降水量はこの図から比べません。`
        : rainfallComplete
          ? `${city.name}1観測所の月別降水量から雨の季節差を読みます。気温${12 - temperatures}か月は未収録のため、年間の寒暖はこの図から比べません。`
          : `${city.name}1観測所の収録済みの月を確認します。気温${12 - temperatures}か月・降水${12 - rainfall}か月は未収録で、年間の季節差を補完しません。`;
    return { ...common, city: city.id, point: city.coordinates as [number, number], pointLabel: `${city.name}の観測地点`, label: title, title, period: city.period,
      question, description,
      sources: [{ label: `気象庁：${city.name}の月別平年値`, url: city.sourceUrl }],
    };
  }
  if (targetLayer === 'precipitation') {
    const title = `${name}と${region.name}の雨`;
    const subject = productId === 'sheep' ? '草地利用を考える手掛かりとして、' : product.demand ? '飼料を育てる水条件を考えるため、' : '';
    return { ...common, label: title, title, period: '1991–2020',
      question: `${subject}${region.name}の${name}の分布と年降水量を比べます。分布が重なる場所の雨量は、周囲とどう違うでしょうか。`,
      description: `${region.name}の${name}の集中域と、周囲の山地・低地の雨を同じ範囲で比べます。${productId === 'rice' ? '年降水量と必要な時期に田へ届く水は別で、灌漑・取水条件は別資料が必要です。' : product.livestock ? '年降水量は家畜・飼料の必要水量ではなく、草地の状態や飼料調達先も示しません。' : '年合計だけでは生育期の雨や灌漑は分からず、輪郭は生産量や必要水量を示しません。'}`,
      sources: europePrecipitationReading.sources,
    };
  }
  if (targetLayer === 'drainage') {
    const title = `${name}と${region.name}の水系区画`;
    return { ...common, basin: region.basin, label: title, title, period: '2019年公開',
      question: `${region.name}の${name}の分布と、参照点を含む流域区画を比べます。農地と、周囲の山地・低地はどう配置されているでしょうか。`,
      description: `参照点を含む区画で、山地・低地と${name}の集中域の位置を比べます。HYBAS_ID ${region.basin}は${region.id === 'po' ? 'ポー川' : 'テージョ川'}の全流域や灌漑供給範囲ではなく、識別色は水量を示しません。`,
      sources: drainageReading.sources,
    };
  }
  if (targetLayer === 'density') {
    const title = `${name}の飼養地域と人口`;
    return { ...common, label: title, title, period: '2020',
      question: `${region.name}の${name}の分布と人口密度を比べます。飼養する場所と、人が集まる場所は重なるでしょうか。`,
      description: '飼養地域と消費者がいる場所を、別々の凡例で読みます。人口密度は需要量、家畜密度は肉・卵の生産量を示さず、重なりから飼料の調達先や販売先を決めません。',
      sources: [{ label: '欧州委員会JRC：GHSL人口格子（2020年）', url: 'https://ghsl.jrc.ec.europa.eu/ghs_pop2023.php' }],
    };
  }
  const po = region.id === 'po', title = `${name}と${region.name}の地形`;
  return { ...common, ...(po ? { feature: 'alps' } : {}), label: title, title, period: 'ETOPO 2022',
    question: `${region.name}の${name}の分布と${po ? 'アルプス・南側の低地' : '山地・低地'}を比べます。主な分布は、標高のどの範囲に重なるでしょうか。`,
    description: `${po ? 'アルプス南側のポー平原' : `${region.name}の低地`}に${name}の集中域がどの程度重なるか、標高の色と輪郭を照合します。農地の傾斜や${product.livestock ? '飼養方式・飼料調達' : '灌漑・生産量'}は、この重なりだけでは分かりません。`,
    sources: [{ label: 'NOAA NCEI：ETOPO 2022の標高', url: 'https://doi.org/10.25921/fd45-gt74' }, ...(po ? europeReadings.filter(item => item.id === 'alps').map(item => ({ label: item.sourceLabel, url: item.source })) : [])],
  };
}

function linksFor(productId: string, region: RegionCase): EuropeFarmingComparisonFocus[] {
  if (region.id === 'po') return ['precipitation', 'drainage', 'terrain'].map(layer => comparison(productId, region, layer as EuropeFarmingComparisonFocus['targetLayer']));
  if (productId === 'rice') return ['climate', 'precipitation', 'drainage'].map(layer => comparison(productId, region, layer as EuropeFarmingComparisonFocus['targetLayer']));
  return [comparison(productId, region, 'climate'), comparison(productId, region, 'precipitation'),
    products[productId].demand ? comparison(productId, region, 'density') : comparison(productId, productId === 'maize' ? regions.po : region, 'terrain')];
}

// Explicit products and cases create the only accepted focus identifiers. URL
// callers cannot supply coordinates, a destination, an arbitrary basin or text.
const registered = new Map<string, EuropeFarmingComparisonFocus>();
for (const productId of Object.keys(products)) for (const region of Object.values(regions)) {
  if (productId === 'rice' && !['po', 'portugal'].includes(region.id)) continue;
  for (const item of linksFor(productId, region)) registered.set(item.id, item);
}

export function europeFarmingComparisonLinks(source: FarmingSource): EuropeFarmingComparisonFocus[] {
  return products[source.layer] ? linksFor(source.layer, regionFor(source)) : [];
}

export function europeFarmingComparisonFocus(id?: string | null): EuropeFarmingComparisonFocus | undefined {
  return typeof id === 'string' ? registered.get(id) : undefined;
}

/** Drop stale text/camera choices when the selected layer or point has changed. */
export function readEuropeFarmingFocus(search: string | URLSearchParams, targetLayer?: string): EuropeFarmingComparisonFocus | undefined {
  const query = typeof search === 'string' ? new URLSearchParams(search) : search;
  if (query.getAll('europeFocus').length !== 1) return undefined;
  const item = europeFarmingComparisonFocus(query.get('europeFocus'));
  if (!item || (targetLayer ?? query.get('layer')) !== item.targetLayer) return undefined;
  if (item.city && query.get('city') !== item.city || item.feature && query.get('feature') !== item.feature || item.basin && query.get('basin') !== item.basin) return undefined;
  return item;
}

export function writeEuropeFarmingFocus(url: URL, id?: string): URL {
  const next = new URL(url); next.searchParams.delete('europeFocus');
  if (europeFarmingComparisonFocus(id)) next.searchParams.set('europeFocus', id!);
  return next;
}
