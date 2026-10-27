import {layoutNatureLabels,leaderEnd,type Box,type Point} from './atlas-nature-labels.ts';
import {southeastFarmVisibleProducts} from '../data/atlas/asia/southeast-asia-farm-groups.ts';

type FarmLabel={id:string;text:string;coordinate:[number,number];anchors?:[number,number][];product?:string;kind?:string;color?:string};
export const southeastLivestockSymbols:Readonly<Record<string,string>>={cattle:'牛',buffalo:'水',pig:'豚',chicken:'鶏'};

export function southeastFarmMapFilter(topic?:string|null,single=false){
 return ['in',['get','id'],['literal',[...southeastFarmVisibleProducts(topic,single)]]];
}

/** Repeat names only at source anchors; the screen layout may move the label. */
export function southeastFarmCropLabels(labels:readonly FarmLabel[],topic?:string|null,single=false,view?:{project:(coordinate:[number,number])=>Point;bounds:Box}):FarmLabel[]{
 const products=southeastFarmVisibleProducts(topic,single),counts=new Map<string,number>();
 return labels.filter(label=>{
  if(label.kind!=='crop'||!label.product||!products.includes(label.product))return false;
  if(view){const point=view.project(label.coordinate),b=view.bounds;if(point.x<b.left+12||point.x>b.right-12||point.y<b.top+12||point.y>b.bottom-12)return false;}
  const count=counts.get(label.product)??0;counts.set(label.product,count+1);
  return count<(label.product===topic?3:2);
 }).sort((a,b)=>Number(b.product===topic)-Number(a.product===topic));
}

/** North America-style small symbol + name, without proportional-size claims. */
export function renderSoutheastLivestockMarkers(options:{
 labels:readonly FarmLabel[];topic?:string|null;single?:boolean;bounds:Box;obstacles:Box[];
 project:(point:[number,number])=>Point;
 button:(id:string,text:string,kind:string,action:()=>void)=>HTMLButtonElement;
 chooseFarm:(id:string)=>void;line:(x1:number,y1:number,x2:number,y2:number,color?:string)=>unknown;
}):Box[]{
 const {topic,single,bounds,obstacles,project,button,chooseFarm,line}=options;
 const products=southeastFarmVisibleProducts(topic,single),counts=new Map<string,number>();
 const labels=options.labels.filter(label=>{
  if(label.kind!=='livestock'||!label.product||!products.includes(label.product))return false;
  const point=project(label.coordinate);
  if(point.x<bounds.left+12||point.x>bounds.right-12||point.y<bounds.top+12||point.y>bounds.bottom-12)return false;
  const count=counts.get(label.product)??0;counts.set(label.product,count+1);return count<(label.product===topic?3:2);
 }).sort((a,b)=>Number(b.product===topic)-Number(a.product===topic));
 const buttons=new Map<string,HTMLButtonElement>();
 const inputs=labels.map(label=>{
  const id='southeast-animal-'+label.id;
  const element=button(id,'','asia-southeast-livestock-marker',()=>chooseFarm(label.product!));
  const symbol=element.ownerDocument.createElement('i'),name=element.ownerDocument.createElement('span');
  symbol.textContent=southeastLivestockSymbols[label.product!]??label.text;symbol.setAttribute('aria-hidden','true');name.textContent=label.text;
  element.replaceChildren(symbol,name);element.style.setProperty('--animal-color',label.color??'#655a4c');
  element.setAttribute('aria-label',label.text+'の代表地域を選ぶ');element.setAttribute('aria-pressed',String(label.product===topic));element.dataset.southeastLivestock=label.product;
  element.style.width='max-content';element.style.height='28px';element.hidden=false;
  const width=element.getBoundingClientRect().width||32+label.text.length*12;
  element.hidden=true;buttons.set(id,element);
  return {id,anchor:project(label.coordinate),width,height:28};
 });
 const placed=layoutNatureLabels(inputs,bounds,obstacles);
 for(const rect of placed){
  const element=buttons.get(rect.id)!;element.style.left=rect.left+'px';element.style.top=rect.top+'px';element.style.width=(rect.right-rect.left)+'px';element.hidden=false;
  const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y,'#6a7069');
 }
 return placed;
}
