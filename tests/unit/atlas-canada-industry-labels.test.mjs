import test from 'node:test';
import assert from 'node:assert/strict';
import {groupPilotLabelPoints,placePilotLabel,placePilotLabelGroups,pilotLabelAnchor,compactPilotIndustryLabel} from '../../src/lib/atlas-canada-industry-labels.ts';
test('Labels combine nearby records within one industry without changing or dropping source positions',()=>{
 const points=[{c:{id:'one',industry:'metal'},point:[10,10]},{c:{id:'two',industry:'metal'},point:[80,10]},{c:{id:'three',industry:'metal'},point:[150,10]},{c:{id:'four',industry:'fuel'},point:[10,10]}];
 const groups=groupPilotLabelPoints(points,100);assert.deepEqual(groups.map(g=>g.map(p=>p.c.id)),[['one','two'],['three'],['four']]);assert.deepEqual(groups.flat().map(p=>p.c.id).sort(),points.map(p=>p.c.id).sort());assert.strictEqual(groups[0][0],points[0]);
});
test('A compact group anchors to an existing source point, independently of selection or input ordering',()=>{
 const group=[{c:{id:'a',industry:'metal'},point:[100,120]},{c:{id:'b',industry:'metal'},point:[130,120]},{c:{id:'c',industry:'metal'},point:[175,120]}];
 assert.strictEqual(pilotLabelAnchor(group),group[1].point);assert.deepEqual(pilotLabelAnchor([...group].reverse()),group[1].point);
 assert.equal(compactPilotIndustryLabel('uranium','resources'),'ウラン');assert.equal(compactPilotIndustryLabel('nickel','manufacturing'),'ニッケル精錬');
});
test('Compact labels keep their boxes within 40px of their source anchor without overlaps or selection-dependent movement',()=>{
 const items=[{id:'a',points:[[180,180]],size:[60,20]},{id:'b',points:[[205,200]],size:[85,20]},{id:'c',points:[[250,210]],size:[70,20]}],reserved=items.map(i=>{const [x,y]=i.points[0];return [x-8,y-8,x+8,y+8];});
 const boxes=placePilotLabelGroups(items,[500,350],reserved,40);assert(boxes.every(Boolean));assert.deepEqual(placePilotLabelGroups(items,[500,350],reserved,40),boxes);
 for(const [index,box]of boxes.entries()){const [x,y]=items[index].points[0];assert(Math.hypot(x-Math.max(box[0],Math.min(box[2],x)),y-Math.max(box[1],Math.min(box[3],y)))<=40);for(const other of boxes.slice(index+1))assert(!(box[0]<other[2]&&box[2]>other[0]&&box[1]<other[3]&&box[3]>other[1]));}
});
test('Crowded correspondence labels are omitted instead of relocated across the map',()=>{
 assert.equal(placePilotLabel([[50,50]],[90,35],[1000,500],[[0,0,300,300]],95),null);
 const box=placePilotLabel([[50,50],[120,50]],[100,35],[1000,500],[[40,40,60,60]],95);assert.ok(box);for(const [x,y]of [[50,50],[120,50]])assert.ok(Math.hypot(x-Math.max(box[0],Math.min(box[2],x)),y-Math.max(box[1],Math.min(box[3],y)))<=95);
});
