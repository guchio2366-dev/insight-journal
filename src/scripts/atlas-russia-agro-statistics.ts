import {syncAgroStatistics} from './atlas-agro-statistics';
import {renderRussiaWheatSupplyReference} from '../data/atlas/russia-agro-reference';

type Selection={topic:string;active:boolean};
type Reference={node:HTMLElement;anchor:Comment;wrapper:HTMLDetailsElement};
const instances=new WeakMap<HTMLElement,{sync:(selection:Selection)=>void}>();

/** Russia-only source references; the shared renderer owns dated charts. */
export function syncRussiaAgroStatistics(root:HTMLElement,selection:Selection){
 let instance=instances.get(root);
 if(!instance){
  const host=root.querySelector<HTMLElement>('[data-agro-statistics]');
  if(!host){syncAgroStatistics(root,{country:'RUS',...selection});return;}
  let current=selection;
  const references:Reference[]=[];
  const selected=()=>current.active&&current.topic!=='farming-all';
  const sourceReference=()=>{
   if(!selected()||current.topic!=='wheat')return;
   const target=host.querySelector<HTMLElement>('[data-agro-existing-supply]');
   if(!target||target.querySelector('[data-russia-wheat-supply]'))return;
   target.innerHTML=renderRussiaWheatSupplyReference();
   const details=target.closest<HTMLDetailsElement>('.agro-other-reference');if(details)details.hidden=false;
  };
  // The shared loader can finish after the map changes or after its references.
  // Reapply only to the currently selected wheat column, never a stale request.
  const observer=new MutationObserver(sourceReference);
  observer.observe(host,{childList:true,subtree:true});
  const sync=(next:Selection)=>{
   current=next;
   const focused=selected();
   if(focused&&!references.length){
    let tail:HTMLElement=host;
    for(const node of root.querySelectorAll<HTMLElement>('.russia-farming-trade-grid,.russia-farming-candidates,[data-russia-forestry-statistics]')){
     const anchor=document.createComment('Russia source reference position'),wrapper=document.createElement('details'),summary=document.createElement('summary');
     wrapper.className='russia-agro-other-reference';wrapper.dataset.russiaAgroReference='';
     summary.textContent=node.matches('.russia-farming-trade-grid')?'別期間の小麦用途・輸出先・世界比の参考':node.matches('.russia-farming-candidates')?'地図未収録品目の全国統計':'別品目の森林面積・木材生産の参考';
     wrapper.append(summary);node.before(anchor);tail.after(wrapper);tail=wrapper;wrapper.append(node);references.push({node,anchor,wrapper});
    }
   }
   if(!focused)for(const {node,anchor,wrapper} of references.splice(0)){anchor.before(node);anchor.remove();wrapper.remove();}
   // Preserve the existing unselected wheat presentation and its 2024 gaps.
   syncAgroStatistics(root,{country:'RUS',topic:next.topic==='farming-all'?'wheat':next.topic,active:next.active,year:2024});
   sourceReference();
  };
  instance={sync};instances.set(root,instance);
 }
 instance.sync(selection);
}
