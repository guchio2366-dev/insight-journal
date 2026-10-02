import {readCanadaCropComparison,writeCanadaCropComparisonCensusState,type CanadaCropComparison,type CanadaCropId} from '../lib/atlas-canada-crop-comparison';
import {initCanadaCensusMap,type CanadaCensusController} from './atlas-canada-census-map';
import type {CanadaCensusMapState} from '../lib/atlas-canada-census-map';
import type {CanadaNatureState} from '../lib/atlas-canada-nature';
import climate from '../data/atlas/canada/climate.json';

const cityNames:Record<string,string>={regina:'Regina',winnipeg:'Winnipeg',ottawa:'Ottawa',vancouver:'Vancouver',iqaluit:'Iqaluit'};
const prairiePlaces:Record<string,string>={regina:'Regina（サスカチュワン州）',winnipeg:'Winnipeg（マニトバ州）'};
interface CropMap {controller:CanadaCensusController;host:HTMLElement;native:HTMLElement;slot:HTMLElement;state:CanadaNatureState;abort:AbortController;rendering:boolean;}
const maps=new WeakMap<HTMLElement,CropMap>();

function question(crop:CanadaCropId,label:string,state:CanadaNatureState){
 const city=cityNames[state.city]??'選んだ観測点';
 if(state.view==='elevation')return '地域別申告値と同じ標高を結ぶ等高線を左右で照合します。山地の高さと平原の位置は生育・機械作業・交通の条件を考える手掛かりで、作付けや飼養の原因を高さだけで決めません。';
 if(state.view==='landform')return crop==='beef'?'プレーリーの平原と西部の山地を、母牛・放牧地・飼料作物の地域別申告値と別図で照合します。草の生育する場所と季節を、放牧の頭数・期間や冬の貯蔵飼料の管理へどうつなぐでしょうか。':'プレーリー南部の地域別申告面積を、内陸平原と山地の位置に照合します。生育条件を、播種・収穫・貯蔵をつなぐ機械と人の管理へどう結び付けるでしょうか。';
 if(state.view==='water'){
  const water=state.water?`${state.water}${state.only?'だけ':'を選んだ全水系'}`:'湖・川の全体';
  return `${water}と${label}の地域別申告値を別図で照合します。`+(crop==='beef'?'水域の位置と草地・家畜が使える水量を区別し、草が育つ季節を放牧・冬飼料の管理へどうつなぐでしょうか。':'水域の位置と畑の土壌水分を区別し、生育期に根が使える水と排水を人はどう管理するでしょうか。');
 }
 if(state.city!=='regina'&&state.city!=='winnipeg')return `現在の地点は${city}。`+(crop==='beef'?'元の問いはReginaの草が育つ季節と冬を、放牧・貯蔵飼料の管理で繁殖・育成・肥育へどうつなぐかです。':crop==='wheat'?'元の問いはReginaの季節と小麦面積を照合し、春播きの生育期間と秋播きの越冬を人の管理でどう支えるかです。':'元の問いはReginaの夏の熱・水とカノーラ面積を照合し、生育・成熟を品種・輪作・排水の管理でどう支えるかです。');
 return `${prairiePlaces[state.city]}の季節とプレーリーの${label}の地域別申告値を照合します。`+(crop==='beef'?'草が育つ季節と冬を、放牧・貯蔵飼料の管理で繁殖・育成・肥育へどうつなぐでしょうか。':crop==='wheat'?'春播きの生育期間と秋播きの越冬を、播種・土壌水分・刈株の管理でどう支えるでしょうか。':'夏の熱と根が使える水を、品種・輪作・排水の管理でどう支えるでしょうか。');
}

function originText(target:HTMLElement,comparison:CanadaCropComparison){
 const doc=target.ownerDocument,original=comparison.selectedMap,product=comparison.product;
 target.replaceChildren(doc.createTextNode(`元の年次表：${comparison.sourceLabel}。地図は2021年農業センサスの${product.label}。${product.definition} `));
 const table=doc.createElement('a');table.href=product.sourceTableUrl;table.textContent='GISの2021年原表';target.append(table,doc.createTextNode(' ／ '));
 const paper=doc.createElement('a');paper.href=original.source;paper.textContent='資料用の旧原図・凡例';paper.dataset.canadaCropOriginalSource='';target.append(paper);
 if(comparison.productId==='hay')target.append(doc.createTextNode('。このGIS指標はアルファルファ＋その他の2成分で、旧原図Total hay（全国5,394,265 ha）とは定義が異なります。'));
}

/** The same official GIS map moves beside the selected nature view; no paper figure is the main map. */
export function renderCanadaCropNatureComparison(root:HTMLElement,state:CanadaNatureState):boolean {
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector);
 const back=$<HTMLAnchorElement>('[data-canada-crop-return]'),figure=$('[data-canada-crop-source]'),context=$('[data-canada-crop-context]'),mini=$('[data-canada-crop-mini]');
 const title=$('[data-canada-crop-map-title]'),key=$('[data-canada-crop-map-key]'),heading=$('[data-canada-crop-context-title]'),text=$('[data-canada-crop-context-text]'),scope=$('[data-canada-crop-scope]'),origin=$('[data-canada-crop-origin]');
 const host=$('[data-canada-crop-gis]'),slot=$('[data-canada-crop-native-slot]'),native=host?.querySelector<HTMLElement>('[data-canada-census]');
 const comparison=readCanadaCropComparison(new URL(root.ownerDocument.defaultView!.location.href));
 if(!back||!figure||!context||!mini||!title||!key||!heading||!text||!scope)return false;
 if(!comparison||!host||!slot||!native){
  const old=maps.get(root);if(old){
   old.abort.abort();old.controller.destroy();
   const fallback=old.native.querySelector<SVGElement>('[data-canada-census-fallback]'),live=old.native.querySelector<HTMLElement>('[data-canada-census-live]');
   if(fallback){fallback.style.visibility='visible';fallback.removeAttribute('aria-hidden');fallback.setAttribute('tabindex','0');}
   if(live){live.hidden=true;live.style.visibility='hidden';}
   old.slot.append(old.host);old.native.hidden=true;maps.delete(root);
  }
  back.hidden=figure.hidden=context.hidden=mini.hidden=true;back.removeAttribute('href');back.textContent='';
  if(host&&slot){slot.append(host);if(native)native.hidden=true;}mini.replaceChildren();
  for(const el of [title,key,heading,text,scope])el.replaceChildren();origin?.replaceChildren();
  $<HTMLImageElement>('[data-canada-crop-image]')?.removeAttribute('src');$<HTMLAnchorElement>('[data-canada-crop-image-link]')?.removeAttribute('href');
  return false;
 }
 back.hidden=context.hidden=false;figure.hidden=state.view!=='climate';mini.hidden=state.view==='climate';
 if(state.view==='climate'){slot.append(host);mini.replaceChildren();}else{mini.append(host);}
 native.hidden=false;
 let map=maps.get(root);
 if(!map){
  const abort=new AbortController();
  map={controller:initCanadaCensusMap(native),host,native,slot,state,abort,rendering:false};maps.set(root,map);
  const update=(patch:Partial<CanadaCensusMapState>)=>{
   const current=maps.get(root);if(!current||current.rendering)return;
   const window=root.ownerDocument.defaultView!,before=new URL(window.location.href),next=writeCanadaCropComparisonCensusState(before,patch);
   if(next.href!==before.href)window.history.pushState(null,'',next.href);
   renderCanadaCropNatureComparison(root,current.state);
  };
  host.addEventListener('canada-census-select',event=>update({selected:(event as CustomEvent<{id:string|null}>).detail.id}),{signal:abort.signal});
  host.addEventListener('canada-census-only',event=>update({only:(event as CustomEvent<{only:boolean}>).detail.only}),{signal:abort.signal});
  host.addEventListener('canada-census-camera',event=>update({bounds:(event as CustomEvent<{bounds:[number,number,number,number]|null}>).detail.bounds}),{signal:abort.signal});
  host.addEventListener('canada-census-reset',()=>update({selected:null,only:false,bounds:null}),{signal:abort.signal});
 }
 map.state=state;map.rendering=true;
 try{map.controller.render({product:comparison.productId,...comparison.censusState,observation:state.view==='climate'?climate.stations.find(station=>station.id===state.city):undefined});}finally{map.rendering=false;}
 const product=comparison.product;
 back.href=comparison.returnUrl.href;back.textContent=comparison.returnLabel;
 title.textContent=`${product.label}：2021年の地域別申告値（${product.unit}）`;
 key.textContent=`全国公表値 ${product.national.value?.toLocaleString('ja-JP')??'非公表'} ${product.unit}。CCS境界は実際の畑・放牧地・牛の所在地ではありません。`;
 heading.textContent=`${product.label}と${state.view==='climate'?`${cityNames[state.city]??'観測点'}の季節`:state.view==='landform'?'平原・山地':state.view==='elevation'?'標高の等高線':'湖・川'}を比べる`;
 const mechanism=$('[data-canada-crop-mechanism]');
 if(mechanism)mechanism.textContent=question(comparison.crop,product.label,state);
 text.textContent=state.view==='climate'?(state.city==='regina'||state.city==='winnipeg'?`${cityNames[state.city]}の気温・降水の季節配分を、${product.label}の申告値の場所と比べます。`:`現在は${cityNames[state.city]??'別の観測点'}。元の問いはReginaの季節と${product.label}の地域分布です。`):state.view==='elevation'?`標高の等高線を、${product.label}の地域別申告値と左右で照合します。高さは生産の可否を単独で決めません。`:state.view==='landform'?`地形地域の位置を、${product.label}の地域別申告値と比べます。`:`${state.water?state.water+(state.only?'だけ':'と全水系'):'湖・川'}の位置を、${product.label}の地域別申告値と比べます。位置は使える水量を示しません。`;
 scope.textContent=state.view==='climate'?`申告値2021年／気候1991–2020年。${cityNames[state.city]??'観測点'}は1地点で、地域平均・土壌水分ではありません。`:state.view==='elevation'?'申告値2021年／ETOPO2022の60秒格子から等高線（m・EGM2008）。農地の起伏や道路勾配を直接測った図ではありません。':state.view==='landform'?'申告値2021年／地形GIS公開2019年。地形の色は標高・農地ではありません。':'申告値2021年／水系はNatural Earth v5.1.2の概形。流量の測定ではありません。';
 if(origin)originText(origin,comparison);
 return true;
}
