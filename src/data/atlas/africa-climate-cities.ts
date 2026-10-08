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
  id:number;code:string;name:string;description:string;color:string;
  period:string;sourceName:string;sourceUrl:string;license:string;licenseUrl:string;
  grid:string;gridSha256:string;resolutionDegrees:number;row:number;column:number;
 };
 geographicReason:string|null;
 geographicReasonStatus:string;
 mechanismSourceUrl:string;
 mechanismSourceName:string;
 agricultureLink:string;
};

export const africaClimateCityCoverage='月別平年値は4観測所の地点値です。赤道雨林・東アフリカ高地・南端の冬雨地域には観測所の雨温図をまだ収録していません。色分けは別資料の0.1度格子です。';
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
  description:'乾燥帯のうち、高温の砂漠気候に当たる区分。',color:'#e6ad7b',
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
 {id:'dakar',countryCode:'SEN',name:'ダカール／ヨフ',stationId:'61641',stationName:'DAKAR/YOFF',coordinates:[-17.5,14.73],elevationM:24,temperatureC:[21.5,20.9,21.2,21.6,23.1,25.8,27.4,27.8,27.9,28.1,26.4,23.8],precipitationMm:[0,0.7,0.1,0,0.3,8.7,55.3,166.9,140.4,27.1,0.8,1],code:'BSh',reading:'11～5月の降水量は非常に少なく、雨は8～9月に集中する。海に面した地点でも、年間を通じて雨が多いわけではない。',reason:'北半球の夏に熱帯収束帯が北上すると湿った空気が入り、冬は乾いた北東風が卓越する。海岸の風と海流は気温にも関わるが、雨季の到来を海岸だけで説明できない。',agriculture:'サヘルの天水栽培や放牧では雨季の長さが大切になる。ダカール1地点の値をセネガル全域の栽培条件とみなさない。'},
 {id:'bamako',countryCode:'MLI',name:'バマコ／セヌー',stationId:'61291',stationName:'BAMAKO/SENOU',coordinates:[-7.95,12.53],elevationM:380,temperatureC:[25,28.1,30.9,32.4,31.4,28.8,26.4,25.6,26.1,27.2,26.8,25.2],precipitationMm:[0.4,0,5.4,14.8,72.3,116.5,239.3,270.3,176.1,54.3,1.9,0],code:'Aw',reading:'雨は6～9月に集中し、8月が270.3 mm。乾季の1～2月はほぼ降らない。',reason:'北半球の夏、熱帯収束帯の北上と西アフリカモンスーンによって湿った空気が内陸へ入る。冬は乾いた北東風の影響が強まる。',agriculture:'雨季に合わせた天水の穀物栽培が考えられるが、収量は土壌・品種・管理にも左右される。'},
 {id:'dar-es-salaam',countryCode:'TZA',name:'ダルエスサラーム',stationId:'63894',stationName:'DAR ES SALAAM INT',coordinates:[39.2,-6.87],elevationM:55,temperatureC:[28.2,28.2,27.7,26.7,26,24.6,23.8,24.1,24.9,26.1,26.9,27.9],precipitationMm:[53.4,66,167.6,259.5,162.8,22,16.5,15.3,21.8,79,121.7,135.2],code:'Aw',reading:'3～5月の長雨と10～12月の短雨が見える。7～8月は月降水量が20 mm未満。西アフリカの一山型雨季と形が異なる。',reason:'赤道に近い東アフリカ沿岸では、熱帯収束帯の季節移動とインド洋からの風が降水の時期に関わる。海岸の低地にある観測所で、高地の気温を代表しない。',agriculture:'雨季の時期を分けて読むことが作付けに重要。雨の多い月でも、作物の分布や収量はこの観測点だけでは決まらない。'},
] as const).map(item=>{
 const classRow=({BSh:{id:6,name:'高温のステップ気候',description:'年平均気温と雨の季節配分で定まる乾燥限界を下回る半乾燥の区分。',color:'#ebc38e'},Aw:{id:3,name:'サバナ気候',description:'一年中温暖で、降水に明瞭な乾季がある熱帯の区分。',color:'#a1cdd0'}} as const)[item.code];
 const row=Math.floor((39-item.coordinates[1])*10),column=Math.floor((item.coordinates[0]+27)*10);
 return {id:item.id,countryCode:item.countryCode,name:item.name,stationId:item.stationId,stationName:item.stationName,coordinates:[...item.coordinates] as [number,number],elevationM:item.elevationM,temperatureC:[...item.temperatureC],precipitationMm:[...item.precipitationMm],normalPeriod:'1991–2020',sourceUrl:`https://ds.data.jma.go.jp/tcc/tcc/products/climate/climatview/graph_mkhtml_nrm.php?m=1&n=${item.stationId}`,sourceName:'気象庁 ClimatView',sourceRetrievedAt:'2026-10-08',sourceTermsUrl:'https://www.jma.go.jp/jma/kishou/info/coment.html',sourceSha256:[],notes:['観測所の月別平年値です。格子の気候区分とは別の資料です。'],missingMonths:{temperature:[],precipitation:[]},reading:item.reading,classification:{...classRow,code:item.code,period:'1991–2020',sourceName:'Beck et al. (2023) Köppen-Geiger 0.1-degree classification',sourceUrl:'https://doi.org/10.1038/s41597-023-02549-6',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',grid:'public/assets/atlas/africa-physical-v1/climate.values.gz',gridSha256:'69409b0b30c14933702e5b7a7b4c2103f5d5db6465d585fb65394fb33bf9c9e7',resolutionDegrees:.1,row,column},geographicReason:item.reason,geographicReasonStatus:'',mechanismSourceUrl:'https://www.noaa.gov/jetstream/tropical/convergence-zone',mechanismSourceName:'NOAA：熱帯収束帯',agricultureLink:item.agriculture};
 })];

export function africaClimateCityById(id:string):AfricaClimateCity|undefined {
 return africaClimateCities.find(city=>city.id===id);
}
