import {westFields,westTopics,statisticalColors,observation} from '../data/atlas/west-asia-topics.mjs';
import {readWestState,westSearch,gridIndex,decodeWestGrid,zoomWestView,panWestView} from '../lib/atlas-west-asia-state.mjs';

const root=document.querySelector<HTMLElement>('[data-west-atlas]');
if(root) init(root);
async function init(root:HTMLElement){
 const $=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const assets=root.dataset.assets!,field=root.dataset.field!;
 const svg=$<SVGSVGElement>('[data-west-map]'),scene=$<SVGGElement>('[data-west-scene]');
 const countrySelect=$<HTMLSelectElement>('[data-west-country]'),topicSelect=$<HTMLSelectElement>('[data-west-topic]');
 const citySelect=$<HTMLSelectElement>('[data-west-city]'),urbanSelect=$<HTMLSelectElement>('[data-west-urban]');
 const basinSelect=$<HTMLSelectElement>('[data-west-basin]'),yearSelect=$<HTMLSelectElement>('[data-west-year]');
 const loading=$('[data-west-loading]'),retry=$<HTMLButtonElement>('[data-west-retry]');
 const cache=new Map<string,Promise<any>>(),grids=new Map<string,Promise<Float32Array>>();
 const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const format=(n:number|null,digits=1)=>n===null?'未収録':n.toLocaleString('ja-JP',{maximumFractionDigits:digits});
 const json=(name:string)=>{
  if(!cache.has(name))cache.set(name,fetch(assets+name).then(r=>{if(!r.ok)throw Error('資料を取得できませんでした。');return r.json();}).catch(e=>{cache.delete(name);throw e;}));
  return cache.get(name)!;
 };
 let data:any,geography:any,state:any,renderVersion=0,pointVersion=0;
 const fail=(message:string)=>{loading.hidden=false;loading.textContent=message;retry.hidden=false;};
 const project=([lng,lat]:number[])=>[(lng*Math.PI/180*6378137-data.bounds3857[0])/(data.bounds3857[2]-data.bounds3857[0])*data.width,(data.bounds3857[3]-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*6378137)/(data.bounds3857[2]-data.bounds3857[0])*data.width];
 const unproject=([x,y]:number[])=>[(data.bounds3857[0]+x/data.width*(data.bounds3857[2]-data.bounds3857[0]))/6378137*180/Math.PI,(2*Math.atan(Math.exp((data.bounds3857[3]-y/data.width*(data.bounds3857[2]-data.bounds3857[0]))/6378137))-Math.PI/2)*180/Math.PI];
 const path=(g:any):string=>{
  const line=(a:number[][],closed=false)=>a.map((p,i)=>{const v=project(p);return `${i?'L':'M'}${v[0].toFixed(2)},${v[1].toFixed(2)}`;}).join('')+(closed?'Z':'');
  if(g.type==='Polygon')return g.coordinates.map((a:number[][])=>line(a,true)).join('');
  if(g.type==='MultiPolygon')return g.coordinates.flat().map((a:number[][])=>line(a,true)).join('');
  if(g.type==='LineString')return line(g.coordinates);
  if(g.type==='MultiLineString')return g.coordinates.map((a:number[][])=>line(a)).join('');
  if(g.type==='GeometryCollection')return g.geometries.map(path).join('');
  return '';
 };
 let paths:any[]=[];
 const view=()=>state.view??[0,0,data.width,data.height];
 const fit=(b:number[],padding=.16)=>{
  const a=project([b[0],b[3]]),z=project([b[2],b[1]]),w=Math.max(20,z[0]-a[0]),h=Math.max(20,z[1]-a[1]);
  return [a[0]-w*padding,a[1]-h*padding,w*(1+2*padding),h*(1+2*padding)];
 };
 const country=()=>data.countries.find((c:any)=>c.code===state.country);
 const topic=()=>westTopics.find(t=>t.id===state.topic)!;
 const layer=()=>data.layers.find((l:any)=>l.id===topic().layer);
 function links(){
  root.querySelectorAll<HTMLAnchorElement>('[data-west-field]').forEach(a=>{a.href=a.href.split('?')[0]+westSearch(state,a.dataset.westField);});
  const north=$<HTMLAnchorElement>('[data-west-other]');
  const base=north.href.split('/atlas/')[0];north.href=base+'/atlas/north-america/'+westFields.find(f=>f.id===field)!.route+'/';
 }
 function commit(replace=false){
  const url=location.pathname+westSearch(state);history[replace?'replaceState':'pushState']({},'',url);links();
 }
 function applyView(){
  const b=view();svg.setAttribute('viewBox',b.join(' '));
  const k=Math.max(b[2]/Math.max(svg.clientWidth,1),b[3]/Math.max(svg.clientHeight,1));
  scene.querySelectorAll<SVGElement>('[data-marker]').forEach(el=>{el.setAttribute('transform',`translate(${el.dataset.x},${el.dataset.y}) scale(${k})`);});
  scene.querySelectorAll<SVGTextElement>('.west-map-label').forEach(el=>el.style.fontSize=11*k+'px');
 }
 function changeCountry(code:string,fitCountry=true){
  state.country=code;state.point=null;state.basin='';
  if(state.city&&data.cities.find((c:any)=>c.id===state.city)?.countryCode!==code)state.city='';
  if(state.urban&&data.urban.cities.find((c:any)=>c.id===state.urban)?.countryCode!==code)state.urban='';
  if(fitCountry)state.view=code?fit(country().bounds):null;
  commit();void render();
 }
 function selectCity(id:string){
  state.city=id;state.point=null;
  const city=data.cities.find((c:any)=>c.id===id);
  if(city){state.country=city.countryCode;state.view=fit(country().bounds);}
  commit();void render();
 }
 function selectUrban(id:string){
  state.urban=id;state.point=null;
  const city=data.urban.cities.find((c:any)=>c.id===id);
  if(city){state.country=city.countryCode;state.view=fit(city.bounds,.65);}
  commit();void render();
 }
 async function selectBasin(id:string){
  const basins=await json('basins.json');const f=basins.features.find((f:any)=>f.properties.id===id);
  state.basin=f?id:'';state.point=null;if(f){state.view=fit(f.properties.bounds,.08);if(state.country&&!f.properties.countries.includes(state.country)){state.country='';state.city='';state.urban='';}}commit();void render();
 }
 function availableYear(t:any){
  if(!t.indicator&&!t.faoItem)return;
  if(data.countries.some((c:any)=>observation(data,t,c.code,state.year).value!==null))return;
  const y=[2024,2023,2022,2021,2020].find(y=>data.countries.some((c:any)=>observation(data,t,c.code,y).value!==null));
  if(y!==undefined){state.year=y;state.yearNotice=`この主題の収録状況に合わせ、国別統計を${y}年へ切り替えました。`;}
 }
 function changeTopic(id:string){
  state.topic=id;state.point=null;state.basin='';availableYear(topic());commit();void render();
 }
 async function getGrid(l:any){
  if(!grids.has(l.id))grids.set(l.id,fetch(assets+l.grid).then(async r=>{if(!r.ok)throw Error('数値を取得できませんでした。');return decodeWestGrid(await r.arrayBuffer(),l);}).catch(e=>{grids.delete(l.id);throw e;}));
  return grids.get(l.id)!;
 }
 async function readPoint(coord:number[],label='選択地点'){
  const version=++pointVersion,l=layer();if(!l)return;
  if(!l.grid){$('[data-west-point]').textContent='この画像は提供元が描画した森林の参考図です。地点の数値・分類は収録していません。国別の森林面積率は右の統計で確認できます。';return;}
  const out=$('[data-west-point]');out.textContent=label+'の値を読み込んでいます。';
  try{
   const grid=await getGrid(l);if(version!==pointVersion||l.id!==layer()?.id)return;
   const index=gridIndex(coord[0],coord[1],l),value=index<0?null:grid[index];
   const prefix=`${label}（東経${coord[0].toFixed(2)}°・北緯${coord[1].toFixed(2)}°）`;
   if(value===null||value===l.noData||!Number.isFinite(value)){out.textContent=prefix+'：この格子の値は未収録です。海岸・小島では原資料の解像度も影響します。';return;}
   if(l.id==='climate'){
    const c=data.classes.find((c:any)=>c.id===value);out.innerHTML=`${esc(prefix)}：<strong>${esc(c?.code)} ${esc(c?.name)}</strong>（${esc(l.year)}）。${esc(c?.description)}`;
   }else out.textContent=prefix+'：'+format(value,1)+' '+l.unit+'（'+l.year+'）。'+(value===0?'原資料の値は0です。未収録とは区別しています。':'格子の推計値・補間値であり、地点の実測値とは限りません。');
  }catch{if(version===pointVersion){out.textContent='地点の数値を読み込めませんでした。地図の選択は続けられます。再読み込みで再試行できます。';retry.hidden=false;}}
 }
 function sourceLink(t:any){return t.indicator?'https://data.worldbank.org/indicator/'+t.indicator:'https://www.fao.org/faostat/en/#data/'+(t.faoDomain==='Inputs_LandUse'?'RL':'QCL');}
 function details(){
  const t=topic(),c=country(),city=data.cities.find((x:any)=>x.id===state.city),urban=data.urban.cities.find((x:any)=>x.id===state.urban);
  const title=c?c.name+'｜'+t.label:t.label;
  let html=`<p class="eyebrow">${c?'選択した国・地域':'地域全体の読み方'}</p><h2 id="west-detail-title">${esc(title)}</h2><p>${esc(t.description)}</p>`;
  if(state.city&&t.id!=='climate')html+=`<p class="west-persisted">${esc(city?.name)}の選択を保持しています。「気候区分」へ戻ると同じ雨温図を読めます。</p>`;
  if(t.id==='climate'){
   if(city)html+='<div class="west-chart" data-west-active-chart></div><p>'+esc(city.summary)+'</p>';
   else{
    const count=data.cities.filter((x:any)=>!c||x.countryCode===c.code).length;
    html+='<h3>観測所の値で季節を確かめる</h3><p>'+(count?`上の一覧から${count}観測所の雨温図を選べます。`:'この国・地域では今回の資料取得範囲に観測所の平年値がありません。近隣国の値を代用しません。地域全体に戻ると、収録した18観測所を選べます。')+'分類の色は国全体の気候を一つに決めたものではありません。</p>';
   }
  }
  if(t.id==='cities'){
   if(urban){
    html+=`<h3>${esc(urban.name)}</h3><p>都市中心部の2025年の範囲：${format(urban.areaKm2)} km²。以下の人口は同じ範囲を使った推計です。</p><table><caption>行政市の人口ではありません。JRC UCDB R2024A</caption><thead><tr><th>年</th><th>推計人口</th></tr></thead><tbody>${Object.entries(urban.history).map(([y,v])=>`<tr><th>${y}年</th><td>${format(v as number,0)}人</td></tr>`).join('')}</tbody></table><p class="west-stat-note">都市の境界は金色の線で示します。人口の変化はこの固定した範囲の変化で、当時の都市の広がりの変化とは異なります。</p>`;
   }else html+='<p>各国・地域で原資料に収録された都市中心部のうち、2020年の推計人口が多い上位2件を選んでいます。地図の円、または都市の一覧から選択してください。</p>';
  }
  if(t.indicator||t.faoItem){
   if(c){
    const r=observation(data,t,c.code,state.year),has=r.value!==null;
    html+=`<h3>${t.layer?'国別の関連統計':'選択した年の値'}</h3><p class="west-value">${format(r.value,t.unit==='人'||t.unit==='TEU'?0:1)}${has?` <small>${esc(r.unit)}</small>`:''}</p><p class="west-stat-note">${state.year}年 · ${esc(r.source)}${r.flag?' · 資料のフラグ：'+esc(r.flag)+'（'+esc(data.agriculture.flags[r.flag]??'原資料の注記')+'）':''}</p>`;
    if(!has)html+='<p>この国・地域と年の組合せは未収録です。0ではありません。年を変更すると、その年の収録値を確認できます。</p>';
   }
   const rows=data.countries.map((c:any)=>({c,r:observation(data,t,c.code,state.year)}));
   html+=`<details ${!c?'open':''}><summary>20か国・地域を同じ年で比較する</summary><table><caption>${state.year}年 · ${esc(t.unit??'原資料の単位')}。国単位の値で、国内の分布を示しません。</caption><thead><tr><th>国・地域</th><th>値</th></tr></thead><tbody>${rows.map(({c,r}:any)=>`<tr><th><button data-west-country-button="${c.code}">${esc(c.name)}</button></th><td>${format(r.value,t.unit==='人'||t.unit==='TEU'?0:1)}</td></tr>`).join('')}</tbody></table></details><p class="west-stat-note"><a href="${sourceLink(t)}">国別統計の定義・出典を確認する</a></p>`;
  }
  if(t.id==='basins')html+='<p>流域の識別番号はHydroATLASのNEXT_SINKに対応します。ナイル川など地域外に続く流域も切り取らず、選択すると全体を表示します。色は流域を区別するためのもので、水量の大小ではありません。</p>';
  if(t.id==='groundwater')html+='<p>地図を選ぶと、原資料に収録された帯水層の種類と涵養区分を示します。涵養とは雨などが地下に浸透して補給されることです。原資料は世界規模の広域図で、個々の井戸の深さ・水質・持続可能な取水量は分かりません。</p>';
  if(t.id==='desalination')html+='<h3>量を比べる前に確認すること</h3><p>設備が作れる最大量と、実際に作った量を区別します。水資源の年間量と蓄えられた総量も区別します。20か国・地域で同じ年・定義の淡水化施設一覧と供給量は未収録です。</p><p><a href="https://www.fao.org/aquastat/en/overview/methodology/">FAO AQUASTATの定義と方法</a></p>';
  $('[data-west-detail]').innerHTML=html;
  if(city&&t.id==='climate'){
   const tpl=root.querySelector<HTMLTemplateElement>(`template[data-west-chart="${city.id}"]`);
   if(tpl)$('[data-west-active-chart]').append(tpl.content.cloneNode(true));
  }
 }
 function legend(){
  const t=topic(),l=layer();let html='';
  const swatches=(items:{color:string,label:string}[])=>'<div class="west-swatches">'+items.map(x=>`<span><i style="background:${esc(x.color)}"></i>${esc(x.label)}</span>`).join('')+'</div>';
  if(t.id==='climate'){
   const major=['BWh','BWk','BSh','BSk','Csa','Cfa','Dsa','ET'];
   html=swatches(data.classes.filter((c:any)=>major.includes(c.code)).map((c:any)=>({color:c.color,label:c.code})))+'<details><summary>全30区分の名称と色（北米と共通）</summary>'+swatches(data.classes.map((c:any)=>({color:c.color,label:c.code+' '+c.name})))+'</details>';
  }else if(l?.id==='forest'){
   html=swatches([{color:'#008000',label:'森林の参考分布（2020年）'}]);
  }else if(l){
   html=swatches(l.colors.map((color:string,i:number)=>({color,label:i===0?`${format(l.breaks[0])}未満`:i===l.colors.length-1?`${format(l.breaks[i-1])}以上`:`${format(l.breaks[i-1])}〜${format(l.breaks[i])}未満`})))+`<p>${esc(l.unit)} · ${esc(l.year)}</p>`;
  }else if(t.id==='groundwater')html=swatches([{color:'#90bdcf',label:'広い地下水盆'},{color:'#a9c399',label:'複雑な地質構造'},{color:'#dfc89e',label:'局所的・浅い帯水層'}]);
  else if(t.indicator||t.faoItem){const breaks=t.breaks??[1,10,100,1000,10000];html=swatches(statisticalColors.slice(0,breaks.length+1).map((color,i)=>({color,label:i===0?`${format(breaks[0])}未満`:i===breaks.length?`${format(breaks[i-1])}以上`:`${format(breaks[i-1])}〜${format(breaks[i])}未満`})))+`<p>国別比較 · ${state.year}年 · ${esc(t.unit)}</p>`;}
  else html='<p>'+(t.id==='basins'?'色は流域の区別を示します。川は青い線、湖は水色で示します。':'川は青い線、湖は水色で示します。線の太さは流量を表しません。')+'</p>';
  html+=swatches([{color:'#e4e5df',label:l?'周辺国・未収録（区別は場所を選択）':'未収録・対象外'}]);
  $('[data-west-legend]').innerHTML=html;
  $('[data-west-method]').textContent=l?.method??((t.indicator||t.faoItem)?'同じ年の国別統計を比較する図です。国内の位置や密度を表しません。未収録は灰色で示します。':t.id==='groundwater'?'WHYMAP：世界縮尺1:25,000,000の帯水層の広域区分です。取水量・貯留量・現在の渇水は示しません。':'Natural Earth v5.1.2の河川・湖。流域はHydroATLAS v1.0の同じ下流出口につながる区画を統合しています。');
  $('[data-west-source]').innerHTML=l?`出典：<a href="${esc(l.sourceUrl)}">${esc(l.source)}</a> · ${esc(l.year)} · ${esc(l.license)}${t.vector==='contours'?'。等高線は500m間隔です。':''}`:(t.indicator||t.faoItem)?`出典：<a href="${sourceLink(t)}">${t.indicator?'World Bank WDI':'FAOSTAT'}</a> · ${state.year}年 · CC BY 4.0`:`出典：<a href="${t.id==='groundwater'?'https://www.whymap.org/':t.id==='basins'?'https://www.hydrosheds.org/hydroatlas':'https://www.naturalearthdata.com/'}">${t.id==='groundwater'?'BGR / UNESCO WHYMAP（広域概況図）':t.id==='basins'?'HydroATLAS v1.0（地形による流域・CC BY 4.0）':'Natural Earth v5.1.2（パブリックドメイン）'}</a>。現在の観測値ではありません。`;
  $('[data-west-period]').textContent=l?.year??((t.indicator||t.faoItem)?state.year+'年':'地理・地形資料');
 }
 async function draw(version:number){
  const t=topic(),l=layer();let vectors:any=null,rivers:any=null,lakes:any=null;
  if(t.vector==='urban')vectors=data.urban.features;
  else if(t.vector)vectors=await json(t.vector+'.json');
  if(['rivers','basins','groundwater','contours'].includes(t.vector??'')||t.id==='terrain'){
   [rivers,lakes]=await Promise.all([json('rivers.json'),json('lakes.json')]);
  }
  if(version!==renderVersion)return;
  const codeNames=new Map(data.countries.map((c:any)=>[c.code,c.name]));
  let html='<defs><clipPath id="west-target-land">'+paths.filter(f=>f.target).map(f=>`<path d="${f.d}" clip-rule="evenodd"/>`).join('')+'</clipPath></defs>';
  html+=paths.map(f=>{
   let fill='#e4e5df';
   if(f.target&&!l&&(t.indicator||t.faoItem)){
    const value=observation(data,t,f.code,state.year).value,breaks=t.breaks??[1,10,100,1000,10000];
    fill=value===null?'#e4e5df':statisticalColors[breaks.filter((b:number)=>value>=b).length];
   }
   return `<path d="${f.d}" fill="${fill}" fill-rule="evenodd" stroke="#b7c3c1" stroke-width=".5" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  if(l)html+=`<image data-west-raster href="${esc(assets+l.image)}" x="0" y="0" width="${data.width}" height="${data.height}" preserveAspectRatio="none" clip-path="url(#west-target-land)" style="image-rendering:pixelated;pointer-events:none"/>`;
  if(vectors&&t.vector!=='rivers')html+=vectors.features.map((f:any,i:number)=>{
   let fill='none',stroke='#866953',width=.65,attrs='';
   if(t.vector==='basins'){fill=['#adc8ae','#d8c3a0','#b9c5dc','#d2b4b4','#c6cda8'][i%5];stroke=state.basin===f.properties.id?'#9d3c2e':'#748676';width=state.basin===f.properties.id?2.4:.7;attrs=`data-basin="${f.properties.id}"`;}
   if(t.vector==='groundwater'){fill=({'1':'#90bdcf','2':'#a9c399','3':'#dfc89e'} as any)[String(f.properties.HYGEO2)[0]]??'#ddd';stroke='#a0aea2';width=.3;attrs=`data-ground="${i}"`;}
   if(t.vector==='urban'){stroke='#c48b23';width=state.urban===f.properties.id?3:1.4;attrs=`data-urban="${f.properties.id}"`;}
   return `<path d="${path(f.geometry)}" fill="${fill}" fill-opacity="${t.vector==='basins'?'.8':'1'}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${width}" vector-effect="non-scaling-stroke" ${attrs}><title>${esc(f.properties.name??f.properties.elevation+' m')}</title></path>`;
  }).join('');
  if(lakes)html+=lakes.features.map((f:any)=>`<path d="${path(f.geometry)}" fill="#9ac6d5" stroke="#629cad" stroke-width=".6" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
  if(rivers)html+=rivers.features.map((f:any)=>`<path d="${path(f.geometry)}" fill="none" stroke="#4c91b0" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"><title>${esc(f.properties.name)}</title></path>`).join('');
  html+=paths.filter(f=>f.target).map(f=>`<path class="west-country-line ${state.country===f.code?'is-selected':''}" data-country="${f.code}" d="${f.d}" fill-rule="evenodd" ${['basins','groundwater','urban'].includes(t.vector??'')?'style="pointer-events:stroke"':''}><title>${esc(codeNames.get(f.code))}</title></path>`).join('');
  html+=data.countries.filter((c:any)=>c.code===state.country||['TUR','IRN','SAU','EGY','IRQ','YEM','OMN'].includes(c.code)).map((c:any)=>{const p=project(c.center);return `<text class="west-map-label" x="${p[0]}" y="${p[1]}" text-anchor="middle">${esc(c.name)}</text>`;}).join('');
  const points=t.id==='climate'?data.cities:t.id==='cities'?data.urban.cities:[];
  html+=points.filter((c:any)=>!state.country||c.countryCode===state.country).map((c:any)=>{
   const p=project(c.coordinates),selected=state.city===c.id||state.urban===c.id;
   return `<g class="west-station ${selected?'is-selected':''}" data-marker data-x="${p[0]}" data-y="${p[1]}" data-${t.id==='climate'?'city':'urban'}="${c.id}" role="button" tabindex="0" aria-label="${esc(c.name)}を選択" aria-pressed="${selected}"><title>${esc(c.name)}</title><circle r="5"/>${selected?`<text x="9" y="4" style="font-size:12px;fill:#253d47;paint-order:stroke;stroke:#fffdf4;stroke-width:3">${esc(c.name)}</text>`:''}</g>`;
  }).join('');
  scene.innerHTML=html;applyView();
  const raster=scene.querySelector<SVGImageElement>('[data-west-raster]');
  raster?.addEventListener('error',()=>{if(version===renderVersion)fail('分布画像を読み込めませんでした。国の選択と統計は利用できます。');});
  if(t.vector==='basins'){
   basinSelect.innerHTML='<option value="">流域を選択</option>'+vectors.features.filter((f:any)=>!state.country||f.properties.countries?.includes(state.country)).map((f:any)=>`<option value="${f.properties.id}">${esc(f.properties.name)}</option>`).join('');basinSelect.value=state.basin;
  }
  loading.hidden=true;retry.hidden=true;
 }
 async function render(){
  const version=++renderVersion;++pointVersion;const restoreMapFocus=svg.contains(document.activeElement);
  const t=topic();topicSelect.value=t.id;countrySelect.value=state.country;yearSelect.value=String(state.year);
  $('[data-west-year-label]').hidden=!(t.indicator||t.faoItem);
  $('[data-west-city-label]').hidden=t.id!=='climate';$('[data-west-urban-label]').hidden=t.id!=='cities';$('[data-west-basin-label]').hidden=t.id!=='basins';
  const fillOptions=(select:HTMLSelectElement,items:any[],value:string)=>{
   select.innerHTML='<option value="">'+(select===citySelect?'観測所を選択':'都市を選択')+'</option>'+items.filter(c=>!state.country||c.countryCode===state.country).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');select.value=value;
  };
  fillOptions(citySelect,data.cities,state.city);fillOptions(urbanSelect,data.urban.cities,state.urban);
  root.querySelectorAll<HTMLButtonElement>('[data-west-group]').forEach(b=>{const selected=b.dataset.westGroup===t.group;b.setAttribute('aria-selected',String(selected));b.setAttribute('aria-pressed',String(selected));});
  $('#west-map-title').textContent=t.label;details();legend();links();loading.hidden=false;loading.textContent='地図資料を読み込んでいます。';
  if(!state.point)$('[data-west-point]').textContent=state.yearNotice??(country()?country().name+'を選択しています。'+(layer()?'地図の場所を選ぶと、収録されている格子の値を確認できます。':'一覧や地図から、別の対象へ切り替えられます。'):'国・都市の一覧、または地図の場所を選択してください。');
  state.yearNotice=null;
  try{await draw(version);if(version!==renderVersion)return;if(restoreMapFocus)svg.focus({preventScroll:true});const city=data.cities.find((c:any)=>c.id===state.city);if(t.id==='climate'&&city)void readPoint(city.coordinates,city.name);else if(state.point&&layer())void readPoint(state.point);if(t.id==='basins'&&state.basin){const basins=await json('basins.json');const f=basins.features.find((f:any)=>f.properties.id===state.basin);if(f&&version===renderVersion)$('[data-west-point]').textContent=f.properties.name+'の全体を表示しています。地域の外に続く上流も含みます。';}}catch{if(version===renderVersion)fail('この地図の資料を読み込めませんでした。国別統計と分野の切替は利用できます。');}
 }
 async function start(){
  try{
   [data,geography]=await Promise.all([json('data.json'),json('geography.json')]);
   paths=geography.features.map((f:any)=>({...f.properties,d:path(f.geometry)}));
   state=readWestState(location.search,field,data);if(!new URLSearchParams(location.search).has('year'))availableYear(topic());
   if(!state.view&&state.country)state.view=fit(country().bounds);
   const url=new URL(location.href),lng=Number(url.searchParams.get('lng')),lat=Number(url.searchParams.get('lat'));
   if(url.searchParams.has('lng')&&url.searchParams.has('lat')&&lng>=23&&lng<=64&&lat>=10&&lat<=45)state.view=fit([lng-3,lat-2,lng+3,lat+2]);
   commit(true);await render();
  }catch{fail('資料を読み込めませんでした。下の基本人口表と出典は利用できます。再読み込みで再試行してください。');}
 }
 countrySelect.addEventListener('change',()=>data&&changeCountry(countrySelect.value));
 topicSelect.addEventListener('change',()=>data&&changeTopic(topicSelect.value));
 citySelect.addEventListener('change',()=>data&&selectCity(citySelect.value));
 urbanSelect.addEventListener('change',()=>data&&selectUrban(urbanSelect.value));
 basinSelect.addEventListener('change',()=>{if(data)void selectBasin(basinSelect.value).catch(()=>fail('流域を読み込めませんでした。'));});
 yearSelect.addEventListener('change',()=>{if(data){state.year=Number(yearSelect.value);commit();void render();}});
 retry.addEventListener('click',()=>{cache.clear();grids.clear();void start();});
 function zoom(factor:number){state.view=zoomWestView(view(),factor);applyView();commit();}
 root.addEventListener('click',event=>{
  if(!data)return;const target=event.target as Element;
  const group=target.closest<HTMLElement>('[data-west-group]');if(group){const t=westTopics.find(t=>t.field===field&&t.group===group.dataset.westGroup)!;changeTopic(t.id);}
  const c=target.closest<HTMLElement>('[data-west-country-button]');if(c)changeCountry(c.dataset.westCountryButton!);
  const z=target.closest<HTMLElement>('[data-west-zoom]');if(z)zoom(Number(z.dataset.westZoom));
  if(target.closest('[data-west-reset]')){state.country='';state.view=null;state.point=null;state.basin='';state.city='';state.urban='';commit();void render();}
 });
 let down:{x:number,y:number,view:number[],point:DOMPoint,target:Element}|null=null,moved=false;
 const svgPoint=(e:PointerEvent)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
 svg.addEventListener('pointerdown',e=>{if(!data||e.button!==0)return;const p=svgPoint(e);down={x:e.clientX,y:e.clientY,point:p,view:[...view()],target:e.target as Element};moved=false;svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{
  if(!down)return;
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)moved=true;
  if(moved){const p=svgPoint(e);state.view=panWestView(view(),down.point.x-p.x,down.point.y-p.y);applyView();}
 });
 svg.addEventListener('pointerup',e=>{
  if(!down)return;const saved=down;down=null;svg.releasePointerCapture(e.pointerId);
  if(moved){commit();return;}
  const target=saved.target;
  const city=target.closest<SVGElement>('[data-city]');if(city){selectCity(city.dataset.city!);return;}
  const urban=target.closest<SVGElement>('[data-urban]');if(urban){selectUrban(urban.dataset.urban!);return;}
  const basin=target.closest<SVGElement>('[data-basin]');if(basin){void selectBasin(basin.dataset.basin!).catch(()=>fail('流域を読み込めませんでした。'));return;}
  const ground=target.closest<SVGElement>('[data-ground]');if(ground){void json('groundwater.json').then(g=>{const p=g.features[Number(ground.dataset.ground)].properties;const category=({'1':'広い地下水盆','2':'複雑な地質構造','3':'局所的・浅い帯水層'} as any)[String(p.HYGEO2)[0]]??'原資料の区分';const ranges:Record<number,string>={11:'2未満',12:'2〜20',13:'20〜100',14:'100〜300',15:'300超',22:'20未満',23:'20〜100',24:'100〜300',25:'300超',33:'100未満',34:'100超'};$('[data-west-point]').textContent='帯水層の種類：'+category+'。涵養区分：'+(ranges[Number(p.HYGEO2)]??'区分値なし')+' mm／年。地下水の残存量・取水量ではありません。';});return;}
  const c=target.closest<SVGElement>('[data-country]');if(c){state.country=c.dataset.country;if(data.cities.find((x:any)=>x.id===state.city)?.countryCode!==state.country)state.city='';if(data.urban.cities.find((x:any)=>x.id===state.urban)?.countryCode!==state.country)state.urban='';}
  const p=svgPoint(e);state.point=unproject([p.x,p.y]);commit();void render();
 });
 svg.addEventListener('pointercancel',()=>{if(down&&moved)commit();down=null;});
 svg.addEventListener('keydown',e=>{
  if(!data)return;const target=e.target as Element;
  if(['Enter',' '].includes(e.key)){
   const c=target.closest<SVGElement>('[data-city]'),u=target.closest<SVGElement>('[data-urban]');
   if(c||u){e.preventDefault();if(c)selectCity(c.dataset.city!);else selectUrban(u!.dataset.urban!);return;}
  }
  if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){
   e.preventDefault();if(['+','='].includes(e.key)){zoom(.65);return;}if(e.key==='-'){zoom(1.54);return;}
   const b=[...view()];if(e.key==='Home')state.view=null;
   else{state.view=panWestView(b,e.key==='ArrowLeft'?-b[2]*.18:e.key==='ArrowRight'?b[2]*.18:0,e.key==='ArrowUp'?-b[3]*.18:e.key==='ArrowDown'?b[3]*.18:0);}
   applyView();commit();
  }
 });
 window.addEventListener('popstate',()=>{if(data){state=readWestState(location.search,field,data);const p=new URLSearchParams(location.search);if(p.has('lng')&&p.has('lat')){const lng=Number(p.get('lng')),lat=Number(p.get('lat'));if(Number.isFinite(lng)&&Number.isFinite(lat)&&lng>=23&&lng<=64&&lat>=10&&lat<=45)state.view=fit([lng-3,lat-2,lng+3,lat+2]);}void render();}});
 new ResizeObserver(()=>{if(data&&state)applyView();}).observe(svg);
 await start();
}
