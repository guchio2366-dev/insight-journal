import type {AsiaState} from '../lib/atlas-asia-state';

/** Place existing controls and statistics in the same learning columns as the US atlas. */
export function createAsiaLayout(root:HTMLElement){
 const items=root.querySelector<HTMLElement>('[data-asia-map-items]');
 const statistics=root.querySelector<HTMLElement>('[data-asia-statistics]');
 if(!items||!statistics)return {render(_state:AsiaState){}};
 const query=(s:string)=>root.querySelector<HTMLElement>(s);
 const mainLegend=query('[data-reading-map-legend]'),legendHost=query('[data-asia-map-legend]');
 const seasonalControls=query('.seasonal-month-controls'),seasonalLegend=query('[data-seasonal-legend]'),comparisonKeys=query('[data-comparison-compact]');
 const homes=[seasonalControls,seasonalLegend,comparisonKeys].filter((node):node is HTMLElement=>!!node).map(node=>({node,parent:node.parentElement!,next:node.nextSibling}));
 if(mainLegend&&legendHost)legendHost.append(mainLegend);
 const methods=query('[data-asia-map-method]');
 const climateLegend=query('[data-climate-legend]');
 if(climateLegend&&legendHost){
  const choices=root.ownerDocument.createElement('div');choices.className='asia-climate-choices';
  for(const button of climateLegend.querySelectorAll<HTMLButtonElement>('[data-climate-class]')){
   const fullName=button.textContent?.trim()??'';button.title=fullName;button.setAttribute('aria-label',fullName);
   const name=button.querySelector<HTMLElement>('span');if(name)name.hidden=true;
   choices.append(button);
  }
  climateLegend.replaceChildren(choices);legendHost.append(climateLegend);
 }
 for(const legend of root.querySelectorAll<HTMLElement>('.asia-map-panel>section.asia-legend:not(.asia-farm-key)')){
  if(legend.hasAttribute('data-settlement-legend'))items.prepend(legend);
  else if(methods)methods.append(legend);
 }
 const controls:{node:HTMLElement;owner:HTMLElement|null;wrapper:HTMLElement}[]=[];
 const toolbar=query('.asia-toolbar');
 const readingDock=query('.asia-reading-dock'),notebook=root.ownerDocument.defaultView!.matchMedia('(min-width:960px) and (max-width:1199px)');
 let cityControl:HTMLElement|null=null;
 const farmingNote=query('[data-farm-density-key]');
 if(methods&&farmingNote){const owner=farmingNote.closest<HTMLElement>('[data-farm-overview-legend]'),wrapper=root.ownerDocument.createElement('div');wrapper.append(farmingNote);methods.append(wrapper);controls.push({node:farmingNote,owner,wrapper});}
 for(const selector of [...(legendHost?[]:['[data-reading-map-legend]']),'[data-city-picker]','[data-industry-all]','[data-industry-detail-label]','[data-industry-search-label]','[data-social-metric-label]','[data-social-area-label]']){
  const node=query(selector);if(!node)continue;
  const owner=node.closest<HTMLElement>('[data-industry-panel],[data-social-panel]');
  const wrapper=root.ownerDocument.createElement('div');wrapper.className='asia-map-item';wrapper.append(node);
  if(selector==='[data-city-picker]'&&toolbar){toolbar.append(wrapper);cityControl=wrapper;}else items.append(wrapper);
  controls.push({node,owner,wrapper});
 }
 function placeCityPicker(){
  const destination=notebook.matches&&root.dataset.climateActive==='true'&&!query('.asia-focus-navigation')&&readingDock?readingDock:toolbar;
  if(cityControl&&destination&&cityControl.parentElement!==destination)destination.append(cityControl);
 }
 notebook.addEventListener('change',placeCityPicker);
 const groups:{node:HTMLElement;owner:HTMLElement|null;wrapper:HTMLElement}[]=[];
 for(const node of root.querySelectorAll<HTMLElement>('.farming-statistics,[data-farm-trade],[data-industry-content],[data-trade-content],[data-social-content],[data-population-city-facts],[data-city-statistics]')){
  const owner=node.closest<HTMLElement>('[data-farming-panel],[data-industry-panel],[data-trade-panel],[data-social-panel],[data-population-reading],[data-city-panel]');
  if(node.matches('[data-city-statistics]')){
   const monthly=owner?.querySelector('.monthly-values'),source=owner?.querySelector('.climate-source');
   if(source)node.append(source);if(monthly)node.append(monthly);
  }
  const wrapper=root.ownerDocument.createElement('section');wrapper.className='asia-statistics-panel';wrapper.hidden=true;
  wrapper.append(node);statistics.append(wrapper);groups.push({node,owner,wrapper});
 }
 function synchronize(){
  for(const {node,owner,wrapper} of controls){const hidden=node.hidden||!!owner?.hidden;if(wrapper.hidden!==hidden)wrapper.hidden=hidden;}
  let visible=false;
  for(const {node,owner,wrapper} of groups){
   const hidden=node.hidden||!!owner?.hidden||!node.childElementCount;
   if(wrapper.hidden!==hidden)wrapper.hidden=hidden;
   visible ||= !hidden;
  }
  if(statistics.hidden===visible)statistics.hidden=!visible;
 }
 const observer=new root.ownerDocument.defaultView!.MutationObserver(synchronize);
 observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 return {render(state:AsiaState){
  const seasonal=state.field==='natural'&&state.topic==='seasonal-precipitation';
  root.dataset.seasonalActive=String(seasonal);
  root.dataset.climateActive=String(state.field==='natural'&&(!state.topic||state.topic==='climate'));
  placeCityPicker();
  if(seasonal&&legendHost){
   if(seasonalControls&&toolbar&&seasonalControls.parentElement!==toolbar)toolbar.prepend(seasonalControls);
   if(comparisonKeys&&state.back)legendHost.append(comparisonKeys);
   if(seasonalLegend){seasonalLegend.hidden=Boolean(state.back)||Boolean(mainLegend);if(!state.back&&!mainLegend)legendHost.append(seasonalLegend);}
  }else for(const {node,parent,next} of homes){if(node.parentElement!==parent)parent.insertBefore(node,next?.parentNode===parent?next:null);if(node===seasonalLegend)node.hidden=false;}
  synchronize();
 }};
}
