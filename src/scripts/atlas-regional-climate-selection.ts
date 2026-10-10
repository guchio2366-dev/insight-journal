import {climateCity} from '../data/atlas/oceania-russia-climate-reading';

// City selection belongs to these nature panes, not to country/region/camera state.
export function createRegionalClimateSelection(root:HTMLElement,region:string,enabled:()=>boolean,commit:(mutate:()=>void)=>void){
 let id:string|undefined;
 let focusedId:string|undefined;
 const read=()=>{id=climateCity(region,new URLSearchParams(location.search).get('city'))?.id;};
 read();
 const focus=(cityId:string|undefined)=>{if(cityId)root.querySelector<SVGElement>(`[data-primary-map] [data-regional-climate-city="${cityId}"]`)?.focus({preventScroll:true});};
 const select=(cityId:string)=>{
  if(!enabled()||!climateCity(region,cityId))return;
  commit(()=>{id=cityId;});focus(cityId);
 };
 root.addEventListener('click',event=>{
  const target=event.target as Element;
  const marker=target.closest<SVGElement>('[data-regional-climate-city]');
  if(marker){select(marker.dataset.regionalClimateCity!);return;}
  if(target.closest('[data-clear-climate-city]')){const previous=id;commit(()=>{id=undefined;});focus(previous);}
 });
 root.addEventListener('keydown',event=>{
  const marker=(event.target as Element).closest<SVGElement>('[data-regional-climate-city]');
  if(marker&&(event.key==='Enter'||event.key===' ')){event.preventDefault();if(!event.repeat)select(marker.dataset.regionalClimateCity!);}
 });
 return {
  read,
  beforeRender(){const active=document.activeElement;focusedId=active&&root.contains(active)?(active.closest('[data-regional-climate-city]') as SVGElement|null)?.dataset.regionalClimateCity:undefined;},
  serialize(url:URL,allowed:boolean){url.searchParams.delete('city');if(allowed&&enabled()&&id)url.searchParams.set('city',id);},
  render(){
   const panel=root.querySelector<HTMLElement>('[data-regional-climate-reading]');if(!panel)return;
   const show=enabled()&&Boolean(id);
   panel.hidden=!show;panel.parentElement!.dataset.climateCitySelected=String(show);
   if(show&&panel.dataset.city!==id){
    const template=root.querySelector<HTMLTemplateElement>(`[data-regional-climate-template="${id}"]`)!;
    panel.replaceChildren(template.content.cloneNode(true));panel.dataset.city=id;
   }
   root.querySelectorAll<SVGElement>('[data-regional-climate-city]').forEach(marker=>marker.setAttribute('aria-pressed',String(show&&marker.dataset.regionalClimateCity===id)));
   if(enabled())focus(focusedId);
  },
 };
}
