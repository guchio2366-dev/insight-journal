import canola from '../data/atlas/canada/canola.json';
import wheat from '../data/atlas/canada/wheat.json';
import beef from '../data/atlas/canada/beef.json';
import climate from '../data/atlas/canada/climate.json';
import {beefMaps} from '../data/atlas/canada/beef-reading';
import {readCanadaAgricultureState,writeCanadaAgricultureState,type CanadaAgricultureState} from './atlas-canada-agriculture';
import {readCanadaBeefState,writeCanadaBeefState,type CanadaBeefState} from './atlas-canada-beef';

export const canadaCropIds=['canola','wheat','beef'] as const;
export type CanadaCropId=typeof canadaCropIds[number];
export type CanadaCropSourceState=CanadaAgricultureState|CanadaBeefState;
export interface CanadaCropComparisonMap {
 id:string;name:string;title:string;image:string;source:string;dot:string;total:string;description:string;year:2021;width:1133;height:814;
}
export interface CanadaCropComparison {
 crop:CanadaCropId;name:string;state:CanadaCropSourceState;returnUrl:URL;returnLabel:string;sourceLabel:string;maps:CanadaCropComparisonMap[];selectedMap:CanadaCropComparisonMap;
}

const root='/atlas/north-america/canada/';
const paths:Record<CanadaCropId,string>={canola:root+'agriculture/',wheat:root+'agriculture/wheat/',beef:root+'agriculture/beef/'};
const names:Record<CanadaCropId,string>={canola:'カノーラ',wheat:'小麦',beef:'肉牛・放牧と飼料'};
const sourceKeys=['year','province','compare','metric','map','zoom'];
function prefixFor(pathname:string,suffix:string){return pathname.endsWith(suffix)?pathname.slice(0,-suffix.length):null;}
function sourceState(url:URL,crop:CanadaCropId):CanadaCropSourceState {
 const data=crop==='beef'?beef:crop==='wheat'?wheat:canola,ids=data.provinces.map(p=>p.id);
 return crop==='beef'?readCanadaBeefState(url,data.years,ids):readCanadaAgricultureState(url,data.years,ids);
}
function cleanSource(url:URL,crop:CanadaCropId){
 const clean=new URL(url.pathname,url),state=sourceState(url,crop);
 return crop==='beef'?writeCanadaBeefState(clean,state as CanadaBeefState):writeCanadaAgricultureState(clean,state as CanadaAgricultureState);
}

/** Carry only the published crop choices. Source comparison and nature comparison use separate URLs. */
export function buildCanadaCropNatureUrl(source:URL,crop:CanadaCropId,city='regina',view:'climate'|'landform'|'water'='climate'):URL {
 if(!canadaCropIds.includes(crop))throw new TypeError('対象外の作物です');
 const prefix=prefixFor(source.pathname,paths[crop]);
 if(prefix===null)throw new TypeError('作物ページのURLではありません');
 const next=new URL(prefix+root+'nature/',source),saved=cleanSource(source,crop);
 next.searchParams.set('city',climate.stations.some(s=>s.id===city)?city:'regina');
 next.searchParams.set('view',['climate','landform','water'].includes(view)?view:'climate');
 next.searchParams.set('crop',crop);
 next.searchParams.set('cropReturn',saved.pathname+saved.search);
 return next;
}

/** Reject external URLs, mismatched crop paths, unknown keys and duplicate source choices. */
export function readCanadaCropComparison(url:URL):CanadaCropComparison|null {
 const rawCrop=url.searchParams.get('crop'),raw=url.searchParams.get('cropReturn'),prefix=prefixFor(url.pathname,root+'nature/');
 if(!canadaCropIds.includes(rawCrop as CanadaCropId)||!raw||prefix===null||!raw.startsWith('/')||raw.startsWith('//')||/[\\#\u0000-\u001f\u007f]/.test(raw))return null;
 const crop=rawCrop as CanadaCropId;
 let source:URL;try{source=new URL(raw,url);}catch{return null;}
 if(source.origin!==url.origin||source.pathname!==prefix+paths[crop]||source.username||source.password)return null;
 for(const key of source.searchParams.keys())if(!sourceKeys.includes(key)||source.searchParams.getAll(key).length!==1||crop!=='beef'&&key==='map')return null;
 const returnUrl=cleanSource(source,crop),state=sourceState(returnUrl,crop),data=crop==='beef'?beef:crop==='wheat'?wheat:canola;
 const province=(id:string)=>data.provinces.find(p=>p.id===id)!.name;
 const selected=[state.province,state.compare].filter((id):id is string=>!!id).map(province).join('・'),metric=data.metrics.find(m=>m.id===state.metric)!.name;
 const sourceLabel=`${names[crop]}：${selected}の${state.year}年${crop==='beef'?'7月1日 ':''}${metric}`;
 const common={year:2021 as const,width:1133 as const,height:814 as const};
 const maps:CanadaCropComparisonMap[]=crop==='beef'?beefMaps.map(m=>({...m,...common,image:`${prefix}/assets/atlas/canada-beef-v1/${m.id}-map-2021.jpg`})):[{
  ...common,id:crop,name:names[crop],title:crop==='wheat'?'Total wheat area':'Canola area',image:`${prefix}/assets/atlas/${crop==='wheat'?'canada-wheat-v1':'canada-agriculture-v1'}/${crop}-map-2021.jpg`,
  source:`https://www150.statcan.gc.ca/n1/pub/95-634-x/2021001/article/00001/catm-ctra-${crop==='wheat'?'025':'027'}-eng.htm`,
  dot:crop==='wheat'?'1点＝15,000 acres（約6,070 ha）':'1点＝10,000 acres（約4,047 ha）',total:crop==='wheat'?'全国9,413,876 ha':'全国9,012,449 ha',
  description:crop==='wheat'?'全小麦の面積量です。種類別の分布や収量を示しません。':'カノーラの面積量です。生産量や収量を示しません。',
 }];
 const selectedMap=maps.find(m=>m.id===(crop==='beef'?(state as CanadaBeefState).map:crop))!;
 return {crop,name:names[crop],state,returnUrl,sourceLabel,returnLabel:`${sourceLabel}${crop==='beef'?`・${selectedMap.name}図`:''}の比較へ戻る`,maps,selectedMap};
}

/** Keep the source question short and specific while readers change nature views. */
export function canadaCropNatureQuestion(crop:CanadaCropId,view:'climate'|'landform'|'water',city='regina'):string {
 const place=city==='regina'?'Regina':city==='winnipeg'?'Winnipeg':'選んだ観測点';
 if(view==='landform')return crop==='beef'?'プレーリーの平原と西部の山地を、母牛・放牧地・乾草などの3図と照合します。放牧の時期・頭数や草の回復を人はどう管理するでしょうか。':'プレーリー南部の栽培面積を、内陸平原と山地の位置に照合します。播種・収穫・貯蔵をつなぐ機械と管理には何が必要でしょうか。';
 if(view==='water')return crop==='beef'?'湖・川と放牧地の位置を照合し、草が育つ水と家畜の飲水を考えます。水域の位置から使える水量は決められません。冬まで飼料を確保し運ぶ管理はどうつながるでしょうか。':'湖・川と栽培面積の位置を照合します。畑では根が使える土壌水分と排水が必要です。水域の位置から畑の水量は決められません。生育期と水の条件を管理でどうつなぐでしょうか。';
 if(crop==='beef')return `${place}の季節を、プレーリーの草が育つ時期と冬に分けて読みます。放牧と貯蔵飼料を、繁殖・育成・肥育の異なる段階へどうつなぐでしょうか。1観測点の平年値はプレーリー全体の平均でも牧場の土壌水分でもありません。`;
 return crop==='wheat'?`${place}の季節を、プレーリーの小麦面積と照合します。春播きの生育期間と秋播きの越冬を、播種・土壌水分・刈株の管理でどう支えるでしょうか。1観測点の平年値はプレーリー全体の平均でも畑の収量でもありません。`:`${place}の夏の熱と降水を、プレーリー南部のカノーラ面積と照合します。生育・成熟する季節と根が使える水を、品種・輪作・排水の管理でどう支えるでしょうか。1観測点の平年値はプレーリー全体の平均でも畑の収量でもありません。`;
}
