import type {AsiaState} from '../lib/atlas-asia-state.ts';
import {isSoutheastFarmOverview,southeastFarmGroup,southeastFarmMapNote} from '../data/atlas/asia/southeast-asia-farm-groups.ts';

/** The common navigator owns events; this keeps the four views and their copy in sync. */
export function createSoutheastFarmNavigation(root:HTMLElement,getState:()=>AsiaState){
 const all=<T extends HTMLElement=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
 const setText=(selector:string,text:string)=>{for(const element of all(selector))element.textContent=text;};
 const returnButton=root.querySelector<HTMLButtonElement>('[data-farm-choice="overview"]');
 function render(){
  const state=getState(),active=state.field==='agriculture',topic=state.topic??(state.city?'rice':'overview'),group=southeastFarmGroup(topic);
  root.dataset.southeastFarmGroup=active?(group?.id??'forest'):'';
  for(const button of all<HTMLButtonElement>('[data-southeast-farm-group]'))button.setAttribute('aria-pressed',String(active&&button.dataset.southeastFarmGroup===group?.id));
  if(!active)return;
  for(const picker of all('[data-farming-selector]'))picker.hidden=!group;
  if(!group){if(returnButton)returnButton.hidden=true;return;}
  const overview=isSoutheastFarmOverview(topic);
  for(const button of all<HTMLButtonElement>('[data-farm-choice][data-kind]'))button.hidden=!group.products.includes(button.dataset.farmChoice??'');
  for(const row of all('.asia-farm-key-row'))row.hidden=![...row.querySelectorAll<HTMLElement>('[data-farm-choice]')].some(button=>!button.hidden);
  for(const select of all<HTMLSelectElement>('[data-farming-topic]')){
   for(const option of [...select.options]){const visible=option.value==='overview'||group.products.includes(option.value);option.hidden=!visible;option.disabled=!visible;if(option.value==='overview')option.textContent=group.label+'の分布';}
   select.value=overview?'overview':topic;
  }
  if(returnButton){returnButton.dataset.farmChoice=group.id;returnButton.textContent=group.label+'の分布へ';returnButton.hidden=overview;}
  setText('[data-farm-density-key]',southeastFarmMapNote(topic,state.single));
  const single=root.querySelector<HTMLButtonElement>('[data-southeast-farm-single]');if(single&&state.single)single.textContent='この分類の分布に戻す';
  for(const switches of all('[data-farm-switches]'))switches.hidden=true;
  if(overview){
   setText('[data-farm-insight-title],[data-reading-dock-title]',group.title);
   setText('[data-farm-insight-lead],[data-reading-dock-summary]',group.lead);
   setText('[data-farm-insight-body]',group.reading);
   setText('[data-farm-overview-method-summary]',southeastFarmMapNote(topic));
   for(const source of all('[data-farm-insight-source]'))source.hidden=true;
   for(const panel of all('[data-focus-reading]'))panel.hidden=true;
  }
 }
 return {render};
}
