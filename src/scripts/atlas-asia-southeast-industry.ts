import {southeastIndustryKinds,southeastIndustrySectors,southeastIndustrySites,southeastSiteSectors,type SoutheastIndustryKind,type SoutheastIndustrySector} from '../data/atlas/asia/southeast-asia-industry-sites';
import {southeastIndustryProfiles,southeastIndustryProfile} from '../data/atlas/asia/southeast-asia-industry-catalog';
import {placeSoutheastIndustryLabels} from '../lib/atlas-southeast-industry-labels';
import type {AsiaState} from '../lib/atlas-asia-state';

/** Regional evidence stays separate from national GDP and legacy trade layers. */
export function createSoutheastIndustryLocations(root:HTMLElement,getState:()=>AsiaState){
 const overlay=root.querySelector<HTMLElement>('[data-southeast-industry-map]');
 if(!overlay)return {show(_map:import('maplibre-gl').Map|null){},render(){}};
 const query=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const controls=query('[data-southeast-industry-controls]'),story=query('[data-industry-region-reading]'),statistics=query('[data-southeast-industry-statistics]');
 query('.asia-layout').before(controls);
 query('[data-reading-dock]').append(story);
 query('[data-asia-statistics]').after(statistics);
 const categories=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-industry-kind],[data-southeast-overview-kind]')];
 const buttonKind=(b:HTMLButtonElement)=>b.dataset.southeastIndustryKind??b.dataset.southeastOverviewKind!;
 const sectors=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-industry-sector]')];
 const list=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-industry-site]')];
 const summary=query('[data-southeast-industry-summary]'),selected=query('[data-southeast-industry-selected]');
 let kind:'all'|SoutheastIndustryKind='all',sector:'all'|SoutheastIndustrySector='all',selectedId:string|null=null,map:import('maplibre-gl').Map|null=null;
 function readURL(){
  const url=new URL(location.href),k=url.searchParams.get('industryKind'),s=url.searchParams.get('industrySector'),id=url.searchParams.get('industrySite');
  kind=southeastIndustryProfiles.some(p=>p.id===k)?k as SoutheastIndustryKind:'all';
  sector=southeastIndustrySectors.some(p=>p.id===s)?s as typeof sector:'all';
  if(kind!=='all'&&sector!=='all'&&!southeastIndustryProfile(kind)!.sectors.includes(sector))sector='all';
  selectedId=southeastIndustrySites.some(p=>p.id===id&&p.kind===kind)?id:null;
 }
 readURL();
 let palmLoading:Promise<void>|null=null,palmLoaded=false;
 async function loadPalm(){
  if(!map||palmLoading)return;
  const target=map;
  palmLoading=(async()=>{try{
   const response=await fetch(import.meta.env.BASE_URL+'assets/atlas/southeast-industry-20261014/palm-processing.geojson');if(!response.ok)throw new Error('州別加工地図の取得失敗');
   const geometry=await response.json();
   target.addSource('southeast-palm-processing',{type:'geojson',data:geometry});
   target.addLayer({id:'southeast-palm-processing',type:'fill',source:'southeast-palm-processing',layout:{visibility:'none'},paint:{'fill-color':['step',['get','inputTonnes'],'#edf2e0',1000000,'#9bbdae',3000000,'#397a67'],'fill-opacity':.85}},'asia-country-border');
   target.addLayer({id:'southeast-palm-processing-lines',type:'line',source:'southeast-palm-processing',layout:{visibility:'none'},paint:{'line-color':'#42695b','line-width':.8}},'asia-country-border');
   palmLoaded=true;root.dataset.southeastPalmStateReady='true';render();
  }catch{root.dataset.southeastPalmStateReady='false';query('[data-southeast-palm-map-status]').textContent='州別の加工地図を取得できませんでした。下の処理量と出典は引き続き読めます。';}})();
 }
 function save(){const url=new URL(location.href);for(const [key,value] of [['industryKind',kind],['industrySector',sector],['industrySite',selectedId]]){if(value&&value!=='all')url.searchParams.set(key,value);else url.searchParams.delete(key);}if(url.href!==location.href)history.pushState(history.state,'',url);}
 const points=new Map<string,HTMLButtonElement>(),labels=new Map<string,HTMLButtonElement>();
 const leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');leaders.classList.add('southeast-industry-leaders');leaders.setAttribute('aria-hidden','true');overlay.append(leaders);
 const legend=document.createElement('div');legend.className='southeast-industry-map-legend';legend.dataset.southeastIndustryLegend='';legend.textContent='● 拠点・地区の案内位置　◆ 原料地域の案内位置\n細線＝札の対応線（取引経路ではない）\n青い国境＝国単位の加工品貿易資料';overlay.append(legend);
 const cue:Record<string,string>={'singapore-port':'4,466万TEU・2025','port-klang':'1,514万TEU・2025','bintulu-lng':'能力2,930万t/年','namtheun-hydro':'設備1,070MW・2019資料','jurong-petro':'100社超・JTC','johor-food':'粗油420万t・2025州計'};
 const family=(site:typeof southeastIndustrySites[number])=>site.stage==='raw'||site.kind==='energy'||site.kind==='hydro'?'resource':southeastSiteSectors(site).includes('services')?site.kind==='logistics'?'network':'service':'factory';
 const inSector=(site:typeof southeastIndustrySites[number])=>sector==='all'||southeastSiteSectors(site).includes(sector);
 for(const site of southeastIndustrySites){
  const button=document.createElement('button');button.type='button';button.className=`southeast-industry-map-point ${family(site)} ${site.stage}`;button.setAttribute('aria-label',site.industryName+'・'+site.placeName+'の案内位置');button.title=site.label;button.dataset.southeastIndustryPoint=site.id;button.addEventListener('click',event=>{event.stopPropagation();chooseSite(site.id);});overlay.append(button);points.set(site.id,button);
  const label=document.createElement('button');label.type='button';label.className=`southeast-industry-map-label ${family(site)}`;label.dataset.southeastIndustryLabel=site.id;label.setAttribute('aria-label',site.label+'の解説');
  const industry=document.createElement('strong');industry.textContent=site.industryName;const place=document.createElement('small');place.textContent=site.placeName;label.append(industry,place);
  if(cue[site.id]){const value=document.createElement('small');value.className='sea-map-quantity';value.textContent=cue[site.id];label.append(value);}
  label.addEventListener('click',event=>{event.stopPropagation();chooseSite(site.id);});overlay.append(label);labels.set(site.id,label);
 }
 function countryEvidence(active:boolean){
  if(!map||!map.getSource('asia-countries'))return;
  const layer='southeast-industry-country-evidence';
  const countries=kind==='all'?[]:southeastIndustryProfile(kind)?.countryEvidence??[];
  if(!map.getLayer(layer))map.addLayer({id:layer,type:'line',source:'asia-countries',filter:['in',['get','code'],['literal',[]]],paint:{'line-color':'#315f99','line-width':3,'line-dasharray':[2,1]}});
  map.setFilter(layer,['in',['get','code'],['literal',countries]]);
  map.setLayoutProperty(layer,'visibility',active&&countries.length?'visible':'none');
 }
 function position(){
  if(!map||overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;
  leaders.replaceChildren();const locations=southeastIndustrySites.map(site=>({site,p:map!.project(site.point)}));
  for(const {site,p} of locations){const point=points.get(site.id)!;point.style.left=p.x+'px';point.style.top=p.y+'px';point.hidden=p.x<8||p.x>width-8||p.y<8||p.y>height-8;labels.get(site.id)!.hidden=true;}
  // Compact screens keep one fixed label per mapped industry. Selection cannot
  // add labels, move another label, alter the solver order, or change text size.
  const compact=width<600,seen=new Set<string>();
  const candidates=locations.filter(({site})=>!points.get(site.id)!.hidden&&(!compact||!seen.has(site.kind)&&!!seen.add(site.kind)));
  const frame=overlay.getBoundingClientRect();
  const reserved=[legend,root.querySelector<HTMLElement>('.asia-map-tools')].filter((node):node is HTMLElement=>!!node).map(node=>{const r=node.getBoundingClientRect();return {left:r.left-frame.left-3,top:r.top-frame.top-3,right:r.right-frame.left+3,bottom:r.bottom-frame.top+3};});
  const boxes=placeSoutheastIndustryLabels(candidates.map(({site,p})=>({id:site.id,x:p.x,y:p.y,width:compact?112:130,height:cue[site.id]?52:40})),width,height,reserved);
  for(const {site,p} of candidates){const box=boxes.get(site.id);if(!box)continue;const label=labels.get(site.id)!;label.hidden=false;Object.assign(label.style,{left:box.left+'px',top:box.top+'px',width:box.right-box.left+'px',height:box.bottom-box.top+'px'});
   const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.dataset.southeastIndustryLeader=site.id;line.setAttribute('x1',String(p.x));line.setAttribute('y1',String(p.y));line.setAttribute('x2',String(Math.max(box.left,Math.min(p.x,box.right))));line.setAttribute('y2',String(Math.max(box.top,Math.min(p.y,box.bottom))));leaders.append(line);
  }
  root.dataset.southeastIndustryLayoutReady='true';
 }
 function render(){
  const state=getState(),active=state.field==='industry'&&!state.place&&!['trade-exports','trade-imports'].includes(state.topic??'');
  root.dataset.southeastIndustryActive=String(active);root.dataset.southeastIndustryKind=kind;root.dataset.southeastIndustrySector=sector;
  overlay.hidden=!active;controls.hidden=!active;story.hidden=!active;statistics.hidden=!active;countryEvidence(active);
  query('[data-southeast-palm-map-key]').hidden=!active||kind!=='palm';
  if(palmLoaded&&map)for(const id of ['southeast-palm-processing','southeast-palm-processing-lines'])map.setLayoutProperty(id,'visibility',active&&kind==='palm'?'visible':'none');
  const profile=kind==='all'?null:southeastIndustryProfile(kind)!;
  query('[data-southeast-industry-story-title]').textContent=profile?.label??southeastIndustrySectors.find(s=>s.id===sector)!.label+'の産業分布';
  summary.textContent=profile?.reading??southeastIndustrySectors.find(s=>s.id===sector)!.reading;
  query('[data-southeast-industry-why]').textContent=profile?.why??'資源域、加工地区、港湾・観光地・業務都市は異なる立地条件を持つ。原料の背景と加工工程、国別規模と個々の拠点を分けて示す。';
  query('[data-southeast-industry-caveat]').textContent=profile?.caveat??'地点は出典年の立地案内位置で、施設の全数や敷地・集積範囲を表さない。数量を確認できた港・設備は単位と年を札に併記し、地点数・記号面積で産業規模を比較しない。';
  query('[data-southeast-industry-overview-statistics]').hidden=kind!=='all';
  for(const node of root.querySelectorAll<HTMLElement>('[data-southeast-industry-facts]'))node.hidden=node.dataset.southeastIndustryFacts!==kind;
  for(const node of root.querySelectorAll<HTMLElement>('[data-sea-overview-row]'))node.hidden=sector!=='all'&&!southeastIndustryProfile(node.dataset.seaOverviewRow!)!.sectors.includes(sector);
  for(const b of sectors)b.setAttribute('aria-pressed',String(b.dataset.southeastIndustrySector===sector));
  for(const b of categories){const p=southeastIndustryProfile(buttonKind(b));b.setAttribute('aria-pressed',String(buttonKind(b)===kind));b.disabled=!!p&&sector!=='all'&&!p.sectors.includes(sector);}
  for(const site of southeastIndustrySites){const emphasis=inSector(site)&&(kind==='all'||kind===site.kind),chosen=selectedId===site.id;for(const item of [points.get(site.id)!,labels.get(site.id)!,list.find(b=>b.dataset.southeastIndustrySite===site.id)!]){item.classList.toggle('muted',!emphasis);item.classList.toggle('chosen',chosen);item.setAttribute('aria-pressed',String(chosen));}}
  const site=southeastIndustrySites.find(x=>x.id===selectedId);selected.hidden=!site;
  if(site){query('[data-southeast-industry-selected-title]').textContent=site.label;query('[data-southeast-industry-selected-reading]').textContent=site.reading+' 案内位置であり、工場敷地の数値座標は未確認。資料年時点の事例で、現在の全施設一覧ではない。';query('[data-southeast-industry-selected-year]').textContent=site.sourceYear;const a=query<HTMLAnchorElement>('[data-southeast-industry-selected-source]');a.textContent=site.sourceLabel;a.href=site.sourceUrl;}
  query<HTMLButtonElement>('[data-southeast-industry-clear]').disabled=kind==='all'&&!selectedId;
  position();
 }
 function chooseSite(id:string){const site=southeastIndustrySites.find(s=>s.id===id);if(!site)return;selectedId=selectedId===id?null:id;if(!inSector(site))sector=southeastSiteSectors(site)[0];kind=site.kind;save();render();}
 for(const b of sectors)b.addEventListener('click',()=>{sector=b.dataset.southeastIndustrySector as typeof sector;kind='all';selectedId=null;save();render();});
 for(const b of categories)b.addEventListener('click',()=>{if(b.disabled)return;kind=buttonKind(b) as typeof kind;selectedId=null;save();render();});
 for(const b of list)b.addEventListener('click',()=>chooseSite(b.dataset.southeastIndustrySite!));
 query('[data-southeast-industry-clear]').addEventListener('click',()=>{kind='all';selectedId=null;save();render();});
 window.addEventListener('popstate',()=>{readURL();queueMicrotask(render);});
 return {render,show(next:import('maplibre-gl').Map|null){if(next&&next!==map){map=next;map.on('move',position);map.on('resize',position);void loadPalm();}render();}};
}
