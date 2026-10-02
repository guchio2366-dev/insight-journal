import type {MexicoPopulationState, MexicoPopulationRow} from '../lib/atlas-mexico-population';
import {formatMexicoPopulation} from '../lib/atlas-mexico-population';
import {mexicoCompositionMetric,formatMexicoCompositionShare,formatMexicoCompositionCountKey,mexicoCompositionColor,mexicoCompositionRadius,mexicoCompositionShareBins,mexicoCompositionComparisonUrl,mexicoCompositionReturnUrl,type MexicoCompositionData,type MexicoCompositionSelection,type MexicoCompositionRecord,type MexicoCompositionInterval} from '../lib/atlas-mexico-population-composition';

const nativeMarkup=new WeakMap<HTMLElement,{viewOptions:Node[];symbolKeys:Node[];mapDescription:string;attributes:{element:Element;attributes:Record<string,string|null>;title:string|null}[]}>();
export function captureMexicoPopulationComposition(root:HTMLElement):void {
 if(nativeMarkup.has(root))return;
 nativeMarkup.set(root,{viewOptions:Array.from(root.querySelector('[data-population-view]')?.childNodes??[]),symbolKeys:Array.from(root.querySelector('[data-population-map-symbol-key]')?.childNodes??[]),mapDescription:root.querySelector('[data-population-map] desc')?.textContent??'',attributes:Array.from(root.querySelectorAll('[data-population-state-shape],[data-population-state-symbol],[data-population-state-symbol] circle')).map(element=>({element,attributes:Object.fromEntries(['r','aria-label'].map(attribute=>[attribute,element.getAttribute(attribute)])),title:element.querySelector('title')?.textContent??null}))});
}
export function restoreMexicoPopulationComposition(root:HTMLElement):void {
 const original=nativeMarkup.get(root);if(!original)return;
 root.querySelector('[data-population-view]')?.replaceChildren(...original.viewOptions);root.querySelector('[data-population-map-symbol-key]')?.replaceChildren(...original.symbolKeys);
 const desc=root.querySelector('[data-population-map] desc');if(desc)desc.textContent=original.mapDescription;
 for(const record of original.attributes){for(const [attribute,value]of Object.entries(record.attributes))if(value===null)record.element.removeAttribute(attribute);else record.element.setAttribute(attribute,value);const title=record.element.querySelector('title');if(title&&record.title!==null)title.textContent=record.title;}
 for(const selector of ['.population-state-summary','[data-population-reading-heading]','[data-population-map-heading]','.population-national-summary','[data-population-table]','.population-key-notes','[data-population-scale-link]']){const node=root.querySelector<HTMLElement>(selector);if(node)node.hidden=false;}
 const view=root.querySelector<HTMLSelectElement>('[data-population-view]');if(view)view.disabled=false;
 const label=root.querySelector('[data-population-only-label]');if(label)label.textContent='選んだ州のデータだけ';
}

export function renderMexicoPopulationComposition(root:HTMLElement,data:MexicoCompositionData,state:MexicoPopulationState,selection:MexicoCompositionSelection,rows:MexicoPopulationRow[]):boolean {
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector);
 const text=(selector:string,value:string)=>{const node=q(selector);if(node)node.textContent=value;};
 const show=(selector:string,visible:boolean)=>{const node=q<HTMLElement>(selector);if(node)node.hidden=!visible;};
 const metric=mexicoCompositionMetric(data,state.category,selection.metric),active=!!metric;
 root.dataset.populationComposition=String(active);
 for(const selector of ['[data-population-composition-hero]','[data-population-composition-reading]','[data-population-composition-key]','[data-population-composition-selector]','[data-population-composition-table]'])show(selector,active);
 if(!metric)return false;
 const record=metric.states[state.state],selected=rows.find(row=>row.stateCode===state.state)!;
 const source=selection.compare&&selection.sourceQuery?new URL(selection.sourceQuery,location.href):null,sourceState=source?.searchParams.get('state')??state.state;
 const sourceMeasure=source?.searchParams.get('compositionMeasure')==='count'?'count':'share',sourceOnly=source?.searchParams.get('only')==='1';
 const compared=selection.compare,showShare=selection.measure==='share'||compared,showCount=selection.measure==='count'||compared;
 const colorOnly=compared&&sourceMeasure==='share'?sourceOnly:state.only,colorState=compared&&sourceMeasure==='share'?sourceState:state.state;
 const countOnly=compared&&sourceMeasure==='count'?sourceOnly:state.only,countState=compared&&sourceMeasure==='count'?sourceState:state.state;
 const percent=(entry:MexicoCompositionRecord)=>formatMexicoCompositionShare(entry,metric);
 const interval=(value:MexicoCompositionInterval|undefined,unit:string,precision=6)=>value?.lower!==null&&value?.lower!==undefined&&value?.upper!==null&&value?.upper!==undefined?`${value.lower.toLocaleString('ja-JP',{maximumFractionDigits:precision})}–${value.upper.toLocaleString('ja-JP',{maximumFractionDigits:precision})}${unit}`:'未取得';
 const count=(entry:MexicoCompositionRecord)=>formatMexicoPopulation(entry.count,entry.status);
 const selectedDescription=`${selected.nameJa}：${metric.label} ${count(record)}人、${percent(record)}。分母：${metric.countDenominatorLabel}`;
 const metricSelect=q<HTMLSelectElement>('[data-population-composition-metric]');
 if(metricSelect){metricSelect.replaceChildren(...data.metrics.filter(item=>item.category===state.category).map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.label;return option;}));metricSelect.value=metric.id;metricSelect.disabled=compared;metricSelect.title=compared?'元の指標を保って比較します。戻ると別の指標を選べます。':'';}
 const view=q<HTMLSelectElement>('[data-population-view]');if(view){view.replaceChildren(...[['share','割合（色）'],['count','人数（円）']].map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));view.value=selection.measure;view.disabled=compared;}
 for(const selector of ['[data-population-unavailable]','[data-population-distribution-reading]','[data-population-reference]','[data-population-reference-values]','[data-population-density-key]','[data-population-symbol-key]','[data-population-scale-reading]','[data-population-scale-link]','.population-state-summary','[data-population-reading-heading]','.population-national-summary','[data-population-table]','.population-key-notes'])show(selector,false);
 root.classList.toggle('is-comparison',compared);
 q('[data-population-symbols]')?.toggleAttribute('hidden',!showCount);q('[data-population-map-symbol-key]')?.toggleAttribute('hidden',!showCount);
 const estimateSuffix=metric.isEstimate&&!metric.label.includes('推計')?'（公式推計）':'';
 const title=`${data.referenceYear}年・${metric.label}${estimateSuffix}${compared?'の割合と人数':selection.measure==='share'?'の割合':'の人数'}`;
 text('[data-population-map-heading]',title);text('[data-population-map] title',title);
 text('[data-population-map] desc',`${metric.definition} ${showShare?'色は各州の割合。':''}${showCount?'円の面積は公表人数。':''}分母は${metric.countDenominatorLabel}。統計${data.referenceYear}年、表示州境2025年。州選択と全32州表で値を読めます。`);
 for(const shape of root.querySelectorAll<SVGPathElement>('[data-population-state-shape]')){
  const code=shape.dataset.populationStateShape!,entry=metric.states[code],row=rows.find(item=>item.stateCode===code)!;
  shape.setAttribute('fill',showShare?mexicoCompositionColor(entry,metric):['value','zero'].includes(entry.status)?'#e0e7d8':'url(#mexico-population-missing)');shape.style.display=colorOnly&&code!==colorState?'none':'';
  const label=`${row.nameJa}：${metric.label} ${count(entry)}人、${percent(entry)}`;shape.setAttribute('aria-label',label);const pathTitle=shape.querySelector('title');if(pathTitle)pathTitle.textContent=label;shape.setAttribute('tabindex',colorOnly&&code!==colorState?'-1':'0');
 }
 for(const group of root.querySelectorAll<SVGGElement>('[data-population-state-symbol]')){
  const code=group.dataset.populationStateSymbol!,entry=metric.states[code],row=rows.find(item=>item.stateCode===code)!;
  group.querySelector('circle')?.setAttribute('r',String(mexicoCompositionRadius(entry,metric)));group.style.display=countOnly&&code!==countState?'none':'';group.setAttribute('tabindex',!showCount||countOnly&&code!==countState?'-1':'0');
  const label=`${row.nameJa}：${metric.label} ${count(entry)}人（円の面積）`;group.setAttribute('aria-label',label);const circleTitle=group.querySelector('title');if(circleTitle)circleTitle.textContent=label;
 }
 const key=q<SVGGElement>('[data-population-map-symbol-key]');
 if(key){const ns='http://www.w3.org/2000/svg',heading=document.createElementNS(ns,'text');heading.setAttribute('x','45');heading.setAttribute('y','476');heading.setAttribute('class','population-map-key-heading');heading.textContent='円の面積＝選択指標の人数';key.replaceChildren(heading);const values=metric.countLegendValues??[100_000,1_000_000,5_000_000];for(const [index,value]of values.entries()){const circle=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');circle.setAttribute('cx',String(70+index*135));circle.setAttribute('cy','524');circle.setAttribute('r',String(mexicoCompositionRadius({count:value,denominator:value,status:'value'},metric)));label.setAttribute('x',String(70+index*135));label.setAttribute('y','572');label.setAttribute('text-anchor','middle');label.textContent=formatMexicoCompositionCountKey(value);key.append(circle,label);}key.setAttribute('aria-label',`${metric.label}の人数円。${values.map(value=>value.toLocaleString('ja-JP')+'人').join('、')}。地図の人数円と同じ尺度。`);}
 const definitionNote=metric.category==='religion'?'宗教は調査で申告された信仰・選好の区分で、宗教実践の程度を測っていません。':metric.id==='indigenous_language'?'割合の分母は、話者だけでなく非話者・不詳を含む、年齢が判明している全3歳以上人口です。':'';
 text('[data-population-composition-takeaway]',compared?'色は州内の割合、円の面積は人数です。割合が高い州と人数が多い州を分けて比べます。':metric.takeaway);text('[data-population-composition-definition]',`${metric.definition} ${definitionNote}${metric.comparabilityNote?' '+metric.comparabilityNote:''}`);
 text('[data-population-composition-count-label]',metric.isEstimate?'公式推計の人数':'選択指標の人数');
 text('[data-population-composition-selected-name]',selected.nameJa);text('[data-population-composition-count]',count(record));text('[data-population-composition-share]',percent(record));text('[data-population-composition-denominator]',record.denominator===null?'未取得':record.denominator.toLocaleString('ja-JP'));text('[data-population-composition-universe]',metric.countDenominatorLabel);
 const confidencePrecision=Math.min(3,(metric.sharePrecision??1)+1);
 show('[data-population-composition-confidence]',!!metric.isEstimate);text('[data-population-composition-confidence]',metric.isEstimate?`公式推計／90%信頼区間：${interval(record.shareConfidenceInterval90??record.confidenceInterval90,'%',confidencePrecision)}`:'');
 text('[data-population-composition-confidence-detail]',metric.isEstimate?`人数の90%信頼区間：${interval(record.countConfidenceInterval90,'人')}。割合の区間は原表を保持し、人数区間÷分母から再計算していません。人数CV：${record.countCVPercentage?.toLocaleString('ja-JP',{maximumFractionDigits:3})??'未取得'}%、割合CV：${record.percentageCVPercentage?.toLocaleString('ja-JP',{maximumFractionDigits:3})??'未取得'}%。全国の割合90%区間：${interval(metric.nationalShareConfidenceInterval90??metric.nationalConfidenceInterval90,'%')}、人数90%区間：${interval(metric.nationalCountConfidenceInterval90,'人')}。${record.unknownCount===undefined?'':`選択州の不詳：${record.unknownCount?.toLocaleString('ja-JP')??'未取得'}人。`}全国の不詳：${metric.nationalUnknownCount?.toLocaleString('ja-JP')??'未取得'}人。`:(record.unknownCount===undefined?'':`この指標の回答不詳：${record.unknownCount?.toLocaleString('ja-JP')??'未取得'}人。不詳も公表分母に含みます。`));
 text('[data-population-composition-national]',`全国：${formatMexicoPopulation(metric.nationalCount,metric.nationalStatus)}人・${percent({count:metric.nationalCount,denominator:metric.nationalDenominator,status:metric.nationalStatus})}。分母：${metric.nationalDenominator?.toLocaleString('ja-JP')??'未取得'}人（${metric.countDenominatorLabel}）。`);
 const legend=q('[data-population-composition-color-key]');if(legend){legend.replaceChildren(...(metric.shareBins??mexicoCompositionShareBins).map(bin=>{const li=document.createElement('li'),swatch=document.createElement('i');swatch.style.background=bin.color;swatch.setAttribute('aria-hidden','true');li.append(swatch,document.createTextNode(bin.label));return li;}));const missing=document.createElement('li');missing.innerHTML='<i class="population-composition-missing" aria-hidden="true"></i>欠測・秘匿・未取得';legend.append(missing);}
 show('[data-population-composition-share-key]',showShare);show('[data-population-composition-count-key]',showCount);
 text('[data-population-composition-key-title]',`${metric.label}・${data.referenceYear}年${metric.isEstimate?'・公式推計':''}`);text('[data-population-composition-key-universe]',`割合の分母：${metric.countDenominatorLabel}。`);
 text('[data-population-composition-count-note]',`円の面積＝${metric.isEstimate?'公式推計の':''}人数。${(metric.countLegendValues??[100_000,1_000_000,5_000_000]).map(value=>value.toLocaleString('ja-JP')+'人').join('／')}の円が地図内の凡例です。0人は円なし。斜線は欠測・秘匿・未取得。尺度は同じ指標の全32州で共通、他指標の円とは直接比べません。`);
 text('[data-population-composition-period]',metric.source.periodNote);text('[data-population-composition-method]',metric.source.methodNote);
 const sourceLink=q<HTMLAnchorElement>('[data-population-composition-source]');if(sourceLink){sourceLink.textContent=metric.source.label;sourceLink.href=metric.source.url;}
 text('[data-population-composition-table-caption]',`${metric.label}・${data.referenceYear}年。人数と分母は人、割合は人数÷各州の${metric.countDenominatorLabel}×100。`);
 show('[data-population-composition-ci-heading]',!!metric.isEstimate);
 const table=q('[data-population-composition-rows]');if(table)table.replaceChildren(...rows.map(row=>{const entry=metric.states[row.stateCode],tr=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=row.nameJa;tr.dataset.populationCompositionRow=row.stateCode;tr.classList.toggle('is-selected-population-row',row.stateCode===state.state);tr.append(name);const values=[count(entry),entry.denominator?.toLocaleString('ja-JP')??'未取得',percent(entry)];if(metric.isEstimate)values.push(`割合 ${interval(entry.shareConfidenceInterval90??entry.confidenceInterval90,'%')} ／ 人数 ${interval(entry.countConfidenceInterval90,'人')}`);for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));
 const compareLink=q<HTMLAnchorElement>('[data-population-composition-compare]');if(compareLink){compareLink.href=mexicoCompositionComparisonUrl(new URL(location.href)).href;compareLink.textContent=`${metric.label}の人数と割合を比べる`;compareLink.hidden=compared;}
 const returnLink=q<HTMLAnchorElement>('[data-population-composition-return]');if(returnLink){returnLink.hidden=!compared;returnLink.href=mexicoCompositionReturnUrl(new URL(location.href),selection).href;const original=rows.find(row=>row.stateCode===sourceState)??selected;returnLink.textContent=`${original.nameJa}の${metric.label}（${sourceMeasure==='count'?'人数':'割合'}）に戻る`;}
 text('[data-population-composition-comparison-note]',compared?`${metric.takeaway} 色は${metric.label}の割合、円の面積は人数です。割合の高い州と人数の多い州は一致するとは限りません。元図の州・表示対象は保持し、同じ指標で比べます。`:metric.distributionSummary??selectedDescription);
 show('[data-population-map-heading]',false);
 show('[data-population-composition-comparison-note]',true);
 const onlyLabel=q('[data-population-only-label]');if(onlyLabel)onlyLabel.textContent=compared?'比較先は選んだ州のデータだけ':'選んだ州のデータだけ';
 text('[data-population-map-status]',`${title}。${state.only?'選択州の比較先データのみ':'全32州'}。${selected.nameJa}を選択。`);
 if(state.fallback){const svg=q<SVGSVGElement>('[data-population-map]')?.cloneNode(true)as SVGSVGElement;const image=q<HTMLImageElement>('[data-population-fallback-image]');if(svg&&image){svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','900');svg.setAttribute('height','580');const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent='[hidden]{display:none}svg{background:#eaf1ee}path{vector-effect:non-scaling-stroke}.population-context{fill:#e1e6dc;stroke:#a9b7ab;stroke-width:.6;fill-rule:evenodd}.population-state{stroke:#fffefa;stroke-width:.8;fill-rule:evenodd}.population-state.is-selected-population{stroke:#9c3b24;stroke-width:2.6}.population-symbol circle,.population-map-symbol-key circle{fill:#d68b38;fill-opacity:.58;stroke:#81511c;stroke-width:1.4}.population-symbol.is-selected-population circle{stroke:#862f21;stroke-width:3.2;fill-opacity:.76}.population-selected-label path{fill:none;stroke:#9c3b24;stroke-width:2;vector-effect:non-scaling-stroke}.population-labels text,.population-selected-label text{font-family:system-ui,sans-serif;font-size:30px;fill:#203d36;paint-order:stroke;stroke:#fffefa;stroke-width:5px}.population-map-context text{font-family:system-ui,sans-serif;font-size:29px;fill:#57726c}.population-map-symbol-key text{font-family:system-ui,sans-serif;font-size:24px;fill:#384d42;paint-order:stroke;stroke:#eaf1ee;stroke-width:3px}';svg.prepend(style);image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;image.alt=`${title}。公式値を同じ32州図形へ描いた代替表示。全州の表でも人数・分母・割合を読めます。`;}}
 text('[data-population-fallback-caption]',`${title}の代替表示。既存人口密度図への置換ではありません。全32州表で公表値を読めます。`);
 return true;
}
