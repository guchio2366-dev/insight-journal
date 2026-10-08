import {withBase} from '../lib/urls.ts';
import {countries,regionNames,readState,writeState,normalizeAfricaReaderState,africaAgriFocusedLayer,cropChoices,livestockChoices,type Region,type Crop,type Livestock} from '../data/atlas/africa-atlas.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import {themes} from '../data/atlas/africa-themes.ts';
import {africaIndustryLocations,africaIndustryLocationById,africaIndustryLocationOverview} from '../data/atlas/africa-industry-locations.ts';
import {africaForestryReading} from '../data/atlas/africa-forestry-reading.ts';
import {agricultureContextOverview,agricultureProductContext,agricultureContextPeriodNote} from '../data/atlas/africa-agriculture-context.ts';
import {africaAgricultureReading} from '../data/atlas/africa-agriculture-reading.ts';
import {africaCultureAlternatives,africaCultureGuideSources} from '../data/atlas/africa-culture-guide.ts';
import {africaHydrologyRiverById,africaHydrologyBasinById,africaHydrologyOverview} from '../data/atlas/africa-hydrology-reading.ts';
import {africaClimateCityById,africaClimateCityCoverage} from '../data/atlas/africa-climate-cities.ts';
import {createAfricaLayerRenderer,africaCommodityColor,type AfricaLayerView,type AfricaLayerKey} from './atlas-africa-layers.ts';

/** One source-based reader, including entry from older country-statistics URLs. */
export function initializeAfricaAtlas(){
 const root=document.querySelector<HTMLElement>('[data-africa-atlas]');
 if(!root||root.dataset.initialized)return;
 root.dataset.initialized='true';
 const query=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const text=(selector:string,value:string)=>{const node=query(selector);if(node)node.textContent=value;};
 const make=(tag:string,value?:string)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;};
 const svg=(tag:string,attrs:Record<string,string|number>,value?:string)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,val]of Object.entries(attrs))node.setAttribute(key,String(val));if(value!==undefined)node.textContent=value;return node;};
 const link=(label:string,url:string)=>{const node=make('a',label) as HTMLAnchorElement;node.href=url;return node;};
 const button=(label:string,key:string,value:string,selected=false)=>{const node=make('button',label) as HTMLButtonElement;node.type='button';node.setAttribute(key,value);node.setAttribute('aria-pressed',String(selected));return node;};
 const map=query<SVGSVGElement>('.africa-map');
 const paths=[...root.querySelectorAll<SVGPathElement>('[data-country-path]')];
 let state=readState(location.search),actual:AfricaLayerView|null=null;
 const renderer=createAfricaLayerRenderer(root,()=>{if(document===root.ownerDocument)render();});
 const agri=()=>state.field==='agriculture'&&state.topic!=='forestry';
 const riverView=()=>state.field==='nature'&&state.topic==='water'&&state.water==='river';
 const basinView=()=>state.field==='nature'&&state.topic==='water'&&state.water==='basin';
 const details=()=>query('[data-theme-details]');
 function addSource(label:string,url:string,host=details()){if(!url)return;const p=make('p');p.append(link(label,url));host.append(p);}
 function source(label:string,url:string){const node=query<HTMLAnchorElement>('[data-theme-source]');node.hidden=!url;if(url){node.href=url;node.textContent=label;}}
 function clearSelection(){state.river='';state.basin='';state.city='';state.industryLocation='';state.layerClass='';state.layerPoint='';}
 function fitMap(){
  let view=[0,0,africaWidth,africaHeight];
  if(state.field==='agriculture'&&state.region!=='all'){
   const boxes=paths.filter(path=>countries.find(c=>c.code===path.dataset.countryPath)?.region===state.region).map(path=>path.getBBox());
   if(boxes.length){const left=Math.min(...boxes.map(b=>b.x)),right=Math.max(...boxes.map(b=>b.x+b.width)),top=Math.min(...boxes.map(b=>b.y)),bottom=Math.max(...boxes.map(b=>b.y+b.height)),width=Math.max(18,(right-left)*1.18,(bottom-top)*1.18*africaWidth/africaHeight),height=width*africaHeight/africaWidth;view=[(left+right-width)/2,(top+bottom-height)/2,width,height];}
  }
  map.setAttribute('viewBox',view.join(' '));map.dataset.detail=String(state.region!=='all');
  root!.style.setProperty('--africa-map-top',`${query('.africa-map-frame').getBoundingClientRect().top+window.scrollY}px`);
 }
 const topics={nature:[['climate','気候区分'],['water','水資源'],['terrain','地形'],['elevation','標高']],agriculture:[['farming','農畜産'],['forestry','林業']],population:[['distribution','人口分布'],['ethnicity','人種・民族'],['religion','宗教']],industry:[]} as const;
 function renderTopics(){
  const nav=query('[data-africa-subfields]');nav.replaceChildren();
  root!.querySelectorAll('.africa-main>.africa-subitems').forEach(node=>node.remove());
  if(state.field==='agriculture')query('[data-africa-map-subfields]').append(nav);else query('.africa-main').insertBefore(nav,query('.africa-workspace'));
  nav.setAttribute('role',state.field==='industry'?'group':'tablist');
  if(state.field==='industry'){
   nav.append(button('全域概要','data-africa-industry-overview','',state.overview));
   for(const theme of themes.filter(row=>row.field==='industry'))nav.append(button(theme.id==='copperbelt-connections'?'銅鉱業':'カサブランカの製造業','data-theme',theme.id,!state.overview&&state.theme===theme.id));
  }else for(const [id,label]of topics[state.field]){
   const selected=(state.topic==='livestock'?'farming':state.topic)===id,node=button(label,'data-africa-topic',id,selected);
   node.setAttribute('role','tab');node.setAttribute('aria-selected',String(selected));node.setAttribute('aria-controls','africa-map-panel');node.tabIndex=selected?0:-1;nav.append(node);
  }
  if(state.field==='nature'&&state.topic==='water'){
   const row=make('div');row.className='africa-subitems';row.setAttribute('role','tablist');row.setAttribute('aria-label','水資源の項目');
   for(const [id,label]of [['river','河川・地下水'],['rain','降水量'],['basin','河川の流域']]){const node=button(label,'data-africa-water',id,state.water===id);node.setAttribute('role','tab');node.setAttribute('aria-selected',String(id===state.water));node.setAttribute('aria-controls','africa-map-panel');node.tabIndex=id===state.water?0:-1;row.append(node);}nav.after(row);
  }
  const status=query('[data-africa-subfield-status]');status.hidden=!actual?.loading&&!actual?.error;status.textContent=actual?.error?'分布の取得に失敗しました。右の再読込で再試行できます。':actual?.loading?'分布データを読み込んでいます。選択はそのまま保持します。':'';
 }
 function swatch(row:AfricaLayerKey,interactive=true){
  const node=interactive?button(`${row.code?row.code+' ':''}${row.label}`,'data-africa-layer-class',row.id,state.layerClass===row.id):make('span',row.label),mark=make('i');mark.style.background=row.color;mark.setAttribute('aria-hidden','true');node.prepend(mark);if(row.description)node.title=row.description;return node;
 }
 function renderLegend(){
  const host=query('[data-africa-layer-legend]'),values=query('[data-africa-agri-value-legend]'),picker=query<HTMLSelectElement>('[data-africa-layer-category]');host.replaceChildren();values.replaceChildren();picker.replaceChildren();
  const all=make('option','全ての区分') as HTMLOptionElement;all.value='';picker.append(all);
  query('[data-africa-actual-key]').hidden=!actual||!!actual.guide;
  values.hidden=true;
  if(!actual||actual.guide)return;
  if(agri()){
   const focused=africaAgriFocusedLayer(state);
   for(const row of [...cropChoices.map(row=>({key:`crop-${row.id}-harvested`,label:row.label})),...livestockChoices.map(row=>({key:`livestock-${row.id}`,label:row.label}))]){const node=button(row.label,'data-africa-agri-pick',row.key,!state.overview&&focused===row.key),mark=make('i');mark.style.background=africaCommodityColor(row.key);mark.setAttribute('aria-hidden','true');node.prepend(mark);host.append(node);}
   if(!state.overview){values.hidden=false;values.append(make('p',`選択品目の数量：${actual.unit}`));for(const row of actual.legend)values.append(swatch(row));}
  }else for(const row of actual.legend)host.append(swatch(row,!riverView()&&!basinView()));
  for(const row of actual.legend){const option=make('option',`${row.code?row.code+' ':''}${row.label}`) as HTMLOptionElement;option.value=row.id;picker.append(option);}picker.value=state.layerClass;
  if(!riverView()&&!basinView())host.append(make('span',agri()?'0の推計値と、資料の値なしを区別します。':'空白は未収録・未描画で、不在を意味しません。'));
  text('[data-africa-layer-caption]',`${actual.title} · ${actual.period} · ${actual.unit}`);text('[data-africa-layer-scope]',actual.scope);
 }
 function renderAgriculture(){
  const product=state.topic==='livestock'?state.livestock:state.crop,context=state.overview?agricultureContextOverview:agricultureProductContext[product],guide=africaAgricultureReading(state);
  text('.africa-kicker',`${regionNames[state.region]} · 2020年基準`);text('[data-theme-title]',state.overview?'アフリカの農畜産業':context.title);text('[data-theme-takeaway]',context.takeaway);
  text('[data-metric-title]',state.overview?'作物と家畜の特徴的な分布':context.title.split('：')[0]);text('[data-period]','2020年基準');text('[data-unit]',state.overview?'作物・家畜の元閾値輪郭':actual?.unit??'');
  text('[data-theme-takeaway-detail]','');text('[data-theme-caveat]','');source('','');
  const host=query('[data-africa-agri-context]');for(const paragraph of context.paragraphs)host.append(make('p',paragraph));
  const statistics=make('section');statistics.className='africa-agri-statistics-status';statistics.append(make('h3','保存した統計と解像度'),make('p','作物はSPAM 2020 v2r2の収穫面積（ha／元セル）、家畜はGLW4 2020の密度（頭／km²）を収録しています。元は5分角（南北約9km）のモデル推計です。1度への集約は使いません。'),make('p',agricultureContextOverview.statisticNote));host.append(statistics);
  const focused=africaAgriFocusedLayer(state),only=state.agriLayers===focused;
  query('[data-africa-agri-only]').hidden=state.overview||only;query('[data-africa-agri-all]').hidden=state.overview||!only;
  details().append(make('p',agricultureContextPeriodNote),make('p',actual?.method??''),make('p',actual?.scope??''),make('p',guide.takeaway),make('p',guide.reading),make('p',guide.scope));
  for(const row of context.sourceLinks)addSource(row.label,row.url);
  addSource('分布の加工方法・元格子・0と欠測の扱い',withBase('/assets/atlas/africa-agriculture-distribution-v1/manifest.json'));
  for(const row of actual?.visibleLayers??[]){details().append(make('p',`${row.title} · ${row.period} · ${row.unit}`));addSource(row.sourceLabel,row.sourceUrl);}
  text('[data-africa-layer-caption]',state.overview?'輪郭：作物100 ha／元セル・家畜50頭／km² · 2020年基準':'選択品目は数量の段階色。他品目は元閾値の輪郭。');
  text('[data-africa-layer-scope]','輪郭は既存凡例の閾値で、栽培・飼養の全境界ではありません。各品目の色は凡例と対応します。');
 }
 function renderHydrology(){
  const isRiver=riverView(),overview=africaHydrologyOverview[isRiver?'river':'basin'],river=isRiver?africaHydrologyRiverById(state.river):undefined,basin=!isRiver?africaHydrologyBasinById(state.basin):undefined;
  const selectedTitle=river?.label??(basin?`${basin.riverLabel}の河道を含む収録集水区`:undefined);
  text('.africa-kicker',isRiver?'地図の河道・名前から読む':'収録集水区の実輪郭から読む');text('[data-theme-title]',selectedTitle??overview.title);
  text('[data-theme-takeaway]',river?.reading?.text??basin?.reading?.text??(river?`${river.label}の収録河道を強調しています。この河川の水利用・成因の解説は未収録です。`:basin?basin.scope:overview.reading));
  text('[data-theme-takeaway-detail]',isRiver?africaHydrologyOverview.river.groundwater:'');text('[data-theme-caveat]',river?.id==='congo'?'本文はコンゴ盆地の環境の解説です。河道の線は盆地や全流域の境界ではありません。':basin?.scope??overview.scope);
  source(river?.reading?.sourceLabel??basin?.reading?.sourceLabel??overview.sourceLabel,river?.reading?.source??basin?.reading?.source??overview.source);
  details().append(make('p',overview.scope),make('p',actual?.method??''));
  if(river?.theme){details().append(make('p',river.theme.takeaway),make('p',river.theme.caveat));addSource(river.theme.sourceLabel,river.theme.source);for(const row of river.theme.evidenceSources??[])addSource(row.label,row.url);}
  addSource(overview.sourceLabel,overview.source);
  text('[data-metric-title]',isRiver?'主要河川と収録河道':'河道に対応する収録集水区');
  text('[data-africa-layer-caption]',isRiver?'細線：収録河道 · 強調線：名前を選べる主要河川':'淡い色：別々の収録集水区 · 濃い輪郭：選択中');
  text('[data-africa-layer-scope]',isRiver?'線の太さは川幅・流量を表しません。地下水分布は未収録です。':overview.scope);
  query('[data-africa-selection-return]').hidden=!river&&!basin;
 }
 function renderIndustry(){
  const location=africaIndustryLocationById(state.industryLocation),selected=state.overview||location?undefined:themes.find(row=>row.field==='industry'&&row.id===state.theme),overview=africaIndustryLocationOverview,marks=query<SVGGElement>('[data-theme-marks]'),view=map.getAttribute('viewBox')!.split(' ').map(Number),box=map.getBoundingClientRect(),scale=Math.max(view[2]/(box.width||640),view[3]/(box.height||440));
  text('.africa-kicker','場所と産業の関係');text('[data-theme-title]',location?.label??selected?.title??overview.title);text('[data-theme-takeaway]',location?.reading??selected?.takeaway??overview.reading);text('[data-theme-takeaway-detail]',location?.note??selected?.caveat??overview.missing);
  text('[data-theme-caveat]',overview.scope);text('[data-metric-title]','産業と都市の収録事例');text('[data-period]','資料ごとの解説');text('[data-unit]','代表位置');source(location?.sources[0]?.label??selected?.sourceLabel??'',location?.sources[0]?.url??selected?.source??'');
  const key=query('[data-africa-layer-legend]');key.replaceChildren();query('[data-africa-actual-key]').hidden=false;
  const colors={resource:'#99527a',manufacturing:'#805832',transport:'#247589',city:'#465e99'},labels={resource:'銅鉱業',manufacturing:'製造業',transport:'交通',city:'都市と仕事・交通'};
  const major=new Set(['zambia-copperbelt','casablanca-industry','lagos','nairobi','cairo']);
  for(const item of africaIndustryLocations){
   const [x,y]=projectAfrica(item.coordinates),active=location?.id===item.id||selected?.id===item.themeId,color=colors[item.kind],g=svg('g',{'data-africa-industry-location':item.id,tabindex:0,role:'button','aria-label':`${item.label}を読む`,'aria-pressed':String(active),class:'africa-industry-hit','data-label-visible':String(active||major.has(item.id))});
   g.append(svg('circle',{cx:x,cy:y,r:(active?8:6)*scale,fill:color,stroke:active?'#173d46':'#fff','stroke-width':active?2.5:1.5,'vector-effect':'non-scaling-stroke'}),svg('text',{x:x+10*scale,y:y+4*scale,'font-size':14*scale,fill:color,stroke:'#fff','stroke-width':3*scale,'paint-order':'stroke'},item.label));g.append(svg('title',{},`${item.label}：${item.note}`));marks.append(g);
  }
  for(const kind of ['resource','manufacturing','transport','city'] as const)key.append(swatch({id:kind,label:labels[kind],color:colors[kind]},false));
  if(location){details().append(make('p',location.title),make('p',location.scope));for(const row of location.sources)addSource(row.label,row.url);}
  else for(const theme of themes.filter(row=>row.field==='industry'&&(!selected||selected.id===row.id))){details().append(make('p',theme.takeaway));for(const item of theme.marks)details().append(make('p',`${item.label} — ${item.note}`));addSource(theme.sourceLabel,theme.source);for(const row of theme.evidenceSources??[])addSource(row.label,row.url);}
  details().append(make('p',overview.missing));
  text('[data-africa-layer-caption]','点：事例の代表位置 · 小さい点の名前はホバー・フォーカスでも確認できます');text('[data-africa-layer-scope]','国別の割合から資源の位置や産業施設を推定していません。');query('[data-africa-selection-return]').hidden=!selected&&!location;
 }
 function renderReading(){
  details().replaceChildren();query('[data-africa-agri-context]').replaceChildren();query('[data-africa-alternatives]').replaceChildren();query('[data-theme-marks]').replaceChildren();
  query('[data-africa-selection-return]').hidden=true;query('[data-africa-city-readings]').hidden=true;query('[data-africa-alternatives]').hidden=true;
  for(const node of root!.querySelectorAll<HTMLElement>('[data-africa-city-reading]'))node.hidden=true;
  text('.africa-kicker','分布と出典を読む');text('[data-theme-title]',actual?.title??'分布の資料');text('[data-theme-takeaway]',actual?.takeaway||actual?.description||actual?.scope||'');text('[data-theme-takeaway-detail]',actual?.description??'');text('[data-theme-caveat]',actual?.scope??'');
  text('[data-metric-title]',actual?.title??'分布の資料');text('[data-period]',actual?.period??'');text('[data-unit]',actual?.unit??'');source(actual?.sourceLabel??'',actual?.sourceUrl??'');
  if(actual){details().append(make('p',actual.method),make('p',actual.scope));addSource(actual.sourceLabel,actual.sourceUrl);}
  if(agri())renderAgriculture();else if(riverView()||basinView())renderHydrology();else if(state.field==='industry')renderIndustry();
  else if(state.field==='agriculture'&&state.topic==='forestry'){
   text('[data-theme-title]','森林と土地利用の資料');text('[data-theme-takeaway]','アフリカ全域の森林分布の実輪郭は未収録です。保存済みの森林割合は国全体の集計で、森林の位置を示しません。');text('[data-theme-takeaway-detail]',africaForestryReading.reading);text('[data-theme-caveat]',africaForestryReading.definition);source(africaForestryReading.sourceLabel,africaForestryReading.source);text('[data-metric-title]','森林分布：資料未収録');text('[data-period]','背景説明：2001年');text('[data-unit]','境界の参照図');
  }else if(state.field==='nature'&&state.topic==='climate'){
   const city=africaClimateCityById(state.city);text('.africa-kicker',city?'観測所の月別平年値から読む':'気候区分と都市の平年値');text('[data-theme-takeaway-detail]',africaClimateCityCoverage);
   if(city){text('[data-theme-title]',city.name);text('[data-theme-takeaway]','');query('[data-africa-city-readings]').hidden=false;query(`[data-africa-city-reading="${city.id}"]`).hidden=false;query('[data-africa-selection-return]').hidden=false;source(city.sourceName,city.sourceUrl);}else text('[data-theme-takeaway]','地図の都市点を選ぶと、雨温図・日本語の気候区分・出典を右で読めます。分類の色から湿潤な赤道付近、乾燥帯、高地の違いを見比べます。');
   text('[data-theme-caveat]','気候区分は1991–2020年・0.1度格子。観測所の月別平年値とは異なる資料です。');
  }else if(state.field==='population'&&(state.topic==='ethnicity'||state.topic==='religion')){
   const host=query('[data-africa-alternatives]');host.hidden=false;
   for(const row of africaCultureAlternatives[state.topic]){const section=make('section');section.className='africa-alternative';section.append(make('h3',row.title),make('p',row.proposal),make('p',row.reason),make('p',row.limitations));const disclosure=make('details'),summary=make('summary','利用条件・出典と実装状況');disclosure.append(summary,make('p',row.conditions),make('p',row.status));for(const item of row.sources)addSource(item.label,item.url,disclosure);section.append(disclosure);host.append(section);}
   for(const row of africaCultureGuideSources)addSource(row.label,row.url);
  }else if(state.field==='nature'&&state.topic==='elevation'){
   text('.africa-kicker','高地と低地を読む');text('[data-theme-takeaway]','500mごとの色と等高線で、高地と低地の位置を読みます。太線は1,000mごとです。');text('[data-africa-layer-caption]','標高帯（m） · ETOPO 2022版');addSource('500m等高線の加工方法・保存データ',withBase('/assets/atlas/africa-elevation-500m-v1/manifest.json'));
  }
  const selected=actual?.legend.find(row=>row.id===state.layerClass),point=state.layerPoint.split(',').map(Number);
  text('[data-africa-point-reading]',state.layerPoint?renderer.inspect(point[0],point[1]):selected?`${selected.code??''} ${selected.label}：全体分布を残し、選択区分の実際の輪郭を強調しています。`:'地図の地点を押すと、元の表示格子の値を確認できます。');
  const inspectable=!!actual&&!actual.guide&&!riverView()&&!basinView();query('[data-africa-layer-selection]').hidden=!inspectable&&!actual?.error;query('[data-africa-layer-selection] label').hidden=true;query('[data-africa-layer-retry]').hidden=!actual?.error;
  for(const selector of ['[data-theme-takeaway]','[data-theme-takeaway-detail]','[data-theme-caveat]']){const node=query(selector);node.hidden=!node.textContent||selector==='[data-theme-takeaway-detail]'&&node.textContent===query('[data-theme-takeaway]').textContent;}
  text('#africa-svg-title',query('[data-metric-title]').textContent??'アフリカの分布');text('#africa-svg-desc',riverView()?'主要河川の名前と線を選択すると同じ河道が強調され、右に解説と出典を表示します。線にはTabで移動でき、Enterまたはスペースで選べます。':basinView()?'淡い色の収録集水区を選ぶと、実輪郭を強調し、右に河道との対応と資料の限界を表示します。':'分布の分類・名前を選ぶと右に解説と出典を表示します。地図の色と凡例は同じ区分です。');
  text('[data-map-caption]',actual?.scope??'国境は位置の参照で、国別の統計を色分けしていません。');
 }
 const focusAttributes=['data-africa-map-focus','data-africa-agri-focus','data-africa-topic','data-africa-water','data-africa-layer-class','data-africa-agri-pick','data-africa-river-hit-feature','data-africa-river','data-africa-basin','data-africa-city','data-africa-industry-theme','data-africa-industry-location'];
 function render(push=false){
  const active=document.activeElement,focus=root!.contains(active)?focusAttributes.map(key=>({key,value:active?.getAttribute(key),tag:active?.localName})).find(row=>row.value!==null&&row.value!==undefined):undefined;
  normalizeAfricaReaderState(state);root!.dataset.field=state.field;root!.dataset.topic=state.topic;root!.dataset.water=state.water;root!.dataset.overview=String(state.overview);root!.dataset.riverView=String(riverView());
  fitMap();actual=renderer.render(state);
  if(actual?.ready&&state.layerClass&&!actual.legend.some(row=>row.id===state.layerClass)){state.layerClass='';actual=renderer.render(state);}
  root!.dataset.actualLayer=String(!!actual?.ready&&!actual.guide);root!.dataset.layerMode=actual?.guide?'guide':'distribution';map.setAttribute('role','group');
  for(const path of paths){path.setAttribute('fill','#f3f1e9');path.classList.remove('is-selected','is-compared','is-muted');path.style.pointerEvents='none';}
  for(const node of root!.querySelectorAll<HTMLButtonElement>('[data-field]'))node.setAttribute('aria-pressed',String(node.dataset.field===state.field));
  query('[data-africa-elevation-note]').hidden=state.topic!=='elevation';query('[data-africa-agri-map-controls]').hidden=state.field!=='agriculture';query<HTMLSelectElement>('[data-africa-agri-region]').value=state.region;
  query('[data-africa-agri-context]').hidden=!agri();query('[data-africa-agri-actions]').hidden=!agri()||state.overview;query('[data-africa-agri-overview]').hidden=!agri()||state.overview;
  const full=query<HTMLDetailsElement>('.africa-theme-full'),notes=query('[data-africa-agri-notes]');notes.hidden=!agri();if(agri())notes.append(full);else query('.africa-detail-scroll').append(full);
  full.querySelector('summary')!.textContent=agri()?'元の分布・加工方法・データと出典':'分布の詳しい読み方・出典';
  renderTopics();renderLegend();renderReading();
  for(const cards of root!.querySelectorAll<HTMLElement>('[data-reading-field]'))cards.hidden=cards.dataset.readingField!==state.field;
  const url=writeState(state,new URL(location.href));if(url.href!==location.href){if(push)history.pushState(null,'',url);else history.replaceState(null,'',url);}
  const overviewLink=query<HTMLAnchorElement>('[data-africa-overview-link]');
  const overviewURL=writeState({...state},new URL(withBase('/atlas/africa/overview/'),location.href));
  for(const flag of ['only','fallback']){const value=url.searchParams.get(flag);if(value==='0'||value==='1')overviewURL.searchParams.set(flag,value);}
  overviewLink.href=overviewURL.href;
  if(focus)root!.querySelector<HTMLElement|SVGElement>(`${focus.tag}[${focus.key}="${focus.value}"]`)?.focus({preventScroll:true});
 }
 function chooseAgri(key:string){
  if(!/^crop-(maize|rice|wheat|cassava)-harvested$|^livestock-(cattle|goats|sheep)$/.test(key))return;
  if(key.startsWith('crop-')){state.topic='farming';state.crop=key.split('-')[1] as Crop;}else{state.topic='livestock';state.livestock=key.slice(10) as Livestock;}
  state.overview=false;state.agriLayers=null;clearSelection();render(true);
 }
 const actionSelector='button[data-field],[data-reset],[data-zoom],[data-theme],[data-africa-topic],[data-africa-water],[data-africa-layer-class],[data-africa-layer-retry],[data-africa-river],[data-africa-basin],[data-africa-city],[data-africa-agri-pick],[data-africa-agri-only],[data-africa-agri-all],[data-africa-agri-overview],[data-africa-industry-overview],[data-africa-industry-theme],[data-africa-industry-location],[data-africa-selection-return]';
 function act(target:Element){
  const get=(key:string)=>target.getAttribute(key);
  if(target.hasAttribute('data-africa-layer-retry')){renderer.retry();return;}
  if(get('data-africa-agri-pick')){chooseAgri(get('data-africa-agri-pick')!);return;}
  if(target.hasAttribute('data-reset'))state=readState('');
  else if(get('data-field')){state=readState(`?field=${get('data-field')}`);}
  else if(get('data-africa-topic')){state.topic=get('data-africa-topic')!;state.overview=true;state.agriLayers=null;clearSelection();if(state.topic==='water')state.water='river';}
  else if(get('data-africa-water')){state.water=get('data-africa-water')!;clearSelection();}
  else if(get('data-africa-river')){const id=get('data-africa-river')!;if(!africaHydrologyRiverById(id))return;clearSelection();state.river=id;}
  else if(get('data-africa-basin')){const id=get('data-africa-basin')!;if(!africaHydrologyBasinById(id))return;clearSelection();state.basin=id;}
  else if(get('data-africa-city')){const id=get('data-africa-city')!;if(!africaClimateCityById(id))return;clearSelection();state.city=id;}
  else if(get('data-africa-industry-location')){const id=get('data-africa-industry-location')!;if(!africaIndustryLocationById(id))return;clearSelection();state.industryLocation=id;state.overview=false;}
  else if(get('data-africa-layer-class')){state.layerClass=state.layerClass===get('data-africa-layer-class')?'':get('data-africa-layer-class')!;state.layerPoint='';}
  else if(target.hasAttribute('data-africa-agri-only'))state.agriLayers=africaAgriFocusedLayer(state);
  else if(target.hasAttribute('data-africa-agri-all'))state.agriLayers=null;
  else if(target.hasAttribute('data-africa-agri-overview')){state.overview=true;state.topic='farming';state.agriLayers=null;clearSelection();}
  else if(target.hasAttribute('data-africa-industry-overview')||target.hasAttribute('data-africa-selection-return')){clearSelection();state.overview=true;}
  else if(get('data-theme')||get('data-africa-industry-theme')){const id=get('data-theme')??get('data-africa-industry-theme')!;if(!themes.some(row=>row.field===state.field&&row.id===id))return;state.theme=id;state.overview=false;clearSelection();}
  else if(target.hasAttribute('data-zoom')){state.region='all';}
  else return;
  render(true);
 }
 root.addEventListener('click',event=>{const target=(event.target as Element).closest(actionSelector);if(target)act(target);});
 root.addEventListener('keydown',event=>{
  if(event.defaultPrevented)return;const target=event.target as Element,tab=target.closest<HTMLButtonElement>('[role="tab"]');
  if(tab&&['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){const tabs=[...tab.closest('[role="tablist"]')!.querySelectorAll<HTMLButtonElement>('[role="tab"]')],index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;event.preventDefault();tabs[next].focus({preventScroll:true});act(tabs[next]);return;}
  const action=target.closest<SVGElement>(actionSelector);if(action?.namespaceURI==='http://www.w3.org/2000/svg'&&['Enter',' '].includes(event.key)){event.preventDefault();act(action);}
 });
 query<HTMLSelectElement>('[data-africa-agri-region]').addEventListener('change',event=>{const region=(event.target as HTMLSelectElement).value;if(Object.hasOwn(regionNames,region)){state.region=region as Region;render(true);}});
 query<HTMLSelectElement>('[data-africa-layer-category]').addEventListener('change',event=>{state.layerClass=(event.target as HTMLSelectElement).value;state.layerPoint='';render(true);});
 map.addEventListener('click',event=>{
  if(!actual?.ready||actual.guide||riverView()||basinView()||(event.target as Element).closest(actionSelector))return;
  const box=map.getBoundingClientRect();if(!box.width||!box.height)return;const view=map.getAttribute('viewBox')!.split(' ').map(Number),scale=Math.min(box.width/view[2],box.height/view[3]),offsetX=(box.width-view[2]*scale)/2,offsetY=(box.height-view[3]*scale)/2,x=view[0]+(event.clientX-box.left-offsetX)/scale,y=view[1]+(event.clientY-box.top-offsetY)/scale,lon=x/africaWidth*91-27,lat=39-y/africaHeight*75;if(lon<-27||lon>64||lat<-36||lat>39)return;state.layerPoint=`${lon.toFixed(4)},${lat.toFixed(4)}`;render(true);
 });
 window.addEventListener('popstate',()=>{state=readState(location.search);render();});window.addEventListener('resize',()=>render());render();
}
