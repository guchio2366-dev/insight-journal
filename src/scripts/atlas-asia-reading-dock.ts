import type {AsiaState} from '../lib/atlas-asia-state';
import {selectedPlaceReading} from '../data/atlas/asia-place-readings.ts';

/** Keep the current message and next comparison outside the long reading. */
export function createAsiaReadingDock(root:HTMLElement) {
 const dock=root.querySelector<HTMLElement>('[data-reading-dock]');
 if(!dock)return {render(_state:AsiaState){}};
 const title=dock.querySelector<HTMLElement>('[data-reading-dock-title]')!;
 const summary=dock.querySelector<HTMLElement>('[data-reading-dock-summary]')!;
 const original={title:title.textContent??'',summary:summary.textContent??''};
 const configNode=root.querySelector<HTMLElement>('[data-asia-config]');
 const config=configNode?JSON.parse(configNode.textContent??'{}'):null;
 const focusReadings=config?.focusReadings;
 const storyBridges=root.querySelector<HTMLElement>('[data-place-story-bridges]');
 if(storyBridges)dock.append(storyBridges);
 const candidates=[
  '[data-east-cluster-reading]','[data-seasonal-panel]',
  '[data-place-story-body]','[data-trade-panel]','[data-hydrology-panel]',
  '[data-physical-reading]','[data-sc-religion-country]','[data-sc-religion-census]','[data-settlement-detail]','[data-settlement-overview]',
  '[data-social-panel]','[data-population-reading]','[data-industry-panel]',
  '[data-farming-extra]','[data-rice-reading]','[data-farm-overview-reading]',
  '[data-city-panel]','[data-class-reading]','[data-overview]'
 ];
 function render(state:AsiaState){
  const panels=candidates.flatMap(selector=>[...root.querySelectorAll<HTMLElement>(selector)]);
  const panel=panels.find(el=>!el.closest('[hidden]'));
  const heading=panel?.querySelector<HTMLElement>('h2,h3,[data-place-story-title]');
  const lead=panel?.querySelector<HTMLElement>('.asia-takeaway,.city-takeaway,[data-place-story-lead],[data-trade-lead],[data-class-description]');
  title.textContent=heading?.textContent?.trim()||original.title;
  summary.textContent=lead?.textContent?.trim()||original.summary;
  if(panel?.matches('[data-sc-religion-country]'))summary.textContent=panel.querySelector('h3 + p')?.textContent?.trim()||summary.textContent;
  if(state.field==='natural'&&state.topic==='seasonal-precipitation'){
   title.textContent='雨の季節配分を読む';
   summary.textContent='月を切り替えて雨が増減する季節を確かめ、作物が育つ時期と水管理を考えます。';
  }
  const focused=focusReadings?.[state.field];
  const overview=!state.place&&!state.story&&!state.detail&&!state.city&&!state.point&&!panel?.matches('[data-class-reading]')&&(!state.topic||['overview','density','manufacturing'].includes(state.topic));
  if(focused&&overview){title.textContent=focused.title;summary.textContent=focused.takeaway;}
  const focusPanel=root.querySelector<HTMLElement>('[data-focus-reading]');
  if(focusPanel){
   focusPanel.hidden=!focused||!overview||Boolean(config?.focusId&&['agriculture','population'].includes(state.field));
   if(focused){
    focusPanel.querySelector<HTMLElement>('[data-focus-reading-title]')!.textContent=focused.title;
    focusPanel.querySelector<HTMLElement>('[data-focus-reading-body]')!.textContent=focused.reading;
    const link=focusPanel.querySelector<HTMLAnchorElement>('[data-focus-reading-source]')!;
    link.textContent=focused.source.label;link.href=focused.source.url;
   }
  }
  summary.hidden=Boolean(state.back);
  const scene=config?.regionId?selectedPlaceReading(config.regionId,state):null;
  if(scene){title.textContent=scene.name;summary.textContent=scene.lead;}
  root.querySelectorAll<HTMLButtonElement>('[data-dock-compare]').forEach(button=>{
   button.hidden=Boolean(state.back)||Boolean(scene)||button.dataset.dockCompare===state.field;
  });
 }
 return {render};
}
