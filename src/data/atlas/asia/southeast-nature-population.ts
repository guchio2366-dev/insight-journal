/** Regional readings use the existing GHSL city records, not a second population dataset. */
export const southeastPopulationPlaces = [
  {
    id: 'java', title: 'ジャワ島｜一つの巨大都市だけでなく、複数の都市が続く',
    reading: 'ジャワ島では西部のジャカルタ・バンドンから、中部のスマラン、東部のスラバヤへ人口のまとまりが続きます。周辺の農村との結び付きに加え、都市の仕事、交通、住宅や公共サービスが人の集中と移動に関わります。地図の濃い格子が島全体に均一に広がっているわけではありません。',
    cityIds: ['uc-5472', 'uc-5748', 'uc-6785', 'uc-7459'],
    source: {label: '世界銀行・インドネシアの都市化（2019年）', url: 'https://www.worldbank.org/en/country/indonesia/publication/augment-connect-target-realizing-indonesias-urban-potential'},
  },
  {
    id: 'deltas', title: '大河川の低地｜農村の広がりと都市の集中を分ける',
    reading: '紅河下流のハノイ、チャオプラヤー下流のバンコク、メコンデルタ東側のホーチミンでは、河川低地の人口の広がりの中に大きな都市の輪郭があります。低地は農地や交通路をつなぎやすい一方、各都市の人口をデルタ全体の人口として扱うことはできません。都市を選んでから同じ地点の標高や流域へ進むと、都市の代表点がどの低地にあるかを確かめられます。',
    cityIds: ['uc-1999', 'uc-2315', 'uc-5239'],
    source: {label: '欧州委員会JRC・都市の定義と範囲', url: 'https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php'},
  },
  {
    id: 'ports', title: '港と都市｜人口の多さと密度の高さは違う',
    reading: 'シンガポール、マニラ、ジャカルタでは、沿岸の都市の範囲と人口を比べられます。同じ2020年の推計でも、広い都市に多くの人が暮らすことと、狭い範囲に高密度で暮らすことは別です。港や産業との位置関係は、都市を選んで同じ場所の産業地図へ切り替えて読みます。ここでの人数は市域・国全体の人口や港の従業者数ではありません。',
    cityIds: ['uc-178', 'uc-2323', 'uc-5472'],
    source: {label: '欧州委員会JRC・GHS-UCDB R2024A', url: 'https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php'},
  },
] as const;

/** Coverage means records presented here, not whether a country collects these statistics. */
export const southeastSocietyCoverage = [
  {code:'BRN', name:'ブルネイ', ethnicity:'住民統計の補足なし', religion:'住民統計の補足なし'},
  {code:'KHM', name:'カンボジア', ethnicity:'住民統計の補足なし', religion:'住民統計の補足なし'},
  {code:'IDN', name:'インドネシア', ethnicity:'住民統計の補足なし', religion:'バリ州・2市県の登録人口（2024年）'},
  {code:'LAO', name:'ラオス', ethnicity:'住民統計の補足なし', religion:'住民統計の補足なし'},
  {code:'MYS', name:'マレーシア', ethnicity:'16州・連邦直轄領の市民（2026年推計）', religion:'住民統計の補足なし'},
  {code:'MMR', name:'ミャンマー', ethnicity:'住民統計の補足なし', religion:'住民統計の補足なし'},
  {code:'PHL', name:'フィリピン', ethnicity:'7地方の世帯人口（2020年国勢調査）', religion:'全国・4地方の世帯人口（2020年国勢調査）'},
  {code:'SGP', name:'シンガポール', ethnicity:'住民統計の補足なし', religion:'住民統計の補足なし'},
  {code:'THA', name:'タイ', ethnicity:'住民統計の補足なし', religion:'住民統計の補足なし'},
  {code:'TLS', name:'東ティモール', ethnicity:'住民統計の補足なし', religion:'全国の3歳以上（2022年国勢調査）'},
  {code:'VNM', name:'ベトナム', ethnicity:'住民統計の補足なし', religion:'全国の全人口（2019年国勢調査）'},
] as const;

export const baliReligionRegistration = {
  year: 2024,
  kind: '行政登録人口',
  source: 'https://bali.bps.go.id/id/statistics-table/1/MjAxIzE%3D/jumlah-penduduk-menurut-agama-dan-kabupaten-kota-di-provinsi-bali-hasil-registrasi-2024-dan-2025.html',
  publisher: 'BPSバリ州（原集計：バリ州住民・市民登録担当部局）',
  // Source order: Islam, Catholic, Protestant, Hindu, Buddhist, Confucianism, Belief.
  categories: ['イスラム教', 'カトリック', 'プロテスタント', 'ヒンドゥー教', '仏教', '儒教', '信仰（原表のBelief区分）'],
  // Deliberately selected examples, not a claim of exhaustive administrative coverage.
  records: [
    {id:'bali', name:'バリ州全体', scope:'州', counts:[449805,37635,76948,3780272,29876,606,121], total:4375263},
    {id:'denpasar', name:'デンパサール市', scope:'市', counts:[151513,16340,36008,453352,15682,333,42], total:673270},
    {id:'jembrana', name:'ジュンブラナ県', scope:'県', counts:[88530,2669,4196,233831,975,17,3], total:330221},
  ],
} as const;
