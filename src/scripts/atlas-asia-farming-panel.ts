import {asiaFarmDefinitions,asiaFarmRegionReading,asiaForestSources,asiaFarmFlagLabels,asiaFarmUnit,type AsiaFarmingLayer,type AsiaFarmStatistics,type AsiaFarmObservation} from '../data/atlas/asia-farming';
import type {AsiaRegionId} from '../lib/atlas-asia-state';
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
  $('[data-farming-method]').textContent=definitions[layer.kind]+(layer.kind!=='forest'?' 元格子をWeb Mercatorへ最近傍で再標本化しています。表示画像と照会値には同じ配列を使い、0と欠測を区別します。地図上の見かけの格子面積は緯度によって変わります。':'');
  const sources=$('[data-farming-map-source]');sources.replaceChildren();
  const link=document.createElement('a');link.textContent=layer.kind==='crop'?'IFPRI MapSPAM 2020 v2r2（CC BY 4.0）':layer.kind==='livestock'?'FAO GLW4 / CGIAR（CC BY 4.0）':'JRC Global Forest Cover 2020 v3';link.href=layer.kind==='crop'?'https://doi.org/10.7910/DVN/SWPENT':layer.kind==='livestock'?'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/':'https://forobs.jrc.ec.europa.eu/GFC/v3';sources.append(link,document.createTextNode((layer.kind==='forest'?'。European Union, Copernicus Land Monitoring Service / JRC。':'。')+'地域の抽出・表示：Insight Journal。'));
  const reference=$('[data-farming-reference]');reference.replaceChildren();if(layer.kind==='forest')for(const source of asiaForestSources[region]){const p=document.createElement('p'),a=document.createElement('a');a.href=source.url;a.textContent=source.label;p.append(a);reference.append(p);}
 }
 $('[data-farming-statistics-title]').textContent=country?`${country.name}の${definition.statName}`:'国・地域の統計を読む';$('[data-farming-statistics-definition]').textContent=definition.definition;
 const tables=$('[data-farming-statistics-tables]');tables.replaceChildren();
 const status=$('[data-farming-statistics-status]');
 if(!country){status.textContent='国・地域を選ぶと、2015–2024年の統計を表示します。';return;}
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
