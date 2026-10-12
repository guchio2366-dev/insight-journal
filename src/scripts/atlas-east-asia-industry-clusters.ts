import {eastSectors,eastSectorIndustries,eastSectorSites,eastSectorRows,eastIndustrySector} from '../data/atlas/east-asia-industry-sectors';
import {leaderEnd} from '../lib/atlas-nature-labels';
import {placeEastSectorNames} from '../lib/atlas-east-sector-names';
import type {AsiaState,AsiaCamera} from '../lib/atlas-asia-state';

export function createEastIndustryClusters(root:HTMLElement,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null){
 const host=root.querySelector<HTMLElement>('[data-east-cluster-reading]');
 let map:import('maplibre-gl').Map|null=null;
 const layer='asia-east-industry-clusters',labels=document.createElement('div');labels.className='east-industry-map-labels';root.querySelector('.asia-map-frame')?.append(labels);
 const active=()=>!!host&&getState().field==='industry'&&eastSectors.some(s=>s.topic===getState().topic)||!!host&&getState().field==='industry'&&eastSectorIndustries.some(i=>'east-'+i.id===getState().topic);
 const sector=()=>eastIndustrySector(getState().topic,getState().sector);
 const kinds=()=>eastSectorIndustries.filter(i=>i.sectors.includes(sector()));
 const selectedIndustry=()=>eastSectorIndustries.find(i=>'east-'+i.id===getState().topic);
 const rows=()=>eastSectorRows(sector());
 const visibleRows=()=>rows().filter(s=>!getState().only||s.industries.includes(selectedIndustry()?.id??''));
 const chooseIndustry=(id:string)=>navigate({...getState(),topic:'east-'+id,sector:sector(),place:null,detail:null,point:null,story:null,only:false,camera:camera()},false);
 const choose=(id:string)=>{const site=rows().find(s=>s.id===id);if(!site)return;const selected=selectedIndustry(),kind=site.industries.find(id=>selected?.id===id)??site.industries.find(id=>kinds().some(i=>i.id===id));navigate({...getState(),topic:'east-'+kind,sector:sector(),place:null,detail:id,point:null,story:null,camera:camera()},false);};
 function render(){
  if(!host)return;root.dataset.industryClusters=String(Boolean(active()));host.hidden=!active();labels.hidden=!active();const bottom=root.querySelector<HTMLElement>('[data-east-industry-statistics]');if(bottom)bottom.hidden=!active();if(!active())return;
  const s=getState(),item=selectedIndustry(),overview=eastSectors.find(g=>g.id===sector())!,selected=rows().find(c=>c.id===s.detail);
  root.dataset.industrySectorMap=sector();root.dataset.industrySectorView=s.only?'single':'all';
  for(const b of root.querySelectorAll<HTMLButtonElement>('[data-east-industry-sector]'))b.setAttribute('aria-pressed',String(b.dataset.eastIndustrySector===sector()));
  for(const nav of root.querySelectorAll<HTMLElement>('[data-east-industry-kinds]'))nav.hidden=nav.dataset.eastIndustryKinds!==sector();
  host.querySelector('[data-east-cluster-title]')!.textContent=item?item.label+'の立地':overview.label+'の分布';
  host.querySelector('[data-east-cluster-lead]')!.textContent=item?.lead??overview.lead;host.querySelector('[data-east-cluster-reason]')!.textContent=item?.reason??overview.reason;
  const only=host.querySelector<HTMLButtonElement>('[data-east-industry-only]')!;only.hidden=!item;only.textContent=s.only?'全体の分布へ戻す':'この産業だけ表示';only.setAttribute('aria-pressed',String(Boolean(s.only)));
  const clear=host.querySelector<HTMLButtonElement>('[data-east-industry-clear]')!;clear.hidden=!item;
  const detail=host.querySelector<HTMLElement>('[data-east-cluster-detail]')!;detail.replaceChildren();detail.hidden=!selected;
  if(selected){const h=document.createElement('h3');h.textContent=selected.name+'｜'+selected.stage;const p=document.createElement('p');p.textContent=selected.scope;const a=document.createElement('a');a.textContent='立地・工程の資料';a.href=selected.source;detail.append(h,p,a);for(const url of selected.sources??[]){const a=document.createElement('a');a.href=url;a.textContent='関連する立地資料';detail.append(a);}}
  const sources=host.querySelector<HTMLElement>('[data-east-cluster-sources]')!;sources.replaceChildren();for(const i of item?[item]:kinds()){const a=document.createElement('a');a.href=i.source;a.textContent=i.label+'の資料';sources.append(a);}
  const list=host.querySelector<HTMLElement>('[data-east-industry-site-list]')!;list.replaceChildren();for(const site of rows().filter(s=>!item||s.industries.includes(item.id))){const b=document.createElement('button');b.type='button';b.dataset.eastIndustrySite=site.id;b.textContent=site.name+'｜'+site.stage;b.setAttribute('aria-pressed',String(site.id===s.detail));b.onclick=()=>choose(site.id);list.append(b);}
  const value=root.querySelector('[data-grid-reading]');if(value)value.textContent=selected?selected.name+'：'+selected.stage:'色は産業、点は出典のある立地例。一定サイズで数量を表しません。選択した産業を強調し、ほかの分布も残します。';
  const legend=root.querySelector<HTMLElement>('[data-industry-legend]');if(legend){legend.hidden=false;root.querySelector('[data-industry-legend-title]')!.textContent=overview.label+'の産業';const scale=root.querySelector('[data-industry-scale]')!;scale.replaceChildren();for(const i of s.only&&item?[item]:kinds()){const span=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=i.color;span.append(swatch,i.label);scale.append(span);}root.querySelector('[data-industry-legend-note]')!.textContent='一定サイズの案内点。名称と色から立地例を読みます。未掲載は産業がないという意味ではありません。発電点は2021年資料で、現在の稼働・発電量ではありません。';}
 }
 function drawLabels(){
  labels.replaceChildren();if(!map||!active())return;const width=labels.clientWidth,height=labels.clientHeight;if(!width||!height)return;
  const s=getState(),selected=selectedIndustry(),catalog=kinds(),all=rows().map(c=>({c,p:map!.project(c.point)})).filter(({p})=>p.x>=6&&p.y>=6&&p.x<=width-6&&p.y<=height-6);
  const shown=new Set(visibleRows().map(s=>s.id)),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');labels.append(svg);
  // Layout uses every initial point and constant label dimensions. Selection,
  // site highlighting and single-item visibility never reprioritize anchors.
  const nameRows:{id:string;industry:string;anchors:{id:string;point:{x:number;y:number}}[];button:HTMLButtonElement}[]=[];
  for(const item of catalog){
   const sites=all.filter(({c})=>c.industries.includes(item.id));if(!sites.length)continue;
   const anchors=[sites[0]];const farthest=[...sites].sort((a,b)=>Math.hypot(b.p.x-sites[0].p.x,b.p.y-sites[0].p.y)-Math.hypot(a.p.x-sites[0].p.x,a.p.y-sites[0].p.y))[0];if(Math.hypot(farthest.p.x-sites[0].p.x,farthest.p.y-sites[0].p.y)>140)anchors.push(farthest);
   for(const [index,{c,p}] of anchors.entries()){const b=document.createElement('button');b.type='button';b.className='east-sector-map-label';b.dataset.industryLabel=item.id;b.dataset.labelAnchorSite=c.id;b.dataset.coordinate=c.point.join(',');b.style.setProperty('--industry-color',item.color);b.setAttribute('aria-label',item.label+'の地域全体の立地を強調');b.setAttribute('aria-pressed',String(item.id===selected?.id));b.textContent=item.label;b.style.visibility='hidden';labels.append(b);const id=item.id+'-'+index;nameRows.push({id,industry:item.id,anchors:(index?[{c,p}]:sites).map(({c,p})=>({id:c.id,point:{x:p.x,y:p.y}})),button:b});b.onclick=e=>{e.stopPropagation();chooseIndustry(item.id);};}
  }
  const obstacles=[{left:width-65,top:0,right:width,bottom:155},...all.map(({p})=>({left:p.x-6,right:p.x+6,top:p.y-6,bottom:p.y+6}))];nameRows.sort((a,b)=>Number(b.id.endsWith('-0'))-Number(a.id.endsWith('-0')));
  const placements=placeEastSectorNames(nameRows.map(row=>({id:row.id,industry:row.industry,anchors:row.anchors,width:Math.ceil(row.button.getBoundingClientRect().width),height:24})),{left:0,top:0,right:width,bottom:height},obstacles);
  for(const rect of placements){const b=nameRows.find(r=>r.id===rect.id)!.button,item=b.dataset.industryLabel!,end=leaderEnd(rect.anchor,rect);b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.visibility='visible';b.style.opacity=selected&&selected.id!==item?'.55':'1';b.hidden=Boolean(s.only&&selected?.id!==item);b.dataset.labelAnchor=JSON.stringify(rect.anchor);const source=all.find(({c})=>c.id===rect.site)!.c;b.dataset.labelAnchorSite=source.id;b.dataset.coordinate=source.point.join(',');const line=document.createElementNS(svg.namespaceURI,'line');line.dataset.industryNameLeader=rect.id;for(const [key,value] of Object.entries({x1:rect.anchor.x,y1:rect.anchor.y,x2:end.x,y2:end.y}))line.setAttribute(key,String(value));if(!b.hidden)svg.append(line);}
  for(const {c,p} of all){if(!shown.has(c.id))continue;const industryIds=c.industries.filter(id=>catalog.some(i=>i.id===id));for(const [index,id] of industryIds.entries()){const item=catalog.find(i=>i.id===id)!,mark=document.createElementNS(svg.namespaceURI,industryIds.length===1?'circle':'path');if(industryIds.length===1){mark.setAttribute('cx',String(p.x));mark.setAttribute('cy',String(p.y));mark.setAttribute('r','4.5');}else{const a=index/industryIds.length*2*Math.PI,b=(index+1)/industryIds.length*2*Math.PI;mark.setAttribute('d',`M ${p.x} ${p.y} L ${p.x+5*Math.cos(a)} ${p.y+5*Math.sin(a)} A 5 5 0 ${b-a>Math.PI?1:0} 1 ${p.x+5*Math.cos(b)} ${p.y+5*Math.sin(b)} Z`);}mark.setAttribute('fill',item.color);mark.setAttribute('stroke','#fff');mark.setAttribute('stroke-width','.7');mark.dataset.industry=id;mark.dataset.clusterMark=c.id;mark.setAttribute('opacity',selected&&!c.industries.includes(selected.id)?'.5':'1');svg.append(mark);}
   if(selected&&c.industries.includes(selected.id)){const ring=document.createElementNS(svg.namespaceURI,'circle');for(const [key,value] of Object.entries({cx:p.x,cy:p.y,r:8,fill:'none',stroke:selected.color,'stroke-width':1.5}))ring.setAttribute(key,String(value));ring.dataset.industryFocus=c.id;svg.append(ring);}
   const b=document.createElement('button');b.type='button';b.className='east-industry-site-point';b.dataset.industryCluster=c.id;b.dataset.coordinate=c.point.join(',');b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.zIndex=selected&&c.industries.includes(selected.id)?'6':'3';b.setAttribute('aria-label',industryIds.map(id=>catalog.find(i=>i.id===id)!.label).join('・')+'｜'+c.name+'｜'+c.stage);b.setAttribute('aria-pressed',String(s.detail===c.id));const name=document.createElement('span');name.textContent=c.name+'｜'+c.stage;b.append(name);b.onclick=e=>{e.stopPropagation();choose(c.id);};labels.append(b);
  }
  root.dataset.industryNamedKinds=String(new Set([...labels.querySelectorAll<HTMLElement>('[data-industry-label]')].filter(n=>n.style.visibility==='visible'&&!n.hidden).map(n=>n.dataset.industryLabel)).size);
 }
 function show(currentMap:import('maplibre-gl').Map){if(map!==currentMap){map=currentMap;map.on('moveend',drawLabels);map.on('resize',drawLabels);}if(!active()){if(map.getLayer(layer))map.setLayoutProperty(layer,'visibility','none');labels.hidden=true;return;}
  labels.hidden=false;const data={type:'FeatureCollection' as const,features:visibleRows().map(c=>({type:'Feature' as const,properties:{id:c.id},geometry:{type:'Point' as const,coordinates:c.point}}))};if(!map.getSource(layer)){map.addSource(layer,{type:'geojson',data});map.addLayer({id:layer,type:'circle',source:layer,paint:{'circle-radius':7,'circle-color':'#fff','circle-opacity':0}});}else(map.getSource(layer) as import('maplibre-gl').GeoJSONSource).setData(data);map.setLayoutProperty(layer,'visibility','visible');drawLabels();}
 function hit(point:any){if(!active()||!map?.getLayer(layer))return false;const f=map.queryRenderedFeatures(point,{layers:[layer]})[0];if(!f||!rows().some(s=>s.id===f.properties?.id))return false;choose(String(f.properties?.id));return true;}
 for(const b of root.querySelectorAll<HTMLButtonElement>('[data-east-industry-sector]'))b.addEventListener('click',()=>{const id=b.dataset.eastIndustrySector,selected=eastSectors.find(s=>s.id===id);if(selected)navigate({...getState(),topic:selected.topic,sector:id,place:null,detail:null,point:null,story:null,only:false,camera:camera()},false);});
 host?.querySelector('[data-east-industry-only]')?.addEventListener('click',()=>navigate({...getState(),only:!getState().only,camera:camera()},false));host?.querySelector('[data-east-industry-clear]')?.addEventListener('click',()=>navigate({...getState(),topic:eastSectors.find(s=>s.id===sector())!.topic,detail:null,only:false,camera:camera()},false));
 return {active,render,show,hit};
}
