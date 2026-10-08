import riceFlow from '../../public/assets/atlas/south-central-asia-v1/india-rice-export-2023-24.json';

const formatMillions=(tons:number)=>`${(tons/1_000_000).toLocaleString('ja-JP',{maximumFractionDigits:2,minimumFractionDigits:2})}百万トン`;
const make=(tag:string,className?:string,text?:string)=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
const source=()=>{const link=make('a') as HTMLAnchorElement;link.href=riceFlow.source;link.textContent='DGCIS原資料（表1～3）';link.target='_blank';link.rel='noopener noreferrer';return link;};

/** The fiscal-year rice export series and the FAOSTAT paddy series have different definitions. */
export function renderSouthCentralRiceFlow(section:HTMLElement,region:string,topic:string|null,countryCode:string|undefined){
 const supply=section.querySelector<HTMLElement>('[data-south-central-supply]');
 const destinations=section.querySelector<HTMLElement>('[data-south-central-destinations]');
 if(!supply||!destinations)return;
 supply.replaceChildren();destinations.replaceChildren();
 const supplyTitle=section.querySelector<HTMLElement>('[data-south-central-supply-title]');
 const destinationTitle=section.querySelector<HTMLElement>('[data-south-central-destinations-title]');
 if(supplyTitle)supplyTitle.textContent='供給元と行先';
 if(destinationTitle)destinationTitle.textContent='主な輸出先';
 if(region!=='south-central-asia'){
  supply.append(make('p',undefined,'供給と仕向け先の内訳は未掲載です。'));
  destinations.append(make('p',undefined,'品目別の輸出先は未掲載です。'));
  return;
 }
 if(countryCode&&countryCode!=='IND'||topic!=='overview'&&topic!=='rice'){
  supply.append(make('p',undefined,'この品目・国の同一定義による国内仕向けと輸出量は未収録です。生産量から仕向けを推定しません。'));
  destinations.append(make('p',undefined,'この品目・国の相手国別輸出量は未収録です。'));
  return;
 }
 if(supplyTitle)supplyTitle.textContent='米の輸出内訳';
 if(destinationTitle)destinationTitle.textContent='バスマティ米の輸出先';
 const {basmati,otherRice}=riceFlow.exports,total=basmati+otherRice;
 supply.append(make('p','sc-flow-lead',`インドの米の輸出量：${formatMillions(total)}（${riceFlow.period}）。`));
 const track=make('div','sc-flow-track');track.setAttribute('role','img');track.setAttribute('aria-label',`インドの米の輸出量のうち、バスマティ米${formatMillions(basmati)}、その他の米${formatMillions(otherRice)}。`);
 const basmatiBar=make('span','sc-flow-basmati'),otherBar=make('span','sc-flow-other');basmatiBar.style.width=`${basmati/total*100}%`;otherBar.style.width=`${otherRice/total*100}%`;track.append(basmatiBar,otherBar);supply.append(track);
 const legend=make('p','sc-flow-legend');for(const [name,value,color] of [['バスマティ米',basmati,'#285c50'],['その他の米',otherRice,'#a7a66c']] as const){const key=make('i');key.style.background=color;legend.append(key,document.createTextNode(`${name} ${formatMillions(value)}　`));}supply.append(legend);
 supply.append(make('p','sc-flow-detail','輸出の内訳です。国内消費・飼料・在庫変動は含まず、国内仕向けの量は示せません。右の世界生産比に使うFAOSTATの籾米とは定義と年が違うため、両者を差し引きしません。'));
 supply.append(source());
 const top=riceFlow.basmatiDestinations.slice(0,5),known=riceFlow.basmatiDestinations.reduce((sum,row)=>sum+row.quantity,0),other=basmati-known;
 const slices=[...top,{name:'その他の相手国',quantity:basmati-top.reduce((sum,row)=>sum+row.quantity,0)}];
 const colors=['#285c50','#648f6d','#a7a66c','#d3a05e','#967a88','#ddd8c8'];let percent=0;
 const stops=slices.map((row,i)=>{const end=percent+row.quantity/basmati*100,stop=`${colors[i]} ${percent.toFixed(3)}% ${end.toFixed(3)}%`;percent=end;return stop;});
 const pie=make('div','sc-flow-pie');pie.style.background=`conic-gradient(${stops.join(',')})`;pie.setAttribute('role','img');pie.setAttribute('aria-label',`インドのバスマティ米輸出先の割合。${slices.map(row=>`${row.name}${(row.quantity/basmati*100).toFixed(1)}％`).join('、')}。`);destinations.append(pie);
 const list=make('ul','sc-flow-destinations');slices.forEach((row,i)=>{const li=make('li');const key=make('i');key.style.background=colors[i];li.append(key,make('span',undefined,row.name),make('strong',undefined,`${(row.quantity/basmati*100).toFixed(1)}％`));list.append(li);});destinations.append(list);
 destinations.append(make('p','sc-flow-detail',`相手国別はバスマティ米だけの内訳（${riceFlow.period}、数量）。その他の米は含みません。上位10か国以外は${formatMillions(other)}です。`));destinations.append(source());
}
