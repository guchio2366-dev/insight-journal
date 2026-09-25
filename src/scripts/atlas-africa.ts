import {countries,fields,metrics,regionNames,years,readState,writeState,metricById,valueAt,formatValue,fillFor,rankedCountries,palette,sources,defaultYear,type Field,type Region,type Metric} from '../data/atlas/africa-atlas.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';

export function initializeAfricaAtlas() {
 const root=document.querySelector<HTMLElement>('[data-africa-atlas]');
 if(!root||root.dataset.initialized)return;
 root.dataset.initialized='true';
 const query=<T extends Element>(s:string)=>root.querySelector<T>(s)!;
 const text=(s:string,t:string)=>{query<HTMLElement>(s).textContent=t;};
 const make=(tag:string,t?:string)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n;};
 const svgNS='http://www.w3.org/2000/svg';
 const svgEl=(tag:string,attrs:Record<string,string|number>,t?:string)=>{const n=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(t!==undefined)n.textContent=t;return n;};
 let state=readState(location.search);
 const paths=[...root.querySelectorAll<SVGPathElement>('[data-country-path]')];
 const map=query<SVGSVGElement>('.africa-map');
 function fitMap() {
  map.dataset.detail=String(state.zoom!=='all');
  if(state.zoom==='all'||state.zoom==='region'&&state.region==='all'){map.setAttribute('viewBox',`0 0 ${africaWidth} ${africaHeight}`);return;}
  const boxes=paths.filter(p=>state.zoom==='country'?p.dataset.countryPath===state.place:countries.find(c=>c.code===p.dataset.countryPath)?.region===state.region).map(p=>p.getBBox());
  if(!boxes.length)return;
  const left=Math.min(...boxes.map(b=>b.x)),right=Math.max(...boxes.map(b=>b.x+b.width));
  const top=Math.min(...boxes.map(b=>b.y)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
  const width=Math.max(18,(right-left)*1.18,(bottom-top)*1.18*africaWidth/africaHeight);
  const height=width*africaHeight/africaWidth;
  map.setAttribute('viewBox',`${(left+right-width)/2} ${(top+bottom-height)/2} ${width} ${height}`);
 }
 function renderTrend(metric:Metric) {
  const container=query<HTMLElement>('[data-trend]');container.replaceChildren();
  const body=query<HTMLTableSectionElement>('[data-trend-table]');body.replaceChildren();
  const details=body.closest('details')!;
  details.hidden=!!metric.timeless;
  if(metric.timeless){container.append(make('p','長期平均の降水量なので、年ごとの推移は表示しません。'));return;}
  const codes=[state.place,...state.compare?[state.compare]:[]];
  const lines=codes.map(code=>years.map(year=>valueAt(metric.id,code,year)));
  const vals=lines.flat().filter((v):v is number=>v!==null);
  if(!vals.length)container.append(make('p','この指標の時系列は未収録です。'));
  else {
   const min=Math.min(0,...vals),max=Math.max(0,...vals);const span=max-min||1;
   const chart=svgEl('svg',{viewBox:'0 0 300 180',role:'img','aria-label':`${metric.label}、2000〜2024年の推移。下の表に各年の数値があります。`});
   const y=(v:number)=>140-(v-min)/span*108;
   for(const v of [min,max]){chart.append(svgEl('line',{x1:45,x2:288,y1:y(v),y2:y(v),stroke:'#d0d6c8'}));chart.append(svgEl('text',{x:42,y:y(v)+4,'text-anchor':'end'},new Intl.NumberFormat('ja',{notation:'compact',maximumFractionDigits:1}).format(v)));}
   if(min<0&&max>0)chart.append(svgEl('line',{x1:45,x2:288,y1:y(0),y2:y(0),stroke:'#d0d6c8','stroke-dasharray':'3 3'}));
   chart.append(svgEl('text',{x:45,y:161},'2000'));chart.append(svgEl('text',{x:288,y:161,'text-anchor':'end'},'2024'));
   lines.forEach((values,index)=>{let d='',connected=false;values.forEach((v,i)=>{if(v===null){connected=false;return;}const x=45+i/24*243;d+=`${connected?'L':'M'}${x},${y(v)}`;connected=true;chart.append(svgEl('circle',{cx:x,cy:y(v),r:2,fill:index?'#263e7c':'#a44225'}));});chart.append(svgEl('path',{d,fill:'none',stroke:index?'#263e7c':'#a44225','stroke-width':2,'stroke-dasharray':index?'5 3':'none'}));});
   container.append(chart,make('p',`実線：${countries.find(c=>c.code===state.place)?.name}${state.compare?` ／ 破線：${countries.find(c=>c.code===state.compare)?.name}`:''}。単位：${metric.unit}。欠測区間は線をつなぎません。`));
  }
  for(const year of years){const tr=make('tr');tr.append(make('th',String(year)),make('td',formatValue(valueAt(metric.id,state.place,year),metric)),make('td',state.compare?formatValue(valueAt(metric.id,state.compare,year),metric):'—'));body.append(tr);}
 }
 function render(write=false) {
  const metric=metricById(state.metric);
  const country=countries.find(c=>c.code===state.place)!;
  const comparison=countries.find(c=>c.code===state.compare);
  const period=metric.timeless?'長期平均':`${state.year}年`;
  for(const button of root!.querySelectorAll<HTMLButtonElement>('[data-field]'))button.setAttribute('aria-pressed',String(button.dataset.field===state.field));
  for(const option of query<HTMLSelectElement>('[data-metric]').options){const selectedField=metricById(option.value).field===state.field;option.hidden=!selectedField;option.disabled=!selectedField;}
  query<HTMLSelectElement>('[data-metric]').value=state.metric;
  query<HTMLSelectElement>('[data-year]').value=String(state.year);query<HTMLSelectElement>('[data-year]').disabled=!!metric.timeless;query<HTMLButtonElement>('[data-latest]').disabled=!!metric.timeless;
  text('[data-year-note]',metric.timeless?'長期平均のため年による切替はありません':'国平均・選択年の値。未収録年は欠測表示。');
  query<HTMLSelectElement>('[data-region]').value=state.region;query<HTMLSelectElement>('[data-place]').value=state.place;query<HTMLSelectElement>('[data-compare]').value=state.compare;
  for(const option of query<HTMLSelectElement>('[data-compare]').options)option.disabled=option.value===state.place;
  text('[data-field-title]',fields[state.field].title);text('[data-field-summary]',fields[state.field].summary);
  text('[data-period]',period);text('[data-metric-title]',metric.label);text('[data-unit]',metric.unit);text('#africa-svg-title',`${metric.label}・${period}`);
  for(const path of paths){const code=path.dataset.countryPath!;const c=countries.find(c=>c.code===code)!;const v=valueAt(metric.id,code,state.year);path.setAttribute('fill',fillFor(v,metric));path.classList.toggle('is-selected',code===state.place);path.classList.toggle('is-compared',code===state.compare);path.classList.toggle('is-muted',state.region!=='all'&&c.region!==state.region&&code!==state.place&&code!==state.compare);path.querySelector('title')!.textContent=`${c.name}：${formatValue(v,metric)}${v===null?'':` ${metric.unit}`}（${period}）`;}
  const symbols=query<SVGGElement>('[data-symbols]');symbols.replaceChildren();
  if(metric.symbols)for(const c of [...countries].sort((a,b)=>(valueAt(metric.id,b.code,state.year)??0)-(valueAt(metric.id,a.code,state.year)??0))){const v=valueAt(metric.id,c.code,state.year);if(v===null||v<=0)continue;if(state.zoom==='country'&&c.code!==state.place&&c.code!==state.compare)continue;const [x,y]=projectAfrica(c.point);const circle=svgEl('circle',{cx:x,cy:y,r:Math.sqrt(v/1e6)*2.2,class:'africa-symbol','data-country-marker':c.code,opacity:state.region!=='all'&&c.region!==state.region&&c.code!==state.place&&c.code!==state.compare ? .25 : 1});circle.append(svgEl('title',{},`${c.name}：${formatValue(v,metric)}人`));symbols.append(circle);}
  for(const marker of root!.querySelectorAll<SVGGElement>('[data-island-marker]'))marker.style.display=metric.symbols?'none':'';
  for(const button of root!.querySelectorAll('[data-zoom]'))button.setAttribute('aria-pressed',String((button as HTMLElement).dataset.zoom===state.zoom));
  fitMap();
  const legend=query<HTMLElement>('[data-legend]');legend.replaceChildren();
  if(metric.symbols){const key=svgEl('svg',{viewBox:'0 0 310 72',width:310,height:72,role:'img','aria-label':'人口の円面積。100万人、1000万人、1億人の大きさ。'});[1e6,1e7,1e8].forEach((v,i)=>{const r=Math.sqrt(v/1e6)*2.2;key.append(svgEl('circle',{cx:44+i*105,cy:30,r,fill:'#3c7968','fill-opacity':.6}));key.append(svgEl('text',{x:44+i*105,y:66,'text-anchor':'middle','font-size':11},`${v/1e4}万人`));});legend.append(key);}
  else palette.forEach((color,i)=>{const label=i===0?`${metric.breaks[0].toLocaleString()}未満`:i===4?`${metric.breaks[3].toLocaleString()}以上`:`${metric.breaks[i-1].toLocaleString()}〜${metric.breaks[i].toLocaleString()}未満`;const span=make('span');const swatch=make('i');swatch.style.background=color;span.append(swatch,document.createTextNode(label));legend.append(span);});
  const missing=make('span');const swatch=make('i');swatch.className='africa-no-data';missing.append(swatch,document.createTextNode('未収録'));legend.append(missing);
  text('[data-map-caption]',metric.symbols?'円の面積は人口に比例。国を示す位置に置いており、都市人口や居住範囲ではありません。':'色は国平均・国全体の割合です。国内の分布・産地・都市の境界を表しません。島の白丸は選択用の目印です。');
  const ranked=rankedCountries(state);const count=ranked.filter(c=>c.value!==null).length;
  text('[data-coverage]',`${regionNames[state.region]}：${ranked.length}の国・地域のうち${count}件を収録、${ranked.length-count}件は未収録。赤枠は選択国、青い破線は比較国。`);
  text('[data-selected-name]',country.name);text('[data-selected-region]',regionNames[country.region as Region]);text('[data-selected-value]',formatValue(valueAt(metric.id,country.code,state.year),metric));text('[data-selected-unit]',metric.unit);
  text('[data-comparison]',comparison?`比較：${comparison.name}　${formatValue(valueAt(metric.id,comparison.code,state.year),metric)} ${metric.unit}`:'');
  text('[data-place-note]',country.code==='ESH'?'西サハラの独立したWDI系列は未収録です。モロッコの値は転用しません。':country.code==='SOM'?'数値はソマリア全体の統計です。地図ではソマリランドも同じ選択対象に含めています。':`${period}。国全体の集計値です。`);
  text('[data-column-place]',country.name);text('[data-column-compare]',comparison?.name??'比較国');query<HTMLElement>('[data-column-compare]').hidden=!comparison;
  const current=query<HTMLElement>('[data-current-metrics]');current.replaceChildren();
  for(const m of metrics.filter(m=>m.field===state.field)){const tr=make('tr');const th=make('th',m.label);th.append(make('small',m.unit));tr.append(th,make('td',formatValue(valueAt(m.id,state.place,state.year),m)));if(comparison)tr.append(make('td',formatValue(valueAt(m.id,state.compare,state.year),m)));current.append(tr);}
  text('[data-metric-year]',`表は${state.year}年（降水量のみ長期平均）。値がない年は「未収録」です。`);
  renderTrend(metric);
  text('[data-metric-note]',metric.note);query<HTMLAnchorElement>('[data-source]').href=`https://data.worldbank.org/indicator/${metric.id}`;
  const source=sources.find(s=>s.id===metric.id)!;
  const credit=metric.id.startsWith('AG.')||metric.id==='ER.H2O.INTR.PC'?'FAOの統計（WDI収録）':state.field==='population'?'国連人口部・各国統計局等（WDI収録）':metric.id==='NY.GDP.TOTL.RT.ZS'?'世界銀行の資源レント推計':'各国の国民経済計算・世界銀行等';
  text('[data-source-organization]',`${credit} · WDI更新：${source.lastUpdated}`);
  for(const cards of root!.querySelectorAll<HTMLElement>('[data-reading-field]'))cards.hidden=cards.dataset.readingField!==state.field;
  text('[data-ranking-unit]',`${metric.unit}（${period}）`);text('[data-ranking-description]',`${regionNames[state.region]}・${metric.label}の大きい順。未収録は末尾に表示します。`);
  const rows=query<HTMLElement>('[data-ranking]');rows.replaceChildren();
  for(const c of ranked){const tr=make('tr');tr.classList.toggle('is-selected',c.code===state.place);tr.classList.toggle('is-compared',c.code===state.compare);const th=make('th');const button=make('button',c.name);button.setAttribute('type','button');button.dataset.focusCountry=c.code;th.append(button);const compare=make('td');const compareButton=make('button',c.code===state.compare?'比較中':'比較に追加');compareButton.setAttribute('type','button');compareButton.dataset.compareCountry=c.code;compareButton.setAttribute('aria-label',`${c.name}を比較に追加`);(compareButton as HTMLButtonElement).disabled=c.code===state.place;compare.append(compareButton);tr.append(th,make('td',regionNames[c.region as Region]),make('td',formatValue(c.value,metric)),compare);rows.append(tr);}
  if(write){const url=writeState(state,new URL(location.href));if(url.href!==location.href)history.pushState(null,'',url);}
 }
 function chooseCountry(code:string){if(!countries.some(c=>c.code===code))return;state.place=code;if(state.compare===code)state.compare='';if(state.region!=='all')state.region=countries.find(c=>c.code===code)!.region as Region;render(true);}
 root.addEventListener('click',event=>{
  const target=(event.target as Element).closest<HTMLElement>('[data-field],[data-focus-country],[data-compare-country],[data-country-path],[data-country-marker],[data-zoom],[data-reset]');if(!target)return;
  if(target.hasAttribute('data-reset')){state=readState('');render(true);return;}
  if(target.dataset.field){state.field=target.dataset.field as Field;state.metric=metrics.find(m=>m.field===state.field)!.id;render(true);return;}
  if(target.dataset.zoom){state.zoom=target.dataset.zoom as typeof state.zoom;render(true);return;}
  if(target.dataset.compareCountry){state.compare=target.dataset.compareCountry===state.place?'':target.dataset.compareCountry;render(true);return;}
  chooseCountry(target.dataset.focusCountry??target.dataset.countryPath??target.dataset.countryMarker??'');
 });
 query<HTMLButtonElement>('[data-latest]').addEventListener('click',()=>{state.year=defaultYear(state.metric);render(true);});
 query<HTMLSelectElement>('[data-metric]').addEventListener('change',event=>{state.metric=(event.target as HTMLSelectElement).value;render(true);});
 query<HTMLSelectElement>('[data-year]').addEventListener('change',event=>{state.year=Number((event.target as HTMLSelectElement).value);render(true);});
 query<HTMLSelectElement>('[data-region]').addEventListener('change',event=>{state.region=(event.target as HTMLSelectElement).value as Region;state.zoom=state.region==='all'?'all':'region';render(true);});
 query<HTMLSelectElement>('[data-place]').addEventListener('change',event=>chooseCountry((event.target as HTMLSelectElement).value));
 query<HTMLSelectElement>('[data-compare]').addEventListener('change',event=>{state.compare=(event.target as HTMLSelectElement).value;render(true);});
 window.addEventListener('popstate',()=>{state=readState(location.search);render();});
 render();
}
