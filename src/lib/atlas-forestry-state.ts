import {forestRegion} from '../data/atlas/forestry.ts';
const returnKeys=['agriReading','agriProduct','stats','livestockStats','milkBasis','agriLayers','forestRegion','lng','lat','z','view'] as const;
export function forestComparison(url:URL){
 const id=url.searchParams.get('forestCompare');
 return url.pathname.endsWith('/nature/')&&(id==='precipitation'||id==='landform')?id:null;
}
export function forestReturn(url:URL,base:string){
 const back=new URL(base+'agriculture/',url),params=new URLSearchParams(url.searchParams.get('forestReturn')??'');
 for(const k of returnKeys){const value=params.get(k);if(value)back.searchParams.set(k,value);}
 back.searchParams.set('agriReading','forestry:timber');
 const region=forestRegion(params.get('forestRegion')??url.searchParams.get('forestRegion'));
 if(region)back.searchParams.set('forestRegion',region.id);else back.searchParams.delete('forestRegion');
 return back;
}
export function forestComparisonUrl(source:URL,base:string,target:'precipitation'|'landform'){
 const url=new URL(base+'nature/',source),origin=new URLSearchParams();
 for(const k of returnKeys){const value=source.searchParams.get(k);if(value)origin.set(k,value);}
 origin.set('agriReading','forestry:timber');
 for(const key of ['lng','lat','z','view']){const value=source.searchParams.get(key);if(value)url.searchParams.set(key,value);}
 url.searchParams.set('forestReturn',origin.toString());url.searchParams.set('forestCompare',target);
 url.searchParams.set('env',target==='precipitation'?'water':'landform');
 if(target==='precipitation')url.searchParams.set('waterView','precipitation');
 const region=forestRegion(source.searchParams.get('forestRegion'));if(region)url.searchParams.set('forestRegion',region.id);
 return url;
}
export function normalizeForestNavigation(next:URL,field:string){
 const url=new URL(next);
 if(field!=='natural'){url.searchParams.delete('forestCompare');url.searchParams.delete('forestReturn');}
 if(!forestRegion(url.searchParams.get('forestRegion')))url.searchParams.delete('forestRegion');
 return url;
}
