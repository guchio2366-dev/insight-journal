/** The same representative-region badges and collision behavior for country maps. */
export interface AgricultureMarkerRegion { id:string; kindId:string; label:string }
export interface AgricultureMarkerKind { color:string; symbol:string; label:string }
export function renderAgricultureMarkers<R extends AgricultureMarkerRegion>(options:{
 holder:HTMLElement; width:number; height:number;
 items:{region:R;point:{x:number;y:number}}[];
 kinds:Map<string,AgricultureMarkerKind>;
 selectedKind?:string|null; selectedRegion?:string|null;
 select:(region:R)=>void; candidates:(regions:R[],point:{x:number;y:number})=>void;
 related?:(region:R)=>boolean;
}) {
 const {holder,width,height,kinds,selectedKind,selectedRegion}=options;
 holder.replaceChildren();
 const visible=options.items.filter(({point})=>point.x>=20&&point.y>=20&&point.x<=width-20&&point.y<=height-20);
 const groups:{regions:R[];points:{x:number;y:number}[]}[]=[];
 const distance=width<650?58:48;
 for(const item of visible){
  const found=groups.find(group=>item.region.kindId!==selectedKind&&group.regions[0].kindId!==selectedKind&&Math.hypot(group.points[0].x-item.point.x,group.points[0].y-item.point.y)<distance);
  if(found){found.regions.push(item.region);found.points.push(item.point);}
  else groups.push({regions:[item.region],points:[item.point]});
 }
 for(const group of groups){
  const button=document.createElement('button');button.type='button';button.className='atlas-livestock-marker';
  const point={x:group.points.reduce((sum,p)=>sum+p.x,0)/group.points.length,y:group.points.reduce((sum,p)=>sum+p.y,0)/group.points.length};
  button.style.transform=`translate(${Math.round(point.x)}px,${Math.round(point.y)}px) translate(-50%,-50%)`;
  const icon=document.createElement('i');icon.setAttribute('aria-hidden','true');
  const label=document.createElement('span');button.append(icon,label);
  if(group.regions.length===1){
   const region=group.regions[0],kind=kinds.get(region.kindId);if(!kind)continue;
   button.style.setProperty('--livestock-color',kind.color);icon.textContent=kind.symbol;label.textContent=kind.label;
   button.dataset.markerId=region.id;button.dataset.livestockKind=region.kindId;
   button.setAttribute('aria-label',`${region.label}の${kind.label}`);
   button.setAttribute('aria-pressed',String(selectedRegion?selectedRegion===region.id:selectedKind===region.kindId));
   button.addEventListener('click',event=>{event.stopPropagation();options.select(region);});
  }else{
   button.classList.add('is-cluster');icon.textContent=String(group.regions.length);label.textContent='畜産';
   button.setAttribute('aria-label',`${group.regions.length}件の畜産地域を選ぶ`);
   button.addEventListener('click',event=>{event.stopPropagation();options.candidates(group.regions,point);});
  }
  const emphasized=group.regions.some(region=>options.related?options.related(region):selectedKind===region.kindId);
  button.classList.toggle('is-related',emphasized);
  if(emphasized)button.setAttribute('aria-label',button.getAttribute('aria-label')+'、選択した項目で強調中');
  holder.append(button);
 }
}
