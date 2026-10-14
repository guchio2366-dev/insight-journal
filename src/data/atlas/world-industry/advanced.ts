import type { Sector, Site, Source } from './types';

/**
 * 2026-10-14に公開一次資料を再確認したパイロット用の代表地点。
 * 座標は都市・工業地区の案内位置。敷地境界や輸送経路の測量値ではない。
 * 「非公表」は確認した資料に拠点別の数量がないことを表す。
 * 企業全体の販売量・能力・世界シェアを、工場の規模として配分しない。
 */
const checked = '2026-10-14確認';
const source = (label: string, url: string): Source => ({ label, url });
const unavailable = (unit: string, scope: string, year = checked): Site['scale'] => ({
  value: '数値未収録', unit, year, basis: '非公表', scope: `${scope}。確認資料に拠点別数量の記載なし。`,
});

const arm = source('Arm｜Cambridge設計拠点', 'https://careers.arm.com/uk-cambridge-office');
const asml = source('ASML｜Veldhoven製造・研究拠点', 'https://www.asml.com/en/company/about-asml/locations/veldhoven');
const siltronic = source('Siltronic｜製造拠点一覧', 'https://www.siltronic.com/en/our-company/sites.html');
const tsmcFabs = source('TSMC｜前工程・先端後工程の拠点一覧', 'https://www.tsmc.com/english/aboutTSMC/TSMC_Fabs');
const tsmcArizona = source('TSMC｜Arizona量産状況', 'https://www.tsmc.com/static/abouttsmcaz/index.htm');
const gfCapacity = source('GlobalFoundries｜Singapore拡張設備開設（2023）', 'https://gf.com/news-and-events/news/globalfoundries-officially-opens-us4-billion-expansion-facility-in-singapore-creating-1000-new-jobs/');
const gfCurrent = source('GlobalFoundries｜Singapore製造拠点', 'https://gf.com/manufacturing/singapore/');
const amkor = source('Amkor｜Bac Ninh工場開設（2023）', 'https://amkor.com/blog/amkor-inaugurates-latest-factory-in-vietnam/');
const wacker = source('WACKER｜Nünchritz製造拠点', 'https://www.wacker.com/cms/en-us/about-wacker/production-sites/nuenchritz.html');
const longi = source('LONGi｜工程別の製造拠点一覧', 'https://www.longi.com/en/global-distribution/');
const longiWuhu = source('LONGi｜Wuhuモジュール工場（2026）', 'https://www.longi.com/en/news/longi-wuhu-cmmm-level-4/');
const qcells = source('Qcells｜Cartersvilleセル生産開始・Dalton能力（2026）', 'https://us.qcells.com/blog/qcells-begins-solar-cell-manufacturing-at-americas-first-and-only-vertically-integrated-solar-factory-in-cartersville-georgia/');
const rec = source('REC｜Singapore統合製造拠点', 'https://www.recgroup.com/en/made-in-singapore');
const albemarle = source('Albemarle｜Atacama・La Negraの工程と輸送', 'https://www.albemarle.com/us/en/global-locations/chile');
const basf = source('BASF｜Schwarzheide正極材工場開設（2023）', 'https://www.basf.com/global/en/media/news-releases/2023/06/p-23-251');
const basfCurrent = source('BASF｜Schwarzheide製造拠点', 'https://www.basf.com/global/en/who-we-are/organization/locations/europe/german-sites/Schwarzheide');
const poscoAnode = source('POSCO｜Pohang負極材工場・工程（2026）', 'https://newsroom.posco.com/en/posco-future-ms-anode-material-competitiveness-through-technology-and-supply-chain-synergies-expert-perspective/');
const poscoCathode = source('POSCO Future M｜Gwangyang正極材工場能力（2022）', 'https://www.poscofuturem.com/en/pr/view.do?num=638');
const panasonic = source('Panasonic Energy｜Nevadaの稼働能力（2025）', 'https://na.panasonic.com/news/panasonic-energy-begins-mass-production-at-new-automotive-lithium-ion-battery-factory-in-kansas-aiming-for-annual-capacity-of-32-gwh-to-accelerate-us-local-production');
const catl = source('CATL｜Ningde生産拠点を含む会社沿革', 'https://www.catl.com/en/about/profile/');
const tesla = source('Tesla｜Lathrop Megafactory製造能力', 'https://www.tesla.com/megafactory');

export const advancedSectors: Sector[] = [
  {
    id: 'semiconductor', label: '半導体', shortLabel: '半導体',
    scope: '設計・材料・装置・ウエハー加工・組立検査の代表8地点。全工場や全品種、地域別能力を網羅しません。会社全体の売上や世界シェアを工場の数量へ読み替えていません。',
    stages: [
      { id: 'design', label: '設計', note: '回路・IPを設計。材料・装置とは別の役割で前工程を支えます。' },
      { id: 'equipment', label: '材料・装置', note: '基板用ウエハーや露光装置などを前工程へ。設計から材料を作る順序ではありません。' },
      { id: 'front-end', label: '前工程', note: 'ウエハー上に回路を形成。完成したウエハーを後工程で切り分け・接続します。' },
      { id: 'back-end', label: '後工程・検査', note: '組立・封止・接続・検査。先端パッケージングも含む代表例です。' },
    ],
    sites: [
      {
        id: 'semi-arm-cambridge', name: 'Arm・Cambridge', country: '英国', coordinates: [0.17, 52.18], stage: 'design', kind: '設計拠点', status: '稼働',
        scale: unavailable('設計量', 'Cambridge拠点の設計規模。工場の生産能力ではない'),
        note: '設計・研究の拠点で、本社機能も持ちます。半導体を製造する工場としては表示していません。', sources: [arm], labelOffset: [-145, -70],
      },
      {
        id: 'semi-asml-veldhoven', name: 'ASML・Veldhoven', country: 'オランダ', coordinates: [5.41, 51.41], stage: 'equipment', kind: '工場', status: '稼働',
        scale: unavailable('台/年', 'Veldhovenで組み立てる露光装置の年産能力'),
        note: '露光装置の製造・研究拠点。本社も併設。ASML全社の販売台数を当地の生産量としては示しません。', sources: [asml], labelOffset: [15, -45],
      },
      {
        id: 'semi-siltronic-burghausen', name: 'Siltronic・Burghausen', country: 'ドイツ', coordinates: [12.83, 48.17], stage: 'equipment', kind: '工場', status: '稼働',
        scale: unavailable('枚/年', 'Burghausen拠点の基板用シリコンウエハー年産能力'),
        note: '単結晶を引き上げ、最大300mm径の基板用ウエハーを製造。回路を形成する前工程とは別です。', sources: [siltronic], labelOffset: [40, 18],
      },
      {
        id: 'semi-tsmc-hsinchu', name: 'TSMC・新竹Fab 12B', country: '台湾', coordinates: [121.0, 24.77], stage: 'front-end', kind: '工場', status: '稼働',
        scale: unavailable('枚/年', 'Fab 12B単体のウエハー加工能力'),
        note: '300mmウエハーの前工程工場。新竹の会社本社とは所在地と対象を分けています。', sources: [tsmcFabs], labelOffset: [28, -52],
      },
      {
        id: 'semi-tsmc-arizona', name: 'TSMC・Phoenix', country: '米国', coordinates: [-112.17, 33.8], stage: 'front-end', kind: '工場', status: '稼働',
        scale: unavailable('枚/年', 'Arizona第1工場単体のウエハー加工能力'),
        note: '第1工場は2024年Q4にN4量産開始。後続工場・後工程施設の建設計画を稼働能力に加えていません。', sources: [tsmcArizona, tsmcFabs], labelOffset: [-120, -32],
      },
      {
        id: 'semi-gf-singapore', name: 'GF・Singapore', country: 'シンガポール', coordinates: [103.81, 1.45], stage: 'front-end', kind: '工場', status: '稼働',
        scale: { value: '約150万', unit: '枚/年（300mm換算）', year: '2023年発表', basis: '設備能力', scope: '拡張後のGF Singapore拠点全体。新設棟だけの能力でも実生産量でもない。' },
        note: '2023年拡張発表の能力。現行拠点ページでも150万枚の総能力を掲示。200mm・300mmの生産を持ちます。', sources: [gfCapacity, gfCurrent], labelOffset: [-155, 45],
      },
      {
        id: 'semi-tsmc-zhunan', name: 'TSMC・竹南AP6', country: '台湾', coordinates: [120.89, 24.72], stage: 'back-end', kind: '工場', status: '稼働',
        scale: unavailable('処理数/年', 'Advanced Backend Fab 6単体の後工程処理能力'),
        note: '苗栗県竹南の先端後工程拠点。TSMCの前工程各工場との個別移送先は、この資料からは特定しません。', sources: [tsmcFabs], labelOffset: [55, 8],
      },
      {
        id: 'semi-amkor-bacninh', name: 'Amkor・Bac Ninh', country: 'ベトナム', coordinates: [106.04, 21.19], stage: 'back-end', kind: '工場', status: '稼働',
        scale: unavailable('処理数/年', 'Bac Ninh工場の組立・検査能力'),
        note: '2023年開設の組立・検査拠点。公表された完成時のクリーンルーム面積を、実生産量へ換算しません。', sources: [amkor], labelOffset: [-180, -30],
      },
    ],
    links: [],
  },
  {
    id: 'solar', label: '太陽電池', shortLabel: '太陽電池',
    scope: '結晶シリコン系の原料・ウエハー・セル・モジュールを代表7地点で表示。薄膜系、全工場、発電所は未収録。GW/年は製品定格出力で換算した製造能力で、発電電力量ではありません。',
    stages: [
      { id: 'polysilicon', label: '原料・ポリシリコン', note: 'シリコン原料を太陽電池向けの高純度ポリシリコンに加工します。' },
      { id: 'wafer', label: 'ウエハ', note: '結晶を作り、薄いウエハーへ切り出します。' },
      { id: 'cell', label: 'セル', note: 'ウエハーを発電するセルへ加工します。' },
      { id: 'module', label: 'モジュール', note: 'セルを接続・封止し、パネルに組み立てます。' },
    ],
    sites: [
      {
        id: 'solar-wacker-nuenchritz', name: 'WACKER・Nünchritz', country: 'ドイツ', coordinates: [13.39, 51.3], stage: 'polysilicon', kind: '工場', status: '稼働',
        scale: unavailable('t/年', 'Nünchritz拠点の太陽電池向けポリシリコン年産能力'),
        note: '太陽電池向け高純度多結晶シリコンを製造。併産するシリコーンなどの数量を混ぜていません。', sources: [wacker], labelOffset: [15, -20],
      },
      {
        id: 'solar-longi-chuxiong', name: 'LONGi・楚雄', country: '中国', coordinates: [101.55, 25.03], stage: 'wafer', kind: '工場', status: '稼働',
        scale: unavailable('GW/年', '楚雄ウエハー工場の年産能力'),
        note: '雲南のウエハー製造拠点。LONGi全社の能力や出荷量を、この工場の規模として配分していません。', sources: [longi], labelOffset: [-155, -45],
      },
      {
        id: 'solar-longi-kuching', name: 'LONGi・Kuching', country: 'マレーシア', coordinates: [110.36, 1.56], stage: 'wafer', kind: '工場', status: '稼働',
        scale: unavailable('GW/年', 'Kuchingのウエハー工程単独の年産能力'),
        note: 'インゴット・ウエハー・セル・モジュールの各工場を持つ地区。ここではウエハー工程の代表として表示。', sources: [longi], labelOffset: [25, -3],
      },
      {
        id: 'solar-qcells-cartersville', name: 'Qcells・Cartersville', country: '米国', coordinates: [-84.8, 34.16], stage: 'cell', kind: '工場', status: '稼働',
        scale: { value: '3.3（計画）', unit: 'GW/年', year: '2026年6月発表', basis: '設備能力', scope: 'セル工程のフル稼働時の設計能力。発表時点の達成実績ではない。' },
        note: '2026年6月にセル生産開始。3.3GW/年への立ち上げを予定。同居するウエハー・モジュールの能力を合算しません。', sources: [qcells], labelOffset: [10, 30],
      },
      {
        id: 'solar-qcells-dalton', name: 'Qcells・Dalton', country: '米国', coordinates: [-84.97, 34.77], stage: 'module', kind: '工場', status: '稼働',
        scale: { value: '5.1', unit: 'GW/年', year: '2023年末拡張（2026年再掲）', basis: '設備能力', scope: 'Dalton工場のモジュール製造能力。Georgia州内の別工場を含まない。' },
        note: 'セルを組み立てるモジュール工場。米国の国内需要、発電設備量、セルの年産能力とは異なります。', sources: [qcells], labelOffset: [-120, -32],
      },
      {
        id: 'solar-rec-singapore', name: 'REC・Singapore', country: 'シンガポール', coordinates: [103.63, 1.3], stage: 'module', kind: '工場', status: '稼働',
        scale: unavailable('GW/年', 'Singapore統合製造拠点のモジュール年産能力'),
        note: '太陽電池モジュールを製造する統合工場。Norwayの会社本社の位置とは別です。', sources: [rec], labelOffset: [-140, 50],
      },
      {
        id: 'solar-longi-wuhu', name: 'LONGi・蕪湖', country: '中国', coordinates: [118.38, 31.33], stage: 'module', kind: '工場', status: '稼働',
        scale: unavailable('GW/年', '蕪湖モジュール工場の年産能力', '2026年9月資料'),
        note: 'BC型などのモジュール製造拠点。製造改善率や製品変換効率を、生産量・能力と取り違えません。', sources: [longiWuhu], labelOffset: [22, -55],
      },
    ],
    links: [],
  },
  {
    id: 'battery', label: '蓄電池', shortLabel: '蓄電池',
    scope: 'リチウムイオン電池の材料加工・正極/負極材・セル・パックを代表8地点で表示。車載用と定置用の例を含みます。全鉱種・全企業・全工場、地域シェアを網羅せず、セルとシステムの能力は加算しません。',
    stages: [
      { id: 'processing', label: '主要材料の加工', note: 'リチウムなどを濃縮・精製し、電池材料に使う化合物へ。採掘量とは別です。' },
      { id: 'electrode', label: '正極・負極', note: '正極活物質・負極材を製造。両方がセル工程へ供給されます。' },
      { id: 'cell', label: 'セル', note: '電極・電解液などを組み込み、充放電できるセルにします。' },
      { id: 'pack', label: 'パック', note: 'セルを接続し、制御・冷却などを加えて車載・定置用システムにします。' },
    ],
    sites: [
      {
        id: 'battery-albemarle-atacama', name: 'Albemarle・Atacama', country: 'チリ', coordinates: [-68.35, -23.5], stage: 'processing', kind: '鉱山', status: '稼働',
        scale: { value: '約6', unit: 'Li濃度（%）', year: checked, basis: '参考指標', scope: '蒸発濃縮後のかん水のリチウム濃度。採掘量・年間生産量・設備能力ではない。' },
        note: '塩湖かん水を蒸発池で濃縮する前処理拠点。濃縮かん水のLa Negraへの輸送が公式資料に明記。', sources: [albemarle], labelOffset: [15, -30],
      },
      {
        id: 'battery-albemarle-lanegra', name: 'Albemarle・La Negra', country: 'チリ', coordinates: [-70.35, -23.83], stage: 'processing', kind: '工場', status: '稼働',
        scale: unavailable('t/年（炭酸リチウム）', 'La Negra拠点の炭酸リチウム年産能力'),
        note: 'Antofagasta付近の精製・化学転換工場。工業用と電池用の炭酸リチウムを製造します。', sources: [albemarle], labelOffset: [-172, 22],
      },
      {
        id: 'battery-basf-schwarzheide', name: 'BASF・Schwarzheide', country: 'ドイツ', coordinates: [13.87, 51.48], stage: 'electrode', kind: '工場', status: '稼働',
        scale: unavailable('t/年（正極活物質）', 'Schwarzheide正極活物質工場の年産能力'),
        note: '2023年に開設した正極活物質の工場。併設のリサイクル工程の処理能力とは分けています。', sources: [basf, basfCurrent], labelOffset: [-110, -40],
      },
      {
        id: 'battery-posco-gwangyang', name: 'POSCO・光陽', country: '韓国', coordinates: [127.7, 34.93], stage: 'electrode', kind: '工場', status: '稼働',
        scale: { value: '9万', unit: 't/年（正極材）', year: '2022年11月発表', basis: '設備能力', scope: 'Gwangyang正極材工場の拡張後能力。POSCO全社の能力・実生産量ではない。' },
        note: '高ニッケル正極材の代表工場。EV台数相当の説明をそのまま生産台数には用いません。', sources: [poscoCathode], labelOffset: [22, 8],
      },
      {
        id: 'battery-posco-pohang', name: 'POSCO・浦項', country: '韓国', coordinates: [129.35, 36.03], stage: 'electrode', kind: '工場', status: '稼働',
        scale: unavailable('t/年（負極材）', 'Pohang人工黒鉛負極材工場の年産能力', '2026年8月資料'),
        note: '人工黒鉛負極材の量産拠点。別のシリコン負極材実証設備と、Vietnamの将来計画は含めません。', sources: [poscoAnode], labelOffset: [65, -45],
      },
      {
        id: 'battery-panasonic-nevada', name: 'Panasonic・Nevada', country: '米国', coordinates: [-119.48, 39.54], stage: 'cell', kind: '工場', status: '稼働',
        scale: { value: '約41', unit: 'GWh/年（セル）', year: '2025年7月発表', basis: '設備能力', scope: 'Nevada工場の公表時点の年産能力。別拠点Kansasの将来能力を含まない。' },
        note: '車載向け円筒形セルの工場。Panasonicの日本本社やTeslaのパック組立能力とは別です。', sources: [panasonic], labelOffset: [10, -38],
      },
      {
        id: 'battery-catl-ningde', name: 'CATL・寧徳', country: '中国', coordinates: [119.53, 26.66], stage: 'cell', kind: '工場', status: '稼働',
        scale: unavailable('GWh/年（セル）', 'Ningde生産拠点単独のセル年産能力'),
        note: '寧徳の電池生産拠点。CATLの会社世界シェアや全拠点合計の出荷量を当地の規模には使いません。', sources: [catl], labelOffset: [-172, 30],
      },
      {
        id: 'battery-tesla-lathrop', name: 'Tesla・Lathrop', country: '米国', coordinates: [-121.31, 37.82], stage: 'pack', kind: '工場', status: '稼働',
        scale: { value: '40', unit: 'GWh/年（システム）', year: '対象年未記載・2026-10-14確認', basis: '設備能力', scope: 'Lathrop Megafactoryの定置用Megapack組立能力。年1万基相当。セル製造能力ではない。' },
        note: '定置用蓄電システムを組み立てる工場。車載用パックやShanghai工場の能力は含めません。', sources: [tesla], labelOffset: [-148, 20],
      },
    ],
    links: [
      {
        id: 'battery-atacama-lanegra', from: 'battery-albemarle-atacama', to: 'battery-albemarle-lanegra',
        label: '濃縮かん水の社内輸送', year: '公表年なし・2026-10-14確認',
        evidence: 'Albemarleは、Atacamaで濃縮したかん水をAntofagastaのLa Negra工場へ輸送し、精製・化学転換すると説明。線は両地点の関係で、実輸送路ではありません。', sources: [albemarle],
      },
    ],
  },
];
