import {populationViews,ethnicities,religions} from '../data/atlas/population.ts';
import {populationCityProfiles} from '../data/atlas/population-reading.ts';
import {religionStoryIds} from '../data/atlas/population-religion-reading.ts';
import {populationVoteStates} from '../data/atlas/population-focus.ts';
export function readPopulationState(url:URL){
 const allowed=(key:string,items:readonly (readonly string[])[],fallback='')=>items.find(x=>x[0]===url.searchParams.get(key))?.[0]??fallback;
 const view=allowed('popView',populationViews,'distribution'),geo=url.searchParams.get('popGeo')??'';
 const city=url.searchParams.get('popCity')??'',story=url.searchParams.get('popReligionStory')??'';
 return {view,ethnicity:allowed('popEthnicity',ethnicities),religion:allowed('popReligion',religions,'protestant'),
 // Legacy density-metro URLs no longer activate the retired distribution drilldown.
 metro:'national',city:Object.hasOwn(populationCityProfiles,city)?city:'',
 story:religionStoryIds.includes(story as typeof religionStoryIds[number])?story:'',
 voteState:populationVoteStates.some(s=>s.id===url.searchParams.get('popVoteState'))?url.searchParams.get('popVoteState')!:'',
 geo:/^(county:\d{5}|tract:\d{11}|state:\d{2})$/.test(geo)?geo:'',
 insight:['services','vote','settlement'].includes(url.searchParams.get('popInsight')??'')?url.searchParams.get('popInsight')!:''};
}
export type PopulationState=ReturnType<typeof readPopulationState>;
export function writePopulationState(url:URL,state:PopulationState){
 const next=new URL(url);
 for(const [key,value] of Object.entries({popView:state.view,popEthnicity:state.ethnicity,popReligion:state.religion,popMetro:state.metro,popCity:state.city,popReligionStory:state.story,popVoteState:state.voteState,popGeo:state.geo,popInsight:state.insight}))
 value?next.searchParams.set(key,value):next.searchParams.delete(key);
 return next;
}
