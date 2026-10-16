import retained from '../data/atlas/east-asia-export-quantities.json';
import {agroEscape} from '../lib/atlas-agro-statistics.ts';

/** National gross exports. No regional total, FAO product alias, year fallback
 * or inferred OAS-to-FAO-country correspondence is offered by this adapter. */
export function eastExportQuantities(country:string,topic:string){
 if(!['CHN','KOR','MNG','PRK','TWN'].includes(country))return undefined;
 const reporter=country==='TWN'?'OAS':country;
 const row=retained.records.find(r=>r.reporter===reporter&&r.topic===topic);
 return row?structuredClone(row):undefined;
}
const number=(value:number|null)=>value===null?'未収録':value.toLocaleString('ja-JP',{maximumFractionDigits:3});
const percent=(value:number,total:number)=>`${(value/total*100).toLocaleString('ja-JP',{maximumFractionDigits:2})}%`;
const names:Record<string,string>={'China':'中国本土','Japan':'日本','Korea, Rep.':'韓国','Korea, Dem. Rep.':'北朝鮮','Hong Kong, China':'香港',Macao:'マカオ',Mongolia:'モンゴル','United States':'米国',Australia:'豪州',Vietnam:'ベトナム',Malaysia:'マレーシア'};
const name=(value:string)=>names[value]??value;
const countries:Record<string,string>={CHN:'中国本土',KOR:'韓国',MNG:'モンゴル',PRK:'北朝鮮',TWN:'Other Asia, nes（原表の報告区分）'};
const stages:Record<string,string>={
 rice:'籾・玄米・精米・砕米を合算した通関重量です。籾米生産や精米換算需給から差し引かず、加工歩留まりも推定しません。',
 wheat:'メスリンを含むHS1001です。小麦粉は含まず、FAO小麦や別販売年度の輸出量の内訳へ接続しません。',
 maize:'種子を含むHS1005です。別販売年度の子実需給や飼料・加工用途の内訳へ接続しません。',
 soybean:'油・油かすを含まない丸大豆です。輸入原料や再輸出の由来、国内の食用・飼料・搾油用途は追跡できません。',
 sawnwood:'HS4407の厚さ6mm超の製材です。FAO製材の同年輸出と値・分類が異なり、その内訳へ付け替えません。丸太・パルプへ体積換算しません。',
 'coniferous-roundwood':'HS440320の未処理針葉樹原木だけです。燃料材を含む丸太全体の輸出先とは異なります。製材・パルプは別工程です。',
};

/** Selected-product reference only. The established overview stays byte-for-byte
 * unchanged unless the caller explicitly requests this additional reference. */
export function renderEastExportQuantityReference(host:HTMLElement,topic:string,country:string){
 if(!stages[topic]||!countries[country])return;
 const card=host.ownerDocument.createElement('section');card.className='east-export-quantities';
 card.dataset.eastExportQuantities=topic;
 const model=eastExportQuantities(country,topic),escape=agroEscape;
 const title=`${countries[country]} · 2023暦年の輸出先数量（別資料参考）`;
 if(!model){card.innerHTML=`<h4>${escape(title)}</h4><p>同品目の輸出相手原表は未収録です。輸出0とは判断せず、他国・他品目の数量で補いません。</p>`;host.append(card);return;}
 const total=model.world,complete=model.status==='complete',canShare=complete&&total!==null&&total>0;
 const rows=[...model.partners].sort((a,b)=>(b.value??-1)-(a.value??-1)||a.name.localeCompare(b.name));
 const top=rows.slice(0,5).map(r=>({...r}));
 if(canShare&&rows.length>5)top.push({name:'その他の収録相手',value:rows.slice(5).reduce((sum,r)=>sum+r.value!,0),boundary:'mixed'});
 const colors=['#3d7666','#b98046','#7b8ca7','#9c6b8c','#8a9857','#b2b8ad'];let offset=0;
 const stops=canShare?top.map((row,i)=>{const start=offset;offset+=row.value!/total!*100;return `${colors[i]} ${start}% ${offset}%`;}):[];
 const partition=complete?['inside','outside','unknown'].map(boundary=>model.partners.filter(r=>r.boundary===boundary).reduce((sum,r)=>sum+r.value!,0)):null;
 card.innerHTML=`<h4>${escape(title)}</h4><p>H0 HS${escape(model.product)} · ${escape(model.label)} · ${escape(model.unit)}。国・報告区分の対世界総輸出 <strong>${number(total)} ${escape(model.unit)}</strong>。</p><p>${escape(stages[topic])}</p>${canShare?`<div class="agro-partner-pie" role="img" aria-label="${escape(top.map(r=>name(r.name)+' '+number(r.value)+' '+model.unit+' '+percent(r.value!,total!)).join('、'))}" style="background:conic-gradient(${stops.join(',')})"></div><ul class="agro-key">${top.map((row,i)=>`<li><i aria-hidden="true" style="background:${colors[i]}"></i>${escape(name(row.name))} <strong>${number(row.value)} ${escape(model.unit)} · ${percent(row.value!,total!)}</strong></li>`).join('')}</ul>`:`<p>${complete?'公表総輸出が0のため割合の円は描きません。':'World数量または相手数量が欠測のため、構成比と円は作りません。確認できた行は下表に残します。'}</p>`}<p>国の外国向け輸出には東アジア内の相手も含みます。地域全体の域外輸出とは別です。${partition?`相手行の集計：東アジア内 ${number(partition[0])}、東アジア外 ${number(partition[1])}、相手不明 ${number(partition[2])} ${escape(model.unit)}。`:''}</p><details class="agro-definitions"><summary>全${rows.length}相手の数量・対象・公表値の差</summary><p>分母は同じWITS表のWorld総輸出です。相手行合計−World：${number(model.partnerRoundingGap)} ${escape(model.unit)}。差は架空のその他へ割り当てません。</p><div class="agro-table-scroll"><table><thead><tr><th scope="col">相手</th><th scope="col">${escape(model.unit)}</th><th scope="col">対世界輸出比</th></tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${escape(name(row.name))}</th><td>${number(row.value)}</td><td>${canShare?percent(row.value!,total!):'算出せず'}</td></tr>`).join('')}</tbody></table></div><p>域内判定は中国本土・日本・韓国・北朝鮮・モンゴル・Other Asia, nes・香港・マカオ。域外小計に域内取引を算入しません。Other Asia, nesは原表区分のまま表示し、FAO台湾生産と接合しません。</p><p>総輸出は再輸出を含み得る通関量で、原産地や最終消費地、輸出先での用途は示しません。数量で並べ替え、金額順位を流用しません。</p><a href="${escape(model.source.url)}">World Bank WITS / UN Comtrade：原相手表</a></details>`;
 if(topic==='sawnwood'||topic==='coniferous-roundwood'){
  const note=host.ownerDocument.createElement('p');note.textContent='パルプの国別生産・輸入・輸出・同製品World・全相手原行は未収録です。パルプの重量tと丸太・製材の体積m³を合算せず、生産能力も実生産量へ置き換えません。';card.append(note);
 }
 host.append(card);
}
