import data from '../../public/assets/atlas/east-asia-v1/farm-foundations.json';
import {japanWheatSupply as wheat} from '../data/atlas/japan-wheat-supply';
import type {AsiaRegionId} from '../lib/atlas-asia-state';

type Country={code:string;name:string}|undefined;
const names:Record<string,string>={CHN:'中国',JPN:'日本',KOR:'韓国',PRK:'北朝鮮',MNG:'モンゴル',TWN:'台湾'};
const topics:Record<string,string>={overview:'roundwood-production',forest:'forest-area',rice:'rice-production',wheat:'wheat-production',maize:'maize-production',soybean:'soybean-production'};
const labels:Record<string,string>={'roundwood-production':'丸太生産量','sawnwood-production':'製材生産量','forest-area':'森林面積','rice-production':'米生産量','wheat-production':'小麦生産量','maize-production':'トウモロコシ生産量','soybean-production':'大豆生産量'};
const colors=['#326b63','#85a762','#d5a760','#d9dfd7'];
const format=(n:number,unit:string)=>unit==='m3'?n>0&&n<1e5?`${n.toLocaleString('ja-JP')}m³`:`${(n/1e6).toLocaleString('ja-JP',{maximumFractionDigits:2})}百万m³`:unit==='t'?n>0&&n<1e4?`${n.toLocaleString('ja-JP')}t`:`${(n/1e4).toLocaleString('ja-JP',{maximumFractionDigits:1})}万t`:unit==='1000 ha'?`${n.toLocaleString('ja-JP',{maximumFractionDigits:1})}千ha`:unit==='USD'?n<1e6?`${n.toLocaleString('ja-JP',{maximumFractionDigits:0})}＄`:n<1e9?`${(n/1e6).toLocaleString('ja-JP',{maximumFractionDigits:1})}百万＄`:`${(n/1e9).toLocaleString('ja-JP',{maximumFractionDigits:2})}十億＄`:n>0&&n<.01?'0.01％未満':`${n.toLocaleString('ja-JP',{maximumFractionDigits:2})}％`;
const el=(tag:string,content='')=>{const node=document.createElement(tag);node.textContent=content;return node;};
const p=(host:HTMLElement,text:string)=>host.append(el('p',text));
const addBar=(host:HTMLElement,label:string,value:number,max:number,unit:string)=>{
 const row=el('div');row.className='east-bar';const name=el('span',label),line=el('i'),number=el('b',format(value,unit));line.style.width=`${value===0?0:Math.max(1,value/max*100)}%`;row.append(name,line,number);host.append(row);
};
const svg=(tag:string,attrs:Record<string,string>)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;};
const thousand=(n:number)=>`${(n/10).toLocaleString('ja-JP',{maximumFractionDigits:1})}万t`;
function renderJapanWheat(forest:HTMLElement,destinations:HTMLElement,share:HTMLElement){
 const use=wheat.domesticUse,domestic=use.food+use.processing+use.other;
 p(forest,`国内生産は総供給の${(wheat.production/domestic*100).toFixed(1)}％、純輸入が${(wheat.netImports/domestic*100).toFixed(1)}％を占めます。`);
 const total=el('p');total.className='east-wheat-total';total.append('総供給 ',el('strong',thousand(domestic)),' · 2023年度、原麦');forest.append(total);
 const groups=[{title:'供給元',rows:[{label:'国内生産',value:wheat.production,color:'#326b63'},{label:'純輸入',value:wheat.netImports,color:'#85a762'},{label:'在庫減',value:-wheat.inventoryChange,color:'#d5a760'}]},{title:'行先',rows:[{label:'粗食料',value:use.food,color:'#326b63'},{label:'加工用',value:use.processing,color:'#85a762'},{label:'その他',value:use.other,color:'#d5a760'}]}];
 for(const group of groups){const band=el('div');band.className='east-wheat-band';band.append(el('b',group.title));const line=el('div');line.className='east-wheat-segments';line.setAttribute('role','img');line.setAttribute('aria-label',`${group.title}：${group.rows.map(row=>`${row.label} ${thousand(row.value)}、${(row.value/domestic*100).toFixed(1)}％`).join('、')}`);for(const row of group.rows){const part=el('span');part.style.width=`${row.value/domestic*100}%`;part.style.background=row.color;line.append(part);}band.append(line);const key=el('div');key.className='east-wheat-legend';for(const row of group.rows){const item=el('span');const swatch=el('i');swatch.style.background=row.color;item.append(swatch,`${row.label} ${(row.value/domestic*100).toFixed(1)}％`);key.append(item);}band.append(key);forest.append(band);}
 p(forest,`小麦粉の用途別生産：パン用${thousand(wheat.flourUses.bread)}、めん用${thousand(wheat.flourUses.noodles)}、菓子用${thousand(wheat.flourUses.confectionery)}。`);
 const details=el('details');details.className='east-wheat-details';details.append(el('summary','数量・期間・定義を確認'));const table=el('table');table.innerHTML='<thead><tr><th scope="col">区分</th><th scope="col">数量</th><th scope="col">総供給比</th></tr></thead>';const body=el('tbody');for(const group of groups){const heading=el('tr');const cell=el('th',group.title);cell.colSpan=3;cell.scope='colgroup';heading.append(cell);body.append(heading);for(const row of group.rows){const tr=el('tr');const th=el('th',row.label);th.scope='row';tr.append(th,el('td',thousand(row.value)),el('td',`${(row.value/domestic*100).toFixed(1)}％`));body.append(tr);}}table.append(body);details.append(table);p(details,'食料需給表の2023年度。純輸入は輸入−輸出、在庫減は供給に加算します。粗食料は食用の供給量です。加工用24.2万tはしょうゆ・でん粉等への仕向けで、製粉やパン用を指しません。その他は飼料用・種子用・純旅客用・減耗量の計です。');p(details,'別表の2023年度小麦粉生産はパン用182.3万t、めん用154.1万t、菓子用50.3万t。小麦粉の重量であり、上の原麦重量の内訳ではありません。');forest.append(details);
 p(destinations,'2023年度 · 食糧用小麦の通関輸入量');
 const layout=el('div');layout.className='east-wheat-donut-layout';const chart=svg('svg',{viewBox:'0 0 144 144',role:'img','aria-label':'日本の外国産食糧用小麦の輸入相手国。比率は隣の凡例を参照。'});chart.append(svg('circle',{cx:'72',cy:'72',r:'52',class:'east-wheat-donut-base'}));let offset=0;const originColors=['#326b63','#85a762','#d5a760','#a8aeab'];for(const [index,row] of wheat.origins.rows.entries()){const percent=row.tonnes/wheat.origins.total*100;chart.append(svg('circle',{cx:'72',cy:'72',r:'52',pathLength:'100',class:'east-wheat-donut-slice','stroke-dasharray':`${percent} ${100-percent}`,'stroke-dashoffset':String(-offset),transform:'rotate(-90 72 72)',style:`stroke:${originColors[index]}`}));offset+=percent;}for(const [y,label,klass] of [[58,'総輸入量',''],[80,(wheat.origins.total/1e6).toLocaleString('ja-JP',{maximumFractionDigits:2}),'east-wheat-donut-value'],[98,'百万t','']] as const){const text=svg('text',{x:'72',y,'text-anchor':'middle',class:klass});text.textContent=label;chart.append(text);}layout.append(chart);const legend=el('div');legend.className='east-wheat-donut-legend';for(const [index,row] of wheat.origins.rows.entries()){const item=el('div');const swatch=el('i');swatch.style.background=originColors[index];item.append(swatch,el('span',row.name),el('strong',`${(row.tonnes/wheat.origins.total*100).toFixed(1)}％`));legend.append(item);}layout.append(legend);destinations.append(layout);
 p(destinations,'財務省貿易統計。通関の食糧用輸入量で、左の全用途の純輸入とは範囲が異なります。');
 p(share,'食料需給表 · 2019–2023年度');
 const latest=wheat.selfSufficiency.at(-1)!;const current=el('p');current.className='east-wheat-current';current.append(el('strong',`${latest.rate}％`),` ${latest.year}年度`);share.append(current);
 const trend=svg('svg',{viewBox:'0 0 320 142',class:'east-wheat-trend',role:'img','aria-label':`自給率、縦軸0–20％。${wheat.selfSufficiency.map(row=>`${row.year}年度${row.rate}％`).join('、')}`});
 const x=(index:number)=>48+index*62,y=(rate:number)=>108-rate*4;
 for(const rate of [0,10,20]){const py=y(rate);trend.append(svg('line',{x1:'39',y1:String(py),x2:'300',y2:String(py),class:rate===0?'axis':'guide'}));const tick=svg('text',{x:'32',y:String(py+4),'text-anchor':'end',class:'tick'});tick.textContent=`${rate}％`;trend.append(tick);}
 trend.append(svg('polyline',{points:wheat.selfSufficiency.map((row,index)=>`${x(index)},${y(row.rate)}`).join(' '),class:'trend'}));
 for(const [index,row] of wheat.selfSufficiency.entries()){trend.append(svg('circle',{cx:String(x(index)),cy:String(y(row.rate)),r:'3.5',class:'dot'}));const value=svg('text',{x:String(x(index)),y:String(y(row.rate)-8),'text-anchor':'middle',class:'value'});value.textContent=`${row.rate}％`;trend.append(value);const year=svg('text',{x:String(x(index)),y:'132','text-anchor':'middle'});year.textContent=String(row.year);trend.append(year);}share.append(trend);
 p(share,'国内生産109.4万t ÷ 国内消費631.2万t（四捨五入）。食用小麦だけを分母にした率ではありません。');
 p(share,'2024年FAOSTATの世界小麦生産に占める日本は約0.13％。世界の生産規模だけでは国内の供給構造を読めないため、国内需給を別に示します。');
}
export function renderEastAsiaFarmFoundations(root:HTMLElement,region:AsiaRegionId,active:boolean,topic:string|null,country:Country){
 const section=root.querySelector<HTMLElement>('[data-east-farm-foundations]');if(!section)return;
 section.hidden=!active||region!=='east-asia';if(section.hidden)return;const candidates=section.querySelector<HTMLElement>('.priority');if(candidates)candidates.hidden=topic==='forest';
 const code=country?.code,forest=section.querySelector<HTMLElement>('[data-east-forest-flows]')!,destinations=section.querySelector<HTMLElement>('[data-east-export-partners]')!,share=section.querySelector<HTMLElement>('[data-east-world-share]')!;
 forest.replaceChildren();destinations.replaceChildren();share.replaceChildren();
 const japanWheat=topic==='wheat'&&code==='JPN';
 const heading=section.querySelector<HTMLElement>('[data-east-foundations-title]'),lead=section.querySelector<HTMLElement>('[data-east-foundations-lead]');
 if(heading)heading.textContent=japanWheat?'日本の小麦：供給・輸入先・自給率':'生産・貿易・世界での位置';
 if(lead&&japanWheat)lead.textContent='2023年度の食料需給表で、国内生産・純輸入・在庫変動と国内消費を同じ数量で読みます。輸入先は食糧用小麦の通関量、自給率は国内消費を分母にした値です。';
 const wheatSources=section.querySelector<HTMLElement>('[data-east-wheat-sources]'),otherSources=section.querySelector<HTMLDetailsElement>('[data-east-other-sources]');
 if(wheatSources)wheatSources.hidden=!japanWheat;if(otherSources){otherSources.hidden=false;otherSources.open=!japanWheat;}
 section.querySelector<HTMLElement>('[data-east-partner-title]')!.textContent=japanWheat?'小麦の輸入相手国':'木材・木製品の輸出入';
 section.querySelector<HTMLElement>('[data-east-share-title]')!.textContent=japanWheat?'小麦の自給率':'世界比と推移';
 if(japanWheat){section.querySelector<HTMLElement>('[data-east-supply-title]')!.textContent='日本の小麦：供給と国内消費';renderJapanWheat(forest,destinations,share);share.replaceChildren();section.querySelector<HTMLElement>('[data-east-share-title]')!.textContent='品目群のカロリー構成と自給状況';p(share,'未収録：品目群の食料供給カロリーとカロリー自給率。小麦の国内生産重量÷国内消費重量による17％（2023年度）は数量自給率であり、この欄のカロリー統計とは別の定義です。');return;}
 // Agricultural views must never inherit forestry or all-goods indicators.
 if(topic!=='forest'){
  if(heading)heading.textContent='農畜産の供給・域外貿易・食料自給';
  if(lead)lead.textContent='地域全体は中国・日本・朝鮮半島・モンゴル・台湾を対象とします。対応する需給・相手国別・カロリー系列を照合できていないため、数値と円の面積は表示していません。未収録は0ではありません。';
  section.querySelector<HTMLElement>('[data-east-supply-title]')!.textContent='主要品目の供給と用途';
  section.querySelector<HTMLElement>('[data-east-partner-title]')!.textContent='主要品目の域外輸出入相手';
  section.querySelector<HTMLElement>('[data-east-share-title]')!.textContent='品目群のカロリー構成と自給状況';
  p(forest,'未収録：同一年・同一品目・重量単位の食料需給表。生産＋輸入＋在庫取崩しを、食用・飼料・加工・種子・損失・輸出・在庫積増し等へ対応させます。食用は摂取量ではなく供給量です。');
  p(destinations,'未収録：全相手国を含む品目別貿易行列。中国・日本・朝鮮半島・モンゴル・台湾との域内取引を除き、域外輸出と域外輸入を別々の分母で示す必要があります。保存済みの上位3相手＋その他では域内分を除去できません。');
  p(share,'未収録：同一年・同一対象の食料供給カロリーと品目別国内生産。重量比や世界生産比をカロリー自給率に読み替えません。');

  p(forest,'出典候補：FAOSTAT Food Balances（2010–2023年公開）。取得先が403を返したため、地域合計・対象年・数量は未確定です。');
  destinations.append(el('a','FAOSTAT 品目別貿易行列'));
  destinations.querySelector('a')!.href='https://www.fao.org/faostat/en/#data/TM';
  forest.append(el('a','FAOSTAT 食料需給表'));forest.querySelector('a')!.href='https://www.fao.org/faostat/en/#data/FBS';
  if(otherSources)otherSources.hidden=true;
  return;
 }
 if(heading)heading.textContent='森林面積と木材の生産・貿易';
 if(lead)lead.textContent='中国・日本・韓国・北朝鮮・モンゴル・台湾の公表値を示します。森林の分布・面積と、丸太・製材の体積、木材・木製品の貿易額は別の指標です。未収録は0ではありません。';
 section.querySelector<HTMLElement>('[data-east-supply-title]')!.textContent='丸太・製材の生産と輸出入';
 section.querySelector<HTMLElement>('[data-east-partner-title]')!.textContent='木材・木製品の輸出入';
 section.querySelector<HTMLElement>('[data-east-share-title]')!.textContent='森林面積と世界比';
 const selected=code?data.countries.filter(key=>key===code):data.countries;
 for(const key of selected){
  const flows=data.forestFlows[key as keyof typeof data.forestFlows];
  p(forest,`${names[key]} · 2024年 · m³`);
  for(const [kind,label] of [['roundwood','丸太'],['sawnwood','製材']] as const){
   const values=flows[kind],max=Math.max(1,...Object.values(values).map(value=>value?.value??0));
   p(forest,label);
   for(const [field,name] of [['production','生産'],['imports','輸入'],['exports','輸出']] as const){const record=values[field];if(record)addBar(forest,name,record.value,max,'m3');else p(forest,`${name}：未掲載`);}
  }
  const trade=data.woodTrade[key as keyof typeof data.woodTrade],max=Math.max(1,trade.imports??0,trade.exports??0);
  p(destinations,`${key==='TWN'?'その他のアジア（台湾等）':names[key]} · HS44 · 2023年 · 名目米ドル`);
  for(const [field,name] of [['imports','輸入'],['exports','輸出']] as const){const value=trade[field];if(value!==null)addBar(destinations,name,value,max,'USD');else p(destinations,`${name}：未収録（0ではありません）`);}
 }
 p(forest,'FAOの中国は中国本土（area 41）、台湾は台湾区分（area 214）です。中国合計区分と台湾を重複させていません。');
 p(forest,'FAOSTAT Forestry。生産・輸入・輸出は別の量で、在庫変動を含む国内需給ではありません。資料区分Aは公表値、Eは推計、Xは国際機関等の資料です。国別の値・区分は出典データで確認できます。');
 p(destinations,'HS44は木材・木製品・木炭。丸太・製材以外も含み、上の体積とは合計しません。台湾の貿易は「Other Asia, nes」（台湾等）報告区分です。');
 p(destinations,'木材の相手国別内訳は未収録です。全商品の相手国構成は木材の相手国に代用できないため、円グラフを表示していません。域内・域外を分けた貿易量でもありません。');
 const area=data.series.find(row=>row.id==='forest-area')!.years.at(-1)!;
 p(share,'森林面積 · 2024年 · 千ha');
 const maxArea=Math.max(1,...selected.map(key=>area.countries[key as keyof typeof area.countries]?.value??0));
 for(const key of selected){const row=area.countries[key as keyof typeof area.countries];if(row)addBar(share,names[key],row.value,maxArea,'1000 ha');else p(share,`${names[key]}：未掲載（0ではありません）`);}
 p(share,'FAOSTAT Land Use。面積の値は国別公表区分で、地図の森林画像から集計した値ではありません。以下の比率の分母は同年・同定義のWorld森林面積です。');
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
