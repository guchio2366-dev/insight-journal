import type { Sector, Source } from './types';

const bhpReview: Source = {
  label: 'BHP Operational Review FY2026, pp. 3–4',
  url: 'https://www.bhp.com/-/media/documents/media/reports-and-presentations/2026/260716_bhpoperationalreviewfortheyearended30june2026.pdf',
};
const kennecott: Source = {
  label: 'Rio Tinto — Kennecott（統合操業・鉱石の既存施設での処理）',
  url: 'https://www.riotinto.com/en/operations/us/kennecott',
};
const aurubisSites: Source = {
  label: 'Aurubis — Sites（各工場の所在地・製品）',
  url: 'https://www.aurubis.com/en/about-us/group/sites',
};
const steelUse: Source = {
  label: 'worldsteel — World Steel in Figures 2025 / Apparent steel use',
  url: 'https://worldsteel.org/data/world-steel-in-figures/world-steel-in-figures-2025/',
};
const tataManufacturing: Source = {
  label: 'Tata Steel Integrated Report 2024–25 — Manufactured Capital',
  url: 'https://www.tatasteel.com/investors/integrated-report-2024-25/manufactured-capital.html',
};
const ghentProcess: Source = {
  label: 'ArcelorMittal Belgium — Production process',
  url: 'https://belgium.arcelormittal.com/en/what-we-do/production-process',
};
const ghentStadium: Source = {
  label: 'ArcelorMittal Belgium — Artevelde Stadium（屋根材の製造元）',
  url: 'https://belgium.arcelormittal.com/en/what-we-do/applications-steel/arteveldestadion-gent',
};

export const metalsSectors: Sector[] = [
  {
    id: 'copper', label: '銅', shortLabel: '銅',
    scope: '採掘・製錬／精製・加工の代表7地点。全鉱山・全工場の一覧ではありません。電線用の線材と圧延材を加工例として選定。点は施設位置の概略です。',
    stages: [
      { id: 'mining', label: '採掘', note: '鉱石を採掘・選鉱して精鉱へ。浸出・電解採取で鉱山から電気銅を得る経路もあります。' },
      { id: 'refining', label: '製錬・精製', note: '精鉱や再生原料から粗銅・陽極を経て電気銅へ。工程順は一般的な関係で、個別の売買を示しません。' },
      { id: 'fabrication', label: '加工', note: '電気銅などを線材・板・条へ加工し、電線や機器材料に利用。取引先が確認できない地点間には線を引きません。' },
    ],
    sites: [
      {
        id: 'cu-escondida', name: 'Escondida 鉱山', country: 'チリ', coordinates: [-69.07, -24.27],
        stage: 'mining', kind: '鉱山', status: '稼働',
        scale: { value: '1,261', unit: '千t-Cu', year: 'FY2026（2025/7–2026/6）', basis: '生産実績', scope: '操業全体100%ベースの精鉱中銅量＋カソード。BHPの持分57.5%の数量ではない' },
        note: '2露天掘り鉱区から選鉱・浸出設備へ。鉱山内の電気銅生産も含むため、この数値を製錬所の電気銅量と足し合わせません。',
        sources: [bhpReview, { label: 'BHP — Escondida（施設・所在地）', url: 'https://www.bhp.com/what-we-do/global-locations/chile/escondida' }],
        labelOffset: [12, 20],
      },
      {
        id: 'cu-kennecott-mine', name: 'Kennecott 鉱山', country: '米国', coordinates: [-112.15, 40.52],
        stage: 'mining', kind: '鉱山', status: '稼働',
        scale: { value: '記載なし', unit: 't-Cu/年', year: '2026年確認', basis: '非公表', scope: '確認した公式拠点紹介には、鉱山単独の年間生産量を記載していない' },
        note: 'Bingham Canyon の露天・坑内採掘。選鉱・製錬・精製までを含む統合操業のうち採掘地点を表示。',
        sources: [kennecott], labelOffset: [-125, 24],
      },
      {
        id: 'cu-kennecott-refinery', name: 'Kennecott 製錬・精製', country: '米国', coordinates: [-112.20, 40.75],
        stage: 'refining', kind: '工場', status: '稼働',
        scale: { value: '記載なし', unit: 't-電気銅/年', year: '2026年確認', basis: '非公表', scope: '確認した公式拠点紹介には、製錬・精製設備単独の年間能力を記載していない' },
        note: '鉱山と同じ統合操業の製錬・精製施設。採掘地点とは別の設備で、鉱山の数量を重複計上しません。',
        sources: [kennecott], labelOffset: [12, -22],
      },
      {
        id: 'cu-naoshima', name: '直島製錬所', country: '日本', coordinates: [133.98, 34.47],
        stage: 'refining', kind: '工場', status: '稼働',
        scale: { value: '20万超', unit: 't-電気銅/年', year: '対象年記載なし（2026年確認）', basis: '参考指標', scope: '公式紹介の年間生産規模。特定年度の実績値や設計能力として扱わない' },
        note: '銅製錬・電解精製と二次原料の処理。会社本社ではなく香川県直島町の製錬所を表示。',
        sources: [{ label: '三菱マテリアル — 直島製錬所（年間生産規模）', url: 'https://www.mmc.co.jp/naoshima/' }, { label: '直島製錬所 基本情報（所在地）', url: 'https://www.mmc.co.jp/naoshima/corporate/about.html' }],
        labelOffset: [12, 18],
      },
      {
        id: 'cu-hamburg', name: 'Hamburg 製錬所', country: 'ドイツ', coordinates: [10.04, 53.52],
        stage: 'refining', kind: '工場', status: '稼働',
        scale: { value: '451,775', unit: 't-精製銅', year: '2025（暦年）', basis: '生産実績', scope: 'Hamburg拠点の精製銅生産量。Aurubis全社の数量ではない' },
        note: '電気銅・線材・鋳造形材を製造する工場。数値は精製銅の年間生産量で、加工製品の数量と重複加算しません。',
        sources: [aurubisSites, { label: 'Aurubis Environmental Statement 2026, Hamburg, p. B-52（2025年生産量）', url: 'https://www.aurubis.com/en/dam/jcr:0ef146d1-4255-4502-b5c6-c57fb98f9dba/20260703_Umweltbericht_2026_EN_interaktiv.2026-07-06-14-44-17.pdf' }], labelOffset: [-138, 4],
      },
      {
        id: 'cu-avellino', name: 'Avellino 線材工場', country: 'イタリア', coordinates: [14.82, 40.94],
        stage: 'fabrication', kind: '工場', status: '稼働',
        scale: { value: '記載なし', unit: 't-銅線材/年', year: '2025年資料', basis: '非公表', scope: '炉更新による能力増加率は公表されているが、確認資料に絶対量の記載なし' },
        note: '電気銅と高純度スクラップから銅線材へ。2025年の炉改修資料では追加改修後の能力増強を記載しており、増加率を現在の生産量には転用しません。',
        sources: [aurubisSites, { label: 'Aurubis — Avellino 炉改修発表（2025/9/18）', url: 'https://www.aurubis.com/en/media/press-releases/press-releases-2025/aurubis-upgrades-shaft-furnace-at-avellino-site-to-boost-copper-wire-rod-production' }],
        labelOffset: [12, 24],
      },
      {
        id: 'cu-pori', name: 'Pori 圧延工場', country: 'フィンランド', coordinates: [21.86, 61.47],
        stage: 'fabrication', kind: '工場', status: '稼働',
        scale: { value: '記載なし', unit: 't-圧延製品/年', year: '2026年確認', basis: '非公表', scope: '確認した公式拠点一覧に当工場の年間生産量・設備能力の記載なし' },
        note: '銅・銅合金の板・条などを建築・土木向けに加工。線材とは製品と単位の意味が異なります。',
        sources: [aurubisSites], labelOffset: [12, -8],
      },
    ],
    links: [
      {
        id: 'cu-kennecott-integrated', from: 'cu-kennecott-mine', to: 'cu-kennecott-refinery',
        label: '統合操業内の処理', year: '2026年確認',
        evidence: 'Rio Tinto は採掘・選鉱・製錬・精製の統合操業を説明し、坑内採掘した鉱石をKennecottの既存施設で処理すると明記。契約数量・移送量は示さない。線は施設間の概略接続で輸送経路ではない。',
        sources: [kennecott],
      },
    ],
  },
  {
    id: 'steel', label: '鉄鋼', shortLabel: '鉄鋼',
    scope: '原料・製鉄工程・需要の代表8地点。鉱山群の集計、個別製鉄所、国全体の需要を区別して表示します。高炉・転炉に加え、スクラップを使う電炉への計画を例示。世界の全施設・取引は網羅しません。',
    stages: [
      { id: 'raw-materials', label: '原料', note: '鉄鉱石・原料炭から高炉へ、スクラップから電炉へ。原料集積と再生原料処理の代表例。' },
      { id: 'steelmaking', label: '製鉄工程', note: '製銑・製鋼・鋳造・圧延。高炉・転炉とスクラップ電炉の経路があり、すべての地点が同じ工程を持つわけではありません。' },
      { id: 'demand', label: '需要地', note: '国別の鋼材見掛消費と、製造元が確認できる利用事例。見掛消費は最終需要を直接測った値ではありません。' },
    ],
    sites: [
      {
        id: 'steel-waio', name: 'Pilbara・WAIO 鉱山群', country: 'オーストラリア', coordinates: [119.50, -22.70],
        stage: 'raw-materials', kind: '地域', status: '地域集計',
        scale: { value: '291', unit: '百万t-鉄鉱石', year: 'FY2026（2025/7–2026/6）', basis: '生産実績', scope: 'BHP Western Australia Iron Ore の全操業100%ベース。Pilbara地域全体や単一鉱山の量ではない' },
        note: '複数の採掘・処理拠点と鉄道・港湾を持つ鉱山群の代表位置。鉄鉱石の質量であり、粗鋼や鋼材需要量とは比較できません。',
        sources: [bhpReview, { label: 'BHP — Western Australia（WAIOの地理的範囲）', url: 'https://www.bhp.com/what-we-do/global-locations/australia/western-australia' }],
        labelOffset: [12, 18],
      },
      {
        id: 'steel-rohtak', name: 'Rohtak スクラップ処理', country: 'インド', coordinates: [76.69, 28.85],
        stage: 'raw-materials', kind: '工場', status: '稼働',
        scale: { value: '記載なし', unit: 't-スクラップ/年', year: 'FY2024–25資料', basis: '非公表', scope: '確認した年次報告の当該工程説明には、当工場の処理量・能力の記載なし' },
        note: '回収鉄スクラップを製鋼原料にする再生拠点。年次報告はLudhiana電炉への供給予定を示すが、稼働中の供給として線を引きません。',
        sources: [tataManufacturing], labelOffset: [-170, -12],
      },
      {
        id: 'steel-kalinganagar', name: 'Kalinganagar 製鉄所', country: 'インド', coordinates: [86.02, 20.93],
        stage: 'steelmaking', kind: '工場', status: '稼働',
        scale: { value: '8', unit: '百万t-粗鋼/年', year: 'FY2024–25資料', basis: '設備能力', scope: '第2期拡張後の能力。新高炉は2024年9月稼働、資料時点で立上げ中。8百万tを実績量としない' },
        note: '高炉・転炉と圧延を持つ製鉄所。3→8百万t/年への拡張を掲載。インド全体やTata Steel全社の能力ではありません。',
        sources: [tataManufacturing], labelOffset: [12, 27],
      },
      {
        id: 'steel-ludhiana', name: 'Ludhiana 電炉計画', country: 'インド', coordinates: [75.95, 30.84],
        stage: 'steelmaking', kind: '工場', status: '計画',
        scale: { value: '0.75', unit: '百万t-粗鋼/年', year: 'FY2024–25計画', basis: '設備能力', scope: '年次報告掲載のスクラップ電炉計画能力。稼働実績や現在の稼働判定には用いない' },
        note: 'スクラップを主原料とする電炉の計画例。状態は2024–25年次報告時点。完成後の実績は本パイロットの確認範囲外。',
        sources: [tataManufacturing], labelOffset: [12, -26],
      },
      {
        id: 'steel-ghent', name: 'Ghent 一貫製鉄所', country: 'ベルギー', coordinates: [3.81, 51.18],
        stage: 'steelmaking', kind: '工場', status: '稼働',
        scale: { value: '記載なし', unit: 't-粗鋼/年', year: '2026年確認', basis: '非公表', scope: '確認資料の年500万t出荷はベルギー4拠点の全体値のため、Ghent単独の数量として使用しない' },
        note: '鉄鉱石・石炭の受入から高炉・転炉・圧延までを持つ工場。製品用途まで確認できる代表事例を接続。',
        sources: [ghentProcess, { label: 'ArcelorMittal Belgium — About us（4拠点の範囲）', url: 'https://belgium.arcelormittal.com/en/who-we-are' }],
        labelOffset: [-150, -12],
      },
      {
        id: 'steel-china-demand', name: '中国・鋼材需要', country: '中国', coordinates: [104.00, 35.50],
        stage: 'demand', kind: '需要地', status: '地域集計',
        scale: { value: '856.6', unit: '百万t-鋼材', year: '2024', basis: '需要実績', scope: '中国全体の鋼材見掛消費。特定工場・都市や粗鋼生産、会社世界シェアの値ではない' },
        note: '国全体の集計を代表位置に表示。見掛消費は鋼材の生産・貿易から把握する指標で、ここへの個別の供給元は特定しません。',
        sources: [steelUse], labelOffset: [12, -10],
      },
      {
        id: 'steel-india-demand', name: 'インド・鋼材需要', country: 'インド', coordinates: [78.00, 22.00],
        stage: 'demand', kind: '需要地', status: '地域集計',
        scale: { value: '147.9', unit: '百万t-鋼材', year: '2024', basis: '需要実績', scope: 'インド全体の鋼材見掛消費。特定都市の消費や国内企業だけの販売量ではない' },
        note: '国全体の集計を代表位置に表示。原料の鉄鉱石量・製鉄所の粗鋼能力とは指標の範囲が異なります。',
        sources: [steelUse], labelOffset: [-155, 25],
      },
      {
        id: 'steel-ghent-stadium', name: 'Ghent・スタジアム屋根', country: 'ベルギー', coordinates: [3.734, 51.017],
        stage: 'demand', kind: '需要地', status: '稼働',
        scale: { value: '記載なし', unit: 't-屋根鋼材', year: '納入年記載なし（2026年確認）', basis: '非公表', scope: '公式利用事例にスタジアム屋根材の重量の記載なし。隣接店舗の外壁面積は屋根材量に転用しない' },
        note: 'Artevelde Stadium（現Planet Group Arena）の屋根にGhent製の塗装鋼板。梁の製造地はルクセンブルクであり、屋根材と区別。',
        sources: [ghentStadium], labelOffset: [12, 20],
      },
    ],
    links: [
      {
        id: 'steel-ghent-roof', from: 'steel-ghent', to: 'steel-ghent-stadium', label: '製造元確認済み・屋根材',
        year: '納入年記載なし（2026年確認）',
        evidence: 'ArcelorMittal Belgium の公式利用事例は、スタジアム屋根に使用した塗装鋼板をGhentで製造したと明記。梁はルクセンブルク製。線は屋根材の製造元と利用先の接続のみを示し、取引量や実際の輸送経路は示さない。',
        sources: [ghentStadium],
      },
    ],
  },
];
