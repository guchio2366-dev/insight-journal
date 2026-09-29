import { layoutNatureLabels, leaderEnd, type Box, type Point, type LabelPlacement } from './atlas-nature-labels';
import { layoutClimateCodes, type CodePlacement } from './atlas-climate-code-labels';
import type { FarmingItem } from './atlas-europe-farming';
import climateLabels from '../data/atlas/europe/map-labels.json';

export const majorClimateCities = ['london','paris','berlin','warsaw','kyiv','moscow','madrid','lisbon','rome','athens','reykjavik','bergen','oslo','helsinki','budapest'];
const compactCities = ['london','paris','moscow','madrid','rome','athens','reykjavik','helsinki'];
type Place = { id:string; name:string; coordinates:number[] };
type Annotation = Place & { kind:'city'|'feature'|'crop'; button:HTMLButtonElement; line:SVGLineElement; dot:SVGCircleElement };
type View = { climate:boolean; crops:boolean; detailed:boolean; city:string; feature?:string; places:Place[]; farmingIds?:string[]; selectedFarming?:string };

/** One screen-space annotation layer is shared by MapLibre and the SVG fallback. */
export function createEuropeAnnotations(stage:HTMLElement, cities:Place[], features:Place[], getView:()=>View, project:(coordinate:number[])=>Point, select:(kind:'city'|'feature'|'crop', id:string)=>void, farmingItems:FarmingItem[] = []) {
  const overlay=stage.querySelector<HTMLElement>('[data-eu-annotations]')!;
  const svg=overlay.querySelector<SVGSVGElement>('svg')!;
  const ns='http://www.w3.org/2000/svg';
  const create=<K extends keyof SVGElementTagNameMap>(name:K)=>document.createElementNS(ns,name);
  const items:Annotation[]=[];
  const mapNames:Record<string,string>={danube:'ドナウ川',rhine:'ライン川',alps:'アルプス山脈'};
  const farmingPlaces=farmingItems.map(({labelCoordinate,...item})=>({...item,coordinates:labelCoordinate}));
  for(const [kind, places] of [['city',cities],['feature',features],['crop',farmingPlaces]] as const) for(const place of places) {
    const name=kind==='feature'?(mapNames[place.id]??place.name):place.name;
    const button=document.createElement('button');button.type='button';button.className='eu-map-label';button.textContent=name;
    if(kind==='crop'){
      const item=farmingItems.find(item=>item.id===place.id)!;
      button.classList.add('eu-crop-label');button.style.setProperty('--crop-color',item.color);button.dataset.euFarmingKind=item.kind;
    }
    button.dataset.euMapPlace=place.id;button.dataset.euMapKind=kind;
    button.setAttribute('aria-label',name+(kind==='city'?'の雨温図':kind==='crop'?'の分布を選択':'の解説'));
    button.addEventListener('click',e=>{e.stopPropagation();select(kind,place.id);});
    const line=create('line');line.classList.add('eu-label-leader');
    const dot=create('circle');dot.classList.add('eu-label-dot');dot.setAttribute('r','3.5');
    svg.append(line,dot);overlay.append(button);items.push({...place,kind,button,line,dot});
  }
  const codeElements=new Map(climateLabels.labels.map(label=>{
    const group=create('g'),line=create('line'),text=create('text');
    group.dataset.euClimateCode=label.code;line.classList.add('eu-code-leader');text.classList.add('eu-climate-code');text.textContent=label.code;
    group.append(line,text);svg.prepend(group);return [label.id,{group,line,text}] as const;
  }));
  let placements:LabelPlacement[]=[], codes:CodePlacement[]=[];
  const codeCoordinates=new Map<string,number[]>();
  let pending=0, needsLayout=false;
  function draw(relayout=true) {
    const view=getView(), width=stage.clientWidth, height=stage.clientHeight;
    if(!width||!height)return;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const bounds:Box={left:5,top:5,right:width-5,bottom:height-32};
    const major=width<500?compactCities:majorClimateCities;
    const farmingIds=new Set(view.farmingIds??[]);
    const visible=items.filter(item=>view.climate ? item.kind==='city'&&(view.detailed||major.includes(item.id)||item.id===view.city) : view.crops ? item.kind==='crop'&&farmingIds.has(item.id) : item.kind==='feature'&&view.places.some(p=>p.id===item.id));
    const selected=(item:Annotation)=>item.kind==='city'?item.id===view.city:item.kind==='crop'?farmingIds.has(item.id)&&item.id===view.selectedFarming:item.id===view.feature;
    const inputs=visible.map(item=>{
      item.button.hidden=false;
      return {id:item.kind+'-'+item.id,anchor:project(item.coordinates),width:item.button.offsetWidth,height:item.button.offsetHeight};
    }).filter(p=>p.anchor.x>=bounds.left&&p.anchor.x<=bounds.right&&p.anchor.y>=bounds.top&&p.anchor.y<=bounds.bottom);
    const inputIds=new Set(inputs.map(p=>p.id));
    for(const item of items) {
      const isVisible=inputIds.has(item.kind+'-'+item.id);
      item.button.hidden=!isVisible;item.line.style.display=item.dot.style.display=isVisible?'':'none';
      item.button.setAttribute('aria-pressed',String(selected(item)));
      item.dot.classList.toggle('is-active',selected(item));
    }
    const stageRect=stage.getBoundingClientRect();
    const obstacles=[...stage.querySelectorAll<HTMLElement>('.eu-map-buttons,.eu-topic-map:not([hidden])')].map(el=>{
      const r=el.getBoundingClientRect();return {left:r.left-stageRect.left-5,top:r.top-stageRect.top-5,right:r.right-stageRect.left+5,bottom:r.bottom-stageRect.top+5};
    });
    if(relayout) {
      const selectedIds=new Set(visible.filter(selected).map(item=>item.kind+'-'+item.id));
      inputs.sort((a,b)=>Number(selectedIds.has(b.id))-Number(selectedIds.has(a.id)));
      placements=layoutNatureLabels(inputs,bounds,obstacles);
    }
    for(const item of visible) {
      const p=placements.find(p=>p.id===item.kind+'-'+item.id), input=inputs.find(p=>p.id===item.kind+'-'+item.id);
      if(!p||!input){item.button.hidden=true;item.line.style.display=item.dot.style.display='none';continue;}
      const dx=input.anchor.x-p.anchor.x,dy=input.anchor.y-p.anchor.y;
      const box={left:p.left+dx,top:p.top+dy,right:p.right+dx,bottom:p.bottom+dy};
      item.button.style.transform=`translate(${box.left}px,${box.top}px)`;
      const end=leaderEnd(input.anchor,box);
      item.line.setAttribute('x1',String(input.anchor.x));item.line.setAttribute('y1',String(input.anchor.y));
      item.line.setAttribute('x2',String(end.x));item.line.setAttribute('y2',String(end.y));
      item.dot.setAttribute('cx',String(input.anchor.x));item.dot.setAttribute('cy',String(input.anchor.y));
    }
    if(relayout) {
      codes=view.climate?layoutClimateCodes(climateLabels.labels.filter(l=>view.detailed||!l.detail).map(l=>({id:l.id,code:l.code,anchors:[l.coordinate,...l.alternatives].map(project),width:l.code.length*10+4,height:21})),bounds,[...obstacles,...placements]):[];
      for(const p of codes){const l=climateLabels.labels.find(l=>l.id===p.id)!;const coordinate=[l.coordinate,...l.alternatives].find(c=>{const a=project(c);return Math.hypot(a.x-p.anchor.x,a.y-p.anchor.y)<.01;});if(coordinate)codeCoordinates.set(p.id,coordinate);}
    }
    for(const label of climateLabels.labels) {
      const el=codeElements.get(label.id)!, p=codes.find(p=>p.id===label.id);
      el.group.style.display=view.climate&&p?'':'none';if(!p)continue;
      // During a pan/zoom keep the verified coordinate attached to the map.
      const anchor=project(codeCoordinates.get(label.id)??label.coordinate);
      const dx=anchor.x-p.anchor.x,dy=anchor.y-p.anchor.y;
      const center={x:(p.left+p.right)/2+dx,y:(p.top+p.bottom)/2+dy};
      el.text.setAttribute('x',String(center.x));el.text.setAttribute('y',String(center.y));
      el.line.style.display=p.leader?'':'none';el.line.setAttribute('x1',String(anchor.x));el.line.setAttribute('y1',String(anchor.y));
      el.line.setAttribute('x2',String(center.x));el.line.setAttribute('y2',String(center.y));
    }
    stage.classList.add('has-annotations');
  }
  function refresh(relayout=true){needsLayout ||= relayout;if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const layout=needsLayout;needsLayout=false;draw(layout);});}
  new ResizeObserver(()=>refresh()).observe(stage);
  return {refresh};
}
