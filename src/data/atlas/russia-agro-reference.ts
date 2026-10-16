import supply from './russia-wheat-supply-2020-21.json' with {type:'json'};
import {agroBand,agroEscape,agroNumber} from '../../lib/atlas-agro-statistics';

/** An independent, dated source reference. Never a replacement for QCL A pairs. */
export function renderRussiaWheatSupplyReference(){
 const unit='千t',s=supply;
 return `<section data-russia-wheat-supply><h4>別期間の参考：小麦2020/21販売年度</h4><p>2020年7月–2021年6月。2021年公表時点のUSDA Official列です。上の暦年統計と同じ収支ではありません。</p>${agroBand('供給元（全国）',[{label:'国内生産',value:s.production},{label:'輸入',value:s.imports},{label:'期首在庫',value:s.beginningStocks}],unit)}${agroBand('同じ供給全体の仕向け',[{label:'食用・種子・工業用',value:s.foodSeedIndustrial},{label:'飼料・残差',value:s.feedAndResidual},{label:'輸出',value:s.exports},{label:'期末在庫',value:s.endingStocks}],unit)}<p>国内利用（原表公表量）：<strong>${agroNumber(s.domesticUse)} ${unit}</strong>。輸出／同年度生産：${agroNumber(s.exports/s.production*100)}%。国産分の国内利用・輸出割合ではありません。</p><p>両帯の分母は総供給 ${agroNumber(s.totalSupply)} ${unit}。食用・種子・工業用と飼料・残差は国内利用の内数で、国内利用をもう一度加算しません。</p><details><summary>この年度表の定義・出典</summary>${s.notes.map(note=>'<p>'+agroEscape(note)+'</p>').join('')}<p>原表単位：1,000 metric tonnes。MY Imports／MY Exportsを採用し、TY列を二重加算しません。供給−仕向けの差は0千t。</p><a href="${agroEscape(s.source.url)}#page=6">USDA FAS ${agroEscape(s.source.report)}・表1 p.6（${s.source.publishedAt}公表）</a></details></section>`;
}
