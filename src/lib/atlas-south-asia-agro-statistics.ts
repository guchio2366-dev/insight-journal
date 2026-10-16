import {southAsiaAgroFlow,southAsiaAgroCountries,type SouthAsiaAgroFlow} from '../data/atlas/south-asia-agro-flow.ts';
import {agroEscape,agroNumber,agroProduction,agroUnit,agroValid,renderAgroColumns,renderAgroMarketingProduction,renderAgroMarketingUse,type AgroData} from './atlas-agro-statistics.ts';

/** Product labels only; no country's quantities stand in for the region. */
export function southAsiaAgroSeries(data:AgroData,allowed:string[]){
 return allowed.flatMap(id=>{
  const series=southAsiaAgroCountries.flatMap(code=>data.countries[code]?.series??[]).find(s=>s.id===id&&agroProduction(s));
  return series?[series]:[];
 });
}
export function southAsiaRegionalProduction(data:AgroData,id:string,year=2024){
 const template=southAsiaAgroSeries(data,[id])[0];
 const rows=southAsiaAgroCountries.map(code=>{
  const series=data.countries[code]?.series.find(s=>s.id===id&&agroProduction(s));
  const match=template&&series&&['domain','item','element','unit'].every(key=>series[key as keyof typeof series]===template[key as keyof typeof template]);
  const row=match?series.rows.find(row=>row.year===year):undefined;
  return{code,name:data.countries[code]?.name??code,value:agroValid(row?.value)?row!.value:null,flag:row?.flag??'M',world:row?.worldValue??null,rawValue:row?.rawValue??null};
 });
 const reported=rows.filter(row=>row.value!==null),worlds=[...new Set(reported.flatMap(row=>agroValid(row.world)&&row.world>0?[row.world]:[]))];
 const total=reported.length?reported.reduce((sum,row)=>sum+row.value!,0):null;
 const world=worlds.length===1&&reported.every(row=>row.world===worlds[0])?worlds[0]:null;
 return{template,rows,count:reported.length,total,world,share:total!==null&&world!==null?total/world*100:null};
}
function regionalColumns(data:AgroData,id:string,year:number){
 const {template,rows,count,total,world,share}=southAsiaRegionalProduction(data,id,year);
 const unit=template?agroUnit(template.unit):'',label=template?.label??'選択品目';
 const coverage=count===8?'対象8か国の収録値合計':`報告${count}/8か国の合計（地域完全値ではありません）`;
 const percent=share===null?'未算出':`${share.toLocaleString('ja-JP',{maximumFractionDigits:2})}%`;
 const pie=share!==null&&share>=0&&share<=100?`<div class="agro-world-pie" role="img" aria-label="${agroEscape(coverage)}の同年World比 ${percent}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${percent}</span></div>`:'';
 return `<p class="agro-flow-period">南アジア8か国 · ${year}暦年 · ${agroEscape(label)} · ${agroEscape(unit)}</p><div class="agro-columns" data-agro-country="" data-agro-series="${agroEscape(id)}" data-south-asia-regional-production><section data-agro-stage="production"><h3>① 生産量と世界シェア</h3><p>${coverage}：<strong>${agroNumber(total)} ${agroEscape(unit)}</strong></p>${pie}<p>同年World比：<strong>${percent}</strong>。World ${agroNumber(world)} ${agroEscape(unit)}。</p><p class="agro-meta">欠測を0にせず、同じ品目・年・要素・単位の有効行のみを合計します。比率は自給率ではありません。</p></section><section data-agro-stage="use"><h3>② 域内使用と域外輸出</h3><p class="agro-flow-gap">南アジア8か国の同年・同製品による使用・在庫と、域内取引を除いた輸出数量は未収録です。</p><p class="agro-meta">国別の全外国向け輸出を地域の域外輸出へ足し上げません。生産−輸出を域内消費とは呼びません。</p></section><section data-agro-stage="destinations"><h3>③ 域外輸出先の量と構成比</h3><p class="agro-flow-gap">域内8か国を相手から除いた同年・同製品の全相手数量と分母が未収録のため、輸出先の偏りは未算出です。</p></section></div><details class="agro-definitions"><summary>対象8か国・原値・資料記号と定義</summary><p>アフガニスタン、バングラデシュ、ブータン、インド、スリランカ、モルディブ、ネパール、パキスタン。既存の南アジアfocusと同じ国集合です。中央アジアやイランを加えません。</p><div class="agro-table-scroll"><table><caption>${year}年・${agroEscape(label)}・${agroEscape(unit)}</caption><thead><tr><th>国</th><th>生産量</th><th>原区分</th></tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${agroEscape(row.name)}</th><td>${agroEscape(row.rawValue??'未収録')}</td><td>${agroEscape(row.flag)}</td></tr>`).join('')}</tbody></table></div><p>A：公的報告、E：推計、I：補完、X：外部機関、M：欠測。欠測国と推計を含む資料範囲を保持します。World分母が欠測または不一致の時は比率を算出しません。</p><p>${agroEscape(template?.definition??'この品目の同定義生産行は未収録です。')}</p>${template?`<a href="${agroEscape(template.sourceUrl)}">FAOSTAT ${agroEscape(template.domain)}原資料</a>`:''}${['roundwood-production','sawnwood-production'].includes(id)?'<p>丸太・製材はm³、木材パルプはtの別工程です。合算・加工歩留まりによる換算はせず、パルプ数量は未収録です。</p>':''}</details>`;
}

const source=(flow:SouthAsiaAgroFlow)=>`<a href="${agroEscape(flow.source.url)}#page=${flow.source.page}">USDA WASDE-675 p.${flow.source.page}（2026-09公表版）</a>`;
function definitions(flow:SouthAsiaAgroFlow){
 return `<details class="agro-definitions"><summary>製品・販売年度・原値と丸め差</summary>${flow.notes.map(note=>`<p>${agroEscape(note)}</p>`).join('')}<p>供給：生産 ${agroNumber(flow.production)}＋輸入 ${agroNumber(flow.imports)}＋期首在庫 ${agroNumber(flow.beginningStocks)}。仕向け：国内利用 ${agroNumber(flow.domesticUse)}＋輸出 ${agroNumber(flow.exports)}＋期末在庫 ${agroNumber(flow.endingStocks)} ${agroEscape(flow.unit)}。</p><p>供給−仕向け：${agroNumber(flow.roundingGap)} ${agroEscape(flow.unit)}。原表の未勘定を除いた丸め差：${agroNumber(flow.balanceResidual)}。差を用途や輸出先へ割り当てません。</p>${flow.domesticFeed!==undefined?`<p>飼料 ${agroNumber(flow.domesticFeed)} ${agroEscape(flow.unit)}は国内利用の内数です。</p>`:''}<pre>${agroEscape(flow.rawLine)}\n${agroEscape(flow.worldRawLine)}</pre><p>保存原文：${agroEscape(flow.source.path)} · SHA-256 ${agroEscape(flow.source.sha256)}</p>${source(flow)}</details>`;
}

/** Integration hook for explicit national product selections only. The shared
 * controller must keep the existing overview renderer and its restore path.
 * Undefined means that the existing renderer owns this selection unchanged. */
export function renderSouthAsiaAgroColumns(data:AgroData,country:string,selectionSeriesId:string,year=2024):string|undefined {
 if(!country&&selectionSeriesId!=='overview')return southAsiaAgroSeries(data,[selectionSeriesId]).length?regionalColumns(data,selectionSeriesId,year):undefined;
 if(!(southAsiaAgroCountries as readonly string[]).includes(country))return;
 const flow=year===2024?southAsiaAgroFlow(country,selectionSeriesId):undefined;
 if(flow){
  const definition=flow.seriesId==='rice-milled-production'
   ?'精米換算。地図の稲作・FAOSTAT籾米とは別基準です。国内利用には原表の未報告消失も含まれ、食用・飼料・加工の内訳は未収録です。'
   :flow.seriesId==='cotton-lint-production'
   ?'綿繊維の数量です。国内利用は紡績投入。地図の栽培面積・種付き綿花生産・綿糸・織物の数量とは別工程です。'
   :'国内利用は原表Totalです。飼料はその内数で、食用だけの消費量ではありません。';
  return `<p class="agro-flow-period">${agroEscape(flow.countryName)}全国 · ${agroEscape(flow.year)}販売年度 · ${agroEscape(flow.label)} · ${agroEscape(flow.unit)}</p><p class="agro-meta" data-south-asia-flow-scope>全国の全外国向け輸出を比較します。南アジア内の貿易を含み得るため、地域全体の域外輸出量ではありません。</p><div class="agro-columns" data-agro-country="${agroEscape(country)}" data-agro-series="${agroEscape(selectionSeriesId)}" data-agro-marketing-year="${flow.year}" data-south-asia-product-basis="${agroEscape(flow.seriesId)}"><section data-agro-stage="production">${renderAgroMarketingProduction(flow)}${source(flow)}</section><section data-agro-stage="use">${renderAgroMarketingUse(flow)}<p class="agro-meta">${definition}</p><p class="agro-meta">原表0.00は丸め値です。厳密なゼロを意味しません。</p><details class="agro-other-reference"><summary>別期間・別製品の参考</summary><div data-agro-existing-supply></div></details></section><section data-agro-stage="destinations" data-agro-trade-column><h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap" data-agro-partner-gap>②と同じ販売年度・製品換算による全相手数量は未収録です。輸出先の偏りは未算出です。</p><details class="agro-other-reference"><summary>別期間・別製品の輸出先参考</summary><div data-agro-existing-trade></div></details></section></div>${definitions(flow)}`;
 }
 if(['roundwood-production','sawnwood-production'].includes(selectionSeriesId)){
  return renderAgroColumns(data,country,selectionSeriesId,year)+`<details class="agro-definitions" data-south-asia-forest-scope><summary>南アジアの林産物：工程・単位と貿易範囲</summary><p>丸太（燃料材を含む）と製材はそれぞれm³。加工前後を加算せず、製材歩留まりやパルプ投入量を逆算しません。木材パルプは重量tの別製品です。同年の生産・World・輸出入原値と相手表は未収録で、体積から換算しません。</p><p>ここでの輸出は選択国の全外国向けです。南アジア内の相手を除いた地域域外輸出ではありません。見掛消費は生産＋輸入−輸出で、在庫未調整・輸入込み。実消費や国産材の国内投入を追跡する値ではありません。</p><a href="https://www.fao.org/forestry/statistics/data/en">FAO：林産物の公表単位と資料範囲</a></details>`;
 }
}
