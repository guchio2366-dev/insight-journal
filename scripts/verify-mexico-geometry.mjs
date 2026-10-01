import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lambertForward,lambertInverse} from '../src/lib/atlas-mexico-projection.mjs';
import {geometryIntersections} from './lib/mexico-geometry-validation.mjs';
const data=JSON.parse(await readFile('src/data/atlas/mexico/geometry.json','utf8'));
let rings=0,segments=0;
for(const feature of data.features){
 const polygons=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];
 for(let polygonIndex=0;polygonIndex<polygons.length;polygonIndex++)for(let ringIndex=0;ringIndex<polygons[polygonIndex].length;ringIndex++){
  const ring=polygons[polygonIndex][ringIndex];assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));rings++;segments+=ring.length-1;
  for(const point of ring)assert.ok(point.every(Number.isFinite));
 }
}
for(const point of [[-99.19611111,19.40361111],[-107.407188,24.806146],[-102,12],[-110.3,24.1],[-86.75,21.16]]){
 const reversed=lambertInverse(lambertForward(point));assert.ok(Math.max(...point.map((p,i)=>Math.abs(p-reversed[i])))<1e-9);
}
assert.equal(new Set(data.features.map(f=>f.properties.code)).size,32);
const intersections=geometryIntersections(data.features);
console.log(JSON.stringify({states:32,rings,segments,properSelfIntersections:intersections.length,examples:intersections.slice(0,12)}));
if(intersections.length)process.exitCode=1;
