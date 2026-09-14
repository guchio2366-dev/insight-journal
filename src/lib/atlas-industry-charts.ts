export function industryTrendGeometry(points:readonly {year:number;value:number|null}[]){
 const valid=points.filter((p):p is {year:number;value:number}=>p.value!==null&&Number.isFinite(p.value));
 const years=points.map(p=>p.year),first=Math.min(...years),last=Math.max(...years);
 const low=Math.min(0,...valid.map(p=>p.value)),high=Math.max(0,...valid.map(p=>p.value));
 const raw=high-low||1,step=10**Math.floor(Math.log10(raw));
 const min=Math.floor(low/step)*step,max=Math.ceil((high||1)/step)*step;
 const x=(year:number)=>72+(year-first)/Math.max(1,last-first)*270;
 const y=(value:number)=>108-(value-min)/(max-min)*88;
 let path='',active=false,previous:number|null=null;
 for(const p of points){if(p.value===null||!Number.isFinite(p.value)){active=false;previous=null;continue;}
  if(previous!==null&&p.year!==previous+1)active=false;
  path+=`${active?'L':'M'}${x(p.year).toFixed(2)},${y(p.value).toFixed(2)} `;active=true;previous=p.year;
 }
 return {path,first,last,min,max,ticks:[min,(min+max)/2,max],points:valid.map(p=>({...p,x:x(p.year),y:y(p.value)})),y};
}
export function industryDistributionRows(rows:readonly {id:string;name:string;value:number}[],total:number,keepId?:string){
 if(!Number.isFinite(total)||total<=0||rows.some(r=>!Number.isFinite(r.value)||r.value<0)||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Invalid industry distribution');
 if(rows.reduce((s,r)=>s+r.value,0)>total+Math.max(1e-7,total*1e-9))throw new Error('Industry distribution exceeds total');
 const top=[...rows].sort((a,b)=>b.value-a.value).slice(0,5);
 const keep=rows.find(r=>r.id===keepId);if(keep&&!top.some(r=>r.id===keep.id))top.push(keep);
 const rest=total-top.reduce((s,r)=>s+r.value,0);if(rest>1e-9)top.push({id:'other',name:'その他',value:rest});
 let offset=0;return top.map(r=>{const share=100*r.value/total,result={...r,share,offset};offset+=share;return result;});
}
