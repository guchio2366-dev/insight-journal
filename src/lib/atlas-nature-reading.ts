import type {NatureAction,NatureEditorial} from '../data/atlas/nature-editorial';
import {cityAgricultureUrl} from './atlas-city-agriculture-link';

/** Real URLs preserve browser Back and the user's existing crop/camera context. */
export function natureReadingUrl(source:URL,base:string,action:NatureAction):URL{
  if(action.product)return cityAgricultureUrl(source,base,source.searchParams.get('city')??'',action.product);
  const url=new URL(source);url.pathname=base+'nature/';url.hash='nature-map-panel';
  for(const key of ['field','natureFeature','waterView','basin','precipBand','agriInsight'])url.searchParams.delete(key);
  for(const key of ['env','natureFeature','waterView','basin','precipBand','city'] as const){
    const value=action[key];if(value)url.searchParams.set(key,value);
  }
  return url;
}

export function renderNatureReading(host:HTMLElement,body:string,editorial:NatureEditorial|undefined,source:URL,base:string){
  host.replaceChildren();
  if(editorial){
    const lead=document.createElement('p'),strong=document.createElement('strong'),heading=document.createElement('h4');
    lead.className='atlas-reading-takeaway';strong.textContent=editorial.takeaway;lead.append(strong);
    heading.textContent=editorial.heading;host.append(lead,heading);
  }
  const p=document.createElement('p');p.textContent=body;host.append(p);
  if(editorial){
    const link=document.createElement('a');link.className='atlas-reading-action';link.dataset.natureReadingLink='';
    link.textContent=editorial.action.label+' →';link.href=natureReadingUrl(source,base,editorial.action).href;host.append(link);
  }
}
