export const agricultureRelations = [
  {
    id: 'corn-soy-hogs', title: 'とうもろこし・大豆と豚',
    question: 'なぜ、穀物地帯に豚が集まる？', preview: '飼料と産地の重なりをたどる。',
    takeaway: '飼料となる穀物と大豆粕が、中西部の作物地帯と養豚を結びます。',
    body: '豚の肥育飼料は、主にとうもろこしと高たんぱくの大豆粕です。中西部では両作物の栽培域と養豚の集積がおおむね重なり、飼料調達との関係を考えられます。一方、ノースカロライナにも大産地があり、施設、契約生産、加工網も立地に関わります。',
    caveat: '近接だけから因果の強さや飼料の地元調達率は分かりません。大豆は通常、加工した粕として飼料に使います。',
    mapSummary: '輪郭を強めた作物地帯と、二重枠の養豚記号を比べます。飼料の供給と生産・加工の仕組みがつながる地域です。',
    cropIds: ['corn', 'soybean', 'corn-soybean'],
    livestockRegionIds: ['iowa-hogs', 'east-cornbelt-hogs', 'north-carolina-hogs'],
    baseFeatureIds: [], anchor: [-92.5,41.8], requiredLayers: ['crops','livestock'],
    links: [{label:'とうもろこしの用途',href:'#crop-corn'},{label:'大豆の用途',href:'#crop-soybean'},{label:'養豚',href:'#livestock-hogs'}],
    sources: [{label:'USDA ERS：養豚の飼料・生産構造',url:'https://www.ers.usda.gov/topics/animal-products/hogs-pork/sector-at-a-glance',updatedAt:'2025-01-08'}],
  },
  {
    id: 'plains-wheat-cattle', title: '大平原の小麦と牛',
    question: '小麦と牛は、どう土地を使う？', preview: '放牧と肥育で変わる、土地と飼料。',
    takeaway: '草地を使う飼育と穀物による肥育では、土地や飼料との関係が異なります。',
    body: 'グレートプレーンズでは小麦地帯と牛の主要地域が近接しています。牛は離乳まで主に牧草で育ち、肥育場では穀物、サイレージ、干し草などを組み合わせます。同じ大平原の中で、作物生産と牛の飼育・肥育が異なる土地利用としてつながっています。',
    caveat: '小麦との近さは「主な飼料が小麦」という意味ではありません。牛の代表点は繁殖と肥育の内訳や頭数を示しません。',
    mapSummary: '小麦の輪郭と大平原の牛を比較します。放牧と肥育を区別すると、同じ地域に異なる土地利用が見えてきます。',
    cropIds: ['wheat'], livestockRegionIds: ['northern-plains-beef','southern-plains-beef'],
    baseFeatureIds: ['landform:グレートプレーンズ'], anchor: [-101,40], requiredLayers: ['crops','livestock'],
    links: [{label:'小麦の用途',href:'#crop-wheat'},{label:'肉牛',href:'#livestock-beef'}],
    sources: [{label:'USDA ERS：肉牛の飼育・肥育',url:'https://www.ers.usda.gov/topics/animal-products/cattle-beef/sector-at-a-glance',updatedAt:'2025-05-22'}],
  },
  {
    id: 'california-rice-water', title: 'カリフォルニアの米と水',
    question: '夏に乾くのに、なぜ米が作れる？', preview: 'カリフォルニアの水源と灌漑。',
    takeaway: '雨の多さだけでなく、必要な時期に田へ水を届ける仕組みが産地を支えます。',
    body: '稲作には、安定した水供給と、均一に冠水・排水できる平坦な土地が必要です。夏に乾燥するサクラメント渓谷でも灌漑によって稲作が成立します。干ばつと貯水量低下で縮んだ作付けが、2023年の降雨と融雪後に回復したことは、水源・貯水・灌漑を一続きで読む手掛かりになります。',
    caveat: '川の近さだけでは実際の取水経路は分かりません。輪郭は米国全体の稲作域で、灌漑網や水量を描いたものではありません。',
    mapSummary: '西海岸のサクラメント渓谷に注目。平坦な土地と貯水・灌漑が、乾燥する夏の水供給を支えます。稲作の輪郭は全米を強調しています。',
    cropIds: ['rice'], livestockRegionIds: [], baseFeatureIds: ['water:Sacramento','water:shasta-lake','landform:シエラネバダ山脈'],
    anchor: [-121.8,39.2], requiredLayers: ['crops'],
    links: [{label:'米の用途・貿易',href:'#crop-rice'}],
    sources: [{label:'USDA ERS：稲作・灌漑・干ばつ',url:'https://www.ers.usda.gov/topics/crops/rice/rice-sector-at-a-glance',updatedAt:'2025-12-23'}],
  },
  {
    id:'corn-soy-rotation',title:'大豆とトウモロコシ',question:'なぜ大豆とトウモロコシが重なる？',preview:'輪作の舞台となる中西部の畑作地帯。',
    takeaway:'二つの作物の主な産地が中西部で重なる。',
    body:'大豆とトウモロコシを年によって替える輪作が行われます。地図は２作物の栽培域を重ねますが、各畑の年ごとの作付けは示しません。',
    caveat:'重なりだけで同じ畑の輪作を証明する図ではありません。',mapSummary:'トウモロコシ・大豆の栽培域を同時に強調します。',
    cropIds:['corn','soybean','corn-soybean'],livestockRegionIds:[],baseFeatureIds:[],anchor:[-92,41],requiredLayers:['crops'],
    links:[{label:'大豆の解説',href:'#crop-soybean'},{label:'トウモロコシの解説',href:'#crop-corn'}],
    sources:[{label:'USDA ERS：大豆',url:'https://www.ers.usda.gov/topics/crops/soybeans-and-oil-crops/oil-crops-sector-at-a-glance',updatedAt:'2026-09-24'}]
  },
  {
    id:'broiler-supply',title:'南東部の肉用鶏と飼料',question:'南東部の肉用鶏はどう育てられる？',preview:'飼料と契約農場・加工のつながり。',
    takeaway:'肉用鶏の集積には飼料供給と加工を結ぶ生産体制が関わる。',
    body:'南東部とアーカンソー周辺の肉用鶏の代表地域を、トウモロコシ・大豆の栽培域と比較します。ふ化場、飼料工場、契約農場、処理施設を結ぶ工程は解説上の流れです。',
    caveat:'地図は個別の施設・取引先・飼料の輸送経路を示しません。',mapSummary:'二つの飼料作物と肉用鶏の代表地域を強調します。',
    cropIds:['corn','soybean','corn-soybean'],livestockRegionIds:['southeast-broilers','arklatex-broilers','delmarva-broilers'],baseFeatureIds:[],anchor:[-85,34],requiredLayers:['crops','livestock'],
    links:[{label:'肉用鶏の解説',href:'#livestock-broilers'}],sources:[{label:'USDA ERS：家禽と卵',url:'https://www.ers.usda.gov/topics/animal-products/poultry-eggs/sector-at-a-glance',updatedAt:'2026-09-24'}]
  },
  {
    id:'layer-feed',title:'採卵鶏と飼料',question:'アイオワ周辺に採卵鶏が集まるのは？',preview:'トウモロコシ・大豆と卵の産地。',
    takeaway:'飼料作物の産地の近さは採卵鶏の立地を考える手掛かり。',
    body:'アイオワ周辺などの採卵鶏とトウモロコシ・大豆の栽培域を重ねます。飼料を与えて卵を生産した後には選別、包装、出荷が続きます。',
    caveat:'代表点と作物の近さから個々の農場の調達先は分かりません。',mapSummary:'採卵鶏の代表地域と二つの飼料作物を比較します。',
    cropIds:['corn','soybean','corn-soybean'],livestockRegionIds:['iowa-layers','penn-ohio-layers'],baseFeatureIds:[],anchor:[-92,42],requiredLayers:['crops','livestock'],
    links:[{label:'採卵鶏の解説',href:'#livestock-layers'}],sources:[{label:'USDA ERS：家禽と卵',url:'https://www.ers.usda.gov/topics/animal-products/poultry-eggs/sector-at-a-glance',updatedAt:'2026-09-24'}]
  },
  {
    id:'poultry-compare',title:'肉用鶏と採卵鶏',question:'鶏肉と卵の産地は同じ？',preview:'２種類の鶏の代表地域を比べる。',
    takeaway:'肉用鶏は南東部、採卵鶏はアイオワ周辺などにも分布する。',
    body:'２種類の鶏の代表地域を同じ地図で比べます。肉用鶏の出荷先は食肉処理、採卵鶏の産物は選別・包装へと進みます。',
    caveat:'代表点の位置は生産量の大小や農場の全数を示しません。',mapSummary:'肉用鶏と採卵鶏の代表地域を色分けした記号で比較します。',
    cropIds:[],livestockRegionIds:['southeast-broilers','arklatex-broilers','delmarva-broilers','iowa-layers','penn-ohio-layers'],baseFeatureIds:[],anchor:[-89,38],requiredLayers:['livestock'],
    links:[{label:'肉用鶏',href:'#livestock-broilers'},{label:'採卵鶏',href:'#livestock-layers'}],sources:[{label:'USDA ERS：家禽と卵',url:'https://www.ers.usda.gov/topics/animal-products/poultry-eggs/sector-at-a-glance',updatedAt:'2026-09-24'}]
  },
] as const;

export type AgricultureRelation = typeof agricultureRelations[number];
export type AgricultureRelationId = AgricultureRelation['id'];
export const relationCheckedAt = '2026-09-13';
export const relationCoverage = '作物は2023年CDLの概略分布、畜産は2022年センサス等で確認した主要地域の代表点です。同一年の相関や数量比較ではありません。';
