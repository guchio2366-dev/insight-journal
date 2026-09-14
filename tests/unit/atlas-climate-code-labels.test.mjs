import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {layoutClimateCodes} from '../../src/lib/atlas-climate-code-labels.ts';
import {boxesOverlap,projectNatureFallback} from '../../src/lib/atlas-nature-labels.ts';

test('コードは検証済みの代替位置だけを使い、都市・操作・他コードと重ならない',()=>{
 const bounds={left:0,top:0,right:300,bottom:200},obstacles=[{left:20,top:20,right:90,bottom:80}];
 const inputs=[{id:'a',code:'Csa',width:30,height:18,anchors:[{x:40,y:40},{x:130,y:90}]},{id:'b',code:'Cfa',width:30,height:18,anchors:[{x:130,y:90},{x:220,y:100}]},{id:'c',code:'Am',width:30,height:18,anchors:[{x:2,y:2}]}];
 const placed=layoutClimateCodes(inputs,bounds,obstacles);
 assert.deepEqual(placed.map(p=>p.id),['a','b']);assert.deepEqual(placed[0].anchor,{x:130,y:90});
 assert.ok(!boxesOverlap(placed[0],placed[1]));assert.ok(placed.every(p=>!obstacles.some(o=>boxesOverlap(p,o))));
});

test('全国用のコード候補を狭い地図でもはみ出さず配置し、全23分類を拡大用データに保持する',()=>{
 const bytes=readFileSync('src/data/atlas/climate-code-labels.json'),entries=JSON.parse(bytes);
 const legend=JSON.parse(readFileSync('public/assets/atlas/nature-v1/climate-legend.json'));
 assert.ok(entries.length<=120);assert.ok(gzipSync(bytes).length<30000);
 assert.deepEqual([...new Set(entries.map(e=>e.code))].sort(),legend.map(e=>e.code).sort());
 for(const width of [358,592,752]){
  const bounds={left:0,top:0,right:width,bottom:width*1091/1800};
  const inputs=entries.filter(e=>e.minZoom<=3).map(e=>({id:e.id,code:e.code,width:30,height:18,anchors:[e.coordinate,...e.alternatives].map(p=>projectNatureFallback(p,bounds))}));
  const placed=layoutClimateCodes(inputs,bounds,[]);assert.ok(placed.length>=8);
  for(const [i,p] of placed.entries()){assert.ok(p.left>=0&&p.top>=0&&p.right<=bounds.right&&p.bottom<=bounds.bottom);assert.ok(placed.slice(i+1).every(other=>!boxesOverlap(p,other)));}
 }
});
