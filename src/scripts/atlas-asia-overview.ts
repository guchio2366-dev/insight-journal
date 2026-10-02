import {initAsiaOverviewMap} from './atlas-asia-overview-map';
import type {AsiaOverviewEntry,AsiaOverviewTopic} from '../data/atlas/asia-overview';
interface Config {regionId:string;regionLabel:string;bounds:number[];width:number;height:number;countries:AsiaOverviewEntry[];cities:{id:string;name:string;country:string;point:number[];capital:boolean;rank:number}[];fields:{id:string;href:string}[];topics:{id:AsiaOverviewTopic;label:string}[];peers:{id:string;href:string;countries:string[];cities:string[]}[]}
export function initAsiaOverview(root:HTMLElement) {
 if(root.dataset.aoReady==='true')return;
 const node=root.querySelector<HTMLScriptElement>('[data-ao-config]');if(!node)return;
 const config:Config=JSON.parse(node.textContent??'{}');
 const picker=root.querySelector<HTMLSelectElement>('[data-ao-country]')!;
 const topicPicker=root.querySelector<HTMLSelectElement>('[data-ao-topic]')!;
 const read=()=>{const q=new URLSearchParams(location.search);const raw=q.get('country')??q.get('place');const country=config.countries.find(c=>c.code===raw)?.code??'';const city=config.cities.find(c=>c.id===q.get('city')&&(!country||c.country===country));return {country:country||city?.country||'',city:city?.id??'',topic:config.topics.find(t=>t.id===q.get('topic'))?.id??'nature' as AsiaOverviewTopic};};
 let state=read();
 const map=initAsiaOverviewMap(root,config,(country,city='')=>{state={...state,country,city};render(true);write(false);});
 function write(replace:boolean){const url=new URL(location.href);url.searchParams.delete('place');state.country?url.searchParams.set('country',state.country):url.searchParams.delete('country');state.city?url.searchParams.set('city',state.city):url.searchParams.delete('city');state.country?url.searchParams.set('topic',state.topic):url.searchParams.delete('topic');if(url.href!==location.href)history[replace?'replaceState':'pushState'](null,'',url);}
 function render(announce=false){
  const country=config.countries.find(c=>c.code===state.country),city=config.cities.find(c=>c.id===state.city);
  picker.value=country?.code??'';topicPicker.value=state.topic;
  root.dataset.aoSelectedCountry=country?.code??'';
  root.querySelector<HTMLElement>('[data-ao-region-reading]')!.hidden=!!country;
  root.querySelector<HTMLElement>('[data-ao-country-reading]')!.hidden=!country;
  root.querySelector<HTMLElement>('[data-ao-location]')!.textContent=city?`${city.name} · ${country?.name}`:country?.name??'国名・都市名からも選べます';
  if(country){root.querySelector<HTMLElement>('[data-ao-country-name]')!.textContent=country.name;root.querySelector<HTMLElement>('[data-ao-takeaway]')!.textContent=country.takeaway;
   root.querySelectorAll<HTMLElement>('[data-ao-panel]').forEach(panel=>{const reading=country.readings.find(r=>r.id===panel.dataset.aoPanel)!;panel.hidden=reading.id!==state.topic;panel.querySelector<HTMLElement>('[data-ao-panel-title]')!.textContent=reading.title;const copy=panel.querySelector<HTMLElement>('[data-ao-panel-copy]')!;copy.replaceChildren(...reading.paragraphs.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));const sources=panel.querySelector<HTMLElement>('[data-ao-panel-sources]')!;sources.replaceChildren(...reading.sources.map(s=>{const li=document.createElement('li'),a=document.createElement('a');a.href=s.url;a.textContent=s.label;li.append(a);return li;}));});
  }
  root.querySelectorAll<HTMLAnchorElement>('[data-ao-field]').forEach(link=>{const field=config.fields.find(f=>f.id===link.dataset.aoField);if(!field)return;const url=new URL(field.href,location.href);if(country)url.searchParams.set(field.id==='overview'||config.regionId==='west-asia'?'country':'place',country.code);if(field.id==='overview'&&country){url.searchParams.set('topic',state.topic);if(city)url.searchParams.set('city',city.id);}link.href=url.href;});
  const camera=new URLSearchParams(location.search),lng=Number(camera.get('lng')),lat=Number(camera.get('lat')),zoom=Number(camera.get('z'));
  if(['lng','lat','z'].every(k=>!!camera.get(k)?.trim())&&Number.isFinite(lng)&&Number.isFinite(lat)&&Number.isFinite(zoom)&&lng>=config.bounds[0]&&lng<=config.bounds[2]&&lat>=config.bounds[1]&&lat<=config.bounds[3]&&zoom>=1&&zoom<=9)root.querySelectorAll<HTMLAnchorElement>('[data-ao-field]').forEach(link=>{const url=new URL(link.href);for(const key of ['lng','lat','z'])url.searchParams.set(key,camera.get(key)!);link.href=url.href;});
  root.querySelectorAll<HTMLAnchorElement>('[data-ao-peer]').forEach(link=>{const peer=config.peers.find(p=>p.id===link.dataset.aoPeer)!;const url=new URL(peer.href,location.href);if(country&&peer.countries.includes(country.code)){url.searchParams.set('country',country.code);url.searchParams.set('topic',state.topic);if(city&&peer.cities.includes(city.id))url.searchParams.set('city',city.id);}link.href=url.href;});
  map.select(state.country,state.city);
  document.title=`${country?country.name+'｜':''}${config.regionLabel}の概要｜Insight Journal`;
  if(announce)root.querySelector<HTMLElement>('[data-ao-announcement]')!.textContent=`${city?.name??country?.name??config.regionLabel+'全体'}を表示しました。`;
 }
 picker.addEventListener('change',()=>{state={...state,country:picker.value,city:''};render(true);write(false);});
 topicPicker.addEventListener('change',()=>{state.topic=topicPicker.value as AsiaOverviewTopic;render(true);write(false);});
 root.addEventListener('keydown',event=>{const target=(event.target as Element).closest<SVGPathElement>('[data-overview-map-country]');if(target&&(event.key==='Enter'||event.key===' ')){event.preventDefault();state={...state,country:target.dataset.overviewMapCountry??'',city:''};render(true);write(false);}});
 window.addEventListener('popstate',()=>{state=read();render(true);write(true);});
 root.dataset.aoReady='true';render();write(true);
}
