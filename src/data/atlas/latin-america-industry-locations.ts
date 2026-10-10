import {latinEconomyTopics} from './latin-america-economy.ts';
const kinds={
 'andean-copper':{kind:'metals',label:'銅：チリ北部'},
 'lithium-salars':{kind:'metals',label:'リチウム：アタカマ'},
 'brazil-iron':{kind:'metals',label:'鉄鉱石：カラジャス'},
 'brazil-manufacturing':{kind:'manufacturing',label:'工業：ブラジル南東部'},
 hydropower:{kind:'energy',label:'水力：イタイプ'},
 'atlantic-oil':{kind:'energy',label:'石油・ガス：大西洋沖'},
 'panama-logistics':{kind:'transport',label:'運河物流：パナマ'},
 'caribbean-tourism':{kind:'tourism',label:'観光：カリブ海'},
} as const;
export const latinIndustryLocations=latinEconomyTopics.filter(topic=>topic.field==='industry').map(topic=>({...topic,...kinds[topic.id as keyof typeof kinds]}));
export const latinIndustryLocationById=(id:string|undefined)=>latinIndustryLocations.find(row=>row.id===id);
export const latinIndustryLocationGroups=[{id:'metals',label:'銅・リチウム・鉄鉱石',color:'#855635'},{id:'energy',label:'石油・ガス・水力',color:'#286b91'},{id:'manufacturing',label:'工業集積',color:'#296b58'},{id:'transport',label:'運河・物流',color:'#70538c'},{id:'tourism',label:'観光',color:'#8b6727'}] as const;
export const latinIndustryLocationOverview={
 title:'鉱山帯、南東部の工業、海岸と地峡の産業',
 distribution:'アンデスには銅と塩湖のリチウム、ブラジル北部には鉄鉱石の産地があります。ブラジル南東部には工業が集まり、大西洋沖の石油・ガス、パラナ川の水力、パナマの運河物流、カリブ海の観光は異なる場所で成り立ちます。',
 reason:'鉱床・塩湖や河川という資源の位置に、加工設備、電力、港・鉄道、働く人と市場が重なります。資源の採取地と、加工・輸送・サービスの場所を分けて読むと、国別の輸出構成だけでは分からない立地が見えます。',
 scope:'点は既存資料に基づく8件の代表位置で、産業地域の境界・施設台帳・量の比例記号ではありません。数量は本文の年・単位・全国/地域/施設の範囲を確認します。輸出比率から地点量を推定していません。',
};
