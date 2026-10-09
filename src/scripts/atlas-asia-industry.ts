import {industryTopic,normalizeIndustryState,industryValues,industryValueLabel,industryMissingLabel,industryScale,industryColors,industryFuelNames,industryFuelColors,industryDomesticNotes,industryMalaysiaReading,industryScopeCountries,hasIndustryCountryScope,isEastIndustryRegion,type IndustryRegion,type IndustryData,type IndustryNational,type IndustrySeries,type IndustryAdmin} from '../data/atlas/asia-industry';
import type {AsiaState,AsiaCamera} from '../lib/atlas-asia-state';
import {eastIndustrySites} from '../data/atlas/asia-east-industry-sites';
import {southCentralIndustryGroups,southCentralIndustrySites,southCentralIndustryOverview} from '../data/atlas/asia-south-central-industry';
import {choosePlaceReading} from '../data/atlas/asia-place-readings';
import {Marker} from 'maplibre-gl';
type Config={industry:IndustryRegion;industryBase:string;countries:{code:string;name:string}[];industrySites?:typeof southCentralIndustrySites;industryGroups?:typeof southCentralIndustryGroups;industryOverview?:string};
const fmt=(value:number|null|undefined)=>value===null||value===undefined?'未掲載':value.toLocaleString('ja-JP',{maximumFractionDigits:2});
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const link=(label:string,url:string)=>{const a=el('a',label);if(/^https?:\/\//.test(url))a.href=url;return a;};
const option=(label:string,value:string)=>{const o=el('option',label);o.value=value;return o;};
export function createAsiaIndustry(root:HTMLElement,config:Config,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null,onReady:()=>void){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const region=config.industry;
 const regionalSites=config.industrySites??southCentralIndustrySites,regionalGroups=config.industryGroups??southCentralIndustryGroups,regionalOverview=config.industryOverview??southCentralIndustryOverview;
 let data:IndustryData|null=null,national:IndustryNational|null=null,pending:Promise<void>|null=null,failed=false,map:import('maplibre-gl').Map|null=null,revision=0;
 let siteLabels:Marker[]=[];
 const clearSiteLabels=()=>{for(const marker of siteLabels)marker.remove();siteLabels=[];};
 const countryName=(code:string)=>config.countries.find(c=>c.code===code)?.name??code;
 const current=()=>industryTopic(region,getState());
 const east=hasIndustryCountryScope(region);
 const southCentral=region.topics.some(t=>t.id==='sc-overview');
 const keepEastDistribution=(t:ReturnType<typeof current>)=>isEastIndustryRegion(region)&&(t.kind==='national'||t.kind==='steel');
 const mapValues=(t:ReturnType<typeof current>)=>keepEastDistribution(t)?industryValues(t,data!,national!,industryScopeCountries(region,null)):scopedValues(t);
 const eastJourney=root.querySelector<HTMLElement>('[data-east-industry-journey]');
 function renderEastJourney(){
  if(!eastJourney)return;
  const state=getState(),code=state.place;
  const selectedSite=eastIndustrySites.find(site=>site.id===state.story&&site.country===code&&state.topic==='manufacturing');
  root.dataset.industrySiteSelected=String(Boolean(selectedSite));
  eastJourney.hidden=state.field!=='industry'||!code||!['CHN','JPN','KOR','TWN'].includes(code)||!data||!national;
  if(eastJourney.hidden)return;
  const selected=eastJourney.querySelector<HTMLElement>('[data-east-industry-selected-site]');
  if(selected){selected.hidden=!selectedSite;if(selectedSite){selected.querySelector('[data-east-industry-selected-title]')!.textContent=selectedSite.name;selected.querySelector('[data-east-industry-selected-lead]')!.textContent=selectedSite.lead;selected.querySelector('[data-east-industry-selected-reading]')!.textContent=selectedSite.reading;selected.querySelector('[data-east-industry-selected-scope]')!.textContent=selectedSite.scope;const source=selected.querySelector<HTMLAnchorElement>('[data-east-industry-selected-source]')!;source.textContent=selectedSite.source.label;source.href=selectedSite.source.url;}}
  const manufacturing=national!.indicators.find(i=>i.id==='manufacturing')?.observations.find(o=>o.countryCode===code&&o.year===2024)?.value??null;
  const steel=data!.steel[code]?.total??null;
  const percentage=manufacturing===null?'未掲載':manufacturing.toLocaleString('ja-JP',{maximumFractionDigits:2})+'%';
  const capacity=steel===null?'未掲載':steel.toLocaleString('ja-JP')+'千t/年';
  const readings:Record<string,{summary:string;gap:string;steps:[string,string][]}>={
   CHN:{summary:`中国の2024年の製造業付加価値はGDPの${percentage}で、省別の粗鋼設備能力は別の尺度で立地を読む資料です。`,gap:'未収録：省別の全業種付加価値。追加には、定義と年を揃えた中国の省別公式統計が必要です。',steps:[['manufacturing','国全体の製造業を見る'],['cn-steel','省別の粗鋼設備を見る']]},
   JPN:{summary:`日本の2024年の製造業付加価値はGDPの${percentage}で、都道府県の製造品出荷額等は部品・素材も含む別の尺度です。`,gap:'未収録：県別の産業全体の付加価値。追加には、出荷額とは区別できる公式の県民経済計算が必要です。',steps:[['manufacturing','国全体の製造業を見る'],['jp-00','県別の製造品出荷額を見る']]},
   KOR:{summary:`韓国の2024年の製造業付加価値はGDPの${percentage}です。半導体拠点の例では製造とメモリーの役割を別に読みます。`,gap:'未収録：韓国内の地域別・業種別産業統計。拠点例は地域別統計や製造業全体の分布を補う数値ではありません。追加には、同じ定義と年で比較できる韓国の公式地域統計が必要です。',steps:[['manufacturing','国全体の製造業を見る'],['steel-capacity','収録された粗鋼設備を見る']]},
   TWN:{summary:'台湾の製造業付加価値はWDIで未掲載です。新竹・台南の半導体受託製造拠点を位置と役割で読み、国全体の欠測とは分けます。',gap:'未掲載：台湾のWDI製造業付加価値。追加には台湾の公式統計をWDIと定義・年で照合する必要があります。',steps:[['steel-capacity','収録された粗鋼設備を見る'],['power-all','収録された発電施設を見る']]},
  };
  const reading=readings[code!];
  eastJourney.querySelector('[data-east-industry-journey-title]')!.textContent=countryName(code!)+'の主要産業を読む';
  eastJourney.querySelector('[data-east-industry-journey-summary]')!.textContent=reading.summary;
  eastJourney.querySelector('[data-east-industry-journey-facts]')!.textContent=`2024年の製造業付加価値：${percentage}（GDP比・WDI）。2026年6月版のGEM対象粗鋼設備能力：${capacity}。設備能力は実生産量ではありません。`;
  eastJourney.querySelector('[data-east-industry-journey-gap]')!.textContent=reading.gap;
  for(const [index,step] of reading.steps.entries()){const button=eastJourney.querySelector<HTMLButtonElement>(`[data-east-industry-next="${index?'secondary':'primary'}"]`)!;button.dataset.eastIndustryTopic=step[0];button.textContent=step[1];button.setAttribute('aria-current',state.topic===step[0]?'true':'false');}
  const sites=eastJourney.querySelector<HTMLElement>('[data-east-industry-sites]');
  if(sites){const matches=eastIndustrySites.filter(site=>site.country===code);sites.hidden=!matches.length;const links=sites.querySelector<HTMLElement>('[data-east-industry-site-links]')!;links.replaceChildren(...matches.map(site=>{const button=el('button',site.name);button.type='button';button.dataset.eastIndustrySite=site.id;button.setAttribute('aria-pressed',String(state.story===site.id));button.addEventListener('click',()=>navigate(choosePlaceReading(getState(),site),true));return button;}));}
 }
 function scopedValues(t:ReturnType<typeof current>){const countries=industryScopeCountries(region,getState().place).filter(code=>config.countries.some(c=>c.code===code)),values=industryValues(t,data!,national!,countries);if(!east||t.kind!=='power')return values;const ids=new Set(data!.power.filter(p=>countries.includes(p.country)).map(p=>p.id));return values.filter(v=>ids.has(v.id));}
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
  if(t.kind==='regional'){const site=regionalSites.find(s=>s.id===id&&(t.id==='sc-overview'||s.group===t.id));navigate({...state,detail:site?.id??null,point:site?.point??null,place:state.place,story:null,camera:camera()},false);return;}
  if(!record){navigate({...state,detail:null,point:null,camera:camera()},false);return;}
  navigate(normalizeIndustryState(region,{...state,detail:record.id,place:record.country,point:record.point??null,city:null,camera:null},data));
 }
 function detail(){const state=getState();return current().kind==='regional'?regionalSites.find(s=>s.id===state.detail&&(state.topic==='sc-overview'||s.group===state.topic)):current().kind==='admin'?data?.admin.find(a=>a.id===state.detail):data?.power.find(p=>p.id===state.detail);}
 function renderRegional(){
  const state=getState(),topic=current(),group=regionalGroups.find(g=>g.id===topic.id),sites=regionalSites.filter(s=>(!group||s.group===group.id)&&(!state.place||s.country===state.place)),selected=sites.find(s=>s.id===state.detail),content=$('[data-industry-content]'),legend=$('[data-industry-scale]');
  $('[data-industry-title]').textContent=state.place?`${countryName(state.place)}の産業立地例`:group?.title??'地域の産業分布';
  $('[data-industry-lead]').textContent=selected?selected.fact:state.place?`${countryName(state.place)}で出典を確認できた${sites.length}地点を示します。地点の説明で、立地とその理由を読んでください。`:(group?.fact??regionalOverview);
  $('[data-industry-value]').textContent=selected?selected.name:group?'地図の点から地域を選ぶと、立地の事実と理由を読めます。':'業種を選ぶと、代表的な地域の立地を比べられます。';
  $('[data-grid-reading]').textContent=selected?selected.name:'地図の点または一覧から地域を選べます。';
  $('[data-industry-definition]').textContent=selected?selected.reason:group?.reason??'点は出典で確認した地域の案内位置です。施設の境界や全国の網羅分布を表しません。';
  $('[data-industry-coverage]').textContent=`${sites.length}地点の立地例を表示しています。数や丸の大きさは、生産額・雇用者数・施設総数を表しません。`;
  $('[data-industry-status]').textContent='';$('[data-industry-retry]').hidden=true;
  $('[data-industry-search-label]').hidden=true;$('[data-industry-detail-label]').hidden=true;
  $('[data-map-title]').textContent=group?.title??'地域の産業分布';$('[data-map-eyebrow]').textContent='Industry · regional locations';$('[data-map-period]').textContent='代表的な立地例';$('[data-map-gesture]').textContent='地図の点を選ぶと、産業の場所と立地の理由を読めます。';
  $('[data-industry-legend-title]').textContent=group?.title??'地域の産業';legend.replaceChildren();
  for(const g of regionalGroups.filter(g=>!group||g.id===group.id)){const item=el('span'),swatch=el('i');swatch.style.backgroundColor=g.color;swatch.style.borderRadius='50%';item.append(swatch,document.createTextNode(g.title));legend.append(item);}
  $('[data-industry-legend-note]').textContent='色は産業の種類です。点は代表的な地域の案内位置で、工場敷地・採掘区画・生産規模を示しません。';
  const method=$('[data-industry-method]');method.replaceChildren(el('p','出典で位置と役割を確認できる立地例です。産業統計は別の資料・単位です。'),link('この主題の資料',selected?.source.url??group?.source.url??'https://www.ilo.org/media/438656/download'));
  content.replaceChildren();if(selected){content.append(el('h3',selected.name),el('p',selected.fact),el('p','立地を読む：'+selected.reason),link(selected.source.label,selected.source.url));}
  else{content.append(el('h3',group?'この業種の地域':'業種と地域を選ぶ'),el('p',group?.fact??regionalOverview));if(group)content.append(el('p','立地を読む：'+group.reason));}
  const list=el('div');list.className='sc-industry-site-list';for(const site of sites){const button=el('button',site.name);button.type='button';button.setAttribute('aria-pressed',String(selected?.id===site.id));button.addEventListener('click',()=>select(site.id));list.append(button);}content.append(el('h3','地図に示した地域'),list);
 }
 function table(caption:string,rows:{name:string;value:number|null;status?:string;click?:()=>void}[],unit:string){
  const t=el('table');t.className='industry-table';t.append(el('caption',caption+'（'+unit+'）'));
  const head=el('thead'),tr=el('tr');for(const name of ['対象・年','値']){const th=el('th',name);th.scope='col';tr.append(th);}head.append(tr);t.append(head);
  const body=el('tbody'),max=Math.max(0,...rows.map(r=>r.value??0));
  for(const r of rows){const line=el('tr'),name=el('th');name.scope='row';if(r.click){const b=el('button',r.name);b.type='button';b.addEventListener('click',r.click);name.append(b);}else name.textContent=r.name;const value=el('td',industryValueLabel(r));if(r.value!==null&&r.value>=0&&max>0){const bar=el('i');bar.className='industry-bar';bar.style.width=(r.value/max*100)+'%';bar.setAttribute('aria-hidden','true');value.append(bar);}line.append(name,value);body.append(line);}t.append(body);const notes=[...new Set(rows.filter(r=>r.value!==null&&r.status).map(r=>r.status!))];if(notes.length){const foot=el('tfoot'),line=el('tr'),note=el('td',notes.join('。'));note.colSpan=2;line.append(note);foot.append(line);t.append(foot);}return t;
 }
 function history(container:HTMLElement,series:IndustrySeries,unit:string){if(!series.length){container.append(el('p','この対象の時系列は収録していません。'));return;}const d=el('details');d.append(el('summary','年次の数値を読む'));d.append(table('公表値の推移',series.map(v=>({name:v.year,value:v.value,status:v.status})),unit));container.append(d);}
 function picker(){
  if(!data)return;const state=getState(),t=current(),input=$<HTMLInputElement>('[data-industry-search]');
  $('[data-industry-search-label]').hidden=t.kind!=='power';$('[data-industry-detail-label]').hidden=!['admin','power'].includes(t.kind);
  const selectEl=$<HTMLSelectElement>('[data-industry-detail]');selectEl.replaceChildren(option('選択を解除する',''));
  let records=t.kind==='admin'?data.admin.filter(a=>a.country===t.country&&a.point):t.kind==='power'?data.power.filter(p=>region.countries.includes(p.country)&&(!east||industryScopeCountries(region,state.place).includes(p.country))&&(!state.place||p.country===state.place)&&(t.fuel==='all'||p.fuel===t.fuel)&&(!input.value||p.name.toLowerCase().includes(input.value.toLowerCase()))).sort((a,b)=>(b.capacity??0)-(a.capacity??0)):[];
  const selected=detail();if(t.kind==='power'){records=records.slice(0,100);if(selected&&!records.some(r=>r.id===selected.id))records.unshift(selected as any);}
  const values=scopedValues(t);
  for(const r of records){const observation=values.find(v=>v.id===r.id);selectEl.append(option(r.name+' · '+countryName(r.country)+' · '+industryValueLabel(observation),r.id));}selectEl.value=state.detail??'';
 }
 function render(){
  const state=getState(),active=state.field==='industry'&&current().kind!=='trade';$('[data-industry-panel]').hidden=!active;$('[data-industry-topics]').hidden=state.field!=='industry';$('[data-industry-legend]').hidden=!active;
  renderEastJourney();
  const regionReading=root.querySelector<HTMLElement>('[data-industry-region-reading]');if(regionReading)regionReading.hidden=southCentral||!east||state.field!=='industry'||!!state.place;
  const countryReading=root.querySelector<HTMLElement>('[data-industry-country-reading]');if(countryReading){countryReading.hidden=!east||state.field!=='industry'||!state.place;if(!countryReading.hidden){countryReading.querySelector('[data-industry-country-reading-title]')!.textContent=countryName(state.place!)+'の収録範囲';countryReading.querySelector('[data-industry-country-reading-text]')!.textContent=state.place==='TWN'?'台湾のWorld Bank WDI系列は未掲載で、他国の値で補っていません。国連Comtradeは台湾等を含む「Other Asia, nes」（報告区分490）であり、台湾だけの厳密な値とは言い切れません。中国本土156とは合算しません。鉄鋼の設備能力と発電施設はそれぞれの原資料の収録範囲で読みます。':state.place==='JPN'?'日本の都道府県別製造品出荷額等は2024年・百万円です。国全体の付加価値や商品輸出額とは単位・定義が異なります。国内の業種を切り替えると、同じ県の産業構成を確認できます。':state.place==='CHN'?'中国の省別鉄鋼は稼働区分の設備能力です。年の実生産量ではありません。製造業・サービス業の国全体の指標、商品貿易と分けて確認できます。':'韓国は国全体の産業指標、鉄鋼の設備能力、発電施設、商品貿易を収録しています。韓国内の地域別・業種別産業統計は未収録で、日本や中国の国内統計で補っていません。';}}
  if(countryReading&&region.countryScope){const reading=state.place?region.countryScope.readings?.[state.place]:null;const source=countryReading.querySelector<HTMLElement>('[data-industry-country-reading-source]');if(reading){countryReading.querySelector('[data-industry-country-reading-title]')!.textContent=reading.title;countryReading.querySelector('[data-industry-country-reading-text]')!.textContent=reading.reading+' '+reading.scope;}if(source){source.hidden=!reading;if(reading){const a=source.querySelector<HTMLAnchorElement>('a')!;a.textContent=reading.source.label;a.href=reading.source.url;}}}
  root.dataset.industryScope=state.field==='industry'&&['national','steel'].includes(current().kind)?'overview':'detail';
  const scPicker=root.querySelector<HTMLElement>('[data-sc-industry-picker]');if(scPicker){scPicker.hidden=state.field!=='industry';const select=scPicker.querySelector<HTMLSelectElement>('select')!;select.value=state.field==='industry'&&state.place==='IND'&&['in-manufacturing','in-services'].includes(current().id)?current().id:current().kind==='regional'?current().id:'sc-overview';}
  if(!active)return;const t=current();$<HTMLSelectElement>('[data-industry-topic]').value=t.id;
  if(t.kind==='regional'){renderRegional();return;}
  $('[data-map-title]').textContent=t.title;$('[data-map-eyebrow]').textContent='Industry · '+t.year;$('[data-map-period]').textContent=t.unit;
  $('[data-industry-title]').textContent=t.title;$('[data-industry-definition]').textContent=t.note;
  $('[data-map-gesture]').textContent=t.kind==='power'?'施設の点か一覧から選ぶと、設備容量と出典を読めます。地図は2本指で移動・拡大できます。':'国・行政区域を地図か一覧から選ぶと、数値と順位を読めます。地図は2本指で移動・拡大できます。';
  const status=$('[data-industry-status]');status.textContent=failed?'産業のデータを取得できませんでした。出典と他分野は引き続き利用できます。':data&&national?'':'産業の数値と地図を読み込んでいます。';$('[data-industry-retry]').hidden=!failed;
  const method=$('[data-industry-method]');method.replaceChildren(el('p',t.year+' · '+t.unit+'。'+t.note),link('この主題の一次資料を開く',t.source));
  if(t.country)method.append(el('p',industryDomesticNotes[t.country]));
  if(!data||!national){$('[data-industry-lead]').textContent='国内の分布と国全体の構成を分けて読みます。';$('[data-industry-value]').textContent=status.textContent;$('[data-grid-reading]').textContent=status.textContent;if(!failed&&!pending)void load().then(()=>{render();if(getState().field==='industry')onReady();if(map)void show(map);}).catch(()=>render());return;}
  const values=scopedValues(t),scale=industryScale(t,mapValues(t)),record=detail(),selected=values.find(v=>v.id===(state.detail??state.place)),content=$('[data-industry-content]');content.replaceChildren();picker();
  const name=record?.name??(state.place?countryName(state.place):'地域全体');
  const message=t.kind==='power'?record?`${name}：${industryValueLabel({value:(record as any).capacity})} MW · ${industryFuelNames[(record as any).fuel]??(record as any).fuel}`:'収録された発電施設の位置を示しています。点を選ぶと設備容量を読めます。':selected?`${name}：${industryValueLabel(selected)} ${t.unit}（${t.year}）`:'地図か地域の一覧から選ぶと、同年・同じ単位の値を表示します。';
  $('[data-industry-value]').textContent=message;$('[data-grid-reading]').textContent=message;
  const covered=values.filter(v=>v.value!==null).length;
  $('[data-industry-coverage]').textContent=t.kind==='admin'?`国内の${values.length}地域中${covered}地域の値を収録しています。地域への総額で、面積当たりの密度ではありません。灰色は${industryMissingLabel(t)}で、状態は選択欄と表で区別します。公表0は色分けと順位に含めます。`:t.kind==='power'?`この主題で${values.length.toLocaleString('ja-JP')}施設を収録しています。施設の一覧は選んだ国と検索語で絞り込み、設備容量が大きい順に100件を示します。地図の点には現在の対象国で収録された施設を表示します。${east?'2021年の公開版で、現在の稼働施設の全数ではありません。':'モルディブと東ティモールはこの版に記録がありません。'}`:`この${east&&state.place?'選択範囲':'地域'}の${values.length}か国・地域中${covered}か国・地域に同年の値があります。灰色は未掲載で、0ではありません。`;
  const legend=$('[data-industry-scale]');legend.replaceChildren();$('[data-industry-legend-title]').textContent=t.title+' · '+t.year;
  if(t.kind==='power'){
   for(const [fuel,color] of Object.entries(industryFuelColors)){if(t.fuel!=='all'&&t.fuel!==fuel)continue;const span=el('span'),i=el('i');i.style.backgroundColor=color;span.append(i,document.createTextNode(industryFuelNames[fuel]));legend.append(span);}
   $('[data-industry-legend-note]').textContent='点の半径は設備容量の平方根に比例し、見やすさのため3–18pxに制限しています（100MWで3px、1,000MWで9px、4,000MW以上で18px）。点の重なりと上下限があるため、色の面積から合計容量は読み取れません。';
   const plants=data.power.filter(p=>(!east||industryScopeCountries(region,state.place).includes(p.country))&&(!state.place||p.country===state.place)&&(t.fuel==='all'||p.fuel===t.fuel));
   const fuels=[...new Set(plants.map(p=>p.fuel))];
   $('[data-industry-lead]').textContent=record?`${name}は${countryName(record.country)}に記録された${industryFuelNames[(record as any).fuel]}の発電施設です。人口や水系の地図と同じ場所を見比べられます。`:`${state.place?countryName(state.place):'この地域'}の収録施設では${fuels.length}種類の電源を確認できます。水力・火力・再生可能エネルギーで立地が異なるかを比べてください。`;
   if(record){const p=record as any;content.append(el('h3','この施設の記録'),el('p',`設備容量の資料年：${p.capacityYear??'記載なし'}。位置情報：${p.locationSource||'記載なし'}。原資料：${p.source||'記載なし'}。`));if(p.url)content.append(link('施設の原資料',p.url));content.append(el('p','以下は資料に収録された報告発電量（GWh）です。設備容量（MW）とは単位・意味が異なり、推計発電量は混ぜていません。'));history(content,p.generation,'GWh（報告発電量）');if(p.generationSource)content.append(el('p','発電量の出典：'+p.generationSource));}
   content.append(table('同じ国・主題で収録された大きな施設',plants.sort((a,b)=>(b.capacity??0)-(a.capacity??0)).slice(0,12).map(p=>({name:p.name,value:p.capacity,click:()=>select(p.id)})),'MW'));
  }else{
   for(let i=0;i<industryColors.length;i++){const span=el('span'),swatch=el('i');swatch.style.backgroundColor=industryColors[i];const label=i===0?fmt(scale.breaks[0])+'未満':i===4?fmt(scale.breaks[3])+'以上':fmt(scale.breaks[i-1])+'以上'+fmt(scale.breaks[i])+'未満';span.append(swatch,document.createTextNode(label));legend.append(span);}const missing=el('span'),swatch=el('i');swatch.style.backgroundColor='#d2ceca';missing.append(swatch,document.createTextNode(industryMissingLabel(t)));legend.append(missing);
   if(t.id==='manufacturing'&&['KOR','TWN'].includes(state.place??'')){const marker=el('span'),swatch=el('i');swatch.style.backgroundColor='#ae5628';swatch.style.borderRadius='50%';marker.append(swatch,document.createTextNode('半導体拠点の例（量を示さない）'));legend.append(marker);}
   $('[data-industry-legend-note]').textContent=t.unit+'。'+(keepEastDistribution(t)?'東アジア4対象は同じ色区分で表示し、選んだ国を輪郭で示します。':'総額の主題は現在の地域の最大値に応じて区分しています。')+(t.id==='manufacturing'&&['KOR','TWN'].includes(state.place??'')?'丸は公式資料に記載のある都市付近の案内位置で、国の色・工場能力・生産量とは別です。':'')+'主題間で色の濃さをそのまま比較せず、値と単位を確認してください。'+(t.country==='JPN'?'秘匿（原表X）・該当なし（原表***）・未掲載は数値の順位に含めません。':'');
   const ranked=values.filter(v=>v.value!==null).sort((a,b)=>b.value!-a.value!);const top=ranked[0],topName=t.kind==='admin'?data.admin.find(a=>a.id===top?.id)?.name:top?countryName(top.id):null;
  $('[data-industry-lead]').textContent=selected?.value!==null&&selected?.value!==undefined?`${name}は、${t.year}年・${t.unit}の公表値がある${covered}${t.kind==='admin'?'地域':'か国・地域'}の中で${ranked.filter(v=>v.value!>selected.value!).length+1}番目の値です。${t.kind==='admin'?'国内の順位であり、別の国の通貨・定義とは直接比較できません。':'同じ年の同じ指標で比べています。'}`:selected?`${name}の${t.year}年の値は${industryValueLabel(selected)}です。数値の順位には含めません。`:top?`${t.year}年・${t.unit}の公表値がある${covered}${t.kind==='admin'?'地域':'か国・地域'}の中では、${topName}が最大です。${t.unit.includes('GDP')?'国全体の経済に占める比率として読みます。':'選択すると内訳や年次の変化を確認できます。'}`:'この年・範囲の公表値はありません。';
   if(t.kind==='admin'&&record){const r=record as IndustryAdmin;content.append(el('h3',r.name+'の産業を読む'),el('p',industryDomesticNotes[r.country]));history(content,r.series[t.id]??[],t.unit);
    if(industryMalaysiaReading[r.id])content.append(el('p',industryMalaysiaReading[r.id]),link('DOSMによる2025年の州経済の説明','https://www.dosm.gov.my/portal-main/release-content/gross-domestic-product-gdp-by-state-2025'));
    if(r.country==='IND'){const m=r.series['in-manufacturing']?.find(v=>v.year==='2022–23')?.value,s=r.series['in-services']?.find(v=>v.year==='2022–23')?.value;content.append(el('p',`${r.name}の2022–23年度の値は、製造業が${fmt(m)}、サービス業が${fmt(s)}です（いずれも2011–12年価格の10万ルピー）。両方の主題へ切り替えると、製造拠点の広がりとサービスの集中を別々に比較できます。これは州全体の経済の2区分で、州都だけの値ではありません。`));}
    if(r.country==='CHN'&&selected?.value!==null&&selected?.value!==undefined&&data.steel.CHN?.total)content.append(el('p',`${r.name}の稼働粗鋼能力は、この資料の中国の収録能力の${fmt(selected.value/data.steel.CHN.total*100)}%に当たります。年の実生産量の比率ではありません。製法別内訳と人口・水系の位置を併せて読むと、設備の規模と周辺条件を区別できます。`));
    if(r.country==='JPN'){const sectors=region.topics.filter(x=>x.country==='JPN'&&x.id!=='jp-00').map(x=>({name:x.title.replace('日本：',''),value:r.series[x.id]?.find(v=>v.year===x.year)?.value??null,status:r.series[x.id]?.find(v=>v.year===x.year)?.status,click:()=>navigate({...getState(),topic:x.id,camera:camera()},false)})).sort((a,b)=>(b.value??-1)-(a.value??-1));if(sectors[0]&&sectors[0].value!==null&&r.series['jp-00']?.[0]?.value){content.append(el('p',`${r.name}で出荷額が最も大きい公表業種は${sectors[0].name}です。製造業計の${fmt(sectors[0].value!/r.series['jp-00'][0].value!*100)}%を占めます。これは出荷額の構成比であり、従業者や付加価値の構成比ではありません。`));}content.append(table('24業種の製造品出荷額等（2024年）',sectors,'百万円'),el('p',`製造業の従業者数は${fmt(r.employment2025)}人です（2025年6月1日、個人経営を除く）。`));}
    if(r.steelMethods)content.append(table('設備能力の製法別内訳',Object.entries(r.steelMethods).map(([name,value])=>({name,value})),'千t/年'));
   }else if(t.kind==='national'&&state.place){const indicator=national.indicators.find(i=>i.id===t.id)!;history(content,indicator.observations.filter(o=>o.countryCode===state.place).sort((a,b)=>a.year-b.year).map(o=>({year:String(o.year),value:o.value})),t.unit);if(national.missingNotes[state.place])content.append(el('p',national.missingNotes[state.place]));content.append(table('国全体の産業構成（2024年）',['agriculture','industry','services'].map(id=>{const i=national!.indicators.find(x=>x.id===id)!;return{name:i.label,value:i.observations.find(o=>o.countryCode===state.place&&o.year===2024)?.value??null};}),'GDP比 %'),el('p','工業・建設には製造業が含まれます。税などの扱いにより、この3区分が必ず100%になるとは限りません。'));
   }
   if(east&&state.place&&t.kind!=='admin')$('[data-industry-lead]').textContent=message+'。この国の値を表示しています。地域内の同年比較へは「東アジア全体」で戻れます。';
   content.append(table(t.kind==='admin'?'国内の地域を同じ年で比較する':east&&state.place?'選択した国・地域の値':'国・地域を同じ年で比較する',[...ranked,...values.filter(v=>v.value===null)].map(v=>({name:t.kind==='admin'?data!.admin.find(a=>a.id===v.id)!.name:countryName(v.id),value:v.value,status:v.status,click:t.kind==='admin'?data!.admin.find(a=>a.id===v.id)?.point?()=>select(v.id):undefined:()=>navigate({...getState(),place:v.id,detail:null,point:null,camera:getState().place===v.id?camera():null},getState().place!==v.id)})),t.unit));
  }
 }
 const layerIds=['asia-industry-national','asia-industry-admin','asia-industry-admin-lines','asia-industry-admin-selected','asia-industry-power','asia-industry-power-hit','asia-industry-power-selected','asia-industry-site','asia-industry-site-hit','asia-industry-regional','asia-industry-regional-hit','asia-industry-regional-selected'];
 async function show(currentMap:import('maplibre-gl').Map){
  map=currentMap;const seq=++revision;clearSiteLabels();
  for(const id of layerIds)if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
  if(getState().field!=='industry'||current().kind==='trade')return;
  if(current().kind==='regional'){
   if(!map.getSource('asia-industry-regional')){map.addSource('asia-industry-regional',{type:'geojson',data:{type:'FeatureCollection',features:regionalSites.map(site=>({type:'Feature',properties:{id:site.id,group:site.group,country:site.country,color:regionalGroups.find(g=>g.id===site.group)?.color??'#648075'},geometry:{type:'Point',coordinates:site.point}}))}});map.addLayer({id:'asia-industry-regional',type:'circle',source:'asia-industry-regional',paint:{'circle-radius':8,'circle-color':['get','color'],'circle-opacity':.9,'circle-stroke-color':'#fff','circle-stroke-width':1.5}});map.addLayer({id:'asia-industry-regional-hit',type:'circle',source:'asia-industry-regional',paint:{'circle-radius':16,'circle-opacity':0}});map.addLayer({id:'asia-industry-regional-selected',type:'circle',source:'asia-industry-regional',paint:{'circle-radius':12,'circle-opacity':0,'circle-stroke-color':'#852d24','circle-stroke-width':3}});}
   const topic=current(),filter:any=['all',...(topic.id==='sc-overview'?[]:[['==',['get','group'],topic.id]]),...(getState().place?[['==',['get','country'],getState().place]]:[])];for(const id of ['asia-industry-regional','asia-industry-regional-hit']){map.setFilter(id,filter);map.setLayoutProperty(id,'visibility','visible');}map.setFilter('asia-industry-regional-selected',['all',filter,['==',['get','id'],getState().detail??'']]);map.setLayoutProperty('asia-industry-regional-selected','visibility','visible');return;
  }
  // A late map-ready/rebuild must not start a second request behind the retry UI.
  if(failed){render();return;}
  try{await load();}catch{render();return;}
  if(seq!==revision||getState().field!=='industry'||current().kind==='trade'||map!==currentMap)return;
  const t=current(),state=getState(),values=mapValues(t),scale=industryScale(t,values);
  if(t.kind==='admin'&&!map.getSource('asia-industry-admin')){map.addSource('asia-industry-admin',{type:'geojson',data:data!.geometry});map.addLayer({id:'asia-industry-admin',type:'fill',source:'asia-industry-admin',paint:{'fill-color':'#d2ceca','fill-opacity':.95}});map.addLayer({id:'asia-industry-admin-lines',type:'line',source:'asia-industry-admin',paint:{'line-color':'#64736f','line-width':.6}});map.addLayer({id:'asia-industry-admin-selected',type:'line',source:'asia-industry-admin',paint:{'line-color':'#a4412e','line-width':2.5}});}
  if((t.kind==='national'||t.kind==='steel')&&!map.getLayer('asia-industry-national'))map.addLayer({id:'asia-industry-national',type:'fill',source:map.getSource('asia-population-geography')?'asia-population-geography':'asia-countries',filter:['in',['get','code'],['literal',region.countries]],paint:{'fill-color':'#d2ceca','fill-opacity':.88}},map.getLayer('asia-population-border')?'asia-population-border':'asia-country-border');
  if(t.kind==='power'){
   if(!map.getSource('asia-industry-power')){map.addSource('asia-industry-power',{type:'geojson',data:{type:'FeatureCollection',features:data!.power.map(p=>({type:'Feature',properties:{id:p.id,country:p.country,fuel:p.fuel,capacity:p.capacity??0},geometry:{type:'Point',coordinates:p.point}}))}});const color:any=['match',['get','fuel'],...Object.entries(industryFuelColors).flat(), '#666'];map.addLayer({id:'asia-industry-power',type:'circle',source:'asia-industry-power',paint:{'circle-radius':['min',18,['max',3,['*',.28460499,['^',['get','capacity'],.5]]]],'circle-color':color,'circle-opacity':.7,'circle-stroke-color':'#fff','circle-stroke-width':.5}});map.addLayer({id:'asia-industry-power-hit',type:'circle',source:'asia-industry-power',paint:{'circle-radius':12,'circle-opacity':0}});map.addLayer({id:'asia-industry-power-selected',type:'circle',source:'asia-industry-power',paint:{'circle-radius':20,'circle-opacity':0,'circle-stroke-color':'#ac372c','circle-stroke-width':2.5}});}
   const filter:any=['all',['in',['get','country'],['literal',region.countries]],...(t.fuel==='all'?[]:[['==',['get','fuel'],t.fuel]]),...(east?[['in',['get','country'],['literal',industryScopeCountries(region,state.place)]]]:[]),...(state.place?[['==',['get','country'],state.place]]:[])];
   for(const id of ['asia-industry-power','asia-industry-power-hit']){map.setFilter(id,filter);map.setLayoutProperty(id,'visibility','visible');}map.setFilter('asia-industry-power-selected',['all',filter,['==',['get','id'],state.detail??'']]);map.setLayoutProperty('asia-industry-power-selected','visibility','visible');
  }else{const id=t.kind==='admin'?'asia-industry-admin':'asia-industry-national',expr:any=['match',['get',t.kind==='admin'?'id':'code'],...values.flatMap(v=>[v.id,scale.color(v.value)]),'#d2ceca'];map.setPaintProperty(id,'fill-color',expr);map.setLayoutProperty(id,'visibility','visible');if(t.kind!=='admin'&&east)map.setFilter(id,['in',['get','code'],['literal',industryScopeCountries(region,keepEastDistribution(t)?null:state.place)]]);if(t.kind==='admin'){for(const id of ['asia-industry-admin','asia-industry-admin-lines'])map.setFilter(id,['==',['get','country'],t.country!]);map.setLayoutProperty('asia-industry-admin-lines','visibility','visible');map.setFilter('asia-industry-admin-selected',['==',['get','id'],state.detail??'']);map.setLayoutProperty('asia-industry-admin-selected','visibility','visible');}}
  if(isEastIndustryRegion(region)&&t.id==='manufacturing'&&['KOR','TWN'].includes(state.place??'')){
   if(!map.getSource('asia-industry-site')){map.addSource('asia-industry-site',{type:'geojson',data:{type:'FeatureCollection',features:eastIndustrySites.map(site=>({type:'Feature',properties:{id:site.id,country:site.country},geometry:{type:'Point',coordinates:site.point!}}))}});map.addLayer({id:'asia-industry-site',type:'circle',source:'asia-industry-site',paint:{'circle-radius':8,'circle-color':'#ae5628','circle-stroke-color':['case',['==',['get','id'],state.story??''],'#a4412e','#fff'],'circle-stroke-width':['case',['==',['get','id'],state.story??''],3,2]}});map.addLayer({id:'asia-industry-site-hit',type:'circle',source:'asia-industry-site',paint:{'circle-radius':16,'circle-opacity':0}});}
   const filter:any=['==',['get','country'],state.place];for(const id of ['asia-industry-site','asia-industry-site-hit']){map.setFilter(id,filter);map.setLayoutProperty(id,'visibility','visible');}
   map.setPaintProperty('asia-industry-site','circle-stroke-color',['case',['==',['get','id'],state.story??''],'#a4412e','#fff']);map.setPaintProperty('asia-industry-site','circle-stroke-width',['case',['==',['get','id'],state.story??''],3,2]);
   for(const site of eastIndustrySites.filter(site=>site.country===state.place)){
    const label=el('button',site.name.split('：')[0]);label.type='button';label.className='asia-industry-site-label';label.setAttribute('aria-label',site.name+'の説明を開く');label.setAttribute('aria-pressed',String(state.story===site.id));label.addEventListener('click',event=>{event.stopPropagation();navigate(choosePlaceReading(getState(),site),true);});
    const above=site.id==='pyeongtaek-semiconductor';siteLabels.push(new Marker({element:label,anchor:above?'right':'left',offset:above?[-12,-10]:[12,site.id==='cheongju-memory'?12:0]}).setLngLat(site.point!).addTo(map));
   }
  }
 }
 $('[data-industry-retry]').addEventListener('click',()=>{failed=false;render();});
 for(const button of eastJourney?.querySelectorAll<HTMLButtonElement>('[data-east-industry-next]')??[])button.addEventListener('click',()=>{const state=getState(),topic=button.dataset.eastIndustryTopic;if(!topic||!region.topics.some(t=>t.id===topic))return;const same=topic===state.topic;navigate({...state,topic,detail:same?state.detail:null,point:same?state.point:null,camera:camera()},false);});
 $<HTMLSelectElement>('[data-industry-detail]').addEventListener('change',e=>select((e.target as HTMLSelectElement).value));
 $<HTMLInputElement>('[data-industry-search]').addEventListener('input',picker);
 $<HTMLSelectElement>('[data-industry-topic]').addEventListener('change',e=>{const topic=region.topics.find(t=>t.id===(e.target as HTMLSelectElement).value)!;navigate({...getState(),field:'industry',sector:null,subsector:null,topic:topic.id,detail:topic.kind==='trade'&&current().kind==='trade'?getState().detail:null,place:topic.country??getState().place,point:null,city:null,camera:topic.country&&topic.country!==getState().place?null:camera()},!!topic.country&&topic.country!==getState().place);});
 root.querySelector<HTMLSelectElement>('[data-sc-industry-topic]')?.addEventListener('change',event=>{const id=(event.target as HTMLSelectElement).value;const india=id.startsWith('in-');navigate({...getState(),field:'industry',topic:id,place:india?'IND':null,detail:null,point:null,story:null,city:null,camera:camera()},false);});
 return{render,show,select,detail,normalize:(state:AsiaState)=>normalizeIndustryState(region,state,data),hit:(point:any)=>{if(!map)return false;const t=current();if(t.kind==='regional'){const feature=map.queryRenderedFeatures(point,{layers:['asia-industry-regional-hit']})[0];if(feature?.properties?.id){select(feature.properties.id);return true;}return false;}if(t.id==='manufacturing'&&map.getLayer('asia-industry-site-hit')&&map.getLayoutProperty('asia-industry-site-hit','visibility')==='visible'){const feature=map.queryRenderedFeatures(point,{layers:['asia-industry-site-hit']})[0],site=eastIndustrySites.find(s=>s.id===feature?.properties?.id&&s.country===getState().place);if(site){navigate(choosePlaceReading(getState(),site),true);return true;}}const layer=t.kind==='admin'?'asia-industry-admin':t.kind==='power'?'asia-industry-power-hit':null;if(!layer||!map.getLayer(layer))return false;const f=map.queryRenderedFeatures(point,{layers:[layer]})[0];if(f?.properties.id){select(f.properties.id);return true;}return false;}};
}
