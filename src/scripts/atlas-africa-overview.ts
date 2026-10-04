import {initAfricaOverviewMap} from './atlas-africa-overview-map';
import {cropChoices,livestockChoices,cropMeasureChoices,canonicalAgriLayers} from '../data/atlas/africa-atlas';
import type {AfricaOverviewEntry,AfricaOverviewTopic} from '../data/atlas/africa-overview';
interface Config {regionId:string;regionLabel:string;bounds:number[];width:number;height:number;countries:AfricaOverviewEntry[];cities:{id:string;name:string;country:string;point:number[];capital:boolean;rank:number}[];fields:{id:string;href:string}[];topics:{id:AfricaOverviewTopic;label:string}[]}
export function initAfricaOverview(root:HTMLElement){
 if(root.dataset.aoReady==='true')return;
 const node=root.querySelector<HTMLScriptElement>('[data-ao-config]');if(!node)return;
 const config:Config=JSON.parse(node.textContent??'{}');
 const picker=root.querySelector<HTMLSelectElement>('[data-ao-country]')!;
 const topicPicker=root.querySelector<HTMLSelectElement>('[data-ao-topic]')!;
 const read=()=>{const q=new URLSearchParams(location.search);const raw=q.get('place')??q.get('country');const country=config.countries.find(c=>c.code===raw)?.code??'';const city=config.cities.find(c=>c.id===q.get('city')&&(!country||c.country===country));return {country:country||city?.country||'',city:city?.id??'',topic:config.topics.find(t=>t.id===(q.get('reading')??q.get('topic')))?.id??'nature' as AfricaOverviewTopic};};
 let state=read();
 const map=initAfricaOverviewMap(root,config,(country,city='')=>{state={...state,country,city};render(true);write(false);});
 function write(replace:boolean){const url=new URL(location.href);url.searchParams.delete('country');state.country?url.searchParams.set('place',state.country):url.searchParams.delete('place');state.city?url.searchParams.set('city',state.city):url.searchParams.delete('city');state.country?url.searchParams.set('reading',state.topic):url.searchParams.delete('reading');if(url.searchParams.get('compare')===state.country)url.searchParams.delete('compare');if(url.href!==location.href)history[replace?'replaceState':'pushState'](null,'',url);}
 function retainedContext(url:URL,country:string){const q=new URLSearchParams(location.search);const year=Number(q.get('year'));if(q.has('year')&&Number.isInteger(year)&&year>=2000&&year<=2024)url.searchParams.set('year',String(year));const compare=q.get('compare');if(compare!==country&&config.countries.some(c=>c.code===compare))url.searchParams.set('compare',compare!);const region=q.get('region');if(['all','north','west','central','east','south'].includes(region??''))url.searchParams.set('region',region!);const zoom=q.get('zoom');if(['all','region','country','theme'].includes(zoom??''))url.searchParams.set('zoom',zoom!);for(const flag of ['only','fallback']){const value=q.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);}for(const [key,choices] of [['crop',cropChoices],['livestock',livestockChoices],['cropMeasure',cropMeasureChoices]] as const){const value=q.get(key);if(choices.some(choice=>choice.id===value))url.searchParams.set(key,value!);}if(q.has('agriLayers')){const layers=canonicalAgriLayers(q.get('agriLayers'));if(layers!==null)url.searchParams.set('agriLayers',layers);}if(q.get('agriOutline')==='1')url.searchParams.set('agriOutline','1');return q;}
 function render(announce=false){
  const country=config.countries.find(c=>c.code===state.country),city=config.cities.find(c=>c.id===state.city);
  picker.value=country?.code??'';topicPicker.value=state.topic;root.dataset.aoSelectedCountry=country?.code??'';
  root.querySelector<HTMLElement>('[data-ao-region-reading]')!.hidden=!!country;root.querySelector<HTMLElement>('[data-ao-country-reading]')!.hidden=!country;
  root.querySelector<HTMLElement>('[data-ao-location]')!.textContent=city?city.name+' · '+country?.name:country?.name??'国名・都市名からも選べます';
  if(country){root.querySelector<HTMLElement>('[data-ao-country-name]')!.textContent=country.name;root.querySelector<HTMLElement>('[data-ao-takeaway]')!.textContent=country.takeaway;
   root.querySelectorAll<HTMLElement>('[data-ao-panel]').forEach(panel=>{const reading=country.readings.find(r=>r.id===panel.dataset.aoPanel)!;panel.hidden=reading.id!==state.topic;panel.querySelector<HTMLElement>('[data-ao-panel-title]')!.textContent=reading.title;panel.querySelector<HTMLElement>('[data-ao-panel-copy]')!.replaceChildren(...reading.paragraphs.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));panel.querySelector<HTMLElement>('[data-ao-panel-sources]')!.replaceChildren(...reading.sources.map(s=>{const li=document.createElement('li'),a=document.createElement('a');a.href=s.url;a.textContent=s.label;li.append(a);return li;}));});
  }
  root.querySelectorAll<HTMLAnchorElement>('[data-ao-field]').forEach(link=>{const field=config.fields.find(f=>f.id===link.dataset.aoField);if(!field)return;const url=new URL(field.href,location.href);const q=retainedContext(url,country?.code??'');if(country)url.searchParams.set('place',country.code);
   if(field.id==='overview'){if(country)url.searchParams.set('reading',state.topic);if(city)url.searchParams.set('city',city.id);for(const key of ['field','metric','theme','context','topic','water','layerClass','layerPoint','sourceState','view'])if(q.has(key))url.searchParams.set(key,q.get(key)!);}
   else if(q.get('field')===field.id){for(const key of ['metric','theme','context','topic','water','layerClass','layerPoint','sourceState','view'])if(q.has(key))url.searchParams.set(key,q.get(key)!);}
   link.href=url.href;
  });
  map.select(state.country,state.city);document.title=(country?country.name+'｜':'')+config.regionLabel+'の概要｜Insight Journal';
  if(announce)root.querySelector<HTMLElement>('[data-ao-announcement]')!.textContent=(city?.name??country?.name??config.regionLabel+'全体')+'を表示しました。';
 }
 picker.addEventListener('change',()=>{state={...state,country:picker.value,city:''};render(true);write(false);});
 topicPicker.addEventListener('change',()=>{state.topic=topicPicker.value as AfricaOverviewTopic;render(true);write(false);});
 root.addEventListener('keydown',event=>{const target=(event.target as Element).closest<SVGPathElement>('[data-overview-map-country]');if(target&&(event.key==='Enter'||event.key===' ')){event.preventDefault();state={...state,country:target.dataset.overviewMapCountry??'',city:''};render(true);write(false);}});
 window.addEventListener('popstate',()=>{state=read();render(true);write(true);});
 root.dataset.aoReady='true';render();write(true);
}
