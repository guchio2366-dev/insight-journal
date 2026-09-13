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
