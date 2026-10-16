import {syncAgroStatistics} from './atlas-agro-statistics.ts';
import {agroEscape as esc,agroNumber as number,agroTopicSeries,renderAgroMarketingProduction} from '../lib/atlas-agro-statistics.ts';
import {regionNames,type State} from '../data/atlas/africa-atlas.ts';
import regional from '../data/atlas/africa-regional-statistics.json' with {type:'json'};
import marketing from '../data/atlas/africa-agro-marketing-year.json' with {type:'json'};
import trade from '../data/atlas/africa-maize-trade-reference.json' with {type:'json'};

type Selection=Pick<State,'field'|'overview'|'place'|'region'|'topic'|'crop'|'livestock'>;
const selectionTopic=(state:Selection)=>state.topic==='forestry'?'forest':state.topic==='livestock'?state.livestock:state.crop;
export function africaAgroMode(state:Selection){
 if(state.field!=='agriculture'||state.overview)return null;
 const ids=agroTopicSeries(selectionTopic(state));
 return !state.place?'region':marketing.records.some(row=>row.countryCode===state.place&&ids.includes(row.seriesId))?'marketing':'national';
}
const percentage=(value:number)=>value.toLocaleString('ja-JP',{maximumFractionDigits:2})+'%';
const stages=(production:string,use:string,destinations:string)=>`<div class="agro-columns"><section data-agro-stage="production">${production}</section><section data-agro-stage="use">${use}</section><section data-agro-stage="destinations">${destinations}</section></div>`;
const forestProducts=[{id:'roundwood',label:'丸太（燃料材を含む）',unit:'m³',definition:'伐採して搬出した丸太。製材・パルプの原料となる段階。'},{id:'sawnwood',label:'製材',unit:'m³',definition:'丸太を挽いた製品段階。丸太量と二重に加算しない。'},{id:'wood-pulp',label:'木材パルプ',unit:'t',definition:'木材を繊維化した製品段階。体積から重量への換算や歩留まりを推定しない。'}];
function forestGap(){
 return `<p>地域の同年生産・World対応行は未収録です。</p><ul>${forestProducts.map(product=>`<li><strong>${product.label} · ${product.unit}</strong>：${product.definition} 生産量・世界比は未収録。</li>`).join('')}</ul>`;
}
type MarketingRow=(typeof marketing.records)[number];
function marketingUse(row:MarketingRow){
 const supply=Number((row.production+row.imports+row.beginningStocks).toFixed(2));
 const uses=Number((row.domesticUse+row.exports+row.endingStocks).toFixed(2)),scale=Math.max(supply,uses);
 type Part={label:string;value:number;color:string};
 const band=(title:string,parts:Part[])=>`<figure class="agro-band" data-africa-supply-denominator="${supply}"><figcaption>${title} · ${number(parts.reduce((sum,part)=>sum+part.value,0))} ${row.unit}</figcaption><div class="agro-track" role="img" aria-label="${esc(title+'：総供給 '+number(supply)+' '+row.unit+' を100%。'+parts.map(part=>part.label+' '+number(part.value)+' '+row.unit+'（'+percentage(part.value/supply*100)+'）').join('、'))}">${parts.map(part=>`<span style="width:${part.value/scale*100}%;background:${part.color}"></span>`).join('')}<i class="africa-supply-limit" style="left:${supply/scale*100}%" aria-hidden="true"></i></div><ul class="agro-key">${parts.map(part=>`<li><i style="background:${part.color}" aria-hidden="true"></i>${part.label} <strong>${number(part.value)} ${row.unit} · ${percentage(part.value/supply*100)}</strong></li>`).join('')}</ul></figure>`;
 return `<h3>② 国内利用と輸出</h3><p class="agro-meta">${row.year}販売年度 · ${row.unit}</p><p>輸出量 <strong>${number(row.exports)} ${row.unit}</strong> · 生産量との比 <strong>${percentage(row.exports/row.production*100)}</strong></p><p>両帯の割合は、総供給 <strong>${number(supply)} ${row.unit}</strong>を100%とします。</p>${band('供給元',[{label:'国内生産',value:row.production,color:'#3d7666'},{label:'輸入',value:row.imports,color:'#b98046'},{label:'期首在庫',value:row.beginningStocks,color:'#a8aeab'}])}${band('仕向け（輸入・持越在庫込み）',[{label:'国内利用',value:row.domesticUse,color:'#4a7291'},{label:'輸出',value:row.exports,color:'#9c6b8c'},{label:'期末在庫',value:row.endingStocks,color:'#a8aeab'}])}${row.roundingGap!==0?`<p class="agro-meta">公表丸め差 ${row.roundingGap>0?'+':''}${number(row.roundingGap)} ${row.unit}は帯の用途へ加算せず、総供給の100%線との差を保持します。</p>`:''}<p class="agro-meta">国内利用は食用だけではありません。国産分の国内利用・輸出を追跡した比率ではありません。全国輸出はアフリカ域内向けを含み得ます。</p><p>国内利用の内数：飼料（原表Feed） <strong>${number(row.domesticFeed)} ${row.unit}</strong>。食用・加工等の残りの用途内訳は未収録です。</p>`;
}
function tradeReference(){
 return `<details data-africa-trade-reference class="agro-other-reference"><summary>別期間・商品範囲の参考：2024年の輸出先数量</summary><p>南アフリカ全国 · 2024暦年 · HS1988/92 100590（種子を除くとうもろこし） · 総輸出。①②の2024/25販売年度とは期間・商品範囲が異なります。</p><p>公表World輸出数量が空欄のため、輸出総量・構成比・円は算出しません。数量のある相手行の上位5件を数量順に示します。</p><table><caption>南アフリカ→相手国 · t（原表kg÷1,000）</caption><thead><tr><th scope="col">相手</th><th scope="col">数量 t</th></tr></thead><tbody>${trade.topQuantityRows.map(row=>`<tr><th scope="row">${esc(row.partner)}</th><td>${number(Number(row.quantity)/1000)}</td></tr>`).join('')}</tbody></table><p>この5か国はアフリカ域内の相手です。アフリカ域外輸出ではありません。通関上の仕向け先は最終消費地とは限らず、再輸出は分離できません。</p><a href="${esc(trade.url)}">World Bank WITS / UN Comtrade · 全相手の公開表</a></details>`;
}
export function renderAfricaMarketingStatistics(state:Selection){
 const row=marketing.records.find(row=>row.countryCode===state.place&&agroTopicSeries(selectionTopic(state)).includes(row.seriesId));
 if(!row)return '';
 const use=marketingUse(row);
 return `<h2>${esc(row.countryName)} · ${esc(row.label)}</h2><p class="agro-flow-period">全国収支 · ${row.year}販売年度 · ${row.unit}。アフリカ地域合計とは別の統計です。</p>${stages(renderAgroMarketingProduction(row),use,`<h3>③ 輸出先の量と構成比</h3><p class="agro-flow-gap">同じ販売年度・商品範囲の全相手数量は未収録です。</p>${row.countryCode==='ZAF'?tradeReference():''}`)}<p class="agro-meta"><a href="${esc(row.source.url)}#page=${row.source.page}">USDA WASDE-675 p.${row.source.page} · ${row.source.releaseDate}公表</a></p><details class="agro-definitions"><summary>数量・期間・World分母・原表</summary>${row.notes.map(note=>`<p>${esc(note)}</p>`).join('')}<p>生産 ${number(row.production)}＋輸入 ${number(row.imports)}＋期首在庫 ${number(row.beginningStocks)}／国内利用 ${number(row.domesticUse)}＋輸出 ${number(row.exports)}＋期末在庫 ${number(row.endingStocks)} ${row.unit}。公表丸め差 ${number(row.roundingGap)} ${row.unit}。</p><pre>${esc(row.rawLine)}\n${esc(row.worldRawLine)}</pre><p>保存原文 ${esc(row.source.path)} · SHA-256 ${row.source.sha256}</p></details>`;
}
export function africaRegionalProductIds(state:Selection){
 const topic=selectionTopic(state);
 return topic==='cattle'?['cattle-meat','cattle-milk']:topic==='goats'?['goats-meat']:topic==='sheep'?['sheep-meat']:[topic];
}
export function renderAfricaRegionalStatistics(state:Selection,chosen=''){
 const rows=regional.regions[state.region],ids=africaRegionalProductIds(state),row=rows.find(row=>row.id===(ids.includes(chosen)?chosen:ids[0]));
 const forest=selectionTopic(state)==='forest',name=regionNames[state.region];
 const production=row?.regional?Number(row.regional.rawValue):null,world=row?.world?Number(row.world.rawValue):null;
 const share=production!==null&&world!==null&&world>0?production/world*100:null;
 const primary=`<h3>① 生産量と世界シェア</h3>${forest?forestGap():`<p>${esc(row?.label??selectionTopic(state))} · 2024暦年 · t</p><p>地域生産：<strong>${number(production)} t</strong></p>${share===null?'<p class="agro-flow-gap">同年・同品目の地域とWorld対応行は未収録です。</p>':`<div class="agro-world-pie" role="img" aria-label="${esc(name)}の世界生産比 ${percentage(share)}" style="background:conic-gradient(#3d7666 ${share}%,#e3e1d7 0)"><span>${percentage(share)}</span></div><p>世界シェア <strong>${percentage(share)}</strong> · 公表World ${number(world)} t</p><p class="agro-meta">地域原表 ${esc(row!.regional!.flag)}：${row!.regional!.flag==='E'?'推計':'原資料区分'} ／ World ${esc(row!.world!.flag)}</p>`}`}`;
 const picker=ids.length>1?`<label>統計の生産品目 <select data-africa-stat-series>${ids.map(id=>`<option value="${id}"${id===row?.id?' selected':''}>${esc(rows.find(row=>row.id===id)?.label??id)}</option>`).join('')}</select></label>`:'';
 const notes=forest?'<p>丸太・製材・木材パルプは異なる加工段階です。m³とtを足さず、同じm³でも丸太と製材を合算しません。森林面積や地図の樹木被覆から生産量を作りません。</p>':`<p>${esc(regional.method)}</p>${row?`<p>地域コード ${regional.regionCodes[state.region]}／World 5000。QCL item ${esc(row.regional?.itemCode??row.world?.itemCode??'未収録')} · element 5510 · t。</p><p>地域原値 ${esc(row.regional?.rawValue??'未収録')}／World原値 ${esc(row.world?.rawValue??'未収録')}。欠測を0や別年で補いません。</p>`:''}`;
 return `<h2>${esc(name)} · ${forest?'林産物':esc(row?.label??selectionTopic(state))}</h2>${picker}<p class="agro-meta">地域の公表集計と国別統計を区別します。分布地図の年・量種とは異なります。</p>${stages(primary,'<h3>② 域内使用と域外輸出</h3><p class="agro-flow-gap">同じ期間・単位・商品範囲の域内使用、域外輸入・輸出、在庫原表は未収録です。</p><p>生産−輸出を消費とせず、国別総輸出を足して域外輸出と呼びません。</p>','<h3>③ 域外輸出先の量と構成比</h3><p class="agro-flow-gap">地域内相手を除外できる全報告国・全相手の数量表は未収録です。構成比は算出しません。</p>')}<details class="agro-definitions"><summary>定義・原値・出典</summary>${notes}<a href="${forest?'https://www.fao.org/forestry/statistics/data/en':regional.source.url}">${forest?'FAO森林統計：製品と原表の入口':'FAOSTAT QCL · 保存済み2025-12-31版 · CC BY 4.0'}</a></details>`;
}
const instances=new WeakMap<HTMLElement,{key:string;chosen:string;state:Selection}>();
const listening=new WeakSet<HTMLElement>();
/** Africa-only override. The published unselected overview and shared code stay intact. */
export function syncAfricaAgroStatistics(root:HTMLElement,state:Selection){
 const mode=africaAgroMode(state),host=root.querySelector<HTMLElement>('[data-africa-selected-agro]');
 const custom=!!host&&(mode==='region'||mode==='marketing');
 syncAgroStatistics(root,{country:state.place,topic:selectionTopic(state),active:mode!==null&&!custom});
 if(!host)return;
 host.hidden=!custom;
 if(!custom){host.replaceChildren();instances.delete(host);return;}
 const key=[state.place,state.region,state.topic,state.crop,state.livestock].join(':');
 let instance=instances.get(host);
 if(!instance){instance={key,chosen:'',state};instances.set(host,instance);}
 if(!listening.has(host)){listening.add(host);host.addEventListener('change',event=>{const target=event.target as HTMLSelectElement,current=instances.get(host);if(!current||!target.matches('[data-africa-stat-series]'))return;current.chosen=target.value;const focus=target.ownerDocument.activeElement===target;host.innerHTML=renderAfricaRegionalStatistics(current.state,current.chosen);if(focus)host.querySelector<HTMLSelectElement>('[data-africa-stat-series]')?.focus();});}
 if(instance.key!==key){instance.key=key;instance.chosen='';}
 instance.state={...state};
 // Keep expanded definitions and keyboard focus through unchanged async map renders.
 if(host.dataset.africaStatKey===key&&host.childElementCount)return;
 host.dataset.africaStatKey=key;
 host.innerHTML=mode==='marketing'?renderAfricaMarketingStatistics(state):renderAfricaRegionalStatistics(state,instance.chosen);
 host.dataset.africaStatReady='true';
}
