import {eastClusters,eastIndustries} from './east-asia-industry-clusters.ts';
export const japanIndustries=[...eastIndustries.map(i=>({...i,label:i.id==='chips'?'半導体製造':i.id==='chemicals'?'化学工業':i.label})),
 {id:'services',label:'金融サービス',color:'#3e6d9a',lead:'東京・大阪に証券市場の拠点があります。',reason:'企業の資金調達と投資を結ぶ金融サービスは、人材や情報が集まる都市で成り立ちます。製造品出荷額には含まれません。',source:'https://www.jpx.co.jp/corporate/about-jpx/access/index.html'},
 {id:'energy',label:'エネルギー供給',color:'#9c7048',lead:'火力・水力・地熱・風力・太陽光・原子力の立地例を示します。',reason:'燃料や自然条件、電力需要と送電網が立地に関わります。記号は現在の運転状況、発電量・稼働率や排出量を示しません。',source:'https://www.jpower.co.jp/bs/renewable_energy/'},
 {id:'logistics',label:'航空物流',color:'#697196',lead:'成田と中部国際空港に航空貨物の取扱拠点があります。',reason:'国際航空路と倉庫、通関、製造業への接続が航空物流を支えます。貨物量や全物流施設の分布を示す点ではありません。',source:'https://www.narita-airport.jp/en/company/business/cargo/'},
];
export type JapanIndustryId=typeof japanIndustries[number]['id'];
export type JapanIndustryCluster={id:string;name:string;country:'JPN';point:[number,number];industries:JapanIndustryId[];source:string;label?:string;note?:string};
/** Public factual site summaries; regional editorial locators, not facility footprints. */
export const japanIndustryClusters:JapanIndustryCluster[]=[
 ...eastClusters.filter(c=>c.country==='JPN').map(c=>({...c,country:'JPN' as const})),
 {id:'tahara',name:'田原',country:'JPN',point:[137.27,34.67],industries:['auto'],source:'https://global.toyota/en/company/profile/facilities/manufacturing-worldwide/japan.html',note:'田原工場の自動車製造を市の概略位置で示す。2026年8月4日付資料。'},
 {id:'yokkaichi-chips',name:'四日市・メモリ製造',country:'JPN',point:[136.59,35.02],industries:['chips'],source:'https://www.kioxia.com/ja-jp/about/yokkaichi.html',note:'フラッシュメモリ製造。広い電子部品業種全体の数量とは別。'},
 {id:'kimitsu',name:'君津・東京湾',country:'JPN',point:[139.9,35.34],industries:['steel'],source:'https://www.nipponsteel.com/works/east-nippon/',note:'東日本製鉄所君津地区の事例。'},
 {id:'wakayama-batteries',name:'紀の川・和歌山',country:'JPN',point:[135.37,34.27],industries:['batteries'],source:'https://www.panasonic.com/global/energy/company/global-network.html',note:'車載用円筒形リチウムイオン電池。企業本社所在地とは別。'},
 {id:'tokyo-finance',name:'東京・兜町',country:'JPN',point:[139.77,35.68],industries:['services'],source:'https://www.jpx.co.jp/corporate/about-jpx/access/index.html',note:'東京証券取引所の所在。サービス業全体の網羅図ではない。'},
 {id:'osaka-finance',name:'大阪・北浜',country:'JPN',point:[135.51,34.69],industries:['services'],source:'https://www.jpx.co.jp/corporate/about-jpx/access/01.html',note:'大阪取引所の所在。取引額は地図に符号化しない。'},
 {id:'yokohama-energy',name:'横浜・東京湾',country:'JPN',point:[139.63,35.45],industries:['energy'],label:'火力発電',source:'https://www.jera.co.jp/corporate/business/thermal-power/list/',note:'横浜の火力発電を市の概略位置で示す。全国の全電源図ではない。'},
 {id:'chita-energy',name:'知多・伊勢湾',country:'JPN',point:[136.86,35.0],industries:['energy'],label:'火力発電',source:'https://www.jera.co.jp/corporate/business/thermal-power/list/',note:'知多の火力発電を市の概略位置で示す。電源の実際の容量・稼働は未収録。'},
 {id:'niihama-chemicals',name:'新居浜',country:'JPN',point:[133.28,33.96],industries:['chemicals'],source:'https://www.sumitomo-chem.co.jp/company/group/facilities/',note:'住友化学の愛媛工場の所在を市の概略位置で示す。化学製品の種類や全国の全工場は未収録。'},
 {id:'ichihara-chemicals',name:'市原・東京湾',country:'JPN',point:[140.04,35.50],industries:['chemicals'],source:'https://www.sumitomo-chem.co.jp/company/group/facilities/',note:'住友化学の千葉工場の所在を市の概略位置で示す。敷地や生産数量を表さない。'},
 {id:'narita-logistics',name:'成田空港周辺',country:'JPN',point:[140.39,35.77],industries:['logistics'],source:'https://www.narita-airport.jp/en/company/business/cargo/',note:'空港会社の貨物地区・周辺フォワーダー施設の説明による航空貨物の事例。倉庫面積や貨物量は点に符号化しない。'},
 {id:'centrair-logistics',name:'中部国際空港・常滑',country:'JPN',point:[136.81,34.86],industries:['logistics'],source:'https://www.centrair.jp/corporate/business/air-cargo/',note:'空港会社が紹介する航空貨物取扱施設の事例。中部の製造業との接続を読む。'},
 {id:'sakuma-hydro',name:'佐久間・天竜川',country:'JPN',point:[137.82,35.10],industries:['energy'],label:'水力発電',source:'https://www.jpower.co.jp/bs/renewable_energy/hydro/ichiran.html',note:'佐久間発電所の立地例。1956年運転開始の公表一覧を参照。点はダムや集水域の境界ではない。'},
 {id:'onikobe-geothermal',name:'鬼首・大崎',country:'JPN',point:[140.73,38.79],industries:['energy'],label:'地熱発電',source:'https://www.jpower.co.jp/bs/renewable_energy/geothermal/',note:'鬼首地熱発電所の事例。公表説明では2023年4月リニューアル後の営業運転開始。地熱資源の範囲や現在の出力は未収録。'},
 {id:'setana-wind',name:'瀬棚・北海道',country:'JPN',point:[139.86,42.45],industries:['energy'],label:'風力発電',source:'https://www.jpower.co.jp/bs/renewable_energy/wind/setana.html',note:'瀬棚臨海風力発電所の立地例。2005年12月営業運転開始の公表説明を参照。風況や現在の発電量は未収録。'},
 {id:'himeji-solar',name:'姫路・大塩',country:'JPN',point:[134.78,34.77],industries:['energy'],label:'太陽光発電',source:'https://www.jpower.co.jp/bs/renewable_energy/solar/',note:'J-POWER姫路大塩太陽光発電所の事例。公表一覧では2024年11月運転開始。敷地境界や現在の発電量は未収録。'},
 {id:'mihama-nuclear',name:'美浜・若狭湾',country:'JPN',point:[135.96,35.72],industries:['energy'],label:'原子力発電',source:'https://www.kepco.co.jp/corporate/profile/community/mihama/about.html',note:'美浜発電所の立地例。1・2号機は2015年運転終了、3号機は1976年運転開始という公表概要を参照。現在の運転状態や発電量は表さない。'},
];
export const japanIndustryDefinition={
 retrievedAt:'2026-10-11',license:'公表された立地・業種の事実を独自に要約。原文・写真・図・ロゴを再配布しない。',
 coordinateMethod:'出典の都市・地域をWGS84の概略位置で示す編集座標。測量した工場位置、敷地境界、産業集積の面積ではない。',
 semiconductor:'半導体製造の代表点と、県別の「電子部品・デバイス・電子回路製造業」の出荷額等は定義が異なる。後者には半導体以外も含み、半導体の県別数量に読み替えない。',
};
