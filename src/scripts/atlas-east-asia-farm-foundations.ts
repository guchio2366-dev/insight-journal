import data from '../../public/assets/atlas/east-asia-v1/farm-foundations.json';
import type {AsiaRegionId} from '../lib/atlas-asia-state';

type Country={code:string;name:string}|undefined;
const names:Record<string,string>={CHN:'中国',JPN:'日本',KOR:'韓国',TWN:'台湾'};
const partnerNames:Record<number,string>={842:'米国（領域を含む報告区分）',156:'中国',344:'香港',392:'日本',410:'韓国',704:'ベトナム',490:'その他のアジア（台湾等）'};
const topics:Record<string,string>={overview:'roundwood-production',forest:'forest-area',rice:'rice-production',wheat:'wheat-production',maize:'maize-production',soybean:'soybean-production'};
const labels:Record<string,string>={'roundwood-production':'丸太生産量','sawnwood-production':'製材生産量','forest-area':'森林面積','rice-production':'米生産量','wheat-production':'小麦生産量','maize-production':'トウモロコシ生産量','soybean-production':'大豆生産量'};
const colors=['#326b63','#85a762','#d5a760','#d9dfd7'];
const format=(n:number,unit:string)=>unit==='m3'?n>0&&n<1e5?`${n.toLocaleString('ja-JP')}m³`:`${(n/1e6).toLocaleString('ja-JP',{maximumFractionDigits:2})}百万m³`:n>0&&n<.01?'0.01％未満':`${n.toLocaleString('ja-JP',{maximumFractionDigits:2})}％`;
const el=(tag:string,content='')=>{const node=document.createElement(tag);node.textContent=content;return node;};
const p=(host:HTMLElement,text:string)=>host.append(el('p',text));
const addBar=(host:HTMLElement,label:string,value:number,max:number,unit:string)=>{
 const row=el('div');row.className='east-bar';const name=el('span',label),line=el('i'),number=el('b',format(value,unit));line.style.width=`${Math.max(1,value/max*100)}%`;row.append(name,line,number);host.append(row);
};
const svg=(tag:string,attrs:Record<string,string>)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;};
export function renderEastAsiaFarmFoundations(root:HTMLElement,region:AsiaRegionId,active:boolean,topic:string|null,country:Country){
 const section=root.querySelector<HTMLElement>('[data-east-farm-foundations]');if(!section)return;
 section.hidden=!active||region!=='east-asia';if(section.hidden)return;
 const code=country?.code,forest=section.querySelector<HTMLElement>('[data-east-forest-flows]')!,destinations=section.querySelector<HTMLElement>('[data-east-export-partners]')!,share=section.querySelector<HTMLElement>('[data-east-world-share]')!;
 forest.replaceChildren();destinations.replaceChildren();share.replaceChildren();
 if(code&&Object.hasOwn(data.forestFlows,code)){
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
 p(forest,'生産・輸入・輸出はそれぞれ別の量です。輸入を国内伐採や国内仕向けに読み替えられず、在庫変動を含む需給表でもありません。');
 const exampleCode=code&&Object.hasOwn(data.exportDestinations,code)?code:'CHN',record=data.exportDestinations[exampleCode as keyof typeof data.exportDestinations];
 if(record){
  p(destinations,`${names[exampleCode]}の全商品輸出先 · 2023年 · 名目米ドル`);
  const parts=[...record.top.map((row,index)=>({label:partnerNames[row.partnerCode]??row.sourceName,value:row.value,color:colors[index]})),{label:'その他',value:record.other,color:colors[3]}];
  const pie=el('div');pie.className='east-pie';pie.setAttribute('role','img');pie.setAttribute('aria-label',`${names[exampleCode]}の全商品輸出先の構成。割合は直後の凡例を参照。`);let angle=0;pie.style.background=`conic-gradient(${parts.map(row=>{const start=angle;angle+=row.value/record.world*100;return `${row.color} ${start}% ${angle}%`;}).join(',')})`;destinations.append(pie);
  for(const row of parts){const key=el('div');key.className='east-pie-key';const square=el('i'),label=el('span',row.label),value=el('span',format(row.value/record.world*100,'%'));square.style.background=row.color;key.append(square,label,value);destinations.append(key);}
  p(destinations,'分母はこの報告区分の全商品輸出額です。丸太・製材の輸出先や最終消費地ではありません。台湾の位置は「Other Asia, nes」区分で、台湾だけの厳密な値とは言い切れません。');
 }else p(destinations,'この報告区分の輸出相手先は未収録です。');
 const id=topics[topic??'']??'roundwood-production',series=data.series.find(row=>row.id===id);
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
