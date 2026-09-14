export const cropDetailIds=['corn','soybean','wheat','cotton','rice'] as const;
export const animalDetailIds=['beef','dairy','hogs','broilers','layers'] as const;
export type AgricultureDetailState={stats:string;livestockStats:string;milkBasis:'fat'|'skim'};
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
  return next;
}
