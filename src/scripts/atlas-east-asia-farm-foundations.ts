import data from '../../public/assets/atlas/east-asia-v1/farm-foundations.json';
import {japanWheatSupply as wheat} from '../data/atlas/japan-wheat-supply';
import type {AsiaRegionId} from '../lib/atlas-asia-state';

type Country={code:string;name:string}|undefined;
const names:Record<string,string>={CHN:'中国',JPN:'日本',KOR:'韓国',TWN:'台湾'};
const partnerNames:Record<number,string>={842:'米国（領域を含む報告区分）',156:'中国',344:'香港',392:'日本',410:'韓国',704:'ベトナム',490:'その他のアジア（台湾等）'};
const topics:Record<string,string>={overview:'roundwood-production',forest:'forest-area',rice:'rice-production',wheat:'wheat-production',maize:'maize-production',soybean:'soybean-production'};
const cropLabels:Record<string,string>={rice:'米',wheat:'小麦',maize:'トウモロコシ',soybean:'大豆'};
const cropHS:Record<string,string>={rice:'1006',wheat:'1001',maize:'1005',soybean:'1201'};
const labels:Record<string,string>={'roundwood-production':'丸太生産量','sawnwood-production':'製材生産量','forest-area':'森林面積','rice-production':'米生産量','wheat-production':'小麦生産量','maize-production':'トウモロコシ生産量','soybean-production':'大豆生産量'};
const colors=['#326b63','#85a762','#d5a760','#d9dfd7'];
const format=(n:number,unit:string)=>unit==='m3'?n>0&&n<1e5?`${n.toLocaleString('ja-JP')}m³`:`${(n/1e6).toLocaleString('ja-JP',{maximumFractionDigits:2})}百万m³`:unit==='t'?n>0&&n<1e4?`${n.toLocaleString('ja-JP')}t`:`${(n/1e4).toLocaleString('ja-JP',{maximumFractionDigits:1})}万t`:unit==='USD'?n<1e6?`${n.toLocaleString('ja-JP',{maximumFractionDigits:0})}＄`:n<1e9?`${(n/1e6).toLocaleString('ja-JP',{maximumFractionDigits:1})}百万＄`:`${(n/1e9).toLocaleString('ja-JP',{maximumFractionDigits:2})}十億＄`:n>0&&n<.01?'0.01％未満':`${n.toLocaleString('ja-JP',{maximumFractionDigits:2})}％`;
const el=(tag:string,content='')=>{const node=document.createElement(tag);node.textContent=content;return node;};
const p=(host:HTMLElement,text:string)=>host.append(el('p',text));
const addBar=(host:HTMLElement,label:string,value:number,max:number,unit:string)=>{
 const row=el('div');row.className='east-bar';const name=el('span',label),line=el('i'),number=el('b',format(value,unit));line.style.width=`${Math.max(1,value/max*100)}%`;row.append(name,line,number);host.append(row);
};
const svg=(tag:string,attrs:Record<string,string>)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;};
const thousand=(n:number)=>`${(n/10).toLocaleString('ja-JP',{maximumFractionDigits:1})}万t`;
function renderJapanWheat(forest:HTMLElement,destinations:HTMLElement,share:HTMLElement){
 const use=wheat.domesticUse,domestic=use.food+use.processing+use.other;
 p(forest,`${wheat.year}年度 · 小麦 · 万t。国内生産${thousand(wheat.production)}、純輸入${thousand(wheat.netImports)}、在庫減${thousand(-wheat.inventoryChange)}。`);
 const flow=el('div');flow.className='east-wheat-flow';flow.setAttribute('role','img');flow.setAttribute('aria-label',`小麦の供給：国内生産${thousand(wheat.production)}、純輸入${thousand(wheat.netImports)}、在庫減${thousand(-wheat.inventoryChange)}。国内消費${thousand(domestic)}の内訳は粗食料${thousand(use.food)}、加工用${thousand(use.processing)}、その他${thousand(use.other)}。`);
 const band=(title:string,items:{label:string;value:number;color:string}[])=>{const group=el('div');group.className='east-wheat-band';group.append(el('b',title));const line=el('div');line.className='east-wheat-segments';for(const item of items){const part=el('span');part.style.width=`${item.value/domestic*100}%`;part.style.background=item.color;part.title=`${item.label} ${thousand(item.value)}`;line.append(part);}group.append(line);flow.append(group);};
 band('供給',[{label:'国内生産',value:wheat.production,color:'#326b63'},{label:'純輸入',value:wheat.netImports,color:'#85a762'},{label:'在庫減',value:-wheat.inventoryChange,color:'#d5a760'}]);
 band('国内消費',Object.entries(use).map(([key,value])=>({label:key,value,color:key==='food'?'#326b63':key==='processing'?'#85a762':'#d5a760'})));
 forest.append(flow);
 for(const [index,[label,value]] of ([['国内生産',wheat.production],['純輸入',wheat.netImports],['在庫減',-wheat.inventoryChange],['粗食料',use.food],['加工用',use.processing],['その他',use.other]] as const).entries()){const key=el('div');key.className='east-wheat-key';const name=el('span',label),swatch=el('i');swatch.style.background=['#326b63','#85a762','#d5a760'][index%3];name.prepend(swatch);key.append(name,el('b',thousand(value)));forest.append(key);}
 p(forest,`国内消費 ${thousand(domestic)}。在庫減は供給に加算。純輸入は輸入−輸出。粗食料は食用の供給量で、パン・麺だけの消費量ではありません。その他は飼料用・種子用・純旅客用・減耗量の計です。`);
 p(destinations,`${wheat.year}年度 · 外国産食糧用小麦の輸入量 ${format(wheat.origins.total,'t')}（財務省貿易統計）。`);
 const pie=el('div');pie.className='east-pie';pie.setAttribute('role','img');pie.setAttribute('aria-label','日本の外国産食糧用小麦の輸入相手国。比率は続く凡例を参照。');let angle=0;const colors=['#326b63','#85a762','#d5a760','#d9dfd7'];pie.style.background=`conic-gradient(${wheat.origins.rows.map((row,index)=>{const start=angle;angle+=row.tonnes/wheat.origins.total*100;return `${colors[index]} ${start}% ${angle}%`;}).join(',')})`;destinations.append(pie);
 for(const [index,row] of wheat.origins.rows.entries()){const key=el('div');key.className='east-pie-key';const square=el('i');square.style.background=colors[index];key.append(square,el('span',row.name),el('span',`${(row.tonnes/wheat.origins.total*100).toFixed(1)}％`));destinations.append(key);}
 p(destinations,'輸入先は小麦の相手国です。食糧用小麦の通関量であり、左の食料需給表の純輸入（全用途、輸出差引）とは範囲が異なります。');
 p(share,`日本の小麦自給率 · 食料需給表 · ${wheat.selfSufficiency[0].year}–${wheat.year}年度`);
 const trend=el('div');trend.className='east-wheat-trend';trend.setAttribute('role','img');trend.setAttribute('aria-label',wheat.selfSufficiency.map(row=>`${row.year}年度${row.rate}％`).join('、'));for(const row of wheat.selfSufficiency){const item=el('div');item.append(el('b',`${row.rate}％`));const bar=el('i');bar.style.height=`${row.rate/20*70}px`;item.append(bar,el('span',String(row.year)));trend.append(item);}share.append(trend);
 p(share,'2023年度は17％。国内生産109.4万t ÷ 国内消費631.2万t（四捨五入）。食用小麦だけを分母にした率ではありません。');
 p(share,'2024年FAOSTATの世界小麦生産に占める日本は約0.13％。世界の生産規模だけでは国内の供給構造を読めないため、日本の小麦を採用しました。次候補は韓国の小麦ですが、同一年・同一品目の需給と輸入相手国を照合してから判断します。');
}
export function renderEastAsiaFarmFoundations(root:HTMLElement,region:AsiaRegionId,active:boolean,topic:string|null,country:Country){
 const section=root.querySelector<HTMLElement>('[data-east-farm-foundations]');if(!section)return;
 section.hidden=!active||region!=='east-asia';if(section.hidden)return;
 const code=country?.code,forest=section.querySelector<HTMLElement>('[data-east-forest-flows]')!,destinations=section.querySelector<HTMLElement>('[data-east-export-partners]')!,share=section.querySelector<HTMLElement>('[data-east-world-share]')!;
 forest.replaceChildren();destinations.replaceChildren();share.replaceChildren();
 const japanWheat=topic==='wheat'&&code==='JPN';
 const heading=section.querySelector<HTMLElement>('[data-east-foundations-title]'),lead=section.querySelector<HTMLElement>('[data-east-foundations-lead]');
 if(heading)heading.textContent=japanWheat?'日本の小麦：供給・輸入先・自給率':'生産・貿易・世界での位置';
 if(lead)lead.textContent=japanWheat?'2023年度の食料需給表で、国内生産・純輸入・在庫変動と国内消費を同じ数量で読みます。輸入先は食糧用小麦の通関量、自給率は国内消費を分母にした値です。':'森林面積、木材の生産・輸出入、商品輸出先は別の統計です。地図の森林色から数量や仕向け先を推定せず、国の公表値と並べて読みます。';
 section.querySelector<HTMLElement>('[data-east-partner-title]')!.textContent=japanWheat?'小麦の輸入相手国':'全商品の輸出先';
 section.querySelector<HTMLElement>('[data-east-share-title]')!.textContent=japanWheat?'小麦の自給率':'世界比と推移';
 if(japanWheat){section.querySelector<HTMLElement>('[data-east-supply-title]')!.textContent='日本の小麦：供給と国内消費';renderJapanWheat(forest,destinations,share);return;}
 const crop=topic&&Object.hasOwn(data.cropFlows,topic)?data.cropFlows[topic as keyof typeof data.cropFlows]:undefined;
 section.querySelector<HTMLElement>('[data-east-supply-title]')!.textContent=crop?`${cropLabels[topic!]}の生産・商品貿易`:'丸太・製材の供給と輸出入';
 if(crop){
  if(code&&Object.hasOwn(crop,code)){
   const record=crop[code as keyof typeof crop],production=record.production;
   p(forest,`${country?.name}の${cropLabels[topic!]}生産量 · 2024年 · t`);
   if(production)addBar(forest,'生産',production.value,Math.max(1,production.value),'t');else p(forest,'生産：未掲載');
   p(forest,`${code==='TWN'?'その他のアジア（台湾等）':country?.name}のHS ${cropHS[topic!]}商品の貿易額 · 2023年 · 名目米ドル`);
   const max=Math.max(1,record.imports??0,record.exports??0);
   for(const [field,label] of [['imports','輸入'],['exports','輸出']] as const){const value=record[field];if(value!==null)addBar(forest,label,value,max,'USD');else p(forest,`${label}：未掲載`);}
  }else{
   p(forest,`4対象の${cropLabels[topic!]}生産量 · 2024年 · t`);const rows=data.countries.map(key=>({key,value:crop[key as keyof typeof crop].production?.value})),max=Math.max(1,...rows.map(row=>row.value??0));
   for(const row of rows)if(row.value!==undefined)addBar(forest,names[row.key],row.value,max,'t');else p(forest,`${names[row.key]}：未掲載`);
  }
  p(forest,'FAOSTATの国別生産重量とUN Comtradeの対応HS商品金額は年・単位・加工範囲が異なります。足し引きして国内仕向けを求めません。台湾の生産はFAO台湾区分、貿易は「Other Asia, nes」（台湾等）です。');
 }else if(code&&Object.hasOwn(data.forestFlows,code)){
  const flows=data.forestFlows[code as keyof typeof data.forestFlows];
  for(const [kind,label] of [['roundwood','丸太'],['sawnwood','製材']] as const){
   const values=flows[kind],max=Math.max(1,...Object.values(values).map(value=>value?.value??0));
   p(forest,`${country?.name}の${label} · 2024年 · m³`);
   for(const [field,name] of [['production','生産'],['imports','輸入'],['exports','輸出']] as const){const record=values[field];if(record)addBar(forest,name,record.value,max,'m3');else p(forest,`${name}：未掲載`);}
  }
 }else{
  p(forest,'4対象の丸太生産量 · 2024年 · m³');const rows=data.countries.map(key=>({key,value:data.forestFlows[key as keyof typeof data.forestFlows].roundwood.production?.value})),max=Math.max(1,...rows.map(row=>row.value??0));
  for(const row of rows)if(row.value!==undefined)addBar(forest,names[row.key],row.value,max,'m3');else p(forest,`${names[row.key]}：未掲載`);
 }
 if(!crop)p(forest,'生産・輸入・輸出はそれぞれ別の量です。輸入を国内伐採や国内仕向けに読み替えられず、在庫変動を含む需給表でもありません。');
 if(!crop&&topic!=='overview'&&topic!=='forest')p(forest,'選んだ品目に対応する供給・輸出入系列は今回の比較対象外です。上は林産物の参考値です。');
 const exampleCode=code&&Object.hasOwn(data.exportDestinations,code)?code:'CHN',record=data.exportDestinations[exampleCode as keyof typeof data.exportDestinations];
 if(record){
  const reporter=exampleCode==='TWN'?'その他のアジア（台湾等）':names[exampleCode];p(destinations,`${reporter}の全商品輸出先 · 2023年 · 名目米ドル`);
  const parts=[...record.top.map((row,index)=>({label:partnerNames[row.partnerCode]??row.sourceName,value:row.value,color:colors[index]})),{label:'その他',value:record.other,color:colors[3]}];
  const pie=el('div');pie.className='east-pie';pie.setAttribute('role','img');pie.setAttribute('aria-label',`${reporter}の全商品輸出先の構成。割合は直後の凡例を参照。`);let angle=0;pie.style.background=`conic-gradient(${parts.map(row=>{const start=angle;angle+=row.value/record.world*100;return `${row.color} ${start}% ${angle}%`;}).join(',')})`;destinations.append(pie);
  for(const row of parts){const key=el('div');key.className='east-pie-key';const square=el('i'),label=el('span',row.label),value=el('span',format(row.value/record.world*100,'%'));square.style.background=row.color;key.append(square,label,value);destinations.append(key);}
  p(destinations,'分母はこの報告区分の全商品輸出額です。丸太・製材の輸出先や最終消費地ではありません。台湾の位置は「Other Asia, nes」区分で、台湾だけの厳密な値とは言い切れません。');
 }else p(destinations,'この報告区分の輸出相手先は未収録です。');
 const id=topics[topic??''];if(!id){p(share,'選んだ品目と同じ定義のWorld分母を照合した系列は、今回の7指標に含まれません。');return;}const series=data.series.find(row=>row.id===id);
 if(!series)return;
 if(!code){
  p(share,`2024年の${labels[id]} · 世界比`);const latest=series.years.at(-1)!,rows=data.countries.map(key=>({key,value:latest.countries[key as keyof typeof latest.countries]?.share})),max=Math.max(1,...rows.map(row=>row.value??0));
  for(const row of rows)if(row.value!==undefined)addBar(share,names[row.key],row.value,max,'%');else p(share,`${names[row.key]}：未掲載（0ではありません）`);
  p(share,'各国・地域の値 ÷ 同じFAOSTAT品目・年・単位のWorld値。国の比率を足して地域全体とは扱いません。');return;
 }
 const points=series.years.flatMap(year=>{const value=year.countries[code as keyof typeof year.countries];return value?[{year:year.year,share:value.share}]:[]});
 if(!points.length){p(share,`${country?.name}の${labels[id]}は未掲載です。公表0とは異なります。`);return;}
 const first=points[0],last=points.at(-1)!;p(share,`${country?.name}の${labels[id]}：${first.year}年 ${format(first.share,'%')} → ${last.year}年 ${format(last.share,'%')}。`);
 if(points.length>=2){const max=Math.max(.01,...points.map(point=>point.share))*1.12,chart=svg('svg',{viewBox:'0 0 300 130',class:'east-share-chart',role:'img','aria-label':`${country?.name}の${labels[id]}の世界比。年別値は後の表を参照。`}),x=(year:number)=>29+(year-2015)*27,y=(value:number)=>103-value/max*80;chart.append(svg('line',{x1:'29',y1:'103',x2:'272',y2:'103',class:'axis'}));let segment:typeof points=[];const flush=()=>{if(segment.length>1)chart.append(svg('polyline',{points:segment.map(point=>`${x(point.year)},${y(point.share)}`).join(' '),class:'trend'}));segment=[];};for(const year of series.years){const value=year.countries[code as keyof typeof year.countries];if(!value){flush();continue;}segment.push({year:year.year,share:value.share});}flush();for(const point of points)chart.append(svg('circle',{cx:String(x(point.year)),cy:String(y(point.share)),r:'2.5',class:'dot'}));for(const [label,px] of [['2015','26'],['2024','250']]){const node=svg('text',{x:px,y:'122'});node.textContent=label;chart.append(node);}share.append(chart);}
 const detail=el('details'),summary=el('summary','年別値と資料区分');detail.append(summary);const table=el('table');table.innerHTML='<thead><tr><th scope="col">年</th><th scope="col">世界比</th><th scope="col">区分</th></tr></thead>';const body=el('tbody');for(const year of series.years){const value=year.countries[code as keyof typeof year.countries],row=el('tr');for(const text of [String(year.year),value?format(value.share,'%'):'未掲載',value?.flag??'―'])row.append(el('td',text));body.append(row);}table.append(body);detail.append(table);share.append(detail);
 p(share,'分母は同じ年のFAOSTAT World値です。林業の森林面積と木材体積、生産重量、輸出額を足し合わせません。');
}
