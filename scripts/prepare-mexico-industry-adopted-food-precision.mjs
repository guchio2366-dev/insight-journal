import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

// Rebuild only from retained research responses and the explicitly labelled
// selected numerical extract. No network, Git operations, UI writes or fills
// from a different year/classification occur in this script.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = 'public/assets/atlas/mexico-industry-adopted/';
const OUTPUT = 'src/data/atlas/mexico/industry-adopted-food-precision.json';
const MANIFEST = ASSETS + 'food-precision-provenance.json';
const CSV = ASSETS + 'food-precision-employment-2023.csv';
const STATES = Array.from({length: 32}, (_, index) => String(index + 1).padStart(2, '0'));
const INPUTS = {
  national: 'food-precision-source-ce-national-2023.json',
  states: 'food-precision-source-ce-states-2023.json',
  feed: 'food-precision-source-ce-feed-2023.json',
  classes: 'food-precision-source-ce-medical-classes-2023.json',
  extract: 'food-precision-statistical-extract.json',
};
const CE_URL = 'https://www.inegi.org.mx/app/tabulados/interactivos/?bd=CE2024&px=CE_GENNCE_1';
const CE_ID = 'mx-food-ce2024';
const ceScope = '2023年活動。Censos Económicos 2024の都市部・民間／国営等の対象事業所。州別雇用と全国同SCIAN値。全国総雇用・GDPを網羅する表ではなく、VACBはセンサス付加価値。';
const source = (title, url, year, scope) => ({title, url, year, scope});
const sources = {
  [CE_ID]: source('INEGI：Censos Económicos 2024・2023年の雇用、産出、センサス付加価値', CE_URL, 2023, ceScope),
  'mx-food-alltech-2026': source('Alltech Agri-Food Outlook 2026：2025年配合飼料生産', 'https://www.alltech.com/agri-food-outlook', 2025, '出版社公式の2026年版報告書案内。Alltech Agri-Food Outlook 2026、pp.6–7。142か国・38,837工場の調査による配合飼料生産推計。メキシコと世界の分母を同じ表から取得。'),
  'mx-food-usda-grain-2026': source('USDA Mexico Post：Grain and Feed Annual 2026', 'https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Grain%20and%20Feed%20Annual_Mexico%20City_Mexico_MX2026-0018.pdf', '2025/26商業年度・2026年3月公表', 'pp.6、8–11。2025年10月～2026年9月のトウモロコシ需給等の現地推計・見通し。加工飼料・肉の物量そのものではない。'),
  'mx-food-barthhaas-2026': source('BarthHaas Report 2025/2026：2025年ビール生産', 'https://www.barthhaas.com/fileadmin/user_upload/02_PR_World-beer-market_2026.pdf', 2025, '各国生産の集計推計。メキシコ147.87百万hl、丸めた世界約1,896百万hl、生産4位。輸出順位とは別。'),
  'mx-food-agriculture-beer-2025': source('メキシコ農業省：2025年ビール輸出', 'https://www.gob.mx/agricultura/prensa/exportaciones-de-cerveza-mexicana-superan-6-400-mdd-y-llegan-a-98-paises', 2025, '輸出価額・数量・輸出順位。36%という世界輸出価額比は2021～25年の平均で、2025年単年の世界シェアではない。'),
  'mx-food-agriculture-balance-2025': source('メキシコ農業省：2025年12月農産・食品貿易収支', 'https://nube.agricultura.gob.mx/BalanzaComercial/diciembre2025.php', 2025, 'ビール輸出価額6,479,560千USD。農産食品全体と食品工業311は別範囲。'),
  'mx-food-wits-beer-2024': source('WITS／UN Comtrade：2024年メキシコの麦芽ビール輸出先', 'https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/220300', 2024, 'H0 220300、総輸出、千USD・L。Data Méxicoの別改定系列と分子・分母を混合しない。'),
  'mx-food-crt-2024': source('CRT：2024年テキーラ生産・輸出・米国向け数量', 'https://www.crt.org.mx/2025/03/05/continuara-el-trabajo-coordinado-para-fortalecer-a-la-agroindustria-tequilera/', 2024, '同一CRT公表のL。濃度換算、在庫、国内生産品の国内販売は未確認。2025年の他系列とは混合しない。'),
  'mx-food-crt-2026': source('CRT：2026年前半テキーラ実績', 'https://www.crt.org.mx/2026/08/07/24-de-julio-dia-nacional-del-tequila/', '2026年前半', '生産302.1百万L、輸出214.4百万L。半期値であり、通年へ倍増換算しない。原産地は5州。'),
  'mx-food-wits-medical-2024': source('WITS／UN Comtrade：2024年メキシコHS9018輸出先', 'https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/9018', 2024, 'H0 9018の医科・外科・歯科・獣医科器械等。HS90全体や全医療機器ではなく、SCIAN3391と同義でもない。'),
  'mx-food-wits-medical-world-2024': source('WITS／UN Comtrade：2024年HS9018報告国別輸出額', 'https://wits.worldbank.org/trade/comtrade/en/country/ALL/year/2024/tradeflow/Exports/partner/WLD/product/9018', 2024, '取得時の公開報告国表内での輸出価額順位。EU集計を除外。未報告国・再輸出を含めた完全な世界生産シェアではない。'),
  'mx-food-wits-catheters-2024': source('WITS／UN Comtrade：2024年針・カテーテル・カニューレ等輸出', 'https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/901839', 2024, 'H0 901839、HS9018の内数。千USD。取得表に比較可能な数量はない。'),
  'mx-food-wits-aero-engine-2024': source('WITS／UN Comtrade：2024年ジェット・ターボプロップ部品輸出', 'https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/841191', 2024, 'H0 841191。エンジン部品のみ。完成航空機・航空産業全体ではない。千USD・kg。'),
  'mx-food-wits-aero-parts-2024': source('WITS／UN Comtrade：2024年その他の航空機部品輸出', 'https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/880330', 2024, 'H0 880330。完成機を除く。新しいHSの8807へ分類変更された品との時系列接合は行わない。'),
  'mx-food-wits-prepared-meat-2024': source('WITS／UN Comtrade：2024年調製・保存肉輸出', 'https://wits.worldbank.org/trade/comtrade/en/country/MEX/year/2024/tradeflow/Exports/partner/ALL/product/1602', 2024, 'H0 1602。HS02の生鮮・冷凍肉等を含まず、屠畜から加工までを含むSCIAN3116全体とは別。'),
  'mx-food-datamexico-apparel-knit-2024': source('Data México：2024年ニット衣服・付属品貿易', 'https://www.economia.gob.mx/datamexico/es/profile/product/apparel-and-accessories-accessories-of-knitted-or-crocheted', 2024, 'HS2012第61類、表示は百万USDに丸め済み。国際比較欄の2022年OECを最新世界生産値へ流用しない。'),
  'mx-food-datamexico-apparel-woven-2024': source('Data México：2024年非ニット衣服・付属品貿易', 'https://economia.gob.mx/datamexico/es/profile/product/garments-and-accessories-accessories-knitted-knitted-or-crocheted', 2024, 'HS2012第62類、百万USDに丸め済み。国内分類315・繊維産業全体と同義ではない。'),
  'mx-food-cbrands-2026': source('Constellation Brands：2026年2月期10-K', 'https://ir.cbrands.com/sec-filings/all-sec-filings/content/0000016918-26-000011/stz-20260228.htm', '2026年2月期', '企業例。メキシコ製造と米国ブランド・販売権の関係。企業全体・部門業績はメキシコ国内のGDP・付加価値とは別。'),
  'mx-food-discus-2025': source('DISCUS：2025年米国蒸留酒供給者売上', 'https://distilledspirits.org/news/distilled-spirits-council-annual-economic-briefing-2025/', 2025, '米国市場のテキーラ・メスカル合計売上。メキシコ生産額・輸出額、テキーラ単独の世界シェアではない。'),
  'mx-food-ita-aerospace-2026': source('米国商務省：メキシコ航空産業の工程・地域集積', 'https://www.trade.gov/knowledge-product/mexico-b-aerospace', '2026年公表', '地域・工程の案内資料。範囲が不明な航空全体GDP比や世界順位は数量指標へ採用しない。'),
};

const hashes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const percentage = (numerator, denominator) => Math.round(numerator / denominator * 100 * 1e6) / 1e6;
const indicator = (label, value, unit, year, definition, sourceIds, status = 'observed', extra = {}) => ({label, value, unit, year, definition, sourceIds, status, ...extra});
const missing = (label, unit, definition, sourceIds = [], year = '未確認') => indicator(label, null, unit, year, definition, sourceIds, 'unconfirmed', {note: '数量・年・製品段階を揃えた値は本データに未収録。雇用、能力、輸出額を代用しない。'});
const row = (state, stage, note, sourceIds = [CE_ID]) => ({state, stage, note, sourceIds});

export function decodeCeCell(raw) {
  const token = String(raw).split('|')[0].trim();
  if (token === '-') return {value: null, status: 'confidential'};
  if (token === 'SD') return {value: null, status: 'unknown'};
  if (!/^\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^\d+(?:\.\d+)?$/.test(token)) return {value: null, status: 'unknown'};
  const value = Number(token.replaceAll(',', ''));
  return {value, status: value === 0 ? 'zero' : 'available'};
}

function ceRecord(table, scian, state = '00') {
  const states = table.stub.find((item) => item.code === 'Entidad federativa').label;
  const activities = table.stub.find((item) => item.code === 'Actividad económica').label;
  const stateIndex = states.findIndex((label) => label.startsWith(state + ' '));
  const activityIndex = activities.findIndex((label) => label === scian || label.startsWith(scian + ' '));
  assert(stateIndex >= 0 && activityIndex >= 0, 'CE record not present: ' + state + '/' + scian);
  const names = table.heading[0].label;
  const first = (stateIndex * activities.length + activityIndex) * table.colCount;
  const raw = table.data.slice(first, first + table.colCount);
  const get = (name) => {
    const position = names.findIndex((label) => label.includes(name));
    assert(position >= 0, 'CE variable not present: ' + name);
    return decodeCeCell(raw[position]);
  };
  return {employment: get('Personal ocupado total'), output: names.some((label) => label.includes('Producción bruta total')) ? get('Producción bruta total') : null, vacb: get('Valor agregado censal bruto'), rawEmployment: raw[names.findIndex((label) => label.includes('Personal ocupado total'))]};
}

const PROFILES = [
  {id: 'food', label: '食品加工', family: 'food', scian: '311', overview: '農産・畜産・水産原料を保存・調理・包装し、国内の食卓と域外市場へ届ける。', why: '2023年のセンサス製造業雇用の16.89%、付加価値の15.41%を占める。輸出だけでなく、原料調達と国内食品供給を合わせて読む。', process: '農林水産原料→食品の加工・保存・包装→卸売・低温配送→食卓／輸出。飼料・肉加工は内数として詳しく選べる。', boundary: 'SCIAN311。飲料・たばこ312、農畜産原料の生産、飲食サービスを除く。食品全体の重量を単一単位へ合算しない。飼料・肉加工との重複を足し上げない。', regions: [row('14', '食品の加工・包装', 'ハリスコの加工雇用と原料・国内市場の接続を読む。'), row('15', '食品の加工・配送', 'メヒコ州の加工雇用と大消費地への配送を読む。'), row('19', '食品の加工・包装', 'ヌエボレオンは加工製品・出荷の地域例。'), row('30', '食品の加工・包装', 'ベラクルスは加工地域の例。農産原料の収穫分布とは別。')]},
  {id: 'feed', label: '配合飼料', family: 'food', scian: '3111', overview: '穀物・油糧種子等を調合し、畜産・養殖が使える飼料を作る。', why: '2025年世界調査の配合飼料生産5位、世界比約2.91%。2025/26年のトウモロコシ輸入は消費の約51.46%という推計があり、食料供給と原料調達集中をつなぐ。', process: '国内・輸入穀物／油かす等→配合・粉砕・造粒→畜産・養殖→肉・乳・卵。', boundary: 'SCIAN3111は食品311の内数。穀物の収穫量、飼料の重量、食肉の重量を合算しない。トウモロコシ輸入比は原料の指標であり、配合飼料そのものの輸入依存率ではない。', regions: [row('14', '配合・加工', 'ハリスコは公開雇用・付加価値の大きい飼料加工地域。'), row('22', '配合・加工', 'ケレタロの加工と畜産需要の関係を読む。'), row('10', '配合・加工', 'ドゥランゴは公開加工額の地域例。'), row('30', '配合・加工', 'ベラクルスの加工地域。原料の国内産・輸入産は別途確認する。')]},
  {id: 'meat', label: '屠畜・肉加工', family: 'food', scian: '3116', overview: '家畜・家禽を屠畜し、食肉を包装・調理・保存して供給する。', why: '2023年センサス製造業付加価値の2.11%。飼料原料の輸入、畜産、加工、国内消費・輸出のつながりを、ビールなどのブランド型輸出と比較できる。', process: '飼料・畜産→屠畜→枝肉・部分肉／調理・保存肉→低温物流→国内市場／輸出。', boundary: 'SCIAN3116は屠畜・包装・肉加工を含む。生体家畜や枝肉重量、HS02の生鮮・冷凍肉、HS1602の調製・保存肉はそれぞれ別系列。食品311の内数。', regions: [row('19', '屠畜・包装・加工', 'ヌエボレオンは公開付加価値が大きい加工地域。'), row('14', '屠畜・包装・加工', 'ハリスコは加工雇用の大きい地域。'), row('26', '屠畜・包装・加工', 'ソノラの加工雇用と畜産・出荷を読む。'), row('31', '屠畜・包装・加工', 'ユカタンの加工雇用を比較する。')]},
  {id: 'beer', label: 'ビール', family: 'food', scian: '312120', overview: '麦芽などを醸造・包装し、国内消費と米国中心の輸出市場へ届ける。', why: '2025年の生産は世界4位・約7.8%、輸出は世界1位。米国向けは2024年WITS輸出価額の約96.29%で、原料加工・ブランド・市場の関係が特徴的。', process: '穀物→麦芽等→醸造→瓶・缶→国内販売／輸出→ブランド・販売網。', boundary: 'SCIAN312120。食品311、麦芽製造、流通・飲食雇用とは別。生産4位と輸出1位を混同しない。輸出から引いた残りを国内生産品の国内消費としない。', regions: [row('05', '醸造・包装', 'コアウイラは公開雇用・付加価値の大きい醸造地域。'), row('26', '醸造・包装', 'ソノラの醸造雇用を読む。'), row('20', '醸造・包装', 'オアハカは雇用値が公開されている醸造地域の例。'), row('19', '醸造・包装', 'ヌエボレオンの公開雇用を比較する。')]},
  {id: 'tequila', label: 'テキーラ', family: 'food', scian: '312144', overview: 'アガベを蒸留・熟成・瓶詰めし、原産地とブランドの価値で販売する。', why: '2023年製造雇用の約96.75%がハリスコに集中。2024年輸出数量の米国比は約83.66%。生産・ブランドの立地と販路の集中を合わせて読む。', process: '認められた原産地のアガベ→蒸留→熟成／瓶詰め→ブランド販売→国内市場／輸出。', boundary: 'SCIAN312144。アガベ栽培、他の蒸留酒、流通と別。正規テキーラの原産地限定は蒸留酒全体の世界シェアではない。2025年はCRT・政府の値が一致しないため、同一CRT系列の2024年を使う。', regions: [row('14', '蒸留・熟成・瓶詰め', 'ハリスコに製造雇用が集中。栽培面積・ブランド本社・製造量は別の指標。'), row('11', '蒸留・瓶詰め', 'グアナフアトは製造雇用公開地域の例。'), row('16', '蒸留・瓶詰め', 'ミチョアカンは製造雇用公開地域の例。')]},
  {id: 'medical', label: '医療器械・消耗品', family: 'precision', scian: '3391', overview: '医科・歯科・検査用の非電子器械、医療消耗品や眼科用品を製造する。', why: '2023年製造業雇用の2.96%、付加価値の1.67%。2024年HS9018輸出の米国比は約94.08%で、カテーテル等も含む北米の精密製造・調達集中を読む。', process: '樹脂・金属・部材等→精密加工／成形・組立・滅菌→医療器械・消耗品→医療現場／輸出。', boundary: '地図はSCIAN3391で電子医療機器を含まない。貿易HS9018は電子器械等も含み、両者は同義ではない。HS90全体、高度画像診断機器、医療サービスの規模をこの製造量へ流用しない。', regions: [row('02', '非電子器械・消耗品の製造', 'バハカリフォルニアの製造雇用を読む。'), row('08', '非電子器械・消耗品の製造', 'チワワの製造雇用を読む。2州で全国同業種雇用の約67%。'), row('28', '器械・消耗品の製造', 'タマウリパスは公開製造雇用が大きい地域。'), row('26', '器械・消耗品の製造', 'ソノラの製造雇用と北米供給網を読む。')]},
  {id: 'aerospace', label: '航空機部品・航空製造', family: 'precision', scian: '3364', overview: 'エンジン部品・機体部品などを製造し、国外の完成機製造や航空機運用へ供給する。', why: '2023年センサス航空製造の雇用は45,915人。公開値の4州に約88.71%が集まる。2024年ジェット・ターボプロップ部品輸出価額の約94.59%が米国向けで、技能・認証・調達の分業を学べる。', process: '金属・複合材・部材→精密加工・部品組立→国外等の完成機・エンジン組立→運用・整備。', boundary: '地図はSCIAN3364の製造。完成機・部品・エンジン部品を別に統計化し、整備・設計サービスの雇用を合算しない。航空全体の範囲不明なGDP比・世界順位は採用しない。', regions: [row('02', '加工・部品組立', 'バハカリフォルニアの航空製造雇用。'), row('08', '加工・部品組立', 'チワワの航空製造雇用。'), row('26', '加工・部品組立', 'ソノラの航空製造雇用。'), row('22', '航空製造', 'ケレタロの地図値は製造雇用。整備・設計等の集積とは別に読む。')]},
  {id: 'apparel', label: '衣服', family: 'textiles', scian: '315', overview: '糸・生地を調達し、裁断・縫製・仕上げによって衣服を作る。', why: '2023年の製造業雇用の4.13%。2024年非ニット衣服の輸出は米国へ約93.65%集中する一方、同品群輸入価額の中国比は約38.62%。雇用・輸出加工・国内市場の競争を比較できる。', process: '国内・輸入糸／生地→ニット・裁断・縫製・仕上げ→衣服→国内販売／輸出。', boundary: 'SCIAN315。糸・生地の繊維産業313、その他繊維製品314、革・履物316とは別。HS61／62と完全一致しない。欠測大国のある表から最新世界生産順位・比率を確定しない。', regions: [row('21', '衣服製造', 'プエブラは衣服製造雇用が大きい地域。'), row('15', '衣服製造', 'メヒコ州の衣服製造雇用を読む。'), row('31', '衣服製造', 'ユカタンの衣服製造雇用を比較する。'), row('11', '衣服製造', 'グアナフアトの衣服製造雇用。繊維・履物との重複を分ける。')]},
];

function build(raw) {
  const censusManufacturing = ceRecord(raw.national, '31-33');
  const e = raw.extract.records;
  const all = PROFILES.map((profile) => {
    const table = profile.id === 'feed' ? raw.feed : raw.states;
    const national = ceRecord(table, profile.scian);
    const domestic = [
      indicator('製造雇用（全国）', national.employment.value, '人', 2023, '地図と同じSCIAN・同じCE原表の全国値。家計調査の全国総雇用とは範囲が異なる。', [CE_ID]),
      indicator('センサス製造業に占める雇用比', percentage(national.employment.value, censusManufacturing.employment.value), '%', 2023, '同じCEの当該業種雇用／製造業31–33雇用。全国総雇用比ではない。', [CE_ID], 'observed', {denominator: {label: 'CE対象の製造業雇用', value: censusManufacturing.employment.value, unit: '人'}}),
      indicator('センサス付加価値（VACB）', national.vacb.value, '百万ペソ', 2023, 'CEの当該SCIANの付加価値。GDP、売上、輸出額とは別。', [CE_ID]),
      indicator('センサス製造業に占める付加価値比', percentage(national.vacb.value, censusManufacturing.vacb.value), '%', 2023, '当該SCIANのVACB／同じCEの製造業31–33のVACB。GDP比ではない。', [CE_ID], 'observed', {denominator: {label: 'CE対象の製造業VACB', value: censusManufacturing.vacb.value, unit: '百万ペソ'}}),
      missing('国内生産品の国内仕向け', '品目別', '原産地別の国内販売・輸出、在庫等の整合が必要。生産＋輸入−輸出という見かけ供給やP−Xと区別する。'),
    ];
    const world = [];
    const trade = [];
    if (!['feed', 'beer', 'tequila'].includes(profile.id)) {
      domestic.push(missing('製造量（品目・工程別）', '品目別', '当該業種の品目・工程を揃えた生産量は未収録。センサス付加価値・雇用を物量へ換算しない。'));
    }
    if (profile.id === 'food') {
      world.push(missing('食品311の世界付加価値シェア', '%', '同年・同分類の世界付加価値分母は未確認。異なる食品の重量を合算して世界生産比を作らない。'));
      trade.push(missing('食品311全体の輸出量・相手国比', '品目別', '農産食品貿易全体、ビール、飼料、調製肉の個別値を食品311全体へ流用しない。'));
    } else if (profile.id === 'feed') {
      const r = e.feed2025;
      domestic.push(indicator('配合飼料生産量', r.mexico, '百万t', r.year, r.scope, [r.sourceId], 'estimate'));
      world.push(indicator('配合飼料の世界生産比', percentage(r.mexico, r.world), '%', r.year, '同じAlltech調査のメキシコ／世界配合飼料生産量。国の強制統計全数調査ではない。', [r.sourceId], 'estimate', {denominator: {label: '同調査の世界配合飼料生産', value: r.world, unit: '百万t'}}));
      world.push(indicator('配合飼料生産順位', r.rank, '位', r.year, 'Alltech世界飼料調査の国別生産順位。', [r.sourceId], 'estimate'));
      const c = e.cornInputs2025_26;
      trade.push(indicator('原料トウモロコシの輸入量', c.imports, '百万t', c.year, '加工飼料の輸入量ではない。主に飼料・澱粉用の黄トウモロコシを含む穀物輸入。', [c.sourceId], 'estimate', {note: '2026年3月公表時点のUSDA現地推計。暦年値ではない。'}));
      trade.push(indicator('原料トウモロコシの輸入／消費', percentage(c.imports, c.consumption), '%', c.year, 'トウモロコシ輸入／同穀物消費。加工飼料の輸入依存率や白トウモロコシ・トルティーヤの輸入依存率ではない。', [c.sourceId], 'estimate', {denominator: {label: '同じUSDA推計のトウモロコシ消費', value: c.consumption, unit: '百万t'}}));
      trade.push(indicator('原料トウモロコシ輸入の米国比（下限）', c.usImportOriginShareGreaterThanPercent, '%超', c.year, 'USDA現地報告は99%以上が米国原産という見通し。加工飼料の輸出先比ではない。', [c.sourceId], 'estimate'));
      trade.push(missing('加工飼料の輸出量・相手国比', 't・%', '原料穀物の輸入量・原産地比を加工飼料製品の輸出へ流用しない。'));
    } else if (profile.id === 'meat') {
      world.push(missing('肉加工3116の世界生産シェア', '%', '屠畜・包装・加工を含む3116と同じ工程・品目の世界物量分母は未確認。'));
      const r = e.preparedMeat2024Wits;
      trade.push(indicator('調製・保存肉の輸出額（HS1602）', r.totalExports / 1000, '百万USD', r.year, r.scope, [r.sourceId]));
      trade.push(indicator('調製・保存肉輸出額の米国比', percentage(r.usExports, r.totalExports), '%', r.year, '同じWITS表のHS1602米国向け／メキシコ総輸出価額。生鮮・冷凍肉等を含む肉加工全体の比率ではない。', [r.sourceId], 'observed', {denominator: {label: 'メキシコHS1602総輸出額', value: r.totalExports / 1000, unit: '百万USD'}}));
      trade.push(missing('肉加工全体の輸出量', '品目別', '生鮮・冷凍肉と調製肉を種別・加工段階別に整理する必要がある。'));
    } else if (profile.id === 'beer') {
      const r = e.beerProduction2025;
      domestic.push(indicator('ビール生産量', r.mexico, '百万hl', r.year, r.scope, [r.sourceId], 'estimate'));
      world.push(indicator('ビール世界生産比（概数）', percentage(r.mexico, r.worldApproximately), '%', r.year, 'メキシコ147.87百万hl／同資料の丸めた世界約1,896百万hl。輸出シェアではない。', [r.sourceId], 'estimate', {denominator: {label: '世界ビール生産（概数）', value: r.worldApproximately, unit: '百万hl'}, note: '約7.8%。世界分母が概数なので比率も概数。'}));
      world.push(indicator('ビール生産順位', r.rank, '位', r.year, 'BarthHaasの国別生産順位。輸出順位とは別。', [r.sourceId], 'estimate'));
      const x = e.beerExports2025;
      trade.push(indicator('ビール輸出量', x.volumeMillionLitres, '百万L', x.year, '農業省の2025年輸出公表。生産から引いた残りは国内消費ではない。', x.sourceIds));
      trade.push(indicator('ビール輸出額', x.valueMillionUsd, '百万USD', x.year, '農業省の2025年麦芽ビール輸出価額。', x.sourceIds));
      world.push(indicator('ビール輸出額順位', x.exportRank, '位', x.year, '農業省が公表した輸出順位。生産順位4位とは別。36%は複数年平均であり、単年世界比として表示しない。', [x.sourceIds[0]]));
      const t = e.beerExports2024Wits;
      trade.push(indicator('ビール輸出価額の米国比', percentage(t.usValueThousandUsd, t.worldValueThousandUsd), '%', t.year, '同じWITS H0 220300表の米国向け／メキシコ総輸出額。', [t.sourceId], 'observed', {denominator: {label: '同表のメキシコビール総輸出額', value: t.worldValueThousandUsd / 1000, unit: '百万USD'}}));
      trade.push(indicator('ビール輸出数量の米国比', percentage(t.usLitres, t.worldLitres), '%', t.year, '同じWITS表のLによる米国向け／メキシコ総輸出数量。価額比とは別。', [t.sourceId], 'observed', {denominator: {label: '同表のメキシコビール総輸出量', value: t.worldLitres / 1e6, unit: '百万L'}}));
    } else if (profile.id === 'tequila') {
      const r = e.tequila2024;
      domestic.push(indicator('テキーラ生産量（同一CRT系列）', r.production, '百万L', r.year, 'CRT公表のL。純アルコール換算・濃度換算は未確認。', [r.sourceId]));
      const recent = e.tequila2026FirstHalf;
      domestic.push(indicator('テキーラ生産量（半期）', recent.production, '百万L', recent.year, 'CRTの2026年前半実績。通年へ外挿しない。', [recent.sourceId]));
      world.push(missing('蒸留酒全体に占めるテキーラの世界生産比', '%', '正規テキーラの原産地が限定されることは、蒸留酒全体の生産比・市場比を意味しない。'));
      trade.push(indicator('テキーラ輸出量（同一CRT系列）', r.exports, '百万L', r.year, 'CRT2024年公表。生産と同じ公表系列だが在庫・国内仕向けは未確認。', [r.sourceId]));
      trade.push(indicator('テキーラ輸出数量の米国比', percentage(r.usExports, r.exports), '%', r.year, '同じCRT公表の米国334.9百万L／輸出400.3百万L。2025年の政府値と混合しない。', [r.sourceId], 'observed', {denominator: {label: '同じCRT系列のテキーラ総輸出量', value: r.exports, unit: '百万L'}}));
      trade.push(indicator('テキーラ輸出量（半期）', recent.exports, '百万L', recent.year, 'CRT2026年前半実績。2024年通年と同じ長さの期間ではない。', [recent.sourceId]));
    } else if (profile.id === 'medical') {
      const r = e.medical2024Wits;
      world.push(indicator('HS9018輸出額の公開報告国表内順位', r.reportedCountryExportRankExcludingEuAggregate, '位', r.year, 'WITSの取得した2024年報告国表、EU集計を除いて4位。世界生産順位・全医療機器順位ではない。', [r.worldSourceId], 'observed', {note: '未報告国・再輸出・製品範囲があり、完全な世界生産分母として扱わない。'}));
      world.push(missing('医療器械・消耗品の世界生産シェア', '%', '同じ製品段階・分類の世界生産量分母は未確認。HS輸出額順位を生産比へ換算しない。'));
      trade.push(indicator('医科等の器械輸出額（HS9018）', r.totalExports / 1000, '百万USD', r.year, r.scope, [r.sourceId]));
      trade.push(indicator('HS9018輸出額の米国比', percentage(r.usExports, r.totalExports), '%', r.year, '同じWITS H0 9018表の米国向け／メキシコ総輸出価額。SCIAN3391の国内出荷比ではない。', [r.sourceId], 'observed', {denominator: {label: 'メキシコHS9018総輸出額', value: r.totalExports / 1000, unit: '百万USD'}}));
      const c = e.catheters2024Wits;
      trade.push(indicator('針・カテーテル等の輸出額（HS901839）', c.totalExports / 1000, '百万USD', c.year, c.scope, [c.sourceId], 'observed', {note: 'HS9018の内数。総額へ加算しない。'}));
      trade.push(indicator('針・カテーテル等輸出額の米国比', percentage(c.usExports, c.totalExports), '%', c.year, '同じWITS H0 901839の米国向け／同品群メキシコ総輸出価額。', [c.sourceId], 'observed', {denominator: {label: 'メキシコHS901839総輸出額', value: c.totalExports / 1000, unit: '百万USD'}}));
    } else if (profile.id === 'aerospace') {
      world.push(missing('航空製造全体の世界生産比', '%', '完成機、エンジン、部品、整備サービスを区分した比較可能な世界分母は未確認。'));
      const r = e.aeroEngineParts2024Wits;
      trade.push(indicator('ジェット等エンジン部品の輸出額', r.totalExports / 1000, '百万USD', r.year, r.scope, [r.sourceId]));
      trade.push(indicator('ジェット等エンジン部品の輸出重量', r.totalKg, 'kg', r.year, '同じWITS H0 841191の部品重量。国内生産量・完成機台数・エンジン台数や性能へ換算しない。', [r.sourceId]));
      trade.push(indicator('ジェット等エンジン部品輸出額の米国比', percentage(r.usExports, r.totalExports), '%', r.year, '同じWITS H0 841191表の米国向け／メキシコ総輸出額。', [r.sourceId], 'observed', {denominator: {label: 'メキシコHS841191総輸出額', value: r.totalExports / 1000, unit: '百万USD'}}));
      const a = e.aeroAirframeParts2024Wits;
      trade.push(indicator('その他の航空機部品の輸出額', a.totalExports / 1000, '百万USD', a.year, a.scope, [a.sourceId]));
      trade.push(indicator('その他の航空機部品輸出額の米国比', percentage(a.usExports, a.totalExports), '%', a.year, '同じWITS H0 880330表の米国向け／メキシコ総輸出額。', [a.sourceId], 'observed', {denominator: {label: 'メキシコHS880330総輸出額', value: a.totalExports / 1000, unit: '百万USD'}}));
    } else if (profile.id === 'apparel') {
      world.push(missing('衣服の最新世界生産シェア', '%', 'Data México国際欄は2022年／OEC。別の2024年報告国表には主要輸出国の欠測があり、最新世界順位・比率を確定しない。'));
      const r = e.apparel2024;
      trade.push(indicator('ニット衣服・付属品輸出額（HS61）', r.knittedExports, '百万USD', r.year, r.scope, [r.sourceIds[0]], 'observed', {note: '百万USDに丸めた公開値。SCIAN315と完全一致しない。'}));
      trade.push(indicator('非ニット衣服・付属品輸出額（HS62）', r.wovenExports, '百万USD', r.year, r.scope, [r.sourceIds[1]]));
      trade.push(indicator('非ニット衣服輸出額の米国比', percentage(r.wovenUsExports, r.wovenExports), '%', r.year, '同じData México HS62表の米国2,494／輸出2,663百万USD。丸めた値からの計算。', [r.sourceIds[1]], 'observed', {denominator: {label: 'メキシコHS62総輸出額（丸め値）', value: r.wovenExports, unit: '百万USD'}}));
      trade.push(indicator('非ニット衣服輸入額の中国比', percentage(r.wovenImportsFromChina, r.wovenImports), '%', r.year, '同じData México HS62表の中国1,150／輸入2,978百万USD。原料生地の調達比ではなく、衣服等輸入の原産地比。', [r.sourceIds[1]], 'observed', {denominator: {label: 'メキシコHS62総輸入額（丸め値）', value: r.wovenImports, unit: '百万USD'}}));
    }
    const values = STATES.map((state) => ({state, ...ceRecord(table, profile.scian, state).employment}));
    const entry = {id: profile.id, label: profile.label, family: profile.family, sectors: ['manufacturing'], overview: profile.overview, why: profile.why, process: profile.process, boundary: profile.boundary + ' 地図は2023年の雇用で、産出数量ではない。VACBはGDPではない。', map: {kind: 'employment', year: 2023, unit: '人', definition: ceScope + ' SCIAN ' + profile.scian + '。数値0のみzero、秘匿「-」はconfidential、SDはunknown。公開州の合計を全国値としない。州の案内位置は工場座標ではない。', nationalTotal: national.employment.value, sourceIds: [CE_ID], values, regions: profile.regions}, statistics: {domestic, world, trade}};
    // Independently retained national response must agree with the national row
    // of the state table, so a mixed series cannot silently become a denominator.
    if (profile.id !== 'feed') {
      const independentNational = ceRecord(raw.national, profile.scian);
      assert.equal(national.employment.value, independentNational.employment.value, 'CE employment series mismatch: ' + profile.id);
      assert.equal(national.vacb.value, independentNational.vacb.value, 'CE VACB series mismatch: ' + profile.id);
    }
    return entry;
  });
  // Resolve and display the narrow medical manufacturing classes without
  // borrowing electronics employment or assigning all HS9018 to these classes.
  const medical = all.find((item) => item.id === 'medical');
  for (const [code, label] of [['339111', '非電子医科・歯科・検査用品'], ['339112', '医療消耗品'], ['339113', '眼科用品']]) {
    const c = ceRecord(raw.classes, code);
    medical.statistics.domestic.push(indicator(label + 'の製造雇用', c.employment.value, '人', 2023, 'SCIAN' + code + '。地図の3391の内数。電子医療機器の製造・医療サービスではない。', [CE_ID]));
  }
  return {sources, industries: all};
}

function validate(data) {
  assert.deepEqual(data.industries.map((item) => item.id), ['food', 'feed', 'meat', 'beer', 'tequila', 'medical', 'aerospace', 'apparel']);
  for (const id of Object.keys(data.sources)) assert(id.startsWith('mx-food-'));
  for (const item of data.industries) {
    assert.deepEqual(item.sectors, ['manufacturing']);
    assert.deepEqual(item.map.values.map((cell) => cell.state), STATES);
    assert.equal(item.map.kind, 'employment');
    assert.equal(item.map.year, 2023);
    assert(item.map.nationalTotal > 0);
    assert(item.map.regions.length >= 1);
    for (const cell of item.map.values) {
      assert(['available', 'zero', 'confidential', 'unknown', 'unretrieved'].includes(cell.status));
      if (cell.status === 'available') assert(Number.isInteger(cell.value) && cell.value > 0);
      else if (cell.status === 'zero') assert.equal(cell.value, 0);
      else assert.equal(cell.value, null);
    }
    const disclosed = item.map.values.reduce((sum, cell) => sum + (cell.value ?? 0), 0);
    assert(disclosed <= item.map.nationalTotal, 'Disclosed states exceed same-table national total: ' + item.id);
    if (item.map.values.every((cell) => cell.value !== null)) assert.equal(disclosed, item.map.nationalTotal);
    const indicators = Object.values(item.statistics).flat();
    for (const metric of indicators) {
      assert(['observed', 'estimate', 'unconfirmed'].includes(metric.status));
      if (metric.status === 'unconfirmed') assert.equal(metric.value, null);
      else assert(Number.isFinite(metric.value));
      if (metric.denominator) assert(Number.isFinite(metric.denominator.value) && metric.denominator.value > 0);
      for (const id of metric.sourceIds) assert(data.sources[id], 'Unknown source: ' + id);
    }
    for (const id of [...item.map.sourceIds, ...item.map.regions.flatMap((region) => region.sourceIds)]) assert(data.sources[id]);
  }
}

export async function prepareFoodPrecision({check = false} = {}) {
  const raw = {};
  const identities = [];
  for (const [key, name] of Object.entries(INPUTS)) {
    const bytes = await readFile(path.join(ROOT, ASSETS, name));
    raw[key] = JSON.parse(bytes);
    identities.push({key, file: ASSETS + name, bytes: bytes.length, sha256: hashes(bytes), preservation: key === 'extract' ? 'selected numeric transcription; not original PDF/HTML' : 'unmodified retained INEGI API response'});
  }
  const data = build(raw);
  validate(data);
  const outputBytes = JSON.stringify(data, null, 2) + '\n';
  const csvLines = ['industry,scian,year,state,employment,status,raw_source_token'];
  for (const profile of PROFILES) {
    const table = profile.id === 'feed' ? raw.feed : raw.states;
    for (const state of STATES) {
      const r = ceRecord(table, profile.scian, state);
      csvLines.push([profile.id, profile.scian, 2023, state, r.employment.value ?? '', r.employment.status, '"' + r.rawEmployment.replaceAll('"', '""') + '"'].join(','));
    }
  }
  const csvBytes = csvLines.join('\n') + '\n';
  const queries = {
    national: {states: ['0'], activities: ['1', '185', '186', '225', '260', '267', '275', '319', '708', '737'], variables: ['1', '2', '16', '18']},
    states: {states: Array.from({length: 33}, (_, i) => String(i)), activities: ['186', '225', '260', '267', '275', '319', '708', '737'], variables: ['2', '16', '18']},
    feed: {states: Array.from({length: 33}, (_, i) => String(i)), activities: ['187'], variables: ['2', '16', '18']},
    classes: {states: ['0', '2', '8', '14', '26', '28'], activities: ['739', '740', '741'], variables: ['2', '18']},
  };
  const apiRequests = Object.fromEntries(Object.entries(queries).map(([key, selection]) => [key, {lang: 'es', file: 'CE2024/CE_GENNCE_1', stub: ['Entidad federativa', 'Actividad económica'], heading: ['Variables'], query: {query: [['Entidad federativa', selection.states], ['Actividad económica', selection.activities], ['Variables', selection.variables]].map(([code, values]) => ({code, selection: {filter: 'item', values}})), response: {format: 'json-stat'}}}]));
  const statusCounts = Object.fromEntries(data.industries.map((item) => [item.id, Object.fromEntries(['available', 'zero', 'confidential', 'unknown', 'unretrieved'].map((status) => [status, item.map.values.filter((cell) => cell.status === status).length]))]));
  const manifest = {
    schemaVersion: 1,
    owner: 'mexico-food-precision',
    capturedDate: raw.extract.capturedDate,
    generator: 'scripts/prepare-mexico-industry-adopted-food-precision.mjs',
    inputFiles: identities,
    sources: data.sources,
    ceApi: {metadataUrl: 'https://www.inegi.org.mx/app/tabulados/pxwebapi/api/tabulado?lang=es&file=CE2024%2FCE_GENNCE_1', readPostUrl: 'https://www.inegi.org.mx/app/tabulados/pxwebapi/api/datatable', requests: apiRequests, activityValueIds: 'Original capture IDs for the CE2024/CE_GENNCE_1 metadata snapshot; verify metadata before any new acquisition.'},
    output: {file: OUTPUT, bytes: Buffer.byteLength(outputBytes), sha256: hashes(outputBytes)},
    employmentExtract: {file: CSV, records: 256, bytes: Buffer.byteLength(csvBytes), sha256: hashes(csvBytes)},
    mapNationalTotals: Object.fromEntries(data.industries.map((item) => [item.id, item.map.nationalTotal])),
    statusCounts,
    notes: ['CE原票の「-」は秘匿。「SD」は原票注記に活動なし等の複数説明があり、数値0に変えずunknown。', '全国値は州別原票内の同年・同SCIAN全国行。公開州の合計で代用しない。', 'CE対象の雇用・VACB比は全国総雇用比・GDP比ではない。食品311の内数の飼料・肉と、医療3391の細分類を重複加算しない。', '世界と国内は資料ごとの製品段階・単位・年を維持。推計・商業年度・半期を明記。P−Xを国内消費として表示しない。', 'CE以外の保持ファイルは検証済みの数値転記。元HTML/PDF全体の原票としては扱わない。未確認指標はnull。', 'このスクリプトは保存入力だけから再生成。--checkは出力を書き換えず照合する。'],
  };
  const manifestBytes = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    for (const [file, expected] of [[OUTPUT, outputBytes], [CSV, csvBytes], [MANIFEST, manifestBytes]]) assert.equal(await readFile(path.join(ROOT, file), 'utf8'), expected, 'Generated output is stale: ' + file);
  } else {
    await writeFile(path.join(ROOT, OUTPUT), outputBytes);
    await writeFile(path.join(ROOT, CSV), csvBytes);
    await writeFile(path.join(ROOT, MANIFEST), manifestBytes);
  }
  console.log(JSON.stringify({check, industries: data.industries.length, mapRows: 256, statusCounts, unconfirmedStatistics: data.industries.reduce((sum, item) => sum + Object.values(item.statistics).flat().filter((metric) => metric.status === 'unconfirmed').length, 0)}));
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareFoodPrecision({check: process.argv.includes('--check')});
