export type RussiaIndustrySource = {title: string; url: string};

export type RussiaIndustryMark = {
  id: string;
  name: string;
  coordinates: [number, number];
  kind: 'resource' | 'processing' | 'port' | 'city';
  note: string;
  sources: RussiaIndustrySource[];
};

export type RussiaIndustryReading = {
  id: string;
  title: string;
  takeaway: string;
  explanation: string;
  social: string;
  regionCodes: string[];
  defaultLayer: 'places';
  comparisonLayer: 'density' | 'climate';
  sources: RussiaIndustrySource[];
};

const cityPositions: RussiaIndustrySource = {
  title: 'Natural Earth：都市の代表位置（50m・v5.1.2、Public domain）',
  url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_populated_places.geojson',
};
const norilskOperations: RussiaIndustrySource = {
  title: 'Nornickel：採掘・加工の工程（2024年報）',
  url: 'https://ar2024.nornickel.com/en/business-overview/operational-performance.html',
};
const norilskTransport: RussiaIndustrySource = {
  title: 'Nornickel：北極圏の港と輸送設備（2024年報）',
  url: 'https://ar2024.nornickel.com/en/business-overview/transport-logistics-assets.html',
};
const norilskFootprint: RussiaIndustrySource = {
  title: 'Nornickel：モスクワの本社機能（2024年末時点）',
  url: 'https://ar2024.nornickel.com/en/about-company/geography.html',
};
const fescoOperations: RussiaIndustrySource = {
  title: 'FESCO：港・鉄道・倉庫の連携（2025年報）',
  url: 'https://ar2025.fesco.com/strategic-report/operations-overview',
};
const fescoDigitalization: RussiaIndustrySource = {
  title: 'FESCO：港の荷役・列車計画を支える情報システム（2025年報）',
  url: 'https://ar2025.fesco.com/strategic-report/digitalization',
};
const arcticPortPositions: RussiaIndustrySource = {
  title: 'Rosmorport：ムルマンスク港の代表位置（公開年不明、2026年10月1日確認）',
  url: 'https://www.rosmorport.com/filials/mur_seaports/',
};
const pacificPortPosition: RussiaIndustrySource = {
  title: 'Rosmorport：ウラジオストク港の代表位置（公開年不明、2026年10月1日確認）',
  url: 'https://www.rosmorport.com/filials/vlf_seaports/',
};

// Fixed-size teaching examples. These are not a production or reserves inventory.
export const russiaIndustryMarks: RussiaIndustryMark[] = [
  {
    id: 'norilsk-resource-region',
    name: 'ノリリスク：鉱業・加工地域',
    coordinates: [88.224992, 69.340017],
    kind: 'resource',
    note: 'Natural Earth v5.1.2の都市代表位置です。2024年報で確認した銅・ニッケル鉱石の採掘と加工を読む地域の印で、鉱山入口・工場の正確な位置や現在の生産量を示しません。',
    sources: [cityPositions, norilskOperations],
  },
  {
    id: 'moscow-management-logistics',
    name: 'モスクワ：管理・物流',
    coordinates: [37.613577, 55.75411],
    kind: 'city',
    note: 'Natural Earth v5.1.2の都市代表位置です。Nornickelの本社機能は2024年末、FESCOの倉庫・物流機能は2025年報に基づきます。事業所・倉庫の正確な位置や市の産業割合を示しません。',
    sources: [cityPositions, norilskFootprint, fescoOperations],
  },
  {
    id: 'murmansk-port',
    name: 'ムルマンスク港',
    coordinates: [33.05, 68.98333333333333],
    kind: 'port',
    note: 'Rosmorportの68度59分N・33度03分Eを変換した港の代表位置です。個別埠頭や加工工場の位置ではありません。北極圏の金属輸送とコラ地域への接続はNornickelの2024年報によります。港資料の公開年は不明、2026年10月1日確認。',
    sources: [arcticPortPositions, norilskTransport],
  },
  {
    id: 'vladivostok-port',
    name: 'ウラジオストク港',
    coordinates: [131.9, 43.083333333333336],
    kind: 'port',
    note: 'Rosmorportの43度05分N・131度54分Eを変換した港湾域の代表位置です。VMTPだけの埠頭位置ではありません。船・鉄道・倉庫の連携はFESCOの2025年報によります。港資料の公開年は不明、2026年10月1日確認。',
    sources: [pacificPortPosition, fescoOperations, fescoDigitalization],
  },
];

export const russiaIndustryReadings: RussiaIndustryReading[] = [
  {
    id: 'northern-resources',
    title: '北極圏：鉱床を技術と輸送でつなぐ',
    takeaway: 'ノリリスクの銅・ニッケルを加工し、河川・北方航路で運ぶ。冬は砕氷船が出荷を支える。',
    explanation: 'ノリリスクの2024年報は、銅・ニッケル鉱石の採掘から加工、製品の出荷までの工程を示します。他地域との接続にはエニセイ川、北方航路、空路が使われ、ドゥディンカ港では冬に砕氷船を利用し、春の増水時には作業を休止します。気候は設備と運用の条件ですが、気候だけで産業の有無は決まりません。印は都市・港の代表位置で、全国の資源量・生産量の分布ではありません。',
    social: '同じ輸送設備が、タイミルの事業所だけでなく住民向けの物資も運びます。鉱業地域を読むときは、採掘の仕事に加え、加工・輸送の技能と暮らしを支える物流にも目を向けます。説明の時点は2024年です。',
    regionCodes: ['siberia'],
    defaultLayer: 'places',
    comparisonLayer: 'climate',
    sources: [norilskOperations, norilskTransport, cityPositions, arcticPortPositions],
  },
  {
    id: 'markets-and-port',
    title: '欧州側と極東：都市・港・市場の接点',
    takeaway: '資源の場所と、企業管理・物流・市場をつなぐ場所は一致しない。',
    explanation: 'Nornickelの2024年末の本社はモスクワにあります。FESCOの2025年報は、モスクワの倉庫機能と、ウラジオストクで船・列車・トラックの荷物を積み替える機能を説明しています。ムルマンスクでは北極圏から届く金属や中間製品を扱い、コラの加工地域へ鉄道でつなぎます。都市の人口集中と比べ、資源の位置に管理・加工・交通・市場が加わる仕組みを読みます。',
    social: '港の仕事には、荷役設備だけでなく入港・列車・倉庫の計画や情報処理も必要です。2025年の港資料はこうしたシステムの導入を説明します。人口が多いほど資源量が多いとは読めず、印がない地域も産業がないという意味ではありません。',
    regionCodes: ['west', 'far-east'],
    defaultLayer: 'places',
    comparisonLayer: 'density',
    sources: [norilskFootprint, norilskTransport, fescoOperations, fescoDigitalization, cityPositions, arcticPortPositions, pacificPortPosition],
  },
];
