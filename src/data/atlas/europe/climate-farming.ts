export type ClimateFarmingReading = {
  heading: string;
  body: string;
  sources: { label: string; url: string }[];
};

// Sources reviewed 2026-09-30. These are explicitly located agricultural examples,
// not a spatial intersection of crop/livestock data with Köppen–Geiger classes.
// Country statistics must not be presented as observations around the selected city.
export const climateFarming: Record<string, ClimateFarmingReading> = {
  Cfb: {
    heading: '農畜産物の例：イングランドの小麦・酪農',
    body: 'イングランド東部では小麦・大麦の栽培が多く、西部では乳牛や肉牛、羊の飼養が目立ちます。東部の比較的乾いた低地は穀物の畑作、西部の湿った高地・丘陵は牧草地に向き、土地利用の違いを支えます。',
    sources: [{ label: '英国Defra：イングランド地域別の作物・家畜（2024年）', url: 'https://www.gov.uk/government/statistics/agricultural-facts-england-regional-profiles/agricultural-facts-summary' }],
  },
  Cfa: {
    heading: '農畜産物の例：セルビアの穀物・養豚',
    body: 'ベルグラードのあるセルビアでは、トウモロコシ・小麦・ヒマワリ・大豆などを栽培しています。北部のヴォイヴォディナでは、豚の飼養も多く見られます。',
    sources: [{ label: 'セルビア統計局：地域別の農業（2024年、32〜33頁）', url: 'https://publikacije.stat.gov.rs/G2025/PdfE/G202526001.pdf#page=33' }],
  },
  Csa: {
    heading: '農畜産物の例：地中海沿岸のオリーブ・ブドウ',
    body: 'EUの地中海沿岸諸国にはオリーブ畑が広がり、イタリアやスペインではワイン用ブドウも栽培されています。地中海周辺では、パスタなどに使うデュラム小麦も特徴的です。',
    sources: [
      { label: '欧州委員会：EUのオリーブ栽培', url: 'https://agriculture.ec.europa.eu/farming/crops/olive-oil_en' },
      { label: 'Eurostat：イタリア・スペインなどのワイン生産', url: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20231116-1' },
      { label: 'Eurostat：地中海周辺のデュラム小麦', url: 'https://ec.europa.eu/eurostat/web/interactive-publications/regions-2023' },
    ],
  },
  Csb: {
    heading: '農畜産物の例：ポルトガルのブドウ・畜産',
    body: 'ポルトガルでは、ワイン用ブドウ、オリーブ、野菜・果実の生産に加え、豚肉や鶏肉の生産も行われています。ここではリスボン周辺に限らず、全国の農業の例を紹介しています。',
    sources: [{ label: '欧州委員会：ポルトガルの農業の概要', url: 'https://agriculture.ec.europa.eu/cap-my-country/cap-strategic-plans/portugal_en' }],
  },
  Dfa: {
    heading: '農畜産物の例：ハンガリーの穀物・油料作物',
    body: 'ブダペストのあるハンガリーでは、小麦・トウモロコシに加え、油の原料となるヒマワリや菜種が栽培されています。同国の2024年の統計では、降水不足や夏の干ばつが収穫に影響したことも報告されています。',
    sources: [{ label: 'ハンガリー中央統計局：農業生産の概況（2024年）', url: 'https://www.ksh.hu/en/first-releases/mgt/emgt24.html' }],
  },
  Dfb: {
    heading: '農畜産物の例：フィンランドの大麦・オート麦・酪農',
    body: 'フィンランドでは大麦・オート麦が栽培され、牛乳を生産する酪農も行われています。大麦は家畜の餌やビールなどの醸造に、オート麦は食用や家畜の餌に使われます。',
    sources: [
      { label: 'Eurostat：地域別の大麦・オート麦と用途', url: 'https://ec.europa.eu/eurostat/web/interactive-publications/regions-2023' },
      { label: 'フィンランド自然資源研究所：地域別の牛乳生産（2024年）', url: 'https://www.luke.fi/en/statistics/milk-and-milkproducts-statistics/milk-production-by-area-2024' },
    ],
  },
  BSk: {
    heading: '農畜産物の例：マドリード州の麦・果樹・家畜',
    body: 'マドリード州では、大麦・小麦、オリーブ、ブドウの栽培と、乳用・肉用の牛や羊の飼養が行われています。雨水に頼る農地が多く、河川沿いには水路などで水を引く灌漑農地もあります。ここでは市街地より広い州内の農業を紹介しています。',
    sources: [{ label: 'マドリード州公報：州の農業・畜産と土地利用（2020年、2015〜16年の統計）', url: 'https://www.comunidad.madrid/transparencia/sites/default/files/plan/document/bocm-20201216-26.pdf#page=73' }],
  },
};

// No cityClass is recorded for these two observation points. Do not infer a
// neighbouring class: present sourced national examples and the missing class.
export const cityFarming: Record<string, ClimateFarmingReading> = {
  athens: {
    heading: '農畜産物の例：ギリシャのオリーブ・羊乳チーズ',
    body: 'ギリシャ国内の例として、オリーブの栽培と、羊の乳を主原料とするフェタチーズづくりが挙げられます。フェタにはヤギの乳を混ぜることもあります。ここではアテネ市内に限らず、国内や指定生産地域の農業を紹介しています。',
    sources: [
      { label: '欧州委員会：地中海諸国のオリーブ栽培', url: 'https://agriculture.ec.europa.eu/farming/crops/olive-oil_en' },
      { label: '欧州委員会：フェタの原料となる羊乳・ヤギ乳', url: 'https://agriculture.ec.europa.eu/farming/geographical-indications-and-quality-schemes/geographical-indications-food-and-drink/feta-pdo_en' },
    ],
  },
  reykjavik: {
    heading: '農畜産物の例：アイスランドの酪農・羊肉',
    body: 'アイスランドでは酪農と羊の飼養が農業の主要な部門で、牛乳や羊肉を生産しています。ここではレイキャビク市内に限らず、国内の農業を紹介しています。',
    sources: [
      { label: 'アイスランド統計局：酪農・羊飼養の経済的位置（2022年）', url: 'https://www.statice.is/publications/news-archive/agriculture/income-statement-and-balance-sheet-for-agriculture-2022/' },
      { label: 'アイスランド統計局：食肉生産（2024年）', url: 'https://old.statice.is/publications/news-archive/agriculture/meat-production-2024/' },
    ],
  },
};
