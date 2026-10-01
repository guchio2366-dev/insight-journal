export interface OceaniaNatureReading {
  id: string;
  title: string;
  takeaway: string;
  explanation: string;
  sources: { title: string; url: string }[];
  countryCodes: string[];
}

const climateSource = {
  title: 'Beck et al. (2023)：Köppen–Geiger気候分類・1991–2020年',
  url: 'https://doi.org/10.1038/s41597-023-02549-6'
};
const rainfallSource = {
  title: '豪州気象局：降水平均と地域差',
  url: 'https://www.bom.gov.au/climate/maps/averages/rainfall/'
};
const farmingSource = {
  title: 'ABARES：豪州農業の分布と生産条件',
  url: 'https://www.agriculture.gov.au/abares/products/insights/snapshot-of-australian-agriculture'
};

export const oceaniaNatureReadings: OceaniaNatureReading[] = [
  {
    id: 'dryinterior',
    title: '豪州内陸の乾燥と水',
    takeaway: '乾燥する内陸では、水の確保と利用の仕組みが農業や暮らしを支える。',
    explanation: '豪州の内陸は亜熱帯高圧帯の影響を受け、水蒸気を供給する海からも遠いため、乾燥帯が広がります。雨の少ない場所では広い土地を使う放牧が中心になりますが、農業の種類は水・土壌・市場との距離にも関わります。取水や管理技術を含めて土地利用を読み、気候だけで生産や暮らしを決めつけないことが大切です。地図は1991–2020年の気候分類で、現在の天気や取水量を表しません。',
    sources: [climateSource, rainfallSource, farmingSource],
    countryCodes: ['AUS']
  },
  {
    id: 'coastaltemperate',
    title: '豪州沿岸の気候と農業',
    takeaway: '南西部と南東部の温帯を、雨の季節・作物・市場のつながりから読む。',
    explanation: '豪州の南西部には夏に乾燥する温帯、南東部には湿潤な温帯が見られ、沿岸でも雨の季節や山地の影響が異なります。耕種・園芸は比較的沿岸に近い地域に集まり、自然条件と市場への距離がともに生産を支えます。内陸の放牧や小麦地帯と比べると、必要な水、作業方法、加工・輸送へのつながりを考えられます。地図の気候区分と、特定作物の産地や灌漑の範囲は同じ境界ではありません。',
    sources: [climateSource, rainfallSource, farmingSource],
    countryCodes: ['AUS']
  },
  {
    id: 'altitude',
    title: 'NZとPNGの山地・高地',
    takeaway: '山地は気温・雨・土地利用を変え、市場へ運ぶ道も生産を左右する。',
    explanation: 'ニュージーランドでは標高とともに気温が下がり、山地が偏西風を遮ることで、西側と東側の雨の違いが生まれます。パプアニューギニアでは熱帯の低地と高地で気候が異なり、高地の谷ではコーヒーや野菜が生産されます。道路や、一部の遠隔地では空輸の利用と輸送費が、農産物を市場へ届ける条件に関わります。気候分類は標高の実測値ではなく、詳細図でも山地のすべての微気候を示すものではありません。',
    sources: [
      climateSource,
      { title: 'NIWA：ニュージーランドの気候・標高・雨陰', url: 'https://niwa.co.nz/climate-and-weather/overview-new-zealands-climate' },
      { title: 'PNG Coffee Industry Corporation：東部高地の生産条件', url: 'https://www.cic.org.pg/coffee-in-png/coffee-growing-areas/eastern-highlands-province/' },
      { title: 'PNG Coffee Industry Corporation：遠隔地の輸送支援', url: 'https://www.cic.org.pg/services/grower-services/freight-surety-scheme/' }
    ],
    countryCodes: ['NZL', 'PNG']
  },
  {
    id: 'pacificislands',
    title: '太平洋の島々と淡水・交通',
    takeaway: '島の地形と淡水、島外へつながる交通が、土地利用と暮らしの条件に関わる。',
    explanation: '太平洋には火山性の高い島と、低い島や環礁があります。環礁では雨の浸透が地下の淡水レンズを支え、その量は陸地の広さや降水、海水の浸入にも関わります。海で隔たる島の市場や生活サービスへのアクセスには、船や交通施設が大切です。小島は広域の格子では読み取れない場合があるため、詳細図と欠測表示を確認してください。気候図は地下水の量や安全性を表しません。',
    sources: [
      climateSource,
      { title: 'NOAA：太平洋の高島と低島', url: 'https://www.papahanaumokuakea.gov/monument_features/physical_high_islands.html' },
      { title: 'NOAA：環礁の淡水レンズ', url: 'https://www.papahanaumokuakea.gov/monument_features/physical_fresh_water_lens.html' },
      { title: 'キリバス財務省：離島交通とアクセス', url: 'https://mfed.gov.ki/node/159' }
    ],
    countryCodes: ['FJI', 'WSM', 'TON', 'KIR', 'PYF', 'VUT', 'SLB', 'NCL', 'FSM', 'MHL', 'PLW', 'NRU', 'TUV', 'COK', 'NIU', 'ASM', 'WLF', 'PCN', 'GUM', 'MNP']
  }
];
