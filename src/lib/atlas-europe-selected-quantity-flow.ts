import {agroBand,agroEscape,renderAgroMarketingProduction,renderAgroMarketingUse} from './atlas-agro-statistics.ts';
import type {EuropeSelectedQuantityFlow} from '../data/atlas/europe/selected-quantity-flow.ts';

const number=(value:number)=>value.toLocaleString('ja-JP',{maximumFractionDigits:3});
const percent=(value:number)=>value>0&&value<.01?'0.01%未満（0超）':number(value)+'%';
const colors=['#3d7666','#b98046','#7b8ca7','#9c6b8c','#8a9857','#b2b8ad'];
const names:Record<string,string>={'Turkey':'トルコ','Egypt, Arab Rep.':'エジプト','Netherlands':'オランダ','Romania':'ルーマニア','Germany':'ドイツ','Poland':'ポーランド','Italy':'イタリア','France':'フランス','Austria':'オーストリア','Spain':'スペイン','Belgium':'ベルギー','Switzerland':'スイス'};
const name=(value:string)=>names[value]??value;

export function renderEuropeSelectedQuantityFlow(flow:EuropeSelectedQuantityFlow):string {
  const period=typeof flow.year==='number'?`${flow.year}暦年`:`${flow.year}販売年度`;
  const heading=`${flow.countryName}全国 · ${period} · ${flow.label} · ${flow.unit}`;
  if(flow.kind==='marketing-year-balance'){
    const balance=flow;
    return `<p class="agro-flow-period">${agroEscape(heading)}</p><div class="agro-columns" data-eu-quantity-country="${flow.countryCode}" data-eu-quantity-topic="${flow.topic}"><section data-agro-stage="production">${renderAgroMarketingProduction(balance)}</section><section data-agro-stage="use">${renderAgroMarketingUse(balance)}<p>${agroEscape(balance.domesticSubsetLabel)}：${number(balance.domesticSubset)} ${flow.unit}。国内利用総量に含まれる値で、帯へ再加算しません。</p></section><section data-agro-stage="destinations"><h3>③ 輸出先の量と構成比</h3><p>同じ販売年度・商品範囲の全相手数量は未収録です。暦年の相手表や小麦粒だけのHS1001を、製品換算を含み得るこの輸出量へ接合しません。</p></section></div><details class="agro-definitions"><summary>販売年度・収支・原表の定義</summary><p>USDA WASDE-675（2026-09-11）p.${balance.source.page}の2024/25歴史値。販売年度は国・品目によるため、Worldも各国販売年度の集計です。2024暦年のFAO世界比とは別資料です。</p><p>国内利用は原表Domestic Total（未報告の消失を含む）。食用・飼料・加工・種子をこの表から分離しません。国産収穫物を追跡した国内／輸出割合でもありません。</p><p>生産＋輸入＋期首在庫−国内利用−輸出−期末在庫の公表丸め差 ${number(balance.roundingGap)} ${flow.unit}。架空の用途で調整しません。</p><pre>${agroEscape(balance.rawLine)}\n${agroEscape(balance.worldRawLine)}</pre><p>保存原文 ${agroEscape(balance.source.path)} · SHA-256 ${balance.source.sha256}</p><a href="${balance.source.url}#page=${balance.source.page}">USDA原表・注記</a></details>`;
  }
  const row=flow;
  const share=row.production/row.worldProduction*100;
  const partners=[...row.partners].sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
  const shown=partners.slice(0,5);
  if(partners.length>5)shown.push({name:'その他の収録相手区分',value:partners.slice(5).reduce((sum,part)=>sum+part.value,0)});
  let offset=0;
  const stops=shown.map((part,index)=>{const start=offset;offset+=part.value/row.exports*100;return `${colors[index]} ${start}% ${offset}%`;});
  const apparent=row.production+row.imports-row.exports;
  if(!Number.isFinite(apparent)||apparent<0||row.exports<=0||row.worldProduction<=0)throw Error('Invalid Europe quantity flow');
  return `<p class="agro-flow-period">${agroEscape(heading)}</p><p class="agro-meta">同年・丸大豆・tにそろえたFAOSTATとWITSの数量比較です。実消費・国産原料の仕向けは未把握です。</p><div class="agro-columns" data-eu-quantity-country="${flow.countryCode}" data-eu-quantity-topic="${flow.topic}">
    <section data-agro-stage="production"><h3>① 生産量と世界シェア</h3><p>国内生産 <strong>${number(row.production)} t</strong></p><div class="agro-world-pie" role="img" aria-label="${agroEscape(row.countryName)}の世界生産量比 ${percent(share)}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${percent(share)}</span></div><p>世界シェア <strong>${percent(share)}</strong> · 同年World ${number(row.worldProduction)} t。国／Worldとも原記号 ${row.productionFlag}／${row.worldFlag}。</p><a href="${row.source.productionUrl}">FAOSTAT QCL：2023年丸大豆</a></section>
    <section data-agro-stage="use"><h3>② 国内の見かけ供給と輸出</h3>${agroBand('生産と輸入（在庫を含まない）',[{label:'国内生産',value:row.production},{label:'輸入',value:row.imports}],'t')}${agroBand('輸入込みの数量比較（在庫未調整）',[{label:'国内の見かけ供給',value:apparent},{label:'総輸出',value:row.exports}],'t')}<p>輸出／生産 <strong>${percent(row.exports/row.production*100)}</strong>。当年国産分を二分した比率ではありません。</p><p class="agro-meta">見かけ供給＝生産＋輸入−輸出。実消費、食用、飼料、搾油投入、在庫増減は未収録です。輸入原料や再輸出を国産分と区別できません。</p><a href="${row.source.importUrl}">WITS：同年丸大豆の総輸入</a></section>
    <section data-agro-stage="destinations"><h3>③ 輸出先の量と構成比</h3><div class="agro-partner-pie" role="img" aria-label="${agroEscape(shown.map(part=>name(part.name)+' '+percent(part.value/row.exports*100)).join('、'))}" style="background:conic-gradient(${stops.join(',')})"></div><ul class="agro-key">${shown.map((part,index)=>`<li><i style="background:${colors[index]}" aria-hidden="true"></i>${agroEscape(name(part.name))} <strong>${number(part.value)} t · ${percent(part.value/row.exports*100)}</strong></li>`).join('')}</ul><p class="agro-meta">分母：WITS World総輸出 ${number(row.exports)} t。欧州内・EU内の相手も含む全国の総輸出です。欧州域外輸出の円ではありません。</p><details class="agro-definitions"><summary>全${partners.length}相手区分・丸め差</summary><p>相手行合計−World：${number(row.partnerRoundingGap)} t。その他は残る実在行の合計で、この差を吸収していません。相手は通関上の仕向け先で、最終消費地とは限りません。Bunkers等の原統計区分は国へ推定配分しません。</p><div class="agro-table-scroll"><table><thead><tr><th>原資料の相手名</th><th>数量 t</th><th>World輸出比</th></tr></thead><tbody>${partners.map(part=>`<tr><th scope="row">${agroEscape(part.name)}</th><td>${number(part.value)}</td><td>${percent(part.value/row.exports*100)}</td></tr>`).join('')}</tbody></table></div></details><a href="${row.source.exportUrl}">WITS / UN Comtrade：全輸出相手数量</a></section>
  </div><details class="agro-definitions"><summary>商品範囲・期間・出典の定義</summary><p>2023暦年。FAOSTAT QCL236 Soya beansの全国生産と同じ保存版World。貿易はWITSが公開するHS1988/92（H0）120100 Soya beansの総輸出・総輸入です。kgを1,000で割ってtへ換算し、金額を重量へ変換していません。</p><p>丸大豆の参考比較に限ります。大豆油・大豆粕の加工後の重量は加算しません。FAOと通関統計では報告範囲・改訂時点が異なり得るため、公式の統合需給表やカロリー自給率とは呼びません。地図は分布推計、ここは全国値です。</p></details>`;
}
