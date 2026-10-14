import type { Sector, Source } from './types';

const ichthys: Source = { label: 'INPEX Australia｜Ichthys LNG・施設と輸送管', url: 'https://www.inpex.com.au/projects/ichthys-lng' };
const naoetsu: Source = { label: 'INPEX｜直江津LNG基地・2024年能力改定', url: 'https://www.inpex.com/english/business/project/naoetsu.html' };
const ichthysArrival: Source = { label: 'INPEX｜イクシス初荷の直江津到着（2018-10-31）', url: 'https://www.inpex.com/english/news/english/news/assets/pdf/e20181031.pdf' };
const ormen: Source = { label: 'ノルウェー政府・海洋庁｜Ormen Lange', url: 'https://www.norskpetroleum.no/en/facts/field/ormen-lange/' };
const nyhamna: Source = { label: 'Gassco｜Nyhamna・輸出能力', url: 'https://gassco.eu/en/prosessanlegg/nyhamna/' };
const easington: Source = { label: 'Gassco｜英国受入基地・Easington', url: 'https://gassco.eu/en/mottaksterminaler/the-united-kingdom/' };
const gasPipelines: Source = { label: 'Gassco｜Langeled North / South の接続', url: 'https://gassco.eu/en/about-us/where-we-are/pipelines-and-platforms/' };
const gasDelivered: Source = { label: 'Gassco｜欧州受入基地向け輸送実績（2025年）', url: 'https://gassco.eu/en/about-us/what-we-do/key-figures/' };
const norwayOil: Source = { label: 'EIA｜ノルウェー・油田生産と製油所能力（2024年資料）', url: 'https://www.eia.gov/international/content/analysis/countries_long/norway/' };
const sverdrup: Source = { label: 'ノルウェー政府・海洋庁｜Johan Sverdrup', url: 'https://www.norskpetroleum.no/en/facts/field/johan-sverdrup/' };
const firstOil: Source = { label: 'Equinor｜Mongstadへの初送油・中国向け初荷販売（2019-10-21）', url: 'https://www.equinor.com/news/archive/2019-10-21-first-oil-sverdrup-mongstad' };
const jamnagar: Source = { label: 'Reliance Industries｜Jamnagar・原油処理能力', url: 'https://www.ril.com/businesses/energy/refining-marketing' };
const portArthur: Source = { label: 'EIA｜製油所の稼働可能能力（2026-01-01）', url: 'https://www.eia.gov/energyexplained/oil-and-petroleum-products/refining-crude-oil-refinery-rankings.php' };
const usDemand: Source = { label: 'EIA｜米国の石油消費・2025年', url: 'https://www.eia.gov/tools/faqs/faq.php?id=33&t=6' };
const chinaDemand: Source = { label: 'EIA｜中国・2023年一次エネルギー消費表', url: 'https://www.eia.gov/international/content/analysis/countries_long/China/' };

export const energySectors: Sector[] = [
  {
    id: 'gas', label: '天然ガス・LNG', shortLabel: '天然ガス',
    scope: '豪州→日本のLNG、ノルウェー→英国の管路、ノルウェー→欧州の地域輸送実績を代表例で示します。世界の全ガス田・基地・供給量は網羅していません。施設の点と地域集計の点を区別して読みます。',
    stages: [
      { id: 'gas-extraction', label: '採掘', note: 'ガス田から取り出す。液化設備や会社本社とは別の場所です。' },
      { id: 'gas-processing', label: '処理・液化', note: '不純物を除く。海上輸送用のLNGはここで液化します。管路供給は必ずしも液化しません。' },
      { id: 'gas-receiving', label: '輸送・受入', note: '船または管路で受入。LNGは再ガス化し、需要地へ送ります。' },
    ],
    sites: [
      {
        id: 'gas-ichthys-field', name: 'イクシスガス田', country: 'オーストラリア', coordinates: [123.5, -13.9], stage: 'gas-extraction', kind: '油ガス田', status: '稼働',
        scale: { value: '約800', unit: 'km²（ガス田面積）', year: '2026年10月確認', basis: '参考指標', scope: 'ガス田の広がり。年間生産量・LNG生産能力ではありません。' },
        note: '西豪州沖の海底ガス田の概略位置。2018年生産開始。初期処理後、ガスを海底管でダーウィンへ送ります。', sources: [ichthys], labelOffset: [-17, 19],
      },
      {
        id: 'gas-ormen', name: 'オルメン・ランゲ', country: 'ノルウェー', coordinates: [5.3, 63.5], stage: 'gas-extraction', kind: '油ガス田', status: '稼働',
        scale: { value: '24', unit: '生産井（開発概要）', year: '2026年10月確認', basis: '参考指標', scope: '政府の開発説明に記載された生産井数。日々の稼働井数や年間生産量ではありません。' },
        note: 'ノルウェー海の海底生産拠点。2007年生産開始。ガスと少量の凝縮油を陸上のニューハムナへ送ります。', sources: [ormen], labelOffset: [-17, -24],
      },
      {
        id: 'gas-ichthys-lng', name: 'ダーウィン・イクシスLNG', country: 'オーストラリア', coordinates: [130.94, -12.52], stage: 'gas-processing', kind: '工場', status: '稼働',
        scale: { value: '930', unit: '万t LNG/年', year: '2026年10月確認', basis: '設備能力', scope: 'Bladin Pointの2液化系列のピーク生産能力。年間生産実績ではありません。' },
        note: 'ガス田から約890 kmの海底管で受け、液化・貯蔵・船積みします。ダーウィン市の別施設「Darwin LNG」とは区別します。', sources: [ichthys], labelOffset: [16, -14],
      },
      {
        id: 'gas-nyhamna', name: 'ニューハムナ', country: 'ノルウェー', coordinates: [6.96, 62.85], stage: 'gas-processing', kind: '工場', status: '稼働',
        scale: { value: '8,400', unit: '万Sm³ ガス/日', year: '2026年10月確認', basis: '設備能力', scope: '処理基地のガス輸出能力。Ormen Lange単独の生産量ではありません。Sm³は標準状態体積。' },
        note: '脱水・凝縮油分離・圧縮を行う陸上基地。Polarled経由の他ガス田も受け入れます。LNG液化基地ではありません。', sources: [nyhamna, ormen], labelOffset: [17, 14],
      },
      {
        id: 'gas-naoetsu', name: '直江津LNG基地', country: '日本', coordinates: [138.28, 37.18], stage: 'gas-receiving', kind: '港・受入基地', status: '稼働',
        scale: { value: '825', unit: '万Nm³ ガス/日', year: '2024年4月改定', basis: '設備能力', scope: '基地の最大ガス送出能力。LNGの液体体積や年間受入量ではありません。Nm³は標準状態体積。' },
        note: '新潟県上越市の受入・再ガス化基地。2018年10月にイクシスLNG初荷が到着。国内ガスと合わせ管路網へ供給します。', sources: [naoetsu, ichthysArrival], labelOffset: [16, -13],
      },
      {
        id: 'gas-easington', name: 'イージントン受入基地', country: '英国', coordinates: [0.12, 53.66], stage: 'gas-receiving', kind: '港・受入基地', status: '稼働',
        scale: { value: '記載なし', unit: '（年間受入量）', year: '2026年10月確認', basis: '非公表', scope: '参照したGasscoの施設説明には年間受入量の数値なし。能力や英国全体の輸入量へ置き換えていません。' },
        note: '英国東岸のGassco受入設備。Langeled Southからのガスを調圧・温度調整し、英国の輸送網へ送ります。LNG受入基地ではありません。', sources: [easington, gasPipelines], labelOffset: [-16, 18],
      },
      {
        id: 'gas-norway-exports', name: 'ノルウェー管路輸送（地域）', country: 'ノルウェー', coordinates: [11.6, 67.5], stage: 'gas-processing', kind: '地域', status: '地域集計',
        scale: { value: '1,149', unit: '億Sm³ ガス/年', year: '2025年', basis: '出荷実績', scope: 'Gassco輸送系統から欧州受入基地へ届けたガスの集計。ノルウェー全ガス生産量やNyhamna単独の出荷量ではありません。' },
        note: '点は複数ガス田・処理基地・輸送管からなる供給側地域の案内位置。特定の設備や本社所在地ではありません。', sources: [gasDelivered], labelOffset: [18, -21],
      },
      {
        id: 'gas-europe-receiving', name: '欧州受入（地域集計）', country: '欧州', coordinates: [11.5, 48], stage: 'gas-receiving', kind: '地域', status: '地域集計',
        scale: { value: '1,149', unit: '億Sm³ ガス/年', year: '2025年', basis: '出荷実績', scope: 'Gasscoが欧州受入基地へ届けたガス量。同じ輸送を受入側で表示しており、供給側と足しません。欧州全体の需要・全輸入量ではありません。' },
        note: '点は英国・ドイツ・ベルギー・フランス等の受入側地域の案内位置。単一基地やこの座標の都市の受入量ではありません。', sources: [gasDelivered], labelOffset: [16, 19],
      },
    ],
    links: [
      { id: 'gas-norway-europe-volume', from: 'gas-norway-exports', to: 'gas-europe-receiving', label: '欧州向け：1,149億m³/年', year: '2025年', evidence: '実輸送量の地域集計。Gasscoの年次表は欧州受入基地への輸送量を114.9 billion scm（1,149億標準m³）と公表。複数の管路・基地をまとめた流れで、Ormen Lange→Easingtonの単独量ではありません。地域間の概略線は管路経路を再現しません。', sources: [gasDelivered] },
      { id: 'gas-ichthys-pipeline', from: 'gas-ichthys-field', to: 'gas-ichthys-lng', label: 'ガス田→液化基地', year: '2018年稼働開始・2026年10月確認', evidence: '既設管路の接続。海上初期処理設備からBladin Pointへ約890 kmの海底管でガスを送ります。この区間の年間輸送量は参照した施設説明に記載なし。', sources: [ichthys] },
      { id: 'gas-ichthys-naoetsu', from: 'gas-ichthys-lng', to: 'gas-naoetsu', label: 'LNG船：豪州→日本', year: '2018年10月31日', evidence: '初荷の受入実績。INPEXがダーウィンで液化したイクシスLNGの直江津到着を公表。個別カーゴ量は同発表に記載なし。継続契約量や現在の全供給量は示しません。線は航路の再現ではありません。', sources: [ichthysArrival] },
      { id: 'gas-ormen-nyhamna', from: 'gas-ormen', to: 'gas-nyhamna', label: 'ガス田→処理基地', year: '2007年生産開始・2026年10月確認', evidence: '既設管路の接続。政府資料は2本の多相流パイプラインでOrmen Langeの井流をNyhamnaへ送ると記載。区間の年間輸送量は参照した説明に記載なし。', sources: [ormen] },
      { id: 'gas-langeled', from: 'gas-nyhamna', to: 'gas-easington', label: '管路：ノルウェー→英国', year: '2026年10月確認', evidence: '既設管路の供給接続。Langeled North（627 km）でSleipnerへ、South（523 km）でEasingtonへ送ります。途中の混合・接続を省略した概略線で、Ormen Lange単独の取引量や直結管ではありません。区間の年間輸送量はここでは未収録。', sources: [ormen, gasPipelines, easington] },
    ],
  },
  {
    id: 'oil', label: '原油・石油', shortLabel: '石油',
    scope: '北海の産地、欧州・南アジア・北米の精製、米中の需要を代表例で示します。全油田・製油所・貿易を網羅していません。需要国の点は国全体の集計の案内位置です。',
    stages: [
      { id: 'oil-extraction', label: '採掘', note: '油田から原油を取り出す。産地と製油所は同じ場所とは限りません。' },
      { id: 'oil-refining', label: '精製', note: '港・管路で原油を受け、燃料や化学原料へ加工します。' },
      { id: 'oil-demand', label: '需要地', note: '輸送燃料・産業原料などの需要。国単位集計を個別施設と分けて読みます。' },
    ],
    sites: [
      {
        id: 'oil-sverdrup', name: 'ヨハン・スヴェルドルプ油田', country: 'ノルウェー', coordinates: [2.5, 58.8], stage: 'oil-extraction', kind: '油ガス田', status: '稼働',
        scale: { value: '約71', unit: '万バレル 原油/日', year: '2023年', basis: '生産実績', scope: '油田全体の原油生産の日量平均。Equinor持分量や計画ピーク能力ではありません。' },
        note: '北海の海上油田の概略位置。2019年生産開始。原油はMongstadの貯蔵・出荷設備へ送られます。', sources: [norwayOil, sverdrup], labelOffset: [-17, 17],
      },
      {
        id: 'oil-mongstad', name: 'モングスタッド製油・港湾', country: 'ノルウェー', coordinates: [5.03, 60.81], stage: 'oil-refining', kind: '工場', status: '稼働',
        scale: { value: '20.3', unit: '万バレル 原油/日', year: '2024年8月資料', basis: '設備能力', scope: '製油所の原油蒸留能力。併設ターミナルの受入量・油田からの送油量とは別です。' },
        note: '製油所と貯蔵・船積みターミナルが併設。油田からの到着線はターミナルへの送油を示し、全量がここで精製されるとは限りません。', sources: [norwayOil, firstOil], labelOffset: [16, -22],
      },
      {
        id: 'oil-jamnagar', name: 'ジャムナガル製油複合拠点', country: 'インド', coordinates: [69.9, 22.35], stage: 'oil-refining', kind: '工場', status: '稼働',
        scale: { value: '140', unit: '万バレル 原油/日', year: '2026年10月確認', basis: '設備能力', scope: 'Relianceの同一立地複合拠点の原油処理能力。年間処理実績・インド全体の能力ではありません。' },
        note: '港湾設備で原油を受ける大規模精製・石油化学拠点。確認していない特定油田との取引線は表示していません。', sources: [jamnagar], labelOffset: [16, 16],
      },
      {
        id: 'oil-port-arthur', name: 'ポートアーサー製油所', country: '米国', coordinates: [-93.94, 29.86], stage: 'oil-refining', kind: '工場', status: '稼働',
        scale: { value: '65.64', unit: '万バレル 原油/日', year: '2026年1月1日', basis: '設備能力', scope: 'Motiva製油所の稼働可能な常圧原油蒸留能力（暦日ベース）。同市の他社製油所を含みません。' },
        note: 'テキサス州メキシコ湾岸のMotiva施設。所有会社の本社や、米国全体の精製能力を示す点ではありません。', sources: [portArthur], labelOffset: [16, 16],
      },
      {
        id: 'oil-us-demand', name: '米国・石油需要（国集計）', country: '米国', coordinates: [-101, 39], stage: 'oil-demand', kind: '地域', status: '地域集計',
        scale: { value: '2,060', unit: '万バレル 石油製品/日', year: '2025年', basis: '需要実績', scope: '米国全体の石油製品供給量を消費の代理指標とするEIA値。バイオ燃料を含み、原油の直接消費量ではありません。' },
        note: '点は国集計の案内位置。特定都市・製油所の需要ではありません。輸送・産業など複数用途を含みます。', sources: [usDemand], labelOffset: [16, -13],
      },
      {
        id: 'oil-china-demand', name: '中国・石油需要（国集計）', country: '中国', coordinates: [105, 35], stage: 'oil-demand', kind: '地域', status: '地域集計',
        scale: { value: '32.2', unit: '千兆Btu/年', year: '2023年', basis: '需要実績', scope: '国全体の石油・その他液体燃料の一次エネルギー消費。EIA推計を含む熱量指標で、バレル/日と同じ尺度ではありません。' },
        note: '点は国集計の案内位置。出典のquads（10¹⁵ Btu）で表示。下の初荷販売例は2019年の原油であり、この需要量全体を説明するものではありません。', sources: [chinaDemand], labelOffset: [16, -13],
      },
    ],
    links: [
      { id: 'oil-sverdrup-mongstad', from: 'oil-sverdrup', to: 'oil-mongstad', label: '北海→貯蔵・出荷港', year: '2019年10月初送油', evidence: '送油到着実績と既設管路の接続。Equinorは283 kmの管路でMongstadへ原油が到着したと発表。区間の実際の年間輸送量は同発表に記載なし。併設製油所への全量投入を意味しません。', sources: [firstOil, sverdrup] },
      { id: 'oil-mongstad-china', from: 'oil-mongstad', to: 'oil-china-demand', label: '中国向け：初荷販売', year: '2019年10月21日発表', evidence: '販売・出荷予定の公表。Equinorは初荷100万バレルをUNIPECへ販売済みとし、中国へ船積み予定と発表。到着実績・継続供給契約・現在の貿易量ではありません。相手側の製油所は特定せず中国という地域へ線を引きます。線は実航路の再現ではありません。', sources: [firstOil] },
    ],
  },
];
