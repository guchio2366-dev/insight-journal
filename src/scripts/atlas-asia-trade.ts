import {isTradeTopic,tradeTopics,normalizeTradeState,tradeChapter,tradeFlow,tradeValue,tradeShare,tradeScale,tradeColors,formatTradeMoney,tradeCoverageNote,partnerName,farmTrade,farmTradeLabels,type TradeData,type TradeRegion} from '../data/atlas/asia-trade';
import {startAsiaComparison,type AsiaState,type AsiaCamera} from '../lib/atlas-asia-state';
import {eastIndustryCountries,industryCountryChoices,type IndustryRegion} from '../data/atlas/asia-industry';
type Config={industry?:IndustryRegion;trade:TradeRegion;tradeBase:string;chapters:Record<string,string>;countries:{code:string;name:string}[];domesticTopics:{id:string;country?:string}[]};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const pct=(v:number|null)=>v===null?'—':v>0&&v<.01?'0.01%未満':v.toLocaleString('ja-JP',{maximumFractionDigits:2})+'%';
export function createAsiaTrade(root:HTMLElement,config:Config,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 let data:TradeData|null=null,pending:Promise<void>|null=null,failed=false,map:import('maplibre-gl').Map|null=null,revision=0;
 const active=()=>getState().field==='industry'&&isTradeTopic(getState().topic);
 const scopeCountries=()=>config.industry?.countryScope?.regionalTrade&&getState().place?[getState().place!]:getState().field==='industry'&&eastIndustryCountries.every(c=>config.trade.countries.includes(c.code))?eastIndustryCountries.map(c=>c.code):config.trade.countries;
 const name=(code:string)=>config.countries.find(c=>c.code===code)?.name??code;
 const chapterName=(code:string)=>code==='TOTAL'?'全商品':config.chapters[code]+'（HS '+code+'）';
 async function load(){
  if(data)return;
  pending??=(async()=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);try{const r=await fetch(config.tradeBase+config.trade.file,{signal:abort.signal});if(!r.ok)throw Error(String(r.status));const raw=await r.arrayBuffer(),b=new Uint8Array(raw);data=JSON.parse(b[0]===31&&b[1]===139?await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(raw));failed=false;}catch(e){failed=true;throw e;}finally{clearTimeout(timer);pending=null;}})();
  return pending;
 }
 function request(){if(!data&&!pending&&!failed)void load().then(()=>{render();if(map)void show(map);}).catch(()=>render());}
 function compare(topic:string,detail:string|null=null){const next=startAsiaComparison(new URL(location.href),{...getState(),camera:camera()},'industry');navigate({...next,topic,detail},false);}
 type Row={label:string;value:number|null;share?:number|null;click?:()=>void};
 function table(caption:string,rows:Row[],shares=false){
  const t=el('table');t.className='trade-table';t.append(el('caption',caption+'（百万米ドル）'));
  const head=el('thead'),h=el('tr');for(const label of shares?['区分','金額','構成比']:['区分','金額']){const th=el('th',label);th.scope='col';h.append(th);}head.append(h);t.append(head);
  const body=el('tbody'),max=Math.max(0,...rows.map(r=>r.value??0));
  for(const r of rows){const tr=el('tr'),th=el('th');th.scope='row';if(r.click){const b=el('button',r.label);b.type='button';b.addEventListener('click',r.click);th.append(b);}else th.textContent=r.label;
   const td=el('td',formatTradeMoney(r.value));if(r.value!==null&&max>0){const bar=el('i');bar.style.width=r.value/max*100+'%';bar.setAttribute('aria-hidden','true');td.append(bar);}tr.append(th,td);if(shares)tr.append(el('td',pct(r.share??null)));body.append(tr);
  }t.append(body);return t;
 }
 function folded(container:HTMLElement,title:string,node:HTMLElement,open=false){const d=el('details');d.open=open;d.append(el('summary',title),node);container.append(d);}
 function chooseChapter(chapter:string){navigate({...getState(),detail:chapter==='TOTAL'?null:'t-'+chapter,camera:camera()},false);}
 function renderFarm(){
  const state=getState(),box=$('[data-farm-trade]'),topic=state.topic??'rice',mapping=farmTrade[topic],visible=state.field==='agriculture'&&!!mapping;box.hidden=!visible;if(!visible)return;box.replaceChildren(el('h3','生産地と商品貿易をつなげる'));
  box.append(el('p',mapping.note));
  if(!state.place){box.append(el('p','国・地域を選ぶと、対応する商品の2023年の輸出入額を確認できます。'));return;}
  if(!data){box.append(el('p',failed?'貿易の資料を取得できませんでした。':'関連する商品の貿易額を読み込んでいます。'));if(failed){const b=el('button','貿易データを再読み込み');b.type='button';b.addEventListener('click',retry);box.append(b);}else request();return;}
  const c=data.countries[state.place],note=tradeCoverageNote(state.place);if(note)box.append(el('p',note));
  box.append(el('p',`${name(state.place)}の国全体の金額です。地図の2020年の推計分布、FAOSTATの生産量、2023年の貿易額は、年と対象・単位が異なります。`));
  for(const code of mapping.codes){box.append(table((farmTradeLabels[code]??mapping.label)+' · HS '+code+' · 2023',[{label:'輸出',value:tradeValue(c,code,'X')},{label:'輸入',value:tradeValue(c,code,'M')}]))}
  const p=el('p','未掲載は0と区別します。輸出は再輸出を含み、商品の金額を生産重量で割って輸出比率や自給率を求めることはできません。');p.className='trade-note';box.append(p);
  const b=el('button','商品の章ごとに貿易を比べる');b.type='button';b.addEventListener('click',()=>compare('trade-exports','t-'+mapping.codes[0].slice(0,2)));box.append(b);
  const source=el('a','出典：UN Comtrade（2023年）');source.href='https://comtradeplus.un.org/';const line=el('p');line.append(source);box.append(line);
 }
 function render(){
  renderFarm();const state=getState(),visible=active();$('[data-trade-panel]').hidden=!visible;$('[data-trade-legend]').hidden=!visible;if(!visible)return;
  const flow=tradeFlow(state),direction=flow==='X'?'輸出':'輸入',chapter=tradeChapter(state),title=chapterName(chapter)+'の'+direction+'額';
  $('[data-map-title]').textContent=title;$('[data-map-eyebrow]').textContent='Trade · 2023';$('[data-map-period]').textContent='百万米ドル · 名目値';$('[data-trade-title]').textContent=title;
  $<HTMLSelectElement>('[data-industry-topic]').value=state.topic!;$<HTMLSelectElement>('[data-trade-chapter]').value=chapter;
  $('[data-trade-lead]').textContent='国の色は同じ年・商品区分の金額を表します。国を選ぶと、商品構成と輸出相手先を読み、国内の産業分布と比較できます。';
  $('[data-map-gesture]').textContent='国を地図か一覧で選ぶと、商品の構成と輸出先を読めます。地図は2本指で移動・拡大できます。';
  const scope=scopeCountries(),covered=data?scope.filter(code=>tradeValue(data!.countries[code],'TOTAL','exports')!==null).length:null;
  $('[data-trade-coverage]').textContent=`${config.industry?.countryScope?.regionalTrade&&state.place?name(state.place)+'の国全体の2023年の金額です。':'この地域の'+scope.length+'か国・地域'+(covered===null?'':`中${covered}か国・区分で、2023年の総額を収録しています。`)}商品区分ごとに未掲載もあります。灰色は未掲載で、取引が0という意味ではありません。`;
  $('[data-trade-status]').textContent=failed?'貿易の資料を取得できませんでした。再読み込みをお試しください。':data?'':'商品貿易の数値を読み込んでいます。';$('[data-trade-retry]').hidden=!failed;
  const content=$('[data-trade-content]');content.replaceChildren();$('[data-trade-domestic]').hidden=!state.place;
  if(!data){$('[data-trade-value]').textContent=$('[data-trade-status]').textContent;$('[data-grid-reading]').textContent=$('[data-trade-status]').textContent;request();return;}
  const values=scopeCountries().map(code=>({code,value:tradeValue(data!.countries[code],chapter,flow)})),scale=tradeScale(values.map(v=>v.value));
  const c=state.place?data.countries[state.place]:undefined,value=tradeValue(c,chapter,flow);
  const message=state.place?`${name(state.place)}：${formatTradeMoney(value)} 百万米ドル（2023年・${direction}）`:'国・地域を選ぶと、同じ区分の金額と構成を読めます。';
  $('[data-trade-value]').textContent=message;$('[data-grid-reading]').textContent=message;
  const legend=$('[data-trade-scale]');legend.replaceChildren();$('[data-trade-legend-title]').textContent=title+' · 2023年';
  for(let i=0;i<5;i++){const item=el('span'),swatch=el('i');swatch.style.background=tradeColors[i];item.append(swatch,document.createTextNode(i===0?formatTradeMoney(scale.breaks[0])+'未満':i===4?formatTradeMoney(scale.breaks[3])+'以上':formatTradeMoney(scale.breaks[i-1])+'–'+formatTradeMoney(scale.breaks[i])));legend.append(item);}const missing=el('span'),swatch=el('i');swatch.style.background='#d2ceca';missing.append(swatch,document.createTextNode('未掲載'));legend.append(missing);
  $('[data-trade-legend-note]').textContent='百万米ドル。表示地域の最大値に応じて区切ります。地域・品目・輸出入を切り替えたときは、色だけで比較せず値も確認してください。国の面積は金額の大きさを示しません。';
  if(state.place){
   const note=tradeCoverageNote(state.place);if(note)content.append(el('p',note));
   if(c&&Object.keys(c.products).length){
    const share=tradeShare(value,tradeValue(c,'TOTAL',flow)),total=tradeValue(c,'TOTAL',flow);
    if(chapter!=='TOTAL')content.append(el('p',`${chapterName(chapter)}は、この区分の${name(state.place)}の商品${direction}総額の${pct(share)}です。`));
    const chapters=Object.keys(config.chapters).map(code=>({label:chapterName(code),value:tradeValue(c,code,flow),share:tradeShare(tradeValue(c,code,flow),total),click:()=>chooseChapter(code)})).sort((a,b)=>(b.value??-1)-(a.value??-1));
    content.append(table(`${name(state.place)}の${direction}構成・金額上位10章`,chapters.filter(r=>r.value!==null).slice(0,10),true));folded(content,'すべての商品章と未掲載を読む',table('全商品章（構成比の分母は全商品総額）',chapters,true));
    content.append(el('p','HSの商品分類を、報告された分類版の2桁の章で集計しています。分類版：'+c.classifications.map(x=>x==='H6'?'HS2022':x==='H5'?'HS2017':x).join('・')+'。2桁の章は互いに重ならず、構成比の分母は全商品総額です。'));
    if(flow==='X'){
     const partners=c.partners[chapter];content.append(el('h3',chapterName(chapter)+'の輸出相手先'));
     if(partners){const rows=partners.values.map(([id,v])=>({label:partnerName(id,data!.partners[String(id)]),value:v,share:tradeShare(v,partners.world)}));content.append(table('輸出相手先・上位10区分',rows.slice(0,10),true));folded(content,'すべての輸出相手先を読む',table('全相手先（世界総額を分母にした割合）',rows,true));content.append(el('p','世界・地域グループの合計は相手先の順位に含めません。未特定の相手先は、資料の区分として残しています。これは輸送経路や最終消費地の記録ではありません。'));}
     else content.append(el('p','品目別の輸出相手先は、この国の輸出額上位3章だけを収録しています。この章の相手先は未収録です。国の全商品相手先とは区別してください。'));
     const p=el('p','相手先を読める章：');for(const code of ['TOTAL',...c.topChapters]){const b=el('button',chapterName(code));b.type='button';b.addEventListener('click',()=>chooseChapter(code));p.append(b);}content.append(p);
    }else content.append(el('p','輸入の相手先別内訳は、この版では収録していません。輸出額へ切り替えると、全商品と輸出上位3章の輸出相手先を読めます。'));
   }
  }
  const comparison=table('同年・同区分の国・地域の金額',values.sort((a,b)=>(b.value??-1)-(a.value??-1)).map(v=>({label:name(v.code)+(v.code==='TWN'?'（区分490）':''),value:v.value,click:!config.industry?.countryScope||industryCountryChoices(config.industry).some(c=>c.code===v.code)?()=>navigate({...getState(),place:v.code,point:null,camera:null}):undefined})));
  folded(content,'地域内の国・地域を比べる',comparison,!state.place);
 }
 async function show(currentMap:import('maplibre-gl').Map){
  map=currentMap;const sequence=++revision,id='asia-trade';if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');if(!active())return;
  if(failed&&!pending)return;try{await load();}catch{render();return;}if(sequence!==revision||map!==currentMap||!active())return;
  if(!map.getLayer(id))map.addLayer({id,type:'fill',source:map.getSource('asia-population-geography')?'asia-population-geography':'asia-countries',filter:['in',['get','code'],['literal',config.trade.countries]],paint:{'fill-color':'#d2ceca','fill-opacity':.92}},map.getLayer('asia-population-border')?'asia-population-border':'asia-country-border');
  const state=getState(),values=scopeCountries().map(code=>({code,value:tradeValue(data!.countries[code],tradeChapter(state),tradeFlow(state))})),scale=tradeScale(values.map(v=>v.value));map.setFilter(id,['in',['get','code'],['literal',scopeCountries()]]);map.setPaintProperty(id,'fill-color',['match',['get','code'],...values.flatMap(v=>[v.code,scale.color(v.value)]),'#d2ceca']);map.setLayoutProperty(id,'visibility','visible');
 }
 function retry(){failed=false;render();}
 const picker=$<HTMLSelectElement>('[data-trade-chapter]');for(const [code,label] of Object.entries(config.chapters).sort(([a],[b])=>a.localeCompare(b))){const o=el('option',label+'（HS '+code+'）');o.value=code;picker.append(o);}
 picker.addEventListener('change',()=>chooseChapter(picker.value));$('[data-trade-retry]').addEventListener('click',retry);
 $('[data-trade-domestic]').addEventListener('click',()=>compare(config.domesticTopics.find(t=>t.country===getState().place)?.id??'manufacturing'));
 return {active,render,show,normalize:(state:AsiaState)=>normalizeTradeState(state,config.chapters)};
}
