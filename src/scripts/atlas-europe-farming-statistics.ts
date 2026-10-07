import {
  europeFarmAvailableMetrics, europeFarmComparisonYear, europeFarmMetric,
  europeFarmObservation, europeFarmUnitLabel, europeFarmWorldShare,
  europeFarmWorldObservation, europeFarmYears,
  type EuropeFarmMetric, type EuropeFarmObservation, type EuropeFarmStatistics,
} from '../data/atlas/europe/farming-statistics';
import { europeFarmShareSeries, europeFarmShareSegments } from '../lib/atlas-europe-farm-share';
import type { EuropeState } from '../lib/atlas-europe-view';

type Country = {code:string;name:string};
type Callbacks = {
  countries:Country[];
  onChange:(choice:Pick<EuropeState,'farmYear'|'farmMeasure'|'farmCompare'>)=>void;
  onCountry:(code:string)=>void;
};

/** One small national dataset, requested only for a supported selected subject.
 * A failed request can be retried; late results never restore an old selection.
 */
export function createEuropeFarmingStatistics(root:HTMLElement,callbacks:Callbacks){
  const query=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const panel=query('[data-eu-farm-numbers]');
  const message=query('[data-eu-farm-statistics-message]');
  const controls=query('[data-eu-farm-stat-controls]');
  const measureSelect=query<HTMLSelectElement>('[data-eu-farm-measure]');
  const countrySelect=query<HTMLSelectElement>('[data-eu-farm-country]');
  const shareChart=query('[data-eu-farm-share-chart]');
  let redrawShare:(()=>void)|undefined;
  countrySelect.addEventListener('change',()=>callbacks.onCountry(countrySelect.value));
  new ResizeObserver(()=>redrawShare?.()).observe(shareChart);
  const yearSelect=query<HTMLSelectElement>('[data-eu-farm-year]');
  const compares=[0,1].map(index=>query<HTMLSelectElement>(`[data-eu-farm-compare="${index}"]`));
  const retry=query<HTMLButtonElement>('[data-eu-farm-statistics-retry]');
  const quick=query('[data-eu-farm-quick-summary]');
  let data:EuropeFarmStatistics|undefined,pending:Promise<EuropeFarmStatistics>|undefined;
  let generation=0,current:EuropeState|undefined,currentMetric:EuropeFarmMetric|undefined;
  const countryName=(code:string)=>callbacks.countries.find(country=>country.code===code)?.name??code;
  const create=(tag:string,text?:string)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  const value=(observation:EuropeFarmObservation|null)=>observation===null?'未収録':observation.value>0&&observation.value<.01?'0.01未満（0超）':observation.value.toLocaleString('ja-JP',{maximumFractionDigits:2});
  const percent=(amount:number)=>amount>0&&amount<.01?'0.01%未満（0超）':amount.toLocaleString('ja-JP',{maximumFractionDigits:2})+'%';
  const status=(observation:EuropeFarmObservation|null)=>observation?.flag?`${observation.flag}：${observation.flagDescription}`:'—';
  const choice=()=>({farmYear:current?.farmYear??europeFarmComparisonYear,farmMeasure:currentMetric?.id,farmCompare:compares.map(select=>select.value).filter(Boolean)});
  measureSelect.addEventListener('change',()=>{
    currentMetric=europeFarmMetric(measureSelect.value);
    callbacks.onChange({...choice(),farmMeasure:measureSelect.value});
  });
  yearSelect.addEventListener('change',()=>callbacks.onChange({...choice(),farmYear:Number(yearSelect.value)}));
  for(const select of compares)select.addEventListener('change',()=>callbacks.onChange(choice()));
  retry.addEventListener('click',()=>{pending=undefined;data=undefined;if(current)void update(current);});

  async function load(){
    if(data)return data;
    if(!pending)pending=fetch(panel.dataset.statisticsUrl!).then(async response=>{
      if(!response.ok)throw Error('FAOSTAT statistics unavailable');
      const bytes=new Uint8Array(await response.arrayBuffer());
      const text=bytes[0]===0x1f&&bytes[1]===0x8b
        ?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
        :new TextDecoder().decode(bytes);
      const result=JSON.parse(text) as EuropeFarmStatistics;
      if(result.schemaVersion!==1||result.comparisonYear!==2024||!result.countries||!result.world||!Array.isArray(result.measures)||!Array.isArray(result.sources)
        ||callbacks.countries.some(country=>!result.countries[country.code])
        ||result.measures.some(metric=>!europeFarmMetric(metric.id)))throw Error('Invalid FAOSTAT statistics contract');
      data=result;return result;
    }).catch(error=>{pending=undefined;throw error;});
    return pending;
  }
  function clear(){
    for(const selector of ['[data-eu-farm-stat-summary]','[data-eu-farm-country-table]','[data-eu-farm-series]','[data-eu-farm-stat-source]','[data-eu-farm-measure-definition]'])query(selector).hidden=true;
    query('[data-eu-farm-share-title]').textContent='世界シェア・推移';
    quick.hidden=true;redrawShare=undefined;shareChart.replaceChildren();
    query('[data-eu-farm-share-status]').textContent='品目・統計対象国を選ぶと、公表World値に対する割合と年次推移を表示します。';
  }
  function table(headers:string[],caption:string){
    const element=create('table'),head=create('thead'),row=create('tr'),body=create('tbody');
    element.append(create('caption',caption));
    for(const label of headers){const cell=create('th',label);cell.setAttribute('scope','col');row.append(cell);}
    head.append(row);element.append(head,body);return {element,body};
  }
  function cell(text:string){return create('td',text);}
  function renderStatistics(state:EuropeState,metric:EuropeFarmMetric,statistics:EuropeFarmStatistics){
    const year=state.farmYear??europeFarmComparisonYear,unit=europeFarmUnitLabel(metric.unit);
    const codes=[state.place,...(state.farmCompare??[])].filter(Boolean);
    const summary=query('[data-eu-farm-stat-summary]');summary.replaceChildren();summary.hidden=codes.length===0;
    for(const code of codes){
      const observed=europeFarmObservation(statistics,code,metric.id,year),share=europeFarmWorldShare(statistics,code,metric.id,year);
      const box=create('section');box.append(create('h4',countryName(code)),create('p',`${year}年 · ${metric.label}：${value(observed)}${observed?' '+europeFarmUnitLabel(observed.unit):''}`));
      const shareText=create('p',`${metric.shareLabel}：${share?percent(share.value):'分母または同年の値が未収録'}`);
      shareText.className='eu-statistic-note';box.append(shareText);summary.append(box);
    }
    renderShare(state,metric,statistics,codes);
    const selected=state.place?europeFarmObservation(statistics,state.place,metric.id,year):null;
    quick.replaceChildren();quick.hidden=!state.place;
    if(state.place){
      quick.append(document.createTextNode(`${countryName(state.place)} · ${year}年 ${metric.label}：${value(selected)}${selected?' '+europeFarmUnitLabel(selected.unit):''}。`));
      const jump=create('a','国別比較・年次・出典へ ↓') as HTMLAnchorElement;jump.href='#eu-farm-numbers-title';quick.append(jump);
    }
    const definition=query('[data-eu-farm-measure-definition]');definition.hidden=false;
    const mapDefinition=state.layer==='forest'
      ?'地図は2023年・国全体の森林面積比率で、ここでは森林面積と木材生産量を別の指標として比べます。'
      :state.layer==='treecover'
        ?'地図はESA WorldCover 2021の樹木被覆分類で、FAOSTATの森林土地面積や木材生産量とは定義が異なります。'
        :'地図は2020年頃のモデル分布です。';
    definition.textContent=`${metric.definition} ${mapDefinition} 数量は${year}年・国全体の公表統計です。${state.place==='RUS'?'ロシアの数値は欧州側以外も含む全土です。':''}`;
    const countryTable=table(['国・地域',`${metric.label}（${unit}）`,metric.shareLabel,'出典記号'],`${year}年。同じ品目・要素・単位で比較。未収録は0ではありません。国名で地図の国を選択します。`);
    for(const country of callbacks.countries){
      const observed=europeFarmObservation(statistics,country.code,metric.id,year),share=europeFarmWorldShare(statistics,country.code,metric.id,year),row=create('tr');
      row.dataset.euFarmCountry=country.code;row.classList.toggle('is-selected',codes.includes(country.code));
      const header=create('th');header.setAttribute('scope','row');
      const button=create('button',country.name) as HTMLButtonElement;button.type='button';button.dataset.euFarmCountrySelect=country.code;
      button.addEventListener('click',()=>callbacks.onCountry(country.code));header.append(button);
      row.append(header,cell(value(observed)),cell(share?percent(share.value):'未収録'),cell(status(observed)));
      if(observed?.note)row.lastElementChild!.append(create('small',observed.note));
      countryTable.body.append(row);
    }
    query('[data-eu-farm-country-rows]').replaceChildren(countryTable.element);query('[data-eu-farm-country-table]').hidden=false;
    const series=query('[data-eu-farm-series]');series.hidden=codes.length===0;
    if(codes.length){
      const seriesTable=table(['年',...codes.map(code=>countryName(code))],`${metric.label} · ${unit}と${metric.shareLabel}。表示年に値がなくても別年へ置き換えません。記号と注記は原資料の値です。`);
      for(const year of europeFarmYears){
        const row=create('tr'),header=create('th',String(year));header.setAttribute('scope','row');row.append(header);
        for(const code of codes){const observed=europeFarmObservation(statistics,code,metric.id,year),item=cell(value(observed));item.append(create('small',status(observed)));if(observed?.note)item.append(create('small',observed.note));const share=europeFarmWorldShare(statistics,code,metric.id,year);item.append(create('small',metric.shareLabel+'：'+(share?percent(share.value):'未収録')));row.append(item);}
        seriesTable.body.append(row);
      }
      query('[data-eu-farm-series-rows]').replaceChildren(seriesTable.element);
    }
    const source=query('[data-eu-farm-stat-source-content]');source.replaceChildren();query('[data-eu-farm-stat-source]').hidden=false;
    const world=europeFarmWorldObservation(statistics,metric.id,year);
    source.append(create('p',`${metric.shareLabel}の分母はFAOSTATが公表するWorld行（同じ年・品目・要素・単位）です。${year}年の分母：${value(world)}${world?' '+europeFarmUnitLabel(world.unit):''}。欧州の国を合計した分母ではありません。`));
    source.append(create('p',`${metric.domain} / item ${metric.itemCode} / element ${metric.elementCode}。肉・乳・卵と生体数、森林面積と丸太・製材を別々に読み、足し合わせません。KOSなど資料と対応しない対象や未掲載の年は未収録として残します。`));
    const official=statistics.sources.find(item=>item.id===metric.domain);
    if(official){
      const links=create('p');
      for(const [label,url] of [[official.publisher+'：'+official.dataset,official.landingUrl],['原配布ZIP',official.url],['利用条件 '+official.license,official.licenseUrl]]){const a=create('a',label) as HTMLAnchorElement;a.href=url;links.append(a,document.createTextNode(' · '));}
      source.append(links,create('p',`資料の公表日：${official.releaseDate}。利用条件確認：${official.licenseVerifiedAt}。保存原本を再利用して対象国・品目・年を抽出しました。FAOSTATの公的報告・推計・補完等の記号を保持しています。`));
    }
    const credit=create('p','Source: FAO, FAOSTAT. Reproduced / adapted by Insight Journal. CC BY 4.0. 本サイトの加工や説明について、FAOの推薦・保証を示すものではありません。');source.append(credit);
    const audit=create('p');for(const [label,name] of [['抽出データ','statistics.json'],['取得・加工・ハッシュの記録','manifest.json']]){const a=create('a',label) as HTMLAnchorElement;a.href=new URL(name,new URL(panel.dataset.statisticsUrl!,location.href)).href;audit.append(a,document.createTextNode(' · '));}source.append(audit);
    message.textContent=`${metric.label} · ${year}年・国全体。世界比の分母と資料の記号は下の出典で確認できます。`;
  }
  function renderShare(state:EuropeState,metric:EuropeFarmMetric,statistics:EuropeFarmStatistics,codes:string[]){
    query('[data-eu-farm-share-title]').textContent=metric.shareLabel+'・推移';
    const series=codes.map(code=>({code,points:europeFarmShareSeries(statistics,code,metric.id)}));
    const year=state.farmYear??europeFarmComparisonYear;
    const labels=series.map(item=>{const point=item.points.find(point=>point.year===year)!;return `${countryName(item.code)} ${year}年：${point.value===null?'同年の分子または分母が未収録':percent(point.value)}`;});
    query('[data-eu-farm-share-status]').textContent=labels.length?labels.join('。')+'。':'統計対象国を選ぶと、その国の数量を同年の公表World値で割った割合を表示します。欧州合計は作っていません。';
    if(!series.some(item=>item.points.some(point=>point.value!==null)))return;
    redrawShare=()=>{
      shareChart.replaceChildren();
      const ns='http://www.w3.org/2000/svg',width=Math.max(260,shareChart.clientWidth||360),height=240;
      const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${metric.shareLabel}の2015〜2024年推移。${labels.join('。')}。欠測年では線を切っています。`);
      const add=(tag:string,attrs:Record<string,string>,text?:string)=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;svg.append(el);return el;};
      add('title',{},`${metric.label}の${metric.shareLabel}`);add('desc',{},'分母はFAOSTATの同年・同品目・同要素・同単位のWorld行。正確な数量と出典記号は年次表で確認できます。');
      const values=series.flatMap(item=>item.points.flatMap(point=>point.value===null?[]:[point.value]));
      const maximum=Math.max(1,Math.ceil(Math.max(...values)/5)*5),left=46,right=width-15,top=20,bottom=202;
      const x=(year:number)=>left+(year-2015)/9*(right-left),y=(value:number)=>bottom-value/maximum*(bottom-top);
      for(let i=0;i<=4;i++){const value=maximum*i/4;add('line',{x1:String(left),x2:String(right),y1:String(y(value)),y2:String(y(value)),stroke:'#d4ddd6'});add('text',{x:String(left-7),y:String(y(value)+5),'text-anchor':'end'},`${value.toLocaleString('ja-JP',{maximumFractionDigits:1})}%`);}
      for(const year of [2015,2018,2021,2024])add('text',{x:String(x(year)),y:'227','text-anchor':'middle'},String(year));
      const colors=['#1d6172','#ad5937','#6d518b'];
      for(const [index,item] of series.entries()){
        for(const segment of europeFarmShareSegments(item.points))add('path',{d:segment.map((point,i)=>`${i?'L':'M'}${x(point.year).toFixed(2)},${y(point.value!).toFixed(2)}`).join(' '),fill:'none',stroke:colors[index],'stroke-width':'2.5','data-share-country':item.code});
        for(const point of item.points)if(point.value!==null){const dot=add('circle',{cx:String(x(point.year)),cy:String(y(point.value)),r:point.year===year?'4':'2.5',fill:colors[index],'data-share-year':String(point.year)});const title=document.createElementNS(ns,'title');title.textContent=`${countryName(item.code)} ${point.year}年 ${percent(point.value)}`;dot.append(title);}
      }
      shareChart.append(svg);
      const key=create('ul');key.className='eu-farm-share-key';
      series.forEach((item,index)=>{const li=create('li',countryName(item.code)),swatch=create('span');swatch.style.backgroundColor=colors[index];swatch.setAttribute('aria-hidden','true');li.prepend(swatch);key.append(li);});shareChart.append(key);
    };
    redrawShare();
  }
  async function update(state:EuropeState){
    countrySelect.value=state.place;
    current={...state,farmCompare:state.farmCompare?[...state.farmCompare]:undefined};
    const token=++generation,available=europeFarmAvailableMetrics(state.layer);
    clear();retry.hidden=true;
    controls.hidden=available.length===0;
    if(!available.length){message.textContent=state.layer==='crops'?'品目を選ぶと、その品目の生産・飼養の全国値を比べられます。':['vegetables','temperatefruit','citrus'].includes(state.layer)?'この集合的な地図区分に直接対応する数量統計は未収録です。個別作物の統計で代用していません。':'選択中の分野に対応する農林業の数量統計はありません。';return;}
    currentMetric=available.find(metric=>metric.id===state.farmMeasure)??available[0];
    measureSelect.replaceChildren(...available.map(metric=>{const option=document.createElement('option');option.value=metric.id;option.textContent=metric.label;return option;}));
    measureSelect.value=currentMetric.id;yearSelect.value=String(state.farmYear??europeFarmComparisonYear);
    compares.forEach((select,index)=>{select.value=state.farmCompare?.[index]??'';for(const option of select.options)option.disabled=option.value!==''&&(option.value===state.place||index===1&&option.value===state.farmCompare?.[0]);});
    message.textContent='FAOSTATの国別数量を読み込んでいます…';
    try{const statistics=await load();if(token!==generation)return;renderStatistics(state,currentMetric!,statistics);}
    catch{if(token!==generation)return;message.textContent='数量統計を取得できませんでした。地図・比較リンクを使えます。下のボタンで再試行できます。';retry.hidden=false;}
  }
  return {update};
}
