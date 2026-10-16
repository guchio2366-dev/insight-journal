import {agroBand,agroEscape,agroNumber} from '../lib/atlas-agro-statistics.ts';

export function agroExistingTradeProduct(seriesId:string){
 return ({'rice-production':'rice','wheat-production':'wheat','maize-production':'maize','soybean-production':'soybean','sawnwood-production':'sawnwood','roundwood-production':'coniferous-roundwood'} as Record<string,string>)[seriesId];
}
const unitLabels:Record<string,string>={THS_M3:'千m³',THS_M3_UNDER_BARK:'千m³（樹皮なし）',THS_M3_SOLID_OVER_BARK:'千m³（樹皮あり）',percent:'%'};
const barkLabels:Record<string,string>={'under-bark':'樹皮なし','over-bark':'樹皮あり','not-stated':'資料に記載なし','not-applicable':'対象外'};
const relationLabels:Record<string,string>={'same-product':'同じ製品区分','subset-of-selected':'選択製品の部分区分','broader-product-reference':'選択より広い製品区分の参考','different-stage-reference':'別工程の参考'};
const heading=(host:HTMLElement,title:string,note:string)=>{
 const h=document.createElement('h4'),p=document.createElement('p');h.textContent=title;p.textContent=note;host.append(h,p);
};

/** Existing, verified partner series keep their own year, money/volume basis,
 * geographic coverage and product definition. They do not become FAO balances. */
export async function renderAgroExistingStatistics(content:HTMLElement,country:string,seriesId:string,showQuantities=false){
 const trade=content.querySelector<HTMLElement>('[data-agro-existing-trade]'),supply=content.querySelector<HTMLElement>('[data-agro-existing-supply]');
 if(!trade)return;
 const product=agroExistingTradeProduct(seriesId);
 if(document.querySelector('[data-east-farm-foundations]')&&showQuantities&&country&&supply){
  const {renderEastSupplyUseReference}=await import('./atlas-east-supply-use-references.ts');
  const topic=({'maize-production':'maize','rice-production':'rice','qcl-328-production':'cotton'} as Record<string,string>)[seriesId];
  if(topic)renderEastSupplyUseReference(supply,topic,country,false);
 }
 if(document.querySelector('[data-east-farm-foundations]')&&product){
  const {renderEastTrade}=await import('./atlas-east-agri-statistics.ts');
  if(showQuantities&&country){
   const {renderEastExportQuantityReference}=await import('./atlas-east-export-quantities.ts');
   renderEastExportQuantityReference(trade,product,country);
  }
  heading(trade,'確認済みの域外相手：2023年・金額','2024年のFAOSTAT生産量とは年・単位・加工段階が異なります。国選択の表も東アジア域内相手を除いた範囲です。');
  if(product==='coniferous-roundwood')heading(trade,'針葉樹丸太の別製品参考','HS440320だけの金額構成です。燃料材を含むFAO丸太総量の相手構成ではありません。');
  renderEastTrade(trade,product,country||undefined);
 }
 if(document.querySelector('[data-eu-verified-agriculture]')&&['wheat-production','soybean-production'].includes(seriesId)){
  const {default:data}=await import('../data/atlas/europe/trade_europe_2021_value_donuts.json',{with:{type:'json'}});
  const chart=data.charts.find(c=>c.id===(seriesId==='wheat-production'?'wheat_export':'soy_import'))!;
  heading(trade,'欧州地域の別範囲参考','以下は選択国全国の相手構成ではありません。2021年・域外貿易額の地域表で、2024年の国別FAO数量と合算しません。');
  let offset=0;const colors=['#b89138','#608ba3','#688c69','#b7b7a6'];
  const stops=chart.segments.map((segment,index)=>{const start=offset;offset+=segment.share_pct;return `${colors[index]} ${start}% ${offset}%`;});
  const card=document.createElement('section');card.innerHTML=`<h4>${agroEscape(chart.title_ja)}</h4><p>${chart.year}年 · HS ${agroEscape(chart.hs_code)} · ${agroEscape(chart.unit)} · 対象${chart.reporters_queried}報告国・地域（World製品行${chart.reporters_with_product_world_record}）</p><div class="agro-partner-pie" role="img" aria-label="${agroEscape(chart.segments.map(s=>s.label_ja+' '+s.share_pct.toFixed(1)+'%').join('、'))}" style="background:conic-gradient(${stops.join(',')})"></div><ul>${chart.segments.map(s=>`<li>${agroEscape(s.label_ja)} ${s.share_pct.toFixed(1)}%</li>`).join('')}</ul><p>分母 ${agroNumber(chart.denominator_usd)} USD。${agroEscape(chart.denominator_description_ja)}</p><details><summary>地域・数量の限界と出典</summary><p>${agroEscape(chart.scope_note_ja)}</p><p>${agroEscape(chart.weight_warning_ja)}</p><p>${agroEscape(chart.interpretation_note_ja)}</p><a href="${agroEscape(chart.source_url)}">UN Comtrade原表</a></details>`;trade.append(card);
 }
 if(document.querySelector('[data-west-farm-supply]')){
  const key=seriesId==='wheat-production'?'wheat':seriesId.includes('olive')?'olive':seriesId.includes('date')?'dates':'';
  const selector=key==='wheat'?'[data-west-wheat-trade]':key==='olive'?'[data-west-food-trade="olivePreserved"]':key==='dates'?'[data-west-food-trade="dates"]':'';
  const target=selector?document.querySelector<HTMLElement>(selector):null;
  if(target&&!target.closest('[hidden]')){
   target.id=`agro-reference-west-${key}`;
   heading(trade,'西アジア地域の確認済み相手表','選択国全国の相手構成とは別範囲です。2023年・t・域内取引を除いた、品目別の部分報告国集計を参照します。');
   const a=document.createElement('a');a.href='#'+target.id;a.dataset.agroReferenceLink='';a.textContent=key==='wheat'?'原穀小麦（CPC0111）：輸入16／輸出9報告国の円・相手表を読む':key==='olive'?'保存オリーブ（F0262）、原料果実（01450）、油（2167）を分けた円・相手表を読む':'ナツメヤシ（CPC01314）：輸入14／輸出13報告国の円・相手表を読む';trade.append(a);
  }
 }
 if(document.querySelector('[data-south-central-farm-connections]')&&country==='IND'&&seriesId==='rice-production'){
  const {renderSouthCentralRiceFlow}=await import('./atlas-south-central-rice-flow.ts');
  const wrapper=document.createElement('section');wrapper.innerHTML='<div data-south-central-supply></div><div data-south-central-destinations></div>';
  renderSouthCentralRiceFlow(wrapper,'south-central-asia','rice','IND',undefined,showQuantities);
  heading(trade,'インド・バスマティ米の確認済み輸出先','2023–24年度・t。分母はバスマティ米5,242,182tで、米全体16,358,885tでもFAO2024籾米生産でもありません。輸入元は未収録です。');
  trade.append(...wrapper.querySelector('[data-south-central-destinations]')!.childNodes);
  if(supply){heading(supply,'別定義参考：2023–24年度の米輸出内訳','全米輸出のうちバスマティ米／その他の米を区別する既存公表量です。国内用途・在庫の帯とは呼びません。');supply.append(...wrapper.querySelector('[data-south-central-supply]')!.childNodes);}
 }
 if(supply&&document.querySelector('[data-eu-verified-agriculture]')){
  const {existingEuropeForestryReferences}=await import('../data/atlas/agro-existing-europe-statistics.ts');
  for(const reference of existingEuropeForestryReferences(country,seriesId)){
   const section=document.createElement('section');section.className='agro-existing-forest';
   heading(section,`${reference.countryName} · ${reference.productLabel}`,`${reference.year}年 · ${reference.scope} · ${unitLabels[reference.unit]} · 樹皮基準 ${barkLabels[reference.barkBasis]} · ${relationLabels[reference.selectionRelation]}`);
   const get=(role:string)=>reference.rows.find(row=>row.role===role)?.value;
   if(reference.kind==='balance'){
    section.innerHTML+=agroBand('供給（Eurostat原製品・在庫未調整）',[{label:'生産',value:get('production')!},{label:'輸入',value:get('imports')!}], '千m³');
    section.innerHTML+=agroBand('仕向け比較（実消費・最終用途ではない）',[{label:'見かけ消費',value:get('derived-apparent-consumption')!},{label:'輸出',value:get('exports')!}], '千m³');
   }else section.innerHTML+=agroBand('元の対象内の構成',reference.rows.filter(row=>row.role==='component').map(row=>({label:row.label,value:row.value!})),reference.unit==='percent'?'%':'千m³');
   section.innerHTML+=`<ul>${reference.rows.map(row=>`<li>${agroEscape(row.label)}：${agroNumber(row.value)} ${agroEscape(unitLabels[reference.unit])}${row.flag?' · 原区分 '+agroEscape(row.flag):''}</li>`).join('')}</ul>${reference.notes.map(note=>'<p>'+agroEscape(note)+'</p>').join('')}<a href="${agroEscape(reference.source.url)}">${agroEscape(reference.source.dataset+' '+reference.source.title)}</a>`;
   if(reference.detailRows||reference.byproducts){
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='原階層値と別掲副産物（構成帯へ再加算しない）';details.append(summary);
    for(const rows of [reference.detailRows,reference.byproducts])if(rows){const list=document.createElement('ul');list.innerHTML=rows.map(row=>`<li>${agroEscape(row.label)}：${agroNumber(row.value)} ${agroEscape(unitLabels[reference.unit])}${row.flag?' · 原記号 '+agroEscape(row.flag):''}</li>`).join('');details.append(list);}section.append(details);
   }
   supply.append(section);
  }
 }
}
