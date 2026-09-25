import type { LatinTopic } from './latin-america-types';

// Locations identify named examples; extents are reading viewports, not production boundaries.
const pam = 'https://biblioteca.ibge.gov.br/visualizacao/periodicos/66/pam_2023_v50_br_informativo.pdf';
const farming = 'https://www.fao.org/4/y1860e/y1860e09.htm';
const chileMinerals = 'https://www.usgs.gov/centers/national-minerals-information-center/chile';
const brazilMinerals = 'https://www.usgs.gov/centers/national-minerals-information-center/brazil';
const chileFruit = 'https://www.odepa.gob.cl/publicaciones/boletines/boletin-de-fruta-mayo-2025';
const forest = 'https://biblioteca.ibge.gov.br/visualizacao/periodicos/74/pevs_2023_v38_informativo.pdf';
const industry = 'https://agenciadenoticias.ibge.gov.br/en/agencia-news/2184-news-agency/news/43813-employment-in-industry-grows-for-the-fourth-consecutive-year-in-2023-but-drops-3-1-in-ten-years';
const energy = 'https://www.eia.gov/international/content/analysis/countries_long/Brazil/';
const canal = 'https://pancanal.com/en/the-canals-fy-2024-financial-results-reaffirm-its-focus-on-sustainability-and-vision-for-the-future/';

export const latinEconomyTopics: LatinTopic[] = [
  {
    id: 'cerrado-soy', field: 'agriculture', title: 'セラードの大豆農業', label: '大豆',
    summary: 'ブラジル中西部の大規模畑作。熱帯の土壌を改良し、穀物産地と輸出港を結ぶ。',
    countries: ['BRA'], location: [-55.71, -12.54], extent: [-62, -24, -43, -5],
    placeLabel: '代表地点：ソヒーゾ（マトグロッソ州）。州全体・セラード全域を示す境界ではない。',
    sections: [
      { title: 'どこに広がる？', body: '中西部のマトグロッソ州やゴイアス州を中心に大豆の大規模栽培が展開する。南部のパラナ州も重要で、ブラジルの大豆をセラードだけで説明することはできない。' },
      { title: 'なぜ栽培できる？', body: 'セラードの土壌は強い酸性や養分不足が制約となる。石灰などによる土壌改良と施肥が栽培を支えた。自然条件に加えて農業技術が生産地域を変えた例として読む。' },
      { title: '輸出までを見る', body: '大豆は食用油と搾油後の飼料原料に結びつく。内陸では収穫量だけでなく港までの輸送が重要で、IBGEの2023年報告も港のトラック待ちなど物流問題を記録している。' },
    ], relatedIds: ['cerrado', 'brazil-second-maize', 'pampas-farming'],
    sources: [{ label: 'IBGE・市町村農業生産調査 PAM 2023（大豆）', url: pam, period: '2023年、2024年公表' }, { label: 'Embrapa・セラード土壌の改良と大豆施肥', url: 'https://www.embrapa.br/en/busca-de-publicacoes/-/publicacao/551684/correcao-do-solo-e-adubacao-da-cultura-da-soja', period: '土壌条件の基礎資料、2026年9月確認' }],
    stats: [{ label: 'マトグロッソ州の大豆生産', value: 44.4, unit: '百万t', year: '2023', scope: 'マトグロッソ州の年間収穫量。図の代表地点の生産量ではない。', sourceUrl: pam }],
  },
  {
    id: 'brazil-second-maize', field: 'agriculture', title: '大豆の後に育てる第2作トウモロコシ', label: '二期作',
    summary: '雨季の大豆と、その収穫後のトウモロコシ。作付けの時期が収量を左右する。',
    countries: ['BRA'], location: [-50.93, -17.79], extent: [-61, -25, -44, -9],
    placeLabel: '代表地点：リオベルデ（ゴイアス州）。周囲の農地分布を概括する学習地点。',
    sections: [
      { title: '大豆と同じ畑を利用', body: '中西部とパラナ州では、夏作の大豆を収穫した後にトウモロコシを植える第2作が重要である。土地を一年に複数回使い、同じ生産地域で異なる作物を組み合わせる。' },
      { title: '雨季の終わりとの競争', body: '適期に播種できるかが収穫に影響する。早生品種などの技術と天候が作付けを支え、乾季までにどこまで生育できるかが大切になる。' },
      { title: '数値から位置づける', body: '2023年にはブラジルのトウモロコシ収穫の約8割が第2作だった。穀物の用途を考える際は、人の食料だけでなく畜産用飼料や輸出とのつながりも見る。' },
    ], relatedIds: ['cerrado-soy', 'cerrado'],
    sources: [{ label: 'IBGE・PAM 2023（トウモロコシ、第2作）', url: pam, period: '2023年、2024年公表' }],
    stats: [{ label: '第2作の生産割合', value: 79.1, unit: '%', year: '2023', scope: 'ブラジル全国のトウモロコシ生産量に占める第2作の割合。', sourceUrl: pam }, { label: '第2作トウモロコシ生産', value: 104.3, unit: '百万t', year: '2023', scope: 'ブラジル全国。第1作を含まない。', sourceUrl: pam }],
  },
  {
    id: 'brazil-coffee', field: 'agriculture', title: 'ブラジル高原のコーヒー', label: 'ブラジルのコーヒー',
    summary: 'ミナスジェライス州のアラビカ種と、より低い土地のカネフォラ種を比べる。',
    countries: ['BRA'], location: [-45.43, -21.55], extent: [-53, -25, -37, -14],
    placeLabel: '代表地点：バルジーニャ（ミナスジェライス州南部）。',
    sections: [
      { title: '高原と低地の違い', body: 'アラビカ種はミナスジェライス州やサンパウロ州などの高い土地が重要である。一方、カネフォラ種はエスピリトサント州やロンドニア州などにも産地があり、種類によって分布が違う。' },
      { title: '年ごとに変わる収穫', body: '開花期の雨、干ばつや低温の影響に加え、コーヒーには収量の多い年と少ない年が交互に現れる性質がある。単年の全国生産量だけで栽培条件を判断しない。' },
      { title: '比率の分母に注意', body: '下の72.5%はブラジルのアラビカ種に対する州の割合である。全品種のコーヒー生産や世界全体に占める割合ではない。' },
    ], relatedIds: ['colombia-coffee', 'central-coffee', 'brazil-southeast'],
    sources: [{ label: 'IBGE・PAM 2023（コーヒーの品種別・州別分布）', url: pam, period: '2023年、2024年公表' }],
    stats: [{ label: 'ミナスジェライス州の割合', value: 72.5, unit: '%', year: '2023', scope: 'ブラジル全国のアラビカ種コーヒー生産量に占める割合。', sourceUrl: pam }],
  },
  {
    id: 'colombia-coffee', field: 'agriculture', title: 'コロンビアの山地コーヒー', label: '山地のコーヒー',
    summary: 'アンデスの斜面に小区画の農園が連なる。栽培と集落が一体になった景観。',
    countries: ['COL'], location: [-75.69, 4.81], extent: [-79, 0, -71, 9],
    placeLabel: '代表地点：ペレイラ（リサラルダ県）。コーヒー文化的景観の一部を読む地点。',
    sections: [
      { title: 'どこで育てる？', body: '西部アンデスの山麓や斜面にコーヒー農園が分布する。カルダス、キンディオ、リサラルダなどのコーヒー地帯では、小区画の家族経営と丘上の集落が特徴となる。' },
      { title: '大平原の農業と比べる', body: '険しい地形に適応した土地利用は、広い平地の大規模穀物栽培とは異なる。農園、加工、集落の生活が結びつき、ユネスコの文化的景観にも登録されている。' },
      { title: '全国生産と地域の景観', body: '2024年の全国生産は生豆1,400万袋、輸出は1,230万袋だった。いずれも1袋60kgの集計であり、文化的景観の登録区域だけの数値ではない。' },
    ], relatedIds: ['andes', 'brazil-coffee', 'central-coffee'],
    sources: [{ label: 'UNESCO・コロンビアのコーヒー文化的景観', url: 'https://whc.unesco.org/en/list/1121', period: '2011年登録・景観解説' }, { label: 'コロンビアコーヒー生産者連合 FNC・年次報告2024', url: 'https://federaciondecafeteros.org/app/uploads/2025/06/Informe-de-Gestion-FNC-2024.pdf', period: '2024年、2025年公表' }],
    stats: [{ label: 'コーヒー生豆の生産', value: 14, unit: '百万袋（60kg/袋）', year: '2024', scope: 'コロンビア全国。FNC年次報告の丸め値。', sourceUrl: 'https://federaciondecafeteros.org/app/uploads/2025/06/Informe-de-Gestion-FNC-2024.pdf' }],
  },
  {
    id: 'brazil-sugar', field: 'agriculture', title: 'サトウキビから砂糖・燃料へ', label: 'サトウキビ',
    summary: '農業と加工業が近接するサトウキビ産地。砂糖とエタノールの両方につながる。',
    countries: ['BRA'], location: [-47.81, -21.18], extent: [-55, -26, -42, -15],
    placeLabel: '代表地点：リベイランプレト（サンパウロ州）。',
    sections: [
      { title: '主要な産地', body: 'サンパウロ州を中心とする南東部は重要なサトウキビ産地で、栽培は中西部にも広がる。ブラジル北東部にも歴史の長い砂糖生産地域があり、全国が均一な産地ではない。' },
      { title: '収穫物を加工する', body: 'サトウキビは砂糖だけでなく燃料用エタノールの原料となる。製糖・燃料製造を含む地域産業として見ると、畑と加工施設の立地が結びついていることが分かる。' },
      { title: '統計の期間をそろえる', body: 'CONABの2023/24年度の収穫量は7億1,320万t。暦年で集計するIBGEの値とは対象期間が異なるため、そのまま増減比較しない。' },
    ], relatedIds: ['brazil-manufacturing', 'brazil-southeast', 'atlantic-oil'],
    sources: [{ label: 'ブラジル政府・CONAB 2023/24サトウキビ収穫結果', url: 'https://agenciagov.ebc.com.br/noticias/202404/producao-de-cana-de-acucar-na-safra-2023-24-chega-a-713-2-milhoes-de-toneladas-a-maior-da-serie-historica', period: '2023/24収穫年度、2024年4月公表' }, { label: 'EIA・ブラジルのエネルギー（バイオ燃料）', url: energy, period: '2023年国別分析' }],
    stats: [{ label: 'サトウキビ収穫量', value: 713.2, unit: '百万t', year: '2023/24収穫年度', scope: 'ブラジル全国、CONAB集計。砂糖・エタノールの製品重量ではない。', sourceUrl: 'https://agenciagov.ebc.com.br/noticias/202404/producao-de-cana-de-acucar-na-safra-2023-24-chega-a-713-2-milhoes-de-toneladas-a-maior-da-serie-historica' }],
  },
  {
    id: 'pampas-farming', field: 'agriculture', title: 'パンパの穀物と牧畜', label: '穀物・牧畜',
    summary: '温帯草原を利用する小麦・トウモロコシ・大豆と牛の飼育。',
    countries: ['ARG', 'URY'], location: [-60.57, -33.89], extent: [-66, -40, -54, -29],
    placeLabel: '代表地点：ペルガミーノ（アルゼンチン、ブエノスアイレス州）。',
    sections: [
      { title: '平原の中にも違いがある', body: 'アルゼンチン中東部では温帯の草原が畑作と放牧に利用される。湿潤な地域、排水の悪い低地、より乾いた西側では、作物と家畜の組み合わせが変わる。' },
      { title: '穀物と家畜を結びつける', body: '小麦、トウモロコシ、大豆、ヒマワリなどの畑作と牛の飼育が重要である。肥沃な土壌だけでなく、降水量や排水、飼料と牧草の確保が利用方法を左右する。' },
      { title: '都市・港と結びつく農業', body: '生産地はブエノスアイレスやモンテビデオの食料需要とも結びつく。内陸の生産地域とラプラタ川水系・大西洋岸の都市を合わせて見ると、農業と人口の分布を比較できる。' },
    ], relatedIds: ['pampas', 'rio-plata-cities', 'cerrado-soy'],
    sources: [{ label: 'FAO・Grasslands of the World（パンパの草地と利用）', url: 'https://www.fao.org/4/y8344e/y8344e0i.htm', period: '2005年：地理的・農業的背景資料' }, { label: 'FAO・Farming Systems and Poverty（温帯混合農業）', url: farming, period: '2001年：農業体系の背景資料、現況統計には不使用' }],
  },
  {
    id: 'chile-fruit', field: 'agriculture', title: 'チリ中央部の果樹・ぶどう', label: '果樹・ぶどう',
    summary: '中央部の谷に集まる果樹栽培。灌漑と南半球の季節が市場との関係をつくる。',
    countries: ['CHL'], location: [-71.65, -35.43], extent: [-74, -40, -69, -29],
    placeLabel: '代表地点：タルカ（マウレ州）。',
    sections: [
      { title: '中央部に集中する', body: 'オイギンス州とマウレ州が果樹栽培の中心で、両州だけで2024年の全国果樹面積の約半分を占める。さらに北のコキンボ、バルパライソや南の州にも産地が続く。' },
      { title: '水と季節を生かす', body: '中央部の果樹やぶどう栽培では灌漑が重要である。南半球の収穫期は北半球とずれるため、生鮮果実を季節の違う市場に供給できる。水の確保と輸送を合わせて考える。' },
      { title: '果樹とワインを区別する', body: '下の値はODEPAの果樹面積であり、ワイン用ぶどう畑を含む全農地の面積ではない。2025年5月版は地域調査の更新を反映しており、同年1月の速報値と異なる。' },
    ], relatedIds: ['chile-mediterranean', 'andes', 'andean-copper'],
    sources: [{ label: 'チリ農業省 ODEPA・果実月報2025年5月', url: chileFruit, period: '2024年の果樹面積、2025年5月更新' }, { label: 'FAO・灌漑農業と南半球の果実輸出', url: farming, period: '2001年：農業体系の背景資料' }],
    stats: [{ label: 'オイギンス州の果樹面積割合', value: 25.84, unit: '%', year: '2024', scope: '全国果樹面積386,573haを分母とする。', sourceUrl: chileFruit }, { label: 'マウレ州の果樹面積割合', value: 25.2, unit: '%', year: '2024', scope: '全国果樹面積386,573haを分母とする。', sourceUrl: chileFruit }],
  },
  {
    id: 'andean-farming', field: 'agriculture', title: 'アンデスの標高別農業', label: '標高と農業',
    summary: '谷のトウモロコシ、高地のジャガイモやキヌア。高度差を利用する農業。',
    countries: ['PER', 'BOL'], location: [-71.98, -13.53], extent: [-76, -21, -65, -10],
    placeLabel: '代表地点：クスコ（ペルー）。具体的な標高帯はFAOのペルー農業遺産地域の例。',
    sections: [
      { title: '高さによって変わる作物', body: 'FAOが紹介するペルーの農業遺産地域では、トウモロコシは約2,800〜3,300m、ジャガイモは約3,300〜3,800m、その上ではキヌア類と家畜が組み合わされる。アンデス全域に同じ境界線があるわけではない。' },
      { title: '斜面と水を管理する', body: '段々畑で斜面を耕作地に変え、盛り土畑や小さな貯水池を利用する。品種の選択、輪作、灌漑など、地域に蓄積された知識が寒冷な高地での暮らしを支える。' },
      { title: '食料と文化の両方', body: '在来作物と家畜は地域の食生活に重要で、乾燥ジャガイモのような保存方法もある。農業を見る際は輸出額だけでなく、自家消費、品種の多様性、知識の継承にも目を向ける。' },
    ], relatedIds: ['andes', 'andean-highlands', 'colombia-coffee'],
    sources: [{ label: 'FAO・世界農業遺産：ペルーのアンデス農業', url: 'https://www.fao.org/giahs/giahs-around-the-world/peru-andean-agriculture/20th-anniversary-celebrations-of-the-globally-important-agricultural-heritage-systems-%28giahs%29-programme/en', period: '2011年認定・農法と標高帯の解説' }],
  },
  {
    id: 'tropical-bananas', field: 'agriculture', title: '熱帯低地のバナナと輸出', label: 'バナナ',
    summary: 'エクアドルと中米の輸出型農業。暖かい低地と海外市場がつながる。',
    countries: ['ECU', 'GTM', 'CRI', 'COL', 'HND', 'PAN'], location: [-83.04, 9.99], extent: [-93, -5, -74, 18],
    placeLabel: '代表地点：リモン（コスタリカ、カリブ海岸の港）。主要輸出国は本文で区別。',
    sections: [
      { title: 'どの国が輸出する？', body: 'エクアドル、グアテマラ、コスタリカ、コロンビアなどが重要な供給国である。熱帯の農業でも、高地のコーヒーと低地のバナナでは土地利用の条件が異なる。' },
      { title: '港までが産業の一部', body: '生鮮果実は収穫後の品質管理と輸送が欠かせない。栽培だけでなく選果・包装・港への輸送まで含めて、生産地が海外市場とどう結ばれるかを考える。' },
      { title: '量の大きさと不安定さ', body: 'FAOは2024年の貿易に対し悪天候や病害の影響を指摘している。下の貿易統計は食用バナナだけでなくプランテン、生鮮・乾燥品を含む分類であり、生産量とは異なる。' },
    ], relatedIds: ['central-coffee', 'caribbean', 'panama-logistics'],
    sources: [{ label: 'OECD–FAO・農業見通し2025–2034（バナナの2024年市場動向）', url: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/07/oecd-fao-agricultural-outlook-2025-2034_3eb15914/601276cd-en.pdf', period: '2024年の市場動向、2025年7月公表' }, { label: 'World Bank WITS・バナナ等の輸出（HS 080300）', url: 'https://wits.worldbank.org/trade/comtrade/en/country/ALL/year/2024/tradeflow/Exports/partner/WLD/product/080300', period: '2024年、UN Comtrade報告値' }],
    stats: [{ label: 'エクアドルのバナナ等輸出', value: 6198210, unit: 't', year: '2024', scope: 'HS 080300：プランテン・乾燥品を含む。報告値6,198,210,000kgをt換算。', sourceUrl: 'https://wits.worldbank.org/trade/comtrade/en/country/ALL/year/2024/tradeflow/Exports/partner/WLD/product/080300' }],
  },
  {
    id: 'central-coffee', field: 'agriculture', title: '中米の高地コーヒー', label: '中米のコーヒー',
    summary: 'グアテマラやホンジュラスの山地。標高・日陰・品種の組み合わせで品質をつくる。',
    countries: ['GTM', 'HND', 'CRI'], location: [-90.73, 14.56], extent: [-93, 8, -82, 18],
    placeLabel: '代表地点：アンティグア（グアテマラ）。全産地を一つの点に集約したものではない。',
    sections: [
      { title: '小地域ごとの個性', body: 'グアテマラではアンティグア、アティトラン、ウェウェテナンゴなどを産地として区別する。山地では近い場所でも標高や湿り方が変わり、産地名と品質を結びつけた販売が行われる。' },
      { title: '樹木と一緒に栽培する', body: 'ホンジュラスのIHCAFEは、日陰を作る樹木とコーヒーを組み合わせる栽培を解説している。適した品種は標高や湿度、病害の条件によって変わり、高ければ無条件に適地になるわけではない。' },
      { title: '低地農業と比較する', body: '中米の農業を一種類のプランテーションとして捉えず、高地のコーヒー、低地の輸出果実、トウモロコシ・豆類の食料生産を比較すると、地形と生活の関係が見える。' },
    ], relatedIds: ['tropical-bananas', 'central-american-corridor', 'colombia-coffee'],
    sources: [{ label: 'Anacafé・グアテマラのコーヒー地域区分', url: 'https://www.anacafe.org/articles/estrategia-de-microregionalizacion-a-rainbow-of-choices/', period: '2020年11月20日' }, { label: 'IHCAFE・樹木の日陰を利用するコーヒー栽培', url: 'https://www.ihcafe.hn/?mdocs-file=4281', period: '栽培技術の基礎資料' }, { label: 'FAO・中米のトウモロコシ・豆類農業体系', url: farming, period: '2001年：農業体系の背景資料' }],
  },
  {
    id: 'planted-forests', field: 'agriculture', title: '人工林とパルプ産業', label: '人工林',
    summary: 'ユーカリ・マツの計画栽培。天然林の伐採と、人工林からの木材生産を区別する。',
    countries: ['BRA'], location: [-51.68, -20.79], extent: [-58, -33, -38, -14],
    placeLabel: '代表地点：トレスラゴアス（マトグロッソドスル州）。人工林地域の一例。',
    sections: [
      { title: '木材の生産方法を分ける', body: 'ブラジルの林業には天然の植生から採取する活動と、植えて育てた林を収穫する活動がある。人工林面積をアマゾンの天然林面積と読み替えてはいけない。' },
      { title: 'ユーカリとマツ', body: 'IBGEによる2023年の人工林は970万haで、ユーカリが78.1%、マツが18.2%を占めた。ユーカリは紙・パルプ産業と強く結びつく。' },
      { title: '資源と工業をつなぐ', body: '林木を継続的に生産する土地と木材を加工する施設を合わせて見ると、農林業と工業のつながりが分かる。調査機関で人工林の定義や把握方法が異なるため、数字の比較には同じ統計系列を用いる。' },
    ], relatedIds: ['amazon', 'brazil-manufacturing', 'brazil-iron'],
    sources: [{ label: 'IBGE・PEVS 2023 概要資料', url: forest, period: '2023年、2024年公表' }, { label: 'パラナ州農務局・IBGE林業統計の解説', url: 'https://www.agricultura.pr.gov.br/Noticia/Com-protagonismo-da-erva-mate-Parana-e-destaque-nacional-na-producao-florestal', period: '2023年実績、2024年公表' }],
    stats: [{ label: '人工林面積', value: 9.7, unit: '百万ha', year: '2023', scope: 'ブラジル全国、IBGE PEVS。天然林を含まない。', sourceUrl: forest }, { label: 'ユーカリの面積割合', value: 78.1, unit: '%', year: '2023', scope: 'ブラジル全国の人工林面積を分母とする。', sourceUrl: forest }],
  },
  {
    id: 'andean-copper', field: 'industry', title: 'アンデスの銅鉱業', label: '銅',
    summary: 'チリ北部・ペルーの鉱業。鉱山、加工、太平洋側の港を結びつけて読む。',
    countries: ['CHL', 'PER'], location: [-68.93, -22.32], extent: [-79, -32, -65, -10],
    placeLabel: '代表地点：チュキカマタ周辺（チリ北部）。鉱山帯の一例。',
    sections: [
      { title: 'チリ北部の集中', body: 'チリの2024年の銅生産は約550万tで世界の24%。国内では北部アントファガスタ州に約57%が集中する。アンデスの鉱業は国全体に均等に広がっているわけではない。' },
      { title: '資源から製品まで', body: '銅は鉱石を掘った量と、含まれる銅の量、製錬後の量を分けて読む必要がある。地域の立地を考えるときは、鉱山に加えて加工施設と港を確認する。' },
      { title: '何とつながる？', body: '電線や電気機器に使う金属の供給地として、都市・工業地域の需要と結びつく。乾燥地域の大規模鉱業は、自然条件と産業の両方から読む題材となる。' },
    ], relatedIds: ['andes', 'atacama', 'lithium-salars'],
    sources: [{ label: 'USGS・チリ鉱業2024年報告', url: chileMinerals, period: '2024年実績、2026年資料' }, { label: 'USGS・Mineral Commodity Summaries 2026（銅）', url: 'https://pubs.usgs.gov/periodicals/mcs2026/mcs2026.pdf', period: '2024年実績・2025年推計を区別' }],
    stats: [{ label: 'チリの世界生産割合', value: 24, unit: '%', year: '2024', scope: '世界の鉱山銅生産に占めるチリの割合。製錬銅の割合ではない。', sourceUrl: chileMinerals }, { label: 'アントファガスタ州の国内割合', value: 57, unit: '%', year: '2024', scope: 'チリの銅精鉱・溶媒抽出生産に占める割合（概数）。', sourceUrl: chileMinerals }],
  },
  {
    id: 'lithium-salars', field: 'industry', title: '塩湖のリチウムと電池材料', label: 'リチウム',
    summary: 'アンデス高地の塩湖と、海岸側の化学工場。資源の存在と実際の生産を分ける。',
    countries: ['CHL', 'ARG', 'BOL'], location: [-68.3, -23.3], extent: [-71, -29, -64, -18],
    placeLabel: '代表地点：アタカマ塩湖（チリ）。「リチウム三角地帯」の概略範囲とは区別。',
    sections: [
      { title: '塩湖に含まれる資源', body: 'チリ、アルゼンチン、ボリビアの国境付近にはリチウムを含む塩湖が分布する。チリのアタカマ塩湖では、塩分の濃い地下水からリチウム原料を回収する。' },
      { title: '化学工業につながる', body: 'アタカマの原料はアントファガスタ周辺などで炭酸リチウムや水酸化リチウムへ加工され、充電式電池の材料となる。採取地点と加工地点は同じとは限らない。' },
      { title: '埋蔵量は生産量ではない', body: '資源が存在すること、経済的に採れる埋蔵量、ある年の実際の生産量は別の指標である。「三角地帯」の3か国が同じ規模で生産していると考えない。' },
    ], relatedIds: ['atacama', 'andes', 'andean-copper'],
    sources: [{ label: 'USGS・チリ鉱業2024年報告（リチウム）', url: chileMinerals, period: '2024年実績、2026年資料' }],
    stats: [{ label: 'チリのリチウム生産割合', value: 22, unit: '%', year: '2024', scope: '米国を除く世界のリチウム生産量に占めるチリの割合。USGS推計。', sourceUrl: chileMinerals }],
  },
  {
    id: 'brazil-iron', field: 'industry', title: 'ブラジルの鉄鉱石と輸出回廊', label: '鉄鉱石',
    summary: 'カラジャスとミナスジェライス。鉱山・鉄道・大西洋岸の港が一組になる。',
    countries: ['BRA'], location: [-50.1, -6.07], extent: [-57, -23, -38, 0],
    placeLabel: '代表地点：カラジャス（パラー州）。南東部の鉱山は本文と関連項目で比較。',
    sections: [
      { title: '二つの大きな産地', body: '北部パラー州のカラジャスと、南東部ミナスジェライス州を区別して位置を捉える。ブラジルは2024年に世界の鉄鉱石生産の17%を占めた。' },
      { title: '鉄道で海まで運ぶ', body: 'カラジャスの鉱山は鉄道でマラニョン州のポンタダマデイラ港へつながる。ミナスジェライス州側にはエスピリトサント州のツバロン港へ結ぶルートがある。' },
      { title: '鉱山と製鉄所は別', body: '鉱石を掘る産地、製鉄する場所、鋼材を使う工業地域は必ずしも一致しない。大量輸送を担う鉄道・港を地図で追うと、資源立地と工業立地を区別できる。' },
    ], relatedIds: ['amazon', 'brazil-manufacturing', 'brazil-southeast'],
    sources: [{ label: 'USGS・ブラジル鉱業2024年報告', url: brazilMinerals, period: '2024年実績、2026年資料' }, { label: 'Vale・鉄道と港の接続（運営者による説明）', url: 'https://www.vale.com/pt/logistica', period: '路線の地理的説明、2026年9月確認' }],
    stats: [{ label: '世界の鉄鉱石生産に占める割合', value: 17, unit: '%', year: '2024', scope: 'ブラジル全国。USGSによる世界生産割合の丸め値。鉄鋼生産の割合ではない。', sourceUrl: brazilMinerals }],
  },
  {
    id: 'brazil-manufacturing', field: 'industry', title: 'ブラジル南東部の工業集積', label: '南東部の工業',
    summary: '人口・市場と多様な工業が集まる南東部。鉱業だけでは説明できない産業構造。',
    countries: ['BRA'], location: [-46.55, -23.69], extent: [-52, -26, -39, -17],
    placeLabel: '代表地点：サンベルナルドドカンポ（サンパウロ都市圏）。',
    sections: [
      { title: '南東部への集中', body: 'サンパウロを含む南東部は人口と工業の集積が重なる地域である。IBGEの2023年工業調査では全国の工業変換価値の60.9%が南東部に集中した。' },
      { title: '加工する産業の幅', body: '全国では食品製造が工業の純売上高の23.6%を占め、自動車・トレーラー等も重要な分野となる。食品、素材、機械などを分けてみると、農業・鉱業と製造業の関係が見える。' },
      { title: '立地を考える視点', body: '人口が多い地域には消費市場、働く人、サービスも集まる。地図上で工業と都市の重なりを確認し、原料の産地だけでなく市場・交通との関係を考えてみよう。' },
    ], relatedIds: ['brazil-southeast', 'brazil-iron', 'brazil-sugar', 'hydropower'],
    sources: [{ label: 'IBGE・年次工業調査2023（地域別・産業別）', url: industry, period: '2023年実績、2025年公表' }],
    stats: [{ label: '南東部の工業変換価値の割合', value: 60.9, unit: '%', year: '2023', scope: 'IBGE年次工業調査の全国工業変換価値（VM/VTI）を分母とする。GDP比ではない。', sourceUrl: industry }],
  },
  {
    id: 'hydropower', field: 'industry', title: 'パラナ川の水力と送電', label: '水力発電',
    summary: 'ブラジルとパラグアイに電力を送るイタイプ。河川資源を国境を越えて利用する。',
    countries: ['BRA', 'PRY'], location: [-54.59, -25.41], extent: [-59, -29, -49, -20],
    placeLabel: '施設位置：イタイプ水力発電所（ブラジル・パラグアイ国境）。',
    sections: [
      { title: '国境の川を使う', body: 'イタイプはパラナ川にある両国共同の発電所で、発電した電力はブラジルとパラグアイへ供給される。水力は河川の流れを、送電網は遠くの需要地との距離をつなぐ。' },
      { title: '設備と発電量の違い', body: '設備容量は出せる電力の大きさ、年間発電量は実際に一年間につくった電力量である。20基・14,000MWの設備容量を、下の年間67,088GWhと混同しない。' },
      { title: '雨と産業の関係', body: '発電は水の状況と関係する。ブラジルの電力供給を考える際は、水力だけでなく風力・太陽光・火力との組み合わせを見る必要がある。' },
    ], relatedIds: ['pampas', 'brazil-manufacturing', 'rio-plata-cities'],
    sources: [{ label: 'Itaipu Binacional・2024年の発電とパラグアイ向け供給', url: 'https://www.itaipu.gov.py/noticias/energia/central-hidroelectrica-itaipu-suministro-20-383-gwh-de-energia-electrica-a-paraguay-en-el-2024', period: '2024年実績、2025年公表' }, { label: 'Itaipu in Numbers', url: 'https://www.itaipu.gov.br/wp-content/uploads/2025/11/brochure-itaipu-in-numbers-2023-2025.pdf', period: '2023〜2025年版' }, { label: 'EIA・ブラジルの電源構成', url: energy, period: '2023年国別分析' }],
    stats: [{ label: 'イタイプの年間発電量', value: 67088, unit: 'GWh', year: '2024', scope: '発電所全体の発電量。両国向け合計で、パラグアイだけへの供給量ではない。', sourceUrl: 'https://www.itaipu.gov.py/noticias/energia/central-hidroelectrica-itaipu-suministro-20-383-gwh-de-energia-electrica-a-paraguay-en-el-2024' }],
  },
  {
    id: 'atlantic-oil', field: 'industry', title: '大西洋沖の石油・ガス', label: '海底油田',
    summary: 'ブラジル南東部沖のサントス・カンポス盆地。深海開発と沿岸の産業がつながる。',
    countries: ['BRA'], location: [-42.7, -25.3], extent: [-48, -29, -37, -19],
    placeLabel: '代表地点：サントス盆地沖の概略位置。油田境界や個別の採掘設備の位置ではない。',
    sections: [
      { title: '陸の外にも資源がある', body: 'サントス盆地とカンポス盆地は、ブラジル南東部沖の重要な石油・ガス地域である。厚い塩の層より下にあるプレソルト資源の開発が生産拡大に結びついた。' },
      { title: '深海で採り、陸側で支える', body: '海上の生産には開発技術と大きな設備が必要で、沿岸の港や関連サービスと結びつく。鉱山と同じく、資源がある場所と加工・消費する場所を分けて読む。' },
      { title: 'エネルギーの組み合わせ', body: 'ブラジルには石油資源だけでなく水力やバイオ燃料もある。国のエネルギーを一つの資源で代表させず、発電、輸送用燃料、輸出の役割を区別して考える。' },
    ], relatedIds: ['brazil-southeast', 'brazil-manufacturing', 'hydropower', 'brazil-sugar'],
    sources: [{ label: 'EIA・ブラジル国別分析（石油・天然ガス）', url: energy, period: '2023年版：資源立地の説明に使用' }],
  },
  {
    id: 'panama-logistics', field: 'industry', title: 'パナマ運河と世界の物流', label: '運河・物流',
    summary: '太平洋と大西洋を結ぶ地峡。船の通航と淡水の確保が一つの仕組みになる。',
    countries: ['PAN'], location: [-79.68, 9.08], extent: [-81, 8, -78.5, 10],
    placeLabel: '代表地点：パナマ運河の中部。運河ルート全体の境界ではない。',
    sections: [
      { title: '地峡が交通路になる', body: 'パナマは大西洋側と太平洋側を運河で結び、船の航路を短縮する。運河周辺の交通は、一国内の移動だけでなく世界の貨物流動と結びついている。' },
      { title: '雨不足が通航に及ぼす影響', body: '2023〜2024年の干ばつでガトゥン湖などの水位が下がり、節水のため通航を調整した。2024会計年度の大型外航船通航は9,944回で、前年を21%下回った。' },
      { title: '貨物重量との混同を避ける', body: '通航回数、貨物の重さ、船の容積に基づく運河トン数は別の指標である。ここでは大型外航船の通航回数を用いる。小型船を含めた総通航回数とは比較対象をそろえる必要がある。' },
    ], relatedIds: ['panama-water', 'central-american-corridor', 'tropical-bananas'],
    sources: [{ label: 'パナマ運河庁・2024会計年度の運営結果', url: canal, period: '2024会計年度（2023年10月〜2024年9月）' }],
    stats: [{ label: '大型外航船の通航回数', value: 9944, unit: '回', year: '2024会計年度', scope: 'Deep-draft transits。小型船を含む総通航回数ではない。', sourceUrl: canal }],
  },
  {
    id: 'caribbean-tourism', field: 'industry', title: 'カリブ海の観光と沿岸地域', label: '観光',
    summary: '海岸・自然・文化を生かすサービス産業。島によって経済への比重が大きく違う。',
    countries: ['JAM', 'DOM', 'BHS', 'BRB', 'LCA'], location: [-77.92, 18.47], extent: [-85, 10, -58, 27],
    placeLabel: '代表地点：モンテゴベイ（ジャマイカ）。カリブ海全体の観光施設分布ではない。',
    sections: [
      { title: '海岸と交通を結ぶ', body: '海岸や自然景観、地域の文化が観光資源となり、宿泊、飲食、交通などの仕事が生まれる。国際航空やクルーズ船の到着地点と、滞在する地域との関係を見る。' },
      { title: '島ごとに異なる経済', body: '観光はカリブ海の重要な産業だが、全ての島で同じ比重ではない。来訪者が増えることと、地域の雇用や所得が安定することは分けて考える必要がある。' },
      { title: '自然環境が産業を支える', body: '海岸に立地する観光業はハリケーンの影響を受けやすい。海岸やサンゴ礁の保全、交通の回復力は、暮らしと観光収入の両方に関わる。' },
    ], relatedIds: ['caribbean', 'caribbean-societies', 'panama-logistics'],
    sources: [{ label: '世界銀行・Protecting Paradise（カリブ海の観光と災害）', url: 'https://documents1.worldbank.org/curated/en/099020325150023078/pdf/P179920-5559140c-60d0-4ee7-99c5-2ee3387b4068.pdf', period: '2025年報告' }, { label: '世界銀行・カリブ海観光における仕事の質', url: 'https://blogs.worldbank.org/en/latinamerica/beyond-the-beach--why-job-quality-in-caribbean-tourism-matters-m', period: '2025年解説' }],
  },
];
