import type {AsiaState,AsiaCamera} from '../lib/atlas-asia-state';
import type {AsiaPopulationRegion} from '../data/atlas/asia-population';
import {southeastUrbanState,southeastNaturePopulationComparison,southeastManufacturingScope} from '../lib/atlas-southeast-nature-population';

type Config={population:AsiaPopulationRegion;cities?:readonly {id:string;coordinates:[number,number]}[];industryCountryCodes:readonly string[]};
export function createSoutheastNaturePopulationReading(root:HTMLElement,config:Config,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null){
  const all=<T extends HTMLElement>(selector:string)=>Array.from(root.querySelectorAll<T>(selector));
  const selectedCity=()=>getState().field==='population'&&getState().topic==='urban'?config.population.cities.find(c=>c.id===getState().detail):undefined;
  for(const button of all<HTMLButtonElement>('[data-southeast-urban]'))button.addEventListener('click',()=>{
    const city=config.population.cities.find(c=>c.id===button.dataset.southeastUrban);
    if(city)navigate(southeastUrbanState(getState(),city,camera()),false);
  });
  for(const button of all<HTMLButtonElement>('[data-southeast-compare]'))button.addEventListener('click',()=>{
    const topic=button.dataset.southeastCompare;
    if(topic!=='seasonal-precipitation'&&topic!=='terrain'&&topic!=='basins'&&topic!=='manufacturing')return;
    const state=getState(),point=state.point??config.cities?.find(city=>city.id===state.city)?.coordinates??null;
    navigate(southeastNaturePopulationComparison(new URL(location.href),state,topic,camera(),{point,industryCountryCodes:config.industryCountryCodes}),false);
  });
  for(const button of all<HTMLButtonElement>('[data-southeast-society-topic]'))button.addEventListener('click',()=>navigate({...getState(),field:'population',topic:button.dataset.southeastSocietyTopic,place:'MYS',city:null,detail:null,point:null,story:null,camera:camera()},false));
  function render(){
    const state=getState(),population=state.field==='population'&&[null,undefined,'density','urban'].includes(state.topic),society=state.field==='population'&&['ethnicity','religion'].includes(state.topic??'');
    for(const element of all<HTMLElement>('[data-southeast-nature-reading]'))element.hidden=state.field!=='natural'||state.topic==='seasonal-precipitation';
    for(const element of all<HTMLElement>('[data-southeast-population-reading]'))element.hidden=!population;
    for(const element of all<HTMLElement>('[data-southeast-society-reading]'))element.hidden=!society;
    for(const element of all<HTMLElement>('[data-southeast-religion-registration]'))element.hidden=!society||state.topic!=='religion';
    const city=selectedCity();
    for(const element of all<HTMLElement>('[data-southeast-current-city]'))element.hidden=!city;
    for(const element of all<HTMLElement>('[data-southeast-current-city-name]'))element.textContent=city?.name??'';
    const industry=southeastManufacturingScope(city?.country??null,config.industryCountryCodes);
    for(const button of all<HTMLButtonElement>('[data-southeast-compare="manufacturing"]'))button.textContent=industry.button;
    for(const element of all<HTMLElement>('[data-southeast-manufacturing-scope]'))element.textContent=industry.note;
    for(const button of all<HTMLButtonElement>('[data-southeast-urban]'))button.setAttribute('aria-pressed',String(button.dataset.southeastUrban===city?.id));
    for(const row of all<HTMLElement>('[data-southeast-urban-row]'))row.classList.toggle('is-selected',row.dataset.southeastUrbanRow===city?.id);
  }
  return {render};
}
