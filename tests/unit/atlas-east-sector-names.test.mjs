import test from 'node:test';
import assert from 'node:assert/strict';
import {placeEastSectorNames} from '../../src/lib/atlas-east-sector-names.ts';
import {boxesOverlap,leaderEnd} from '../../src/lib/atlas-nature-labels.ts';
test('nearby names use actual alternative sites, avoid points and keep local leaders',()=>{
 const point=(id,x,y)=>({id,point:{x,y}}),a=point('site-a',220,140),b=point('site-b',224,142),c=point('site-c',540,320);
 const items=[{id:'a-0',industry:'a',width:100,height:24,anchors:[a,c]},{id:'b-0',industry:'b',width:88,height:24,anchors:[b]},{id:'a-1',industry:'a',width:100,height:24,anchors:[c]}],obstacles=[a,b,c].map(({point:p})=>({left:p.x-6,right:p.x+6,top:p.y-6,bottom:p.y+6}));
 const placed=placeEastSectorNames(items,{left:0,top:0,right:700,bottom:450},obstacles);assert.equal(new Set(placed.map(p=>p.industry)).size,2);
 for(const p of placed){assert(items.find(i=>i.id===p.id).anchors.some(a=>a.id===p.site&&a.point.x===p.anchor.x&&a.point.y===p.anchor.y));const end=leaderEnd(p.anchor,p);assert(Math.hypot(end.x-p.anchor.x,end.y-p.anchor.y)<=72);assert(obstacles.every(b=>!boxesOverlap(p,b,3)));for(const other of placed.filter(o=>o!==p))assert(!boxesOverlap(p,other,3));}
 assert.deepEqual(placeEastSectorNames(items,{left:0,top:0,right:700,bottom:450},obstacles),placed);
});
