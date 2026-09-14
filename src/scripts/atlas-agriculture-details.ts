import {animalDetailIds,cropDetailIds,detailAnchor,readAgricultureDetailState,writeAgricultureDetailState,type AgricultureDetailState} from '../lib/atlas-agriculture-detail-state';

/** Static SVG/HTML remains readable before this controller initializes, with no map dependency. */
export function createAgricultureDetails(root:HTMLElement, changed:(state:AgricultureDetailState,push:boolean,url:URL)=>void) {
  let state=readAgricultureDetailState(new URL(location.href));
  const groups=[{name:'crops',key:'stats',select:'data-stat-select',panel:'data-stat-panel',ids:cropDetailIds},{name:'livestock',key:'livestockStats',select:'data-livestock-stat-select',panel:'data-livestock-stat-panel',ids:animalDetailIds}] as const;
  const render=()=>{
    for(const group of groups){
      const host=root.querySelector<HTMLElement>(`[data-detail-group="${group.name}"]`);
      if(!host)continue;
      host.querySelectorAll<HTMLButtonElement>(`[${group.select}]`).forEach(b=>{const active=b.getAttribute(group.select)===state[group.key];b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
      host.querySelectorAll<HTMLElement>(`[${group.panel}]`).forEach(p=>p.hidden=p.getAttribute(group.panel)!==state[group.key]);
      host.dataset.detailReady='true';
    }
    root.querySelectorAll<HTMLButtonElement>('[data-milk-basis]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.milkBasis===state.milkBasis)));
    root.querySelectorAll<HTMLElement>('[data-milk-panel]').forEach(p=>p.hidden=p.dataset.milkPanel!==state.milkBasis);
  };
  const commit=(push=false,url=new URL(location.href))=>changed({...state},push,writeAgricultureDetailState(url,state));
  const select=(group:'crops'|'livestock',id:string,notify=true)=>{
    const config=groups.find(g=>g.name===group)!;
    if(!(config.ids as readonly string[]).includes(id))return;
    state[config.key]=id;render();if(notify)commit();
  };
  for(const group of groups){
    const host=root.querySelector<HTMLElement>(`[data-detail-group="${group.name}"]`);
    const buttons=[...(host?.querySelectorAll<HTMLButtonElement>(`[${group.select}]`)??[])];
    for(const button of buttons){
      button.addEventListener('click',()=>select(group.name,button.getAttribute(group.select)!));
      button.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();const i=buttons.indexOf(button);
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
        buttons[next].focus();select(group.name,buttons[next].getAttribute(group.select)!);
      });
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-milk-basis]').forEach(b=>b.addEventListener('click',()=>{state.milkBasis=b.dataset.milkBasis==='skim'?'skim':'fat';render();commit();}));
  // Delegate so dynamically assigned selection-card links use the same resolver.
  root.addEventListener('click',event=>{
    if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.button!==0)return;
    const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');if(!link)return;
    const url=new URL(link.href,location.href),current=new URL(location.href);
    if(url.origin!==current.origin||url.pathname!==current.pathname)return;
    const anchor=detailAnchor(url.hash);if(!anchor)return;
    event.preventDefault();select(anchor.group,anchor.id,false);commit(true,url);
    const panel=document.getElementById(url.hash.slice(1));panel?.scrollIntoView({block:'start'});panel?.focus({preventScroll:true});
  });
  const restore=()=>{state=readAgricultureDetailState(new URL(location.href));render();return {...state};};
  window.addEventListener('hashchange',()=>{restore();commit();const anchor=detailAnchor(location.hash);if(anchor)document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'});});
  render();
  return {state:()=>({...state}),selectCrop:(id:string,notify=true)=>select('crops',id,notify),restore};
}
