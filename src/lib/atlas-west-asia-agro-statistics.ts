import {agroBand,agroEscape as esc,agroNumber as number,renderAgroColumns,type AgroData} from './atlas-agro-statistics';
import datesTrade from '../data/atlas/west-asia-sau-dates-trade-2023.json';
import wheat from '../data/atlas/west-asia-wheat-2023.json';
import gain from '../data/atlas/west-asia-turkiye-gain-2023-24.json';

// Adapt only the regional topic IDs. The shared topic contract and map remain unchanged.
export function westAgroTopic(id:string){
 const topic=id.replace(/-(irrigated|rainfed)$/,'');
 return ({'cattle-milk':'dairy','buffalo-milk':'buffalo','hen-eggs':'eggs','chicken-meat':'broiler','cattle-meat':'beef'} as Record<string,string>)[topic]??topic;
}
const crops:Record<string,{item:string;label:string}>={dates:{item:'577',label:'ナツメヤシの実'},olives:{item:'260',label:'オリーブ果実'}};
const valid=(row:any)=>row&&row.unit==='t'&&!['M','L'].includes(row.flag)&&typeof row.value==='number'&&Number.isFinite(row.value)&&row.value>=0;
export function westCropProduction(data:any,topic:string,year:number){
 const item=crops[topic]?.item;
 if(!item)return null;
 const rows=data.countries.map((country:any)=>({code:country.code,row:data.agriculture.countries[country.code]?.observations.find((r:any)=>r.domain==='Production_Crops_Livestock'&&r.item===item&&r.elementCode==='5510'&&r.year===year)}));
 const reported=rows.filter((r:any)=>valid(r.row));
 return {year,item,label:crops[topic].label,sum:reported.reduce((sum:number,r:any)=>sum+r.row.value,0),reported:reported.length,total:rows.length,missing:rows.filter((r:any)=>!valid(r.row)).map((r:any)=>r.code)};
}
export function westCropData(data:any,topic:string):AgroData{
 const crop=crops[topic];if(!crop)throw Error('Unsupported regional crop');
 return {countries:Object.fromEntries(data.countries.map((country:any)=>[country.code,{name:country.name,series:[{
  id:topic+'-production',label:crop.label,domain:'QCL',item:crop.item,element:'5510',unit:'t',
  definition:'FAOSTAT QCLの保存済み国別生産量。世界分母は未収録です。貿易の生鮮・乾燥品、保存品、搾油後の油へ換算しません。',sourceUrl:'https://www.fao.org/faostat/en/#data/QCL',
  rows:data.agriculture.years.map((year:number)=>{const row=data.agriculture.countries[country.code]?.observations.find((r:any)=>r.domain==='Production_Crops_Livestock'&&r.item===crop.item&&r.elementCode==='5510'&&r.year===year);return {year,value:valid(row)?row.value:null,rawValue:valid(row)?String(row.value):null,flag:row?.flag??'',note:row?.note??null,worldValue:null,worldFlag:null,share:null};})
 }]}])),sources:[],method:'西アジアの保存JSONにある20対象の国別行。原CSVの未保存桁は復元せず、欠測は0としません。世界分母・消費・輸出の推計はしません。'};
}

// Explicit correspondence to the existing editorial M49 scope, not a membership
// guess based on geography or on whether the country supplied a reporter row.
export const westWitsInternalM49:Record<string,string>={Armenia:'051',Azerbaijan:'031',Bahrain:'048',Cyprus:'196',Georgia:'268',Iraq:'368',Israel:'376',Jordan:'400',Kuwait:'414',Lebanon:'422',Oman:'512',Qatar:'634','Saudi Arabia':'682','Occ.Pal.Terr':'275','Syrian Arab Republic':'760',Turkey:'792','United Arab Emirates':'784',Yemen:'887','Iran, Islamic Rep.':'364','Egypt, Arab Rep.':'818'};
export function westDatesTradeSummary(packet=datesTrade){
 const partners=packet.exports.partners;
 const internal=partners.filter(row=>Object.hasOwn(westWitsInternalM49,row.partner));
 const unallocated=partners.filter(row=>row.partner==='Other Asia, nes');
 const external=partners.filter(row=>!internal.includes(row)&&!unallocated.includes(row));
 const sum=(rows:typeof partners)=>rows.reduce((s,r)=>s+r.quantityKg,0)/1000;
 return {internal:sum(internal),external:sum(external),unallocated:sum(unallocated),returned:sum(partners),world:packet.exports.worldQuantityKg/1000,gap:packet.exports.partnerMinusWorldKg/1000};
}
export function renderWestDatesTrade(){
 const packet=datesTrade,summary=westDatesTradeSummary(),rows=[...packet.exports.partners].sort((a,b)=>b.quantityKg-a.quantityKg),parts=rows.slice(0,5).map(r=>({label:r.partner,value:r.quantityKg/1000}));
 parts.push({label:'その他の収録相手',value:rows.slice(5).reduce((s,r)=>s+r.quantityKg,0)/1000});
 const colors=['#3d7666','#b98046','#7b8ca7','#9c6b8c','#8a9857','#b2b8ad'];let start=0;
 const stops=parts.map((part,i)=>{const from=start;start+=part.value/summary.world*100;return `${colors[i]} ${from}% ${start}%`;});
 // A neutral rounding sliver stays outside every named partner, never in Other.
 if(start<100)stops.push(`#e3e1d7 ${start}% 100%`);
 return `<details class="west-dates-trade-reference agro-definitions" data-west-dates-trade><summary>別期間・別定義の参考：2023年サウジの生鮮・乾燥デーツ輸出</summary><p>サウジアラビア全国 · 2023暦年 · HS1988/92（H0）080410 · 生鮮・乾燥ナツメヤシ。総輸出 <strong>${number(summary.world)} t</strong>、総輸入 ${number(packet.imports.worldQuantityKg/1000)} t（原表kg÷1,000）。QCL果実やFBS製品群との原料換算を検証できていないため、生産から差し引かず、国内消費・輸出／生産比を算出しません。</p><div class="agro-partner-pie" role="img" aria-label="サウジ全国の全外国向け輸出。分母${summary.world}トン。${esc(parts.map(p=>p.label+' '+(p.value/summary.world*100).toFixed(1)+'%').join('、'))}" style="background:conic-gradient(${stops.join(',')})"></div><ul class="agro-key">${parts.map((p,i)=>`<li><i style="background:${colors[i]}" aria-hidden="true"></i>${esc(p.label)} <strong>${number(p.value)} t · ${(p.value/summary.world*100).toFixed(2)}%</strong></li>`).join('')}</ul><p>円の分母はWITSの全国対World総輸出。全118相手を保持し、近隣国も含みます。編集20対象内の相手向け ${number(summary.internal)} t、20対象外の帰属確認分 ${number(summary.external)} t、Other Asia, nes ${number(summary.unallocated)} t。これはサウジ1国の内訳で、地域全体の域外輸出ではありません。再輸出を含み、相手は最終消費地とは限りません。</p><p>相手行合計−World：${summary.gap.toLocaleString('ja-JP',{maximumFractionDigits:3})} t。符号付きの丸め差を架空のその他へ配分しません。輸入相手行にも +${packet.imports.partnerMinusWorldKg} kgの丸め差があります。</p><details><summary>全118輸出相手の数量・構成比・内外区分</summary><div class="agro-table-scroll"><table><caption>2023年・サウジ全国・H0 080410。原表KgとWorldを保持。</caption><thead><tr><th>相手（原表名）</th><th>kg</th><th>総輸出比</th><th>編集20対象との関係</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.partner)}</th><td>${number(r.quantityKg)}</td><td>${(r.quantityKg/packet.exports.worldQuantityKg*100).toFixed(2)}%</td><td>${westWitsInternalM49[r.partner]?'域内（M49 '+westWitsInternalM49[r.partner]+'）':r.partner==='Other Asia, nes'?'帰属未割当':'域外'}</td></tr>`).join('')}</tbody></table></div></details><p><a href="${esc(packet.sources.exports)}">World Bank WITS / UN Comtrade：輸出全相手</a> · <a href="${esc(packet.sources.imports)}">同年同品目の輸入</a></p><p>公式公開HTML表の数量列を転記・検算。元CSV・元HTMLファイルは保持していません。</p></details>`;
}
export function renderWestSelectedCrop(data:any,topic:string,code:string,year=2024){
 if(!crops[topic]||!code)return '';
 const html=renderAgroColumns(westCropData(data,topic),code,topic+'-production',year).replace(/<details class="agro-other-reference"><summary>[^<]*<\/summary><div data-agro-existing-(?:supply|trade)><\/div><\/details>/g,'');
 // Insert the independent trade reference only in its labelled destinations column.
 if(topic!=='dates'||code!=='SAU')return html;
 const marker='<section data-agro-stage="destinations" data-agro-trade-column>';
 const end=html.indexOf('</section></div>',html.indexOf(marker));
 return html.slice(0,end)+renderWestDatesTrade()+html.slice(end);
}
export function renderWestWheatExample(data:any,code:string){
 const country=data.countries.find((row:any)=>row.code===code),m49=data.agriculture.countries[code]?.m49;
 const row=wheat.FBS.examples.find(row=>Number(row.m49)===Number(m49));if(!row)return '';
 const v=row.values as Record<string,number>,stock=v['5072'];
 const supply=[{label:'生産',value:v['5511']},{label:'輸入',value:v['5611']},...(stock<0?[{label:'在庫取崩し',value:-stock}]:[])];
 const disposition=[{label:'国内供給',value:v['5301']},{label:'輸出',value:v['5911']},...(stock>0?[{label:'在庫積増し',value:stock}]:[])];
 const gap=v['5511']+v['5611']-v['5911']-stock-v['5301'];
 const labels:Record<string,string>={'5142':'食用供給','5521':'飼料','5527':'種子','5123':'損失','5131':'加工','5154':'その他（非食用）','5170':'符号付き残差'};
 return `<details class="west-national-fbs-reference agro-definitions" data-west-national-fbs="${esc(code)}"><summary>別年・製品群の参考：${esc(country?.name??code)}の2023年小麦製品需給</summary><p>2023年 · FBS S2511「Wheat and products」 · 千t。上のQCL原穀の2024年生産・世界比と接合しません。FBS輸出は全外国向けで、編集20対象の域外輸出だけではありません。</p>${agroBand('供給（生産・輸入・在庫取崩し）',supply,'千t')}${agroBand('供給の仕向け（国内供給・輸出・在庫積増し）',disposition,'千t')}<p>在庫変動の原符号 ${number(stock)} 千t（正は積増し、負は取崩し）。生産＋輸入−輸出−在庫変動−公表国内供給：${number(gap)} 千t。国内供給は食用消費そのものでも国産分の仕向けでもありません。</p><div class="agro-table-scroll"><table><caption>国内供給の用途原値（千t）。欠測を0にせず、残差は符号付きで別掲。</caption><thead><tr><th>用途</th><th>千t</th></tr></thead><tbody>${Object.entries(labels).map(([key,label])=>`<tr><th scope="row">${label}</th><td>${number(v[key])}</td></tr>`).join('')}<tr><th scope="row">観光客消費</th><td>未返却（0ではない）</td></tr></tbody></table></div><p>全量の国産由来を追跡する資料、同一定義の世界生産・全相手数量は未収録です。保存済み独立照合ハンドオフ ${esc(row.file)}・データレコード ${row.records.join('–')} を再利用。原CSV未保持・全行I（補完）。SHA-256 ${wheat.sourceFiles[row.file as keyof typeof wheat.sourceFiles].sha256}。</p><a href="https://www.fao.org/faostat/en/#data/FBS">FAOSTAT FBS</a></details>`;
}

/** A reported national MY balance, kept apart from the main calendar-year QCL
 * comparison. Never substitute TY trade or the adjacent New Post column. */
export function renderWestGainReference(topic:string,code:string){
 const row=code===gain.country?gain.records.find(record=>record.topic===topic):undefined;if(!row)return '';
 const unit='千t',supply=[{label:'国内生産',value:row.production},{label:'輸入（MY）',value:row.importsMY},{label:'期首在庫',value:row.beginningStocks}];
 const uses=[{label:row.domesticLabel,value:row.domesticUse},{label:'輸出（MY）',value:row.exportsMY},{label:'期末在庫',value:row.endingStocks}];
 const breakdown=row.feedAndResidual===null?'<p>米の国内側は「利用・残差」の公表合計です。食用・飼料等の内訳を0として補いません。</p>':`<p>国内利用の内訳：飼料・残差 ${number(row.feedAndResidual)}、食用・種子・工業用（FSI）${number(row.foodSeedIndustrial)} ${unit}。飼料・残差を全て飼料摂取と呼ばず、FSIを全て食用と呼びません。</p>`;
 const flour=gain.flourExports;
 const destinations=topic==='wheat'?`<details class="agro-definitions" data-west-gain-flour><summary>加工品の別系列：2023/24年度の小麦粉輸出先</summary><p>小麦粉の製品重量・t。全国総輸出 ${number(flour.total)} tを分母に、公表8相手と原表のOtherを表示します。上のPSD小麦輸出 ${number(row.exportsMY)} 千tへ換算・合算しません。イラク・シリアを含む全国の全外国向けで、地域の域外輸出ではありません。Otherの域内外配分は未収録です。</p><div class="agro-table-scroll"><table><caption>同報告PDF p.20・表5・MY 2023/24列。相手見出しDestination。</caption><thead><tr><th>公表相手</th><th>小麦粉 t</th><th>全国総輸出比</th></tr></thead><tbody>${flour.partners.map(partner=>`<tr><th scope="row">${esc(partner.name)}</th><td>${number(partner.quantity)}</td><td>${(partner.quantity/flour.total*100).toFixed(2)}%</td></tr>`).join('')}</tbody></table></div><p>原表は製品重量で、原穀換算の係数は未保持。輸入小麦を加工した再輸出を国産小麦の仕向けへ割り当てず、相手国の最終用途も推測しません。</p></details>`:'';
 return `<details class="agro-definitions" data-west-gain="${esc(topic)}"><summary>別年度・原表の参考：トルコの${esc(row.label)}・2023/24販売年度需給</summary><p>2023/24販売年度（${esc(row.marketYearStart)}開始）・USDA FAS TU2025-0015、2025-05-02公表、PDF p.${row.pdfPage}「USDA Official」列。原単位1000 MT＝千t。New Post列・将来年度の0欄は採用しません。主表示のFAO 2024暦年・同版Worldへ接合しません。</p><p>公表輸出 <strong>${number(row.exportsMY)} ${unit}</strong> ／ 同表の生産との数量比 <strong>${(row.exportsMY/row.production*100).toFixed(2)}%</strong>。輸入・持越在庫・再輸出を含む年度全体の量の比較で、国産分の輸出割合ではありません。</p>${agroBand('供給（同じMYの生産・輸入・期首在庫）',supply,unit)}${agroBand('仕向け（公表国内利用・輸出・期末在庫）',uses,unit)}${breakdown}<p>国内側は原表の公表量を使用し、生産−輸出から求めません。${esc(row.basisNote)}</p><p>同版の世界分母と同製品の全相手数量は未収録です。TY輸入 ${number(row.importsTY)}・TY輸出 ${number(row.exportsTY)} 千tは期間が異なり、上のMY帯には加えません。</p>${destinations}<p><a href="${esc(gain.sourceUrl)}#page=${row.pdfPage}">USDA FAS：公開需給表</a>。公開PDF本文の表を転記・検算。PDF原本の保存は接続トンネル403で未達です。</p></details>`;
}
