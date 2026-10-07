/** City symbols stay at geographic anchors; only their 14px labels move. */
export function layoutCanadaPopulationLabels(root:HTMLElement){
 const map=root.querySelector<SVGSVGElement>('[data-population-map]')!,matrix=map.getScreenCTM?.();if(!matrix||!Number.isFinite(matrix.a)||matrix.a<=0)return;
 const frame=map.closest('.atlas-map-frame')!.getBoundingClientRect(),scale=matrix.a;
 const screen=(x:number,y:number)=>[x*matrix.a+matrix.e-frame.left,y*matrix.d+matrix.f-frame.top];
 const world=([x,y]:number[])=>[(x+frame.left-matrix.e)/matrix.a,(y+frame.top-matrix.f)/matrix.d];
 const tools=root.querySelector('.population-map-tools')!.getBoundingClientRect(),boxes:number[][]=[[tools.left-frame.left-4,tools.top-frame.top-4,tools.right-frame.left+4,tools.bottom-frame.top+4]];
 const priority=['933','535','462','825','835','602','505','705'],markers=[...root.querySelectorAll<SVGElement>('[data-population-map-cma]')].sort((a,b)=>Number(b.getAttribute('aria-pressed')==='true')-Number(a.getAttribute('aria-pressed')==='true')||Number(priority.includes(b.dataset.populationMapCma!))-Number(priority.includes(a.dataset.populationMapCma!)));
 const anchors=markers.map(m=>{const p=m.querySelector('.population-anchor')!;return screen(Number(p.getAttribute('cx')),Number(p.getAttribute('cy')));}).filter(p=>p[0]>=0&&p[0]<frame.width&&p[1]>=0&&p[1]<frame.height).map(p=>[p[0]-5,p[1]-5,p[0]+5,p[1]+5]);
 const placements=[],symbols=[];
 for(const marker of markers){
  const anchor=marker.querySelector<SVGCircleElement>('.population-anchor')!,label=marker.querySelector<SVGTextElement>('[data-population-label]')!,dots=marker.querySelector<SVGElement>('[data-population-category-dots]'),id=marker.dataset.populationMapCma!,x=Number(anchor.getAttribute('cx')),y=Number(anchor.getAttribute('cy')),point=screen(x,y);
  anchor.style.r=3/scale+'px';anchor.style.strokeWidth=1/scale+'px';anchor.style.pointerEvents='auto';anchor.style.cursor='pointer';label.style.fontSize=14/scale+'px';label.style.pointerEvents='auto';label.style.cursor='pointer';
  marker.querySelector('[data-population-label-leader]')?.remove();
  const inFrame=point[0]>=4&&point[0]<frame.width-4&&point[1]>=4&&point[1]<frame.height-4;
  if(dots){
   const colors:string[]=dots.dataset.categoryColors?JSON.parse(dots.dataset.categoryColors):[...dots.querySelectorAll('circle')].map(c=>c.getAttribute('fill')!);dots.dataset.categoryColors=JSON.stringify(colors);dots.replaceChildren();dots.style.display=inFrame?'':'none';
   // Equal segments identify simultaneous qualified groups, not their shares.
   for(const [index,color]of colors.entries()){const a=-Math.PI/2+index/colors.length*Math.PI*2,b=-Math.PI/2+(index+1)/colors.length*Math.PI*2,r=4.5/scale,p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',colors.length===1?`M${x-r},${y}a${r},${r} 0 1,0 ${2*r},0a${r},${r} 0 1,0 ${-2*r},0`:`M${x},${y}L${x+Math.cos(a)*r},${y+Math.sin(a)*r}A${r},${r} 0 ${b-a>Math.PI?1:0},1 ${x+Math.cos(b)*r},${y+Math.sin(b)*r}Z`);p.setAttribute('fill',color);p.setAttribute('stroke','#fff');p.setAttribute('stroke-width',String(.5/scale));dots.append(p);}
   symbols.push({id,point,groups:colors.length,radius:4.5});
  }
  const showLabel=marker.getAttribute('aria-pressed')==='true'||priority.includes(id)||scale>1.5;
  label.style.display=inFrame&&showLabel?'':'none';if(!inFrame||!showLabel)continue;
  const width=label.getComputedTextLength()*scale,height=18,candidates:number[][]=[];
  for(let radius=8;radius<=128;radius+=20)for(const [dx,dy]of [[radius,-height-3],[radius,5],[-width-radius,-height-3],[-width-radius,5],[-width/2,-height-radius],[-width/2,radius]])candidates.push([point[0]+dx,point[1]+dy]);
  const position=candidates.find(([px,py])=>px>=5&&py>=5&&px+width<=frame.width-5&&py+height<=frame.height-5&&![...boxes,...anchors].some(b=>px<b[2]+3&&px+width>b[0]-3&&py<b[3]+3&&py+height>b[1]-3));
  if(!position){label.style.display='none';continue;}
  const [px,py]=position,lp=world([px,py+14]);label.setAttribute('x',String(lp[0]));label.setAttribute('y',String(lp[1]));
  const end=world([Math.max(px,Math.min(px+width,point[0])),Math.max(py,Math.min(py+height,point[1]))]),leader=document.createElementNS('http://www.w3.org/2000/svg','path');leader.dataset.populationLabelLeader='';leader.setAttribute('d',`M${x},${y}L${end[0]},${end[1]}`);leader.setAttribute('stroke','#48626b');leader.setAttribute('stroke-width',String(.7/scale));leader.setAttribute('fill','none');leader.style.pointerEvents='none';marker.insertBefore(leader,label);
  boxes.push([px,py,px+width,py+height]);placements.push({id,point,box:[px,py,px+width,py+height]});
 }
 (root as any).canadaPopulationLabels={placements,symbols,scale,sourceMarkers:markers.length};
}
