export const topics = {
  politics: "政治",
  economy: "経済",
  finance: "金融",
  society: "社会",
  conflict: "紛争",
  security: "安全保障",
  religion: "宗教",
  agriculture: "農業",
  energy: "エネルギー",
  environment: "環境",
  industry: "産業",
  technology: "技術"
} as const;

export const regions = {
  asia: "アジア",
  middle_east: "中東",
  europe: "欧州",
  africa: "アフリカ",
  north_america: "北米",
  latin_america: "中南米",
  oceania: "オセアニア",
  world: "世界"
} as const;

/** Frequently used ISO 3166-1 alpha-2 labels. Unknown valid codes remain searchable by code. */
export const countryLabels: Readonly<Record<string, string>> = {
  JP: "日本",
  US: "米国",
  CA: "カナダ",
  MX: "メキシコ",
  CN: "中国",
  KR: "韓国",
  KP: "北朝鮮",
  TW: "台湾",
  HK: "香港",
  IN: "インド",
  ID: "インドネシア",
  SG: "シンガポール",
  MY: "マレーシア",
  TH: "タイ",
  VN: "ベトナム",
  PH: "フィリピン",
  PK: "パキスタン",
  BD: "バングラデシュ",
  GB: "英国",
  FR: "フランス",
  DE: "ドイツ",
  IT: "イタリア",
  ES: "スペイン",
  PL: "ポーランド",
  RU: "ロシア",
  UA: "ウクライナ",
  TR: "トルコ",
  IL: "イスラエル",
  PS: "パレスチナ",
  IR: "イラン",
  IQ: "イラク",
  SA: "サウジアラビア",
  AE: "アラブ首長国連邦",
  SY: "シリア",
  LB: "レバノン",
  JO: "ヨルダン",
  EG: "エジプト",
  ZA: "南アフリカ",
  NG: "ナイジェリア",
  ET: "エチオピア",
  SD: "スーダン",
  BR: "ブラジル",
  AR: "アルゼンチン",
  CL: "チリ",
  CO: "コロンビア",
  AU: "オーストラリア",
  NZ: "ニュージーランド"
};

export const topicAliases = {
  politics: ["政治", "政権", "選挙"],
  economy: ["経済", "景気", "成長"],
  finance: ["金融", "銀行", "市場"],
  society: ["社会", "人口", "労働"],
  conflict: ["紛争", "戦争", "衝突"],
  security: ["安全保障", "安保", "防衛"],
  religion: ["宗教", "信仰"],
  agriculture: ["農業", "食料", "穀物"],
  energy: ["エネルギー", "電力", "燃料"],
  environment: ["環境", "脱炭素", "気候"],
  industry: ["産業", "企業", "供給網"],
  technology: ["技術", "半導体", "AI"]
} as const satisfies Readonly<Record<keyof typeof topics, readonly string[]>>;

export type TopicSlug = keyof typeof topics;
export type RegionSlug = keyof typeof regions;
