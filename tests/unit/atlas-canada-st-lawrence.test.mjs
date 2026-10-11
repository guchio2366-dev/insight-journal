import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canadaMapPath,canadaSouthernFrame,projectCanadaMap} from '../../src/lib/atlas-canada-map-presentation.ts';
const sha=value=>createHash('sha256').update(value).digest('hex');
const featureBytes=await readFile('data-source/atlas/canada/st-lawrence/feature.json');
const expandedBytes=await readFile('data-source/atlas/canada/st-lawrence/expanded.geojson');
const source=JSON.parse(featureBytes),expanded=JSON.parse(expandedBytes);
const output=await readFile('src/data/atlas/canada/rivers.json'),rivers=JSON.parse(output),display=rivers.features.find(f=>f.properties.name==='St. Lawrence');
const manifest=JSON.parse(await readFile('public/assets/atlas/canada-nature-v1/st-lawrence-manifest.json'));

test('St. Lawrence uses both matching official responses with original byte hashes and complete closed geometry',()=>{
 assert.equal(sha(featureBytes),'ee7df12a7dee9d8e7d737aee4b929a065212677e78fc0c6f11153c6ead0dfd95');
 assert.equal(sha(expandedBytes),'be20c9ef313a4e521c62ad47f0c48ac67c633d60b669a9459ff2b2662626d643');
 assert.equal(source.id,'4d00fe4cba2011d892e2080020a0f4c9');assert.equal(expanded.properties.cgndbid,'EFGFK');assert.equal(expanded.properties.status,'official');
 assert.deepEqual(display.geometry,source.geometry);assert.deepEqual(display.geometry,expanded.geometry);
 assert.equal(display.geometry.type,'MultiPolygon');const points=display.geometry.coordinates.flat(2);assert.equal(points.length,3135);
 for(const polygon of display.geometry.coordinates)for(const ring of polygon){assert.deepEqual(ring[0],ring.at(-1));assert.ok(ring.every(p=>p.length===2&&p.every(Number.isFinite)));}
 const bounds=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
 assert.deepEqual(bounds,[-76.4696127,44.1300071,-64.3028586,50.3008614]);assert.deepEqual(manifest.bounds,bounds);assert.deepEqual(manifest.sourceMetadataBounds,source.bbox);
 assert.ok(bounds[0]>=source.bbox[0]&&bounds[1]>=source.bbox[1]&&bounds[2]<=source.bbox[2]&&bounds[3]<=source.bbox[3]);
 assert.equal(manifest.geometrySha256,sha(JSON.stringify(display.geometry)));assert.equal(manifest.displaySha256,sha(output));
});

test('Replacement preserves the other 83 rivers and archived seven-vertex original while fitting both southern map ratios',async()=>{
 const originals=JSON.parse(await readFile('data-source/atlas/canada/rivers.geojson')).features;
 const old=originals.find(f=>f.properties.name==='St. Lawrence');assert.equal(old.geometry.coordinates.flat().length,7);assert.equal(manifest.originalNaturalEarth.geometrySha256,sha(JSON.stringify(old.geometry)));
 const others=rivers.features.filter(f=>f.properties.name!=='St. Lawrence');assert.equal(others.length,83);assert.equal(manifest.otherRiverFeaturesSha256,sha(JSON.stringify(others)));
 for(const item of others)assert.ok(originals.some(f=>f.properties.name===item.properties.name&&JSON.stringify(f.geometry)===JSON.stringify(item.geometry)));
 for(const ratio of [1.85,1.55]){
  const [x,y,width,height]=canadaSouthernFrame(ratio);
  for(const point of display.geometry.coordinates.flat(2)){const [px,py]=projectCanadaMap(point);assert.ok(px>x&&px<x+width&&py>y&&py<y+height,`Unclipped official vertex at map ratio ${ratio}`);}
 }
 const path=canadaMapPath(display.geometry);assert.doesNotMatch(path,/NaN|Infinity/);assert.equal((path.match(/[ML]/g)??[]).length,3135);assert.equal((path.match(/Z/g)??[]).length,1);
});
