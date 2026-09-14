export type Point = {x:number;y:number};
export type Box = {left:number;top:number;right:number;bottom:number};
export type LabelInput = {id:string;anchor:Point;width:number;height:number};
export type LabelPlacement = LabelInput & Box;
export const natureFallbackBounds = [-128,22,-64,52] as const;
const mercator = (latitude:number)=>Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));

/** The actual object-fit:contain rectangle, not the surrounding image element. */
export function containedMapBox(box:Box,width=1800,height=1091):Box {
  const scale=Math.min((box.right-box.left)/width,(box.bottom-box.top)/height);
  const x=(box.left+box.right-width*scale)/2,y=(box.top+box.bottom-height*scale)/2;
  return {left:x,top:y,right:x+width*scale,bottom:y+height*scale};
}

export function projectNatureFallback(coordinate:readonly number[],box:Box):Point {
  const [west,south,east,north]=natureFallbackBounds;
  return {x:box.left+(coordinate[0]-west)/(east-west)*(box.right-box.left),y:box.top+(mercator(north)-mercator(coordinate[1]))/(mercator(north)-mercator(south))*(box.bottom-box.top)};
}

export function unprojectNatureFallback(point:Point,box:Box):[number,number]|null {
  if(box.right<=box.left||box.bottom<=box.top||point.x<box.left||point.x>box.right||point.y<box.top||point.y>box.bottom)return null;
  const [west,south,east,north]=natureFallbackBounds;
  const y=mercator(north)-(point.y-box.top)/(box.bottom-box.top)*(mercator(north)-mercator(south));
  return [west+(point.x-box.left)/(box.right-box.left)*(east-west),(2*Math.atan(Math.exp(y))-Math.PI/2)*180/Math.PI];
}

export const boxesOverlap = (a:Box,b:Box,gap=3)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(high,value));

/** All in-view labels participate. Crowding changes positions, never membership. */
export function layoutNatureLabels(items:LabelInput[],bounds:Box,obstacles:Box[]=[]):LabelPlacement[] {
  const visible=items.filter(item=>item.anchor.x>=bounds.left&&item.anchor.x<=bounds.right&&item.anchor.y>=bounds.top&&item.anchor.y<=bounds.bottom);
  const points=visible.map(({anchor})=>({left:anchor.x-7,right:anchor.x+7,top:anchor.y-7,bottom:anchor.y+7}));
  const candidates=new Map(visible.map(item=>{
    const {width,height,anchor}=item;
    const xs=new Set([anchor.x+11,anchor.x-width-11,anchor.x-width/2,bounds.left+3,bounds.right-width-3]);
    const ys=new Set([anchor.y-height/2,anchor.y+11,anchor.y-height-11,bounds.top+3,bounds.bottom-height-3]);
    for(let x=bounds.left+3;x+width<=bounds.right-3;x+=12)xs.add(x);
    for(let y=bounds.top+3;y+height<=bounds.bottom-3;y+=height+4)ys.add(y);
    const result:LabelPlacement[]=[];
    for(const x of xs)for(const y of ys){
      const left=clamp(x,bounds.left+3,bounds.right-width-3),top=clamp(y,bounds.top+3,bounds.bottom-height-3);
      const rect={...item,left,top,right:left+width,bottom:top+height};
      if(!obstacles.some(other=>boxesOverlap(rect,other))&&!points.some(other=>boxesOverlap(rect,other,1)))result.push(rect);
    }
    const distance=(a:Box)=>(a.left+width/2-anchor.x)**2+(a.top+height/2-anchor.y)**2;
    return [item.id,result.sort((a,b)=>distance(a)-distance(b))] as const;
  }));
  const orders=[visible,[...visible].sort((a,b)=>b.width-a.width),[...visible].sort((a,b)=>a.anchor.y-b.anchor.y)];
  for(const order of orders){
    const placed:LabelPlacement[]=[];
    for(const item of order){const rect=candidates.get(item.id)!.find(rect=>!placed.some(other=>boxesOverlap(rect,other)));if(!rect)break;placed.push(rect);}
    if(placed.length===visible.length)return visible.map(item=>placed.find(rect=>rect.id===item.id)!);
  }
  // An exceptionally small viewport must still expose every name. Use compact
  // rows, keeping controls clear; geographic correspondence remains in leaders.
  const placed:LabelPlacement[]=[];
  for(const item of [...visible].sort((a,b)=>b.width-a.width)){
    let found:LabelPlacement|undefined;
    for(let top=bounds.top+3;!found&&top+item.height<=bounds.bottom-3;top+=item.height+3){
      for(let left=bounds.left+3;left+item.width<=bounds.right-3;left+=3){
        const rect={...item,left,top,right:left+item.width,bottom:top+item.height};
        if(![...obstacles,...placed].some(other=>boxesOverlap(rect,other,2))){found=rect;break;}
      }
    }
    placed.push(found??{...item,left:bounds.left+3,top:bounds.top+3,right:bounds.left+3+item.width,bottom:bounds.top+3+item.height});
  }
  return visible.map(item=>placed.find(rect=>rect.id===item.id)!);
}

export function leaderEnd(anchor:Point,box:Box):Point {
  return {x:clamp(anchor.x,box.left,box.right),y:clamp(anchor.y,box.top,box.bottom)};
}
