import {isWaterTopic,waterDatasetTopic,normalizeWaterState,waterTopics,waterScenes,waterContains,precipitationBreaks,precipitationColors,basinColor,groundwaterClasses,type WaterRegion,type WaterDataset,type WaterTopic,type BasinRecord,type GroundwaterRecord} from '../data/atlas/asia-water';
import {contourBandLabels,type AsiaContourBands} from '../data/atlas/asia-contour-bands';
import {decodeAsiaNumericGrid,readAsiaNumericCell,type AsiaNumericGrid} from '../lib/atlas-asia-numeric-grid';
import type {AsiaState,AsiaCamera,AsiaRegionId} from '../lib/atlas-asia-state';
import {asiaWaterFocus} from '../data/atlas/asia-water-focus';
import {southCentralWaterSystems,southCentralWaterOverview,southCentralGroundwaterOverview} from '../data/atlas/asia-south-central-water-reading';
import {southCentralRainfallLegend} from '../data/atlas/asia-south-central-rainfall-legend';

type Config={regionId:AsiaRegionId;water:WaterRegion;waterBase:string;countries:{code:string;name:string}[];waterFeatures?:{id:string;name:string;label?:string;kind:string;countries:string[]}[];contourBands?:AsiaContourBands};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const option=(label:string,value:string)=>{const o=el('option',label);o.value=value;return o;};
const link=(label:string,url:string)=>{const a=el('a',label);a.href=url;return a;};
const fmt=(n:number)=>n.toLocaleString('ja-JP',{maximumFractionDigits:1});

export function createAsiaWater(root:HTMLElement,config:Config,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null,onReady:()=>void){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const topic=():WaterTopic|null=>getState().field==='natural'&&isWaterTopic(getState().topic)?waterDatasetTopic(getState().topic as WaterTopic|'water'):null;
 const datasets=new Map<WaterTopic,WaterDataset>(),pending=new Map<WaterTopic,Promise<void>>(),failed=new Set<WaterTopic>();
 let grid:AsiaNumericGrid|null=null,map:import('maplibre-gl').Map|null=null,revision=0;
 const river=()=>getState().topic==='water'?config.waterFeatures?.find(f=>f.id===getState().detail):undefined;
 const basinName=(b:BasinRecord)=>(asiaWaterFocus[config.regionId].find(f=>f.id===b.id)?.name??b.name.replace(/を含む集水域$/,''))+'を含む集水域';
 const names=(codes:string[])=>codes.map(code=>config.countries.find(c=>c.code===code)?.name??code).join('・');
 const scene=()=>waterScenes.find(s=>s.region===config.regionId&&s.id===getState().detail);
 async function bytes(file:string){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(config.waterBase+file,{signal:controller.signal});if(!r.ok)throw Error(String(r.status));return new Uint8Array(await r.arrayBuffer());}finally{clearTimeout(timer);}}
 function loaded(t:WaterTopic){return t==='precipitation'?!!grid:datasets.has(t);}
 function load(t:WaterTopic){
  if(loaded(t))return Promise.resolve();
  if(!pending.has(t))pending.set(t,(async()=>{
   const b=await bytes(t==='precipitation'?config.water.precipitation.grid:config.water[t]);
   if(t==='precipitation')grid=await decodeAsiaNumericGrid(b,config.water.precipitation,'int16',-32768);
   else{const decoded=b[0]===31&&b[1]===139?await new Response(new Blob([b as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(b);datasets.set(t,JSON.parse(decoded));}
   failed.delete(t);
  })().catch(e=>{failed.add(t);throw e;}).finally(()=>pending.delete(t)));
  return pending.get(t)!;
 }
 function detail(){
  const t=topic(),state=getState(),d=t?datasets.get(t):null;if(!d)return undefined;
  const direct=d.records.find(r=>r.id===state.detail&&(!state.place||r.countries.includes(state.place)));if(direct)return direct;
  const selectedRiver=river();if(selectedRiver?.kind==='rivers'){const known=asiaWaterFocus[config.regionId].find(f=>f.river===selectedRiver.id);const exact=known&&d.records.find(r=>r.id===known.id);if(exact)return exact;const matches=d.records.filter((r):r is BasinRecord=>'rivers' in r&&r.rivers.some(n=>n===selectedRiver.name||n===selectedRiver.label));if(matches.length===1)return matches[0];}
  if(!state.point)return undefined;
  const feature=d.geometry.features.find((f:any)=>waterContains(f.geometry,state.point!));
  return d.records.find(r=>r.id===feature?.properties.id&&(!state.place||r.countries.includes(state.place)));
 }
 function normalize(s:AsiaState){if(s.field==='natural'&&s.topic==='water'&&config.waterFeatures?.some(f=>f.id===s.detail&&(!s.place||f.countries.includes(s.place))))return {...s,city:null};return normalizeWaterState(config.regionId,s,isWaterTopic(s.topic)?datasets.get(waterDatasetTopic(s.topic)):undefined);}
 function select(id:string){
  const state=getState(),t=topic(),record=t?datasets.get(t)?.records.find(r=>r.id===id):null;
  if(!record){navigate({...state,detail:null,point:null,camera:camera()},false);return;}
  const place=state.place&&record.countries.includes(state.place)?state.place:record.countries.length===1?record.countries[0]:null;
  navigate({...state,detail:id,place,point:place?record.countryPoints[place]:record.point,city:null,camera:camera()},false);
 }
 function pickers(){
  const state=getState(),t=topic()!,s=$<HTMLSelectElement>('[data-hydrology-scene]');s.replaceChildren(option('地図上の地点を選ぶ',''));
  for(const r of waterScenes.filter(r=>r.region===config.regionId&&(!state.place||state.place===r.country)))s.append(option(r.name,r.id));s.value=scene()?.id??'';
  const input=$<HTMLSelectElement>('[data-hydrology-detail]');input.replaceChildren(option('選択を解除する',''));
  $('[data-hydrology-detail-label]').hidden=t==='precipitation';
  const records=(datasets.get(t)?.records??[]).filter(r=>!state.place||r.countries.includes(state.place)).sort((a,b)=>('areaKm2' in b?b.areaKm2:0)-('areaKm2' in a?a.areaKm2:0));
  const primary=t==='basins'?records.filter(r=>asiaWaterFocus[config.regionId].some(f=>f.id===r.id)):records;
  const shown=primary.slice(0,100),selected=detail();if(selected&&!shown.some(r=>r.id===selected.id))shown.unshift(selected);
  for(const r of shown)input.append(option(('name' in r?basinName(r):groundwaterClasses[r.class].type+'・涵養'+groundwaterClasses[r.class].recharge+' mm/年')+' · '+names(r.countries)+' · '+r.sourceId,r.id));
  input.value=selected?.id??'';
  $('[data-hydrology-detail-label]').hidden=t!=='basins';
  $('[data-hydrology-picker-note]').hidden=true;
  $('[data-hydrology-picker-note]').textContent=t==='precipitation'||!datasets.has(t)?'':`選んだ国・地域に交わる${records.length}区域を収録しています。一覧には${Math.min(100,records.length)}区域${shown.length>100?'と現在の選択':''}を示し、地図では全区域を選べます。${t==='basins'?'一覧は流域面積の大きい順です。':''}`;
 }
 function legend(t:WaterTopic){
  const content=$('[data-hydrology-scale]');content.replaceChildren();$('[data-hydrology-legend-title]').textContent=waterTopics[t].title;
  const swatch=(color:string,label:string)=>{const s=el('span'),i=el('i');i.style.backgroundColor=color;s.append(i,document.createTextNode(label));content.append(s);};
  if(t==='precipitation'){if(config.contourBands)for(const band of config.regionId==='south-central-asia'?southCentralRainfallLegend(config.contourBands):contourBandLabels(config.contourBands))swatch(band.color,band.label);swatch('#347d9c','等雨量線：250mm/年間隔（数字は500mmごと）');$('[data-hydrology-legend-note]').textContent='1981–2010年の推計平年値。同じ年間降水量の地点を青い線で結びます。海・欠測の範囲は線をつなぎません。'+(config.contourBands?(config.regionId==='south-central-asia'?' 色は0～3,000mmの違いを細かく示し、それより多い範囲は色をまとめています。線と面の区切りは250mm間隔、地点の数値は平滑化前の原格子値で、上限に切り詰めていません。':' 色帯も250mmごとで、線と同じ平滑化した表示値から作っています。地点の数値は平滑化前の原格子値です。'):'');}
  else if(t==='basins'){swatch('#176c94','青い線・面：河川・湖');swatch('#b5ced9','主な河川の流域');swatch('#ac432f','赤い輪郭：選択した流域');$('[data-hydrology-legend-note]').textContent='色は水量や面積の大小を表しません。主要な水系を表示し、小さな沿岸区分は省いています。国境を越える流域は輪郭でつなぎ、対象国の範囲を塗っています。主な河川のボタンは代表する出口の集水域を選びます。デルタで出口が異なる枝流などは別の区域です。';}
  else{swatch('#a9d2da','主要な地下水盆地');swatch('#176c94','河川');$('[data-hydrology-legend-note]').textContent='主要な地下水盆地の広がりを示します。白地にも局地的な帯水層は存在し得ます。色は地下水の量や安全に取水できる量を表しません。';}
 }
 function method(t:WaterTopic){
  const c=$('[data-hydrology-method]');c.replaceChildren(el('p',waterTopics[t].period+'。'+waterTopics[t].definition),link('地図データの提供元を開く',waterTopics[t].source));
  if(t==='precipitation'&&config.contourBands)c.append(el('p','この自然環境図の線と色帯は、同じ原格子を同じ半径でならした値から250mmごとに補間しています。短い線を省かず、線と面を別々に簡略化しません。以下の短い線の省略・簡略化は、従来の重ね合わせ用等雨量線の生成方法です。地点の数値は平滑化前の原格子値を保持しています。'));
  if(t==='precipitation')c.append(el('p','等雨量線は表示格子の値を投影座標上の半径約12kmでならして作っています。80km未満の短い線を省き、最大6kmの許容差で簡略化しています。地表での距離は緯度により異なります。地点の数値は線から読み取るのではなく、元の表示格子の値を使います。'),el('p','CHELSA BIO12 v2.1（CC0 1.0）。気候モデル・再解析を地形などで細かくした約1km格子です。表示格子へ平均化した後に整数mmに丸め、色と選択値を同じ格子から作っています。約4kmは投影座標上の間隔で、地表の距離や測定精度ではありません。海岸や小島では原資料・表示格子に欠ける部分があります。'));
  if(t==='basins')c.append(el('p','BasinATLAS v1.0（CC BY 4.0）のレベル6小流域を、実際につながる出口（NEXT_SINK）ごとに結合しました。面積は原資料の小流域面積を合計しており、国ごとの面積ではありません。塗りは対象国の陸地、輪郭は表示範囲で切り出していますが、数値は表示外を含む集水域全体です。名称はNatural Earthの河川との重なりを使った補助表示で、元資料の公式流域名ではありません。'),el('p','出口の流量はWaterGAP 2.2（2014年版）による1971–2000年の自然化推計です。人による取水・貯水施設などの影響を除いたモデル値で、現在の流量ではありません。最少・最多月は長期平均した12か月のうちの月で、洪水時の最大流量ではありません。原モデルは0.5度格子で、細かい流域形状ほどの精度はありません。'),link('属性の定義・出典（HydroATLAS）','https://data.hydrosheds.org/file/technical-documentation/BasinATLAS_Catalog_v10.pdf'));
  if(t==='groundwater')c.append(el('p','Datenquelle: WHYMAP, (C) BGR Hannover & UNESCO Paris。2008年の世界図（縮尺1:25,000,000）の提供サービスを2026年に取得しました。地質・涵養の区分を維持して陸地で切り出し、表示のため輪郭を簡略化しています。拡大しても地域の井戸や水質を調べる精度にはなりません。区域の境界と海岸線の間に資料の違いによる空白があります。'));
 }
 function render(){
  const t=topic(),active=!!t;$('[data-hydrology-panel]').hidden=!active;$('[data-hydrology-legend]').hidden=!active;if(!t)return;
  const state=getState(),meta=waterTopics[t],selectedScene=scene(),record=detail(),ready=loaded(t),status=failed.has(t)?'この主題の数値を取得できませんでした。再読み込みをお試しください。':!ready&&(t!=='precipitation'||state.point)?'選んだ主題の資料を読み込んでいます。':'';
  const shortcuts=root.querySelector<HTMLElement>('[data-basin-shortcuts]');
  if(shortcuts){shortcuts.hidden=t!=='basins';shortcuts.replaceChildren();if(t==='basins')for(const item of asiaWaterFocus[config.regionId]){const b=el('button',item.name);b.type='button';b.dataset.basinShortcut=item.id;b.disabled=!datasets.get(t)?.records.some(r=>r.id===item.id);b.setAttribute('aria-pressed',String(record?.id===item.id));b.onclick=()=>select(item.id);shortcuts.append(b);}}
  $('[data-map-title]').textContent=meta.title;$('[data-map-eyebrow]').textContent='Water · '+meta.period;$('[data-map-period]').textContent=meta.unit;
  $('[data-hydrology-title]').textContent=getState().topic==='water'?'河川と、地下水を蓄える主な地域':meta.title;$('[data-hydrology-definition]').textContent=meta.definition;
  $('[data-map-gesture]').textContent=t==='precipitation'?'地点を選ぶと年降水量を読めます。国の背景クリックでは選択を変えません。地図は2本指で移動・拡大できます。':'流域・地下水の区域や河川そのもの、または区域の一覧から選べます。対象外の背景クリックでは選択を変えません。地図は2本指で移動・拡大できます。';
  $('[data-hydrology-status]').textContent=status;$('[data-hydrology-retry]').hidden=!failed.has(t);
  $('[data-hydrology-lead]').textContent=selectedScene?.lead??(config.regionId==='south-central-asia'&&t==='groundwater'?(getState().topic==='water'?southCentralWaterOverview:southCentralGroundwaterOverview):t==='precipitation'?'海から山地、さらに内陸へ、年間に届く水の違いを読みます。':config.regionId==='south-central-asia'&&t==='basins'?'インダス川、ガンジス川、アムダリヤ川、シルダリヤ川の流域を同時に表示しています。山地の上流と乾いた低地の下流を、青い流路と集水域で見比べます。国境は水の流れの境界ではありません。':t==='basins'?'川には、その場所の雨だけでなく、上流の広い範囲に降った雨や雪の水も集まります。色分けした流域と青い流路を重ね、国境を越えたつながりを確かめてください。':'青い線は川、淡い青の面は地下水を蓄える主要な地層です。川と地下水域の位置を見比べます。');
  const riverReading=root.querySelector<HTMLElement>('[data-south-central-river-reading]'),riverCase=config.regionId==='south-central-asia'&&getState().topic==='water'?southCentralWaterSystems[river()?.id??'']:undefined;
  if(riverReading){riverReading.hidden=!riverCase;riverReading.replaceChildren();if(riverCase)riverReading.append(el('h3',riverCase.title),el('p',riverCase.reading),link(riverCase.source.label,riverCase.source.url));}
  const sc=$('[data-hydrology-scene-reading]');sc.replaceChildren();if(selectedScene)sc.append(el('h3',selectedScene.name),el('p',selectedScene.reading),link('この場所の解説の根拠',selectedScene.source));
  const cov=state.place?config.water.coverage[state.place]:null;
  $('[data-hydrology-coverage]').textContent=t==='precipitation'?cov?`${names([state.place!])}では対象格子${fmt(cov.maskCells)}個のうち${fmt(cov.displayCells)}個に値があります。地点値は都市や国の平均ではありません。`:'対象国・地域の陸地に重なる表示格子を収録しています。地点値は都市や国の平均ではありません。':t==='basins'?`主な河川の流域を表示しています。${cov?.basins===0?'選択中の国・地域は、この縮尺の流域資料に区域がありません。河川や排水がないという意味ではありません。':''}`:`主要な地下水盆地だけを塗っています。涵養量の細かな区切りは表示しません。${cov?.groundwater===0?'選択中の国・地域の区域は元資料で確認できません。地下水がないという意味ではありません。':''}`;
  const content=$('[data-hydrology-content]');content.replaceChildren();let message=status;
  const waterPicker=root.querySelector<HTMLElement>('[data-water-picker]');
  if(waterPicker){waterPicker.hidden=getState().topic!=='water';if(!waterPicker.hidden){content.before(waterPicker);const input=waterPicker.querySelector<HTMLSelectElement>('select')!;input.value=river()?.id??'';for(const o of input.options){const allowed=!o.value||!state.place||config.waterFeatures?.find(f=>f.id===o.value)?.countries.includes(state.place);o.hidden=!allowed;o.disabled=!allowed;}}}
  if(river()&&!riverCase){const r=river()!;content.append(el('h3',r.label??r.name),el('p',r.kind==='rivers'?'青い線は川の概略の流路です。背景の淡い青の面は、地下水を蓄える主要な地層の広がりを示します。河川の流域を調べるときは、上の「河川の流域」を選んでください。':'青い面は資料に収録された湖の概略形状です。現在の湖面や貯水量を示すものではありません。周辺の淡い青の面は主要な地下水盆地です。'));}

  if(t==='precipitation'){
   if(state.point&&grid){const n=readAsiaNumericCell(grid,...state.point);message=n===null?'この地点はデータなし、または表示範囲外です。降水量0mmとは異なります。':`${state.point[1].toFixed(3)}°, ${state.point[0].toFixed(3)}°：年降水量 ${fmt(n)} mm/年（1981–2010年の推計平年値）`;}
   else if(!state.point)message='地図上の地点か着目点を選ぶと、同じ表示格子の年降水量を読めます。';
  }else if(ready){
   if(record&&t==='basins'){
    const b=record as BasinRecord;message=`${basinName(b)}：集水域全体 ${fmt(b.areaKm2)} km²`;
    content.append(el('h3','この水系が集める範囲'),el('p',b.coastal?'沿岸にある複数の小流域をまとめた区分です。一つの川の流域や一つの河口としては扱いません。':b.endorheic?'この出口は内陸の閉じた水系に属します。海に届く水系と仮想的につなげていません。':'この集水域は、海へ向かう水系の出口までをたどっています。'),el('p',`この地域内で重なる国・地域：${names(b.countries)}。${b.otherTargetCountries.length?'別のアジア地域の対象国にも続きます（'+b.otherTargetCountries.join('・')+'）。':''}${b.outsideFrame?'流域の一部は地図の表示枠の外にあります。':''}面積は表示外を含む流域全体で、選択した国だけの値ではありません。`));
    if(b.flow){const table=el('table');table.className='industry-table';table.append(el('caption','出口の自然化流量（m³/s・1971–2000年）'));const body=el('tbody');for(const [label,value] of [['年平均',b.flow.mean],['長期平均が最も少ない月',b.flow.lowestMonth],['長期平均が最も多い月',b.flow.highestMonth]] as [string,number][]){const tr=el('tr'),th=el('th',label);th.scope='row';tr.append(th,el('td',fmt(value)));body.append(tr);}table.append(body);content.append(table,el('p','取水などの影響を除いた過去のモデル値です。上の面積や地点の降水量とは別の量を表し、現在の流量・洪水の最大値ではありません。'));}else content.append(el('p','この沿岸区分には複数の出口があるため、代表する一つの流量を掲載していません。'));
    content.append(el('p',`元資料の出口ID：${b.sourceId}。${b.subBasins}小流域を結合しています。国の一覧は流域図と国境図の重なりであり、流域に属する国の公式区分ではありません。資料や境界の簡略化による小さなずれを含みます。`));
   }else if(record){const g=record as GroundwaterRecord,c=groundwaterClasses[g.class];message=`${c.type}：地下水の涵養 ${c.recharge} mm/年の区分`;content.append(el('h3','地質と補給の量を分けて読む'),el('p',`${c.type}に分類された区域です。涵養は地下水へ補給される水であり、地下にすでに蓄えられた水の総量ではありません。年降水量が大きくても、地質・流出・蒸発散などにより同量が地下へ補給されるわけではありません。`),el('p',`原資料の区分：${g.aquifer} / ${g.recharge}。区域ID：${g.sourceId}。同じ色は同じ広域区分ですが、同じ帯水層としてつながっていることまでは示しません。`));}
   else message=river()?`${river()!.label??river()!.name}の概略形状を選択中。周辺の青い面は主要な地下水盆地です。`:state.point?'選択地点に重なる区域が、この資料にはありません。0や水がない状態とは区別してください。':'地図上の区域か一覧から選ぶと、範囲・定義・数値を読めます。';
  }
  $('[data-hydrology-value]').textContent=message;$('[data-grid-reading]').textContent=message;
  for(const b of root.querySelectorAll<HTMLButtonElement>('[data-hydrology-related]'))b.hidden=b.dataset.hydrologyRelated===t;
  pickers();legend(t);method(t);
  if(!ready&&!failed.has(t)&&!pending.has(t)&&(t!=='precipitation'||!!state.point))void load(t).then(()=>{if(topic()===t){onReady();if(map)void show(map);}}).catch(()=>{if(topic()===t)render();});
 }
 const layerIds=['asia-hydrology-rain','asia-hydrology-basins','asia-hydrology-basin-outlines','asia-hydrology-basins-selected','asia-hydrology-groundwater','asia-hydrology-groundwater-selected'];
 async function show(currentMap:import('maplibre-gl').Map){
  map=currentMap;const seq=++revision;for(const id of layerIds)if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');const t=topic();if(!t)return;
  if(t==='precipitation'){
   if(config.contourBands)return;
   if(!map.getSource('asia-hydrology-rain')){map.addSource('asia-hydrology-rain',{type:'image',url:config.waterBase+config.water.precipitation.image,coordinates:config.water.precipitation.imageCoordinates as [number,number][]});map.addLayer({id:'asia-hydrology-rain',type:'raster',source:'asia-hydrology-rain',paint:{'raster-opacity':.28,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');}map.setLayoutProperty('asia-hydrology-rain','visibility','visible');return;
  }
  if(failed.has(t))return;try{await load(t);}catch{if(topic()===t)render();return;}
  if(seq!==revision||topic()!==t||map!==currentMap)return;
  const d=datasets.get(t)!,id='asia-hydrology-'+t,before=map.getLayer('asia-lakes')?'asia-lakes':map.getLayer('asia-population-border')?'asia-population-border':'asia-country-border';
  if(!map.getSource(id)){
   map.addSource(id,{type:'geojson',data:d.geometry});const colors:any=t==='basins'?['match',['get','id'],...d.records.flatMap(r=>[r.id,basinColor(r.id)]),'#b5ced9']:['match',['get','category'],...Object.entries(groundwaterClasses).flatMap(([key,c])=>[Number(key),c.color]),'#dedede'];
   map.addLayer({id,type:'fill',source:id,paint:{'fill-color':colors,'fill-opacity':1}},before);
   if(t==='basins'){map.addSource('asia-hydrology-basin-outlines',{type:'geojson',data:d.outlines});map.addLayer({id:'asia-hydrology-basin-outlines',type:'line',source:'asia-hydrology-basin-outlines',paint:{'line-color':'#727f84','line-width':.65}},before);}
   map.addLayer({id:id+'-selected',type:'line',source:t==='basins'?'asia-hydrology-basin-outlines':id,paint:{'line-color':'#ac432f','line-width':2.5}},before);
  }
  map.setPaintProperty(id,'fill-opacity',.46);
  map.setLayoutProperty(id,'visibility','visible');map.setLayoutProperty(id+'-selected','visibility',t==='basins'?'visible':'none');map.setFilter(id+'-selected',['==',['get','id'],detail()?.id??'']);if(t==='basins'){const ids=asiaWaterFocus[config.regionId].map(f=>f.id);if(detail())ids.push(detail()!.id);map.setFilter(id,['in',['get','id'],['literal',ids]]);map.setLayoutProperty('asia-hydrology-basin-outlines','visibility','none');}else{map.setFilter(id,['<',['get','category'],20]);map.setPaintProperty(id,'fill-color','#a9d2da');}
 }
 function hit(screenPoint:any,point:[number,number],country?:string){const t=topic(),id='asia-hydrology-'+t;if(!map||!t||t==='precipitation'||!map.getLayer(id))return false;const feature=map.queryRenderedFeatures(screenPoint,{layers:[id]})[0],r=datasets.get(t)?.records.find(r=>r.id===feature?.properties.id);if(!r)return false;const state=getState(),place=country&&r.countries.includes(country)?country:state.place&&r.countries.includes(state.place)?state.place:r.countries.length===1?r.countries[0]:null;navigate({...state,detail:r.id,point,place,city:null,camera:camera()},false);return true;}
 $('[data-hydrology-detail]').addEventListener('change',e=>select((e.target as HTMLSelectElement).value));
 $('[data-hydrology-scene]').addEventListener('change',e=>{const s=waterScenes.find(s=>s.region===config.regionId&&s.id===(e.target as HTMLSelectElement).value);if(s)navigate({...getState(),detail:s.id,place:s.country,point:s.point,city:null,camera:camera()},false);else navigate({...getState(),detail:null,point:null,camera:camera()},false);});
 for(const b of root.querySelectorAll<HTMLButtonElement>('[data-hydrology-related]'))b.addEventListener('click',()=>navigate({...getState(),topic:b.dataset.hydrologyRelated==='climate'?null:b.dataset.hydrologyRelated,detail:isWaterTopic(b.dataset.hydrologyRelated)?scene()?.id??null:null,city:null,camera:camera()},false));
 $('[data-hydrology-retry]').addEventListener('click',()=>{const t=topic();if(t){failed.delete(t);render();if(map)void show(map);}});
 return {render,show,hit,detail,scene,normalize,active:()=>!!topic()};
}
