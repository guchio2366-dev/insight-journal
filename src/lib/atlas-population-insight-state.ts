import {populationInsightFor,type PopulationInsight} from '../data/atlas/population-insights.ts';
import {readPopulationState,writePopulationState} from './atlas-population-state.ts';

const originKeys=['popView','popEthnicity','popReligion','popCity','popReligionStory','popVoteState','popGeo','popInsight','view','lng','lat','z'] as const;
export function populationInsightMatches(url:URL,item:PopulationInsight){
 const p=url.searchParams,part=url.pathname.split('/').filter(Boolean).at(-1);
 if(part!==item.page)return false;
 if(item.page==='population'){
  const origin=p.get('popStoryLayer')==='origin';
  return p.get('popView')===(origin?item.compare?.view:'vote')&&
   (origin?p.get('popVoteState')===null:item.id==='lds-vote'?p.get('popVoteState')==='49':!p.get('popVoteState'));
 }
 if(item.page==='industry')return p.get('sector')==='manufacturing'&&p.get('subsector')==='auto';
 return p.get('env')==='water'&&(p.get('waterView')??'rivers')==='rivers'&&p.get('natureFeature')==='water:Colorado';
}
function defaultReturn(source:URL,base:string,item:PopulationInsight){
 const url=new URL(base+'population/',source);url.searchParams.set('popView',item.views[0]);
 if(item.id==='detroit-migration')url.searchParams.set('popCity','detroit');
 if(item.id==='vegas-water')url.searchParams.set('popCity','las-vegas');
 return url;
}
function canonicalReturn(source:URL,base:string){
 const url=new URL(base+'population/',source);
 for(const key of originKeys){const value=source.searchParams.get(key);if(value!==null)url.searchParams.set(key,value);}
 return writePopulationState(url,readPopulationState(url));
}
export function readPopulationInsight(url:URL,base:string){
 const item=populationInsightFor(url.searchParams.get('popStory'));
 if(!item||!populationInsightMatches(url,item))return null;
 let back=defaultReturn(url,base,item);
 const raw=url.searchParams.get('popStoryReturn');
 if(raw&&raw.length<=1600&&!/[\u0000-\u001f\u007f]/.test(raw)){
  const entries=[...new URLSearchParams(raw)];
  if(entries.every(([key])=>originKeys.includes(key as any)||key==='popMetro')&&new Set(entries.map(([key])=>key)).size===entries.length){
   const candidate=new URL(base+'population/',url);candidate.search=raw;back=canonicalReturn(candidate,base);
  }
 }
 return {item,back,origin:url.searchParams.get('popStoryLayer')==='origin'};
}
export function populationInsightUrl(source:URL,base:string,id:string){
 const item=populationInsightFor(id);if(!item)throw new Error('Unknown population insight');
 const url=new URL(base+item.page+'/',source);
 for(const [key,value] of Object.entries(item.params))url.searchParams.set(key,value);
 url.searchParams.set('popStory',item.id);url.searchParams.set('popStoryReturn',canonicalReturn(source,base).searchParams.toString());
 return url;
}
export function populationComparisonUrl(source:URL,base:string,origin:boolean){
 const context=readPopulationInsight(source,base);if(!context?.item.compare)return new URL(source);
 const url=new URL(source);
 for(const key of ['popView','popEthnicity','popReligion','popCity','popReligionStory','popVoteState','popGeo'])url.searchParams.delete(key);
 for(const [key,value] of Object.entries(origin?context.item.compare.params:context.item.params))url.searchParams.set(key,value);
 if(origin)url.searchParams.set('popStoryLayer','origin');else url.searchParams.delete('popStoryLayer');
 return url;
}
export function normalizePopulationInsight(url:URL,base:string){
 const next=new URL(url);
 if(!readPopulationInsight(next,base))for(const key of ['popStory','popStoryReturn','popStoryLayer'])next.searchParams.delete(key);
 return next;
}
