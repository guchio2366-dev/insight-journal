import type {AsiaClimateCity} from './asia-climate-cities.ts';
import {asiaClimateCities} from './asia-climate-cities.ts';
import selected from '../../../data-source/atlas/japan-second-pass/jma-selected-normals.json' with {type:'json'};

// Retained publisher-selected numeric columns, not a hash of unreceived HTML.
export const japanClimateSelectedRecordSha256='d87a169144103311d7803b3ce727ce6f123417577e55977010651471d8ced445';
export const japanAdditionalClimateCities:AsiaClimateCity[]=selected.map(record=>({
 id:record.id,regionId:'east-asia',countryCode:'JPN',name:record.name,
 stationId:record.stationId,stationName:record.name+'観測所',
 coordinates:record.coordinates as [number,number],normalPeriod:record.normalPeriod,
 temperatureC:record.temperatureC,precipitationMm:record.precipitationMm,
 sourceUrl:record.sourceUrl,sourceName:'気象庁 過去の気象データ検索・平年値を加工',
 sourceRetrievedAt:record.retrievedAt,sourceTermsUrl:record.termsUrl,
 sourceSha256:[japanClimateSelectedRecordSha256],missingMonths:{temperature:[],precipitation:[]},
 notes:[record.coordinatesMethod,record.sourceAnnualVsMonthlyNote,'SHAは保存した選択列のJSONの値。原HTMLのSHAではありません。'],
 summary:record.summary,reading:record.reading,
}));
export const japanClimateCities=[...asiaClimateCities.filter(city=>city.countryCode==='JPN'),...japanAdditionalClimateCities];
