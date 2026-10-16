import data from '../data/atlas/mexico/agro-statistics-20261016.json';
import {agroBand,agroEscape,agroNumber,renderAgroMarketingProduction,renderAgroMarketingUse} from './atlas-agro-statistics';

export interface MexicoAgroBalance {
 countryCode:string;countryName:string;seriesId:string;label:string;year:string;unit:string;
 production:number;imports:number;exports:number;domesticUse:number;beginningStocks:number;endingStocks:number;
 worldProduction:number|null;lossAdjustment?:number;roundingGap:number;roundingTolerance:number;
 domesticParts?:{label:string;value:number}[];domesticSubset?:{label:string;value:number;isWithinDomesticUse:boolean}|null;
 periodStart:string|null;periodEnd:string|null;rawLine:string;worldRawLine:string|null;notes:string[];
 source:{report:string;releaseDate:string;url:string;page:number;sha256:string;path:string};
}
export type MexicoTradeReference=(typeof data.tradeReferences)[number];
export const mexicoAgroBalance=(productId:string):MexicoAgroBalance|undefined=>data.balances.find(row=>row.productId===productId);
export const mexicoTradeReference=(productId:string)=>data.tradeReferences.find(row=>row.productId===productId);
const quantity=(value:number)=>value.toLocaleString('ja-JP',{maximumFractionDigits:3});
const percent=(value:number)=>value>0&&value<0.01?'0.01%未満':`${value.toFixed(2)}%`;

export function renderMexicoAgroProduction(flow:MexicoAgroBalance){
 if(flow.worldProduction!==null)return renderAgroMarketingProduction({...flow,worldProduction:flow.worldProduction});
 return `<h3>① 生産量と世界シェア</h3><p class="agro-meta">${agroEscape(flow.year)}販売年度 · ${agroEscape(flow.label)} · ${agroEscape(flow.unit)}</p><p>国内生産：<strong>${agroNumber(flow.production)} ${agroEscape(flow.unit)}</strong></p><p class="agro-flow-gap">同じ資料・版の世界生産分母は未収録です。世界シェア・推移・順位は算出しません。</p><p class="agro-meta">②と同じ${agroEscape(flow.source.report)}のUSDA Official列。</p>`;
}

export function renderMexicoAgroUse(flow:MexicoAgroBalance){
 const summary=flow.source.report==='WASDE-675'&&flow.worldProduction!==null
  ?renderAgroMarketingUse({...flow,worldProduction:flow.worldProduction})
  :`<h3>② 国内利用と輸出</h3><p class="agro-meta">${agroEscape(flow.year)}販売年度 · ${agroEscape(flow.unit)}</p><p>輸出量 <strong>${agroNumber(flow.exports)} ${agroEscape(flow.unit)}</strong> · 生産量との比 <strong>${percent(flow.exports/flow.production*100)}</strong></p>${agroBand('年度供給全体の仕向け（輸入・持越在庫込み）',[{label:'国内利用',value:flow.domesticUse},{label:'輸出',value:flow.exports},{label:'期末在庫',value:flow.endingStocks}],flow.unit)}<p class="agro-meta">輸入 ${agroNumber(flow.imports)}、期首在庫 ${agroNumber(flow.beginningStocks)} ${agroEscape(flow.unit)}。国内利用は食用だけではありません。国産分の国内利用・輸出を追跡した比率ではありません。</p>`;
 const parts=flow.domesticParts?.length?flow.domesticParts:flow.domesticSubset?[flow.domesticSubset]:[];
 return summary+agroBand('供給元（国内生産・輸入・期首在庫）',[
  {label:'国内生産',value:flow.production},{label:'輸入',value:flow.imports},{label:'期首在庫',value:flow.beginningStocks}],flow.unit)
  +(parts.length?`<p class="agro-meta" data-mexico-domestic-subsets>国内利用の内数：${parts.map(part=>`${agroEscape(part.label)} ${agroNumber(part.value)} ${agroEscape(flow.unit)}`).join(' ／ ')}。上の国内利用へ重ねて加算しません。</p>`:'')
  +`<p class="agro-meta">国内利用は原表の公表量です。生産−輸出ではありません。再輸出・輸入原料の仕向けは分離できません。</p>`;
}

/** This is deliberately a closed, separately labelled reference, never the
 * partner decomposition of a marketing-year or FAO production quantity. */
export function renderMexicoTradeReference(reference:MexicoTradeReference){
 const all=[...reference.partners].sort((a,b)=>b.value-a.value||a.originalName.localeCompare(b.originalName));
 const total=all.reduce((sum,row)=>sum+row.value,0);
 if(reference.balanceCompatible!==false||reference.reporter!=='MEX'||reference.scope!=='national-cross-border'
  ||!Number.isFinite(reference.worldExports)||reference.worldExports<=0
  ||!Number.isFinite(reference.partnerTotal)||reference.partnerTotal<=0
  ||!Number.isFinite(reference.roundingTolerance)||reference.roundingTolerance<0
  ||!Number.isFinite(reference.partnerRoundingGap)
  ||reference.periodType!=='calendar-year'||!Number.isFinite(total)||total<=0
  ||new Set(all.map(row=>row.originalName)).size!==all.length
  ||all.some(row=>!Number.isFinite(row.value)||row.value<0||['Mexico','World','European Union'].includes(row.originalName))
  ||Math.abs(total-reference.partnerTotal)>1e-6||Math.abs(total-reference.worldExports)>reference.roundingTolerance
  ||Math.abs(total-reference.worldExports-reference.partnerRoundingGap)>1e-6)
  throw new Error('Mexico trade reference has an invalid scope, quantity or denominator');
 const shown=all.slice(0,5).map(row=>({name:row.name,value:row.value}));
 if(all.length>5)shown.push({name:'その他の掲載相手',value:all.slice(5).reduce((sum,row)=>sum+row.value,0)});
 const palette=['#3d7666','#b98046','#7b8ca7','#9c6b8c','#8a9857','#b2b8ad'];let offset=0;
 const stops=shown.map((row,index)=>{const start=offset;offset+=row.value/total*100;return `${palette[index]} ${start}% ${offset}%`;});
 const line=(row:{name:string;value:number})=>`${agroEscape(row.name)} <strong>${quantity(row.value)} ${agroEscape(reference.unit)} · ${percent(row.value/total*100)}</strong>`;
 return `<details class="agro-other-reference" data-mexico-trade-reference="${reference.hsCode}"><summary>別資料：${reference.year}暦年・${agroEscape(reference.label)}の輸出先</summary><p>${agroEscape(reference.explanation)}この円を①の生産量や②の国内利用・輸出量の振り分けには使いません。</p><p class="agro-meta">メキシコ報告 · ${reference.year}暦年 · HS1988/92（H0）${reference.hsCode} · ${agroEscape(reference.unit)} · 総輸出</p><p>World公表輸出：<strong>${quantity(reference.worldExports)} ${agroEscape(reference.unit)}</strong></p><div class="agro-partner-pie" role="img" aria-label="${agroEscape(shown.map(row=>`${row.name} ${quantity(row.value)} ${reference.unit}、${percent(row.value/total*100)}`).join(' ／ '))}" style="background:conic-gradient(${stops.join(',')})"></div><ul class="agro-key">${shown.map((row,index)=>`<li><i style="background:${palette[index]}" aria-hidden="true"></i>${line(row)}</li>`).join('')}</ul><p class="agro-meta">構成比の分母は公開表に掲載された全${all.length}相手の数量合計 ${quantity(reference.partnerTotal)} ${agroEscape(reference.unit)}。相手合計−World公表値は ${quantity(reference.partnerRoundingGap)} ${agroEscape(reference.unit)}（Worldとの差を保持）。「その他」は掲載相手の実数合計で、差を押し込んだ値ではありません。</p><p class="agro-meta">選択地域はメキシコ全国。国内取引を含まず、米国・カナダへの輸出も国境外への輸出に含みます。北米全体の域外貿易ではありません。総輸出は再輸出を分離できず、通関上の仕向け先が最終消費地とは限りません。</p><details><summary>掲載された全相手の数量・構成比</summary><table><caption>${reference.year}暦年・HS${reference.hsCode}・メキシコ報告の総輸出</caption><thead><tr><th>相手</th><th>${agroEscape(reference.unit)}</th><th>相手合計比</th></tr></thead><tbody>${all.map(row=>`<tr><th scope="row">${agroEscape(row.name)}</th><td>${quantity(row.value)}</td><td>${percent(row.value/total*100)}</td></tr>`).join('')}</tbody></table><p class="agro-meta">原単位 ${agroEscape(reference.sourceUnit)}${reference.conversionDivisor===1000?' を1,000で割ってtに換算。製品歩留まりや原穀・原木換算はしていません。':'。原木量やパルプtへ換算していません。'}</p></details><a href="${agroEscape(reference.source.url)}">出典：World Bank WITS / UN Comtrade・全相手公開数量表</a></details>`;
}
