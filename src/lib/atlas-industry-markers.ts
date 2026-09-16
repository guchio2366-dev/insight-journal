/** Match the actual label box, including labels flipped at the eastern edge. */
export function groupIndustryMarkers<T extends {x:number;y:number;regions:unknown[]}>(places:T[],frameWidth:number):T[]{
 const groups=places.map(p=>({...p,regions:[...p.regions]})) as T[];
 const width=frameWidth<650?88:116;
 const box=(p:T)=>{const left=p.x-18-(p.x>frameWidth-width-4?width-34:0);return {left,right:left+width,top:p.y-22,bottom:p.y+22};};
 for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
  const a=box(groups[i]),b=box(groups[j]);
  if(a.left<b.right+3&&a.right>b.left-3&&a.top<b.bottom+3&&a.bottom>b.top-3){groups[i].regions.push(...groups[j].regions);groups.splice(j--,1);}
 }
 return groups;
}

/** Place names around fixed economic circles without changing their position or area. */
export function placeIndustryEconomicLabels(points:readonly {id:string;x:number;y:number;radius:number;width:number;height:number}[],frameWidth:number,frameHeight:number){
 type Box={left:number;top:number;width:number;height:number};
 const overlap=(a:Box,b:Box)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
 const placed:{id:string;left:number;top:number;width:number;height:number}[]=[];
 const circles=points.map(p=>({left:p.x-p.radius-3,top:p.y-p.radius-3,width:p.radius*2+6,height:p.radius*2+6}));
 for(const p of [...points].sort((a,b)=>b.radius-a.radius)){
  const choices:Box[]=[];
  for(const shift of [0,-p.height-10,p.height+10,-2*p.height-20,2*p.height+20])for(const side of [1,-1]){
   const left=side===1?p.x+Math.max(32,p.radius)+5:p.x-Math.max(32,p.radius)-5-p.width;
   choices.push({left:Math.max(4,Math.min(frameWidth-p.width-4,left)),top:Math.max(4,Math.min(frameHeight-p.height-4,p.y+shift-p.height/2)),width:p.width,height:p.height});
  }
  // Full-text state cards can be taller than economic labels. Search free map
  // space as well as the immediate neighborhood, keeping the anchor fixed.
  if(p.height>34||frameWidth<650)for(let top=4;top<=frameHeight-p.height-4;top+=16)for(let left=4;left<=frameWidth-p.width-4;left+=16)choices.push({left,top,width:p.width,height:p.height});
  const score=(b:Box)=>[...circles,...placed.map(r=>({left:r.left-4,top:r.top-4,width:r.width+8,height:r.height+8}))].reduce((sum,r)=>sum+overlap(b,r),0)*10000+Math.hypot(b.left+b.width/2-p.x,b.top+b.height/2-p.y);
  let best=choices[0],bestScore=Infinity;
  for(const b of choices){const s=score(b);if(s<bestScore){best=b;bestScore=s;}}
  placed.push({id:p.id,...best});
 }
 return placed;
}
