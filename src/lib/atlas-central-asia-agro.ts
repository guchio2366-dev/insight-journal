import production from '../data/atlas/central-asia-agro-production.json' with {type:'json'};
import wheatReference from '../data/atlas/central-asia-agro-wheat-reference.json' with {type:'json'};
import {agroBand,agroEscape as esc,agroNumber as number,agroUnit} from './atlas-agro-statistics.ts';
import {agroMarketingYearFlow} from '../data/atlas/agro-marketing-year-flow.ts';

export const centralAgroCountries:readonly string[]=production.countries;
const topics:Record<string,string[]>={wheat:['wheat-production'],cotton:['qcl-328-production'],maize:['maize-production'],cattle:['cattle-meat','cattle-milk'],sheep:['sheep-meat'],goat:['goat-production'],forest:['roundwood-production','sawnwood-production']};
const labels:Record<string,string>={'wheat-production':'小麦','qcl-328-production':'未繰綿（綿実を含む）','maize-production':'とうもろこし（子実）','cattle-meat':'牛肉','cattle-milk':'牛生乳','sheep-meat':'羊肉','goat-production':'山羊肉','roundwood-production':'丸太（燃料材を含む）','sawnwood-production':'製材'};
const percent=(value:number)=>value>0&&value<.01?'0.01%未満':`${value.toLocaleString('ja-JP',{maximumFractionDigits:2})}%`;
export const centralAgroSeries=(topic:string)=>topics[topic]??[];
export const centralAgroLabel=(id:string)=>labels[id]??id;
export const centralForestBoundary='<p data-central-forest-boundary class="agro-meta">丸太（燃料材を含む）・製材は体積 m³、パルプは重量 t の別製品です。工程間の量を合算・差引きしません。パルプの生産・World・需給・相手数量は未収録です。</p>';

/** Missing countries never become zeros or a complete regional total. */
export function centralAgroProduction(id:string){
 const record=production.records.find(r=>r.id===id);
 if(!record)return null;
 const valid=record.observations.filter(o=>o.row?.value!==null&&o.row?.value!==undefined);
 const value=record.complete&&record.productionRaw!==null?Number(record.productionRaw):null;
 const world=record.worldRaw===null?null:Number(record.worldRaw);
 return {...record,value,world,coverage:valid.length,share:value!==null&&world!==null&&world>0?value/world*100:null};
}

/** A published country's mixed-product table stays an independent reference.
 * The regional boundary is fixed; Afghanistan is outside these five countries. */
export function centralWheatDestinations(){
 const intra=wheatReference.partners.filter(p=>centralAgroCountries.includes(p.code));
 const extra=wheatReference.partners.filter(p=>!centralAgroCountries.includes(p.code));
 const sum=(rows:typeof intra)=>rows.reduce((a,r)=>a+r.value,0);
 return {intra,extra,intraTotal:sum(intra),extraTotal:sum(extra),partnerTotal:sum(wheatReference.partners),roundingGap:sum(wheatReference.partners)-wheatReference.worldExports};
}

export function renderCentralWheatReference(){
 const {intraTotal,extraTotal,extra,roundingGap}=centralWheatDestinations();
 const top=extra.filter(p=>p.value>0).slice(0,5);
 return `<details class="agro-other-reference" data-central-wheat-reference><summary>別定義参考：カザフスタンの小麦・小麦粉の輸出先</summary><p>${esc(wheatReference.period)} · ${esc(wheatReference.product)} · t。中央アジア全体の値ではありません。粉の原穀換算基準は未確認で、①②のWASDE販売年度・小麦基準へ接合しません。</p><p>公表世界向け輸出 ${number(wheatReference.worldExports)} t。収録相手のうち中央アジア内 ${number(intraTotal)} t、域外 ${number(extraTotal)} t。域内4か国への取引を域外へ含めません。</p>${agroBand('収録相手数量の行き先（カザフスタンのみ）',[{label:'中央アジア内',value:intraTotal},{label:'中央アジア外',value:extraTotal}],'t')}<p>域外の偏り（分母：収録域外相手計 ${number(extraTotal)} t）：</p><ul class="agro-key">${top.map(p=>`<li>${esc(p.name)} <strong>${number(p.value)} t · ${percent(p.value/extraTotal*100)}</strong></li>`).join('')}</ul><details><summary>収録46相手・公表合計との差・原表</summary><p>相手行合計−公表世界合計：${roundingGap>=0?'+':''}${number(roundingGap)} t。丸め差を架空の相手へ配分しません。再輸出・最終消費地は分離できません。</p><div class="agro-table-scroll"><table><thead><tr><th>相手</th><th>境界</th><th>t</th><th>公表総輸出比</th></tr></thead><tbody>${wheatReference.partners.map(p=>`<tr><th scope="row">${esc(p.name)}</th><td>${centralAgroCountries.includes(p.code)?'域内':'域外'}</td><td>${number(p.value)}</td><td>${percent(p.value/wheatReference.worldExports*100)}</td></tr>`).join('')}</tbody></table></div><p>USDA FAS ${esc(wheatReference.source.report)} Appendix 1（PDF 11–12頁、出典欄：Trade Data Monitor, LLC）。公開PDFの表を転記。PDF原物は未保存です。</p><a href="${esc(wheatReference.source.url)}#page=11">USDA公開報告・原表</a></details></details>`;
}

export function renderCentralAgroRegion(id:string){
 const row=centralAgroProduction(id),unit=agroUnit(row?.identity?.unit??'t'),share=row?.share??null;
 const table=row?.observations.map(o=>`<tr><th scope="row">${esc(o.name)}</th><td>${esc(o.row?.rawValue??'未収録')}</td><td>${esc(o.row?.flag??'未収録')}${o.row?.note?' · '+esc(o.row.note):''}</td></tr>`).join('')??'';
 const forest=['roundwood-production','sawnwood-production'].includes(id);
 return `<p class="agro-flow-period">中央アジア5か国 · 2024暦年 · ${esc(centralAgroLabel(id))} · ${esc(unit)}</p><div class="agro-columns" data-central-agro-series="${esc(id)}"><section data-agro-stage="production"><h3>① 生産量と世界シェア</h3><p>域内生産：<strong>${number(row?.value??null)} ${esc(unit)}</strong> · 収録 ${row?.coverage??0}/5か国</p>${share===null?(row?.value!=null?'<p class="agro-flow-gap">5か国の生産量は揃っています。同版Worldが未収録のため、世界シェアは算出しません。</p>':'<p class="agro-flow-gap">5か国全件の同定義生産が揃わず、地域合計・世界シェアを算出しません。</p>'):`<div class="agro-world-pie" role="img" aria-label="中央アジア5か国の世界生産比 ${percent(share)}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${percent(share)}</span></div><p>世界生産比 <strong>${percent(share)}</strong> · 同版World ${number(row!.world)} ${esc(unit)}。</p>`}<details><summary>5か国の原値・資料記号・定義</summary><p>カザフスタン、キルギス、タジキスタン、トルクメニスタン、ウズベキスタンの全国値。南アジア8か国を含みません。A＝公的報告、E＝推計、I＝補完、X＝外部機関。Worldの記号：${esc(row?.worldFlag??'未収録')}。欠測を0にしません。</p><p>${esc(row?.identity?.definition??'肉量の系列は未収録です。飼養頭数・密度から肉量へ換算しません。')}</p><div class="agro-table-scroll"><table><thead><tr><th>国</th><th>${esc(unit)}</th><th>記号</th></tr></thead><tbody>${table}</tbody></table></div>${row?.sourceUrl?`<a href="${esc(row.sourceUrl)}">FAOSTAT ${esc(row.identity!.domain)} 保存版原表</a>`:''}</details></section><section data-agro-stage="use"><h3>② 域内使用と域外輸出</h3><p class="agro-flow-gap">同年・同製品の域内使用と、域内取引を除いた輸出数量は未収録です。</p><p class="agro-meta">生産−輸出を消費とは呼びません。輸入・再輸出、在庫変動、食用・飼料・加工・種子・損失を分ける需給原表が必要です。国別の全外国向け輸出を5か国合計して域外輸出にしません。</p>${forest?centralForestBoundary:''}</section><section data-agro-stage="destinations"><h3>③ 域外輸出先の量と構成比</h3><p class="agro-flow-gap">5か国の同年・同製品の全相手数量・域外分母は未収録です。</p>${id==='wheat-production'?renderCentralWheatReference():''}</section></div>`;
}

export function renderCentralWheatUse(){
 const flow=agroMarketingYearFlow('KAZ','wheat-production')!;
 return `<details data-central-wheat-use class="agro-definitions"><summary>国内利用の内数：飼料（同じWASDE原表）</summary><p>${esc(flow.year)}販売年度・${esc(flow.source.report)}：国内利用 ${number(flow.domesticUse)} ${esc(flow.unit)}のうち、${esc(flow.domesticSubset!.label)} ${number(flow.domesticSubset!.value)} ${esc(flow.unit)}。国内利用へ二重加算せず、人の食用・加工量に読み替えません。</p><p>供給と仕向けの公表丸め差 ${number(flow.roundingGap)} ${esc(flow.unit)}を保持します。国産分だけの仕向け・中央アジア域外輸出は追跡できません。</p></details>`;
}
