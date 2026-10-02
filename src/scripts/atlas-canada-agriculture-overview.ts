export function initCanadaAgricultureOverview(root:HTMLElement){
 if(root.dataset.canadaCrop==='wheat')return;
 const censusIds=new Set([...root.querySelectorAll<HTMLOptionElement>('[data-canada-census-region] option')].map(option=>option.value).filter(Boolean));
 const selected=()=>{const q=new URL(location.href).searchParams;return q.get('item')==='overview'?false:q.get('item')==='canola'||censusIds.has(q.get('ccs')??'')||['year','province','compare','metric','zoom'].some(key=>q.has(key));};
 const render=(active=selected())=>{
  root.dataset.canolaReadingMode=active?'selected':'overview';
  for(const node of root.querySelectorAll<HTMLElement>('[data-canola-overview-reading],[data-canola-country-map]'))node.hidden=active;
  for(const node of root.querySelectorAll<HTMLElement>('[data-canola-selected-reading],[data-canola-selected-map]'))node.hidden=!active;
  for(const link of root.querySelectorAll<HTMLAnchorElement>('[data-canola-select-item]'))active?link.setAttribute('aria-current','true'):link.removeAttribute('aria-current');
 };
 const returnToOverview=()=>{const url=new URL(location.href);url.searchParams.set('item','overview');history.pushState(null,'',url);render(false);};
 const showSelectedControl=()=>{const url=new URL(location.href);url.searchParams.set('item','canola');history.replaceState(null,'',url);render(true);};
 root.addEventListener('click',event=>{
  if(!(event.target instanceof Element))return;
  if(event.target.closest('[data-canola-select-item]')){event.preventDefault();const url=new URL(location.href);url.searchParams.set('item','canola');history.pushState(null,'',url);render(true);}
  else if(event.target.closest('[data-canola-overview-return]'))returnToOverview();
  else if(event.target.closest('[data-canola-province-button],[data-canola-zoom],[data-canola-map-reset]'))showSelectedControl();
 });
 root.addEventListener('change',event=>{if(event.target instanceof Element&&event.target.matches('[data-canola-year],[data-canola-metric],[data-canola-province],[data-canola-compare]'))showSelectedControl();});
 window.addEventListener('popstate',()=>render());
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.dataset.canolaReadingMode==='selected')returnToOverview();});
 render();
}
