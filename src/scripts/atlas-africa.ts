import {countries,fields,metrics,regionNames,years,readState,writeState,africaComparisonSnapshot,canonicalTopic,canonicalWater,canonicalAgriLayers,africaAgriVisibleLayers,metricById,valueAt,formatValue,fillFor,rankedCountries,palette,sources,defaultYear,defaultThemeRegion,cropChoices,livestockChoices,cropMeasureChoices,type Field,type Region,type Metric,type Crop,type Livestock,type CropMeasure} from '../data/atlas/africa-atlas.ts';
import {projectAfrica,africaWidth,africaHeight} from '../lib/atlas-africa-geometry.ts';
import {themes,type AfricaTheme} from '../data/atlas/africa-themes.ts';
import {africaForestryReading} from '../data/atlas/africa-forestry-reading.ts';
import {africaAgricultureReading} from '../data/atlas/africa-agriculture-reading.ts';
import {africaCultureGuideSources} from '../data/atlas/africa-culture-guide.ts';
import {createAfricaLayerRenderer,africaActualLayerKey,africaCommodityColor,type AfricaLayerView} from './atlas-africa-layers.ts';

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
 let actual: AfricaLayerView|null=null;
 const layerRenderer=createAfricaLayerRenderer(root,()=>{if(typeof document!=='undefined'&&document===root.ownerDocument)render();});
 let countryPinned=false,regionPinned=false;
 const topicItems={
  agriculture:[['farming','作物',false],['livestock','畜産',false],['forestry','林業',false]],
  nature:[['climate','気候区分',true],['water','水資源',false],['terrain','地形',true],['elevation','標高',true]],
  industry:[['regional','地域の主要産業',false]],
  population:[['distribution','人口分布',false],['ethnicity','人種・民族',true],['religion','宗教',true]]
 } as const;
  function renderTopics(){
  const items=topicItems[state.field];
  const topic=state.topic;
  const focused=root!.ownerDocument.activeElement,focusLayer=focused?.getAttribute('data-africa-agri-layer'),focusOutline=focused?.hasAttribute('data-africa-agri-outline');
  const nav=query<HTMLElement>('[data-africa-subfields]');nav.replaceChildren();
  nav.setAttribute('aria-label',state.field==='industry'?'収録済みの主要産業を選ぶ':'分野内の項目');
  root!.querySelectorAll('.africa-main>.africa-subitems').forEach(row=>row.remove());
  query<HTMLElement>('.africa-main').insertBefore(nav,query<HTMLElement>('.africa-workspace'));
  if(state.field==='industry'){
   const labels:Record<string,string>={'copperbelt-connections':'銅鉱業','casablanca-manufacturing':'カサブランカの製造業'};
   for(const theme of themes.filter(t=>t.field==='industry')){const button=make('button',labels[theme.id]??theme.title) as HTMLButtonElement;button.type='button';button.dataset.theme=theme.id;button.title=theme.title;button.setAttribute('aria-pressed',String(state.theme===theme.id));nav.append(button);}
  }else for(const [id,label] of items){const button=make('button',label) as HTMLButtonElement;button.type='button';button.dataset.africaTopic=id;button.setAttribute('aria-pressed',String(topic===id));nav.append(button);}
  if(state.field==='agriculture'&&topic!=='forestry'&&state.view==='distribution'){
   const host=make('div');host.className='africa-agri-layer-controls';host.setAttribute('role','group');host.setAttribute('aria-label','表示する品目');const visible:string[]=africaAgriVisibleLayers(state);
   for(const [title,choices,crop] of [['作物',cropChoices,true],['畜産',livestockChoices,false]] as const){const group=make('fieldset');group.className='africa-agri-layer-group';const legend=make('legend',title);legend.hidden=true;group.append(legend,make('strong',title));for(const row of choices){const key=crop?`crop-${row.id}-${state.cropMeasure}`:`livestock-${row.id}`,label=make('label');label.className='africa-agri-layer-toggle';label.style.setProperty('--africa-layer-color',africaCommodityColor(key));const input=make('input') as HTMLInputElement;input.type='checkbox';input.checked=crop?visible.some(value=>value.startsWith(`crop-${row.id}-`)):visible.includes(key);input.dataset.africaAgriLayer=key;const swatch=make('i');swatch.setAttribute('aria-hidden','true');label.append(input,swatch,make('span',row.label));group.append(label);}host.append(group);}
   const label=make('label');label.className='africa-agri-layer-toggle';const input=make('input') as HTMLInputElement;input.type='checkbox';input.checked=state.agriOutline;input.dataset.africaAgriOutline='';label.append(input,make('span','選択品目の輪郭'));host.append(label);nav.append(host);if(focusLayer||focusOutline)host.querySelector<HTMLInputElement>(focusOutline?'[data-africa-agri-outline]':`[data-africa-agri-layer="${focusLayer}"]`)?.focus({preventScroll:true});
  }
  if(state.field==='industry'||state.field==='population'){
   nav.setAttribute('aria-label',state.field==='industry'?'実例の主要産業を選ぶ':'人口分布・掲載集団の事例を選ぶ');
  }
  if(state.field==='nature'&&topic==='water'){
   const row=make('div');row.className='africa-subitems';row.setAttribute('role','group');row.setAttribute('aria-label','水資源の項目');
    for(const [id,label] of [['river','河川・地下水'],['rain','降水量'],['basin','河川の流域']] as const){const button=make('button',label) as HTMLButtonElement;button.type='button';button.dataset.africaWater=id;button.setAttribute('aria-pressed',String(id===state.water));row.append(button);}nav.after(row);
  }
  const commodities=query<HTMLElement>('[data-africa-commodities]');commodities.replaceChildren();commodities.hidden=state.field!=='agriculture'||topic==='forestry';
  if(!commodities.hidden){
   const crop=topic==='farming',choices=crop?cropChoices:livestockChoices,selected=crop?state.crop:state.livestock;
   commodities.setAttribute('aria-label',crop?'作物と表示する数量を選ぶ':'家畜を選ぶ');
   const products=make('div');products.className='africa-commodity-products';products.setAttribute('role','group');products.setAttribute('aria-label',crop?'読み解く作物':'読み解く家畜');
   for(const row of choices){const button=make('button',row.label) as HTMLButtonElement;button.type='button';button.dataset.africaCommodity=row.id;button.setAttribute('aria-pressed',String(row.id===selected));products.append(button);}commodities.append(products);
   if(crop){const measures=make('div');measures.className='africa-commodity-measures';measures.setAttribute('role','group');measures.setAttribute('aria-label','作物の数量');for(const row of cropMeasureChoices){const button=make('button',row.label) as HTMLButtonElement;button.type='button';button.dataset.africaCropMeasure=row.id;button.setAttribute('aria-pressed',String(row.id===state.cropMeasure));measures.append(button);}commodities.append(measures);}
  }
  const status=query<HTMLElement>('[data-africa-subfield-status]');status.hidden=!actual||actual.ready&&!actual.error;status.textContent=actual?.error?`${actual.title}：分布データを取得できませんでした。再読込できます。`:actual?`${actual.title}の分布データを読み込んでいます。国別統計は参考として残しています。`:'';
 }
 function readSelectionPins(){const p=new URLSearchParams(location.search);countryPinned=countries.some(c=>c.code===p.get('place'));regionPinned=Object.hasOwn(regionNames,p.get('region')??'');}
 readSelectionPins();
 function chooseTheme(id:string){
  const theme=themes.find(t=>t.id===id)!;state.theme=id;state.context='';state.zoom=state.field==='nature'&&state.topic==='climate'||(state.field==='population'||state.field==='agriculture')&&state.view==='distribution'?'all':'theme';
  state.sourceState='';state.layerClass='';state.layerPoint='';
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
  const forest=state.field==='agriculture'&&state.topic==='forestry';
  const container=query<SVGGElement>('[data-theme-marks]');container.replaceChildren();
  const view=map.getAttribute('viewBox')!.split(' ').map(Number);
   const box=map.getBoundingClientRect();
   root!.style.setProperty('--africa-map-top',`${box.top+window.scrollY}px`);
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
  if(forest){text('[data-theme-title]',africaForestryReading.title);text('[data-theme-takeaway]',africaForestryReading.takeaway);text('[data-theme-takeaway-detail]',state.context?africaForestryReading.compareText:africaForestryReading.reading);text('[data-theme-caveat]',africaForestryReading.definition);source.href=africaForestryReading.source;source.textContent=africaForestryReading.sourceLabel;compare.textContent='森林割合で国を比べる';back.textContent=`← 林業の解説へ戻る：${countries.find(c=>c.code===state.place)?.name}`;}
  map.dataset.theme=theme.id;map.dataset.context=state.context;
 }
 function renderActualReading(){
  root!.querySelector('[data-africa-culture-source]')?.remove();
  const keys=query<HTMLElement>('[data-africa-actual-key]'),selection=query<HTMLElement>('[data-africa-layer-selection]');
  keys.hidden=!actual?.ready||!!actual.guide;selection.hidden=!actual||!!actual.guide;query<HTMLElement>('[data-africa-statistics-key]').hidden=!!actual?.ready&&!state.context;
  const retry=query<HTMLButtonElement>('[data-africa-layer-retry]');retry.hidden=!actual?.error;
  if(!actual)return;
  const agriculture=state.field==='agriculture'&&(state.topic==='farming'||state.topic==='livestock')?africaAgricultureReading(state):null;
  const takeaways:Record<string,string>={climate:'湿潤な赤道付近、サハラの乾燥帯、高地や南北端の違いを気候区分で読みます。作物や暮らしには、水の管理・技術・交通・市場も関わります。',terrain:'標高の区分と等高線から、高地と低地の起伏を読みます。地質や地形の成因を分類した地図ではありません。',elevation:'高地と低地の位置を標高で比べます。国平均には表れない起伏と、農地・交通・水の利用条件を考える入口です。',ethnicity:'原資料に掲載された集団の居住範囲を読みます。民族は人口密度や国籍と別の情報で、掲載範囲だけから全住民の構成は分かりません。',religion:'掲載された集団の宗教的特徴を居住範囲と合わせて読みます。地域住民全体の信仰割合や、一人ひとりの信仰を示す地図ではありません。',distribution:'人口の格子分布から、国平均に隠れる居住の集中を読みます。水・農地に加え、住宅・交通・仕事・公共サービスの条件も考えます。','water-basin':'流域は、雨水が同じ川へ集まる範囲です。国境と異なる境界を読み、上流・下流の水利用と管理の関係を考えます。','water-river':'実際の河川の位置を読みます。下の国別淡水統計は国内で生まれる河川水と地下水の合計で、川の流量や帯水層の範囲ではありません。'};
  text('[data-theme-title]',actual.title);text('[data-theme-takeaway]',actual.ready?(actual.takeaway||takeaways[actual.key]||actual.scope):actual.error?'分布の取得に失敗しました。再読込できます。':'分布データを読み込んでいます。');
  text('[data-theme-takeaway-detail]',state.context?`${actual.title}の元分布を残し、${metricById(state.context).label}を国別の数値と色付きの記号で比べます。空間分布と国全体の集計は異なる母集団です。`:actual.description||takeaways[actual.key]||actual.scope);
  text('[data-theme-caveat]',actual.scope);text('[data-africa-layer-caption]',`${actual.title} · ${actual.period} · ${actual.unit}`);text('[data-africa-layer-scope]',actual.scope);
  const source=query<HTMLAnchorElement>('[data-theme-source]');source.hidden=!actual.sourceUrl;if(actual.sourceUrl){source.href=actual.sourceUrl;source.textContent=actual.sourceLabel;}
  query<HTMLElement>('[data-theme-details]').replaceChildren(make('p',actual.method));
  if(agriculture){
   text('[data-theme-title]',agriculture.title);text('[data-theme-takeaway]',actual.ready?state.context?agriculture.compareTakeaway:agriculture.takeaway:actual.error?'分布の取得に失敗しました。再読込できます。':'2020年のモデル分布を読み込んでいます。');
   text('[data-theme-takeaway-detail]',state.context?agriculture.compareText:agriculture.reading);text('[data-theme-caveat]',agriculture.scope);
   text('[data-africa-layer-scope]','モデル推計。0は値のある格子、値なしは0と区別します。');
   if(!actual.sourceUrl){source.hidden=false;source.href=agriculture.source;source.textContent=agriculture.sourceLabel;}
   query<HTMLElement>('[data-theme-details]').append(make('p',agriculture.scope),make('p',state.context?agriculture.reading:agriculture.compareText));
  }
  if(actual.guide){query<HTMLElement>('.africa-kicker').textContent=`選択国：${countries.find(c=>c.code===state.place)?.name} · 資料案内（分布は未配信）`;const additional=africaCultureGuideSources.find(row=>row.url!==actual.sourceUrl)!;const link=make('a',additional.label) as HTMLAnchorElement;link.href=additional.url;link.className='africa-theme-source';link.dataset.africaCultureSource='';source.after(link);const compare=query<HTMLButtonElement>('[data-theme-comparison]');compare.hidden=true;compare.disabled=true;query<HTMLElement>('[data-theme-return]').hidden=true;text('[data-metric-title]',actual.title);text('[data-period]',actual.period);text('[data-unit]',actual.unit);text('#africa-svg-title',`${actual.title}・国境の参照図`);return;}
  const legend=query<HTMLElement>('[data-africa-layer-legend]');legend.replaceChildren();
  const picker=query<HTMLSelectElement>('[data-africa-layer-category]');picker.replaceChildren();const all=make('option','全ての区分') as HTMLOptionElement;all.value='';picker.append(all);
  const climateShort:Record<string,string>={Af:'雨林',Am:'モンスーン',Aw:'サバナ',BWh:'高温砂漠',BWk:'低温砂漠',BSh:'高温ステップ',BSk:'低温ステップ',Csa:'夏乾燥・高温夏',Csb:'夏乾燥・温暖夏',Cwa:'冬乾燥・高温夏',Cwb:'冬乾燥・温暖夏',Cfa:'温暖湿潤',Cfb:'西岸海洋性',Dsb:'冷帯・夏乾燥',Dwb:'冷帯・冬乾燥',ET:'ツンドラ',EF:'氷雪'};
  for(const row of actual.legend){const fullLabel=`${row.code?row.code+' ':''}${row.label}`,short=row.code&&climateShort[row.code]?`${row.code} ${climateShort[row.code]}`:fullLabel;const item=make('button',short) as HTMLButtonElement;item.type='button';item.title=`${fullLabel}${row.description?'：'+row.description:''}`;item.setAttribute('aria-label',fullLabel);item.dataset.africaLayerClass=row.id;item.setAttribute('aria-pressed',String(state.layerClass===row.id));const swatch=make('i');swatch.style.background=row.color;item.prepend(swatch);legend.append(item);const option=make('option',fullLabel) as HTMLOptionElement;option.value=row.id;picker.append(option);}
  const missing=make('span',agriculture?'値なし（0とは断定しません）':'未収録（不在を意味しません）');missing.className='africa-layer-unlisted';legend.append(missing);
  picker.value=actual.legend.some(row=>row.id===state.layerClass)?state.layerClass:'';
  const compare=query<HTMLButtonElement>('[data-theme-comparison]');compare.disabled=!actual.ready;compare.textContent=agriculture?.compareLabel??`${metricById(state.metric).label}と比べる`;
  const returnPlace=state.sourceState?readState('?'+state.sourceState).place:state.place;
  query<HTMLElement>('[data-theme-return]').textContent=`← ${actual.title}へ戻る：${countries.find(c=>c.code===returnPlace)?.name}`;
  if(actual.ready){text('[data-metric-title]',actual.title);text('[data-period]',actual.period);text('[data-unit]',actual.unit);text('#africa-svg-title',`${actual.title}・${actual.period}`);text('[data-map-caption]',actual.scope);}
  const selected=actual.legend.find(row=>row.id===state.layerClass),point=state.layerPoint.split(',').map(Number);text('[data-africa-point-reading]',state.layerPoint?layerRenderer.inspect(point[0],point[1]):selected?`${selected.code??''} ${selected.label}：${selected.description||'選択した分類の分布を表示しています。'}`:'地図の地点を押すと、表示格子の値を確認できます。');
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
  state.water=state.field==='nature'?canonicalWater(state.metric,state.water):'';
  root!.dataset.field=state.field;
  actual=layerRenderer.render(state);
  if(actual?.guide){state.context='';state.layerClass='';state.layerPoint='';state.sourceState='';}
  if(actual?.ready&&state.layerClass&&!actual.legend.some(row=>row.id===state.layerClass)){state.layerClass='';actual=layerRenderer.render(state);}
  root!.dataset.actualLayer=actual?.ready&&!actual.guide?'true':'false';root!.dataset.layerMode=actual?.guide?'guide':actual?.ready?'distribution':'statistics';
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
  text('[data-year-note]',state.field==='agriculture'&&actual?'分布図は2020年固定。統計年は国全体の参考値だけを切り替えます。':metric.timeless?'長期平均のため年による切替はありません':'国平均・選択年の値。未収録年は欠測表示。');
  query<HTMLSelectElement>('[data-region]').value=state.region;query<HTMLSelectElement>('[data-place]').value=state.place;query<HTMLSelectElement>('[data-compare]').value=state.compare;
  for(const option of query<HTMLSelectElement>('[data-compare]').options)option.disabled=option.value===state.place;
  text('[data-field-title]',fields[state.field].title);text('[data-field-summary]',fields[state.field].summary);
   text('[data-period]',period);text('[data-metric-title]',metric.label);text('[data-unit]',metric.unit);text('#africa-svg-title',`${metric.label}・${period}`);
   text('[data-essential-metric]',`${metric.label} · ${period} · ${metric.unit}${metric.symbols?'（円の面積）':''}`);
   text('[data-essential-boundary]',`${metric.symbols?'円は国人口。':'色は国全体。'}国境：細線／選択：赤枠／比較：青破線／白丸：島の選択用。`);
  for(const path of paths){const code=path.dataset.countryPath!;const c=countries.find(c=>c.code===code)!;const v=valueAt(metric.id,code,state.year);path.setAttribute('fill',actual?.ready?'#f3f1e9':fillFor(v,metric));path.classList.toggle('is-selected',code===state.place);path.classList.toggle('is-compared',code===state.compare);path.classList.toggle('is-muted',!actual?.ready&&state.zoom!=='theme'&&state.region!=='all'&&c.region!==state.region&&code!==state.place&&code!==state.compare);path.querySelector('title')!.textContent=actual?.guide?`${c.name}：国境の参照図（民族・宗教の分布は未配信）`:`${c.name}：${formatValue(v,metric)}${v===null?'':` ${metric.unit}`}（${period}）`;}
  fitMap();
  const view=map.getAttribute('viewBox')!.split(' ').map(Number),box=map.getBoundingClientRect();
  const symbolScale=Math.max(view[2]/(box.width||640),view[3]/(box.height||528));
  const symbols=query<SVGGElement>('[data-symbols]');symbols.replaceChildren();
  if(metric.symbols&&!actual?.ready)for(const c of [...countries].sort((a,b)=>(valueAt(metric.id,b.code,state.year)??0)-(valueAt(metric.id,a.code,state.year)??0))){const v=valueAt(metric.id,c.code,state.year);if(v===null||v<=0)continue;if(state.zoom==='country'&&c.code!==state.place&&c.code!==state.compare)continue;const [x,y]=projectAfrica(c.point);const circle=svgEl('circle',{cx:x,cy:y,r:Math.sqrt(v/1e6)*2.2*symbolScale,class:'africa-symbol','data-country-marker':c.code,opacity:state.zoom!=='theme'&&state.region!=='all'&&c.region!==state.region&&c.code!==state.place&&c.code!==state.compare ? .25 : 1});circle.append(svgEl('title',{},`${c.name}：${formatValue(v,metric)}人`));symbols.append(circle);}
  for(const marker of root!.querySelectorAll<SVGGElement>('[data-island-marker]'))marker.style.display=metric.symbols?'none':'';
  for(const button of root!.querySelectorAll('[data-zoom]'))button.setAttribute('aria-pressed',String((button as HTMLElement).dataset.zoom===state.zoom));
  renderTheme(theme);
  renderActualReading();
  query<SVGGElement>('[data-theme-marks]').style.display=actual?.ready?'none':'';
  query<HTMLElement>('[data-theme-legend]').hidden=!!actual?.ready;
  const legend=query<HTMLElement>('[data-legend]');legend.replaceChildren();
   if(metric.symbols){const key=svgEl('svg',{viewBox:'0 0 310 48',width:310,height:48,role:'img','aria-label':'人口の円面積。100万人、1000万人、1億人の大きさ。'});[1e6,1e7,1e8].forEach((v,i)=>{const r=Math.sqrt(v/1e6)*2.2;key.append(svgEl('circle',{cx:[5,87,200][i],cy:24,r,fill:'#3c7968','fill-opacity':.6}));key.append(svgEl('text',{x:[13,99,225][i],y:29,'text-anchor':'start','font-size':14},`${v/1e4}万人`));});legend.append(key);}
  else palette.forEach((color,i)=>{const label=i===0?`${metric.breaks[0].toLocaleString()}未満`:i===4?`${metric.breaks[3].toLocaleString()}以上`:`${metric.breaks[i-1].toLocaleString()}〜${metric.breaks[i].toLocaleString()}未満`;const span=make('span');const swatch=make('i');swatch.style.background=color;span.append(swatch,document.createTextNode(label));legend.append(span);});
  const missing=make('span');const swatch=make('i');swatch.className='africa-no-data';missing.append(swatch,document.createTextNode('未収録'));legend.append(missing);
  text('[data-map-caption]',actual?.ready?actual.scope:metric.symbols?'円の面積は人口に比例。国を示す位置に置いており、都市人口や居住範囲ではありません。':'色は国平均・国全体の割合です。国内の分布・産地・都市の境界を表しません。島の白丸は選択用の目印です。');
  const ranked=rankedCountries({...state,metric:metric.id});const count=ranked.filter(c=>c.value!==null).length;
  text('[data-coverage]',`${regionNames[state.region]}：${ranked.length}の国・地域のうち${count}件を収録、${ranked.length-count}件は未収録。赤枠は選択国、青い破線は比較国。`);
  text('[data-selected-name]',country.name);text('[data-selected-region]',regionNames[country.region as Region]);text('[data-selected-value]',formatValue(valueAt(metric.id,country.code,state.year),metric));text('[data-selected-unit]',metric.unit);text('[data-selected-metric]',`${actual?.ready?'参考：国別統計 · ':''}${metric.label}`);
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
  renderComparisonOverlay(metric);
  if(write){const url=writeState(state,new URL(location.href));if(url.href!==location.href)history.pushState(null,'',url);}
  const overview=root!.querySelector<HTMLAnchorElement>('[data-africa-overview-link]');if(overview){const url=writeState({...state},new URL(overview.href));url.searchParams.delete('country');if(!countryPinned)url.searchParams.delete('place');const params=new URLSearchParams(location.search);for(const flag of ['only','fallback']){const value=params.get(flag);if(value==='0'||value==='1')url.searchParams.set(flag,value);else url.searchParams.delete(flag);}overview.href=url.href;}
 }
 function chooseCountry(code:string,preservePoint=false){if(!countries.some(c=>c.code===code))return;countryPinned=true;state.place=code;if(!preservePoint)state.layerPoint='';if(state.topic==='ethnicity')state.layerClass='';if(state.compare===code)state.compare='';if(state.region!=='all')state.region=countries.find(c=>c.code===code)!.region as Region;if(state.zoom==='theme'&&!themes.find(t=>t.id===state.theme)!.places.includes(code))state.zoom='all';render(true);}
 root.addEventListener('click',event=>{
  const target=(event.target as Element).closest<HTMLElement>('[data-field],[data-focus-country],[data-compare-country],[data-country-path],[data-country-marker],[data-zoom],[data-reset],button[data-theme],[data-theme-comparison],[data-theme-return],[data-africa-topic],[data-africa-water],[data-africa-commodity],[data-africa-crop-measure],[data-africa-layer-class],[data-africa-layer-retry]');if(!target)return;
  if(target.hasAttribute('data-africa-layer-class')){state.layerClass=state.layerClass===target.dataset.africaLayerClass?'':target.dataset.africaLayerClass!;state.layerPoint='';render(true);return;}
  if(target.hasAttribute('data-africa-layer-retry')){layerRenderer.retry();return;}
  if(target.dataset.africaTopic){state.topic=target.dataset.africaTopic;state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';if(state.zoom==='theme')state.zoom='all';if(state.topic==='forestry')state.metric='AG.LND.FRST.ZS';if(state.topic==='livestock')state.metric='NV.AGR.TOTL.ZS';if(state.topic==='farming')state.metric='AG.LND.ARBL.ZS';render(true);return;}
  if(target.dataset.africaCommodity){if(state.topic==='farming'&&cropChoices.some(row=>row.id===target.dataset.africaCommodity))state.crop=target.dataset.africaCommodity as Crop;else if(state.topic==='livestock'&&livestockChoices.some(row=>row.id===target.dataset.africaCommodity))state.livestock=target.dataset.africaCommodity as Livestock;else return;state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';render(true);return;}
  if(target.dataset.africaCropMeasure){if(!cropMeasureChoices.some(row=>row.id===target.dataset.africaCropMeasure))return;state.cropMeasure=target.dataset.africaCropMeasure as CropMeasure;if(state.agriLayers!==null)state.agriLayers=canonicalAgriLayers(africaAgriVisibleLayers(state).map(key=>key.startsWith('crop-')?key.replace(/-(harvested|production)$/,`-${state.cropMeasure}`):key).join(','));state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';render(true);return;}
  if(target.dataset.africaWater){state.water=target.dataset.africaWater;state.context='';state.sourceState='';state.layerClass='';state.layerPoint='';state.view='distribution';if(state.water!=='basin')state.metric=state.water==='river'?'ER.H2O.INTR.PC':'AG.LND.PRCP.MM';render(true);return;}
  if(target.hasAttribute('data-reset')){state=readState('');countryPinned=false;regionPinned=false;render(true);return;}
  if(target.dataset.field){if(target.dataset.field===state.field)return;state.field=target.dataset.field as Field;state.metric=metrics.find(m=>m.field===state.field)!.id;state.topic=state.field==='nature'?'climate':'';state.water='';state.view='distribution';chooseTheme(themes.find(t=>t.field===state.field)!.id);render(true);return;}
  if(target.dataset.theme){state.view='statistics';chooseTheme(target.dataset.theme);render(true);return;}
  if(target.hasAttribute('data-theme-comparison')){if(actual?.guide)return;state.sourceState=africaComparisonSnapshot(state);state.context=state.field==='agriculture'?state.topic==='forestry'?africaForestryReading.compareMetric:actual?.ready?africaAgricultureReading(state).compareMetric:themes.find(t=>t.id===state.theme)!.compareMetric:actual?.ready?state.metric:themes.find(t=>t.id===state.theme)!.compareMetric;render(true);return;}
  if(target.hasAttribute('data-theme-return')){state=state.sourceState?readState('?'+state.sourceState):{...state,context:'',sourceState:''};readSelectionPins();render(true);return;}
  if(target.dataset.zoom){state.zoom=target.dataset.zoom as typeof state.zoom;render(true);return;}
  if(target.dataset.compareCountry){state.compare=target.dataset.compareCountry===state.place?'':target.dataset.compareCountry;render(true);return;}
  chooseCountry(target.dataset.focusCountry??target.dataset.countryPath??target.dataset.countryMarker??'',!!actual?.ready&&!!target.closest('.africa-map'));
 });
 root.addEventListener('change',event=>{const input=event.target as HTMLInputElement;if(input.hasAttribute('data-africa-agri-layer')){const key=input.dataset.africaAgriLayer!,layers=new Set(africaAgriVisibleLayers(state));if(input.checked)layers.add(key);else for(const value of layers)if(value===key||key.startsWith('crop-')&&value.startsWith(key.replace(/-(harvested|production)$/,'-')))layers.delete(value);state.agriLayers=canonicalAgriLayers([...layers].join(','));render(true);}else if(input.hasAttribute('data-africa-agri-outline')){state.agriOutline=input.checked;render(true);}});
 query<HTMLButtonElement>('[data-latest]').addEventListener('click',()=>{state.year=defaultYear(state.context||state.metric);render(true);});
 query<HTMLSelectElement>('[data-metric]').addEventListener('change',event=>{state.metric=(event.target as HTMLSelectElement).value;state.context='';state.sourceState='';state.topic='';state.water='';state.view='statistics';render(true);});
 query<HTMLSelectElement>('[data-year]').addEventListener('change',event=>{state.year=Number((event.target as HTMLSelectElement).value);render(true);});
 query<HTMLSelectElement>('[data-region]').addEventListener('change',event=>{regionPinned=true;state.region=(event.target as HTMLSelectElement).value as Region;state.zoom=state.region==='all'?'all':'region';render(true);});
 query<HTMLSelectElement>('[data-place]').addEventListener('change',event=>chooseCountry((event.target as HTMLSelectElement).value));
 query<HTMLSelectElement>('[data-compare]').addEventListener('change',event=>{state.compare=(event.target as HTMLSelectElement).value;render(true);});
 query<HTMLSelectElement>('[data-africa-layer-category]').addEventListener('change',event=>{state.layerClass=(event.target as HTMLSelectElement).value;state.layerPoint='';render(true);});
 map.addEventListener('click',event=>{if(!actual?.ready||actual.guide)return;const box=map.getBoundingClientRect();if(!box.width||!box.height)return;const view=map.getAttribute('viewBox')!.split(' ').map(Number),scale=Math.min(box.width/view[2],box.height/view[3]),offsetX=(box.width-view[2]*scale)/2,offsetY=(box.height-view[3]*scale)/2;const x=view[0]+(event.clientX-box.left-offsetX)/scale,y=view[1]+(event.clientY-box.top-offsetY)/scale,lon=x/africaWidth*91-27,lat=39-y/africaHeight*75;if(lon<-27||lon>64||lat<-36||lat>39)return;state.layerPoint=`${lon.toFixed(4)},${lat.toFixed(4)}`;render(true);});
 window.addEventListener('popstate',()=>{state=readState(location.search);readSelectionPins();render();});
 window.addEventListener('resize',()=>render());
 render();
}
