export type AfricaClimateCity={
 id:string;
 countryCode:string;
 name:string;
 stationId:string;
 stationName:string;
 coordinates:[number,number];
 elevationM:number;
 temperatureC:(number|null)[];
 precipitationMm:(number|null)[];
 normalPeriod:string;
 sourceUrl:string;
 sourceName:string;
 sourceRetrievedAt:string;
 sourceTermsUrl:string;
 sourceSha256:string[];
 notes:string[];
 missingMonths:{temperature:number[];precipitation:number[]};
 reading:string;
 classification:{
  id:number;code:string;name:string;displayName?:string;description:string;color:string;
  period:string;sourceName:string;sourceUrl:string;license:string;licenseUrl:string;
  grid:string;gridSha256:string;resolutionDegrees:number;row:number;column:number;
  gridWidth?:number;maskedMapMissing?:boolean;
 };
 geographicReason:string|null;
 geographicReasonStatus:string;
 mechanismSourceUrl:string;
 mechanismSourceName:string;
 agricultureLink:string;
};

export const africaClimateCityCoverage='月別平年値は12観測所の地点値です。東部高地、南北端の冬雨地域、マダガスカルの東岸・高地・西部・南西部を比べられます。コンゴ盆地の赤道雨林観測所は未収録です。色分けは別資料の0.1度格子です。';
export const africaClimateCityReuseSource='public/assets/atlas/west-asia-v1/climate-cities.json';

// Reuse the already published station record without fetching or estimating
// observations. The point stays at the station, not at Cairo's city centre.
// The independent climate-class grid is sampled at that exact point; a station
// normal does not by itself establish the physical cause of the local climate.
export const africaClimateCities:readonly AfricaClimateCity[]=[{
 id:'helwan',
 countryCode:'EGY',
 name:'ヘルワン（カイロ南部）',
 stationId:'62378',
 stationName:'HELWAN',
 coordinates:[31.33,29.85],
 elevationM:139,
 temperatureC:[13.9,15.2,17.9,21.8,25.3,27.9,29.2,29,27.5,24.6,20,15.7],
 precipitationMm:[6,3.2,8.9,0.9,0,0,0,0,0.2,1.2,1.2,8.1],
 normalPeriod:'1991–2020',
 sourceUrl:'https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml.php?n=62378&y=2025&m=12&e=6&r=3&s=1&k=0',
 sourceName:'気象庁 ClimatView',
 sourceRetrievedAt:'2026-09-28',
 sourceTermsUrl:'https://www.jma.go.jp/jma/kishou/info/coment.html',
 sourceSha256:['75a6790a9097d3590f034a8814f750b37e77805161e0f64141dbf88dc28fd04b'],
 notes:['格子の気候分類とは別の、観測所の月別平年値です。'],
 missingMonths:{temperature:[],precipitation:[]},
 reading:'月平均気温は1月の13.9℃から7月の29.2℃まで変化する。月降水量は3月が8.9mm、5月が0.0mm。12か月の降水量平年値の合計は29.7mm。都市全域の平均ではなく、掲載した観測所の平年値を示す。',
 classification:{
  id:4,code:'BWh',name:'高温の砂漠気候',
  description:"Beckの乾燥限界R（mm/年）は年平均気温T（℃）×20に、夏半年へ年雨量の70%以上が集中する場合280、冬半年に70%以上なら0、それ以外は140を加える。年雨量がR/2未満、年平均気温18℃以上がBWh。乾燥帯は熱帯・温帯より先に判定する。",color:'#e6ad7b',
  period:'1991–2020',sourceName:'Beck et al. (2023) Köppen-Geiger 0.1-degree classification',
  sourceUrl:'https://doi.org/10.1038/s41597-023-02549-6',license:'CC BY 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
  grid:'public/assets/atlas/africa-physical-v1/climate.values.gz',
  gridSha256:'69409b0b30c14933702e5b7a7b4c2103f5d5db6465d585fb65394fb33bf9c9e7',
  resolutionDegrees:.1,row:91,column:583,
 },
 geographicReason:'北回帰線に近いサハラ東部では、亜熱帯高圧帯の下降気流が雲を作りにくい。ナイル沿いの市街地でも、この地点の降水量平年値は小さい。',
 geographicReasonStatus:'',
 mechanismSourceUrl:'https://weather.metoffice.gov.uk/learn-about/weather/atmosphere/global-circulation-patterns',
 mechanismSourceName:'英国気象庁：大気の大循環',
 agricultureLink:'雨だけに頼る栽培は難しく、ナイルの水を利用する灌漑が農地を支える。河川流量や取水可能量はこの雨温図からは分からない。',
},
...([
 {id:'dakar',countryCode:'SEN',name:'ダカール',stationId:'61641',stationName:'DAKAR/YOFF',coordinates:[-17.5,14.73],elevationM:24,temperatureC:[21.5,20.9,21.2,21.6,23.1,25.8,27.4,27.8,27.9,28.1,26.4,23.8],precipitationMm:[0,0.7,0.1,0,0.3,8.7,55.3,166.9,140.4,27.1,0.8,1],code:'BSh',reading:'11～5月の降水量は非常に少なく、雨は8～9月に集中する。海に面した地点でも、年間を通じて雨が多いわけではない。',reason:'北半球の夏に熱帯収束帯が北上すると湿った空気が入り、冬は乾いた北東風が卓越する。海岸の風と海流は気温にも関わるが、雨季の到来を海岸だけで説明できない。',agriculture:'サヘルの天水栽培や放牧では雨季の長さが大切になる。ダカール1地点の値をセネガル全域の栽培条件とみなさない。'},
 {id:'bamako',countryCode:'MLI',name:'バマコ',stationId:'61291',stationName:'BAMAKO/SENOU',coordinates:[-7.95,12.53],elevationM:380,temperatureC:[25,28.1,30.9,32.4,31.4,28.8,26.4,25.6,26.1,27.2,26.8,25.2],precipitationMm:[0.4,0,5.4,14.8,72.3,116.5,239.3,270.3,176.1,54.3,1.9,0],code:'Aw',reading:'雨は6～9月に集中し、8月が270.3 mm。乾季の1～2月はほぼ降らない。',reason:'北半球の夏、熱帯収束帯の北上と西アフリカモンスーンによって湿った空気が内陸へ入る。冬は乾いた北東風の影響が強まる。',agriculture:'雨季に合わせた天水の穀物栽培が考えられるが、収量は土壌・品種・管理にも左右される。'},
 {id:'dar-es-salaam',countryCode:'TZA',name:'ダルエスサラーム',stationId:'63894',stationName:'DAR ES SALAAM INT',coordinates:[39.2,-6.87],elevationM:55,temperatureC:[28.2,28.2,27.7,26.7,26,24.6,23.8,24.1,24.9,26.1,26.9,27.9],precipitationMm:[53.4,66,167.6,259.5,162.8,22,16.5,15.3,21.8,79,121.7,135.2],code:'Aw',reading:'3～5月の長雨と10～12月の短雨が見える。7～8月は月降水量が20 mm未満。西アフリカの一山型雨季と形が異なる。',reason:'赤道に近い東アフリカ沿岸では、熱帯収束帯の季節移動とインド洋からの風が降水の時期に関わる。海岸の低地にある観測所で、高地の気温を代表しない。',agriculture:'雨季の時期を分けて読むことが作付けに重要。雨の多い月でも、作物の分布や収量はこの観測点だけでは決まらない。'},
 {id:'addis-ababa',countryCode:'ETH',name:'アディスアベバ',stationId:'63450',stationName:'ADDIS ABABA-BOLE',coordinates:[38.75,9.03],elevationM:2354,temperatureC:[16.4,17.4,18.4,18.6,18.8,17.4,16.1,16.1,16.5,16.5,16,15.4],precipitationMm:[15.2,24.7,55.4,71.3,110.6,136,240.4,267.3,151.9,49.4,17.7,7],code:'Cwb',reading:'標高2,354 mの観測所では月平均気温が15.4～18.8℃で推移する。雨は6～9月に多く、8月は267.3 mm、12月は7.0 mm。高地の涼しさと夏の雨季を同時に読める。',reason:'赤道に比較的近くても、この観測所はエチオピア高原の標高2,354 mにあり、気温は周辺低地より低くなりやすい。雨季には熱帯収束帯の北上に伴う湿った空気が関わる。高地を独立した気候区分として扱わず、地点の標高と格子のCwbを分けて読む。',agriculture:'雨季の時期は栽培や水管理に関わる。ただし、この観測所の雨温図から高原全域の作物分布や収量は決められない。',sourceUrl:'https://ds.data.jma.go.jp/tcc/tcc/products/climate/normal/parts/NrmMonth_e.php?stn=63450',mechanismSourceUrl:'https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/temperature/temperature-inversion',mechanismSourceName:'英国気象庁：高度と気温'},
 {id:'cape-town',countryCode:'ZAF',name:'ケープタウン',stationId:'68816',stationName:'CAPE TOWN INTNL. AIRPORT',coordinates:[18.6,-33.97],elevationM:46,temperatureC:[21.6,21.7,20.2,17.7,15.3,13.1,12.5,12.9,14.4,16.8,18.5,20.6],precipitationMm:[9.6,10.6,13.1,41.4,63.1,89,81.2,73,44.1,29,26.4,12.1],code:'Csb',reading:'南半球の夏に当たる1～2月は月降水量が約10 mmで、冬の6～8月は73.0～89.0 mm。最暖月の2月も21.7℃で、夏の乾燥と温暖な気温が見える。',reason:'大陸南西端では夏に亜熱帯高圧帯の影響を受けて乾きやすく、冬には偏西風帯に伴う低気圧の雨が届く。この空港地点の格子はCsbであり、地図の別地点にあるCsaの表示を空港へ当てはめない。',agriculture:'冬に多い雨を利用する栽培では、乾いた夏に備えた水管理が重要になる。この地点の降水だけで地域全体の農業用水量は分からない。',sourceUrl:'https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml_nrm.php?e=6&k=0&m=1&n=68816&r=0&s=1&y=2026',mechanismSourceUrl:'https://weather.metoffice.gov.uk/climate/climate-explained/climate-zones',mechanismSourceName:'英国気象庁：地中海性気候'},
] as const).map(item=>{
 const classRow=({BSh:{id:6,name:'高温のステップ気候',description:"Beckの乾燥限界R（mm/年）は年平均気温T（℃）×20に、夏半年へ年雨量の70%以上が集中する場合280、冬半年に70%以上なら0、それ以外は140を加える。年雨量がR/2以上・R未満、年平均気温18℃以上がBSh。",color:'#ebc38e'},Aw:{id:3,name:'サバナ気候',description:"乾燥帯を除き、最寒月の平均気温18℃以上。最少雨月の雨量P（mm）が60未満、かつ100−年雨量/25未満となる熱帯の区分。Beckではこのサバナ型をAwで表す。",color:'#a1cdd0'},Cwb:{id:12,name:'冬に乾燥する温暖夏の温帯',description:'格子の分類では最寒月が0℃超～18℃未満、最暖月が10℃超・22℃未満で、10℃超の月が4か月以上。冬の最少雨月は夏の最多雨月の10分の1未満。',color:'#a7c59f'},Csb:{id:9,name:'夏に乾燥する温暖夏の温帯',description:'格子の分類では最寒月が0℃超～18℃未満、最暖月が10℃超・22℃未満で、10℃超の月が4か月以上。夏の最少雨月は40 mm未満かつ冬の最多雨月の3分の1未満。',color:'#bbc898'}} as const)[item.code];
 const row=Math.floor((39-item.coordinates[1])*10),column=Math.floor((item.coordinates[0]+27)*10);
 const extra=item as typeof item & {sourceUrl?:string;mechanismSourceUrl?:string;mechanismSourceName?:string};
 return {id:item.id,countryCode:item.countryCode,name:item.name,stationId:item.stationId,stationName:item.stationName,coordinates:[...item.coordinates] as [number,number],elevationM:item.elevationM,temperatureC:[...item.temperatureC],precipitationMm:[...item.precipitationMm],normalPeriod:'1991–2020',sourceUrl:extra.sourceUrl??`https://ds.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml_nrm.php?m=1&n=${item.stationId}`,sourceName:item.id==='addis-ababa'?'気象庁 月別平年値':'気象庁 ClimatView',sourceRetrievedAt:'2026-10-08',sourceTermsUrl:'https://www.jma.go.jp/jma/kishou/info/coment.html',sourceSha256:[],notes:item.id==='addis-ababa'||item.id==='cape-town'?['観測所の月別平年値です。格子の気候区分とは別の資料です。各月に平年値があることは、基準期間の全観測が無欠測だったことを意味しません。']:['観測所の月別平年値です。格子の気候区分とは別の資料です。'],missingMonths:{temperature:[],precipitation:[]},reading:item.reading,classification:{...classRow,displayName:item.code==='Cwb'?'温帯冬季少雨気候':item.code==='Csb'?'地中海性気候・夏が比較的涼しい型':undefined,code:item.code,period:'1991–2020',sourceName:'Beck et al. (2023) Köppen-Geiger 0.1-degree classification',sourceUrl:'https://doi.org/10.1038/s41597-023-02549-6',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',grid:'public/assets/atlas/africa-physical-v1/climate.values.gz',gridSha256:'69409b0b30c14933702e5b7a7b4c2103f5d5db6465d585fb65394fb33bf9c9e7',resolutionDegrees:.1,row,column},geographicReason:item.reason,geographicReasonStatus:'',mechanismSourceUrl:extra.mechanismSourceUrl??'https://www.noaa.gov/jetstream/tropical/convergence-zone',mechanismSourceName:extra.mechanismSourceName??'NOAA：熱帯収束帯',agricultureLink:item.agriculture};
 }),
...[
 {
  "id": "toamasina",
  "countryCode": "MDG",
  "name": "トアマシナ",
  "stationId": "67095",
  "stationName": "TOAMASINA",
  "coordinates": [
   49.4,
   -18.12
  ],
  "elevationM": 5,
  "temperatureC": [
   26.9,
   27,
   26.6,
   25.5,
   23.8,
   22.1,
   21,
   21.4,
   22.1,
   23.6,
   25,
   26.4
  ],
  "precipitationMm": [
   409.9,
   386.9,
   435.9,
   268.5,
   252.5,
   257.6,
   275,
   167.1,
   128.3,
   99,
   143.3,
   233.6
  ],
  "normalPeriod": "1991–2020",
  "sourceUrl": "https://ds.data.jma.go.jp/tcc/tcc/products/climate/normal/parts/NrmMonth_e.php?stn=67095",
  "sourceName": "気象庁 月別平年値",
  "sourceRetrievedAt": "2026-10-09",
  "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
  "sourceSha256": [],
  "notes": [
   "観測所の月別平年値です。格子の気候区分とは別の資料です。12か月の平年値掲載は、基準期間の全観測が無欠測だったことを意味しません。",
   "海岸の観測所は表示用の陸地マスクで欠測です。保持済みBeck原格子の観測所座標を直接照合し、近隣格子による補完はしていません。"
  ],
  "missingMonths": {
   "temperature": [],
   "precipitation": []
  },
  "reading": "東岸は一年中多雨で、最少雨の10月も99.0 mm。南半球の冬にも雨が続く。",
  "classification": {
   "id": 1,
   "code": "Af",
   "name": "熱帯雨林気候",
   "color": "#529ca5",
   "description": "乾燥帯を除き、最寒月の平均気温18℃以上、全ての月の雨量60 mm以上。明瞭な乾季のない熱帯の区分。",
   "period": "1991–2020",
   "sourceName": "Beck et al. (2023) Köppen-Geiger 0.1-degree classification",
   "sourceUrl": "https://doi.org/10.1038/s41597-023-02549-6",
   "license": "CC BY 4.0",
   "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
   "grid": "data-source/atlas/africa/climate-normals/original-classification.values.gz",
   "gridSha256": "dfdd1432906ace93faffc58ef15c8e83a80983d78168cf9b79c8bb9561ec4968",
   "resolutionDegrees": 0.1,
   "row": 571,
   "column": 764,
   "gridWidth": 910,
   "maskedMapMissing": true
  },
  "geographicReason": "インド洋からの南東貿易風が東岸に湿った空気を運ぶ。中央高地の東斜面で空気が持ち上がり、冬にも風上側で雨が降る。西部・南西部の乾季と対照的である。",
  "geographicReasonStatus": "",
  "mechanismSourceUrl": "https://www.meteomadagascar.mg/wp-content/uploads/Publication_Changement_Climatique_2023_web.pdf",
  "mechanismSourceName": "Météo Madagascar（2023）p.7–9",
  "agricultureLink": "湿潤な東岸では稲や樹木作物が見られる。多雨は栽培を支える一方、排水やサイクロンへの備え、港へ運ぶ道路と加工の条件も関わる。"
 },
 {
  "id": "antananarivo",
  "countryCode": "MDG",
  "name": "アンタナナリボ",
  "stationId": "67083",
  "stationName": "ANTANANARIVO/IVATO",
  "coordinates": [
   47.48,
   -18.8
  ],
  "elevationM": 1279,
  "temperatureC": [
   21.3,
   21.4,
   21.1,
   20.1,
   17.9,
   15.5,
   14.6,
   15.6,
   17.3,
   19.4,
   20.8,
   21.4
  ],
  "precipitationMm": [
   379.4,
   286.3,
   227.5,
   43.9,
   11.6,
   3.8,
   5.9,
   4.9,
   9.8,
   44.7,
   143.4,
   283.2
  ],
  "normalPeriod": "1991–2020",
  "sourceUrl": "https://ds.data.jma.go.jp/tcc/tcc/products/climate/normal/parts/NrmMonth_e.php?stn=67083",
  "sourceName": "気象庁 月別平年値",
  "sourceRetrievedAt": "2026-10-09",
  "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
  "sourceSha256": [],
  "notes": [
   "観測所の月別平年値です。格子の気候区分とは別の資料です。12か月の平年値掲載は、基準期間の全観測が無欠測だったことを意味しません。"
  ],
  "missingMonths": {
   "temperature": [],
   "precipitation": []
  },
  "reading": "標高1,279 mの高地。7月14.6℃と涼しく、6月の降水量は3.8 mm。11～3月の夏に雨が多い。",
  "classification": {
   "id": 12,
   "code": "Cwb",
   "name": "冬に乾燥する温暖夏の温帯",
   "color": "#a7c59f",
   "description": "最寒月が0℃超～18℃未満、最暖月が22℃未満、10℃超の月が4か月以上。冬の最少雨月は夏の最多雨月の10分の1未満。",
   "period": "1991–2020",
   "sourceName": "Beck et al. (2023) Köppen-Geiger 0.1-degree classification",
   "sourceUrl": "https://doi.org/10.1038/s41597-023-02549-6",
   "license": "CC BY 4.0",
   "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
   "grid": "public/assets/atlas/africa-physical-v1/climate.values.gz",
   "gridSha256": "69409b0b30c14933702e5b7a7b4c2103f5d5db6465d585fb65394fb33bf9c9e7",
   "resolutionDegrees": 0.1,
   "row": 578,
   "column": 744,
   "gridWidth": 910,
   "maskedMapMissing": false
  },
  "geographicReason": "中央高地の標高が低地より気温を下げる。冬は東岸の風上側で水分を落とした貿易風の影響で乾き、夏は熱帯収束帯に伴う対流・雷雨が高地にも雨をもたらす。",
  "geographicReasonStatus": "",
  "mechanismSourceUrl": "https://www.meteomadagascar.mg/wp-content/uploads/Publication_Changement_Climatique_2023_web.pdf",
  "mechanismSourceName": "Météo Madagascar（2023）p.7–9",
  "agricultureLink": "高地の稲作などでは夏の雨と灌漑・谷の水利用が重要。冬の少雨と涼しさを踏まえ、作付け時期・水管理・都市市場への輸送を考える。"
 },
 {
  "id": "mahajanga",
  "countryCode": "MDG",
  "name": "マハジャンガ",
  "stationId": "67027",
  "stationName": "MAHAJANGA",
  "coordinates": [
   46.35,
   -15.67
  ],
  "elevationM": 26,
  "temperatureC": [
   27.6,
   27.8,
   28.2,
   28.2,
   26.9,
   25.4,
   24.8,
   25.3,
   26.2,
   27.5,
   28.3,
   28.2
  ],
  "precipitationMm": [
   491,
   318.2,
   186.5,
   45.9,
   6.3,
   0.6,
   1.6,
   0.9,
   1,
   15.5,
   131,
   211.7
  ],
  "normalPeriod": "1991–2020",
  "sourceUrl": "https://ds.data.jma.go.jp/tcc/tcc/products/climate/normal/parts/NrmMonth_e.php?stn=67027",
  "sourceName": "気象庁 月別平年値",
  "sourceRetrievedAt": "2026-10-09",
  "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
  "sourceSha256": [],
  "notes": [
   "観測所の月別平年値です。格子の気候区分とは別の資料です。12か月の平年値掲載は、基準期間の全観測が無欠測だったことを意味しません。",
   "海岸の観測所は表示用の陸地マスクで欠測です。保持済みBeck原格子の観測所座標を直接照合し、近隣格子による補完はしていません。"
  ],
  "missingMonths": {
   "temperature": [],
   "precipitation": []
  },
  "reading": "北西部は1月491.0 mmの雨季と6月0.6 mmの乾季が明瞭。東岸の通年雨と異なる。",
  "classification": {
   "id": 3,
   "code": "Aw",
   "name": "サバナ気候",
   "color": "#a1cdd0",
   "description": "乾燥帯を除き、最寒月の平均気温18℃以上。最少雨月の雨量P（mm）が60未満、かつ100−年雨量/25未満となる熱帯の区分。Beckではこのサバナ型をAwで表す。",
   "period": "1991–2020",
   "sourceName": "Beck et al. (2023) Köppen-Geiger 0.1-degree classification",
   "sourceUrl": "https://doi.org/10.1038/s41597-023-02549-6",
   "license": "CC BY 4.0",
   "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
   "grid": "data-source/atlas/africa/climate-normals/original-classification.values.gz",
   "gridSha256": "dfdd1432906ace93faffc58ef15c8e83a80983d78168cf9b79c8bb9561ec4968",
   "resolutionDegrees": 0.1,
   "row": 546,
   "column": 733,
   "gridWidth": 910,
   "maskedMapMissing": true
  },
  "geographicReason": "冬の南東貿易風に対して中央高地の風下に位置し、雨が少ない。夏は北西モンスーンと熱帯収束帯の湿った空気が入り、対流性の雨が多くなる。",
  "geographicReasonStatus": "",
  "mechanismSourceUrl": "https://www.meteomadagascar.mg/wp-content/uploads/Publication_Changement_Climatique_2023_web.pdf",
  "mechanismSourceName": "Météo Madagascar（2023）p.7–9",
  "agricultureLink": "雨季の稲作などと乾季の用水確保を分けて読む。貯蔵・精米・道路や港との接続が食料利用と販売を支える。"
 },
 {
  "id": "algiers",
  "countryCode": "DZA",
  "name": "アルジェ",
  "stationId": "60369",
  "stationName": "ALGER-PORT",
  "coordinates": [
   3.1,
   36.77
  ],
  "elevationM": 9,
  "temperatureC": [
   14.1,
   14,
   15.8,
   17.3,
   19.7,
   23.1,
   25.8,
   26.6,
   24.6,
   22.3,
   17.9,
   15.1
  ],
  "precipitationMm": [
   68.9,
   83.7,
   66.4,
   60.9,
   38.8,
   12.5,
   1.6,
   7.1,
   33.4,
   58.4,
   137.8,
   105.7
  ],
  "normalPeriod": "1991–2020",
  "sourceUrl": "https://ds.data.jma.go.jp/tcc/tcc/products/climate/normal/parts/NrmMonth_e.php?stn=60369",
  "sourceName": "気象庁 月別平年値",
  "sourceRetrievedAt": "2026-10-09",
  "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
  "sourceSha256": [],
  "notes": [
   "観測所の月別平年値です。格子の気候区分とは別の資料です。12か月の平年値掲載は、基準期間の全観測が無欠測だったことを意味しません。"
  ],
  "missingMonths": {
   "temperature": [],
   "precipitation": []
  },
  "reading": "北半球の夏は乾き、7月1.6 mm。11月137.8 mmと冬に雨が多い。ケープタウンの冬雨とは雨の多い月が約半年反転する。",
  "classification": {
   "id": 8,
   "code": "Csa",
   "name": "夏に乾燥する高温夏の温帯",
   "color": "#d9ce8d",
   "description": "乾燥帯を除き、最寒月が0℃超～18℃未満、最暖月が22℃以上。夏の最少雨月は40 mm未満、かつ冬の最多雨月の3分の1未満。北半球の夏半年は4～9月、南半球は10～3月。",
   "period": "1991–2020",
   "sourceName": "Beck et al. (2023) Köppen-Geiger 0.1-degree classification",
   "sourceUrl": "https://doi.org/10.1038/s41597-023-02549-6",
   "license": "CC BY 4.0",
   "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
   "grid": "public/assets/atlas/africa-physical-v1/climate.values.gz",
   "gridSha256": "69409b0b30c14933702e5b7a7b4c2103f5d5db6465d585fb65394fb33bf9c9e7",
   "resolutionDegrees": 0.1,
   "row": 22,
   "column": 301,
   "gridWidth": 910,
   "maskedMapMissing": false
  },
  "geographicReason": "地中海沿岸は夏に亜熱帯高圧帯の下降気流の影響で乾燥し、冬は偏西風に伴う低気圧の雨が届く。同じ地中海性気候のケープタウンとは半球が違い、季節の月が反転する。",
  "geographicReasonStatus": "",
  "mechanismSourceUrl": "https://weather.metoffice.gov.uk/climate/climate-explained/climate-zones",
  "mechanismSourceName": "英国気象庁：気候帯",
  "agricultureLink": "冬雨は北部の小麦などの栽培条件になる。夏には灌漑・貯水が重要で、製粉と都市市場、港を通じた供給も関わる。"
 },
 {
  "id": "durban",
  "countryCode": "ZAF",
  "name": "ダーバン",
  "stationId": "68588",
  "stationName": "DURBAN INTNL. AIRPORT",
  "coordinates": [
   30.95,
   -29.97
  ],
  "elevationM": 8,
  "temperatureC": [
   24.6,
   25.1,
   24.1,
   22.1,
   19.8,
   17.5,
   17.2,
   18.4,
   19.6,
   20.5,
   21.9,
   23.5
  ],
  "precipitationMm": [
   138,
   117.6,
   93.3,
   81.1,
   29.1,
   32,
   56.6,
   30.5,
   70.7,
   97.1,
   125.2,
   116.3
  ],
  "normalPeriod": "1991–2020",
  "sourceUrl": "https://ds.data.jma.go.jp/tcc/tcc/products/climate/normal/parts/NrmMonth_e.php?stn=68588",
  "sourceName": "気象庁 月別平年値",
  "sourceRetrievedAt": "2026-10-09",
  "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
  "sourceSha256": [],
  "notes": [
   "観測所の月別平年値です。格子の気候区分とは別の資料です。12か月の平年値掲載は、基準期間の全観測が無欠測だったことを意味しません。"
  ],
  "missingMonths": {
   "temperature": [],
   "precipitation": []
  },
  "reading": "1月138.0 mmで夏に雨が多く、冬にも降水がある。南西岸のケープタウンの冬雨と対比できる。",
  "classification": {
   "id": 14,
   "code": "Cfa",
   "name": "温暖湿潤気候",
   "color": "#98bba0",
   "description": "乾燥帯を除き、最寒月が0℃超～18℃未満、最暖月が22℃以上。夏少雨（夏の最少雨月40 mm未満かつ冬の最多雨月の3分の1未満）にも冬少雨（冬の最少雨月が夏の最多雨月の10分の1未満）にも該当しない。",
   "period": "1991–2020",
   "sourceName": "Beck et al. (2023) Köppen-Geiger 0.1-degree classification",
   "sourceUrl": "https://doi.org/10.1038/s41597-023-02549-6",
   "license": "CC BY 4.0",
   "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
   "grid": "public/assets/atlas/africa-physical-v1/climate.values.gz",
   "gridSha256": "69409b0b30c14933702e5b7a7b4c2103f5d5db6465d585fb65394fb33bf9c9e7",
   "resolutionDegrees": 0.1,
   "row": 689,
   "column": 579,
   "gridWidth": 910,
   "maskedMapMissing": false
  },
  "geographicReason": "南アフリカ東岸では暖流側のインド洋から湿った空気が入り、夏の対流や内陸への地形的な上昇が雨に関わる。亜熱帯高圧帯の影響が強い南西岸とは海側の条件が異なる。",
  "geographicReasonStatus": "",
  "mechanismSourceUrl": "https://weather.metoffice.gov.uk/climate/climate-explained/climate-zones",
  "mechanismSourceName": "英国気象庁：気候帯",
  "agricultureLink": "暖かく湿った東岸ではサトウキビなどの栽培条件がある。収穫期の雨、水管理、加工工場と港への輸送も生産・流通に関わる。"
 },
 {
  "id": "toliara",
  "countryCode": "MDG",
  "name": "トゥリアラ",
  "stationId": "67161",
  "stationName": "TOLIARA",
  "coordinates": [
   43.73,
   -23.38
  ],
  "elevationM": 8,
  "temperatureC": [
   28.2,
   28,
   27.8,
   26.1,
   23.8,
   21.8,
   21.3,
   22.1,
   23.2,
   24.9,
   26.4,
   27.7
  ],
  "precipitationMm": [
   171.6,
   87.8,
   38.5,
   9.4,
   8.5,
   7.5,
   9.2,
   1.6,
   6.1,
   9.2,
   42,
   62.4
  ],
  "normalPeriod": "1991–2020",
  "sourceUrl": "https://ds.data.jma.go.jp/tcc/tcc/products/climate/normal/parts/NrmMonth_e.php?stn=67161",
  "sourceName": "気象庁 月別平年値",
  "sourceRetrievedAt": "2026-10-09",
  "sourceTermsUrl": "https://www.jma.go.jp/jma/kishou/info/coment.html",
  "sourceSha256": [],
  "notes": [
   "観測所の月別平年値です。格子の気候区分とは別の資料です。12か月の平年値掲載は、基準期間の全観測が無欠測だったことを意味しません。"
  ],
  "missingMonths": {
   "temperature": [],
   "precipitation": []
  },
  "reading": "南西岸は年453.8 mmと少雨。雨は夏に偏り、8月は1.6 mm。北西部の雨季よりも年間の雨量が小さい。",
  "classification": {
   "id": 6,
   "code": "BSh",
   "name": "高温のステップ気候",
   "color": "#ebc38e",
   "description": "Beckの乾燥限界R（mm/年）は年平均気温T（℃）×20に、夏半年へ年雨量の70%以上が集中する場合280、冬半年に70%以上なら0、それ以外は140を加える。年雨量がR/2以上・R未満、年平均気温18℃以上がBSh。",
   "period": "1991–2020",
   "sourceName": "Beck et al. (2023) Köppen-Geiger 0.1-degree classification",
   "sourceUrl": "https://doi.org/10.1038/s41597-023-02549-6",
   "license": "CC BY 4.0",
   "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
   "grid": "public/assets/atlas/africa-physical-v1/climate.values.gz",
   "gridSha256": "69409b0b30c14933702e5b7a7b4c2103f5d5db6465d585fb65394fb33bf9c9e7",
   "resolutionDegrees": 0.1,
   "row": 623,
   "column": 707,
   "gridWidth": 910,
   "maskedMapMissing": false
  },
  "geographicReason": "南東貿易風に対して中央高地の風下にあり、東岸で水分を落とした空気が届く。南西部は熱帯収束帯の影響も北部より弱く、長い乾季と少雨が生じる。",
  "geographicReasonStatus": "",
  "mechanismSourceUrl": "https://www.meteomadagascar.mg/wp-content/uploads/Publication_Changement_Climatique_2023_web.pdf",
  "mechanismSourceName": "Météo Madagascar（2023）p.7–9",
  "agricultureLink": "少雨の地域では耐乾性作物や家畜飼養、水の確保が重要。雨季の変動、飼料・獣医療・市場への接続を含めて農牧業を読む。"
 }
] as AfricaClimateCity[]];

export function africaClimateCityById(id:string):AfricaClimateCity|undefined {
 return africaClimateCities.find(city=>city.id===id);
}
