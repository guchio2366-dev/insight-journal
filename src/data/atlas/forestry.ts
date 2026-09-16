/** Editorial examples, not exhaustive statistical regions or production boundaries. */
export const forestRegions = [
 {id:'south',label:'南部の事例',places:'ノースカロライナ州',codes:['NC'],anchor:[-79.5,35.6],
  takeaway:'温暖な気候と森林の管理が、南部のマツ材生産を支える。',
  text:'南部に広がるテーダマツは、長く暑い夏と穏やかな冬、湿潤な気候に適した針葉樹です。植林し、混み合った木を間引く「間伐」などで成長を管理します。ここではノースカロライナ州を事例に、育てた木が製材用やパルプ用に分かれる様子を下の統計で確認できます。',
  source:'https://www.srs.fs.usda.gov/pubs/misc/ag_654/volume_1/pinus/taeda.htm'},
 {id:'northwest',label:'太平洋岸北西部',places:'ワシントン州・オレゴン州',codes:['WA','OR'],anchor:[-121,45.8],
  takeaway:'太平洋側の湿潤な森林と、山脈の内陸側を見比べる。',
  text:'ワシントン州とオレゴン州は、建築材や紙などに使う木材の生産地域です。海からの湿った空気が山地で雨を降らせる西側と、雨の少ない内陸側では森林の広がりが異なります。州全域が同じ森林ではありません。降水量と地形を重ね、森林がまとまる位置を確かめてください。',
  source:'https://research.fs.usda.gov/pnw/products/dataandtools/production-prices-employment-and-trade-northwest-forest-industries-1958',climateSource:'https://www.srs.fs.usda.gov/pubs/misc/ag_654/volume_1/pseudotsuga/menziesii.htm'},
 {id:'northeast',label:'北東部の事例',places:'メーン州・ニューハンプシャー州・バーモント州',codes:['ME','NH','VT'],anchor:[-70.8,45.4],
  takeaway:'木の種類と育て方が、得られる木材の質を変える。',
  text:'北東部ではカエデなどの広葉樹も木材資源になります。広葉樹とは、一般に幅の広い葉を持つ樹木です。種子から自然に育つ木を利用する「天然更新」でも、残す木を選び、光が届く空間をつくる管理が行われます。ここではニューイングランド北部の3州を位置確認の対象とします。',
  source:'https://research.fs.usda.gov/download/treesearch/45874.pdf'}
] as const;
export type ForestRegionId=typeof forestRegions[number]['id'];
export const forestRegion=(id:string|null)=>forestRegions.find(r=>r.id===id)??null;
export const timberExample={
 state:'ノースカロライナ州',year:2022,productionMcf:788881,
 unit:'千立方フィート',source:'https://www.ncagr.gov/divisions/nc-forest-service/2022-timber-product-output-and-use-north-carolina/open',
 products:[{label:'製材用丸太',share:42.9},{label:'パルプ材',share:31.5},{label:'燃料・バイオエネルギー用',share:14.0},{label:'単板用丸太',share:7.0},{label:'その他',share:4.3},{label:'柱・杭など',share:0.3}]
};
