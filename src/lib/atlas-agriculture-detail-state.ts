export const cropDetailIds=['corn','soybean','wheat','cotton','rice'] as const;
export const animalDetailIds=['beef','dairy','hogs','broilers','layers'] as const;
export type AgricultureDetailState={stats:string;livestockStats:string;milkBasis:'fat'|'skim';reading?:AgricultureReadingState};
export function detailAnchor(hash:string):{group:'crops'|'livestock';id:string}|null {
  if(hash.startsWith('#crop-')&&cropDetailIds.includes(hash.slice(6) as any))return {group:'crops',id:hash.slice(6)};
  if(hash.startsWith('#livestock-')&&animalDetailIds.includes(hash.slice(11) as any))return {group:'livestock',id:hash.slice(11)};
  return null;
}
export function readAgricultureDetailState(url:URL):AgricultureDetailState {
  const crop=url.searchParams.get('stats'),animal=url.searchParams.get('livestockStats');
  const state:AgricultureDetailState={stats:cropDetailIds.includes(crop as any)?crop!:'corn',livestockStats:animalDetailIds.includes(animal as any)?animal!:'beef',milkBasis:url.searchParams.get('milkBasis')==='skim'?'skim':'fat'};
  const hash=detailAnchor(url.hash);
  if(hash)state[hash.group==='crops'?'stats':'livestockStats']=hash.id;
  return state;
}
export function writeAgricultureDetailState(url:URL,state:AgricultureDetailState) {
  const next=new URL(url);
  next.searchParams.set('stats',cropDetailIds.includes(state.stats as any)?state.stats:'corn');
  next.searchParams.set('livestockStats',animalDetailIds.includes(state.livestockStats as any)?state.livestockStats:'beef');
  next.searchParams.set('milkBasis',state.milkBasis==='skim'?'skim':'fat');
  const hash=detailAnchor(next.hash);
  if(hash){const id=state[hash.group==='crops'?'stats':'livestockStats'];next.hash=`${hash.group==='crops'?'crop':'livestock'}-${id}`;}
  return state.reading?writeAgricultureReadingState(next,state.reading):next;
}

export const productIds=[...cropDetailIds,'specialty',...animalDetailIds] as const;
export const relationIds=['corn-soy-hogs','plains-wheat-cattle','california-rice-water'] as const;
export type ProductId=typeof productIds[number];
export type ReadingView={kind:'forestry';id:'timber'}|{kind:'overview'}|{kind:'product';id:ProductId}|{kind:'relation';id:typeof relationIds[number]}|{kind:'map-context';id:'corn-soybean'};
export type AgricultureReadingState={view:ReadingView;resumeProductId:ProductId|null};
export const isProduct=(id:string|null):id is ProductId=>productIds.includes(id as ProductId);
export function parseReading(value:string|null):ReadingView|null {
  if(value==='forestry:timber')return {kind:'forestry',id:'timber'};
  if(value==='overview')return {kind:'overview'};
  if(value?.startsWith('product:')&&isProduct(value.slice(8)))return {kind:'product',id:value.slice(8) as ProductId};
  if(value?.startsWith('relation:')&&relationIds.includes(value.slice(9) as any))return {kind:'relation',id:value.slice(9) as any};
  if(value==='map-context:corn-soybean')return {kind:'map-context',id:'corn-soybean'};
  return null;
}
export function readingAnchor(hash:string):ReadingView|null {
  if(hash==='#forestry-timber')return {kind:'forestry',id:'timber'};
  const product=hash.startsWith('#crop-')?hash.slice(6):hash.startsWith('#livestock-')?hash.slice(11):null;
  if(isProduct(product))return {kind:'product',id:product};
  return hash.startsWith('#relation-')?parseReading('relation:'+hash.slice(10)):null;
}
import {regionalInsights} from '../data/atlas/regional-insights.ts';
import {livestockRegions} from '../data/atlas/livestock.ts';
export function readAgricultureReadingState(url:URL):AgricultureReadingState {
  const p=url.searchParams, explicitProduct=p.get('agriProduct');
  const legacyProduct=cropDetailIds.includes(p.get('stats') as any)?p.get('stats'):animalDetailIds.includes(p.get('livestockStats') as any)?p.get('livestockStats'):null;
  const resume=isProduct(explicitProduct)?explicitProduct:parseReading(p.get('agriReading'))?null:isProduct(legacyProduct)?legacyProduct:null;
  const normalize=(view:ReadingView):AgricultureReadingState=>({view,resumeProductId:view.kind==='product'?view.id:view.kind==='overview'?null:resume});
  const explicit=readingAnchor(url.hash)??parseReading(p.get('agriReading'));
  if(explicit)return normalize(explicit);
  const crop=p.get('crop'),region=regionalInsights.find(r=>r.id===p.get('region'));
  if(isProduct(crop)&&!animalDetailIds.includes(crop as any))return normalize({kind:'product',id:crop});
  if(crop==='corn-soybean')return normalize({kind:'map-context',id:crop});
  if(region&&isProduct(region.detailCrop))return normalize({kind:'product',id:region.detailCrop});
  const animal=livestockRegions.find(r=>r.id===p.get('animalRegion')&&r.kindId===p.get('animal'));
  if(animal&&isProduct(animal.kindId))return normalize({kind:'product',id:animal.kindId});
  const relation=parseReading('relation:'+p.get('relation'));
  if(relation)return normalize(relation);
  return normalize(isProduct(legacyProduct)?{kind:'product',id:legacyProduct}:{kind:'overview'});
}
export function writeAgricultureReadingState(url:URL,state:AgricultureReadingState):URL {
  const next=new URL(url),v=state.view;
  next.searchParams.set('agriReading',v.kind==='overview'?'overview':`${v.kind}:${v.id}`);
  const product=v.kind==='product'?v.id:v.kind==='overview'?null:state.resumeProductId;
  if(product)next.searchParams.set('agriProduct',product);else next.searchParams.delete('agriProduct');
  if(readingAnchor(next.hash))next.hash='';
  return next;
}
