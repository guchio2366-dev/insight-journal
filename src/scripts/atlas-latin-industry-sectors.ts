import {latinIndustrySectors as data,sectorIndustries,sectorSitesForScope,industryById,readIndustrySectorState,writeIndustrySectorState,renderIndustrySectorMap,type IndustrySectorState} from '../lib/atlas-latin-industry-sectors';
export function isIndustrySectorRoute(){const p=new URLSearchParams(location.search);return p.has('sector')||!p.has('layer')&&!p.has('from')&&!p.has('case');}
export function initLatinIndustrySectors(root:HTMLElement){
 if(root.dataset.lisReady==='true')return;root.dataset.lisReady='true';const workspace=root.closest<HTMLElement>('[data-latin-workspace]')!;
 const q=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 let state=readIndustrySectorState(new URL(location.href));
 const map=q('[data-lis-map]');
 const text=(s:string,t:string)=>q(s).textContent=t;
 function save(push=true){const url=writeIndustrySectorState(new URL(location.href),state);if(url.href!==location.href)history[push?'pushState':'replaceState'](null,'',url);render();}
 function choose(id:string,site:string|null=null){if(state.industry===id&&state.site===site&&!state.single)return;state={...state,industry:id,site,single:false};save();}
 function render(){
  const sector=data.sectors.find(s=>s.id===state.sector)!,industry=industryById(state.industry),site=data.sites.find(s=>s.id===state.site);
  workspace.dataset.industrySectorMode='true';workspace.dataset.latinReady='true';root.dataset.sector=state.sector;root.dataset.industry=state.industry??'all';root.dataset.site=state.site??'';
  const grid=root.querySelector<HTMLElement>('.latin-sector-grid')!,top=Math.round(grid.getBoundingClientRect().top+scrollY)||298;root.style.setProperty('--lis-top',top+'px');
  const rect=map.getBoundingClientRect(),width=Math.max(400,rect.width||960),height=Math.max(440,rect.height||770);const focused=(document.activeElement as HTMLElement)?.dataset.lisSite??(document.activeElement as HTMLElement)?.dataset.lisIndustry;
  map.innerHTML=renderIndustrySectorMap(state,width,height);
  for(const b of workspace.querySelectorAll<HTMLButtonElement>('[data-latin-industry-sector]')){const active=b.dataset.latinIndustrySector===state.sector;b.setAttribute('aria-pressed',String(active));b.tabIndex=active?0:-1;}
  text('[data-lis-title]',industry?.labels[state.sector as keyof typeof industry.labels]??sector.label);text('[data-lis-overview]',industry?.overview??sector.overview);text('[data-lis-why]',industry?.why??sector.why);
  const range=q('[data-lis-range-note]'),scoped=sectorSitesForScope(state.sector,state.scope);range.hidden=state.scope==='all';range.textContent=`この分野・範囲の採用例：${scoped.length}拠点。表示がない地域に産業がないという意味ではありません。`+(site&&!scoped.some(s=>s.id===site.id)?' 選択した拠点は現在の表示範囲外です。':industry&&!scoped.some(s=>s.industry===industry.id)?' 選択した産業の採用例は現在の表示範囲にありません。':'');
  q('[data-lis-single]').hidden=!industry;q<HTMLButtonElement>('[data-lis-single]').textContent=state.single?'ほかの産業も表示する':'この産業だけを見る';q('[data-lis-clear]').hidden=!industry;
  const legend=q('[data-lis-legend]');legend.replaceChildren();for(const i of sectorIndustries(state.sector)){const b=document.createElement('button');b.type='button';b.dataset.lisIndustry=i.id;b.setAttribute('aria-pressed',String(i.id===state.industry));const key=document.createElement('i');key.style.background=i.color;b.append(key,document.createTextNode(i.labels[state.sector as keyof typeof i.labels]??i.label));legend.append(b);}
  const list=q('[data-lis-sites]');list.replaceChildren();for(const s of scoped.filter(s=>!industry||s.industry===industry.id)){const b=document.createElement('button');b.type='button';b.dataset.lisSite=s.id;b.textContent=s.place+'｜'+s.stage;b.setAttribute('aria-pressed',String(s.id===state.site));list.append(b);}
  q('[data-lis-site-reading]').hidden=!site;if(site){text('[data-lis-site-title]',site.place+'：'+site.stage);text('[data-lis-site-note]',site.note);text('[data-lis-coordinate-note]',site.coordinateMeaning);}
  const refs=q('[data-lis-sources]');refs.replaceChildren();const ids=new Set(site?.sources??industry?.sources??sectorIndustries(state.sector).flatMap(i=>i.sources));for(const id of ids){const source=data.sources.find(s=>s.id===id);if(!source)continue;const li=document.createElement('li'),a=document.createElement('a');a.href=source.url;a.textContent=source.title+'（'+source.period+'）';li.append(a);refs.append(li);}
  const overlap=q<HTMLButtonElement>('[data-lis-overlap]'),other=site?.sectors.find(s=>s!==state.sector);overlap.hidden=!other;if(other)overlap.textContent='同じ拠点を'+data.sectors.find(s=>s.id===other)!.label+'で読む';
  const scope=workspace.querySelector<HTMLSelectElement>('[data-lis-scope]');if(scope)scope.value=state.scope;
  // Hidden legacy controls retain incoming field navigation without selecting any city.
  const oldPlace=workspace.querySelector<HTMLSelectElement>('[data-industry-place]'),oldScope=workspace.querySelector<HTMLSelectElement>('[data-industry-scope]');if(oldPlace)oldPlace.value=state.place;if(oldScope)oldScope.value=state.contextScope??state.scope;
  if(focused)root.querySelector<HTMLElement>(`[data-lis-site="${CSS.escape(focused)}"],[data-lis-industry="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
 }
 root.addEventListener('click',e=>{const el=e.target as Element,site=el.closest<HTMLElement>('[data-lis-site]'),item=el.closest<HTMLElement>('[data-lis-industry]');if(site){const s=data.sites.find(s=>s.id===site.dataset.lisSite);if(s)choose(s.industry,s.id);return;}if(item){choose(item.dataset.lisIndustry!);return;}if(el.closest('[data-lis-single]')){state.single=!state.single;save();}if(el.closest('[data-lis-clear]')){state.industry=null;state.site=null;state.single=false;save();}if(el.closest('[data-lis-overlap]')){const s=data.sites.find(s=>s.id===state.site)!;state.sector=s.sectors.find(s=>s!==state.sector) as IndustrySectorState['sector'];state.single=false;save();}});
 root.addEventListener('mousedown',e=>{const el=(e.target as Element).closest<HTMLElement>('[data-lis-site],[data-lis-industry]');if(el){e.preventDefault();el.focus({preventScroll:true});}});
 root.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target instanceof Element&&e.target.closest('[data-lis-site],[data-lis-industry]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 for(const b of workspace.querySelectorAll<HTMLButtonElement>('[data-latin-industry-sector]'))b.addEventListener('click',()=>{state={...state,sector:b.dataset.latinIndustrySector as IndustrySectorState['sector'],industry:null,site:null,single:false};save();});
 const tabs=[...workspace.querySelectorAll<HTMLButtonElement>('[data-latin-industry-sector]')];workspace.querySelector('[data-industry-sector-nav]')?.addEventListener('keydown',event=>{const e=event as KeyboardEvent,index=tabs.indexOf(document.activeElement as HTMLButtonElement);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus({preventScroll:true});});
 workspace.querySelector('[data-lis-scope]')?.addEventListener('change',e=>{state.scope=(e.target as HTMLSelectElement).value as IndustrySectorState['scope'];delete state.contextScope;save();});
 window.addEventListener('popstate',()=>{if(!isIndustrySectorRoute()){location.reload();return;}state=readIndustrySectorState(new URL(location.href));render();});
 const resize=()=>requestAnimationFrame(render);if(window.ResizeObserver)new window.ResizeObserver(resize).observe(map);window.addEventListener('resize',resize);document.fonts?.ready.then(resize);
 save(false);
}
