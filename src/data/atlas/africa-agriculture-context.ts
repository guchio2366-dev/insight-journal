/**
 * Short reading paths through the existing Africa material.
 *
 * Geography in the map is read from the pinned 2020 SPAM / GLW distributions;
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
export const agricultureContextPeriodNote = '分布は2020年を基準とするSPAM・GLWのモデル推定です。営農の背景にはFAOの2001年資料を使い、現在の品目別生産順位や2020年の経済構成としては扱っていません。';

export const agricultureContextOverview: AfricaAgricultureContext & {statisticNote: string} = {
  title: '食用作物と家畜を、地域の組合せで読む',
  takeaway: 'ギニア湾岸とコンゴ盆地の食用作物、北部の小麦、東部高地とサヘルの農牧業を見比べます。',
  paragraphs: [
    'トウモロコシは西部・東部・南部、小麦は北西アフリカやナイル沿い・東部高地の分布に注目します。キャッサバは湾岸からコンゴ盆地周辺、米は西アフリカの沿岸・河川低地、ナイル沿い、マダガスカルなどで栽培され、主食として利用されます。',
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
    title:'コーヒー：東部高地と湿潤な西・中央部',
    takeaway:'東部の高地やギニア湾岸・中央部の生産を、加工と輸出への接続から読みます。',
    paragraphs:['FAOの農業システム資料では、エチオピア・ウガンダなどの高地の多年生作物、ギニア湾岸から中央部の樹木作物にコーヒーが含まれます。気温・降水・標高に品種や管理が重なり、生産地が形成されます。','果実の収穫から精製・乾燥を経た生豆は、焙煎・飲料用に流通します。品質管理、集荷、道路・港、輸出先の需要と価格も生産者の収入に関わります。2020年の分布格子は未取得で、面の分布を補作していません。'],
    sourceLinks:[farming,{label:'FAOSTAT QCL：2024年の生豆生産量',url:'https://www.fao.org/faostat/en/#data/QCL'}],
  },
  tea: {
    title:'茶：東部の産地と摘採・製茶・流通',
    takeaway:'ケニア、ウガンダ、タンザニア、マラウイなどの茶生産を、栽培と加工の連続した仕事から読みます。',
    paragraphs:['FAOの茶資料で確認できる東部アフリカの生産を読む項目です。茶の生育には地域の農業気候条件が関わり、雨や気温の変化は栽培にも影響します。2020年の分布格子は未取得で、栽培範囲を推測して塗っていません。','摘み取った葉を製茶して飲料として利用します。産地から工場への輸送、加工・品質管理、集荷と港、輸出市場への接続が重要です。茶の輸出収入は、生産国の食料輸入を支える面もあります。'],
    sourceLinks:[{label:'FAO：茶の生産と市場',url:'https://www.fao.org/markets-and-trade/commodities-overview/beverages/tea/en'},{label:'FAO：茶産地の背景（2013）',url:'https://www.fao.org/fileadmin/templates/mafap/documents/technical_notes/MALAWI/2005-2013/Malawi_TN_tea_web_review.pdf'}],
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
