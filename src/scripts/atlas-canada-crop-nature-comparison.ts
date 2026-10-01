import {readCanadaCropComparison,type CanadaCropComparisonMap,type CanadaCropId} from '../lib/atlas-canada-crop-comparison';
import type {CanadaNatureState} from '../lib/atlas-canada-nature';

const cityNames:Record<string,string>={regina:'Regina',winnipeg:'Winnipeg',ottawa:'Ottawa',vancouver:'Vancouver',iqaluit:'Iqaluit'};
const prairiePlaces:Record<string,string>={regina:'Regina（サスカチュワン州）',winnipeg:'Winnipeg（マニトバ州）'};

function question(crop:CanadaCropId,map:CanadaCropComparisonMap,state:CanadaNatureState){
 const city=cityNames[state.city]??'選んだ観測点';
 if(state.view==='landform')return crop==='beef'?'プレーリーの平原と西部の山地を、母牛・放牧地・乾草などの分布と別図で照合します。草の生育する場所と季節を、放牧の頭数・期間や冬の貯蔵飼料の管理へどうつなぐでしょうか。':'プレーリー南部の栽培面積を、内陸平原と山地の位置に照合します。生育条件を、播種・収穫・貯蔵をつなぐ機械と人の管理へどう結び付けるでしょうか。';
 if(state.view==='water'){
  const water=state.water?`${state.water}${state.only?'だけ':'を選んだ全水系'}`:'湖・川の全体';
  return `${water}と${map.name}の分布を別図で照合します。`+(crop==='beef'?'水域の位置と草地・家畜が使える水量を区別し、草が育つ季節を放牧・冬飼料の管理へどうつなぐでしょうか。':'水域の位置と畑の土壌水分を区別し、生育期に根が使える水と排水を人はどう管理するでしょうか。');
 }
 const prairie=state.city==='regina'||state.city==='winnipeg';
 if(!prairie)return `現在の地点は${city}。`+(crop==='beef'?'元の問いはReginaの草が育つ季節と冬を、放牧・貯蔵飼料の管理で繁殖・育成・肥育へどうつなぐかです。':crop==='wheat'?'元の問いはReginaの季節と小麦面積を照合し、春播きの生育期間と秋播きの越冬を人の管理でどう支えるかです。':'元の問いはReginaの夏の熱・水とカノーラ面積を照合し、生育・成熟を品種・輪作・排水の管理でどう支えるかです。');
 return `${prairiePlaces[state.city]}の季節とプレーリーの${map.name}分布を照合します。`+(crop==='beef'?'草が育つ季節と冬を、放牧・貯蔵飼料の管理で繁殖・育成・肥育へどうつなぐでしょうか。':crop==='wheat'?'春播きの生育期間と秋播きの越冬を、播種・土壌水分・刈株の管理でどう支えるでしょうか。':'夏の熱と根が使える水を、品種・輪作・排水の管理でどう支えるでしょうか。');
}

/** Retain every entry of the JPEG's official legend as readable HTML beside either display. */
function renderMapKey(target:HTMLElement,map:CanadaCropComparisonMap){
 const doc=target.ownerDocument;target.replaceChildren();
 const summary=doc.createElement('strong');summary.textContent=`2021年農業センサス：${map.name}。${map.total}。`;target.append(summary,doc.createElement('br'));
 const items=[
  ['赤い点',map.dot,'background:#e32923;border-radius:50%'],
  ['網掛け','秘匿（confidential）','background:repeating-linear-gradient(45deg,#a1a476 0 1px,#ffffca 1px 4px)'],
  ['薄黄色','農業地域またはnull値','background:#ffffca'],
  ['灰色','農業地域外','background:#c6c6c6'],
  ['★','首都','color:#be2024;border:0;background:none'],
  ['■','州・準州の都','color:#111;border:0;background:none'],
  ['薄灰色の境界線','センサス区界','border:1px solid #bbb;background:#fff'],
  ['黒い境界線','州・準州界','border:1px solid #111;background:#fff'],
 ];
 for(const [symbol,label,style] of items){
  const item=doc.createElement('span');item.dataset.canadaCropLegend='';item.style.cssText='display:inline-flex;align-items:center;gap:4px;margin:2px 8px 2px 0';
  const swatch=doc.createElement('i');swatch.setAttribute('aria-hidden','true');swatch.style.cssText=`display:inline-block;flex:none;width:14px;height:12px;border:1px solid #777;font-style:normal;line-height:12px;${style}`;if(symbol==='★'||symbol==='■')swatch.textContent=symbol;
  item.append(swatch,doc.createTextNode(`${symbol}＝${label}`));target.append(item);
 }
 target.append(doc.createElement('br'),doc.createTextNode('点は量のランダム配置で、農場・肥育場の位置・数ではありません。無点の場所も丸め・秘匿を含みます。 '));
 const source=doc.createElement('a');source.href=map.source;source.textContent='Statistics Canada：原図・凡例・点数表';source.dataset.canadaCropOriginalSource='';target.append(source);
}

function setImage(image:HTMLImageElement,link:HTMLAnchorElement,map:CanadaCropComparisonMap){
 image.src=map.image;image.width=map.width;image.height=map.height;image.alt=`2021年 ${map.name}の公式分布図。${map.dot}。${map.total}。全凡例と東部拡大図を保持。点は量を表し農場の位置ではありません。`;
 link.href=map.image;link.setAttribute('aria-label',`${map.name}の2021年分布図を原寸で開く`);
}

/** Crop JPEGs have no registration for the nature projection: compare complete original figures. */
export function renderCanadaCropNatureComparison(root:HTMLElement,state:CanadaNatureState):boolean {
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector);
 const back=$<HTMLAnchorElement>('[data-canada-crop-return]'),figure=$('[data-canada-crop-source]'),context=$('[data-canada-crop-context]'),mini=$('[data-canada-crop-mini]');
 const image=$<HTMLImageElement>('[data-canada-crop-image]'),imageLink=$<HTMLAnchorElement>('[data-canada-crop-image-link]'),title=$('[data-canada-crop-map-title]'),key=$('[data-canada-crop-map-key]'),heading=$('[data-canada-crop-context-title]'),text=$('[data-canada-crop-context-text]'),scope=$('[data-canada-crop-scope]');
 const origin=$('[data-canada-crop-origin]');
 if(!back||!figure||!context||!mini||!image||!imageLink||!title||!key||!heading||!text||!scope)return false;
 const comparison=readCanadaCropComparison(new URL(root.ownerDocument.defaultView!.location.href));
 back.hidden=context.hidden=!comparison;figure.hidden=!comparison||state.view!=='climate';mini.hidden=!comparison||state.view==='climate';mini.replaceChildren();
 if(!comparison){
  back.removeAttribute('href');back.textContent='';image.removeAttribute('src');image.alt='';imageLink.removeAttribute('href');imageLink.removeAttribute('aria-label');
  for(const el of [title,key,heading,text,scope])el.replaceChildren();origin?.replaceChildren();return false;
 }
 const map=comparison.selectedMap;back.href=comparison.returnUrl.href;back.textContent=comparison.returnLabel;
 title.textContent=`${map.name}の分布（2021年・農業センサス）`;setImage(image,imageLink,map);renderMapKey(key,map);
 heading.textContent=`${map.name}と${state.view==='climate'?`${cityNames[state.city]??'観測点'}の季節`:state.view==='landform'?'平原・山地':'湖・川'}を比べる`;
 text.textContent=question(comparison.crop,map,state);
 scope.textContent=`分布図は2021年、気候は1991–2020年。${cityNames[state.city]??'選んだ地点'}は1観測点で、プレーリー平均や畑・牧場の土壌水分ではありません。`;
 if(origin)origin.textContent=`元の年次表：${comparison.sourceLabel}。照合する分布図は2021年農業センサス（${map.name}）。${map.description}`;
 if(state.view!=='climate'){
  const doc=root.ownerDocument,small=doc.createElement('figure'),caption=doc.createElement('figcaption'),link=doc.createElement('a'),img=doc.createElement('img');
  small.className='canada-crop-mini-figure';img.loading='lazy';img.style.cssText='display:block;width:100%;height:auto';setImage(img,link,map);
  const label=doc.createElement('strong');label.textContent=`${map.name}の2021年分布図（別図で照合）`;small.append(label,link);link.append(img);renderMapKey(caption,map);small.append(caption);mini.append(small);
 }
 return true;
}
