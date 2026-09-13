export type InsightCropId = 'corn' | 'soybean' | 'wheat' | 'cotton' | 'rice' | 'specialty';

export interface RegionalInsight {
  id: string;
  cropIds: InsightCropId[];
  title: string;
  summary: string;
  compactSummary: string;
  bounds: [number, number, number, number];
  detailCrop: InsightCropId;
  sourceIds: string[];
  checkedAt: string;
}

/**
 * These rectangles choose the most relevant reviewed explanation for a tap.
 * They are not displayed as crop boundaries and must not be used for measurement.
 * Smaller matching regions win, so local conditions override broad regional notes.
 */
export const regionalInsights: RegionalInsight[] = [
  {
    id: 'sacramento-rice',
    cropIds: ['rice'],
    title: 'サクラメントバレーの稲作',
    summary: '稲は暖かい生育期と、田へ安定して水を入れられる平坦地を必要とします。夏に雨が少ないこの谷では、冬の降水と山地の積雪を貯水・灌漑で夏へ移すことで水を補い、中短粒種の産地が根づきました。',
    compactSummary: '夏は乾燥しますが、平坦な谷底と貯水・灌漑が、稲に必要な水を生育期へ届けます。',
    bounds: [-123.1, 37.7, -120.0, 40.9],
    detailCrop: 'rice',
    sourceIds: ['source-usda-rice', 'source-california-water-agriculture'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'lower-mississippi-rice',
    cropIds: ['rice'],
    title: 'ミシシッピ川下流・湾岸の稲作',
    summary: '稲は水を張り、必要な時に排水できる平坦な土地に向きます。ミシシッピ川下流と湾岸には低く平らな沖積地が続き、暖かい生育期と水管理を組み合わせやすいため、大規模な稲作地域が形成されました。',
    compactSummary: '暖かい生育期、平坦な沖積地、水を入れて抜ける管理条件が大規模稲作を支えます。',
    bounds: [-94.4, 28.4, -88.1, 36.6],
    detailCrop: 'rice',
    sourceIds: ['source-usda-rice'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'california-specialty',
    cropIds: ['specialty'],
    title: 'カリフォルニアの果樹・野菜',
    summary: '果樹・野菜は品目ごとに条件が異なりますが、日照が多く雨の少ない生育期は病害を抑え、灌漑で水量を調節しやすい面があります。谷底の農地、長い生育期、加工・流通網が、多様な園芸作物の集積を支えています。',
    compactSummary: '日照の多い生育期に、谷底の農地と灌漑、加工・流通網を組み合わせています。',
    bounds: [-123.2, 32.4, -117.4, 40.9],
    detailCrop: 'specialty',
    sourceIds: ['source-california-water-agriculture', 'source-usda-cdl-faq'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'inland-northwest-wheat',
    cropIds: ['wheat'],
    title: '太平洋岸北西部内陸の小麦',
    summary: '小麦は作型を選べば比較的乾燥した地域でも育ちます。内陸北西部は降水が秋から春に偏り、夏は乾燥します。その水分を土に蓄え、起伏ある広い畑で冬小麦や春小麦を作る体系が地域に根づきました。',
    compactSummary: '秋から春の降水を土に蓄え、乾いた夏までつなぐ作型が内陸の小麦を支えます。',
    bounds: [-121.2, 42.0, -111.0, 49.6],
    detailCrop: 'wheat',
    sourceIds: ['source-usda-wheat', 'source-wsu-inland-northwest'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'west-texas-cotton',
    cropIds: ['cotton'],
    title: 'テキサス西部の綿花',
    summary: '綿花は長く暖かい無霜期間を好みますが、生育期の水不足は収量を不安定にします。乾燥するテキサス西部では天水栽培と灌漑が併存し、収穫期の乾きやすさと水確保の制約を抱えながら産地が続いています。',
    compactSummary: '長い高温期は綿花に合います。乾燥のため、天水と灌漑で収量の安定性が異なります。',
    bounds: [-104.3, 30.0, -98.4, 35.8],
    detailCrop: 'cotton',
    sourceIds: ['source-usda-cotton', 'source-usda-southern-plains'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'southeast-cotton',
    cropIds: ['cotton'],
    title: '南東部の綿花',
    summary: '綿花は霜のない暖かな期間と、生育中の水分を必要とします。南東部は長い生育期と湿った空気から降る雨を得やすく、収穫・綿繰り・輸送の仕組みも集積したため、州境をまたぐ産地が形成されました。',
    compactSummary: '長い暖期と生育期の雨、綿繰り・輸送の集積が、南東部の綿花産地を支えます。',
    bounds: [-93.2, 29.5, -75.5, 37.5],
    detailCrop: 'cotton',
    sourceIds: ['source-usda-cotton'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'northern-plains-wheat',
    cropIds: ['wheat'],
    title: '北部グレートプレーンズの小麦',
    summary: '春小麦やデュラム小麦は寒い冬の後に播種でき、稲のような湛水を要しません。東側は天水、西側ほど乾燥と干ばつの影響が大きいという勾配の中で、品種・作型と広い耕地を組み合わせた産地が続きます。',
    compactSummary: '寒さに合う春まきの作型と広い畑が中心。西へ乾くほど水不足の影響が増します。',
    bounds: [-106.5, 42.0, -96.0, 49.8],
    detailCrop: 'wheat',
    sourceIds: ['source-usda-wheat', 'source-usda-northern-plains'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'central-southern-plains',
    cropIds: ['wheat', 'corn'],
    title: '中央・南部グレートプレーンズ',
    summary: '大平原では東から西へ降水が減り、乾燥に比較的適応する冬小麦が広く栽培されます。とうもろこしは夏の水分が収量を左右するため、地域によって天水と灌漑を組み合わせ、乾燥・干ばつへの備えが重要になります。',
    compactSummary: '西へ乾く降水勾配の中で、小麦の作型と、とうもろこしの天水・灌漑を使い分けます。',
    bounds: [-105.2, 31.0, -95.0, 42.2],
    detailCrop: 'wheat',
    sourceIds: ['source-usda-wheat', 'source-usda-southern-plains'],
    checkedAt: '2026-09-13'
  },
  {
    id: 'midwest-corn-soy',
    cropIds: ['corn', 'soybean'],
    title: '中西部のとうもろこし・大豆',
    summary: '両作物は暖かな夏と生育期の水分を必要とします。メキシコ湾方面から運ばれる湿った空気が夏の雨を支え、平坦で深い土と広い耕地に、輪作・集荷・飼料・加工の網が重なって大産地が続いています。',
    compactSummary: '暖かな夏、湿った空気がもたらす雨、平坦な耕地と加工網が二作物を結びます。',
    bounds: [-98.7, 36.0, -79.5, 49.2],
    detailCrop: 'corn',
    sourceIds: ['source-usda-midwest', 'source-noaa-low-level-jet', 'source-iowa-corn-water'],
    checkedAt: '2026-09-13'
  }
];

export const regionalInsightIds = regionalInsights.map(({ id }) => id);

export function findRegionalInsight(cropId: string, longitude: number, latitude: number) {
  const normalized = cropId === 'corn-soybean' ? ['corn', 'soybean'] : [cropId];
  return regionalInsights
    .filter((entry) => entry.cropIds.some((crop) => normalized.includes(crop)))
    .filter(({ bounds: [west, south, east, north] }) => longitude >= west && longitude <= east && latitude >= south && latitude <= north)
    .sort((left, right) => area(left.bounds) - area(right.bounds))[0] ?? null;
}

function area([west, south, east, north]: RegionalInsight['bounds']) {
  return (east - west) * (north - south);
}
