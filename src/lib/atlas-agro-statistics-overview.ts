/** Published PR #350 overview retained from main 5b62dea809fc7366af13bc07f1f1a1acbb8cda2a.
 * Unselected-product behavior is on hold; selected flows live in atlas-agro-statistics.ts. */
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
 return `<h3>世界生産・シェア推移</h3><p class="agro-meta">${year}暦年 · ${agroEscape(series.label)} · ${agroEscape(unit)} · 国／同年World</p><p>${agroEscape(series.definition)}</p>${countryCode==='RUS'&&series.domain==='QCL'?russiaPolicy:''}${donut}<p>${share===null?rawRow&&!agroPrimaryAllowed(countryCode,series,rawRow)?'保存原値はありますが、公式値限定方針により当年の主図へ採用しません。':'同年の分子または世界分母は未収録です。':`世界生産比 <strong>${percent(share)}</strong>。${agroEscape(country.name)} ${agroNumber(row!.value)} ／ World ${agroNumber(row!.worldValue)} ${agroEscape(unit)}。`}</p>${trend(series,countryCode)}${ranking}<a href="${agroEscape(series.sourceUrl)}">出典：FAOSTAT ${agroEscape(series.domain)}</a>`;
}
export type AgroReference={label:string;value:number|null;unit:string;year:number;sourceUrl:string;definition:string};
export function renderAgroOverviewColumns(data:AgroData,countryCode:string,seriesId:string,year=2024,reference?:AgroReference){
 const referenceMarkup=reference?`<p>${reference.year}年 · ${agroEscape(reference.label)}：<strong>${agroNumber(reference.value)} ${agroEscape(reference.unit)}</strong>。</p><p>${agroEscape(reference.definition)}</p><a href="${agroEscape(reference.sourceUrl)}">全国生産の原表</a>`:'';
 if(!countryCode)return `<div class="agro-columns"><section><h3>地域の供給と仕向け</h3><div data-agro-existing-supply></div><p>同年・同製品・同単位の地域集計原表、地域外輸入・輸出・在庫・用途の対応行は未収録です。国の統計を地域全体に流用しません。</p></section><section data-agro-trade-column><h3>地域外の輸出先・輸入元</h3><div data-agro-existing-trade></div><p>対象国集合と域内／域外を区別する完全な相手国行列は未収録です。域内取引を合算して円の分母にしません。</p></section><section><h3>地域の世界生産と推移</h3><p>同定義の地域集計とWorld対応行は未収録です。丸太・製材・パルプを別製品として扱い、森林面積や貿易額から生産量・自給率を推定しません。</p></section></div>`;
 const country=data.countries[countryCode],series=country?.series.find(s=>s.id===seriesId&&agroProduction(s));
 if(!country||!series)return `<div class="agro-columns"><section><h3>供給と仕向け</h3><div data-agro-existing-supply></div>${referenceMarkup}<p>共通FAOSTAT資料に選択品目の同年・同単位の需給原表は未収録です。地図や飼養頭数から肉・乳の量を推定しません。</p></section><section data-agro-trade-column><h3>輸出先・輸入元</h3><div data-agro-existing-trade></div><p>同じ国・品目の相手国別数量と分母は未収録です。</p></section><section><h3>世界生産・推移・順位</h3><p>共通FAOSTAT資料にこの選択と一致する国・World対応行は未収録です。別品目の世界比で代用しません。</p></section></div>`;
 const rawRow=series.rows.find(row=>row.year===year),row=agroPrimaryAllowed(countryCode,series,rawRow)?rawRow:undefined,unit=agroUnit(series.unit);
 const match=(element:string)=>{const found=country.series.find(s=>s.domain===series.domain&&s.item===series.item&&s.unit===series.unit&&s.element===element),candidate=found?.rows.find(row=>row.year===year);return found&&agroPrimaryAllowed(countryCode,found,candidate)?candidate:undefined;};
 const imports=match('5616'),exports=match('5916');
 const supply=rawRow&&!agroPrimaryAllowed(countryCode,series,rawRow)?'<p>当年の国内生産は保存原値を保有していますが、公式値限定方針で主図へ非採用です。供給構成帯を算出しません。</p>':row&&agroValid(row.value)&&imports&&agroValid(imports.value)?agroBand('供給元（在庫を含まない）',[{label:'国内生産',value:row.value},{label:'輸入',value:imports.value}],unit):`<p>国内生産：<strong>${agroNumber(row?.value??null)} ${agroEscape(unit)}</strong>（${tag(row)}）。輸入・在庫の対応行が足りないため、供給構成比は未算出です。</p>`;
 return `<div class="agro-columns" data-agro-country="${agroEscape(countryCode)}" data-agro-series="${agroEscape(seriesId)}"><section><h3>供給と仕向け</h3><div data-agro-existing-supply></div><p class="agro-meta">${year}暦年 · ${agroEscape(country.name)}全国 · ${agroEscape(series.label)} · ${agroEscape(unit)}</p>${referenceMarkup}${countryCode==='RUS'&&series.domain==='QCL'?russiaPolicy:''}${supply}${exports&&agroValid(exports.value)?`<p>公表輸出：<strong>${agroNumber(exports.value)} ${agroEscape(unit)}</strong>（${tag(exports)}）。</p>`:''}<p>国内用途・期首／期末在庫・在庫変動・損耗の対応行は未収録です。国内仕向けの帯や実消費は算出しません。輸出は国産分だけを追跡した量ではありません。</p><a href="${agroEscape(series.sourceUrl)}">出典：FAOSTAT ${agroEscape(series.domain)}</a></section><section data-agro-trade-column><h3>輸出先・輸入元</h3><div data-agro-existing-trade></div><p>この国・品目の同年・同単位による完全な相手国数量行列は未収録です。円の分母と割合を算出しません。</p><p>生産量・対世界輸出量から相手国や輸出先での用途を推定できません。加工品は原料とは別系列です。</p><a href="https://www.fao.org/faostat/en/#data/TM">必要資料：詳細貿易行列</a></section><section>${renderAgroWorld(data,countryCode,series,year)}</section></div><details class="agro-definitions"><summary>年別の原値・分母・品目定義・資料記号</summary><p>${agroEscape(series.definition)} 生産比は自給率ではありません。年次間の欠測を補間せず、公表0と区別します。</p><p>domain ${agroEscape(series.domain)} / item ${agroEscape(series.item)} / element ${agroEscape(series.element)} / unit ${agroEscape(series.unit)}。丸太・製材・パルプ、籾米・精米、飼養数・肉・乳を合算しません。</p><div class="agro-table-scroll"><table><caption>${agroEscape(country.name+'・'+series.label)}</caption><thead><tr><th>年</th><th>原値（${agroEscape(unit)}）</th><th>World</th><th>世界比</th><th>区分 国／世界</th></tr></thead><tbody>${series.rows.map(r=>`<tr><th scope="row">${r.year}</th><td>${agroEscape(r.rawValue??'未収録')}</td><td>${agroEscape(r.worldRawValue??agroNumber(r.worldValue))}</td><td>${agroShare(r)===null?'未収録':percent(agroShare(r)!)}</td><td>${tag(r)} ／ ${agroEscape(r.worldFlag??'未収録')}${agroPrimaryAllowed(countryCode,series,r)?'':' · 主図・推移・順位の対象外'}${r.note?'<small>'+agroEscape(r.note)+'</small>':''}</td></tr>`).join('')}</tbody></table></div><p>${agroEscape(data.method)}</p></details>`;
}

/** Map topics remain unchanged. Combined livestock topics expose products as
 * supplemental national series, never a conversion from density or headcount. */
export function agroTopicSeries(topic:string):string[]{
 const aliases:Record<string,string[]>={bana:['banana-production'],banana:['banana-production'],maiz:['maize-production'],soyb:['soybean-production'],whea:['wheat-production'],sugc:['qcl-156-production'],pota:['potato-production'],coff:['coffee-production'],cott:['qcl-328-production'],corn:['maize-production'],cotton:['qcl-328-production'],sugarcane:['qcl-156-production'],rubber:['qcl-836-production'],oilpalm:['qcl-254-production'],chickpea:['qcl-191-production'],lentil:['qcl-201-production'],pearlmillet:['qcl-79-production'],buffalo:['buffalo-milk'],canola:['rapeseed-production'],cattle:['cattle-meat','cattle-milk'],beef:['cattle-meat'],dairy:['cattle-milk'],pig:['pig-meat'],pork:['pig-meat'],chicken:['chicken-meat','chicken-eggs'],broiler:['chicken-meat'],eggs:['chicken-eggs'],sheep:['sheep-meat'],forest:['roundwood-production','sawnwood-production'],forestry:['roundwood-production','sawnwood-production'],treecover:['roundwood-production','sawnwood-production'],arabica:['coffee-production'],robusta:['coffee-production']};
 return aliases[topic]??[`${topic}-production`];
}
