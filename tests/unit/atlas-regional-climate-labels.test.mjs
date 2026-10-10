import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
const bundled=await build({entryPoints:['src/data/atlas/oceania-learning.ts'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')},logLevel:'silent'});
const D=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
after(()=>stop());
test('crowded lower-edge Perth name stays near its fixed observation point instead of wrapping to the map top',()=>{
 const win=new Window();
 try{for(const width of [360,400,500,600]){
  const state=D.createOceaniaState('','nature');win.document.body.innerHTML=D.renderOceaniaScene(D.getOceaniaLayer('climate'),state,'label-review',{width,height:300});
  const svg=win.document.querySelector('svg'),frame=svg.getAttribute('viewBox').split(' ').map(Number),scale=Math.max(frame[2]/width,frame[3]/300);
  const g=svg.querySelector('[data-regional-climate-city="perth"]'),point=g.querySelector('circle'),label=g.querySelector('text');
  const [x,y]=['cx','cy'].map(k=>Number(point.getAttribute(k))),[lx,ly]=['x','y'].map(k=>Number(label.getAttribute(k)));
  assert.ok(Math.hypot(lx-x,ly-4*scale-y)/scale<=80,`Perth leader too long at ${width}px`);
  assert.deepEqual(frame,[0,0,1200,757]);assert.ok(ly>frame[1]+22*scale,'Name must not wrap to the map top');
  const boxes=[...svg.querySelectorAll('[data-regional-climate-city]>rect')].map(r=>['x','y','width','height'].map(k=>Number(r.getAttribute(k))));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const [ax,ay,aw,ah]=boxes[i],[bx,by,bw,bh]=boxes[j];assert.ok(!(ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by),`City label boxes overlap at ${width}px`);}
 }}finally{win.happyDOM.abort();}
});
