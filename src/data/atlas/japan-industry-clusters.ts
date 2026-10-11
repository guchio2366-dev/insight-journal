import {eastClusters,eastIndustries} from './east-asia-industry-clusters.ts';
export const japanIndustries=[...eastIndustries.map(i=>({...i,label:i.id==='chips'?'半導体製造':i.label})),
 {id:'services',label:'金融サービス',color:'#3e6d9a',lead:'東京・大阪に証券市場の拠点があります。',reason:'企業の資金調達と投資を結ぶ金融サービスは、人材や情報が集まる都市で成り立ちます。製造品出荷額には含まれません。',source:'https://www.jpx.co.jp/corporate/about-jpx/access/index.html'},
 {id:'energy',label:'エネルギー供給',color:'#9c7048',lead:'東京湾・伊勢湾沿岸には火力発電の拠点があります。',reason:'燃料の受入れ、電力需要と送電網が立地に関わります。記号は発電量・稼働率や排出量を示しません。',source:'https://www.jera.co.jp/corporate/business/thermal-power/list/'},
];
export type JapanIndustryId=typeof japanIndustries[number]['id'];
export type JapanIndustryCluster={id:string;name:string;country:'JPN';point:[number,number];industries:JapanIndustryId[];source:string;note?:string};
/** Public factual site summaries; regional editorial locators, not facility footprints. */
export const japanIndustryClusters:JapanIndustryCluster[]=[
 ...eastClusters.filter(c=>c.country==='JPN').map(c=>({...c,country:'JPN' as const})),
 {id:'tahara',name:'田原',country:'JPN',point:[137.27,34.67],industries:['auto'],source:'https://global.toyota/en/company/profile/facilities/manufacturing-worldwide/japan.html',note:'田原工場の自動車製造を市の概略位置で示す。2026年8月4日付資料。'},
 {id:'yokkaichi-chips',name:'四日市・メモリ製造',country:'JPN',point:[136.59,35.02],industries:['chips'],source:'https://www.kioxia.com/ja-jp/about/yokkaichi.html',note:'フラッシュメモリ製造。広い電子部品業種全体の数量とは別。'},
 {id:'kimitsu',name:'君津・東京湾',country:'JPN',point:[139.9,35.34],industries:['steel'],source:'https://www.nipponsteel.com/works/east-nippon/',note:'東日本製鉄所君津地区の事例。'},
 {id:'wakayama-batteries',name:'紀の川・和歌山',country:'JPN',point:[135.37,34.27],industries:['batteries'],source:'https://www.panasonic.com/global/energy/company/global-network.html',note:'車載用円筒形リチウムイオン電池。企業本社所在地とは別。'},
 {id:'tokyo-finance',name:'東京・兜町',country:'JPN',point:[139.77,35.68],industries:['services'],source:'https://www.jpx.co.jp/corporate/about-jpx/access/index.html',note:'東京証券取引所の所在。サービス業全体の網羅図ではない。'},
 {id:'osaka-finance',name:'大阪・北浜',country:'JPN',point:[135.51,34.69],industries:['services'],source:'https://www.jpx.co.jp/corporate/about-jpx/access/01.html',note:'大阪取引所の所在。取引額は地図に符号化しない。'},
 {id:'yokohama-energy',name:'横浜・東京湾',country:'JPN',point:[139.67,35.45],industries:['energy'],source:'https://www.jera.co.jp/corporate/business/thermal-power/list/',note:'横浜の火力発電を市の概略位置で示す。全国の全電源図ではない。'},
 {id:'chita-energy',name:'知多・伊勢湾',country:'JPN',point:[136.86,35.0],industries:['energy'],source:'https://www.jera.co.jp/corporate/business/thermal-power/list/',note:'知多の火力発電を市の概略位置で示す。電源の実際の容量・稼働は未収録。'},
];
export const japanIndustryDefinition={
 retrievedAt:'2026-10-11',license:'公表された立地・業種の事実を独自に要約。原文・写真・図・ロゴを再配布しない。',
 coordinateMethod:'出典の都市・地域をWGS84の概略位置で示す編集座標。測量した工場位置、敷地境界、産業集積の面積ではない。',
 semiconductor:'半導体製造の代表点と、県別の「電子部品・デバイス・電子回路製造業」の出荷額等は定義が異なる。後者には半導体以外も含み、半導体の県別数量に読み替えない。',
};
