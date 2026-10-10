import {africaBeverageLinks,africaBeverageNote} from './africa-beverage-belts.ts';
/**
 * Short reading paths through the existing Africa material.
 *
 * The seven original items use pinned 2020 SPAM / GLW distributions;
 * coffee and tea use independently authored belts from cited locality descriptions;
 * farming-system explanations reuse africa-reading.ts, africa-themes.ts and
 * africa-agriculture-reading.ts. FAO's 2001 background does not date the map or
 * establish present-day crop rankings. The original readings remain intact.
 */
export type AfricaAgricultureProduct = 'maize' | 'rice' | 'wheat' | 'cassava' | 'coffee' | 'tea' | 'cattle' | 'goats' | 'sheep';
export type AfricaAgricultureContext = {
  title: string;
  takeaway: string;
  paragraphs: string[];
  sourceLinks: {label: string; url: string}[];
};

const farming = {
  label: '営農の背景：FAO・アフリカの農業システム（2001）',
  url: 'https://www.fao.org/4/y1860e/y1860e04.htm',
};
const water = {
  label: '水利用の背景：FAO・灌漑と水管理（2001）',
  url: 'https://www.fao.org/4/y1860e/y1860e05.htm',
};
const crops = {
  label: '作物分布：IFPRI SPAM 2020 v2r2',
  url: 'https://doi.org/10.7910/DVN/SWPENT',
};
const livestock = {
  label: '家畜分布：FAO GLW4 2020',
  url: 'https://data.apps.fao.org/catalog/iso/9d1e149b-d63f-4213-978b-317a8eb42d02',
};

/** Keep this with the source/method supplement, rather than ahead of the reading. */
export const agricultureContextPeriodNote = africaBeverageNote+' 既存7品目の分布は2020年を基準とするSPAM・GLWのモデル推定です。営農の背景にはFAOの2001年資料を使い、現在の品目別生産順位や2020年の経済構成としては扱っていません。';

export const agricultureContextOverview: AfricaAgricultureContext & {statisticNote: string} = {
  title: '食用作物と家畜を、地域の組合せで読む',
  takeaway: 'ギニア湾岸とコンゴ盆地の食用作物、北部の小麦、東部高地とサヘルの農牧業を見比べます。',
  paragraphs: [
    'トウモロコシは西部・東部・南部、小麦は北西アフリカやナイル沿い・東部高地の分布に注目します。キャッサバは湾岸からコンゴ盆地周辺、米は西アフリカの沿岸・河川低地、ナイル沿い、マダガスカルなどで栽培され、主食として利用されます。',
    'コーヒーはエチオピア南西部・東部高地、コートジボワールやカメルーンの湿潤な産地に、茶はケニアの高地からウガンダ・ルワンダ、タンザニア・マラウイの高地に注目します。両品目の色は資料に記載された産地の概略帯です。',
    '東部高地とサヘルでは、穀物と家畜を組み合わせる営農があります。飼料・水・獣医療が飼養を支え、作物の貯蔵・加工や家畜の集乳・食肉市場への接続が、生産を食料と販売につなぎます。',
  ],
  sourceLinks: [farming, crops, livestock],
  statisticNote: '地図下の世界シェアは保持済みの2024年FAOSTAT地域・世界行から求めます。未取得の品目、域外貿易相手、カロリー構成、自給率は補作しません。国別の農林水産業GDP比とは別の指標です。',
};

export const agricultureProductContext: Record<AfricaAgricultureProduct, AfricaAgricultureContext> = {
  maize: {
    title: 'トウモロコシ：西部・東部・南部の栽培を読む',
    takeaway: '西部から東部・南部の分布を比べ、雨の季節と収穫を支える技術・流通を読みます。',
    paragraphs: [
      '2020年の分布では、ギニア湾岸側の地域、東部の高地周辺、南部の内陸に注目します。東部の高地は、穀物と家畜を組み合わせる営農を考える入口にもなります。',
      '生育期の雨と気温に加え、品種・施肥・灌漑が栽培を支えます。収穫を利用・販売につなぐ貯蔵や、市場までの交通も地域ごとの条件です。',
    ],
    sourceLinks: [crops, farming],
  },
  rice: {
    title: '米：西部・ナイル・マダガスカルの主食生産',
    takeaway: '米は西アフリカ、ナイル沿い、マダガスカルなどで生産され、都市と農村の主食を支えます。',
    paragraphs: [
      '西部では沿岸や河川の低地と内陸の天水栽培、北部ではナイルの灌漑、マダガスカルでは高地や低地の稲作を比べます。収穫後は精米して食用にし、国内市場へ供給します。需要と生産の差は輸入にもつながります。',
      '稲には低地の水田だけでなく雨水に頼る栽培もあります。水田整備、水の配分、労働に加え、精米や流通の仕組みが収穫後の利用と販売を支えます。',
    ],
    sourceLinks: [crops, farming, {label:'FAO：アフリカの米生産と栽培体系（背景資料）',url:'https://www.fao.org/4/x2243t/x2243t05.htm'}],
  },
  wheat: {
    title: '小麦：北部と東部高地の栽培条件',
    takeaway: '北西アフリカ、ナイル沿い、東部高地の分布を、涼しい生育期と水の利用から読みます。',
    paragraphs: [
      '2020年の分布では、北西アフリカ、ナイル下流域、エチオピア高原に注目します。高地の穀物と家畜の組合せや、ナイルの灌漑は、それぞれの営農を考える背景です。',
      '比較的涼しい生育期や高地の気温が栽培の条件です。播種時期・品種・灌漑に加え、製粉や市場への接続が収穫後の利用と販売を変えます。',
    ],
    sourceLinks: [crops, farming, water],
  },
  cassava: {
    title: 'キャッサバ：ギニア湾岸からコンゴ盆地へ',
    takeaway: '暖かい地域の分布を、食用作物の組合せと、収穫後の加工・輸送につないで読みます。',
    paragraphs: [
      '2020年の分布では、ギニア湾岸側からコンゴ盆地周辺にかけて注目します。湾岸では樹木作物と食用作物の組合せ、コンゴ盆地では農地利用と道路・市場への接続が背景になります。',
      '暖かい地域で育ち、乾燥に耐える性質もあります。病害対策、加工、収穫後の輸送によって利用・販売の条件が変わるため、雨量だけでは分布を説明できません。',
    ],
    sourceLinks: [crops, farming],
  },
  coffee: {
    title:'コーヒー：東部高地と西・中央部の湿潤産地',
    takeaway:'エチオピア南西部から東部の高地、コートジボワール・カメルーンの産地を見比べます。',
    paragraphs:['エチオピアの南西部・南部高地、ウガンダの中央部と山地、ケニア中央高地、タンザニアの北部・南部に産地があります。西部のコートジボワールではMan・Divo・Abengourouなど、中央部のカメルーンでは西部高地・Mungoなどの湿潤域を示します。ルワンダ・ブルンジの高地も見比べます。マダガスカル東岸は2000年の歴史資料を根拠とする概略です。','高地の比較的涼しい条件はアラビカの栽培を支え、暖かい湿潤域ではロブスタの栽培がみられます。雨の季節、土壌、品種、日陰や農園管理が重なり、同じ国でも産地は一様になりません。','収穫した果実は精製・乾燥して生豆にし、焙煎・飲料用に流通します。洗浄施設、品質管理、集荷、道路や港への接続が収穫後の利用と販売を支えます。'],
    sourceLinks:africaBeverageLinks('coffee'),
  },
  tea: {
    title:'茶：東部の高地と摘採・製茶・流通',
    takeaway:'ケニアのリフト谷東西の高地、ウガンダ・ルワンダ、タンザニア、マラウイの産地を見比べます。',
    paragraphs:['ケニアではKericho・Kisii・Nandi側とMount Kenya・Aberdare側の高地に茶産地があります。ウガンダ西部と中央部、ルワンダの北・西・南の高地、タンザニアの南部・北東部・北西部にも産地が分かれます。マラウイでは南東部のThyolo・Mulanjeが特徴的で、北部のNkhata Bay近傍にも産地があります。','高地の穏やかな気温と生育期の雨、水はけや土壌条件が茶樹を支えます。高地ならどこでも一様に栽培されるわけではなく、季節の雨、土地利用、工場と生産者のつながりが産地を形づくります。','摘み取った葉を速やかに工場へ運び、製茶して飲料用に利用します。東部アフリカでは紅茶やブレンド向けの茶が生産され、産地内の輸送、加工・品質管理、集荷と港への接続が販売を支えます。'],
    sourceLinks:africaBeverageLinks('tea'),
  },
  cattle: {
    title: '牛：東部高地とサヘルの農牧業',
    takeaway: '作物と牛を組み合わせる地域を、飼料・水と、乳や食肉を届ける仕組みから読みます。',
    paragraphs: [
      '東部高地周辺とサヘルの分布を比べます。エチオピア高原の穀物と家畜、サヘルの穀物と家畜の組合せは、耕作と飼養を一緒に考える事例です。',
      '草地・飼料・水に加え、獣医療や移動の経路が飼養を支えます。集乳や食肉市場までの接続も、家畜を食料・収入につなぐ条件です。',
    ],
    sourceLinks: [livestock, farming],
  },
  goats: {
    title: 'ヤギ：サヘルと東部の飼養を読む',
    takeaway: '草や低木を利用する飼養を、サヘルの農牧業と季節ごとの土地利用から読みます。',
    paragraphs: [
      'サヘルと東部の分布を比べます。マリ、ニジェール南部、チャドは、雨の変動が大きい地域で穀物と家畜を組み合わせる営農を読む事例です。',
      '草や低木を利用できる土地と水、群れの管理や獣医療が飼養を支えます。季節移動、土地利用の権利、市場への接続も、家畜の利用と販売に関わります。',
    ],
    sourceLinks: [livestock, farming],
  },
  sheep: {
    title: '羊：北部・サヘル・東部の草地利用',
    takeaway: '北部からサヘル、東部の分布を比べ、草地・高地の環境と飼料や水の確保を読みます。',
    paragraphs: [
      '北西アフリカ、サヘル、東部高地周辺の分布に注目します。サヘルと東部高地の作物・家畜の組合せを背景に、飼養される場所の違いを読みます。',
      '草地や高地の環境と水に加え、飼料の確保、獣医療、季節移動が飼養を支えます。土地利用の権利や市場への接続も利用・販売に関わります。',
    ],
    sourceLinks: [livestock, farming],
  },
};
