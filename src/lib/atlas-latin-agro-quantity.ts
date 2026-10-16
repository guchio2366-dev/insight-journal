import {agroBand,agroEscape as esc} from './atlas-agro-statistics';

export type LatinSoy = {
 countryCode:string;countryName:string;year:number;seriesId:string;label:string;unit:string;
 production:{value:number;rawValue:string;flag:string;note:string};world:{value:number;rawValue:string;flag:string};
 imports:number|null;exports:number|null;balanceComparable:boolean;
 partners:{name:string;rawKg:string|null;tonnes:number|null;region:'internal'|'external'|'unresolved'}[];
 partnerRoundingGap:number|null;productionUrl:string;
 exportSource:{url:string;transcription:string};importSource:{url:string;transcription:string};
};
export type LatinForest = {
 countryCode:string;countryName:string;year:number;tradeUrl:string;
 roundwood:{unit:string;total:number;rawLine:string;url:string;parts:{label:string;value:number|null;rawValue:string}[]};
 sawnwood:{unit:string;production:number;exports:number;rawLine:string;exportRawLine:string;url:string};
 pulp:{unit:string;production:number;rawLine:string;url:string};
};
export type LatinQuantityData={schemaVersion:number;records:LatinSoy[];forest:LatinForest;sources:{path:string;sha256:string}[];method:string};
const n=(v:number|null)=>v===null?'未収録':v.toLocaleString('ja-JP',{maximumFractionDigits:3});
const pct=(v:number)=>v>0&&v<.01?'0.01%未満':n(Math.round(v*100)/100)+'%';
const regionLabel={internal:'対象34国・地域内',external:'対象34国・地域外',unresolved:'地理区分未確定'};
const link=(url:string,label:string)=>`<a href="${esc(url)}">${esc(label)}</a>`;
const source=(url:string,label:string)=>`<p class="agro-meta">${link(url,label)}</p>`;

export function latinApparentUse(row:LatinSoy){
 if(!row.balanceComparable||row.imports===null||row.exports===null)return null;
 const value=row.production.value+row.imports-row.exports;
 return value>=0?value:null;
}

/** Partner names and unresolved customs areas are the actual public table rows.
 * Ratios use its World total, never the known partner sum or another publisher. */
export function renderLatinDestinations(row:LatinSoy,reference=false){
 const partners=[...row.partners].sort((a,b)=>(b.tonnes??-1)-(a.tonnes??-1)||a.name.localeCompare(b.name));
 const total=row.exports,validTotal=total!==null&&total>0;
 const summary=partners.slice(0,5).map(p=>`<li><span>${esc(p.name)} <small>${regionLabel[p.region]}</small></span><strong>${n(p.tonnes)} t${validTotal&&p.tonnes!==null?' · '+pct(p.tonnes/total*100):''}</strong>${validTotal&&p.tonnes!==null?`<span class="latin-partner-track" aria-hidden="true"><i style="width:${Math.min(100,p.tonnes/total*100)}%"></i></span>`:''}</li>`).join('');
 const all=partners.map(p=>`<tr><th scope="row">${esc(p.name)}<small>${regionLabel[p.region]}</small></th><td>${n(p.tonnes)}</td><td>${validTotal&&p.tonnes!==null?pct(p.tonnes/total*100):'未算出'}</td></tr>`).join('');
 const knownMissing=partners.filter(p=>p.tonnes===null).length;
 return `<h3>③ 輸出先の量と構成比</h3><p class="agro-meta">${row.year}暦年 · WITS H0 120100 · 丸大豆 · t${reference?'（別期間の参考）':''}</p>${reference?'<p class="latin-quantity-notice">①②と同じ販売年度の相手数量は未収録です。以下は暦年の参考で、販売年度の輸出量へ接合しません。</p>':''}${total===null?'<p class="latin-quantity-notice">公表Worldの輸出総数量が空欄のため、構成比と円は算出しません。相手行の数量だけを示します。</p>':`<p>全国の総輸出 <strong>${n(total)} t</strong>を分母にします。</p>`}<ul class="latin-partner-list">${summary}</ul><p class="agro-meta">国の全相手を含む表です。中南米域内への輸出を、中南米全体の域外輸出に算入しません。通関上の相手は最終消費地とは限りません。</p>${row.countryCode==='URY'?'<p class="latin-quantity-notice">Free Zonesは原表の関税区分です。特定国や域外へ割り当てず、国の生産と同じ範囲の国内使用量も算出しません。</p>':''}<details class="agro-definitions"><summary>全${partners.length}相手の数量・域内外区分</summary><p>数量欠測 ${knownMissing}行。${row.partnerRoundingGap===null?'World数量がないため相手合計との差も未算出。':`相手数量合計−World数量は ${n(row.partnerRoundingGap)} t。差を架空の「その他」にしません。`}区分は既存地図の34対象を基準にします。別立てのメキシコや、地図にないカリブ海の関税区分もこの対象集合の外です。地理的な中南米すべてと同じ範囲ではありません。</p><div class="agro-table-scroll"><table><thead><tr><th>相手・区分</th><th>数量 t</th><th>総輸出比</th></tr></thead><tbody>${all}</tbody></table></div></details>${source(row.exportSource.url,'World Bank WITS / UN Comtrade：2024年の全相手表')}`;
}

export function renderLatinSoyColumns(row:LatinSoy,method:string){
 const apparent=latinApparentUse(row),share=row.production.value/row.world.value*100;
 const use=apparent===null?`<p class="agro-flow-gap">${row.balanceComparable?'輸出入の総数量が欠けているため':'関税区分と全国生産の対象範囲が異なるため'}、国内使用量は算出しません。</p>`:
 `${agroBand('輸入込み・在庫未調整の数量比較',[{label:'国内の見掛量',value:apparent},{label:'総輸出',value:row.exports!}],'t')}<p class="latin-quantity-notice">国内の見掛量＝生産＋輸入−輸出。実消費・国産分の国内仕向けではありません。飼料・加工・食用・損失・在庫変動は未収録です。</p>`;
 return `<p class="agro-flow-period">${esc(row.countryName)}全国 · 2024暦年 · 丸大豆 · t（FAO/WITSの提供元混合比較）</p><div class="agro-columns" data-agro-country="${row.countryCode}" data-agro-series="soybean-production" data-latin-calendar-flow="2024"><section data-agro-stage="production"><h3>① 生産量と世界シェア</h3><p class="agro-meta">2024暦年 · FAOSTAT QCL236 · t</p><p>国内生産 <strong>${n(row.production.value)} t</strong></p><div class="agro-world-pie" role="img" aria-label="世界生産に占める${esc(row.countryName)}の割合 ${pct(share)}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${pct(share)}</span></div><p>World <strong>${n(row.world.value)} t</strong></p><p class="agro-meta">資料記号 国／世界：${esc(row.production.flag)}／${esc(row.world.flag)}。${esc(row.production.note)}</p>${source(row.productionUrl,'FAOSTAT：2024年の大豆生産・同版World')}</section><section data-agro-stage="use"><h3>② 国内の見掛量と輸出</h3><p class="agro-meta">2024暦年 · 丸大豆 · t</p><p>総輸出 <strong>${n(row.exports)} t</strong>${row.exports!==null&&row.balanceComparable?' · 生産量との比 <strong>'+pct(row.exports/row.production.value*100)+'</strong>':''}</p><p>総輸入 <strong>${n(row.imports)} t</strong></p>${use}<p class="agro-meta">輸出は総輸出で再輸出を含み得ます。輸出÷生産は当年生産を国内・輸出に二分した割合ではありません。</p>${source(row.importSource.url,'WITS：2024年の総輸入')}</section><section data-agro-stage="destinations">${renderLatinDestinations(row)}</section></div><details class="agro-definitions"><summary>期間・商品範囲・原値・出典</summary><p>${esc(method)}</p><p>国の生産原値 ${esc(row.production.rawValue)} t、World原値 ${esc(row.world.rawValue)} t。大豆油・油かすの輸出を含めません。FAO生産のCC BY 4.0、貿易のUN Comtrade / WITS利用条件に従い出典を表示します。WITS数量は公式公開表の読取記録で、原HTML・CSVの保存ではありません。</p><p>国内の実用途と国産・輸入原料の追跡は未達です。国別行を合計した地域需給や地域外輸出は作っていません。</p>${link('https://wits.worldbank.org/faqs.html','WITS利用条件')}</details>`;
}

export function renderLatinForestColumns(row:LatinForest,product:string){
 const raw=product==='roundwood',pulp=product==='pulp',series=raw?row.roundwood:pulp?row.pulp:row.sawnwood;
 const label=raw?'丸太（工業投入・直接輸出）':pulp?'パルプ（全製法）':'製材（全樹種）';
 const production=raw?'<p class="agro-flow-gap">丸太の全国生産量・対応Worldは未収録です。工業投入量を生産量に置き換えません。</p>':`<p>全国生産 <strong>${n((series as LatinForest['pulp']).production)} ${series.unit}</strong></p><p class="agro-flow-gap">同じ製品範囲のWorld原行がなく、世界シェアは未算出です。</p>`;
 const parts=row.roundwood.parts.filter((p):p is typeof p & {value:number}=>p.value!==null);
 const rounding=row.roundwood.total-parts.reduce((s,p)=>s+p.value,0);
 const use=raw?`<p>公表投入・直接輸出合計 <strong>${n(row.roundwood.total)} ${esc(series.unit)}</strong></p>${agroBand('用途を原表の区分で比較（収録数量の合計）',parts,series.unit)}<p class="agro-meta">公表合計−収録区分合計 ${n(Math.round(rounding*1000)/1000)} ${esc(series.unit)}。パルプ用丸太輸出と「その他」の原表「−」は数値化せず保持します。化学パルプへの投入には製材所由来チップを含みません。</p><p>国内加工への投入と丸太の直接輸出の表です。燃料材を含む丸太全生産の消費配分ではありません。</p>`:pulp?'<p class="agro-flow-gap">同じ細分類の国内用途・輸出入・在庫を照合できていません。生産−輸出を消費にはしません。</p>':`<p>製材の輸出参考 <strong>${n(row.sawnwood.exports)} m³</strong>（千m³単位の公表値から換算）</p><p>生産量との数量比 <strong>${pct(row.sawnwood.exports/row.sawnwood.production*100)}</strong></p><p class="agro-flow-gap">輸入・在庫が未収録のため国内使用量は未算出です。</p><p class="agro-meta">輸出表は単純製材・厚板・basas・tapasを含み、かんな掛け製品は別区分です。輸出には再輸出を含み得ます。国産材の仕向け比率ではありません。</p>`;
 return `<p class="agro-flow-period">チリ全国 · ${row.year}暦年 · ${label} · ${esc(series.unit)}</p><div class="agro-columns" data-latin-forest-flow="${esc(product)}"><section data-agro-stage="production"><h3>① 生産量と世界シェア</h3><p class="agro-meta">${label} · ${esc(series.unit)}</p>${production}${source(series.url,'INFOR：チリの全国原表')}</section><section data-agro-stage="use"><h3>② 国内加工・使用と輸出</h3>${use}${source(raw?row.roundwood.url:row.tradeUrl,'INFOR：投入・貿易の原表')}</section><section data-agro-stage="destinations"><h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap">同年・同製品・同単位の全相手数量は未収録です。林産物全体の輸出金額を製品の数量構成へ代用しません。</p>${source('https://wef.infor.cl/index.php/consultas-en-linea?view=consultas_exportaciones','必要資料：INFOR 品目×全相手の数量表')}</section></div><details class="agro-definitions"><summary>原表・単位・加工段階の定義</summary><p>丸太は樹皮なし実材積 m³ ssc。製材は製品体積 m³、パルプは製品重量 tです。丸太の投入量と加工後の製材・パルプ量を足さず、歩留まりや産地を逆算しません。チリ一国の値であり、中南米全体の集計ではありません。</p><p>原表の千単位を1,000倍する換算のみ。桁区切り「.」と小数「,」を区別し、公表桁以上の精度を主張しません。</p><pre>${esc(series.rawLine)}</pre>${product==='sawnwood'?'<pre>'+esc(row.sawnwood.exportRawLine)+'</pre>':''}</details>`;
}
