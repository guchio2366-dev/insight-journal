type OverviewState={stateCode:string;nameJa:string;population:number;density:number;viewBox:string;reading:{heading:string;text:string;cause:string}};
export function initMexicoOverview(root:HTMLElement){
 if(root.dataset.overviewReady)return;
 const config=JSON.parse(root.querySelector('[data-mexico-overview-config]')!.textContent!) as {states:OverviewState[];fields:Record<string,string>;viewBox:string};
 const q=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const read=()=>{const p=new URL(location.href).searchParams;return {code:config.states.some(s=>s.stateCode===p.get('state'))?p.get('state')!:'',zoom:p.get('frame')==='selected'};};
 let state=read();
 if(!state.code){const url=new URL(location.href);url.searchParams.delete('state');url.searchParams.set('reading','overview');history.replaceState(history.state,'',url);root.dataset.mexicoInitialReadingSelected='false';root.dispatchEvent(new CustomEvent('mexico-reading-mode',{detail:{selected:false}}));}
 function render(){
  const selected=config.states.find(row=>row.stateCode===state.code);
  q<HTMLSelectElement>('[data-mexico-overview-state]').value=state.code;
  q<HTMLButtonElement>('[data-mexico-overview-focus]').disabled=!selected;
  q('[data-mexico-overview-reading]').toggleAttribute('hidden',!selected);
  q<SVGSVGElement>('[data-mexico-overview-map]').setAttribute('viewBox',selected&&state.zoom?selected.viewBox:config.viewBox);
  for(const shape of root.querySelectorAll<SVGElement>('[data-mexico-overview-shape]')){const chosen=shape.dataset.mexicoOverviewShape===state.code;shape.classList.toggle('is-selected',chosen);shape.setAttribute('aria-pressed',String(chosen));}
  if(!selected)return;
  q('[data-mexico-overview-name]').textContent=selected.nameJa;
  q('[data-mexico-overview-values]').textContent=`人口 ${selected.population.toLocaleString('ja-JP')}人 · 密度 ${selected.density.toLocaleString('ja-JP')}人/km²（2020年）`;
  for(const key of ['heading','text','cause'] as const)q(`[data-mexico-overview-${key}]`).textContent=selected.reading[key];
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-mexico-overview-field]')){const url=new URL(config.fields[a.dataset.mexicoOverviewField!],location.href);if(a.dataset.mexicoOverviewField==='population'){url.searchParams.set('reading','overview');}else{url.searchParams.set('state',selected.stateCode);url.searchParams.set('reading','item');}a.href=url.href;}
 }
 function update(code=state.code,zoom=state.zoom){state={code,zoom};const url=new URL(location.href);if(code)url.searchParams.set('state',code);else url.searchParams.delete('state');if(zoom)url.searchParams.set('frame','selected');else url.searchParams.delete('frame');url.searchParams.set('reading',code?'item':'overview');history.pushState(null,'',url);render();root.dispatchEvent(new CustomEvent('mexico-reading-mode',{detail:{selected:!!code}}));}
 q<HTMLSelectElement>('[data-mexico-overview-state]').addEventListener('change',e=>update((e.target as HTMLSelectElement).value,false));
 for(const shape of root.querySelectorAll<SVGElement>('[data-mexico-overview-shape]')){const choose=()=>update(shape.dataset.mexicoOverviewShape!,false);shape.addEventListener('click',choose);shape.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}
 q('[data-mexico-overview-focus]').addEventListener('click',()=>update(state.code,true));
 q('[data-mexico-overview-reset]').addEventListener('click',()=>update(state.code,false));
 window.addEventListener('popstate',()=>{state=read();render();});
 render();root.dataset.overviewReady='1';
}
