import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readZipEntries,parseDbf,readShapeRecords,shapefilePolygonGroups,inverseCanadaLambert,forwardCanadaLambert,simplifyRing,simplifyPolygonTopology,validatePolygonTopology,validateMultiPolygonTopology,segmentRelation,pointInRings} from '../../scripts/lib/canada-geography.mjs';

const entries=readZipEntries(await readFile('data-source/atlas/canada/population/lcma000b21a_e.zip'));
const get=extension=>[...entries].find(([name])=>name.endsWith(extension))[1];
const dbf=parseDbf(get('.dbf')),shapes=readShapeRecords(get('.shp')),native=new Map();
for(let i=0;i<dbf.length;i++)if(dbf[i].CMATYPE==='B')native.set(dbf[i].CMAUID,[...(native.get(dbf[i].CMAUID)??[]),...shapes[i].rings]);
const manifest=JSON.parse(await readFile('public/assets/atlas/canada-population-v1/manifest.json','utf8'));
const geometry=JSON.parse(await readFile('src/data/atlas/canada/population-geometry.json','utf8'));
const geojson=JSON.parse(await readFile('public/assets/atlas/canada-population-v1/population-boundaries.geojson','utf8'));
const rectangle=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]];
const rounded=p=>inverseCanadaLambert(p).map(v=>Number(v.toFixed(7)));

test('Topology rejects crossing, overlap, nonadjacent self-touch, open rings and escaping/nested holes',()=>{
 const outer=rectangle(0,0,10,10),hole=rectangle(2,2,4,4).reverse();
 assert.equal(validatePolygonTopology([outer,hole]).valid,true);
 assert.equal(segmentRelation([0,0],[4,4],[0,4],[4,0]),'cross');
 assert.equal(segmentRelation([0,0],[4,0],[2,0],[6,0]),'overlap');
 assert.equal(segmentRelation([0,0],[4,0],[4,0],[6,0]),'touch');
 assert.equal(segmentRelation([1e6,1e6],[1e6+1,1e6+1],[1e6,1e6+2**-30],[1e6+1,1e6+1+2**-30]),null);
 assert.ok(validatePolygonTopology([[[0,0],[4,4],[0,4],[4,0],[0,0]]]).counts['self-cross']);
 assert.ok(validatePolygonTopology([[[0,0],[2,0],[1,0],[1,2],[0,0]]]).counts['self-overlap']);
 assert.ok(validatePolygonTopology([[[0,0],[2,0],[2,2],[1,1],[0,2],[1,1],[0,0]]]).counts['self-touch']);
 assert.ok(validatePolygonTopology([outer.slice(0,-1)]).counts['open-ring']);
 assert.ok(validatePolygonTopology([outer,rectangle(8,2,12,4).reverse()]).counts['outer-hole-cross']);
 assert.ok(validatePolygonTopology([outer,rectangle(12,2,14,4).reverse()]).counts['hole-outside']);
 assert.ok(validatePolygonTopology([outer,rectangle(2,2,8,8).reverse(),rectangle(3,3,4,4).reverse()]).counts['nested-holes']);
});

test('MultiPolygon checks separate outer boundaries and filled-region containment while allowing an island inside a hole',()=>{
 const a=[rectangle(0,0,10,10)],b=[rectangle(8,-2,12,2)];
 assert.ok(validateMultiPolygonTopology([a,b]).counts['polygon-cross']);
 assert.ok(validateMultiPolygonTopology([a,[rectangle(2,2,4,4)]]).counts['polygon-containment']);
 assert.ok(validateMultiPolygonTopology([a,[rectangle(10,0,12,10)]]).counts['polygon-overlap']);
 assert.equal(validateMultiPolygonTopology([a,[rectangle(10,10,12,12)]]).valid,true);
 const lake=[rectangle(0,0,10,10),rectangle(2,2,8,8).reverse()],island=[rectangle(3,3,4,4)];
 assert.equal(validateMultiPolygonTopology([lake,island]).valid,true);
});

test('Montréal polygon 488 reproduces the independent-ring defect and whole-polygon retry/fallback restores every hole',()=>{
 const rings=[488,489,490,491].map(i=>native.get('462')[i]);
 assert.deepEqual(rings.map(r=>r.length),[5070,62,28,191]);
 assert.equal(validatePolygonTopology(rings).valid,true);
 const independent=rings.map(r=>simplifyRing(r,250));
 assert.deepEqual(independent.map(r=>r.length),[23,62,4,6]);
 assert.equal(independent[1].slice(0,-1).filter(p=>!pointInRings(p,[independent[0]])).length,44);
 assert.equal(validatePolygonTopology(independent).counts['outer-hole-cross'],2);
 const selected=simplifyPolygonTopology(rings,250,{retryTolerances:[125,62.5,31.25,15.625],transform:rounded,transformOriginal:inverseCanadaLambert});
 assert.equal(selected.output.valid,true);assert.ok(selected.fallback||selected.toleranceMetres<250);
 assert.equal(selected.rings.length,4);
 for(const hole of selected.outputRings.slice(1))assert.ok(hole.slice(0,-1).every(p=>pointInRings(p,[selected.outputRings[0]])));
 if(selected.fallback)assert.deepEqual(selected.rings,rings);
});

test('Original Regina endpoint contacts are reported and preserved without inventing a repair',()=>{
 const rings=native.get('705'),source=validatePolygonTopology(rings);
 assert.deepEqual(source.counts,{'self-touch':8});
 assert.deepEqual(rings[0][0],rings[0][14]);assert.deepEqual(rings[0][37],rings[0][42]);
 const selected=simplifyPolygonTopology(rings,250,{retryTolerances:[125,62.5],transform:rounded,transformOriginal:inverseCanadaLambert});
 assert.equal(selected.fallback,true);assert.equal(selected.toleranceMetres,0);assert.equal(selected.sourceContactsPreserved,true);
 assert.deepEqual(selected.rings,rings);assert.deepEqual(selected.output.counts,source.counts);
 assert.deepEqual(manifest.geometry.topology.sourceIssueCounts,source.counts);
 assert.deepEqual(manifest.geometry.topology.deliveryIssueCounts,source.counts);
});

test('All delivered polygons and all 41 CMA boundaries have no new crossing, overlap, hole or containment defect',()=>{
 assert.equal(geojson.features.length,41);let rings=0,polygons=0,contacts=0;
 const all=[];
 for(const feature of geojson.features)for(const polygon of feature.geometry.coordinates){
  polygons++;rings+=polygon.length;all.push(polygon);
  const report=validatePolygonTopology(polygon);
  if(!report.valid){assert.equal(feature.properties.CMAUID,'705');assert.deepEqual(report.counts,{'self-touch':8});contacts+=report.counts['self-touch'];}
 }
 assert.equal(polygons,2511);assert.equal(rings,2519);assert.equal(contacts,8);
 const multi=validateMultiPolygonTopology(all,{maxIssues:Infinity}),topology=manifest.geometry.topology;
 assert.equal(multi.counts['polygon-cross']??0,0);assert.equal(multi.counts['polygon-containment']??0,0);
 assert.equal(multi.counts['polygon-overlap'],2004);assert.equal(topology.sourceMultiPolygonIssueCounts['polygon-overlap'],2004);
 assert.deepEqual(multi.counts,topology.deliveryMultiPolygonIssueCounts);
 assert.equal(topology.newProperCrossings,0);assert.equal(topology.newOverlaps,0);assert.equal(topology.holeErrors,0);
 assert.match(topology.acceptance,/Strict OGC validity is not claimed/);
 assert.equal(topology.polygonSelections.length,2511);
});

test('Both sides of every shared boundary retain all original polygon vertices at verified submillimetre precision and GeoJSON winding',async()=>{
 const shared=manifest.geometry.topology.sourceSharedBoundaries;
 assert.equal(shared.length,14);
 for(const pair of shared){assert.equal(pair.preservedEntireNativePolygons,true);for(const owner of pair.polygons){
  const source=native.get(owner.cmaId),indexes=shapefilePolygonGroups(source)[owner.polygonIndex];
  const selection=manifest.geometry.topology.polygonSelections.find(p=>p.cmaId===owner.cmaId&&p.polygonIndex===owner.polygonIndex);
  assert.equal(selection.toleranceMetres,0);assert.equal(selection.coordinateDecimals,9);
  const display=geometry.features.find(g=>g.id===owner.cmaId),publicPolygon=geojson.features.find(f=>f.properties.CMAUID===owner.cmaId).geometry.coordinates[owner.polygonIndex];
  for(let r=0;r<indexes.length;r++){
   const projected=source[indexes[r]].map(p=>inverseCanadaLambert(p).map(v=>Number(v.toFixed(9))));
   assert.deepEqual(display.rings[indexes[r]],projected);assert.deepEqual(publicPolygon[r],[...projected].reverse());
   for(let i=0;i<projected.length;i++){const back=forwardCanadaLambert(projected[i]),before=source[indexes[r]][i];assert.ok(Math.hypot(before[0]-back[0],before[1]-back[1])<=0.00008);}
  }
 }}
 const hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(await readFile('src/data/atlas/canada/population-geometry.json')),manifest.geometry.displayGeometrySha256);
 assert.equal(manifest.geometry.topology.deliveryCoordinatePrecision.originalFallbackDecimals,9);
 assert.ok(manifest.geometry.topology.deliveryCoordinatePrecision.maxFallbackRoundingMetres<=0.00008);
 assert.equal(manifest.geometry.topology.deliveryCoordinatePrecision.newAdjacentDuplicateVertices,0);
 assert.equal(hash(await readFile('public/assets/atlas/canada-population-v1/population-selected.csv')),'32dac113417ca604e446cbe017aecf596724bea2a327a9594129c4ea224fc811');
 assert.equal(hash(await readFile('src/data/atlas/canada/population.json')),'fc99fb1d92c3bc8943e090f7be93ec2d2061b65a165dbdca445d3f3eff338b2b');
});
