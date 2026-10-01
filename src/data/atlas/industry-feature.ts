/**
 * 初回の産業比較特集。報告本文の少数の事実を短く翻案した独自の教材。
 * 原図・写真・元CSVは再配布しない。国の代表点は工場の位置を示さない。
 */
export const sectorIds = ['automotive', 'solar', 'battery', 'semiconductor'] as const;
export const regionIds = ['north-america', 'europe', 'asia'] as const;
export type IndustrySectorId = (typeof sectorIds)[number];
export type IndustryRegionId = (typeof regionIds)[number];

export interface IndustrySource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  checkedAt: string;
  licenseStatus: string;
  notes: string;
}
export interface IndustryCountry {
  id: string;
  name: string;
  /** [経度, 緯度]。国を選ぶための概略代表点で、施設座標ではない。 */
  coordinates: [number, number];
  countryNote?: string;
  marketLabel: string;
  manufacturingLabel: string;
  /** 地図の直接ラベル。定義・対象年・範囲は上の詳細文と地域注記を併記する。 */
  mapMarketLabel?: string;
  mapManufacturingLabel?: string;
  sourceIds: string[];
}
export interface IndustryExample {
  title: string;
  description: string;
  status: string;
  period: string;
  scope: string;
  sourceIds: string[];
}
export interface IndustryRegion {
  id: IndustryRegionId;
  label: string;
  summary: string;
  why: string;
  japan: string;
  policy: string;
  example: IndustryExample;
  countries: IndustryCountry[];
}
export interface IndustrySector {
  id: IndustrySectorId;
  label: string;
  question: string;
  takeaway: string;
  primaryMetric: string;
  period: string;
  scope: string;
  caution: string;
  sourceIds: string[];
  regions: IndustryRegion[];
  steps: { title: string; text: string }[];
  comparisonTitle: string;
  comparisonNote: string;
}

const checkedAt = '2026-10-01';
const reportLicense = '報告本文 CC BY 4.0。短い事実要約・翻案。第三者素材と元データ製品は別条件。';
const summaryLicense = '短い事実要約と原典リンクのみ。原図・写真・元データは転載しない。';
export const coordinateNote = '点は国を選ぶための概略位置です。工場の所在地や実際の輸送経路を示しません。';
export const adaptationNote = 'IEA・OECD等の原典を基に作成した日本語の要約・翻案です。各機関の公式訳ではなく、各機関による承認を意味しません。';

export const sources: IndustrySource[] = [
  { id: 'ev-sales', title: 'Global EV Outlook 2026 — Trends in electric cars', publisher: 'IEA', url: 'https://www.iea.org/reports/global-ev-outlook-2026/trends-in-electric-cars', publishedAt: null, checkedAt, licenseStatus: reportLicense, notes: '2025年のCars新車販売。BEV＋PHEV。本文の概数・上下限表現を維持。データ製品のCSVは使用しない。' },
  { id: 'toyota-nc', title: '米国ノースカロライナ州の車載用電池工場、生産準備完了', publisher: 'トヨタ自動車', url: 'https://global.toyota/jp/newsroom/corporate/42193149.html', publishedAt: '2025-02-05', checkedAt, licenseStatus: summaryLicense, notes: '2025年2月の生産準備完了と4月の出荷開始予定。2月を実生産開始日と扱わない。HEV・PHEV・BEV向けの事例。' },
  { id: 'toyota-nc-operation', title: 'Toyota Charges into U.S. Battery Manufacturing', publisher: 'Toyota Motor North America', url: 'https://pressroom.toyota.com/toyota-charges-into-u-s-battery-manufacturing/', publishedAt: '2025-11-12', checkedAt, licenseStatus: summaryLicense, notes: '2025年の生産開始の後続発表。企業自己報告。精密な工場座標は未収録。' },
  { id: 'irs-credit', title: 'Clean vehicle tax credits', publisher: '米国内国歳入庁（IRS）', url: 'https://www.irs.gov/clean-vehicle-tax-credits', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: '新車・中古車・商用クリーン車の連邦税額控除。取得日が2025-09-30後の車には適用されない。例外や取得日の定義は原典へ。' },
  { id: 'vw-zwickau', title: 'Volkswagen Sachsen GmbH — Zwickau Plant', publisher: 'Volkswagen', url: 'https://www.volkswagen-newsroom.com/en/volkswagen-sachsen-gmbh-zwickau-plant-5901', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: '内燃機関車からBEVの車両生産へ転換した拠点の事例。企業の宣伝表現を一般的な効果へ読み替えない。' },
  { id: 'eu-bev-trade', title: '中国から輸入されるBEVの価格約束提案ガイダンス', publisher: '欧州委員会', url: 'https://policy.trade.ec.europa.eu/news/commission-issues-guidance-document-submission-price-undertaking-offers-battery-electric-vehicles-2026-01-12_en', publishedAt: '2026-01-12', checkedAt, licenseStatus: summaryLicense, notes: '対象は中国から輸入されるBEV。「中国ブランド」全般と同一ではない。' },
  { id: 'byd-thailand', title: 'BYD Thailand Factory Inauguration', publisher: 'BYD', url: 'https://www.byd.com/us/news-list/BYD-Thailand-Factory-Inauguration-and-Roll-off-of-Its-8-Millionth-New-Energy-Vehicle', publishedAt: '2024-07-04', checkedAt, licenseStatus: summaryLicense, notes: 'タイRayongの車両工場開設。企業本社は中国、工場所在地はタイ。工場能力を実生産と扱わない。' },
  { id: 'china-nev-tax', title: 'Vehicle Purchase Tax', publisher: '中国国家税務総局', url: 'https://www.chinatax.gov.cn/eng/c102962/c102967/c102997/c103002/c5246324/content.html', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: '対象NEVの2026〜2027年購入税は半額。乗用車1台の減税上限は1.5万元。2024〜2025年の免税と区別。NEVをBEVのみへ読み替えない。' },
  { id: 'powertrain', title: 'Electric vehicles and plug-in hybrid vehicles', publisher: '米国エネルギー省 AFDC', url: 'https://afdc.energy.gov/vehicles/electric', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: 'BEV・PHEV・HEVの仕組みの説明。統計のHEV定義は原資料ごとに確認する。' },
  { id: 'fuel-cell', title: 'How Do Fuel Cell Electric Vehicles Work Using Hydrogen?', publisher: '米国エネルギー省 AFDC', url: 'https://afdc.energy.gov/vehicles/how-do-fuel-cell-electric-cars-work', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: '水素から車上で電力を作りモーターを動かす仕組み。' },
  { id: 'solar-potential', title: 'Global Solar Atlas — World downloads / FAQ', publisher: 'World Bank・ESMAP・Solargis', url: 'https://globalsolaratlas.info/download/world', publishedAt: null, checkedAt, licenseStatus: '取得ファイルの追加帰属条件・期間・解像度は未確認。原ラスターと画像は使用しない。', notes: 'PVOUTは想定PVシステムの長期平均発電ポテンシャル。初回は数値・濃淡図を使わず、日射と製造の違いを説明する。' },
  { id: 'solar-capacity', title: 'Energy Technology Perspectives 2026 — Supply-chain risks and industrial competitiveness', publisher: 'IEA', url: 'https://www.iea.org/reports/energy-technology-perspectives-2026/supply-chain-risks-and-industrial-competitiveness', publishedAt: '2026-03-26', checkedAt, licenseStatus: reportLicense, notes: '中国のPVウエハー製造能力は2024年に世界の約95%。太陽光全工程の平均やモジュールの比率へ読み替えない。' },
  { id: 'solar-europe', title: 'Inverter supply chains and cybersecurity', publisher: 'IEA', url: 'https://www.iea.org/commentaries/inverter-supply-chains-and-cybersecurity', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: '欧州の2025年末能力：ポリシリコン27GW、ウエハー1.5GW、セル10GW、モジュール33GW。個別commentaryの図転載条件は未確認。' },
  { id: 'solar-us', title: 'Energy Technology Perspectives 2026 — Energy technology manufacturing and trade', publisher: 'IEA', url: 'https://www.iea.org/reports/energy-technology-perspectives-2026/energy-technology-manufacturing-and-trade', publishedAt: '2026-03-26', checkedAt, licenseStatus: reportLicense, notes: '米国モジュール国内生産／需要比は2023→2025年に40ポイント増加という推定。現在の比率40%ではない。' },
  { id: 'solar-energy', title: 'Solar PV Global Supply Chains — Executive summary', publisher: 'IEA', url: 'https://www.iea.org/reports/solar-pv-global-supply-chains/executive-summary', publishedAt: null, checkedAt, licenseStatus: reportLicense, notes: '2022年分析。製造エネルギーの約80%は電力。現在の国別電源構成や製品別排出比較へ一般化しない。' },
  { id: 'japan-solar', title: 'エネルギー白書2025 — 太陽光発電', publisher: '経済産業省 資源エネルギー庁', url: 'https://www.enecho.meti.go.jp/about/whitepaper/2025/html/2-3-3.html', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: 'ペロブスカイト太陽電池を2040年までに約20GW導入する将来目標。現時点の設置量やシリコン太陽電池能力に合算しない。' },
  { id: 'battery', title: 'Global EV Outlook 2026 — Electric vehicle batteries', publisher: 'IEA', url: 'https://www.iea.org/reports/global-ev-outlook-2026/electric-vehicle-batteries', publishedAt: null, checkedAt, licenseStatus: reportLicense, notes: '2025年末セル銘板能力はEV・定置用を含む。2025年EV電池導入量とは分母が違う。EUの導入比は15%弱。' },
  { id: 'battery-materials', title: 'Global EV Outlook 2026 — Manufacturing and trade', publisher: 'IEA', url: 'https://www.iea.org/reports/global-ev-outlook-2026/manufacturing-and-trade', publishedAt: null, checkedAt, licenseStatus: reportLicense, notes: '2025年中国のEV用正極材料生産は約85%、負極材料生産は90%超。製造能力とは区別。' },
  { id: 'minerals', title: 'Global Critical Minerals Outlook 2026 — Executive summary', publisher: 'IEA', url: 'https://www.iea.org/reports/global-critical-minerals-outlook-2026/executive-summary', publishedAt: '2026-07-16', checkedAt, licenseStatus: reportLicense, notes: '採掘と精製の立地を区別。実際の企業間納入関係や輸送経路は未収録。' },
  { id: 'japan-battery', title: '蓄電池・電源産業戦略への改訂', publisher: '経済産業省', url: 'https://www.meti.go.jp/press/2026/06/20260602001/20260602001.html', publishedAt: '2026-06-02', checkedAt, licenseStatus: summaryLicense, notes: '国内製造基盤150GWh/年の目標時期は2030年代半ば。旧目標の2030年までと混同しない。' },
  { id: 'chip-capacity', title: 'The chip landscape — Main findings', publisher: 'OECD', url: 'https://www.oecd.org/en/publications/the-chip-landscape_02dbd028-en/full-report/component-6.html', publishedAt: '2025-12-01', checkedAt, licenseStatus: '報告 CC BY 4.0。第三者の商用元データと素材は別条件。短い要約のみ。', notes: '2025年9月の稼働中ウエハー能力上位5経済の合計87%。個別比率へ配分しない。出典の台湾表記はChinese Taipei。' },
  { id: 'chip-chain', title: 'Mapping the semiconductor value chain', publisher: 'OECD', url: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/06/mapping-the-semiconductor-value-chain_5ba52971/4154cdbf-en.pdf', publishedAt: '2025-06-24', checkedAt, licenseStatus: '報告 CC BY 4.0。第三者素材除外。独自の工程説明に翻案。', notes: '設計・前工程・装置材料・後工程を区別。先端後工程は従来の組立検査と同一ではない。EUV装置供給のASMLを工程の例に使用。' },
  { id: 'tsmc-arizona', title: 'TSMC Arizona', publisher: 'TSMC', url: 'https://www.tsmc.com/static/abouttsmcaz/index.htm', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: '第1fabは2024年第4四半期N4量産。先端後工程fabは2026年初に初期工事開始。企業自己報告。施設座標は未収録。' },
  { id: 'tsmc-report', title: 'TSMC 2025 Annual Report', publisher: 'TSMC', url: 'https://investor.tsmc.com/static/annualReports/2025/english/index.html', publishedAt: null, checkedAt, licenseStatus: summaryLicense, notes: 'Dresdenは建設中の車載・産業向け事例。JASM熊本第1fabは2024年末量産。年報の対象年と施設イベント年を分ける。' },
  { id: 'chip-utility', title: 'Programmatic Environmental Assessment for semiconductor fabs', publisher: '米国標準技術研究所（NIST）', url: 'https://www.nist.gov/system/files/documents/2024/06/28/Final%20PEA%20for%20Modernization%20and%20Expansion%20of%20Semiconductor%20Fabs%206-28-2024%20-%20OGC-508C.pdf', publishedAt: '2024-06-28', checkedAt, licenseStatus: summaryLicense, notes: '電力、超純水、環境管理の工程説明。国の自然条件だけで工場の可否を決めつけない。' },
];

export interface AutomotiveObservation {
  id: string;
  country: string;
  region: IndustryRegionId;
  metric: 'new-car-plugin-sales-share';
  technology: 'BEV+PHEV';
  application: 'Cars';
  unit: '%';
  period: '2025';
  scope: string;
  displayValue: string;
  qualifier: 'approx' | 'less_than' | 'greater_than';
  /** 確定値だけを入れる。本文の概数・上下限はすべてnull。 */
  value: number | null;
  approximateValue: number | null;
  bound: { kind: 'upper' | 'lower'; value: number; inclusive: false } | null;
  status: 'observed';
  sourceIds: string[];
}
const carScope = 'IEA Carsの新車販売。地域平均・保有台数・生産比率ではない。';
const carObservation = (country: string, region: IndustryRegionId, displayValue: string, qualifier: AutomotiveObservation['qualifier'], number: number): AutomotiveObservation => ({
  id: `plugin-sales-2025-${country}`, country, region, metric: 'new-car-plugin-sales-share', technology: 'BEV+PHEV', application: 'Cars', unit: '%', period: '2025', scope: carScope, displayValue, qualifier, value: null,
  approximateValue: qualifier === 'approx' ? number : null,
  bound: qualifier === 'approx' ? null : { kind: qualifier === 'less_than' ? 'upper' : 'lower', value: number, inclusive: false },
  status: 'observed', sourceIds: ['ev-sales'],
});
export const automotiveObservations: AutomotiveObservation[] = [
  carObservation('USA', 'north-america', '10%未満', 'less_than', 10),
  carObservation('CAN', 'north-america', '約11%', 'approx', 11),
  carObservation('MEX', 'north-america', '7%超', 'greater_than', 7),
  carObservation('DEU', 'europe', '約30%', 'approx', 30),
  carObservation('FRA', 'europe', '約25%', 'approx', 25),
  carObservation('NOR', 'europe', '約97%', 'approx', 97),
  carObservation('CHN', 'asia', '約55%', 'approx', 55),
  carObservation('JPN', 'asia', '3%未満', 'less_than', 3),
  carObservation('THA', 'asia', '約25%', 'approx', 25),
];

export const sectors: IndustrySector[] = [
  {
    id: 'automotive', label: '自動車', question: '同じSUVでも、動力と生産地はなぜ違う？',
    takeaway: '売れる車は、資源・電力・充電環境・工場・制度・暮らしの組み合わせで変わります。',
    primaryMetric: '新車販売のプラグイン車比率（BEV＋PHEV）', period: '2025年',
    scope: 'IEAのCars。新車販売に占める割合。トラック・バスや保有台数、生産比率とは異なります。',
    caution: '代表国の比較で、地域平均ではありません。動力別×車型別の国際統計は初回未収録です。',
    sourceIds: ['ev-sales', 'powertrain', 'fuel-cell', 'battery'],
    comparisonTitle: '米国10%未満・ドイツ約30%・中国約55%',
    comparisonNote: '2025年のBEV＋PHEV新車販売比率。本文の概数・上下限であり、確定値の棒や地図色へ変換しません。',
    regions: [
      {
        id: 'north-america', label: '北米', summary: '米国10%未満、カナダ約11%、メキシコ7%超。同じ北米でも市場は一様ではありません。',
        why: '充電できる場所、走る距離、車型の好み、制度を分けて考えると、選ばれる動力の違いが見えてきます。',
        japan: 'トヨタの米国電池工場は、日本企業の本社と北米の生産地が別になる例です。',
        policy: '米国の連邦クリーン車税額控除は、2025年9月30日後に取得した車には適用されません。確認日：2026年10月1日。',
        example: { title: 'トヨタのノースカロライナ電池工場', description: '2025年2月に生産準備完了、同年に生産開始を発表。HEV・PHEV・BEV向けの車載電池を扱います。', status: '生産開始を発表', period: '2025年', scope: '米国の代表工場事例。日本に本社を置く企業。地域の工場網羅ではありません。', sourceIds: ['toyota-nc', 'toyota-nc-operation'] },
        countries: [
          { id: 'USA', name: '米国', coordinates: [-100, 38], marketLabel: '10%未満', manufacturingLabel: '日本企業の車載電池生産の事例', sourceIds: ['ev-sales', 'toyota-nc-operation', 'irs-credit'] },
          { id: 'CAN', name: 'カナダ', coordinates: [-106, 57], marketLabel: '約11%', manufacturingLabel: '工場事例は初回未収録', sourceIds: ['ev-sales'] },
          { id: 'MEX', name: 'メキシコ', coordinates: [-102, 24], marketLabel: '7%超', manufacturingLabel: '工場事例は初回未収録', sourceIds: ['ev-sales'] },
        ],
      },
      {
        id: 'europe', label: '欧州', summary: 'ドイツ約30%、フランス約25%、ノルウェー約97%。欧州とEUは同じ範囲ではありません。',
        why: '既存の自動車工場の転換と、輸入・購入に関わる制度を分けて読みます。',
        japan: '日本企業にとって、欧州での販売市場と現地生産、域外からの輸入は別の条件で動きます。',
        policy: 'EUは中国から輸入されるBEVに相殺関税を導入。2026年1月に価格約束提案のガイダンスを公表しました。中国ブランド全般の規則ではありません。',
        example: { title: 'ドイツ・Zwickauの車両工場', description: 'Volkswagenの拠点は、内燃機関車の工場からBEV生産へ転換した事例です。', status: 'BEVを生産する拠点', period: '2026年10月1日確認', scope: 'ドイツの代表組立事例。欧州全体の生産量を示しません。', sourceIds: ['vw-zwickau'] },
        countries: [
          { id: 'DEU', name: 'ドイツ', coordinates: [10.4, 51], marketLabel: '約30%', manufacturingLabel: 'Zwickau：内燃機関車からBEVへ', sourceIds: ['ev-sales', 'vw-zwickau', 'eu-bev-trade'] },
          { id: 'FRA', name: 'フランス', coordinates: [2.4, 46.6], marketLabel: '約25%', manufacturingLabel: '工場事例は初回未収録', sourceIds: ['ev-sales', 'eu-bev-trade'] },
          { id: 'NOR', name: 'ノルウェー', coordinates: [9, 62], countryNote: '欧州の国ですが、EU加盟国ではありません。', marketLabel: '約97%', manufacturingLabel: '工場事例は初回未収録', sourceIds: ['ev-sales'] },
        ],
      },
      {
        id: 'asia', label: 'アジア', summary: '中国約55%、日本3%未満、タイ約25%。市場、工場、本社の場所を分けます。',
        why: '中国と日本の市場差を見てから、タイでの車両生産へ進みます。アジアを一つの平均にまとめません。',
        japan: '日本の販売比率と、日本企業が海外で作る電池・車両は別の情報です。HEVとプラグイン車も区別します。',
        policy: '中国は対象NEVの購入税を2026〜2027年に半額とし、乗用車1台の減税は1.5万元が上限。以前の免税とは異なります。',
        example: { title: 'BYDのタイ・Rayong車両工場', description: '2024年7月開設。中国に本社を置く企業がタイで車両を作る事例です。', status: '開設を発表', period: '2024年7月', scope: '車両組立の代表事例。能力と実生産量、所在地と本社所在を分けます。', sourceIds: ['byd-thailand'] },
        countries: [
          { id: 'CHN', name: '中国', coordinates: [104, 35], marketLabel: '約55%', manufacturingLabel: 'BYDの本社所在国。タイ工場とは別', sourceIds: ['ev-sales', 'byd-thailand', 'china-nev-tax'] },
          { id: 'JPN', name: '日本', coordinates: [138, 37], marketLabel: '3%未満', manufacturingLabel: 'トヨタの本社所在国。米国工場とは別', sourceIds: ['ev-sales', 'toyota-nc-operation'] },
          { id: 'THA', name: 'タイ', coordinates: [101, 15], marketLabel: '約25%', manufacturingLabel: 'Rayong：BYDの車両組立事例', sourceIds: ['ev-sales', 'byd-thailand'] },
        ],
      },
    ],
    steps: [
      { title: '資源と電力', text: '電池材料、燃料、電力の供給を、車を売る場所と分けて考えます。' },
      { title: '作る場所', text: '採掘・精製・電池セル・車両組立は別工程。本社と工場も別の場所です。' },
      { title: '売れる車', text: 'BEV・PHEV・HEV・内燃機関車・FCEVは動力。SUV・セダン・ピックアップ・ミニバンは車型です。' },
      { title: '制度', text: '税、輸入規則、国内生産支援は、購入や工場計画の条件を変えます。' },
      { title: '日本へのつながり', text: '国内市場だけでなく、日本企業の海外生産と部品供給も確かめます。' },
    ],
  },
  {
    id: 'solar', label: '太陽光', question: '日射が強い場所と、太陽電池を作る場所は同じ？',
    takeaway: '発電には日射や設置条件、製造には電力費・量産技術・調達網・政策が関わります。',
    primaryMetric: '発電の自然条件と製造工程の比較', period: '能力：2024年／2025年末。自然条件は定性的説明',
    scope: '中国の世界比と、原典が示す欧州の工程別能力。米国を北米、欧州をEUへ置き換えません。',
    caution: 'PVOUTの取得ファイル・期間・条件が未確認のため、精密なポテンシャル値や濃淡図は初回未収録です。',
    sourceIds: ['solar-potential', 'solar-capacity', 'solar-europe', 'solar-us', 'solar-energy', 'japan-solar'],
    comparisonTitle: '中国のウエハー能力は世界の約95%（2024年）',
    comparisonNote: '欧州の2025年末能力：ポリシリコン27GW、ウエハー1.5GW、セル10GW、モジュール33GW。世界比とGWは別指標です。',
    regions: [
      {
        id: 'north-america', label: '北米', summary: '発電の適地と、国内でモジュールを作る場所を別々に見ます。国別発電ポテンシャル値は未収録です。',
        why: '日射だけでは、土地利用、送電網、設置費まで分かりません。製造では電力、設備、部材調達も重要です。',
        japan: '米国の国内生産支援と市場の変化は、日本企業の販売先や調達を考える手がかりです。',
        policy: '国内生産支援は工場計画に関わる条件の一つです。個別工場の立地理由を政策だけで断定しません。',
        example: { title: '米国モジュールの国内生産／需要比', description: 'IEA推定では2023年から2025年に40ポイント増加。現在の比率が40%という意味ではありません。', status: '推定された変化', period: '2023→2025年', scope: '米国のモジュール国内生産／需要比。北米平均ではありません。', sourceIds: ['solar-us'] },
        countries: [
          { id: 'USA', name: '米国', coordinates: [-100, 38], marketLabel: '発電ポテンシャルの数値は未収録', manufacturingLabel: '国内生産／需要比が40ポイント増（2023→2025年、推定）', sourceIds: ['solar-potential', 'solar-us'] },
          { id: 'CAN', name: 'カナダ', coordinates: [-106, 57], marketLabel: '日射・気温・設置条件を分けて読む', manufacturingLabel: '国別工程能力は未収録', sourceIds: ['solar-potential'] },
          { id: 'MEX', name: 'メキシコ', coordinates: [-102, 24], marketLabel: '日射・気温・設置条件を分けて読む', manufacturingLabel: '国別工程能力は未収録', sourceIds: ['solar-potential'] },
        ],
      },
      {
        id: 'europe', label: '欧州', summary: '欧州の製造能力は工程で違います。2025年末のウエハー1.5GWに対し、モジュールは33GWです。',
        why: '南北の日射の違いと、工場の工程構成は別の情報です。モジュールの能力だけで上流の自給は分かりません。',
        japan: '欧州の上流工程と完成品の差は、日本でも製造工程を分けて見るための比較例になります。',
        policy: '地域内に最終工程が増えても、上流の材料や装置まで独立したとは限りません。',
        example: { title: '欧州の工程別製造能力', description: 'ポリシリコン27GW、ウエハー1.5GW、セル10GW、モジュール33GW。工程ごとに異なる能力です。', status: '原典の能力集計', period: '2025年末', scope: '原典の欧州集計。国別値や実生産量ではありません。', sourceIds: ['solar-europe'] },
        countries: [
          { id: 'DEU', name: 'ドイツ', coordinates: [10.4, 51], marketLabel: '発電ポテンシャルの数値は未収録', manufacturingLabel: '欧州工程比較の入口。国別値は未収録', sourceIds: ['solar-potential', 'solar-europe'] },
          { id: 'ESP', name: 'スペイン', coordinates: [-3.7, 40], marketLabel: '南北の日射差を考える入口', manufacturingLabel: '国別工程能力は未収録', sourceIds: ['solar-potential', 'solar-europe'] },
          { id: 'FRA', name: 'フランス', coordinates: [2.4, 46.6], marketLabel: '日射・気温・設置条件を分けて読む', manufacturingLabel: '国別工程能力は未収録', sourceIds: ['solar-potential', 'solar-europe'] },
        ],
      },
      {
        id: 'asia', label: 'アジア', summary: '中国のPVウエハー製造能力は2024年に世界の約95%。日射の分布と製造の集中は別です。',
        why: '上流のポリシリコンからモジュールまで、電力、量産技術、調達網を工程別に考えます。',
        japan: '日本はペロブスカイト太陽電池を2040年までに約20GW導入する目標を掲げています。現在の設置量ではありません。',
        policy: '次世代型の導入目標は将来の計画です。既存シリコン太陽電池の能力や実績と合算しません。',
        example: { title: '中国のPVウエハー製造能力', description: '2024年に世界の約95%。ウエハー工程の能力であり、太陽光発電量や全工程の比率ではありません。', status: '能力の概数', period: '2024年', scope: '中国所在のPVウエハー製造能力の世界比。', sourceIds: ['solar-capacity'] },
        countries: [
          { id: 'CHN', name: '中国', coordinates: [104, 35], marketLabel: '発電ポテンシャルの数値は未収録', manufacturingLabel: 'ウエハー能力：世界の約95%（2024年）', sourceIds: ['solar-potential', 'solar-capacity'] },
          { id: 'JPN', name: '日本', coordinates: [138, 37], marketLabel: 'ペロブスカイト約20GWは2040年目標', manufacturingLabel: '国別工程能力は未収録', sourceIds: ['japan-solar'] },
          { id: 'IND', name: 'インド', coordinates: [79, 22], marketLabel: '日射と設置条件を分けて読む', manufacturingLabel: '国別工程能力は未収録', sourceIds: ['solar-potential'] },
        ],
      },
    ],
    steps: [
      { title: '発電の自然条件', text: '日射・気温・地形などが関わります。発電ポテンシャルと実際の発電量は別です。' },
      { title: '作る工程', text: 'ポリシリコン→ウエハー→セル→モジュール。インバーターは別部品です。これは工程の模式説明です。' },
      { title: '電力と量産', text: '2022年のIEA分析では製造エネルギーの約80%が電力。現在の電源構成とは分けて読みます。' },
      { title: '市場と政策', text: '送電網、調達先、国内生産支援が設置や製造の条件に関わります。' },
      { title: '日本へのつながり', text: '設置場所の条件と、次世代太陽電池の将来目標を確かめます。' },
    ],
  },
  {
    id: 'battery', label: '蓄電池', question: '鉱山を持つことと、電池を作れることは同じ？',
    takeaway: '採掘、精製、電極材料、セル、用途は別の工程です。工場の能力と実際の導入量も違います。',
    primaryMetric: 'Li-ionセルの銘板製造能力（世界比）', period: '2025年末の能力／2025年のEV電池導入',
    scope: '能力はEV・定置蓄電を含む。導入はEV電池容量。中国・米国・EUという原典の範囲を保持します。',
    caution: '中国80%超、EU・米国6〜7%は能力。中国60%、EU15%弱、米国10%はEV導入。分母が違い、個別国にEU値を割り当てません。',
    sourceIds: ['battery', 'battery-materials', 'minerals', 'japan-battery'],
    comparisonTitle: '能力：中国80%超／EU6〜7%／米国6〜7%',
    comparisonNote: '2025年末の世界セル能力は4TWh超。別指標の2025年EV電池導入は世界1.2TWh、中国60%・EU15%弱・米国10%。',
    regions: [
      {
        id: 'north-america', label: '北米', summary: '米国の世界セル能力比は6〜7%。EV電池導入比は10%。同じ%でも分母が異なります。',
        why: '電池はEVだけに使われません。米国では2025年の電池導入の約3分の1が定置蓄電でした。',
        japan: '日本企業の米国工場は、工場所在地と本社所在を分けて見る例です。',
        policy: '工場計画、原料調達、EVと電力網の需要を別々に確認します。能力は生産実績ではありません。',
        example: { title: '米国：セル能力と用途を比べる', description: '2025年末のセル能力の世界比は6〜7%。2025年のEV電池導入は10%。定置蓄電の需要もあります。', status: '能力・導入量の報告', period: '能力：2025年末／導入：2025年', scope: '米国の値。北米平均ではない。能力と導入の分母は異なります。', sourceIds: ['battery'] },
        countries: [
          { id: 'USA', name: '米国', coordinates: [-100, 38], marketLabel: 'EV電池導入：世界の10%（2025年）', manufacturingLabel: 'セル銘板能力：世界の6〜7%（2025年末）', sourceIds: ['battery'] },
          { id: 'CAN', name: 'カナダ', coordinates: [-106, 57], marketLabel: '国別導入量は未収録', manufacturingLabel: '国別セル能力は未収録', sourceIds: ['battery'] },
          { id: 'MEX', name: 'メキシコ', coordinates: [-102, 24], marketLabel: '国別導入量は未収録', manufacturingLabel: '国別セル能力は未収録', sourceIds: ['battery'] },
        ],
      },
      {
        id: 'europe', label: '欧州', summary: 'EUの世界セル能力比は6〜7%、EV電池導入比は15%弱。欧州全体の値ではありません。',
        why: 'セル工場の立地だけで、正極・負極材料まで域内で作れるかは分かりません。工程ごとの調達を見ます。',
        japan: '装置・材料・セルの役割を分けると、日本企業と欧州の接点も探しやすくなります。',
        policy: '国内生産支援があっても、上流まで自給したとは限りません。個別工場の計画と稼働を区別します。',
        example: { title: 'EU：セル能力とEV導入の違い', description: '能力6〜7%に対し、EV電池導入は15%弱。工程別の材料調達は別に確認する必要があります。', status: '能力・導入量の報告', period: '能力：2025年末／導入：2025年', scope: 'EU集計。ドイツやフランスの国別比率ではありません。', sourceIds: ['battery', 'battery-materials'] },
        countries: [
          { id: 'EU', name: 'EU（27加盟国）', coordinates: [4.35, 50.85], countryNote: 'EU27加盟国の集計。欧州全体や、ベルギーなどの国別値ではありません。点は集計を選ぶ入口です。', marketLabel: 'EV電池導入：世界の15%弱（2025年、EU集計）', manufacturingLabel: 'セル銘板能力：世界の6〜7%（2025年末、EU集計）', sourceIds: ['battery'] },
          { id: 'DEU', name: 'ドイツ', coordinates: [10.4, 51], countryNote: 'EU集計への比較入口。EU値をドイツの国別値と扱いません。', marketLabel: '国別値は未収録。EU集計を別に表示', manufacturingLabel: '国別値は未収録。EU集計を別に表示', sourceIds: ['battery'] },
          { id: 'FRA', name: 'フランス', coordinates: [2.4, 46.6], countryNote: 'EU集計への比較入口。EU値をフランスの国別値と扱いません。', marketLabel: '国別値は未収録。EU集計を別に表示', manufacturingLabel: '国別値は未収録。EU集計を別に表示', sourceIds: ['battery'] },
          { id: 'NOR', name: 'ノルウェー', coordinates: [9, 62], countryNote: 'EU加盟国ではなく、ここで示すEU集計には含めません。', marketLabel: '国別導入量は未収録', manufacturingLabel: '国別セル能力は未収録', sourceIds: ['battery'] },
        ],
      },
      {
        id: 'asia', label: 'アジア', summary: '中国の世界セル能力比は80%超、EV電池導入比は60%。セル能力と材料生産も別指標です。',
        why: '鉱物の採掘と精製の場所は異なります。資源を持つだけで材料やセル産業が自動的に生まれるわけではありません。',
        japan: '2026年改訂の蓄電池・電源産業戦略は、国内150GWh/年の製造基盤を2030年代半ばに目指します。将来目標です。',
        policy: '日本の現行目標時期は2030年代半ば。旧「2030年まで」を現在の目標として表示しません。',
        example: { title: '中国：セルと電極材料の工程を分ける', description: '2025年のEV用正極材料生産は世界の約85%、負極材料は90%超。セル銘板能力80%超とは別の指標です。', status: '生産比率の報告', period: '2025年', scope: '中国のEV用電極材料生産の世界比。セル能力とは異なります。', sourceIds: ['battery-materials', 'battery'] },
        countries: [
          { id: 'CHN', name: '中国', coordinates: [104, 35], marketLabel: 'EV電池導入：世界の60%（2025年）', manufacturingLabel: 'セル銘板能力：世界の80%超（2025年末）', sourceIds: ['battery', 'battery-materials'] },
          { id: 'JPN', name: '日本', coordinates: [138, 37], marketLabel: '国別導入量は未収録', manufacturingLabel: '国内150GWh/年は2030年代半ばの目標', sourceIds: ['japan-battery'] },
          { id: 'KOR', name: '韓国', coordinates: [128, 36], marketLabel: '国別導入量は未収録', manufacturingLabel: '本社の国と海外工場の国を分ける', sourceIds: ['battery'] },
        ],
      },
    ],
    steps: [
      { title: '採掘と精製', text: '鉱山と精製工場は別です。DRCのコバルト採掘など、3地域の外も供給網に関わります。' },
      { title: '材料からセルへ', text: '精製→正極・負極材料→セル→パックは工程の模式説明。確認済みの実輸送線ではありません。' },
      { title: '電力と水', text: '採掘・精製・製造では電力や水、人材、設備の条件を組み合わせて考えます。' },
      { title: '用途と化学系', text: 'EVと定置蓄電は用途。LFP・NMCは化学系。円筒・角形・パウチは形状です。' },
      { title: '日本へのつながり', text: '車載電池から電力網・データセンターの電源へ、用途を分けて読み進めます。' },
    ],
  },
  {
    id: 'semiconductor', label: '半導体', question: '工場の数だけで、半導体の強みは分かる？',
    takeaway: '設計、ウエハー製造、装置材料、組立・検査は別の役割です。先端ロジックと車載向けも分けます。',
    primaryMetric: '稼働中ウエハー能力：上位5経済の合計87%', period: '能力：2025年9月／拠点：各カードの対象時点',
    scope: '上位5経済は中国・台湾・韓国・日本・米国。設計は企業能力、前工程は工場所在を区別します。',
    caution: '2025年9月の稼働中ウエハー能力は上位5経済の合計で87%。国別へ配分しません。国の役割は定性的な代表例。施設の精密位置や全工場数は未収録です。',
    sourceIds: ['chip-capacity', 'chip-chain', 'tsmc-arizona', 'tsmc-report', 'chip-utility'],
    comparisonTitle: '上位5経済で稼働中ウエハー能力の87%（2025年9月）',
    comparisonNote: '中国・台湾・韓国・日本・米国の合計です。台湾は出典でChinese Taipei。個別比率や主権を示す値ではありません。',
    regions: [
      {
        id: 'north-america', label: '北米', summary: '米国の設計の役割と、Arizonaで作る前工程・先端後工程を分けて見ます。',
        why: '企業の設計力と工場の所在地は別です。工場では安定した電力、超純水、人材、設備が必要です。',
        japan: '日本の装置・材料と海外fabの関係を工程別に考えます。未確認の納入関係を輸送線にはしません。',
        policy: '国内生産支援や輸出規制は調達・工場計画の条件に関わります。個別製品の規制一覧は初回未収録です。',
        example: { title: 'TSMC Arizona：量産と建設を分ける', description: '第1fabは2024年第4四半期にN4量産開始。先端後工程fabは2026年初に初期工事開始。', status: '前工程：量産／先端後工程：初期工事', period: '2024年第4四半期／2026年初', scope: '企業自己報告の代表拠点。工程と稼働・建設の状態が異なります。', sourceIds: ['tsmc-arizona'] },
        countries: [
          { id: 'USA', name: '米国', coordinates: [-100, 38], marketLabel: '設計の役割を持つ企業が集積', manufacturingLabel: '能力上位5経済の一つ。Arizonaの前工程事例', sourceIds: ['chip-capacity', 'chip-chain', 'tsmc-arizona'] },
          { id: 'CAN', name: 'カナダ', coordinates: [-106, 57], marketLabel: '国別の工程比較は未収録', manufacturingLabel: '国別能力・拠点事例は未収録', sourceIds: ['chip-chain'] },
          { id: 'MEX', name: 'メキシコ', coordinates: [-102, 24], marketLabel: '国別の工程比較は未収録', manufacturingLabel: '国別能力・拠点事例は未収録', sourceIds: ['chip-chain'] },
        ],
      },
      {
        id: 'europe', label: '欧州', summary: 'オランダの露光装置と、ドイツDresdenで建設する車載・産業向けfabは別の役割です。',
        why: '装置の供給者と、その装置でウエハーを作る工場を分けます。工場数だけでは工程の強みは分かりません。',
        japan: '日本の装置材料も、欧州の装置や世界各地の製造と同じ供給網の中で役割を持ちます。',
        policy: '工場誘致は新しい製造地を生む条件の一つ。上流の装置・材料まで域内完結したとは限りません。',
        example: { title: 'Dresdenの車載・産業向けfab', description: 'TSMCの2025年報で建設中。オランダのEUV露光装置の役割とは区別する前工程の事例です。', status: '建設中（2025年報）', period: '2025年報の対象時点', scope: 'ドイツの代表拠点。将来能力を稼働実績へ合算しません。', sourceIds: ['tsmc-report', 'chip-chain'] },
        countries: [
          { id: 'NLD', name: 'オランダ', coordinates: [5.4, 52], marketLabel: 'EUV露光装置：ASMLの工程役割', manufacturingLabel: '装置供給。ウエハー能力比とは別', sourceIds: ['chip-chain'] },
          { id: 'DEU', name: 'ドイツ', coordinates: [10.4, 51], marketLabel: '車載・産業向けの用途を分ける', manufacturingLabel: 'Dresden：前工程fab建設中（2025年報）', sourceIds: ['tsmc-report'] },
          { id: 'FRA', name: 'フランス', coordinates: [2.4, 46.6], marketLabel: '国別の工程比較は未収録', manufacturingLabel: '国別能力・拠点事例は未収録', sourceIds: ['chip-chain'] },
        ],
      },
      {
        id: 'asia', label: 'アジア', summary: '中国・台湾・韓国・日本は能力上位5経済に入ります。製品の種類と工程の違いを確かめます。',
        why: '先端ロジック、メモリー、車載・産業向けは自由に代替できません。水や電力だけで工場の立地を決めつけません。',
        japan: '熊本のfabだけでなく、装置・材料・検査・後工程も日本の役割として読みます。',
        policy: '政策、人材、顧客、電力網、再利用設備を組み合わせて読みます。補助金総額の比較は初回未収録です。',
        example: { title: 'JASM熊本第1fab', description: '2024年末に量産開始。日本での前工程の事例であり、台湾の先端後工程とは役割を分けます。', status: '量産開始', period: '2024年末', scope: '企業自己報告の代表拠点。日本の全工場・全製品を示しません。', sourceIds: ['tsmc-report', 'chip-chain'] },
        countries: [
          { id: 'CHN', name: '中国', coordinates: [104, 35], marketLabel: '製品と工程を分けて比較する', manufacturingLabel: '稼働中能力の上位5経済の一つ', sourceIds: ['chip-capacity', 'chip-chain'] },
          { id: 'TWN', name: '台湾', coordinates: [121, 23.7], countryNote: '出典での表記はChinese Taipei。工程の集積を示す説明です。', marketLabel: '前工程と先端後工程を区別', manufacturingLabel: '稼働中能力の上位5経済の一つ', sourceIds: ['chip-capacity', 'chip-chain'] },
          { id: 'KOR', name: '韓国', coordinates: [128, 36], marketLabel: 'メモリーとロジックを区別', manufacturingLabel: '稼働中能力の上位5経済の一つ', sourceIds: ['chip-capacity', 'chip-chain'] },
          { id: 'JPN', name: '日本', coordinates: [138, 37], marketLabel: '装置材料・検査などの役割も見る', manufacturingLabel: '上位5経済の一つ。熊本第1fabは量産', sourceIds: ['chip-capacity', 'chip-chain', 'tsmc-report'] },
        ],
      },
    ],
    steps: [
      { title: '電力と水', text: '安定した電力、超純水、温湿度・清浄度の管理が必要。自然条件だけでは適地を決められません。' },
      { title: '工程の分業', text: '設計→前工程→組立・検査。装置材料が各工程を支えます。これは仕組みの模式説明です。' },
      { title: '製品の違い', text: '先端ロジック、メモリー、成熟・パワー半導体は用途も設備条件も異なります。' },
      { title: '集積と政策', text: '人材、顧客、設備供給、政策が立地に関わります。発表・建設・量産は別の状態です。' },
      { title: '日本へのつながり', text: '国内fabと装置材料・検査・後工程を分け、日本の複数の役割を確かめます。' },
    ],
  },
];

// 小さい地図では短いラベルを使い、選択カードで上の定義・対象年を読めるようにする。
const mapLabels: Record<IndustrySectorId, Record<string, [string, string]>> = {
  automotive: {
    USA: ['10%未満', 'トヨタ米国電池'], CAN: ['約11%', '事例未収録'], MEX: ['7%超', '事例未収録'],
    DEU: ['約30%', 'BEV組立'], FRA: ['約25%', '事例未収録'], NOR: ['約97%', '事例未収録'],
    CHN: ['約55%', 'BYD本社'], JPN: ['3%未満', 'トヨタ本社'], THA: ['約25%', '車両組立'],
  },
  solar: {
    USA: ['日射と設置条件', '40ポイント増'], CAN: ['日射と設置条件', '能力未収録'], MEX: ['日射と設置条件', '能力未収録'],
    DEU: ['日射の南北差', '欧州の工程比較'], ESP: ['日射の南北差', '能力未収録'], FRA: ['日射の南北差', '能力未収録'],
    CHN: ['日射と設置条件', 'ウエハー約95%'], JPN: ['2040年目標', '能力未収録'], IND: ['日射と設置条件', '能力未収録'],
  },
  battery: {
    USA: ['導入10%', '能力6〜7%'], CAN: ['導入未収録', '能力未収録'], MEX: ['導入未収録', '能力未収録'],
    EU: ['導入15%弱', '能力6〜7%'], DEU: ['国別値未収録', '国別値未収録'], FRA: ['国別値未収録', '国別値未収録'], NOR: ['導入未収録', '能力未収録'],
    CHN: ['導入60%', '能力80%超'], JPN: ['導入未収録', '将来の能力目標'], KOR: ['導入未収録', '本社と工場は別'],
  },
  semiconductor: {
    USA: ['設計の役割', '前工程量産'], CAN: ['工程未収録', '能力未収録'], MEX: ['工程未収録', '能力未収録'],
    NLD: ['EUV装置', '装置：ASML'], DEU: ['車載・産業向け', 'fab建設'], FRA: ['工程未収録', '能力未収録'],
    CHN: ['製品と工程', '能力上位5経済'], TWN: ['前工程と後工程', '能力上位5経済'], KOR: ['メモリー等', '能力上位5経済'], JPN: ['装置材料・検査', '熊本量産'],
  },
};
for (const sector of sectors) {
  for (const region of sector.regions) {
    for (const country of region.countries) {
      const labels = mapLabels[sector.id][country.id];
      country.mapMarketLabel = labels?.[0] ?? '未収録';
      country.mapManufacturingLabel = labels?.[1] ?? '未収録';
    }
  }
}
