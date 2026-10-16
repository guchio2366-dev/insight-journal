import evidence from '../data/atlas/canada/agro-statistics-20261016.json';
import {agroBand,agroEscape as esc,agroNumber as num,renderAgroColumns,renderAgroWorld,type AgroData} from './atlas-agro-statistics';

export const canadaAgroProducts = [
 ['canola','カノーラ種子','rapeseed-production'],['wheat','小麦','wheat-production'],
 ['beef','牛肉','cattle-meat'],['dairy','牛生乳','cattle-milk'],['pork','豚肉','pig-meat'],
 ['chicken','鶏肉','chicken-meat'],['eggs','鶏卵','chicken-eggs'],['soybeans','大豆','soybean-production'],
 ['corn','とうもろこし子実','maize-production'],['lentils','レンズ豆','qcl-201-production'],
 ['potatoes','ばれいしょ','potato-production'],['hay','干草・栽培牧草','hay-production'],
 ['pasture','放牧地','pasture-production'],['roundwood','丸太（燃料材を含む）','roundwood-production'],
 ['sawnwood','製材','sawnwood-production'],['paper-pulp','製紙用パルプ','paper-pulp-production'],
] as const;
const qty=(v:number)=>v.toLocaleString('ja-JP',{maximumFractionDigits:3});
const pct=(v:number)=>`${v.toLocaleString('ja-JP',{maximumFractionDigits:2})}%`;
type Flow=(typeof evidence.aafc)[keyof typeof evidence.aafc];
type Trade=(typeof evidence.calendarTrade)[keyof typeof evidence.calendarTrade];
const period=(flow:Flow)=>`${flow.year}年度（${flow.periodStart}〜${flow.periodEnd}） · 千t`;
function aafcUse(flow:Flow){
 const balanced=Math.abs(flow.reportedBalanceGap)<=2;
 return `<h3>② 国内利用と輸出</h3><p class="agro-meta">${period(flow)}</p><p>国内利用 <strong>${num(flow.domesticUse)} 千t</strong> ／ 輸出 <strong>${num(flow.exports)} 千t</strong></p><p>輸出／生産 <strong>${pct(flow.exports/flow.production*100)}</strong></p>${balanced?agroBand('年度供給の仕向け（輸入・持越在庫込み）',[{label:'国内利用',value:flow.domesticUse},{label:'輸出',value:flow.exports},{label:'期末在庫',value:flow.endingStocks}],'千t'):''}<p class="agro-meta">公表供給 ${num(flow.totalSupply)}、輸入 ${num(flow.imports)}、期末在庫 ${num(flow.endingStocks)} 千t。国内利用は食用・工業用、飼料・くず・夾雑物、種子、取扱損失を含む公表値です。国産分だけの消費や、食用だけの量ではありません。</p>${'foodIndustrial' in flow?`<details><summary>国内利用の内数</summary><p>食用・工業用 ${num(flow.foodIndustrial)}、飼料・くず・夾雑物 ${num(flow.feedWasteDockage)} 千t。どちらも国内利用の内数で、追加加算しません。飼料だけ・搾油だけの量とは呼びません。</p></details>`:''}${flow.reportedBalanceGap!==0?`<p class="agro-meta">公表供給−国内利用−輸出−期末在庫＝${num(flow.reportedBalanceGap)} 千t。${balanced?'原表の丸め差を保持します。':'原表内の差が大きいため構成帯を描きません。差を消費や架空の用途へ配分しません。'}</p>`:''}<p class="agro-meta">輸出／生産は国産収穫物を国内・海外へ二分した割合ではありません。輸入品・再輸出・在庫の由来別数量は未収録です。</p><details><summary>原表・加工範囲・数量の定義</summary><p>${['Canola','Soybeans'].includes(flow.label)?'輸入・輸出は種子の数量。油料種子加工品（油・粕）を含めません。':flow.exportProducts.includes('grain')?'輸出は穀物加工品を含む原表定義。小麦粉等を含む数量を原穀HSの相手表へ接合しません。':'輸入・輸出は加工品を除く原表定義。'}</p><p>期首在庫の参考計算＝公表供給−生産−輸入＝${num(flow.beginningStocksDerived)} 千t。公表された期首在庫として扱いません。</p><pre>${esc(flow.rawLine)}</pre><a href="${esc(flow.sourceUrl)}#page=${flow.page}">AAFC 2026-09-25 原表 p.${flow.page}</a></details>`;
}
export function canadaTradeParts(trade:Trade){
 const sorted=[...trade.partners].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name));
 const parts=sorted.slice(0,5);
 if(sorted.length>5)parts.push({name:'その他の収録相手',quantity:sorted.slice(5).reduce((s,p)=>s+p.quantity,0)});
 return parts;
}
export function renderCanadaTrade(trade:Trade){
 const factor=trade.unit==='kg'?1000:1,unit=trade.unit==='kg'?'t':'m³';
 const parts=canadaTradeParts(trade),palette=['#3d7666','#b98046','#7b8ca7','#9c6b8c','#8a9857','#b2b8ad'];let offset=0;
 const stops=parts.map((p,i)=>{const start=offset;offset+=p.quantity/trade.worldQuantity*100;return `${palette[i]} ${start}% ${offset}%`;});
 return `<p class="agro-meta">2024暦年 · ${esc(trade.description)} · ${esc(trade.classification)} ${trade.code}</p><p>総輸出 <strong>${qty(trade.worldQuantity/factor)} ${unit}</strong></p><div class="agro-partner-pie" role="img" aria-label="${esc(parts.map(p=>p.name+' '+pct(p.quantity/trade.worldQuantity*100)).join('、'))}" style="background:conic-gradient(${stops.join(',')})"></div><ul class="agro-key">${parts.map((p,i)=>`<li><i style="background:${palette[i]}" aria-hidden="true"></i>${esc(p.name)} <strong>${qty(p.quantity/factor)} ${unit} · ${pct(p.quantity/trade.worldQuantity*100)}</strong></li>`).join('')}</ul><p class="agro-meta">分母は公表World総輸出。数量で並べ替えています。米国もカナダ国外として含め、カナダの州間取引は含めません。通関仕向け先は最終消費地とは限りません。</p><details><summary>全${trade.partners.length}相手・公表総量との差</summary><p>相手合計−World＝${qty(trade.partnerRoundingGap/factor)} ${unit}。丸め等の差を「その他」へ押し込みません。gross exportsで、輸入品の再輸出を分離できません。${trade.unit==='kg'?'kg÷1,000でtへ換算しています。':'原表のm³を保持し、重量・原木換算をしていません。'}</p><div class="agro-table-scroll"><table><thead><tr><th>相手（原表名）</th><th>${unit}</th><th>構成比</th></tr></thead><tbody>${[...trade.partners].sort((a,b)=>b.quantity-a.quantity).map(p=>`<tr><th scope="row">${esc(p.name)}</th><td>${qty(p.quantity/factor)}</td><td>${pct(p.quantity/trade.worldQuantity*100)}</td></tr>`).join('')}</tbody></table></div></details><a href="${esc(trade.sourceUrl)}">World Bank WITS / UN Comtrade 公開数量表</a>`;
}
const columns=(product:string,series:string,production:string,use:string,destinations:string)=>`<div class="agro-columns" data-canada-agro-product="${esc(product)}" data-agro-country="CAN" data-agro-series="${esc(series)}"><section data-agro-stage="production">${production}</section><section data-agro-stage="use">${use}</section><section data-agro-stage="destinations">${destinations}</section></div>`;
export function renderCanadaAgro(data:AgroData,product:string){
 const entry=canadaAgroProducts.find(p=>p[0]===product);if(!entry)return '';
 const [id,label,seriesId]=entry;
 if(id==='soybeans'){
  const series=data.countries.CAN.series.find(s=>s.id===seriesId)!,row=series.rows.find(r=>r.year===2024)!;
  const trade=evidence.calendarTrade.soybean,imports=evidence.soybeanImports.worldQuantityKg/1000,exports=trade.worldQuantity/1000;
  if(row.value===null||row.worldValue===null)throw Error('Canada soybean production/World unavailable');
  const use=`<h3>② 国内の見掛消費と輸出</h3><p class="agro-meta">2024暦年 · 原料大豆 · t</p><p>輸出 <strong>${num(exports)} t</strong> · 輸出／生産 <strong>${pct(exports/row.value*100)}</strong></p>${agroBand('輸入込み・在庫未調整の数量比較',[{label:'国内見掛消費',value:row.value+imports-exports},{label:'輸出',value:exports}],'t')}<p class="agro-meta">見掛消費＝生産＋輸入−輸出。輸入 ${num(imports)} t。実際の国内消費・国産分の国内仕向けではありません。在庫変動・食用・飼料・搾油・損失は未調整です。輸出／生産も国産分の配分比ではありません。</p><a href="${esc(evidence.soybeanImports.sourceUrl)}">同年・同品目の輸入数量</a><details class="agro-other-reference"><summary>別期間・別改訂：2024/25年度の国内利用</summary>${aafcUse(evidence.aafc.soybeans)}</details>`;
  return `<p class="agro-flow-period">カナダ全国 · 2024暦年 · 原料大豆（油・粕を含まない）</p>${columns(id,seriesId,renderAgroWorld(data,'CAN',series,2024),use,'<h3>③ 輸出先の量と構成比</h3>'+renderCanadaTrade(trade))}<details><summary>品目・提供元・年の対応</summary><p>FAOSTAT QCL236 Soya beansの2024生産・同版Worldと、WITS H0 120100 Soya beansの2024 gross輸出入をtで比較します。提供元が異なる数量比較で、正式な全品目crosswalkを取得したものではありません。輸入には原表相手Canadaの戻り取引1.152 tも含む公表Worldを使用し、州間貿易へ読み替えません。AAFC2024/25は別期間・別改訂の参考です。</p></details>`;
 }
 if(id==='canola'){
  const flow=evidence.usdaRapeseed,share=flow.production/flow.worldProduction*100;
  const production=`<h3>① 生産量と世界シェア</h3><p class="agro-meta">2024/25販売年度 · USDA Oilseed, Rapeseed · 千t</p><p>カナダ生産 <strong>${num(flow.production)} 千t</strong></p><div class="agro-world-pie" role="img" aria-label="世界の菜種種子生産に占めるカナダ ${pct(share)}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${pct(share)}</span></div><p>世界の菜種種子生産に占めるカナダ <strong>${pct(share)}</strong>。公表World <strong>${num(flow.worldProduction)} 千t</strong>。</p><p class="agro-meta">②と同じUSDA 2026年10月版・同じ種子列。油・粕は別製品として除外。Worldは各国販売年度の集計で、共通暦年とは呼びません。</p><a href="${flow.sourceUrl}#page=21">USDA FAS 原表 p.21</a>`;
  const use=`<h3>② 国内利用と輸出</h3><p class="agro-meta">カナダ 2024-08-01〜2025-07-31 · 千t</p><p>国内利用 <strong>${num(flow.domesticUse)} 千t</strong> ／ 輸出 <strong>${num(flow.exports)} 千t</strong></p><p>輸出／生産 <strong>${pct(flow.exports/flow.production*100)}</strong></p>${agroBand('公表3項目の構成（供給収支の完成ではない）',[{label:'国内利用',value:flow.domesticUse},{label:'輸出',value:flow.exports},{label:'期末在庫',value:flow.endingStocks}],'千t')}<p class="agro-meta">輸入 ${num(flow.imports)}、期末在庫 ${num(flow.endingStocks)} 千t。期首在庫・在庫変動はこの表で未収録のため逆算しません。帯は上の3公表項目の合計を分母とし、総供給や国産収穫物の配分とは呼びません。</p><p class="agro-meta">国内利用は公表Domestic Consumption。食用・種子・工業・飼料・廃棄を含み、食用だけ・搾油だけの量ではありません。輸入品・再輸出・国産分を追跡した量ではありません。</p><details class="agro-other-reference"><summary>別改訂：AAFC 2026年9月版の国内利用</summary><p>年度名と種子生産が同じでも、国内利用・輸出の公表値は異なります。①②のUSDA値と混ぜません。</p>${aafcUse(evidence.aafc.canola)}</details>`;
  const destinations=`<h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap">同じ2024/25年度・種子範囲の全相手数量は未収録です。</p><details class="agro-other-reference"><summary>別期間：2024暦年の菜種・コルザ種子（HS120500）</summary><p>年度の種子輸出と暦年表は期間・範囲が異なります。②の分母や配分には使いません。</p>${renderCanadaTrade(evidence.calendarTrade.rapeseed)}</details>`;
  return `<p class="agro-flow-period">カナダ全国 · カノーラ種子（USDA分類：菜種種子） · 2024/25販売年度</p>${columns(id,seriesId,production,use,destinations)}<details class="agro-definitions"><summary>USDAの製品・期間・原表</summary><p>USDA October 2026、Table12のOilseed, Rapeseedの2024/25列だけを採用。Meal / Oilや2025/26・2026/27を加算しません。USDA p.7は菜種種子をHS1205、油・粕を別HSとして区別しています。各国の年度期首は異なり、世界在庫も同一時点ではありません。</p><pre>${esc(Object.entries(flow.rawLines).map(([key,line])=>key+': '+line).join('\n'))}</pre><a href="${flow.sourceUrl}#page=7">定義・HS対応 p.7</a></details>`;
 }
 if(id==='lentils'){
  const flow=evidence.aafc.lentils;
  return `<p class="agro-flow-period">カナダ全国 · ${esc(label)} · ${period(flow)}</p>${columns(id,seriesId,`<h3>① 生産量と世界シェア</h3><p class="agro-meta">${period(flow)}</p><p>国内生産 <strong>${num(flow.production)} 千t</strong></p><p>同じ年度・品目範囲・改訂の世界分母は未収録です。別年・別品目のWorldや国合計で補いません。</p><a href="${esc(flow.sourceUrl)}#page=${flow.page}">AAFC公式原表</a>`,aafcUse(flow),'<h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap">同じ2024/25年度・品目範囲の全相手数量は未収録です。</p>')}`;
 }
 if(id==='roundwood'||id==='sawnwood'||id==='paper-pulp'){
  const forest=evidence.forest[id],share=forest.publishedSharePercent;
  return `<p class="agro-flow-period">カナダ全国 · 2024暦年 · ${esc(forest.label)} · ${forest.unit}</p>${columns(id,seriesId,`<h3>① 生産量と世界シェア</h3><p>生産量：未収録（${forest.unit}）。</p>${share===null?'<p>同じ丸太全体の世界シェアも未収録です。産業用丸太6%を燃料材込み丸太へ転用しません。</p>':`<p>FAO公表の世界生産シェア <strong>約${share}%</strong>（整数に丸めた公表値）。</p><p class="agro-meta">世界総量との掛け算でカナダの量を逆算しません。</p>`}<a href="${evidence.forestSourceUrl}">FAO 2024公式公開表</a>`,`<h3>② 国内での使用と輸出</h3><p class="agro-flow-gap">同年・同製品の生産・輸入・輸出・在庫・国内用途原行は未収録です。</p><p>${esc(forest.label)}の単位は${forest.unit}。丸太・製材のm³とパルプのtを合算せず、加工業収入CADから換算しません。製紙用パルプは木材パルプだけと同一視しません。</p>`,'<h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap">同年・同製品の全相手数量は未収録です。木材・紙全体の金額割合で代用しません。</p>'+(id==='sawnwood'?'<details class="agro-other-reference"><summary>別製品範囲：針葉樹の製材 HS440710</summary><p>2024年・針葉樹部分集合の数量参考です。①の全樹種製材や②の欠測需給へ接合せず、輸出／生産比も算出しません。</p>'+renderCanadaTrade(evidence.calendarTrade['coniferous-sawnwood'])+'</details>':''))}`;
 }
 const fallback=renderAgroColumns(data,'CAN',seriesId);
 const reference=id==='wheat'||id==='corn'?`<details class="agro-other-reference"><summary>AAFCの別改訂・加工範囲による2024/25年度の用途参考</summary><p>主図のWASDEと同じ年度名でも改訂・輸入・加工品の範囲が異なります。主図の値を置き換えません。</p>${aafcUse(evidence.aafc[id])}</details>`:'';
 return `<p class="agro-meta">選択品目：${esc(label)}。地図の面積・頭数・生産者数と、以下の生産数量は別の指標です。</p>${fallback}${reference}`;
}
