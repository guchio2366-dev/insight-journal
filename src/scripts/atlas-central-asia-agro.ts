import {centralAgroCountries,centralAgroLabel,centralAgroSeries,centralForestBoundary,renderCentralAgroRegion,renderCentralWheatReference,renderCentralWheatUse} from '../lib/atlas-central-asia-agro.ts';
import {syncAgroRegionalReferences} from './atlas-agro-regional-reference.ts';

/** Region-only adapter around the existing country statistics. It observes
 * their public DOM; it never changes map state, common data, or overview DOM. */
export function initCentralAsiaAgro(root:HTMLElement){
 if(root.dataset.focus!=='central-asia'||root.querySelector('[data-central-agro-region]'))return;
 const native=root.querySelector<HTMLElement>('[data-agro-statistics]'),explorer=root.querySelector<HTMLElement>('[data-asia-explorer]');
 if(!native||!explorer)return;
 const doc=root.ownerDocument;
 const region=doc.createElement('section');region.className='agro-statistics central-agro-statistics';region.dataset.centralAgroRegion='';region.hidden=true;region.setAttribute('aria-label','中央アジアの選択品目別統計');
 region.innerHTML='<h2>中央アジア · 選択品目の統計</h2><div class="agro-stat-controls"><label data-central-agro-control>生産品目 <select data-central-agro-select></select></label></div><div data-central-agro-content></div>';
 native.after(region);
 const select=region.querySelector<HTMLSelectElement>('select')!,content=region.querySelector<HTMLElement>('[data-central-agro-content]')!;
 let previousTopic='',previousId='';
 function render(){
  const topic=explorer!.dataset.topic??'',country=root.querySelector<HTMLSelectElement>('[data-country-select]')?.value??'',ids=centralAgroSeries(topic);
  const selected=explorer!.dataset.field==='agriculture'&&ids.length>0;
  syncAgroRegionalReferences(root,selected);
  const visible=selected&&!country;
  if(region.hidden===visible)region.hidden=!visible;
  if(previousTopic!==topic){previousTopic=topic;previousId='';select.replaceChildren(...ids.map(id=>{const option=doc.createElement('option');option.value=id;option.textContent=centralAgroLabel(id);return option;}));}
  if(visible){
   const id=ids.includes(select.value)?select.value:ids[0];
   const control=region.querySelector<HTMLElement>('[data-central-agro-control]')!;
   if(control.hidden!==(ids.length<2))control.hidden=ids.length<2;
   if(previousId!==id){previousId=id;content.innerHTML=renderCentralAgroRegion(id);}
  }
  // The shared renderer owns country selection, loading, retries and series.
  // Add only regional evidence after it has rendered the matching country.
  if(!selected||!centralAgroCountries.includes(country)||native!.hidden)return;
  const columns=native!.querySelector<HTMLElement>('[data-agro-country]');
  if(columns?.dataset.agroCountry!==country||!ids.includes(columns.dataset.agroSeries??''))return;
  const append=(stage:string,key:string,html:string)=>{const target=columns.querySelector<HTMLElement>(`[data-agro-stage="${stage}"]`);if(!target||target.querySelector(`[data-central-agro-native="${key}"]`))return;const box=doc.createElement('div');box.dataset.centralAgroNative=key;box.innerHTML=html;target.append(box);};
  if(country==='KAZ'&&topic==='wheat'){
   append('use','wheat-use',renderCentralWheatUse());
   append('destinations','wheat-reference',renderCentralWheatReference());
  }
  if(topic==='forest')append('use','forest-boundary',centralForestBoundary);
 }
 select.addEventListener('change',render);
 const observer=new doc.defaultView!.MutationObserver(render);
 observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-field','data-topic','data-agro-ready','hidden']});
 render();
 return {disconnect(){observer.disconnect();region.remove();for(const extra of native.querySelectorAll('[data-central-agro-native]'))extra.remove();}};
}
