/** Keep the selected overview country when opening a Latin America field. */
export function initLatinOverviewLinks(root:HTMLElement):void {
 if(root.dataset.latinOverviewLinksReady==='true')return;
 root.dataset.latinOverviewLinksReady='true';
 let countryChanged=false;
 const update=()=>{const country=root.querySelector<HTMLSelectElement>('[data-overview-country]')?.value??'',params=new URLSearchParams(location.search),requested=params.get('scope'),scope=countryChanged?(country?'country':'all'):requested&&['all','central','south','country'].includes(requested)?requested:country?'country':'all';if(countryChanged){const current=new URL(location.href);current.searchParams.set('scope',scope);window.history.replaceState(null,'',current);countryChanged=false;}for(const link of root.querySelectorAll<HTMLAnchorElement>('.country-overview-fields [data-overview-field]')){const url=new URL(link.href);country?url.searchParams.set('place',country):url.searchParams.set('place','all');url.searchParams.set('scope',scope);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}link.href=url.href;}};
 const schedule=(event:Event)=>{const target=event.target as Element;if((event.type==='change'&&target?.closest?.('[data-overview-country]'))||(event.type==='click'&&target?.closest?.('[data-overview-map-country],[data-overview-label-country],[data-overview-map-city],[data-overview-reset]')))countryChanged=true;queueMicrotask(update);};
 root.addEventListener('change',schedule);root.addEventListener('click',schedule);window.addEventListener('popstate',schedule);requestAnimationFrame(update);
}
