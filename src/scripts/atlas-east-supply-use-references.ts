import retained from '../data/atlas/east-asia-supply-use-references.json';
import {agroBand,agroEscape} from '../lib/atlas-agro-statistics.ts';

export function eastSupplyUseReference(country:string,topic:string){
 if(!['CHN','KOR'].includes(country))return undefined;
 const row=retained.records.find(r=>r.countryCode===country&&r.topic===topic);
 return row?structuredClone(row):undefined;
}

/** Closed source reference in the regional reading; a common caller may pass
 * collapsed=false inside its existing closed reference wrapper. */
export function renderEastSupplyUseReference(host:HTMLElement,topic:string,country:string,collapsed=true){
 const model=eastSupplyUseReference(country,topic);if(!model)return;
 const e=agroEscape,unit=e(model.unit),raw=model.rawValues as Record<string,string>,values=model as unknown as Record<string,unknown>;
 const rows=[['production','生産'],['imports','輸入'],['beginningStocks','期首在庫'],['domesticUse','国内利用合計'],['exports','輸出'],['endingStocks','期末在庫'],...('feed' in model?[['feed','飼料（国内利用の内数）']]:[]),...('lossAdjustment' in model?[['lossAdjustment','Loss（符号付き・帯の外）']]:[])];
 const primaryBasis=model.topic==='rice'?'QCL籾米':model.topic==='cotton'?'QCL種子綿':'2024暦年QCLとうもろこし';
 const useGap=model.topic==='cotton'?'工程別の国内用途・損耗の詳細は未収録で、食料需給の表ではありません。':'食用・加工・損耗の詳細は未収録です。';
 const card=host.ownerDocument.createElement(collapsed?'details':'section');card.className='east-supply-use-reference';card.dataset.eastSupplyUseReference=model.seriesId;
 if(collapsed)card.innerHTML='<summary>別期間・製品の国別需給参考（WASDE販売年度）</summary>';
 card.innerHTML+=`<h4>${e(model.countryName)} · ${e(model.label)} · ${model.year}販売年度</h4><p>単位：${unit}。同じ表の生産 ${e(raw.production)} ／ World ${e(model.worldProductionRawValue)}。世界シェア ${(model.production/model.worldProduction*100).toFixed(2)}%。</p><p>${model.exportsRoundedZero?'輸出 0.00 は公表丸め値です。厳密なゼロ・取引不存在や厳密な輸出／生産比を示しません。':`輸出 ${e(raw.exports)} ${unit} ／ 生産との数量比 ${(model.exports/model.production*100).toFixed(2)}%。国産分の輸出割合ではありません。`}</p>${agroBand('供給全体（輸入と期首在庫を含む）',[{label:'生産',value:model.production},{label:'輸入',value:model.imports},{label:'期首在庫',value:model.beginningStocks}],model.unit)}${agroBand('公表仕向け（国内利用・輸出・期末在庫）',[{label:'国内利用合計',value:model.domesticUse},{label:'輸出（公表丸め値）',value:model.exports},{label:'期末在庫',value:model.endingStocks}],model.unit)}<p>${useGap}輸入原料や持越在庫の由来は追跡できず、国産分の仕向けの二分ではありません。${'feed' in model?'飼料 '+e(raw.feed)+' '+unit+' は国内利用 '+e(raw.domesticUse)+' の内数で、帯に再加算しません。':''}</p><div class="agro-table-scroll"><table><thead><tr><th scope="col">公表区分</th><th scope="col">${unit}</th></tr></thead><tbody>${rows.map(([key,label])=>`<tr><th scope="row">${e(label)}</th><td>${e(raw[key]??String(values[key]))}</td></tr>`).join('')}</tbody></table></div><p>供給−国内利用−輸出−期末在庫${'lossAdjustment' in model?'−Loss':''}：${model.roundingGap.toFixed(2)} ${unit}。原表の差を架空の用途へ加算しません。</p><p>①の${primaryBasis}や、③の2023暦年HS相手数量とは、期間・製品基準が異なる参考です。同販売年度・同製品の全相手数量は未収録です。</p>${model.notes.map(note=>'<p>'+e(note)+'</p>').join('')}<p>USDA WASDE-675 p.${model.source.page}。<a href="${e(model.source.url)}">公式TXT</a>。保存原文 SHA-256 ${e(model.source.sha256)}。</p>`;
 host.append(card);
}
