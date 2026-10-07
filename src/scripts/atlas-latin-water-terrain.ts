import {latinFoundationRivers,latinFoundationSections,renderLatinFoundationMap,renderLatinFoundationReading,type LatinFoundationSection} from '../lib/atlas-latin-water-terrain';
export function initLatinWaterTerrain():void{
 for(const root of document.querySelectorAll<HTMLElement>('[data-latin-workspace][data-latin-field="nature"]')){
  if(root.dataset.foundationReady==='true')continue;root.dataset.foundationReady='true';
  let selectedRiver:string|null=null;
  const active=()=>{const value=new URLSearchParams(location.search).get('section');return value==='water'?'rivers':value;};
  const render=()=>{
   // Keep the comparison URL for returning to climate, but show foundation
   // sections in the normal map/reader frame with usable geographic controls.
   if(latinFoundationSections.includes(active() as LatinFoundationSection)){
    root.classList.remove('is-comparison');
    for(const control of root.querySelectorAll<HTMLSelectElement>('select[data-nature-scope],select[data-nature-place]'))control.disabled=false;
   }
   const params=new URLSearchParams(location.search),routeRiver=params.get('river');selectedRiver=latinFoundationRivers.some(r=>r.id===routeRiver)?routeRiver:null;
   const scope=root.querySelector<HTMLSelectElement>('[data-nature-scope]')?.value??'all',place=root.querySelector<HTMLSelectElement>('[data-nature-place]')?.value??'all';
   for(const section of latinFoundationSections){const map=root.querySelector<HTMLElement>(`[data-foundation-map="${section}"]`)!;map.innerHTML=renderLatinFoundationMap(section,scope,place,selectedRiver,900/Math.max(250,map.getBoundingClientRect().width||900),active()===section);root.querySelector<HTMLElement>(`[data-foundation-reading="${section}"]`)!.innerHTML=renderLatinFoundationReading(section,selectedRiver);}
   const sources=root.querySelector<HTMLElement>('[data-foundation-sources]');if(sources)sources.hidden=!latinFoundationSections.includes(active() as LatinFoundationSection);
   requestAnimationFrame(()=>{const reader=root.querySelector<HTMLElement>('.latin-reading');if(reader&&!root.classList.contains('has-unavailable-section'))root.style.setProperty('--latin-nature-reader-top',`${Math.round(reader.getBoundingClientRect().top+window.scrollY)}px`);});
  };
  const choose=(id:string|null,keepFocus=false)=>{const url=new URL(location.href);id?url.searchParams.set('river',id):url.searchParams.delete('river');if(url.href!==location.href)history.pushState(null,'',url);render();root.querySelector<HTMLElement>('.latin-reading-scroll')!.scrollTop=0;if(id&&keepFocus)root.querySelector<SVGElement>(`[data-foundation-river="${id}"]`)?.focus({preventScroll:true});};
  root.addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-foundation-river],[data-foundation-overview]');if(!target)return;choose(target.dataset.foundationRiver??null,document.activeElement===target);});
  root.addEventListener('keydown',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-foundation-river]');if(!target||!['Enter',' '].includes(event.key))return;event.preventDefault();choose(target.dataset.foundationRiver!,true);});
  root.addEventListener('change',()=>queueMicrotask(render));window.addEventListener('popstate',render);window.addEventListener('latin-section-change',render);window.addEventListener('resize',()=>requestAnimationFrame(render));requestAnimationFrame(render);
 }
}
initLatinWaterTerrain();document.addEventListener('astro:page-load',initLatinWaterTerrain);
