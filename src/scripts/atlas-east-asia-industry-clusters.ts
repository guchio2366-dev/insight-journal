import {eastSectors,eastSectorIndustries,eastSectorSites,eastSectorRows,eastIndustrySector} from '../data/atlas/east-asia-industry-sectors.ts';
import {leaderEnd} from '../lib/atlas-nature-labels.ts';
import {groupEastIndustryAnnotations,placeEastIndustryAnnotations,eastAnnotationKindLabel} from '../lib/atlas-east-industry-annotations.ts';
import type {AsiaState,AsiaCamera} from '../lib/atlas-asia-state';

export function createEastIndustryClusters(root:HTMLElement,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null){
 const host=root.querySelector<HTMLElement>('[data-east-cluster-reading]');
 let map:import('maplibre-gl').Map|null=null;
 const layer='asia-east-industry-clusters',labels=document.createElement('div');labels.className='east-industry-map-labels';root.querySelector('.asia-map-frame')?.append(labels);
 const symbols=host?document.createElement('p'):null;if(symbols){symbols.className='asia-gesture';symbols.dataset.eastIndustrySymbols='';symbols.hidden=true;symbols.textContent='● 採掘・受入・サービス　■ 製造・加工　◇ 設計オフィス。分割丸は複数産業。短線は地名の対応。近接する同一産業の地名を集約し、元の案内点は保持します。取引・輸送量は示しません。';root.querySelector('[data-map-gesture]')?.after(symbols);}
 const active=()=>!!host&&getState().field==='industry'&&eastSectors.some(s=>s.topic===getState().topic)||!!host&&getState().field==='industry'&&eastSectorIndustries.some(i=>'east-'+i.id===getState().topic);
 const sector=()=>eastIndustrySector(getState().topic,getState().sector);
 const kinds=()=>eastSectorIndustries.filter(i=>i.sectors.includes(sector()));
 const selectedIndustry=()=>eastSectorIndustries.find(i=>'east-'+i.id===getState().topic);
 const rows=()=>eastSectorRows(sector());
 const visibleRows=()=>rows().filter(s=>!getState().only||s.industries.includes(selectedIndustry()?.id??''));
 const choose=(id:string)=>{const site=rows().find(s=>s.id===id);if(!site)return;const selected=selectedIndustry(),kind=site.industries.find(id=>selected?.id===id)??site.industries.find(id=>kinds().some(i=>i.id===id));navigate({...getState(),topic:'east-'+kind,sector:sector(),place:null,detail:id,point:null,story:null,camera:camera()},false);};
 function render(){
  if(!host)return;root.dataset.industryClusters=String(Boolean(active()));host.hidden=!active();labels.hidden=!active();if(symbols)symbols.hidden=!active();const bottom=root.querySelector<HTMLElement>('[data-east-industry-statistics]');if(bottom)bottom.hidden=!active();if(!active())return;
  const s=getState(),item=selectedIndustry(),overview=eastSectors.find(g=>g.id===sector())!,selected=rows().find(c=>c.id===s.detail);
  let hasEvidence=false;
  for(const section of root.querySelectorAll<HTMLElement>('[data-east-evidence]')){section.hidden=section.dataset.eastEvidence!==item?.id;if(!section.hidden)hasEvidence=true;}
  for(const section of root.querySelectorAll<HTMLElement>('[data-east-evidence-overview]'))section.hidden=Boolean(item)||section.dataset.eastEvidenceOverview!==sector();
  const missing=root.querySelector<HTMLElement>('[data-east-evidence-missing]');if(missing)missing.hidden=!item||hasEvidence;
  const heading=root.querySelector<HTMLElement>('[data-east-evidence-heading]');if(heading)heading.textContent=(item?.label??overview.label)+'｜規模・世界での位置・供給網';
  root.dataset.industrySectorMap=sector();root.dataset.industrySectorView=s.only?'single':'all';
  for(const b of root.querySelectorAll<HTMLButtonElement>('[data-east-industry-sector]'))b.setAttribute('aria-pressed',String(b.dataset.eastIndustrySector===sector()));
  for(const nav of root.querySelectorAll<HTMLElement>('[data-east-industry-kinds]'))nav.hidden=nav.dataset.eastIndustryKinds!==sector();
  host.querySelector('[data-east-cluster-title]')!.textContent=item?item.label+'の立地':overview.label+'の分布';
  host.querySelector('[data-east-cluster-lead]')!.textContent=item?.lead??overview.lead;host.querySelector('[data-east-cluster-reason]')!.textContent=item?.reason??overview.reason;
  if(item?.id==='copper')host.querySelector('[data-east-cluster-lead]')!.textContent=sector()==='resources'?'南ゴビのオユ・トルゴイで銅を採掘・選鉱します。この資源図には鉱床に立地する工程を示し、東予の製錬は製造業図に分けます。':'愛媛の東予で輸入精鉱から電気銅を作ります。この製造業図には臨海の製錬工程を示し、南ゴビの採掘は資源図に分けます。個別の取引関係は示しません。';
  const only=host.querySelector<HTMLButtonElement>('[data-east-industry-only]')!;only.hidden=!item;only.textContent=s.only?'全体の分布へ戻す':'この産業だけ表示';only.setAttribute('aria-pressed',String(Boolean(s.only)));
  const clear=host.querySelector<HTMLButtonElement>('[data-east-industry-clear]')!;clear.hidden=!item;
  const detail=host.querySelector<HTMLElement>('[data-east-cluster-detail]')!;detail.replaceChildren();detail.hidden=!selected;
  if(selected){const h=document.createElement('h3');h.textContent=selected.name+'｜'+selected.stage;const p=document.createElement('p');p.textContent=selected.scope;const a=document.createElement('a');a.textContent='立地・工程の資料';a.href=selected.source;detail.append(h,p);if(selected.observedYear){const status=document.createElement('p');status.textContent=selected.observedYear+' · '+selected.status;detail.append(status);}detail.append(a);for(const url of selected.sources??[]){const a=document.createElement('a');a.href=url;a.textContent='関連する立地資料';detail.append(a);}}
  const sources=host.querySelector<HTMLElement>('[data-east-cluster-sources]')!;sources.replaceChildren();for(const i of item?[item]:kinds()){const a=document.createElement('a');a.href=i.source;a.textContent=i.label+'の資料';sources.append(a);}
  const list=host.querySelector<HTMLElement>('[data-east-industry-site-list]')!;list.replaceChildren();for(const site of rows().filter(s=>!item||s.industries.includes(item.id))){const b=document.createElement('button');b.type='button';b.dataset.eastIndustrySite=site.id;b.textContent=site.name+'｜'+site.stage;b.setAttribute('aria-pressed',String(site.id===s.detail));b.onclick=()=>choose(site.id);list.append(b);}
  const value=root.querySelector('[data-grid-reading]');if(value)value.textContent=selected?selected.name+'：'+selected.stage:'色は産業、点は出典のある立地例。一定サイズで数量を表しません。選択した産業を強調し、ほかの分布も残します。';
  const legend=root.querySelector<HTMLElement>('[data-industry-legend]');if(legend){legend.hidden=false;root.querySelector('[data-industry-legend-title]')!.textContent=overview.label+'の産業';const scale=root.querySelector('[data-industry-scale]')!;scale.replaceChildren();for(const i of s.only&&item?[item]:kinds()){const span=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=i.color;span.append(swatch,i.label);scale.append(span);}root.querySelector('[data-industry-legend-note]')!.textContent='選択した分野だけの案内点と色。短い地名は一部の近接拠点を集約した注記で、全拠点名・数量ではありません。未掲載は産業の不在を意味しません。発電点は2021年資料です。';}
 }
 function drawLabels(){
  labels.replaceChildren();if(!map||!active())return;const width=labels.clientWidth,height=labels.clientHeight;if(!width||!height)return;
  const s=getState(),selected=selectedIndustry(),catalog=kinds(),all=rows().map(c=>({c,p:map!.project(c.point)})).filter(({p})=>p.x>=6&&p.y>=6&&p.x<=width-6&&p.y<=height-6);
  const shown=new Set(visibleRows().map(s=>s.id)),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');labels.append(svg);
  // Passive, sparse geographic annotations replace the in-map industry menu.
  // Group/layout use every point in this sector, never the current selection.
  const groups=groupEastIndustryAnnotations(all.map(({c,p})=>({...c,screen:{x:p.x,y:p.y}})),sector(),catalog.map(i=>i.id));
  const annotations=groups.map(group=>{
   const node=document.createElement('span');node.className='east-industry-annotation';node.dataset.eastIndustryAnnotation=group.id;node.dataset.industryLabel=group.industry;node.dataset.labelAnchorSite=group.anchor.id;node.dataset.coordinate=group.anchor.point.join(',');node.dataset.annotationSites=group.members.map(s=>s.id).join(',');
   const place=document.createElement('small'),kind=document.createElement('strong'),item=catalog.find(i=>i.id===group.industry)!;place.textContent=group.place;kind.textContent=eastAnnotationKindLabel(group.industry,sector(),item.mapLabel??item.label);node.setAttribute('aria-label',kind.textContent+'：'+group.members.map(s=>s.name+'：'+s.stage).join('／'));node.append(kind,place);node.style.visibility='hidden';labels.append(node);
   return {group,node,width:Math.ceil(node.getBoundingClientRect().width)||group.place.length*10+kind.textContent.length*11+9,height:19};
  });
  const obstacles=[{left:width-65,top:0,right:width,bottom:155},...all.map(({p})=>({left:p.x-6,right:p.x+6,top:p.y-6,bottom:p.y+6}))];
  const placements=placeEastIndustryAnnotations(annotations.map(({group,width,height})=>({...group,width,height})),{left:0,top:0,right:width,bottom:height},obstacles);
  for(const rect of placements){const node=annotations.find(a=>a.group.id===rect.id)!.node;node.style.left=rect.left+'px';node.style.top=rect.top+'px';node.style.visibility='visible';node.dataset.annotationOverview=String(rect.overview);node.hidden=s.only?selected?.id!==rect.industry:!rect.overview;node.dataset.labelAnchor=JSON.stringify(rect.anchor.screen);
   const end=leaderEnd(rect.anchor.screen,rect),line=document.createElementNS(svg.namespaceURI,'line');line.dataset.industryNameLeader=rect.id;for(const [key,value] of Object.entries({x1:rect.anchor.screen.x,y1:rect.anchor.screen.y,x2:end.x,y2:end.y}))line.setAttribute(key,String(value));if(!node.hidden)svg.append(line);
  }
  for(const {c,p} of all){if(!shown.has(c.id))continue;const industryIds=c.industries.filter(id=>catalog.some(i=>i.id===id)&&(!s.only||id===selected?.id));for(const [index,id] of industryIds.entries()){const item=catalog.find(i=>i.id===id)!,office=/設計/.test(c.stage),processing=!['finance','digital','logistics','research'].includes(id)&&/製造|加工|製紙|製錬|精製|組立|検査|開発/.test(c.stage)&&!office,shape=industryIds.length>1||office?'path':processing?'rect':'circle',mark=document.createElementNS(svg.namespaceURI,shape);if(industryIds.length===1){if(office)mark.setAttribute('d',`M ${p.x} ${p.y-6} L ${p.x+6} ${p.y} L ${p.x} ${p.y+6} L ${p.x-6} ${p.y} Z`);else if(processing){mark.setAttribute('x',String(p.x-4.5));mark.setAttribute('y',String(p.y-4.5));mark.setAttribute('width','9');mark.setAttribute('height','9');}else{mark.setAttribute('cx',String(p.x));mark.setAttribute('cy',String(p.y));mark.setAttribute('r','4.5');}}else{const a=index/industryIds.length*2*Math.PI,b=(index+1)/industryIds.length*2*Math.PI;mark.setAttribute('d',`M ${p.x} ${p.y} L ${p.x+5*Math.cos(a)} ${p.y+5*Math.sin(a)} A 5 5 0 ${b-a>Math.PI?1:0} 1 ${p.x+5*Math.cos(b)} ${p.y+5*Math.sin(b)} Z`);}mark.setAttribute('fill',item.color);mark.setAttribute('stroke','#fff');mark.setAttribute('stroke-width','.7');mark.dataset.industry=id;mark.dataset.clusterMark=c.id;mark.setAttribute('opacity',selected&&!c.industries.includes(selected.id)?'.5':'1');svg.append(mark);}
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
