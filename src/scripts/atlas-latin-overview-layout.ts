/** Keep the selected overview country when opening a Latin America field. */
export function initLatinOverviewLinks(root:HTMLElement):void {
 if(root.dataset.latinOverviewLinksReady==='true')return;
 root.dataset.latinOverviewLinksReady='true';
 const update=()=>{const country=root.querySelector<HTMLSelectElement>('[data-overview-country]')?.value??'',params=new URLSearchParams(location.search);for(const link of root.querySelectorAll<HTMLAnchorElement>('.country-overview-fields [data-overview-field]')){const url=new URL(link.href);if(country){url.searchParams.set('place',country);url.searchParams.set('scope','country');}else{url.searchParams.delete('place');url.searchParams.delete('scope');}for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}link.href=url.href;}};
 const schedule=()=>queueMicrotask(update);
 root.addEventListener('change',schedule);root.addEventListener('click',schedule);window.addEventListener('popstate',schedule);requestAnimationFrame(update);
}
