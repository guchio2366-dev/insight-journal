export const southCentralLandformOverview='北縁にはヒマラヤからパミール・天山に続く高い山地があり、その南にはインダス川とガンジス・ブラマプトラ川の平野が広がります。インド半島の内陸にはデカン高原、中央アジアには山地に挟まれた盆地と広い低地があります。山地はインド側とユーラシア側の地殻の衝突、ベンガル側の低地は河川が運ぶ堆積物、デカン西部の高原は大規模な玄武岩溶岩という異なる成り立ちを持ちます。';
export const southCentralLandformCases:Record<string,string>={
 'himalaya-nepal':'ヒマラヤはインドプレートとユーラシアプレートの衝突で地殻が押し上げられた山地です。ネパールでは高い山地と南の低地が短い距離で接します。',
 'bengal-lowland':'ガンジス川とブラマプトラ川が運ぶ土砂がベンガルのデルタを作り、低地と水路を形づくります。地図の標高格子だけでは現在の洪水範囲を測れません。',
 'deccan-plateau':'デカン高原西部には、かつての大量の玄武岩溶岩が重なったデカン・トラップがあります。高原全体を一度の噴火や一種類の岩石とみなす地図ではありません。',
};
export const southCentralLandformSources=[
 {label:'USGS・ヒマラヤを作った大陸衝突',url:'https://pubs.usgs.gov/gip/dynamic/himalaya.html'},
 {label:'NASA・ガンジスとブラマプトラのデルタ',url:'https://science.nasa.gov/earth/earth-observatory/ganges-river-delta-1326/'},
 {label:'オレゴン州立大学・デカン・トラップ',url:'https://volcano.oregonstate.edu/deccan-traps'},
];
// The combined legacy route retains its original survey; focus routes describe
// only the landforms and elevation within their own country set.
export const southCentralFocusPhysicalReading={
 'south-asia':{
  terrain:'北のヒマラヤは高く、インダス川・ガンジス川・ブラマプトラ川の平野と沿岸は低い標高です。インド半島のデカン高原は、その間の高さが広がります。ヒマラヤの高さはインド側とユーラシア側の地殻の衝突、ベンガルの低地は河川の堆積と結びつきます。',
  landform:'ヒマラヤの山地、インダス川・ベンガルの低地、デカン高原を地図でたどります。山地は大陸の衝突、ベンガルの低地は河川の堆積、デカン西部の高原は玄武岩溶岩という異なる成り立ちです。',
  detail:'ネパールのヒマラヤ、インダス川の低地、ベンガルの低地、デカン高原を選び、等高線と地形の成り立ちを比較します。',
  water:'ヒマラヤからインダス川・ガンジス川・ブラマプトラ川の平野へ続く流路をたどります。低地の標高と、そこで使える水の量は別の情報です。',
 },
 'central-asia':{
  terrain:'南東のパミールと天山では500m等高線が密になり、カザフスタン北部と西側の低地には広い低標高域が続きます。山地の隆起にはインド側とユーラシア側の衝突の影響が及びます。低地の色から降水量や取水量は分かりません。',
  landform:'タジキスタンのパミールとキルギスの天山を、カザフスタンの内陸の広がりと比較します。パミール・天山の高い山地はインド側とユーラシア側の衝突に伴う地殻変形で生じ、山地の間には谷や盆地もあります。',
  detail:'パミールの高地、天山山脈、カザフスタンの内陸を選び、500m等高線の密度と山地・低地の位置を比較します。',
  water:'パミール・天山側からアムダリヤ川・シルダリヤ川が乾燥した低地へ続きます。山地の標高と下流で使える水の量は別の情報です。',
 },
} as const;
export const southCentralFocusLandformSources={
 'south-asia':southCentralLandformSources,
 'central-asia':[
  {label:'Tectonics・パミールと天山の地殻変形（2016年）',url:'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2015TC004055'},
  {label:'NASA・天山の隆起と地形',url:'https://science.nasa.gov/earth/earth-observatory/central-tien-shan-china-49857/'},
  {label:'NASA・中央アジアの天山と水源',url:'https://science.nasa.gov/earth/earth-observatory/central-asias-water-tower-79419/'},
 ],
} as const;
