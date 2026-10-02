import {initOverviewMap,type OverviewMapConfig} from './atlas-overview-map';
import {initRegionalOverviewLayout} from './atlas-regional-overview-layout';
import {europeOverviewFieldHref} from '../lib/atlas-europe-country-overview-navigation';
import type {EuropeCountryOverview,EuropeOverviewSource,EuropeOverviewTopicId} from '../data/atlas/europe/country-overviews';
type Fact=EuropeCountryOverview['facts'][number]&{valueText:string};
interface Config extends OverviewMapConfig{countries:{code:string;name:string}[];topics:{id:EuropeOverviewTopicId;label:string}[];fields:{id:string;href:string}[];overviews:(Omit<EuropeCountryOverview,'facts'>&{facts:Fact[]})[];sources:EuropeOverviewSource[];factIds:Record<EuropeOverviewTopicId,string[]>;basePath:string;}

export function initEuropeCountryOverview(root:HTMLElement){
 if(root.dataset.overviewReady==='true')return;
 const configNode=root.querySelector('[data-overview-config]');if(!configNode)return;
 const config=JSON.parse(configNode.textContent??'{}') as Config;
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const picker=q<HTMLSelectElement>('[data-overview-country]'),detail=q('[data-overview-country-detail]'),slot=q('[data-overview-europe-country-slot]'),regional=q('[data-overview-region-reading]');
 slot.append(detail);initRegionalOverviewLayout(root);
 const tabs=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-overview-topic]'));
 const read=()=>{const params=new URLSearchParams(location.search),city=config.cities.find(city=>city.id===params.get('city')),country=config.countries.find(country=>country.code===params.get('country'))?.code??city?.country??'';return{country,city:city?.country===country?city.id:'',topic:config.topics.find(topic=>topic.id===params.get('topic'))?.id??'agriculture' as EuropeOverviewTopicId};};
 let state=read();
 const map=initOverviewMap(root,config,(country,city='')=>{state.country=country;state.city=city;render(true);write(false);});
 const publicHref=(href:string)=>href.startsWith('/atlas/')?config.basePath+href:href;
 const linked=(href:string)=>europeOverviewFieldHref(publicHref(href),state,location.href);
 function factNode(fact:Fact){const item=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd'),link=document.createElement('a');label.textContent=fact.label;value.textContent=fact.valueText;link.textContent='出典';link.href=fact.sourceUrl;link.setAttribute('aria-label',`${fact.label}・${fact.year}年の出典`);item.append(label,value,link);return item;}
 function render(announce=false){
  const country=config.countries.find(country=>country.code===state.country),overview=config.overviews.find(country=>country.code===state.country);
  root.dataset.overviewSelectedCountry=country?.code??'';picker.value=country?.code??'';regional.hidden=!!country;slot.hidden=!country;detail.hidden=!country;
  root.querySelectorAll('[data-overview-country-name]').forEach(node=>node.textContent=country?.name??'');map.select(state.country,state.city);
  const city=config.cities.find(city=>city.id===state.city);
  const cityLabel=q('[data-eu-country-selected-city]');cityLabel.hidden=!city;cityLabel.textContent=city?` · 選択都市：${city.name}`:'';
  const place=q('[data-overview-place-title]');place.textContent=city?`${city.name}（${country?.name}）`:country?.name??'国や都市を選んで、位置を確かめる';
  q('[data-overview-place-description]').textContent=country?'上の分野を選ぶと、この国の分布へ進めます。':'地図の国名・都市名、または上の一覧から国・地域を選べます。';
  q('[data-overview-detail-link]').hidden=true;
  for(const tab of tabs){const active=tab.dataset.overviewTopic===state.topic;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  for(const topic of config.topics){
   const panel=q<HTMLElement>(`#overview-panel-${topic.id}`);panel.hidden=state.topic!==topic.id;
   const copy=overview?.topics[topic.id];
   panel.querySelector('[data-eu-country-takeaway]')!.textContent=copy?.takeaway??'';
   panel.querySelector('[data-eu-country-body]')!.textContent=copy?.body??'';
   const links=panel.querySelector('[data-eu-country-links]')!;links.replaceChildren();
   for(const sourceLink of copy?.links??[]){const a=document.createElement('a');a.href=linked(sourceLink.href);a.textContent=sourceLink.label;links.append(a);}
   const factHost=panel.querySelector<HTMLElement>('[data-eu-country-facts]')!,factList=panel.querySelector('[data-eu-country-fact-list]')!;
   const facts=(overview?.facts??[]).filter(fact=>config.factIds[topic.id].slice(0,2).includes(fact.id));
   factHost.hidden=!facts.some(fact=>fact.value!==null);factList.replaceChildren(...facts.map(factNode));
   const note=panel.querySelector<HTMLElement>('[data-eu-country-evidence-note]')!;note.hidden=!copy?.evidenceNote;note.textContent=copy?.evidenceNote??'';
   const sources=panel.querySelector('[data-eu-country-sources]')!;sources.replaceChildren();
   for(const id of copy?.sourceIds??[]){const source=config.sources.find(source=>source.id===id);if(!source)continue;const li=document.createElement('li'),a=document.createElement('a'),period=document.createElement('span');a.href=source.url;a.textContent=source.label;period.textContent=` · ${source.period} · 確認 ${source.checkedAt}`;li.append(a,period);sources.append(li);}
  }
  q('[data-eu-country-all-facts]').replaceChildren(...(overview?.facts??[]).map(factNode));
  root.querySelectorAll<HTMLAnchorElement>('[data-overview-field]').forEach(link=>{const field=config.fields.find(field=>field.id===link.dataset.overviewField);if(field){link.href=linked(field.href);link.setAttribute('aria-label',country?`${country.name}の${link.textContent?.trim()}の地図へ`:link.textContent?.trim()??'');}});
  const current=q<HTMLAnchorElement>('[data-overview-current-link]'),url=new URL(current.href);url.search='';if(country){url.searchParams.set('country',state.country);url.searchParams.set('topic',state.topic);if(state.city)url.searchParams.set('city',state.city);}current.href=url.href;
  document.title=country?`${country.name}｜欧州の概要｜Insight Journal`:'欧州の概要と白地図｜Insight Journal';
  if(announce)q('[data-overview-announcement]').textContent=country?`${country.name}の${config.topics.find(topic=>topic.id===state.topic)!.label}の要点を表示しました。`:'欧州全体を表示しました。';
 }
 function write(replace:boolean){const url=new URL(location.href);for(const key of ['country','city','topic'])url.searchParams.delete(key);if(state.country){url.searchParams.set('country',state.country);url.searchParams.set('topic',state.topic);if(state.city)url.searchParams.set('city',state.city);}if(url.hash.startsWith('#overview-'))url.hash='';if(url.href!==location.href)history[replace?'replaceState':'pushState']({},'',url);}
 picker.addEventListener('change',()=>{state.country=config.countries.find(country=>country.code===picker.value)?.code??'';state.city='';render(true);write(false);});
 function choose(tab:HTMLButtonElement,focus=false){state.topic=tab.dataset.overviewTopic as EuropeOverviewTopicId;render(true);write(false);if(focus)tab.focus();}
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>choose(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();choose(tabs[next],true);});});
 window.addEventListener('popstate',()=>{state=read();render(true);});render();write(true);root.dataset.overviewReady='true';
}
