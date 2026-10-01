export function initAfricaOverviewAdapter(){
 const root=document.querySelector<HTMLElement>('[data-country-overview][data-overview-region="africa"]');
 if(!root||root.dataset.africaOverviewReady)return;
 root.dataset.africaOverviewReady='true';
 const region=root.querySelector<HTMLElement>('.overview-region-reading')!;
 const detail=root.querySelector<HTMLElement>('[data-overview-country-detail]')!;
 const fixed=document.createElement('div');fixed.className='africa-overview-fixed';
 const scroll=document.createElement('div');scroll.className='africa-overview-scroll';scroll.tabIndex=0;scroll.setAttribute('aria-label','地域・選択国の詳しい説明');
 for(const node of [...region.children])(['overview-reading-eyebrow','overview-region-intro'].some(name=>node.classList.contains(name))||node.tagName==='H2'?fixed:scroll).append(node);
 const regionContent=document.createElement('div');while(scroll.firstChild)regionContent.append(scroll.firstChild);scroll.append(regionContent,detail);region.append(fixed,scroll);
 const regionTitle=fixed.querySelector('h2')!.textContent!;
 const intro=fixed.querySelector<HTMLElement>('.overview-region-intro')!;const regionIntro=intro.textContent!;
 const actions=document.createElement('div');actions.className='africa-overview-actions';const link=document.createElement('a');link.textContent='農林業の分布と比べる';actions.append(link);fixed.append(actions);
 const sync=()=>{
  const selected=root.querySelector<HTMLSelectElement>('[data-overview-country]')!.value;
  const title=root.querySelector<HTMLElement>('[data-overview-place-title]')!.textContent!;
  fixed.querySelector('h2')!.textContent=selected?title:regionTitle;
  fixed.querySelector<HTMLElement>('.overview-reading-eyebrow')!.textContent=selected?'選択した国・地域の説明':'地域の概要';
  intro.textContent=selected?`${title}の位置を地図で確認しました。国別の詳細本文は未整備です。地域の分布・国別統計と合わせて読めます。`:regionIntro;
  regionContent.hidden=!!selected;
  const params=new URLSearchParams(location.search);
  for(const field of root.querySelectorAll<HTMLAnchorElement>('[data-overview-field]')){
   const url=new URL(field.href);selected?url.searchParams.set('place',selected):url.searchParams.delete('place');
   for(const key of ['region','zoom','only','fallback']){const value=params.get(key),valid=key==='region'?['all','north','west','central','east','south'].includes(value??''):key==='zoom'?['all','region','country','theme'].includes(value??''):value==='0'||value==='1';if(valid)url.searchParams.set(key,value!);else url.searchParams.delete(key);}
   field.href=url.href;
  }
  link.href=root.querySelector<HTMLAnchorElement>('[data-overview-field="agriculture"]')!.href;
 };
 const source=root.querySelector<HTMLElement>('[data-overview-place-summary]')!;
 new MutationObserver(sync).observe(source,{childList:true,subtree:true,characterData:true});
 sync();
}
