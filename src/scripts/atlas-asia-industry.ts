import {industryTopic,normalizeIndustryState,industryValues,industryScale,industryColors,industryFuelNames,industryFuelColors,industryDomesticNotes,industryMalaysiaReading,type IndustryRegion,type IndustryData,type IndustryNational,type IndustrySeries,type IndustryAdmin} from '../data/atlas/asia-industry';
import type {AsiaState,AsiaCamera} from '../lib/atlas-asia-state';
type Config={industry:IndustryRegion;industryBase:string;countries:{code:string;name:string}[]};
const fmt=(value:number|null|undefined)=>value===null||value===undefined?'未掲載':value.toLocaleString('ja-JP',{maximumFractionDigits:2});
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const link=(label:string,url:string)=>{const a=el('a',label);if(/^https?:\/\//.test(url))a.href=url;return a;};
const option=(label:string,value:string)=>{const o=el('option',label);o.value=value;return o;};
export function createAsiaIndustry(root:HTMLElement,config:Config,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null,onReady:()=>void){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const region=config.industry;
 let data:IndustryData|null=null,national:IndustryNational|null=null,pending:Promise<void>|null=null,failed=false,map:import('maplibre-gl').Map|null=null,revision=0;
 const countryName=(code:string)=>config.countries.find(c=>c.code===code)?.name??code;
 const current=()=>industryTopic(region,getState());
 async function json<T>(file:string):Promise<T>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const r=await fetch(config.industryBase+file,{signal:controller.signal});if(!r.ok)throw Error(String(r.status));const raw=await r.arrayBuffer(),bytes=new Uint8Array(raw);const decoded=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(raw);return JSON.parse(decoded);}finally{clearTimeout(timer);}
 }
 function load(){
  if(data&&national)return Promise.resolve();
  pending??=Promise.all([json<IndustryData>(region.data),json<IndustryNational>('national.json.gz')]).then(([d,n])=>{data=d;national=n;failed=false;}).catch(e=>{failed=true;throw e;}).finally(()=>{pending=null;});return pending;
 }
 function select(id:string){
  const state=getState(),t=current(),record=t.kind==='admin'?data?.admin.find(a=>a.id===id):data?.power.find(p=>p.id===id);
  if(!record){navigate({...state,detail:null,point:null,camera:camera()},false);return;}
  navigate(normalizeIndustryState(region,{...state,detail:record.id,place:record.country,point:record.point??null,city:null,camera:null},data));
 }
 function detail(){const state=getState();return current().kind==='admin'?data?.admin.find(a=>a.id===state.detail):data?.power.find(p=>p.id===state.detail);}
 function table(caption:string,rows:{name:string;value:number|null;status?:string;click?:()=>void}[],unit:string){
  const t=el('table');t.className='industry-table';t.append(el('caption',caption+'（'+unit+'）'));
  const head=el('thead'),tr=el('tr');for(const name of ['対象・年','値']){const th=el('th',name);th.scope='col';tr.append(th);}head.append(tr);t.append(head);
  const body=el('tbody'),max=Math.max(0,...rows.map(r=>r.value??0));
  for(const r of rows){const line=el('tr'),name=el('th');name.scope='row';if(r.click){const b=el('button',r.name);b.type='button';b.addEventListener('click',r.click);name.append(b);}else name.textContent=r.name;const value=el('td',fmt(r.value));if(r.status)value.append(el('small',r.status));if(r.value!==null&&r.value>=0&&max>0){const bar=el('i');bar.className='industry-bar';bar.style.width=(r.value/max*100)+'%';bar.setAttribute('aria-hidden','true');value.append(bar);}line.append(name,value);body.append(line);}t.append(body);return t;
 }
 function history(container:HTMLElement,series:IndustrySeries,unit:string){if(!series.length){container.append(el('p','この対象の時系列は収録していません。'));return;}const d=el('details');d.append(el('summary','年次の数値を読む'));d.append(table('公表値の推移',series.map(v=>({name:v.year,value:v.value,status:v.status})),unit));container.append(d);}
 function picker(){
  if(!data)return;const state=getState(),t=current(),input=$<HTMLInputElement>('[data-industry-search]');
  $('[data-industry-search-label]').hidden=t.kind!=='power';$('[data-industry-detail-label]').hidden=!['admin','power'].includes(t.kind);
  const selectEl=$<HTMLSelectElement>('[data-industry-detail]');selectEl.replaceChildren(option('選択を解除する',''));
  let records=t.kind==='admin'?data.admin.filter(a=>a.country===t.country&&a.point):t.kind==='power'?data.power.filter(p=>(!state.place||p.country===state.place)&&(t.fuel==='all'||p.fuel===t.fuel)&&(!input.value||p.name.toLowerCase().includes(input.value.toLowerCase()))).sort((a,b)=>(b.capacity??0)-(a.capacity??0)):[];
  const selected=detail();if(t.kind==='power'){records=records.slice(0,100);if(selected&&!records.some(r=>r.id===selected.id))records.unshift(selected as any);}
  for(const r of records)selectEl.append(option(r.name+' · '+countryName(r.country),r.id));selectEl.value=state.detail??'';
 }
 function render(){
  const state=getState(),active=state.field==='industry';$('[data-industry-panel]').hidden=!active;$('[data-industry-topics]').hidden=!active;$('[data-industry-legend]').hidden=!active;
  if(!active)return;const t=current();$<HTMLSelectElement>('[data-industry-topic]').value=t.id;
  $('[data-map-title]').textContent=t.title;$('[data-map-eyebrow]').textContent='Industry · '+t.year;$('[data-map-period]').textContent=t.unit;
  $('[data-industry-title]').textContent=t.title;$('[data-industry-definition]').textContent=t.note;
  $('[data-map-gesture]').textContent=t.kind==='power'?'施設の点か一覧から選ぶと、設備容量と出典を読めます。地図は2本指で移動・拡大できます。':'国・行政区域を地図か一覧から選ぶと、数値と順位を読めます。地図は2本指で移動・拡大できます。';
  const status=$('[data-industry-status]');status.textContent=failed?'産業のデータを取得できませんでした。出典と他分野は引き続き利用できます。':data&&national?'':'産業の数値と地図を読み込んでいます。';$('[data-industry-retry]').hidden=!failed;
  const method=$('[data-industry-method]');method.replaceChildren(el('p',t.year+' · '+t.unit+'。'+t.note),link('この主題の一次資料を開く',t.source));
  if(t.country)method.append(el('p',industryDomesticNotes[t.country]));
  if(!data||!national){$('[data-industry-lead]').textContent='国内の分布と国全体の構成を分けて読みます。';$('[data-industry-value]').textContent=status.textContent;$('[data-grid-reading]').textContent=status.textContent;if(!failed&&!pending)void load().then(()=>{render();if(getState().field==='industry')onReady();if(map)void show(map);}).catch(()=>render());return;}
  const values=industryValues(t,data,national,region.countries),scale=industryScale(t,values),record=detail(),selected=values.find(v=>v.id===(state.detail??state.place)),content=$('[data-industry-content]');content.replaceChildren();picker();
  const name=record?.name??(state.place?countryName(state.place):'地域全体');
  const message=t.kind==='power'?record?`${name}：${fmt((record as any).capacity)} MW · ${industryFuelNames[(record as any).fuel]??(record as any).fuel}`:'収録された発電施設の位置を示しています。点を選ぶと設備容量を読めます。':selected?`${name}：${fmt(selected.value)} ${t.unit}（${t.year}）`:'地図か地域の一覧から選ぶと、同年・同じ単位の値を表示します。';
  $('[data-industry-value]').textContent=message;$('[data-grid-reading]').textContent=message;
  const covered=values.filter(v=>v.value!==null).length;
  $('[data-industry-coverage]').textContent=t.kind==='admin'?`国内の${values.length}地域中${covered}地域の値を収録しています。地域への総額で、面積当たりの密度ではありません。灰色は未掲載です。`:t.kind==='power'?`この主題で${values.length.toLocaleString('ja-JP')}施設を収録しています。施設の一覧は選んだ国と検索語で絞り込み、設備容量が大きい順に100件を示します。地図の点には全収録施設を表示します。モルディブと東ティモールはこの版に記録がありません。`:`この地域の${values.length}か国・地域中${covered}か国・地域に同年の値があります。灰色は未掲載で、0ではありません。`;
  const legend=$('[data-industry-scale]');legend.replaceChildren();$('[data-industry-legend-title]').textContent=t.title+' · '+t.year;
  if(t.kind==='power'){
   for(const [fuel,color] of Object.entries(industryFuelColors)){if(t.fuel!=='all'&&t.fuel!==fuel)continue;const span=el('span'),i=el('i');i.style.backgroundColor=color;span.append(i,document.createTextNode(industryFuelNames[fuel]));legend.append(span);}
   $('[data-industry-legend-note]').textContent='点の半径は設備容量の平方根に比例し、見やすさのため3–18pxに制限しています（100MWで3px、1,000MWで9px、4,000MW以上で18px）。点の重なりと上下限があるため、色の面積から合計容量は読み取れません。';
   const plants=data.power.filter(p=>(!state.place||p.country===state.place)&&(t.fuel==='all'||p.fuel===t.fuel));
   const fuels=[...new Set(plants.map(p=>p.fuel))];
   $('[data-industry-lead]').textContent=record?`${name}は${countryName(record.country)}に記録された${industryFuelNames[(record as any).fuel]}の発電施設です。人口や水系の地図と同じ場所を見比べられます。`:`${state.place?countryName(state.place):'この地域'}の収録施設では${fuels.length}種類の電源を確認できます。水力・火力・再生可能エネルギーで立地が異なるかを比べてください。`;
   if(record){const p=record as any;content.append(el('h3','この施設の記録'),el('p',`設備容量の資料年：${p.capacityYear??'記載なし'}。位置情報：${p.locationSource||'記載なし'}。原資料：${p.source||'記載なし'}。`));if(p.url)content.append(link('施設の原資料',p.url));content.append(el('p','以下は資料に収録された報告発電量（GWh）です。設備容量（MW）とは単位・意味が異なり、推計発電量は混ぜていません。'));history(content,p.generation,'GWh（報告発電量）');if(p.generationSource)content.append(el('p','発電量の出典：'+p.generationSource));}
   content.append(table('同じ国・主題で収録された大きな施設',plants.sort((a,b)=>(b.capacity??0)-(a.capacity??0)).slice(0,12).map(p=>({name:p.name,value:p.capacity,click:()=>select(p.id)})),'MW'));
  }else{
   for(let i=0;i<industryColors.length;i++){const span=el('span'),swatch=el('i');swatch.style.backgroundColor=industryColors[i];const label=i===0?fmt(scale.breaks[0])+'未満':i===4?fmt(scale.breaks[3])+'以上':fmt(scale.breaks[i-1])+'以上'+fmt(scale.breaks[i])+'未満';span.append(swatch,document.createTextNode(label));legend.append(span);}const missing=el('span'),swatch=el('i');swatch.style.backgroundColor='#d2ceca';missing.append(swatch,document.createTextNode('未掲載'));legend.append(missing);
   $('[data-industry-legend-note]').textContent=t.unit+'。総額の主題は現在の地域の最大値に応じて区分しています。主題間で色の濃さをそのまま比較せず、値と単位を確認してください。';
   const ranked=values.filter(v=>v.value!==null).sort((a,b)=>b.value!-a.value!);const top=ranked[0],topName=t.kind==='admin'?data.admin.find(a=>a.id===top?.id)?.name:top?countryName(top.id):null;
   $('[data-industry-lead]').textContent=selected?.value!==null&&selected?.value!==undefined?`${name}は、公表値のある${covered}${t.kind==='admin'?'地域':'か国・地域'}の中で${ranked.filter(v=>v.value!>selected.value!).length+1}番目の値です。${t.kind==='admin'?'国内の順位であり、別の国の通貨・定義とは直接比較できません。':'同じ年の同じ指標で比べています。'}`:top?`${t.year}の公表値では、${topName}がこの表示範囲で最も大きい値です。選択すると規模と構成、または年次の変化を確認できます。`:'この年・範囲の公表値はありません。';
   if(t.kind==='admin'&&record){const r=record as IndustryAdmin;content.append(el('h3',r.name+'の産業を読む'),el('p',industryDomesticNotes[r.country]));history(content,r.series[t.id]??[],t.unit);
    if(industryMalaysiaReading[r.id])content.append(el('p',industryMalaysiaReading[r.id]),link('DOSMによる2025年の州経済の説明','https://www.dosm.gov.my/portal-main/release-content/gross-domestic-product-gdp-by-state-2025'));
    if(r.country==='IND'){const m=r.series['in-manufacturing']?.find(v=>v.year==='2022–23')?.value,s=r.series['in-services']?.find(v=>v.year==='2022–23')?.value;content.append(el('p',`${r.name}の2022–23年度の値は、製造業が${fmt(m)}、サービス業が${fmt(s)}です（いずれも2011–12年価格の10万ルピー）。両方の主題へ切り替えると、製造拠点の広がりとサービスの集中を別々に比較できます。これは州全体の経済の2区分で、州都だけの値ではありません。`));}
    if(r.country==='CHN'&&selected?.value!==null&&selected?.value!==undefined&&data.steel.CHN?.total)content.append(el('p',`${r.name}の稼働粗鋼能力は、この資料の中国の収録能力の${fmt(selected.value/data.steel.CHN.total*100)}%に当たります。年の実生産量の比率ではありません。製法別内訳と人口・水系の位置を併せて読むと、設備の規模と周辺条件を区別できます。`));
    if(r.country==='JPN'){const sectors=region.topics.filter(x=>x.country==='JPN'&&x.id!=='jp-00').map(x=>({name:x.title.replace('日本：',''),value:r.series[x.id]?.[0]?.value??null,status:r.series[x.id]?.[0]?.status,click:()=>navigate({...getState(),topic:x.id,camera:camera()},false)})).sort((a,b)=>(b.value??-1)-(a.value??-1));if(sectors[0]&&sectors[0].value!==null&&r.series['jp-00']?.[0]?.value){content.append(el('p',`${r.name}で出荷額が最も大きい公表業種は${sectors[0].name}です。製造業計の${fmt(sectors[0].value!/r.series['jp-00'][0].value!*100)}%を占めます。これは出荷額の構成比であり、従業者や付加価値の構成比ではありません。`));}content.append(table('24業種の製造品出荷額等（2024年）',sectors,'百万円'),el('p',`製造業の従業者数は${fmt(r.employment2025)}人です（2025年6月1日、個人経営を除く）。`));}
    if(r.steelMethods)content.append(table('設備能力の製法別内訳',Object.entries(r.steelMethods).map(([name,value])=>({name,value})),'千t/年'));
   }else if(t.kind==='national'&&state.place){const indicator=national.indicators.find(i=>i.id===t.id)!;history(content,indicator.observations.filter(o=>o.countryCode===state.place).sort((a,b)=>a.year-b.year).map(o=>({year:String(o.year),value:o.value})),t.unit);if(national.missingNotes[state.place])content.append(el('p',national.missingNotes[state.place]));content.append(table('国全体の産業構成（2024年）',['agriculture','industry','services'].map(id=>{const i=national!.indicators.find(x=>x.id===id)!;return{name:i.label,value:i.observations.find(o=>o.countryCode===state.place&&o.year===2024)?.value??null};}),'GDP比 %'),el('p','工業・建設には製造業が含まれます。税などの扱いにより、この3区分が必ず100%になるとは限りません。'));
   }
   content.append(table(t.kind==='admin'?'国内の地域を同じ年で比較する':'国・地域を同じ年で比較する',[...ranked,...values.filter(v=>v.value===null)].map(v=>({name:t.kind==='admin'?data!.admin.find(a=>a.id===v.id)!.name:countryName(v.id),value:v.value,click:t.kind==='admin'?data!.admin.find(a=>a.id===v.id)?.point?()=>select(v.id):undefined:()=>navigate({...getState(),place:v.id,detail:null,point:null,camera:null})})),t.unit));
  }
 }
 const layerIds=['asia-industry-national','asia-industry-admin','asia-industry-admin-lines','asia-industry-admin-selected','asia-industry-power','asia-industry-power-hit','asia-industry-power-selected'];
 async function show(currentMap:import('maplibre-gl').Map){
  map=currentMap;const seq=++revision;
  for(const id of layerIds)if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
  if(getState().field!=='industry')return;
  try{await load();}catch{render();return;}
  if(seq!==revision||getState().field!=='industry'||map!==currentMap)return;
  const t=current(),state=getState(),values=industryValues(t,data!,national!,region.countries),scale=industryScale(t,values);
  if(t.kind==='admin'&&!map.getSource('asia-industry-admin')){map.addSource('asia-industry-admin',{type:'geojson',data:data!.geometry});map.addLayer({id:'asia-industry-admin',type:'fill',source:'asia-industry-admin',paint:{'fill-color':'#d2ceca','fill-opacity':.95}});map.addLayer({id:'asia-industry-admin-lines',type:'line',source:'asia-industry-admin',paint:{'line-color':'#64736f','line-width':.6}});map.addLayer({id:'asia-industry-admin-selected',type:'line',source:'asia-industry-admin',paint:{'line-color':'#a4412e','line-width':2.5}});}
  if((t.kind==='national'||t.kind==='steel')&&!map.getLayer('asia-industry-national'))map.addLayer({id:'asia-industry-national',type:'fill',source:map.getSource('asia-population-geography')?'asia-population-geography':'asia-countries',filter:['in',['get','code'],['literal',region.countries]],paint:{'fill-color':'#d2ceca','fill-opacity':.88}},map.getLayer('asia-population-border')?'asia-population-border':'asia-country-border');
  if(t.kind==='power'){
   if(!map.getSource('asia-industry-power')){map.addSource('asia-industry-power',{type:'geojson',data:{type:'FeatureCollection',features:data!.power.map(p=>({type:'Feature',properties:{id:p.id,country:p.country,fuel:p.fuel,capacity:p.capacity??0},geometry:{type:'Point',coordinates:p.point}}))}});const color:any=['match',['get','fuel'],...Object.entries(industryFuelColors).flat(), '#666'];map.addLayer({id:'asia-industry-power',type:'circle',source:'asia-industry-power',paint:{'circle-radius':['min',18,['max',3,['*',.28460499,['^',['get','capacity'],.5]]]],'circle-color':color,'circle-opacity':.7,'circle-stroke-color':'#fff','circle-stroke-width':.5}});map.addLayer({id:'asia-industry-power-hit',type:'circle',source:'asia-industry-power',paint:{'circle-radius':12,'circle-opacity':0}});map.addLayer({id:'asia-industry-power-selected',type:'circle',source:'asia-industry-power',paint:{'circle-radius':20,'circle-opacity':0,'circle-stroke-color':'#ac372c','circle-stroke-width':2.5}});}
   const filter:any=['all',...(t.fuel==='all'?[]:[['==',['get','fuel'],t.fuel]]),...(state.place?[['==',['get','country'],state.place]]:[])];
   for(const id of ['asia-industry-power','asia-industry-power-hit']){map.setFilter(id,filter);map.setLayoutProperty(id,'visibility','visible');}map.setFilter('asia-industry-power-selected',['all',filter,['==',['get','id'],state.detail??'']]);map.setLayoutProperty('asia-industry-power-selected','visibility','visible');
  }else{const id=t.kind==='admin'?'asia-industry-admin':'asia-industry-national',expr:any=['match',['get',t.kind==='admin'?'id':'code'],...values.flatMap(v=>[v.id,scale.color(v.value)]),'#d2ceca'];map.setPaintProperty(id,'fill-color',expr);map.setLayoutProperty(id,'visibility','visible');if(t.kind==='admin'){for(const id of ['asia-industry-admin','asia-industry-admin-lines'])map.setFilter(id,['==',['get','country'],t.country!]);map.setLayoutProperty('asia-industry-admin-lines','visibility','visible');map.setFilter('asia-industry-admin-selected',['==',['get','id'],state.detail??'']);map.setLayoutProperty('asia-industry-admin-selected','visibility','visible');}}
 }
 $('[data-industry-retry]').addEventListener('click',()=>{failed=false;render();});
 $<HTMLSelectElement>('[data-industry-detail]').addEventListener('change',e=>select((e.target as HTMLSelectElement).value));
 $<HTMLInputElement>('[data-industry-search]').addEventListener('input',picker);
 $<HTMLSelectElement>('[data-industry-topic]').addEventListener('change',e=>{const topic=region.topics.find(t=>t.id===(e.target as HTMLSelectElement).value)!;navigate({...getState(),field:'industry',topic:topic.id,detail:null,place:topic.country??getState().place,point:null,city:null,camera:topic.country&&topic.country!==getState().place?null:camera()},!!topic.country&&topic.country!==getState().place);});
 return{render,show,select,detail,normalize:(state:AsiaState)=>normalizeIndustryState(region,state,data),hit:(point:any)=>{if(!map)return false;const t=current(),layer=t.kind==='admin'?'asia-industry-admin':t.kind==='power'?'asia-industry-power-hit':null;if(!layer||!map.getLayer(layer))return false;const f=map.queryRenderedFeatures(point,{layers:[layer]})[0];if(f?.properties.id){select(f.properties.id);return true;}return false;}};
}
