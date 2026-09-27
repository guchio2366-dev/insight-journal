import {socialTopic,socialGroup,socialDefault,socialValue,socialColors,socialColor,socialDenominator,socialReadings,taiwanRegistered2025,normalizeSocialState,type SocialRegion,type SocialData} from '../data/atlas/asia-social';
import {startAsiaComparison,type AsiaState,type AsiaCamera} from '../lib/atlas-asia-state';

type Config={social:SocialRegion;socialBase:string;countries:{code:string;name:string}[]};
const fmt=(n:number|null|undefined)=>n==null?'未掲載':n.toLocaleString('ja-JP',{maximumFractionDigits:2});
const percent=(n:number|null|undefined)=>n!=null&&n>0&&n<.01?'0.01未満':fmt(n);
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const link=(text:string,url:string)=>{const a=el('a',text);if(/^https:\/\//.test(url))a.href=url;return a;};
const option=(text:string,value:string)=>{const o=el('option',text);o.value=value;return o;};

export function createAsiaSocial(root:HTMLElement,config:Config,getState:()=>AsiaState,navigate:(s:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null,onReady:()=>void){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const region=config.social;
 let data:SocialData|null=null,pending:Promise<void>|null=null,failed=false,map:import('maplibre-gl').Map|null=null,revision=0;
 const current=()=>socialTopic(region,getState());
 const group=()=>socialGroup(region,getState());
 const active=()=>!!current();
 const countryName=(code:string)=>config.countries.find(c=>c.code===code)?.name??code;
 const detail=()=>active()?data?.records.find(r=>r.id===getState().detail&&r.country===group()?.country):undefined;

 async function load(){
  if(data)return;
  pending??=(async()=>{
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
   try{
    const response=await fetch(config.socialBase+region.data,{signal:abort.signal});if(!response.ok)throw Error(String(response.status));
    const raw=await response.arrayBuffer(),bytes=new Uint8Array(raw);
    const decoded=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(raw);
    data=JSON.parse(decoded);failed=false;
   }catch(error){failed=true;throw error;}finally{clearTimeout(timer);}
  })().finally(()=>{pending=null;});
  return pending;
 }
 function select(id:string){
  const r=data?.records.find(r=>r.id===id&&r.country===group()?.country);
  navigate({...getState(),detail:r?.id??null,point:r?.point??null,place:r?.country??getState().place,city:null,camera:r?null:camera()},!!r);
 }
 function chooseTopic(topic:string){
  const nextGroup=region.groups.find(g=>g.id===region.topics.find(t=>t.id===topic)?.group),state=getState();
  const switchingCountry=nextGroup?.country&&nextGroup.country!==state.place;
  navigate({...state,field:'population',topic,place:nextGroup?.country??state.place,detail:switchingCountry?null:state.detail,point:switchingCountry?null:state.point,city:null,camera:switchingCountry?null:camera()},!!switchingCountry);
 }
 function table(caption:string,rows:{name:string;value:number|null;click?:()=>void}[],unit='%'){
  const table=el('table');table.append(el('caption',caption+'（'+unit+'）'));
  const head=el('thead'),header=el('tr');for(const title of ['対象・区分','値']){const th=el('th',title);th.scope='col';header.append(th);}head.append(header);table.append(head);
  const body=el('tbody'),max=Math.max(0,...rows.map(r=>r.value??0));
  for(const row of rows){const tr=el('tr'),th=el('th');th.scope='row';if(row.click){const b=el('button',row.name);b.type='button';b.addEventListener('click',row.click);th.append(b);}else th.textContent=row.name;const td=el('td',unit==='%'?percent(row.value):fmt(row.value));if(row.value!==null&&row.value>=0&&max>0){const bar=el('i');bar.className='social-bar';bar.style.width=(row.value/max*100)+'%';bar.setAttribute('aria-hidden','true');td.append(bar);}tr.append(th,td);body.append(tr);}table.append(body);return table;
 }
 function render(){
  const t=current(),g=group();$('[data-social-panel]').hidden=!t;$('[data-social-legend]').hidden=!t;if(!t||!g)return;
  const state=getState(),title=g.label+'：'+t.title;
  $<HTMLSelectElement>('[data-population-topic]').value=socialDefault(g.id);
  $('[data-social-title]').textContent=title;$('[data-map-title]').textContent=title;$('[data-map-eyebrow]').textContent='Population · '+g.year;$('[data-map-period]').textContent='% · '+g.year;
  $('[data-map-gesture]').textContent='色を塗った国・行政区域を地図か一覧から選ぶと、数値と内訳を読めます。地図は2本指で動かせます。';
  $('[data-social-definition]').textContent=g.note;
  const status=$('[data-social-status]');status.textContent=failed?'人口統計を取得できませんでした。再読み込みできます。':data?'':'人口統計と行政区域を読み込んでいます。';$('[data-social-retry]').hidden=!failed;
  const topics=region.topics.filter(x=>x.group===g.id),metric=$<HTMLSelectElement>('[data-social-metric]');metric.replaceChildren(...topics.map(x=>option(x.title,x.id)));metric.value=t.id;
  $('[data-social-metric-label]').hidden=topics.length===1;
  $('[data-social-area-label]').hidden=g.kind!=='admin';
  const method=$('[data-social-method]');method.replaceChildren(el('p',g.year+'年 · '+g.note),link('この主題の一次資料',g.source),el('p','行政区域の形はNatural Earth 1:10mを概略化した表示です。統計の公式境界図や個人の所在地ではありません。'));
  method.append(el('p','収録範囲：'+region.countries.map(c=>countryName(c)+'（国別年齢・増減'+(region.coverage[c].national?'あり':'未掲載')+'、国内の区域別人口'+(region.coverage[c].admin?region.coverage[c].admin+'区域':'未収録')+'）').join('、')+'。未収録は非公開という意味ではありません。国によって国籍・民族・言語・宗教の分類は異なるため、同じ区分として統合していません。'));
  method.append(el('p',g.id.startsWith('jp-')?'出典：総務省統計局・2020年国勢調査（e-Stat）。不詳を除いた割合を計算し、地図へ加工しました。':g.id.startsWith('my-')?'出典：Department of Statistics Malaysia（DOSM）／CC BY 4.0。州別人数から割合・増減を計算しました。':g.id.startsWith('in-')?'出典：Office of the Registrar General & Census Commissioner, India、2011年国勢調査C-01・C-16。数値を抽出し、区域の統合と割合の計算を行いました。対応する政府オープンデータはGODL-Indiaで公開されています。':'出典：世界銀行 World Development Indicators（2010–2025）／CC BY 4.0。年齢構成と増減率はWDIの公表値です。'));
  const scale=$('[data-social-scale]');scale.replaceChildren();$('[data-social-legend-title]').textContent=t.title+' · '+g.year;
  for(let i=0;i<5;i++){const s=el('span'),swatch=el('i');swatch.style.backgroundColor=socialColors[i];s.append(swatch,document.createTextNode(i===0?fmt(t.breaks[0])+'未満':i===4?fmt(t.breaks[3])+'以上':fmt(t.breaks[i-1])+'以上'+fmt(t.breaks[i])+'未満'));scale.append(s);}const missing=el('span'),swatch=el('i');swatch.style.backgroundColor='#d2ceca';missing.append(swatch,document.createTextNode('未掲載'));scale.append(missing);
  $('[data-social-legend-note]').textContent='単位は%です。割合の分母と資料年は主題によって異なります。0は最も淡い色、未掲載は灰色で示します。';
  const content=$('[data-social-content]');content.replaceChildren();
  if(!data){$('[data-social-lead]').textContent='分布、人数と分母、内訳の順に読みます。';$('[data-social-value]').textContent=status.textContent;$('[data-grid-reading]').textContent=status.textContent;$('[data-social-coverage]').textContent='';if(!failed&&!pending)void load().then(()=>{render();if(active())onReady();if(map)void show(map);}).catch(()=>render());return;}
  const r=detail(),national=state.place?data.national[state.place]:undefined,selected=g.kind==='admin'?r:national;
  const values=g.kind==='admin'?data.records.filter(r=>r.country===g.country).map(r=>({id:r.id,name:r.name,value:socialValue(r,t,g)})):region.countries.map(c=>({id:c,name:countryName(c),value:socialValue(data!.national[c],t,g)}));
  const covered=values.filter(v=>v.value!==null).length,value=socialValue(selected,t,g),name=r?.name??(state.place?countryName(state.place):'地域全体');
  const message=selected?`${name}：${t.title} ${percent(value)}${value===null?'':'%'}（${g.year}年）`:'色を塗った地域か一覧から選ぶと、割合とその分母を表示します。';
  $('[data-social-value]').textContent=message;$('[data-grid-reading]').textContent=message;
  $('[data-social-coverage]').textContent=g.kind==='admin'?`${countryName(g.country!)}の${values.length}区域中${covered}区域を収録しています。区域全体の統計であり、区域内の全地点が同じ構成という意味ではありません。`:`${values.length}か国・地域中${covered}か国・地域に2025年の値があります。欠けた国を別の年の値で埋めていません。`;
  const area=$<HTMLSelectElement>('[data-social-area]');area.replaceChildren(option('地図か一覧から選ぶ',''),...data.records.filter(r=>r.country===g.country).sort((a,b)=>a.id.localeCompare(b.id)).map(r=>option(r.name,r.id)));area.value=r?.id??'';
  const ranked=values.filter(v=>v.value!==null).sort((a,b)=>b.value!-a.value!);
  const reading=r&&socialReadings[r.id];
  $('[data-social-lead]').textContent=reading?.body??(value!==null?`${name}の${t.title}は${fmt(value)}%です。${g.id.includes('growth')?'増減率の正負と、増減前後の人口を区別して読んでください。':'割合だけでなく人数も確かめ、周辺の地域との違いを比べてください。'}`:ranked[0]?`${g.year}年のこの指標では、${ranked[0].name}が収録範囲で最も高い割合です。地図と一覧から、国内または国どうしの違いを読めます。`:'この年の値を収録していません。');
  if(reading)content.append(el('h3',reading.title),link('この地域の説明の出典',reading.source));
  if(r){
   const denominator=socialDenominator(r,g),numerator=r.counts[t.id];
   if(g.id==='my-growth')content.append(el('p',`2020年：${fmt(r.total['2020']/1000)}千人 → 2026年：${fmt(r.total['2026']/1000)}千人。増減人数は${fmt((r.total['2026']-r.total['2020'])/1000)}千人です。`));
   else content.append(el('p',r.country==='MYS'?`この区分は${fmt(numerator/1000)}千人、割合の分母は${fmt(denominator/1000)}千人です。元資料は千人単位・小数1桁です。`:`この区分は${fmt(numerator)}人、割合の分母は${fmt(denominator)}人です。`));
   if(g.id==='jp-age')content.append(el('p',`総人口${fmt(r.total['2020'])}人のうち、年齢不詳${fmt(r.counts.ageUnknown)}人を割合の分母から除いています。`));
   if(g.id==='jp-nationality')content.append(el('p',`総人口${fmt(r.total['2020'])}人のうち、日本人・外国人の別の不詳${fmt(r.counts.nationalityUnknown)}人を割合の分母から除いています。`));
   for(const note of r.notes)content.append(el('p',note));
   const benchmark=data.national[r.country],benchmarkValue=socialValue(benchmark,t,g);
   if(benchmarkValue!==null)content.append(el('p',`同じ資料の全国の割合は${fmt(benchmarkValue)}%です。この区域との差は${fmt(value!-benchmarkValue)}ポイントです。国別の2025年推計とは別の集計です。`));
   if(r.nationalities&&g.id==='jp-nationality'){const box=el('details');box.append(el('summary','外国人の国籍別人数を読む'),table('資料の国籍区分（2020年）',r.nationalities.map(n=>({name:n.label,value:n.value})),'人'));content.append(box);}
  }else if(g.kind==='national'&&national){
   if(national.total['2025']!=null)content.append(el('p',`2025年の年央人口：${fmt(national.total['2025'])}人。人数と構成比は推計値です。`));
   if(g.id==='national-growth'&&national.total['2024'])content.append(el('p',`2024年の年央人口：${fmt(national.total['2024'])}人。増減人数は${fmt(national.total['2025']-national.total['2024'])}人です。`));
   if(state.place==='TWN'){const ref=taiwanRegistered2025;content.append(el('h3','台湾の別資料を読む'),el('p',`台湾は今回取得したWDI系列に含まれません。内政部の2025年12月の戸籍登録人口は${fmt(ref.total)}人で、前年末より${fmt(-ref.change)}人減っています。これは登録人口であり、地図の年央・全居住人口の系列とは範囲と基準日が異なります。`),table('戸籍登録人口の年齢構成（2025年12月）',[['15歳未満',ref.young],['15–64歳',ref.working],['65歳以上',ref.old]].map(([name,n])=>({name:String(name),value:Number(n)/ref.total*100}))),link('内政部の2025年戸口統計',ref.source));}
  }
  if(selected&&topics.length>1){const rows=topics.map(x=>({name:x.title,value:socialValue(selected,x,g),click:()=>chooseTopic(x.id)}));const composition=table('同じ対象の区分を切り替える',rows);if(rows.length>12){const box=el('details');box.append(el('summary',`${rows.length}言語群の内訳を読む`),composition);content.append(box);}else content.append(composition);}
  const series=selected?.series[t.id];if(series&&Object.keys(series).length>1){const box=el('details');box.append(el('summary','年次の数値を読む'),table('同じ定義の年次推移',Object.entries(series).sort(([a],[b])=>a.localeCompare(b)).map(([year,value])=>({name:year+'年',value}))));content.append(box);}
  const comparison=el('details');comparison.open=!selected;comparison.append(el('summary',g.kind==='admin'?`国内の${values.length}区域を比較する`:`${values.length}か国・地域を比較する`),table(g.kind==='admin'?'国内の区域を同じ指標で比較する':'国・地域を同じ指標で比較する',[...ranked,...values.filter(v=>v.value===null)].map(v=>({name:v.name,value:v.value,click:g.kind==='admin'?()=>select(v.id):()=>navigate({...getState(),place:v.id,detail:null,point:null,camera:null})}))));content.append(comparison);
 }
 const layers=['asia-social-national','asia-social-admin','asia-social-lines','asia-social-selected'];
 async function show(currentMap:import('maplibre-gl').Map){
  map=currentMap;const seq=++revision;for(const id of layers)if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');if(!active()||failed)return;
  try{await load();}catch{render();return;}
  if(seq!==revision||!active()||map!==currentMap||!map.getStyle())return;
  const t=current()!,g=group()!,state=getState();
  if(g.kind==='admin'){
   if(!map.getSource('asia-social-admin')){map.addSource('asia-social-admin',{type:'geojson',data:data!.geometry});map.addLayer({id:'asia-social-admin',type:'fill',source:'asia-social-admin',paint:{'fill-color':'#d2ceca','fill-opacity':.96}});map.addLayer({id:'asia-social-lines',type:'line',source:'asia-social-admin',paint:{'line-color':'#526b65','line-width':.6}});map.addLayer({id:'asia-social-selected',type:'line',source:'asia-social-admin',paint:{'line-color':'#a4412e','line-width':2.8}});}
   const color:any=['match',['get','id'],...data!.records.filter(r=>r.country===g.country).flatMap(r=>[r.id,socialColor(socialValue(r,t,g),t)]),'#d2ceca'];map.setPaintProperty('asia-social-admin','fill-color',color);
   for(const id of ['asia-social-admin','asia-social-lines','asia-social-selected']){map.setFilter(id,['all',['==',['get','country'],g.country!],...(id==='asia-social-selected'?[['==',['get','id'],state.detail??'']]:[])] as any);map.setLayoutProperty(id,'visibility','visible');}
  }else{
   if(!map.getLayer('asia-social-national'))map.addLayer({id:'asia-social-national',type:'fill',source:map.getSource('asia-population-geography')?'asia-population-geography':'asia-countries',filter:['in',['get','code'],['literal',region.countries]],paint:{'fill-color':'#d2ceca','fill-opacity':.96}},map.getLayer('asia-population-border')?'asia-population-border':'asia-country-border');
   const color:any=['match',['get','code'],...region.countries.flatMap(c=>[c,socialColor(socialValue(data!.national[c],t,g),t)]),'#d2ceca'];map.setPaintProperty('asia-social-national','fill-color',color);map.setLayoutProperty('asia-social-national','visibility','visible');
  }
 }
 function hit(point:{x:number;y:number},coordinates:[number,number]){
  if(!active()||!data||!map)return false;
  const g=group()!,layer=g.kind==='admin'?'asia-social-admin':'asia-social-national';if(!map.getLayer(layer))return false;
  const f=map.queryRenderedFeatures(point,{layers:[layer]})[0];if(!f)return false;
  if(g.kind==='admin')navigate({...getState(),detail:f.properties.id,point:coordinates,place:g.country!,city:null,camera:camera()},false);
  else navigate({...getState(),detail:null,point:coordinates,place:f.properties.code,city:null,camera:camera()},false);
  return true;
 }
 $<HTMLSelectElement>('[data-social-metric]').addEventListener('change',e=>chooseTopic((e.target as HTMLSelectElement).value));
 $<HTMLSelectElement>('[data-social-area]').addEventListener('change',e=>select((e.target as HTMLSelectElement).value));
 $('[data-social-density]').addEventListener('click',()=>navigate({...startAsiaComparison(new URL(location.href),{...getState(),camera:camera()},'population'),topic:'density'},false));
 $('[data-social-retry]').addEventListener('click',()=>{failed=false;render();});
 return {active,detail,render,show,hit,chooseTopic,normalize:(s:AsiaState)=>normalizeSocialState(region,s,data)};
}
