import type {AsiaUrbanCentre} from '../data/atlas/asia-population.ts';
import {startAsiaComparison, type AsiaState, type AsiaCamera} from './atlas-asia-state.ts';

export function southeastUrbanComparison(cities:readonly AsiaUrbanCentre[]) {
  const ordered=[...cities].filter(c=>Number.isFinite(c.population)&&c.population>=0).sort((a,b)=>b.population-a.population||a.id.localeCompare(b.id));
  const maximum=ordered[0]?.population??0;
  return ordered.map(city=>({city, populationWidth:maximum>0?city.population/maximum*100:0}));
}

export function southeastUrbanState(state:AsiaState, city:AsiaUrbanCentre, camera:AsiaCamera|null):AsiaState {
  return {...state,field:'population',topic:'urban',place:city.country,detail:city.id,point:city.coordinates,city:null,story:null,camera};
}

export function southeastManufacturingScope(country:string|null,industryCountryCodes:readonly string[]) {
  return country&&industryCountryCodes.includes(country)
    ? {place:country,button:'同じ場所の産業と国別製造業を読む →',note:'製造業の値は、選択した都市がある国の集計です。都市人口と同じ範囲の産業統計ではありません。'}
    : {place:null,button:'同じ地図範囲の産業拠点を読む →',note:'この国の国別製造業比較は未掲載です。地図範囲を保って、東南アジアの掲載拠点へ進みます。併記される国別統計も掲載対象国の値で、この都市の値ではありません。'};
}

type ComparisonContext={point?:[number,number]|null;industryCountryCodes?:readonly string[]};
export function southeastNaturePopulationComparison(url:URL,state:AsiaState,topic:'seasonal-precipitation'|'terrain'|'basins'|'manufacturing',camera:AsiaCamera|null,{point,industryCountryCodes=[]}:ComparisonContext={}):AsiaState {
  const saved=startAsiaComparison(url,{...state,camera},topic==='manufacturing'?'industry':'natural');
  // An unsupported country would be normalized by the industry navigator by
  // clearing the point and camera. Enter its regional view explicitly instead.
  const place=topic==='manufacturing'?southeastManufacturingScope(state.place,industryCountryCodes).place:saved.place;
  return {...saved,place,topic,detail:topic==='seasonal-precipitation'?'m-07':null,story:null,city:null,point:point??state.point??null,camera};
}
