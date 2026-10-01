import {countries,fields,metrics,regionNames,years,readState,writeState,canonicalTopic,canonicalWater,metricById,valueAt,formatValue,fillFor,rankedCountries,palette,sources,defaultYear,defaultThemeRegion,type Field,type Region,type Metric} from '../data/atlas/africa-atlas.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import {themes,type AfricaTheme} from '../data/atlas/africa-themes.ts';

export function initializeAfricaAtlas() {
 const root=document.querySelector<HTMLElement>('[data-africa-atlas]');
 if(!root||root.dataset.initialized)return;
 root.dataset.initialized='true';
  const query=<T extends Element>(s:string)=>root.querySelector<T>(s)!;
 const kicker=query<HTMLElement>('.africa-kicker');query<HTMLElement>('.africa-detail-scroll').prepend(kicker);
 const text=(s:string,t:string)=>{query<HTMLElement>(s).textContent=t;};
 const make=(tag:string,t?:string)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n;};
 const svgNS='http://www.w3.org/2000/svg';
 const svgEl=(tag:string,attrs:Record<string,string|number>,t?:string)=>{const n=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(t!==undefined)n.textContent=t;return n;};
 let state=readState(location.search);
 let countryPinned=false,regionPinned=false;
 const topicItems={
  agriculture:[['farming','農畜産',false],['forestry','林業',false]],
  nature:[['climate','気候区分',true],['water','水資源',false],['terrain','地形',true],['elevation','標高',true]],
  industry:[['regional','地域の主要産業',false]],
  population:[['distribution','人口分布',false],['ethnicity','人種・民族',true],['religion','宗教',true]]
 } as const;
  function renderTopics(){
  const items=topicItems[state.field];
  state.topic=canonicalTopic(state.field,state.metric,state.topic);
  state.water=state.field==='nature'?canonicalWater(state.metric,state.water):'';
  const topic=state.topic;
  const nav=query<HTMLElement>('[data-africa-subfields]');nav.replaceChildren();
  nav.setAttribute('aria-label',state.field==='industry'?'収録済みの主要産業を選ぶ':'分野内の項目');
  root!.querySelectorAll('.africa-main>.africa-subitems').forEach(row=>row.remove());
  const belowMap=query<HTMLElement>('[data-africa-map-subfields]');belowMap.replaceChildren();
  if(state.field==='agriculture')belowMap.append(nav);else query<HTMLElement>('.africa-main').insertBefore(nav,query<HTMLElement>('.africa-workspace'));
  if(state.field==='industry'){
   const labels:Record<string,string>={'copperbelt-connections':'銅鉱業','casablanca-manufacturing':'カサブランカの製造業'};
   for(const theme of themes.filter(t=>t.field==='industry')){const button=make('button',labels[theme.id]??theme.title) as HTMLButtonElement;button.type='button';button.dataset.theme=theme.id;button.title=theme.title;button.setAttribute('aria-pressed',String(state.theme===theme.id));nav.append(button);}
  }else for(const [id,label,planned] of items){const button=make('button',label) as HTMLButtonElement;button.type='button';button.dataset.africaTopic=id;button.setAttribute('aria-pressed',String(topic===id));if(planned)button.append(make('small','未整備'));nav.append(button);}
  if(state.field==='industry'||state.field==='population'){
   const caption=make('p',state.field==='industry'?'代表地点と国別統計から、産業と交通・市場のつながりを読む。':'人種・民族・宗教：未整備。代表地点の位置と国全体の人口を表示。都市別の人口密度分布は未整備。');caption.className='africa-subfield-caption';nav.append(caption);
  }
  if(state.field==='nature'&&topic==='water'){
   const row=make('div');row.className='africa-subitems';row.setAttribute('role','group');row.setAttribute('aria-label','水資源の項目');
   for(const [id,label,planned] of [['river','河川・地下水',false],['rain','降水量',false],['basin','河川の流域',true]] as const){const button=make('button',label) as HTMLButtonElement;button.type='button';button.dataset.africaWater=id;button.setAttribute('aria-pressed',String(id===state.water));if(planned)button.append(make('small','未整備'));row.append(button);}nav.after(row);
  }
  const planned=items.find(item=>item[0]===topic)?.[2];const status=query<HTMLElement>('[data-africa-subfield-status]');status.hidden=!planned;if(planned)status.textContent=`${items.find(item=>item[0]===topic)?.[1]}の分布データは未整備です。下の地図は既存の国別統計と代表地点を補助表示しています。`;
  if(state.field==='nature'&&topic==='water'&&state.water==='basin'){status.hidden=false;status.textContent='河川の流域分布は未整備です。表示している国の色やナイルの近似線は流域境界ではありません。';}
 }
 function readSelectionPins(){const p=new URLSearchParams(location.search);countryPinned=countries.some(c=>c.code===p.get('place'));regionPinned=Object.hasOwn(regionNames,p.get('region')??'');}
 readSelectionPins();
 function chooseTheme(id:string){
  const theme=themes.find(t=>t.id===id)!;state.theme=id;state.context='';state.zoom='theme';
  if(!countryPinned){state.place=theme.places[0];if(state.compare===state.place)state.compare='';}
  if(!regionPinned)state.region=defaultThemeRegion(id);
 }
 const paths=[...root.querySelectorAll<SVGPathElement>('[data-country-path]')];
 const map=query<SVGSVGElement>('.africa-map');
 function fitMap() {
  map.dataset.detail=String(state.zoom!=='all');
  if(state.zoom==='theme'){
   const theme=themes.find(t=>t.id===state.theme)!;
   const [left,bottom]=projectAfrica([theme.bounds[0],theme.bounds[1]]),[right,top]=projectAfrica([theme.bounds[2],theme.bounds[3]]);
   const width=Math.max(right-left,(bottom-top)*africaWidth/africaHeight)*1.12;
   const height=width*africaHeight/africaWidth;
   map.setAttribute('viewBox',`${(left+right-width)/2} ${(top+bottom-height)/2} ${width} ${height}`);return;
  }
  if(state.zoom==='all'||state.zoom==='region'&&state.region==='all'){map.setAttribute('viewBox',`0 0 ${africaWidth} ${africaHeight}`);return;}
  const boxes=paths.filter(p=>state.zoom==='country'?p.dataset.countryPath===state.place:countries.find(c=>c.code===p.dataset.countryPath)?.region===state.region).map(p=>p.getBBox());
  if(!boxes.length)return;
  const left=Math.min(...boxes.map(b=>b.x)),right=Math.max(...boxes.map(b=>b.x+b.width));
  const top=Math.min(...boxes.map(b=>b.y)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
  const width=Math.max(18,(right-left)*1.18,(bottom-top)*1.18*africaWidth/africaHeight);
  const height=width*africaHeight/africaWidth;
  map.setAttribute('viewBox',`${(left+right-width)/2} ${(top+bottom-height)/2} ${width} ${height}`);
 }
 function renderTheme(theme:AfricaTheme) {
  const container=query<SVGGElement>('[data-theme-marks]');container.replaceChildren();
  const view=map.getAttribute('viewBox')!.split(' ').map(Number);
   const box=map.getBoundingClientRect();
   root!.style.setProperty('--africa-map-top',`${box.top+window.scrollY}px`);
  const scale=Math.max(view[2]/(box.width||640),view[3]/(box.height||528));
  const colors:Record<string,string>={river:'#236aa0','area-label':'#655037',crop:'#925b16',resource:'#9c365a',city:'#633898',port:'#164f69'};
  const legend=query<HTMLElement>('[data-theme-legend]');legend.replaceChildren();
  const details=query<HTMLElement>('[data-theme-details]');details.replaceChildren();
  theme.marks.forEach((mark,i)=>{
   const group=svgEl('g',{'data-theme-mark':mark.id});
   const isLine=Array.isArray(mark.coordinates[0]);
   const points=isLine?mark.coordinates as [number,number][]:[mark.coordinates as [number,number]];
   const projected=points.map(projectAfrica);const [x,y]=projected[Math.floor(projected.length/2)];
   const color=colors[mark.kind]??'#655037';
   if(isLine)group.append(svgEl('path',{d:projected.map(([px,py],j)=>`${j?'L':'M'}${px},${py}`).join(''),fill:'none',stroke:color,'stroke-width':3,'vector-effect':'non-scaling-stroke'}));
   group.append(svgEl(mark.kind==='resource'?'rect':'circle',mark.kind==='resource'?{x:x-7*scale,y:y-7*scale,width:14*scale,height:14*scale,fill:color,stroke:'#fff','stroke-width':1.5,'vector-effect':'non-scaling-stroke'}:{cx:x,cy:y,r:7*scale,fill:color,stroke:'#fff','stroke-width':1.5,'vector-effect':'non-scaling-stroke'}));
   group.append(svgEl('text',{x:x+11*scale,y:y+5*scale,fill:color,'font-size':14*scale,'font-weight':700,stroke:'#fff','stroke-width':3*scale,'paint-order':'stroke','stroke-linejoin':'round'},String(i+1)));
   group.append(svgEl('title',{},`${i+1} ${mark.label}：${mark.note}`));container.append(group);
   const item=make('span',`${i+1} ${mark.label}`);const key=make('i');key.style.background=color;item.prepend(key);legend.append(item);
   const p=make('p',`${i+1} ${mark.label} — ${mark.note}`);details.append(p);
  });
  if(theme.evidenceSources)for(const source of theme.evidenceSources){const p=make('p');const a=make('a',source.label) as HTMLAnchorElement;a.href=source.url;p.append(a);details.append(p);}
  text('[data-theme-title]',countryPinned?`${countries.find(c=>c.code===state.place)?.name}：${theme.title}`:theme.title);
  query<HTMLElement>('.africa-kicker').textContent=countryPinned?'選択した国・地域の説明':'地域の概要 · 地図から持ち帰ること';
   const brief:Record<string,string>={
    'nile-water':'ナイルの水を届ける技術と用水の制度が、少雨の土地で農業を支える。',
    'east-highlands':'高地と低地の違いに、栽培技術・道路・市場・農地へのアクセスが重なる。',
    'guinea-tree-crops':'樹木作物と食用作物に、加工・販路・世界価格・生産者支援が重なる。',
    'sahel-agropastoral':'穀物と家畜の組合せを、種子・獣医・販路・移動と土地利用の調整が支える。',
    'copperbelt-connections':'銅鉱床に電力・物流・技能が重なり、収入配分の制度と環境管理が必要になる。',
    'casablanca-manufacturing':'航空機関連の製造業を、供給網・技能・投資・空港との接続が支える。',
    'nile-settlements':'ナイル沿いの居住を、水・住宅・交通・制度から読む。',
    'urban-connections':'都市の集積を支えるのは住宅・交通・仕事と制度。農村とも市場でつながる。'
   };
   text('[data-theme-takeaway]',state.context?`${theme.compareText.split('。')[0]}。`:brief[theme.id]??theme.takeaway);
   text('[data-theme-takeaway-detail]',state.context?theme.compareText:theme.takeaway);
  text('[data-theme-caveat]',theme.caveat);
  const source=query<HTMLAnchorElement>('[data-theme-source]');source.href=theme.source;source.textContent=theme.sourceLabel;
  const compare=query<HTMLButtonElement>('[data-theme-comparison]');compare.hidden=!!state.context;compare.textContent=`${metricById(theme.compareMetric).label}と重ねる`;
  const back=query<HTMLButtonElement>('[data-theme-return]');back.hidden=!state.context;back.textContent=`← ${theme.title}へ戻る${countryPinned?`：${countries.find(c=>c.code===state.place)?.name}`:''}`;
  const choices=query<HTMLElement>('[data-themes]');choices.replaceChildren();
  if(state.field!=='industry')for(const t of themes.filter(t=>t.field===state.field)){const button=make('button',t.title) as HTMLButtonElement;button.type='button';button.dataset.theme=t.id;button.setAttribute('aria-pressed',String(t.id===theme.id));choices.append(button);}
  map.dataset.theme=theme.id;map.dataset.context=state.context;
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
  root!.dataset.field=state.field;
  renderTopics();
  const metric=metricById(state.context||state.metric);
  const theme=themes.find(t=>t.id===state.theme)!;
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
   text('[data-essential-metric]',`${metric.label} · ${period} · ${metric.unit}${metric.symbols?'（円の面積）':''}`);
   text('[data-essential-boundary]',`${metric.symbols?'円は国人口。':'色は国全体。'}国境：細線／選択：赤枠／比較：青破線／白丸：島の選択用。`);
  for(const path of paths){const code=path.dataset.countryPath!;const c=countries.find(c=>c.code===code)!;const v=valueAt(metric.id,code,state.year);path.setAttribute('fill',fillFor(v,metric));path.classList.toggle('is-selected',code===state.place);path.classList.toggle('is-compared',code===state.compare);path.classList.toggle('is-muted',state.zoom!=='theme'&&state.region!=='all'&&c.region!==state.region&&code!==state.place&&code!==state.compare);path.querySelector('title')!.textContent=`${c.name}：${formatValue(v,metric)}${v===null?'':` ${metric.unit}`}（${period}）`;}
  fitMap();
  const view=map.getAttribute('viewBox')!.split(' ').map(Number),box=map.getBoundingClientRect();
  const symbolScale=Math.max(view[2]/(box.width||640),view[3]/(box.height||528));
  const symbols=query<SVGGElement>('[data-symbols]');symbols.replaceChildren();
  if(metric.symbols)for(const c of [...countries].sort((a,b)=>(valueAt(metric.id,b.code,state.year)??0)-(valueAt(metric.id,a.code,state.year)??0))){const v=valueAt(metric.id,c.code,state.year);if(v===null||v<=0)continue;if(state.zoom==='country'&&c.code!==state.place&&c.code!==state.compare)continue;const [x,y]=projectAfrica(c.point);const circle=svgEl('circle',{cx:x,cy:y,r:Math.sqrt(v/1e6)*2.2*symbolScale,class:'africa-symbol','data-country-marker':c.code,opacity:state.zoom!=='theme'&&state.region!=='all'&&c.region!==state.region&&c.code!==state.place&&c.code!==state.compare ? .25 : 1});circle.append(svgEl('title',{},`${c.name}：${formatValue(v,metric)}人`));symbols.append(circle);}
  for(const marker of root!.querySelectorAll<SVGGElement>('[data-island-marker]'))marker.style.display=metric.symbols?'none':'';
  for(const button of root!.querySelectorAll('[data-zoom]'))button.setAttribute('aria-pressed',String((button as HTMLElement).dataset.zoom===state.zoom));
  renderTheme(theme);
  const legend=query<HTMLElement>('[data-legend]');legend.replaceChildren();
   if(metric.symbols){const key=svgEl('svg',{viewBox:'0 0 310 48',width:310,height:48,role:'img','aria-label':'人口の円面積。100万人、1000万人、1億人の大きさ。'});[1e6,1e7,1e8].forEach((v,i)=>{const r=Math.sqrt(v/1e6)*2.2;key.append(svgEl('circle',{cx:[5,87,200][i],cy:24,r,fill:'#3c7968','fill-opacity':.6}));key.append(svgEl('text',{x:[13,99,225][i],y:29,'text-anchor':'start','font-size':14},`${v/1e4}万人`));});legend.append(key);}
  else palette.forEach((color,i)=>{const label=i===0?`${metric.breaks[0].toLocaleString()}未満`:i===4?`${metric.breaks[3].toLocaleString()}以上`:`${metric.breaks[i-1].toLocaleString()}〜${metric.breaks[i].toLocaleString()}未満`;const span=make('span');const swatch=make('i');swatch.style.background=color;span.append(swatch,document.createTextNode(label));legend.append(span);});
  const missing=make('span');const swatch=make('i');swatch.className='africa-no-data';missing.append(swatch,document.createTextNode('未収録'));legend.append(missing);
  text('[data-map-caption]',metric.symbols?'円の面積は人口に比例。国を示す位置に置いており、都市人口や居住範囲ではありません。':'色は国平均・国全体の割合です。国内の分布・産地・都市の境界を表しません。島の白丸は選択用の目印です。');
  const ranked=rankedCountries({...state,metric:metric.id});const count=ranked.filter(c=>c.value!==null).length;
  text('[data-coverage]',`${regionNames[state.region]}：${ranked.length}の国・地域のうち${count}件を収録、${ranked.length-count}件は未収録。赤枠は選択国、青い破線は比較国。`);
  text('[data-selected-name]',country.name);text('[data-selected-region]',regionNames[country.region as Region]);text('[data-selected-value]',formatValue(valueAt(metric.id,country.code,state.year),metric));text('[data-selected-unit]',metric.unit);text('[data-selected-metric]',metric.label);
  text('[data-comparison]',comparison?`比較：${comparison.name}　${formatValue(valueAt(metric.id,comparison.code,state.year),metric)} ${metric.unit}`:'');
  text('[data-place-note]',country.code==='ESH'?'西サハラの独立したWDI系列は未収録です。モロッコの値は転用しません。':country.code==='SOM'?'数値はソマリア全体の統計です。地図ではソマリランドも同じ選択対象に含めています。':`${period}。${country.name}全体の集計値です。${theme.places.includes(country.code)?'':'テーマの代表地点の数値ではありません。'}`);
  text('[data-column-place]',country.name);text('[data-column-compare]',comparison?.name??'比較国');query<HTMLElement>('[data-column-compare]').hidden=!comparison;
  const current=query<HTMLElement>('[data-current-metrics]');current.replaceChildren();
  for(const m of metrics.filter(m=>m.field===state.field)){const tr=make('tr');const th=make('th',m.label);th.append(make('small',m.unit));tr.append(th,make('td',formatValue(valueAt(m.id,state.place,state.year),m)));if(comparison)tr.append(make('td',formatValue(valueAt(m.id,state.compare,state.year),m)));current.append(tr);}
  text('[data-metric-year]',`表は${state.year}年（降水量のみ長期平均）。値がない年は「未収録」です。`);
  renderTrend(metric);
  text('[data-metric-note]',metric.note);query<HTMLAnchorElement>('[data-source]').href=`https://data.worldbank.org/indicator/${metric.id}`;
  const source=sources.find(s=>s.id===metric.id)!;
  const credit=metric.id.startsWith('AG.')||metric.id==='ER.H2O.INTR.PC'?'FAOの統計（WDI収録）':metric.field==='population'?'国連人口部・各国統計局等（WDI収録）':metric.id==='NY.GDP.TOTL.RT.ZS'?'世界銀行の資源レント推計':'各国の国民経済計算・世界銀行等';
  text('[data-source-organization]',`${credit} · WDI更新：${source.lastUpdated}`);
  for(const cards of root!.querySelectorAll<HTMLElement>('[data-reading-field]'))cards.hidden=cards.dataset.readingField!==state.field;
  text('[data-ranking-unit]',`${metric.unit}（${period}）`);text('[data-ranking-description]',`${regionNames[state.region]}・${metric.label}の大きい順。未収録は末尾に表示します。`);
  const rows=query<HTMLElement>('[data-ranking]');rows.replaceChildren();
  for(const c of ranked){const tr=make('tr');tr.classList.toggle('is-selected',c.code===state.place);tr.classList.toggle('is-compared',c.code===state.compare);const th=make('th');const button=make('button',c.name);button.setAttribute('type','button');button.dataset.focusCountry=c.code;th.append(button);const compare=make('td');const compareButton=make('button',c.code===state.compare?'比較中':'比較に追加');compareButton.setAttribute('type','button');compareButton.dataset.compareCountry=c.code;compareButton.setAttribute('aria-label',`${c.name}を比較に追加`);(compareButton as HTMLButtonElement).disabled=c.code===state.place;compare.append(compareButton);tr.append(th,make('td',regionNames[c.region as Region]),make('td',formatValue(c.value,metric)),compare);rows.append(tr);}
  if(write){const url=writeState(state,new URL(location.href));if(url.href!==location.href)history.pushState(null,'',url);}
  const overview=root!.querySelector<HTMLAnchorElement>('[data-africa-overview-link]');if(overview){const url=new URL(overview.href);countryPinned?url.searchParams.set('country',state.place):url.searchParams.delete('country');url.searchParams.set('region',state.region);url.searchParams.set('zoom',state.zoom);const params=new URLSearchParams(location.search);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}overview.href=url.href;}
 }
 function chooseCountry(code:string){if(!countries.some(c=>c.code===code))return;countryPinned=true;state.place=code;if(state.compare===code)state.compare='';if(state.region!=='all')state.region=countries.find(c=>c.code===code)!.region as Region;if(state.zoom==='theme'&&!themes.find(t=>t.id===state.theme)!.places.includes(code))state.zoom='all';render(true);}
 root.addEventListener('click',event=>{
  const target=(event.target as Element).closest<HTMLElement>('[data-field],[data-focus-country],[data-compare-country],[data-country-path],[data-country-marker],[data-zoom],[data-reset],button[data-theme],[data-theme-comparison],[data-theme-return],[data-africa-topic],[data-africa-water]');if(!target)return;
  if(target.dataset.africaTopic){state.topic=target.dataset.africaTopic;if(state.topic==='forestry'){state.metric='AG.LND.FRST.ZS';state.context='';}if(state.topic==='farming'&&state.metric==='AG.LND.FRST.ZS'){state.metric='AG.LND.ARBL.ZS';state.context='';}render(true);return;}
  if(target.dataset.africaWater){state.water=target.dataset.africaWater;if(state.water!=='basin'){state.metric=state.water==='river'?'ER.H2O.INTR.PC':'AG.LND.PRCP.MM';state.context='';}render(true);return;}
  if(target.hasAttribute('data-reset')){state=readState('');countryPinned=false;regionPinned=false;render(true);return;}
  if(target.dataset.field){if(target.dataset.field===state.field)return;state.field=target.dataset.field as Field;state.metric=metrics.find(m=>m.field===state.field)!.id;state.topic='';state.water='';chooseTheme(themes.find(t=>t.field===state.field)!.id);render(true);return;}
  if(target.dataset.theme){chooseTheme(target.dataset.theme);render(true);return;}
  if(target.hasAttribute('data-theme-comparison')){state.context=themes.find(t=>t.id===state.theme)!.compareMetric;render(true);return;}
  if(target.hasAttribute('data-theme-return')){state.context='';render(true);return;}
  if(target.dataset.zoom){state.zoom=target.dataset.zoom as typeof state.zoom;render(true);return;}
  if(target.dataset.compareCountry){state.compare=target.dataset.compareCountry===state.place?'':target.dataset.compareCountry;render(true);return;}
  chooseCountry(target.dataset.focusCountry??target.dataset.countryPath??target.dataset.countryMarker??'');
 });
 query<HTMLButtonElement>('[data-latest]').addEventListener('click',()=>{state.year=defaultYear(state.context||state.metric);render(true);});
 query<HTMLSelectElement>('[data-metric]').addEventListener('change',event=>{state.metric=(event.target as HTMLSelectElement).value;state.context='';state.topic='';state.water='';render(true);});
 query<HTMLSelectElement>('[data-year]').addEventListener('change',event=>{state.year=Number((event.target as HTMLSelectElement).value);render(true);});
 query<HTMLSelectElement>('[data-region]').addEventListener('change',event=>{regionPinned=true;state.region=(event.target as HTMLSelectElement).value as Region;state.zoom=state.region==='all'?'all':'region';render(true);});
 query<HTMLSelectElement>('[data-place]').addEventListener('change',event=>chooseCountry((event.target as HTMLSelectElement).value));
 query<HTMLSelectElement>('[data-compare]').addEventListener('change',event=>{state.compare=(event.target as HTMLSelectElement).value;render(true);});
 window.addEventListener('popstate',()=>{state=readState(location.search);readSelectionPins();render();});
 window.addEventListener('resize',()=>render());
 render();
}
