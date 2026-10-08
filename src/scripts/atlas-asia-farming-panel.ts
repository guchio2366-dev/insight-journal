import {asiaFarmDefinitions,asiaFarmRegionReading,asiaForestSources,asiaFarmFlagLabels,asiaFarmUnit,type AsiaFarmingLayer,type AsiaFarmStatistics,type AsiaFarmObservation} from '../data/atlas/asia-farming';
import type {AsiaRegionId} from '../lib/atlas-asia-state';
import southCentralShares from '../../public/assets/atlas/south-central-asia-v1/world-shares.json';
import southeastShares from '../../public/assets/atlas/southeast-asia-v1/world-shares.json';
import {renderSouthCentralRiceFlow} from './atlas-south-central-rice-flow';
type ShareYear={year:number;countries:Record<string,{share:number;flag:string}>};
type ShareSeries={id:string;label:string;definition:string;years:ShareYear[]};
const worldShareByTopic:Record<string,string>={rice:'rice-production',wheat:'wheat-production',maize:'maize-production',soybean:'soybean-production',cattle:'cattle-stocks',chicken:'chicken-stocks',sheep:'sheep-stocks',forest:'forest-area'};
const shareName:Record<string,string>={'rice-production':'米（籾米）','wheat-production':'小麦','maize-production':'トウモロコシ','soybean-production':'大豆','cattle-stocks':'牛の飼養頭数','chicken-stocks':'鶏の飼養羽数','sheep-stocks':'羊の飼養頭数','forest-area':'森林面積'};
const shareKind=(id:string)=>id.endsWith('-stocks')?'世界の飼養頭数・羽数':id==='forest-area'?'世界の森林面積':'世界生産量';
const percentage=(n:number)=>n<0.05?'0.05％未満':`${n.toLocaleString('ja-JP',{maximumFractionDigits:1,minimumFractionDigits:1})}％`;
const sourceFlag=(flag:string)=>asiaFarmFlagLabels[flag]??`原資料区分 ${flag}`;
const svgNode=(tag:string,attrs:Record<string,string>)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;};
/** Source-matched country/world ratios; never repurpose them as trade or domestic supply. */
export function renderSouthCentralFarmConnections(root:HTMLElement,region:AsiaRegionId,active:boolean,topic:string|null,country:{code:string;name:string}|undefined){
 const section=root.querySelector<HTMLElement>('[data-south-central-farm-connections]');if(!section)return;
 section.hidden=!active||(region!=='south-central-asia'&&region!=='southeast-asia');if(section.hidden)return;
 renderSouthCentralRiceFlow(section,region,topic,country?.code);
 const host=section.querySelector<HTMLElement>('[data-south-central-world-share]')!;host.replaceChildren();
 const isSoutheast=region==='southeast-asia',worldSeries=(isSoutheast?southeastShares.series:southCentralShares.series) as ShareSeries[];
 const sharePercent=(value:number)=>isSoutheast?(value>0&&value<.01?'0.01％未満':`${value.toLocaleString('ja-JP',{maximumFractionDigits:2,minimumFractionDigits:2})}％`):percentage(value);
 let code=country?.code??(isSoutheast?'IDN':'IND'),id=worldShareByTopic[topic??''];
 if(topic==='overview'){
  const candidates=isSoutheast?['rice-production','maize-production','soybean-production']:['rice-production','wheat-production','maize-production','soybean-production'];
  id=candidates.map(key=>({key,share:worldSeries.find(s=>s.id===key)?.years.find(y=>y.year===2024)?.countries[code]?.share??-1})).sort((a,b)=>b.share-a.share)[0]?.key;
 }
 const series=worldSeries.find(s=>s.id===id),record=series?.years.find(y=>y.year===2024)?.countries[code];
 if(!series||!record){const p=document.createElement('p');p.textContent=topic==='overview'?'この地域の代表品目について、2024年の比較値がありません。':'選んだ品目と国・地域の同じ定義による世界比率は未収録です。';host.append(p);return;}
 const name=country?.name??(isSoutheast?'インドネシア':'インド'),measure=shareName[id]??series.label;
 const lead=document.createElement('p');lead.className='sc-share-lead';lead.textContent=`${name}の${measure}は、2024年に${shareKind(id)}の${sharePercent(record.share)}。`;host.append(lead);
 const first=series.years.find(y=>y.year===2015)?.countries[code];
 const change=document.createElement('p');change.className='sc-share-detail';
 if(first){const delta=record.share-first.share;change.textContent=`2015年${sharePercent(first.share)} → 2024年${sharePercent(record.share)}（${Math.abs(delta).toFixed(isSoutheast?2:1)}ポイント${delta>0?'上昇':delta<0?'低下':'変化なし'}）。`;}
 else change.textContent='2015年の比較値は未掲載です。';host.append(change);
 const points=series.years.map(y=>({year:y.year,share:y.countries[code]?.share})).filter((p):p is {year:number;share:number}=>p.share!==undefined);
 if(points.length>=2){
  const max=Math.max(0.01,...points.map(p=>p.share))*1.12,svg=svgNode('svg',{viewBox:'0 0 310 130',class:'sc-share-chart',role:'img','aria-label':`${name}の${measure}の世界比率、2015年から2024年の折れ線。年別の正確な値は直後の表を参照。`});
  const x=(year:number)=>28+(year-2015)*28,y=(share:number)=>105-share/max*87;
  svg.append(svgNode('line',{x1:'28',y1:'105',x2:'280',y2:'105',class:'axis'}),svgNode('line',{x1:'28',y1:'18',x2:'28',y2:'105',class:'axis'}));
  for(const [label,tx,ty] of [[sharePercent(max),'1','22'],['0','14','108'],['2015','24','124'],['2024','252','124']]){const text=svgNode('text',{x:tx,y:ty});text.textContent=label;svg.append(text);}
  let segment:{year:number;share:number}[]=[];
  const flush=()=>{if(segment.length>1)svg.append(svgNode('polyline',{points:segment.map(p=>`${x(p.year)},${y(p.share)}`).join(' '),class:'trend'}));segment=[];};
  for(const year of series.years){const share=year.countries[code]?.share;if(share===undefined){flush();continue;}segment.push({year:year.year,share});}flush();
  for(const p of points)svg.append(svgNode('circle',{cx:String(x(p.year)),cy:String(y(p.share)),r:p.year===2024?'3.7':'2.1',class:'dot'}));
  host.append(svg);
 }
 if(!country&&topic==='overview'&&isSoutheast){
  const rice=worldSeries.find(s=>s.id==='rice-production')?.years.find(y=>y.year===2024);
  const vietnam=rice?.countries.VNM,thailand=rice?.countries.THA;
  if(vietnam&&thailand){const p=document.createElement('p');p.className='sc-share-detail';p.textContent=`別の米の例：ベトナム${sharePercent(vietnam.share)}、タイ${sharePercent(thailand.share)}（2024年）。これは3か国の比較で、欠測のある地域全体の世界比ではありません。`;host.append(p);}
 }
 if(!country&&topic==='overview'&&!isSoutheast){
  const kaz=worldSeries.find(s=>s.id==='wheat-production')?.years.find(y=>y.year===2024)?.countries.KAZ;
  if(kaz){const p=document.createElement('p');p.className='sc-share-detail';p.textContent=`別の代表例：カザフスタンの小麦は2024年の世界生産量の${sharePercent(kaz.share)}。品目名や国を選ぶと、その系列に切り替わります。`;host.append(p);}
 }
 const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='年別の値・分母・出典を確認する';detail.append(summary);
 const table=document.createElement('table'),thead=document.createElement('thead'),header=document.createElement('tr');for(const title of ['年','世界比率','国別値の区分']){const th=document.createElement('th');th.scope='col';th.textContent=title;header.append(th);}thead.append(header);table.append(thead);
 const body=document.createElement('tbody');for(const year of series.years){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=String(year.year);const value=year.countries[code];const td=document.createElement('td'),flag=document.createElement('td');td.textContent=value?sharePercent(value.share):'未掲載';flag.textContent=value?sourceFlag(value.flag):'―';tr.append(th,td,flag);body.append(tr);}table.append(body);detail.append(table);
 const note=document.createElement('p');note.className='sc-share-detail';note.textContent='同じFAOSTAT品目・年・単位の国別値÷世界値。比率の変化には、国と世界の両方の値が関わります。';detail.append(note);
 const source=document.createElement('a');source.href=id==='forest-area'?'https://www.fao.org/faostat/en/#data/RL':id==='roundwood-production'||id==='sawnwood-production'?'https://www.fao.org/faostat/en/#data/FO':'https://www.fao.org/faostat/en/#data/QCL';source.textContent='FAOSTATの原資料';detail.append(source);host.append(detail);
}
const definitions={
 crop:'元資料はIFPRI MapSPAM 2020 v2r2です。緯度・経度それぞれ5分、南北で約9kmの元格子ごとに、年間の収穫面積をhaで推計しています。同じ土地から年に複数回収穫する場合は、その面積を複数回数えます。灌漑と天水を合計した値で、畑の境界を直接観測した図ではありません。',
 livestock:'元資料はFAO GLW4の2020年の家畜密度です。緯度・経度それぞれ5分、南北で約9kmの格子に、統計などを用いて頭数・羽数を配分した推計です。単位は頭/km²または羽/km²です。密度をそのまま足し合わせても頭数にはなりません。',
 forest:'JRCのGlobal Forest Cover 2020 v3を、提供元が描いた参考画像として表示しています。元資料の分類は10mですが、この広域画像はそれより粗く表示しています。画像から森林面積や地点の分類値は計算しません。樹木がある土地と、資料が定義する森林は同じではありません。伐採量・木材生産量・現在の森林減少を示す図でもありません。',
};
export function farmSeries(topic:string,layer:AsiaFarmingLayer|undefined,rows:AsiaFarmObservation[]){
 if(topic==='forest')return [
  {title:'森林面積',rows:rows.filter(r=>r.domain==='Inputs_LandUse'&&r.item==='6646'&&r.element==='Area')},
  {title:'丸太の生産量（燃料用を含む）',rows:rows.filter(r=>r.domain==='Forestry'&&r.item==='1861'&&r.element==='Production')},
  {title:'製材の生産量',rows:rows.filter(r=>r.domain==='Forestry'&&r.item==='1872'&&r.element==='Production')},
 ];
 const item=topic==='rice'?'27':String(layer?.faoItem),base=rows.filter(r=>r.domain==='Production_Crops_Livestock'&&r.item===item);
 return layer?.kind==='livestock'?[{title:'飼養頭数・羽数',rows:base.filter(r=>r.element==='Stocks')}]:[{title:'生産量',rows:base.filter(r=>r.element==='Production')},{title:'収穫面積',rows:base.filter(r=>r.element==='Area harvested')}];
}
export function renderAsiaFarmingPanel(root:HTMLElement,region:AsiaRegionId,topic:string,layer:AsiaFarmingLayer|undefined,country:{code:string;name:string}|undefined,statistics:AsiaFarmStatistics|null){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const definition=asiaFarmDefinitions[topic];if(!definition)return;
 $('[data-farming-extra]').hidden=!layer;$('[data-farming-map-method]').hidden=!layer;
 if(layer){
  $('[data-farming-title]').textContent=`${country?country.name+'の':''}${layer.title}を読む`;
  $('[data-farming-takeaway]').textContent=asiaFarmRegionReading[region][layer.kind];
  $('[data-farming-definition]').textContent=definition.definition;
  const coverage=country?layer.countryCoverage?.[country.code]:null;
  $('[data-farming-coverage]').textContent=coverage?.maskPixels===0?'この国・地域の島は、広域図の格子の中心に収まりません。地図の空白から生産がないと判断せず、下の国別統計を参照してください。':coverage?.validPixels===0?'この国・地域の範囲には、採用した資料の有効な表示格子がありません。統計がある場合は下の表で確認できます。':coverage?.positivePixels===0?'この国・地域の範囲では、採用した表示格子に正の値がありません。ほかの品目や農業全体の不存在を意味するものではありません。':'';
  $('[data-farming-method]').textContent=definitions[layer.kind]+(layer.kind!=='forest'?' 元格子をWeb Mercatorへ最近傍で再標本化しています。品目別の原画像と地点の照会値には同じ配列を使い、0と欠測を区別します。地図上の見かけの格子面積は緯度によって変わります。' + (root.querySelector('[data-map-annotations]')?' 地図は各品目の概略分布を残して、選択作物の輪郭を強調します。概略の面から地点の値や生産量は計算しません。':''):'');
  const sources=$('[data-farming-map-source]');sources.replaceChildren();
  const link=document.createElement('a');link.textContent=layer.kind==='crop'?'IFPRI MapSPAM 2020 v2r2（CC BY 4.0）':layer.kind==='livestock'?'FAO GLW4 / CGIAR（CC BY 4.0）':'JRC Global Forest Cover 2020 v3';link.href=layer.kind==='crop'?'https://doi.org/10.7910/DVN/SWPENT':layer.kind==='livestock'?'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/':'https://forobs.jrc.ec.europa.eu/GFC/v3';sources.append(link,document.createTextNode((layer.kind==='forest'?'。European Union, Copernicus Land Monitoring Service / JRC。':'。')+'地域の抽出・表示：Insight Journal。'));
  const reference=$('[data-farming-reference]');reference.replaceChildren();if(layer.kind==='forest')for(const source of asiaForestSources[region]){const p=document.createElement('p'),a=document.createElement('a');a.href=source.url;a.textContent=source.label;p.append(a);reference.append(p);}
 }
 $('[data-farming-statistics-title]').textContent=country?`${country.name}の${definition.statName}`:'国・地域の統計を読む';$('[data-farming-statistics-definition]').textContent=definition.definition;
 const tables=$('[data-farming-statistics-tables]');tables.replaceChildren();
 const status=$('[data-farming-statistics-status]');
 if(!country){status.textContent=region==='southeast-asia'?'雨温図や地域事例から同じ場所を比較すると、その国全体の2015–2024年の統計を表示します。':'国・地域を選ぶと、2015–2024年の統計を表示します。';return;}
 if(!statistics){status.textContent='国・地域の統計を読み込んでいます。';return;}
 const record=statistics.countries[country.code];status.textContent=country.code==='CHN'?'この表はFAOの中国本土の統計です。香港・マカオ・台湾を含むChina集計とは区別しています。':country.code==='TWN'?'この表はFAOの台湾区分（M49:158）を使っています。':'';
 for(const series of farmSeries(topic,layer,record?.observations??[])){
  // A source element with a unit change must not be drawn as one time series.
  const units=[...new Set(series.rows.map(r=>r.unit))];
  for(const unit of units.length?units:['']){
   const observations=series.rows.filter(r=>r.unit===unit),table=document.createElement('table');table.className='asia-stat-table';const caption=document.createElement('caption');caption.textContent=`${series.title}${unit?'（'+asiaFarmUnit(unit,topic)+'）':''}`;table.append(caption);
   const head=document.createElement('thead'),hr=document.createElement('tr');for(const text of ['年','値・資料の区分']){const th=document.createElement('th');th.scope='col';th.textContent=text;hr.append(th);}head.append(hr);table.append(head);
   const body=document.createElement('tbody');for(let year=2015;year<=2024;year++){
    const row=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td'),value=observations.find(r=>r.year===year);th.scope='row';th.textContent=String(year);
    td.textContent=value?.value!=null?value.value.toLocaleString('ja-JP',{maximumFractionDigits:2}):'未掲載';if(value){const note=document.createElement('small');note.textContent=(asiaFarmFlagLabels[value.flag]??value.flag)+(value.note?` · ${value.note}`:'');td.append(note);}row.append(th,td);body.append(row);
   }table.append(body);
   const values=observations.filter(r=>r.value!==null&&r.value>=0),max=Math.max(0,...values.map(r=>r.value!));
   if(max>0){const scale=document.createElement('p');scale.className='farming-note';scale.textContent=`${series.title}の推移を示します。棒の高さは0から${max.toLocaleString('ja-JP',{maximumFractionDigits:2})} ${asiaFarmUnit(unit,topic)}の範囲です。`;tables.append(scale);const chart=document.createElement('div');chart.className='asia-stat-chart';chart.setAttribute('role','img');chart.setAttribute('aria-label',`${series.title}の2015年から2024年の推移。正確な値と欠測は直後の表に示します。`);for(let year=2015;year<=2024;year++){const value=observations.find(r=>r.year===year),bar=document.createElement('span');bar.style.height=value?.value!=null?`${value.value/max*100}%`:'0';if(value?.value==null)bar.style.background='transparent';bar.title=`${year}: ${value?.value??'未掲載'}`;const label=document.createElement('b');label.textContent=String(year).slice(2);bar.append(label);chart.append(bar);}tables.append(chart);}
   tables.append(table);
  }
 }
}
