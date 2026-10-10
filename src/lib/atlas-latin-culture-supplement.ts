import {latinCultureSupplements,latinCultureSupplementSelection} from '../data/atlas/latin-america/culture-supplement-2018';
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function latinCultureSupplementLinks(choice=''){
 return `<div class="latin-culture-source-list" aria-label="資料別の補助統計">${latinCultureSupplements.map(d=>`<button type="button" data-lc-select="${d.country}:national" aria-pressed="${choice.startsWith(d.country+':')}">${d.name}・${d.year}（${d.country==='GTM'?'全国6分類':'33行政区分'}）</button>`).join('')}</div>`;
}
export function latinCultureSupplementReading(choice:string){
 const selection=latinCultureSupplementSelection(choice);if(!selection)return null;
 const {data,row}=selection,isPercent=data.country==='GTM',format=(n:number)=>isPercent?`${n.toFixed(1)}%`:`${n.toLocaleString('ja-JP')}人`;
 const title=row?`${data.name}：${row.name}`:`${data.name}の${isPercent?'全国6自己認識分類':'先住民自己認識・33行政区分'}`;
 const overview=row?`${data.year}年${isPercent?'全国の公表割合':'・行政区分全域の公表人数'}は${format(row.value)}。${isPercent?'人数や居住域には換算しません。':'区分の総人口に占める割合ではありません。'}`:isPercent?'2018年の全国自己認識。ラディーノ56.0%、マヤ41.7%など6分類を、政府の公表割合で読みます。':'2018年の先住民自己認識は全国1,905,617人。32県とBogotá D.C.の人数を、そのまま33区分で読みます。';
 const body=`<h3>解説：${isPercent?'全国の自己認識を公表分類のまま読む':'同じ設問の人数を行政区分ごとに読む'}</h3><p>${escape(data.definition)}</p>${latinCultureSupplementLinks(choice)}<table class="latin-culture-table" data-lc-supplement-table="${data.country}"><caption>${data.year}年・${escape(data.grain)}・${escape(data.unit)}</caption><thead><tr><th scope="col">${isPercent?'自己認識の公表分類':'行政区分（原典表記）'}</th><th scope="col">${isPercent?'割合':'人数'}</th></tr></thead><tbody>${data.rows.map(r=>`<tr><th scope="row"><button type="button" data-lc-select="${data.country}:${r.id}" aria-pressed="${row?.id===r.id}">${escape(r.name)}${isPercent?`<small lang="es">${escape(r.original)}</small>`:''}</button></th><td>${format(r.value)}</td></tr>`).join('')}</tbody></table><p>${escape(data.denominator)}</p><p>チリ・パナマと設問や分類が異なります。同じ民族分類にまとめず、全国割合から居住域を描きません。地図の＋記号は補助統計の参照位置です。</p><details open><summary>原典・利用条件</summary><p><a href="${data.source}">${data.name}・${data.year}年の原典</a> · <a href="${data.termsUrl}">${escape(data.terms)}</a></p><p>${escape(data.attribution)}</p>${isPercent?'':'<p>原典PDF 25ページのCNPV2018列を採用。33区分の合計は全国計数1,905,617人と一致します。</p>'}</details>`;
 return {title,overview,body};
}
