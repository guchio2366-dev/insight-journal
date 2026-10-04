import {ASIA_SEASONAL_MONTHS,ASIA_SEASONAL_BREAKS,ASIA_SEASONAL_COLORS,normalizeAsiaSeasonalMonth,validateAsiaSeasonalManifest,decodeAsiaSeasonalGrid,readAsiaSeasonalSeries,type AsiaSeasonalManifest,type AsiaSeasonalGrid} from '../lib/atlas-asia-seasonal-precipitation';
import type {AsiaState,AsiaCamera,AsiaRegionId} from '../lib/atlas-asia-state';

type Config={regionId:AsiaRegionId;seasonalBase:string;seasonalManifest?:string};
const layerPrefix='asia-seasonal-precipitation';
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const value=document.createElement(tag);if(text!==undefined)value.textContent=text;return value;};
const number=(value:number)=>value.toLocaleString('ja-JP',{maximumFractionDigits:1});
const monthNumber=(value:string)=>Number(value.slice(2));
const coordinate=(point:[number,number])=>`${point[1].toFixed(3)}°N / ${point[0].toFixed(3)}°E`;

/** One atlas owns one instance. The geographic cube supplies all point values;
 * the image source owns the map. No city or station is used as a point fallback. */
export function createAsiaSeasonalPrecipitation(root:HTMLElement,config:Config,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null,onReady:()=>void){
  const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const panel=$('[data-seasonal-panel]'),input=$<HTMLSelectElement>('[data-seasonal-month]');
  const svg=root.querySelector<SVGSVGElement>('[data-seasonal-svg]')!;
  let manifest:AsiaSeasonalManifest|null=null,grid:AsiaSeasonalGrid|null=null,pending:Promise<void>|null=null,error:string|null=null;
  let map:import('maplibre-gl').Map|null=null,revision=0;
  let imageErrorId:string|null=null;
  const imageWaits=new Set<()=>void>();
  const failedImages=new WeakMap<import('maplibre-gl').Map,Set<string>>();
  const active=()=>getState().field==='natural'&&getState().topic==='seasonal-precipitation';
  const month=()=>normalizeAsiaSeasonalMonth(getState().detail);
  const asset=(file:string)=>config.seasonalBase+file;
  async function fetchFile<T>(url:string,read:(response:Response)=>Promise<T>):Promise<T>{
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
    try{const response=await fetch(url,{signal:abort.signal});if(!response.ok)throw Error(`HTTP ${response.status}`);return await read(response);}
    finally{clearTimeout(timer);}
  }
  function load(){
    if(grid)return Promise.resolve();
    if(pending)return pending;
    pending=(async()=>{
      if(!manifest)manifest=validateAsiaSeasonalManifest(await fetchFile(config.seasonalManifest??asset('manifest.json'),response=>response.json()));
      if(!active())return;
      const region=manifest.regions[config.regionId];
      if(!region)throw Error('region missing');
      grid=await decodeAsiaSeasonalGrid(new Uint8Array(await fetchFile(asset(region.values),response=>response.arrayBuffer())),region);
      error=null;
    })().catch((failure:unknown)=>{error=manifest?'月別の数値を読み込めませんでした。再読み込みしてください。':'月別降水量の資料を確認できませんでした。再読み込みしてください。';throw failure;}).finally(()=>{pending=null;});
    return pending;
  }
  function normalize(state:AsiaState):AsiaState{
    return state.field==='natural'&&state.topic==='seasonal-precipitation'?{...state,detail:normalizeAsiaSeasonalMonth(state.detail),city:null}:state;
  }
  function selectMonth(value:string){
    if(!active())return;
    navigate({...getState(),detail:normalizeAsiaSeasonalMonth(value),city:null,camera:camera()},false);
  }
  function svgNode(tag:string,attributes:Record<string,string|number>,text?:string){
    const value=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,item] of Object.entries(attributes))value.setAttribute(key,String(item));
    if(text!==undefined)value.textContent=text;svg.append(value);return value;
  }
  function chart(series:(number|null)[]|null,point:[number,number]|null,selected:number){
    // Fixed physical height and width-dependent geometry preserve 12 px labels.
    const width=Math.max(244,Math.round(svg.parentElement?.getBoundingClientRect().width||320));
    const left=43,right=width-9,top=22,bottom=110,barWidth=Math.min(17,(right-left)/12*.65);
    const values=series??Array<number|null>(12).fill(null),valid=values.filter((v):v is number=>v!==null);
    const peak=Math.max(0,...valid),step=peak<=100?25:peak<=200?50:peak<=400?100:peak<=800?200:Math.ceil(peak/400)*100;
    const ceiling=Math.max(step*4,Math.ceil(peak/step)*step),x=(i:number)=>left+(right-left)*(i+.5)/12,y=(v:number)=>bottom-v/ceiling*(bottom-top);
    svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} 148`);
    const title=point?`${coordinate(point)}の月別降水量`:'地点を選択すると月別降水量を表示';
    const reading=series?values.map((v,i)=>`${i+1}月 ${v===null?'データなし':number(v)+' mm'}`).join('、'):point?'この地点の格子にデータがありません。欠測は0 mmとは異なります。':'地図上の地点を選択してください。都市の観測所の値には置き換えません。';
    svgNode('title',{id:'asia-seasonal-chart-title'},title);
    svgNode('desc',{id:'asia-seasonal-chart-description'},`1991–2020年の月降水量平年値。縦軸はmm/月、横軸は1月から12月。${selected}月に枠を付けています。${reading}`);
    svgNode('text',{x:0,y:12},'mm/月');
    for(let i=0;i<=4;i++){
      const tick=ceiling*i/4,py=y(tick);
      svgNode('line',{x1:left,x2:right,y1:py,y2:py,class:'seasonal-grid'});
      svgNode('text',{x:left-5,y:py+4,'text-anchor':'end'},number(tick));
    }
    svgNode('line',{x1:left,x2:right,y1:bottom,y2:bottom,class:'seasonal-axis'});
    svgNode('line',{x1:left,x2:left,y1:top,y2:bottom,class:'seasonal-axis'});
    values.forEach((value,index)=>{
      if(value!==null){
        const bar=svgNode('rect',{x:x(index)-barWidth/2,y:y(value),width:barWidth,height:bottom-y(value),class:index+1===selected?'seasonal-bar-selected':'seasonal-bar','data-seasonal-bar':index+1});
        const tooltip=document.createElementNS('http://www.w3.org/2000/svg','title');tooltip.textContent=`${index+1}月：${number(value)} mm/月`;bar.append(tooltip);
        // A zero-value mark stays visible at the same zero baseline.
        if(value===0)svgNode('line',{x1:x(index)-barWidth/2,x2:x(index)+barWidth/2,y1:bottom,y2:bottom,stroke:index+1===selected?'#a74830':'#4c9abd','stroke-width':2,'data-seasonal-zero':index+1});
      }else svgNode('text',{x:x(index),y:bottom-5,'text-anchor':'middle','data-seasonal-missing':index+1},'×');
      svgNode('text',{x:x(index),y:129,'text-anchor':'middle',class:index+1===selected?'seasonal-selected-label':''},String(index+1));
    });
    svgNode('text',{x:(left+right)/2,y:145,'text-anchor':'middle'},'月');
  }
  function legend(selected:number){
    $('[data-seasonal-legend-month]').textContent=`${selected}月`;
    const scale=$('[data-seasonal-scale]');
    if(scale.childElementCount)return;
    ASIA_SEASONAL_COLORS.forEach((color,index)=>{
      const span=node('span'),swatch=node('i');swatch.style.backgroundColor=color;swatch.setAttribute('aria-hidden','true');
      const label=index===0?`0–${ASIA_SEASONAL_BREAKS[0]}未満`:index===ASIA_SEASONAL_COLORS.length-1?`${ASIA_SEASONAL_BREAKS[index-1]}以上`:`${ASIA_SEASONAL_BREAKS[index-1]}–${ASIA_SEASONAL_BREAKS[index]}未満`;
      span.append(swatch,document.createTextNode(label));scale.append(span);
    });
  }
  function source(){
    if(!manifest)return;
    const source=manifest.source,content=$('[data-seasonal-method]');content.replaceChildren();
    const paragraph=(text:string)=>content.append(node('p',text));
    paragraph(`${source.dataset}。${source.publisher}。期間：${manifest.period}年。単位：${manifest.unit}。`);
    paragraph(source.sourceMethod);
    paragraph('選択した経緯度を含む元の0.25°格子から12か月の平年値を読みます。南北方向の格子の距離はほぼ一定ですが、東西方向の距離は緯度で変わります。格子の細かさは観測精度を意味しません。');
    for(const limitation of manifest.limitations)paragraph(limitation);
    const sourceLink=node('a','GPCCの資料・定義');sourceLink.href=source.sourceUrl;content.append(sourceLink);
    const terms=node('p',`利用条件：${source.license}。${source.attribution} `),license=node('a','利用条件の原文');license.href=source.licenseUrl;terms.append(license);content.append(terms);
    const attribution=$('[data-seasonal-source]'),short=node('a','GPCC / DWD');short.href=source.sourceUrl;
    attribution.replaceChildren(document.createTextNode('出典：'),short,document.createTextNode(` · ${manifest.period} · ${source.license}`));
  }
  function render(){
    const enabled=active();panel.hidden=!enabled;if(!enabled){hide();return;}
    const state=getState(),id=month(),selected=monthNumber(id),point=state.point??null;
    if(imageErrorId&&imageErrorId!==`${layerPrefix}-${id}`){imageErrorId=null;error=null;}
    const series=point&&grid?readAsiaSeasonalSeries(grid,point[0],point[1]):null;
    input.value=id;
    const title=root.querySelector<HTMLElement>('[data-map-title]'),period=root.querySelector<HTMLElement>('[data-map-period]'),eyebrow=root.querySelector<HTMLElement>('[data-map-eyebrow]');
    if(title)title.textContent=`${selected}月の降水量`;
    if(period)period.textContent='mm/月 · 1991–2020年の平年値';
    if(eyebrow)eyebrow.textContent='GPCC · Seasonal precipitation';
    $('[data-seasonal-coordinate]').textContent=point?coordinate(point):'地図上の地点を選択';
    let reading=!point?'地図上の地点を選ぶと、その格子の12か月を読めます。':!grid?'選択地点の月別降水量を読み込んでいます。':!series?'この地点はデータなし、または対象範囲外です。0 mmとは区別します。':series[selected-1]===null?`${selected}月はデータなしです。0 mmとは区別します。`:`${selected}月：${number(series[selected-1]!)} mm/月`;
    if(series){const available=series.filter((v):v is number=>v!==null);if(available.length){const max=Math.max(...available),wet=series.flatMap((value,index)=>value===max?[index+1]:[]);reading+=`。${available.length<12?'収録された月で':''}雨が最も多い月：${wet.map(value=>value+'月').join('・')}（${number(max)} mm/月）。`;}}
    $('[data-seasonal-value]').textContent=reading;
    $('[data-seasonal-status]').textContent=error??(!grid?'月別降水量の資料を読み込んでいます。':'');
    $('[data-seasonal-retry]').hidden=!error;
    const shared=root.querySelector<HTMLElement>('[data-grid-reading]');if(shared)shared.textContent=point?`${coordinate(point)}：${reading}`:reading;
    $('[data-seasonal-cell]').textContent=point?`${coordinate(point)}を含む名目0.25°格子。地点は都市・観測所ではなく、地図で選んだ経緯度です。`:'地図上の地点を選択してください。都市・観測所は自動選択しません。';
    const table=$('[data-seasonal-table]');table.replaceChildren();
    for(let index=0;index<12;index++){const row=node('tr'),heading=node('th',`${index+1}月`),value=series?.[index]??null;heading.scope='row';if(index+1===selected)row.setAttribute('aria-current','true');row.append(heading,node('td',value===null?'データなし':number(value)));table.append(row);}
    chart(series,point,selected);legend(selected);source();
    if(!grid&&!pending&&!error)void load().then(()=>{if(active()){onReady();render();if(map)void show(map);}}).catch(()=>{if(active())render();});
  }
  function hide(){
    revision++;
    for(const cancel of imageWaits)cancel();
    hideLayers();
    panel.hidden=true;
  }
  function hideLayers(){
    if(!map)return;
    for(const item of ASIA_SEASONAL_MONTHS){const id=`${layerPrefix}-${item.id}`;if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');}
  }
  async function imageReady(currentMap:import('maplibre-gl').Map,id:string,seq:number){
    if(currentMap.isSourceLoaded(id))return;
    await new Promise<void>((resolve,reject)=>{
      const cancel=()=>{cleanup();resolve();};
      const cleanup=()=>{clearTimeout(timer);currentMap.off('sourcedata',changed);currentMap.off('error',failed);imageWaits.delete(cancel);};
      const changed=(event:import('maplibre-gl').MapSourceDataEvent)=>{
        if(seq!==revision||!active()||currentMap!==map){cleanup();resolve();return;}
        if(event.sourceId===id&&currentMap.isSourceLoaded(id)){cleanup();resolve();}
      };
      const failed=(event:import('maplibre-gl').ErrorEvent)=>{if((event as import('maplibre-gl').ErrorEvent&{sourceId?:string}).sourceId===id){cleanup();reject(Error('Monthly map image unavailable'));}};
      const timer=setTimeout(()=>{cleanup();reject(Error('Monthly map image timed out'));},20000);
      currentMap.on('sourcedata',changed);currentMap.on('error',failed);
      imageWaits.add(cancel);
      if(currentMap.isSourceLoaded(id)){cleanup();resolve();}
    });
  }
  async function show(currentMap:import('maplibre-gl').Map){
    for(const cancel of imageWaits)cancel();
    map=currentMap;const seq=++revision;
    if(!failedImages.has(currentMap)){
      const failures=new Set<string>();failedImages.set(currentMap,failures);
      // MapLibre reports a failed image source as loaded. Keep explicit failures
      // even when its waiting month was hidden or another month was selected.
      currentMap.on('error',event=>{const sourceId=(event as import('maplibre-gl').ErrorEvent&{sourceId?:string}).sourceId;if(sourceId?.startsWith(`${layerPrefix}-m-`))failures.add(sourceId);});
    }
    if(!active()){hide();return;}
    hideLayers();
    if(error)return;
    try{await load();}catch{if(active()&&map===currentMap)render();return;}
    if(seq!==revision||!active()||map!==currentMap||!manifest)return;
    const region=manifest.regions[config.regionId],selected=month(),id=`${layerPrefix}-${selected}`,image=region.months.find(item=>item.id===selected);
    if(!image)return;
    const imageUrl=asset(image.image),coordinates=region.imageCoordinates as [number,number][];
    if(failedImages.get(currentMap)!.has(id)){
      if(map.getLayer(id))map.removeLayer(id);
      if(map.getSource(id))map.removeSource(id);
      failedImages.get(currentMap)!.delete(id);
    }
    // Immutable monthly sources prevent one image response from overwriting a
    // newer month's texture. Only the selected, loaded source becomes visible.
    if(!map.getSource(id)){
      map.addSource(id,{type:'image',url:imageUrl,coordinates});
      const before=map.getLayer('asia-context')?'asia-context':map.getLayer('asia-country-border')?'asia-country-border':undefined;
      map.addLayer({id,type:'raster',source:id,layout:{visibility:'none'},paint:{'raster-opacity':.9,'raster-resampling':'nearest','raster-fade-duration':0}},before);
    }
    try{await imageReady(currentMap,id,seq);}catch{failedImages.get(currentMap)!.add(id);if(seq===revision&&active()&&map===currentMap){imageErrorId=id;error='月別の地図画像を読み込めませんでした。再読み込みしてください。';render();}return;}
    if(seq!==revision||!active()||map!==currentMap||month()!==selected)return;
    map.setLayoutProperty(id,'visibility','visible');
  }
  input.addEventListener('change',()=>selectMonth(input.value));
  $('[data-seasonal-previous]').addEventListener('click',()=>selectMonth(`m-${String((monthNumber(month())+10)%12+1).padStart(2,'0')}`));
  $('[data-seasonal-next]').addEventListener('click',()=>selectMonth(`m-${String(monthNumber(month())%12+1).padStart(2,'0')}`));
  $('[data-seasonal-retry]').addEventListener('click',()=>{if(!active())return;error=null;imageErrorId=null;render();if(map)void show(map);});
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-seasonal-related]'))button.addEventListener('click',()=>navigate({...getState(),topic:button.dataset.seasonalRelated,detail:null,city:null,camera:camera()},false));
  return {render,show,hide,normalize,active,selectMonth};
}
