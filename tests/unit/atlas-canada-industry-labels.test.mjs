import test from 'node:test';
import assert from 'node:assert/strict';
import {groupPilotLabelPoints,placePilotLabel} from '../../src/lib/atlas-canada-industry-labels.ts';
test('Labels combine nearby records within one industry without changing or dropping source positions',()=>{
 const points=[{c:{id:'one',industry:'metal'},point:[10,10]},{c:{id:'two',industry:'metal'},point:[80,10]},{c:{id:'three',industry:'metal'},point:[150,10]},{c:{id:'four',industry:'fuel'},point:[10,10]}];
 const groups=groupPilotLabelPoints(points,100);assert.deepEqual(groups.map(g=>g.map(p=>p.c.id)),[['one','two'],['three'],['four']]);assert.deepEqual(groups.flat().map(p=>p.c.id).sort(),points.map(p=>p.c.id).sort());assert.strictEqual(groups[0][0],points[0]);
});
test('Crowded correspondence labels are omitted instead of relocated across the map',()=>{
 assert.equal(placePilotLabel([[50,50]],[90,35],[1000,500],[[0,0,300,300]],95),null);
 const box=placePilotLabel([[50,50],[120,50]],[100,35],[1000,500],[[40,40,60,60]],95);assert.ok(box);for(const [x,y]of [[50,50],[120,50]])assert.ok(Math.hypot(x-Math.max(box[0],Math.min(box[2],x)),y-Math.max(box[1],Math.min(box[3],y)))<=95);
});
