import {southeastIndustrySectors,southeastIndustrySites,southeastSiteSectors,type SoutheastIndustryKind,type SoutheastIndustrySector} from '../data/atlas/asia/southeast-asia-industry-sites';
import {southeastIndustryProfiles,southeastIndustryProfile} from '../data/atlas/asia/southeast-asia-industry-catalog';
import {southeastMapKindSectors,southeastPreferredSector,southeastSectorKindLabel,southeastMapLabels} from '../data/atlas/asia/southeast-industry-map-scenes';
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
 const categories=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-overview-kind]')];
 const picker=query<HTMLSelectElement>('[data-southeast-industry-picker]');
 const sectors=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-industry-sector]')];
 const list=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-industry-site]')];
 const summary=query('[data-southeast-industry-summary]'),selected=query('[data-southeast-industry-selected]');
 let kind:'all'|SoutheastIndustryKind='all',sector:SoutheastIndustrySector='resource',selectedId:string|null=null,map:import('maplibre-gl').Map|null=null;
 function readURL(){
  const url=new URL(location.href),k=url.searchParams.get('industryKind'),raw=url.searchParams.get('industrySector'),s=raw==='resources'?'resource':raw,id=url.searchParams.get('industrySite');
  kind=southeastIndustryProfiles.some(p=>p.id===k)?k as SoutheastIndustryKind:'all';
  const site=southeastIndustrySites.find(p=>p.id===id&&p.kind===kind);
  sector=southeastIndustrySectors.some(p=>p.id===s)?s as typeof sector:site?southeastSiteSectors(site)[0]:kind==='all'?'resource':southeastPreferredSector(kind);
  if(kind!=='all'&&!southeastMapKindSectors(kind).includes(sector))kind='all';
  selectedId=site&&site.kind===kind&&southeastSiteSectors(site).includes(sector)?site.id:null;
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
 const legend=document.createElement('div');legend.className='southeast-industry-map-legend';legend.dataset.southeastIndustryLegend='';statistics.prepend(legend);
 const family=(site:typeof southeastIndustrySites[number])=>southeastSiteSectors(site).includes('resource')?'resource':southeastSiteSectors(site).includes('services')?site.kind==='logistics'?'network':'service':'factory';
 const inSector=(site:typeof southeastIndustrySites[number])=>southeastSiteSectors(site).includes(sector);
 for(const site of southeastIndustrySites){
  const button=document.createElement('button');button.type='button';button.hidden=true;button.className=`southeast-industry-map-point ${family(site)} ${site.stage}`;button.setAttribute('aria-label',site.industryName+'・'+site.placeName+'の案内位置');button.title=site.label;button.dataset.southeastIndustryPoint=site.id;button.addEventListener('click',event=>{event.stopPropagation();chooseSite(site.id);});overlay.append(button);points.set(site.id,button);
 }
 for(const group of southeastMapLabels){
  const label=document.createElement('button');label.type='button';label.hidden=true;label.className='southeast-industry-map-label';label.dataset.southeastIndustryLabel=group.id;label.dataset.southeastIndustryLabelSector=group.sector;label.setAttribute('aria-label',group.place+'の'+group.industry+'（'+group.siteIds.length+'案内位置）の解説');
  const industry=document.createElement('strong');industry.textContent=group.industry;const place=document.createElement('small');place.textContent=group.place;label.append(industry,place);
  label.addEventListener('click',event=>{event.stopPropagation();chooseSite(group.id);});overlay.append(label);labels.set(group.id,label);
 }
 function countryEvidence(active:boolean){
  if(!map||!map.getSource('asia-countries'))return;
  const layer='southeast-industry-country-evidence';
  const countries=sector!=='manufacturing'||kind==='all'?[]:southeastIndustryProfile(kind)?.countryEvidence??[];
  if(!map.getLayer(layer))map.addLayer({id:layer,type:'line',source:'asia-countries',filter:['in',['get','code'],['literal',[]]],paint:{'line-color':'#315f99','line-width':3,'line-dasharray':[2,1]}});
  map.setFilter(layer,['in',['get','code'],['literal',countries]]);
  map.setLayoutProperty(layer,'visibility',active&&countries.length?'visible':'none');
 }
 function position(){
  if(!map||overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;
  leaders.replaceChildren();const locations=southeastIndustrySites.filter(inSector).map(site=>({site,p:map!.project(site.point)}));
  for(const point of points.values())point.hidden=true;
  for(const label of labels.values())label.hidden=true;
  for(const {site,p} of locations){const point=points.get(site.id)!;point.style.left=p.x+'px';point.style.top=p.y+'px';point.hidden=p.x<8||p.x>width-8||p.y<8||p.y>height-8;}
  // Fixed groups belong to this sector; selection only changes emphasis.
  const compact=width<600;
  const candidates=southeastMapLabels.filter(g=>g.sectors.includes(sector)).map(group=>({group,p:map!.project(group.point)})).filter(({p})=>p.x>=8&&p.x<=width-8&&p.y>=8&&p.y<=height-8);
  const frame=overlay.getBoundingClientRect();
  const reserved=[root.querySelector<HTMLElement>('.asia-map-tools')].filter((node):node is HTMLElement=>!!node).map(node=>{const r=node.getBoundingClientRect();return {left:r.left-frame.left-3,top:r.top-frame.top-3,right:r.right-frame.left+3,bottom:r.bottom-frame.top+3};});
  const font=compact?11:12;
  const boxes=placeSoutheastIndustryLabels(candidates.map(({group,p})=>({id:group.id,x:p.x,y:p.y,width:Math.max(70,Math.max(group.place.length*10,group.industry.length*font)+12),height:32})),width,height,reserved,locations.map(x=>x.p));
  for(const {group,p} of candidates){const box=boxes.get(group.id);if(!box)continue;const label=labels.get(group.id)!;label.hidden=false;Object.assign(label.style,{left:box.left+'px',top:box.top+'px',width:box.right-box.left+'px',height:box.bottom-box.top+'px'});Object.assign(label.querySelector('strong')!.style,{fontSize:font+'px',letterSpacing:'normal'});
   const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.dataset.southeastIndustryLeader=group.id;line.setAttribute('x1',String(p.x));line.setAttribute('y1',String(p.y));line.setAttribute('x2',String(Math.max(box.left,Math.min(p.x,box.right))));line.setAttribute('y2',String(Math.max(box.top,Math.min(p.y,box.bottom))));line.classList.toggle('muted',kind!=='all'&&kind!==group.kind);leaders.append(line);
  }
  root.dataset.southeastIndustryLayoutReady='true';
 }
 function render(){
  const state=getState(),active=state.field==='industry'&&!state.place&&!['trade-exports','trade-imports'].includes(state.topic??'');
  root.dataset.southeastIndustryActive=String(active);root.dataset.southeastIndustryKind=kind;root.dataset.southeastIndustrySector=sector;
  overlay.dataset.southeastIndustryMapSector=sector;
  overlay.setAttribute('aria-label','東南アジア・'+southeastIndustrySectors.find(s=>s.id===sector)!.label+'の地図');
  overlay.hidden=!active||!map;controls.hidden=!active;story.hidden=!active;statistics.hidden=!active;countryEvidence(active);
  query('[data-southeast-palm-map-key]').hidden=!active||sector!=='manufacturing'||kind!=='palm';
  if(palmLoaded&&map)for(const id of ['southeast-palm-processing','southeast-palm-processing-lines'])map.setLayoutProperty(id,'visibility',active&&sector==='manufacturing'&&kind==='palm'?'visible':'none');
  legend.textContent=sector==='resource'?'■ 原料地域　● 加工・LNG・水力の案内位置':sector==='services'?'● 港湾・観光・業務都市の案内位置':'● 加工地区・LNG液化の案内位置';
  legend.textContent+='。記号の大きさは数量を表しません。短い細線は産業札との対応で、取引経路ではありません。';
  if(sector==='manufacturing'&&kind!=='all'&&southeastIndustryProfile(kind)?.countryEvidence?.length)legend.textContent+=' 青い国境は国単位の加工品貿易資料の確認範囲です。';
  query('[data-southeast-industry-map-stage]').textContent=sector==='resource'?'原料産地・LNG・水力と、関連する製錬・精製・原料加工の確認位置。共有する加工拠点も実工程名で区別。':sector==='manufacturing'?'製錬・精製・製品加工・LNG液化の地区。鉱床・植林・ゴム栽培地は資源・エネルギーの図で背景として読む。':'港湾・観光・金融・業務受託の都市。原料産地や製造地区はそれぞれ別の地図に表示。';
  const profile=kind==='all'?null:southeastIndustryProfile(kind)!;
  query('[data-southeast-industry-story-title]').textContent=profile?.label??southeastIndustrySectors.find(s=>s.id===sector)!.label+'の産業分布';
  summary.textContent=profile?.reading??southeastIndustrySectors.find(s=>s.id===sector)!.reading;
  query('[data-southeast-industry-why]').textContent=profile?.why??'資源域、加工地区、港湾・観光地・業務都市は異なる立地条件を持つ。原料の背景と加工工程、国別規模と個々の拠点を分けて示す。';
  query('[data-southeast-industry-caveat]').textContent=profile?.caveat??'地点は出典年の立地案内位置で、施設の全数や敷地・集積範囲を表さない。規模・設備能力の年、単位と出典は下の統計に示し、地点数・記号面積で産業規模を比較しない。';
  query('[data-southeast-industry-overview-statistics]').hidden=kind!=='all';
  const scaleNotes=[...root.querySelectorAll<HTMLElement>('[data-southeast-industry-scale-kind]')];
  for(const note of scaleNotes)note.hidden=note.dataset.southeastIndustryScaleSector!==sector||(kind!=='all'&&note.dataset.southeastIndustryScaleKind!==kind);
  query('[data-southeast-industry-site-scales]').hidden=scaleNotes.every(note=>note.hidden);
  for(const node of root.querySelectorAll<HTMLElement>('[data-southeast-industry-facts]'))node.hidden=node.dataset.southeastIndustryFacts!==kind;
  for(const node of root.querySelectorAll<HTMLElement>('[data-sea-overview-row]'))node.hidden=!southeastMapKindSectors(node.dataset.seaOverviewRow as SoutheastIndustryKind).includes(sector);
  for(const b of sectors)b.setAttribute('aria-pressed',String(b.dataset.southeastIndustrySector===sector));
  const option=(label:string,value:string)=>{const node=document.createElement('option');node.textContent=label;node.value=value;return node;};
  const options=[option('この分野の全産業','all'),...southeastIndustryProfiles.filter(p=>southeastMapKindSectors(p.id).includes(sector)).map(p=>option(southeastSectorKindLabel(p.id,sector),p.id))];
  picker.replaceChildren(...options);picker.value=kind;
  for(const b of categories)b.setAttribute('aria-pressed',String(b.dataset.southeastOverviewKind===kind));
  for(const site of southeastIndustrySites){const belongs=inSector(site),chosen=selectedId===site.id;const point=points.get(site.id)!,item=list.find(b=>b.dataset.southeastIndustrySite===site.id)!;point.hidden=!active||!map||!belongs;item.hidden=!belongs;for(const node of [point,item]){node.classList.toggle('muted',belongs&&kind!=='all'&&kind!==site.kind);node.classList.toggle('chosen',chosen);node.setAttribute('aria-pressed',String(chosen));}}
  for(const group of southeastMapLabels){const label=labels.get(group.id)!;label.hidden=!active||!map||!group.sectors.includes(sector);label.dataset.southeastIndustryLabelSector=sector;label.classList.toggle('muted',kind!=='all'&&kind!==group.kind);label.classList.toggle('chosen',!!selectedId&&group.siteIds.includes(selectedId));label.setAttribute('aria-pressed',String(!!selectedId&&group.siteIds.includes(selectedId)));}
  query('[data-southeast-industry-site-count]').textContent=String(southeastIndustrySites.filter(inSector).length);
  const site=southeastIndustrySites.find(x=>x.id===selectedId);selected.hidden=!site;
  if(site){query('[data-southeast-industry-selected-title]').textContent=site.label;query('[data-southeast-industry-selected-reading]').textContent=site.reading+' 案内位置であり、工場敷地の数値座標は未確認。資料年時点の事例で、現在の全施設一覧ではない。';query('[data-southeast-industry-selected-year]').textContent=site.sourceYear;const a=query<HTMLAnchorElement>('[data-southeast-industry-selected-source]');a.textContent=site.sourceLabel;a.href=site.sourceUrl;const group=southeastMapLabels.find(g=>g.siteIds.includes(site.id));const note=query('[data-southeast-industry-group-note]');note.hidden=!group||group.siteIds.length===1;note.textContent=group&&group.siteIds.length>1?'同じ産業札に'+group.place+'の'+group.siteIds.length+'案内位置をまとめています。各地点の工程と出典は立地案内に保持しています。':'';}
  query<HTMLButtonElement>('[data-southeast-industry-clear]').disabled=kind==='all'&&!selectedId;
  position();
 }
 function chooseSite(id:string){const site=southeastIndustrySites.find(s=>s.id===id);if(!site)return;selectedId=selectedId===id?null:id;if(!inSector(site))sector=southeastSiteSectors(site)[0];kind=site.kind;save();render();}
 for(const b of sectors)b.addEventListener('click',()=>{sector=b.dataset.southeastIndustrySector as typeof sector;kind='all';selectedId=null;save();render();});
 function chooseKind(next:string){if(next!=='all'&&(!southeastIndustryProfile(next)||!southeastMapKindSectors(next as SoutheastIndustryKind).includes(sector)))return;kind=next as typeof kind;selectedId=null;save();render();}
 for(const b of categories)b.addEventListener('click',()=>chooseKind(b.dataset.southeastOverviewKind!));
 picker.addEventListener('change',()=>chooseKind(picker.value));
 for(const b of list)b.addEventListener('click',()=>chooseSite(b.dataset.southeastIndustrySite!));
 query('[data-southeast-industry-clear]').addEventListener('click',()=>{kind='all';selectedId=null;save();render();});
 window.addEventListener('popstate',()=>{readURL();queueMicrotask(render);});
 return {render,show(next:import('maplibre-gl').Map|null){if(next&&next!==map){map=next;map.on('move',position);map.on('resize',position);void loadPalm();}render();}};
}
