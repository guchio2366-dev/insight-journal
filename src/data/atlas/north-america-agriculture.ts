import stateGeometry from "./us-states.json";

export type CropId = "corn" | "soybean" | "wheat" | "cotton" | "rice" | "specialty";
export type MapFeatureKind = "terrain" | "river" | "lake";

export interface AtlasSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  note: string;
}

export interface AtlasStateGeometry {
  id: string;
  postal: string;
  nameJa: string;
  nameEn: string;
  path: string;
  labelX: number;
  labelY: number;
}

export interface AtlasPlace {
  id: string;
  postal: string;
  nameJa: string;
  nameEn: string;
  region: string;
  zoneIds: string[];
  cropIds: CropId[];
  summary: string;
}

export interface AtlasZone {
  id: string;
  nameJa: string;
  nameEn: string;
  path: string;
  labelX: number;
  labelY: number;
  label?: string;
  cropIds: CropId[];
  summary: string;
  insightIds: string[];
  relatedStateIds: string[];
  sourceIds: string[];
  method: "evidence-reviewed-editorial";
}

export interface AtlasInsight {
  id: string;
  title: string;
  shortText: string;
  zoneIds: string[];
  cropIds: CropId[];
  granularity: "regional" | "subregional" | "local";
  priority: "primary" | "secondary";
  placement: "overview" | "map-label" | "on-selection";
  mapLabel: string | null;
  reportSectionId: string;
  sourceIds: string[];
}

export interface AtlasPhysicalFeature {
  id: string;
  kind: MapFeatureKind;
  label: string;
  path: string;
  labelX?: number;
  labelY?: number;
}

export interface AtlasMapLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  kind: "region" | "water" | "country";
}

export interface ReportSection {
  id: string;
  number: string;
  title: string;
  lead: string;
  paragraphs: string[];
  bullets?: string[];
}

const cropLabels: Record<CropId, string> = {
  corn: "トウモロコシ",
  soybean: "大豆",
  wheat: "小麦",
  cotton: "綿花",
  rice: "稲作",
  specialty: "果樹・野菜"
};

const bounds = { west: -125, south: 24, east: -66, north: 50 } as const;
const viewBox = "0 0 1200 620";

function project([longitude, latitude]: [number, number]): [number, number] {
  return [
    ((longitude - bounds.west) / (bounds.east - bounds.west)) * 1200,
    ((bounds.north - latitude) / (bounds.north - bounds.south)) * 620
  ];
}

function formatNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

function polygonPath(points: [number, number][]): string {
  const projected = points.map(project);
  return `${projected.map(([x, y], index) => `${index === 0 ? "M" : "L"}${formatNumber(x)},${formatNumber(y)}`).join(" ")} Z`;
}

function multiPolygonPath(polygons: [number, number][][]): string {
  return polygons.map(polygonPath).join(" ");
}

function linePath(points: [number, number][]): string {
  const projected = points.map(project);
  return projected.map(([x, y], index) => `${index === 0 ? "M" : "L"}${formatNumber(x)},${formatNumber(y)}`).join(" ");
}

export const geometry = stateGeometry as {
  schemaVersion: number;
  viewBox: string;
  bounds: { west: number; south: number; east: number; north: number };
  states: AtlasStateGeometry[];
};

export const agricultureField = {
  atlasId: "north-america-agriculture",
  regionId: "north-america",
  fieldId: "agriculture",
  title: "北米の農業",
  coverage: "米国本土48州＋ワシントンDC（カナダ・メキシコは地理的文脈）",
  dataStatus: "資料に基づく概略編集",
  dataNote: "色の面は州別の生産量ではなく、気候・地形・水利・土地利用が重なる主要栽培域を編集したものです。州境は位置を確かめる補助線で、色のない場所が農業を行っていないことを意味しません。",
  methodNote: "USDAの作物地域に関する記述と公開地理資料を読み合わせ、複数州にまたがる不整形の地域として作図しています。将来、対象年と集約方法を固定したCDL集計へ更新できます。",
  updatedAt: "2026-09-12",
  cropOrder: ["corn", "soybean", "wheat", "cotton", "rice", "specialty"] as CropId[],
  cropLabels,
  cropColors: {
    corn: "#e0ad3f",
    soybean: "#6f9b62",
    wheat: "#bd7b45",
    cotton: "#b06f9d",
    rice: "#4f91a5",
    specialty: "#c8664d"
  } satisfies Record<CropId, string>
};

export const sources: AtlasSource[] = [
  {
    id: "source-natural-earth-admin1",
    title: "Admin 1 states and provinces",
    publisher: "Natural Earth",
    url: "https://www.naturalearthdata.com/about/terms-of-use/",
    note: "州境とラベル位置の元資料。public domainの地理データを補助線として利用。"
  },
  {
    id: "source-natural-earth-physical",
    title: "Physical vectors and shaded relief",
    publisher: "Natural Earth",
    url: "https://www.naturalearthdata.com/downloads/50m-physical-vectors/",
    note: "山地・河川・湖沼を読むための地理表現の参照資料。"
  },
  {
    id: "source-usda-cdl-faq",
    title: "Cropland Data Layer FAQ",
    publisher: "USDA National Agricultural Statistics Service",
    url: "https://www.nass.usda.gov/Research_and_Science/Cropland/sarsfaqs2.php",
    note: "作物別の土地被覆を年次ラスターで把握する正規資料。現行図はCDLを集計した数値地図ではない。"
  },
  {
    id: "source-usda-midwest",
    title: "Agriculture in the Midwest",
    publisher: "USDA Climate Hubs",
    url: "https://www.climatehubs.usda.gov/hubs/midwest/topic/agriculture-midwest",
    note: "コーンベルトと中西部のトウモロコシ・大豆の地域性を確認する資料。"
  },
  {
    id: "source-usda-rice",
    title: "Rice sector at a glance",
    publisher: "USDA Economic Research Service",
    url: "https://www.ers.usda.gov/topics/crops/rice/rice-sector-at-a-glance",
    note: "アーカンソー・ミシシッピ川下流・湾岸・サクラメントバレーに集中する稲作の地域性。"
  },
  {
    id: "source-usda-cotton",
    title: "Cotton sector at a glance",
    publisher: "USDA Economic Research Service",
    url: "https://www.ers.usda.gov/topics/crops/cotton-and-wool/cotton-sector-at-a-glance",
    note: "温暖な生育期と収穫期の乾燥を綿花の条件として読むための資料。"
  },
  {
    id: "source-usgs-high-plains",
    title: "High Plains aquifer water-level and storage changes",
    publisher: "U.S. Geological Survey",
    url: "https://www.usgs.gov/publications/water-level-and-recoverable-water-storage-changes-high-plains-aquifer-predevelopment-1",
    note: "大平原の地下水論点。常設主題ではなく該当地域を選んだときの補助解説に利用。"
  }
];

export const contextLand = [
  { id: "canada-context", label: "カナダ", path: polygonPath([[-125, 50], [-66, 50], [-66, 48.9], [-84, 49], [-96, 49], [-111, 49], [-125, 49]]) },
  { id: "mexico-context", label: "メキシコ", path: polygonPath([[-117, 24], [-86, 24], [-88, 25.2], [-102, 25], [-111, 27], [-117, 29]]) }
];

export const physicalFeatures: AtlasPhysicalFeature[] = [
  {
    id: "terrain-rockies",
    kind: "terrain",
    label: "ロッキー山脈",
    path: multiPolygonPath([
      [[-116, 49], [-111, 49], [-106, 43], [-104, 38], [-108, 31], [-113, 31], [-111, 37], [-115, 43]],
      [[-121, 49], [-117, 49], [-114, 43], [-117, 37], [-120, 38], [-118, 44]]
    ])
  },
  {
    id: "terrain-great-plains",
    kind: "terrain",
    label: "グレートプレーンズ",
    path: polygonPath([[-111, 49], [-97, 49], [-94, 43], [-96, 33], [-106, 29], [-111, 34], [-108, 41]])
  },
  {
    id: "terrain-appalachians",
    kind: "terrain",
    label: "アパラチア山脈",
    path: polygonPath([[-84, 45], [-80, 44], [-77, 39], [-80, 34], [-84, 35], [-82, 40]])
  },
  {
    id: "terrain-sierra-cascades",
    kind: "terrain",
    label: "シエラネバダ・カスケード",
    path: polygonPath([[-124, 49], [-121, 49], [-117, 40], [-119, 35], [-123, 35], [-121, 42]])
  },
  {
    id: "river-mississippi",
    kind: "river",
    label: "ミシシッピ川",
    path: linePath([[-95.2, 47.3], [-93.5, 44], [-91.2, 41], [-91.4, 38], [-90.2, 35], [-91.2, 32], [-90, 29]])
  },
  {
    id: "river-missouri",
    kind: "river",
    label: "ミズーリ川",
    path: linePath([[-111, 45.8], [-106, 46], [-101, 44], [-96, 41], [-93.5, 39]])
  },
  {
    id: "river-ohio",
    kind: "river",
    label: "オハイオ川",
    path: linePath([[-89.5, 37], [-86.5, 37.7], [-83.5, 38.5], [-80, 39.5]])
  },
  {
    id: "river-arkansas",
    kind: "river",
    label: "アーカンソー川",
    path: linePath([[-106, 38], [-101, 37], [-96, 36], [-92, 35]])
  },
  {
    id: "river-columbia",
    kind: "river",
    label: "コロンビア川",
    path: linePath([[-121, 46], [-118, 46], [-116, 45]])
  },
  {
    id: "river-sacramento",
    kind: "river",
    label: "サクラメント川",
    path: linePath([[-122.5, 40.8], [-121.5, 39], [-121, 37.5]])
  },
  {
    id: "lake-great-lakes",
    kind: "lake",
    label: "五大湖",
    path: multiPolygonPath([
      [[-92, 48], [-84, 48], [-82, 45], [-86, 44], [-90, 45]],
      [[-84, 45], [-78, 45], [-76, 43], [-80, 42], [-84, 43]],
      [[-83, 42], [-78, 42], [-77, 40], [-81, 40]],
      [[-90, 44], [-84, 44], [-83, 42], [-88, 41]]
    ])
  },
  {
    id: "lake-great-salt",
    kind: "lake",
    label: "グレートソルト湖",
    path: polygonPath([[-113, 42.5], [-111.5, 42.8], [-111, 41.8], [-112.5, 41.4]])
  }
];

export const mapLabels: AtlasMapLabel[] = [
  { id: "label-great-plains", text: "グレートプレーンズ", x: project([-103, 39])[0], y: project([-103, 39])[1], kind: "region" },
  { id: "label-central-lowlands", text: "中央平原", x: project([-91, 39])[0], y: project([-91, 39])[1], kind: "region" },
  { id: "label-central-valley", text: "セントラルバレー", x: project([-121.7, 37.5])[0], y: project([-121.7, 37.5])[1], kind: "region" },
  { id: "label-canada", text: "カナダ", x: project([-96, 49.7])[0], y: project([-96, 49.7])[1], kind: "country" },
  { id: "label-mexico", text: "メキシコ", x: project([-103, 25])[0], y: project([-103, 25])[1], kind: "country" },
  { id: "label-mississippi", text: "ミシシッピ川", x: project([-90.8, 34.4])[0], y: project([-90.8, 34.4])[1], kind: "water" },
  { id: "label-great-lakes", text: "五大湖", x: project([-84, 44.8])[0], y: project([-84, 44.8])[1], kind: "water" }
];

const stateRegion: Record<string, string> = {
  AL: "南東部", AR: "ミシシッピ川下流域", AZ: "南西部", CA: "太平洋岸", CO: "大平原・山岳部",
  CT: "北東部", DC: "大西洋岸", DE: "大西洋岸", FL: "南東部", GA: "南東部", IA: "コーンベルト",
  ID: "北西部", IL: "コーンベルト", IN: "コーンベルト", KS: "大平原", KY: "南部内陸", LA: "ミシシッピ川下流域",
  MA: "北東部", MD: "大西洋岸", ME: "北東部", MI: "五大湖周辺", MN: "コーンベルト北部", MO: "中西部",
  MS: "ミシシッピ川下流域", MT: "大平原北部", NC: "南東部", ND: "大平原北部", NE: "大平原", NH: "北東部",
  NJ: "大西洋岸", NM: "南西部", NV: "山岳部", NY: "北東部", OH: "コーンベルト東部", OK: "大平原",
  OR: "太平洋岸", PA: "北東部", RI: "北東部", SC: "南東部", SD: "大平原北部", TN: "南部内陸",
  TX: "大平原・南部", UT: "山岳部", VA: "大西洋岸", VT: "北東部", WA: "太平洋岸", WI: "五大湖周辺",
  WV: "アパラチア", WY: "山岳部"
};

const zone = (
  id: string,
  nameJa: string,
  nameEn: string,
  cropIds: CropId[],
  polygons: [number, number][][],
  label: string,
  labelPoint: [number, number],
  summary: string,
  relatedStateIds: string[],
  sourceIds: string[]
): AtlasZone => ({
  id,
  nameJa,
  nameEn,
  path: multiPolygonPath(polygons),
  labelX: project(labelPoint)[0],
  labelY: project(labelPoint)[1],
  label,
  cropIds,
  summary,
  insightIds: [],
  relatedStateIds,
  sourceIds,
  method: "evidence-reviewed-editorial"
});

const onePolygon = (points: [number, number][]): [number, number][][] => [points];

export const zones: AtlasZone[] = [
  zone(
    "zone-corn-belt",
    "コーンベルト",
    "Corn Belt",
    ["corn"],
    onePolygon([[-101, 43], [-96, 45], [-89, 44], [-84, 42], [-82, 39], [-88, 37], [-96, 38], [-101, 40]]),
    "トウモロコシ",
    [-91, 41],
    "平坦で連続した耕地、夏の気温、河川・鉄道・加工網が重なる中西部の帯。大豆域と重なり、輪作として読む。",
    ["US-NE", "US-IA", "US-MN", "US-WI", "US-IL", "US-IN", "US-OH", "US-MO"],
    ["source-usda-midwest", "source-usda-cdl-faq"]
  ),
  zone(
    "zone-soybean-belt",
    "大豆ベルト",
    "Soybean Belt",
    ["soybean"],
    onePolygon([[-99, 43], [-93, 44], [-86, 43], [-82, 40], [-85, 36], [-92, 35], [-99, 38], [-103, 40]]),
    "大豆",
    [-88, 39],
    "コーンベルトと広く重なる大豆の帯。夏の温度・水分、平坦な耕地、飼料・油・輸出向けの加工と輸送が地域の形を作る。",
    ["US-NE", "US-IA", "US-MN", "US-WI", "US-IL", "US-IN", "US-OH", "US-MO", "US-AR", "US-MS"],
    ["source-usda-midwest", "source-usda-cdl-faq"]
  ),
  zone(
    "zone-wheat-plains",
    "大平原の小麦域",
    "Great Plains Wheat",
    ["wheat"],
    [
      [[-111, 49], [-97, 49], [-96, 43], [-102, 41], [-109, 42]],
      [[-106, 41], [-96, 42], [-94, 38], [-98, 32], [-106, 31], [-109, 35]]
    ],
    "小麦",
    [-103, 36],
    "東から西へ乾燥する降水勾配のなかで、品種と作型の幅が大きい小麦が大平原を横断する。灌漑の有無が局所差を作る。",
    ["US-MT", "US-ND", "US-SD", "US-NE", "US-KS", "US-OK", "US-TX", "US-CO", "US-WY", "US-NM"],
    ["source-usda-cdl-faq", "source-usgs-high-plains"]
  ),
  zone(
    "zone-wheat-pacific-northwest",
    "太平洋岸北西部の小麦域",
    "Pacific Northwest Wheat",
    ["wheat"],
    onePolygon([[-123, 49], [-117, 49], [-116, 45], [-119, 44], [-123, 46]]),
    "小麦",
    [-120, 46.5],
    "冬の降水と内陸の乾燥が組み合わさる太平洋岸北西部の小麦域。山地と海岸の間の水分勾配を読む。",
    ["US-WA", "US-OR", "US-ID"],
    ["source-usda-cdl-faq", "source-natural-earth-physical"]
  ),
  zone(
    "zone-cotton-plains",
    "テキサス西部の綿花域",
    "West Texas Cotton",
    ["cotton"],
    onePolygon([[-106, 36], [-98, 36], [-99, 30], [-105, 29], [-108, 32]]),
    "綿花",
    [-102, 32.5],
    "温暖な生育期を持つ南部平原の綿花域。乾燥側では灌漑が水分条件を補い、地下水の持続性が論点になる。",
    ["US-TX", "US-NM", "US-OK"],
    ["source-usda-cotton", "source-usgs-high-plains"]
  ),
  zone(
    "zone-cotton-southeast",
    "南東部の綿花域",
    "Southeast Cotton",
    ["cotton"],
    onePolygon([[-91, 36], [-84, 36], [-78, 34], [-77, 30], [-84, 29], [-91, 31], [-94, 34]]),
    "綿花",
    [-84, 32],
    "温暖な生育期と収穫期の雨の少なさが重要な南東部の綿花域。現在の生産は機械化・企業構造・労働・加工市場を分けて読む。",
    ["US-AR", "US-MS", "US-AL", "US-GA", "US-SC", "US-NC", "US-TN"],
    ["source-usda-cotton"]
  ),
  zone(
    "zone-rice-delta",
    "ミシシッピ川下流の稲作域",
    "Lower Mississippi Rice",
    ["rice"],
    onePolygon([[-94, 36], [-89, 36], [-88, 32], [-91, 30], [-94, 32]]),
    "稲作",
    [-91, 33.5],
    "ミシシッピ川下流の平坦な低地と水管理が結びつく稲作域。水路・灌漑・集荷の仕組みを地形と一緒に見る。",
    ["US-AR", "US-MS", "US-LA", "US-MO"],
    ["source-usda-rice"]
  ),
  zone(
    "zone-rice-gulf",
    "湾岸の稲作域",
    "Gulf Coast Rice",
    ["rice"],
    onePolygon([[-97, 31], [-91, 31], [-91, 28], [-96, 28], [-98, 29]]),
    "稲作",
    [-94, 29.5],
    "テキサス沿岸からルイジアナ南西部にかけての稲作域。平坦な土地、灌漑、温暖な生育期が水利と組み合わさる。",
    ["US-TX", "US-LA"],
    ["source-usda-rice"]
  ),
  zone(
    "zone-rice-sacramento",
    "サクラメントバレーの稲作域",
    "Sacramento Valley Rice",
    ["rice"],
    onePolygon([[-123, 41], [-120, 41], [-120, 37], [-122, 37], [-123, 39]]),
    "稲作",
    [-121.5, 39],
    "乾燥したカリフォルニアで、平坦な谷底と貯水・灌漑が稲作を可能にする。園芸域とも重なる水利用の場所として読む。",
    ["US-CA"],
    ["source-usda-rice", "source-natural-earth-physical"]
  ),
  zone(
    "zone-specialty-central-valley",
    "カリフォルニアの園芸域",
    "California Specialty Crops",
    ["specialty"],
    onePolygon([[-124, 39], [-119, 39], [-118, 35], [-121, 33], [-123, 35]]),
    "果樹・野菜",
    [-120.5, 36],
    "セントラルバレーを中心とする果樹・野菜の集積。乾燥気候を灌漑で補い、水利・労働・市場への近さを重ねて読む。",
    ["US-CA"],
    ["source-usda-cdl-faq", "source-natural-earth-physical"]
  )
];

export const cropOverlapPath = polygonPath([[-99, 42], [-93, 43], [-87, 42], [-86, 39], [-90, 37], [-96, 38], [-99, 40]]);

const makeInsight = (
  id: string,
  title: string,
  shortText: string,
  zoneIds: string[],
  cropIds: CropId[],
  priority: "primary" | "secondary",
  placement: "map-label" | "on-selection",
  reportSectionId: string,
  sourceIds: string[]
): AtlasInsight => ({
  id,
  title,
  shortText,
  zoneIds,
  cropIds,
  granularity: placement === "map-label" ? "regional" : "local",
  priority,
  placement,
  mapLabel: placement === "map-label" ? title : null,
  reportSectionId,
  sourceIds
});

export const insights: AtlasInsight[] = [
  makeInsight("insight-corn-soy-belt", "コーンベルトの輪作", "中西部では、平坦で連続した耕地、夏の気温、穀物エレベーターや加工・輸送網が重なり、トウモロコシと大豆の帯が州境をまたいで続きます。二つの色が重なる場所は、作物を一枚岩の州単位で捉えないための入口です。", ["zone-corn-belt", "zone-soybean-belt"], ["corn", "soybean"], "primary", "map-label", "regional-development", ["source-usda-midwest", "source-usda-cdl-faq"]),
  makeInsight("insight-great-plains-wheat", "大平原の小麦と水", "大平原は東へ行くほど降水が増え、西へ行くほど乾燥します。小麦はこの勾配を横断しやすい一方、トウモロコシや綿花では降水・土壌・灌漑の組み合わせが地域差を作ります。", ["zone-wheat-plains", "zone-wheat-pacific-northwest"], ["wheat"], "primary", "map-label", "regional-development", ["source-usda-cdl-faq", "source-usgs-high-plains"]),
  makeInsight("insight-southern-cotton", "温暖な生育期と綿花", "綿花は温暖な生育期を必要とし、収穫期の雨が少ない条件が機械収穫と相性を持ちます。南部の分布を読むときは、自然条件に加えて機械化・企業構造・労働・加工市場を分けて確認します。", ["zone-cotton-plains", "zone-cotton-southeast"], ["cotton"], "primary", "map-label", "crop-conditions", ["source-usda-cotton"]),
  makeInsight("insight-rice-water", "水管理で読む稲作域", "米国の稲作は、アーカンソー・ミシシッピ川下流、湾岸、サクラメントバレーにまとまりがあります。年間降水量だけでなく、平坦な土地、貯水・灌漑、水路と集荷の仕組みを合わせて読みます。", ["zone-rice-delta", "zone-rice-gulf", "zone-rice-sacramento"], ["rice"], "primary", "map-label", "crop-conditions", ["source-usda-rice"]),
  makeInsight("insight-california-irrigation", "乾燥地の灌漑と園芸", "セントラルバレーでは、乾燥した気候でも水利と市場向けの園芸が結びつきます。稲作域と園芸域の重なりを、作物同士の競合・水利・労働の関係を考える入口にします。", ["zone-rice-sacramento", "zone-specialty-central-valley"], ["rice", "specialty"], "primary", "on-selection", "what-is-changing", ["source-usda-rice", "source-usda-cdl-faq"]),
  makeInsight("insight-high-plains-groundwater", "地下水利用と農業", "大平原の帯水層では、灌漑が作付けを支える一方、水位と貯留量の変化に地域差があります。常時表示の主題にはせず、大平原の作物域を選んだときの二次論点として扱います。", ["zone-wheat-plains", "zone-cotton-plains", "zone-corn-belt"], ["wheat", "cotton", "corn"], "secondary", "on-selection", "what-is-changing", ["source-usgs-high-plains"])
];

for (const currentZone of zones) {
  currentZone.insightIds = insights
    .filter((insight) => insight.zoneIds.includes(currentZone.id))
    .map((insight) => insight.id);
}

export const places: AtlasPlace[] = geometry.states.map((state) => {
  const zoneIds = zones.filter((currentZone) => currentZone.relatedStateIds.includes(state.id)).map((currentZone) => currentZone.id);
  const cropIds = Array.from(new Set(zoneIds.flatMap((zoneId) => zones.find((currentZone) => currentZone.id === zoneId)?.cropIds ?? [])));
  return {
    id: state.id,
    postal: state.postal,
    nameJa: state.nameJa,
    nameEn: state.nameEn,
    region: stateRegion[state.postal] ?? "米国本土",
    zoneIds,
    cropIds,
    summary: `${state.nameJa}は${stateRegion[state.postal] ?? "米国本土"}に位置します。作物域は州境をまたぐため、州は地図上の位置確認用として参照します。`
  };
});

export const reportSections: ReportSection[] = [
  {
    id: "crop-conditions",
    number: "01",
    title: "作物の基本条件",
    lead: "作物の分布は、気温・水・土壌・生育期間の組み合わせで読む。単一の自然条件だけで決まるわけではない。",
    paragraphs: [
      "トウモロコシと大豆は、夏の気温とまとまった耕地、機械化・飼料・加工のつながりを持つ中西部で大きな帯を作る。大豆は根粒菌による窒素固定を行うが、肥料が不要でも、どの土壌でも高収量になるわけではない。",
      "小麦は品種と作型の幅が広く、乾燥側の大平原から北部の平原、太平洋岸北西部まで分布する。稲作は水管理の比重が大きく、年間降水量だけでなく、灌漑設備と平坦な土地を合わせて考える。",
      "綿花は温暖な生育期を必要とし、収穫期の雨が少ない条件が機械収穫と相性を持つ。果樹・野菜は、灌漑、水利、労働、市場への近さが自然条件と結びつく。"
    ],
    bullets: [
      "この地図の色は、作物域を理解するための編集概略である。生産量・収益・単収の順位ではない。",
      "同じ州の内部にも複数の作物帯がある。州境は分布の境界ではない。"
    ]
  },
  {
    id: "regional-development",
    number: "02",
    title: "なぜその地域で発達したか",
    lead: "自然条件に、土地の大きさ、灌漑、輸送、加工、市場、政策が重なって農業地域が形成される。",
    paragraphs: [
      "中西部では、平坦で連続した耕地、河川・鉄道・穀物エレベーター、飼料や食品加工の集積が、トウモロコシと大豆の輪作を支えてきた。作物そのものだけでなく、収穫後に集め、乾燥し、加工し、輸送する仕組みまでが地域の優位性になる。",
      "大平原では、東へ行くほど降水が増え、西へ行くほど乾燥するという大きな勾配がある。小麦はこの乾燥側にも適応しやすい一方、トウモロコシや牧草では降水・土壌・灌漑の組み合わせが収益性を左右する。",
      "南部の綿花・稲作は、温暖な生育期と水利・加工の歴史を持つ地域に分布する。過去の土地制度や人種化された労働の歴史も地域形成に関わったが、現在の生産をその歴史だけで説明せず、機械化・企業構造・移民労働・市場を分けて記述する。"
    ]
  },
  {
    id: "what-is-changing",
    number: "03",
    title: "現在、何が変わっているか",
    lead: "気候、水資源、労働、輸送、政策が変わると、同じ作物帯でも制約の重みが変わる。",
    paragraphs: [
      "灌漑地域では、利用できる水量と地下水位が作付けの持続性を左右する。大平原の帯水層では低下の程度に地域差があるため、地下水の論点は場所を選んだときの補助解説として表示し、北米農業全体の代表論点には固定しない。",
      "作物の価格、投入資材、輸出需要、保険・補助制度、加工施設の立地が変われば、農家が選ぶ作物も変わる。ニュースを追加する際は、政策の発生地、影響範囲、報道日を分け、地図の静的な作物分布と混ぜない。",
      "現行レイヤーは理解の入口としての編集試作である。次の更新では、USDA CDL等の対象年・分類コード・集約単位を記録し、実測データへ段階的に更新する。精度が上がっても、読者が地域差を一目でつかめる簡略化は残す。"
    ],
    bullets: [
      "地下水は常設の主題ではなく、該当地域を選んだときに表示する二次論点。",
      "北米の実際のニュースと年表は、公開記事が追加された時点で発生地・影響範囲・報道日を分けて地図へ追加する。"
    ]
  }
];

export const timelineEvents: Array<{ id: string; dateLabel: string; title: string; description: string }> = [];

export function getZone(zoneId: string | null | undefined): AtlasZone | undefined {
  return zones.find((currentZone) => currentZone.id === zoneId);
}

export function getInsight(insightId: string | null | undefined): AtlasInsight | undefined {
  return insights.find((currentInsight) => currentInsight.id === insightId);
}

export function getZoneInsights(zoneId: string | null | undefined): AtlasInsight[] {
  if (!zoneId) return [];
  return insights
    .filter((insight) => insight.zoneIds.includes(zoneId))
    .sort((left, right) => (left.priority === right.priority ? left.id.localeCompare(right.id) : left.priority === "primary" ? -1 : 1));
}

export function getPlace(placeId: string | null | undefined): AtlasPlace | undefined {
  return places.find((place) => place.id === placeId);
}
