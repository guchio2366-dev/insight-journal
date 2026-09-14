import {populationViews,ethnicities,religions,metros} from '../data/atlas/population.ts';
import {populationCityProfiles} from '../data/atlas/population-reading.ts';
export function readPopulationState(url:URL){
 const allowed=(key:string,items:readonly (readonly string[])[])=>items.find(x=>x[0]===url.searchParams.get(key))?.[0]??items[0][0];
 const geo=url.searchParams.get('popGeo')??'';
 const city=url.searchParams.get('popCity')??'';
 return {view:allowed('popView',populationViews),ethnicity:allowed('popEthnicity',ethnicities),religion:allowed('popReligion',religions),metro:allowed('popMetro',metros),city:Object.hasOwn(populationCityProfiles,city)?city:'',geo:/^(county:\d{5}|tract:\d{11}|state:\d{2})$/.test(geo)?geo:'',insight:['services','vote','settlement'].includes(url.searchParams.get('popInsight')??'')?url.searchParams.get('popInsight')!:''};
}
export type PopulationState=ReturnType<typeof readPopulationState>;
export function writePopulationState(url:URL,state:PopulationState){const next=new URL(url);for(const [key,value] of Object.entries({popView:state.view,popEthnicity:state.ethnicity,popReligion:state.religion,popMetro:state.metro,popCity:state.city,popGeo:state.geo,popInsight:state.insight}))value?next.searchParams.set(key,value):next.searchParams.delete(key);return next;}
