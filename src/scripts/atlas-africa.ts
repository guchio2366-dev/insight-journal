import {countries,fields,metrics,regionNames,years,readState,writeState,africaComparisonSnapshot,canonicalTopic,canonicalWater,canonicalAgriLayers,africaAgriVisibleLayers,metricById,valueAt,latestValueAt,formatValue,fillFor,rankedCountries,palette,sources,defaultYear,cropChoices,livestockChoices,cropMeasureChoices,type Field,type Region,type Metric,type Crop,type Livestock,type CropMeasure} from '../data/atlas/africa-atlas.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import {themes,type AfricaTheme} from '../data/atlas/africa-themes.ts';
import {africaIndustryLocations,africaIndustryLocationById,africaIndustryLocationOverview} from '../data/atlas/africa-industry-locations.ts';
import {africaForestryReading} from '../data/atlas/africa-forestry-reading.ts';
import {agricultureContextOverview,agricultureProductContext,agricultureContextPeriodNote} from '../data/atlas/africa-agriculture-context.ts';
import {africaAgricultureReading} from '../data/atlas/africa-agriculture-reading.ts';
import {africaCultureGuideSources} from '../data/atlas/africa-culture-guide.ts';
import {africaRivers,africaRiverById,africaRiverSelectedColor} from '../data/atlas/africa-river-reading.ts';
import {canonicalRiver} from '../data/atlas/africa-atlas.ts';
import {createAfricaLayerRenderer,africaActualLayerKey,africaCommodityColor,type AfricaLayerView} from './atlas-africa-layers.ts';
import regionalStatistics from '../data/atlas/africa-regional-statistics.json' with {type:'json'};
import {africaClimateCityById,africaClimateCityCoverage} from '../data/atlas/africa-climate-cities.ts';

export function initializeAfricaAtlas() {
 const root=document.querySelector<HTMLElement>('[data-africa-atlas]');
 if(!root||root.dataset.initialized)return;
 root.dataset.initialized='true';
  const query=<T extends Element>(s:string)=>root.querySelector<T>(s)!;
 const text=(s:string,t:string)=>{query<HTMLElement>(s).textContent=t;};
 const make=(tag:string,t?:string)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n;};
 const svgNS='http://www.w3.org/2000/svg';
 const populationDensityScope='色は人口密度の推計区分。国の平均とは異なります。';
 const svgEl=(tag:string,attrs:Record<string,string|number>,t?:string)=>{const n=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(t!==undefined)n.textContent=t;return n;};
 let state=readState(location.search);
 let actual: AfricaLayerView|null=null;
 const layerRenderer=createAfricaLayerRenderer(root,()=>{if(typeof document!=='undefined'&&document===root.ownerDocument)render();});
 let countryPinned=false,regionPinned=false;
 const isAgriMap=()=>state.field==='agriculture'&&state.topic!=='forestry';
 const publicStateURL=(input:typeof state,url:URL)=>{const result=writeState(input,url);if(input.field==='agriculture'){result.searchParams.delete('year');result.searchParams.delete('compare');}return result;};
 const isAgriOverview=()=>state.field==='agriculture'&&state.topic!=='forestry'&&state.overview;
 const industryMap=()=>state.field==='industry'&&!state.context;
 const countryInteractive=()=>!!state.context||!actual&&!isRiverView()&&!industryMap();
 const topicItems={
  agriculture:[['farming','農畜産',false],['forestry','林業',false]],
  nature:[['climate','気候区分',true],['water','水資源',false],['terrain','地形',true],['elevation','標高',true]],
  industry:[['regional','地域の主要産業',false]],
  population:[['distribution','人口分布',false],['ethnicity','人種・民族',true],['religion','宗教',true]]
 } as const;
  function renderTopics(){
  const items=topicItems[state.field];
  const topic=state.field==='agriculture'&&state.topic==='livestock'?'farming':state.topic;
  const focused=root!.ownerDocument.activeElement,focusLayer=focused?.getAttribute('data-africa-agri-layer'),focusOutline=focused?.hasAttribute('data-africa-agri-outline'),focusTopic=focused?.getAttribute('data-africa-topic'),focusWater=focused?.getAttribute('data-africa-water'),layersOpen=root!.querySelector<HTMLDetailsElement>('.africa-agri-layer-disclosure')?.open??false;
  const nav=query<HTMLElement>('[data-africa-subfields]');nav.replaceChildren();
  const layerOptions=query<HTMLElement>('[data-africa-layer-options]');layerOptions.replaceChildren();layerOptions.hidden=true;
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label',state.field==='industry'?'収録済みの主要産業を選ぶ':'分野内の項目');
  root!.querySelectorAll('.africa-main>.africa-subitems').forEach(row=>row.remove());
  if(state.field==='agriculture')query<HTMLElement>('[data-africa-map-subfields]').append(nav);
  else query<HTMLElement>('.africa-main').insertBefore(nav,query<HTMLElement>('.africa-workspace'));
  if(state.field==='industry'){
   const overview=make('button','全域概要') as HTMLButtonElement;overview.type='button';overview.dataset.africaIndustryOverview='';overview.setAttribute('aria-pressed',String(state.overview));nav.append(overview);
   const labels:Record<string,string>={'copperbelt-connections':'銅鉱業','casablanca-manufacturing':'カサブランカの製造業'};
   for(const theme of themes.filter(t=>t.field==='industry')){const button=make('button',labels[theme.id]??theme.title) as HTMLButtonElement;button.type='button';button.dataset.theme=theme.id;button.title=theme.title;button.setAttribute('aria-pressed',String(!state.overview&&(state.industryLocation?africaIndustryLocationById(state.industryLocation)?.themeId:state.theme)===theme.id));nav.append(button);}
   const caption=make('p','収録済み7地点 · 色は産業の種類');caption.className='africa-subfield-caption';nav.append(caption);
  }else for(const [id,label] of items){const button=make('button',label) as HTMLButtonElement;button.type='button';button.dataset.africaTopic=id;button.setAttribute('aria-pressed',String(topic===id));button.setAttribute('aria-selected',String(topic===id));button.setAttribute('role','tab');button.setAttribute('aria-controls','africa-map-panel');button.tabIndex=topic===id?0:-1;nav.append(button);}
  if(state.field==='industry')nav.setAttribute('role','group');
  if(state.field==='industry'||state.field==='population'){
   nav.setAttribute('aria-label',state.field==='industry'?'実例の主要産業を選ぶ':'人口分布・掲載集団の事例を選ぶ');
  }
  if(state.field==='nature'&&topic==='water'){
   const row=make('div');row.className='africa-subitems';row.setAttribute('role','tablist');row.setAttribute('aria-label','水資源の項目');
    for(const [id,label] of [['river','河川・地下水'],['rain','降水量'],['basin','河川の流域']] as const){const button=make('button',label) as HTMLButtonElement;button.type='button';button.dataset.africaWater=id;button.setAttribute('aria-pressed',String(id===state.water));button.setAttribute('aria-selected',String(id===state.water));button.setAttribute('role','tab');button.setAttribute('aria-controls','africa-map-panel');button.tabIndex=id===state.water?0:-1;row.append(button);}nav.after(row);
  }
  if(focusTopic)nav.querySelector<HTMLButtonElement>(`[data-africa-topic="${focusTopic}"]`)?.focus({preventScroll:true});
  if(focusWater)root!.querySelector<HTMLButtonElement>(`[data-africa-water="${focusWater}"]`)?.focus({preventScroll:true});
  const riverChoices=query<HTMLElement>('[data-africa-river-choices]');riverChoices.hidden=!isRiverView();
  const focusedRiver=focused?.getAttribute('data-africa-river-choice');riverChoices.replaceChildren();
  if(!riverChoices.hidden){for(const row of [{id:'',label:'強調なし'},...africaRivers]){const button=make('button',row.label) as HTMLButtonElement;button.type='button';button.dataset.africaRiverChoice=row.id;button.setAttribute('aria-pressed',String(row.id===state.river));riverChoices.append(button);}if(focusedRiver!==null&&focusedRiver!==undefined)riverChoices.querySelector<HTMLButtonElement>(`[data-africa-river-choice="${focusedRiver}"]`)?.focus({preventScroll:true});}
  query<HTMLElement>('[data-zoom="theme"]').hidden=!!actual;
  const commodities=query<HTMLElement>('[data-africa-commodities]');commodities.replaceChildren();commodities.hidden=true;
  const status=query<HTMLElement>('[data-africa-subfield-status]');
  if(state.field==='population'){
   nav.after(status);status.hidden=false;
   status.textContent=actual?.error?`${actual.title}：分布データを取得できませんでした。再読込できます。`:actual?.ready?actual.guide?actual.scope:populationDensityScope:actual?`${actual.title}のデータを読み込んでいます。`:metricById(state.metric).note;
  }else{
   query<HTMLElement>('[data-themes]').before(status);
   status.hidden=!actual||actual.ready&&!actual.error;status.textContent=actual?.error?`${actual.title}：分布データを取得できませんでした。再読込できます。`:actual?`${actual.title}の分布データを読み込んでいます。国別統計は参考として残しています。`:'';
  }
 }
 function readSelectionPins(){const p=new URLSearchParams(location.search);countryPinned=countries.some(c=>c.code===p.get('place'));regionPinned=Object.hasOwn(regionNames,p.get('region')??'');}
 function isRiverView(){return state.field==='nature'&&state.topic==='water'&&state.water==='river'&&state.view==='distribution';}
 function chooseRiver(id:string){const river=africaRiverById(id);if(id&&!river)return;state.river=id;state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.zoom='all';render(true);}
 readSelectionPins();
 function chooseTheme(id:string){
  const theme=themes.find(t=>t.id===id)!;state.industryLocation='';state.theme=id;state.overview=false;state.context='';state.zoom=state.field==='industry'||state.field==='nature'&&state.topic==='climate'||(state.field==='population'||state.field==='agriculture')&&state.view==='distribution'?'all':'theme';
  state.sourceState='';state.layerClass='';state.layerPoint='';
  if(!regionPinned)state.region='all';
 }
 const paths=[...root.querySelectorAll<SVGPathElement>('[data-country-path]')];
 const map=query<SVGSVGElement>('.africa-map');
 function fitMap() {
  map.dataset.detail=String(state.zoom!=='all');
  if(state.field==='industry'){map.setAttribute('viewBox',`0 0 ${africaWidth} ${africaHeight}`);return;}
  if(isRiverView()&&state.zoom==='theme'){map.setAttribute('viewBox',`0 0 ${africaWidth} ${africaHeight}`);return;}
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
  const forest=state.field==='agriculture'&&state.topic==='forestry';
  const container=query<SVGGElement>('[data-theme-marks]');container.replaceChildren();
  const view=map.getAttribute('viewBox')!.split(' ').map(Number);
   const box=map.getBoundingClientRect();
   root!.style.setProperty('--africa-map-top',`${(isAgriMap()?query<HTMLElement>('.africa-map-frame').getBoundingClientRect().top:box.top)+window.scrollY}px`);
  const scale=Math.max(view[2]/(box.width||640),view[3]/(box.height||528));
  const colors:Record<string,string>={river:'#236aa0','area-label':'#655037',crop:'#925b16',resource:'#9c365a',city:'#633898',port:'#164f69'};
  const legend=query<HTMLElement>('[data-theme-legend]');legend.replaceChildren();
  const details=query<HTMLElement>('[data-theme-details]');details.replaceChildren();
  (forest||actual?.guide?[]:theme.marks).forEach((mark,i)=>{
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
  if(!forest&&theme.evidenceSources)for(const source of theme.evidenceSources){const p=make('p');const a=make('a',source.label) as HTMLAnchorElement;a.href=source.url;p.append(a);details.append(p);}
  text('[data-theme-title]',theme.title);
  query<HTMLElement>('.africa-kicker').textContent=countryPinned?`選択国：${countries.find(c=>c.code===state.place)?.name} · 地域内の比較事例`:'地域の概要 · 地図から持ち帰ること';
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
  const source=query<HTMLAnchorElement>('[data-theme-source]');source.hidden=false;source.href=theme.source;source.textContent=theme.sourceLabel;
  const compare=query<HTMLButtonElement>('[data-theme-comparison]');compare.hidden=!!state.context;compare.disabled=false;compare.textContent=`${metricById(theme.compareMetric).label}と重ねる`;
  const back=query<HTMLButtonElement>('[data-theme-return]');back.hidden=!state.context;back.textContent=`← ${theme.title}へ戻る${countryPinned?`：${countries.find(c=>c.code===state.place)?.name}`:''}`;
  const choices=query<HTMLElement>('[data-themes]');choices.replaceChildren();
  if(state.field!=='industry'&&!forest&&!actual?.ready)for(const t of themes.filter(t=>t.field===state.field)){const button=make('button',t.title) as HTMLButtonElement;button.type='button';button.dataset.theme=t.id;button.setAttribute('aria-pressed',String(t.id===theme.id));choices.append(button);}
  if(forest){text('[data-theme-title]',africaForestryReading.title);text('[data-theme-takeaway]',africaForestryReading.takeaway);text('[data-theme-takeaway-detail]',state.context?africaForestryReading.compareText:africaForestryReading.reading);text('[data-theme-caveat]',africaForestryReading.definition);source.href=africaForestryReading.source;source.textContent=africaForestryReading.sourceLabel;compare.textContent='森林割合で国を比べる';back.textContent=`← 林業の解説へ戻る${state.place?`：${countries.find(c=>c.code===state.place)?.name}`:''}`;}
  map.dataset.theme=theme.id;map.dataset.context=state.context;
 }
 function renderRegionalStatistics(){
  const host=query<HTMLElement>('[data-africa-regional-statistics]');host.hidden=!isAgriMap();host.replaceChildren();if(host.hidden)return;
  host.append(make('h2',`${regionNames[state.region]}の生産・食料供給`),make('p','主要品目の世界シェア · 2024年 · 生産量t。同じ品目・年・単位の地域集計と世界値を比べます。分布地図は2020年基準です。'));
  const table=make('table'),head=make('thead'),header=make('tr');for(const label of ['品目','地域生産量（t）','世界生産量比']){const cell=make('th',label);cell.setAttribute('scope','col');header.append(cell);}head.append(header);table.append(head);const body=make('tbody');
  const rows=regionalStatistics.regions[state.region];
  for(const row of rows){const tr=make('tr');tr.dataset.africaRegionalStatistic=row.id;const label=make('th',row.label);label.setAttribute('scope','row');tr.append(label);const value=row.regional?Number(row.regional.rawValue).toLocaleString('ja-JP',{maximumFractionDigits:0}):'未取得';tr.append(make('td',value),make('td',row.share===null?'未取得':`${row.share.toFixed(1)}%`));body.append(tr);}table.append(body);host.append(table);
  const missing=make('div');missing.className='africa-statistics-unavailable';for(const item of regionalStatistics.unavailable){const section=make('section');section.append(make('h3',item.label),make('p',item.reason));missing.append(section);}host.append(missing);
  const source=make('p'),link=make('a','FAOSTAT QCL · 2025-12-31公開版') as HTMLAnchorElement;link.href=regionalStatistics.source.url;source.append(link,make('span',' · CC BY 4.0。公表地域行を採用し、国別値や地図の面積を足していません。'));host.append(source);
  const details=make('details');details.append(make('summary','定義・原表と未取得の範囲'),make('p',regionalStatistics.method));
  details.append(make('p','FAOSTAT地域区分の公表集計。牛肉・生乳・コーヒーのみ同一定義の地域・世界行が保持済みです。他品目の未取得は生産0ではありません。E/Iなど原表の推計・補完フラグは保持しています。'));
  for(const row of rows.filter(row=>row.regional&&row.world))details.append(make('p',`${row.label}：地域原値 ${row.regional!.rawValue} t（${row.regional!.flag}）／世界原値 ${row.world!.rawValue} t（${row.world!.flag}）`));host.append(details);
 }
 function renderAgricultureReading(){
  if(!actual)return;
  const overview=state.overview,product=state.topic==='livestock'?state.livestock:state.crop;
  const context=overview?agricultureContextOverview:agricultureProductContext[product];
  const focused=state.topic==='livestock'?`livestock-${state.livestock}`:`crop-${state.crop}-harvested`;
  const only=state.agriLayers===focused;
  text('.africa-kicker',overview?`${regionNames[state.region]} · 農畜産の概況`:'分布から、生産と利用を読む');
  text('[data-theme-title]',overview?'アフリカの農畜産業':context.title);
  text('[data-theme-takeaway]',context.takeaway);
  text('[data-metric-title]',overview?'作物と家畜の特徴的な分布':`${context.title.split('：')[0]}${only?'だけを表示':'を強調'}`);
  text('[data-period]','2020年基準');text('[data-unit]','作物：収穫面積の集中域 ／ 家畜：密度の集中域');
  text('#africa-svg-title',`${overview?'作物と家畜':context.title.split('：')[0]}の特徴的な分布・2020年基準`);
  text('#africa-svg-desc','品目内で比較的集中する範囲を、作物は独立した色、家畜は種別の小型記号で示します。地図内の品目名・分布、または色付きの凡例から選べます。選択しても他品目の分布を残します。');
  const host=query<HTMLElement>('[data-africa-agri-context]');host.replaceChildren();
  for(const paragraph of context.paragraphs)host.append(make('p',paragraph));
  query<HTMLElement>('[data-africa-agri-only]').hidden=overview||only||['coffee','tea'].includes(product);query<HTMLElement>('[data-africa-agri-all]').hidden=overview||!only;
  query<HTMLElement>('[data-theme-comparison]').hidden=true;query<HTMLElement>('[data-theme-return]').hidden=true;
  query<HTMLElement>('[data-africa-statistics-key]').hidden=true;
  const source=query<HTMLAnchorElement>('[data-theme-source]');source.hidden=true;
  const details=query<HTMLElement>('[data-theme-details]');details.replaceChildren();
  const guide=africaAgricultureReading(state);
  details.append(make('p',agricultureContextPeriodNote),make('p',actual.method),make('p',actual.scope));
  details.append(make('p','地域区分は既存のNatural Earthの地域区分です。南部アフリカはボツワナ・レソト・ナミビア・エスワティニ・南アフリカ共和国です。'));
  // Retain the previously approved explanations and cautions in the supplement.
  details.append(make('p',guide.takeaway),make('p',guide.reading),make('p',guide.scope),make('p',guide.compareTakeaway),make('p',guide.compareText));
  const links=new Map([...context.sourceLinks,{label:guide.sourceLabel,url:guide.source}].map(row=>[row.url,row]));
  for(const row of links.values()){const p=make('p'),a=make('a',row.label) as HTMLAnchorElement;a.href=row.url;p.append(a);details.append(p);}
  for(const layer of actual.visibleLayers??[]){const p=make('p',`${layer.title} · ${layer.period} · ${layer.unit}`);if(layer.sourceUrl){const a=make('a',layer.sourceLabel) as HTMLAnchorElement;a.href=layer.sourceUrl;p.append(make('span',' · '),a);}details.append(p);}
  const full=query<HTMLDetailsElement>('.africa-theme-full');full.querySelector('summary')!.textContent='分布の抽出基準・データと出典';
  const legend=query<HTMLElement>('[data-africa-layer-legend]');legend.replaceChildren();
  const rows=[...cropChoices.map(row=>({key:`crop-${row.id}-harvested`,label:row.label,kind:'crop'})),...livestockChoices.map(row=>({key:`livestock-${row.id}`,label:row.label,kind:'livestock'}))];
  for(const row of rows){const unavailable=/crop-(coffee|tea)-/.test(row.key);const button=make('button',row.label+(unavailable?'（未取得）':'')) as HTMLButtonElement;button.type='button';button.dataset.africaAgriPick=row.key;button.setAttribute('aria-pressed',String(!overview&&focused===row.key));button.setAttribute('aria-label',`${row.label}の分布と説明`);button.title=`${row.label}を選んでも、他品目の分布を残します`;const swatch=make('i');swatch.style.background=africaCommodityColor(row.key);swatch.dataset.kind=row.kind;if(unavailable)swatch.className='africa-no-data';swatch.setAttribute('aria-hidden','true');button.prepend(swatch);legend.append(button);}
  text('[data-africa-layer-caption]','作物：収穫面積の集中域　家畜：密度の集中域 · 2020年基準');
  if(['coffee','tea'].includes(product)&&!overview){text('[data-metric-title]',context.title.split('：')[0]+' · 分布格子未取得');text('[data-africa-layer-scope]','この品目の2020年分布格子は未取得。生産地帯を補作せず、他の取得済み品目を残しています。');}
  text('[data-africa-layer-scope]',only?'この品目だけを表示中。右のボタンで全分布へ戻れます。':'連続する生産地帯の大まかな分布。作物は面色、家畜は薄い品目色と記号。コーヒー・茶の分布格子は未取得です。');
  query<HTMLElement>('[data-africa-actual-key]').hidden=!actual.ready;
  const selection=query<HTMLElement>('[data-africa-layer-selection]');selection.hidden=!actual.error&&!state.layerPoint;query<HTMLElement>('[data-africa-layer-selection] label').hidden=true;
  const point=state.layerPoint.split(',').map(Number);text('[data-africa-point-reading]',state.layerPoint?layerRenderer.inspect(point[0],point[1]):'');
 }
 function renderActualReading(){
  root!.querySelector('[data-africa-culture-source]')?.remove();
  query<HTMLElement>('[data-africa-layer-scope]').hidden=state.field==='population'&&actual?.key==='distribution';
  const keys=query<HTMLElement>('[data-africa-actual-key]'),selection=query<HTMLElement>('[data-africa-layer-selection]');
  keys.hidden=!actual?.ready||!!actual.guide;selection.hidden=!actual||!!actual.guide;query<HTMLElement>('[data-africa-statistics-key]').hidden=!!actual&&!state.context;
  const retry=query<HTMLButtonElement>('[data-africa-layer-retry]');retry.hidden=!actual?.error;
  if(!actual)return;
  if(isAgriMap()){renderAgricultureReading();return;}
  const agriculture=state.field==='agriculture'&&(state.topic==='farming'||state.topic==='livestock')&&!state.overview?africaAgricultureReading(state):null;
  const takeaways:Record<string,string>={climate:'湿潤な赤道付近、サハラの乾燥帯、高地や南北端の違いを気候区分で読みます。作物や暮らしには、水の管理・技術・交通・市場も関わります。',terrain:'標高の区分と等高線から、高地と低地の起伏を読みます。地質や地形の成因を分類した地図ではありません。',elevation:'高地と低地の位置を標高で比べます。国平均には表れない起伏と、農地・交通・水の利用条件を考える入口です。',ethnicity:'原資料に掲載された集団の居住範囲を読みます。民族は人口密度や国籍と別の情報で、掲載範囲だけから全住民の構成は分かりません。',religion:'掲載された集団の宗教的特徴を居住範囲と合わせて読みます。地域住民全体の信仰割合や、一人ひとりの信仰を示す地図ではありません。',distribution:'人口の格子分布から、国平均に隠れる居住の集中を読みます。水・農地に加え、住宅・交通・仕事・公共サービスの条件も考えます。','water-basin':'流域は、雨水が同じ川へ集まる範囲です。国境と異なる境界を読み、上流・下流の水利用と管理の関係を考えます。','water-river':'実際の河川の位置を読みます。下の国別淡水統計は国内で生まれる河川水と地下水の合計で、川の流量や帯水層の範囲ではありません。'};
  text('[data-theme-title]',actual.title);text('[data-theme-takeaway]',actual.ready?(actual.takeaway||takeaways[actual.key]||actual.scope):actual.error?'分布の取得に失敗しました。再読込できます。':'分布データを読み込んでいます。');
  text('[data-theme-takeaway-detail]',state.context?`${actual.title}の元分布を残し、${metricById(state.context).label}を国別の数値と色付きの記号で比べます。空間分布と国全体の集計は異なる母集団です。`:actual.description||takeaways[actual.key]||actual.scope);
  text('[data-theme-caveat]',actual.scope);text('[data-africa-layer-caption]',`${actual.title} · ${actual.period} · ${actual.unit}`);text('[data-africa-layer-scope]',actual.scope);
  const source=query<HTMLAnchorElement>('[data-theme-source]');source.hidden=!actual.sourceUrl;if(actual.sourceUrl){source.href=actual.sourceUrl;source.textContent=actual.sourceLabel;}
  query<HTMLElement>('[data-theme-details]').replaceChildren(make('p',actual.method));
  if(!agriculture&&!actual.guide){
   query<HTMLElement>('[data-theme-details]').append(make('p',actual.scope));
   const scope:Record<string,string>={climate:'色は気候区分。凡例を選ぶと、その区分の格子境界を強調します。',terrain:'色は標高区分、線は等高線。選択しても全体の分布を残します。',elevation:'色は標高区分。選択しても全体の分布を残します。',distribution:populationDensityScope,'water-basin':'線は接続する集水区の境界。川名や取水量は示しません。'};
   if(scope[actual.key])text('[data-africa-layer-scope]',scope[actual.key]);
  }
  if(agriculture){
   text('[data-theme-title]',agriculture.title);text('[data-theme-takeaway]',actual.ready?state.context?agriculture.compareTakeaway:agriculture.takeaway:actual.error?'分布の取得に失敗しました。再読込できます。':'2020年のモデル分布を読み込んでいます。');
   text('[data-theme-takeaway-detail]',state.context?agriculture.compareText:agriculture.reading);text('[data-theme-caveat]',agriculture.scope);
   text('[data-africa-layer-scope]','モデル推計。0は値のある格子、値なしは0と区別します。');
   if(!actual.sourceUrl){source.hidden=false;source.href=agriculture.source;source.textContent=agriculture.sourceLabel;}
   query<HTMLElement>('[data-theme-details]').append(make('p',agriculture.scope),make('p',state.context?agriculture.reading:agriculture.compareText));
  }
  if(actual.guide){query<HTMLElement>('.africa-kicker').textContent=state.place?`選択国：${countries.find(c=>c.code===state.place)?.name} · 資料案内（分布は未配信）`:'資料案内（分布は未配信）';const additional=africaCultureGuideSources.find(row=>row.url!==actual.sourceUrl)!;const link=make('a',additional.label) as HTMLAnchorElement;link.href=additional.url;link.className='africa-theme-source';link.dataset.africaCultureSource='';source.after(link);const compare=query<HTMLButtonElement>('[data-theme-comparison]');compare.hidden=true;compare.disabled=true;query<HTMLElement>('[data-theme-return]').hidden=true;text('[data-metric-title]',actual.title);text('[data-period]',actual.period);text('[data-unit]',actual.unit);text('#africa-svg-title',`${actual.title}・国境の参照図`);return;}
  if(actual.key==='distribution'){
   text('[data-theme-title]','アフリカの人口分布');
   text('[data-theme-takeaway]','ナイル川下流、ギニア湾岸、東部高地、南アフリカの都市周辺に人口が集積し、サハラなどの乾燥地では疎らです。');
   text('[data-theme-takeaway-detail]','ナイル沿いでは水と灌漑農地、東部では高地の比較的涼しい気候と農耕地が居住の基盤になります。ギニア湾岸のラゴス・アビジャンなどでは、歴史的な港と交易に道路、工業・サービス業が重なり都市化が進みました。キンシャサは河川交通、南アフリカの都市圏は鉱業・産業と交通網が集積に関わります。自然条件だけでなく、歴史、仕事、住宅、公共サービスから分布を読みます。');
   text('[data-theme-caveat]','2020年のモデル推計。色は人/km²の人口密度で、都市人口や国平均とは異なります。欠測は人口0ではありません。');
   const supplement=query<HTMLElement>('[data-theme-details]');supplement.append(make('p','都市名は集積域を読むための位置案内です。国名は既存の国位置データを使います。都市の人口順位や行政境界を示すものではありません。'));
  }
  const focusedClass=root!.ownerDocument.activeElement?.getAttribute('data-africa-layer-class');
  const legend=query<HTMLElement>('[data-africa-layer-legend]');legend.replaceChildren();
  const picker=query<HTMLSelectElement>('[data-africa-layer-category]');picker.replaceChildren();const all=make('option','全ての区分') as HTMLOptionElement;all.value='';picker.append(all);
  const climateShort:Record<string,string>={Af:'雨林',Am:'モンスーン',Aw:'サバナ',BWh:'高温砂漠',BWk:'低温砂漠',BSh:'高温ステップ',BSk:'低温ステップ',Csa:'夏乾燥・高温夏',Csb:'夏乾燥・温暖夏',Cwa:'冬乾燥・高温夏',Cwb:'冬乾燥・温暖夏',Cfa:'温暖湿潤',Cfb:'西岸海洋性',Dsb:'冷帯・夏乾燥',Dwb:'冷帯・冬乾燥',ET:'ツンドラ',EF:'氷雪'};
  for(const row of actual.legend){const fullLabel=`${row.code?row.code+' ':''}${row.label}`,short=actual.key==='climate'&&row.code?row.code:fullLabel;const item=make('button',short) as HTMLButtonElement;item.type='button';item.title=`${fullLabel}${row.description?'：'+row.description:''}`;item.setAttribute('aria-label',fullLabel);if(isAgriOverview())item.dataset.africaOverviewLayer=row.id;else item.dataset.africaLayerClass=row.id;item.setAttribute('aria-pressed',String(!isAgriOverview()&&state.layerClass===row.id));const swatch=make('i');swatch.style.background=row.color;item.prepend(swatch);legend.append(item);const option=make('option',fullLabel) as HTMLOptionElement;option.value=row.id;picker.append(option);}
  const missing=make('span',agriculture||isAgriOverview()?'値なし（0とは断定しません）':'未収録（不在を意味しません）');missing.className='africa-layer-unlisted';legend.append(missing);
  picker.value=actual.legend.some(row=>row.id===state.layerClass)?state.layerClass:'';
  if(focusedClass)legend.querySelector<HTMLButtonElement>(`[data-africa-layer-class="${focusedClass}"]`)?.focus({preventScroll:true});
  const compare=query<HTMLButtonElement>('[data-theme-comparison]');compare.disabled=!actual.ready;compare.textContent=agriculture?.compareLabel??`${metricById(state.metric).label}と比べる`;
  const returnPlace=state.sourceState?readState('?'+state.sourceState).place:state.place;
  query<HTMLElement>('[data-theme-return]').textContent=`← ${actual.title}へ戻る${returnPlace?`：${countries.find(c=>c.code===returnPlace)?.name}`:''}`;
  if(actual.ready){text('[data-metric-title]',actual.title);text('[data-period]',actual.period);text('[data-unit]',actual.unit);text('#africa-svg-title',`${actual.title}・${actual.period}`);text('[data-map-caption]',actual.scope);}
  const selected=actual.legend.find(row=>row.id===state.layerClass),point=state.layerPoint.split(',').map(Number);text('[data-africa-point-reading]',state.layerPoint?layerRenderer.inspect(point[0],point[1]):selected?`${selected.code??''} ${selected.label}：${selected.description||'選択した分類の分布を表示しています。'}`:'地図の地点を押すと、表示格子の値を確認できます。');
  if(!agriculture&&selected&&['climate','terrain','elevation','distribution'].includes(actual.key))text('[data-africa-point-reading]',`${selected.code??''} ${selected.label}：全体分布を残し、選択区分の格子境界を白と濃い青緑の線で示します。${state.layerPoint?layerRenderer.inspect(point[0],point[1]):''}`);
  if(agriculture&&actual.visibleLayers){
   const layers=actual.visibleLayers,hidden=actual.selectedVisible===false;
   const mode=layers.length>1||hidden&&layers.length>0?'選択品目は数量の色分け、他品目は半透明の色別正値分布。重なりは選択品目を手前に表示し、重なった色は数量や合計を表しません。':'輪郭は選択品目のモデル値が0より大きい格子の範囲です。';
   const warning=hidden?layers.length?'読み解く品目はOFFです。表示チェックでONにできます。':'表示品目はすべてOFFです。読み解く品目の選択は保持しています。':'';
   if(warning)text('[data-africa-point-reading]',warning+(state.layerPoint?` ${layerRenderer.inspect(point[0],point[1])}`:''));
   if(hidden)text('[data-africa-layer-caption]',`${actual.title}（表示OFF）・${actual.period}・${actual.unit}`);
   text('[data-africa-layer-scope]',layers.length>1||hidden&&layers.length>0?'数量凡例は選択品目用。他品目は半透明の正値分布。重なり色は合計を表しません。0と値なしは別です。':state.agriOutline&&!hidden?'モデル推計。輪郭は正値域を示します。0と値なしは別です。':'モデル推計。0と値なしは別です。');
   query<HTMLElement>('[data-theme-details]').append(make('p',mode));
   for(const layer of layers){const p=make('p',`${layer.title}・${layer.period}・${layer.unit}${layer.key===actual.key?'（数量の凡例は上記）':'（品目色は正値の分布、濃淡から数量を比較しません）'}`);const swatch=make('i');swatch.style.background=layer.color;swatch.className='africa-agri-reading-swatch';p.prepend(swatch);if(layer.key!==actual.key&&layer.sourceUrl){const link=make('a',layer.sourceLabel) as HTMLAnchorElement;link.href=layer.sourceUrl;p.append(make('span',' ・ '),link);}query<HTMLElement>('[data-theme-details]').append(p);}
  }
  if(isAgriOverview()){
   text('[data-theme-title]','アフリカの農畜産業');text('[data-theme-takeaway]',fields.agriculture.title);text('[data-theme-takeaway-detail]',fields.agriculture.summary);
   text('[data-theme-caveat]',actual.scope);query<HTMLElement>('[data-theme-comparison]').hidden=true;query<HTMLElement>('[data-theme-return]').hidden=true;
   if(!state.layerPoint)text('[data-africa-point-reading]',actual.visibleLayers?.length?'凡例か品目を選ぶと、数量と輪郭を読めます。地図の地点では表示中の品目を同じ場所で比較できます。':'表示品目はすべてOFFです。表示チェックでONにできます。');
   for(const layer of actual.visibleLayers??[]){const p=make('p',`${layer.title} · ${layer.period} · ${layer.unit}（正値の分布）`),a=make('a',layer.sourceLabel) as HTMLAnchorElement;a.href=layer.sourceUrl;p.append(make('span',' · '),a);query<HTMLElement>('[data-theme-details]').append(p);}
   source.hidden=false;source.href='https://doi.org/10.7910/DVN/SWPENT';source.textContent='作物：SPAM 2020 v2r2';const p=make('p'),a=make('a','家畜：FAO GLW4 2020') as HTMLAnchorElement;a.href='https://data.apps.fao.org/catalog/iso/9d1e149b-d63f-4213-978b-317a8eb42d02';p.append(a);query<HTMLElement>('[data-theme-details]').prepend(p);
  }
 }
 function renderIndustryOverview(){
  query<HTMLElement>('[data-africa-industry-return]').hidden=state.field!=='industry'||state.overview;
  if(state.field!=='industry')return;
  const details=()=>query<HTMLElement>('[data-theme-details]');
  const addSource=(label:string,url:string)=>{const p=make('p'),a=make('a',label) as HTMLAnchorElement;a.href=url;p.append(a);details().append(p);};
  const source=(label:string,url:string)=>{const a=query<HTMLAnchorElement>('[data-theme-source]');a.hidden=false;a.textContent=label;a.href=url;};
  const svg=svgEl;
  query<SVGGElement>('[data-theme-marks]').replaceChildren();details().replaceChildren();
  query<HTMLElement>('[data-theme-comparison]').hidden=true;query<HTMLElement>('[data-theme-return]').hidden=true;
  query<HTMLElement>('[data-themes]').replaceChildren();query<HTMLElement>('[data-theme-legend]').replaceChildren();
  const location=africaIndustryLocationById(state.industryLocation),selected=state.overview||location?undefined:themes.find(row=>row.field==='industry'&&row.id===state.theme),overview=africaIndustryLocationOverview,marks=query<SVGGElement>('[data-theme-marks]'),view=map.getAttribute('viewBox')!.split(' ').map(Number),box=map.getBoundingClientRect(),scale=Math.max(view[2]/(box.width||640),view[3]/(box.height||440));
  text('.africa-kicker',`産業が集まる条件${state.place?' · '+countries.find(c=>c.code===state.place)?.name:''}`);text('[data-theme-title]',location?.label??selected?.title??overview.title);text('[data-theme-takeaway]',location?.reading??selected?.takeaway??overview.reading);text('[data-theme-takeaway-detail]',location?.reading??(state.context?selected?.compareText:selected?.takeaway)??overview.reading);text('[data-theme-takeaway]',location?.title??selected?.title??'北のガス・西の原油、南の金属とダイヤ、沿岸の製造・物流');
  text('[data-theme-caveat]',state.context?metricById(state.context).note:overview.scope);text('[data-metric-title]','資源・製造・物流の代表位置');text('[data-period]','資料ごとの公表年');text('[data-unit]','数量を表さない点');source(location?.sources[0]?.label??selected?.sourceLabel??overview.sources[0].label,location?.sources[0]?.url??selected?.source??overview.sources[0].url);
  const key=query('[data-africa-layer-legend]');key.replaceChildren();query('[data-africa-actual-key]').hidden=false;
  const colors={energy:'#a14f3d',metals:'#704d9a',gems:'#917026',manufacturing:'#286a78',transport:'#327345'},labels={energy:'原油・天然ガス',metals:'銅・コバルト',gems:'ダイヤモンド',manufacturing:'航空機関連製造',transport:'港湾物流'};
  type LabelBox={x:number;y:number;w:number;h:number};const occupied:LabelBox[]=[],gap=5*scale;
  const positionLabel=(label:string,x:number,y:number):LabelBox=>{
   const fontSize=box.width>0&&box.width<480?12:14;const w=(label.length*fontSize+8)*scale,h=21*scale,pad=8*scale;
   const candidates=[[13,-8],[-w/scale-13,-8],[13,22],[-w/scale-13,22],[13,-36],[-w/scale-13,-36],[13,50],[-w/scale-13,50]];
   const fits=(b:LabelBox)=>!africaIndustryLocations.some(item=>{const [px,py]=projectAfrica(item.coordinates);return px>b.x-10*scale&&px<b.x+b.w+10*scale&&py>b.y-b.h-10*scale&&py<b.y+10*scale;})&&!occupied.some(o=>b.x<o.x+o.w+gap&&b.x+b.w+gap>o.x&&b.y-b.h<o.y+gap&&b.y+gap>o.y-o.h);
   const boxes=candidates.map(([dx,dy])=>({x:Math.max(view[0]+pad,Math.min(view[0]+view[2]-w-pad,x+dx*scale)),y:Math.max(view[1]+h+pad,Math.min(view[1]+view[3]-pad,y+dy*scale)),w,h}));
   const chosen=boxes.find(fits)??boxes[0];occupied.push(chosen);return chosen;
  };
  const ordered=africaIndustryLocations;
  const shortLabels:Record<string,string>={'hassi-rmel-gas':'ガス：ハッシ・ルメル','niger-delta-oil':'原油：ナイジェリア','drc-copper-cobalt':'銅・コバルト：コンゴ南部','zambia-copperbelt':'銅：ザンビア','jwaneng-diamonds':'ダイヤ：ジュワネン','casablanca-industry':'航空機：カサブランカ','lagos':'物流：ラゴス'};
  for(const item of ordered){
   const [x,y]=projectAfrica(item.coordinates),active=location?.id===item.id||!!selected&&selected.id===item.themeId,color=colors[item.kind],mapLabel=box.width>0&&box.width<480?shortLabels[item.id]:item.mapLabel,labelBox=positionLabel(mapLabel,x,y),g=svg('g',{'data-africa-industry-location':item.id,tabindex:0,role:'button','aria-label':`${item.label}を読む`,'aria-pressed':String(active),class:'africa-industry-hit','data-label-visible':'true'});
   const nearest=Math.min(...africaIndustryLocations.filter(other=>other.id!==item.id).map(other=>{const [ox,oy]=projectAfrica(other.coordinates);return Math.hypot(ox-x,oy-y);})),hitRadius=Math.min(20*scale,nearest*.45);
   g.append(svg('circle',{cx:x,cy:y,r:hitRadius,fill:'transparent','pointer-events':'all'}),svg('rect',{x:labelBox.x-3*scale,y:labelBox.y-labelBox.h,width:labelBox.w+6*scale,height:labelBox.h+6*scale,fill:'transparent','pointer-events':'all'}),svg('circle',{cx:x,cy:y,r:(active?8:6)*scale,fill:color,stroke:active?'#173d46':'#fff','stroke-width':active?2.5:1.5,'vector-effect':'non-scaling-stroke'}),svg('text',{x:labelBox.x,y:labelBox.y,'font-size':(box.width>0&&box.width<480?12:14)*scale,fill:color,stroke:'#fff','stroke-width':3*scale,'paint-order':'stroke'},mapLabel));g.append(svg('title',{},`${item.label}：${item.note}`));marks.append(g);
  }
  for(const kind of ['energy','metals','gems','manufacturing','transport'] as const){const row=make('span',labels[kind]),swatch=make('i');swatch.style.background=colors[kind];row.prepend(swatch);key.append(row);};
  if(location){details().append(make('p',location.note));for(const row of location.sources)addSource(row.label,row.url);}
  else if(selected){details().append(make('p',selected.takeaway));for(const item of selected.marks)details().append(make('p',`${item.label} — ${item.note}`));addSource(selected.sourceLabel,selected.source);for(const row of selected.evidenceSources??[])addSource(row.label,row.url);}
  else for(const row of overview.sources)addSource(row.label,row.url);
  details().append(make('p',overview.missing));text('#africa-svg-title','アフリカの主要産業の代表位置');text('[data-map-caption]',overview.scope);query<HTMLElement>('[data-africa-statistics-key]').hidden=!state.context;query<HTMLElement>('[data-country-statistics]').hidden=!state.context;
  query<HTMLElement>('[data-theme-comparison]').hidden=!selected||!!state.context;query<HTMLElement>('[data-theme-return]').hidden=!state.context;
  text('[data-africa-layer-caption]','色：産業の種類 · 点：資料に基づく代表位置（数量は示しません）');text('[data-africa-layer-scope]','国別の割合から資源の位置や産業施設を推定していません。');query<HTMLElement>('[data-africa-industry-return]').hidden=!selected&&!location;
 }
 function renderReadingLayout(){
  const riverView=isRiverView(),river=africaRiverById(state.river);
  root!.dataset.riverView=String(riverView);
  const climateView=state.field==='nature'&&state.topic==='climate'&&state.view==='distribution';
  map.setAttribute('role',riverView||climateView||isAgriMap()||state.field==='industry'?'group':'img');
  text('#africa-svg-desc',industryMap()?'産業名の付いた7地点の代表位置。点と産業名をクリック、またはTabで移動してEnterかスペースで読むことができます。選択しても他産業を残します。':climateView?'気候区分の格子図です。12観測所の都市名や地点を選ぶと、右側に雨温図と観測地点の格子分類が表示されます。Tabで移動し、Enterかスペースキーで選べます。':riverView?'収録された河川・湖の中心線。ナイル川とコンゴ川は名前のボタン、または地図の線で選択できます。線にはTabで移動し、Enterかスペースキーで解説を開けます。':isAgriMap()?'作物は品目別の色帯、家畜は小型の種別記号。地図内の品目名・分布や下の色凡例から選択でき、右に地域と生産・利用の説明を表示します。選択しても他分布を残します。':'分布テーマと国別統計を重ねた地図。地図下の凡例と右の説明から、表示した分布を読み取れます。国は選択欄や一覧からも選べます。');
  const actions=query<HTMLElement>('.africa-theme-actions'),explanation=query<HTMLElement>('[data-theme-takeaway-detail]');
  const countryStatistics=query<HTMLDetailsElement>('[data-country-statistics]'),statisticsMode=actual&&!state.context?'reference':'comparison';
  countryStatistics.hidden=industryMap()||!state.place&&!state.context||riverView&&!state.context;
  if(countryStatistics.dataset.mode!==statisticsMode){countryStatistics.open=statisticsMode==='comparison';countryStatistics.dataset.mode=statisticsMode;}
  query<HTMLElement>('.africa-selected').hidden=false;
  query<HTMLElement>('[data-theme-takeaway-detail]').hidden=!riverView&&query<HTMLElement>('[data-theme-takeaway-detail]').textContent===query<HTMLElement>('[data-theme-takeaway]').textContent;
  query<HTMLElement>('[data-theme-takeaway]').hidden=riverView;
  query<HTMLElement>('[data-theme-caveat]').hidden=riverView?!state.context&&river?.id!=='congo':!!actual&&!actual.guide&&state.field!=='agriculture';
  if(isAgriMap()){query<HTMLElement>('[data-theme-takeaway-detail]').hidden=true;query<HTMLElement>('[data-theme-caveat]').hidden=true;query<HTMLElement>('[data-theme-comparison]').hidden=true;query<HTMLElement>('[data-theme-return]').hidden=true;query<HTMLElement>('[data-africa-layer-selection] label').hidden=true;countryStatistics.hidden=true;return;}
  if(!riverView){query<HTMLElement>('[data-africa-layer-selection] label').hidden=isAgriOverview();query<HTMLElement>('.africa-right-fixed').append(actions);return;}
  query<HTMLElement>('[data-africa-statistics-key]').hidden=!state.context;
  explanation.after(actions);
  if(state.context)text('[data-theme-caveat]',metricById(state.context).note);
  else if(river?.id==='congo')text('[data-theme-caveat]','本文はコンゴ盆地の環境の解説です。強調した川の線は、盆地や全流域の境界を示しません。');
  query<HTMLElement>('[data-themes]').replaceChildren();
  query<HTMLElement>('[data-africa-layer-selection]').hidden=!actual?.error;
  query<HTMLElement>('[data-africa-layer-selection] label').hidden=true;
  text('[data-africa-point-reading]','');
  text('[data-theme-title]',river?river.label:'河川を選んで読む');
  text('.africa-kicker',state.context?'河道と国別の淡水を比較':'名前または地図の線から選択');
  text('[data-theme-takeaway-detail]',river?river.reading.text:'ナイル川・コンゴ川を選ぶと、河道を強調し、既存の解説と出典を読めます。青い線は表示枠内に収録された河川・湖の中心線です。');
  const source=query<HTMLAnchorElement>('[data-theme-source]');source.hidden=!river;if(river){source.href=river.reading.source;source.textContent=river.reading.sourceLabel;}
  const compare=query<HTMLButtonElement>('[data-theme-comparison]');compare.hidden=!!state.context||!river;compare.textContent='国内の再生可能淡水／人と比べる';compare.disabled=!actual?.ready;
  const back=query<HTMLButtonElement>('[data-theme-return]');back.hidden=!state.context;back.textContent=`← ${river?.label??'河川'}の解説へ戻る`;
  const details=query<HTMLElement>('[data-theme-details]');details.replaceChildren();
  if(river?.theme){details.append(make('p',river.theme.takeaway));for(const item of [{url:river.theme.source,label:river.theme.sourceLabel},...river.theme.evidenceSources??[]]){const p=make('p'),a=make('a',item.label) as HTMLAnchorElement;a.href=item.url;p.append(a);details.append(p);}}
  if(actual?.period)details.append(make('p',`河道データ：${actual.period}`));
  details.append(make('p',actual?.scope??'アフリカを含む表示枠内の原本中心線。枠内の隣接陸域も含みます。'),make('p',actual?.method??''),make('p','一般化された中心線で、収録されていない支流や線の隙間を補いません。流量・取水可能量・帯水層・河口・全流域は表しません。'));
  if(actual?.sourceUrl){const p=make('p'),a=make('a',`河道：${actual.sourceLabel}`) as HTMLAnchorElement;a.href=actual.sourceUrl;p.append(a);details.append(p);}
  if(state.context){const a=make('a','淡水統計の出典：世界銀行 WDI') as HTMLAnchorElement;a.href=`https://data.worldbank.org/indicator/${state.context}`;details.prepend(a);}
  const legend=query<HTMLElement>('[data-africa-layer-legend]');legend.replaceChildren();
  for(const [label,color] of [['収録河道','#4786a5'],...(river?[[`${river.label}（選択）`,africaRiverSelectedColor]]:[])]){const item=make('span',label),swatch=make('i');swatch.style.background=color;swatch.className='africa-river-key-line';item.prepend(swatch);legend.append(item);}
  text('[data-africa-layer-caption]','線は河川・湖の中心線。太さは流量を表しません。');
  text('[data-africa-layer-scope]',state.context?'色付きの国別記号：国内の再生可能淡水／人。国外からの流入は含みません。':'表示枠は隣接陸域も含みます。河川を網羅せず、地下水の分布は未収録です。');
  text('[data-metric-title]',river?`${river.label}と収録河道`:'河川・湖の中心線');text('#africa-svg-title',actual?.ready&&river?`${river.label}を強調した河川・湖の中心線`:'河川・湖の中心線');
 }
 let renderedClimateCity='';
 function renderClimateCityReading(){
  const climate=state.field==='nature'&&state.topic==='climate'&&state.view==='distribution';
  const city=climate?africaClimateCityById(state.city):undefined;
  if(renderedClimateCity!==(city?.id??'')){query<HTMLElement>('.africa-detail').scrollTop=0;renderedClimateCity=city?.id??'';}
  query<HTMLElement>('[data-africa-city-return]').hidden=!city;
  query<HTMLElement>('[data-africa-city-readings]').hidden=!city;
  for(const node of root!.querySelectorAll<HTMLElement>('[data-africa-city-reading]'))node.hidden=node.dataset.africaCityReading!==city?.id;
  if(!climate)return;
  text('[data-theme-takeaway-detail]',africaClimateCityCoverage);
  query<HTMLElement>('[data-theme-takeaway-detail]').hidden=false;
  if(city){
   text('.africa-kicker','観測所の月別平年値から読む');
   text('[data-theme-title]',city.name+'の雨温図');
   text('[data-theme-takeaway]','');
   query<HTMLElement>('[data-theme-takeaway]').hidden=true;
   query<HTMLElement>('[data-theme-comparison]').hidden=true;
   query<HTMLElement>('[data-theme-caveat]').hidden=true;
   text('[data-africa-point-reading]',`${city.name}の観測所平年値と、観測地点に重なる${city.classification.code}格子を別資料として表示しています。`);
  }else{
   text('.africa-kicker','気候区分と都市の平年値');
   text('[data-theme-takeaway]','赤道付近には熱帯雨林、サハラには砂漠、両者の間には乾季をもつサバナが広がります。東アフリカ高地と南端では標高や緯度によって温帯の区分も見られます。都市点を選ぶと、地点の雨温図と格子区分を比べられます。');
   query<HTMLElement>('[data-theme-takeaway]').hidden=false;
  }
 }
 function renderComparisonOverlay(metric:Metric){
  const layer=query<SVGGElement>('[data-africa-comparison-layer]');layer.replaceChildren();
  if(!actual?.ready||actual.guide||!state.context)return;
  const view=map.getAttribute('viewBox')!.split(' ').map(Number),rect=map.getBoundingClientRect(),scale=Math.max(view[2]/(rect.width||645),view[3]/(rect.height||416));
  for(const code of [state.place,state.compare].filter(Boolean)){const country=countries.find(c=>c.code===code)!,value=valueAt(metric.id,code,state.year),[x,y]=projectAfrica(country.point);const color=value===null?'#777':fillFor(value,metric);const g=svgEl('g',{'data-africa-comparison-country':code});if(metric.symbols&&value!==null&&value>0)g.append(svgEl('circle',{cx:x,cy:y,r:Math.sqrt(value/1e6)*2.2*scale,fill:'#3c7968','fill-opacity':.45,'data-africa-comparison-population':code}));const labelY=metric.symbols?y+40*scale:y;g.append(svgEl('rect',{x:x-45*scale,y:labelY-18*scale,width:90*scale,height:36*scale,fill:'#fffefa',stroke:color,'stroke-width':3,'vector-effect':'non-scaling-stroke',rx:3*scale}));g.append(svgEl('text',{x,y:labelY-2*scale,'text-anchor':'middle','font-size':12*scale,fill:'#203a42'},country.name),svgEl('text',{x,y:labelY+12*scale,'text-anchor':'middle','font-size':12*scale,fill:'#203a42'},`${formatValue(value,metric)} ${metric.unit}`));layer.append(g);}
 }
 function renderTrend(metric:Metric) {
  const container=query<HTMLElement>('[data-trend]');container.replaceChildren();
  const body=query<HTMLTableSectionElement>('[data-trend-table]');body.replaceChildren();
  const details=body.closest('details')!;
  if(!state.place){details.hidden=true;container.append(make('p','国を選ぶと、その国の統計と推移を確認できます。'));return;}
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
  state.topic=canonicalTopic(state.field,state.metric,state.topic);
  if(state.field!=='industry')state.industryLocation='';
  if(state.field!=='nature'||state.topic!=='climate'||state.view!=='distribution')state.city='';
  if(state.field==='agriculture'){
   state.cropMeasure='harvested';state.compare='';state.context='';state.sourceState='';
   if(state.topic!=='forestry'){
    state.view='distribution';state.layerClass='';
    const focused=state.topic==='livestock'?`livestock-${state.livestock}`:`crop-${state.crop}-harvested`;
    const requested=state.agriLayers&&state.agriLayers.split(',').length===1?canonicalAgriLayers(state.agriLayers.replace(/-production$/,'-harvested')):null;
    state.agriLayers=!state.overview&&requested===focused&&!/^crop-(coffee|tea)-/.test(focused)?requested:null;
    state.agriOutline=!state.overview;
   }
  }
  state.water=state.field==='nature'?canonicalWater(state.metric,state.water):'';
  state.river=canonicalRiver(state,state.river);
  root!.dataset.field=state.field;root!.dataset.overview=String(state.overview);
  root!.dataset.topic=state.topic;root!.dataset.water=state.water;
  fitMap();
  actual=layerRenderer.render(state);
  renderRegionalStatistics();
  if(actual?.guide){state.context='';state.layerClass='';state.layerPoint='';state.sourceState='';}
  if(actual?.ready&&state.layerClass&&!actual.legend.some(row=>row.id===state.layerClass)){state.layerClass='';actual=layerRenderer.render(state);}
  root!.dataset.actualLayer=actual?.ready&&!actual.guide?'true':'false';root!.dataset.layerMode=actual?.guide?'guide':actual?.ready?'distribution':'statistics';
  renderTopics();
  const agricultureField=state.field==='agriculture';
  query<HTMLElement>('[data-africa-agri-map-controls]').hidden=!agricultureField;query<HTMLSelectElement>('[data-africa-agri-region]').value=state.region;query<HTMLElement>('[data-africa-agri-region-label]').hidden=!agricultureField;query<HTMLSelectElement>('[data-africa-agri-display]').value=state.agriDisplay;
  query<HTMLElement>('[data-africa-agri-context]').hidden=!isAgriMap();query<HTMLElement>('[data-africa-agri-actions]').hidden=!isAgriMap()||state.overview;query<HTMLElement>('[data-africa-agri-overview]').hidden=!isAgriMap()||state.overview;
  const notes=query<HTMLElement>('[data-africa-agri-notes]'),full=query<HTMLElement>('.africa-theme-full'),selection=query<HTMLElement>('[data-africa-layer-selection]');notes.hidden=!isAgriMap();
  if(isAgriMap()){notes.append(full);full.append(selection);}else{full.querySelector('summary')!.textContent='分布の詳しい読み方・出典';const scroll=query<HTMLElement>('.africa-detail-scroll');scroll.insertBefore(selection,query<HTMLElement>('[data-theme-takeaway-detail]'));scroll.insertBefore(full,query<HTMLElement>('[data-country-statistics]'));}

   const metric=metricById(state.context||state.metric);
  const theme=themes.find(t=>t.id===state.theme)!;
  const country=countries.find(c=>c.code===state.place);
  const comparison=countries.find(c=>c.code===state.compare);
  const period=agricultureField?'指標ごとの最新収録年':metric.timeless?'長期平均':`${state.year}年`;
  for(const button of root!.querySelectorAll<HTMLButtonElement>('[data-field]'))button.setAttribute('aria-pressed',String(button.dataset.field===state.field));
  for(const option of query<HTMLSelectElement>('[data-metric]').options){const selectedField=metricById(option.value).field===state.field;option.hidden=!selectedField;option.disabled=!selectedField;}
  query<HTMLSelectElement>('[data-metric]').value=state.metric;
  query<HTMLSelectElement>('[data-year]').value=String(state.year);query<HTMLSelectElement>('[data-year]').disabled=!!metric.timeless;query<HTMLButtonElement>('[data-latest]').disabled=!!metric.timeless;
  text('[data-year-note]',state.field==='agriculture'?'分布は2020年基準。国別の参考統計は指標ごとの最新収録値を表示します。':metric.timeless?'長期平均のため年による切替はありません':'国平均・選択年の値。未収録年は欠測表示。');
  query<HTMLSelectElement>('[data-region]').value=state.region;query<HTMLSelectElement>('[data-place]').value=state.place;query<HTMLSelectElement>('[data-compare]').value=state.compare;
  query<HTMLSelectElement>('[data-compare]').disabled=!state.place;
  query<HTMLButtonElement>('[data-zoom="country"]').disabled=!state.place;
  for(const option of query<HTMLSelectElement>('[data-compare]').options)option.disabled=option.value===state.place;
  text('[data-field-title]',fields[state.field].title);text('[data-field-summary]',fields[state.field].summary);
   text('[data-period]',period);text('[data-metric-title]',metric.label);text('[data-unit]',metric.unit);text('#africa-svg-title',`${metric.label}・${period}`);
   text('[data-essential-metric]',`${metric.label} · ${period} · ${metric.unit}${metric.symbols?'（円の面積）':''}`);
   text('[data-essential-boundary]',`${metric.symbols?'円は国人口。':'色は国全体。'}国境：細線／選択：赤枠／比較：青破線／白丸：島の選択用。`);
  for(const path of paths){const code=path.dataset.countryPath!;const c=countries.find(c=>c.code===code)!;const v=agricultureField?latestValueAt(metric.id,code)?.value??null:valueAt(metric.id,code,state.year);path.setAttribute('fill',actual||isRiverView()||industryMap()?'#f3f1e9':fillFor(v,metric));path.classList.toggle('is-selected',code===state.place);path.classList.toggle('is-compared',code===state.compare);path.classList.toggle('is-muted',!actual&&!isRiverView()&&!industryMap()&&state.zoom!=='theme'&&state.region!=='all'&&c.region!==state.region&&code!==state.place&&code!==state.compare);path.style.pointerEvents=countryInteractive()?'auto':'none';const title=path.querySelector('title');if(countryInteractive()){const label=title??svgEl('title',{});label.textContent=`${c.name}：${formatValue(v,metric)}${v===null?'':` ${metric.unit}`}（${agricultureField?`${latestValueAt(metric.id,code)?.year??'年未収録'}年`:period}）`;if(!title)path.append(label);}else title?.remove();}
  fitMap();
  const view=map.getAttribute('viewBox')!.split(' ').map(Number),box=map.getBoundingClientRect();
  const symbolScale=Math.max(view[2]/(box.width||640),view[3]/(box.height||528));
  const symbols=query<SVGGElement>('[data-symbols]');symbols.replaceChildren();
  if(metric.symbols&&!actual)for(const c of [...countries].sort((a,b)=>(valueAt(metric.id,b.code,state.year)??0)-(valueAt(metric.id,a.code,state.year)??0))){const v=valueAt(metric.id,c.code,state.year);if(v===null||v<=0)continue;if(state.zoom==='country'&&c.code!==state.place&&c.code!==state.compare)continue;const [x,y]=projectAfrica(c.point);const circle=svgEl('circle',{cx:x,cy:y,r:Math.sqrt(v/1e6)*2.2*symbolScale,class:'africa-symbol','data-country-marker':c.code,opacity:state.zoom!=='theme'&&state.region!=='all'&&c.region!==state.region&&c.code!==state.place&&c.code!==state.compare ? .25 : 1});circle.append(svgEl('title',{},`${c.name}：${formatValue(v,metric)}人`));symbols.append(circle);}
  for(const marker of root!.querySelectorAll<SVGGElement>('[data-island-marker]'))marker.style.display=metric.symbols||!countryInteractive()?'none':'';
  for(const button of root!.querySelectorAll('[data-zoom]'))button.setAttribute('aria-pressed',String((button as HTMLElement).dataset.zoom===state.zoom));
  renderTheme(theme);
  renderActualReading();
  query<HTMLElement>('[data-africa-layer-selection] label').hidden=isAgriMap();
  renderIndustryOverview();
  renderReadingLayout();
  renderClimateCityReading();
  if(isRiverView())text('[data-essential-boundary]','国別記号の枠色：淡水統計の区分。国境：細線／選択国：赤枠／比較国：青い破線。');
  query<SVGGElement>('[data-theme-marks]').style.display=actual||isRiverView()?'none':'';
  query<HTMLElement>('[data-theme-legend]').hidden=!!actual||isRiverView();
  const legend=query<HTMLElement>('[data-legend]');legend.replaceChildren();
   if(metric.symbols){const key=svgEl('svg',{viewBox:'0 0 310 48',width:310,height:48,role:'img','aria-label':'人口の円面積。100万人、1000万人、1億人の大きさ。'});[1e6,1e7,1e8].forEach((v,i)=>{const r=Math.sqrt(v/1e6)*2.2;key.append(svgEl('circle',{cx:[5,87,200][i],cy:24,r,fill:'#3c7968','fill-opacity':.6}));key.append(svgEl('text',{x:[13,99,225][i],y:29,'text-anchor':'start','font-size':14},`${v/1e4}万人`));});legend.append(key);}
  else palette.forEach((color,i)=>{const label=i===0?`${metric.breaks[0].toLocaleString()}未満`:i===4?`${metric.breaks[3].toLocaleString()}以上`:`${metric.breaks[i-1].toLocaleString()}〜${metric.breaks[i].toLocaleString()}未満`;const span=make('span');const swatch=make('i');swatch.style.background=color;span.append(swatch,document.createTextNode(label));legend.append(span);});
  const missing=make('span');const swatch=make('i');swatch.className='africa-no-data';missing.append(swatch,document.createTextNode('未収録'));legend.append(missing);
  text('[data-map-caption]',industryMap()?africaIndustryLocationOverview.scope:isRiverView()?actual?.ready?actual.scope:'河道データを取得すると、収録された中心線を表示します。背景は国境の参照図です。':actual?.ready?actual.scope:metric.symbols?'円の面積は人口に比例。国を示す位置に置いており、都市人口や居住範囲ではありません。':'色は国平均・国全体の割合です。国内の分布・産地・都市の境界を表しません。島の白丸は選択用の目印です。');
  const ranked=agricultureField?countries.filter(c=>state.region==='all'||c.region===state.region).map(c=>({...c,value:latestValueAt(metric.id,c.code)?.value??null,year:latestValueAt(metric.id,c.code)?.year})).sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity)||a.name.localeCompare(b.name,'ja')):rankedCountries({...state,metric:metric.id});const count=ranked.filter(c=>c.value!==null).length;
  text('[data-coverage]',`${regionNames[state.region]}：${ranked.length}の国・地域のうち${count}件を収録、${ranked.length-count}件は未収録。${agricultureField?'国別参考統計は各指標の最新収録年です。':'赤枠は選択国、青い破線は比較国。'}`);
  text('[data-selected-name]',country?.name??'国を選んで比較');text('[data-selected-region]',country?regionNames[country.region as Region]:'');text('[data-selected-value]',country?formatValue(agricultureField?latestValueAt(metric.id,country.code)?.value??null:valueAt(metric.id,country.code,state.year),metric):'');text('[data-selected-unit]',country?metric.unit:'');text('[data-selected-metric]',`${actual?.ready?'参考：国別統計 · ':''}${metric.label}`);
  text('[data-comparison]',comparison?`比較：${comparison.name}　${formatValue(valueAt(metric.id,comparison.code,state.year),metric)} ${metric.unit}`:'');
  text('[data-place-note]',!country?'上段の国・地域から比較対象を選べます。':country.code==='ESH'?'西サハラの独立したWDI系列は未収録です。モロッコの値は転用しません。':country.code==='SOM'?'数値はソマリア全体の統計です。地図ではソマリランドも同じ選択対象に含めています。':`${agricultureField?`${latestValueAt(metric.id,country.code)?.year??'年未収録'}年`:period}。${country.name}全体の集計値です。${theme.places.includes(country.code)?'':'テーマの代表地点の数値ではありません。'}`);
  text('[data-column-place]',country?.name??'国未選択');text('[data-column-compare]',comparison?.name??'比較国');query<HTMLElement>('[data-column-compare]').hidden=!comparison;
  const current=query<HTMLElement>('[data-current-metrics]');current.replaceChildren();
  for(const m of metrics.filter(m=>m.field===state.field)){const tr=make('tr');const th=make('th',m.label);th.append(make('small',m.unit));const observation=agricultureField?latestValueAt(m.id,state.place):null;tr.append(th,make('td',agricultureField?observation?`${formatValue(observation.value,m)}（${observation.year}年）`:'未収録':formatValue(valueAt(m.id,state.place,state.year),m)));if(comparison)tr.append(make('td',formatValue(valueAt(m.id,state.compare,state.year),m)));current.append(tr);}
  text('[data-metric-year]',agricultureField?'保存データ内の指標別・国別の最新収録年を併記します。年は指標ごとに異なり、欠測は補いません。':`表は${state.year}年（降水量のみ長期平均）。値がない年は「未収録」です。`);
  renderTrend(metric);
  text('[data-metric-note]',metric.note);query<HTMLAnchorElement>('[data-source]').href=`https://data.worldbank.org/indicator/${metric.id}`;
  const source=sources.find(s=>s.id===metric.id)!;
  const credit=metric.id.startsWith('AG.')||metric.id==='ER.H2O.INTR.PC'?'FAOの統計（WDI収録）':metric.field==='population'?'国連人口部・各国統計局等（WDI収録）':metric.id==='NY.GDP.TOTL.RT.ZS'?'世界銀行の資源レント推計':'各国の国民経済計算・世界銀行等';
  text('[data-source-organization]',`${credit} · WDI更新：${source.lastUpdated}`);
  for(const cards of root!.querySelectorAll<HTMLElement>('[data-reading-field]'))cards.hidden=cards.dataset.readingField!==state.field;
  text('[data-ranking-unit]',`${metric.unit}（${period}）`);text('[data-ranking-description]',`${regionNames[state.region]}・${metric.label}の大きい順。未収録は末尾に表示します。`);
  const rows=query<HTMLElement>('[data-ranking]');rows.replaceChildren();
  for(const c of ranked){const tr=make('tr');tr.classList.toggle('is-selected',c.code===state.place);tr.classList.toggle('is-compared',c.code===state.compare);const th=make('th');const button=make('button',c.name);button.setAttribute('type','button');button.dataset.focusCountry=c.code;th.append(button);const compare=make('td');const compareButton=make('button',c.code===state.compare?'比較中':'比較に追加');compareButton.setAttribute('type','button');compareButton.dataset.compareCountry=c.code;compareButton.setAttribute('aria-label',`${c.name}を比較に追加`);(compareButton as HTMLButtonElement).disabled=!state.place||c.code===state.place;compare.append(compareButton);tr.append(th,make('td',regionNames[c.region as Region]),make('td',formatValue(c.value,metric)+(agricultureField&&'year' in c&&c.year?`（${c.year}年）`:'')),compare);rows.append(tr);}
  renderComparisonOverlay(metric);
  if(write){const url=publicStateURL(state,new URL(location.href));if(url.href!==location.href)history.pushState(null,'',url);}
  const overview=root!.querySelector<HTMLAnchorElement>('[data-africa-overview-link]');if(overview){const url=publicStateURL({...state},new URL(overview.href));url.searchParams.delete('country');if(!countryPinned)url.searchParams.delete('place');const params=new URLSearchParams(location.search);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}overview.href=url.href;}
 }
 function chooseCountry(code:string,preservePoint=false){if(code&&!countries.some(c=>c.code===code))return;countryPinned=!!code;state.place=code;if(!preservePoint)state.layerPoint='';if(state.topic==='ethnicity')state.layerClass='';if(!code||state.compare===code)state.compare='';if(code&&state.region!=='all')state.region=countries.find(c=>c.code===code)!.region as Region;if(!code||state.zoom==='theme'&&!themes.find(t=>t.id===state.theme)!.places.includes(code))state.zoom='all';render(true);}
 function chooseAgriLayer(key:string){if(!/^crop-(maize|rice|wheat|cassava|coffee|tea)-harvested$|^livestock-(cattle|goats|sheep)$/.test(key))return;state.agriLayers=null;state.agriDisplay='all';if(key.startsWith('crop-')){const [,crop,measure]=key.split('-');state.topic='farming';state.crop=crop as Crop;state.cropMeasure=measure as CropMeasure;state.metric='AG.LND.ARBL.ZS';}else{state.topic='livestock';state.livestock=key.slice(10) as Livestock;state.metric='NV.AGR.TOTL.ZS';}state.overview=false;state.agriOutline=true;state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';render(true);}
 root.addEventListener('click',event=>{
  const target=(event.target as Element).closest<HTMLElement>('[data-field],[data-focus-country],[data-compare-country],[data-country-path],[data-country-marker],[data-zoom],[data-reset],button[data-theme],[data-theme-comparison],[data-theme-return],[data-africa-topic],[data-africa-water],[data-africa-commodity],[data-africa-crop-measure],[data-africa-layer-class],[data-africa-layer-retry],[data-africa-river],[data-africa-river-choice],[data-africa-city],[data-africa-city-return],[data-africa-overview-layer],[data-africa-agri-overview],[data-africa-industry-overview],[data-africa-industry-theme],[data-africa-industry-location],[data-africa-industry-return],[data-africa-agri-pick],[data-africa-agri-only],[data-africa-agri-all]');if(!target)return;
  if(target.hasAttribute('data-africa-city-return')){state.city='';render(true);return;}
  if(target.hasAttribute('data-africa-city')){const city=africaClimateCityById(target.dataset.africaCity!);if(!city||state.field!=='nature'||state.topic!=='climate')return;state.city=city.id;state.context='';state.sourceState='';state.layerPoint='';state.view='distribution';render(true);return;}
  if((target.hasAttribute('data-country-path')||target.hasAttribute('data-country-marker'))&&!countryInteractive())return;
  if(target.hasAttribute('data-africa-agri-pick')){chooseAgriLayer(target.dataset.africaAgriPick!);return;}
  if(target.hasAttribute('data-africa-agri-only')){state.agriLayers=state.topic==='livestock'?`livestock-${state.livestock}`:`crop-${state.crop}-harvested`;render(true);return;}
  if(target.hasAttribute('data-africa-agri-all')){state.agriLayers=null;render(true);return;}
  if(target.hasAttribute('data-africa-agri-overview')){state.overview=true;state.topic='farming';state.agriLayers=null;state.agriOutline=false;state.cropMeasure='harvested';state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';render(true);return;}
  if(target.hasAttribute('data-africa-overview-layer')){chooseAgriLayer(target.dataset.africaOverviewLayer!);return;}
  if(target.hasAttribute('data-africa-industry-location')){const id=target.dataset.africaIndustryLocation!;if(!africaIndustryLocationById(id))return;state.industryLocation=id;state.overview=false;state.context='';state.sourceState='';state.view='distribution';render(true);root!.querySelector<SVGElement>(`[data-africa-industry-location="${id}"]`)?.focus({preventScroll:true});return;}
  if(target.hasAttribute('data-africa-industry-return')){state.industryLocation='';state.overview=true;state.context='';state.sourceState='';render(true);return;}
  if(target.hasAttribute('data-africa-industry-overview')){state.industryLocation='';state.overview=true;state.zoom='all';state.context='';state.sourceState='';render(true);return;}
  if(target.dataset.africaIndustryTheme){state.view='statistics';chooseTheme(target.dataset.africaIndustryTheme);render(true);return;}
  if(target.hasAttribute('data-africa-river')||target.hasAttribute('data-africa-river-choice')){chooseRiver(target.dataset.africaRiver??target.dataset.africaRiverChoice??'');return;}
  if(target.hasAttribute('data-africa-layer-class')){state.layerClass=state.layerClass===target.dataset.africaLayerClass?'':target.dataset.africaLayerClass!;state.layerPoint='';render(true);return;}
  if(target.hasAttribute('data-africa-layer-retry')){layerRenderer.retry();return;}
  if(target.dataset.africaTopic){state.topic=target.dataset.africaTopic;if(state.field==='agriculture'){state.overview=true;state.agriLayers=null;state.agriOutline=false;}state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';if(state.zoom==='theme')state.zoom='all';if(state.topic==='forestry')state.metric='AG.LND.FRST.ZS';if(state.topic==='livestock')state.metric='NV.AGR.TOTL.ZS';if(state.topic==='farming')state.metric='AG.LND.ARBL.ZS';render(true);return;}
  if(target.dataset.africaCommodity){if(state.topic==='farming'&&cropChoices.some(row=>row.id===target.dataset.africaCommodity))chooseAgriLayer(`crop-${target.dataset.africaCommodity}-${state.cropMeasure}`);else if(state.topic==='livestock'&&livestockChoices.some(row=>row.id===target.dataset.africaCommodity))chooseAgriLayer(`livestock-${target.dataset.africaCommodity}`);return;}
  if(target.dataset.africaCropMeasure){if(!cropMeasureChoices.some(row=>row.id===target.dataset.africaCropMeasure))return;state.cropMeasure=target.dataset.africaCropMeasure as CropMeasure;if(state.agriLayers!==null)state.agriLayers=canonicalAgriLayers(africaAgriVisibleLayers(state).map(key=>key.startsWith('crop-')?key.replace(/-(harvested|production)$/,`-${state.cropMeasure}`):key).join(','));state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';render(true);return;}
  if(target.dataset.africaWater){state.water=target.dataset.africaWater;state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';if(state.water!=='basin')state.metric=state.water==='river'?'ER.H2O.INTR.PC':'AG.LND.PRCP.MM';render(true);return;}
  if(target.hasAttribute('data-reset')){state=readState('');countryPinned=false;regionPinned=false;render(true);return;}
  if(target.dataset.field){if(target.dataset.field===state.field)return;state.field=target.dataset.field as Field;state.metric=metrics.find(m=>m.field===state.field)!.id;state.topic=state.field==='nature'?'climate':'';state.water='';state.view='distribution';state.theme=themes.find(t=>t.field===state.field)!.id;state.overview=true;state.zoom='all';state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';if(!regionPinned)state.region='all';render(true);return;}
  if(target.dataset.theme){state.view='statistics';chooseTheme(target.dataset.theme);render(true);return;}
  if(target.hasAttribute('data-theme-comparison')){if(actual?.guide)return;state.sourceState=africaComparisonSnapshot(state);state.context=state.field==='agriculture'?state.topic==='forestry'?africaForestryReading.compareMetric:actual?.ready?africaAgricultureReading(state).compareMetric:themes.find(t=>t.id===state.theme)!.compareMetric:actual?.ready?state.metric:themes.find(t=>t.id===state.theme)!.compareMetric;render(true);return;}
  if(target.hasAttribute('data-theme-return')){state=state.sourceState?readState('?'+state.sourceState):{...state,context:'',sourceState:''};readSelectionPins();render(true);return;}
  if(target.dataset.zoom){state.zoom=target.dataset.zoom as typeof state.zoom;render(true);return;}
  if(target.dataset.compareCountry){if(!state.place)return;state.compare=target.dataset.compareCountry===state.place?'':target.dataset.compareCountry;render(true);return;}
  chooseCountry(target.dataset.focusCountry??target.dataset.countryPath??target.dataset.countryMarker??'',!!actual?.ready&&!!target.closest('.africa-map'));
 });
 root.addEventListener('keydown',event=>{
  if(event.defaultPrevented)return;
  const city=(event.target as Element).closest<SVGElement>('[data-africa-city]');if(city&&['Enter',' '].includes(event.key)){event.preventDefault();city.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
  const agri=(event.target as Element).closest<SVGElement>('[data-africa-agri-pick]');if(agri&&['Enter',' '].includes(event.key)){event.preventDefault();const key=agri.dataset.africaAgriPick!;chooseAgriLayer(key);root!.querySelector<SVGElement>(`[data-africa-agri-pick="${key}"][tabindex]`)?.focus({preventScroll:true});return;}
  const industryLocation=(event.target as Element).closest<SVGElement>('[data-africa-industry-location]');if(industryLocation&&['Enter',' '].includes(event.key)){event.preventDefault();industryLocation.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));return;}
  const industry=(event.target as Element).closest<SVGElement>('[data-africa-industry-theme]');if(industry&&['Enter',' '].includes(event.key)){event.preventDefault();state.view='statistics';chooseTheme(industry.dataset.africaIndustryTheme!);render(true);return;}
  const tab=(event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
  if(tab&&['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){const tabs=[...tab.closest('[role="tablist"]')!.querySelectorAll<HTMLButtonElement>('[role="tab"]')],index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;event.preventDefault();tabs[next].focus({preventScroll:true});tabs[next].click();return;}
  const target=(event.target as Element).closest<SVGPathElement>('[data-africa-river]');if(!target||!['Enter',' '].includes(event.key))return;event.preventDefault();const id=target.dataset.africaRiver!,feature=target.getAttribute('data-africa-river-hit-feature');chooseRiver(id);const hits=[...root!.querySelectorAll<SVGPathElement>(`[data-africa-river="${id}"]`)];(hits.find(hit=>hit.getAttribute('data-africa-river-hit-feature')===feature)??hits[0])?.focus({preventScroll:true});
 });
 root.addEventListener('change',event=>{const input=event.target as HTMLInputElement;if(input.hasAttribute('data-africa-agri-layer')){const key=input.dataset.africaAgriLayer!,layers=new Set(africaAgriVisibleLayers(state));if(input.checked)layers.add(key);else for(const value of layers)if(value===key||key.startsWith('crop-')&&value.startsWith(key.replace(/-(harvested|production)$/,'-')))layers.delete(value);state.agriLayers=canonicalAgriLayers([...layers].join(','));render(true);}else if(input.hasAttribute('data-africa-agri-outline')){state.agriOutline=input.checked;render(true);}});
 query<HTMLButtonElement>('[data-latest]').addEventListener('click',()=>{state.year=defaultYear(state.context||state.metric);render(true);});
 query<HTMLSelectElement>('[data-metric]').addEventListener('change',event=>{state.metric=(event.target as HTMLSelectElement).value;state.context='';state.sourceState='';state.topic='';state.water='';state.view='statistics';render(true);});
 query<HTMLSelectElement>('[data-year]').addEventListener('change',event=>{state.year=Number((event.target as HTMLSelectElement).value);render(true);});
 query<HTMLSelectElement>('[data-africa-agri-display]').addEventListener('change',event=>{state.agriDisplay=(event.target as HTMLSelectElement).value as typeof state.agriDisplay;render(true);});
 query<HTMLSelectElement>('[data-africa-agri-region]').addEventListener('change',event=>{regionPinned=true;state.region=(event.target as HTMLSelectElement).value as Region;state.zoom=state.region==='all'?'all':'region';render(true);});
 query<HTMLSelectElement>('[data-region]').addEventListener('change',event=>{regionPinned=true;state.region=(event.target as HTMLSelectElement).value as Region;state.zoom=state.region==='all'?'all':'region';render(true);});
 query<HTMLSelectElement>('[data-place]').addEventListener('change',event=>chooseCountry((event.target as HTMLSelectElement).value));
 query<HTMLSelectElement>('[data-compare]').addEventListener('change',event=>{state.compare=(event.target as HTMLSelectElement).value;render(true);});
 query<HTMLSelectElement>('[data-africa-layer-category]').addEventListener('change',event=>{state.layerClass=(event.target as HTMLSelectElement).value;state.layerPoint='';render(true);});
 map.addEventListener('click',event=>{if(!actual?.ready||actual.guide||isRiverView()||(event.target as Element).closest('[data-africa-agri-pick],[data-africa-city]'))return;const box=map.getBoundingClientRect();if(!box.width||!box.height)return;const view=map.getAttribute('viewBox')!.split(' ').map(Number),scale=Math.min(box.width/view[2],box.height/view[3]),offsetX=(box.width-view[2]*scale)/2,offsetY=(box.height-view[3]*scale)/2;const x=view[0]+(event.clientX-box.left-offsetX)/scale,y=view[1]+(event.clientY-box.top-offsetY)/scale,lon=x/africaWidth*91-27,lat=39-y/africaHeight*75;if(lon<-27||lon>64||lat<-36||lat>39)return;state.layerPoint=`${lon.toFixed(4)},${lat.toFixed(4)}`;render(true);});
 window.addEventListener('popstate',()=>{state=readState(location.search);readSelectionPins();render();});
 window.addEventListener('resize',()=>render());
 render();
 if(state.field==='agriculture'){const url=publicStateURL(state,new URL(location.href));if(url.href!==location.href)history.replaceState(null,'',url);}
}
