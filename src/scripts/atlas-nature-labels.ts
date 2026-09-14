import {containedMapBox,layoutNatureLabels,leaderEnd,projectNatureFallback,type Box,type Point} from '../lib/atlas-nature-labels';
import {layoutClimateCodes,type ClimateCodeLabel} from '../lib/atlas-climate-code-labels';

type Entry={id:string;name:string;coordinate:[number,number];mode:'climate'|'landform'|'water'|'population'};
type Callbacks={active:()=>boolean;mode:()=>string;zoom?:()=>number;project:()=>((p:[number,number])=>Point)|null;select:(entry:Entry,trigger:HTMLButtonElement)=>void;placed:()=>void;holder?:HTMLElement;attribute?:string;controls?:string;fallbackBox?:(imageBox:Box)=>Box;fallbackProject?:(coordinate:readonly number[],box:Box)=>Point};

/** Creates a fixed set of buttons once; only placement and state change. */
export function createNatureLabels(root:HTMLElement,entries:Entry[],callbacks:Callbacks,codeEntries:ClimateCodeLabel[]=[]){
  const frame=root.querySelector<HTMLElement>('[data-map-frame]')!;
  const holder=callbacks.holder??root.querySelector<HTMLElement>('[data-nature-labels]')!;
  const image=root.querySelector<HTMLImageElement>('[data-fallback-image]')!;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('aria-hidden','true');svg.classList.add('atlas-nature-leaders');holder.appendChild(svg);
  const nodes=entries.map(entry=>{
    const line=document.createElementNS(ns,'line'),dot=document.createElementNS(ns,'circle');
    dot.setAttribute('r','3');svg.append(line,dot);
    const button=document.createElement('button');button.type='button';button.className='atlas-nature-label';button.textContent=entry.name;
    button.setAttribute(callbacks.attribute??'data-nature-label',entry.id);button.dataset.labelMode=entry.mode;button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls',callbacks.controls??(entry.mode==='climate'?'city-climate-chart':'nature-feature-detail'));button.hidden=true;
    let start:Point|null=null,dragged=false;
    button.addEventListener('pointerdown',event=>{start={x:event.clientX,y:event.clientY};dragged=false;event.stopPropagation();});
    button.addEventListener('pointermove',event=>{if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>6)dragged=true;});
    button.addEventListener('pointercancel',()=>{dragged=true;start=null;});
    button.addEventListener('click',event=>{event.stopPropagation();if(event.detail!==0&&dragged)return;start=null;callbacks.select(entry,button);});
    holder.appendChild(button);return {entry,button,line,dot};
  });
  const codeNodes=codeEntries.map(entry=>{
    const node=document.createElement('span');node.className='atlas-climate-map-code';node.dataset.climateMapCode=entry.code;node.textContent=entry.code;node.setAttribute('aria-hidden','true');node.hidden=true;holder.appendChild(node);
    const line=document.createElementNS(ns,'line');line.classList.add('atlas-climate-code-leader');line.style.display='none';svg.appendChild(line);return {entry,node,line};
  });
  function localBox(element:HTMLElement):Box {
    // Layout coordinates stay relative to the map during iframe/page scrolling.
    if(element.clientWidth>0&&element.clientHeight>0){
      let left=0,top=0,node:HTMLElement|null=element;
      while(node&&node!==frame){left+=node.offsetLeft;top+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}
      return {left,top,right:left+(element.offsetWidth||element.clientWidth),bottom:top+(element.offsetHeight||element.clientHeight)};
    }
    const b=frame.getBoundingClientRect(),r=element.getBoundingClientRect();
    return {left:r.left-b.left,top:r.top-b.top,right:r.right-b.left,bottom:r.bottom-b.top};
  }
  function fallbackBox():Box {return callbacks.fallbackBox?callbacks.fallbackBox(localBox(image)):containedMapBox(localBox(image));}
  let queued=0;
  function render(){
    queued=0;holder.hidden=!callbacks.active()||!['climate','landform','water','population'].includes(callbacks.mode());
    if(holder.hidden)return;
    const project=callbacks.project(),bounds:Box=project?{left:0,top:0,right:frame.clientWidth,bottom:frame.clientHeight}:fallbackBox();
    if(bounds.right<=bounds.left||bounds.bottom<=bounds.top)return;
    const obstacles=[...root.querySelectorAll<HTMLElement>('.atlas-map-tools:not([hidden]),[data-layer-caption]')].map(localBox).filter(r=>r.right>r.left&&r.bottom>r.top);
    const inputs=nodes.filter(({entry})=>entry.mode===callbacks.mode()).map(({entry,button})=>{
      button.hidden=false;const anchor=project?project(entry.coordinate):(callbacks.fallbackProject??projectNatureFallback)(entry.coordinate,bounds);
      return {id:entry.id,anchor,width:button.offsetWidth||entry.name.length*12+14,height:button.offsetHeight||24};
    });
    const zoom=project?(callbacks.zoom?.()??3):3;
    const codeInputs=codeNodes.filter(({entry})=>callbacks.mode()==='climate'&&entry.minZoom<=zoom).map(({entry,node})=>{
      node.hidden=false;
      return {id:entry.id,code:entry.code,width:node.offsetWidth||30,height:node.offsetHeight||18,anchors:[entry.coordinate,...entry.alternatives].map(p=>project?project(p as [number,number]):projectNatureFallback(p,bounds))};
    });
    // Only narrow coastal classes need reserved space. Reserving broad inland
    // classes too would needlessly push western city names away from their points.
    const points=inputs.map(({anchor})=>({left:anchor.x-6,right:anchor.x+6,top:anchor.y-6,bottom:anchor.y+6}));
    const firstCodes=codeInputs.filter((item,index,all)=>['Csa','Csb','Am','Aw'].includes(item.code)&&all.findIndex(other=>other.code===item.code)===index);
    const reserved=bounds.right-bounds.left>=500?layoutClimateCodes(firstCodes,bounds,[...obstacles,...points]):[];
    const layoutBounds=callbacks.mode()==='water'?{left:0,top:0,right:frame.clientWidth,bottom:frame.clientHeight-40}:bounds;
    const placed=layoutNatureLabels(inputs,layoutBounds,[...obstacles,...reserved]);
    for(const {entry,button,line,dot} of nodes){
      const box=placed.find(item=>item.id===entry.id);button.hidden=!box;line.style.display=dot.style.display=box?'':'none';
      if(!box)continue;
      button.style.transform=`translate(${box.left}px,${box.top}px)`;
      const end=leaderEnd(box.anchor,box);line.setAttribute('x1',String(box.anchor.x));line.setAttribute('y1',String(box.anchor.y));line.setAttribute('x2',String(end.x));line.setAttribute('y2',String(end.y));
      dot.setAttribute('cx',String(box.anchor.x));dot.setAttribute('cy',String(box.anchor.y));
    }
    if(codeNodes.length){
    const geographic=[...root.querySelectorAll<HTMLElement>('.atlas-geolabel:not([hidden])')].map(node=>{
      const r=node.getBoundingClientRect(),f=frame.getBoundingClientRect();return {left:r.left-f.left,right:r.right-f.left,top:r.top-f.top,bottom:r.bottom-f.top};
    }).filter(r=>r.right>r.left);
    const codes=layoutClimateCodes(codeInputs,bounds,[...obstacles,...placed,...points,...geographic]);
    for(const {entry,node,line} of codeNodes){
      const box=codes.find(item=>item.id===entry.id);node.hidden=!box;line.style.display=box?.leader?'':'none';
      if(!box)continue;node.style.transform=`translate(${box.left}px,${box.top}px)`;
      if(box.leader){const end=leaderEnd(box.anchor,box);line.setAttribute('x1',String(box.anchor.x));line.setAttribute('y1',String(box.anchor.y));line.setAttribute('x2',String(end.x));line.setAttribute('y2',String(end.y));}
    }
    }
    callbacks.placed();
  }
  function schedule(){if(!queued)queued=requestAnimationFrame(render);}
  new ResizeObserver(schedule).observe(frame);image.addEventListener('load',schedule);document.fonts?.ready.then(schedule);
  return {schedule,fallbackBox,sync:(selected:string|null)=>nodes.forEach(({entry,button,dot})=>{const active=entry.id===selected;button.setAttribute('aria-pressed',String(active));dot.classList.toggle('is-selected',active);})};
}
