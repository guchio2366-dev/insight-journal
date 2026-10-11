import terrainRanges from './africa-terrain-ranges.json' with {type:'json'};
import {reading} from './africa-reading.ts';

export type AfricaNaturalCoordinate=readonly [longitude:number,latitude:number];
export type AfricaNaturalSource={label:string;url:string;note?:string};
export type AfricaNaturalLabel={
 id:string;kind:'terrain'|'river'|'sea'|'current'|'wind';label:string;
 coordinates:AfricaNaturalCoordinate;
 /** Cartographic guide only. Its width/extent never represents a measured boundary or speed. */
 axis?:readonly AfricaNaturalCoordinate[];
 direction?:string;season?:string;temperature?:'cold'|'warm';rangeId?:string;
 source:AfricaNaturalSource;note:string;
};

export const africaNaturalSources={
 terrain:{label:'Natural Earth・地形名称 v5.1.2',url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson',note:'Public domain。原形状は名称案内の概略範囲。実測地形境界ではない。'},
 rivers:{label:'Natural Earth・河川中心線 v5.1.2',url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_rivers_lake_centerlines.geojson',note:'Public domain。ラベル位置は配信済み原河道の実頂点。'},
 seas:{label:'Natural Earth・海域名称 v5.1.2',url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_marine_polys.geojson',note:'Public domain。海域内の概略ラベル位置。'},
 basins:{label:'BasinATLAS v1.0・原接続集水域',url:'https://www.hydrosheds.org/hydroatlas',note:'CC BY4.0、Linke et al.(2019)。NEXT_SINKと全NEXT_DOWN接続を検証済み。'},
 farming:{label:'FAO・アフリカの高地農業（2001）',url:'https://www.fao.org/4/y1860e/y1860e04.htm'},
 nile:{label:'FAO・ナイル沿いの水利用（2001）',url:'https://www.fao.org/4/y1860e/y1860e05.htm'},
 canary:{label:'NOAA・境界海流',url:'https://oceanservice.noaa.gov/education/tutorial_currents/04currents3.html',note:'北大西洋循環とカナリア海流の位置。'},
 benguela:{label:'TNC・Blue Benguela（2026）',url:'https://www.nature.org/en-us/about-us/where-we-work/africa/stories-in-africa/blue-benguela-namibia/',note:'保全事業主体の説明：冷たい沿岸流は南アフリカ側からナミビア・アンゴラへ北向き。図・写真は転載しない。'},
 agulhas:{label:'Haloほか・Agulhas研究総括（2026）, pp.2–3',url:'https://egusphere.copernicus.org/preprints/2026/egusphere-2025-6573/',note:'著者公開preprint、CC BY4.0。南東岸の南西流と南端の反転。原図は転載しない。'},
 trades:{label:'NOAA・貿易風の方向',url:'https://oceanservice.noaa.gov/education/tutorial_currents/04currents2.html',note:'北半球は北東→南西、南半球は南東→北西。概略循環で、当日の風ではない。'},
 harmattan:{label:'Burtonほか・Harmattanの観測（2013）',url:'https://doi.org/10.1002/qj.2036',note:'乾季のNiamey観測とSahara南側の冬季循環。原図・観測値は転載しない。'},
 monsoon:{label:'Parkerほか・西アフリカモンスーン（2005）',url:'https://doi.org/10.1256/qj.04.52',note:'西アフリカ季節風の観測・モデル研究。概略方向は既存Bamakoの合意済み説明とも一致。'},
 madagascar:{label:'Météo Madagascar・地形と気候（2023）, pp.7–9',url:'https://www.meteomadagascar.mg/wp-content/uploads/Publication_Changement_Climatique_2023_web.pdf',note:'地形・風上/風下の事実を要約。許諾不明な原図・境界を転載しない。'},
} satisfies Record<string,AfricaNaturalSource>;

const terrainNote='名称を読む概略範囲。地質・標高閾値・実測した境界ではない。';
const flowNote='矢印は文献で確認した代表方向の概略。流速、流量、正確な幅、現在の観測経路を表さない。';

export const africaTerrainLabels:readonly AfricaNaturalLabel[]=[
 {id:'atlas',kind:'terrain',label:'アトラス山脈',coordinates:[-3,33],rangeId:'atlas',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'sahara',kind:'terrain',label:'サハラ砂漠',coordinates:[12,26],rangeId:'sahara',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'ahaggar',kind:'terrain',label:'アハガル山地',coordinates:[5.7,23.5],rangeId:'ahaggar',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'tibesti',kind:'terrain',label:'ティベスティ山地',coordinates:[18,21.2],rangeId:'tibesti',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'sahel',kind:'terrain',label:'サヘル',coordinates:[7,15],rangeId:'sahel',source:africaNaturalSources.terrain,note:'乾湿の移り変わる広域の名称案内。固定した降水量や砂漠境界ではない。'},
 {id:'congo-basin',kind:'terrain',label:'コンゴ盆地',coordinates:[22,-3],rangeId:'congo-basin',source:africaNaturalSources.terrain,note:'地形名の概略範囲。河川タブのBasinATLAS集水面とは別資料。'},
 {id:'ethiopian-highlands',kind:'terrain',label:'エチオピア高原',coordinates:[38,10],rangeId:'ethiopian-highlands',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'rift',kind:'terrain',label:'大地溝帯',coordinates:[34.5,-6],rangeId:'rift',source:africaNaturalSources.terrain,note:'東西の枝を含むNatural Earthの概略範囲。単一の断層線ではない。'},
 {id:'namib',kind:'terrain',label:'ナミブ砂漠',coordinates:[14.8,-23],rangeId:'namib',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'kalahari',kind:'terrain',label:'カラハリ砂漠',coordinates:[21.5,-24],rangeId:'kalahari',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'drakensberg',kind:'terrain',label:'ドラケンスバーグ山脈',coordinates:[29,-29],rangeId:'drakensberg',source:africaNaturalSources.terrain,note:terrainNote},
 {id:'madagascar-highlands',kind:'terrain',label:'マダガスカル中央高地',coordinates:[47,-20],axis:[[48,-15],[47,-19],[46.5,-23]],source:africaNaturalSources.madagascar,note:'中央高地の南北方向を読む概略軸。高地の実測境界・標高閾値・原図の転写ではない。'},
];

export const africaTerrainRanges=terrainRanges;
export const africaNaturalRangeNote=terrainRanges.note;

/** Source vertices, not displaced source coordinates or invented river paths. */
export const africaRiverLabels:readonly AfricaNaturalLabel[]=[
 {id:'nile',kind:'river',label:'ナイル川',coordinates:[32.863292,23.893826],source:africaNaturalSources.rivers,note:'原河道上。北へ流れデルタから地中海へ。'},
 {id:'congo',kind:'river',label:'コンゴ川',coordinates:[22.092784,2.187445],source:africaNaturalSources.rivers,note:'原河道上。盆地を通り大西洋へ。既存の説明は維持。'},
 {id:'niger',kind:'river',label:'ニジェール川',coordinates:[0.94337,14.648017],source:africaNaturalSources.rivers,note:'原河道上。内陸で大きく曲がってギニア湾へ。'},
 {id:'zambezi',kind:'river',label:'ザンベジ川',coordinates:[29.017507,-15.950535],source:africaNaturalSources.rivers,note:'原河道上。南部高原から東のインド洋へ。'},
 {id:'orange',kind:'river',label:'オレンジ川',coordinates:[22.012869,-28.874933],source:africaNaturalSources.rivers,note:'原河道上。南部から西の大西洋へ。'},
 {id:'limpopo',kind:'river',label:'リンポポ川',coordinates:[30.134532,-22.29339],source:africaNaturalSources.rivers,note:'原河道上。南部から東のインド洋へ。'},
 {id:'senegal',kind:'river',label:'セネガル川',coordinates:[-12.857411,15.222195],source:africaNaturalSources.rivers,note:'原河道上。西アフリカから大西洋へ。'},
 {id:'volta',kind:'river',label:'ボルタ川',coordinates:[0.165701,6.901964],source:africaNaturalSources.rivers,note:'原河道上。西アフリカを南へ流れギニア湾へ。'},
 {id:'ogooue',kind:'river',label:'オゴウェ川',coordinates:[10.310802,-0.649591],source:africaNaturalSources.rivers,note:'原河道上。赤道付近から大西洋へ。'},
 {id:'okavango',kind:'river',label:'オカバンゴ川',coordinates:[22.032481,-18.445245],source:africaNaturalSources.rivers,note:'原河道上。内陸の湿地へ向かう。海へ達する川として描かない。'},
 {id:'chad',kind:'river',label:'シャリ川',coordinates:[16.397146,10.556464],source:africaNaturalSources.rivers,note:'原河道上。チャド湖へ向かう内流水系。'},
];

export const africaSeaLabels:readonly AfricaNaturalLabel[]=[
 {id:'atlantic',kind:'sea',label:'大西洋',coordinates:[-17,-7],source:africaNaturalSources.seas,note:'海域名の概略位置。'},
 {id:'indian',kind:'sea',label:'インド洋',coordinates:[56,-7],source:africaNaturalSources.seas,note:'海域名の概略位置。'},
 {id:'mediterranean',kind:'sea',label:'地中海',coordinates:[18,36.5],source:africaNaturalSources.seas,note:'海域名の概略位置。'},
 {id:'red-sea',kind:'sea',label:'紅海',coordinates:[38.2,20],source:africaNaturalSources.seas,note:'海域名の概略位置。'},
 {id:'guinea',kind:'sea',label:'ギニア湾',coordinates:[1,1.5],source:africaNaturalSources.seas,note:'海域名の概略位置。'},
 {id:'mozambique-channel',kind:'sea',label:'モザンビーク海峡',coordinates:[41.5,-19],source:africaNaturalSources.seas,note:'海域名の概略位置。'},
 {id:'aden',kind:'sea',label:'アデン湾',coordinates:[48,12.3],source:africaNaturalSources.seas,note:'海域名の概略位置。'},
];

export const africaCurrentLabels:readonly AfricaNaturalLabel[]=[
 {id:'canary',kind:'current',label:'カナリア海流',coordinates:[-20,25],axis:[[-14,33],[-17.5,28],[-20,22],[-21,17]],direction:'南向き',temperature:'cold',source:africaNaturalSources.canary,note:flowNote},
 {id:'benguela',kind:'current',label:'ベンゲラ海流',coordinates:[9,-23],axis:[[16,-34],[12,-29],[10,-23],[10,-18]],direction:'北向き',temperature:'cold',source:africaNaturalSources.benguela,note:flowNote},
 {id:'agulhas',kind:'current',label:'アガラス海流',coordinates:[35,-30],axis:[[35.5,-27],[33.5,-30],[30,-33],[25,-35]],direction:'南西向き',temperature:'warm',source:africaNaturalSources.agulhas,note:flowNote+' 南端では反転するため、ベンゲラ海流へそのまま接続する線にしない。'},
];

export const africaWindLabels:readonly AfricaNaturalLabel[]=[
 {id:'harmattan',kind:'wind',label:'北東貿易風／ハルマッタン',coordinates:[-2,21],axis:[[7,25],[1,21],[-6,16]],direction:'北東から南西',season:'北半球の冬・西アフリカの乾季',source:africaNaturalSources.harmattan,note:flowNote+' 季節表示を付け、夏のモンスーンと同時観測の風場に見せない。'},
 {id:'west-african-monsoon',kind:'wind',label:'西アフリカモンスーン',coordinates:[-8,3.5],axis:[[-10,1],[-6,6],[-1,11]],direction:'南西から内陸へ',season:'北半球の夏・雨季',source:africaNaturalSources.monsoon,note:flowNote+' 季節表示を付ける。'},
 {id:'southeast-trades',kind:'wind',label:'南東貿易風',coordinates:[57,-22],axis:[[58,-24],[54,-20],[50,-16]],direction:'南東から北西',source:africaNaturalSources.trades,note:flowNote},
];

export const africaNaturalLabels:readonly AfricaNaturalLabel[]=[...africaTerrainLabels,...africaRiverLabels,...africaSeaLabels,...africaCurrentLabels,...africaWindLabels];

export type AfricaBasinReading={id:string;label:string;description:string;outlet:string;source:AfricaNaturalSource;preserveExisting?:boolean};
const basinReading=(id:string,label:string,description:string,outlet:string):AfricaBasinReading=>({id,label,description,outlet,source:africaNaturalSources.basins});
export const africaBasinReadings:readonly AfricaBasinReading[]=[
 {...basinReading('congo','コンゴ川',reading.nature.find(item=>item.title==='コンゴ盆地：湿潤な環境と森林')!.text,'大西洋'),preserveExisting:true},
 {...basinReading('nile','ナイル川','赤道付近の湖沼・東部高地から北へ向かい、乾燥する下流を通って地中海へ届きます。下流の雨量と、上流から運ばれる河川水を分けて読みます。','地中海'),source:africaNaturalSources.nile},
 basinReading('niger','ニジェール川','西部の河道は内陸で大きく曲がり、サヘルを通ったあと南へ向かいます。本流・支流の集水面とギニア湾の出口を合わせて読みます。','ギニア湾'),
 basinReading('zambezi','ザンベジ川','南部の広い高原に集まる水を東へ運び、モザンビーク側のインド洋へ流れます。国境をまたぐ集水面と本流を合わせて読みます。','インド洋'),
 basinReading('orange','オレンジ川','南部高地から西へ向かう水系です。乾燥する西岸でも上流から水が届き、大西洋へ流れます。海に近い土地の雨だけが流量を決めるわけではありません。','大西洋'),
 basinReading('limpopo','リンポポ川','南部の内陸から東へ向かい、インド洋へ流れる水系です。オレンジ川の西向きの流れと、隣り合う高原の分水を比べます。','インド洋'),
 basinReading('senegal','セネガル川','西アフリカの集水面から大西洋へ向かう水系です。下流の乾燥域だけを見ず、上流側の集水面と雨の分布を合わせて読みます。','大西洋'),
 basinReading('volta','ボルタ川','西アフリカの内陸から南へ向かい、ギニア湾へ流れます。国ごとの境界を越えてつながる集水面と、湖・河道の位置を読みます。','ギニア湾'),
 basinReading('ogooue','オゴウェ川','赤道付近の湿潤な西側を流れ、大西洋へ向かいます。隣接するコンゴ川の集水面との境界を見れば、同じ湿潤域でも出口が別の水系と分かります。','大西洋'),
 basinReading('okavango','オカバンゴ川・マクガディクガディ内流域','内陸の湿地・低地へ水が集まり、海へ流れ出ない内流水系です。表示面はBasinATLASの接続する内流域で、オカバンゴ湿地そのものの面積ではありません。','内陸湿地・塩湖'),
 basinReading('chad','チャド湖内流域','シャリ川などからチャド湖側へ水が集まる内流域です。海へ届く本流・河口を持つ外流水系と分けて読みます。集水域の面は、湖面の広さや現在の水位を表しません。','チャド湖'),
];
