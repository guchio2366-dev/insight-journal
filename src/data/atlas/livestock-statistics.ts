import {livestockStatistics} from './livestock-statistics-generated.ts';
import type {LivestockKindId} from './livestock.ts';
export {livestockStatistics};

export const livestockStatLabels:Record<LivestockKindId,{quantity:string;world:string;exports:string;products:string;takeaway:string;scope:string}>={
  beef:{quantity:'牛肉（乳牛由来も含む）',world:'牛肉（子牛を含む・水牛を除く）',exports:'牛肉・牛肉製品',products:'生鮮・冷蔵・冷凍の牛肉、内臓や調製品。生体牛とは別の取引です。',takeaway:'国内生産と輸入が供給を支え、国内利用が主な行き先です。',scope:'輸出額には内臓・調製品を含み、生体牛は含みません。数量図は牛肉の枝肉重量です。'},
  dairy:{quantity:'牛の生乳',world:'牛の生乳（水牛・羊・山羊乳を除く）',exports:'乳製品・乳由来の派生品',products:'飲用乳、チーズ、粉乳、バター、ホエーなど。傷みやすい生乳を、用途や保存性の異なる製品へ加工します。',takeaway:'農場からの市場出荷に輸入と在庫を加えた乳換算の供給を、国内利用・輸出・在庫に分けます。',scope:'金額は乳製品と乳由来の派生品の輸出です。乳換算の数量や国内販売額とは異なります。'},
  hogs:{quantity:'豚肉',world:'豚肉（枝肉重量）',exports:'豚肉・豚肉製品',products:'生鮮・冷蔵・冷凍の豚肉、内臓や調製品。生体豚の取引は肉製品と区別します。',takeaway:'国内生産が供給の中心で、国内利用に加えて輸出も大きな行き先です。',scope:'輸出額には内臓・調製品を含み、生体豚は含みません。数量図は豚肉の枝肉重量です。'},
  broilers:{quantity:'ブロイラー肉',world:'鶏肉（ブロイラー以外も含む）',exports:'鶏肉・鶏肉製品',products:'丸鶏、部位別の肉、足・内臓、調製品。七面鳥・あひる等の肉製品とは分けます。',takeaway:'国内生産がほぼ全ての供給を担い、主な行き先は国内利用です。',scope:'金額は鶏肉・足・内臓・調製品。七面鳥等と生体鶏は除外。世界生産は鶏肉全体、米国数量はブロイラー肉です。'},
  layers:{quantity:'卵（ふ化用を含む）',world:'鶏卵（ふ化用を含む・重量）',exports:'鶏の食用殻付き卵・卵製品',products:'食用の殻付き卵、液卵、乾燥卵、卵黄・卵白製品。ふ化用の卵は数量図で別に示します。',takeaway:'国内利用とふ化用を分けると、食用だけでは見えない卵の行き先が分かります。',scope:'輸出額はふ化用と他鳥種の生鮮殻付き卵を除外。加工卵・卵白製品は統計コードから鳥種を特定できません。'}
};
export type LivestockSupplyId=keyof typeof livestockStatistics.supply;
export const supplySegments=(id:LivestockSupplyId)=>{
  const d=livestockStatistics.supply[id];
  const supply=[{label:id.startsWith('dairy')?'市場出荷':'国内生産',value:d.production,role:'production'},{label:'輸入',value:d.imports,role:'import'},{label:'期首在庫',value:d.beginningStocks,role:'stock'}];
  const uses=[{label:'国内利用',value:d.domestic,role:'domestic'},...('hatching'in d?[{label:'ふ化用',value:d.hatching,role:'hatching'}]:[]),{label:'輸出',value:d.exports,role:'export'},{label:'期末在庫',value:d.endingStocks,role:'stock'}];
  return {data:d,supply,uses};
};
