import packet from '../data/atlas/asia/southeast-agro-statistics.json' with {type:'json'};
import {agroEscape as esc,agroNumber as num,agroUnit,renderAgroColumns,renderAgroMarketingProduction,renderAgroMarketingUse,type AgroData,type AgroSeries} from './atlas-agro-statistics.ts';

export const southeastAgroData=packet;
const data=packet as unknown as AgroData;
const percent=(v:number)=>v>0&&v<.01?'0.01%未満':`${num(v)}%`;
export const southeastAgroSeries=(topic:string):string[]=>packet.topics[topic as keyof typeof packet.topics]??[];
export function southeastAgroLabel(id:string){
 return Object.values(packet.countries).flatMap(c=>c.series).find(s=>s.id===id)?.label??(id==='wood-pulp-production'?'木材パルプ（t・未収録）':id);
}
const countrySeries=(code:string,id:string)=>data.countries[code]?.series.find(s=>s.id===id);
function regionalDetails(id:string){
 const unit=agroUnit(packet.countryCodes.map(c=>countrySeries(c,id)).find(Boolean)?.unit??'t');
 return `<details><summary>11か国の原値・欠測・資料区分</summary><table><caption>2024暦年 · ${esc(unit)}。欠測は0ではありません。</caption><thead><tr><th>国</th><th>生産</th><th>区分</th></tr></thead><tbody>${packet.countryCodes.map(code=>{const row=countrySeries(code,id)?.rows[0];return `<tr><th scope="row">${esc(data.countries[code].name)}</th><td>${num(row?.value??null)}</td><td>${esc(row?.flag??'未収録')}</td></tr>`;}).join('')}</tbody></table><p>A＝公的報告、E＝推計、I＝補完、X＝外部機関。公表地域行がある場合は保存国合計と置き換えません。</p></details>`;
}

/** A publisher regional row and a partial sum of retained national rows are
 * separate contracts. World must match every included national denominator. */
export function southeastAgroRegionalProduction(id:string){
 const published=packet.regional[id as keyof typeof packet.regional] as AgroSeries|undefined;
 if(published)return {series:published,row:published.rows[0],basis:'publisher-region',countryCount:null};
 const series=packet.countryCodes.map(c=>countrySeries(c,id)).filter((s):s is AgroSeries=>Boolean(s));
 const rows=series.map(s=>s.rows[0]).filter(r=>r&&typeof r.value==='number'&&Number.isFinite(r.value));
 if(!series.length||!rows.length)return null;
 const world=rows[0].worldValue;
 if(series.some(s=>s.unit!==series[0].unit||s.item!==series[0].item||s.element!==series[0].element||s.domain!==series[0].domain)||rows.some(r=>r.worldValue!==world||r.year!==2024))throw Error('東南アジアの集計定義が一致しません');
 const value=rows.reduce((total,r)=>total+r.value!,0);
 return {series:series[0],row:{...rows[0],value,share:world&&world>0?value/world*100:null},basis:'retained-country-sum',countryCount:rows.length};
}
function production(id:string){
 const found=southeastAgroRegionalProduction(id);
 if(!found)return '<h3>① 生産量と世界シェア</h3><p>この製品の地域生産量・同定義Worldは未収録です。</p>';
 const {series,row,basis,countryCount}=found,share=row.worldValue?row.value!/row.worldValue*100:null,unit=agroUnit(series.unit);
 const scope=basis==='publisher-region'?`FAO公表地域行（South-eastern Asia、M49 035）。原区分 地域 ${esc(row.flag)}／World ${esc(row.worldFlag)}。`:`保存済みの報告${countryCount}/11か国合計。${countryCount===11?'対象11か国の値が揃っています。':'欠測国を含む地域完全値ではありません。'}`;
 return `<h3>① 生産量と世界シェア</h3><p class="agro-meta">2024暦年 · ${esc(series.label)} · ${esc(unit)}</p><p>地域生産：<strong>${num(row.value)} ${esc(unit)}</strong></p><p>${scope}</p>${share===null?'<p>同定義のWorld分母は未収録です。</p>':`<div class="agro-world-pie" role="img" aria-label="${esc(scope)} 世界比 ${percent(share)}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${percent(share)}</span></div><p>同年World ${num(row.worldValue)} ${esc(unit)}。</p>`}<p class="agro-meta">${esc(series.definition)} 生産比は自給率ではありません。</p>${regionalDetails(id)}<a href="${esc(series.sourceUrl)}">FAOSTAT ${esc(series.domain)}</a>`;
}
type Trade=(typeof packet.tradeReferences)[number];
export function southeastAgroTradeSummary(trade:Trade){
 const sum=(region:string)=>trade.partners.filter(p=>p.region===region).reduce((v,p)=>v+p.value,0);
 return {internal:sum('internal'),external:sum('external'),unallocated:sum('unallocated'),gap:trade.partnerRoundingGap};
}
const partnerNames:Record<string,string>={'China':'中国','India':'インド','Pakistan':'パキスタン','Ghana':'ガーナ',"Cote d'Ivoire":'コートジボワール','United States':'米国','Bangladesh':'バングラデシュ','Egypt, Arab Rep.':'エジプト'};
export function renderSoutheastAgroTradeReference(trade:Trade){
 const totals=southeastAgroTradeSummary(trade),all=trade.partners.filter(p=>p.region==='external').sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)),top=all.slice(0,5);
 if(all.length>5)top.push({name:'その他の確認済み域外相手',value:all.slice(5).reduce((n,p)=>n+p.value,0),region:'external',rawKg:'',rawLine:''});
 const palette=['#3d7666','#b98046','#7b8ca7','#9c6b8c','#8a9857','#b2b8ad'];let end=0;
 const stops=top.map((p,i)=>{const start=end;end+=p.value/totals.external*100;return `${palette[i]} ${start}% ${end}%`;});
 return `<article data-southeast-trade-reference="${esc(trade.countryCode)}"><h4>国別参考：${esc(data.countries[trade.countryCode].name)} · ${trade.year}暦年</h4><p>${esc(trade.label)} · ${esc(trade.classification)} · t。${esc(trade.definition)}</p><p>確認済み域外相手計 <strong>${num(totals.external)} t</strong>／域内相手計 ${num(totals.internal)} t。</p><div class="agro-partner-pie" role="img" aria-label="確認済み域外相手計を分母とする国別参考。${esc(top.map(p=>(partnerNames[p.name]??p.name)+' '+percent(p.value/totals.external*100)).join('、'))}" style="background:conic-gradient(${stops.join(',')})"></div><ul class="agro-key">${top.map((p,i)=>`<li><i aria-hidden="true" style="background:${palette[i]}"></i>${esc(partnerNames[p.name]??p.name)} <strong>${num(p.value)} t · ${percent(p.value/totals.external*100)}</strong></li>`).join('')}</ul><p class="agro-meta">円の分母は確認済み域外相手行の合計。地理11か国を域内として除外。範囲未確定の Other Asia, nes ${num(totals.unallocated)} t と、公表Worldとの差は円に含めません。東南アジア全域の輸出先構成ではありません。</p><details><summary>全${trade.partners.length}相手・原表との差を確認</summary><p>公表World ${num(trade.worldExports)} t。全相手行合計−World ${num(totals.gap)} t。差を域外「その他」へ入れません。数量は公表Kg÷1,000のみで換算しています。</p><div class="agro-table-scroll"><table><thead><tr><th>相手</th><th>内外</th><th>t</th></tr></thead><tbody>${trade.partners.map(p=>`<tr><th scope="row">${esc(partnerNames[p.name]??p.name)}</th><td>${p.region==='internal'?'域内':p.region==='external'?'確認済み域外':'範囲未確定'}</td><td>${num(p.value)}</td></tr>`).join('')}</tbody></table></div></details><a href="${esc(trade.sourceUrl)}">WITS / UN Comtrade 公開数量表</a></article>`;
}
function tradeReferences(id:string,country=''){
 const hs=id==='rice-production'||id==='rice-milled-production'?'1006':id==='qcl-254-production'?'1511':'';
 const refs=packet.tradeReferences.filter(t=>t.hs===hs&&(!country||t.countryCode===country));
 return refs.length?`<details class="southeast-agro-reference"><summary>別年・別製品の国別輸出先数量</summary><p>①②と期間・商品範囲が異なります。需給帯の内訳へ接続しません。</p>${refs.map(renderSoutheastAgroTradeReference).join('')}</details>`:'';
}
function riceDetails(code:string){
 const flow=packet.riceBalances[code as keyof typeof packet.riceBalances];
 return `<details><summary>販売年度・精米換算・原表の定義</summary>${flow.notes.map(n=>`<p>${esc(n)}</p>`).join('')}<p>原表丸め差 ${num(flow.roundingGap)} 百万t。</p><pre>${esc(flow.rawLine)}</pre><a href="${esc(flow.source.url)}#page=24">USDA WASDE-675 p.24</a></details>`;
}
const forestryNote=(id:string)=>id.includes('wood')?'<p class="agro-meta">丸太（燃料材を含む）・製材はm³、木材パルプはtの別加工段階です。足し合わせず、木材パルプの未収録を0としません。森林面積やHS44の金額を製品数量へ変換しません。</p><p><a href="../industry/?industryKind=wood">木材の産地と加工工場・港の立地を比べる →</a></p>':'';
export function renderSoutheastAfsisSupplyReference(id:string){
 const ref=packet.supplyReferences.find(r=>r.seriesId===id);if(!ref)return '';
 const columns:[string,number][]=[['期首在庫',ref.beginningStocks],['生産',ref.production],['国別輸入の公表合計',ref.imports],['供給合計',ref.totalSupply],['国内利用の公表合計',ref.domesticUse],['国別輸出の公表合計',ref.exports],['期末在庫',ref.endingStocks],['需要合計',ref.totalDemand]];
 return `<details class="southeast-agro-reference" data-southeast-afsis-reference="${ref.table}"><summary>別範囲：当時ASEAN10の需給（2024見通し）</summary><p>${esc(ref.scope)} · ${esc(ref.period)} · ${esc(ref.label)} · t。${esc(ref.quality)}</p><p>①の地理11か国・FAO暦年生産とは別範囲です。${id==='rice-production'?'米は精米で、①の籾米とは加工段階も異なります。':'国ごとの作期も異なるため、同じ2024年という表示だけで数量を接合しません。'}</p><table><caption>AFSIS ACO No.33 表${ref.table} · t。域内貿易を含む公表合計</caption><thead><tr><th>項目</th><th>t</th></tr></thead><tbody>${columns.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${num(value)}</td></tr>`).join('')}</tbody></table>${ref.notes.map(n=>`<p class="agro-meta">${esc(n)}</p>`).join('')}<p class="agro-meta">この表の輸出は域外輸出ではありません。地域の利用／域外輸出の帯やWorld比を作りません。</p><a href="${esc(ref.sourceUrl)}#page=${ref.pdfPage}">AFSIS ACO No.33 · 印刷p.${ref.printedPage}／PDF p.${ref.pdfPage}</a></details>`;
}
export function renderSoutheastAgroColumns(id:string,country=''){
 if(country){
  if(!packet.countryCodes.includes(country))return '<p>東南アジアの対象11か国から選んでください。</p>';
  const flow=(id==='rice-production')?packet.riceBalances[country as keyof typeof packet.riceBalances]:undefined;
  if(flow)return `<p class="agro-flow-period">${esc(flow.countryName)}全国 · 2024/25販売年度 · 米（精米換算）</p><div class="agro-columns"><section data-agro-stage="production">${renderAgroMarketingProduction(flow)}</section><section data-agro-stage="use">${renderAgroMarketingUse(flow)}<p>この輸出は域内相手も含む全外国向けです。</p></section><section data-agro-stage="destinations"><h3>③ 輸出先の量と構成比</h3><p>①②と同じ販売年度・精米換算の全相手数量は未収録です。</p>${tradeReferences(id,country)}</section></div>${riceDetails(country)}`;
  return renderAgroColumns(data,country,id)+ (tradeReferences(id,country)||'')+forestryNote(id);
 }
 const riceReference=renderSoutheastAfsisSupplyReference(id)+(id==='rice-production'?`<details class="southeast-agro-reference"><summary>別期間の国別需給：精米・2024/25販売年度</summary><p>統計対象国を選ぶと、ミャンマー・タイ・ベトナム・インドネシア・フィリピンの同表生産／世界比・国内利用・輸出・在庫を確認できます。各国の輸出には域内向けを含み、5か国を地域全体へ合算しません。</p></details>`:'');
 return `<p class="agro-flow-period">地理的な東南アジア11か国（東ティモールを含む） · ${esc(southeastAgroLabel(id))}</p><div class="agro-columns"><section data-agro-stage="production">${production(id)}</section><section data-agro-stage="use"><h3>② 域内利用と域外輸出</h3><p>11か国の同年・同製品の用途・在庫と域内移動を照合できていません。域内利用量と地域外輸出量は未収録です。</p><p>生産−輸出を消費とは呼びません。輸入・再輸出・在庫・飼料・加工は独立した要素として扱います。</p>${riceReference}</section><section data-agro-stage="destinations"><h3>③ 域外輸出先の量と構成比</h3><p>11か国の地域外全相手行列は未収録です。国別の対世界輸出の合計を地域外貿易にしません。</p>${tradeReferences(id)}</section></div>${forestryNote(id)}`;
}
