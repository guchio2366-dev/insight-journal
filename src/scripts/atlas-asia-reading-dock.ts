import type {AsiaState} from '../lib/atlas-asia-state';

/** Keep the current message and next comparison outside the long reading. */
export function createAsiaReadingDock(root:HTMLElement) {
 const dock=root.querySelector<HTMLElement>('[data-reading-dock]');
 if(!dock)return {render(_state:AsiaState){}};
 const title=dock.querySelector<HTMLElement>('[data-reading-dock-title]')!;
 const summary=dock.querySelector<HTMLElement>('[data-reading-dock-summary]')!;
 const original={title:title.textContent??'',summary:summary.textContent??''};
 const configNode=root.querySelector<HTMLElement>('[data-asia-config]');
 const focusReadings=configNode?JSON.parse(configNode.textContent??'{}').focusReadings:null;
 const candidates=[
  '[data-place-story-body]','[data-trade-panel]','[data-hydrology-panel]',
  '[data-physical-reading]','[data-settlement-detail]','[data-settlement-overview]',
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
  const focused=focusReadings?.[state.field];
  const overview=!state.place&&!state.story&&!state.detail&&!state.city&&!state.point&&!panel?.matches('[data-class-reading]')&&(!state.topic||['overview','density','manufacturing'].includes(state.topic));
  if(focused&&overview){title.textContent=focused.title;summary.textContent=focused.takeaway;}
  const focusPanel=root.querySelector<HTMLElement>('[data-focus-reading]');
  if(focusPanel){
   focusPanel.hidden=!focused||!overview;
   if(focused){
    focusPanel.querySelector<HTMLElement>('[data-focus-reading-title]')!.textContent=focused.title;
    focusPanel.querySelector<HTMLElement>('[data-focus-reading-body]')!.textContent=focused.reading;
    const link=focusPanel.querySelector<HTMLAnchorElement>('[data-focus-reading-source]')!;
    link.textContent=focused.source.label;link.href=focused.source.url;
   }
  }
  summary.hidden=Boolean(state.back);
  dock.querySelectorAll<HTMLButtonElement>('[data-dock-compare]').forEach(button=>{
   button.hidden=Boolean(state.back)||button.dataset.dockCompare===state.field;
  });
 }
 return {render};
}
