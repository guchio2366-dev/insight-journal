import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/lib/atlas-mexico-agriculture-label-layout.ts'],bundle:true,write:false,format:'esm'});
const {placeMexicoAgricultureLabels:place,agricultureLabelIntersects:intersects}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const crop=(id,anchors,selected=false)=>({id,anchors,width:80,height:22,selected});

test('A livestock badge at the first source point selects the unobscured source alternative',()=>{
 const badge={left:150,top:75,right:250,bottom:125};
 const [label]=place([crop('corn',[{x:200,y:100},{x:340,y:180}],true)],600,400,[badge]);
 assert.equal(label.anchorIndex,1);assert.equal(label.x,340);assert.equal(label.y,180);
 assert.equal(intersects(label,badge),false);
});

test('Selected crop takes priority; remaining labels never overlap labels or controls',()=>{
 const controls={left:0,top:0,right:130,bottom:70};
 const labels=place([crop('beans',[{x:250,y:150},{x:370,y:230}]),crop('corn',[{x:250,y:150}],true),crop('rice',[{x:80,y:35},{x:100,y:230}])],600,400,[controls]);
 assert.deepEqual(labels.map(item=>item.id),['corn','beans','rice']);
 assert.equal(labels[0].x,250);assert.equal(labels[1].anchorIndex,1);
 for(let i=0;i<labels.length;i++){
  assert.equal(intersects(labels[i],controls),false);
  for(let j=i+1;j<labels.length;j++)assert.equal(intersects(labels[i],labels[j]),false);
 }
});

test('Small typographic offsets stay near their source point and within viewport bounds',()=>{
 const obstacle={left:200,top:180,right:300,bottom:185};
 const [label]=place([crop('coffee',[{x:250,y:180}])],600,400,[obstacle]);
 assert.equal(label.anchorIndex,0);assert.equal(label.x,250);assert.equal(label.y,162);
 assert.equal(intersects(label,obstacle),false);
 assert.ok(label.left>=6&&label.top>=6&&label.right<=594&&label.bottom<=394);
});

test('A pan never pins an offscreen source point to the map edge',()=>{
 const items=[crop('wheat',[{x:-20,y:180},{x:630,y:180}])];
 assert.deepEqual(place(items,600,400),[]);
});

test('A selected name blocked at every source anchor remains readable with an explicit source leader',()=>{
 const badges=[{left:130,top:60,right:270,bottom:140},{left:280,top:180,right:420,bottom:260}];
 const [label]=place([crop('corn',[{x:200,y:100},{x:350,y:220}],true)],600,400,badges);
 assert.ok(label);assert.equal(label.leader,true);
 assert.deepEqual([label.sourceX,label.sourceY],[200,100]);
 assert.equal(label.anchorIndex,0);
 for(const badge of badges)assert.equal(intersects(label,badge),false);
});

test('Resize can omit an unplaceable label without changing any source data',()=>{
 const source=[crop('sugarcane',[{x:200,y:200}])];
 const before=structuredClone(source);
 assert.equal(place(source,600,400).length,1);
 assert.deepEqual(place(source,60,40),[]);
 assert.deepEqual(source,before);
 assert.deepEqual(place(source,600,400),place(source,600,400));
});
