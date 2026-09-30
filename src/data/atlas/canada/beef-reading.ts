export const beefSources={
 table:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210013001',
 questionnaire:'https://www.statcan.gc.ca/en/statistical-programs/instrument/3438_Q1_V6',
 pastureDefinition:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210024901',
 forageDefinition:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3210030901',
 pasture:'https://www.gov.mb.ca/agriculture/crops/crop-management/forages/animal-unit-months-stocking-rate-and-carrying-capacity.html',
 winter:'https://www.gov.mb.ca/agriculture/livestock/beef/feeding-cattle-during-manitoba-winters.html',
 finishing:'https://www.gov.mb.ca/agriculture/livestock/beef/rations-for-finishing-beef-cattle.html',
 stages:'https://www.saskatchewan.ca/business/agriculture-natural-resources-and-industry/agribusiness-farmers-and-ranchers/livestock/cattle-poultry-and-other-livestock/cattle/backgrounding-and-feeder-cattle-nutrition',
};
export const beefMaps=[
 {id:'beef',name:'肉用母牛',title:'Total beef cows',dot:'1点＝2,500頭',total:'全国3,776,389頭',source:'https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-043-eng.htm',description:'肉用母牛の頭数を示す図です。子牛・去勢牛・未経産牛を含む肉牛すべての分布や、肥育場の位置ではありません。'},
 {id:'pasture',name:'放牧地',title:'Total pasture area',dot:'1点＝40,000 acres（約16,188 ha）',total:'全国18,559,652 ha',source:'https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-013-eng.htm',description:'改良・播種した放牧地と自然放牧地の面積です。自然放牧地には放牧に使う林地や、許可・賃借等で家畜を放牧する共有地を含みます。カナダの自然草地すべての面積でも、飼養可能頭数の地図でもありません。'},
 {id:'hay',name:'乾草など（Total hay）',title:'Total hay area',dot:'1点＝8,000 acres（約3,238 ha）',total:'全国5,394,265 ha',source:'https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-037-eng.htm',description:'公式図の区分「Total hay」の面積をそのまま示します。乾草の重量や肉牛専用の飼料面積ではありません。調査票の飼料作物にはサイレージ等の用途もあり、種子採取用は別項目です。この図から用途別の面積を推計しません。'},
];
export const beefReading=[
 {title:'場所：母牛・放牧地・飼料の3図を重ねて考える',body:'プレーリーは西からアルバータ、サスカチュワン、マニトバの3州です。図のEdmonton（エドモントン）、Regina（レジャイナ）、Winnipeg（ウィニペグ）と州境を探します。肉用母牛と放牧地の点は西部に多く、乾草などの図は東部にも広がります。拡大枠AのToronto（トロント）、Ottawa（オタワ）、Québec（ケベック）も見比べてください。3図は点の単位が異なります。点の数だけで牛と飼料の不足・余剰を決めたり、面積から頭数を逆算したりはできません。',source:beefMaps[0].source},
 {title:'自然条件：草が育つ季節と水を読む',body:'牛は牧草などを食べますが、草の量は土地の広さだけでは決まりません。気温、生育する季節、水分、土壌、草種と管理が関わります。ReginaやWinnipegの気温と降水を読み、冬と生育期の違いを考えます。これは1観測所の平年値で、牧場の土壌水分や特定年の干ばつを示しません。地形図で山地と平原、水の地図で湖・川の位置も確かめます。地形や水域の位置だけから放牧可能範囲や家畜の飲水量を決めることはできません。',source:beefSources.pasture},
 {title:'放牧管理：何頭を、どれだけの期間置くか',body:'草地があっても、自由に頭数を増やせるわけではありません。マニトバ州の資料は、草地を傷めず一定期間養える量を「carrying capacity」、実際に置く家畜の量と期間を「stocking rate」として区別します。草の生産量が変われば維持できる放牧量も変わります。草の回復、放牧時期、利用する区画、家畜の大きさを合わせて管理することが、草地を繰り返し使う条件です。公式放牧地図は面積の分布であり、この能力や放牧期間を測った図ではありません。',source:beefSources.pasture},
 {title:'冬：生育が鈍る時期を貯蔵飼料と管理でつなぐ',body:'冬も牛の維持には飼料が必要です。乾草やサイレージなどの貯蔵飼料は、生育する季節と給餌する季節をつなぎます。マニトバ州の資料は、寒さだけでなく風・湿り・牛の状態・風よけが冬の給餌に関わると説明しています。「寒い場所だから牛を飼えない」と一歩で結論づけず、飼料を確保し保管して届ける設備と管理も考えます。乾草などの面積図は、収穫した重量・栄養価・実際の貯蔵量を示しません。',source:beefSources.winter},
 {title:'繁殖・育成・肥育：すべてが同じ餌ではない',body:'肉用母牛が子牛を産み育てる段階、その後の育成、出荷へ向けて体重を増やす肥育を分けます。StatCanは育成を担う経営に乾草や放牧などの低エネルギー飼料、肥育経営に穀物などの高エネルギー飼料を用いる区分を設けています。州政府の肥育資料にも大麦やサイレージ、カノーラミールの例があります。放牧地だけで全段階が完結するとは限りません。小麦やカノーラのページへ戻り、穀物の用途と油を搾った後の副産物を区別して読みます。配合量の指導や全作物が飼料になるという説明ではありません。',source:beefSources.table,extraSource:beefSources.finishing},
 {title:'流通へ：頭数は生産量・出荷量とは違う',body:'育成・肥育を経て市場へつなぐには、飼料を運び、家畜を管理し、加工・流通へつなぐ人の活動が必要です。このページの表は各年7月1日に飼われている牛の頭数で、年間の出荷頭数・牛肉重量・輸出量ではありません。母牛、子牛、育成牛などを含む総牛頭数と、繁殖を担う肉用母牛を分けて読むことで、同じ「牛」でも役割が違うと分かります。価格・輸出先・流通経路の数量は今回の資料に含まれないため、特定の港や日本向け割合には結び付けません。',source:beefSources.table},
];
