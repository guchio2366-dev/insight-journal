import {japanAgricultureProducts,type JapanAgricultureProductId} from '../data/atlas/japan-agriculture-v2.ts';
export type JapanFarmVisibility={showCrops?:boolean;showLivestock?:boolean};
/** A mixed locality can retain its livestock when its crops are hidden. */
export function visibleJapanFarmProducts(ids:readonly JapanAgricultureProductId[],visibility:JapanFarmVisibility):JapanAgricultureProductId[]{
 return ids.filter(id=>japanAgricultureProducts.find(p=>p.id===id)?.category==='livestock'?visibility.showLivestock!==false:visibility.showCrops!==false);
}
