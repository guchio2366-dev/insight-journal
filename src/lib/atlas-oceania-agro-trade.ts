import retained from '../data/atlas/oceania-agro-trade.json';
import {agroEscape as escape} from './atlas-agro-statistics';

export type OceaniaTradeTable=typeof retained.tables[number];
// Geographic Oceania, including territories and Tokelau (absent from the map).
// A territory's administering country does not decide the destination region.
export const oceaniaTradePartners=new Set([
 'Australia','New Zealand','Papua New Guinea','Solomon Islands','Vanuatu','Fiji',
 'New Caledonia','Polynesia','French Polynesia','Samoa','American Samoa','Tonga',
 'Tuvalu','Kiribati','Nauru','Naoero','Palau','Guam','Northern Mariana Islands','Niue',
 'Cook Islands','Tokelau','Wallis and Futura Isl.','Wallis and Futuna',
 'Micronesia, Fed. Sts.','Federated States of Micronesia','Marshall Islands',
 'Norfolk Island','Pitcairn','Pitcairn Islands','Ashmore and Cartier Islands',
]);
const valid=(value:number|null):value is number=>value!==null&&Number.isFinite(value)&&value>=0;
// kg -> t needs three decimals; positive sub-kg shares must not read as zero.
const number=(value:number|null)=>value===null?'未収録':value.toLocaleString('ja-JP',{maximumFractionDigits:3});
const percent=(value:number)=>value>0&&value<.01?'0.01%未満':value.toLocaleString('ja-JP',{maximumFractionDigits:2})+'%';
export function oceaniaPartnerScope(partner:string):'intra'|'extra'|'unallocated'{
 if(oceaniaTradePartners.has(partner))return 'intra';
 // Other Asia, nes is explicitly Asian, unlike an unspecified destination.
 if(/unspecified|unidentified|areas,?\s*nes|special categories|free zones|bunkers/i.test(partner))return 'unallocated';
 return 'extra';
}
export function oceaniaTradeSummary(table:OceaniaTradeTable){
 const all=table.partners,known=all.filter(row=>valid(row.value));
 const sum=(scope:string)=>known.filter(row=>oceaniaPartnerScope(row.partner)===scope).reduce((total,row)=>total+row.value!,0);
 const missing=all.filter(row=>!valid(row.value)).length;
 const total=known.reduce((sum,row)=>sum+row.value!,0);
 return {missing,total,intra:sum('intra'),extra:sum('extra'),unallocated:sum('unallocated'),
  gap:valid(table.worldQuantity)&&!missing?total-table.worldQuantity:null,
  denominator:valid(table.worldQuantity)&&table.worldQuantity>0?table.worldQuantity:null,
  top:[...known].sort((a,b)=>b.value!-a.value!||a.partner.localeCompare(b.partner))};
}
export function oceaniaTradeReferences(country:string,series:string){
 return retained.tables.filter(table=>table.country===country&&table.series===series);
}
export function renderOceaniaTradeReference(table:OceaniaTradeTable){
 if(table.qualityStatus==='withheld')return `<section class="oceania-trade-reference" data-oceania-trade-id="${escape(table.id)}"><p><strong>${table.year}年・${escape(table.label)}の数量は保留</strong></p><p class="agro-meta">${escape(table.limitation)} 数量順位・構成比・域内外小計を主表示に採用しません。</p><a href="${escape(table.sourceUrl)}">確認が必要なWITS公開表</a></section>`;
 const s=oceaniaTradeSummary(table),unit=escape(table.unit);
 const ratio=(value:number|null)=>valid(value)&&s.denominator!==null?percent(value/s.denominator*100):'未算出';
 const top=s.top[0],scopeLabel={intra:'オセアニア域内',extra:'オセアニア域外',unallocated:'帰属未判定'};
 const publicTotal=table.worldQuantity===0?'公表World総輸出数量は0。数量構成比を算出しません。':s.denominator===null?'World総輸出数量が未収録のため、数量構成比を算出しません。':`分母：同じ年・HSの公表World総輸出 ${number(table.worldQuantity)} ${unit}。世界生産量ではありません。`;
 return `<section class="oceania-trade-reference" data-oceania-trade-id="${escape(table.id)}">
  <p class="oceania-trade-label"><strong>別範囲の数量参考 · ${table.year}暦年</strong></p>
  <p><strong>${escape(table.label)}</strong> · H0 ${escape(table.product)} · ${unit}</p>
  <p class="agro-meta">${escape(table.limitation)}</p>
  ${top?`<p>${s.missing?'数量判明相手の最多':'数量最多'}：<strong>${escape(top.partner)} · ${number(top.value)} ${unit}</strong>${s.denominator!==null?`（総輸出の${ratio(top.value)}）`:''}。</p>`:''}
  <p class="agro-meta">${publicTotal}</p>
  <ul class="agro-key">${s.top.slice(0,5).map(row=>`<li>${escape(row.partner)} <strong>${number(row.value)} ${unit}${s.denominator!==null?' · '+ratio(row.value):''}</strong></li>`).join('')}</ul>
  <details class="agro-definitions"><summary>全${table.partners.length}相手・域内外の区別・出典</summary>
   <p>${s.missing?`数量欠測 ${s.missing}相手。以下は数量判明相手のみの小計です。`:'以下は全公表相手行の数量小計です。'}</p>
   <p>${escape(table.country)}からオセアニア域内へ：${number(s.intra)} ${unit}／同国から域外へ：${number(s.extra)} ${unit}／帰属未判定：${number(s.unallocated)} ${unit}。1報告国の相手別小計であり、オセアニア全域の合計ではありません。</p>
   <p>${s.gap===null?'相手行合計とWorldの差は、欠測があるため未算出です。':`相手行合計−公表World：${s.gap>0?'+':''}${number(s.gap)} ${unit}。原表の丸め差を架空の「その他」へ補いません。`}</p>
   <div class="agro-table-scroll"><table><caption>${table.year}年・${escape(table.label)}・全公表相手（数量降順、欠測は末尾）</caption><thead><tr><th>相手・域内外</th><th>${unit}</th><th>総輸出比</th></tr></thead><tbody>${[...s.top,...table.partners.filter(row=>!valid(row.value))].map(row=>`<tr><th scope="row">${escape(row.partner)}<small>${scopeLabel[oceaniaPartnerScope(row.partner)]}</small></th><td>${number(row.value)}</td><td>${ratio(row.value)}</td></tr>`).join('')}</tbody></table></div>
   <p>総輸出には再輸出を含み得ます。相手は通関上の仕向け先で、最終消費地・用途ではありません。輸入・在庫・飼料・加工・国内消費をこの表から逆算しません。</p>
   <p class="agro-meta">${escape(table.classification)}。${table.unit==='t'?'原表kg÷1,000＝t。':'原表m³。'}保存した公式公開表テキストのSHA-256：${escape(table.sourceSha256)}。原HTMLのハッシュではありません。</p>
   <a href="${escape(table.sourceUrl)}">出典：World Bank WITS / UN Comtrade 公開数量表</a>
  </details>
 </section>`;
}
