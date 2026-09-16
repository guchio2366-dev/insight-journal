import climateCitiesData from '../../../public/assets/atlas/nature-v1/climate-cities.json';
import climateLegendData from '../../../public/assets/atlas/nature-v1/climate-legend.json';

export type NatureMode = 'climate' | 'water' | 'landform' | 'contour';

export type ClimateCity = {
  id:string; nameJa:string; stationId:string; stationName:string;
  longitude:number; latitude:number; elevationM:number; period:string;
  temperatureC:number[]; precipitationMm:number[]; annualPrecipitationMm:number;
  sourceUrl:string; inputSha256:string;
  koppenCode:string|null; koppenGridId?:number|null; koppenNote?:string;
};

export const climateCities = climateCitiesData as ClimateCity[];
export const climateLegend = climateLegendData;

export const natureModes:{id:NatureMode;label:string;caption:string}[] = [
  {id:'climate',label:'気候区分',caption:'ケッペン＝ガイガー区分 · 1991–2020'},
  {id:'water',label:'水資源',caption:'河川・湖・貯水池・主要帯水層'},
  {id:'landform',label:'地形',caption:'山脈・高原・平原と地形陰影'},
  {id:'contour',label:'標高（等高線）',caption:'標高500m間隔 · 主要線1,000m'},
];

export const climateFamilies = [
  {id:'A',label:'熱帯',color:'#78b6ba'},
  {id:'B',label:'乾燥帯',color:'#e6ad7b'},
  {id:'C',label:'温帯',color:'#98bba0'},
  {id:'D',label:'冷帯',color:'#9fb3cc'},
  {id:'E',label:'寒帯',color:'#c4c9cc'},
];

export const natureLabels = [
  {id:'california-current-label',name:'カリフォルニア海流\n〈寒流〉 ↓',lng:-119.0,lat:27,kind:'current-cold',priority:0,fields:['natural']},
  {id:'gulf-stream-label',name:'メキシコ湾流\n〈暖流〉 ↗',lng:-75.5,lat:27,kind:'current-warm',priority:0,fields:['natural']},
  {id:'upwelling-label',name:'沿岸湧昇',lng:-124.7,lat:40,kind:'water',priority:1,fields:['natural']},
  {id:'high-plains-aquifer',name:'ハイプレーンズ帯水層',lng:-101.2,lat:37.5,kind:'nature',priority:1,modes:['water']},
  {id:'central-valley-aquifer',name:'セントラルバレー帯水層系',lng:-120.5,lat:37.3,kind:'nature',priority:2,modes:['water']},
  {id:'colorado-river',name:'コロラド川',lng:-113.6,lat:35.2,kind:'water',priority:2,modes:['water']},
  {id:'columbia-river',name:'コロンビア川',lng:-119.7,lat:45.8,kind:'water',priority:2,modes:['water']},
  {id:'missouri-river',name:'ミズーリ川',lng:-100.4,lat:44.3,kind:'water',priority:2,modes:['water']},
  {id:'rockies-nature',name:'ロッキー山脈',lng:-111,lat:42.2,kind:'physical',priority:1,modes:['landform']},
  {id:'great-basin',name:'グレートベースン',lng:-116.4,lat:39,kind:'physical',priority:2,modes:['landform']},
  {id:'colorado-plateau',name:'コロラド高原',lng:-110.2,lat:36.8,kind:'physical',priority:2,modes:['landform']},
  {id:'appalachians-nature',name:'アパラチア山脈',lng:-80.8,lat:37.4,kind:'physical',priority:1,modes:['landform']},
  {id:'rockies-contour',name:'ロッキー山脈\n最高峰 約4,400 m',lng:-110,lat:44,kind:'physical',priority:1,modes:['contour']},
  {id:'appalachians-contour',name:'アパラチア山脈\n最高峰 約2,037 m',lng:-81,lat:37,kind:'physical',priority:1,modes:['contour']},
];

export const natureFeatureCopy:Record<string,{title:string;full:string;compact:string;anchor:[number,number]}> = {
  'water:Mississippi':{title:'ミシシッピ川',full:'中央部の広い流域の水をメキシコ湾へ集めます。支流のミズーリ川・オハイオ川とともに、農業地域の水循環と内陸輸送を結ぶ水系です。',compact:'中央部の広い流域とメキシコ湾を結ぶ水系。支流と農業・内陸輸送を一緒に読みます。',anchor:[-91.1,35.2]},
  'water:Missouri':{title:'ミズーリ川',full:'ロッキー山脈方面から大平原を経てミシシッピ川へ合流します。山地と平原をつなぐ流域であり、地元の降水だけでなく上流の水も関係します。',compact:'西部山地・大平原とミシシッピ川をつなぐ支流です。',anchor:[-100.4,44.3]},
  'water:Ohio':{title:'オハイオ川',full:'東部の水を集め、ミシシッピ川へ流れ込む主要支流です。山地から低地へ流れる水と、工業・農業地域の河川輸送をつなげて考えられます。',compact:'東部の山地・低地とミシシッピ川を結ぶ主要支流です。',anchor:[-86,38]},
  'water:Colorado':{title:'コロラド川',full:'西部山地の雪や雨に支えられ、乾燥する南西部へ流れます。ミード湖・パウエル湖などの貯水池と、都市・灌漑用水の関係を読めます。',compact:'山地の雪や雨と、乾燥する南西部の都市・灌漑用水を結びます。',anchor:[-113.6,35.2]},
  'water:Columbia':{title:'コロンビア川',full:'太平洋岸北西部の大きな流域を太平洋へ結ぶ河川です。山地の降水・融雪と、発電・灌漑・輸送との関係を読む手掛かりになります。',compact:'北西部の降水・融雪を集める河川。発電・灌漑・輸送とも関係します。',anchor:[-119.7,45.8]},
  'water:Sacramento':{title:'サクラメント川',full:'カリフォルニア中央谷の北部を流れます。山地からの水とシャスタ湖などの貯水が、夏に乾燥する農業地域の水利用につながります。',compact:'中央谷北部を流れ、山地・貯水池と夏の水利用をつなぎます。',anchor:[-121.8,39.2]},
  'water:San Joaquin':{title:'サンホアキン川',full:'カリフォルニア中央谷の南部を流れる水系です。シエラネバダ山脈側の水源と、谷の農地・地下水を区別して確認できます。',compact:'中央谷南部の水系。シエラネバダ側の水源と農地・地下水を読み比べます。',anchor:[-120.2,36.7]},
  'water:High Plains Aquifer':{title:'ハイプレーンズ帯水層',full:'グレートプレーンズ中央部の地下に広がります。砂や礫などの隙間を通る地下水を井戸でくみ上げ、灌漑（農地へ人工的に水を供給すること）に使います。地図の面は地下水の残量を示しません。',compact:'乾燥しやすい大平原の灌漑を支える主要帯水層。面は地下の全範囲や残水量ではありません。',anchor:[-101.5,38.2]},
  'water:Central Valley Aquifer System':{title:'セントラルバレー帯水層系',full:'カリフォルニア中央谷では、地層に蓄えられた地下水を井戸でくみ上げ、農地へ供給します。夏に雨が少ないため、河川・貯水池の水と組み合わせることが重要です。',compact:'中央谷の灌漑を支える地下水系。河川・貯水池と組み合わせて読みます。',anchor:[-120.4,37.4]},
  'water:Mississippi River Valley Alluvial Aquifer':{title:'ミシシッピ川谷沖積帯水層',full:'ミシシッピ川下流域では、川が運んだ砂や礫の隙間に地下水が蓄えられます。浅い帯水層からくみ上げる水は、地表の河川水とともに農業の水源になります。',compact:'ミシシッピ川谷の沖積地に沿う浅い主要帯水層です。',anchor:[-91.2,34.3]},
  'water:Floridan Aquifer System':{title:'フロリダ帯水層系',full:'フロリダ半島と周辺に広がる、石灰岩を主体とした帯水層系です。岩の割れ目や隙間を地下水が通り、水源になります。面の広さは地下水量や取水可能量を表しません。',compact:'石灰岩を主体とする広域帯水層。面は水量や水質を表しません。',anchor:[-82.2,29.0]},
  'water:lake-mead':{title:'ミード湖',full:'コロラド川の大規模な貯水池です。乾燥する南西部では、山地の降雪・河川流量・貯水と都市・灌漑用水がつながっています。',compact:'コロラド川の貯水池。山地の雪と南西部の水利用をつなぎます。',anchor:[-114.74,36.1]},
  'water:lake-powell':{title:'パウエル湖',full:'コロラド川上流側の貯水池です。降水の少ない地域へ水を運ぶ仕組みを、河川と貯水の両方から考える地点です。',compact:'コロラド川上流側の貯水池。河川と貯水を一緒に読みます。',anchor:[-111.48,37.02]},
  'water:shasta-lake':{title:'シャスタ湖',full:'サクラメント川水系の貯水池です。冬季の雨と山地の雪を貯え、乾燥する夏の都市・農業用水へつなぐ役割があります。',compact:'冬の雨・雪を、乾燥する夏の水利用へつなぐ貯水池です。',anchor:[-122.2,40.72]},
};

export const natureSources = [
  {id:'source-water-terms',title:'Water Science Glossary',publisher:'USGS Water Science School',url:'https://www.usgs.gov/water-science-school/science/water-science-glossary'},
  {id:'source-contour-reading',title:'Topographic Map Symbols',publisher:'USGS',url:'https://pubs.usgs.gov/gip/TopographicMapSymbols/topomapsymbols.pdf'},
  {id:'source-noaa-normals',title:'U.S. Climate Normals 1991–2020',publisher:'NOAA NCEI',url:'https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals'},
  {id:'source-koppen',title:'High-resolution Köppen–Geiger maps for 1901–2099',publisher:'Beck et al. / Scientific Data',url:'https://www.nature.com/articles/s41597-023-02549-6'},
  {id:'source-usgs-aquifers',title:'Principal Aquifers of the United States',publisher:'U.S. Geological Survey',url:'https://www.usgs.gov/mission-areas/water-resources/science/principal-aquifers-united-states'},
  {id:'source-terrain',title:'3D Elevation Program (3DEP)',publisher:'USGS / The National Map',url:'https://www.usgs.gov/3d-elevation-program'},
  {id:'source-natural-earth',title:'Natural Earth physical vectors and shaded relief',publisher:'Natural Earth',url:'https://www.naturalearthdata.com/'},
  {id:'source-noaa-current',title:'California Current Ecosystem and coastal upwelling',publisher:'NOAA',url:'https://ecowatch.noaa.gov/regions/california-current'},
];

for(const [name,title,anchor] of [
  ['Lake Superior','スペリオル湖',[-87.5,47.4]],['Lake Michigan','ミシガン湖',[-87,43.8]],
  ['Lake Huron','ヒューロン湖',[-82.5,44.7]],['Lake Erie','エリー湖',[-81.2,42.2]],
  ['Lake Ontario','オンタリオ湖',[-77.8,43.6]],
] as [string,string,[number,number]][]){
  natureFeatureCopy['water:'+name]={title,anchor,full:'五大湖を構成する淡水湖の一つです。湖・接続水路は水利用や内陸輸送を支え、周辺では湖の影響を受ける気温や降雪も見られます。',compact:'五大湖の淡水湖。水利用・輸送と、周辺の気候への作用を読みます。'};
}

// Natural Earth names remain the feature keys; titles use familiar Japanese names.
for(const [name,title,anchor,full] of [
 ['ロッキー山脈','ロッキー山脈',[-109,42],'西部内陸を南北に連なる高い山地です。山地で蓄えられた雪は河川の水源となり、東側には比較的乾燥した大平原が広がります。太平洋側のシエラネバダ・カスケードとは別の山系です。'],
 ['アパラチア山脈','アパラチア山脈',[-81,37],'東部を北東から南西へ延びる山地です。長い侵食を経てロッキーより低くなっていますが、斜面による降水の違いや、水の流れる先を分ける分水界をつくり、河川・交通路の位置にも関わります。'],
 ['カスケード山脈','カスケード山脈',[-121,45.5],'北西部の太平洋岸に沿う山地です。湿った空気が上昇する西側で雨や雪が多く、東側では水分が減るため、同じ緯度でも湿潤な海岸側と乾燥した内陸が隣り合います。'],
 ['シエラネバダ山脈','シエラネバダ山脈',[-119,37],'カリフォルニア中央谷の東にそびえる山地です。冬の降雪と春以降の融雪が河川・貯水池を通じて夏の水利用を支え、東側の盆地は雨陰で乾燥しやすくなります。'],
 ['コロラド高原','コロラド高原',[-110.5,36],'南西部に広がる標高の高い台地です。乾燥した地表を河川が深く刻み、コロラド川などの峡谷が発達しています。平らに見える土地でも標高は高いことを等高線で確かめられます。'],
 ['グレートベースン','グレートベースン',[-116.4,39],'西部内陸に山地と盆地が交互に広がる地域です。内陸流域とは、水が海へ流れ出ず、地域内の湖や地表に集まる範囲です。そこで水が蒸発すると、溶けていた塩類が残ります。乾燥と閉じた水系は塩類の集積や水利用の制約につながります。'],
 ['グレートプレーンズ','グレートプレーンズ',[-101,40],'ロッキー東麓から中央部へ広がる平原です。東へなだらかに低くなり、一般に東側ほど水分条件が改善します。広い農地、降水、ハイプレーンズ帯水層の利用を見比べられます。'],
 ['中央低地','中央平原（中央低地）',[-91,42],'五大湖周辺からミシシッピ川流域に続く低地です。斜面や段差が少ないため、大型農機で広い畑を連続して作業できます。川や湖を使う輸送も重なり、内陸の生産と出荷を支えます。'],
 ['大西洋海岸平野','大西洋岸平野',[-79,34],'東海岸の山地より海側に広がる低い平野です。傾斜の緩い土地には湿地や低地も多く、農業や都市利用では土の排水性、河川・沿岸の水との関係が重要になります。'],
] as [string,string,[number,number],string][]){natureFeatureCopy['landform:'+name]={title,anchor,full,compact:full};}
