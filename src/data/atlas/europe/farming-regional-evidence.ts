/** Source-reported regional examples, not farm locations or polygon boundaries. */
export const europeFarmingRegionalEvidence = [
  {id:'ie-south-dairy',genre:'livestock',kind:'dairy',name:'アイルランド南部・乳牛',coordinates:[-8.2,52.1],period:'2020',detail:'南部NUTS 2に乳牛1,124,842頭。',source:'https://www.cso.ie/en/releasesandpublications/ep/p-coa/censusofagriculture2020-preliminaryresults/livestock/'},
  {id:'ie-nw-other-cows',genre:'livestock',kind:'other-cows',name:'同北西部・非乳牛',coordinates:[-8.8,54.1],period:'2020',detail:'北部・西部NUTS 2に非乳牛395,751頭。肉牛の出荷量ではありません。',source:'https://www.cso.ie/en/releasesandpublications/ep/p-coa/censusofagriculture2020-preliminaryresults/livestock/'},
  {id:'austrian-alps-dairy',genre:'livestock',kind:'dairy',name:'アルプス・山地酪農',coordinates:[12.4,47.3],period:'資料記述',detail:'オーストリア農業省が山間地の酪農経営を説明。点は生乳量の多い場所の順位ではありません。',source:'https://www.bmluk.gv.at/en/topics/agriculture/agriculture-in-austria/animal-production-in-austria/dairy-farming-in-austria.html'},
  {id:'rioja-vines',genre:'horticulture',kind:'vines',name:'リオハ・ワイン用ブドウ畑',coordinates:[-2.5,42.3],period:'2020',detail:'農用地に占めるブドウ畑20.1%。収穫量や食用ブドウ面積ではありません。',source:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Vineyards_in_the_EU_-_statistics'},
  {id:'languedoc-vines',genre:'horticulture',kind:'vines',name:'ラングドック・ブドウ畑',coordinates:[3.1,43.6],period:'2020',detail:'農用地に占めるブドウ畑21.3%。地域内の畑の場所は示しません。',source:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Vineyards_in_the_EU_-_statistics'},
  {id:'friuli-vines',genre:'horticulture',kind:'vines',name:'フリウリ・ブドウ畑',coordinates:[13.1,46.1],period:'2020',detail:'農用地に占めるブドウ畑は約15%。',source:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Vineyards_in_the_EU_-_statistics'},
  {id:'attica-vines',genre:'horticulture',kind:'vines',name:'アッティカ・ブドウ畑',coordinates:[23.7,38.0],period:'2020',detail:'農用地に占めるブドウ畑9.4%。',source:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Vineyards_in_the_EU_-_statistics'},
] as const;

/** Country totals or a source's named leading-country group. Anchors label countries, not production sites. */
export const europeFarmingCountryEvidence = [
  {id:'dairy-de',genre:'livestock',kind:'dairy-country',name:'ドイツ',coordinates:[10.1,51.3],value:'乳牛',detail:'2016年の乳牛群。ドイツ・フランス・ポーランド・イタリア・英国・オランダの6か国で当時のEUの67%。個別の国別割合ではありません。'},
  {id:'dairy-fr',genre:'livestock',kind:'dairy-country',name:'フランス',coordinates:[1.2,47.8],value:'乳牛',detail:'2016年の乳牛主要6か国の一つ。国の位置を示し、国内の飼養地域ではありません。'},
  {id:'dairy-pl',genre:'livestock',kind:'dairy-country',name:'ポーランド',coordinates:[20.5,52.6],value:'乳牛',detail:'2016年の乳牛主要6か国の一つ。'},
  {id:'dairy-it',genre:'livestock',kind:'dairy-country',name:'イタリア',coordinates:[11.3,43.5],value:'乳牛',detail:'2016年の乳牛主要6か国の一つ。'},
  {id:'dairy-uk',genre:'livestock',kind:'dairy-country',name:'英国',coordinates:[-3.0,54.0],value:'乳牛',detail:'2016年、英国がEU加盟国だった当時の乳牛主要6か国の一つ。'},
  {id:'dairy-nl',genre:'livestock',kind:'dairy-country',name:'オランダ',coordinates:[5.1,52.4],value:'乳牛',detail:'2016年の乳牛主要6か国の一つ。'},
  {id:'suckler-fr',genre:'livestock',kind:'suckler-country',name:'フランス',coordinates:[1.0,45.0],value:'繁殖母牛',detail:'2016年の肉用繁殖母牛主要4か国の一つ。フランス・スペイン・英国・アイルランドで当時のEUの71%。'},
  {id:'suckler-es',genre:'livestock',kind:'suckler-country',name:'スペイン',coordinates:[-3.7,40.1],value:'繁殖母牛',detail:'2016年の肉用繁殖母牛主要4か国の一つ。'},
  {id:'suckler-uk',genre:'livestock',kind:'suckler-country',name:'英国',coordinates:[-3.4,56.8],value:'繁殖母牛',detail:'2016年、英国がEU加盟国だった当時の肉用繁殖母牛主要4か国の一つ。'},
  {id:'suckler-ie',genre:'livestock',kind:'suckler-country',name:'アイルランド',coordinates:[-7.1,52.9],value:'繁殖母牛',detail:'2016年の肉用繁殖母牛主要4か国の一つ。2020年の非乳牛の地域値とは別の指標。'},
  {id:'vines-es',genre:'horticulture',kind:'vines-country',name:'スペイン',coordinates:[-5.0,43.0],value:'葡 90万ha',detail:'2020年のワイン用ブドウ畑の国全体の面積、概数。'},
  {id:'vines-fr',genre:'horticulture',kind:'vines-country',name:'フランス',coordinates:[0.2,46.9],value:'葡 80万ha',detail:'2020年のワイン用ブドウ畑の国全体の面積、概数。'},
  {id:'vines-it',genre:'horticulture',kind:'vines-country',name:'イタリア',coordinates:[10.2,44.9],value:'葡 70万ha',detail:'2020年のワイン用ブドウ畑の国全体の面積、概数。'},
  {id:'olives-es',genre:'horticulture',kind:'olives-country',name:'スペイン',coordinates:[-3.3,37.5],value:'オ 53%',detail:'2023年のEUオリーブ樹園面積に占めるスペイン国全体の割合。'},
  {id:'olives-it',genre:'horticulture',kind:'olives-country',name:'イタリア',coordinates:[15.2,40.3],value:'オ 24%',detail:'2023年のEUオリーブ樹園面積に占めるイタリア国全体の割合。'},
  {id:'olives-gr',genre:'horticulture',kind:'olives-country',name:'ギリシャ',coordinates:[22.1,37.5],value:'オ 14%',detail:'2023年のEUオリーブ樹園面積に占めるギリシャ国全体の割合。'},
  {id:'olives-pt',genre:'horticulture',kind:'olives-country',name:'ポルトガル',coordinates:[-8.6,40.4],value:'オ 8%',detail:'2023年のEUオリーブ樹園面積に占めるポルトガル国全体の割合。'},
] as const;

export const europeFarmingCountrySources = {
  livestock:'https://sustainbeef.hub.inrae.fr/project/wp2.1-description-of-beef-production-systems/wp2.1.1-beef-production-national-statistics',
  vines:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Vineyards_in_the_EU_-_statistics',
  olives:'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Agricultural_production_-_orchards',
} as const;
