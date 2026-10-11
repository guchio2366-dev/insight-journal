import anchors from '../data/atlas/europe/pew-religion-anchors.json' with {type:'json'};
import countries from '../data/atlas/europe/countries.json' with {type:'json'};
import {smreMajorGroups,smreSource} from './atlas-europe-smre-surface';

/** Equal-width national summaries; leaders locate countries, never residential boundaries. */
export function createEuropeSmreMarkers(stage:HTMLElement,onSelect:(code:string)=>void){
  const layer=document.createElement('div');layer.className='eu-smre-markers';layer.dataset.euSmreMarkers='';layer.hidden=true;
  const guides=document.createElementNS('http://www.w3.org/2000/svg','svg');guides.setAttribute('aria-hidden','true');layer.append(guides);stage.append(layer);
  // Monaco: midpoint of its existing Natural Earth polygon extent.
  const positions=[...anchors,{code:'MCO',coordinates:[7.408203,43.751318]}];
  const nodes=smreSource.rows.flatMap(row=>{
    const groups=smreMajorGroups(row.code),anchor=positions.find(item=>item.code===row.code);
    if(groups.length<2||!anchor)return [];
    const name=countries.find(item=>item.code===row.code)!.name;
    const button=document.createElement('button');button.type='button';button.className='eu-smre-marker';button.dataset.euSmreMarker=row.code;
    const heading=document.createElement('strong');heading.textContent=name==='ボスニア・ヘルツェゴビナ'?'ボスニア':name;button.append(heading);
    const shares=document.createElement('span');shares.className='eu-smre-shares';button.append(shares);
    for(const group of groups){
      const value=document.createElement('span');value.dataset.euSmreShare=group.id;
      const swatch=document.createElement('i');swatch.style.background=group.color;
      value.append(swatch,`${group.short} ${group.share}%`);shares.append(value);
    }
    button.setAttribute('aria-label',`${name}・全国割合：${groups.map(group=>`${group.label} ${group.share}%`).join('、')}。全8分類の資料を読む`);
    button.addEventListener('click',event=>{event.stopPropagation();onSelect(row.code);});layer.append(button);
    const guide=document.createElementNS('http://www.w3.org/2000/svg','line');guides.append(guide);
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','2');guides.append(dot);
    for(const event of ['mouseenter','focus'])button.addEventListener(event,()=>guide.classList.add('is-emphasized'));
    for(const event of ['mouseleave','blur'])button.addEventListener(event,()=>guide.classList.remove('is-emphasized'));
    return [{anchor,button,guide,dot}];
  });
  const offsets=Array.from({length:73},(_,index)=>(index-36)*10);
  const candidates=offsets.flatMap(x=>offsets.map(y=>[x,y] as const)).sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
  let lastLayout='';
  function update(active:boolean,project:(coordinates:[number,number])=>{x:number;y:number}){
    layer.hidden=!active;if(!active){lastLayout='';return;}
    const bounds=stage.getBoundingClientRect(),width=stage.clientWidth,height=stage.clientHeight;
    const caption=stage.querySelector('.eu-map-heading')?.getBoundingClientRect();
    const bottom=caption?caption.top-bounds.top-4:height-43;
    const signature=[width,height,bottom,...nodes.flatMap(({anchor,button})=>{const p=project(anchor.coordinates as [number,number]);return [p.x.toFixed(1),p.y.toFixed(1),button.offsetWidth,button.offsetHeight];})].join(',');
    if(signature===lastLayout)return;lastLayout=signature;
    const occupied=[...stage.querySelectorAll<HTMLElement>('.eu-map-buttons')].map(node=>{
      const r=node.getBoundingClientRect();return {left:r.left-bounds.left-3,right:r.right-bounds.left+3,top:r.top-bounds.top-3,bottom:r.bottom-bounds.top+3};
    });
    // Keep large countries and the main coexisting traditions near their anchors.
    // Small neighbouring countries use leaders; no national summary is dropped for density.
    const order=['FRA','DEU','CHE','GBR','ITA','ESP','RUS','SWE','NOR','FIN','BLR','UKR','NLD','BEL','AUT','CZE','HUN','LVA','EST','LTU'];
    const rank=(code:string)=>order.includes(code)?order.indexOf(code):99;
    for(const {anchor,button,guide,dot} of [...nodes].sort((a,b)=>rank(a.anchor.code)-rank(b.anchor.code))){
      const point=project(anchor.coordinates as [number,number]);
      button.hidden=point.x<0||point.x>width||point.y<0||point.y>bottom;
      guide.style.display=dot.style.display=button.hidden?'none':'';if(button.hidden)continue;
      dot.setAttribute('cx',String(point.x));dot.setAttribute('cy',String(point.y));
      const w=button.offsetWidth||124,h=button.offsetHeight||49;
      let selected:{x:number;y:number}|undefined,best=Infinity;
      for(const [dx,dy] of candidates){
        const x=point.x+dx,y=point.y+dy,r={left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
        if(r.left<3||r.right>width-3||r.top<3||r.bottom>bottom)continue;
        const overlap=occupied.reduce((sum,b)=>sum+Math.max(0,Math.min(r.right,b.right)-Math.max(r.left,b.left))*Math.max(0,Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top)),0);
        const score=overlap*100+Math.hypot(dx,dy);
        if(score<best){best=score;selected={x,y};}if(!overlap)break;
      }
      if(!selected){button.hidden=true;guide.style.display=dot.style.display='none';continue;}
      button.style.left=`${selected.x}px`;button.style.top=`${selected.y}px`;
      guide.setAttribute('x1',String(point.x));guide.setAttribute('y1',String(point.y));guide.setAttribute('x2',String(selected.x));guide.setAttribute('y2',String(selected.y));
      occupied.push({left:selected.x-w/2-3,right:selected.x+w/2+3,top:selected.y-h/2-3,bottom:selected.y+h/2+3});
    }
  }
  return {update};
}
