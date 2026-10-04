import {availablePlaceReadings,choosePlaceReading,selectedPlaceReading,startPlaceComparison} from '../data/atlas/asia-place-readings';
import {asiaFocusForPath} from '../data/atlas/asia-focus';
import type {AsiaState,AsiaRegionId,AsiaCamera} from '../lib/atlas-asia-state';

export function createPlaceReadings(root:HTMLElement,region:AsiaRegionId,getState:()=>AsiaState,navigate:(s:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null){
 const panel=root.querySelector<HTMLElement>('[data-place-reading]');
 if(!panel)return {render(){}};
 const $=<T extends Element=HTMLElement>(q:string)=>panel.querySelector<T>(q)!;
 const picker=$<HTMLSelectElement>('[data-place-story]');
 const option=(name:string,value:string)=>{const item=document.createElement('option');item.textContent=name;item.value=value;return item;};
 picker.addEventListener('change',()=>{const state=getState(),scene=availablePlaceReadings(region,state.field,asiaFocusForPath(location.pathname)).find(s=>s.id===picker.value);navigate(scene?choosePlaceReading(state,scene):{...state,story:null,camera:camera()},Boolean(scene));});
 function render(){
  const state=getState(),available=availablePlaceReadings(region,state.field,asiaFocusForPath(location.pathname)),scene=available.find(s=>s===selectedPlaceReading(region,state));
  panel!.hidden=!available.length;
  picker.replaceChildren(option('事例を選ぶ',''),...available.map(s=>option(s.name,s.id)));picker.value=scene?.id??'';
  $('[data-place-story-body]').hidden=!scene;
  const links=root.querySelector<HTMLElement>('[data-place-story-bridges]')!;links.hidden=!scene;
  if(!scene)return;
  $('[data-place-story-title]').textContent=scene.name;$('[data-place-story-lead]').textContent=scene.lead;
  $('[data-place-story-text]').textContent=scene.reading;$('[data-place-story-scope]').textContent=scene.scope;
  const source=$<HTMLAnchorElement>('[data-place-story-source]');source.textContent=scene.source.label;source.href=scene.source.url;
  const references=panel!.querySelector<HTMLElement>('[data-place-story-additional-sources]');
  if(references){references.replaceChildren();references.hidden=!scene.additionalSources?.length;for(const [index,reference] of (scene.additionalSources??[]).entries()){if(index)references.append(document.createTextNode(' · '));const a=document.createElement('a');a.textContent=reference.label;a.href=reference.url;references.append(a);}}
  links.replaceChildren();
  for(const bridge of scene.bridges){const button=document.createElement('button');button.type='button';button.dataset.placeBridgeTopic=bridge.topic;button.textContent=bridge.label+' →';button.addEventListener('click',()=>navigate(startPlaceComparison(new URL(location.href),{...getState(),camera:camera()},bridge),Boolean(bridge.relocate)));links.append(button);}
 }
 return {render};
}
