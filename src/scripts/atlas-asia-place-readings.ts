import {asiaPlaceReadings,choosePlaceReading,selectedPlaceReading} from '../data/atlas/asia-place-readings';
import {startAsiaComparison,type AsiaState,type AsiaRegionId,type AsiaCamera} from '../lib/atlas-asia-state';

export function createPlaceReadings(root:HTMLElement,region:AsiaRegionId,getState:()=>AsiaState,navigate:(s:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null){
 const panel=root.querySelector<HTMLElement>('[data-place-reading]');
 if(!panel)return {render(){}};
 const $=<T extends Element=HTMLElement>(q:string)=>panel.querySelector<T>(q)!;
 const picker=$<HTMLSelectElement>('[data-place-story]');
 const option=(name:string,value:string)=>{const item=document.createElement('option');item.textContent=name;item.value=value;return item;};
 picker.addEventListener('change',()=>{const state=getState(),scene=asiaPlaceReadings.find(s=>s.region===region&&s.field===state.field&&s.id===picker.value);navigate(scene?choosePlaceReading(state,scene):{...state,story:null,camera:camera()},Boolean(scene));});
 function render(){
  const state=getState(),available=asiaPlaceReadings.filter(s=>s.region===region&&s.field===state.field),scene=selectedPlaceReading(region,state);
  panel!.hidden=!available.length;
  picker.replaceChildren(option('事例を選ぶ',''),...available.map(s=>option(s.name,s.id)));picker.value=scene?.id??'';
  $('[data-place-story-body]').hidden=!scene;
  if(!scene)return;
  $('[data-place-story-title]').textContent=scene.name;$('[data-place-story-lead]').textContent=scene.lead;
  $('[data-place-story-text]').textContent=scene.reading;$('[data-place-story-scope]').textContent=scene.scope;
  const source=$<HTMLAnchorElement>('[data-place-story-source]');source.textContent=scene.source.label;source.href=scene.source.url;
  const links=$('[data-place-story-bridges]');links.replaceChildren();
  for(const bridge of scene.bridges){const button=document.createElement('button');button.type='button';button.textContent=bridge.label+' →';button.addEventListener('click',()=>{const saved=startAsiaComparison(new URL(location.href),{...getState(),camera:camera()},bridge.field);navigate({...saved,topic:bridge.topic,detail:bridge.detail??null,...(bridge.relocate?{camera:null,point:null}:{})},Boolean(bridge.relocate));});links.append(button);}
 }
 return {render};
}
