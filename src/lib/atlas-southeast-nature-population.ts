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

export function southeastNaturePopulationComparison(url:URL,state:AsiaState,topic:'seasonal-precipitation'|'terrain'|'basins'|'manufacturing',camera:AsiaCamera|null,point?:[number,number]|null):AsiaState {
  const saved=startAsiaComparison(url,{...state,camera},topic==='manufacturing'?'industry':'natural');
  return {...saved,topic,detail:topic==='seasonal-precipitation'?'m-07':null,story:null,city:null,point:point??state.point??null,camera};
}
