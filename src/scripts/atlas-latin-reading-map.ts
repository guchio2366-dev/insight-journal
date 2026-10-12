import manifest from '../../public/assets/atlas/latin-reading-products-v1/manifest.json';
const cameras=new WeakMap<HTMLElement,{frame:string,box:number[]}>();
/** Local SVG camera. Dragging changes only the view; geographic data stay complete. */
export function initLatinMapCamera(host:HTMLElement){
 const svg=host.querySelector<SVGSVGElement>('svg');if(!svg)return;
 const initial=svg.getAttribute('viewBox')!.split(' ').map(Number),frame=svg.getAttribute('data-agriculture-frame')??svg.getAttribute('data-reading-frame')??svg.getAttribute('data-nature-frame')??initial.join(' ');
 const previous=cameras.get(host),camera=previous?.frame===frame?previous:{frame,box:[...initial]};cameras.set(host,camera);
 const draw=()=>{svg.setAttribute('viewBox',camera.box.join(' '));host.dispatchEvent(new window.CustomEvent('latin-map-camera-change',{bubbles:true}));};draw();
 const tools=document.createElement('div');tools.className='latin-camera-controls';tools.setAttribute('aria-label','地図の拡大と全体表示');
 for(const [label,factor] of [['拡大',.8],['縮小',1.25],['全体に戻す',0]] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>{if(factor===0)camera.box=[...initial];else{const [x,y,w,h]=camera.box,newW=Math.min(initial[2]*3,Math.max(initial[2]/8,w*factor)),newH=newW*initial[3]/initial[2];camera.box=[x+(w-newW)/2,y+(h-newH)/2,newW,newH];}draw();});tools.append(button);}host.append(tools);
 // Pointer focus must not scroll the tall map before its click coordinates are read.
 svg.addEventListener('mousedown',event=>{if(event.button!==0)return;event.preventDefault();const target=(event.target as Element).closest<HTMLElement|SVGElement>('[role="button"],[tabindex]');target?.focus({preventScroll:true});});
 let drag:{x:number,y:number,box:number[]}|undefined,suppress=false;
 svg.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,box:[...camera.box]};suppress=false;});
 svg.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)<6)return;suppress=true;svg.setPointerCapture?.(event.pointerId);const rect=svg.getBoundingClientRect();camera.box=[drag.box[0]-dx/rect.width*drag.box[2],drag.box[1]-dy/rect.height*drag.box[3],drag.box[2],drag.box[3]];draw();});
 svg.addEventListener('pointerup',()=>{drag=undefined;});svg.addEventListener('pointercancel',()=>{drag=undefined;});
 svg.addEventListener('click',event=>{if(suppress){event.preventDefault();event.stopPropagation();suppress=false;}},true);
}
const hitImages=new Map<string,Promise<CanvasRenderingContext2D|null>>();
export async function latinProductAtPointer(image:SVGImageElement,event:MouseEvent):Promise<string|null>{
 // Capture the source cell before the asynchronous bitmap read; pan, focus or
 // a re-render can otherwise change the screen transform while it loads.
 const matrix=image.getScreenCTM();if(!matrix)return null;
 const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()),x=(point.x-image.x.baseVal.value)/image.width.baseVal.value,y=(point.y-image.y.baseVal.value)/image.height.baseVal.value;
 if(x<0||x>=1||y<0||y>=1)return null;
 const url=image.dataset.hitImage!;if(!hitImages.has(url))hitImages.set(url,new Promise(resolve=>{const bitmap=new Image();bitmap.onload=()=>{const canvas=document.createElement('canvas');canvas.width=bitmap.naturalWidth;canvas.height=bitmap.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});context?.drawImage(bitmap,0,0);resolve(context);};bitmap.onerror=()=>resolve(null);bitmap.src=url;}));
 const context=await hitImages.get(url);if(!context)return null;
 const index=context.getImageData(Math.floor(x*context.canvas.width),Math.floor(y*context.canvas.height),1,1).data[0];return manifest.ids[index-1]??null;
}
