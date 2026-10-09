import {eastClusters,eastIndustries} from '../data/atlas/east-asia-industry-clusters';
import {layoutNatureLabels,leaderEnd} from '../lib/atlas-nature-labels';
import type {AsiaState,AsiaCamera} from '../lib/atlas-asia-state';

export function createEastIndustryClusters(root:HTMLElement,getState:()=>AsiaState,navigate:(state:AsiaState,fit?:boolean)=>void,camera:()=>AsiaCamera|null){
 const host=root.querySelector<HTMLElement>('[data-east-cluster-reading]');
 let map:import('maplibre-gl').Map|null=null;
 const layer='asia-east-industry-clusters';
 const labels=root.ownerDocument.createElement('div');labels.className='east-industry-map-labels';
 root.querySelector('.asia-map-frame')?.append(labels);
 const active=()=>!!host&&getState().field==='industry'&&(getState().topic??'').startsWith('east-');
 const rows=()=>{const s=getState(),id=s.topic?.slice(5);return eastClusters.filter(c=>(!s.place||s.place===c.country)&&(id==='clusters'||c.industries.includes(id as any)));};
 const choose=(id:string)=>navigate({...getState(),detail:id,point:null,story:null,camera:camera()},false);
 function render(){
  if(!host)return;root.dataset.industryClusters=String(active());host.hidden=!active();labels.hidden=!active();if(!active())return;
  const s=getState(),industry=eastIndustries.find(i=>'east-'+i.id===s.topic),selected=rows().find(c=>c.id===s.detail);
  host.querySelector('[data-east-cluster-title]')!.textContent=industry?industry.label+'の集積':'東アジアの主要産業の集積';
  host.querySelector('[data-east-cluster-lead]')!.textContent=industry?.lead??'自動車・半導体・鉄鋼・電池は複数の国・地域に立地し、造船と石油化学は海岸・港の条件と強く結びつきます。台湾の半導体も初期図に含めます。';
  host.querySelector('[data-east-cluster-reason]')!.textContent=industry?.reason??'沿海部の港は原料と製品の大量輸送を支え、大都市の市場と人材が工業集積を育てます。内陸の武漢などは河川・鉄道の結節点と既存の産業基盤に結びつきます。半導体は研究開発と材料・装置の連携、自動車は部品の頻繁な納入、造船・鉄鋼・化学は広い用地と物流の条件が重要です。';
  const detail=host.querySelector<HTMLElement>('[data-east-cluster-detail]')!;detail.replaceChildren();detail.hidden=!selected;
  if(selected){const h=document.createElement('h3');h.textContent=selected.name;const p=document.createElement('p');p.textContent=selected.industries.map(id=>eastIndustries.find(i=>i.id===id)!.label).join('・')+'の代表的な立地。点は都市付近の案内位置で、工場敷地や地域の生産量ではありません。';const a=document.createElement('a');a.textContent='立地の資料';a.href=selected.source;detail.append(h,p,a);for(const url of selected.sources??[]){const extra=document.createElement('a');extra.href=url;extra.textContent='関連産業の立地資料';detail.append(extra);}}
  const sources=host.querySelector<HTMLElement>('[data-east-cluster-sources]')!;sources.replaceChildren();
  for(const i of industry?[industry]:eastIndustries){const a=document.createElement('a');a.href=i.source;a.textContent=i.label+'の資料';sources.append(a);}
  const value=root.querySelector('[data-grid-reading]');if(value)value.textContent=selected?selected.name+'：'+selected.industries.map(id=>eastIndustries.find(i=>i.id===id)!.label).join('・'):'色は産業の種類、点は代表的な都市・工業地域です。記号の大きさは量を示しません。';
  const legend=root.querySelector<HTMLElement>('[data-industry-legend]')!;legend.hidden=false;
  root.querySelector('[data-industry-legend-title]')!.textContent='産業の種類';const scale=root.querySelector('[data-industry-scale]')!;scale.replaceChildren();for(const i of industry?[industry]:eastIndustries){const span=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=i.color;span.append(swatch,i.label);scale.append(span);}root.querySelector('[data-industry-legend-note]')!.textContent='都市付近の代表点。一つの都市に複数の産業がある場合は複数色を表示します。未掲載の地域にも産業があります。';
 }
 function drawLabels(){
  labels.replaceChildren();if(!map||!active())return;
  const width=labels.clientWidth,height=labels.clientHeight,visible=rows().map(c=>({c,p:map!.project(c.point)})).filter(({p})=>p.x>0&&p.x<width&&p.y>0&&p.y<height);
  const desktop=window.innerWidth>=960;
  const entries=visible.map(({c,p})=>{
   const kinds=c.industries.filter(id=>getState().topic==='east-clusters'||'east-'+id===getState().topic);
   const button=document.createElement('button');button.type='button';button.dataset.industryCluster=c.id;
   if(desktop){
    const primary=document.createElement('span');primary.className='east-industry-label-primary';primary.dataset.clusterIndustries='';
    for(const id of kinds){const kind=document.createElement('span');kind.dataset.industry=id;kind.style.setProperty('--industry-color',eastIndustries.find(i=>i.id===id)!.color);kind.textContent=eastIndustries.find(i=>i.id===id)!.label;primary.append(kind);}
    const city=document.createElement('span');city.className='east-industry-label-city';city.dataset.clusterCity='';city.textContent=c.name;button.append(primary,city);
   }else button.textContent=c.name;
   button.setAttribute('aria-label',kinds.map(id=>eastIndustries.find(i=>i.id===id)!.label).join('、')+'（'+c.name+'）');
   button.setAttribute('aria-pressed',String(getState().detail===c.id));button.style.visibility='hidden';button.style.width='max-content';
   button.onclick=e=>{e.stopPropagation();choose(c.id);};labels.append(button);
   return {c,p,kinds,button};
  });
  const placed=layoutNatureLabels(entries.map(({c,p,button})=>{const size=button.getBoundingClientRect();return {id:c.id,anchor:p,width:desktop?Math.ceil(size.width):c.name.length*11+12,height:desktop?Math.ceil(size.height):24};}),{left:0,top:0,right:width,bottom:height},[{left:width-65,top:0,right:width,bottom:150}]);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');labels.prepend(svg);
  for(const {c,p,kinds} of entries){for(const [index,id] of kinds.entries()){const mark=document.createElementNS(svg.namespaceURI,kinds.length===1?'circle':'path');if(kinds.length===1){mark.setAttribute('cx',String(p.x));mark.setAttribute('cy',String(p.y));mark.setAttribute('r','5');}else{const a=index/kinds.length*2*Math.PI,b=(index+1)/kinds.length*2*Math.PI;mark.setAttribute('d',`M ${p.x} ${p.y} L ${p.x+5*Math.cos(a)} ${p.y+5*Math.sin(a)} A 5 5 0 ${b-a>Math.PI?1:0} 1 ${p.x+5*Math.cos(b)} ${p.y+5*Math.sin(b)} Z`);}mark.setAttribute('data-industry',id);mark.setAttribute('data-cluster-mark',c.id);mark.setAttribute('fill',eastIndustries.find(i=>i.id===id)!.color);mark.setAttribute('stroke','#fff');mark.setAttribute('stroke-width','.6');svg.append(mark);}}

  for(const rect of placed){const {button}=entries.find(e=>e.c.id===rect.id)!;button.style.left=rect.left+'px';button.style.top=rect.top+'px';button.style.width=(rect.right-rect.left)+'px';button.style.height=(rect.bottom-rect.top)+'px';button.style.visibility='visible';button.dataset.clusterAnchor=JSON.stringify(rect.anchor);const end=leaderEnd(rect.anchor,rect),line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('data-cluster-leader',rect.id);for(const [key,value] of Object.entries({x1:rect.anchor.x,y1:rect.anchor.y,x2:end.x,y2:end.y}))line.setAttribute(key,String(value));svg.append(line);}
 }
 function show(currentMap:import('maplibre-gl').Map){
  if(map!==currentMap){map=currentMap;map.on('moveend',drawLabels);map.on('resize',drawLabels);}
  if(!active()){if(map.getLayer(layer))map.setLayoutProperty(layer,'visibility','none');labels.hidden=true;return;}
  labels.hidden=false;
  const features=rows().map(c=>({type:'Feature' as const,properties:{id:c.id},geometry:{type:'Point' as const,coordinates:c.point}}));
  const data={type:'FeatureCollection' as const,features};
  if(!map.getSource(layer)){map.addSource(layer,{type:'geojson',data});map.addLayer({id:layer,type:'circle',source:layer,paint:{'circle-radius':7,'circle-color':'#fff','circle-opacity':0}});}else(map.getSource(layer) as import('maplibre-gl').GeoJSONSource).setData(data);
  map.setLayoutProperty(layer,'visibility','visible');drawLabels();
 }
 function hit(point:any){if(!active()||!map?.getLayer(layer))return false;const f=map.queryRenderedFeatures(point,{layers:[layer]})[0];if(!f)return false;choose(String(f.properties?.id));return true;}
 return {active,render,show,hit};
}
