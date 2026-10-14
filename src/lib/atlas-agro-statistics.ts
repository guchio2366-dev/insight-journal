import {agroMarketingYearFlow} from '../data/atlas/agro-marketing-year-flow.ts';
import {agroEastQuantityFlow} from '../data/atlas/agro-east-quantity-flow.ts';
/** Country observations retain their product, element, unit and publisher World
 * denominator. Missing observations never become zero or another year's value. */
export type AgroRow={year:number;value:number|null;rawValue:string|null;flag:string;note?:string|null;worldValue:number|null;worldRawValue?:string|null;worldFlag:string|null;share:number|null};
export type AgroSeries={id:string;label:string;domain:string;item:string;element:string;unit:string;definition:string;sourceUrl:string;rows:AgroRow[]};
export type AgroData={countries:Record<string,{name:string;series:AgroSeries[]}>;sources:{path:string;sha256:string}[];method:string};
export const agroEscape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const agroNumber=(value:number|null)=>value===null?'未収録':value.toLocaleString('ja-JP',{maximumFractionDigits:2});
export const agroUnit=(unit:string)=>({m3:'m³',An:'頭','1000 An':'千羽','1000 ha':'千ha'}[unit]??unit);
const flags:Record<string,string>={A:'公的報告',E:'推計',I:'補完',X:'外部機関',M:'欠測',L:'欠測'};
const tag=(row:AgroRow|undefined)=>row?`${agroEscape(row.flag)}：${flags[row.flag]??'原資料区分'}`:'未収録';
export function agroValid(value:number|null|undefined):value is number{return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
export function agroShare(row:AgroRow|undefined):number|null{return row&&agroValid(row.value)&&agroValid(row.worldValue)&&row.worldValue>0?row.value/row.worldValue*100:null;}
export function agroProduction(series:AgroSeries){return ['5510','5516'].includes(series.element);}
/** Russia's existing QCL comparison accepts official country/World rows only.
 * FO/RL external-organization X rows retain their separate forestry policy. */
export function agroPrimaryAllowed(countryCode:string,series:AgroSeries,row:AgroRow|undefined){
 return !!row&&(countryCode!=='RUS'||series.domain!=='QCL'||row.flag==='A'&&row.worldFlag==='A');
}
const russiaPolicy='<p class="agro-quality-policy">ロシアのQCLは既存の公式値限定方針を維持し、国・WorldともAの行だけを主図・推移・順位へ採用します。2023・2024年の非公式値（X）等は主図から除外し、原値詳細に残します。FO/RLの外部機関値Xとは区別します。</p>';

/** Rankings are only among retained, matching observations; aggregates never
 * enter the country collection. Ties share a rank, independent of display order. */
export function agroRanking(data:AgroData,series:AgroSeries,year:number){
 const reference=series.rows.find(row=>row.year===year)?.worldValue;
 return Object.entries(data.countries).flatMap(([code,country])=>{
  const match=country.series.find(s=>s.domain===series.domain&&s.item===series.item&&s.element===series.element&&s.unit===series.unit);
  const row=match?.rows.find(row=>row.year===year);
  return row&&agroPrimaryAllowed(code,match!,row)&&agroValid(row.value)&&row.worldValue===reference?[{code,name:country.name,value:row.value,flag:row.flag}]:[];
 }).sort((a,b)=>b.value-a.value||a.code.localeCompare(b.code)).map((row,index,all)=>({...row,rank:1+all.filter(other=>other.value>row.value).length}));
}
const percent=(value:number)=>value>0&&value<.01?'0.01%未満':`${value.toLocaleString('ja-JP',{maximumFractionDigits:2})}%`;
const colors=['#3d7666','#b98046','#7b8ca7','#9c6b8c'];
export function agroBand(label:string,parts:{label:string;value:number}[],unit:string){
 if(!parts.length||parts.some(part=>!agroValid(part.value)))return '';
 const total=parts.reduce((sum,part)=>sum+part.value,0);
 const key=parts.map((part,i)=>`<li><i style="background:${colors[i%colors.length]}" aria-hidden="true"></i>${agroEscape(part.label)} <strong>${agroNumber(part.value)} ${agroEscape(unit)}${total>0?' · '+percent(part.value/total*100):''}</strong></li>`).join('');
 return `<figure class="agro-band"><figcaption>${agroEscape(label)} · ${agroNumber(total)} ${agroEscape(unit)}</figcaption>${total>0?`<div class="agro-track" role="img" aria-label="${agroEscape(label+'：'+parts.map(part=>part.label+' '+part.value+' '+unit).join('、'))}">${parts.map((part,i)=>`<span style="width:${part.value/total*100}%;background:${colors[i%colors.length]}"></span>`).join('')}</div>`:'<p>公表合計は0。構成比を算出しません。</p>'}<ul class="agro-key">${key}</ul></figure>`;
}
function trend(series:AgroSeries,countryCode:string){
 const rows=series.rows.map(row=>agroPrimaryAllowed(countryCode,series,row)?row:{...row,value:null,share:null}).sort((a,b)=>a.year-b.year);
 const valid=rows.filter(row=>agroShare(row)!==null);
 if(valid.length<2)return '<p>複数年の同定義の国・世界対応行は未収録です。単年値を推移にしません。</p>';
 const first=rows[0].year,last=rows.at(-1)!.year,max=Math.max(1,...valid.map(row=>agroShare(row)!))*1.15;
 const x=(year:number)=>45+(year-first)/(last-first)*240,y=(value:number)=>120-value/max*90;
 let paths:string[]=[],segment:string[]=[];let previous:number|undefined;
 const flush=()=>{if(segment.length>1)paths.push(`<polyline points="${segment.join(' ')}"/>`);segment=[];};
 for(const row of rows){const share=agroShare(row);if(share===null||previous!==undefined&&row.year!==previous+1)flush();if(share!==null)segment.push(`${x(row.year)},${y(share)}`);previous=row.year;}flush();
 return `<p class="agro-trend-scale">縦軸：0–${percent(max)}</p><svg class="agro-trend" viewBox="0 0 310 160" role="img" aria-label="${agroEscape(series.label)}の世界生産比推移。${first}–${last}年。欠測年では線を切り、年別値を表で示します。"><line x1="45" x2="285" y1="120" y2="120"/>${paths.join('')}${valid.map(row=>`<circle cx="${x(row.year)}" cy="${y(agroShare(row)!)}" r="3"><title>${row.year}年 ${percent(agroShare(row)!)}</title></circle>`).join('')}</svg><p class="agro-trend-years"><span>${first}年</span><span>${last}年</span></p>`;
}
export function renderAgroWorld(data:AgroData,countryCode:string,series:AgroSeries,year=2024){
 const country=data.countries[countryCode],rawRow=series.rows.find(row=>row.year===year),row=agroPrimaryAllowed(countryCode,series,rawRow)?rawRow:undefined,unit=agroUnit(series.unit),share=agroShare(row);
 if(!country)return '<p>国・World対応行は未収録です。</p>';
 const ranks=agroRanking(data,series,year),shown=ranks.slice(0,5),selected=ranks.find(entry=>entry.code===countryCode);
 if(selected&&!shown.includes(selected))shown.push(selected);
 const ranking=ranks.length?`<details class="agro-ranking"><summary>${year}年の生産順位（収録${ranks.length}国・地域中）</summary><p>同年・同品目・要素・単位・World分母の有効行のみ。全世界の網羅順位ではありません。上位5対象と選択国を示します。</p><table><thead><tr><th>順位・国</th><th>${agroEscape(unit)}</th><th>原区分</th></tr></thead><tbody>${shown.map(entry=>`<tr><th scope="row">${entry.rank}. ${agroEscape(entry.name)}</th><td>${agroNumber(entry.value)}</td><td>${agroEscape(entry.flag)}</td></tr>`).join('')}</tbody></table></details>`:'<p>同じ定義の他国原表がなく、生産順位は未算出です。</p>';
 const donut=share!==null&&share>=0&&share<=100?`<div class="agro-world-pie" role="img" aria-label="${agroEscape(country.name)} ${percent(share)}、世界の残り ${percent(100-share)}。分母は同年World生産量" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${percent(share)}</span></div>`:'';
 return `<h3>① 生産量と世界シェア</h3><p class="agro-meta">${year}暦年 · ${agroEscape(series.label)} · ${agroEscape(unit)}</p><p>国内生産：<strong>${agroNumber(row?.value??null)} ${agroEscape(unit)}</strong></p>${countryCode==='RUS'&&series.domain==='QCL'?russiaPolicy:''}${donut}<p>${share===null?rawRow&&!agroPrimaryAllowed(countryCode,series,rawRow)?'保存原値はありますが、公式値限定方針により当年の主図へ採用しません。':'同年の分子または世界分母は未収録です。':`世界生産比 <strong>${percent(share)}</strong>。World ${agroNumber(row!.worldValue)} ${agroEscape(unit)}。`}</p><details class="agro-production-context"><summary>生産シェアの推移・順位・定義</summary><p>${agroEscape(series.definition)}</p>${trend(series,countryCode)}${ranking}</details><a href="${agroEscape(series.sourceUrl)}">出典：FAOSTAT ${agroEscape(series.domain)}</a>`;
}
export type AgroReference={label:string;value:number|null;unit:string;year:number;sourceUrl:string;definition:string};
type MarketingFlow={countryCode:string;countryName:string;seriesId:string;label:string;year:string;unit:string;production:number;imports:number;exports:number;domesticUse:number;beginningStocks:number;endingStocks:number;worldProduction:number;lossAdjustment?:number;notes:string[];source:{url:string;page:number;worldPage?:number;sha256:string;path:string};rawLine:string};
export function renderAgroMarketingProduction(flow:MarketingFlow){
 const share=flow.production/flow.worldProduction*100;
 return `<h3>① 生産量と世界シェア</h3><p class="agro-meta">${agroEscape(flow.year)}販売年度 · ${agroEscape(flow.label)} · ${agroEscape(flow.unit)}</p><p>国内生産：<strong>${agroNumber(flow.production)} ${agroEscape(flow.unit)}</strong></p><div class="agro-world-pie" role="img" aria-label="世界生産量に占める${agroEscape(flow.countryName)}の割合 ${percent(share)}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${percent(share)}</span></div><p>世界シェア <strong>${percent(share)}</strong> · 公表World ${agroNumber(flow.worldProduction)} ${agroEscape(flow.unit)}</p><p class="agro-meta">②と同じWASDE-675・販売年度・製品数量。</p>`;
}
export function renderAgroMarketingUse(flow:MarketingFlow){
 const ratio=flow.production>0?flow.exports/flow.production*100:null;
 return `<h3>② 国内利用と輸出</h3><p class="agro-meta">${agroEscape(flow.year)}販売年度 · ${agroEscape(flow.unit)}</p><p>輸出量 <strong>${agroNumber(flow.exports)} ${agroEscape(flow.unit)}</strong>${ratio===null?'':` · 生産量との比 <strong>${percent(ratio)}</strong>`}</p>${agroBand('年度供給全体の仕向け（輸入・持越在庫込み）',[{label:'国内利用',value:flow.domesticUse},{label:'輸出',value:flow.exports},{label:'期末在庫',value:flow.endingStocks}],flow.unit)}${flow.lossAdjustment!==undefined?`<p class="agro-meta">原表の未勘定 ${agroNumber(flow.lossAdjustment)} ${agroEscape(flow.unit)}。符号を保持し、帯の用途へ加算しません。</p>`:''}<p class="agro-meta">輸入 ${agroNumber(flow.imports)}、期首在庫 ${agroNumber(flow.beginningStocks)} ${agroEscape(flow.unit)}。国内利用は食用だけではありません。国産分の国内利用・輸出を追跡した比率ではありません。</p>`;
}
function marketingDetails(flow:MarketingFlow){
 return `<details class="agro-definitions"><summary>数量の定義・期間・原表</summary>${flow.notes.map(note=>'<p>'+agroEscape(note)+'</p>').join('')}<p>WASDE-675 p.${flow.source.page}。販売年度は国により期首が異なります。元の丸め差を保持し、架空の用途で収支を合わせません。</p><p>生産 ${agroNumber(flow.production)}＋輸入 ${agroNumber(flow.imports)}＋期首在庫 ${agroNumber(flow.beginningStocks)}／国内利用 ${agroNumber(flow.domesticUse)}＋輸出 ${agroNumber(flow.exports)}＋期末在庫 ${agroNumber(flow.endingStocks)} ${agroEscape(flow.unit)}。</p><pre>${agroEscape(flow.rawLine)}</pre><p>保存原文：${agroEscape(flow.source.path)} · SHA-256 ${agroEscape(flow.source.sha256)}</p><a href="${agroEscape(flow.source.url)}#page=${flow.source.page}">USDA WASDE-675原表</a></details>`;
}
type EastQuantityFlow={countryCode:string;countryName:string;seriesId:string;label:string;year:number;unit:string;production:number;worldProduction:number;imports:number;exports:number;partners:{code:string;name:string;value:number}[];partnerRoundingGap:number;source:{productionUrl:string;importUrl:string;exportUrl:string};notes:string[]};
const quantity=(value:number)=>value.toLocaleString('ja-JP',{maximumFractionDigits:3});
function renderQuantityDestinations(flow:EastQuantityFlow){
 const all=[...flow.partners].sort((a,b)=>b.value-a.value||a.code.localeCompare(b.code)),parts=all.slice(0,5);
 if(all.length>5)parts.push({code:'other-returned',name:'その他の収録相手',value:all.slice(5).reduce((sum,row)=>sum+row.value,0)});
 const palette=['#3d7666','#b98046','#7b8ca7','#9c6b8c','#8a9857','#b2b8ad'];let offset=0;
 const stops=parts.map((part,index)=>{const start=offset;offset+=part.value/flow.exports*100;return `${palette[index]} ${start}% ${offset}%`;});
 return `<h3>③ 輸出先の量と構成比</h3><p class="agro-meta">${flow.year}暦年 · ${agroEscape(flow.label)} · ${agroEscape(flow.unit)}</p><div class="agro-partner-pie" role="img" aria-label="${agroEscape(parts.map(row=>row.name+' '+percent(row.value/flow.exports*100)).join('、'))}" style="background:conic-gradient(${stops.join(',')})"></div><ul class="agro-key">${parts.map((part,index)=>`<li><i style="background:${palette[index]}" aria-hidden="true"></i>${agroEscape(part.name)} <strong>${quantity(part.value)} ${agroEscape(flow.unit)} · ${percent(part.value/flow.exports*100)}</strong></li>`).join('')}</ul><p class="agro-meta">分母は②と同じ世界向け総輸出 ${quantity(flow.exports)} ${agroEscape(flow.unit)}。選択国以外の全相手を含み、地域内の相手を除外しません。</p><details class="agro-definitions"><summary>全${all.length}相手の数量・丸め差</summary><p>相手行合計−公表World輸出：${quantity(flow.partnerRoundingGap)} ${agroEscape(flow.unit)}。原表の丸め差をその他へ押し込みません。相手は通関上の仕向け先で、最終消費地とは限りません。</p><table><thead><tr><th>相手</th><th>${agroEscape(flow.unit)}</th><th>構成比</th></tr></thead><tbody>${all.map(part=>`<tr><th scope="row">${agroEscape(part.name)}</th><td>${quantity(part.value)}</td><td>${percent(part.value/flow.exports*100)}</td></tr>`).join('')}</tbody></table></details><a href="${agroEscape(flow.source.exportUrl)}">World Bank WITS / UN Comtrade：相手国数量</a>`;
}
function renderEastQuantityColumns(data:AgroData,flow:EastQuantityFlow){
 const series=data.countries[flow.countryCode]?.series.find(s=>s.id===flow.seriesId),row=series?.rows.find(row=>row.year===flow.year);
 if(!series||row?.value!==flow.production||row.worldValue!==flow.worldProduction)throw Error('生産・世界原値の版が一致しません');
 const apparent=flow.production+flow.imports-flow.exports;
 if(apparent<0||flow.exports<=0)throw Error('見掛量・輸出分母を確認できません');
 return `<p class="agro-flow-period">${agroEscape(flow.countryName)}全国 · ${flow.year}暦年 · ${agroEscape(flow.label)} · ${agroEscape(flow.unit)}</p><div class="agro-columns" data-agro-country="${agroEscape(flow.countryCode)}" data-agro-series="${agroEscape(flow.seriesId)}" data-agro-quantity-flow="${flow.year}"><section data-agro-stage="production">${renderAgroWorld(data,flow.countryCode,series,flow.year)}</section><section data-agro-stage="use"><h3>② 国内の見掛消費と輸出</h3><p>輸出量 <strong>${quantity(flow.exports)} ${agroEscape(flow.unit)}</strong> · 生産量との比 <strong>${percent(flow.exports/flow.production*100)}</strong></p>${agroBand('輸入込み・在庫未調整の数量比較',[{label:'国内見掛消費',value:apparent},{label:'輸出',value:flow.exports}],flow.unit)}<p class="agro-meta">見掛消費＝生産＋輸入−輸出。輸入 ${quantity(flow.imports)} ${agroEscape(flow.unit)}。実消費・国産分の国内仕向けではありません。輸出／生産も国産分を二分した割合ではありません。</p><a href="${agroEscape(flow.source.importUrl)}">WITS：同年・同品目の輸入数量</a></section><section data-agro-stage="destinations" data-agro-trade-column>${renderQuantityDestinations(flow)}</section></div><details class="agro-definitions"><summary>製品・原表・数量比較の定義</summary>${flow.notes.map(note=>'<p>'+agroEscape(note)+'</p>').join('')}<p>搾油後の油・粕は別製品です。kgからtへは原重量を1,000で割り、籾・精米や加工歩留まりの換算はしません。在庫変動・損耗・用途の内訳は未調整です。</p><a href="${agroEscape(flow.source.productionUrl)}">FAOSTAT QCL：同年の生産量</a></details>`;
}
/** A stockless apparent-use balance includes imports. It does not trace the
 * domestic harvest, and its export/production ratio is not an allocation share. */
export function agroDisposition(data:AgroData,countryCode:string,series:AgroSeries,year:number){
 const country=data.countries[countryCode];
 const match=(element:string)=>{const found=country?.series.find(s=>s.domain===series.domain&&s.item===series.item&&s.unit===series.unit&&s.element===element),row=found?.rows.find(r=>r.year===year);return found&&agroPrimaryAllowed(countryCode,found,row)&&agroValid(row?.value)?row!.value:null;};
 const primary=series.rows.find(r=>r.year===year),production=agroPrimaryAllowed(countryCode,series,primary)&&agroValid(primary?.value)?primary!.value:null;
 const imports=match('5616'),exports=match('5916');
 const apparent=series.domain==='FO'&&production!==null&&imports!==null&&exports!==null?production+imports-exports:null;
 return {production,imports,exports,apparent:apparent!==null&&apparent>=0?apparent:null,exportProductionRatio:production!==null&&production>0&&exports!==null?exports/production*100:null};
}
export function renderAgroColumns(data:AgroData,countryCode:string,seriesId:string,year=2024,reference?:AgroReference){
 const country=data.countries[countryCode],series=country?.series.find(s=>s.id===seriesId&&agroProduction(s));
 const quantityFlow=agroEastQuantityFlow(countryCode,seriesId);
 if(quantityFlow&&(year===2024||year===quantityFlow.year))return renderEastQuantityColumns(data,quantityFlow);
 const flowPacket=agroMarketingYearFlow(countryCode,seriesId);
 if(flowPacket&&year===2024){const flow={...flowPacket,countryName:country?.name??flowPacket.countryName};return `<p class="agro-flow-period">${agroEscape(flow.countryName)}全国 · ${agroEscape(flow.year)}販売年度 · ${agroEscape(flow.label)} · ${agroEscape(flow.unit)}</p><div class="agro-columns" data-agro-country="${agroEscape(countryCode)}" data-agro-series="${agroEscape(seriesId)}" data-agro-marketing-year="${agroEscape(flow.year)}"><section data-agro-stage="production">${renderAgroMarketingProduction(flow)}</section><section data-agro-stage="use">${renderAgroMarketingUse(flow)}<details class="agro-other-reference"><summary>保存済みの別範囲・用途参考</summary><div data-agro-existing-supply></div></details></section><section data-agro-stage="destinations" data-agro-trade-column><h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap" data-agro-partner-gap>同じ販売年度・原穀の相手国数量は未収録です。</p><details class="agro-other-reference"><summary>年・単位・範囲が異なる貿易参考</summary><div data-agro-existing-trade></div></details></section></div>${marketingDetails(flow)}`;}
 if(!countryCode||!country||!series)return `<p class="agro-flow-gap">${countryCode?'選択品目':'地域全体'}の数量フローは、同年・同製品の生産／国内使用／域外輸出／相手国数量の原表が揃っていません。</p><details><summary>保存済みの別範囲参考</summary><div data-agro-existing-supply></div><div data-agro-existing-trade></div>${reference?`<p>${reference.year}年 · ${agroEscape(reference.label)}：${agroNumber(reference.value)} ${agroEscape(reference.unit)}。${agroEscape(reference.definition)}</p>`:''}</details>`;
 const rawRow=series.rows.find(row=>row.year===year),row=agroPrimaryAllowed(countryCode,series,rawRow)?rawRow:undefined,unit=agroUnit(series.unit);
 const flow=agroDisposition(data,countryCode,series,year);
 const balance=flow.apparent!==null?`${agroBand('国内見掛消費と輸出（輸入込み・在庫未調整）',[{label:'国内見掛消費',value:flow.apparent},{label:'輸出',value:flow.exports!}],unit)}<p class="agro-meta">見掛消費＝生産＋輸入−輸出。輸入 ${agroNumber(flow.imports)} ${agroEscape(unit)}。実消費・国産分の国内仕向けではありません。</p>`:'<p class="agro-flow-gap">国内使用と輸出の同年数量原表を照合できていません。</p>';
 const exportReading=flow.exports!==null?`<p>輸出量：<strong>${agroNumber(flow.exports)} ${agroEscape(unit)}</strong>${flow.exportProductionRatio===null?'':` · 生産量との比 <strong>${percent(flow.exportProductionRatio)}</strong>`}</p><p class="agro-meta">輸出には輸入材の再輸出を含み得ます。生産量を国内・輸出へ二分した比率ではありません。用途・在庫変動は未調整です。</p>`:'';
 return `<p class="agro-flow-period">${agroEscape(country.name)}全国 · ${year}暦年 · ${agroEscape(series.label)} · ${agroEscape(unit)}</p><div class="agro-columns" data-agro-country="${agroEscape(countryCode)}" data-agro-series="${agroEscape(seriesId)}"><section data-agro-stage="production">${renderAgroWorld(data,countryCode,series,year)}</section><section data-agro-stage="use"><h3>② 国内での使用と輸出</h3>${balance}${exportReading}<details class="agro-other-reference"><summary>保存済みの別範囲・用途参考</summary><div data-agro-existing-supply></div></details></section><section data-agro-stage="destinations" data-agro-trade-column><h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap" data-agro-partner-gap>同年・同製品の輸出先数量は未収録です。</p><details class="agro-other-reference"><summary>年・単位・範囲が異なる貿易参考</summary><div data-agro-existing-trade></div></details></section></div><details class="agro-definitions"><summary>年別の原値・分母・品目定義・資料記号</summary><p>${agroEscape(series.definition)} 生産比は自給率ではありません。年次間の欠測を補間せず、公表0と区別します。</p><p>domain ${agroEscape(series.domain)} / item ${agroEscape(series.item)} / element ${agroEscape(series.element)} / unit ${agroEscape(series.unit)}。丸太・製材・パルプ、籾米・精米、飼養数・肉・乳を合算しません。</p><div class="agro-table-scroll"><table><caption>${agroEscape(country.name+'・'+series.label)}</caption><thead><tr><th>年</th><th>原値（${agroEscape(unit)}）</th><th>World</th><th>世界比</th><th>区分 国／世界</th></tr></thead><tbody>${series.rows.map(r=>`<tr><th scope="row">${r.year}</th><td>${agroEscape(r.rawValue??'未収録')}</td><td>${agroEscape(r.worldRawValue??agroNumber(r.worldValue))}</td><td>${agroShare(r)===null?'未収録':percent(agroShare(r)!)}</td><td>${tag(r)} ／ ${agroEscape(r.worldFlag??'未収録')}${agroPrimaryAllowed(countryCode,series,r)?'':' · 主図・推移・順位の対象外'}${r.note?'<small>'+agroEscape(r.note)+'</small>':''}</td></tr>`).join('')}</tbody></table></div><p>${agroEscape(data.method)}</p></details>`;
}

/** Map topics remain unchanged. Combined livestock topics expose products as
 * supplemental national series, never a conversion from density or headcount. */
export function agroTopicSeries(topic:string):string[]{
 const aliases:Record<string,string[]>={bana:['banana-production'],banana:['banana-production'],maiz:['maize-production'],soyb:['soybean-production'],whea:['wheat-production'],sugc:['qcl-156-production'],pota:['potato-production'],coff:['coffee-production'],cott:['qcl-328-production'],corn:['maize-production'],cotton:['qcl-328-production'],sugarcane:['qcl-156-production'],rubber:['qcl-836-production'],oilpalm:['qcl-254-production'],chickpea:['qcl-191-production'],lentil:['qcl-201-production'],pearlmillet:['qcl-79-production'],buffalo:['buffalo-milk'],canola:['rapeseed-production'],cattle:['cattle-meat','cattle-milk'],beef:['cattle-meat'],dairy:['cattle-milk'],pig:['pig-meat'],pork:['pig-meat'],chicken:['chicken-meat','chicken-eggs'],broiler:['chicken-meat'],eggs:['chicken-eggs'],sheep:['sheep-meat'],forest:['roundwood-production','sawnwood-production'],forestry:['roundwood-production','sawnwood-production'],treecover:['roundwood-production','sawnwood-production'],arabica:['coffee-production'],robusta:['coffee-production']};
 return aliases[topic]??[`${topic}-production`];
}
