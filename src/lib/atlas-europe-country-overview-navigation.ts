import countries from '../data/atlas/europe/countries.json' with {type:'json'};
export type EuropeOverviewSelection={country:string;topic:string;city?:string};
const topics=['agriculture','nature','industry','population','politics'] as const;
export function readEuropeOverviewReturn(value:string|null,base:string):URL|undefined{
 if(!value||value.length>1500)return;
 try{
  const origin=new URL(base),url=new URL(value,origin);
  if(url.origin!==origin.origin||url.username||url.password||!/^\/(?:insight-journal\/)?atlas\/europe\/overview\/$/.test(url.pathname)||url.hash)return;
  const country=countries.find(country=>country.code===url.searchParams.get('country'));
  if(!country||!topics.includes(url.searchParams.get('topic') as typeof topics[number]))return;
  const keys=[...url.searchParams.keys()];
  if(new Set(keys).size!==keys.length||keys.some(key=>!['country','topic','city'].includes(key)))return;
  if(url.searchParams.has('city')&&!/^[a-z0-9-]{1,80}$/.test(url.searchParams.get('city')!))return;
  return url;
 }catch{return;}
}
export function europeOverviewFieldHref(href:string,selection:EuropeOverviewSelection,base:string):string{
 const origin=new URL(base),url=new URL(href,origin);
 if(url.origin!==origin.origin||!/^\/(?:insight-journal\/)?atlas\/europe\/(?:nature|agriculture|industry|population)\/$/.test(url.pathname))return href;
 const country=countries.find(country=>country.code===selection.country);
 if(!country)return url.href;
 url.searchParams.set('place',country.code);
 const overview=new URL(url.pathname.replace(/(?:nature|agriculture|industry|population)\/$/,'overview/'),origin);
 overview.searchParams.set('country',country.code);
 overview.searchParams.set('topic',topics.includes(selection.topic as typeof topics[number])?selection.topic:'agriculture');
 if(selection.city&&/^[a-z0-9-]{1,80}$/.test(selection.city))overview.searchParams.set('city',selection.city);
 url.searchParams.set('overviewReturn',overview.pathname+overview.search);
 return url.href;
}
