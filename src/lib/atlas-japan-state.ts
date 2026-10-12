import {japanAreas,type JapanAreaId} from '../data/atlas/japan-areas.ts';
import {japanIndustrySectors,japanSiteInSector,type JapanSector} from './atlas-japan-sectors.ts';
import {asiaFieldPaths,type AsiaField,type AsiaCamera,type AsiaState,writeAsiaAtlasState} from './atlas-asia-state.ts';

export type JapanState={field:AsiaField;topic:string;prefecture:string|null;city:string|null;site:string|null;feature:string|null;camera:AsiaCamera|null;returnTo:string|null;area?:JapanAreaId;sector?:JapanSector;showCrops?:boolean;showLivestock?:boolean};
export const japanDefaults:Record<AsiaField,string>={industry:'clusters',natural:'climate',agriculture:'all',population:'density'};
export const japanTopics:Record<AsiaField,readonly string[]>={industry:['clusters','auto','chips','steel','batteries','ships','chemicals','services','energy','logistics',...['00',...Array.from({length:24},(_,i)=>String(i+9).padStart(2,'0'))].map(id=>'jp-'+id)],natural:['stations','climate','precipitation','water','groundwater','basins','terrain','elevation'],agriculture:['all','wheat','rice','potato','cabbage','tomato','apple','mandarin','milk','beef','pork','forest'],population:['density']};

// Only a same-site East Asia field URL can become a return target. Never trust
// an arbitrary redirect, or infer entry intent from place=JPN (cities set it too).
export function safeJapanReturn(value:string|null,url:URL):string|null {
 if(!value||value.length>2400||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(value))return null;
 try{
  const target=new URL(value,url),prefix=url.pathname.split('/atlas/')[0];
  if(target.origin!==url.origin||!new RegExp('^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/atlas/asia/east-asia/(nature|agriculture|industry|population)/$').test(target.pathname)||target.searchParams.has('return'))return null;
  return target.pathname+target.search;
 }catch{return null;}
}
export function japanEntryURL(url:URL,state:AsiaState):URL {
 const source=writeAsiaAtlasState(url,state),target=new URL(url);
 target.pathname=url.pathname.split('/atlas/')[0]+`/atlas/japan/${asiaFieldPaths[state.field]}/`;
 target.search='';target.hash='';
 target.searchParams.set('return',source.pathname+source.search);
 return target;
}
export function readJapanState(url:URL,context:{prefectures:readonly string[];cities:readonly string[];climateCities?:readonly string[];urbanCities?:readonly string[];sites:readonly string[];siteIndustries?:Record<string,readonly string[]>;agricultureSites?:readonly string[];forestrySites?:readonly string[];naturalFeatures?:readonly string[]}):JapanState {
 const field=Object.entries(asiaFieldPaths).find(([,p])=>url.pathname.endsWith('/'+p+'/'))?.[0] as AsiaField|undefined;
 const current=field??'industry',q=url.searchParams;
 const area=japanAreas.find(a=>a.id===q.get('area'))?.id??'japan';
 const rawTopic=q.get('topic')??'';
 const sector=japanIndustrySectors.find(s=>s.id===q.get('sector'))?.id??(['energy'].includes(rawTopic)?'resources':['services','logistics'].includes(rawTopic)?'services':'manufacturing');
 const compatible=current!=='industry'||rawTopic==='clusters'||(rawTopic.startsWith('jp-')&&sector==='manufacturing')||japanSiteInSector([rawTopic],sector);
 const requestedTopic=current==='natural'?(rawTopic==='water'&&q.get('feature')?.startsWith('b-')?'basins':['groundwater'].includes(rawTopic)?'water':rawTopic==='stations'?'climate':rawTopic):rawTopic;
 const topic=japanTopics[current].includes(requestedTopic)&&compatible?requestedTopic:japanDefaults[current];
 const candidate=(key:string,values:readonly string[])=>values.includes(q.get(key)??'')?q.get(key):null;
 const n=(key:string,min:number,max:number)=>{const raw=q.get(key);const v=raw?.trim()?Number(raw):NaN;return Number.isFinite(v)&&v>=min&&v<=max?v:null;};
 const lng=n('lng',110,160),lat=n('lat',15,55),zoom=n('z',2,10);
 const cities=current==='natural'?context.climateCities??context.cities:context.urbanCities??context.cities;
 const naturePrefix:Record<string,RegExp>={climate:/^climate-region-/,water:/^(g-|river-)/,basins:/^(b-|river-)/,groundwater:/^g-/,elevation:/^elevation-/,precipitation:/^precipitation-/};
 const naturalFeatures=(context.naturalFeatures??[]).filter(id=>naturePrefix[topic]?.test(id));
 const sites=!context.siteIndustries?context.sites:context.sites.filter(id=>japanSiteInSector(context.siteIndustries![id]??[],sector)&&(topic==='clusters'||context.siteIndustries![id]?.includes(topic)));
 return {field:current,topic,area,sector,showCrops:q.get('crops')!=='off',showLivestock:q.get('livestock')!=='off',prefecture:current==='industry'&&topic.startsWith('jp-')?candidate('prefecture',context.prefectures):null,city:current==='natural'||current==='population'?candidate('city',cities):null,site:current==='agriculture'?candidate('site',topic==='forest'?context.forestrySites??[]:context.agricultureSites??[]):current==='industry'&&!topic.startsWith('jp-')?candidate('site',sites):null,feature:current==='natural'?candidate('feature',naturalFeatures):null,camera:lng!==null&&lat!==null&&zoom!==null?{lng,lat,zoom}:null,returnTo:safeJapanReturn(q.get('return'),url)};
}
export function writeJapanState(url:URL,state:JapanState):URL {
 const next=new URL(url);next.pathname=next.pathname.replace(/\/(nature|agriculture|industry|population)\/$/,'/'+asiaFieldPaths[state.field]+'/');next.search='';
 if(state.area&&state.area!=='japan')next.searchParams.set('area',state.area);
 if(state.field==='industry'&&state.sector)next.searchParams.set('sector',state.sector);
 if(state.topic!==japanDefaults[state.field])next.searchParams.set('topic',state.topic);
 if(state.prefecture)next.searchParams.set('prefecture',state.prefecture);
 if(state.city)next.searchParams.set('city',state.city);
 if(state.site)next.searchParams.set('site',state.site);
 if(state.feature)next.searchParams.set('feature',state.feature);
 if(state.showCrops===false)next.searchParams.set('crops','off');
 if(state.showLivestock===false)next.searchParams.set('livestock','off');
 if(state.camera){next.searchParams.set('lng',state.camera.lng.toFixed(5));next.searchParams.set('lat',state.camera.lat.toFixed(5));next.searchParams.set('z',state.camera.zoom.toFixed(3));}
 const back=safeJapanReturn(state.returnTo,next);if(back)next.searchParams.set('return',back);
 return next;
}
export function japanReturnURL(url:URL,state:JapanState):URL {
 return new URL(safeJapanReturn(state.returnTo,url)??url.pathname.split('/atlas/')[0]+`/atlas/asia/east-asia/${asiaFieldPaths[state.field]}/`,url);
}
