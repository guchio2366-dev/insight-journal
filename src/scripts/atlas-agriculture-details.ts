import {animalDetailIds,cropDetailIds,isProduct,readingAnchor,readAgricultureDetailState,readAgricultureReadingState,writeAgricultureDetailState,type AgricultureDetailState,type ReadingView} from '../lib/atlas-agriculture-detail-state';

/** Move the server-rendered nodes once: all data and native details remain intact. */
export function createAgricultureDetails(root:HTMLElement,changed:(state:AgricultureDetailState,push:boolean,url:URL,source?:'map'|'restore')=>void) {
  const read=()=>{const url=new URL(location.href),legacy=readAgricultureDetailState(url),reading=readAgricultureReadingState(url);if(reading.view.kind==='product'){if(cropDetailIds.includes(reading.view.id as any))legacy.stats=reading.view.id;if(animalDetailIds.includes(reading.view.id as any))legacy.livestockStats=reading.view.id;}return {...legacy,reading};};
  let state=read(),trigger:HTMLElement|null=null;
  const q=(s:string)=>root.querySelector<HTMLElement>(s)!;
  const panel=q('[data-agri-reading-panel]'),content=q('[data-agri-reading-content]'),heading=q('#agri-reading-heading'),stats=q('[data-agri-statistics]');
  const copies=new Map<string,HTMLElement>(),panels=new Map<string,HTMLElement>(),titles=new Map<string,string>();
  root.querySelectorAll<HTMLElement>('[data-stat-panel],[data-livestock-stat-panel]').forEach(node=>{
    const id=node.dataset.statPanel??node.dataset.livestockStatPanel!,copy=node.querySelector<HTMLElement>('.atlas-crop-copy')!;
    titles.set(id,copy.querySelector('h3')!.textContent!.trim());copy.id=node.id;node.removeAttribute('id');node.removeAttribute('role');node.removeAttribute('aria-labelledby');
    copies.set(id,copy);panels.set(id,node);content.append(copy);q('[data-agri-statistics-panels]').append(node);
  });
  root.querySelectorAll<HTMLElement>('[data-agri-extra-copy]').forEach(copy=>{const id=copy.dataset.agriExtraCopy!;titles.set(id,copy.querySelector('h3')!.textContent!.trim());copies.set(id,copy);content.append(copy);});
  root.querySelectorAll<HTMLElement>('[data-relation-item]').forEach(copy=>{const id=copy.dataset.relationItem!;titles.set(id,copy.querySelector('.relation-title')!.textContent!.trim());copy.querySelector<HTMLDetailsElement>('details')!.open=true;copies.set(id,copy);content.append(copy);});
  // Group anchors remain useful, now targeting the always-visible product lists.
  for(const [oldId,newId] of [['crop-details','agri-crop-picker'],['livestock-details','agri-livestock-picker']]){
    const old=q('#'+oldId);old.hidden=true;old.removeAttribute('id');q('#'+newId).id=oldId;
  }
  root.dataset.agriReadingReady='true';
  const isWide=()=>matchMedia('(min-width:960px) and (min-height:600px)').matches;
  const region=q('[data-agri-region]'),candidates=q('[data-agri-candidates]');
  const render=()=>{
    const v=state.reading.view,key=v.kind==='overview'?null:v.id,product=state.reading.resumeProductId;
    root.dataset.agriReading=v.kind;
    q('[data-agri-overview]').hidden=v.kind!=='overview';panel.hidden=v.kind==='overview';
    heading.textContent=key?titles.get(key)??'農業の解説':'';
    for(const [id,node] of copies)node.hidden=id!==key;
    const statId=v.kind!=='forestry'&&product&&product!=='specialty'?product:null;
    stats.hidden=!statId;
    q('[data-forest-statistics]').hidden=v.kind!=='forestry';
    q('[data-agri-statistics-heading]').textContent=statId?`${titles.get(statId)}の統計`:'';
    for(const [id,node] of panels)node.hidden=id!==statId;
    root.querySelectorAll<HTMLAnchorElement>('[data-crop-key] a').forEach(a=>{const target=readingAnchor(a.hash),active=target?.kind===v.kind&&'id' in target&&'id' in v&&target.id===v.id;if(active)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');a.setAttribute('aria-controls','agri-reading-heading');});
    root.querySelectorAll<HTMLElement>('[data-relation-select]').forEach(a=>a.setAttribute('aria-pressed',String(v.kind==='relation'&&v.id===a.dataset.relationSelect)));
    root.querySelectorAll<HTMLButtonElement>('[data-milk-basis]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.milkBasis===state.milkBasis)));
    root.querySelectorAll<HTMLElement>('[data-milk-panel]').forEach(p=>p.hidden=p.dataset.milkPanel!==state.milkBasis);
  };
  const commit=(push:boolean,source?:'map'|'restore')=>changed({...state},push,writeAgricultureDetailState(new URL(location.href),state),source);
  const focusReading=()=>{
    if(isWide())return;
    const rect=heading.getBoundingClientRect();
    if(rect.top<0||rect.bottom>innerHeight)heading.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    heading.focus({preventScroll:true});
  };
  const select=(view:ReadingView,notify=true,source?:'map')=>{
    const prior=JSON.stringify(state.reading);
    state.reading={view,resumeProductId:view.kind==='product'?view.id:view.kind==='overview'?null:state.reading.resumeProductId};
    if(view.kind==='product'){
      if(cropDetailIds.includes(view.id as any))state.stats=view.id;
      if(animalDetailIds.includes(view.id as any))state.livestockStats=view.id;
    }
    region.hidden=true;region.removeAttribute('open');candidates.hidden=true;render();
    if(notify&&prior!==JSON.stringify(state.reading))commit(true,source);
    else if(notify)commit(false,source);
    if(notify)focusReading();
    q('[data-atlas-live]').textContent=view.kind==='overview'?'米国の農林業を表示しました。':`${titles.get(view.id)}の解説を表示しました。`;
  };
  const product=(id:string,notify=true,source?:'map')=>{if(isProduct(id))select({kind:'product',id},notify,source);};
  const relation=(id:string,notify=true)=>{
    const view=readingAnchor('#relation-'+id);if(!view)return;
    const current=state.reading.view;
    select(current.kind==='relation'&&current.id===id?(state.reading.resumeProductId?{kind:'product',id:state.reading.resumeProductId}:{kind:'overview'}):view,notify);
  };
  const overview=()=>{select({kind:'overview'});if(trigger?.isConnected&&!trigger.closest('[hidden]'))trigger.focus({preventScroll:true});};
  q('[data-agri-overview-button]').addEventListener('click',overview);
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden&&root.dataset.field==='agriculture'&&(event.target as Element).closest('[data-agri-reading-panel]')){event.preventDefault();overview();}});
  root.addEventListener('click',event=>{
    if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.button!==0)return;
    const a=(event.target as Element).closest<HTMLAnchorElement>('a[href]');if(!a)return;
    const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname!==location.pathname)return;
    const view=readingAnchor(url.hash);if(!view)return;
    event.preventDefault();trigger=a;
    if(view.kind==='relation')relation(view.id);else if(view.kind==='product')product(view.id);else if(view.kind==='forestry')select(view);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-milk-basis]').forEach(b=>b.addEventListener('click',()=>{state.milkBasis=b.dataset.milkBasis==='skim'?'skim':'fat';render();commit(false,'restore');}));
  const restore=()=>{state=read();region.hidden=true;candidates.hidden=true;render();return {...state};};
  window.addEventListener('hashchange',()=>{restore();commit(false,'restore');});
  const left=q('.atlas-map-column');
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{
    const height=Math.round(left.getBoundingClientRect().height);if(height>0)panel.style.setProperty('--agri-map-height',height+'px');
  }).observe(left);
  render();
  return {state:()=>({...state}),selectProduct:product,selectCrop:product,selectRelation:relation,selectContext:(notify=true)=>select({kind:'map-context',id:'corn-soybean'},notify,'map'),overview,restore,
    region:(title?:string,text?:string)=>{region.hidden=!title;if(title){region.querySelector('summary')!.textContent='選択地域：'+title;region.querySelector('p')!.textContent=text??'';}},
    candidates:(items:{label:string;select:()=>void}[])=>{candidates.replaceChildren();candidates.hidden=false;q('[data-agri-overview]').hidden=true;panel.hidden=false;heading.textContent='重なっている畜産';for(const node of copies.values())node.hidden=true;region.hidden=true;for(const item of items){const b=document.createElement('button');b.type='button';b.textContent=item.label;b.addEventListener('click',item.select);candidates.append(b);}}
  };
}
