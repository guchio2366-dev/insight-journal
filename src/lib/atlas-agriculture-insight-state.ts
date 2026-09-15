
import {animalDetailIds,isProduct,readAgricultureReadingState,type ProductId} from './atlas-agriculture-detail-state.ts';
import {readAtlasState,writeAtlasState} from './atlas-state.ts';
import {insightFor,type AgricultureInsight} from '../data/atlas/agriculture-insights.ts';

const returnKeys=['agriReading','agriProduct','crop','region','relation','animal','animalRegion','stats','livestockStats','milkBasis','agriLayers','city','view','lng','lat','z'] as const;
function standardReturn(source:URL,base:string,product:ProductId){
 const u=new URL(base+'agriculture/',source);
 u.searchParams.set('agriReading','product:'+product);u.searchParams.set('agriProduct',product);
 if(animalDetailIds.includes(product as any))u.searchParams.set('livestockStats',product);
 else{u.searchParams.set('crop',product);if(product!=='specialty')u.searchParams.set('stats',product);}
 return u;
}
function canonicalReturn(source:URL,base:string,product:ProductId){
 const u=new URL(base+'agriculture/',source);
 for(const k of returnKeys){const v=source.searchParams.get(k);if(v!==null)u.searchParams.set(k,v);}
 u.searchParams.set('agriReading','product:'+product);u.searchParams.set('agriProduct',product);
 const s=readAtlasState(u,'agriculture');
 const reading=readAgricultureReadingState(u);
 const n=writeAtlasState(u,base,'agriculture',s.camera??undefined,s.crop,s.region,s.stats,s.view,s.agriLayers,s.animal,s.animalRegion,{city:s.city},s.relation,{stats:s.stats,livestockStats:s.livestockStats,milkBasis:s.milkBasis,reading});
 for(const k of [...n.searchParams.keys()])if(!returnKeys.includes(k as any))n.searchParams.delete(k);
 n.hash='';return n;
}
function validReturn(source:URL,base:string,product:ProductId):URL|null{
 const raw=source.searchParams.get('agriReturn');if(!raw||raw.length>1024||/[\u0000-\u001f\u007f]/.test(raw))return null;
 const p=new URLSearchParams(raw),seen=new Set<string>();
 for(const [k] of p){if(seen.has(k)||!returnKeys.includes(k as any))return null;seen.add(k);}
 if(p.get('agriProduct')!==product||p.get('agriReading')!=='product:'+product)return null;
 const u=new URL(base+'agriculture/',source);u.search=p.toString();
 return canonicalReturn(u,base,product);
}
export function targetMatches(url:URL,item:AgricultureInsight){
 const t=item.target,p=url.searchParams,part=url.pathname.split('/').filter(Boolean).at(-1);
 if(part!==t.page&&!(part==='review'&&p.get('field')===(t.page==='nature'?'natural':'industry')))return false;
 if(t.page==='industry')return p.get('sector')===t.sector&&p.get('subsector')===t.subsector&&p.get('industryRegion')===t.industryRegion;
 if((p.get('env')??'climate')!==t.env)return false;
 if(t.env==='water'){
  if((p.get('waterView')??'rivers')!==(t.waterView??'rivers'))return false;
  if(t.waterView==='basins')return p.get('basin')===t.basin;
  if(t.waterView==='precipitation')return !p.get('precipBand');
 }
 return (p.get('natureFeature')??null)===(t.features?.[0]??null);
}
export function readInsightContext(url:URL,base:string){
 const product=url.searchParams.get('agriProduct');if(!isProduct(product))return null;
 const found=insightFor(url.searchParams.get('agriInsight'));
 const insight=found?.products.includes(product)&&targetMatches(url,found)?found:null;
 const back=validReturn(url,base,product);
 return insight||back?{product,insight,back:back??standardReturn(url,base,product)}:null;
}
export function agricultureInsightUrl(source:URL,base:string,product:ProductId,id:string):URL{
 const item=insightFor(id);if(!item?.products.includes(product))throw new Error('Unknown agriculture insight');
 const origin=canonicalReturn(source,base,product),t=item.target,url=new URL(base+t.page+'/',source),p=url.searchParams;
 for(const key of ['env','waterView','basin','sector','subsector','industryRegion'] as const){const value=t[key];if(value&&value!=='rivers')p.set(key,value);}
 if(t.features?.length)p.set('natureFeature',t.features[0]);
 p.set('agriProduct',product);p.set('agriInsight',id);p.set('agriReturn',origin.searchParams.toString());
 return url;
}
/** Shared state writers own their fields; comparison context must survive their defaults. */
export function normalizeInsightNavigation(next:URL,source:URL,base:string,field:string):URL{
 const context=readInsightContext(source,base),n=new URL(next),p=n.searchParams;
 if(field!=='natural'&&field!=='industry'){
  p.delete('agriInsight');p.delete('agriReturn');
  if(field==='agriculture'){for(const k of ['waterView','precipBand','basin'])p.delete(k);}
  return n;
 }
 if(!context){p.delete('agriInsight');p.delete('agriReturn');return n;}
 p.set('agriProduct',context.product);p.set('agriReturn',context.back.searchParams.toString());
 for(const k of ['agriReading','crop','region','relation','animal','animalRegion','stats','livestockStats','milkBasis','agriLayers'])p.delete(k);
 if(context.insight&&targetMatches(n,context.insight))p.set('agriInsight',context.insight.id);else p.delete('agriInsight');
 return n;
}
