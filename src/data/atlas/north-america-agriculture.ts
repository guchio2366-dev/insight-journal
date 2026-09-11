import stateGeometry from "./us-states.json";

export type CropId =
  | "corn"
  | "soybean"
  | "wheat"
  | "cotton"
  | "rice"
  | "specialty"
  | "forage"
  | "mixed";

export interface AtlasSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  note: string;
}

export interface AtlasPlace {
  id: string;
  postal: string;
  nameJa: string;
  nameEn: string;
  region: string;
  cropId: CropId;
  summary: string;
  insightIds: string[];
}

export interface AtlasInsight {
  id: string;
  title: string;
  shortText: string;
  placeIds: string[];
  cropIds: CropId[];
  granularity: "regional" | "subregional" | "local";
  priority: "primary" | "secondary";
  placement: "overview" | "map-label" | "on-selection";
  mapLabel: string | null;
  reportSectionId: string;
  sourceIds: string[];
}

export interface ReportSection {
  id: string;
  number: string;
  title: string;
  lead: string;
  paragraphs: string[];
  bullets?: string[];
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

const cropByState: Record<string, CropId> = {
  AL: "cotton", AR: "rice", AZ: "forage", CA: "specialty", CO: "wheat", CT: "mixed",
  DC: "mixed", DE: "soybean", FL: "specialty", GA: "cotton", IA: "corn", ID: "wheat",
  IL: "corn", IN: "soybean", KS: "wheat", KY: "soybean", LA: "rice", MA: "mixed",
  MD: "soybean", ME: "mixed", MI: "corn", MN: "corn", MO: "soybean", MS: "cotton",
  MT: "wheat", NC: "cotton", ND: "wheat", NE: "corn", NH: "mixed", NJ: "mixed",
  NM: "forage", NV: "forage", NY: "mixed", OH: "soybean", OK: "wheat", OR: "specialty",
  PA: "mixed", RI: "mixed", SC: "cotton", SD: "wheat", TN: "soybean", TX: "cotton",
  UT: "forage", VA: "mixed", VT: "mixed", WA: "wheat", WI: "corn", WV: "mixed", WY: "forage"
};

const regionByState: Record<string, string> = {
  AL: "南東部", AR: "ミシシッピ川下流域", AZ: "南西部", CA: "太平洋岸", CO: "大平原・山岳部",
  CT: "北東部", DC: "大西洋岸", DE: "大西洋岸", FL: "南東部", GA: "南東部", IA: "コーンベルト",
  ID: "北西部", IL: "コーンベルト", IN: "コーンベルト", KS: "大平原", KY: "南部内陸",
  LA: "ミシシッピ川下流域", MA: "北東部", MD: "大西洋岸", ME: "北東部", MI: "五大湖周辺",
  MN: "コーンベルト北部", MO: "中西部", MS: "ミシシッピ川下流域", MT: "大平原北部", NC: "南東部",
  ND: "大平原北部", NE: "大平原", NH: "北東部", NJ: "大西洋岸", NM: "南西部", NV: "山岳部",
  NY: "北東部", OH: "コーンベルト東部", OK: "大平原", OR: "太平洋岸", PA: "北東部", RI: "北東部",
  SC: "南東部", SD: "大平原北部", TN: "南部内陸", TX: "大平原・南部", UT: "山岳部", VA: "大西洋岸",
  VT: "北東部", WA: "太平洋岸", WI: "五大湖周辺", WV: "アパラチア", WY: "山岳部"
};

const cropLabels: Record<CropId, string> = {
  corn: "トウモロコシ",
  soybean: "大豆",
  wheat: "小麦",
  cotton: "綿花",
  rice: "稲作",
  specialty: "果樹・野菜",
  forage: "飼料・放牧",
  mixed: "混在・その他"
};

export const agricultureField = {
  atlasId: "north-america-agriculture",
  regionId: "north-america",
  fieldId: "agriculture",
  title: "北米の農業",
  coverage: "米国本土48州＋ワシントンDC",
  dataStatus: "初期編集レイヤー",
  dataNote: "州ごとの代表作物を、地域の入口として概略表示しています。州全体が一作物という意味ではなく、生産量や収益の順位を示す地図でもありません。",
  updatedAt: "2026-09-12",
  cropLabels,
  cropColors: {
    corn: "#e4b34d",
    soybean: "#7aa46a",
    wheat: "#c9864c",
    cotton: "#b77aa3",
    rice: "#5f9eb0",
    specialty: "#d27b58",
    forage: "#7d8e9c",
    mixed: "#b5b1a2"
  } satisfies Record<CropId, string>
};

const stateNotes: Record<string, string> = {
  KS: "乾燥した大平原では小麦が広く作られ、雨の少ない地域では灌漑が作付けの条件を補います。",
  IA: "温暖な夏と肥沃な土壌を背景に、トウモロコシと大豆が輪作・飼料・加工産業と結びついています。",
  IL: "中西部の平坦な耕地と輸送網が、トウモロコシ・大豆の大規模な集積を支えています。",
  NE: "大平原東部の耕地ではトウモロコシが目立ち、乾燥側では灌漑が地域差を作ります。",
  AR: "ミシシッピ川下流の平坦な土地と灌漑が、米国の稲作が集中する背景になります。",
  LA: "ミシシッピ川下流の低地と水管理が、稲作を含む南部の作付けを支えています。",
  TX: "州内の気候差が大きく、綿花は温暖な生育期と収穫期の乾燥を利用する地域で広がります。",
  CA: "乾燥した気候でも、セントラルバレーなどでは灌漑と市場向け園芸が結びついています。",
  WA: "太平洋岸北西部では小麦を含む作付けが、降水の季節性と内陸の乾燥条件の組み合わせで変わります。",
  GA: "南東部の温暖な生育期と土壌・降水条件が、綿花などの作付けと加工の立地に関係します。"
};

const keyInsight = (id: string, title: string, shortText: string, placeIds: string[], cropIds: CropId[], priority: "primary" | "secondary", placement: "on-selection" | "map-label", reportSectionId: string, sourceIds: string[]): AtlasInsight => ({
  id,
  title,
  shortText,
  placeIds,
  cropIds,
  granularity: placement === "map-label" ? "subregional" : "local",
  priority,
  placement,
  mapLabel: placement === "map-label" ? title : null,
  reportSectionId,
  sourceIds
});

export const sources: AtlasSource[] = [
  {
    id: "source-natural-earth-admin1",
    title: "Admin 1 states and provinces",
    publisher: "Natural Earth",
    url: "https://www.naturalearthdata.com/about/terms-of-use/",
    note: "州境とラベル位置の元資料。public domain。"
  },
  {
    id: "source-usda-cdl-faq",
    title: "Cropland Data Layer FAQ",
    publisher: "USDA NASS",
    url: "https://www.nass.usda.gov/Research_and_Science/Cropland/sarsfaqs2.php",
    note: "将来、作物別の栽培面積を加工する際の正規資料。現行の色分けをCDL集計済みとは扱わない。"
  },
  {
    id: "source-usda-rice",
    title: "Rice sector at a glance",
    publisher: "USDA Economic Research Service",
    url: "https://www.ers.usda.gov/topics/crops/rice/rice-sector-at-a-glance",
    note: "稲作の地域性と灌漑に関する一般条件。"
  },
  {
    id: "source-usda-cotton",
    title: "Cotton sector at a glance",
    publisher: "USDA Economic Research Service",
    url: "https://www.ers.usda.gov/topics/crops/cotton-and-wool/cotton-sector-at-a-glance",
    note: "綿花の生育期・収穫期の一般条件。"
  },
  {
    id: "source-usgs-high-plains",
    title: "High Plains aquifer water-level and storage changes",
    publisher: "U.S. Geological Survey",
    url: "https://www.usgs.gov/publications/water-level-and-recoverable-water-storage-changes-high-plains-aquifer-predevelopment-1",
    note: "大平原の地下水論点。地域差があるため、地図の常設主題にはしない。"
  }
];

export const geometry = stateGeometry as {
  schemaVersion: number;
  viewBox: string;
  bounds: { west: number; south: number; east: number; north: number };
  states: AtlasStateGeometry[];
};

export const places: AtlasPlace[] = geometry.states.map((state) => {
  const cropId = cropByState[state.postal] ?? "mixed";
  return {
    id: state.id,
    postal: state.postal,
    nameJa: state.nameJa,
    nameEn: state.nameEn,
    region: regionByState[state.postal] ?? "米国本土",
    cropId,
    summary: stateNotes[state.postal] ?? `${regionByState[state.postal] ?? "米国本土"}の農業条件と代表作物を、地域の概略として読みます。`,
    insightIds: []
  };
});

export const insights: AtlasInsight[] = [
  keyInsight("insight-kansas-wheat", "大平原の小麦と水", stateNotes.KS, ["US-KS"], ["wheat"], "primary", "map-label", "regional-development", ["source-usda-cdl-faq"]),
  keyInsight("insight-iowa-corn-soy", "コーンベルトの輪作", stateNotes.IA, ["US-IA", "US-IL", "US-NE", "US-IN", "US-OH"], ["corn", "soybean"], "primary", "map-label", "regional-development", ["source-usda-cdl-faq"]),
  keyInsight("insight-arkansas-rice", "ミシシッピ川下流の稲作", stateNotes.AR, ["US-AR", "US-LA", "US-MS", "US-TX", "US-CA"], ["rice"], "primary", "map-label", "crop-conditions", ["source-usda-rice"]),
  keyInsight("insight-texas-cotton", "温暖な生育期と綿花", stateNotes.TX, ["US-TX", "US-GA", "US-MS", "US-AL", "US-NC", "US-SC"], ["cotton"], "primary", "map-label", "crop-conditions", ["source-usda-cotton"]),
  keyInsight("insight-california-irrigation", "乾燥地の灌漑と園芸", stateNotes.CA, ["US-CA"], ["specialty", "rice"], "primary", "on-selection", "what-is-changing", ["source-usda-rice"]),
  keyInsight("insight-high-plains-groundwater", "地下水利用と農業", "灌漑が広がった1950年頃以降、大平原の帯水層の一部で水位低下がみられます。変化には地域差があります。", ["US-KS", "US-NE", "US-TX", "US-CO", "US-OK", "US-NM"], ["wheat", "corn", "cotton", "forage"], "secondary", "on-selection", "what-is-changing", ["source-usgs-high-plains"])
];

for (const place of places) {
  place.insightIds = insights.filter((insight) => insight.placeIds.includes(place.id)).map((insight) => insight.id);
}

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
      "この地図の色は、州別の代表作物を示す概略分類である。生産量・収益・単収の順位ではない。",
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
      "現行レイヤーは理解の入口としての編集試作である。次の更新では、USDA CDL等の対象年・分類コード・集約単位を記録し、州を一色で塗る意味を見直す。精度が上がっても、読者が地域差を一目でつかめる簡略化は残す。"
    ],
    bullets: [
      "地下水は常設の主題ではなく、該当地域を選んだときに表示する二次論点。",
      "北米の実際のニュースと年表は、公開記事が追加された時点で場所との関係を付ける。"
    ]
  }
];

export const timelineEvents: Array<{ id: string; dateLabel: string; title: string; description: string }> = [];

export function getPlace(placeId: string | null | undefined): AtlasPlace | undefined {
  return places.find((place) => place.id === placeId);
}

export function getInsight(insightId: string | null | undefined): AtlasInsight | undefined {
  return insights.find((insight) => insight.id === insightId);
}

export function getPlaceInsights(placeId: string | null | undefined): AtlasInsight[] {
  if (!placeId) return [];
  return insights
    .filter((insight) => insight.placeIds.includes(placeId))
    .sort((left, right) => (left.priority === right.priority ? left.id.localeCompare(right.id) : left.priority === "primary" ? -1 : 1));
}
