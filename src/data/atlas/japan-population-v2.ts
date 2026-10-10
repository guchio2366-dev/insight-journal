export type JapanPopulationPlace = {
  id: string;
  name: string;
  coordinates: [number, number];
  plain: string;
  overview: string;
  reason: string;
  sourceUrl: string;
  kind: 'urban-centre' | 'reference-place';
  coordinateMethod: string;
};

const terrainSources = {
  sapporo: 'https://www.env.go.jp/water/jiban/directory/ishikari.html',
  sendai: 'https://www.env.go.jp/water/jiban/directory/sendai.html',
  niigata: 'https://www.env.go.jp/water/jiban/directory/niigata.html',
  hiroshima: 'https://www.env.go.jp/water/jiban/directory/hiroshima.html',
  cities: 'https://maps.gsi.go.jp/',
};
const urbanCoordinates = '既存GHSL都市域の代表点。都市域や人口の範囲を示す点ではありません。';
const referenceCoordinates = '地理院地図を参照した市街地の概略位置。平野の境界・人口の重心・統計区域ではありません。';

/** Reference labels locate cities and nearby lowlands; marker size never encodes population. */
export const japanPopulationPlaces: JapanPopulationPlace[] = [
  {
    id: 'jp-pop-sapporo', name: '札幌', coordinates: [141.32, 43.05], plain: '石狩平野・豊平川扇状地',
    overview: '北海道では札幌周辺の濃い人口格子と、周囲の疎らな格子を見比べられます。点は都市の位置を案内するもので、札幌市の人口や市域を表しません。',
    reason: '札幌の市街地は豊平川の扇状地に位置し、その北側には石狩川の氾濫平野が広がります。平地に加え、道内の仕事や交通、行政・教育機能が集まることが都市の集中を考える手掛かりになります。地形だけから人口を決めることはできません。',
    sourceUrl: terrainSources.sapporo, kind: 'reference-place',
    coordinateMethod: '既存気象庁札幌観測所位置を市街地の参照点として再利用。人口統計区域の重心ではありません。',
  },
  {
    id: 'jp-pop-sendai', name: '仙台', coordinates: [140.87, 38.27], plain: '仙台平野・台地',
    overview: '仙台付近では、太平洋側の平野と市街地周辺に人口のまとまりが見えます。平野全体が同じ密度ではなく、市街地と周辺で格子の色が変わります。',
    reason: '仙台平野には河川沿いの低地と台地があり、平地の利用や東北の交通・サービスの結節点という条件を合わせて考えます。色の分布から個々の住民の勤務先や通勤先は分かりません。',
    sourceUrl: terrainSources.sendai, kind: 'reference-place', coordinateMethod: referenceCoordinates,
  },
  {
    id: 'jp-pop-niigata', name: '新潟', coordinates: [139.03, 37.92], plain: '越後平野',
    overview: '日本海側の新潟付近にも人口のまとまりがあります。平野の広がりと、市街地周辺の濃い格子を区別して読みます。',
    reason: '越後平野の河川低地には農地と市街地があり、港や交通との接続も生活・産業の条件です。農業の広い平野と、大都市の連続した市街地は同じ土地利用ではありません。',
    sourceUrl: terrainSources.niigata, kind: 'reference-place',
    coordinateMethod: '既存asia-waterの新潟参照点を再利用。平野の境界・人口の重心ではありません。',
  },
  {
    id: 'uc-5929', name: '東京', coordinates: [139.65361837436774, 35.66458967247394], plain: '関東平野',
    overview: '東京周辺では濃い人口格子が広い範囲に連続します。東京の都市域の輪郭と、東京都の行政境界は異なります。',
    reason: '広い関東平野は市街地の広がりを受け止める条件の一つです。首都の行政機能、企業・学校・サービス、鉄道などの交通網も集積を支えます。格子は2020年の推計居住人口で、昼間人口ではありません。',
    sourceUrl: terrainSources.cities, kind: 'urban-centre', coordinateMethod: urbanCoordinates,
  },
  {
    id: 'uc-5213', name: '名古屋', coordinates: [136.90566982699363, 35.14040570034881], plain: '濃尾平野',
    overview: '名古屋周辺では濃い人口格子がまとまり、東京・大阪周辺との位置関係を比較できます。都市名の点の大きさは人口規模を表しません。',
    reason: '濃尾平野の平地、港と交通網、製造業とそれを支える仕事が集積を考える条件です。同じ平野でも農地・住宅・工業用地の使われ方が異なるため、平野の面積だけで人口の分布は説明できません。',
    sourceUrl: terrainSources.cities, kind: 'urban-centre', coordinateMethod: urbanCoordinates,
  },
  {
    id: 'uc-4399', name: '大阪', coordinates: [135.47509520795276, 34.72053431688806], plain: '大阪平野',
    overview: '大阪周辺の濃い人口格子は、隣接する都市へ連続しています。資料の大阪都市域は大阪市や大阪府の人口とは範囲が異なります。',
    reason: '大阪平野の平地と大阪湾の港、商業・製造業の蓄積、鉄道網が近畿の集積を考える条件です。資料の都市域は人口のまとまりとして定義されており、個々の自治体の境界や通勤圏を示しません。',
    sourceUrl: terrainSources.cities, kind: 'urban-centre', coordinateMethod: urbanCoordinates,
  },
  {
    id: 'jp-pop-hiroshima', name: '広島', coordinates: [132.46, 34.39], plain: '広島平野・太田川三角州',
    overview: '瀬戸内海側では、広島などの市街地周辺に人口のまとまりが点在します。山地と沿岸の格子の違いを見比べられます。',
    reason: '広島平野は太田川が形成した三角州で、臨海部には干拓・埋立地もあります。平地の位置や港・交通・仕事を合わせて考えます。海を含む元格子の密度を陸地だけの密度として読まないようにします。',
    sourceUrl: terrainSources.hiroshima, kind: 'reference-place', coordinateMethod: referenceCoordinates,
  },
  {
    id: 'jp-pop-fukuoka', name: '福岡', coordinates: [130.40, 33.59], plain: '福岡平野',
    overview: '九州北部の福岡付近に濃い人口格子がまとまります。九州全体が一様に濃いわけではなく、他の都市や山地との違いが見えます。',
    reason: '博多湾に面した平地と交通の接続、商業・サービス業や行政・教育機能を、人口の集中を考える手掛かりにします。福岡の市街地と筑後・佐賀平野の農業地帯は別の場所として読みます。',
    sourceUrl: terrainSources.cities, kind: 'reference-place', coordinateMethod: referenceCoordinates,
  },
];

export const japanPopulationReading = {
  title: '平野・沿岸と、人口のまとまりを読む',
  overview: '東京・名古屋・大阪の周辺に濃い人口格子が連続し、札幌・仙台・新潟・広島・福岡などにもまとまりが見えます。主要都市の点は位置を案内し、平野の境界や人口規模を表しません。全国図は2020年の5km集約推計です。',
  reason: '山地が多い日本では、平野や沿岸の平地が市街地を広げる条件の一つです。港・鉄道・道路と、仕事・教育・医療などのサービスの集積も関わります。地形が似ていても人口密度は同じにならず、この地図だけで集中の原因や通勤先を確定できません。',
  gap: '全国の元1km格子は未取得です。この全国図は5km集約値で、町丁目・建物・細かな離島の分布は読めません。既存資産には東京周辺の元1km格子がありますが、この全国図の表示は5kmです。国籍・民族自己認識・宗教の分布は作成していません。',
};

export function getJapanPopulationReading(topic: string, cityId?: string) {
  const place = japanPopulationPlaces.find(p => p.id === cityId);
  if (place) return { ...japanPopulationReading, title: `${place.name}と${place.plain}`, overview: place.overview, reason: place.reason, sourceUrl: place.sourceUrl };
  if (topic === 'urban') return {
    ...japanPopulationReading,
    overview: '東京・名古屋・大阪は、GHSLが定めた都市域の輪郭を人口密度に重ねます。数値は2020年の人口を2025年の固定した都市域で集計したもので、市や都道府県の人口ではありません。',
    reason: '都市名だけでなく、人口の濃い格子が輪郭の内外へどう続くかを読みます。都市域の境界・居住人口・自治体の境界は定義が異なり、都市域の面積と人口を行政上の都市統計へ置き換えません。',
  };
  return japanPopulationReading;
}

export const japanPopulationSources = {
  census: { label: '2020年国勢調査・表2-3', url: 'https://www.e-stat.go.jp/stat-search/file-download?fileKind=0&statInfId=000032142406', termsUrl: 'https://www.e-stat.go.jp/terms-of-use' },
  grid: { label: 'GHS-POP R2023A・2020年', url: 'https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php', doi: 'https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE', termsUrl: 'https://human-settlement.emergency.copernicus.eu/GHSLhowToCite.php' },
  method: { label: 'Pesaresi et al. (2024), GHSL methodology', url: 'https://doi.org/10.1080/17538947.2024.2390454' },
  urban: { label: 'GHSL都市域 R2024A V1.2', url: 'https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php' },
};
