export type PopulationSlice={label:string;value:number|null;color:string;display?:string};

/** Keep percentages on a 100% circle, including the unreported remainder. */
export function populationComposition(items:PopulationSlice[]){
 const known=items.reduce((n,item)=>n+(item.value??0),0);
 if(items.some(item=>item.value!==null&&(!Number.isFinite(item.value)||item.value<0))||known>100.000001)return null;
 const remainder=Math.max(0,100-known);
 const slices=items.filter((item):item is PopulationSlice&{value:number}=>item.value!==null&&item.value>0);
 if(remainder>0.000001)slices.push({label:'未表示分（差分・丸めを含む）',value:remainder,color:'#c8ccd0'});
 let offset=0;
 return {known,remainder,slices:slices.map(item=>{const slice={...item,offset};offset+=item.value;return slice;})};
}

/** One small SVG; percentages remain available as labeled HTML text. */
export function renderPopulationComposition(host:HTMLElement,items:PopulationSlice[],label:string){
 const model=populationComposition(items);host.replaceChildren();
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 120 120');svg.setAttribute('width','120');svg.setAttribute('height','120');svg.setAttribute('aria-hidden','true');
 const background=document.createElementNS(ns,'circle');background.setAttribute('cx','60');background.setAttribute('cy','60');background.setAttribute('r','43');background.setAttribute('fill','none');background.setAttribute('stroke','#e5e9e6');background.setAttribute('stroke-width','24');svg.append(background);
 if(model)for(const item of model.slices){const circle=document.createElementNS(ns,'circle');for(const [key,value] of Object.entries({cx:60,cy:60,r:43,fill:'none',stroke:item.color,'stroke-width':24,pathLength:100,'stroke-dasharray':`${item.value} ${100-item.value}`,'stroke-dashoffset':-item.offset,transform:'rotate(-90 60 60)'}))circle.setAttribute(key,String(value));svg.append(circle);}
 const center=document.createElementNS(ns,'text');center.setAttribute('x','60');center.setAttribute('y','64');center.setAttribute('text-anchor','middle');center.textContent='全国';svg.append(center);
 const legend=document.createElement('ul');legend.className='population-composition-key';legend.setAttribute('aria-label',label);
 const listed=[...items];if(model&&model.remainder>0.000001)listed.push({label:'未表示分',value:model.remainder,color:'#c8ccd0'});
 for(const item of listed){const row=document.createElement('li'),swatch=document.createElement('i'),name=document.createElement('span'),number=document.createElement('strong');swatch.style.background=item.color;swatch.setAttribute('aria-hidden','true');name.textContent=item.label;number.textContent=item.display??(item.value===null?'未取得':item.value.toLocaleString('ja-JP',{maximumFractionDigits:1})+'%');row.append(swatch,name,number);legend.append(row);}
 host.append(svg,legend);return model;
}
