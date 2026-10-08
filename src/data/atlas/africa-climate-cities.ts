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
 geographicReason:null;
 geographicReasonStatus:string;
};

export const africaClimateCityCoverage='月別平年値はヘルワン（カイロ南部）の1観測所を収録しています。他の主要都市の雨温図は未収録です。';
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
 geographicReason:null,
 geographicReasonStatus:'この観測所の気候になる地理的な理由は、出典付きの解説をまだ収録していません。',
}];

export function africaClimateCityById(id:string):AfricaClimateCity|undefined {
 return africaClimateCities.find(city=>city.id===id);
}
